"""
Task Repository — Data Access Layer for Internal Tasks and Projects
"""
from typing import Optional, List, Dict, Any
from database import db
from repositories.base_repository import BaseRepository

class TaskRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection=db.tasks, id_field="id")
        self.projects = BaseRepository(collection=db.projects, id_field="id")

    async def list_tasks(
        self,
        assigned_to: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        project_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List tasks with assignee, status, priority, and project filters."""
        query = {}
        if assigned_to:
            query["assigned_to"] = assigned_to
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if project_id:
            query["project_id"] = project_id
        return await self.find_many(filter_query=query, skip=skip, limit=limit)

    async def update_status(self, task_id: str, new_status: str) -> bool:
        """Update task status (e.g. pending -> in_progress -> completed)."""
        return await self.update_by_id(task_id, {"status": new_status})

    async def list_projects(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """List operational projects."""
        return await self.projects.find_many(skip=skip, limit=limit)

task_repository = TaskRepository()
