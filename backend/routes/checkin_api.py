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

CHECKIN_BASE_URL = f"https://{os.environ.get('CHECKIN_PROJECT_ID', '')}.supabase.co/functions/v1/external-api"
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
    Create (or update) a timetable in the checkin API and save the timetable_id
    on the school record in MongoDB.
    payload fields:
        educator_id, start_date, end_date, days_of_week, time_slots,
        session_mode, sessions_per_week, notes
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

    existing_timetable_id = school.get("checkin_timetable_id")

    if existing_timetable_id:
        # Update existing
        result = await _checkin_put(f"/timetables/{existing_timetable_id}", api_body)
        timetable_id = existing_timetable_id
    else:
        # Create new
        result = await _checkin_post("/timetables", api_body)
        timetable_id = result.get("data", {}).get("id") or result.get("id")

    # Persist timetable_id on the school record
    if timetable_id:
        await db.school_inquiries.update_one(
            {"id": school_id},
            {"$set": {"checkin_timetable_id": timetable_id}}
        )

    return {"success": True, "timetable_id": timetable_id, "data": result.get("data", result)}


@router.get("/schools/{school_id}/timetable")
async def get_timetable(school_id: str, user: dict = Depends(get_current_user)):
    """Fetch the saved timetable from the checkin API for this school."""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_id": 1, "school_name": 1})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    timetable_id = school.get("checkin_timetable_id")
    if not timetable_id:
        return {"timetable": None}
    data = await _checkin_get(f"/timetables/{timetable_id}")
    return {"timetable": data.get("data", data), "timetable_id": timetable_id}


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
    """List sessions for this school from the checkin API."""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "school_name": 1, "checkin_timetable_id": 1})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    params: dict = {"page": page, "per_page": per_page}
    if school.get("school_name"):
        params["school_name"] = school["school_name"]
    if status:
        params["status"] = status
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date

    data = await _checkin_get("/sessions", params)
    return {
        "sessions": data.get("data", []),
        "meta": data.get("meta", {}),
        "school_name": school.get("school_name"),
        "timetable_id": school.get("checkin_timetable_id"),
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
