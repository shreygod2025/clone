"""Recurring / scheduled tasks (Phase 3).

Idea: an admin/manager creates a rule ("Weekly report every Monday") in
`scheduled_tasks`. When any user next calls `GET /api/tasks`, the materializer
runs once and inserts one upcoming `tasks` document per active rule (if none
already exists in the future for that rule).

Endpoints:
  GET    /api/scheduled-tasks           -> list my schedules (or all if admin)
  POST   /api/scheduled-tasks           -> create a rule
  PATCH  /api/scheduled-tasks/{id}
  DELETE /api/scheduled-tasks/{id}
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid

from routes.shared import db, get_current_user


router = APIRouter(prefix="/scheduled-tasks", tags=["scheduled-tasks"])

VALID_FREQ = ["daily", "weekly", "monthly", "one_time"]


class ScheduledTaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    frequency: str = "daily"
    days_of_week: List[int] = []      # Mon=0..Sun=6 (used for weekly)
    day_of_month: Optional[int] = None  # 1..28 (used for monthly)
    scheduled_date: Optional[str] = None  # ISO — used for one_time
    assigned_to: str = ""
    project_id: Optional[str] = None
    is_active: bool = True


class ScheduledTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    frequency: Optional[str] = None
    days_of_week: Optional[List[int]] = None
    day_of_month: Optional[int] = None
    scheduled_date: Optional[str] = None
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None
    is_active: Optional[bool] = None


def _current_user_id(user: dict) -> str:
    return user.get("id") or user.get("user_id") or ""


async def _user_exists_any(user_id: str) -> bool:
    if await db.team_users.find_one({"id": user_id}, {"_id": 0, "id": 1}):
        return True
    if await db.admins.find_one({"id": user_id}, {"_id": 0, "id": 1}):
        return True
    return False


def _next_occurrence(rule: dict, now: datetime) -> Optional[datetime]:
    """Compute the next due datetime (UTC) for the given rule after `now`."""
    freq = rule.get("frequency")
    if freq == "one_time":
        try:
            when = datetime.fromisoformat((rule.get("scheduled_date") or "").replace("Z", "+00:00"))
            return when if when > now else None
        except Exception:
            return None

    if freq == "daily":
        # Next midnight UTC after now, or today if not yet expired
        candidate = now.replace(hour=9, minute=0, second=0, microsecond=0)
        if candidate <= now:
            candidate += timedelta(days=1)
        return candidate

    if freq == "weekly":
        days = sorted(set(rule.get("days_of_week") or []))
        if not days:
            return None
        for delta in range(0, 8):
            cand = (now + timedelta(days=delta)).replace(hour=9, minute=0, second=0, microsecond=0)
            if cand.weekday() in days and cand > now:
                return cand
        return None

    if freq == "monthly":
        dom = rule.get("day_of_month") or 1
        # Try this month; if past, next month
        try:
            candidate = now.replace(day=int(dom), hour=9, minute=0, second=0, microsecond=0)
        except ValueError:
            candidate = None
        if not candidate or candidate <= now:
            # Roll to next month
            year = now.year + (1 if now.month == 12 else 0)
            month = 1 if now.month == 12 else now.month + 1
            try:
                candidate = datetime(year, month, int(dom), 9, 0, tzinfo=timezone.utc)
            except ValueError:
                return None
        return candidate

    return None


async def run_materializer(uid: str) -> int:
    """Materialize the next occurrence for every active rule assigned to `uid`.
    Idempotent — only creates a task if none exists for the rule that is
    still open (status != completed) with due_date >= now.
    Returns the number of tasks created.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    rules = await db.scheduled_tasks.find(
        {"assigned_to": uid, "is_active": True}, {"_id": 0}
    ).to_list(500)

    created = 0
    for rule in rules:
        # Check if we already have an upcoming task for this rule
        existing = await db.tasks.find_one({
            "scheduled_task_id": rule["id"],
            "status": {"$ne": "completed"},
            "due_date": {"$gte": now_iso},
        }, {"_id": 0, "id": 1})
        if existing:
            continue

        next_due = _next_occurrence(rule, now)
        if not next_due:
            continue

        # For one_time — deactivate the rule after materializing once
        deactivate_after = rule.get("frequency") == "one_time"

        # Auto-increment code
        counter = await db.counters.find_one_and_update(
            {"_id": "tasks"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True,  # type: ignore
        )
        seq = (counter or {}).get("seq", 1)
        task = {
            "id": str(uuid.uuid4()),
            "code": f"TSK-{seq:04d}",
            "title": rule.get("title", "Recurring task"),
            "description": rule.get("description", ""),
            "status": "pending",
            "priority": rule.get("priority", "medium"),
            "assigned_to": rule.get("assigned_to"),
            "assigned_by": rule.get("created_by"),
            "due_date": next_due.isoformat(),
            "project_id": rule.get("project_id"),
            "parent_task_id": None,
            "tags": [],
            "scheduled_task_id": rule["id"],
            "created_at": now_iso,
            "completed_at": None,
            "rejection_reason": None,
        }
        await db.tasks.insert_one(task)
        await db.scheduled_tasks.update_one(
            {"id": rule["id"]},
            {"$set": {"last_generated": now_iso, **({"is_active": False} if deactivate_after else {})}},
        )
        created += 1
    return created


@router.get("")
async def list_schedules(user: dict = Depends(get_current_user)):
    uid = _current_user_id(user)
    q = {} if user.get("role") == "admin" else {"$or": [{"assigned_to": uid}, {"created_by": uid}]}
    docs = await db.scheduled_tasks.find(q).sort("created_at", -1).to_list(500)
    for d in docs:
        d.pop("_id", None)
    return docs


@router.post("")
async def create_schedule(data: ScheduledTaskCreate, user: dict = Depends(get_current_user)):
    uid = _current_user_id(user)
    is_admin_or_mgr = user.get("role") == "admin"
    # team members can only schedule for themselves
    target = data.assigned_to or uid
    if not is_admin_or_mgr and target != uid:
        raise HTTPException(status_code=403, detail="You can only schedule tasks for yourself")
    if not await _user_exists_any(target):
        raise HTTPException(status_code=404, detail="Assignee not found")
    if data.frequency not in VALID_FREQ:
        raise HTTPException(status_code=400, detail=f"Invalid frequency: {data.frequency}")

    rule = {
        "id": str(uuid.uuid4()),
        "title": data.title.strip(),
        "description": data.description,
        "priority": data.priority,
        "frequency": data.frequency,
        "days_of_week": data.days_of_week or [],
        "day_of_month": data.day_of_month,
        "scheduled_date": data.scheduled_date,
        "assigned_to": target,
        "project_id": data.project_id,
        "is_active": bool(data.is_active),
        "created_by": uid,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_generated": None,
    }
    await db.scheduled_tasks.insert_one(rule)
    rule.pop("_id", None)
    return rule


@router.patch("/{schedule_id}")
async def update_schedule(schedule_id: str, data: ScheduledTaskUpdate, user: dict = Depends(get_current_user)):
    existing = await db.scheduled_tasks.find_one({"id": schedule_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")
    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"
    if not is_admin and existing.get("created_by") != uid:
        raise HTTPException(status_code=403, detail="Not allowed")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if "frequency" in updates and updates["frequency"] not in VALID_FREQ:
        raise HTTPException(status_code=400, detail=f"Invalid frequency: {updates['frequency']}")
    if updates:
        await db.scheduled_tasks.update_one({"id": schedule_id}, {"$set": updates})
    doc = await db.scheduled_tasks.find_one({"id": schedule_id}, {"_id": 0})
    return doc


@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: str, user: dict = Depends(get_current_user)):
    existing = await db.scheduled_tasks.find_one({"id": schedule_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")
    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"
    if not is_admin and existing.get("created_by") != uid:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.scheduled_tasks.delete_one({"id": schedule_id})
    return {"ok": True}
