"""
Central configuration module — all environment variables and constants.
"""
import os
import secrets
import logging
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ── MongoDB ─────────────────────────────────────────────────────────────
MONGO_URL: str = os.environ['MONGO_URL']
DB_NAME: str = os.environ['DB_NAME']

# ── JWT Auth ─────────────────────────────────────────────────────────────
JWT_SECRET: str = os.environ.get('JWT_SECRET', '')
if not JWT_SECRET:
    JWT_SECRET = secrets.token_hex(32)
    logging.warning("JWT_SECRET not set — using ephemeral key (sessions won't survive restarts)")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# ── Cashfree ─────────────────────────────────────────────────────────────
CASHFREE_APP_ID: str = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY: str = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENVIRONMENT: str = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX")
CASHFREE_API_VERSION = "2023-08-01"

# ── Email ─────────────────────────────────────────────────────────────────
RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
SENDER_EMAIL = "OLL Team <welcome@oll.co>"
REPLY_TO_EMAIL = "info@oll.co"

# ── Cloudinary ────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")

# ── Frontend URL ─────────────────────────────────────────────────────────
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://skill-edu-hub.preview.emergentagent.com")

# ── Payment Sync ──────────────────────────────────────────────────────────
PAYMENT_SYNC_ENABLED: bool = os.getenv("PAYMENT_SYNC_ENABLED", "true").lower() == "true"
PAYMENT_SYNC_INTERVAL_MINUTES: int = int(os.getenv("PAYMENT_SYNC_INTERVAL_MINUTES", "60"))

# ── OTP Security ─────────────────────────────────────────────────────────
OTP_EXPIRE_MINUTES = 10
OTP_MAX_ATTEMPTS = 5          # block after N wrong guesses
OTP_LOCKOUT_MINUTES = 15      # lock phone for this long after max attempts
OTP_SEND_COOLDOWN_SECONDS = 30  # minimum gap between two OTP sends to same phone
