"""
Growth Partner (GP) Domain Models
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class GrowthPartner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    city: str = ""
    partnership_type: str = "Individual"  # Individual, Institute, Consultant
    status: str = "new"  # new, contacted, verified, active, inactive
    commission_rate: float = 10.0
    total_leads_referred: int = 0
    total_earnings: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GPOnboarding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gp_id: str
    name: str
    phone: str
    email: EmailStr
    pan_number: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    agreement_signed: bool = False
    agreement_url: Optional[str] = None
    token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
