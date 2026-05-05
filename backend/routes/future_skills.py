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
        "monthly_equivalent": 2000.0,
    },
    "yearly": {
        "label": "Yearly",
        "price": 21000.0,
        "billing_cycle": "yearly",
        "monthly_equivalent": 1750.0,
    },
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
    parent_name: str = Field(..., min_length=2, max_length=120)
    parent_phone: str = Field(..., min_length=10, max_length=15)
    parent_email: EmailStr
    student_name: str = Field(..., min_length=2, max_length=120)
    student_grade: str = Field(..., min_length=1, max_length=8)
    preferred_center: Optional[str] = Field(default="", max_length=80)
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
    """Book a free trial class — pure lead capture, no payment."""
    trial_id = str(uuid.uuid4())
    trial_ref = await _next_ref("FST")
    norm_phone = data.parent_phone.strip()

    # Dedup on phone
    existing = await db.future_skills_trials.find_one({"parent_phone": norm_phone}, {"_id": 0})
    if existing:
        await db.future_skills_trials.update_one(
            {"id": existing["id"]},
            {"$set": {
                "return_count": existing.get("return_count", 1) + 1,
                "last_returned_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        return {
            "trial_id": existing["id"],
            "trial_ref": existing.get("trial_ref"),
            "is_existing": True,
        }

    doc = {
        "id": trial_id,
        "trial_ref": trial_ref,
        "program_key": PROGRAM_KEY,
        "parent_name": data.parent_name.strip(),
        "parent_phone": norm_phone,
        "parent_email": data.parent_email.lower(),
        "student_name": data.student_name.strip(),
        "student_grade": data.student_grade.strip(),
        "preferred_center": (data.preferred_center or "").strip(),
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
    logging.info(f"[future-skills] trial booked {trial_ref} - {data.student_name}")

    # Best-effort WhatsApp confirmation
    try:
        from .notifications import send_whatsapp_notification
        first_name = (data.student_name or "").split()[0] or "there"
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
