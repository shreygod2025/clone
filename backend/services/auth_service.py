"""
Auth Service — Business logic for authentication, tokens, passwords, and OTPs.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import jwt
import bcrypt
import random
from config import settings
from repositories.user_repository import user_repository

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False

    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS))
        to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
        return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> Optional[Dict[str, Any]]:
        try:
            return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        except jwt.PyJWTError:
            return None

    @staticmethod
    def generate_otp() -> str:
        return str(random.randint(100000, 999999))

    async def authenticate_admin(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        user = await user_repository.get_by_username(username)
        if not user:
            return None
        password_hash = user.get("password_hash") or user.get("password")
        if not password_hash or not self.verify_password(password, password_hash):
            return None
        return user

auth_service = AuthService()
