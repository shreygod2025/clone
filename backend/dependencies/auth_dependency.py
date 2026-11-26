"""
Authentication and Authorization Dependencies for FastAPI endpoints
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from services.auth_service import auth_service
from repositories.user_repository import user_repository

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = auth_service.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

async def get_current_admin(user: dict = Depends(get_current_user)) -> dict:
    role = user.get("role")
    if role not in ["admin", "super_admin", "team"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user

def require_permission(required_perm: str):
    async def permission_checker(user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role")
        if role in ["admin", "super_admin"]:
            return user
        permissions = user.get("permissions", [])
        if required_perm in permissions or any(p.startswith(f"{required_perm}.") for p in permissions):
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: '{required_perm}' required",
        )
    return permission_checker
