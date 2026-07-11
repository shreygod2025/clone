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
async def _run_lms_import() -> dict:
    """Core sync logic — pulls every LMS school and creates or links them
    in `school_inquiries`. Idempotent. Used by both the manual endpoint and
    the daily 6PM IST cron. Also stamps `last_lms_sync_at` on the linked
    schools so the CRM can show "last synced" timestamps."""
    track = await _lms_get("/external/track-sheet")
    rows = track if isinstance(track, list) else (track.get("data") or track.get("rows") or [])

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
        already = await db.school_inquiries.find_one({"lms_school_id": lms_id}, {"_id": 0, "id": 1})
        if already:
            # Refresh the sync timestamp on existing linked rows.
            await db.school_inquiries.update_one(
                {"id": already["id"]},
                {"$set": {"last_lms_sync_at": now}},
            )
            skipped.append({"lms_school_id": lms_id, "name": name, "reason": "already linked"})
            continue

        match = await db.school_inquiries.find_one(
            {"school_name": {"$regex": f"^{name.strip()}$", "$options": "i"}},
            {"_id": 0, "id": 1},
        )
        if match:
            await db.school_inquiries.update_one(
                {"id": match["id"]},
                {"$set": {"lms_school_id": lms_id, "last_lms_sync_at": now, "updated_at": now}},
            )
            linked += 1
            continue

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
            "last_lms_sync_at": now,
            "created_at": now,
            "updated_at": now,
        }
        await db.school_inquiries.insert_one(doc)
        created += 1

    result = {
        "created": created,
        "linked": linked,
        "skipped": skipped,
        "total_lms_schools": len(lms_schools),
        "synced_at": now,
    }
    # Persist a global sync record for CRM header display + observability.
    await db.system_state.update_one(
        {"_id": "lms_sync"},
        {"$set": {
            "last_sync_at": now,
            "last_created": created,
            "last_linked": linked,
            "last_total": len(lms_schools),
        }},
        upsert=True,
    )
    return result


async def run_lms_sync_scheduled():
    """Cron entrypoint — daily 6:00 PM IST. Wraps `_run_lms_import` with
    logging so scheduler failures don't crash the loop."""
    try:
        result = await _run_lms_import()
        logger.info(
            "[LMS-SYNC] daily import complete · created=%s linked=%s total=%s",
            result["created"], result["linked"], result["total_lms_schools"],
        )
    except Exception as e:
        logger.exception("[LMS-SYNC] daily import failed: %s", e)


@router.post("/lms/import-schools")
async def import_lms_schools(user: dict = Depends(get_current_user)):
    """Manual trigger — same logic as the 6PM IST daily cron. Admin only."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return await _run_lms_import()


@router.get("/lms/sync-status")
async def lms_sync_status(user: dict = Depends(get_current_user)):
    """Latest sync metadata for the CRM header ("Last synced …" pill)."""
    doc = await db.system_state.find_one({"_id": "lms_sync"}, {"_id": 0})
    return doc or {"last_sync_at": None}


# ── Per-school report ────────────────────────────────────────────────────────
async def _build_school_lms_report(
    school: dict,
    month: Optional[str],
    class_id: Optional[str],
):
    """Shared builder used by the admin (auth) and public (share-token) endpoints.
    `school` must contain `id`, `school_name`, `lms_school_id`.
    """
    school_id = school.get("id")
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



@router.get("/schools/{school_id}/lms-report")
async def get_school_lms_report(
    school_id: str,
    month: Optional[str] = Query(None, description="YYYY-MM · omit or send 'all' for full history"),
    class_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Authenticated per-school LMS report (admin / team). See
    `_build_school_lms_report` for shape."""
    school = await db.school_inquiries.find_one(
        {"id": school_id},
        {"_id": 0, "id": 1, "school_name": 1, "lms_school_id": 1},
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return await _build_school_lms_report(school, month, class_id)


# ── Public shareable LMS report ─────────────────────────────────────────────
import secrets


@router.post("/schools/{school_id}/lms-report/share")
async def create_lms_report_share_link(
    school_id: str,
    user: dict = Depends(get_current_user),
):
    """Create (or return the existing) share token for this school's LMS
    report. Anyone with the token can view the report via
    `/api/public/lms-report/{token}` (no auth). Admin only."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    school = await db.school_inquiries.find_one(
        {"id": school_id},
        {"_id": 0, "id": 1, "school_name": 1, "lms_school_id": 1, "lms_report_share_token": 1},
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    if not school.get("lms_school_id"):
        raise HTTPException(status_code=400, detail="School is not linked to the LMS")

    token = school.get("lms_report_share_token")
    if not token:
        token = secrets.token_urlsafe(24)
        await db.school_inquiries.update_one(
            {"id": school_id},
            {"$set": {
                "lms_report_share_token": token,
                "lms_report_share_created_at": datetime.now(timezone.utc).isoformat(),
                "lms_report_share_created_by": user.get("user_id") or user.get("id"),
            }},
        )
    return {"token": token, "school_name": school.get("school_name")}


@router.delete("/schools/{school_id}/lms-report/share")
async def revoke_lms_report_share_link(
    school_id: str,
    user: dict = Depends(get_current_user),
):
    """Revoke the share token so the public link stops working. Admin only."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.school_inquiries.update_one(
        {"id": school_id},
        {"$unset": {
            "lms_report_share_token": "",
            "lms_report_share_created_at": "",
            "lms_report_share_created_by": "",
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="School not found")
    return {"revoked": True}


@router.get("/public/lms-report/{token}")
async def public_lms_report(
    token: str,
    month: Optional[str] = Query(None),
    class_id: Optional[str] = None,
):
    """PUBLIC (no auth) — Anyone with a valid share token can view this
    school's LMS report. Same payload shape as the authed endpoint."""
    if not token or len(token) < 20:
        raise HTTPException(status_code=404, detail="Invalid share link")
    school = await db.school_inquiries.find_one(
        {"lms_report_share_token": token},
        {"_id": 0, "id": 1, "school_name": 1, "lms_school_id": 1},
    )
    if not school:
        raise HTTPException(status_code=404, detail="Share link not found or revoked")
    return await _build_school_lms_report(school, month, class_id)



# ── LMS user lookup (credentials) ────────────────────────────────────────────
@router.get("/lms/schools-with-users")
async def list_lms_linked_schools(user: dict = Depends(get_current_user)):
    """Return every CRM school that's linked to an LMS school. Feeds the
    credential-lookup school picker in Admin Support Center."""
    rows = await db.school_inquiries.find(
        {"lms_school_id": {"$exists": True, "$ne": None, "$ne": ""}},
        {"_id": 0, "id": 1, "school_name": 1, "lms_school_id": 1},
    ).sort("school_name", 1).to_list(length=1000)
    return {"count": len(rows), "schools": rows}


@router.get("/lms/schools/{school_id}/users")
async def get_lms_school_users(
    school_id: str,
    q: Optional[str] = Query(None, description="Case-insensitive filter on username / name"),
    role: Optional[str] = Query(None, description="Filter by role: school | student | teacher"),
    user: dict = Depends(get_current_user),
):
    """Proxy to the LMS `/external/schools/{lms_id}/users` endpoint, which
    returns every LMS user (school admin, students, teachers) — including
    the plain-text password. Used by the "View LMS Credentials" action in
    support tickets so the admin can quickly read back a user's login for
    forgot-password / forgot-username tickets.

    Password *changes* are not exposed by the LMS API; admins must reset via
    the LMS admin console. The frontend surfaces a link accordingly.
    """
    school = await db.school_inquiries.find_one(
        {"id": school_id},
        {"_id": 0, "id": 1, "school_name": 1, "lms_school_id": 1},
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found in CRM")
    lms_id = school.get("lms_school_id")
    if not lms_id:
        raise HTTPException(status_code=400, detail="This school is not linked to the LMS")

    data = await _lms_get(f"/external/schools/{lms_id}/users")
    users = data.get("users") or []
    if role:
        users = [u for u in users if (u.get("role") or "").lower() == role.lower()]
    if q:
        needle = q.strip().lower()
        users = [
            u for u in users
            if needle in (u.get("username") or "").lower()
            or needle in (u.get("name") or "").lower()
        ]
    return {
        "school_id": school_id,
        "school_name": school.get("school_name"),
        "lms_school_id": lms_id,
        "count": len(users),
        "users": users,
    }


# ── LMS feedback → Support tickets sync ─────────────────────────────────────
def _feedback_to_related(fb_type: str) -> str:
    """Map LMS feedback_type → OLL support sub-category slug."""
    t = (fb_type or "").strip().lower()
    if t in ("bug", "issue", "error"):
        return "lms_bug"
    if t in ("change_password", "password", "credentials"):
        return "forgot_password"
    return "other"


async def _sync_lms_feedback() -> dict:
    """Fetch the latest LMS feedback items and mirror any new ones into
    `support_queries` as tickets under category `lms`. Dedupes on
    `lms_feedback_id`. Runs from both the manual button and the daily cron."""
    import uuid
    from routes.support import get_next_ticket_number

    data = await _lms_get("/external/feedback")
    items = data.get("items") or []
    now = datetime.now(timezone.utc).isoformat()
    created = 0
    skipped = 0

    for fb in items:
        fid = fb.get("id")
        if not fid:
            continue
        exists = await db.support_queries.find_one({"lms_feedback_id": fid}, {"_id": 0, "id": 1})
        if exists:
            skipped += 1
            continue

        related_to = _feedback_to_related(fb.get("feedback_type"))
        priority = "high" if related_to == "lms_bug" else "normal"
        subject_bits = [fb.get("feedback_type") or "feedback", fb.get("username") or fb.get("user_name") or ""]
        subject_summary = " · ".join([s for s in subject_bits if s]).strip(" ·")

        doc = {
            "id": str(uuid.uuid4()),
            "name": fb.get("user_name") or fb.get("username") or "LMS User",
            "phone": fb.get("contact_phone") or "",
            "email": fb.get("contact_email") or "",
            "query_type": "lms",
            "related_to": related_to,
            "inquiry_type": (fb.get("user_role") or "student").lower(),
            "message": fb.get("message") or "",
            "query_details": fb.get("message") or "",
            "priority": priority,
            "status": "open",
            "source": "lms_feedback",
            "subject": subject_summary or None,
            "attachments": (
                [{"name": "LMS screenshot", "url": fb.get("screenshot_url"), "type": "image/*"}]
                if fb.get("screenshot_url") else []
            ),
            # LMS-specific metadata (used for later re-sync / UI enrichment)
            "lms_feedback_id": fid,
            "lms_school_id": fb.get("school_id"),
            "lms_school_name": fb.get("school_name"),
            "lms_username": fb.get("username"),
            "lms_user_role": fb.get("user_role"),
            "lms_feedback_type": fb.get("feedback_type"),
            "created_by": "system",
            "created_by_name": "LMS Feedback Sync",
            "viewers": [],
            "created_at": fb.get("created_at") or now,
            "updated_at": now,
            "comments": [],
            "assigned_to": None,
            "ticket_number": await get_next_ticket_number(),
        }
        await db.support_queries.insert_one(doc)
        created += 1

    await db.system_state.update_one(
        {"_id": "lms_feedback_sync"},
        {"$set": {"last_sync_at": now, "last_created": created, "last_total": len(items)}},
        upsert=True,
    )
    return {"created": created, "skipped": skipped, "total": len(items), "synced_at": now}


async def run_lms_feedback_sync_scheduled():
    try:
        result = await _sync_lms_feedback()
        logger.info("[LMS-FEEDBACK-SYNC] created=%s skipped=%s total=%s",
                    result["created"], result["skipped"], result["total"])
    except Exception as e:
        logger.exception("[LMS-FEEDBACK-SYNC] failed: %s", e)


@router.post("/lms/sync-feedback")
async def sync_lms_feedback(user: dict = Depends(get_current_user)):
    """Manual trigger — same logic as the daily 6 PM IST cron. Admin only."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return await _sync_lms_feedback()


@router.get("/lms/feedback-sync-status")
async def lms_feedback_sync_status(user: dict = Depends(get_current_user)):
    doc = await db.system_state.find_one({"_id": "lms_feedback_sync"}, {"_id": 0})
    return doc or {"last_sync_at": None}
