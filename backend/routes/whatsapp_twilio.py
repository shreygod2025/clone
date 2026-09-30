"""
Twilio WhatsApp webhook — routes inbound WhatsApp messages to the same
AI-Chat engine that powers /admin/ai-chat, and replies over WhatsApp.

Setup (once):
    1. Sign in at https://console.twilio.com → Messaging → "Try it out" →
       "Send a WhatsApp message" → note your **sandbox join code**
       (e.g. ``join spring-tiger``).
    2. From the number in ``WHATSAPP_ALLOWED_NUMBERS`` in .env, send that
       exact ``join …`` text to **+1 415 523 8886** (Twilio's sandbox
       number).
    3. In the sandbox console, set the "When a message comes in" webhook to:
           <PROD_ORIGIN>/api/whatsapp/twilio/webhook
       Method: HTTP POST.
    4. Message the sandbox number. You'll get an AI reply that has already
       executed any CRM actions (create lead, generate invoice, …).

Security:
    * Signature: every request is verified against ``TWILIO_AUTH_TOKEN``
      using Twilio's ``RequestValidator``. Unsigned or replayed calls are
      rejected with 403.
    * Allow-list: only numbers listed in ``WHATSAPP_ALLOWED_NUMBERS``
      (comma-separated, E.164) can hit the bot.
    * Auth impersonation: the AI action-executor runs as
      ``WHATSAPP_ADMIN_USER_EMAIL`` (default ``admin@oll.co``). Keep this
      account restricted-permission if you fan the bot out to more people.
"""
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse

from .shared import db
from .ai_chat import run_ai_chat_turn

logger = logging.getLogger(__name__)

router = APIRouter()

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.environ.get(
    "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886",
)
ADMIN_USER_EMAIL = os.environ.get(
    "WHATSAPP_ADMIN_USER_EMAIL", "admin@oll.co",
).lower()
ALLOWED = {
    n.strip()
    for n in os.environ.get("WHATSAPP_ALLOWED_NUMBERS", "").split(",")
    if n.strip()
}

# Twilio caps a single WhatsApp message at 1600 characters. Split longer
# replies into segments so nothing gets silently truncated.
TWILIO_WA_MAX = 1500


def _twiml(*messages: str) -> Response:
    """Build a TwiML <Response> with 0..N <Message> bodies."""
    resp = MessagingResponse()
    for m in messages:
        resp.message(m)
    return Response(content=str(resp), media_type="application/xml")


def _split(text: str, limit: int = TWILIO_WA_MAX) -> list[str]:
    """Split *text* into <=limit-char chunks on paragraph boundaries."""
    if len(text) <= limit:
        return [text]
    out: list[str] = []
    buf = ""
    for para in text.split("\n\n"):
        candidate = f"{buf}\n\n{para}".strip() if buf else para
        if len(candidate) > limit:
            if buf:
                out.append(buf)
            # Paragraph itself too long — hard-wrap.
            while len(para) > limit:
                out.append(para[:limit])
                para = para[limit:]
            buf = para
        else:
            buf = candidate
    if buf:
        out.append(buf)
    return out


async def _resolve_user_for(phone_e164: str) -> Optional[dict]:
    """Look up the OLL user that should back this WhatsApp session.

    Preference order:
      1. Team user whose ``phone`` matches the incoming E.164 number.
      2. Team user with the configured ``ADMIN_USER_EMAIL``.
      3. Legacy ``users`` collection with the same email.
      4. Synthesised admin record as a last resort.

    Whichever record we return MUST have an ``id`` field — the AI action
    executor and the sessions listing both key off it, and we want the same
    ``user_id`` on the AI-chat sessions as an admin logging into the web
    UI so those WhatsApp turns show up in the sidebar.
    """
    digits = "".join(c for c in phone_e164 if c.isdigit())
    if digits:
        last10 = digits[-10:]
        team_user = await db.team_users.find_one(
            {"phone": {"$regex": f"{last10}$"}}, {"_id": 0},
        )
        if team_user and team_user.get("id"):
            return team_user

    # Admin fallback — check team_users FIRST (that's where admin@oll.co
    # actually lives in this codebase), then users.
    for coll in ("team_users", "users"):
        u = await db[coll].find_one({"email": ADMIN_USER_EMAIL}, {"_id": 0})
        if u and u.get("id"):
            return u

    # Absolute last resort — synthesise a lightweight admin identity so
    # the action-executor still has a stable `id` / `email` / `role`.
    return {"id": "whatsapp-admin", "email": ADMIN_USER_EMAIL, "role": "admin"}


@router.post("/whatsapp/twilio/webhook", include_in_schema=False)
async def twilio_whatsapp_webhook(request: Request):
    # ── 1. Signature verification ────────────────────────────────────
    if not TWILIO_AUTH_TOKEN:
        raise HTTPException(status_code=503, detail="Twilio not configured")

    validator = RequestValidator(TWILIO_AUTH_TOKEN)
    form = dict(await request.form())
    # Twilio validates against the FULL public URL that IT posted to. In a
    # k8s ingress + preview-domain setup, ``request.url`` gives us the
    # rewritten internal hostname — we must rebuild the URL from the
    # ``X-Forwarded-*`` headers to match Twilio's original target.
    fwd_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    fwd_host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
    )
    path_q = request.url.path + (f"?{request.url.query}" if request.url.query else "")
    url = f"{fwd_proto}://{fwd_host}{path_q}"

    signature = request.headers.get("X-Twilio-Signature", "")
    is_valid = validator.validate(url, form, signature)
    if not is_valid:
        logger.warning(
            "[whatsapp] Bad Twilio signature — url=%s sig=%s form_keys=%s",
            url, signature[:12], list(form.keys()),
        )
        raise HTTPException(status_code=403, detail="Bad signature")

    # ── 2. Parse & allow-list ────────────────────────────────────────
    from_number = (form.get("From") or "").replace("whatsapp:", "").strip()
    body = (form.get("Body") or "").strip()
    if not from_number or not body:
        return _twiml()  # silently ack

    if ALLOWED and from_number not in ALLOWED:
        logger.info("[whatsapp] Blocked non-allow-listed number %s", from_number)
        return _twiml(
            "Sorry — this WhatsApp assistant is in private beta and this "
            "number isn't allow-listed yet.",
        )

    # ── 3. Session lookup (one thread per phone) ─────────────────────
    thread = await db.whatsapp_threads.find_one({"phone": from_number}) or {}
    session_id = thread.get("session_id") or f"wa-{from_number}"
    user = await _resolve_user_for(from_number)
    if not user:
        return _twiml(
            "Could not resolve a matching OLL user for this WhatsApp number. "
            "Ask an admin to set WHATSAPP_ADMIN_USER_EMAIL.",
        )

    # Simple reset commands so users can start over without an admin.
    if body.lower() in {"/reset", "reset", "clear", "new chat"}:
        await db.whatsapp_threads.update_one(
            {"phone": from_number},
            {"$set": {"session_id": f"wa-{from_number}-{os.urandom(3).hex()}"}},
            upsert=True,
        )
        return _twiml("New chat started. Ask me anything about the CRM 🙂")

    # ── 4. Run the AI turn ───────────────────────────────────────────
    try:
        result = await run_ai_chat_turn(
            session_id=session_id,
            user_text=body,
            user=user,
        )
    except Exception as e:  # never blow up the Twilio callback
        logger.exception("[whatsapp] AI turn failed")
        return _twiml(f"⚠️ Sorry, something went wrong: {e}")

    # Persist thread so the same session_id sticks across messages.
    await db.whatsapp_threads.update_one(
        {"phone": from_number},
        {"$set": {
            "phone": from_number,
            "session_id": result.get("session_id") or session_id,
            "user_email": user.get("email"),
        }},
        upsert=True,
    )

    reply_text = (result.get("message") or "").strip() or "…"
    # Append a compact list of any CRM actions executed on this turn so the
    # user sees confirmation in WhatsApp. For actions that produce a PDF in
    # the admin UI (proposal / MOU / invoice), also drop a deep-link so the
    # user can open the CRM and download it — server-side PDF rendering
    # for WhatsApp is a bigger piece of work, tracked as future scope.
    actions = result.get("actions") or []
    pdf_links: list[str] = []
    ADMIN_ORIGIN = "https://oll.co"
    if actions:
        lines = []
        for a in actions:
            exec_res = a.get("execution") or {}
            status = exec_res.get("status") or "?"
            success = status in ("success", "frontend_action")
            icon = "✅" if success else "⚠️"
            label = a.get("type", "action").replace("_", " ")
            name = a.get("school_name") or exec_res.get("message") or ""
            lines.append(f"{icon} {label}{' — ' + name if name else ''}")

            # Deep-link to the school for PDF-emitting actions.
            if a.get("type") in {"generate_proposal", "generate_mou", "generate_invoice"}:
                sid = exec_res.get("school_id") or a.get("school_id")
                if sid:
                    pdf_links.append(
                        f"📄 Open the CRM to download the {label} PDF:\n"
                        f"{ADMIN_ORIGIN}/admin/school-crm?school={sid}"
                    )
        reply_text = f"{reply_text}\n\n" + "\n".join(lines)
        if pdf_links:
            reply_text += "\n\n" + "\n\n".join(pdf_links)

    return _twiml(*_split(reply_text))


@router.get("/whatsapp/twilio/health", include_in_schema=False)
async def whatsapp_health():
    """Quick check that the webhook is wired & env vars are present."""
    return {
        "configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN),
        "from": TWILIO_WHATSAPP_FROM,
        "allowed_numbers_count": len(ALLOWED),
        "admin_user": ADMIN_USER_EMAIL,
    }
