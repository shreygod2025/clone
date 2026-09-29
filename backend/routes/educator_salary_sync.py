"""Educator monthly-salary → school_expenses materialization.

Purpose
-------
The School P&L computes ``teacher_cost`` from a live CheckIn earnings sync,
but those numbers are ephemeral (recomputed on every request). Product wants
each educator's monthly salary to appear as an actual **line item** in the
Expenses ledger — one row per (educator, school, month) — scheduled on the
**7th of the next month** (Aug earnings → 7 Sep expense).

Design
------
- Backfill endpoint: ``POST /api/school-expenses/import-educator-salaries``
  optional ``?since_month=YYYY-MM`` (default: 2026-04, the FY start).
- Idempotent: uses a deterministic ``sync_key`` per (educator, school, month)
  — re-runs update the amount instead of inserting duplicates.
- Cron: ``POST /api/cron/educator-salary-materialize`` runs on the 7th of
  every month, materializing the previous month's earnings.
- Schools that CheckIn couldn't match are inserted as a **General** expense
  (no school_id) so the amount still lands in the ledger and admins can
  reassign it later.
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone, date
from typing import Dict, List, Optional, Any
from calendar import monthrange

import httpx
from fastapi import APIRouter, Depends, HTTPException, Header, Query

from .shared import db, get_current_user

router = APIRouter()
log = logging.getLogger(__name__)

DEFAULT_BACKFILL_START = "2026-04"   # April = FY start
CATEGORY = "teacher_cost"


def _is_admin(u: dict) -> bool:
    return (u or {}).get("role") in {"admin", "super_admin"}


def _parse_month(row_month: Any) -> Optional[str]:
    """Best-effort parse of the ``month`` field on a CheckIn earning row.

    Accepts:  "2026-03-01 00:00:00" · "2026-03-01" · "2026-03" · date(2026,3,1)
    Returns: "2026-03" (year-month), or None if unparseable.
    """
    if not row_month:
        return None
    if isinstance(row_month, (datetime, date)):
        return row_month.strftime("%Y-%m")
    s = str(row_month).strip()
    m = re.match(r"^(\d{4})-(\d{2})", s)
    return f"{m.group(1)}-{m.group(2)}" if m else None


def _next_month_seventh(yyyy_mm: str) -> str:
    """'2026-08' → '2026-09-07' (7th of the following month)."""
    y, m = map(int, yyyy_mm.split("-"))
    m += 1
    if m > 12:
        m = 1
        y += 1
    return f"{y:04d}-{m:02d}-07"


def _month_le(a: str, b: str) -> bool:
    """Lex compare on YYYY-MM strings — safe because zero-padded."""
    return a <= b


async def _resolve_school_map() -> Dict[str, str]:
    """Return {school_name_lower: school_inquiry_id} + timetable_id → school_id."""
    return {}   # unused — we reuse the P&L sync's matcher directly


async def _sync_key(educator_id: str, school_id: Optional[str], yyyy_mm: str) -> str:
    return f"educator-salary:{educator_id}:{school_id or 'unmatched'}:{yyyy_mm}"


async def _materialize(since_month: str, up_to_month: Optional[str] = None) -> Dict[str, Any]:
    """Core: pull CheckIn earnings, group by (educator, school, month), and
    upsert one school_expenses row per group."""
    from routes.checkin_api import _fetch_all_pages
    from routes.expenses import _compute_checkin_teacher_costs  # noqa: F401 (kept for future reuse)

    # Cap the "up to" boundary at the previous month so we never materialize
    # an in-progress month (that'd inflate the expense before payouts are cut).
    now = datetime.now(timezone.utc)
    last_full_month_dt = date(now.year, now.month, 1)
    last_full_month_dt = date(last_full_month_dt.year - (1 if last_full_month_dt.month == 1 else 0),
                              12 if last_full_month_dt.month == 1 else last_full_month_dt.month - 1,
                              1)
    default_up_to = last_full_month_dt.strftime("%Y-%m")
    up_to = up_to_month or default_up_to

    result: Dict[str, Any] = {
        "since_month": since_month,
        "up_to_month": up_to,
        "inserted": 0,
        "updated": 0,
        "skipped_unchanged": 0,
        "unmatched_amount": 0.0,
        "total_amount": 0.0,
        "months": [],
    }

    # ── 1. Pull CheckIn earnings + educators + timetables ──
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            earnings   = await _fetch_all_pages("/earnings",   {}, per_page=500, hard_cap=5000, client=client)
            educators  = await _fetch_all_pages("/educators",  {}, per_page=500, hard_cap=2000, client=client)
            timetables = await _fetch_all_pages("/timetables", {}, per_page=500, hard_cap=2000, client=client)
    except Exception as e:
        log.warning("CheckIn fetch failed: %s", e)
        raise HTTPException(status_code=502, detail=f"CheckIn API unreachable: {e}")

    edu_names = {e.get("id"): (e.get("full_name") or e.get("email") or "") for e in educators if e.get("id")}
    edu_emails = {e.get("id"): (e.get("email") or "") for e in educators if e.get("id")}

    # ── 2. Build school-matching maps (same rules as the P&L sync) ──
    schools = await db.school_inquiries.find(
        {}, {"_id": 0, "id": 1, "school_name": 1, "checkin_timetable_ids": 1, "checkin_timetable_id": 1}
    ).to_list(5000)
    name_to_sid: Dict[str, str] = {}
    school_names: Dict[str, str] = {}   # sid → school_name
    tid_to_sid: Dict[str, str] = {}
    for s in schools:
        sid = s.get("id")
        if not sid:
            continue
        nm = (s.get("school_name") or "").strip()
        if nm:
            school_names[sid] = nm
            name_to_sid.setdefault(nm.lower(), sid)
        for tid in list(s.get("checkin_timetable_ids") or []):
            if tid:
                tid_to_sid[tid] = sid
        legacy = s.get("checkin_timetable_id")
        if legacy:
            tid_to_sid.setdefault(legacy, sid)

    def _fuzzy(name_lc: str) -> Optional[str]:
        if not name_lc:
            return None
        head = re.sub(r"[^a-z0-9 ]", "", name_lc).strip()
        for cut in (30, 24, 20, 16, 12):
            if len(head) < cut:
                continue
            pref = head[:cut]
            for full_lc, sid in name_to_sid.items():
                other = re.sub(r"[^a-z0-9 ]", "", full_lc).strip()
                if other.startswith(pref) or pref.startswith(other[:cut]):
                    return sid
        return None

    # ── 3. Educator → school allocation weights (# active timetables) ──
    edu_alloc: Dict[str, Dict[str, Any]] = {}
    for t in timetables:
        eid = t.get("educator_id")
        if not eid or t.get("is_active") is False:
            continue
        sname = (t.get("school_name") or "").strip()
        sid = tid_to_sid.get(t.get("id")) or (name_to_sid.get(sname.lower()) if sname else None) or _fuzzy(sname.lower())
        slot = edu_alloc.setdefault(eid, {"by_sid": {}, "unmatched": {}})
        if sid:
            slot["by_sid"][sid] = slot["by_sid"].get(sid, 0) + 1
        elif sname:
            slot["unmatched"][sname] = slot["unmatched"].get(sname, 0) + 1

    # ── 4. Group earnings by (educator, school, YYYY-MM) & aggregate ──
    ACCRUAL_STATUSES = {"paid", "approved", "issued", "final"}

    def _is_realised(row: dict) -> bool:
        return (row.get("status") or "").lower() in ACCRUAL_STATUSES

    any_realised = any(_is_realised(e) for e in earnings)

    grouped: Dict[str, Dict[str, Any]] = {}   # key → row

    for e in earnings:
        pid = e.get("profile_id")
        if not pid:
            continue
        # In a mostly-paid ledger, drop pending rows (avoid inflating the
        # ledger with unrealised commitments). In a brand-new/all-pending
        # ledger include everything so the admin at least sees accruals.
        if any_realised and not _is_realised(e):
            continue

        month = _parse_month(e.get("month"))
        if not month or month < since_month or month > up_to:
            continue

        try:
            amount = float(e.get("final_amount") or e.get("calculated_amount") or 0)
        except (TypeError, ValueError):
            amount = 0.0
        if amount <= 0:
            continue

        alloc = edu_alloc.get(pid) or {"by_sid": {}, "unmatched": {}}
        by_sid = alloc["by_sid"]
        unmatched = alloc["unmatched"]
        total_wt = sum(by_sid.values()) + sum(unmatched.values())

        if total_wt <= 0:
            # No timetable → single "General" row so ledger is complete
            key = f"{pid}::{month}"
            slot = grouped.setdefault(key, {
                "educator_id": pid,
                "school_id": "",
                "school_name": "General (no timetable)",
                "month": month,
                "amount": 0.0,
                "sub_rows": [],
            })
            slot["amount"] += amount
            slot["sub_rows"].append({"earning_id": e.get("id"), "amount": amount})
            continue

        for sid, w in by_sid.items():
            share = round(amount * (w / total_wt), 2)
            key = f"{pid}:{sid}:{month}"
            slot = grouped.setdefault(key, {
                "educator_id": pid,
                "school_id": sid,
                "school_name": school_names.get(sid, "Unknown School"),
                "month": month,
                "amount": 0.0,
                "sub_rows": [],
            })
            slot["amount"] += share
            slot["sub_rows"].append({"earning_id": e.get("id"), "amount": share})

        for sname, w in unmatched.items():
            share = round(amount * (w / total_wt), 2)
            key = f"{pid}:UNMATCHED::{sname}::{month}"
            slot = grouped.setdefault(key, {
                "educator_id": pid,
                "school_id": "",
                "school_name": f"Unmatched · {sname}",
                "month": month,
                "amount": 0.0,
                "sub_rows": [],
            })
            slot["amount"] += share
            slot["sub_rows"].append({"earning_id": e.get("id"), "amount": share})

    # ── 5. Upsert into school_expenses ──
    now_iso = datetime.now(timezone.utc).isoformat()
    months_touched = set()

    for row in grouped.values():
        month = row["month"]
        months_touched.add(month)
        expense_date = _next_month_seventh(month)
        amount = round(row["amount"], 2)

        sync_key = f"educator-salary:{row['educator_id']}:{row['school_id'] or 'unmatched'}:{month}"
        educator_name = edu_names.get(row["educator_id"], "")

        existing = await db.school_expenses.find_one({"sync_key": sync_key}, {"_id": 0, "id": 1, "amount": 1})

        pretty_month = datetime.strptime(f"{month}-01", "%Y-%m-%d").strftime("%B %Y")
        description = f"Auto-synced salary · {educator_name or 'Educator'} · {pretty_month}"

        base = {
            "sync_key": sync_key,
            "sync_source": "checkin_auto",
            "school_id": row["school_id"] or "",
            "school_name": row["school_name"],
            "project_id": "",
            "project_name": "",
            "category": CATEGORY,
            "category_name": "Teacher Cost",
            "amount": amount,
            "description": description,
            "expense_date": expense_date,
            "invoice_number": "",
            "vendor_name": educator_name or "",
            "educator_id": row["educator_id"],
            "educator_name": educator_name,
            "educator_email": edu_emails.get(row["educator_id"], ""),
            "payment_status": "pending",
            "payment_mode": "",
            "notes": f"Materialized from CheckIn earnings ({len(row['sub_rows'])} row(s))",
            "attachments": [],
            "expense_breakup_type": "",
            "expense_breakup_value": None,
            "expected_payment_date": expense_date,
            "partial_amount_paid": None,
            "partial_payment_date": "",
            "invoice_file_url": "",
            "allocation_type": "school" if row["school_id"] else "office",
            "allocation_ref_id": row["school_id"] or "",
            "allocation_ref_label": row["school_name"],
            "allocation_program": "",
            "salary_month": month,
            "updated_at": now_iso,
        }

        if existing:
            if float(existing.get("amount") or 0) == amount:
                result["skipped_unchanged"] += 1
            else:
                await db.school_expenses.update_one({"id": existing["id"]}, {"$set": base})
                result["updated"] += 1
        else:
            base["id"] = str(uuid.uuid4())
            base["created_at"] = now_iso
            base["created_by"] = "system:educator-salary-sync"
            base["created_by_name"] = "System · Educator Salary Sync"
            await db.school_expenses.insert_one(base)
            result["inserted"] += 1

        result["total_amount"] += amount
        if not row["school_id"]:
            result["unmatched_amount"] += amount

    result["months"] = sorted(months_touched)
    result["total_amount"] = round(result["total_amount"], 2)
    result["unmatched_amount"] = round(result["unmatched_amount"], 2)
    return result


# ─────────────────────────────────────────────────────────────
# Admin-triggered backfill / re-sync
# ─────────────────────────────────────────────────────────────
@router.post("/school-expenses/import-educator-salaries")
async def import_educator_salaries(
    since_month: str = Query(DEFAULT_BACKFILL_START, description="Earliest month to import, YYYY-MM. Default 2026-04."),
    up_to_month: Optional[str] = Query(None, description="Latest month to import, YYYY-MM. Default: previous month."),
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    # sanity check the month format
    if not re.match(r"^\d{4}-\d{2}$", since_month):
        raise HTTPException(status_code=400, detail="since_month must be YYYY-MM")
    if up_to_month and not re.match(r"^\d{4}-\d{2}$", up_to_month):
        raise HTTPException(status_code=400, detail="up_to_month must be YYYY-MM")
    return await _materialize(since_month, up_to_month)


# ─────────────────────────────────────────────────────────────
# Cron trigger (7th of every month, materializes the previous month)
# ─────────────────────────────────────────────────────────────
@router.post("/cron/educator-salary-materialize")
async def cron_materialize_prev_month(x_cron_secret: Optional[str] = Header(None)):
    """Called by Emergent cron on the 7th of every month at ~04:00 IST.

    Runs `_materialize` for JUST the previous month so the ledger picks up
    August earnings on 7 Sept, September on 7 Oct, etc. The endpoint is
    idempotent — re-running is safe.
    """
    import os
    expected = os.environ.get("WEBHOOK_CRON_SECRET") or ""
    if expected and x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Bad cron secret")

    now = datetime.now(timezone.utc)
    year, month = now.year, now.month - 1
    if month == 0:
        year -= 1
        month = 12
    prev = f"{year:04d}-{month:02d}"
    return await _materialize(since_month=prev, up_to_month=prev)


# ─────────────────────────────────────────────────────────────
# Read: what has been materialized so far
# ─────────────────────────────────────────────────────────────
@router.get("/school-expenses/educator-salary-sync-status")
async def sync_status(user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    pipeline = [
        {"$match": {"sync_source": "checkin_auto", "category": CATEGORY}},
        {"$group": {
            "_id": "$salary_month",
            "count": {"$sum": 1},
            "amount": {"$sum": "$amount"},
        }},
        {"$sort": {"_id": 1}},
    ]
    months: List[Dict[str, Any]] = []
    async for r in db.school_expenses.aggregate(pipeline):
        months.append({"month": r["_id"], "row_count": r["count"], "total_amount": round(float(r["amount"] or 0), 2)})
    total = round(sum(m["total_amount"] for m in months), 2)
    return {"months": months, "total_amount": total}
