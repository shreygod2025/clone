"""In-app notifications for OLL Mission Control (Phase 3).

Auto-emitted on: task_assigned, task_completed, task_approved, task_rejected,
                 task_comment, task_reassigned.

Public endpoints:
  GET    /api/notifications              -> current user's notifications (recent first)
  GET    /api/notifications/unread-count -> {count: N}
  PATCH  /api/notifications/{id}/read    -> mark one read
  POST   /api/notifications/read-all     -> mark all read
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import Optional
import uuid

from routes.shared import db, get_current_user


router = APIRouter(prefix="/notifications", tags=["notifications-inapp"])


async def create_notification(
    user_id: str,
    type_: str,
    title: str,
    message: str = "",
    task_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    cta_path: Optional[str] = None,
) -> None:
    """Helper — best-effort emit. Never raises. Skips self-notifications."""
    try:
        if not user_id or user_id == actor_id:
            return
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": type_,
            "title": title,
            "message": message,
            "task_id": task_id,
            "actor_id": actor_id,
            "cta_path": cta_path or ("/admin/tasks" if task_id else None),
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.notifications_inapp.insert_one(doc)
    except Exception:
        pass


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
