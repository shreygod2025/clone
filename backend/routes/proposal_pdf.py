"""
Server-side proposal PDF generator + a signed public download link so
WhatsApp / email flows can share the PDF without a login. Layout mirrors
``frontend/src/utils/proposalPdfGenerator.js`` closely enough for parity.

Endpoints:
    GET  /api/public/proposals/{school_id}.pdf?sig=<hmac>
         Public, signed link. No auth. Streams the freshly rendered PDF
         so the CRM stays the single source of truth for pricing data.

    GET  /api/proposals/{school_id}/share-url
         Auth-only. Returns { url, filename } — a signed, no-auth URL
         suitable for WhatsApp / email.

Signature scheme:
    sig = HMAC-SHA256(secret, f"{school_id}|{yyyy-mm-dd}").hexdigest()[:32]
    So links auto-expire at midnight UTC of the day they were minted —
    good enough for a WhatsApp share.
"""
import hashlib
import hmac
import io
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from reportlab.lib.colors import Color, HexColor, black, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .shared import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

PROPOSAL_LINK_SECRET = (
    os.environ.get("PROPOSAL_LINK_SECRET")
    or os.environ.get("JWT_SECRET")
    or "oll-proposal-share-secret-change-me"
)

# ─── Colours & sizes ────────────────────────────────────────────
BRAND_NAVY = HexColor("#1E3A5F")
BRAND_GREY = HexColor("#f5f5f5")
BRAND_GREY_LINE = HexColor("#c8c8c8")
BODY_GREY = HexColor("#646464")

PW, PH = A4              # 210 × 297 mm
M = 15 * mm
CW = PW - 2 * M


# ─── Signature helpers ──────────────────────────────────────────
def _sig_for(school_id: str, day: str | None = None) -> str:
    day = day or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return hmac.new(
        PROPOSAL_LINK_SECRET.encode(),
        f"{school_id}|{day}".encode(),
        hashlib.sha256,
    ).hexdigest()[:32]


def _valid_sig(school_id: str, provided: str) -> bool:
    """Accept sig for today OR yesterday so cross-midnight WhatsApp taps still work."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = datetime.fromtimestamp(
        datetime.now(timezone.utc).timestamp() - 86400, tz=timezone.utc,
    ).strftime("%Y-%m-%d")
    return any(
        hmac.compare_digest(provided, _sig_for(school_id, d))
        for d in (today, yesterday)
    )


# ─── Low-level drawing helpers ─────────────────────────────────
class _Cursor:
    """Mutable Y cursor + page auto-break; keeps the pdfgen call site tidy."""

    def __init__(self, c: canvas.Canvas, top_margin: float = 12 * mm):
        self.c = c
        self.top_margin = top_margin
        self.y = PH - top_margin

    def move(self, dy: float):
        self.y -= dy
        if self.y < 25 * mm:
            self.c.showPage()
            self.y = PH - self.top_margin

    def ensure(self, needed: float):
        if self.y - needed < 25 * mm:
            self.c.showPage()
            self.y = PH - self.top_margin


def _wrap_text(c: canvas.Canvas, text: str, font: str, size: int, max_w: float) -> list[str]:
    """Greedy word-wrap → list of lines that each fit in *max_w* points."""
    c.setFont(font, size)
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        candidate = f"{cur} {w}".strip()
        if c.stringWidth(candidate, font, size) <= max_w:
            cur = candidate
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def _bullet(cur: _Cursor, text: str, indent: float = 8 * mm):
    c = cur.c
    line_h = 5 * mm
    lines = _wrap_text(c, text, "Helvetica", 10, CW - indent - 4 * mm)
    cur.ensure(len(lines) * line_h + 2)
    c.setFillColor(BRAND_NAVY)
    c.circle(M + 3 * mm, cur.y - 1.5, 1.2, stroke=0, fill=1)
    c.setFillColor(black)
    c.setFont("Helvetica", 10)
    for ln in lines:
        c.drawString(M + indent, cur.y - 3, ln)
        cur.move(line_h)
    cur.move(1)


# ─── Main PDF renderer ──────────────────────────────────────────
def render_proposal_pdf(school: dict, data: dict) -> bytes:
    """Render a Robotics & AI proposal PDF matching the frontend layout."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    cur = _Cursor(c)

    school_name = (
        school.get("school_name")
        or school.get("name")
        or "School"
    )
    city = school.get("city") or ""

    # ── Blue header band ─────────────────────────────────────
    c.setFillColor(BRAND_NAVY)
    c.rect(0, PH - 32 * mm, PW, 32 * mm, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(M, PH - 20 * mm, "OLL")
    c.setFont("Helvetica", 10)
    c.drawString(M, PH - 26 * mm, "Robotics · Coding · AI")
    cur.y = PH - 42 * mm

    # ── Title ────────────────────────────────────────────────
    c.setFillColor(BRAND_NAVY)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(PW / 2, cur.y, "OLL Robotics and AI Program Proposal")
    cur.move(7 * mm)
    c.setFillColor(BODY_GREY)
    c.setFont("Helvetica", 11)
    label = f"For {school_name}" + (f", {city}" if city else "")
    c.drawCentredString(PW / 2, cur.y, label)
    cur.move(10 * mm)

    # ── Greeting ─────────────────────────────────────────────
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(M, cur.y, f"Dear {school_name} Team,")
    cur.move(6 * mm)
    c.setFont("Helvetica", 11)
    c.drawString(M, cur.y, "Greetings from Team OLL")
    cur.move(10 * mm)

    # ── Grade-range intro ────────────────────────────────────
    grades_from = data.get("grades_from") or "1st"
    grades_to = data.get("grades_to") or "10th"
    grade_range = f"{grades_from} to {grades_to}"
    intro = (
        f"We are delighted to share OLL's Robotics & AI Lab Setup for the "
        f"upcoming academic year at your school. Designed for students from "
        f"{grade_range}, this program has already been successfully "
        f"implemented in 400+ schools across India, with remarkable "
        f"achievements."
    )
    c.setFont("Helvetica", 10)
    for ln in _wrap_text(c, intro, "Helvetica", 10, CW):
        c.drawString(M, cur.y, ln)
        cur.move(5 * mm)
    cur.move(4 * mm)

    # ── Program details box ────────────────────────────────
    training = (data.get("training_type") or "both").lower()
    training_display = {
        "teacher_training": "Teacher Training",
        "student_training": "Student Training",
        "both": "Both (Teacher + Student)",
    }.get(training, "Both (Teacher + Student)")
    program = (data.get("program_type") or "lab_setup").lower()
    program_display = {
        "lab_setup": "Robotics & AI Lab Setup",
        "per_student": "Per-Student Individual Kits",
    }.get(program, "Robotics & AI Lab Setup")

    box_h = 28 * mm
    cur.ensure(box_h + 4 * mm)
    c.setFillColor(BRAND_GREY)
    c.setStrokeColor(BRAND_GREY_LINE)
    c.roundRect(M, cur.y - box_h, CW, box_h, 4, stroke=1, fill=1)
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 10)
    inside_y = cur.y - 7 * mm
    c.drawString(M + 6 * mm, inside_y, f"Program: {program_display}")
    c.drawString(M + 105 * mm, inside_y, "Model: Compulsory")
    c.drawString(M + 6 * mm, inside_y - 7 * mm, f"Type of Training: {training_display}")
    c.drawString(M + 6 * mm, inside_y - 14 * mm, f"Grades: {grade_range}")
    cur.move(box_h + 8 * mm)

    # ── Deliverables ─────────────────────────────────────────
    c.setFillColor(BRAND_NAVY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(M, cur.y, "Program Deliverables")
    cur.move(7 * mm)
    c.setFillColor(black)
    c.setFont("Helvetica", 10)

    lab_kit_count = data.get("lab_kit_count") or 30
    kit_ratio = data.get("kit_ratio") or "1:2"
    deliverables: list[str] = []
    if program == "lab_setup":
        deliverables.append(
            f"{lab_kit_count} Master Robotics & AI Lab Kits will be provided "
            f"to the school. Kit to Child ratio: {kit_ratio}."
        )
        deliverables.append("Lab wallpapers & decoration material provided.")
    else:
        deliverables.append("Individual Robotics & AI kit provided to each student.")
    deliverables.append(
        "28-project curriculum covering Robotics, Coding, 3D Design, AI and Science."
    )
    if training == "teacher_training":
        deliverables.append("Year-long teacher training for the school's teachers.")
        deliverables.append("One hard-copy Robotics manual per grade.")
    elif training == "student_training":
        deliverables.append("Direct student training sessions conducted by OLL trainers.")
    else:
        deliverables.append("Year-long teacher training for the school's teachers.")
        deliverables.append("Direct student training sessions by OLL trainers.")
        deliverables.append("One hard-copy Robotics manual per grade.")
    deliverables.append(
        "LMS access for every child — progress tracking, assessments and a soft-copy STEM certificate."
    )
    deliverables.append(
        "Robotics Competition & Robotics Exhibition conducted at the school."
    )
    for item in deliverables:
        _bullet(cur, item)
    cur.move(4 * mm)

    # ── Fees table ───────────────────────────────────────────
    c.setFillColor(BRAND_NAVY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(M, cur.y, "Fees Structure")
    cur.move(6 * mm)

    pricing_type = (data.get("pricing_type") or "per_student").lower()
    grade_pricing = data.get("grade_pricing") or []
    fixed_price = data.get("fixed_price") or 0

    def _inr(v) -> str:
        try:
            return f"Rs. {int(float(v)):,}".replace(",", ",")
        except Exception:
            return f"Rs. {v}"

    rows: list[tuple[str, str]] = []
    if pricing_type == "fixed":
        rows.append(("Robotics & AI Program (Annual Fee)", _inr(fixed_price)))
    elif pricing_type == "both":
        rows.append(("Fixed Annual Program Fee", _inr(fixed_price)))
        for gp in grade_pricing:
            g = str(gp.get("grade", "")).strip()
            p = gp.get("price_per_student") or gp.get("price") or 0
            if g and float(p or 0) > 0:
                rows.append((f"Grade {g} (Per Student)", f"{_inr(p)}/student/year"))
    else:
        for gp in grade_pricing:
            g = str(gp.get("grade", "")).strip()
            p = gp.get("price_per_student") or gp.get("price") or 0
            if g and float(p or 0) > 0:
                rows.append((f"Grade {g}", f"{_inr(p)}/student/year"))
        if not rows:
            rows.append(("Robotics & AI Program", "Per student pricing (to be discussed)"))

    # Draw the table manually — no autoTable dep, keeps it snappy.
    row_h = 8 * mm
    col1_w = CW * 0.55
    col2_w = CW * 0.45
    cur.ensure(row_h * (len(rows) + 1) + 4 * mm)

    # Header
    c.setFillColor(BRAND_NAVY)
    c.rect(M, cur.y - row_h, CW, row_h, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(M + 3 * mm, cur.y - row_h + 3 * mm, "Structure")
    c.drawString(M + col1_w + 3 * mm, cur.y - row_h + 3 * mm, "Fees for Program")
    cur.move(row_h)

    c.setFont("Helvetica", 10)
    for idx, (label_txt, val) in enumerate(rows):
        if idx % 2 == 0:
            c.setFillColor(HexColor("#f8f8f8"))
            c.rect(M, cur.y - row_h, CW, row_h, stroke=0, fill=1)
        c.setFillColor(black)
        c.drawString(M + 3 * mm, cur.y - row_h + 3 * mm, label_txt)
        c.drawString(M + col1_w + 3 * mm, cur.y - row_h + 3 * mm, val)
        c.setStrokeColor(BRAND_GREY_LINE)
        c.setLineWidth(0.3)
        c.rect(M, cur.y - row_h, CW, row_h, stroke=1, fill=0)
        cur.move(row_h)
    cur.move(6 * mm)

    # ── Totals line (bonus over the frontend) ────────────────
    total = 0.0
    for gp in grade_pricing:
        try:
            total += float(gp.get("students") or 0) * float(
                gp.get("price_per_student") or gp.get("price") or 0
            )
        except Exception:
            pass
    if total:
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(BRAND_NAVY)
        c.drawString(M, cur.y, f"Estimated Total Program Value: {_inr(total)}")
        cur.move(10 * mm)

    # ── Requirements page ───────────────────────────────────
    c.showPage()
    cur.y = PH - 20 * mm
    c.setFillColor(BRAND_NAVY)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(M, cur.y, "Requirements from School")
    cur.move(8 * mm)
    c.setFillColor(black)
    c.setFont("Helvetica", 10)
    min_students = data.get("min_students") or 800
    for item in [
        "Schools need to provide a list of enrolled students (Name, STD & Division), schedule, school holidays & exams in the OLL format for program communication & certification.",
        f"The program should be opted for a minimum of {min_students} students across the chosen grades for this pricing.",
        "OLL collects 100% advance program fees via NEFT/Cheque to Clone Futura Live Solutions Private Limited.",
    ]:
        _bullet(cur, item)
    cur.move(6 * mm)

    # Next steps box
    next_steps = (
        "Upon finalising the proposal, we will proceed with signing the "
        "Memorandum of Understanding (MoU), which will be shared by OLL.  "
        "After signing the MoU and completing the payment, a minimum of "
        "15 days is required to commence the teacher-training program to "
        "ensure proper allocation and verification of resource personnel."
    )
    lines = _wrap_text(c, next_steps, "Helvetica", 10, CW - 12 * mm)
    box_h = len(lines) * 5 * mm + 8 * mm
    cur.ensure(box_h + 10 * mm)
    c.setFillColor(HexColor("#f8f8f8"))
    c.setStrokeColor(BRAND_GREY_LINE)
    c.roundRect(M, cur.y - box_h, CW, box_h, 4, stroke=1, fill=1)
    c.setFillColor(black)
    inside_y = cur.y - 6 * mm
    for ln in lines:
        c.drawString(M + 6 * mm, inside_y, ln)
        inside_y -= 5 * mm
    cur.move(box_h + 10 * mm)

    # ── Closing + contact ────────────────────────────────────
    c.setFillColor(BRAND_NAVY)
    c.setFont("Helvetica-Bold", 11)
    for ln in _wrap_text(
        c,
        "We look forward to your positive response and a fruitful collaboration ahead!",
        "Helvetica-Bold",
        11,
        CW,
    ):
        c.drawString(M, cur.y, ln)
        cur.move(6 * mm)
    cur.move(6 * mm)
    c.setFillColor(black)
    c.setFont("Helvetica", 10)
    c.drawString(
        M, cur.y,
        "For any queries or assistance, contact our Business Development Team:",
    )
    cur.move(6 * mm)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(M, cur.y, "+91 9699188188   |   Team OLL   |   www.oll.co")

    c.showPage()
    c.save()
    return buf.getvalue()


# ─── FastAPI routes ─────────────────────────────────────────────
@router.get("/proposals/{school_id}/share-url")
async def get_proposal_share_url(school_id: str, user: dict = Depends(get_current_user)):
    """Return a signed, public download URL for the proposal PDF."""
    school = await db.school_inquiries.find_one(
        {"id": school_id}, {"_id": 0, "school_name": 1, "name": 1},
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    sig = _sig_for(school_id)
    name = (school.get("school_name") or school.get("name") or "School").replace(" ", "_")
    day = datetime.now(timezone.utc).strftime("%d%b%Y")
    return {
        "url": f"/api/public/proposals/{school_id}.pdf?sig={sig}",
        "filename": f"Proposal_{name}_{day}.pdf",
    }


def build_public_proposal_url(base_origin: str, school_id: str) -> str:
    """Helper for the WhatsApp webhook — a full absolute URL Twilio can fetch."""
    origin = (base_origin or "").rstrip("/")
    return f"{origin}/api/public/proposals/{school_id}.pdf?sig={_sig_for(school_id)}"


@router.get("/public/proposals/{school_id}.pdf")
async def public_download_proposal(
    school_id: str,
    sig: str = Query(..., min_length=8, max_length=64),
):
    if not _valid_sig(school_id, sig):
        raise HTTPException(status_code=403, detail="Invalid or expired link")
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    data = school.get("proposal_data") or school.get("onboarding_data") or {}
    try:
        pdf_bytes = render_proposal_pdf(school, data)
    except Exception as e:
        logger.exception("Proposal PDF render failed for %s", school_id)
        raise HTTPException(status_code=500, detail=f"PDF render failed: {e}")
    name = (school.get("school_name") or school.get("name") or "School").replace(" ", "_")
    day = datetime.now(timezone.utc).strftime("%d%b%Y")
    filename = f"Proposal_{name}_{day}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
