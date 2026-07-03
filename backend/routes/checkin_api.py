"""
Proxy routes for the external Check-in / Timetable API.
Base URL: https://{CHECKIN_PROJECT_ID}.supabase.co/functions/v1
Auth: X-API-Key header
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from database import db
from routes.auth import get_current_user

router = APIRouter()

CHECKIN_BASE_URL = (
    os.environ.get("CHECKIN_BASE_URL")
    or f"https://{os.environ.get('CHECKIN_PROJECT_ID', '')}.supabase.co/functions/v1/external-api"
)
CHECKIN_API_KEY  = os.environ.get("CHECKIN_API_KEY", "")

def _checkin_headers():
    return {"X-API-Key": CHECKIN_API_KEY, "Content-Type": "application/json"}

async def _checkin_get(path: str, params: dict = None):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{CHECKIN_BASE_URL}{path}", headers=_checkin_headers(), params=params)
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

async def _checkin_post(path: str, body: dict):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{CHECKIN_BASE_URL}{path}", headers=_checkin_headers(), json=body)
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

async def _checkin_put(path: str, body: dict):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.put(f"{CHECKIN_BASE_URL}{path}", headers=_checkin_headers(), json=body)
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

async def _checkin_delete(path: str):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.delete(f"{CHECKIN_BASE_URL}{path}", headers=_checkin_headers())
    if r.status_code >= 400 and r.status_code != 204:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return {"success": True}


# ─── Day name mapping ────────────────────────────────────────────────────────
DAY_MAP = {
    "Mon": "monday", "Tue": "tuesday", "Wed": "wednesday",
    "Thu": "thursday", "Fri": "friday", "Sat": "saturday", "Sun": "sunday",
    # already full names pass through
    "monday": "monday", "tuesday": "tuesday", "wednesday": "wednesday",
    "thursday": "thursday", "friday": "friday", "saturday": "saturday", "sunday": "sunday",
}


# ─── Educators ───────────────────────────────────────────────────────────────

@router.get("/schools/checkin/educators")
async def list_checkin_educators(user: dict = Depends(get_current_user)):
    """Fetch educators list from the checkin API."""
    data = await _checkin_get("/educators", {"per_page": 200})
    educators = data.get("data", [])
    return {"educators": educators}


# ─── Timetables ──────────────────────────────────────────────────────────────

@router.post("/schools/{school_id}/timetable")
async def create_or_update_timetable(school_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """
    Create or update a timetable in the checkin API and persist its id on the school record.

    Multi-timetable support:
      • If payload contains `timetable_id`, that specific timetable is updated.
      • Otherwise a NEW timetable is created and appended to the school's
        `checkin_timetable_ids` array (one per educator / assistant educator).

    payload fields:
        educator_id, start_date, end_date, days_of_week, time_slots,
        session_mode, sessions_per_week, notes, [timetable_id]
    """
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Normalise day names to full lowercase (API expects "monday" not "Mon")
    raw_days = payload.get("days_of_week", [])
    full_days = [DAY_MAP.get(d, d.lower()) for d in raw_days]

    # Normalise time_slots keys too
    raw_slots = payload.get("time_slots", {})
    full_slots = {}
    for day_key, slots in raw_slots.items():
        full_day = DAY_MAP.get(day_key, day_key.lower())
        full_slots[full_day] = [
            {"start_time": s.get("start") or s.get("start_time", ""), "end_time": s.get("end") or s.get("end_time", "")}
            for s in slots if (s.get("start") or s.get("start_time"))
        ]

    api_body = {
        "educator_id":  payload.get("educator_id"),
        "school_name":  school.get("school_name") or school.get("name", ""),
        "start_date":   payload.get("start_date"),
        "end_date":     payload.get("end_date") or None,
        "days_of_week": full_days,
        "time_slots":   full_slots,
        "mode":         payload.get("session_mode", "offline"),
    }

    explicit_id = payload.get("timetable_id")
    if explicit_id:
        # Update the specified timetable
        result = await _checkin_put(f"/timetables/{explicit_id}", api_body)
        timetable_id = explicit_id
    else:
        # Create a new timetable
        result = await _checkin_post("/timetables", api_body)
        timetable_id = result.get("data", {}).get("id") or result.get("id")

    # Persist on the school record: maintain a list of ids + keep legacy single-id
    # field for backward compatibility with older code paths.
    if timetable_id:
        current_ids = list(school.get("checkin_timetable_ids") or [])
        legacy_id = school.get("checkin_timetable_id")
        if legacy_id and legacy_id not in current_ids:
            current_ids.append(legacy_id)
        if timetable_id not in current_ids:
            current_ids.append(timetable_id)
        update_doc = {
            "checkin_timetable_ids": current_ids,
            "checkin_timetable_id": legacy_id or timetable_id,
        }
        await db.school_inquiries.update_one({"id": school_id}, {"$set": update_doc})

    return {"success": True, "timetable_id": timetable_id, "data": result.get("data", result)}


@router.delete("/schools/{school_id}/timetable/{timetable_id}")
async def delete_timetable(school_id: str, timetable_id: str, user: dict = Depends(get_current_user)):
    """Remove a timetable from the school. Soft-removes from the school record;
    the underlying checkin API call to delete the timetable itself is best-effort."""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    # Best-effort delete on remote checkin API (not all backends support DELETE)
    try:
        await _checkin_put(f"/timetables/{timetable_id}", {"is_active": False})
    except Exception:
        pass
    # Pull id from the list and clear legacy field if it matches
    update_doc: dict = {"$pull": {"checkin_timetable_ids": timetable_id}}
    if school.get("checkin_timetable_id") == timetable_id:
        remaining = [t for t in (school.get("checkin_timetable_ids") or []) if t != timetable_id]
        update_doc["$set"] = {"checkin_timetable_id": remaining[0] if remaining else None}
    await db.school_inquiries.update_one({"id": school_id}, update_doc)
    return {"success": True}


@router.get("/schools/{school_id}/timetable")
async def get_timetable(school_id: str, user: dict = Depends(get_current_user)):
    """Fetch all saved timetables from the checkin API for this school.

    Returns:
      • `timetables`: array of every timetable linked to this school
      • `timetable`: convenience field — the first timetable (legacy callers)
      • `timetable_id`: convenience id of that first timetable (legacy callers)
    """
    school = await db.school_inquiries.find_one(
        {"id": school_id},
        {"_id": 0, "checkin_timetable_id": 1, "checkin_timetable_ids": 1, "school_name": 1},
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    # Merge legacy single id with the modern list, de-duping
    ids: list = list(school.get("checkin_timetable_ids") or [])
    legacy_id = school.get("checkin_timetable_id")
    if legacy_id and legacy_id not in ids:
        ids.insert(0, legacy_id)
    timetables = []
    for tid in ids:
        try:
            data = await _checkin_get(f"/timetables/{tid}")
            row = data.get("data", data) or {}
            if not row.get("id"):
                row["id"] = tid
            timetables.append(row)
        except Exception:
            # Skip missing/deleted timetables silently
            continue
    return {
        "timetables": timetables,
        "timetable": timetables[0] if timetables else None,
        "timetable_id": timetables[0].get("id") if timetables else None,
    }


# ─── Sessions ────────────────────────────────────────────────────────────────

@router.get("/schools/{school_id}/checkin-sessions")
async def get_school_sessions(
    school_id: str,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    user: dict = Depends(get_current_user)
):
    """
    List sessions for this school from the checkin API.
    Uses timetable_id filter (the only working filter) to correctly scope sessions
    to this school only.
    """
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "school_name": 1, "checkin_timetable_id": 1})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school_name = school.get("school_name") or ""

    # ── Resolve timetable_id(s) for this school ───────────────────
    # Priority 1: use the stored checkin_timetable_ids array (newer) — falls back
    #             to the legacy single-id field if the array is missing.
    timetable_ids: list = list(school.get("checkin_timetable_ids") or [])
    stored_id = school.get("checkin_timetable_id")
    if stored_id and stored_id not in timetable_ids:
        timetable_ids.append(stored_id)
    if not timetable_ids:
        # Priority 2: search all timetables and match by exact school_name
        # The external API's school_name filter is broken — fetch all and filter client-side
        all_timetables: list = []
        t_page = 1
        while True:
            resp = await _checkin_get("/timetables", {"page": t_page, "per_page": 100})
            batch = resp.get("data", [])
            all_timetables.extend(batch)
            meta = resp.get("meta", {})
            if len(all_timetables) >= meta.get("total", 0) or not batch:
                break
            t_page += 1

        # Exact school name match (case-insensitive)
        matched = [t["id"] for t in all_timetables if (t.get("school_name") or "").strip().lower() == school_name.strip().lower()]
        timetable_ids = matched

    if not timetable_ids:
        return {
            "sessions": [],
            "meta": {"total": 0},
            "school_name": school_name,
            "timetable_id": stored_id,
            "note": "No timetable linked to this school yet. Create one from the onboarding workflow."
        }

    # ── Fetch sessions for each timetable_id ─────────────────────
    # If multiple timetables, fetch for each and merge
    all_sessions: list = []
    for tid in timetable_ids:
        params: dict = {"timetable_id": tid, "page": page, "per_page": per_page}
        if status:
            params["status"] = status
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        data = await _checkin_get("/sessions", params)
        all_sessions.extend(data.get("data", []))

    # Sort by session_date desc
    all_sessions.sort(key=lambda s: s.get("session_date", "") or "", reverse=True)

    total = len(all_sessions)
    # Simple pagination on merged result
    start_idx = (page - 1) * per_page
    paginated = all_sessions[start_idx: start_idx + per_page]

    return {
        "sessions": paginated,
        "meta": {"total": total, "page": page, "per_page": per_page},
        "school_name": school_name,
        "timetable_id": timetable_ids[0] if len(timetable_ids) == 1 else timetable_ids,
    }


@router.put("/schools/{school_id}/checkin-sessions/{session_id}")
async def update_session(school_id: str, session_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """Update a session (e.g. change status, mark completed)."""
    result = await _checkin_put(f"/sessions/{session_id}", payload)
    return result


@router.post("/schools/{school_id}/checkin-sessions/generate")
async def generate_sessions(school_id: str, user: dict = Depends(get_current_user)):
    """Manually trigger session generation for this school's timetable."""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_id": 1})
    if not school or not school.get("checkin_timetable_id"):
        raise HTTPException(status_code=404, detail="No timetable linked to this school")
    result = await _checkin_post("/sessions/generate", {"timetable_id": school["checkin_timetable_id"]})
    return result



# ─── Reports (Sessions + Attendance merged per school) ──────────────────────

def _classify_late(admin_status: Optional[str], late_minutes: Optional[int]) -> dict:
    """Convert the CheckIn admin_status field into a friendly label + colour hint.

    Falls back to a computed late_minutes bucket when admin_status is missing.
    """
    if not admin_status and late_minutes is None:
        return {"key": "no_data", "label": "No check-in", "tone": "slate"}
    status = (admin_status or "").lower()
    if status.startswith("punctual"):
        # e.g. punctual_less_15 → still counted as on-time by CheckIn admin
        return {"key": "on_time", "label": "On time", "tone": "green"}
    if status.startswith("early"):
        return {"key": "early", "label": "Early", "tone": "blue"}
    if status.startswith("late_less_15") or status == "late_lt_15":
        return {"key": "late_lt_15", "label": "Late (<15 min)", "tone": "amber"}
    if status.startswith("late_") or status == "late":
        return {"key": "late", "label": "Late", "tone": "red"}
    if status.startswith("absent") or status == "no_show":
        return {"key": "absent", "label": "Absent", "tone": "red"}
    # Derive from late_minutes when a numeric bucket is available
    if late_minutes is not None:
        if late_minutes <= 0:
            return {"key": "on_time", "label": "On time", "tone": "green"}
        if late_minutes < 15:
            return {"key": "late_lt_15", "label": f"Late ({late_minutes} min)", "tone": "amber"}
        return {"key": "late", "label": f"Late ({late_minutes} min)", "tone": "red"}
    return {"key": status or "unknown", "label": (admin_status or "Unknown").replace("_", " ").title(), "tone": "slate"}


def _minutes_late(session_date: Optional[str], start_time: Optional[str], reached_time: Optional[str]) -> Optional[int]:
    """Compute how many minutes late the educator was vs the scheduled start.
    Returns None if any input is missing / unparseable. Negative means early.
    """
    if not (session_date and start_time and reached_time):
        return None
    from datetime import datetime
    try:
        # Session scheduled datetime (assume local — the CheckIn API stores times naive)
        st = start_time.split(".")[0]  # strip ms if any
        # start_time may be "09:05:00" — combine with session_date
        sched_str = f"{session_date} {st[:8]}"
        sched = datetime.strptime(sched_str, "%Y-%m-%d %H:%M:%S")
        # reached_time is ISO with tz — take the datetime part
        rt = reached_time.replace("Z", "+00:00")
        # Strip timezone for comparison (both are local Indian times in practice)
        rt_dt = datetime.fromisoformat(rt).replace(tzinfo=None)
        delta = rt_dt - sched
        return int(delta.total_seconds() // 60)
    except Exception:
        return None


async def _fetch_all_pages(path: str, params: dict, per_page: int = 500, hard_cap: int = 5000) -> list:
    """Fetch all pages of a paginated CheckIn endpoint. Returns merged data list."""
    all_items: list = []
    page = 1
    while True:
        q = {**params, "page": page, "per_page": per_page}
        resp = await _checkin_get(path, q)
        batch = resp.get("data", []) or []
        all_items.extend(batch)
        meta = resp.get("meta") or {}
        total = meta.get("total") or 0
        if not batch or len(all_items) >= min(total, hard_cap):
            break
        page += 1
        if page > (hard_cap // per_page) + 1:
            break
    return all_items


@router.get("/schools/{school_id}/reports")
async def get_school_reports(
    school_id: str,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    user: dict = Depends(get_current_user),
):
    """
    Enriched per-school session report merging CheckIn sessions with attendance.

    Each row contains:
      • session_date, scheduled start/end
      • educator name (+ email) and backup (original) educator when session was reassigned
      • actual reached time and check-out time from attendance
      • late_status: on_time / late_lt_15 / late / early / absent / no_data
      • late_minutes (negative when early)
      • checkin_location_name + photo_path (proof)
    """
    school = await db.school_inquiries.find_one(
        {"id": school_id},
        {"_id": 0, "school_name": 1, "checkin_timetable_id": 1, "checkin_timetable_ids": 1},
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school_name = school.get("school_name") or ""

    # Resolve timetable_ids for this school ------------------------------------
    timetable_ids: list = list(school.get("checkin_timetable_ids") or [])
    legacy = school.get("checkin_timetable_id")
    if legacy and legacy not in timetable_ids:
        timetable_ids.append(legacy)
    if not timetable_ids:
        # Fallback: match all timetables by exact (case-insensitive) school_name
        all_tts = await _fetch_all_pages("/timetables", {}, per_page=100, hard_cap=2000)
        target = school_name.strip().lower()
        timetable_ids = [t["id"] for t in all_tts if (t.get("school_name") or "").strip().lower() == target]

    if not timetable_ids:
        return {
            "school_id": school_id,
            "school_name": school_name,
            "sessions": [],
            "meta": {"total": 0, "page": page, "per_page": per_page},
            "note": "No timetable linked. Link a timetable from the onboarding workflow first.",
        }

    # Fetch all sessions across the school's timetables ------------------------
    all_sessions: list = []
    for tid in timetable_ids:
        params: dict = {"timetable_id": tid}
        if status:
            params["status"] = status
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        rows = await _fetch_all_pages("/sessions", params, per_page=500, hard_cap=5000)
        all_sessions.extend(rows)

    # Filter by date range client-side too (server ignores date filters)
    def _in_range(sd: str) -> bool:
        if not sd:
            return True
        if start_date and sd < start_date:
            return False
        if end_date and sd > end_date:
            return False
        return True

    all_sessions = [s for s in all_sessions if _in_range(s.get("session_date") or "")]

    # Sort newest first
    all_sessions.sort(key=lambda s: (s.get("session_date") or "", s.get("start_time") or ""), reverse=True)

    # Fetch educators once (map id -> name/email) ------------------------------
    educators = await _fetch_all_pages("/educators", {}, per_page=500, hard_cap=2000)
    edu_map = {e["id"]: {"id": e["id"], "name": e.get("full_name"), "email": e.get("email")} for e in educators if e.get("id")}

    # Fetch attendance for these sessions in bulk (server ignores school_name).
    # Strategy: pull attendance filtered by user_id for every distinct educator involved,
    # then index by session_id. Fewer requests than 1-per-session.
    involved_users: set = set()
    for s in all_sessions:
        if s.get("educator_id"):
            involved_users.add(s["educator_id"])
        if s.get("original_educator_id"):
            involved_users.add(s["original_educator_id"])

    attendance_by_session: dict = {}
    for uid in involved_users:
        rows = await _fetch_all_pages("/attendance", {"user_id": uid}, per_page=500, hard_cap=2000)
        for row in rows:
            sid = row.get("session_id")
            if sid:
                # Keep the earliest check-in for that session (first arrival)
                existing = attendance_by_session.get(sid)
                if not existing or (row.get("check_in_time") or "") < (existing.get("check_in_time") or ""):
                    attendance_by_session[sid] = row

    # Build enriched rows ------------------------------------------------------
    rows_out: list = []
    for s in all_sessions:
        att = attendance_by_session.get(s["id"])
        reached = (att or {}).get("reached_time") or (att or {}).get("check_in_time")
        late_min = _minutes_late(s.get("session_date"), s.get("start_time"), reached)
        classification = _classify_late((att or {}).get("admin_status"), late_min)

        educator = edu_map.get(s.get("educator_id")) or ({"id": s.get("educator_id"), "name": None, "email": None} if s.get("educator_id") else None)
        backup = edu_map.get(s.get("original_educator_id")) or ({"id": s.get("original_educator_id"), "name": None, "email": None} if s.get("original_educator_id") else None)

        rows_out.append({
            "id": s.get("id"),
            "session_date": s.get("session_date"),
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time"),
            "status": s.get("status"),
            "iscompleted": s.get("iscompleted"),
            "mode": s.get("mode"),
            "session_type": s.get("session_type"),
            "reason": s.get("reason"),
            "educator": educator,
            "backup_educator": backup,
            "was_reassigned": bool(s.get("original_educator_id")),
            "actual": {
                "reached_time": reached,
                "checkout_time": (att or {}).get("check_out_time"),
                "location_name": (att or {}).get("checkin_location_name"),
                "checkout_location_name": (att or {}).get("checkout_location_name"),
                "photo_path": (att or {}).get("photo_path"),
                "late_minutes": late_min,
                "admin_status_raw": (att or {}).get("admin_status"),
                "checkin_id": (att or {}).get("id"),
            } if att else None,
            "attendance_status": classification,
        })

    # Aggregate stats over ALL matching sessions (before pagination) -----------
    stats = {
        "total": len(rows_out),
        "completed": sum(1 for r in rows_out if r.get("iscompleted")),
        "on_time": sum(1 for r in rows_out if r["attendance_status"]["key"] == "on_time"),
        "late": sum(1 for r in rows_out if r["attendance_status"]["key"] in ("late", "late_lt_15")),
        "absent": sum(1 for r in rows_out if r["attendance_status"]["key"] in ("absent", "no_data") and (r.get("iscompleted") or (r.get("session_date") or "") < __import__("datetime").datetime.now().strftime("%Y-%m-%d"))),
        "reassigned": sum(1 for r in rows_out if r.get("was_reassigned")),
    }

    # Paginate ----------------------------------------------------------------
    total = len(rows_out)
    start_idx = (page - 1) * per_page
    paginated = rows_out[start_idx : start_idx + per_page]

    return {
        "school_id": school_id,
        "school_name": school_name,
        "timetable_ids": timetable_ids,
        "sessions": paginated,
        "meta": {"total": total, "page": page, "per_page": per_page},
        "stats": stats,
    }
