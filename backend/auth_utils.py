"""
Authentication utilities — JWT creation/validation, password hashing,
and the FastAPI `get_current_user` dependency.
"""
import jwt
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import JWT_SECRET, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS
from database import db

security = HTTPBearer()


# ── Passwords ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT ───────────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload["iat"] = datetime.now(timezone.utc)
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# ── FastAPI dependency ─────────────────────────────────────────────────────

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Validates the Bearer JWT and returns the user dict.
    Checks both `admins` and `team_users` collections.
    """
    payload = decode_token(credentials.credentials)
    user_type = payload.get("user_type", "admin")
    email = payload.get("email") or payload.get("sub")

    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    if user_type in ("admin", "super_admin"):
        user = await db.admins.find_one({"email": email}, {"_id": 0, "password": 0})
        if user:
            return user
    # Fall back to team users
    team_user = await db.team_users.find_one(
        {"email": email, "is_active": True},
        {"_id": 0, "password_hash": 0}
    )
    if team_user:
        # Merge permissions from the linked role (if any) into the user
        # dict. Without this, granting a permission via the "Assign Role"
        # dropdown in Users & Roles wouldn't show up in the sidebar filter
        # or the ProtectedRoute gates until we manually copied the role's
        # permissions onto the team-user doc. Doing the merge here means
        # the same user always sees the effective set on every request.
        role_perms: list = []
        role_id = team_user.get("role_id")
        if role_id:
            role_doc = await db.roles.find_one(
                {"id": role_id, "is_active": True},
                {"_id": 0, "permissions": 1, "grants_full_access": 1},
            )
            if role_doc:
                # A "grants full access" role is treated as admin.
                if role_doc.get("grants_full_access"):
                    team_user["role"] = "admin"
                role_perms = list(role_doc.get("permissions") or [])
        # Preserve any ad-hoc permissions saved directly on the user.
        merged = list(dict.fromkeys((team_user.get("permissions") or []) + role_perms))
        team_user["permissions"] = merged
        return team_user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Stricter dependency — only allows admin or super_admin roles."""
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


# ── Portal (parent/student) tokens ─────────────────────────────────────────
# Portal tokens are short-lived JWTs issued after OTP verification. They are
# scoped to a single phone number so a parent can only read/edit *their* own
# child's records, not anyone else's (security review SEC-001 fixed BOLA
# gap where any phone/booking id was directly accessible without auth).

# Reuse the same HTTPBearer but without auto-error so we can allow both
# `Authorization: Bearer <token>` and `X-Portal-Token: <token>` headers.
_portal_bearer = HTTPBearer(auto_error=False)


def create_portal_token(phone: str, hours: int = 12) -> str:
    """Issue a phone-scoped portal token. Only the owner of this phone can
    call downstream `/user/*` and `/school-student/*` endpoints."""
    return jwt.encode(
        {
            "kind": "portal",
            "phone": phone,
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(hours=hours),
        },
        JWT_SECRET,
        algorithm=ALGORITHM,
    )


def _normalize_phone(p: str) -> str:
    """Loose comparison — strip spaces, plus, leading country code so
    91-formatted, 0-prefixed, and bare 10-digit numbers all match."""
    if not p:
        return ""
    p = str(p).replace("+", "").replace(" ", "").replace("-", "").strip()
    if p.startswith("91") and len(p) == 12:
        p = p[2:]
    if p.startswith("0") and len(p) == 11:
        p = p[1:]
    return p


async def get_portal_phone(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_portal_bearer),
) -> str:
    """Dependency for `/user/*` and `/school-student/*` portal endpoints.
    Returns the phone the token is scoped to, or raises 401.

    Accepts either `Authorization: Bearer <portal_token>` or the fallback
    `X-Portal-Token` header so we can move the frontend at our own pace
    without breaking the admin token flow that also lives on Authorization.
    """
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    else:
        token = request.headers.get("X-Portal-Token")

    if not token:
        raise HTTPException(status_code=401, detail="Portal token required — please verify OTP again")
    payload = decode_token(token)
    if payload.get("kind") != "portal" or not payload.get("phone"):
        raise HTTPException(status_code=401, detail="Not a portal token")
    return payload["phone"]


def assert_portal_owns_phone(token_phone: str, url_phone: str) -> None:
    """Verify the token's phone matches the one in the URL/booking record."""
    if _normalize_phone(token_phone) != _normalize_phone(url_phone):
        raise HTTPException(
            status_code=403,
            detail="This portal session is not authorized for that phone number",
        )
