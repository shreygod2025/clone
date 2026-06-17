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

# Accounts emails are sent from a dedicated mailbox so they're easy to triage
# and reply to. This overrides the global SENDER_EMAIL ("OLL Team <welcome@oll.co>")
# for this scheduler only.
ACCOUNTS_FROM_EMAIL = "Anjali, OLL Accounts <support@oll.co>"

# Escalation recipients on T+7 trigger
ESCALATION_BCC = ["clonefutura@gmail.com", "lavisha@oll.co"]

# ── Approved templates (Anjali, OLL Accounts voice) ─────────────────────────
# Variables filled in at send time:
#   {name}        — recipient's first name (accountant / principal / distributor contact)
#   {school}      — school name (e.g. "Khyati World School")
#   {program}     — program label (e.g. "Robotics Program" — derived from offering)
#   {due_date}    — short due date, "30 Jun"
# Each entry is a (subject, body_html) tuple. Body uses simple <p> blocks so
# the email renders well across Gmail, Outlook and mobile clients.

_T_T_MINUS_7 = (
    "Reminder · Invoice for {program} at {school} due {due_date}",
    """
    <p>Hi {name},</p>
    <p>Just a gentle reminder, the invoice for the {program} at
    {school} is due next Monday, {due_date}.</p>
    <p>If you're already on top of it, please ignore this note.</p>
    <p>Thank you so much!</p>
    <p>Warm regards,<br/>Anjali<br/>Accounts, OLL</p>
    """,
)

_T_T_MINUS_2 = (
    "Payment due in 2 days · {program} at {school}",
    """
    <p>Hi {name},</p>
    <p>Quick gentle nudge, payment for the {program} at {school}
    is due in 2 days, on {due_date}.</p>
    <p>If the transfer is already in the works, do share the UTR whenever
    it's done. Thanks a ton for staying on top of this!</p>
    <p>Warm regards,<br/>Anjali<br/>Accounts, OLL</p>
    """,
)

_T_DUE_TODAY = (
    "Payment due today, {program} at {school}",
    """
    <p>Hi {name},</p>
    <p>Today's the due date for the invoice for the {program} at
    {school}.</p>
    <p>I'm attaching the PDF here just so you have it handy. Once the
    payment is processed do share the UTR, and I'll mark this off and send
    you the receipt right away.</p>
    <p>Thank you!</p>
    <p>Warm regards,<br/>Anjali<br/>Accounts, OLL</p>
    """,
)

_T_T_PLUS_1 = (
    "Quick check on the {program} at {school} payment",
    """
    <p>Hi {name},</p>
    <p>The payment for the {program} at {school} was due yesterday and
    I haven't seen it come through yet. Just a quick check to make sure
    things are moving smoothly on your end.</p>
    <p>If the transfer has been initiated, do share the UTR whenever you
    have it. Appreciate your help!</p>
    <p>Warm regards,<br/>Anjali<br/>Accounts, OLL</p>
    """,
)

_T_T_PLUS_3 = (
    "Checking in on the {program} at {school}, 3 days overdue",
    """
    <p>Hi {name},</p>
    <p>Hope you're doing well. Looping back on the invoice for the
    {program} at {school}, it's now 3 days past the due date and I
    wanted to check in.</p>
    <p>Could you let me know roughly when we can expect the transfer?
    Even an estimated date helps us plan things on this side. Truly
    appreciate it!</p>
    <p>Warm regards,<br/>Anjali<br/>Accounts, OLL</p>
    """,
)

_T_T_PLUS_7 = (
    "The {program} at {school} invoice, 1 week overdue",
    """
    <p>Hi {name},</p>
    <p>Just touching base again on the invoice for the {program} at
    {school}, it's now a week past the due date.</p>
    <p>If there's anything blocking it on your side, please let me know
    and I'll do my best to help sort it. Otherwise, would really
    appreciate a quick line on when the payment is likely to be
    released.</p>
    <p>Thank you for the help.</p>
    <p>Warm regards,<br/>Anjali<br/>Accounts, OLL</p>
    """,
)

# Unified template map. Same warm Anjali voice is used for both school and
# distributor pathways — only the recipient resolution differs.
TEMPLATES: dict[str, tuple[str, str]] = {
    "T-7": _T_T_MINUS_7,
    "T-2": _T_T_MINUS_2,
    "T0":  _T_DUE_TODAY,
    "T+1": _T_T_PLUS_1,
    "T+3": _T_T_PLUS_3,
    "T+7": _T_T_PLUS_7,
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


def _first_name(full_name: str) -> str:
    """Anjali's templates use the recipient's first name (e.g. 'Hi Rohini')."""
    parts = (full_name or "").strip().split()
    return parts[0] if parts else "there"


def _program_label(offering: str) -> str:
    """Compose the '{program}' label used in the email copy.

    Templates read like: "the {program} at {school}". We want this to
    produce phrases such as "the Robotics program", "the Robotics & AI
    program" — so we append " program" only if the offering name doesn't
    already include the word."""
    base = (offering or "").strip()
    if not base:
        return "Robotics program"
    if "program" in base.lower():
        return base
    return f"{base} program"


def _fmt_short_date(d: date) -> str:
    """Anjali's copy uses '30 Jun' (no year)."""
    return d.strftime("%-d %b") if hasattr(d, "strftime") else str(d)


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

    # Template lookup — single dict keyed on trigger (school + distributor
    # share the same warm Anjali voice; only the recipient changes).
    tpl = TEMPLATES.get(trigger)
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
    due_display = _fmt_short_date(due_d) if due_d else (due_str or "—")

    fmt_ctx = {
        "name": _first_name(recipient_name),
        "school": school.get("school_name") or "your school",
        "program": _program_label(onboarding.get("offering") or ""),
        "due_date": due_display,
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
        "from": ACCOUNTS_FROM_EMAIL,
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
                    # Resend allows 5 req/sec; pace ourselves to stay safely
                    # below that even when many schools share the same
                    # trigger.
                    await asyncio.sleep(0.25)
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
    for trigger, (subject, body) in TEMPLATES.items():
        out.append({
            "trigger": trigger,
            "subject": subject,
            "body_html": body.strip(),
        })
    return {"templates": out, "from": ACCOUNTS_FROM_EMAIL, "escalation_bcc": ESCALATION_BCC}


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
