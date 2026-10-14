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
import re
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
async def _fetch_product_name_tokens() -> set[str]:
    """Build a set of lowercase tokens drawn from live product names + categories
    so `_detect_topics` can recognise shop queries by exact product name
    (e.g. "BO Shaft", "M-M coupler", "FF wire") even when the user doesn't
    include generic words like "shop" or "buy"."""
    try:
        from routes.shop import _fetch_vendor_catalog, _get_overrides_map, _merge_product
        vendor_products = await _fetch_vendor_catalog()
        overrides = await _get_overrides_map()
        tokens: set[str] = set()
        for v in vendor_products:
            if not v.get("id"):
                continue
            p = _merge_product(v, overrides.get(v["id"]))
            if not p.get("show_on_shop"):
                continue
            name = (p.get("name") or "").lower().strip()
            if not name:
                continue
            # Full name (lowercase) + each word of length >= 2 so partial
            # queries like "shaft" or "coupler" still trigger the shop topic.
            tokens.add(name)
            # Also add dash/space variants: "m-m coupler" ↔ "mm coupler".
            tokens.add(name.replace("-", " "))
            tokens.add(name.replace("-", ""))
            for word in re.split(r"[^a-z0-9]+", name):
                if len(word) >= 2:
                    tokens.add(word)
        return tokens
    except Exception:
        return set()


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


async def _build_system_prompt(user_tickets_block: Optional[str] = None, topics: Optional[set] = None) -> str:
    """Assemble the system prompt, optionally trimmed to only the sections
    the user's question needs (keyword-detected by `_detect_topics`).

    This keeps input tokens ~8-15k instead of ~45k for 80% of queries,
    cutting LLM cost 3-5x without hurting answer quality.
    """
    settings = await read_settings()
    topics = topics if topics is not None else {"core", "techfest", "shop", "school_products", "programs", "centers", "brochures", "blogs"}

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
        "   Regional qualifiers: East IIT Kanpur 24 Oct 2026 · North Modern Public School, Shalimar Bagh, Delhi 21 Nov 2026",
        "   · South RVU Bangalore 26 Nov 2026",
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
        "   • If the user types ONLY a product name or shorthand (e.g. 'BO Shaft',",
        "     'MM coupler', 'FF wire', 'jumper wires', 'L298', 'MG90S'), do NOT ask",
        "     them to clarify. Treat it as a shop lookup: find the closest matching",
        "     product in the LIVE CATALOG below and reply with the product URL on",
        "     its OWN line (which renders as a card). Add 1-2 lines of context only.",
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
    if OFFICIAL_RULEBOOK and "techfest" in topics:
        sections += [
            "",
            _SEP,
            "📘 OFFICIAL OLL TECHFEST 2026-27 RULEBOOK (uploaded by OLL product team · HIGHEST-PRIORITY source · ignore any conflicting pretraining memory):",
            _SEP,
            OFFICIAL_RULEBOOK,
        ]
    if OLL_PAGES_VERBATIM and "techfest" in topics:
        sections += [
            "",
            _SEP,
            "🏆 VERBATIM CONTENT FROM THE LIVE OLL LANDING PAGES:",
            _SEP,
            OLL_PAGES_VERBATIM,
        ]

    # Admin-editable DB sections — gated by topic so we don't waste tokens.
    topic_sections = [
        ("TECHFEST — rules, dates, prizes:", settings.techfest, "techfest"),
        ("OLL SHOP — categories, delivery, pricing, policy:", settings.shop, "shop"),
        ("SCHOOL PRODUCTS (B2B) — labs, Future Skills, AI Center, Group 3:", settings.school_products, "school_products"),
        ("B2C LEARNING PROGRAMS, CAMPS & WORKSHOPS:", settings.programs, "programs"),
        ("OLL CENTERS (physical labs) — notes & how-to-join:", settings.centers, "centers"),
        ("BROCHURES & PDF DOWNLOADS:", settings.brochures, "brochures"),
        ("SUPPORT POLICY:", settings.support, "core"),
        ("OLL CORE FACTS & SITEMAP:", settings.core_facts, "core"),
        ("EXTRA KNOWLEDGE (pasted by admin — treat as authoritative):", settings.extra_knowledge, "core"),
    ]
    for title, content, topic in topic_sections:
        if topic not in topics:
            continue
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

    # Live shop catalog — only inject when the question is actually about shop/kits.
    if settings.include_live_products and "shop" in topics:
        live_block = await _fetch_live_products_block()
        if live_block:
            sections += [
                "",
                _SEP,
                "LIVE OLL SHOP CATALOG (current prices · ALWAYS prefer these over external sellers · ONLY use these exact URLs for product links):",
                _SEP,
                live_block,
            ]

    # Live centers list — only when the user asks about physical locations.
    if settings.include_live_centers and "centers" in topics:
        centers_block = await _fetch_live_centers_block()
        if centers_block:
            sections += [
                "",
                _SEP,
                "LIVE OLL CENTERS (physical labs with weekly batches — quote the exact address/phone from here):",
                _SEP,
                centers_block,
            ]

    # Live school offerings — only for B2B queries.
    if settings.include_live_offerings and "school_products" in topics:
        offerings_block = await _fetch_live_offerings_block()
        if offerings_block:
            sections += [
                "",
                _SEP,
                "LIVE SCHOOL OFFERINGS CATALOG (B2B programs with canonical URLs):",
                _SEP,
                offerings_block,
            ]

    # Live blog titles — only when the user asks for articles.
    if settings.include_live_blogs and "blogs" in topics:
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
    source: str = "llm"            # 'llm' | 'cache' | 'pre_canned'
    latency_ms: int = 0


# Rate-limit: 10 questions per calendar day per visitor identity.
DAILY_LIMIT = 10


def _visitor_identity(
    session_id: str,
    authorization: Optional[str],
    client_host: str,
    visitor_id: Optional[str] = None,
) -> str:
    """A stable per-visitor key for daily rate limiting.

    Priority: authed user email > `X-Visitor-Id` cookie (persisted in
    localStorage by the frontend) > `ip + session_id` composite > session_id.
    IP alone is unreliable because all visitors coming through the Emergent
    Kubernetes ingress share the same source address, so an IP-only bucket
    would (and did) merge every anonymous visitor into a single 10-q/day
    counter.
    """
    if authorization and authorization.lower().startswith("bearer "):
        payload = _decode_token(authorization.split(None, 1)[1].strip())
        if payload:
            key = payload.get("email") or payload.get("sub") or payload.get("user_id")
            if key:
                return f"user:{str(key).lower()}"
    # Persistent per-browser visitor id (set once by the frontend). This is
    # the primary bucket for anonymous visitors.
    if visitor_id:
        vid = str(visitor_id).strip()[:64]
        if vid:
            return f"vid:{vid}"
    # Fallback: combine IP + session_id so two different browsers behind the
    # same shared IP get separate buckets (session_id rotates per load, but
    # it's still better than one global IP bucket).
    if client_host and session_id:
        return f"ip:{client_host}:sess:{session_id[:16]}"
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


def _match_pre_canned(question: str, pre_canned) -> Optional[str]:
    """Return a cached answer if the user's question matches an admin-authored
    Q→A pair. Match rule: normalised question is contained in the pre-canned
    question (or vice versa), OR any of the comma-separated keywords appears
    as a substring in the user question. Case-insensitive, punctuation-insensitive."""
    if not pre_canned:
        return None
    nq = _normalise_query(question)
    if not nq:
        return None
    for pc in pre_canned:
        answer = (pc.answer or "").strip()
        if not answer:
            continue
        candidate_q = _normalise_query(pc.question)
        if candidate_q and (candidate_q == nq or candidate_q in nq or nq in candidate_q):
            return answer
        for kw in (pc.keywords or "").split(","):
            kw = _normalise_query(kw)
            if kw and len(kw) >= 4 and kw in nq:
                return answer
    return None


# ─── Simple in-memory response cache (shared across sessions) ─────────────
# Keyed by normalised question. 1-hour TTL. Caps at 200 entries (LRU-ish).
import time as _time
_RESPONSE_CACHE: dict[str, tuple[float, str]] = {}
_CACHE_TTL_SEC = 3600
_CACHE_MAX = 200


def _cache_get(nq: str) -> Optional[str]:
    row = _RESPONSE_CACHE.get(nq)
    if not row:
        return None
    ts, answer = row
    if _time.time() - ts > _CACHE_TTL_SEC:
        _RESPONSE_CACHE.pop(nq, None)
        return None
    return answer


def _cache_put(nq: str, answer: str) -> None:
    if len(_RESPONSE_CACHE) >= _CACHE_MAX:
        # Drop the oldest entry.
        oldest = min(_RESPONSE_CACHE, key=lambda k: _RESPONSE_CACHE[k][0])
        _RESPONSE_CACHE.pop(oldest, None)
    _RESPONSE_CACHE[nq] = (_time.time(), answer)


# ─── Keyword-based prompt routing — avoid injecting the full knowledge base
# ─── on every query. Shrinks the input from ~45k tokens to 8-15k.
async def _detect_topics(question: str) -> set[str]:
    """Return a set of topic tags present in the user's question so we only
    inject the knowledge sections that are actually relevant.
    Always includes 'core' (identity + hard rules + sitemap)."""
    q = _normalise_query(question)
    topics = {"core"}
    # Techfest
    if any(k in q for k in (
        "techfest", "sumo", "racer", "race", "innovation", "arena", "track",
        "qualifier", "finale", "iit bombay", "iit kanpur", "rvu", "register",
        "registration", "submit", "submission", "problem statement", "prize",
        "pitch", "team size", "rulebook", "rules", "bot", "robo", "round 1",
        "round 2", "championship", "bank", "neft",
    )):
        topics.add("techfest")
    # Shop / buy
    if any(k in q for k in (
        "shop", "buy", "kit", "price", "cost", "order", "product", "book",
        "motor", "sensor", "esp32", "esp8266", "arduino", "cart", "delivery",
        "ship", "cashfree", "wire", "battery", "blox", "chassis", "wheel",
        "driver", "how much", "shaft", "coupler", "jumper", "led", "resistor",
        "component", "breadboard", "servo", "ultrasonic", "ir sensor", "nut",
        "bolt", "screw", "bearing", "gear", "pulley", "frame", "l298", "l293",
        "relay", "capacitor", "transistor", "diode", "oled", "lcd",
        "potentiometer", "buzzer", "speaker", "gyro", "accelerometer", "lipo",
        "n20", "stepper", "mg90", "mg995", "sg90", "hcsr04", "hc-sr04", "pir",
        "mpu", "bluetooth", " bo ", "oll shop", "mm ", " mm", "m-m", "ff ",
        " ff", "m-f", "f-f", " mf ",
    )):
        topics.add("shop")
    # School / B2B
    if any(k in q for k in (
        "school", "principal", "teacher", "lab", "curriculum", "future skills",
        "ai center", "icse", "cbse", "group 3", "robotics program", "b2b",
        "partner school", "demo", "setup",
    )):
        topics.add("school_products")
    # B2C programs
    if any(k in q for k in (
        "camp", "workshop", "foundation", "internship", "continuous learning",
        "class", "course", "my child", "summer", "father", "mother", "diwali",
    )):
        topics.add("programs")
    # Centers
    if any(k in q for k in (
        "center", "centre", "location", "batch", "near me", "address",
        "andheri", "dombivli", "dahisar", "mira road", "mumbai", "powai",
        "weekly class",
    )):
        topics.add("centers")
    # Brochures
    if any(k in q for k in ("brochure", "pdf", "download", "datasheet", "leaflet")):
        topics.add("brochures")
    # Blogs
    if any(k in q for k in ("blog", "article", "read about", "post")):
        topics.add("blogs")

    # ─── Catalog-aware fallback ──────────────────────────────────────────
    # If "shop" wasn't already added, check if any live product-name token
    # (e.g. "shaft", "coupler", "bo motor") appears in the query. This
    # catches queries that are just a product name without any generic
    # shop/buy keyword. The tokens set is cached for 10 minutes.
    if "shop" not in topics:
        try:
            tokens = await _fetch_product_name_tokens()
            # Pad the query so we can match whole-word tokens against boundaries.
            padded = f" {q} "
            for tok in tokens:
                if not tok:
                    continue
                # For short tokens (<= 3 chars) require word-boundary match to
                # avoid false positives like 'bo' matching 'book' or 'about'.
                if len(tok) <= 3:
                    if f" {tok} " in padded or padded.startswith(f"{tok} ") or padded.endswith(f" {tok}"):
                        topics.add("shop")
                        break
                else:
                    if tok in q:
                        topics.add("shop")
                        break
        except Exception:
            pass

    # Default fallback: if query is generic (greeting, help, who are you),
    # pull in a tiny techfest block so the bot can still answer the common case.
    if topics == {"core"}:
        topics.add("techfest")
    return topics


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

    t0 = _time.time()

    # ─── Rate limit ───────────────────────────────────────────────────────
    client_host = (request.client.host if request.client else "") or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    visitor_id = request.headers.get("x-visitor-id") or request.headers.get("X-Visitor-Id")
    identity = _visitor_identity(req.session_id, request.headers.get("authorization"), client_host, visitor_id)
    allowed, remaining = await _check_and_increment_rate_limit(identity)
    if not allowed:
        rl_reply = (
            f"You've reached today's limit of **{DAILY_LIMIT} questions**. 🙏\n\n"
            "For more help right now, you can:\n\n"
            "- 💬 WhatsApp us at **+91 99201 88188** (fastest)\n"
            "- ✉️ Email **info@oll.co**\n"
            "- 🎫 Or tap *Raise a ticket* below and our team will reach out\n\n"
            f"Come back tomorrow and I'll be happy to help with {DAILY_LIMIT} more questions!"
        )
        return FaqChatReply(
            reply=rl_reply, session_id=req.session_id,
            message_count=len(_get_session(req.session_id)["messages"]),
            rate_limited=True, remaining=0,
            source="pre_canned", latency_ms=int((_time.time() - t0) * 1000),
        )

    sess = _get_session(req.session_id)
    nq = _normalise_query(req.message)

    # ─── Fast path 0: admin-trained canonical answer ─────────────────────
    # If an admin has thumbed-up or hand-corrected a reply for THIS exact
    # question (normalised), serve that verbatim. Zero LLM cost, instant,
    # and guarantees the admin's trained answer is what the public sees.
    canonical = await db.faq_canonical_answers.find_one(
        {"question_normalised": nq}, {"_id": 0, "answer": 1, "verdict": 1},
    )
    if canonical and canonical.get("answer"):
        trained = canonical["answer"]
        sess["messages"].append({"role": "user", "content": req.message})
        sess["messages"].append({"role": "assistant", "content": trained})
        await _log_chat(identity, req.session_id, req.message, trained, source="pre_canned")
        return FaqChatReply(
            reply=trained, session_id=req.session_id,
            message_count=len(sess["messages"]), remaining=remaining,
            source="pre_canned", latency_ms=int((_time.time() - t0) * 1000),
        )

    # ─── Fast path 1: admin-authored pre-canned answer (free, instant) ────
    settings = await read_settings()
    pre_canned_hit = _match_pre_canned(req.message, settings.pre_canned)
    if pre_canned_hit:
        sess["messages"].append({"role": "user", "content": req.message})
        sess["messages"].append({"role": "assistant", "content": pre_canned_hit})
        await _log_chat(identity, req.session_id, req.message, pre_canned_hit, source="pre_canned")
        return FaqChatReply(
            reply=pre_canned_hit, session_id=req.session_id,
            message_count=len(sess["messages"]), remaining=remaining,
            source="pre_canned", latency_ms=int((_time.time() - t0) * 1000),
        )

    # ─── Fast path 2: response cache (free, ~instant) ─────────────────────
    # Only cache first-turn answers (sess["messages"] empty before this call)
    # so follow-ups like "yes continue" don't resolve to a stale cached reply.
    cache_eligible = len(sess["messages"]) == 0
    if cache_eligible:
        cached = _cache_get(nq)
        if cached:
            sess["messages"].append({"role": "user", "content": req.message})
            sess["messages"].append({"role": "assistant", "content": cached})
            await _log_chat(identity, req.session_id, req.message, cached, source="cache")
            return FaqChatReply(
                reply=cached, session_id=req.session_id,
                message_count=len(sess["messages"]), remaining=remaining,
                source="cache", latency_ms=int((_time.time() - t0) * 1000),
            )

    # ─── Slow path: LLM call with topic-trimmed prompt ────────────────────
    topics = await _detect_topics(req.message)
    user_tickets_block = await _fetch_user_tickets_block(request.headers.get("authorization"))
    system = await _build_system_prompt(user_tickets_block=user_tickets_block, topics=topics)

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        raise HTTPException(status_code=503, detail="LLM is temporarily unavailable")

    initial_messages = [{"role": "system", "content": system}] + [
        {"role": m["role"], "content": m["content"]}
        for m in sess["messages"][-20:]
    ]

    chat = LlmChat(
        api_key=llm_key,
        session_id=req.session_id,
        system_message=system,
        initial_messages=initial_messages,
    ).with_model("anthropic", "claude-haiku-4-5-20251001")

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
            source="llm", latency_ms=int((_time.time() - t0) * 1000),
        )

    valid_urls = await _valid_product_urls()
    reply = _sanitize_reply(reply, valid_urls)

    sess["messages"].append({"role": "user", "content": req.message})
    sess["messages"].append({"role": "assistant", "content": reply})

    # Cache the first-turn answer so follow-up visitors asking the same
    # question hit the cache (free).
    if cache_eligible and reply:
        _cache_put(nq, reply)

    await _log_chat(identity, req.session_id, req.message, reply, source="llm")

    return FaqChatReply(
        reply=reply,
        session_id=req.session_id,
        message_count=len(sess["messages"]),
        remaining=remaining,
        source="llm",
        latency_ms=int((_time.time() - t0) * 1000),
    )


async def _log_chat(identity: str, session_id: str, question: str, answer: str, source: str = "llm") -> None:
    """Non-blocking write to faq_chat_logs. source tracks whether the LLM was
    actually billed ('llm'), a pre-canned answer was returned ('pre_canned'),
    or the response cache hit ('cache') — admins can now see the cache hit
    rate on the AI Resolutions dashboard."""
    import uuid
    from datetime import datetime, timezone
    try:
        await db.faq_chat_logs.insert_one({
            "id": str(uuid.uuid4()),
            "identity": identity,
            "session_id": session_id,
            "question": question[:2000],
            "question_normalised": _normalise_query(question),
            "answer_preview": (answer or "")[:500],
            # Full answer kept so the admin analytics "See full reply" expand
            # has the complete markdown/HTML. Capped at 20k chars which comfortably
            # fits every current OLL FAQ answer and keeps Mongo doc sizes sane.
            "answer_text": (answer or "")[:20000],
            "source": source,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "day": datetime.now(timezone.utc).date().isoformat(),
            "feedback": None,
        })
    except Exception:
        pass


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
        # Sort first so `$first` / `$last` pick the latest record for each
        # question. Mongo evaluates aggregation stages in order.
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$question_normalised",
            "count": {"$sum": 1},
            "sample_question": {"$first": "$question"},
            "latest_answer": {"$first": "$answer_text"},
            "latest_answer_preview": {"$first": "$answer_preview"},
            "latest_source": {"$first": "$source"},
            "latest_log_id": {"$first": "$id"},
            "latest_feedback": {"$first": "$feedback"},
            "last_asked": {"$max": "$created_at"},
            "first_asked": {"$min": "$created_at"},
            "thumbs_up": {"$sum": {"$cond": [{"$eq": ["$feedback", "up"]}, 1, 0]}},
            "thumbs_down": {"$sum": {"$cond": [{"$eq": ["$feedback", "down"]}, 1, 0]}},
            "unique_visitors": {"$addToSet": "$identity"},
            "sessions": {"$addToSet": "$session_id"},
        }},
        {"$project": {
            "_id": 0,
            "normalised": "$_id",
            "sample_question": 1,
            "count": 1,
            "last_asked": 1,
            "first_asked": 1,
            "latest_answer": 1,
            "latest_answer_preview": 1,
            "latest_source": 1,
            "latest_log_id": 1,
            "latest_feedback": 1,
            "thumbs_up": 1,
            "thumbs_down": 1,
            "unique_visitors": {"$size": "$unique_visitors"},
            "session_count": {"$size": "$sessions"},
        }},
        {"$sort": sort_stage},
        {"$limit": 200},
    ]
    rows = await db.faq_chat_logs.aggregate(pipeline).to_list(200)

    # Overlay canonical answers so the admin sees "trained" rows marked.
    normalised_set = [r.get("normalised") for r in rows if r.get("normalised")]
    canon_map: dict = {}
    if normalised_set:
        async for c in db.faq_canonical_answers.find({"question_normalised": {"$in": normalised_set}}):
            canon_map[c.get("question_normalised")] = {
                "answer": c.get("answer") or "",
                "verdict": c.get("verdict") or "trained",
                "updated_at": c.get("updated_at"),
            }
    for r in rows:
        canon = canon_map.get(r.get("normalised"))
        if canon:
            r["canonical_answer"] = canon["answer"]
            r["canonical_verdict"] = canon["verdict"]
            r["canonical_updated_at"] = canon["updated_at"]

    total = await db.faq_chat_logs.count_documents({"created_at": {"$gte": cutoff}})
    thumbs_up_total = await db.faq_chat_logs.count_documents({"created_at": {"$gte": cutoff}, "feedback": "up"})
    thumbs_down_total = await db.faq_chat_logs.count_documents({"created_at": {"$gte": cutoff}, "feedback": "down"})
    identities = await db.faq_chat_logs.distinct("identity", {"created_at": {"$gte": cutoff}})

    # Separate billed (LLM) vs free (cache / pre-canned) answers so the
    # admin dashboard reflects the actual cost.
    billed = await db.faq_chat_logs.count_documents({"created_at": {"$gte": cutoff}, "source": {"$in": ["llm", None]}})
    pre_canned_hits = await db.faq_chat_logs.count_documents({"created_at": {"$gte": cutoff}, "source": "pre_canned"})
    cache_hits = await db.faq_chat_logs.count_documents({"created_at": {"$gte": cutoff}, "source": "cache"})

    # Cost estimate — Claude Haiku 4.5 blended rate from Anthropic:
    #   $1 / M input tokens, $5 / M output tokens.
    # After topic-based prompt trimming the average query is ~12k input tokens
    # and ~400 output tokens → $0.014 ≈ ₹1.17 per billed query (at 83 INR/USD).
    # Pre-canned + cache hits are completely free.
    inr_per_query = float(os.environ.get("FAQ_COST_PER_QUERY_INR", "1.17"))
    total_cost_inr = round(billed * inr_per_query, 2)

    return {
        "total_queries": total,
        "billed_queries": billed,
        "pre_canned_hits": pre_canned_hits,
        "cache_hits": cache_hits,
        "free_hit_rate": round(((pre_canned_hits + cache_hits) / total) * 100, 1) if total else 0,
        "unique_visitors": len(identities),
        "thumbs_up": thumbs_up_total,
        "thumbs_down": thumbs_down_total,
        "top_queries": rows,
        "window_days": days,
        "sort": sort,
        "inr_per_query": inr_per_query,
        "total_cost_inr": total_cost_inr,
    }


@router.post("/admin/faq-chat/canonical-answer")
async def faq_chat_save_canonical_answer(request: Request):
    """Save a trusted answer for a specific normalised question.

    Two flows:
      • **Approve** — admin thumbs-up the AI's current reply → `verdict='approved'`.
        We store the AI's answer verbatim so the public chat can short-circuit
        to it on the next matching question (zero LLM cost, instant response).
      • **Correct** — admin thumbs-down + types the correct answer → stored with
        `verdict='corrected'`. Same short-circuit, but marked for review in the
        admin dashboard so you know which answers you've manually trained.

    Writes to `faq_canonical_answers` collection, keyed on `question_normalised`.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")
    if not isinstance(payload, dict):
        raise HTTPException(400, "Body must be a JSON object")
    question = (payload.get("question") or "").strip()
    answer = (payload.get("answer") or "").strip()
    verdict = (payload.get("verdict") or "approved").strip()
    log_id = (payload.get("log_id") or "").strip()
    if not question or not answer:
        raise HTTPException(400, "`question` and `answer` are required")
    if verdict not in ("approved", "corrected"):
        verdict = "approved"
    normalised = _normalise_query(question)
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    editor = ""
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        decoded = _decode_token(auth.split(None, 1)[1].strip())
        if decoded:
            editor = decoded.get("email") or decoded.get("sub") or ""
    await db.faq_canonical_answers.update_one(
        {"question_normalised": normalised},
        {"$set": {
            "question_normalised": normalised,
            "question": question[:500],
            "answer": answer[:20000],
            "verdict": verdict,
            "updated_at": now_iso,
            "updated_by": editor or "admin",
        }, "$setOnInsert": {"created_at": now_iso}},
        upsert=True,
    )
    if log_id:
        await db.faq_chat_logs.update_one(
            {"id": log_id},
            {"$set": {"feedback": "up" if verdict == "approved" else "down", "admin_trained": True}},
        )
    return {"ok": True, "verdict": verdict, "normalised": normalised}


@router.delete("/admin/faq-chat/canonical-answer")
async def faq_chat_delete_canonical_answer(question: str = ""):
    """Remove a trained override so Claude goes back to generating its own
    answer for this question."""
    if not question:
        raise HTTPException(400, "`question` query param required")
    normalised = _normalise_query(question)
    res = await db.faq_canonical_answers.delete_one({"question_normalised": normalised})
    return {"ok": True, "deleted": res.deleted_count}


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
