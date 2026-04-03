"""
Orders (school payments, student payments) and Support Tracking Tickets.
"""
import os
import uuid
import asyncio
import httpx
import io
import csv
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ConfigDict

from .shared import db, get_current_user, ensure_resend_api_key, SENDER_EMAIL
from .notifications import send_whatsapp_notification

router = APIRouter()

# ── Routes ─────────────────────────────────────────────────────────────────────
@router.get("/support/tracking-tickets")
async def get_tracking_page_tickets(
    status: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Get support tickets created from tracking pages"""
    query = {"source": "tracking_page"}
    if status:
        query["status"] = status
    
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"tickets": tickets, "total": len(tickets)}

# Update tracking page ticket (for admin)
@router.patch("/support/tracking-tickets/{ticket_id}")
async def update_tracking_ticket(ticket_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a tracking page support ticket"""
    ticket = await db.support_tickets.find_one({"id": ticket_id, "source": "tracking_page"})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if "status" in data:
        update_data["status"] = data["status"]
    
    if "response" in data:
        responses = ticket.get("responses", [])
        responses.append({
            "text": data["response"],
            "by": user.get("name", user.get("email")),
            "date": datetime.now(timezone.utc).isoformat()
        })
        update_data["responses"] = responses
    
    if "assigned_to" in data:
        update_data["assigned_to"] = data["assigned_to"]
    
    await db.support_tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    updated_ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    return {"success": True, "ticket": updated_ticket}

@router.post("/support/tracking-tickets/{ticket_id}/assign")
async def assign_tracking_ticket(ticket_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Assign a tracking page support ticket to a user"""
    assigned_to = data.get("assigned_to")
    deadline = data.get("deadline")
    
    ticket = await db.support_tickets.find_one({"id": ticket_id, "source": "tracking_page"}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Handle unassign case
    if not assigned_to or assigned_to == "":
        await db.support_tickets.update_one(
            {"id": ticket_id}, 
            {"$set": {"assigned_to": None, "deadline": None}}
        )
        return {"message": "Ticket unassigned"}
    
    # Get the user being assigned
    assignee = await db.team_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.center_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.admins.find_one({"id": assigned_to}, {"_id": 0})
    
    assignee_name = assignee.get("name", "Team Member") if assignee else "Unknown"
    
    # Update the ticket with assignment
    update_data = {
        "assigned_to": assigned_to,
        "assigned_to_name": assignee_name,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "assigned_by": user.get("email", "admin"),
        "deadline": deadline,
        "status": "in_progress" if ticket.get("status") == "open" else ticket.get("status"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    return {"message": "Ticket assigned successfully", "assigned_to": assignee_name}

@router.delete("/support/tracking-tickets/{ticket_id}")
async def delete_tracking_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    """Delete a tracking page support ticket"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete tickets")
    
    result = await db.support_tickets.delete_one({"id": ticket_id, "source": "tracking_page"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"message": "Ticket deleted successfully"}

# ========================
# ORDERS & PAYMENTS
# ========================

@router.get("/orders/school-payments")
async def get_school_payments(
    user: dict = Depends(get_current_user)
):
    """Get all school payments from converted/active schools with payment tranches"""
    payments = []
    
    # Get all schools with onboarding_data containing payment tranches
    schools = await db.school_inquiries.find({
        "status": {"$in": ["converted", "active", "renewed"]},
    }).to_list(length=None)
    
    for school in schools:
        onboarding_data = school.get("onboarding_data") or {}
        payment_tranches = onboarding_data.get("payment_tranches", [])
        school_payments = school.get("payments", [])
        
        # Create payment records from tranches
        for idx, tranche in enumerate(payment_tranches):
            # Check if there's already a payment record for this tranche
            existing_payment = next(
                (p for p in school_payments if p.get("tranche_index") == idx),
                None
            )
            
            amount = float(tranche.get("amount") or 0) if tranche.get("amount") else None
            if not amount and tranche.get("percentage"):
                total_amount = float(onboarding_data.get("total_amount") or 0)
                amount = total_amount * float(tranche.get("percentage") or 0) / 100
            
            school_gst_type = onboarding_data.get("gst_type", "")
            gst_type = existing_payment.get("gst_type") if existing_payment else (tranche.get("gst_type") or school_gst_type)
            # Compute gst_amount from gst_type and tranche amount
            gst_amount = 0
            if gst_type in ("exclusive_18", "exclusive"):
                gst_amount = round(amount * 18 / 100, 2) if amount else 0  # add 18% on top of base amount
            elif gst_type in ("inclusive_18", "inclusive"):
                gst_amount = round(amount - amount / 1.18, 2) if amount else 0  # extract GST from inclusive total
            payment = {
                "id": existing_payment.get("id") if existing_payment else f"pay-{school.get('id')}-{idx}",
                "school_id": school.get("id"),
                "school_name": school.get("school_name", ""),
                "contact_name": school.get("contact_name", ""),
                "tranche_index": idx,
                "tranche_info": f"Tranche {idx + 1}" + (f" ({tranche.get('percentage')}%)" if tranche.get("percentage") else ""),
                "amount": amount or 0,
                "due_date": tranche.get("date") or None,
                "status": existing_payment.get("status", tranche.get("status", "pending")) if existing_payment else tranche.get("status", "pending"),
                "gst_type": gst_type,
                "gst_amount": gst_amount,
                "payment_date": existing_payment.get("payment_date") if existing_payment else None,
                "transaction_id": existing_payment.get("transaction_id") if existing_payment else None,
                "invoice_url": existing_payment.get("invoice_url") if existing_payment else None,
                "receipt_url": existing_payment.get("receipt_url") if existing_payment else None,
                "notes": existing_payment.get("notes") if existing_payment else tranche.get("notes", ""),
                "paid_amount": existing_payment.get("paid_amount", 0) if existing_payment else 0,
                "created_at": existing_payment.get("created_at") if existing_payment else school.get("created_at"),
            }
            payments.append(payment)
    
    return payments


@router.get("/orders/school-details/{school_id}")
async def get_school_details_for_orders(
    school_id: str,
    user: dict = Depends(get_current_user)
):
    """Get school details for the Orders page - no role-based filtering since user can see payments"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school

@router.get("/orders/student-payments")
async def get_student_payments(
    user: dict = Depends(get_current_user)
):
    """Get all student payments (from converted students with payment details)"""
    payments = []
    
    # Get converted students from student_inquiries collection
    students = await db.student_inquiries.find({
        "status": {"$in": ["converted", "active", "enrolled"]}
    }).to_list(length=None)
    
    for student in students:
        onboarding_data = student.get("onboarding_data") or {}
        student_payments = student.get("payments", [])
        
        # Create payment record from student conversion data
        amount = onboarding_data.get("amount") or onboarding_data.get("total_amount") or student.get("conversion_amount") or 0
        if amount:
            try:
                amount = float(amount)
            except:
                amount = 0
        
        existing_payment = student_payments[0] if student_payments else None
        
        payment = {
            "id": existing_payment.get("id") if existing_payment else f"stu-{student.get('id')}",
            "student_id": student.get("id"),
            "student_name": student.get("name", ""),
            "parent_name": student.get("parent_name", student.get("contact_name", "")),
            "phone": student.get("phone", ""),
            "email": student.get("email", ""),
            "description": f"{student.get('skill', '')} - {student.get('age_group', '')}".strip(' -'),
            "amount": amount,
            "due_date": onboarding_data.get("due_date") or student.get("due_date"),
            "status": existing_payment.get("status", "pending") if existing_payment else "pending",
            "payment_date": existing_payment.get("payment_date") if existing_payment else None,
            "transaction_id": existing_payment.get("transaction_id") if existing_payment else None,
            "invoice_url": (existing_payment.get("invoice_url") if existing_payment else None) or onboarding_data.get("invoice_url"),
            "receipt_url": (existing_payment.get("receipt_url") if existing_payment else None) or onboarding_data.get("receipt_url"),
            "payment_link": existing_payment.get("payment_link") if existing_payment else onboarding_data.get("payment_link"),
            "notes": existing_payment.get("notes") if existing_payment else "",
            "created_at": student.get("created_at"),
            # Payment source fields
            "payment_from": existing_payment.get("payment_from", "individual") if existing_payment else "individual",
            "payment_mode": existing_payment.get("payment_mode") if existing_payment else onboarding_data.get("payment_mode"),
            "gst_type": existing_payment.get("gst_type") if existing_payment else onboarding_data.get("gst_type"),
            "gst_amount": existing_payment.get("gst_amount") if existing_payment else onboarding_data.get("gst_amount"),
            "batch_name": student.get("batch_name", ""),
            # Additional conversion details
            "conversion_details": {
                "skill": student.get("skill", ""),
                "age_group": student.get("age_group", ""),
                "learning_mode": student.get("learning_mode", ""),
                "center": student.get("selected_center", ""),
                "city": student.get("city", ""),
                "demo_date": student.get("demo_date"),
                "converted_at": student.get("converted_at", student.get("updated_at")),
            }
        }
        payments.append(payment)
    
    # Also get payments from dedicated student_payments collection (Cashfree payments)
    direct_payments = await db.student_payments.find({}).to_list(length=None)
    direct_payment_student_ids = set()
    
    for dp in direct_payments:
        dp_id = dp.get("id", str(dp.get("_id", "")))
        student_id = dp.get("student_id")
        direct_payment_student_ids.add(student_id)
        
        # Format for display
        formatted_payment = {
            "id": dp_id,
            "student_id": student_id,
            "student_name": dp.get("student_name", ""),
            "phone": dp.get("student_phone", ""),
            "email": dp.get("student_email", ""),
            "description": f"{dp.get('batch_name', 'Batch')} - Paid via Cashfree",
            "amount": dp.get("amount", 0),
            "status": "paid" if dp.get("status") == "PAID" else dp.get("status", "pending"),
            "payment_date": dp.get("paid_at") or dp.get("created_at"),
            "transaction_id": dp.get("transaction_id") or dp.get("cf_payment_id"),
            "payment_method": dp.get("payment_method", "Cashfree"),
            "order_id": dp_id,
            "cf_order_id": dp.get("cf_order_id"),
            "notes": f"Online payment via Cashfree" if dp.get("status") == "PAID" else "",
            "created_at": dp.get("created_at"),
            # Payment source fields
            "payment_from": dp.get("payment_from", "individual"),
            "payment_mode": "online",
            "batch_name": dp.get("batch_name", ""),
            "conversion_details": {
                "skill": dp.get("skill", ""),
                "batch_name": dp.get("batch_name", ""),
                "batch_id": dp.get("batch_id", ""),
            }
        }
        dp.pop("_id", None)
        payments.append(formatted_payment)
    
    # Filter out students that already have direct payments to avoid duplicates
    payments = [p for p in payments if p.get("student_id") not in direct_payment_student_ids or p.get("payment_method")]
    
    return payments

@router.patch("/orders/{payment_id}")
async def update_payment(
    payment_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update a payment status, add invoice/receipt"""
    # Determine payment type from ID prefix or request data
    payment_type = data.get("type", "school")
    if payment_id.startswith("stu-"):
        payment_type = "student"
    
    if payment_type == "school":
        # Payment ID format: pay-{school_id}-{tranche_index}
        parts = payment_id.split("-")
        if len(parts) >= 3:
            school_id = "-".join(parts[1:-1])
            tranche_index = int(parts[-1])
        else:
            raise HTTPException(status_code=400, detail="Invalid payment ID format")
        
        school = await db.school_inquiries.find_one({"id": school_id})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        # Update the payment record
        payments = school.get("payments", [])
        existing_idx = next(
            (i for i, p in enumerate(payments) if p.get("tranche_index") == tranche_index),
            None
        )
        
        # Preserve existing invoice/receipt URLs if incoming is empty (prevents accidental overwrites)
        existing_payment_rec = payments[existing_idx] if existing_idx is not None else {}
        incoming_invoice_url = data.get("invoice_url")
        incoming_receipt_url = data.get("receipt_url")
        # Only overwrite with empty if `clear_invoice`/`clear_receipt` flag is set by the frontend
        if not incoming_invoice_url and not data.get("clear_invoice") and existing_payment_rec.get("invoice_url"):
            incoming_invoice_url = existing_payment_rec.get("invoice_url")
        if not incoming_receipt_url and not data.get("clear_receipt") and existing_payment_rec.get("receipt_url"):
            incoming_receipt_url = existing_payment_rec.get("receipt_url")

        payment_record = {
            "id": payment_id,
            "tranche_index": tranche_index,
            "status": data.get("status", "pending"),
            "payment_date": data.get("payment_date"),
            "transaction_id": data.get("transaction_id"),
            "invoice_url": incoming_invoice_url,
            "receipt_url": incoming_receipt_url,
            "gst_type": data.get("gst_type"),
            "payment_link": data.get("payment_link"),
            "notes": data.get("notes", ""),
            "paid_amount": data.get("paid_amount", 0),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("name", user.get("email", "Admin")),
        }
        
        if existing_idx is not None:
            payment_record["created_at"] = payments[existing_idx].get("created_at", datetime.now(timezone.utc).isoformat())
            payments[existing_idx] = payment_record
        else:
            payment_record["created_at"] = datetime.now(timezone.utc).isoformat()
            payments.append(payment_record)
        
        # Send invoice email if new invoice is uploaded
        if data.get("invoice_url") and (existing_idx is None or not payments[existing_idx].get("invoice_url") if existing_idx is not None else True):
            # Get school contacts - specifically accounts team
            onboarding_data = school.get("onboarding_data") or {}
            school_contacts = onboarding_data.get("school_contacts", [])
            accounts_contacts = [c for c in school_contacts if c.get("role") == "accounts"]
            
            # If no accounts contact, use all contacts
            recipient_contacts = accounts_contacts if accounts_contacts else school_contacts
            
            # Also add main school email
            recipient_emails = []
            if school.get("email"):
                recipient_emails.append(school.get("email"))
            for c in recipient_contacts:
                if c.get("email") and c.get("email") not in recipient_emails:
                    recipient_emails.append(c.get("email"))
            
            if recipient_emails:
                try:
                    mou_url = onboarding_data.get("mou_url", "")
                    school_name = school.get("school_name", "")
                    total_amount = onboarding_data.get("total_amount", 0)
                    
                    # Get tranche info
                    payment_tranches = onboarding_data.get("payment_tranches", [])
                    tranche_info = payment_tranches[tranche_index] if tranche_index < len(payment_tranches) else {}
                    tranche_amount = tranche_info.get("amount", 0)
                    
                    invoice_email_html = f"""
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
                        <!-- Header with Logo -->
                        <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8f 100%); padding: 30px; text-align: center;">
                            <img src="https://customer-assets.emergentagent.com/job_oll-skill-edu/artifacts/wzn0gh6k_OLL-horizontal-logo-white.png" alt="OLL Logo" style="height: 50px; margin-bottom: 15px;">
                            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Invoice for Payment</h1>
                        </div>
                        
                        <!-- Main Content -->
                        <div style="padding: 30px; background: #f8fafc;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                Dear {school.get('contact_name', 'Team')},
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                                Please find attached the invoice for <strong>{school_name}</strong>. We kindly request you to process the payment at your earliest convenience.
                            </p>
                            
                            <!-- Payment Details Box -->
                            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                                <h3 style="color: #1E3A5F; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #1E3A5F; padding-bottom: 10px;">Payment Details</h3>
                                <table style="width: 100%; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">School Name:</td>
                                        <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">{school_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">Payment For:</td>
                                        <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">Tranche {tranche_index + 1}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">Amount Due:</td>
                                        <td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 18px; text-align: right;">₹{float(tranche_amount):,.2f}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">Total Contract Value:</td>
                                        <td style="padding: 8px 0; color: #111827; text-align: right;">₹{float(total_amount):,.2f}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div style="text-align: center; margin-bottom: 25px;">
                                <a href="{data.get('invoice_url')}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 5px;">
                                    📄 Download Invoice
                                </a>
                                {"<a href='" + mou_url + "' style='display: inline-block; background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8f 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 5px;'>📋 Download MOU</a>" if mou_url else ""}
                            </div>
                            
                            <!-- Bank Details Box -->
                            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                                <h3 style="color: #92400e; font-size: 16px; margin: 0 0 15px 0; display: flex; align-items: center;">
                                    🏦 Bank Transfer Details
                                </h3>
                                <table style="width: 100%; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 6px 0; color: #78350f; width: 40%;">Account Name:</td>
                                        <td style="padding: 6px 0; color: #451a03; font-weight: 600;">Clonefutura Live Solutions Pvt Ltd</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #78350f;">Account No:</td>
                                        <td style="padding: 6px 0; color: #451a03; font-weight: 600;">50200063789133</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #78350f;">IFSC Code:</td>
                                        <td style="padding: 6px 0; color: #451a03; font-weight: 600;">HDFC0000240</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #78350f;">Bank:</td>
                                        <td style="padding: 6px 0; color: #451a03; font-weight: 600;">HDFC Bank - Sandoz House Worli</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Company Details -->
                            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                                <h4 style="color: #374151; font-size: 14px; margin: 0 0 12px 0;">Company Details</h4>
                                <p style="color: #6b7280; font-size: 13px; margin: 0; line-height: 1.6;">
                                    <strong style="color: #1E3A5F;">Clonefutura Live Solutions Pvt Ltd.</strong><br>
                                    103 1st floor - Kshitij building, Veera Desai Rd,<br>
                                    Dattaguru Nagar, Azad Nagar, Andheri West,<br>
                                    Mumbai, Maharashtra 400053<br><br>
                                    <strong>GST No:</strong> 27AAKCC1113B1ZC<br>
                                    <strong>PAN:</strong> AAKCC1113B<br>
                                    <strong>Phone:</strong> +91 9699188188
                                </p>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                                If you have any questions regarding this invoice, please don't hesitate to contact us at <a href="mailto:accounts@oll.co" style="color: #1E3A5F;">accounts@oll.co</a> or call +91 9699188188.
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #1E3A5F; color: white; padding: 20px; text-align: center; font-size: 12px;">
                            <p style="margin: 0 0 5px 0;">OLL</p>
                            <p style="margin: 0; opacity: 0.7;">accounts@oll.co | +91 9920188188</p>
                        </div>
                    </div>
                    """
                    
                    for email in recipient_emails:
                        try:
                            email_params = {
                                "from": "OLL Accounts <accounts@oll.co>",
                                "to": [email],
                                "subject": f"Invoice for {school_name} - Tranche {tranche_index + 1}",
                                "html": invoice_email_html
                            }
                            await asyncio.to_thread(resend.Emails.send, email_params)
                            print(f"Invoice email sent to {email}")
                        except Exception as email_err:
                            print(f"Failed to send invoice email to {email}: {email_err}")
                except Exception as e:
                    print(f"Invoice email error: {e}")
        
        # Update onboarding workflow if payment is marked as paid
        update_fields = {"payments": payments, "updated_at": datetime.now(timezone.utc).isoformat()}
        
        if data.get("status") == "paid":
            # Check if all tranches are paid
            onboarding_data = school.get("onboarding_data") or {}
            payment_tranches = onboarding_data.get("payment_tranches", [])
            all_paid = all(
                any(p.get("tranche_index") == i and p.get("status") == "paid" for p in payments)
                for i in range(len(payment_tranches))
            ) if payment_tranches else True
            
            # Update onboarding workflow step
            workflow = school.get("onboarding_workflow", {})
            steps = workflow.get("steps", {})
            payment_step = steps.get("payment_collection", {})
            
            # Update payment step data
            payment_step["data"] = payment_step.get("data", {})
            payment_step["data"]["amount"] = data.get("amount") or payment_step["data"].get("amount")
            payment_step["data"]["payment_date"] = data.get("payment_date")
            payment_step["data"]["transaction_id"] = data.get("transaction_id")
            payment_step["data"]["receipt_url"] = data.get("receipt_url")
            payment_step["data"]["invoice_url"] = data.get("invoice_url")
            payment_step["data"]["payment_mode"] = "bank_transfer"  # Default
            
            # If all tranches paid, mark step as complete
            if all_paid and not payment_step.get("completed"):
                payment_step["completed"] = True
                payment_step["completed_date"] = datetime.now(timezone.utc).isoformat()
                
                # Update current step
                step_order = ["payment_collection", "kit_delivery", "distribution_checking", 
                              "technical_check", "teacher_training", "calendar_making", 
                              "timetable_finalization", "mou_signing", "school_confirmation"]
                for sk in step_order:
                    if not steps.get(sk, {}).get("completed", False):
                        workflow["current_step"] = sk
                        break
                
                # Add to timeline
                timeline = workflow.get("timeline", [])
                timeline.append({
                    "action": "Payment Collection - Completed",
                    "date": datetime.now(timezone.utc).isoformat(),
                    "by": user.get("name", user.get("email", "Admin")),
                    "step": "payment_collection"
                })
                workflow["timeline"] = timeline
            
            steps["payment_collection"] = payment_step
            workflow["steps"] = steps
            update_fields["onboarding_workflow"] = workflow
        
        await db.school_inquiries.update_one(
            {"id": school_id},
            {"$set": update_fields}
        )
        
        return {"success": True, "payment_id": payment_id, "status": data.get("status")}
    
    else:
        # Student payment - ID format: stu-{student_id}
        student_id = payment_id.replace("stu-", "")
        
        # Find the student
        student = await db.student_inquiries.find_one({"id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Get or initialize payments array
        payments = student.get("payments", [])
        
        # Find existing payment or create new one
        existing_idx = next(
            (i for i, p in enumerate(payments) if p.get("id") == payment_id),
            None
        )
        
        payment_record = {
            "id": payment_id,
            "status": data.get("status", "pending"),
            "payment_date": data.get("payment_date"),
            "transaction_id": data.get("transaction_id"),
            "invoice_url": data.get("invoice_url"),
            "receipt_url": data.get("receipt_url"),
            "notes": data.get("notes", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("name", user.get("email", "Admin")),
        }
        
        if existing_idx is not None:
            payment_record["created_at"] = payments[existing_idx].get("created_at", datetime.now(timezone.utc).isoformat())
            payments[existing_idx] = payment_record
        else:
            payment_record["created_at"] = datetime.now(timezone.utc).isoformat()
            payments.append(payment_record)
        
        # Update student record
        await db.student_inquiries.update_one(
            {"id": student_id},
            {"$set": {
                "payments": payments,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"success": True, "payment_id": payment_id, "status": data.get("status")}


@router.delete("/orders/student-payments/{payment_id}")
async def delete_student_payment(
    payment_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a student payment record"""
    # Check if it's a direct payment from student_payments collection (Cashfree)
    if not payment_id.startswith("stu-"):
        # This is a Cashfree payment - delete from student_payments collection
        result = await db.student_payments.delete_one({"id": payment_id})
        if result.deleted_count == 0:
            # Try with _id as string fallback
            result = await db.student_payments.delete_one({"order_id": payment_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Payment record not found")
        
        return {"success": True, "message": "Payment record deleted successfully"}
    
    # It's a student inquiry payment - ID format: stu-{student_id}
    student_id = payment_id.replace("stu-", "")
    
    # Find the student
    student = await db.student_inquiries.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get payments array
    payments = student.get("payments", [])
    
    # Find and remove the payment
    payment_idx = next(
        (i for i, p in enumerate(payments) if p.get("id") == payment_id),
        None
    )
    
    if payment_idx is not None:
        payments.pop(payment_idx)
        
        # Update student record
        await db.student_inquiries.update_one(
            {"id": student_id},
            {"$set": {
                "payments": payments,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {"success": True, "message": "Payment record deleted successfully"}


@router.delete("/orders/school-payments/{payment_id}")
async def delete_school_payment(
    payment_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a school payment record (tranche payment)"""
    # Parse school_id and tranche_index from payment_id
    # Format: sch-{school_id}-t{tranche_index}
    parts = payment_id.split("-t")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid payment ID format")
    
    school_id = parts[0].replace("sch-", "")
    try:
        tranche_index = int(parts[1])
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tranche index")
    
    # Find the school
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Get payments array
    payments = school.get("payments", [])
    
    # Find and remove the payment
    payment_idx = next(
        (i for i, p in enumerate(payments) if p.get("id") == payment_id),
        None
    )
    
    if payment_idx is not None:
        payments.pop(payment_idx)
        
        # Update school record
        await db.school_inquiries.update_one(
            {"id": school_id},
            {"$set": {
                "payments": payments,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {"success": True, "message": "Payment record deleted successfully"}


# ========================
# DATA CENTER - UNIFIED DATABASE
# ========================