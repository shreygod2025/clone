"""
Verified Success Stories — CRUD + public read.

Levels:
  1 — Creator          (child made something independently)
  2 — Published        (creation shared with the world)
  3 — Recognition      (external validation — competitions, media, etc.)
  4 — Impact           (measurable value — downloads, revenue, users, adoption)
  5 — Transformation   (life-changing outcome — scholarship, funding, admission)
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from database import db
from routes.auth import get_current_user

router = APIRouter()


LEVEL_NAMES = {
    1: "Creator",
    2: "Published",
    3: "Recognition",
    4: "Impact",
    5: "Transformation",
}


class Attachment(BaseModel):
    url: str
    name: Optional[str] = None
    type: Optional[str] = None  # image | pdf | doc | link


class SuccessStoryIn(BaseModel):
    student_name: str
    age: Optional[int] = None
    school_name: Optional[str] = None
    image_url: str
    level: int = Field(..., ge=1, le=5)
    story: str  # rich HTML
    excerpt: Optional[str] = None  # short teaser used on cards / public site
    tags: List[str] = []
    attachments: List[Attachment] = []
    evidence_links: List[str] = []
    verification_notes: Optional[str] = None
    is_published: bool = True


class SuccessStoryUpdate(BaseModel):
    student_name: Optional[str] = None
    age: Optional[int] = None
    school_name: Optional[str] = None
    image_url: Optional[str] = None
    level: Optional[int] = Field(None, ge=1, le=5)
    story: Optional[str] = None
    excerpt: Optional[str] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[Attachment]] = None
    evidence_links: Optional[List[str]] = None
    verification_notes: Optional[str] = None
    is_published: Optional[bool] = None


def _is_admin(u: dict) -> bool:
    return u.get("role") == "admin"


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    lvl = doc.get("level")
    if isinstance(lvl, int):
        doc["level_name"] = LEVEL_NAMES.get(lvl, "Unknown")
        doc["is_flagship"] = lvl == 5
    return doc


# ─── Admin CRUD ─────────────────────────────────────────────────────────────

@router.post("/success-stories")
async def create_success_story(payload: SuccessStoryIn, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "level_name": LEVEL_NAMES.get(payload.level, "Unknown"),
        "is_flagship": payload.level == 5,
        "created_by": user.get("id"),
        "created_by_name": user.get("full_name") or user.get("name") or user.get("email"),
        "created_at": now,
        "updated_at": now,
    })
    await db.success_stories.insert_one(doc)
    return _serialize(doc)


@router.get("/success-stories")
async def list_success_stories(
    level: Optional[int] = Query(None, ge=1, le=5),
    published_only: bool = False,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    user: dict = Depends(get_current_user),
):
    """Any authenticated team member can browse the internal gallery."""
    q: dict = {}
    if level is not None:
        q["level"] = level
    if published_only:
        q["is_published"] = True
    if search:
        rx = {"$regex": search, "$options": "i"}
        q["$or"] = [{"student_name": rx}, {"school_name": rx}, {"tags": rx}]

    items = await db.success_stories.find(q).sort("created_at", -1).to_list(limit)
    return [_serialize(i) for i in items]


@router.get("/success-stories/stats")
async def success_story_stats(user: dict = Depends(get_current_user)):
    total = await db.success_stories.count_documents({})
    published = await db.success_stories.count_documents({"is_published": True})
    by_level = {}
    for lvl in (1, 2, 3, 4, 5):
        by_level[str(lvl)] = await db.success_stories.count_documents({"level": lvl})
    return {
        "total": total,
        "published": published,
        "by_level": by_level,
        "level_names": {str(k): v for k, v in LEVEL_NAMES.items()},
    }


@router.get("/success-stories/{story_id}")
async def get_success_story(story_id: str, user: dict = Depends(get_current_user)):
    doc = await db.success_stories.find_one({"id": story_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Story not found")
    return _serialize(doc)


@router.patch("/success-stories/{story_id}")
async def update_success_story(story_id: str, payload: SuccessStoryUpdate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    doc = await db.success_stories.find_one({"id": story_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Story not found")

    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "level" in update:
        update["level_name"] = LEVEL_NAMES.get(update["level"], "Unknown")
        update["is_flagship"] = update["level"] == 5
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.success_stories.update_one({"id": story_id}, {"$set": update})
    fresh = await db.success_stories.find_one({"id": story_id})
    return _serialize(fresh)


@router.delete("/success-stories/{story_id}")
async def delete_success_story(story_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.success_stories.delete_one({"id": story_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
    return {"success": True}


# ─── Public endpoints (no auth) ─────────────────────────────────────────────

@router.get("/public/success-stories")
async def list_public_success_stories(
    level: Optional[int] = Query(None, ge=1, le=5),
    limit: int = Query(100, ge=1, le=500),
):
    q: dict = {"is_published": True}
    if level is not None:
        q["level"] = level
    items = await db.success_stories.find(
        q,
        {
            "_id": 0,
            # Trim sensitive/internal fields from public payload
            "verification_notes": 0,
            "created_by": 0,
        },
    ).sort([("is_flagship", -1), ("level", -1), ("created_at", -1)]).to_list(limit)
    return [_serialize(i) for i in items]


@router.get("/public/success-stories/{story_id}")
async def get_public_success_story(story_id: str):
    doc = await db.success_stories.find_one(
        {"id": story_id, "is_published": True},
        {"_id": 0, "verification_notes": 0, "created_by": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Story not found")
    return _serialize(doc)


@router.get("/public/success-stories/stats/summary")
async def public_success_story_stats():
    total = await db.success_stories.count_documents({"is_published": True})
    by_level = {}
    for lvl in (1, 2, 3, 4, 5):
        by_level[str(lvl)] = await db.success_stories.count_documents({"level": lvl, "is_published": True})
    return {
        "total": total,
        "by_level": by_level,
        "level_names": {str(k): v for k, v in LEVEL_NAMES.items()},
    }
