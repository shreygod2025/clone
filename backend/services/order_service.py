"""
Order Service — Business Logic for Orders, Total Calculations, and Payment Fulfillment
"""
from typing import Optional, List, Dict, Any
from repositories.order_repository import order_repository
from utils.helpers import clean_phone
import random
import uuid

class OrderService:
    async def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create order, computing item totals and assigning a unique order number."""
        data = dict(order_data)
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
        if "order_number" not in data:
            data["order_number"] = f"ORD-{random.randint(100000, 999999)}"
        if "customer_phone" in data:
            data["customer_phone"] = clean_phone(data["customer_phone"])

        items = data.get("items", [])
        subtotal = sum(item.get("unit_price", 0.0) * item.get("quantity", 1) for item in items)
        discount = data.get("discount_amount", 0.0)
        total = max(0.0, subtotal - discount)

        data["subtotal"] = subtotal
        data["total_amount"] = total
        data["payment_status"] = data.get("payment_status", "pending")
        data["fulfillment_status"] = data.get("fulfillment_status", "pending")
        return await order_repository.create(data)

    async def get_by_order_number(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Fetch order details by human-readable order number."""
        return await order_repository.get_by_order_number(order_number)

    async def list_orders(
        self,
        customer_phone: Optional[str] = None,
        payment_status: Optional[str] = None,
        fulfillment_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List orders matching criteria."""
        phone = clean_phone(customer_phone) if customer_phone else None
        return await order_repository.list_orders(
            customer_phone=phone,
            payment_status=payment_status,
            fulfillment_status=fulfillment_status,
            skip=skip,
            limit=limit
        )

    async def mark_order_paid(self, order_id: str, payment_ref: str) -> bool:
        """Mark order as paid and set fulfillment status to processing."""
        await order_repository.update_payment_status(order_id, "paid", payment_ref)
        return await order_repository.update_by_id(order_id, {"fulfillment_status": "processing"})

order_service = OrderService()
