"""
School Service — Business logic for schools, inquiries, and brochure requests
"""
from typing import Optional, List, Dict, Any
from repositories.school_repository import school_repository
import uuid

class SchoolService:
    async def create_inquiry(self, inquiry_data: Dict[str, Any]) -> Dict[str, Any]:
        inquiry_data["id"] = str(uuid.uuid4())
        return await school_repository.create_inquiry(inquiry_data)

    async def list_inquiries(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        return await school_repository.list_inquiries(skip=skip, limit=limit)

    async def list_schools(self, status: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        return await school_repository.list_schools(status=status, skip=skip, limit=limit)

school_service = SchoolService()
