"""
Orders, Cart, Payment & Coupon Schemas (DTOs)
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

class OrderItemSchema(BaseModel):
    product_id: str
    product_name: str
    quantity: int = 1
    unit_price: float
    total_price: float

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[EmailStr] = None
    shipping_address: Optional[str] = None
    items: List[OrderItemSchema]
    coupon_code: Optional[str] = None

class OrderUpdate(BaseModel):
    payment_status: Optional[str] = None
    fulfillment_status: Optional[str] = None
    tracking_number: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    order_number: str
    customer_name: str
    customer_phone: str
    subtotal: float
    discount_amount: float
    total_amount: float
    payment_status: str
    fulfillment_status: str
    created_at: datetime

class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percent"
    discount_value: float
    min_order_amount: float = 0.0
    max_discount_amount: Optional[float] = None
    expiry_date: Optional[datetime] = None

class CouponValidateRequest(BaseModel):
    code: str
    order_amount: float

class CouponResponse(BaseModel):
    id: str
    code: str
    discount_type: str
    discount_value: float
    min_order_amount: float
    is_active: bool
