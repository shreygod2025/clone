"""
User Management Routes
Endpoints for querying, creating, updating, and deleting team members/users.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from schemas.user_schema import UserCreate, UserUpdate, UserResponse
from services.user_service import user_service
from dependencies.auth_dependency import get_current_admin, require_permission

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[dict])
async def list_users(
    role: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_permission("users"))
):
    """List team members and users with role filtering."""
    return await user_service.list_users(role=role, skip=skip, limit=limit)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    req: UserCreate,
    current_user: dict = Depends(require_permission("users"))
):
    """Create a new user / team member."""
    existing = await user_service.get_user_profile(req.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    return await user_service.create_user(req.dict())

@router.get("/{username}")
async def get_user(
    username: str,
    current_user: dict = Depends(get_current_admin)
):
    """Get specific user details by username."""
    user = await user_service.get_user_profile(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.pop("_id", None)
    user.pop("password_hash", None)
    user.pop("password", None)
    return user

@router.put("/{username}")
async def update_user(
    username: str,
    req: UserUpdate,
    current_user: dict = Depends(require_permission("users"))
):
    """Update user information."""
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    success = await user_service.update_user(username, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="User not found or nothing changed")
    return {"success": True, "message": "User updated successfully"}
