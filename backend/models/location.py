"""
Location & Offline Center Models
"""
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, ConfigDict

class City(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    state: str = ""
    is_active: bool = True
    tier: Optional[str] = "Tier 1"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Center(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    city_id: str
    city_name: str
    address: str
    contact_person: str = ""
    contact_phone: str = ""
    contact_email: str = ""
    is_active: bool = True
    facilities: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
