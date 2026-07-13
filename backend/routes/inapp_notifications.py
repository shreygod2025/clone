"""In-app notifications for OLL Mission Control (Phase 3).

Auto-emitted on: task_assigned, task_completed, task_approved, task_rejected,
                 task_comment, task_reassigned.

Each event also fires a best-effort Resend email so users get notified even
when they don't have the app open. Emails never raise — a broken email
service must not block task workflows.

Public endpoints:
  GET    /api/notifications              -> current user's notifications (recent first)
  GET    /api/notifications/unread-count -> {count: N}
  PATCH  /api/notifications/{id}/read    -> mark one read
  POST   /api/notifications/read-all     -> mark all read
"""
import asyncio
import logging
import os
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import Optional
import uuid
import httpx

from routes.shared import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications-inapp"])

APP_BASE_URL = os.environ.get("FRONTEND_URL") or os.environ.get("APP_URL", "https://oll.co")


async def _get_resend_key() -> Optional[str]:
    """Prefer the DB-stored admin key, fall back to env — mirrors the pattern
    used elsewhere in the codebase (see routes/team.py)."""
    doc = await db.admin_keys.find_one({"provider": "resend"}, {"_id": 0, "api_key": 1})
    if doc and doc.get("api_key"):
        return doc["api_key"]
    return os.environ.get("RESEND_API_KEY")


async def _send_task_email(
    to_email: str,
    to_name: str,
    subject: str,
    heading: str,
    body: str,
    cta_label: str,
    cta_url: str,
) -> None:
    """Fire-and-forget task notification email. Never raises."""
    try:
        api_key = await _get_resend_key()
        if not api_key or not to_email:
            logger.info("[task-email] no key or no recipient — skipped (to=%s)", to_email)
            return
        html = f"""
        <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; background:#f8fafc;">
          <div style="background:#1E3A5F; padding:24px; text-align:center;">
            <h1 style="color:#fff; margin:0; font-size:20px;">OLL Mission Control</h1>
          </div>
          <div style="padding:28px 24px; background:#fff;">
            <p style="margin:0 0 12px 0; color:#0f172a; font-size:15px;">Hi <strong>{to_name or 'there'}</strong>,</p>
            <h2 style="color:#0f172a; font-size:18px; margin:0 0 8px 0;">{heading}</h2>
            <p style="color:#334155; font-size:14px; line-height:1.5; margin:0 0 20px 0;">{body}</p>
            <a href="{cta_url}" style="display:inline-block; background:#D63031; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:600; font-size:13px;">
              {cta_label}
            </a>
            <p style="color:#94a3b8; font-size:11px; margin:24px 0 0 0;">You can adjust notification preferences in the app.</p>
          </div>
        </div>
        """
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "from": "OLL Mission Control <info@oll.co>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html,
                },
            )
            if resp.status_code >= 400:
                logger.warning("[task-email] resend %s to=%s body=%s", resp.status_code, to_email, resp.text[:300])
            else:
                logger.info("[task-email] sent to=%s status=%s", to_email, resp.status_code)
    except Exception as e:
        logger.warning("[task-email] failed to send to %s: %s", to_email, e)


async def create_notification(
    user_id: str,
    type_: str,
    title: str,
    message: str = "",
    task_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    cta_path: Optional[str] = None,
) -> None:
    """Helper — best-effort emit + fire-and-forget email. Never raises.
    Skips self-notifications."""
    try:
        if not user_id or user_id == actor_id:
            return
        cta_path = cta_path or ("/admin/tasks" if task_id else None)
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": type_,
            "title": title,
            "message": message,
            "task_id": task_id,
            "actor_id": actor_id,
            "cta_path": cta_path,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.notifications_inapp.insert_one(doc)

        # Fire-and-forget email — don't block the API on Resend latency.
        # Users live across three collections in this app: `team_users` (bulk),
        # `admins` (system admins), and `users` (legacy). Mirror _user_exists()
        # in routes/tasks.py and check all three in order of frequency.
        user = None
        for coll in ("team_users", "admins", "users"):
            user = await db[coll].find_one(
                {"$or": [{"id": user_id}, {"user_id": user_id}]},
                {"_id": 0, "email": 1, "name": 1, "full_name": 1},
            )
            if user:
                break
        if user and user.get("email"):
            cta_url = f"{APP_BASE_URL.rstrip('/')}{cta_path or '/admin/tasks'}"
            cta_label = {
                "task_assigned":     "Open Task",
                "task_completed":    "Review Completion",
                "task_approved":     "Open Task",
                "task_rejected":     "Open Task",
                "task_comment":      "View Comments",
                "task_reassigned":   "Open Task",
                "approval_required": "Review & Approve",
            }.get(type_, "Open in App")
            logger.info("[task-email] queued to=%s type=%s task=%s", user["email"], type_, task_id)
            asyncio.create_task(_send_task_email(
                to_email=user["email"],
                to_name=user.get("name") or user.get("full_name") or "",
                subject=title,
                heading=title,
                body=message or title,
                cta_label=cta_label,
                cta_url=cta_url,
            ))
        else:
            logger.info("[task-email] SKIPPED user_id=%s (no email on record)", user_id)
    except Exception as e:
        logger.warning("[create_notification] soft-failed: %s", e)


@router.get("")
async def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = False,
    user: dict = Depends(get_current_user),
):
    uid = user.get("id") or user.get("user_id") or ""
    q = {"user_id": uid}
    if unread_only:
        q["is_read"] = False
    docs = await db.notifications_inapp.find(q).sort("created_at", -1).to_list(limit)
    for d in docs:
        d.pop("_id", None)
    return docs


@router.get("/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    uid = user.get("id") or user.get("user_id") or ""
    c = await db.notifications_inapp.count_documents({"user_id": uid, "is_read": False})
    return {"count": c}


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    uid = user.get("id") or user.get("user_id") or ""
    res = await db.notifications_inapp.update_one(
        {"id": notification_id, "user_id": uid}, {"$set": {"is_read": True}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    uid = user.get("id") or user.get("user_id") or ""
    res = await db.notifications_inapp.update_many(
        {"user_id": uid, "is_read": False}, {"$set": {"is_read": True}}
    )
    return {"ok": True, "updated": res.modified_count}
