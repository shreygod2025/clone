"""
Growth Partner Service — Business Logic for Partner Onboarding and Referral Tracking
"""
from typing import Optional, List, Dict, Any
from repositories.growth_partner_repository import growth_partner_repository
from utils.helpers import clean_phone
import random
import uuid

class GrowthPartnerService:
    async def register_partner(self, partner_data: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new growth partner / franchise with auto-generated partner code."""
        data = dict(partner_data)
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
        if "phone" in data:
            data["phone"] = clean_phone(data["phone"])
        if "partner_code" not in data or not data["partner_code"]:
            city_prefix = (data.get("city", "OLL")[:3]).upper()
            data["partner_code"] = f"GP-{city_prefix}-{random.randint(100, 999)}"
        if "tier" not in data:
            data["tier"] = "silver"
        if "is_active" not in data:
            data["is_active"] = True
        return await growth_partner_repository.create(data)

    async def get_partner(self, partner_code: str) -> Optional[Dict[str, Any]]:
        """Look up partner by referral code."""
        return await growth_partner_repository.get_by_partner_code(partner_code)

    async def list_partners(
        self,
        tier: Optional[str] = None,
        city: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List growth partners with filters."""
        return await growth_partner_repository.list_partners(
            tier=tier,
            city=city,
            is_active=is_active,
            skip=skip,
            limit=limit
        )

    async def record_onboarding(self, partner_id: str, step_name: str, step_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Record a milestone in the partner onboarding track."""
        step = {
            "partner_id": partner_id,
            "step_name": step_name,
            "details": step_data or {},
            "status": "completed"
        }
        return await growth_partner_repository.record_onboarding_step(step)

growth_partner_service = GrowthPartnerService()
