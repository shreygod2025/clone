"""
SEO routes — public-facing, route OUTSIDE the /api prefix because Google crawls
absolute paths (/robots.txt, /sitemap.xml). Mounted directly on the FastAPI app.

These are the canonical, fresh sources of truth that supersede any static files
in /app/frontend/public — Cloudflare/CDN edge config should route /robots.txt
and /sitemap.xml to the backend so blog posts land in Google quickly.
"""
from datetime import datetime, timezone
from typing import List
from xml.sax.saxutils import escape

from fastapi import APIRouter, Response

from .shared import db

# Use plain `prefix=""` so routes mount at the root, not under /api/.
router = APIRouter(tags=["seo"])

# ── Static, hand-curated URL list (mirrors public/sitemap.xml) ────────────
STATIC_URLS: List[dict] = [
    # Tier 1: Brand & top-funnel
    {"loc": "/",            "priority": "1.0",  "changefreq": "weekly"},
    {"loc": "/about",       "priority": "0.8",  "changefreq": "monthly"},
    {"loc": "/centers",     "priority": "0.85", "changefreq": "monthly"},
    {"loc": "/faq",         "priority": "0.7",  "changefreq": "monthly"},
    {"loc": "/resources",   "priority": "0.7",  "changefreq": "weekly"},
    {"loc": "/blogs",       "priority": "0.85", "changefreq": "daily"},
    # Tier 2: Funnel pages
    {"loc": "/offerings",       "priority": "0.95", "changefreq": "weekly"},
    {"loc": "/student",         "priority": "0.85", "changefreq": "weekly"},
    {"loc": "/school-offerings","priority": "0.9",  "changefreq": "weekly"},
    {"loc": "/school",          "priority": "0.9",  "changefreq": "weekly"},
    {"loc": "/for-schools",     "priority": "0.85", "changefreq": "weekly"},
    # Tier 3: Hero products
    {"loc": "/summer-camp",         "priority": "0.95", "changefreq": "daily"},
    {"loc": "/future-skills",       "priority": "0.97", "changefreq": "weekly"},
    {"loc": "/ai-foundations",      "priority": "0.95", "changefreq": "weekly"},
    {"loc": "/social-media-intern", "priority": "0.8",  "changefreq": "weekly"},
    {"loc": "/growth-partner",      "priority": "0.7",  "changefreq": "monthly"},
    # Tier 4: Course detail
    {"loc": "/courses",                  "priority": "0.85", "changefreq": "weekly"},
    {"loc": "/courses/robotics",         "priority": "0.85", "changefreq": "monthly"},
    {"loc": "/courses/coding",           "priority": "0.85", "changefreq": "monthly"},
    {"loc": "/courses/ai",               "priority": "0.85", "changefreq": "monthly"},
    {"loc": "/courses/entrepreneurship", "priority": "0.8",  "changefreq": "monthly"},
    {"loc": "/courses/financial",        "priority": "0.8",  "changefreq": "monthly"},
    # Tier 5: School-offering detail
    {"loc": "/school-offerings/robotics/robotics-lab-setup",                       "priority": "0.9",  "changefreq": "monthly"},
    {"loc": "/school-offerings/robotics/robotics-curriculum-kits",                 "priority": "0.85", "changefreq": "monthly"},
    {"loc": "/school-offerings/robotics/robotics-afterschool",                     "priority": "0.8",  "changefreq": "monthly"},
    {"loc": "/school-offerings/ai/ai-center-excellence",                           "priority": "0.85", "changefreq": "monthly"},
    {"loc": "/school-offerings/ai/agentic-ai-workshop",                            "priority": "0.8",  "changefreq": "monthly"},
    {"loc": "/school-offerings/ai/ai-foundations",                                 "priority": "0.85", "changefreq": "monthly"},
    {"loc": "/school-offerings/coding/coding-afterschool",                         "priority": "0.8",  "changefreq": "monthly"},
    {"loc": "/school-offerings/coding/python-curriculum",                          "priority": "0.8",  "changefreq": "monthly"},
    {"loc": "/school-offerings/financial-literacy/entrepreneurship-workshop",      "priority": "0.8",  "changefreq": "monthly"},
    {"loc": "/school-offerings/financial-literacy/financial-bootcamp",             "priority": "0.75", "changefreq": "monthly"},
    # Tier 6: Summer camp SEO subroutes (location)
    *[{"loc": f"/summer-camp/location/{loc}", "priority": "0.85", "changefreq": "monthly"}
      for loc in ("andheri-west", "mira-road", "dombivli", "dahisar", "online")],
    # Tier 6: Summer camp SEO subroutes (skill)
    *[{"loc": f"/summer-camp/skill/{skill}", "priority": "0.9", "changefreq": "monthly"}
      for skill in ("robotics", "coding", "ai", "3d-design", "financial-literacy")],
    # Tier 6: Summer camp SEO subroutes (age)
    *[{"loc": f"/summer-camp/age/{age}", "priority": "0.85", "changefreq": "monthly"}
      for age in ("4-6", "6-8", "8-10", "10-12", "12-14", "14-16")],
    # Tier 7: Career & compliance
    {"loc": "/join-team", "priority": "0.6",  "changefreq": "weekly"},
    {"loc": "/educator",  "priority": "0.65", "changefreq": "weekly"},
    {"loc": "/privacy",   "priority": "0.3",  "changefreq": "yearly"},
    {"loc": "/terms",     "priority": "0.3",  "changefreq": "yearly"},
]

BASE_URL = "https://oll.co"


def _entry(loc: str, lastmod: str, changefreq: str, priority: str) -> str:
    return (
        "  <url>\n"
        f"    <loc>{escape(BASE_URL + loc)}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>\n"
    )


@router.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml():
    """Dynamic sitemap — static URL list + every published blog post."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    parts: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>\n',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
    ]
    for u in STATIC_URLS:
        parts.append(_entry(u["loc"], today, u["changefreq"], u["priority"]))

    # Blog posts from DB
    try:
        cursor = db.blogs.find(
            {"published": True},
            {"_id": 0, "slug": 1, "updated_at": 1, "created_at": 1},
        ).sort("created_at", -1).limit(2000)
        async for blog in cursor:
            slug = (blog.get("slug") or "").strip()
            if not slug:
                continue
            updated = blog.get("updated_at") or blog.get("created_at") or today
            if isinstance(updated, datetime):
                updated = updated.strftime("%Y-%m-%d")
            else:
                updated = str(updated)[:10]
            parts.append(_entry(f"/blogs/{slug}", updated, "monthly", "0.6"))
    except Exception:
        # If the DB is briefly unavailable we still serve the static list.
        pass

    parts.append("</urlset>\n")
    xml = "".join(parts)
    return Response(
        content=xml,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/robots.txt", include_in_schema=False)
async def robots_txt():
    """Tight robots.txt that hides admin/auth/payment routes from indexing."""
    body = """\
# OLL Robots.txt — served live from /api backend (always fresh)
User-agent: *
Allow: /

# Block admin / auth / private flows
Disallow: /admin/
Disallow: /admin
Disallow: /login
Disallow: /educator-dashboard
Disallow: /educator-profile
Disallow: /educator-onboarding
Disallow: /educator-interview
Disallow: /my-bookings
Disallow: /school-student/dashboard
Disallow: /school-student/login
Disallow: /school-tracking
Disallow: /school-payment-tracker
Disallow: /school-student/pay
Disallow: /school-support
Disallow: /support-flow
Disallow: /gp-onboarding-track
Disallow: /gp-self-onboarding
Disallow: /team-onboarding
Disallow: /track-onboarding
Disallow: /verify-otp
Disallow: /payment/return
Disallow: /api/
Disallow: /summer-camp/portal
Disallow: /summer-camp/success
Disallow: /summer-camp/book
Disallow: /ai-foundations/book
Disallow: /ai-foundations/success
Disallow: /future-skills/book
Disallow: /future-skills/success
Disallow: /sm-intern/apply
Disallow: /sm-intern/success
Disallow: /reports/
Disallow: /*?ref=
Disallow: /*?utm_*
Disallow: /*?token=
Disallow: /static/

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: SemrushBot
Crawl-delay: 10

User-agent: AhrefsBot
Crawl-delay: 10

Sitemap: https://oll.co/sitemap.xml
"""
    return Response(
        content=body,
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "public, max-age=3600"},
    )
