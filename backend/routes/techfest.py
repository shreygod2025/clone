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
              "source", "source_details", "referrer_slug"):
        val = (getattr(payload, k) or "").strip() or None
        if val:
            doc[k] = val
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
    """Return the slug owned by this team user, creating one on first call."""
    email = (user.get("email") or "").strip().lower()
    if not email:
        return None
    existing = await db.techfest_referrers.find_one({
        "owner_email": email, "deleted_at": {"$exists": False}
    })
    if existing:
        return existing["slug"]
    # Auto-generate slug from name or email local-part
    seed = (user.get("name") or email.split("@", 1)[0])
    slug = _make_slug(seed)
    base = slug
    i = 1
    while await db.techfest_referrers.find_one({"slug": slug}):
        i += 1
        slug = f"{base}-{i}"
    doc = {
        "name": user.get("name") or email,
        "slug": slug,
        "notes": None,
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
        slugs = await _user_scope_slugs(user)
        query["referrer_slug"] = {"$in": slugs}
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
        if existing.get("referrer_slug") not in slugs:
            raise HTTPException(status_code=403, detail="Not allowed to edit this registration")
    updates = {}
    for k, v in payload.model_dump(exclude_none=True).items():
        if isinstance(v, str):
            v = v.strip()
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


@router.get("/admin/techfest/referrers")
async def list_referrers(user: dict = Depends(_admin_or_team)):
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
