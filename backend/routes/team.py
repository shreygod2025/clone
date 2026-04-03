"""
Team Applications, Team Onboarding, and Vendor Expenses routes.
"""
import os
import uuid
import asyncio
import csv
import io
import httpx
import resend
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File

from pydantic import BaseModel, Field, ConfigDict

from .shared import db, get_current_user, auto_assign_lead, hash_password, ensure_resend_api_key
from .notifications import send_whatsapp_notification

router = APIRouter()

# ── Models ─────────────────────────────────────────────────────────────────────
class TeamApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str = ""
    phone: str
    role: str
    experience: str = ""
    city: str = ""
    availability: str = ""
    linkedin: str = ""
    portfolio: str = ""
    resume_url: str = ""
    applied_position_id: str = ""
    message: str = ""
    # Updated pipeline: applicant -> candidate -> onboarding -> active -> past_member / rejected
    status: str = "applicant"  # applicant, candidate, onboarding, active, past_member, rejected
    comments: List[dict] = []
    notes: List[dict] = []
    source: str = "about_page"
    added_by: str = ""
    assigned_to: str = ""
    
    # Applicant Stage Fields (Telephonic Round)
    telephonic_round: dict = Field(default_factory=lambda: {
        "completed": False,
        "completed_at": None,
        "completed_by": None,
        "outcome": None,  # "accepted", "rejected"
        "reject_reason": None,
        "notes": None
    })
    
    # Candidate Stage Fields (HR Interview + Dept Head)
    hr_interview: dict = Field(default_factory=lambda: {
        "scheduled": False,
        "scheduled_at": None,
        "scheduled_by": None,
        "completed": False,
        "completed_at": None,
        "outcome": None,  # "passed", "failed"
        "notes": None,
        "email_sent": False
    })
    dept_head_interview: dict = Field(default_factory=lambda: {
        "assigned": False,
        "dept_head_id": None,
        "dept_head_name": None,
        "scheduled_at": None,
        "completed": False,
        "completed_at": None,
        "outcome": None,  # "selected", "not_selected"
        "notes": None,
        "notification_sent": False
    })
    
    # Onboarding Stage Fields
    welcome_email_sent: bool = False
    welcome_email_sent_at: Optional[str] = None
    admin_account_created: bool = False
    admin_role_id: str = ""
    admin_role_name: str = ""
    offer_letter_generated: bool = False
    offer_letter_url: str = ""
    offer_letter_sent: bool = False
    
    # NEW: Simplified Onboarding Steps
    razorpay_setup_done: bool = False
    training_done: bool = False
    
    # Trial Period Fields
    trial_period: dict = Field(default_factory=lambda: {
        "duration": "1_week",  # "1_week", "1_month"
        "start_date": None,
        "end_date": None,
        "extended": False,
        "extension_date": None,
        "extension_reason": None,
        "status": None  # "ongoing", "passed", "failed"
    })
    
    # Activation Fields
    whatsapp_group_added: bool = False
    whatsapp_group_added_at: Optional[str] = None
    activated_at: Optional[str] = None
    
    # Exit Fields (for past_member status)
    exit_date: Optional[str] = None
    exit_reason: str = ""
    account_deactivated: bool = False
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamApplicationCreate(BaseModel):
    name: str
    email: str = ""
    phone: str = ""
    role: str = ""
    experience: str = ""
    city: str = ""
    availability: str = ""
    linkedin: str = ""
    portfolio: str = ""
    resume_url: str = ""
    applied_position_id: str = ""
    message: str = ""
    source: str = "about_page"

class TeamApplicationUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    resume_url: Optional[str] = None
    availability: Optional[str] = None
    city: Optional[str] = None
    role: Optional[str] = None
    experience: Optional[str] = None
    
    # Applicant Stage
    telephonic_round: Optional[dict] = None
    
    # Candidate Stage
    hr_interview: Optional[dict] = None
    dept_head_interview: Optional[dict] = None
    
    # Onboarding Stage
    welcome_email_sent: Optional[bool] = None
    welcome_email_sent_at: Optional[str] = None
    admin_account_created: Optional[bool] = None
    admin_role_id: Optional[str] = None
    admin_role_name: Optional[str] = None
    offer_letter_generated: Optional[bool] = None
    offer_letter_url: Optional[str] = None
    offer_letter_sent: Optional[bool] = None
    
    # NEW: Simplified Onboarding Steps
    razorpay_setup_done: Optional[bool] = None
    training_done: Optional[bool] = None
    
    # Trial Period
    trial_period: Optional[dict] = None
    
    # Activation
    whatsapp_group_added: Optional[bool] = None
    whatsapp_group_added_at: Optional[str] = None
    activated_at: Optional[str] = None
    
    # Exit
    exit_date: Optional[str] = None
    exit_reason: Optional[str] = None
    account_deactivated: Optional[bool] = None

# Team Onboarding Model (for hired team members)
class TeamOnboarding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_application_id: str  # Reference to the team application
    name: str
    email: str = ""
    phone: str
    role: str = ""  # Applied role
    target_role_id: str = ""  # Role to assign when activated
    city: str = ""
    tracking_token: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    status: str = "onboarding"  # onboarding, active, discontinued
    
    # Onboarding steps
    steps: dict = Field(default_factory=lambda: {
        "personal_info": {"completed": False, "completed_at": None},
        "bank_details": {"completed": False, "completed_at": None},
        "contract_signing": {"completed": False, "completed_at": None},
        "training": {"completed": False, "completed_at": None}
    })
    
    # Personal Information
    personal_info: dict = Field(default_factory=dict)  # full_name, dob, address, emergency_contact, etc.
    
    # Bank Details
    bank_details: dict = Field(default_factory=dict)  # account_number, ifsc, bank_name, etc.
    
    # Contract
    contract_url: str = ""
    contract_signed_at: Optional[str] = None
    
    # Training
    training_completed_at: Optional[str] = None
    training_notes: str = ""
    
    # Discontinuation
    discontinued_reason: str = ""
    discontinued_at: Optional[str] = None
    exit_formalities: dict = Field(default_factory=dict)
    
    # Team user created
    team_user_id: str = ""
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Expense Model
# Expense Model for PnL Reports

# ── Routes ─────────────────────────────────────────────────────────────────────

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    amount: float
    category: str  # salary, marketing, operations, technology, office, travel, other
    subcategory: str = ""
    date: str  # YYYY-MM-DD
    payment_method: str = ""  # cash, bank_transfer, card, upi
    vendor: str = ""
    invoice_url: str = ""
    receipt_url: str = ""
    added_by: str = ""
    added_by_name: str = ""
    notes: str = ""
    is_recurring: bool = False
    recurring_frequency: str = ""  # monthly, quarterly, yearly
    status: str = "approved"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    title: str
    description: str = ""
    amount: float
    category: str
    subcategory: str = ""
    date: str
    payment_method: str = ""
    vendor: str = ""
    invoice_url: str = ""
    receipt_url: str = ""
    notes: str = ""
    is_recurring: bool = False
    recurring_frequency: str = ""

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    date: Optional[str] = None
    payment_method: Optional[str] = None
    vendor: Optional[str] = None
    invoice_url: Optional[str] = None
    receipt_url: Optional[str] = None
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurring_frequency: Optional[str] = None
    status: Optional[str] = None

# School Inquiry Models
class SchoolInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")

EXPENSE_CATEGORIES = [
    {"id": "salary", "name": "Salary & Compensation"},
    {"id": "marketing", "name": "Marketing & Advertising"},
    {"id": "operations", "name": "Operations"},
    {"id": "technology", "name": "Technology & Software"},
    {"id": "office", "name": "Office & Facilities"},
    {"id": "travel", "name": "Travel & Accommodation"},
    {"id": "commission", "name": "Commission & Referral"},
    {"id": "utilities", "name": "Utilities"},
    {"id": "professional_services", "name": "Professional Services"},
    {"id": "other", "name": "Other"},
]

@router.post("/team-applications", response_model=TeamApplication)
async def create_team_application(data: TeamApplicationCreate):
    application = TeamApplication(**data.model_dump())
    
    # Auto-assign to Team HR (round-robin)
    assigned = await auto_assign_lead('team_application', '', 'online')
    if assigned and assigned.get('user_id'):
        application.assigned_to = assigned['user_id']
    
    doc = application.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.team_applications.insert_one(doc)
    return application

@router.get("/team-applications")
async def get_team_applications(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    applications = await db.team_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return applications

@router.patch("/team-applications/{application_id}")
async def update_team_application(
    application_id: str, 
    data: TeamApplicationUpdate,
    user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.team_applications.update_one({"id": application_id}, {"$set": update_data})
    application = await db.team_applications.find_one({"id": application_id}, {"_id": 0})
    return application

# ========================
# TEAM APPLICATION BULK UPLOAD
# ========================

@router.post("/team-applications/bulk-upload")
async def bulk_upload_team_applications(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Bulk upload team applications from CSV file"""
    import csv
    import io
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    try:
        decoded = content.decode('utf-8')
    except UnicodeDecodeError:
        decoded = content.decode('latin-1')
    
    reader = csv.DictReader(io.StringIO(decoded))
    
    success_count = 0
    failed_count = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header row
        try:
            # Map CSV columns to application fields
            name = row.get('Name*', row.get('Name', '')).strip()
            email = row.get('Email*', row.get('Email', '')).strip()
            phone = row.get('Phone*', row.get('Phone', '')).strip()
            city = row.get('City*', row.get('City', '')).strip()
            role = row.get('Role', '').strip()
            experience = row.get('Experience', '').strip()
            availability = row.get('Availability', '').strip()
            linkedin = row.get('LinkedIn', '').strip()
            portfolio = row.get('Portfolio', '').strip()
            message = row.get('Message', '').strip()
            
            # Validate required fields
            if not name:
                errors.append(f"Row {row_num}: Name is required")
                failed_count += 1
                continue
            if not email:
                errors.append(f"Row {row_num}: Email is required")
                failed_count += 1
                continue
            if not phone:
                errors.append(f"Row {row_num}: Phone is required")
                failed_count += 1
                continue
            if not city:
                errors.append(f"Row {row_num}: City is required")
                failed_count += 1
                continue
            
            # Create application
            application = TeamApplication(
                name=name,
                email=email,
                phone=phone,
                city=city,
                role=role,
                experience=experience,
                availability=availability,
                linkedin=linkedin,
                portfolio=portfolio,
                message=message,
                source='bulk_upload',
                added_by=user.get('id', '')
            )
            
            doc = application.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.team_applications.insert_one(doc)
            success_count += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            failed_count += 1
    
    return {
        "success_count": success_count,
        "failed_count": failed_count,
        "errors": errors[:10]  # Limit errors to first 10
    }

# ========================
# NEW PIPELINE ENDPOINTS
# ========================

@router.post("/team-applications/{application_id}/send-hr-interview-email")
async def send_hr_interview_email(
    application_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Send HR interview notification email"""
    application = await db.team_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if not application.get('email'):
        raise HTTPException(status_code=400, detail="No email address for this application")
    
    scheduled_at = data.get('scheduled_at', '')
    notes = data.get('notes', '')
    
    # Format date for email
    try:
        dt = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
        formatted_date = dt.strftime('%B %d, %Y at %I:%M %p')
    except:
        formatted_date = scheduled_at
    
    # Send email using Resend
    api_key = await ensure_resend_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1E3A5F, #2C5282); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">HR Interview Scheduled</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
            <p>Dear <strong>{application.get('name', 'Candidate')}</strong>,</p>
            <p>We are pleased to inform you that your HR interview has been scheduled.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Date & Time:</strong> {formatted_date}</p>
                {f'<p><strong>Notes:</strong> {notes}</p>' if notes else ''}
            </div>
            <p>Please be available at the scheduled time. If you need to reschedule, please contact us.</p>
            <p>Best regards,<br>OLL HR Team</p>
        </div>
    </div>
    """
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "from": "OLL <info@oll.co>",
                    "to": [application['email']],
                    "subject": f"HR Interview Scheduled - {formatted_date}",
                    "html": html_content,
                    "reply_to": "info@oll.co"
                }
            )
        return {"message": "Email sent", "status": response.status_code}
    except Exception as e:
        return {"message": "Email failed", "error": str(e)}

@router.post("/team-applications/{application_id}/notify-dept-head")
async def notify_dept_head(
    application_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Notify department head about candidate interview"""
    application = await db.team_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    dept_head_email = data.get('dept_head_email', '')
    dept_head_name = data.get('dept_head_name', '')
    applicant_name = data.get('applicant_name', application.get('name', ''))
    role = data.get('role', application.get('role', ''))
    
    if not dept_head_email:
        raise HTTPException(status_code=400, detail="Dept head email required")
    
    api_key = await ensure_resend_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1E3A5F, #2C5282); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Interview Assignment</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
            <p>Dear <strong>{dept_head_name}</strong>,</p>
            <p>You have been assigned to conduct a department interview for a candidate.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Candidate:</strong> {applicant_name}</p>
                <p><strong>Position:</strong> {role}</p>
                <p><strong>Email:</strong> {application.get('email', 'N/A')}</p>
                <p><strong>Phone:</strong> {application.get('phone', 'N/A')}</p>
            </div>
            <p>Please review the candidate's profile and schedule the interview at your convenience.</p>
            <p>Best regards,<br>OLL HR Team</p>
        </div>
    </div>
    """
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "from": "OLL <info@oll.co>",
                    "to": [dept_head_email],
                    "subject": f"Interview Assignment: {applicant_name} - {role}",
                    "html": html_content,
                    "reply_to": "info@oll.co"
                }
            )
        return {"message": "Notification sent", "status": response.status_code}
    except Exception as e:
        return {"message": "Notification failed", "error": str(e)}

@router.post("/team-applications/{application_id}/send-welcome-email")
async def send_welcome_email(
    application_id: str,
    user: dict = Depends(get_current_user)
):
    """Send welcome email to new team member with Team Member Handbook"""
    application = await db.team_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if not application.get('email'):
        raise HTTPException(status_code=400, detail="No email address")
    
    api_key = await ensure_resend_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    
    # Team Member Handbook PDF URL
    handbook_url = "https://customer-assets.emergentagent.com/job_158d09fa-bd08-407b-8f91-2a6e86e5f9fd/artifacts/td39jrre_OLL%20-%20Team%20Member%20Handbook%20-%202025_-compressed.pdf"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1E3A5F, #2C5282); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to OLL!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
            <p>Dear <strong>{application.get('name', 'Team Member')}</strong>,</p>
            <p>Welcome aboard! We're thrilled to have you join the OLL team.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1E3A5F; margin-top: 0;">📘 Team Member Handbook</h3>
                <p style="margin-bottom: 15px;">Please read through our Team Member Handbook to understand our policies, guidelines, and culture.</p>
                <a href="{handbook_url}" 
                   style="display: inline-block; background: #D63031; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Download Handbook (PDF)
                </a>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1E3A5F; margin-top: 0;">Next Steps:</h3>
                <ol style="margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Read the Team Member Handbook attached above</li>
                    <li style="margin-bottom: 8px;">Complete your Razorpay setup for payments</li>
                    <li style="margin-bottom: 8px;">Attend the training session</li>
                    <li style="margin-bottom: 8px;">Connect with your team lead</li>
                </ol>
            </div>
            
            <p>If you have any questions, feel free to reach out to the HR team.</p>
            <p>We look forward to working with you!</p>
            <p>Best regards,<br><strong>OLL HR Team</strong></p>
        </div>
        <div style="background: #1E3A5F; padding: 15px; text-align: center;">
            <p style="color: white; margin: 0; font-size: 12px;">
                OLL - Empowering India's Youth with Future-Ready Skills
            </p>
        </div>
    </div>
    """
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "from": "OLL <info@oll.co>",
                    "to": [application['email']],
                    "subject": "Welcome to OLL - Your Onboarding Journey Begins!",
                    "html": html_content,
                    "reply_to": "info@oll.co"
                }
            )
        return {"message": "Welcome email sent", "status": response.status_code}
    except Exception as e:
        return {"message": "Email failed", "error": str(e)}

@router.post("/team-applications/{application_id}/create-account")
async def create_team_member_account(
    application_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Create OLL admin account for team member"""
    application = await db.team_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    role_id = data.get('role_id')
    if not role_id:
        raise HTTPException(status_code=400, detail="Role ID required")
    
    # Check if account already exists
    existing = await db.team_users.find_one({"email": application.get('email')})
    if existing:
        raise HTTPException(status_code=400, detail="Account already exists for this email")
    
    # Get role details
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    
    # Generate username
    username = application.get('email', '').split('@')[0] or application.get('name', '').lower().replace(' ', '_')
    existing_username = await db.team_users.find_one({"username": username})
    if existing_username:
        username = f"{username}_{str(uuid.uuid4())[:4]}"
    
    # Generate temporary password
    temp_password = str(uuid.uuid4())[:8]
    
    team_user = {
        "id": str(uuid.uuid4()),
        "email": application.get('email', f"{username}@oll.co"),
        "name": application.get('name', ''),
        "username": username,
        "password_hash": bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        "role_id": role_id,
        "role_name": role.get('name', '') if role else '',
        "city": application.get('city', ''),
        "phone": application.get('phone', ''),
        "permissions": role.get('permissions', []) if role else [],
        "is_active": True,
        "team_application_id": application_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.team_users.insert_one(team_user)
    
    return {
        "message": "Account created",
        "team_user_id": team_user['id'],
        "username": username,
        "temp_password": temp_password
    }

@router.post("/team-applications/{application_id}/generate-offer-letter")
async def generate_offer_letter(
    application_id: str,
    user: dict = Depends(get_current_user)
):
    """Generate offer letter PDF (placeholder - returns success)"""
    application = await db.team_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # TODO: Implement actual PDF generation with ReportLab
    # For now, return success status
    return {
        "message": "Offer letter generation initiated",
        "url": None  # Would be Cloudinary URL in full implementation
    }

@router.post("/team-applications/{application_id}/whatsapp-group-notification")
async def send_whatsapp_group_notification(
    application_id: str,
    user: dict = Depends(get_current_user)
):
    """Send WhatsApp notification about group addition"""
    application = await db.team_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    phone = application.get('phone', '')
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number")
    
    # Send WhatsApp notification
    try:
        await send_whatsapp_notification(
            phone,
            "team_group_addition",
            {
                "name": application.get('name', 'Team Member'),
                "role": application.get('role', 'Team Member')
            }
        )
        return {"message": "WhatsApp notification sent"}
    except Exception as e:
        return {"message": "Notification failed", "error": str(e)}

@router.post("/team-applications/{application_id}/deactivate-account")
async def deactivate_team_account(
    application_id: str,
    user: dict = Depends(get_current_user)
):
    """Deactivate team user account when member exits"""
    application = await db.team_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Find and deactivate team user by email
    email = application.get('email', '')
    if email:
        await db.team_users.update_one(
            {"email": email},
            {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Account deactivated"}

# ========================
# TEAM ONBOARDING ENDPOINTS
# ========================

@router.post("/team-onboarding/init/{application_id}")
async def init_team_onboarding(
    application_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Initialize onboarding for a hired team member"""
    application = await db.team_applications.find_one({"id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check if onboarding already exists
    existing = await db.team_onboarding.find_one({"team_application_id": application_id}, {"_id": 0})
    if existing:
        return existing
    
    onboarding = TeamOnboarding(
        team_application_id=application_id,
        name=application.get('name', ''),
        email=application.get('email', ''),
        phone=application.get('phone', ''),
        role=application.get('role', ''),
        city=application.get('city', ''),
        target_role_id=data.get('target_role_id', '')
    )
    
    doc = onboarding.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.team_onboarding.insert_one(doc)
    
    # Update application status to hired
    await db.team_applications.update_one(
        {"id": application_id},
        {"$set": {"status": "hired", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Onboarding initialized", "tracking_token": onboarding.tracking_token, "id": onboarding.id}

@router.get("/team-onboarding")
async def get_team_onboardings(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all team onboarding records"""
    query = {}
    if status:
        query["status"] = status
    
    onboardings = await db.team_onboarding.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return onboardings

@router.get("/team-onboarding/track/{token}")
async def get_team_onboarding_public(token: str):
    """Public endpoint to track onboarding progress by token"""
    onboarding = await db.team_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    # Return limited info for public view
    return {
        "name": onboarding.get("name"),
        "email": onboarding.get("email"),
        "phone": onboarding.get("phone"),
        "role": onboarding.get("role"),
        "status": onboarding.get("status"),
        "steps": onboarding.get("steps"),
        "created_at": onboarding.get("created_at"),
    }

@router.get("/team-onboarding/{onboarding_id}")
async def get_team_onboarding(onboarding_id: str, user: dict = Depends(get_current_user)):
    """Get a specific team onboarding record"""
    onboarding = await db.team_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    return onboarding

@router.patch("/team-onboarding/{onboarding_id}")
async def update_team_onboarding(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update team onboarding details"""
    update_data = {k: v for k, v in data.items() if v is not None and k not in ["id", "created_at"]}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.team_onboarding.update_one({"id": onboarding_id}, {"$set": update_data})
    onboarding = await db.team_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    return onboarding

@router.post("/team-onboarding/{onboarding_id}/complete-step")
async def complete_onboarding_step(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Mark an onboarding step as complete"""
    step_name = data.get('step')
    step_data = data.get('data', {})
    
    if step_name not in ["personal_info", "bank_details", "contract_signing", "training"]:
        raise HTTPException(status_code=400, detail="Invalid step name")
    
    update_data = {
        f"steps.{step_name}.completed": True,
        f"steps.{step_name}.completed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store step-specific data
    if step_name == "personal_info" and step_data:
        update_data["personal_info"] = step_data
    elif step_name == "bank_details" and step_data:
        update_data["bank_details"] = step_data
    elif step_name == "contract_signing":
        if step_data.get('contract_url'):
            update_data["contract_url"] = step_data['contract_url']
        update_data["contract_signed_at"] = datetime.now(timezone.utc).isoformat()
    elif step_name == "training":
        update_data["training_completed_at"] = datetime.now(timezone.utc).isoformat()
        if step_data.get('notes'):
            update_data["training_notes"] = step_data['notes']
    
    await db.team_onboarding.update_one({"id": onboarding_id}, {"$set": update_data})
    onboarding = await db.team_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    return onboarding

@router.post("/team-onboarding/{onboarding_id}/activate")
async def activate_team_member(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Activate team member - creates a new team user with assigned role"""
    onboarding = await db.team_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    # Check if all steps are complete
    steps = onboarding.get('steps', {})
    incomplete = [s for s, v in steps.items() if not v.get('completed')]
    if incomplete:
        raise HTTPException(status_code=400, detail=f"Complete all steps first: {', '.join(incomplete)}")
    
    role_id = data.get('role_id') or onboarding.get('target_role_id')
    if not role_id:
        raise HTTPException(status_code=400, detail="Role ID required")
    
    # Create team user
    username = onboarding.get('email', '').split('@')[0] or onboarding.get('name', '').lower().replace(' ', '_')
    # Make username unique
    existing = await db.team_users.find_one({"username": username})
    if existing:
        username = f"{username}_{str(uuid.uuid4())[:4]}"
    
    temp_password = str(uuid.uuid4())[:8]  # Temporary password
    
    team_user = TeamUser(
        email=onboarding.get('email', f"{username}@oll.co"),
        name=onboarding.get('name', ''),
        username=username,
        password_hash=bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        role_id=role_id,
        city=onboarding.get('city', ''),
        permissions=[]  # Will inherit from role
    )
    
    doc = team_user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.team_users.insert_one(doc)
    
    # Update onboarding status
    await db.team_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "status": "active",
            "team_user_id": team_user.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Team member activated",
        "team_user_id": team_user.id,
        "username": username,
        "temp_password": temp_password  # Admin should share this securely
    }

@router.post("/team-onboarding/{onboarding_id}/discontinue")
async def discontinue_team_member(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Discontinue a team member with exit formalities"""
    reason = data.get('reason', '')
    exit_formalities = data.get('exit_formalities', {})
    
    if not reason:
        raise HTTPException(status_code=400, detail="Reason required")
    
    # Deactivate the team user if exists
    onboarding = await db.team_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if onboarding and onboarding.get('team_user_id'):
        await db.team_users.update_one(
            {"id": onboarding['team_user_id']},
            {"$set": {"is_active": False}}
        )
    
    await db.team_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "status": "discontinued",
            "discontinued_reason": reason,
            "discontinued_at": datetime.now(timezone.utc).isoformat(),
            "exit_formalities": exit_formalities,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Team member discontinued"}

# ========================
# GP ONBOARDING ENDPOINTS
# ========================

# NOTE: gp_onboarding routes moved to routes/gp_onboarding.py
EXPENSE_CATEGORIES = [
    "salary",
    "marketing",
    "operations",
    "technology",
    "office",
    "travel",
    "commission",
    "utilities",
    "professional_services",
    "other"
]

@router.get("/expenses/categories")
async def get_expense_categories(user: dict = Depends(get_current_user)):
    """Get list of expense categories"""
    return {
        "categories": EXPENSE_CATEGORIES,
        "subcategories": {
            "salary": ["full_time", "part_time", "contract", "bonus", "benefits"],
            "marketing": ["digital_ads", "print", "events", "content", "influencer"],
            "operations": ["supplies", "equipment", "maintenance", "logistics"],
            "technology": ["software", "hardware", "hosting", "subscriptions"],
            "office": ["rent", "furniture", "supplies", "maintenance"],
            "travel": ["transport", "accommodation", "meals", "conference"],
            "commission": ["student_referral", "school_referral", "educator_referral"],
            "utilities": ["electricity", "internet", "phone", "water"],
            "professional_services": ["legal", "accounting", "consulting", "audit"],
            "other": []
        }
    }

@router.post("/expenses")
async def create_expense(data: ExpenseCreate, user: dict = Depends(get_current_user)):
    """Create a new expense entry"""
    expense = Expense(
        **data.model_dump(),
        added_by=user.get('id', ''),
        added_by_name=user.get('name', '')
    )
    
    doc = expense.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.expenses.insert_one(doc)
    
    return {**doc, "_id": None}

@router.get("/expenses")
async def get_expenses(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all expenses with optional filters"""
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Calculate totals
    total = sum(e.get('amount', 0) for e in expenses)
    by_category = {}
    for e in expenses:
        cat = e.get('category', 'other')
        by_category[cat] = by_category.get(cat, 0) + e.get('amount', 0)
    
    return {
        "expenses": expenses,
        "total": total,
        "by_category": by_category,
        "count": len(expenses)
    }

@router.get("/expenses/{expense_id}")
async def get_expense(expense_id: str, user: dict = Depends(get_current_user)):
    """Get a single expense"""
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.patch("/expenses/{expense_id}")
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    user: dict = Depends(get_current_user)
):
    """Update an expense"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.expenses.update_one({"id": expense_id}, {"$set": update_data})
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    return expense

@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(get_current_user)):
    """Delete an expense"""
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

