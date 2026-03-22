"""
School Email System — OLL Platform
- Meeting Done Followup (manual trigger)
- Onboarding Step Completion Emails
- Payment Invoice (with PDF attachment) + Reminders
- Bulk Email to selected contacts
- Email Templates CRUD
"""
import asyncio
import base64
import io
import logging
import uuid
from datetime import datetime, timezone, timedelta

import resend
from fastapi import APIRouter, Depends, HTTPException
from fpdf import FPDF

from database import db
from routes.admin_keys import get_current_user, get_resend_api_key

logger = logging.getLogger(__name__)
router = APIRouter()

FROM_EMAIL = "OLL <no-reply@oll.co>"

# ─── Resend helper ───────────────────────────────────────────────────────────

async def _send_email(to: str | list, subject: str, html: str, attachments: list | None = None):
    api_key = await get_resend_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    resend.api_key = api_key
    params = {"from": FROM_EMAIL, "to": to if isinstance(to, list) else [to],
              "subject": subject, "html": html}
    if attachments:
        params["attachments"] = attachments
    return await asyncio.to_thread(resend.Emails.send, params)


# ─── PDF Invoice Generator ────────────────────────────────────────────────────

def generate_invoice_pdf(school_name: str, tranche: dict, invoice_no: str) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    # Header
    pdf.set_fill_color(30, 58, 95)
    pdf.rect(0, 0, 210, 40, 'F')
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_xy(20, 12)
    pdf.cell(0, 10, "OLL - Invoice", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_xy(20, 24)
    pdf.cell(0, 8, "One Life Learning Pvt. Ltd.", ln=True)

    pdf.set_text_color(30, 30, 30)
    pdf.set_xy(20, 50)

    # Invoice meta
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(90, 8, f"Invoice #: {invoice_no}", ln=False)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, f"Date: {datetime.now(timezone.utc).strftime('%d %b %Y')}", ln=True)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, f"Bill To: {school_name}", ln=True)

    pdf.ln(8)
    # Table header
    pdf.set_fill_color(241, 245, 249)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(80, 10, "Description", border=1, fill=True)
    pdf.cell(40, 10, "Due Date", border=1, fill=True)
    pdf.cell(30, 10, "Status", border=1, fill=True)
    pdf.cell(40, 10, "Amount", border=1, align="R", fill=True, ln=True)

    # Table row
    pdf.set_font("Helvetica", "", 10)
    label = tranche.get("label") or tranche.get("description") or "OLL Program Fee"
    due = tranche.get("due_date") or tranche.get("date") or "—"
    status = (tranche.get("status") or "pending").title()
    amount = tranche.get("amount") or 0
    amount_str = f"Rs. {int(float(str(amount).replace(',', '') or 0)):,}"

    pdf.cell(80, 10, label[:40], border=1)
    pdf.cell(40, 10, str(due), border=1)
    pdf.cell(30, 10, status, border=1)
    pdf.cell(40, 10, amount_str, border=1, align="R", ln=True)

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(150, 10, "Total Due", align="R")
    pdf.cell(40, 10, amount_str, border=1, align="R", ln=True)

    pdf.ln(12)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(0, 6, "For queries contact: accounts@oll.co | +91-XXXXXXXXXX\nBank: HDFC Bank | A/C: XXXXXXXXXXXX | IFSC: HDFC0000000")

    return bytes(pdf.output())


# ─── Email Templates CRUD ─────────────────────────────────────────────────────

@router.get("/email-templates")
async def list_templates(user: dict = Depends(get_current_user)):
    templates = await db.email_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return templates


@router.post("/email-templates")
async def create_template(data: dict, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.get("name", "Untitled Template"),
        "subject": data.get("subject", ""),
        "body_html": data.get("body_html", ""),
        "category": data.get("category", "general"),
        "created_by": user.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.email_templates.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/email-templates/{template_id}")
async def update_template(template_id: str, data: dict, user: dict = Depends(get_current_user)):
    await db.email_templates.update_one(
        {"id": template_id},
        {"$set": {
            "name": data.get("name"),
            "subject": data.get("subject"),
            "body_html": data.get("body_html"),
            "category": data.get("category", "general"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"message": "Template updated"}


@router.delete("/email-templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
    await db.email_templates.delete_one({"id": template_id})
    return {"message": "Template deleted"}


# ─── Meeting Done Followup ────────────────────────────────────────────────────

MEETING_FOLLOWUP_HTML = """
<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f9;margin:0;padding:0">
<div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1E3A5F,#2d5a8e);padding:28px 32px;color:#fff">
    <h1 style="margin:0;font-size:22px">Thank you for meeting with OLL!</h1>
    <p style="margin:6px 0 0;opacity:.8;font-size:13px">One Life Learning · Skill Education</p>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#334155;font-size:15px">Dear {contact_name},</p>
    <p style="color:#475569;font-size:14px;line-height:1.7">Thank you for taking the time to meet with us today. We really enjoyed discussing how OLL can partner with <strong>{school_name}</strong> to bring quality skill education to your students.</p>
    {notes_section}
    <h3 style="color:#1E3A5F;font-size:15px;margin-top:24px">Why schools choose OLL</h3>
    <ul style="color:#475569;font-size:14px;line-height:2">
      <li>Structured skill curriculum aligned with NEP 2020</li>
      <li>Trained & certified educators for every skill</li>
      <li>End-to-end program management & reporting</li>
      <li>Flexible pricing — per-student or package model</li>
    </ul>
    {next_step_section}
    <div style="margin-top:28px;padding:18px;background:#f0f9ff;border-radius:8px;border-left:4px solid #1E3A5F">
      <p style="margin:0;color:#1E3A5F;font-size:13px">Questions? Reply to this email or call us at <strong>+91-XXXXXXXXXX</strong></p>
    </div>
    <p style="color:#475569;font-size:14px;margin-top:24px">Warm regards,<br><strong>The OLL Team</strong><br>One Life Learning Pvt. Ltd.</p>
  </div>
  <div style="padding:14px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
    OLL · skill@oll.co · www.oll.co
  </div>
</div></body></html>
"""


@router.post("/schools/{school_id}/send-meeting-followup")
async def send_meeting_followup(school_id: str, data: dict, user: dict = Depends(get_current_user)):
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    contacts = (school.get("onboarding_data") or {}).get("school_contacts") or []
    # Fall back to primary contact
    if not contacts:
        contacts = [{"name": school.get("contact_name"), "email": school.get("email"), "role": "Primary Contact"}]
    email_contacts = [c for c in contacts if c.get("email")]
    if not email_contacts:
        raise HTTPException(status_code=400, detail="No email addresses found for this school")

    custom_subject = data.get("subject") or f"Thank you for the meeting — {school.get('school_name', '')}"
    custom_body = data.get("body_html") or ""
    notes = data.get("notes") or school.get("notes") or ""
    next_steps = data.get("next_steps") or ""

    notes_section = f'<div style="background:#f8fafc;border-radius:8px;padding:14px;margin:18px 0"><p style="margin:0;font-size:13px;color:#64748b;font-weight:600">Meeting Notes</p><p style="margin:6px 0 0;color:#475569;font-size:14px;white-space:pre-line">{notes}</p></div>' if notes else ""
    next_step_section = f'<div style="background:#ecfdf5;border-radius:8px;padding:14px;margin:18px 0"><p style="margin:0;font-size:13px;color:#059669;font-weight:600">Next Steps</p><p style="margin:6px 0 0;color:#065f46;font-size:14px;white-space:pre-line">{next_steps}</p></div>' if next_steps else ""

    sent_to = []
    errors = []
    for c in email_contacts:
        html = custom_body or MEETING_FOLLOWUP_HTML.replace(
            "{contact_name}", c.get("name") or "there"
        ).replace("{school_name}", school.get("school_name", "")).replace(
            "{notes_section}", notes_section
        ).replace("{next_step_section}", next_step_section)
        try:
            await _send_email(c["email"], custom_subject, html)
            sent_to.append(c["email"])
        except Exception as e:
            errors.append(str(e))

    # Log activity
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$push": {"activity_log": {
            "type": "email_sent", "category": "meeting_followup",
            "description": f"Meeting followup email sent to: {', '.join(sent_to)}",
            "by": user.get("email"), "at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    return {"sent_to": sent_to, "errors": errors, "message": f"Sent to {len(sent_to)} contact(s)"}


# ─── Onboarding Step Email ────────────────────────────────────────────────────

STEP_TEMPLATES = {
    "contract_signed": {
        "subject": "Welcome to OLL — Partnership Confirmed! 🎉",
        "body": """<p>We're thrilled to welcome <strong>{school_name}</strong> to the OLL family!</p>
        <p>Your partnership contract has been signed and we're ready to begin. Our team will reach out shortly to kickstart the onboarding process.</p>
        <p><strong>What happens next:</strong></p>
        <ul><li>Kickoff call scheduling within 48 hours</li><li>Curriculum kit dispatch</li><li>LMS access setup</li></ul>""",
    },
    "kit_delivery": {
        "subject": "Your OLL Kit is On the Way! 📦",
        "body": """<p>Great news! The OLL curriculum kit for <strong>{school_name}</strong> has been dispatched.</p>
        {po_info}<p>Please ensure someone is available to receive the delivery. Check the tracking link for live updates.</p>""",
    },
    "lms_setup": {
        "subject": "Your LMS Access is Ready — Let's Get Started! 💻",
        "body": """<p>The Learning Management System (LMS) for <strong>{school_name}</strong> has been set up and is ready to use.</p>
        <p><strong>What's included:</strong></p>
        <ul><li>Student & teacher login access</li><li>Curriculum content for all enrolled skills</li><li>Progress tracking dashboard</li></ul>
        <p>Our support team will conduct a walkthrough session — please confirm your preferred date and time.</p>""",
    },
    "educator_assignment": {
        "subject": "Your OLL Educator Has Been Assigned 👩‍🏫",
        "body": """<p>We've assigned a certified OLL educator to <strong>{school_name}</strong>.</p>
        {educator_info}<p>The educator will be in touch to coordinate the class schedule and introductory session.</p>""",
    },
    "payment_collection": {
        "subject": "Payment Confirmation — OLL Partnership",
        "body": """<p>This is to confirm that we have received payment from <strong>{school_name}</strong>. Thank you!</p>
        <p>Your partnership is fully active. Please don't hesitate to reach out for any support.</p>""",
    },
    "training_done": {
        "subject": "OLL Training Complete — You're All Set! ✅",
        "body": """<p>The OLL training session for staff at <strong>{school_name}</strong> has been successfully completed.</p>
        <p>Your team is now equipped to support the OLL skill program. We look forward to an amazing partnership!</p>""",
    },
    "default": {
        "subject": "OLL Update — {step_title} Completed",
        "body": """<p>This is to inform you that the <strong>{step_title}</strong> step for <strong>{school_name}</strong> has been completed.</p>
        <p>Our team will follow up with the next steps. Thank you for your continued partnership!</p>""",
    }
}

BASE_EMAIL_WRAP = """<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f9;margin:0;padding:0">
<div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1E3A5F,#2d5a8e);padding:24px 32px;color:#fff">
    <h1 style="margin:0;font-size:20px">{title}</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#334155;font-size:15px">Dear {contact_name},</p>
    {body}
    <p style="color:#475569;font-size:14px;margin-top:28px">Warm regards,<br><strong>The OLL Team</strong></p>
  </div>
  <div style="padding:14px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
    OLL · skill@oll.co · www.oll.co
  </div>
</div></body></html>"""


@router.post("/schools/{school_id}/send-onboarding-step-email")
async def send_onboarding_step_email(school_id: str, data: dict, user: dict = Depends(get_current_user)):
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    step_key = data.get("step_key", "default")
    step_title = data.get("step_title") or step_key.replace("_", " ").title()
    custom_subject = data.get("subject")
    custom_body = data.get("body_html")
    school_name = school.get("school_name", "")

    tpl = STEP_TEMPLATES.get(step_key, STEP_TEMPLATES["default"])
    subject = custom_subject or tpl["subject"].replace("{step_title}", step_title).replace("{school_name}", school_name)

    # Build body context
    po_info = ""
    if step_key == "kit_delivery":
        po_requests = school.get("po_requests") or []
        if po_requests:
            latest = po_requests[-1]
            po_info = f'<div style="background:#f0fdf4;border-radius:8px;padding:12px;margin:12px 0"><p style="margin:0;font-size:13px;color:#059669">PO #{latest.get("po_number","—")} · <a href="{latest.get("tracking_url","#")}">Track Delivery</a></p></div>'
    educator_info = ""
    if step_key == "educator_assignment":
        educator_id = (school.get("onboarding_workflow") or {}).get("assigned_educator_id")
        if educator_id:
            ed = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
            if ed:
                educator_info = f'<div style="background:#eff6ff;border-radius:8px;padding:12px;margin:12px 0"><p style="margin:0;font-size:13px;color:#1d4ed8"><strong>{ed.get("name","")}</strong> · {ed.get("skills",[""])[0]}</p></div>'

    base_body = (custom_body or tpl["body"]).replace("{school_name}", school_name).replace(
        "{step_title}", step_title).replace("{po_info}", po_info).replace("{educator_info}", educator_info)

    contacts = (school.get("onboarding_data") or {}).get("school_contacts") or [
        {"name": school.get("contact_name"), "email": school.get("email")}]
    email_contacts = [c for c in contacts if c.get("email")]
    if not email_contacts:
        raise HTTPException(status_code=400, detail="No email addresses found for this school")

    sent_to = []
    for c in email_contacts:
        html = BASE_EMAIL_WRAP.replace("{title}", step_title).replace(
            "{contact_name}", c.get("name") or "there").replace("{body}", base_body)
        try:
            await _send_email(c["email"], subject, html)
            sent_to.append(c["email"])
        except Exception as e:
            logger.error(f"Step email error: {e}")

    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$push": {"activity_log": {
            "type": "email_sent", "category": f"onboarding_{step_key}",
            "description": f"Onboarding step '{step_title}' email sent to: {', '.join(sent_to)}",
            "by": user.get("email"), "at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    return {"sent_to": sent_to, "message": f"Step email sent to {len(sent_to)} contact(s)"}


# ─── Payment Emails ───────────────────────────────────────────────────────────

@router.post("/schools/{school_id}/send-payment-email")
async def send_payment_email(school_id: str, data: dict, user: dict = Depends(get_current_user)):
    """type: invoice | reminder | overdue"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    email_type = data.get("type", "invoice")
    tranche = data.get("tranche") or {}
    tranche_idx = data.get("tranche_index", 0)
    school_name = school.get("school_name", "")
    amount = tranche.get("amount") or 0
    amount_str = f"₹{int(float(str(amount).replace(',', '') or 0)):,}"
    due_date = tranche.get("due_date") or tranche.get("date") or "—"
    label = tranche.get("label") or tranche.get("description") or "Program Fee"
    invoice_no = f"OLL-{school_id[:6].upper()}-{tranche_idx+1:02d}"
    custom_to = data.get("to_emails")  # Optional override list

    # Determine recipients
    od = school.get("onboarding_data") or {}
    all_contacts = od.get("school_contacts") or [
        {"name": school.get("contact_name"), "email": school.get("email")}]
    if custom_to:
        to_emails = [{"email": e, "name": ""} for e in custom_to if e]
    else:
        # Send invoice/reminder to accounts + primary contacts
        to_emails = [c for c in all_contacts if c.get("email") and
                     c.get("role", "").lower() in ("accounts", "principal", "trustee_owner", "director", "primary contact", "")]
        if not to_emails:
            to_emails = [c for c in all_contacts if c.get("email")]

    if not to_emails:
        raise HTTPException(status_code=400, detail="No email recipients found")

    attachments = []
    if email_type == "invoice":
        subject = f"Invoice #{invoice_no} — {school_name} | OLL Program Fee"
        pdf_bytes = generate_invoice_pdf(school_name, tranche, invoice_no)
        attachments = [{"filename": f"OLL_Invoice_{invoice_no}.pdf",
                        "content": base64.b64encode(pdf_bytes).decode()}]
        body_rows = f"""<tr><td style="padding:10px;border:1px solid #e2e8f0">{label}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;text-align:right">{due_date}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;font-weight:700">{amount_str}</td></tr>"""
        email_body = f"""
        <p style="color:#475569;font-size:14px">Please find the invoice attached for the OLL program fee for <strong>{school_name}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:18px 0">
          <thead><tr style="background:#f1f5f9">
            <th style="padding:10px;border:1px solid #e2e8f0;text-align:left">Description</th>
            <th style="padding:10px;border:1px solid #e2e8f0">Due Date</th>
            <th style="padding:10px;border:1px solid #e2e8f0;text-align:right">Amount</th>
          </tr></thead><tbody>{body_rows}</tbody>
          <tfoot><tr><td colspan="2" style="padding:10px;font-weight:700;text-align:right;border:1px solid #e2e8f0">Total Due</td>
            <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#1E3A5F">{amount_str}</td></tr></tfoot>
        </table>
        <p style="color:#475569;font-size:14px">Please process the payment by <strong>{due_date}</strong>. For any queries, contact us at accounts@oll.co.</p>"""

    elif email_type == "reminder":
        subject = f"Friendly Reminder — Payment Due {due_date} | {school_name}"
        email_body = f"""
        <p style="color:#475569;font-size:14px">This is a gentle reminder that the payment of <strong>{amount_str}</strong> for <strong>{label}</strong> is due on <strong>{due_date}</strong>.</p>
        <div style="background:#fef3c7;border-radius:8px;padding:14px;margin:16px 0;border-left:4px solid #d97706">
          <p style="margin:0;color:#92400e;font-size:14px">Amount Due: <strong>{amount_str}</strong> by {due_date}</p>
        </div>
        <p style="color:#475569;font-size:14px">Please ensure timely payment to avoid service disruption. Contact accounts@oll.co for any questions.</p>"""

    else:  # overdue
        subject = f"Action Required — Payment Overdue | {school_name}"
        email_body = f"""
        <p style="color:#475569;font-size:14px">We notice that the payment of <strong>{amount_str}</strong> for <strong>{label}</strong> was due on <strong>{due_date}</strong> and remains unpaid.</p>
        <div style="background:#fee2e2;border-radius:8px;padding:14px;margin:16px 0;border-left:4px solid #dc2626">
          <p style="margin:0;color:#991b1b;font-size:14px">Overdue: <strong>{amount_str}</strong> (was due {due_date})</p>
        </div>
        <p style="color:#475569;font-size:14px">Please process the payment at your earliest convenience or contact us to discuss a payment plan. Unresolved dues may impact program continuity.</p>"""

    sent_to = []
    for c in to_emails:
        html = BASE_EMAIL_WRAP.replace(
            "{title}", subject.split(" | ")[0]
        ).replace("{contact_name}", c.get("name") or "there").replace("{body}", email_body)
        try:
            await _send_email(c["email"], subject, html, attachments if email_type == "invoice" else None)
            sent_to.append(c["email"])
        except Exception as e:
            logger.error(f"Payment email error to {c['email']}: {e}")
        await asyncio.sleep(0.3)

    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$push": {"activity_log": {
            "type": "email_sent", "category": f"payment_{email_type}",
            "description": f"Payment {email_type} email sent for {label} ({amount_str}) to: {', '.join(sent_to)}",
            "by": user.get("email"), "at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    return {"sent_to": sent_to, "message": f"Payment {email_type} sent to {len(sent_to)} contact(s)"}


# ─── Bulk Email to Contacts ───────────────────────────────────────────────────

@router.post("/schools/contacts/bulk-email")
async def send_bulk_email(data: dict, user: dict = Depends(get_current_user)):
    """Send a bulk email to selected contacts."""
    contacts = data.get("contacts", [])   # [{email, name}, ...]
    subject = data.get("subject", "")
    body_html = data.get("body_html", "")
    save_as_template = data.get("save_as_template", False)
    template_name = data.get("template_name", "")

    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts selected")
    if not subject or not body_html:
        raise HTTPException(status_code=400, detail="Subject and body are required")

    if save_as_template and template_name:
        await db.email_templates.insert_one({
            "id": str(uuid.uuid4()), "name": template_name,
            "subject": subject, "body_html": body_html,
            "category": "bulk", "created_by": user.get("email"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    sent_to = []
    failed = []
    for c in contacts:
        email = c.get("email")
        if not email:
            continue
        # Personalize
        personalized_html = body_html.replace("{{name}}", c.get("name") or "there").replace(
            "{{school_name}}", c.get("school_name") or "")
        personalized_subject = subject.replace("{{name}}", c.get("name") or "").replace(
            "{{school_name}}", c.get("school_name") or "")
        try:
            await _send_email(email, personalized_subject, personalized_html)
            sent_to.append(email)
        except Exception as e:
            failed.append({"email": email, "error": str(e)})
        await asyncio.sleep(0.3)

    return {
        "sent": len(sent_to), "failed": len(failed),
        "sent_to": sent_to, "failed_list": failed,
        "message": f"Sent to {len(sent_to)}/{len(contacts)} contacts"
    }
