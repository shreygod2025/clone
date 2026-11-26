"""
Educator Repository — Data Access Layer for Educator Applications, Profiles, and Interviews
"""
from typing import Optional, List, Dict, Any
from database import db
from repositories.base_repository import BaseRepository

class EducatorRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection=db.educator_applications, id_field="id")
        self.educators = BaseRepository(collection=db.educators, id_field="id")
        self.interviews = BaseRepository(collection=db.educator_interviews, id_field="id")

    async def get_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """Find applicant by phone."""
        return await self.find_one({"phone": phone})

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find applicant by email."""
        return await self.find_one({"email": email})

    async def list_applicants(
        self,
        stage: Optional[str] = None,
        subject: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List educator applicants with stage and subject filters."""
        query = {}
        if stage:
            query["stage"] = stage
        if subject:
            query["subject"] = subject
        return await self.find_many(filter_query=query, skip=skip, limit=limit)

    async def update_applicant_stage(self, applicant_id: str, new_stage: str, extra_data: Optional[Dict[str, Any]] = None) -> bool:
        """Update applicant hiring pipeline stage."""
        update = {"stage": new_stage}
        if extra_data:
            update.update(extra_data)
        return await self.update_by_id(applicant_id, update)

    async def create_interview(self, interview_data: Dict[str, Any]) -> Dict[str, Any]:
        """Schedule an interview."""
        return await self.interviews.create(interview_data)

    async def list_interviews(self, applicant_id: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """List scheduled interviews."""
        query = {"applicant_id": applicant_id} if applicant_id else {}
        return await self.interviews.find_many(filter_query=query, skip=skip, limit=limit)

educator_repository = EducatorRepository()
