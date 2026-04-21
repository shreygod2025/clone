"""
Social Media Internship Readiness Program — Backend Routes
"""
import os, time, uuid, re
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel

try:
    from cashfree_pg.models.create_order_request import CreateOrderRequest
    from cashfree_pg.api_client import Cashfree
    from cashfree_pg.models.customer_details import CustomerDetails as CashfreeCustomerDetails
    from cashfree_pg.models.order_meta import OrderMeta
except ImportError:
    Cashfree = None

from .auth import get_current_user
from .notifications import send_whatsapp_notification

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────
PROGRAM_PRICE = 19900.0
SEAT_DEPOSIT  = 2000.0
PROGRAM_SLUG  = "social_media_intern"
COLLECTION    = "social_media_intern_registrations"

CASHFREE_APP_ID    = os.environ.get("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.environ.get("CASHFREE_SECRET_KEY", "")
CASHFREE_ENV       = os.environ.get("CASHFREE_ENV", "production")

# ── DB helper ─────────────────────────────────────────────────────────────────
def _db(request=None):
    from .database import get_db
    return get_db()

async def _get_db():
    import motor.motor_asyncio, os
    from dotenv import load_dotenv
    load_dotenv()
    client = motor.motor_asyncio.AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    return client[os.environ.get("DB_NAME")]

# ── Sequential booking_ref ────────────────────────────────────────────────────
async def _next_ref(db) -> str:
    count = await db[COLLECTION].count_documents({})
    return str(count + 1).zfill(4)

# ── Models ────────────────────────────────────────────────────────────────────
class CaptureLeadRequest(BaseModel):
    phone: str
    source_ref: Optional[str] = None

class RegisterRequest(BaseModel):
    lead_id: Optional[str] = None
    phone: str
    student_name: str
    school_name: Optional[str] = ""
    age: Optional[str] = ""
    mode: str = "offline"  # offline | online
    has_social_media: Optional[str] = "no"  # yes | no
    instagram_link: Optional[str] = ""
    youtube_link: Optional[str] = ""
    payment_mode: str = "cashfree"  # cashfree | seat_reserve

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

# ── WhatsApp notification ─────────────────────────────────────────────────────
async def _send_confirmation_wa(lead: dict):
    phone = lead.get("phone", "")
    name  = lead.get("student_name", "there")
    if not phone or len(phone) < 10:
        return
    try:
        first_name = name.split()[0] if name else "there"
        params = [first_name, lead.get("mode", "offline").capitalize(), lead.get("booking_ref", "—")]
        await send_whatsapp_notification(
            phone_number=phone,
            template_name="social_media_intern_confirmation",
            params=params,
        )
    except Exception as e:
        print(f"[SMI WA] Failed: {e}")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/social-media-intern/capture-lead")
async def capture_lead(data: CaptureLeadRequest):
    """Step 1 — capture phone number only (before full form)."""
    db = await _get_db()
    phone = re.sub(r"[^\d]", "", data.phone)[-10:]
    if len(phone) < 10:
        raise HTTPException(400, "Invalid phone number")

    existing = await db[COLLECTION].find_one({"phone": phone}, {"_id": 0})
    if existing:
        return {"lead_id": existing["id"], "existing": True, "crm_status": existing.get("crm_status")}

    lead_id = str(uuid.uuid4())
    ref     = await _next_ref(db)
    doc = {
        "id": lead_id,
        "booking_ref": ref,
        "phone": phone,
        "crm_status": "phone_captured",
        "payment_status": "pending",
        "source_ref": data.source_ref,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db[COLLECTION].insert_one(doc)
    return {"lead_id": lead_id, "booking_ref": ref}


@router.post("/social-media-intern/register")
async def register(data: RegisterRequest, background_tasks: BackgroundTasks):
    """Step 2-3 — save full form details, initiate payment."""
    db = await _get_db()
    phone = re.sub(r"[^\d]", "", data.phone)[-10:]

    existing = await db[COLLECTION].find_one({"phone": phone}, {"_id": 0})
    if existing and existing.get("crm_status") in ("converted", "seat_reserved"):
        return {"lead_id": existing["id"], "status": "already_registered", "crm_status": existing["crm_status"]}

    if existing and data.lead_id and existing["id"] == data.lead_id:
        lead_id = existing["id"]
        await db[COLLECTION].update_one({"id": lead_id}, {"$set": {
            "student_name": data.student_name,
            "school_name": data.school_name,
            "age": data.age,
            "mode": data.mode,
            "has_social_media": data.has_social_media,
            "instagram_link": data.instagram_link,
            "youtube_link": data.youtube_link,
            "payment_mode": data.payment_mode,
            "crm_status": "lead",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }})
    else:
        lead_id = data.lead_id or str(uuid.uuid4())
        ref = existing["booking_ref"] if existing else await _next_ref(db)
        doc = {
            "id": lead_id,
            "booking_ref": ref,
            "phone": phone,
            "student_name": data.student_name,
            "school_name": data.school_name,
            "age": data.age,
            "mode": data.mode,
            "has_social_media": data.has_social_media,
            "instagram_link": data.instagram_link,
            "youtube_link": data.youtube_link,
            "payment_mode": data.payment_mode,
            "crm_status": "lead",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if existing:
            await db[COLLECTION].update_one({"phone": phone}, {"$set": {k: v for k, v in doc.items() if k not in ("id", "booking_ref", "created_at")}})
        else:
            await db[COLLECTION].insert_one(doc)

    return {"lead_id": lead_id, "status": "registered"}


@router.post("/social-media-intern/initiate-payment")
async def initiate_payment(data: PaymentInitRequest):
    db = await _get_db()
    lead = await db[COLLECTION].find_one({"id": data.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Registration not found")

    if not Cashfree:
        raise HTTPException(503, "Payment gateway unavailable")

    Cashfree.XClientId     = CASHFREE_APP_ID
    Cashfree.XClientSecret = CASHFREE_SECRET_KEY
    Cashfree.XEnvironment  = Cashfree.PRODUCTION if CASHFREE_ENV == "production" else Cashfree.SANDBOX

    effective_amount = data.amount if data.amount and data.amount > 0 else PROGRAM_PRICE
    order_id = f"SMI-{lead['id'][:8]}-{int(time.time())}"
    frontend_url = data.frontend_url or "https://oll.co"

    phone = lead.get("phone", "9999999999")
    customer = CashfreeCustomerDetails(
        customer_id=f"smi_{lead['id'][:12]}",
        customer_phone=phone,
        customer_name=lead.get("student_name", "Student"),
        customer_email=lead.get("email", f"{phone}@placeholder.oll.co"),
    )
    order_meta = OrderMeta(
        return_url=f"{frontend_url}/social-media-intern/success?lead_id={lead['id']}&payment_mode={lead.get('payment_mode','cashfree')}",
        notify_url=f"{os.environ.get('BACKEND_URL','https://oll.co')}/api/social-media-intern/webhook",
    )
    create_order = CreateOrderRequest(
        order_id=order_id,
        order_amount=effective_amount,
        order_currency="INR",
        customer_details=customer,
        order_meta=order_meta,
        order_note=f"Social Media Internship Program - {lead.get('student_name','')}",
    )

    try:
        resp = Cashfree().PGCreateOrder("2023-08-01", create_order)
        session_id = resp.data.payment_session_id
        await db[COLLECTION].update_one({"id": data.lead_id}, {"$set": {
            "order_id": order_id,
            "order_amount": effective_amount,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }})
        return {"order_id": order_id, "payment_session_id": session_id}
    except Exception as e:
        raise HTTPException(500, f"Payment initiation failed: {str(e)}")


@router.get("/social-media-intern/verify/{lead_id}")
async def verify_payment(lead_id: str):
    db = await _get_db()
    lead = await db[COLLECTION].find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Registration not found")

    if lead.get("crm_status") in ("converted", "seat_reserved"):
        return {"status": "PAID", "lead": lead}

    order_id = lead.get("order_id")
    if not order_id or not Cashfree:
        return {"status": "PENDING", "lead": lead}

    try:
        Cashfree.XClientId     = CASHFREE_APP_ID
        Cashfree.XClientSecret = CASHFREE_SECRET_KEY
        Cashfree.XEnvironment  = Cashfree.PRODUCTION if CASHFREE_ENV == "production" else Cashfree.SANDBOX
        resp   = Cashfree().PGFetchOrder("2023-08-01", order_id)
        status = resp.data.order_status
    except Exception:
        return {"status": "PENDING", "lead": lead}

    if status == "PAID" and lead.get("crm_status") not in ("converted", "seat_reserved"):
        is_deposit = lead.get("payment_mode") == "seat_reserve"
        new_crm    = "seat_reserved" if is_deposit else "converted"
        pay_status = "partial" if is_deposit else "paid"
        update = {
            "payment_status": pay_status,
            "crm_status": new_crm,
            "amount_paid": SEAT_DEPOSIT if is_deposit else PROGRAM_PRICE,
            "amount_due":  (PROGRAM_PRICE - SEAT_DEPOSIT) if is_deposit else 0,
            "updated_at":  datetime.now(timezone.utc).isoformat(),
        }
        await db[COLLECTION].update_one({"id": lead_id}, {"$set": update})
        lead.update(update)

    return {"status": status, "lead": lead}


@router.post("/social-media-intern/webhook")
async def webhook(request_body: dict, background_tasks: BackgroundTasks):
    db = await _get_db()
    order_id    = request_body.get("data", {}).get("order", {}).get("order_id", "")
    order_status = request_body.get("data", {}).get("order", {}).get("order_status", "")
    if order_status == "PAID" and order_id:
        lead = await db[COLLECTION].find_one({"order_id": order_id}, {"_id": 0})
        if lead and lead.get("crm_status") not in ("converted", "seat_reserved"):
            is_deposit = lead.get("payment_mode") == "seat_reserve"
            await db[COLLECTION].update_one({"order_id": order_id}, {"$set": {
                "payment_status": "partial" if is_deposit else "paid",
                "crm_status":    "seat_reserved" if is_deposit else "converted",
                "amount_paid":   SEAT_DEPOSIT if is_deposit else PROGRAM_PRICE,
                "amount_due":    (PROGRAM_PRICE - SEAT_DEPOSIT) if is_deposit else 0,
                "updated_at":    datetime.now(timezone.utc).isoformat(),
            }})
            background_tasks.add_task(_send_confirmation_wa, {**lead, "crm_status": "converted"})
    return {"success": True}


@router.get("/social-media-intern/crm")
async def get_crm(
    limit: int = 200,
    search: Optional[str] = None,
    crm_status: Optional[str] = None,
    _user: dict = Depends(get_current_user),
):
    db = await _get_db()
    q: dict = {}
    if crm_status:
        q["crm_status"] = crm_status
    if search:
        q["$or"] = [
            {"student_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]
    leads = await db[COLLECTION].find(q, {"_id": 0}).sort("created_at", -1).to_list(length=limit)
    total = await db[COLLECTION].count_documents({})
    return {"leads": leads, "total": total}


@router.patch("/social-media-intern/{lead_id}/followup-status")
async def update_followup(lead_id: str, data: FollowupStatusRequest, _user: dict = Depends(get_current_user)):
    db = await _get_db()
    update = {"followup_status": data.followup_status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if data.callback_date:
        update["callback_date"] = data.callback_date
    await db[COLLECTION].update_one({"id": lead_id}, {"$set": update})
    return {"success": True}


@router.post("/social-media-intern/{lead_id}/comment")
async def add_comment(lead_id: str, data: CommentRequest, _user: dict = Depends(get_current_user)):
    db = await _get_db()
    comment = {
        "id": str(uuid.uuid4()),
        "text": data.text,
        "author": data.author,
        "comment_type": data.comment_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db[COLLECTION].update_one({"id": lead_id}, {"$push": {"comments": comment}})
    return comment


@router.patch("/social-media-intern/{lead_id}/crm-status")
async def update_crm_status(lead_id: str, data: dict, _user: dict = Depends(get_current_user)):
    db = await _get_db()
    await db[COLLECTION].update_one({"id": lead_id}, {"$set": {
        "crm_status": data.get("crm_status"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    return {"success": True}
