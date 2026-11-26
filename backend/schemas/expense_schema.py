"""
Expense Management Schemas (DTOs)
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    date: str
    paid_to: Optional[str] = ""
    payment_mode: Optional[str] = "Online"
    bill_url: Optional[str] = None
    notes: Optional[str] = ""

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: str
    title: str
    amount: float
    category: str
    date: str
    status: str
    created_at: datetime

class ExpenseCategoryCreate(BaseModel):
    name: str
    budget_limit: Optional[float] = None

class ExpenseCategoryResponse(BaseModel):
    id: str
    name: str
    budget_limit: Optional[float] = None
    is_active: bool
