"""
Educator Domain Entity
Encapsulates educator verification, status transitions, and MOU state.
"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime, timezone

@dataclass
class EducatorEntity:
    id: str
    name: str
    email: str
    phone: str
    city: str
    skills: List[str] = field(default_factory=list)
    status: str = "applied"  # applied, shortlisted, interview_scheduled, hired, active, rejected
    mou_signed: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def shortlist(self) -> None:
        self.status = "shortlisted"

    def hire(self) -> None:
        self.status = "hired"

    def sign_mou(self) -> None:
        self.mou_signed = True
        self.status = "active"

    def is_eligible_for_classes(self) -> bool:
        return self.status == "active" and self.mou_signed
