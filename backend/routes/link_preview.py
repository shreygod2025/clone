"""
Internal admin-only link preview inspector.

Fetches any URL, parses the HTML head, and returns a normalized view of what
WhatsApp / Facebook / LinkedIn / Twitter / Google would display for that link.

Frontend at /admin/link-preview-tester consumes this.
"""
import re
import logging
from typing import Optional, Dict, Any
from urllib.parse import urlparse, urljoin

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from bs4 import BeautifulSoup  # already installed; falls back to regex if absent

from .shared import get_current_user

router = APIRouter()

CRAWLER_UA = (
    "Mozilla/5.0 (compatible; OLL-LinkPreviewBot/1.0; "
    "+https://oll.co; like facebookexternalhit/1.1)"
)


def _abs(base: str, candidate: Optional[str]) -> Optional[str]:
    if not candidate:
        return None
    try:
        return urljoin(base, candidate)
    except Exception:
        return candidate


def _meta(soup: BeautifulSoup, *, name: Optional[str] = None,
          prop: Optional[str] = None) -> Optional[str]:
    sel = {}
    if name:
        sel["name"] = name
    if prop:
        sel["property"] = prop
    tag = soup.find("meta", attrs=sel)
    if tag and tag.get("content"):
        return tag["content"].strip()
    return None


@router.get("/admin/link-preview")
async def admin_link_preview(
    url: str = Query(..., description="Absolute URL to inspect"),
    user: dict = Depends(get_current_user),
):
    """
    Inspect a URL the way a social crawler would. Returns:
      - title, description, canonical, lang
      - og:title, og:description, og:image, og:type, og:site_name
      - twitter:card, twitter:title, twitter:image, twitter:description
      - json_ld blocks (parsed JSON, when valid)
      - status_code, final_url (after redirects), content_type, fetch_ms
      - missing[]: a checklist of recommended tags that are absent
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(400, detail="Invalid URL")

    import time
    t0 = time.time()
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=12.0,
                                     headers={"User-Agent": CRAWLER_UA}) as client:
            resp = await client.get(url)
    except Exception as e:
        logging.warning(f"[link-preview] fetch failed for {url}: {e}")
        raise HTTPException(502, detail=f"Failed to fetch URL: {e}") from e

    fetch_ms = int((time.time() - t0) * 1000)
    final_url = str(resp.url)
    base = final_url

    soup = BeautifulSoup(resp.text or "", "html.parser")

    # ── Basic ─────────────────────────────────────────────────────────────
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else None

    description = _meta(soup, name="description")
    canonical = None
    link_canon = soup.find("link", rel=lambda v: v and "canonical" in v)
    if link_canon:
        canonical = link_canon.get("href")
    canonical = _abs(base, canonical)

    html_tag = soup.find("html")
    lang = html_tag.get("lang") if html_tag else None

    # ── Open Graph ───────────────────────────────────────────────────────
    og = {
        "title":       _meta(soup, prop="og:title"),
        "description": _meta(soup, prop="og:description"),
        "type":        _meta(soup, prop="og:type"),
        "site_name":   _meta(soup, prop="og:site_name"),
        "url":         _meta(soup, prop="og:url"),
        "image":       _abs(base, _meta(soup, prop="og:image")),
        "image_alt":   _meta(soup, prop="og:image:alt"),
        "image_width": _meta(soup, prop="og:image:width"),
        "image_height": _meta(soup, prop="og:image:height"),
        "locale":      _meta(soup, prop="og:locale"),
    }

    # ── Twitter Card ─────────────────────────────────────────────────────
    twitter = {
        "card":        _meta(soup, name="twitter:card"),
        "site":        _meta(soup, name="twitter:site"),
        "title":       _meta(soup, name="twitter:title"),
        "description": _meta(soup, name="twitter:description"),
        "image":       _abs(base, _meta(soup, name="twitter:image")),
    }

    # ── JSON-LD ──────────────────────────────────────────────────────────
    import json
    json_ld_blocks = []
    for s in soup.find_all("script", type="application/ld+json"):
        raw = (s.string or "").strip()
        if not raw:
            continue
        try:
            json_ld_blocks.append({"parsed": json.loads(raw), "raw": None})
        except Exception:
            json_ld_blocks.append({"parsed": None, "raw": raw[:1200]})

    # ── Missing-tag checklist ────────────────────────────────────────────
    missing = []
    if not og["title"]:
        missing.append("og:title")
    if not og["description"]:
        missing.append("og:description")
    if not og["image"]:
        missing.append("og:image")
    if not og["url"]:
        missing.append("og:url")
    if not twitter["card"]:
        missing.append("twitter:card")
    if not twitter["image"]:
        missing.append("twitter:image")
    if not canonical:
        missing.append("link rel=canonical")
    if not title:
        missing.append("<title>")
    if not description:
        missing.append('meta name="description"')

    # ── Validate og:image is reachable ───────────────────────────────────
    image_check = None
    if og["image"]:
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=8.0,
                                         headers={"User-Agent": CRAWLER_UA}) as client:
                ir = await client.head(og["image"])
                image_check = {
                    "status":       ir.status_code,
                    "content_type": ir.headers.get("content-type"),
                    "size_bytes":   int(ir.headers.get("content-length") or 0),
                }
        except Exception as e:
            image_check = {"error": str(e)[:200]}

    return {
        "ok":           resp.status_code == 200,
        "status_code":  resp.status_code,
        "final_url":    final_url,
        "fetch_ms":     fetch_ms,
        "content_type": resp.headers.get("content-type"),
        "title":        title,
        "description":  description,
        "canonical":    canonical,
        "lang":         lang,
        "og":           og,
        "twitter":      twitter,
        "json_ld":      json_ld_blocks,
        "missing":      missing,
        "image_check":  image_check,
    }
