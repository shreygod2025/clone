"""
Educator Application & Onboarding Schemas (DTOs)
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

class EducatorApplicationCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    city: str = ""
    experience_years: str = ""
    qualification: str = ""
    skills: List[str] = []
    resume_url: Optional[str] = None

class EducatorApplicationUpdate(BaseModel):
    status: Optional[str] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    interview_feedback: Optional[str] = None

class EducatorApplicationResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    city: str
    experience_years: str
    status: str
    created_at: datetime

class EducatorOnboardingCreate(BaseModel):
    educator_id: str
    name: str
    phone: str
    email: EmailStr
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None

class EducatorOnboardingUpdate(BaseModel):
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    mou_signed: Optional[bool] = None
    mou_url: Optional[str] = None
    status: Optional[str] = None

class EducatorOnboardingResponse(BaseModel):
    id: str
    educator_id: str
    name: str
    status: str
    mou_signed: bool
    created_at: datetime
