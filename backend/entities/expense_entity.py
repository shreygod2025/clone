"""
Expense Domain Entity
Encapsulates expense approval workflow and budget constraints.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone

@dataclass
class ExpenseEntity:
    id: str
    title: str
    amount: float
    category: str
    date: str
    status: str = "pending"  # pending, approved, rejected
    added_by: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def approve(self) -> None:
        self.status = "approved"

    def reject(self) -> None:
        self.status = "rejected"

    def is_approved(self) -> bool:
        return self.status == "approved"
