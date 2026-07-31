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
import secrets
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
        "price": 2500.0,
        "billing_cycle": "monthly",
        "months": 1,
        "monthly_equivalent": 2500.0,
    },
    "half_yearly": {
        "label": "Half Yearly",
        "price": 13500.0,
        "billing_cycle": "half_yearly",
        "months": 6,
        "monthly_equivalent": 2250.0,
    },
    "yearly": {
        "label": "Yearly",
        "price": 24000.0,
        "billing_cycle": "yearly",
        "months": 12,
        "monthly_equivalent": 2000.0,
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
    if role in ("admin", "super_admin", "fs_center_owner"):
        return True
    # Team members with the "future_skills" permission granted by their role
    perms = (user or {}).get("permissions") or []
    if "future_skills" in perms:
        return True
    return email.endswith("@oll.co")


def _fs_scope_center_id(user: dict) -> Optional[str]:
    """Return the center_id a fs_center_owner is scoped to, or None for full admin."""
    if (user or {}).get("role") == "fs_center_owner":
        cid = user.get("center_id")
        return cid or None
    return None


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
    age_group: Optional[str] = Field(default="", max_length=16)
    city: Optional[str] = Field(default="", max_length=80)


class SubscriptionCreate(BaseModel):
    # Public /subscribe form has been slimmed down to the minimum needed
    # to route the enrolment: phone + student name + age group + centre +
    # batch. Parent name / email / grade are collected during post-payment
    # onboarding and stay optional here.
    parent_name: Optional[str] = Field(default="", max_length=120)
    parent_phone: str = Field(..., min_length=10, max_length=15)
    parent_email: Optional[str] = Field(default="", max_length=120)
    student_name: str = Field(..., min_length=2, max_length=120)
    student_grade: Optional[str] = Field(default="", max_length=8)
    preferred_center: Optional[str] = Field(default="", max_length=80)
    age_group: Optional[str] = Field(default="", max_length=16)
    center_id: Optional[str] = Field(default="", max_length=64)
    batch_id:  Optional[str] = Field(default="", max_length=64)
    plan: str = Field(..., pattern=r"^(monthly|yearly)$")
    notes: Optional[str] = Field(default="", max_length=500)
    source_ref: Optional[str] = Field(default="", max_length=64)


class PaymentInit(BaseModel):
    subscription_id: str
    frontend_url: Optional[str] = None


# ── SOURCE LINKS ──────────────────────────────────────────────────────────
class SourceLinkCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    slug: Optional[str] = Field(default="", max_length=64)  # auto-generated from name if empty
    notes: Optional[str] = Field(default="", max_length=500)


def _slugify(name: str) -> str:
    """Convert a display name into a URL-safe slug (lowercase, hyphens)."""
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s[:60] or "src"


async def _resolve_source_name(source_ref: Optional[str]) -> str:
    """If source_ref matches a source-link slug, return the display name;
    otherwise return the raw ref. Called on lead/trial/customer create."""
    ref = (source_ref or "").strip()
    if not ref:
        return ""
    link = await db.future_skills_source_links.find_one({"slug": ref}, {"_id": 0, "name": 1})
    return (link.get("name") if link else ref) or ref


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
        center_doc = await db.centers.find_one({"id": data.center_id}, {"_id": 0})
    if data.batch_id:
        batch_doc = await db.future_skills_batches.find_one({"id": data.batch_id}, {"_id": 0})
        if batch_doc and not center_doc:
            center_doc = await db.centers.find_one({"id": batch_doc.get("center_id")}, {"_id": 0})

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

    # Resolve source_ref (slug) → display source name for CRM
    source_display = await _resolve_source_name(data.source_ref)

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
        "source": source_display,
        "age_group": (data.age_group or "").strip(),
        "city": (data.city or "").strip(),
        "trial_status": "scheduled" if data.batch_id else "requested",
        "crm_status": "scheduled" if data.batch_id else "trial_lead",
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

    # Resolve centre + batch names so the CRM row displays cleanly without
    # extra lookups. Empty strings if not provided.
    centre_name = ""
    batch_name  = ""
    if data.center_id:
        c = await db.centers.find_one({"id": data.center_id}, {"_id": 0, "name": 1})
        if c: centre_name = c.get("name", "")
    if data.batch_id:
        b = await db.future_skills_batches.find_one({"id": data.batch_id}, {"_id": 0, "name": 1})
        if b: batch_name = b.get("name", "")

    doc = {
        "id": sub_id,
        "subscription_ref": sub_ref,
        "program_key": PROGRAM_KEY,
        "parent_name": (data.parent_name or "").strip(),
        "parent_phone": data.parent_phone.strip(),
        "parent_email": (data.parent_email or "").lower(),
        "student_name": data.student_name.strip(),
        "student_grade": (data.student_grade or "").strip(),
        "age_group": (data.age_group or "").strip(),
        "center_id": (data.center_id or "").strip(),
        "center_name": centre_name,
        "batch_id":  (data.batch_id  or "").strip(),
        "batch_name": batch_name,
        "preferred_center": (data.preferred_center or "").strip() or centre_name,
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


# ── Custom payment links (admin) ─────────────────────────────────────────
class CustomPaymentLinkBody(BaseModel):
    trial_id:        Optional[str] = Field(default=None, max_length=64)
    subscription_id: Optional[str] = Field(default=None, max_length=64)
    plan:            str           = Field(..., pattern=r"^(monthly|half_yearly|yearly)$")
    discount_pct:    float         = Field(default=0, ge=0, le=90)


async def _create_cashfree_link(sub: dict, frontend_url: str) -> dict:
    """Shared Cashfree order-creation logic used by /initiate-payment and the
    admin custom-payment-link endpoint. Persists the resulting session id +
    order id back on the subscription so verify + webhook still work.
    """
    order_id = f"FSP-{sub['id'][:8]}-{int(time.time())}"
    cf_name = (sub.get("parent_name") or sub.get("student_name") or "").strip() or "OLL Parent"
    if len(cf_name.replace(" ", "")) < 3:
        cf_name = "OLL Parent"
    raw_phone = sub.get("parent_phone") or "9999999999"
    cf_phone = re.sub(r"\D", "", raw_phone)
    if len(cf_phone) > 10:
        cf_phone = cf_phone[-10:]
    if len(cf_phone) < 10:
        cf_phone = "9999999999"

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
    return {"order_id": order_id, "payment_session_id": payment_session_id, "payment_link": payment_link}


@router.post("/admin/future-skills/payment-link")
async def admin_custom_payment_link(body: CustomPaymentLinkBody, user: dict = Depends(get_current_user)):
    """Generate a Cashfree payment link for a specific child (via a Free
    Trial doc OR an existing Renewal subscription). Applies an optional
    discount % to the plan amount. Response contains a shareable
    `payment_link` the admin can copy and send to the parent.
    """
    if not (_is_admin(user) or user.get("role") == "fs_center_owner"):
        raise HTTPException(status_code=403, detail="Not allowed")
    if not (body.trial_id or body.subscription_id):
        raise HTTPException(status_code=400, detail="Provide trial_id or subscription_id")

    plan_info = PLANS[body.plan]
    discount = float(body.discount_pct or 0)
    net_amount = round(plan_info["price"] * (1 - discount / 100), 2)

    if body.trial_id:
        trial = await db.future_skills_trials.find_one({"id": body.trial_id}, {"_id": 0})
        if not trial:
            raise HTTPException(status_code=404, detail="Trial not found")
        sub_id = str(uuid.uuid4())
        sub_ref = await _next_ref("FSP")
        now_iso = datetime.now(timezone.utc).isoformat()
        sub = {
            "id": sub_id,
            "subscription_ref": sub_ref,
            "program_key": PROGRAM_KEY,
            "parent_name":  trial.get("parent_name", ""),
            "parent_phone": trial.get("parent_phone", ""),
            "parent_email": trial.get("parent_email", ""),
            "student_name": trial.get("student_name", ""),
            "student_grade": trial.get("student_grade", ""),
            "age_group":   trial.get("age_group", ""),
            "center_id":   trial.get("center_id", ""),
            "center_name": trial.get("center_name", "") or trial.get("preferred_center", ""),
            "batch_id":    trial.get("batch_id", ""),
            "batch_name":  trial.get("batch_name", ""),
            "preferred_center": trial.get("preferred_center", ""),
            "source_ref": trial.get("source_ref", ""),
            "plan": body.plan,
            "plan_label": plan_info["label"],
            "billing_cycle": plan_info["billing_cycle"],
            "amount": net_amount,
            "amount_before_discount": plan_info["price"],
            "discount_pct": discount,
            "monthly_equivalent": plan_info["monthly_equivalent"],
            "kit_included": True,
            "payment_status": "pending",
            "crm_status": "subscription_lead",
            "trial_id": trial["id"],
            "created_at": now_iso,
            "updated_at": now_iso,
            "created_by_link": user.get("email"),
        }
        await db.future_skills_subscriptions.insert_one(sub)
    else:
        existing = await db.future_skills_subscriptions.find_one({"id": body.subscription_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Subscription not found")
        # For an existing (renewal) subscription, mutate amount + plan then
        # regenerate the Cashfree order so the copied link matches.
        await db.future_skills_subscriptions.update_one(
            {"id": body.subscription_id},
            {"$set": {
                "plan": body.plan,
                "plan_label": plan_info["label"],
                "billing_cycle": plan_info["billing_cycle"],
                "amount": net_amount,
                "amount_before_discount": plan_info["price"],
                "discount_pct": discount,
                "monthly_equivalent": plan_info["monthly_equivalent"],
                "payment_status": "pending",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        sub = await db.future_skills_subscriptions.find_one({"id": body.subscription_id}, {"_id": 0})

    frontend_url = os.getenv("FRONTEND_URL", "https://oll.co")
    try:
        result = await _create_cashfree_link(sub, frontend_url)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[future-skills] admin custom link failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed: {e}")

    # Create a short white-labeled token → hides the raw Cashfree URL so
    # parents receive an OLL-branded website link (e.g. https://oll.co/pay/<token>)
    # instead of `payments.cashfree.com/forms/...`.
    token = secrets.token_urlsafe(8)  # ~11 chars, URL-safe
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.custom_payment_links.insert_one({
        "token": token,
        "subscription_id": sub["id"],
        "payment_session_id": result["payment_session_id"],
        "order_id": result["order_id"],
        "student_name": sub.get("student_name", ""),
        "center_name": sub.get("center_name") or sub.get("preferred_center", ""),
        "batch_name": sub.get("batch_name", ""),
        "plan": body.plan,
        "plan_label": plan_info["label"],
        "amount": net_amount,
        "amount_before_discount": plan_info["price"],
        "discount_pct": discount,
        "created_at": now_iso,
        "created_by": user.get("email"),
    })

    return {
        "subscription_id": sub["id"],
        "subscription_ref": sub.get("subscription_ref"),
        "student_name": sub.get("student_name"),
        "amount": net_amount,
        "amount_before_discount": plan_info["price"],
        "discount_pct": discount,
        "plan": body.plan,
        "plan_label": plan_info["label"],
        "token": token,
        # NOTE: `payment_link` is kept for backwards-compat but callers should
        # prefer building the frontend URL from `token` on the client side.
        "payment_link": result["payment_link"],
    }


@router.get("/future-skills/pay/{token}")
async def get_custom_payment_link(token: str):
    """Public lookup for a white-labeled payment link. Returns the payment
    session id + minimal metadata the frontend redirect page needs to open
    the Cashfree checkout, plus a paid-status flag so already-paid links
    can be short-circuited to the success page.
    """
    doc = await db.custom_payment_links.find_one({"token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Payment link not found or expired")
    sub = await db.future_skills_subscriptions.find_one(
        {"id": doc["subscription_id"]},
        {"_id": 0, "payment_session_id": 1, "crm_status": 1, "payment_status": 1, "id": 1},
    ) or {}
    return {
        "token": token,
        "student_name": doc.get("student_name", ""),
        "center_name": doc.get("center_name", ""),
        "batch_name": doc.get("batch_name", ""),
        "plan": doc.get("plan"),
        "plan_label": doc.get("plan_label"),
        "amount": doc.get("amount"),
        "amount_before_discount": doc.get("amount_before_discount"),
        "discount_pct": doc.get("discount_pct", 0),
        "payment_session_id": sub.get("payment_session_id") or doc.get("payment_session_id"),
        "subscription_id": doc.get("subscription_id"),
        "already_paid": (sub.get("crm_status") == "active") or (sub.get("payment_status") == "paid"),
    }



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
    center_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    query: dict = {}
    # Trials list only shows actually booked trials — leads that haven't been
    # scheduled, lost trials, and converted trials live in their own tabs.
    BOOKED_STATUSES = ["scheduled", "trial_scheduled", "rescheduled", "completed"]
    if status and status != "all":
        if status == "scheduled":
            query["crm_status"] = {"$in": ["scheduled", "trial_scheduled"]}
        elif status == "completed":
            query["crm_status"] = "completed"
        else:
            query["crm_status"] = status
    else:
        query["crm_status"] = {"$in": BOOKED_STATUSES}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [
            {"trial_ref": rx}, {"student_name": rx}, {"parent_name": rx},
            {"parent_phone": rx}, {"parent_email": rx},
        ]
    scope_cid = _fs_scope_center_id(user)
    effective_cid = scope_cid or center_id
    if effective_cid:
        query["center_id"] = effective_cid
    cursor = db.future_skills_trials.find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    rows = [r async for r in cursor]
    scope_q = {"center_id": scope_cid} if scope_cid else {}
    total = await db.future_skills_trials.count_documents({**scope_q, "crm_status": {"$in": BOOKED_STATUSES}})
    scheduled_count   = await db.future_skills_trials.count_documents({**scope_q, "crm_status": {"$in": ["scheduled", "trial_scheduled"]}})
    rescheduled_count = await db.future_skills_trials.count_documents({**scope_q, "crm_status": "rescheduled"})
    completed_count   = await db.future_skills_trials.count_documents({**scope_q, "crm_status": "completed"})
    followup_count    = await db.future_skills_trials.count_documents({**scope_q, "crm_status": "followup"})
    return {
        "trials": rows,
        "stats": {
            "total": total,
            "scheduled": scheduled_count,
            "rescheduled": rescheduled_count,
            "completed": completed_count,
            "followup": followup_count,
        },
    }


@router.get("/admin/future-skills/subscriptions")
async def admin_list_subs(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    center_id: Optional[str] = Query(None),
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
    scope_cid = _fs_scope_center_id(user)
    effective_cid = scope_cid or center_id
    if effective_cid:
        query["center_id"] = effective_cid
    cursor = db.future_skills_subscriptions.find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    rows = [r async for r in cursor]
    scope_q = {"center_id": scope_cid} if scope_cid else {}
    total = await db.future_skills_subscriptions.count_documents(scope_q)
    active = await db.future_skills_subscriptions.count_documents({**scope_q, "crm_status": "active"})
    revenue_pipeline = await db.future_skills_subscriptions.aggregate([
        {"$match": {**scope_q, "crm_status": "active"}},
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
    center_id: Optional[str] = None
    batch_id: Optional[str] = None


@router.patch("/admin/future-skills/trials/{trial_id}")
async def admin_update_trial(trial_id: str, data: TrialUpdate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    # Enrich centre / batch name so the row display doesn't have to look them up
    if "center_id" in update and update["center_id"]:
        c = await db.centers.find_one({"id": update["center_id"]}, {"_id": 0, "name": 1, "location": 1})
        if c:
            update["center_name"] = c.get("name", "")
            update["preferred_center"] = c.get("name", "")
    if "batch_id" in update and update["batch_id"]:
        b = await db.future_skills_batches.find_one({"id": update["batch_id"]}, {"_id": 0, "name": 1})
        if b:
            update["batch_name"] = b.get("name", "")
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
    center_id: Optional[str] = None
    batch_id: Optional[str] = None


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
    # Enrich centre / batch names for the row display
    if "center_id" in update and update["center_id"]:
        c = await db.centers.find_one({"id": update["center_id"]}, {"_id": 0, "name": 1})
        if c:
            update["center_name"] = c.get("name", "")
            update["preferred_center"] = c.get("name", "")
    if "batch_id" in update and update["batch_id"]:
        b = await db.future_skills_batches.find_one({"id": update["batch_id"]}, {"_id": 0, "name": 1})
        if b:
            update["batch_name"] = b.get("name", "")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.future_skills_subscriptions.update_one({"id": sub_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub = await db.future_skills_subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return {"subscription": sub}


# ══════════════════════════════════════════════════════════════════════════
# LEADS · MANUAL ADD · IMPORT · RENEWALS · LOST
# ══════════════════════════════════════════════════════════════════════════
from fastapi import UploadFile, File, Form, Body
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


# ── SOURCE LINK ENDPOINTS ─────────────────────────────────────────────────
@router.get("/admin/future-skills/source-links")
async def admin_list_source_links(user: dict = Depends(get_current_user)):
    """Return all source links with rolled-up metrics.

    A source link creates a URL like `/future-skills/s/<slug>` that pre-tags any
    subsequent lead / trial / customer created from that landing hit. We roll
    up views, leads, trials, converted customers and lost outcomes per slug.
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    links = await db.future_skills_source_links.find({}, {"_id": 0}).sort("created_at", -1).to_list(None)
    for link in links:
        slug = link.get("slug", "")
        # Match by source (display name) OR source_ref (slug) so historical entries surface too
        name = link.get("name", "")
        q = {"$or": [{"source": name}, {"source_ref": slug}, {"source": slug}]}
        link["metrics"] = {
            "views":      int(link.get("views", 0) or 0),
            "leads":      await db.future_skills_leads.count_documents(q),
            "trials":     await db.future_skills_trials.count_documents(q),
            "converted":  await db.future_skills_subscriptions.count_documents({**q, "crm_status": "active"}),
            "lost":       (await db.future_skills_leads.count_documents({**q, "status": "lost"}))
                        + (await db.future_skills_trials.count_documents({**q, "crm_status": "lost"}))
                        + (await db.future_skills_subscriptions.count_documents({**q, "crm_status": "lost"})),
        }
    return {"source_links": links}


@router.post("/admin/future-skills/source-links")
async def admin_create_source_link(data: SourceLinkCreate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    slug = _slugify(data.slug or data.name)
    existing = await db.future_skills_source_links.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail=f"A source link with slug '{slug}' already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name.strip(),
        "slug": slug,
        "notes": (data.notes or "").strip(),
        "views": 0,
        "created_at": _now_iso(),
        "created_by": user.get("email"),
    }
    await db.future_skills_source_links.insert_one(doc)
    doc.pop("_id", None)
    return {"source_link": doc}


@router.delete("/admin/future-skills/source-links/{link_id}")
async def admin_delete_source_link(link_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.future_skills_source_links.delete_one({"id": link_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source link not found")
    return {"deleted": True}


@router.get("/public/future-skills/source-links/{slug}")
async def public_get_source_link(slug: str):
    """Public: look up a source link (used by landing page to display context)
    and register a landing-page view for that slug."""
    link = await db.future_skills_source_links.find_one({"slug": slug}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Source not found")
    await db.future_skills_source_links.update_one(
        {"slug": slug}, {"$inc": {"views": 1}, "$set": {"last_view_at": _now_iso()}},
    )
    return {"source_link": {"slug": link["slug"], "name": link["name"]}}


# ── LEADS ─────────────────────────────────────────────────────────────────
class LeadCreate(BaseModel):
    name: Optional[str] = Field(default="", max_length=120)
    phone: str = Field(..., min_length=6, max_length=20)
    email: Optional[str] = Field(default="", max_length=120)
    source: Optional[str] = Field(default="", max_length=80)
    city: Optional[str] = Field(default="", max_length=80)
    notes: Optional[str] = Field(default="", max_length=1000)
    child_age: Optional[str] = Field(default="", max_length=20)
    child_grade: Optional[str] = Field(default="", max_length=20)
    status: Optional[str] = Field(default="new", max_length=32)
    center_id: Optional[str] = Field(default="", max_length=64)
    batch_id: Optional[str] = Field(default="", max_length=64)


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
    center_id: Optional[str] = None
    batch_id: Optional[str] = None


@router.post("/admin/future-skills/leads")
async def admin_create_lead(data: LeadCreate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    lead_id = str(uuid.uuid4())
    lead_ref = await _next_ref("FSL")
    # Auto-scope: if user is a fs_center_owner, force their center_id
    scope_cid = _fs_scope_center_id(user)
    center_id_final = scope_cid or (data.center_id or "")
    # Resolve source: if user typed a known slug, expand to display name
    source_display = await _resolve_source_name(data.source) if data.source else ""
    doc = {
        "id": lead_id,
        "lead_ref": lead_ref,
        "program_key": PROGRAM_KEY,
        "name": (data.name or "").strip(),
        "phone": _norm_phone(data.phone),
        "email": (data.email or "").strip().lower(),
        "source": source_display or (data.source or "").strip(),
        "city": (data.city or "").strip(),
        "notes": (data.notes or "").strip(),
        "child_age": (data.child_age or "").strip(),
        "child_grade": (data.child_grade or "").strip(),
        "status": (data.status or "new").strip() or "new",
        "center_id": center_id_final,
        "batch_id": (data.batch_id or "").strip(),
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
    center_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    query: dict = {}
    if status and status != "all":
        if status == "active":
            query["status"] = {"$in": ["new", "followup"]}
        else:
            query["status"] = status
    else:
        # Default: only show leads that are still in play (exclude converted / lost)
        query["status"] = {"$in": ["new", "followup"]}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [
            {"lead_ref": rx}, {"name": rx}, {"phone": rx},
            {"email": rx}, {"source": rx}, {"city": rx},
        ]
    # Centre scope + filter
    scope_cid = _fs_scope_center_id(user)
    effective_cid = scope_cid or center_id
    if effective_cid:
        query["center_id"] = effective_cid
    cursor = db.future_skills_leads.find(query, {"_id": 0}).sort("created_at", -1).limit(1000)
    rows = [r async for r in cursor]
    scope_q = {"center_id": scope_cid} if scope_cid else {}
    total = await db.future_skills_leads.count_documents(scope_q)
    active = await db.future_skills_leads.count_documents({**scope_q, "status": {"$in": ["new", "followup"]}})
    new_count = await db.future_skills_leads.count_documents({**scope_q, "status": "new"})
    followup_count = await db.future_skills_leads.count_documents({**scope_q, "status": "followup"})
    lost = await db.future_skills_leads.count_documents({**scope_q, "status": "lost"})
    return {
        "leads": rows,
        "stats": {
            "total": total,
            "active": active,
            "new": new_count,
            "followup": followup_count,
            "lost": lost,
            "showing": len(rows),
        },
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
    reason_category: Optional[str] = Field(default="", max_length=120)


@router.post("/admin/future-skills/leads/{lead_id}/mark-lost")
async def admin_lead_mark_lost(lead_id: str, data: MarkLostBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.future_skills_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": "lost",
            "lost_reason": data.reason.strip(),
            "lost_reason_category": (data.reason_category or "").strip(),
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
        "center_id": lead.get("center_id", ""),
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


# ── FOLLOWUP (Leads & Trials) ─────────────────────────────────────────────
class FollowupBody(BaseModel):
    next_date: Optional[str] = Field(default="", max_length=40)  # ISO date/datetime
    note: Optional[str] = Field(default="", max_length=1000)
    outcome: Optional[str] = Field(default="", max_length=32)  # called|no_answer|interested|not_interested


async def _record_followup(collection, entity_id: str, data: "FollowupBody", user: dict, id_field: str = "id", status_field: Optional[str] = None):
    doc = await collection.find_one({id_field: entity_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Record not found")
    entry = {
        "at": _now_iso(),
        "by": user.get("email"),
        "next_date": (data.next_date or "").strip(),
        "note": (data.note or "").strip(),
        "outcome": (data.outcome or "").strip(),
    }
    update_set: dict = {
        "last_followup_at": entry["at"],
        "last_followup_note": entry["note"],
        "last_followup_outcome": entry["outcome"],
        "next_followup_date": entry["next_date"],
        "updated_at": _now_iso(),
    }
    # Auto-bump the entity's own status field to "followup" if it's still in a fresh
    # pipeline stage (respect "converted" / "lost" / "active" — don't downgrade).
    if status_field:
        current = (doc.get(status_field) or "").lower()
        if current in ("", "new", "scheduled", "rescheduled", "trial_lead", "trial_scheduled"):
            update_set[status_field] = "followup"
    await collection.update_one(
        {id_field: entity_id},
        {"$set": update_set, "$push": {"followups": entry}},
    )
    return await collection.find_one({id_field: entity_id}, {"_id": 0})


@router.post("/admin/future-skills/leads/{lead_id}/followup")
async def admin_lead_followup(lead_id: str, data: FollowupBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    lead = await _record_followup(db.future_skills_leads, lead_id, data, user, status_field="status")
    return {"lead": lead}


@router.post("/admin/future-skills/trials/{trial_id}/followup")
async def admin_trial_followup(trial_id: str, data: FollowupBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    # For trials we DO NOT auto-bump the crm_status — trials must stay in
    # scheduled / rescheduled / completed. Followup history is still captured.
    trial = await _record_followup(db.future_skills_trials, trial_id, data, user)
    return {"trial": trial}


@router.post("/admin/future-skills/customers/{sub_id}/followup")
async def admin_customer_followup(sub_id: str, data: FollowupBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    sub = await _record_followup(db.future_skills_subscriptions, sub_id, data, user)
    return {"subscription": sub}


# ── NOTES (Leads / Trials / Customers) ─────────────────────────────────
class NoteBody(BaseModel):
    note: str = Field(..., min_length=1, max_length=2000)


_NOTE_COLLECTIONS = {
    "lead":     ("future_skills_leads",         "lead"),
    "trial":    ("future_skills_trials",        "trial"),
    "customer": ("future_skills_subscriptions", "subscription"),
}


@router.post("/admin/future-skills/{entity_type}/{entity_id}/notes")
async def admin_add_note(entity_type: str, entity_id: str, data: NoteBody, user: dict = Depends(get_current_user)):
    """Add a note to a Lead, Trial or Customer. All notes are kept as a
    running log on `notes_log[]`, and the most recent one is mirrored to
    `last_note` / `last_note_at` so table rows can show it inline without
    an extra fetch."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    if entity_type not in _NOTE_COLLECTIONS:
        raise HTTPException(status_code=400, detail=f"Unknown entity type '{entity_type}'")
    coll_name, resp_key = _NOTE_COLLECTIONS[entity_type]
    coll = getattr(db, coll_name)

    doc = await coll.find_one({"id": entity_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=f"{entity_type.title()} not found")

    entry = {"at": _now_iso(), "by": user.get("email"), "note": data.note.strip()}
    await coll.update_one(
        {"id": entity_id},
        {
            "$set": {
                "last_note": entry["note"],
                "last_note_at": entry["at"],
                "last_note_by": entry["by"],
                "updated_at": _now_iso(),
            },
            "$push": {"notes_log": entry},
        },
    )
    updated = await coll.find_one({"id": entity_id}, {"_id": 0})
    return {resp_key: updated}


# ── DELETE (Leads / Trials / Customers) ────────────────────────────────
@router.delete("/admin/future-skills/{entity_type}/{entity_id}")
async def admin_delete_entity(entity_type: str, entity_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    if entity_type not in _NOTE_COLLECTIONS:
        raise HTTPException(status_code=400, detail=f"Unknown entity type '{entity_type}'")
    coll_name, _ = _NOTE_COLLECTIONS[entity_type]
    coll = getattr(db, coll_name)
    res = await coll.delete_one({"id": entity_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"deleted": True}


# ── MARK TRIAL ATTENDED ────────────────────────────────────────────────
@router.post("/admin/future-skills/trials/{trial_id}/attend")
async def admin_trial_attend(trial_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.future_skills_trials.update_one(
        {"id": trial_id},
        {"$set": {
            "trial_status": "attended",
            "crm_status": "completed",
            "attended_at": _now_iso(),
            "updated_at": _now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trial not found")
    trial = await db.future_skills_trials.find_one({"id": trial_id}, {"_id": 0})
    return {"trial": trial}


# ── RESCHEDULE TRIAL (row-action) ──────────────────────────────────────
class TrialRescheduleBody(BaseModel):
    scheduled_at: str = Field(..., min_length=1, max_length=40)
    batch_id: Optional[str] = Field(default="", max_length=64)
    note: Optional[str] = Field(default="", max_length=1000)


@router.post("/admin/future-skills/trials/{trial_id}/reschedule")
async def admin_trial_reschedule(trial_id: str, data: TrialRescheduleBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    trial = await db.future_skills_trials.find_one({"id": trial_id}, {"_id": 0})
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")

    batch_label = trial.get("batch_label", "")
    batch_id = (data.batch_id or trial.get("batch_id") or "").strip()
    if data.batch_id and data.batch_id != trial.get("batch_id"):
        b = await db.future_skills_batches.find_one({"id": data.batch_id}, {"_id": 0})
        if b:
            days = ",".join(b.get("days", []) or [])
            batch_label = f"{b.get('name','Batch')} · {days} · {b.get('start_time','')}-{b.get('end_time','')}"

    history_entry = {
        "at": _now_iso(),
        "by": user.get("email"),
        "prev_scheduled_at": trial.get("scheduled_at", ""),
        "new_scheduled_at": data.scheduled_at,
        "prev_batch_id": trial.get("batch_id", ""),
        "new_batch_id": batch_id,
        "note": (data.note or "").strip(),
    }
    await db.future_skills_trials.update_one(
        {"id": trial_id},
        {
            "$set": {
                "scheduled_at": data.scheduled_at,
                "batch_id": batch_id,
                "batch_label": batch_label,
                "trial_status": "rescheduled",
                "crm_status": "rescheduled",
                "updated_at": _now_iso(),
            },
            "$push": {"reschedules": history_entry},
        },
    )
    trial = await db.future_skills_trials.find_one({"id": trial_id}, {"_id": 0})
    return {"trial": trial}


# ── BOOK TRIAL FROM LEAD (row-action variant with centre / batch / date) ──
class LeadBookTrialBody(BaseModel):
    center_id: str = Field(..., min_length=1, max_length=64)
    batch_id: Optional[str] = Field(default="", max_length=64)
    scheduled_at: Optional[str] = Field(default="", max_length=40)


@router.post("/admin/future-skills/leads/{lead_id}/book-trial")
async def admin_lead_book_trial(lead_id: str, data: LeadBookTrialBody, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    lead = await db.future_skills_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    center = await db.centers.find_one({"id": data.center_id}, {"_id": 0})
    if not center:
        raise HTTPException(status_code=404, detail="Centre not found")

    batch_label = ""
    if data.batch_id:
        batch_doc = await db.future_skills_batches.find_one({"id": data.batch_id}, {"_id": 0})
        if batch_doc:
            days = ",".join(batch_doc.get("days", []) or [])
            batch_label = f"{batch_doc.get('name','Batch')} · {days} · {batch_doc.get('start_time','')}-{batch_doc.get('end_time','')}"

    trial_id = str(uuid.uuid4())
    trial_ref = await _next_ref("FST")
    trial_doc = {
        "id": trial_id,
        "trial_ref": trial_ref,
        "program_key": PROGRAM_KEY,
        "parent_name": lead.get("name", ""),
        "parent_phone": lead.get("phone", ""),
        "parent_email": lead.get("email", "") or f"{lead.get('phone','x')}@lead.oll.co",
        "student_name": lead.get("name", "") or "Student",
        "student_grade": lead.get("child_grade", ""),
        "student_age": lead.get("child_age", ""),
        "preferred_center": center.get("name", ""),
        "center_id": data.center_id,
        "batch_id": data.batch_id or "",
        "batch_label": batch_label,
        "preferred_skill": "",
        "notes": lead.get("notes", ""),
        "source_ref": lead.get("source", ""),
        "scheduled_at": (data.scheduled_at or "").strip(),
        "trial_status": "scheduled" if data.scheduled_at else "requested",
        "crm_status": "scheduled" if data.scheduled_at else "trial_lead",
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
        "center": "center_name", "centre": "center_name", "center_name": "center_name", "centre_name": "center_name",
        "age_group": "age_group", "age-group": "age_group", "agegroup": "age_group",
        "notes": "notes", "note": "notes", "remark": "notes", "remarks": "notes",
        "child_age": "child_age", "age": "child_age", "student_age": "child_age",
        "child_grade": "child_grade", "grade": "child_grade", "class": "child_grade", "student_grade": "child_grade",
    }
    cols = {c: alias_map.get(c, c) for c in df.columns}

    # Pre-load centres so we can map "center_name" from the CSV → center_id.
    # Case-insensitive match against `name`.
    centre_lookup: dict = {}
    async for c in db.centers.find({}, {"_id": 0, "id": 1, "name": 1}):
        cname = (c.get("name") or "").strip().lower()
        if cname:
            centre_lookup[cname] = {"id": c["id"], "name": c.get("name", "")}

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

            # Optional centre lookup (case-insensitive by name)
            centre_from_csv = (record.get("center_name") or "").strip().lower()
            centre_hit = centre_lookup.get(centre_from_csv) if centre_from_csv else None

            doc = {
                "id": lead_id,
                "lead_ref": lead_ref,
                "program_key": PROGRAM_KEY,
                "name": name,
                "phone": phone,
                "email": record.get("email", "").lower(),
                "source": record.get("source", "") or default_source,
                "city": record.get("city", ""),
                "age_group": record.get("age_group", ""),
                "center_id":   (centre_hit or {}).get("id", ""),
                "center_name": (centre_hit or {}).get("name", "") or record.get("center_name", ""),
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
    center_id: Optional[str] = Field(default="", max_length=64)
    batch_id: Optional[str] = Field(default="", max_length=64)


@router.post("/admin/future-skills/trials")
async def admin_create_trial(data: TrialCreateAdmin, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    trial_id = str(uuid.uuid4())
    trial_ref = await _next_ref("FST")
    scope_cid = _fs_scope_center_id(user)
    center_id_final = scope_cid or (data.center_id or "")

    # Resolve batch info if provided
    batch_label = ""
    if data.batch_id:
        batch_doc = await db.future_skills_batches.find_one({"id": data.batch_id}, {"_id": 0})
        if batch_doc:
            days = ",".join(batch_doc.get("days", []) or [])
            batch_label = f"{batch_doc.get('name','Batch')} · {days} · {batch_doc.get('start_time','')}-{batch_doc.get('end_time','')}"
            if not center_id_final and batch_doc.get("center_id"):
                center_id_final = batch_doc["center_id"]
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
        "center_id": center_id_final,
        "batch_id": data.batch_id or "",
        "batch_label": batch_label,
        "preferred_skill": (data.preferred_skill or "").strip(),
        "notes": (data.notes or "").strip(),
        "scheduled_at": (data.scheduled_at or "").strip(),
        "source_lead_id": (data.source_lead_id or "").strip(),
        "trial_status": "scheduled" if data.scheduled_at else "requested",
        "crm_status": "scheduled" if data.scheduled_at else "trial_lead",
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
            "lost_reason_category": (data.reason_category or "").strip(),
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
    payment_mode: Optional[str] = Field(default="", max_length=32)
    payment_status: Optional[str] = Field(default="paid", max_length=32)
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
        "center_id": trial.get("center_id", ""),
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
        "payment_mode": (data.payment_mode or "").strip(),
        "kit_included": True,
        "payment_status": (data.payment_status or "paid").strip() or "paid",
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
    parent_name: Optional[str] = Field(default="", max_length=120)
    parent_phone: str = Field(..., min_length=6, max_length=20)
    parent_email: Optional[str] = Field(default="", max_length=120)
    student_name: str = Field(..., min_length=1, max_length=120)
    student_grade: Optional[str] = Field(default="", max_length=20)
    student_age: Optional[str] = Field(default="", max_length=20)
    plan: str = Field(..., pattern=r"^(monthly|half_yearly|yearly)$")
    amount_paid: float = Field(..., ge=0)
    payment_date: Optional[str] = None
    renewal_date: Optional[str] = None
    preferred_center: Optional[str] = Field(default="", max_length=80)
    center_id: Optional[str] = Field(default="", max_length=64)
    batch_id: Optional[str] = Field(default="", max_length=64)
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

    scope_cid = _fs_scope_center_id(user)
    center_id_final = scope_cid or (data.center_id or "")

    # Resolve batch info if provided
    batch_label = ""
    if data.batch_id:
        batch_doc = await db.future_skills_batches.find_one({"id": data.batch_id}, {"_id": 0})
        if batch_doc:
            days = ",".join(batch_doc.get("days", []) or [])
            batch_label = f"{batch_doc.get('name','Batch')} · {days} · {batch_doc.get('start_time','')}-{batch_doc.get('end_time','')}"
            if not center_id_final and batch_doc.get("center_id"):
                center_id_final = batch_doc["center_id"]

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
        "student_age": (data.student_age or "").strip(),
        "preferred_center": (data.preferred_center or "").strip(),
        "center_id": center_id_final,
        "batch_id": data.batch_id or "",
        "batch_label": batch_label,
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
            "lost_reason_category": (data.reason_category or "").strip(),
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
    center_id: Optional[str] = Query(None),
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
    scope_cid = _fs_scope_center_id(user)
    effective_cid = scope_cid or center_id
    if effective_cid:
        base_query["center_id"] = effective_cid

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
    center_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    def make_rx():
        return {"$regex": re.escape(q), "$options": "i"} if q else None
    rx = make_rx()

    scope_cid = _fs_scope_center_id(user)
    effective_cid = scope_cid or center_id
    scope_q = {"center_id": effective_cid} if effective_cid else {}

    rows: list = []

    if type_filter in ("all", "lead"):
        query: dict = {"status": "lost", **scope_q}
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
        query = {"crm_status": "lost", **scope_q}
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
        query = {"crm_status": "lost", **scope_q}
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
async def admin_future_skills_stats(
    center_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    now = datetime.now(timezone.utc)
    window_end = now + timedelta(days=RENEWAL_WINDOW_DAYS)

    scope_cid = _fs_scope_center_id(user)
    effective_cid = scope_cid or center_id
    scope_q = {"center_id": effective_cid} if effective_cid else {}

    leads_active = await db.future_skills_leads.count_documents({**scope_q, "status": {"$in": ["new", "followup"]}})
    trials_active = await db.future_skills_trials.count_documents({**scope_q, "crm_status": {"$in": ["scheduled", "trial_scheduled", "rescheduled", "completed"]}})
    customers_active = await db.future_skills_subscriptions.count_documents({**scope_q, "crm_status": "active"})

    # Renewals — count computed
    active_subs = db.future_skills_subscriptions.find(
        {**scope_q, "crm_status": "active", "renewal_date": {"$nin": [None, ""]}},
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

    lost_leads = await db.future_skills_leads.count_documents({**scope_q, "status": "lost"})
    lost_trials = await db.future_skills_trials.count_documents({**scope_q, "crm_status": "lost"})
    lost_customers = await db.future_skills_subscriptions.count_documents({**scope_q, "crm_status": "lost"})

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
    # Optional owner-login credentials — creates a centre-user for this centre
    owner_email: Optional[str] = Field(default="", max_length=120)
    owner_name: Optional[str] = Field(default="", max_length=120)
    owner_password: Optional[str] = Field(default="", max_length=200)


class CenterUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    owner_email: Optional[str] = None
    owner_name: Optional[str] = None
    owner_password: Optional[str] = None  # setting this rotates the password


class BatchCreate(BaseModel):
    center_id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=120)
    days: list[str] = Field(default_factory=list)
    start_time: Optional[str] = Field(default="", max_length=8)
    end_time: Optional[str] = Field(default="", max_length=8)
    age_group: Optional[str] = Field(default="", pattern=r"^(3-7|8-11|12-16|)$")
    level: Optional[str] = Field(default="", pattern=r"^(beginner|intermediate|advanced|)$")
    capacity: Optional[int] = Field(default=15, ge=1, le=200)
    is_active: Optional[bool] = True


class BatchUpdate(BaseModel):
    center_id: Optional[str] = None
    name: Optional[str] = None
    days: Optional[list[str]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    age_group: Optional[str] = Field(default=None, pattern=r"^(3-7|8-11|12-16|)$")
    level: Optional[str] = Field(default=None, pattern=r"^(beginner|intermediate|advanced|)$")
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
    """Live centres available for booking — sourced from the shared /centers
    collection managed under Admin → Settings → Centres."""
    cursor = db.centers.find({"is_active": True}, {"_id": 0, "owner_password_hash": 0}).sort("name", 1)
    return {"centers": [c async for c in cursor]}


@router.get("/future-skills/batches")
async def public_list_batches(center_id: Optional[str] = Query(None)):
    query: dict = {"is_active": True}
    if center_id:
        query["center_id"] = center_id
    cursor = db.future_skills_batches.find(query, {"_id": 0}).sort("name", 1)
    rows = [b async for b in cursor]
    # Enrich with student counts and center names from shared centres collection
    center_cache: dict = {}
    for b in rows:
        cid = b.get("center_id")
        if cid and cid not in center_cache:
            c = await db.centers.find_one({"id": cid}, {"_id": 0, "name": 1, "city": 1})
            center_cache[cid] = c or {}
        cinfo = center_cache.get(cid, {})
        b["center_name"] = cinfo.get("name", "")
        b["center_city"] = cinfo.get("city", "")
        b["student_count"] = await _batch_student_count(b["id"])
    return {"batches": rows}


# ── Admin: Centres (read + set login only — full CRUD lives in Settings) ──
@router.get("/admin/future-skills/centers")
async def admin_list_centers(user: dict = Depends(get_current_user)):
    """Centres available for Future Skills — reads from the shared /centers
    collection. Full CRUD is managed under Admin → Settings → Centres so
    Future Skills does NOT allow adding/deleting from here."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    cursor = db.centers.find({}, {"_id": 0, "owner_password_hash": 0}).sort("name", 1)
    centers = [c async for c in cursor]
    for c in centers:
        c["batch_count"] = await db.future_skills_batches.count_documents({"center_id": c["id"]})
        c["has_login"] = bool(c.get("owner_email"))
    return {"centers": centers}


class CentreLoginUpdate(BaseModel):
    owner_email: Optional[str] = None
    owner_name: Optional[str] = None
    owner_password: Optional[str] = None
    clear_login: Optional[bool] = False


@router.patch("/admin/future-skills/centers/{cid}/login")
async def admin_set_center_login(cid: str, data: CentreLoginUpdate, user: dict = Depends(get_current_user)):
    """Attach / rotate / clear the Future Skills owner login on an existing centre."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    centre = await db.centers.find_one({"id": cid}, {"_id": 0})
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    if data.clear_login:
        await db.centers.update_one(
            {"id": cid},
            {"$unset": {"owner_email": "", "owner_name": "", "owner_password_hash": ""}},
        )
        return {"cleared": True}

    update: dict = {}
    if data.owner_email is not None:
        update["owner_email"] = data.owner_email.strip().lower()
    if data.owner_name is not None:
        update["owner_name"] = data.owner_name.strip()
    if data.owner_password:
        import bcrypt as _bcrypt
        update["owner_password_hash"] = _bcrypt.hashpw(
            data.owner_password.encode("utf-8"), _bcrypt.gensalt()
        ).decode("utf-8")

    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")

    await db.centers.update_one({"id": cid}, {"$set": update})
    centre = await db.centers.find_one({"id": cid}, {"_id": 0, "owner_password_hash": 0})
    centre["has_login"] = bool(centre.get("owner_email"))
    return {"center": centre}


# ── Admin CRUD: Batches ───────────────────────────────────────────────────
@router.post("/admin/future-skills/batches")
async def admin_create_batch(data: BatchCreate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    center = await db.centers.find_one({"id": data.center_id}, {"_id": 0})
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
        "age_group": (data.age_group or "").strip(),
        "level": (data.level or "").strip(),
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
        center = await db.centers.find_one({"id": update["center_id"]}, {"_id": 0})
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


# ══════════════════════════════════════════════════════════════════════════
# CUSTOMER IMPORT (CSV / XLSX)
# ══════════════════════════════════════════════════════════════════════════

@router.post("/admin/future-skills/customers/import")
async def admin_import_customers(
    file: UploadFile = File(...),
    center_id: str = Form(...),
    batch_id: str = Form(""),
    plan: str = Form("monthly"),
    user: dict = Depends(get_current_user),
):
    """Bulk import active customers.

    Every row inherits the centre + batch chosen in the popup.
    File must include at least parent_phone; other columns are optional.
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan_info = PLANS[plan]

    scope_cid = _fs_scope_center_id(user)
    effective_cid = scope_cid or center_id
    if not effective_cid:
        raise HTTPException(status_code=400, detail="Centre is required")

    centre = await db.centers.find_one({"id": effective_cid}, {"_id": 0})
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    batch_label = ""
    if batch_id:
        batch = await db.future_skills_batches.find_one({"id": batch_id}, {"_id": 0})
        if batch:
            days = ",".join(batch.get("days", []) or [])
            batch_label = f"{batch.get('name','Batch')} · {days} · {batch.get('start_time','')}-{batch.get('end_time','')}"

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

    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    alias_map = {
        "parent_name": "parent_name", "name": "parent_name",
        "parent_phone": "parent_phone", "phone": "parent_phone", "mobile": "parent_phone", "whatsapp": "parent_phone",
        "parent_email": "parent_email", "email": "parent_email", "mail": "parent_email",
        "student_name": "student_name", "child_name": "student_name", "kid_name": "student_name",
        "student_age": "student_age", "age": "student_age",
        "amount_paid": "amount_paid", "amount": "amount_paid", "paid": "amount_paid",
        "payment_date": "payment_date", "paid_on": "payment_date",
        "renewal_date": "renewal_date", "next_renewal": "renewal_date",
        "notes": "notes", "remarks": "notes",
    }

    inserted = 0
    skipped = 0
    errors: list = []

    for idx, row in df.iterrows():
        try:
            rec = {alias_map.get(c, c): str(row.get(c, "")).strip() for c in df.columns}
            phone = _norm_phone(rec.get("parent_phone", ""))
            if not phone:
                skipped += 1
                errors.append(f"Row {int(idx) + 2}: missing parent_phone")
                continue

            # Dedup by phone within this centre
            existing = await db.future_skills_subscriptions.find_one(
                {"parent_phone": phone, "center_id": effective_cid}, {"_id": 0, "id": 1}
            )
            if existing:
                skipped += 1
                continue

            now = datetime.now(timezone.utc)
            pay_dt = _parse_date(rec.get("payment_date")) or now
            ren_dt = _parse_date(rec.get("renewal_date")) or _add_months(pay_dt, plan_info["months"])

            try:
                amount_paid = float(rec.get("amount_paid") or plan_info["price"])
            except Exception:
                amount_paid = plan_info["price"]

            sub_id = str(uuid.uuid4())
            sub_ref = await _next_ref("FSP")
            doc = {
                "id": sub_id,
                "subscription_ref": sub_ref,
                "program_key": PROGRAM_KEY,
                "parent_name": rec.get("parent_name", "") or "",
                "parent_phone": phone,
                "parent_email": (rec.get("parent_email", "") or "").lower() or f"{sub_id[:8]}@customer.oll.co",
                "student_name": rec.get("student_name", "") or "",
                "student_age": rec.get("student_age", "") or "",
                "student_grade": "",
                "preferred_center": centre.get("name", ""),
                "center_id": effective_cid,
                "batch_id": batch_id or "",
                "batch_label": batch_label,
                "notes": rec.get("notes", "") or "",
                "source_ref": "import",
                "plan": plan,
                "plan_label": plan_info["label"],
                "billing_cycle": plan_info["billing_cycle"],
                "amount": plan_info["price"],
                "monthly_equivalent": plan_info["monthly_equivalent"],
                "amount_paid": amount_paid,
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
                "imported": True,
                "manually_added": True,
            }
            await db.future_skills_subscriptions.insert_one(doc)
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


# ══════════════════════════════════════════════════════════════════════════
# REPORTS
# ══════════════════════════════════════════════════════════════════════════

@router.get("/admin/future-skills/reports")
async def admin_future_skills_reports(
    center_id: Optional[str] = Query(None),
    month: Optional[str] = Query(None),  # YYYY-MM
    user: dict = Depends(get_current_user),
):
    """Roll-up analytics for the Future Skills program.

    * Funnel counts (leads → trials → paying customers) and conversion rates
    * Source breakdown for leads
    * Per-batch capacity fill, active customers, trials booked, and leads
    * Revenue (total + per active student) and plan breakdown

    Filterable by `center_id` (admin only — owners auto-scoped) and `month`
    (YYYY-MM) to constrain revenue / plan / created-at ranges.
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    scope_cid = _fs_scope_center_id(user)
    effective_cid = scope_cid or (center_id if center_id and center_id != "all" else None)
    scope_q: dict = {"center_id": effective_cid} if effective_cid else {}

    # ── Time window (based on `created_at` for leads/trials, `payment_date`
    #    for revenue). Month = current month if not provided.
    month_start: Optional[datetime] = None
    month_end: Optional[datetime] = None
    if month:
        try:
            month_start = datetime.strptime(month + "-01", "%Y-%m-%d").replace(tzinfo=timezone.utc)
            # First of next month
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
        except Exception:
            month_start = None
            month_end = None

    def month_range_q(field: str) -> dict:
        if not month_start or not month_end:
            return {}
        return {field: {"$gte": _iso(month_start), "$lt": _iso(month_end)}}

    # ── Funnel (respecting month if set on created_at) ────────────────
    lead_q = {**scope_q, **month_range_q("created_at")}
    trial_q = {**scope_q, **month_range_q("created_at")}
    active_sub_q = {**scope_q, "crm_status": "active"}
    # Revenue uses payment_date to catch when money came in
    rev_sub_q = {**scope_q, **month_range_q("payment_date")}

    leads_total = await db.future_skills_leads.count_documents(lead_q)
    leads_converted = await db.future_skills_leads.count_documents(
        {**lead_q, "status": "converted"}
    )
    # ONLY count booked-status trials so this matches the Free Trials tab
    # (a doc with status="requested" is a landing-page inquiry, not a booking;
    # "converted" and "lost" are surfaced under Customers / Lost respectively).
    BOOKED_TRIAL_STATUSES = ["scheduled", "trial_scheduled", "rescheduled", "completed"]
    trials_total = await db.future_skills_trials.count_documents(
        {**trial_q, "crm_status": {"$in": BOOKED_TRIAL_STATUSES}}
    )
    customers_active = await db.future_skills_subscriptions.count_documents(active_sub_q)

    # ── Renewals (active subs that renewed within the period) ────────
    # A renewal is any subscription whose `renewed_at` timestamp falls
    # inside the current period. Same doc can appear multiple times over
    # its lifetime (via `renewal_history[]`) but for the funnel we count
    # the latest renewal only — matching the Renewals tab.
    renewal_q: dict = {}
    if effective_cid:
        renewal_q["center_id"] = effective_cid
    if month_start:
        renewal_q["renewed_at"] = {"$gte": _iso(month_start), "$lt": _iso(month_end)}
    else:
        renewal_q["renewed_at"] = {"$exists": True, "$ne": None}
    renewals_count = await db.future_skills_subscriptions.count_documents(renewal_q)

    # ── Lost breakdowns (leads + trials + customers) ─────────────────
    async def _lost_breakdown(collection, status_field: str, extra_q: dict) -> dict:
        base = {**extra_q, status_field: "lost"}
        if month_start:
            base["lost_at"] = {"$gte": _iso(month_start), "$lt": _iso(month_end)}
        total = await collection.count_documents(base)
        pipeline = [
            {"$match": base},
            {"$group": {
                "_id": {
                    "$ifNull": [
                        "$lost_reason_category",
                        {"$ifNull": ["$lost_reason", "Unspecified"]},
                    ]
                },
                "count": {"$sum": 1},
            }},
            {"$sort": {"count": -1}},
        ]
        rows = []
        async for r in collection.aggregate(pipeline):
            rows.append({"reason": (r["_id"] or "Unspecified"), "count": r.get("count", 0)})
        return {"total": total, "by_reason": rows}

    lost_leads     = await _lost_breakdown(db.future_skills_leads,         "status",     lead_q  if lead_q  else {})
    lost_trials    = await _lost_breakdown(db.future_skills_trials,        "crm_status", trial_q if trial_q else {})
    lost_customers = await _lost_breakdown(db.future_skills_subscriptions, "crm_status", {"center_id": effective_cid} if effective_cid else {})

    def pct(n: int, d: int) -> float:
        return round((n / d) * 100, 1) if d > 0 else 0.0

    funnel = {
        "leads": leads_total,
        "trials": trials_total,
        "customers": customers_active,
        "renewals": renewals_count,
        "lead_to_trial_rate":       pct(leads_converted + trials_total, leads_total),
        "trial_to_customer_rate":   pct(customers_active, trials_total),
        "lead_to_customer_rate":    pct(customers_active, leads_total),
        "customer_to_renewed_rate": pct(renewals_count, customers_active),
    }

    # ── Source breakdown (for leads in period) ────────────────────────
    source_pipeline: list = [{"$match": lead_q}] if lead_q else []
    source_pipeline += [
        {"$group": {"_id": {"$ifNull": ["$source", ""]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    src_rows = await db.future_skills_leads.aggregate(source_pipeline).to_list(None)
    source_breakdown = [
        {"source": (r["_id"] or "Unknown"), "count": r["count"]}
        for r in src_rows
    ]

    # ── Revenue & Plan breakdown ──────────────────────────────────────
    plan_rows_cursor = db.future_skills_subscriptions.find(
        {**rev_sub_q, "amount_paid": {"$gt": 0}},
        {"_id": 0, "plan": 1, "amount_paid": 1, "amount": 1},
    )
    total_revenue = 0.0
    plan_counts: dict = {"monthly": 0, "half_yearly": 0, "yearly": 0}
    plan_revenue: dict = {"monthly": 0.0, "half_yearly": 0.0, "yearly": 0.0}
    revenue_students = 0
    async for r in plan_rows_cursor:
        amt = float(r.get("amount_paid") or r.get("amount") or 0)
        total_revenue += amt
        revenue_students += 1
        pk = (r.get("plan") or "monthly").lower()
        if pk in plan_counts:
            plan_counts[pk] += 1
            plan_revenue[pk] += amt

    plan_breakdown = [
        {
            "plan": k,
            "label": PLANS.get(k, {}).get("label", k.title()),
            "count": plan_counts[k],
            "revenue": round(plan_revenue[k], 2),
        }
        for k in ("monthly", "half_yearly", "yearly")
    ]
    revenue_per_student = round(total_revenue / revenue_students, 2) if revenue_students else 0.0

    # ── AOV (avg order value) + Profit Margin ─────────────────────────
    # AOV = total revenue / number of paying orders (each subscription row
    # in the period counts as one order).
    aov = round(total_revenue / revenue_students, 2) if revenue_students else 0.0

    # Profit margin uses Future-Skills costs mirrored in `school_expenses`
    # (see /centre-economics endpoints below). Filtered by centre + month
    # to stay consistent with the funnel above.
    cost_q: dict = {"program_key": PROGRAM_KEY}
    if effective_cid:
        cost_q["fs_center_id"] = effective_cid
    if month:
        cost_q["expense_date"] = {"$regex": f"^{month}"}
    total_fs_cost = 0.0
    async for c in db.school_expenses.find(cost_q, {"_id": 0, "amount": 1}):
        total_fs_cost += float(c.get("amount") or 0)
    fs_profit = total_revenue - total_fs_cost
    profit_margin_pct = round((fs_profit / total_revenue) * 100, 1) if total_revenue > 0 else 0.0

    # ── Per-batch report ──────────────────────────────────────────────
    batch_q: dict = {}
    if effective_cid:
        batch_q["center_id"] = effective_cid
    batches_cursor = db.future_skills_batches.find(batch_q, {"_id": 0}).sort(
        [("center_name", 1), ("name", 1)]
    )
    batches: list = []
    async for b in batches_cursor:
        bid = b["id"]
        cid = b.get("center_id", "")
        trials_count = await db.future_skills_trials.count_documents({"batch_id": bid})
        active_count = await db.future_skills_subscriptions.count_documents(
            {"batch_id": bid, "crm_status": "active"}
        )
        leads_at_centre = await db.future_skills_leads.count_documents({"center_id": cid}) if cid else 0

        capacity = int(b.get("capacity") or 15)
        fill = active_count + trials_count
        batches.append({
            **b,
            "student_count":  fill,
            "active_count":   active_count,
            "trials_count":   trials_count,
            "leads_at_centre": leads_at_centre,
            "capacity":       capacity,
            "fill_pct":       round((fill / capacity) * 100, 1) if capacity else 0,
        })

    return {
        "funnel": funnel,
        "source_breakdown": source_breakdown,
        "batches": batches,
        "revenue": {
            "total": round(total_revenue, 2),
            "students": revenue_students,
            "per_student": revenue_per_student,
            "by_plan": plan_breakdown,
            "aov": aov,
            "cost": round(total_fs_cost, 2),
            "profit": round(fs_profit, 2),
            "profit_margin_pct": profit_margin_pct,
        },
        "lost": {
            "leads":     lost_leads,
            "trials":    lost_trials,
            "customers": lost_customers,
        },
        "filters": {
            "center_id": effective_cid,
            "month": month if month_start else None,
        },
        "scope": {"center_id": scope_cid or None},
    }


# ══════════════════════════════════════════════════════════════════════════
# CENTRE ECONOMICS
# Track direct costs (Rent, Teacher Cost, Capex, Marketing, Other) per
# centre while mirroring every entry into the main `school_expenses`
# collection so central accounting stays unified.
# ══════════════════════════════════════════════════════════════════════════

# UI label → main-expenses category id. Kept in sync with EXPENSE_CATEGORIES
# defined in routes/expenses.py so P&L rollups stay coherent.
FS_ECONOMICS_CATEGORIES = {
    "rent":              {"label": "Rent",              "expense_category": "rent"},
    "teacher_cost":      {"label": "Teacher Cost",      "expense_category": "teacher_cost"},
    "capex":             {"label": "Capex",             "expense_category": "kit_cost"},
    "marketing":         {"label": "Marketing",         "expense_category": "marketing_cost"},
    "printing_gifts":    {"label": "Printing & Gifts",  "expense_category": "printing_certification"},
    "logistics":         {"label": "Logistics Cost",    "expense_category": "logistics_cost"},
    "other":             {"label": "Other",             "expense_category": "other"},
}


class CentreEconomicsBody(BaseModel):
    center_id: str = Field(..., min_length=1, max_length=64)
    category: str = Field(..., min_length=1, max_length=32)  # rent|teacher_cost|capex|marketing|other
    amount: float = Field(..., ge=0)
    expense_date: Optional[str] = Field(default="", max_length=20)  # YYYY-MM-DD
    description: Optional[str] = Field(default="", max_length=500)
    vendor_name: Optional[str] = Field(default="", max_length=120)
    other_label: Optional[str] = Field(default="", max_length=80)  # only for category=other


class CentreEconomicsUpdate(BaseModel):
    category: Optional[str] = Field(default=None, max_length=32)
    amount: Optional[float] = Field(default=None, ge=0)
    expense_date: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = Field(default=None, max_length=500)
    vendor_name: Optional[str] = Field(default=None, max_length=120)
    other_label: Optional[str] = Field(default=None, max_length=80)


def _fs_econ_check_permission(user: dict) -> None:
    """Guard for /admin/future-skills/centre-economics — allowed for
    admins/super_admins, centre owners (auto-scoped), or team users
    holding the `future_skills.economics` sub-permission.
    """
    if _is_admin(user):
        return
    perms = user.get("permissions") or []
    if "future_skills.economics" in perms:
        return
    raise HTTPException(status_code=403, detail="Not allowed")


@router.post("/admin/future-skills/centre-economics")
async def admin_centre_economics_create(
    body: CentreEconomicsBody, user: dict = Depends(get_current_user)
):
    """Create a centre-economics entry AND mirror it as a row in the main
    `school_expenses` collection so /admin/expenses & P&L see it.
    """
    _fs_econ_check_permission(user)

    cat_key = (body.category or "").strip().lower()
    if cat_key not in FS_ECONOMICS_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")

    # Scope check: centre owners can only write to their own centre
    scope_cid = _fs_scope_center_id(user)
    if scope_cid and scope_cid != body.center_id:
        raise HTTPException(status_code=403, detail="Cannot log economics for another centre")

    centre = await db.centers.find_one({"id": body.center_id}, {"_id": 0, "name": 1})
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    cat_info = FS_ECONOMICS_CATEGORIES[cat_key]
    now = _now_iso()
    exp_id = str(uuid.uuid4())
    exp_date = (body.expense_date or "").strip() or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    fs_label = body.other_label.strip() if cat_key == "other" and body.other_label else cat_info["label"]

    expense_doc = {
        "id": exp_id,
        # Central accounting fields — main /admin/expenses reads these.
        "school_id": "",
        "school_name": centre.get("name", "Centre"),
        "project_id": "",
        "project_name": "",
        "category": cat_info["expense_category"],
        "category_name": cat_info["label"],
        "amount": float(body.amount or 0),
        "description": (body.description or "").strip(),
        "expense_date": exp_date,
        "invoice_number": "",
        "vendor_name": (body.vendor_name or "").strip(),
        "payment_status": "paid",
        "payment_mode": "",
        "notes": "",
        "attachments": [],
        "invoice_file_url": "",
        # Future-Skills specific markers so we can round-trip edits and show
        # the row in the Centre Economics tab.
        "program_key": PROGRAM_KEY,
        "fs_center_id": body.center_id,
        "fs_center_name": centre.get("name", ""),
        "fs_category": cat_key,
        "fs_category_label": fs_label,
        "created_by": user.get("email"),
        "created_by_name": user.get("name"),
        "created_at": now,
        "updated_at": now,
    }

    await db.school_expenses.insert_one(expense_doc)
    expense_doc.pop("_id", None)
    return {"message": "Centre economics entry created", "entry": expense_doc}


@router.get("/admin/future-skills/centre-economics")
async def admin_centre_economics_list(
    center_id: Optional[str] = Query(None),
    month: Optional[str] = Query(None),  # YYYY-MM (optional)
    user: dict = Depends(get_current_user),
):
    """List centre-economics entries (from `school_expenses` where
    program_key=future_skills) and roll up per-centre revenue + costs +
    profit so the UI can render the Economics tab in one round trip.
    """
    _fs_econ_check_permission(user)

    scope_cid = _fs_scope_center_id(user)
    effective_cid = scope_cid or (center_id if center_id and center_id != "all" else None)

    q: dict = {"program_key": PROGRAM_KEY}
    if effective_cid:
        q["fs_center_id"] = effective_cid

    # Optional month filter (YYYY-MM prefix match on expense_date string)
    if month and re.match(r"^\d{4}-\d{2}$", month):
        q["expense_date"] = {"$regex": f"^{month}"}

    cursor = db.school_expenses.find(q, {"_id": 0}).sort("expense_date", -1).limit(2000)
    entries = await cursor.to_list(length=None)

    # ── Aggregate cost totals by category ────────────────────────────
    cost_totals = {k: 0.0 for k in FS_ECONOMICS_CATEGORIES.keys()}
    total_cost = 0.0
    for e in entries:
        cat = (e.get("fs_category") or "").lower()
        amt = float(e.get("amount") or 0)
        if cat in cost_totals:
            cost_totals[cat] += amt
        total_cost += amt

    # ── Revenue lookup (from paid subs, respecting scope + month) ────
    rev_q: dict = {"amount_paid": {"$gt": 0}}
    if effective_cid:
        rev_q["center_id"] = effective_cid
    if month and re.match(r"^\d{4}-\d{2}$", month):
        try:
            m_start = datetime.strptime(month + "-01", "%Y-%m-%d").replace(tzinfo=timezone.utc)
            m_end = m_start.replace(year=m_start.year + 1, month=1) if m_start.month == 12 else m_start.replace(month=m_start.month + 1)
            rev_q["payment_date"] = {"$gte": _iso(m_start), "$lt": _iso(m_end)}
        except Exception:
            pass

    revenue = 0.0
    paying_customers = 0
    async for r in db.future_skills_subscriptions.find(
        rev_q, {"_id": 0, "amount_paid": 1, "amount": 1}
    ):
        revenue += float(r.get("amount_paid") or r.get("amount") or 0)
        paying_customers += 1

    profit = revenue - total_cost
    margin = round((profit / revenue) * 100, 1) if revenue > 0 else 0.0

    # ── Per-centre roll-up (only when centre filter is not set) ──────
    per_centre: list = []
    if not effective_cid:
        cost_by_centre: dict = {}
        for e in entries:
            cid = e.get("fs_center_id") or ""
            if not cid:
                continue
            slot = cost_by_centre.setdefault(cid, {
                "center_id": cid,
                "center_name": e.get("fs_center_name") or e.get("school_name") or "Centre",
                "cost": 0.0,
                "revenue": 0.0,
            })
            slot["cost"] += float(e.get("amount") or 0)

        # Revenue per centre
        rev_group: list = [
            {"$match": {"amount_paid": {"$gt": 0}}},
        ]
        if "payment_date" in rev_q:
            rev_group[0]["$match"]["payment_date"] = rev_q["payment_date"]
        rev_group += [
            {"$group": {"_id": "$center_id", "revenue": {"$sum": "$amount_paid"}}},
        ]
        async for r in db.future_skills_subscriptions.aggregate(rev_group):
            cid = r.get("_id") or ""
            if not cid:
                continue
            slot = cost_by_centre.setdefault(cid, {
                "center_id": cid,
                "center_name": "Centre",
                "cost": 0.0,
                "revenue": 0.0,
            })
            slot["revenue"] = float(r.get("revenue") or 0)

        # Fill in centre names for revenue-only entries
        missing_ids = [k for k, v in cost_by_centre.items() if v["center_name"] == "Centre"]
        if missing_ids:
            async for c in db.centers.find({"id": {"$in": missing_ids}}, {"_id": 0, "id": 1, "name": 1}):
                cost_by_centre[c["id"]]["center_name"] = c.get("name") or "Centre"

        for v in cost_by_centre.values():
            v["profit"] = round(v["revenue"] - v["cost"], 2)
            v["margin"] = round((v["profit"] / v["revenue"]) * 100, 1) if v["revenue"] > 0 else 0.0
            v["cost"] = round(v["cost"], 2)
            v["revenue"] = round(v["revenue"], 2)
        per_centre = sorted(cost_by_centre.values(), key=lambda x: -x["revenue"])

    return {
        "entries": entries,
        "summary": {
            "revenue": round(revenue, 2),
            "cost": round(total_cost, 2),
            "profit": round(profit, 2),
            "margin_pct": margin,
            "paying_customers": paying_customers,
            "cost_by_category": {
                k: {"label": v["label"], "amount": round(cost_totals[k], 2)}
                for k, v in FS_ECONOMICS_CATEGORIES.items()
            },
        },
        "per_centre": per_centre,
        "filters": {
            "center_id": effective_cid,
            "month": month if q.get("expense_date") else None,
        },
        "scope": {"center_id": scope_cid or None},
    }


@router.patch("/admin/future-skills/centre-economics/{entry_id}")
async def admin_centre_economics_update(
    entry_id: str, body: CentreEconomicsUpdate, user: dict = Depends(get_current_user)
):
    _fs_econ_check_permission(user)

    existing = await db.school_expenses.find_one(
        {"id": entry_id, "program_key": PROGRAM_KEY}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Entry not found")

    scope_cid = _fs_scope_center_id(user)
    if scope_cid and existing.get("fs_center_id") != scope_cid:
        raise HTTPException(status_code=403, detail="Cannot edit another centre's entry")

    update: dict = {"updated_at": _now_iso()}

    if body.category is not None:
        cat_key = body.category.strip().lower()
        if cat_key not in FS_ECONOMICS_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category")
        info = FS_ECONOMICS_CATEGORIES[cat_key]
        update["fs_category"] = cat_key
        update["fs_category_label"] = info["label"]
        update["category"] = info["expense_category"]
        update["category_name"] = info["label"]

    if body.amount is not None:
        update["amount"] = float(body.amount)
    if body.expense_date is not None:
        update["expense_date"] = body.expense_date.strip()
    if body.description is not None:
        update["description"] = body.description.strip()
    if body.vendor_name is not None:
        update["vendor_name"] = body.vendor_name.strip()
    if body.other_label is not None:
        # Update the free-text label; if category is now 'other' use it, else
        # keep it stored but display uses the standard label.
        active_cat = update.get("fs_category") or existing.get("fs_category")
        if active_cat == "other" and body.other_label.strip():
            update["fs_category_label"] = body.other_label.strip()

    await db.school_expenses.update_one({"id": entry_id}, {"$set": update})
    return {"message": "Entry updated"}


# NOTE: uses a 3-segment path (`.../entry/{entry_id}`) to avoid clashing
# with the catch-all `DELETE /admin/future-skills/{entity_type}/{entity_id}`
# registered earlier in this file for leads / trials / customers.
@router.delete("/admin/future-skills/centre-economics/entry/{entry_id}")
async def admin_centre_economics_delete(
    entry_id: str, user: dict = Depends(get_current_user)
):
    _fs_econ_check_permission(user)

    existing = await db.school_expenses.find_one(
        {"id": entry_id, "program_key": PROGRAM_KEY}, {"_id": 0, "fs_center_id": 1}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Entry not found")

    scope_cid = _fs_scope_center_id(user)
    if scope_cid and existing.get("fs_center_id") != scope_cid:
        raise HTTPException(status_code=403, detail="Cannot delete another centre's entry")

    await db.school_expenses.delete_one({"id": entry_id, "program_key": PROGRAM_KEY})
    return {"message": "Entry deleted"}


@router.get("/admin/future-skills/centre-economics/categories")
async def admin_centre_economics_categories(user: dict = Depends(get_current_user)):
    _fs_econ_check_permission(user)
    return {
        "categories": [
            {"key": k, "label": v["label"], "expense_category": v["expense_category"]}
            for k, v in FS_ECONOMICS_CATEGORIES.items()
        ]
    }
