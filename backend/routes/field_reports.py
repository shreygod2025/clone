"""Field Reports — team members log a *field day*: a check-in with
geolocation + selfie, followed by any number of school visits (each with
its own location, contact list, board/students/fees, robotics status)
and their meeting notes.

Data model
──────────
The whole session lives inside one `field_reports` document — check-in
kicks it off, school visits & meeting reports get appended over the day.
This keeps the "one field day, many stops" story readable in a single
Mongo find, and mirrors how a paper day-book would work.

Endpoints
─────────
    POST  /api/field-reports/checkin        → open a session
    PATCH /api/field-reports/{id}/checkout  → close the session
    POST  /api/field-reports/{id}/school-visits    → add a visit
    PATCH /api/field-reports/{id}/school-visits/{visit_id}
    POST  /api/field-reports/{id}/school-visits/{visit_id}/meeting
    GET   /api/field-reports                → list (scoped by role)
    GET   /api/field-reports/{id}           → single detail

Scope
─────
Non-admin users see only their own reports. Admin or role-permission
`field_reports_admin` sees the entire team's reports.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr

from .shared import db, get_current_user, has_field_visit_permission, get_managed_user_ids


router = APIRouter(tags=["field-reports"])


# ── Models ──────────────────────────────────────────────────────────
class Contact(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, max_length=80)


class CheckInIn(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_url: Optional[str] = None
    location_label: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=1000)


class CheckOutIn(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    end_notes: Optional[str] = Field(None, max_length=1000)


class SchoolVisitIn(BaseModel):
    school_name: str = Field(..., min_length=1, max_length=200)
    contacts: List[Contact] = []
    city: Optional[str] = Field(None, max_length=80)
    board: Optional[str] = Field(None, max_length=40)         # CBSE / ICSE / IB / State / Other
    student_count: Optional[str] = Field(None, max_length=40) # bucket eg "500-1000"
    fees_range: Optional[str] = Field(None, max_length=40)    # bucket
    has_robotics: Optional[str] = Field(None, max_length=8)   # 'yes' | 'no'
    robotics_provider: Optional[str] = Field(None, max_length=120)  # only when has_robotics == 'yes'
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[str] = Field(None, max_length=200)
    photo_url: Optional[str] = None       # mandatory selfie/photo of the visit
    got_entry: Optional[str] = Field(None, max_length=8)      # 'yes' | 'no' — did they meet anyone
    lead_interested: Optional[str] = Field(None, max_length=8)  # 'yes' | 'no'
    met_with: Optional[str] = Field(None, max_length=200)    # who did you meet (free text name)
    products_interested: List[str] = []   # OLL product ids/names
    notes: Optional[str] = Field(None, max_length=1000)


class MeetingIn(BaseModel):
    report: str = Field(..., min_length=1, max_length=4000)
    product_problems: Optional[str] = Field(None, max_length=2000)
    next_step: Optional[str] = Field(None, max_length=500)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_admin(user: dict) -> bool:
    return user.get("role") in ("admin", "super_admin") or (user.get("permissions") or []) and "field_reports_admin" in (user.get("permissions") or [])


# ── Endpoints ───────────────────────────────────────────────────────
@router.post("/field-reports/checkin")
async def create_checkin(payload: CheckInIn, user: dict = Depends(get_current_user)):
    """Open a new field-day session."""
    if not has_field_visit_permission(user):
        raise HTTPException(status_code=403, detail="Access denied.")
    uid = user.get("id") or user.get("user_id")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "user_name": user.get("name") or user.get("email"),
        "user_email": user.get("email"),
        "check_in": {
            "at": _now_iso(),
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "photo_url": payload.photo_url,
            "location_label": payload.location_label,
            "notes": payload.notes,
        },
        "check_out": None,
        "school_visits": [],
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.field_reports.insert_one(doc)
    doc.pop("_id", None)
    return doc


def _haversine_km(a_lat, a_lon, b_lat, b_lon) -> float:
    """Great-circle distance in km between two lat/lon points."""
    import math
    if None in (a_lat, a_lon, b_lat, b_lon):
        return 0.0
    R = 6371.0
    dLat = math.radians(b_lat - a_lat)
    dLon = math.radians(b_lon - a_lon)
    la1 = math.radians(a_lat); la2 = math.radians(b_lat)
    x = (math.sin(dLat/2) ** 2) + math.cos(la1) * math.cos(la2) * (math.sin(dLon/2) ** 2)
    return round(2 * R * math.asin(math.sqrt(x)), 2)


def _report_distance_km(report: dict) -> float:
    """Total distance travelled during the field day: check-in → visits in
    order → check-out. Missing coords contribute 0 for that leg."""
    pts = []
    ci = report.get("check_in") or {}
    if ci.get("latitude") is not None:
        pts.append((ci["latitude"], ci["longitude"]))
    for v in (report.get("school_visits") or []):
        if v.get("latitude") is not None:
            pts.append((v["latitude"], v["longitude"]))
    co = report.get("check_out") or {}
    if co.get("latitude") is not None:
        pts.append((co["latitude"], co["longitude"]))
    total = 0.0
    for i in range(1, len(pts)):
        total += _haversine_km(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1])
    return round(total, 2)


@router.patch("/field-reports/{report_id}/checkout")
async def check_out(report_id: str, payload: CheckOutIn, user: dict = Depends(get_current_user)):
    if not has_field_visit_permission(user):
        raise HTTPException(status_code=403, detail="Access denied.")
    r = await db.field_reports.find_one({"id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if not _is_admin(user) and r.get("user_id") != (user.get("id") or user.get("user_id")):
        raise HTTPException(status_code=403, detail="Access denied.")

    check_out = {"at": _now_iso(), "notes": payload.end_notes}
    if payload.latitude is not None: check_out["latitude"] = payload.latitude
    if payload.longitude is not None: check_out["longitude"] = payload.longitude

    r_after = {**r, "check_out": check_out}
    distance = _report_distance_km(r_after)

    await db.field_reports.update_one(
        {"id": report_id},
        {"$set": {
            "check_out": check_out,
            "distance_km": distance,
            "updated_at": _now_iso(),
        }},
    )
    fresh = await db.field_reports.find_one({"id": report_id}, {"_id": 0})
    return fresh


@router.post("/field-reports/{report_id}/school-visits")
async def add_school_visit(report_id: str, payload: SchoolVisitIn, user: dict = Depends(get_current_user)):
    if not has_field_visit_permission(user):
        raise HTTPException(status_code=403, detail="Access denied.")
    r = await db.field_reports.find_one({"id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if not _is_admin(user) and r.get("user_id") != (user.get("id") or user.get("user_id")):
        raise HTTPException(status_code=403, detail="Access denied.")

    visit = {
        "id": str(uuid.uuid4()),
        "at": _now_iso(),
        **payload.model_dump(),
        "meeting": None,
    }
    # Only seed a matching school_inquiry when the visitor marked the
    # lead as INTERESTED. Otherwise the visit stays in the field-report
    # history but doesn't clutter the sales pipeline with dead leads.
    inquiry_id = None
    if (visit.get("lead_interested") or "").lower() == "yes":
        try:
            existing = await db.school_inquiries.find_one(
                {"school_name": {"$regex": f"^{visit['school_name']}$", "$options": "i"},
                 "location":    visit.get("city") or ""},
                {"id": 1, "_id": 0},
            )
            if existing:
                inquiry_id = existing["id"]
            else:
                first_contact = (visit.get("contacts") or [{}])[0]
                new_inquiry = {
                    "id": str(uuid.uuid4()),
                    "school_name":  visit["school_name"],
                    "contact_name": first_contact.get("name") or "",
                    "phone":        first_contact.get("phone") or "",
                    "email":        first_contact.get("email") or "",
                    "location":     visit.get("city") or "",
                    "board":        visit.get("board") or "",
                    "status":       "new",
                    "school_contacts": [c for c in (visit.get("contacts") or []) if c.get("name")],
                    "programs_interested": list(visit.get("products_interested") or []),
                    "source":       "field_visit",
                    "field_report_id": report_id,
                    "field_visit_id": visit["id"],
                    "assigned_to":  r.get("user_id"),
                    "assigned_to_name": r.get("user_name"),
                    "added_by":     r.get("user_id"),
                    "created_at":   _now_iso(),
                    "updated_at":   _now_iso(),
                }
                await db.school_inquiries.insert_one(new_inquiry)
                inquiry_id = new_inquiry["id"]
        except Exception:
            # Never let a CRM sync failure block the field log.
            inquiry_id = None
    visit["school_inquiry_id"] = inquiry_id

    await db.field_reports.update_one(
        {"id": report_id},
        {"$push": {"school_visits": visit},
         "$set":  {"updated_at": _now_iso()}},
    )
    # Recompute total distance so KM traveled updates as visits happen.
    fresh = await db.field_reports.find_one({"id": report_id}, {"_id": 0})
    distance = _report_distance_km(fresh)
    await db.field_reports.update_one({"id": report_id}, {"$set": {"distance_km": distance}})
    return visit


@router.patch("/field-reports/{report_id}/school-visits/{visit_id}")
async def edit_visit(report_id: str, visit_id: str, payload: SchoolVisitIn, user: dict = Depends(get_current_user)):
    if not has_field_visit_permission(user):
        raise HTTPException(status_code=403, detail="Access denied.")
    r = await db.field_reports.find_one({"id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if not _is_admin(user) and r.get("user_id") != (user.get("id") or user.get("user_id")):
        raise HTTPException(status_code=403, detail="Access denied.")

    visits = r.get("school_visits") or []
    idx = next((i for i, v in enumerate(visits) if v.get("id") == visit_id), -1)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Visit not found")

    existing = visits[idx]
    updated_fields = payload.model_dump()
    # Preserve id, timestamps, and previously-linked inquiry id
    updated_fields["id"]                = existing.get("id")
    updated_fields["at"]                = existing.get("at")
    updated_fields["meeting"]           = existing.get("meeting")
    updated_fields["school_inquiry_id"] = existing.get("school_inquiry_id")

    if (updated_fields.get("lead_interested") or "").lower() == "yes" and not existing.get("school_inquiry_id"):
        try:
            first_contact = (updated_fields.get("contacts") or [{}])[0]
            new_inquiry = {
                "id":            str(uuid.uuid4()),
                "school_name":   updated_fields["school_name"],
                "contact_name":  first_contact.get("name") or "",
                "phone":         first_contact.get("phone") or "",
                "email":         first_contact.get("email") or "",
                "location":      updated_fields.get("city") or "",
                "board":         updated_fields.get("board") or "",
                "status":        "new",
                "school_contacts": [c for c in (updated_fields.get("contacts") or []) if c.get("name")],
                "programs_interested": list(updated_fields.get("products_interested") or []),
                "source":        "field_visit",
                "field_report_id": report_id,
                "field_visit_id": visit_id,
                "assigned_to":   r.get("user_id"),
                "assigned_to_name": r.get("user_name"),
                "added_by":      r.get("user_id"),
                "created_at":    _now_iso(),
                "updated_at":    _now_iso(),
            }
            await db.school_inquiries.insert_one(new_inquiry)
            updated_fields["school_inquiry_id"] = new_inquiry["id"]
        except Exception:
            pass

    visits[idx] = updated_fields
    await db.field_reports.update_one(
        {"id": report_id},
        {"$set": {"school_visits": visits, "updated_at": _now_iso()}},
    )
    return updated_fields


@router.post("/field-reports/{report_id}/school-visits/{visit_id}/meeting")
async def upsert_meeting(report_id: str, visit_id: str, payload: MeetingIn, user: dict = Depends(get_current_user)):
    if not has_field_visit_permission(user):
        raise HTTPException(status_code=403, detail="Access denied.")
    r = await db.field_reports.find_one({"id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if not _is_admin(user) and r.get("user_id") != (user.get("id") or user.get("user_id")):
        raise HTTPException(status_code=403, detail="Access denied.")
    meeting = {
        "at": _now_iso(),
        **payload.model_dump(),
    }
    result = await db.field_reports.update_one(
        {"id": report_id, "school_visits.id": visit_id},
        {"$set": {"school_visits.$.meeting": meeting, "updated_at": _now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visit not found")
    return {"ok": True, "meeting": meeting}


@router.get("/field-reports")
async def list_field_reports(
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    if not has_field_visit_permission(user):
        raise HTTPException(status_code=403, detail="Access denied.")

    query: dict = {}
    uid = user.get("id") or user.get("user_id")
    if not _is_admin(user):
        managed_ids = await get_managed_user_ids(uid)
        allowed_uids = [uid] + managed_ids
        if user_id:
            if user_id in allowed_uids:
                query["user_id"] = user_id
            else:
                raise HTTPException(status_code=403, detail="Access denied.")
        else:
            query["user_id"] = {"$in": allowed_uids}
    elif user_id:
        query["user_id"] = user_id
    if start_date or end_date:
        dr: dict = {}
        if start_date: dr["$gte"] = start_date
        if end_date:   dr["$lte"] = end_date
        query["created_at"] = dr
    rows = await db.field_reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@router.get("/field-reports/{report_id}")
async def get_field_report(report_id: str, user: dict = Depends(get_current_user)):
    if not has_field_visit_permission(user):
        raise HTTPException(status_code=403, detail="Access denied.")
    r = await db.field_reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    uid = user.get("id") or user.get("user_id")
    if not _is_admin(user) and r.get("user_id") != uid:
        managed = await get_managed_user_ids(uid)
        if r.get("user_id") not in managed:
            raise HTTPException(status_code=403, detail="Access denied.")
    return r


# ── Delete endpoints (admin OR owner OR manager) ────────────────────
@router.delete("/field-reports/{report_id}")
async def delete_field_report(report_id: str, user: dict = Depends(get_current_user)):
    """Delete an entire field-day session (check-in + all school visits)."""
    if not has_field_visit_permission(user):
        raise HTTPException(status_code=403, detail="Access denied.")
    r = await db.field_reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    uid = user.get("id") or user.get("user_id")
    is_owner = (r.get("user_id") == uid)
    is_admin = _is_admin(user)
    managed = await get_managed_user_ids(uid)
    is_manager = r.get("user_id") in managed
    if not is_admin and not is_owner and not is_manager:
        raise HTTPException(status_code=403, detail="Access denied.")
    await db.field_reports.delete_one({"id": report_id})
    return {"ok": True, "deleted_id": report_id}


@router.delete("/field-reports/{report_id}/school-visits/{visit_id}")
async def delete_school_visit(report_id: str, visit_id: str, user: dict = Depends(get_current_user)):
    """Remove a single school visit from a field report."""
    if not has_field_visit_permission(user):
        raise HTTPException(status_code=403, detail="Access denied.")
    r = await db.field_reports.find_one({"id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    uid = user.get("id") or user.get("user_id")
    is_owner = (r.get("user_id") == uid)
    is_admin = _is_admin(user)
    managed = await get_managed_user_ids(uid)
    is_manager = r.get("user_id") in managed
    if not is_admin and not is_owner and not is_manager:
        raise HTTPException(status_code=403, detail="Access denied.")
    visits = [v for v in (r.get("school_visits") or []) if v.get("id") != visit_id]
    if len(visits) == len(r.get("school_visits") or []):
        raise HTTPException(status_code=404, detail="Visit not found")
    await db.field_reports.update_one(
        {"id": report_id},
        {"$set": {"school_visits": visits, "updated_at": _now_iso()}},
    )
    return {"ok": True, "deleted_visit_id": visit_id, "remaining": len(visits)}


# ── Simple email sender (used by the field visit "Send Email" action) ──
class EmailIn(BaseModel):
    to: EmailStr
    subject: str = Field(..., min_length=1, max_length=500)
    body_html: Optional[str] = None
    body_text: Optional[str] = None


@router.post("/emails/send")
async def send_email(payload: EmailIn, user: dict = Depends(get_current_user)):
    """Best-effort send via Resend. Records an outbox row regardless."""
    import os, httpx as _httpx
    resend_key = os.environ.get("RESEND_API_KEY", "")
    sender = os.environ.get("SENDER_EMAIL", "OLL Team <welcome@oll.co>")
    outbox = {
        "id": str(uuid.uuid4()),
        "to": payload.to,
        "subject": payload.subject,
        "body_html": payload.body_html or "",
        "body_text": payload.body_text or "",
        "sent_by": user.get("id") or user.get("user_id"),
        "sent_by_name": user.get("name") or user.get("email"),
        "created_at": _now_iso(),
        "status": "queued",
        "error": None,
    }
    if not resend_key:
        outbox["status"] = "failed"
        outbox["error"] = "RESEND_API_KEY not configured"
        await db.email_outbox.insert_one(outbox)
        raise HTTPException(status_code=400, detail="Email service not configured")
    try:
        async with _httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
                json={
                    "from": sender,
                    "to": [payload.to],
                    "subject": payload.subject,
                    "html": payload.body_html or (payload.body_text or "").replace("\n", "<br>"),
                    "text": payload.body_text or "",
                },
            )
        if r.status_code >= 400:
            outbox["status"] = "failed"
            outbox["error"] = r.text[:400]
            await db.email_outbox.insert_one(outbox)
            raise HTTPException(status_code=400, detail=f"Email provider rejected the request: {r.text[:200]}")
        outbox["status"] = "sent"
        outbox["provider_response"] = r.json() if r.headers.get("content-type", "").startswith("application/json") else None
        await db.email_outbox.insert_one(outbox)
        return {"ok": True, "id": outbox["id"]}
    except HTTPException:
        raise
    except Exception as e:
        outbox["status"] = "failed"
        outbox["error"] = str(e)[:400]
        await db.email_outbox.insert_one(outbox)
        raise HTTPException(status_code=400, detail=f"Could not send email: {e}")
