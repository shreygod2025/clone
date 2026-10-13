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
import secrets
import time
from datetime import datetime, timezone
from typing import Optional, List

import jwt as pyjwt
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel, EmailStr, Field

from .shared import db
from .techfest import _dispatch_email  # reuse the Resend wrapper

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────
# Admins asked for an edit window that closes at 2026-10-20 23:59 IST
# (which is 2026-10-20T18:29:59Z in UTC — IST is +05:30). Keep this
# literal so a timezone library isn't required.
SUBMISSION_EDIT_CUTOFF_UTC = datetime(2026, 10, 20, 18, 29, 59, tzinfo=timezone.utc)
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
        template = os.environ.get("AISENSY_OTP_TEMPLATE") or "techfest_portal_otp"
        payload = {
            "apiKey": key,
            "campaignName": template,
            "destination": phone,
            "userName": name or "there",
            "templateParams": [code],
        }
        async with httpx.AsyncClient(timeout=15.0) as hx:
            await hx.post("https://backend.aisensy.com/campaign/t1/api/v2", json=payload)
    except Exception as exc:
        logger.warning("techfest portal OTP whatsapp failed for %s: %s", phone, exc)


# ── Pydantic payloads ────────────────────────────────────────────────
class RequestOtpIn(BaseModel):
    email: EmailStr


class VerifyOtpIn(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)


class TeamMemberPatchIn(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    date_of_birth: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    school: Optional[str] = Field(None, max_length=200)
    id_proof_url: Optional[str] = Field(None, max_length=500)
    id_proof_type: Optional[str] = Field(None, max_length=20)


class SubmissionPatchIn(BaseModel):
    # All submission fields the student can edit until the cutoff. We
    # explicitly list the whitelist here so a malicious client can't
    # overwrite status, created_at, id, etc.
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    date_of_birth: Optional[str] = Field(None, max_length=20)
    age: Optional[int] = Field(None, ge=3, le=120)
    phone: Optional[str] = Field(None, min_length=6, max_length=20)
    country: Optional[str] = Field(None, max_length=80)
    pincode: Optional[str] = Field(None, max_length=20)
    state: Optional[str] = Field(None, max_length=80)
    city: Optional[str] = Field(None, max_length=80)
    school_or_college: Optional[str] = Field(None, max_length=200)
    age_category: Optional[str] = Field(None, max_length=20)
    id_proof_url: Optional[str] = Field(None, min_length=8, max_length=500)
    id_proof_type: Optional[str] = Field(None, max_length=20)
    competition: Optional[str] = Field(None, max_length=40)
    zone: Optional[str] = Field(None, max_length=20)
    project_category: Optional[str] = Field(None, max_length=120)
    project_theme: Optional[str] = Field(None, max_length=120)
    team_id: Optional[str] = Field(None, max_length=60)
    competition_id: Optional[str] = Field(None, max_length=60)
    drive_link: Optional[str] = Field(None, min_length=8, max_length=500)
    team_members: Optional[List[TeamMemberPatchIn]] = Field(None, max_length=5)
    school_permission_url: Optional[str] = Field(None, max_length=500)


# ── Endpoints ────────────────────────────────────────────────────────
@router.post("/techfest/submission-portal/request-otp")
async def submission_portal_request_otp(payload: RequestOtpIn, request: Request):
    email = payload.email.lower().strip()

    # Rate limit: no more than one OTP every 30s per (ip, email).
    now_ts = time.time()
    rkey = _rl_key(request, email)
    last = _otp_rate_limit.get(rkey, 0.0)
    if now_ts - last < OTP_RESEND_COOLDOWN_SECONDS:
        wait = int(OTP_RESEND_COOLDOWN_SECONDS - (now_ts - last))
        raise HTTPException(status_code=429, detail=f"Please wait {wait}s before requesting another code.")
    _otp_rate_limit[rkey] = now_ts

    # Resolve the student's name + phone from their most-recent submission
    # so we can personalise the email + optionally send WhatsApp.
    sub = await db.techfest_submissions.find_one(
        {"email": email},
        sort=[("created_at", -1)],
    )
    # NOTE: we DELIBERATELY don't 404 here — telling an attacker whether
    # an email exists is a disclosure. We still send the OTP so timing is
    # consistent; it just won't be useful if no submission exists.
    name = (sub or {}).get("full_name") or ""
    phone = (sub or {}).get("phone") or ""

    otp = f"{random.randint(0, 999999):06d}"
    hashed = _hash_otp(email, otp)
    await db.techfest_portal_otps.insert_one({
        "email": email,
        "otp_hash": hashed,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at_ts": now_ts + OTP_TTL_SECONDS,
        "consumed": False,
    })
    # Prune older unconsumed codes so a user doesn't accumulate dozens.
    await db.techfest_portal_otps.delete_many({
        "email": email,
        "consumed": False,
        "expires_at_ts": {"$lt": now_ts},
    })

    # Fire email (always) + WhatsApp (best-effort).
    try:
        await _dispatch_email(
            email,
            f"Your Techfest submission code: {otp}",
            _otp_email_html(name, otp),
        )
    except Exception as exc:
        logger.warning("techfest portal OTP email failed for %s: %s", email, exc)
    await _send_otp_whatsapp(phone, name, otp)

    return {"ok": True, "expires_in": OTP_TTL_SECONDS}


@router.post("/techfest/submission-portal/verify-otp")
async def submission_portal_verify_otp(payload: VerifyOtpIn):
    email = payload.email.lower().strip()
    otp = payload.otp.strip()
    hashed = _hash_otp(email, otp)
    now_ts = time.time()
    doc = await db.techfest_portal_otps.find_one({
        "email": email,
        "otp_hash": hashed,
        "consumed": False,
        "expires_at_ts": {"$gte": now_ts},
    })
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    await db.techfest_portal_otps.update_one(
        {"_id": doc["_id"]},
        {"$set": {"consumed": True, "consumed_at": datetime.now(timezone.utc).isoformat()}},
    )
    token = pyjwt.encode(
        {
            "sub": email,
            "scope": "techfest_submission_portal",
            "iat": int(now_ts),
            "exp": int(now_ts + JWT_TTL_SECONDS),
            "jti": secrets.token_urlsafe(12),
        },
        _jwt_secret(),
        algorithm=JWT_ALG,
    )
    return {"ok": True, "token": token, "email": email, "expires_in": JWT_TTL_SECONDS}


def _verify_portal_token(authorization: Optional[str]) -> str:
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
    email = (payload.get("sub") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=401, detail="Invalid portal token subject")
    return email


def _serialise_submission(doc: dict) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc.get("_id"))
    return out


@router.get("/techfest/submission-portal/my")
async def submission_portal_my(authorization: Optional[str] = Header(None)):
    email = _verify_portal_token(authorization)
    cursor = db.techfest_submissions.find({"email": email}).sort("created_at", -1).limit(50)
    items = [_serialise_submission(d) async for d in cursor]
    return {
        "ok": True,
        "email": email,
        "items": items,
        "edit_cutoff_utc": SUBMISSION_EDIT_CUTOFF_UTC.isoformat(),
        "edit_window_open": datetime.now(timezone.utc) < SUBMISSION_EDIT_CUTOFF_UTC,
    }


@router.patch("/techfest/submission-portal/submission/{submission_id}")
async def submission_portal_update(
    submission_id: str,
    payload: SubmissionPatchIn,
    authorization: Optional[str] = Header(None),
):
    email = _verify_portal_token(authorization)
    if datetime.now(timezone.utc) >= SUBMISSION_EDIT_CUTOFF_UTC:
        raise HTTPException(status_code=403, detail="Submission edits are closed (cutoff: 20 Oct 2026 23:59 IST).")
    try:
        oid = ObjectId(submission_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid submission id")

    doc = await db.techfest_submissions.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    if (doc.get("email") or "").lower() != email:
        # Prevents a verified user from editing someone else's submission.
        raise HTTPException(status_code=403, detail="This submission belongs to a different account.")

    # Only persist fields the caller actually sent.
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        return {"ok": True, "modified": 0, "note": "No changes submitted."}
    from .techfest import find_duplicate_submission, _norm_id, DUPLICATE_SUBMISSION_MSG
    changed = {f: updates[f].strip() for f in ("team_id", "competition_id")
               if f in updates and _norm_id(updates[f]) != _norm_id(doc.get(f))}
    if changed:
        if await find_duplicate_submission(changed.get("team_id"), changed.get("competition_id"), exclude_oid=oid):
            raise HTTPException(status_code=409, detail=DUPLICATE_SUBMISSION_MSG)
        updates.update(changed)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["last_edited_by_student_at"] = updates["updated_at"]
    await db.techfest_submissions.update_one({"_id": oid}, {"$set": updates})
    refreshed = await db.techfest_submissions.find_one({"_id": oid})
    return {"ok": True, "modified": 1, "submission": _serialise_submission(refreshed)}
