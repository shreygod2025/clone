"""
Telecalling / Cold-Calling module.

Data model
──────────
telecalling_contacts:
  id, name, phone, alt_phone, email, school_name, city, board, notes, source,
  assigned_to, assigned_to_name,
  call_picked        ('yes'|'no'|None)
  lead_interested    ('yes'|'no'|None)
  products_interested [str]
  meeting_at         (ISO datetime, optional)
  school_inquiry_id  (linked when Interested=Yes)
  imported_batch_id, imported_by, created_at, updated_at

telecalling_activity (per-outcome log — used for the reports view)
  id, contact_id, user_id, user_name, day (YYYY-MM-DD),
  event ('call_made'|'call_picked'|'lead_interested'|'meeting_booked'),
  created_at

Access rules
────────────
- Admins ('admin' role) → see & manage everything.
- Users with the 'telecalling' permission → see & edit ONLY rows assigned to them.
"""
import io
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from openpyxl import load_workbook, Workbook

from .shared import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["telecalling"])

# Only the following headers are recognised on import. First non-empty
# column matching (case-insensitive) is used per row.
XLSX_COLUMNS = [
    ("name",        ["name", "contact_name", "full name"]),
    ("phone",       ["phone", "mobile", "phone_number", "contact"]),
    ("alt_phone",   ["alt_phone", "alternate phone", "secondary phone"]),
    ("email",       ["email", "email_id", "mail"]),
    ("school_name", ["school_name", "school", "institution"]),
    ("city",        ["city", "location", "town"]),
    ("board",       ["board", "curriculum"]),
    ("notes",       ["notes", "remarks", "comments"]),
    ("source",      ["source", "lead_source", "campaign"]),
]

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_admin(user: dict) -> bool:
    return (user.get("role") or "").lower() in {"admin", "super_admin", "superadmin"}


def _uid(user: dict) -> Optional[str]:
    return user.get("id") or user.get("user_id")


async def _log_activity(contact_id: str, user: dict, event: str) -> None:
    doc = {
        "id":         str(uuid.uuid4()),
        "contact_id": contact_id,
        "user_id":    _uid(user),
        "user_name":  user.get("name") or user.get("email"),
        "day":        _now()[:10],
        "event":      event,
        "created_at": _now(),
    }
    await db.telecalling_activity.insert_one(doc)


# ── Models ────────────────────────────────────────────────────────
class Contact(BaseModel):
    name:  str = ""
    phone: str = ""
    email: str = ""
    role:  str = ""


class ContactPatch(BaseModel):
    name:               Optional[str] = None
    phone:              Optional[str] = None
    alt_phone:          Optional[str] = None
    email:              Optional[str] = None
    role:               Optional[str] = None
    school_name:        Optional[str] = None
    city:               Optional[str] = None
    board:              Optional[str] = None
    notes:              Optional[str] = None
    status:             Optional[str] = None   # 'new' | 'follow_up' | 'no_answer' | 'interested'
    call_picked:        Optional[str] = None   # 'yes' | 'no'
    lead_interested:    Optional[str] = None   # 'yes' | 'no'
    products_interested: Optional[List[str]] = None
    followup_at:        Optional[str] = None   # ISO datetime
    meeting_at:         Optional[str] = None   # ISO datetime
    meeting_mode:       Optional[str] = None   # 'online' | 'offline'
    meeting_link:       Optional[str] = None
    meeting_address:    Optional[str] = None
    contacts:           Optional[List[Contact]] = None  # additional contacts
    assigned_to:        Optional[str] = None


class ImportOptions(BaseModel):
    assign_mode:   str = "single"            # 'single' | 'auto'
    assigned_to:   Optional[str] = None
    auto_pool:     List[str] = []
    default_source: Optional[str] = None


# ── Sample template download ─────────────────────────────────────
@router.get("/telecalling/sample-template.xlsx")
async def download_sample_template(user: dict = Depends(get_current_user)):
    wb = Workbook()
    ws = wb.active
    ws.title = "Contacts"
    headers = [k for k, _ in XLSX_COLUMNS]
    ws.append(headers)
    ws.append(["Ravi Kumar", "9876543210", "9812345678", "ravi@school.edu",
               "Delhi Public School", "Mumbai", "CBSE", "Called last quarter — reintroduce", "Winter Campaign"])
    ws.append(["Anita Sharma", "9123456780", "", "", "St Anne's High School", "Pune", "ICSE", "", ""])
    buf = io.BytesIO()
    wb.save(buf); buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="telecalling-template.xlsx"'},
    )


# ── Bulk import ──────────────────────────────────────────────────
@router.post("/telecalling/import")
async def import_contacts(
    file:          UploadFile = File(...),
    assign_mode:   str = Form("single"),
    assigned_to:   Optional[str] = Form(None),
    auto_pool:     str = Form(""),           # comma-separated user_ids
    default_source: Optional[str] = Form(None),
    batch_name:    Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Only admins can bulk import")

    contents = await file.read()
    try:
        wb = load_workbook(io.BytesIO(contents), read_only=True, data_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read spreadsheet: {e}")

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="Empty spreadsheet")

    # Original header labels preserved (case-sensitive display) + lower-cased for lookup
    header_labels_raw = [str(h or "").strip() for h in rows[0]]
    headers = [h.lower() for h in header_labels_raw]

    def col_index(canonical_key: str) -> Optional[int]:
        aliases = dict(XLSX_COLUMNS).get(canonical_key, [])
        for al in aliases:
            if al in headers:
                return headers.index(al)
        return None

    idx = {k: col_index(k) for k, _ in XLSX_COLUMNS}
    if idx["phone"] is None:
        raise HTTPException(status_code=400, detail="Missing required 'phone' column")

    # Any column that isn't mapped to a known canonical key is preserved as
    # an "extra field" so the UI can display everything the spreadsheet
    # originally contained.
    known_indices = {i for i in idx.values() if i is not None}
    extra_columns: List[Tuple[int, str]] = [
        (i, header_labels_raw[i] or headers[i])
        for i in range(len(headers))
        if i not in known_indices and (header_labels_raw[i] or headers[i])
    ]

    # Build assignee pool
    pool = [p.strip() for p in (auto_pool or "").split(",") if p.strip()]
    pool_users = []
    if assign_mode == "auto" and pool:
        pool_users = await db.team_users.find(
            {"id": {"$in": pool}}, {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(500)

    single_user = None
    if assign_mode == "single" and assigned_to:
        single_user = await db.team_users.find_one({"id": assigned_to}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if not single_user:
            raise HTTPException(status_code=400, detail="Selected assignee could not be found")

    # ── Batch metadata ─────────────────────────────────────────────
    batch_id = str(uuid.uuid4())
    default_batch_name = (
        (batch_name or "").strip()
        or (file.filename or "").rsplit(".", 1)[0].strip()
        or f"Import {_now()[:10]}"
    )

    # ── Duplicate detection (phone number, globally) ───────────────
    def _norm_phone(p: str) -> str:
        return re.sub(r"\D", "", str(p or ""))[-10:]  # last 10 digits — India phones

    existing_raw_phones = await db.telecalling_contacts.distinct("phone")
    existing_phones = {_norm_phone(p) for p in existing_raw_phones}
    existing_phones.discard("")

    seen_in_this_import: set[str] = set()
    inserted = 0
    skipped = 0
    duplicates = 0
    docs = []
    for r in rows[1:]:
        if not r:
            skipped += 1
            continue
        raw_phone = str((r[idx["phone"]] or "")).strip()
        if not raw_phone:
            skipped += 1
            continue

        norm = _norm_phone(raw_phone)
        if not norm or len(norm) < 7:
            skipped += 1
            continue
        if norm in existing_phones or norm in seen_in_this_import:
            duplicates += 1
            continue
        seen_in_this_import.add(norm)

        def _cell(k: str) -> str:
            i = idx.get(k)
            if i is None:
                return ""
            v = r[i] if i < len(r) else ""
            return str(v or "").strip()

        assignee = None
        if assign_mode == "single" and single_user:
            assignee = single_user
        elif assign_mode == "auto" and pool_users:
            assignee = pool_users[inserted % len(pool_users)]

        # Capture unknown columns
        extra_fields: Dict[str, str] = {}
        for ei, label in extra_columns:
            v = r[ei] if ei < len(r) else ""
            s = str(v or "").strip()
            if s:
                extra_fields[label] = s

        docs.append({
            "id":               str(uuid.uuid4()),
            "name":             _cell("name"),
            "phone":            raw_phone,
            "alt_phone":        _cell("alt_phone"),
            "email":            _cell("email"),
            "school_name":      _cell("school_name"),
            "city":             _cell("city"),
            "board":            _cell("board"),
            "notes":            _cell("notes"),
            "source":           _cell("source") or (default_source or ""),
            "status":           "new",
            "assigned_to":      assignee.get("id") if assignee else None,
            "assigned_to_name": (assignee.get("name") or assignee.get("email")) if assignee else None,
            "call_picked":       None,
            "lead_interested":   None,
            "products_interested": [],
            "meeting_at":        None,
            "school_inquiry_id": None,
            "imported_batch_id": batch_id,
            "batch_id":          batch_id,       # duplicate for filter simplicity
            "batch_name":        default_batch_name,
            "extra_fields":      extra_fields,
            "imported_by":       _uid(user),
            "imported_by_name":  user.get("name") or user.get("email"),
            "created_at":        _now(),
            "updated_at":        _now(),
        })
        inserted += 1

    if docs:
        await db.telecalling_contacts.insert_many(docs)

    # Persist the batch itself (only if at least one row landed)
    if inserted > 0:
        await db.telecalling_batches.insert_one({
            "id":              batch_id,
            "name":            default_batch_name,
            "file_name":       file.filename,
            "row_count":       inserted,
            "extra_columns":   [label for _, label in extra_columns],
            "created_by":      _uid(user),
            "created_by_name": user.get("name") or user.get("email"),
            "created_at":      _now(),
            "updated_at":      _now(),
        })

    return {
        "ok":         True,
        "batch_id":   batch_id,
        "batch_name": default_batch_name,
        "inserted":   inserted,
        "skipped":    skipped,
        "duplicates": duplicates,
    }


# ── Batch (imported sheet / tab) management ──────────────────────
@router.get("/telecalling/batches")
async def list_batches(user: dict = Depends(get_current_user)):
    """List every import batch — the UI renders one tab per batch."""
    if not _is_admin(user):
        # Non-admins see only the batches that contain rows assigned to them.
        my_batches = await db.telecalling_contacts.distinct(
            "batch_id", {"assigned_to": _uid(user)}
        )
        cursor = db.telecalling_batches.find({"id": {"$in": my_batches}}, {"_id": 0}).sort("created_at", -1)
    else:
        cursor = db.telecalling_batches.find({}, {"_id": 0}).sort("created_at", -1)
    items: List[Dict[str, Any]] = []
    async for b in cursor:
        # attach live counts
        b["contact_count"] = await db.telecalling_contacts.count_documents({"batch_id": b["id"]})
        items.append(b)
    return {"items": items, "count": len(items)}


class BatchPatch(BaseModel):
    name: str = Field(min_length=1, max_length=120)


@router.patch("/telecalling/batches/{batch_id}")
async def rename_batch(batch_id: str, patch: BatchPatch, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Only admins can rename batches")
    new_name = patch.name.strip()
    await db.telecalling_batches.update_one(
        {"id": batch_id},
        {"$set": {"name": new_name, "updated_at": _now()}},
    )
    # Cascade to contacts so tab labels stay in sync everywhere
    await db.telecalling_contacts.update_many(
        {"batch_id": batch_id}, {"$set": {"batch_name": new_name, "updated_at": _now()}}
    )
    return {"ok": True, "batch_id": batch_id, "name": new_name}


@router.delete("/telecalling/batches/{batch_id}")
async def delete_batch(batch_id: str, user: dict = Depends(get_current_user)):
    """Deletes the batch AND every contact that came in through it."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Only admins can delete batches")
    contacts_res = await db.telecalling_contacts.delete_many({"batch_id": batch_id})
    await db.telecalling_batches.delete_one({"id": batch_id})
    return {"ok": True, "deleted_contacts": contacts_res.deleted_count}


# ── Bulk ops on contacts ────────────────────────────────────────
class BulkIds(BaseModel):
    ids: List[str]


class BulkAssign(BaseModel):
    ids: List[str]
    assigned_to: Optional[str] = None  # None = unassign


@router.post("/telecalling/contacts/bulk-delete")
async def bulk_delete_contacts(payload: BulkIds, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Only admins can bulk delete")
    if not payload.ids:
        return {"ok": True, "deleted": 0}
    res = await db.telecalling_contacts.delete_many({"id": {"$in": payload.ids}})
    return {"ok": True, "deleted": res.deleted_count}


@router.post("/telecalling/contacts/bulk-assign")
async def bulk_assign_contacts(payload: BulkAssign, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Only admins can bulk assign")
    if not payload.ids:
        return {"ok": True, "updated": 0}

    if payload.assigned_to:
        target = await db.team_users.find_one({"id": payload.assigned_to}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if not target:
            raise HTTPException(status_code=404, detail="Assignee user not found")
        update = {"$set": {
            "assigned_to": target["id"],
            "assigned_to_name": target.get("name") or target.get("email"),
            "updated_at": _now(),
        }}
    else:
        update = {"$set": {
            "assigned_to": None,
            "assigned_to_name": None,
            "updated_at": _now(),
        }}

    res = await db.telecalling_contacts.update_many({"id": {"$in": payload.ids}}, update)
    return {"ok": True, "updated": res.modified_count}


# ── List / Filter ────────────────────────────────────────────────
@router.get("/telecalling/contacts")
async def list_contacts(
    assigned_to: Optional[str] = None,
    status:      Optional[str] = None,   # 'unworked' | 'picked' | 'interested' | 'not_interested'
    search:      Optional[str] = None,
    batch_id:    Optional[str] = None,
    limit:       int = 500,
    user: dict = Depends(get_current_user),
):
    q: dict = {}
    if not _is_admin(user):
        q["assigned_to"] = _uid(user)
    elif assigned_to:
        q["assigned_to"] = assigned_to if assigned_to != "unassigned" else None

    if batch_id and batch_id != "all":
        q["batch_id"] = batch_id

    if status in {"new", "follow_up", "no_answer", "interested"}:
        q["status"] = status
    elif status == "unworked":
        q["call_picked"] = None
    elif status == "picked":
        q["call_picked"] = "yes"
    elif status == "not_picked":
        q["call_picked"] = "no"
    elif status == "not_interested":
        q["lead_interested"] = "no"

    if search:
        q["$or"] = [
            {"name":        {"$regex": search, "$options": "i"}},
            {"phone":       {"$regex": search, "$options": "i"}},
            {"school_name": {"$regex": search, "$options": "i"}},
            {"city":        {"$regex": search, "$options": "i"}},
        ]

    rows = await db.telecalling_contacts.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"contacts": rows}


# ── Update ───────────────────────────────────────────────────────
@router.patch("/telecalling/contacts/{contact_id}")
async def update_contact(contact_id: str, patch: ContactPatch, user: dict = Depends(get_current_user)):
    row = await db.telecalling_contacts.find_one({"id": contact_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")
    if not _is_admin(user) and row.get("assigned_to") != _uid(user):
        raise HTTPException(status_code=403, detail="Not your contact")

    changes = {k: v for k, v in patch.model_dump(exclude_unset=True).items() if v is not None or k in {"call_picked", "lead_interested", "notes"}}
    if not changes:
        return row

    # Normalise contacts (Contact -> dict)
    if isinstance(changes.get("contacts"), list):
        changes["contacts"] = [c if isinstance(c, dict) else c.model_dump() for c in changes["contacts"]]

    # Activity logging on state transitions
    prev = row
    if changes.get("call_picked") in {"yes", "no"} and prev.get("call_picked") != changes["call_picked"]:
        await _log_activity(contact_id, user, "call_made")
        if changes["call_picked"] == "yes":
            await _log_activity(contact_id, user, "call_picked")
    if changes.get("lead_interested") == "yes" and prev.get("lead_interested") != "yes":
        await _log_activity(contact_id, user, "lead_interested")
    if changes.get("meeting_at") and prev.get("meeting_at") != changes["meeting_at"]:
        await _log_activity(contact_id, user, "meeting_booked")

    # Auto-derive status when caller hasn't set it explicitly
    if "status" not in changes:
        merged = {**prev, **changes}
        if (merged.get("lead_interested") or "").lower() == "yes":
            changes["status"] = "interested"
        elif (merged.get("call_picked") or "").lower() == "no":
            changes["status"] = "no_answer"
        elif merged.get("followup_at"):
            changes["status"] = "follow_up"
        elif prev.get("status") in {None, ""}:
            changes["status"] = "new"

    # Reflect assignee name if reassigning
    if "assigned_to" in changes and changes["assigned_to"]:
        assignee = await db.team_users.find_one({"id": changes["assigned_to"]}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if assignee:
            changes["assigned_to_name"] = assignee.get("name") or assignee.get("email")

    # Promote to School CRM if interested
    if changes.get("lead_interested") == "yes":
        try:
            new_inquiry_id = row.get("school_inquiry_id")
            if not new_inquiry_id:
                merged_products = list(dict.fromkeys(
                    (row.get("products_interested") or []) + (changes.get("products_interested") or [])
                ))
                new_inquiry = {
                    "id":            str(uuid.uuid4()),
                    "school_name":   changes.get("school_name") or row.get("school_name") or (changes.get("name") or row.get("name") or "Unnamed Lead"),
                    "contact_name":  changes.get("name") or row.get("name") or "",
                    "phone":         changes.get("phone") or row.get("phone") or "",
                    "email":         changes.get("email") or row.get("email") or "",
                    "location":      changes.get("city") or row.get("city") or "",
                    "board":         changes.get("board") or row.get("board") or "",
                    "status":        "new",
                    "programs_interested": merged_products,
                    "school_contacts": [
                        {**c, "role": c.get("role") or ""}
                        for c in (changes.get("contacts") or row.get("contacts") or []) if c.get("name")
                    ],
                    "source":        "telecalling",
                    "telecalling_contact_id": contact_id,
                    "meeting_mode":  changes.get("meeting_mode") or row.get("meeting_mode"),
                    "meeting_link":  changes.get("meeting_link") or row.get("meeting_link"),
                    "meeting_address": changes.get("meeting_address") or row.get("meeting_address"),
                    "assigned_to":   row.get("assigned_to"),
                    "assigned_to_name": row.get("assigned_to_name"),
                    "added_by":      _uid(user),
                    "created_at":    _now(),
                    "updated_at":    _now(),
                }
                # Meeting date passes through as followup_date
                if changes.get("meeting_at"):
                    new_inquiry["followup_date"] = str(changes["meeting_at"])[:10]
                await db.school_inquiries.insert_one(new_inquiry)
                changes["school_inquiry_id"] = new_inquiry["id"]
        except Exception as e:
            logger.warning("telecalling → school_inquiry promotion failed: %s", e)

    changes["updated_at"] = _now()
    await db.telecalling_contacts.update_one({"id": contact_id}, {"$set": changes})
    updated = await db.telecalling_contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated


# ── Reassign ─────────────────────────────────────────────────────
class ReassignIn(BaseModel):
    contact_ids: List[str]
    assign_mode: str = "single"        # 'single' | 'auto'
    assigned_to: Optional[str] = None
    auto_pool:   List[str] = []


@router.post("/telecalling/reassign")
async def reassign(payload: ReassignIn, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admins only")
    if not payload.contact_ids:
        return {"ok": True, "updated": 0}

    pool_users = []
    if payload.assign_mode == "auto" and payload.auto_pool:
        pool_users = await db.team_users.find(
            {"id": {"$in": payload.auto_pool}}, {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(500)

    single_user = None
    if payload.assign_mode == "single" and payload.assigned_to:
        single_user = await db.team_users.find_one({"id": payload.assigned_to}, {"_id": 0, "id": 1, "name": 1, "email": 1})

    updated = 0
    for i, cid in enumerate(payload.contact_ids):
        assignee = None
        if payload.assign_mode == "single" and single_user:
            assignee = single_user
        elif payload.assign_mode == "auto" and pool_users:
            assignee = pool_users[i % len(pool_users)]

        await db.telecalling_contacts.update_one(
            {"id": cid},
            {"$set": {
                "assigned_to":      assignee.get("id") if assignee else None,
                "assigned_to_name": (assignee.get("name") or assignee.get("email")) if assignee else None,
                "updated_at":       _now(),
            }},
        )
        updated += 1
    return {"ok": True, "updated": updated}


# ── Delete ───────────────────────────────────────────────────────
@router.delete("/telecalling/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admins only")
    await db.telecalling_contacts.delete_one({"id": contact_id})
    return {"ok": True}


# ── Reports (daily / monthly per user) ───────────────────────────
@router.get("/telecalling/reports")
async def telecalling_reports(month: Optional[str] = None, user: dict = Depends(get_current_user)):
    """
    Aggregation:
      For each (user, day) → counts of events.
      For each user → month-total.
      Non-admins see only their own row.
    """
    from datetime import date
    now = datetime.now(timezone.utc)
    month = month or f"{now.year:04d}-{now.month:02d}"
    start = f"{month}-01"
    # end of month
    y, m = [int(x) for x in month.split("-")]
    if m == 12:
        end_first = f"{y+1:04d}-01-01"
    else:
        end_first = f"{y:04d}-{m+1:02d}-01"

    q: dict = {"day": {"$gte": start, "$lt": end_first}}
    if not _is_admin(user):
        q["user_id"] = _uid(user)

    events = await db.telecalling_activity.find(q, {"_id": 0}).to_list(20000)

    # Aggregate
    per_user: dict = {}
    for ev in events:
        uid = ev.get("user_id")
        uname = ev.get("user_name") or uid or "—"
        day = ev.get("day")
        e = ev.get("event")
        u = per_user.setdefault(uid, {
            "user_id": uid, "user_name": uname,
            "totals": {"call_made": 0, "call_picked": 0, "lead_interested": 0, "meeting_booked": 0},
            "days": {},
        })
        u["totals"][e] = u["totals"].get(e, 0) + 1
        d = u["days"].setdefault(day, {"call_made": 0, "call_picked": 0, "lead_interested": 0, "meeting_booked": 0})
        d[e] = d.get(e, 0) + 1

    # Convert days dict → sorted list
    for u in per_user.values():
        u["days"] = [{"day": k, **v} for k, v in sorted(u["days"].items(), reverse=True)]

    return {
        "month":  month,
        "rows":   sorted(per_user.values(), key=lambda x: -sum(x["totals"].values())),
    }
