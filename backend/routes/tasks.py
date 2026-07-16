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
from routes.inapp_notifications import create_notification
try:
    from routes.scheduled_tasks import run_materializer
except Exception:
    run_materializer = None  # type: ignore


router = APIRouter(prefix="/tasks", tags=["tasks"])


# ── Models ────────────────────────────────────────────────────────────────────
VALID_STATUSES = ["pending", "in_progress", "pending_approval", "completed", "rejected"]
VALID_PRIORITIES = ["low", "medium", "high", "urgent"]


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "pending"
    priority: str = "medium"
    assigned_to: str = ""  # team_user.id OR admin.id — required
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    parent_task_id: Optional[str] = None  # NEW — for sub-tasks
    tags: List[str] = []
    gdrive_link: Optional[str] = None
    attachments: List[dict] = []  # [{name, url, kind: 'file'|'link'}]


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    tags: Optional[List[str]] = None
    gdrive_link: Optional[str] = None
    attachments: Optional[List[dict]] = None


class CommentCreate(BaseModel):
    message: str


class RejectPayload(BaseModel):
    reason: str = ""


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


async def _find_user_display(user_id: str) -> dict:
    """Look up a user by id in team_users OR admins collection and return {name, email}."""
    if not user_id:
        return {"name": "", "email": ""}
    u = await db.team_users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    if u:
        return {"name": u.get("name", ""), "email": u.get("email", "")}
    a = await db.admins.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    if a:
        return {"name": a.get("name", ""), "email": a.get("email", "")}
    return {"name": "", "email": ""}


async def _user_exists(user_id: str) -> bool:
    if not user_id:
        return False
    if await db.team_users.find_one({"id": user_id}, {"_id": 0, "id": 1}):
        return True
    if await db.admins.find_one({"id": user_id}, {"_id": 0, "id": 1}):
        return True
    return False


async def _enrich_task(t: dict) -> dict:
    """Attach assignee & assigner display names for the UI."""
    t.pop("_id", None)
    for key, out in (("assigned_to", "assigned_to_name"), ("assigned_by", "assigned_by_name")):
        info = await _find_user_display(t.get(key) or "")
        t[out] = info["name"]

    # Sub-task stats
    tid = t.get("id")
    if tid and not t.get("parent_task_id"):  # only compute for top-level
        t["subtask_total"] = await db.tasks.count_documents({"parent_task_id": tid})
        t["subtask_done"] = await db.tasks.count_documents({"parent_task_id": tid, "status": "completed"})
    else:
        t["subtask_total"] = 0
        t["subtask_done"] = 0

    # Comment count
    if tid:
        t["comment_count"] = await db.task_comments.count_documents({"task_id": tid})
    else:
        t["comment_count"] = 0

    # Project name/color (for display in task card)
    pid = t.get("project_id")
    if pid:
        proj = await db.projects.find_one({"id": pid}, {"_id": 0, "name": 1, "color": 1})
        t["project_name"] = (proj or {}).get("name")
        t["project_color"] = (proj or {}).get("color")
    else:
        t["project_name"] = None
        t["project_color"] = None

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

    if not await _user_exists(data.assigned_to):
        raise HTTPException(status_code=404, detail="Assignee not found")

    if data.project_id:
        if not await db.projects.find_one({"id": data.project_id}, {"_id": 0, "id": 1}):
            raise HTTPException(status_code=404, detail="Project not found")

    if data.parent_task_id:
        parent = await db.tasks.find_one({"id": data.parent_task_id}, {"_id": 0, "id": 1})
        if not parent:
            raise HTTPException(status_code=404, detail="Parent task not found")

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
        "parent_task_id": data.parent_task_id,
        "tags": data.tags or [],
        "gdrive_link": data.gdrive_link,
        "attachments": data.attachments or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "rejection_reason": None,
    }
    await db.tasks.insert_one(task)
    # In-app notify assignee (skipped if actor == assignee)
    await create_notification(
        user_id=data.assigned_to,
        type_="task_assigned",
        title=f"New task: {task['title']}",
        message=f"Assigned by {user.get('name') or user.get('email','')}",
        task_id=task["id"],
        actor_id=_current_user_id(user),
    )
    return await _enrich_task(task)


@router.get("")
async def list_tasks(
    filter: str = Query("my", pattern="^(my|by_me|team|all)$"),
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    assignee: Optional[str] = None,
    include_subtasks: bool = False,
    parent_task_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"

    # Materialize any due recurring tasks for this user before listing
    if run_materializer:
        try:
            await run_materializer(uid)
        except Exception:
            pass

    # When browsing tasks *inside a specific project*, non-admin project members
    # should see EVERY task in that project (not just ones assigned to/by them).
    # This lets the project detail page show the full team's work.
    project_scope_unlocked = False
    if project_id and not is_admin:
        proj = await db.projects.find_one({"id": project_id}, {"_id": 0, "lead_id": 1, "member_ids": 1, "created_by": 1})
        if proj and (uid == proj.get("lead_id") or uid == proj.get("created_by") or uid in (proj.get("member_ids") or [])):
            project_scope_unlocked = True

    query: dict = {}
    if project_scope_unlocked:
        pass  # no per-user restriction — the project_id filter below does the scoping
    elif filter == "my":
        query["assigned_to"] = uid
    elif filter == "by_me":
        query["assigned_by"] = uid
    elif filter == "team":
        if is_admin:
            pass
        else:
            reports = await _list_reports_of(uid)
            ids = reports + [uid]
            query["assigned_to"] = {"$in": ids}
    elif filter == "all":
        if not is_admin:
            query["$or"] = [{"assigned_to": uid}, {"assigned_by": uid}]

    # Explicit assignee filter (admins & managers can drill into one user's tasks)
    if assignee:
        if is_admin or assignee == uid:
            query["assigned_to"] = assignee
        else:
            # allow managers to filter by their reports
            reports = await _list_reports_of(uid)
            if assignee in reports:
                query["assigned_to"] = assignee
            else:
                raise HTTPException(status_code=403, detail="Not allowed to view this user's tasks")

    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id

    # Sub-task scoping: default hide sub-tasks; if parent_task_id set, list only subtasks of that parent
    if parent_task_id:
        query["parent_task_id"] = parent_task_id
    elif not include_subtasks:
        query["$and"] = query.get("$and", []) + [{"$or": [{"parent_task_id": None}, {"parent_task_id": {"$exists": False}}]}]

    docs = await db.tasks.find(query).sort("created_at", -1).to_list(1000)
    return [await _enrich_task(t) for t in docs]


@router.get("/today")
async def list_todays_tasks(user: dict = Depends(get_current_user)):
    """Return the current user's tasks organised for the dashboard.

    Buckets returned:
      - today:      due within today's UTC range
      - this_week:  due after today but within this ISO week (Mon–Sun)
      - overdue:    due < today AND not completed
    """
    uid = _current_user_id(user)
    now = datetime.now(timezone.utc)
    today = now.date()
    start_today = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()
    end_today = datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc).isoformat()

    # This week — from tomorrow's start through Sunday's end
    weekday = today.weekday()  # Mon=0
    days_left = 6 - weekday
    from datetime import timedelta as _td
    tomorrow = today + _td(days=1)
    week_end = today + _td(days=days_left)
    start_week = datetime.combine(tomorrow, datetime.min.time(), tzinfo=timezone.utc).isoformat()
    end_week = datetime.combine(week_end, datetime.max.time(), tzinfo=timezone.utc).isoformat()

    due_today = await db.tasks.find({
        "assigned_to": uid,
        "due_date": {"$gte": start_today, "$lte": end_today},
    }).sort("priority", -1).to_list(500)

    this_week = await db.tasks.find({
        "assigned_to": uid,
        "status": {"$ne": "completed"},
        "due_date": {"$gte": start_week, "$lte": end_week},
    }).sort("due_date", 1).to_list(500)

    overdue = await db.tasks.find({
        "assigned_to": uid,
        "due_date": {"$lt": start_today},
        "status": {"$ne": "completed"},
    }).sort("due_date", 1).to_list(500)

    return {
        "today":     [await _enrich_task(t) for t in due_today],
        "this_week": [await _enrich_task(t) for t in this_week],
        "overdue":   [await _enrich_task(t) for t in overdue],
    }


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
    for field in ("title", "description", "priority", "due_date", "project_id", "tags", "gdrive_link", "attachments", "assigned_to"):
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
        if data.assigned_to and not await _user_exists(data.assigned_to):
            raise HTTPException(status_code=404, detail="Assignee not found")
        updates["assigned_to"] = data.assigned_to
        # Notify the new assignee
        if data.assigned_to and data.assigned_to != t.get("assigned_to"):
            await create_notification(
                user_id=data.assigned_to,
                type_="task_reassigned",
                title=f"Reassigned: {t.get('title')}",
                message=f"Reassigned by {user.get('name') or user.get('email','')}",
                task_id=task_id,
                actor_id=uid,
            )

    if updates:
        await db.tasks.update_one({"id": task_id}, {"$set": updates})
        t = await db.tasks.find_one({"id": task_id})
    return await _enrich_task(t)


@router.delete("/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    """Delete a task.

    Authorization: only the task **creator** (`assigned_by`) or an admin
    may delete. Assignees (`assigned_to`) are explicitly NOT allowed to
    delete — they can only work on / submit / decline the task. This
    prevents a team member from wiping a task their manager assigned to
    them.
    """
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"
    if not is_admin and uid != t.get("assigned_by"):
        raise HTTPException(
            status_code=403,
            detail="Only the task creator or an admin can delete this task.",
        )

    # Cascade delete sub-tasks & comments
    await db.tasks.delete_many({"parent_task_id": task_id})
    await db.task_comments.delete_many({"task_id": task_id})
    await db.tasks.delete_one({"id": task_id})
    return {"ok": True}


# ── Sub-tasks ─────────────────────────────────────────────────────────────────
@router.get("/{task_id}/subtasks")
async def list_subtasks(task_id: str, user: dict = Depends(get_current_user)):
    """List all direct sub-tasks of a parent task."""
    parent = await db.tasks.find_one({"id": task_id}, {"_id": 0, "id": 1})
    if not parent:
        raise HTTPException(status_code=404, detail="Task not found")
    docs = await db.tasks.find({"parent_task_id": task_id}).sort("created_at", 1).to_list(500)
    return [await _enrich_task(t) for t in docs]


# ── Approval flow ─────────────────────────────────────────────────────────────
@router.post("/{task_id}/submit")
async def submit_task(task_id: str, user: dict = Depends(get_current_user)):
    """Assignee submits a task for approval by the assigner. status -> pending_approval."""
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    uid = _current_user_id(user)
    if uid != t.get("assigned_to") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only the assignee can submit this task")
    await db.tasks.update_one({"id": task_id}, {"$set": {"status": "pending_approval"}})
    t = await db.tasks.find_one({"id": task_id})
    # Notify the assigner that the task is ready for approval
    await create_notification(
        user_id=t.get("assigned_by") or "",
        type_="task_submitted",
        title=f"Ready for approval: {t.get('title')}",
        message="Please review and approve/reject.",
        task_id=task_id,
        actor_id=_current_user_id(user),
    )
    return await _enrich_task(t)


@router.post("/{task_id}/approve")
async def approve_task(task_id: str, user: dict = Depends(get_current_user)):
    """Assigner or admin approves — status -> completed with completed_at stamp."""
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"
    if not is_admin and uid != t.get("assigned_by"):
        raise HTTPException(status_code=403, detail="Only the assigner or an admin can approve")
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": None,
        }},
    )
    t = await db.tasks.find_one({"id": task_id})
    await create_notification(
        user_id=t.get("assigned_to") or "",
        type_="task_approved",
        title=f"Approved: {t.get('title')}",
        task_id=task_id,
        actor_id=_current_user_id(user),
    )
    return await _enrich_task(t)


@router.post("/{task_id}/reject")
async def reject_task(task_id: str, payload: RejectPayload, user: dict = Depends(get_current_user)):
    """Assigner or admin rejects — status -> rejected with reason."""
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    uid = _current_user_id(user)
    is_admin = user.get("role") == "admin"
    if not is_admin and uid != t.get("assigned_by"):
        raise HTTPException(status_code=403, detail="Only the assigner or an admin can reject")
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"status": "rejected", "rejection_reason": payload.reason or "", "completed_at": None}},
    )
    t = await db.tasks.find_one({"id": task_id})
    await create_notification(
        user_id=t.get("assigned_to") or "",
        type_="task_rejected",
        title=f"Rejected: {t.get('title')}",
        message=payload.reason or "",
        task_id=task_id,
        actor_id=_current_user_id(user),
    )
    return await _enrich_task(t)


# ── Comments ──────────────────────────────────────────────────────────────────
@router.get("/{task_id}/comments")
async def list_comments(task_id: str, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0, "id": 1})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    docs = await db.task_comments.find({"task_id": task_id}).sort("created_at", 1).to_list(1000)
    for d in docs:
        d.pop("_id", None)
    return docs


@router.post("/{task_id}/comments")
async def add_comment(task_id: str, payload: CommentCreate, user: dict = Depends(get_current_user)):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0, "id": 1})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    uid = _current_user_id(user)
    display = await _find_user_display(uid)
    comment = {
        "id": str(uuid.uuid4()),
        "task_id": task_id,
        "user_id": uid,
        "user_name": display["name"] or user.get("email", ""),
        "message": payload.message.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.task_comments.insert_one(comment)
    comment.pop("_id", None)
    # Notify all participants (assignee + assigner) except the author
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0, "assigned_to": 1, "assigned_by": 1, "title": 1})
    recipients = set(filter(None, [t.get("assigned_to"), t.get("assigned_by")]))
    recipients.discard(uid)
    for r in recipients:
        await create_notification(
            user_id=r,
            type_="task_comment",
            title=f"New comment on: {t.get('title')}",
            message=payload.message.strip()[:120],
            task_id=task_id,
            actor_id=uid,
        )
    return comment
