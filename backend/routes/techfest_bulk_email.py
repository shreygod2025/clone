"""Techfest Bulk Email — one-shot broadcaster for the Techfest audience.

Audience lives in `techfest_registrations` (type ∈ {student, school, educator}).
Uses Resend via `admin_keys.get_resend_api_key()` and the shared OLL × Techfest
email shell from `techfest_emails.py`.

Endpoints (admin-only):
  GET  /api/admin/techfest/bulk-email/default-template
  POST /api/admin/techfest/bulk-email/preview
  POST /api/admin/techfest/bulk-email/send-sample
  POST /api/admin/techfest/bulk-email/send
  GET  /api/admin/techfest/bulk-email/campaigns

Campaigns are persisted in collection `techfest_bulk_campaigns` with per-
recipient delivery results so admins can audit.
"""
import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Literal

import resend
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from database import db
from routes.admin_keys import get_current_user, get_resend_api_key
from routes.techfest_emails import _shell as techfest_shell

logger = logging.getLogger(__name__)
router = APIRouter()

FROM_EMAIL = os.environ.get("TECHFEST_BULK_FROM", "OLL x IIT Bombay <techfest@oll.co>")
REPLY_TO = "techfest@oll.co"

# ────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────

async def _require_admin(user: dict = Depends(get_current_user)) -> dict:
    role = (user or {}).get("role", "")
    if role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _norm_email(e: Optional[str]) -> Optional[str]:
    if not e or "@" not in e:
        return None
    e = e.strip().lower()
    # cheap sanity check
    if " " in e or e.count("@") != 1:
        return None
    return e


async def _build_audience(
    types: List[str],
    zones: Optional[List[str]] = None,
    competitions: Optional[List[str]] = None,
) -> List[dict]:
    """Return a de-duplicated list of {name, email, type, school} rows from
    techfest_registrations matching the filters."""
    allowed_types = {"student", "school", "educator"}
    types = [t for t in (types or []) if t in allowed_types]
    if not types:
        return []
    query: dict = {
        "deleted_at": {"$exists": False},
        "type": {"$in": types},
    }
    if zones:
        query["zone"] = {"$in": zones}
    if competitions:
        query["selected_competitions"] = {"$in": competitions}

    seen = set()
    out: List[dict] = []
    cursor = db.techfest_registrations.find(query, projection={
        "name": 1, "email": 1, "type": 1,
        "school_name": 1, "school_or_institute": 1,
    }).limit(50000)
    async for doc in cursor:
        email = _norm_email(doc.get("email"))
        if not email or email in seen:
            continue
        seen.add(email)
        out.append({
            "name": (doc.get("name") or "").strip() or "there",
            "email": email,
            "type": doc.get("type"),
            "school": doc.get("school_name") or doc.get("school_or_institute") or "",
        })
    return out


async def _resend_send(to_email: str, subject: str, html: str) -> dict:
    api_key = await get_resend_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Resend API key not configured")
    resend.api_key = api_key
    params = {
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html,
        "reply_to": REPLY_TO,
    }
    return await asyncio.to_thread(resend.Emails.send, params)


def _personalise(html: str, recipient: dict) -> str:
    name = (recipient.get("name") or "there").split(" ")[0]
    school = recipient.get("school") or ""
    return (
        html.replace("{{first_name}}", name)
            .replace("{{name}}", recipient.get("name") or "there")
            .replace("{{school}}", school)
    )


# ────────────────────────────────────────────────────────────
# Default checklist template (editable in the UI before sending)
# ────────────────────────────────────────────────────────────

_CHECKLIST_BODY_HTML = """
      <div style="font-size:11px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#DC2626;">Important Checklist</div>
      <h1 style="font-size:26px;line-height:1.2;margin:6px 0 12px 0;color:#0A1F44;">Your prep checklist for OLL × Techfest Championship</h1>
      <p style="font-size:15px;color:#334155;margin:0 0 18px 0;">Hi {{first_name}}, we're thrilled you're part of OLL's Robotics Championship at Techfest, IIT Bombay. Here's everything you need in one place — bookmark this email.</p>

      <!-- 1. Registration deadline -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;margin:0 0 18px 0;">
        <tr><td style="padding:16px 18px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#DC2626;margin-bottom:6px;">⏰ Deadline — tomorrow, 10 October</div>
          <div style="font-size:15px;color:#0A1F44;line-height:1.6;">
            <strong>Last day for Student registration &amp; Team making</strong><br/>
            <a href="https://oll.co/techfest" style="color:#DC2626;text-decoration:underline;font-weight:600;">Register / Form your team →</a>
          </div>
        </td></tr>
      </table>

      <!-- 2. Registration guides -->
      <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;margin:4px 0 8px 0;">Registration guide videos</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td width="33%" style="padding-right:6px;vertical-align:top;">
            <a href="https://youtu.be/Qdqs0hCc1bY" style="display:block;padding:12px 10px;border:1px solid #e2e8f0;border-radius:10px;text-decoration:none;color:#0A1F44;text-align:center;font-weight:600;background:#f8fafc;font-size:13px;line-height:1.3;">
              <div style="font-size:18px;line-height:1;margin-bottom:4px;">▶</div>
              School Login
            </a>
          </td>
          <td width="33%" style="padding:0 3px;vertical-align:top;">
            <a href="https://youtu.be/5GsFOwR2gj4" style="display:block;padding:12px 10px;border:1px solid #e2e8f0;border-radius:10px;text-decoration:none;color:#0A1F44;text-align:center;font-weight:600;background:#f8fafc;font-size:13px;line-height:1.3;">
              <div style="font-size:18px;line-height:1;margin-bottom:4px;">▶</div>
              Student Registration
            </a>
          </td>
          <td width="33%" style="padding-left:6px;vertical-align:top;">
            <a href="https://youtu.be/Q-L4rruIe-Y" style="display:block;padding:12px 10px;border:1px solid #e2e8f0;border-radius:10px;text-decoration:none;color:#0A1F44;text-align:center;font-weight:600;background:#f8fafc;font-size:13px;line-height:1.3;">
              <div style="font-size:18px;line-height:1;margin-bottom:4px;">▶</div>
              Mentor Registration<br/><span style="font-weight:500;color:#64748b;font-size:11px;">(Teacher / Parent)</span>
            </a>
          </td>
        </tr>
      </table>

      <!-- 3. WhatsApp community -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;margin:0 0 20px 0;">
        <tr><td style="padding:14px 18px;">
          <div style="font-size:13px;color:#065F46;line-height:1.6;">
            <strong>Join the WhatsApp community</strong> for latest updates, webinars &amp; rules.<br/>
            <a href="https://chat.whatsapp.com/EHYuQXpJcb4GyFUTLIEYrR?mode=gi_t" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#059669;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Join WhatsApp group →</a>
          </div>
        </td></tr>
      </table>

      <!-- 4. Kits -->
      <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;margin:4px 0 6px 0;">Robotics kits — last 10 available</div>
      <p style="font-size:14px;color:#0A1F44;margin:0 0 12px 0;font-weight:700;">Order Today to get delivery before 20th October.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td width="50%" style="padding-right:6px;vertical-align:top;">
            <div style="padding:0;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;overflow:hidden;">
              <img src="https://camp-lead-capture.preview.emergentagent.com/techfest/robo-sumo-kit.png" alt="Robo Sumo official kit" style="display:block;width:100%;height:auto;background:#f1f5f9;" />
              <div style="padding:12px 14px;">
                <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#DC2626;margin-bottom:4px;">Robo Sumo official kit</div>
                <div style="font-size:14px;font-weight:700;color:#0A1F44;margin-bottom:10px;">Build · Battle · Win</div>
                <a href="https://oll.co/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a" style="display:block;padding:10px;background:#DC2626;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;text-align:center;font-weight:700;margin-bottom:6px;">Purchase kit →</a>
                <a href="https://youtu.be/qCyF9I3IXCM" style="display:block;padding:10px;background:#f1f5f9;color:#0A1F44;text-decoration:none;border-radius:6px;font-size:13px;text-align:center;font-weight:600;">▶ Making video</a>
              </div>
            </div>
          </td>
          <td width="50%" style="padding-left:6px;vertical-align:top;">
            <div style="padding:0;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;overflow:hidden;">
              <img src="https://camp-lead-capture.preview.emergentagent.com/techfest/robo-race-kit.png" alt="Robo Race official kit" style="display:block;width:100%;height:auto;background:#f1f5f9;" />
              <div style="padding:12px 14px;">
                <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#DC2626;margin-bottom:4px;">Robo Race official kit</div>
                <div style="font-size:14px;font-weight:700;color:#0A1F44;margin-bottom:10px;">Build · Code · Race · Win</div>
                <a href="https://oll.co/shop/product/robo-racer-kit-specially-made-for-iit-bombay-8bf545dc" style="display:block;padding:10px;background:#DC2626;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;text-align:center;font-weight:700;margin-bottom:6px;">Purchase kit →</a>
                <a href="https://youtu.be/n24iJFNf0C0" style="display:block;padding:10px;background:#f1f5f9;color:#0A1F44;text-decoration:none;border-radius:6px;font-size:13px;text-align:center;font-weight:600;">▶ Making video</a>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- 5. Submission -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin:0 0 20px 0;">
        <tr><td style="padding:16px 18px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#1D4ED8;margin-bottom:6px;">📦 Submission deadline — 20 October</div>
          <div style="font-size:14px;color:#1E3A8A;line-height:1.6;">
            <a href="https://youtu.be/AwgBPOTevpg" style="color:#1D4ED8;text-decoration:underline;font-weight:600;">▶ Watch the submission video guide</a>
          </div>
        </td></tr>
      </table>

      <!-- 6. Regional rounds -->
      <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;margin:4px 0 8px 0;">Regional rounds — mark your calendar</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:0 0 20px 0;">
        <tr style="background:#f8fafc;">
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">Zone</td>
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">Date</td>
          <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">Venue</td>
        </tr>
        <tr><td style="padding:10px 14px;font-size:13px;color:#0A1F44;font-weight:600;">East</td><td style="padding:10px 14px;font-size:13px;color:#334155;">24 Oct</td><td style="padding:10px 14px;font-size:13px;color:#334155;">IIT Kanpur</td></tr>
        <tr style="background:#fafafa;"><td style="padding:10px 14px;font-size:13px;color:#0A1F44;font-weight:600;">North</td><td style="padding:10px 14px;font-size:13px;color:#334155;">21 Nov</td><td style="padding:10px 14px;font-size:13px;color:#334155;">Modern Public School, Delhi</td></tr>
        <tr><td style="padding:10px 14px;font-size:13px;color:#0A1F44;font-weight:600;">South</td><td style="padding:10px 14px;font-size:13px;color:#334155;">26 Nov</td><td style="padding:10px 14px;font-size:13px;color:#334155;">RVCE College, Bengaluru</td></tr>
        <tr style="background:#fafafa;"><td style="padding:10px 14px;font-size:13px;color:#0A1F44;font-weight:600;">West</td><td style="padding:10px 14px;font-size:13px;color:#334155;">17 Dec</td><td style="padding:10px 14px;font-size:13px;color:#334155;">IIT Bombay</td></tr>
        <tr><td style="padding:10px 14px;font-size:13px;color:#0A1F44;font-weight:600;">Central</td><td style="padding:10px 14px;font-size:13px;color:#334155;">22–28 Nov (TBD)</td><td style="padding:10px 14px;font-size:13px;color:#334155;">—</td></tr>
      </table>

      <!-- 7. Finale -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0A1F44 0%,#1E3A5F 100%);border-radius:12px;margin:0 0 20px 0;">
        <tr><td style="padding:20px 22px;color:#ffffff;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#FCA5A5;">Grand Finale</div>
          <div style="font-size:20px;font-weight:800;margin-top:4px;">17 December · IIT Bombay</div>
          <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">The culmination of months of grind — all regional winners under one roof.</div>
        </td></tr>
      </table>

      <!-- 8. Help -->
      <div style="padding:14px 16px;background:#f8fafc;border-left:3px solid #DC2626;border-radius:6px;margin:0 0 8px 0;">
        <div style="font-size:14px;color:#0A1F44;line-height:1.6;">
          <strong>Questions?</strong> Visit <a href="https://oll.co/faq" style="color:#DC2626;text-decoration:underline;">oll.co/faq</a> for instant answers, WhatsApp us on the group above, or reply to this email.
        </div>
      </div>
      <p style="font-size:13px;color:#64748b;margin:18px 0 0 0;">See you on the arena,<br/><strong style="color:#0A1F44;">Team OLL × Techfest</strong></p>
"""


def _default_subject() -> str:
    return "Important : Final checklist for OLL Robotics Championship — Registration closes tomorrow"


def _default_html() -> str:
    return techfest_shell(
        title="OLL × Techfest Championship — Important Checklist",
        preheader="Last day to register is tomorrow (10 Oct). Kit links, submission guide, regional rounds — all in one email.",
        body_html=_CHECKLIST_BODY_HTML,
    )


# ────────────────────────────────────────────────────────────
# Payloads
# ────────────────────────────────────────────────────────────

class AudienceFilter(BaseModel):
    types: List[Literal["student", "school", "educator"]] = Field(default_factory=list)
    zones: List[str] = Field(default_factory=list)
    competitions: List[str] = Field(default_factory=list)


class PreviewIn(AudienceFilter):
    pass


class SendSampleIn(BaseModel):
    to_email: EmailStr = "shreyaan@oll.co"
    subject: str
    html: str


class SendIn(AudienceFilter):
    subject: str
    html: str
    name: Optional[str] = None  # friendly campaign label


# ────────────────────────────────────────────────────────────
# Routes
# ────────────────────────────────────────────────────────────

@router.get("/admin/techfest/bulk-email/default-template")
async def get_default_template(user: dict = Depends(_require_admin)):
    return {
        "subject": _default_subject(),
        "html": _default_html(),
    }


@router.post("/admin/techfest/bulk-email/preview")
async def preview_audience(payload: PreviewIn, user: dict = Depends(_require_admin)):
    rows = await _build_audience(payload.types, payload.zones, payload.competitions)
    sample = rows[:25]
    by_type = {"student": 0, "school": 0, "educator": 0}
    for r in rows:
        by_type[r["type"]] = by_type.get(r["type"], 0) + 1
    return {"count": len(rows), "by_type": by_type, "sample": sample}


@router.post("/admin/techfest/bulk-email/send-sample")
async def send_sample(payload: SendSampleIn, user: dict = Depends(_require_admin)):
    to_email = _norm_email(payload.to_email)
    if not to_email:
        raise HTTPException(status_code=400, detail="Invalid tester email")
    html = _personalise(payload.html, {"name": "Shreyaan", "school": "OLL"})
    subject = f"[SAMPLE] {payload.subject}" if not payload.subject.lower().startswith("[sample]") else payload.subject
    try:
        res = await _resend_send(to_email, subject, html)
        return {"ok": True, "to": to_email, "resend_id": (res or {}).get("id")}
    except Exception as e:
        logger.exception("[techfest-bulk-email] sample send failed")
        raise HTTPException(status_code=502, detail=f"Resend error: {e}")


async def _run_campaign(campaign_id: str, recipients: List[dict], subject: str, html: str):
    """Background sender — ~5 emails/sec to stay well under Resend limits."""
    sent, failed = 0, 0
    results: list[dict] = []
    for r in recipients:
        try:
            personal = _personalise(html, r)
            res = await _resend_send(r["email"], subject, personal)
            results.append({"email": r["email"], "status": "sent", "resend_id": (res or {}).get("id")})
            sent += 1
        except Exception as e:
            results.append({"email": r["email"], "status": "failed", "error": str(e)[:300]})
            failed += 1
            logger.warning("[techfest-bulk-email] send fail %s: %s", r["email"], e)
        # throttle
        await asyncio.sleep(0.22)
        # Progress checkpoint every 25
        if (sent + failed) % 25 == 0:
            await db.techfest_bulk_campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"sent": sent, "failed": failed, "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
    await db.techfest_bulk_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {
            "status": "completed",
            "sent": sent,
            "failed": failed,
            "results": results[:5000],  # cap for Mongo doc size safety
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    logger.info("[techfest-bulk-email] campaign %s done sent=%d failed=%d", campaign_id, sent, failed)


@router.post("/admin/techfest/bulk-email/send")
async def send_campaign(payload: SendIn, user: dict = Depends(_require_admin)):
    recipients = await _build_audience(payload.types, payload.zones, payload.competitions)
    if not recipients:
        raise HTTPException(status_code=400, detail="Audience is empty — adjust filters.")

    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": campaign_id,
        "name": (payload.name or "Techfest blast").strip()[:160],
        "subject": payload.subject.strip()[:300],
        "html": payload.html,
        "filters": {
            "types": payload.types,
            "zones": payload.zones,
            "competitions": payload.competitions,
        },
        "total": len(recipients),
        "sent": 0,
        "failed": 0,
        "status": "running",
        "created_by": user.get("email") or user.get("id") or "admin",
        "created_at": now,
        "updated_at": now,
    }
    await db.techfest_bulk_campaigns.insert_one(doc)

    # Fire-and-forget background task
    asyncio.create_task(_run_campaign(campaign_id, recipients, payload.subject.strip(), payload.html))

    return {
        "ok": True,
        "campaign_id": campaign_id,
        "total": len(recipients),
        "status": "running",
    }


@router.get("/admin/techfest/bulk-email/campaigns")
async def list_campaigns(user: dict = Depends(_require_admin)):
    cursor = db.techfest_bulk_campaigns.find(
        {},
        projection={"results": 0, "html": 0},
    ).sort("created_at", -1).limit(50)
    out = []
    async for d in cursor:
        d.pop("_id", None)
        out.append(d)
    return {"items": out, "count": len(out)}


@router.get("/admin/techfest/bulk-email/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, user: dict = Depends(_require_admin)):
    d = await db.techfest_bulk_campaigns.find_one({"id": campaign_id})
    if not d:
        raise HTTPException(status_code=404, detail="Campaign not found")
    d.pop("_id", None)
    return d
