"""
Database module — single Motor client shared across the entire application.
OTPs are now stored in MongoDB (collection: otp_tokens) so they survive backend restarts.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from config import MONGO_URL, DB_NAME, OTP_EXPIRE_MINUTES, OTP_MAX_ATTEMPTS, OTP_LOCKOUT_MINUTES, OTP_SEND_COOLDOWN_SECONDS

# ── MongoDB ───────────────────────────────────────────────────────────────
# Use explicit timeouts so the client never hangs indefinitely on
# slow / remote Atlas connections (important for production Kubernetes health checks).
_client = AsyncIOMotorClient(
    MONGO_URL,
    serverSelectionTimeoutMS=10000,   # 10 s to find a suitable server
    connectTimeoutMS=10000,            # 10 s to establish a TCP connection
    socketTimeoutMS=30000,             # 30 s for individual socket operations
)
db = _client[DB_NAME]


# ── MongoDB-backed OTP store ──────────────────────────────────────────────
# Collection: otp_tokens
# Doc shape: { phone, otp, expires, attempts, locked_until, last_sent }

async def otp_send_allowed(phone: str) -> tuple[bool, str]:
    """Return (allowed, reason). Enforces cooldown between sends."""
    entry = await db.otp_tokens.find_one({"phone": phone})
    if not entry:
        return True, ""
    now = datetime.now(timezone.utc)

    def make_aware(dt):
        if dt and dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    # Check lockout first
    locked_until = make_aware(entry.get("locked_until"))
    if locked_until and now < locked_until:
        remaining = int((locked_until - now).total_seconds() / 60) + 1
        return False, f"Too many failed attempts. Try again in {remaining} minute(s)."
    # Check send cooldown
    last_sent = make_aware(entry.get("last_sent"))
    if last_sent:
        elapsed = (now - last_sent).total_seconds()
        if elapsed < OTP_SEND_COOLDOWN_SECONDS:
            wait = int(OTP_SEND_COOLDOWN_SECONDS - elapsed) + 1
            return False, f"Please wait {wait} second(s) before requesting another OTP."
    return True, ""


async def otp_store_new(phone: str, otp: str) -> None:
    """Upsert a freshly generated OTP into MongoDB, resetting attempt counter."""
    await db.otp_tokens.update_one(
        {"phone": phone},
        {"$set": {
            "otp": otp,
            "expires": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
            "attempts": 0,
            "locked_until": None,
            "last_sent": datetime.now(timezone.utc),
        }},
        upsert=True
    )


async def otp_verify(phone: str, provided_otp: str) -> tuple[bool, str]:
    """
    Validate provided OTP for phone.
    Returns (success, error_message).
    On success, removes the OTP entry.
    """
    entry = await db.otp_tokens.find_one({"phone": phone})

    if not entry:
        return False, "OTP expired or not found. Please request a new one."

    now = datetime.now(timezone.utc)

    def make_aware(dt):
        """Ensure datetime is timezone-aware (MongoDB returns naive UTC)."""
        if dt and dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    # Lockout check
    locked_until = make_aware(entry.get("locked_until"))
    if locked_until and now < locked_until:
        remaining = int((locked_until - now).total_seconds() / 60) + 1
        return False, f"Account temporarily locked. Try again in {remaining} minute(s)."

    expires = make_aware(entry.get("expires"))
    if not expires or now > expires:
        await db.otp_tokens.delete_one({"phone": phone})
        return False, "OTP expired. Please request a new one."

    if entry["otp"] != provided_otp:
        new_attempts = entry.get("attempts", 0) + 1
        remaining_attempts = OTP_MAX_ATTEMPTS - new_attempts
        if new_attempts >= OTP_MAX_ATTEMPTS:
            await db.otp_tokens.update_one(
                {"phone": phone},
                {"$set": {
                    "locked_until": datetime.now(timezone.utc) + timedelta(minutes=OTP_LOCKOUT_MINUTES),
                    "attempts": new_attempts
                }}
            )
            await db.otp_tokens.delete_one({"phone": phone})
            return False, f"Too many incorrect attempts. Your account is locked for {OTP_LOCKOUT_MINUTES} minutes."
        await db.otp_tokens.update_one({"phone": phone}, {"$set": {"attempts": new_attempts}})
        return False, f"Invalid OTP. {remaining_attempts} attempt(s) remaining."

    # Success — clear entry
    await db.otp_tokens.delete_one({"phone": phone})
    return True, ""
