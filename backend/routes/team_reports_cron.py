"""Weekly Manager Team-Report cron.

Every Monday at 3 PM IST the platform hits `/api/cron/weekly-team-report`.
For each active manager (a team_user with at least one direct report):
  1. Compute last week's report for every direct report using the same
     helpers as the `/team/member-report` endpoint.
  2. Render a ReportLab PDF that mirrors the frontend PDF layout.
  3. Email the manager via Resend with the PDF attached (one email per manager).

Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
"""
from __future__ import annotations
import os
import asyncio
import base64
import logging
import secrets
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Optional, List, Dict, Any

import resend
from fastapi import APIRouter, Header, HTTPException, Request, BackgroundTasks

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak,
)

from routes.shared import db
from routes.team_reports import (
    _parse_ref, _period_bounds, _get_member, _fetch_in_window,
    _count_in_window, _bucket_counts, _role_kpi_series, IST,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cron", tags=["cron"])

SENDER_EMAIL = "OLL Team <welcome@oll.co>"


def _auth_ok(auth_header: Optional[str]) -> bool:
    """Constant-time bearer-token check against WEBHOOK_CRON_SECRET."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return False
    token = auth_header.removeprefix("Bearer ").strip()
    expected = os.environ.get("WEBHOOK_CRON_SECRET", "")
    if not expected:
        return False
    return secrets.compare_digest(token, expected)


# ─────────────────────── ReportLab PDF generator ────────────────────────
def _build_report_pdf(payload: Dict[str, Any]) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        title="Team Member Performance Report",
    )
    styles = getSampleStyleSheet()
    story: List[Any] = []

    user = payload.get("user", {})
    period = payload.get("period", {})
    totals = payload.get("totals", {})
    tasks = payload.get("tasks", {}) or {}
    queries = payload.get("queries", {}) or {}
    crm = payload.get("crm", {}) or {}
    buckets = payload.get("buckets", []) or []
    unit = payload.get("breakdown_unit", "day")
    unit_label = {"day": "Day-wise", "week": "Week-wise", "month": "Month-wise"}.get(unit, "Breakdown")

    # ── Header band ─────────────────────────────
    header_style = ParagraphStyle(
        "Header", parent=styles["Title"], fontSize=18, textColor=colors.white,
        backColor=colors.HexColor("#2563EB"), leftIndent=8, spaceAfter=0,
    )
    title_tbl = Table(
        [[Paragraph(f"<b>Team Member Performance Report</b><br/><font size=10>"
                    f"{period.get('type','weekly').title()} · {period.get('label','')}</font>", header_style),
          Paragraph(f"<font color='white' size=9><b>OLL · Live Ops</b><br/>"
                    f"Generated {datetime.now(IST).strftime('%d %b %Y, %H:%M IST')}</font>", styles["Normal"])]],
        colWidths=[11 * cm, 6 * cm],
    )
    title_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(title_tbl)
    story.append(Spacer(1, 8))

    # ── Member card ─────────────────────────────
    member_tbl = Table(
        [[Paragraph(f"<b>{user.get('name','—')}</b><br/>"
                    f"<font size=9 color='#64748B'>{user.get('role_name','Team Member')}</font><br/>"
                    f"<font size=8 color='#64748B'>{user.get('email','')} {('· ' + user['phone']) if user.get('phone') else ''}</font>",
                    styles["Normal"]),
          Paragraph(f"<font color='#2563EB' size=10><b>{period.get('start','')} → {period.get('end','')}</b></font>",
                    styles["Normal"])]],
        colWidths=[12 * cm, 5 * cm],
    )
    member_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(member_tbl)
    story.append(Spacer(1, 12))

    # ── KPI strip: role-assigned KPIs (falls back to defaults) ─────
    role_kpis = payload.get("role_kpis") or []
    palette = ["#2563EB", "#10B981", "#D97706", "#0891B2", "#7C3AED", "#E11D48", "#059669", "#F97316", "#0EA5E9"]

    def _fmt_val(v, unit):
        if v is None:
            return "0"
        try:
            n = float(v)
            if unit == "₹":
                return f"₹{int(n):,}"
            if unit == "%":
                return f"{round(n, 1)}%"
            if unit == "hours":
                return f"{round(n, 1)}h"
            return f"{int(n):,}" if n.is_integer() else f"{n:,.1f}"
        except (TypeError, ValueError):
            return str(v)

    if role_kpis:
        story.append(Paragraph("<b>KPIs assigned to this role</b>",
                                ParagraphStyle("h2", parent=styles["Heading3"], textColor=colors.HexColor("#334155"))))
        story.append(Spacer(1, 6))
        # 4 cards per row; wrap as many rows as needed
        rows_of_cards: List[List[Any]] = []
        row_colors: List[List[str]] = []
        current_row: List[Any] = []
        current_colors: List[str] = []
        for idx, k in enumerate(role_kpis):
            col_hex = palette[idx % len(palette)]
            label = (k.get("name") or k.get("id") or "").upper()
            value_str = _fmt_val(k.get("total"), k.get("unit"))
            target = k.get("target")
            target_line = f"<br/><font color='white' size=6>Target: {_fmt_val(target, k.get('unit'))}</font>" if target else ""
            cell = Paragraph(
                f"<font color='white' size=14><b>{value_str}</b></font><br/>"
                f"<font color='white' size=7><b>{label[:32]}</b></font>{target_line}",
                styles["Normal"],
            )
            current_row.append(cell)
            current_colors.append(col_hex)
            if len(current_row) == 4:
                rows_of_cards.append(current_row)
                row_colors.append(current_colors)
                current_row, current_colors = [], []
        # Pad the last row so all 4 columns match widths
        if current_row:
            while len(current_row) < 4:
                current_row.append("")
                current_colors.append("#F1F5F9")
            rows_of_cards.append(current_row)
            row_colors.append(current_colors)

        for r_idx, cells in enumerate(rows_of_cards):
            tbl = Table([cells], colWidths=[4.25 * cm] * 4)
            style = [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
            for c_idx, hex_col in enumerate(row_colors[r_idx]):
                style.append(("BACKGROUND", (c_idx, 0), (c_idx, 0), colors.HexColor(hex_col)))
            tbl.setStyle(TableStyle(style))
            story.append(tbl)
            story.append(Spacer(1, 4))
        story.append(Spacer(1, 8))
    else:
        # No role KPIs configured — fall back to the generic activity KPIs
        kpi_defs = [
            ("Tasks Assigned",   totals.get("tasks_assigned"),   "#2563EB"),
            ("Tasks Completed",  totals.get("tasks_completed"),  "#10B981"),
            ("Queries Assigned", totals.get("queries_assigned"), "#D97706"),
            ("Queries Resolved", totals.get("queries_resolved"), "#10B981"),
            ("Field Visits",     totals.get("field_visits"),     "#0891B2"),
            ("Calls Connected",  totals.get("calls_connected"),  "#10B981"),
            ("Leads Added",      totals.get("leads_added"),      "#E11D48"),
            ("Schools Onboarded", totals.get("schools_onboarded"), "#7C3AED"),
        ]
        row1_cells, row2_cells = [], []
        for i, (label, value, hex_col) in enumerate(kpi_defs):
            cell = Paragraph(f"<font color='white' size=16><b>{value or 0}</b></font><br/>"
                             f"<font color='white' size=7><b>{label.upper()}</b></font>",
                             styles["Normal"])
            (row1_cells if i < 4 else row2_cells).append(cell)
        def _style_kpi_row(cells, colors_hex):
            tbl = Table([cells], colWidths=[4.25 * cm] * 4)
            style = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                     ("LEFTPADDING", (0, 0), (-1, -1), 8),
                     ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                     ("TOPPADDING", (0, 0), (-1, -1), 8),
                     ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]
            for i, hex_col in enumerate(colors_hex):
                style.append(("BACKGROUND", (i, 0), (i, 0), colors.HexColor(hex_col)))
            tbl.setStyle(TableStyle(style))
            return tbl
        story.append(_style_kpi_row(row1_cells, [d[2] for d in kpi_defs[:4]]))
        story.append(Spacer(1, 4))
        story.append(_style_kpi_row(row2_cells, [d[2] for d in kpi_defs[4:]]))
        story.append(Spacer(1, 16))

    # ── Bucket breakdown ────────────────────────
    story.append(Paragraph(f"<b>{unit_label} Breakdown</b>",
                            ParagraphStyle("h2", parent=styles["Heading3"], textColor=colors.HexColor("#334155"))))
    story.append(Spacer(1, 4))
    bhead = ["Period", "Tasks Assigned", "Tasks Done", "Queries In", "Queries Resolved", "Field Visits", "Calls Connected"]
    brows = [bhead] + [[
        b.get("key", ""),
        b.get("tasks_assigned", 0),
        b.get("tasks_completed", 0),
        b.get("queries_assigned", 0),
        b.get("queries_resolved", 0),
        b.get("field_visits", 0),
        b.get("calls_connected", 0),
    ] for b in buckets]
    btbl = Table(brows, colWidths=[3.4 * cm, 2.35 * cm, 2.35 * cm, 2.35 * cm, 2.5 * cm, 2 * cm, 2.5 * cm])
    btbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(btbl)
    story.append(Spacer(1, 14))

    # ── Tasks assigned ──────────────────────────
    def _task_rows(tlist: List[Dict[str, Any]]):
        rows = [["Task", "Project", "Priority", "Status", "Assigned", "Due"]]
        for t in tlist[:60]:
            rows.append([
                (t.get("title") or "—")[:55],
                (t.get("project_name") or "—")[:22],
                (t.get("priority") or "normal").title(),
                (t.get("status") or "—").title(),
                (t.get("created_at") or "—")[:10],
                (t.get("due_date") or "—")[:10],
            ])
        return rows

    if tasks.get("assigned"):
        story.append(Paragraph(f"<b>Tasks Assigned in this Period ({len(tasks['assigned'])})</b>",
                                ParagraphStyle("h2", parent=styles["Heading3"], textColor=colors.HexColor("#2563EB"))))
        story.append(Spacer(1, 4))
        ttbl = Table(_task_rows(tasks["assigned"]),
                      colWidths=[6 * cm, 3 * cm, 1.8 * cm, 2 * cm, 2 * cm, 2 * cm])
        ttbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(ttbl)
        story.append(Spacer(1, 12))

    # ── Tasks completed ─────────────────────────
    if tasks.get("completed"):
        story.append(Paragraph(f"<b>Tasks Completed ({len(tasks['completed'])})</b>",
                                ParagraphStyle("h2", parent=styles["Heading3"], textColor=colors.HexColor("#10B981"))))
        story.append(Spacer(1, 4))
        rows = [["Task", "Project", "Priority", "Completed On"]]
        for t in tasks["completed"][:60]:
            rows.append([
                (t.get("title") or "—")[:60],
                (t.get("project_name") or "—")[:24],
                (t.get("priority") or "normal").title(),
                (t.get("completed_at") or "—")[:10],
            ])
        ctbl = Table(rows, colWidths=[8 * cm, 4 * cm, 2 * cm, 3.5 * cm])
        ctbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ]))
        story.append(ctbl)
        story.append(Spacer(1, 12))

    # ── Queries assigned ───────────────────────
    if queries.get("assigned"):
        story.append(Paragraph(f"<b>Support Queries Assigned ({len(queries['assigned'])})</b>",
                                ParagraphStyle("h2", parent=styles["Heading3"], textColor=colors.HexColor("#D97706"))))
        story.append(Spacer(1, 4))
        rows = [["#", "Category", "From", "Priority", "Status", "Created", "Resolved"]]
        for q in queries["assigned"][:80]:
            cat = " · ".join(filter(None, [q.get("main_category"), q.get("category"), q.get("sub_category")])) or "—"
            rows.append([
                (q.get("ticket_number") or "—")[:8],
                cat[:28],
                (q.get("name") or q.get("email") or "—")[:20],
                (q.get("priority") or "normal").title(),
                (q.get("status") or "—").title(),
                (q.get("created_at") or "—")[:10],
                (q.get("resolved_at") or "—")[:10],
            ])
        qtbl = Table(rows, colWidths=[1.4 * cm, 4.4 * cm, 3 * cm, 1.8 * cm, 2 * cm, 2 * cm, 2.4 * cm])
        qtbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D97706")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FEF3C7"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ]))
        story.append(qtbl)
        story.append(Spacer(1, 12))

    # ── Projects Leading / Member ─────────────
    projects = payload.get("projects") or {}
    leading = projects.get("leading") or []
    members = projects.get("member") or []
    if leading or members:
        story.append(Paragraph(
            f"<b>Projects · Leading ({len(leading)}) · Member of ({len(members)})</b>",
            ParagraphStyle("h2", parent=styles["Heading3"], textColor=colors.HexColor("#7C3AED"))))
        story.append(Spacer(1, 4))
        rows = [["Role", "Project", "Status", "Progress", "Priority", "Due"]]
        def _add_rows(lst, tag):
            for p in lst[:60]:
                rows.append([
                    tag,
                    (p.get("name") or "—")[:52],
                    (p.get("status") or "—").title(),
                    f"{p.get('progress')}%" if isinstance(p.get("progress"), (int, float)) else "—",
                    (p.get("priority") or "normal").title(),
                    (p.get("due_date") or "—")[:10],
                ])
        _add_rows(leading, "Lead")
        _add_rows(members, "Member")
        ptbl = Table(rows, colWidths=[1.4 * cm, 6.5 * cm, 2.2 * cm, 2 * cm, 2 * cm, 2 * cm])
        ptbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#7C3AED")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F5F3FF"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ]))
        story.append(ptbl)
        story.append(Spacer(1, 12))

    # ── CRM roll-up ─────────────────────────────
    story.append(Paragraph("<b>CRM Highlights</b>",
                            ParagraphStyle("h2", parent=styles["Heading3"], textColor=colors.HexColor("#E11D48"))))
    story.append(Spacer(1, 4))
    crm_rows = [["Metric", "Value"]] + [
        ["School Leads Added", crm.get("leads_added", 0)],
        ["Schools Onboarded", crm.get("schools_onboarded", 0)],
        ["Student Leads Added", crm.get("student_leads", 0)],
        ["Field Visits · Total", totals.get("field_visits", 0)],
        ["Field Entries Gained", totals.get("field_entries", 0)],
        ["Field Interested Leads", totals.get("field_leads", 0)],
        ["Distance Travelled (km)", totals.get("field_km", 0)],
        ["Calls Made", totals.get("calls_made", 0)],
        ["Calls Connected", totals.get("calls_connected", 0)],
    ]
    ctbl = Table(crm_rows, colWidths=[10 * cm, 4 * cm])
    ctbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E11D48")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
    ]))
    story.append(ctbl)

    doc.build(story)
    return buf.getvalue()


# ─────────────────────── Data assembly ──────────────────────────────────
async def _assemble_report(user_id: str, period: str, ref: Optional[str]) -> Dict[str, Any]:
    """Call the same helpers used by the API endpoint."""
    member = await _get_member(user_id)
    ref_dt = _parse_ref(ref)
    start, end, period_label, buckets = _period_bounds(period, ref_dt)

    tasks_assigned = await _fetch_in_window(
        "tasks", "assigned_to", user_id, "created_at", start, end,
        projection={"_id": 0, "id": 1, "title": 1, "status": 1, "priority": 1,
                    "created_at": 1, "completed_at": 1, "due_date": 1,
                    "assigned_by_name": 1, "project_name": 1},
    )
    tasks_completed = await _fetch_in_window(
        "tasks", "assigned_to", user_id, "completed_at", start, end,
        projection={"_id": 0, "id": 1, "title": 1, "status": 1, "priority": 1,
                    "created_at": 1, "completed_at": 1, "due_date": 1,
                    "assigned_by_name": 1, "project_name": 1},
    )
    queries_assigned = await _fetch_in_window(
        "support_queries", "assigned_to", user_id, "created_at", start, end,
        projection={"_id": 0, "id": 1, "ticket_number": 1, "main_category": 1,
                    "category": 1, "sub_category": 1, "status": 1, "priority": 1,
                    "created_at": 1, "resolved_at": 1, "name": 1, "email": 1},
    )
    bucket_data = await _bucket_counts(user_id, buckets)
    role_kpis = await _role_kpi_series(user_id, start, end, buckets)

    # ── Projects (leading / member of) ─────
    async def _projects_for(role_key: str):
        q = ({"$or": [{"lead_id": user_id}, {"leader_id": user_id}, {"project_lead_id": user_id}]}
             if role_key == "lead"
             else {"$or": [{"member_ids": user_id}, {"members": user_id}]})
        try:
            docs = await db.projects.find(
                q, {"_id": 0, "id": 1, "name": 1, "title": 1, "status": 1,
                    "progress": 1, "priority": 1, "due_date": 1},
            ).sort("updated_at", -1).limit(80).to_list(80)
        except Exception:
            docs = []
        for d in docs:
            d["name"] = d.get("name") or d.get("title") or "—"
        return docs
    projects_leading = await _projects_for("lead")
    projects_member = await _projects_for("member")
    _lead_ids = {p.get("id") for p in projects_leading if p.get("id")}
    projects_member = [p for p in projects_member if p.get("id") not in _lead_ids]

    leads_added = await _count_in_window("school_inquiries", "assigned_to", user_id, "created_at", start, end)
    schools_onboarded = await _count_in_window(
        "school_inquiries", "assigned_to", user_id, "onboarded_at", start, end,
        extra={"status": {"$in": ["onboarded", "active"]}},
    )
    student_leads = await _count_in_window("student_inquiries", "assigned_to", user_id, "created_at", start, end)
    calls_made = await _count_in_window(
        "telecalling_activity", "user_id", user_id, "created_at", start, end,
        extra={"event": "call_made"},
    )
    calls_connected = await _count_in_window(
        "telecalling_activity", "user_id", user_id, "created_at", start, end,
        extra={"event": "call_picked"},
    )

    from datetime import timezone as _tz
    try:
        fv_pipe = [
            {"$match": {
                "user_id": user_id,
                "$or": [
                    {"created_at": {"$gte": start.astimezone(_tz.utc), "$lt": end.astimezone(_tz.utc)}},
                    {"created_at": {"$gte": start.astimezone(_tz.utc).isoformat(), "$lt": end.astimezone(_tz.utc).isoformat()}},
                ],
            }},
            {"$project": {
                "visits":  {"$size": {"$ifNull": ["$school_visits", []]}},
                "entries": {"$size": {"$filter": {"input": {"$ifNull": ["$school_visits", []]}, "cond": {"$eq": ["$$this.got_entry", "yes"]}}}},
                "leads":   {"$size": {"$filter": {"input": {"$ifNull": ["$school_visits", []]}, "cond": {"$eq": ["$$this.lead_interested", "yes"]}}}},
                "distance_km": {"$ifNull": ["$distance_km", 0]},
            }},
            {"$group": {
                "_id": None,
                "visits":  {"$sum": "$visits"},
                "entries": {"$sum": "$entries"},
                "leads":   {"$sum": "$leads"},
                "km":      {"$sum": "$distance_km"},
                "days":    {"$sum": 1},
            }},
        ]
        fv_agg = await db.field_reports.aggregate(fv_pipe).to_list(1)
        fv_row = fv_agg[0] if fv_agg else {}
    except Exception:
        fv_row = {}

    unit_label = {"weekly": "day", "monthly": "week", "quarterly": "month"}.get(period, "day")
    return {
        "user": member,
        "period": {"type": period, "start": start.strftime("%Y-%m-%d"),
                    "end": (end - timedelta(seconds=1)).strftime("%Y-%m-%d"),
                    "label": period_label},
        "breakdown_unit": unit_label,
        "buckets": bucket_data,
        "totals": {
            "tasks_assigned":   len(tasks_assigned),
            "tasks_completed":  len(tasks_completed),
            "queries_assigned": len(queries_assigned),
            "queries_resolved": sum(1 for q in queries_assigned if (q.get("status") or "").lower() in {"resolved", "closed"}),
            "leads_added":      leads_added,
            "schools_onboarded": schools_onboarded,
            "student_leads":    student_leads,
            "calls_made":       calls_made,
            "calls_connected":  calls_connected,
            "field_visits":     int(fv_row.get("visits") or 0),
            "field_entries":    int(fv_row.get("entries") or 0),
            "field_leads":      int(fv_row.get("leads") or 0),
            "field_days":       int(fv_row.get("days") or 0),
            "field_km":         round(float(fv_row.get("km") or 0), 2),
        },
        "tasks": {"assigned": tasks_assigned, "completed": tasks_completed},
        "queries": {"assigned": queries_assigned},
        "crm": {"leads_added": leads_added, "schools_onboarded": schools_onboarded, "student_leads": student_leads},
        "role_kpis": role_kpis,
        "projects": {"leading": projects_leading, "member": projects_member},
    }


# ─────────────────────── Email sending ──────────────────────────────────
async def _email_manager(manager: Dict[str, Any], reports: List[Dict[str, Any]]) -> None:
    """Send one email per manager with per-report PDFs attached."""
    if not manager.get("email"):
        logger.warning("[weekly-team-report] manager %s has no email", manager.get("id"))
        return

    attachments = []
    lines = []
    for rep in reports:
        pdf_bytes = _build_report_pdf(rep)
        safe = (rep["user"]["name"] or "member").replace(" ", "_").replace("/", "_")
        attachments.append({
            "filename": f"OLL_Weekly_Report_{safe}_{rep['period']['start']}.pdf",
            "content": base64.b64encode(pdf_bytes).decode(),
        })
        t = rep.get("totals", {})
        lines.append(
            f"<tr>"
            f"<td style='padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600'>{rep['user']['name']}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #e2e8f0;text-align:center'>{t.get('tasks_completed',0)}/{t.get('tasks_assigned',0)}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #e2e8f0;text-align:center'>{t.get('queries_resolved',0)}/{t.get('queries_assigned',0)}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #e2e8f0;text-align:center'>{t.get('field_visits',0)}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #e2e8f0;text-align:center'>{t.get('calls_connected',0)}</td>"
            f"</tr>"
        )

    period_label = reports[0]["period"]["label"] if reports else ""
    html = f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px">
      <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:20px;border-radius:12px;color:white">
        <h1 style="margin:0;font-size:22px">Weekly Team Performance Report</h1>
        <p style="margin:6px 0 0;opacity:0.9;font-size:14px">{period_label} · {len(reports)} team member{'s' if len(reports) != 1 else ''}</p>
      </div>
      <p style="color:#334155;margin-top:20px;font-size:14px">Hi {manager.get('name','Manager')},</p>
      <p style="color:#475569;font-size:14px;line-height:1.6">
        Here's the weekly performance snapshot for your team. Detailed PDF reports for each member are attached.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f1f5f9;color:#334155;text-align:left">
            <th style="padding:10px;border-bottom:1px solid #e2e8f0">Team Member</th>
            <th style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center">Tasks Done / Assigned</th>
            <th style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center">Queries Resolved / In</th>
            <th style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center">Field Visits</th>
            <th style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center">Calls Connected</th>
          </tr>
        </thead>
        <tbody>{''.join(lines)}</tbody>
      </table>
      <p style="color:#64748B;font-size:12px;margin-top:20px">This is an automated report from OLL Live Ops. Open the attached PDFs for full task lists, query breakdowns and time-bucketed KPIs.</p>
    </div>
    """

    params = {
        "from": SENDER_EMAIL,
        "to": [manager["email"]],
        "subject": f"Weekly Team Report — {period_label}",
        "html": html,
        "attachments": attachments,
    }
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info("[weekly-team-report] Emailed manager %s with %d attachments",
                    manager.get("email"), len(attachments))
    except Exception as e:
        logger.exception("[weekly-team-report] Failed to email %s: %s", manager.get("email"), e)


async def _run_weekly_pipeline() -> Dict[str, Any]:
    """Enumerate managers, build reports for their direct reports, email each."""
    # Ref = last Monday (7 days ago) so the report covers last week
    ref = (datetime.now(IST) - timedelta(days=7)).strftime("%Y-%m-%d")

    # Find all users who have at least one direct report
    managers_ids: set[str] = set()
    async for tu in db.team_users.find({"reports_to": {"$nin": [None, ""]}}, {"reports_to": 1}):
        managers_ids.add(tu["reports_to"])

    sent, failed, no_reports = 0, 0, 0
    for mgr_id in managers_ids:
        manager = await db.team_users.find_one({"id": mgr_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if not manager or not manager.get("email"):
            failed += 1
            continue
        # Get direct reports
        directs_cur = db.team_users.find({"reports_to": mgr_id, "status": {"$ne": "inactive"}},
                                          {"_id": 0, "id": 1})
        directs = await directs_cur.to_list(None)
        if not directs:
            no_reports += 1
            continue

        # Build a report per direct report
        reports = []
        for d in directs:
            try:
                rep = await _assemble_report(d["id"], "weekly", ref)
                reports.append(rep)
            except Exception as e:
                logger.exception("[weekly-team-report] Failed to assemble report for %s: %s", d.get("id"), e)

        if reports:
            try:
                await _email_manager(manager, reports)
                sent += 1
            except Exception:
                failed += 1

    return {"managers_notified": sent, "no_reports": no_reports, "failed": failed}


# ─────────────────────── Cron endpoint ─────────────────────────────────
@router.post("/weekly-team-report")
async def weekly_team_report(
    request: Request,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
    x_webhook_id: Optional[str] = Header(None),
):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    if not _auth_ok(authorization):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Idempotency — skip if we've already processed this run_id
    run_id = x_webhook_id or None
    if run_id:
        seen = await db.cron_runs.find_one({"run_id": run_id, "job": "weekly-team-report"})
        if seen:
            return {"ok": True, "duplicate": True, "run_id": run_id}
        await db.cron_runs.insert_one({
            "run_id": run_id, "job": "weekly-team-report",
            "at": datetime.now(timezone.utc).isoformat(),
        })

    background_tasks.add_task(_run_weekly_pipeline_wrapped)
    return {"ok": True, "queued": True, "run_id": run_id}


async def _run_weekly_pipeline_wrapped():
    try:
        stats = await _run_weekly_pipeline()
        logger.info("[weekly-team-report] Completed: %s", stats)
    except Exception as e:
        logger.exception("[weekly-team-report] Pipeline failed: %s", e)


# ─────────────── Manual trigger for admins (preview / testing) ─────────
@router.post("/weekly-team-report/preview")
async def weekly_team_report_preview_run(request: Request, authorization: Optional[str] = Header(None)):
    """Same pipeline but callable by an admin via Bearer JWT.

    Used for manual verification without waiting for Monday 3PM. Authenticated
    via the standard app JWT — not the webhook secret."""
    from routes.shared import get_current_user
    # Lazy dependency check — parse token from header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Login required")
    token = authorization.removeprefix("Bearer ").strip()
    # If it's the webhook secret we accept it (dev shortcut)
    if secrets.compare_digest(token, os.environ.get("WEBHOOK_CRON_SECRET", "")):
        pass
    else:
        # Otherwise decode JWT and check role
        try:
            user = await get_current_user(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
        if (user.get("role") or "").lower() not in {"admin", "super_admin", "superadmin"}:
            raise HTTPException(status_code=403, detail="Admin only")
    stats = await _run_weekly_pipeline()
    return {"ok": True, "stats": stats}
