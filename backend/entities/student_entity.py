"""
Student & Inquiry Domain Entity
Encapsulates lead lifecycle states, demo scheduling, and conversion logic.
"""
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime, timezone

@dataclass
class StudentInquiryEntity:
    id: str
    name: str
    email: str
    phone: str
    skill: str
    learning_mode: str = "online"
    status: str = "new"  # new, demo_scheduled, demo_completed, converted, archived
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    assigned_educator_id: Optional[str] = None
    conversion_amount: Optional[float] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def schedule_demo(self, date: str, time: str, educator_id: str) -> None:
        """Schedule a trial demo session."""
        self.demo_date = date
        self.demo_time = time
        self.assigned_educator_id = educator_id
        self.status = "demo_scheduled"

    def mark_demo_completed(self) -> None:
        """Mark trial demo as attended/completed."""
        self.status = "demo_completed"

    def convert(self, amount: float) -> None:
        """Convert lead into paid student enrollment."""
        self.conversion_amount = amount
        self.status = "converted"

    def is_converted(self) -> bool:
        return self.status == "converted"
