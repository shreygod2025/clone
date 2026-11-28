"""Franchise CRM Module.

Allows Growth Partner (GP) Managers and Admins to manage Franchise inquiries & leads,
assign them to salespersons / telecallers (B2C, B2B, Business Development Executives),
schedule calls, demos, and follow-ups, and view performance track sheet reports.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr

from .shared import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/franchise-crm", tags=["Franchise CRM"])

# GP Manager Role ID in database: 8741cb57-bbae-4cb1-9241-c90a9b54cd6d
GP_MANAGER_ROLE_ID = "8741cb57-bbae-4cb1-9241-c90a9b54cd6d"


# ── Role & Permission Helpers ──────────────────────────────────────────

def _is_admin(user: dict) -> bool:
    if not user:
        return False
    return (user.get("role") or "").lower() in ("admin", "super_admin")


def _is_gp_manager(user: dict) -> bool:
    if not user:
        return False
    role = (user.get("role") or "").lower()
    role_id = str(user.get("role_id") or "")
    if role_id == GP_MANAGER_ROLE_ID:
        return True
    if (user.get("email") or "").lower() in ("growth@oll.co", "parul.mittal1311@gmail.com"):
        return True
    return "growth_partner_manager" in role or "gp_manager" in role


def _is_manager(user: dict) -> bool:
    """Admin or GP Manager or any user with is_manager=True."""
    return _is_admin(user) or _is_gp_manager(user) or bool(user.get("is_manager"))


def _require_franchise_access(user: dict) -> None:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    # All authenticated team members, admins, and managers can access Franchise CRM
    return


def _require_manager(user: dict) -> None:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not _is_manager(user):
        raise HTTPException(
            status_code=403,
            detail="Permission denied: only GP Managers and Admins can perform this action"
        )


async def _log_activity(
    lead_id: str,
    lead_name: str,
    lead_phone: str,
    user: dict,
    action: str,
    details: dict,
) -> None:
    now_dt = datetime.now(timezone.utc)
    activity_doc = {
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "lead_name": lead_name,
        "lead_phone": lead_phone,
        "user_id": str(user.get("id") or user.get("_id") or ""),
        "user_name": user.get("name") or user.get("username") or user.get("email") or "User",
        "user_email": user.get("email") or "",
        "user_role": user.get("role") or "",
        "user_type": user.get("user_type") or "team_user",
        "action": action,
        "details": details,
        "day": now_dt.date().isoformat(),
        "timestamp": now_dt.isoformat(),
    }
    await db.franchise_crm_activities.insert_one(activity_doc)


async def _sync_growth_partners_franchise_leads() -> None:
    """Sync franchise landing & brochure inquiries into franchise_leads collection."""
    try:
        inquiries = await db.growth_partners.find({
            "$or": [
                {"interest_type": "centre_franchise"},
                {"source": {"$in": ["franchise_landing", "franchise_brochure"]}},
            ]
        }).to_list(100)

        for inq in inquiries:
            q = {"$or": [{"id": inq.get("id")}, {"phone": inq.get("phone")}]}
            existing = await db.franchise_leads.find_one(q)
            if not existing:
                now_iso = inq.get("created_at") or datetime.now(timezone.utc).isoformat()
                lead_doc = {
                    "id": inq.get("id") or str(uuid.uuid4()),
                    "name": inq.get("name") or "Franchise Lead",
                    "phone": inq.get("phone") or "",
                    "email": inq.get("email") or "",
                    "city": inq.get("city") or "",
                    "state": inq.get("state") or "",
                    "occupation": inq.get("occupation") or "",
                    "has_space": inq.get("has_space") or "looking",
                    "investment_budget": inq.get("investment_budget") or "₹2.5 Lakhs",
                    "source": inq.get("source") or "franchise_landing",
                    "details": inq.get("details") or inq.get("reason") or "",
                    "notes": inq.get("notes") or "",
                    "status": inq.get("status") or "new",
                    "assigned_to": inq.get("assigned_to") or "",
                    "assigned_to_name": inq.get("assigned_to_name") or "",
                    "assigned_to_email": inq.get("assigned_to_email") or "",
                    "assigned_to_role": inq.get("assigned_to_role") or "",
                    "assigned_by": "",
                    "assigned_by_name": "",
                    "assigned_at": inq.get("created_at") or now_iso,
                    "call_status": "none",
                    "scheduled_call_at": None,
                    "call_notes": "",
                    "calls_count": 0,
                    "last_call_at": None,
                    "demo_status": "none",
                    "scheduled_demo_at": None,
                    "demo_type": "online_meet",
                    "demo_link": "",
                    "demo_notes": "",
                    "demos_count": 0,
                    "last_demo_at": None,
                    "followup_status": "none",
                    "next_followup_at": None,
                    "followup_notes": "",
                    "followups_count": 0,
                    "comments": inq.get("comments") or [],
                    "created_at": now_iso,
                    "updated_at": inq.get("updated_at") or now_iso,
                }
                await db.franchise_leads.insert_one(lead_doc)
    except Exception as exc:
        logger.warning("Error syncing growth_partners to franchise_leads: %s", exc)


# ── Pydantic Request Models ──────────────────────────────────────────

class FranchiseLeadCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = ""
    city: str = Field(..., min_length=2, max_length=100)
    state: Optional[str] = ""
    occupation: Optional[str] = ""
    has_space: Optional[str] = "looking"
    investment_budget: Optional[str] = "₹2.5 Lakhs"
    source: Optional[str] = "manual"
    details: Optional[str] = ""
    assigned_to: Optional[str] = ""
    demo_session_scheduled: Optional[bool] = False
    scheduled_demo_at: Optional[str] = None
    demo_type: Optional[str] = "online_meet"
    demo_link: Optional[str] = ""
    demo_notes: Optional[str] = ""
    followup_scheduled: Optional[bool] = False
    next_followup_at: Optional[str] = None
    followup_notes: Optional[str] = ""


class FranchiseLeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    occupation: Optional[str] = None
    has_space: Optional[str] = None
    investment_budget: Optional[str] = None
    source: Optional[str] = None
    details: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    demo_session_scheduled: Optional[bool] = None
    scheduled_demo_at: Optional[str] = None
    demo_type: Optional[str] = None
    demo_link: Optional[str] = None
    demo_status: Optional[str] = None
    demo_notes: Optional[str] = None
    followup_scheduled: Optional[bool] = None
    next_followup_at: Optional[str] = None
    followup_notes: Optional[str] = None
    followup_status: Optional[str] = None


class AssignLeadRequest(BaseModel):
    assigned_to: str
    assignment_note: Optional[str] = ""


class BulkAssignRequest(BaseModel):
    lead_ids: List[str]
    assigned_to: str
    assignment_note: Optional[str] = ""


class ScheduleCallRequest(BaseModel):
    scheduled_call_at: str
    call_purpose: Optional[str] = "Franchise Presentation & Discovery"
    notes: Optional[str] = ""


class LogCallRequest(BaseModel):
    call_status: str  # completed, no_answer, rescheduled, cancelled
    call_notes: str
    duration_minutes: Optional[int] = 5
    next_action: Optional[str] = None  # None, schedule_demo, schedule_followup
    scheduled_at: Optional[str] = None


class ScheduleDemoRequest(BaseModel):
    scheduled_demo_at: str
    demo_type: Optional[str] = "online_meet"  # online_meet, in_person_center, presentation
    demo_link: Optional[str] = ""
    demo_notes: Optional[str] = ""


class LogDemoRequest(BaseModel):
    demo_status: str  # completed, no_show, rescheduled, cancelled
    demo_notes: str
    interest_level: Optional[str] = "medium"  # high, medium, low


class ScheduleFollowupRequest(BaseModel):
    next_followup_at: str
    followup_notes: str


class CompleteFollowupRequest(BaseModel):
    notes: str
    status: Optional[str] = "completed"


class AddCommentRequest(BaseModel):
    text: str


class UpdateStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = ""


# ── Endpoints ────────────────────────────────────────────────────────

@router.get("/leads")
async def list_franchise_leads(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    """List franchise CRM leads with status, assignee, and date range filters.
    Managers/Admins see all leads. Non-managers only see leads assigned to them.
    """
    _require_franchise_access(user)
    await _sync_growth_partners_franchise_leads()

    query: Dict[str, Any] = {}
    is_mgr = _is_manager(user)
    curr_uid = str(user.get("id") or user.get("_id") or "")

    # Non-managers are scoped to their assigned leads
    if not is_mgr:
        query["assigned_to"] = curr_uid
    elif assigned_to:
        if assigned_to == "unassigned":
            query["$or"] = [{"assigned_to": ""}, {"assigned_to": None}, {"assigned_to": {"$exists": False}}]
        else:
            query["assigned_to"] = assigned_to

    if status and status != "all":
        query["status"] = status

    if search:
        s = search.strip()
        query["$or"] = [
            {"name": {"$regex": s, "$options": "i"}},
            {"phone": {"$regex": s, "$options": "i"}},
            {"email": {"$regex": s, "$options": "i"}},
            {"city": {"$regex": s, "$options": "i"}},
        ]

    if date_from or date_to:
        date_q: Dict[str, Any] = {}
        if date_from:
            date_q["$gte"] = date_from
        if date_to:
            date_q["$lte"] = date_to + "T23:59:59"
        query["created_at"] = date_q

    total_count = await db.franchise_leads.count_documents(query)
    skip = (page - 1) * limit
    leads = await db.franchise_leads.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Compute quick stats
    stats_match = {} if is_mgr else {"assigned_to": curr_uid}
    stats_pipeline = [
        {"$match": stats_match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_counts_raw = await db.franchise_leads.aggregate(stats_pipeline).to_list(20)
    status_counts = {item["_id"]: item["count"] for item in status_counts_raw if item.get("_id")}

    return {
        "leads": leads,
        "total": total_count,
        "page": page,
        "limit": limit,
        "is_manager": is_mgr,
        "status_counts": status_counts,
    }


@router.post("/leads")
async def create_franchise_lead(
    payload: FranchiseLeadCreate,
    user: dict = Depends(get_current_user),
):
    """Add a new franchise lead manually."""
    _require_franchise_access(user)
    now_iso = datetime.now(timezone.utc).isoformat()
    lead_id = str(uuid.uuid4())

    # If assignee was chosen
    assigned_name = ""
    assigned_email = ""
    assigned_role = ""
    if payload.assigned_to:
        assignee = await db.team_users.find_one({"id": payload.assigned_to}, {"_id": 0, "name": 1, "email": 1, "role": 1})
        if assignee:
            assigned_name = assignee.get("name", "")
            assigned_email = assignee.get("email", "")
            assigned_role = assignee.get("role", "")

    demo_is_scheduled = bool(payload.demo_session_scheduled or payload.scheduled_demo_at)
    initial_status = "demo_scheduled" if demo_is_scheduled else "new"
    demo_status = "scheduled" if demo_is_scheduled else "none"
    scheduled_demo_at = payload.scheduled_demo_at if demo_is_scheduled else None
    demo_type = payload.demo_type or "online_meet"
    demo_link = payload.demo_link or ""
    demo_notes = payload.demo_notes or ""

    followup_is_scheduled = bool(payload.followup_scheduled or payload.next_followup_at)
    next_followup_at = payload.next_followup_at if followup_is_scheduled else None
    followup_notes = (payload.followup_notes or "").strip()
    followup_status = "scheduled" if followup_is_scheduled else "none"
    if initial_status == "new" and followup_is_scheduled:
        initial_status = "follow_up"

    doc = {
        "id": lead_id,
        "name": payload.name.strip(),
        "phone": payload.phone.strip(),
        "email": (payload.email or "").strip().lower(),
        "city": payload.city.strip(),
        "state": (payload.state or "").strip(),
        "occupation": (payload.occupation or "").strip(),
        "has_space": payload.has_space or "looking",
        "investment_budget": payload.investment_budget or "₹2.5 Lakhs",
        "source": payload.source or "manual",
        "details": (payload.details or "").strip(),
        "notes": "",
        "status": initial_status,
        "assigned_to": payload.assigned_to or "",
        "assigned_to_name": assigned_name,
        "assigned_to_email": assigned_email,
        "assigned_to_role": assigned_role,
        "assigned_by": str(user.get("id") or user.get("_id") or ""),
        "assigned_by_name": user.get("name") or user.get("email", "Admin"),
        "assigned_at": now_iso if payload.assigned_to else None,
        "call_status": "none",
        "scheduled_call_at": None,
        "call_notes": "",
        "calls_count": 0,
        "last_call_at": None,
        "demo_status": demo_status,
        "scheduled_demo_at": scheduled_demo_at,
        "demo_type": demo_type,
        "demo_link": demo_link,
        "demo_notes": demo_notes,
        "demos_count": 0,
        "last_demo_at": None,
        "followup_status": followup_status,
        "next_followup_at": next_followup_at,
        "followup_notes": followup_notes,
        "followups_count": 0,
        "comments": [{
            "id": str(uuid.uuid4()),
            "user_name": user.get("name") or user.get("email"),
            "text": f"Lead created via {payload.source or 'manual entry'}" + (f" (Demo scheduled on {scheduled_demo_at})" if demo_is_scheduled else "") + (f" (Follow-up scheduled on {next_followup_at})" if followup_is_scheduled else ""),
            "created_at": now_iso,
        }],
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    await db.franchise_leads.insert_one(doc)
    await _log_activity(
        lead_id=lead_id,
        lead_name=doc["name"],
        lead_phone=doc["phone"],
        user=user,
        action="lead_created",
        details={
            "source": doc["source"],
            "assigned_to": assigned_name,
            "demo_scheduled": demo_is_scheduled,
            "followup_scheduled": followup_is_scheduled,
        },
    )

    if demo_is_scheduled and scheduled_demo_at:
        await _log_activity(
            lead_id=lead_id,
            lead_name=doc["name"],
            lead_phone=doc["phone"],
            user=user,
            action="demo_scheduled",
            details={
                "scheduled_demo_at": scheduled_demo_at,
                "demo_type": demo_type,
                "notes": "Demo scheduled at lead creation",
            },
        )

    if followup_is_scheduled and next_followup_at:
        await _log_activity(
            lead_id=lead_id,
            lead_name=doc["name"],
            lead_phone=doc["phone"],
            user=user,
            action="followup_scheduled",
            details={
                "next_followup_at": next_followup_at,
                "notes": followup_notes or "Follow-up scheduled at lead creation",
            },
        )

    return {"ok": True, "lead": {k: v for k, v in doc.items() if k != "_id"}}


@router.get("/leads/{lead_id}")
async def get_franchise_lead(
    lead_id: str,
    user: dict = Depends(get_current_user),
):
    """Retrieve full details of a franchise lead along with its activity history."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    is_mgr = _is_manager(user)
    curr_uid = str(user.get("id") or user.get("_id") or "")
    if not is_mgr and lead.get("assigned_to") != curr_uid:
        raise HTTPException(status_code=403, detail="Access denied to this lead")

    # Fetch recent activities for this lead
    activities = await db.franchise_crm_activities.find(
        {"lead_id": lead_id},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)

    return {"lead": lead, "activities": activities}


@router.put("/leads/{lead_id}")
async def update_franchise_lead(
    lead_id: str,
    payload: FranchiseLeadUpdate,
    user: dict = Depends(get_current_user),
):
    """Update general lead details."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    is_mgr = _is_manager(user)
    curr_uid = str(user.get("id") or user.get("_id") or "")
    if not is_mgr and lead.get("assigned_to") != curr_uid:
        raise HTTPException(status_code=403, detail="Access denied to this lead")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}

    # Handle demo scheduling updates
    if "demo_session_scheduled" in updates:
        if updates["demo_session_scheduled"]:
            updates["demo_status"] = "scheduled"
            if not updates.get("status") and lead.get("status") in ("new", "contacted"):
                updates["status"] = "demo_scheduled"
        else:
            updates["demo_status"] = "none"
            updates["scheduled_demo_at"] = None
    elif updates.get("scheduled_demo_at"):
        updates["demo_status"] = "scheduled"
        if not updates.get("status") and lead.get("status") in ("new", "contacted"):
            updates["status"] = "demo_scheduled"

    # Handle follow-up updates
    if "followup_scheduled" in updates:
        if updates["followup_scheduled"]:
            updates["followup_status"] = "scheduled"
            if not updates.get("status") and lead.get("status") in ("new", "contacted"):
                updates["status"] = "follow_up"
        else:
            updates["followup_status"] = "none"
            updates["next_followup_at"] = None
    elif updates.get("next_followup_at"):
        updates["followup_status"] = "scheduled"
        if not updates.get("status") and lead.get("status") in ("new", "contacted"):
            updates["status"] = "follow_up"

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.franchise_leads.update_one({"id": lead_id}, {"$set": updates})
    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="lead_updated",
        details=updates,
    )
    return {"ok": True}


@router.post("/leads/{lead_id}/assign")
async def assign_franchise_lead(
    lead_id: str,
    payload: AssignLeadRequest,
    user: dict = Depends(get_current_user),
):
    """Manager/Admin assigns a franchise lead to a salesperson or telecaller."""
    _require_manager(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    assignee = await db.team_users.find_one({"id": payload.assigned_to}, {"_id": 0, "name": 1, "email": 1, "role": 1})
    if not assignee:
        raise HTTPException(status_code=400, detail="Assignee user not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    assignee_name = assignee.get("name") or assignee.get("email")
    assignee_email = assignee.get("email", "")
    assignee_role = assignee.get("role", "")
    manager_name = user.get("name") or user.get("email", "Manager")

    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": manager_name,
        "text": f"Assigned to {assignee_name} ({assignee_role}). {payload.assignment_note or ''}".strip(),
        "created_at": now_iso,
    }

    await db.franchise_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "assigned_to": payload.assigned_to,
                "assigned_to_name": assignee_name,
                "assigned_to_email": assignee_email,
                "assigned_to_role": assignee_role,
                "assigned_by": str(user.get("id") or user.get("_id") or ""),
                "assigned_by_name": manager_name,
                "assigned_at": now_iso,
                "updated_at": now_iso,
            },
            "$push": {"comments": comment_entry},
        }
    )

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="lead_assigned",
        details={
            "assigned_to": assignee_name,
            "assigned_to_id": payload.assigned_to,
            "note": payload.assignment_note,
        },
    )

    return {"ok": True, "assigned_to_name": assignee_name}


@router.post("/leads/bulk-assign")
async def bulk_assign_franchise_leads(
    payload: BulkAssignRequest,
    user: dict = Depends(get_current_user),
):
    """Manager/Admin bulk-assigns multiple leads to a salesperson or telecaller."""
    _require_manager(user)
    if not payload.lead_ids:
        raise HTTPException(status_code=400, detail="No lead IDs provided")

    assignee = await db.team_users.find_one({"id": payload.assigned_to}, {"_id": 0, "name": 1, "email": 1, "role": 1})
    if not assignee:
        raise HTTPException(status_code=400, detail="Assignee user not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    assignee_name = assignee.get("name") or assignee.get("email")
    assignee_email = assignee.get("email", "")
    assignee_role = assignee.get("role", "")
    manager_name = user.get("name") or user.get("email", "Manager")

    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": manager_name,
        "text": f"Bulk-assigned to {assignee_name} ({assignee_role}). {payload.assignment_note or ''}".strip(),
        "created_at": now_iso,
    }

    res = await db.franchise_leads.update_many(
        {"id": {"$in": payload.lead_ids}},
        {
            "$set": {
                "assigned_to": payload.assigned_to,
                "assigned_to_name": assignee_name,
                "assigned_to_email": assignee_email,
                "assigned_to_role": assignee_role,
                "assigned_by": str(user.get("id") or user.get("_id") or ""),
                "assigned_by_name": manager_name,
                "assigned_at": now_iso,
                "updated_at": now_iso,
            },
            "$push": {"comments": comment_entry},
        }
    )

    for lid in payload.lead_ids:
        await _log_activity(
            lead_id=lid,
            lead_name="Bulk assigned lead",
            lead_phone="",
            user=user,
            action="lead_assigned",
            details={
                "assigned_to": assignee_name,
                "assigned_to_id": payload.assigned_to,
                "note": payload.assignment_note,
            },
        )

    return {"ok": True, "count": res.modified_count, "assigned_to_name": assignee_name}


@router.post("/leads/{lead_id}/schedule-call")
async def schedule_franchise_call(
    lead_id: str,
    payload: ScheduleCallRequest,
    user: dict = Depends(get_current_user),
):
    """Schedule a phone call with the franchise lead."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = lead.get("status")
    if new_status in ("new", "contacted"):
        new_status = "call_scheduled"

    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": user.get("name") or user.get("email"),
        "text": f"Call scheduled for {payload.scheduled_call_at}. Purpose: {payload.call_purpose}. {payload.notes or ''}".strip(),
        "created_at": now_iso,
    }

    await db.franchise_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "call_status": "scheduled",
                "scheduled_call_at": payload.scheduled_call_at,
                "call_notes": payload.notes or payload.call_purpose,
                "status": new_status,
                "updated_at": now_iso,
            },
            "$push": {"comments": comment_entry},
        }
    )

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="call_scheduled",
        details={
            "scheduled_call_at": payload.scheduled_call_at,
            "purpose": payload.call_purpose,
            "notes": payload.notes,
        },
    )

    return {"ok": True, "scheduled_call_at": payload.scheduled_call_at, "status": new_status}


@router.post("/leads/{lead_id}/log-call")
async def log_franchise_call(
    lead_id: str,
    payload: LogCallRequest,
    user: dict = Depends(get_current_user),
):
    """Log the outcome of a phone call."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    status_update = lead.get("status")
    if payload.call_status == "completed":
        if status_update in ("new", "call_scheduled"):
            status_update = "contacted"
    elif payload.call_status == "no_answer":
        # Keep current or set to contacted
        pass

    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": user.get("name") or user.get("email"),
        "text": f"Call outcome: {payload.call_status.upper()} ({payload.duration_minutes}m). Notes: {payload.call_notes}",
        "created_at": now_iso,
    }

    updates: Dict[str, Any] = {
        "call_status": payload.call_status,
        "call_notes": payload.call_notes,
        "last_call_at": now_iso,
        "status": status_update,
        "updated_at": now_iso,
    }
    inc_ops: Dict[str, int] = {"calls_count": 1}

    # Handle automatic chaining (e.g. follow-up or demo scheduled after call)
    if payload.next_action == "schedule_demo" and payload.scheduled_at:
        updates["demo_status"] = "scheduled"
        updates["scheduled_demo_at"] = payload.scheduled_at
        updates["status"] = "demo_scheduled"
    elif payload.next_action == "schedule_followup" and payload.scheduled_at:
        updates["followup_status"] = "scheduled"
        updates["next_followup_at"] = payload.scheduled_at
        updates["status"] = "follow_up"

    await db.franchise_leads.update_one(
        {"id": lead_id},
        {
            "$set": updates,
            "$inc": inc_ops,
            "$push": {"comments": comment_entry},
        }
    )

    action_name = "call_completed" if payload.call_status == "completed" else "call_no_answer"
    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action=action_name,
        details={
            "call_status": payload.call_status,
            "call_notes": payload.call_notes,
            "duration_minutes": payload.duration_minutes,
            "next_action": payload.next_action,
        },
    )

    return {"ok": True, "status": status_update}


@router.post("/leads/{lead_id}/schedule-demo")
async def schedule_franchise_demo(
    lead_id: str,
    payload: ScheduleDemoRequest,
    user: dict = Depends(get_current_user),
):
    """Schedule a franchise presentation / demo."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": user.get("name") or user.get("email"),
        "text": f"Demo scheduled for {payload.scheduled_demo_at} ({payload.demo_type}). Link/Location: {payload.demo_link or 'N/A'}. {payload.demo_notes or ''}".strip(),
        "created_at": now_iso,
    }

    await db.franchise_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "demo_status": "scheduled",
                "scheduled_demo_at": payload.scheduled_demo_at,
                "demo_type": payload.demo_type,
                "demo_link": payload.demo_link or "",
                "demo_notes": payload.demo_notes or "",
                "status": "demo_scheduled",
                "updated_at": now_iso,
            },
            "$push": {"comments": comment_entry},
        }
    )

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="demo_scheduled",
        details={
            "scheduled_demo_at": payload.scheduled_demo_at,
            "demo_type": payload.demo_type,
            "demo_link": payload.demo_link,
            "notes": payload.demo_notes,
        },
    )

    return {"ok": True, "status": "demo_scheduled"}


@router.post("/leads/{lead_id}/log-demo")
async def log_franchise_demo(
    lead_id: str,
    payload: LogDemoRequest,
    user: dict = Depends(get_current_user),
):
    """Log the outcome and feedback of a franchise demo."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    status_update = "demo_completed" if payload.demo_status == "completed" else lead.get("status", "contacted")

    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": user.get("name") or user.get("email"),
        "text": f"Demo outcome: {payload.demo_status.upper()} (Interest: {payload.interest_level}). Notes: {payload.demo_notes}",
        "created_at": now_iso,
    }

    await db.franchise_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "demo_status": payload.demo_status,
                "demo_notes": payload.demo_notes,
                "last_demo_at": now_iso,
                "status": status_update,
                "updated_at": now_iso,
            },
            "$inc": {"demos_count": 1},
            "$push": {"comments": comment_entry},
        }
    )

    action_name = "demo_completed" if payload.demo_status == "completed" else "demo_no_show"
    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action=action_name,
        details={
            "demo_status": payload.demo_status,
            "demo_notes": payload.demo_notes,
            "interest_level": payload.interest_level,
        },
    )

    return {"ok": True, "status": status_update}


@router.post("/leads/{lead_id}/schedule-followup")
async def schedule_franchise_followup(
    lead_id: str,
    payload: ScheduleFollowupRequest,
    user: dict = Depends(get_current_user),
):
    """Schedule next follow-up with the lead."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": user.get("name") or user.get("email"),
        "text": f"Follow-up scheduled for {payload.next_followup_at}. Note: {payload.followup_notes}",
        "created_at": now_iso,
    }

    await db.franchise_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "followup_status": "scheduled",
                "next_followup_at": payload.next_followup_at,
                "followup_notes": payload.followup_notes,
                "status": "follow_up",
                "updated_at": now_iso,
            },
            "$push": {"comments": comment_entry},
        }
    )

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="followup_scheduled",
        details={
            "next_followup_at": payload.next_followup_at,
            "notes": payload.followup_notes,
        },
    )

    return {"ok": True, "status": "follow_up"}


@router.post("/leads/{lead_id}/complete-followup")
async def complete_franchise_followup(
    lead_id: str,
    payload: CompleteFollowupRequest,
    user: dict = Depends(get_current_user),
):
    """Mark a pending follow-up as completed."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": user.get("name") or user.get("email"),
        "text": f"Follow-up completed: {payload.notes}",
        "created_at": now_iso,
    }

    await db.franchise_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "followup_status": "completed",
                "next_followup_at": None,
                "updated_at": now_iso,
            },
            "$inc": {"followups_count": 1},
            "$push": {"comments": comment_entry},
        }
    )

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="followup_completed",
        details={"notes": payload.notes},
    )

    return {"ok": True}


@router.patch("/leads/{lead_id}/status")
async def update_franchise_lead_status(
    lead_id: str,
    payload: UpdateStatusRequest,
    user: dict = Depends(get_current_user),
):
    """Update overall lead status (e.g. converted, lost, contacted)."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": user.get("name") or user.get("email"),
        "text": f"Status updated to '{payload.status}'. {payload.notes or ''}".strip(),
        "created_at": now_iso,
    }

    await db.franchise_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "status": payload.status,
                "updated_at": now_iso,
            },
            "$push": {"comments": comment_entry},
        }
    )

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="status_changed",
        details={"old_status": lead.get("status"), "new_status": payload.status, "notes": payload.notes},
    )

    return {"ok": True, "status": payload.status}


@router.post("/leads/{lead_id}/comments")
async def add_franchise_lead_comment(
    lead_id: str,
    payload: AddCommentRequest,
    user: dict = Depends(get_current_user),
):
    """Add a note or comment to a lead."""
    _require_franchise_access(user)
    lead = await db.franchise_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Franchise lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    comment_entry = {
        "id": str(uuid.uuid4()),
        "user_name": user.get("name") or user.get("email"),
        "text": payload.text.strip(),
        "created_at": now_iso,
    }

    await db.franchise_leads.update_one(
        {"id": lead_id},
        {
            "$push": {"comments": comment_entry},
            "$set": {"updated_at": now_iso},
        }
    )

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="note_added",
        details={"comment": payload.text},
    )

    return {"ok": True, "comment": comment_entry}


@router.get("/assignees")
async def list_franchise_assignees(
    user: dict = Depends(get_current_user),
):
    """Returns list of eligible team users for lead assignment:
    Includes B2C Sales, B2B Sales, Business Development Executives,
    Telecallers, Relationship Managers, and Sales Managers.
    """
    _require_franchise_access(user)

    # Fetch active roles to map role names
    roles_list = await db.roles.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    role_map = {r["id"]: r.get("name") for r in roles_list if r.get("id")}

    team_users = await db.team_users.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "role_id": 1, "user_type": 1}
    ).sort("name", 1).to_list(150)

    # Query counts of currently assigned franchise leads per user
    pipeline = [
        {"$match": {"assigned_to": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$assigned_to", "count": {"$sum": 1}}},
    ]
    counts_raw = await db.franchise_leads.aggregate(pipeline).to_list(200)
    assigned_counts = {item["_id"]: item["count"] for item in counts_raw if item.get("_id")}

    formatted = []
    for u in team_users:
        uid = u.get("id")
        role_title = role_map.get(u.get("role_id") or "") or u.get("role") or "Team Member"
        # Determine category badge
        category = "Other"
        role_lower = role_title.lower()
        if "b2c" in role_lower:
            category = "B2C Sales"
        elif "business development" in role_lower or "bde" in role_lower:
            category = "BDE"
        elif "relationship" in role_lower:
            category = "Relationship Manager"
        elif "telecall" in role_lower:
            category = "Telecaller"
        elif "growth partner" in role_lower:
            category = "Growth Partner"
        elif "sales" in role_lower:
            category = "Sales"
        elif "manager" in role_lower or u.get("role") in ("admin", "super_admin"):
            category = "Management"

        formatted.append({
            "id": uid,
            "name": u.get("name") or u.get("email"),
            "email": u.get("email"),
            "role": role_title,
            "category": category,
            "assigned_leads_count": assigned_counts.get(uid, 0),
        })

    # Sort so B2C, BDE, Telecaller, Sales appear first
    priority_order = {"B2C Sales": 0, "BDE": 1, "Telecaller": 2, "Sales": 3, "Relationship Manager": 4, "Growth Partner": 5, "Management": 6, "Other": 7}
    formatted.sort(key=lambda x: (priority_order.get(x["category"], 9), x["name"]))

    return {"assignees": formatted}


@router.get("/tracksheet")
async def get_franchise_tracksheet(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Admin & GP Manager Tracksheet Report.
    Returns per-person activity metrics (calls, demos, follow-ups, conversions)
    and detailed activity stream for persons working on Franchise CRM.
    """
    _require_manager(user)

    now = datetime.now(timezone.utc)
    if not date_from:
        # Default to first day of current month
        date_from = now.date().replace(day=1).isoformat()
    if not date_to:
        date_to = now.date().isoformat()

    # Activity query by day / date range
    activity_query: Dict[str, Any] = {
        "day": {"$gte": date_from, "$lte": date_to}
    }
    if user_id and user_id != "all":
        activity_query["user_id"] = user_id

    activities = await db.franchise_crm_activities.find(
        activity_query,
        {"_id": 0}
    ).sort("timestamp", -1).to_list(1000)

    # Lead metrics query: leads assigned in this timeframe or worked on
    leads_query: Dict[str, Any] = {}
    if user_id and user_id != "all":
        leads_query["assigned_to"] = user_id

    leads = await db.franchise_leads.find(leads_query, {"_id": 0}).to_list(1000)

    # Also map user names and roles
    team_users = await db.team_users.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "role_id": 1}).to_list(200)
    roles_list = await db.roles.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    role_map = {r["id"]: r.get("name") for r in roles_list if r.get("id")}
    user_meta = {}
    for u in team_users:
        uid = u.get("id")
        user_meta[uid] = {
            "name": u.get("name") or u.get("email"),
            "email": u.get("email"),
            "role": role_map.get(u.get("role_id") or "") or u.get("role") or "Executive",
        }

    # Aggregate performance by user
    person_metrics: Dict[str, Dict[str, Any]] = {}

    def _ensure_person(uid: str, fallback_name: str = "Unknown", fallback_email: str = ""):
        if uid not in person_metrics:
            meta = user_meta.get(uid, {})
            person_metrics[uid] = {
                "user_id": uid,
                "name": meta.get("name") or fallback_name,
                "email": meta.get("email") or fallback_email,
                "role": meta.get("role") or "Salesperson",
                "assigned_leads": 0,
                "calls_scheduled": 0,
                "calls_completed": 0,
                "calls_no_answer": 0,
                "demos_scheduled": 0,
                "demos_completed": 0,
                "followups_done": 0,
                "conversions": 0,
                "total_activities": 0,
            }

    # 1. Count assigned leads and conversions from leads collection
    for l in leads:
        aid = l.get("assigned_to")
        if aid:
            _ensure_person(aid, l.get("assigned_to_name", "Unknown"), l.get("assigned_to_email", ""))
            person_metrics[aid]["assigned_leads"] += 1
            if l.get("status") == "converted":
                person_metrics[aid]["conversions"] += 1

    # 2. Count actions from activity logs
    for act in activities:
        uid = act.get("user_id")
        if not uid:
            continue
        _ensure_person(uid, act.get("user_name", "Unknown"), act.get("user_email", ""))
        p = person_metrics[uid]
        p["total_activities"] += 1
        action = act.get("action")
        if action == "call_scheduled":
            p["calls_scheduled"] += 1
        elif action == "call_completed":
            p["calls_completed"] += 1
        elif action == "call_no_answer":
            p["calls_no_answer"] += 1
        elif action == "demo_scheduled":
            p["demos_scheduled"] += 1
        elif action == "demo_completed":
            p["demos_completed"] += 1
        elif action in ("followup_completed", "followup_scheduled"):
            p["followups_done"] += 1
        elif action == "status_changed" and act.get("details", {}).get("new_status") == "converted":
            p["conversions"] += 1

    # Calculate conversion rate and sort by total activities / assigned leads
    track_rows = list(person_metrics.values())
    for r in track_rows:
        if r["assigned_leads"] > 0:
            r["conversion_rate"] = round((r["conversions"] / r["assigned_leads"]) * 100, 1)
        else:
            r["conversion_rate"] = 0.0

    track_rows.sort(key=lambda x: (x["conversions"], x["demos_completed"], x["calls_completed"], x["assigned_leads"]), reverse=True)

    # Overall Summary
    total_calls_completed = sum(r["calls_completed"] for r in track_rows)
    total_demos_completed = sum(r["demos_completed"] for r in track_rows)
    total_followups = sum(r["followups_done"] for r in track_rows)
    total_conversions = sum(r["conversions"] for r in track_rows)
    total_leads_assigned = sum(r["assigned_leads"] for r in track_rows)

    summary = {
        "date_from": date_from,
        "date_to": date_to,
        "total_team_members": len(track_rows),
        "total_leads_assigned": total_leads_assigned,
        "total_calls_completed": total_calls_completed,
        "total_demos_completed": total_demos_completed,
        "total_followups": total_followups,
        "total_conversions": total_conversions,
        "overall_conversion_rate": round((total_conversions / total_leads_assigned * 100), 1) if total_leads_assigned > 0 else 0.0,
    }

    return {
        "summary": summary,
        "executives": track_rows,
        "recent_activities": activities[:100],
    }


@router.delete("/leads/{lead_id}")
async def delete_franchise_lead(
    lead_id: str,
    user: dict = Depends(get_current_user),
):
    """Admin and GP Managers can delete a franchise lead."""
    if not _is_manager(user):
        raise HTTPException(status_code=403, detail="Manager access required to delete lead")

    res = await db.franchise_leads.delete_one({"id": lead_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.franchise_crm_activities.delete_many({"lead_id": lead_id})
    return {"ok": True}
