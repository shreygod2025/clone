"""
KPI catalog & per-user performance metrics.

Endpoints:
  GET /api/kpis/catalog                     -> list of available KPIs (grouped)
  GET /api/users/{user_id}/performance      -> computed metrics for that user
                                               query: month (1-12), year (YYYY)
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone, timedelta
from calendar import monthrange
from typing import Optional

from routes.shared import db, get_current_user

router = APIRouter(tags=["kpis"])


# ── KPI Catalog ───────────────────────────────────────────────────────────────
# Each KPI has: id, label, category, unit, description
# Only these are computable today (backed by real data in preview/prod).
KPI_CATALOG = [
    # Support Center — sourced from `support_queries` (assigned_to = team_user.id)
    {"id": "support_tickets_assigned", "label": "No. of tickets assigned", "category": "Support Center", "unit": "count"},
    {"id": "support_tickets_resolved", "label": "No. of tickets resolved", "category": "Support Center", "unit": "count"},
    {"id": "support_avg_resolution_hours", "label": "Avg resolution time (hours)", "category": "Support Center", "unit": "hours"},
    {"id": "support_first_response_hours", "label": "Avg first-response time (hours)", "category": "Support Center", "unit": "hours"},
    {"id": "support_resolution_rate", "label": "Resolution rate (%)", "category": "Support Center", "unit": "%"},
    {"id": "support_sla_breach_over_3d", "label": "Tickets pending > 3 days", "category": "Support Center", "unit": "count"},

    # Sales B2B — sourced from `school_inquiries`
    {"id": "b2b_leads_assigned", "label": "No. of school leads assigned", "category": "Sales — B2B", "unit": "count"},
    {"id": "b2b_schools_onboarded", "label": "No. of schools onboarded", "category": "Sales — B2B", "unit": "count"},
    {"id": "b2b_conversion_rate", "label": "Conversion rate (%)", "category": "Sales — B2B", "unit": "%"},
    {"id": "b2b_revenue_generated", "label": "Revenue generated (₹)", "category": "Sales — B2B", "unit": "₹"},
    {"id": "b2b_avg_deal_size", "label": "Avg deal size (₹)", "category": "Sales — B2B", "unit": "₹"},

    # Sales B2C — sourced from `inquiry_leads` (inquiry_type = student)
    {"id": "b2c_leads_assigned", "label": "No. of student leads assigned", "category": "Sales — B2C", "unit": "count"},
    {"id": "b2c_bookings_closed", "label": "No. of bookings/orders closed", "category": "Sales — B2C", "unit": "count"},
    {"id": "b2c_conversion_rate", "label": "Conversion rate (%)", "category": "Sales — B2C", "unit": "%"},
    {"id": "b2c_revenue_generated", "label": "Revenue generated (₹)", "category": "Sales — B2C", "unit": "₹"},

    # Task & Project Delivery — sourced from `tasks` and `projects`
    {"id": "tasks_assigned", "label": "Tasks assigned", "category": "Task & Project Delivery", "unit": "count"},
    {"id": "tasks_completed", "label": "Tasks completed", "category": "Task & Project Delivery", "unit": "count"},
    {"id": "tasks_overdue", "label": "Tasks overdue", "category": "Task & Project Delivery", "unit": "count", "aggregation": "snapshot"},
    {"id": "projects_member_of", "label": "Projects assigned to", "category": "Task & Project Delivery", "unit": "count", "aggregation": "snapshot"},
    {"id": "projects_leading", "label": "Projects leading", "category": "Task & Project Delivery", "unit": "count", "aggregation": "snapshot"},
]

KPI_BY_ID = {k["id"]: k for k in KPI_CATALOG}


@router.get("/kpis/catalog")
async def get_kpi_catalog(user: dict = Depends(get_current_user)):
    """Return all KPIs available for role assignment, grouped by category."""
    groups = {}
    for kpi in KPI_CATALOG:
        groups.setdefault(kpi["category"], []).append(kpi)
    return {"catalog": KPI_CATALOG, "grouped": groups}


# ── Access control helper ─────────────────────────────────────────────────────
async def _is_admin_or_manager_of(requester: dict, target_user_id: str) -> bool:
    """Admin can view any user. A team_user can view a target user if the target
    reports_to (directly or transitively) the requester."""
    if requester.get("role") == "admin":
        return True
    requester_id = requester.get("id") or requester.get("user_id")
    if not requester_id:
        return False
    # Walk the reports_to chain from target upward
    seen = set()
    current_id = target_user_id
    while current_id and current_id not in seen:
        seen.add(current_id)
        doc = await db.team_users.find_one({"id": current_id}, {"_id": 0, "reports_to": 1})
        if not doc:
            return False
        manager_id = (doc.get("reports_to") or "").strip()
        if not manager_id:
            return False
        if manager_id == requester_id:
            return True
        current_id = manager_id
    return False


# ── Metric computation ────────────────────────────────────────────────────────
def _month_bounds_iso(month: int, year: int) -> tuple[str, str]:
    """Return ISO strings for start and end (inclusive) of the given month."""
    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="month must be 1-12")
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, 999999, tzinfo=timezone.utc)
    return start.isoformat(), end.isoformat()


def _scope_bounds_iso(scope: str, ref_iso: Optional[str] = None) -> tuple[str, str]:
    """Return ISO (start, end) for scope in {'today','week','month','year'} anchored to ref date.

    ref_iso is a YYYY-MM-DD string. Defaults to today (UTC).
    """
    if ref_iso:
        try:
            ref = datetime.strptime(ref_iso[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ref date; use YYYY-MM-DD")
    else:
        ref = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    scope = (scope or "today").lower()
    if scope == "today":
        start = ref.replace(hour=0, minute=0, second=0, microsecond=0)
        end = ref.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif scope == "week":
        weekday = ref.weekday()  # Mon=0
        start = (ref - timedelta(days=weekday)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = (start + timedelta(days=6)).replace(hour=23, minute=59, second=59, microsecond=999999)
    elif scope == "month":
        start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_day = monthrange(ref.year, ref.month)[1]
        end = ref.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
    elif scope == "year":
        start = ref.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = ref.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
    else:
        raise HTTPException(status_code=400, detail="scope must be one of: today, week, month, year")
    return start.isoformat(), end.isoformat()


async def _compute_support_metrics(user_id: str, start_iso: str, end_iso: str) -> dict:
    """Metrics from `support_queries` where assigned_to == user_id and created_at in range."""
    coll = db.support_queries
    base = {"assigned_to": user_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}

    assigned = await coll.count_documents(base)
    resolved_docs = await coll.find(
        {**base, "status": {"$in": ["resolved", "closed"]}},
        {"_id": 0, "created_at": 1, "updated_at": 1, "replies": 1}
    ).to_list(2000)
    resolved = len(resolved_docs)

    # Avg resolution time (hours) — updated_at - created_at for resolved tickets
    total_hrs = 0.0
    counted = 0
    for d in resolved_docs:
        try:
            c = datetime.fromisoformat(d.get("created_at").replace("Z", "+00:00"))
            u = datetime.fromisoformat(d.get("updated_at").replace("Z", "+00:00"))
            hrs = (u - c).total_seconds() / 3600.0
            if hrs >= 0:
                total_hrs += hrs
                counted += 1
        except Exception:
            continue
    avg_resolution_hours = round(total_hrs / counted, 2) if counted else 0

    # First response time (hours) — first reply timestamp - created_at
    first_response_hours = 0.0
    fr_count = 0
    fr_docs = await coll.find(base, {"_id": 0, "created_at": 1, "replies": 1}).to_list(2000)
    for d in fr_docs:
        replies = d.get("replies") or []
        if not replies:
            continue
        try:
            c = datetime.fromisoformat(d.get("created_at").replace("Z", "+00:00"))
            r0 = replies[0]
            ts = r0.get("created_at") or r0.get("timestamp") or r0.get("at")
            if not ts:
                continue
            r = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
            hrs = (r - c).total_seconds() / 3600.0
            if hrs >= 0:
                first_response_hours += hrs
                fr_count += 1
        except Exception:
            continue
    avg_first_response = round(first_response_hours / fr_count, 2) if fr_count else 0

    resolution_rate = round((resolved / assigned * 100.0), 1) if assigned else 0.0

    # SLA breach: tickets currently open AND created_at > 3 days ago (regardless of month filter for realtime pending)
    three_days_ago = datetime.now(timezone.utc).timestamp() - (3 * 86400)
    sla_query = {
        "assigned_to": user_id,
        "status": {"$nin": ["resolved", "closed"]},
    }
    all_open = await coll.find(sla_query, {"_id": 0, "created_at": 1}).to_list(2000)
    breach = 0
    for d in all_open:
        try:
            c = datetime.fromisoformat(d.get("created_at").replace("Z", "+00:00"))
            if c.timestamp() < three_days_ago:
                breach += 1
        except Exception:
            continue

    return {
        "support_tickets_assigned": assigned,
        "support_tickets_resolved": resolved,
        "support_avg_resolution_hours": avg_resolution_hours,
        "support_first_response_hours": avg_first_response,
        "support_resolution_rate": resolution_rate,
        "support_sla_breach_over_3d": breach,
    }


async def _compute_b2b_metrics(user_id: str, start_iso: str, end_iso: str) -> dict:
    """Metrics from `school_inquiries`."""
    coll = db.school_inquiries
    base = {"assigned_to": user_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}

    assigned = await coll.count_documents(base)
    onboarded_docs = await coll.find(
        {**base, "status": {"$in": ["converted", "onboarded", "ONBOARDED"]}},
        {"_id": 0, "conversion_amount": 1, "onboarding_data": 1}
    ).to_list(2000)
    onboarded = len(onboarded_docs)

    revenue = 0.0
    for d in onboarded_docs:
        amt = d.get("conversion_amount")
        if amt in (None, ""):
            amt = (d.get("onboarding_data") or {}).get("total_amount") or 0
        try:
            revenue += float(amt)
        except Exception:
            continue

    conversion_rate = round((onboarded / assigned * 100.0), 1) if assigned else 0.0
    avg_deal = round(revenue / onboarded, 0) if onboarded else 0

    return {
        "b2b_leads_assigned": assigned,
        "b2b_schools_onboarded": onboarded,
        "b2b_conversion_rate": conversion_rate,
        "b2b_revenue_generated": round(revenue, 2),
        "b2b_avg_deal_size": avg_deal,
    }


async def _compute_b2c_metrics(user_id: str, start_iso: str, end_iso: str) -> dict:
    """Metrics from `inquiry_leads` where inquiry_type = student."""
    coll = db.inquiry_leads
    base = {
        "assigned_to": user_id,
        "inquiry_type": "student",
        "created_at": {"$gte": start_iso, "$lte": end_iso},
    }
    assigned = await coll.count_documents(base)
    closed_docs = await coll.find(
        {**base, "status": {"$in": ["converted", "closed_won", "booked"]}},
        {"_id": 0, "conversion_amount": 1, "converted_amount": 1}
    ).to_list(2000)
    closed = len(closed_docs)

    revenue = 0.0
    for d in closed_docs:
        amt = d.get("conversion_amount") or d.get("converted_amount") or 0
        try:
            revenue += float(amt)
        except Exception:
            continue

    conversion_rate = round((closed / assigned * 100.0), 1) if assigned else 0.0

    return {
        "b2c_leads_assigned": assigned,
        "b2c_bookings_closed": closed,
        "b2c_conversion_rate": conversion_rate,
        "b2c_revenue_generated": round(revenue, 2),
    }


async def _compute_task_metrics(user_id: str, start_iso: str, end_iso: str) -> dict:
    """Task & Project Delivery metrics.

    - tasks_assigned:   tasks with assigned_to=user AND created_at in month
    - tasks_completed:  tasks with assigned_to=user AND completed_at in month
    - tasks_overdue:    tasks with assigned_to=user AND due_date < now AND status != completed
                        (real-time snapshot — not month-scoped so admin sees the live count)
    - projects_member_of: projects where member_ids contains user (all-time)
    - projects_leading:   projects where lead_id == user (all-time)
    """
    tasks_assigned = await db.tasks.count_documents({
        "assigned_to": user_id,
        "created_at": {"$gte": start_iso, "$lte": end_iso},
    })
    tasks_completed = await db.tasks.count_documents({
        "assigned_to": user_id,
        "status": "completed",
        "completed_at": {"$gte": start_iso, "$lte": end_iso},
    })
    now_iso = datetime.now(timezone.utc).isoformat()
    tasks_overdue = await db.tasks.count_documents({
        "assigned_to": user_id,
        "due_date": {"$lt": now_iso, "$ne": None},
        "status": {"$ne": "completed"},
    })
    projects_member_of = await db.projects.count_documents({
        "$or": [{"member_ids": user_id}, {"lead_id": user_id}]
    })
    projects_leading = await db.projects.count_documents({"lead_id": user_id})

    return {
        "tasks_assigned": tasks_assigned,
        "tasks_completed": tasks_completed,
        "tasks_overdue": tasks_overdue,
        "projects_member_of": projects_member_of,
        "projects_leading": projects_leading,
    }


@router.get("/users/{user_id}/performance")
async def get_user_performance(
    user_id: str,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    user: dict = Depends(get_current_user),
):
    """Return the user's performance metrics for the selected month/year."""
    target = await db.team_users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if not await _is_admin_or_manager_of(user, user_id):
        raise HTTPException(status_code=403, detail="You are not allowed to view this user's performance")

    role_id = target.get("role_id") or ""
    role_doc = await db.roles.find_one({"id": role_id}, {"_id": 0}) if role_id else None
    role_kpi_ids = (role_doc or {}).get("kpis", []) if role_doc else []

    if not role_kpi_ids:
        return {
            "user": {"id": target.get("id"), "name": target.get("name"),
                     "email": target.get("email"), "role_id": role_id,
                     "role_name": (role_doc or {}).get("name", "")},
            "month": month, "year": year,
            "kpis": [], "metrics": {},
            "message": "No KPIs configured for this user's role. Assign KPIs to the role first."
        }

    start_iso, end_iso = _month_bounds_iso(month, year)
    metrics = await _compute_selected_metrics(user_id, role_kpi_ids, start_iso, end_iso)
    kpis_out = _shape_kpis_out(role_kpi_ids, metrics)

    return {
        "user": {
            "id": target.get("id"),
            "name": target.get("name"),
            "email": target.get("email"),
            "role_id": role_id,
            "role_name": (role_doc or {}).get("name", ""),
        },
        "month": month,
        "year": year,
        "kpis": kpis_out,
        "metrics": metrics,
    }


@router.get("/me/performance")
async def get_my_performance(
    scope: str = Query("today", pattern="^(today|week|month|year)$"),
    ref: Optional[str] = Query(None, description="Anchor date YYYY-MM-DD; defaults to today"),
    user: dict = Depends(get_current_user),
):
    """Return the current user's performance for a scoped time range.

    Used by the Admin Dashboard KPI strip.
    """
    uid = user.get("id") or user.get("user_id") or ""
    if not uid:
        raise HTTPException(status_code=400, detail="Missing user id in token")

    tu = await db.team_users.find_one({"id": uid}, {"_id": 0, "role_id": 1})
    role_id = (tu or {}).get("role_id") or ""
    role_doc = await db.roles.find_one({"id": role_id}, {"_id": 0}) if role_id else None
    role_kpi_ids = (role_doc or {}).get("kpis", []) if role_doc else []

    if not role_kpi_ids:
        role_kpi_ids = [
            "tasks_assigned", "tasks_completed", "tasks_overdue",
            "projects_leading", "projects_member_of",
        ]

    start_iso, end_iso = _scope_bounds_iso(scope, ref)
    metrics = await _compute_selected_metrics(uid, role_kpi_ids, start_iso, end_iso)
    kpis_out = _shape_kpis_out(role_kpi_ids, metrics)
    return {
        "user_id": uid,
        "scope": scope,
        "ref": ref,
        "start": start_iso,
        "end": end_iso,
        "kpis": kpis_out,
        "metrics": metrics,
    }


# ── Time-series buckets ───────────────────────────────────────────────────────
def _buckets_for_scope(scope: str, ref_iso: Optional[str]) -> list:
    """Return list of {label, start_iso, end_iso} for the requested scope.

    - month   → weekly buckets covering the calendar month of ref
    - quarter → 3 monthly buckets of the quarter containing ref
    - year    → 4 quarterly buckets (Q1..Q4) of the year containing ref
    """
    if ref_iso:
        try:
            ref = datetime.strptime(ref_iso[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ref date; use YYYY-MM-DD")
    else:
        ref = datetime.now(timezone.utc)

    buckets = []
    if scope == "month":
        y, m = ref.year, ref.month
        last_day = monthrange(y, m)[1]
        # Week buckets aligned to calendar (Mon-Sun); may partially spill outside month
        # We keep buckets inside the calendar month (start/end clipped to month bounds).
        month_start = datetime(y, m, 1, tzinfo=timezone.utc)
        month_end = datetime(y, m, last_day, 23, 59, 59, 999999, tzinfo=timezone.utc)
        # First week: month_start → next Sunday (weekday 6)
        wk_start = month_start
        wk_idx = 1
        while wk_start <= month_end:
            days_to_sunday = 6 - wk_start.weekday()
            wk_end = (wk_start + timedelta(days=days_to_sunday)).replace(hour=23, minute=59, second=59, microsecond=999999)
            if wk_end > month_end:
                wk_end = month_end
            buckets.append({
                "label": f"Wk {wk_idx}",
                "sub":   f"{wk_start.strftime('%d %b')} – {wk_end.strftime('%d %b')}",
                "start_iso": wk_start.isoformat(),
                "end_iso":   wk_end.isoformat(),
            })
            wk_start = (wk_end + timedelta(microseconds=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            wk_idx += 1
    elif scope == "quarter":
        y = ref.year
        q = (ref.month - 1) // 3  # 0..3
        first_month = q * 3 + 1
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        for i in range(3):
            m = first_month + i
            last_day = monthrange(y, m)[1]
            buckets.append({
                "label": months[m - 1],
                "sub":   f"{months[m - 1]} {y}",
                "start_iso": datetime(y, m, 1, tzinfo=timezone.utc).isoformat(),
                "end_iso":   datetime(y, m, last_day, 23, 59, 59, 999999, tzinfo=timezone.utc).isoformat(),
            })
    elif scope == "year":
        y = ref.year
        for q_idx in range(4):
            start_m = q_idx * 3 + 1
            end_m = start_m + 2
            last_day = monthrange(y, end_m)[1]
            buckets.append({
                "label": f"Q{q_idx + 1}",
                "sub":   f"Q{q_idx + 1} {y}",
                "start_iso": datetime(y, start_m, 1, tzinfo=timezone.utc).isoformat(),
                "end_iso":   datetime(y, end_m, last_day, 23, 59, 59, 999999, tzinfo=timezone.utc).isoformat(),
            })
    else:
        raise HTTPException(status_code=400, detail="scope must be month | quarter | year")
    return buckets


async def _timeseries_payload(uid: str, scope: str, ref_iso: Optional[str]) -> dict:
    """Compute the KPI catalog + time-series buckets payload for a user."""
    target = await db.team_users.find_one({"id": uid}, {"_id": 0})
    role_id = (target or {}).get("role_id") or ""
    role_doc = await db.roles.find_one({"id": role_id}, {"_id": 0}) if role_id else None
    role_kpi_ids = (role_doc or {}).get("kpis", []) if role_doc else []

    if not role_kpi_ids:
        role_kpi_ids = [
            "tasks_assigned", "tasks_completed", "tasks_overdue",
            "projects_leading", "projects_member_of",
        ]

    buckets = _buckets_for_scope(scope, ref_iso)

    # Compute metrics for each bucket in parallel-friendly sequential loop
    bucket_metrics = []
    totals: dict = {kid: 0 for kid in role_kpi_ids}
    for b in buckets:
        m = await _compute_selected_metrics(uid, role_kpi_ids, b["start_iso"], b["end_iso"])
        bucket_metrics.append(m)
        for kid in role_kpi_ids:
            v = m.get(kid, 0) or 0
            try:
                totals[kid] += float(v)
            except (TypeError, ValueError):
                pass

    # Shape per-KPI series
    kpi_series = []
    for kid in role_kpi_ids:
        meta = KPI_BY_ID.get(kid)
        if not meta:
            continue
        series = []
        for i, b in enumerate(buckets):
            series.append({
                "label": b["label"],
                "sub":   b["sub"],
                "value": bucket_metrics[i].get(kid, 0),
            })
        # Trend: last vs previous bucket
        trend = 0
        if len(series) >= 2:
            last = series[-1]["value"] or 0
            prev = series[-2]["value"] or 0
            try:
                trend = float(last) - float(prev)
            except (TypeError, ValueError):
                trend = 0
        # Average across non-null buckets (for rate/hour KPIs — sum doesn't make sense)
        avg = 0
        nonzero = [s["value"] for s in series if s["value"] not in (None, 0)]
        if nonzero:
            try:
                avg = round(sum(float(v) for v in nonzero) / len(nonzero), 2)
            except (TypeError, ValueError):
                avg = 0

        total_val = totals.get(kid, 0)
        aggregation = meta.get("aggregation", "sum")
        # For snapshot KPIs (project counts, current overdue) — display current count only
        if aggregation == "snapshot":
            display = series[-1]["value"] if series else 0
        elif meta.get("unit") in ("%", "hours"):
            # Rate/hour KPIs → average across non-zero buckets
            display = avg
        else:
            display = total_val

        kpi_series.append({
            **meta,
            "series": series,
            "trend": trend,
            "total": total_val,
            "avg": avg,
            "display_value": display,
        })

    return {
        "user": {
            "id": (target or {}).get("id", uid),
            "name": (target or {}).get("name", ""),
            "email": (target or {}).get("email", ""),
            "role_id": role_id,
            "role_name": (role_doc or {}).get("name", ""),
        },
        "scope": scope,
        "ref": ref_iso,
        "buckets": [{"label": b["label"], "sub": b["sub"]} for b in buckets],
        "kpis": kpi_series,
    }


@router.get("/me/performance/timeseries")
async def get_my_performance_timeseries(
    scope: str = Query("month", pattern="^(month|quarter|year)$"),
    ref: Optional[str] = Query(None, description="Anchor date YYYY-MM-DD; defaults to today"),
    user: dict = Depends(get_current_user),
):
    """Time-series performance for the current user across weeks/months/quarters."""
    uid = user.get("id") or user.get("user_id") or ""
    if not uid:
        raise HTTPException(status_code=400, detail="Missing user id in token")
    return await _timeseries_payload(uid, scope, ref)


@router.get("/users/{user_id}/performance/timeseries")
async def get_user_performance_timeseries(
    user_id: str,
    scope: str = Query("month", pattern="^(month|quarter|year)$"),
    ref: Optional[str] = Query(None, description="Anchor date YYYY-MM-DD; defaults to today"),
    user: dict = Depends(get_current_user),
):
    """Time-series performance for a specific user (admin/manager only)."""
    target = await db.team_users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if not await _is_admin_or_manager_of(user, user_id):
        raise HTTPException(status_code=403, detail="Not allowed to view this user's performance")
    return await _timeseries_payload(user_id, scope, ref)


# ── Shared metric routing ─────────────────────────────────────────────────────
async def _compute_selected_metrics(
    user_id: str, role_kpi_ids: list, start_iso: str, end_iso: str
) -> dict:
    metrics: dict = {}
    needs_support = any(k.startswith("support_") for k in role_kpi_ids)
    needs_b2b = any(k.startswith("b2b_") for k in role_kpi_ids)
    needs_b2c = any(k.startswith("b2c_") for k in role_kpi_ids)
    needs_tasks = any(k.startswith("tasks_") or k.startswith("projects_") for k in role_kpi_ids)
    if needs_support:
        metrics.update(await _compute_support_metrics(user_id, start_iso, end_iso))
    if needs_b2b:
        metrics.update(await _compute_b2b_metrics(user_id, start_iso, end_iso))
    if needs_b2c:
        metrics.update(await _compute_b2c_metrics(user_id, start_iso, end_iso))
    if needs_tasks:
        metrics.update(await _compute_task_metrics(user_id, start_iso, end_iso))
    return metrics


def _shape_kpis_out(role_kpi_ids: list, metrics: dict) -> list:
    out = []
    for kid in role_kpi_ids:
        meta = KPI_BY_ID.get(kid)
        if not meta:
            continue
        out.append({**meta, "value": metrics.get(kid, 0)})
    return out
