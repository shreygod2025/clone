"""
Simple Partners — Referral & Influencer partner registry.

Both partner types share the same shape (name + contact + city + assigned
schools + notes) and differ only by a `type` discriminator. Neither
partner type gets a login account — they are contact records that the
admin can pin schools to and roll up revenue from.

Endpoints
─────────
POST   /simple-partners
GET    /simple-partners?type=referral|influencer
GET    /simple-partners/{partner_id}
PATCH  /simple-partners/{partner_id}
DELETE /simple-partners/{partner_id}
POST   /simple-partners/{partner_id}/schools       # replace assigned school ids
GET    /simple-partners/{partner_id}/kpis          # schools + revenue rollup
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from routes.shared import db, get_current_user

router = APIRouter(prefix="/simple-partners", tags=["simple-partners"])

_ALLOWED_TYPES = ("referral", "influencer")


def _to_iso(v):
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def _clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    for k in ("created_at", "updated_at"):
        if k in doc:
            doc[k] = _to_iso(doc[k])
    return doc


@router.post("")
async def create_partner(data: dict, user: dict = Depends(get_current_user)):
    ptype = (data.get("type") or "").strip().lower()
    if ptype not in _ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="type must be 'referral' or 'influencer'")
    if not (data.get("name") or "").strip():
        raise HTTPException(status_code=400, detail="Name is required")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "type": ptype,
        "name": (data.get("name") or "").strip(),
        "phone": (data.get("phone") or "").strip(),
        "email": (data.get("email") or "").strip(),
        "city": (data.get("city") or "").strip(),
        "social_handle": (data.get("social_handle") or "").strip(),
        "notes": (data.get("notes") or "").strip(),
        "school_ids": data.get("school_ids") or [],
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "created_by": user.get("id"),
    }
    await db.simple_partners.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_partners(
    type: str = Query(..., description="referral | influencer"),
    user: dict = Depends(get_current_user),
):
    ptype = (type or "").strip().lower()
    if ptype not in _ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="type must be 'referral' or 'influencer'")
    rows = await db.simple_partners.find({"type": ptype}).sort("created_at", -1).to_list(2000)
    return [_clean(r) for r in rows]


@router.get("/{partner_id}")
async def get_partner(partner_id: str, user: dict = Depends(get_current_user)):
    doc = await db.simple_partners.find_one({"id": partner_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Partner not found")
    return _clean(doc)


@router.patch("/{partner_id}")
async def update_partner(partner_id: str, data: dict, user: dict = Depends(get_current_user)):
    updatable = {"name", "phone", "email", "city", "social_handle", "notes", "is_active"}
    updates = {k: v for k, v in (data or {}).items() if k in updatable}
    if not updates:
        raise HTTPException(status_code=400, detail="No updatable fields provided")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.simple_partners.update_one({"id": partner_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    doc = await db.simple_partners.find_one({"id": partner_id})
    return _clean(doc)


@router.delete("/{partner_id}")
async def delete_partner(partner_id: str, user: dict = Depends(get_current_user)):
    r = await db.simple_partners.delete_one({"id": partner_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}


@router.post("/{partner_id}/schools")
async def set_schools(partner_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Replace the assigned schools for this partner. Body: {"school_ids": [...]}"""
    school_ids = data.get("school_ids") or []
    if not isinstance(school_ids, list):
        raise HTTPException(status_code=400, detail="school_ids must be a list")
    # Dedupe & keep only ids that actually exist.
    unique = list(dict.fromkeys(school_ids))
    existing = set()
    if unique:
        async for s in db.school_inquiries.find({"id": {"$in": unique}}, {"_id": 0, "id": 1}):
            existing.add(s["id"])
    filtered = [sid for sid in unique if sid in existing]
    r = await db.simple_partners.update_one(
        {"id": partner_id},
        {"$set": {"school_ids": filtered, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True, "school_ids": filtered}


@router.get("/{partner_id}/kpis")
async def partner_kpis(partner_id: str, user: dict = Depends(get_current_user)):
    """Return each assigned school and the total revenue rolled up across them."""
    partner = await db.simple_partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    school_ids: List[str] = partner.get("school_ids") or []
    schools = []
    revenue = 0.0
    total_students = 0
    if school_ids:
        cursor = db.school_inquiries.find(
            {"id": {"$in": school_ids}},
            {"_id": 0, "id": 1, "school_name": 1, "contact_name": 1, "phone": 1, "email": 1,
             "location": 1, "status": 1, "total_students": 1, "conversion_amount": 1,
             "board": 1, "fee_range": 1, "assigned_to_name": 1},
        )
        async for s in cursor:
            schools.append(s)
            revenue += float(s.get("conversion_amount") or 0)
            total_students += int(s.get("total_students") or 0)

    return {
        "partner_id": partner_id,
        "schools_count": len(schools),
        "revenue": round(revenue, 2),
        "total_students": total_students,
        "schools": schools,
    }
