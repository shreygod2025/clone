# Techfest Submission Portal — public-facing OTP flow
#
# Lets a student (team lead) who already submitted a project come back,
# verify their email via a 6-digit OTP, and view/update their submission
# until the admin-defined cutoff (defaults to 2026-10-20 23:59 IST).
#
# Flow:
#   1. POST /api/techfest/submission-portal/request-otp
#        body: { email }
#        → generates a 6-digit code, stores it hashed in
#          `techfest_portal_otps` with a 10-minute TTL, emails it via Resend.
#          AiSensy WhatsApp is sent only if AISENSY_API_KEY is set AND the
#          submission has a phone number on file for this email.
#   2. POST /api/techfest/submission-portal/verify-otp
#        body: { email, otp }
#        → returns a short-lived JWT (24h) signed with JWT_SECRET.
#   3. GET  /api/techfest/submission-portal/my
#        header: Authorization: Bearer <token>
#        → lists submissions belonging to the verified email.
#   4. PATCH /api/techfest/submission-portal/submission/{id}
#        header: Authorization: Bearer <token>
#        body: partial submission fields
#        → updates the submission ONLY if (a) the token's email matches the
#          doc's email and (b) datetime.now < SUBMISSION_EDIT_CUTOFF_UTC.
import hashlib
import logging
import os
import random
import re
import secrets
import time
from datetime import datetime, timezone
from typing import Optional, List

import jwt as pyjwt
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .shared import db
from .techfest import _dispatch_email  # reuse the Resend wrapper

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────
# Admins asked for an edit window that closes at 2026-10-20 23:59 IST
# (which is 2026-10-20T18:29:59Z in UTC — IST is +05:30). Keep this
# literal so a timezone library isn't required.
SUBMISSION_EDIT_CUTOFF_UTC = datetime(2026, 11, 1, 18, 29, 59, tzinfo=timezone.utc)   # 1 Nov 2026 23:59 IST
EAST_EDIT_CUTOFF_UTC = datetime(2026, 10, 20, 18, 29, 59, tzinfo=timezone.utc)         # 20 Oct 2026 23:59 IST (Kanpur round 24 Oct)
CUTOFF_LABELS = {"east": "20 Oct 2026, 11:59 PM IST", "default": "1 Nov 2026, 11:59 PM IST"}


def _cutoff_for(doc: dict) -> datetime:
    return EAST_EDIT_CUTOFF_UTC if (doc.get("zone") or "").lower() == "east" else SUBMISSION_EDIT_CUTOFF_UTC


def _cutoff_label(doc: dict) -> str:
    return CUTOFF_LABELS["east"] if (doc.get("zone") or "").lower() == "east" else CUTOFF_LABELS["default"]
OTP_TTL_SECONDS = 10 * 60        # 10 minutes
OTP_RESEND_COOLDOWN_SECONDS = 30  # at most 1 code every 30s per email
JWT_ALG = "HS256"
JWT_TTL_SECONDS = 24 * 60 * 60   # 24h session


def _jwt_secret() -> str:
    # Reuse the app-wide JWT secret so the portal doesn't ship with a weak
    # default. Falls back to a dev secret only when env is unset — the
    # production .env should always have JWT_SECRET set.
    return os.environ.get("JWT_SECRET") or "dev-techfest-portal-secret"


def _hash_otp(email: str, otp: str) -> str:
    return hashlib.sha256(f"{email.lower()}::{otp}".encode()).hexdigest()


def _rl_key(request: Request, email: str) -> str:
    ip = (request.client.host if request.client else "") or "x"
    return f"{ip}:{email.lower()}"


_otp_rate_limit: dict[str, float] = {}


def _otp_email_html(name: str, code: str) -> str:
    return f"""
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;background:#0A1F44;color:#fff;border-radius:16px;">
      <div style="text-align:center;padding:8px 0 20px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#DC2626;">Techfest 2026 · Submission Portal</div>
        <div style="font-size:22px;font-weight:900;margin-top:6px;">Your verification code</div>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#CBD5E1;">Hi {name or 'there'},</p>
      <p style="font-size:14px;line-height:1.6;color:#CBD5E1;">
        Use the one-time code below to access your Techfest project submission. The code expires in <strong>10 minutes</strong>.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <div style="display:inline-block;padding:14px 28px;background:#DC2626;color:#fff;font-size:28px;font-weight:900;letter-spacing:.5em;border-radius:12px;">{code}</div>
      </div>
      <p style="font-size:12px;line-height:1.6;color:#94A3B8;">If you didn't request this, ignore this email — your submission stays private.</p>
      <p style="font-size:12px;color:#94A3B8;margin-top:24px;">— OLL × Techfest IIT Bombay</p>
    </div>
    """


async def _send_otp_whatsapp(phone: str, name: str, code: str) -> None:
    """Fire-and-forget AiSensy WhatsApp OTP. Silently no-ops if AiSensy
    isn't configured in this environment. The template name must exist
    inside the admin's AiSensy console."""
    key = os.environ.get("AISENSY_API_KEY") or ""
    if not key or not phone:
        return
    try:
        import httpx
        payload = {
            "apiKey": key,
            "campaignName": "otp",
            "destination": phone,
            "userName": "Clone Futura Live Solutions Ltd",
            "templateParams": [code],
            "source": "OLL Techfest Portal",
            "buttons": [{"type": "button", "sub_type": "url", "index": 0, "parameters": [{"type": "text", "text": code}]}],
            "paramsFallbackValue": {"FirstName": code},
        }
        async with httpx.AsyncClient(timeout=15.0) as hx:
            r = await hx.post("https://backend.aisensy.com/campaign/t1/api/v2", json=payload)
        if r.status_code != 200:
            logger.warning("techfest portal OTP whatsapp rejected for %s: %s %s", phone, r.status_code, r.text[:200])
    except Exception as exc:
        logger.warning("techfest portal OTP whatsapp failed for %s: %s", phone, exc)


# ── Pydantic payloads ────────────────────────────────────────────────
class RequestOtpIn(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)


class VerifyOtpIn(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    otp: str = Field(..., min_length=4, max_length=10)


class TeamLoginIn(BaseModel):
    team_id: str = Field(..., min_length=2, max_length=60)


def _phone10(v: Optional[str]) -> str:
    return re.sub(r"\D", "", v or "")[-10:]


def _phone_query(p10: str) -> dict:
    return {"phone": {"$regex": re.escape(p10) + r"\s*$"}}


def _identity(payload) -> str:
    """OTP identity key: 'phone:<10 digits>' or the lower-cased email."""
    if payload.phone and len(_phone10(payload.phone)) == 10:
        return f"phone:{_phone10(payload.phone)}"
    if payload.email:
        return payload.email.lower().strip()
    raise HTTPException(status_code=400, detail="Enter the team leader's phone number or email.")


def _issue_token(sub: str, sids: Optional[list] = None) -> str:
    now_ts = time.time()
    claims = {"sub": sub, "scope": "techfest_submission_portal", "iat": int(now_ts),
              "exp": int(now_ts + JWT_TTL_SECONDS), "jti": secrets.token_urlsafe(12)}
    if sids is not None:
        claims["sids"] = sids
    return pyjwt.encode(claims, _jwt_secret(), algorithm=JWT_ALG)


class TeamMemberPatchIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: Optional[str] = Field(None, max_length=120)
    date_of_birth: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    school: Optional[str] = Field(None, max_length=300)
    id_proof_url: Optional[str] = Field(None, max_length=2000)
    id_proof_type: Optional[str] = Field(None, max_length=20)

    @field_validator("email", "date_of_birth", "phone", "school", "id_proof_url", "id_proof_type", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v


class SubmissionPatchIn(BaseModel):
    # All submission fields the student can edit until the cutoff. We
    # explicitly list the whitelist here so a malicious client can't
    # overwrite status, created_at, id, etc.
    model_config = ConfigDict(str_strip_whitespace=True)
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    date_of_birth: Optional[str] = Field(None, max_length=20)
    age: Optional[int] = Field(None, ge=3, le=120)
    phone: Optional[str] = Field(None, min_length=6, max_length=30)
    country: Optional[str] = Field(None, max_length=80)
    pincode: Optional[str] = Field(None, max_length=20)
    state: Optional[str] = Field(None, max_length=80)
    city: Optional[str] = Field(None, max_length=120)
    school_or_college: Optional[str] = Field(None, max_length=300)
    age_category: Optional[str] = Field(None, max_length=20)
    id_proof_url: Optional[str] = Field(None, min_length=8, max_length=2000)
    id_proof_type: Optional[str] = Field(None, max_length=20)
    competition: Optional[str] = Field(None, max_length=40)
    zone: Optional[str] = Field(None, max_length=20)
    project_category: Optional[str] = Field(None, max_length=120)
    project_theme: Optional[str] = Field(None, max_length=120)
    team_id: Optional[str] = Field(None, max_length=60)
    competition_id: Optional[str] = Field(None, max_length=60)
    drive_link: Optional[str] = Field(None, min_length=8, max_length=2000)
    team_members: Optional[List[TeamMemberPatchIn]] = Field(None, max_length=5)
    school_permission_url: Optional[str] = Field(None, max_length=500)


# ── Endpoints ────────────────────────────────────────────────────────
@router.post("/techfest/submission-portal/request-otp")
async def submission_portal_request_otp(payload: RequestOtpIn, request: Request):
    ident = _identity(payload)
    now_ts = time.time()
    rkey = _rl_key(request, ident)
    last = _otp_rate_limit.get(rkey, 0.0)
    if now_ts - last < OTP_RESEND_COOLDOWN_SECONDS:
        wait = int(OTP_RESEND_COOLDOWN_SECONDS - (now_ts - last))
        raise HTTPException(status_code=429, detail=f"Please wait {wait}s before requesting another code.")
    if ident.startswith("phone:"):
        p10 = ident.split(":", 1)[1]
        sub = await db.techfest_submissions.find_one(_phone_query(p10), sort=[("created_at", -1)])
        if not sub:
            raise HTTPException(status_code=404, detail="No submission found with this team leader phone number.")
        email, phone = (sub.get("email") or "").lower(), p10
    else:
        email = ident
        sub = await db.techfest_submissions.find_one({"email": email}, sort=[("created_at", -1)])
        # Don't reveal whether an email exists.
        phone = (sub or {}).get("phone") or ""
    name = (sub or {}).get("full_name") or ""
    _otp_rate_limit[rkey] = now_ts

    otp = f"{random.randint(0, 999999):06d}"
    await db.techfest_portal_otps.insert_one({
        "email": ident,
        "otp_hash": _hash_otp(ident, otp),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at_ts": now_ts + OTP_TTL_SECONDS,
        "consumed": False,
    })
    await db.techfest_portal_otps.delete_many({"email": ident, "consumed": False, "expires_at_ts": {"$lt": now_ts}})

    if email:
        try:
            res = await _dispatch_email(email, f"Your Techfest submission code: {otp}", _otp_email_html(name, otp))
            if not res.get("success"):
                logger.warning("techfest portal OTP email not sent to %s: %s", email, res)
        except Exception as exc:
            logger.warning("techfest portal OTP email failed for %s: %s", email, exc)
    wa_phone = _phone10(phone)
    await _send_otp_whatsapp(f"91{wa_phone}" if len(wa_phone) == 10 else phone, name, otp)

    masked = (email[:2] + "***" + email[email.find("@"):]) if "@" in email else ""
    return {"ok": True, "expires_in": OTP_TTL_SECONDS, "sent_to_email": masked}


@router.post("/techfest/submission-portal/verify-otp")
async def submission_portal_verify_otp(payload: VerifyOtpIn):
    ident = _identity(payload)
    now_ts = time.time()
    doc = await db.techfest_portal_otps.find_one({
        "email": ident,
        "otp_hash": _hash_otp(ident, payload.otp.strip()),
        "consumed": False,
        "expires_at_ts": {"$gte": now_ts},
    })
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    await db.techfest_portal_otps.update_one(
        {"_id": doc["_id"]},
        {"$set": {"consumed": True, "consumed_at": datetime.now(timezone.utc).isoformat()}},
    )
    sids = None
    if ident.startswith("phone:"):
        cursor = db.techfest_submissions.find(_phone_query(ident.split(":", 1)[1]), {"_id": 1})
        sids = [str(d["_id"]) async for d in cursor]
    return {"ok": True, "token": _issue_token(ident, sids), "email": ident, "expires_in": JWT_TTL_SECONDS}


@router.post("/techfest/submission-portal/team-login")
async def submission_portal_team_login(payload: TeamLoginIn):
    from .techfest import _id_regex, _norm_id
    key = _norm_id(payload.team_id)
    if not key:
        raise HTTPException(status_code=400, detail="Enter your Team ID")
    cursor = db.techfest_submissions.find({"team_id": _id_regex(key)}, {"_id": 1})
    sids = [str(d["_id"]) async for d in cursor]
    if not sids:
        raise HTTPException(status_code=404, detail="No submission found for this Team ID.")
    return {"ok": True, "token": _issue_token(f"team:{key}", sids), "email": f"Team ID {payload.team_id.strip()}", "expires_in": JWT_TTL_SECONDS}


def _verify_portal_token(authorization: Optional[str]) -> dict:
    """Returns the verified email from the Bearer token; raises 401 otherwise."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing portal token")
    token = authorization.split(None, 1)[1].strip()
    try:
        payload = pyjwt.decode(token, _jwt_secret(), algorithms=[JWT_ALG])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — request a new code")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid portal token")
    if payload.get("scope") != "techfest_submission_portal":
        raise HTTPException(status_code=401, detail="Invalid portal token scope")
    sub = (payload.get("sub") or "").lower().strip()
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid portal token subject")
    return {"sub": sub, "sids": payload.get("sids")}


def _owner_query(auth: dict) -> dict:
    if auth["sids"] is not None:
        return {"_id": {"$in": [ObjectId(x) for x in auth["sids"]]}}
    return {"email": auth["sub"]}


def _serialise_submission(doc: dict) -> dict:
    out = {k: v for k, v in doc.items() if k not in ("_id", "review_history", "reviewed_by")}
    out["id"] = str(doc.get("_id"))
    out["edit_cutoff_utc"] = _cutoff_for(doc).isoformat()
    out["edit_cutoff_label"] = _cutoff_label(doc)
    out["edit_window_open"] = datetime.now(timezone.utc) < _cutoff_for(doc)
    return out


@router.get("/techfest/submission-portal/my")
async def submission_portal_my(authorization: Optional[str] = Header(None)):
    auth = _verify_portal_token(authorization)
    cursor = db.techfest_submissions.find(_owner_query(auth)).sort("created_at", -1).limit(50)
    items = [_serialise_submission(d) async for d in cursor]
    return {
        "ok": True,
        "email": auth["sub"],
        "items": items,
        "edit_window_open": any(i["edit_window_open"] for i in items),
    }


@router.patch("/techfest/submission-portal/submission/{submission_id}")
async def submission_portal_update(
    submission_id: str,
    payload: SubmissionPatchIn,
    authorization: Optional[str] = Header(None),
):
    auth = _verify_portal_token(authorization)
    try:
        oid = ObjectId(submission_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid submission id")

    doc = await db.techfest_submissions.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    owns = (submission_id in auth["sids"]) if auth["sids"] is not None else (doc.get("email") or "").lower() == auth["sub"]
    if not owns:
        raise HTTPException(status_code=403, detail="This submission belongs to a different account.")
    if (doc.get("review_status") or "") == "approved":
        raise HTTPException(status_code=403, detail="This submission has been approved and is locked — no further edits allowed.")
    # Stricter of the current and requested zone, so moving out of East can't dodge its earlier cutoff.
    cutoff = min(_cutoff_for(doc), _cutoff_for({"zone": payload.zone or doc.get("zone")}))
    if datetime.now(timezone.utc) >= cutoff:
        raise HTTPException(status_code=403, detail=f"Submission edits are closed for this zone (cutoff: {_cutoff_label(doc)}).")

    # Only persist fields the caller actually sent.
    updates = {k: (v.strip() if isinstance(v, str) else v) for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "email" in updates:
        updates["email"] = updates["email"].lower().strip()
    if not updates:
        return {"ok": True, "modified": 0, "note": "No changes submitted."}
    from .techfest import find_duplicate_submission, _norm_id, DUPLICATE_SUBMISSION_MSG
    changed = {f: updates[f].strip() for f in ("team_id", "competition_id")
               if f in updates and _norm_id(updates[f]) != _norm_id(doc.get(f))}
    if changed:
        if await find_duplicate_submission(changed.get("team_id"), changed.get("competition_id"), exclude_oid=oid):
            raise HTTPException(status_code=409, detail=DUPLICATE_SUBMISSION_MSG)
        updates.update(changed)
    if (doc.get("review_status") or "") == "rejected":
        # Edit after rejection = resubmission → back into the judges' queue.
        updates["review_status"] = "pending"
        updates["resubmitted_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["last_edited_by_student_at"] = updates["updated_at"]
    await db.techfest_submissions.update_one({"_id": oid}, {"$set": updates})
    refreshed = await db.techfest_submissions.find_one({"_id": oid})
    return {"ok": True, "modified": 1, "submission": _serialise_submission(refreshed)}
