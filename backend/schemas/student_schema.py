"""
Student & Inquiry Schemas (DTOs)
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class CommentCreate(BaseModel):
    text: str
    author: str

class CommentResponse(BaseModel):
    id: str
    text: str
    author: str
    created_at: datetime

class StudentInquiryCreate(BaseModel):
    learner_type: str = "self"
    age_group: Optional[str] = ""
    skill: str
    learning_mode: str = "online"
    city: Optional[str] = ""
    learning_goal: Optional[str] = ""
    name: str
    email: EmailStr
    phone: str
    source: Optional[str] = "website"

class StudentInquiryUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    followup_date: Optional[str] = None
    conversion_amount: Optional[str] = None
    sessions_count: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_educator_id: Optional[str] = None
    assigned_educator_name: Optional[str] = None
    meeting_link: Optional[str] = None

class StudentInquiryResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    skill: str
    status: str
    learning_mode: str
    city: Optional[str] = None
    created_at: datetime

class DemoSlotCreate(BaseModel):
    educator_id: str
    educator_name: str
    date: str
    time_slot: str

class DemoSlotResponse(BaseModel):
    id: str
    educator_name: str
    date: str
    time_slot: str
    is_booked: bool
