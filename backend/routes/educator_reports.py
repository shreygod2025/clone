"""Educator monthly performance report (CheckIn + LMS + earnings)."""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import calendar
import io
import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from routes.shared import db, get_current_user

router = APIRouter(prefix="/admin/educators", tags=["educator-reports"])
logger = logging.getLogger(__name__)


# ─── Admin gate ─────────────────────────────────────────────────────────
def _admin_only(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def _month_bounds(month: str) -> tuple[str, str]:
    """`month` = 'YYYY-MM' → (start ISO, end ISO) inclusive-of-start,
    exclusive-of-end.  Falls back to full range on parse error."""
    try:
        y, m = month.split("-")
        y, m = int(y), int(m)
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        last_day = calendar.monthrange(y, m)[1]
        end = datetime(y, m, last_day, 23, 59, 59, tzinfo=timezone.utc) + timedelta(seconds=1)
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")
    except Exception:
        return "1970-01-01", "2100-12-31"


_ONTIME = {"punctual_less_15", "punctual_more_15", "ontime", "on_time", "early"}
_LATE   = {"late", "late_less_15", "late_more_15"}


def _classify_admin_status(s: Optional[str]) -> str:
    if not s: return "unknown"
    a = s.lower()
    if a in _ONTIME or a.startswith("punctual") or a.startswith("early"): return "on_time"
    if a in _LATE or a.startswith("late"): return "late"
    if a in ("absent", "no_show") or a.startswith("absent"): return "absent"
    return "unknown"


def _hours_between(start: Optional[str], end: Optional[str]) -> float:
    """`start` and `end` are 'HH:MM:SS' strings from CheckIn.  Returns
    duration in hours, clamped to 0-12."""
    if not (start and end): return 0.0
    try:
        s = datetime.strptime(start.split(".")[0][:8], "%H:%M:%S")
        e = datetime.strptime(end.split(".")[0][:8], "%H:%M:%S")
        h = (e - s).total_seconds() / 3600.0
        if h < 0: h += 24  # overnight edge-case
        return max(0.0, min(12.0, h))
    except Exception:
        return 0.0


async def _resolve_checkin_id(educator: dict) -> Optional[str]:
    """Map an OLL educator to the CheckIn API user by email."""
    email = (educator.get("email") or "").lower().strip()
    if not email: return None
    try:
        from routes.checkin_api import _fetch_all_pages
        import httpx
        async with httpx.AsyncClient() as client:
            rows = await _fetch_all_pages("/educators", {}, per_page=500, hard_cap=2000, client=client)
            for r in rows or []:
                if (r.get("email") or "").lower() == email:
                    return r.get("id")
    except Exception as e:
        logger.warning("checkin id lookup failed: %s", e)
    return None


async def _build_report(educator: dict, month: Optional[str]) -> Dict[str, Any]:
    """Compose a single dict with hours, days, punctuality, attire, earnings."""
    from routes.checkin_api import _checkin_get

    checkin_id = await _resolve_checkin_id(educator)
    report: Dict[str, Any] = {
        "educator": {
            "id": educator.get("id"),
            "name": educator.get("name") or educator.get("full_name"),
            "email": educator.get("email"),
            "phone": educator.get("phone"),
            "checkin_id": checkin_id,
        },
        "month": month or "all",
        "period": {"start": None, "end": None},
        "sessions": {
            "total": 0, "completed": 0, "on_time": 0, "late": 0, "absent": 0,
            "unique_days": 0, "hours": 0.0,
        },
        "attire": {"oll_tshirt": 0, "other": 0, "not_recorded": 0},
        "earnings": {"available": False, "amount": 0.0, "currency": "INR", "invoices": [], "note": None},
        "days_breakdown": [],
    }

    if not checkin_id:
        report["earnings"]["note"] = "This educator's email isn't linked to a CheckIn account"
        return report

    start_str, end_str = _month_bounds(month) if month and month != "all" else ("1970-01-01", "2100-12-31")
    report["period"] = {"start": start_str, "end": end_str}

    # 1) Fetch attendance for the educator (paged)
    attendance_rows: List[dict] = []
    page = 1
    while page <= 20:  # hard cap
        try:
            resp = await _checkin_get("/attendance", {"user_id": checkin_id, "per_page": 200, "page": page})
        except Exception as e:
            logger.warning("attendance fetch failed: %s", e); break
        batch = (resp.get("data") if isinstance(resp, dict) else None) or []
        if not batch: break
        attendance_rows.extend(batch)
        if len(batch) < 200: break
        page += 1

    # 2) Fetch sessions for the educator (paged) → hours + total scheduled
    sessions_rows: List[dict] = []
    page = 1
    while page <= 20:
        try:
            resp = await _checkin_get("/sessions", {"educator_id": checkin_id, "per_page": 200, "page": page})
        except Exception as e:
            logger.warning("sessions fetch failed: %s", e); break
        batch = (resp.get("data") if isinstance(resp, dict) else None) or []
        if not batch: break
        sessions_rows.extend(batch)
        if len(batch) < 200: break
        page += 1

    # Index attendance by session_id (first-checkin wins)
    att_by_session: dict = {}
    for a in attendance_rows:
        sid = a.get("session_id")
        if sid and (sid not in att_by_session or (a.get("check_in_time") or "") < (att_by_session[sid].get("check_in_time") or "")):
            att_by_session[sid] = a

    # 3) Filter sessions to the month window & compute
    days_seen = set()
    per_day: Dict[str, Dict[str, Any]] = {}

    for s in sessions_rows:
        sdate = s.get("session_date") or ""
        if not (start_str <= sdate < end_str):
            continue
        report["sessions"]["total"] += 1
        att = att_by_session.get(s.get("id"))
        cls = _classify_admin_status((att or {}).get("admin_status"))
        report["sessions"][cls] = report["sessions"].get(cls, 0) + 1 if cls in ("on_time", "late", "absent") else report["sessions"].get(cls, 0)
        if cls == "on_time":  report["sessions"]["on_time"]  += 0  # (already handled above)
        if cls == "late":     report["sessions"]["late"]     += 0
        if cls == "absent":   report["sessions"]["absent"]   += 0

        hrs = _hours_between(s.get("start_time"), s.get("end_time"))
        if s.get("iscompleted"):
            report["sessions"]["completed"] += 1
            report["sessions"]["hours"] += hrs

        days_seen.add(sdate)

        # Attire from attendance
        attire = ((att or {}).get("admin_attire") or "").lower()
        if attire in ("oll_tshirt", "oll", "in_uniform", "uniform", "not_uniform_oll"):
            if attire in ("oll_tshirt", "oll", "in_uniform", "uniform"):
                report["attire"]["oll_tshirt"] += 1
            else:
                report["attire"]["other"] += 1
        elif attire in ("", "not_recorded", "not_issued"):
            report["attire"]["not_recorded"] += 1
        else:
            report["attire"]["other"] += 1

        # Per-day roll-up
        d = per_day.setdefault(sdate, {"date": sdate, "sessions": 0, "hours": 0.0, "on_time": 0, "late": 0, "absent": 0, "attire": None})
        d["sessions"] += 1
        d["hours"] += hrs if s.get("iscompleted") else 0
        if cls in ("on_time", "late", "absent"): d[cls] += 1
        if attire and not d["attire"]: d["attire"] = attire

    # Fix on_time / late / absent counters (the loop above accidentally noop'd them)
    ot = lt = ab = 0
    for s in sessions_rows:
        sdate = s.get("session_date") or ""
        if not (start_str <= sdate < end_str):
            continue
        att = att_by_session.get(s.get("id"))
        cls = _classify_admin_status((att or {}).get("admin_status"))
        if cls == "on_time": ot += 1
        elif cls == "late": lt += 1
        elif cls == "absent": ab += 1
    report["sessions"]["on_time"] = ot
    report["sessions"]["late"] = lt
    report["sessions"]["absent"] = ab

    report["sessions"]["unique_days"] = len(days_seen)
    report["sessions"]["hours"] = round(report["sessions"]["hours"], 2)
    report["days_breakdown"] = sorted(per_day.values(), key=lambda r: r["date"], reverse=True)

    # 4) Earnings from /invoices
    try:
        resp = await _checkin_get("/invoices", {"educator_id": checkin_id, "per_page": 60})
        invoices = (resp.get("data") if isinstance(resp, dict) else None) or []
        picked: List[dict] = []
        total = 0.0
        for inv in invoices:
            im = (inv.get("month") or "")[:7]  # 'YYYY-MM'
            if month and month != "all" and im != month:
                continue
            snapshot = inv.get("snapshot") or {}
            earning = snapshot.get("earning") or {}
            amount = float(earning.get("final_amount") or 0.0)
            total += amount
            picked.append({
                "invoice_number": inv.get("invoice_number"),
                "month": im,
                "status": inv.get("status"),
                "amount": amount,
                "calculated": earning.get("calculated_amount"),
                "travel_allowance": earning.get("travel_allowance"),
                "tds": earning.get("tds_amount"),
                "adjustments": earning.get("total_adjustments"),
                "issued_at": inv.get("issued_at"),
                "pdf_path": inv.get("pdf_path"),
            })
        report["earnings"] = {
            "available": True, "amount": round(total, 2), "currency": "INR",
            "invoices": picked, "note": None,
        }
    except Exception as e:
        msg = str(e)
        if "payments:read" in msg:
            report["earnings"]["note"] = "CheckIn API key needs 'payments:read' scope to fetch earnings"
        else:
            report["earnings"]["note"] = f"Earnings unavailable: {msg[:120]}"

    return report


async def _find_educator(educator_id: str) -> dict:
    """Load an active educator row by _id from any of the collections we
    know about.  Returns a normalised dict with at least name+email."""
    from bson import ObjectId

    for coll in ("educator_applications", "educators", "educator_profiles"):
        try:
            q = {"id": educator_id}
            doc = await db[coll].find_one(q, {"_id": 0})
            if not doc:
                try:
                    doc = await db[coll].find_one({"_id": ObjectId(educator_id)}, {"_id": 0})
                except Exception: doc = None
            if doc:
                return {
                    "id": educator_id,
                    "name": doc.get("full_name") or doc.get("name"),
                    "email": doc.get("email"),
                    "phone": doc.get("phone") or doc.get("phone_number"),
                    "status": doc.get("status"),
                    "_source": coll,
                }
        except Exception as e:
            logger.warning("find_educator %s failed: %s", coll, e)
    raise HTTPException(status_code=404, detail="Educator not found")


# ─── Endpoints ─────────────────────────────────────────────────────────
@router.get("/{educator_id}/report")
async def get_educator_report(
    educator_id: str,
    month: Optional[str] = Query(None, description="YYYY-MM. Omit or 'all' for lifetime."),
    user: dict = Depends(_admin_only),
):
    educator = await _find_educator(educator_id)
    return await _build_report(educator, month)


@router.get("/{educator_id}/report.csv")
async def download_educator_report_csv(
    educator_id: str,
    month: Optional[str] = Query(None),
    user: dict = Depends(_admin_only),
):
    """CSV export of the educator's monthly report."""
    from fastapi.responses import Response
    import csv

    educator = await _find_educator(educator_id)
    r = await _build_report(educator, month)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["OLL Educator Report"])
    w.writerow(["Educator", r["educator"]["name"], r["educator"]["email"]])
    w.writerow(["Period", r["period"]["start"], r["period"]["end"]])
    w.writerow([])
    w.writerow(["Summary"])
    w.writerow(["Total sessions", r["sessions"]["total"]])
    w.writerow(["Completed", r["sessions"]["completed"]])
    w.writerow(["Hours teaching", r["sessions"]["hours"]])
    w.writerow(["Days occupied", r["sessions"]["unique_days"]])
    w.writerow(["On-time", r["sessions"]["on_time"]])
    w.writerow(["Late", r["sessions"]["late"]])
    w.writerow(["Absent", r["sessions"]["absent"]])
    w.writerow(["OLL T-shirt", r["attire"]["oll_tshirt"]])
    w.writerow(["Other attire", r["attire"]["other"]])
    w.writerow(["Attire not recorded", r["attire"]["not_recorded"]])
    w.writerow(["Earnings (INR)", r["earnings"]["amount"] if r["earnings"]["available"] else "unavailable"])
    if r["earnings"].get("note"): w.writerow(["Earnings note", r["earnings"]["note"]])
    w.writerow([])
    w.writerow(["Day-wise breakdown"])
    w.writerow(["Date", "Sessions", "Hours", "On-time", "Late", "Absent", "Attire"])
    for d in r["days_breakdown"]:
        w.writerow([d["date"], d["sessions"], round(d["hours"], 2), d["on_time"], d["late"], d["absent"], d.get("attire") or ""])
    w.writerow([])
    w.writerow(["Invoices"])
    w.writerow(["Invoice #", "Month", "Status", "Amount", "Issued at"])
    for inv in r["earnings"].get("invoices") or []:
        w.writerow([inv.get("invoice_number"), inv.get("month"), inv.get("status"), inv.get("amount"), inv.get("issued_at")])
    filename = f"educator-report-{educator['email']}-{month or 'all'}.csv"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_pdf(r: Dict[str, Any]) -> bytes:
    """Render the report dict into a branded PDF using reportlab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    )

    OLL_NAVY  = colors.HexColor("#0A1F44")
    OLL_RED   = colors.HexColor("#D63031")
    ACCENT    = colors.HexColor("#059669")
    MUTED     = colors.HexColor("#64748b")
    LIGHT_BG  = colors.HexColor("#F1F5F9")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=15*mm, rightMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('T', parent=styles['Heading1'], textColor=OLL_NAVY, fontSize=20, spaceAfter=4, leading=24, fontName='Helvetica-Bold')
    sub_style = ParagraphStyle('S', parent=styles['Normal'], textColor=MUTED, fontSize=10, spaceAfter=12)
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], textColor=OLL_NAVY, fontSize=13, spaceAfter=8, spaceBefore=14, fontName='Helvetica-Bold')
    body = ParagraphStyle('B', parent=styles['Normal'], fontSize=10, leading=13)

    story: list = []
    # Header
    story.append(Paragraph("OLL Educator Performance Report", title_style))
    edu = r["educator"]
    story.append(Paragraph(
        f"{edu.get('name') or edu.get('email') or 'Educator'} &nbsp;·&nbsp; "
        f"<font color='#94a3b8'>{edu.get('email') or ''}</font>",
        sub_style,
    ))
    month_label = r["month"] if r["month"] and r["month"] != "all" else "All time"
    linked = "✓ Linked to CheckIn account" if edu.get("checkin_id") else "⚠ Not linked to CheckIn"
    story.append(Paragraph(
        f"<b>Period:</b> {month_label} &nbsp;&nbsp;·&nbsp;&nbsp; "
        f"<b>Status:</b> <font color='{'#059669' if edu.get('checkin_id') else '#d97706'}'>{linked}</font>",
        body,
    ))
    story.append(Spacer(1, 10))

    # Summary table
    s = r["sessions"]
    a = r["attire"]
    e = r["earnings"]
    total_att = (a.get("oll_tshirt") or 0) + (a.get("other") or 0) + (a.get("not_recorded") or 0)
    tshirt_pct = int(round((a.get("oll_tshirt", 0) / total_att) * 100)) if total_att else 0
    earn_line = (
        f"₹{(e.get('amount') or 0):,.0f} · {len(e.get('invoices') or [])} invoice(s)"
        if e.get("available") else (e.get("note") or "Not available")
    )
    rows = [
        ["Hours Teaching",  str(s.get("hours", 0)),     "Days Occupied",    str(s.get("unique_days", 0))],
        ["Total Sessions",  str(s.get("total", 0)),     "Completed",        str(s.get("completed", 0))],
        ["On-time",         str(s.get("on_time", 0)),   "Late",             str(s.get("late", 0))],
        ["Absent",          str(s.get("absent", 0)),    "OLL T-shirt days", f"{a.get('oll_tshirt', 0)} · {tshirt_pct}%"],
        ["Earnings (INR)",  earn_line,                  "",                 ""],
    ]
    tbl = Table(rows, colWidths=[38*mm, 45*mm, 38*mm, 45*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_BG),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_BG),
        ('TEXTCOLOR', (0, 0), (0, -1), OLL_NAVY),
        ('TEXTCOLOR', (2, 0), (2, -1), OLL_NAVY),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 6))

    # Day-wise
    story.append(Paragraph("Day-wise breakdown", h2_style))
    days = r.get("days_breakdown") or []
    if not days:
        note = "No sessions in this period."
        if not edu.get("checkin_id"):
            note += " (This educator isn't linked to a CheckIn account.)"
        story.append(Paragraph(f"<i><font color='#94a3b8'>{note}</font></i>", body))
    else:
        head = ["Date", "Sessions", "Hours", "On-time", "Late", "Absent", "Attire"]
        data = [head] + [
            [d["date"], str(d["sessions"]), f"{d['hours']:.2f}", str(d["on_time"]), str(d["late"]), str(d["absent"]), d.get("attire") or "—"]
            for d in days
        ]
        tbl = Table(data, colWidths=[28*mm, 18*mm, 16*mm, 18*mm, 14*mm, 16*mm, 32*mm], repeatRows=1)
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), OLL_NAVY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (5, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(tbl)

    # Invoices
    story.append(Paragraph("Earnings · Invoices", h2_style))
    inv_rows = e.get("invoices") or []
    if not e.get("available"):
        story.append(Paragraph(f"<i><font color='#94a3b8'>{e.get('note') or 'Earnings data unavailable.'}</font></i>", body))
    elif not inv_rows:
        story.append(Paragraph("<i><font color='#94a3b8'>No invoices in this period.</font></i>", body))
    else:
        head = ["Invoice", "Month", "Status", "Base", "Travel", "TDS", "Adj.", "Amount"]
        data = [head] + [
            [
                inv.get("invoice_number") or "—",
                inv.get("month") or "—",
                (inv.get("status") or "").upper(),
                f"₹{(inv.get('calculated') or 0):,.0f}",
                f"₹{(inv.get('travel_allowance') or 0):,.0f}",
                f"₹{(inv.get('tds') or 0):,.0f}",
                f"₹{(inv.get('adjustments') or 0):,.0f}",
                f"₹{(inv.get('amount') or 0):,.0f}",
            ] for inv in inv_rows
        ]
        tbl = Table(data, colWidths=[38*mm, 20*mm, 18*mm, 20*mm, 18*mm, 15*mm, 15*mm, 22*mm], repeatRows=1)
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), OLL_NAVY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('ALIGN', (3, 0), (7, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('FONTNAME', (7, 1), (7, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (7, 1), (7, -1), ACCENT),
        ]))
        story.append(tbl)

    # Footer
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        f"<font color='#94a3b8' size='8'>Generated by OLL · {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}</font>",
        body,
    ))
    doc.build(story)
    return buf.getvalue()


@router.get("/{educator_id}/report.pdf")
async def download_educator_report_pdf(
    educator_id: str,
    month: Optional[str] = Query(None),
    user: dict = Depends(_admin_only),
):
    """PDF export of the educator's monthly report — branded layout."""
    from fastapi.responses import Response
    educator = await _find_educator(educator_id)
    r = await _build_report(educator, month)
    pdf = _build_pdf(r)
    filename = f"educator-report-{(educator.get('email') or educator_id).replace('@','_')}-{month or 'all'}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{educator_id}/report/email")
async def email_educator_report(
    educator_id: str,
    month: Optional[str] = Query(None),
    user: dict = Depends(_admin_only),
):
    """Email the monthly report to the educator (HTML summary + CSV note)."""
    educator = await _find_educator(educator_id)
    if not educator.get("email"):
        raise HTTPException(status_code=400, detail="Educator has no email on file")
    r = await _build_report(educator, month)

    label = month or "All time"
    subject = f"Your OLL Performance Report · {label}"
    s = r["sessions"]; a = r["attire"]; e = r["earnings"]
    earnings_line = (
        f"<tr><td>Earnings (INR)</td><td><strong>₹{e['amount']:.0f}</strong></td></tr>"
        if e["available"] else
        f"<tr><td>Earnings</td><td style='color:#94a3b8'>{e.get('note') or 'Not available yet'}</td></tr>"
    )
    html = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
      <h2 style="margin:0 0 4px;color:#0A1F44">Hi {r['educator']['name']}, 👋</h2>
      <p style="color:#475569;margin:0 0 20px">Here's your OLL performance snapshot for <strong>{label}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tbody>
          <tr><td style="padding:8px 0;color:#64748b">Total sessions</td><td style="text-align:right;font-weight:700">{s['total']}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Completed</td><td style="text-align:right;font-weight:700">{s['completed']}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Hours teaching</td><td style="text-align:right;font-weight:700">{s['hours']}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Days occupied</td><td style="text-align:right;font-weight:700">{s['unique_days']}</td></tr>
          <tr><td style="padding:8px 0;color:#059669">On-time reached</td><td style="text-align:right;font-weight:700;color:#059669">{s['on_time']}</td></tr>
          <tr><td style="padding:8px 0;color:#d97706">Late</td><td style="text-align:right;font-weight:700;color:#d97706">{s['late']}</td></tr>
          <tr><td style="padding:8px 0;color:#dc2626">Absent</td><td style="text-align:right;font-weight:700;color:#dc2626">{s['absent']}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">OLL T-shirt days</td><td style="text-align:right;font-weight:700">{a['oll_tshirt']}</td></tr>
          <tr style="border-top:2px solid #e2e8f0"><td style="padding:12px 0;color:#0A1F44;font-weight:700">{earnings_line[4:-5].split('<td>')[0].strip('<>/td ')}</td>{earnings_line[earnings_line.index('<td>', 5):]}
        </tbody>
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Keep it up! Reach out to your OLL coordinator if any of the numbers look off.</p>
    </div>
    """
    try:
        # Use existing Resend integration
        from routes.email_service import send_email_via_resend  # type: ignore
        result = await send_email_via_resend(to=r["educator"]["email"], subject=subject, html=html)
        return {"ok": True, "sent_to": r["educator"]["email"], "provider_response": result}
    except Exception as ex:
        logger.warning("resend send failed: %s", ex)
        # Fallback: try RESEND HTTP direct
        import os, httpx
        api_key = os.environ.get("RESEND_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail=f"Email service unavailable: {ex}")
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"from": os.environ.get("RESEND_FROM", "OLL <noreply@oll.co>"),
                          "to": [r["educator"]["email"]], "subject": subject, "html": html},
                )
            if resp.status_code >= 300:
                raise HTTPException(status_code=500, detail=f"Resend error: {resp.text[:200]}")
            return {"ok": True, "sent_to": r["educator"]["email"], "id": resp.json().get("id")}
        except HTTPException:
            raise
        except Exception as ex2:
            raise HTTPException(status_code=500, detail=f"Failed to send: {ex2}")
