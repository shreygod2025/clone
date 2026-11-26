"""
Growth Partner Repository — Data Access Layer for Growth Partners and Franchises
"""
from typing import Optional, List, Dict, Any
from database import db
from repositories.base_repository import BaseRepository

class GrowthPartnerRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection=db.growth_partners, id_field="id")
        self.onboarding = BaseRepository(collection=db.gp_onboarding, id_field="id")

    async def get_by_partner_code(self, partner_code: str) -> Optional[Dict[str, Any]]:
        """Fetch partner by referral code."""
        return await self.find_one({"partner_code": partner_code})

    async def get_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """Fetch partner by phone number."""
        return await self.find_one({"phone": phone})

    async def list_partners(
        self,
        tier: Optional[str] = None,
        city: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List partners with optional filters."""
        query = {}
        if tier:
            query["tier"] = tier
        if city:
            query["city"] = city
        if is_active is not None:
            query["is_active"] = is_active
        return await self.find_many(filter_query=query, skip=skip, limit=limit)

    async def record_onboarding_step(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record GP onboarding track step."""
        return await self.onboarding.create(step_data)

growth_partner_repository = GrowthPartnerRepository()
