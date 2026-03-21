"""
Database module — single Motor client shared across the entire application.
Also owns the in-memory OTP store (phone → {otp, expires, attempts, locked_until, last_sent}).
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from config import MONGO_URL, DB_NAME, OTP_EXPIRE_MINUTES, OTP_MAX_ATTEMPTS, OTP_LOCKOUT_MINUTES, OTP_SEND_COOLDOWN_SECONDS

# ── MongoDB ───────────────────────────────────────────────────────────────
_client = AsyncIOMotorClient(MONGO_URL)
db = _client[DB_NAME]


# ── In-memory OTP store ───────────────────────────────────────────────────
# Structure per phone:
#   otp          : str
#   expires      : datetime (UTC)
#   attempts     : int   — failed attempts for this OTP
#   locked_until : datetime | None — set after OTP_MAX_ATTEMPTS failures
#   last_sent    : datetime | None — used to enforce send cooldown
otp_store: dict[str, dict] = {}


def otp_send_allowed(phone: str) -> tuple[bool, str]:
    """Return (allowed, reason). Enforces cooldown between sends."""
    entry = otp_store.get(phone)
    if not entry:
        return True, ""
    # Check lockout first
    locked_until = entry.get("locked_until")
    if locked_until and datetime.now(timezone.utc) < locked_until:
        remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1
        return False, f"Too many failed attempts. Try again in {remaining} minute(s)."
    # Check send cooldown
    last_sent = entry.get("last_sent")
    if last_sent:
        elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds()
        if elapsed < OTP_SEND_COOLDOWN_SECONDS:
            wait = int(OTP_SEND_COOLDOWN_SECONDS - elapsed) + 1
            return False, f"Please wait {wait} second(s) before requesting another OTP."
    return True, ""


def otp_store_new(phone: str, otp: str) -> None:
    """Store a freshly generated OTP, resetting attempt counter."""
    otp_store[phone] = {
        "otp": otp,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
        "attempts": 0,
        "locked_until": None,
        "last_sent": datetime.now(timezone.utc),
    }


def otp_verify(phone: str, provided_otp: str) -> tuple[bool, str]:
    """
    Validate provided OTP for phone.
    Returns (success, error_message).
    On success, removes the OTP entry.
    """
    entry = otp_store.get(phone)

    # Lockout check
    if entry:
        locked_until = entry.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < locked_until:
            remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1
            return False, f"Account temporarily locked. Try again in {remaining} minute(s)."

    if not entry:
        return False, "OTP expired or not found. Please request a new one."

    if datetime.now(timezone.utc) > entry["expires"]:
        del otp_store[phone]
        return False, "OTP expired. Please request a new one."

    if entry["otp"] != provided_otp:
        entry["attempts"] += 1
        remaining_attempts = OTP_MAX_ATTEMPTS - entry["attempts"]
        if entry["attempts"] >= OTP_MAX_ATTEMPTS:
            entry["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=OTP_LOCKOUT_MINUTES)
            del otp_store[phone]  # clear OTP so they must re-request
            return False, f"Too many incorrect attempts. Your account is locked for {OTP_LOCKOUT_MINUTES} minutes."
        return False, f"Invalid OTP. {remaining_attempts} attempt(s) remaining."

    # Success — clear entry
    del otp_store[phone]
    return True, ""
