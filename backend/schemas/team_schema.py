"""
Team Recruitment & Onboarding Schemas (DTOs)
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

class OpenRequirementCreate(BaseModel):
    title: str
    department: str
    location: str = "Remote / Mumbai"
    job_type: str = "Full-time"
    description: str = ""
    requirements: List[str] = []

class OpenRequirementUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    job_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    is_active: Optional[bool] = None

class OpenRequirementResponse(BaseModel):
    id: str
    title: str
    department: str
    location: str
    job_type: str
    is_active: bool
    created_at: datetime

class TeamApplicationCreate(BaseModel):
    req_id: Optional[str] = None
    role_applied: str
    name: str
    email: EmailStr
    phone: str
    resume_url: Optional[str] = None

class TeamApplicationUpdate(BaseModel):
    status: Optional[str] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    feedback: Optional[str] = None

class TeamApplicationResponse(BaseModel):
    id: str
    role_applied: str
    name: str
    email: EmailStr
    phone: str
    status: str
    created_at: datetime

class TeamOnboardingCreate(BaseModel):
    user_id: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    designation: str
    department: str
    joining_date: str

class TeamOnboardingUpdate(BaseModel):
    emergency_contact: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    status: Optional[str] = None

class TeamOnboardingResponse(BaseModel):
    id: str
    name: str
    designation: str
    department: str
    joining_date: str
    status: str
    token: str
    created_at: datetime
