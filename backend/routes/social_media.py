"""
Social Media metrics — fetches Instagram profile stats via Apify's
`instagram-scraper/instagram-profile-scraper` actor. Cached in Mongo for
6h so repeated admin dashboard views don't burn Apify compute units.
"""
import logging
import os
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from .shared import db, get_current_user

router = APIRouter()

APIFY_ACTOR = "instagram-scraper~instagram-profile-scraper"
APIFY_SYNC_URL = (
    f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/run-sync-get-dataset-items"
)
CACHE_TTL_HOURS = 6
DEFAULT_PROFILE_URL = "https://www.instagram.com/oll.co_/"


def _is_admin_or_reports(user: dict) -> bool:
    role = user.get("role")
    if role in ("admin", "super_admin"):
        return True
    perms = user.get("permissions") or []
    return any(p == "reports" or p.startswith("reports.") for p in perms)


def _normalise(url: str) -> tuple[str, str]:
    """Return (username, canonical_url) for an Instagram profile URL."""
    parsed = urlparse(url or "")
    host = parsed.netloc.lower().removeprefix("www.")
    if host != "instagram.com":
        raise HTTPException(status_code=400, detail="profile_url must be an instagram.com URL")
    parts = [p for p in parsed.path.split("/") if p]
    if not parts or parts[0].lower() in {"p", "reel", "explore", "accounts"}:
        raise HTTPException(status_code=400, detail="Provide a profile URL, not a post/page")
    username = parts[0].lower()
    return username, f"https://www.instagram.com/{username}/"


async def _run_apify(profile_url: str) -> dict:
    token = os.environ.get("APIFY_API_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=500, detail="Apify token not configured")

    payload = {
        "instagramUsernames": [profile_url],
        "skipLatestPosts": False,
        "skipRelatedProfiles": True,
        "scrapeFacebookProfile": False,
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            r = await client.post(
                APIFY_SYNC_URL,
                params={"format": "json", "clean": "true", "limit": 1},
                headers=headers,
                json=payload,
            )
        r.raise_for_status()
        items = r.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Instagram scrape timed out")
    except httpx.HTTPStatusError as exc:
        # Never surface the token or authenticated URL to the client.
        code = exc.response.status_code
        logging.warning("[social_media] Apify HTTP %s: %s", code, exc.response.text[:200])
        if code in (401, 403):
            raise HTTPException(status_code=502, detail="Apify authentication failed")
        raise HTTPException(status_code=502, detail="Apify request failed")
    except (httpx.HTTPError, ValueError) as exc:
        logging.warning("[social_media] Apify parse error: %s", exc)
        raise HTTPException(status_code=502, detail="Invalid response from Apify")

    if not isinstance(items, list) or not items:
        raise HTTPException(status_code=404, detail="Profile returned no data")

    item = items[0] or {}
    if item.get("ig_status") in {"invalid_input", "not_found"}:
        raise HTTPException(status_code=404, detail=item.get("message", "Profile unavailable"))
    return item


def _project(raw: dict, canonical_url: str, username: str) -> dict:
    latest = []
    for p in (raw.get("latest_posts") or [])[:12]:
        latest.append({
            "id": p.get("id") or p.get("pk") or p.get("shortcode"),
            "url": p.get("url"),
            "shortcode": p.get("shortcode"),
            "type": p.get("type") or p.get("media_type"),
            "caption": (p.get("caption") or {}).get("text") if isinstance(p.get("caption"), dict) else p.get("caption"),
            "like_count": p.get("like_count") or p.get("likes_count"),
            "comment_count": p.get("comment_count") or p.get("comments_count"),
            "video_view_count": p.get("video_view_count"),
            "thumbnail": p.get("display_url") or p.get("thumbnail_url"),
            "posted_at": p.get("timestamp") or p.get("taken_at"),
        })
    return {
        "profile_url": canonical_url,
        "username": raw.get("username") or username,
        "full_name": raw.get("full_name") or raw.get("name"),
        "biography": raw.get("biography") or raw.get("bio"),
        "verified": bool(raw.get("verified") or raw.get("is_verified")),
        "profile_pic": raw.get("profile_pic_url_hd") or raw.get("profile_pic_url"),
        "followers": raw.get("followers"),
        "following": raw.get("following"),
        "post_count": raw.get("post_count") or raw.get("posts_count"),
        "latest_posts": latest,
    }


@router.get("/admin/reports/social-media/instagram")
async def get_instagram_stats(
    profile_url: str = Query(default=DEFAULT_PROFILE_URL),
    refresh: bool = Query(default=False, description="Bypass the 6h cache and re-scrape"),
    user: dict = Depends(get_current_user),
):
    """Admin endpoint: returns Instagram profile stats. Cached 6h in Mongo."""
    if not _is_admin_or_reports(user):
        raise HTTPException(status_code=403, detail="Not allowed")

    username, canonical_url = _normalise(profile_url)
    now = datetime.now(timezone.utc)

    if not refresh:
        cached = await db.social_media_cache.find_one(
            {"provider": "instagram", "profile_key": username, "expires_at": {"$gt": now}},
            {"_id": 0},
        )
        if cached:
            cached["cached"] = True
            return cached

    raw = await _run_apify(canonical_url)
    projected = _project(raw, canonical_url, username)

    doc = {
        "provider": "instagram",
        "profile_key": username,
        "fetched_at": now,
        "expires_at": now + timedelta(hours=CACHE_TTL_HOURS),
        **projected,
    }
    await db.social_media_cache.replace_one(
        {"provider": "instagram", "profile_key": username},
        doc,
        upsert=True,
    )
    doc["cached"] = False
    return doc
