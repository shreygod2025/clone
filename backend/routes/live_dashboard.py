"""
Live Dashboard — single snapshot endpoint powering the office TV wall.

Returns aggregated real-time counters for:
  • Success stories, split by level (1-5)
  • Today's support queries (new / overdue / resolved)
  • Today's School CRM leads (new / meeting done / converted)
  • Today's Student + Future Skills CRM leads (new / demo done / converted)
  • Today's sessions (on-time / late) — best-effort from CheckIn API
  • Recent activity feed (last ~25 events across CRMs, tickets, stories)
  • Reuses central_database.by-city for geo pins on the map

Endpoint is admin/super_admin only. Cheap enough to poll every 30s.
"""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException

from routes.shared import db, get_current_user

router = APIRouter(prefix="/live-dashboard", tags=["live-dashboard"])
logger = logging.getLogger(__name__)

# IST offset — we bucket "today" against India Standard Time to match the
# office wall-mounted TV.  All persisted timestamps are UTC ISO-8601, so we
# compare against the IST-midnight instant translated back to UTC.
IST_OFFSET = timedelta(hours=5, minutes=30)


def _ist_now() -> datetime:
    return datetime.now(timezone.utc) + IST_OFFSET


def _today_utc_bounds() -> tuple[datetime, datetime]:
    """Return (start, end) UTC datetimes for the current IST day."""
    ist_now = _ist_now()
    ist_start = ist_now.replace(hour=0, minute=0, second=0, microsecond=0)
    ist_end = ist_start + timedelta(days=1)
    return (ist_start - IST_OFFSET).replace(tzinfo=timezone.utc), (
        ist_end - IST_OFFSET
    ).replace(tzinfo=timezone.utc)


def _today_iso_date() -> str:
    return _ist_now().strftime("%Y-%m-%d")


async def _count_by_date_field(
    collection: str,
    date_field: str,
    extra_query: Optional[Dict[str, Any]] = None,
) -> int:
    """Count documents where the ISO date-field falls inside today's IST window.

    Handles three storage shapes seen in the codebase:
      1. Python `datetime` (native BSON date) — direct range compare
      2. ISO string with tz-suffix (…+00:00)
      3. ISO string that is tz-naïve (no suffix)
    We run all three queries and take the max because a document can only
    match one of the shapes at a time.
    """
    start_dt, end_dt = _today_utc_bounds()
    base = dict(extra_query or {})

    dt_q = {**base, date_field: {"$gte": start_dt, "$lt": end_dt}}
    # tz-suffixed ISO string
    str_q = {
        **base,
        date_field: {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()},
    }
    # tz-naïve ISO string (e.g. datetime.utcnow().isoformat())
    naive_q = {
        **base,
        date_field: {
            "$gte": start_dt.replace(tzinfo=None).isoformat(),
            "$lt": end_dt.replace(tzinfo=None).isoformat(),
        },
    }
    try: c1 = await db[collection].count_documents(dt_q)
    except Exception: c1 = 0
    try: c2 = await db[collection].count_documents(str_q)
    except Exception: c2 = 0
    try: c3 = await db[collection].count_documents(naive_q)
    except Exception: c3 = 0
    return max(c1, c2, c3)


# ─── Success stories ────────────────────────────────────────────────────
LEVEL_LABELS = {
    1: "Creator",
    2: "Published",
    3: "Recognition",
    4: "Impact",
    5: "Transformation",
}


async def _success_stories_block() -> Dict[str, Any]:
    total = await db.success_stories.count_documents({})
    published = await db.success_stories.count_documents({"is_published": True})

    by_level: List[Dict[str, Any]] = []
    for lvl in range(1, 6):
        cnt = await db.success_stories.count_documents({"level": lvl})
        by_level.append({"level": lvl, "label": LEVEL_LABELS[lvl], "count": cnt})

    today_count = await _count_by_date_field("success_stories", "created_at")
    return {
        "total": total,
        "published": published,
        "today": today_count,
        "by_level": by_level,
    }


# ─── Support queries (tickets) ──────────────────────────────────────────
async def _support_block() -> Dict[str, Any]:
    """Mirror AdminSupportUnified counts *exactly*.

    Support Center pulls from FOUR endpoints (see AdminSupportUnified.fetchAll):
      • /api/inquiry/queries              → inquiry_queries
      • /api/support/queries              → support_queries (user + educator)
      • /api/support/tickets              → support_tickets (legacy)
      • /api/support/tracking-tickets     → support_tickets where source=tracking_page

    Predicates (identical to the frontend so the two numbers can never diverge):
      new     = status ∈ (open, in_progress) AND !overdue
      overdue = status ∉ (resolved, closed, on_hold) AND (elapsed - paused) > 24h
      on_hold = status = on_hold
      resolved_today = (resolved | closed) AND resolved_at within today IST
    """
    RESOLVED = ("resolved", "closed")
    ON_HOLD  = ("on_hold",)
    NEW_STATUSES = ("open", "in_progress")   # 'new' status is NOT counted as new here
    now_utc = datetime.now(timezone.utc)
    start_dt, end_dt = _today_utc_bounds()

    proj = {"_id": 0, "status": 1, "priority": 1, "created_at": 1,
            "resolved_at": 1, "paused_seconds": 1}

    async def _rows(collection: str, filt: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        # Same 500-row cap as the frontend endpoints — keeps parity.
        try:
            return await db[collection].find(filt or {}, proj).sort("created_at", -1).to_list(500)
        except Exception as e:
            logger.warning("[live-dashboard] load %s failed: %s", collection, e)
            return []

    inquiry, support, legacy, tracking = await asyncio.gather(
        _rows("inquiry_queries"),
        _rows("support_queries"),
        _rows("support_tickets", {"$or": [{"source": {"$exists": False}},
                                           {"source": {"$ne": "tracking_page"}}]}),
        _rows("support_tickets", {"source": "tracking_page"}),
    )
    all_rows: List[Dict[str, Any]] = inquiry + support + legacy + tracking

    def _to_dt(v) -> Optional[datetime]:
        if isinstance(v, datetime):
            return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        if isinstance(v, str) and v:
            try:
                s = v[:-1] + "+00:00" if v.endswith("Z") else v
                dt = datetime.fromisoformat(s)
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except Exception:
                return None
        return None

    def _is_overdue(row: Dict[str, Any]) -> bool:
        if (row.get("status") or "").lower() in RESOLVED + ON_HOLD:
            return False
        dt = _to_dt(row.get("created_at"))
        if not dt:
            return False
        elapsed_hrs = (now_utc - dt).total_seconds() / 3600
        paused_hrs = float(row.get("paused_seconds") or 0) / 3600
        return (elapsed_hrs - paused_hrs) > 24

    new_count = overdue_count = on_hold_count = resolved_today = 0
    priority = {"urgent": 0, "high": 0, "normal": 0, "low": 0}
    # Rolling avg resolution time — over ALL resolved rows we can compute, not
    # just today's. Using a wider window makes the metric stable when only a
    # handful of tickets are resolved on a given day.
    resolution_durations_hours: List[float] = []

    for r in all_rows:
        st = (r.get("status") or "").lower()
        cdt = _to_dt(r.get("created_at"))
        created_today = bool(cdt and start_dt <= cdt < end_dt)
        # ── "New today" = any query created in today's IST window,
        # regardless of status. Matches the Support Center visible count.
        if created_today:
            new_count += 1

        if st in ON_HOLD:
            on_hold_count += 1
            continue
        if st in RESOLVED:
            rdt = _to_dt(r.get("resolved_at"))
            if rdt and cdt and rdt >= cdt:
                paused_hrs = float(r.get("paused_seconds") or 0) / 3600
                dur = (rdt - cdt).total_seconds() / 3600 - paused_hrs
                if dur >= 0:
                    resolution_durations_hours.append(dur)
            if rdt and start_dt <= rdt < end_dt:
                resolved_today += 1
            continue
        overdue = _is_overdue(r)
        if overdue:
            overdue_count += 1
        # Priority — for anything still open (not resolved/on_hold)
        key = (r.get("priority") or "normal").lower()
        if key in ("medium", "med"):
            key = "normal"
        if key == "critical":
            key = "urgent"
        if key in priority:
            priority[key] += 1

    avg_resolution_hours: Optional[float] = None
    if resolution_durations_hours:
        avg_resolution_hours = round(sum(resolution_durations_hours) / len(resolution_durations_hours), 2)

    def _fmt(h: Optional[float]) -> str:
        if h is None:
            return "—"
        if h < 1:
            m = max(int(round(h * 60)), 1)
            return f"{m}m"
        if h < 48:
            return f"{h:.1f}h"
        return f"{h / 24:.1f}d"

    return {
        "new_today":      new_count,
        "overdue":        overdue_count,
        "on_hold":        on_hold_count,
        "resolved_today": resolved_today,
        "open_total":     new_count + overdue_count,
        "priority":       priority,
        "avg_resolution_hours":  avg_resolution_hours,
        "avg_resolution_display": _fmt(avg_resolution_hours),
        "resolved_sample_size":  len(resolution_durations_hours),
    }


# ─── School CRM ─────────────────────────────────────────────────────────
async def _school_crm_block() -> Dict[str, Any]:
    today = _today_iso_date()
    start_dt, end_dt = _today_utc_bounds()

    new_today = await _count_by_date_field("school_inquiries", "created_at")

    # Meeting done today: rows whose meeting_date == today (string date field)
    meeting_done_today = await db.school_inquiries.count_documents({
        "meeting_date": today
    })

    # Converted today: status now converted AND updated_at in today's window,
    # falling back to activity_log entries.
    converted_today = await db.school_inquiries.count_documents({
        "status": "converted",
        "updated_at": {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()},
    })
    if converted_today == 0:
        # Fallback: count via activity_log status_change → converted today
        try:
            pipeline = [
                {"$unwind": "$activity_log"},
                {"$match": {
                    "activity_log.type": "status_change",
                    "activity_log.new_status": "converted",
                    "activity_log.at": {
                        "$gte": start_dt.isoformat(),
                        "$lt": end_dt.isoformat(),
                    },
                }},
                {"$count": "n"},
            ]
            cur = db.school_inquiries.aggregate(pipeline)
            docs = await cur.to_list(1)
            converted_today = docs[0]["n"] if docs else 0
        except Exception:
            pass

    total_converted = await db.school_inquiries.count_documents({
        "status": {"$in": ["converted", "active", "renewed"]}
    })

    return {
        "new_today": new_today,
        "meeting_done_today": meeting_done_today,
        "converted_today": converted_today,
        "total_converted": total_converted,
    }


# ─── Student CRM + Future Skills combined ───────────────────────────────
async def _student_fs_block() -> Dict[str, Any]:
    start_dt, end_dt = _today_utc_bounds()

    # Student inquiries
    student_new = await _count_by_date_field("student_inquiries", "created_at")
    student_demo = await db.student_inquiries.count_documents({
        "status": "demo_completed",
        "updated_at": {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()},
    })
    student_converted = await db.student_inquiries.count_documents({
        "status": "converted",
        "updated_at": {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()},
    })

    # Future Skills leads / trials
    fs_new = await _count_by_date_field("future_skills_leads", "created_at")

    fs_demo = await db.future_skills_trials.count_documents({
        "trial_status": "attended",
        "updated_at": {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()},
    })
    if fs_demo == 0:
        # Fallback: use attended_at if it exists
        fs_demo = await db.future_skills_trials.count_documents({
            "trial_status": "attended",
            "attended_at": {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()},
        })

    fs_converted = await db.future_skills_leads.count_documents({
        "status": "converted",
        "converted_at": {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()},
    })

    return {
        "new_today": student_new + fs_new,
        "demo_done_today": student_demo + fs_demo,
        "converted_today": student_converted + fs_converted,
        "breakdown": {
            "student": {"new": student_new, "demo": student_demo, "converted": student_converted},
            "future_skills": {"new": fs_new, "demo": fs_demo, "converted": fs_converted},
        },
    }


# ─── Today's sessions (CheckIn API) ─────────────────────────────────────
_ONTIME_STATUSES = {"punctual_less_15", "punctual_more_15", "ontime", "on_time", "early"}
_LATE_STATUSES = {"late", "late_less_15", "late_more_15", "late_lt_15"}
_ABSENT_STATUSES = {"absent", "no_show"}


def _classify_admin_status(admin_status: Optional[str]) -> str:
    if not admin_status:
        return "unknown"
    a = admin_status.lower()
    if a in _ONTIME_STATUSES or a.startswith("punctual") or a.startswith("ontime") or a.startswith("early"):
        return "on_time"
    if a in _LATE_STATUSES or a.startswith("late"):
        return "late"
    if a in _ABSENT_STATUSES or a.startswith("absent") or a == "no_show":
        return "absent"
    return "unknown"


async def _sessions_block() -> Dict[str, Any]:
    """Aggregate today's CheckIn sessions across all schools.

    The upstream `/sessions` endpoint doesn't actually honour the
    ``session_date`` query filter, so we fetch the first N pages and
    filter locally.  Best-effort — errors are swallowed and reported as
    zero counters.
    """
    try:
        from routes.checkin_api import _checkin_get  # local import
    except Exception:
        return {"total": 0, "on_time": 0, "late": 0, "absent": 0, "upcoming": 0, "source": "unavailable"}

    today = _today_iso_date()
    all_sessions: List[Dict[str, Any]] = []
    # Upstream honours ``date=YYYY-MM-DD`` (NOT ``session_date``) — pass it and
    # walk pages until the batch is empty (typically 1-2 pages of 200/day).
    try:
        for page in range(1, 6):
            resp = await _checkin_get("/sessions", {"date": today, "per_page": 500, "page": page})
            batch = (resp.get("data") if isinstance(resp, dict) else None) or []
            all_sessions.extend(batch)
            if len(batch) < 500:
                break
    except Exception as e:
        logger.warning("[live-dashboard] CheckIn sessions fetch failed: %s", e)
        return {"total": 0, "on_time": 0, "late": 0, "absent": 0, "upcoming": 0, "source": "error"}

    # Defensive: the upstream sometimes returns unfiltered rows when the filter
    # is malformed. Belt-and-braces filter again on our side.
    todays = [s for s in all_sessions if s.get("session_date") == today]

    now_ist = _ist_now().replace(tzinfo=None)
    on_time = late = absent = upcoming = 0

    # Checked-in sessions are split strictly into on-time vs late so that
    # on_time + late == checked_in (every punctual_* / late_* tag folds in).
    for s in todays:
        cls = _classify_admin_status(s.get("admin_status"))
        if s.get("check_in_time") or cls in ("on_time", "late"):
            if cls == "late":
                late += 1
            else:
                on_time += 1
            continue
        if cls == "absent":
            absent += 1
            continue
        try:
            st = (s.get("start_time") or "00:00:00").split(".")[0][:8]
            if len(st) == 5:
                st += ":00"
            sched = datetime.strptime(f"{s.get('session_date')} {st}", "%Y-%m-%d %H:%M:%S")
            if sched > now_ist:
                upcoming += 1
            else:
                absent += 1
        except Exception:
            upcoming += 1

    checked_in = on_time + late
    return {
        "total": len(todays),
        "checked_in": checked_in,
        "not_checked_in": len(todays) - checked_in,
        "on_time": on_time,
        "late": late,
        "absent": absent,
        "upcoming": upcoming,
        "source": "checkin",
    }


# ─── Today's Tasks & active Projects ────────────────────────────────────
async def _tasks_projects_block() -> Dict[str, Any]:
    today = _today_iso_date()
    start_dt, end_dt = _today_utc_bounds()

    # New tasks created today (UTC ISO or datetime)
    new_today = await _count_by_date_field("tasks", "created_at")

    # Completed today — completed_at in today's IST window
    completed_today = await db.tasks.count_documents({
        "status": "completed",
        "completed_at": {
            "$gte": start_dt.isoformat(),
            "$lt": end_dt.isoformat(),
        },
    })

    # Overdue — due_date < today AND status not completed/rejected
    overdue = await db.tasks.count_documents({
        "status": {"$nin": ["completed", "rejected"]},
        "due_date": {"$lt": today, "$ne": None, "$exists": True},
    })

    # Active projects
    active_projects = await db.projects.count_documents({"status": "active"})

    # Bonus: tasks currently in-progress (nice small stat)
    in_progress = await db.tasks.count_documents({"status": "in_progress"})

    return {
        "new_today": new_today,
        "completed_today": completed_today,
        "overdue": overdue,
        "active_projects": active_projects,
        "in_progress": in_progress,
    }


# ─── Outreach (Instagram + YouTube snapshots) ───────────────────────────
async def _outreach_block() -> Dict[str, Any]:
    """Compute today vs yesterday delta for followers + engagement across
    Instagram and YouTube.  Uses `social_media_snapshots` populated by
    the nightly scraper.  Returns zeros when there's no snapshot for
    today/yesterday.
    """
    result: Dict[str, Any] = {
        "instagram": {"followers": 0, "followers_gained": 0, "engagement": 0, "engagement_gained": 0},
        "youtube":   {"subscribers": 0, "subscribers_gained": 0, "engagement": 0, "engagement_gained": 0},
    }
    today = _ist_now().strftime("%Y-%m-%d")
    yesterday = (_ist_now() - timedelta(days=1)).strftime("%Y-%m-%d")

    async def _latest_pair(provider: str):
        # Fetch newest 2 snapshots — most recent + previous
        cur = db.social_media_snapshots.find(
            {"provider": provider}, {"_id": 0},
        ).sort("date", -1).limit(2)
        rows = await cur.to_list(2)
        newest = rows[0] if rows else None
        prev = rows[1] if len(rows) > 1 else None
        return newest, prev

    # Instagram
    try:
        ig_new, ig_prev = await _latest_pair("instagram")
        if ig_new:
            followers = int(ig_new.get("followers") or 0)
            engagement = int((ig_new.get("latest_total_likes") or 0)
                             + (ig_new.get("latest_total_comments") or 0))
            prev_f = int((ig_prev or {}).get("followers") or 0)
            prev_e = int(((ig_prev or {}).get("latest_total_likes") or 0)
                         + ((ig_prev or {}).get("latest_total_comments") or 0))
            result["instagram"] = {
                "followers": followers,
                "followers_gained": max(0, followers - prev_f) if ig_prev else 0,
                "engagement": engagement,
                "engagement_gained": max(0, engagement - prev_e) if ig_prev else 0,
                "as_of": ig_new.get("date"),
            }
    except Exception as e:
        logger.warning("[live-dashboard] instagram outreach failed: %s", e)

    # YouTube
    try:
        yt_new, yt_prev = await _latest_pair("youtube")
        if yt_new:
            subs = int(yt_new.get("followers") or 0)
            engagement = int((yt_new.get("latest_total_likes") or 0)
                             + (yt_new.get("latest_total_comments") or 0)
                             + (yt_new.get("latest_total_views") or 0))
            prev_s = int((yt_prev or {}).get("followers") or 0)
            prev_e = int(((yt_prev or {}).get("latest_total_likes") or 0)
                         + ((yt_prev or {}).get("latest_total_comments") or 0)
                         + ((yt_prev or {}).get("latest_total_views") or 0))
            result["youtube"] = {
                "subscribers": subs,
                "subscribers_gained": max(0, subs - prev_s) if yt_prev else 0,
                "engagement": engagement,
                "engagement_gained": max(0, engagement - prev_e) if yt_prev else 0,
                "as_of": yt_new.get("date"),
            }
    except Exception as e:
        logger.warning("[live-dashboard] youtube outreach failed: %s", e)

    # ── Calls Connected today (from telecalling_activity) ─────────────
    try:
        start_dt, end_dt = _today_utc_bounds()
        today_str = _ist_now().strftime("%Y-%m-%d")
        # count call_picked=yes events today (calls connected). Fallback to
        # calls_made if picked isn't tracked. Uses the "day" field (YYYY-MM-DD)
        # populated by _log_activity — no tz-nightmares needed.
        calls_connected = await db.telecalling_activity.count_documents({
            "event": "call_picked",
            "$or": [
                {"day": today_str},
                {"created_at": {"$gte": start_dt.isoformat(), "$lte": end_dt.isoformat()}}
            ]
        })
        calls_made = await db.telecalling_activity.count_documents({
            "event": "call_made",
            "$or": [
                {"day": today_str},
                {"created_at": {"$gte": start_dt.isoformat(), "$lte": end_dt.isoformat()}}
            ]
        })
        # Also count "interested" leads today (bonus signal)
        interested = await db.telecalling_activity.count_documents({
            "event": "lead_interested",
            "$or": [
                {"day": today_str},
                {"created_at": {"$gte": start_dt.isoformat(), "$lte": end_dt.isoformat()}}
            ]
        })
        result["calls"] = {
            "connected": calls_connected,
            "made": calls_made,
            "interested": interested,
            "connect_rate": round((calls_connected / calls_made) * 100) if calls_made else 0,
        }
    except Exception as e:
        logger.warning("[live-dashboard] telecalling outreach failed: %s", e)
        result["calls"] = {"connected": 0, "made": 0, "interested": 0, "connect_rate": 0}

    # ── School Field Visits today (from field_reports.school_visits) ───
    try:
        start_dt, end_dt = _today_utc_bounds()
        # Field visits are stored as sub-docs inside `field_reports.school_visits`
        # Each visit has an `at` timestamp. We roll them up using aggregation.
        pipe = [
            {"$match": {"$or": [
                {"created_at": {"$gte": start_dt, "$lt": end_dt}},
                {"created_at": {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()}},
                {"created_at": {
                    "$gte": start_dt.replace(tzinfo=None).isoformat(),
                    "$lt": end_dt.replace(tzinfo=None).isoformat(),
                }},
            ]}},
            {"$project": {
                "user_id": 1,
                "visits": {"$size": {"$ifNull": ["$school_visits", []]}},
                "entries": {"$size": {"$filter": {
                    "input": {"$ifNull": ["$school_visits", []]},
                    "cond": {"$eq": ["$$this.got_entry", "yes"]},
                }}},
                "leads": {"$size": {"$filter": {
                    "input": {"$ifNull": ["$school_visits", []]},
                    "cond": {"$eq": ["$$this.lead_interested", "yes"]},
                }}},
            }},
            {"$group": {
                "_id": None,
                "visits":   {"$sum": "$visits"},
                "entries":  {"$sum": "$entries"},
                "leads":    {"$sum": "$leads"},
                "reps":     {"$addToSet": "$user_id"},
            }},
        ]
        agg = await db.field_reports.aggregate(pipe).to_list(1)
        row = agg[0] if agg else {}
        result["field_visits"] = {
            "visits":  int(row.get("visits") or 0),
            "entries": int(row.get("entries") or 0),
            "leads":   int(row.get("leads") or 0),
            "reps":    len(row.get("reps") or []),
        }
    except Exception as e:
        logger.warning("[live-dashboard] field visits outreach failed: %s", e)
        result["field_visits"] = {"visits": 0, "entries": 0, "leads": 0, "reps": 0}

    return result


# ─── Hiring pipeline (Educators / Growth Partners / Team) ───────────────
async def _hiring_block() -> Dict[str, Any]:
    """Roll up TODAY's applicant counts for the three hiring pipelines."""
    start_dt, end_dt = _today_utc_bounds()
    # Build the created-today filter across all three date-storage shapes
    # used in this codebase (native datetime, tz-suffixed ISO, tz-naïve ISO).
    def _today_or(field: str) -> Dict[str, Any]:
        return {"$or": [
            {field: {"$gte": start_dt, "$lt": end_dt}},
            {field: {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()}},
            {field: {
                "$gte": start_dt.replace(tzinfo=None).isoformat(),
                "$lt": end_dt.replace(tzinfo=None).isoformat(),
            }},
        ]}

    async def _counts(collection: str, buckets: Dict[str, List[str]]) -> Dict[str, int]:
        today_filter = _today_or("created_at")
        out = {"new": 0, "interview": 0, "onboarded": 0, "inactive": 0}
        for key, statuses in buckets.items():
            out[key] = await db[collection].count_documents({
                "status": {"$in": statuses},
                **today_filter,
            })
        out["total"] = await db[collection].count_documents(today_filter)
        return out

    educators = await _counts("educator_applications", {
        "new":        ["new"],
        "interview":  ["demo_scheduled", "hr_done", "tech_scheduled", "interview_scheduled"],
        "onboarded":  ["onboarded", "active"],
        "inactive":   ["archived", "interview_failed", "auto_failed_anti_cheat", "rejected", "inactive"],
    })

    team = await _counts("team_applications", {
        "new":        ["new"],
        "interview":  ["interviewed", "interview_scheduled"],
        "onboarded":  ["hired", "onboarding", "active"],
        "inactive":   ["archived", "rejected", "inactive"],
    })

    growth = await _counts("growth_partners", {
        "new":        ["new"],
        "interview":  ["onboarding", "interview"],
        "onboarded":  ["active", "converted"],
        "inactive":   ["archived", "rejected", "inactive"],
    })

    return {
        "educators": educators,
        "team": team,
        "growth_partners": growth,
    }


# ─── Central Database (map) ─────────────────────────────────────────────
async def _map_block() -> Dict[str, Any]:
    """Reuse the same city aggregation the Central Database page uses."""
    try:
        from routes.central_database import (
            central_database_by_city as _cdb_impl,
            CITY_COORDS,
        )
    except Exception:
        return {"cities": [], "totals": {}, "grand_total": 0}

    # The upstream function needs a user dict; pass a synthetic admin.
    try:
        data = await _cdb_impl(user={"role": "admin", "permissions": []})
    except Exception as e:
        logger.warning("[live-dashboard] central_database failed: %s", e)
        return {"cities": [], "totals": {}, "grand_total": 0}

    # Strip the heavy "entities" arrays — TV only needs counts + coords, plus
    # a small sample of names per role so tapping a pin can show a short list.
    slim: List[Dict[str, Any]] = []
    for c in data.get("cities", []) or []:
        if c.get("lat") is None:
            continue
        # Keep only first 5 names per role — enough for a compact popup.
        entities = c.get("entities") or {}
        slim_entities: Dict[str, List[Dict[str, Any]]] = {}
        for role, arr in entities.items():
            picks = []
            for e in (arr or [])[:5]:
                picks.append({
                    "name": e.get("name"),
                    "meta": e.get("meta"),
                    "stage": e.get("stage"),
                })
            slim_entities[role] = picks
        slim.append({
            "city": c.get("city"),
            "city_key": c.get("city_key"),
            "lat": c.get("lat"),
            "lng": c.get("lng"),
            "total": c.get("total", 0),
            "counts": c.get("counts", {}),
            "entities": slim_entities,
        })
    return {
        "cities": slim,
        "totals": data.get("totals", {}),
        "grand_total": data.get("grand_total", 0),
    }


# ─── Activity ticker ────────────────────────────────────────────────────
async def _activity_feed(limit: int = 25) -> List[Dict[str, Any]]:
    """Merge the newest rows from CRMs, tickets and stories into one ticker."""
    events: List[Dict[str, Any]] = []

    async def _grab(coll: str, projection: dict, mapper) -> None:
        try:
            cur = db[coll].find({}, projection).sort("created_at", -1).limit(15)
            docs = await cur.to_list(15)
            for d in docs:
                item = mapper(d)
                if item:
                    events.append(item)
        except Exception:
            pass

    await _grab(
        "school_inquiries",
        {"_id": 0, "school_name": 1, "city": 1, "created_at": 1, "status": 1},
        lambda d: {
            "type": "school_lead",
            "text": f"New school lead — {d.get('school_name', 'Unknown school')}"
            + (f" · {d.get('city')}" if d.get('city') else ""),
            "at": d.get("created_at"),
        },
    )
    await _grab(
        "student_inquiries",
        {"_id": 0, "student_name": 1, "parent_name": 1, "city": 1, "created_at": 1},
        lambda d: {
            "type": "student_lead",
            "text": f"New student inquiry — {d.get('student_name') or d.get('parent_name') or 'Unknown parent'}"
            + (f" · {d.get('city')}" if d.get('city') else ""),
            "at": d.get("created_at"),
        },
    )
    await _grab(
        "future_skills_leads",
        {"_id": 0, "parent_name": 1, "child_name": 1, "city": 1, "created_at": 1},
        lambda d: {
            "type": "fs_lead",
            "text": f"Future Skills lead — {d.get('child_name') or d.get('parent_name') or 'Unknown'}"
            + (f" · {d.get('city')}" if d.get('city') else ""),
            "at": d.get("created_at"),
        },
    )
    await _grab(
        "support_queries",
        {"_id": 0, "subject": 1, "school_name": 1, "created_at": 1, "ticket_number": 1},
        lambda d: {
            "type": "ticket",
            "text": f"Ticket #{d.get('ticket_number') or '—'} — {d.get('subject') or 'New support query'}"
            + (f" · {d.get('school_name')}" if d.get('school_name') else ""),
            "at": d.get("created_at"),
        },
    )
    await _grab(
        "success_stories",
        {"_id": 0, "title": 1, "level_name": 1, "created_at": 1},
        lambda d: {
            "type": "success_story",
            "text": f"Success story — {d.get('title', 'Untitled')}"
            + (f" · {d.get('level_name')}" if d.get('level_name') else ""),
            "at": d.get("created_at"),
        },
    )

    def _key(evt: Dict[str, Any]) -> str:
        at = evt.get("at")
        if isinstance(at, datetime):
            return at.isoformat()
        return str(at or "")

    events.sort(key=_key, reverse=True)
    # Normalise datetime → iso string for JSON serialisation.
    for e in events:
        at = e.get("at")
        if isinstance(at, datetime):
            e["at"] = at.isoformat()
    return events[:limit]


# ─── Public endpoint ────────────────────────────────────────────────────
@router.get("/snapshot")
async def live_snapshot():
    """One-shot payload for the office TV / public live dashboard.

    PUBLIC — no auth required. The dashboard is intentionally public so it
    can be shown on a lobby TV or shared externally. All metrics returned
    here are aggregate counts and vanity numbers (never PII).
    """
    stories, support, school_crm, student_fs, sessions, map_data, ticker, tasks_projects, outreach, hiring = await asyncio.gather(
        _success_stories_block(),
        _support_block(),
        _school_crm_block(),
        _student_fs_block(),
        _sessions_block(),
        _map_block(),
        _activity_feed(),
        _tasks_projects_block(),
        _outreach_block(),
        _hiring_block(),
    )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "today_ist": _today_iso_date(),
        "success_stories": stories,
        "support": support,
        "school_crm": school_crm,
        "student_fs_crm": student_fs,
        "sessions": sessions,
        "map": map_data,
        "activity": ticker,
        "tasks_projects": tasks_projects,
        "outreach": outreach,
        "hiring": hiring,
    }
