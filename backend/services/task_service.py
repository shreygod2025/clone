"""
Task Service — Business Logic for Task Assignment, Priority, and Operational Projects
"""
from typing import Optional, List, Dict, Any
from repositories.task_repository import task_repository
import uuid

class TaskService:
    async def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a task and assign to user."""
        data = dict(task_data)
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
        if "status" not in data:
            data["status"] = "pending"
        if "priority" not in data:
            data["priority"] = "medium"
        return await task_repository.create(data)

    async def list_tasks(
        self,
        assigned_to: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        project_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List tasks with multi-field filtering."""
        return await task_repository.list_tasks(
            assigned_to=assigned_to,
            status=status,
            priority=priority,
            project_id=project_id,
            skip=skip,
            limit=limit
        )

    async def update_status(self, task_id: str, new_status: str) -> bool:
        """Advance or update task status."""
        valid_statuses = {"pending", "in_progress", "completed", "blocked"}
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid task status: {new_status}. Must be one of {valid_statuses}")
        return await task_repository.update_status(task_id, new_status)

    async def assign_task(self, task_id: str, assignee_name: str) -> bool:
        """Reassign task to another team member."""
        return await task_repository.update_by_id(task_id, {"assigned_to": assignee_name})

task_service = TaskService()
