"""
Order & E-Commerce Domain Entity
Encapsulates price calculation, discount rules, and fulfillment status transitions.
"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime, timezone

@dataclass
class OrderItemEntity:
    product_id: str
    product_name: str
    quantity: int
    unit_price: float

    @property
    def total_price(self) -> float:
        return self.quantity * self.unit_price

@dataclass
class OrderEntity:
    id: str
    order_number: str
    customer_name: str
    customer_phone: str
    items: List[OrderItemEntity] = field(default_factory=list)
    discount_amount: float = 0.0
    payment_status: str = "pending"  # pending, paid, failed, refunded
    fulfillment_status: str = "unfulfilled"  # unfulfilled, processing, shipped, delivered
    tracking_number: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def subtotal(self) -> float:
        return sum(item.total_price for item in self.items)

    @property
    def total_amount(self) -> float:
        return max(0.0, self.subtotal - self.discount_amount)

    def apply_discount(self, discount: float) -> None:
        """Apply voucher/coupon discount to order."""
        self.discount_amount = min(self.subtotal, discount)

    def mark_paid(self) -> None:
        """Mark payment successfully processed."""
        self.payment_status = "paid"
        self.fulfillment_status = "processing"

    def ship(self, tracking_number: str) -> None:
        """Record shipment tracking."""
        self.tracking_number = tracking_number
        self.fulfillment_status = "shipped"
