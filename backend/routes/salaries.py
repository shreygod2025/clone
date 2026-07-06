"""
Team member salary records.

- One record per team_user per month with base salary, incentive, deduction, net paid.
- Each salary record auto-mirrors to `school_expenses` with category `salary`
  so payroll shows up in the existing expense/PnL reports.
- Excel/CSV bulk import creates or upserts records by (user_email, month).
- Visibility:
    admin    → all records
    manager  → own + direct reports (users where `reports_to == user.id`)
    team_user → only own records
"""
import io
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Models ─────────────────────────────────────────────────────────────────

class SalaryRecordIn(BaseModel):
    user_id: str
    month: str = Field(..., description="YYYY-MM")
    base_salary: float = 0.0
    incentive: float = 0.0
    deduction: float = 0.0
    net_paid: Optional[float] = None  # if None → base + incentive - deduction
    notes: Optional[str] = None


class SalaryRecordUpdate(BaseModel):
    base_salary: Optional[float] = None
    incentive: Optional[float] = None
    deduction: Optional[float] = None
    net_paid: Optional[float] = None
    notes: Optional[str] = None


# ─── Helpers ────────────────────────────────────────────────────────────────

MONTH_FMT = "%Y-%m"


def _is_admin(user: dict) -> bool:
    return user.get("role") == "admin"


async def _visible_user_ids(user: dict) -> Optional[List[str]]:
    """Return the list of user_ids this caller may view. `None` means unrestricted (admin)."""
    if _is_admin(user):
        return None
    uid = user.get("id") or ""
    ids = {uid}
    # Manager → include direct reports
    async for tu in db.team_users.find({"reports_to": uid, "is_active": {"$ne": False}}, {"_id": 0, "id": 1}):
        if tu.get("id"):
            ids.add(tu["id"])
    return list(ids)


def _normalize_month(v) -> Optional[str]:
    """Accept datetime, ISO date, YYYY-MM, or common textual formats. Returns YYYY-MM or None."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.strftime(MONTH_FMT)
    s = str(v).strip()
    if not s:
        return None
    # Direct YYYY-MM
    if len(s) >= 7 and s[4] == "-":
        try:
            datetime.strptime(s[:7], MONTH_FMT)
            return s[:7]
        except ValueError:
            pass
    # Try common formats
    for fmt in ("%B %Y", "%b %Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%Y", "%m-%Y"):
        try:
            return datetime.strptime(s, fmt).strftime(MONTH_FMT)
        except ValueError:
            continue
    return None


async def _resolve_user(user_id: Optional[str] = None, email: Optional[str] = None, name: Optional[str] = None):
    """Look up a team_user by id / email / (case-insensitive) name. Returns None if not found."""
    if user_id:
        u = await db.team_users.find_one({"id": user_id}, {"_id": 0})
        if u:
            return u
    if email:
        u = await db.team_users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0})
        if u:
            return u
    if name:
        u = await db.team_users.find_one({"name": {"$regex": f"^{name.strip()}$", "$options": "i"}}, {"_id": 0})
        if u:
            return u
    return None


async def _upsert_mirror_expense(record: dict) -> str:
    """Create/refresh the mirrored school_expenses row for a salary record.
    Returns the expense id."""
    existing_id = record.get("expense_id")
    exp_doc = {
        "school_id": "",
        "school_name": "General",
        "category": "salary",
        "category_name": "Team Salary",
        "amount": float(record.get("net_paid") or 0),
        "description": f"{record.get('user_name') or record.get('user_email') or 'Team'} — {record.get('month')}",
        "expense_date": f"{record['month']}-01",
        "vendor_name": record.get("user_name") or record.get("user_email") or "",
        "payment_status": "paid",
        "payment_mode": "salary",
        "notes": record.get("notes") or "",
        "attachments": [],
        "invoice_number": "",
        "invoice_file_url": "",
        "expense_breakup_type": "team_salary",
        "expense_breakup_value": None,
        "created_by": record.get("created_by"),
        "created_by_name": record.get("created_by_name"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        # Salary-specific breakdown
        "salary_record_id": record["id"],
        "salary_user_id": record["user_id"],
        "salary_base": float(record.get("base_salary") or 0),
        "salary_incentive": float(record.get("incentive") or 0),
        "salary_deduction": float(record.get("deduction") or 0),
    }
    if existing_id:
        await db.school_expenses.update_one({"id": existing_id}, {"$set": exp_doc})
        return existing_id
    exp_doc["id"] = str(uuid.uuid4())
    exp_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.school_expenses.insert_one(exp_doc)
    return exp_doc["id"]


def _serialize(rec: dict) -> dict:
    rec.pop("_id", None)
    return rec


# ─── CRUD ────────────────────────────────────────────────────────────────────

@router.post("/salaries")
async def create_salary(payload: SalaryRecordIn, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    month = _normalize_month(payload.month)
    if not month:
        raise HTTPException(status_code=400, detail="Invalid month (expected YYYY-MM)")

    target = await _resolve_user(user_id=payload.user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Team user not found")

    net = payload.net_paid
    if net is None:
        net = float(payload.base_salary) + float(payload.incentive) - float(payload.deduction)

    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(uuid.uuid4()),
        "user_id": target["id"],
        "user_name": target.get("name") or "",
        "user_email": target.get("email") or "",
        "month": month,
        "base_salary": float(payload.base_salary or 0),
        "incentive": float(payload.incentive or 0),
        "deduction": float(payload.deduction or 0),
        "net_paid": float(net or 0),
        "notes": payload.notes or "",
        "created_by": user.get("id"),
        "created_by_name": user.get("name") or user.get("email"),
        "created_at": now,
        "updated_at": now,
    }

    # If a record already exists for this user+month, upsert instead of duplicating.
    existing = await db.salary_records.find_one({"user_id": target["id"], "month": month})
    if existing:
        record["id"] = existing["id"]
        record["created_at"] = existing.get("created_at", now)
        record["expense_id"] = existing.get("expense_id")
        await db.salary_records.replace_one({"id": existing["id"]}, record)
    else:
        await db.salary_records.insert_one(record)

    exp_id = await _upsert_mirror_expense(record)
    await db.salary_records.update_one({"id": record["id"]}, {"$set": {"expense_id": exp_id}})
    record["expense_id"] = exp_id
    return _serialize(record)


@router.get("/salaries")
async def list_salaries(
    user_id: Optional[str] = None,
    month: Optional[str] = None,
    start_month: Optional[str] = None,
    end_month: Optional[str] = None,
    limit: int = 500,
    user: dict = Depends(get_current_user),
):
    q: dict = {}
    if user_id:
        q["user_id"] = user_id
    if month:
        m = _normalize_month(month)
        if m:
            q["month"] = m
    if start_month or end_month:
        month_q = {}
        if start_month:
            m = _normalize_month(start_month)
            if m:
                month_q["$gte"] = m
        if end_month:
            m = _normalize_month(end_month)
            if m:
                month_q["$lte"] = m
        if month_q:
            q["month"] = month_q

    # Visibility filter
    allowed = await _visible_user_ids(user)
    if allowed is not None:
        # Restrict — but also honour explicit user_id if it's in the allowed set
        if user_id and user_id not in allowed:
            raise HTTPException(status_code=403, detail="You cannot view this user's salary")
        q["user_id"] = q.get("user_id") or {"$in": allowed}
        if isinstance(q.get("user_id"), dict) and "$in" not in q["user_id"] and user_id in allowed:
            pass  # already scoped

    items = await db.salary_records.find(q).sort([("month", -1), ("user_name", 1)]).to_list(limit)
    return [_serialize(i) for i in items]


@router.get("/salaries/summary")
async def salary_summary(
    month: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Return aggregate totals for the current view."""
    match: dict = {}
    if month:
        m = _normalize_month(month)
        if m:
            match["month"] = m
    allowed = await _visible_user_ids(user)
    if allowed is not None:
        match["user_id"] = {"$in": allowed}

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": None,
            "total_base": {"$sum": "$base_salary"},
            "total_incentive": {"$sum": "$incentive"},
            "total_deduction": {"$sum": "$deduction"},
            "total_net": {"$sum": "$net_paid"},
            "count": {"$sum": 1},
        }},
    ]
    res = await db.salary_records.aggregate(pipeline).to_list(1)
    if not res:
        return {"total_base": 0, "total_incentive": 0, "total_deduction": 0, "total_net": 0, "count": 0}
    r = res[0]
    r.pop("_id", None)
    return r


@router.patch("/salaries/{record_id}")
async def update_salary(record_id: str, payload: SalaryRecordUpdate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    rec = await db.salary_records.find_one({"id": record_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")

    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if update:
        # Recompute net if the caller sent components but no explicit net
        if any(k in update for k in ("base_salary", "incentive", "deduction")) and "net_paid" not in update:
            base = update.get("base_salary", rec.get("base_salary", 0))
            inc = update.get("incentive", rec.get("incentive", 0))
            ded = update.get("deduction", rec.get("deduction", 0))
            update["net_paid"] = float(base) + float(inc) - float(ded)
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.salary_records.update_one({"id": record_id}, {"$set": update})

    rec = await db.salary_records.find_one({"id": record_id})
    exp_id = await _upsert_mirror_expense(rec)
    if exp_id != rec.get("expense_id"):
        await db.salary_records.update_one({"id": record_id}, {"$set": {"expense_id": exp_id}})
        rec["expense_id"] = exp_id
    return _serialize(rec)


@router.delete("/salaries/{record_id}")
async def delete_salary(record_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    rec = await db.salary_records.find_one({"id": record_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")
    if rec.get("expense_id"):
        await db.school_expenses.delete_one({"id": rec["expense_id"]})
    await db.salary_records.delete_one({"id": record_id})
    return {"success": True}


# ─── Excel / CSV import ─────────────────────────────────────────────────────

def _norm_key(k) -> str:
    """Normalize a header cell — lowercase, trim, spaces→underscores, drop punctuation."""
    if k is None:
        return ""
    s = str(k).strip().lower()
    # replace whitespace + hyphens with underscore, drop other non-alnum
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "\t", "-", "/"):
            out.append("_")
        # else drop
    return "".join(out).strip("_")


def _read_rows(file_bytes: bytes, filename: str) -> List[dict]:
    """Return a list of dict rows normalised with lowercase underscore keys."""
    name = (filename or "").lower()
    if name.endswith(".csv"):
        import csv
        text = file_bytes.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        return [{_norm_key(k): v for k, v in row.items()} for row in reader]
    # Excel
    from openpyxl import load_workbook
    wb = load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb.active
    headers: List[str] = []
    rows: List[dict] = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            headers = [_norm_key(c) for c in row]
            continue
        if not any(v is not None and str(v).strip() != "" for v in row):
            continue
        rows.append({headers[j]: row[j] for j in range(min(len(headers), len(row))) if headers[j]})
    return rows


def _pick(row: dict, *keys) -> Optional[str]:
    for k in keys:
        v = row.get(k)
        if v is not None and str(v).strip() != "":
            return v
    return None


def _to_float(v, default: float = 0.0) -> float:
    if v is None or v == "":
        return default
    try:
        s = str(v).replace(",", "").replace("₹", "").strip()
        return float(s) if s else default
    except ValueError:
        return default


@router.post("/salaries/import")
async def import_salaries(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Bulk import salary records from Excel (.xlsx) or CSV.

    Accepted column headers (case-insensitive):
      name | employee | full_name    → team member name
      email                          → team member email (preferred match)
      user_id                        → direct id match
      month | period                 → YYYY-MM / "March 2026" / date
      base_salary | salary | base    → base amount
      incentive | bonus | commission
      deduction | deductions | tax
      net_paid | net | net_amount    → optional; computed if absent
      notes | remarks
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    try:
        content = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to read uploaded file")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        rows = _read_rows(content, file.filename or "")
    except Exception as e:
        logger.exception("Salary import parse failed")
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

    if not rows:
        raise HTTPException(status_code=400, detail="No rows found in the file")

    created = 0
    updated = 0
    skipped: List[dict] = []
    now = datetime.now(timezone.utc).isoformat()

    for idx, row in enumerate(rows, start=2):  # +1 for header line
        name = _pick(row, "name", "employee", "full_name", "employee_name", "member_name")
        email = _pick(row, "email", "e-mail", "user_email")
        uid = _pick(row, "user_id", "id")
        month_raw = _pick(row, "month", "period", "salary_month", "pay_month")

        month = _normalize_month(month_raw)
        if not month:
            skipped.append({"row": idx, "reason": f"invalid month: {month_raw!r}"})
            continue

        target = await _resolve_user(user_id=uid, email=email, name=name)
        if not target:
            skipped.append({"row": idx, "reason": f"team member not found (name={name!r}, email={email!r})"})
            continue

        base = _to_float(_pick(row, "base_salary", "base", "salary", "monthly_salary"))
        incentive = _to_float(_pick(row, "incentive", "bonus", "commission", "variable"))
        deduction = _to_float(_pick(row, "deduction", "deductions", "tax", "tds"))
        net_raw = _pick(row, "net_paid", "net", "net_amount", "take_home", "final")
        net = _to_float(net_raw) if net_raw is not None else (base + incentive - deduction)
        notes = _pick(row, "notes", "remarks", "comments") or ""

        existing = await db.salary_records.find_one({"user_id": target["id"], "month": month})
        record = {
            "user_id": target["id"],
            "user_name": target.get("name") or "",
            "user_email": target.get("email") or "",
            "month": month,
            "base_salary": base,
            "incentive": incentive,
            "deduction": deduction,
            "net_paid": net,
            "notes": str(notes),
            "updated_at": now,
        }
        if existing:
            record["id"] = existing["id"]
            record["created_at"] = existing.get("created_at", now)
            record["created_by"] = existing.get("created_by", user.get("id"))
            record["created_by_name"] = existing.get("created_by_name", user.get("name") or user.get("email"))
            record["expense_id"] = existing.get("expense_id")
            await db.salary_records.replace_one({"id": existing["id"]}, record)
            updated += 1
        else:
            record["id"] = str(uuid.uuid4())
            record["created_at"] = now
            record["created_by"] = user.get("id")
            record["created_by_name"] = user.get("name") or user.get("email")
            await db.salary_records.insert_one(record)
            created += 1

        exp_id = await _upsert_mirror_expense(record)
        await db.salary_records.update_one({"id": record["id"]}, {"$set": {"expense_id": exp_id}})

    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "total_rows": len(rows),
    }


# ─── Per-user timeseries for the Performance page ─────────────────────────

@router.get("/users/{target_user_id}/salaries/timeseries")
async def user_salary_timeseries(
    target_user_id: str,
    months: int = 12,
    user: dict = Depends(get_current_user),
):
    """Return monthly salary/incentive breakdown for one team member.

    Visibility: admin (any), manager (any of their direct reports + self),
    team_user (only self).
    """
    allowed = await _visible_user_ids(user)
    if allowed is not None and target_user_id not in allowed:
        raise HTTPException(status_code=403, detail="You cannot view this user's salary")

    limit = max(1, min(months, 60))
    items = await db.salary_records.find(
        {"user_id": target_user_id},
        {"_id": 0},
    ).sort("month", -1).to_list(limit)

    # Return oldest → newest for charting
    items = sorted(items, key=lambda r: r.get("month", ""))

    total_base = sum(float(r.get("base_salary") or 0) for r in items)
    total_incentive = sum(float(r.get("incentive") or 0) for r in items)
    total_deduction = sum(float(r.get("deduction") or 0) for r in items)
    total_net = sum(float(r.get("net_paid") or 0) for r in items)

    # Growth % from oldest to latest net paid
    growth_pct = None
    if len(items) >= 2:
        first = float(items[0].get("net_paid") or 0)
        last = float(items[-1].get("net_paid") or 0)
        if first > 0:
            growth_pct = round((last - first) / first * 100.0, 1)

    return {
        "user_id": target_user_id,
        "records": items,
        "summary": {
            "total_base": total_base,
            "total_incentive": total_incentive,
            "total_deduction": total_deduction,
            "total_net": total_net,
            "records_count": len(items),
            "growth_pct": growth_pct,
        },
    }


@router.get("/me/salaries/timeseries")
async def my_salary_timeseries(months: int = 12, user: dict = Depends(get_current_user)):
    """Shortcut for a user to view their own salary timeseries."""
    return await user_salary_timeseries(user.get("id") or "", months=months, user=user)
