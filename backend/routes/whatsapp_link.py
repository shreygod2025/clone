"""WhatsApp Account Linking — "pairing code" flow identical to the pattern
used by Emergent (and WhatsApp Web).

Flow
----
1. Admin clicks "Connect WhatsApp" in the admin UI → `POST /admin/whatsapp-link/start`
   returns a short pairing code (e.g. `A3F-K9P`) persisted in
   `whatsapp_link_codes` with a 10-minute TTL + `user_id`.
2. Admin sends that EXACT code from their WhatsApp to the OLL business number.
   AiSensy / Meta Cloud API forwards every incoming message to our existing
   `POST /api/ai-chat/whatsapp` bridge. The bridge now checks the body
   against pending codes FIRST — if match, link the user's `whatsapp_phone`
   on the `team_users` / `admins` doc, delete the code, reply "✅ Linked".
3. The admin UI polls `GET /admin/whatsapp-link/status` every ~3 s and
   auto-closes the modal the moment `linked: true` shows up.

Design notes
------------
* The code excludes visually ambiguous chars (0/O, 1/I/L) to avoid WhatsApp
  autocorrect munging it.
* The pending-code lookup inside the webhook is normalised (strip spaces,
  upper-case, dash-insensitive) because WhatsApp Android often strips
  dashes and iOS sometimes title-cases.
* A Mongo TTL index drops expired codes automatically so we don't need a
  cron sweeper.
"""
from __future__ import annotations

import os
import re
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

CODE_TTL_MINUTES = 10
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O/1/I/L — unambiguous


# ────────────────────────────────────────────────────────────
# Code generator + lookup helpers
# ────────────────────────────────────────────────────────────

def _generate_pairing_code() -> str:
    """Return a 6-char code presented as `XXX-XXX` for readability. The
    stored canonical form is the 6-char uppercase string without the dash."""
    raw = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
    return f"{raw[:3]}-{raw[3:]}"


def _canonical(code: str) -> str:
    """Normalise a user-typed code to its canonical 6-char form so we match
    `a3f-k9p`, `A3FK9P`, ` a3f k9p ` and `A3F — K9P` as the same code."""
    return re.sub(r"[^A-Z0-9]", "", (code or "").upper())


async def _ensure_indexes():
    try:
        # TTL — Mongo auto-deletes docs whose `expires_at` is in the past.
        await db.whatsapp_link_codes.create_index(
            "expires_at", expireAfterSeconds=0
        )
        await db.whatsapp_link_codes.create_index(
            "code_canonical", unique=True
        )
    except Exception as e:
        logger.warning("[whatsapp-link] index setup: %s", e)


# ────────────────────────────────────────────────────────────
# Collection lookup — admins live in `team_users` for most roles,
# fall back to `admins` for the super-admin row.
# ────────────────────────────────────────────────────────────

async def _find_user_collection(user_id: str) -> Optional[str]:
    for col in ("team_users", "admins"):
        if await db[col].find_one({"id": user_id}, {"_id": 1}):
            return col
    return None


async def _consume_link_code(code: str, from_phone: str) -> Optional[dict]:
    """If `code` matches an unused, un-expired pairing code, mark the owning
    user's `whatsapp_phone` with the sender's phone (last 10 digits) and
    delete the code. Returns the linked user doc on success, ``None`` on
    miss."""
    canonical = _canonical(code)
    if len(canonical) != 6:
        return None
    now = datetime.now(timezone.utc)
    rec = await db.whatsapp_link_codes.find_one(
        {"code_canonical": canonical, "expires_at": {"$gt": now}},
        {"_id": 0},
    )
    if not rec:
        return None
    uid = rec.get("user_id")
    col = await _find_user_collection(uid or "")
    if not col:
        return None
    phone_tail = re.sub(r"\D", "", from_phone or "")[-10:]
    now_iso = now.isoformat()
    await db[col].update_one(
        {"id": uid},
        {"$set": {
            "whatsapp_phone": phone_tail,
            "whatsapp_linked_at": now_iso,
        }},
    )
    await db.whatsapp_link_codes.delete_one({"code_canonical": canonical})
    linked = await db[col].find_one({"id": uid}, {"_id": 0})
    logger.info("[whatsapp-link] linked %s (col=%s) → +%s", uid, col, phone_tail)
    return linked


# ────────────────────────────────────────────────────────────
# Routes
# ────────────────────────────────────────────────────────────

class StartLinkOut(BaseModel):
    code: str              # presentable form `XXX-XXX`
    whatsapp_number: str   # the business number the user must message
    expires_at: str
    poll_url: str


@router.post("/admin/whatsapp-link/start", response_model=StartLinkOut)
async def start_link(user: dict = Depends(get_current_user)):
    await _ensure_indexes()
    uid = user.get("id") or user.get("_id") or user.get("email")
    if not uid:
        raise HTTPException(status_code=400, detail="User id missing")

    # Any existing non-expired code for this user → reuse so repeated clicks
    # don't spam new codes.
    now = datetime.now(timezone.utc)
    existing = await db.whatsapp_link_codes.find_one(
        {"user_id": uid, "expires_at": {"$gt": now}},
        {"_id": 0},
    )
    if existing:
        return StartLinkOut(
            code=existing["code_display"],
            whatsapp_number=os.environ.get("OLL_WHATSAPP_NUMBER", "+91 86574 03418"),
            expires_at=existing["expires_at"].isoformat() if hasattr(existing["expires_at"], "isoformat") else str(existing["expires_at"]),
            poll_url="/api/admin/whatsapp-link/status",
        )

    # Generate a fresh code — retry a few times on the astronomically rare
    # unique-index collision.
    for _ in range(5):
        display = _generate_pairing_code()
        canonical = _canonical(display)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)
        try:
            await db.whatsapp_link_codes.insert_one({
                "user_id": uid,
                "user_email": user.get("email"),
                "user_name": user.get("name"),
                "code_display": display,
                "code_canonical": canonical,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": expires_at,
            })
            break
        except Exception as e:
            if "duplicate" in str(e).lower():
                continue
            raise
    else:
        raise HTTPException(status_code=500, detail="Could not allocate a pairing code — please retry")

    return StartLinkOut(
        code=display,
        whatsapp_number=os.environ.get("OLL_WHATSAPP_NUMBER", "+91 86574 03418"),
        expires_at=expires_at.isoformat(),
        poll_url="/api/admin/whatsapp-link/status",
    )


class LinkStatusOut(BaseModel):
    linked: bool
    whatsapp_phone: Optional[str] = None
    whatsapp_linked_at: Optional[str] = None
    pending_code: Optional[str] = None
    pending_expires_at: Optional[str] = None


@router.get("/admin/whatsapp-link/status", response_model=LinkStatusOut)
async def link_status(user: dict = Depends(get_current_user)):
    uid = user.get("id") or user.get("_id") or user.get("email")
    col = await _find_user_collection(uid or "") if uid else None
    doc = await db[col].find_one({"id": uid}, {"_id": 0, "whatsapp_phone": 1, "whatsapp_linked_at": 1}) if col else None
    linked = bool((doc or {}).get("whatsapp_phone"))
    out = LinkStatusOut(
        linked=linked,
        whatsapp_phone=(doc or {}).get("whatsapp_phone") if linked else None,
        whatsapp_linked_at=(doc or {}).get("whatsapp_linked_at") if linked else None,
    )
    if not linked:
        now = datetime.now(timezone.utc)
        pending = await db.whatsapp_link_codes.find_one(
            {"user_id": uid, "expires_at": {"$gt": now}},
            {"_id": 0, "code_display": 1, "expires_at": 1},
        )
        if pending:
            out.pending_code = pending.get("code_display")
            exp = pending.get("expires_at")
            out.pending_expires_at = exp.isoformat() if hasattr(exp, "isoformat") else str(exp)
    return out


@router.post("/admin/whatsapp-link/unlink")
async def unlink(user: dict = Depends(get_current_user)):
    uid = user.get("id") or user.get("_id") or user.get("email")
    col = await _find_user_collection(uid or "")
    if not col:
        raise HTTPException(status_code=404, detail="User not found")
    await db[col].update_one(
        {"id": uid},
        {"$unset": {"whatsapp_phone": "", "whatsapp_linked_at": ""}},
    )
    return {"ok": True}
