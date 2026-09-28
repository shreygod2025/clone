"""Team member performance reports.

  GET /api/team/member-report/{user_id}?period=weekly&ref=YYYY-MM-DD
    → returns tasks, queries, CRM KPIs + time-bucketed breakdown for the member

Used by:
  • AdminMyTeam.jsx  "Download PDF" button
  • Weekly cron that emails managers at 3PM Monday

The `period` argument controls both the window and the bucketing:
  weekly    → 7 days, day-wise breakdown
  monthly   → calendar month, week-wise breakdown
  quarterly → 3 months, month-wise breakdown
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, Query

from routes.shared import db, get_current_user

router = APIRouter(prefix="/team", tags=["team-reports"])

IST = timezone(timedelta(hours=5, minutes=30))


# ─────────────────────── Period helpers ────────────────────────────────
def _ist_today() -> datetime:
    return datetime.now(IST).replace(hour=0, minute=0, second=0, microsecond=0)


def _parse_ref(ref: Optional[str]) -> datetime:
    if ref:
        try:
            d = datetime.strptime(ref, "%Y-%m-%d").replace(tzinfo=IST)
            return d
        except ValueError:
            pass
    return _ist_today()


def _period_bounds(period: str, ref: datetime) -> tuple[datetime, datetime, str, List[tuple[str, datetime, datetime]]]:
    """Return (start, end, label, buckets).

    `buckets` = list of (bucket_key, bucket_start, bucket_end) tuples for the
    time-bucketed breakdown (day/week/month depending on period).
    """
    if period == "weekly":
        # Monday → Sunday IST
        start = ref - timedelta(days=ref.weekday())
        end = start + timedelta(days=7)
        label = f"Week of {start.strftime('%d %b %Y')}"
        buckets = []
        for i in range(7):
            d = start + timedelta(days=i)
            buckets.append((d.strftime("%Y-%m-%d"), d, d + timedelta(days=1)))
        return start, end, label, buckets

    if period == "monthly":
        start = ref.replace(day=1)
        last_day = monthrange(start.year, start.month)[1]
        end = start.replace(day=last_day) + timedelta(days=1)
        label = start.strftime("%B %Y")
        # Week-wise buckets: ISO week numbers within the month
        buckets: List[tuple[str, datetime, datetime]] = []
        cursor = start
        wk = 1
        while cursor < end:
            wk_end = cursor + timedelta(days=7 - cursor.weekday())
            if wk_end > end:
                wk_end = end
            buckets.append((f"W{wk} · {cursor.strftime('%d %b')}", cursor, wk_end))
            cursor = wk_end
            wk += 1
        return start, end, label, buckets

    if period == "quarterly":
        # 3-month window ending at ref's month
        q_start_month = ((ref.month - 1) // 3) * 3 + 1
        start = ref.replace(month=q_start_month, day=1)
        # 3 months forward
        y = start.year
        m = start.month + 3
        if m > 12:
            y += 1
            m -= 12
        end = start.replace(year=y, month=m, day=1)
        label = f"Q{((q_start_month - 1) // 3) + 1} {start.year}"
        # Month-wise buckets
        buckets = []
        for i in range(3):
            ym = start.month + i
            yy = start.year + (ym - 1) // 12
            mm = ((ym - 1) % 12) + 1
            b_start = start.replace(year=yy, month=mm, day=1)
            last_day = monthrange(yy, mm)[1]
            b_end = b_start.replace(day=last_day) + timedelta(days=1)
            buckets.append((b_start.strftime("%b %Y"), b_start, b_end))
        return start, end, label, buckets

    if period == "yearly":
        start = ref.replace(month=1, day=1)
        end = start.replace(year=start.year + 1)
        label = f"FY {start.year}"
        buckets = []
        for i in range(12):
            yy = start.year + (i // 12)
            mm = (i % 12) + 1
            b_start = start.replace(year=yy, month=mm, day=1)
            last_day = monthrange(yy, mm)[1]
            b_end = b_start.replace(day=last_day) + timedelta(days=1)
            buckets.append((b_start.strftime("%b"), b_start, b_end))
        return start, end, label, buckets

    if period == "daily":
        start = ref
        end = start + timedelta(days=1)
        label = start.strftime("%d %b %Y")
        buckets = [("Today", start, end)]
        return start, end, label, buckets

    raise HTTPException(status_code=400, detail=f"Unknown period '{period}'")


# ─────────────────────── Metric helpers ────────────────────────────────
async def _count_in_window(collection: str, uid_field: str, uid: str,
                            date_field: str, start: datetime, end: datetime,
                            extra: Optional[Dict[str, Any]] = None) -> int:
    """Count docs where uid matches AND date_field ∈ [start, end).

    Handles both datetime and ISO-string dates (tz-suffixed & naïve).
    """
    base = {uid_field: uid}
    if extra:
        base.update(extra)
    start_utc = start.astimezone(timezone.utc)
    end_utc = end.astimezone(timezone.utc)
    dt_q = {**base, date_field: {"$gte": start_utc, "$lt": end_utc}}
    str_q = {**base, date_field: {"$gte": start_utc.isoformat(), "$lt": end_utc.isoformat()}}
    naive_q = {**base, date_field: {
        "$gte": start_utc.replace(tzinfo=None).isoformat(),
        "$lt": end_utc.replace(tzinfo=None).isoformat(),
    }}
    counts = []
    for q in (dt_q, str_q, naive_q):
        try:
            counts.append(await db[collection].count_documents(q))
        except Exception:
            counts.append(0)
    return max(counts)


async def _fetch_in_window(collection: str, uid_field: str, uid: str,
                            date_field: str, start: datetime, end: datetime,
                            projection: Optional[Dict[str, int]] = None,
                            extra: Optional[Dict[str, Any]] = None,
                            limit: int = 500) -> List[Dict[str, Any]]:
    """Fetch matching docs — combines datetime + ISO-string shapes via $or."""
    start_utc = start.astimezone(timezone.utc)
    end_utc = end.astimezone(timezone.utc)
    q: Dict[str, Any] = {
        uid_field: uid,
        "$or": [
            {date_field: {"$gte": start_utc, "$lt": end_utc}},
            {date_field: {"$gte": start_utc.isoformat(), "$lt": end_utc.isoformat()}},
            {date_field: {
                "$gte": start_utc.replace(tzinfo=None).isoformat(),
                "$lt": end_utc.replace(tzinfo=None).isoformat(),
            }},
        ],
    }
    if extra:
        # Merge safely — don't clobber the $or clause
        for k, v in extra.items():
            if k == "$or":
                q.setdefault("$and", []).append({"$or": v})
            else:
                q[k] = v
    try:
        cur = db[collection].find(q, projection or {"_id": 0}).sort(date_field, -1).limit(limit)
        return await cur.to_list(limit)
    except Exception:
        return []


async def _get_member(user_id: str) -> Dict[str, Any]:
    m = await db.team_users.find_one({"id": user_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Team member not found")
    role = None
    if m.get("role_id"):
        role = await db.roles.find_one({"id": m["role_id"]}, {"_id": 0, "name": 1})
    return {
        "id": m.get("id"),
        "name": m.get("name") or m.get("email") or "Team member",
        "email": m.get("email") or "",
        "phone": m.get("phone") or "",
        "role_name": (role or {}).get("name") or m.get("role_name") or "",
        "manager_name": m.get("manager_name") or "",
    }


async def _is_admin_or_manager(user: dict, target_id: str) -> bool:
    role = (user.get("role") or "").lower()
    if role in {"admin", "super_admin", "superadmin"}:
        return True
    if user.get("id") == target_id or user.get("email") == target_id:
        return True
    # Check reports_to chain
    try:
        target = await db.team_users.find_one({"id": target_id}, {"reports_to": 1})
        if target and target.get("reports_to") == user.get("id"):
            return True
    except Exception:
        pass
    return False


async def _bucket_counts(uid: str, buckets: List[tuple[str, datetime, datetime]]) -> List[Dict[str, Any]]:
    """For each bucket, roll up per-bucket metrics."""
    out = []
    for key, b_start, b_end in buckets:
        tasks_assigned = await _count_in_window(
            "tasks", "assigned_to", uid, "created_at", b_start, b_end,
        )
        tasks_completed = await _count_in_window(
            "tasks", "assigned_to", uid, "completed_at", b_start, b_end,
        )
        queries_assigned = await _count_in_window(
            "support_queries", "assigned_to", uid, "created_at", b_start, b_end,
        )
        queries_resolved = await _count_in_window(
            "support_queries", "assigned_to", uid, "resolved_at", b_start, b_end,
            extra={"status": {"$in": ["resolved", "closed"]}},
        )
        # Field visits + calls
        field_visits = await _count_in_window(
            "telecalling_activity", "user_id", uid, "created_at", b_start, b_end,
            extra={"event": "call_picked"},
        ) if False else 0  # replaced below
        # Real field visits: count entries in field_reports.school_visits
        try:
            fv_pipe = [
                {"$match": {
                    "user_id": uid,
                    "$or": [
                        {"created_at": {"$gte": b_start.astimezone(timezone.utc), "$lt": b_end.astimezone(timezone.utc)}},
                        {"created_at": {"$gte": b_start.astimezone(timezone.utc).isoformat(), "$lt": b_end.astimezone(timezone.utc).isoformat()}},
                    ],
                }},
                {"$project": {"n": {"$size": {"$ifNull": ["$school_visits", []]}}}},
                {"$group": {"_id": None, "n": {"$sum": "$n"}}},
            ]
            agg = await db.field_reports.aggregate(fv_pipe).to_list(1)
            field_visits = int((agg[0] or {}).get("n") or 0) if agg else 0
        except Exception:
            field_visits = 0
        calls_connected = await _count_in_window(
            "telecalling_activity", "user_id", uid, "created_at", b_start, b_end,
            extra={"event": "call_picked"},
        )
        out.append({
            "key": key,
            "start": b_start.strftime("%Y-%m-%d"),
            "end": (b_end - timedelta(seconds=1)).strftime("%Y-%m-%d"),
            "tasks_assigned":   tasks_assigned,
            "tasks_completed":  tasks_completed,
            "queries_assigned": queries_assigned,
            "queries_resolved": queries_resolved,
            "field_visits":     field_visits,
            "calls_connected":  calls_connected,
        })
    return out


# ─────────────────────── Endpoint ──────────────────────────────────────
@router.get("/member-report/{user_id}")
async def team_member_report(
    user_id: str,
    period: str = Query("weekly", pattern="^(daily|weekly|monthly|quarterly|yearly)$"),
    ref: Optional[str] = Query(None, description="Anchor date YYYY-MM-DD; defaults to today"),
    user: dict = Depends(get_current_user),
):
    if not await _is_admin_or_manager(user, user_id):
        raise HTTPException(status_code=403, detail="You are not allowed to view this report")

    member = await _get_member(user_id)
    ref_dt = _parse_ref(ref)
    start, end, period_label, buckets = _period_bounds(period, ref_dt)

    # ── Roll-up totals ────────────────────────────────────────────
    tasks_assigned = await _fetch_in_window(
        "tasks", "assigned_to", user_id, "created_at", start, end,
        projection={"_id": 0, "id": 1, "title": 1, "status": 1, "priority": 1,
                    "created_at": 1, "completed_at": 1, "due_date": 1,
                    "assigned_by_name": 1, "project_name": 1},
    )
    tasks_completed = await _fetch_in_window(
        "tasks", "assigned_to", user_id, "completed_at", start, end,
        projection={"_id": 0, "id": 1, "title": 1, "status": 1, "priority": 1,
                    "created_at": 1, "completed_at": 1, "due_date": 1,
                    "assigned_by_name": 1, "project_name": 1},
    )
    queries_assigned = await _fetch_in_window(
        "support_queries", "assigned_to", user_id, "created_at", start, end,
        projection={"_id": 0, "id": 1, "ticket_number": 1, "main_category": 1,
                    "category": 1, "sub_category": 1, "status": 1, "priority": 1,
                    "created_at": 1, "resolved_at": 1, "name": 1, "email": 1},
    )
    queries_resolved_list = await _fetch_in_window(
        "support_queries", "assigned_to", user_id, "resolved_at", start, end,
        projection={"_id": 0, "id": 1, "ticket_number": 1, "status": 1, "priority": 1,
                    "created_at": 1, "resolved_at": 1, "name": 1},
        extra={"status": {"$in": ["resolved", "closed"]}},
    )

    # ── CRM totals for this user ──────────────────────────────────
    leads_added = await _count_in_window(
        "school_inquiries", "assigned_to", user_id, "created_at", start, end,
    )
    schools_onboarded = await _count_in_window(
        "school_inquiries", "assigned_to", user_id, "onboarded_at", start, end,
        extra={"status": {"$in": ["onboarded", "active"]}},
    )
    student_leads = await _count_in_window(
        "student_inquiries", "assigned_to", user_id, "created_at", start, end,
    )

    # ── Field & telecalling totals ────────────────────────────────
    calls_made = await _count_in_window(
        "telecalling_activity", "user_id", user_id, "created_at", start, end,
        extra={"event": "call_made"},
    )
    calls_connected_total = await _count_in_window(
        "telecalling_activity", "user_id", user_id, "created_at", start, end,
        extra={"event": "call_picked"},
    )
    # Field visits total (sum of school_visits across the user's reports)
    try:
        fv_pipe = [
            {"$match": {
                "user_id": user_id,
                "$or": [
                    {"created_at": {"$gte": start.astimezone(timezone.utc), "$lt": end.astimezone(timezone.utc)}},
                    {"created_at": {"$gte": start.astimezone(timezone.utc).isoformat(), "$lt": end.astimezone(timezone.utc).isoformat()}},
                ],
            }},
            {"$project": {
                "visits":  {"$size": {"$ifNull": ["$school_visits", []]}},
                "entries": {"$size": {"$filter": {"input": {"$ifNull": ["$school_visits", []]}, "cond": {"$eq": ["$$this.got_entry", "yes"]}}}},
                "leads":   {"$size": {"$filter": {"input": {"$ifNull": ["$school_visits", []]}, "cond": {"$eq": ["$$this.lead_interested", "yes"]}}}},
                "distance_km": {"$ifNull": ["$distance_km", 0]},
            }},
            {"$group": {
                "_id": None,
                "visits":  {"$sum": "$visits"},
                "entries": {"$sum": "$entries"},
                "leads":   {"$sum": "$leads"},
                "km":      {"$sum": "$distance_km"},
                "days":    {"$sum": 1},
            }},
        ]
        fv_agg = await db.field_reports.aggregate(fv_pipe).to_list(1)
        fv_row = fv_agg[0] if fv_agg else {}
    except Exception:
        fv_row = {}

    field_totals = {
        "days":    int(fv_row.get("days") or 0),
        "visits":  int(fv_row.get("visits") or 0),
        "entries": int(fv_row.get("entries") or 0),
        "leads":   int(fv_row.get("leads") or 0),
        "km":      round(float(fv_row.get("km") or 0), 2),
    }

    # ── Bucket-wise breakdown ─────────────────────────────────────
    bucket_data = await _bucket_counts(user_id, buckets)

    # ── Breakdown unit label for the frontend ─────────────────────
    unit_label = {
        "daily": "hour",
        "weekly": "day",
        "monthly": "week",
        "quarterly": "month",
        "yearly": "month",
    }.get(period, "day")

    return {
        "user": member,
        "period": {
            "type": period,
            "start": start.strftime("%Y-%m-%d"),
            "end": (end - timedelta(seconds=1)).strftime("%Y-%m-%d"),
            "label": period_label,
        },
        "breakdown_unit": unit_label,
        "buckets": bucket_data,
        "totals": {
            "tasks_assigned":   len(tasks_assigned),
            "tasks_completed":  len(tasks_completed),
            "queries_assigned": len(queries_assigned),
            "queries_resolved": len(queries_resolved_list),
            "leads_added":      leads_added,
            "schools_onboarded": schools_onboarded,
            "student_leads":    student_leads,
            "calls_made":       calls_made,
            "calls_connected":  calls_connected_total,
            "field_visits":     field_totals["visits"],
            "field_entries":    field_totals["entries"],
            "field_leads":      field_totals["leads"],
            "field_days":       field_totals["days"],
            "field_km":         field_totals["km"],
        },
        "tasks": {
            "assigned":  tasks_assigned,
            "completed": tasks_completed,
        },
        "queries": {
            "assigned": queries_assigned,
            "resolved": queries_resolved_list,
        },
        "crm": {
            "leads_added":       leads_added,
            "schools_onboarded": schools_onboarded,
            "student_leads":     student_leads,
        },
    }
