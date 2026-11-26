"""
School Program Schemas (DTOs)
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class SchoolCreate(BaseModel):
    school_name: str
    contact_name: str
    email: Optional[EmailStr] = None
    phone: str
    city: str = ""
    state: str = ""
    board: str = "CBSE"
    tier: str = "Turnkey Lab"
    address: Optional[str] = ""
    total_students: Optional[int] = None

class SchoolUpdate(BaseModel):
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    board: Optional[str] = None
    tier: Optional[str] = None
    status: Optional[str] = None
    assigned_manager_id: Optional[str] = None
    assigned_manager_name: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_mode: Optional[str] = None

class SchoolResponse(BaseModel):
    id: str
    school_name: str
    contact_name: str
    email: Optional[str] = None
    phone: str
    city: str
    board: str
    tier: str
    status: str
    created_at: datetime

class SchoolInquiryCreate(BaseModel):
    school_name: str
    contact_name: str
    designation: Optional[str] = None
    phone: str
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    program_interest: Optional[str] = None
    student_count: Optional[int] = None
    message: Optional[str] = None
    source: Optional[str] = "website"

class SchoolInquiryUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class SchoolInquiryResponse(BaseModel):
    id: str
    school_name: str
    contact_name: str
    phone: str
    email: Optional[str] = None
    program_interest: Optional[str] = None
    status: str
    created_at: datetime

class BrochureDownloadRequest(BaseModel):
    school_name: str
    contact_name: str
    phone: str
    email: Optional[EmailStr] = None
    program_id: Optional[str] = None

class SchoolReportCreate(BaseModel):
    school_id: str
    report_type: str
    month: str
    year: int
    data: Dict[str, Any] = Field(default_factory=dict)
