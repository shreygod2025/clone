"""
Social Media Internship Readiness Program — Backend Routes
Captures leads (phone -> details -> payment) for the 1-month program and
provides admin CRM endpoints.
"""
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

try:
    from cashfree_pg.api_client import Cashfree
    from cashfree_pg.models.create_order_request import CreateOrderRequest
    from cashfree_pg.models.customer_details import CustomerDetails as CashfreeCustomerDetails
    from cashfree_pg.models.order_meta import OrderMeta
except ImportError:
    Cashfree = None

from .notifications import send_whatsapp_notification
from .shared import db, get_current_user

router = APIRouter()

# ── Constants ──────────────────────────────────────────────────────────────
PROGRAM_PRICE = 19900.0
SEAT_DEPOSIT = 2000.0
COLLECTION = "social_media_intern_registrations"

CASHFREE_APP_ID = os.environ.get("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.environ.get("CASHFREE_SECRET_KEY", "")
CASHFREE_ENV = os.environ.get("CASHFREE_ENV", "production")


# ── Sequential booking_ref ────────────────────────────────────────────────
async def _next_ref() -> str:
    count = await db[COLLECTION].count_documents({})
    return f"SMI-{str(count + 1).zfill(4)}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_phone(phone: str) -> str:
    digits = re.sub(r"[^\d]", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits


# ── Models ────────────────────────────────────────────────────────────────
class CaptureLeadRequest(BaseModel):
    phone: str
    source_ref: Optional[str] = None


class RegisterRequest(BaseModel):
    lead_id: Optional[str] = None
    phone: str
    student_name: str
    email: Optional[str] = ""
    school_name: Optional[str] = ""
    age: Optional[str] = ""
    grade: Optional[str] = ""
    mode: str = "offline"  # offline | online
    has_social_media: Optional[str] = "no"  # yes | no
    instagram_link: Optional[str] = ""
    youtube_link: Optional[str] = ""
    payment_mode: str = "full"  # full | seat_reserve
    parent_name: Optional[str] = ""


class PaymentInitRequest(BaseModel):
    lead_id: str
    frontend_url: str = "https://oll.co"
    amount: Optional[float] = None


class FollowupStatusRequest(BaseModel):
    followup_status: str
    callback_date: Optional[str] = None


class CommentRequest(BaseModel):
    text: str
    author: str = "Admin"
    comment_type: str = "comment"


class CrmStatusRequest(BaseModel):
    crm_status: str
    lost_reason: Optional[str] = None


# ── WhatsApp confirmation ─────────────────────────────────────────────────
async def _send_confirmation_wa(lead: dict):
    phone = lead.get("phone", "")
    if not phone or len(phone) < 10:
        return
    first_name = (lead.get("student_name") or "there").split()[0]
    mode = (lead.get("mode") or "offline").capitalize()
    ref = lead.get("booking_ref", "—")
    is_deposit = lead.get("payment_mode") == "seat_reserve"
    template = "social_media_intern_seat_reserved" if is_deposit else "social_media_intern_confirmation"
    try:
        await send_whatsapp_notification(
            phone=phone,
            template_key=template,
            params=[first_name, mode, ref],
            user_name=first_name,
        )
    except Exception as e:
        print(f"[SMI WA] Failed: {e}")


# ── Routes ────────────────────────────────────────────────────────────────
@router.post("/social-media-intern/capture-lead")
async def capture_lead(data: CaptureLeadRequest):
    """Step 1 — capture phone number only."""
    phone = _clean_phone(data.phone)
    if len(phone) < 10:
        raise HTTPException(400, "Invalid phone number")

    existing = await db[COLLECTION].find_one({"phone": phone}, {"_id": 0})
    if existing:
        return {
            "lead_id": existing["id"],
            "booking_ref": existing.get("booking_ref"),
            "existing": True,
            "crm_status": existing.get("crm_status"),
        }

    lead_id = str(uuid.uuid4())
    ref = await _next_ref()
    doc = {
        "id": lead_id,
        "booking_ref": ref,
        "phone": phone,
        "crm_status": "phone_captured",
        "payment_status": "pending",
        "source_ref": data.source_ref,
        "program": "social_media_intern",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db[COLLECTION].insert_one(doc)
    return {"lead_id": lead_id, "booking_ref": ref, "existing": False}


@router.post("/social-media-intern/register")
async def register(data: RegisterRequest):
    """Step 2 — save full form details, promote lead to 'lead' status."""
    phone = _clean_phone(data.phone)
    if len(phone) < 10:
        raise HTTPException(400, "Invalid phone number")

    existing = await db[COLLECTION].find_one({"phone": phone}, {"_id": 0})

    if existing and existing.get("crm_status") in ("converted", "seat_reserved"):
        return {
            "lead_id": existing["id"],
            "booking_ref": existing.get("booking_ref"),
            "status": "already_registered",
            "crm_status": existing["crm_status"],
        }

    update_fields = {
        "student_name": data.student_name,
        "email": data.email,
        "parent_name": data.parent_name,
        "school_name": data.school_name,
        "age": data.age,
        "grade": data.grade,
        "mode": data.mode,
        "has_social_media": data.has_social_media,
        "instagram_link": data.instagram_link,
        "youtube_link": data.youtube_link,
        "payment_mode": data.payment_mode,
        "crm_status": "lead",
        "updated_at": _now_iso(),
    }

    if existing:
        lead_id = existing["id"]
        await db[COLLECTION].update_one({"id": lead_id}, {"$set": update_fields})
        ref = existing.get("booking_ref")
    else:
        lead_id = str(uuid.uuid4())
        ref = await _next_ref()
        doc = {
            "id": lead_id,
            "booking_ref": ref,
            "phone": phone,
            "payment_status": "pending",
            "program": "social_media_intern",
            "created_at": _now_iso(),
            **update_fields,
        }
        await db[COLLECTION].insert_one(doc)

    return {"lead_id": lead_id, "booking_ref": ref, "status": "registered"}


@router.post("/social-media-intern/initiate-payment")
async def initiate_payment(data: PaymentInitRequest):
    lead = await db[COLLECTION].find_one({"id": data.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Registration not found")

    if not Cashfree:
        raise HTTPException(503, "Payment gateway unavailable")

    Cashfree.XClientId = CASHFREE_APP_ID
    Cashfree.XClientSecret = CASHFREE_SECRET_KEY
    Cashfree.XEnvironment = Cashfree.PRODUCTION if CASHFREE_ENV == "production" else Cashfree.SANDBOX

    effective_amount = data.amount if data.amount and data.amount > 0 else (
        SEAT_DEPOSIT if lead.get("payment_mode") == "seat_reserve" else PROGRAM_PRICE
    )

    order_id = f"SMI-{lead['id'][:8]}-{int(time.time())}"
    frontend_url = data.frontend_url or "https://oll.co"

    phone = lead.get("phone", "9999999999")
    email = lead.get("email") or f"{phone}@placeholder.oll.co"

    customer = CashfreeCustomerDetails(
        customer_id=f"smi_{lead['id'][:12]}",
        customer_phone=phone,
        customer_name=lead.get("student_name", "Student"),
        customer_email=email,
    )
    order_meta = OrderMeta(
        return_url=f"{frontend_url}/social-media-intern/success?lead_id={lead['id']}",
        notify_url=f"{os.environ.get('BACKEND_URL', 'https://oll.co')}/api/social-media-intern/webhook",
    )
    create_order = CreateOrderRequest(
        order_id=order_id,
        order_amount=effective_amount,
        order_currency="INR",
        customer_details=customer,
        order_meta=order_meta,
        order_note=f"Social Media Internship Program - {lead.get('student_name', '')}",
    )

    try:
        resp = Cashfree().PGCreateOrder("2023-08-01", create_order)
        session_id = resp.data.payment_session_id
        await db[COLLECTION].update_one(
            {"id": data.lead_id},
            {"$set": {
                "order_id": order_id,
                "order_amount": effective_amount,
                "updated_at": _now_iso(),
            }},
        )
        return {"order_id": order_id, "payment_session_id": session_id, "amount": effective_amount}
    except Exception as e:
        raise HTTPException(500, f"Payment initiation failed: {str(e)}")


@router.get("/social-media-intern/verify/{lead_id}")
async def verify_payment(lead_id: str, background_tasks: BackgroundTasks):
    lead = await db[COLLECTION].find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Registration not found")

    if lead.get("crm_status") in ("converted", "seat_reserved"):
        return {"status": "PAID", "lead": lead}

    order_id = lead.get("order_id")
    if not order_id or not Cashfree:
        return {"status": "PENDING", "lead": lead}

    try:
        Cashfree.XClientId = CASHFREE_APP_ID
        Cashfree.XClientSecret = CASHFREE_SECRET_KEY
        Cashfree.XEnvironment = Cashfree.PRODUCTION if CASHFREE_ENV == "production" else Cashfree.SANDBOX
        resp = Cashfree().PGFetchOrder("2023-08-01", order_id)
        status = resp.data.order_status
    except Exception:
        return {"status": "PENDING", "lead": lead}

    if status == "PAID" and lead.get("crm_status") not in ("converted", "seat_reserved"):
        is_deposit = lead.get("payment_mode") == "seat_reserve"
        new_crm = "seat_reserved" if is_deposit else "converted"
        pay_status = "partial" if is_deposit else "paid"
        update = {
            "payment_status": pay_status,
            "crm_status": new_crm,
            "amount_paid": SEAT_DEPOSIT if is_deposit else PROGRAM_PRICE,
            "amount_due": (PROGRAM_PRICE - SEAT_DEPOSIT) if is_deposit else 0,
            "paid_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db[COLLECTION].update_one({"id": lead_id}, {"$set": update})
        lead.update(update)
        background_tasks.add_task(_send_confirmation_wa, lead)

    return {"status": status, "lead": lead}


@router.post("/social-media-intern/webhook")
async def webhook(request_body: dict, background_tasks: BackgroundTasks):
    order_id = request_body.get("data", {}).get("order", {}).get("order_id", "")
    order_status = request_body.get("data", {}).get("order", {}).get("order_status", "")

    if order_status == "PAID" and order_id:
        lead = await db[COLLECTION].find_one({"order_id": order_id}, {"_id": 0})
        if lead and lead.get("crm_status") not in ("converted", "seat_reserved"):
            is_deposit = lead.get("payment_mode") == "seat_reserve"
            update = {
                "payment_status": "partial" if is_deposit else "paid",
                "crm_status": "seat_reserved" if is_deposit else "converted",
                "amount_paid": SEAT_DEPOSIT if is_deposit else PROGRAM_PRICE,
                "amount_due": (PROGRAM_PRICE - SEAT_DEPOSIT) if is_deposit else 0,
                "paid_at": _now_iso(),
                "updated_at": _now_iso(),
            }
            await db[COLLECTION].update_one({"order_id": order_id}, {"$set": update})
            background_tasks.add_task(_send_confirmation_wa, {**lead, **update})
    return {"success": True}


# ── Admin CRM endpoints ───────────────────────────────────────────────────
@router.get("/social-media-intern/crm")
async def get_crm(
    limit: int = 500,
    search: Optional[str] = None,
    crm_status: Optional[str] = None,
    _user: dict = Depends(get_current_user),
):
    q: dict = {}
    if crm_status and crm_status != "all":
        q["crm_status"] = crm_status
    if search:
        q["$or"] = [
            {"student_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"school_name": {"$regex": search, "$options": "i"}},
            {"booking_ref": {"$regex": search, "$options": "i"}},
        ]
    leads = await db[COLLECTION].find(q, {"_id": 0}).sort("created_at", -1).to_list(length=limit)
    total = await db[COLLECTION].count_documents({})

    # KPIs
    paid = await db[COLLECTION].count_documents({"crm_status": "converted"})
    reserved = await db[COLLECTION].count_documents({"crm_status": "seat_reserved"})
    phone_captured = await db[COLLECTION].count_documents({"crm_status": "phone_captured"})
    lead_status = await db[COLLECTION].count_documents({"crm_status": "lead"})
    lost = await db[COLLECTION].count_documents({"crm_status": "lost"})

    total_revenue = 0
    for lead in leads:
        total_revenue += lead.get("amount_paid", 0) or 0

    return {
        "leads": leads,
        "total": total,
        "kpis": {
            "total": total,
            "phone_captured": phone_captured,
            "lead": lead_status,
            "converted": paid,
            "seat_reserved": reserved,
            "lost": lost,
            "revenue": total_revenue,
        },
    }


@router.patch("/social-media-intern/{lead_id}/followup-status")
async def update_followup(lead_id: str, data: FollowupStatusRequest, _user: dict = Depends(get_current_user)):
    update = {"followup_status": data.followup_status, "updated_at": _now_iso()}
    if data.callback_date:
        update["callback_date"] = data.callback_date
    await db[COLLECTION].update_one({"id": lead_id}, {"$set": update})
    return {"success": True}


@router.post("/social-media-intern/{lead_id}/comment")
async def add_comment(lead_id: str, data: CommentRequest, _user: dict = Depends(get_current_user)):
    comment = {
        "id": str(uuid.uuid4()),
        "text": data.text,
        "author": data.author,
        "comment_type": data.comment_type,
        "created_at": _now_iso(),
    }
    await db[COLLECTION].update_one({"id": lead_id}, {"$push": {"comments": comment}})
    return comment


@router.patch("/social-media-intern/{lead_id}/crm-status")
async def update_crm_status(lead_id: str, data: CrmStatusRequest, _user: dict = Depends(get_current_user)):
    update = {"crm_status": data.crm_status, "updated_at": _now_iso()}
    if data.lost_reason:
        update["lost_reason"] = data.lost_reason
    await db[COLLECTION].update_one({"id": lead_id}, {"$set": update})
    return {"success": True}


@router.delete("/social-media-intern/{lead_id}")
async def delete_lead(lead_id: str, _user: dict = Depends(get_current_user)):
    result = await db[COLLECTION].delete_one({"id": lead_id})
    return {"success": True, "deleted": result.deleted_count}


@router.get("/social-media-intern/lead/{lead_id}")
async def get_lead_public(lead_id: str):
    """Public endpoint used by success page to show booking details."""
    lead = await db[COLLECTION].find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Registration not found")
    # Strip sensitive fields not needed by UI
    lead.pop("order_id", None)
    return {"lead": lead}
