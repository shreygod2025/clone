"""
Crawler-aware share link endpoints.

Background:
  Production serves the SPA's `index.html` for every route, including
  `/workshops/fathers-day-robotics`, so Facebook / WhatsApp / X crawlers
  always see the generic homepage meta tags — never the page-specific ones.

Fix:
  Backend exposes /api/share/{slug} routes that:
    • Return rich, route-specific HTML (title, description, og:*, twitter:*)
      tuned for the crawler.
    • Add a tiny meta-refresh + JS redirect so real humans bounce to the
      actual page instantly.
  Use these URLs in WhatsApp / Instagram / Marketing channels for guaranteed
  rich link previews.

  e.g.   https://oll.co/api/share/fathers-day
         https://oll.co/api/share/summer-camp
         https://oll.co/api/share/ai-foundations
"""
from typing import Dict, List
import html as _html

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["share"])

# ── Per-page share-link configs ──────────────────────────────────────────
# Each entry maps slug → metadata. Add more as new pages launch.

SHARE_PAGES: Dict[str, Dict[str, str]] = {
    "fathers-day": {
        "redirect_to":  "/workshops/fathers-day-robotics",
        "title":        "Father's Day 2026 Robotics Workshop · Mumbai · OLL",
        "description":  "This Father's Day (Sun 21 June, Mumbai), build a real robot together with your child (ages 4–12). Screen-free · 2 hours · ₹1,999 per dad-child duo.",
        "og_type":      "event",
        "image":        "https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/2t1vu6l9_ChatGPT%20Image%20Jun%204%2C%202026%2C%2012_50_47%20PM.png",
        "image_alt":    "Father and child building a robot together at OLL's Father's Day workshop",
        "keywords":     "Father's Day, Father's Day Mumbai, Father's Day 2026, robotics workshop for kids, dad and child activity, screen-free workshop, STEM, parent-child bonding",
    },
    "fathers-day-robotics": {  # alias
        "redirect_to":  "/workshops/fathers-day-robotics",
        "title":        "Father's Day 2026 Robotics Workshop · Mumbai · OLL",
        "description":  "This Father's Day (Sun 21 June, Mumbai), build a real robot together with your child (ages 4–12). Screen-free · 2 hours · ₹1,999 per dad-child duo.",
        "og_type":      "event",
        "image":        "https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/2t1vu6l9_ChatGPT%20Image%20Jun%204%2C%202026%2C%2012_50_47%20PM.png",
        "image_alt":    "Father and child building a robot together at OLL's Father's Day workshop",
        "keywords":     "Father's Day, Father's Day Mumbai, Father's Day 2026, robotics workshop, dad and child activity, screen-free, STEM",
    },
    "summer-camp": {
        "redirect_to":  "/summer-camp",
        "title":        "OLL Summer Camp 2026 — Robotics, AI, Coding & Entrepreneurship for Kids",
        "description":  "India's best summer camp for ages 4-16. Robotics, AI, Coding, Entrepreneurship & Financial Literacy. Online & in-centre cohorts across Mumbai. As seen on Shark Tank India.",
        "og_type":      "website",
        "image":        "https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h11kmu1i_20260504_122503.jpg",
        "image_alt":    "Kids learning robotics at OLL Summer Camp",
        "keywords":     "summer camp Mumbai, robotics camp, AI camp for kids, coding camp, STEM camp India, school holiday activities",
    },
    "ai-foundations": {
        "redirect_to":  "/ai-foundations",
        "title":        "AI Foundations · 10-Day Live Course for Kids (Free Trial) · OLL",
        "description":  "10 days · live online · ages 8-16. Your child learns to think with AI — not just use it. First session FREE; pay ₹1,999 only if they continue. Limited cohorts.",
        "og_type":      "website",
        "image":        "https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h11kmu1i_20260504_122503.jpg",
        "image_alt":    "Kid coding an AI project at OLL AI Foundations cohort",
        "keywords":     "AI for kids, AI course India, AI Foundations, AI camp, learn AI age 10, kid AI class, AI free trial",
    },
    "future-skills": {
        "redirect_to":  "/future-skills",
        "title":        "Future Skills · Robotics + AI + Entrepreneurship for Kids · OLL",
        "description":  "Continuous learning program: hands-on Robotics + AI + Entrepreneurship + Financial Literacy for ages 6-16. Live online & weekend in-centre batches.",
        "og_type":      "website",
        "image":        "https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/rhwyg94z_20260504_163950.jpg",
        "image_alt":    "OLL Future Skills students with their robots",
        "keywords":     "future skills, robotics for kids India, entrepreneurship for kids, weekend STEM, after-school program",
    },
    "home": {
        "redirect_to":  "/",
        "title":        "OLL — India's Future-Skills Platform for Kids (Robotics · AI · Coding)",
        "description":  "Live future-skills classes for ages 4-16. Robotics, AI, Coding, Entrepreneurship & Financial Literacy. Trusted by 500+ schools. As seen on Shark Tank India.",
        "og_type":      "website",
        "image":        "https://oll.co/og-default.png",
        "image_alt":    "OLL — India's future-skills platform for kids",
        "keywords":     "robotics for kids, AI for kids, coding for children India, STEM education, OLL Shark Tank",
    },
}


def _h(s: str) -> str:
    return _html.escape(s or "")


def _render_share_html(slug: str, cfg: Dict[str, str], base_url: str = "https://oll.co") -> str:
    """Build a crawler-friendly HTML snippet with proper meta tags + JS bounce."""
    redirect_url = f"{base_url}{cfg['redirect_to']}"
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{_h(cfg['title'])}</title>
<meta name="description" content="{_h(cfg['description'])}" />
<meta name="keywords"    content="{_h(cfg['keywords'])}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="{_h(redirect_url)}" />

<meta property="og:type"        content="{_h(cfg['og_type'])}" />
<meta property="og:site_name"   content="OLL — Skills for All" />
<meta property="og:url"         content="{_h(redirect_url)}" />
<meta property="og:title"       content="{_h(cfg['title'])}" />
<meta property="og:description" content="{_h(cfg['description'])}" />
<meta property="og:image"       content="{_h(cfg['image'])}" />
<meta property="og:image:secure_url" content="{_h(cfg['image'])}" />
<meta property="og:image:alt"   content="{_h(cfg['image_alt'])}" />
<meta property="og:image:width"  content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale"      content="en_IN" />

<meta name="twitter:card"        content="summary_large_image" />
<meta name="twitter:site"        content="@oll_official" />
<meta name="twitter:title"       content="{_h(cfg['title'])}" />
<meta name="twitter:description" content="{_h(cfg['description'])}" />
<meta name="twitter:image"       content="{_h(cfg['image'])}" />
<meta name="twitter:image:alt"   content="{_h(cfg['image_alt'])}" />

<meta http-equiv="refresh" content="0; url={_h(redirect_url)}" />
<script>setTimeout(function(){{ window.location.replace({redirect_url!r}); }}, 80);</script>
<style>body{{font-family:system-ui,sans-serif;background:#0F1E33;color:#fff;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:1rem}} a{{color:#FFD167;text-decoration:underline;font-weight:700}}</style>
</head>
<body>
<div>
  <h1 style="font-size:1.4rem;margin:0 0 .5rem">{_h(cfg['title'])}</h1>
  <p style="opacity:.85;margin:.4rem 0 1.2rem">Taking you there…</p>
  <a href="{_h(redirect_url)}">Continue to OLL →</a>
</div>
</body>
</html>"""


@router.get("/share/{slug}", response_class=HTMLResponse)
async def share_link(slug: str):
    """
    Crawler-ready share page. Real humans get bounced to the actual route
    via meta-refresh + JS in <80ms.
    """
    cfg = SHARE_PAGES.get(slug.lower())
    if not cfg:
        # Fall back to homepage rather than 404 so any bad share link still
        # bounces the user to the live site.
        cfg = SHARE_PAGES["home"]
    html = _render_share_html(slug, cfg)
    # 5-min CDN cache so WhatsApp/FB rescrapes after edits, but still cheap.
    return HTMLResponse(content=html, headers={"Cache-Control": "public, max-age=300, s-maxage=300"})


@router.get("/share")
async def share_index() -> Dict[str, List[str]]:
    """List all configured share slugs (admin convenience)."""
    return {"available_slugs": sorted(SHARE_PAGES.keys())}
