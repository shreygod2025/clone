"""
Team Recruitment & Onboarding Models
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class OpenRequirement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    department: str
    location: str = "Remote / Mumbai"
    job_type: str = "Full-time"  # Full-time, Part-time, Internship
    description: str = ""
    requirements: List[str] = Field(default_factory=list)
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    req_id: Optional[str] = None
    role_applied: str
    name: str
    email: EmailStr
    phone: str
    resume_url: Optional[str] = None
    status: str = "applied"  # applied, shortlisted, interview_scheduled, hired, rejected
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    feedback: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamOnboarding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    designation: str
    department: str
    joining_date: str
    emergency_contact: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    status: str = "pending"
    token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
