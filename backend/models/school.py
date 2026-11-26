"""
School Program Domain Models
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class School(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_name: str
    contact_name: str
    email: Optional[EmailStr] = None
    phone: str
    city: str = ""
    state: str = ""
    board: str = "CBSE"  # CBSE, ICSE, State, IB
    tier: str = "Turnkey Lab"
    status: str = "lead"  # lead, demo_scheduled, proposal_sent, onboarded, active
    address: str = ""
    total_students: Optional[int] = None
    assigned_manager_id: str = ""
    assigned_manager_name: str = ""
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_mode: str = "online"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SchoolInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_name: str
    contact_name: str
    designation: Optional[str] = None
    phone: str
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    program_interest: Optional[str] = None
    student_count: Optional[int] = None
    message: Optional[str] = None
    source: str = "website"
    status: str = "new"  # new, contacted, demo_scheduled, closed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SchoolReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    school_name: str
    report_type: str  # attendance, curriculum_coverage, assessment, lms
    month: str
    year: int
    data: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
