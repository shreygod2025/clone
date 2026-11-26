"""
User and Authentication Schemas (DTOs)
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: Optional[dict] = None

class OTPRequest(BaseModel):
    phone: str
    user_type: Optional[str] = "student"

class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    role: str = "team_member"
    full_name: Optional[str] = None
    phone: Optional[str] = None
    permissions: List[str] = []

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    role: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    permissions: List[str] = []
    is_active: bool = True
    created_at: Optional[datetime] = None

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    permissions: List[str] = []

class RoleResponse(BaseModel):
    id: str
    name: str
    description: str
    permissions: List[str]
