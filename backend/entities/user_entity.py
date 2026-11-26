"""
User Domain Entity
Encapsulates business rules for User identity, roles, and permissions.
"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime, timezone

@dataclass
class UserEntity:
    id: str
    username: str
    email: Optional[str] = None
    role: str = "team_member"
    permissions: List[str] = field(default_factory=list)
    is_active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def is_admin(self) -> bool:
        """Check if user has administrative privileges."""
        return self.role in ["admin", "super_admin"]

    def has_permission(self, permission: str) -> bool:
        """Check if user has an explicit or wildcard permission."""
        if self.is_admin():
            return True
        if permission in self.permissions:
            return True
        return any(p.startswith(f"{permission}.") for p in self.permissions)

    def deactivate(self) -> None:
        """Deactivate user account."""
        self.is_active = False

    def activate(self) -> None:
        """Activate user account."""
        self.is_active = True
