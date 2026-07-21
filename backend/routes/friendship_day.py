"""OLL Friendship Day Workshop 2026 — landing/registration/payment/CRM.

Public flow:
  POST /api/friendship-day/register       — dedupe by email+phone, create/update lead
  POST /api/friendship-day/initiate-payment — Cashfree order + payment_session_id
  POST /api/friendship-day/webhook        — Cashfree webhook (HMAC verified)
Admin:
  GET  /api/admin/friendship-day/registrations — filtered list
  GET  /api/admin/friendship-day/summary      — dashboard metrics
"""
import asyncio
import hashlib
import hmac
import logging
import os
import re
import time
import uuid
from base64 import b64encode
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, Field

from .shared import db, get_current_user


async def _admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

try:
    from cashfree_pg.api_client import Cashfree
    from cashfree_pg.models.create_order_request import CreateOrderRequest
    from cashfree_pg.models.customer_details import CustomerDetails as CashfreeCustomerDetails
    from cashfree_pg.models.order_meta import OrderMeta
    CASHFREE_AVAILABLE = True
except ImportError:
    CASHFREE_AVAILABLE = False

router = APIRouter()
logger = logging.getLogger(__name__)

CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENVIRONMENT = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX")
CASHFREE_API_VERSION = "2023-08-01"

if CASHFREE_AVAILABLE and CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
    Cashfree.XClientId = CASHFREE_APP_ID
    Cashfree.XClientSecret = CASHFREE_SECRET_KEY
    Cashfree.XEnvironment = (
        Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    )

WORKSHOPS = {
    "bracelet": {"name": "Design a 3D Friendship Bracelet", "amount": 499.0},
    "card":     {"name": "Code a Digital Friendship Card",  "amount": 499.0},
    "combo":    {"name": "Mega Combo (Both Workshops)",     "amount": 799.0},
}
CENTERS = {
    "kandivali": "EuroKids Preschool, Mahavir Nagar, Kandivali West",
    "mira_road": "Makoons Kids Unplugged, Mira Road East",
}
CAMPAIGN = "Friendship Day Workshop 2026"
SOURCE = "Friendship Day Landing Page"


def _cf_client():
    if not CASHFREE_AVAILABLE or not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    cf_env = Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    return Cashfree(cf_env)


class FDRegistration(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    age: int = Field(..., ge=3, le=18)
    address: str = Field(..., min_length=5, max_length=500)
    workshop: str = Field(..., pattern=r"^(bracelet|card|combo)$")
    center: str = Field(..., pattern=r"^(kandivali|mira_road)$")
    knows_oll: bool = False
    participated_before: bool = False
    previous_workshop: Optional[str] = ""


@router.post("/friendship-day/register")
async def register(data: FDRegistration):
    phone_digits = re.sub(r"\D", "", data.phone)
    if len(phone_digits) != 10:
        raise HTTPException(status_code=400, detail="Phone number must be exactly 10 digits")

    email = data.email.strip().lower()
    workshop = WORKSHOPS[data.workshop]
    center_name = CENTERS[data.center]
    now = datetime.now(timezone.utc).isoformat()

    # Dedupe by (email + phone). Existing paid registration for same
    # workshop is refused; otherwise reuse the lead id and refresh fields.
    existing = await db.friendship_day_registrations.find_one(
        {"email": email, "phone": phone_digits}, {"_id": 0},
    )
    if existing and existing.get("payment_status") == "paid" and existing.get("workshop") == data.workshop:
        raise HTTPException(status_code=409, detail="You have already registered and paid for this workshop.")

    workshop_history_entry = {
        "workshop": data.workshop,
        "workshop_name": workshop["name"],
        "center": data.center,
        "center_name": center_name,
        "amount": workshop["amount"],
        "registered_at": now,
    }

    if existing:
        reg_id = existing["id"]
        # Append to workshop_history (dedupe by workshop key + registered_at date)
        history = existing.get("workshop_history") or []
        history.append(workshop_history_entry)
        await db.friendship_day_registrations.update_one(
            {"id": reg_id},
            {"$set": {
                "full_name": data.full_name.strip(),
                "age": data.age,
                "address": data.address.strip(),
                "workshop": data.workshop,
                "workshop_name": workshop["name"],
                "center": data.center,
                "center_name": center_name,
                "amount": workshop["amount"],
                "knows_oll": data.knows_oll,
                "participated_before": data.participated_before,
                "previous_workshop": (data.previous_workshop or "").strip(),
                "payment_status": "pending",
                "workshop_history": history,
                "updated_at": now,
            }},
        )
    else:
        reg_id = str(uuid.uuid4())
        await db.friendship_day_registrations.insert_one({
            "id": reg_id,
            "full_name": data.full_name.strip(),
            "email": email,
            "phone": phone_digits,
            "age": data.age,
            "address": data.address.strip(),
            "workshop": data.workshop,
            "workshop_name": workshop["name"],
            "center": data.center,
            "center_name": center_name,
            "amount": workshop["amount"],
            "knows_oll": data.knows_oll,
            "participated_before": data.participated_before,
            "previous_workshop": (data.previous_workshop or "").strip(),
            "payment_status": "pending",
            "payment_id": "",
            "cashfree_order_id": "",
            "source": SOURCE,
            "campaign": CAMPAIGN,
            "workshop_history": [workshop_history_entry],
            "created_at": now,
            "updated_at": now,
        })
    logger.info("[friendship-day] registration %s email=%s workshop=%s", reg_id[:8], email, data.workshop)
    return {"registration_id": reg_id, "amount": workshop["amount"], "workshop_name": workshop["name"], "center_name": center_name}


class FDPayInit(BaseModel):
    registration_id: str
    frontend_url: Optional[str] = None


@router.post("/friendship-day/initiate-payment")
async def initiate_payment(data: FDPayInit):
    reg = await db.friendship_day_registrations.find_one({"id": data.registration_id}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Already paid")

    order_id = f"FD-{reg['id'][:8]}-{int(time.time())}"
    frontend_url = (data.frontend_url or os.getenv("FRONTEND_URL", "https://oll.co")).rstrip("/")
    cf_phone = reg["phone"] if len(reg["phone"]) == 10 else "9999999999"
    cf_name = reg["full_name"] if len(reg["full_name"]) >= 3 else "OLL Parent"

    try:
        customer = CashfreeCustomerDetails(
            customer_id=reg["id"][:50],
            customer_name=cf_name,
            customer_email=reg["email"],
            customer_phone=cf_phone,
        )
        order_meta = OrderMeta(
            return_url=f"{frontend_url}/friendship-day/success?order_id={order_id}&registration_id={reg['id']}",
            notify_url=f"{frontend_url}/api/friendship-day/webhook",
        )
        req = CreateOrderRequest(
            order_id=order_id,
            order_amount=reg["amount"],
            order_currency="INR",
            customer_details=customer,
            order_meta=order_meta,
            order_note=f"Friendship Day — {reg['workshop_name']} — {reg['full_name']}",
        )
        api_response = await asyncio.to_thread(_cf_client().PGCreateOrder, CASHFREE_API_VERSION, req, None, None)
        if not api_response.data:
            raise HTTPException(status_code=500, detail="Payment gateway error")
        payment_session_id = api_response.data.payment_session_id
        await db.friendship_day_registrations.update_one(
            {"id": reg["id"]},
            {"$set": {"cashfree_order_id": order_id, "cashfree_payment_session_id": payment_session_id, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"order_id": order_id, "payment_session_id": payment_session_id, "amount": reg["amount"], "environment": "production" if CASHFREE_ENVIRONMENT == "PRODUCTION" else "sandbox"}
    except Exception as e:
        logger.exception("[friendship-day] payment init failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not initiate payment")


@router.post("/friendship-day/webhook")
async def webhook(request: Request):
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")
    ts = request.headers.get("x-webhook-timestamp", "")
    sig = request.headers.get("x-webhook-signature", "")
    if not CASHFREE_SECRET_KEY or not ts or not sig:
        raise HTTPException(status_code=401, detail="Missing webhook signature")
    signed = f"{ts}.{body_str}"
    computed = b64encode(hmac.new(CASHFREE_SECRET_KEY.encode(), signed.encode(), hashlib.sha256).digest()).decode()
    if not hmac.compare_digest(computed, sig):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    import json as _json
    payload = _json.loads(body_str)
    data = payload.get("data", {}) or {}
    order = data.get("order", {}) or {}
    payment = data.get("payment", {}) or {}
    order_id = order.get("order_id")
    if not order_id:
        return {"ok": False}
    reg = await db.friendship_day_registrations.find_one({"cashfree_order_id": order_id}, {"_id": 0})
    if not reg:
        return {"ok": False, "reason": "registration not found"}

    status = (payment.get("payment_status") or "").upper()
    if status == "SUCCESS":
        # Defence-in-depth: re-verify via PGFetchOrder
        try:
            cf_resp = await asyncio.to_thread(_cf_client().PGFetchOrder, CASHFREE_API_VERSION, order_id, None, None)
            cf_status = (cf_resp.data.order_status or "").upper() if cf_resp and cf_resp.data else ""
        except Exception as e:
            logger.warning("[friendship-day] PGFetchOrder failed order=%s err=%s", order_id, e)
            raise HTTPException(status_code=502, detail="Could not verify order")
        if cf_status != "PAID":
            return {"ok": False, "reason": f"gateway status is {cf_status}"}

        await db.friendship_day_registrations.update_one(
            {"id": reg["id"]},
            {"$set": {
                "payment_status": "paid",
                "payment_id": payment.get("cf_payment_id") or "",
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        # Mirror into student_inquiries so Student CRM has this participant.
        await db.student_inquiries.update_one(
            {"email": reg["email"], "phone": reg["phone"]},
            {"$set": {
                "name": reg["full_name"], "email": reg["email"], "phone": reg["phone"],
                "age_group": str(reg["age"]), "city": reg.get("center_name", ""),
                "skill": "Friendship Day Workshop",
                "programs_interested": ["Friendship Day Workshop"],
                "learner_type": "individual", "learning_mode": "offline",
                "learning_goal": reg["workshop_name"],
                "source": SOURCE, "source_ref": "oll.co/friendship-day",
                "campaign": CAMPAIGN,
                "payment_status": "paid",
                "amount_paid": reg["amount"], "amount": reg["amount"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "status": "converted",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    elif status in ("FAILED", "USER_DROPPED"):
        await db.friendship_day_registrations.update_one(
            {"id": reg["id"]},
            {"$set": {"payment_status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
    return {"ok": True}


# ── Public verify (used by success page) ──────────────────────────────────────
@router.get("/friendship-day/verify/{order_id}")
async def verify_payment(order_id: str):
    reg = await db.friendship_day_registrations.find_one({"cashfree_order_id": order_id}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.get("payment_status") == "paid":
        return {
            "payment_status": "paid",
            "full_name": reg.get("full_name"),
            "workshop_name": reg.get("workshop_name"),
            "center_name": reg.get("center_name"),
            "amount": reg.get("amount"),
        }
    # Fallback: query Cashfree directly (webhook may not have fired yet)
    try:
        resp = await asyncio.to_thread(_cf_client().PGFetchOrder, CASHFREE_API_VERSION, order_id, None, None)
        cf_status = (resp.data.order_status or "").upper() if resp and resp.data else ""
        if cf_status == "PAID":
            await db.friendship_day_registrations.update_one(
                {"id": reg["id"]},
                {"$set": {
                    "payment_status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            # Mirror into student_inquiries so Student CRM has this participant.
            now_iso = datetime.now(timezone.utc).isoformat()
            await db.student_inquiries.update_one(
                {"email": reg["email"], "phone": reg["phone"]},
                {"$set": {
                    "name": reg["full_name"], "email": reg["email"], "phone": reg["phone"],
                    "age_group": str(reg["age"]), "city": reg.get("center_name", ""),
                    "skill": "Friendship Day Workshop",
                    "programs_interested": ["Friendship Day Workshop"],
                    "learner_type": "individual", "learning_mode": "offline",
                    "learning_goal": reg["workshop_name"],
                    "source": SOURCE, "source_ref": "oll.co/friendship-day",
                    "campaign": CAMPAIGN,
                    "payment_status": "paid",
                    "amount_paid": reg["amount"], "amount": reg["amount"],
                    "updated_at": now_iso,
                }, "$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "status": "converted",
                    "created_at": now_iso,
                }},
                upsert=True,
            )
            return {
                "payment_status": "paid",
                "full_name": reg.get("full_name"),
                "workshop_name": reg.get("workshop_name"),
                "center_name": reg.get("center_name"),
                "amount": reg.get("amount"),
            }
    except Exception as e:
        logger.warning("[friendship-day] verify fallback failed: %s", e)
    return {
        "payment_status": reg.get("payment_status", "pending"),
        "full_name": reg.get("full_name"),
        "workshop_name": reg.get("workshop_name"),
        "center_name": reg.get("center_name"),
        "amount": reg.get("amount"),
    }


@router.get("/friendship-day/catalog")
async def catalog():
    """Public: return available workshops + centers for the landing page dropdowns."""
    return {
        "workshops": [{"key": k, "name": v["name"], "amount": v["amount"]} for k, v in WORKSHOPS.items()],
        "centers": [{"key": k, "name": v} for k, v in CENTERS.items()],
    }


# ── Admin ─────────────────────────────────────────────────────────────────────
@router.get("/admin/friendship-day/registrations")
async def list_registrations(
    q: Optional[str] = None,
    workshop: Optional[str] = None,
    center: Optional[str] = None,
    payment_status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(_admin),
):
    query = {}
    if workshop: query["workshop"] = workshop
    if center: query["center"] = center
    if payment_status: query["payment_status"] = payment_status
    if start_date or end_date:
        query["created_at"] = {}
        if start_date: query["created_at"]["$gte"] = start_date
        if end_date: query["created_at"]["$lte"] = end_date + "T23:59:59"
    if q:
        needle = re.escape(q.strip())
        query["$or"] = [
            {"full_name": {"$regex": needle, "$options": "i"}},
            {"email": {"$regex": needle, "$options": "i"}},
            {"phone": {"$regex": needle, "$options": "i"}},
        ]
    rows = await db.friendship_day_registrations.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=5000)
    return {"count": len(rows), "registrations": rows}


@router.get("/admin/friendship-day/summary")
async def summary(user: dict = Depends(_admin)):
    total = await db.friendship_day_registrations.count_documents({})
    paid = await db.friendship_day_registrations.count_documents({"payment_status": "paid"})
    pending = await db.friendship_day_registrations.count_documents({"payment_status": "pending"})
    # Aggregate revenue + breakdowns
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "revenue": {"$sum": "$amount"}}},
    ]
    rev_docs = await db.friendship_day_registrations.aggregate(pipeline).to_list(length=1)
    revenue = (rev_docs[0]["revenue"] if rev_docs else 0) or 0

    by_workshop_docs = await db.friendship_day_registrations.aggregate([
        {"$group": {"_id": "$workshop", "count": {"$sum": 1}}},
    ]).to_list(length=10)
    by_center_docs = await db.friendship_day_registrations.aggregate([
        {"$group": {"_id": "$center", "count": {"$sum": 1}}},
    ]).to_list(length=10)
    return {
        "total": total,
        "paid": paid,
        "pending": pending,
        "revenue": revenue,
        "by_workshop": [{"workshop": d["_id"], "name": WORKSHOPS.get(d["_id"], {}).get("name", d["_id"]), "count": d["count"]} for d in by_workshop_docs],
        "by_center": [{"center": d["_id"], "name": CENTERS.get(d["_id"], d["_id"]), "count": d["count"]} for d in by_center_docs],
    }


class FDStatusUpdate(BaseModel):
    payment_status: str = Field(..., pattern=r"^(pending|paid|failed|refunded)$")


@router.patch("/admin/friendship-day/registrations/{reg_id}")
async def update_registration(reg_id: str, data: FDStatusUpdate, user: dict = Depends(_admin)):
    res = await db.friendship_day_registrations.update_one(
        {"id": reg_id},
        {"$set": {"payment_status": data.payment_status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"ok": True}



@router.get("/admin/friendship-day/registrations.csv")
async def export_registrations_csv(
    q: Optional[str] = None,
    workshop: Optional[str] = None,
    center: Optional[str] = None,
    payment_status: Optional[str] = None,
    user: dict = Depends(_admin),
):
    from fastapi.responses import Response
    import csv, io
    query = {}
    if workshop: query["workshop"] = workshop
    if center: query["center"] = center
    if payment_status: query["payment_status"] = payment_status
    if q:
        needle = re.escape(q.strip())
        query["$or"] = [
            {"full_name": {"$regex": needle, "$options": "i"}},
            {"email": {"$regex": needle, "$options": "i"}},
            {"phone": {"$regex": needle, "$options": "i"}},
        ]
    rows = await db.friendship_day_registrations.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=10000)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Created At", "Name", "Email", "Phone", "Age", "Workshop", "Center",
                "Amount", "Payment Status", "Paid At", "Knows OLL", "Participated Before",
                "Previous Workshop", "Address", "Cashfree Order ID"])
    for r in rows:
        w.writerow([
            r.get("created_at",""), r.get("full_name",""), r.get("email",""), r.get("phone",""),
            r.get("age",""), r.get("workshop_name",""), r.get("center_name",""),
            r.get("amount",""), r.get("payment_status",""), r.get("paid_at",""),
            "Yes" if r.get("knows_oll") else "No",
            "Yes" if r.get("participated_before") else "No",
            r.get("previous_workshop",""), r.get("address",""), r.get("cashfree_order_id",""),
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="friendship-day-registrations.csv"'},
    )
