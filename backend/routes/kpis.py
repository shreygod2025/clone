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
    # `tickets_assigned` is a *workload snapshot* (how many tickets were on
    # this user's plate during the bucket), so we use max() across buckets
    # instead of sum() to avoid double-counting a backlog ticket in every
    # week it stayed open.
    {"id": "support_tickets_assigned", "label": "No. of tickets assigned", "category": "Support Center", "unit": "count", "aggregation": "max"},
    {"id": "support_tickets_resolved", "label": "No. of tickets resolved", "category": "Support Center", "unit": "count"},
    {"id": "support_avg_resolution_hours", "label": "Avg resolution time (hours)", "category": "Support Center", "unit": "hours"},
    {"id": "support_first_response_hours", "label": "Avg first-response time (hours)", "category": "Support Center", "unit": "hours"},
    {"id": "support_resolution_rate", "label": "Resolution rate (%)", "category": "Support Center", "unit": "%"},
    {"id": "support_sla_breach_over_3d", "label": "Tickets pending > 3 days", "category": "Support Center", "unit": "count", "aggregation": "snapshot"},

    # Sales B2B — sourced from `school_inquiries`
    {"id": "b2b_leads_assigned", "label": "No. of school leads assigned", "category": "Sales — B2B", "unit": "count"},
    {"id": "b2b_schools_onboarded", "label": "No. of schools onboarded", "category": "Sales — B2B", "unit": "count"},
    {"id": "b2b_conversion_rate", "label": "Conversion rate (%)", "category": "Sales — B2B", "unit": "%"},
    {"id": "b2b_revenue_generated", "label": "Revenue generated (₹)", "category": "Sales — B2B", "unit": "₹"},
    {"id": "b2b_avg_deal_size", "label": "Avg deal size (₹)", "category": "Sales — B2B", "unit": "₹"},
    {"id": "b2b_renewal_rate", "label": "Renewal rate (%)", "category": "Sales — B2B", "unit": "%"},
    {"id": "b2b_lost_schools", "label": "No. of lost schools", "category": "Sales — B2B", "unit": "count"},

    # HR — sourced from `team_requirements` + `team_applications`
    {"id": "hr_team_openings", "label": "Team openings", "category": "HR", "unit": "count"},
    {"id": "hr_openings_filled", "label": "Openings filled", "category": "HR", "unit": "count"},
    {"id": "hr_openings_over_deadline", "label": "Openings over deadline", "category": "HR", "unit": "count", "aggregation": "snapshot"},

    # Educator HR — sourced from `open_requirements` + `educator_onboarding`
    {"id": "edu_requirements", "label": "Educator requirements", "category": "Educator HR", "unit": "count"},
    {"id": "edu_requirements_fulfilled", "label": "Requirements fulfilled", "category": "Educator HR", "unit": "count"},
    {"id": "edu_requirements_over_deadline", "label": "Requirements over deadline", "category": "Educator HR", "unit": "count", "aggregation": "snapshot"},

    # Growth Partners — sourced from `growth_partners`
    {"id": "gp_leads", "label": "Growth partner leads", "category": "Growth Partners", "unit": "count"},
    {"id": "gp_onboarded", "label": "New growth partners onboarded", "category": "Growth Partners", "unit": "count"},
    {"id": "gp_conversions", "label": "Conversions", "category": "Growth Partners", "unit": "count"},

    # Sales B2C — sourced from `inquiry_leads` (inquiry_type = student)
    {"id": "b2c_leads_assigned", "label": "No. of student leads assigned", "category": "Sales — B2C", "unit": "count"},
    {"id": "b2c_bookings_closed", "label": "No. of bookings/orders closed", "category": "Sales — B2C", "unit": "count"},
    {"id": "b2c_conversion_rate", "label": "Conversion rate (%)", "category": "Sales — B2C", "unit": "%"},
    {"id": "b2c_revenue_generated", "label": "Revenue generated (₹)", "category": "Sales — B2C", "unit": "₹"},

    # Social Media — sourced from `social_media_snapshots`
    # These are channel-level metrics (shared org-wide) shown for any user whose role owns social media growth.
    {"id": "social_ig_follower_growth",   "label": "Instagram follower growth",    "category": "Social Media", "unit": "count", "aggregation": "delta"},
    {"id": "social_ig_engagement_growth", "label": "Instagram engagement growth (%)", "category": "Social Media", "unit": "%", "aggregation": "delta"},
    {"id": "social_yt_subscriber_growth", "label": "YouTube subscriber growth",    "category": "Social Media", "unit": "count", "aggregation": "delta"},
    {"id": "social_yt_engagement_growth", "label": "YouTube engagement growth (%)",   "category": "Social Media", "unit": "%", "aggregation": "delta"},

    # Future Skills — sourced from `future_skills_leads`, `future_skills_trials`, `future_skills_subscriptions`
    # These are program-wide funnel metrics, shown org-wide for any user whose role owns Future Skills growth.
    {"id": "fs_leads_generated",  "label": "FS leads generated",       "category": "Future Skills", "unit": "count"},
    {"id": "fs_lead_to_trial",    "label": "FS lead → trial rate (%)", "category": "Future Skills", "unit": "%"},
    {"id": "fs_trial_to_paid",    "label": "FS trial → paid rate (%)", "category": "Future Skills", "unit": "%"},
    {"id": "fs_revenue",          "label": "FS revenue (₹)",           "category": "Future Skills", "unit": "₹"},
    {"id": "fs_aov",              "label": "FS avg order value (₹)",   "category": "Future Skills", "unit": "₹"},
    {"id": "fs_profit_margin",    "label": "FS profit margin (%)",     "category": "Future Skills", "unit": "%"},

    # Task & Project Delivery — sourced from `tasks` and `projects`
    {"id": "tasks_assigned", "label": "Tasks assigned", "category": "Tasks & Responsibilities", "unit": "count"},
    {"id": "tasks_completed", "label": "Tasks completed", "category": "Tasks & Responsibilities", "unit": "count"},
    {"id": "tasks_overdue", "label": "Tasks overdue", "category": "Tasks & Responsibilities", "unit": "count", "aggregation": "snapshot"},
    {"id": "projects_member_of", "label": "Projects assigned to", "category": "Tasks & Responsibilities", "unit": "count", "aggregation": "max"},
    {"id": "projects_leading", "label": "Projects leading", "category": "Tasks & Responsibilities", "unit": "count", "aggregation": "max"},

    # Field Ops — sourced from `field_reports`
    {"id": "field_days_on_ground", "label": "Days on field", "category": "Field Ops", "unit": "count"},
    {"id": "field_schools_visited", "label": "Schools visited", "category": "Field Ops", "unit": "count"},
    {"id": "field_schools_interested", "label": "Schools interested", "category": "Field Ops", "unit": "count"},
    {"id": "field_entries_gained", "label": "Entries gained (met contact)", "category": "Field Ops", "unit": "count"},

    # Telecalling — sourced from `telecalling_activity`
    {"id": "tc_calls_made",       "label": "Calls made",       "category": "Telecalling", "unit": "count"},
    {"id": "tc_calls_picked",     "label": "Calls picked",     "category": "Telecalling", "unit": "count"},
    {"id": "tc_leads_interested", "label": "Leads interested", "category": "Telecalling", "unit": "count"},
    {"id": "tc_meetings_booked",  "label": "Meetings booked",  "category": "Telecalling", "unit": "count"},
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
    """Metrics from `support_queries` where assigned_to == user_id.

    - `assigned` counts tickets that were on this user's plate at any point
      during the period: created on or before `end_iso` AND either still open
      OR resolved on/after `start_iso`. The old implementation only counted
      tickets *created* in the window, which under-counted dramatically for
      support agents carrying a backlog (e.g. Kirti had 100+ open tickets
      from previous months but the Oct dashboard showed only 8 = new
      tickets created in Oct).
    - `resolved` counts tickets whose `resolved_at` (fallback `updated_at`
      when `resolved_at` is missing on older docs) falls inside the range
      AND whose current status is resolved/closed. Timezone-safe because
      all timestamps are stored as ISO strings.
    """
    coll = db.support_queries

    # "On this user's plate during the period" = ticket existed by period end
    # AND (still open OR resolved during-or-after period start).
    #
    # We also honour `assigned_at` when the doc has it — a ticket re-assigned
    # mid-period should still show up as the user's workload for that period.
    assigned_query = {
        "assigned_to": user_id,
        "created_at": {"$lte": end_iso},
        "$or": [
            # Still open at the time of the query → was on their plate end of period
            {"status": {"$nin": ["resolved", "closed"]}},
            # Resolved on or after period start → was on their plate during period
            {"resolved_at": {"$gte": start_iso}},
            # Fallback for docs with no resolved_at — use updated_at
            {
                "resolved_at": {"$in": [None, ""]},
                "updated_at": {"$gte": start_iso},
            },
            {
                "resolved_at": {"$exists": False},
                "updated_at": {"$gte": start_iso},
            },
        ],
    }
    assigned = await coll.count_documents(assigned_query)

    # Kept for the first-response calculation below (which should look only
    # at tickets NEWLY created in-period — a first response on a 3-month-old
    # ticket is noise for this period's metric).
    newly_created_query = {
        "assigned_to": user_id,
        "created_at": {"$gte": start_iso, "$lte": end_iso},
    }

    # Resolved-in-range: prefer `resolved_at`; fall back to `updated_at`
    # for pre-`resolved_at` rows (matches daily_report.py convention).
    resolved_query = {
        "assigned_to": user_id,
        "status": {"$in": ["resolved", "closed"]},
        "$or": [
            {"resolved_at": {"$gte": start_iso, "$lte": end_iso}},
            {
                "resolved_at": {"$in": [None, ""]},
                "updated_at": {"$gte": start_iso, "$lte": end_iso},
            },
            {
                "resolved_at": {"$exists": False},
                "updated_at": {"$gte": start_iso, "$lte": end_iso},
            },
        ],
    }
    resolved_docs = await coll.find(
        resolved_query,
        {"_id": 0, "created_at": 1, "updated_at": 1, "resolved_at": 1, "replies": 1},
    ).to_list(5000)
    resolved = len(resolved_docs)

    # Avg resolution time (hours) — resolved_at (or updated_at) − created_at
    total_hrs = 0.0
    counted = 0
    for d in resolved_docs:
        try:
            c = datetime.fromisoformat(d.get("created_at").replace("Z", "+00:00"))
            end_ts = d.get("resolved_at") or d.get("updated_at")
            u = datetime.fromisoformat(str(end_ts).replace("Z", "+00:00"))
            hrs = (u - c).total_seconds() / 3600.0
            if hrs >= 0:
                total_hrs += hrs
                counted += 1
        except Exception:
            continue
    avg_resolution_hours = round(total_hrs / counted, 2) if counted else 0

    # First response time (hours) — first reply timestamp - created_at (over
    # tickets assigned during the same period, so it stays comparable to
    # `assigned` above).
    first_response_hours = 0.0
    fr_count = 0
    fr_docs = await coll.find(newly_created_query, {"_id": 0, "created_at": 1, "replies": 1}).to_list(2000)
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
        {**base, "status": {"$in": ["converted", "onboarded", "ONBOARDED", "renewed", "active"]}},
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

    # Renewal / Retention (%) — of schools ever assigned to this user, how many
    # are still active (not archived/lost) among those that were customers at least once
    total_customers = await coll.count_documents({
        "assigned_to": user_id,
        "status": {"$in": ["converted", "onboarded", "ONBOARDED", "renewed", "active", "archived"]},
        "created_at": {"$gte": start_iso, "$lte": end_iso},
    })
    lost = await coll.count_documents({
        "assigned_to": user_id,
        "status": {"$in": ["archived", "lost", "churned"]},
        "created_at": {"$gte": start_iso, "$lte": end_iso},
    })
    renewal_rate = round(((total_customers - lost) / total_customers * 100.0), 1) if total_customers else 0.0

    return {
        "b2b_leads_assigned": assigned,
        "b2b_schools_onboarded": onboarded,
        "b2b_conversion_rate": conversion_rate,
        "b2b_revenue_generated": round(revenue, 2),
        "b2b_avg_deal_size": avg_deal,
        "b2b_renewal_rate": renewal_rate,
        "b2b_lost_schools": lost,
    }


async def _compute_hr_metrics(user_id: str, start_iso: str, end_iso: str) -> dict:
    """HR — team openings (team_requirements) + hires (team_applications with status=hired).

    Note: these two collections don't have an `assigned_to` column, so the
    metrics are org-wide (visible to any team member with the HR role).
    """
    openings = await db.team_requirements.count_documents({
        "created_at": {"$gte": start_iso, "$lte": end_iso},
    })
    filled = await db.team_applications.count_documents({
        "status": {"$in": ["hired", "onboarded", "onboarding"]},
        "created_at": {"$gte": start_iso, "$lte": end_iso},
    })
    # Over-deadline = still active + created > 30 days ago (snapshot)
    thirty_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    over_deadline = await db.team_requirements.count_documents({
        "is_active": True,
        "created_at": {"$lt": thirty_ago},
    })
    return {
        "hr_team_openings": openings,
        "hr_openings_filled": filled,
        "hr_openings_over_deadline": over_deadline,
    }


async def _compute_educator_hr_metrics(user_id: str, start_iso: str, end_iso: str) -> dict:
    """Educator HR — open_requirements + educator_onboarding + educator_applications."""
    reqs = await db.open_requirements.count_documents({
        "created_at": {"$gte": start_iso, "$lte": end_iso},
    })
    fulfilled = await db.educator_onboarding.count_documents({
        "created_at": {"$gte": start_iso, "$lte": end_iso},
    })
    thirty_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    over_deadline = await db.open_requirements.count_documents({
        "is_active": True,
        "created_at": {"$lt": thirty_ago},
    })
    return {
        "edu_requirements": reqs,
        "edu_requirements_fulfilled": fulfilled,
        "edu_requirements_over_deadline": over_deadline,
    }


async def _compute_growth_partner_metrics(user_id: str, start_iso: str, end_iso: str) -> dict:
    """Growth Partners — sourced from `growth_partners`."""
    coll = db.growth_partners
    base = {"created_at": {"$gte": start_iso, "$lte": end_iso}}
    # If growth_partners has assigned_to, scope to it; else org-wide
    sample = await coll.find_one({}, {"_id": 0, "assigned_to": 1})
    if sample and "assigned_to" in sample:
        base["assigned_to"] = user_id

    leads = await coll.count_documents(base)
    onboarded = await coll.count_documents({
        **base,
        "status": {"$in": ["onboarding", "active", "converted"]},
    })
    conversions = await coll.count_documents({
        **base,
        "status": {"$in": ["converted", "active"]},
    })
    return {
        "gp_leads": leads,
        "gp_onboarded": onboarded,
        "gp_conversions": conversions,
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

    - tasks_assigned:   tasks with assigned_to=user AND created_at in period
    - tasks_completed:  tasks with assigned_to=user AND completed_at in period
    - tasks_overdue:    tasks with assigned_to=user AND due_date < now AND status != completed
                        (real-time snapshot — not period-scoped so the live count is shown)
    - projects_member_of / projects_leading: count of projects the user is member/lead of
      AND whose active window (start_date .. end_date) intersects the bucket period.
      A project overlaps a bucket when start_date <= period_end AND
      (end_date is null OR end_date >= period_start).
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

    # Project overlap — dates in `projects` are stored as ISO date strings (YYYY-MM-DD)
    period_start_date = start_iso[:10]
    period_end_date = end_iso[:10]
    overlap_conds = [
        # start_date <= period_end (either not set or set and ≤ end)
        {"$or": [{"start_date": None}, {"start_date": {"$exists": False}},
                 {"start_date": {"$lte": period_end_date}}]},
        # end_date >= period_start (or not set)
        {"$or": [{"end_date": None}, {"end_date": {"$exists": False}},
                 {"end_date": {"$gte": period_start_date}}]},
    ]
    projects_member_of = await db.projects.count_documents({
        "$and": [
            {"$or": [{"member_ids": user_id}, {"lead_id": user_id}]},
            *overlap_conds,
        ]
    })
    projects_leading = await db.projects.count_documents({
        "$and": [
            {"lead_id": user_id},
            *overlap_conds,
        ]
    })

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

    - week    → 7 daily buckets (Mon..Sun) for the ISO week containing ref
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
    if scope == "week":
        # Monday → Sunday, day-wise breakdown
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        wk_mon = ref - timedelta(days=ref.weekday())
        wk_mon = wk_mon.replace(hour=0, minute=0, second=0, microsecond=0)
        for i in range(7):
            d_start = wk_mon + timedelta(days=i)
            d_end = d_start.replace(hour=23, minute=59, second=59, microsecond=999999)
            buckets.append({
                "label": day_names[i],
                "sub":   d_start.strftime('%d %b'),
                "start_iso": d_start.isoformat(),
                "end_iso":   d_end.isoformat(),
            })
    elif scope == "month":
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
        raise HTTPException(status_code=400, detail="scope must be week | month | quarter | year")
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
        # For snapshot KPIs (currently overdue etc.) — display current count only
        if aggregation == "snapshot":
            display = series[-1]["value"] if series else 0
        elif aggregation == "max":
            # Peak concurrent (used for project counts) — display the highest observed
            values = [s["value"] for s in series if s["value"] is not None]
            display = max(values) if values else 0
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
    scope: str = Query("month", pattern="^(week|month|quarter|year)$"),
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
    scope: str = Query("month", pattern="^(week|month|quarter|year)$"),
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
async def _compute_social_media_metrics(start_iso: str, end_iso: str) -> dict:
    """Channel-level social media growth over [start, end].

    Baseline = latest snapshot with date STRICTLY BEFORE start (falls back to
               earliest snapshot in range if no prior snapshot exists).
    Current  = latest snapshot with date <= end.
    Follower/subscriber growth = current.followers - baseline.followers.
    Engagement growth (%) = (current.engagement - baseline.engagement) / baseline.engagement * 100.
                            Engagement = latest_total_likes + latest_total_comments (+ views for YT).
    """
    start_day = start_iso[:10]
    end_day = end_iso[:10]

    async def _delta_for(provider: str, engagement_keys: list) -> tuple:
        # current: latest snapshot with date <= end_day
        current = await db.social_media_snapshots.find_one(
            {"provider": provider, "date": {"$lte": end_day}},
            {"_id": 0}, sort=[("date", -1)],
        )
        if not current:
            return 0, 0.0
        # baseline: latest snapshot strictly before start_day; fallback → earliest in-range
        baseline = await db.social_media_snapshots.find_one(
            {"provider": provider, "date": {"$lt": start_day}},
            {"_id": 0}, sort=[("date", -1)],
        )
        if not baseline:
            baseline = await db.social_media_snapshots.find_one(
                {"provider": provider, "date": {"$gte": start_day, "$lte": end_day}},
                {"_id": 0}, sort=[("date", 1)],
            )
        if not baseline:
            return 0, 0.0

        followers_delta = int((current.get("followers") or 0) - (baseline.get("followers") or 0))

        def _engagement(doc):
            return sum(int(doc.get(k) or 0) for k in engagement_keys)
        cur_eng = _engagement(current)
        base_eng = _engagement(baseline)
        eng_pct = 0.0
        if base_eng > 0:
            eng_pct = round((cur_eng - base_eng) / base_eng * 100.0, 2)
        return followers_delta, eng_pct

    ig_followers, ig_eng = await _delta_for("instagram", ["latest_total_likes", "latest_total_comments", "latest_total_views"])
    yt_subs, yt_eng = await _delta_for("youtube",   ["latest_total_likes", "latest_total_comments", "latest_total_views"])
    return {
        "social_ig_follower_growth":   ig_followers,
        "social_ig_engagement_growth": ig_eng,
        "social_yt_subscriber_growth": yt_subs,
        "social_yt_engagement_growth": yt_eng,
    }


async def _compute_future_skills_metrics(start_iso: str, end_iso: str) -> dict:
    """Program-wide Future Skills funnel metrics over [start, end]."""
    q_leads   = {"created_at":     {"$gte": start_iso, "$lte": end_iso}}
    q_trials  = {"created_at":     {"$gte": start_iso, "$lte": end_iso}}
    q_paid    = {"created_at":     {"$gte": start_iso, "$lte": end_iso}, "payment_status": "paid"}

    leads_total_raw = await db.future_skills_leads.count_documents(q_leads)
    trials_total    = await db.future_skills_trials.count_documents(q_trials)
    customers_paid  = await db.future_skills_subscriptions.count_documents(q_paid)

    # True lead count = unique parent phones across leads + trials + subs
    # created in this window (a trial/sub created directly is still funnel intake).
    lead_phones: set = set()
    async for l in db.future_skills_leads.find(q_leads, {"_id": 0, "phone": 1}):
        p = (l.get("phone") or "").strip()
        if p:
            lead_phones.add(p)
    async for t in db.future_skills_trials.find(q_trials, {"_id": 0, "parent_phone": 1}):
        p = (t.get("parent_phone") or "").strip()
        if p:
            lead_phones.add(p)
    async for s in db.future_skills_subscriptions.find(
        {"created_at": {"$gte": start_iso, "$lte": end_iso}}, {"_id": 0, "parent_phone": 1},
    ):
        p = (s.get("parent_phone") or "").strip()
        if p:
            lead_phones.add(p)
    leads_total = max(leads_total_raw, len(lead_phones))

    revenue = 0.0
    paying_orders = 0
    async for r in db.future_skills_subscriptions.find(q_paid, {"_id": 0, "amount": 1}):
        revenue += float(r.get("amount") or 0)
        paying_orders += 1

    # Program-wide costs (from centre economics) for margin — same shape as the FS report.
    cost_cursor = db.future_skills_expenses.find(
        {"date": {"$gte": start_iso[:10], "$lte": end_iso[:10]}},
        {"_id": 0, "amount": 1},
    )
    total_cost = 0.0
    async for c in cost_cursor:
        total_cost += float(c.get("amount") or 0)

    def _pct(n, d): return round((n / d) * 100.0, 1) if d > 0 else 0.0
    return {
        "fs_leads_generated": leads_total,
        "fs_lead_to_trial":   _pct(trials_total, leads_total),
        "fs_trial_to_paid":   _pct(customers_paid, trials_total),
        "fs_revenue":         int(round(revenue)),
        "fs_aov":             int(round(revenue / paying_orders)) if paying_orders > 0 else 0,
        "fs_profit_margin":   round((revenue - total_cost) / revenue * 100.0, 1) if revenue > 0 else 0.0,
    }


async def _compute_field_metrics(user_id: str, start_iso: str, end_iso: str) -> dict:
    """Metrics from `field_reports` for the given user in the date range.

    - field_days_on_ground: unique check-in dates in period
    - field_schools_visited: total school_visits across all reports in period
    - field_schools_interested: visits where lead_interested == 'yes'
    - field_entries_gained: visits where got_entry == 'yes'
    """
    reports = await db.field_reports.find(
        {"user_id": user_id, "created_at": {"$gte": start_iso, "$lte": end_iso}},
        {"_id": 0, "check_in": 1, "school_visits": 1, "created_at": 1},
    ).to_list(2000)

    days = set()
    schools_visited = 0
    interested = 0
    entries = 0
    for r in reports:
        ci = r.get("check_in") or {}
        ts = ci.get("at") or r.get("created_at")
        if ts:
            days.add(str(ts)[:10])
        for v in (r.get("school_visits") or []):
            schools_visited += 1
            if (v.get("lead_interested") or "").lower() == "yes":
                interested += 1
            if (v.get("got_entry") or "").lower() == "yes":
                entries += 1

    return {
        "field_days_on_ground":       len(days),
        "field_schools_visited":      schools_visited,
        "field_schools_interested":   interested,
        "field_entries_gained":       entries,
    }


async def _compute_telecalling_metrics(user_id: str, start_iso: str, end_iso: str) -> dict:
    """Metrics from `telecalling_activity` for the user in [start,end]."""
    events = await db.telecalling_activity.find(
        {"user_id": user_id, "created_at": {"$gte": start_iso, "$lte": end_iso}},
        {"_id": 0, "event": 1},
    ).to_list(20000)
    counts = {"call_made": 0, "call_picked": 0, "lead_interested": 0, "meeting_booked": 0}
    for e in events:
        k = e.get("event")
        if k in counts:
            counts[k] += 1
    return {
        "tc_calls_made":       counts["call_made"],
        "tc_calls_picked":     counts["call_picked"],
        "tc_leads_interested": counts["lead_interested"],
        "tc_meetings_booked":  counts["meeting_booked"],
    }


async def _compute_selected_metrics(
    user_id: str, role_kpi_ids: list, start_iso: str, end_iso: str
) -> dict:
    metrics: dict = {}
    needs_support = any(k.startswith("support_") for k in role_kpi_ids)
    needs_b2b = any(k.startswith("b2b_") for k in role_kpi_ids)
    needs_b2c = any(k.startswith("b2c_") for k in role_kpi_ids)
    needs_tasks = any(k.startswith("tasks_") or k.startswith("projects_") for k in role_kpi_ids)
    needs_hr = any(k.startswith("hr_") for k in role_kpi_ids)
    needs_edu = any(k.startswith("edu_") for k in role_kpi_ids)
    needs_gp = any(k.startswith("gp_") for k in role_kpi_ids)
    needs_social = any(k.startswith("social_") for k in role_kpi_ids)
    needs_fs = any(k.startswith("fs_") for k in role_kpi_ids)
    needs_field = any(k.startswith("field_") for k in role_kpi_ids)
    needs_tc    = any(k.startswith("tc_") for k in role_kpi_ids)
    if needs_support:
        metrics.update(await _compute_support_metrics(user_id, start_iso, end_iso))
    if needs_b2b:
        metrics.update(await _compute_b2b_metrics(user_id, start_iso, end_iso))
    if needs_b2c:
        metrics.update(await _compute_b2c_metrics(user_id, start_iso, end_iso))
    if needs_tasks:
        metrics.update(await _compute_task_metrics(user_id, start_iso, end_iso))
    if needs_hr:
        metrics.update(await _compute_hr_metrics(user_id, start_iso, end_iso))
    if needs_edu:
        metrics.update(await _compute_educator_hr_metrics(user_id, start_iso, end_iso))
    if needs_gp:
        metrics.update(await _compute_growth_partner_metrics(user_id, start_iso, end_iso))
    if needs_social:
        metrics.update(await _compute_social_media_metrics(start_iso, end_iso))
    if needs_fs:
        metrics.update(await _compute_future_skills_metrics(start_iso, end_iso))
    if needs_field:
        metrics.update(await _compute_field_metrics(user_id, start_iso, end_iso))
    if needs_tc:
        metrics.update(await _compute_telecalling_metrics(user_id, start_iso, end_iso))
    return metrics


def _shape_kpis_out(role_kpi_ids: list, metrics: dict) -> list:
    out = []
    for kid in role_kpi_ids:
        meta = KPI_BY_ID.get(kid)
        if not meta:
            continue
        out.append({**meta, "value": metrics.get(kid, 0)})
    return out
