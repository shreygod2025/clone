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
import os

from routes.shared import (
    db, get_current_user, can_manage_user, get_managed_user_ids, get_assignable_users
)
from routes.inapp_notifications import create_notification
from routes.notifications import send_whatsapp_notification
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
    """Look up a user by id in team_users OR admins collection and return {name, email, phone}."""
    if not user_id:
        return {"name": "", "email": "", "phone": ""}
    u = await db.team_users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1, "phone": 1})
    if u:
        return {"name": u.get("name", ""), "email": u.get("email", ""), "phone": u.get("phone", "")}
    a = await db.admins.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1, "phone": 1})
    if a:
        return {"name": a.get("name", ""), "email": a.get("email", ""), "phone": a.get("phone", "")}
    return {"name": "", "email": "", "phone": ""}


async def _user_exists(user_id: str) -> bool:
    if not user_id:
        return False
    if await db.team_users.find_one({"id": user_id}, {"_id": 0, "id": 1}):
        return True
    if await db.admins.find_one({"id": user_id}, {"_id": 0, "id": 1}):
        return True
    return False


async def _notify_task_whatsapp(task: dict, template_key: str, assigner_id: str) -> None:
    """Send a WhatsApp message to the assignee.

    Different AiSensy campaigns per event — each with its own parameter shape:

    • task_assigned          → "New Task" campaign, 7 params in this order:
        {{1}} task title       {{2}} priority     {{3}} user type (role)
        {{4}} related-to       {{5}} details      {{6}} assigned by     {{7}} due date

    • task_reassigned        → falls back to `support_ticket_added` (5 params)
    • task_due_date_updated  → falls back to `support_ticket_added` (5 params)

    Silently no-ops for self-assignment or when the assignee has no phone.
    """
    try:
        assignee_id = task.get("assigned_to") or ""
        if not assignee_id or assignee_id == assigner_id:
            return
        assignee = await _find_user_display(assignee_id)
        assignee_phone = (assignee.get("phone") or "").strip()
        if not assignee_phone or assignee_phone.lower() in ("none", "null"):
            return
        assigner = await _find_user_display(assigner_id) if assigner_id else {"name": "OLL Admin"}
        base_url = os.environ.get("FRONTEND_URL", "https://oll.co").rstrip("/")
        task_link = f"{base_url}/admin/tasks?open={task.get('id')}"

        title = task.get("title") or "New Task"
        priority = (task.get("priority") or "medium").upper()
        due = task.get("due_date") or "no deadline"
        by = assigner.get("name") or "OLL Admin"

        # Resolve project name (Ticket Related To)
        project_name = "General"
        pid = task.get("project_id")
        if pid:
            proj = await db.projects.find_one({"id": pid}, {"_id": 0, "name": 1})
            if proj and proj.get("name"):
                project_name = proj["name"]

        # Resolve user type (assignee's role)
        user_type = "Team Member"
        assignee_role = None
        tu = await db.team_users.find_one({"id": assignee_id}, {"_id": 0, "role": 1, "department": 1})
        if tu:
            assignee_role = tu.get("role") or tu.get("department")
        if not assignee_role:
            adm = await db.admins.find_one({"id": assignee_id}, {"_id": 0, "role": 1})
            if adm:
                assignee_role = adm.get("role")
        if assignee_role:
            user_type = str(assignee_role).replace("_", " ").title()

        details = (task.get("description") or "").strip() or f"Open the task to see full details: {task_link}"
        # AiSensy sometimes trims very long params; keep description ≤ 250 chars.
        if len(details) > 250:
            details = details[:247] + "…"

        if template_key == "task_assigned":
            # Matches the "New Task" campaign body: 7 vars
            # {{1}} title, {{2}} priority, {{3}} user type, {{4}} related-to,
            # {{5}} details, {{6}} assigned by, {{7}} due date
            params = [title, priority, user_type, project_name, details, by, due]
        else:
            # `support_ticket_added` fallback (5 vars) for reassign / due-date change
            intro = "Reassigned" if template_key == "task_reassigned" else "Due date updated"
            task_code = task.get("code") or (f"TASK-{task.get('id','')[:6].upper()}")
            params = [
                assignee.get("name") or "Team",             # {{1}} name
                task_code,                                  # {{2}} ticket_id
                f"{intro}: {title}",                        # {{3}} subject
                priority,                                   # {{4}} priority
                f"Due {due} · from {by} · {task_link}",     # {{5}} school_name (extras)
            ]

        result = await send_whatsapp_notification(
            phone=assignee_phone,
            template_key=template_key,   # resolved via WHATSAPP_TEMPLATES → real AiSensy campaign
            params=params,
            user_name=assignee.get("name") or "Team",
        )
        if not result.get("success"):
            print(f"[TASKS-WA] {template_key} → {assignee_phone} failed: {result.get('message')}")
        else:
            print(f"[TASKS-WA] {template_key} → {assignee_phone} sent")
    except Exception as e:
        print(f"[TASKS-WA] {template_key} exception: {e}")


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


async def _batch_enrich_tasks(tasks: List[dict]) -> List[dict]:
    """Enrich many tasks in ~7 total DB queries instead of ~6-per-task.

    The old per-task `_enrich_task` fires 5-7 round-trips (assignee lookup,
    assigner lookup, subtask totals, comment count, project name). For a
    1000-task list that meant ~6000 sequential queries and multi-second
    /api/tasks load times. This variant batches every lookup:
      - one query on team_users for all user ids
      - one query on admins for the leftover ids
      - one aggregate on tasks for parent → {total, done} sub-task counts
      - one aggregate on task_comments for parent → count
      - one query on projects
    """
    if not tasks:
        return []
    for t in tasks:
        t.pop("_id", None)

    # ── Collect ids to look up ──
    user_ids: set = set()
    project_ids: set = set()
    parent_ids: set = set()          # top-level tasks that need subtask counts
    top_level_task_ids: set = set()  # for comment counts (bottom-level too, actually)
    for t in tasks:
        for k in ("assigned_to", "assigned_by"):
            v = t.get(k)
            if v:
                user_ids.add(v)
        pid = t.get("project_id")
        if pid:
            project_ids.add(pid)
        tid = t.get("id")
        if tid:
            if not t.get("parent_task_id"):
                parent_ids.add(tid)
            top_level_task_ids.add(tid)

    # ── User names in two queries (team_users + admins fallback) ──
    user_map: dict = {}
    if user_ids:
        async for u in db.team_users.find(
            {"id": {"$in": list(user_ids)}}, {"_id": 0, "id": 1, "name": 1}
        ):
            user_map[u["id"]] = u.get("name", "")
        missing = [uid for uid in user_ids if uid not in user_map]
        if missing:
            async for a in db.admins.find(
                {"id": {"$in": missing}}, {"_id": 0, "id": 1, "name": 1}
            ):
                user_map[a["id"]] = a.get("name", "")

    # ── Project names in one query ──
    project_map: dict = {}
    if project_ids:
        async for p in db.projects.find(
            {"id": {"$in": list(project_ids)}},
            {"_id": 0, "id": 1, "name": 1, "color": 1},
        ):
            project_map[p["id"]] = {"name": p.get("name"), "color": p.get("color")}

    # ── Sub-task totals per parent (one aggregate) ──
    subtask_totals: dict = {}
    subtask_done:   dict = {}
    if parent_ids:
        pipeline = [
            {"$match": {"parent_task_id": {"$in": list(parent_ids)}}},
            {"$group": {
                "_id": "$parent_task_id",
                "total": {"$sum": 1},
                "done":  {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            }},
        ]
        async for row in db.tasks.aggregate(pipeline):
            subtask_totals[row["_id"]] = row.get("total", 0)
            subtask_done[row["_id"]]   = row.get("done", 0)

    # ── Comment counts per task (one aggregate) ──
    comment_map: dict = {}
    if top_level_task_ids:
        pipeline = [
            {"$match": {"task_id": {"$in": list(top_level_task_ids)}}},
            {"$group": {"_id": "$task_id", "count": {"$sum": 1}}},
        ]
        async for row in db.task_comments.aggregate(pipeline):
            comment_map[row["_id"]] = row.get("count", 0)

    # ── Stitch everything back onto the task documents ──
    for t in tasks:
        t["assigned_to_name"] = user_map.get(t.get("assigned_to") or "", "")
        t["assigned_by_name"] = user_map.get(t.get("assigned_by") or "", "")
        tid = t.get("id")
        if tid and not t.get("parent_task_id"):
            t["subtask_total"] = subtask_totals.get(tid, 0)
            t["subtask_done"]  = subtask_done.get(tid, 0)
        else:
            t["subtask_total"] = 0
            t["subtask_done"]  = 0
        t["comment_count"] = comment_map.get(tid, 0) if tid else 0
        pid = t.get("project_id")
        if pid and pid in project_map:
            t["project_name"]  = project_map[pid]["name"]
            t["project_color"] = project_map[pid]["color"]
        else:
            t["project_name"]  = None
            t["project_color"] = None
    return tasks


async def _list_reports_of(manager_id: str) -> List[str]:
    """Return ids of team_users whose reports_to == manager_id (direct reports only for now)."""
    docs = await db.team_users.find({"reports_to": manager_id}, {"_id": 0, "id": 1}).to_list(2000)
    return [d["id"] for d in docs]


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/assignable-users")
async def list_assignable_users(user: dict = Depends(get_current_user)):
    """Return list of users that the current user is authorized to assign tasks to."""
    return await get_assignable_users(user)


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

    if not await can_manage_user(user, data.assigned_to):
        raise HTTPException(status_code=403, detail="Access denied.")

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
        "created_by": _current_user_id(user),
        "account_id": user.get("account_id") or "default",
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
    # WhatsApp notify assignee (task_assigned template)
    await _notify_task_whatsapp(task, "task_assigned", _current_user_id(user))
    return await _enrich_task(task)


class BulkTaskCreate(BaseModel):
    tasks: List[TaskCreate]


@router.post("/bulk")
async def create_tasks_bulk(payload: BulkTaskCreate, user: dict = Depends(get_current_user)):
    """Create many tasks in one call. Shared fields (assignee/priority/due-date/etc)
    can be repeated across rows; each row can also override its own values.

    Returns a summary `{created: [<enriched task>], errors: [{index, detail}]}`.
    Non-fatal validation errors on individual rows don't abort the batch — the
    caller sees exactly which rows failed and why.
    """
    if not payload.tasks:
        raise HTTPException(status_code=400, detail="At least one task is required")
    if len(payload.tasks) > 50:
        raise HTTPException(status_code=400, detail="Bulk create is limited to 50 tasks per request")

    created: list[dict] = []
    errors: list[dict] = []
    actor_id = _current_user_id(user)
    actor_display = user.get("name") or user.get("email", "")

    for idx, row in enumerate(payload.tasks):
        try:
            if not row.title.strip():
                errors.append({"index": idx, "detail": "Title is required"})
                continue
            if not row.assigned_to:
                errors.append({"index": idx, "detail": "assigned_to is required"})
                continue
            if row.status not in VALID_STATUSES:
                errors.append({"index": idx, "detail": f"Invalid status: {row.status}"})
                continue
            if row.priority not in VALID_PRIORITIES:
                errors.append({"index": idx, "detail": f"Invalid priority: {row.priority}"})
                continue
            if not await _user_exists(row.assigned_to):
                errors.append({"index": idx, "detail": "Assignee not found"})
                continue
            if not await can_manage_user(user, row.assigned_to):
                errors.append({"index": idx, "detail": "Access denied."})
                continue
            if row.project_id and not await db.projects.find_one({"id": row.project_id}, {"_id": 0, "id": 1}):
                errors.append({"index": idx, "detail": "Project not found"})
                continue

            task = {
                "id": str(uuid.uuid4()),
                "code": await _next_task_code(),
                "title": row.title.strip(),
                "description": row.description,
                "status": row.status,
                "priority": row.priority,
                "assigned_to": row.assigned_to,
                "assigned_by": actor_id,
                "created_by": actor_id,
                "account_id": user.get("account_id") or "default",
                "due_date": row.due_date,
                "project_id": row.project_id,
                "parent_task_id": row.parent_task_id,
                "tags": row.tags or [],
                "gdrive_link": row.gdrive_link,
                "attachments": row.attachments or [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": None,
                "rejection_reason": None,
            }
            await db.tasks.insert_one(task)

            # Notifications (fire-and-forget; if this fails the task is still created)
            try:
                await create_notification(
                    user_id=row.assigned_to,
                    type_="task_assigned",
                    title=f"New task: {task['title']}",
                    message=f"Assigned by {actor_display}",
                    task_id=task["id"],
                    actor_id=actor_id,
                )
                await _notify_task_whatsapp(task, "task_assigned", actor_id)
            except Exception:  # pragma: no cover — notification failures are non-fatal
                pass

            created.append(await _enrich_task(task))
        except Exception as e:  # pragma: no cover — surface as row-level error
            errors.append({"index": idx, "detail": str(e)})

    return {"created": created, "errors": errors, "count": len(created)}


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

    managed_ids = await get_managed_user_ids(uid)
    allowed_ids = list(set([uid] + managed_ids))

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
            query["assigned_to"] = {"$in": allowed_ids}
    elif filter == "all":
        if not is_admin:
            query["$or"] = [{"assigned_to": {"$in": allowed_ids}}, {"assigned_by": {"$in": allowed_ids}}]

    # Explicit assignee filter (admins & managers can drill into one user's tasks)
    if assignee:
        if is_admin or assignee == uid or assignee in managed_ids:
            query["assigned_to"] = assignee
        else:
            raise HTTPException(status_code=403, detail="Access denied.")

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
    return await _batch_enrich_tasks(docs)


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
        "today":     await _batch_enrich_tasks(due_today),
        "this_week": await _batch_enrich_tasks(this_week),
        "overdue":   await _batch_enrich_tasks(overdue),
    }


@router.get("/{task_id}")
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    uid = _current_user_id(user)
    is_admin = user.get("role") in ("admin", "super_admin")
    if not is_admin:
        managed = await get_managed_user_ids(uid)
        allowed = set([uid] + managed)
        if t.get("assigned_to") not in allowed and t.get("assigned_by") not in allowed:
            raise HTTPException(status_code=403, detail="Access denied.")
    return await _enrich_task(t)


@router.patch("/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    uid = _current_user_id(user)
    is_admin = user.get("role") in ("admin", "super_admin")

    # Authorize task edit: must be admin, task creator, assignee, or manager of assignee/creator
    if not is_admin:
        managed = await get_managed_user_ids(uid)
        allowed = set([uid] + managed)
        if t.get("assigned_to") not in allowed and t.get("assigned_by") not in allowed:
            raise HTTPException(status_code=403, detail="Access denied.")

    # Reassignment check: user must be eligible to assign to the new assignee
    if data.assigned_to is not None and data.assigned_to != t.get("assigned_to"):
        if data.assigned_to and not await can_manage_user(user, data.assigned_to):
            raise HTTPException(status_code=403, detail="Access denied.")

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

    # Track whether we need to fire WhatsApp for reassignment / due-date change
    old_assignee = t.get("assigned_to")
    old_due_date = t.get("due_date")

    if updates:
        await db.tasks.update_one({"id": task_id}, {"$set": updates})
        t = await db.tasks.find_one({"id": task_id})

    # Fire WhatsApp on reassignment (new assignee)
    if data.assigned_to is not None and data.assigned_to and data.assigned_to != old_assignee:
        await _notify_task_whatsapp(t, "task_reassigned", uid)

    # Fire WhatsApp on due_date change (only if the task was NOT just reassigned —
    # otherwise the reassign notification already carries the new due_date)
    elif data.due_date is not None and data.due_date != old_due_date and t.get("assigned_to"):
        await _notify_task_whatsapp(t, "task_due_date_updated", uid)
        # In-app notification too
        await create_notification(
            user_id=t.get("assigned_to"),
            type_="task_due_date_updated",
            title=f"Due date updated: {t.get('title')}",
            message=f"New due date: {data.due_date or 'no deadline'}",
            task_id=task_id,
            actor_id=uid,
        )

    return await _enrich_task(t)


@router.delete("/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    """Delete a task.

    Authorization: only the task **creator** (`assigned_by`), a manager of the assignee,
    or an admin may delete.
    """
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    uid = _current_user_id(user)
    is_admin = user.get("role") in ("admin", "super_admin")
    is_creator = (uid == t.get("assigned_by"))
    is_assignee_mgr = await can_manage_user(user, t.get("assigned_to") or "")
    if not is_admin and not is_creator and not is_assignee_mgr:
        raise HTTPException(
            status_code=403,
            detail="Access denied.",
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
