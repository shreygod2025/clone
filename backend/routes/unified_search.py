"""
Unified Student Search.

GET /api/students/unified-search?q=<name or phone or email>

Searches across ALL collections that hold a student/customer name + phone/email:
  - students                       (Center CRM students)
  - student_inquiries              (Funnel leads)
  - student_payments               (Cashfree-paid Center students)
  - demo_bookings                  (Demo bookings)
  - ai_foundations_bookings        (AI Foundations Cashfree-paid students)
  - summer_camp_bookings           (Summer Camp Cashfree-paid students)
  - workshop_bookings              (Workshop Cashfree-paid students — Father's Day etc.)
  - social_media_intern_registrations
  - inquiry_leads
  - future_skills_subscriptions
  - future_skills_trials

Returns a flat, normalized array so the Support UI can render a single list:
  [
    { source, source_label, id, name, phone, email, paid_amount?, status?, created_at?, link },
    ...
  ]

The Support panel uses this to autocomplete a customer when the admin types
a name or phone — including students who paid via Cashfree on any funnel.
"""
import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from .shared import db, get_current_user

router = APIRouter()


def _digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


# Collection name → human-readable source label + how to deep-link from the UI.
# `link` is a frontend route the admin can navigate to.
SEARCH_SOURCES = [
    ("students",                          "Student CRM",                "/admin/students"),
    ("student_inquiries",                 "Student Inquiry",            "/admin/students"),
    ("student_payments",                  "Cashfree · Center Payment",  "/admin/orders"),
    ("demo_bookings",                     "Demo Booking",               "/admin/students"),
    ("ai_foundations_bookings",           "Cashfree · AI Foundations",  "/admin/ai-foundations"),
    ("summer_camp_bookings",              "Cashfree · Summer Camp",     "/admin/orders"),
    ("workshop_bookings",                 "Cashfree · Workshop",        "/admin/future-skills"),
    ("social_media_intern_registrations", "SM Intern Registration",     "/admin/students"),
    ("inquiry_leads",                     "Inquiry Lead",               "/admin/students"),
    ("future_skills_subscriptions",       "Future Skills Subscription", "/admin/future-skills"),
    ("future_skills_trials",              "Future Skills Trial",        "/admin/future-skills"),
]

# Pre-built list of name/phone/email field aliases each collection might use.
NAME_FIELDS  = ["name", "student_name", "parent_name", "child_name", "full_name", "contact_name"]
PHONE_FIELDS = ["phone", "parent_phone", "student_phone", "contact_phone", "mobile", "whatsapp"]
EMAIL_FIELDS = ["email", "parent_email", "student_email", "contact_email"]


def _pick(rec: dict, fields: List[str]) -> str:
    for f in fields:
        v = rec.get(f)
        if v:
            return str(v)
    return ""


def _normalize(coll_name: str, source_label: str, link: str, rec: dict) -> dict:
    return {
        "source": coll_name,
        "source_label": source_label,
        "id": rec.get("id") or rec.get("_id") or rec.get("booking_id") or "",
        "name": _pick(rec, NAME_FIELDS),
        "phone": _pick(rec, PHONE_FIELDS),
        "email": _pick(rec, EMAIL_FIELDS),
        "paid_amount": rec.get("amount") or rec.get("paid_amount") or rec.get("total_amount") or rec.get("price"),
        "payment_status": rec.get("payment_status") or rec.get("status"),
        "status": rec.get("status"),
        "city": rec.get("city"),
        "skill": rec.get("skill") or rec.get("track") or rec.get("course") or rec.get("workshop_key"),
        "created_at": rec.get("created_at"),
        "link": link,
    }


@router.get("/students/unified-search")
async def unified_student_search(
    q: str = Query("", min_length=0, description="Free-text search (name, phone, email)"),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user),
):
    """Search across all student/customer-bearing collections."""
    q = (q or "").strip()
    if len(q) < 2:
        return {"query": q, "count": 0, "results": []}

    # Build $or query: case-insensitive regex on each name/email field
    # + last-10-digit regex on each phone field if q has any digits.
    q_safe = re.escape(q)
    or_clauses: List[dict] = []
    for f in NAME_FIELDS + EMAIL_FIELDS:
        or_clauses.append({f: {"$regex": q_safe, "$options": "i"}})

    digits = _digits(q)
    if digits and len(digits) >= 4:
        # Match phone field ending in the digits portion (handles +91 / leading 0)
        last_n = digits[-10:] if len(digits) > 10 else digits
        phone_regex = {"$regex": last_n + "$"}
        for f in PHONE_FIELDS:
            or_clauses.append({f: phone_regex})

    if not or_clauses:
        return {"query": q, "count": 0, "results": []}

    results: List[dict] = []
    per_source_cap = max(5, limit // len(SEARCH_SOURCES))

    for coll_name, source_label, link in SEARCH_SOURCES:
        try:
            coll = getattr(db, coll_name)
        except Exception:
            continue
        try:
            cursor = coll.find({"$or": or_clauses}, {"_id": 0}).limit(per_source_cap)
            docs = await cursor.to_list(per_source_cap)
        except Exception:
            continue
        for d in docs:
            results.append(_normalize(coll_name, source_label, link, d))

    # Dedupe by (name + phone OR email) so a student showing up in multiple
    # collections collapses into one row with all their source tags.
    grouped: dict = {}
    for r in results:
        key = (r["phone"] or "") + "|" + (r["email"] or "") + "|" + r["name"].lower().strip()
        if key in grouped:
            # merge sources
            existing = grouped[key]
            existing.setdefault("also_in", [])
            existing["also_in"].append({
                "source": r["source"], "source_label": r["source_label"],
                "paid_amount": r["paid_amount"], "status": r["status"],
                "link": r["link"],
            })
            # Keep the richest paid_amount / status (prefer a paid record over a lead)
            if not existing.get("paid_amount") and r.get("paid_amount"):
                existing["paid_amount"] = r["paid_amount"]
        else:
            grouped[key] = r

    final = list(grouped.values())[:limit]
    return {"query": q, "count": len(final), "results": final}
