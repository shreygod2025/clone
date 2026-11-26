"""
Student Repository — Data Access Layer for Student Inquiries, Profiles, and Demo Bookings
"""
from typing import Optional, List, Dict, Any
from database import db
from repositories.base_repository import BaseRepository

class StudentRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection=db.student_inquiries, id_field="id")
        self.students = BaseRepository(collection=db.students, id_field="id")
        self.demo_bookings = BaseRepository(collection=db.demo_bookings, id_field="id")

    async def get_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """Find student inquiry by phone number."""
        return await self.find_one({"phone": phone})

    async def list_inquiries(
        self,
        status: Optional[str] = None,
        skill: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List inquiries filtered by status or skill."""
        query = {}
        if status:
            query["status"] = status
        if skill:
            query["skill"] = skill
        return await self.find_many(filter_query=query, skip=skip, limit=limit)

    async def create_demo_booking(self, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record demo booking."""
        return await self.demo_bookings.create(booking_data)

    async def get_demo_bookings(self, student_phone: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """List demo bookings."""
        query = {"student_phone": student_phone} if student_phone else {}
        return await self.demo_bookings.find_many(filter_query=query, skip=skip, limit=limit)

    async def update_inquiry_status(self, inquiry_id: str, new_status: str, extra_data: Optional[Dict[str, Any]] = None) -> bool:
        """Update inquiry lifecycle status."""
        update = {"status": new_status}
        if extra_data:
            update.update(extra_data)
        return await self.update_by_id(inquiry_id, update)

student_repository = StudentRepository()
