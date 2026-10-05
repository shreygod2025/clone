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
try:
    FAQ_TEXT = (_DATA_DIR / "techfest_faqs.txt").read_text(encoding="utf-8")
except FileNotFoundError:
    FAQ_TEXT = ""
try:
    PROBLEM_STATEMENT_TEXT = (_DATA_DIR / "techfest_problem_statement.txt").read_text(encoding="utf-8")
except FileNotFoundError:
    PROBLEM_STATEMENT_TEXT = ""
# Verbatim content copied from the live OLL competition landing pages —
# this is the single source of truth for the 2026-27 season. It overrides
# ANY conflicting fact in the LLM's pretraining data.
try:
    OLL_PAGES_VERBATIM = (_DATA_DIR / "oll_pages_verbatim.md").read_text(encoding="utf-8")
except FileNotFoundError:
    OLL_PAGES_VERBATIM = ""


_SEP = "=" * 72


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

    # 3. Wrong-season leakage. Only trip on explicit "TechFest 2025" strings;
    # we don't want to touch unrelated "2025" references.
    reply = re.sub(r"\bTechFest\s*20(2[0-5])\b", "TechFest 2026-27", reply, flags=re.IGNORECASE)
    reply = re.sub(r"\bTech\s*Fest\s*20(2[0-5])\b", "TechFest 2026-27", reply, flags=re.IGNORECASE)

    # 4. Expand wrong OLL names if they leak in anyway.
    reply = re.sub(r"\bOnline Live Learning\b", "On Learn Learn", reply)
    reply = re.sub(r"\bOpen League Learning\b", "On Learn Learn", reply)

    return reply


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
        "2. The ONLY support email is **info@oll.co**. NEVER write 'support@oll.co',",
        "   'support@onlinelivelearning.com', 'contact@oll.co' or any other variant.",
        "3. NEVER recommend buying from external sellers like Robu.in, Amazon, Flipkart,",
        "   RoboKits India, AliExpress, local electronics markets, or any third party.",
        "   For ALL purchases, direct the user to the OLL Shop (https://oll.co/shop).",
        "4. NEVER invent facts. If a question isn\\'t covered below, say so plainly and",
        "   point the user to **info@oll.co** or the Need Help button.",
        "5. 🔗 PRODUCT URLs — CRITICAL: The ONLY valid shop URLs are:",
        "   (a) the full URLs listed verbatim in the LIVE OLL SHOP CATALOG section below,",
        "   (b) the 4 category pages: /shop/category/curriculum-books · /curriculum-robotic-kits",
        "       · /competition-and-advanced-kits · /individual-components,",
        "   (c) the main shop: https://oll.co/shop.",
        "   DO NOT invent, shorten or guess product slugs. Writing a made-up URL like",
        "   `/shop/product/robo-sumo-kit-b8176a8d` or `/product/book-g-1/` is a BUG — it 404s.",
        "   If you can\\'t find the exact URL in the catalog below, link to the category",
        "   page or the main shop and ask the user to search there.",
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

    # VERBATIM content from the live OLL landing pages — highest-priority source
    if OLL_PAGES_VERBATIM:
        sections += [
            "",
            _SEP,
            "🏆 VERBATIM CONTENT FROM THE LIVE OLL LANDING PAGES (SINGLE SOURCE OF TRUTH):",
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
    ]:
        if (content or "").strip():
            sections += ["", _SEP, title, _SEP, content.strip()]

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

    # Vendor FAQ PDFs
    if FAQ_TEXT:
        sections += [
            "",
            _SEP,
            "VENDOR TECHFEST FAQ (secondary — override with the 2026 specs above on conflict):",
            _SEP,
            FAQ_TEXT,
        ]
    if PROBLEM_STATEMENT_TEXT:
        sections += [
            "",
            _SEP,
            "OFFICIAL PROBLEM STATEMENT (bot specs, arena rules, round-by-round progression):",
            _SEP,
            PROBLEM_STATEMENT_TEXT,
        ]

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
        "HANDOFF POLICY:",
        _SEP,
        "If a user's question cannot be answered from the facts above, respond with:",
        '  "I\'m not sure about that — the best next step is to email support@oll.co or tap the Need Help button at the bottom-right. Would you like me to raise a support ticket for you?"',
        "If they say yes, instruct them to click the Need Help button or email support@oll.co.",
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


@router.get("/faq-chat/suggestions")
async def faq_chat_suggestions():
    settings = await read_settings()
    return {"suggestions": settings.suggestions}


@router.post("/faq-chat", response_model=FaqChatReply)
async def faq_chat(req: FaqChatRequest, request: Request):
    from emergentintegrations.llm.chat import LlmChat, UserMessage  # pre-installed

    sess = _get_session(req.session_id)
    user_tickets_block = await _fetch_user_tickets_block(request.headers.get("authorization"))
    system = await _build_system_prompt(user_tickets_block=user_tickets_block)

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        raise HTTPException(status_code=503, detail="LLM is temporarily unavailable")

    initial_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in sess["messages"][-20:]
    ] or None

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
                "I ran into a technical hiccup. For a quick answer, email "
                "**info@oll.co** or tap the **Need Help** button at the "
                "bottom-right of this page. Our team usually replies within a few hours."
            ),
            session_id=req.session_id,
            message_count=len(sess["messages"]),
        )

    # Post-process the reply to kill common hallucinations (invented product
    # slugs → 404s, wrong support emails, wrong season year).
    valid_urls = await _valid_product_urls()
    reply = _sanitize_reply(reply, valid_urls)

    sess["messages"].append({"role": "user", "content": req.message})
    sess["messages"].append({"role": "assistant", "content": reply})

    return FaqChatReply(
        reply=reply,
        session_id=req.session_id,
        message_count=len(sess["messages"]),
    )


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
    message = (payload.get("message") or "").strip()
    session_id = payload.get("session_id") or ""
    if not email or not message:
        raise HTTPException(status_code=400, detail="Email and message are required")

    sess = _SESSIONS.get(session_id, {"messages": []})
    transcript = "\n\n".join(
        f"[{m['role'].upper()}]\n{m['content']}" for m in sess.get("messages", [])
    )

    import uuid
    from datetime import datetime, timezone

    doc = {
        "id": str(uuid.uuid4()),
        "subject": f"[FAQ Bot escalation] {message[:60]}",
        "message": message,
        "transcript": transcript,
        "name": name or email.split("@")[0],
        "email": email,
        "phone": phone,
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
