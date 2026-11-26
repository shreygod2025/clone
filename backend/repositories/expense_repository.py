"""
Expense Repository — Data Access Layer for Expense Claims and Purchase Orders
"""
from typing import Optional, List, Dict, Any
from database import db
from repositories.base_repository import BaseRepository

class ExpenseRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection=db.expenses, id_field="id")

    async def list_expenses(
        self,
        category: Optional[str] = None,
        approval_status: Optional[str] = None,
        submitted_by: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List expenses with category, status, and submitter filters."""
        query = {}
        if category:
            query["category"] = category
        if approval_status:
            query["approval_status"] = approval_status
        if submitted_by:
            query["submitted_by"] = submitted_by
        return await self.find_many(filter_query=query, skip=skip, limit=limit)

    async def update_approval(self, expense_id: str, status: str, approved_by: str, remarks: Optional[str] = None) -> bool:
        """Update expense approval status."""
        data = {
            "approval_status": status,
            "approved_by": approved_by,
            "remarks": remarks or ""
        }
        return await self.update_by_id(expense_id, data)

expense_repository = ExpenseRepository()
