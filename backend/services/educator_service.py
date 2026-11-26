"""
Educator Service — Business Logic for Educator Recruitment, Interviewing, and Hiring
"""
from typing import Optional, List, Dict, Any
from repositories.educator_repository import educator_repository
from utils.helpers import clean_phone
import uuid

class EducatorService:
    async def apply(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process new educator application."""
        data = dict(application_data)
        if "phone" in data:
            data["phone"] = clean_phone(data["phone"])
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
        if "stage" not in data:
            data["stage"] = "applied"
        return await educator_repository.create(data)

    async def list_applicants(
        self,
        stage: Optional[str] = None,
        subject: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List applicants with filtering."""
        return await educator_repository.list_applicants(stage=stage, subject=subject, skip=skip, limit=limit)

    async def schedule_interview(
        self,
        applicant_id: str,
        interview_type: str,
        scheduled_at: str,
        interviewer_name: str
    ) -> Dict[str, Any]:
        """Schedule HR or Technical Demo interview."""
        interview = {
            "id": str(uuid.uuid4()),
            "applicant_id": applicant_id,
            "type": interview_type,
            "scheduled_at": scheduled_at,
            "interviewer": interviewer_name,
            "outcome": "pending"
        }
        res = await educator_repository.create_interview(interview)
        await educator_repository.update_applicant_stage(applicant_id, f"interview_{interview_type}")
        return res

    async def record_interview_outcome(
        self,
        applicant_id: str,
        interview_id: str,
        passed: bool,
        notes: str = ""
    ) -> bool:
        """Record interview result and advance applicant stage."""
        outcome = "passed" if passed else "failed"
        next_stage = "selected" if passed else "rejected"
        await educator_repository.interviews.update_by_id(
            interview_id,
            {"outcome": outcome, "notes": notes}
        )
        return await educator_repository.update_applicant_stage(applicant_id, next_stage)

educator_service = EducatorService()
