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


async def _paid_school_users(filters: dict) -> List[dict]:
    """Paid B2B school students. Source: `school_student_payments` (Cashfree)."""
    q = {"$or": [{"status": "PAID"}, {"order_status": "PAID"}]}
    if filters.get("school"):
        q["school_name"] = {"$regex": filters["school"], "$options": "i"}
    if filters.get("grade"):
        q["grade"] = str(filters["grade"])
    if filters.get("city"):
        q["city"] = {"$regex": filters["city"], "$options": "i"}
    if filters.get("course"):
        q["skill"] = {"$regex": filters["course"], "$options": "i"}
    rows = await db.school_student_payments.find(q, {"_id": 0}).to_list(20000)
    out = []
    for r in rows:
        email = _norm_email(r.get("student_email") or r.get("email"))
        if not email:
            continue
        out.append({
            "email": email,
            "first_name": (r.get("student_name") or "").split(" ")[0] or "Student",
            "last_name": " ".join((r.get("student_name") or "").split(" ")[1:]),
            "source": "school",
            "school": r.get("school_name"),
            "grade": r.get("grade"),
            "city": r.get("city"),
            "course": r.get("skill"),
        })
    return out


async def _paid_b2c_users(filters: dict) -> List[dict]:
    """Paid B2C bookings — AI Foundations, Summer Camp, Workshops (Father's Day, etc)."""
    out = []

    # AI Foundations
    q_aif: dict = {"$or": [{"status": "PAID"}, {"order_status": "PAID"}]}
    aif = await db.ai_foundations_bookings.find(q_aif, {"_id": 0}).to_list(20000)
    for r in aif:
        email = _norm_email(r.get("email") or r.get("parent_email"))
        if not email:
            continue
        out.append({
            "email": email,
            "first_name": (r.get("parent_name") or r.get("name") or "").split(" ")[0] or "Parent",
            "last_name": " ".join((r.get("parent_name") or r.get("name") or "").split(" ")[1:]),
            "source": "b2c",
            "course": "AI Foundations",
            "city": r.get("city"),
            "grade": r.get("grade"),
        })

    # Summer Camp
    sc = await db.summer_camp_bookings.find({"$or": [{"status": "PAID"}, {"order_status": "PAID"}]}, {"_id": 0}).to_list(20000)
    for r in sc:
        email = _norm_email(r.get("parent_email"))
        if not email:
            continue
        out.append({
            "email": email,
            "first_name": (r.get("parent_name") or "").split(" ")[0] or "Parent",
            "last_name": " ".join((r.get("parent_name") or "").split(" ")[1:]),
            "source": "b2c",
            "course": "Summer Camp",
            "city": r.get("city"),
            "grade": r.get("grade"),
        })

    # Workshops (Father's Day, etc.)
    ws = await db.workshop_bookings.find({"status": "PAID"}, {"_id": 0}).to_list(20000)
    for r in ws:
        # workshop bookings tend to lack email — capture phone only; skip if no email
        email = _norm_email(r.get("parent_email") or r.get("email"))
        if not email:
            continue
        out.append({
            "email": email,
            "first_name": (r.get("parent_name") or "").split(" ")[0] or "Parent",
            "last_name": " ".join((r.get("parent_name") or "").split(" ")[1:]),
            "source": "b2c",
            "course": "Workshop",
            "city": r.get("center_label"),
            "grade": r.get("age_group_label"),
        })

    # Apply filters
    if filters.get("course"):
        rx = filters["course"].lower()
        out = [u for u in out if rx in (u.get("course") or "").lower()]
    if filters.get("city"):
        rx = filters["city"].lower()
        out = [u for u in out if rx in (u.get("city") or "").lower()]
    if filters.get("grade"):
        out = [u for u in out if str(u.get("grade") or "") == str(filters["grade"])]
    return out


async def _build_audience(filters: dict) -> List[dict]:
    """Combine paid school + b2c users honoring source filter, dedupe by email,
    drop globally-unsubscribed addresses."""
    source = (filters.get("source") or "both").lower()
    rows: List[dict] = []
    if source in ("school", "both"):
        rows.extend(await _paid_school_users(filters))
    if source in ("b2c", "both"):
        rows.extend(await _paid_b2c_users(filters))

    # Dedupe by email — keep richer record first
    seen = {}
    for u in rows:
        e = u["email"]
        if e not in seen:
            seen[e] = u

    # Drop unsubscribed contacts
    unsubs = await db.broadcast_unsubscribes.distinct("email")
    if unsubs:
        unsub_set = set(unsubs)
        seen = {k: v for k, v in seen.items() if k not in unsub_set}
    return list(seen.values())


# ────────────────────────────────────────────────────────────
# Models
# ────────────────────────────────────────────────────────────

class AudienceFilter(BaseModel):
    source: Literal["school", "b2c", "both"] = "both"
    course: Optional[str] = None
    city: Optional[str] = None
    grade: Optional[str] = None
    school: Optional[str] = None


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    html: str = Field(..., min_length=1)
    filters: AudienceFilter
    from_address: Optional[str] = None
    scheduled_at: Optional[str] = None  # ISO 8601 or natural language ("in 1 hour")


class CampaignSend(BaseModel):
    scheduled_at: Optional[str] = None  # Send now if None


# ────────────────────────────────────────────────────────────
# Audience preview & sync
# ────────────────────────────────────────────────────────────

@router.get("/admin/broadcasts/audience/preview")
async def audience_preview(
    source: str = "both",
    course: Optional[str] = None,
    city: Optional[str] = None,
    grade: Optional[str] = None,
    school: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    rows = await _build_audience({"source": source, "course": course, "city": city, "grade": grade, "school": school})
    return {
        "count": len(rows),
        "by_source": {
            "school": sum(1 for r in rows if r["source"] == "school"),
            "b2c": sum(1 for r in rows if r["source"] == "b2c"),
        },
        "sample": rows[:8],
    }


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
            res = await asyncio.to_thread(resend.Emails.send, {
                "from": camp.get("from_address") or BROADCAST_FROM,
                "to": email,
                "subject": camp["subject"],
                "html": personalized_html,
                "headers": {
                    "List-Unsubscribe": f"<{unsub_url}>",
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
                "tags": [
                    {"name": "campaign_id", "value": campaign_id},
                    {"name": "source", "value": contact.get("source", "unknown")},
                ],
            })
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
