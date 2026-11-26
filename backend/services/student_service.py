"""
Student Service — Business Logic for Student CRM, Demo Bookings, and Conversions
"""
from typing import Optional, List, Dict, Any
from repositories.student_repository import student_repository
from utils.helpers import clean_phone
from utils.validators import validate_indian_phone
import uuid

class StudentService:
    async def create_inquiry(self, inquiry_data: Dict[str, Any]) -> Dict[str, Any]:
        """Capture student lead / inquiry with phone sanitization."""
        data = dict(inquiry_data)
        if "phone" in data:
            data["phone"] = clean_phone(data["phone"])
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
        if "status" not in data:
            data["status"] = "new"
        return await student_repository.create(data)

    async def get_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """Look up student by sanitized phone number."""
        cleaned = clean_phone(phone)
        return await student_repository.get_by_phone(cleaned)

    async def list_inquiries(
        self,
        status: Optional[str] = None,
        skill: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List inquiries filtered by status or skill."""
        return await student_repository.list_inquiries(status=status, skill=skill, skip=skip, limit=limit)

    async def schedule_demo(
        self,
        student_phone: str,
        demo_date: str,
        demo_time: str,
        mode: str = "online",
        educator_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Schedule a demo class and transition inquiry status to demo_scheduled."""
        cleaned_phone = clean_phone(student_phone)
        booking = {
            "id": str(uuid.uuid4()),
            "student_phone": cleaned_phone,
            "demo_date": demo_date,
            "demo_time": demo_time,
            "mode": mode,
            "educator_id": educator_id or "",
            "status": "confirmed"
        }
        res = await student_repository.create_demo_booking(booking)

        # Update matching inquiry status if exists
        inquiry = await student_repository.get_by_phone(cleaned_phone)
        if inquiry:
            await student_repository.update_inquiry_status(
                inquiry["id"],
                "demo_scheduled",
                {"demo_booking_id": booking["id"], "demo_date": demo_date}
            )
        return res

    async def convert_inquiry(self, inquiry_id: str, order_id: str, amount: float) -> bool:
        """Mark an inquiry as converted upon course purchase."""
        return await student_repository.update_inquiry_status(
            inquiry_id,
            "converted",
            {"order_id": order_id, "conversion_amount": amount}
        )

student_service = StudentService()
