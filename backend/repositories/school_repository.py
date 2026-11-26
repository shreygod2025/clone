"""
School Repository — Data Access Layer for Schools & Inquiries collections
Inherits BaseRepository for standardized CRUD and query operations.
"""
from typing import Optional, List, Dict, Any
from database import db
from repositories.base_repository import BaseRepository

class SchoolRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection=db.schools, id_field="id")
        self.inquiries = BaseRepository(collection=db.school_inquiries, id_field="id")

    async def get_school_by_id(self, school_id: str) -> Optional[Dict[str, Any]]:
        return await self.get_by_id(school_id)

    async def list_schools(self, status: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        query = {"status": status} if status else {}
        return await self.find_many(filter_query=query, skip=skip, limit=limit)

    async def create_school(self, school_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self.create(school_data)

    async def create_inquiry(self, inquiry_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self.inquiries.create(inquiry_data)

    async def list_inquiries(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        return await self.inquiries.find_many(skip=skip, limit=limit)

school_repository = SchoolRepository()
