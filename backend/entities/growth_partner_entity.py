"""
Growth Partner Domain Entity
Encapsulates commission calculations and referral tracking.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone

@dataclass
class GrowthPartnerEntity:
    id: str
    name: str
    email: str
    phone: str
    city: str
    partnership_type: str = "Individual"
    status: str = "new"  # new, contacted, verified, active, inactive
    commission_rate: float = 10.0  # percentage
    total_leads_referred: int = 0
    total_earnings: float = 0.0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def record_successful_referral(self, revenue: float) -> float:
        """Calculate commission and credit GP earnings upon converted lead."""
        self.total_leads_referred += 1
        commission = (self.commission_rate / 100.0) * revenue
        self.total_earnings += commission
        return commission

    def activate(self) -> None:
        self.status = "active"
