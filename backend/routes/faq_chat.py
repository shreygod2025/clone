"""
FAQ Chatbot — /api/faq-chat
──────────────────────────
Powers the public AI chatbot at https://oll.co/faq.

Knowledge sources (all baked into the system prompt — no live retrieval):
  1. `data/techfest_faqs.txt`               — the 60+ Q&A rulebook from the vendor
  2. `data/techfest_problem_statement.txt`  — the official competition problem statement
  3. `OLL_CORE_FACTS` constant below        — pricing, dates, support contact, offerings

Modes:
  • Anonymous: answers general public questions (competition rules, kits, pricing).
    For "what's the status of my order?" it points them at /login.
  • Logged-in (JWT in Authorization header): the user's own open support tickets are
    pulled from `support_queries` and included in the system prompt so the bot can
    say "your ticket #ABC is in progress with Kirti, last reply 2 days ago". We NEVER
    expose anyone else's tickets.

Persistence:
  • Conversation state is in-memory (`_SESSIONS` dict). Lost on backend restart —
    acceptable for a public FAQ chatbot where users rarely come back mid-conversation.
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

router = APIRouter()

_JWT_SECRET = os.environ.get("JWT_SECRET", "")
_JWT_ALGO = "HS256"


def _decode_token(token: str) -> Optional[dict]:
    """Best-effort decode of the OLL JWT. Returns payload dict or None.
    Never raises — any decode error (expired, bad signature, malformed)
    is treated as "no auth", so the chatbot gracefully falls back to
    anonymous mode."""
    if not token or not _JWT_SECRET:
        return None
    try:
        return pyjwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGO])
    except Exception:
        return None

# ─── Load the two PDF-extracted knowledge files once at import time ─────────
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
try:
    FAQ_TEXT = (_DATA_DIR / "techfest_faqs.txt").read_text(encoding="utf-8")
except FileNotFoundError:
    FAQ_TEXT = ""
try:
    PROBLEM_STATEMENT_TEXT = (_DATA_DIR / "techfest_problem_statement.txt").read_text(encoding="utf-8")
except FileNotFoundError:
    PROBLEM_STATEMENT_TEXT = ""

# ─── Hand-curated OLL facts the bot MUST know even when FAQ doesn't cover ──
OLL_CORE_FACTS = """\
About OLL (On Learn Learn):
- OLL is India's leading school robotics, AI and future-skills partner. 400+ partner schools, students across Grades 1-10.
- Website: https://oll.co · Support: support@oll.co · WhatsApp: use the "Need Help" button bottom-right.
- Head office: Mumbai, India.

OLL Techfest IIT Bombay 2026-27 Robotics Championship:
- Three competition tracks: RoboSumo, RoboRacer, and the Robotics Innovation Challenge.
- Registration deadline: October 10, 2026.
- Round 1 submission deadline (Innovation Challenge): October 20, 2026.
- Regional qualifiers: East (IIT Kanpur, 24 Oct), South (RVU Bangalore, 26 Nov), West (IIT Bombay, 17 Dec).
- Grand Finale: December 16-18, 2026 at IIT Bombay.
- Participation is COMPLETELY FREE — no registration fee for any track.
- Prize pool: ₹1.5L across the top-3 teams per track.
- Register at https://oll.co/techfest/register.
- Full problem statement HTML: https://oll.co/techfest-iitbombay/problem-statement
- Per-track landing pages:
  * https://oll.co/techfest-iitbombay/robo-sumo-competition
  * https://oll.co/techfest-iitbombay/robo-race-competition
  * https://oll.co/techfest-iitbombay/robo-innovation-competition

AUTHORITATIVE 2026 SPECS (always use these numbers — if any FAQ text below conflicts, these win):
- RoboSumo arena: 100 cm (1 m) circular diameter · bot envelope 25 × 25 × 25 cm max · 3 kg max weight (incl. battery) · 2-minute matches · first bot pushed out loses.
- RoboRacer track: 5 m straight · 2 parallel lanes · bot envelope 20 × 20 × 15 cm max · 1.5 kg max weight (incl. battery) · 2-minute heats · wireless RC only.
- Robotics Innovation Challenge: 2 rounds (online submission + Grand Finale pitch at IIT Bombay) · teams of 2–4 students + 1 mentor · hardware is open (Arduino, ESP32, Raspberry Pi, LLMs, CV, 3D-printed parts).

OLL Shop (robotics kits & books):
- Shop URL: https://oll.co/shop
- Four categories:
  * Curriculum Books (14 titles for Grades 1-10)
  * Curriculum Robotic Kits (Grade 1-10 kits)
  * Competition & Advanced Kits — RoboSumo, RoboRacer, Drone, Aeromodel, 3D Pen
  * Individual Components — motors, sensors, Blox, wires, ESP32, AI Vision Blox
- Flat ₹150 delivery, pan-India shipping, Cashfree checkout.
- Official RoboSumo kit: https://oll.co/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a
- Official RoboRacer kit: https://oll.co/shop/product/robo-racer-kit-specially-made-for-iit-bombay-8bf545dc

Order & payment questions:
- Logged-in users can see their orders at https://oll.co/my-bookings
- Payment issues: email support@oll.co with the order id — resolved within 24h usually.

Support policy:
- Public FAQs are at https://oll.co/faq (this page).
- For personal account / order / payment issues, visitors should log in.
"""


def _build_system_prompt(user_tickets_block: Optional[str] = None) -> str:
    sections = [
        "You are OLLBot — the official AI assistant for OLL (On Learn Learn) at https://oll.co.",
        "You help parents, teachers, students and partner-school admins with questions about:",
        "• The OLL × TechFest IIT Bombay 2026-27 Robotics Championship (RoboSumo, RoboRacer, Innovation Challenge)",
        "• OLL's robotics kits, curriculum books and shop",
        "• General OLL offerings, pricing, delivery, support",
        "",
        "TONE & STYLE RULES:",
        "- Be concise. 2-6 sentences per answer. Use bullet lists for 3+ items.",
        "- Friendly, warm, confidence-building. Never robotic.",
        "- When referencing a page, include its FULL URL (e.g. https://oll.co/techfest/register) so users can click directly.",
        "- NEVER make up facts. If the answer is NOT in the context below, say so plainly and offer the human handoff (support@oll.co or the Need Help button).",
        "- NEVER mention 'the FAQ PDF' or 'my knowledge base' — just answer the question.",
        "- Respond in the user's language. If they write in Hindi/Marathi/etc, reply in that language.",
        "",
        "=" * 72,
        "OLL CORE FACTS (always true, highest priority):",
        "=" * 72,
        OLL_CORE_FACTS,
    ]
    if FAQ_TEXT:
        sections += [
            "",
            "=" * 72,
            "TECHFEST FAQ — 60+ Q&As on registration, rules, team formation, kits, judging, prizes:",
            "=" * 72,
            FAQ_TEXT,
        ]
    if PROBLEM_STATEMENT_TEXT:
        sections += [
            "",
            "=" * 72,
            "OFFICIAL PROBLEM STATEMENT (bot specs, arena rules, round-by-round progression):",
            "=" * 72,
            PROBLEM_STATEMENT_TEXT,
        ]
    if user_tickets_block:
        sections += [
            "",
            "=" * 72,
            "THIS USER'S OWN SUPPORT TICKETS (private — only share with THIS user):",
            "=" * 72,
            user_tickets_block,
        ]
    sections += [
        "",
        "=" * 72,
        "HANDOFF POLICY:",
        "=" * 72,
        "If a user's question cannot be answered from the facts above, respond with:",
        '  "I\'m not sure about that — the best next step is to email support@oll.co or tap the Need Help button at the bottom-right. Would you like me to raise a support ticket for you?"',
        "If they say yes, instruct them to click the Need Help button or email support@oll.co with their query (we cannot create a ticket for anonymous visitors from this chat).",
    ]
    return "\n".join(sections)


# ─── In-memory session store ─────────────────────────────────────────────────
_SESSIONS: dict[str, dict] = {}
_SESSION_TTL_SEC = 60 * 30  # 30 min idle timeout


def _get_session(session_id: str) -> dict:
    now = time.time()
    # Lazy GC of stale sessions on every lookup — cheap.
    for sid in list(_SESSIONS.keys()):
        if now - _SESSIONS[sid]["touched"] > _SESSION_TTL_SEC:
            _SESSIONS.pop(sid, None)
    sess = _SESSIONS.get(session_id)
    if not sess:
        sess = {"messages": [], "touched": now}
        _SESSIONS[session_id] = sess
    sess["touched"] = now
    return sess


# ─── Logged-in user tickets ────────────────────────────────────────────────
async def _fetch_user_tickets_block(authorization: Optional[str]) -> Optional[str]:
    """Return a markdown summary of the authenticated user's open/recent
    support tickets, or None if the user isn't logged in."""
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

    # Collect up to the 10 most-recent tickets by this user.
    query_filter = {"$or": []}
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


# ─── Request / Response models ──────────────────────────────────────────────
class FaqChatRequest(BaseModel):
    session_id: str = Field(..., min_length=4, max_length=64)
    message: str = Field(..., min_length=1, max_length=2000)


class FaqChatReply(BaseModel):
    reply: str
    session_id: str
    message_count: int


# ─── Suggestion chips ───────────────────────────────────────────────────────
SUGGESTIONS = [
    "How do I register my school for Techfest 2026?",
    "What are the eligibility criteria for RoboSumo?",
    "How much does the RoboRacer kit cost?",
    "What is the Robotics Innovation Challenge about?",
    "When is the Grand Finale at IIT Bombay?",
    "What's included in the OLL curriculum kits?",
    "How do I track my OLL shop order?",
    "What's the prize money for winners?",
]


@router.get("/faq-chat/suggestions")
async def faq_chat_suggestions():
    return {"suggestions": SUGGESTIONS}


@router.post("/faq-chat", response_model=FaqChatReply)
async def faq_chat(req: FaqChatRequest, request: Request):
    from emergentintegrations.llm.chat import LlmChat, UserMessage  # local import — library pre-installed

    sess = _get_session(req.session_id)
    user_tickets_block = await _fetch_user_tickets_block(request.headers.get("authorization"))
    system = _build_system_prompt(user_tickets_block=user_tickets_block)

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        raise HTTPException(status_code=503, detail="LLM is temporarily unavailable")

    # Pass prior conversation turns so the bot has context.
    initial_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in sess["messages"][-20:]
    ] or None

    chat = LlmChat(
        api_key=llm_key,
        session_id=req.session_id,
        system_message=system,
        initial_messages=initial_messages,
    ).with_model("openai", "gpt-5.6-terra")

    try:
        reply = await chat.send_message(UserMessage(text=req.message))
    except Exception as e:
        # Fail soft — the chat UI should still show something useful.
        return FaqChatReply(
            reply=(
                "I ran into a technical hiccup. For a quick answer, email "
                "**support@oll.co** or tap the **Need Help** button at the "
                "bottom-right of this page. Our team usually replies within a few hours."
            ),
            session_id=req.session_id,
            message_count=len(sess["messages"]),
        )

    # Append both turns to the session so follow-up questions keep context.
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
    """When the user says 'the bot didn't help', write a support_queries row
    (requires at least name + email + the conversation transcript)."""
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
