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
REPORT_FROM = "OLL Reports <skills@oll.co>"

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
        val = item.get(field)
        # Treat None and empty string as "Not Categorized"
        if val is None or val == "":
            val = "Not Categorized"
        if isinstance(val, list):
            for v in val:
                counts[v or "Not Categorized"] += 1
        else:
            counts[str(val)] += 1
    # Remove "Not Categorized" if it's the only entry (no useful data)
    result = dict(sorted(counts.items(), key=lambda x: -x[1]))
    return result


# Human-readable label maps for support ticket fields
_QUERY_TYPE_LABELS = {
    'demo_related': 'Demo Related',
    'payment': 'Payment',
    'course_info': 'Course Info',
    'ongoing_classes': 'Ongoing Classes',
    'technical': 'Technical',
    'partnership': 'Partnership',
    'feedback': 'Feedback',
    'educator_query': 'Educator Query',
    'admission': 'Admission',
    'scheduling': 'Scheduling',
    'other': 'Other',
}

_INQUIRY_TYPE_LABELS = {
    'student': 'Student',
    'school': 'School',
    'educator': 'Educator',
    'growth_partner': 'Growth Partner',
    'teacher': 'Teacher',
    'team': 'Team / Staff',
}

_PRIORITY_LABELS = {
    'urgent': 'Urgent',
    'high': 'High',
    'normal': 'Normal',
    'low': 'Low',
}


def count_by_labeled(items, field, label_map=None):
    """Like count_by but converts raw values to human-readable labels."""
    raw = count_by(items, field)
    result = {}
    for k, v in raw.items():
        if k == "Not Categorized":
            result[k] = v
        elif label_map and k in label_map:
            result[label_map[k]] = v
        else:
            # Auto-convert underscore_case → Title Case
            result[k.replace('_', ' ').title()] = v
    return result


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
    """Aggregate support queries from all 3 sources used by Admin Support Center:
       - inquiry_queries  (Need Help popup, team inquiry form)
       - support_queries  (SupportFlow.jsx, Educator queries)
       - support_tickets  (FAQ + School tracking page tickets)
    """
    overdue_cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    open_statuses = ["open", "in_progress", "new"]
    resolved_statuses = ["resolved", "closed"]

    async def _fetch(col):
        today_q = await db[col].find({"created_at": {"$gte": start, "$lt": end}}, {"_id": 0}).to_list(2000)
        all_open = await db[col].count_documents({"status": {"$in": open_statuses}})
        overdue = await db[col].count_documents({
            "status": {"$in": open_statuses},
            "created_at": {"$lt": overdue_cutoff}
        })
        # Resolved today (resolved_at if present, else updated_at falls within day window)
        resolved_today_docs = await db[col].find({
            "status": {"$in": resolved_statuses},
            "$or": [
                {"resolved_at": {"$gte": start, "$lt": end}},
                {"updated_at": {"$gte": start, "$lt": end}, "resolved_at": {"$exists": False}},
            ]
        }, {"_id": 0}).to_list(2000)
        # All-time counts for resolution rate
        all_total = await db[col].count_documents({})
        all_resolved = await db[col].count_documents({"status": {"$in": resolved_statuses}})
        return today_q, all_open, overdue, resolved_today_docs, all_total, all_resolved

    # Run 3 collection fetches in parallel
    (sq, iq, st) = await asyncio.gather(
        _fetch("support_queries"),
        _fetch("inquiry_queries"),
        _fetch("support_tickets"),
    )

    today = sq[0] + iq[0] + st[0]
    open_total = sq[1] + iq[1] + st[1]
    overdue = sq[2] + iq[2] + st[2]
    solved_today = sq[3] + iq[3] + st[3]
    all_total = sq[4] + iq[4] + st[4]
    all_resolved = sq[5] + iq[5] + st[5]

    # Avg resolution time across all sources (resolved today)
    def _calc_avg_res(docs):
        times = []
        for q in docs:
            cv = q.get("created_at") or ""
            rv = q.get("resolved_at") or q.get("updated_at") or ""
            if cv and rv:
                try:
                    dt_c = datetime.fromisoformat(str(cv).replace("Z", "+00:00"))
                    dt_r = datetime.fromisoformat(str(rv).replace("Z", "+00:00"))
                    diff = (dt_r - dt_c).total_seconds() / 3600
                    if diff >= 0:
                        times.append(diff)
                except Exception:
                    pass
        return round(sum(times) / len(times), 1) if times else None

    avg_res = _calc_avg_res(solved_today)
    avg_res_label = "Today"
    # Fallback: 30-day rolling avg if no resolutions today
    if avg_res is None:
        cutoff_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        rolling_q = {
            "status": {"$in": resolved_statuses},
            "$or": [
                {"resolved_at": {"$gte": cutoff_30d}},
                {"updated_at": {"$gte": cutoff_30d}, "resolved_at": {"$exists": False}},
            ]
        }
        rs1, rs2, rs3 = await asyncio.gather(
            db.support_queries.find(rolling_q, {"_id": 0}).to_list(2000),
            db.inquiry_queries.find(rolling_q, {"_id": 0}).to_list(2000),
            db.support_tickets.find(rolling_q, {"_id": 0}).to_list(2000),
        )
        avg_res = _calc_avg_res(rs1 + rs2 + rs3)
        avg_res_label = "Last 30 Days"

    resolution_rate = pct(all_resolved, all_total)

    # Breakdown source — today if available, else 7-day rolling fallback across all sources
    breakdown_source = today
    breakdown_label = "Today"
    if not today:
        week_start = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        week_q = {"created_at": {"$gte": week_start}}
        bs1 = await db.support_queries.find(week_q, {"_id": 0}).to_list(5000)
        bs2 = await db.inquiry_queries.find(week_q, {"_id": 0}).to_list(5000)
        bs3 = await db.support_tickets.find(week_q, {"_id": 0}).to_list(5000)
        breakdown_source = bs1 + bs2 + bs3
        breakdown_label = "Last 7 Days"

    # Normalize query_type for support_tickets where the field may be named 'query_type' too
    # and inquiry_type for FAQ/tracking tickets where it may be missing
    for q in breakdown_source:
        if not q.get("inquiry_type"):
            q["inquiry_type"] = q.get("user_type") or ("school" if q.get("source") == "tracking_page" else "student")

    user_types = count_by_labeled(breakdown_source, "inquiry_type", _INQUIRY_TYPE_LABELS)

    return dict(
        new_queries=len(today),
        open_total=open_total,
        overdue=overdue,
        solved_today=len(solved_today),
        avg_resolution_hrs=avg_res,
        avg_resolution_label=avg_res_label,
        resolution_rate=resolution_rate,
        breakdown_label=breakdown_label,
        categories=count_by_labeled(breakdown_source, "query_type", _QUERY_TYPE_LABELS),
        sub_categories=count_by_labeled(breakdown_source, "related_to"),
        detail_categories=count_by_labeled(breakdown_source, "priority", _PRIORITY_LABELS),
        user_types=user_types,
    )


async def fetch_b2c_data(start, end):
    query = {"created_at": {"$gte": start, "$lt": end}}

    # ── Core student inquiries (1:1 demos) ──
    today = await db.student_inquiries.find(query, {"_id": 0}).to_list(2000)
    converted = [l for l in today if l.get("status") == "converted"]
    demos = [l for l in today if l.get("status") in ("demo_completed", "converted")]
    revenue = sum(
        float(str(l.get("conversion_amount", 0)).replace(",", "") or 0)
        for l in converted
    )

    # ── Summer Camp bookings ──
    camp_today = await db.summer_camp_bookings.find(query, {"_id": 0}).to_list(2000)
    camp_converted = [c for c in camp_today if c.get("crm_status") in ("converted", "payment_offline")]
    camp_revenue = sum(
        float(str(c.get("amount") or 0).replace(",", "") or 0)
        for c in camp_today
        if c.get("crm_status") in ("converted", "payment_offline") or (c.get("payment_status") or "").lower() == "paid"
    )

    # ── Summer Internship (Social Media Intern) registrations ──
    smi_today = await db.social_media_intern_registrations.find(query, {"_id": 0}).to_list(2000)
    smi_converted = [s for s in smi_today if (s.get("crm_status") or "").lower() == "converted" or (s.get("payment_status") or "").lower() == "paid"]

    # ── AI Foundations bookings ──
    aif_today = await db.ai_foundations_bookings.find(query, {"_id": 0}).to_list(2000)
    aif_converted = [a for a in aif_today if (a.get("crm_status") or "").lower() == "converted" or (a.get("payment_status") or "").lower() == "paid"]
    aif_revenue = sum(
        float(str(a.get("amount") or 0).replace(",", "") or 0)
        for a in aif_converted
    )

    # ── Future Skills subscriptions ──
    fs_today = await db.future_skills_subscriptions.find(query, {"_id": 0}).to_list(2000)
    fs_converted = [f for f in fs_today if (f.get("payment_status") or "").upper() == "PAID" or (f.get("crm_status") or "").lower() in ("converted", "active")]
    fs_revenue = sum(
        float(str(f.get("amount") or 0).replace(",", "") or 0)
        for f in fs_converted
    )
    fs_trials_today = await db.future_skills_trials.count_documents(query)

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
        # New product lines
        camp_leads=len(camp_today),
        camp_converted=len(camp_converted),
        camp_revenue=camp_revenue,
        camp_batches=count_by(camp_today, "batch_week"),
        camp_centers=count_by(camp_today, "center_label"),
        smi_leads=len(smi_today),
        smi_converted=len(smi_converted),
        aif_leads=len(aif_today),
        aif_converted=len(aif_converted),
        aif_revenue=aif_revenue,
        aif_tracks=count_by(aif_today, "track_label"),
        fs_subs=len(fs_today),
        fs_converted=len(fs_converted),
        fs_revenue=fs_revenue,
        fs_plans=count_by(fs_today, "plan_label"),
        fs_trials=fs_trials_today,
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
    avg_lbl = d.get('avg_resolution_label', 'Today')
    lbl = d.get('breakdown_label', 'Today')
    body = f"""
    <div class="kpi-grid">
      {kpi(d['new_queries'], "New Queries Today")}
      {kpi(d['open_total'], "Open Queries", "All Time")}
      {kpi(d['overdue'], "Overdue", "> 48h open")}
      {kpi(d['solved_today'], "Resolved Today")}
      {kpi(avg_res, "Avg Resolution Time", avg_lbl)}
      {kpi(d['resolution_rate'], "Overall Resolution Rate")}
    </div>
    <hr class="divider">
    <p style="color:#888;font-size:12px;margin:0 0 8px;">Breakdown: <strong>{lbl}</strong></p>
    {breakdown_table(d['categories'], "Query Categories")}
    {breakdown_table(d['sub_categories'], "Sub-Categories")}
    {breakdown_table(d['detail_categories'], "Priority Breakdown")}
    {breakdown_table(d['user_types'], "User Type Division")}
    """
    return email_wrap(COLORS["support"], "🎧", "Support Report", date_str, body)


def build_b2c_email(d, date_str):
    rev = f"₹{int(d['revenue']):,}" if d['revenue'] else "₹0"
    aov = f"₹{int(d['avg_order_value']):,}" if d['avg_order_value'] else "₹0"
    camp_rev = f"₹{int(d['camp_revenue']):,}" if d['camp_revenue'] else "₹0"
    aif_rev = f"₹{int(d['aif_revenue']):,}" if d['aif_revenue'] else "₹0"
    fs_rev = f"₹{int(d['fs_revenue']):,}" if d['fs_revenue'] else "₹0"

    # Product sub-section helper
    def _product_row(label, color, leads, converted, revenue=None, extra=None):
        rev_html = f'<div style="font-size:13px;color:#475569;margin-top:2px">Revenue: <strong>{revenue}</strong></div>' if revenue is not None else ''
        extra_html = f'<div style="font-size:12px;color:#64748b;margin-top:2px">{extra}</div>' if extra else ''
        return f"""
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid {color};border-radius:8px;padding:12px 14px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
            <div style="font-weight:700;color:#1e293b;font-size:14px">{label}</div>
            <div style="font-size:13px;color:#475569">
              <strong style="color:#1e293b">{leads}</strong> leads ·
              <strong style="color:#16a34a">{converted}</strong> converted
            </div>
          </div>
          {rev_html}
          {extra_html}
        </div>"""

    products_html = (
        _product_row("☀️ Summer Camp", "#f59e0b", d['camp_leads'], d['camp_converted'], camp_rev,
                     f"Batches: {', '.join(f'{k}={v}' for k,v in d['camp_batches'].items()) or '—'}") +
        _product_row("💼 Summer Internship (Social Media)", "#8b5cf6", d['smi_leads'], d['smi_converted']) +
        _product_row("✨ AI Foundations", "#0ea5e9", d['aif_leads'], d['aif_converted'], aif_rev,
                     f"Tracks: {', '.join(f'{k}={v}' for k,v in d['aif_tracks'].items()) or '—'}") +
        _product_row("🤖 Future Skills (Subscriptions)", "#dc2626", d['fs_subs'], d['fs_converted'], fs_rev,
                     f"Plans: {', '.join(f'{k}={v}' for k,v in d['fs_plans'].items()) or '—'} · Trials today: {d['fs_trials']}")
    )

    body = f"""
    <div class="kpi-grid">
      {kpi(d['new_leads'], "New Leads", "1:1 Demos")}
      {kpi(d['demos_completed'], "Demos Completed")}
      {kpi(d['demo_ratio'], "Lead → Demo Rate")}
      {kpi(d['conversions'], "Conversions")}
      {kpi(d['conversion_ratio'], "Conversion Rate")}
      {kpi(rev, "Revenue")}
      {kpi(aov, "Avg Order Value")}
    </div>
    <hr class="divider">
    <div class="section-title">Product Lines (Today)</div>
    {products_html}
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
# Consolidated Email Builder — One email with all sections
# ─────────────────────────────────────────────

def _strip_email_chrome(html: str) -> str:
    """Extract just the inner section body from a category email (drop header/footer)."""
    # Use the raw body HTML — easier to just rebuild by calling each section builder's body directly
    return html


def _section_header(color, icon, title):
    return f"""
    <div style="margin: 8px 0 14px; padding: 14px 18px; border-radius: 10px; background: linear-gradient(135deg,{color} 0%,{color}cc 100%); color:#fff">
      <div style="font-size:18px;font-weight:700">{icon} {title}</div>
    </div>"""


def build_consolidated_email(support_d, b2c_d, gp_d, team_d, educator_d, accounts_d, b2b_d, date_str):
    """Single unified daily report email containing all 7 sections."""
    sections = [
        (COLORS["b2c"],      "📈", "B2C Report",                build_b2c_email(b2c_d, date_str)),
        (COLORS["b2b"],      "🏫", "B2B CRM Report",            build_b2b_email(b2b_d, date_str)),
        (COLORS["accounts"], "💰", "Accounts — Receivables",    build_accounts_email(accounts_d, date_str)),
        (COLORS["support"],  "🎧", "Support Report",            build_support_email(support_d, date_str)),
        (COLORS["educator"], "🎓", "Educators Report",          build_educator_email(educator_d, date_str)),
        (COLORS["team"],     "👥", "Team Members Report",       build_team_email(team_d, date_str)),
        (COLORS["gp"],       "🤝", "Growth Partners Report",    build_gp_email(gp_d, date_str)),
    ]

    # Extract body of each section email (between <div class="body"> ... </div>)
    import re
    pattern = re.compile(r'<div class="body">(.*?)</div>\s*<div class="footer">', re.DOTALL)

    section_html = ""
    for color, icon, title, full_html in sections:
        m = pattern.search(full_html)
        inner = m.group(1) if m else full_html
        section_html += _section_header(color, icon, title) + f'<div style="padding:0 6px 28px">{inner}</div>'

    header_color = "#1E3A5F"
    consolidated_body = section_html + """
    <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center">
      Need anything more granular? Reply to this email and we'll add it to the next build.
    </p>"""

    return f"""<!DOCTYPE html><html><head>{BASE_STYLE}</head><body>
    <div class="wrap" style="max-width:760px">
      <div class="header" style="background: linear-gradient(135deg,{header_color} 0%,#2d5a8a 100%)">
        <h1>📊 OLL Daily Briefing</h1>
        <p>{date_str} &nbsp;|&nbsp; All Reports Consolidated &nbsp;|&nbsp; OLL Platform</p>
      </div>
      <div class="body" style="padding:18px 24px">{consolidated_body}</div>
      <div class="footer">OLL Platform &mdash; Automated Daily Report &mdash; Do not reply</div>
    </div>
    </body></html>"""


# ─────────────────────────────────────────────
# Email Dispatcher
# ─────────────────────────────────────────────

async def _send(subject: str, html: str, api_key: str, recipients=None):
    """Send to all (or specified) report recipients via Resend.

    Each attempt is recorded in `daily_report_sends` so the admin UI can
    surface delivery status without needing access to server logs.
    """
    resend.api_key = api_key
    targets = recipients if recipients is not None else REPORT_RECIPIENTS
    for recipient in targets:
        ok = True
        err_msg = None
        resend_id = None
        try:
            res = await asyncio.to_thread(resend.Emails.send, {
                "from": REPORT_FROM,
                "to": recipient,
                "subject": subject,
                "html": html,
            })
            resend_id = (res or {}).get("id") if isinstance(res, dict) else None
            logger.info(f"[DailyReport] Sent '{subject}' to {recipient}")
        except Exception as e:
            ok = False
            err_msg = str(e)
            logger.error(f"[DailyReport] Failed to send to {recipient}: {e}")
        try:
            await db.daily_report_sends.insert_one({
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "subject": subject,
                "recipient": recipient,
                "status": "sent" if ok else "failed",
                "resend_id": resend_id,
                "error": err_msg,
            })
        except Exception as e:
            logger.warning(f"[DailyReport] Could not record send-log: {e}")
        await asyncio.sleep(0.3)  # Avoid Resend rate limit (5 req/s)


async def send_daily_reports(force: bool = False, recipients=None):
    """Main entry — gather all data and fire ONE consolidated email. Uses a MongoDB lock to prevent duplicate sends in multi-worker environments.

    Args:
        force: If True, skip the daily lock (used for manual test sends).
        recipients: Optional list of recipient emails. Defaults to REPORT_RECIPIENTS.
    """
    logger.info("[DailyReport] Starting daily report generation...")
    api_key = await get_resend_api_key()
    if not api_key:
        logger.warning("[DailyReport] No Resend API key — skipping emails.")
        return

    if not force:
        # ── Distributed daily lock ─────────────────────────────────────
        today_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        lock_result = await db.daily_report_locks.find_one_and_update(
            {"date": today_key},
            {"$setOnInsert": {"date": today_key, "locked_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
            return_document=False
        )
        if lock_result is not None:
            logger.info(f"[DailyReport] Lock exists for {today_key} — skipping duplicate send.")
            return
        logger.info(f"[DailyReport] Acquired lock for {today_key} — proceeding.")
        # ───────────────────────────────────────────────────────────────

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
        if not force:
            today_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            await db.daily_report_locks.delete_one({"date": today_key})
        return

    consolidated_html = build_consolidated_email(
        support_d, b2c_d, gp_d, team_d, educator_d, accounts_d, b2b_d, date_str
    )
    subject = f"[OLL Daily Briefing] {date_str}"
    await _send(subject, consolidated_html, api_key, recipients=recipients)

    logger.info("[DailyReport] Consolidated daily report dispatched.")


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
        {"_id": 0, "school_name": 1, "onboarding_data": 1, "id": 1, "payments": 1}
    ).to_list(500)

    rows = []
    total_pending = 0.0
    total_overdue = 0.0

    for school in schools:
        name = school.get("school_name", "Unknown")
        od = school.get("onboarding_data") or {}
        tranches = od.get("payment_tranches") or []
        # The actual payment status lives in school["payments"] (what the Orders UI reads),
        # keyed by tranche_index — NOT in the tranche definition itself.
        recorded_payments = school.get("payments") or []
        # Map tranche_index → payment record so we can subtract partial paid_amount
        payment_by_idx = {
            p.get("tranche_index"): p
            for p in recorded_payments
            if p.get("tranche_index") is not None
        }
        paid_indices = {
            idx for idx, p in payment_by_idx.items()
            if (p.get("status") or "").lower() in ("paid", "verified")
        }
        total_amount_raw = od.get("total_amount") or od.get("total_value") or 0
        total_amount = float(str(total_amount_raw).replace(",", "") or 0)

        for idx, t in enumerate(tranches):
            # Primary check: actual payment record in payments[] by tranche_index
            if idx in paid_indices:
                continue
            # Fallback: check the tranche definition's own status (legacy / manually set)
            tranche_status = (t.get("status") or "pending").lower()
            if tranche_status in ("paid", "verified"):
                continue

            # Resolve amount: fixed amount OR percentage × total
            amount = float(str(t.get("amount") or 0).replace(",", "") or 0)
            if not amount and t.get("percentage") and total_amount:
                amount = round(total_amount * float(t.get("percentage") or 0) / 100, 2)

            # ── Subtract partial paid_amount if a partial payment exists ──
            existing_payment = payment_by_idx.get(idx) or {}
            paid_so_far = float(str(existing_payment.get("paid_amount") or 0).replace(",", "") or 0)
            outstanding = max(0.0, amount - paid_so_far)
            is_partial = paid_so_far > 0 and outstanding > 0

            # Fully covered by partial payment → treat as paid
            if outstanding <= 0:
                continue

            due_date = t.get("due_date") or t.get("date") or "—"
            label = t.get("label") or t.get("description") or "Tranche"
            if is_partial:
                label = f"{label} (Partial — paid ₹{int(paid_so_far):,})"
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
                "amount": outstanding,
                "due_date": due_date,
                "status": flag,
            })
            total_pending += outstanding
            if is_overdue:
                total_overdue += outstanding

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

@router.get("/admin/daily-report/status")
async def daily_report_status(user: dict = Depends(get_current_user)):
    """Returns config + recent delivery history so admins can self-diagnose
    whether the daily report scheduler/Resend pipeline is healthy.
    """
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    api_key = await get_resend_api_key()
    locks = await db.daily_report_locks.find({}, {"_id": 0}).sort("date", -1).limit(14).to_list(14)
    sends = await db.daily_report_sends.find({}, {"_id": 0}).sort("sent_at", -1).limit(60).to_list(60)
    return {
        "recipients": REPORT_RECIPIENTS,
        "from_address": REPORT_FROM,
        "scheduled_at_ist": "8:00 PM IST daily",
        "resend_api_key_configured": bool(api_key),
        "resend_api_key_preview": (api_key[:6] + "…" + api_key[-3:]) if api_key else None,
        "recent_locks": locks,
        "recent_sends": sends,
    }


@router.post("/admin/daily-report/send-now")
async def trigger_daily_report(payload: dict = None, user: dict = Depends(get_current_user)):
    """Manually trigger today's daily report email.

    Body (optional):
      - recipients: list[str]  — override the default recipient list (e.g., for a sample send)
      - force: bool            — bypass today's lock so the same day can be re-sent for testing
    """
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    payload = payload or {}
    recipients = payload.get("recipients")
    force = bool(payload.get("force", False))
    asyncio.create_task(send_daily_reports(force=force, recipients=recipients))
    targets = recipients if recipients else REPORT_RECIPIENTS
    return {"message": f"Daily report queued. Emails will be sent to: {', '.join(targets)}"}
