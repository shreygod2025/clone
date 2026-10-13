"""Task reminders — email nudges + daily digest.

Three triggers (all cron-driven, idempotent, keyed on fields on each task doc):

  1. **6-hour follow-up** — when a task is still open 6 h after creation and
     we haven't sent the 6 h reminder yet (`reminder_6h_sent_at` is unset),
     email the assignee.
  2. **24-hour follow-up** — same shape, but at 24 h. Only fires if the 6 h
     reminder already went out, so we don't double-ping brand-new tasks.
  3. **Daily 9 AM IST digest** — one email per assignee listing every open
     task they own with "days overdue" and the due date.

Cron endpoints land under `/api/cron/*` so Emergent's scheduler can hit
them without auth friction. All endpoints are idempotent on repeat calls.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import resend
from fastapi import APIRouter, Header, HTTPException

from database import db
from routes.admin_keys import get_resend_api_key

logger = logging.getLogger(__name__)
router = APIRouter()

FROM_EMAIL = os.environ.get("TASKS_FROM_EMAIL", "OLL Tasks <tasks@oll.co>")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "https://oll.co").rstrip("/")

OPEN_STATUSES = {"todo", "in_progress", "blocked", "needs_review", "pending", "open"}

# ────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────

async def _lookup_user(user_id: str) -> dict:
    if not user_id:
        return {}
    u = await db.team_users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    if u:
        return u
    a = await db.admins.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    return a or {}


def _render_shell(title: str, preheader: str, body_html: str) -> str:
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
<span style="display:none !important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">{preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
      <tr><td style="background:linear-gradient(135deg,#0A1F44 0%,#1E3A5F 100%);padding:22px 28px;color:#ffffff;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#FCA5A5;">OLL · Tasks</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px;">{title}</div>
      </td></tr>
      <tr><td style="padding:28px;">{body_html}</td></tr>
      <tr><td style="padding:14px 28px;background:#f8fafc;color:#64748b;font-size:11px;">
        You're receiving this because a task is still open in your OLL inbox.
        <a href="{APP_BASE_URL}/admin/tasks" style="color:#DC2626;text-decoration:underline;">Open Tasks →</a>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""


async def _send_email(to_email: str, subject: str, html: str) -> bool:
    api_key = await get_resend_api_key()
    if not api_key:
        logger.warning("[task-reminders] no RESEND key — skipping email to %s", to_email)
        return False
    resend.api_key = api_key
    try:
        await asyncio.to_thread(
            resend.Emails.send,
            {"from": FROM_EMAIL, "to": [to_email], "subject": subject, "html": html, "reply_to": "tasks@oll.co"},
        )
        return True
    except Exception as e:
        logger.warning("[task-reminders] resend failed for %s: %s", to_email, e)
        return False


def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        v = s.replace("Z", "+00:00") if isinstance(s, str) else s
        dt = datetime.fromisoformat(v) if isinstance(v, str) else v
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _days_overdue(due: Optional[str]) -> Optional[int]:
    dt = _parse_dt(due)
    if not dt:
        return None
    delta = datetime.now(timezone.utc).date() - dt.date()
    return delta.days  # negative = future, 0 = today, positive = overdue


# ────────────────────────────────────────────────────────────
# Email bodies
# ────────────────────────────────────────────────────────────

def _single_task_card(task: dict, assigner_name: str = "") -> str:
    overdue = _days_overdue(task.get("due_date"))
    due_line = ""
    if task.get("due_date"):
        due_line = f"<div style='font-size:12px;color:#64748b;margin-top:6px;'>Due <strong>{task['due_date']}</strong>"
        if overdue is not None and overdue > 0:
            due_line += f" · <span style='color:#DC2626;font-weight:700;'>{overdue} day{'s' if overdue != 1 else ''} overdue</span>"
        due_line += "</div>"
    priority = (task.get("priority") or "").upper()
    pri_badge = ""
    if priority in ("HIGH", "URGENT"):
        pri_badge = f"<span style='display:inline-block;padding:2px 8px;border-radius:999px;background:#FEE2E2;color:#B91C1C;font-size:10px;font-weight:700;margin-left:6px;'>{priority}</span>"
    elif priority == "MEDIUM":
        pri_badge = "<span style='display:inline-block;padding:2px 8px;border-radius:999px;background:#FEF3C7;color:#B45309;font-size:10px;font-weight:700;margin-left:6px;'>MEDIUM</span>"
    desc = (task.get("description") or "")[:220]
    code = task.get("code") or ""
    assigner_line = f"<div style='font-size:11px;color:#94a3b8;margin-top:8px;'>Assigned by {assigner_name}</div>" if assigner_name else ""
    return f"""
    <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:12px 0;background:#f8fafc;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">{code}</div>
      <div style="font-size:15px;font-weight:700;color:#0A1F44;margin-top:4px;">{task.get('title','')} {pri_badge}</div>
      {('<div style="font-size:13px;color:#475569;margin-top:6px;">' + desc + '</div>') if desc else ''}
      {due_line}
      {assigner_line}
    </div>
    """


def _6h_body_html(task: dict, assigner_name: str) -> str:
    return f"""
    <div style="font-size:14px;color:#334155;line-height:1.6;">
      Quick nudge — this task was assigned to you <strong>6 hours ago</strong> and is still open.
      Could you take a look and update the status when you get a chance?
    </div>
    {_single_task_card(task, assigner_name)}
    <a href="{APP_BASE_URL}/admin/tasks" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#DC2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">Open task →</a>
    """


def _24h_body_html(task: dict, assigner_name: str) -> str:
    return f"""
    <div style="font-size:14px;color:#334155;line-height:1.6;">
      Second nudge — this task has been open for <strong>24 hours</strong> and still hasn't been marked complete.
      Please update the status (or reassign) today.
    </div>
    {_single_task_card(task, assigner_name)}
    <a href="{APP_BASE_URL}/admin/tasks" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#DC2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">Open task →</a>
    """


def _digest_body_html(name: str, tasks: List[dict]) -> str:
    tasks_sorted = sorted(tasks, key=lambda t: (_days_overdue(t.get("due_date")) or -9999), reverse=True)
    total = len(tasks_sorted)
    overdue_count = sum(1 for t in tasks_sorted if (_days_overdue(t.get("due_date")) or -1) > 0)
    header = f"""
    <div style="font-size:14px;color:#334155;line-height:1.6;">
      Good morning {name.split(' ')[0] if name else 'there'} — here's your task snapshot for today.
    </div>
    <div style="display:flex;gap:12px;margin:14px 0 4px 0;">
      <div style="flex:1;padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Open tasks</div>
        <div style="font-size:22px;font-weight:800;color:#0A1F44;">{total}</div>
      </div>
      <div style="flex:1;padding:12px 14px;border:1px solid {'#FECACA' if overdue_count else '#e2e8f0'};border-radius:10px;background:{'#FEF2F2' if overdue_count else '#f8fafc'};">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Overdue</div>
        <div style="font-size:22px;font-weight:800;color:{'#DC2626' if overdue_count else '#0A1F44'};">{overdue_count}</div>
      </div>
    </div>
    """
    cards = "".join(_single_task_card(t) for t in tasks_sorted[:20])
    extra_note = ""
    if total > 20:
        extra_note = f"<div style='font-size:12px;color:#64748b;margin-top:8px;text-align:center;'>+ {total - 20} more open tasks — see the dashboard.</div>"
    cta = f'<a href="{APP_BASE_URL}/admin/tasks" style="display:inline-block;margin-top:10px;padding:10px 18px;background:#DC2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">Open my tasks →</a>'
    return header + cards + extra_note + cta


# ────────────────────────────────────────────────────────────
# Cron endpoints
#   Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
# ────────────────────────────────────────────────────────────

def _check_cron_secret(x_cron_secret: Optional[str]):
    expected = os.environ.get("WEBHOOK_CRON_SECRET") or ""
    if expected and x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Bad cron secret")


async def _tasks_due_for_reminder(window_hours: int, already_sent_field: str, prereq_field: Optional[str] = None) -> list[dict]:
    """Return open tasks whose `created_at` is between `window_hours` and
    `window_hours + 2h` ago AND haven't been reminded yet. A 2-hour window
    gives the hourly cron slack so no task slips through even if a run is
    delayed."""
    now = datetime.now(timezone.utc)
    lower = (now - timedelta(hours=window_hours + 2)).isoformat()
    upper = (now - timedelta(hours=window_hours)).isoformat()
    q: dict = {
        "created_at": {"$gte": lower, "$lte": upper},
        "status": {"$in": list(OPEN_STATUSES)},
        already_sent_field: {"$exists": False},
    }
    if prereq_field:
        q[prereq_field] = {"$exists": True}
    out = []
    async for t in db.tasks.find(q, {"_id": 0}):
        out.append(t)
    return out


async def _send_reminder_batch(tasks: list[dict], stage: str) -> dict:
    """Send 6h or 24h reminder for each task; mark the task so we don't
    double-send. Returns a summary dict."""
    sent, failed, skipped = 0, 0, 0
    now_iso = datetime.now(timezone.utc).isoformat()
    for t in tasks:
        assignee = await _lookup_user(t.get("assigned_to", ""))
        assignee_email = (assignee.get("email") or "").strip()
        if not assignee_email:
            skipped += 1
            continue
        assigner = await _lookup_user(t.get("assigned_by", ""))
        assigner_name = assigner.get("name") or assigner.get("email", "")
        if stage == "6h":
            subject = f"Nudge: {t.get('title','your task')} is still open"
            html = _render_shell("6-hour reminder", t.get("title", ""), _6h_body_html(t, assigner_name))
            field = "reminder_6h_sent_at"
        else:
            subject = f"Still open after 24h: {t.get('title','your task')}"
            html = _render_shell("24-hour reminder", t.get("title", ""), _24h_body_html(t, assigner_name))
            field = "reminder_24h_sent_at"
        ok = await _send_email(assignee_email, subject, html)
        if ok:
            sent += 1
            await db.tasks.update_one({"id": t["id"]}, {"$set": {field: now_iso}})
        else:
            failed += 1
    return {"sent": sent, "failed": failed, "skipped": skipped, "total": len(tasks)}


@router.post("/cron/task-reminder-6h")
async def cron_task_reminder_6h(x_cron_secret: Optional[str] = Header(None)):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _check_cron_secret(x_cron_secret)

    async def _run():
        try:
            tasks = await _tasks_due_for_reminder(6, "reminder_6h_sent_at")
            result = await _send_reminder_batch(tasks, "6h")
            logger.info("[task-reminders] 6h bg done %s", result)
        except Exception as e:
            logger.exception("[task-reminders] 6h bg failed: %s", e)

    asyncio.create_task(_run())
    return {"ok": True, "queued": True}


@router.post("/cron/task-reminder-24h")
async def cron_task_reminder_24h(x_cron_secret: Optional[str] = Header(None)):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _check_cron_secret(x_cron_secret)

    async def _run():
        try:
            tasks = await _tasks_due_for_reminder(24, "reminder_24h_sent_at", prereq_field="reminder_6h_sent_at")
            result = await _send_reminder_batch(tasks, "24h")
            logger.info("[task-reminders] 24h bg done %s", result)
        except Exception as e:
            logger.exception("[task-reminders] 24h bg failed: %s", e)

    asyncio.create_task(_run())
    return {"ok": True, "queued": True}


@router.post("/cron/task-daily-digest")
async def cron_task_daily_digest(x_cron_secret: Optional[str] = Header(None)):
    """9 AM IST digest: group open tasks by assignee and email each one a
    personalised snapshot."""
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _check_cron_secret(x_cron_secret)

    async def _run():
        try:
            cursor = db.tasks.find({"status": {"$in": list(OPEN_STATUSES)}}, {"_id": 0})
            buckets: dict[str, list[dict]] = {}
            async for t in cursor:
                uid = (t.get("assigned_to") or "").strip()
                if not uid:
                    continue
                buckets.setdefault(uid, []).append(t)

            sent, failed, skipped = 0, 0, 0
            for uid, tasks in buckets.items():
                u = await _lookup_user(uid)
                email = (u.get("email") or "").strip()
                if not email:
                    skipped += 1
                    continue
                name = u.get("name") or email.split("@")[0]
                html = _render_shell("Your tasks for today", f"{len(tasks)} open · daily digest", _digest_body_html(name, tasks))
                overdue_in_bucket = sum(1 for t in tasks if (_days_overdue(t.get('due_date')) or -1) > 0)
                subject = f"Your tasks today — {len(tasks)} open" + (f" ({overdue_in_bucket} overdue)" if overdue_in_bucket else "")
                ok = await _send_email(email, subject, html)
                if ok:
                    sent += 1
                else:
                    failed += 1
            logger.info(
                "[task-reminders] digest bg done sent=%d failed=%d skipped=%d buckets=%d",
                sent, failed, skipped, len(buckets),
            )
        except Exception as e:
            logger.exception("[task-reminders] digest bg failed: %s", e)

    asyncio.create_task(_run())
    return {"ok": True, "queued": True}


# ────────────────────────────────────────────────────────────
# Admin convenience: run on demand without the cron secret, for testing
# ────────────────────────────────────────────────────────────

@router.post("/admin/tasks/run-reminders-now")
async def admin_run_reminders_now(stage: str = "6h"):
    """Fires the chosen reminder pass synchronously so an admin can test
    the whole pipeline (template, Resend delivery, Mongo flag) from the
    UI without waiting for cron. `stage` ∈ {`6h`, `24h`, `digest`}."""
    if stage == "6h":
        tasks = await _tasks_due_for_reminder(6, "reminder_6h_sent_at")
        return await _send_reminder_batch(tasks, "6h")
    if stage == "24h":
        tasks = await _tasks_due_for_reminder(24, "reminder_24h_sent_at", prereq_field="reminder_6h_sent_at")
        return await _send_reminder_batch(tasks, "24h")
# ────────────────────────────────────────────────────────────
# Admin: send a one-off reminder for a specific task from the UI
# ────────────────────────────────────────────────────────────

from fastapi import Depends
from routes.shared import get_current_user


@router.post("/admin/tasks/{task_id}/send-reminder")
async def admin_send_task_reminder(task_id: str, user: dict = Depends(get_current_user)):
    """Fire a single reminder email to the task's assignee right now,
    irrespective of 6h / 24h timers. Used by the per-task "Send Reminder"
    button on `/admin/tasks`."""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    assignee = await _lookup_user(task.get("assigned_to", ""))
    email = (assignee.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Assignee has no email on file")
    assigner = await _lookup_user(task.get("assigned_by", ""))
    assigner_name = assigner.get("name") or assigner.get("email", "") or (user.get("name") or user.get("email", ""))

    body = f"""
    <div style="font-size:14px;color:#334155;line-height:1.6;">
      Friendly reminder — the task below is still open. Please update the status when you've made progress.
    </div>
    {_single_task_card(task, assigner_name)}
    <a href="{APP_BASE_URL}/admin/tasks" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#DC2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">Open task →</a>
    """
    html = _render_shell("Reminder from your manager", task.get("title", ""), body)
    subject = f"Reminder: {task.get('title','your task')}"
    ok = await _send_email(email, subject, html)
    if not ok:
        raise HTTPException(status_code=502, detail="Email provider unreachable")
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"last_manual_reminder_at": now_iso}, "$inc": {"manual_reminder_count": 1}},
    )
    return {"ok": True, "to": email, "sent_at": now_iso}


@router.post("/admin/tasks/send-reminders-overdue")
async def admin_send_reminders_overdue(
    assignee_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Fire a one-off reminder for every open task that is OVERDUE (due date
    strictly before today).

    - `assignee_id` (optional) scopes the sweep to a single team member —
      used by the per-member "Nudge Overdue" button in `/admin/my-team`.
    - Without it, sweeps every assignee — used by the global toolbar
      button in `/admin/tasks`.

    Groups tasks per assignee and sends ONE email with every overdue task
    in a tidy card list, so a person with 5 overdue tasks gets a single
    nudge instead of 5 separate emails.
    """
    now_utc = datetime.now(timezone.utc)
    today = now_utc.date().isoformat()

    q: dict = {
        "status": {"$in": list(OPEN_STATUSES)},
        "due_date": {"$ne": None, "$lt": today},
    }
    if assignee_id:
        q["assigned_to"] = assignee_id

    buckets: dict[str, list[dict]] = {}
    async for t in db.tasks.find(q, {"_id": 0}):
        uid = (t.get("assigned_to") or "").strip()
        if not uid:
            continue
        buckets.setdefault(uid, []).append(t)

    sent, failed, skipped = 0, 0, 0
    now_iso = now_utc.isoformat()
    actor = user.get("name") or user.get("email", "your manager")

    for uid, tasks in buckets.items():
        u = await _lookup_user(uid)
        email = (u.get("email") or "").strip()
        if not email:
            skipped += 1
            continue
        name = u.get("name") or email.split("@")[0]
        cards = "".join(_single_task_card(t) for t in tasks)
        overdue_count = len(tasks)
        body = f"""
        <div style="font-size:14px;color:#334155;line-height:1.6;">
          Hey {name.split(' ')[0]} — <strong>{overdue_count}</strong> of your task{'s are' if overdue_count != 1 else ' is'} past the due date.
          A quick nudge from {actor} to update the status today.
        </div>
        {cards}
        <a href="{APP_BASE_URL}/admin/tasks" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#DC2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">Open my tasks →</a>
        """
        subject = f"Overdue nudge — {overdue_count} task{'s' if overdue_count != 1 else ''} need{'s' if overdue_count == 1 else ''} attention"
        html = _render_shell(f"{overdue_count} overdue task{'s' if overdue_count != 1 else ''}", subject, body)
        ok = await _send_email(email, subject, html)
        if ok:
            sent += 1
            # Mark each task so admins can see "last manual reminder" in UI
            ids = [t.get("id") for t in tasks if t.get("id")]
            if ids:
                await db.tasks.update_many(
                    {"id": {"$in": ids}},
                    {"$set": {"last_manual_reminder_at": now_iso}, "$inc": {"manual_reminder_count": 1}},
                )
        else:
            failed += 1
    return {
        "ok": True,
        "assignees_notified": sent,
        "assignees_failed": failed,
        "assignees_skipped_no_email": skipped,
        "overdue_tasks_total": sum(len(v) for v in buckets.values()),
    }

