"""
Future Skills Continuous Learning Program — Routes

Two funnels:
  • Free Trial booking (lead capture, no payment)
  • Paid subscription (Monthly ₹2000 or Yearly ₹21,000 = ₹1,750/mo) via Cashfree

Reuses Cashfree credentials from the summer-camp module.
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

PROGRAM_KEY = "future_skills"
PROGRAM_NAME = "Future Skills Continuous Learning Program"

PLANS = {
    "monthly": {
        "label": "Monthly",
        "price": 2000.0,
        "billing_cycle": "monthly",
        "months": 1,
        "monthly_equivalent": 2000.0,
    },
    "half_yearly": {
        "label": "Half Yearly",
        "price": 11000.0,
        "billing_cycle": "half_yearly",
        "months": 6,
        "monthly_equivalent": 1834.0,
    },
    "yearly": {
        "label": "Yearly",
        "price": 21000.0,
        "billing_cycle": "yearly",
        "months": 12,
        "monthly_equivalent": 1750.0,
    },
}

# Number of days before the renewal date at which we start showing the customer
# under the "Renewals → Upcoming" bucket.
RENEWAL_WINDOW_DAYS = 7

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


async def _next_ref(prefix: str) -> str:
    """Atomic 4-digit ref via the shared `counters` collection."""
    res = await db.counters.find_one_and_update(
        {"_id": f"future_skills_{prefix}_ref"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = int(res.get("seq", 1)) if res else 1
    return f"{prefix}-{seq:04d}"


def _is_admin(user: dict) -> bool:
    role = (user or {}).get("role", "")
    email = (user or {}).get("email", "")
    return role in ("admin", "super_admin") or email.endswith("@oll.co")


# ── Models ─────────────────────────────────────────────────────────────────
class TrialBooking(BaseModel):
    # Simplified minimal-booking payload: only phone + center_id + batch_id required.
    # Other fields are optional / left for admin follow-up.
    parent_phone: str = Field(..., min_length=6, max_length=15)
    center_id: Optional[str] = Field(default="", max_length=64)
    batch_id: Optional[str] = Field(default="", max_length=64)
    parent_name: Optional[str] = Field(default="", max_length=120)
    parent_email: Optional[str] = Field(default="", max_length=120)
    student_name: Optional[str] = Field(default="", max_length=120)
    student_grade: Optional[str] = Field(default="", max_length=8)
    preferred_center: Optional[str] = Field(default="", max_length=120)
    preferred_skill: Optional[str] = Field(default="", max_length=80)
    notes: Optional[str] = Field(default="", max_length=500)
    source_ref: Optional[str] = Field(default="", max_length=64)


class SubscriptionCreate(BaseModel):
    parent_name: str = Field(..., min_length=2, max_length=120)
    parent_phone: str = Field(..., min_length=10, max_length=15)
    parent_email: EmailStr
    student_name: str = Field(..., min_length=2, max_length=120)
    student_grade: str = Field(..., min_length=1, max_length=8)
    preferred_center: Optional[str] = Field(default="", max_length=80)
    plan: str = Field(..., pattern=r"^(monthly|yearly)$")
    notes: Optional[str] = Field(default="", max_length=500)
    source_ref: Optional[str] = Field(default="", max_length=64)


class PaymentInit(BaseModel):
    subscription_id: str
    frontend_url: Optional[str] = None


# ── Endpoints — Trial Class ────────────────────────────────────────────────
@router.post("/future-skills/register-trial")
async def register_trial(data: TrialBooking):
    """Book a free trial class — minimal payload (phone + center + batch)."""
    trial_id = str(uuid.uuid4())
    trial_ref = await _next_ref("FST")
    norm_phone = re.sub(r"\D", "", data.parent_phone or "")
    if len(norm_phone) < 10:
        raise HTTPException(status_code=400, detail="Enter a valid phone number")

    # Resolve chosen center + batch (may be blank for backwards compat)
    center_doc = None
    batch_doc = None
    if data.center_id:
        center_doc = await db.future_skills_centers.find_one({"id": data.center_id}, {"_id": 0})
    if data.batch_id:
        batch_doc = await db.future_skills_batches.find_one({"id": data.batch_id}, {"_id": 0})
        if batch_doc and not center_doc:
            center_doc = await db.future_skills_centers.find_one({"id": batch_doc.get("center_id")}, {"_id": 0})

    center_name = (center_doc or {}).get("name") or (data.preferred_center or "").strip()
    batch_label = ""
    if batch_doc:
        days = ",".join(batch_doc.get("days", []) or [])
        batch_label = f"{batch_doc.get('name','Batch')} · {days} · {batch_doc.get('start_time','')}-{batch_doc.get('end_time','')}"

    # Dedup on phone → nudge return_count and refresh center/batch if newly chosen
    existing = await db.future_skills_trials.find_one({"parent_phone": norm_phone}, {"_id": 0})
    if existing:
        update: dict = {
            "return_count": existing.get("return_count", 1) + 1,
            "last_returned_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if data.center_id:  update["center_id"] = data.center_id
        if center_name:     update["preferred_center"] = center_name
        if data.batch_id:   update["batch_id"] = data.batch_id
        if batch_label:     update["batch_label"] = batch_label
        await db.future_skills_trials.update_one({"id": existing["id"]}, {"$set": update})
        return {
            "trial_id": existing["id"],
            "trial_ref": existing.get("trial_ref"),
            "is_existing": True,
        }

    doc = {
        "id": trial_id,
        "trial_ref": trial_ref,
        "program_key": PROGRAM_KEY,
        "parent_name": (data.parent_name or "").strip(),
        "parent_phone": norm_phone,
        "parent_email": (data.parent_email or "").strip().lower(),
        "student_name": (data.student_name or "").strip(),
        "student_grade": (data.student_grade or "").strip(),
        "preferred_center": center_name,
        "center_id": data.center_id or "",
        "batch_id": data.batch_id or "",
        "batch_label": batch_label,
        "preferred_skill": (data.preferred_skill or "").strip(),
        "notes": (data.notes or "").strip(),
        "source_ref": (data.source_ref or "").strip(),
        "trial_status": "requested",
        "crm_status": "trial_lead",
        "return_count": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.future_skills_trials.insert_one(doc)
    logging.info(f"[future-skills] trial booked {trial_ref} - {norm_phone} @ {center_name or 'unassigned'}")

    # Best-effort WhatsApp confirmation (skips if template misconfigured)
    try:
        from .notifications import send_whatsapp_notification
        first_name = ((data.student_name or data.parent_name) or "there").split()[0] or "there"
        await send_whatsapp_notification(
            phone=norm_phone,
            template_key="future_skills_trial_booked",
            params=[first_name, trial_ref],
            user_name=first_name,
        )
    except Exception as e:
        logging.info(f"[future-skills] WA trial confirmation skipped: {e}")

    return {
        "trial_id": trial_id,
        "trial_ref": trial_ref,
        "is_existing": False,
    }


# ── Endpoints — Subscription ───────────────────────────────────────────────
@router.post("/future-skills/subscribe")
async def create_subscription(data: SubscriptionCreate):
    """Create a Future Skills subscription record (pre-payment)."""
    if data.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan_info = PLANS[data.plan]

    sub_id = str(uuid.uuid4())
    sub_ref = await _next_ref("FSP")

    doc = {
        "id": sub_id,
        "subscription_ref": sub_ref,
        "program_key": PROGRAM_KEY,
        "parent_name": data.parent_name.strip(),
        "parent_phone": data.parent_phone.strip(),
        "parent_email": data.parent_email.lower(),
        "student_name": data.student_name.strip(),
        "student_grade": data.student_grade.strip(),
        "preferred_center": (data.preferred_center or "").strip(),
        "notes": (data.notes or "").strip(),
        "source_ref": (data.source_ref or "").strip(),
        "plan": data.plan,
        "plan_label": plan_info["label"],
        "billing_cycle": plan_info["billing_cycle"],
        "amount": plan_info["price"],
        "monthly_equivalent": plan_info["monthly_equivalent"],
        "kit_included": True,
        "payment_status": "pending",
        "crm_status": "subscription_lead",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.future_skills_subscriptions.insert_one(doc)
    logging.info(f"[future-skills] subscription created {sub_ref} - {data.plan}")

    return {
        "subscription_id": sub_id,
        "subscription_ref": sub_ref,
        "amount": plan_info["price"],
        "plan_label": plan_info["label"],
    }


@router.post("/future-skills/initiate-payment")
async def initiate_payment(data: PaymentInit):
    """Open a Cashfree order for a Future Skills subscription."""
    sub = await db.future_skills_subscriptions.find_one({"id": data.subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Already paid")

    order_id = f"FSP-{sub['id'][:8]}-{int(time.time())}"
    frontend_url = data.frontend_url or os.getenv("FRONTEND_URL", "https://oll.co")

    cf_name = (sub.get("parent_name") or "").strip() or "OLL Parent"
    if len(cf_name.replace(" ", "")) < 3:
        cf_name = "OLL Parent"
    raw_phone = sub.get("parent_phone") or "9999999999"
    cf_phone = re.sub(r"\D", "", raw_phone)
    if len(cf_phone) > 10:
        cf_phone = cf_phone[-10:]
    if len(cf_phone) < 10:
        cf_phone = "9999999999"

    try:
        customer = CashfreeCustomerDetails(
            customer_id=sub["id"][:50],
            customer_name=cf_name,
            customer_email=sub.get("parent_email") or f"{sub['id'][:8]}@oll.co",
            customer_phone=cf_phone,
        )
        order_meta = OrderMeta(
            return_url=f"{frontend_url}/future-skills/success?order_id={order_id}&subscription_id={sub['id']}",
            notify_url=f"{frontend_url}/api/future-skills/webhook",
        )
        req = CreateOrderRequest(
            order_id=order_id,
            order_amount=sub["amount"],
            order_currency="INR",
            customer_details=customer,
            order_meta=order_meta,
            order_note=f"{PROGRAM_NAME} — {sub.get('plan_label','')} — {sub.get('student_name','')}",
        )
        api_response = await asyncio.to_thread(
            _cf_client().PGCreateOrder, CASHFREE_API_VERSION, req, None, None
        )
        if not api_response.data:
            raise HTTPException(status_code=500, detail="Payment gateway error")

        payment_session_id = api_response.data.payment_session_id
        payment_link = f"https://payments.cashfree.com/forms/{payment_session_id}"

        await db.future_skills_subscriptions.update_one(
            {"id": sub["id"]},
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
        logging.error(f"[future-skills] payment init failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Payment initiation failed: {e}")


@router.get("/future-skills/verify/{subscription_id}")
async def verify_payment(subscription_id: str):
    sub = await db.future_skills_subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.get("crm_status") == "active":
        return {"status": "PAID", "subscription": sub}

    order_id = sub.get("order_id")
    if not order_id:
        return {"status": "pending", "subscription": sub}

    try:
        resp = await asyncio.to_thread(
            _cf_client().PGFetchOrder, CASHFREE_API_VERSION, order_id, None
        )
        if resp.data:
            order_status = resp.data.order_status
            if order_status == "PAID" and sub.get("crm_status") != "active":
                update = {
                    "payment_status": "paid",
                    "crm_status": "active",
                    "amount_paid": sub["amount"],
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "subscription_start": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.future_skills_subscriptions.update_one({"id": subscription_id}, {"$set": update})
                sub.update(update)
                try:
                    from .notifications import send_whatsapp_notification
                    first_name = (sub.get("student_name") or "").split()[0] or "there"
                    await send_whatsapp_notification(
                        phone=sub.get("parent_phone", ""),
                        template_key="future_skills_subscribed",
                        params=[first_name, sub.get("plan_label", ""), sub.get("subscription_ref", "")],
                        user_name=first_name,
                    )
                except Exception as wa_err:
                    logging.info(f"[future-skills] WA welcome skipped: {wa_err}")
            return {"status": order_status, "subscription": sub}
    except Exception as e:
        logging.warning(f"[future-skills] verify error: {e}")
    return {"status": sub.get("payment_status", "pending"), "subscription": sub}


@router.post("/future-skills/webhook")
async def cashfree_webhook(request: Request):
    try:
        payload = await request.json()
        order = payload.get("data", {}).get("order", {})
        order_id = order.get("order_id")
        order_status = order.get("order_status")
        if not order_id:
            return {"status": "ignored"}
        if order_status == "PAID":
            sub = await db.future_skills_subscriptions.find_one({"order_id": order_id}, {"_id": 0})
            if sub and sub.get("crm_status") != "active":
                await db.future_skills_subscriptions.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "crm_status": "active",
                        "amount_paid": sub["amount"],
                        "paid_at": datetime.now(timezone.utc).isoformat(),
                        "subscription_start": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
        return {"status": "ok"}
    except Exception as e:
        logging.warning(f"[future-skills] webhook err: {e}")
        return {"status": "error"}


# ── Admin CRM endpoints ───────────────────────────────────────────────────
@router.get("/admin/future-skills/trials")
async def admin_list_trials(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    query: dict = {}
    if status and status != "all":
        query["crm_status"] = status
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [
            {"trial_ref": rx}, {"student_name": rx}, {"parent_name": rx},
            {"parent_phone": rx}, {"parent_email": rx},
        ]
    cursor = db.future_skills_trials.find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    rows = [r async for r in cursor]
    total = await db.future_skills_trials.count_documents({})
    return {"trials": rows, "stats": {"total": total}}


@router.get("/admin/future-skills/subscriptions")
async def admin_list_subs(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    query: dict = {}
    if status and status != "all":
        if status == "active":
            query["crm_status"] = "active"
        elif status == "lead":
            query["crm_status"] = {"$ne": "active"}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [
            {"subscription_ref": rx}, {"student_name": rx}, {"parent_name": rx},
            {"parent_phone": rx}, {"parent_email": rx},
        ]
    cursor = db.future_skills_subscriptions.find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    rows = [r async for r in cursor]
    total = await db.future_skills_subscriptions.count_documents({})
    active = await db.future_skills_subscriptions.count_documents({"crm_status": "active"})
    revenue_pipeline = await db.future_skills_subscriptions.aggregate([
        {"$match": {"crm_status": "active"}},
        {"$group": {"_id": None, "sum": {"$sum": "$amount"}}},
    ]).to_list(1)
    revenue = revenue_pipeline[0]["sum"] if revenue_pipeline else 0
    return {
        "subscriptions": rows,
        "stats": {
            "total": total, "active": active, "leads": total - active,
            "revenue": revenue,
        },
    }


# ── Admin update endpoints ────────────────────────────────────────────────
class TrialUpdate(BaseModel):
    crm_status: Optional[str] = None
    trial_status: Optional[str] = None
    notes: Optional[str] = None
    assigned_center: Optional[str] = None
    scheduled_at: Optional[str] = None


@router.patch("/admin/future-skills/trials/{trial_id}")
async def admin_update_trial(trial_id: str, data: TrialUpdate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.future_skills_trials.update_one({"id": trial_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trial not found")
    trial = await db.future_skills_trials.find_one({"id": trial_id}, {"_id": 0})
    return {"trial": trial}


class SubscriptionUpdate(BaseModel):
    crm_status: Optional[str] = None
    notes: Optional[str] = None
    assigned_center: Optional[str] = None
    plan: Optional[str] = None
    amount_paid: Optional[float] = None
    payment_date: Optional[str] = None
    renewal_date: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    student_name: Optional[str] = None
    student_grade: Optional[str] = None


@router.patch("/admin/future-skills/subscriptions/{sub_id}")
async def admin_update_sub(sub_id: str, data: SubscriptionUpdate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    # If plan changed, refresh derived labels
    if "plan" in update:
        if update["plan"] not in PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan")
        plan_info = PLANS[update["plan"]]
        update["plan_label"] = plan_info["label"]
        update["billing_cycle"] = plan_info["billing_cycle"]
        update["monthly_equivalent"] = plan_info["monthly_equivalent"]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.future_skills_subscriptions.update_one({"id": sub_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub = await db.future_skills_subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return {"subscription": sub}


# ══════════════════════════════════════════════════════════════════════════
# LEADS · MANUAL ADD · IMPORT · RENEWALS · LOST
# ══════════════════════════════════════════════════════════════════════════
from fastapi import UploadFile, File, Body
from io import BytesIO
from datetime import timedelta


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _now_iso() -> str:
    return _iso(datetime.now(timezone.utc))


def _parse_date(s: Optional[str]) -> Optional[datetime]:
    """Best-effort parse of an ISO date/datetime string → UTC datetime."""
    if not s:
        return None
    try:
        # Handle both "2026-03-15" and full ISO datetimes
        if "T" in s:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        else:
            dt = datetime.strptime(s, "%Y-%m-%d")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _add_months(base: datetime, months: int) -> datetime:
    """Add N months to a datetime (approx — uses 30-day months for consistency)."""
    return base + timedelta(days=30 * months)


def _norm_phone(p: str) -> str:
    if not p:
        return ""
    return re.sub(r"\D", "", str(p))


# ── LEADS ─────────────────────────────────────────────────────────────────
class LeadCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=6, max_length=20)
    email: Optional[str] = Field(default="", max_length=120)
    source: Optional[str] = Field(default="", max_length=80)
    city: Optional[str] = Field(default="", max_length=80)
    notes: Optional[str] = Field(default="", max_length=1000)
    child_age: Optional[str] = Field(default="", max_length=20)
    child_grade: Optional[str] = Field(default="", max_length=20)
    status: Optional[str] = Field(default="new", max_length=32)


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    child_age: Optional[str] = None
    child_grade: Optional[str] = None
    status: Optional[str] = None


@router.post("/admin/future-skills/leads")
async def admin_create_lead(data: LeadCreate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    lead_id = str(uuid.uuid4())
    lead_ref = await _next_ref("FSL")
    doc = {
        "id": lead_id,
        "lead_ref": lead_ref,
        "program_key": PROGRAM_KEY,
        "name": data.name.strip(),
        "phone": _norm_phone(data.phone),
        "email": (data.email or "").strip().lower(),
        "source": (data.source or "").strip(),
        "city": (data.city or "").strip(),
        "notes": (data.notes or "").strip(),
        "child_age": (data.child_age or "").strip(),
        "child_grade": (data.child_grade or "").strip(),
        "status": (data.status or "new").strip() or "new",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "created_by": user.get("email"),
    }
    await db.future_skills_leads.insert_one(doc)
    doc.pop("_id", None)
    return {"lead": doc}


@router.get("/admin/future-skills/leads")
async def admin_list_leads(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    query: dict = {}
    if status and status != "all":
        if status == "active":
            query["status"] = {"$nin": ["lost", "converted"]}
        else:
            query["status"] = status
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [
            {"lead_ref": rx}, {"name": rx}, {"phone": rx},
            {"email": rx}, {"source": rx}, {"city": rx},
        ]
    cursor = db.future_skills_leads.find(query, {"_id": 0}).sort("created_at", -1).limit(1000)
    rows = [r async for r in cursor]
    total = await db.future_skills_leads.count_documents({})
    active = await db.future_skills_leads.count_documents({"status": {"$nin": ["lost", "converted"]}})
    lost = await db.future_skills_leads.count_documents({"status": "lost"})
    return {
        "leads": rows,
        "stats": {"total": total, "active": active, "lost": lost, "showing": len(rows)},
    }


@router.patch("/admin/future-skills/leads/{lead_id}")
async def admin_update_lead(lead_id: str, data: LeadUpdate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if "phone" in update:
        update["phone"] = _norm_phone(update["phone"])
    if "email" in update:
        update["email"] = (update["email"] or "").lower()
    update["updated_at"] = _now_iso()
    res = await db.future_skills_leads.update_one({"id": lead_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = await db.future_skills_leads.find_one({"id": lead_id}, {"_id": 0})
    return {"lead": lead}


@router.delete("/admin/future-skills/leads/{lead_id}")
async def admin_delete_lead(lead_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.future_skills_leads.delete_one({"id": lead_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"deleted": True}


class MarkLostBody(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)


@router.post("/admin/future-skills/leads/{lead_id}/mark-lost")
async def admin_lead_mark_lost(lead_id: str, data: MarkLostBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.future_skills_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": "lost",
            "lost_reason": data.reason.strip(),
            "lost_at": _now_iso(),
            "lost_by": user.get("email"),
            "updated_at": _now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = await db.future_skills_leads.find_one({"id": lead_id}, {"_id": 0})
    return {"lead": lead}


@router.post("/admin/future-skills/leads/{lead_id}/convert-to-trial")
async def admin_lead_to_trial(lead_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    lead = await db.future_skills_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    trial_id = str(uuid.uuid4())
    trial_ref = await _next_ref("FST")
    trial_doc = {
        "id": trial_id,
        "trial_ref": trial_ref,
        "program_key": PROGRAM_KEY,
        "parent_name": lead.get("name", ""),
        "parent_phone": lead.get("phone", ""),
        "parent_email": lead.get("email", "") or f"{lead.get('phone','x')}@lead.oll.co",
        "student_name": lead.get("name", ""),
        "student_grade": lead.get("child_grade", ""),
        "preferred_center": "",
        "preferred_skill": "",
        "notes": lead.get("notes", ""),
        "source_ref": lead.get("source", ""),
        "trial_status": "requested",
        "crm_status": "trial_lead",
        "return_count": 1,
        "source_lead_id": lead_id,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "created_by": user.get("email"),
    }
    await db.future_skills_trials.insert_one(trial_doc)

    await db.future_skills_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": "converted",
            "converted_trial_id": trial_id,
            "converted_at": _now_iso(),
            "updated_at": _now_iso(),
        }},
    )
    trial_doc.pop("_id", None)
    return {"trial": trial_doc}


# ── LEAD IMPORT (CSV / XLSX) ──────────────────────────────────────────────
@router.post("/admin/future-skills/leads/import")
async def admin_import_leads(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    filename = (file.filename or "").lower()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        import pandas as pd
        if filename.endswith(".csv") or "csv" in (file.content_type or ""):
            df = pd.read_csv(BytesIO(content), dtype=str, keep_default_na=False)
        elif filename.endswith((".xlsx", ".xls")) or "sheet" in (file.content_type or ""):
            df = pd.read_excel(BytesIO(content), dtype=str, engine="openpyxl").fillna("")
        else:
            raise HTTPException(status_code=400, detail="Only .csv, .xlsx or .xls accepted")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

    # Normalize headers
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    # Column aliases → canonical
    alias_map = {
        "name": "name", "full_name": "name", "parent_name": "name", "lead_name": "name",
        "phone": "phone", "mobile": "phone", "contact": "phone", "phone_number": "phone", "whatsapp": "phone",
        "email": "email", "email_id": "email", "mail": "email",
        "source": "source", "lead_source": "source",
        "city": "city", "location": "city",
        "notes": "notes", "note": "notes", "remark": "notes", "remarks": "notes",
        "child_age": "child_age", "age": "child_age", "student_age": "child_age",
        "child_grade": "child_grade", "grade": "child_grade", "class": "child_grade", "student_grade": "child_grade",
    }
    cols = {c: alias_map.get(c, c) for c in df.columns}

    inserted = 0
    skipped = 0
    errors: list = []
    imported_leads: list = []
    default_source = "import"

    for idx, row in df.iterrows():
        try:
            record = {alias_map.get(c, c): str(row.get(c, "")).strip() for c in df.columns}
            name = record.get("name", "").strip()
            phone = _norm_phone(record.get("phone", ""))
            if not name or not phone:
                skipped += 1
                errors.append(f"Row {int(idx) + 2}: missing name/phone")
                continue

            # Dedup on phone
            existing = await db.future_skills_leads.find_one({"phone": phone}, {"_id": 0, "id": 1})
            if existing:
                skipped += 1
                continue

            lead_id = str(uuid.uuid4())
            lead_ref = await _next_ref("FSL")
            doc = {
                "id": lead_id,
                "lead_ref": lead_ref,
                "program_key": PROGRAM_KEY,
                "name": name,
                "phone": phone,
                "email": record.get("email", "").lower(),
                "source": record.get("source", "") or default_source,
                "city": record.get("city", ""),
                "notes": record.get("notes", ""),
                "child_age": record.get("child_age", ""),
                "child_grade": record.get("child_grade", ""),
                "status": "new",
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
                "created_by": user.get("email"),
                "imported": True,
            }
            await db.future_skills_leads.insert_one(doc)
            doc.pop("_id", None)
            imported_leads.append(doc)
            inserted += 1
        except Exception as e:
            skipped += 1
            errors.append(f"Row {int(idx) + 2}: {e}")

    return {
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors[:20],
        "total_rows": int(len(df)),
    }


# ── TRIALS (manual admin add + convert + lost) ────────────────────────────
class TrialCreateAdmin(BaseModel):
    parent_name: str = Field(..., min_length=1, max_length=120)
    parent_phone: str = Field(..., min_length=6, max_length=20)
    parent_email: Optional[str] = Field(default="", max_length=120)
    student_name: str = Field(..., min_length=1, max_length=120)
    student_grade: Optional[str] = Field(default="", max_length=20)
    preferred_center: Optional[str] = Field(default="", max_length=80)
    preferred_skill: Optional[str] = Field(default="", max_length=80)
    notes: Optional[str] = Field(default="", max_length=1000)
    scheduled_at: Optional[str] = Field(default="", max_length=40)
    source_lead_id: Optional[str] = Field(default="", max_length=64)


@router.post("/admin/future-skills/trials")
async def admin_create_trial(data: TrialCreateAdmin, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    trial_id = str(uuid.uuid4())
    trial_ref = await _next_ref("FST")
    doc = {
        "id": trial_id,
        "trial_ref": trial_ref,
        "program_key": PROGRAM_KEY,
        "parent_name": data.parent_name.strip(),
        "parent_phone": _norm_phone(data.parent_phone),
        "parent_email": (data.parent_email or "").strip().lower() or f"{trial_id[:8]}@lead.oll.co",
        "student_name": data.student_name.strip(),
        "student_grade": (data.student_grade or "").strip(),
        "preferred_center": (data.preferred_center or "").strip(),
        "preferred_skill": (data.preferred_skill or "").strip(),
        "notes": (data.notes or "").strip(),
        "scheduled_at": (data.scheduled_at or "").strip(),
        "source_lead_id": (data.source_lead_id or "").strip(),
        "trial_status": "scheduled" if data.scheduled_at else "requested",
        "crm_status": "trial_scheduled" if data.scheduled_at else "trial_lead",
        "return_count": 1,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "created_by": user.get("email"),
    }
    await db.future_skills_trials.insert_one(doc)
    doc.pop("_id", None)
    return {"trial": doc}


@router.post("/admin/future-skills/trials/{trial_id}/mark-lost")
async def admin_trial_mark_lost(trial_id: str, data: MarkLostBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.future_skills_trials.update_one(
        {"id": trial_id},
        {"$set": {
            "crm_status": "lost",
            "trial_status": "lost",
            "lost_reason": data.reason.strip(),
            "lost_at": _now_iso(),
            "lost_by": user.get("email"),
            "updated_at": _now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trial not found")
    trial = await db.future_skills_trials.find_one({"id": trial_id}, {"_id": 0})
    return {"trial": trial}


class TrialConvertBody(BaseModel):
    plan: str = Field(..., pattern=r"^(monthly|half_yearly|yearly)$")
    amount_paid: float = Field(..., ge=0)
    payment_date: Optional[str] = None
    renewal_date: Optional[str] = None
    notes: Optional[str] = ""


@router.post("/admin/future-skills/trials/{trial_id}/convert-to-customer")
async def admin_trial_convert(trial_id: str, data: TrialConvertBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    trial = await db.future_skills_trials.find_one({"id": trial_id}, {"_id": 0})
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
    plan_info = PLANS[data.plan]

    now = datetime.now(timezone.utc)
    pay_dt = _parse_date(data.payment_date) or now
    ren_dt = _parse_date(data.renewal_date) or _add_months(pay_dt, plan_info["months"])

    sub_id = str(uuid.uuid4())
    sub_ref = await _next_ref("FSP")
    doc = {
        "id": sub_id,
        "subscription_ref": sub_ref,
        "program_key": PROGRAM_KEY,
        "parent_name": trial.get("parent_name", ""),
        "parent_phone": trial.get("parent_phone", ""),
        "parent_email": trial.get("parent_email", ""),
        "student_name": trial.get("student_name", ""),
        "student_grade": trial.get("student_grade", ""),
        "preferred_center": trial.get("preferred_center", ""),
        "notes": (data.notes or trial.get("notes", "")),
        "source_ref": trial.get("source_ref", ""),
        "source_trial_id": trial_id,
        "plan": data.plan,
        "plan_label": plan_info["label"],
        "billing_cycle": plan_info["billing_cycle"],
        "amount": plan_info["price"],
        "monthly_equivalent": plan_info["monthly_equivalent"],
        "amount_paid": data.amount_paid,
        "payment_date": _iso(pay_dt),
        "renewal_date": _iso(ren_dt),
        "kit_included": True,
        "payment_status": "paid",
        "crm_status": "active",
        "paid_at": _iso(pay_dt),
        "subscription_start": _iso(pay_dt),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "created_by": user.get("email"),
    }
    await db.future_skills_subscriptions.insert_one(doc)

    await db.future_skills_trials.update_one(
        {"id": trial_id},
        {"$set": {
            "crm_status": "converted",
            "trial_status": "converted",
            "converted_subscription_id": sub_id,
            "converted_at": _now_iso(),
            "updated_at": _now_iso(),
        }},
    )
    doc.pop("_id", None)
    return {"subscription": doc}


# ── CUSTOMERS (Active Subscriptions) ──────────────────────────────────────
class CustomerCreateAdmin(BaseModel):
    parent_name: str = Field(..., min_length=1, max_length=120)
    parent_phone: str = Field(..., min_length=6, max_length=20)
    parent_email: Optional[str] = Field(default="", max_length=120)
    student_name: str = Field(..., min_length=1, max_length=120)
    student_grade: Optional[str] = Field(default="", max_length=20)
    plan: str = Field(..., pattern=r"^(monthly|half_yearly|yearly)$")
    amount_paid: float = Field(..., ge=0)
    payment_date: Optional[str] = None
    renewal_date: Optional[str] = None
    preferred_center: Optional[str] = Field(default="", max_length=80)
    notes: Optional[str] = Field(default="", max_length=1000)
    source_ref: Optional[str] = Field(default="", max_length=64)


@router.post("/admin/future-skills/customers")
async def admin_create_customer(data: CustomerCreateAdmin, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    plan_info = PLANS[data.plan]

    now = datetime.now(timezone.utc)
    pay_dt = _parse_date(data.payment_date) or now
    ren_dt = _parse_date(data.renewal_date) or _add_months(pay_dt, plan_info["months"])

    sub_id = str(uuid.uuid4())
    sub_ref = await _next_ref("FSP")
    doc = {
        "id": sub_id,
        "subscription_ref": sub_ref,
        "program_key": PROGRAM_KEY,
        "parent_name": data.parent_name.strip(),
        "parent_phone": _norm_phone(data.parent_phone),
        "parent_email": (data.parent_email or "").strip().lower() or f"{sub_id[:8]}@customer.oll.co",
        "student_name": data.student_name.strip(),
        "student_grade": (data.student_grade or "").strip(),
        "preferred_center": (data.preferred_center or "").strip(),
        "notes": (data.notes or "").strip(),
        "source_ref": (data.source_ref or "manual").strip(),
        "plan": data.plan,
        "plan_label": plan_info["label"],
        "billing_cycle": plan_info["billing_cycle"],
        "amount": plan_info["price"],
        "monthly_equivalent": plan_info["monthly_equivalent"],
        "amount_paid": data.amount_paid,
        "payment_date": _iso(pay_dt),
        "renewal_date": _iso(ren_dt),
        "kit_included": True,
        "payment_status": "paid",
        "crm_status": "active",
        "paid_at": _iso(pay_dt),
        "subscription_start": _iso(pay_dt),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "created_by": user.get("email"),
        "manually_added": True,
    }
    await db.future_skills_subscriptions.insert_one(doc)
    doc.pop("_id", None)
    return {"subscription": doc}


class RenewBody(BaseModel):
    plan: Optional[str] = None
    amount_paid: float = Field(..., ge=0)
    payment_date: Optional[str] = None
    renewal_date: Optional[str] = None
    notes: Optional[str] = ""


@router.post("/admin/future-skills/customers/{sub_id}/renew")
async def admin_customer_renew(sub_id: str, data: RenewBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    sub = await db.future_skills_subscriptions.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Customer not found")

    plan_key = data.plan or sub.get("plan") or "monthly"
    if plan_key not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan_info = PLANS[plan_key]

    now = datetime.now(timezone.utc)
    pay_dt = _parse_date(data.payment_date) or now
    if data.renewal_date:
        ren_dt = _parse_date(data.renewal_date) or _add_months(pay_dt, plan_info["months"])
    else:
        # Extend from current renewal_date (if in future) or from payment date
        current_ren = _parse_date(sub.get("renewal_date"))
        base = current_ren if (current_ren and current_ren > now) else pay_dt
        ren_dt = _add_months(base, plan_info["months"])

    history_entry = {
        "renewed_at": _now_iso(),
        "previous_renewal_date": sub.get("renewal_date"),
        "amount_paid": data.amount_paid,
        "plan": plan_key,
        "renewed_by": user.get("email"),
        "notes": (data.notes or "").strip(),
    }

    update = {
        "plan": plan_key,
        "plan_label": plan_info["label"],
        "billing_cycle": plan_info["billing_cycle"],
        "amount": plan_info["price"],
        "monthly_equivalent": plan_info["monthly_equivalent"],
        "amount_paid": data.amount_paid,
        "payment_date": _iso(pay_dt),
        "renewal_date": _iso(ren_dt),
        "payment_status": "paid",
        "crm_status": "active",
        "renewed_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    if (data.notes or "").strip():
        update["notes"] = data.notes.strip()

    await db.future_skills_subscriptions.update_one(
        {"id": sub_id},
        {"$set": update, "$push": {"renewal_history": history_entry}},
    )
    sub = await db.future_skills_subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return {"subscription": sub}


@router.post("/admin/future-skills/customers/{sub_id}/mark-lost")
async def admin_customer_mark_lost(sub_id: str, data: MarkLostBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.future_skills_subscriptions.update_one(
        {"id": sub_id},
        {"$set": {
            "crm_status": "lost",
            "lost_reason": data.reason.strip(),
            "lost_at": _now_iso(),
            "lost_by": user.get("email"),
            "updated_at": _now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    sub = await db.future_skills_subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return {"subscription": sub}


# ── RENEWALS view (computed) ──────────────────────────────────────────────
@router.get("/admin/future-skills/renewals")
async def admin_list_renewals(
    bucket: str = Query("all", pattern=r"^(all|upcoming|overdue)$"),
    q: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    now = datetime.now(timezone.utc)
    window_start = now
    window_end = now + timedelta(days=RENEWAL_WINDOW_DAYS)

    base_query: dict = {
        "crm_status": "active",
        "renewal_date": {"$nin": [None, ""]},
    }
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        base_query["$or"] = [
            {"subscription_ref": rx}, {"student_name": rx}, {"parent_name": rx},
            {"parent_phone": rx}, {"parent_email": rx},
        ]

    cursor = db.future_skills_subscriptions.find(base_query, {"_id": 0}).limit(2000)
    all_active = [r async for r in cursor]

    upcoming: list = []
    overdue: list = []
    for r in all_active:
        ren = _parse_date(r.get("renewal_date"))
        if not ren:
            continue
        if ren < now:
            r["renewal_bucket"] = "overdue"
            r["days_overdue"] = (now - ren).days
            overdue.append(r)
        elif ren <= window_end:
            r["renewal_bucket"] = "upcoming"
            r["days_to_renewal"] = (ren - now).days
            upcoming.append(r)

    upcoming.sort(key=lambda x: x.get("renewal_date", ""))
    overdue.sort(key=lambda x: x.get("renewal_date", ""))

    if bucket == "upcoming":
        rows = upcoming
    elif bucket == "overdue":
        rows = overdue
    else:
        rows = overdue + upcoming

    return {
        "renewals": rows,
        "stats": {
            "upcoming": len(upcoming),
            "overdue": len(overdue),
            "total": len(upcoming) + len(overdue),
            "window_days": RENEWAL_WINDOW_DAYS,
        },
    }


# ── LOST aggregation view ─────────────────────────────────────────────────
@router.get("/admin/future-skills/lost")
async def admin_list_lost(
    type_filter: str = Query("all", pattern=r"^(all|lead|trial|customer)$", alias="type"),
    q: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    def make_rx():
        return {"$regex": re.escape(q), "$options": "i"} if q else None
    rx = make_rx()

    rows: list = []

    if type_filter in ("all", "lead"):
        query: dict = {"status": "lost"}
        if rx:
            query["$or"] = [
                {"lead_ref": rx}, {"name": rx}, {"phone": rx}, {"email": rx},
            ]
        async for r in db.future_skills_leads.find(query, {"_id": 0}).sort("lost_at", -1).limit(500):
            r["entity_type"] = "lead"
            r["entity_ref"] = r.get("lead_ref")
            r["display_name"] = r.get("name")
            r["display_phone"] = r.get("phone")
            r["display_email"] = r.get("email")
            rows.append(r)

    if type_filter in ("all", "trial"):
        query = {"crm_status": "lost"}
        if rx:
            query["$or"] = [
                {"trial_ref": rx}, {"parent_name": rx}, {"student_name": rx},
                {"parent_phone": rx}, {"parent_email": rx},
            ]
        async for r in db.future_skills_trials.find(query, {"_id": 0}).sort("lost_at", -1).limit(500):
            r["entity_type"] = "trial"
            r["entity_ref"] = r.get("trial_ref")
            r["display_name"] = r.get("student_name") or r.get("parent_name")
            r["display_phone"] = r.get("parent_phone")
            r["display_email"] = r.get("parent_email")
            rows.append(r)

    if type_filter in ("all", "customer"):
        query = {"crm_status": "lost"}
        if rx:
            query["$or"] = [
                {"subscription_ref": rx}, {"parent_name": rx}, {"student_name": rx},
                {"parent_phone": rx}, {"parent_email": rx},
            ]
        async for r in db.future_skills_subscriptions.find(query, {"_id": 0}).sort("lost_at", -1).limit(500):
            r["entity_type"] = "customer"
            r["entity_ref"] = r.get("subscription_ref")
            r["display_name"] = r.get("student_name") or r.get("parent_name")
            r["display_phone"] = r.get("parent_phone")
            r["display_email"] = r.get("parent_email")
            rows.append(r)

    rows.sort(key=lambda x: x.get("lost_at") or "", reverse=True)

    return {"lost": rows, "stats": {"total": len(rows)}}


# ── STATS (tab badges) ────────────────────────────────────────────────────
@router.get("/admin/future-skills/stats")
async def admin_future_skills_stats(user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    now = datetime.now(timezone.utc)
    window_end = now + timedelta(days=RENEWAL_WINDOW_DAYS)

    leads_active = await db.future_skills_leads.count_documents({"status": {"$nin": ["lost", "converted"]}})
    trials_active = await db.future_skills_trials.count_documents({"crm_status": {"$nin": ["lost", "converted"]}})
    customers_active = await db.future_skills_subscriptions.count_documents({"crm_status": "active"})

    # Renewals — count computed
    active_subs = db.future_skills_subscriptions.find(
        {"crm_status": "active", "renewal_date": {"$nin": [None, ""]}},
        {"_id": 0, "renewal_date": 1},
    )
    upcoming = 0
    overdue = 0
    async for r in active_subs:
        ren = _parse_date(r.get("renewal_date"))
        if not ren:
            continue
        if ren < now:
            overdue += 1
        elif ren <= window_end:
            upcoming += 1

    lost_leads = await db.future_skills_leads.count_documents({"status": "lost"})
    lost_trials = await db.future_skills_trials.count_documents({"crm_status": "lost"})
    lost_customers = await db.future_skills_subscriptions.count_documents({"crm_status": "lost"})

    return {
        "leads": leads_active,
        "trials": trials_active,
        "customers": customers_active,
        "renewals": upcoming + overdue,
        "renewals_upcoming": upcoming,
        "renewals_overdue": overdue,
        "lost": lost_leads + lost_trials + lost_customers,
        "lost_breakdown": {
            "leads": lost_leads,
            "trials": lost_trials,
            "customers": lost_customers,
        },
    }

# ══════════════════════════════════════════════════════════════════════════
# CENTERS & BATCHES — public read + admin CRUD
# ══════════════════════════════════════════════════════════════════════════

class CenterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    address: Optional[str] = Field(default="", max_length=250)
    city: Optional[str] = Field(default="", max_length=80)
    phone: Optional[str] = Field(default="", max_length=20)
    is_active: Optional[bool] = True


class CenterUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class BatchCreate(BaseModel):
    center_id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=120)
    days: list[str] = Field(default_factory=list)
    start_time: Optional[str] = Field(default="", max_length=8)
    end_time: Optional[str] = Field(default="", max_length=8)
    skill: Optional[str] = Field(default="", max_length=80)
    capacity: Optional[int] = Field(default=15, ge=1, le=200)
    is_active: Optional[bool] = True


class BatchUpdate(BaseModel):
    center_id: Optional[str] = None
    name: Optional[str] = None
    days: Optional[list[str]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    skill: Optional[str] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None


async def _batch_student_count(batch_id: str) -> int:
    """Count of trials + active subscriptions linked to this batch."""
    n_trials = await db.future_skills_trials.count_documents({"batch_id": batch_id})
    n_subs = await db.future_skills_subscriptions.count_documents(
        {"batch_id": batch_id, "crm_status": "active"}
    )
    return n_trials + n_subs


# ── Public reads ──────────────────────────────────────────────────────────
@router.get("/future-skills/centers")
async def public_list_centers():
    cursor = db.future_skills_centers.find({"is_active": True}, {"_id": 0}).sort("name", 1)
    return {"centers": [c async for c in cursor]}


@router.get("/future-skills/batches")
async def public_list_batches(center_id: Optional[str] = Query(None)):
    query: dict = {"is_active": True}
    if center_id:
        query["center_id"] = center_id
    cursor = db.future_skills_batches.find(query, {"_id": 0}).sort("name", 1)
    rows = [b async for b in cursor]
    # Enrich with student counts and center names
    center_cache: dict = {}
    for b in rows:
        cid = b.get("center_id")
        if cid and cid not in center_cache:
            c = await db.future_skills_centers.find_one({"id": cid}, {"_id": 0, "name": 1, "city": 1})
            center_cache[cid] = c or {}
        cinfo = center_cache.get(cid, {})
        b["center_name"] = cinfo.get("name", "")
        b["center_city"] = cinfo.get("city", "")
        b["student_count"] = await _batch_student_count(b["id"])
    return {"batches": rows}


# ── Admin CRUD: Centers ───────────────────────────────────────────────────
@router.post("/admin/future-skills/centers")
async def admin_create_center(data: CenterCreate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    cid = str(uuid.uuid4())
    doc = {
        "id": cid,
        "name": data.name.strip(),
        "address": (data.address or "").strip(),
        "city": (data.city or "").strip(),
        "phone": (data.phone or "").strip(),
        "is_active": bool(data.is_active),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "created_by": user.get("email"),
    }
    await db.future_skills_centers.insert_one(doc)
    doc.pop("_id", None)
    return {"center": doc}


@router.get("/admin/future-skills/centers")
async def admin_list_centers(user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    cursor = db.future_skills_centers.find({}, {"_id": 0}).sort("created_at", -1)
    centers = [c async for c in cursor]
    # Attach batch count per center
    for c in centers:
        c["batch_count"] = await db.future_skills_batches.count_documents({"center_id": c["id"]})
    return {"centers": centers}


@router.patch("/admin/future-skills/centers/{cid}")
async def admin_update_center(cid: str, data: CenterUpdate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    update["updated_at"] = _now_iso()
    res = await db.future_skills_centers.update_one({"id": cid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Center not found")
    # If center name changed, refresh cached names on batches
    if "name" in update:
        await db.future_skills_batches.update_many(
            {"center_id": cid}, {"$set": {"center_name": update["name"]}}
        )
    c = await db.future_skills_centers.find_one({"id": cid}, {"_id": 0})
    return {"center": c}


@router.delete("/admin/future-skills/centers/{cid}")
async def admin_delete_center(cid: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    n_batches = await db.future_skills_batches.count_documents({"center_id": cid})
    if n_batches > 0:
        raise HTTPException(status_code=400, detail=f"Delete the {n_batches} batch(es) at this center first")
    res = await db.future_skills_centers.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Center not found")
    return {"deleted": True}


# ── Admin CRUD: Batches ───────────────────────────────────────────────────
@router.post("/admin/future-skills/batches")
async def admin_create_batch(data: BatchCreate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    center = await db.future_skills_centers.find_one({"id": data.center_id}, {"_id": 0})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
    bid = str(uuid.uuid4())
    doc = {
        "id": bid,
        "center_id": data.center_id,
        "center_name": center.get("name", ""),
        "name": data.name.strip(),
        "days": [d.strip() for d in (data.days or []) if d and d.strip()],
        "start_time": (data.start_time or "").strip(),
        "end_time": (data.end_time or "").strip(),
        "skill": (data.skill or "").strip(),
        "capacity": int(data.capacity or 15),
        "is_active": bool(data.is_active),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "created_by": user.get("email"),
    }
    await db.future_skills_batches.insert_one(doc)
    doc.pop("_id", None)
    doc["student_count"] = 0
    return {"batch": doc}


@router.get("/admin/future-skills/batches")
async def admin_list_batches(center_id: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    query: dict = {}
    if center_id:
        query["center_id"] = center_id
    cursor = db.future_skills_batches.find(query, {"_id": 0}).sort([("center_name", 1), ("name", 1)])
    batches = [b async for b in cursor]
    for b in batches:
        b["student_count"] = await _batch_student_count(b["id"])
    return {"batches": batches}


@router.patch("/admin/future-skills/batches/{bid}")
async def admin_update_batch(bid: str, data: BatchUpdate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if "center_id" in update:
        center = await db.future_skills_centers.find_one({"id": update["center_id"]}, {"_id": 0})
        if not center:
            raise HTTPException(status_code=404, detail="Center not found")
        update["center_name"] = center.get("name", "")
    update["updated_at"] = _now_iso()
    res = await db.future_skills_batches.update_one({"id": bid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Batch not found")
    b = await db.future_skills_batches.find_one({"id": bid}, {"_id": 0})
    if b:
        b["student_count"] = await _batch_student_count(bid)
    return {"batch": b}


@router.delete("/admin/future-skills/batches/{bid}")
async def admin_delete_batch(bid: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.future_skills_batches.delete_one({"id": bid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Batch not found")
    return {"deleted": True}

