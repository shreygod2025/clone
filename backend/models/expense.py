"""
Expense Management Domain Models
"""
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, ConfigDict

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    amount: float
    category: str  # travel, equipment, marketing, software, salary, misc
    date: str
    paid_to: str = ""
    payment_mode: str = "Online"  # Online, Cash, Bank Transfer, Card
    bill_url: Optional[str] = None
    notes: str = ""
    added_by: str = ""
    status: str = "approved"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    budget_limit: Optional[float] = None
    is_active: bool = True
