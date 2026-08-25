"""Techfest IIT Bombay × OLL Robotics Championship — lead capture.

Public endpoint:
  POST /api/techfest/register — capture Educator/Mentor or School lead.
Admin:
  GET /api/admin/techfest/registrations — list captured leads (super_admin/admin).
"""
import csv
import io
import re
import logging
from datetime import datetime, timezone
from typing import Optional, Literal, List

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field

from .shared import db, get_current_user
from .techfest_emails import registration_confirmed_html, school_invite_html


logger = logging.getLogger(__name__)


async def _dispatch_email(to_email: str, subject: str, html: str) -> dict:
    """Try Gmail first, fall back to Resend so preview environments (which lack
    GMAIL_APP_PASSWORD) still send successfully."""
    try:
        from server import send_email_gmail  # type: ignore
        gm = await send_email_gmail(to_email, subject, html)
        if gm.get("success"):
            return {"provider": "gmail", **gm}
    except Exception as exc:  # noqa: BLE001
        gm = {"success": False, "error": str(exc)}
    # Fallback → Resend
    try:
        import asyncio, resend, os  # type: ignore
        resend.api_key = os.environ.get("RESEND_API_KEY", "")
        if not resend.api_key:
            return {"provider": "none", **gm, "resend_error": "RESEND_API_KEY missing"}
        params = {
            "from": os.environ.get("SENDER_EMAIL", "OLL Team <hello@oll.co>"),
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        resp = await asyncio.to_thread(resend.Emails.send, params)
        return {"provider": "resend", "success": True, "id": resp.get("id")}
    except Exception as exc:  # noqa: BLE001
        return {"provider": "none", "success": False, "gmail_error": gm.get("error"), "resend_error": str(exc)}


async def _send_techfest_confirmation(to_email: str, name: str, reg_type: str) -> None:
    """Background task: send registration confirmation email."""
    try:
        subject = "You're in — OLL Robotics Championship @ Techfest IIT Bombay 2026"
        html = registration_confirmed_html(name=name, reg_type=reg_type)
        await _dispatch_email(to_email, subject, html)
    except Exception as exc:  # noqa: BLE001
        logger.warning("techfest confirmation email failed for %s: %s", to_email, exc)


router = APIRouter()

RegistrantType = Literal["educator", "school", "student"]


class TechfestRegisterIn(BaseModel):
    type: RegistrantType
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=6, max_length=20)
    city: str = Field(..., min_length=2, max_length=80)
    # Educator/Mentor
    school_or_institute: Optional[str] = Field(None, max_length=200)
    grade_taught: Optional[str] = Field(None, max_length=80)
    experience: Optional[str] = Field(None, max_length=80)
    # School
    school_name: Optional[str] = Field(None, max_length=200)
    role_designation: Optional[str] = Field(None, max_length=120)
    student_count: Optional[str] = Field(None, max_length=40)
    tracks: Optional[List[str]] = None
    # Shared additions (school + educator)
    school_address: Optional[str] = Field(None, max_length=500)
    school_email: Optional[str] = Field(None, max_length=120)
    school_phone: Optional[str] = Field(None, max_length=20)
    teaches_robotics: Optional[str] = Field(None, max_length=8)  # 'Yes' | 'No'
    robotics_format: Optional[str] = Field(None, max_length=80)
    robotics_external_company: Optional[str] = Field(None, max_length=120)
    message: Optional[str] = Field(None, max_length=1000)


def _sanitise_phone(raw: str) -> str:
    return re.sub(r"[^0-9+]", "", raw or "")[:20]


@router.post("/techfest/register")
async def register_techfest(payload: TechfestRegisterIn, background_tasks: BackgroundTasks):
    now = datetime.now(timezone.utc)
    phone = _sanitise_phone(payload.phone)
    if len(re.sub(r"\D", "", phone)) < 6:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    doc = {
        "type": payload.type,
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "phone": phone,
        "city": payload.city.strip(),
        "created_at": now.isoformat(),
        "status": "new",
    }
    if payload.type == "educator":
        doc.update({
            "school_or_institute": (payload.school_or_institute or "").strip() or None,
            "grade_taught": (payload.grade_taught or "").strip() or None,
            "experience": (payload.experience or "").strip() or None,
            "student_count": (payload.student_count or "").strip() or None,
        })
    else:
        doc.update({
            "school_name": (payload.school_name or "").strip() or None,
            "role_designation": (payload.role_designation or "").strip() or None,
            "student_count": (payload.student_count or "").strip() or None,
            "tracks": payload.tracks or [],
        })
    # Shared additions
    for k in ("school_address", "school_email", "school_phone",
              "teaches_robotics", "robotics_format", "robotics_external_company"):
        val = (getattr(payload, k) or "").strip() or None
        if val:
            doc[k] = val
    if payload.message:
        doc["message"] = payload.message.strip()

    # Upsert on email+phone to dedupe re-submissions
    key = {"email": doc["email"], "phone": doc["phone"], "type": doc["type"]}
    existing = await db.techfest_registrations.find_one(key)
    if existing:
        await db.techfest_registrations.update_one(
            {"_id": existing["_id"]},
            {"$set": {**{k: v for k, v in doc.items() if k != "created_at"}, "updated_at": now.isoformat()}},
        )
        return {"ok": True, "duplicate": True, "id": str(existing["_id"])}

    result = await db.techfest_registrations.insert_one(doc)

    # Fire-and-forget confirmation email
    background_tasks.add_task(_send_techfest_confirmation, doc["email"], doc["name"], doc["type"])

    return {"ok": True, "duplicate": False, "id": str(result.inserted_id)}


async def _admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/techfest/registrations")
async def list_techfest_registrations(
    type: Optional[RegistrantType] = None,
    user: dict = Depends(_admin),
):
    query = {}
    if type:
        query["type"] = type
    cursor = db.techfest_registrations.find(query).sort("created_at", -1).limit(1000)
    out = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        out.append(doc)
    return {"items": out, "count": len(out)}



# CSV column order — shared for export + import
_EXPORT_COLS = [
    "sr_no", "type", "created_at", "name", "email", "phone", "city",
    "school_name", "school_or_institute", "role_designation", "grade_taught",
    "experience", "student_count", "tracks",
    "school_address", "school_email", "school_phone",
    "teaches_robotics", "robotics_format", "robotics_external_company",
    "grade", "team_name", "track",
    "message", "status",
]


@router.get("/admin/techfest/registrations/export")
async def export_techfest_csv(
    type: Optional[RegistrantType] = None,
    user: dict = Depends(_admin),
):
    query = {}
    if type:
        query["type"] = type
    cursor = db.techfest_registrations.find(query).sort("created_at", 1)
    rows = []
    async for doc in cursor:
        rows.append(doc)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(_EXPORT_COLS)
    for i, doc in enumerate(rows, 1):
        row = []
        for col in _EXPORT_COLS:
            if col == "sr_no":
                row.append(i)
            elif col == "tracks":
                row.append(", ".join(doc.get("tracks") or []))
            else:
                row.append(doc.get(col, "") or "")
        writer.writerow(row)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    filename = f"techfest-registrations-{type or 'all'}-{stamp}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/admin/techfest/registrations/import")
async def import_techfest_csv(
    file: UploadFile = File(...),
    user: dict = Depends(_admin),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")
    raw = (await file.read()).decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(raw))

    inserted = 0
    updated = 0
    skipped = 0
    errors: List[str] = []
    now = datetime.now(timezone.utc)

    for idx, row in enumerate(reader, 2):  # row 1 is header
        try:
            r_type = (row.get("type") or "").strip().lower()
            if r_type not in ("educator", "school", "student"):
                skipped += 1
                continue
            email = (row.get("email") or "").strip().lower()
            phone = _sanitise_phone(row.get("phone") or "")
            if not email or not phone or not row.get("name"):
                skipped += 1
                continue

            doc = {
                "type": r_type,
                "name": (row.get("name") or "").strip(),
                "email": email,
                "phone": phone,
                "city": (row.get("city") or "").strip(),
                "status": (row.get("status") or "new").strip() or "new",
            }
            for k in ("school_name", "school_or_institute", "role_designation",
                      "grade_taught", "experience", "student_count",
                      "school_address", "school_email", "school_phone",
                      "teaches_robotics", "robotics_format", "robotics_external_company",
                      "grade", "team_name", "track", "message"):
                v = (row.get(k) or "").strip()
                if v:
                    doc[k] = v
            tracks_raw = (row.get("tracks") or "").strip()
            if tracks_raw:
                doc["tracks"] = [t.strip() for t in tracks_raw.split(",") if t.strip()]

            key = {"email": doc["email"], "phone": doc["phone"], "type": doc["type"]}
            existing = await db.techfest_registrations.find_one(key)
            if existing:
                await db.techfest_registrations.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {**doc, "updated_at": now.isoformat()}},
                )
                updated += 1
            else:
                doc["created_at"] = (row.get("created_at") or now.isoformat()).strip()
                await db.techfest_registrations.insert_one(doc)
                inserted += 1
        except Exception as exc:
            errors.append(f"Row {idx}: {exc}")

    return {
        "ok": True,
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "errors": errors[:20],
    }



# ── Sample email endpoints (dev / preview): send to shreyaan@oll.co ──────
@router.post("/admin/techfest/emails/send-samples")
async def send_sample_techfest_emails(user: dict = Depends(_admin)):
    """Send the two Techfest email samples (school outreach + post-registration
    confirmation) to shreyaan@oll.co for review."""
    target = "shreyaan@oll.co"

    invite_html = school_invite_html(school_name="Sample School")
    invite_res = await _dispatch_email(
        target,
        "[SAMPLE] Register your school — OLL Robotics Championship @ Techfest IIT Bombay",
        invite_html,
    )

    confirm_html = registration_confirmed_html(
        name="Sample Principal", reg_type="school",
    )
    confirm_res = await _dispatch_email(
        target,
        "[SAMPLE] Registration confirmed — OLL Robotics Championship @ Techfest IIT Bombay",
        confirm_html,
    )
    return {
        "ok": True,
        "recipient": target,
        "invite": invite_res,
        "confirmation": confirm_res,
    }
