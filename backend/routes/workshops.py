"""
Workshops — 1-day event bookings (e.g., Father's Day Robotics Workshop).

Single workshop per slug. ₹1999 per ticket via Cashfree.
Each booking captures parent_phone, age_group (4-8 / 9-12), and center.
"""
import asyncio
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

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

# ── Workshop catalogue ────────────────────────────────────────────────────────
WORKSHOPS = {
    "fathers-day-robotics": {
        "key": "fathers-day-robotics",
        "title": "Father's Day Robotics Workshop",
        "date": "Sunday, 21 June 2026",
        "time": "3:00 PM – 6:00 PM",
        "price": 1999.0,
        "centers": {
            "mira_road": "Pizza Buffet · Mira Road",
        },
        "address": "Gate no 5, Pizza Buffet, Vardhaman Fantasy, Mira Bhayandar Rd, near Kali Mata mandir, Shivar Garden, Mira Road East, Mira Bhayandar, Maharashtra 401107",
        "map_url": "https://share.google/j0L250QOAJ6hACbfN",
        "age_groups": {
            "4-8": "Ages 4 – 8",
            "9-12": "Ages 9 – 12",
        },
        "age_group_times": {
            "4-8":  "11 AM – 1 PM",
            "9-12": "2 PM – 4 PM",
        },
    },
}


def _cf_client():
    if not CASHFREE_AVAILABLE or not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    cf_env = Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT.upper() == "PRODUCTION" else Cashfree.SANDBOX
    return Cashfree(cf_env)


def _workshop_or_404(slug: str):
    ws = WORKSHOPS.get(slug)
    if not ws:
        raise HTTPException(status_code=404, detail="Workshop not found")
    return ws


# ── Models ────────────────────────────────────────────────────────────────────
class WorkshopRegister(BaseModel):
    workshop_key: str
    parent_phone: str = Field(..., min_length=10, max_length=15)
    age_group: str    # "4-8" | "9-12"
    center: str       # "kandivali" | "mira_road"
    parent_name: Optional[str] = ""
    child_name: Optional[str] = ""
    parent_email: Optional[str] = ""
    source_ref: Optional[str] = ""
    additional_children: Optional[int] = 0


class PaymentInit(BaseModel):
    booking_id: str
    frontend_url: Optional[str] = ""


# ── Public list endpoint (for home-page Workshops section) ────────────────────
@router.get("/workshops")
async def list_workshops():
    """Returns active 1-day workshops to render on the home page."""
    return {"workshops": list(WORKSHOPS.values())}


@router.get("/workshops/{slug}")
async def get_workshop(slug: str):
    return _workshop_or_404(slug)


# ── Register ─────────────────────────────────────────────────────────────────
@router.post("/workshops/register")
async def register_workshop(data: WorkshopRegister):
    ws = _workshop_or_404(data.workshop_key)
    if data.age_group not in ws["age_groups"]:
        raise HTTPException(status_code=400, detail="Invalid age group")
    if data.center not in ws["centers"]:
        raise HTTPException(status_code=400, detail="Invalid center")

    phone = re.sub(r"\D", "", data.parent_phone)[-10:]

    # Dedup — same workshop + phone returns the existing booking
    existing = await db.workshop_bookings.find_one(
        {"workshop_key": data.workshop_key, "parent_phone": phone},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if existing and existing.get("payment_status") != "paid":
        # Refresh with the latest age/center/extras selection
        extras = int(data.additional_children or 0)
        new_amount = ws["price"] + (extras * 1499)
        await db.workshop_bookings.update_one(
            {"id": existing["id"]},
            {"$set": {
                "age_group": data.age_group,
                "center": data.center,
                "center_label": ws["centers"][data.center],
                "age_group_label": ws["age_groups"][data.age_group],
                "additional_children": extras,
                "amount": new_amount,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {"booking_id": existing["id"], "amount": new_amount}

    extras = int(data.additional_children or 0)
    total_amount = ws["price"] + (extras * 1499)
    booking_id = str(uuid.uuid4())
    doc = {
        "id": booking_id,
        "workshop_key": data.workshop_key,
        "workshop_title": ws["title"],
        "workshop_date": ws["date"],
        "workshop_time": ws["time"],
        "parent_phone": phone,
        "parent_name": (data.parent_name or "").strip(),
        "parent_email": (data.parent_email or "").lower().strip(),
        "child_name": (data.child_name or "").strip(),
        "age_group": data.age_group,
        "age_group_label": ws["age_groups"][data.age_group],
        "age_group_time":  ws["age_group_times"].get(data.age_group, ""),
        "center": data.center,
        "center_label": ws["centers"][data.center],
        "venue_address": ws.get("address", ""),
        "venue_map_url": ws.get("map_url", ""),
        "additional_children": extras,
        "amount": total_amount,
        "payment_status": "pending",
        "crm_status": "lead",
        "source_ref": (data.source_ref or "").strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workshop_bookings.insert_one(doc)
    logging.info(f"[workshop] booking created {booking_id} – {data.workshop_key} – {phone} – extras={extras} – amount={total_amount}")
    return {"booking_id": booking_id, "amount": total_amount}


# ── Cashfree payment init ─────────────────────────────────────────────────────
@router.post("/workshops/initiate-payment")
async def initiate_payment(data: PaymentInit):
    booking = await db.workshop_bookings.find_one({"id": data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Already paid")

    order_id = f"WS-{booking['id'][:8]}-{int(time.time())}"
    frontend_url = (data.frontend_url or os.getenv("FRONTEND_URL", "https://oll.co")).rstrip("/")

    cf_name = (booking.get("parent_name") or "").strip() or "OLL Parent"
    if len(cf_name.replace(" ", "")) < 3:
        cf_name = "OLL Parent"
    cf_phone = booking.get("parent_phone") or "9999999999"
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
            return_url=f"{frontend_url}/workshops/{booking['workshop_key']}/success?order_id={order_id}&booking_id={booking['id']}",
            notify_url=f"{frontend_url}/api/workshops/webhook",
        )
        req = CreateOrderRequest(
            order_id=order_id,
            order_amount=booking["amount"],
            order_currency="INR",
            customer_details=customer,
            order_meta=order_meta,
            order_note=f"{booking['workshop_title']} — {booking.get('age_group_label','')} — {booking.get('center_label','')}",
        )
        api_response = await asyncio.to_thread(
            _cf_client().PGCreateOrder, CASHFREE_API_VERSION, req, None, None
        )
        if not api_response.data:
            raise HTTPException(status_code=500, detail="Payment gateway error")

        psid = api_response.data.payment_session_id
        await db.workshop_bookings.update_one(
            {"id": booking["id"]},
            {"$set": {
                "order_id": order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "payment_session_id": psid,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {"order_id": order_id, "payment_session_id": psid}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[workshop] payment init failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Payment initiation failed: {e}")


# ── Verify (called from success page) ────────────────────────────────────────
@router.get("/workshops/verify/{booking_id}")
async def verify_payment(booking_id: str):
    booking = await db.workshop_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.get("payment_status") == "paid":
        return {"status": "PAID", "booking": booking}

    order_id = booking.get("order_id")
    if not order_id:
        return {"status": "pending", "booking": booking}

    try:
        resp = await asyncio.to_thread(_cf_client().PGFetchOrder, CASHFREE_API_VERSION, order_id, None)
        if resp.data and resp.data.order_status == "PAID":
            update = {
                "payment_status": "paid",
                "crm_status": "converted",
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.workshop_bookings.update_one({"id": booking_id}, {"$set": update})
            booking.update(update)
            return {"status": "PAID", "booking": booking}
        return {"status": resp.data.order_status if resp.data else "pending", "booking": booking}
    except Exception as e:
        logging.warning(f"[workshop] verify error: {e}")
        return {"status": booking.get("payment_status", "pending"), "booking": booking}


@router.post("/workshops/webhook")
async def workshop_webhook(request: Request):
    try:
        payload = await request.json()
        order = payload.get("data", {}).get("order", {})
        order_id = order.get("order_id")
        order_status = order.get("order_status")
        if order_id and order_status == "PAID":
            await db.workshop_bookings.update_one(
                {"order_id": order_id},
                {"$set": {
                    "payment_status": "paid",
                    "crm_status": "converted",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
        return {"ok": True}
    except Exception as e:
        logging.warning(f"[workshop] webhook error: {e}")
        return {"ok": False}



# ───────────────────────── ADMIN CRM ENDPOINTS ─────────────────────────

class WorkshopBookingPatch(BaseModel):
    crm_status: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None
    parent_name: Optional[str] = None
    child_name: Optional[str] = None
    parent_email: Optional[str] = None


def _serialize_booking(b: dict) -> dict:
    """Strip _id, ensure JSON-safe fields."""
    out = {k: v for k, v in b.items() if k != "_id"}
    return out


@router.get("/workshops/admin/bookings")
async def admin_list_workshop_bookings(
    workshop_key: Optional[str] = None,
    status: Optional[str] = None,            # "all" | "lead" | "paid"
    age_group: Optional[str] = None,
    center: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """
    Admin: list all workshop bookings.
    - `lead`   = phone captured, payment_status != paid
    - `paid`   = payment_status == paid
    - `all`    = everything
    """
    q: dict = {}
    if workshop_key:
        q["workshop_key"] = workshop_key

    if status == "lead":
        q["payment_status"] = {"$ne": "paid"}
    elif status == "paid":
        q["payment_status"] = "paid"

    if age_group:
        q["age_group"] = age_group
    if center:
        q["center"] = center
    if search:
        q["$or"] = [
            {"parent_phone": {"$regex": re.escape(search), "$options": "i"}},
            {"parent_name":  {"$regex": re.escape(search), "$options": "i"}},
            {"parent_email": {"$regex": re.escape(search), "$options": "i"}},
            {"child_name":   {"$regex": re.escape(search), "$options": "i"}},
        ]

    cursor = db.workshop_bookings.find(q, {"_id": 0}).sort("created_at", -1)
    rows = await cursor.to_list(length=2000)

    # Stats
    total = len(rows)
    paid_count = sum(1 for r in rows if r.get("payment_status") == "paid")
    lead_count = total - paid_count
    revenue = sum(int(r.get("amount") or 0) for r in rows if r.get("payment_status") == "paid")

    return {
        "bookings": rows,
        "stats": {
            "total":   total,
            "leads":   lead_count,
            "paid":    paid_count,
            "revenue": revenue,
        },
    }


@router.patch("/workshops/admin/bookings/{booking_id}")
async def admin_update_workshop_booking(
    booking_id: str,
    data: WorkshopBookingPatch,
    user: dict = Depends(get_current_user),
):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, detail="No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.workshop_bookings.update_one({"id": booking_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, detail="Booking not found")
    doc = await db.workshop_bookings.find_one({"id": booking_id}, {"_id": 0})
    return {"booking": doc}


@router.delete("/workshops/admin/bookings/{booking_id}")
async def admin_delete_workshop_booking(
    booking_id: str,
    user: dict = Depends(get_current_user),
):
    res = await db.workshop_bookings.delete_one({"id": booking_id})
    if res.deleted_count == 0:
        raise HTTPException(404, detail="Booking not found")
    return {"ok": True}


@router.get("/workshops/admin/bookings.csv")
async def admin_export_workshop_bookings_csv(
    workshop_key: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Export all (filtered) workshop bookings as CSV."""
    q: dict = {}
    if workshop_key:
        q["workshop_key"] = workshop_key
    if status == "lead":
        q["payment_status"] = {"$ne": "paid"}
    elif status == "paid":
        q["payment_status"] = "paid"

    cursor = db.workshop_bookings.find(q, {"_id": 0}).sort("created_at", -1)
    rows = await cursor.to_list(length=10000)

    header = [
        "Status", "Workshop", "Created", "Parent Name", "Parent Phone", "Parent Email",
        "Child Name", "Age Group", "Center", "Extra Children", "Amount (₹)",
        "Payment Status", "CRM Status", "Order ID", "Paid At", "Source",
    ]

    def fmt(v):
        if v is None:
            return ""
        s = str(v).replace('"', '""').replace("\n", " ")
        return f'"{s}"'

    lines = [",".join(header)]
    for r in rows:
        is_paid = r.get("payment_status") == "paid"
        lines.append(",".join([
            fmt("Paid Enrollment" if is_paid else "Lead"),
            fmt(r.get("workshop_title") or r.get("workshop_key")),
            fmt(r.get("created_at", "")[:19].replace("T", " ")),
            fmt(r.get("parent_name")),
            fmt(r.get("parent_phone")),
            fmt(r.get("parent_email")),
            fmt(r.get("child_name")),
            fmt(r.get("age_group_label") or r.get("age_group")),
            fmt(r.get("center_label")    or r.get("center")),
            fmt(r.get("additional_children") or 0),
            fmt(r.get("amount") or 0),
            fmt(r.get("payment_status")),
            fmt(r.get("crm_status")),
            fmt(r.get("order_id")),
            fmt((r.get("paid_at") or "")[:19].replace("T", " ")),
            fmt(r.get("source_ref")),
        ]))

    body = "\n".join(lines)
    filename = f"workshop-bookings-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.csv"
    return StreamingResponse(
        iter([body]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
