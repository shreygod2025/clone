"""
AI Foundations Course — Booking & Payment Routes

Direct-online ₹1,999 enrolment. Reuses Cashfree credentials from the
summer-camp module so the same payment gateway handles both products.
"""
import asyncio
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
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
    CashfreeCustomerDetails = None

from .shared import db, get_current_user

router = APIRouter()

CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENVIRONMENT = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX")
CASHFREE_API_VERSION = "2023-08-01"

COURSE_PRICE = 1999.0
COURSE_KEY = "ai_foundations"
COURSE_NAME = "AI Foundations · 10-Day Online Course"

TRACKS = {
    "explorer": {"label": "Explorer Track", "grades": "Grade 6 – 8"},
    "creator": {"label": "Creator Track", "grades": "Grade 9 – 12"},
}

if CASHFREE_AVAILABLE and CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
    Cashfree.XClientId = CASHFREE_APP_ID
    Cashfree.XClientSecret = CASHFREE_SECRET_KEY
    Cashfree.XEnvironment = (
        Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    )


def _cf_client() -> "Cashfree":
    if not CASHFREE_AVAILABLE or not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    cf_env = Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    return Cashfree(cf_env)


async def _next_ref() -> str:
    """Atomic 4-digit booking_ref via the shared `counters` collection."""
    res = await db.counters.find_one_and_update(
        {"_id": "ai_foundations_booking_ref"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = int(res.get("seq", 1)) if res else 1
    return f"AIF-{seq:04d}"


# ── Batches ────────────────────────────────────────────────────────────────
class BatchCreate(BaseModel):
    label: str = Field(..., min_length=2, max_length=120)
    track: Optional[str] = Field(default="", pattern=r"^(explorer|creator)?$")
    days_label: str = Field(default="", max_length=80)   # e.g. "Mon · Wed · Fri"
    days: list[str] = Field(default_factory=list)
    timing: str = Field(default="", max_length=64)        # e.g. "5–6 PM IST"
    start_date: str = Field(default="", max_length=24)
    start_date_label: str = Field(default="", max_length=80)
    capacity: int = Field(default=10, ge=1, le=100)
    is_active: bool = Field(default=True)


class BatchUpdate(BaseModel):
    label: Optional[str] = None
    track: Optional[str] = None
    days_label: Optional[str] = None
    days: Optional[list[str]] = None
    timing: Optional[str] = None
    start_date: Optional[str] = None
    start_date_label: Optional[str] = None
    capacity: Optional[int] = Field(default=None, ge=1, le=100)
    is_active: Optional[bool] = None


@router.get("/ai-foundations/batches")
async def list_batches_public(track: Optional[str] = None, active_only: bool = True):
    """Public — list available batches for the booking form."""
    q: dict = {}
    if active_only:
        q["is_active"] = True
    if track:
        q["$or"] = [{"track": track}, {"track": ""}, {"track": None}]
    batches = await db.ai_foundations_batches.find(q, {"_id": 0}).sort("start_date", 1).to_list(50)
    # Append seats_left per batch
    for b in batches:
        booked = await db.ai_foundations_bookings.count_documents({
            "batch_id": b["id"],
            "payment_status": {"$in": ["paid"]}
        })
        b["seats_left"] = max(0, int(b.get("capacity", 10)) - int(booked))
    return {"batches": batches}


@router.get("/admin/ai-foundations/batches")
async def list_batches_admin(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    batches = await db.ai_foundations_batches.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for b in batches:
        booked = await db.ai_foundations_bookings.count_documents({"batch_id": b["id"]})
        paid = await db.ai_foundations_bookings.count_documents({"batch_id": b["id"], "payment_status": "paid"})
        b["enrolled_total"] = booked
        b["enrolled_paid"] = paid
        b["seats_left"] = max(0, int(b.get("capacity", 10)) - paid)
    return {"batches": batches}


@router.post("/admin/ai-foundations/batches")
async def create_batch(data: BatchCreate, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    doc = data.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.ai_foundations_batches.insert_one(doc)
    return {"success": True, "batch": {k: v for k, v in doc.items() if k != "_id"}}


@router.patch("/admin/ai-foundations/batches/{batch_id}")
async def update_batch(batch_id: str, data: BatchUpdate, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    update = {k: v for k, v in data.dict().items() if v is not None}
    if not update:
        return {"success": True, "updated": 0}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.ai_foundations_batches.update_one({"id": batch_id}, {"$set": update})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Batch not found")
    return {"success": True, "updated": res.modified_count}


@router.delete("/admin/ai-foundations/batches/{batch_id}")
async def delete_batch(batch_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.ai_foundations_batches.delete_one({"id": batch_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Batch not found")
    return {"success": True}


# ── Models ─────────────────────────────────────────────────────────────────
class BookingCreate(BaseModel):
    parent_phone: str = Field(..., min_length=10, max_length=15)
    student_name: str = Field(..., min_length=2, max_length=120)
    student_grade: str = Field(..., min_length=1, max_length=8)  # "6", "7", "10" etc
    track: str = Field(..., pattern=r"^(explorer|creator)$")
    batch_id: Optional[str] = Field(default="", max_length=64)
    # Optional / legacy fields (kept for backwards-compat, not collected on form anymore)
    parent_name: Optional[str] = Field(default="", max_length=120)
    parent_email: Optional[str] = Field(default="", max_length=200)
    school_name: Optional[str] = Field(default="", max_length=200)
    notes: Optional[str] = Field(default="", max_length=500)
    source_ref: Optional[str] = Field(default="", max_length=64)


class PaymentInit(BaseModel):
    booking_id: str
    frontend_url: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.post("/ai-foundations/register")
async def register_booking(data: BookingCreate):
    """Create an AI Foundations booking lead. Always defaults to Cashfree direct."""
    if data.track not in TRACKS:
        raise HTTPException(status_code=400, detail="Invalid track")

    booking_id = str(uuid.uuid4())
    booking_ref = await _next_ref()

    doc = {
        "id": booking_id,
        "booking_ref": booking_ref,
        "course_key": COURSE_KEY,
        "course_name": COURSE_NAME,
        "parent_name": (data.parent_name or "").strip(),
        "parent_phone": data.parent_phone.strip(),
        "parent_email": (data.parent_email or "").lower().strip(),
        "student_name": data.student_name.strip(),
        "student_grade": data.student_grade.strip(),
        "track": data.track,
        "track_label": TRACKS[data.track]["label"],
        "track_grades": TRACKS[data.track]["grades"],
        "batch_id": (data.batch_id or "").strip(),
        "school_name": (data.school_name or "").strip(),
        "notes": (data.notes or "").strip(),
        "source_ref": (data.source_ref or "").strip(),
        "mode": "online",
        "amount": COURSE_PRICE,
        "payment_status": "pending",
        "crm_status": "lead",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ai_foundations_bookings.insert_one(doc)
    logging.info(f"[ai-foundations] lead created {booking_ref} - {data.student_name}")

    return {
        "booking_id": booking_id,
        "booking_ref": booking_ref,
        "amount": COURSE_PRICE,
        "course_name": COURSE_NAME,
        "track_label": TRACKS[data.track]["label"],
    }


@router.post("/ai-foundations/initiate-payment")
async def initiate_payment(data: PaymentInit):
    """Open a Cashfree order and return a hosted payment link."""
    booking = await db.ai_foundations_bookings.find_one({"id": data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Already paid")

    order_id = f"AIF-{booking['id'][:8]}-{int(time.time())}"
    frontend_url = data.frontend_url or os.getenv("FRONTEND_URL", "https://oll.co")

    cf_name = (booking.get("parent_name") or "").strip() or "OLL Parent"
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
            return_url=f"{frontend_url}/ai-foundations/success?order_id={order_id}&booking_id={booking['id']}",
            notify_url=f"{frontend_url}/api/ai-foundations/webhook",
        )
        req = CreateOrderRequest(
            order_id=order_id,
            order_amount=COURSE_PRICE,
            order_currency="INR",
            customer_details=customer,
            order_meta=order_meta,
            order_note=f"{COURSE_NAME} — {booking.get('track_label','')} — {booking.get('student_name','')}",
        )
        api_response = await asyncio.to_thread(
            _cf_client().PGCreateOrder, CASHFREE_API_VERSION, req, None, None
        )
        if not api_response.data:
            raise HTTPException(status_code=500, detail="Payment gateway error")

        payment_session_id = api_response.data.payment_session_id
        payment_link = f"https://payments.cashfree.com/forms/{payment_session_id}"

        await db.ai_foundations_bookings.update_one(
            {"id": booking["id"]},
            {"$set": {
                "order_id": order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "payment_session_id": payment_session_id,
                "payment_link": payment_link,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {
            "order_id": order_id,
            "payment_session_id": payment_session_id,
            "payment_link": payment_link,
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[ai-foundations] payment init failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Payment initiation failed: {e}")


@router.get("/ai-foundations/verify/{booking_id}")
async def verify_payment(booking_id: str):
    booking = await db.ai_foundations_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.get("crm_status") == "converted":
        return {"status": "PAID", "booking": booking}

    order_id = booking.get("order_id")
    if not order_id:
        return {"status": "pending", "booking": booking}

    try:
        resp = await asyncio.to_thread(
            _cf_client().PGFetchOrder, CASHFREE_API_VERSION, order_id, None
        )
        if resp.data:
            order_status = resp.data.order_status
            if order_status == "PAID" and booking.get("crm_status") != "converted":
                update = {
                    "payment_status": "paid",
                    "crm_status": "converted",
                    "amount_paid": COURSE_PRICE,
                    "amount_due": 0,
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.ai_foundations_bookings.update_one({"id": booking_id}, {"$set": update})
                booking.update(update)

                # Fire welcome email + WhatsApp (best-effort, never block verify)
                try:
                    from .notifications import send_whatsapp_notification
                    first_name = (booking.get("student_name") or "").split()[0] or "there"
                    await send_whatsapp_notification(
                        phone=booking.get("parent_phone", ""),
                        template_key="aifoundations_enrolled",
                        params=[first_name, booking.get("track_label", ""), booking.get("booking_ref", "")],
                        user_name=first_name,
                    )
                except Exception as wa_err:
                    logging.info(f"[ai-foundations] WA enrol skipped: {wa_err}")
            return {"status": order_status, "booking": booking}
    except Exception as e:
        logging.warning(f"[ai-foundations] verify error: {e}")
    return {"status": booking.get("payment_status", "pending"), "booking": booking}


@router.post("/ai-foundations/webhook")
async def cashfree_webhook(request: Request):
    try:
        payload = await request.json()
        order = payload.get("data", {}).get("order", {})
        order_id = order.get("order_id")
        order_status = order.get("order_status")
        if not order_id:
            return {"status": "ignored"}
        if order_status == "PAID":
            booking = await db.ai_foundations_bookings.find_one({"order_id": order_id}, {"_id": 0})
            if booking and booking.get("crm_status") != "converted":
                await db.ai_foundations_bookings.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "crm_status": "converted",
                        "amount_paid": COURSE_PRICE,
                        "amount_due": 0,
                        "paid_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
        return {"status": "ok"}
    except Exception as e:
        logging.warning(f"[ai-foundations] webhook err: {e}")
        return {"status": "error"}


# ── Admin CRM endpoints ───────────────────────────────────────────────────
def _is_admin(user: dict) -> bool:
    role = (user or {}).get("role", "")
    email = (user or {}).get("email", "")
    return role in ("admin", "super_admin") or email.endswith("@oll.co")


@router.get("/admin/ai-foundations/bookings")
async def admin_list_bookings(
    status: Optional[str] = Query(None, description="lead|converted|all"),
    track: Optional[str] = Query(None, description="explorer|creator"),
    q: Optional[str] = Query(None, description="search name/phone/email/ref"),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    query: dict = {}
    if status and status != "all":
        if status == "converted":
            query["crm_status"] = "converted"
        elif status == "lead":
            query["crm_status"] = {"$ne": "converted"}
    if track in TRACKS:
        query["track"] = track
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [
            {"booking_ref": rx},
            {"student_name": rx},
            {"parent_name": rx},
            {"parent_phone": rx},
            {"parent_email": rx},
            {"school_name": rx},
        ]

    cursor = db.ai_foundations_bookings.find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    rows = [r async for r in cursor]

    total = await db.ai_foundations_bookings.count_documents({})
    converted = await db.ai_foundations_bookings.count_documents({"crm_status": "converted"})
    leads = total - converted
    revenue = converted * COURSE_PRICE

    return {
        "bookings": rows,
        "stats": {
            "total": total,
            "leads": leads,
            "converted": converted,
            "revenue": revenue,
            "conversion_rate": round((converted / total) * 100, 1) if total else 0,
        },
    }


class StatusUpdate(BaseModel):
    crm_status: Optional[str] = None
    notes: Optional[str] = None


@router.patch("/admin/ai-foundations/bookings/{booking_id}")
async def admin_update_booking(
    booking_id: str,
    body: StatusUpdate,
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    update: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.crm_status:
        update["crm_status"] = body.crm_status
    if body.notes is not None:
        update["notes"] = body.notes
    if len(update) == 1:
        raise HTTPException(status_code=400, detail="Nothing to update")

    res = await db.ai_foundations_bookings.update_one({"id": booking_id}, {"$set": update})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking = await db.ai_foundations_bookings.find_one({"id": booking_id}, {"_id": 0})
    return {"booking": booking}
