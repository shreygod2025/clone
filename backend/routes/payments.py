"""
Payment routes: student payments, school payments, Cashfree integration.
Endpoints: /payments/*, /school-payment/*
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import asyncio
import os
import logging

try:
    from cashfree_pg.models.create_order_request import CreateOrderRequest
    from cashfree_pg.api_client import Cashfree
    from cashfree_pg.models.customer_details import CustomerDetails as CashfreeCustomerDetails
    from cashfree_pg.models.order_meta import OrderMeta
    CASHFREE_AVAILABLE = True
except ImportError:
    CASHFREE_AVAILABLE = False
    Cashfree = None
    CashfreeCustomerDetails = None
    OrderMeta = None

from .shared import db, get_current_user

# Scheduler + Cashfree payment sync config
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

PAYMENT_SYNC_ENABLED = os.getenv("PAYMENT_SYNC_ENABLED", "true").lower() == "true"
PAYMENT_SYNC_INTERVAL_MINUTES = int(os.getenv("PAYMENT_SYNC_INTERVAL_MINUTES", "60"))

# Module-level scheduler (imported by server.py startup handler)
scheduler = AsyncIOScheduler()

# Cashfree Configuration
CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENVIRONMENT = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX")
CASHFREE_API_VERSION = "2023-08-01"

if CASHFREE_AVAILABLE and CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
    Cashfree.XClientId = CASHFREE_APP_ID
    Cashfree.XClientSecret = CASHFREE_SECRET_KEY
    if CASHFREE_ENVIRONMENT == "PRODUCTION":
        Cashfree.XEnvironment = Cashfree.PRODUCTION
    else:
        Cashfree.XEnvironment = Cashfree.SANDBOX

def get_cashfree_client():
    """Get Cashfree client with correct environment"""
    if not CASHFREE_AVAILABLE:
        raise HTTPException(status_code=500, detail="Cashfree SDK not available")
    cf_env = Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    return Cashfree(cf_env)

# Simple in-memory cache for payment endpoints
_payment_cache: dict = {}

def get_cached(key: str):
    return _payment_cache.get(key)

def set_cached(key: str, value, ttl: int = 300):
    _payment_cache[key] = value
    return value

router = APIRouter()

# ── Scheduled Payment Sync (background task) ─────────────────────────────
async def scheduled_payment_sync():
    """Background task to sync all pending payments with Cashfree"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        logging.warning("[SCHEDULER] Payment sync skipped - Cashfree credentials not configured")
        return
    
    logging.info("[SCHEDULER] Starting automated payment sync...")
    
    results = {
        "student_payments": {"checked": 0, "updated": 0, "errors": 0},
        "school_payments": {"checked": 0, "updated": 0, "errors": 0}
    }
    
    try:
        # Sync student payments
        pending_student_payments = await db.student_payments.find(
            {"status": {"$nin": ["PAID", "CANCELLED", "EXPIRED"]}},
            {"_id": 0}
        ).to_list(500)
        
        for payment in pending_student_payments:
            order_id = payment.get("id")
            old_status = payment.get("status")
            results["student_payments"]["checked"] += 1
            
            try:
                api_response = await asyncio.to_thread(get_cashfree_client().PGFetchOrder,
                    CASHFREE_API_VERSION,
                    order_id,
                    None
                )
                
                if api_response.data:
                    new_status = api_response.data.order_status
                    
                    if new_status != old_status:
                        cf_payment_id = None
                        payment_method = "Cashfree"
                        try:
                            payments_response = await asyncio.to_thread(get_cashfree_client().PGOrderFetchPayments,
                                CASHFREE_API_VERSION, order_id, None
                            )
                            if payments_response.data and len(payments_response.data) > 0:
                                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                        except Exception:
                            pass
                        
                        update_data = {
                            "status": new_status,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                            "sync_source": "scheduler"
                        }
                        if cf_payment_id:
                            update_data["transaction_id"] = cf_payment_id
                            update_data["cf_payment_id"] = cf_payment_id
                            update_data["payment_method"] = payment_method
                        if new_status == "PAID":
                            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                        
                        await db.student_payments.update_one({"id": order_id}, {"$set": update_data})
                        
                        # Update student if PAID
                        if new_status == "PAID":
                            student_id = payment.get("student_id")
                            if student_id:
                                student_update = {
                                    "status": "converted",
                                    "payment_status": "paid",
                                    "payment_amount": payment.get("amount"),
                                    "payment_date": datetime.now(timezone.utc).isoformat(),
                                    "pending_payment": None,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }
                                if cf_payment_id:
                                    student_update["payment_transaction_id"] = cf_payment_id
                                    student_update["payment_method"] = payment_method
                                await db.student_inquiries.update_one({"id": student_id}, {"$set": student_update})
                        
                        results["student_payments"]["updated"] += 1
                        logging.info(f"[SCHEDULER] Student payment {order_id}: {old_status} -> {new_status}")
                        
            except Exception as e:
                results["student_payments"]["errors"] += 1
                logging.error(f"[SCHEDULER] Error syncing student payment {order_id}: {e}")
        
        # Sync school student payments (batch of 100 at a time)
        pending_school_payments = await db.school_student_payments.find(
            {"status": {"$nin": ["PAID", "CANCELLED", "EXPIRED"]}},
            {"_id": 0}
        ).to_list(100)
        
        for payment in pending_school_payments:
            order_id = payment.get("id")
            old_status = payment.get("status")
            results["school_payments"]["checked"] += 1
            
            try:
                api_response = await asyncio.to_thread(get_cashfree_client().PGFetchOrder,
                    CASHFREE_API_VERSION,
                    order_id,
                    None
                )
                
                if api_response.data:
                    new_status = api_response.data.order_status
                    
                    if new_status != old_status:
                        cf_payment_id = None
                        payment_method = "Cashfree"
                        try:
                            payments_response = await asyncio.to_thread(get_cashfree_client().PGOrderFetchPayments,
                                CASHFREE_API_VERSION, order_id, None
                            )
                            if payments_response.data and len(payments_response.data) > 0:
                                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                        except Exception:
                            pass
                        
                        update_data = {
                            "status": new_status,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                            "sync_source": "scheduler"
                        }
                        if cf_payment_id:
                            update_data["transaction_id"] = cf_payment_id
                            update_data["cf_payment_id"] = cf_payment_id
                            update_data["payment_method"] = payment_method
                        if new_status == "PAID":
                            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                        
                        await db.school_student_payments.update_one({"id": order_id}, {"$set": update_data})
                        
                        results["school_payments"]["updated"] += 1
                        logging.info(f"[SCHEDULER] School payment {order_id}: {old_status} -> {new_status}")
                        
            except Exception as e:
                results["school_payments"]["errors"] += 1
                logging.error(f"[SCHEDULER] Error syncing school payment {order_id}: {e}")
        
        # Log summary
        total_checked = results["student_payments"]["checked"] + results["school_payments"]["checked"]
        total_updated = results["student_payments"]["updated"] + results["school_payments"]["updated"]
        total_errors = results["student_payments"]["errors"] + results["school_payments"]["errors"]
        
        logging.info(f"[SCHEDULER] Payment sync complete - Checked: {total_checked}, Updated: {total_updated}, Errors: {total_errors}")
        
    except Exception as e:
        logging.error(f"[SCHEDULER] Payment sync failed: {e}")


# ── Payment Routes ──────────────────────────────────────────────────────────
# CASHFREE PAYMENT ENDPOINTS (Student Payments)
# ========================

class StudentPaymentRequest(BaseModel):
    """Request to create a student payment order"""
    student_id: str
    amount: float
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
    description: Optional[str] = None

class PaymentOrderResponse(BaseModel):
    """Response after creating a payment order"""
    order_id: str
    payment_session_id: str
    payment_link: str
    order_status: str
    amount: float

@router.post("/payments/create-order")
async def create_payment_order(data: StudentPaymentRequest, user: dict = Depends(get_current_user)):
    """Create a Cashfree payment order for student batch payment"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Get student details
    student = await db.student_inquiries.find_one({"id": data.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Generate unique order ID
    order_id = f"OLL-STU-{data.student_id[:8]}-{int(time.time())}"
    
    # Ensure customer_name meets Cashfree minimum (3 chars)
    # Use "Student" if name is empty/None
    student_name = student.get("name") or "Student"
    student_name = student_name.strip() if student_name else "Student"
    if not student_name or len(student_name) < 1:
        student_name = "Student"
    cf_customer_name = student_name if len(student_name) >= 3 else student_name.ljust(3, ' ')
    
    try:
        # Create customer details
        customer_details = CashfreeCustomerDetails(
            customer_id=data.student_id,
            customer_name=cf_customer_name,
            customer_email=student.get("email") or f"{data.student_id}@oll.co",
            customer_phone=student.get("phone") or "9999999999"
        )
        
        # Get frontend URL for return
        frontend_url = os.getenv("FRONTEND_URL", "https://crm-enhancement-10.preview.emergentagent.com")
        
        # Create order meta
        order_meta = OrderMeta(
            return_url=f"{frontend_url}/student/payment/success?order_id={order_id}",
            notify_url=f"{frontend_url}/api/payments/webhook"
        )
        
        # Build order request
        create_order_request = CreateOrderRequest(
            order_amount=data.amount,
            order_currency="INR",
            customer_details=customer_details,
            order_meta=order_meta,
            order_note=data.description or f"Batch payment for {student.get('name', 'Student')}"
        )
        
        # Create order via Cashfree using globally initialized credentials
        logging.info(f"Creating student payment - Order: {order_id}, Amount: {data.amount}")
        api_response = await asyncio.to_thread(get_cashfree_client().PGCreateOrder,
            CASHFREE_API_VERSION,
            create_order_request,
            None,
            None
        )
        
        if api_response.data:
            # Store payment order in database
            payment_order = {
                "id": order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "student_id": data.student_id,
                "student_name": student.get("name"),
                "student_phone": student.get("phone"),
                "amount": data.amount,
                "batch_id": data.batch_id,
                "batch_name": data.batch_name,
                "description": data.description,
                "payment_session_id": api_response.data.payment_session_id,
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": user.get("id"),
                "created_by_name": user.get("name")
            }
            await db.student_payments.insert_one(payment_order)
            
            # Update student inquiry with pending payment
            await db.student_inquiries.update_one(
                {"id": data.student_id},
                {"$set": {
                    "pending_payment": {
                        "order_id": order_id,
                        "amount": data.amount,
                        "batch_id": data.batch_id,
                        "batch_name": data.batch_name,
                        "status": "PENDING",
                        "payment_link": f"https://payments.cashfree.com/forms/{api_response.data.payment_session_id}",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logging.info(f"Payment order created: {order_id}")
            return {
                "order_id": order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "payment_session_id": api_response.data.payment_session_id,
                "payment_link": f"https://payments.cashfree.com/forms/{api_response.data.payment_session_id}",
                "order_status": api_response.data.order_status,
                "amount": data.amount
            }
        else:
            logging.error(f"Failed to create payment order: {order_id}")
            raise HTTPException(status_code=500, detail="Failed to create payment order")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Payment order creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@router.get("/payments/order/{order_id}")
async def get_payment_order(order_id: str):
    """Get payment order status"""
    payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found")
    return payment

@router.get("/payments/student/{student_id}")
async def get_student_payment_info(student_id: str):
    """Get payment info for a student (public endpoint for student payment page)"""
    student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    pending_payment = student.get("pending_payment")
    if not pending_payment:
        return {"has_pending_payment": False, "student_name": student.get("name")}
    
    return {
        "has_pending_payment": True,
        "student_id": student_id,
        "student_name": student.get("name"),
        "student_phone": student.get("phone"),
        "student_email": student.get("email"),
        "skill": student.get("skill"),
        "amount": pending_payment.get("amount"),
        "batch_name": pending_payment.get("batch_name"),
        "batch_id": pending_payment.get("batch_id"),
        "order_id": pending_payment.get("order_id"),
        "status": pending_payment.get("status")
    }

@router.get("/payments/by-phone/{phone}")
async def get_payment_info_by_phone(phone: str):
    """Get payment info for a student by phone (for logged-in student dashboard)"""
    # Find student by phone - prioritize students with pending payments
    student = await db.student_inquiries.find_one(
        {"phone": phone, "pending_payment": {"$ne": None}}, 
        {"_id": 0}
    )
    
    if not student:
        # No pending payment found for this phone
        return {"has_pending_payment": False}
    
    pending_payment = student.get("pending_payment")
    if not pending_payment or pending_payment.get("status") == "PAID":
        return {"has_pending_payment": False, "student_name": student.get("name")}
    
    return {
        "has_pending_payment": True,
        "student_id": student.get("id"),
        "student_name": student.get("name"),
        "student_phone": student.get("phone"),
        "student_email": student.get("email"),
        "skill": student.get("skill"),
        "amount": pending_payment.get("amount"),
        "batch_name": pending_payment.get("batch_name"),
        "batch_id": pending_payment.get("batch_id"),
        "order_id": pending_payment.get("order_id"),
        "status": pending_payment.get("status")
    }

@router.post("/payments/create-session/{student_id}")
async def create_payment_session(student_id: str):
    """
    Create a Cashfree payment session on-demand when student clicks Pay Fees.
    This is a PUBLIC endpoint - no auth required.
    Returns payment_session_id for Drop-in checkout.
    """
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Get student details
    student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    pending_payment = student.get("pending_payment")
    if not pending_payment:
        raise HTTPException(status_code=400, detail="No pending payment for this student")
    
    amount = pending_payment.get("amount")
    if not amount or float(amount) <= 0:
        raise HTTPException(status_code=400, detail="Invalid payment amount")
    
    # Generate unique order ID
    order_id = f"OLL-STU-{student_id[:8]}-{int(time.time())}"
    
    # Ensure customer_name meets Cashfree minimum (3 chars)
    # Use "Student" if name is empty/None
    student_name = student.get("name") or "Student"
    student_name = student_name.strip() if student_name else "Student"
    if not student_name or len(student_name) < 1:
        student_name = "Student"
    cf_customer_name = student_name if len(student_name) >= 3 else student_name.ljust(3, ' ')
    
    logging.info(f"Creating payment for student: {student_id}, name: '{student_name}', cf_name: '{cf_customer_name}'")
    
    try:
        # Create customer details
        customer_details = CashfreeCustomerDetails(
            customer_id=student_id,
            customer_name=cf_customer_name,
            customer_email=student.get("email") or f"{student_id}@oll.co",
            customer_phone=student.get("phone") or "9999999999"
        )
        
        # Get frontend URL for return
        frontend_url = os.getenv("FRONTEND_URL", "https://crm-enhancement-10.preview.emergentagent.com")
        backend_url = os.getenv("REACT_APP_BACKEND_URL", frontend_url)
        
        # Create order meta
        order_meta = OrderMeta(
            return_url=f"{frontend_url}/student/payment/success?order_id={order_id}",
            notify_url=f"{backend_url}/api/payments/webhook"
        )
        
        # Build order request with our order_id for reference
        create_order_request = CreateOrderRequest(
            order_id=order_id,  # Set our order ID so we can reference it later
            order_amount=float(amount),
            order_currency="INR",
            customer_details=customer_details,
            order_meta=order_meta,
            order_note=f"Batch payment for {student.get('name', 'Student')} - {pending_payment.get('batch_name', 'Batch')}"
        )
        
        # Create order via Cashfree using globally initialized credentials
        logging.info(f"Creating public student payment - Order: {order_id}, Amount: {amount}")
        api_response = await asyncio.to_thread(get_cashfree_client().PGCreateOrder,
            CASHFREE_API_VERSION,
            create_order_request,
            None,
            None
        )
        
        if api_response.data:
            # Store payment order in database
            payment_order = {
                "id": order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "student_id": student_id,
                "student_name": student.get("name"),
                "student_phone": student.get("phone"),
                "student_email": student.get("email"),
                "amount": float(amount),
                "batch_id": pending_payment.get("batch_id"),
                "batch_name": pending_payment.get("batch_name"),
                "payment_session_id": api_response.data.payment_session_id,
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "student_self_checkout"
            }
            await db.student_payments.insert_one(payment_order)
            
            # Update student's pending_payment with order_id
            await db.student_inquiries.update_one(
                {"id": student_id},
                {"$set": {
                    "pending_payment.order_id": order_id,
                    "pending_payment.status": "PENDING",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logging.info(f"Payment session created for student {student_id}: {order_id}")
            return {
                "success": True,
                "order_id": order_id,
                "payment_session_id": api_response.data.payment_session_id,
                "amount": float(amount),
                "environment": CASHFREE_ENVIRONMENT.lower()
            }
        else:
            logging.error(f"Failed to create payment session for student {student_id}")
            raise HTTPException(status_code=500, detail="Failed to create payment session")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Payment session creation error for {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@router.post("/payments/webhook")
async def cashfree_webhook(request: Request):
    """Handle Cashfree payment webhooks"""
    try:
        # Get raw body
        body = await request.body()
        body_str = body.decode('utf-8')
        
        # Get signature headers
        timestamp = request.headers.get('x-webhook-timestamp', '')
        received_signature = request.headers.get('x-webhook-signature', '')
        
        # Verify signature if present
        if timestamp and received_signature and CASHFREE_SECRET_KEY:
            signed_payload = f"{timestamp}.{body_str}"
            computed_hash = hmac.new(
                CASHFREE_SECRET_KEY.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).digest()
            computed_signature = b64encode(computed_hash).decode('utf-8')
            
            if not hmac.compare_digest(computed_signature, received_signature):
                logging.warning("Invalid webhook signature")
                # Don't raise error, just log - some webhooks may come without signature during testing
        
        # Parse webhook data
        webhook_data = json.loads(body_str)
        event_type = webhook_data.get('type', '')
        order_data = webhook_data.get('data', {}).get('order', {})
        payment_data = webhook_data.get('data', {}).get('payment', {})
        
        order_id = order_data.get('order_id') or webhook_data.get('data', {}).get('order_id')
        payment_status = payment_data.get('payment_status') or order_data.get('order_status')
        cf_payment_id = payment_data.get('cf_payment_id') or payment_data.get('payment_id')
        payment_method_details = payment_data.get('payment_group', 'unknown')
        
        logging.info(f"Webhook received - Event: {event_type}, Order: {order_id}, Status: {payment_status}, CF Payment ID: {cf_payment_id}")
        
        if order_id:
            # Check if already processed to prevent duplicate processing
            existing_payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
            if existing_payment and existing_payment.get("status") == "PAID":
                logging.info(f"Payment {order_id} already processed, skipping")
                return {"status": "success", "message": "Already processed"}
            
            # Update payment record
            update_data = {
                "status": payment_status,
                "webhook_data": webhook_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if payment_status == "SUCCESS" or event_type == "PAYMENT_SUCCESS_WEBHOOK":
                update_data["status"] = "PAID"
                update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                update_data["payment_method"] = f"Cashfree - {payment_method_details}"
                update_data["transaction_id"] = cf_payment_id
                update_data["cf_payment_id"] = cf_payment_id
            
            await db.student_payments.update_one(
                {"id": order_id},
                {"$set": update_data}
            )
            
            # Get payment to update student
            payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
            if payment and (payment_status == "SUCCESS" or event_type == "PAYMENT_SUCCESS_WEBHOOK"):
                # Update student status to converted and add to batch
                student_id = payment.get("student_id")
                batch_id = payment.get("batch_id")
                
                # Check if student is already converted (prevent duplicate processing)
                student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0})
                if student and student.get("status") == "converted" and student.get("pending_payment") is None:
                    logging.info(f"Student {student_id} already converted, skipping update")
                    return {"status": "success", "message": "Already processed"}
                
                student_update = {
                    "status": "converted",
                    "payment_status": "paid",
                    "payment_amount": payment.get("amount"),
                    "payment_date": datetime.now(timezone.utc).isoformat(),
                    "payment_method": f"Cashfree - {payment_method_details}",
                    "payment_transaction_id": cf_payment_id,
                    "pending_payment": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if batch_id:
                    student_update["batch_id"] = batch_id
                    student_update["batch_name"] = payment.get("batch_name")
                    
                    # Add student to batch
                    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
                    if batch and student_id not in batch.get("students", []):
                        await db.batches.update_one(
                            {"id": batch_id},
                            {"$addToSet": {"students": student_id}}
                        )
                        
                        # Create sessions for the student from batch schedule
                        if batch.get("schedule"):
                            sessions_to_create = []
                            for i, session_info in enumerate(batch.get("schedule", [])[:12], 1):  # Max 12 sessions
                                session = {
                                    "id": str(uuid.uuid4()),
                                    "student_id": student_id,
                                    "batch_id": batch_id,
                                    "session_number": i,
                                    "date": session_info.get("date"),
                                    "time": session_info.get("time", batch.get("time")),
                                    "mode": batch.get("mode", "online"),
                                    "skill": batch.get("skill"),
                                    "status": "scheduled",
                                    "created_at": datetime.now(timezone.utc).isoformat()
                                }
                                sessions_to_create.append(session)
                            
                            if sessions_to_create:
                                await db.sessions.insert_many(sessions_to_create)
                                student_update["sessions_total"] = len(sessions_to_create)
                                student_update["sessions_completed"] = 0
                                logging.info(f"Created {len(sessions_to_create)} sessions for student {student_id}")
                
                await db.student_inquiries.update_one(
                    {"id": student_id},
                    {"$set": student_update}
                )
                
                logging.info(f"Student {student_id} payment successful, status updated to converted, transaction: {cf_payment_id}")
        
        return {"status": "success", "message": "Webhook processed"}
        
    except json.JSONDecodeError:
        logging.error("Invalid JSON in webhook payload")
        return {"status": "error", "message": "Invalid JSON"}
    except Exception as e:
        logging.error(f"Webhook processing error: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.get("/payments/verify/{order_id}")
async def verify_payment(order_id: str):
    """Verify payment status from Cashfree (can be called after return)"""
    logging.info(f"[PAYMENT_VERIFY] Starting verification for order: {order_id}")
    
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        logging.error("[PAYMENT_VERIFY] Cashfree credentials missing")
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
    if not payment:
        logging.error(f"[PAYMENT_VERIFY] Order not found in student_payments: {order_id}")
        raise HTTPException(status_code=404, detail="Payment order not found")
    
    logging.info(f"[PAYMENT_VERIFY] Found payment record: student_id={payment.get('student_id')}, batch_id={payment.get('batch_id')}, status={payment.get('status')}")
    
    # Check if already processed
    if payment.get("status") == "PAID":
        logging.info(f"[PAYMENT_VERIFY] Payment already marked as PAID, returning cached result")
        return {
            "order_id": order_id,
            "status": "PAID",
            "amount": payment.get("amount"),
            "student_name": payment.get("student_name"),
            "transaction_id": payment.get("transaction_id")
        }
    
    try:
        # Get the cf_order_id (Cashfree's internal order ID) - we also store our order_id which we set during creation
        cf_order_id = payment.get("cf_order_id")
        
        # Try fetching using our order_id first (which we now set during creation)
        # Fall back to cf_order_id if needed
        fetch_order_id = order_id  # Use our order_id since we now pass it to Cashfree
        
        # Fetch order status from Cashfree
        logging.info(f"[PAYMENT_VERIFY] Calling Cashfree PGFetchOrder for order_id: {fetch_order_id}")
        api_response = await asyncio.to_thread(get_cashfree_client().PGFetchOrder,
            CASHFREE_API_VERSION,
            fetch_order_id,
            None
        )
        
        if api_response.data:
            order_status = api_response.data.order_status
            logging.info(f"[PAYMENT_VERIFY] Cashfree returned status: {order_status}")
            
            # Try to get payment details for transaction ID
            cf_payment_id = None
            payment_method = "Cashfree"
            try:
                payments_response = await asyncio.to_thread(get_cashfree_client().PGOrderFetchPayments,
                    CASHFREE_API_VERSION,
                    fetch_order_id,  # Use the same order ID we used for fetch
                    None
                )
                if payments_response.data and len(payments_response.data) > 0:
                    cf_payment_id = str(payments_response.data[0].cf_payment_id)
                    payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                    logging.info(f"[PAYMENT_VERIFY] Got transaction ID: {cf_payment_id}")
            except Exception as e:
                logging.warning(f"[PAYMENT_VERIFY] Could not fetch payment details: {e}")
            
            # Update local payment record
            update_data = {
                "status": order_status,
                "verified_at": datetime.now(timezone.utc).isoformat()
            }
            if cf_payment_id:
                update_data["transaction_id"] = cf_payment_id
                update_data["cf_payment_id"] = cf_payment_id
                update_data["payment_method"] = payment_method
            
            logging.info(f"[PAYMENT_VERIFY] Updating student_payments collection with: {update_data}")
            await db.student_payments.update_one(
                {"id": order_id},
                {"$set": update_data}
            )
            
            # If payment is successful, update student
            if order_status == "PAID":
                student_id = payment.get("student_id")
                batch_id = payment.get("batch_id")
                logging.info(f"[PAYMENT_VERIFY] Payment PAID - Processing student update for student_id={student_id}, batch_id={batch_id}")
                
                # Check if already processed
                student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0})
                logging.info(f"[PAYMENT_VERIFY] Student lookup result: found={student is not None}, current_status={student.get('status') if student else 'N/A'}, pending_payment={student.get('pending_payment') if student else 'N/A'}")
                
                if student and student.get("status") == "converted" and student.get("pending_payment") is None:
                    logging.info(f"[PAYMENT_VERIFY] Student already converted with no pending payment - returning early")
                    return {
                        "order_id": order_id,
                        "status": order_status,
                        "amount": payment.get("amount"),
                        "student_name": payment.get("student_name"),
                        "transaction_id": cf_payment_id
                    }
                
                if not student:
                    logging.error(f"[PAYMENT_VERIFY] CRITICAL: Student not found in student_inquiries: {student_id}")
                    # Return success but note the issue
                    return {
                        "order_id": order_id,
                        "status": order_status,
                        "amount": payment.get("amount"),
                        "student_name": payment.get("student_name"),
                        "transaction_id": cf_payment_id,
                        "warning": "Student record not found for session creation"
                    }
                
                student_update = {
                    "status": "converted",
                    "payment_status": "paid",
                    "payment_amount": payment.get("amount"),
                    "payment_date": datetime.now(timezone.utc).isoformat(),
                    "payment_method": payment_method,
                    "payment_transaction_id": cf_payment_id,
                    "pending_payment": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                logging.info(f"[PAYMENT_VERIFY] Preparing student update: {student_update}")
                
                if batch_id:
                    student_update["batch_id"] = batch_id
                    student_update["batch_name"] = payment.get("batch_name")
                    
                    # Add student to batch if not already added
                    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
                    logging.info(f"[PAYMENT_VERIFY] Batch lookup: found={batch is not None}, batch_name={batch.get('name') if batch else 'N/A'}")
                    
                    if batch:
                        current_students = batch.get("students", [])
                        if student_id not in current_students:
                            logging.info(f"[PAYMENT_VERIFY] Adding student to batch")
                            await db.batches.update_one(
                                {"id": batch_id},
                                {"$addToSet": {"students": student_id}}
                            )
                            
                            # Create sessions for the student from batch schedule
                            schedule = batch.get("schedule", [])
                            logging.info(f"[PAYMENT_VERIFY] Batch schedule has {len(schedule)} entries")
                            
                            if schedule:
                                # Check if sessions already exist
                                existing_sessions = await db.sessions.count_documents({"student_id": student_id, "batch_id": batch_id})
                                logging.info(f"[PAYMENT_VERIFY] Existing sessions count: {existing_sessions}")
                                
                                if existing_sessions == 0:
                                    sessions_to_create = []
                                    for i, session_info in enumerate(schedule[:12], 1):
                                        session = {
                                            "id": str(uuid.uuid4()),
                                            "student_id": student_id,
                                            "batch_id": batch_id,
                                            "session_number": i,
                                            "date": session_info.get("date"),
                                            "time": session_info.get("time", batch.get("time")),
                                            "mode": batch.get("mode", "online"),
                                            "skill": batch.get("skill"),
                                            "status": "scheduled",
                                            "created_at": datetime.now(timezone.utc).isoformat()
                                        }
                                        sessions_to_create.append(session)
                                    
                                    if sessions_to_create:
                                        logging.info(f"[PAYMENT_VERIFY] Creating {len(sessions_to_create)} sessions")
                                        await db.sessions.insert_many(sessions_to_create)
                                        student_update["sessions_total"] = len(sessions_to_create)
                                        student_update["sessions_completed"] = 0
                                else:
                                    logging.info(f"[PAYMENT_VERIFY] Sessions already exist, skipping creation")
                        else:
                            logging.info(f"[PAYMENT_VERIFY] Student already in batch")
                    else:
                        logging.warning(f"[PAYMENT_VERIFY] Batch not found: {batch_id}")
                else:
                    logging.warning(f"[PAYMENT_VERIFY] No batch_id in payment record")
                
                # Perform the student update
                logging.info(f"[PAYMENT_VERIFY] Executing student_inquiries update for {student_id}")
                update_result = await db.student_inquiries.update_one(
                    {"id": student_id},
                    {"$set": student_update}
                )
                logging.info(f"[PAYMENT_VERIFY] Update result: matched={update_result.matched_count}, modified={update_result.modified_count}")
                
                # Verify the update worked
                updated_student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0, "status": 1, "payment_status": 1})
                logging.info(f"[PAYMENT_VERIFY] Post-update verification: status={updated_student.get('status') if updated_student else 'N/A'}, payment_status={updated_student.get('payment_status') if updated_student else 'N/A'}")
            else:
                logging.info(f"[PAYMENT_VERIFY] Order status is {order_status}, not PAID - skipping student update")
            
            return {
                "order_id": order_id,
                "status": order_status,
                "amount": payment.get("amount"),
                "student_name": payment.get("student_name"),
                "transaction_id": cf_payment_id
            }
        else:
            logging.warning(f"[PAYMENT_VERIFY] No data in Cashfree response")
            return {"order_id": order_id, "status": payment.get("status", "UNKNOWN")}
            
    except Exception as e:
        logging.error(f"[PAYMENT_VERIFY] Exception during verification: {str(e)}", exc_info=True)
        return {"order_id": order_id, "status": payment.get("status", "UNKNOWN"), "error": str(e)}

# ========================
# SCHOOL STUDENT PAYMENTS (Public)
# ========================

@router.get("/school-payment/{school_id}")
async def get_school_payment_info(school_id: str):
    """Get school info for student payment page (public)"""
    # Check cache first
    cache_key = f"school_payment_{school_id}"
    cached = get_cached(cache_key)
    if cached:
        return cached
    
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    onboarding_data = school.get("onboarding_data", {})
    payment_mode = onboarding_data.get("payment_mode", "")
    payment_method = onboarding_data.get("payment_method", "")
    
    # Check if online payment by students is enabled
    if payment_mode != "online" or payment_method != "student":
        raise HTTPException(status_code=400, detail="Online student payment not enabled for this school")
    
    grade_pricing = onboarding_data.get("grade_pricing", [])
    if not grade_pricing:
        raise HTTPException(status_code=400, detail="No grade pricing configured for this school")
    
    # Transform grade_pricing to use 'price' key for frontend compatibility
    # The data may have 'price_per_student' from the admin form
    transformed_pricing = []
    for gp in grade_pricing:
        price = gp.get("price") or gp.get("price_per_student") or 0
        transformed_pricing.append({
            "grade": gp.get("grade", ""),
            "price": float(price) if price else 0,
            "students": gp.get("students", 0)
        })
    
    # Get skill/program from offerings or model
    skill = onboarding_data.get("offering") or school.get("skill") or "Program"
    
    result = {
        "school_id": school_id,
        "school_name": school.get("school_name", ""),
        "skill": skill,
        "city": school.get("city", ""),
        "grade_pricing": transformed_pricing,
        "total_students": onboarding_data.get("total_students", 0),
        "total_amount": onboarding_data.get("total_amount", 0)
    }
    
    # Cache for 5 minutes
    set_cached(cache_key, result, 300)
    return result

@router.post("/school-payment/create-session")
async def create_school_student_payment_session(data: dict):
    """Create Cashfree payment session for school student (public)"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    school_id = data.get("school_id")
    student_name = data.get("student_name", "").strip()
    phone = data.get("phone", "").strip()
    grade = data.get("grade", "").strip()
    division = data.get("division", "").strip()
    amount = data.get("amount", 0)
    
    if not all([school_id, student_name, phone, grade, amount]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Validate student name is at least 3 characters (Cashfree requirement)
    if len(student_name) < 3:
        raise HTTPException(status_code=400, detail="Student name must be at least 3 characters")
    
    # Validate school exists and has online payment enabled
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    onboarding_data = school.get("onboarding_data", {})
    if onboarding_data.get("payment_mode") != "online" or onboarding_data.get("payment_method") != "student":
        raise HTTPException(status_code=400, detail="Online student payment not enabled")
    
    # Validate amount matches grade pricing
    grade_pricing = onboarding_data.get("grade_pricing", [])
    grade_match = next((g for g in grade_pricing if g.get("grade") == grade), None)
    if not grade_match:
        raise HTTPException(status_code=400, detail=f"Invalid grade: {grade}")
    
    # Handle both 'price' and 'price_per_student' field names
    expected_amount = grade_match.get("price") or grade_match.get("price_per_student") or 0
    if float(amount) != float(expected_amount):
        raise HTTPException(status_code=400, detail=f"Amount mismatch. Expected: {expected_amount}")
    
    skill = onboarding_data.get("offering") or school.get("skill") or "Program"
    
    # Generate unique order ID
    order_id = f"SCH_{school_id[:8]}_{str(uuid.uuid4())[:8]}"
    
    # Ensure customer_name meets Cashfree minimum (3 chars) - pad if needed
    cf_customer_name = student_name if len(student_name) >= 3 else student_name.ljust(3, ' ')
    
    try:
        # Create Cashfree order using globally initialized credentials
        customer_details = CashfreeCustomerDetails(
            customer_id=f"sch_std_{phone}",
            customer_phone=phone,
            customer_name=cf_customer_name
        )
        
        order_meta = OrderMeta(
            return_url=f"{os.environ.get('FRONTEND_URL', 'https://oll.co')}/school-payment-success/{school_id}?order_id={order_id}"
        )
        
        order_request = CreateOrderRequest(
            order_id=order_id,
            order_amount=float(amount),
            order_currency="INR",
            customer_details=customer_details,
            order_meta=order_meta,
            order_note=f"School: {school.get('school_name')} | {skill} | Grade {grade}"
        )
        
        logging.info(f"Creating school payment - Order: {order_id}, Amount: {amount}, School: {school.get('school_name')}")
        
        # Use globally initialized Cashfree - credentials already set at startup
        api_response = await asyncio.to_thread(get_cashfree_client().PGCreateOrder,
            CASHFREE_API_VERSION, 
            order_request, 
            None, 
            None
        )
        
        if api_response.data:
            cf_order_id = api_response.data.cf_order_id
            payment_session_id = api_response.data.payment_session_id
            
            # Store payment record
            payment_record = {
                "id": order_id,
                "type": "school_student",
                "school_id": school_id,
                "school_name": school.get("school_name", ""),
                "student_name": student_name,
                "phone": phone,
                "grade": grade,
                "division": division,
                "skill": skill,
                "amount": float(amount),
                "cf_order_id": cf_order_id,
                "payment_session_id": payment_session_id,
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.school_student_payments.insert_one(payment_record)
            
            return {
                "success": True,
                "order_id": order_id,
                "payment_session_id": payment_session_id,
                "environment": CASHFREE_ENVIRONMENT.lower()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create payment order")
            
    except Exception as e:
        logging.error(f"School payment session creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/school-payment/webhook")
async def school_payment_webhook(request: Request):
    """Handle Cashfree webhook for school student payments"""
    try:
        body = await request.body()
        body_str = body.decode('utf-8')
        
        webhook_data = json.loads(body_str)
        event_type = webhook_data.get('type', '')
        order_data = webhook_data.get('data', {}).get('order', {})
        payment_data = webhook_data.get('data', {}).get('payment', {})
        
        order_id = order_data.get('order_id') or webhook_data.get('data', {}).get('order_id')
        payment_status = payment_data.get('payment_status') or order_data.get('order_status')
        cf_payment_id = payment_data.get('cf_payment_id') or payment_data.get('payment_id')
        payment_method = payment_data.get('payment_group', 'unknown')
        
        logging.info(f"School payment webhook - Order: {order_id}, Status: {payment_status}")
        
        if order_id and order_id.startswith("SCH_"):
            # Check if already processed
            existing = await db.school_student_payments.find_one({"id": order_id}, {"_id": 0})
            if existing and existing.get("status") == "PAID":
                return {"status": "success", "message": "Already processed"}
            
            update_data = {
                "status": payment_status,
                "webhook_data": webhook_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if payment_status == "SUCCESS" or event_type == "PAYMENT_SUCCESS_WEBHOOK":
                update_data["status"] = "PAID"
                update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                update_data["transaction_id"] = cf_payment_id
                update_data["cf_payment_id"] = cf_payment_id
                update_data["payment_method"] = f"Cashfree - {payment_method}"
            
            await db.school_student_payments.update_one(
                {"id": order_id},
                {"$set": update_data}
            )
            
        return {"status": "success"}
    except Exception as e:
        logging.error(f"School payment webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.get("/school-payment/verify/{order_id}")
async def verify_school_student_payment(order_id: str):
    """Verify school student payment status"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    payment = await db.school_student_payments.find_one({"id": order_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # If already paid, return status
    if payment.get("status") == "PAID":
        return {
            "order_id": order_id,
            "status": "PAID",
            "amount": payment.get("amount"),
            "student_name": payment.get("student_name"),
            "transaction_id": payment.get("transaction_id")
        }
    
    try:
        # Use the order_id (our ID) to fetch from Cashfree, NOT cf_order_id
        # Cashfree PGFetchOrder expects the order_id we sent when creating the order
        logging.info(f"Verifying school payment - Order ID: {order_id}")
        
        # Use globally initialized Cashfree - credentials already set at startup
        api_response = await asyncio.to_thread(get_cashfree_client().PGFetchOrder,
            CASHFREE_API_VERSION,
            order_id,  # Use our order_id, not cf_order_id
            None
        )
        
        logging.info(f"School payment verification - Order: {order_id}, API Response data: {api_response.data}")
        
        if api_response.data:
            order_status = api_response.data.order_status
            logging.info(f"Order status from Cashfree: {order_status}")
            
            # Try to get transaction ID
            cf_payment_id = None
            payment_method = "Cashfree"
            try:
                payments_response = await asyncio.to_thread(get_cashfree_client().PGOrderFetchPayments,
                    CASHFREE_API_VERSION,
                    order_id,  # Use our order_id
                    None
                )
                logging.info(f"Payments response: {payments_response.data}")
                if payments_response.data and len(payments_response.data) > 0:
                    cf_payment_id = str(payments_response.data[0].cf_payment_id)
                    payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                    logging.info(f"Payment details fetched - CF Payment ID: {cf_payment_id}, Method: {payment_method}")
            except Exception as e:
                logging.warning(f"Could not fetch payment details: {e}")
            
            update_data = {
                "status": order_status,
                "verified_at": datetime.now(timezone.utc).isoformat()
            }
            if cf_payment_id:
                update_data["transaction_id"] = cf_payment_id
                update_data["cf_payment_id"] = cf_payment_id
                update_data["payment_method"] = payment_method
            
            if order_status == "PAID":
                update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.school_student_payments.update_one(
                {"id": order_id},
                {"$set": update_data}
            )
            
            return {
                "order_id": order_id,
                "status": order_status,
                "amount": payment.get("amount"),
                "student_name": payment.get("student_name"),
                "transaction_id": cf_payment_id
            }
        
        return {"order_id": order_id, "status": payment.get("status", "UNKNOWN")}
        
    except Exception as e:
        logging.error(f"School payment verification error: {str(e)}")
        return {"order_id": order_id, "status": payment.get("status", "UNKNOWN"), "error": str(e)}

@router.get("/school-payment/tracker/{school_id}")
async def get_school_payment_tracker(
    school_id: str,
    grade: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all student payments for a school (admin)"""
    query = {"school_id": school_id}
    if grade:
        query["grade"] = grade
    
    payments = await db.school_student_payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    # Calculate stats
    total_collected = sum(p.get("amount", 0) for p in payments if p.get("status") == "PAID")
    paid_count = len([p for p in payments if p.get("status") == "PAID"])
    pending_count = len([p for p in payments if p.get("status") != "PAID"])
    
    # Grade-wise breakdown
    grade_stats = {}
    for p in payments:
        g = p.get("grade", "Unknown")
        if g not in grade_stats:
            grade_stats[g] = {"paid": 0, "pending": 0, "amount": 0}
        if p.get("status") == "PAID":
            grade_stats[g]["paid"] += 1
            grade_stats[g]["amount"] += p.get("amount", 0)
        else:
            grade_stats[g]["pending"] += 1
    
    # Get school info for expected totals
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    onboarding_data = school.get("onboarding_data", {}) if school else {}
    total_students = onboarding_data.get("total_students", 0)
    total_expected = onboarding_data.get("total_amount", 0)
    
    return {
        "payments": payments,
        "stats": {
            "total_collected": total_collected,
            "paid_count": paid_count,
            "pending_count": pending_count,
            "total_students": total_students,
            "total_expected": total_expected,
            "collection_percentage": round((total_collected / total_expected * 100), 1) if total_expected > 0 else 0
        },
        "grade_stats": grade_stats
    }

@router.get("/school-payment/tracker-public/{school_id}")
async def get_school_payment_tracker_public(school_id: str):
    """Get school payment tracker summary with student list (public - for tracking page)"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Get ALL payments for this school (both PAID and PENDING/ACTIVE)
    all_payments = await db.school_student_payments.find(
        {"school_id": school_id}, 
        {"_id": 0}
    ).to_list(5000)
    
    paid_payments = [p for p in all_payments if p.get("status") == "PAID"]
    pending_payments = [p for p in all_payments if p.get("status") in ["PENDING", "ACTIVE"]]
    
    total_collected = sum(p.get("amount", 0) for p in paid_payments)
    paid_count = len(paid_payments)
    pending_count = len(pending_payments)
    
    onboarding_data = school.get("onboarding_data", {})
    total_students = onboarding_data.get("total_students", 0)
    total_expected = onboarding_data.get("total_amount", 0)
    
    # Grade-wise counts (paid only)
    grade_counts = {}
    for p in paid_payments:
        g = p.get("grade", "Unknown")
        grade_counts[g] = grade_counts.get(g, 0) + 1
    
    # Get unique grades and divisions for filters
    all_grades = list(set(p.get("grade", "") for p in paid_payments if p.get("grade")))
    all_divisions = list(set(p.get("division", "") for p in paid_payments if p.get("division")))
    
    # Student list (paid students only - with essential info for display)
    student_list = []
    for p in paid_payments:
        student_list.append({
            "name": p.get("student_name", ""),
            "phone": p.get("phone", "")[-4:] if p.get("phone") else "****",  # Only show last 4 digits for privacy
            "grade": p.get("grade", ""),
            "division": p.get("division", ""),
            "paid_at": p.get("verified_at") or p.get("created_at", "")
        })
    
    # Sort by paid date (most recent first)
    student_list.sort(key=lambda x: x.get("paid_at", ""), reverse=True)
    
    return {
        "school_name": school.get("school_name", ""),
        "total_collected": total_collected,
        "paid_count": paid_count,
        "pending_count": pending_count,
        "total_students": total_students,
        "total_expected": total_expected,
        "collection_percentage": round((paid_count / total_students * 100), 1) if total_students > 0 else 0,
        "grade_counts": grade_counts,
        "student_list": student_list,
        "available_grades": sorted(all_grades),
        "available_divisions": sorted(all_divisions)
    }

# ========================
# SCHOOL STUDENT PAYMENT ADMIN ENDPOINTS
# ========================

@router.patch("/school-payment/student/{payment_id}")
async def update_school_student_record(payment_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Admin: Edit a student's name, grade, division"""
    allowed_fields = ["student_name", "grade", "division"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.school_student_payments.update_one({"id": payment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return {"message": "Record updated successfully"}

@router.patch("/school-payment/status/{payment_id}")
async def update_school_payment_status(payment_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Admin: Change payment status (e.g., mark as REFUNDED)"""
    new_status = data.get("status")
    if new_status not in ["REFUNDED", "CANCELLED", "PENDING"]:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed: REFUNDED, CANCELLED, PENDING")
    update_data = {
        "status": new_status,
        "status_updated_at": datetime.now(timezone.utc).isoformat(),
        "status_updated_by": user.get("email", "admin")
    }
    result = await db.school_student_payments.update_one({"id": payment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return {"message": f"Status updated to {new_status}"}

@router.post("/school-payment/refund/{payment_id}")
async def initiate_cashfree_refund(payment_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Admin: Initiate a Cashfree refund for a PAID school student payment"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    payment = await db.school_student_payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.get("status") != "PAID":
        raise HTTPException(status_code=400, detail="Refunds can only be initiated for PAID payments")
    
    # Use the merchant order_id (the 'id' field we set when creating the order)
    order_id = payment.get("id")
    refund_amount = float(data.get("refund_amount", payment.get("amount", 0)))
    refund_note = data.get("refund_note", "Admin initiated refund")
    refund_id = f"REF_{payment_id[:20]}_{int(datetime.now(timezone.utc).timestamp())}"
    
    try:
        from cashfree_pg.models.order_create_refund_request import OrderCreateRefundRequest
        refund_request = OrderCreateRefundRequest(
            refund_amount=refund_amount,
            refund_id=refund_id,
            refund_note=refund_note,
            refund_speed="STANDARD"
        )
        api_response = await asyncio.to_thread(get_cashfree_client().PGOrderCreateRefund,
            CASHFREE_API_VERSION,
            order_id,
            refund_request,
            None
        )
        refund_data = api_response.to_dict() if hasattr(api_response, 'to_dict') else {}
        
        # Update payment status in DB
        await db.school_student_payments.update_one(
            {"id": payment_id},
            {"$set": {
                "status": "REFUNDED",
                "refund_id": refund_id,
                "refund_amount": refund_amount,
                "refund_note": refund_note,
                "refunded_at": datetime.now(timezone.utc).isoformat(),
                "refunded_by": user.get("email", "admin")
            }}
        )
        return {"message": "Refund initiated successfully", "refund_id": refund_id, "data": refund_data}
    except Exception as e:
        logging.error(f"[REFUND] Cashfree refund failed for {payment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Refund failed: {str(e)}")

# ========================
# PAYMENT SYNC ENDPOINTS (Admin)
# ========================

@router.post("/payments/sync-single/{order_id}")
async def sync_single_payment_status(order_id: str, user: dict = Depends(get_current_user)):
    """Manually sync a single payment status from Cashfree"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Determine which collection to check
    payment = None
    collection_name = None
    
    # Check student_payments first
    payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
    if payment:
        collection_name = "student_payments"
    else:
        # Check school_student_payments
        payment = await db.school_student_payments.find_one({"id": order_id}, {"_id": 0})
        if payment:
            collection_name = "school_student_payments"
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found in any collection")
    
    old_status = payment.get("status")
    
    try:
        logging.info(f"[SYNC] Syncing payment {order_id} from {collection_name}, current status: {old_status}")
        
        # Fetch from Cashfree
        api_response = await asyncio.to_thread(get_cashfree_client().PGFetchOrder,
            CASHFREE_API_VERSION,
            order_id,
            None
        )
        
        if not api_response.data:
            return {
                "order_id": order_id,
                "collection": collection_name,
                "old_status": old_status,
                "new_status": old_status,
                "synced": False,
                "message": "No data returned from Cashfree"
            }
        
        cashfree_status = api_response.data.order_status
        logging.info(f"[SYNC] Cashfree returned status: {cashfree_status}")
        
        # Get payment details for transaction ID
        cf_payment_id = None
        payment_method = "Cashfree"
        try:
            payments_response = await asyncio.to_thread(get_cashfree_client().PGOrderFetchPayments,
                CASHFREE_API_VERSION,
                order_id,
                None
            )
            if payments_response.data and len(payments_response.data) > 0:
                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
        except Exception as e:
            logging.warning(f"[SYNC] Could not fetch payment details: {e}")
        
        # Build update data
        update_data = {
            "status": cashfree_status,
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "sync_source": "manual"
        }
        
        if cf_payment_id:
            update_data["transaction_id"] = cf_payment_id
            update_data["cf_payment_id"] = cf_payment_id
            update_data["payment_method"] = payment_method
        
        if cashfree_status == "PAID" and old_status != "PAID":
            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update the payment record
        collection = db.student_payments if collection_name == "student_payments" else db.school_student_payments
        await collection.update_one({"id": order_id}, {"$set": update_data})
        
        # If student_payments and status changed to PAID, update student record
        if collection_name == "student_payments" and cashfree_status == "PAID" and old_status != "PAID":
            student_id = payment.get("student_id")
            batch_id = payment.get("batch_id")
            
            if student_id:
                student_update = {
                    "status": "converted",
                    "payment_status": "paid",
                    "payment_amount": payment.get("amount"),
                    "payment_date": datetime.now(timezone.utc).isoformat(),
                    "payment_method": payment_method,
                    "payment_transaction_id": cf_payment_id,
                    "pending_payment": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if batch_id:
                    student_update["batch_id"] = batch_id
                    student_update["batch_name"] = payment.get("batch_name")
                    
                    # Add to batch if not already
                    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
                    if batch and student_id not in batch.get("students", []):
                        await db.batches.update_one({"id": batch_id}, {"$addToSet": {"students": student_id}})
                
                await db.student_inquiries.update_one({"id": student_id}, {"$set": student_update})
                logging.info(f"[SYNC] Updated student {student_id} to converted")
        
        return {
            "order_id": order_id,
            "collection": collection_name,
            "old_status": old_status,
            "new_status": cashfree_status,
            "transaction_id": cf_payment_id,
            "synced": True,
            "status_changed": old_status != cashfree_status
        }
        
    except Exception as e:
        logging.error(f"[SYNC] Error syncing payment {order_id}: {str(e)}")
        return {
            "order_id": order_id,
            "collection": collection_name,
            "old_status": old_status,
            "synced": False,
            "error": str(e)
        }


@router.post("/payments/sync-all")
async def sync_all_pending_payments(
    payment_type: Optional[str] = Query(None, description="student, school, or all"),
    user: dict = Depends(get_current_user)
):
    """Sync all pending/non-PAID payments with Cashfree - checks every payment status"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    results = {
        "student_payments": {"checked": 0, "updated": 0, "errors": 0, "details": []},
        "school_payments": {"checked": 0, "updated": 0, "errors": 0, "details": []}
    }
    
    # Sync student payments
    if payment_type in [None, "all", "student"]:
        # Get all non-PAID student payments
        pending_payments = await db.student_payments.find(
            {"status": {"$nin": ["PAID", "CANCELLED", "EXPIRED"]}},
            {"_id": 0}
        ).to_list(1000)
        
        for payment in pending_payments:
            order_id = payment.get("id")
            old_status = payment.get("status")
            results["student_payments"]["checked"] += 1
            
            try:
                api_response = await asyncio.to_thread(get_cashfree_client().PGFetchOrder,
                    CASHFREE_API_VERSION,
                    order_id,
                    None
                )
                
                if api_response.data:
                    new_status = api_response.data.order_status
                    
                    if new_status != old_status:
                        # Get transaction details
                        cf_payment_id = None
                        payment_method = "Cashfree"
                        try:
                            payments_response = await asyncio.to_thread(get_cashfree_client().PGOrderFetchPayments,
                                CASHFREE_API_VERSION, order_id, None
                            )
                            if payments_response.data and len(payments_response.data) > 0:
                                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                        except Exception:
                            pass
                        
                        update_data = {
                            "status": new_status,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                            "sync_source": "bulk"
                        }
                        if cf_payment_id:
                            update_data["transaction_id"] = cf_payment_id
                            update_data["cf_payment_id"] = cf_payment_id
                            update_data["payment_method"] = payment_method
                        if new_status == "PAID":
                            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                        
                        await db.student_payments.update_one({"id": order_id}, {"$set": update_data})
                        
                        # Update student if PAID
                        if new_status == "PAID":
                            student_id = payment.get("student_id")
                            if student_id:
                                student_update = {
                                    "status": "converted",
                                    "payment_status": "paid",
                                    "payment_amount": payment.get("amount"),
                                    "payment_date": datetime.now(timezone.utc).isoformat(),
                                    "pending_payment": None,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }
                                if cf_payment_id:
                                    student_update["payment_transaction_id"] = cf_payment_id
                                    student_update["payment_method"] = payment_method
                                await db.student_inquiries.update_one({"id": student_id}, {"$set": student_update})
                        
                        results["student_payments"]["updated"] += 1
                        results["student_payments"]["details"].append({
                            "order_id": order_id,
                            "old_status": old_status,
                            "new_status": new_status,
                            "student_name": payment.get("student_name")
                        })
                        
            except Exception as e:
                results["student_payments"]["errors"] += 1
                logging.error(f"[BULK_SYNC] Error syncing student payment {order_id}: {e}")
    
    # Sync school student payments
    if payment_type in [None, "all", "school"]:
        pending_school_payments = await db.school_student_payments.find(
            {"status": {"$nin": ["PAID", "CANCELLED", "EXPIRED"]}},
            {"_id": 0}
        ).to_list(5000)
        
        for payment in pending_school_payments:
            order_id = payment.get("id")
            old_status = payment.get("status")
            results["school_payments"]["checked"] += 1
            
            try:
                api_response = await asyncio.to_thread(get_cashfree_client().PGFetchOrder,
                    CASHFREE_API_VERSION,
                    order_id,
                    None
                )
                
                if api_response.data:
                    new_status = api_response.data.order_status
                    
                    if new_status != old_status:
                        cf_payment_id = None
                        payment_method = "Cashfree"
                        try:
                            payments_response = await asyncio.to_thread(get_cashfree_client().PGOrderFetchPayments,
                                CASHFREE_API_VERSION, order_id, None
                            )
                            if payments_response.data and len(payments_response.data) > 0:
                                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                        except Exception:
                            pass
                        
                        update_data = {
                            "status": new_status,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                            "sync_source": "bulk"
                        }
                        if cf_payment_id:
                            update_data["transaction_id"] = cf_payment_id
                            update_data["cf_payment_id"] = cf_payment_id
                            update_data["payment_method"] = payment_method
                        if new_status == "PAID":
                            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                        
                        await db.school_student_payments.update_one({"id": order_id}, {"$set": update_data})
                        
                        results["school_payments"]["updated"] += 1
                        results["school_payments"]["details"].append({
                            "order_id": order_id,
                            "old_status": old_status,
                            "new_status": new_status,
                            "student_name": payment.get("student_name"),
                            "school_id": payment.get("school_id")
                        })
                        
            except Exception as e:
                results["school_payments"]["errors"] += 1
                logging.error(f"[BULK_SYNC] Error syncing school payment {order_id}: {e}")
    
    # Summary
    total_checked = results["student_payments"]["checked"] + results["school_payments"]["checked"]
    total_updated = results["student_payments"]["updated"] + results["school_payments"]["updated"]
    total_errors = results["student_payments"]["errors"] + results["school_payments"]["errors"]
    
    logging.info(f"[BULK_SYNC] Complete - Checked: {total_checked}, Updated: {total_updated}, Errors: {total_errors}")
    
    return {
        "summary": {
            "total_checked": total_checked,
            "total_updated": total_updated,
            "total_errors": total_errors
        },
        "results": results
    }


@router.get("/payments/status-report")
async def get_payment_status_report(user: dict = Depends(get_current_user)):
    """Get a report of all payments and their statuses for diagnostics"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Student payments stats
    student_payments = await db.student_payments.find({}, {"_id": 0, "id": 1, "status": 1, "student_name": 1, "amount": 1, "created_at": 1}).to_list(1000)
    student_by_status = {}
    for p in student_payments:
        status = p.get("status", "UNKNOWN")
        if status not in student_by_status:
            student_by_status[status] = []
        student_by_status[status].append({
            "order_id": p.get("id"),
            "student_name": p.get("student_name"),
            "amount": p.get("amount"),
            "created_at": p.get("created_at")
        })
    
    # School student payments stats
    school_payments = await db.school_student_payments.find({}, {"_id": 0, "id": 1, "status": 1, "student_name": 1, "school_id": 1, "amount": 1, "created_at": 1}).to_list(5000)
    school_by_status = {}
    for p in school_payments:
        status = p.get("status", "UNKNOWN")
        if status not in school_by_status:
            school_by_status[status] = []
        school_by_status[status].append({
            "order_id": p.get("id"),
            "student_name": p.get("student_name"),
            "school_id": p.get("school_id"),
            "amount": p.get("amount"),
            "created_at": p.get("created_at")
        })
    
    return {
        "student_payments": {
            "total": len(student_payments),
            "by_status": {status: len(payments) for status, payments in student_by_status.items()},
            "pending_list": student_by_status.get("PENDING", []) + student_by_status.get("ACTIVE", [])
        },
        "school_payments": {
            "total": len(school_payments),
            "by_status": {status: len(payments) for status, payments in school_by_status.items()},
            "pending_list": school_by_status.get("PENDING", []) + school_by_status.get("ACTIVE", [])
        }
    }


@router.get("/payments/scheduler-status")
async def get_scheduler_status(user: dict = Depends(get_current_user)):
    """Get the payment sync scheduler status"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    job = scheduler.get_job("payment_sync_job")
    
    return {
        "enabled": PAYMENT_SYNC_ENABLED,
        "running": scheduler.running,
        "interval_minutes": PAYMENT_SYNC_INTERVAL_MINUTES,
        "next_run": job.next_run_time.isoformat() if job and job.next_run_time else None,
        "cashfree_configured": bool(CASHFREE_APP_ID and CASHFREE_SECRET_KEY)
    }


@router.post("/payments/trigger-sync")
async def trigger_manual_sync(user: dict = Depends(get_current_user)):
    """Manually trigger a payment sync (runs immediately)"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Cashfree credentials not configured")
    
    # Run the sync immediately in the background
    asyncio.create_task(scheduled_payment_sync())
    
    return {"message": "Payment sync triggered", "status": "running"}


