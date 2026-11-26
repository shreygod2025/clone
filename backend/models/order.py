"""
Orders, Cart, Payment & Shop Domain Models
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class OrderItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str
    product_name: str
    quantity: int = 1
    unit_price: float
    total_price: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[EmailStr] = None
    shipping_address: Optional[str] = None
    items: List[OrderItem] = Field(default_factory=list)
    subtotal: float
    discount_amount: float = 0.0
    total_amount: float
    payment_status: str = "pending"  # pending, paid, failed, refunded
    payment_id: Optional[str] = None
    cashfree_order_id: Optional[str] = None
    fulfillment_status: str = "unfulfilled"  # unfulfilled, processing, shipped, delivered
    tracking_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    discount_type: str = "percent"  # percent, flat
    discount_value: float
    min_order_amount: float = 0.0
    max_discount_amount: Optional[float] = None
    expiry_date: Optional[datetime] = None
    is_active: bool = True
    usage_count: int = 0
