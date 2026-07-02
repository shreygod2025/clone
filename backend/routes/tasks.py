"""
Tasks module for OLL Mission Control — Phase 1 (v1 MVP).

Scope for this phase:
- CRUD for tasks (title, description, status, priority, assigned_to/by, due_date,
  project_id, tags).
- Role-scoped listing: my / by_me / team / all.
- Today's tasks endpoint.
- Auto-incremented task code TSK-XXXX.

Deferred to Phase 2+: sub-tasks, comments, approval flow, attachments, voice,
recurring tasks, notifications/emails.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from routes.shared import db, get_current_user


router = APIRouter(prefix="/tasks", tags=["tasks"])


# ── Models ────────────────────────────────────────────────────────────────────
VALID_STATUSES = ["pending", "in_progress", "completed"]
VALID_PRIORITIES = ["low", "medium", "high", "urgent"]


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "pending"
    priority: str = "medium"
    assigned_to: str = ""  # team_user.id — required
    due_date: Optional[str] = None  # ISO date/datetime string
    project_id: Optional[str] = None
    tags: List[str] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    tags: Optional[List[str]] = None


# ── Helpers ───────────────────────────────────────────────────────────────────
def _current_user_id(user: dict) -> str:
    return user.get("id") or user.get("user_id") or ""


async def _next_task_code() -> str:
    """TSK-0001, TSK-0002, ..."""
    doc = await db.counters.find_one_and_update(
        {"_id": "tasks"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,  # type: ignore
    )
    seq = (doc or {}).get("seq", 1)
    return f"TSK-{seq:04d}"


async def _enrich_task(t: dict) -> dict:
    """Attach assignee & assigner display names for the UI."""
    t.pop("_id", None)
    for key, out in (("assigned_to", "assigned_to_name"), ("assigned_by", "assigned_by_name")):
        uid = t.get(key)
        if uid:
            u = await db.team_users.find_one({"id": uid}, {"_id": 0, "name": 1, "email": 1})
            t[out] = (u or {}).get("name", "")
        else:
            t[out] = ""
    return t


async def _list_reports_of(manager_id: str) -> List[str]:
    """Return ids of team_users whose reports_to == manager_id (direct reports only for now)."""
    docs = await db.team_users.find({"reports_to": manager_id}, {"_id": 0, "id": 1}).to_list(2000)
    return [d["id"] for d in docs]


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("")
async def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if not data.assigned_to:
        raise HTTPException(status_code=400, detail="assigned_to is required")
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
    if data.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"Invalid priority: {data.priority}")

    # Validate assignee exists
    if not await db.team_users.find_one({"id": data.assigned_to}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=404, detail="Assignee not found")

    # Validate project if provided
    if data.project_id:
        if not await db.projects.find_one({"id": data.project_id}, {"_id": 0, "id": 1}):
            raise HTTPException(status_code=404, detail="Project not found")

    task = {
        "id": str(uuid.uuid4()),
        "code": await _next_task_code(),
        "title": data.title.strip(),
        "description": data.description,
        "status": data.status,
        "priority": data.priority,
        "assigned_to": data.assigned_to,
        "assigned_by": _current_user_id(user),
        "due_date": data.due_date,
        "project_id": data.project_id,
        "tags": data.tags or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    await db.tasks.insert_one(task)
    return await _enrich_task(task)


@router.get("")
async def list_tasks(
    filter: str = Query("my", pattern="^(my|by_me|team|all)$"),
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"

    query: dict = {}
    if filter == "my":
        query["assigned_to"] = uid
    elif filter == "by_me":
        query["assigned_by"] = uid
    elif filter == "team":
        # Direct reports + self — admin sees all
        if is_admin:
            pass  # no filter, all tasks
        else:
            reports = await _list_reports_of(uid)
            ids = reports + [uid]
            query["assigned_to"] = {"$in": ids}
    elif filter == "all":
        if not is_admin:
            # Non-admins are constrained to my + by_me
            query["$or"] = [{"assigned_to": uid}, {"assigned_by": uid}]

    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id

    docs = await db.tasks.find(query).sort("created_at", -1).to_list(1000)
    return [await _enrich_task(t) for t in docs]


@router.get("/today")
async def list_todays_tasks(user: dict = Depends(get_current_user)):
    """Tasks assigned to the current user with due_date == today (or overdue and not done)."""
    uid = _current_user_id(user)
    today = datetime.now(timezone.utc).date()
    start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()
    end = datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc).isoformat()

    # Tasks due today (any status)
    due_today = await db.tasks.find({
        "assigned_to": uid,
        "due_date": {"$gte": start, "$lte": end},
    }).sort("priority", -1).to_list(500)

    # Overdue and still open
    overdue = await db.tasks.find({
        "assigned_to": uid,
        "due_date": {"$lt": start},
        "status": {"$ne": "completed"},
    }).sort("due_date", 1).to_list(500)

    enriched_today = [await _enrich_task(t) for t in due_today]
    enriched_overdue = [await _enrich_task(t) for t in overdue]
    return {"today": enriched_today, "overdue": enriched_overdue}


@router.get("/{task_id}")
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return await _enrich_task(t)


@router.patch("/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"
    if not is_admin and uid not in (t.get("assigned_to"), t.get("assigned_by")):
        raise HTTPException(status_code=403, detail="Not allowed to modify this task")

    updates: dict = {}
    for field in ("title", "description", "priority", "due_date", "project_id", "tags"):
        v = getattr(data, field)
        if v is not None:
            updates[field] = v

    if data.status is not None:
        if data.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
        updates["status"] = data.status
        # stamp completed_at when moving to completed
        if data.status == "completed" and t.get("status") != "completed":
            updates["completed_at"] = datetime.now(timezone.utc).isoformat()
        elif data.status != "completed":
            updates["completed_at"] = None

    if data.priority is not None and data.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"Invalid priority: {data.priority}")

    if data.assigned_to is not None:
        # Only admin can reassign
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admin can reassign a task")
        if data.assigned_to and not await db.team_users.find_one({"id": data.assigned_to}, {"_id": 0}):
            raise HTTPException(status_code=404, detail="Assignee not found")
        updates["assigned_to"] = data.assigned_to

    if updates:
        await db.tasks.update_one({"id": task_id}, {"$set": updates})
        t = await db.tasks.find_one({"id": task_id})
    return await _enrich_task(t)


@router.delete("/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"
    if not is_admin and uid not in (t.get("assigned_to"), t.get("assigned_by")):
        raise HTTPException(status_code=403, detail="Not allowed to delete this task")

    await db.tasks.delete_one({"id": task_id})
    return {"ok": True}
