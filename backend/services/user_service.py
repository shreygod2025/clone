"""
User Service — Business logic for user management
"""
from typing import Optional, List, Dict, Any
from repositories.user_repository import user_repository
from services.auth_service import auth_service
import uuid

class UserService:
    async def get_user_profile(self, username: str) -> Optional[Dict[str, Any]]:
        return await user_repository.get_by_username(username)

    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        if "password" in user_data:
            user_data["password_hash"] = auth_service.hash_password(user_data.pop("password"))
        if "id" not in user_data:
            user_data["id"] = str(uuid.uuid4())
        return await user_repository.create_user(user_data)

    async def list_users(self, role: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        return await user_repository.list_users(role=role, skip=skip, limit=limit)

    async def update_user(self, username: str, update_data: Dict[str, Any]) -> bool:
        if "password" in update_data and update_data["password"]:
            update_data["password_hash"] = auth_service.hash_password(update_data.pop("password"))
        return await user_repository.update_user(username, update_data)

user_service = UserService()
