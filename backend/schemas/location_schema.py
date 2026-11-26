"""
Location & Offline Center Schemas (DTOs)
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class CityCreate(BaseModel):
    name: str
    state: Optional[str] = ""
    tier: Optional[str] = "Tier 1"

class CityUpdate(BaseModel):
    name: Optional[str] = None
    state: Optional[str] = None
    tier: Optional[str] = None
    is_active: Optional[bool] = None

class CityResponse(BaseModel):
    id: str
    name: str
    state: str
    tier: Optional[str] = None
    is_active: bool

class CenterCreate(BaseModel):
    name: str
    city_id: str
    city_name: str
    address: str
    contact_person: Optional[str] = ""
    contact_phone: Optional[str] = ""
    contact_email: Optional[str] = ""
    facilities: List[str] = []

class CenterUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None
    facilities: Optional[List[str]] = None

class CenterResponse(BaseModel):
    id: str
    name: str
    city_name: str
    address: str
    contact_person: str
    contact_phone: str
    is_active: bool
    created_at: datetime
