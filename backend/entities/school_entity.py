"""
School Domain Entity
Encapsulates school partnership lifecycle states.
"""
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone

@dataclass
class SchoolEntity:
    id: str
    school_name: str
    contact_name: str
    phone: str
    city: str
    board: str = "CBSE"
    tier: str = "Turnkey Lab"
    status: str = "lead"  # lead, demo_scheduled, proposal_sent, onboarded, active
    assigned_manager_id: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def advance_to_demo(self, meeting_date: str, manager_id: str) -> None:
        """Advance school status to demo scheduled."""
        self.assigned_manager_id = manager_id
        self.status = "demo_scheduled"

    def send_proposal(self) -> None:
        """Record formal MOU/commercial proposal dispatch."""
        self.status = "proposal_sent"

    def onboard(self) -> None:
        """Mark school lab as signed & onboarded."""
        self.status = "onboarded"

    def is_active(self) -> bool:
        return self.status in ["onboarded", "active"]
