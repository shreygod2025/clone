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

async def _resolve_center_label(center_id: str) -> str:
    """Resolve a center ID (UUID or legacy slug) to a human-readable label."""
    if not center_id:
        return ""
    doc = await db.centers.find_one({"id": center_id}, {"_id": 0, "name": 1, "area": 1, "city": 1})
    if doc:
        area = doc.get("area", "")
        city = doc.get("city", "")
        name = doc.get("name", center_id)
        if area and city:
            return f"{name} ({area}, {city})"
        return name
    return CENTERS.get(center_id, center_id)

BATCH_DATES = {
    "week1": {"weekday": "May 4-8, 2026 (Mon-Fri)"},
    "week2": {"weekday": "May 11-15, 2026 (Mon-Fri)"},
    "week3": {"weekday": "May 18-22, 2026 (Mon-Fri)"},
    "week4": {"weekday": "May 25-29, 2026 (Mon-Fri)"},
}


class SummerCampRegistration(BaseModel):
    child_name: str
    parent_name: Optional[str] = ""
    parent_phone: str
    parent_email: str
    age_group: str  # explorers | creators | innovators
    batch_type: str = "weekday"  # weekday only
    batch_week: str  # week1 | week2 | week3 | week4
    mode: str       # offline | online
    center: str     # mira_road | dombivli | andheri | online
    payment_mode: str  # cashfree | cash


class BookingUpdate(BaseModel):
    child_name: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None


class StatusUpdate(BaseModel):
    crm_status: str  # phone_captured | lead | hot_lead | converted | payment_offline | lost_lead
    lost_reason: Optional[str] = None  # phone_not_picking | not_available_dates | location_too_far | other


class CommentAdd(BaseModel):
    text: str
    author: Optional[str] = "Admin"


class PartialLeadCapture(BaseModel):
    parent_phone: str
    age_group: str
    batch_type: str
    batch_week: str
    mode: str
    center: str
    ref: Optional[str] = None          # tracking link slug


class CompleteLead(BaseModel):
    child_name: str
    parent_email: str
    payment_mode: str
    parent_name: Optional[str] = ""


class PaymentInitRequest(BaseModel):
    booking_id: str


class CreateTrackingLinkRequest(BaseModel):
    name: str


# ── helpers ────────────────────────────────────────────────────────────────────
import re

def _slugify(name: str) -> str:
    """Convert a name to a URL-safe slug."""
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower().strip())
    return slug.strip('-')[:40]


async def _increment_tracking(slug: str, field: str):
    """Safely increment a tracking counter. Silently ignores missing slugs."""
    if not slug:
        return
    await db.summer_camp_tracking_links.update_one(
        {"slug": slug},
        {"$inc": {field: 1}}
    )


# ─────────────────────────── TRACKING LINK ENDPOINTS ─────────────────────────

@router.get("/summer-camp/tracking-links")
async def list_tracking_links(user: dict = Depends(get_current_user)):
    links = await db.summer_camp_tracking_links.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return links


@router.post("/summer-camp/tracking-links")
async def create_tracking_link(data: CreateTrackingLinkRequest, user: dict = Depends(get_current_user)):
    base_slug = _slugify(data.name)
    if not base_slug:
        raise HTTPException(status_code=400, detail="Name is required")
    # Ensure uniqueness
    slug = base_slug
    suffix = 1
    while await db.summer_camp_tracking_links.find_one({"slug": slug}):
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    link_id = str(uuid.uuid4())
    doc = {
        "id": link_id,
        "name": data.name.strip(),
        "slug": slug,
        "views": 0,
        "leads": 0,
        "conversions": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.summer_camp_tracking_links.insert_one(doc)
    return {k: v for k, v in doc.items() if k != '_id'}


@router.delete("/summer-camp/tracking-links/{link_id}")
async def delete_tracking_link(link_id: str, user: dict = Depends(get_current_user)):
    result = await db.summer_camp_tracking_links.delete_one({"id": link_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    return {"message": "Deleted"}


@router.post("/summer-camp/track-view/{slug}")
async def track_view(slug: str):
    """Called by the landing page when loaded via a tracking link."""
    await _increment_tracking(slug, "views")
    return {"ok": True}


# ───────────────────────────────────────────────────────────────────────────────


@router.post("/summer-camp/capture-lead")
async def capture_lead(data: PartialLeadCapture):
    """Save a partial lead at the phone number step — before full details are entered."""
    ref_num = str(int(time.time()))[-6:]
    booking_ref = f"SC2026-{ref_num}"
    booking_id = str(uuid.uuid4())

    batch_dates = BATCH_DATES.get(data.batch_week, {}).get(data.batch_type, "")

    # Resolve tracking link name for display
    source_name = "Direct"
    if data.ref:
        link = await db.summer_camp_tracking_links.find_one({"slug": data.ref}, {"_id": 0})
        if link:
            source_name = link.get("name", data.ref)
            await _increment_tracking(data.ref, "leads")

    center_label = await _resolve_center_label(data.center)

    doc = {
        "id": booking_id,
        "booking_ref": booking_ref,
        "parent_phone": data.parent_phone,
        "child_name": "",
        "parent_name": "",
        "parent_email": "",
        "age_group": data.age_group,
        "age_group_label": AGE_GROUPS.get(data.age_group, {}).get("label", ""),
        "age_group_ages": AGE_GROUPS.get(data.age_group, {}).get("ages", ""),
        "batch_type": data.batch_type,
        "batch_week": data.batch_week,
        "batch_dates": batch_dates,
        "mode": data.mode,
        "center": data.center,
        "center_label": center_label,
        "payment_mode": "cashfree",
        "amount": CAMP_PRICE,
        "payment_status": "pending",
        "crm_status": "phone_captured",
        "source_ref": data.ref or "",
        "source_name": source_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.summer_camp_bookings.insert_one(doc)
    logging.info(f"Summer camp phone lead captured: {booking_ref} - {data.parent_phone} - source: {source_name}")
    return {"booking_id": booking_id, "booking_ref": booking_ref}


@router.patch("/summer-camp/complete-lead/{booking_id}")
async def complete_lead(booking_id: str, data: CompleteLead):
    """Update a phone-captured lead with full registration details."""
    booking = await db.summer_camp_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.summer_camp_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "child_name": data.child_name,
            "parent_name": data.parent_name or "",
            "parent_email": data.parent_email,
            "payment_mode": data.payment_mode,
            "crm_status": "lead",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {
        "booking_id": booking_id,
        "booking_ref": booking.get("booking_ref"),
        "payment_mode": data.payment_mode,
        "amount": CAMP_PRICE,
        "center_label": booking.get("center_label"),
        "batch_dates": booking.get("batch_dates"),
        "message": "Lead updated successfully",
    }


@router.post("/summer-camp/register")
async def register_summer_camp(data: SummerCampRegistration):
    """Register a summer camp booking — creates a lead record."""
    if data.age_group not in AGE_GROUPS:
        raise HTTPException(status_code=400, detail="Invalid age group")
    if data.batch_type not in ("weekday",):
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
    center_label = await _resolve_center_label(data.center)

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
        "center_label": center_label,
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
        "center_label": center_label,
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
    frontend_url = data.get("frontend_url") or os.getenv("FRONTEND_URL", "https://oll.co")

    parent_name = (booking.get("parent_name") or "").strip()
    child_name = (booking.get("child_name") or "").strip()
    # Use child_name as fallback; ensure minimum 3 non-space chars for Cashfree
    cf_name = parent_name or f"Parent {child_name}".strip() or "OLL Parent"
    if len(cf_name.replace(" ", "")) < 3:
        cf_name = "OLL Parent"

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
            order_id=order_id,  # Pass our order_id so Cashfree can be queried by it later
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
                if booking.get("source_ref"):
                    await _increment_tracking(booking["source_ref"], "conversions")
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
                # Increment conversion on tracking link
                if booking.get("source_ref"):
                    await _increment_tracking(booking["source_ref"], "conversions")
                logging.info(f"Summer camp payment confirmed via webhook: {order_id}")

        return {"status": "ok"}
    except Exception as e:
        logging.error(f"Summer camp webhook error: {e}")
        return {"status": "error"}


@router.get("/summer-camp/availability")
async def get_batch_availability(age_group: str, center: str):
    """Public: return spots_left per batch week for a given age_group + center combo."""
    SPOTS_PER_BATCH = 10
    result = {}
    for wk in ["week1", "week2", "week3", "week4"]:
        count = await db.summer_camp_bookings.count_documents({
            "batch_week": wk,
            "age_group": age_group,
            "center": center,
            "crm_status": {"$nin": ["lost_lead"]},
        })
        spots_left = max(0, SPOTS_PER_BATCH - int(count))
        result[wk] = {
            "booked": int(count),
            "spots_left": spots_left,
            "spots_total": SPOTS_PER_BATCH,
            "full": spots_left == 0,
        }
    return result


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


# ── CRM Management Endpoints ───────────────────────────────────────────────────

@router.patch("/summer-camp/bookings/{booking_id}")
async def update_booking(
    booking_id: str,
    data: BookingUpdate,
    user: dict = Depends(get_current_user)
):
    """Admin: edit booking details."""
    booking = await db.summer_camp_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.child_name is not None:
        update_fields["child_name"] = data.child_name
    if data.parent_name is not None:
        update_fields["parent_name"] = data.parent_name
    if data.parent_phone is not None:
        update_fields["parent_phone"] = data.parent_phone
    if data.parent_email is not None:
        update_fields["parent_email"] = data.parent_email

    await db.summer_camp_bookings.update_one({"id": booking_id}, {"$set": update_fields})
    updated = await db.summer_camp_bookings.find_one({"id": booking_id}, {"_id": 0})
    return updated


@router.delete("/summer-camp/bookings/{booking_id}")
async def delete_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Admin: delete a booking."""
    result = await db.summer_camp_bookings.delete_one({"id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking deleted"}


@router.patch("/summer-camp/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    data: StatusUpdate,
    user: dict = Depends(get_current_user)
):
    """Admin: update CRM status (phone_captured | lead | hot_lead | converted | payment_offline | lost_lead)."""
    valid = {"phone_captured", "lead", "hot_lead", "converted", "payment_offline", "lost_lead"}
    if data.crm_status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")

    update_fields: dict = {
        "crm_status": data.crm_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if data.crm_status == "lost_lead" and data.lost_reason:
        update_fields["lost_reason"] = data.lost_reason

    result = await db.summer_camp_bookings.update_one(
        {"id": booking_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"success": True, "crm_status": data.crm_status}


@router.post("/summer-camp/bookings/{booking_id}/comment")
async def add_booking_comment(
    booking_id: str,
    data: CommentAdd,
    user: dict = Depends(get_current_user)
):
    """Admin: add a comment to a booking."""
    comment = {
        "id": str(uuid.uuid4()),
        "text": data.text,
        "author": data.author or user.get("name", user.get("email", "Admin")),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.summer_camp_bookings.update_one(
        {"id": booking_id},
        {"$push": {"comments": comment}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return comment


@router.get("/summer-camp/dashboard")
async def get_summer_camp_dashboard(user: dict = Depends(get_current_user)):
    """Admin dashboard: week × age group × center breakdown, 10 spots per group."""
    SPOTS_PER_BATCH = 10

    AGE_GROUPS = [
        {"key": "explorers",  "label": "Little Explorers",  "ages": "4–8"},
        {"key": "creators",   "label": "Tech Creators",     "ages": "9–12"},
        {"key": "innovators", "label": "Future Innovators", "ages": "13–16"},
    ]

    WEEK_DATES = {
        "week1": "May 4–8, 2026",
        "week2": "May 11–15, 2026",
        "week3": "May 18–22, 2026",
        "week4": "May 25–29, 2026",
    }

    bookings = await db.summer_camp_bookings.find({}, {"_id": 0}).to_list(2000)

    # Build nested structure: week → age_group → {stats, by_center}
    data = {}
    for wk, wk_dates in WEEK_DATES.items():
        data[wk] = {
            "week": wk,
            "dates": wk_dates,
            "week_label": f"Week {wk[-1]}",
            "age_groups": {
                ag["key"]: {
                    "label": ag["label"],
                    "ages": ag["ages"],
                    "total": 0,
                    "converted": 0,
                    "leads": 0,
                    "phone_captured": 0,
                    "lost": 0,
                    "spots_total": SPOTS_PER_BATCH,
                    "by_center": {},
                }
                for ag in AGE_GROUPS
            },
        }

    for b in bookings:
        wk = b.get("batch_week")
        ag = b.get("age_group")
        if wk not in data or ag not in data[wk]["age_groups"]:
            continue

        cell = data[wk]["age_groups"][ag]
        cell["total"] += 1
        status = b.get("crm_status", "")
        if status in ("converted", "payment_offline"):
            cell["converted"] += 1
        elif status == "hot_lead":
            cell["leads"] += 1
        elif status == "lead":
            cell["leads"] += 1
        elif status == "phone_captured":
            cell["phone_captured"] += 1
        elif status == "lost_lead":
            cell["lost"] += 1

        # Center tracking (track full stats per center, not just count)
        center = b.get("center_label") or b.get("center") or "Unknown"
        if center not in cell["by_center"]:
            cell["by_center"][center] = {
                "total": 0, "converted": 0, "leads": 0,
                "phone_captured": 0, "lost": 0,
            }
        by_c = cell["by_center"][center]
        by_c["total"] += 1
        if status in ("converted", "payment_offline"):
            by_c["converted"] += 1
        elif status in ("lead", "hot_lead"):
            by_c["leads"] += 1
        elif status == "phone_captured":
            by_c["phone_captured"] += 1
        elif status == "lost_lead":
            by_c["lost"] += 1

    # Compute spots_left for each cell (aggregate) + per-center
    for wk_data in data.values():
        for ag_data in wk_data["age_groups"].values():
            ag_data["spots_left"] = max(0, SPOTS_PER_BATCH - ag_data["converted"])
            for by_c in ag_data["by_center"].values():
                by_c["spots_left"] = max(0, SPOTS_PER_BATCH - by_c["converted"])

    # Summary totals
    total_bookings = len(bookings)
    total_registrations = sum(1 for b in bookings)  # all bookings = registrations
    total_hot_leads = sum(1 for b in bookings if b.get("crm_status") == "hot_lead")
    total_leads = sum(1 for b in bookings if b.get("crm_status") == "lead")
    total_converted_online = sum(1 for b in bookings if b.get("crm_status") == "converted")
    total_converted_offline = sum(1 for b in bookings if b.get("crm_status") == "payment_offline")
    total_converted = total_converted_online + total_converted_offline
    total_revenue = total_converted_online * CAMP_PRICE  # Only online payments have actual revenue

    # Conversion funnel ratios
    reg_to_hot = round((total_hot_leads / total_registrations * 100), 1) if total_registrations else 0
    hot_to_conv = round((total_converted / max(total_hot_leads, 1) * 100), 1) if total_hot_leads else 0
    reg_to_conv = round((total_converted / total_registrations * 100), 1) if total_registrations else 0

    # Collect unique centers (excluding unknown/online)
    all_centers = sorted(set(
        b.get("center_label") or b.get("center") or "Unknown"
        for b in bookings
        if b.get("center_label") or b.get("center")
    ))

    return {
        "total_bookings": total_bookings,
        "total_revenue": total_revenue,
        "converted": total_converted,
        "converted_online": total_converted_online,
        "converted_offline": total_converted_offline,
        "hot_leads": total_hot_leads,
        "leads": total_leads,
        "funnel": {
            "registrations": total_registrations,
            "hot_leads": total_hot_leads,
            "converted": total_converted,
            "reg_to_hot_pct": reg_to_hot,
            "hot_to_conv_pct": hot_to_conv,
            "reg_to_conv_pct": reg_to_conv,
        },
        "centers": all_centers,
        "weeks": sorted(data.values(), key=lambda x: x["week"]),
        # Keep old age_summary for the revenue bar chart
        "age_summary": [
            {
                "age_group": ag["key"],
                "label": ag["label"],
                "total": sum(1 for b in bookings if b.get("age_group") == ag["key"]),
                "converted": sum(1 for b in bookings if b.get("age_group") == ag["key"] and b.get("crm_status") in ("converted", "payment_offline")),
                "revenue": sum(CAMP_PRICE for b in bookings if b.get("age_group") == ag["key"] and b.get("crm_status") == "converted"),
            }
            for ag in AGE_GROUPS
        ],
    }


# ─── Summer Camp Follow-Up Constants ───────────────────────────────────────────
# Cloudinary-hosted PDF brochure — permanent URL
SUMMER_CAMP_BROCHURE_URL = "https://res.cloudinary.com/dyssfvcmw/raw/upload/v1775712371/oll_documents/summer_camp_brochure_2026.pdf"
SUMMER_CAMP_BROCHURE_FILENAME = "Summer Camp Brochure 2026"


async def check_summer_camp_followups() -> None:
    """
    Scheduled job: Send a WhatsApp follow-up (with brochure PDF) to leads who
    entered their phone number but did NOT complete registration, after 5 minutes.
    Runs every 1 minute. Marks sent leads so they never receive a duplicate.
    """
    from .notifications import send_whatsapp_notification

    five_min_ago = datetime.now(timezone.utc).timestamp() - (5 * 60)

    try:
        # Find uncompleted leads: phone captured, no follow-up sent, older than 5 min
        cursor = db.summer_camp_bookings.find(
            {
                "crm_status": "phone_captured",
                "follow_up_wa_sent": {"$ne": True},
            },
            {"_id": 0, "id": 1, "parent_phone": 1, "child_name": 1, "created_at": 1}
        )
        bookings = await cursor.to_list(length=100)

        for booking in bookings:
            created_raw = booking.get("created_at", "")
            try:
                if isinstance(created_raw, str):
                    created_dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
                elif isinstance(created_raw, datetime):
                    created_dt = created_raw if created_raw.tzinfo else created_raw.replace(tzinfo=timezone.utc)
                else:
                    continue

                if created_dt.timestamp() > five_min_ago:
                    continue  # Not old enough yet

            except Exception as parse_err:
                print(f"[SC Followup] Could not parse created_at for {booking.get('id')}: {parse_err}")
                continue

            phone = booking.get("parent_phone", "")
            if not phone:
                continue

            # Mark as sent FIRST to prevent duplicates if the API call hangs
            await db.summer_camp_bookings.update_one(
                {"id": booking["id"]},
                {"$set": {
                    "follow_up_wa_sent": True,
                    "follow_up_wa_sent_at": datetime.now(timezone.utc).isoformat(),
                }}
            )

            result = await send_whatsapp_notification(
                phone=phone,
                template_key="summercamp_followup",
                params=[],
                user_name=booking.get("child_name", ""),
                media={
                    "url": SUMMER_CAMP_BROCHURE_URL,
                    "filename": SUMMER_CAMP_BROCHURE_FILENAME,
                }
            )
            print(f"[SC Followup] {'Sent' if result.get('success') else 'Failed'} for {phone} (id={booking['id']})")

    except Exception as e:
        print(f"[SC Followup] Scheduler error: {e}")
