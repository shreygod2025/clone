"""B2B CRM Module.

Allows B2B Sales, BDEs, Telecallers, and Admins to manage B2B institutional leads (Schools, Colleges, Educational Partners),
assign them to salespersons / telecallers, schedule calls, demos, and follow-ups, import B2B spreadsheets, and view performance reports.
Synchronized with telecalling_contacts.
"""
from __future__ import annotations

import io
import logging
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from openpyxl import Workbook, load_workbook

from .shared import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/b2b-crm", tags=["B2B CRM"])

B2B_XLSX_COLUMNS: List[Tuple[str, List[str]]] = [
    ("school_name", ["school_name", "school", "institution", "organization", "company", "college", "school name"]),
    ("name",        ["name", "contact_person", "contact", "person", "full_name", "principal", "director"]),
    ("phone",       ["phone", "mobile", "contact_no", "contact_number", "phone_number", "cell"]),
    ("alt_phone",   ["alt_phone", "alternate_phone", "alt_mobile", "landline", "phone2"]),
    ("email",       ["email", "mail", "e_mail", "email_id", "email_address"]),
    ("role",        ["role", "designation", "title", "position"]),
    ("city",        ["city", "location", "town", "district"]),
    ("state",       ["state", "province", "region"]),
    ("board",       ["board", "affiliation", "curriculum"]),
    ("deal_size",   ["deal_size", "student_count", "students", "strength", "budget", "value"]),
    ("source",      ["source", "lead_source", "campaign"]),
    ("notes",       ["notes", "remarks", "comment", "comments", "description"]),
]


# ── Role & Permission Helpers ──────────────────────────────────────────

def _is_admin(user: dict) -> bool:
    if not user:
        return False
    return (user.get("role") or "").lower() in ("admin", "super_admin")


def _is_manager(user: dict) -> bool:
    if not user:
        return False
    role = (user.get("role") or "").lower()
    return _is_admin(user) or bool(user.get("is_manager")) or "manager" in role or "gp_manager" in role


def _require_b2b_access(user: dict) -> None:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    # All authenticated team members, admins, and managers can access B2B CRM
    return


def _require_manager(user: dict) -> None:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not _is_manager(user):
        raise HTTPException(
            status_code=403,
            detail="Permission denied: only Managers and Admins can perform this action"
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
    await db.b2b_crm_activities.insert_one(activity_doc)


# ── Telecalling Bi-Directional Synchronization ──────────────────────────

def _norm_phone(p: str) -> str:
    return re.sub(r"\D", "", str(p or ""))[-10:]


async def _sync_to_telecalling(lead_doc: dict) -> None:
    """Sync a B2B lead to telecalling_contacts."""
    try:
        raw_phone = str(lead_doc.get("phone") or "").strip()
        norm = _norm_phone(raw_phone)
        if not norm or len(norm) < 7:
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        update_fields: Dict[str, Any] = {
            "name":             lead_doc.get("name") or "",
            "phone":            raw_phone,
            "alt_phone":        lead_doc.get("alt_phone") or "",
            "email":            lead_doc.get("email") or "",
            "school_name":      lead_doc.get("school_name") or lead_doc.get("organization_name") or "",
            "city":             lead_doc.get("city") or "",
            "board":            lead_doc.get("board") or "",
            "role":             lead_doc.get("role") or "",
            "assigned_to":      lead_doc.get("assigned_to") or None,
            "assigned_to_name": lead_doc.get("assigned_to_name") or None,
            "call_type":         "b2b",
            "notes":            lead_doc.get("notes") or "",
            "updated_at":        now_iso,
        }

        if lead_doc.get("scheduled_demo_at"):
            update_fields["meeting_at"] = lead_doc.get("scheduled_demo_at")
            demo_t = lead_doc.get("demo_type") or ""
            update_fields["meeting_mode"] = "online" if demo_t in ("online", "online_meet") else "offline"
        if lead_doc.get("next_followup_at"):
            update_fields["followup_at"] = lead_doc.get("next_followup_at")
        if lead_doc.get("call_status") == "completed":
            update_fields["call_picked"] = "yes"
        elif lead_doc.get("call_status") == "no_answer":
            update_fields["call_picked"] = "no"

        existing = await db.telecalling_contacts.find_one({
            "$or": [
                {"phone": {"$regex": norm + "$"}},
                {"id": lead_doc.get("id")},
            ]
        })

        if existing:
            await db.telecalling_contacts.update_one(
                {"_id": existing["_id"]},
                {"$set": update_fields}
            )
        else:
            new_contact = {
                "id":                  lead_doc.get("id") or str(uuid.uuid4()),
                "source":              lead_doc.get("source") or "B2B CRM",
                "status":              lead_doc.get("status") or "new",
                "call_picked":          None,
                "lead_interested":      None,
                "products_interested":  [],
                "batch_name":          "B2B CRM Leads",
                "created_at":          lead_doc.get("created_at") or now_iso,
                **update_fields,
            }
            await db.telecalling_contacts.insert_one(new_contact)
    except Exception as exc:
        logger.warning("Error syncing B2B lead to telecalling: %s", exc)


async def _sync_initial_b2b_leads() -> None:
    """Sync telecalling contacts with call_type='b2b' into b2b_leads if b2b_leads is empty."""
    try:
        count = await db.b2b_leads.count_documents({})
        if count > 0:
            return

        contacts = await db.telecalling_contacts.find({"call_type": "b2b"}).to_list(1500)
        docs = []
        now_iso = datetime.now(timezone.utc).isoformat()
        for c in contacts:
            name_lower = (c.get("name") or "").strip().lower()
            if any(t in name_lower for t in ["tester", "dummy", "qwerty", "test contact"]):
                continue
            raw_phone = str(c.get("phone") or "")
            if raw_phone in ["9876543214", "8645177177", "1234567890", "+910987654321"]:
                continue
            lead_doc = {
                "id":                     c.get("id") or str(uuid.uuid4()),
                "school_name":            c.get("school_name") or "",
                "organization_name":      c.get("school_name") or "",
                "name":                   c.get("name") or "B2B Lead",
                "phone":                  c.get("phone") or "",
                "alt_phone":              c.get("alt_phone") or "",
                "email":                  c.get("email") or "",
                "city":                   c.get("city") or "",
                "state":                  "",
                "role":                   c.get("role") or "",
                "board":                  c.get("board") or "",
                "deal_size":              "",
                "source":                 c.get("source") or "telecalling_import",
                "notes":                  c.get("notes") or "",
                "status":                 c.get("status") or "new",
                "assigned_to":            c.get("assigned_to") or "",
                "assigned_to_name":       c.get("assigned_to_name") or "",
                "assigned_to_email":      "",
                "assigned_to_role":       "",
                "assigned_by":            "",
                "assigned_by_name":       "",
                "assigned_at":            c.get("created_at") or now_iso,
                "call_status":            "completed" if c.get("call_picked") == "yes" else ("no_answer" if c.get("call_picked") == "no" else "none"),
                "scheduled_call_at":      None,
                "call_notes":             "",
                "calls_count":            1 if c.get("call_picked") else 0,
                "last_call_at":           None,
                "demo_status":            "completed" if c.get("status") == "demo_completed" else ("scheduled" if c.get("meeting_at") else "none"),
                "scheduled_demo_at":      c.get("meeting_at"),
                "demo_type":              "online_meet",
                "demo_link":              "",
                "demo_notes":             "",
                "demos_count":            1 if c.get("meeting_at") else 0,
                "last_demo_at":           None,
                "followup_status":        "scheduled" if c.get("followup_at") else "none",
                "next_followup_at":       c.get("followup_at"),
                "followup_notes":         "",
                "followups_count":        1 if c.get("followup_at") else 0,
                "comments":               [],
                "created_at":             c.get("created_at") or now_iso,
                "updated_at":             c.get("updated_at") or now_iso,
            }
            docs.append(lead_doc)
        if docs:
            await db.b2b_leads.insert_many(docs)
            logger.info("Seeded %d leads into b2b_leads from telecalling_contacts", len(docs))
    except Exception as exc:
        logger.warning("Error syncing initial b2b leads: %s", exc)


# ── Request Models ──────────────────────────────────────────────────────

class B2BLeadCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=10, max_length=15)
    school_name: Optional[str] = ""
    organization_name: Optional[str] = ""
    email: Optional[str] = ""
    city: str = Field(..., min_length=2, max_length=100)
    state: Optional[str] = ""
    role: Optional[str] = ""
    board: Optional[str] = ""
    deal_size: Optional[str] = ""
    proposal_amount: Optional[str] = None
    source: Optional[str] = "manual"
    notes: Optional[str] = ""
    assigned_to: Optional[str] = ""
    demo_session_scheduled: Optional[bool] = False
    scheduled_demo_at: Optional[str] = None
    demo_type: Optional[str] = "online_meet"
    demo_link: Optional[str] = ""
    demo_notes: Optional[str] = ""
    followup_scheduled: Optional[bool] = False
    next_followup_at: Optional[str] = None
    followup_notes: Optional[str] = ""


class B2BLeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    school_name: Optional[str] = None
    organization_name: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    role: Optional[str] = None
    board: Optional[str] = None
    deal_size: Optional[str] = None
    proposal_amount: Optional[str] = None
    source: Optional[str] = None
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
    call_purpose: Optional[str] = "B2B School Presentation & Discussion"
    notes: Optional[str] = ""


class LogCallRequest(BaseModel):
    call_status: str  # completed, no_answer, rescheduled, cancelled
    call_notes: str
    duration_minutes: Optional[int] = 5
    next_action: Optional[str] = None  # None, schedule_demo, schedule_followup
    scheduled_at: Optional[str] = None


class ScheduleDemoRequest(BaseModel):
    scheduled_demo_at: str
    demo_type: Optional[str] = "online_meet"  # online_meet, in_person_school, presentation
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


class UpdateStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = ""
    lost_reason: Optional[str] = None


class RaiseTicketRequest(BaseModel):
    subject: str
    description: str
    priority: Optional[str] = "medium"
    related_to: Optional[str] = "b2b_crm"


class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


# ── Sample Excel Template ───────────────────────────────────────────────

@router.get("/sample-template.xlsx")
async def download_b2b_sample_template(user: dict = Depends(get_current_user)):
    _require_b2b_access(user)
    wb = Workbook()
    ws = wb.active
    ws.title = "B2B Leads"
    headers = [k for k, _ in B2B_XLSX_COLUMNS]
    ws.append(headers)
    ws.append([
        "Delhi Public School, R.K. Puram", "Dr. Rajesh Sharma", "9876543210", "011-26171234",
        "principal@dpsrkp.net", "Principal", "New Delhi", "Delhi", "CBSE", "1500 students",
        "School Outreach 2026", "Interested in AI & Robotics Lab setup"
    ])
    ws.append([
        "St. Xavier's High School", "Father Thomas Kurian", "9123456789", "",
        "info@stxaviers.edu", "Director", "Mumbai", "Maharashtra", "ICSE", "2000 students",
        "Inbound Inquiry", "Requested proposal for Coding curriculum"
    ])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="b2b-leads-template.xlsx"'},
    )


# ── Bulk Import Excel ───────────────────────────────────────────────────

@router.post("/import-excel")
async def import_b2b_excel(
    file:          UploadFile = File(...),
    assign_mode:   str = Form("unassigned"),   # 'unassigned' | 'single' | 'auto'
    assigned_to:   Optional[str] = Form(None),
    auto_pool:     str = Form(""),             # comma-separated user_ids
    batch_name:    Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    contents = await file.read()
    try:
        wb = load_workbook(io.BytesIO(contents), read_only=True, data_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read spreadsheet: {e}")

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="Spreadsheet is empty")

    headers_raw = [str(h or "").strip() for h in rows[0]]
    headers = [h.lower() for h in headers_raw]

    def col_idx(canonical_key: str) -> Optional[int]:
        aliases = dict(B2B_XLSX_COLUMNS).get(canonical_key, [])
        for al in aliases:
            if al in headers:
                return headers.index(al)
        return None

    idx = {k: col_idx(k) for k, _ in B2B_XLSX_COLUMNS}
    if idx["phone"] is None:
        raise HTTPException(status_code=400, detail="Missing required 'phone' column in spreadsheet")

    # Build assignee pool
    pool_ids = [p.strip() for p in (auto_pool or "").split(",") if p.strip()]
    pool_users = []
    if assign_mode == "auto" and pool_ids:
        pool_users = await db.team_users.find(
            {"id": {"$in": pool_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
        ).to_list(200)

    single_user = None
    if assign_mode == "single" and assigned_to:
        single_user = await db.team_users.find_one({"id": assigned_to}, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1})

    default_batch_name = (batch_name or "").strip() or (file.filename or "").rsplit(".", 1)[0].strip() or "B2B Excel Import"

    # Duplicate check on phone
    existing_phones = set()
    raw_existing = await db.b2b_leads.distinct("phone")
    for p in raw_existing:
        norm = _norm_phone(p)
        if norm:
            existing_phones.add(norm)

    seen_now: set[str] = set()
    inserted = 0
    duplicates = 0
    skipped = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    leads_to_insert = []

    for r in rows[1:]:
        if not r:
            skipped += 1
            continue
        raw_phone = str(r[idx["phone"]] or "").strip()
        norm = _norm_phone(raw_phone)
        if not norm or len(norm) < 7:
            skipped += 1
            continue
        if norm in existing_phones or norm in seen_now:
            duplicates += 1
            continue
        seen_now.add(norm)

        def _val(k: str) -> str:
            i = idx.get(k)
            if i is None or i >= len(r):
                return ""
            return str(r[i] or "").strip()

        assignee = None
        if assign_mode == "single" and single_user:
            assignee = single_user
        elif assign_mode == "auto" and pool_users:
            assignee = pool_users[inserted % len(pool_users)]

        school_org = _val("school_name")
        contact_name = _val("name") or school_org or f"Lead {norm[-4:]}"

        lead_id = str(uuid.uuid4())
        doc = {
            "id":                     lead_id,
            "school_name":            school_org,
            "organization_name":      school_org,
            "name":                   contact_name,
            "phone":                  raw_phone,
            "alt_phone":              _val("alt_phone"),
            "email":                  _val("email"),
            "city":                   _val("city") or "India",
            "state":                  _val("state"),
            "role":                   _val("role"),
            "board":                  _val("board"),
            "deal_size":              _val("deal_size"),
            "source":                 _val("source") or default_batch_name,
            "notes":                  _val("notes"),
            "status":                 "new",
            "assigned_to":            assignee["id"] if assignee else "",
            "assigned_to_name":       assignee.get("name") or assignee.get("email") if assignee else "",
            "assigned_to_email":      assignee.get("email") or "" if assignee else "",
            "assigned_to_role":       assignee.get("role") or "" if assignee else "",
            "assigned_by":            str(user.get("id") or ""),
            "assigned_by_name":       user.get("name") or user.get("email") or "Admin",
            "assigned_at":            now_iso if assignee else None,
            "call_status":            "none",
            "scheduled_call_at":      None,
            "call_notes":             "",
            "calls_count":            0,
            "last_call_at":           None,
            "demo_status":            "none",
            "scheduled_demo_at":      None,
            "demo_type":              "online_meet",
            "demo_link":              "",
            "demo_notes":             "",
            "demos_count":            0,
            "last_demo_at":           None,
            "followup_status":        "none",
            "next_followup_at":       None,
            "followup_notes":         "",
            "followups_count":        0,
            "comments":               [],
            "batch_name":             default_batch_name,
            "created_at":             now_iso,
            "updated_at":             now_iso,
        }
        leads_to_insert.append(doc)
        inserted += 1

    if leads_to_insert:
        await db.b2b_leads.insert_many(leads_to_insert)
        # Sync each to telecalling_contacts
        for ld in leads_to_insert:
            await _sync_to_telecalling(ld)

    return {
        "ok":         True,
        "inserted":   inserted,
        "duplicates": duplicates,
        "skipped":    skipped,
        "batch_name": default_batch_name,
    }


# ── Leads List & Filter ─────────────────────────────────────────────────

@router.get("/leads")
async def list_b2b_leads(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    await _sync_initial_b2b_leads()

    query: Dict[str, Any] = {}
    is_mgr = _is_manager(user)
    curr_uid = str(user.get("id") or user.get("_id") or "")

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
            {"name":              {"$regex": s, "$options": "i"}},
            {"school_name":       {"$regex": s, "$options": "i"}},
            {"organization_name": {"$regex": s, "$options": "i"}},
            {"phone":             {"$regex": s, "$options": "i"}},
            {"email":             {"$regex": s, "$options": "i"}},
            {"city":              {"$regex": s, "$options": "i"}},
            {"role":              {"$regex": s, "$options": "i"}},
        ]

    if date_from or date_to:
        date_q: Dict[str, Any] = {}
        if date_from:
            date_q["$gte"] = date_from
        if date_to:
            date_q["$lte"] = date_to + "T23:59:59"
        query["created_at"] = date_q

    total_leads = await db.b2b_leads.count_documents(query)

    # Status counts aggregation
    base_scope: Dict[str, Any] = {}
    if not is_mgr:
        base_scope["assigned_to"] = curr_uid
    pipeline = [
        {"$match": base_scope},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    counts_raw = await db.b2b_leads.aggregate(pipeline).to_list(50)
    status_counts = {item["_id"]: item["count"] for item in counts_raw if item.get("_id")}

    skip = (max(1, page) - 1) * limit
    cursor = db.b2b_leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    leads = await cursor.to_list(limit)

    return {
        "leads": leads,
        "total": total_leads,
        "page": page,
        "limit": limit,
        "status_counts": status_counts,
    }


# ── Create Single B2B Lead ──────────────────────────────────────────────

@router.post("/leads")
async def create_b2b_lead(
    payload: B2BLeadCreate,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    norm = _norm_phone(payload.phone)
    if not norm or len(norm) < 7:
        raise HTTPException(status_code=400, detail="Valid 10-digit phone number is required")

    existing = await db.b2b_leads.find_one({"phone": {"$regex": norm + "$"}})
    if existing:
        raise HTTPException(status_code=400, detail=f"A B2B lead with phone {payload.phone} already exists")

    now_iso = datetime.now(timezone.utc).isoformat()
    assignee_info = {}
    if payload.assigned_to:
        target = await db.team_users.find_one({"id": payload.assigned_to}, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1})
        if target:
            assignee_info = {
                "assigned_to":       target["id"],
                "assigned_to_name":  target.get("name") or target.get("email"),
                "assigned_to_email": target.get("email") or "",
                "assigned_to_role":  target.get("role") or "",
                "assigned_by":       str(user.get("id") or ""),
                "assigned_by_name":  user.get("name") or user.get("email") or "Admin",
                "assigned_at":       now_iso,
            }

    school_org = (payload.school_name or payload.organization_name or "").strip()
    lead_id = str(uuid.uuid4())
    lead_doc = {
        "id":                     lead_id,
        "school_name":            school_org,
        "organization_name":      school_org,
        "name":                   payload.name.strip(),
        "phone":                  payload.phone.strip(),
        "email":                  (payload.email or "").strip().lower(),
        "city":                   payload.city.strip(),
        "state":                  (payload.state or "").strip(),
        "role":                   (payload.role or "").strip(),
        "board":                  (payload.board or "").strip(),
        "deal_size":              (payload.deal_size or "").strip(),
        "proposal_amount":        payload.proposal_amount or payload.deal_size or "",
        "source":                 (payload.source or "manual").strip(),
        "notes":                  (payload.notes or "").strip(),
        "status":                 "demo_scheduled" if payload.demo_session_scheduled and payload.scheduled_demo_at else "new",
        "assigned_to":            assignee_info.get("assigned_to", ""),
        "assigned_to_name":       assignee_info.get("assigned_to_name", ""),
        "assigned_to_email":      assignee_info.get("assigned_to_email", ""),
        "assigned_to_role":       assignee_info.get("assigned_to_role", ""),
        "assigned_by":            assignee_info.get("assigned_by", ""),
        "assigned_by_name":       assignee_info.get("assigned_by_name", ""),
        "assigned_at":            assignee_info.get("assigned_at"),
        "call_status":            "none",
        "scheduled_call_at":      None,
        "call_notes":             "",
        "calls_count":            0,
        "last_call_at":           None,
        "demo_status":            "scheduled" if payload.demo_session_scheduled and payload.scheduled_demo_at else "none",
        "scheduled_demo_at":      payload.scheduled_demo_at if payload.demo_session_scheduled else None,
        "demo_type":              payload.demo_type or "online_meet",
        "demo_link":              payload.demo_link or "",
        "demo_notes":             payload.demo_notes or "",
        "demos_count":            1 if payload.demo_session_scheduled and payload.scheduled_demo_at else 0,
        "last_demo_at":           None,
        "followup_status":        "scheduled" if payload.followup_scheduled and payload.next_followup_at else "none",
        "next_followup_at":       payload.next_followup_at if payload.followup_scheduled else None,
        "followup_notes":         payload.followup_notes or "",
        "followups_count":        1 if payload.followup_scheduled and payload.next_followup_at else 0,
        "comments":               [],
        "batch_name":             "Direct B2B Entry",
        "created_at":             now_iso,
        "updated_at":             now_iso,
    }

    await db.b2b_leads.insert_one(lead_doc)
    await _sync_to_telecalling(lead_doc)

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead_doc["name"],
        lead_phone=lead_doc["phone"],
        user=user,
        action="lead_created",
        details={"source": lead_doc["source"], "school_name": school_org},
    )

    lead_doc.pop("_id", None)
    return {"ok": True, "lead": lead_doc}


# ── Single Lead Details & Update ────────────────────────────────────────

@router.get("/leads/{lead_id}")
async def get_b2b_lead(
    lead_id: str,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    is_mgr = _is_manager(user)
    curr_uid = str(user.get("id") or user.get("_id") or "")
    if not is_mgr and lead.get("assigned_to") != curr_uid:
        raise HTTPException(status_code=403, detail="Not authorized to view this lead")

    activities = await db.b2b_crm_activities.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(100)

    return {"lead": lead, "activities": activities}


@router.put("/leads/{lead_id}")
async def update_b2b_lead(
    lead_id: str,
    payload: B2BLeadUpdate,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    is_mgr = _is_manager(user)
    curr_uid = str(user.get("id") or user.get("_id") or "")
    if not is_mgr and lead.get("assigned_to") != curr_uid:
        raise HTTPException(status_code=403, detail="Not authorized to edit this lead")

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates.get("school_name") and not updates.get("organization_name"):
        updates["organization_name"] = updates["school_name"]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.b2b_leads.update_one({"id": lead_id}, {"$set": updates})
    updated = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    await _sync_to_telecalling(updated)

    await _log_activity(
        lead_id=lead_id,
        lead_name=updated.get("name", ""),
        lead_phone=updated.get("phone", ""),
        user=user,
        action="lead_updated",
        details=updates,
    )

    return {"ok": True, "lead": updated}


@router.delete("/leads/{lead_id}")
async def delete_b2b_lead(
    lead_id: str,
    user: dict = Depends(get_current_user),
):
    _require_manager(user)
    res = await db.b2b_leads.delete_one({"id": lead_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.b2b_crm_activities.delete_many({"lead_id": lead_id})
    return {"ok": True, "deleted": True}


# ── Assignment & Bulk Assignment ─────────────────────────────────────────

@router.post("/leads/{lead_id}/assign")
async def assign_b2b_lead(
    lead_id: str,
    payload: AssignLeadRequest,
    user: dict = Depends(get_current_user),
):
    _require_manager(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    target = await db.team_users.find_one({"id": payload.assigned_to}, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1})
    if not target:
        raise HTTPException(status_code=404, detail="Assignee user not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    assignee_data = {
        "assigned_to":       target["id"],
        "assigned_to_name":  target.get("name") or target.get("email"),
        "assigned_to_email": target.get("email") or "",
        "assigned_to_role":  target.get("role") or "",
        "assigned_by":       str(user.get("id") or ""),
        "assigned_by_name":  user.get("name") or user.get("email") or "Admin",
        "assigned_at":       now_iso,
        "updated_at":        now_iso,
    }
    await db.b2b_leads.update_one({"id": lead_id}, {"$set": assignee_data})
    updated = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    await _sync_to_telecalling(updated)

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="lead_assigned",
        details={
            "assigned_to": target["id"],
            "assigned_to_name": target.get("name") or target.get("email"),
            "note": payload.assignment_note,
        },
    )

    return {"ok": True, "lead": updated}


@router.post("/leads/bulk-assign")
async def bulk_assign_b2b_leads(
    payload: BulkAssignRequest,
    user: dict = Depends(get_current_user),
):
    _require_manager(user)
    if not payload.lead_ids:
        raise HTTPException(status_code=400, detail="No lead IDs provided")

    target = await db.team_users.find_one({"id": payload.assigned_to}, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1})
    if not target:
        raise HTTPException(status_code=404, detail="Assignee user not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    assignee_data = {
        "assigned_to":       target["id"],
        "assigned_to_name":  target.get("name") or target.get("email"),
        "assigned_to_email": target.get("email") or "",
        "assigned_to_role":  target.get("role") or "",
        "assigned_by":       str(user.get("id") or ""),
        "assigned_by_name":  user.get("name") or user.get("email") or "Admin",
        "assigned_at":       now_iso,
        "updated_at":        now_iso,
    }

    res = await db.b2b_leads.update_many(
        {"id": {"$in": payload.lead_ids}},
        {"$set": assignee_data}
    )

    # Sync affected leads to telecalling_contacts
    updated_leads = await db.b2b_leads.find({"id": {"$in": payload.lead_ids}}, {"_id": 0}).to_list(len(payload.lead_ids))
    for ld in updated_leads:
        await _sync_to_telecalling(ld)

    for ld in updated_leads:
        await _log_activity(
            lead_id=ld["id"],
            lead_name=ld.get("name", ""),
            lead_phone=ld.get("phone", ""),
            user=user,
            action="lead_assigned",
            details={
                "assigned_to": target["id"],
                "assigned_to_name": target.get("name") or target.get("email"),
                "note": payload.assignment_note,
                "bulk": True,
            },
        )

    return {"ok": True, "assigned_count": res.modified_count, "assigned_to_name": target.get("name")}


# ── Calls, Demos, Follow-ups ────────────────────────────────────────────

@router.post("/leads/{lead_id}/schedule-call")
async def schedule_b2b_call(
    lead_id: str,
    payload: ScheduleCallRequest,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    up = {
        "status":            "call_scheduled",
        "call_status":       "scheduled",
        "scheduled_call_at": payload.scheduled_call_at,
        "call_notes":        payload.notes or "",
        "updated_at":        now_iso,
    }
    await db.b2b_leads.update_one({"id": lead_id}, {"$set": up})
    updated = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    await _sync_to_telecalling(updated)

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="call_scheduled",
        details={"scheduled_at": payload.scheduled_call_at, "notes": payload.notes},
    )

    return {"ok": True, "lead": updated}


@router.post("/leads/{lead_id}/log-call")
async def log_b2b_call(
    lead_id: str,
    payload: LogCallRequest,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = lead.get("status") or "new"
    if payload.call_status == "completed":
        new_status = "contacted"
    elif payload.call_status == "no_answer":
        new_status = "contacted"

    up: Dict[str, Any] = {
        "call_status":  payload.call_status,
        "call_notes":   payload.call_notes,
        "calls_count":  (lead.get("calls_count") or 0) + 1,
        "last_call_at": now_iso,
        "status":       new_status,
        "updated_at":   now_iso,
    }

    if payload.next_action == "schedule_demo" and payload.scheduled_at:
        up["demo_status"] = "scheduled"
        up["scheduled_demo_at"] = payload.scheduled_at
        up["status"] = "demo_scheduled"
    elif payload.next_action == "schedule_followup" and payload.scheduled_at:
        up["followup_status"] = "scheduled"
        up["next_followup_at"] = payload.scheduled_at
        up["status"] = "follow_up"

    await db.b2b_leads.update_one({"id": lead_id}, {"$set": up})
    updated = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    await _sync_to_telecalling(updated)

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="call_logged",
        details={
            "outcome": payload.call_status,
            "notes": payload.call_notes,
            "next_action": payload.next_action,
        },
    )

    return {"ok": True, "lead": updated}


@router.post("/leads/{lead_id}/schedule-demo")
async def schedule_b2b_demo(
    lead_id: str,
    payload: ScheduleDemoRequest,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    up = {
        "status":            "demo_scheduled",
        "demo_status":       "scheduled",
        "scheduled_demo_at": payload.scheduled_demo_at,
        "demo_type":         payload.demo_type or "online_meet",
        "demo_link":         payload.demo_link or "",
        "demo_notes":        payload.demo_notes or "",
        "demos_count":       (lead.get("demos_count") or 0) + 1,
        "updated_at":        now_iso,
    }
    await db.b2b_leads.update_one({"id": lead_id}, {"$set": up})
    updated = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    await _sync_to_telecalling(updated)

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="demo_scheduled",
        details={
            "scheduled_at": payload.scheduled_demo_at,
            "type": payload.demo_type,
            "link": payload.demo_link,
        },
    )

    return {"ok": True, "lead": updated}


@router.post("/leads/{lead_id}/log-demo")
async def log_b2b_demo(
    lead_id: str,
    payload: LogDemoRequest,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = "demo_completed" if payload.demo_status == "completed" else "follow_up"

    up = {
        "demo_status":  payload.demo_status,
        "demo_notes":   payload.demo_notes,
        "last_demo_at": now_iso,
        "status":       new_status,
        "updated_at":   now_iso,
    }
    await db.b2b_leads.update_one({"id": lead_id}, {"$set": up})
    updated = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    await _sync_to_telecalling(updated)

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="demo_completed" if payload.demo_status == "completed" else "demo_logged",
        details={
            "outcome": payload.demo_status,
            "notes": payload.demo_notes,
            "interest": payload.interest_level,
        },
    )

    return {"ok": True, "lead": updated}


@router.post("/leads/{lead_id}/schedule-followup")
async def schedule_b2b_followup(
    lead_id: str,
    payload: ScheduleFollowupRequest,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    up = {
        "status":            "follow_up",
        "followup_status":   "scheduled",
        "next_followup_at":  payload.next_followup_at,
        "followup_notes":    payload.followup_notes,
        "followups_count":   (lead.get("followups_count") or 0) + 1,
        "updated_at":        now_iso,
    }
    await db.b2b_leads.update_one({"id": lead_id}, {"$set": up})
    updated = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    await _sync_to_telecalling(updated)

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="followup_scheduled",
        details={"followup_at": payload.next_followup_at, "notes": payload.followup_notes},
    )

    return {"ok": True, "lead": updated}


@router.post("/leads/{lead_id}/complete-followup")
async def complete_b2b_followup(
    lead_id: str,
    payload: CompleteFollowupRequest,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    up = {
        "followup_status":  "completed",
        "followup_notes":   payload.notes,
        "updated_at":       now_iso,
    }
    await db.b2b_leads.update_one({"id": lead_id}, {"$set": up})
    updated = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    await _sync_to_telecalling(updated)

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action="followup_completed",
        details={"notes": payload.notes},
    )

    return {"ok": True, "lead": updated}


@router.patch("/leads/{lead_id}/status")
async def update_b2b_status(
    lead_id: str,
    payload: UpdateStatusRequest,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    up: Dict[str, Any] = {
        "status":     payload.status,
        "updated_at": now_iso,
    }
    if payload.lost_reason:
        up["lost_reason"] = payload.lost_reason
    if payload.notes:
        up["notes"] = (lead.get("notes") or "") + f"\n[{now_iso[:10]}] Status -> {payload.status}: {payload.notes}"

    await db.b2b_leads.update_one({"id": lead_id}, {"$set": up})
    updated = await db.b2b_leads.find_one({"id": lead_id}, {"_id": 0})
    await _sync_to_telecalling(updated)

    await _log_activity(
        lead_id=lead_id,
        lead_name=lead.get("name", ""),
        lead_phone=lead.get("phone", ""),
        user=user,
        action=f"status_{payload.status}",
        details={"old_status": lead.get("status"), "new_status": payload.status, "notes": payload.notes},
    )

    return {"ok": True, "lead": updated}


@router.post("/leads/{lead_id}/comments")
async def add_b2b_comment(
    lead_id: str,
    payload: CommentCreate,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    comment_entry = {
        "id":         str(uuid.uuid4()),
        "user_id":    str(user.get("id") or user.get("_id") or ""),
        "user_name":  user.get("name") or user.get("email") or "User",
        "text":       payload.text.strip(),
        "created_at": now_iso,
    }

    await db.b2b_leads.update_one(
        {"id": lead_id},
        {"$push": {"comments": comment_entry}, "$set": {"updated_at": now_iso}}
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


@router.post("/leads/{lead_id}/ticket")
async def raise_b2b_lead_ticket(
    lead_id: str,
    payload: RaiseTicketRequest,
    user: dict = Depends(get_current_user),
):
    """Raise a support/internal ticket for a B2B lead."""
    _require_b2b_access(user)
    lead = await db.b2b_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    ticket_id = f"TICK-{int(datetime.now(timezone.utc).timestamp())}"
    ticket_doc = {
        "id": ticket_id,
        "ticket_id": ticket_id,
        "subject": payload.subject,
        "description": payload.description,
        "priority": payload.priority or "medium",
        "related_to": payload.related_to or "b2b_crm",
        "lead_id": lead_id,
        "lead_name": lead.get("name", "") or lead.get("school_name", ""),
        "lead_phone": lead.get("phone", ""),
        "lead_email": lead.get("email", ""),
        "status": "open",
        "created_by": user.get("email", ""),
        "created_by_name": user.get("name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.support_tickets.insert_one(ticket_doc)
    return {"ok": True, "ticket_id": ticket_id}


# ── Assignees List ──────────────────────────────────────────────────────

@router.get("/assignees")
async def list_b2b_assignees(
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)

    roles_list = await db.roles.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    role_map = {r["id"]: r.get("name") for r in roles_list if r.get("id")}

    team_users = await db.team_users.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "role_id": 1, "user_type": 1}
    ).sort("name", 1).to_list(150)

    # Lead counts per assignee
    pipeline = [
        {"$match": {"assigned_to": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$assigned_to", "count": {"$sum": 1}}},
    ]
    counts_raw = await db.b2b_leads.aggregate(pipeline).to_list(200)
    assigned_counts = {item["_id"]: item["count"] for item in counts_raw if item.get("_id")}

    formatted = []
    for u in team_users:
        uid = u.get("id")
        role_title = role_map.get(u.get("role_id") or "") or u.get("role") or "Team Member"
        category = "Other"
        role_lower = role_title.lower()
        if "b2b" in role_lower:
            category = "B2B Sales"
        elif "school" in role_lower:
            category = "School Sales"
        elif "business development" in role_lower or "bde" in role_lower:
            category = "BDE"
        elif "telecall" in role_lower:
            category = "Telecaller"
        elif "relationship" in role_lower:
            category = "Relationship Manager"
        elif "sales" in role_lower:
            category = "Sales"
        elif "manager" in role_lower or u.get("role") in ("admin", "super_admin"):
            category = "Management"

        formatted.append({
            "id":                   uid,
            "name":                 u.get("name") or u.get("email"),
            "email":                u.get("email"),
            "role":                 role_title,
            "category":             category,
            "assigned_leads_count": assigned_counts.get(uid, 0),
        })

    priority_order = {
        "B2B Sales": 0, "School Sales": 1, "BDE": 2, "Telecaller": 3,
        "Sales": 4, "Relationship Manager": 5, "Management": 6, "Other": 7
    }
    formatted.sort(key=lambda x: (priority_order.get(x["category"], 9), x["name"]))

    return {"assignees": formatted}


# ── Performance Tracksheet ──────────────────────────────────────────────

@router.get("/tracksheet")
async def get_b2b_tracksheet(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    _require_b2b_access(user)

    is_mgr = _is_manager(user)
    curr_uid = str(user.get("id") or user.get("_id") or "")
    if not is_mgr:
        user_id = curr_uid

    match_stage: Dict[str, Any] = {}
    if user_id and user_id != "all":
        match_stage["user_id"] = user_id

    if date_from or date_to:
        day_q: Dict[str, Any] = {}
        if date_from:
            day_q["$gte"] = date_from
        if date_to:
            day_q["$lte"] = date_to
        match_stage["day"] = day_q

    pipeline = [
        {"$match": match_stage},
        {
            "$group": {
                "_id": {
                    "user_id":   "$user_id",
                    "user_name": "$user_name",
                    "user_role": "$user_role",
                    "day":       "$day",
                },
                "total_actions":   {"$sum": 1},
                "calls_logged":    {"$sum": {"$cond": [{"$eq": ["$action", "call_logged"]}, 1, 0]}},
                "calls_scheduled": {"$sum": {"$cond": [{"$eq": ["$action", "call_scheduled"]}, 1, 0]}},
                "demos_scheduled": {"$sum": {"$cond": [{"$eq": ["$action", "demo_scheduled"]}, 1, 0]}},
                "demos_completed": {"$sum": {"$cond": [{"$eq": ["$action", "demo_completed"]}, 1, 0]}},
                "followups_done":  {"$sum": {"$cond": [{"$eq": ["$action", "followup_completed"]}, 1, 0]}},
                "converted":       {"$sum": {"$cond": [{"$eq": ["$action", "status_converted"]}, 1, 0]}},
            }
        },
        {"$sort": {"_id.day": -1, "calls_logged": -1}},
    ]

    grouped_data = await db.b2b_crm_activities.aggregate(pipeline).to_list(300)

    user_summary: Dict[str, Dict[str, Any]] = {}
    for row in grouped_data:
        uid = row["_id"]["user_id"]
        uname = row["_id"]["user_name"]
        urole = row["_id"]["user_role"]
        if uid not in user_summary:
            user_summary[uid] = {
                "user_id":         uid,
                "user_name":       uname,
                "user_role":       urole,
                "total_actions":   0,
                "calls_logged":    0,
                "calls_scheduled": 0,
                "demos_scheduled": 0,
                "demos_completed": 0,
                "followups_done":  0,
                "converted":       0,
            }
        user_summary[uid]["total_actions"]   += row["total_actions"]
        user_summary[uid]["calls_logged"]    += row["calls_logged"]
        user_summary[uid]["calls_scheduled"] += row["calls_scheduled"]
        user_summary[uid]["demos_scheduled"] += row["demos_scheduled"]
        user_summary[uid]["demos_completed"] += row["demos_completed"]
        user_summary[uid]["followups_done"]  += row["followups_done"]
        user_summary[uid]["converted"]       += row["converted"]

    summary_list = sorted(user_summary.values(), key=lambda x: x["calls_logged"], reverse=True)

    totals = {
        "total_calls_logged":    sum(u["calls_logged"] for u in summary_list),
        "total_calls_scheduled": sum(u["calls_scheduled"] for u in summary_list),
        "total_demos_scheduled": sum(u["demos_scheduled"] for u in summary_list),
        "total_demos_completed": sum(u["demos_completed"] for u in summary_list),
        "total_followups_done":  sum(u["followups_done"] for u in summary_list),
        "total_conversions":     sum(u["converted"] for u in summary_list),
        "active_team_members":   len(summary_list),
    }

    return {
        "totals":          totals,
        "user_summaries":  summary_list,
        "daily_breakdown": grouped_data,
    }
