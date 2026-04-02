"""
Authentication utilities — JWT creation/validation, password hashing,
and the FastAPI `get_current_user` dependency.
"""
import jwt
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, status
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
        return team_user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Stricter dependency — only allows admin or super_admin roles."""
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
