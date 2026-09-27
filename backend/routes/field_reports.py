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

from .shared import db, get_current_user


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


@router.patch("/field-reports/{report_id}/checkout")
async def check_out(report_id: str, payload: CheckOutIn, user: dict = Depends(get_current_user)):
    r = await db.field_reports.find_one({"id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if not _is_admin(user) and r.get("user_id") != (user.get("id") or user.get("user_id")):
        raise HTTPException(status_code=403, detail="Not your field day")
    await db.field_reports.update_one(
        {"id": report_id},
        {"$set": {
            "check_out": {"at": _now_iso(), "notes": payload.end_notes},
            "updated_at": _now_iso(),
        }},
    )
    fresh = await db.field_reports.find_one({"id": report_id}, {"_id": 0})
    return fresh


@router.post("/field-reports/{report_id}/school-visits")
async def add_school_visit(report_id: str, payload: SchoolVisitIn, user: dict = Depends(get_current_user)):
    r = await db.field_reports.find_one({"id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if not _is_admin(user) and r.get("user_id") != (user.get("id") or user.get("user_id")):
        raise HTTPException(status_code=403, detail="Not your field day")

    visit = {
        "id": str(uuid.uuid4()),
        "at": _now_iso(),
        **payload.model_dump(),
        "meeting": None,
    }
    # Best-effort: seed a matching school_inquiry so the field visit
    # feeds directly into School CRM (aligned with the "like adding a
    # lead" spec). If a school with the same name + city already exists
    # we link to it; otherwise we insert a lean new inquiry with status
    # 'new' and mark the source as 'field_visit'.
    inquiry_id = None
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
                "contact_name": first_contact.get("name") or visit.get("contacts", [{}])[0].get("name") or "",
                "phone":        first_contact.get("phone") or "",
                "email":        first_contact.get("email") or "",
                "location":     visit.get("city") or "",
                "board":        visit.get("board") or "",
                "status":       "new",
                "school_contacts": [c for c in (visit.get("contacts") or []) if c.get("name")],
                "programs_interested": [],
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
    return visit


@router.post("/field-reports/{report_id}/school-visits/{visit_id}/meeting")
async def upsert_meeting(report_id: str, visit_id: str, payload: MeetingIn, user: dict = Depends(get_current_user)):
    r = await db.field_reports.find_one({"id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if not _is_admin(user) and r.get("user_id") != (user.get("id") or user.get("user_id")):
        raise HTTPException(status_code=403, detail="Not your field day")
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
    query: dict = {}
    if not _is_admin(user):
        # Non-admins only see their own reports.
        query["user_id"] = user.get("id") or user.get("user_id")
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
    r = await db.field_reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if not _is_admin(user) and r.get("user_id") != (user.get("id") or user.get("user_id")):
        raise HTTPException(status_code=403, detail="Not your report")
    return r


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
