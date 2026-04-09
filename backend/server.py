from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query, Header, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict, model_validator
from typing import List, Optional, Union
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import shutil
import resend
from io import BytesIO
# Heavy libraries are imported lazily (inside the functions that need them)
# to keep startup time fast and health check responsive.
# Lazy: reportlab, PIL/qrcode, cloudinary, cashfree_pg
from emergentintegrations.llm.chat import LlmChat, UserMessage
import time
import hmac
import hashlib
from base64 import b64encode
import json
import warnings

# Suppress urllib3 SSL warnings for Cashfree SDK (SDK handles SSL internally)
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

# Cashfree — loaded lazily on first payment request
def _get_cashfree_imports():
    """Lazy-load cashfree_pg to avoid slow startup."""
    from cashfree_pg.api_client import Cashfree
    from cashfree_pg.models.create_order_request import CreateOrderRequest
    from cashfree_pg.models.customer_details import CustomerDetails as CashfreeCustomerDetails
    from cashfree_pg.models.order_meta import OrderMeta
    return Cashfree, CreateOrderRequest, CashfreeCustomerDetails, OrderMeta

# Background Scheduler for automated tasks
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from functools import lru_cache
from cachetools import TTLCache

# ═══ SIMPLE IN-MEMORY CACHE ═══════════════════════════════════════════
# For frequently accessed data to reduce DB load
_cache = TTLCache(maxsize=1000, ttl=300)  # 5 minute TTL, max 1000 items

def get_cached(key: str):
    """Get item from cache"""
    return _cache.get(key)

def set_cached(key: str, value, ttl: int = 300):
    """Set item in cache with optional custom TTL"""
    _cache[key] = value
    return value

def clear_cache(prefix: str = None):
    """Clear cache, optionally only keys with given prefix"""
    if prefix:
        keys_to_delete = [k for k in _cache.keys() if k.startswith(prefix)]
        for k in keys_to_delete:
            _cache.pop(k, None)
    else:
        _cache.clear()

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# Cloudinary — configured lazily on first upload request
_cloudinary_configured = False

def _get_cloudinary():
    """Lazy-load and configure cloudinary to avoid slow startup."""
    global _cloudinary_configured
    import cloudinary
    import cloudinary.uploader
    import cloudinary.utils
    if not _cloudinary_configured:
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True
        )
        _cloudinary_configured = True
    return cloudinary

# Cashfree Payment Gateway Configuration
CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENVIRONMENT = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX")
CASHFREE_API_VERSION = "2023-08-01"

# Payment Sync Scheduler Configuration
PAYMENT_SYNC_ENABLED = os.getenv("PAYMENT_SYNC_ENABLED", "true").lower() == "true"
PAYMENT_SYNC_INTERVAL_MINUTES = int(os.getenv("PAYMENT_SYNC_INTERVAL_MINUTES", "60"))  # Default: every hour

# Initialize Cashfree credentials globally (lazy — only when first payment is made)
def get_cashfree_client():
    """Get Cashfree client with correct environment (lazy import + init)."""
    Cashfree, _, _, _ = _get_cashfree_imports()
    if CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
        Cashfree.XClientId = CASHFREE_APP_ID
        Cashfree.XClientSecret = CASHFREE_SECRET_KEY
        if CASHFREE_ENVIRONMENT == "PRODUCTION":
            Cashfree.XEnvironment = Cashfree.PRODUCTION
        else:
            Cashfree.XEnvironment = Cashfree.SANDBOX
    cf_env = Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    return Cashfree(cf_env)

# MongoDB connection — import from database module for shared state
from database import db, _client as mongo_client, otp_store_new, otp_verify, otp_send_allowed

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET')
if not SECRET_KEY:
    import secrets as _secrets
    SECRET_KEY = _secrets.token_hex(32)
    logging.warning("JWT_SECRET not set - using randomly generated key (sessions will not persist across restarts)")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

app = FastAPI(title="OLL Platform API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Fast liveness probe — registered directly on `app` so it responds even
# before the heavy route modules finish importing. No DB calls.
@app.get("/api/ping")
async def ping():
    return {"ok": True}

# ── Security middleware ───────────────────────────────────────────────────
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ================================================================
# SERVER.PY TABLE OF CONTENTS
# ================================================================
# This file is ~9200 lines. Major sections:
#
# LINE 52-235:    WHATSAPP TEMPLATES & CONSTANTS
# LINE 235-546:   PYDANTIC MODELS (Students, Schools, Educators, etc.)
# LINE 546-1497:  MORE MODELS (Onboarding, Expenses, Support, etc.)
# LINE 1497-1738: EMAIL TEMPLATES & HELPER FUNCTIONS
# LINE 1738-1820: AUTH ENDPOINTS (login, register, OTP)
# LINE 1835-1934: TEAM USER MANAGEMENT
# LINE 1934-2020: ROLES & PERMISSIONS
# LINE 2021-2333: DEMO BOOKING ENDPOINTS
# LINE 2333-2446: STUDENT INQUIRY ENDPOINTS
# LINE 2446-2496: DATA CENTER ENDPOINTS
# LINE 2496-2548: GROWTH PARTNER ENDPOINTS
# LINE 2548-2591: TEAM APPLICATION ENDPOINTS
# LINE 2591-2820: TEAM ONBOARDING ENDPOINTS
# LINE 2820-3056: GP ONBOARDING ENDPOINTS
# LINE 3056-3175: EXPENSE ENDPOINTS
# LINE 3175-3302: SCHOOL INQUIRY ENDPOINTS
# LINE 3302-3506: EDUCATOR APPLICATION ENDPOINTS
# LINE 3506-4187: EDUCATOR ONBOARDING ENDPOINTS
# LINE 4187-4530: EDUCATOR PORTAL ENDPOINTS
# LINE 4530-5000: SCHOOL CRM ADVANCED FEATURES
# LINE 5000-6500: SUPPORT TICKETS & BLOG ENDPOINTS
# LINE 6500-7500: ORDERS & PAYMENTS ENDPOINTS
# LINE 7500-8250: WHATSAPP & PDF GENERATION
# LINE 8250-8290: HEALTH CHECK & FILE UPLOAD
# LINE 8287-9200: ADMIN REPORTS ENDPOINTS
# ================================================================

# ========================
# WHATSAPP NOTIFICATION TEMPLATES (AiSensy)
# ========================

# Student Templates
WHATSAPP_TEMPLATES = {
    # Student templates
    "student_demo_confirmed_online": "Online Student Demo Confirmation",
    "student_demo_confirmed_offline": "Offline Student Demo Confirmation",
    "student_reminder_1hr": "Reminder 1 hour prior Student Demo Confirmation",
    "student_reminder_30min_offline": "Reminder 30 min before Offline class",
    "student_reminder_10min_online": "Reminder 10 min before Online class",
    "student_not_joined": "Class started still not joined",
    "student_session_complete": "Student Session completion",
    
    # Educator templates
    "educator_demo_confirmed_online": "Online Teacher Demo Confirmation",
    "educator_demo_confirmed_offline": "Offline Teacher Demo Confirmation",
    "educator_reminder_1hr": "Reminder 1 hour prior Teacher Demo Confirmation",
    "educator_reminder_30min_offline": "Reminder 30 min Teacher before Offline class",
    "educator_reminder_10min_online": "Reminder 10 min Teacher before Online class",
    "educator_not_joined": "Class started still not joined educator",
    "educator_session_complete": "Educator Session completion",
    
    # Support ticket templates
    "ticket_assigned": "support_ticket_added",
    "support_ticket_added": "support_ticket_added",
    "support_overdue_48hours": "support_overdue_48hours",
    "support_overdue_48hours_admin": "support_overdue_48hours_admin",
    
    # New lead notifications
    "student_newlead_admin": "student_newlead_admin",
    "gp_newlead_admin": "gp_newlead_admin",
    
    # School CRM meeting reminders
    "school_meeting_reminder_24hours": "school_meeting_reminder_24hours",
    "school_meeting_reminder_2hours": "school_meeting_reminder_2hours",
}

async def send_whatsapp_notification(
    phone: str,
    template_key: str,
    params: list = None,
    user_name: str = "User"
) -> dict:
    """
    Send WhatsApp notification via AiSensy
    
    Args:
        phone: Phone number (10 digits, will add 91 prefix)
        template_key: Key from WHATSAPP_TEMPLATES dict
        params: List of template parameters
        user_name: User's name for the message
    
    Returns:
        dict with success status and message
    """
    # Validate phone number first
    if not phone or str(phone).strip() in ['', 'None', 'null', 'undefined']:
        print(f"[WhatsApp] Skipped {template_key} - invalid phone: {phone}")
        return {"success": False, "message": "Invalid or missing phone number"}
    
    AISENSY_API_KEY = os.environ.get("AISENSY_API_KEY", "")
    
    if not AISENSY_API_KEY:
        print("[WhatsApp] Skipped - API key not configured")
        return {"success": False, "message": "API key not configured"}
    
    campaign_name = WHATSAPP_TEMPLATES.get(template_key)
    if not campaign_name:
        print(f"[WhatsApp] Unknown template key: {template_key}")
        return {"success": False, "message": f"Unknown template: {template_key}"}
    
    try:
        # Format phone number
        phone_number = str(phone).replace("+", "").replace(" ", "")
        if not phone_number.startswith("91"):
            phone_number = f"91{phone_number}"
        
        payload = {
            "apiKey": AISENSY_API_KEY,
            "campaignName": campaign_name,
            "destination": phone_number,
            "userName": "Clone Futura Live Solutions Ltd",
            "templateParams": params or [],
            "source": "OLL Platform",
            "media": {},
            "buttons": [],
            "carouselCards": [],
            "location": {},
            "attributes": {},
            "paramsFallbackValue": {
                "FirstName": "user"
            }
        }
        
        print(f"[WhatsApp] Sending {template_key} to {phone_number} - Campaign: {campaign_name} - Params: {params}")
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://backend.aisensy.com/campaign/t1/api/v2",
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200:
                print(f"WhatsApp [{template_key}] sent to {phone_number}")
                return {"success": True, "message": "Notification sent"}
            else:
                print(f"AiSensy error [{template_key}]: {response.status_code} - {response.text}")
                return {"success": False, "message": f"API error: {response.status_code}"}
                
    except Exception as e:
        print(f"WhatsApp notification error [{template_key}]: {str(e)}")
        return {"success": False, "message": str(e)}


async def send_demo_confirmation_notifications(inquiry: dict, educator: dict = None):
    """Send demo confirmation to student and assigned educator"""
    student_name = inquiry.get("name", "Student")
    student_phone = inquiry.get("phone")
    skill = inquiry.get("skill", "Demo").title()
    demo_date = inquiry.get("demo_date", "TBD")
    demo_time = inquiry.get("demo_time", "TBD")
    learning_mode = inquiry.get("learning_mode", "online")
    location = inquiry.get("selected_center_name") or inquiry.get("city") or "Online"
    
    is_online = learning_mode == "online"
    
    # Send to student
    if student_phone:
        template = "student_demo_confirmed_online" if is_online else "student_demo_confirmed_offline"
        await send_whatsapp_notification(
            phone=student_phone,
            template_key=template,
            params=[student_name, skill, demo_date, demo_time, location],
            user_name=student_name
        )
    
    # Send to educator
    if educator and educator.get("phone"):
        educator_name = educator.get("name", "Educator")
        template = "educator_demo_confirmed_online" if is_online else "educator_demo_confirmed_offline"
        await send_whatsapp_notification(
            phone=educator.get("phone"),
            template_key=template,
            params=[educator_name, student_name, skill, demo_date, demo_time],
            user_name=educator_name
        )


async def send_not_joined_notification(inquiry: dict, notify_type: str = "student"):
    """Send 'class started but not joined' notification"""
    student_name = inquiry.get("name", "Student")
    student_phone = inquiry.get("phone")
    skill = inquiry.get("skill", "Demo").title()
    
    if notify_type == "student" and student_phone:
        await send_whatsapp_notification(
            phone=student_phone,
            template_key="student_not_joined",
            params=[student_name, skill],
            user_name=student_name
        )
    elif notify_type == "educator":
        educator_id = inquiry.get("assigned_educator_id")
        if educator_id:
            educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
            if educator and educator.get("phone"):
                await send_whatsapp_notification(
                    phone=educator.get("phone"),
                    template_key="educator_not_joined",
                    params=[educator.get("name", "Educator"), student_name, skill],
                    user_name=educator.get("name", "Educator")
                )


async def send_session_complete_notification(inquiry: dict, educator: dict = None):
    """Send session completion notifications with feedback form"""
    student_name = inquiry.get("name", "Student")
    student_phone = inquiry.get("phone")
    skill = inquiry.get("skill", "Demo").title()
    frontend_url = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", "https://oll.co").replace("/api", ""))
    feedback_url = f"{frontend_url}/feedback/{inquiry.get('id', '')}"
    
    # Send to student
    if student_phone:
        await send_whatsapp_notification(
            phone=student_phone,
            template_key="student_session_complete",
            params=[student_name, skill, feedback_url],
            user_name=student_name
        )
    
    # Send to educator
    if educator and educator.get("phone"):
        educator_name = educator.get("name", "Educator")
        await send_whatsapp_notification(
            phone=educator.get("phone"),
            template_key="educator_session_complete",
            params=[educator_name, student_name, skill],
            user_name=educator_name
        )


# ========================
# SUPPORT TICKET NOTIFICATIONS
# ========================

async def send_support_ticket_notification(ticket: dict, assignee: dict):
    """Send notification when a support ticket is assigned to a team member"""
    if not assignee or not assignee.get("phone"):
        print("Support ticket notification skipped - no assignee phone")
        return
    
    assignee_name = assignee.get("name", "Team Member")
    ticket_id = ticket.get("id", "N/A")[:8]
    subject = ticket.get("subject", "Support Request")
    priority = ticket.get("priority", "medium").upper()
    school_name = ticket.get("school_name", ticket.get("contact_name", "Customer"))
    
    await send_whatsapp_notification(
        phone=assignee.get("phone"),
        template_key="support_ticket_added",
        params=[assignee_name, ticket_id, subject, priority, school_name],
        user_name=assignee_name
    )


async def send_ticket_overdue_notification(ticket: dict, assignee: dict):
    """Send 48-hour overdue warning to the assigned team member"""
    if not assignee or not assignee.get("phone"):
        print("Overdue notification skipped - no assignee phone")
        return
    
    assignee_name = assignee.get("name", "Team Member")
    ticket_id = ticket.get("id", "N/A")[:8].upper()
    subject = ticket.get("subject", ticket.get("query_type", "Support Request"))
    
    # Template expects 3 params: [Name, TicketID, Subject]
    await send_whatsapp_notification(
        phone=assignee.get("phone"),
        template_key="support_overdue_48hours",
        params=[assignee_name, ticket_id, subject],
        user_name=assignee_name
    )


async def send_ticket_overdue_admin_notification(ticket: dict, admin_phones: list):
    """Send 48-hour overdue warning to admin team - 4 params"""
    ticket_id = ticket.get("id", "N/A")[:8].upper()
    subject = ticket.get("subject", ticket.get("query_type", "Support Request"))
    customer_name = ticket.get("school_name", ticket.get("contact_name", ticket.get("name", "Customer")))
    assigned_to = ticket.get("assigned_to_name", "Unassigned")
    
    # Template expects 4 params: [TicketID, Subject, CustomerName, AssignedTo]
    for phone in admin_phones:
        if phone:
            await send_whatsapp_notification(
                phone=phone,
                template_key="support_overdue_48hours_admin",
                params=[ticket_id, subject, customer_name, assigned_to],
                user_name="Admin"
            )


# ========================
# NEW LEAD NOTIFICATIONS
# ========================

async def send_student_newlead_notification(inquiry: dict, sales_team_phones: list):
    """Send notification to B2C sales team when a new student lead is created - 7 params"""
    student_name = inquiry.get("name", "Student")
    phone = inquiry.get("phone", "N/A")
    skill = inquiry.get("skill", "Not specified")
    city = inquiry.get("city", "Not specified")
    source = inquiry.get("source", "website")
    learning_mode = inquiry.get("learning_mode", "online")
    created_at = inquiry.get("created_at", "")[:10] if inquiry.get("created_at") else "Today"
    
    # Template expects 7 params: [Name, Phone, Skill, City, Source, LearningMode, Date]
    for sales_phone in sales_team_phones:
        if sales_phone:
            await send_whatsapp_notification(
                phone=sales_phone,
                template_key="student_newlead_admin",
                params=[student_name, phone, skill, city, source, learning_mode, created_at],
                user_name="Sales Team"
            )


async def send_gp_newlead_notification(gp_data: dict, gp_manager_phones: list):
    """Send notification to GP manager when a new growth partner applies"""
    gp_name = gp_data.get("name", "Growth Partner")
    phone = gp_data.get("phone", "N/A")
    city = gp_data.get("city", "Not specified")
    partnership_type = gp_data.get("partnership_type", "Not specified")
    
    for manager_phone in gp_manager_phones:
        if manager_phone:
            await send_whatsapp_notification(
                phone=manager_phone,
                template_key="gp_newlead_admin",
                params=[gp_name, phone, city, partnership_type],
                user_name="GP Manager"
            )


# ========================
# SCHOOL CRM MEETING REMINDERS
# ========================

async def send_school_meeting_reminder_24h(school: dict, sales_manager: dict):
    """Send meeting reminder 24 hours prior to sales manager - 7 params"""
    if not sales_manager or not sales_manager.get("phone"):
        print("24h meeting reminder skipped - no sales manager phone")
        return
    
    manager_name = sales_manager.get("name", "Sales Manager")
    school_name = school.get("school_name", "School")
    contact_name = school.get("contact_name", "Contact")
    contact_phone = school.get("phone", "N/A")
    meeting_date = school.get("meeting_date", "TBD")
    meeting_time = school.get("meeting_time", "TBD")
    meeting_mode = school.get("meeting_mode", "online").title()
    
    # Template expects 7 params: [ManagerName, SchoolName, ContactName, ContactPhone, Date, Time, Mode]
    await send_whatsapp_notification(
        phone=sales_manager.get("phone"),
        template_key="school_meeting_reminder_24hours",
        params=[manager_name, school_name, contact_name, contact_phone, meeting_date, meeting_time, meeting_mode],
        user_name=manager_name
    )


async def send_school_meeting_reminder_2h(school: dict, sales_manager: dict):
    """Send meeting reminder 2 hours prior to sales manager - 6 params"""
    if not sales_manager or not sales_manager.get("phone"):
        print("2h meeting reminder skipped - no sales manager phone")
        return
    
    manager_name = sales_manager.get("name", "Sales Manager")
    school_name = school.get("school_name", "School")
    contact_name = school.get("contact_name", "Contact")
    contact_phone = school.get("phone", "N/A")
    meeting_time = school.get("meeting_time", "TBD")
    meeting_mode = school.get("meeting_mode", "online")
    
    # Include meeting link for online meetings, address for offline
    location_info = school.get("meeting_link", "") if meeting_mode == "online" else school.get("meeting_address", "As discussed")
    
    # Template expects 6 params: [ManagerName, SchoolName, ContactName, ContactPhone, Time, Location/Link]
    await send_whatsapp_notification(
        phone=sales_manager.get("phone"),
        template_key="school_meeting_reminder_2hours",
        params=[manager_name, school_name, contact_name, contact_phone, meeting_time, location_info],
        user_name=manager_name
    )


# ========================
# SCHEDULED CHECK FUNCTIONS
# ========================

async def check_overdue_tickets():
    """Check for support tickets that are overdue (>48 hours) and send notifications"""
    print("[SCHEDULER] Checking for overdue support tickets...")
    try:
        from datetime import datetime, timezone, timedelta
        
        # Find tickets that are:
        # 1. Status is not 'resolved' or 'closed'
        # 2. Created more than 48 hours ago
        # 3. Not already marked as overdue_notified
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=48)
        
        overdue_tickets = await db.support_queries.find({
            "status": {"$nin": ["resolved", "closed"]},
            "created_at": {"$lt": cutoff_time.isoformat()},
            "overdue_notified": {"$ne": True}
        }).to_list(100)
        
        print(f"[SCHEDULER] Found {len(overdue_tickets)} overdue tickets")
        
        # Get admin phones for admin notifications
        admin_phones_doc = await db.settings.find_one({"key": "admin_notification_phones"})
        admin_phones = admin_phones_doc.get("value", []) if admin_phones_doc else []
        
        # Fallback: use all active team_users with phone numbers if no setting configured
        if not admin_phones:
            fallback_users = await db.team_users.find(
                {"is_active": True, "phone": {"$nin": [None, "", "None", "null"]}},
                {"_id": 0, "phone": 1, "name": 1}
            ).to_list(20)
            admin_phones = [u["phone"] for u in fallback_users if u.get("phone") and str(u["phone"]).strip() not in ['', 'None']]
            if admin_phones:
                print(f"[SCHEDULER] Using {len(admin_phones)} team user phone(s) as fallback admin notification numbers")
            else:
                print("[SCHEDULER] WARNING: No admin notification phones configured. Set via /api/support/notification-settings")

        
        for ticket in overdue_tickets:
            ticket.pop('_id', None)
            
            # Send notification to assignee
            if ticket.get("assigned_to"):
                assignee = await db.team_users.find_one({"id": ticket["assigned_to"]}, {"_id": 0})
                if assignee:
                    await send_ticket_overdue_notification(ticket, assignee)
            
            # Send notification to admins
            if admin_phones:
                await send_ticket_overdue_admin_notification(ticket, admin_phones)
            
            # Mark as notified
            await db.support_queries.update_one(
                {"id": ticket["id"]},
                {"$set": {"overdue_notified": True, "overdue_notified_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        print(f"[SCHEDULER] Overdue ticket check complete - {len(overdue_tickets)} notified")
    except Exception as e:
        print(f"[SCHEDULER] Error checking overdue tickets: {e}")
        import traceback
        traceback.print_exc()


async def check_school_meeting_reminders():
    """Check for upcoming school meetings and send reminders"""
    print("[SCHEDULER] Checking for school meeting reminders...")
    try:
        from datetime import datetime, timezone, timedelta
        
        now = datetime.now(timezone.utc)
        
        # Check for meetings in the next 24-25 hours (for 24h reminder)
        reminder_24h_start = now + timedelta(hours=23)
        reminder_24h_end = now + timedelta(hours=25)
        
        # Check for meetings in the next 1.5-2.5 hours (for 2h reminder)
        reminder_2h_start = now + timedelta(hours=1, minutes=30)
        reminder_2h_end = now + timedelta(hours=2, minutes=30)

        # Check for meetings in the next 45-75 minutes (for 1h reminder)
        reminder_1h_start = now + timedelta(minutes=45)
        reminder_1h_end = now + timedelta(minutes=75)
        
        # Find schools with meetings scheduled
        schools_with_meetings = await db.school_inquiries.find({
            "meeting_scheduled": True,
            "status": {"$nin": ["converted", "lost", "renewed"]},
            "meeting_date": {"$exists": True, "$ne": None, "$ne": ""}
        }).to_list(500)
        
        print(f"[SCHEDULER] Found {len(schools_with_meetings)} schools with scheduled meetings")
        
        for school in schools_with_meetings:
            school.pop('_id', None)
            
            try:
                # Parse meeting date and time
                meeting_date_str = school.get("meeting_date", "")
                meeting_time_str = school.get("meeting_time", "10:00")
                
                if not meeting_date_str:
                    continue
                
                # Parse the meeting datetime
                if "T" in meeting_date_str:
                    meeting_dt = datetime.fromisoformat(meeting_date_str.replace('Z', '+00:00'))
                else:
                    # Combine date and time
                    meeting_dt = datetime.strptime(f"{meeting_date_str} {meeting_time_str}", "%Y-%m-%d %H:%M")
                    meeting_dt = meeting_dt.replace(tzinfo=timezone.utc)
                
                # Get sales manager
                sales_manager = None
                if school.get("assigned_to"):
                    sales_manager = await db.team_users.find_one({"id": school["assigned_to"]}, {"_id": 0})
                
                if not sales_manager:
                    continue
                
                # Check if 24h reminder needed
                if reminder_24h_start <= meeting_dt <= reminder_24h_end:
                    if not school.get("reminder_24h_sent"):
                        await send_school_meeting_reminder_24h(school, sales_manager)
                        await db.school_inquiries.update_one(
                            {"id": school["id"]},
                            {"$set": {"reminder_24h_sent": True, "reminder_24h_sent_at": now.isoformat()}}
                        )
                        print(f"[SCHEDULER] Sent 24h reminder for {school.get('school_name', 'Unknown')}")
                
                # Check if 2h reminder needed
                if reminder_2h_start <= meeting_dt <= reminder_2h_end:
                    if not school.get("reminder_2h_sent"):
                        await send_school_meeting_reminder_2h(school, sales_manager)
                        await db.school_inquiries.update_one(
                            {"id": school["id"]},
                            {"$set": {"reminder_2h_sent": True, "reminder_2h_sent_at": now.isoformat()}}
                        )
                        print(f"[SCHEDULER] Sent 2h reminder for {school.get('school_name', 'Unknown')}")

                # Check if 1h reminder needed
                if reminder_1h_start <= meeting_dt <= reminder_1h_end:
                    if not school.get("reminder_1h_sent"):
                        await send_school_meeting_reminder_2h(school, sales_manager)  # reuse 2h template
                        await db.school_inquiries.update_one(
                            {"id": school["id"]},
                            {"$set": {"reminder_1h_sent": True, "reminder_1h_sent_at": now.isoformat()}}
                        )
                        print(f"[SCHEDULER] Sent 1h reminder for {school.get('school_name', 'Unknown')}")
                        
            except Exception as e:
                print(f"[SCHEDULER] Error processing school {school.get('id')}: {e}")
                continue
        
        print("[SCHEDULER] School meeting reminder check complete")
    except Exception as e:
        print(f"[SCHEDULER] Error checking school meeting reminders: {e}")
        import traceback
        traceback.print_exc()


# ========================
# EMAIL NOTIFICATION SYSTEM (Gmail SMTP)
# ========================

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Gmail SMTP Configuration
GMAIL_EMAIL = os.environ.get("GMAIL_EMAIL", "clonefutura@gmail.com")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")  # App Password, not regular password
# Email sender - always use verified oll.co domain
SENDER_EMAIL = "OLL Team <welcome@oll.co>"

# Legacy Resend support (fallback)
resend.api_key = os.environ.get("RESEND_API_KEY", "")

# Helper to get Resend API key (checks DB first, then env)
async def get_resend_api_key():
    """Get Resend API key from database or environment"""
    try:
        resend_doc = await db.service_api_keys.find_one({"service": "resend"}, {"_id": 0})
        if resend_doc and resend_doc.get("api_key"):
            return resend_doc["api_key"]
    except Exception as e:
        logging.warning(f"Failed to get Resend key from DB: {e}")
    return os.environ.get("RESEND_API_KEY", "")

async def ensure_resend_api_key():
    """Ensure Resend API key is set from DB or env"""
    key = await get_resend_api_key()
    if key:
        resend.api_key = key
    return bool(key)

async def send_email_gmail(to_email: str, subject: str, html_content: str):
    """Send email using Gmail SMTP"""
    try:
        if not GMAIL_APP_PASSWORD:
            logging.warning("Gmail App Password not configured, email not sent")
            return {"success": False, "error": "Gmail not configured"}
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"OLL Team <{GMAIL_EMAIL}>"
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Connect to Gmail SMTP
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_EMAIL, to_email, msg.as_string())
        
        logging.info(f"Email sent successfully to {to_email}")
        return {"success": True, "message": f"Email sent to {to_email}"}
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return {"success": False, "error": str(e)}


# ─────────────────────────────────────────────────────────────────
# SCHOOL CRM — DAILY DIGEST (email tomorrow's meetings + follow-ups)
# ─────────────────────────────────────────────────────────────────
async def send_school_crm_daily_digest():
    """Send a daily digest email listing tomorrow's meetings and follow-ups."""
    print("[SCHEDULER] Building School CRM daily digest...")
    try:
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        # Use IST (UTC+5:30) for "tomorrow" calculation so it lines up with admin's day
        ist_now = now + timedelta(hours=5, minutes=30)
        tomorrow = (ist_now + timedelta(days=1)).strftime('%Y-%m-%d')
        today = ist_now.strftime('%Y-%m-%d')

        # Meetings tomorrow
        meetings = await db.school_inquiries.find(
            {"meeting_date": tomorrow},
            {"_id": 0, "school_name": 1, "meeting_date": 1, "meeting_time": 1,
             "meeting_mode": 1, "contact_name": 1, "phone": 1, "status": 1}
        ).to_list(200)

        # Follow-ups tomorrow or follow_up status updated today/yesterday
        followups = await db.school_inquiries.find(
            {"followup_date": tomorrow},
            {"_id": 0, "school_name": 1, "followup_date": 1, "followup_comment": 1,
             "contact_name": 1, "phone": 1, "status": 1}
        ).to_list(200)

        if not meetings and not followups:
            print("[SCHEDULER] No meetings or follow-ups tomorrow — digest not sent.")
            return

        # Build email rows
        def meeting_rows(items):
            rows = ""
            for m in items:
                rows += f"""
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#1a1a1a">{m.get('school_name','—')}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#333">{m.get('meeting_time','TBD')}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#555">{(m.get('meeting_mode') or '').title() or '—'}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#555">{m.get('contact_name','—')} · {m.get('phone','')}</td>
                </tr>"""
            return rows

        def followup_rows(items):
            rows = ""
            for f in items:
                rows += f"""
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#1a1a1a">{f.get('school_name','—')}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#555">{f.get('followup_comment','') or '—'}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#555">{f.get('contact_name','—')} · {f.get('phone','')}</td>
                </tr>"""
            return rows

        meetings_section = ""
        if meetings:
            meetings_section = f"""
            <h3 style="color:#075E54;margin:20px 0 8px 0">Meetings Tomorrow ({len(meetings)})</h3>
            <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5">
              <thead><tr style="background:#075E54;color:#fff">
                <th style="padding:9px 12px;text-align:left;font-weight:600">School</th>
                <th style="padding:9px 12px;text-align:left;font-weight:600">Time</th>
                <th style="padding:9px 12px;text-align:left;font-weight:600">Mode</th>
                <th style="padding:9px 12px;text-align:left;font-weight:600">Contact</th>
              </tr></thead>
              <tbody>{meeting_rows(meetings)}</tbody>
            </table>"""

        followups_section = ""
        if followups:
            followups_section = f"""
            <h3 style="color:#1E3A5F;margin:20px 0 8px 0">Follow-ups Tomorrow ({len(followups)})</h3>
            <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5">
              <thead><tr style="background:#1E3A5F;color:#fff">
                <th style="padding:9px 12px;text-align:left;font-weight:600">School</th>
                <th style="padding:9px 12px;text-align:left;font-weight:600">Comment</th>
                <th style="padding:9px 12px;text-align:left;font-weight:600">Contact</th>
              </tr></thead>
              <tbody>{followup_rows(followups)}</tbody>
            </table>"""

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px">
          <div style="background:#075E54;padding:24px;border-radius:10px 10px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">OLL School CRM — Daily Digest</h1>
            <p style="color:#b2dfdb;margin:6px 0 0 0">{tomorrow}</p>
          </div>
          <div style="background:#f9f9f9;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
            <p style="color:#555;margin:0 0 16px 0">Here's your schedule for <strong>tomorrow</strong>. You have <strong>{len(meetings)} meeting(s)</strong> and <strong>{len(followups)} follow-up(s)</strong>.</p>
            {meetings_section}
            {followups_section}
            <p style="color:#888;font-size:12px;margin-top:24px">This digest is auto-generated by OLL CRM AI. Manage your schedule in the AI Chat tab.</p>
          </div>
        </div>"""

        admin_email = GMAIL_EMAIL
        subject = f"OLL CRM Digest — {len(meetings)} Meetings, {len(followups)} Follow-ups for {tomorrow}"
        result = await send_email_gmail(admin_email, subject, html)
        if result.get("success"):
            print(f"[SCHEDULER] Daily digest sent to {admin_email}")
        else:
            print(f"[SCHEDULER] Digest email failed: {result.get('error')}")

    except Exception as exc:
        print(f"[SCHEDULER] Daily digest error: {exc}")
        import traceback; traceback.print_exc()

# Email Templates for Educators
EMAIL_TEMPLATES = {
    "application_received": {
        "subject": "Application Received - Welcome to OLL!",
        "template": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">OLL</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1E3A5F; margin-top: 0;">Hello {name}! 👋</h2>
                <p style="color: #444; line-height: 1.6;">Thank you for applying to become an OLL Educator! We're excited to have received your application.</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1E3A5F; margin-top: 0;">Application Details:</h3>
                    <p style="margin: 5px 0;"><strong>Skills:</strong> {skills}</p>
                    <p style="margin: 5px 0;"><strong>Experience:</strong> {experience}</p>
                    <p style="margin: 5px 0;"><strong>City:</strong> {city}</p>
                </div>
                <p style="color: #444; line-height: 1.6;">Our team will review your application and get back to you within 2-3 business days. In the meantime, feel free to explore our website to learn more about OLL.</p>
                <p style="color: #444; line-height: 1.6;">Best regards,<br><strong>The OLL Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© 2026 OLL. All rights reserved.</p>
            </div>
        </div>
        """
    },
    "demo_scheduled": {
        "subject": "Demo Scheduled - OLL Educator Selection",
        "template": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">OLL</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1E3A5F; margin-top: 0;">Great News, {name}! 🎉</h2>
                <p style="color: #444; line-height: 1.6;">Your demo session has been scheduled. We're looking forward to seeing you teach!</p>
                <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                    <h3 style="color: #2e7d32; margin-top: 0;">📅 Demo Details:</h3>
                    <p style="margin: 8px 0; font-size: 16px;"><strong>Date:</strong> {demo_date}</p>
                    <p style="margin: 8px 0; font-size: 16px;"><strong>Time:</strong> {demo_time}</p>
                    <p style="margin: 8px 0; font-size: 16px;"><strong>Meeting Link:</strong> <a href="{meeting_link}" style="color: #1E3A5F;">{meeting_link}</a></p>
                </div>
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #e65100; margin-top: 0;">📝 Tips for your demo:</h4>
                    <ul style="color: #444; padding-left: 20px;">
                        <li>Join 5 minutes early to test your connection</li>
                        <li>Prepare a 15-20 minute teaching segment</li>
                        <li>Have your materials ready</li>
                        <li>Ensure good lighting and a quiet environment</li>
                    </ul>
                </div>
                <p style="color: #444; line-height: 1.6;">If you need to reschedule, please contact us as soon as possible.</p>
                <p style="color: #444; line-height: 1.6;">Best of luck!<br><strong>The OLL Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© 2026 OLL. All rights reserved.</p>
            </div>
        </div>
        """
    },
    "demo_reminder": {
        "subject": "Reminder: Your OLL Demo is Tomorrow!",
        "template": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">OLL</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1E3A5F; margin-top: 0;">Reminder: Demo Tomorrow! ⏰</h2>
                <p style="color: #444; line-height: 1.6;">Hi {name}, this is a friendly reminder about your upcoming demo session.</p>
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
                    <h3 style="color: #1565c0; margin-top: 0;">📅 Demo Details:</h3>
                    <p style="margin: 8px 0; font-size: 16px;"><strong>Date:</strong> {demo_date}</p>
                    <p style="margin: 8px 0; font-size: 16px;"><strong>Time:</strong> {demo_time}</p>
                    <p style="margin: 8px 0; font-size: 16px;"><strong>Meeting Link:</strong> <a href="{meeting_link}" style="color: #1E3A5F;">{meeting_link}</a></p>
                </div>
                <p style="color: #444; line-height: 1.6;">We're excited to see your teaching skills in action!</p>
                <p style="color: #444; line-height: 1.6;">Best regards,<br><strong>The OLL Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© 2026 OLL. All rights reserved.</p>
            </div>
        </div>
        """
    },
    "demo_completed": {
        "subject": "Demo Completed - Thank You!",
        "template": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">OLL</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1E3A5F; margin-top: 0;">Thank You, {name}! 🙏</h2>
                <p style="color: #444; line-height: 1.6;">Thank you for completing your demo session with us. We truly appreciate your time and effort.</p>
                <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9c27b0;">
                    <h3 style="color: #7b1fa2; margin-top: 0;">What's Next?</h3>
                    <p style="color: #444; margin: 0;">Our team will review your demo performance and get back to you within 3-5 business days with our decision.</p>
                </div>
                <p style="color: #444; line-height: 1.6;">We'll notify you via email and WhatsApp about the next steps.</p>
                <p style="color: #444; line-height: 1.6;">Best regards,<br><strong>The OLL Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© 2026 OLL. All rights reserved.</p>
            </div>
        </div>
        """
    },
    "onboarded": {
        "subject": "🎉 Congratulations! Welcome to the OLL Family!",
        "template": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 OLL</h1>
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">OLL</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1E3A5F; margin-top: 0;">Congratulations, {name}! 🎊</h2>
                <p style="color: #444; line-height: 1.6; font-size: 16px;">We are thrilled to welcome you to the <strong>OLL Educator Family!</strong></p>
                <div style="background: #e8f5e9; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 24px; margin: 0; color: #2e7d32;">✅ You've been selected!</p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1E3A5F; margin-top: 0;">📋 Onboarding Details:</h3>
                    <p style="margin: 8px 0;"><strong>Onboarding Date:</strong> {onboarding_date}</p>
                    <p style="margin: 8px 0;"><strong>Your Skills:</strong> {skills}</p>
                </div>
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1565c0; margin-top: 0;">🚀 Next Steps:</h3>
                    <ol style="color: #444; padding-left: 20px;">
                        <li>You'll receive access to the Educator Dashboard</li>
                        <li>Complete your profile setup</li>
                        <li>Review the educator guidelines</li>
                        <li>Start receiving demo assignments!</li>
                    </ol>
                </div>
                <p style="color: #444; line-height: 1.6;">We're excited to have you on board and can't wait to see the impact you'll make on our students' lives!</p>
                <p style="color: #444; line-height: 1.6;">Welcome to OLL! 🌟<br><strong>The OLL Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© 2026 OLL. All rights reserved.</p>
            </div>
        </div>
        """
    },
    "rejected": {
        "subject": "Update on Your OLL Application",
        "template": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">OLL</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1E3A5F; margin-top: 0;">Dear {name},</h2>
                <p style="color: #444; line-height: 1.6;">Thank you for your interest in becoming an OLL Educator and for taking the time to go through our selection process.</p>
                <p style="color: #444; line-height: 1.6;">After careful consideration, we regret to inform you that we are unable to move forward with your application at this time.</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #444; margin: 0;">This decision was not easy, and it does not diminish your skills or experience. We encourage you to continue your teaching journey and consider reapplying in the future.</p>
                </div>
                <p style="color: #444; line-height: 1.6;">We wish you all the best in your future endeavors.</p>
                <p style="color: #444; line-height: 1.6;">Warm regards,<br><strong>The OLL Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© 2026 OLL. All rights reserved.</p>
            </div>
        </div>
        """
    }
}

async def send_educator_email(
    recipient_email: str,
    template_key: str,
    template_data: dict
) -> dict:
    """
    Send email notification to educator using Resend
    
    Args:
        recipient_email: Educator's email address
        template_key: Key from EMAIL_TEMPLATES dict
        template_data: Dict with values to fill template placeholders
    
    Returns:
        dict with success status and message
    """
    template_info = EMAIL_TEMPLATES.get(template_key)
    if not template_info:
        print(f"Unknown email template: {template_key}")
        return {"success": False, "message": f"Unknown template: {template_key}"}
    
    try:
        # Fill template with data
        html_content = template_info["template"]
        for key, value in template_data.items():
            html_content = html_content.replace("{" + key + "}", str(value))
        
        subject = template_info["subject"]
        
        # Try Gmail SMTP first (preferred)
        if GMAIL_APP_PASSWORD:
            result = await send_email_gmail(recipient_email, subject, html_content)
            if result.get("success"):
                print(f"Email [{template_key}] sent via Gmail to {recipient_email}")
                return result
        
        # Fallback to Resend if Gmail not configured
        if resend.api_key:
            params = {
                "from": SENDER_EMAIL,
                "to": [recipient_email],
                "subject": subject,
                "html": html_content
            }
            email_response = await asyncio.to_thread(resend.Emails.send, params)
            print(f"Email [{template_key}] sent via Resend to {recipient_email}")
            return {"success": True, "message": "Email sent", "email_id": email_response.get("id")}
        
        print("Email notification skipped - No email provider configured")
        return {"success": False, "message": "No email provider configured"}
        
    except Exception as e:
        error_msg = str(e)
        print(f"Email notification error [{template_key}]: {error_msg}")
        if "testing" in error_msg.lower():
            return {"success": False, "message": "Resend API key is a TEST key. Update to production key in Admin > Settings > API Keys."}
        return {"success": False, "message": error_msg}


async def send_educator_application_received_email(educator: dict):
    """Send application received confirmation email"""
    await send_educator_email(
        recipient_email=educator.get("email", ""),
        template_key="application_received",
        template_data={
            "name": educator.get("name", "Educator"),
            "skills": ", ".join(educator.get("skills", [])),
            "experience": educator.get("experience", "Not specified"),
            "city": educator.get("city", "Not specified")
        }
    )


async def send_educator_demo_scheduled_email(educator: dict):
    """Send demo scheduled email with details"""
    await send_educator_email(
        recipient_email=educator.get("email", ""),
        template_key="demo_scheduled",
        template_data={
            "name": educator.get("name", "Educator"),
            "demo_date": educator.get("demo_date", "TBD"),
            "demo_time": educator.get("demo_time", "TBD"),
            "meeting_link": educator.get("meeting_link", "Will be shared soon")
        }
    )


async def send_educator_demo_reminder_email(educator: dict):
    """Send demo reminder email"""
    await send_educator_email(
        recipient_email=educator.get("email", ""),
        template_key="demo_reminder",
        template_data={
            "name": educator.get("name", "Educator"),
            "demo_date": educator.get("demo_date", "TBD"),
            "demo_time": educator.get("demo_time", "TBD"),
            "meeting_link": educator.get("meeting_link", "")
        }
    )


async def send_educator_demo_completed_email(educator: dict):
    """Send demo completed thank you email"""
    await send_educator_email(
        recipient_email=educator.get("email", ""),
        template_key="demo_completed",
        template_data={
            "name": educator.get("name", "Educator")
        }
    )


async def send_educator_onboarded_email(educator: dict):
    """Send onboarding/selection congratulations email"""
    await send_educator_email(
        recipient_email=educator.get("email", ""),
        template_key="onboarded",
        template_data={
            "name": educator.get("name", "Educator"),
            "onboarding_date": educator.get("onboarding_date", "To be confirmed"),
            "skills": ", ".join(educator.get("skills", []))
        }
    )


async def send_educator_rejected_email(educator: dict):
    """Send rejection email"""
    await send_educator_email(
        recipient_email=educator.get("email", ""),
        template_key="rejected",
        template_data={
            "name": educator.get("name", "Educator")
        }
    )


# ========================
# SCHOOL CRM EMAIL NOTIFICATION SYSTEM
# ========================

SCHOOL_EMAIL_FOOTER = """
<div style="background: #1E3A5F; padding: 24px; text-align: center; margin-top: 0;">
    <p style="color: rgba(255,255,255,0.9); margin: 0 0 8px 0; font-size: 14px; font-weight: 700; letter-spacing: 1px;">OLL</p>
    <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 13px;">
        <a href="tel:+919920188188" style="color: rgba(255,255,255,0.85); text-decoration: none;">+91 9920188188</a>
        &nbsp;|&nbsp;
        <a href="mailto:info@oll.co" style="color: rgba(255,255,255,0.85); text-decoration: none;">info@oll.co</a>
        &nbsp;|&nbsp;
        <a href="https://oll.co" style="color: rgba(255,255,255,0.85); text-decoration: none;">www.oll.co</a>
    </p>
</div>
"""

def build_school_email_header(subtitle: str = "Empowering Future Skills") -> str:
    return f"""
<div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d4a6f 100%); padding: 32px; text-align: center;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
        <tr>
            <td style="text-align: center; padding: 0;">
                <div style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px 20px; margin-bottom: 12px;">
                    <span style="color: white; font-size: 28px; font-weight: 900; letter-spacing: 2px; font-family: 'Segoe UI', Arial, sans-serif;">OLL</span>
                </div>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0 0; font-size: 13px; letter-spacing: 0.5px;">{subtitle}</p>
            </td>
        </tr>
    </table>
</div>
"""

SCHOOL_INTRO_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px;">
<div style="max-width: 620px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {header}
    <div style="padding: 36px 32px;">
        <h2 style="color: #1E3A5F; margin-top: 0; font-size: 22px;">Dear {contact_name},</h2>
        <p style="color: #333; line-height: 1.7; margin-bottom: 20px;">
            Thank you for your interest in partnering with <strong>OLL</strong>! We are excited about the opportunity to bring <strong>Robotics &amp; AI education</strong> to the students of <strong>{school_name}</strong>.
        </p>

        <!-- About OLL -->
        <div style="background: #f8fafc; border-left: 4px solid #1E3A5F; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <h3 style="color: #1E3A5F; margin: 0 0 12px 0; font-size: 16px; font-weight: 700;">About OLL</h3>
            <p style="color: #333; line-height: 1.75; margin: 0 0 12px 0; font-size: 14px;">
                OLL — India's leading skill-education partner, working with <strong>400+ schools across 35+ cities</strong>. We have trained over <strong>1,50,000+ students</strong> with a focus on Robotics &amp; AI practical, outcome-driven learning.
            </p>
            <p style="color: #333; line-height: 1.75; margin: 0; font-size: 14px;">
                OLL has been featured on major media like <strong>Shark Tank India</strong> and <strong>Kaun Banega Crorepati</strong> — a truly national brand.
            </p>
        </div>

        <!-- Media Badges -->
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
                <td style="width: 50%; padding: 0 6px 0 0; vertical-align: top;">
                    <div style="background: #fff3e0; border: 1px solid #ffcc80; border-radius: 8px; padding: 12px; text-align: center;">
                        <p style="margin: 0; font-size: 13px; font-weight: 700; color: #e65100;">SHARK TANK INDIA</p>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #bf360c;">As Seen On TV</p>
                    </div>
                </td>
                <td style="width: 50%; padding: 0 0 0 6px; vertical-align: top;">
                    <a href="https://youtu.be/8M3A_InpVKw?si=Q9G3s9gWPFMLuHI6&amp;t=872" style="text-decoration: none;">
                        <div style="background: #fce4ec; border: 1px solid #f48fb1; border-radius: 8px; padding: 12px; text-align: center;">
                            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #880e4f;">KBC &#8212; Watch Clip</p>
                            <p style="margin: 4px 0 0 0; font-size: 11px; color: #ad1457;">&#9654; youtube.com</p>
                        </div>
                    </a>
                </td>
            </tr>
        </table>

        <!-- Why Schools Choose OLL -->
        <h3 style="color: #1E3A5F; font-size: 16px; font-weight: 700; margin: 24px 0 12px 0;">Why Schools Choose OLL</h3>
        <p style="color: #555; font-size: 13px; margin: 0 0 10px 0;">We offer a complete plug-and-play program for schools:</p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0; vertical-align: top; width: 28px; font-size: 20px;">&#x2713;</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; line-height: 1.5;"><strong>1 Kit : 1 Child</strong> — personalised individual learning with dedicated kit per student</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; vertical-align: top; font-size: 20px;">&#x2713;</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; line-height: 1.5;">Each student receives a <strong>Certificate accredited by STEM &amp; UNESCO</strong></td>
            </tr>
            <tr>
                <td style="padding: 8px 0; vertical-align: top; font-size: 20px;">&#x2713;</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; line-height: 1.5;"><strong>CBSE/ICSE-aligned</strong> Robotics &amp; AI curriculum for Grades 1–12</td>
            </tr>
        </table>

        <!-- About OLL PDF link -->
        <div style="margin: 24px 0; text-align: center;">
            <a href="https://drive.google.com/file/d/1qUMDeQakzOLE-pbohTd-pzoKYpWvgC2k/view?usp=sharing"
               style="display: inline-block; background: #1E3A5F; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
                &#x1F4C4; Download About OLL
            </a>
        </div>

        {meeting_or_schedule}

        <p style="color: #555; line-height: 1.6; margin-top: 28px;">
            Warm regards,<br>
            <strong style="color: #1E3A5F;">{sender_name}</strong><br>
            <span style="color: #888; font-size: 13px;">OLL School Partnerships</span>
        </p>
    </div>
    {footer}
</div>
</body>
</html>
"""

SCHOOL_MEETING_CONFIRMATION_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px;">
<div style="max-width: 620px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {header}
    <div style="padding: 36px 32px;">
        <h2 style="color: #1E3A5F; margin-top: 0; font-size: 22px;">Dear {contact_name},</h2>
        <p style="color: #333; line-height: 1.7;">
            {meeting_action_text} for <strong>{school_name}</strong>.
        </p>
        <div style="background: #e8f5e9; border-left: 4px solid #27ae60; padding: 20px; border-radius: 0 10px 10px 0; margin: 24px 0;">
            <h3 style="color: #155724; margin: 0 0 14px 0; font-size: 16px;">Meeting Details</h3>
            <p style="margin: 6px 0; color: #333; font-size: 14px;"><strong>Date:</strong> {meeting_date}</p>
            <p style="margin: 6px 0; color: #333; font-size: 14px;"><strong>Time:</strong> {meeting_time}</p>
            <p style="margin: 6px 0; color: #333; font-size: 14px;"><strong>Mode:</strong> {meeting_mode}</p>
            {meeting_link_section}
        </div>
        <p style="color: #333; line-height: 1.7;">
            We look forward to an engaging discussion. Please don't hesitate to reach out if you have any questions.
        </p>
        <p style="color: #555; line-height: 1.6; margin-top: 24px;">
            Warm regards,<br>
            <strong style="color: #1E3A5F;">{sender_name}</strong><br>
            <span style="color: #888; font-size: 13px;">OLL School Partnerships</span>
        </p>
    </div>
    {footer}
</div>
</body>
</html>
"""

SCHOOL_PROPOSAL_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px;">
<div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {header}
    <div style="padding: 36px 32px;">

        <h2 style="color: #1E3A5F; margin-top: 0; font-size: 22px;">Dear {contact_name},</h2>
        <p style="color: #333; font-size: 15px; line-height: 1.8; margin-bottom: 8px;">
            Thank you for your time and interest in OLL's programs. As discussed, please find attached the <strong>detailed proposal</strong> for implementing the OLL Robotics &amp; AI program at <strong>{school_name}</strong>.
        </p>
        <p style="color: #333; font-size: 15px; line-height: 1.8; margin-bottom: 28px;">
            Below is a snapshot of our <strong>Program Deliverables</strong> — what {school_name} will receive as part of the partnership:
        </p>

        <!-- Deliverables Header -->
        <div style="background: #1E3A5F; color: white; padding: 14px 20px; border-radius: 10px 10px 0 0;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 0.3px;">Program Deliverables</h3>
        </div>

        <!-- 1. Curriculum -->
        <div style="border: 1px solid #dde4ef; border-top: none; padding: 18px 20px;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">1. Curriculum — 28 Projects / Grade</p>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #444; line-height: 1.7;">
                Robotics, Coding, 3D Designing, DIY Science, Electronics &amp; AI curriculum — designed for Grades Jr. KG to 10th.
            </p>
            <div style="text-align: left; margin-top: 10px;">
                <a href="https://drive.google.com/drive/folders/1nYqvokOCiiaXo5FOs9CjfsEzwonMqdVL?usp=drive_link"
                   style="display: inline-block; background: #1E3A5F; color: white; text-decoration: none; padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    View Detailed Curriculum
                </a>
            </div>
        </div>

        <!-- 2. LMS Access -->
        <div style="border: 1px solid #dde4ef; border-top: none; padding: 18px 20px;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">2. LMS Access</p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #444; line-height: 1.7;">
                School gets <strong>syllabus progress updates</strong> &bull; <strong>Personalised tracking</strong> for each child &bull; <strong>Parent reports</strong> shared directly.
            </p>
            <div style="text-align: left; margin-top: 10px;">
                <a href="https://youtu.be/pkMSv6-bpic"
                   style="display: inline-block; background: #c0392b; color: white; text-decoration: none; padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    &#9654; Watch LMS Walkthrough
                </a>
            </div>
        </div>

        <!-- 3. Hardcopy Robotics Books -->
        <div style="border: 1px solid #dde4ef; border-top: none; padding: 18px 20px;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">3. Hardcopy Robotics Books — Each Student</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #444; line-height: 1.7;">Each project book includes:</p>
            <ul style="margin: 0 0 10px 0; padding-left: 20px; font-size: 14px; color: #444; line-height: 1.8;">
                <li>Problem statement</li>
                <li>Real life applications</li>
                <li>Theory behind how it works</li>
            </ul>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555; line-height: 1.7;">
                All presented in an <strong>innovative comic-book format</strong> with a storyline — making learning engaging and student-friendly.
            </p>
            <div style="text-align: left; margin-top: 10px;">
                <a href="https://drive.google.com/drive/folders/1OZ95-fWhg_-UhTw0rNimuq9cRwn1zpJw"
                   style="display: inline-block; background: #1E3A5F; color: white; text-decoration: none; padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    View Book Samples
                </a>
            </div>
        </div>

        <!-- 4. OLL USP -->
        <div style="border: 1px solid #dde4ef; border-top: none; padding: 18px 20px;">
            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">4. OLL's USP</p>
            <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.7;">
                <strong>1 Child : 1 Kit Ratio</strong> — Personalised, outcome-driven, hands-on project-based learning for every student.
            </p>
        </div>

        <!-- 5. Complimentary Workshops -->
        <div style="border: 1px solid #dde4ef; border-top: none; padding: 18px 20px;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">5. Complimentary Workshops Calendar 2026–27</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #555; line-height: 1.6;">1-day sessions for All students:</p>
            <table style="width:100%; border-collapse: collapse; font-size: 13px; color: #444;">
                <tr style="background:#f0f4ff;"><td style="padding: 7px 10px; font-weight:600;">Grade 1 &amp; 2</td><td style="padding: 7px 10px;">3D Pen</td></tr>
                <tr><td style="padding: 7px 10px; font-weight:600;">Grade 3–5</td><td style="padding: 7px 10px;">VR &amp; AR</td></tr>
                <tr style="background:#f0f4ff;"><td style="padding: 7px 10px; font-weight:600;">Grade 6–8</td><td style="padding: 7px 10px;">Drone Flying</td></tr>
                <tr><td style="padding: 7px 10px; font-weight:600;">Grade 9 &amp; 10</td><td style="padding: 7px 10px;">Space &amp; Rocket Building</td></tr>
                <tr style="background:#f0f4ff;"><td style="padding: 7px 10px; font-weight:600;">Teachers</td><td style="padding: 7px 10px;">AI Tools for Educators</td></tr>
                <tr><td style="padding: 7px 10px; font-weight:600;">Grandparents</td><td style="padding: 7px 10px;">Cyber Security — How to Stay Safe Online</td></tr>
            </table>
            <div style="text-align: left; margin-top: 12px;">
                <a href="https://www.youtube.com/watch?v=QTE-LC7SL9M"
                   style="display: inline-block; background: #c0392b; color: white; text-decoration: none; padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    &#9654; Watch Workshop Video
                </a>
            </div>
        </div>

        <!-- 6. Competitions & Exhibitions -->
        <div style="border: 1px solid #dde4ef; border-top: none; padding: 18px 20px;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">6. National Level Competitions &amp; Exhibitions</p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #444; line-height: 1.7;">
                <strong>Robo Sumo, Robo Race &amp; Robo Football</strong> — at interclass, interschool &amp; national levels (held at IIT Bombay).
            </p>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #444; line-height: 1.7;">
                <strong>Global Robotics &amp; AI Challenge</strong> — Virtual global competition; winners receive a full scholarship to the UNESCO camp in Washington DC.
            </p>
            <div style="text-align: left; margin-top: 4px;">
                <a href="https://www.youtube.com/watch?v=B0n8-RYegVc&t=45s"
                   style="display: inline-block; background: #c0392b; color: white; text-decoration: none; padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    &#9654; IIT Bombay Techfest
                </a>
            </div>
        </div>

        <!-- 7. Assessments -->
        <div style="border: 1px solid #dde4ef; border-top: none; padding: 18px 20px;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">7. Assessments</p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #555;">Half-yearly practical assessments — students assessed on:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #444; line-height: 1.8;">
                <li>Creativity</li>
                <li>Logical Reasoning</li>
                <li>Problem Solving</li>
            </ul>
        </div>

        <!-- 8. Certifications -->
        <div style="border: 1px solid #dde4ef; border-top: none; padding: 18px 20px;">
            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">8. International Certifications</p>
            <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.7;">
                Hardcopy certifications from <strong>STEM.org</strong> &amp; in collaboration with <strong>UNESCO World Genesis Foundation</strong> — for each child.
            </p>
        </div>

        <!-- 9. OLL Support Team -->
        <div style="border: 1px solid #dde4ef; border-top: none; border-radius: 0 0 10px 10px; padding: 18px 20px; margin-bottom: 28px;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">9. OLL Support Team</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">Dedicated Relationship Manager assigned for each school:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #444; line-height: 1.8;">
                <li>Monthly reports for each school</li>
                <li>48-hour query resolution for School, Parents &amp; Students</li>
                <li>Backup educator if educator is absent</li>
                <li>Trainer replacement if educator discontinues</li>
                <li>24x7 WhatsApp community support for teachers</li>
            </ul>
        </div>

        <!-- Watch OLL in Schools -->
        <div style="background: #f8faff; border: 1px solid #dde4ef; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #1E3A5F;">Watch OLL's Program Live in Schools</p>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 4px 8px 4px 0; width: 50%;">
                        <a href="https://www.youtube.com/watch?v=PC51gxK186c"
                           style="display:block; background:#c0392b; color:white; text-decoration:none; padding:9px 12px; border-radius:6px; font-size:12px; font-weight:600; text-align:center;">
                            &#9654; NL Dalmia School
                        </a>
                    </td>
                    <td style="padding: 4px 0 4px 8px; width: 50%;">
                        <a href="https://www.youtube.com/watch?v=BU3ZjAlI2tQ"
                           style="display:block; background:#c0392b; color:white; text-decoration:none; padding:9px 12px; border-radius:6px; font-size:12px; font-weight:600; text-align:center;">
                            &#9654; Jankidevi School
                        </a>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 8px 0 0; width: 50%;">
                        <a href="https://www.youtube.com/watch?v=YoIu5akBkr0"
                           style="display:block; background:#c0392b; color:white; text-decoration:none; padding:9px 12px; border-radius:6px; font-size:12px; font-weight:600; text-align:center;">
                            &#9654; Greenlawns High School
                        </a>
                    </td>
                    <td style="padding: 8px 0 0 8px; width: 50%;">
                        <a href="https://www.youtube.com/watch?v=q6mHoHsdmhA"
                           style="display:block; background:#1E3A5F; color:white; text-decoration:none; padding:9px 12px; border-radius:6px; font-size:12px; font-weight:600; text-align:center;">
                            &#9654; Lab Setup Tour
                        </a>
                    </td>
                </tr>
            </table>
            <div style="text-align: center; margin-top: 12px;">
                <a href="https://www.youtube.com/watch?v=OavfLmAdprc&t=2s"
                   style="display: inline-block; background: #27ae60; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    &#127897; Principal's Feedback
                </a>
            </div>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.8; margin-bottom: 28px;">
            We would love to discuss the proposal in detail at your convenience. Please feel free to share any feedback or questions — we're happy to customise the proposal as per {school_name}'s requirements.
        </p>

        <p style="color: #555; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            Warm regards,<br>
            <strong style="color: #1E3A5F;">{sender_name}</strong><br>
            <span style="color: #888; font-size: 13px;">OLL School Partnerships</span>
        </p>
    </div>
    {footer}
</div>
</body>
</html>
"""

SCHOOL_MOU_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px;">
<div style="max-width: 620px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {header}
    <div style="padding: 36px 32px;">
        <h2 style="color: #1E3A5F; margin-top: 0; font-size: 22px;">Dear {contact_name},</h2>
        <p style="color: #333; line-height: 1.7;">
            We are delighted to move forward with the partnership between <strong>{school_name}</strong> and <strong>OLL</strong>. Please find attached the <strong>Memorandum of Understanding (MOU)</strong> for your review and signature.
        </p>
        <div style="background: #e8f5e9; border-left: 4px solid #27ae60; padding: 20px; border-radius: 0 10px 10px 0; margin: 24px 0;">
            <h3 style="color: #155724; margin: 0 0 12px 0; font-size: 15px;">Next Steps</h3>
            <ol style="color: #333; line-height: 1.9; padding-left: 18px; margin: 0; font-size: 14px;">
                <li>Review the attached MOU carefully</li>
                <li>Sign and return the MOU (two copies)</li>
                <li>Kit delivery will be scheduled within 7 working days of signing</li>
                <li>Teacher training session will be arranged before program launch</li>
            </ol>
        </div>
        <p style="color: #333; line-height: 1.7;">
            If you have any questions or need modifications to the MOU, please do not hesitate to reach out. We look forward to a long and successful partnership with {school_name}.
        </p>
        <p style="color: #555; line-height: 1.6; margin-top: 24px;">
            Warm regards,<br>
            <strong style="color: #1E3A5F;">{sender_name}</strong><br>
            <span style="color: #888; font-size: 13px;">OLL School Partnerships</span>
        </p>
    </div>
    {footer}
</div>
</body>
</html>
"""

SCHOOL_FOLLOWUP_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px;">
<div style="max-width: 620px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {header}
    <div style="padding: 36px 32px;">
        <h2 style="color: #1E3A5F; margin-top: 0; font-size: 22px;">Dear {contact_name},</h2>
        <p style="color: #333; line-height: 1.7;">
            I hope this message finds you well. I'm following up on our earlier conversation regarding the OLL Robotics & AI program for <strong>{school_name}</strong>.
        </p>
        {custom_message_section}
        <p style="color: #333; line-height: 1.7;">
            We'd love to understand how we can best support your school's vision for skill education. Please feel free to reach out or let us know a convenient time for a brief call.
        </p>
        <p style="color: #555; line-height: 1.6; margin-top: 24px;">
            Warm regards,<br>
            <strong style="color: #1E3A5F;">{sender_name}</strong><br>
            <span style="color: #888; font-size: 13px;">OLL School Partnerships</span>
        </p>
    </div>
    {footer}
</div>
</body>
</html>
"""

SCHOOL_EMAIL_TEMPLATES = {
    "introduction": {
        "template": SCHOOL_INTRO_EMAIL_TEMPLATE,
        "subject": "Robotics & AI Education Partnership — {school_name} x OLL"
    },
    "meeting_confirmation": {
        "template": SCHOOL_MEETING_CONFIRMATION_EMAIL_TEMPLATE,
        "subject": "Meeting Confirmed — OLL Program Discussion for {school_name}"
    },
    "meeting_reschedule": {
        "template": SCHOOL_MEETING_CONFIRMATION_EMAIL_TEMPLATE,
        "subject": "Meeting Rescheduled — OLL Program Discussion for {school_name}"
    },
    "proposal": {
        "template": SCHOOL_PROPOSAL_EMAIL_TEMPLATE,
        "subject": "OLL Program Proposal for {school_name}"
    },
    "mou": {
        "template": SCHOOL_MOU_EMAIL_TEMPLATE,
        "subject": "MOU — OLL Partnership with {school_name}"
    },
    "followup": {
        "template": SCHOOL_FOLLOWUP_EMAIL_TEMPLATE,
        "subject": "Following Up — OLL Program for {school_name}"
    },
    "followup_1": {
        "template": None,
        "subject": "OLL Robotics & AI Program — Academic Year 2026-27 | {school_name}"
    },
    "followup_2": {
        "template": None,
        "subject": "400+ Schools Trust OLL — Don't Get Left Behind | {school_name}"
    },
    "followup_3": {
        "template": None,
        "subject": "Admissions Grew by 15% After OLL — What Principals Say | {school_name}"
    },
    "followup_4": {
        "template": None,
        "subject": "Last Note from OLL — {school_name}"
    }
}

OLL_CTA_BLOCK = """
<div style="text-align: center; margin: 28px 0 8px 0;">
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="width: 50%; padding: 0 6px 0 0; text-align: center;">
                <a href="https://oll.co/school" style="display: inline-block; background: #1E3A5F; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; width: 90%; box-sizing: border-box;">
                    Book a Meeting
                </a>
            </td>
            <td style="width: 50%; padding: 0 0 0 6px; text-align: center;">
                <a href="http://wa.me/919892150714?text=Hi%20call%20me" style="display: inline-block; background: white; color: #1E3A5F; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; border: 2px solid #1E3A5F; width: 90%; box-sizing: border-box;">
                    Request Callback
                </a>
            </td>
        </tr>
    </table>
</div>
"""

def build_followup_1_html(contact_name, school_name, sender_name):
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px;">
<div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {build_school_email_header("Empowering Future Skills")}
    <div style="padding: 36px 32px;">
        <p style="color: #1E3A5F; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Pranam,</p>
        <h2 style="color: #1E3A5F; margin: 0 0 20px 0; font-size: 20px;">Dear {school_name} Team,</h2>
        <p style="color: #333; line-height: 1.7; margin-bottom: 20px;">
            We are grateful for the opportunity to introduce our comprehensive <strong>Robotics &amp; AI Program</strong> for the Academic Year 2026-27.
        </p>

        <!-- Key Highlights Header -->
        <div style="background: #1E3A5F; color: white; padding: 14px 20px; border-radius: 8px 8px 0 0; margin-top: 8px;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 0.3px;">This Year&#8217;s Key Highlights</h3>
        </div>

        <!-- Highlight 1 -->
        <div style="border: 1px solid #e0e7ef; border-top: none; padding: 16px 20px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1E3A5F;">1. Advancements in Curriculum</p>
            <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.65;">
                Grades Jr KG to 10th &bull; Robotics: 16 Projects + 4 New Categories (3D Design, Science, Coding, AI tools) = <strong>28 Total Projects</strong>
            </p>
        </div>
        <!-- Highlight 2 -->
        <div style="border: 1px solid #e0e7ef; border-top: none; padding: 16px 20px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1E3A5F;">2. Free Robotics &amp; AI Lab Kits</p>
            <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.65;">
                <strong>40 Robotics kits</strong> + Lab d&eacute;cor/branding setup for a structured and engaging environment
            </p>
        </div>
        <!-- Highlight 3 -->
        <div style="border: 1px solid #e0e7ef; border-top: none; padding: 16px 20px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1E3A5F;">3. Hardcopy Books for Each Student</p>
            <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.65;">
                Innovative <strong>comic-book style learning</strong> with problem statements, real-life applications &amp; theory
            </p>
        </div>
        <!-- Highlight 4 -->
        <div style="border: 1px solid #e0e7ef; border-top: none; padding: 16px 20px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1E3A5F;">4. New Learning Management System</p>
            <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.65;">
                Real-time progress tracking &bull; Gamification &bull; XP &amp; Gems &bull; Leaderboards &bull; Parent Reports
            </p>
        </div>
        <!-- Highlight 5 -->
        <div style="border: 1px solid #e0e7ef; border-top: none; border-radius: 0 0 8px 8px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1E3A5F;">5. Workshops, Competitions &amp; Certifications</p>
            <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.65;">
                3D Pen &bull; VR/AR &bull; Drone Flying &bull; Rocket Building &bull; National Competitions at IIT Bombay &bull; STEM.org &amp; UNESCO Certifications
            </p>
        </div>

        <!-- Stats -->
        <table style="width: 100%; border-collapse: collapse; text-align: center; margin: 8px 0 28px 0;">
            <tr>
                <td style="padding: 16px 4px; background: #f0f4ff; border-radius: 8px; width: 33%;">
                    <p style="margin: 0; font-size: 22px; font-weight: 900; color: #1E3A5F;">400+</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Schools</p>
                </td>
                <td style="padding: 4px;"></td>
                <td style="padding: 16px 4px; background: #f0f4ff; border-radius: 8px; width: 33%;">
                    <p style="margin: 0; font-size: 22px; font-weight: 900; color: #1E3A5F;">35+</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Cities</p>
                </td>
                <td style="padding: 4px;"></td>
                <td style="padding: 16px 4px; background: #f0f4ff; border-radius: 8px; width: 33%;">
                    <p style="margin: 0; font-size: 22px; font-weight: 900; color: #1E3A5F;">1.5L+</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Students</p>
                </td>
            </tr>
        </table>

        <!-- Resources -->
        <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #1E3A5F; margin: 0 0 16px 0; font-size: 15px; font-weight: 700;">&#x1F4DA; Explore Our Resources</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; background: white; border-radius: 8px; border: 1px solid #e0e7ef; width: 48%;" valign="top">
                        <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1E3A5F;">&#x1F4CB; Detailed Curriculum</p>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">Complete grade-wise curriculum breakdown</p>
                        <a href="https://drive.google.com/drive/folders/1nYqvokOCiiaXo5FOs9CjfsEzwonMqdVL" style="color: #1565c0; font-size: 12px; font-weight: 600; text-decoration: none;">View &rarr;</a>
                    </td>
                    <td style="padding: 4px;"></td>
                    <td style="padding: 10px; background: white; border-radius: 8px; border: 1px solid #e0e7ef; width: 48%;" valign="top">
                        <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1E3A5F;">&#x1F4D6; Sample Books</p>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">Preview our innovative comic-style learning books</p>
                        <a href="https://drive.google.com/drive/folders/1OZ95-fWhg_-UhTw0rNimuq9cRwn1zpJw" style="color: #1565c0; font-size: 12px; font-weight: 600; text-decoration: none;">View &rarr;</a>
                    </td>
                </tr>
                <tr><td colspan="3" style="padding: 4px;"></td></tr>
                <tr>
                    <td colspan="3" style="padding: 10px; background: white; border-radius: 8px; border: 1px solid #e0e7ef;" valign="top">
                        <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1E3A5F;">&#x1F3AC; LMS Walkthrough Video</p>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">See our Learning Management System in action</p>
                        <a href="https://www.youtube.com/watch?v=pkMSv6-bpic" style="color: #c0392b; font-size: 12px; font-weight: 600; text-decoration: none;">&#9654; Watch &rarr;</a>
                    </td>
                </tr>
            </table>
        </div>

        <!-- About OLL -->
        <div style="background: #f8fafc; border-left: 4px solid #1E3A5F; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <h3 style="color: #1E3A5F; margin: 0 0 10px 0; font-size: 14px; font-weight: 700;">&#x1F3E2; About OLL</h3>
            <p style="color: #444; font-size: 13px; line-height: 1.7; margin: 0 0 10px 0;">
                OLL &#8212; India&#8217;s leading skill-education partner, working with <strong>400+ schools across 35+ cities</strong>. We have trained over <strong>1,50,000+ students</strong> with a focus on Robotics &amp; AI practical, outcome-driven learning.
            </p>
            <p style="color: #444; font-size: 13px; line-height: 1.7; margin: 0 0 10px 0;">
                OLL has been featured on major media like <strong>Shark Tank India</strong> and <strong>Kaun Banega Crorepati</strong> &#8212; a truly national brand.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                    <td style="width: 50%; padding: 0 6px 0 0;">
                        <div style="background: #fff3e0; border: 1px solid #ffcc80; border-radius: 6px; padding: 8px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; font-weight: 700; color: #e65100;">SHARK TANK INDIA</p>
                        </div>
                    </td>
                    <td style="width: 50%; padding: 0 0 0 6px;">
                        <div style="background: #fce4ec; border: 1px solid #f48fb1; border-radius: 6px; padding: 8px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; font-weight: 700; color: #880e4f;">KBC</p>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <p style="color: #333; line-height: 1.7; margin-bottom: 8px;">We would love to schedule a meeting to discuss how this program can benefit your school and students.</p>
        {OLL_CTA_BLOCK}

        <p style="color: #555; line-height: 1.6; margin-top: 28px;">
            Thanks &amp; Regards,<br>
            <strong style="color: #1E3A5F;">Team OLL</strong><br>
            <span style="font-size: 13px; color: #666;">&#x1F4DE; +91 9892150714 &nbsp;|&nbsp; &#x2709;&#xFE0F; info@oll.co</span>
        </p>
    </div>
    {SCHOOL_EMAIL_FOOTER}
</div>
</body>
</html>"""


def build_followup_2_html(contact_name, school_name, sender_name):
    partner_schools = [
        "Activity High School", "G.D. Somani School", "Dosti Foundation School",
        "St. Kabir School Vadodara", "Hiranandani Foundation School", "Parle Taiybiah School",
        "Children's Academy", "Maneckji Cooper", "Pawar Public School",
        "Suryadatta National School", "Ram Ratna International School",
        "Goregaon Education Society", "MSB Mumbai Institute", "St Agnes High School",
        "Indus Champ School", "Metas Adventist International School", "JB Vachha High School",
        "Dr. Kadam Gurukul School", "St Anne's High School", "Novel International School",
        "Lady Zubeida Quraishi English Primary and High School",
        "Daffodils High Public High School", "L.K. Singhania Public School",
        "Greenlawns School Worli", "GreenLawns High School Warden Road",
        "NL Dalmia School", "Lodha World School", "Sunbeam Group of Schools",
        "Shishuvan School", "Scholars High School",
        "Shree Chandulal Nanavati Vinay Mandir", "Priyadarshani School",
        "Synergy Schools", "Panbai International School", "Sanjeevani World School"
    ]
    school_rows = ""
    for i in range(0, len(partner_schools), 2):
        left = partner_schools[i]
        right = partner_schools[i+1] if i+1 < len(partner_schools) else ""
        school_rows += f"""<tr>
            <td style="padding: 7px 12px 7px 0; font-size: 13px; color: #333; border-bottom: 1px solid #f0f4f8;">&#9679; {left}</td>
            <td style="padding: 7px 0 7px 12px; font-size: 13px; color: #333; border-bottom: 1px solid #f0f4f8;">{"&#9679; " + right if right else ""}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px;">
<div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {build_school_email_header("Empowering Future Skills")}
    <div style="padding: 36px 32px;">
        <h2 style="color: #1E3A5F; margin-top: 0; font-size: 20px;">Dear {school_name} Team,</h2>
        <p style="color: #333; line-height: 1.7; margin-bottom: 20px;">
            The schools that partnered with OLL early are already seeing the difference &#8212; in student engagement, parent satisfaction, and school reputation. <strong>Don't get left behind.</strong>
        </p>

        <div style="background: #1E3A5F; color: white; padding: 14px 20px; border-radius: 8px 8px 0 0;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 700;">OLL Partner Schools (400+ &amp; Counting)</h3>
        </div>
        <div style="border: 1px solid #e0e7ef; border-top: none; border-radius: 0 0 8px 8px; padding: 16px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
                {school_rows}
            </table>
            <p style="color: #666; font-size: 12px; margin: 12px 0 0 0; text-align: center;">...and 365+ more schools across 35+ cities</p>
        </div>

        <div style="background: #e8f5e9; border-left: 4px solid #27ae60; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <p style="margin: 0; color: #155724; font-size: 14px; line-height: 1.7; font-style: italic;">
                &#8220;Our journey of collaboration with OLL has been amazing. It is a remarkable platform providing us a variety of courses which will help teaching our students life skills.&#8221;
            </p>
            <p style="margin: 10px 0 0 0; color: #2e7d32; font-size: 13px; font-weight: 600;">&#8212; ICSE Maharashtra Head, Activity High School, Mumbai</p>
        </div>

        <p style="color: #333; line-height: 1.7; margin-bottom: 8px;">
            Join the OLL family and give your students the competitive edge they deserve.
        </p>
        {OLL_CTA_BLOCK}

        <p style="color: #555; line-height: 1.6; margin-top: 28px;">
            Thanks &amp; Regards,<br>
            <strong style="color: #1E3A5F;">Team OLL</strong><br>
            <span style="font-size: 13px; color: #666;">&#x1F4DE; +91 9892150714 &nbsp;|&nbsp; &#x2709;&#xFE0F; info@oll.co</span>
        </p>
    </div>
    {SCHOOL_EMAIL_FOOTER}
</div>
</body>
</html>"""


def build_followup_3_html(contact_name, school_name, sender_name):
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px;">
<div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {build_school_email_header("Empowering Future Skills")}
    <div style="padding: 36px 32px;">
        <h2 style="color: #1E3A5F; margin-top: 0; font-size: 20px;">Dear {school_name} Team,</h2>

        <!-- Impact stat -->
        <div style="background: linear-gradient(135deg, #e8f5e9, #f0fff4); border: 1px solid #a5d6a7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 6px 0; font-size: 36px; font-weight: 900; color: #1b5e20;">+15%</p>
            <p style="margin: 0; font-size: 16px; color: #2e7d32; font-weight: 600;">Admissions Growth After OLL Program</p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #555;">Schools that partnered with OLL consistently report higher parent preference and admissions growth</p>
        </div>

        <p style="color: #333; line-height: 1.7; margin-bottom: 20px;">
            When parents see Robotics &amp; AI as part of the school curriculum, they choose <em>your</em> school over others. OLL has helped hundreds of schools become the <strong>preferred choice in their locality</strong>.
        </p>

        <!-- Principal testimonial -->
        <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #1E3A5F; margin: 0 0 14px 0; font-size: 15px; font-weight: 700;">What Principals Say About OLL</h3>
            <a href="https://www.youtube.com/watch?v=OavfLmAdprc&t=2s" style="text-decoration: none; display: block;">
                <div style="background: #1E3A5F; border-radius: 10px; padding: 20px; text-align: center; position: relative;">
                    <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 12px auto; display: flex; align-items: center; justify-content: center;">
                        <p style="margin: 0; color: white; font-size: 24px;">&#9654;</p>
                    </div>
                    <p style="margin: 0 0 4px 0; color: white; font-weight: 700; font-size: 14px;">Principal Testimonial Video</p>
                    <p style="margin: 0; color: rgba(255,255,255,0.75); font-size: 12px;">youtube.com &#8594; Watch Now</p>
                </div>
            </a>
        </div>

        <p style="color: #333; line-height: 1.7; margin-bottom: 8px;">
            Let&#8217;s schedule a call to discuss how OLL can help <strong>{school_name}</strong> become the top choice for parents in your area.
        </p>
        {OLL_CTA_BLOCK}

        <p style="color: #555; line-height: 1.6; margin-top: 28px;">
            Thanks &amp; Regards,<br>
            <strong style="color: #1E3A5F;">Team OLL</strong><br>
            <span style="font-size: 13px; color: #666;">&#x1F4DE; +91 9892150714 &nbsp;|&nbsp; &#x2709;&#xFE0F; info@oll.co</span>
        </p>
    </div>
    {SCHOOL_EMAIL_FOOTER}
</div>
</body>
</html>"""


def build_followup_4_html(contact_name, school_name, sender_name):
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; margin: 0; padding: 20px;">
<div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {build_school_email_header("Empowering Future Skills")}
    <div style="padding: 36px 32px;">
        <h2 style="color: #1E3A5F; margin-top: 0; font-size: 20px;">Dear {school_name} Team,</h2>
        <p style="color: #333; line-height: 1.7; margin-bottom: 16px;">
            This is my last note for now, and I wanted to keep it short and simple.
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #1E3A5F; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="color: #333; line-height: 1.8; margin: 0; font-size: 14px;">
                If you ever need anything &#8212; more information, a demo, a custom proposal, or just a conversation about how Robotics &amp; AI can benefit your students &#8212; please don&#8217;t hesitate to reach out.
            </p>
        </div>
        <p style="color: #333; line-height: 1.7;">
            <strong>Just give us a call or reply to this email.</strong> We&#8217;re always happy to help.
        </p>
        <p style="color: #333; line-height: 1.7; margin-bottom: 8px;">
            Wishing the best for <strong>{school_name}</strong> and all your students.
        </p>
        {OLL_CTA_BLOCK}

        <p style="color: #555; line-height: 1.6; margin-top: 28px;">
            With warm regards,<br>
            <strong style="color: #1E3A5F;">{sender_name}</strong><br>
            <strong style="color: #1E3A5F;">Team OLL</strong><br>
            <span style="font-size: 13px; color: #666;">&#x1F4DE; +91 9892150714 &nbsp;|&nbsp; &#x2709;&#xFE0F; info@oll.co</span>
        </p>
    </div>
    {SCHOOL_EMAIL_FOOTER}
</div>
</body>
</html>"""

import base64 as b64_module

def get_followup_weekday_dates(start_date, count: int = 4, interval: int = 4) -> list:
    """Calculate N followup dates, each `interval` weekdays from the previous"""
    from datetime import date as date_type
    dates = []
    current = start_date
    for _ in range(count):
        weekdays_added = 0
        while weekdays_added < interval:
            current = current + timedelta(days=1)
            if current.weekday() < 5:  # Mon-Fri
                weekdays_added += 1
        dates.append(current)
    return dates

async def send_school_crm_email(
    to_email: str,
    email_type: str,
    school_name: str,
    contact_name: str,
    sender_name: str = "OLL Team",
    extra_data: dict = None,
    pdf_base64: str = None,
    pdf_filename: str = None
) -> dict:
    """
    Send a School CRM email using Resend with reply-to info@oll.co.
    Supports optional PDF attachment.
    """
    # Ensure API key is loaded from DB or env
    await ensure_resend_api_key()
    
    if not resend.api_key:
        return {"success": False, "error": "Email service not configured - please set Resend API key in Settings"}

    template_info = SCHOOL_EMAIL_TEMPLATES.get(email_type)
    if not template_info:
        return {"success": False, "error": f"Unknown email type: {email_type}"}

    # Handle custom followup templates (built dynamically)
    if email_type in ("followup_1", "followup_2", "followup_3", "followup_4"):
        builders = {
            "followup_1": build_followup_1_html,
            "followup_2": build_followup_2_html,
            "followup_3": build_followup_3_html,
            "followup_4": build_followup_4_html,
        }
        html_content = builders[email_type](contact_name, school_name, sender_name)
        subject = template_info["subject"].format(school_name=school_name)
        try:
            params: dict = {
                "from": SENDER_EMAIL,
                "to": [to_email],
                "reply_to": "info@oll.co",
                "subject": subject,
                "html": html_content
            }
            if pdf_base64 and pdf_filename:
                params["attachments"] = [{"filename": pdf_filename, "content": pdf_base64}]
            email_response = await asyncio.to_thread(resend.Emails.send, params)
            email_id = email_response.get("id") if isinstance(email_response, dict) else str(email_response)
            return {"success": True, "email_id": email_id}
        except Exception as e:
            error_msg = str(e)
            logging.error(f"Followup email error [{email_type}]: {error_msg}")
            if "testing" in error_msg.lower():
                return {"success": False, "error": "Resend API key is a TEST key. Please update to a production key in Admin > Settings > API Keys."}
            return {"success": False, "error": error_msg}

    extra = extra_data or {}

    # Build optional sections
    meeting_date = extra.get("meeting_date", "")
    meeting_time = extra.get("meeting_time", "")
    meeting_mode = extra.get("meeting_mode", "offline") or "offline"
    meeting_link = extra.get("meeting_link", "")

    # For non-intro templates: build a simple meeting box
    meeting_section = ""
    if meeting_date and meeting_time:
        meeting_section = f"""
        <div style="background: #e8f4fd; border-left: 4px solid #2196F3; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <h3 style="color: #1565c0; margin: 0 0 10px 0; font-size: 15px;">Scheduled Meeting</h3>
            <p style="margin: 4px 0; font-size: 14px; color: #333;"><strong>Date:</strong> {meeting_date}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #333;"><strong>Time:</strong> {meeting_time}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #333;"><strong>Mode:</strong> {meeting_mode.title()}</p>
        </div>"""

    meeting_link_section = ""
    if meeting_link:
        meeting_link_section = f'<p style="margin: 6px 0; color: #333; font-size: 14px;"><strong>Link:</strong> <a href="{meeting_link}" style="color: #1565c0;">{meeting_link}</a></p>'

    # For intro template: show meeting details if scheduled, or "Schedule Meeting" button if not
    if email_type == "introduction":
        if meeting_date and meeting_time:
            _link_row = ""
            if meeting_mode.lower() in ("online", "virtual") and meeting_link:
                _link_row = f'<p style="margin: 6px 0; font-size: 14px; color: #333;"><strong>Link:</strong> <a href="{meeting_link}" style="color: #1565c0;">{meeting_link}</a></p>'
            meeting_or_schedule = f"""
        <div style="background: #e8f5e9; border-left: 4px solid #27ae60; padding: 18px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <h3 style="color: #155724; margin: 0 0 12px 0; font-size: 15px; font-weight: 700;">Your Meeting is Confirmed</h3>
            <p style="margin: 5px 0; font-size: 14px; color: #333;"><strong>Date:</strong> {meeting_date}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #333;"><strong>Time:</strong> {meeting_time}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #333;"><strong>Mode:</strong> {meeting_mode.title()}</p>
            {_link_row}
        </div>"""
        else:
            meeting_or_schedule = """
        <div style="background: #f0f7ff; border: 1px solid #b3d4f5; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="color: #1E3A5F; margin: 0 0 14px 0; font-size: 14px; font-weight: 600;">Ready to explore the OLL program for your school?</p>
            <a href="https://oll.co/school"
               style="display: inline-block; background: #27ae60; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700;">
                Schedule a Meeting
            </a>
        </div>"""
    else:
        meeting_or_schedule = meeting_section

    custom_message_section = ""
    if extra.get("custom_message"):
        custom_message_section = f'<div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;"><p style="color: #444; line-height: 1.7; margin: 0; font-size: 14px;">{extra.get("custom_message")}</p></div>'

    html_content = template_info["template"].format(
        header=build_school_email_header(),
        footer=SCHOOL_EMAIL_FOOTER,
        contact_name=contact_name,
        school_name=school_name,
        sender_name=sender_name,
        meeting_date=meeting_date,
        meeting_time=meeting_time,
        meeting_mode=meeting_mode.title() if meeting_mode else "Offline",
        meeting_link_section=meeting_link_section,
        meeting_section=meeting_section,
        meeting_or_schedule=meeting_or_schedule,
        custom_message_section=custom_message_section,
        meeting_action_text="Your meeting has been <strong>rescheduled</strong>" if email_type == "meeting_reschedule" else "We're pleased to confirm our upcoming meeting to discuss the OLL program"
    )

    subject = template_info["subject"].format(school_name=school_name)

    try:
        params: dict = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "reply_to": "info@oll.co",
            "subject": subject,
            "html": html_content
        }

        # Attach PDF if provided
        if pdf_base64 and pdf_filename:
            params["attachments"] = [{
                "filename": pdf_filename,
                "content": pdf_base64
            }]

        email_response = await asyncio.to_thread(resend.Emails.send, params)
        email_id = email_response.get("id") if isinstance(email_response, dict) else str(email_response)
        return {"success": True, "email_id": email_id}
    except Exception as e:
        logging.error(f"School CRM email error [{email_type}]: {str(e)}")
        return {"success": False, "error": str(e)}


# ========================
# PYDANTIC MODELS
# ========================

# Auth Models
class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "admin"  # admin, team_member
    username: str = ""  # unique username for /add/{username} routes
    is_active: bool = True
    permissions: List[str] = []  # ['students', 'schools', 'educators', 'support', 'growth_partners', 'team_applications']
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "admin"
    username: str = ""
    permissions: List[str] = []
    center_id: str = ""
    center_name: str = ""

class TeamUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str = ""  # Phone number for WhatsApp notifications
    username: str  # unique, used for /add/{username}
    password_hash: str = ""
    role: str = "team_member"
    role_id: str = ""  # Reference to roles collection
    city: str = ""  # City for location-based assignment
    is_active: bool = True
    permissions: List[str] = []  # ['students', 'schools', 'educators', 'growth_partners']
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str = ""  # Phone number for WhatsApp notifications
    username: str
    role_id: str = ""
    city: str = ""
    permissions: List[str] = []

class TeamUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None  # Phone number for WhatsApp notifications
    password: Optional[str] = None  # Plain text password - will be hashed before storing
    is_active: Optional[bool] = None
    role_id: Optional[str] = None
    city: Optional[str] = None
    permissions: Optional[List[str]] = None

# Center User Models
class CenterUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    center_id: str  # ID of the center this user manages
    center_name: str
    email: str
    name: str
    hashed_password: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CenterUserCreate(BaseModel):
    center_id: str
    center_name: str
    email: str
    password: str
    name: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AdminUser

# Student Inquiry Models
class StudentInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    learner_type: str  # self, child
    age_group: str
    skill: str
    learning_mode: str  # online, offline
    city: str
    learning_goal: str
    name: str
    email: EmailStr
    phone: str
    status: str = "new"  # new, demo_completed, converted, archived
    notes: str = ""
    comments: List[dict] = []
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    followup_date: Optional[str] = None
    conversion_amount: Optional[str] = None
    sessions_count: Optional[str] = None
    source: str = "website"
    added_by: str = ""  # user_id who added this lead
    assigned_to: str = ""  # user_id assigned to handle this lead
    assigned_educator_id: str = ""  # educator assigned to conduct demo
    assigned_educator_name: str = ""  # educator name for display
    meeting_link: str = ""  # Jitsi meeting link
    pending_payment: Optional[dict] = None  # For online payment tracking
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentInquiryCreate(BaseModel):
    learner_type: str = "self"
    age_group: str = ""
    skill: str = ""
    learning_mode: str = ""
    city: str = ""
    learning_goal: str = ""
    name: str
    email: EmailStr
    phone: str
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    source: str = "website"
    added_by: str = ""
    assigned_to: str = ""
    notes: str = ""

class StudentInquiryUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    followup_date: Optional[str] = None
    conversion_amount: Optional[str] = None
    sessions_count: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_educator_id: Optional[str] = None
    assigned_educator_name: Optional[str] = None
    pending_payment: Optional[dict] = None

# Comment Model (shared across CRMs)
class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    author: str = "Admin"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Growth Partner Model
class GrowthPartner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    city: str = ""
    interest_type: str = ""  # franchise, partnership, other
    details: str = ""
    status: str = "new"  # new, contacted, in_discussion, converted, archived
    notes: str = ""
    comments: List[dict] = []
    source: str = "website"
    added_by: str = ""
    assigned_to: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GrowthPartnerCreate(BaseModel):
    name: str
    email: str
    phone: str
    city: str = ""
    interest_type: str = ""
    details: str = ""
    source: str = "website"
    added_by: str = ""
    assigned_to: str = ""

class GrowthPartnerUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    details: Optional[str] = None
    notes: Optional[str] = None
    interest_type: Optional[str] = None
    assigned_to: Optional[str] = None

# Team Application Models
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

# Growth Partner Onboarding Model (for onboarded GPs)
class GPOnboarding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    growth_partner_id: str  # Reference to growth partner
    name: str
    email: str = ""
    phone: str
    city: str = ""
    interest_type: str = ""
    tracking_token: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    status: str = "onboarding"  # onboarding, active, discontinued
    
    # Onboarding steps (6 main steps for GP)
    steps: dict = Field(default_factory=lambda: {
        "personal_info": {"completed": False, "completed_at": None, "data": {}},
        "bank_details": {"completed": False, "completed_at": None, "data": {}},
        "contract_signing": {"completed": False, "completed_at": None, "data": {}},
        "payment": {"completed": False, "completed_at": None, "verified": False, "verified_by": None, "verified_at": None, "data": {}},
        "kit_delivery": {"completed": False, "completed_at": None, "delivered": False, "delivered_at": None, "tracking_number": "", "data": {}},
        "training": {"completed": False, "completed_at": None, "data": {}}
    })
    
    # Step 1: Personal Information
    personal_info: dict = Field(default_factory=lambda: {
        "full_name": "",
        "email": "",
        "phone": "",
        "aadhar_number": "",
        "aadhar_url": "",  # Uploaded Aadhar document
        "pan_number": "",
        "pan_url": "",  # Uploaded PAN document
        "address": "",
        "city": "",
        "state": "",
        "pincode": "",
        "tshirt_size": ""  # XS, S, M, L, XL, XXL
    })
    
    # Step 2: Bank Details (for commission payouts)
    bank_details: dict = Field(default_factory=lambda: {
        "account_holder_name": "",
        "bank_name": "",
        "account_number": "",
        "ifsc_code": "",
        "branch": "",
        "upi_id": "",
        "cancelled_cheque_url": ""  # Uploaded cancelled cheque
    })
    
    # Step 3: Contract
    contract_url: str = ""
    contract_signed_at: Optional[str] = None
    contract_signature_url: str = ""  # Digital signature image
    commission_structure: dict = Field(default_factory=dict)  # student_referral, school_referral rates
    
    # Step 4: Payment
    payment_amount: float = 0
    payment_status: str = ""  # pending, paid, verified
    payment_screenshot_url: str = ""
    payment_transaction_id: str = ""
    payment_date: str = ""
    
    # Step 5: Kit Delivery
    kit_delivery_status: str = ""  # pending, shipped, delivered
    kit_tracking_number: str = ""
    kit_delivery_date: str = ""
    kit_received_confirmation: bool = False
    
    # Step 6: Training - All sub-steps
    training_progress: dict = Field(default_factory=lambda: {
        "about_company": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "answers": {},  # MCQ answers
                "score": 0,
                "passed": False
            }
        },
        "about_skill": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "answers": {},  # Long text answers
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        },
        "implementation_models": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "answers": {},  # FAQ answers
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        },
        "product_training": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "samples_created": [],  # URLs of sample project photos/videos
            "component_names_learned": False
        },
        "target_audiences": {
            "completed": False,
            "completed_at": None,
            "videos_watched": [],
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "pitch_videos": {
                    "trustee_management": "",  # Video URL
                    "principal": "",
                    "teachers_demo": "",
                    "students_demo": "",
                    "parent_orientation": ""
                },
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        },
        "pricing_training": {
            "completed": False,
            "completed_at": None,
            "materials_reviewed": False,
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "negotiation_scenarios": {},  # Answers to negotiation scenarios
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        },
        "software_training": {
            "completed": False,
            "completed_at": None,
            "assessment": {
                "submitted": False,
                "submitted_at": None,
                "proposal_url": "",
                "mou_url": "",
                "email_sent": False,
                "whatsapp_sent": False,
                "campaign_created": False,
                "reviewed": False,
                "review_notes": "",
                "passed": False
            }
        }
    })
    
    # Training completion
    training_completed_at: Optional[str] = None
    training_notes: str = ""
    
    # Discontinuation
    discontinued_reason: str = ""
    discontinued_at: Optional[str] = None
    
    # Team user created (GP gets user access after training)
    team_user_id: str = ""
    team_user_credentials: dict = Field(default_factory=dict)  # Store login info to show GP
    
    # Performance metrics
    total_referrals: int = 0
    successful_conversions: int = 0
    total_earnings: float = 0
    
    # LMS Access (shown after training)
    lms_access_granted: bool = False
    lms_credentials: dict = Field(default_factory=dict)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Expense Model for PnL Reports
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
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_name: str
    contact_name: str = ""
    email: Optional[str] = ""          # made optional — AI-created leads may have no email
    phone: str = ""
    location: str = ""
    school_size: str = ""
    fee_range: str = ""
    board: str = ""
    address: str = ""  # Full school address
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = None
    programs_interested: List[str] = []
    support_needed: List[str] = []
    status: str = "new"  # new, meeting_done, converted, active, renewal_meeting, renewed, lost, lost_lead, lost_customer, archived
    notes: str = ""
    comments: List[dict] = []
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_type: str = "offline"  # offline, online
    followup_date: Optional[str] = None
    followup_comment: str = ""
    conversion_amount: Optional[Union[str, int, float]] = None
    quoted_price: Optional[Union[str, int, float]] = None  # Price quoted during meeting
    selected_offerings: Optional[List[str]] = None  # Offerings selected during meeting
    source: str = "website"
    referred_by: str = ""  # Name of person who referred (when source is referral)
    added_by: str = ""
    assigned_to: str = ""
    assigned_to_name: str = ""  # Name of assigned team member
    relationship_manager_id: str = ""  # RM assigned to converted schools
    relationship_manager_name: str = ""
    onboarding_data: Optional[dict] = None  # Onboarding details including offerings, pricing, contacts, payment tranches
    proposal_data: Optional[dict] = None  # Edit Lead / Generate Proposal data
    onboarding_workflow: Optional[dict] = None  # Onboarding workflow status and tracking
    activity_log: List[dict] = []  # Activity history log
    renewal_meeting_date: Optional[str] = None
    renewal_meeting_time: Optional[str] = None
    renewal_meeting_type: Optional[str] = None
    renewal_meeting_link: Optional[str] = None
    renewal_meeting_address: Optional[str] = None
    lost_reason: Optional[str] = None
    lead_value: Optional[float] = None  # Value of the lost lead/customer (for reports)
    followup_tasks: Optional[List[dict]] = None  # Auto-scheduled followup email tasks
    school_contacts: Optional[List[dict]] = []  # School team contacts
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SchoolInquiryCreate(BaseModel):
    school_name: str
    contact_name: str
    email: EmailStr
    phone: str
    location: str = ""
    school_size: str = ""
    fee_range: str = ""
    board: str = ""
    address: str = ""  # Full school address
    programs_interested: List[str] = []
    support_needed: List[str] = []
    selected_offerings: Optional[List[str]] = None
    quoted_price: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_type: str = "offline"
    source: str = "website"
    referred_by: str = ""
    added_by: str = ""
    added_by_name: str = ""
    assigned_to: str = ""
    assign_option: str = "admin"  # 'self' or 'admin'
    notes: str = ""
    school_contacts: Optional[List[dict]] = []  # School team contacts added at creation

class SchoolInquiryUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    status: Optional[str] = None
    school_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    board: Optional[str] = None
    address: Optional[str] = None  # Full school address
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = None
    model: Optional[str] = None
    total_students: Optional[int] = None
    school_size: Optional[str] = None
    fee_range: Optional[str] = None
    student_count: Optional[str] = None
    notes: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_type: Optional[str] = None
    followup_date: Optional[str] = None
    followup_comment: Optional[str] = None
    conversion_amount: Optional[Union[str, int, float]] = None
    quoted_price: Optional[Union[str, int, float]] = None  # Price quoted during meeting
    assigned_to: Optional[str] = None
    onboarding_data: Optional[dict] = None
    proposal_data: Optional[dict] = None  # Edit Lead / Generate Proposal data
    selected_offerings: Optional[list] = None
    programs_interested: Optional[list] = None
    # Lost reason
    lost_reason: Optional[str] = None
    lead_value: Optional[float] = None  # Value of lost lead/customer
    # Renewal meeting fields
    renewal_meeting_date: Optional[str] = None
    renewal_meeting_time: Optional[str] = None
    renewal_meeting_type: Optional[str] = None
    renewal_meeting_link: Optional[str] = None
    renewal_meeting_address: Optional[str] = None
    # Documents (proposal, MOU, parent circular, etc.)
    documents: Optional[list] = None
    # School team contacts (synced at top-level for quick access)
    school_contacts: Optional[List[dict]] = None

# Educator Models
class EducatorApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    email: str = ""          # str instead of EmailStr to avoid validation failures on legacy data
    phone: str = ""
    skills: List[str] = []
    experience: str = ""
    grades_comfortable: List[str] = []
    city: str = ""
    teaching_mode: str = ""
    availability: str = ""
    demo_ready: bool = False
    requirement_id: Optional[str] = None
    requirement_title: Optional[str] = None
    status: str = "new"
    notes: str = ""
    comments: List[dict] = []
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    tech_demo_date: Optional[str] = None
    tech_demo_time: Optional[str] = None
    meeting_link: str = ""
    phone_verified: bool = False
    onboarding_date: Optional[str] = None
    demo_rating: Optional[dict] = None
    source: str = "website"
    added_by: str = ""
    assigned_to: str = ""

    # Profile fields (populated from onboarding when moved to active)
    profile_photo: str = ""
    bio: str = ""
    tshirt_size: str = ""
    address_line1: str = ""
    address_line2: str = ""
    state: str = ""
    pincode: str = ""
    emergency_contact_name: str = ""
    emergency_contact_phone: str = ""
    emergency_contact_relation: str = ""
    aadhar_number: str = ""
    aadhar_document: str = ""
    pan_number: str = ""
    pan_document: str = ""
    id_verification_document: str = ""

    # Bank details
    bank_name: str = ""
    account_holder_name: str = ""
    account_number: str = ""
    ifsc_code: str = ""
    bank_document: str = ""

    # Contract
    contract_accepted: bool = False
    contract_accepted_at: Optional[str] = None
    digital_signature: str = ""

    # Training & Certification
    id_card_generated: bool = False
    certificate_generated: str = ""   # str, not bool — stores URL or empty string
    documents_verified: bool = False
    documents_verified_at: Optional[str] = None

    # Availability toggle
    is_available: bool = True

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode='before')
    @classmethod
    def sanitize_nullable_fields(cls, values):
        """Coerce None/wrong-type values from legacy DB records so validation never fails."""
        str_fields = [
            'name', 'email', 'phone', 'experience', 'city', 'teaching_mode',
            'availability', 'notes', 'meeting_link', 'source', 'added_by',
            'assigned_to', 'profile_photo', 'bio', 'tshirt_size',
            'address_line1', 'address_line2', 'state', 'pincode',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relation', 'aadhar_number', 'aadhar_document',
            'pan_number', 'pan_document', 'id_verification_document',
            'bank_name', 'account_holder_name', 'account_number', 'ifsc_code',
            'bank_document', 'digital_signature', 'certificate_generated',
            'status', 'onboarding_date',
        ]
        for f in str_fields:
            if values.get(f) is None:
                values[f] = ""
        list_fields = ['skills', 'grades_comfortable', 'comments']
        for f in list_fields:
            if not isinstance(values.get(f), list):
                values[f] = []
        bool_fields = ['demo_ready', 'phone_verified', 'contract_accepted',
                       'id_card_generated', 'documents_verified', 'is_available']
        for f in bool_fields:
            v = values.get(f)
            if v is None or v == "":
                values[f] = False
            elif not isinstance(v, bool):
                values[f] = bool(v)
        return values

class EducatorApplicationCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    skills: List[str]
    experience: str = ""
    grades_comfortable: List[str] = []
    city: str = ""
    teaching_mode: str = ""  # online, offline_home, offline_center
    availability: str = ""
    demo_ready: bool = False
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    requirement_id: Optional[str] = None
    requirement_title: Optional[str] = None
    why_interested: Optional[str] = None
    source: str = "website"
    added_by: str = ""
    assigned_to: str = ""
    notes: str = ""

class EducatorApplicationUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    tech_demo_date: Optional[str] = None
    tech_demo_time: Optional[str] = None
    onboarding_date: Optional[str] = None
    assigned_to: Optional[str] = None

# Educator Onboarding Models
class EducatorOnboarding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    educator_id: str  # Reference to educator_applications
    
    # Progress tracking (8 steps)
    current_step: int = 1  # 1-8
    completed_steps: List[int] = []
    
    # Step 1: Welcome Video
    welcome_video_watched: bool = False
    
    # Step 2: Profile
    profile_photo: str = ""
    bio: str = ""
    
    # Step 3: Personal Details
    tshirt_size: str = ""  # XS, S, M, L, XL, XXL
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    emergency_contact_name: str = ""
    emergency_contact_phone: str = ""
    emergency_contact_relation: str = ""
    aadhar_number: str = ""
    aadhar_document: str = ""  # File path
    pan_number: str = ""
    pan_document: str = ""  # File path
    id_verification_document: str = ""  # Additional ID
    
    # Step 4: Bank Details
    bank_name: str = ""
    account_holder_name: str = ""
    account_number: str = ""
    ifsc_code: str = ""
    bank_document: str = ""  # Cancelled cheque/passbook
    
    # Step 5: Contract
    contract_accepted: bool = False
    contract_accepted_at: Optional[str] = None
    digital_signature: str = ""  # Base64 or text signature
    
    # Step 6: Training Videos + Quiz (new format - per video)
    video_progress: dict = {}  # {video_id: {watched: bool, quizPassed: bool}}
    video_uploads: dict = {}  # {video_id: drive_link}
    training_videos_watched: List[str] = []  # Legacy
    quiz_attempts: List[dict] = []
    quiz_passed: bool = False
    
    # Step 7: Review (documents verified by admin)
    # Educator waits here until admin approves
    
    # Step 8: Downloadables
    id_card_generated: bool = False
    certificate_generated: bool = False
    
    # Admin verification
    documents_verified: bool = False
    documents_verified_by: str = ""
    documents_verified_at: Optional[str] = None
    verification_notes: str = ""
    
    # Meta
    status: str = "in_progress"  # in_progress, completed, on_hold
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[str] = None
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EducatorOnboardingUpdate(BaseModel):
    current_step: Optional[int] = None
    completed_steps: Optional[List[int]] = None
    welcome_video_watched: Optional[bool] = None
    profile_photo: Optional[str] = None
    bio: Optional[str] = None
    tshirt_size: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    aadhar_number: Optional[str] = None
    aadhar_document: Optional[str] = None
    pan_number: Optional[str] = None
    pan_document: Optional[str] = None
    id_verification_document: Optional[str] = None
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    bank_document: Optional[str] = None
    video_progress: Optional[dict] = None
    video_uploads: Optional[dict] = None
    contract_accepted: Optional[bool] = None
    digital_signature: Optional[str] = None
    training_videos_watched: Optional[List[str]] = None
    quiz_passed: Optional[bool] = None
    curriculum_videos_watched: Optional[List[str]] = None
    assessment_passed: Optional[bool] = None
    documents_verified: Optional[bool] = None
    verification_notes: Optional[str] = None
    status: Optional[str] = None

# Training content models
TRAINING_VIDEOS = [
    {"id": "rules", "title": "Educator Rules & Restrictions", "duration": "10:00", "url": "https://www.youtube.com/embed/dQw4w9WgXcQ"},
    {"id": "beliefs", "title": "What OLL Believes In", "duration": "8:00", "url": "https://www.youtube.com/embed/dQw4w9WgXcQ"},
    {"id": "quiz_guide", "title": "Quiz Checking Guidelines", "duration": "12:00", "url": "https://www.youtube.com/embed/dQw4w9WgXcQ"},
]

CURRICULUM_VIDEOS = [
    {"id": "curriculum_intro", "title": "Introduction to OLL Curriculum", "duration": "15:00", "url": "https://www.youtube.com/embed/dQw4w9WgXcQ"},
    {"id": "teaching_methods", "title": "Teaching Methodologies", "duration": "20:00", "url": "https://www.youtube.com/embed/dQw4w9WgXcQ"},
]

TRAINING_QUIZ = [
    {
        "id": "q1",
        "question": "What is the maximum class duration at OLL?",
        "options": ["30 minutes", "45 minutes", "60 minutes", "90 minutes"],
        "correct": 2
    },
    {
        "id": "q2", 
        "question": "How should you handle a student who is struggling?",
        "options": ["Skip to next topic", "Provide extra attention and patience", "Ask them to practice more at home", "Complain to parents"],
        "correct": 1
    },
    {
        "id": "q3",
        "question": "What is OLL's core teaching philosophy?",
        "options": ["Rote learning", "Student-centric personalized learning", "Strict discipline", "Competition-based"],
        "correct": 1
    },
    {
        "id": "q4",
        "question": "When should you mark attendance?",
        "options": ["Before class", "At the start of class", "At the end of class", "Next day"],
        "correct": 1
    },
    {
        "id": "q5",
        "question": "What should you do if you can't attend a scheduled demo?",
        "options": ["Skip it", "Inform admin at least 24 hours before", "Send a friend", "Just don't show up"],
        "correct": 1
    }
]

CURRICULUM_ASSESSMENT = [
    {
        "id": "a1",
        "question": "What age group does the Primary curriculum cover?",
        "options": ["3-5 years", "6-10 years", "11-14 years", "15-18 years"],
        "correct": 1
    },
    {
        "id": "a2",
        "question": "How often should progress reports be shared with parents?",
        "options": ["Daily", "Weekly", "Monthly", "Quarterly"],
        "correct": 2
    },
    {
        "id": "a3",
        "question": "What is the recommended homework duration for primary students?",
        "options": ["No homework", "15-20 minutes", "1 hour", "2 hours"],
        "correct": 1
    }
]

# Open Requirements Models
class OpenRequirement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    skill: str
    city: str
    area: str = ""
    description: str
    positions: int = 1
    days: List[str] = []
    timing_from: str = ""
    timing_to: str = ""
    pay_amount: str = ""
    pay_type: str = "per_session"  # per_session, per_day, per_month
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OpenRequirementCreate(BaseModel):
    title: str
    skill: str
    city: str
    area: str = ""
    description: str = ""
    positions: int = 1
    days: List[str] = []
    timing_from: str = ""
    timing_to: str = ""
    pay_amount: str = ""
    pay_type: str = "per_session"
    is_active: bool = True

class OpenRequirementUpdate(BaseModel):
    title: Optional[str] = None
    skill: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    description: Optional[str] = None
    positions: Optional[int] = None
    days: Optional[List[str]] = None
    timing_from: Optional[str] = None
    timing_to: Optional[str] = None
    pay_amount: Optional[str] = None
    pay_type: Optional[str] = None
    is_active: Optional[bool] = None

# FAQ Models
class FAQ(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    answer: str
    category: str  # courses, fees, demos, online_vs_offline
    order: int = 0
    is_active: bool = True

class FAQCreate(BaseModel):
    question: str
    answer: str
    category: str
    order: int = 0

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# Blog Models
class Blog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    excerpt: str
    content: str
    cover_image: str = ""
    category: str  # students, parents, educators, schools
    author: str
    blog_type: str = "blog"  # 'blog' or 'resource'
    is_published: bool = False
    parent_id: Optional[str] = None  # For nested resources
    order: int = 0
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogCreate(BaseModel):
    title: str
    slug: str
    excerpt: str
    content: str
    cover_image: str = ""
    category: str
    author: str
    blog_type: str = "blog"
    is_published: bool = False
    parent_id: Optional[str] = None
    order: int = 0
    tags: List[str] = []

class BlogUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    cover_image: Optional[str] = None
    category: Optional[str] = None
    blog_type: Optional[str] = None
    is_published: Optional[bool] = None
    parent_id: Optional[str] = None
    order: Optional[int] = None
    tags: Optional[List[str]] = None

# Support Ticket Models
class SupportTicket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    user_type: str  # student, educator, school
    subject: str
    message: str
    status: str = "open"  # open, in_progress, resolved, closed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupportTicketCreate(BaseModel):
    name: str
    email: EmailStr
    user_type: str
    subject: str
    message: str

# About Page Content Model
class AboutContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "about-page"
    mission: str
    vision: str
    what_we_do: str
    media_features: List[dict] = []
    team_members: List[dict] = []
    gallery_images: List[str] = []
    updates: List[dict] = []

class AboutContentUpdate(BaseModel):
    mission: Optional[str] = None
    vision: Optional[str] = None
    what_we_do: Optional[str] = None
    media_features: Optional[List[dict]] = None
    team_members: Optional[List[dict]] = None
    gallery_images: Optional[List[str]] = None
    updates: Optional[List[dict]] = None

# Demo Slot Models
class DemoSlot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    time: str
    is_available: bool = True
    booked_by: Optional[str] = None

# City Models
class City(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    state: str = ""
    is_active: bool = True
    has_center: bool = False
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CityCreate(BaseModel):
    name: str
    state: str = ""
    is_active: bool = True
    has_center: bool = False
    order: int = 0

class CityUpdate(BaseModel):
    name: Optional[str] = None
    state: Optional[str] = None
    is_active: Optional[bool] = None
    has_center: Optional[bool] = None
    order: Optional[int] = None

# Center Models
class Center(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    city: str
    area: str
    address: str
    contact_phone: str
    contact_email: str = ""
    google_maps_link: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CenterCreate(BaseModel):
    name: str
    city: str
    area: str
    address: str
    contact_phone: str
    contact_email: str = ""
    google_maps_link: str = ""
    is_active: bool = True

class CenterUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    google_maps_link: Optional[str] = None
    is_active: Optional[bool] = None

# ========================
# HELPER FUNCTIONS
# ========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        role = payload.get("role", "admin")
        educator_id = payload.get("educator_id")
        user_id = payload.get("user_id")
        center_id = payload.get("center_id")
        center_name = payload.get("center_name")
        
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if this is an educator login
        if role == "educator" and educator_id:
            educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
            if educator:
                educator["role"] = "educator"
                educator["educator_id"] = educator_id
                return educator
        
        # Check admins collection first
        user = await db.admins.find_one({"email": email}, {"_id": 0, "password": 0})
        if user:
            user["role"] = "admin"
            return user
        
        # Then check team_users collection
        team_user = await db.team_users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
        if team_user:
            team_user["role"] = "team_member"
            return team_user
        
        # Check center_users collection
        center_user = await db.center_users.find_one({"email": email}, {"_id": 0, "hashed_password": 0})
        if center_user:
            center_user["role"] = "center_user"
            return center_user
        
        # Check educator_applications for educator logins
        educator = await db.educator_applications.find_one({"email": email, "status": "onboarded"}, {"_id": 0})
        if educator:
            educator["role"] = "educator"
            educator["educator_id"] = educator["id"]
            return educator
        
        raise HTTPException(status_code=401, detail="User not found")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id and convert datetime to ISO string"""
    if doc is None:
        return None
    doc.pop('_id', None)
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

async def auto_assign_educator(skill: str, city: str = "", learning_mode: str = "online") -> dict:
    """
    Auto-assign an onboarded educator based on skill match.
    Returns educator dict with id and name, or empty dict if none found.
    Uses round-robin based on number of current assignments.
    Only assigns to educators who are available (is_available != False).
    """
    # Normalize skill name for matching
    skill_lower = skill.lower() if skill else ""
    
    # Find all onboarded AND available educators who teach this skill
    educators = await db.educator_applications.find({
        "status": "onboarded",
        "is_available": {"$ne": False},  # Include educators with is_available: True or undefined
        "skills": {"$elemMatch": {"$regex": skill_lower, "$options": "i"}}
    }, {"_id": 0}).to_list(100)
    
    if not educators:
        # Try partial match
        educators = await db.educator_applications.find({
            "status": "onboarded",
            "is_available": {"$ne": False}
        }, {"_id": 0}).to_list(100)
        # Filter by skill manually
        educators = [e for e in educators if any(skill_lower in s.lower() for s in e.get('skills', []))]
    
    if not educators:
        return {}
    
    # If city specified and offline mode, prefer educators in same city
    if city and learning_mode != "online":
        city_educators = [e for e in educators if e.get('city', '').lower() == city.lower()]
        if city_educators:
            educators = city_educators
    
    # Get assignment counts for round-robin
    educator_ids = [e['id'] for e in educators]
    assignment_counts = {}
    
    for eid in educator_ids:
        count = await db.student_inquiries.count_documents({
            "assigned_educator_id": eid,
            "status": {"$in": ["new", "confirmed", "rescheduled"]}
        })
        assignment_counts[eid] = count
    
    # Select educator with least assignments
    selected = min(educators, key=lambda e: assignment_counts.get(e['id'], 0))
    
    return {
        "id": selected['id'],
        "name": selected['name'],
        "phone": selected.get('phone', ''),
        "email": selected.get('email', '')
    }

async def auto_assign_lead(lead_type: str, city: str = "", learning_mode: str = "online", center_id: str = "") -> dict:
    """
    Auto-assign a lead to the appropriate team user based on role.
    Uses round-robin assignment when multiple users have the same role.
    
    lead_type: 'student', 'school', 'educator', 'growth_partner', 'team_application'
    Returns: dict with user_id and name, or empty dict if none found
    """
    # Map lead types to role names
    role_mapping = {
        'student': 'B2C Sales',
        'school': 'B2B Sales',
        'educator': 'Educator HR',
        'growth_partner': 'Growth Partner Manager',
        'team_application': 'Team HR'
    }
    
    target_role_name = role_mapping.get(lead_type)
    if not target_role_name:
        return {}
    
    # Find the role by name
    role = await db.roles.find_one({"name": target_role_name, "is_active": True}, {"_id": 0})
    if not role:
        return {}
    
    role_id = role.get('id')
    
    # Get all active users with this role
    users = await db.team_users.find({
        "role_id": role_id,
        "is_active": True
    }, {"_id": 0, "password_hash": 0}).to_list(100)
    
    if not users:
        return {}
    
    # For offline at center - assign to center user if available
    if lead_type == 'student' and learning_mode == 'offline' and center_id:
        center_user = await db.center_users.find_one({
            "center_id": center_id,
            "is_active": True
        }, {"_id": 0, "hashed_password": 0})
        if center_user:
            return {
                "user_id": center_user['id'],
                "name": center_user['name'],
                "email": center_user.get('email', ''),
                "type": "center_user"
            }
    
    # For schools - prefer users in the same city
    if lead_type == 'school' and city:
        city_users = [u for u in users if u.get('city', '').lower() == city.lower()]
        if city_users:
            users = city_users
    
    # Get assignment counts for round-robin
    user_ids = [u['id'] for u in users]
    assignment_counts = {}
    
    # Count based on lead type
    collection_map = {
        'student': 'student_inquiries',
        'school': 'school_inquiries',
        'educator': 'educator_applications',
        'growth_partner': 'growth_partner_applications',
        'team_application': 'team_applications'
    }
    
    collection_name = collection_map.get(lead_type, 'student_inquiries')
    
    for uid in user_ids:
        count = await db[collection_name].count_documents({
            "assigned_to": uid,
            "status": {"$nin": ["archived", "rejected", "cancelled", "closed"]}
        })
        assignment_counts[uid] = count
    
    # Select user with least assignments (round-robin)
    selected = min(users, key=lambda u: assignment_counts.get(u['id'], 0))
    
    return {
        "user_id": selected['id'],
        "name": selected['name'],
        "email": selected.get('email', ''),
        "type": "team_user"
    }

async def get_relationship_managers() -> list:
    """Get all active users with Relationship Manager role"""
    role = await db.roles.find_one({"name": "Relationship Manager", "is_active": True}, {"_id": 0})
    if not role:
        return []
    
    users = await db.team_users.find({
        "role_id": role.get('id'),
        "is_active": True
    }, {"_id": 0, "password_hash": 0}).to_list(100)
    
    return users

def generate_meeting_link(inquiry_id: str) -> str:
    """Generate a unique Jitsi meeting link for a booking"""
    meet_code = inquiry_id[-10:] if inquiry_id else 'demo-meet'
    return f"https://meet.jit.si/OLLDemo{meet_code}"


# ========================
# USER OTP AUTHENTICATION (Student/Educator/School)
# ========================

# Store OTPs temporarily (in production, use Redis)
# otp_store is imported from database module (see top of file)

class OTPRequest(BaseModel):
    phone: str
    user_type: str = "student"  # student, educator, school

class OTPVerify(BaseModel):
    phone: str
    otp: str
    user_type: str = "student"



# ========================
# EMAIL TEST ENDPOINTS
# ========================

@api_router.post("/email/test-all-templates")
async def test_all_email_templates(
    email: str = Query(..., description="Email address to send test emails to"),
    user: dict = Depends(get_current_user)
):
    """Send all email templates to specified email for testing"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    test_data = {
        "name": "Test User",
        "skills": "Robotics, STEM, Python",
        "experience": "5 years in education",
        "city": "Mumbai",
        "demo_date": "March 15, 2026",
        "demo_time": "10:00 AM IST",
        "meeting_link": "https://meet.jit.si/oll-test-demo",
        "onboarding_date": "March 20, 2026"
    }
    
    results = []
    for template_key in EMAIL_TEMPLATES.keys():
        result = await send_educator_email(email, template_key, test_data)
        results.append({
            "template": template_key,
            "subject": EMAIL_TEMPLATES[template_key]["subject"],
            "success": result.get("success", False),
            "message": result.get("message", "")
        })
        # Small delay between emails to avoid rate limiting
        await asyncio.sleep(1)
    
    successful = sum(1 for r in results if r["success"])
    return {
        "message": f"Sent {successful}/{len(results)} test emails to {email}",
        "results": results
    }


@api_router.post("/email/test-school-templates")
async def test_school_email_templates(
    email: str = Query(..., description="Email address to send test emails to"),
    user: dict = Depends(get_current_user)
):
    """Send all school-related email templates to specified email for testing"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    results = []
    
    # 1. School Personalized Email (with offerings)
    try:
        school_email_data = {
            "school_name": "Test Academy School",
            "contact_name": "Principal Test",
            "email": email,
            "programs_interested": ["Robotics", "STEM", "Coding"],
            "selected_offerings": [],
            "meeting_date": "March 20, 2026",
            "meeting_time": "11:00 AM IST"
        }
        
        # Build the email inline
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d4a6f 100%); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Empowering Future Skills</p>
                </div>
                <div style="padding: 32px;">
                    <h2 style="color: #1E3A5F; margin-top: 0;">Dear {school_email_data['contact_name']},</h2>
                    <p style="color: #333; line-height: 1.6;">
                        Thank you for your interest in OLL's skill education programs for <strong>{school_email_data['school_name']}</strong>!
                    </p>
                    <p style="color: #333; line-height: 1.6;">
                        We're excited about the opportunity to partner with your institution to bring cutting-edge 
                        <strong>Robotics, STEM, Coding</strong> education to your students.
                    </p>
                    <h3 style="color: #1E3A5F; margin-top: 24px;">Why Partner with OLL?</h3>
                    <ul style="color: #333; line-height: 1.8;">
                        <li>Industry-aligned curriculum designed by experts</li>
                        <li>Hands-on learning with modern equipment and kits</li>
                        <li>Trained educators and comprehensive teacher support</li>
                        <li>Flexible implementation models</li>
                        <li>50,000+ students impacted across India</li>
                    </ul>
                    <div style='background: #f0f9ff; padding: 16px; border-radius: 8px; margin-top: 24px;'>
                        <h3 style='color: #1E3A5F; margin: 0 0 12px 0;'>Meeting Scheduled</h3>
                        <p style='margin: 4px 0;'><strong>Date:</strong> {school_email_data['meeting_date']}</p>
                        <p style='margin: 4px 0;'><strong>Time:</strong> {school_email_data['meeting_time']}</p>
                    </div>
                    <p style="color: #333; margin-top: 24px;">
                        Warm regards,<br><strong>OLL Team</strong><br><span style="color: #666;">www.oll.co</span>
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #666; margin: 0; font-size: 14px;">OLL<br>Transforming Education Through Innovation</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        email_response = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "Welcome to OLL - Robotics, STEM, Coding Programs for Test Academy School",
            "html": html_content
        })
        results.append({"template": "school_welcome", "subject": "School Welcome/Partnership Email", "success": True, "message": "Email sent"})
    except Exception as e:
        results.append({"template": "school_welcome", "subject": "School Welcome/Partnership Email", "success": False, "message": str(e)})
    
    await asyncio.sleep(1)
    
    # 2. School Payment Reminder Email
    try:
        payment_html = """
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #D63031 0%, #e84343 100%); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Payment Reminder</p>
                </div>
                <div style="padding: 32px;">
                    <h2 style="color: #1E3A5F; margin-top: 0;">Dear Parent/Guardian,</h2>
                    <p style="color: #333; line-height: 1.6;">
                        This is a friendly reminder regarding the pending payment for your child's enrollment in the OLL program at <strong>Test Academy School</strong>.
                    </p>
                    <div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <p style="margin: 0; color: #856404;"><strong>Payment Details:</strong></p>
                        <p style="margin: 8px 0 0 0; color: #856404;">Amount: ₹5,000</p>
                        <p style="margin: 4px 0 0 0; color: #856404;">Due Date: March 25, 2026</p>
                        <p style="margin: 4px 0 0 0; color: #856404;">Student: Test Student (Grade 5)</p>
                    </div>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://oll.co/school-pay/test" style="background: #D63031; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Pay Now</a>
                    </div>
                    <p style="color: #666; font-size: 14px; line-height: 1.6;">
                        If you have already made the payment, please ignore this reminder. For any queries, contact us at support@oll.co
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #666; margin: 0; font-size: 14px;">OLL<br>Transforming Education Through Innovation</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "Payment Reminder - OLL Program at Test Academy School",
            "html": payment_html
        })
        results.append({"template": "school_payment_reminder", "subject": "School Payment Reminder", "success": True, "message": "Email sent"})
    except Exception as e:
        results.append({"template": "school_payment_reminder", "subject": "School Payment Reminder", "success": False, "message": str(e)})
    
    await asyncio.sleep(1)
    
    # 3. School Onboarding Complete Email
    try:
        onboard_html = """
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to OLL!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Partnership Confirmed</p>
                </div>
                <div style="padding: 32px;">
                    <h2 style="color: #1E3A5F; margin-top: 0;">Dear Test Academy School Team,</h2>
                    <p style="color: #333; line-height: 1.6;">
                        Congratulations! Your school's partnership with OLL is now officially confirmed. We're thrilled to have you join our mission of transforming education.
                    </p>
                    <div style="background: #d4edda; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <p style="margin: 0; color: #155724;"><strong>Partnership Details:</strong></p>
                        <p style="margin: 8px 0 0 0; color: #155724;">Program: Robotics & STEM Lab Setup</p>
                        <p style="margin: 4px 0 0 0; color: #155724;">Students Enrolled: 150</p>
                        <p style="margin: 4px 0 0 0; color: #155724;">Start Date: April 1, 2026</p>
                    </div>
                    <h3 style="color: #1E3A5F;">Next Steps:</h3>
                    <ol style="color: #333; line-height: 1.8;">
                        <li>Kit delivery will be scheduled within 7 working days</li>
                        <li>Teacher training session will be arranged</li>
                        <li>You'll receive access to the OLL Partner Dashboard</li>
                        <li>Dedicated support contact will be assigned</li>
                    </ol>
                    <p style="color: #333; margin-top: 24px;">
                        Warm regards,<br><strong>OLL Partnership Team</strong><br><span style="color: #666;">www.oll.co</span>
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #666; margin: 0; font-size: 14px;">OLL<br>Transforming Education Through Innovation</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "🎉 Partnership Confirmed - Welcome to OLL Family!",
            "html": onboard_html
        })
        results.append({"template": "school_onboarding_complete", "subject": "School Onboarding Complete", "success": True, "message": "Email sent"})
    except Exception as e:
        results.append({"template": "school_onboarding_complete", "subject": "School Onboarding Complete", "success": False, "message": str(e)})
    
    await asyncio.sleep(1)
    
    # 4. School Kit Delivery Update
    try:
        delivery_html = """
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">📦 Kit Delivery Update</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">OLL Robotics Kits</p>
                </div>
                <div style="padding: 32px;">
                    <h2 style="color: #1E3A5F; margin-top: 0;">Dear Test Academy School,</h2>
                    <p style="color: #333; line-height: 1.6;">
                        Great news! Your OLL Robotics kits have been dispatched and are on the way.
                    </p>
                    <div style="background: #cce5ff; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #004085;">
                        <p style="margin: 0; color: #004085;"><strong>Shipment Details:</strong></p>
                        <p style="margin: 8px 0 0 0; color: #004085;">PO Number: PO-2026-001</p>
                        <p style="margin: 4px 0 0 0; color: #004085;">Items: 50 Robotics Kits + Lab Equipment</p>
                        <p style="margin: 4px 0 0 0; color: #004085;">Tracking ID: DLV123456789</p>
                        <p style="margin: 4px 0 0 0; color: #004085;">Expected Delivery: March 18, 2026</p>
                    </div>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://oll.co/track/test" style="background: #3498db; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Track Shipment</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        Please ensure someone is available to receive the delivery. Contact us if you need to reschedule.
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #666; margin: 0; font-size: 14px;">OLL<br>Transforming Education Through Innovation</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "📦 Your OLL Kits Have Been Dispatched!",
            "html": delivery_html
        })
        results.append({"template": "school_kit_delivery", "subject": "School Kit Delivery Update", "success": True, "message": "Email sent"})
    except Exception as e:
        results.append({"template": "school_kit_delivery", "subject": "School Kit Delivery Update", "success": False, "message": str(e)})
    
    successful = sum(1 for r in results if r["success"])
    return {
        "message": f"Sent {successful}/{len(results)} school test emails to {email}",
        "results": results
    }

# ========================
# ROLES MANAGEMENT ENDPOINTS
# ========================

class Role(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    permissions: List[str] = []
    is_system: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


from routes.payments import router as payments_router, scheduled_payment_sync, scheduler, PAYMENT_SYNC_ENABLED, PAYMENT_SYNC_INTERVAL_MINUTES
from routes.summer_camp import router as summer_camp_router, check_summer_camp_followups, check_summer_camp_payment_pending, check_summer_camp_payment_pending_2
from routes.db_backup import router as db_backup_router
from routes.gp_onboarding import router as gp_onboarding_router
from routes.reports import router as reports_router
from routes.jobs import router as jobs_router
from routes.expenses import router as expenses_router, transform_tracking_url, fetch_po_data, fetch_vendor_products, match_vendor_product, VENDOR_PUBLIC_API
from routes.admin_keys import router as admin_keys_router
from routes.daily_report import router as daily_report_router, send_daily_reports
from routes.school_emails import router as school_emails_router
from routes.checkin_api import router as checkin_router
from routes.ai_chat import router as ai_chat_router
from routes.users import router as users_router
from routes.students import router as students_router
from routes.team import router as team_router
from routes.educators import router as educators_router
from routes.support import router as support_router
from routes.schools import router as schools_router
from routes.orders import router as orders_router
from routes.misc import router as misc_router

api_router.include_router(reports_router)
api_router.include_router(jobs_router)
api_router.include_router(expenses_router)
api_router.include_router(admin_keys_router)
api_router.include_router(payments_router)
api_router.include_router(summer_camp_router)
api_router.include_router(db_backup_router)
api_router.include_router(gp_onboarding_router)
api_router.include_router(daily_report_router)
api_router.include_router(school_emails_router)
api_router.include_router(checkin_router)
api_router.include_router(ai_chat_router)
api_router.include_router(users_router)
api_router.include_router(students_router)
api_router.include_router(team_router)
api_router.include_router(educators_router)
api_router.include_router(support_router)
api_router.include_router(schools_router)
api_router.include_router(orders_router)
api_router.include_router(misc_router)

app.include_router(api_router)

# Note: Static files mount removed - files are now served from MongoDB via /api/files/{filename}
# For backward compatibility, /api/uploads/{filename} redirects to /api/files/{filename}

# CORS: when env is '*' use allow_origin_regex so it works with allow_credentials=True
_cors_origins_raw = os.environ.get('CORS_ORIGINS', '*').strip().strip('"\'')
if _cors_origins_raw == '*':
    _allow_origins = []
    _allow_origin_regex = r'.*'
else:
    _allow_origins = [o.strip() for o in _cors_origins_raw.split(',')]
    _allow_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allow_origins,
    allow_origin_regex=_allow_origin_regex,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========================
# PAYMENT SYNC SCHEDULER
# ========================


# NOTE: scheduled_payment_sync routes moved to routes/payments.py
# scheduler, PAYMENT_SYNC_ENABLED, PAYMENT_SYNC_INTERVAL_MINUTES imported from routes/payments.py
# Keep a reference to the background index task so it isn't garbage-collected
_db_index_task = None


async def _create_db_indexes():
    """
    Create MongoDB indexes in the background so they don't block server startup.
    Called via asyncio.create_task() from startup_db_client.
    A short initial sleep lets Uvicorn accept health-check requests before
    the first Atlas TLS handshake/auth round-trip occurs.
    """
    try:
        # Yield to the event loop first — lets health checks respond immediately
        await asyncio.sleep(3)
        # School Inquiries indexes
        await db.school_inquiries.create_index("id", unique=True)
        await db.school_inquiries.create_index("status")
        await db.school_inquiries.create_index("assigned_to")
        await db.school_inquiries.create_index("created_at")
        await db.school_inquiries.create_index([("status", 1), ("created_at", -1)])

        # Student Inquiries indexes
        await db.student_inquiries.create_index("id", unique=True)
        await db.student_inquiries.create_index("status")
        await db.student_inquiries.create_index("assigned_to")
        await db.student_inquiries.create_index("demo_date")
        await db.student_inquiries.create_index([("status", 1), ("created_at", -1)])

        # Educator Applications indexes
        await db.educator_applications.create_index("id", unique=True)
        await db.educator_applications.create_index("status")
        await db.educator_applications.create_index("assigned_to")
        await db.educator_applications.create_index([("status", 1), ("created_at", -1)])

        # Support Queries indexes
        await db.support_queries.create_index("id", unique=True)
        await db.support_queries.create_index("status")
        await db.support_queries.create_index("assigned_to")
        await db.support_queries.create_index([("status", 1), ("created_at", -1)])

        # Inquiry Queries indexes
        await db.inquiry_queries.create_index("id", unique=True)
        await db.inquiry_queries.create_index("status")
        await db.inquiry_queries.create_index([("status", 1), ("created_at", -1)])

        # Support Tickets indexes
        await db.support_tickets.create_index("id", unique=True)
        await db.support_tickets.create_index("status")
        await db.support_tickets.create_index("source")
        await db.support_tickets.create_index([("status", 1), ("created_at", -1)])

        # Team Users indexes
        await db.team_users.create_index("id", unique=True)
        await db.team_users.create_index("email")

        # School Expenses indexes
        await db.school_expenses.create_index("id", unique=True)
        await db.school_expenses.create_index("school_id")
        await db.school_expenses.create_index([("school_id", 1), ("created_at", -1)])

        # External API Keys indexes
        await db.external_api_keys.create_index("id", unique=True)
        await db.external_api_keys.create_index("key", unique=True)

        # GP Applications indexes
        await db.gp_applications.create_index("id", unique=True)
        await db.gp_applications.create_index("status")

        # Growth Partners indexes
        await db.growth_partners.create_index("id", unique=True)
        await db.growth_partners.create_index("status")

        print("[STARTUP] Database indexes created successfully")
    except Exception as e:
        print(f"[STARTUP] Warning: Could not create some indexes: {e}")


@app.on_event("startup")
async def startup_db_client():
    """Start schedulers and kick off background index creation.

    Index creation is deliberately run in a background task so it does NOT
    block the server from accepting requests (and thus does not delay the
    health-check response on slow/remote MongoDB Atlas connections).
    """
    global _db_index_task
    # Fire-and-forget — indexes are built while the server is already live
    _db_index_task = asyncio.create_task(_create_db_indexes())

    # Start the payment sync scheduler
    # Defer first run by 5 minutes so it never fires during the health-check window
    if PAYMENT_SYNC_ENABLED and CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
        scheduler.add_job(
            scheduled_payment_sync,
            trigger=IntervalTrigger(minutes=PAYMENT_SYNC_INTERVAL_MINUTES),
            id="payment_sync_job",
            name="Automated Payment Sync",
            replace_existing=True,
            next_run_time=datetime.now(timezone.utc) + timedelta(minutes=5)
        )
        print(f"[STARTUP] Payment sync scheduler configured - runs every {PAYMENT_SYNC_INTERVAL_MINUTES} minutes")
    else:
        if not PAYMENT_SYNC_ENABLED:
            print("[STARTUP] Payment sync scheduler disabled via PAYMENT_SYNC_ENABLED=false")
        else:
            print("[STARTUP] Payment sync scheduler not started - Cashfree credentials missing")

    # Schedule daily report at 8:00 PM IST = 14:30 UTC every day
    from apscheduler.triggers.cron import CronTrigger
    scheduler.add_job(
        send_daily_reports,
        trigger=CronTrigger(hour=14, minute=30, timezone="UTC"),
        id="daily_report_job",
        name="Daily Category Reports",
        replace_existing=True
    )

    # Schedule overdue ticket check every 30 minutes
    # Defer first run by 2 minutes to avoid Atlas cold-start during health-check window
    scheduler.add_job(
        check_overdue_tickets,
        trigger=IntervalTrigger(minutes=30),
        id="overdue_ticket_check_job",
        name="Check Overdue Support Tickets",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc) + timedelta(minutes=2)
    )
    print("[STARTUP] Overdue ticket check scheduled — runs every 30 minutes")

    # Schedule school meeting reminders every 15 minutes
    # Defer first run by 2 minutes to avoid Atlas cold-start during health-check window
    scheduler.add_job(
        check_school_meeting_reminders,
        trigger=IntervalTrigger(minutes=15),
        id="school_meeting_reminder_job",
        name="School Meeting Reminders",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc) + timedelta(minutes=2)
    )
    print("[STARTUP] School meeting reminders scheduled — runs every 15 minutes")

    # Schedule School CRM daily digest — fires at 8:30 AM IST (03:00 UTC)
    scheduler.add_job(
        send_school_crm_daily_digest,
        trigger=CronTrigger(hour=3, minute=0, timezone="UTC"),
        id="school_crm_daily_digest_job",
        name="School CRM Daily Digest Email",
        replace_existing=True
    )
    print("[STARTUP] School CRM daily digest scheduled — fires at 8:30 AM IST (03:00 UTC)")

    # Schedule Summer Camp follow-up WhatsApp (every 1 minute)
    # Sends brochure PDF to leads who captured phone but didn't complete registration (5 min threshold)
    scheduler.add_job(
        check_summer_camp_followups,
        trigger=IntervalTrigger(minutes=1),
        id="summer_camp_followup_job",
        name="Summer Camp Follow-Up WhatsApp",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc) + timedelta(minutes=1)
    )
    print("[STARTUP] Summer Camp follow-up WhatsApp scheduled — runs every 1 minute")

    # Schedule Summer Camp payment-pending follow-up WhatsApp (every 1 minute)
    # Sends brochure PDF to leads who filled details but didn't complete payment (5 min threshold)
    scheduler.add_job(
        check_summer_camp_payment_pending,
        trigger=IntervalTrigger(minutes=1),
        id="summer_camp_payment_pending_job",
        name="Summer Camp Payment-Pending Follow-Up WhatsApp",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc) + timedelta(minutes=1)
    )
    print("[STARTUP] Summer Camp payment-pending WhatsApp scheduled — runs every 1 minute")

    # Schedule Summer Camp payment-pending 2nd follow-up (every 30 minutes is fine — 20hr threshold)
    scheduler.add_job(
        check_summer_camp_payment_pending_2,
        trigger=IntervalTrigger(minutes=30),
        id="summer_camp_payment_pending2_job",
        name="Summer Camp Payment-Pending 2nd Follow-Up WhatsApp (20hr)",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    print("[STARTUP] Summer Camp payment-pending 2nd follow-up WhatsApp scheduled — runs every 30 min (20hr threshold)")

    if not scheduler.running:
        scheduler.start()
    print("[STARTUP] Daily report emailer scheduled — fires at 8:00 PM IST (14:30 UTC)")

@app.on_event("shutdown")
async def shutdown_db_client():
    # Stop the scheduler if running
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[SHUTDOWN] Scheduler stopped")
    mongo_client.close()
    print("[SHUTDOWN] MongoDB client closed")
