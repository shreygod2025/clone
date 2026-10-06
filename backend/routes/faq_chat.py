"""
FAQ Chatbot — /api/faq-chat
──────────────────────────
Powers the public AI chatbot at https://oll.co/faq.

Knowledge sources (merged into the system prompt on every request):
  1. Admin-editable sections from the `faq_settings` MongoDB collection
     (Techfest / Shop / Programs / Support / Core facts + starter chips).
     Managed in Admin → Settings → Edit FAQ Chatbot (/admin/faq-settings).
  2. Live OLL shop catalog pulled from `routes.shop._fetch_vendor_catalog`
     when `include_live_products` is on in the settings. This is why the
     bot can answer "how much is the AI Vision Blox?" with a real price.
  3. `data/techfest_faqs.txt`               — vendor-provided 60+ Q&A rulebook
  4. `data/techfest_problem_statement.txt`  — competition problem statement

Modes:
  • Anonymous:  general public answers only.
  • Logged-in: user's own open support tickets are pulled from `support_queries`
    and inlined so the bot can say "your ticket #ABC is in progress".

Persistence:
  • Conversation state is in-memory (`_SESSIONS`). Lost on backend restart.
"""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

import jwt as pyjwt

from database import db
from routes.faq_settings import read_settings

router = APIRouter()

_JWT_SECRET = os.environ.get("JWT_SECRET", "")
_JWT_ALGO = "HS256"


def _decode_token(token: str) -> Optional[dict]:
    """Best-effort decode of the OLL JWT. Returns payload dict or None.
    Never raises — any decode error is treated as 'no auth'."""
    if not token or not _JWT_SECRET:
        return None
    try:
        return pyjwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGO])
    except Exception:
        return None


# ─── Load vendor-shipped PDF-extracted knowledge files once ───────────────
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
# NEW (2026-10-05): The official rulebook PDF uploaded by the OLL product
# team. This supersedes the older techfest_faqs.txt / techfest_problem_statement.txt
# which had leftover 150 cm arena / 10-12 m track specs from an older season.
try:
    OFFICIAL_RULEBOOK = (_DATA_DIR / "techfest_official_rulebook_2026.md").read_text(encoding="utf-8")
except FileNotFoundError:
    OFFICIAL_RULEBOOK = ""
# Verbatim content copied from the live OLL competition landing pages.
try:
    OLL_PAGES_VERBATIM = (_DATA_DIR / "oll_pages_verbatim.md").read_text(encoding="utf-8")
except FileNotFoundError:
    OLL_PAGES_VERBATIM = ""
# Legacy PDF-derived knowledge (older season, kept but demoted).
try:
    FAQ_TEXT = (_DATA_DIR / "techfest_faqs.txt").read_text(encoding="utf-8")
except FileNotFoundError:
    FAQ_TEXT = ""
try:
    PROBLEM_STATEMENT_TEXT = (_DATA_DIR / "techfest_problem_statement.txt").read_text(encoding="utf-8")
except FileNotFoundError:
    PROBLEM_STATEMENT_TEXT = ""


_SEP = "=" * 72

# Real mailboxes on OLL domains. Anything else on those domains is a hallucination.
# skills@oll.co is real (hosting a regional qualifier, per the official rulebook).
_KNOWN_OLL_EMAILS = {"info@oll.co", "skills@oll.co"}

# The system prompt is rebuilt on every request; the live catalog / centers /
# offerings / blogs blocks dominate its cost (remote fetches + DB reads), so
# they are cached for a few minutes. Empty (failed) results are never cached.
_LIVE_BLOCK_TTL_SEC = 300


def _ttl_cached(fn):
    import functools
    store = {"at": 0.0, "val": None}

    @functools.wraps(fn)
    async def wrapper():
        now = time.time()
        if store["val"] and now - store["at"] < _LIVE_BLOCK_TTL_SEC:
            return store["val"]
        val = await fn()
        if val:
            store["at"], store["val"] = now, val
        return val

    wrapper.cache_clear = lambda: store.update(at=0.0, val=None)
    return wrapper


def _product_slug(product: dict) -> str:
    """Mirror `frontend/src/utils/slug.js :: productSlug`.

    Format: `{slugified-name}-{first-8-of-id-with-dashes-removed}`.
    IMPORTANT: must match the frontend 1:1 — the shop router accepts the
    trailing id fragment, but we build the full slug so the bot's URLs are
    SEO-correct too.
    """
    import re
    name = (product.get("name") or "").lower().strip()
    name = re.sub(r"[^a-z0-9]+", "-", name)
    name = re.sub(r"-+", "-", name).strip("-") or "product"
    pid = str(product.get("id") or "").replace("-", "")
    return f"{name}-{pid[:8]}"


def _format_live_products(products: List[dict]) -> str:
    """One-liner per product so the LLM can pattern-match on both human
    names and category keywords. URL is the real SEO slug URL — never a guess."""
    if not products:
        return ""
    products = products[:120]  # cap to keep the prompt bounded
    lines: List[str] = []
    for p in products:
        name = (p.get("name") or "").strip()
        if not name:
            continue
        cat = (p.get("category") or "").strip() or "Uncategorised"
        price = p.get("selling_price")
        mrp = p.get("mrp")
        slug = _product_slug(p)
        url = f"https://oll.co/shop/product/{slug}"
        price_bits: List[str] = []
        if isinstance(price, (int, float)):
            price_bits.append(f"₹{int(price):,}")
        if isinstance(mrp, (int, float)) and isinstance(price, (int, float)) and mrp > price:
            price_bits.append(f"(MRP ₹{int(mrp):,})")
        price_str = " ".join(price_bits) or "price on request"
        lines.append(f"- [{cat}] {name} — {price_str}\n  {url}")
    return "\n".join(lines)


@_ttl_cached
async def _fetch_live_products_block() -> str:
    """Pull the full live product catalog from shop.py, formatted for the LLM."""
    try:
        from routes.shop import _fetch_vendor_catalog, _get_overrides_map, _merge_product
        vendor_products = await _fetch_vendor_catalog()
        overrides = await _get_overrides_map()
        merged = [_merge_product(v, overrides.get(v["id"])) for v in vendor_products if v.get("id")]
        merged = [p for p in merged if p.get("show_on_shop")]
        merged.sort(key=lambda x: (x.get("category") or "", x.get("name") or ""))
        return _format_live_products(merged)
    except Exception:
        return ""


@_ttl_cached
async def _valid_product_urls() -> set[str]:
    """Build the set of currently-valid product URLs so we can sanitize any
    URL the LLM invents at response time. Returns a lowercase set keyed by
    URL for fast `in` lookups."""
    try:
        from routes.shop import _fetch_vendor_catalog, _get_overrides_map, _merge_product
        vendor_products = await _fetch_vendor_catalog()
        overrides = await _get_overrides_map()
        urls: set[str] = set()
        for v in vendor_products:
            if not v.get("id"):
                continue
            p = _merge_product(v, overrides.get(v["id"]))
            if not p.get("show_on_shop"):
                continue
            urls.add(f"https://oll.co/shop/product/{_product_slug(p)}")
        return urls
    except Exception:
        return set()


def _sanitize_reply(reply: str, valid_product_urls: set[str]) -> str:
    """Post-process the LLM reply:

    1. Replace any invented `/shop/product/<slug>` URL that is NOT in the
       live valid set with the main shop URL — this guarantees we never
       send a user to a 404.
    2. Replace common wrong support emails with the correct one.
    3. Replace wrong-season strings (TechFest 2025 / Feb 15, 2025 etc.)
       with a neutral pointer so a stale pretraining fact can't leak.
    """
    import re

    # 1. Product URL sanitisation
    pattern = re.compile(r"https?://(?:www\.)?oll\.co/shop/product/[A-Za-z0-9][A-Za-z0-9\-]*")

    def _repl(m: re.Match) -> str:
        url = m.group(0).rstrip(".,);]")
        if url in valid_product_urls:
            return m.group(0)
        # 404-bound → replace with main shop
        return "https://oll.co/shop"

    reply = pattern.sub(_repl, reply)

    # 2. Email normalisation
    for wrong in (
        "support@onlinelivelearning.com",
        "support@oll.co",
        "contact@oll.co",
        "hello@oll.co",
        "info@onlinelivelearning.com",
    ):
        reply = re.sub(re.escape(wrong), "info@oll.co", reply, flags=re.IGNORECASE)

    # 2b. Generic guard: the model invents plausible-looking addresses
    # (techfest@oll.co, techfest@onlearnlearn.com ...). Any address on an OLL
    # domain that is not a known-real mailbox is rewritten to info@oll.co.
    def _email_repl(m: re.Match) -> str:
        return m.group(0) if m.group(0).lower() in _KNOWN_OLL_EMAILS else "info@oll.co"

    reply = re.sub(
        r"\b[A-Za-z0-9._%+-]+@(?:oll\.co|onlearnlearn\.com|onlinelivelearning\.com)\b",
        _email_repl,
        reply,
        flags=re.IGNORECASE,
    )

    # 3. Wrong-season leakage. Only trip on explicit "TechFest 2025" strings;
    # we don't want to touch unrelated "2025" references.
    reply = re.sub(r"\bTechFest\s*20(2[0-5])\b", "TechFest 2026-27", reply, flags=re.IGNORECASE)
    reply = re.sub(r"\bTech\s*Fest\s*20(2[0-5])\b", "TechFest 2026-27", reply, flags=re.IGNORECASE)

    # 4. Expand wrong OLL names if they leak in anyway.
    # 4a. The prompt itself names the wrong expansions ("do NOT expand it as ...")
    # and the model sometimes parrots that warning back to the user. Drop those
    # echoes first - otherwise 4b would rewrite the names inside the denial and
    # produce nonsense like "NOT 'On Learn Learn' or 'On Learn Learn'".
    _wrong = r"(?:Open League Learning|Online Live Learning)"
    _neg = r"\b(?:not|never|don'?t|wrong|incorrect|avoid)\b"

    def _drop_denial(m: re.Match) -> str:
        t = m.group(0)
        return "" if re.search(_wrong, t, re.I) and re.search(_neg, t, re.I) else t

    reply = re.sub(r"[ \t]*\([^()\n]*\)", _drop_denial, reply)
    reply = re.sub(r"[^.!?\n]+[.!?]?[ \t]*", _drop_denial, reply)

    # 4b. A genuine wrong assertion ("OLL stands for Open League Learning") is corrected.
    reply = re.sub(r"\bOnline Live Learning\b", "On Learn Learn", reply)
    reply = re.sub(r"\bOpen League Learning\b", "On Learn Learn", reply)

    return reply


@_ttl_cached
async def _fetch_live_centers_block() -> str:
    """Live OLL Centers list — address, phone, email, maps link."""
    try:
        docs = await db.centers.find({"is_active": True}, {"_id": 0}).to_list(50)
    except Exception:
        return ""
    if not docs:
        return ""
    lines: List[str] = []
    for c in docs:
        name = c.get("name") or "OLL Center"
        city = c.get("city") or ""
        area = c.get("area") or ""
        location = ", ".join([x for x in (area, city) if x])
        bits = [f"- **{name}** ({location})"]
        if c.get("address"):
            bits.append(f"  Address: {c['address']}")
        line2 = []
        if c.get("contact_phone"):
            line2.append(f"📞 {c['contact_phone']}")
        if c.get("contact_email"):
            line2.append(f"✉️ {c['contact_email']}")
        if line2:
            bits.append(f"  {' · '.join(line2)}")
        if c.get("google_maps_link"):
            bits.append(f"  Map: {c['google_maps_link']}")
        lines.append("\n".join(bits))
    return "\n\n".join(lines)


@_ttl_cached
async def _fetch_live_offerings_block() -> str:
    """School-offerings catalog with canonical URLs."""
    try:
        docs = await db.school_offerings.find({}, {"_id": 0}).to_list(200)
    except Exception:
        return ""
    if not docs:
        return ""
    # Group by category
    by_cat: dict[str, list[str]] = {}
    for o in docs:
        cat = (o.get("category") or "Other").strip() or "Other"
        oid = (o.get("id") or "").strip()
        title = (o.get("title") or "").strip()
        if not title:
            continue
        cat_slug = cat.lower().replace("&", "and").replace(" ", "-")
        url = f"https://oll.co/school-offerings/{cat_slug}/{oid}" if oid else "https://oll.co/for-schools"
        by_cat.setdefault(cat, []).append(f"- {title} → {url}")
    chunks: List[str] = []
    for cat, items in by_cat.items():
        chunks.append(f"**{cat}:**\n" + "\n".join(items))
    return "\n\n".join(chunks)


@_ttl_cached
async def _fetch_live_blogs_block() -> str:
    """Published blog titles + canonical URLs (max 25 most recent)."""
    try:
        docs = (
            await db.blogs.find({"is_published": True}, {"_id": 0})
            .sort("created_at", -1)
            .to_list(25)
        )
    except Exception:
        return ""
    if not docs:
        return ""
    lines: List[str] = []
    for b in docs:
        slug = (b.get("slug") or "").strip()
        title = (b.get("title") or "").strip()
        category = (b.get("category") or "").strip()
        if not title or not slug:
            continue
        tag = f"[{category}] " if category else ""
        lines.append(f"- {tag}{title} → https://oll.co/blogs/{slug}")
    return "\n".join(lines)


async def _build_system_prompt(user_tickets_block: Optional[str] = None) -> str:
    """Assemble the full system prompt for OLLBot.

    Order (highest to lowest priority — later sections lose on conflict):
      1. Identity + hard rules (external vendors, formatting)
      2. Authoritative 2026 specs
      3. Admin-editable knowledge sections (DB)
      4. Live shop catalog (DB-gated)
      5. Vendor-shipped FAQ PDF text + Problem Statement PDF text
      6. User's own tickets (if logged in)
      7. Handoff policy
    """
    settings = await read_settings()

    sections: List[str] = [
        "You are OLLBot — the official AI assistant for OLL (On Learn Learn) at https://oll.co.",
        "OLL = **On Learn Learn** (do NOT expand it as 'Open League Learning', 'Online Live Learning' or anything else).",
        "You help parents, teachers, students, principals and partner-school admins with:",
        "• The OLL × TechFest IIT Bombay 2026-27 Robotics Championship (dates, rules, registration)",
        "• OLL's robotics kits, curriculum books and shop (public B2C products)",
        "• OLL's school programs (B2B — Robotics Lab, Future Skills, AI Center, etc.)",
        "• OLL learning programs, camps, workshops, centers and support",
        "• Brochures, problem-statement PDFs and blog articles",
        "",
        _SEP,
        "🚫 HARD RULES — NEVER VIOLATE:",
        _SEP,
        "1. The current season is **TechFest IIT Bombay 2026-27**. NEVER mention",
        "   'TechFest 2025' or earlier years. The Grand Finale is on **17 December 2026**.",
        "   Regional qualifiers: East IIT Kanpur 24 Oct 2026 · South RVU Bangalore 26 Nov 2026",
        "   · West IIT Bombay 17 Dec 2026. These dates are AUTHORITATIVE.",
        "2. The ONLY support channels are:",
        "   • WhatsApp: **+91 99201 88188** (fastest · wa.me/919920188188)",
        "   • Email: **info@oll.co**",
        "   NEVER write 'support@oll.co', 'support@onlinelivelearning.com',",
        "   'contact@oll.co' or any other variant.",
        "3. NEVER recommend buying from external sellers like Robu.in, Amazon, Flipkart,",
        "   RoboKits India, AliExpress, local electronics markets, or any third party.",
        "   For ALL purchases, direct the user to the OLL Shop (https://oll.co/shop).",
        "4. NEVER invent facts. If a question isn\\'t covered below, say so plainly and",
        "   point the user to **+91 99201 88188 on WhatsApp** or **info@oll.co**.",
        "5. 🛍️ PRODUCT URLs — CRITICAL:",
        "   • The ONLY valid product URLs are the full URLs listed verbatim in the",
        "     LIVE OLL SHOP CATALOG section below.",
        "   • When recommending a specific product, place the FULL product URL on its",
        "     OWN LINE (nothing else on that line). The frontend auto-converts this",
        "     into a product card with image, price and Buy Now button — so you don\\'t",
        "     need to describe the kit in prose, the card does it.",
        "   • Valid category pages: /shop/category/curriculum-books · /curriculum-robotic-kits",
        "     · /competition-and-advanced-kits · /individual-components.",
        "   • DO NOT invent product slugs. Writing `/shop/product/robo-sumo-kit-b8176a8d`",
        "     or `/product/book-g-1/` is a BUG — it 404s.",
        "6. NEVER mention 'the FAQ PDF', 'my knowledge base' or 'my training data' — just answer.",
        "7. NEVER write `<br/>` or any HTML tags in your reply — plain Markdown only.",
        "   The frontend auto-converts bare https:// URLs into clickable links.",
        "8. Respond in the user\\'s language. If they write Hindi/Marathi/etc, reply in that language.",
        "",
        "COMMON HALLUCINATIONS TO AVOID (if any of these appear in your draft, STOP and rewrite):",
        "- 'TechFest 2025' / 'February 15, 2025' / 'March 15, 2025' / any 2025 date → WRONG. Use 2026-27 dates.",
        "- 'Open League Learning' / 'Online Live Learning' → WRONG. OLL = On Learn Learn.",
        "- 'support@onlinelivelearning.com' / 'support@oll.co' → WRONG. The email is info@oll.co.",
        "- Generic 'contact support for exact dates' → WRONG. The exact dates ARE listed below.",
        "- Guessing product URL slugs → WRONG. Only use URLs from the live catalog below.",
        "",
        "TONE & STYLE:",
        "- Be concise. 2-6 sentences per answer. Use bullet lists for 3+ items.",
        "- Friendly, warm, confidence-building. Never robotic.",
        "- When referencing a page, include its FULL URL on its own line (e.g. https://oll.co/shop).",
    ]

    # VERBATIM content from the live OLL landing pages — second-highest priority
    if OFFICIAL_RULEBOOK:
        sections += [
            "",
            _SEP,
            "📘 OFFICIAL OLL TECHFEST 2026-27 RULEBOOK (uploaded by OLL product team · HIGHEST-PRIORITY source · ignore any conflicting pretraining memory):",
            _SEP,
            OFFICIAL_RULEBOOK,
        ]
    if OLL_PAGES_VERBATIM:
        sections += [
            "",
            _SEP,
            "🏆 VERBATIM CONTENT FROM THE LIVE OLL LANDING PAGES:",
            _SEP,
            OLL_PAGES_VERBATIM,
        ]

    # Admin-editable DB sections
    for title, content in [
        ("TECHFEST — rules, dates, prizes:", settings.techfest),
        ("OLL SHOP — categories, delivery, pricing, policy:", settings.shop),
        ("SCHOOL PRODUCTS (B2B) — labs, Future Skills, AI Center, Group 3:", settings.school_products),
        ("B2C LEARNING PROGRAMS, CAMPS & WORKSHOPS:", settings.programs),
        ("OLL CENTERS (physical labs) — notes & how-to-join:", settings.centers),
        ("BROCHURES & PDF DOWNLOADS:", settings.brochures),
        ("SUPPORT POLICY:", settings.support),
        ("OLL CORE FACTS & SITEMAP:", settings.core_facts),
        ("EXTRA KNOWLEDGE (pasted by admin — treat as authoritative):", settings.extra_knowledge),
    ]:
        if (content or "").strip():
            sections += ["", _SEP, title, _SEP, content.strip()]

    # Authoritative training URLs — bot is told to always use these verbatim.
    if settings.training_urls:
        urls = "\n".join(f"- {u}" for u in settings.training_urls if u.strip())
        if urls:
            sections += [
                "",
                _SEP,
                "📚 AUTHORITATIVE OLL PAGES — always link to these when relevant (never invent other paths):",
                _SEP,
                urls,
            ]

    # YouTube video embeds — bot pastes the raw URL on its own line when the
    # user's question matches the keywords, and the frontend auto-embeds it.
    if settings.youtube_mappings:
        yt_lines = []
        for m in settings.youtube_mappings:
            if not (m.youtube_url or "").strip():
                continue
            yt_lines.append(f"- {m.description} — keywords: {m.keywords}\n  Video: {m.youtube_url}")
        if yt_lines:
            sections += [
                "",
                _SEP,
                "🎥 YOUTUBE VIDEO LIBRARY — when the user\\'s question matches the keywords below, INCLUDE the Video URL on its own line in your answer. The frontend will auto-embed it as an iframe. Prefer embedding one relevant video over a long written explanation when a video answers it best.",
                _SEP,
                "\n".join(yt_lines),
            ]

    # Live shop catalog
    if settings.include_live_products:
        live_block = await _fetch_live_products_block()
        if live_block:
            sections += [
                "",
                _SEP,
                "LIVE OLL SHOP CATALOG (current prices · ALWAYS prefer these over external sellers · ONLY use these exact URLs for product links):",
                _SEP,
                live_block,
            ]

    # Live centers list
    if settings.include_live_centers:
        centers_block = await _fetch_live_centers_block()
        if centers_block:
            sections += [
                "",
                _SEP,
                "LIVE OLL CENTERS (physical labs with weekly batches — quote the exact address/phone from here):",
                _SEP,
                centers_block,
            ]

    # Live school offerings catalog
    if settings.include_live_offerings:
        offerings_block = await _fetch_live_offerings_block()
        if offerings_block:
            sections += [
                "",
                _SEP,
                "LIVE SCHOOL OFFERINGS CATALOG (B2B programs with canonical URLs):",
                _SEP,
                offerings_block,
            ]

    # Live blog titles
    if settings.include_live_blogs:
        blogs_block = await _fetch_live_blogs_block()
        if blogs_block:
            sections += [
                "",
                _SEP,
                "RECENTLY PUBLISHED OLL BLOG ARTICLES (link these when they match the user\\'s question):",
                _SEP,
                blogs_block,
            ]

    # Legacy PDFs intentionally NOT injected — they have outdated 150 cm/10-12 m specs
    # that contradict the current official rulebook. Keep as data-only, don't inject.

    if user_tickets_block:
        sections += [
            "",
            _SEP,
            "THIS USER'S OWN SUPPORT TICKETS (private — only share with THIS user):",
            _SEP,
            user_tickets_block,
        ]

    sections += [
        "",
        _SEP,
        "FINAL REMINDER - AUTHORITATIVE FACTS (override the vendor PDFs above and your own memory):",
        _SEP,
        "- RoboSumo ring: 100 cm (1 m) circular diameter. Do NOT quote 150 cm as the arena diameter.",
        "- RoboRacer track: about 5 m long, 2 parallel lanes.",
        "- The ONLY support email is info@oll.co. Never invent any other address.",
        "- OLL = On Learn Learn. When asked, state this plainly; never list, quote or deny any other expansion.",
        "- Only send buyers to the OLL Shop (https://oll.co/shop); never to external sellers.",
    ]

    sections += [
        "",
        _SEP,
        "HANDOFF POLICY:",
        _SEP,
        "If a user's question cannot be answered from the facts above, respond with:",
        '  "I\'m not sure about that — the best next step is to email info@oll.co or tap the Need Help button at the bottom-right. Would you like me to raise a support ticket for you?"',
        "If they say yes, instruct them to click the Need Help button or email info@oll.co.",
    ]
    return "\n".join(sections)


# ─── In-memory session store ─────────────────────────────────────────────────
_SESSIONS: dict[str, dict] = {}
_SESSION_TTL_SEC = 60 * 30  # 30 min idle timeout


def _get_session(session_id: str) -> dict:
    now = time.time()
    for sid in list(_SESSIONS.keys()):
        if now - _SESSIONS[sid]["touched"] > _SESSION_TTL_SEC:
            _SESSIONS.pop(sid, None)
    sess = _SESSIONS.get(session_id)
    if not sess:
        sess = {"messages": [], "touched": now}
        _SESSIONS[session_id] = sess
    sess["touched"] = now
    return sess


async def _fetch_user_tickets_block(authorization: Optional[str]) -> Optional[str]:
    """Return markdown summary of the authed user's recent support tickets."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(None, 1)[1].strip()
    payload = _decode_token(token)
    if not payload:
        return None
    email = (payload.get("email") or "").lower()
    user_id = payload.get("sub") or payload.get("user_id") or ""
    if not email and not user_id:
        return None

    query_filter: dict = {"$or": []}
    if email:
        query_filter["$or"].append({"user_email": email})
        query_filter["$or"].append({"email": email})
    if user_id:
        query_filter["$or"].append({"user_id": user_id})
    if not query_filter["$or"]:
        return None

    cursor = (
        db.support_queries.find(query_filter, {"_id": 0})
        .sort("created_at", -1)
        .limit(10)
    )
    rows = await cursor.to_list(10)
    if not rows:
        return "The user has no support tickets on file."

    lines = []
    for t in rows:
        tid = t.get("id") or t.get("ticket_id") or ""
        subj = (t.get("subject") or t.get("title") or t.get("message") or "")[:120]
        status = (t.get("status") or "open").title()
        created = (t.get("created_at") or "")[:10]
        last_reply = ""
        replies = t.get("replies") or []
        if replies:
            last_reply = (replies[-1].get("created_at") or replies[-1].get("timestamp") or "")[:10]
        lines.append(
            f"- Ticket {tid[:8]}: {subj!r} · status={status} · opened {created}"
            + (f" · last reply {last_reply}" if last_reply else "")
        )
    return "\n".join(lines)


class FaqChatRequest(BaseModel):
    session_id: str = Field(..., min_length=4, max_length=64)
    message: str = Field(..., min_length=1, max_length=2000)


class FaqChatReply(BaseModel):
    reply: str
    session_id: str
    message_count: int
    rate_limited: bool = False
    remaining: Optional[int] = None


# Rate-limit: 3 questions per calendar day per visitor identity.
DAILY_LIMIT = 3


def _visitor_identity(session_id: str, authorization: Optional[str], client_host: str) -> str:
    """A stable per-visitor key for daily rate limiting.

    Priority: authed user email > authed user id > client IP > session_id.
    Session_id alone is NOT safe because it rotates per sessionStorage, but
    client IP + session_id combined catches the common case."""
    if authorization and authorization.lower().startswith("bearer "):
        payload = _decode_token(authorization.split(None, 1)[1].strip())
        if payload:
            key = payload.get("email") or payload.get("sub") or payload.get("user_id")
            if key:
                return f"user:{str(key).lower()}"
    if client_host:
        return f"ip:{client_host}"
    return f"sess:{session_id}"


def _normalise_query(q: str) -> str:
    """Collapse near-duplicates for the admin analytics view."""
    import re
    q = (q or "").lower().strip()
    q = re.sub(r"[^a-z0-9 ]+", " ", q)
    q = re.sub(r"\s+", " ", q)
    return q[:200]


async def _check_and_increment_rate_limit(identity: str) -> tuple[bool, int]:
    """Returns (allowed, remaining_after_this_call). Uses an atomic $inc so
    two parallel requests from the same identity can't both squeeze through."""
    from datetime import date
    today = date.today().isoformat()
    doc = await db.faq_chat_rate.find_one_and_update(
        {"identity": identity, "day": today},
        {"$inc": {"count": 1}, "$setOnInsert": {"identity": identity, "day": today}},
        upsert=True,
        return_document=True,
    )
    count = (doc or {}).get("count", 1) if doc else 1
    # find_one_and_update default return_document is BEFORE; some drivers
    # return the post-update doc under newer versions. Normalise:
    if count == 0:
        count = 1
    remaining = max(0, DAILY_LIMIT - count)
    return count <= DAILY_LIMIT, remaining


@router.get("/faq-chat/suggestions")
async def faq_chat_suggestions():
    settings = await read_settings()
    return {"suggestions": settings.suggestions, "daily_limit": DAILY_LIMIT}


@router.post("/faq-chat", response_model=FaqChatReply)
async def faq_chat(req: FaqChatRequest, request: Request):
    from emergentintegrations.llm.chat import LlmChat, UserMessage  # pre-installed

    # ─── Rate limit ───────────────────────────────────────────────────────
    client_host = (request.client.host if request.client else "") or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    identity = _visitor_identity(req.session_id, request.headers.get("authorization"), client_host)
    allowed, remaining = await _check_and_increment_rate_limit(identity)
    if not allowed:
        rl_reply = (
            f"You've reached today's limit of **{DAILY_LIMIT} questions**. 🙏\n\n"
            "For more help right now, you can:\n\n"
            "- 💬 WhatsApp us at **+91 99201 88188** (fastest)\n"
            "- ✉️ Email **info@oll.co**\n"
            "- 🎫 Or tap *Raise a ticket* below and our team will reach out\n\n"
            "Come back tomorrow and I'll be happy to help with 3 more questions!"
        )
        return FaqChatReply(
            reply=rl_reply, session_id=req.session_id,
            message_count=len(_get_session(req.session_id)["messages"]),
            rate_limited=True, remaining=0,
        )

    sess = _get_session(req.session_id)
    user_tickets_block = await _fetch_user_tickets_block(request.headers.get("authorization"))
    system = await _build_system_prompt(user_tickets_block=user_tickets_block)

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        raise HTTPException(status_code=503, detail="LLM is temporarily unavailable")

    # LlmChat only honours `system_message` when `initial_messages` is empty
    initial_messages = [{"role": "system", "content": system}] + [
        {"role": m["role"], "content": m["content"]}
        for m in sess["messages"][-20:]
    ]

    chat = LlmChat(
        api_key=llm_key,
        session_id=req.session_id,
        system_message=system,
        initial_messages=initial_messages,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        reply = await chat.send_message(UserMessage(text=req.message))
    except Exception:
        return FaqChatReply(
            reply=(
                "I ran into a technical hiccup. For a quick answer, WhatsApp us at "
                "**+91 99201 88188** or email **info@oll.co**. Our team usually "
                "replies within a few hours."
            ),
            session_id=req.session_id,
            message_count=len(sess["messages"]),
            remaining=remaining,
        )

    valid_urls = await _valid_product_urls()
    reply = _sanitize_reply(reply, valid_urls)

    sess["messages"].append({"role": "user", "content": req.message})
    sess["messages"].append({"role": "assistant", "content": reply})

    # ─── Log for admin analytics ──────────────────────────────────────────
    import uuid
    from datetime import datetime, timezone
    try:
        await db.faq_chat_logs.insert_one({
            "id": str(uuid.uuid4()),
            "identity": identity,
            "session_id": req.session_id,
            "question": req.message[:2000],
            "question_normalised": _normalise_query(req.message),
            "answer_preview": reply[:500],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "day": datetime.now(timezone.utc).date().isoformat(),
            "feedback": None,
        })
    except Exception:
        pass  # logging must never break the chat response

    return FaqChatReply(
        reply=reply,
        session_id=req.session_id,
        message_count=len(sess["messages"]),
        remaining=remaining,
    )


@router.post("/faq-chat/feedback")
async def faq_chat_feedback(payload: dict):
    """Mark the latest answer thumbs-up/down. Used by the admin to track quality."""
    session_id = (payload.get("session_id") or "").strip()
    verdict = (payload.get("verdict") or "").strip()  # 'up' or 'down'
    question = (payload.get("question") or "").strip()
    if not session_id or verdict not in ("up", "down"):
        raise HTTPException(400, "session_id and verdict (up/down) required")
    await db.faq_chat_logs.update_one(
        {"session_id": session_id, "question": question},
        {"$set": {"feedback": verdict}},
        upsert=False,
    )
    return {"ok": True}


@router.post("/faq-chat/reset")
async def faq_chat_reset(session_id: str):
    _SESSIONS.pop(session_id, None)
    return {"ok": True}


@router.post("/faq-chat/raise-ticket")
async def faq_chat_raise_ticket(payload: dict, request: Request):
    """When the user says 'the bot didn't help', write a support_queries row."""
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip()
    phone = (payload.get("phone") or "").strip()
    school_name = (payload.get("school_name") or "").strip()
    category = (payload.get("category") or "").strip()
    subcategory = (payload.get("subcategory") or "").strip()
    message = (payload.get("message") or "").strip()
    session_id = payload.get("session_id") or ""
    if not (email and message and name and phone and school_name):
        raise HTTPException(status_code=400, detail="Name, phone, email, school and message are all required")

    sess = _SESSIONS.get(session_id, {"messages": []})
    transcript = "\n\n".join(
        f"[{m['role'].upper()}]\n{m['content']}" for m in sess.get("messages", [])
    )

    import uuid
    from datetime import datetime, timezone

    subject_bits = [b for b in (category, subcategory) if b]
    subject_prefix = " · ".join(subject_bits) or "FAQ Bot escalation"
    doc = {
        "id": str(uuid.uuid4()),
        "subject": f"[{subject_prefix}] {message[:60]}",
        "message": message,
        "transcript": transcript,
        "name": name,
        "email": email,
        "phone": phone,
        "school_name": school_name,
        "category": category,
        "subcategory": subcategory,
        "source": "faq_chatbot",
        "status": "open",
        "priority": "normal",
        "assigned_to": None,
        "replies": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.support_queries.insert_one(doc)
    return {"ok": True, "ticket_id": doc["id"]}



@router.get("/admin/faq-chat/analytics")
async def faq_chat_analytics(days: int = 30, sort: str = "count_desc", user: dict = None):
    """AI Resolutions dashboard. `sort` ∈ {count_desc, count_asc, latest, oldest,
    most_liked, most_disliked}. Returns totals, per-query aggregates, and an
    estimated INR cost of running the AI agent in the selected window."""
    from datetime import datetime, timezone, timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    sort_stage = {"count": -1}
    if sort == "count_asc":
        sort_stage = {"count": 1}
    elif sort == "latest":
        sort_stage = {"last_asked": -1}
    elif sort == "oldest":
        sort_stage = {"last_asked": 1}
    elif sort == "most_liked":
        sort_stage = {"thumbs_up": -1}
    elif sort == "most_disliked":
        sort_stage = {"thumbs_down": -1}

    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$question_normalised",
            "count": {"$sum": 1},
            "sample_question": {"$first": "$question"},
            "last_asked": {"$max": "$created_at"},
            "first_asked": {"$min": "$created_at"},
            "thumbs_up": {"$sum": {"$cond": [{"$eq": ["$feedback", "up"]}, 1, 0]}},
            "thumbs_down": {"$sum": {"$cond": [{"$eq": ["$feedback", "down"]}, 1, 0]}},
            "unique_visitors": {"$addToSet": "$identity"},
        }},
        {"$project": {
            "_id": 0,
            "normalised": "$_id",
            "sample_question": 1,
            "count": 1,
            "last_asked": 1,
            "first_asked": 1,
            "thumbs_up": 1,
            "thumbs_down": 1,
            "unique_visitors": {"$size": "$unique_visitors"},
        }},
        {"$sort": sort_stage},
        {"$limit": 200},
    ]
    rows = await db.faq_chat_logs.aggregate(pipeline).to_list(200)

    total = await db.faq_chat_logs.count_documents({"created_at": {"$gte": cutoff}})
    thumbs_up_total = await db.faq_chat_logs.count_documents({"created_at": {"$gte": cutoff}, "feedback": "up"})
    thumbs_down_total = await db.faq_chat_logs.count_documents({"created_at": {"$gte": cutoff}, "feedback": "down"})
    identities = await db.faq_chat_logs.distinct("identity", {"created_at": {"$gte": cutoff}})

    # Cost estimate — Claude Sonnet 4.5 current blended rate from Anthropic:
    #   $3 / M input tokens, $15 / M output tokens.
    # Our system prompt is ~45k tokens (knowledge base + live sections) and the
    # average answer is ~400 output tokens → ~$0.14/query. At ₹83/USD that\\'s
    # roughly ₹11.6 per query. We expose both pieces so the admin UI can
    # recompute if OLL changes the model.
    inr_per_query = float(os.environ.get("FAQ_COST_PER_QUERY_INR", "11.6"))
    total_cost_inr = round(total * inr_per_query, 2)

    return {
        "total_queries": total,
        "unique_visitors": len(identities),
        "thumbs_up": thumbs_up_total,
        "thumbs_down": thumbs_down_total,
        "top_queries": rows,
        "window_days": days,
        "sort": sort,
        "inr_per_query": inr_per_query,
        "total_cost_inr": total_cost_inr,
    }


@router.get("/faq-chat/product-lookup")
async def faq_chat_product_lookup(slug: str):
    """Resolves a product slug to {name, image, price, mrp, category, url}
    for inline chat-card rendering. Public endpoint — no auth."""
    try:
        from routes.shop import _fetch_vendor_catalog, _get_overrides_map, _merge_product
        vendor_products = await _fetch_vendor_catalog()
        overrides = await _get_overrides_map()
        for v in vendor_products:
            if not v.get("id"):
                continue
            p = _merge_product(v, overrides.get(v["id"]))
            if not p.get("show_on_shop"):
                continue
            if _product_slug(p) == slug:
                image = (
                    p.get("image_url")
                    or (p.get("gallery_urls") or [None])[0]
                    or (p.get("images") or [None])[0]
                    or p.get("thumbnail")
                    or ""
                )
                return {
                    "found": True,
                    "name": p.get("name"),
                    "image": image,
                    "selling_price": p.get("selling_price"),
                    "mrp": p.get("mrp"),
                    "category": p.get("category"),
                    "slug": slug,
                    "url": f"https://oll.co/shop/product/{slug}",
                }
    except Exception:
        pass
    return {"found": False, "slug": slug}
