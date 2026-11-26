"""
Growth Partner (GP) Schemas (DTOs)
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

class GrowthPartnerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    city: str = ""
    partnership_type: str = "Individual"

class GrowthPartnerUpdate(BaseModel):
    status: Optional[str] = None
    commission_rate: Optional[float] = None
    total_leads_referred: Optional[int] = None
    total_earnings: Optional[float] = None

class GrowthPartnerResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    city: str
    partnership_type: str
    status: str
    commission_rate: float
    total_leads_referred: int
    total_earnings: float
    created_at: datetime

class GPOnboardingCreate(BaseModel):
    gp_id: str
    name: str
    phone: str
    email: EmailStr
    pan_number: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None

class GPOnboardingUpdate(BaseModel):
    pan_number: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    agreement_signed: Optional[bool] = None
    agreement_url: Optional[str] = None
    status: Optional[str] = None

class GPOnboardingResponse(BaseModel):
    id: str
    gp_id: str
    name: str
    token: str
    status: str
    agreement_signed: bool
    created_at: datetime
