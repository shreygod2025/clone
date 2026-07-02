"""
Projects module for OLL Mission Control — Phase 1 (v1 MVP).

Scope for this phase:
- CRUD for projects (name, description, color, status, lead_id, member_ids,
  start_date, end_date).
- Detail endpoint returns computed task_count / task_done.

Deferred to later phases: milestones, project KB (notes/links/files/pinning).
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from routes.shared import db, get_current_user


router = APIRouter(prefix="/projects", tags=["projects"])


VALID_STATUSES = ["active", "on_hold", "completed", "archived"]


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#3B82F6"  # default blue
    status: str = "active"
    lead_id: str = ""       # team_user.id — project lead
    member_ids: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None
    lead_id: Optional[str] = None
    member_ids: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


def _current_user_id(user: dict) -> str:
    return user.get("id") or user.get("user_id") or ""


async def _enrich_project(p: dict, with_task_stats: bool = False) -> dict:
    p.pop("_id", None)
    # Fetch lead name
    lead_id = p.get("lead_id")
    if lead_id:
        lu = await db.team_users.find_one({"id": lead_id}, {"_id": 0, "name": 1, "email": 1})
        p["lead_name"] = (lu or {}).get("name", "")
    else:
        p["lead_name"] = ""
    # Member names
    m_ids = p.get("member_ids") or []
    if m_ids:
        members = await db.team_users.find(
            {"id": {"$in": m_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(500)
        p["members"] = members
    else:
        p["members"] = []
    if with_task_stats:
        p["task_count"] = await db.tasks.count_documents({"project_id": p["id"]})
        p["task_done"] = await db.tasks.count_documents({"project_id": p["id"], "status": "completed"})
    return p


@router.post("")
async def create_project(data: ProjectCreate, user: dict = Depends(get_current_user)):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    if data.lead_id and not await db.team_users.find_one({"id": data.lead_id}, {"_id": 0}):
        raise HTTPException(status_code=404, detail="Lead user not found")

    project = {
        "id": str(uuid.uuid4()),
        "name": data.name.strip(),
        "description": data.description,
        "color": data.color,
        "status": data.status,
        "lead_id": data.lead_id,
        "member_ids": data.member_ids or [],
        "start_date": data.start_date,
        "end_date": data.end_date,
        "created_by": _current_user_id(user),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.projects.insert_one(project)
    return await _enrich_project(project)


@router.get("")
async def list_projects(
    status: Optional[str] = None,
    mine: bool = False,
    user: dict = Depends(get_current_user),
):
    uid = _current_user_id(user)
    query: dict = {}
    if status:
        query["status"] = status
    if mine:
        query["$or"] = [{"lead_id": uid}, {"member_ids": uid}]
    docs = await db.projects.find(query).sort("created_at", -1).to_list(500)
    return [await _enrich_project(p, with_task_stats=True) for p in docs]


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": project_id})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return await _enrich_project(p, with_task_stats=True)


@router.patch("/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": project_id})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"
    if not is_admin and uid not in (p.get("lead_id"), p.get("created_by")):
        raise HTTPException(status_code=403, detail="Only admin or project lead can update")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if "status" in updates and updates["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {updates['status']}")
    if updates.get("lead_id"):
        if not await db.team_users.find_one({"id": updates["lead_id"]}, {"_id": 0}):
            raise HTTPException(status_code=404, detail="Lead user not found")

    if updates:
        await db.projects.update_one({"id": project_id}, {"$set": updates})
        p = await db.projects.find_one({"id": project_id})
    return await _enrich_project(p, with_task_stats=True)


@router.delete("/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": project_id})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"
    if not is_admin and uid != p.get("created_by"):
        raise HTTPException(status_code=403, detail="Only admin or creator can delete")

    # Unlink tasks (don't cascade delete tasks — just clear their project_id)
    await db.tasks.update_many({"project_id": project_id}, {"$set": {"project_id": None}})
    await db.projects.delete_one({"id": project_id})
    return {"ok": True}
