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
MILESTONE_STATUSES = ["pending", "in_progress", "completed"]
KB_TYPES = ["note", "link"]


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#3B82F6"
    status: str = "active"
    lead_id: str = ""
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


class MilestoneCreate(BaseModel):
    title: str
    description: str = ""
    due_date: Optional[str] = None
    status: str = "pending"
    order: int = 0


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    order: Optional[int] = None


class KbCreate(BaseModel):
    type: str = "note"       # note | link
    title: str
    content: str = ""        # for notes
    url: str = ""            # for links
    is_pinned: bool = False


class KbUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    is_pinned: Optional[bool] = None


class EarningIn(BaseModel):
    amount: float = Field(..., gt=0)          # base amount, excl. GST
    gst_percent: float = Field(0, ge=0, le=28)
    earning_date: str = Field(..., min_length=8, max_length=20)
    source: str = Field("", max_length=200)   # client / payer
    description: str = Field("", max_length=1000)
    invoice_number: str = Field("", max_length=80)
    invoice_url: str = Field("", max_length=500)


def _current_user_id(user: dict) -> str:
    return user.get("id") or user.get("user_id") or ""


async def _find_user_display(user_id: str) -> dict:
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


async def _enrich_project(p: dict, with_task_stats: bool = False) -> dict:
    p.pop("_id", None)
    lead_info = await _find_user_display(p.get("lead_id", ""))
    p["lead_name"] = lead_info["name"]

    m_ids = p.get("member_ids") or []
    members: list = []
    if m_ids:
        # Prefer team_users; fall back to admins for the rest
        tu = await db.team_users.find(
            {"id": {"$in": m_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(500)
        seen = {m["id"] for m in tu}
        for m in tu:
            members.append(m)
        remaining = [x for x in m_ids if x not in seen]
        if remaining:
            adm = await db.admins.find(
                {"id": {"$in": remaining}}, {"_id": 0, "id": 1, "name": 1, "email": 1}
            ).to_list(500)
            for a in adm:
                members.append(a)
    p["members"] = members

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

    if data.lead_id and not await _user_exists(data.lead_id):
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
    is_admin = user.get("role") == "admin"
    query: dict = {}
    if status:
        query["status"] = status
    # Non-admins can only see projects they lead, are a member of, or created.
    # `mine=True` from the frontend is now redundant for them but still honoured.
    if not is_admin or mine:
        query["$or"] = [
            {"lead_id": uid},
            {"member_ids": uid},
            {"created_by": uid},
        ]
    docs = await db.projects.find(query).sort("created_at", -1).to_list(500)
    return [await _enrich_project(p, with_task_stats=True) for p in docs]


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": project_id})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    # Non-admins can only view projects they're on
    if user.get("role") != "admin":
        uid = _current_user_id(user)
        if uid not in (p.get("lead_id"), p.get("created_by")) and uid not in (p.get("member_ids") or []):
            raise HTTPException(status_code=403, detail="You are not a member of this project")
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
        if not await _user_exists(updates["lead_id"]):
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
    await db.milestones.delete_many({"project_id": project_id})
    await db.project_kb.delete_many({"project_id": project_id})
    await db.project_earnings.delete_many({"project_id": project_id})
    await db.projects.delete_one({"id": project_id})
    return {"ok": True}


# ── Milestones ────────────────────────────────────────────────────────────────
@router.get("/{project_id}/milestones")
async def list_milestones(project_id: str, user: dict = Depends(get_current_user)):
    if not await db.projects.find_one({"id": project_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=404, detail="Project not found")
    docs = await db.milestones.find({"project_id": project_id}).sort([("order", 1), ("created_at", 1)]).to_list(500)
    for d in docs:
        d.pop("_id", None)
    return docs


@router.post("/{project_id}/milestones")
async def create_milestone(project_id: str, data: MilestoneCreate, user: dict = Depends(get_current_user)):
    if not await db.projects.find_one({"id": project_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=404, detail="Project not found")
    if data.status not in MILESTONE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
    ms = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "title": data.title.strip(),
        "description": data.description,
        "due_date": data.due_date,
        "status": data.status,
        "order": data.order,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.milestones.insert_one(ms)
    ms.pop("_id", None)
    return ms


@router.patch("/milestones/{milestone_id}")
async def update_milestone(milestone_id: str, data: MilestoneUpdate, user: dict = Depends(get_current_user)):
    if not await db.milestones.find_one({"id": milestone_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=404, detail="Milestone not found")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if "status" in updates and updates["status"] not in MILESTONE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {updates['status']}")
    if updates:
        await db.milestones.update_one({"id": milestone_id}, {"$set": updates})
    ms = await db.milestones.find_one({"id": milestone_id}, {"_id": 0})
    return ms


@router.delete("/milestones/{milestone_id}")
async def delete_milestone(milestone_id: str, user: dict = Depends(get_current_user)):
    res = await db.milestones.delete_one({"id": milestone_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"ok": True}


# ── Earnings ──────────────────────────────────────────────────────────────────
async def _project_for_finance(project_id: str, user: dict) -> dict:
    p = await db.projects.find_one({"id": project_id}, {"_id": 0, "id": 1, "lead_id": 1, "created_by": 1, "member_ids": 1})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    uid = _current_user_id(user)
    if user.get("role") != "admin" and uid not in (p.get("lead_id"), p.get("created_by")) and uid not in (p.get("member_ids") or []):
        raise HTTPException(status_code=403, detail="You are not a member of this project")
    return p


def _earning_doc(data: EarningIn) -> dict:
    gst_amount = round(data.amount * data.gst_percent / 100, 2)
    return {
        **data.model_dump(),
        "source": data.source.strip(),
        "invoice_number": data.invoice_number.strip(),
        "gst_amount": gst_amount,
        "total_amount": round(data.amount + gst_amount, 2),
    }


@router.get("/{project_id}/earnings")
async def list_earnings(project_id: str, user: dict = Depends(get_current_user)):
    await _project_for_finance(project_id, user)
    docs = await db.project_earnings.find({"project_id": project_id}, {"_id": 0}).sort("earning_date", -1).to_list(2000)
    return {
        "earnings": docs,
        "count": len(docs),
        "total": round(sum(d.get("amount", 0) for d in docs), 2),
        "total_gst": round(sum(d.get("gst_amount", 0) for d in docs), 2),
        "total_with_gst": round(sum(d.get("total_amount", 0) for d in docs), 2),
    }


@router.post("/{project_id}/earnings")
async def create_earning(project_id: str, data: EarningIn, user: dict = Depends(get_current_user)):
    await _project_for_finance(project_id, user)
    doc = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        **_earning_doc(data),
        "created_by": _current_user_id(user),
        "created_by_name": user.get("name") or user.get("email") or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.project_earnings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/earnings/{earning_id}")
async def update_earning(earning_id: str, data: EarningIn, user: dict = Depends(get_current_user)):
    e = await db.project_earnings.find_one({"id": earning_id}, {"_id": 0, "project_id": 1})
    if not e:
        raise HTTPException(status_code=404, detail="Earning not found")
    await _project_for_finance(e["project_id"], user)
    updates = {**_earning_doc(data), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.project_earnings.update_one({"id": earning_id}, {"$set": updates})
    return await db.project_earnings.find_one({"id": earning_id}, {"_id": 0})


@router.delete("/earnings/{earning_id}")
async def delete_earning(earning_id: str, user: dict = Depends(get_current_user)):
    e = await db.project_earnings.find_one({"id": earning_id}, {"_id": 0, "project_id": 1})
    if not e:
        raise HTTPException(status_code=404, detail="Earning not found")
    await _project_for_finance(e["project_id"], user)
    await db.project_earnings.delete_one({"id": earning_id})
    return {"ok": True}


# ── Project Knowledge Base ────────────────────────────────────────────────────
@router.get("/{project_id}/kb")
async def list_kb(project_id: str, user: dict = Depends(get_current_user)):
    if not await db.projects.find_one({"id": project_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=404, detail="Project not found")
    docs = await db.project_kb.find({"project_id": project_id}).sort([("is_pinned", -1), ("created_at", -1)]).to_list(500)
    for d in docs:
        d.pop("_id", None)
    return docs


@router.post("/{project_id}/kb")
async def create_kb_entry(project_id: str, data: KbCreate, user: dict = Depends(get_current_user)):
    if not await db.projects.find_one({"id": project_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=404, detail="Project not found")
    if data.type not in KB_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid type: {data.type}")
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Title required")
    display = await _find_user_display(_current_user_id(user))
    entry = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "type": data.type,
        "title": data.title.strip(),
        "content": data.content,
        "url": data.url,
        "is_pinned": bool(data.is_pinned),
        "created_by": _current_user_id(user),
        "created_by_name": display["name"] or user.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.project_kb.insert_one(entry)
    entry.pop("_id", None)
    return entry


@router.patch("/kb/{entry_id}")
async def update_kb_entry(entry_id: str, data: KbUpdate, user: dict = Depends(get_current_user)):
    if not await db.project_kb.find_one({"id": entry_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=404, detail="KB entry not found")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.project_kb.update_one({"id": entry_id}, {"$set": updates})
    doc = await db.project_kb.find_one({"id": entry_id}, {"_id": 0})
    return doc


@router.delete("/kb/{entry_id}")
async def delete_kb_entry(entry_id: str, user: dict = Depends(get_current_user)):
    res = await db.project_kb.delete_one({"id": entry_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="KB entry not found")
    return {"ok": True}
