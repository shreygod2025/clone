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


_SEP = "=" * 72


def _format_live_products(products: List[dict]) -> str:
    """One-liner per product so the LLM can pattern-match on both human
    names and category keywords.

    Example:
      - [Competition & Advanced Kits] RoboSumo Championship Kit — ₹5,499 (MRP ₹6,999)
        https://oll.co/shop/product/robo-sumo-kit-...-22b5228a
    """
    if not products:
        return ""
    # Keep the prompt compact; top-80 products by default (full catalog is ~120).
    products = products[:80]
    lines: List[str] = []
    for p in products:
        name = (p.get("name") or "").strip()
        if not name:
            continue
        cat = (p.get("category") or "").strip() or "Uncategorised"
        price = p.get("selling_price")
        mrp = p.get("mrp")
        slug = p.get("slug") or ""
        url = f"https://oll.co/shop/product/{slug}" if slug else "https://oll.co/shop"
        price_bits: List[str] = []
        if isinstance(price, (int, float)):
            price_bits.append(f"₹{int(price):,}")
        if isinstance(mrp, (int, float)) and isinstance(price, (int, float)) and mrp > price:
            price_bits.append(f"(MRP ₹{int(mrp):,})")
        price_str = " ".join(price_bits) or "price on request"
        lines.append(f"- [{cat}] {name} — {price_str}\n  {url}")
    return "\n".join(lines)


async def _fetch_live_products_block() -> str:
    """Pull the full live product catalog from shop.py, formatted for the LLM.

    Returns '' on any failure so the chatbot gracefully degrades to the
    static knowledge in the admin settings."""
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
        "You help parents, teachers, students and partner-school admins with questions about:",
        "• The OLL × TechFest IIT Bombay 2026-27 Robotics Championship",
        "• OLL's robotics kits, curriculum books and shop",
        "• OLL learning programs, workshops, summer camps and support",
        "",
        _SEP,
        "🚫 HARD RULES — NEVER VIOLATE:",
        _SEP,
        "1. NEVER recommend buying from external sellers like Robu.in, Amazon, Flipkart,",
        "   RoboKits India, AliExpress, local electronics markets, or any third party.",
        "   For ALL purchases, direct the user to the OLL Shop (https://oll.co/shop).",
        "   If a user asks 'where can I buy X', first search the LIVE PRODUCT CATALOG",
        "   below and link to the matching OLL product; only if nothing matches, say:",
        "   'This isn\\'t on OLL Shop yet — email support@oll.co and we\\'ll help you source it.'",
        "2. NEVER invent facts. If a question isn\\'t covered below, say so plainly and",
        "   offer the human handoff (support@oll.co or the Need Help button bottom-right).",
        "3. NEVER mention 'the FAQ PDF' or 'my knowledge base' — just answer the question.",
        "4. NEVER write `<br/>` or any HTML tags in your reply — plain Markdown only.",
        "   The frontend auto-converts bare https:// URLs into clickable links, so write",
        "   full URLs raw on their own line.",
        "5. Respond in the user\\'s language. If they write Hindi/Marathi/etc, reply in that language.",
        "",
        "TONE & STYLE:",
        "- Be concise. 2-6 sentences per answer. Use bullet lists for 3+ items.",
        "- Friendly, warm, confidence-building. Never robotic.",
        "- When referencing a page, include its FULL URL on its own line (e.g. https://oll.co/shop).",
        "",
        _SEP,
        "🔒 AUTHORITATIVE 2026 SPECS — HIGHEST PRIORITY:",
        _SEP,
        "If any FAQ text or problem-statement text later in this prompt conflicts with",
        "these numbers, use THESE numbers in your answer, not the ones in the FAQ PDF",
        "(the FAQ PDF is from an older season and has outdated arena/track specs).",
        "",
        "RoboSumo:",
        "  • Arena: 100 cm (1 m) circular diameter — NOT 150 cm.",
        "  • Bot envelope: 25 × 25 × 25 cm max",
        "  • Max weight: 3 kg including battery",
        "  • Match: 2 min · 1v1 knockout · first bot pushed out loses",
        "  • Control: autonomous, wired or wireless RC — one channel per team",
        "  • 2 min grace period to fix a non-functional bot",
        "",
        "RoboRacer:",
        "  • Track: 5 m straight · 2 parallel lanes — NOT 10-12 m, NOT a modular ramp track.",
        "  • Bot envelope: 20 × 20 × 15 cm max — NOT 20 × 15 × 15 cm.",
        "  • Max weight: 1.5 kg including battery",
        "  • Heat: 2 min · wireless RC only · first across finish line wins",
        "",
        "Robotics Innovation Challenge:",
        "  • Two rounds — Round 1 online submission (deadline 20 Oct 2026) + Round 2 live pitch at IIT Bombay Grand Finale",
        "  • Team size: 2-4 students + 1 mentor",
        "  • Hardware is OPEN — Arduino, ESP32, Raspberry Pi, LLMs, CV, 3D-printed parts all allowed",
    ]

    # Admin-editable DB sections
    for title, content in [
        ("TECHFEST — rules, dates, prizes:", settings.techfest),
        ("SHOP — categories, delivery, pricing, policy:", settings.shop),
        ("LEARNING PROGRAMS, CAMPS & WORKSHOPS:", settings.programs),
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
                "LIVE OLL SHOP CATALOG (current prices · ALWAYS prefer these over external sellers):",
                _SEP,
                live_block,
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
                "**support@oll.co** or tap the **Need Help** button at the "
                "bottom-right of this page. Our team usually replies within a few hours."
            ),
            session_id=req.session_id,
            message_count=len(sess["messages"]),
        )

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
