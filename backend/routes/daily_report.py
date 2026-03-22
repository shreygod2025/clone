"""
Daily Report Emailer — OLL Platform
Sends 5 separate category reports to configured recipients every day at 8 PM IST.
"""
import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from collections import defaultdict

import resend
from fastapi import APIRouter, Depends, HTTPException

from database import db
from routes.admin_keys import get_current_user, get_resend_api_key

logger = logging.getLogger(__name__)
router = APIRouter()

REPORT_RECIPIENTS = [
    "shreyaan@oll.co",
    "lavisha@oll.co",
    "clonefutura@gmail.com",
]
REPORT_FROM = "OLL Reports <reports@oll.co>"

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def day_range():
    """Return (start, end) for today in UTC corresponding to IST calendar day."""
    # IST = UTC+5:30
    now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    end_ist = start_ist + timedelta(days=1)
    start_utc = start_ist - timedelta(hours=5, minutes=30)
    end_utc = end_ist - timedelta(hours=5, minutes=30)
    return start_utc.isoformat(), end_utc.isoformat()


def fmt_date():
    now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    return now_ist.strftime("%d %b %Y")


def count_by(items, field):
    counts = defaultdict(int)
    for item in items:
        val = item.get(field) or "Unknown"
        if isinstance(val, list):
            for v in val:
                counts[v or "Unknown"] += 1
        else:
            counts[str(val)] += 1
    return dict(sorted(counts.items(), key=lambda x: -x[1]))


def pct(a, b):
    return f"{round(a / b * 100)}%" if b else "0%"


# ─────────────────────────────────────────────
# HTML Email Helpers
# ─────────────────────────────────────────────

COLORS = {
    "support":  "#e55a2b",
    "b2c":      "#1a56db",
    "gp":       "#057a55",
    "team":     "#7e3af2",
    "educator": "#c27803",
    "accounts": "#0f766e",
    "b2b":      "#be185d",
}

BASE_STYLE = """
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
  .wrap { max-width: 640px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .header { padding: 28px 32px 20px; color: #fff; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .header p  { margin: 4px 0 0; font-size: 13px; opacity: .85; }
  .body { padding: 24px 32px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin-bottom: 10px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
  .kpi .val { font-size: 26px; font-weight: 700; color: #1e293b; line-height: 1.1; }
  .kpi .lbl { font-size: 11px; color: #64748b; margin-top: 3px; }
  table.breakdown { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.breakdown th { text-align: left; color: #64748b; font-weight: 600; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  table.breakdown td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }
  table.breakdown tr:last-child td { border-bottom: none; }
  .pill { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 11px; font-weight: 600; }
  .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 18px 0; }
</style>
"""


def kpi(val, label, sub=None):
    sub_html = f'<div class="lbl">{sub}</div>' if sub else ''
    return f'<div class="kpi"><div class="val">{val}</div><div class="lbl">{label}</div>{sub_html}</div>'


def breakdown_table(data: dict, title="", max_rows=8):
    if not data:
        return f'<p style="color:#94a3b8;font-size:13px">No data</p>'
    rows = ""
    for k, v in list(data.items())[:max_rows]:
        rows += f"<tr><td>{k}</td><td style='text-align:right;font-weight:600'>{v}</td></tr>"
    return f"""
    {'<div class="section-title">' + title + '</div>' if title else ''}
    <table class='breakdown'><thead><tr><th>Category</th><th style='text-align:right'>Count</th></tr></thead>
    <tbody>{rows}</tbody></table>"""


def email_wrap(color, icon_char, title, date_str, body_html):
    return f"""<!DOCTYPE html><html><head>{BASE_STYLE}</head><body>
    <div class="wrap">
      <div class="header" style="background: linear-gradient(135deg,{color} 0%,{color}cc 100%)">
        <h1>{icon_char} {title}</h1>
        <p>Daily Report — {date_str} &nbsp;|&nbsp; OLL Platform</p>
      </div>
      <div class="body">{body_html}</div>
      <div class="footer">OLL Platform &mdash; Automated Daily Report &mdash; Do not reply</div>
    </div>
    </body></html>"""


# ─────────────────────────────────────────────
# Data Fetchers
# ─────────────────────────────────────────────

async def fetch_support_data(start, end):
    query = {"created_at": {"$gte": start, "$lt": end}}
    today = await db.support_queries.find(query, {"_id": 0}).to_list(2000)
    all_open = await db.support_queries.find({"status": {"$in": ["open", "in_progress"]}}, {"_id": 0}).to_list(2000)
    overdue = await db.support_queries.find({
        "status": {"$in": ["open", "in_progress"]},
        "created_at": {"$lt": (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()}
    }, {"_id": 0}).to_list(500)
    solved_today = [q for q in today if q.get("status") == "resolved"]
    # Avg resolution time in hours for today's solved
    res_times = []
    for q in solved_today:
        c = q.get("created_at") or ""
        r = q.get("resolved_at") or q.get("updated_at") or ""
        if c and r:
            try:
                dt_c = datetime.fromisoformat(c.replace("Z", "+00:00"))
                dt_r = datetime.fromisoformat(r.replace("Z", "+00:00"))
                res_times.append((dt_r - dt_c).total_seconds() / 3600)
            except Exception:
                pass
    avg_res = round(sum(res_times) / len(res_times), 1) if res_times else None
    return dict(
        new_queries=len(today),
        categories=count_by(today, "query_type"),
        sub_categories=count_by(today, "related_to"),
        user_types=count_by(today, "user_type"),
        sources=count_by(today, "source"),
        open_total=len(all_open),
        overdue=len(overdue),
        solved_today=len(solved_today),
        avg_resolution_hrs=avg_res,
    )


async def fetch_b2c_data(start, end):
    query = {"created_at": {"$gte": start, "$lt": end}}
    today = await db.student_inquiries.find(query, {"_id": 0}).to_list(2000)
    converted = [l for l in today if l.get("status") == "converted"]
    demos = [l for l in today if l.get("status") in ("demo_completed", "converted")]
    revenue = sum(
        float(str(l.get("conversion_amount", 0)).replace(",", "") or 0)
        for l in converted
    )
    return dict(
        new_leads=len(today),
        courses=count_by(today, "skill"),
        age_groups=count_by(today, "age_group"),
        goals=count_by(today, "learning_goal"),
        sources=count_by(today, "source"),
        demos_completed=len(demos),
        demo_ratio=pct(len(demos), len(today)),
        conversions=len(converted),
        revenue=revenue,
        conversion_ratio=pct(len(converted), len(today)),
        avg_order_value=round(revenue / len(converted), 0) if converted else 0,
    )


async def fetch_gp_data(start, end):
    query = {"created_at": {"$gte": start, "$lt": end}}
    today = await db.growth_partners.find(query, {"_id": 0}).to_list(1000)
    onboarded = [p for p in today if p.get("status") in ("converted", "onboarded")]
    return dict(
        new_applicants=len(today),
        cities=count_by(today, "city"),
        onboarded=len(onboarded),
        onboard_pct=pct(len(onboarded), len(today)),
    )


async def fetch_team_data(start, end):
    query = {"created_at": {"$gte": start, "$lt": end}}
    today = await db.team_applications.find(query, {"_id": 0}).to_list(1000)
    onboarded = [a for a in today if a.get("status") in ("hired", "onboarded")]
    requirements = await db.team_requirements.find(
        {"status": {"$ne": "closed"}}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return dict(
        new_applicants=len(today),
        roles=count_by(today, "role"),
        onboarded=len(onboarded),
        onboard_pct=pct(len(onboarded), len(today)),
        open_requirements=requirements,
    )


async def fetch_educator_data(start, end):
    query = {"created_at": {"$gte": start, "$lt": end}}
    today = await db.educator_applications.find(query, {"_id": 0}).to_list(1000)
    tech_round = [e for e in today if e.get("status") in ("tech_scheduled", "hr_done", "demo_completed")]
    onboarded = [e for e in today if e.get("status") == "onboarded"]
    # Compute average rating from all-time (not just today)
    rated = await db.educator_applications.find(
        {"demo_rating.overall": {"$exists": True}}, {"demo_rating": 1, "_id": 0}
    ).to_list(2000)
    ratings = [r["demo_rating"].get("overall") for r in rated if r.get("demo_rating")]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None
    requirements = await db.open_requirements.find(
        {"status": {"$ne": "closed"}}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return dict(
        new_applicants=len(today),
        skills=count_by(today, "skills"),
        tech_round=len(tech_round),
        tech_pct=pct(len(tech_round), len(today)),
        onboarded=len(onboarded),
        onboard_pct=pct(len(onboarded), len(today)),
        avg_rating=avg_rating,
        open_requirements=requirements,
    )


# ─────────────────────────────────────────────
# Email Builders
# ─────────────────────────────────────────────

def build_support_email(d, date_str):
    avg_res = f"{d['avg_resolution_hrs']}h" if d['avg_resolution_hrs'] else "—"
    body = f"""
    <div class="kpi-grid">
      {kpi(d['new_queries'], "New Queries Today")}
      {kpi(d['open_total'], "Open Queries", "All Time")}
      {kpi(d['overdue'], "Overdue", "> 48h open")}
      {kpi(d['solved_today'], "Resolved Today")}
      {kpi(avg_res, "Avg Resolution Time")}
    </div>
    <hr class="divider">
    {breakdown_table(d['categories'], "Query Categories")}
    {breakdown_table(d['sub_categories'], "Sub-Categories")}
    {breakdown_table(d['user_types'], "User Type Division")}
    {breakdown_table(d['sources'], "Source Division")}
    """
    return email_wrap(COLORS["support"], "🎧", "Support Report", date_str, body)


def build_b2c_email(d, date_str):
    rev = f"₹{int(d['revenue']):,}" if d['revenue'] else "₹0"
    aov = f"₹{int(d['avg_order_value']):,}" if d['avg_order_value'] else "₹0"
    body = f"""
    <div class="kpi-grid">
      {kpi(d['new_leads'], "New Leads")}
      {kpi(d['demos_completed'], "Demos Completed")}
      {kpi(d['demo_ratio'], "Lead → Demo Rate")}
      {kpi(d['conversions'], "Conversions")}
      {kpi(d['conversion_ratio'], "Conversion Rate")}
      {kpi(rev, "Revenue")}
      {kpi(aov, "Avg Order Value")}
    </div>
    <hr class="divider">
    {breakdown_table(d['courses'], "Course Division")}
    {breakdown_table(d['age_groups'], "Age Group Division")}
    {breakdown_table(d['goals'], "Goal Division")}
    {breakdown_table(d['sources'], "Source Division")}
    """
    return email_wrap(COLORS["b2c"], "📈", "B2C Report", date_str, body)


def build_gp_email(d, date_str):
    body = f"""
    <div class="kpi-grid">
      {kpi(d['new_applicants'], "New Applicants")}
      {kpi(d['onboarded'], "Onboarded Today")}
      {kpi(d['onboard_pct'], "Onboard Rate")}
    </div>
    <hr class="divider">
    {breakdown_table(d['cities'], "City Division")}
    """
    return email_wrap(COLORS["gp"], "🤝", "Growth Partners Report", date_str, body)


def _requirements_table(reqs):
    if not reqs:
        return '<p style="color:#94a3b8;font-size:13px">No open requirements</p>'
    now = datetime.now(timezone.utc)
    rows = ""
    for r in reqs:
        title = r.get("title") or r.get("role") or "Untitled"
        deadline = r.get("deadline") or r.get("close_date") or "—"
        created = r.get("created_at") or ""
        days_open = "—"
        if created:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                days_open = str((now - dt).days) + "d"
            except Exception:
                pass
        rows += f"<tr><td>{title}</td><td style='text-align:center'>{days_open}</td><td style='text-align:center'>{deadline}</td></tr>"
    return f"""
    <table class='breakdown'>
      <thead><tr><th>Requirement</th><th style='text-align:center'>Days Open</th><th style='text-align:center'>Deadline</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>"""


def build_team_email(d, date_str):
    body = f"""
    <div class="kpi-grid">
      {kpi(d['new_applicants'], "New Applicants")}
      {kpi(d['onboarded'], "Onboarded Today")}
      {kpi(d['onboard_pct'], "Onboard Rate")}
    </div>
    <hr class="divider">
    {breakdown_table(d['roles'], "Role Division")}
    <hr class="divider">
    <div class="section-title">Open Requirements ({len(d['open_requirements'])})</div>
    {_requirements_table(d['open_requirements'])}
    """
    return email_wrap(COLORS["team"], "👥", "Team Members Report", date_str, body)


def build_educator_email(d, date_str):
    rating = str(d['avg_rating']) + " / 5" if d['avg_rating'] else "—"
    body = f"""
    <div class="kpi-grid">
      {kpi(d['new_applicants'], "New Applicants")}
      {kpi(d['tech_round'], "Selected for Tech Round")}
      {kpi(d['tech_pct'], "Tech Round Rate")}
      {kpi(d['onboarded'], "Onboarded Today")}
      {kpi(d['onboard_pct'], "Onboard Rate")}
      {kpi(rating, "Avg Rating", "All time")}
    </div>
    <hr class="divider">
    {breakdown_table(d['skills'], "Skill Division")}
    <hr class="divider">
    <div class="section-title">Open Requirements ({len(d['open_requirements'])})</div>
    {_requirements_table(d['open_requirements'])}
    """
    return email_wrap(COLORS["educator"], "🎓", "Educators Report", date_str, body)


# ─────────────────────────────────────────────
# Email Dispatcher
# ─────────────────────────────────────────────

async def _send(subject: str, html: str, api_key: str):
    """Send to all report recipients via Resend."""
    resend.api_key = api_key
    for recipient in REPORT_RECIPIENTS:
        try:
            await asyncio.to_thread(resend.Emails.send, {
                "from": REPORT_FROM,
                "to": recipient,
                "subject": subject,
                "html": html,
            })
            logger.info(f"[DailyReport] Sent '{subject}' to {recipient}")
        except Exception as e:
            logger.error(f"[DailyReport] Failed to send to {recipient}: {e}")
        await asyncio.sleep(0.3)  # Avoid Resend rate limit (5 req/s)


async def send_daily_reports():
    """Main entry — gather all data and fire 7 category emails."""
    logger.info("[DailyReport] Starting daily report generation...")
    api_key = await get_resend_api_key()
    if not api_key:
        logger.warning("[DailyReport] No Resend API key — skipping emails.")
        return

    start, end = day_range()
    date_str = fmt_date()

    try:
        (support_d, b2c_d, gp_d, team_d, educator_d, accounts_d, b2b_d) = await asyncio.gather(
            fetch_support_data(start, end),
            fetch_b2c_data(start, end),
            fetch_gp_data(start, end),
            fetch_team_data(start, end),
            fetch_educator_data(start, end),
            fetch_accounts_data(),
            fetch_b2b_data(start, end),
        )
    except Exception as e:
        logger.error(f"[DailyReport] Data fetch error: {e}")
        return

    emails = [
        (f"[OLL Report] Support — {date_str}",         build_support_email(support_d, date_str)),
        (f"[OLL Report] B2C — {date_str}",              build_b2c_email(b2c_d, date_str)),
        (f"[OLL Report] Growth Partners — {date_str}",  build_gp_email(gp_d, date_str)),
        (f"[OLL Report] Team Members — {date_str}",     build_team_email(team_d, date_str)),
        (f"[OLL Report] Educators — {date_str}",        build_educator_email(educator_d, date_str)),
        (f"[OLL Report] Accounts / Receivables — {date_str}", build_accounts_email(accounts_d, date_str)),
        (f"[OLL Report] B2B CRM — {date_str}",          build_b2b_email(b2b_d, date_str)),
    ]

    for subject, html in emails:
        await _send(subject, html, api_key)
        await asyncio.sleep(1)  # 1s gap between category batches

    logger.info("[DailyReport] All 7 reports dispatched.")


# ─────────────────────────────────────────────
# Accounts Data Fetcher
# ─────────────────────────────────────────────

async def fetch_accounts_data():
    """All school-level payment tranches that are pending or overdue."""
    now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    today_str = now_ist.strftime("%Y-%m-%d")

    schools = await db.school_inquiries.find(
        {"status": {"$in": ["converted", "active", "renewed", "onboarded"]},
         "onboarding_data": {"$ne": None}},
        {"_id": 0, "school_name": 1, "onboarding_data": 1, "id": 1}
    ).to_list(500)

    rows = []
    total_pending = 0.0
    total_overdue = 0.0

    for school in schools:
        name = school.get("school_name", "Unknown")
        od = school.get("onboarding_data") or {}
        tranches = od.get("payment_tranches") or []
        for t in tranches:
            status = (t.get("status") or "pending").lower()
            if status in ("paid", "verified"):
                continue
            amount = float(str(t.get("amount") or 0).replace(",", "") or 0)
            due_date = t.get("due_date") or t.get("date") or "—"
            label = t.get("label") or t.get("description") or "Tranche"
            is_overdue = False
            if due_date != "—":
                try:
                    is_overdue = due_date < today_str
                except Exception:
                    pass
            flag = "overdue" if is_overdue else "pending"
            rows.append({
                "school": name,
                "label": label,
                "amount": amount,
                "due_date": due_date,
                "status": flag,
            })
            total_pending += amount
            if is_overdue:
                total_overdue += amount

    rows.sort(key=lambda x: (x["status"] != "overdue", x["due_date"]))
    return dict(rows=rows, total_pending=total_pending, total_overdue=total_overdue)


# ─────────────────────────────────────────────
# B2B CRM Data Fetcher
# ─────────────────────────────────────────────

async def fetch_b2b_data(start, end):
    """School CRM metrics — all-time totals + tomorrow's meetings/followups."""
    now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    tomorrow_str = (now_ist + timedelta(days=1)).strftime("%Y-%m-%d")

    all_schools = await db.school_inquiries.find({}, {"_id": 0,
        "status": 1, "meeting_date": 1, "followup_date": 1,
        "school_name": 1, "contact_name": 1,
        "conversion_amount": 1, "assigned_to_name": 1}).to_list(2000)

    total = len(all_schools)
    meetings_done = [s for s in all_schools if s.get("status") == "meeting_done"]
    converted = [s for s in all_schools if s.get("status") in ("converted", "active", "renewed")]
    revenue = sum(
        float(str(s.get("conversion_amount") or 0).replace(",", "") or 0)
        for s in converted
    )
    # Tomorrow's meetings
    tmrw_meetings = [s for s in all_schools if (s.get("meeting_date") or "")[:10] == tomorrow_str]
    # Tomorrow's followups
    tmrw_followups = [s for s in all_schools if (s.get("followup_date") or "")[:10] == tomorrow_str]

    return dict(
        total_leads=total,
        meetings_done=len(meetings_done),
        meetings_pct=pct(len(meetings_done), total),
        conversions=len(converted),
        conversion_pct=pct(len(converted), total),
        revenue=revenue,
        aov=round(revenue / len(converted), 0) if converted else 0,
        tmrw_meetings=tmrw_meetings,
        tmrw_followups=tmrw_followups,
    )


# ─────────────────────────────────────────────
# Accounts Email Builder
# ─────────────────────────────────────────────

def build_accounts_email(d, date_str):
    tp = f"₹{int(d['total_pending']):,}"
    to_ = f"₹{int(d['total_overdue']):,}"
    rows = d["rows"]

    def status_pill(s):
        if s == "overdue":
            return '<span class="pill" style="background:#fee2e2;color:#dc2626">Overdue</span>'
        return '<span class="pill" style="background:#fef3c7;color:#d97706">Pending</span>'

    table_rows = ""
    for r in rows[:40]:
        amt = f"₹{int(r['amount']):,}" if r['amount'] else "—"
        table_rows += f"""<tr>
            <td><strong>{r['school']}</strong></td>
            <td>{r['label']}</td>
            <td style="text-align:right;font-weight:700">{amt}</td>
            <td>{r['due_date']}</td>
            <td style="text-align:center">{status_pill(r['status'])}</td>
        </tr>"""

    if not table_rows:
        table_rows = '<tr><td colspan="5" style="color:#94a3b8;text-align:center;padding:16px">No pending receivables</td></tr>'

    overdue_count = sum(1 for r in rows if r["status"] == "overdue")
    pending_count = sum(1 for r in rows if r["status"] == "pending")

    body = f"""
    <div class="kpi-grid">
      {kpi(tp, "Total Receivables")}
      {kpi(to_, "Overdue Amount", "Past due date")}
      {kpi(overdue_count, "Overdue Tranches")}
      {kpi(pending_count, "Pending Tranches")}
    </div>
    <hr class="divider">
    <div class="section-title">School-wise Pending Payments</div>
    <table class="breakdown">
      <thead><tr>
        <th>School</th><th>Tranche</th>
        <th style="text-align:right">Amount</th>
        <th>Due Date</th><th style="text-align:center">Status</th>
      </tr></thead>
      <tbody>{table_rows}</tbody>
    </table>
    """
    return email_wrap(COLORS["accounts"], "💰", "Accounts — Receivables Report", date_str, body)


# ─────────────────────────────────────────────
# B2B CRM Email Builder
# ─────────────────────────────────────────────

def _school_list_table(schools, label_col):
    if not schools:
        return f'<p style="color:#94a3b8;font-size:13px">No {label_col.lower()} tomorrow</p>'
    rows = ""
    for s in schools[:20]:
        date_val = s.get("meeting_date") or s.get("followup_date") or "—"
        rows += f"<tr><td><strong>{s.get('school_name','—')}</strong></td><td>{s.get('contact_name','—')}</td><td>{date_val[:10] if date_val != '—' else '—'}</td></tr>"
    return f"""<table class="breakdown">
      <thead><tr><th>School</th><th>Contact</th><th>{label_col}</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>"""


def build_b2b_email(d, date_str):
    rev = f"₹{int(d['revenue']):,}" if d['revenue'] else "₹0"
    aov = f"₹{int(d['aov']):,}" if d['aov'] else "₹0"
    body = f"""
    <div class="kpi-grid">
      {kpi(d['total_leads'], "Total Leads", "All time")}
      {kpi(d['meetings_done'], "Meetings Done")}
      {kpi(d['meetings_pct'], "Meeting Rate")}
      {kpi(d['conversions'], "Converted")}
      {kpi(d['conversion_pct'], "Conversion Rate")}
      {kpi(rev, "Total Revenue")}
      {kpi(aov, "Avg Order Value")}
    </div>
    <hr class="divider">
    <div class="section-title">Tomorrow's Meetings ({len(d['tmrw_meetings'])})</div>
    {_school_list_table(d['tmrw_meetings'], "Meeting Date")}
    <hr class="divider">
    <div class="section-title">Tomorrow's Follow-ups ({len(d['tmrw_followups'])})</div>
    {_school_list_table(d['tmrw_followups'], "Followup Date")}
    """
    return email_wrap(COLORS["b2b"], "🏫", "B2B CRM Report", date_str, body)


# ─────────────────────────────────────────────
# Manual Trigger API
# ─────────────────────────────────────────────

@router.post("/admin/daily-report/send-now")
async def trigger_daily_report(user: dict = Depends(get_current_user)):
    """Manually trigger today's daily report emails."""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    asyncio.create_task(send_daily_reports())
    return {"message": "Daily reports queued. Emails will be sent to all recipients shortly."}
