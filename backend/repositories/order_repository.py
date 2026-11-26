"""
Order Repository — Data Access Layer for Customer Orders and Transactions
"""
from typing import Optional, List, Dict, Any
from database import db
from repositories.base_repository import BaseRepository

class OrderRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection=db.orders, id_field="id")
        self.payments = BaseRepository(collection=db.payments, id_field="id")

    async def get_by_order_number(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Fetch order by public human-readable order number (e.g. ORD-10023)."""
        return await self.find_one({"order_number": order_number})

    async def list_orders(
        self,
        customer_phone: Optional[str] = None,
        payment_status: Optional[str] = None,
        fulfillment_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List orders filtered by customer phone, payment status, or fulfillment."""
        query = {}
        if customer_phone:
            query["customer_phone"] = customer_phone
        if payment_status:
            query["payment_status"] = payment_status
        if fulfillment_status:
            query["fulfillment_status"] = fulfillment_status
        return await self.find_many(filter_query=query, skip=skip, limit=limit)

    async def update_payment_status(self, order_id: str, status: str, payment_ref: Optional[str] = None) -> bool:
        """Update payment status on an order."""
        data = {"payment_status": status}
        if payment_ref:
            data["payment_reference"] = payment_ref
        return await self.update_by_id(order_id, data)

    async def record_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a payment log record."""
        return await self.payments.create(payment_data)

order_repository = OrderRepository()
