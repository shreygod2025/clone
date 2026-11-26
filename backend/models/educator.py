"""
Educator Domain Models
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class EducatorApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    city: str = ""
    experience_years: str = ""
    qualification: str = ""
    skills: List[str] = Field(default_factory=list)
    resume_url: Optional[str] = None
    status: str = "applied"  # applied, shortlisted, interview_scheduled, hired, rejected
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    interview_feedback: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EducatorOnboarding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    educator_id: str
    name: str
    phone: str
    email: EmailStr
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    mou_signed: bool = False
    mou_url: Optional[str] = None
    status: str = "pending"  # pending, verified, active
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
