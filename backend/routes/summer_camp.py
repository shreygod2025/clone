"""
Summer Camp 2026 — Booking & Payment Routes
"""
import os
import uuid
import time
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

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

from .shared import db, get_current_user

router = APIRouter()

CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENVIRONMENT = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX")
CASHFREE_API_VERSION = "2023-08-01"
CAMP_PRICE = 1999.0

if CASHFREE_AVAILABLE and CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
    Cashfree.XClientId = CASHFREE_APP_ID
    Cashfree.XClientSecret = CASHFREE_SECRET_KEY
    if CASHFREE_ENVIRONMENT == "PRODUCTION":
        Cashfree.XEnvironment = Cashfree.PRODUCTION
    else:
        Cashfree.XEnvironment = Cashfree.SANDBOX

def get_cf_client():
    if not CASHFREE_AVAILABLE or not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    cf_env = Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    return Cashfree(cf_env)

AGE_GROUPS = {
    "explorers": {"label": "Little Explorers", "ages": "4-8"},
    "creators": {"label": "Tech Creators", "ages": "9-12"},
    "innovators": {"label": "Future Innovators", "ages": "13-16"},
}

CENTERS = {
    "mira_road": "Mira Road, Mumbai",
    "dombivli": "Dombivli – Pallava, Mumbai",
    "andheri": "Andheri West – Lokhandwala, Mumbai",
    "online": "Online",
}

BATCH_DATES = {
    "week1": {"weekday": "May 1-5, 2026 (Mon-Fri)", "weekend": "May 2-3, 2026 (Sat-Sun)"},
    "week2": {"weekday": "May 8-12, 2026 (Mon-Fri)", "weekend": "May 9-10, 2026 (Sat-Sun)"},
    "week3": {"weekday": "May 15-19, 2026 (Mon-Fri)", "weekend": "May 16-17, 2026 (Sat-Sun)"},
    "week4": {"weekday": "May 22-26, 2026 (Mon-Fri)", "weekend": "May 23-24 & 30-31, 2026 (Sat-Sun)"},
}


class SummerCampRegistration(BaseModel):
    child_name: str
    parent_name: str
    parent_phone: str
    parent_email: str
    age_group: str  # explorers | creators | innovators
    batch_type: str  # weekday | weekend
    batch_week: str  # week1 | week2 | week3 | week4
    mode: str       # offline | online
    center: str     # mira_road | dombivli | andheri | online
    payment_mode: str  # cashfree | cash


class PaymentInitRequest(BaseModel):
    booking_id: str


@router.post("/summer-camp/register")
async def register_summer_camp(data: SummerCampRegistration):
    """Register a summer camp booking — creates a lead record."""
    if data.age_group not in AGE_GROUPS:
        raise HTTPException(status_code=400, detail="Invalid age group")
    if data.batch_type not in ("weekday", "weekend"):
        raise HTTPException(status_code=400, detail="Invalid batch type")
    if data.batch_week not in BATCH_DATES:
        raise HTTPException(status_code=400, detail="Invalid batch week")
    if data.mode not in ("offline", "online"):
        raise HTTPException(status_code=400, detail="Invalid mode")

    # Generate short booking ref
    ref_num = str(int(time.time()))[-6:]
    booking_ref = f"SC2026-{ref_num}"
    booking_id = str(uuid.uuid4())

    batch_dates = BATCH_DATES[data.batch_week][data.batch_type]

    doc = {
        "id": booking_id,
        "booking_ref": booking_ref,
        "child_name": data.child_name,
        "parent_name": data.parent_name,
        "parent_phone": data.parent_phone,
        "parent_email": data.parent_email,
        "age_group": data.age_group,
        "age_group_label": AGE_GROUPS[data.age_group]["label"],
        "age_group_ages": AGE_GROUPS[data.age_group]["ages"],
        "batch_type": data.batch_type,
        "batch_week": data.batch_week,
        "batch_dates": batch_dates,
        "mode": data.mode,
        "center": data.center,
        "center_label": CENTERS.get(data.center, data.center),
        "payment_mode": data.payment_mode,
        "amount": CAMP_PRICE,
        "payment_status": "pending",
        "crm_status": "lead",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.summer_camp_bookings.insert_one(doc)
    logging.info(f"Summer camp lead created: {booking_ref} - {data.child_name}")

    return {
        "booking_id": booking_id,
        "booking_ref": booking_ref,
        "payment_mode": data.payment_mode,
        "amount": CAMP_PRICE,
        "center_label": CENTERS.get(data.center, data.center),
        "batch_dates": batch_dates,
        "message": "Registration successful",
    }


@router.post("/summer-camp/initiate-payment")
async def initiate_payment(data: PaymentInitRequest):
    """Create a Cashfree payment order for a summer camp booking."""
    booking = await db.summer_camp_bookings.find_one({"id": data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Already paid")

    order_id = f"SC2026-{booking['id'][:8]}-{int(time.time())}"
    frontend_url = os.getenv("FRONTEND_URL", "https://camp-cashfree-flow.preview.emergentagent.com")

    parent_name = booking.get("parent_name", "Parent")
    cf_name = parent_name if len(parent_name) >= 3 else parent_name.ljust(3)

    try:
        customer = CashfreeCustomerDetails(
            customer_id=booking["id"][:50],
            customer_name=cf_name,
            customer_email=booking.get("parent_email") or f"{booking['id'][:8]}@oll.co",
            customer_phone=booking.get("parent_phone") or "9999999999",
        )
        order_meta = OrderMeta(
            return_url=f"{frontend_url}/summer-camp/success?order_id={order_id}&booking_id={booking['id']}",
            notify_url=f"{frontend_url}/api/summer-camp/webhook",
        )
        create_order_request = CreateOrderRequest(
            order_amount=CAMP_PRICE,
            order_currency="INR",
            customer_details=customer,
            order_meta=order_meta,
            order_note=f"Future Skills Summer Camp 2026 - {booking.get('age_group_label', '')} - {booking.get('child_name', '')}",
        )
        cf = get_cf_client()
        api_response = await asyncio.to_thread(cf.PGCreateOrder, CASHFREE_API_VERSION, create_order_request, None, None)

        if not api_response.data:
            raise HTTPException(status_code=500, detail="Payment gateway error")

        payment_session_id = api_response.data.payment_session_id
        payment_link = f"https://payments.cashfree.com/forms/{payment_session_id}"

        await db.summer_camp_bookings.update_one(
            {"id": booking["id"]},
            {"$set": {
                "order_id": order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "payment_session_id": payment_session_id,
                "payment_link": payment_link,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

        return {
            "order_id": order_id,
            "payment_session_id": payment_session_id,
            "payment_link": payment_link,
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Summer camp payment initiation error: {e}")
        raise HTTPException(status_code=500, detail="Payment initiation failed")


@router.get("/summer-camp/verify/{booking_id}")
async def verify_payment(booking_id: str):
    """Check payment status for a booking."""
    booking = await db.summer_camp_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    order_id = booking.get("order_id")
    if not order_id:
        return {"status": "pending", "booking": booking}

    try:
        cf = get_cf_client()
        resp = await asyncio.to_thread(cf.PGFetchOrder, CASHFREE_API_VERSION, order_id, None)
        if resp.data:
            new_status = resp.data.order_status
            if new_status == "PAID":
                await db.summer_camp_bookings.update_one(
                    {"id": booking_id},
                    {"$set": {
                        "payment_status": "paid",
                        "crm_status": "converted",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                booking["payment_status"] = "paid"
                booking["crm_status"] = "converted"
            return {"status": new_status, "booking": booking}
    except Exception as e:
        logging.warning(f"Summer camp verify error: {e}")

    return {"status": booking.get("payment_status", "pending"), "booking": booking}


@router.post("/summer-camp/webhook")
async def summer_camp_webhook(request: Request):
    """Cashfree webhook for summer camp payments."""
    try:
        payload = await request.json()
        order_data = payload.get("data", {}).get("order", {})
        order_id = order_data.get("order_id")
        order_status = order_data.get("order_status")

        if not order_id:
            return {"status": "ignored"}

        if order_status == "PAID":
            booking = await db.summer_camp_bookings.find_one({"order_id": order_id}, {"_id": 0})
            if booking:
                await db.summer_camp_bookings.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "crm_status": "converted",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                logging.info(f"Summer camp payment confirmed via webhook: {order_id}")

        return {"status": "ok"}
    except Exception as e:
        logging.error(f"Summer camp webhook error: {e}")
        return {"status": "error"}


@router.get("/summer-camp/bookings")
async def get_summer_camp_bookings(
    crm_status: Optional[str] = None,
    age_group: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Admin: list all summer camp bookings."""
    query = {}
    if crm_status:
        query["crm_status"] = crm_status
    if age_group:
        query["age_group"] = age_group

    bookings = await db.summer_camp_bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return bookings


@router.get("/summer-camp/stats")
async def get_summer_camp_stats(user: dict = Depends(get_current_user)):
    """Admin stats for summer camp."""
    total = await db.summer_camp_bookings.count_documents({})
    converted = await db.summer_camp_bookings.count_documents({"crm_status": "converted"})
    leads = await db.summer_camp_bookings.count_documents({"crm_status": "lead"})
    return {"total": total, "converted": converted, "leads": leads}
