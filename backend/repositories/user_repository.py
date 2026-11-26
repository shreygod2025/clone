"""
User Repository — Data Access Layer for Users collection
Inherits BaseRepository for standardized CRUD and query operations.
"""
from typing import Optional, List, Dict, Any
from database import db
from repositories.base_repository import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection=db.users, id_field="id")

    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"username": username})

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"email": email})

    async def list_users(self, role: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        query = {}
        if role:
            query["role"] = role
        return await self.find_many(filter_query=query, skip=skip, limit=limit, projection={"_id": 0, "password_hash": 0})

    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        user = await self.create(user_data)
        user.pop("password_hash", None)
        return user

    async def update_user(self, username: str, update_data: Dict[str, Any]) -> bool:
        return await self.update_one({"username": username}, update_data)

    async def delete_user(self, username: str) -> bool:
        return await self.delete_one({"username": username})

user_repository = UserRepository()
