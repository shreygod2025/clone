"""
Expense Service — Business Logic for Expense Claims, Approvals, and Category Budgets
"""
from typing import Optional, List, Dict, Any
from repositories.expense_repository import expense_repository
import uuid

class ExpenseService:
    async def submit_expense(self, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit a new expense claim for approval."""
        data = dict(expense_data)
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
        data["approval_status"] = "pending"
        return await expense_repository.create(data)

    async def approve_expense(self, expense_id: str, approved_by: str, remarks: str = "") -> bool:
        """Approve an expense."""
        return await expense_repository.update_approval(
            expense_id=expense_id,
            status="approved",
            approved_by=approved_by,
            remarks=remarks
        )

    async def reject_expense(self, expense_id: str, rejected_by: str, remarks: str = "") -> bool:
        """Reject an expense."""
        return await expense_repository.update_approval(
            expense_id=expense_id,
            status="rejected",
            approved_by=rejected_by,
            remarks=remarks
        )

    async def list_expenses(
        self,
        category: Optional[str] = None,
        approval_status: Optional[str] = None,
        submitted_by: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List expenses with filters."""
        return await expense_repository.list_expenses(
            category=category,
            approval_status=approval_status,
            submitted_by=submitted_by,
            skip=skip,
            limit=limit
        )

expense_service = ExpenseService()
