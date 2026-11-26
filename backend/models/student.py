"""
Student & Inquiry Domain Models
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    author: str
    author_id: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    learner_type: str = "self"  # self, child
    age_group: str = ""
    skill: str = ""
    learning_mode: str = "online"  # online, offline
    city: str = ""
    learning_goal: str = ""
    name: str
    email: EmailStr
    phone: str
    status: str = "new"  # new, demo_scheduled, demo_completed, converted, archived
    notes: str = ""
    comments: List[Comment] = Field(default_factory=list)
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    followup_date: Optional[str] = None
    conversion_amount: Optional[str] = None
    sessions_count: Optional[str] = None
    source: str = "website"
    added_by: str = ""
    assigned_to: str = ""
    assigned_educator_id: str = ""
    assigned_educator_name: str = ""
    meeting_link: str = ""
    pending_payment: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DemoSlot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    educator_id: str
    educator_name: str
    date: str
    time_slot: str
    is_booked: bool = False
    inquiry_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
