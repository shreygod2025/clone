"""
Gmail OAuth + Inbox Bot.

Endpoints under /api/gmail/*:
  - GET  /gmail/auth-url               — start OAuth flow (returns redirect URL)
  - GET  /oauth/gmail/callback         — Google OAuth callback (saves account)
  - GET  /gmail/accounts               — list connected Gmail accounts
  - DELETE /gmail/accounts/{acc_id}    — disconnect an account
  - POST /gmail/sync-now               — manual sync trigger (for admin testing)
  - POST /gmail/sync-now/{acc_id}      — sync a single account

The hourly scheduler in server.py calls `sync_all_gmail_accounts()`.

A connected account's flow:
  1. APScheduler hits `sync_all_gmail_accounts()` every hour.
  2. For each Gmail account, list unread INBOX messages.
  3. For each message, run AI classification (Emergent LLM) to decide if it's a
     real customer query (skip OTPs/promotions/payment receipts/no-reply).
  4. If it IS a query → create a support_queries ticket, auto-link customer
     via email/phone match across booking + payment collections.
  5. Mark the Gmail message as read so we don't re-process it next hour.
"""
import os
import re
import uuid
import json
import base64
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File
from fastapi.responses import RedirectResponse, StreamingResponse

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .shared import db, get_current_user, get_next_ticket_number

# GridFS bucket for support email attachments. Lazily initialised so test
# environments without a Mongo client at import-time still load this module.
try:
    from motor.motor_asyncio import AsyncIOMotorGridFSBucket
    _ATTACHMENT_BUCKET = AsyncIOMotorGridFSBucket(db, bucket_name="support_attachments")
except Exception:
    _ATTACHMENT_BUCKET = None

MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024   # 10 MB per file
MAX_TOTAL_ATTACHMENT_BYTES = 24 * 1024 * 1024  # Gmail send caps near 25 MB

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Config ─────────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
BACKEND_PUBLIC_URL = os.environ.get("BACKEND_PUBLIC_URL", "")
REDIRECT_URI = f"{BACKEND_PUBLIC_URL}/api/oauth/gmail/callback"  # fallback only

# Origins that may legitimately host the OAuth flow. Used to validate the
# request's Origin/Referer header and prevent open-redirect-style abuse.
# Both must be registered as Authorized Redirect URIs in Google Cloud Console.
ALLOWED_OAUTH_ORIGINS = {
    "https://oll.co",
    "https://www.oll.co",
    "https://camp-lead-capture.preview.emergentagent.com",
}


def _resolve_origin(request) -> str:
    """Pick the public origin (scheme://host) this OAuth flow should redirect to.

    The Kubernetes ingress in this environment REWRITES the Origin header to an
    internal cluster hostname (e.g. `camp-lead-capture.cluster-5...emergentcf.cloud`),
    so we can't trust Origin alone. The Referer header survives the proxy
    intact, so we collect candidates from BOTH and return whichever one matches
    our explicit allowlist (oll.co / preview). This way:
      - Flow started on https://oll.co → comes back to https://oll.co
      - Flow started on preview → comes back to preview
    """
    from urllib.parse import urlparse
    candidates = []
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin:
        candidates.append(origin)
    ref = request.headers.get("referer", "")
    if ref:
        p = urlparse(ref)
        if p.scheme and p.netloc:
            candidates.append(f"{p.scheme}://{p.netloc}")
    for c in candidates:
        if c in ALLOWED_OAUTH_ORIGINS:
            return c
    # Env fallback (used by curl/tests/CI where there's no browser Origin).
    if BACKEND_PUBLIC_URL.rstrip("/") in ALLOWED_OAUTH_ORIGINS:
        return BACKEND_PUBLIC_URL.rstrip("/")
    # Hardcoded safety net: prefer production when nothing else matches.
    return "https://oll.co"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]

# Allow http transport during OAuth dance (preview env may proxy through http internally)
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
# Permit slight scope drift — Google sometimes adds/reorders default scopes
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"


def _client_config():
    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }


# ── OAuth endpoints ────────────────────────────────────────────────────────
@router.get("/gmail/auth-url")
async def gmail_auth_url(request: Request, user: dict = Depends(get_current_user)):
    """Generate Google OAuth consent URL. Admin clicks → Google consent → callback.

    The redirect URI is resolved DYNAMICALLY from the request's Origin header so
    that flows started on https://oll.co come back to https://oll.co, and flows
    started on the preview env come back to the preview env. The chosen
    redirect_uri is persisted on the state doc and replayed on the callback so
    Google's token-exchange validation passes.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(500, "Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env")

    origin = _resolve_origin(request)
    redirect_uri = f"{origin}/api/oauth/gmail/callback"

    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, redirect_uri=redirect_uri)
    url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",       # forces Google to return refresh_token every time
        include_granted_scopes="true",
    )

    # Persist state + PKCE code_verifier + the dynamic redirect_uri so callback
    # can verify all three. 10-min TTL.
    await db.oauth_states.insert_one({
        "state": state,
        "code_verifier": getattr(flow, "code_verifier", None),
        "redirect_uri": redirect_uri,
        "origin": origin,
        "admin_email": user.get("email"),
        "purpose": "gmail",
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": url}


@router.get("/oauth/gmail/callback")
async def gmail_oauth_callback(code: str = Query(...), state: str = Query(...), error: Optional[str] = Query(None)):
    """Google redirects here after consent. Exchange code → tokens → save account.

    The state doc holds the redirect_uri that was registered with Google for this
    flow — we must use that EXACT value (not BACKEND_PUBLIC_URL) when calling
    fetch_token, or Google returns invalid_grant.
    """
    # Validate state first so we know where to redirect the admin back to even on error
    state_doc = await db.oauth_states.find_one({"state": state, "purpose": "gmail"})
    fallback_origin = (state_doc or {}).get("origin") or "https://oll.co"

    if error:
        return RedirectResponse(url=f"{fallback_origin}/admin/settings?gmail_error={error}", status_code=302)

    if not state_doc:
        raise HTTPException(400, "Invalid or expired OAuth state")
    expires_at = datetime.fromisoformat(state_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(400, "OAuth state expired — please retry")

    redirect_uri = state_doc.get("redirect_uri") or f"{fallback_origin}/api/oauth/gmail/callback"

    # Exchange code for credentials
    try:
        flow = Flow.from_client_config(_client_config(), scopes=SCOPES, redirect_uri=redirect_uri, state=state)
        # Replay the PKCE code_verifier captured during /gmail/auth-url so Google's
        # token endpoint can validate it against the original code_challenge.
        code_verifier = state_doc.get("code_verifier")
        if code_verifier:
            flow.code_verifier = code_verifier
        flow.fetch_token(code=code)
    except Exception as e:
        logger.exception("Gmail OAuth code exchange failed")
        return RedirectResponse(url=f"{fallback_origin}/admin/settings?gmail_error={str(e)[:120]}", status_code=302)

    creds = flow.credentials

    # Pull user email via Gmail profile
    try:
        gmail = build("gmail", "v1", credentials=creds, cache_discovery=False)
        profile = gmail.users().getProfile(userId="me").execute()
        email_address = profile.get("emailAddress", "").lower()
    except Exception:
        logger.exception("Failed to fetch Gmail profile after OAuth")
        return RedirectResponse(url=f"{fallback_origin}/admin/settings?gmail_error=profile_fetch_failed", status_code=302)

    if not email_address:
        return RedirectResponse(url=f"{fallback_origin}/admin/settings?gmail_error=no_email_in_token", status_code=302)

    # Upsert the connected account
    expiry_iso = creds.expiry.replace(tzinfo=timezone.utc).isoformat() if creds.expiry else None
    doc = {
        "id": str(uuid.uuid4()),
        "email": email_address,
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,  # may be None on re-consent — see logic below
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes) if creds.scopes else SCOPES,
        "expires_at": expiry_iso,
        "connected_by": state_doc.get("admin_email"),
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
        "last_sync_at": None,
        "last_sync_count": 0,
        "last_sync_error": None,
    }
    existing = await db.gmail_accounts.find_one({"email": email_address})
    if existing:
        # Preserve refresh token if Google omitted it on this consent (happens when scopes unchanged)
        if not doc["refresh_token"]:
            doc["refresh_token"] = existing.get("refresh_token")
        doc["id"] = existing["id"]
        doc["connected_at"] = existing.get("connected_at", doc["connected_at"])
        await db.gmail_accounts.update_one({"email": email_address}, {"$set": doc})
    else:
        await db.gmail_accounts.insert_one(doc)

    await db.oauth_states.delete_one({"state": state})

    # Send admin back to the settings page on the SAME origin they started from
    # (oll.co → oll.co, preview → preview), not the env-var-defined one.
    return RedirectResponse(url=f"{fallback_origin}/admin/settings?gmail_connected={email_address}", status_code=302)


@router.get("/gmail/accounts")
async def list_gmail_accounts(user: dict = Depends(get_current_user)):
    """Return all connected Gmail accounts (sans tokens)."""
    accts = await db.gmail_accounts.find({}, {
        "_id": 0, "access_token": 0, "refresh_token": 0, "client_secret": 0,
    }).to_list(50)
    return accts


@router.delete("/gmail/accounts/{acc_id}")
async def disconnect_gmail(acc_id: str, user: dict = Depends(get_current_user)):
    res = await db.gmail_accounts.delete_one({"id": acc_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Account not found")
    return {"message": "Disconnected"}


# ── Credential refresh helper ──────────────────────────────────────────────
def _creds_from_doc(doc: dict) -> Credentials:
    """Build a google.oauth2.credentials.Credentials from a stored doc; refresh if expired."""
    creds = Credentials(
        token=doc.get("access_token"),
        refresh_token=doc.get("refresh_token"),
        token_uri=doc.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=doc.get("client_id", GOOGLE_CLIENT_ID),
        client_secret=doc.get("client_secret", GOOGLE_CLIENT_SECRET),
        scopes=doc.get("scopes", SCOPES),
    )
    # Check expiry (stored as ISO string with tz)
    expires_at = doc.get("expires_at")
    expired = False
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(expires_at)
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            expired = datetime.now(timezone.utc) >= exp_dt - timedelta(seconds=60)
        except Exception:
            expired = True
    else:
        expired = True

    if expired and creds.refresh_token:
        creds.refresh(GoogleAuthRequest())
    return creds


async def _persist_refreshed_token(email: str, creds: Credentials):
    """Save the refreshed access token + new expiry back to the doc."""
    expiry_iso = creds.expiry.replace(tzinfo=timezone.utc).isoformat() if creds.expiry else None
    await db.gmail_accounts.update_one(
        {"email": email},
        {"$set": {"access_token": creds.token, "expires_at": expiry_iso}},
    )


# ── Inbox parsing ──────────────────────────────────────────────────────────
def _decode_body(part) -> str:
    """Decode a Gmail message part body (base64url) to text."""
    data = (part.get("body") or {}).get("data")
    if not data:
        return ""
    try:
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    except Exception:
        return ""


def _extract_body(payload: dict) -> str:
    """Extract the plain-text body from a Gmail message payload (recurse into parts)."""
    if not payload:
        return ""
    mime = payload.get("mimeType", "")
    if mime == "text/plain":
        return _decode_body(payload)
    # Multipart: prefer text/plain part, fall back to text/html, recursively
    parts = payload.get("parts") or []
    plain = ""
    html = ""
    for p in parts:
        nested = _extract_body(p)
        if not nested:
            continue
        if p.get("mimeType") == "text/plain":
            plain = plain or nested
        elif p.get("mimeType") == "text/html":
            html = html or nested
        else:
            plain = plain or nested
    if plain:
        return plain
    if html:
        # Strip HTML tags as a fallback
        return re.sub(r"<[^>]+>", " ", html)
    return ""


def _hdr(headers: List[dict], name: str) -> str:
    name_l = name.lower()
    for h in headers or []:
        if h.get("name", "").lower() == name_l:
            return h.get("value", "")
    return ""


def _extract_email_address(from_header: str) -> str:
    """'Foo Bar <foo@bar.com>' → 'foo@bar.com'."""
    m = re.search(r"<([^>]+)>", from_header or "")
    if m:
        return m.group(1).strip().lower()
    return (from_header or "").strip().lower()


def _extract_name(from_header: str) -> str:
    """'Foo Bar <foo@bar.com>' → 'Foo Bar'. Strips surrounding quotes."""
    m = re.match(r'\s*"?([^"<]+?)"?\s*<', from_header or "")
    if m:
        return m.group(1).strip()
    # Fall back to local-part of email address
    addr = _extract_email_address(from_header)
    return addr.split("@", 1)[0] if "@" in addr else (from_header or "").strip()


def _build_gmail_url(account_email: str, thread_id: str) -> str:
    """Build a Gmail deep-link to a specific thread for a specific account.

    Gmail web URLs look like `https://mail.google.com/mail/u/0/#inbox/<thread>`
    where the `0` is the account-chooser index. Since we don't always know the
    index (varies per user / multi-login), we pass `authuser=<email>` instead —
    Gmail will resolve the correct account from the URL-encoded email. The
    thread_id is what the API returns and matches the Gmail web URL fragment.
    """
    from urllib.parse import quote
    if not thread_id:
        return f"https://mail.google.com/mail/?authuser={quote(account_email)}"
    return f"https://mail.google.com/mail/?authuser={quote(account_email)}#inbox/{thread_id}"


def _build_reply_message(
    to_email: str, to_name: str, subject: str, body_text: str,
    in_reply_to_msg_id: Optional[str] = None, references: Optional[str] = None,
    from_email: Optional[str] = None,
    attachments: Optional[List[dict]] = None,  # [{filename, content_type, data: bytes}, ...]
) -> dict:
    """Build a Gmail API `users.messages.send` body that threads correctly.

    The `In-Reply-To` and `References` headers (both holding the original
    RFC-822 Message-ID) plus the `threadId` in the request body are what make
    Gmail show our reply inside the same conversation as the customer's email.
    When attachments are passed, the message is built as a multipart/mixed.
    """
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.mime.base import MIMEBase
    from email import encoders
    from email.utils import formataddr

    if attachments:
        msg = MIMEMultipart()
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        for att in attachments:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(att.get("data") or b"")
            encoders.encode_base64(part)
            fname = att.get("filename") or "attachment"
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{fname}"',
            )
            if att.get("content_type"):
                part.replace_header("Content-Type", att["content_type"])
            msg.attach(part)
    else:
        msg = MIMEText(body_text, "plain", "utf-8")

    msg["To"] = formataddr((to_name or "", to_email))
    if from_email:
        msg["From"] = formataddr(("OLL Support", from_email))
    # Always reply with "Re: " prefix unless caller already added it
    subj = subject or ""
    if not subj.lower().startswith("re:"):
        subj = f"Re: {subj}"
    msg["Subject"] = subj
    if in_reply_to_msg_id:
        msg["In-Reply-To"] = in_reply_to_msg_id
        msg["References"] = references or in_reply_to_msg_id

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return {"raw": raw}


async def _send_gmail_reply(
    account_email: str,
    to_email: str,
    to_name: str,
    subject: str,
    body_text: str,
    thread_id: Optional[str],
    in_reply_to_msg_id: Optional[str],
    references: Optional[str],
    attachments: Optional[List[dict]] = None,
) -> dict:
    """Send a reply through a specific connected Gmail account. Threads correctly.

    Returns the Gmail API response dict (contains `id`, `threadId`, `labelIds`).
    Raises HTTPException if the account isn't connected or the send fails.
    """
    acc_doc = await db.gmail_accounts.find_one({"email": account_email.lower()})
    if not acc_doc:
        raise HTTPException(404, f"Gmail account {account_email} not connected")
    try:
        creds = _creds_from_doc(acc_doc)
        await _persist_refreshed_token(account_email, creds)
        gmail = build("gmail", "v1", credentials=creds, cache_discovery=False)
    except Exception as e:
        raise HTTPException(500, f"Gmail auth failed: {e}")

    msg_body = _build_reply_message(
        to_email=to_email, to_name=to_name, subject=subject, body_text=body_text,
        in_reply_to_msg_id=in_reply_to_msg_id, references=references, from_email=account_email,
        attachments=attachments,
    )
    if thread_id:
        msg_body["threadId"] = thread_id
    try:
        sent = gmail.users().messages().send(userId="me", body=msg_body).execute()
    except HttpError as e:
        raise HTTPException(500, f"Gmail send failed: {e}")
    return sent


# ── AI auto-acknowledgment generator ──────────────────────────────────────
AI_ACK_PROMPT = """\
You are writing a brief acknowledgment email on behalf of OLL Support — an EdTech
company in India that offers Robotics, AI, Coding, Entrepreneurship and Financial
Literacy classes for kids 4-16, plus in-school programs, summer camps and one-off
workshops. OLL also has a robotics-kit storefront at https://oll.co/shop where
customers can buy individual components.

You are NOT solving the customer's problem. You are simply acknowledging that we
received their email and a real team member will follow up within 48 hours.

Write a calm, professional reply in 4-6 short sentences that:
  1. Greets the customer by first name on its own line.
  2. References ONE specific thing from their message in one sentence (paraphrase
     the actual concern — do NOT just say "regarding your query"). If the email
     is generic, simply acknowledge their query was received.
  3. Confirms a Support Ticket has been opened (insert the ticket number).
  4. Promises a team member will personally respond within 48 hours.
  5. Gently notes: if it's urgent, replying to this email will fast-track it.
  6. Closes with "Warm regards," on its own line and "OLL Support Team" on the next.

ONE EXTRA RULE — ROBOTICS SHOP CTA:
  If — and ONLY if — the customer's message clearly mentions losing/missing kit
  components, buying spares, replacing damaged parts, or purchasing additional
  components, you MAY add ONE extra line between point 4 and point 5 saying:
  "In the meantime, you can also browse and order replacement components from
  our Robotics Shop: https://oll.co/shop". Do not add this line for any other
  topic (refunds, scheduling, demos, login issues, payments, etc.).

ABSOLUTE RULES:
  · Do NOT make any commitment about a solution, refund, schedule, price, demo
    booking, or callback time. Do NOT promise anything beyond "team will get back".
  · Do NOT use marketing words ("excited", "thrilled", "delighted", "awesome",
    "amazing", etc.). Keep it warm but professional.
  · Do NOT include emoji, signatures with phone numbers, or product pitches.
  · Do NOT include the original quoted email or any "On <date> wrote:" prefix.
  · Output ONLY the plain-text email body — no subject line, no markdown, no
    code fences, no preamble or "Here is the reply:".
"""


async def _ai_generate_ack(
    *, first_name: str, ticket_number: int, subject: str, body: str
) -> Optional[str]:
    """Generate a personalised acknowledgment email body using Emergent LLM.
    Returns the body string on success, or None to let the caller fall back to
    the static template."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        return None
    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        return None

    body_trim = (body or "")[:2500]
    text = (
        f"Customer first name: {first_name}\n"
        f"Ticket number: #{ticket_number}\n"
        f"Email subject: {subject or '(no subject)'}\n"
        f"---\n{body_trim}\n"
    )
    chat = LlmChat(
        api_key=llm_key,
        session_id=f"gmail-ack-{uuid.uuid4().hex[:8]}",
        system_message=AI_ACK_PROMPT,
    ).with_model("openai", "gpt-4o-mini")
    try:
        raw = (await chat.send_message(UserMessage(text=text)) or "").strip()
    except Exception:
        logger.exception("AI ack generation failed — falling back to static template")
        return None
    if not raw:
        return None
    # Strip accidental code fences
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
        raw = re.sub(r"\n?```\s*$", "", raw).strip()
    # Guard rails: must contain the ticket number, must be reasonable length
    if str(ticket_number) not in raw or len(raw) < 80 or len(raw) > 2500:
        return None
    return raw


def _static_ack(first_name: str, ticket_number: int) -> str:
    return (
        f"Hi {first_name},\n\n"
        f"Thank you for reaching out to OLL. We have received your query and "
        f"created Support Ticket #{ticket_number} to track it.\n\n"
        f"A member of our team will get back to you within 48 hours. If your "
        f"matter is urgent, please reply to this email and we'll prioritise it.\n\n"
        f"Warm regards,\n"
        f"OLL Support Team"
    )


# ── AI classification ──────────────────────────────────────────────────────
CLASSIFIER_PROMPT = """\
You are a support-mail triage classifier for OLL (an EdTech company in India that runs
Robotics / AI / Coding / Entrepreneurship / Financial-Literacy classes for kids 4-16,
plus in-school programs, summer camps, and one-off workshops).

Decide whether an email is a genuine customer/lead enquiry that needs a human reply,
and route it into the support panel's existing taxonomy.

Return ONLY valid JSON (no prose, no markdown fences):
{
  "is_query": true|false,
  "inquiry_type": "student" | "school" | "educator" | "growth_partner" | "general",
  "query_type": "demo_related" | "payment" | "course_info" | "ongoing_classes" | "technical" | "kit_related" | "partnership" | "feedback" | "educator_query" | "admission" | "scheduling" | "other",
  "related_to": "<sub-category slug>",
  "priority": "high" | "normal" | "low",
  "subject_summary": "≤80-char distilled subject"
}

# is_query — set FALSE for:
  - Automated notifications (OTPs, password resets, calendar invites, Google Drive shares)
  - Payment-gateway / messaging-vendor receipts (Cashfree, Stripe, Razorpay, Resend, AiSensy, Twilio)
  - Marketing emails, newsletters, no-reply senders, cold sales pitches, vendor invoices
  - Bounce / undeliverable / mailer-daemon notifications
  - Outgoing emails sent BY OLL team
  - Spam / phishing
  - **College / university sponsorship & event-collaboration outreach** — emails
    from student bodies, fest organisers, IIT / IIM / college clubs, MUNs,
    hackathons, techfests, cultural fests, e-summits, e-cells,
    entrepreneurship cells, incubators or college societies asking OLL to:
      * sponsor their event / fest / summit / hackathon / MUN / conference
      * partner / collaborate on a college event
      * provide gift hampers, vouchers, swag, prizes, or branding slots
      * speak at / mentor / judge a college event
      * be a media / outreach / community partner
      * post about their event on OLL's social channels
    Set is_query = FALSE for ALL such cold-outreach emails, even if polite
    and well-written. These are NOT customer support queries.
  - Generic B2B partnership / business-development cold emails from agencies,
    SaaS vendors, lead-gen companies, design studios, dev shops, recruiters
    pitching candidates, etc.
  - Conference / webinar / event invitations addressed to OLL leadership.

Set is_query = true ONLY when a real person is sending a question, complaint,
booking enquiry, refund/payment issue, scheduling change, or any other concern
AND they appear to be a parent / student / school principal-coordinator /
current educator / growth partner — i.e. someone with an existing or potential
paid relationship with OLL. Cold-outreach pitches do NOT qualify.

# inquiry_type (WHO is writing) — pick the best fit:
  - "student"        → a parent asking about THEIR child's class / demo / kit / payment, or a teen learner themselves
  - "school"         → a principal / coordinator / school admin asking about labs, MoU, curriculum, in-school program
  - "educator"       → someone applying to TEACH at OLL, asking about training, schedule, or stipend
  - "growth_partner" → someone interested in becoming a franchise / centre / referral partner
  - "general"        → media, careers (non-teaching), CSR, sponsorship, business partnerships — anything else

# query_type → MUST be one of the exact values listed above. Choose the closest fit:
  - demo_related       → demo booking / reschedule / no-show
  - payment            → payment receipts, failed payments, refund requests, invoices, discounts
  - course_info        → curriculum questions, eligibility, pricing, certification
  - ongoing_classes    → currently-enrolled student issues: missed class, teacher issue, reschedule, progress
  - technical          → login bug, app issue, video/audio, payment-gateway error
  - kit_related        → robotics kit components missing/damaged/delayed
  - partnership        → school MoU, centre/franchise enquiry, bulk enrolment, sponsorship
  - feedback           → thank-you / praise / complaint about quality
  - educator_query     → teacher application status, training, payment, scheduling
  - admission          → "how do I enrol my child", document submission, seats
  - scheduling         → batch timing, slot availability, preferred timing
  - other              → genuine queries that fit none of the above

# related_to slug — one of these MUST match the chosen query_type:
  demo_related:    demo_booking | demo_reschedule | demo_cancellation | demo_feedback | demo_no_show | other
  payment:         payment_pending | payment_failed | refund_request | invoice_request | payment_plan | discount_query | other
  course_info:     course_content | course_duration | course_pricing | course_eligibility | course_certification | batch_timing | other
  ongoing_classes: class_reschedule | class_missed | teacher_issue | class_quality | progress_report | batch_change | other
  technical:       login_issue | app_bug | video_issue | payment_gateway | notification_issue | other
  kit_related:     components_missing | delivery_delay | component_damaged | quality_issues | other
  partnership:     school_partnership | center_partnership | franchise_inquiry | bulk_enrollment | other
  educator_query:  application_status | training_support | student_issue | schedule_query | other
  admission:       new_admission | admission_process | document_submission | seat_availability | other
  scheduling:      slot_availability | preferred_timing | teacher_preference | batch_inquiry | other
  feedback:        other
  other:           general_inquiry | career_inquiry | media_inquiry | other

# priority
  - "high"   → refund, complaint, urgent, missed-class, broken/not-working, payment-failed,
               harassment, legal, escalate, lawyer, RBI/consumer-court
  - "low"    → "thanks", "received", purely informational
  - "normal" → everything else

# Important
  - NEVER default everything to "partnership" + "student". Match the actual content.
  - "Receipt not received" → query_type=payment, related_to=invoice_request, inquiry_type=student
  - "Sponsorship request" → query_type=partnership, related_to=other, inquiry_type=general
  - "Login credentials for daughter" → query_type=technical, related_to=login_issue, inquiry_type=student
  - "Apply to teach" → query_type=educator_query, related_to=application_status, inquiry_type=educator
"""


# ── Defensive defaults for when LLM returns an unknown enum value ─────────
VALID_QUERY_TYPES = {
    "demo_related", "payment", "course_info", "ongoing_classes", "technical",
    "kit_related", "partnership", "feedback", "educator_query", "admission",
    "scheduling", "other",
}
VALID_INQUIRY_TYPES = {"student", "school", "educator", "growth_partner", "general", "teacher", "team"}
VALID_RELATED_TO = {
    "demo_related":    {"demo_booking","demo_reschedule","demo_cancellation","demo_feedback","demo_no_show","other"},
    "payment":         {"payment_pending","payment_failed","refund_request","invoice_request","payment_plan","discount_query","other"},
    "course_info":     {"course_content","course_duration","course_pricing","course_eligibility","course_certification","batch_timing","other"},
    "ongoing_classes": {"class_reschedule","class_missed","teacher_issue","class_quality","progress_report","batch_change","other"},
    "technical":       {"login_issue","app_bug","video_issue","payment_gateway","notification_issue","other"},
    "kit_related":     {"components_missing","delivery_delay","component_damaged","quality_issues","other"},
    "partnership":     {"school_partnership","center_partnership","franchise_inquiry","bulk_enrollment","other"},
    "educator_query":  {"application_status","training_support","student_issue","schedule_query","other"},
    "admission":       {"new_admission","admission_process","document_submission","seat_availability","other"},
    "scheduling":      {"slot_availability","preferred_timing","teacher_preference","batch_inquiry","other"},
    "feedback":        {"other"},
    "other":           {"general_inquiry","career_inquiry","media_inquiry","other"},
}


async def _classify_email(subject: str, sender: str, body: str) -> dict:
    """Use Emergent LLM (GPT-4o-mini) to classify the email. Returns the parsed dict
    with values normalized to the support panel's existing taxonomy."""
    fallback = {
        "is_query": True,
        "inquiry_type": "general",
        "query_type": "other",
        "related_to": "general_inquiry",
        "priority": "normal",
        "subject_summary": (subject or "")[:80],
    }
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        logger.warning("emergentintegrations not available — using fallback classification")
        return fallback

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        logger.warning("EMERGENT_LLM_KEY not set — using fallback classification")
        return fallback

    body_trim = (body or "")[:3000]
    text = f"From: {sender}\nSubject: {subject}\n---\n{body_trim}\n"

    chat = LlmChat(
        api_key=llm_key,
        session_id=f"gmail-classifier-{uuid.uuid4().hex[:8]}",
        system_message=CLASSIFIER_PROMPT,
    ).with_model("openai", "gpt-4o-mini")

    try:
        raw = await chat.send_message(UserMessage(text=text))
    except Exception:
        logger.exception("LLM classifier call failed")
        return fallback

    m = re.search(r"\{[\s\S]*\}", raw or "")
    if not m:
        return fallback
    try:
        parsed = json.loads(m.group(0))
    except Exception:
        return fallback

    # Normalize against valid enums; fall back if model hallucinated a value.
    parsed.setdefault("is_query", True)
    parsed["inquiry_type"]    = parsed.get("inquiry_type") if parsed.get("inquiry_type") in VALID_INQUIRY_TYPES else "general"
    parsed["query_type"]      = parsed.get("query_type")   if parsed.get("query_type")   in VALID_QUERY_TYPES   else "other"
    allowed_rel = VALID_RELATED_TO.get(parsed["query_type"], {"other"})
    if parsed.get("related_to") not in allowed_rel:
        # pick a sensible default per query_type
        parsed["related_to"] = "general_inquiry" if parsed["query_type"] == "other" else "other"
    parsed["priority"]        = parsed.get("priority") if parsed.get("priority") in ("high","normal","low") else "normal"
    parsed["subject_summary"] = (parsed.get("subject_summary") or subject or "")[:80]
    return parsed


# ── Customer auto-link (search across all booking/payment collections) ────
CUSTOMER_COLLECTIONS = [
    ("students", "Student CRM"),
    ("student_inquiries", "Student Inquiry"),
    ("student_payments", "Student Payment (Cashfree)"),
    ("demo_bookings", "Demo Booking"),
    ("ai_foundations_bookings", "AI Foundations Booking"),
    ("summer_camp_bookings", "Summer Camp Booking"),
    ("workshop_bookings", "Workshop Booking"),
    ("social_media_intern_registrations", "SM Intern Registration"),
    ("inquiry_leads", "Inquiry Lead"),
    ("future_skills_subscriptions", "Future Skills Subscription"),
    ("future_skills_trials", "Future Skills Trial"),
    ("school_inquiries", "School Inquiry"),
]


def _digits_only(s: str) -> str:
    return re.sub(r"\D", "", s or "")


async def _find_customer_by_email_or_phone(email: str, phone: str = "") -> Optional[dict]:
    """Search all customer-bearing collections for a match by email or phone."""
    email_l = (email or "").lower().strip()
    digits = _digits_only(phone)[-10:] if phone else ""  # Indian mobiles → last 10

    for coll_name, source_label in CUSTOMER_COLLECTIONS:
        try:
            coll = getattr(db, coll_name)
        except Exception:
            continue
        ors = []
        if email_l:
            ors += [
                {"email": email_l},
                {"parent_email": email_l},
                {"student_email": email_l},
                {"contact_email": email_l},
            ]
        if digits:
            # Match phone fields ending in the last-10 digits (allows +91/0 prefixes)
            phone_regex = {"$regex": digits + "$"}
            ors += [
                {"phone": phone_regex},
                {"parent_phone": phone_regex},
                {"student_phone": phone_regex},
                {"contact_phone": phone_regex},
                {"mobile": phone_regex},
            ]
        if not ors:
            continue
        try:
            hit = await coll.find_one({"$or": ors}, {"_id": 0})
        except Exception:
            continue
        if hit:
            return {"source": source_label, "collection": coll_name, "record": hit}
    return None


# ── Core: fetch + classify + create tickets for one account ────────────────
async def _sync_account(acc_doc: dict, max_messages: int = 150) -> dict:
    """Pull INBOX (last 30d, read + unread), classify, create tickets, mark read.
    Returns summary. Atomic-claim dedup via gmail_processed prevents double-runs."""
    email_addr = acc_doc["email"]
    created = 0
    skipped = 0
    errors: List[str] = []

    try:
        creds = _creds_from_doc(acc_doc)
        await _persist_refreshed_token(email_addr, creds)
        gmail = build("gmail", "v1", credentials=creds, cache_discovery=False)
    except Exception as e:
        logger.exception(f"Gmail auth failed for {email_addr}")
        await db.gmail_accounts.update_one(
            {"email": email_addr},
            {"$set": {"last_sync_error": f"auth_failed: {str(e)[:200]}", "last_sync_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"email": email_addr, "created": 0, "skipped": 0, "error": f"auth_failed: {e}"}

    # List INBOX messages (read + unread) from the last 30 days. We no longer
    # rely on the `is:unread` flag because the user wants the bot to ALSO
    # catch queries they've already opened in Gmail (e.g., from before the bot
    # was connected, or read on mobile but not yet replied to). Dedup is
    # entirely handled by the `gmail_processed` lock, so re-scans are cheap.
    try:
        # Exclude promotional + social tab traffic, which is rarely a customer query.
        # Cap window to 30 days so the first scan after a long backlog stays bounded.
        query = "in:inbox newer_than:30d -category:promotions -category:social"
        resp = gmail.users().messages().list(userId="me", q=query, maxResults=max_messages).execute()
        msgs = resp.get("messages", []) or []
    except HttpError as e:
        logger.exception(f"Gmail list failed for {email_addr}")
        errors.append(f"list_failed: {e}")
        await db.gmail_accounts.update_one(
            {"email": email_addr},
            {"$set": {"last_sync_error": str(e)[:200], "last_sync_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"email": email_addr, "created": 0, "skipped": 0, "error": str(e)}

    for m in msgs:
        msg_id = m["id"]
        # ── Atomic claim: "I'm processing this message" ────────────────────
        # Two syncs running concurrently (hourly cron + a manual "Sync now"
        # click) would otherwise both pass the "already processed?" check and
        # each create a ticket. The atomic upsert below guarantees only ONE
        # of them inserts the lock doc; the other sees matched_count > 0 and
        # bails out. Combined with the unique index on (gmail_msg_id, account),
        # this eliminates the duplicate-ticket race.
        try:
            lock_res = await db.gmail_processed.update_one(
                {"gmail_msg_id": msg_id, "account": email_addr},
                {
                    "$setOnInsert": {
                        "gmail_msg_id": msg_id,
                        "account": email_addr,
                        "action": "in_progress",
                        "processed_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
                upsert=True,
            )
        except Exception as e:
            # Most likely a DuplicateKeyError from the unique index — another
            # sync already claimed this message. Skip.
            logger.info(f"[gmail_bot] lock_acquire_failed for {msg_id}: {e}")
            skipped += 1
            continue
        if lock_res.matched_count > 0:
            # Doc existed already → already processed (or being processed) by
            # an earlier sync. Skip.
            skipped += 1
            continue

        try:
            full = gmail.users().messages().get(userId="me", id=msg_id, format="full").execute()
        except HttpError as e:
            errors.append(f"get_failed {msg_id}: {e}")
            continue

        payload = full.get("payload", {})
        headers = payload.get("headers", [])
        subject = _hdr(headers, "Subject")
        from_h = _hdr(headers, "From")
        sender_email = _extract_email_address(from_h)
        sender_name = _extract_name(from_h)
        body = _extract_body(payload)
        thread_id = full.get("threadId")
        # Capture RFC-822 Message-ID for proper threading on our reply
        rfc_message_id = _hdr(headers, "Message-ID") or _hdr(headers, "Message-Id")
        existing_references = _hdr(headers, "References")
        gmail_url = _build_gmail_url(email_addr, thread_id)

        # Hard skips before paying for LLM call
        if (
            not sender_email
            or sender_email == email_addr  # our own outbound
            or "noreply" in sender_email
            or "no-reply" in sender_email
            or "donotreply" in sender_email
            or "mailer-daemon" in sender_email
            or "postmaster" in sender_email
            or sender_email.endswith("@cashfree.com")
            or sender_email.endswith("@resend.com")
            or sender_email.endswith("@aisensy.com")
        ):
            await _mark_processed(msg_id, email_addr, gmail, "auto_skip", subject, sender_email)
            skipped += 1
            continue

        # ── Cold-outreach pre-filter (free, runs before the LLM call) ────────
        # Catches the most obvious college-fest / sponsorship / collaboration
        # pitches via subject + sender-domain keywords. These are NOT customer
        # queries and the user explicitly asked us not to ticket them.
        subj_l = (subject or "").lower()
        body_head = (body or "")[:1500].lower()  # first ~1.5 KB usually contains the ask
        combined = subj_l + " " + body_head
        sender_domain = sender_email.split("@")[-1] if "@" in sender_email else ""

        # Strong cold-outreach signals: any of these in subject or body
        cold_outreach_kw = (
            "sponsorship", "sponsor us", "sponsor our", "seeking sponsors",
            "in-kind sponsorship", "title sponsor", "category sponsor",
            "collaboration", "collaborate with", "looking to collaborate",
            "partner with us", "outreach partner", "media partner", "community partner",
            "techfest", "tech fest", "e-summit", "esummit", "e-cell", "ecell",
            "entrepreneurship cell", "entrepreneurship summit",
            "college fest", "annual fest", "cultural fest", "management fest",
            "model united nations", " mun ", "mun ", "hackathon partnership",
            "judge our", "mentor our", "speak at our",
            "swag", "gift hampers", "voucher partner", "prize sponsor",
            "alumni meet", "ted talk", "tedx",
        )
        is_college_domain = any(sender_domain.endswith(s) for s in (
            ".edu", ".edu.in", ".ac.in", "iim", "iit",
        )) or any(k in sender_domain for k in ("iitb", "iitd", "iitm", "iitk", "iitkgp", "iiitm", "nit", "bits-pilani"))

        cold_hits = sum(1 for kw in cold_outreach_kw if kw in combined)
        # A college-domain sender + ANY one keyword → skip
        # OR 2+ keywords from anywhere → skip
        if (is_college_domain and cold_hits >= 1) or cold_hits >= 2:
            await _mark_processed(
                msg_id, email_addr, gmail, "cold_outreach_skip",
                subject, sender_email,
                classification={"reason": "college/sponsorship/collaboration pre-filter",
                                "matched_keywords": cold_hits,
                                "college_domain": is_college_domain},
            )
            skipped += 1
            continue

        # AI classification
        try:
            cls = await _classify_email(subject, from_h, body)
        except Exception as e:
            errors.append(f"classify_failed {msg_id}: {e}")
            cls = {"is_query": True, "category": "general", "priority": "normal", "subject_summary": subject[:80]}

        if not cls.get("is_query"):
            await _mark_processed(msg_id, email_addr, gmail, "not_a_query", subject, sender_email, classification=cls)
            skipped += 1
            continue

        # ── Dedup by Gmail thread_id ────────────────────────────────────────
        # Gmail groups replies into a single threadId. If we already created a
        # ticket for this thread, append the new message as a comment instead
        # of opening a second ticket (which is what was causing duplicates).
        existing_ticket = None
        if thread_id:
            existing_ticket = await db.support_queries.find_one(
                {"gmail.thread_id": thread_id},
                {"_id": 0, "id": 1, "ticket_number": 1, "comments": 1, "status": 1},
            )

        # ── Secondary dedup: same sender + similar subject within 7 days ───
        # Catches duplicates where the customer re-sent the same query (different
        # Gmail thread) or wrote to multiple aliases (info@ AND skills@). We
        # normalize the subject (strip Re:/Fwd:, lowercase, drop punctuation) so
        # "Re: Sponsorship" and "Sponsorship" collapse together.
        if not existing_ticket and sender_email:
            from datetime import timedelta as _td
            norm_subject = re.sub(r"^(re|fwd|fw)\s*:\s*", "", (subject or "").strip(), flags=re.I)
            norm_subject = re.sub(r"[^a-z0-9 ]+", " ", norm_subject.lower()).strip()
            norm_subject = re.sub(r"\s+", " ", norm_subject)[:80]
            if len(norm_subject) >= 6:
                seven_days_ago = (datetime.now(timezone.utc) - _td(days=7)).isoformat()
                existing_ticket = await db.support_queries.find_one(
                    {
                        "source": "gmail_bot",
                        "email": sender_email,
                        "created_at": {"$gte": seven_days_ago},
                        "gmail.normalized_subject": norm_subject,
                    },
                    {"_id": 0, "id": 1, "ticket_number": 1, "comments": 1, "status": 1},
                )

        # Try to extract a phone number from the body for customer linking
        phone_match = re.search(r"(?:\+?91[\s\-]?)?[6-9]\d{9}", body or "")
        phone_guess = phone_match.group(0) if phone_match else ""

        if existing_ticket:
            # Append a comment on the existing ticket; re-open if it was resolved.
            comment = {
                "id": str(uuid.uuid4()),
                "author": "Gmail Bot",
                "author_email": "gmail_bot",
                "text": f"[New Gmail reply on this thread]\nSubject: {subject}\n\n{(body or '')[:3000]}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "gmail": {"message_id": msg_id, "thread_id": thread_id, "from": from_h},
            }
            update = {
                "$push": {"comments": comment},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            }
            # If the ticket was resolved/closed, re-open so the team sees the new reply
            if existing_ticket.get("status") in ("resolved", "closed"):
                update["$set"]["status"] = "open"
                update["$set"]["reopened_at"] = datetime.now(timezone.utc).isoformat()
            await db.support_queries.update_one({"id": existing_ticket["id"]}, update)
            await _mark_processed(
                msg_id, email_addr, gmail, "appended_to_existing", subject, sender_email,
                classification=cls, ticket_id=existing_ticket["id"],
                ticket_number=existing_ticket.get("ticket_number"),
            )
            skipped += 1  # not a NEW ticket
            continue

        link = None
        try:
            link = await _find_customer_by_email_or_phone(sender_email, phone_guess)
        except Exception:
            logger.exception("Customer link lookup failed")

        # Construct ticket
        ticket_id = str(uuid.uuid4())
        ticket_number = await get_next_ticket_number()
        customer_name = sender_name or (link or {}).get("record", {}).get("name") or sender_email.split("@")[0]
        customer_phone = ""
        if link:
            rec = link.get("record", {}) or {}
            customer_phone = rec.get("phone") or rec.get("parent_phone") or rec.get("student_phone") or rec.get("contact_phone") or rec.get("mobile") or ""
        if not customer_phone:
            customer_phone = phone_guess

        # Use the AI-classified taxonomy directly so the support panel's existing
        # dropdowns + filters work without any UI changes.
        ticket_doc = {
            "id": ticket_id,
            "ticket_number": ticket_number,
            "name": customer_name,
            "phone": customer_phone,
            "email": sender_email,
            "query_type": cls.get("query_type", "other"),
            "related_to": cls.get("related_to", "general_inquiry"),
            "inquiry_type": cls.get("inquiry_type", "general"),
            "subject_summary": cls.get("subject_summary", subject)[:120],
            "message": (subject + "\n\n" + (body or ""))[:5000],
            "query_details": (subject + "\n\n" + (body or ""))[:5000],
            "priority": cls.get("priority", "normal"),
            "status": "open",
            "source": "gmail_bot",
            "attachments": [],
            "created_by": "gmail_bot",
            "created_by_name": f"Gmail Bot ({email_addr})",
            "viewers": [],
            "comments": [],
            "assigned_to": None,
            # Gmail-specific provenance
            "gmail": {
                "account": email_addr,
                "message_id": msg_id,
                "thread_id": thread_id,
                "rfc_message_id": rfc_message_id,    # for In-Reply-To when replying
                "references": existing_references,   # for References header chain
                "subject": subject,
                "normalized_subject": (lambda s: re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", re.sub(r"^(re|fwd|fw)\s*:\s*", "", (s or "").strip(), flags=re.I).lower())).strip()[:80])(subject),
                "from": from_h,
                "gmail_url": gmail_url,
                "ack_sent": False,
                "ack_sent_at": None,
            },
            "customer_link": link,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.support_queries.insert_one(ticket_doc)
        created += 1

        # ── Auto-acknowledgment reply ───────────────────────────────────────
        # Idempotent: only one ack per ticket, ever. The flag is set BEFORE we
        # send so a concurrent retry won't double-send. If the send itself
        # fails, we clear the flag so the next sync can retry.
        first_name = customer_name.split()[0] if customer_name else "there"
        claim = await db.support_queries.update_one(
            {"id": ticket_id, "gmail.ack_sent": {"$ne": True}},
            {"$set": {
                "gmail.ack_sent": True,
                "gmail.ack_sent_at": datetime.now(timezone.utc).isoformat(),
                "gmail.ack_channel": "gmail_bot_auto",
            }},
        )
        if claim.modified_count == 1:
            # AI-generated content (query-aware, reassuring). Falls back to a
            # safe static template if the LLM fails or returns an unsafe shape.
            ai_body = await _ai_generate_ack(
                first_name=first_name,
                ticket_number=ticket_number,
                subject=subject,
                body=body,
            )
            ack_text = ai_body or _static_ack(first_name, ticket_number)
            try:
                sent = await _send_gmail_reply(
                    account_email=email_addr,
                    to_email=sender_email,
                    to_name=customer_name,
                    subject=subject,
                    body_text=ack_text,
                    thread_id=thread_id,
                    in_reply_to_msg_id=rfc_message_id,
                    references=existing_references or rfc_message_id,
                )
                await db.support_queries.update_one(
                    {"id": ticket_id},
                    {"$set": {
                        "gmail.ack_message_id": sent.get("id"),
                        "gmail.ack_is_ai": bool(ai_body),
                        # Also set top-level ack_sent so the support panel
                        # shows the same indicator that resend-acked tickets do.
                        "ack_sent": True,
                        "ack_sent_at": datetime.now(timezone.utc).isoformat(),
                        "ack_channel": "gmail_thread",
                    }},
                )
            except Exception as ack_err:
                logger.exception(f"Auto-ack failed for ticket #{ticket_number}")
                # Clear the claim so a future sync can retry the ack
                await db.support_queries.update_one(
                    {"id": ticket_id},
                    {"$set": {
                        "gmail.ack_sent": False,
                        "gmail.ack_error": str(ack_err)[:200],
                    }},
                )

        # Mark as read in Gmail + processed in our DB
        await _mark_processed(msg_id, email_addr, gmail, "ticket_created", subject, sender_email,
                              classification=cls, ticket_id=ticket_id, ticket_number=ticket_number)

    summary = {
        "email": email_addr,
        "created": created,
        "skipped": skipped,
        "errors": errors[:10],
        "examined": len(msgs),
    }
    await db.gmail_accounts.update_one(
        {"email": email_addr},
        {"$set": {
            "last_sync_at": datetime.now(timezone.utc).isoformat(),
            "last_sync_count": created,
            "last_sync_examined": len(msgs),
            "last_sync_error": ("; ".join(errors[:3]) if errors else None),
        }},
    )
    logger.info(f"[gmail_bot] {email_addr} → {summary}")
    return summary


async def _mark_processed(msg_id: str, account: str, gmail, action: str, subject: str, sender: str,
                          classification: Optional[dict] = None, ticket_id: Optional[str] = None,
                          ticket_number: Optional[int] = None):
    """Update the previously-claimed gmail_processed doc with the final outcome
    + remove the UNREAD label so the next sync skips this message."""
    # 1) Mark read in Gmail
    try:
        gmail.users().messages().modify(userId="me", id=msg_id, body={"removeLabelIds": ["UNREAD"]}).execute()
    except Exception:
        logger.exception(f"Failed to mark Gmail msg {msg_id} read")
    # 2) Update the in-flight lock doc with the final action + details. We use
    #    update_one + upsert=True so this also works for first-run installs
    #    (before the atomic-claim refactor or if the lock doc was deleted).
    try:
        await db.gmail_processed.update_one(
            {"gmail_msg_id": msg_id, "account": account},
            {"$set": {
                "action": action,
                "subject": subject[:160],
                "sender": sender,
                "classification": classification,
                "ticket_id": ticket_id,
                "ticket_number": ticket_number,
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    except Exception:
        logger.exception("Failed to update gmail_processed log")


# ── Public sync endpoints ──────────────────────────────────────────────────
async def sync_all_gmail_accounts() -> dict:
    """Called by APScheduler every hour. Iterates over all active accounts."""
    # Ensure the unique index that backs the atomic-claim dedup. Idempotent —
    # safe to call on every sync; MongoDB no-ops if the index already exists.
    try:
        await db.gmail_processed.create_index(
            [("gmail_msg_id", 1), ("account", 1)],
            unique=True,
            name="gmail_msg_account_unique",
        )
    except Exception:
        logger.exception("Could not ensure gmail_processed unique index")

    accounts = await db.gmail_accounts.find({"active": {"$ne": False}}).to_list(50)
    results = []
    for a in accounts:
        try:
            results.append(await _sync_account(a))
        except Exception as e:
            logger.exception(f"sync_account crashed for {a.get('email')}")
            results.append({"email": a.get("email"), "error": str(e)})
    return {"accounts": len(results), "results": results}


@router.post("/gmail/sync-now")
async def sync_now(user: dict = Depends(get_current_user)):
    """Admin manual trigger — runs sync immediately across all active accounts."""
    res = await sync_all_gmail_accounts()
    return res


@router.post("/gmail/sync-now/{acc_id}")
async def sync_now_single(acc_id: str, user: dict = Depends(get_current_user)):
    acc = await db.gmail_accounts.find_one({"id": acc_id})
    if not acc:
        raise HTTPException(404, "Account not found")
    return await _sync_account(acc)


# ── Reply templates ────────────────────────────────────────────────────────
# Seeded built-ins so the panel works on day 1 — admins can add/edit/delete
# additional templates which we store in db.gmail_reply_templates.
BUILTIN_TEMPLATES = [
    {
        "id": "builtin_received",
        "name": "Acknowledge receipt (48h)",
        "subject_prefix": "Re: ",
        "body": (
            "Hi {first_name},\n\n"
            "Thanks for writing in. Your query has been logged as Support Ticket #{ticket_number}. "
            "A team member will reach out to you within 48 hours with next steps.\n\n"
            "If this is urgent, simply reply to this email and we'll fast-track it.\n\n"
            "Warm regards,\nOLL Support"
        ),
    },
    {
        "id": "builtin_refund_initiated",
        "name": "Refund initiated (5-7 working days)",
        "subject_prefix": "Re: ",
        "body": (
            "Hi {first_name},\n\n"
            "Apologies for the inconvenience. Your refund for ticket #{ticket_number} has been initiated "
            "from our end. The amount should reflect in the original payment method within 5–7 working days.\n\n"
            "Please reply to this thread if you don't see it by then and we'll escalate to our finance team.\n\n"
            "Warm regards,\nOLL Finance"
        ),
    },
    {
        "id": "builtin_info_requested",
        "name": "Request more information",
        "subject_prefix": "Re: ",
        "body": (
            "Hi {first_name},\n\n"
            "Thanks for getting in touch — we'd like to help quickly on ticket #{ticket_number}. "
            "Could you please share a bit more context so we can route this to the right team?\n\n"
            "  · Child's name + grade (if a class-related query)\n"
            "  · Order number or registered phone (if a payment-related query)\n"
            "  · A screenshot or short note describing the exact issue\n\n"
            "Once we have these we'll get back to you within 24 hours.\n\n"
            "Warm regards,\nOLL Support"
        ),
    },
    {
        "id": "builtin_escalated",
        "name": "Escalated to the team",
        "subject_prefix": "Re: ",
        "body": (
            "Hi {first_name},\n\n"
            "Thanks for your patience on ticket #{ticket_number}. Just to keep you posted — your query has "
            "been escalated to the relevant team lead and is being actively looked into.\n\n"
            "We'll come back to you with a definitive update within the next 48 hours. If anything urgent "
            "comes up in the meantime, simply reply to this email and we'll prioritise it.\n\n"
            "Warm regards,\nOLL Support"
        ),
    },
    {
        "id": "builtin_resolved_link",
        "name": "Resolved — share resource link",
        "subject_prefix": "Re: ",
        "body": (
            "Hi {first_name},\n\n"
            "Good news — ticket #{ticket_number} has been resolved from our end. Here's the link / resource you'll need:\n\n"
            "  👉 [PASTE LINK HERE]\n\n"
            "Do reply on this same thread if anything else comes up and we'll be happy to help.\n\n"
            "Warm regards,\nOLL Support"
        ),
    },
    {
        "id": "builtin_callback_request",
        "name": "Schedule a callback",
        "subject_prefix": "Re: ",
        "body": (
            "Hi {first_name},\n\n"
            "Happy to set up a quick call so we can address ticket #{ticket_number} faster. "
            "Could you share:\n\n"
            "  · Your preferred date + 2-3 time-slots (IST)\n"
            "  · A working phone number\n\n"
            "Once we have these, we'll lock a slot and send a confirmation here.\n\n"
            "Warm regards,\nOLL Support"
        ),
    },
    {
        "id": "builtin_receipt_followup",
        "name": "Payment receipt — share Cashfree invoice",
        "subject_prefix": "Re: ",
        "body": (
            "Hi {first_name},\n\n"
            "Apologies for the delay. Sharing your Cashfree payment receipt for ticket #{ticket_number}. "
            "If anything looks incorrect, do let us know in the same thread.\n\n"
            "Best,\nOLL Finance"
        ),
    },
    {
        "id": "builtin_demo_scheduling",
        "name": "Schedule demo class",
        "subject_prefix": "Re: ",
        "body": (
            "Hi {first_name},\n\n"
            "Happy to help schedule your demo class. Could you share:\n"
            "  · Child's age + grade\n"
            "  · Preferred skill (Robotics / AI / Coding / Financial Literacy)\n"
            "  · 2-3 weekday/weekend slots that work for you\n\n"
            "Once we have these, we'll send a confirmation with the educator's details and "
            "Zoom/centre link. — Ticket #{ticket_number}\n\nWarm regards,\nOLL Admissions"
        ),
    },
    {
        "id": "builtin_login_help",
        "name": "Student login help",
        "subject_prefix": "Re: ",
        "body": (
            "Hi {first_name},\n\n"
            "We've reset access for your account. Please follow these steps:\n"
            "  1. Go to https://oll.co/login\n"
            "  2. Choose 'Student / Parent' login\n"
            "  3. Enter your registered phone number — you'll receive an OTP on WhatsApp\n\n"
            "Reply here if you don't receive the OTP within 2 minutes. — Ticket #{ticket_number}\n\n"
            "Warm regards,\nOLL Support"
        ),
    },
]


@router.get("/gmail/templates")
async def list_reply_templates(user: dict = Depends(get_current_user)):
    """All reply templates — built-ins + admin-defined."""
    custom = await db.gmail_reply_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"templates": [*BUILTIN_TEMPLATES, *custom]}


@router.post("/gmail/templates")
async def create_reply_template(data: dict, user: dict = Depends(get_current_user)):
    """Save a new reusable template. `{first_name}` and `{ticket_number}` are interpolated."""
    name = (data.get("name") or "").strip()
    body = (data.get("body") or "").strip()
    if not name or not body:
        raise HTTPException(400, "name + body required")
    tpl = {
        "id": str(uuid.uuid4()),
        "name": name[:120],
        "subject_prefix": (data.get("subject_prefix") or "Re: ")[:40],
        "body": body[:5000],
        "created_by": user.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.gmail_reply_templates.insert_one(tpl)
    tpl.pop("_id", None)
    return tpl


@router.delete("/gmail/templates/{tpl_id}")
async def delete_reply_template(tpl_id: str, user: dict = Depends(get_current_user)):
    if tpl_id.startswith("builtin_"):
        raise HTTPException(400, "Built-in templates cannot be deleted")
    res = await db.gmail_reply_templates.delete_one({"id": tpl_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Template not found")
    return {"deleted": True}


# ── Manual reply from admin via Gmail ──────────────────────────────────────
@router.post("/gmail/attachments")
async def upload_support_attachment(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload an attachment to GridFS and return its metadata. The frontend
    sends the returned `id` along with the reply request. Files persist so the
    ticket history page can re-download them later for audit."""
    if _ATTACHMENT_BUCKET is None:
        raise HTTPException(500, "Attachment store not available")
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(413, f"File exceeds {MAX_ATTACHMENT_BYTES // (1024 * 1024)} MB limit")
    file_id = await _ATTACHMENT_BUCKET.upload_from_stream(
        file.filename or "attachment",
        data,
        metadata={
            "content_type": file.content_type or "application/octet-stream",
            "uploaded_by": user.get("email"),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "size": len(data),
        },
    )
    return {
        "id": str(file_id),
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(data),
    }


@router.get("/gmail/attachments/{file_id}")
async def download_support_attachment(file_id: str, user: dict = Depends(get_current_user)):
    """Stream a previously uploaded attachment from GridFS so admins can
    re-download/preview it from the ticket history."""
    if _ATTACHMENT_BUCKET is None:
        raise HTTPException(500, "Attachment store not available")
    from bson import ObjectId
    try:
        oid = ObjectId(file_id)
    except Exception:
        raise HTTPException(400, "Invalid file id")
    try:
        gridout = await _ATTACHMENT_BUCKET.open_download_stream(oid)
    except Exception:
        raise HTTPException(404, "Attachment not found")
    meta = gridout.metadata or {}
    ctype = meta.get("content_type") or "application/octet-stream"

    async def _iter():
        while True:
            chunk = await gridout.readchunk()
            if not chunk:
                break
            yield chunk

    return StreamingResponse(
        _iter(),
        media_type=ctype,
        headers={"Content-Disposition": f'attachment; filename="{gridout.filename}"'},
    )


async def _load_attachments_from_gridfs(attachment_ids: List[str]) -> List[dict]:
    """Resolve a list of GridFS IDs into the {filename, content_type, data} dicts
    expected by `_build_reply_message`. Enforces the per-file + total size caps."""
    if not attachment_ids or _ATTACHMENT_BUCKET is None:
        return []
    from bson import ObjectId
    out = []
    total = 0
    for aid in attachment_ids:
        try:
            oid = ObjectId(aid)
        except Exception:
            raise HTTPException(400, f"Invalid attachment id: {aid}")
        try:
            gridout = await _ATTACHMENT_BUCKET.open_download_stream(oid)
        except Exception:
            raise HTTPException(404, f"Attachment not found: {aid}")
        data = await gridout.read()
        total += len(data)
        if total > MAX_TOTAL_ATTACHMENT_BYTES:
            raise HTTPException(413, "Total attachment size exceeds Gmail's 24 MB limit")
        out.append({
            "filename": gridout.filename or "attachment",
            "content_type": (gridout.metadata or {}).get("content_type") or "application/octet-stream",
            "data": data,
            "_id": str(oid),
            "size": len(data),
        })
    return out


@router.post("/gmail/reply/{ticket_id}")
async def reply_to_ticket_via_gmail(ticket_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Send a Gmail reply from the same account the original email came in on,
    threaded under the original conversation. Log the reply as a comment on the
    ticket so it shows in the support panel timeline. Accepts optional
    `attachment_ids[]` (GridFS IDs previously uploaded via /gmail/attachments)."""
    body_text = (data.get("body") or "").strip()
    if not body_text:
        raise HTTPException(400, "body required")

    ticket = await db.support_queries.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    gmail = ticket.get("gmail") or {}
    account_email = gmail.get("account")
    if not account_email:
        raise HTTPException(400, "Ticket has no associated Gmail account (only Gmail-bot tickets can be replied to via Gmail)")

    # Render template placeholders
    customer_first_name = (ticket.get("name") or "there").split()[0]
    rendered = body_text.format(
        first_name=customer_first_name,
        ticket_number=ticket.get("ticket_number", ""),
    ) if "{" in body_text else body_text

    # Resolve attachments (optional)
    attachment_ids = data.get("attachment_ids") or []
    if not isinstance(attachment_ids, list):
        raise HTTPException(400, "attachment_ids must be a list")
    attachments = await _load_attachments_from_gridfs(attachment_ids)

    try:
        sent = await _send_gmail_reply(
            account_email=account_email,
            to_email=ticket.get("email"),
            to_name=ticket.get("name", ""),
            subject=gmail.get("subject", ""),
            body_text=rendered,
            thread_id=gmail.get("thread_id"),
            in_reply_to_msg_id=gmail.get("rfc_message_id"),
            references=gmail.get("references") or gmail.get("rfc_message_id"),
            attachments=attachments,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Gmail reply failed")
        raise HTTPException(500, f"Gmail send failed: {e}")

    # Log reply as a comment so the support panel shows the back-and-forth
    att_meta = [{"id": a["_id"], "filename": a["filename"],
                 "content_type": a["content_type"], "size": a["size"]} for a in attachments]
    comment = {
        "id": str(uuid.uuid4()),
        "author": user.get("name") or user.get("email") or "Admin",
        "author_email": user.get("email"),
        "text": f"[Replied via Gmail · {account_email}]\n\n{rendered}",
        "attachments": att_meta,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "gmail": {"sent_message_id": sent.get("id"), "thread_id": sent.get("threadId")},
    }
    await db.support_queries.update_one(
        {"id": ticket_id},
        {
            "$push": {"comments": comment},
            "$set": {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "last_replied_at": datetime.now(timezone.utc).isoformat(),
                "last_replied_by": user.get("email"),
            },
        },
    )
    return {"message": "Reply sent", "gmail_message_id": sent.get("id"),
            "thread_id": sent.get("threadId"), "attachments": att_meta}
