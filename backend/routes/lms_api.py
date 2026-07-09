"""
LMS (OLL Learning app) proxy + CRM matcher.

External API base: env LMS_BASE_URL  (e.g. https://<lms>.preview.emergentagent.com/api)
Auth: X-API-Key header (env LMS_API_KEY)
Every LMS endpoint is prefixed with /external.

What lives here:
  • Thin proxy helpers to the LMS
  • `POST /api/lms/import-schools`  — pulls every LMS school and either
      creates a new school_inquiries row (status=`active`) or links an existing
      row (case-insensitive name match) via `lms_school_id`
  • `GET  /api/schools/{school_id}/lms-report` — enriched, month/class filterable
      classwise track-sheet + teacher list, for the School CRM detail page
"""
import os
import logging
from typing import Optional, List
from collections import defaultdict
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

LMS_BASE_URL = os.environ.get("LMS_BASE_URL", "").rstrip("/")
LMS_API_KEY  = os.environ.get("LMS_API_KEY", "")


def _headers():
    return {"X-API-Key": LMS_API_KEY, "Content-Type": "application/json"}


async def _lms_get(path: str, params: dict | None = None, client: Optional[httpx.AsyncClient] = None):
    if not LMS_BASE_URL or not LMS_API_KEY:
        raise HTTPException(status_code=500, detail="LMS is not configured on the server")
    url = f"{LMS_BASE_URL}{path}"
    if client is not None:
        r = await client.get(url, headers=_headers(), params=params)
    else:
        async with httpx.AsyncClient(timeout=25) as c:
            r = await c.get(url, headers=_headers(), params=params)
    if r.status_code >= 400:
        logger.warning("LMS %s → %s: %s", path, r.status_code, r.text[:400])
        if r.status_code == 401:
            raise HTTPException(status_code=502, detail="LMS rejected our API key")
        if r.status_code == 403:
            raise HTTPException(status_code=502, detail="LMS API key lacks permission for this call")
        if r.status_code == 404:
            raise HTTPException(status_code=404, detail="Resource not found in LMS")
        raise HTTPException(status_code=502, detail=f"LMS error ({r.status_code})")
    try:
        return r.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="LMS returned non-JSON payload")


def _norm(s: str | None) -> str:
    return (s or "").strip().lower()


# ── Sample school import ────────────────────────────────────────────────────
@router.post("/lms/import-schools")
async def import_lms_schools(user: dict = Depends(get_current_user)):
    """Fetch every unique school from the LMS track-sheet + insert or link
    them in `school_inquiries`. Idempotent — safe to run multiple times.
    Requires admin."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    track = await _lms_get("/external/track-sheet")
    rows = track if isinstance(track, list) else (track.get("data") or track.get("rows") or [])

    # Collapse to unique LMS schools
    lms_schools: dict[str, str] = {}
    for r in rows:
        sid = r.get("school_id")
        name = r.get("school_name")
        if sid and name and sid not in lms_schools:
            lms_schools[sid] = name

    created = 0
    linked = 0
    skipped: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()

    for lms_id, name in lms_schools.items():
        # Already linked?
        already = await db.school_inquiries.find_one({"lms_school_id": lms_id}, {"_id": 0, "id": 1})
        if already:
            skipped.append({"lms_school_id": lms_id, "name": name, "reason": "already linked"})
            continue

        # Try case-insensitive name match to an existing CRM school
        match = await db.school_inquiries.find_one(
            {"school_name": {"$regex": f"^{name.strip()}$", "$options": "i"}},
            {"_id": 0, "id": 1},
        )
        if match:
            await db.school_inquiries.update_one(
                {"id": match["id"]},
                {"$set": {"lms_school_id": lms_id, "updated_at": now}},
            )
            linked += 1
            continue

        # Otherwise seed a sample school
        import uuid
        doc = {
            "id": str(uuid.uuid4()),
            "school_name": name,
            "contact_name": "",
            "email": "",
            "phone": "",
            "location": "",
            "board": "",
            "school_size": "",
            "fee_range": "",
            "programs_interested": [],
            "support_needed": "",
            "notes": f"Imported from LMS on {now[:10]}",
            "status": "active",
            "model": "",
            "total_students": 0,
            "assigned_to": None,
            "assigned_to_name": "",
            "activity_log": [{"action": "created_from_lms", "at": now}],
            "lms_school_id": lms_id,
            "created_at": now,
            "updated_at": now,
        }
        await db.school_inquiries.insert_one(doc)
        created += 1

    return {
        "created": created,
        "linked": linked,
        "skipped": skipped,
        "total_lms_schools": len(lms_schools),
    }


# ── Per-school report ────────────────────────────────────────────────────────
@router.get("/schools/{school_id}/lms-report")
async def get_school_lms_report(
    school_id: str,
    month: Optional[str] = Query(None, description="YYYY-MM · omit or send 'all' for full history"),
    class_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Full LMS report for one CRM school:
      • school summary + per-class totals + student roster
      • teacher list
      • class-wise track sheet (date, time, topic, %, teacher feedback)

    Filterable by `month` (YYYY-MM) and `class_id`.
    """
    school = await db.school_inquiries.find_one(
        {"id": school_id},
        {"_id": 0, "school_name": 1, "lms_school_id": 1},
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    lms_id = school.get("lms_school_id")
    if not lms_id:
        return {
            "school_id": school_id,
            "school_name": school.get("school_name"),
            "linked": False,
            "note": "This school is not linked to the LMS. Run 'Import LMS Schools' or set lms_school_id manually.",
        }

    # Normalise month filter — treat 'all' / empty as unrestricted
    month_filter = (month or "").strip()
    if month_filter.lower() in ("", "all"):
        month_filter = None

    async with httpx.AsyncClient(timeout=25, limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)) as client:
        # Parallel fetch: school report + track sheet.
        # /reports may 404 for schools that only exist in the track-sheet — we tolerate that.
        import asyncio
        params = {"school_id": lms_id}
        if month_filter:
            params["month"] = month_filter
        report_task = _lms_get(f"/external/schools/{lms_id}/reports", client=client)
        track_task = _lms_get("/external/track-sheet", params=params, client=client)
        report_raw, track = await asyncio.gather(report_task, track_task, return_exceptions=True)

    # Graceful fallback for report — synthesize a minimal summary from the track sheet.
    if isinstance(report_raw, Exception):
        logger.info("LMS /reports 404/err for %s → falling back to track-sheet only: %s", lms_id, report_raw)
        report = {"summary": {}, "classes": [], "teachers": [], "students": []}
    else:
        report = report_raw
    if isinstance(track, Exception):
        raise track

    rows = track if isinstance(track, list) else (track.get("data") or track.get("rows") or [])
    # Trust the client-side filter too (some servers ignore `month` param).
    if month_filter:
        rows = [r for r in rows if (r.get("date") or "")[:7] == month_filter]
    if class_id:
        rows = [r for r in rows if r.get("class_id") == class_id]

    # Available months (for the frontend dropdown) — derived from an
    # UNFILTERED track fetch (small extra call, but gives an accurate month picker).
    if month_filter or class_id:
        async with httpx.AsyncClient(timeout=25) as client:
            all_track = await _lms_get("/external/track-sheet", params={"school_id": lms_id}, client=client)
        all_rows = all_track if isinstance(all_track, list) else (all_track.get("data") or all_track.get("rows") or [])
    else:
        all_rows = rows

    months_set: set[str] = set()
    for r in all_rows:
        d = (r.get("date") or "")[:7]
        if len(d) == 7:
            months_set.add(d)
    available_months = sorted(months_set, reverse=True)

    # Group filtered rows by class.
    # We also build a class_name lookup from the UNFILTERED rows so a class
    # keeps its readable name even if the current filter hides its sessions
    # or the LMS /reports endpoint (`classes_meta`) is unavailable.
    classes_meta = {c["id"]: c for c in (report.get("classes") or [])}
    class_name_from_rows: dict[str, str] = {}
    for r in all_rows:
        cid = r.get("class_id")
        cname = r.get("class_name") or r.get("class") or r.get("classroom_name")
        if cid and cname and cid not in class_name_from_rows:
            class_name_from_rows[cid] = cname
    grouped: dict[str, list] = defaultdict(list)
    for r in rows:
        cid = r.get("class_id") or "_none"
        grouped[cid].append({
            "id": r.get("id"),
            "date": r.get("date"),
            "topic": r.get("topic_name") or r.get("activity_label"),
            "activity_label": r.get("activity_label"),
            "session_type": r.get("session_type"),
            "percentage": r.get("percentage"),
            "notes": r.get("notes"),
            "session_pace": r.get("session_pace"),
            "student_engagement": r.get("student_engagement"),
            "project_difficulty": r.get("project_difficulty"),
            "kit_issues": r.get("kit_issues"),
            "educator_name": r.get("educator_name"),
            "educator_id": r.get("educator_id"),
            "is_oll_teacher": r.get("is_oll_teacher"),
            "project_name": r.get("project_name"),
            "class_name": r.get("class_name") or r.get("class") or r.get("classroom_name"),
        })

    # Newest first per class
    for cid in grouped:
        grouped[cid].sort(key=lambda x: x.get("date") or "", reverse=True)

    classes_out: list = []
    for cid, sessions in grouped.items():
        meta = classes_meta.get(cid, {})
        classes_out.append({
            "class_id": cid,
            "class_name": (
                meta.get("name")
                or class_name_from_rows.get(cid)
                or (sessions[0].get("class_name") if sessions else None)
                or cid
            ),
            "student_count": meta.get("student_count"),
            "total_xp": meta.get("total_xp"),
            "avg_xp": meta.get("avg_xp"),
            "completed_projects": meta.get("completed_projects"),
            "session_count": len(sessions),
            "sessions": sessions,
        })
    # Include empty classes from report (so they still show in the class list even
    # if there are no track sheet entries in the current filter)
    seen_ids = {c["class_id"] for c in classes_out}
    for c in (report.get("classes") or []):
        if c["id"] not in seen_ids:
            classes_out.append({
                "class_id": c["id"],
                "class_name": c.get("name"),
                "student_count": c.get("student_count"),
                "total_xp": c.get("total_xp"),
                "avg_xp": c.get("avg_xp"),
                "completed_projects": c.get("completed_projects"),
                "session_count": 0,
                "sessions": [],
            })
    classes_out.sort(key=lambda c: c["class_name"] or "")

    # If the LMS `/reports` endpoint didn't return teachers/summary (e.g., a
    # track-sheet-only school), synthesize them from the rows we DO have.
    teachers = report.get("teachers") or []
    if not teachers:
        seen_ed = {}
        for r in all_rows:
            eid = r.get("educator_id")
            if eid and eid not in seen_ed:
                seen_ed[eid] = {"id": eid, "name": r.get("educator_name"), "is_oll_teacher": r.get("is_oll_teacher")}
        teachers = list(seen_ed.values())

    summary = report.get("summary") or {}
    if not summary:
        class_ids = {r.get("class_id") for r in all_rows if r.get("class_id")}
        summary = {
            "total_classes": len(class_ids),
            "total_students": 0,
            "total_teachers": len(teachers),
            "total_xp": 0,
        }

    return {
        "school_id": school_id,
        "school_name": school.get("school_name"),
        "linked": True,
        "lms_school_id": lms_id,
        "summary": summary,
        "teachers": teachers,
        "students": report.get("students") or [],
        "classes": classes_out,
        "filters": {
            "available_months": available_months,
            "selected_month": month_filter,
            "selected_class_id": class_id,
        },
        "meta": {
            "total_sessions": len(rows),
        },
    }
