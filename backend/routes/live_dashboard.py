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
    """Count documents where the string ISO date-field falls inside today's IST window.

    Handles both stored `datetime` objects and ISO string timestamps by
    running two queries and taking the max (documents can't match both
    shapes at the same time)."""
    start_dt, end_dt = _today_utc_bounds()
    base = dict(extra_query or {})

    dt_q = {**base, date_field: {"$gte": start_dt, "$lt": end_dt}}
    str_q = {
        **base,
        date_field: {"$gte": start_dt.isoformat(), "$lt": end_dt.isoformat()},
    }
    try:
        c1 = await db[collection].count_documents(dt_q)
    except Exception:
        c1 = 0
    try:
        c2 = await db[collection].count_documents(str_q)
    except Exception:
        c2 = 0
    return max(c1, c2)


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
    start_dt, end_dt = _today_utc_bounds()
    new_today = await _count_by_date_field("support_queries", "created_at")

    # Resolved today — use resolved_at when present (added by earlier fix).
    resolved_today = await db.support_queries.count_documents({
        "status": {"$in": ["resolved", "closed"]},
        "resolved_at": {
            "$gte": start_dt.isoformat(),
            "$lt": end_dt.isoformat(),
        },
    })

    # Overdue — open ticket created > 48h ago
    overdue_cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    overdue = await db.support_queries.count_documents({
        "status": {"$nin": ["resolved", "closed"]},
        "created_at": {"$lt": overdue_cutoff.isoformat()},
    })

    open_total = await db.support_queries.count_documents({
        "status": {"$nin": ["resolved", "closed"]}
    })

    return {
        "new_today": new_today,
        "overdue": overdue,
        "resolved_today": resolved_today,
        "open_total": open_total,
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
    pages_to_fetch = 4  # ~2000 sessions — covers most of the recent window
    try:
        for page in range(1, pages_to_fetch + 1):
            resp = await _checkin_get("/sessions", {"per_page": 500, "page": page})
            batch = (resp.get("data") if isinstance(resp, dict) else None) or []
            all_sessions.extend(batch)
            if not batch:
                break
    except Exception as e:
        logger.warning("[live-dashboard] CheckIn sessions fetch failed: %s", e)
        return {"total": 0, "on_time": 0, "late": 0, "absent": 0, "upcoming": 0, "source": "error"}

    todays = [s for s in all_sessions if s.get("session_date") == today]

    now_ist = _ist_now().replace(tzinfo=None)
    on_time = late = absent = upcoming = 0

    for s in todays:
        cls = _classify_admin_status(s.get("admin_status"))
        if cls == "on_time":
            on_time += 1
            continue
        if cls == "late":
            late += 1
            continue
        if cls == "absent":
            absent += 1
            continue
        # No admin_status yet — decide via schedule vs current time
        try:
            st = (s.get("start_time") or "00:00:00").split(".")[0][:8]
            sched = datetime.strptime(f"{s.get('session_date')} {st}", "%Y-%m-%d %H:%M:%S")
            if sched > now_ist:
                upcoming += 1
            elif s.get("check_in_time"):
                on_time += 1
            else:
                absent += 1
        except Exception:
            upcoming += 1

    return {
        "total": len(todays),
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
async def live_snapshot(user: dict = Depends(get_current_user)):
    """One-shot payload for the office TV dashboard."""
    role = user.get("role")
    if role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Live dashboard is admin-only")

    stories, support, school_crm, student_fs, sessions, map_data, ticker, tasks_projects = await asyncio.gather(
        _success_stories_block(),
        _support_block(),
        _school_crm_block(),
        _student_fs_block(),
        _sessions_block(),
        _map_block(),
        _activity_feed(),
        _tasks_projects_block(),
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
    }
