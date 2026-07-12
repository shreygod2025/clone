"""
52 Weeks Skills — Discover payment page (`/discover`).

Direct-online enrolment: monthly (₹3,000) or annual (₹30,000 = ₹2,500 × 12).
Records land in `student_inquiries` so they show up in the Student CRM.
"""
import asyncio
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

try:
    from cashfree_pg.api_client import Cashfree
    from cashfree_pg.models.create_order_request import CreateOrderRequest
    from cashfree_pg.models.customer_details import CustomerDetails as CashfreeCustomerDetails
    from cashfree_pg.models.order_meta import OrderMeta
    CASHFREE_AVAILABLE = True
except ImportError:
    CASHFREE_AVAILABLE = False
    Cashfree = None

from .shared import db

router = APIRouter()

CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENVIRONMENT = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX")
CASHFREE_API_VERSION = "2023-08-01"

PLANS = {
    "monthly": {"amount": 3000.0, "label": "Monthly", "billing": "₹3,000 / month"},
    "annual":  {"amount": 30000.0, "label": "Annual",  "billing": "₹2,500 / month × 12 · ₹30,000 up-front"},
}
PROGRAM_KEY = "52_weeks_skills"
PROGRAM_NAME = "52 Weeks Skills"

if CASHFREE_AVAILABLE and CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
    Cashfree.XClientId = CASHFREE_APP_ID
    Cashfree.XClientSecret = CASHFREE_SECRET_KEY
    Cashfree.XEnvironment = (
        Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    )


def _cf_client():
    if not CASHFREE_AVAILABLE or not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    cf_env = Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    return Cashfree(cf_env)


class DiscoverBooking(BaseModel):
    student_name: str = Field(..., min_length=2, max_length=120)
    parent_phone: str = Field(..., min_length=10, max_length=20)
    parent_email: Optional[EmailStr] = None
    parent_name: Optional[str] = Field(default="", max_length=120)
    plan: str = Field(..., pattern=r"^(monthly|annual)$")


class DiscoverPaymentInit(BaseModel):
    booking_id: str
    frontend_url: Optional[str] = None


@router.post("/discover/create-booking")
async def create_booking(data: DiscoverBooking):
    # Phone is now the primary identifier. Basic 10-digit sanity check.
    digits = re.sub(r"\D", "", data.parent_phone or "")
    if len(digits) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit phone number")

    plan = PLANS[data.plan]
    booking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Email is optional now — synthesise a placeholder Cashfree can accept.
    email = (data.parent_email or "").strip().lower() if data.parent_email else ""
    if not email:
        last10 = digits[-10:]
        email = f"discover+{last10}@oll.co"

    doc = {
        "id": booking_id,
        "name": data.student_name.strip(),
        "student_name": data.student_name.strip(),
        "email": email,
        "parent_email": email,
        "parent_name": (data.parent_name or "").strip(),
        "phone": data.parent_phone.strip(),
        "parent_phone": data.parent_phone.strip(),
        # Fields required by the StudentInquiry response model
        "learner_type": "individual",
        "age_group": "8-14",
        "skill": PROGRAM_NAME,
        "learning_mode": "online",
        "city": "",
        "learning_goal": "52 Weeks Skills discovery",
        "programs_interested": [PROGRAM_NAME],
        "program": PROGRAM_KEY,
        "program_name": PROGRAM_NAME,
        "plan": data.plan,
        "plan_label": plan["label"],
        "amount": plan["amount"],
        "amount_paid": 0.0,
        "payment_status": "pending",
        "status": "new",
        "source": "discover_landing",
        "source_ref": "oll.co/discover",
        "created_at": now,
        "updated_at": now,
    }
    await db.student_inquiries.insert_one(doc)
    logging.info("[discover] lead created %s %s plan=%s", booking_id[:8], data.student_name, data.plan)
    return {"booking_id": booking_id, "amount": plan["amount"], "plan": data.plan, "plan_label": plan["label"]}


@router.post("/discover/initiate-payment")
async def initiate_payment(data: DiscoverPaymentInit):
    booking = await db.student_inquiries.find_one({"id": data.booking_id, "program": PROGRAM_KEY}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Already paid")

    plan = PLANS.get(booking.get("plan", "monthly"), PLANS["monthly"])
    order_id = f"DISC-{booking['id'][:8]}-{int(time.time())}"
    frontend_url = (data.frontend_url or os.getenv("FRONTEND_URL", "https://oll.co")).rstrip("/")

    cf_name = (booking.get("parent_name") or booking.get("student_name") or "OLL Parent").strip()
    if len(cf_name.replace(" ", "")) < 3:
        cf_name = "OLL Parent"
    raw_phone = booking.get("parent_phone") or "9999999999"
    cf_phone = re.sub(r"\D", "", raw_phone)
    if len(cf_phone) > 10:
        cf_phone = cf_phone[-10:]
    if len(cf_phone) < 10:
        cf_phone = "9999999999"

    try:
        customer = CashfreeCustomerDetails(
            customer_id=booking["id"][:50],
            customer_name=cf_name,
            customer_email=booking.get("parent_email") or f"{booking['id'][:8]}@oll.co",
            customer_phone=cf_phone,
        )
        order_meta = OrderMeta(
            return_url=f"{frontend_url}/discover/success?order_id={order_id}&booking_id={booking['id']}",
            notify_url=f"{frontend_url}/api/discover/webhook",
        )
        req = CreateOrderRequest(
            order_id=order_id,
            order_amount=plan["amount"],
            order_currency="INR",
            customer_details=customer,
            order_meta=order_meta,
            order_note=f"{PROGRAM_NAME} — {plan['label']} — {booking.get('student_name','')}",
        )
        api_response = await asyncio.to_thread(
            _cf_client().PGCreateOrder, CASHFREE_API_VERSION, req, None, None
        )
        if not api_response.data:
            raise HTTPException(status_code=500, detail="Payment gateway error")
        payment_session_id = api_response.data.payment_session_id

        await db.student_inquiries.update_one(
            {"id": booking["id"]},
            {"$set": {
                "cashfree_order_id": order_id,
                "cashfree_payment_session_id": payment_session_id,
                "payment_status": "initiated",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {
            "success": True,
            "order_id": order_id,
            "payment_session_id": payment_session_id,
            "environment": "production" if CASHFREE_ENVIRONMENT == "PRODUCTION" else "sandbox",
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("[discover] cashfree error: %s", e)
        raise HTTPException(status_code=500, detail=f"Payment gateway error: {e}")


@router.post("/discover/webhook")
async def webhook(request: Request):
    payload = await request.json()
    data = payload.get("data", {}) or {}
    order = data.get("order", {}) or {}
    payment = data.get("payment", {}) or {}
    order_id = order.get("order_id")
    if not order_id:
        return {"ok": False, "reason": "no order_id"}

    booking = await db.student_inquiries.find_one({"cashfree_order_id": order_id}, {"_id": 0, "id": 1, "amount": 1})
    if not booking:
        return {"ok": False, "reason": "booking not found"}

    status = (payment.get("payment_status") or "").upper()
    if status == "SUCCESS":
        await db.student_inquiries.update_one(
            {"id": booking["id"]},
            {"$set": {
                "payment_status": "paid",
                "status": "converted",
                "amount_paid": payment.get("payment_amount") or booking.get("amount") or 0.0,
                "cashfree_payment_id": payment.get("cf_payment_id"),
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
    elif status in ("FAILED", "USER_DROPPED"):
        await db.student_inquiries.update_one(
            {"id": booking["id"]},
            {"$set": {"payment_status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
    return {"ok": True}


@router.get("/discover/verify/{order_id}")
async def verify_payment(order_id: str):
    booking = await db.student_inquiries.find_one({"cashfree_order_id": order_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.get("payment_status") == "paid":
        return {"payment_status": "paid", "student_name": booking.get("student_name"),
                "amount": booking.get("amount_paid") or booking.get("amount"), "plan_label": booking.get("plan_label")}

    try:
        resp = await asyncio.to_thread(_cf_client().PGFetchOrder, CASHFREE_API_VERSION, order_id, None, None)
        cf_status = (resp.data.order_status or "").upper() if resp and resp.data else ""
        if cf_status == "PAID":
            await db.student_inquiries.update_one(
                {"id": booking["id"]},
                {"$set": {
                    "payment_status": "paid",
                    "status": "converted",
                    "amount_paid": booking.get("amount"),
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            return {"payment_status": "paid", "student_name": booking.get("student_name"),
                    "amount": booking.get("amount"), "plan_label": booking.get("plan_label")}
        return {"payment_status": booking.get("payment_status", "pending"), "student_name": booking.get("student_name"),
                "amount": booking.get("amount"), "plan_label": booking.get("plan_label")}
    except Exception as e:
        logging.warning("[discover] verify fallback failed: %s", e)
        return {"payment_status": booking.get("payment_status", "pending"), "student_name": booking.get("student_name"),
                "amount": booking.get("amount"), "plan_label": booking.get("plan_label")}
