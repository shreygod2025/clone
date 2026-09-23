"""Generate a pre-filled School Permission Letter (.docx) for OLL Robotics
Championship @ Techfest IIT Bombay 2026 participants.

Matches the wording of the original sample template but auto-fills the
team lead + team-member names/DOB/grade, the chosen competition, zone
and age category so schools only need to print, sign, stamp and
re-upload.
"""
from datetime import datetime
from io import BytesIO
from typing import Any

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, RGBColor


COMPETITION_LABELS = {
    "robo_sumo":       "Robo Sumo",
    "robo_race":       "Robo Race",
    "robo_innovation": "Robo Innovation Challenge",
}
ZONE_LABELS = {
    "north":   "North Zone · Delhi (Date TBA)",
    "south":   "South Zone · RVU College, Bangalore · 26 Nov 2026",
    "east":    "East Zone · IIT Kanpur · 24 Oct 2026",
    "west":    "West Zone · IIT Bombay · 17 Dec 2026",
    "central": "Central Zone · Indore (Date TBA)",
}
AGE_CAT_LABELS = {
    "junior": "Junior · Grade 4-7",
    "senior": "Senior · Grade 8-12",
}


def _grade_from_age_category(age_category: str | None) -> str:
    if not age_category:
        return ""
    return AGE_CAT_LABELS.get(age_category, "")


def _pretty_date(iso: str | None) -> str:
    if not iso:
        return ""
    try:
        d = datetime.fromisoformat(iso.split("T")[0])
        return d.strftime("%d/%m/%Y")
    except Exception:  # noqa: BLE001
        return iso


def _add_heading(doc: Document, text: str, size: int = 14, center: bool = True, bold: bool = True) -> None:
    p = doc.add_paragraph()
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)


def _add_labelled(doc: Document, label: str, value: str) -> None:
    p = doc.add_paragraph()
    lr = p.add_run(f"{label}: ")
    lr.bold = True
    lr.font.size = Pt(11)
    vr = p.add_run(value or "________________________")
    vr.font.size = Pt(11)


def build_permission_letter_docx(data: dict[str, Any]) -> bytes:
    """Return a .docx file (bytes) filled with the caller's data."""
    doc = Document()

    # ── Style baseline (letter body) ───────────────────────────
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    # ── Header / metadata ──────────────────────────────────────
    hdr = doc.add_paragraph()
    hdr.alignment = WD_ALIGN_PARAGRAPH.CENTER
    hrun = hdr.add_run("(To be printed on official school letterhead)")
    hrun.italic = True
    hrun.font.size = Pt(10)
    hrun.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    today = _pretty_date(data.get("date") or datetime.now().date().isoformat())
    dp = doc.add_paragraph()
    dp.add_run(f"Date: {today}").bold = True

    _add_heading(doc, "TO WHOMSOEVER IT MAY CONCERN", size=13)

    # ── Body ───────────────────────────────────────────────────
    school_name  = (data.get("school_name") or "").strip()
    competition  = COMPETITION_LABELS.get(data.get("competition") or "", "")
    zone         = ZONE_LABELS.get(data.get("zone") or "", "")
    age_category = _grade_from_age_category(data.get("age_category"))

    intro = doc.add_paragraph()
    intro_run = intro.add_run(
        "This is to certify that the student(s) listed below is/are currently "
        f"enrolled in {school_name or '______________________'} and has/have our full permission to register and "
        "compete as participants in the "
        "OLL Robotics and AI National Championship at IIT Bombay Techfest."
    )
    intro_run.font.size = Pt(11)

    if competition or zone or age_category:
        meta = doc.add_paragraph()
        meta.add_run("Competition: ").bold = True
        meta.add_run(competition or "________________________")
        if zone:
            meta.add_run("     ")
            meta.add_run("Zone: ").bold = True
            meta.add_run(zone)
        if age_category:
            meta.add_run("     ")
            meta.add_run("Age Category: ").bold = True
            meta.add_run(age_category)

    ack = doc.add_paragraph()
    ack.add_run(
        "Our institution has no objection to the student(s) representing our school or "
        "participating in the championship. We understand that if the team qualifies for the "
        "on-ground rounds (Zonal Qualifiers or the Grand Finale at IIT Bombay), they must be "
        "accompanied by an officially registered adult guardian, who may be either a teacher "
        "or a parent mentor."
    )

    # Coordinator (optional)
    coord = (data.get("coordinator_name") or "").strip()
    if coord:
        cp = doc.add_paragraph()
        cp.add_run("OLL Coordinator: ").bold = True
        cp.add_run(coord)

    # ── Student roster ─────────────────────────────────────────
    doc.add_paragraph()  # spacer
    _add_heading(doc, "Student Details", size=12, center=False)

    students: list[dict[str, Any]] = []
    # Team lead is always the first student
    lead = {
        "name":  (data.get("team_lead_name") or data.get("full_name") or "").strip(),
        "dob":   _pretty_date(data.get("team_lead_dob") or data.get("date_of_birth") or ""),
        "grade": age_category or "",
        "email": (data.get("team_lead_email") or data.get("email") or "").strip(),
        "phone": (data.get("team_lead_phone") or data.get("phone") or "").strip(),
        "role":  "Team Lead",
    }
    if lead["name"]:
        students.append(lead)
    for m in (data.get("team_members") or []):
        if not (m or {}).get("name"):
            continue
        students.append({
            "name":  m.get("name", "").strip(),
            "dob":   _pretty_date(m.get("date_of_birth", "")),
            "grade": age_category or "",
            "email": (m.get("email") or "").strip(),
            "phone": (m.get("phone") or "").strip(),
            "role":  "Team Member",
        })

    # If nothing supplied, still emit 3 blank rows (mirrors the sample)
    if not students:
        students = [{"name": "", "dob": "", "grade": "", "email": "", "phone": "", "role": ""}] * 3

    for i, s in enumerate(students, 1):
        _add_labelled(doc, f"{i}. Student Name", s["name"])
        _add_labelled(doc, "   Grade / Standard", s["grade"] or "(Only Grade 4-12 are eligible)")
        _add_labelled(doc, "   Date of Birth",  s["dob"])
        if s["email"] or s["phone"]:
            contact = " · ".join([x for x in (s["email"], s["phone"]) if x])
            _add_labelled(doc, "   Contact", contact)
        if s["role"]:
            _add_labelled(doc, "   Role", s["role"])
        doc.add_paragraph()  # spacer between students

    # ── Closing ────────────────────────────────────────────────
    doc.add_paragraph(
        "We wish the student(s) the very best in their technical learning and competition journey."
    )
    doc.add_paragraph()
    doc.add_paragraph("Sincerely,")
    doc.add_paragraph()
    doc.add_paragraph("_______________________________")
    _add_labelled(doc, "Name of Signatory",   (data.get("signatory_name") or "").strip())
    _add_labelled(doc, "Designation / Title", (data.get("signatory_designation") or "Principal / Authorised Signatory").strip())
    _add_labelled(doc, "School Stamp & Seal", "")

    # ── Serialise ──────────────────────────────────────────────
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()
