"""
Bulk Email (Broadcasts) — OLL Platform
Marketing campaigns to paid Cashfree students via Resend Broadcasts.

Endpoints:
  GET  /api/admin/broadcasts                       — list campaigns
  POST /api/admin/broadcasts                       — create campaign (draft)
  GET  /api/admin/broadcasts/{id}                  — get with analytics
  POST /api/admin/broadcasts/{id}/send             — send / schedule
  DELETE /api/admin/broadcasts/{id}                — delete draft
  GET  /api/admin/broadcasts/audience/preview      — filter paid users; count + sample
  POST /api/admin/broadcasts/audience/sync         — sync filtered users to Resend audience
  POST /api/webhooks/resend                        — receive Resend events
  GET  /api/unsubscribe/{token}                    — public unsubscribe page payload
  POST /api/unsubscribe/{token}                    — confirm opt-out

Resend Broadcasts pricing & deliverability rely on a verified domain (oll.co already
verified for skills@). Sender used here is configurable via BROADCAST_FROM env or
defaults to marketing@oll.co — *separate sub-address from transactional* so any
spam complaints don't poison the receipt/OTP reputation.
"""
import asyncio
import logging
import os
import secrets
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Literal

import resend
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field

from database import db
from routes.admin_keys import get_current_user, get_resend_api_key

logger = logging.getLogger(__name__)
router = APIRouter()

BROADCAST_FROM = os.environ.get("BROADCAST_FROM", "OLL <marketing@oll.co>")

# ────────────────────────────────────────────────────────────
# Helpers — paid-user discovery
# ────────────────────────────────────────────────────────────

async def _resend():
    api_key = await get_resend_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Resend API key not configured (Admin → API Keys)")
    resend.api_key = api_key
    return api_key


def _norm_email(e: Optional[str]) -> Optional[str]:
    if not e or "@" not in e:
        return None
    return e.strip().lower()


# ────────────────────────────────────────────────────────────
# AUDIENCE BUILDERS v2 — per-source pickers
# Spec format (POST body for /audience/preview & embedded in CampaignCreate.groups):
#   {"groups": [
#     {"type": "b2c_students",  "stages": ["leads","demo","converted"]},
#     {"type": "summer_camp",   "stages": ["leads","converted"]},
#     {"type": "ai_foundations","stages": ["leads","converted"]},
#     {"type": "internship",    "stages": ["leads","converted"]},
#     {"type": "school_payers", "schools": ["<id>"|"all"], "city": "Mumbai", "grade": "7"},
#     {"type": "school_contacts","stages": ["all"|"converted"|...],
#                                "roles":  ["all"|"principal"|"owner"|"accounts"|"teacher"]},
#   ]}
# Backwards compat: the legacy {source, course, city, grade} shape is still
# accepted by _build_audience() (calls _legacy_to_groups internally).
# ────────────────────────────────────────────────────────────

B2C_STAGE_MAP = {
    "leads":     ["new"],
    "demo":      ["demo_completed", "rescheduled", "demo_booked"],
    "converted": ["converted"],
}
SC_STAGE_MAP = {  # summer_camp_bookings — crm_status / payment_status
    "leads":     {"crm_status": {"$nin": ["converted"]}, "payment_status": {"$nin": ["paid"]}},
    "converted": {"$or": [{"crm_status": "converted"}, {"payment_status": "paid"}]},
}
AIF_STAGE_MAP = {  # ai_foundations_bookings
    "leads":     {"payment_status": {"$nin": ["paid"]}},
    "converted": {"payment_status": "paid"},
}


async def _grp_b2c_students(g: dict) -> List[dict]:
    stages = g.get("stages") or ["leads", "demo", "converted"]
    statuses: list = []
    for s in stages:
        statuses.extend(B2C_STAGE_MAP.get(s, [s]))
    q: dict = {"status": {"$in": list(set(statuses))}} if statuses else {}
    if g.get("city"):
        q["city"] = {"$regex": g["city"], "$options": "i"}
    if g.get("age_group"):
        q["age_group"] = {"$regex": g["age_group"], "$options": "i"}
    if g.get("standard"):
        q["standard"] = str(g["standard"])
    rows = await db.student_inquiries.find(q, {"_id": 0}).to_list(20000)
    out = []
    for r in rows:
        e = _norm_email(r.get("email"))
        if not e:
            continue
        out.append({
            "email": e,
            "first_name": (r.get("name") or "").split(" ")[0] or "there",
            "last_name": " ".join((r.get("name") or "").split(" ")[1:]),
            "source": "b2c_students",
            "stage": r.get("status"),
            "course": r.get("skill"),
            "city": r.get("city"),
            "age_group": r.get("age_group"),
        })
    return out


async def _grp_summer_camp(g: dict) -> List[dict]:
    stages = g.get("stages") or ["leads", "converted"]
    or_clauses: list = []
    for s in stages:
        m = SC_STAGE_MAP.get(s)
        if m:
            or_clauses.append(m)
    q: dict = {"$or": or_clauses} if or_clauses else {}
    if g.get("city"):
        q["center_label"] = {"$regex": g["city"], "$options": "i"}
    if g.get("age_group"):
        q["age_group_label"] = {"$regex": g["age_group"], "$options": "i"}
    rows = await db.summer_camp_bookings.find(q, {"_id": 0}).to_list(20000)
    out = []
    for r in rows:
        e = _norm_email(r.get("parent_email"))
        if not e:
            continue
        out.append({
            "email": e,
            "first_name": (r.get("parent_name") or "").split(" ")[0] or "Parent",
            "last_name": " ".join((r.get("parent_name") or "").split(" ")[1:]),
            "source": "summer_camp",
            "stage": "converted" if (r.get("payment_status") == "paid" or r.get("crm_status") == "converted") else "lead",
            "course": "Summer Camp",
            "city": r.get("center_label"),
            "age_group": r.get("age_group_label"),
        })
    return out


async def _grp_ai_foundations(g: dict) -> List[dict]:
    stages = g.get("stages") or ["leads", "converted"]
    or_clauses: list = [AIF_STAGE_MAP[s] for s in stages if s in AIF_STAGE_MAP]
    q: dict = {"$or": or_clauses} if or_clauses else {}
    if g.get("standard"):
        q["student_grade"] = str(g["standard"])
    if g.get("age_group"):
        q["track_label"] = {"$regex": g["age_group"], "$options": "i"}
    rows = await db.ai_foundations_bookings.find(q, {"_id": 0}).to_list(20000)
    out = []
    for r in rows:
        e = _norm_email(r.get("parent_email"))
        if not e:
            continue
        out.append({
            "email": e,
            "first_name": (r.get("parent_name") or "").split(" ")[0] or "Parent",
            "last_name": " ".join((r.get("parent_name") or "").split(" ")[1:]),
            "source": "ai_foundations",
            "stage": "converted" if r.get("payment_status") == "paid" else "lead",
            "course": "AI Foundations",
            "standard": r.get("student_grade"),
            "age_group": r.get("track_label"),
        })
    return out


async def _grp_internship(g: dict) -> List[dict]:
    """Social-media intern + summer internship registrations."""
    stages = g.get("stages") or ["leads", "converted"]
    or_clauses: list = []
    if "leads" in stages:
        or_clauses.append({"payment_status": {"$nin": ["paid"]}})
    if "converted" in stages:
        or_clauses.append({"payment_status": "paid"})
    q: dict = {"$or": or_clauses} if or_clauses else {}
    out = []
    for coll, label in [
        ("social_media_intern_registrations", "Social Media Internship"),
        ("summer_internship_registrations", "Summer Internship"),
    ]:
        rows = await db[coll].find(q, {"_id": 0}).to_list(20000)
        for r in rows:
            e = _norm_email(r.get("email") or r.get("parent_email"))
            if not e:
                continue
            out.append({
                "email": e,
                "first_name": (r.get("name") or r.get("parent_name") or "").split(" ")[0] or "there",
                "last_name": " ".join((r.get("name") or r.get("parent_name") or "").split(" ")[1:]),
                "source": "internship",
                "stage": "converted" if r.get("payment_status") == "paid" else "lead",
                "course": label,
            })
    return out


async def _grp_school_payers(g: dict) -> List[dict]:
    """Parents who paid online for their kids via Cashfree school-payments."""
    q: dict = {"$or": [{"status": "PAID"}, {"order_status": "PAID"}]}
    schools = g.get("schools") or []
    if schools and "all" not in [s.lower() if isinstance(s, str) else s for s in schools]:
        q["school_id"] = {"$in": schools}
    if g.get("city"):
        q["city"] = {"$regex": g["city"], "$options": "i"}
    if g.get("grade"):
        q["grade"] = str(g["grade"])
    if g.get("standard"):
        q["grade"] = str(g["standard"])
    if g.get("age_group"):
        q["age_group"] = {"$regex": g["age_group"], "$options": "i"}
    rows = await db.school_student_payments.find(q, {"_id": 0}).to_list(20000)
    out = []
    for r in rows:
        e = _norm_email(r.get("student_email") or r.get("email"))
        if not e:
            continue
        out.append({
            "email": e,
            "first_name": (r.get("student_name") or "").split(" ")[0] or "Student",
            "last_name": " ".join((r.get("student_name") or "").split(" ")[1:]),
            "source": "school_payers",
            "stage": "paid",
            "school": r.get("school_name"),
            "grade": r.get("grade"),
            "city": r.get("city"),
            "course": r.get("skill"),
        })
    return out


async def _grp_school_contacts(g: dict) -> List[dict]:
    """B2B contacts at schools — principal, owner, accounts, teacher.
    Reads contacts from both the top-level `school_contacts` array and
    nested `onboarding_data.school_contacts`."""
    stages = g.get("stages") or []
    roles = g.get("roles") or ["all"]
    role_set = None if "all" in roles else {r.lower() for r in roles}

    sq: dict = {}
    if stages and "all" not in stages:
        sq["status"] = {"$in": stages}
    if g.get("city"):
        sq["location"] = {"$regex": g["city"], "$options": "i"}
    schools = await db.school_inquiries.find(sq, {"_id": 0}).to_list(5000)

    out = []
    for s in schools:
        # Pool of contacts from both fields
        contacts: list = []
        if isinstance(s.get("school_contacts"), list):
            contacts.extend(s["school_contacts"])
        od = s.get("onboarding_data") or {}
        if isinstance(od.get("school_contacts"), list):
            contacts.extend(od["school_contacts"])
        # Top-level single contact_name/email as fallback
        if s.get("email") and not contacts:
            contacts.append({"name": s.get("contact_name"), "email": s.get("email"), "role": "primary"})

        for c in contacts:
            e = _norm_email(c.get("email"))
            if not e:
                continue
            r_ = (c.get("role") or "").lower()
            if role_set is not None and r_ not in role_set:
                continue
            out.append({
                "email": e,
                "first_name": (c.get("name") or "").split(" ")[0] or "there",
                "last_name": " ".join((c.get("name") or "").split(" ")[1:]),
                "source": "school_contacts",
                "stage": s.get("status"),
                "role": r_ or "contact",
                "school": s.get("school_name"),
                "city": (s.get("location") or "").split(",")[0],
            })
    return out


GROUP_BUILDERS = {
    "b2c_students":     _grp_b2c_students,
    "summer_camp":      _grp_summer_camp,
    "ai_foundations":   _grp_ai_foundations,
    "internship":       _grp_internship,
    "school_payers":    _grp_school_payers,
    "school_contacts":  _grp_school_contacts,
}


def _legacy_to_groups(flat: dict) -> List[dict]:
    """Translate the old {source: school/b2c/both} filter shape into groups."""
    src = (flat.get("source") or "both").lower()
    common = {k: flat[k] for k in ("course", "city", "grade", "school") if flat.get(k)}
    groups: List[dict] = []
    if src in ("school", "both"):
        sg = {"type": "school_payers"}
        if common.get("city"):
            sg["city"] = common["city"]
        if common.get("grade"):
            sg["grade"] = common["grade"]
        groups.append(sg)
    if src in ("b2c", "both"):
        groups.append({"type": "b2c_students",   "stages": ["leads", "demo", "converted"]})
        groups.append({"type": "summer_camp",    "stages": ["leads", "converted"]})
        groups.append({"type": "ai_foundations", "stages": ["leads", "converted"]})
    return groups


async def _build_audience(filters: dict) -> List[dict]:
    """Accepts EITHER:
       • new shape: {"groups": [...]}
       • legacy:    {"source": "school|b2c|both", "course": ..., "city": ..., "grade": ...}
    Combines results, dedupes by email, drops unsubscribed."""
    groups: list = filters.get("groups") or _legacy_to_groups(filters)
    rows: List[dict] = []
    for g in groups:
        builder = GROUP_BUILDERS.get((g.get("type") or "").lower())
        if not builder:
            continue
        try:
            rows.extend(await builder(g))
        except Exception as ex:
            logger.warning(f"[Broadcast] group {g.get('type')} failed: {ex}")

    # Dedupe by email — first occurrence wins
    seen: dict = {}
    for u in rows:
        e = u["email"]
        if e not in seen:
            seen[e] = u

    unsubs = await db.broadcast_unsubscribes.distinct("email")
    if unsubs:
        unsub_set = set(unsubs)
        seen = {k: v for k, v in seen.items() if k not in unsub_set}
    return list(seen.values())


# ────────────────────────────────────────────────────────────
# Models
# ────────────────────────────────────────────────────────────

class AudienceGroup(BaseModel):
    """One source in a campaign's audience. See _build_audience() docstring."""
    type: str
    stages: Optional[List[str]] = None
    roles: Optional[List[str]] = None
    schools: Optional[List[str]] = None
    city: Optional[str] = None
    grade: Optional[str] = None
    standard: Optional[str] = None
    age_group: Optional[str] = None


class AudienceFilter(BaseModel):
    # Either provide the new `groups` spec OR the legacy flat fields.
    groups: Optional[List[AudienceGroup]] = None
    source: Optional[Literal["school", "b2c", "both"]] = None
    course: Optional[str] = None
    city: Optional[str] = None
    grade: Optional[str] = None
    school: Optional[str] = None


class Attachment(BaseModel):
    filename: str
    content: str  # base64-encoded


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    html: str = Field(..., min_length=1)
    filters: AudienceFilter
    from_address: Optional[str] = None
    reply_to: Optional[str] = None
    attachments: Optional[List[Attachment]] = None
    scheduled_at: Optional[str] = None


class SampleSend(BaseModel):
    recipient: EmailStr
    subject: str
    html: str
    from_address: Optional[str] = None
    reply_to: Optional[str] = None
    attachments: Optional[List[Attachment]] = None


class CampaignSend(BaseModel):
    scheduled_at: Optional[str] = None


# ────────────────────────────────────────────────────────────
# Audience preview & recipients list
# ────────────────────────────────────────────────────────────

@router.post("/admin/broadcasts/audience/preview")
async def audience_preview_post(
    payload: AudienceFilter = Body(...),
    user: dict = Depends(get_current_user),
):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    rows = await _build_audience(payload.model_dump(exclude_none=True))
    by_source: dict = {}
    for r in rows:
        by_source[r["source"]] = by_source.get(r["source"], 0) + 1
    return {
        "count": len(rows),
        "by_source": by_source,
        "sample": rows[:8],
    }


@router.post("/admin/broadcasts/audience/recipients")
async def audience_recipients_post(
    payload: AudienceFilter = Body(...),
    page: int = 1,
    page_size: int = 100,
    user: dict = Depends(get_current_user),
):
    """Return the FULL list of recipients (paginated) so the admin can verify
    exactly which names + emails will receive the email before clicking Send."""
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    rows = await _build_audience(payload.model_dump(exclude_none=True))
    page = max(1, page)
    page_size = max(1, min(page_size, 500))
    start = (page - 1) * page_size
    return {
        "count": len(rows),
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (len(rows) + page_size - 1) // page_size),
        "recipients": rows[start:start + page_size],
    }


@router.get("/admin/broadcasts/audience/preview")
async def audience_preview_get(
    source: str = "both",
    course: Optional[str] = None,
    city: Optional[str] = None,
    grade: Optional[str] = None,
    school: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Legacy flat-query endpoint — still used by the older composer.
    The new composer should POST a `groups` spec to /audience/preview instead."""
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    rows = await _build_audience({"source": source, "course": course, "city": city, "grade": grade, "school": school})
    by_source: dict = {}
    for r in rows:
        by_source[r["source"]] = by_source.get(r["source"], 0) + 1
    return {"count": len(rows), "by_source": by_source, "sample": rows[:8]}


@router.get("/admin/broadcasts/schools-list")
async def schools_list_for_picker(user: dict = Depends(get_current_user)):
    """Lightweight schools list for the audience-picker multi-select."""
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    rows = await db.school_inquiries.find({}, {"_id": 0, "id": 1, "school_name": 1, "status": 1, "location": 1}).sort("school_name", 1).to_list(2000)
    return {"schools": rows}


def _personalize(html: str, contact: dict, unsubscribe_url: str) -> str:
    """Simple `{{first_name}}` & unsubscribe link substitution."""
    name = contact.get("first_name") or "there"
    out = html.replace("{{first_name}}", name)
    out = out.replace("{{name}}", name)
    out = out.replace("{{unsubscribe_url}}", unsubscribe_url)
    return out


def _ensure_unsubscribe_footer(html: str) -> str:
    """Make sure every campaign carries an unsubscribe link & physical-address footer."""
    if "{{unsubscribe_url}}" in html or "unsubscribe_url" in html:
        return html
    footer = (
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px 0"/>'
        '<p style="font-size:12px;color:#64748b;line-height:1.5;text-align:center">'
        'You received this because you have an active OLL program. '
        '<a href="{{unsubscribe_url}}" style="color:#64748b;text-decoration:underline">Unsubscribe</a><br/>'
        'OLL · Online Live Learning · Mumbai, Maharashtra, India'
        '</p>'
    )
    return html + footer


# ────────────────────────────────────────────────────────────
# Campaigns CRUD
# ────────────────────────────────────────────────────────────

@router.get("/admin/broadcasts/senders")
async def list_senders(user: dict = Depends(get_current_user)):
    """Verified sender addresses available for broadcasts. Add/remove via
    BROADCAST_SENDERS env (comma-separated)."""
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    raw = os.environ.get(
        "BROADCAST_SENDERS",
        "OLL Marketing <marketing@oll.co>,"
        "OLL Team <team@oll.co>,"
        "OLL Skills <skills@oll.co>,"
        "OLL Support <support@oll.co>",
    )
    senders = [s.strip() for s in raw.split(",") if s.strip()]
    return {"senders": senders, "default": senders[0] if senders else BROADCAST_FROM}


@router.post("/admin/broadcasts/send-sample")
async def send_sample(payload: SampleSend, user: dict = Depends(get_current_user)):
    """Send a single test email of the current draft to any email — used by the
    composer's 'Send sample' button."""
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    api_key = await get_resend_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Resend API key not configured")
    resend.api_key = api_key
    # Provide a fake recipient context so {{first_name}} etc. render in the preview
    fake_contact = {"first_name": "Priya", "last_name": "Sharma", "course": "AI Foundations", "school": "OLL Demo School", "city": "Mumbai"}
    backend_url = os.environ.get("BACKEND_PUBLIC_URL", "https://oll.co")
    unsub_url = f"{backend_url}/unsubscribe?token=sample-preview"
    html = _personalize(_ensure_unsubscribe_footer(payload.html), fake_contact, unsub_url)
    subject = "[SAMPLE] " + _personalize(payload.subject, fake_contact, unsub_url)
    email_params = {
        "from": payload.from_address or BROADCAST_FROM,
        "to": str(payload.recipient),
        "subject": subject,
        "html": html,
        "headers": {"X-OLL-Sample": "true"},
    }
    if payload.reply_to:
        email_params["reply_to"] = payload.reply_to
    if payload.attachments:
        email_params["attachments"] = [a.model_dump() for a in payload.attachments]
    try:
        res = await asyncio.to_thread(resend.Emails.send, email_params)
        return {"ok": True, "resend_id": (res or {}).get("id") if isinstance(res, dict) else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Send failed: {e}")


@router.get("/admin/broadcasts")
async def list_campaigns(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    rows = await db.broadcast_campaigns.find({}, {"_id": 0, "html": 0}).sort("created_at", -1).to_list(200)
    return {"campaigns": rows}


@router.post("/admin/broadcasts")
async def create_campaign(payload: CampaignCreate, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "subject": payload.subject,
        "html": _ensure_unsubscribe_footer(payload.html),
        "filters": payload.filters.model_dump(),
        "from_address": payload.from_address or BROADCAST_FROM,
        "reply_to": payload.reply_to,
        "attachments": [a.model_dump() for a in (payload.attachments or [])],
        "status": "draft",
        "scheduled_at": payload.scheduled_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email"),
        "sent_at": None,
        "stats": {"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "unsubscribed": 0, "complained": 0},
    }
    await db.broadcast_campaigns.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/admin/broadcasts/{campaign_id}")
async def get_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    camp = await db.broadcast_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
    # Refresh stats from events
    stats = {"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "unsubscribed": 0, "complained": 0}
    pipeline = [
        {"$match": {"campaign_id": campaign_id}},
        {"$group": {"_id": "$event_type", "n": {"$sum": 1}}},
    ]
    async for row in db.broadcast_events.aggregate(pipeline):
        et = (row["_id"] or "").replace("email.", "").replace("contact.", "")
        if et == "sent":
            stats["sent"] = row["n"]
        elif et == "delivered":
            stats["delivered"] = row["n"]
        elif et == "opened":
            stats["opened"] = row["n"]
        elif et == "clicked":
            stats["clicked"] = row["n"]
        elif et == "bounced":
            stats["bounced"] = row["n"]
        elif et == "complained":
            stats["complained"] = row["n"]
        elif et == "unsubscribed":
            stats["unsubscribed"] = row["n"]
    if camp.get("stats", {}).get("sent"):
        stats["sent"] = max(stats["sent"], camp["stats"]["sent"])
    camp["stats"] = stats
    return camp


@router.delete("/admin/broadcasts/{campaign_id}")
async def delete_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    camp = await db.broadcast_campaigns.find_one({"id": campaign_id})
    if not camp:
        raise HTTPException(status_code=404, detail="Not found")
    if camp.get("status") not in ("draft", "failed"):
        raise HTTPException(status_code=400, detail="Only draft/failed campaigns can be deleted")
    await db.broadcast_campaigns.delete_one({"id": campaign_id})
    return {"ok": True}


# ────────────────────────────────────────────────────────────
# Sending — uses per-recipient Resend Emails.send for max control
# (Resend Broadcasts is suited for opt-in audiences; here we already have
# our own consent-aware list from paid users, and our own unsubscribe handling
# via signed tokens.)
# ────────────────────────────────────────────────────────────

async def _send_campaign(campaign_id: str):
    camp = await db.broadcast_campaigns.find_one({"id": campaign_id})
    if not camp:
        logger.error(f"[Broadcast] campaign {campaign_id} not found")
        return
    api_key = await get_resend_api_key()
    if not api_key:
        await db.broadcast_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "failed", "error": "Resend API key missing"}},
        )
        return
    resend.api_key = api_key

    audience = await _build_audience(camp.get("filters") or {})
    if not audience:
        await db.broadcast_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "failed", "error": "Audience is empty"}},
        )
        return

    await db.broadcast_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "sending", "send_started_at": datetime.now(timezone.utc).isoformat()}},
    )

    backend_url = os.environ.get("BACKEND_PUBLIC_URL", "https://oll.co")
    sent, failed = 0, 0
    for contact in audience:
        email = contact["email"]
        # Mint or reuse unsubscribe token
        token_doc = await db.unsubscribe_tokens.find_one({"email": email})
        if not token_doc:
            token = secrets.token_urlsafe(24)
            token_doc = {
                "token": token,
                "email": email,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.unsubscribe_tokens.insert_one(token_doc)
        else:
            token = token_doc["token"]
        unsub_url = f"{backend_url}/unsubscribe?token={token}"

        personalized_html = _personalize(camp["html"], contact, unsub_url)

        try:
            email_params = {
                "from": camp.get("from_address") or BROADCAST_FROM,
                "to": email,
                "subject": _personalize(camp["subject"], contact, unsub_url),
                "html": personalized_html,
                "headers": {
                    "List-Unsubscribe": f"<{unsub_url}>",
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
                "tags": [
                    {"name": "campaign_id", "value": campaign_id},
                    {"name": "source", "value": contact.get("source", "unknown")},
                ],
            }
            if camp.get("reply_to"):
                email_params["reply_to"] = camp["reply_to"]
            if camp.get("attachments"):
                email_params["attachments"] = camp["attachments"]
            res = await asyncio.to_thread(resend.Emails.send, email_params)
            resend_id = (res or {}).get("id") if isinstance(res, dict) else None
            await db.broadcast_events.insert_one({
                "campaign_id": campaign_id,
                "event_type": "sent",
                "recipient": email,
                "resend_id": resend_id,
                "ts": datetime.now(timezone.utc).isoformat(),
            })
            sent += 1
        except Exception as e:
            await db.broadcast_events.insert_one({
                "campaign_id": campaign_id,
                "event_type": "failed",
                "recipient": email,
                "error": str(e),
                "ts": datetime.now(timezone.utc).isoformat(),
            })
            failed += 1
        # Respect Resend's 10 req/sec free-tier — be conservative at 4/sec
        await asyncio.sleep(0.25)

    await db.broadcast_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {
            "status": "sent",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "stats.sent": sent,
            "stats.failed": failed,
        }},
    )
    logger.info(f"[Broadcast] {campaign_id}: sent={sent}, failed={failed}")


async def process_scheduled_broadcasts():
    """Cron tick — fire any campaigns whose scheduled_at has elapsed."""
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = db.broadcast_campaigns.find({
        "status": "scheduled",
        "scheduled_at": {"$lte": now_iso, "$ne": None},
    })
    async for camp in cursor:
        cid = camp.get("id")
        if not cid:
            continue
        logger.info(f"[Broadcast] Firing scheduled campaign {cid}")
        asyncio.create_task(_send_campaign(cid))


@router.post("/admin/broadcasts/{campaign_id}/send")
async def send_campaign(campaign_id: str, payload: CampaignSend, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    camp = await db.broadcast_campaigns.find_one({"id": campaign_id})
    if not camp:
        raise HTTPException(status_code=404, detail="Not found")
    if camp.get("status") not in ("draft", "scheduled", "failed"):
        raise HTTPException(status_code=400, detail=f"Cannot send a campaign in status '{camp.get('status')}'")

    # Pre-flight: audience must be non-empty
    audience = await _build_audience(camp.get("filters") or {})
    if not audience:
        raise HTTPException(status_code=400, detail="Audience is empty — no paid users match these filters")

    if payload.scheduled_at:
        # Persist schedule; the daily scheduler tick will pick it up.
        await db.broadcast_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "scheduled", "scheduled_at": payload.scheduled_at}},
        )
        return {"status": "scheduled", "scheduled_at": payload.scheduled_at}

    # Fire and forget — background task
    asyncio.create_task(_send_campaign(campaign_id))
    return {"status": "sending"}


# ────────────────────────────────────────────────────────────
# Resend Webhooks
# ────────────────────────────────────────────────────────────

@router.post("/webhooks/resend")
async def resend_webhook(request: Request):
    """Receive Resend events. Configure at https://resend.com/webhooks pointing to
    {BACKEND_PUBLIC_URL}/api/webhooks/resend. We trust the public endpoint to be
    behind ingress + an optional shared secret in `RESEND_WEBHOOK_SECRET`."""
    secret = os.environ.get("RESEND_WEBHOOK_SECRET")
    if secret:
        provided = request.headers.get("X-Webhook-Secret") or request.query_params.get("secret")
        if provided != secret:
            raise HTTPException(status_code=401, detail="Bad webhook secret")
    body = await request.json()
    event_type = (body.get("type") or "").lower()
    data = body.get("data") or {}
    recipient = None
    if isinstance(data.get("to"), list) and data["to"]:
        recipient = data["to"][0]
    elif isinstance(data.get("to"), str):
        recipient = data["to"]

    # Find campaign_id from tags
    campaign_id = None
    for tag in (data.get("tags") or []):
        if isinstance(tag, dict) and tag.get("name") == "campaign_id":
            campaign_id = tag.get("value")
            break

    await db.broadcast_events.insert_one({
        "campaign_id": campaign_id,
        "event_type": event_type.replace("email.", "").replace("contact.", ""),
        "recipient": recipient,
        "resend_id": data.get("email_id") or data.get("id"),
        "raw": body,
        "ts": datetime.now(timezone.utc).isoformat(),
    })

    # If it's a bounce/complaint/unsubscribed, mark unsubscribe
    if event_type in ("email.bounced", "email.complained", "contact.unsubscribed") and recipient:
        await db.broadcast_unsubscribes.update_one(
            {"email": recipient.lower()},
            {"$set": {
                "email": recipient.lower(),
                "reason": event_type,
                "unsubscribed_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    return {"ok": True}


# ────────────────────────────────────────────────────────────
# Unsubscribe — public, token-based, no auth
# ────────────────────────────────────────────────────────────

@router.get("/unsubscribe/{token}")
async def unsubscribe_lookup(token: str):
    tok = await db.unsubscribe_tokens.find_one({"token": token}, {"_id": 0})
    if not tok:
        raise HTTPException(status_code=404, detail="Invalid or expired link")
    already = await db.broadcast_unsubscribes.find_one({"email": tok["email"]}) is not None
    return {"email": tok["email"], "already_unsubscribed": already}


@router.post("/unsubscribe/{token}")
async def unsubscribe_confirm(token: str):
    tok = await db.unsubscribe_tokens.find_one({"token": token})
    if not tok:
        raise HTTPException(status_code=404, detail="Invalid or expired link")
    email = tok["email"].lower()
    await db.broadcast_unsubscribes.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "reason": "user_clicked_unsubscribe",
            "unsubscribed_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True, "email": email}
