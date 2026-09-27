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
from .techfest_emails import registration_confirmed_html, school_invite_html, submission_confirmed_html
from .techfest_permission_letter import (
    build_permission_letter_docx,
    COMPETITION_LABELS,
    ZONE_LABELS,
    AGE_CAT_LABELS,
)


logger = logging.getLogger(__name__)


async def _dispatch_email(to_email: str, subject: str, html: str) -> dict:
    """Try Gmail first, fall back to Resend so preview environments (which lack
    GMAIL_APP_PASSWORD) still send successfully. Every mail is sent
    From `Techfest Team <techfest@oll.co>` with Reply-To `techfest@oll.co`."""
    from_addr = "Techfest Team <techfest@oll.co>"
    reply_to = "techfest@oll.co"

    # ── Gmail path (production) ────────────────────────────────────────
    try:
        from server import GMAIL_APP_PASSWORD, GMAIL_EMAIL  # type: ignore
        if GMAIL_APP_PASSWORD:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = from_addr
            msg['To'] = to_email
            msg['Reply-To'] = reply_to
            msg.attach(MIMEText(html, 'html'))
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
                server.sendmail(GMAIL_EMAIL, to_email, msg.as_string())
            return {"provider": "gmail", "success": True}
        gmail_err = "GMAIL_APP_PASSWORD missing"
    except Exception as exc:  # noqa: BLE001
        gmail_err = str(exc)

    # ── Resend fallback ────────────────────────────────────────────────
    try:
        import asyncio, os, resend  # type: ignore
        resend.api_key = os.environ.get("RESEND_API_KEY", "")
        if not resend.api_key:
            return {"provider": "none", "success": False, "gmail_error": gmail_err, "resend_error": "RESEND_API_KEY missing"}
        params = {
            "from": from_addr,
            "to": [to_email],
            "reply_to": reply_to,
            "subject": subject,
            "html": html,
        }
        resp = await asyncio.to_thread(resend.Emails.send, params)
        return {"provider": "resend", "success": True, "id": resp.get("id")}
    except Exception as exc:  # noqa: BLE001
        return {"provider": "none", "success": False, "gmail_error": gmail_err, "resend_error": str(exc)}


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
    # Competition selection & regional zone (school + educator)
    # Allowed competition slugs: robo_sumo | robo_race | robo_innovation
    selected_competitions: Optional[List[str]] = None
    # Only meaningful when robo_sumo or robo_race is picked:
    # north (Delhi) | south (Bangalore) | east (Kanpur) | west (Mumbai) | central (Indore)
    zone: Optional[str] = Field(None, max_length=20)
    # How-did-you-find-out-about-us
    source: Optional[str] = Field(None, max_length=40)  # social_media | google | iit_techfest | through_someone | referral | other
    source_details: Optional[str] = Field(None, max_length=120)  # name of person for "through_someone"
    referrer_slug: Optional[str] = Field(None, max_length=60)  # auto-filled from /techfest?ref=slug
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
              "teaches_robotics", "robotics_format", "robotics_external_company",
              "source", "source_details", "referrer_slug", "zone"):
        val = (getattr(payload, k) or "").strip() or None
        if val:
            doc[k] = val
    # Competition slugs — validate against the fixed set. Zone only makes
    # sense with robo_sumo / robo_race, otherwise it's dropped.
    ALLOWED_COMPS = {"robo_sumo", "robo_race", "robo_innovation"}
    ALLOWED_ZONES = {"north", "south", "east", "west", "central"}
    if payload.selected_competitions:
        comps = [c for c in payload.selected_competitions if c in ALLOWED_COMPS]
        if comps:
            doc["selected_competitions"] = comps
    if doc.get("zone") not in ALLOWED_ZONES:
        doc.pop("zone", None)
    # Drop zone if it's not applicable to any chosen competition
    if doc.get("zone") and not any(c in ("robo_sumo", "robo_race") for c in doc.get("selected_competitions", [])):
        doc.pop("zone", None)
    # Normalise referrer_slug
    if doc.get("referrer_slug"):
        doc["referrer_slug"] = re.sub(r"[^a-z0-9-]", "", doc["referrer_slug"].lower())[:60] or None
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


# ── Participants (students + team competition id) ────────────────────
# Public endpoint — accepts the Mongo ObjectId returned by /register as
# the authorization token. Sent to the registrant over email so they can
# come back and add / edit their students at any time before the event.

class ParticipantIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    competition_id: Optional[str] = Field(None, max_length=60)
    grade: Optional[str] = Field(None, max_length=40)


class ParticipantsPayload(BaseModel):
    team_competition_id: Optional[str] = Field(None, max_length=60)
    students: List[ParticipantIn] = []


def _oid(id_str: str):
    from bson import ObjectId
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid registration id")


@router.get("/techfest/registrations/{reg_id}")
async def get_techfest_registration_public(reg_id: str):
    """Public read-by-id — used by the "add students later" email link.
    Returns a limited view so email leakage doesn't reveal PII beyond
    what the registrant already knows about their own row."""
    doc = await db.techfest_registrations.find_one({"_id": _oid(reg_id)})
    if not doc or doc.get("deleted_at"):
        raise HTTPException(status_code=404, detail="Registration not found")
    # Return the minimum needed by the participants form UI.
    return {
        "id": str(doc["_id"]),
        "type": doc.get("type"),
        "name": doc.get("name"),
        "email": doc.get("email"),
        "school_name": doc.get("school_name") or doc.get("school_or_institute"),
        "selected_competitions": doc.get("selected_competitions") or [],
        "zone": doc.get("zone"),
        "team_competition_id": doc.get("team_competition_id"),
        "students": doc.get("students") or [],
    }


@router.post("/techfest/registrations/{reg_id}/participants")
async def upsert_techfest_participants(reg_id: str, payload: ParticipantsPayload):
    """Public update: replaces the students list and (optionally) the team
    competition id on a registration. No auth — the registration id acts
    as the shared secret (24-hex Mongo ObjectId)."""
    doc = await db.techfest_registrations.find_one({"_id": _oid(reg_id)})
    if not doc or doc.get("deleted_at"):
        raise HTTPException(status_code=404, detail="Registration not found")

    students = [
        {
            "name": s.name.strip(),
            "competition_id": (s.competition_id or "").strip() or None,
            "grade": (s.grade or "").strip() or None,
        }
        for s in payload.students
        if s.name and s.name.strip()
    ]
    update = {
        "students": students,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    team_id = (payload.team_competition_id or "").strip() or None
    if team_id:
        update["team_competition_id"] = team_id
    else:
        # Explicitly clear it if the client blanked the field.
        update.setdefault("$unset", {})

    await db.techfest_registrations.update_one({"_id": doc["_id"]}, {"$set": update})
    return {"ok": True, "students_count": len(students), "team_competition_id": team_id}


# ── Project submissions ─────────────────────────────────────────────
# Final project uploads from participants — separate collection so the
# submissions dashboard doesn't fight for space with the registrations
# funnel.
class TeamMemberIn(BaseModel):
    name:          str = Field(..., min_length=2, max_length=120)
    date_of_birth: Optional[str] = Field(None, max_length=20)   # YYYY-MM-DD
    email:         Optional[EmailStr] = None
    phone:         Optional[str] = Field(None, max_length=20)
    school:        Optional[str] = Field(None, max_length=200)
    id_proof_url:  Optional[str] = Field(None, max_length=500)  # uploaded Aadhar/PAN scan
    id_proof_type: Optional[str] = Field(None, max_length=20)   # 'aadhar' | 'pan' | 'other'


class TechfestSubmissionIn(BaseModel):
    # ── Team lead / primary contact ──
    full_name: str = Field(..., min_length=2, max_length=120)
    date_of_birth: str = Field(..., max_length=20)   # ISO YYYY-MM-DD — now REQUIRED
    age: Optional[int] = Field(None, ge=3, le=120)
    email: EmailStr
    phone: str = Field(..., min_length=6, max_length=20)
    country: str = Field(..., max_length=80)
    pincode: str = Field(..., max_length=20)
    state: str = Field(..., max_length=80)
    city: str = Field(..., max_length=80)
    school_or_college: str = Field(..., max_length=200)
    # Age category — Junior (Grade 4-7) | Senior (Grade 8-12)
    age_category: str = Field(..., max_length=20)
    # ID proof of the main student (team lead) — NEW required field
    id_proof_url:  str = Field(..., min_length=8, max_length=500)
    id_proof_type: str = Field(..., max_length=20)  # 'aadhar' | 'pan' | 'other'
    # Competition: robo_sumo | robo_race | robo_innovation
    competition: str = Field(..., max_length=40)
    # Zone: north (Delhi), south (Bangalore), east (Kanpur), west (Mumbai),
    # central (Indore). REQUIRED for robo_sumo / robo_race, must be empty
    # for robo_innovation.
    zone: Optional[str] = Field(None, max_length=20)
    # Only meaningful when competition == robo_innovation
    project_category: Optional[str] = Field(None, max_length=120)
    project_theme:    Optional[str] = Field(None, max_length=120)
    # Track ids from techfest.org
    team_id:        Optional[str] = Field(None, max_length=60)
    competition_id: Optional[str] = Field(None, max_length=60)
    drive_link:     str = Field(..., min_length=8, max_length=500)
    # NEW — team members (excluding lead) and school-permission letter
    team_members: List[TeamMemberIn] = Field(default_factory=list, max_length=5)
    school_permission_url: Optional[str] = Field(None, max_length=500)


@router.post("/techfest/submissions")
async def create_techfest_submission(payload: TechfestSubmissionIn, background_tasks: BackgroundTasks):
    """Public submission endpoint — no auth required."""
    ALLOWED_ZONES = {"north", "south", "east", "west", "central"}
    ALLOWED_COMPS = {"robo_sumo", "robo_race", "robo_innovation"}
    ALLOWED_AGE_CATS = {"junior", "senior"}
    if payload.competition not in ALLOWED_COMPS:
        raise HTTPException(status_code=400, detail="Invalid competition")
    # Zone only applies to Robo Sumo / Robo Race. For Innovation we drop it.
    zone_val = payload.zone
    if payload.competition in ("robo_sumo", "robo_race"):
        if not zone_val or zone_val not in ALLOWED_ZONES:
            raise HTTPException(status_code=400, detail="Zone is required for Robo Sumo / Robo Race")
    else:
        zone_val = None
    if payload.age_category and payload.age_category not in ALLOWED_AGE_CATS:
        raise HTTPException(status_code=400, detail="Invalid age category")

    doc = payload.model_dump()
    doc["zone"] = zone_val
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["status"] = "submitted"
    result = await db.techfest_submissions.insert_one(doc)
    reference_id = str(result.inserted_id)

    # Fire confirmation email + WhatsApp to team lead and every team
    # member whose contact info we have. Non-blocking so a slow SMTP
    # server can't 500 the submission.
    background_tasks.add_task(
        _send_submission_confirmations,
        submission=doc,
        reference_id=reference_id,
    )

    return {"ok": True, "id": reference_id}


async def _send_submission_confirmations(*, submission: dict, reference_id: str) -> None:
    """Fan-out submission confirmation email + WhatsApp to team lead and
    every team member with contact info. Swallows individual failures."""
    try:
        comp_label = COMPETITION_LABELS.get(submission.get("competition") or "", submission.get("competition") or "")
        zone_label = ZONE_LABELS.get(submission.get("zone") or "", "") or None
        age_label  = AGE_CAT_LABELS.get(submission.get("age_category") or "", "") or None
        lead_name  = (submission.get("full_name") or "Team lead").strip()
        school     = (submission.get("school_or_college") or "").strip() or None
        drive_link = submission.get("drive_link") or None
        team_members = submission.get("team_members") or []

        html = submission_confirmed_html(
            lead_name=lead_name,
            competition_label=comp_label,
            zone_label=zone_label,
            age_category_label=age_label,
            school_name=school,
            reference_id=reference_id,
            team_members=team_members,
            drive_link=drive_link,
        )
        subject = "Project submitted — OLL Robotics Championship @ Techfest IIT Bombay"

        # Collect unique (email, name) pairs to dispatch to.
        recipients: list[tuple[str, str]] = []
        seen_emails: set[str] = set()
        lead_email = (submission.get("email") or "").strip().lower()
        if lead_email:
            recipients.append((lead_email, lead_name))
            seen_emails.add(lead_email)
        for m in team_members:
            em = (m.get("email") or "").strip().lower()
            if em and em not in seen_emails:
                recipients.append((em, (m.get("name") or "Team member").strip()))
                seen_emails.add(em)

        for to_email, _to_name in recipients:
            try:
                await _dispatch_email(to_email, subject, html)
            except Exception as exc:  # noqa: BLE001
                logger.warning("techfest submission email failed for %s: %s", to_email, exc)

        # WhatsApp — best-effort via AiSensy. Silently skipped if
        # AISENSY_API_KEY or the campaign isn't configured yet.
        try:
            from server import send_whatsapp_notification  # type: ignore
        except Exception:  # noqa: BLE001
            send_whatsapp_notification = None

        if send_whatsapp_notification:
            phones: list[tuple[str, str]] = []
            seen_phones: set[str] = set()
            lead_phone = _sanitise_phone(submission.get("phone") or "")
            if lead_phone:
                phones.append((lead_phone, lead_name))
                seen_phones.add(lead_phone)
            for m in team_members:
                ph = _sanitise_phone(m.get("phone") or "")
                if ph and ph not in seen_phones:
                    phones.append((ph, (m.get("name") or "Team member").strip()))
                    seen_phones.add(ph)
            zone_line = (
                f"{ZONE_LABELS.get(submission.get('zone') or '', '')}"
                if submission.get("zone") else ""
            )
            for phone, name in phones:
                try:
                    await send_whatsapp_notification(
                        phone=phone,
                        template_key="techfest_submission_confirmed",
                        params=[name, comp_label, zone_line or "—", reference_id],
                        user_name=name,
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning("techfest submission whatsapp failed for %s: %s", phone, exc)
    except Exception as exc:  # noqa: BLE001
        logger.exception("techfest submission confirmation dispatch failed: %s", exc)


# ── Auto-filled School Permission Letter (.docx) ────────────────────
# Public endpoint used by the "Download sample template" button on the
# submission page. Falls back to blank placeholders if the caller
# hasn't filled in the form yet, so it works both as a naked template
# and as a fully pre-filled letter.
class PermissionLetterIn(BaseModel):
    full_name:        Optional[str] = Field(None, max_length=120)
    date_of_birth:    Optional[str] = Field(None, max_length=20)
    email:            Optional[str] = Field(None, max_length=120)
    phone:            Optional[str] = Field(None, max_length=20)
    school_or_college: Optional[str] = Field(None, max_length=200)
    competition:      Optional[str] = Field(None, max_length=40)
    zone:             Optional[str] = Field(None, max_length=20)
    age_category:     Optional[str] = Field(None, max_length=20)
    coordinator_name: Optional[str] = Field(None, max_length=120)
    signatory_name:   Optional[str] = Field(None, max_length=120)
    signatory_designation: Optional[str] = Field(None, max_length=120)
    team_members:     List[TeamMemberIn] = Field(default_factory=list, max_length=5)


@router.post("/techfest/permission-letter")
async def download_permission_letter(payload: PermissionLetterIn):
    data = {
        "team_lead_name":  payload.full_name,
        "team_lead_dob":   payload.date_of_birth,
        "team_lead_email": payload.email,
        "team_lead_phone": payload.phone,
        "school_name":     payload.school_or_college,
        "competition":     payload.competition,
        "zone":            payload.zone,
        "age_category":    payload.age_category,
        "coordinator_name": payload.coordinator_name,
        "signatory_name":  payload.signatory_name,
        "signatory_designation": payload.signatory_designation,
        "team_members": [m.model_dump() for m in (payload.team_members or [])],
    }
    docx_bytes = build_permission_letter_docx(data)
    school_slug = re.sub(r"[^a-z0-9]+", "-", (payload.school_or_college or "school").lower()).strip("-") or "school"
    filename = f"OLL-Techfest-Permission-Letter-{school_slug[:40]}.docx"
    return StreamingResponse(
        iter([docx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/admin/techfest/submissions")
async def list_techfest_submissions(
    zone: Optional[str] = None,
    competition: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    # Same "admin or team member with email" gate used elsewhere.
    if user.get("role") not in ("admin", "super_admin") and not user.get("email"):
        raise HTTPException(status_code=403, detail="Access denied")
    query: dict = {}
    if zone: query["zone"] = zone
    if competition: query["competition"] = competition
    cursor = db.techfest_submissions.find(query).sort("created_at", -1).limit(1000)
    out = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        out.append(doc)
    return {"items": out, "count": len(out)}


# ── Public upload for Techfest submitters ──────────────────────────
# Regular /api/upload requires auth, but Techfest participants aren't
# logged in. We reuse the same Cloudinary flow as /api/upload but
# without the auth dependency, gated by an in-memory rate-limit (IP +
# minute bucket) to slow abuse.
from fastapi import Request
import time as _time
_TECHFEST_UPLOAD_BUCKETS: dict[tuple[str, int], int] = {}

@router.post("/techfest/upload")
async def techfest_upload(request: Request, file: UploadFile = File(...), type: str = "documents"):
    ip = request.client.host if request.client else "unknown"
    bucket = (ip, int(_time.time()) // 60)
    _TECHFEST_UPLOAD_BUCKETS[bucket] = _TECHFEST_UPLOAD_BUCKETS.get(bucket, 0) + 1
    if _TECHFEST_UPLOAD_BUCKETS[bucket] > 20:
        raise HTTPException(status_code=429, detail="Too many uploads — try again in a minute")

    import os
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    allowed = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"}
    if file_ext not in allowed:
        raise HTTPException(status_code=400, detail="Only PDF / image files are allowed")
    body = await file.read()
    if len(body) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Reuse cloudinary_service from misc.py — same pattern used elsewhere.
    try:
        import cloudinary.uploader
        image_ext = {".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"}
        resource_type = "image" if file_ext in image_ext else "raw"
        result = cloudinary.uploader.upload(
            body,
            resource_type=resource_type,
            folder="techfest_submissions",
            use_filename=True,
            unique_filename=True,
        )
        return {"url": result["secure_url"], "public_id": result.get("public_id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload service error: {str(e)[:120]}")



async def _admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def _admin_or_team(user: dict = Depends(get_current_user)) -> dict:
    """Allow any authenticated team user. Non-admins get a *scoped* view of
    Techfest data limited to registrations attributed to their referral slug."""
    role = user.get("role")
    if role in ("admin", "super_admin"):
        return user
    # team_members and role-permissioned users are fine — scope is applied per endpoint
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=403, detail="Access denied")
    return user


def _is_admin(user: dict) -> bool:
    return user.get("role") in ("admin", "super_admin")


async def _get_or_create_user_slug(user: dict) -> Optional[str]:
    """Return the slug owned by this team user, creating one on first call.
    Uses `firstname-l` format and stamps notes as "Team" for auto-provisioned rows."""
    email = (user.get("email") or "").strip().lower()
    if not email:
        return None
    existing = await db.techfest_referrers.find_one({
        "owner_email": email, "deleted_at": {"$exists": False}
    })
    if existing:
        return existing["slug"]
    base = _team_slug(user.get("name") or "", email)
    slug = await _unique_slug(base)
    doc = {
        "name": user.get("name") or email,
        "slug": slug,
        "notes": "Team",
        "owner_email": email,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": email,
    }
    await db.techfest_referrers.insert_one(doc)
    return slug


async def _user_scope_slugs(user: dict) -> List[str]:
    """All slugs a non-admin user owns (usually one)."""
    if _is_admin(user):
        return []  # empty means "no scope filter"
    email = (user.get("email") or "").strip().lower()
    if not email:
        return ["__none__"]
    cursor = db.techfest_referrers.find(
        {"owner_email": email, "deleted_at": {"$exists": False}}, {"slug": 1},
    )
    slugs = [d["slug"] async for d in cursor]
    # Ensure at least one slug exists for the user (auto-provision)
    if not slugs:
        s = await _get_or_create_user_slug(user)
        if s:
            slugs = [s]
    return slugs or ["__none__"]


@router.get("/admin/techfest/registrations")
async def list_techfest_registrations(
    type: Optional[RegistrantType] = None,
    user: dict = Depends(_admin_or_team),
):
    query = {"deleted_at": {"$exists": False}}
    if type:
        query["type"] = type
    if not _is_admin(user):
        # Non-admin team users see rows attributed to their referral slug
        # OR rows where they're explicitly assigned as the coordinator.
        slugs = await _user_scope_slugs(user)
        uid = user.get("id") or user.get("user_id")
        or_clauses: list[dict] = [{"referrer_slug": {"$in": slugs}}]
        if uid:
            or_clauses.append({"coordinator_user_id": uid})
        query["$or"] = or_clauses
    cursor = db.techfest_registrations.find(query).sort("created_at", -1).limit(1000)
    out = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        out.append(doc)
    return {"items": out, "count": len(out)}


# ── Registration edit + soft delete ─────────────────────────────────────
class TechfestRegistrationPatch(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    school_name: Optional[str] = None
    school_or_institute: Optional[str] = None
    role_designation: Optional[str] = None
    grade_taught: Optional[str] = None
    student_count: Optional[str] = None
    school_address: Optional[str] = None
    school_email: Optional[str] = None
    school_phone: Optional[str] = None
    teaches_robotics: Optional[str] = None
    robotics_format: Optional[str] = None
    robotics_external_company: Optional[str] = None
    source: Optional[str] = None
    source_details: Optional[str] = None
    referrer_slug: Optional[str] = None
    status: Optional[str] = None
    # Competition + zone + coordinator (admin fields)
    selected_competitions: Optional[List[str]] = None
    zone: Optional[str] = None
    coordinator_user_id: Optional[str] = None
    coordinator_name: Optional[str] = None
    team_competition_id: Optional[str] = None


@router.patch("/admin/techfest/registrations/{reg_id}")
async def update_techfest_registration(
    reg_id: str,
    payload: TechfestRegistrationPatch,
    user: dict = Depends(_admin_or_team),
):
    from bson import ObjectId
    try:
        oid = ObjectId(reg_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid registration id")
    existing = await db.techfest_registrations.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Registration not found")
    if not _is_admin(user):
        slugs = await _user_scope_slugs(user)
        uid = user.get("id") or user.get("user_id")
        allowed = (existing.get("referrer_slug") in slugs) or (uid and existing.get("coordinator_user_id") == uid)
        if not allowed:
            raise HTTPException(status_code=403, detail="Not allowed to edit this registration")
    updates = {}
    for k, v in payload.model_dump(exclude_none=True).items():
        if isinstance(v, str):
            v = v.strip()
        # Preserve list fields as-is; other empty strings become None (unset-ish)
        if isinstance(v, list):
            updates[k] = v
        else:
            updates[k] = v or None
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.techfest_registrations.update_one({"_id": oid}, {"$set": updates})
    return {"ok": True}


@router.delete("/admin/techfest/registrations/{reg_id}")
async def soft_delete_techfest_registration(
    reg_id: str,
    user: dict = Depends(_admin_or_team),
):
    from bson import ObjectId
    try:
        oid = ObjectId(reg_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid registration id")
    existing = await db.techfest_registrations.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Registration not found")
    if not _is_admin(user):
        slugs = await _user_scope_slugs(user)
        if existing.get("referrer_slug") not in slugs:
            raise HTTPException(status_code=403, detail="Not allowed to delete this registration")
    res = await db.techfest_registrations.update_one(
        {"_id": oid},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "deleted_by": user.get("email") or user.get("id") or "admin",
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"ok": True}


# ── Referrers CRUD + rollup ─────────────────────────────────────────────
class ReferrerIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    slug: Optional[str] = Field(None, max_length=60)
    notes: Optional[str] = Field(None, max_length=300)


def _make_slug(raw: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (raw or "").lower()).strip("-")
    return s[:60] or "ref"


def _team_slug(name: str, email: str) -> str:
    """Build a slug in the format `firstname-l` (last-name initial).
    Falls back to email local-part when the name is a single word or empty."""
    name = (name or "").strip()
    if not name:
        name = (email or "").split("@", 1)[0]
    parts = [p for p in re.split(r"\s+", name) if p]
    if not parts:
        return "ref"
    first = re.sub(r"[^a-z0-9]", "", parts[0].lower())
    last_initial = ""
    if len(parts) > 1:
        tail = re.sub(r"[^a-z0-9]", "", parts[-1].lower())
        last_initial = tail[:1]
    slug = f"{first}-{last_initial}" if last_initial else first
    return slug[:60] or "ref"


async def _unique_slug(base: str, exclude_id=None) -> str:
    """Return an unused slug — appending `-2`, `-3`, … if the base collides."""
    slug = base
    i = 1
    while True:
        q = {"slug": slug}
        if exclude_id is not None:
            q["_id"] = {"$ne": exclude_id}
        if not await db.techfest_referrers.find_one(q):
            return slug
        i += 1
        slug = f"{base}-{i}"


async def _sync_team_referrers() -> int:
    """Ensure every active team_user has a `techfest_referrers` row.
    Returns the number of new referrer rows inserted."""
    inserted = 0
    cursor = db.team_users.find(
        {"$or": [{"is_active": {"$exists": False}}, {"is_active": True}]},
        {"_id": 0, "id": 1, "name": 1, "email": 1},
    )
    async for tu in cursor:
        email = (tu.get("email") or "").strip().lower()
        if not email:
            continue
        # Skip if this user already owns a referrer (soft-deleted or not — we
        # don't recreate a link that an admin has explicitly deleted).
        if await db.techfest_referrers.find_one({"owner_email": email}):
            continue
        base = _team_slug(tu.get("name") or "", email)
        slug = await _unique_slug(base)
        await db.techfest_referrers.insert_one({
            "name": tu.get("name") or email,
            "slug": slug,
            "notes": "Team",
            "owner_email": email,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system:sync-team",
        })
        inserted += 1
    return inserted


@router.post("/admin/techfest/referrers")
async def create_referrer(payload: ReferrerIn, user: dict = Depends(_admin_or_team)):
    # Non-admins may only own one referrer at a time — return theirs if exists.
    if not _is_admin(user):
        email = (user.get("email") or "").strip().lower()
        mine = await db.techfest_referrers.find_one({
            "owner_email": email, "deleted_at": {"$exists": False}
        })
        if mine:
            mine["_id"] = str(mine["_id"])
            return mine
    slug = _make_slug(payload.slug or payload.name)
    # Ensure unique slug
    base = slug
    i = 1
    while await db.techfest_referrers.find_one({"slug": slug}):
        i += 1
        slug = f"{base}-{i}"
    doc = {
        "name": payload.name.strip(),
        "slug": slug,
        "notes": (payload.notes or "").strip() or None,
        "owner_email": (user.get("email") or "").strip().lower(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email") or user.get("id") or "admin",
    }
    res = await db.techfest_referrers.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc


@router.get("/admin/techfest/referrers/me")
async def get_my_referrer(user: dict = Depends(_admin_or_team)):
    """Return (auto-creating if needed) the caller's own referrer link, plus counts.
    Used by the Competitions page to show the current user's shareable slug."""
    slug = await _get_or_create_user_slug(user)
    if not slug:
        raise HTTPException(status_code=400, detail="Could not resolve current user")
    doc = await db.techfest_referrers.find_one({"slug": slug})
    if not doc:
        raise HTTPException(status_code=404, detail="Referrer not found")
    doc["_id"] = str(doc["_id"])
    # Compute counts
    pipeline = [
        {"$match": {"referrer_slug": slug, "deleted_at": {"$exists": False}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
    ]
    counts = {"school": 0, "educator": 0, "student": 0}
    async for grp in db.techfest_registrations.aggregate(pipeline):
        t = grp["_id"]
        counts[t] = grp["count"]
    doc["school_count"] = counts["school"]
    doc["educator_count"] = counts["educator"]
    doc["student_count"] = counts["student"]
    doc["total_count"] = sum(counts.values())
    return doc


@router.post("/admin/techfest/referrers/sync-team")
async def sync_team_referrers(user: dict = Depends(_admin)):
    """Admin: ensure every active team_user has a Techfest referrer row.
    Idempotent — existing rows (including soft-deleted) are not touched."""
    n = await _sync_team_referrers()
    return {"ok": True, "inserted": n}


@router.get("/admin/techfest/referrers")
async def list_referrers(user: dict = Depends(_admin_or_team)):
    # Admins: on every load, opportunistically ensure every team_user has a
    # referrer row so the table matches the current team roster.
    if _is_admin(user):
        try:
            await _sync_team_referrers()
        except Exception as exc:  # noqa: BLE001
            logger.warning("team referrer sync failed: %s", exc)
    query = {"deleted_at": {"$exists": False}}
    if not _is_admin(user):
        query["owner_email"] = (user.get("email") or "").strip().lower()
    cursor = db.techfest_referrers.find(query).sort("created_at", -1)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    # Compute counts per slug
    slug_filter = [it["slug"] for it in items] if not _is_admin(user) else None
    match: dict = {"referrer_slug": {"$exists": True, "$ne": None}, "deleted_at": {"$exists": False}}
    if slug_filter is not None:
        match["referrer_slug"] = {"$in": slug_filter} if slug_filter else "__none__"
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": {"slug": "$referrer_slug", "type": "$type"},
            "count": {"$sum": 1},
        }},
    ]
    counts_by_slug: dict = {}
    async for grp in db.techfest_registrations.aggregate(pipeline):
        slug = grp["_id"]["slug"]
        t = grp["_id"]["type"]
        counts_by_slug.setdefault(slug, {"school": 0, "educator": 0, "student": 0})
        counts_by_slug[slug][t] = grp["count"]
    for it in items:
        c = counts_by_slug.get(it["slug"], {"school": 0, "educator": 0, "student": 0})
        it["school_count"] = c.get("school", 0)
        it["educator_count"] = c.get("educator", 0)
        it["student_count"] = c.get("student", 0)
        it["total_count"] = it["school_count"] + it["educator_count"] + it["student_count"]
    return {"items": items, "count": len(items)}


@router.patch("/admin/techfest/referrers/{ref_id}")
async def update_referrer(ref_id: str, payload: ReferrerIn, user: dict = Depends(_admin_or_team)):
    from bson import ObjectId
    try:
        oid = ObjectId(ref_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid referrer id")
    existing = await db.techfest_referrers.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Referrer not found")
    if not _is_admin(user):
        if existing.get("owner_email") != (user.get("email") or "").strip().lower():
            raise HTTPException(status_code=403, detail="Not allowed to edit this referrer")
    updates = {"name": payload.name.strip()}
    if payload.notes is not None:
        updates["notes"] = payload.notes.strip() or None
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.techfest_referrers.update_one({"_id": oid}, {"$set": updates})
    return {"ok": True}


@router.delete("/admin/techfest/referrers/{ref_id}")
async def delete_referrer(ref_id: str, user: dict = Depends(_admin)):
    from bson import ObjectId
    try:
        oid = ObjectId(ref_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid referrer id")
    res = await db.techfest_referrers.update_one(
        {"_id": oid},
        {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Referrer not found")
    return {"ok": True}


# Public: resolve slug (used by /techfest?ref=... to validate the ref exists)
@router.get("/techfest/referrer/{slug}")
async def public_get_referrer(slug: str):
    slug = re.sub(r"[^a-z0-9-]", "", slug.lower())[:60]
    if not slug:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.techfest_referrers.find_one({"slug": slug, "deleted_at": {"$exists": False}})
    if not doc:
        raise HTTPException(status_code=404, detail="Referrer not found")
    return {"slug": doc["slug"], "name": doc["name"]}



# CSV column order — shared for export + import
_EXPORT_COLS = [
    "sr_no", "type", "created_at", "name", "email", "phone", "city",
    "school_name", "school_or_institute", "role_designation", "grade_taught",
    "experience", "student_count", "tracks",
    "school_address", "school_email", "school_phone",
    "teaches_robotics", "robotics_format", "robotics_external_company",
    "source", "source_details", "referrer_slug",
    "grade", "team_name", "track",
    "message", "status",
]


@router.get("/admin/techfest/registrations/export")
async def export_techfest_csv(
    type: Optional[RegistrantType] = None,
    user: dict = Depends(_admin_or_team),
):
    query = {"deleted_at": {"$exists": False}}
    if type:
        query["type"] = type
    if not _is_admin(user):
        slugs = await _user_scope_slugs(user)
        query["referrer_slug"] = {"$in": slugs}
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
                      "source", "source_details", "referrer_slug",
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


# ── Combined Data view + Student CSV import ─────────────────────────────
def _school_key(row: dict) -> str:
    """Case/whitespace insensitive fingerprint for grouping school rows."""
    name = (row.get("school_name") or row.get("school_or_institute") or row.get("name") or "").strip().lower()
    return re.sub(r"\s+", " ", name)


@router.get("/admin/techfest/combined-view")
async def techfest_combined_view(user: dict = Depends(_admin_or_team)):
    """One row per **unique school** aggregating school reg, educator regs,
    student count, and submission count.

    Row shape:
    ```
    {
        school_name, school_key, city, competition, zone,
        coordinator_name, coordinator_user_id,
        school_registered: bool, school_reg_id,
        educator_count, educator_reg_ids: [...],
        student_count,
        submission_count, submission_ids: [...],
    }
    ```
    """
    query = {"deleted_at": {"$exists": False}}
    if not _is_admin(user):
        slugs = await _user_scope_slugs(user)
        uid = user.get("id") or user.get("user_id")
        or_clauses: list[dict] = [{"referrer_slug": {"$in": slugs}}]
        if uid:
            or_clauses.append({"coordinator_user_id": uid})
        query["$or"] = or_clauses

    # Aggregate all techfest registrations by school key.
    rows: dict[str, dict] = {}
    async for doc in db.techfest_registrations.find(query):
        key = _school_key(doc)
        if not key:
            continue
        slot = rows.setdefault(key, {
            "school_key": key,
            "school_name": (doc.get("school_name") or doc.get("school_or_institute") or "").strip() or None,
            "city": (doc.get("city") or "").strip() or None,
            "competition": None,
            "zone": (doc.get("zone") or None),
            "coordinator_name": doc.get("coordinator_name"),
            "coordinator_user_id": doc.get("coordinator_user_id"),
            "school_registered": False,
            "school_reg_id": None,
            "school_reg_email": None,
            "school_reg_phone": None,
            "educator_count": 0,
            "educator_reg_ids": [],
            "student_count": 0,
            "submission_count": 0,
            "submission_ids": [],
            "selected_competitions": [],
        })
        # Prefer a school-type row's identifying fields.
        if doc.get("type") == "school":
            slot["school_registered"] = True
            slot["school_reg_id"] = str(doc["_id"])
            slot["school_reg_email"] = doc.get("email")
            slot["school_reg_phone"] = doc.get("phone")
            if not slot["city"]:
                slot["city"] = doc.get("city")
            if not slot["coordinator_name"]:
                slot["coordinator_name"] = doc.get("coordinator_name")
                slot["coordinator_user_id"] = doc.get("coordinator_user_id")
            if not slot["zone"]:
                slot["zone"] = doc.get("zone")
        elif doc.get("type") == "educator":
            slot["educator_count"] += 1
            slot["educator_reg_ids"].append(str(doc["_id"]))

        # Merge competitions across all rows for this school.
        for c in (doc.get("selected_competitions") or []):
            if c and c not in slot["selected_competitions"]:
                slot["selected_competitions"].append(c)

        # Sum students from the registration's own students array.
        slot["student_count"] += len(doc.get("students") or [])

    # Match techfest_submissions by school_or_college name.
    async for sub in db.techfest_submissions.find({}):
        skey = re.sub(r"\s+", " ", (sub.get("school_or_college") or "").strip().lower())
        if not skey:
            continue
        slot = rows.get(skey)
        if not slot:
            # Create a "submission-only" row for schools we haven't seen registered
            slot = rows.setdefault(skey, {
                "school_key": skey,
                "school_name": sub.get("school_or_college") or None,
                "city": sub.get("city") or None,
                "competition": None,
                "zone": sub.get("zone"),
                "coordinator_name": None,
                "coordinator_user_id": None,
                "school_registered": False,
                "school_reg_id": None,
                "school_reg_email": None,
                "school_reg_phone": None,
                "educator_count": 0,
                "educator_reg_ids": [],
                "student_count": 0,
                "submission_count": 0,
                "submission_ids": [],
                "selected_competitions": [],
            })
        slot["submission_count"] += 1
        slot["submission_ids"].append(str(sub["_id"]))
        # Team members inside a submission add to student count too
        slot["student_count"] += 1 + len(sub.get("team_members") or [])

    out = list(rows.values())
    # Set "competition" as the first competition in the list for display convenience.
    for r in out:
        if r["selected_competitions"]:
            r["competition"] = r["selected_competitions"][0]
    out.sort(key=lambda r: (-(r["submission_count"] + r["student_count"] + r["educator_count"]), r.get("school_name") or ""))
    return {"items": out, "count": len(out)}


@router.post("/admin/techfest/students/import")
async def import_techfest_students_csv(
    file: UploadFile = File(...),
    user: dict = Depends(_admin_or_team),
):
    """Bulk import students from the OLL Robotics Championship CSV export.

    Columns accepted (extra columns are ignored):
      Compi Reg ID · Competition Code · Competition Name · Techfest ID ·
      Participant Name · Email · Phone No · Gender · College (school) ·
      Pincode · City · State · Country · Address · Zonal City · Zonal College ·
      Google ID · Team ID · Team Name · Team Role · Team Leader Name ·
      Team Leader Email · Team Leader Phone · Team Joined Date · Registration Date

    Every unique (Participant Name, Email, Team ID) is stored in a new
    ``techfest_student_registrations`` collection.  When the College matches
    an existing school registration, the student is also appended to that
    registration's ``students`` list so the Combined View picks it up.
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    try:
        raw = (await file.read()).decode("utf-8-sig", errors="ignore")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read file")
    reader = csv.DictReader(io.StringIO(raw))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no header row")

    def _pick(row: dict, *names: str) -> str:
        for n in names:
            v = (row.get(n) or "").strip()
            if v:
                return v
        return ""

    now_iso = datetime.now(timezone.utc).isoformat()
    inserted = 0
    updated = 0
    linked = 0
    errors: List[str] = []
    per_school: dict[str, list] = {}

    for idx, row in enumerate(reader, start=2):  # header on line 1
        name = _pick(row, "Participant Name", "Name")
        if not name:
            continue
        email = _pick(row, "Email").lower()
        phone = _pick(row, "Phone No", "Phone")
        team_id = _pick(row, "Team ID")
        college = _pick(row, "College", "School")
        record = {
            "compi_reg_id":     _pick(row, "Compi Reg ID"),
            "competition_code": _pick(row, "Competition Code"),
            "competition_name": _pick(row, "Competition Name"),
            "techfest_id":      _pick(row, "Techfest ID"),
            "name":             name,
            "email":            email,
            "phone":            phone,
            "gender":           _pick(row, "Gender"),
            "school":           college,
            "pincode":          _pick(row, "Pincode"),
            "city":             _pick(row, "City"),
            "state":            _pick(row, "State"),
            "country":          _pick(row, "Country") or "India",
            "address":          _pick(row, "Address"),
            "zonal_city":       _pick(row, "Zonal City"),
            "zonal_college":    _pick(row, "Zonal College"),
            "team_id":          team_id,
            "team_name":        _pick(row, "Team Name"),
            "team_role":        _pick(row, "Team Role") or "Member",
            "team_leader_name": _pick(row, "Team Leader Name"),
            "team_leader_email": _pick(row, "Team Leader Email").lower(),
            "team_leader_phone": _pick(row, "Team Leader Phone"),
            "team_joined_date": _pick(row, "Team Joined Date"),
            "registration_date": _pick(row, "Registration Date"),
            "imported_at": now_iso,
            "imported_by": user.get("email") or user.get("id"),
        }

        key = {"compi_reg_id": record["compi_reg_id"]} if record["compi_reg_id"] else {
            "email": email, "team_id": team_id, "name": name,
        }
        try:
            existing = await db.techfest_student_registrations.find_one(key)
            if existing:
                await db.techfest_student_registrations.update_one(
                    {"_id": existing["_id"]}, {"$set": record}
                )
                updated += 1
            else:
                await db.techfest_student_registrations.insert_one(record)
                inserted += 1
        except Exception as e:
            errors.append(f"Row {idx}: {e}")
            continue

        # Group by school for the append-to-registrations pass below.
        skey = re.sub(r"\s+", " ", college.strip().lower())
        if skey:
            per_school.setdefault(skey, []).append({
                "name": name,
                "email": email,
                "phone": phone,
                "team_id": team_id,
                "team_name": record["team_name"],
                "role": record["team_role"],
            })

    # Append imported students to matching school registrations so the
    # combined view picks them up without a second query.
    for skey, students in per_school.items():
        reg = await db.techfest_registrations.find_one({
            "type": "school",
            "$expr": {
                "$eq": [
                    {"$toLower": {"$trim": {"input": {"$ifNull": ["$school_name", ""]}}}},
                    skey,
                ]
            },
        })
        if not reg:
            continue
        existing_students = reg.get("students") or []
        seen = {(s.get("name", "").lower(), s.get("email", "").lower()) for s in existing_students}
        merged = list(existing_students)
        for s in students:
            k = (s["name"].lower(), s["email"].lower())
            if k not in seen:
                merged.append(s)
                seen.add(k)
        if len(merged) != len(existing_students):
            await db.techfest_registrations.update_one(
                {"_id": reg["_id"]},
                {"$set": {"students": merged, "updated_at": now_iso}},
            )
            linked += 1

    return {
        "ok": True,
        "inserted": inserted,
        "updated": updated,
        "schools_linked": linked,
        "errors": errors[:20],
    }


@router.get("/admin/techfest/students")
async def list_techfest_student_registrations(
    limit: int = 2000,
    user: dict = Depends(_admin_or_team),
):
    """Return the flat student registrations table (from the CSV import)."""
    cursor = db.techfest_student_registrations.find({}).sort("registration_date", -1).limit(limit)
    out: List[dict] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        out.append(doc)
    return {"items": out, "count": len(out)}
