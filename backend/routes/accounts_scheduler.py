"""
Accounts Communication Scheduler.

Daily job (9:00 AM IST) that walks every active/converted/renewed school,
inspects every unpaid payment tranche, and sends an invoice/payment reminder
email based on the tranche's due-date offset.

Timeline triggers (days_to_due = due_date - today, IST):
    +7   → T-7  (one-week-ahead heads-up)
    +2   → T-2  (final pre-due reminder)
     0   → T0   (due today)
    -1   → T+1  (1 day overdue)
    -3   → T+3  (3 days overdue)
    -7   → T+7  (1 week overdue — escalation, BCC internal alias)

Templates are keyed by (audience, trigger). Audience is `distributor` when the
school's `onboarding_data.payment_mode == "from_distributor"` AND a distributor
contact email is present; otherwise `school`. School recipient resolution walks
`school_contacts` in this priority: account/accountant → principal → trustee →
first contact with an email.

Deduplication: each (school_id, tranche_index, trigger) combination is logged
to `accounts_reminder_log` after a successful send, so the same reminder never
fires twice. The per-school toggle `accounts_reminders_enabled` (default True)
pauses every reminder for that school.

Environment guard: the scheduler is registered in server.py and respects the
per-school toggle, so preview + production can run safely in parallel without
double-sending (preview will simply log empty runs).
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta, date
from typing import Optional

import resend

from .shared import db, ensure_resend_api_key, SENDER_EMAIL

from fastapi import APIRouter, Depends, HTTPException
from .shared import get_current_user

router = APIRouter()

logger = logging.getLogger(__name__)

# India Standard Time = UTC+5:30
IST_OFFSET = timedelta(hours=5, minutes=30)

# Escalation recipients on T+7 trigger
ESCALATION_BCC = ["clonefutura@gmail.com", "lavisha@oll.co"]

# ── Default templates (9 total) ──────────────────────────────────────────────
# Each template is a `(subject, body_html)` tuple. `{name}`, `{school}`,
# `{amount}`, `{tranche}`, `{due_date}`, `{invoice_no}`, `{days}` are filled
# from the tranche/school context.

_T_SCHOOL_T_MINUS_7 = (
    "Friendly reminder · Tranche {tranche} due on {due_date}",
    """
    <p>Dear {name},</p>
    <p>This is a friendly heads-up that <strong>Tranche {tranche}</strong> for
    <strong>{school}</strong> is scheduled for <strong>{due_date}</strong> — a
    week from today.</p>
    <p>Outstanding amount: <strong>₹{amount}</strong>{invoice_line}</p>
    <p>If the payment has already been initiated, please ignore this email and
    share the UTR / cheque details whenever convenient.</p>
    <p>Warm regards,<br/>OLL Accounts Team</p>
    """,
)

_T_SCHOOL_T_MINUS_2 = (
    "Reminder · Tranche {tranche} due in 2 days",
    """
    <p>Dear {name},</p>
    <p>Quick reminder that <strong>Tranche {tranche}</strong> for
    <strong>{school}</strong> falls due on <strong>{due_date}</strong> — that
    is just 2 days away.</p>
    <p>Outstanding amount: <strong>₹{amount}</strong>{invoice_line}</p>
    <p>To avoid any delay in the program rollout, please ensure the payment is
    processed by the due date. Reply to this email with the UTR / cheque
    details once it is sent.</p>
    <p>Warm regards,<br/>OLL Accounts Team</p>
    """,
)

_T_SCHOOL_DUE_TODAY = (
    "Due today · Tranche {tranche} for {school}",
    """
    <p>Dear {name},</p>
    <p>This is a courteous reminder that <strong>Tranche {tranche}</strong>
    for <strong>{school}</strong> is <strong>due today</strong>
    ({due_date}).</p>
    <p>Outstanding amount: <strong>₹{amount}</strong>{invoice_line}</p>
    <p>Kindly process the payment today and share the UTR / cheque details on
    this thread so we can mark it received.</p>
    <p>Warm regards,<br/>OLL Accounts Team</p>
    """,
)

_T_SCHOOL_T_PLUS_1 = (
    "Payment overdue · 1 day past due for Tranche {tranche}",
    """
    <p>Dear {name},</p>
    <p>Our records show that <strong>Tranche {tranche}</strong> for
    <strong>{school}</strong> ({due_date}) is now <strong>1 day
    overdue</strong>.</p>
    <p>Outstanding amount: <strong>₹{amount}</strong>{invoice_line}</p>
    <p>If the payment has been initiated, please share the UTR / cheque
    reference so we can close this out. If there is any issue, do reply and
    we will be happy to help.</p>
    <p>Warm regards,<br/>OLL Accounts Team</p>
    """,
)

_T_SCHOOL_T_PLUS_3 = (
    "2nd reminder · Tranche {tranche} for {school} is 3 days overdue",
    """
    <p>Dear {name},</p>
    <p>This is our second reminder regarding <strong>Tranche {tranche}</strong>
    for <strong>{school}</strong>, which was due on <strong>{due_date}</strong>
    and is now <strong>3 days overdue</strong>.</p>
    <p>Outstanding amount: <strong>₹{amount}</strong>{invoice_line}</p>
    <p>Please prioritise the release of this payment to keep the program
    running smoothly. If there is a specific blocker on your side, share it
    here and we will work with you to resolve it.</p>
    <p>Warm regards,<br/>OLL Accounts Team</p>
    """,
)

_T_SCHOOL_T_PLUS_7 = (
    "Urgent · 1 week overdue · Tranche {tranche} for {school}",
    """
    <p>Dear {name},</p>
    <p>We have not yet received <strong>Tranche {tranche}</strong> for
    <strong>{school}</strong>, which was due on <strong>{due_date}</strong>
    and is now <strong>1 week overdue</strong>.</p>
    <p>Outstanding amount: <strong>₹{amount}</strong>{invoice_line}</p>
    <p>This email is also being shared with our senior accounts team for
    follow-up. Kindly arrange the payment at the earliest, or reply to this
    thread with the expected date of settlement.</p>
    <p>Warm regards,<br/>OLL Accounts Team</p>
    """,
)

_T_DIST_T_MINUS_2 = (
    "Reminder · Invoice for {school} due in 2 days",
    """
    <p>Dear {name},</p>
    <p>This is a gentle reminder that the invoice for <strong>{school}</strong>
    (Tranche {tranche}) falls due on <strong>{due_date}</strong> — 2 days from
    today.</p>
    <p>Invoice value: <strong>₹{amount}</strong>{invoice_line}</p>
    <p>Please confirm the payment schedule so we can keep the program rollout
    on track.</p>
    <p>Warm regards,<br/>OLL Accounts Team</p>
    """,
)

_T_DIST_DUE_TODAY = (
    "Due today · Invoice for {school}",
    """
    <p>Dear {name},</p>
    <p>The invoice for <strong>{school}</strong> (Tranche {tranche}) is
    <strong>due today</strong> ({due_date}).</p>
    <p>Invoice value: <strong>₹{amount}</strong>{invoice_line}</p>
    <p>Kindly process the payment today and share the UTR / cheque details on
    this thread so we can mark it received.</p>
    <p>Warm regards,<br/>OLL Accounts Team</p>
    """,
)

_T_DIST_T_PLUS_3 = (
    "Reminder · Invoice for {school} is 3 days overdue",
    """
    <p>Dear {name},</p>
    <p>Our records show that the invoice for <strong>{school}</strong>
    (Tranche {tranche}, due on <strong>{due_date}</strong>) is now
    <strong>3 days overdue</strong>.</p>
    <p>Invoice value: <strong>₹{amount}</strong>{invoice_line}</p>
    <p>Kindly release the payment at the earliest. If a specific approval is
    still pending, reply to this thread and we will follow up jointly with the
    school.</p>
    <p>Warm regards,<br/>OLL Accounts Team</p>
    """,
)

# Key format: (audience, trigger). Audience ∈ {"school", "distributor"}.
# Trigger ∈ {"T-7", "T-2", "T0", "T+1", "T+3", "T+7"}.
TEMPLATES: dict[tuple[str, str], tuple[str, str]] = {
    ("school", "T-7"): _T_SCHOOL_T_MINUS_7,
    ("school", "T-2"): _T_SCHOOL_T_MINUS_2,
    ("school", "T0"): _T_SCHOOL_DUE_TODAY,
    ("school", "T+1"): _T_SCHOOL_T_PLUS_1,
    ("school", "T+3"): _T_SCHOOL_T_PLUS_3,
    ("school", "T+7"): _T_SCHOOL_T_PLUS_7,
    ("distributor", "T-2"): _T_DIST_T_MINUS_2,
    ("distributor", "T0"): _T_DIST_DUE_TODAY,
    ("distributor", "T+3"): _T_DIST_T_PLUS_3,
}


# ── Helpers ─────────────────────────────────────────────────────────────────
def _today_ist() -> date:
    return (datetime.now(timezone.utc) + IST_OFFSET).date()


def _trigger_for_diff(days_to_due: int) -> Optional[str]:
    if days_to_due == 7:
        return "T-7"
    if days_to_due == 2:
        return "T-2"
    if days_to_due == 0:
        return "T0"
    if days_to_due == -1:
        return "T+1"
    if days_to_due == -3:
        return "T+3"
    if days_to_due == -7:
        return "T+7"
    return None


def _parse_due_date(s: str) -> Optional[date]:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(s[: len(fmt) - (0 if "%fZ" not in fmt else 0)], fmt).date()
        except (ValueError, TypeError):
            continue
    # ISO fallback
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
    except (ValueError, TypeError):
        return None


def _resolve_school_recipient(school_contacts: list) -> tuple[Optional[str], str]:
    """Walk school_contacts in priority order:
    accountant → principal → trustee → first with email.
    Returns (email, display_name)."""
    if not school_contacts:
        return None, "Team"

    def _find(predicate):
        for c in school_contacts:
            if not c or not c.get("email"):
                continue
            role = (c.get("role") or "").lower()
            if predicate(role):
                return c.get("email"), c.get("name") or "Team"
        return None, None

    # Accountant first
    e, n = _find(lambda r: "account" in r)
    if e:
        return e, n
    # Principal next
    e, n = _find(lambda r: "principal" in r)
    if e:
        return e, n
    # Trustee next
    e, n = _find(lambda r: "trustee" in r)
    if e:
        return e, n
    # First contact with email
    for c in school_contacts:
        if c and c.get("email"):
            return c.get("email"), c.get("name") or "Team"
    return None, "Team"


def _amount_str(amount) -> str:
    try:
        n = float(amount or 0)
    except (TypeError, ValueError):
        return str(amount or "—")
    if n.is_integer():
        return f"{int(n):,}"
    return f"{n:,.2f}"


def _fmt_date(d: date) -> str:
    return d.strftime("%d %b %Y")


# ── Core sender ─────────────────────────────────────────────────────────────
async def _send_reminder(
    *,
    school: dict,
    tranche: dict,
    tranche_index: int,
    trigger: str,
    days_to_due: int,
) -> bool:
    """Send a single reminder email if all preconditions pass + log dedupe.

    Returns True on send, False on skip (no-op)."""
    school_id = school.get("id")
    onboarding = school.get("onboarding_data") or {}
    payment_mode = (onboarding.get("payment_mode") or "from_school").lower()

    # ── Audience + recipient ──────────────────────────────────────────────
    audience = "school"
    recipient_email: Optional[str] = None
    recipient_name = "Team"
    if payment_mode == "from_distributor":
        dist_email = (onboarding.get("distributor_contact_email") or "").strip()
        if dist_email:
            audience = "distributor"
            recipient_email = dist_email
            recipient_name = onboarding.get("distributor_name") or "Team"

    if audience == "school":
        # Try inquiry-level school_contacts first, then onboarding-level
        contacts = school.get("school_contacts") or onboarding.get("school_contacts") or []
        recipient_email, recipient_name = _resolve_school_recipient(contacts)
        # Final fallback to the inquiry's primary email
        if not recipient_email:
            recipient_email = school.get("email")
            recipient_name = school.get("contact_name") or "Team"

    if not recipient_email or "@" not in recipient_email:
        return False

    # Template lookup. Distributors only get T-2/T0/T+3 templates — for any
    # other trigger we silently no-op so the school cron can decide whether
    # to send a school-audience reminder instead (but in distributor mode we
    # don't want to spam the school). Keep it tight.
    tpl = TEMPLATES.get((audience, trigger))
    if not tpl:
        return False

    subject_tpl, body_tpl = tpl

    # ── Dedupe ────────────────────────────────────────────────────────────
    log_key = {
        "school_id": school_id,
        "tranche_index": tranche_index,
        "trigger": trigger,
    }
    existing = await db.accounts_reminder_log.find_one(log_key)
    if existing:
        return False

    # ── Build context ─────────────────────────────────────────────────────
    due_str = tranche.get("date") or ""
    due_d = _parse_due_date(due_str)
    due_display = _fmt_date(due_d) if due_d else (due_str or "—")
    invoice_no = (tranche.get("invoice_no") or tranche.get("invoice_number") or "").strip()
    invoice_line = f" (Invoice #{invoice_no})" if invoice_no else ""

    fmt_ctx = {
        "name": recipient_name or "Team",
        "school": school.get("school_name") or "your school",
        "amount": _amount_str(tranche.get("amount") or 0),
        "tranche": tranche_index + 1,
        "due_date": due_display,
        "invoice_no": invoice_no or "—",
        "invoice_line": invoice_line,
        "days": abs(days_to_due),
    }

    try:
        subject = subject_tpl.format(**fmt_ctx)
        body_html = body_tpl.format(**fmt_ctx)
    except KeyError:
        logger.exception(f"[accounts] template formatting failed for {audience}/{trigger}")
        return False

    # ── Send ──────────────────────────────────────────────────────────────
    has_resend = await ensure_resend_api_key()
    if not has_resend:
        logger.warning("[accounts] Resend not configured — skipping send")
        return False

    bcc = ESCALATION_BCC if trigger == "T+7" else None

    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": subject,
        "html": body_html,
    }
    if bcc:
        params["bcc"] = bcc

    try:
        response = await asyncio.to_thread(resend.Emails.send, params)
        email_id = response.get("id") if isinstance(response, dict) else None
    except Exception as exc:
        logger.exception(f"[accounts] Resend send failed for {recipient_email}: {exc}")
        # Do NOT persist the dedupe log on failure so the next run retries
        return False

    # ── Persist dedupe log ────────────────────────────────────────────────
    await db.accounts_reminder_log.insert_one({
        **log_key,
        "audience": audience,
        "recipient_email": recipient_email,
        "recipient_name": recipient_name,
        "subject": subject,
        "due_date": due_str,
        "amount": tranche.get("amount"),
        "email_id": email_id,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })

    logger.info(f"[accounts] Sent {audience}/{trigger} to {recipient_email} for {school.get('school_name')}")
    return True


# ── Daily scheduler entry-point ─────────────────────────────────────────────
async def run_accounts_reminders() -> dict:
    """Daily 9:00 AM IST job.

    Walks every active/converted/renewed school whose
    `accounts_reminders_enabled` flag is not explicitly False, and sends one
    reminder per (tranche × trigger) that matches today's offsets.
    """
    today = _today_ist()
    schools = await db.school_inquiries.find(
        {
            "status": {"$in": ["converted", "active", "renewed"]},
            "accounts_reminders_enabled": {"$ne": False},
        },
        {"_id": 0},
    ).to_list(length=None)

    sent = 0
    skipped = 0
    examined = 0
    for school in schools:
        onboarding = school.get("onboarding_data") or {}
        tranches = onboarding.get("payment_tranches") or []
        school_payments = school.get("payments") or []
        for idx, tranche in enumerate(tranches):
            examined += 1
            # Skip if there is a recorded payment marked paid
            existing_pay = next(
                (p for p in school_payments if p.get("tranche_index") == idx),
                None,
            )
            status = (existing_pay or {}).get("status") or tranche.get("status") or "pending"
            if status == "paid":
                skipped += 1
                continue

            due_d = _parse_due_date(tranche.get("date") or "")
            if not due_d:
                skipped += 1
                continue

            days_to_due = (due_d - today).days
            trigger = _trigger_for_diff(days_to_due)
            if not trigger:
                skipped += 1
                continue

            try:
                ok = await _send_reminder(
                    school=school,
                    tranche=tranche,
                    tranche_index=idx,
                    trigger=trigger,
                    days_to_due=days_to_due,
                )
                if ok:
                    sent += 1
                else:
                    skipped += 1
            except Exception:
                logger.exception(
                    f"[accounts] reminder failed for school={school.get('id')} tranche={idx}"
                )
                skipped += 1

    summary = {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "today_ist": today.isoformat(),
        "schools_examined": len(schools),
        "tranches_examined": examined,
        "sent": sent,
        "skipped": skipped,
    }
    logger.info(f"[accounts] Daily reminder run complete: {summary}")
    return summary


# ── Admin endpoints ─────────────────────────────────────────────────────────
@router.post("/admin/accounts-reminders/run-now")
async def admin_run_accounts_reminders(user: dict = Depends(get_current_user)):
    """Admin manual trigger — runs the daily reminder pass immediately.

    Useful for testing or for one-off catch-up after credentials were fixed.
    Dedupe still applies, so already-sent reminders won't go out again.
    """
    if (user.get("role") or "").lower() not in {"admin", "super_admin"} and not (user.get("email") or "").endswith("@oll.co"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return await run_accounts_reminders()


@router.get("/admin/accounts-reminders/templates")
async def admin_list_templates(user: dict = Depends(get_current_user)):
    """List all configured (audience, trigger) → (subject, body) templates."""
    if (user.get("role") or "").lower() not in {"admin", "super_admin"} and not (user.get("email") or "").endswith("@oll.co"):
        raise HTTPException(status_code=403, detail="Admin access required")
    out = []
    for (audience, trigger), (subject, body) in TEMPLATES.items():
        out.append({
            "audience": audience,
            "trigger": trigger,
            "subject": subject,
            "body_html": body.strip(),
        })
    return {"templates": out}


@router.get("/admin/accounts-reminders/log")
async def admin_reminder_log(
    school_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    """Recent reminder send log. Filter by school_id when provided."""
    if (user.get("role") or "").lower() not in {"admin", "super_admin"} and not (user.get("email") or "").endswith("@oll.co"):
        raise HTTPException(status_code=403, detail="Admin access required")
    q: dict = {}
    if school_id:
        q["school_id"] = school_id
    rows = await db.accounts_reminder_log.find(q, {"_id": 0}).sort("sent_at", -1).to_list(length=max(1, min(limit, 500)))
    return {"count": len(rows), "rows": rows}
