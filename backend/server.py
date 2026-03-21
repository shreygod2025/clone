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
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Union
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import shutil
import resend
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_CENTER
import qrcode
from PIL import Image
from emergentintegrations.llm.chat import LlmChat, UserMessage
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import time
import hmac
import hashlib
from base64 import b64encode
import json
import warnings

# Suppress urllib3 SSL warnings for Cashfree SDK (SDK handles SSL internally)
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

# Cashfree Payment Gateway
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.models.customer_details import CustomerDetails as CashfreeCustomerDetails
from cashfree_pg.models.order_meta import OrderMeta

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

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Cashfree Payment Gateway Configuration
CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENVIRONMENT = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX")
CASHFREE_API_VERSION = "2023-08-01"

# Payment Sync Scheduler Configuration
PAYMENT_SYNC_ENABLED = os.getenv("PAYMENT_SYNC_ENABLED", "true").lower() == "true"
PAYMENT_SYNC_INTERVAL_MINUTES = int(os.getenv("PAYMENT_SYNC_INTERVAL_MINUTES", "60"))  # Default: every hour

# Initialize Cashfree credentials globally
if CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
    Cashfree.XClientId = CASHFREE_APP_ID
    Cashfree.XClientSecret = CASHFREE_SECRET_KEY
    if CASHFREE_ENVIRONMENT == "PRODUCTION":
        Cashfree.XEnvironment = Cashfree.PRODUCTION
    else:
        Cashfree.XEnvironment = Cashfree.SANDBOX
    logging.info(f"Cashfree initialized in {CASHFREE_ENVIRONMENT} environment")

def get_cashfree_client():
    """Get Cashfree client with correct environment"""
    cf_env = Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    return Cashfree(cf_env)

# MongoDB connection — import from database module for shared state
from database import db, otp_store, otp_store_new, otp_verify, otp_send_allowed

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
    AISENSY_API_KEY = os.environ.get("AISENSY_API_KEY", "")
    
    if not AISENSY_API_KEY:
        print("WhatsApp notification skipped - API key not configured")
        return {"success": False, "message": "API key not configured"}
    
    campaign_name = WHATSAPP_TEMPLATES.get(template_key)
    if not campaign_name:
        print(f"Unknown template key: {template_key}")
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
            "userName": user_name or "Clone Futura Live Solutions Ltd",
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
# EMAIL NOTIFICATION SYSTEM (Gmail SMTP)
# ========================

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Gmail SMTP Configuration
GMAIL_EMAIL = os.environ.get("GMAIL_EMAIL", "clonefutura@gmail.com")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")  # App Password, not regular password
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "clonefutura@gmail.com")

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
        print(f"Email notification error [{template_key}]: {str(e)}")
        return {"success": False, "message": str(e)}


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
<div style="max-width: 620px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
    {header}
    <div style="padding: 36px 32px;">
        <h2 style="color: #1E3A5F; margin-top: 0; font-size: 22px;">Dear {contact_name},</h2>
        <p style="color: #333; line-height: 1.7;">
            Thank you for your time and interest in OLL's programs. As discussed, please find attached the <strong>detailed proposal</strong> for implementing the OLL Robotics & AI program at <strong>{school_name}</strong>.
        </p>
        <div style="background: #fff8e1; border-left: 4px solid #f39c12; padding: 20px; border-radius: 0 10px 10px 0; margin: 24px 0;">
            <h3 style="color: #856404; margin: 0 0 12px 0; font-size: 15px;">Proposal Highlights</h3>
            <ul style="color: #444; line-height: 1.9; padding-left: 18px; margin: 0; font-size: 14px;">
                <li>Robotics & AI lab setup with complete kit supply</li>
                <li>Trained educator support for every batch</li>
                <li>CBSE/ICSE-aligned curriculum for Grades 1–12</li>
                <li>Flexible pricing — per student or fixed model</li>
                <li>Ongoing program support & quarterly assessments</li>
            </ul>
        </div>
        <p style="color: #333; line-height: 1.7;">
            We would love to discuss the proposal in detail at your convenience. Please feel free to share any feedback or questions — we're happy to customize the proposal as per your school's requirements.
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
            logging.error(f"Followup email error [{email_type}]: {str(e)}")
            return {"success": False, "error": str(e)}

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
    status: str = "new"  # new, contacted, interview_scheduled, interviewed, hired, rejected, archived
    comments: List[dict] = []
    notes: List[dict] = []
    source: str = "about_page"
    added_by: str = ""
    assigned_to: str = ""
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
    contact_name: str
    email: EmailStr
    phone: str
    location: str
    school_size: str
    fee_range: str
    board: str = ""
    address: str = ""  # Full school address
    programs_interested: List[str]
    support_needed: List[str]
    status: str = "new"  # new, meeting_done, converted, archived
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
    documents: Optional[List[dict]] = None
    followup_tasks: Optional[List[dict]] = None  # Auto-scheduled followup email tasks
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

class SchoolInquiryUpdate(BaseModel):
    status: Optional[str] = None
    school_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    board: Optional[str] = None
    address: Optional[str] = None  # Full school address
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
    # Renewal meeting fields
    renewal_meeting_date: Optional[str] = None
    renewal_meeting_time: Optional[str] = None
    renewal_meeting_type: Optional[str] = None
    renewal_meeting_link: Optional[str] = None
    renewal_meeting_address: Optional[str] = None
    # Documents (proposal, MOU, parent circular, etc.)
    documents: Optional[list] = None

# Educator Models
class EducatorApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    requirement_id: Optional[str] = None
    requirement_title: Optional[str] = None
    status: str = "new"  # new, demo_scheduled, hr_done, tech_scheduled, demo_completed, onboarded, archived
    notes: str = ""
    comments: List[dict] = []
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    tech_demo_date: Optional[str] = None
    tech_demo_time: Optional[str] = None
    meeting_link: str = ""
    phone_verified: bool = False
    onboarding_date: Optional[str] = None
    # Demo rating fields
    demo_rating: Optional[dict] = None  # Stores rating data when demo completed
    source: str = "website"
    added_by: str = ""
    assigned_to: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
# AUTH ENDPOINTS
# ========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register_admin(data: AdminCreate):
    existing = await db.admins.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    admin_data = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "name": data.name,
        "role": data.role,
        "password": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_data)
    
    token = create_access_token({"sub": data.email})
    user = AdminUser(id=admin_data["id"], email=data.email, name=data.name, role=data.role)
    return TokenResponse(access_token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_admin(data: AdminLogin):
    # First check admins collection
    admin = await db.admins.find_one({"email": data.email})
    if admin and verify_password(data.password, admin["password"]):
        token = create_access_token({"sub": data.email, "role": "admin"})
        user = AdminUser(id=admin["id"], email=admin["email"], name=admin["name"], role=admin.get("role", "admin"), permissions=[])
        return TokenResponse(access_token=token, user=user)
    
    # Then check team_users collection
    team_user = await db.team_users.find_one({"email": data.email})
    if team_user:
        if not team_user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User account is disabled")
        
        if bcrypt.checkpw(data.password.encode('utf-8'), team_user.get("password_hash", "").encode('utf-8')):
            token = create_access_token({"sub": data.email, "role": "team_member", "user_id": team_user["id"]})
            user = AdminUser(
                id=team_user["id"], 
                email=team_user["email"], 
                name=team_user["name"], 
                role="team_member",
                username=team_user.get("username", ""),
                permissions=team_user.get("permissions", [])
            )
            return TokenResponse(access_token=token, user=user)
    
    # Check center_users collection
    center_user = await db.center_users.find_one({"email": data.email})
    if center_user:
        if not center_user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User account is disabled")
        
        if bcrypt.checkpw(data.password.encode('utf-8'), center_user.get("hashed_password", "").encode('utf-8')):
            token = create_access_token({
                "sub": data.email, 
                "role": "center_user", 
                "user_id": center_user["id"],
                "center_id": center_user["center_id"],
                "center_name": center_user["center_name"]
            })
            user = AdminUser(
                id=center_user["id"], 
                email=center_user["email"], 
                name=center_user["name"], 
                role="center_user",
                center_id=center_user["center_id"],
                center_name=center_user["center_name"]
            )
            return TokenResponse(access_token=token, user=user)
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

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
# TEAM USER MANAGEMENT ENDPOINTS
# ========================

@api_router.post("/team-users")
async def create_team_user(data: TeamUserCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create team users")
    
    # Check if username already exists
    existing = await db.team_users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists
    existing_email = await db.team_users.find_one({"email": data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    team_user = TeamUser(
        email=data.email,
        name=data.name,
        phone=data.phone,
        username=data.username,
        password_hash=bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        role_id=data.role_id,
        city=data.city,
        permissions=data.permissions
    )
    doc = team_user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.team_users.insert_one(doc)
    
    return {"message": "Team user created", "id": doc['id'], "username": doc['username']}

@api_router.get("/team-users")
async def get_team_users(user: dict = Depends(get_current_user)):
    users = await db.team_users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(100)
    return users

@api_router.get("/team-users/{user_id}")
async def get_team_user(user_id: str, user: dict = Depends(get_current_user)):
    team_user = await db.team_users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not team_user:
        raise HTTPException(status_code=404, detail="User not found")
    return team_user

@api_router.get("/team-users/by-username/{username}")
async def get_team_user_by_username(username: str):
    team_user = await db.team_users.find_one({"username": username, "is_active": True}, {"_id": 0, "password_hash": 0})
    if not team_user:
        raise HTTPException(status_code=404, detail="User not found")
    return team_user

@api_router.patch("/team-users/{user_id}")
async def update_team_user(user_id: str, data: TeamUserUpdate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update team users")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Hash password if provided
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = hash_password(update_data["password"])
        del update_data["password"]  # Remove plain text password
    
    if update_data:
        await db.team_users.update_one({"id": user_id}, {"$set": update_data})
    return {"message": "User updated"}

@api_router.delete("/team-users/{user_id}")
async def delete_team_user(user_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete team users")
    
    await db.team_users.delete_one({"id": user_id})
    return {"message": "User deleted"}

@api_router.post("/team-users/login")
async def team_user_login(data: AdminLogin):
    team_user = await db.team_users.find_one({"email": data.email})
    if not team_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(data.password.encode('utf-8'), team_user.get("password_hash", "").encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not team_user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is disabled")
    
    # Create JWT token
    access_token = create_access_token(data={"sub": team_user["email"], "role": "team_member", "user_id": team_user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": team_user["id"],
            "email": team_user["email"],
            "name": team_user["name"],
            "username": team_user["username"],
            "role": "team_member",
            "permissions": team_user.get("permissions", [])
        }
    }


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

@api_router.get("/roles")
async def get_roles(user: dict = Depends(get_current_user)):
    """Get all roles"""
    roles = await db.roles.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return roles

@api_router.post("/roles")
async def create_role(data: dict, user: dict = Depends(get_current_user)):
    """Create a new role"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create roles")
    
    # Check if role name already exists
    existing = await db.roles.find_one({"name": data.get("name")})
    if existing:
        raise HTTPException(status_code=400, detail="Role with this name already exists")
    
    role = Role(
        name=data.get("name", ""),
        description=data.get("description", ""),
        permissions=data.get("permissions", []),
        is_system=data.get("is_system", False),
        is_active=data.get("is_active", True)
    )
    
    doc = role.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.roles.insert_one(doc)
    
    return role

@api_router.patch("/roles/{role_id}")
async def update_role(role_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a role (including system roles - only permissions can be updated for system roles)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update roles")
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # For system roles, only allow updating permissions and description
    if role.get("is_system"):
        allowed_fields = ["permissions", "description"]
        update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
    else:
        update_data = {k: v for k, v in data.items() if v is not None and k not in ["id", "created_at"]}
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.roles.update_one({"id": role_id}, {"$set": update_data})
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    return role

@api_router.delete("/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(get_current_user)):
    """Delete a role (non-system roles only)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete roles")
    
    # Check if it's a system role
    role = await db.roles.find_one({"id": role_id})
    if role and role.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
    
    # Check if any users are assigned to this role
    users_with_role = await db.team_users.count_documents({"role_id": role_id})
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role. {users_with_role} users are assigned to it.")
    
    await db.roles.delete_one({"id": role_id})
    return {"message": "Role deleted"}

# ========================
# CENTER USER MANAGEMENT ENDPOINTS
# ========================

@api_router.post("/center-users")
async def create_center_user(data: CenterUserCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create center users")
    
    # Check if email already exists
    existing = await db.center_users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Hash password
    hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    center_user = CenterUser(
        center_id=data.center_id,
        center_name=data.center_name,
        email=data.email,
        name=data.name,
        hashed_password=hashed_password
    )
    
    await db.center_users.insert_one(center_user.model_dump())
    return {"message": "Center user created", "id": center_user.id}

@api_router.get("/center-users")
async def list_center_users(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view center users")
    
    users = await db.center_users.find({}, {"_id": 0, "hashed_password": 0}).to_list(100)
    return users

@api_router.delete("/center-users/{user_id}")
async def delete_center_user(user_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete center users")
    
    await db.center_users.delete_one({"id": user_id})
    return {"message": "Center user deleted"}

@api_router.get("/center/demos")
async def get_center_demos(user: dict = Depends(get_current_user)):
    """Get all student inquiries for the logged-in center user's center - full CRM view"""
    if user.get("role") != "center_user":
        raise HTTPException(status_code=403, detail="Only center users can access this endpoint")
    
    center_name = user.get("center_name", "")
    center_city = center_name.split('-')[0].strip() if '-' in center_name else center_name
    
    # Find student inquiries that are for this center
    # Match by: learning_mode offline_center AND city matches, OR notes mention center
    demos = await db.student_inquiries.find({
        "$or": [
            {"notes": {"$regex": center_name, "$options": "i"}},
            {"learning_mode": "offline_center", "city": {"$regex": center_city, "$options": "i"}},
            {"source": {"$regex": center_name, "$options": "i"}}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    return demos

@api_router.patch("/center/demos/{inquiry_id}")
async def update_center_demo(inquiry_id: str, data: StudentInquiryUpdate, user: dict = Depends(get_current_user)):
    """Update a student inquiry from center dashboard"""
    if user.get("role") != "center_user":
        raise HTTPException(status_code=403, detail="Only center users can access this endpoint")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.student_inquiries.update_one({"id": inquiry_id}, {"$set": update_data})
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    return inquiry

@api_router.post("/center/demos/{inquiry_id}/comment")
async def add_center_demo_comment(inquiry_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a comment to a student inquiry from center dashboard"""
    if user.get("role") != "center_user":
        raise HTTPException(status_code=403, detail="Only center users can access this endpoint")
    
    comment = {
        "id": str(uuid.uuid4()),
        "text": data.get("text", ""),
        "author": f"{user.get('name', 'Center')} ({user.get('center_name', '')})",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.student_inquiries.update_one(
        {"id": inquiry_id},
        {"$push": {"comments": comment}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Comment added", "comment": comment}

@api_router.post("/center/demos")
async def create_center_demo(data: StudentInquiryCreate, user: dict = Depends(get_current_user)):
    """Quick add a demo for the logged-in center user's center"""
    if user.get("role") != "center_user":
        raise HTTPException(status_code=403, detail="Only center users can access this endpoint")
    
    center_name = user.get("center_name", "")
    
    inquiry = StudentInquiry(
        learner_type=data.learner_type or "self",
        age_group=data.age_group,
        skill=data.skill,
        learning_mode="offline_center",
        city=center_name.split('-')[0].strip() if '-' in center_name else center_name,
        learning_goal=data.learning_goal or "general",
        name=data.name,
        email=data.email,
        phone=data.phone,
        demo_date=data.demo_date,
        demo_time=data.demo_time,
        source=f"center_added ({center_name})",
        notes=f"Center: {center_name}\n{data.notes or ''}"
    )
    
    await db.student_inquiries.insert_one(inquiry.model_dump())
    return inquiry.model_dump()

@api_router.post("/auth/send-otp")
async def send_otp(data: OTPRequest):
    import random
    import httpx

    # Rate limiting — enforce cooldown between sends
    allowed, reason = otp_send_allowed(data.phone)
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)
    
    # Generate cryptographically random 4-digit OTP
    otp = str(random.SystemRandom().randint(1000, 9999))
    
    # Store OTP with expiration and attempt counter
    otp_store_new(data.phone, otp)
    
    # AiSensy WhatsApp API Integration
    AISENSY_API_KEY = os.environ.get("AISENSY_API_KEY", "")
    
    if not AISENSY_API_KEY:
        raise HTTPException(status_code=500, detail="WhatsApp OTP service not configured")
    
    try:
        # Format phone number with country code (91 for India)
        phone_number = data.phone
        if not phone_number.startswith("91") and not phone_number.startswith("+91"):
            phone_number = f"91{phone_number}"
        # Remove + if present
        phone_number = phone_number.replace("+", "")
        
        # AiSensy API endpoint
        aisensy_url = "https://backend.aisensy.com/campaign/t1/api/v2"
        
        payload = {
            "apiKey": AISENSY_API_KEY,
            "campaignName": "otp",
            "destination": phone_number,
            "userName": "Clone Futura Live Solutions Ltd",
            "templateParams": [otp],
            "source": "OLL Platform",
            "media": {},
            "buttons": [
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": 0,
                    "parameters": [
                        {
                            "type": "text",
                            "text": otp
                        }
                    ]
                }
            ],
            "carouselCards": [],
            "location": {},
            "attributes": {},
            "paramsFallbackValue": {
                "FirstName": otp
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(aisensy_url, json=payload, timeout=30.0)
            
            if response.status_code == 200:
                print(f"AiSensy OTP sent successfully to {phone_number}")
                return {"message": "OTP sent via WhatsApp", "sent": True}
            else:
                print(f"AiSensy API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Failed to send OTP. Please try again.")
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"AiSensy error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send OTP. Please try again.")

@api_router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    success, error_msg = otp_verify(data.phone, data.otp)
    if not success:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Find or create user based on phone and type
    collection_map = {
        "student": "student_inquiries",
        "educator": "educator_applications", 
        "school": "school_inquiries",
        "school_student": "school_student_payments"
    }
    collection = collection_map.get(data.user_type, "student_inquiries")
    
    # Find user's bookings/applications
    user_data = await db[collection].find_one({"phone": data.phone}, {"_id": 0})
    
    # Get all bookings for this phone
    bookings = await db[collection].find({"phone": data.phone}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    # For school_student, include payment details
    if data.user_type == "school_student":
        return {
            "phone": data.phone,
            "user_type": data.user_type,
            "name": user_data.get("student_name") if user_data else None,
            "email": user_data.get("email") if user_data else None,
            "grade": user_data.get("grade") if user_data else None,
            "division": user_data.get("division") if user_data else None,
            "school_name": user_data.get("school_name") if user_data else None,
            "payments": bookings,
            "is_registered": user_data is not None
        }
    
    return {
        "phone": data.phone,
        "user_type": data.user_type,
        "name": user_data.get("name") or user_data.get("contact_name") if user_data else None,
        "email": user_data.get("email") if user_data else None,
        "bookings": bookings,
        "is_registered": user_data is not None
    }

@api_router.get("/user/bookings/{phone}")
async def get_user_bookings(phone: str, user_type: str = "student"):
    collection_map = {
        "student": "student_inquiries",
        "educator": "educator_applications",
        "school": "school_inquiries"
    }
    collection = collection_map.get(user_type, "student_inquiries")
    bookings = await db[collection].find({"phone": phone}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return bookings

@api_router.post("/user/reschedule")
async def reschedule_booking(data: dict):
    collection_map = {
        "student": "student_inquiries",
        "educator": "educator_applications",
        "school": "school_inquiries"
    }
    collection = collection_map.get(data.get("user_type", "student"), "student_inquiries")
    
    booking_id = data.get("booking_id")
    new_date = data.get("new_date")
    new_time = data.get("new_time")
    
    if not booking_id or not new_date or not new_time:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    update_data = {
        "demo_date" if data.get("user_type") == "student" else "meeting_date": new_date,
        "demo_time" if data.get("user_type") == "student" else "meeting_time": new_time,
        "status": "rescheduled",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db[collection].update_one({"id": booking_id}, {"$set": update_data})
    return {"message": "Booking rescheduled successfully"}

@api_router.post("/user/cancel-booking")
async def cancel_booking(data: dict):
    """Cancel a booking with reason"""
    collection_map = {
        "student": "student_inquiries",
        "educator": "educator_applications",
        "school": "school_inquiries"
    }
    collection = collection_map.get(data.get("user_type", "student"), "student_inquiries")
    
    booking_id = data.get("booking_id")
    reason = data.get("reason", "not specified")
    
    if not booking_id:
        raise HTTPException(status_code=400, detail="Missing booking_id")
    
    update_data = {
        "status": "cancelled",
        "cancellation_reason": reason,
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db[collection].update_one({"id": booking_id}, {"$set": update_data})
    return {"message": "Booking cancelled successfully"}

# ========================
# SCHOOL STUDENT PROFILE & RECEIPTS
# ========================

@api_router.get("/school-student/profile/{phone}")
async def get_school_student_profile(phone: str):
    """Get school student profile and payment history"""
    # Find all payments for this phone
    payments = await db.school_student_payments.find(
        {"phone": phone}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    if not payments:
        raise HTTPException(status_code=404, detail="No records found for this phone number")
    
    # Get the most recent record for profile info
    latest = payments[0]
    
    return {
        "phone": phone,
        "student_name": latest.get("student_name", ""),
        "email": latest.get("email", ""),
        "grade": latest.get("grade", ""),
        "division": latest.get("division", ""),
        "school_name": latest.get("school_name", ""),
        "school_id": latest.get("school_id", ""),
        "payments": payments
    }

@api_router.patch("/school-student/profile/{phone}")
async def update_school_student_profile(phone: str, data: dict):
    """Update school student profile details"""
    allowed_fields = ["student_name", "email", "grade", "division"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update all payment records for this phone
    result = await db.school_student_payments.update_many(
        {"phone": phone},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No records found for this phone number")
    
    return {"message": "Profile updated successfully", "modified_count": result.modified_count}

@api_router.get("/school-student/receipt/{payment_id}")
async def get_school_student_receipt(payment_id: str):
    """Get a specific payment receipt"""
    payment = await db.school_student_payments.find_one(
        {"id": payment_id},
        {"_id": 0}
    )
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Only return paid payments as receipts
    if payment.get("status") != "PAID":
        raise HTTPException(status_code=400, detail="Receipt only available for completed payments")
    
    return {
        "receipt_id": payment.get("id"),
        "student_name": payment.get("student_name"),
        "phone": payment.get("phone"),
        "email": payment.get("email"),
        "school_name": payment.get("school_name"),
        "grade": payment.get("grade"),
        "division": payment.get("division"),
        "skill": payment.get("skill"),
        "amount": payment.get("amount"),
        "status": payment.get("status"),
        "cf_order_id": payment.get("cf_order_id"),
        "payment_time": payment.get("payment_time") or payment.get("synced_at"),
        "created_at": payment.get("created_at")
    }

# ========================
# STUDENT INQUIRY ENDPOINTS
# ========================

@api_router.post("/students/inquiry", response_model=StudentInquiry)
async def create_student_inquiry(data: StudentInquiryCreate):
    # Check for duplicate booking (same phone, skill, and demo_date within the last hour)
    if data.phone and data.skill:
        one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        existing = await db.student_inquiries.find_one({
            "phone": data.phone,
            "skill": data.skill,
            "demo_date": data.demo_date,
            "created_at": {"$gte": one_hour_ago}
        })
        if existing:
            # Return existing booking instead of creating duplicate
            if isinstance(existing.get('created_at'), str):
                existing['created_at'] = datetime.fromisoformat(existing['created_at'])
            if isinstance(existing.get('updated_at'), str):
                existing['updated_at'] = datetime.fromisoformat(existing['updated_at'])
            existing.pop('_id', None)
            return StudentInquiry(**existing)
    
    inquiry = StudentInquiry(**data.model_dump())
    
    # Auto-assign educator based on skill (for online demos or matching city)
    educator_data = None
    if data.skill:
        educator_data = await auto_assign_educator(data.skill, data.city, data.learning_mode)
        if educator_data:
            inquiry.assigned_educator_id = educator_data.get('id', '')
            inquiry.assigned_educator_name = educator_data.get('name', '')
    
    # Auto-assign to B2C Sales team user (round-robin)
    # Skip if already assigned (e.g., from team user link) or if assignment_option is 'admin'
    if not data.assigned_to and getattr(data, 'assignment_option', '') != 'admin':
        # For offline at center, assign to center user
        if data.learning_mode == 'offline' and getattr(data, 'selected_center', ''):
            assigned = await auto_assign_lead('student', data.city, 'offline', data.selected_center)
        else:
            # For online/at_home, auto-assign to B2C Sales
            assigned = await auto_assign_lead('student', data.city, data.learning_mode)
        
        if assigned and assigned.get('user_id'):
            inquiry.assigned_to = assigned['user_id']
    
    # Generate meeting link for the booking
    inquiry.meeting_link = generate_meeting_link(inquiry.id)
    
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.student_inquiries.insert_one(doc)
    
    # Send WhatsApp confirmation notifications
    if data.demo_date and data.demo_time:
        await send_demo_confirmation_notifications(doc, educator_data)
    
    # Send new lead notification to B2C Sales team
    try:
        sales_team = await db.users.find(
            {"department": "sales", "role": {"$in": ["admin", "team_member"]}},
            {"_id": 0, "phone": 1}
        ).to_list(10)
        sales_phones = [u.get("phone") for u in sales_team if u.get("phone")]
        if sales_phones:
            await send_student_newlead_notification(doc, sales_phones)
    except Exception as e:
        print(f"Failed to send new lead notification: {e}")
    
    return inquiry

@api_router.get("/students/inquiries", response_model=List[StudentInquiry])
async def get_student_inquiries(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    # For team members, only show leads they added or assigned to them
    if user.get("role") == "team_member":
        user_id = user.get("user_id", user.get("id", ""))
        query["$or"] = [
            {"added_by": user_id},
            {"assigned_to": user_id}
        ]
    
    inquiries = await db.student_inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for inq in inquiries:
        if isinstance(inq.get('created_at'), str):
            inq['created_at'] = datetime.fromisoformat(inq['created_at'])
        if isinstance(inq.get('updated_at'), str):
            inq['updated_at'] = datetime.fromisoformat(inq['updated_at'])
    return inquiries

@api_router.get("/students/inquiry/{inquiry_id}", response_model=StudentInquiry)
async def get_student_inquiry(inquiry_id: str, user: dict = Depends(get_current_user)):
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    if isinstance(inquiry.get('created_at'), str):
        inquiry['created_at'] = datetime.fromisoformat(inquiry['created_at'])
    if isinstance(inquiry.get('updated_at'), str):
        inquiry['updated_at'] = datetime.fromisoformat(inquiry['updated_at'])
    return inquiry

@api_router.patch("/students/inquiry/{inquiry_id}", response_model=StudentInquiry)
async def update_student_inquiry(
    inquiry_id: str, 
    data: StudentInquiryUpdate,
    user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.student_inquiries.update_one({"id": inquiry_id}, {"$set": update_data})
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if isinstance(inquiry.get('created_at'), str):
        inquiry['created_at'] = datetime.fromisoformat(inquiry['created_at'])
    if isinstance(inquiry.get('updated_at'), str):
        inquiry['updated_at'] = datetime.fromisoformat(inquiry['updated_at'])
    return inquiry

# ========================
# CASHFREE PAYMENT ENDPOINTS (Student Payments)
# ========================

class StudentPaymentRequest(BaseModel):
    """Request to create a student payment order"""
    student_id: str
    amount: float
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
    description: Optional[str] = None

class PaymentOrderResponse(BaseModel):
    """Response after creating a payment order"""
    order_id: str
    payment_session_id: str
    payment_link: str
    order_status: str
    amount: float

@api_router.post("/payments/create-order")
async def create_payment_order(data: StudentPaymentRequest, user: dict = Depends(get_current_user)):
    """Create a Cashfree payment order for student batch payment"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Get student details
    student = await db.student_inquiries.find_one({"id": data.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Generate unique order ID
    order_id = f"OLL-STU-{data.student_id[:8]}-{int(time.time())}"
    
    # Ensure customer_name meets Cashfree minimum (3 chars)
    # Use "Student" if name is empty/None
    student_name = student.get("name") or "Student"
    student_name = student_name.strip() if student_name else "Student"
    if not student_name or len(student_name) < 1:
        student_name = "Student"
    cf_customer_name = student_name if len(student_name) >= 3 else student_name.ljust(3, ' ')
    
    try:
        # Create customer details
        customer_details = CashfreeCustomerDetails(
            customer_id=data.student_id,
            customer_name=cf_customer_name,
            customer_email=student.get("email") or f"{data.student_id}@oll.co",
            customer_phone=student.get("phone") or "9999999999"
        )
        
        # Get frontend URL for return
        frontend_url = os.getenv("FRONTEND_URL", "https://multi-funnel-oll.preview.emergentagent.com")
        
        # Create order meta
        order_meta = OrderMeta(
            return_url=f"{frontend_url}/student/payment/success?order_id={order_id}",
            notify_url=f"{frontend_url}/api/payments/webhook"
        )
        
        # Build order request
        create_order_request = CreateOrderRequest(
            order_amount=data.amount,
            order_currency="INR",
            customer_details=customer_details,
            order_meta=order_meta,
            order_note=data.description or f"Batch payment for {student.get('name', 'Student')}"
        )
        
        # Create order via Cashfree using globally initialized credentials
        logging.info(f"Creating student payment - Order: {order_id}, Amount: {data.amount}")
        api_response = get_cashfree_client().PGCreateOrder(
            CASHFREE_API_VERSION,
            create_order_request,
            None,
            None
        )
        
        if api_response.data:
            # Store payment order in database
            payment_order = {
                "id": order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "student_id": data.student_id,
                "student_name": student.get("name"),
                "student_phone": student.get("phone"),
                "amount": data.amount,
                "batch_id": data.batch_id,
                "batch_name": data.batch_name,
                "description": data.description,
                "payment_session_id": api_response.data.payment_session_id,
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": user.get("id"),
                "created_by_name": user.get("name")
            }
            await db.student_payments.insert_one(payment_order)
            
            # Update student inquiry with pending payment
            await db.student_inquiries.update_one(
                {"id": data.student_id},
                {"$set": {
                    "pending_payment": {
                        "order_id": order_id,
                        "amount": data.amount,
                        "batch_id": data.batch_id,
                        "batch_name": data.batch_name,
                        "status": "PENDING",
                        "payment_link": f"https://payments.cashfree.com/forms/{api_response.data.payment_session_id}",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logging.info(f"Payment order created: {order_id}")
            return {
                "order_id": order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "payment_session_id": api_response.data.payment_session_id,
                "payment_link": f"https://payments.cashfree.com/forms/{api_response.data.payment_session_id}",
                "order_status": api_response.data.order_status,
                "amount": data.amount
            }
        else:
            logging.error(f"Failed to create payment order: {order_id}")
            raise HTTPException(status_code=500, detail="Failed to create payment order")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Payment order creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@api_router.get("/payments/order/{order_id}")
async def get_payment_order(order_id: str):
    """Get payment order status"""
    payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found")
    return payment

@api_router.get("/payments/student/{student_id}")
async def get_student_payment_info(student_id: str):
    """Get payment info for a student (public endpoint for student payment page)"""
    student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    pending_payment = student.get("pending_payment")
    if not pending_payment:
        return {"has_pending_payment": False, "student_name": student.get("name")}
    
    return {
        "has_pending_payment": True,
        "student_id": student_id,
        "student_name": student.get("name"),
        "student_phone": student.get("phone"),
        "student_email": student.get("email"),
        "skill": student.get("skill"),
        "amount": pending_payment.get("amount"),
        "batch_name": pending_payment.get("batch_name"),
        "batch_id": pending_payment.get("batch_id"),
        "order_id": pending_payment.get("order_id"),
        "status": pending_payment.get("status")
    }

@api_router.get("/payments/by-phone/{phone}")
async def get_payment_info_by_phone(phone: str):
    """Get payment info for a student by phone (for logged-in student dashboard)"""
    # Find student by phone - prioritize students with pending payments
    student = await db.student_inquiries.find_one(
        {"phone": phone, "pending_payment": {"$ne": None}}, 
        {"_id": 0}
    )
    
    if not student:
        # No pending payment found for this phone
        return {"has_pending_payment": False}
    
    pending_payment = student.get("pending_payment")
    if not pending_payment or pending_payment.get("status") == "PAID":
        return {"has_pending_payment": False, "student_name": student.get("name")}
    
    return {
        "has_pending_payment": True,
        "student_id": student.get("id"),
        "student_name": student.get("name"),
        "student_phone": student.get("phone"),
        "student_email": student.get("email"),
        "skill": student.get("skill"),
        "amount": pending_payment.get("amount"),
        "batch_name": pending_payment.get("batch_name"),
        "batch_id": pending_payment.get("batch_id"),
        "order_id": pending_payment.get("order_id"),
        "status": pending_payment.get("status")
    }

@api_router.post("/payments/create-session/{student_id}")
async def create_payment_session(student_id: str):
    """
    Create a Cashfree payment session on-demand when student clicks Pay Fees.
    This is a PUBLIC endpoint - no auth required.
    Returns payment_session_id for Drop-in checkout.
    """
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Get student details
    student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    pending_payment = student.get("pending_payment")
    if not pending_payment:
        raise HTTPException(status_code=400, detail="No pending payment for this student")
    
    amount = pending_payment.get("amount")
    if not amount or float(amount) <= 0:
        raise HTTPException(status_code=400, detail="Invalid payment amount")
    
    # Generate unique order ID
    order_id = f"OLL-STU-{student_id[:8]}-{int(time.time())}"
    
    # Ensure customer_name meets Cashfree minimum (3 chars)
    # Use "Student" if name is empty/None
    student_name = student.get("name") or "Student"
    student_name = student_name.strip() if student_name else "Student"
    if not student_name or len(student_name) < 1:
        student_name = "Student"
    cf_customer_name = student_name if len(student_name) >= 3 else student_name.ljust(3, ' ')
    
    logging.info(f"Creating payment for student: {student_id}, name: '{student_name}', cf_name: '{cf_customer_name}'")
    
    try:
        # Create customer details
        customer_details = CashfreeCustomerDetails(
            customer_id=student_id,
            customer_name=cf_customer_name,
            customer_email=student.get("email") or f"{student_id}@oll.co",
            customer_phone=student.get("phone") or "9999999999"
        )
        
        # Get frontend URL for return
        frontend_url = os.getenv("FRONTEND_URL", "https://multi-funnel-oll.preview.emergentagent.com")
        backend_url = os.getenv("REACT_APP_BACKEND_URL", frontend_url)
        
        # Create order meta
        order_meta = OrderMeta(
            return_url=f"{frontend_url}/student/payment/success?order_id={order_id}",
            notify_url=f"{backend_url}/api/payments/webhook"
        )
        
        # Build order request with our order_id for reference
        create_order_request = CreateOrderRequest(
            order_id=order_id,  # Set our order ID so we can reference it later
            order_amount=float(amount),
            order_currency="INR",
            customer_details=customer_details,
            order_meta=order_meta,
            order_note=f"Batch payment for {student.get('name', 'Student')} - {pending_payment.get('batch_name', 'Batch')}"
        )
        
        # Create order via Cashfree using globally initialized credentials
        logging.info(f"Creating public student payment - Order: {order_id}, Amount: {amount}")
        api_response = get_cashfree_client().PGCreateOrder(
            CASHFREE_API_VERSION,
            create_order_request,
            None,
            None
        )
        
        if api_response.data:
            # Store payment order in database
            payment_order = {
                "id": order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "student_id": student_id,
                "student_name": student.get("name"),
                "student_phone": student.get("phone"),
                "student_email": student.get("email"),
                "amount": float(amount),
                "batch_id": pending_payment.get("batch_id"),
                "batch_name": pending_payment.get("batch_name"),
                "payment_session_id": api_response.data.payment_session_id,
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "student_self_checkout"
            }
            await db.student_payments.insert_one(payment_order)
            
            # Update student's pending_payment with order_id
            await db.student_inquiries.update_one(
                {"id": student_id},
                {"$set": {
                    "pending_payment.order_id": order_id,
                    "pending_payment.status": "PENDING",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logging.info(f"Payment session created for student {student_id}: {order_id}")
            return {
                "success": True,
                "order_id": order_id,
                "payment_session_id": api_response.data.payment_session_id,
                "amount": float(amount),
                "environment": CASHFREE_ENVIRONMENT.lower()
            }
        else:
            logging.error(f"Failed to create payment session for student {student_id}")
            raise HTTPException(status_code=500, detail="Failed to create payment session")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Payment session creation error for {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@api_router.post("/payments/webhook")
async def cashfree_webhook(request: Request):
    """Handle Cashfree payment webhooks"""
    try:
        # Get raw body
        body = await request.body()
        body_str = body.decode('utf-8')
        
        # Get signature headers
        timestamp = request.headers.get('x-webhook-timestamp', '')
        received_signature = request.headers.get('x-webhook-signature', '')
        
        # Verify signature if present
        if timestamp and received_signature and CASHFREE_SECRET_KEY:
            signed_payload = f"{timestamp}.{body_str}"
            computed_hash = hmac.new(
                CASHFREE_SECRET_KEY.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).digest()
            computed_signature = b64encode(computed_hash).decode('utf-8')
            
            if not hmac.compare_digest(computed_signature, received_signature):
                logging.warning("Invalid webhook signature")
                # Don't raise error, just log - some webhooks may come without signature during testing
        
        # Parse webhook data
        webhook_data = json.loads(body_str)
        event_type = webhook_data.get('type', '')
        order_data = webhook_data.get('data', {}).get('order', {})
        payment_data = webhook_data.get('data', {}).get('payment', {})
        
        order_id = order_data.get('order_id') or webhook_data.get('data', {}).get('order_id')
        payment_status = payment_data.get('payment_status') or order_data.get('order_status')
        cf_payment_id = payment_data.get('cf_payment_id') or payment_data.get('payment_id')
        payment_method_details = payment_data.get('payment_group', 'unknown')
        
        logging.info(f"Webhook received - Event: {event_type}, Order: {order_id}, Status: {payment_status}, CF Payment ID: {cf_payment_id}")
        
        if order_id:
            # Check if already processed to prevent duplicate processing
            existing_payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
            if existing_payment and existing_payment.get("status") == "PAID":
                logging.info(f"Payment {order_id} already processed, skipping")
                return {"status": "success", "message": "Already processed"}
            
            # Update payment record
            update_data = {
                "status": payment_status,
                "webhook_data": webhook_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if payment_status == "SUCCESS" or event_type == "PAYMENT_SUCCESS_WEBHOOK":
                update_data["status"] = "PAID"
                update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                update_data["payment_method"] = f"Cashfree - {payment_method_details}"
                update_data["transaction_id"] = cf_payment_id
                update_data["cf_payment_id"] = cf_payment_id
            
            await db.student_payments.update_one(
                {"id": order_id},
                {"$set": update_data}
            )
            
            # Get payment to update student
            payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
            if payment and (payment_status == "SUCCESS" or event_type == "PAYMENT_SUCCESS_WEBHOOK"):
                # Update student status to converted and add to batch
                student_id = payment.get("student_id")
                batch_id = payment.get("batch_id")
                
                # Check if student is already converted (prevent duplicate processing)
                student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0})
                if student and student.get("status") == "converted" and student.get("pending_payment") is None:
                    logging.info(f"Student {student_id} already converted, skipping update")
                    return {"status": "success", "message": "Already processed"}
                
                student_update = {
                    "status": "converted",
                    "payment_status": "paid",
                    "payment_amount": payment.get("amount"),
                    "payment_date": datetime.now(timezone.utc).isoformat(),
                    "payment_method": f"Cashfree - {payment_method_details}",
                    "payment_transaction_id": cf_payment_id,
                    "pending_payment": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if batch_id:
                    student_update["batch_id"] = batch_id
                    student_update["batch_name"] = payment.get("batch_name")
                    
                    # Add student to batch
                    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
                    if batch and student_id not in batch.get("students", []):
                        await db.batches.update_one(
                            {"id": batch_id},
                            {"$addToSet": {"students": student_id}}
                        )
                        
                        # Create sessions for the student from batch schedule
                        if batch.get("schedule"):
                            sessions_to_create = []
                            for i, session_info in enumerate(batch.get("schedule", [])[:12], 1):  # Max 12 sessions
                                session = {
                                    "id": str(uuid.uuid4()),
                                    "student_id": student_id,
                                    "batch_id": batch_id,
                                    "session_number": i,
                                    "date": session_info.get("date"),
                                    "time": session_info.get("time", batch.get("time")),
                                    "mode": batch.get("mode", "online"),
                                    "skill": batch.get("skill"),
                                    "status": "scheduled",
                                    "created_at": datetime.now(timezone.utc).isoformat()
                                }
                                sessions_to_create.append(session)
                            
                            if sessions_to_create:
                                await db.sessions.insert_many(sessions_to_create)
                                student_update["sessions_total"] = len(sessions_to_create)
                                student_update["sessions_completed"] = 0
                                logging.info(f"Created {len(sessions_to_create)} sessions for student {student_id}")
                
                await db.student_inquiries.update_one(
                    {"id": student_id},
                    {"$set": student_update}
                )
                
                logging.info(f"Student {student_id} payment successful, status updated to converted, transaction: {cf_payment_id}")
        
        return {"status": "success", "message": "Webhook processed"}
        
    except json.JSONDecodeError:
        logging.error("Invalid JSON in webhook payload")
        return {"status": "error", "message": "Invalid JSON"}
    except Exception as e:
        logging.error(f"Webhook processing error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.get("/payments/verify/{order_id}")
async def verify_payment(order_id: str):
    """Verify payment status from Cashfree (can be called after return)"""
    logging.info(f"[PAYMENT_VERIFY] Starting verification for order: {order_id}")
    
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        logging.error("[PAYMENT_VERIFY] Cashfree credentials missing")
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
    if not payment:
        logging.error(f"[PAYMENT_VERIFY] Order not found in student_payments: {order_id}")
        raise HTTPException(status_code=404, detail="Payment order not found")
    
    logging.info(f"[PAYMENT_VERIFY] Found payment record: student_id={payment.get('student_id')}, batch_id={payment.get('batch_id')}, status={payment.get('status')}")
    
    # Check if already processed
    if payment.get("status") == "PAID":
        logging.info(f"[PAYMENT_VERIFY] Payment already marked as PAID, returning cached result")
        return {
            "order_id": order_id,
            "status": "PAID",
            "amount": payment.get("amount"),
            "student_name": payment.get("student_name"),
            "transaction_id": payment.get("transaction_id")
        }
    
    try:
        # Get the cf_order_id (Cashfree's internal order ID) - we also store our order_id which we set during creation
        cf_order_id = payment.get("cf_order_id")
        
        # Try fetching using our order_id first (which we now set during creation)
        # Fall back to cf_order_id if needed
        fetch_order_id = order_id  # Use our order_id since we now pass it to Cashfree
        
        # Fetch order status from Cashfree
        logging.info(f"[PAYMENT_VERIFY] Calling Cashfree PGFetchOrder for order_id: {fetch_order_id}")
        api_response = get_cashfree_client().PGFetchOrder(
            CASHFREE_API_VERSION,
            fetch_order_id,
            None
        )
        
        if api_response.data:
            order_status = api_response.data.order_status
            logging.info(f"[PAYMENT_VERIFY] Cashfree returned status: {order_status}")
            
            # Try to get payment details for transaction ID
            cf_payment_id = None
            payment_method = "Cashfree"
            try:
                payments_response = get_cashfree_client().PGOrderFetchPayments(
                    CASHFREE_API_VERSION,
                    fetch_order_id,  # Use the same order ID we used for fetch
                    None
                )
                if payments_response.data and len(payments_response.data) > 0:
                    cf_payment_id = str(payments_response.data[0].cf_payment_id)
                    payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                    logging.info(f"[PAYMENT_VERIFY] Got transaction ID: {cf_payment_id}")
            except Exception as e:
                logging.warning(f"[PAYMENT_VERIFY] Could not fetch payment details: {e}")
            
            # Update local payment record
            update_data = {
                "status": order_status,
                "verified_at": datetime.now(timezone.utc).isoformat()
            }
            if cf_payment_id:
                update_data["transaction_id"] = cf_payment_id
                update_data["cf_payment_id"] = cf_payment_id
                update_data["payment_method"] = payment_method
            
            logging.info(f"[PAYMENT_VERIFY] Updating student_payments collection with: {update_data}")
            await db.student_payments.update_one(
                {"id": order_id},
                {"$set": update_data}
            )
            
            # If payment is successful, update student
            if order_status == "PAID":
                student_id = payment.get("student_id")
                batch_id = payment.get("batch_id")
                logging.info(f"[PAYMENT_VERIFY] Payment PAID - Processing student update for student_id={student_id}, batch_id={batch_id}")
                
                # Check if already processed
                student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0})
                logging.info(f"[PAYMENT_VERIFY] Student lookup result: found={student is not None}, current_status={student.get('status') if student else 'N/A'}, pending_payment={student.get('pending_payment') if student else 'N/A'}")
                
                if student and student.get("status") == "converted" and student.get("pending_payment") is None:
                    logging.info(f"[PAYMENT_VERIFY] Student already converted with no pending payment - returning early")
                    return {
                        "order_id": order_id,
                        "status": order_status,
                        "amount": payment.get("amount"),
                        "student_name": payment.get("student_name"),
                        "transaction_id": cf_payment_id
                    }
                
                if not student:
                    logging.error(f"[PAYMENT_VERIFY] CRITICAL: Student not found in student_inquiries: {student_id}")
                    # Return success but note the issue
                    return {
                        "order_id": order_id,
                        "status": order_status,
                        "amount": payment.get("amount"),
                        "student_name": payment.get("student_name"),
                        "transaction_id": cf_payment_id,
                        "warning": "Student record not found for session creation"
                    }
                
                student_update = {
                    "status": "converted",
                    "payment_status": "paid",
                    "payment_amount": payment.get("amount"),
                    "payment_date": datetime.now(timezone.utc).isoformat(),
                    "payment_method": payment_method,
                    "payment_transaction_id": cf_payment_id,
                    "pending_payment": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                logging.info(f"[PAYMENT_VERIFY] Preparing student update: {student_update}")
                
                if batch_id:
                    student_update["batch_id"] = batch_id
                    student_update["batch_name"] = payment.get("batch_name")
                    
                    # Add student to batch if not already added
                    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
                    logging.info(f"[PAYMENT_VERIFY] Batch lookup: found={batch is not None}, batch_name={batch.get('name') if batch else 'N/A'}")
                    
                    if batch:
                        current_students = batch.get("students", [])
                        if student_id not in current_students:
                            logging.info(f"[PAYMENT_VERIFY] Adding student to batch")
                            await db.batches.update_one(
                                {"id": batch_id},
                                {"$addToSet": {"students": student_id}}
                            )
                            
                            # Create sessions for the student from batch schedule
                            schedule = batch.get("schedule", [])
                            logging.info(f"[PAYMENT_VERIFY] Batch schedule has {len(schedule)} entries")
                            
                            if schedule:
                                # Check if sessions already exist
                                existing_sessions = await db.sessions.count_documents({"student_id": student_id, "batch_id": batch_id})
                                logging.info(f"[PAYMENT_VERIFY] Existing sessions count: {existing_sessions}")
                                
                                if existing_sessions == 0:
                                    sessions_to_create = []
                                    for i, session_info in enumerate(schedule[:12], 1):
                                        session = {
                                            "id": str(uuid.uuid4()),
                                            "student_id": student_id,
                                            "batch_id": batch_id,
                                            "session_number": i,
                                            "date": session_info.get("date"),
                                            "time": session_info.get("time", batch.get("time")),
                                            "mode": batch.get("mode", "online"),
                                            "skill": batch.get("skill"),
                                            "status": "scheduled",
                                            "created_at": datetime.now(timezone.utc).isoformat()
                                        }
                                        sessions_to_create.append(session)
                                    
                                    if sessions_to_create:
                                        logging.info(f"[PAYMENT_VERIFY] Creating {len(sessions_to_create)} sessions")
                                        await db.sessions.insert_many(sessions_to_create)
                                        student_update["sessions_total"] = len(sessions_to_create)
                                        student_update["sessions_completed"] = 0
                                else:
                                    logging.info(f"[PAYMENT_VERIFY] Sessions already exist, skipping creation")
                        else:
                            logging.info(f"[PAYMENT_VERIFY] Student already in batch")
                    else:
                        logging.warning(f"[PAYMENT_VERIFY] Batch not found: {batch_id}")
                else:
                    logging.warning(f"[PAYMENT_VERIFY] No batch_id in payment record")
                
                # Perform the student update
                logging.info(f"[PAYMENT_VERIFY] Executing student_inquiries update for {student_id}")
                update_result = await db.student_inquiries.update_one(
                    {"id": student_id},
                    {"$set": student_update}
                )
                logging.info(f"[PAYMENT_VERIFY] Update result: matched={update_result.matched_count}, modified={update_result.modified_count}")
                
                # Verify the update worked
                updated_student = await db.student_inquiries.find_one({"id": student_id}, {"_id": 0, "status": 1, "payment_status": 1})
                logging.info(f"[PAYMENT_VERIFY] Post-update verification: status={updated_student.get('status') if updated_student else 'N/A'}, payment_status={updated_student.get('payment_status') if updated_student else 'N/A'}")
            else:
                logging.info(f"[PAYMENT_VERIFY] Order status is {order_status}, not PAID - skipping student update")
            
            return {
                "order_id": order_id,
                "status": order_status,
                "amount": payment.get("amount"),
                "student_name": payment.get("student_name"),
                "transaction_id": cf_payment_id
            }
        else:
            logging.warning(f"[PAYMENT_VERIFY] No data in Cashfree response")
            return {"order_id": order_id, "status": payment.get("status", "UNKNOWN")}
            
    except Exception as e:
        logging.error(f"[PAYMENT_VERIFY] Exception during verification: {str(e)}", exc_info=True)
        return {"order_id": order_id, "status": payment.get("status", "UNKNOWN"), "error": str(e)}

# ========================
# SCHOOL STUDENT PAYMENTS (Public)
# ========================

@api_router.get("/school-payment/{school_id}")
async def get_school_payment_info(school_id: str):
    """Get school info for student payment page (public)"""
    # Check cache first
    cache_key = f"school_payment_{school_id}"
    cached = get_cached(cache_key)
    if cached:
        return cached
    
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    onboarding_data = school.get("onboarding_data", {})
    payment_mode = onboarding_data.get("payment_mode", "")
    payment_method = onboarding_data.get("payment_method", "")
    
    # Check if online payment by students is enabled
    if payment_mode != "online" or payment_method != "student":
        raise HTTPException(status_code=400, detail="Online student payment not enabled for this school")
    
    grade_pricing = onboarding_data.get("grade_pricing", [])
    if not grade_pricing:
        raise HTTPException(status_code=400, detail="No grade pricing configured for this school")
    
    # Transform grade_pricing to use 'price' key for frontend compatibility
    # The data may have 'price_per_student' from the admin form
    transformed_pricing = []
    for gp in grade_pricing:
        price = gp.get("price") or gp.get("price_per_student") or 0
        transformed_pricing.append({
            "grade": gp.get("grade", ""),
            "price": float(price) if price else 0,
            "students": gp.get("students", 0)
        })
    
    # Get skill/program from offerings or model
    skill = onboarding_data.get("offering") or school.get("skill") or "Program"
    
    result = {
        "school_id": school_id,
        "school_name": school.get("school_name", ""),
        "skill": skill,
        "city": school.get("city", ""),
        "grade_pricing": transformed_pricing,
        "total_students": onboarding_data.get("total_students", 0),
        "total_amount": onboarding_data.get("total_amount", 0)
    }
    
    # Cache for 5 minutes
    set_cached(cache_key, result, 300)
    return result

@api_router.post("/school-payment/create-session")
async def create_school_student_payment_session(data: dict):
    """Create Cashfree payment session for school student (public)"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    school_id = data.get("school_id")
    student_name = data.get("student_name", "").strip()
    phone = data.get("phone", "").strip()
    grade = data.get("grade", "").strip()
    division = data.get("division", "").strip()
    amount = data.get("amount", 0)
    
    if not all([school_id, student_name, phone, grade, amount]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Validate student name is at least 3 characters (Cashfree requirement)
    if len(student_name) < 3:
        raise HTTPException(status_code=400, detail="Student name must be at least 3 characters")
    
    # Validate school exists and has online payment enabled
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    onboarding_data = school.get("onboarding_data", {})
    if onboarding_data.get("payment_mode") != "online" or onboarding_data.get("payment_method") != "student":
        raise HTTPException(status_code=400, detail="Online student payment not enabled")
    
    # Validate amount matches grade pricing
    grade_pricing = onboarding_data.get("grade_pricing", [])
    grade_match = next((g for g in grade_pricing if g.get("grade") == grade), None)
    if not grade_match:
        raise HTTPException(status_code=400, detail=f"Invalid grade: {grade}")
    
    # Handle both 'price' and 'price_per_student' field names
    expected_amount = grade_match.get("price") or grade_match.get("price_per_student") or 0
    if float(amount) != float(expected_amount):
        raise HTTPException(status_code=400, detail=f"Amount mismatch. Expected: {expected_amount}")
    
    skill = onboarding_data.get("offering") or school.get("skill") or "Program"
    
    # Generate unique order ID
    order_id = f"SCH_{school_id[:8]}_{str(uuid.uuid4())[:8]}"
    
    # Ensure customer_name meets Cashfree minimum (3 chars) - pad if needed
    cf_customer_name = student_name if len(student_name) >= 3 else student_name.ljust(3, ' ')
    
    try:
        # Create Cashfree order using globally initialized credentials
        customer_details = CashfreeCustomerDetails(
            customer_id=f"sch_std_{phone}",
            customer_phone=phone,
            customer_name=cf_customer_name
        )
        
        order_meta = OrderMeta(
            return_url=f"{os.environ.get('FRONTEND_URL', 'https://oll.co')}/school-payment-success/{school_id}?order_id={order_id}"
        )
        
        order_request = CreateOrderRequest(
            order_id=order_id,
            order_amount=float(amount),
            order_currency="INR",
            customer_details=customer_details,
            order_meta=order_meta,
            order_note=f"School: {school.get('school_name')} | {skill} | Grade {grade}"
        )
        
        logging.info(f"Creating school payment - Order: {order_id}, Amount: {amount}, School: {school.get('school_name')}")
        
        # Use globally initialized Cashfree - credentials already set at startup
        api_response = get_cashfree_client().PGCreateOrder(
            CASHFREE_API_VERSION, 
            order_request, 
            None, 
            None
        )
        
        if api_response.data:
            cf_order_id = api_response.data.cf_order_id
            payment_session_id = api_response.data.payment_session_id
            
            # Store payment record
            payment_record = {
                "id": order_id,
                "type": "school_student",
                "school_id": school_id,
                "school_name": school.get("school_name", ""),
                "student_name": student_name,
                "phone": phone,
                "grade": grade,
                "division": division,
                "skill": skill,
                "amount": float(amount),
                "cf_order_id": cf_order_id,
                "payment_session_id": payment_session_id,
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.school_student_payments.insert_one(payment_record)
            
            return {
                "success": True,
                "order_id": order_id,
                "payment_session_id": payment_session_id,
                "environment": CASHFREE_ENVIRONMENT.lower()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create payment order")
            
    except Exception as e:
        logging.error(f"School payment session creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/school-payment/webhook")
async def school_payment_webhook(request: Request):
    """Handle Cashfree webhook for school student payments"""
    try:
        body = await request.body()
        body_str = body.decode('utf-8')
        
        webhook_data = json.loads(body_str)
        event_type = webhook_data.get('type', '')
        order_data = webhook_data.get('data', {}).get('order', {})
        payment_data = webhook_data.get('data', {}).get('payment', {})
        
        order_id = order_data.get('order_id') or webhook_data.get('data', {}).get('order_id')
        payment_status = payment_data.get('payment_status') or order_data.get('order_status')
        cf_payment_id = payment_data.get('cf_payment_id') or payment_data.get('payment_id')
        payment_method = payment_data.get('payment_group', 'unknown')
        
        logging.info(f"School payment webhook - Order: {order_id}, Status: {payment_status}")
        
        if order_id and order_id.startswith("SCH_"):
            # Check if already processed
            existing = await db.school_student_payments.find_one({"id": order_id}, {"_id": 0})
            if existing and existing.get("status") == "PAID":
                return {"status": "success", "message": "Already processed"}
            
            update_data = {
                "status": payment_status,
                "webhook_data": webhook_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if payment_status == "SUCCESS" or event_type == "PAYMENT_SUCCESS_WEBHOOK":
                update_data["status"] = "PAID"
                update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                update_data["transaction_id"] = cf_payment_id
                update_data["cf_payment_id"] = cf_payment_id
                update_data["payment_method"] = f"Cashfree - {payment_method}"
            
            await db.school_student_payments.update_one(
                {"id": order_id},
                {"$set": update_data}
            )
            
        return {"status": "success"}
    except Exception as e:
        logging.error(f"School payment webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.get("/school-payment/verify/{order_id}")
async def verify_school_student_payment(order_id: str):
    """Verify school student payment status"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    payment = await db.school_student_payments.find_one({"id": order_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # If already paid, return status
    if payment.get("status") == "PAID":
        return {
            "order_id": order_id,
            "status": "PAID",
            "amount": payment.get("amount"),
            "student_name": payment.get("student_name"),
            "transaction_id": payment.get("transaction_id")
        }
    
    try:
        # Use the order_id (our ID) to fetch from Cashfree, NOT cf_order_id
        # Cashfree PGFetchOrder expects the order_id we sent when creating the order
        logging.info(f"Verifying school payment - Order ID: {order_id}")
        
        # Use globally initialized Cashfree - credentials already set at startup
        api_response = get_cashfree_client().PGFetchOrder(
            CASHFREE_API_VERSION,
            order_id,  # Use our order_id, not cf_order_id
            None
        )
        
        logging.info(f"School payment verification - Order: {order_id}, API Response data: {api_response.data}")
        
        if api_response.data:
            order_status = api_response.data.order_status
            logging.info(f"Order status from Cashfree: {order_status}")
            
            # Try to get transaction ID
            cf_payment_id = None
            payment_method = "Cashfree"
            try:
                payments_response = get_cashfree_client().PGOrderFetchPayments(
                    CASHFREE_API_VERSION,
                    order_id,  # Use our order_id
                    None
                )
                logging.info(f"Payments response: {payments_response.data}")
                if payments_response.data and len(payments_response.data) > 0:
                    cf_payment_id = str(payments_response.data[0].cf_payment_id)
                    payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                    logging.info(f"Payment details fetched - CF Payment ID: {cf_payment_id}, Method: {payment_method}")
            except Exception as e:
                logging.warning(f"Could not fetch payment details: {e}")
            
            update_data = {
                "status": order_status,
                "verified_at": datetime.now(timezone.utc).isoformat()
            }
            if cf_payment_id:
                update_data["transaction_id"] = cf_payment_id
                update_data["cf_payment_id"] = cf_payment_id
                update_data["payment_method"] = payment_method
            
            if order_status == "PAID":
                update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.school_student_payments.update_one(
                {"id": order_id},
                {"$set": update_data}
            )
            
            return {
                "order_id": order_id,
                "status": order_status,
                "amount": payment.get("amount"),
                "student_name": payment.get("student_name"),
                "transaction_id": cf_payment_id
            }
        
        return {"order_id": order_id, "status": payment.get("status", "UNKNOWN")}
        
    except Exception as e:
        logging.error(f"School payment verification error: {str(e)}")
        return {"order_id": order_id, "status": payment.get("status", "UNKNOWN"), "error": str(e)}

@api_router.get("/school-payment/tracker/{school_id}")
async def get_school_payment_tracker(
    school_id: str,
    grade: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all student payments for a school (admin)"""
    query = {"school_id": school_id}
    if grade:
        query["grade"] = grade
    
    payments = await db.school_student_payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    # Calculate stats
    total_collected = sum(p.get("amount", 0) for p in payments if p.get("status") == "PAID")
    paid_count = len([p for p in payments if p.get("status") == "PAID"])
    pending_count = len([p for p in payments if p.get("status") != "PAID"])
    
    # Grade-wise breakdown
    grade_stats = {}
    for p in payments:
        g = p.get("grade", "Unknown")
        if g not in grade_stats:
            grade_stats[g] = {"paid": 0, "pending": 0, "amount": 0}
        if p.get("status") == "PAID":
            grade_stats[g]["paid"] += 1
            grade_stats[g]["amount"] += p.get("amount", 0)
        else:
            grade_stats[g]["pending"] += 1
    
    # Get school info for expected totals
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    onboarding_data = school.get("onboarding_data", {}) if school else {}
    total_students = onboarding_data.get("total_students", 0)
    total_expected = onboarding_data.get("total_amount", 0)
    
    return {
        "payments": payments,
        "stats": {
            "total_collected": total_collected,
            "paid_count": paid_count,
            "pending_count": pending_count,
            "total_students": total_students,
            "total_expected": total_expected,
            "collection_percentage": round((total_collected / total_expected * 100), 1) if total_expected > 0 else 0
        },
        "grade_stats": grade_stats
    }

@api_router.get("/school-payment/tracker-public/{school_id}")
async def get_school_payment_tracker_public(school_id: str):
    """Get school payment tracker summary with student list (public - for tracking page)"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Get ALL payments for this school (both PAID and PENDING/ACTIVE)
    all_payments = await db.school_student_payments.find(
        {"school_id": school_id}, 
        {"_id": 0}
    ).to_list(5000)
    
    paid_payments = [p for p in all_payments if p.get("status") == "PAID"]
    pending_payments = [p for p in all_payments if p.get("status") in ["PENDING", "ACTIVE"]]
    
    total_collected = sum(p.get("amount", 0) for p in paid_payments)
    paid_count = len(paid_payments)
    pending_count = len(pending_payments)
    
    onboarding_data = school.get("onboarding_data", {})
    total_students = onboarding_data.get("total_students", 0)
    total_expected = onboarding_data.get("total_amount", 0)
    
    # Grade-wise counts (paid only)
    grade_counts = {}
    for p in paid_payments:
        g = p.get("grade", "Unknown")
        grade_counts[g] = grade_counts.get(g, 0) + 1
    
    # Get unique grades and divisions for filters
    all_grades = list(set(p.get("grade", "") for p in paid_payments if p.get("grade")))
    all_divisions = list(set(p.get("division", "") for p in paid_payments if p.get("division")))
    
    # Student list (paid students only - with essential info for display)
    student_list = []
    for p in paid_payments:
        student_list.append({
            "name": p.get("student_name", ""),
            "phone": p.get("phone", "")[-4:] if p.get("phone") else "****",  # Only show last 4 digits for privacy
            "grade": p.get("grade", ""),
            "division": p.get("division", ""),
            "paid_at": p.get("verified_at") or p.get("created_at", "")
        })
    
    # Sort by paid date (most recent first)
    student_list.sort(key=lambda x: x.get("paid_at", ""), reverse=True)
    
    return {
        "school_name": school.get("school_name", ""),
        "total_collected": total_collected,
        "paid_count": paid_count,
        "pending_count": pending_count,
        "total_students": total_students,
        "total_expected": total_expected,
        "collection_percentage": round((paid_count / total_students * 100), 1) if total_students > 0 else 0,
        "grade_counts": grade_counts,
        "student_list": student_list,
        "available_grades": sorted(all_grades),
        "available_divisions": sorted(all_divisions)
    }

# ========================
# SCHOOL STUDENT PAYMENT ADMIN ENDPOINTS
# ========================

@api_router.patch("/school-payment/student/{payment_id}")
async def update_school_student_record(payment_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Admin: Edit a student's name, grade, division"""
    allowed_fields = ["student_name", "grade", "division"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.school_student_payments.update_one({"id": payment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return {"message": "Record updated successfully"}

@api_router.patch("/school-payment/status/{payment_id}")
async def update_school_payment_status(payment_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Admin: Change payment status (e.g., mark as REFUNDED)"""
    new_status = data.get("status")
    if new_status not in ["REFUNDED", "CANCELLED", "PENDING"]:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed: REFUNDED, CANCELLED, PENDING")
    update_data = {
        "status": new_status,
        "status_updated_at": datetime.now(timezone.utc).isoformat(),
        "status_updated_by": user.get("email", "admin")
    }
    result = await db.school_student_payments.update_one({"id": payment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return {"message": f"Status updated to {new_status}"}

@api_router.post("/school-payment/refund/{payment_id}")
async def initiate_cashfree_refund(payment_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Admin: Initiate a Cashfree refund for a PAID school student payment"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    payment = await db.school_student_payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.get("status") != "PAID":
        raise HTTPException(status_code=400, detail="Refunds can only be initiated for PAID payments")
    
    # Use the merchant order_id (the 'id' field we set when creating the order)
    order_id = payment.get("id")
    refund_amount = float(data.get("refund_amount", payment.get("amount", 0)))
    refund_note = data.get("refund_note", "Admin initiated refund")
    refund_id = f"REF_{payment_id[:20]}_{int(datetime.now(timezone.utc).timestamp())}"
    
    try:
        from cashfree_pg.models.order_create_refund_request import OrderCreateRefundRequest
        refund_request = OrderCreateRefundRequest(
            refund_amount=refund_amount,
            refund_id=refund_id,
            refund_note=refund_note,
            refund_speed="STANDARD"
        )
        api_response = get_cashfree_client().PGOrderCreateRefund(
            CASHFREE_API_VERSION,
            order_id,
            refund_request,
            None
        )
        refund_data = api_response.to_dict() if hasattr(api_response, 'to_dict') else {}
        
        # Update payment status in DB
        await db.school_student_payments.update_one(
            {"id": payment_id},
            {"$set": {
                "status": "REFUNDED",
                "refund_id": refund_id,
                "refund_amount": refund_amount,
                "refund_note": refund_note,
                "refunded_at": datetime.now(timezone.utc).isoformat(),
                "refunded_by": user.get("email", "admin")
            }}
        )
        return {"message": "Refund initiated successfully", "refund_id": refund_id, "data": refund_data}
    except Exception as e:
        logging.error(f"[REFUND] Cashfree refund failed for {payment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Refund failed: {str(e)}")

# ========================
# PAYMENT SYNC ENDPOINTS (Admin)
# ========================

@api_router.post("/payments/sync-single/{order_id}")
async def sync_single_payment_status(order_id: str, user: dict = Depends(get_current_user)):
    """Manually sync a single payment status from Cashfree"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Determine which collection to check
    payment = None
    collection_name = None
    
    # Check student_payments first
    payment = await db.student_payments.find_one({"id": order_id}, {"_id": 0})
    if payment:
        collection_name = "student_payments"
    else:
        # Check school_student_payments
        payment = await db.school_student_payments.find_one({"id": order_id}, {"_id": 0})
        if payment:
            collection_name = "school_student_payments"
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found in any collection")
    
    old_status = payment.get("status")
    
    try:
        logging.info(f"[SYNC] Syncing payment {order_id} from {collection_name}, current status: {old_status}")
        
        # Fetch from Cashfree
        api_response = get_cashfree_client().PGFetchOrder(
            CASHFREE_API_VERSION,
            order_id,
            None
        )
        
        if not api_response.data:
            return {
                "order_id": order_id,
                "collection": collection_name,
                "old_status": old_status,
                "new_status": old_status,
                "synced": False,
                "message": "No data returned from Cashfree"
            }
        
        cashfree_status = api_response.data.order_status
        logging.info(f"[SYNC] Cashfree returned status: {cashfree_status}")
        
        # Get payment details for transaction ID
        cf_payment_id = None
        payment_method = "Cashfree"
        try:
            payments_response = get_cashfree_client().PGOrderFetchPayments(
                CASHFREE_API_VERSION,
                order_id,
                None
            )
            if payments_response.data and len(payments_response.data) > 0:
                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
        except Exception as e:
            logging.warning(f"[SYNC] Could not fetch payment details: {e}")
        
        # Build update data
        update_data = {
            "status": cashfree_status,
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "sync_source": "manual"
        }
        
        if cf_payment_id:
            update_data["transaction_id"] = cf_payment_id
            update_data["cf_payment_id"] = cf_payment_id
            update_data["payment_method"] = payment_method
        
        if cashfree_status == "PAID" and old_status != "PAID":
            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update the payment record
        collection = db.student_payments if collection_name == "student_payments" else db.school_student_payments
        await collection.update_one({"id": order_id}, {"$set": update_data})
        
        # If student_payments and status changed to PAID, update student record
        if collection_name == "student_payments" and cashfree_status == "PAID" and old_status != "PAID":
            student_id = payment.get("student_id")
            batch_id = payment.get("batch_id")
            
            if student_id:
                student_update = {
                    "status": "converted",
                    "payment_status": "paid",
                    "payment_amount": payment.get("amount"),
                    "payment_date": datetime.now(timezone.utc).isoformat(),
                    "payment_method": payment_method,
                    "payment_transaction_id": cf_payment_id,
                    "pending_payment": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if batch_id:
                    student_update["batch_id"] = batch_id
                    student_update["batch_name"] = payment.get("batch_name")
                    
                    # Add to batch if not already
                    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
                    if batch and student_id not in batch.get("students", []):
                        await db.batches.update_one({"id": batch_id}, {"$addToSet": {"students": student_id}})
                
                await db.student_inquiries.update_one({"id": student_id}, {"$set": student_update})
                logging.info(f"[SYNC] Updated student {student_id} to converted")
        
        return {
            "order_id": order_id,
            "collection": collection_name,
            "old_status": old_status,
            "new_status": cashfree_status,
            "transaction_id": cf_payment_id,
            "synced": True,
            "status_changed": old_status != cashfree_status
        }
        
    except Exception as e:
        logging.error(f"[SYNC] Error syncing payment {order_id}: {str(e)}")
        return {
            "order_id": order_id,
            "collection": collection_name,
            "old_status": old_status,
            "synced": False,
            "error": str(e)
        }


@api_router.post("/payments/sync-all")
async def sync_all_pending_payments(
    payment_type: Optional[str] = Query(None, description="student, school, or all"),
    user: dict = Depends(get_current_user)
):
    """Sync all pending/non-PAID payments with Cashfree - checks every payment status"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    results = {
        "student_payments": {"checked": 0, "updated": 0, "errors": 0, "details": []},
        "school_payments": {"checked": 0, "updated": 0, "errors": 0, "details": []}
    }
    
    # Sync student payments
    if payment_type in [None, "all", "student"]:
        # Get all non-PAID student payments
        pending_payments = await db.student_payments.find(
            {"status": {"$nin": ["PAID", "CANCELLED", "EXPIRED"]}},
            {"_id": 0}
        ).to_list(1000)
        
        for payment in pending_payments:
            order_id = payment.get("id")
            old_status = payment.get("status")
            results["student_payments"]["checked"] += 1
            
            try:
                api_response = get_cashfree_client().PGFetchOrder(
                    CASHFREE_API_VERSION,
                    order_id,
                    None
                )
                
                if api_response.data:
                    new_status = api_response.data.order_status
                    
                    if new_status != old_status:
                        # Get transaction details
                        cf_payment_id = None
                        payment_method = "Cashfree"
                        try:
                            payments_response = get_cashfree_client().PGOrderFetchPayments(
                                CASHFREE_API_VERSION, order_id, None
                            )
                            if payments_response.data and len(payments_response.data) > 0:
                                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                        except Exception:
                            pass
                        
                        update_data = {
                            "status": new_status,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                            "sync_source": "bulk"
                        }
                        if cf_payment_id:
                            update_data["transaction_id"] = cf_payment_id
                            update_data["cf_payment_id"] = cf_payment_id
                            update_data["payment_method"] = payment_method
                        if new_status == "PAID":
                            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                        
                        await db.student_payments.update_one({"id": order_id}, {"$set": update_data})
                        
                        # Update student if PAID
                        if new_status == "PAID":
                            student_id = payment.get("student_id")
                            if student_id:
                                student_update = {
                                    "status": "converted",
                                    "payment_status": "paid",
                                    "payment_amount": payment.get("amount"),
                                    "payment_date": datetime.now(timezone.utc).isoformat(),
                                    "pending_payment": None,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }
                                if cf_payment_id:
                                    student_update["payment_transaction_id"] = cf_payment_id
                                    student_update["payment_method"] = payment_method
                                await db.student_inquiries.update_one({"id": student_id}, {"$set": student_update})
                        
                        results["student_payments"]["updated"] += 1
                        results["student_payments"]["details"].append({
                            "order_id": order_id,
                            "old_status": old_status,
                            "new_status": new_status,
                            "student_name": payment.get("student_name")
                        })
                        
            except Exception as e:
                results["student_payments"]["errors"] += 1
                logging.error(f"[BULK_SYNC] Error syncing student payment {order_id}: {e}")
    
    # Sync school student payments
    if payment_type in [None, "all", "school"]:
        pending_school_payments = await db.school_student_payments.find(
            {"status": {"$nin": ["PAID", "CANCELLED", "EXPIRED"]}},
            {"_id": 0}
        ).to_list(5000)
        
        for payment in pending_school_payments:
            order_id = payment.get("id")
            old_status = payment.get("status")
            results["school_payments"]["checked"] += 1
            
            try:
                api_response = get_cashfree_client().PGFetchOrder(
                    CASHFREE_API_VERSION,
                    order_id,
                    None
                )
                
                if api_response.data:
                    new_status = api_response.data.order_status
                    
                    if new_status != old_status:
                        cf_payment_id = None
                        payment_method = "Cashfree"
                        try:
                            payments_response = get_cashfree_client().PGOrderFetchPayments(
                                CASHFREE_API_VERSION, order_id, None
                            )
                            if payments_response.data and len(payments_response.data) > 0:
                                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                        except Exception:
                            pass
                        
                        update_data = {
                            "status": new_status,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                            "sync_source": "bulk"
                        }
                        if cf_payment_id:
                            update_data["transaction_id"] = cf_payment_id
                            update_data["cf_payment_id"] = cf_payment_id
                            update_data["payment_method"] = payment_method
                        if new_status == "PAID":
                            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                        
                        await db.school_student_payments.update_one({"id": order_id}, {"$set": update_data})
                        
                        results["school_payments"]["updated"] += 1
                        results["school_payments"]["details"].append({
                            "order_id": order_id,
                            "old_status": old_status,
                            "new_status": new_status,
                            "student_name": payment.get("student_name"),
                            "school_id": payment.get("school_id")
                        })
                        
            except Exception as e:
                results["school_payments"]["errors"] += 1
                logging.error(f"[BULK_SYNC] Error syncing school payment {order_id}: {e}")
    
    # Summary
    total_checked = results["student_payments"]["checked"] + results["school_payments"]["checked"]
    total_updated = results["student_payments"]["updated"] + results["school_payments"]["updated"]
    total_errors = results["student_payments"]["errors"] + results["school_payments"]["errors"]
    
    logging.info(f"[BULK_SYNC] Complete - Checked: {total_checked}, Updated: {total_updated}, Errors: {total_errors}")
    
    return {
        "summary": {
            "total_checked": total_checked,
            "total_updated": total_updated,
            "total_errors": total_errors
        },
        "results": results
    }


@api_router.get("/payments/status-report")
async def get_payment_status_report(user: dict = Depends(get_current_user)):
    """Get a report of all payments and their statuses for diagnostics"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Student payments stats
    student_payments = await db.student_payments.find({}, {"_id": 0, "id": 1, "status": 1, "student_name": 1, "amount": 1, "created_at": 1}).to_list(1000)
    student_by_status = {}
    for p in student_payments:
        status = p.get("status", "UNKNOWN")
        if status not in student_by_status:
            student_by_status[status] = []
        student_by_status[status].append({
            "order_id": p.get("id"),
            "student_name": p.get("student_name"),
            "amount": p.get("amount"),
            "created_at": p.get("created_at")
        })
    
    # School student payments stats
    school_payments = await db.school_student_payments.find({}, {"_id": 0, "id": 1, "status": 1, "student_name": 1, "school_id": 1, "amount": 1, "created_at": 1}).to_list(5000)
    school_by_status = {}
    for p in school_payments:
        status = p.get("status", "UNKNOWN")
        if status not in school_by_status:
            school_by_status[status] = []
        school_by_status[status].append({
            "order_id": p.get("id"),
            "student_name": p.get("student_name"),
            "school_id": p.get("school_id"),
            "amount": p.get("amount"),
            "created_at": p.get("created_at")
        })
    
    return {
        "student_payments": {
            "total": len(student_payments),
            "by_status": {status: len(payments) for status, payments in student_by_status.items()},
            "pending_list": student_by_status.get("PENDING", []) + student_by_status.get("ACTIVE", [])
        },
        "school_payments": {
            "total": len(school_payments),
            "by_status": {status: len(payments) for status, payments in school_by_status.items()},
            "pending_list": school_by_status.get("PENDING", []) + school_by_status.get("ACTIVE", [])
        }
    }


@api_router.get("/payments/scheduler-status")
async def get_scheduler_status(user: dict = Depends(get_current_user)):
    """Get the payment sync scheduler status"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    job = scheduler.get_job("payment_sync_job")
    
    return {
        "enabled": PAYMENT_SYNC_ENABLED,
        "running": scheduler.running,
        "interval_minutes": PAYMENT_SYNC_INTERVAL_MINUTES,
        "next_run": job.next_run_time.isoformat() if job and job.next_run_time else None,
        "cashfree_configured": bool(CASHFREE_APP_ID and CASHFREE_SECRET_KEY)
    }


@api_router.post("/payments/trigger-sync")
async def trigger_manual_sync(user: dict = Depends(get_current_user)):
    """Manually trigger a payment sync (runs immediately)"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Cashfree credentials not configured")
    
    # Run the sync immediately in the background
    asyncio.create_task(scheduled_payment_sync())
    
    return {"message": "Payment sync triggered", "status": "running"}


@api_router.get("/orders/school-student-payments")
async def get_all_school_student_payments(user: dict = Depends(get_current_user)):
    """Get aggregated school student payments (online) for Orders page - school-wise summary"""
    
    # Get all schools with online student payment mode
    schools = await db.school_inquiries.find({
        "status": {"$in": ["converted", "active", "renewed"]},
        "onboarding_data.payment_mode": "online",
        "onboarding_data.payment_method": "student"
    }, {"_id": 0}).to_list(1000)
    
    school_summaries = []
    
    for school in schools:
        school_id = school.get("id")
        school_name = school.get("school_name", "Unknown School")
        onboarding_data = school.get("onboarding_data", {})
        
        # Get all payments for this school
        payments = await db.school_student_payments.find(
            {"school_id": school_id}, 
            {"_id": 0}
        ).to_list(5000)
        
        paid_payments = [p for p in payments if p.get("status") == "PAID"]
        pending_payments = [p for p in payments if p.get("status") in ["PENDING", "ACTIVE"]]
        
        total_collected = sum(p.get("amount", 0) for p in paid_payments)
        paid_count = len(paid_payments)
        pending_count = len(pending_payments)
        
        total_students = onboarding_data.get("total_students", 0) or 0
        total_expected = onboarding_data.get("total_amount", 0) or 0
        
        # Grade-wise breakdown
        grade_stats = {}
        for p in payments:
            g = p.get("grade", "Unknown")
            if g not in grade_stats:
                grade_stats[g] = {"paid": 0, "pending": 0, "amount": 0}
            if p.get("status") == "PAID":
                grade_stats[g]["paid"] += 1
                grade_stats[g]["amount"] += p.get("amount", 0)
            else:
                grade_stats[g]["pending"] += 1
        
        # Get recent paid students (last 5)
        recent_payments = sorted(
            paid_payments, 
            key=lambda x: x.get("paid_at", x.get("created_at", "")), 
            reverse=True
        )[:5]
        
        school_summaries.append({
            "school_id": school_id,
            "school_name": school_name,
            "city": school.get("city", ""),
            "contact_name": school.get("contact_name", ""),
            "contact_phone": school.get("phone", ""),
            "skill": onboarding_data.get("offering", school.get("skill", "")),
            "total_collected": total_collected,
            "total_expected": total_expected,
            "paid_count": paid_count,
            "pending_count": pending_count,
            "total_students": total_students,
            "collection_percentage": round((total_collected / total_expected * 100), 1) if total_expected > 0 else 0,
            "grade_stats": grade_stats,
            "recent_payments": [
                {
                    "student_name": p.get("student_name", ""),
                    "grade": p.get("grade", ""),
                    "division": p.get("division", ""),
                    "amount": p.get("amount", 0),
                    "paid_at": p.get("paid_at", p.get("created_at", "")),
                    "transaction_id": p.get("transaction_id", "")
                } for p in recent_payments
            ],
            "payment_link": f"/school-pay/{school_id}",
            "tracker_link": f"/admin/school-payments/{school_id}",
            "public_tracker_link": f"/school-payment-tracker/{school_id}",
            "deadline_date": onboarding_data.get("deadline_date", ""),
            "status": school.get("status", "")
        })
    
    # Sort by collection amount (highest first)
    school_summaries.sort(key=lambda x: x["total_collected"], reverse=True)
    
    # Overall aggregates
    overall_stats = {
        "total_schools": len(school_summaries),
        "total_collected": sum(s["total_collected"] for s in school_summaries),
        "total_expected": sum(s["total_expected"] for s in school_summaries),
        "total_paid_students": sum(s["paid_count"] for s in school_summaries),
        "total_pending_students": sum(s["pending_count"] for s in school_summaries),
        "total_students": sum(s["total_students"] for s in school_summaries)
    }
    overall_stats["collection_percentage"] = round(
        (overall_stats["total_collected"] / overall_stats["total_expected"] * 100), 1
    ) if overall_stats["total_expected"] > 0 else 0
    
    return {
        "schools": school_summaries,
        "overall_stats": overall_stats
    }

@api_router.get("/orders/school-student-payments/{school_id}/export")
async def export_school_student_payments(school_id: str, user: dict = Depends(get_current_user)):
    """Export all payments for a specific school as JSON (for Excel export on frontend)"""
    
    # Get school info
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Get all payments for this school
    payments = await db.school_student_payments.find(
        {"school_id": school_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(5000)
    
    # Format for export
    export_data = []
    for p in payments:
        export_data.append({
            "Student Name": p.get("student_name", ""),
            "Phone": p.get("phone", ""),
            "Grade": p.get("grade", ""),
            "Division": p.get("division", ""),
            "Amount": p.get("amount", 0),
            "Status": p.get("status", ""),
            "Payment Date": p.get("paid_at", p.get("created_at", "")).split("T")[0] if p.get("paid_at") or p.get("created_at") else "",
            "Transaction ID": p.get("transaction_id", ""),
            "Order ID": p.get("id", "")
        })
    
    return {
        "school_name": school.get("school_name", ""),
        "export_data": export_data
    }

# ========================
# COMMENTS ENDPOINTS (Universal for all CRMs)
# ========================

@api_router.post("/{collection}/comment/{item_id}")
async def add_comment(collection: str, item_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a comment to any CRM item (students, schools, educators, growth_partners)"""
    collection_map = {
        "students": "student_inquiries",
        "schools": "school_inquiries",
        "educators": "educator_applications",
        "growth_partners": "growth_partners",
        "team_applications": "team_applications"
    }
    db_collection = collection_map.get(collection)
    if not db_collection:
        raise HTTPException(status_code=400, detail="Invalid collection")
    
    comment = {
        "id": str(uuid.uuid4()),
        "text": data.get("text", ""),
        "author": user.get("name", "Admin"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db[db_collection].update_one(
        {"id": item_id},
        {"$push": {"comments": comment}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Comment added", "comment": comment}

@api_router.get("/{collection}/comments/{item_id}")
async def get_comments(collection: str, item_id: str, user: dict = Depends(get_current_user)):
    """Get all comments for a CRM item"""
    collection_map = {
        "students": "student_inquiries",
        "schools": "school_inquiries",
        "educators": "educator_applications",
        "growth_partners": "growth_partners",
        "team_applications": "team_applications"
    }
    db_collection = collection_map.get(collection)
    if not db_collection:
        raise HTTPException(status_code=400, detail="Invalid collection")
    
    item = await db[db_collection].find_one({"id": item_id}, {"_id": 0, "comments": 1})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item.get("comments", [])

# ========================
# GROWTH PARTNER ENDPOINTS
# ========================

@api_router.post("/growth-partners", response_model=GrowthPartner)
async def create_growth_partner(data: GrowthPartnerCreate):
    partner = GrowthPartner(**data.model_dump())
    
    # Auto-assign to Growth Partner Manager (round-robin)
    if not data.assigned_to:
        assigned = await auto_assign_lead('growth_partner', data.city or '', 'online')
        if assigned and assigned.get('user_id'):
            partner.assigned_to = assigned['user_id']
    
    doc = partner.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.growth_partners.insert_one(doc)
    
    # Send new GP lead notification to GP Manager team
    try:
        gp_managers = await db.users.find(
            {"department": {"$in": ["growth_partner", "gp_manager", "sales"]}, "role": {"$in": ["admin", "team_member"]}},
            {"_id": 0, "phone": 1}
        ).to_list(10)
        gp_phones = [u.get("phone") for u in gp_managers if u.get("phone")]
        if gp_phones:
            await send_gp_newlead_notification(doc, gp_phones)
    except Exception as e:
        print(f"Failed to send GP new lead notification: {e}")
    
    return partner

@api_router.get("/growth-partners")
async def get_growth_partners(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    # For team members, only show leads they added or assigned to them
    if user.get("role") == "team_member":
        user_id = user.get("user_id", user.get("id", ""))
        query["$or"] = [
            {"added_by": user_id},
            {"assigned_to": user_id}
        ]
    
    partners = await db.growth_partners.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return partners

@api_router.patch("/growth-partners/{partner_id}")
async def update_growth_partner(
    partner_id: str, 
    data: GrowthPartnerUpdate,
    user: dict = Depends(get_current_user)
):
    # Get current partner data to check status change
    current_partner = await db.growth_partners.find_one({"id": partner_id}, {"_id": 0})
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Check if status is changing to 'active' - auto-create team user with GP role
    new_status = update_data.get('status')
    old_status = current_partner.get('status') if current_partner else None
    
    if new_status == 'active' and old_status != 'active' and current_partner:
        # Check if team user already exists for this GP
        existing_team_user = await db.team_users.find_one({
            "$or": [
                {"email": current_partner.get('email')},
                {"phone": current_partner.get('phone')}
            ]
        })
        
        if not existing_team_user:
            # Find the "GP Manager" role (as requested by user)
            gp_role = await db.roles.find_one({"name": "GP Manager"}, {"_id": 0})
            if not gp_role:
                # Create the GP Manager role if it doesn't exist
                gp_role = {
                    "id": str(uuid.uuid4()),
                    "name": "GP Manager",
                    "description": "Growth Partner Manager - Can manage schools and student leads",
                    "permissions": ["dashboard", "schools", "students", "growth_partners"],
                    "is_system": False,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.roles.insert_one(gp_role)
            gp_role_id = gp_role.get('id')
            
            # Create team user for this GP with GP Manager role
            team_user_id = str(uuid.uuid4())
            team_user_doc = {
                "id": team_user_id,
                "name": current_partner.get('name', ''),
                "email": current_partner.get('email', ''),
                "phone": current_partner.get('phone', ''),
                "role_id": gp_role_id,
                "role_name": "GP Manager",
                "is_active": True,
                "growth_partner_id": partner_id,  # Link back to GP
                "permissions": ['dashboard', 'schools', 'students', 'growth_partners'],  # GP Manager permissions
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.team_users.insert_one(team_user_doc)
            
            # Update GP with team_user_id reference
            update_data['team_user_id'] = team_user_id
    
    await db.growth_partners.update_one({"id": partner_id}, {"$set": update_data})
    partner = await db.growth_partners.find_one({"id": partner_id}, {"_id": 0})
    return partner

# ========================
# TEAM APPLICATION ENDPOINTS
# ========================

@api_router.post("/team-applications", response_model=TeamApplication)
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

@api_router.get("/team-applications")
async def get_team_applications(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    applications = await db.team_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return applications

@api_router.patch("/team-applications/{application_id}")
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
# TEAM ONBOARDING ENDPOINTS
# ========================

@api_router.post("/team-onboarding/init/{application_id}")
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

@api_router.get("/team-onboarding")
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

@api_router.get("/team-onboarding/track/{token}")
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

@api_router.get("/team-onboarding/{onboarding_id}")
async def get_team_onboarding(onboarding_id: str, user: dict = Depends(get_current_user)):
    """Get a specific team onboarding record"""
    onboarding = await db.team_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    return onboarding

@api_router.patch("/team-onboarding/{onboarding_id}")
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

@api_router.post("/team-onboarding/{onboarding_id}/complete-step")
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

@api_router.post("/team-onboarding/{onboarding_id}/activate")
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

@api_router.post("/team-onboarding/{onboarding_id}/discontinue")
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

@api_router.post("/gp-onboarding/init/{partner_id}")
async def init_gp_onboarding(
    partner_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Initialize onboarding for a converted growth partner"""
    partner = await db.growth_partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Growth Partner not found")
    
    # Check if onboarding already exists
    existing = await db.gp_onboarding.find_one({"growth_partner_id": partner_id}, {"_id": 0})
    if existing:
        # Update GP status to onboarding (in case it was reverted)
        await db.growth_partners.update_one(
            {"id": partner_id},
            {"$set": {"status": "onboarding", "onboarding_id": existing.get('id')}}
        )
        # Also update onboarding status if it was discontinued
        if existing.get('status') == 'discontinued':
            new_token = str(uuid.uuid4())[:8]
            await db.gp_onboarding.update_one(
                {"id": existing.get('id')},
                {"$set": {"status": "onboarding", "tracking_token": new_token, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            existing['status'] = 'onboarding'
            existing['tracking_token'] = new_token
        return existing
    
    onboarding = GPOnboarding(
        growth_partner_id=partner_id,
        name=partner.get('name', ''),
        email=partner.get('email', ''),
        phone=partner.get('phone', ''),
        city=partner.get('city', ''),
        interest_type=partner.get('interest_type', ''),
    )
    
    doc = onboarding.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.gp_onboarding.insert_one(doc)
    
    # Update GP status to onboarding
    await db.growth_partners.update_one(
        {"id": partner_id},
        {"$set": {"status": "onboarding", "onboarding_id": onboarding.id}}
    )
    
    return {**doc, "_id": None}

@api_router.get("/gp-onboarding/track/{token}")
async def get_gp_onboarding_public(token: str):
    """Public endpoint to track GP onboarding progress by token"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    return {
        "name": onboarding.get("name"),
        "email": onboarding.get("email"),
        "phone": onboarding.get("phone"),
        "city": onboarding.get("city"),
        "interest_type": onboarding.get("interest_type"),
        "status": onboarding.get("status"),
        "steps": onboarding.get("steps"),
        "created_at": onboarding.get("created_at"),
    }

@api_router.get("/gp-onboarding")
async def get_gp_onboardings(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all GP onboarding records"""
    query = {}
    if status:
        query["status"] = status
    
    onboardings = await db.gp_onboarding.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return onboardings

@api_router.get("/gp-onboarding/{onboarding_id}")
async def get_gp_onboarding(onboarding_id: str, user: dict = Depends(get_current_user)):
    """Get a specific GP onboarding record"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    return onboarding

@api_router.post("/gp-onboarding/{onboarding_id}/complete-step")
async def complete_gp_onboarding_step(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Mark a GP onboarding step as complete"""
    step_name = data.get('step')
    step_data = data.get('data', {})
    
    if step_name not in ["personal_info", "contract_signing", "training"]:
        raise HTTPException(status_code=400, detail="Invalid step name")
    
    update_data = {
        f"steps.{step_name}.completed": True,
        f"steps.{step_name}.completed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store step-specific data
    if step_name == "personal_info" and step_data:
        update_data["personal_info"] = step_data
        if step_data.get('bank_details'):
            update_data["bank_details"] = step_data['bank_details']
    elif step_name == "contract_signing":
        if step_data.get('contract_url'):
            update_data["contract_url"] = step_data['contract_url']
        if step_data.get('commission_structure'):
            update_data["commission_structure"] = step_data['commission_structure']
        update_data["contract_signed_at"] = datetime.now(timezone.utc).isoformat()
    elif step_name == "training":
        update_data["training_completed_at"] = datetime.now(timezone.utc).isoformat()
        if step_data.get('notes'):
            update_data["training_notes"] = step_data['notes']
    
    await db.gp_onboarding.update_one({"id": onboarding_id}, {"$set": update_data})
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    return onboarding

@api_router.post("/gp-onboarding/{onboarding_id}/verify-payment")
async def verify_gp_payment(
    onboarding_id: str,
    user: dict = Depends(get_current_user)
):
    """Verify GP payment - admin action"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    # Update payment step to verified
    now = datetime.now(timezone.utc).isoformat()
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "steps.payment.verified": True,
            "steps.payment.verified_at": now,
            "steps.payment.verified_by": user.get('id') or user.get('email'),
            "payment_status": "verified",
            "updated_at": now
        }}
    )
    
    updated = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    return {"message": "Payment verified successfully", "onboarding": updated}

@api_router.post("/gp-onboarding/{onboarding_id}/kit-delivery")
async def update_kit_delivery(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update kit delivery status - admin action"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    now = datetime.now(timezone.utc).isoformat()
    status = data.get('status', 'pending')
    
    update_data = {
        "kit_delivery_status": status,
        "kit_tracking_number": data.get('tracking_number', ''),
        "kit_courier_name": data.get('courier_name', ''),
        "kit_dispatch_date": data.get('dispatch_date', ''),
        "kit_expected_delivery_date": data.get('expected_delivery_date', ''),
        "updated_at": now
    }
    
    # If dispatched, mark step as in progress
    if status == 'dispatched':
        update_data["kit_dispatched_at"] = now
        update_data["kit_dispatched_by"] = user.get('id') or user.get('email')
    
    # If delivered, mark step as completed and auto-move to training
    if status == 'delivered':
        update_data["kit_delivered_at"] = now
        update_data["kit_delivery_date"] = now[:10]  # Just the date part
        update_data["steps.kit_delivery.completed"] = True
        update_data["steps.kit_delivery.completed_at"] = now
        update_data["steps.kit_delivery.data"] = {
            "delivered_at": now,
            "tracking_number": data.get('tracking_number', ''),
            "courier_name": data.get('courier_name', '')
        }
    
    await db.gp_onboarding.update_one({"id": onboarding_id}, {"$set": update_data})
    
    updated = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    return {"message": f"Kit delivery updated to {status}", "onboarding": updated}

@api_router.post("/gp-onboarding/{onboarding_id}/activate")
async def activate_gp(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Activate GP - creates a new team user with GP Manager role"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    # Check if all steps are complete
    steps = onboarding.get('steps', {})
    incomplete = [s for s, v in steps.items() if not v.get('completed')]
    if incomplete:
        raise HTTPException(status_code=400, detail=f"Complete all steps first: {', '.join(incomplete)}")
    
    # Find or create GP Manager role
    gp_role = await db.roles.find_one({"name": "GP Manager"}, {"_id": 0})
    if not gp_role:
        # Create the role
        gp_role = {
            "id": str(uuid.uuid4()),
            "name": "GP Manager",
            "description": "Growth Partner Manager - Can manage schools and student leads",
            "permissions": ["dashboard", "students", "schools", "growth_partners"],
            "is_system": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.roles.insert_one(gp_role)
    
    role_id = data.get('role_id') or gp_role['id']
    
    # Create team user
    username = onboarding.get('email', '').split('@')[0] or onboarding.get('name', '').lower().replace(' ', '_')
    existing = await db.team_users.find_one({"username": username})
    if existing:
        username = f"gp_{username}_{str(uuid.uuid4())[:4]}"
    
    temp_password = str(uuid.uuid4())[:8]
    
    team_user = TeamUser(
        email=onboarding.get('email', f"{username}@oll.co"),
        name=onboarding.get('name', ''),
        username=username,
        password_hash=bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        role_id=role_id,
        city=onboarding.get('city', ''),
        permissions=["dashboard", "students", "schools", "growth_partners"]  # GP Manager permissions
    )
    
    doc = team_user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['is_growth_partner'] = True  # Mark as GP user
    doc['gp_onboarding_id'] = onboarding_id
    await db.team_users.insert_one(doc)
    
    # Update onboarding status
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "status": "active",
            "team_user_id": team_user.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update growth partner status
    await db.growth_partners.update_one(
        {"id": onboarding.get('growth_partner_id')},
        {"$set": {"status": "converted", "team_user_id": team_user.id}}
    )
    
    return {
        "message": "Growth Partner activated",
        "team_user_id": team_user.id,
        "username": username,
        "email": team_user.email,
        "temp_password": temp_password
    }

@api_router.post("/gp-onboarding/{onboarding_id}/discontinue")
async def discontinue_gp(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Discontinue a Growth Partner"""
    reason = data.get('reason', '')
    
    if not reason:
        raise HTTPException(status_code=400, detail="Reason required")
    
    # Deactivate the team user if exists
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if onboarding and onboarding.get('team_user_id'):
        await db.team_users.update_one(
            {"id": onboarding['team_user_id']},
            {"$set": {"is_active": False}}
        )
    
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "status": "discontinued",
            "discontinued_reason": reason,
            "discontinued_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update growth partner status
    if onboarding:
        await db.growth_partners.update_one(
            {"id": onboarding.get('growth_partner_id')},
            {"$set": {"status": "archived"}}
        )
    
    return {"message": "Growth Partner discontinued"}

# PUBLIC GP ONBOARDING SUBMISSION ENDPOINTS (No auth required - use tracking token)

@api_router.get("/gp-onboard/{token}")
async def get_gp_onboarding_full(token: str):
    """Public endpoint to get full GP onboarding data for filling form"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    # Return all data needed for the onboarding form
    return onboarding

@api_router.post("/gp-onboard/{token}/personal-info")
async def submit_gp_personal_info(token: str, data: dict):
    """Public endpoint for GP to submit personal information"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    # Update personal info
    personal_info = {
        "full_name": data.get("full_name", ""),
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "aadhar_number": data.get("aadhar_number", ""),
        "aadhar_url": data.get("aadhar_url", ""),
        "pan_number": data.get("pan_number", ""),
        "pan_url": data.get("pan_url", ""),
        "address": data.get("address", ""),
        "city": data.get("city", ""),
        "state": data.get("state", ""),
        "pincode": data.get("pincode", ""),
        "tshirt_size": data.get("tshirt_size", "")
    }
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "personal_info": personal_info,
            "name": data.get("full_name", onboarding.get("name", "")),
            "email": data.get("email", onboarding.get("email", "")),
            "phone": data.get("phone", onboarding.get("phone", "")),
            "city": data.get("city", onboarding.get("city", "")),
            "steps.personal_info.completed": True,
            "steps.personal_info.completed_at": now,
            "steps.personal_info.data": personal_info,
            "updated_at": now
        }}
    )
    
    return {"message": "Personal information saved", "next_step": "bank_details"}

@api_router.post("/gp-onboard/{token}/bank-details")
async def submit_gp_bank_details(token: str, data: dict):
    """Public endpoint for GP to submit bank details"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    bank_details = {
        "account_holder_name": data.get("account_holder_name", ""),
        "bank_name": data.get("bank_name", ""),
        "account_number": data.get("account_number", ""),
        "ifsc_code": data.get("ifsc_code", ""),
        "branch": data.get("branch", ""),
        "upi_id": data.get("upi_id", ""),
        "cancelled_cheque_url": data.get("cancelled_cheque_url", "")
    }
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "bank_details": bank_details,
            "steps.bank_details.completed": True,
            "steps.bank_details.completed_at": now,
            "steps.bank_details.data": bank_details,
            "updated_at": now
        }}
    )
    
    return {"message": "Bank details saved", "next_step": "contract_signing"}

@api_router.post("/gp-onboard/{token}/contract")
async def submit_gp_contract(token: str, data: dict):
    """Public endpoint for GP to submit signed contract"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    now = datetime.now(timezone.utc).isoformat()
    signed_contract_url = data.get("signed_contract_url", "")
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "contract_signed_at": now,
            "signed_contract_url": signed_contract_url,
            "contract_url": signed_contract_url,  # Also save to contract_url for admin view
            "steps.contract_signing.completed": True,
            "steps.contract_signing.completed_at": now,
            "steps.contract_signing.data": {
                "signed_at": now,
                "signed_contract_url": signed_contract_url,
                "agreed_terms": True
            },
            "updated_at": now
        }}
    )
    
    return {"message": "Contract submitted", "next_step": "payment"}

@api_router.post("/gp-onboard/{token}/payment")
async def submit_gp_payment(token: str, data: dict):
    """Public endpoint for GP to submit payment proof"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    now = datetime.now(timezone.utc).isoformat()
    
    payment_data = {
        "amount": data.get("amount", 0),
        "transaction_id": data.get("transaction_id", ""),
        "screenshot_url": data.get("screenshot_url", ""),
        "payment_date": data.get("payment_date", now[:10]),
        "payment_method": data.get("payment_method", "")
    }
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "payment_amount": data.get("amount", 0),
            "payment_status": "pending_verification",
            "payment_screenshot_url": data.get("screenshot_url", ""),
            "payment_transaction_id": data.get("transaction_id", ""),
            "payment_date": data.get("payment_date", now[:10]),
            "steps.payment.completed": True,
            "steps.payment.completed_at": now,
            "steps.payment.data": payment_data,
            "steps.payment.verified": False,
            "updated_at": now
        }}
    )
    
    return {"message": "Payment proof submitted. Awaiting admin verification.", "next_step": "kit_delivery"}

@api_router.post("/gp-onboard/{token}/training/{step}")
async def submit_gp_training_step(token: str, step: str, data: dict):
    """Public endpoint for GP to submit training step progress"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    valid_steps = ["about_company", "about_skill", "implementation_models", "product_training", 
                   "target_audiences", "pricing_training", "software_training"]
    if step not in valid_steps:
        raise HTTPException(status_code=400, detail=f"Invalid training step. Valid steps: {valid_steps}")
    
    now = datetime.now(timezone.utc).isoformat()
    training_progress = onboarding.get("training_progress", {})
    step_data = training_progress.get(step, {})
    
    # Update videos watched
    if "video_id" in data:
        videos_watched = step_data.get("videos_watched", [])
        if data["video_id"] not in videos_watched:
            videos_watched.append(data["video_id"])
        step_data["videos_watched"] = videos_watched
    
    # Update assessment
    if "assessment" in data:
        step_data["assessment"] = {
            **step_data.get("assessment", {}),
            **data["assessment"],
            "submitted": True,
            "submitted_at": now
        }
    
    # Mark step as completed if all required items are done
    if data.get("mark_complete", False):
        step_data["completed"] = True
        step_data["completed_at"] = now
    
    training_progress[step] = step_data
    
    # Check if all training steps are complete
    all_training_complete = all(
        training_progress.get(s, {}).get("completed", False) 
        for s in valid_steps
    )
    
    update_data = {
        f"training_progress.{step}": step_data,
        "updated_at": now
    }
    
    if all_training_complete:
        update_data["steps.training.completed"] = True
        update_data["steps.training.completed_at"] = now
        update_data["training_completed_at"] = now
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": update_data}
    )
    
    next_steps = {
        "about_company": "about_skill",
        "about_skill": "implementation_models",
        "implementation_models": "product_training",
        "product_training": "target_audiences",
        "target_audiences": "pricing_training",
        "pricing_training": "software_training",
        "software_training": "complete"
    }
    
    return {
        "message": f"Training step '{step}' updated",
        "next_step": next_steps.get(step, "complete"),
        "all_training_complete": all_training_complete
    }

# Admin endpoints for GP onboarding verification
@api_router.post("/gp-onboarding/{onboarding_id}/verify-payment")
async def verify_gp_payment(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint to verify GP payment"""
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "payment_status": "verified",
            "steps.payment.verified": True,
            "steps.payment.verified_by": user.get("id"),
            "steps.payment.verified_at": now,
            "updated_at": now
        }}
    )
    
    return {"message": "Payment verified"}

@api_router.post("/gp-onboarding/{onboarding_id}/ship-kit")
async def ship_gp_kit(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint to mark kit as shipped"""
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "kit_delivery_status": "shipped",
            "kit_tracking_number": data.get("tracking_number", ""),
            "steps.kit_delivery.tracking_number": data.get("tracking_number", ""),
            "updated_at": now
        }}
    )
    
    return {"message": "Kit marked as shipped"}

@api_router.post("/gp-onboard/{token}/confirm-kit")
async def confirm_gp_kit_delivery(token: str, data: dict):
    """Public endpoint for GP to confirm kit received"""
    onboarding = await db.gp_onboarding.find_one({"tracking_token": token}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"tracking_token": token},
        {"$set": {
            "kit_delivery_status": "delivered",
            "kit_delivery_date": now[:10],
            "kit_received_confirmation": True,
            "steps.kit_delivery.completed": True,
            "steps.kit_delivery.completed_at": now,
            "steps.kit_delivery.delivered": True,
            "steps.kit_delivery.delivered_at": now,
            "updated_at": now
        }}
    )
    
    return {"message": "Kit delivery confirmed", "next_step": "training"}

@api_router.post("/gp-onboarding/{onboarding_id}/review-assessment")
async def review_gp_assessment(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint to review GP training assessment"""
    training_step = data.get("training_step")
    passed = data.get("passed", False)
    review_notes = data.get("review_notes", "")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            f"training_progress.{training_step}.assessment.reviewed": True,
            f"training_progress.{training_step}.assessment.review_notes": review_notes,
            f"training_progress.{training_step}.assessment.passed": passed,
            f"training_progress.{training_step}.assessment.reviewed_by": user.get("id"),
            f"training_progress.{training_step}.assessment.reviewed_at": now,
            "updated_at": now
        }}
    )
    
    return {"message": f"Assessment for {training_step} reviewed", "passed": passed}

@api_router.post("/gp-onboarding/{onboarding_id}/complete-onboarding")
async def complete_gp_onboarding(
    onboarding_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Admin endpoint to complete GP onboarding and create credentials"""
    onboarding = await db.gp_onboarding.find_one({"id": onboarding_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    # Verify all steps are complete
    steps = onboarding.get("steps", {})
    incomplete_steps = []
    for step_key, step_val in steps.items():
        if not step_val.get("completed"):
            incomplete_steps.append(step_key)
    
    if incomplete_steps:
        raise HTTPException(status_code=400, detail=f"Incomplete steps: {', '.join(incomplete_steps)}")
    
    # Find or create GP Manager role
    gp_role = await db.roles.find_one({"name": "GP Manager"}, {"_id": 0})
    if not gp_role:
        gp_role = {
            "id": str(uuid.uuid4()),
            "name": "GP Manager",
            "description": "Growth Partner Manager - Can manage schools and student leads",
            "permissions": ["dashboard", "students", "schools", "growth_partners"],
            "is_system": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.roles.insert_one(gp_role)
    role_id = gp_role.get("id")
    
    # Generate credentials
    email = onboarding.get("email") or onboarding.get("personal_info", {}).get("email", "")
    name = onboarding.get("name") or onboarding.get("personal_info", {}).get("full_name", "")
    phone = onboarding.get("phone") or onboarding.get("personal_info", {}).get("phone", "")
    
    username = email.split("@")[0] if email else name.lower().replace(" ", "_")
    # Ensure unique username
    existing = await db.team_users.find_one({"username": username})
    if existing:
        username = f"gp_{username}_{str(uuid.uuid4())[:4]}"
    
    temp_password = str(uuid.uuid4())[:8]
    
    # Create team user
    team_user_id = str(uuid.uuid4())
    team_user_doc = {
        "id": team_user_id,
        "name": name,
        "email": email,
        "phone": phone,
        "username": username,
        "password_hash": bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "role_id": role_id,
        "role_name": "GP Manager",
        "is_active": True,
        "is_growth_partner": True,
        "gp_onboarding_id": onboarding_id,
        "permissions": ["dashboard", "schools", "students", "growth_partners"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.team_users.insert_one(team_user_doc)
    
    now = datetime.now(timezone.utc).isoformat()
    credentials = {
        "username": username,
        "email": email,
        "temp_password": temp_password,
        "login_url": "/admin/login",
        "created_at": now
    }
    
    # Update onboarding record
    await db.gp_onboarding.update_one(
        {"id": onboarding_id},
        {"$set": {
            "status": "active",
            "team_user_id": team_user_id,
            "team_user_credentials": credentials,
            "lms_access_granted": True,
            "updated_at": now
        }}
    )
    
    # Update growth partner status
    await db.growth_partners.update_one(
        {"id": onboarding.get("growth_partner_id")},
        {"$set": {"status": "active", "team_user_id": team_user_id}}
    )
    
    return {
        "message": "GP onboarding completed",
        "credentials": credentials,
        "team_user_id": team_user_id
    }

# ========================
# EXPENSE ENDPOINTS
# ========================

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

@api_router.get("/expenses/categories")
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

@api_router.post("/expenses")
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

@api_router.get("/expenses")
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

@api_router.get("/expenses/{expense_id}")
async def get_expense(expense_id: str, user: dict = Depends(get_current_user)):
    """Get a single expense"""
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@api_router.patch("/expenses/{expense_id}")
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

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(get_current_user)):
    """Delete an expense"""
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

# ========================
# SCHOOL INQUIRY ENDPOINTS
# ========================

@api_router.post("/schools/inquiry", response_model=SchoolInquiry)
async def create_school_inquiry(data: SchoolInquiryCreate):
    inquiry = SchoolInquiry(**data.model_dump())
    
    # Handle assignment based on assign_option
    assign_option = getattr(data, 'assign_option', None) or 'admin'
    added_by = getattr(data, 'added_by', None)
    added_by_name = getattr(data, 'added_by_name', None)
    
    if assign_option == 'self' and added_by:
        # Assign to the user who created it
        inquiry.assigned_to = added_by
        inquiry.assigned_to_name = added_by_name or ''
    elif not data.assigned_to:
        # Auto-assign to B2B Sales team user (round-robin, prefer same city)
        assigned = await auto_assign_lead('school', data.location or '', 'offline')
        if assigned and assigned.get('user_id'):
            inquiry.assigned_to = assigned['user_id']
            inquiry.assigned_to_name = assigned.get('user_name', '')
    
    # Store added_by info
    if added_by:
        inquiry_dict = inquiry.model_dump()
        inquiry_dict['added_by'] = added_by
        inquiry_dict['added_by_name'] = added_by_name
    else:
        inquiry_dict = inquiry.model_dump()
    
    inquiry_dict['created_at'] = inquiry_dict['created_at'].isoformat()
    inquiry_dict['updated_at'] = inquiry_dict['updated_at'].isoformat()

    # Auto-schedule 4 followup tasks (every 4 weekdays)
    today = datetime.now(timezone.utc).date()
    followup_dates = get_followup_weekday_dates(today, count=4, interval=4)
    followup_tasks = [
        {
            "id": str(uuid.uuid4()),
            "number": i + 1,
            "scheduled_date": followup_dates[i].isoformat(),
            "email_type": f"followup_{i + 1}",
            "status": "pending",
            "sent_at": None,
            "sent_by": None
        }
        for i in range(4)
    ]
    inquiry_dict['followup_tasks'] = followup_tasks
    inquiry.followup_tasks = followup_tasks

    await db.school_inquiries.insert_one(inquiry_dict)
    return inquiry

@api_router.get("/schools/inquiries")
async def get_school_inquiries(
    status: Optional[str] = None,
    view_all: bool = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        # Handle comma-separated status values
        if "," in status:
            query["status"] = {"$in": status.split(",")}
        else:
            query["status"] = status
    
    user_role = user.get("role", "")
    user_id = user.get("user_id", user.get("id", ""))
    
    # Check if user is admin - admins see all leads
    is_admin = user_role == "admin" or user.get("email") == "admin@oll.co"
    
    # Non-admin users only see leads assigned to them
    # Unless view_all is explicitly True (for managers with special permission)
    if not is_admin and not view_all:
        # Show leads where user is assigned OR added by them
        query["$or"] = [
            {"assigned_to": user_id},
            {"added_by": user_id},
            {"relationship_manager_id": user_id}
        ]
    
    inquiries = await db.school_inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Add ownership flag for display purposes
    for inq in inquiries:
        if isinstance(inq.get('created_at'), str):
            inq['created_at'] = datetime.fromisoformat(inq['created_at'])
        if isinstance(inq.get('updated_at'), str):
            inq['updated_at'] = datetime.fromisoformat(inq['updated_at'])
        
        # Add flags to indicate ownership
        inq['is_owner'] = inq.get('assigned_to') == user_id or inq.get('added_by') == user_id
        inq['is_viewer'] = not inq['is_owner']
    
    return inquiries

@api_router.delete("/schools/inquiry/{inquiry_id}")
async def delete_school_inquiry(inquiry_id: str, user: dict = Depends(get_current_user)):
    """Delete a school inquiry/lead"""
    # Check if user has permission (admin or owner)
    inquiry = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    user_id = user.get("user_id", user.get("id", ""))
    is_admin = user.get("role") in ["admin", "super_admin"]
    is_owner = inquiry.get("assigned_to") == user_id or inquiry.get("added_by") == user_id
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this lead")
    
    await db.school_inquiries.delete_one({"id": inquiry_id})
    return {"message": "Lead deleted successfully"}

@api_router.delete("/schools/inquiry/{inquiry_id}/contacts/{contact_index}")
async def delete_school_contact(inquiry_id: str, contact_index: int, user: dict = Depends(get_current_user)):
    """Delete a contact from a school inquiry"""
    inquiry = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="School not found")
    
    school_contacts = inquiry.get("school_contacts", [])
    if contact_index < 0 or contact_index >= len(school_contacts):
        raise HTTPException(status_code=404, detail="Contact not found")
    
    school_contacts.pop(contact_index)
    await db.school_inquiries.update_one(
        {"id": inquiry_id}, 
        {"$set": {"school_contacts": school_contacts, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Contact deleted successfully"}

@api_router.delete("/educator-applications/{application_id}")
async def delete_educator_application(application_id: str, user: dict = Depends(get_current_user)):
    """Delete an educator application"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete applications")
    
    result = await db.educator_applications.delete_one({"id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted successfully"}

@api_router.delete("/team-applications/{application_id}")
async def delete_team_application(application_id: str, user: dict = Depends(get_current_user)):
    """Delete a team application"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete applications")
    
    result = await db.team_applications.delete_one({"id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted successfully"}

@api_router.delete("/growth-partner-applications/{application_id}")
async def delete_growth_partner_application(application_id: str, user: dict = Depends(get_current_user)):
    """Delete a growth partner application"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete applications")
    
    result = await db.growth_partner_applications.delete_one({"id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted successfully"}

@api_router.patch("/schools/inquiry/{inquiry_id}", response_model=SchoolInquiry)
async def update_school_inquiry(
    inquiry_id: str, 
    data: SchoolInquiryUpdate,
    user: dict = Depends(get_current_user)
):
    # Get current inquiry to track changes
    current_inquiry = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not current_inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Track status changes and other important updates in activity_log
    activity_entries = []
    
    # Status change
    if 'status' in update_data and update_data['status'] != current_inquiry.get('status'):
        activity_entries.append({
            "type": "status_change",
            "timestamp": update_data['updated_at'],
            "old_status": current_inquiry.get('status'),
            "new_status": update_data['status'],
            "description": f"Status changed from {current_inquiry.get('status', 'new')} to {update_data['status']}",
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Meeting scheduled
    if 'meeting_date' in update_data and update_data.get('meeting_date') != current_inquiry.get('meeting_date'):
        activity_entries.append({
            "type": "meeting_scheduled",
            "timestamp": update_data['updated_at'],
            "description": f"Meeting scheduled for {update_data.get('meeting_date')} at {update_data.get('meeting_time', 'TBD')}",
            "details": {
                "meeting_date": update_data.get('meeting_date'),
                "meeting_time": update_data.get('meeting_time'),
                "meeting_mode": update_data.get('meeting_mode')
            },
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Renewal meeting scheduled
    if 'renewal_meeting_date' in update_data and update_data.get('renewal_meeting_date') != current_inquiry.get('renewal_meeting_date'):
        activity_entries.append({
            "type": "renewal_meeting_scheduled",
            "timestamp": update_data['updated_at'],
            "description": f"Renewal meeting scheduled for {update_data.get('renewal_meeting_date')} at {update_data.get('renewal_meeting_time', 'TBD')}",
            "details": {
                "meeting_date": update_data.get('renewal_meeting_date'),
                "meeting_time": update_data.get('renewal_meeting_time'),
                "meeting_type": update_data.get('renewal_meeting_type')
            },
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Followup scheduled
    if 'followup_date' in update_data and update_data.get('followup_date') != current_inquiry.get('followup_date'):
        activity_entries.append({
            "type": "followup_scheduled",
            "timestamp": update_data['updated_at'],
            "description": f"Followup ({update_data.get('followup_type', 'general')}) scheduled for {update_data.get('followup_date')}",
            "details": {
                "followup_date": update_data.get('followup_date'),
                "followup_type": update_data.get('followup_type'),
                "followup_comment": update_data.get('followup_comment')
            },
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Notes added/updated
    if 'notes' in update_data and update_data.get('notes') != current_inquiry.get('notes'):
        activity_entries.append({
            "type": "notes_updated",
            "timestamp": update_data['updated_at'],
            "description": f"Notes updated: {(update_data.get('notes') or '')[:50]}...",
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Assignment changed
    if 'assigned_to' in update_data and update_data.get('assigned_to') != current_inquiry.get('assigned_to'):
        activity_entries.append({
            "type": "assigned",
            "timestamp": update_data['updated_at'],
            "description": f"Assigned to {update_data.get('assigned_to_name', update_data.get('assigned_to', 'team member'))}",
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Add activity entries to the log
    if activity_entries:
        await db.school_inquiries.update_one(
            {"id": inquiry_id},
            {"$push": {"activity_log": {"$each": activity_entries}}}
        )
    
    await db.school_inquiries.update_one({"id": inquiry_id}, {"$set": update_data})
    
    # Auto-sync GP Share and School Share expenses whenever onboarding_data changes
    onboarding_data = update_data.get('onboarding_data', {})
    if not onboarding_data:
        # Also check if share fields are passed directly at top level (legacy support)
        share_keys = ['gp_share_amount', 'school_share_amount', 'gp_share_type', 'school_share_type']
        if any(k in update_data for k in share_keys):
            onboarding_data = {**current_inquiry.get('onboarding_data', {}), **{k: update_data[k] for k in share_keys if k in update_data}}
    if onboarding_data:
        school_name = current_inquiry.get('school_name', '')
        
        # Check for GP Share expense - create or update (any existing expense for this school/category)
        gp_share_amount = onboarding_data.get('gp_share_amount', 0)
        if gp_share_amount and float(gp_share_amount) > 0:
            existing_gp = await db.school_expenses.find_one({
                "school_id": inquiry_id,
                "category": "gp_share"
            })
            if not existing_gp:
                gp_expense = {
                    "id": str(uuid.uuid4()),
                    "school_id": inquiry_id,
                    "school_name": school_name,
                    "category": "gp_share",
                    "category_name": "GP Share",
                    "amount": float(gp_share_amount),
                    "description": f"Growth Partner share ({onboarding_data.get('gp_share_type', 'amount')} - {onboarding_data.get('gp_share_calc', 'lumpsum')})",
                    "expense_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "payment_status": "pending",
                    "gp_share_type": onboarding_data.get("gp_share_type"),
                    "gp_share_calc": onboarding_data.get("gp_share_calc"),
                    "gp_share_value": onboarding_data.get("gp_share_value"),
                    "created_by": user.get("id"),
                    "created_by_name": user.get("name", user.get("email", "Admin")),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "auto_created": True,
                    "source": "edit"
                }
                await db.school_expenses.insert_one(gp_expense)
            else:
                # Update existing GP share expense amount
                await db.school_expenses.update_one(
                    {"id": existing_gp["id"]},
                    {"$set": {
                        "amount": float(gp_share_amount),
                        "description": f"Growth Partner share ({onboarding_data.get('gp_share_type', 'amount')} - {onboarding_data.get('gp_share_calc', 'lumpsum')})",
                        "gp_share_type": onboarding_data.get("gp_share_type"),
                        "gp_share_calc": onboarding_data.get("gp_share_calc"),
                        "gp_share_value": onboarding_data.get("gp_share_value"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        # Check for School Share expense - create or update (any existing expense for this school/category)
        school_share_amount = onboarding_data.get('school_share_amount', 0)
        if school_share_amount and float(school_share_amount) > 0:
            existing_school_share = await db.school_expenses.find_one({
                "school_id": inquiry_id,
                "category": "school_share"
            })
            if not existing_school_share:
                school_share_expense = {
                    "id": str(uuid.uuid4()),
                    "school_id": inquiry_id,
                    "school_name": school_name,
                    "category": "school_share",
                    "category_name": "School Share",
                    "amount": float(school_share_amount),
                    "description": f"School revenue share ({onboarding_data.get('school_share_type', 'amount')} - {onboarding_data.get('school_share_calc', 'lumpsum')})",
                    "expense_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "payment_status": "pending",
                    "school_share_type": onboarding_data.get("school_share_type"),
                    "school_share_calc": onboarding_data.get("school_share_calc"),
                    "school_share_value": onboarding_data.get("school_share_value"),
                    "created_by": user.get("id"),
                    "created_by_name": user.get("name", user.get("email", "Admin")),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "auto_created": True,
                    "source": "edit"
                }
                await db.school_expenses.insert_one(school_share_expense)
            else:
                # Update existing school share expense amount
                await db.school_expenses.update_one(
                    {"id": existing_school_share["id"]},
                    {"$set": {
                        "amount": float(school_share_amount),
                        "description": f"School revenue share ({onboarding_data.get('school_share_type', 'amount')} - {onboarding_data.get('school_share_calc', 'lumpsum')})",
                        "school_share_type": onboarding_data.get("school_share_type"),
                        "school_share_calc": onboarding_data.get("school_share_calc"),
                        "school_share_value": onboarding_data.get("school_share_value"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
    
    inquiry = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if isinstance(inquiry.get('created_at'), str):
        inquiry['created_at'] = datetime.fromisoformat(inquiry['created_at'])
    if isinstance(inquiry.get('updated_at'), str):
        inquiry['updated_at'] = datetime.fromisoformat(inquiry['updated_at'])
    
    # Clear school payment cache for this school
    clear_cache(f"school_payment_{inquiry_id}")
    
    return inquiry

@api_router.get("/schools/relationship-managers")
async def get_relationship_managers_endpoint(user: dict = Depends(get_current_user)):
    """Get all users with Relationship Manager role"""
    managers = await get_relationship_managers()
    return managers

@api_router.post("/schools/{school_id}/assign-rm")
async def assign_relationship_manager(
    school_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Assign a relationship manager to a converted school"""
    rm_id = data.get('rm_id')
    rm_name = data.get('rm_name', '')
    
    if not rm_id:
        raise HTTPException(status_code=400, detail="Relationship manager ID required")
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {
            "$set": {
                "relationship_manager_id": rm_id,
                "relationship_manager_name": rm_name,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Relationship manager assigned successfully"}

@api_router.get("/schools/{school_id}/history")
async def get_school_history(school_id: str, user: dict = Depends(get_current_user)):
    """Get complete history of a school including status changes, meetings, notes, tickets, onboarding"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    history = []
    
    # Created event
    if school.get('created_at'):
        history.append({
            "type": "created",
            "date": school.get('created_at'),
            "description": f"School inquiry created from {school.get('source', 'website')}",
            "details": {"source": school.get('source')}
        })
    
    # Status history from activity log if exists
    activity_log = school.get('activity_log', [])
    for activity in activity_log:
        history.append({
            "type": "status_change",
            "date": activity.get('timestamp'),
            "description": activity.get('description', f"Status changed to {activity.get('new_status', '')}"),
            "details": activity
        })
    
    # Meeting scheduled
    if school.get('meeting_date'):
        history.append({
            "type": "meeting_scheduled",
            "date": school.get('meeting_date'),
            "description": f"Meeting scheduled for {school.get('meeting_date')} at {school.get('meeting_time', 'TBD')}",
            "details": {
                "meeting_date": school.get('meeting_date'),
                "meeting_time": school.get('meeting_time'),
                "meeting_mode": school.get('meeting_mode'),
                "meeting_link": school.get('meeting_link')
            }
        })
    
    # Followup scheduled
    if school.get('followup_date'):
        history.append({
            "type": "followup",
            "date": school.get('followup_date'),
            "description": f"Followup {school.get('followup_type', '')} scheduled for {school.get('followup_date')}",
            "details": {
                "followup_type": school.get('followup_type'),
                "followup_comment": school.get('followup_comment')
            }
        })
    
    # Conversion/Onboarding
    if school.get('onboarding_data'):
        onb_data = school.get('onboarding_data', {})
        history.append({
            "type": "converted",
            "date": onb_data.get('converted_at', school.get('updated_at')),
            "description": f"School converted - {onb_data.get('total_students', 0)} students, ₹{onb_data.get('total_amount', 0)}",
            "details": onb_data
        })
        
        # Onboarding steps
        steps = onb_data.get('onboarding_steps', {})
        for step_name, step_data in steps.items():
            if step_data.get('completed'):
                history.append({
                    "type": "onboarding_step",
                    "date": step_data.get('completed_at'),
                    "description": f"Onboarding step completed: {step_name.replace('_', ' ').title()}",
                    "details": step_data
                })
    
    # Notes
    if school.get('notes'):
        history.append({
            "type": "note",
            "date": school.get('updated_at'),
            "description": f"Notes: {school.get('notes')[:100]}...",
            "details": {"notes": school.get('notes')}
        })
    
    # Get tickets for this school
    tickets = await db.support_tickets.find({"school_id": school_id}, {"_id": 0}).to_list(50)
    for ticket in tickets:
        history.append({
            "type": "ticket",
            "date": ticket.get('created_at'),
            "description": f"Ticket raised: {ticket.get('subject', 'N/A')} ({ticket.get('status', 'open')})",
            "details": ticket
        })
    
    # Sort by date descending
    def parse_date(item):
        date_val = item.get('date')
        if not date_val:
            return datetime.min.replace(tzinfo=timezone.utc)
        if isinstance(date_val, datetime):
            if date_val.tzinfo is None:
                return date_val.replace(tzinfo=timezone.utc)
            return date_val
        if isinstance(date_val, str):
            try:
                parsed = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                if parsed.tzinfo is None:
                    return parsed.replace(tzinfo=timezone.utc)
                return parsed
            except Exception:
                return datetime.min.replace(tzinfo=timezone.utc)
        return datetime.min.replace(tzinfo=timezone.utc)
    
    try:
        history.sort(key=parse_date, reverse=True)
    except Exception as e:
        logging.error(f"Error sorting history: {e}")
        # Don't fail if sorting fails, just return unsorted
    
    return {"school_id": school_id, "history": history}

@api_router.post("/schools/{school_id}/raise-ticket")
async def raise_school_ticket(
    school_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Raise a support ticket on behalf of a school - saves to support_queries for unified Support Center"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    query_id = str(uuid.uuid4())
    user_id = user.get("id", "")
    
    # Build query document matching support_queries schema
    query_doc = {
        "id": query_id,
        "name": data.get('contact_name', school.get('contact_name', school.get('school_name', ''))),
        "phone": data.get('contact_phone', school.get('phone', '')),
        "email": data.get('contact_email', school.get('email', '')),
        "query_type": data.get('query_type', 'general'),
        "related_to": data.get('related_to', ''),  # Sub-category
        "inquiry_type": "school",  # Mark as school query
        "message": data.get('description', ''),
        "query_details": data.get('description', ''),  # Also store as query_details for consistency
        "priority": data.get('priority', 'medium'),
        "status": "open",
        "source": "school_crm",
        "attachments": data.get('attachments', []),  # [{name, url, type, is_voice_note}]
        "created_by": user_id,
        "created_by_name": user.get('name', ''),
        "viewers": [],  # Initialize empty viewers array
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "comments": [],  # Initialize empty comments array for replies
        "assigned_to": school.get('assigned_to'),  # Auto-assign to school's assigned team member
        # Additional school-specific fields
        "school_id": school_id,
        "school_name": school.get('school_name', ''),
        "subject": data.get('subject', ''),
        "user_type": data.get('user_type', 'school'),  # school, teacher, student
    }
    
    # Insert into support_queries collection (used by Support Center UI)
    await db.support_queries.insert_one(query_doc)
    
    # Send WhatsApp notification to assigned team member (if school has assigned_to)
    if school.get('assigned_to'):
        # Check both users and team_users collections
        assignee = await db.users.find_one({"id": school.get('assigned_to')}, {"_id": 0})
        if not assignee:
            assignee = await db.team_users.find_one({"id": school.get('assigned_to')}, {"_id": 0})
        if assignee and assignee.get('phone'):
            # Build ticket_data for notification
            ticket_data = {
                "id": query_id,
                "subject": data.get('subject', data.get('query_type', 'Support Query')),
                "priority": data.get('priority', 'medium'),
                "school_name": school.get('school_name', ''),
                "contact_name": data.get('contact_name', school.get('contact_name', '')),
                "assigned_to_name": assignee.get('name', '')
            }
            await send_support_ticket_notification(ticket_data, assignee)
            print(f"Query notification sent to {assignee.get('name')} at {assignee.get('phone')}")
        else:
            print(f"Query notification skipped - assignee {school.get('assigned_to')} has no phone number")
    
    return {"message": "Ticket raised successfully", "ticket_id": query_id}

# ========================
# EDUCATOR ENDPOINTS
# ========================

@api_router.post("/educators/apply", response_model=EducatorApplication)
async def create_educator_application(data: EducatorApplicationCreate):
    application = EducatorApplication(**data.model_dump())
    
    # If demo_date is provided, set status to demo_scheduled
    if data.demo_date:
        application.status = "demo_scheduled"
    
    # Auto-assign to Educator HR team user (round-robin)
    if not data.assigned_to:
        assigned = await auto_assign_lead('educator', data.city or '', 'online')
        if assigned and assigned.get('user_id'):
            application.assigned_to = assigned['user_id']
    
    # Generate meeting link for the educator demo
    application_dict = application.model_dump()
    meeting_link = generate_meeting_link(application.id)
    
    doc = application_dict
    doc['meeting_link'] = meeting_link
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.educator_applications.insert_one(doc)
    
    # Send application received email
    await send_educator_application_received_email(doc)
    
    return application

# Educator application with OTP verification
class EducatorApplyWithOTP(BaseModel):
    phone: str
    otp: str
    application_data: EducatorApplicationCreate

@api_router.post("/educators/apply-verified")
async def create_educator_application_verified(data: EducatorApplyWithOTP):
    """Create educator application with OTP verification"""
    success, error_msg = otp_verify(data.phone, data.otp)
    if not success:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Create the application
    app_data = data.application_data.model_dump()
    app_data['phone'] = data.phone  # Ensure phone matches verified phone
    
    application = EducatorApplication(**app_data)
    
    # If demo_date is provided, set status to demo_scheduled
    if data.application_data.demo_date:
        application.status = "demo_scheduled"
    
    # Generate meeting link
    meeting_link = generate_meeting_link(application.id)
    
    doc = application.model_dump()
    doc['meeting_link'] = meeting_link
    doc['phone_verified'] = True
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.educator_applications.insert_one(doc)
    
    # Send application received email
    await send_educator_application_received_email(doc)
    
    return {
        "success": True,
        "message": "Application submitted successfully",
        "application": {
            "id": application.id,
            "name": application.name,
            "status": application.status,
            "demo_date": application.demo_date,
            "demo_time": application.demo_time,
            "meeting_link": meeting_link
        }
    }

@api_router.get("/educators/applications", response_model=List[EducatorApplication])
async def get_educator_applications(
    status: Optional[str] = None,
    for_assignment: Optional[bool] = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    # For team members, only show leads they added or assigned to them
    # UNLESS for_assignment=true (need to see all onboarded educators for dropdown)
    if user.get("role") == "team_member" and not for_assignment:
        user_id = user.get("user_id", user.get("id", ""))
        query["$or"] = [
            {"added_by": user_id},
            {"assigned_to": user_id}
        ]
    
    applications = await db.educator_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for app in applications:
        if isinstance(app.get('created_at'), str):
            app['created_at'] = datetime.fromisoformat(app['created_at'])
        if isinstance(app.get('updated_at'), str):
            app['updated_at'] = datetime.fromisoformat(app['updated_at'])
    return applications

@api_router.patch("/educators/application/{app_id}", response_model=EducatorApplication)
async def update_educator_application(
    app_id: str, 
    data: EducatorApplicationUpdate,
    user: dict = Depends(get_current_user)
):
    # Get current application to check status change
    current_app = await db.educator_applications.find_one({"id": app_id}, {"_id": 0})
    old_status = current_app.get("status") if current_app else None
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.educator_applications.update_one({"id": app_id}, {"$set": update_data})
    application = await db.educator_applications.find_one({"id": app_id}, {"_id": 0})
    if isinstance(application.get('created_at'), str):
        application['created_at'] = datetime.fromisoformat(application['created_at'])
    if isinstance(application.get('updated_at'), str):
        application['updated_at'] = datetime.fromisoformat(application['updated_at'])
    
    # Send email notifications based on status changes
    new_status = data.status
    if new_status and new_status != old_status:
        if new_status == "demo_scheduled" and (data.demo_date or data.demo_time):
            await send_educator_demo_scheduled_email(application)
        elif new_status == "demo_completed":
            await send_educator_demo_completed_email(application)
        elif new_status == "onboarded":
            await send_educator_onboarded_email(application)
        elif new_status == "archived" or new_status == "rejected":
            await send_educator_rejected_email(application)
    
    return application

# Endpoint to send demo reminder email manually
@api_router.post("/educators/{app_id}/send-reminder")
async def send_educator_reminder(
    app_id: str,
    user: dict = Depends(get_current_user)
):
    """Send demo reminder email to educator"""
    application = await db.educator_applications.find_one({"id": app_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    await send_educator_demo_reminder_email(application)
    return {"success": True, "message": f"Reminder email sent to {application.get('email')}"}

# Endpoint to manually trigger any educator email
@api_router.post("/educators/{app_id}/send-email/{email_type}")
async def send_educator_email_manual(
    app_id: str,
    email_type: str,
    user: dict = Depends(get_current_user)
):
    """Manually send a specific email to educator
    
    email_type options:
    - application_received
    - demo_scheduled
    - demo_reminder
    - demo_completed
    - onboarded
    - rejected
    """
    application = await db.educator_applications.find_one({"id": app_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    email_functions = {
        "application_received": send_educator_application_received_email,
        "demo_scheduled": send_educator_demo_scheduled_email,
        "demo_reminder": send_educator_demo_reminder_email,
        "demo_completed": send_educator_demo_completed_email,
        "onboarded": send_educator_onboarded_email,
        "rejected": send_educator_rejected_email
    }
    
    email_func = email_functions.get(email_type)
    if not email_func:
        raise HTTPException(status_code=400, detail=f"Invalid email type. Valid options: {list(email_functions.keys())}")
    
    await email_func(application)
    return {"success": True, "message": f"{email_type} email sent to {application.get('email')}"}

# ========================
# EDUCATOR ONBOARDING ENDPOINTS
# ========================

@api_router.get("/educator/onboarding/content")
async def get_onboarding_content():
    """Get all onboarding content (videos, quiz questions)"""
    return {
        "training_videos": TRAINING_VIDEOS,
        "curriculum_videos": CURRICULUM_VIDEOS,
        "welcome_video": {
            "id": "welcome",
            "title": "Welcome to OLL",
            "duration": "5:00",
            "url": "https://www.youtube.com/embed/dQw4w9WgXcQ"
        },
        "contract_text": """
# OLL Educator Agreement

By accepting this agreement, you acknowledge and agree to the following terms:

1. **Professional Conduct**: You will maintain professional behavior at all times while representing OLL.

2. **Confidentiality**: You will keep all student information, teaching materials, and business practices confidential.

3. **Quality Standards**: You will adhere to OLL's teaching methodologies and quality standards.

4. **Attendance**: You will honor all scheduled sessions and inform the admin at least 24 hours in advance if you need to reschedule.

5. **Communication**: You will maintain timely communication with students, parents, and the OLL team.

6. **Training**: You will complete all required training modules and assessments.

7. **Feedback**: You will provide and accept constructive feedback to improve teaching quality.

8. **Payment**: Payments will be processed as per the agreed schedule after verification of completed sessions.

9. **Termination**: Either party may terminate this agreement with 7 days written notice.

10. **Code of Conduct**: You will follow OLL's code of conduct and anti-harassment policies.

By clicking "I Accept", you confirm that you have read, understood, and agree to these terms.
        """
    }

@api_router.get("/educator/onboarding/{educator_id}")
async def get_educator_onboarding(educator_id: str):
    """Get onboarding progress for an educator"""
    onboarding = await db.educator_onboarding.find_one({"educator_id": educator_id}, {"_id": 0})
    
    if not onboarding:
        # Create new onboarding record
        educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
        if not educator:
            raise HTTPException(status_code=404, detail="Educator not found")
        
        new_onboarding = EducatorOnboarding(educator_id=educator_id)
        doc = new_onboarding.model_dump()
        doc['started_at'] = doc['started_at'].isoformat()
        doc['last_activity'] = doc['last_activity'].isoformat()
        await db.educator_onboarding.insert_one(doc)
        onboarding = doc
    
    # Get educator details
    educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
    
    return {
        "onboarding": onboarding,
        "educator": educator
    }

@api_router.patch("/educator/onboarding/{educator_id}")
async def update_educator_onboarding(educator_id: str, data: EducatorOnboardingUpdate):
    """Update onboarding progress"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['last_activity'] = datetime.now(timezone.utc).isoformat()
    
    # Check if contract is being accepted
    if data.contract_accepted:
        update_data['contract_accepted_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id}, 
        {"$set": update_data}
    )
    
    onboarding = await db.educator_onboarding.find_one({"educator_id": educator_id}, {"_id": 0})
    return onboarding

@api_router.post("/educator/onboarding/{educator_id}/complete-step")
async def complete_onboarding_step(educator_id: str, data: dict):
    """Mark a step as completed and move to next"""
    step = data.get("step")
    
    onboarding = await db.educator_onboarding.find_one({"educator_id": educator_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding record not found")
    
    completed_steps = onboarding.get("completed_steps", [])
    if step not in completed_steps:
        completed_steps.append(step)
    
    next_step = min(step + 1, 8)
    
    update_data = {
        "completed_steps": completed_steps,
        "current_step": next_step,
        "last_activity": datetime.now(timezone.utc).isoformat()
    }
    
    # If all 8 steps completed
    if len(completed_steps) >= 8:
        update_data["status"] = "completed"
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update educator status to fully onboarded
        await db.educator_applications.update_one(
            {"id": educator_id},
            {"$set": {"onboarding_completed": True}}
        )
    
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {"$set": update_data}
    )
    
    return {"success": True, "next_step": next_step, "completed_steps": completed_steps}

@api_router.post("/educator/onboarding/{educator_id}/submit-quiz")
async def submit_training_quiz(educator_id: str, data: dict):
    """Submit training quiz answers and calculate score"""
    answers = data.get("answers", {})  # {question_id: selected_option_index}
    
    correct = 0
    total = len(TRAINING_QUIZ)
    
    for q in TRAINING_QUIZ:
        if answers.get(q["id"]) == q["correct"]:
            correct += 1
    
    score = (correct / total) * 100
    passed = score >= 70
    
    attempt = {
        "score": score,
        "passed": passed,
        "correct": correct,
        "total": total,
        "attempted_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {
            "$push": {"quiz_attempts": attempt},
            "$set": {"quiz_passed": passed, "last_activity": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "score": score,
        "passed": passed,
        "correct": correct,
        "total": total,
        "message": "Congratulations! You passed the quiz." if passed else "You need 70% to pass. Please try again."
    }

@api_router.post("/educator/onboarding/{educator_id}/submit-assessment")
async def submit_curriculum_assessment(educator_id: str, data: dict):
    """Submit curriculum assessment answers"""
    answers = data.get("answers", {})
    
    correct = 0
    total = len(CURRICULUM_ASSESSMENT)
    
    for q in CURRICULUM_ASSESSMENT:
        if answers.get(q["id"]) == q["correct"]:
            correct += 1
    
    score = (correct / total) * 100
    passed = score >= 70
    
    attempt = {
        "score": score,
        "passed": passed,
        "correct": correct,
        "total": total,
        "attempted_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {
            "$push": {"assessment_attempts": attempt},
            "$set": {"assessment_passed": passed, "last_activity": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "score": score,
        "passed": passed,
        "correct": correct,
        "total": total,
        "message": "Congratulations! You passed the assessment." if passed else "You need 70% to pass. Please try again."
    }

@api_router.get("/educator/onboarding/{educator_id}/quiz")
async def get_training_quiz(educator_id: str):
    """Get quiz questions (without correct answers)"""
    questions = []
    for q in TRAINING_QUIZ:
        questions.append({
            "id": q["id"],
            "question": q["question"],
            "options": q["options"]
        })
    return {"questions": questions}

@api_router.get("/educator/onboarding/{educator_id}/assessment")
async def get_curriculum_assessment(educator_id: str):
    """Get assessment questions (without correct answers)"""
    questions = []
    for q in CURRICULUM_ASSESSMENT:
        questions.append({
            "id": q["id"],
            "question": q["question"],
            "options": q["options"]
        })
    return {"questions": questions}

@api_router.post("/educators/add-active")
async def add_active_educator(data: dict, user: dict = Depends(get_current_user)):
    """Add an educator directly as active (skip application process)"""
    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    
    if not name or not email or not phone:
        raise HTTPException(status_code=400, detail="Name, email and phone are required")
    
    # Check if educator already exists
    existing = await db.educator_applications.find_one(
        {"$or": [{"email": email}, {"phone": phone}]},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Educator with this email or phone already exists")
    
    educator = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "phone": phone,
        "city": data.get("city", ""),
        "skills": data.get("skills", []),
        "experience": data.get("experience", ""),
        "status": "active",
        "source": "direct_add",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "added_by": user.get("email", "admin"),
        "onboarding_completed": True
    }
    
    await db.educator_applications.insert_one(educator)
    if "_id" in educator:
        del educator["_id"]
    
    return {"message": "Educator added successfully", "educator": educator}

@api_router.post("/educators/bulk-import")
async def bulk_import_educators(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Bulk import educators from CSV file"""
    import csv
    from io import StringIO
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    text = content.decode('utf-8')
    
    reader = csv.DictReader(StringIO(text))
    
    imported = 0
    errors = []
    
    for idx, row in enumerate(reader, start=2):  # Start at 2 because row 1 is header
        try:
            name = row.get('name', '').strip()
            email = row.get('email', '').strip()
            phone = row.get('phone', '').strip()
            
            if not name or not email or not phone:
                errors.append(f"Row {idx}: Missing required fields")
                continue
            
            # Check for duplicates
            existing = await db.educator_applications.find_one(
                {"$or": [{"email": email}, {"phone": phone}]},
                {"_id": 0}
            )
            if existing:
                errors.append(f"Row {idx}: Educator with email {email} or phone {phone} already exists")
                continue
            
            # Parse skills
            skills_str = row.get('skills', '')
            skills = [s.strip() for s in skills_str.split(',') if s.strip()] if skills_str else []
            
            educator = {
                "id": str(uuid.uuid4()),
                "name": name,
                "email": email,
                "phone": phone,
                "city": row.get('city', '').strip(),
                "skills": skills,
                "experience": row.get('experience', '').strip(),
                "status": "active",
                "source": "bulk_import",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "added_by": user.get("email", "admin"),
                "onboarding_completed": True
            }
            
            await db.educator_applications.insert_one(educator)
            imported += 1
            
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
    
    return {
        "imported": imported,
        "errors": errors[:10] if errors else [],  # Return first 10 errors
        "total_errors": len(errors)
    }

# PDF Generation Helper Functions
def generate_id_card_pdf(educator_data, onboarding_data) -> BytesIO:
    """Generate ID Card PDF based on OLL template"""
    from reportlab.lib.utils import ImageReader
    
    buffer = BytesIO()
    
    # ID Card dimensions (similar to credit card - 3.375 x 2.125 inches, scaled up)
    width, height = 400, 550
    c = canvas.Canvas(buffer, pagesize=(width, height))
    
    # Colors
    dark_blue = HexColor('#1E3A5F')
    red = HexColor('#D63031')
    
    # Background
    c.setFillColor(white)
    c.rect(0, 0, width, height, fill=1)
    
    # Left blue border
    c.setFillColor(dark_blue)
    c.rect(0, 0, 15, height, fill=1)
    
    # Bottom curved section
    c.setFillColor(dark_blue)
    c.rect(0, 0, width, 60, fill=1)
    
    # Red accent in corner
    c.setFillColor(red)
    c.circle(30, 30, 15, fill=1)
    
    # OLL Logo at top right
    c.setFillColor(dark_blue)
    c.setFont("Helvetica-Bold", 32)
    c.drawRightString(width - 30, height - 50, "OLL")
    
    # Profile photo placeholder circle
    c.setStrokeColor(dark_blue)
    c.setLineWidth(3)
    c.circle(width/2, height - 180, 70, stroke=1, fill=0)
    
    # Add text inside placeholder
    c.setFillColor(HexColor('#CCCCCC'))
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, height - 185, "Photo")
    
    # Name
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 22)
    name = educator_data.get('name', 'Educator Name')
    c.drawCentredString(width/2, height - 280, name)
    
    # Title/Role
    c.setFont("Helvetica", 16)
    c.setFillColor(red)
    c.drawCentredString(width/2, height - 305, "OLL Educator")
    
    # Phone number
    c.setFillColor(black)
    c.setFont("Helvetica", 12)
    phone = educator_data.get('phone', '')
    c.drawString(40, 130, f"Phone: +91 {phone}")
    
    # ID Number
    educator_id = educator_data.get('id', '')[:8].upper()
    c.drawString(40, 105, f"ID: {educator_id}")
    
    # Generate QR Code and save to temp file
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(f"OLL-EDU-{educator_id}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR to temp file
    qr_temp_path = UPLOAD_DIR / f"qr_temp_{educator_id}.png"
    qr_img.save(str(qr_temp_path))
    
    # Draw QR code
    c.drawImage(str(qr_temp_path), width - 100, 85, width=70, height=70)
    
    # Clean up temp file
    try:
        os.remove(qr_temp_path)
    except:
        pass
    
    c.save()
    buffer.seek(0)
    return buffer

def generate_certificate_pdf(educator_data) -> BytesIO:
    """Generate Certificate of Completion PDF"""
    buffer = BytesIO()
    
    # A4 Landscape
    width, height = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=(width, height))
    
    # Colors
    dark_blue = HexColor('#1E3A5F')
    red = HexColor('#D63031')
    
    # White background
    c.setFillColor(white)
    c.rect(0, 0, width, height, fill=1)
    
    # Decorative border
    c.setStrokeColor(dark_blue)
    c.setLineWidth(8)
    c.rect(30, 30, width-60, height-60, stroke=1, fill=0)
    
    # Inner border
    c.setLineWidth(2)
    c.rect(40, 40, width-80, height-80, stroke=1, fill=0)
    
    # OLL Logo at top center
    c.setFillColor(dark_blue)
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(width/2, height - 100, "OLL")
    
    # Title
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(width/2, height - 160, "CERTIFICATE OF COMPLETION")
    
    # Subtitle
    c.setFillColor(HexColor('#666666'))
    c.setFont("Helvetica", 14)
    c.drawCentredString(width/2, height - 190, "This is to certify that")
    
    # Recipient Name
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 40)
    name = educator_data.get('name', 'Educator Name')
    c.drawCentredString(width/2, height - 250, name)
    
    # Role/Title in Red
    c.setFillColor(red)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width/2, height - 290, "OLL Educator")
    
    # Description
    c.setFillColor(black)
    c.setFont("Helvetica", 14)
    today = datetime.now().strftime("%d %B %Y")
    c.drawCentredString(width/2, height - 330, 
        f"Has successfully completed the OLL Educator Training Program")
    c.drawCentredString(width/2, height - 355,
        f"and is hereby certified as an official OLL Educator.")
    
    # Date
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, height - 390, f"Date: {today}")
    
    # Signature section
    c.setFont("Helvetica-Bold", 14)
    c.drawString(width - 250, 100, "SHREYAAN DAGA")
    c.setFont("Helvetica", 12)
    c.drawString(width - 250, 80, "Cofounder - OLL")
    
    # Signature line
    c.setStrokeColor(black)
    c.setLineWidth(1)
    c.line(width - 280, 115, width - 150, 115)
    
    c.save()
    buffer.seek(0)
    return buffer

@api_router.get("/educator/onboarding/{educator_id}/download-id-card")
async def download_id_card(educator_id: str):
    """Generate and download ID Card PDF"""
    # Get educator data
    educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
    if not educator:
        raise HTTPException(status_code=404, detail="Educator not found")
    
    # Get onboarding data
    onboarding = await db.educator_onboarding.find_one({"educator_id": educator_id}, {"_id": 0})
    
    # Check if approved
    if educator.get('status') != 'active':
        raise HTTPException(status_code=403, detail="Educator must be approved to download ID card")
    
    # Generate PDF
    pdf_buffer = generate_id_card_pdf(educator, onboarding)
    
    # Save to file
    filename = f"OLL_ID_Card_{educator.get('name', 'Educator').replace(' ', '_')}.pdf"
    filepath = UPLOAD_DIR / filename
    with open(filepath, 'wb') as f:
        f.write(pdf_buffer.getvalue())
    
    # Update onboarding record
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {"$set": {"id_card_generated": True, "last_activity": datetime.now(timezone.utc).isoformat()}}
    )
    
    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type='application/pdf'
    )

@api_router.get("/educator/onboarding/{educator_id}/download-certificate")
async def download_certificate(educator_id: str):
    """Generate and download Certificate PDF"""
    # Get educator data
    educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
    if not educator:
        raise HTTPException(status_code=404, detail="Educator not found")
    
    # Check if approved
    if educator.get('status') != 'active':
        raise HTTPException(status_code=403, detail="Educator must be approved to download certificate")
    
    # Generate PDF
    pdf_buffer = generate_certificate_pdf(educator)
    
    # Save to file
    filename = f"OLL_Certificate_{educator.get('name', 'Educator').replace(' ', '_')}.pdf"
    filepath = UPLOAD_DIR / filename
    with open(filepath, 'wb') as f:
        f.write(pdf_buffer.getvalue())
    
    # Update onboarding record
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {"$set": {"certificate_generated": True, "last_activity": datetime.now(timezone.utc).isoformat()}}
    )
    
    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type='application/pdf'
    )

@api_router.post("/educator/onboarding/{educator_id}/generate-certificate")
async def generate_certificate(educator_id: str):
    """Mark certificate and ID card as generated"""
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {"$set": {
            "id_card_generated": True,
            "certificate_generated": True,
            "last_activity": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "message": "Certificate and ID card are ready for download"}

# Admin endpoint to verify educator documents
@api_router.post("/admin/educators/{educator_id}/verify-documents")
async def verify_educator_documents(educator_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Admin verifies educator onboarding documents"""
    if user.get("role") not in ["admin", "team_member"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    verified = data.get("verified", False)
    notes = data.get("notes", "")
    
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {"$set": {
            "documents_verified": verified,
            "documents_verified_by": user.get("id", ""),
            "documents_verified_at": datetime.now(timezone.utc).isoformat(),
            "verification_notes": notes,
            "last_activity": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Documents verified" if verified else "Documents rejected", "verified": verified}

# Admin endpoint to add educator directly to onboarding
@api_router.post("/admin/educators/direct-onboard")
async def direct_onboard_educator(data: dict, user: dict = Depends(get_current_user)):
    """Admin adds educator directly to onboarding (skips selection process)"""
    if user.get("role") not in ["admin", "team_member"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create educator application with onboarding status
    educator = EducatorApplication(
        name=data.get("name", ""),
        email=data.get("email", ""),
        phone=data.get("phone", ""),
        skills=data.get("skills", []),
        city=data.get("city", ""),
        experience=data.get("experience", ""),
        status="onboarding",
        source="direct_onboard",
        added_by=user.get("id", "")
    )
    
    doc = educator.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.educator_applications.insert_one(doc)
    
    # Create onboarding record
    onboarding = EducatorOnboarding(educator_id=educator.id)
    onb_doc = onboarding.model_dump()
    onb_doc['started_at'] = onb_doc['started_at'].isoformat()
    onb_doc['last_activity'] = onb_doc['last_activity'].isoformat()
    await db.educator_onboarding.insert_one(onb_doc)
    
    # Send welcome email
    await send_educator_onboarded_email(doc)
    
    return {
        "success": True,
        "educator_id": educator.id,
        "message": f"Educator {educator.name} added and onboarding started"
    }

# Admin endpoint to view all onboarding progress
@api_router.get("/admin/educators/onboarding-progress")
async def get_all_onboarding_progress(user: dict = Depends(get_current_user)):
    """Get onboarding progress for all educators"""
    # Get all educators in onboarding status
    educators = await db.educator_applications.find(
        {"status": {"$in": ["onboarding", "onboarded"]}},
        {"_id": 0}
    ).to_list(500)
    
    # Get onboarding records
    educator_ids = [e["id"] for e in educators]
    onboarding_records = await db.educator_onboarding.find(
        {"educator_id": {"$in": educator_ids}},
        {"_id": 0}
    ).to_list(500)
    
    # Create lookup
    onboarding_map = {o["educator_id"]: o for o in onboarding_records}
    
    result = []
    for e in educators:
        onb = onboarding_map.get(e["id"], {})
        result.append({
            "educator": e,
            "onboarding": onb,
            "progress": len(onb.get("completed_steps", [])) / 7 * 100 if onb else 0
        })
    
    return result

# ========================
# EDUCATOR PORTAL ENDPOINTS
# ========================

@api_router.post("/educator/login")
async def educator_login(data: OTPVerify):
    """Login for educators (both onboarded and applicants) using phone + OTP"""
    success, error_msg = otp_verify(data.phone, data.otp)
    if not success:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Find educator by phone (any status, not just onboarded)
    educator = await db.educator_applications.find_one({
        "phone": data.phone
    }, {"_id": 0})
    
    if not educator:
        raise HTTPException(status_code=403, detail="No application found. Please apply first.")
    
    # Create JWT token for educator (any status)
    token = create_access_token({
        "sub": educator["email"],
        "role": "educator",
        "educator_id": educator["id"],
        "name": educator["name"],
        "status": educator.get("status", "new")
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": educator["id"],
            "name": educator["name"],
            "email": educator["email"],
            "phone": educator["phone"],
            "skills": educator.get("skills", []),
            "status": educator.get("status", "new"),
            "demo_date": educator.get("demo_date"),
            "demo_time": educator.get("demo_time"),
            "demo_rating": educator.get("demo_rating"),
            "meeting_link": educator.get("meeting_link") or generate_meeting_link(educator["id"]),
            "role": "educator"
        }
    }

@api_router.patch("/educator/reschedule-demo")
async def educator_reschedule_demo(data: dict, user: dict = Depends(get_current_user)):
    """Allow educator to reschedule their own demo"""
    educator_id = user.get("educator_id") or user.get("id")
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    new_date = data.get("demo_date")
    new_time = data.get("demo_time")
    
    if not new_date or not new_time:
        raise HTTPException(status_code=400, detail="Date and time required")
    
    # Update educator application
    await db.educator_applications.update_one(
        {"id": educator_id},
        {"$set": {
            "demo_date": new_date,
            "demo_time": new_time,
            "status": "demo_scheduled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$push": {
            "comments": {
                "id": str(uuid.uuid4()),
                "text": f"Demo rescheduled by educator to {new_date} at {new_time}",
                "author": "System",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    return {"message": "Demo rescheduled successfully"}

@api_router.post("/educator/submit-query")
async def educator_submit_query(data: dict, user: dict = Depends(get_current_user)):
    """Submit a structured query from educator"""
    educator_id = user.get("educator_id") or user.get("id")
    
    category = data.get("category", "general")
    subcategory = data.get("subcategory", "")
    category_label = data.get("category_label", "General")
    subcategory_label = data.get("subcategory_label", "")
    query_text = data.get("query", "")
    related_demo_id = data.get("related_demo_id", "")
    
    if not query_text and not subcategory_label:
        raise HTTPException(status_code=400, detail="Query text required")
    
    # Create support query with structured data
    query_doc = {
        "id": str(uuid.uuid4()),
        "type": "educator_query",
        "category": category,
        "subcategory": subcategory,
        "category_label": category_label,
        "subcategory_label": subcategory_label,
        "educator_id": educator_id,
        "educator_name": user.get("name", ""),
        "educator_phone": user.get("phone", ""),
        "educator_email": user.get("email", ""),
        "query": query_text or subcategory_label,
        "related_demo_id": related_demo_id,
        "status": "new",
        "priority": "high" if category == "demo_related" else "normal",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If related to a specific demo, get demo details
    if related_demo_id:
        demo = await db.student_inquiries.find_one({"id": related_demo_id}, {"_id": 0})
        if demo:
            query_doc["related_demo"] = {
                "student_name": demo.get("name"),
                "student_phone": demo.get("phone"),
                "demo_date": demo.get("demo_date"),
                "demo_time": demo.get("demo_time"),
                "skill": demo.get("skill")
            }
            
            # If student not joined, we could trigger a WhatsApp reminder
            if subcategory == "student_not_joined" and demo.get("phone"):
                query_doc["action_required"] = "send_reminder_to_student"
    
    await db.support_queries.insert_one(query_doc)
    
    # Also add as comment to educator application
    await db.educator_applications.update_one(
        {"id": educator_id},
        {"$push": {
            "comments": {
                "id": str(uuid.uuid4()),
                "text": f"[{category_label}] {subcategory_label}: {query_text}",
                "author": user.get("name", "Educator"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    return {"message": "Query submitted successfully", "query_id": query_doc["id"]}

@api_router.get("/educator/my-application")
async def get_educator_my_application(user: dict = Depends(get_current_user)):
    """Get educator's own application details (alias for /educators/my-application)"""
    educator_id = user.get("educator_id") or user.get("id")
    phone = user.get("phone")
    email = user.get("email")
    
    # Find by id, phone, or email
    application = None
    if educator_id:
        application = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
    if not application and phone:
        application = await db.educator_applications.find_one({"phone": phone}, {"_id": 0})
    if not application and email:
        application = await db.educator_applications.find_one({"email": email}, {"_id": 0})
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Generate meeting link if not present
    if not application.get("meeting_link"):
        application["meeting_link"] = generate_meeting_link(application["id"])
    
    return application

@api_router.get("/educator/my-demos")
async def get_educator_demos(user: dict = Depends(get_current_user)):
    """Get demos assigned to the logged-in educator"""
    # Get educator_id from token or find by email
    educator_id = user.get("educator_id") or user.get("id")
    
    if not educator_id:
        # Try to find educator by email
        educator = await db.educator_applications.find_one({"email": user.get("email")}, {"_id": 0})
        if educator:
            educator_id = educator["id"]
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    # Get demos assigned to this educator
    demos = await db.student_inquiries.find({
        "assigned_educator_id": educator_id,
        "status": {"$in": ["new", "confirmed", "rescheduled"]}
    }, {"_id": 0}).sort("demo_date", 1).to_list(100)
    
    return demos

@api_router.get("/educator/demo-history")
async def get_educator_demo_history(user: dict = Depends(get_current_user)):
    """Get completed/past demos for the educator"""
    educator_id = user.get("educator_id") or user.get("id")
    
    if not educator_id:
        educator = await db.educator_applications.find_one({"email": user.get("email")}, {"_id": 0})
        if educator:
            educator_id = educator["id"]
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    demos = await db.student_inquiries.find({
        "assigned_educator_id": educator_id,
        "status": {"$in": ["demo_completed", "converted", "archived", "cancelled"]}
    }, {"_id": 0}).sort("demo_date", -1).to_list(100)
    
    return demos

@api_router.post("/educator/pass-demo/{inquiry_id}")
async def pass_demo_to_educator(inquiry_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Pass a demo to another educator"""
    educator_id = user.get("educator_id") or user.get("id")
    target_educator_id = data.get("target_educator_id")
    reason = data.get("reason", "")
    
    if not target_educator_id:
        raise HTTPException(status_code=400, detail="Target educator ID required")
    
    # Verify current educator owns this demo
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demo not found")
    
    if inquiry.get("assigned_educator_id") != educator_id:
        raise HTTPException(status_code=403, detail="You are not assigned to this demo")
    
    # Get target educator details
    target_educator = await db.educator_applications.find_one({
        "id": target_educator_id,
        "status": "onboarded"
    }, {"_id": 0})
    
    if not target_educator:
        raise HTTPException(status_code=404, detail="Target educator not found or not onboarded")
    
    # Update the inquiry
    await db.student_inquiries.update_one(
        {"id": inquiry_id},
        {"$set": {
            "assigned_educator_id": target_educator["id"],
            "assigned_educator_name": target_educator["name"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$push": {
            "comments": {
                "id": str(uuid.uuid4()),
                "text": f"Demo passed from {user.get('name', 'Educator')} to {target_educator['name']}. Reason: {reason}",
                "author": "System",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    return {"message": "Demo passed successfully", "new_educator": target_educator["name"]}

@api_router.get("/educator/available-educators")
async def get_available_educators(user: dict = Depends(get_current_user)):
    """Get list of other onboarded educators for passing demos"""
    current_educator_id = user.get("educator_id") or user.get("id")
    
    educators = await db.educator_applications.find({
        "status": "onboarded",
        "id": {"$ne": current_educator_id}
    }, {"_id": 0, "id": 1, "name": 1, "skills": 1, "city": 1}).to_list(50)
    
    return educators

@api_router.patch("/educator/toggle-availability")
async def toggle_educator_availability(data: dict, user: dict = Depends(get_current_user)):
    """Toggle educator availability for new demo assignments"""
    educator_id = user.get("educator_id") or user.get("id")
    is_available = data.get("is_available", True)
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    # Update educator availability status
    result = await db.educator_applications.update_one(
        {"id": educator_id},
        {"$set": {
            "is_available": is_available,
            "availability_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Educator not found")
    
    status_text = "available" if is_available else "unavailable"
    return {"message": f"You are now {status_text} for new demo assignments", "is_available": is_available}

@api_router.post("/educator/complete-demo/{inquiry_id}")
async def educator_complete_demo(inquiry_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Mark a demo as completed by educator"""
    educator_id = user.get("educator_id") or user.get("id")
    feedback = data.get("feedback", "")
    
    # Verify educator owns this demo
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demo not found")
    
    if inquiry.get("assigned_educator_id") != educator_id:
        raise HTTPException(status_code=403, detail="You are not assigned to this demo")
    
    await db.student_inquiries.update_one(
        {"id": inquiry_id},
        {"$set": {
            "status": "demo_completed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$push": {
            "comments": {
                "id": str(uuid.uuid4()),
                "text": f"Demo completed by {user.get('name', 'Educator')}. Feedback: {feedback}",
                "author": user.get("name", "Educator"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    # Send completion notifications to student and educator
    educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
    await send_session_complete_notification(inquiry, educator)
    
    return {"message": "Demo marked as completed"}

@api_router.post("/educator/incomplete-demo/{inquiry_id}")
async def educator_mark_demo_incomplete(inquiry_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Mark a demo as incomplete (student didn't join)"""
    educator_id = user.get("educator_id") or user.get("id")
    reason = data.get("reason", "Student did not join the demo")
    
    # Verify educator owns this demo
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demo not found")
    
    if inquiry.get("assigned_educator_id") != educator_id:
        raise HTTPException(status_code=403, detail="You are not assigned to this demo")
    
    # Update inquiry status to incomplete
    await db.student_inquiries.update_one(
        {"id": inquiry_id},
        {"$set": {
            "status": "incomplete",
            "incomplete_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$push": {
            "comments": {
                "id": str(uuid.uuid4()),
                "text": f"Demo marked as incomplete by {user.get('name', 'Educator')}. Reason: {reason}",
                "author": user.get("name", "Educator"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    # Send WhatsApp notification to student (we missed you message)
    student_phone = inquiry.get("phone")
    student_name = inquiry.get("name", "Student")
    skill = inquiry.get("skill", "the demo")
    
    if student_phone:
        try:
            # Send "we missed you" message via AiSensy
            aisensy_api_key = os.environ.get("AISENSY_API_KEY")
            if aisensy_api_key:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        "https://backend.aisensy.com/campaign/t1/api/v2",
                        json={
                            "apiKey": aisensy_api_key,
                            "campaignName": "missed_demo_notification",
                            "destination": f"91{student_phone}",
                            "userName": student_name,
                            "templateParams": [
                                student_name,
                                skill.title(),
                                "Please reschedule your demo at your convenience."
                            ],
                            "source": "OLL Platform",
                            "media": {}
                        },
                        timeout=10.0
                    )
        except Exception as e:
            print(f"Failed to send missed demo notification: {e}")
    
    return {"message": "Demo marked as incomplete. Student has been notified."}

# ========================
# NOT JOINED YET & REMINDER NOTIFICATIONS
# ========================

@api_router.post("/educator/notify-not-joined/{inquiry_id}")
async def educator_notify_student_not_joined(inquiry_id: str, user: dict = Depends(get_current_user)):
    """Educator notifies that student hasn't joined the demo yet"""
    educator_id = user.get("educator_id") or user.get("id")
    
    # Verify educator owns this demo
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demo not found")
    
    if inquiry.get("assigned_educator_id") != educator_id:
        raise HTTPException(status_code=403, detail="You are not assigned to this demo")
    
    # Send "not joined" notification to student
    await send_not_joined_notification(inquiry, "student")
    
    # Log the notification
    await db.student_inquiries.update_one(
        {"id": inquiry_id},
        {"$push": {
            "comments": {
                "id": str(uuid.uuid4()),
                "text": f"Educator sent 'not joined yet' reminder to student",
                "author": user.get("name", "Educator"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    return {"message": "Student has been notified that they haven't joined yet"}

@api_router.post("/admin/notify-not-joined/{inquiry_id}")
async def admin_notify_not_joined(inquiry_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Admin notifies student or educator that they haven't joined"""
    notify_type = data.get("notify_type", "student")  # "student" or "educator"
    
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Demo not found")
    
    # Send notification
    await send_not_joined_notification(inquiry, notify_type)
    
    # Log the notification
    await db.student_inquiries.update_one(
        {"id": inquiry_id},
        {"$push": {
            "comments": {
                "id": str(uuid.uuid4()),
                "text": f"Admin sent 'not joined yet' reminder to {notify_type}",
                "author": user.get("name", "Admin"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    return {"message": f"{notify_type.title()} has been notified"}

@api_router.post("/notifications/send-reminders")
async def send_scheduled_reminders(data: dict = None):
    """
    Endpoint to send scheduled demo reminders.
    Can be called by a cron job every 10 minutes.
    
    Sends:
    - 1 hour reminder (for all demos)
    - 30 min reminder (for offline demos)
    - 10 min reminder (for online demos)
    """
    now = datetime.now(timezone.utc)
    results = {"sent": [], "errors": []}
    
    # Get all upcoming demos
    upcoming_demos = await db.student_inquiries.find({
        "status": {"$in": ["new", "confirmed", "rescheduled"]},
        "demo_date": {"$exists": True},
        "demo_time": {"$exists": True}
    }, {"_id": 0}).to_list(500)
    
    for demo in upcoming_demos:
        try:
            # Parse demo datetime
            demo_date = demo.get("demo_date")
            demo_time = demo.get("demo_time")
            if not demo_date or not demo_time:
                continue
            
            demo_datetime_str = f"{demo_date}T{demo_time}:00"
            demo_datetime = datetime.fromisoformat(demo_datetime_str).replace(tzinfo=timezone.utc)
            
            # Calculate time until demo
            time_diff = (demo_datetime - now).total_seconds() / 60  # in minutes
            
            is_online = demo.get("learning_mode") == "online"
            student_phone = demo.get("phone")
            student_name = demo.get("name", "Student")
            skill = demo.get("skill", "Demo").title()
            
            # Get educator info
            educator = None
            if demo.get("assigned_educator_id"):
                educator = await db.educator_applications.find_one(
                    {"id": demo.get("assigned_educator_id")}, {"_id": 0}
                )
            
            reminders_sent = demo.get("reminders_sent", [])
            
            # 1 hour reminder (55-65 min window)
            if 55 <= time_diff <= 65 and "1hr" not in reminders_sent:
                if student_phone:
                    await send_whatsapp_notification(
                        student_phone, "student_reminder_1hr",
                        [student_name, skill, demo_time], student_name
                    )
                if educator and educator.get("phone"):
                    await send_whatsapp_notification(
                        educator.get("phone"), "educator_reminder_1hr",
                        [educator.get("name"), student_name, skill, demo_time],
                        educator.get("name")
                    )
                await db.student_inquiries.update_one(
                    {"id": demo.get("id")},
                    {"$push": {"reminders_sent": "1hr"}}
                )
                results["sent"].append(f"1hr reminder for {demo.get('id')}")
            
            # 30 min reminder (for offline only, 25-35 min window)
            if not is_online and 25 <= time_diff <= 35 and "30min" not in reminders_sent:
                if student_phone:
                    await send_whatsapp_notification(
                        student_phone, "student_reminder_30min_offline",
                        [student_name, skill, demo_time], student_name
                    )
                if educator and educator.get("phone"):
                    await send_whatsapp_notification(
                        educator.get("phone"), "educator_reminder_30min_offline",
                        [educator.get("name"), student_name, skill, demo_time],
                        educator.get("name")
                    )
                await db.student_inquiries.update_one(
                    {"id": demo.get("id")},
                    {"$push": {"reminders_sent": "30min"}}
                )
                results["sent"].append(f"30min offline reminder for {demo.get('id')}")
            
            # 10 min reminder (for online only, 8-12 min window)
            if is_online and 8 <= time_diff <= 12 and "10min" not in reminders_sent:
                if student_phone:
                    await send_whatsapp_notification(
                        student_phone, "student_reminder_10min_online",
                        [student_name, skill, demo_time], student_name
                    )
                if educator and educator.get("phone"):
                    await send_whatsapp_notification(
                        educator.get("phone"), "educator_reminder_10min_online",
                        [educator.get("name"), student_name, skill, demo_time],
                        educator.get("name")
                    )
                await db.student_inquiries.update_one(
                    {"id": demo.get("id")},
                    {"$push": {"reminders_sent": "10min"}}
                )
                results["sent"].append(f"10min online reminder for {demo.get('id')}")
                
        except Exception as e:
            results["errors"].append(f"Error for demo {demo.get('id')}: {str(e)}")
    
    return results

# ========================
# EDUCATOR APPLICATION MANAGEMENT (For Admin)
# ========================

class EducatorDemoRating(BaseModel):
    """Rating structure for educator demo evaluation"""
    personality: dict  # {score: 1-5, sub_scores: {confidence: 1-5, enthusiasm: 1-5, professionalism: 1-5}}
    communication: dict  # {score: 1-5, sub_scores: {clarity: 1-5, engagement: 1-5, responsiveness: 1-5}}
    expertise: dict  # {score: 1-5, sub_scores: {subject_knowledge: 1-5, teaching_methodology: 1-5, problem_solving: 1-5}}
    technical: dict  # {webcam: bool, mic: bool, internet: str, notes: str}
    overall_score: float
    feedback: str = ""
    recommendation: str = ""  # onboard, reject, retake

@api_router.post("/educators/complete-demo/{app_id}")
async def complete_educator_demo_with_rating(
    app_id: str, 
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Mark educator demo as completed with detailed rating"""
    # Get the application
    application = await db.educator_applications.find_one({"id": app_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Calculate overall score from ratings
    rating_data = data.get("rating", {})
    personality = rating_data.get("personality", {})
    communication = rating_data.get("communication", {})
    expertise = rating_data.get("expertise", {})
    technical = rating_data.get("technical", {})
    
    # Calculate average scores
    personality_score = personality.get("score", 3)
    communication_score = communication.get("score", 3)
    expertise_score = expertise.get("score", 3)
    
    overall_score = round((personality_score + communication_score + expertise_score) / 3, 1)
    
    demo_rating = {
        "personality": personality,
        "communication": communication,
        "expertise": expertise,
        "technical": technical,
        "overall_score": overall_score,
        "feedback": data.get("feedback", ""),
        "recommendation": data.get("recommendation", "pending"),
        "rated_by": user.get("name", "Admin"),
        "rated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Determine new status based on recommendation
    new_status = "demo_completed"
    if data.get("recommendation") == "onboard":
        new_status = "onboarded"
    elif data.get("recommendation") == "reject":
        new_status = "archived"
    
    # Update the application
    update_data = {
        "status": new_status,
        "demo_rating": demo_rating,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if new_status == "onboarded":
        update_data["onboarding_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.educator_applications.update_one(
        {"id": app_id},
        {"$set": update_data, "$push": {
            "comments": {
                "id": str(uuid.uuid4()),
                "text": f"Demo completed. Overall Score: {overall_score}/5. Recommendation: {data.get('recommendation', 'pending')}",
                "author": user.get("name", "Admin"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    
    return {
        "message": "Demo rating saved successfully",
        "overall_score": overall_score,
        "new_status": new_status
    }

@api_router.get("/educators/my-application")
async def get_my_educator_application(user: dict = Depends(get_current_user)):
    """Get educator's own application details"""
    educator_id = user.get("educator_id") or user.get("id")
    phone = user.get("phone")
    email = user.get("email")
    
    # Find by id, phone, or email
    application = None
    if educator_id:
        application = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
    if not application and phone:
        application = await db.educator_applications.find_one({"phone": phone}, {"_id": 0})
    if not application and email:
        application = await db.educator_applications.find_one({"email": email}, {"_id": 0})
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Generate meeting link if not present
    if not application.get("meeting_link"):
        application["meeting_link"] = generate_meeting_link(application["id"])
    
    return application

# Open Requirements
@api_router.get("/requirements", response_model=List[OpenRequirement])
async def get_open_requirements(city: Optional[str] = None, skill: Optional[str] = None):
    query = {"is_active": True}
    if city:
        query["city"] = city
    if skill:
        query["skill"] = skill
    requirements = await db.open_requirements.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for req in requirements:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
    return requirements

@api_router.get("/requirements/{req_id}")
async def get_single_requirement(req_id: str):
    """Public: get a single requirement by ID"""
    req = await db.open_requirements.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    if isinstance(req.get('created_at'), str):
        req['created_at'] = datetime.fromisoformat(req['created_at'])
    return req

async def notify_educators_new_requirement(requirement: dict):
    """Background task: send email to all educators when a new requirement is posted."""
    try:
        await ensure_resend_api_key()
        # Fetch all educators that should be notified
        target_statuses = ['new', 'demo_scheduled', 'hr_done', 'tech_scheduled', 'demo_completed', 'onboarded', 'active']
        educators = await db.educator_applications.find(
            {"status": {"$in": target_statuses}, "email": {"$exists": True, "$ne": ""}},
            {"_id": 0, "name": 1, "email": 1}
        ).to_list(1000)

        if not educators:
            logging.info("[REQ_NOTIFY] No educators to notify")
            return

        req_id = requirement.get("id", "")
        frontend_url = os.environ.get("FRONTEND_URL", "https://multi-funnel-oll.preview.emergentagent.com")
        apply_link = f"{frontend_url}/educator/apply/{req_id}"

        pay_text = ""
        if requirement.get("pay_amount"):
            pay_type_label = {"per_session": "per session", "per_day": "per day", "per_month": "per month"}.get(requirement.get("pay_type", ""), "")
            pay_text = f"<p style='margin:5px 0;'><strong>Pay:</strong> ₹{requirement['pay_amount']} {pay_type_label}</p>"

        timing_text = ""
        if requirement.get("timing_from") and requirement.get("timing_to"):
            timing_text = f"<p style='margin:5px 0;'><strong>Timing:</strong> {requirement['timing_from']} – {requirement['timing_to']}</p>"

        days_text = ""
        if requirement.get("days"):
            days_text = f"<p style='margin:5px 0;'><strong>Days:</strong> {', '.join(requirement['days'])}</p>"

        sent_count = 0
        for educator in educators:
            try:
                name = educator.get("name", "Educator")
                email = educator.get("email", "")
                if not email:
                    continue

                html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #1E3A5F 0%, #D63031 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">OLL</h1>
                        <p style="color: #f0f0f0; margin: 6px 0 0 0; font-size: 14px;">New Teaching Opportunity</p>
                    </div>
                    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #1E3A5F; margin-top: 0;">Hi {name}! 👋</h2>
                        <p style="color: #444; line-height: 1.6;">We just posted a new teaching opportunity that you or someone you know might be a great fit for:</p>

                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D63031;">
                            <h3 style="color: #1E3A5F; margin-top: 0; font-size: 18px;">{requirement.get('title', 'New Opening')}</h3>
                            <p style="margin:5px 0;"><strong>Skill:</strong> {requirement.get('skill', '')}</p>
                            <p style="margin:5px 0;"><strong>Location:</strong> {requirement.get('city', '')}{(' – ' + requirement.get('area', '')) if requirement.get('area') else ''}</p>
                            <p style="margin:5px 0;"><strong>Positions:</strong> {requirement.get('positions', 1)}</p>
                            {pay_text}
                            {timing_text}
                            {days_text}
                            {('<p style="margin:10px 0 0 0; color:#555;">' + requirement.get('description','') + '</p>') if requirement.get('description') else ''}
                        </div>

                        <p style="color: #444; line-height: 1.6; font-size: 15px;">
                            <strong>Know someone perfect for this role?</strong> Share the link below — you'll be helping a great candidate find their opportunity!
                        </p>

                        <div style="text-align: center; margin: 28px 0;">
                            <a href="{apply_link}" style="background: #D63031; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                                Apply or Refer a Candidate →
                            </a>
                        </div>

                        <p style="color: #888; font-size: 13px; line-height: 1.6;">
                            Or copy this link: <a href="{apply_link}" style="color: #D63031;">{apply_link}</a>
                        </p>

                        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                        <p style="color: #999; font-size: 12px; margin: 0;">You're receiving this because you're part of the OLL Educator community. Thank you for being with us!</p>
                    </div>
                    <div style="text-align: center; padding: 16px; color: #bbb; font-size: 11px;">
                        © 2026 OLL. All rights reserved.
                    </div>
                </div>
                """

                params = {
                    "from": "OLL Team <welcome@oll.co>",
                    "to": [email],
                    "subject": f"New Opening: {requirement.get('title', 'Teaching Opportunity')} — Refer or Apply",
                    "html": html,
                    "reply_to": "info@oll.co"
                }
                await asyncio.to_thread(resend.Emails.send, params)
                sent_count += 1
                await asyncio.sleep(0.1)  # small delay to avoid rate limits
            except Exception as e:
                logging.error(f"[REQ_NOTIFY] Failed to email {educator.get('email')}: {e}")

        logging.info(f"[REQ_NOTIFY] Sent new requirement notification to {sent_count}/{len(educators)} educators")
    except Exception as e:
        logging.error(f"[REQ_NOTIFY] Background task failed: {e}")

@api_router.post("/requirements", response_model=OpenRequirement)
async def create_requirement(data: OpenRequirementCreate, user: dict = Depends(get_current_user), background_tasks: BackgroundTasks = None):
    requirement = OpenRequirement(**data.model_dump())
    doc = requirement.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.open_requirements.insert_one(doc)
    # Send email notifications to all educators in background
    if background_tasks:
        background_tasks.add_task(notify_educators_new_requirement, requirement.model_dump())
    return requirement

@api_router.patch("/requirements/{req_id}", response_model=OpenRequirement)
async def update_requirement(
    req_id: str, 
    data: OpenRequirementUpdate,
    user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.open_requirements.update_one({"id": req_id}, {"$set": update_data})
    requirement = await db.open_requirements.find_one({"id": req_id}, {"_id": 0})
    if isinstance(requirement.get('created_at'), str):
        requirement['created_at'] = datetime.fromisoformat(requirement['created_at'])
    return requirement

@api_router.delete("/requirements/{req_id}")
async def delete_requirement(req_id: str, user: dict = Depends(get_current_user)):
    await db.open_requirements.delete_one({"id": req_id})
    return {"message": "Deleted successfully"}

# ========================
# TEAM REQUIREMENTS (Keep separate from main TeamApplication endpoints)
# ========================

class TeamRequirement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    type: str = "Full-time"  # Full-time, Part-time, Internship, Freelance
    city: str = "Remote"
    skills_required: List[str] = []
    responsibilities: str = ""
    qualifications: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.patch("/team-applications/{app_id}")
async def update_team_application(app_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a team application status or add notes"""
    update_data = {k: v for k, v in data.items() if v is not None and k != "id"}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If adding a note
    if "note" in data:
        await db.team_applications.update_one(
            {"id": app_id},
            {"$push": {"notes": {
                "id": str(uuid.uuid4()),
                "text": data["note"],
                "author": user.get("name", "Admin"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }}}
        )
    
    if update_data:
        await db.team_applications.update_one({"id": app_id}, {"$set": update_data})
    
    application = await db.team_applications.find_one({"id": app_id}, {"_id": 0})
    return application

@api_router.get("/team-requirements")
async def get_team_requirements(all: bool = False):
    """Get team requirements/open positions. By default returns only active ones."""
    query = {} if all else {"is_active": True}
    requirements = await db.team_requirements.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return requirements

@api_router.post("/team-requirements")
async def create_team_requirement(data: dict, user: dict = Depends(get_current_user)):
    """Create a new team requirement (admin only)"""
    requirement = TeamRequirement(
        title=data.get("title", ""),
        description=data.get("description", ""),
        type=data.get("type", "Full-time"),
        city=data.get("city", "Remote"),
        skills_required=data.get("skills_required", []),
        responsibilities=data.get("responsibilities", ""),
        qualifications=data.get("qualifications", ""),
        is_active=data.get("is_active", True)
    )
    
    doc = requirement.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.team_requirements.insert_one(doc)
    
    return requirement

@api_router.patch("/team-requirements/{req_id}")
async def update_team_requirement(req_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a team requirement"""
    update_data = {k: v for k, v in data.items() if v is not None and k != "id"}
    await db.team_requirements.update_one({"id": req_id}, {"$set": update_data})
    requirement = await db.team_requirements.find_one({"id": req_id}, {"_id": 0})
    return requirement

@api_router.delete("/team-requirements/{req_id}")
async def delete_team_requirement(req_id: str, user: dict = Depends(get_current_user)):
    """Delete a team requirement"""
    await db.team_requirements.delete_one({"id": req_id})
    return {"message": "Deleted successfully"}

# ========================
# SCHOOL CASE STUDIES
# ========================

@api_router.get("/case-studies")
async def get_case_studies(all: bool = False):
    query = {} if all else {"is_active": True}
    case_studies = await db.case_studies.find(query, {"_id": 0}).sort("order", 1).to_list(50)
    return case_studies

@api_router.post("/case-studies")
async def create_case_study(data: dict, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "school_name": data.get("school_name", ""),
        "video_id": data.get("video_id", ""),
        "description": data.get("description", ""),
        "order": data.get("order", 0),
        "is_active": data.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email")
    }
    await db.case_studies.insert_one(doc)
    return {"message": "Case study created", "id": doc["id"]}

@api_router.patch("/case-studies/{study_id}")
async def update_case_study(study_id: str, data: dict, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.items() if k != "id"}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.case_studies.update_one({"id": study_id}, {"$set": update_data})
    study = await db.case_studies.find_one({"id": study_id}, {"_id": 0})
    return study

@api_router.delete("/case-studies/{study_id}")
async def delete_case_study(study_id: str, user: dict = Depends(get_current_user)):
    await db.case_studies.delete_one({"id": study_id})
    return {"message": "Deleted successfully"}

# Educator Form Configuration
@api_router.get("/educator-config")
async def get_educator_config():
    """Get dynamic configuration for educator application form"""
    config = await db.educator_config.find_one({"type": "form_config"}, {"_id": 0})
    if not config:
        # Return default config
        return {
            "skills": ["Robotics", "Coding", "AI & ML", "Entrepreneurship", "Financial Literacy", "Other"],
            "grades": ["Pre-primary", "Primary (1-5)", "Middle (6-8)", "High School (9-10)", "Senior (11-12)"],
            "availability_options": ["Weekday Mornings", "Weekday Afternoons", "Weekday Evenings", "Weekends"],
            "experience_options": ["0-1 years", "1-3 years", "3-5 years", "5+ years"],
            "required_fields": ["name", "email", "phone", "skills"],
            "optional_fields": ["experience", "grades_comfortable", "city", "availability"]
        }
    # Ensure "Other" is always in the skills list
    if "skills" in config and "Other" not in config["skills"]:
        config["skills"].append("Other")
    return config

@api_router.put("/educator-config")
async def update_educator_config(data: dict, user: dict = Depends(get_current_user)):
    """Update educator form configuration"""
    data["type"] = "form_config"
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.educator_config.update_one(
        {"type": "form_config"}, 
        {"$set": data}, 
        upsert=True
    )
    return {"message": "Configuration updated"}

# ========================
# FAQ ENDPOINTS
# ========================

@api_router.get("/faqs", response_model=List[FAQ])
async def get_faqs(category: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    faqs = await db.faqs.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return faqs

@api_router.post("/faqs", response_model=FAQ)
async def create_faq(data: FAQCreate, user: dict = Depends(get_current_user)):
    faq = FAQ(**data.model_dump())
    doc = faq.model_dump()
    await db.faqs.insert_one(doc)
    return faq

@api_router.patch("/faqs/{faq_id}", response_model=FAQ)
async def update_faq(faq_id: str, data: FAQUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.faqs.update_one({"id": faq_id}, {"$set": update_data})
    faq = await db.faqs.find_one({"id": faq_id}, {"_id": 0})
    return faq

@api_router.delete("/faqs/{faq_id}")
async def delete_faq(faq_id: str, user: dict = Depends(get_current_user)):
    await db.faqs.delete_one({"id": faq_id})
    return {"message": "Deleted successfully"}

# ========================
# BLOG ENDPOINTS
# ========================

@api_router.get("/blogs", response_model=List[Blog])
async def get_blogs(category: Optional[str] = None, published_only: bool = True, blog_type: Optional[str] = None):
    # Check cache for published blogs list
    if published_only and not category and not blog_type:
        cache_key = "blogs_published_all"
        cached = get_cached(cache_key)
        if cached:
            return cached
    
    query = {}
    if published_only:
        query["is_published"] = True
    if category:
        query["category"] = category
    if blog_type:
        query["blog_type"] = blog_type
    blogs = await db.blogs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for blog in blogs:
        if isinstance(blog.get('created_at'), str):
            blog['created_at'] = datetime.fromisoformat(blog['created_at'])
        if isinstance(blog.get('updated_at'), str):
            blog['updated_at'] = datetime.fromisoformat(blog['updated_at'])
    
    # Cache if it's the common case (all published blogs)
    if published_only and not category and not blog_type:
        set_cached("blogs_published_all", blogs, 300)  # 5 min cache
    
    return blogs

@api_router.get("/blogs/{slug}", response_model=Blog)
async def get_blog(slug: str):
    # Check cache first
    cache_key = f"blog_{slug}"
    cached = get_cached(cache_key)
    if cached:
        return cached
    
    blog = await db.blogs.find_one({"slug": slug}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if isinstance(blog.get('created_at'), str):
        blog['created_at'] = datetime.fromisoformat(blog['created_at'])
    if isinstance(blog.get('updated_at'), str):
        blog['updated_at'] = datetime.fromisoformat(blog['updated_at'])
    
    # Cache for 5 minutes
    set_cached(cache_key, blog, 300)
    return blog

@api_router.post("/blogs", response_model=Blog)
async def create_blog(data: BlogCreate, user: dict = Depends(get_current_user)):
    blog = Blog(**data.model_dump())
    doc = blog.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.blogs.insert_one(doc)
    return blog

@api_router.patch("/blogs/{blog_id}", response_model=Blog)
async def update_blog(blog_id: str, data: BlogUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.blogs.update_one({"id": blog_id}, {"$set": update_data})
    # Clear blog cache
    clear_cache("blog_")
    clear_cache("blogs_")
    blog = await db.blogs.find_one({"id": blog_id}, {"_id": 0})
    if isinstance(blog.get('created_at'), str):
        blog['created_at'] = datetime.fromisoformat(blog['created_at'])
    if isinstance(blog.get('updated_at'), str):
        blog['updated_at'] = datetime.fromisoformat(blog['updated_at'])
    return blog

@api_router.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: str, user: dict = Depends(get_current_user)):
    await db.blogs.delete_one({"id": blog_id})
    return {"message": "Deleted successfully"}

# ========================
# SUPPORT TICKET ENDPOINTS
# ========================

@api_router.post("/support/ticket", response_model=SupportTicket)
async def create_support_ticket(data: SupportTicketCreate):
    ticket = SupportTicket(**data.model_dump())
    doc = ticket.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.support_tickets.insert_one(doc)
    return ticket

# School Support Query (for ongoing class issues)
class SchoolSupportQuery(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # kit, teacher, lms, payment
    sub_category: str = ""
    sub_sub_category: str = ""
    school_name: str
    class_division: str
    contact_name: str
    phone: str
    email: str = ""
    details: str = ""
    reason: str = ""
    status: str = "new"  # new, in_progress, resolved
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.post("/support/school-query")
async def create_school_support_query(data: dict):
    query = SchoolSupportQuery(**data)
    doc = query.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.school_support_queries.insert_one(doc)
    return {"message": "Query submitted successfully", "id": query.id}

# General Support Query (demo, ongoing classes, school, other)
@api_router.post("/support/query")
async def create_support_query(data: dict):
    data['id'] = str(uuid.uuid4())
    data['status'] = 'open'
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.support_queries.insert_one(data)
    return {"message": "Query submitted successfully", "id": data['id']}

@api_router.get("/support/queries")
async def get_support_queries(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    my_tickets: bool = False,
    user: dict = Depends(get_current_user)
):
    """Get support queries - filters by assigned_to OR viewers for non-admin users"""
    query = {}
    if status:
        query["status"] = status
    
    # If my_tickets is true or user is not admin, filter by assigned_to OR viewers
    user_role = user.get("role", "")
    user_id = user.get("id") or user.get("email")
    
    if my_tickets or (user_role not in ["admin", "super_admin"]):
        # For center users, team users, etc. - show tickets assigned to them OR where they are viewers OR created by them
        query["$or"] = [
            {"assigned_to": user_id},
            {"viewers": user_id},
            {"created_by": user_id},
            {"created_by": user.get("email")}
        ]
    elif assigned_to:
        query["assigned_to"] = assigned_to
        
    queries = await db.support_queries.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return queries

@api_router.patch("/support/queries/{query_id}")
async def update_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a support query status"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user.get("email", "admin")
    
    # Track status change in activity history
    if "status" in data:
        activity = {
            "type": "status_change",
            "new_status": data["status"],
            "by": user.get("name", user.get("email", "admin")),
            "date": datetime.now(timezone.utc).isoformat()
        }
        await db.support_queries.update_one(
            {"id": query_id},
            {"$set": update_data, "$push": {"activity_history": activity}}
        )
    else:
        await db.support_queries.update_one({"id": query_id}, {"$set": update_data})
    
    return {"message": "Query updated successfully"}

@api_router.post("/support/queries/{query_id}/assign")
async def assign_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Assign a support query to a user with optional deadline and send notifications"""
    assigned_to = data.get("assigned_to")
    deadline = data.get("deadline")  # ISO format datetime string
    
    # Get the query
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Handle unassign case
    if not assigned_to or assigned_to == "":
        await db.support_queries.update_one(
            {"id": query_id}, 
            {"$set": {"assigned_to": None, "deadline": None}}
        )
        return {"message": "Query unassigned"}
    
    # Get the user being assigned
    assignee = await db.team_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.center_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.admins.find_one({"id": assigned_to}, {"_id": 0})
    
    assignee_name = assignee.get("name", "Team Member") if assignee else "Unknown"
    
    # Update the query with assignment and activity history
    update_data = {
        "assigned_to": assigned_to,
        "assigned_to_name": assignee_name,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "assigned_by": user.get("email", "admin"),
        "deadline": deadline,
        "status": "in_progress" if query.get("status") == "open" else query.get("status")
    }
    
    activity = {
        "type": "assigned",
        "assigned_to": assigned_to,
        "assigned_to_name": assignee_name,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_queries.update_one(
        {"id": query_id}, 
        {"$set": update_data, "$push": {"activity_history": activity}}
    )
    
    # Send notifications to the assignee
    if assignee:
        assignee_phone = assignee.get("phone", "")
        assignee_email = assignee.get("email", "")
        
        query_type = query.get("query_type", query.get("type", "Support Request"))
        query_details = query.get("message", query.get("query", ""))[:100]
        deadline_str = deadline if deadline else "As soon as possible"
        
        print(f"[ASSIGN] Attempting to notify {assignee_name} (phone: {assignee_phone}, email: {assignee_email})")
        
        # Send WhatsApp notification
        # The support_ticket_added template expects: [Name, TicketID, Subject, Priority, CustomerName]
        if assignee_phone:
            try:
                ticket_id = query_id[:8].upper()
                subject = query.get("query_type", "Support Request")
                priority = query.get("priority", "normal").upper()
                customer_name = query.get("name", "Customer")
                
                result = await send_whatsapp_notification(
                    assignee_phone,
                    "ticket_assigned",
                    params=[assignee_name, ticket_id, subject, priority, customer_name],
                    user_name=assignee_name
                )
                print(f"[ASSIGN] WhatsApp result: {result}")
            except Exception as e:
                print(f"[ASSIGN] Failed to send WhatsApp: {e}")
        else:
            print(f"[ASSIGN] No phone number for {assignee_name}, skipping WhatsApp")
        
        # Send Email notification using resend
        if assignee_email and resend.api_key:
            try:
                email_params = {
                    "from": SENDER_EMAIL,
                    "to": [assignee_email],
                    "subject": f"New Support Ticket Assigned - {query_type}",
                    "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1E3A5F;">New Support Ticket Assigned</h2>
                        <p>Hi {assignee_name},</p>
                        <p>A new support ticket has been assigned to you:</p>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Type:</strong> {query_type}</p>
                            <p><strong>Details:</strong> {query_details}...</p>
                            <p><strong>Customer:</strong> {query.get("name", "Customer")} ({query.get("phone", "N/A")})</p>
                            <p><strong>Deadline:</strong> {deadline_str}</p>
                        </div>
                        <p>Please resolve this ticket before the deadline.</p>
                        <p>Best regards,<br>OLL Team</p>
                    </div>
                    """
                }
                await asyncio.to_thread(resend.Emails.send, email_params)
            except Exception as e:
                print(f"Failed to send email: {e}")
    
    return {"message": "Query assigned successfully", "assigned_to": assigned_to}

@api_router.post("/support/queries/{query_id}/notes")
async def add_query_note(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a note to a support query"""
    note = {
        "id": str(uuid.uuid4()),
        "text": data.get("text", ""),
        "by": user.get("name", user.get("email", "admin")),
        "by_id": user.get("id", user.get("email")),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add note and activity history entry
    activity = {
        "type": "note_added",
        "note_id": note["id"],
        "note_preview": note["text"][:100] if note["text"] else "",
        "by": note["by"],
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_queries.update_one(
        {"id": query_id},
        {
            "$push": {"notes": note, "activity_history": activity},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat(), "latest_note": note["text"]}
        }
    )
    return {"message": "Note added successfully", "note": note}

@api_router.delete("/support/queries/{query_id}/notes/{note_id}")
async def delete_query_note(query_id: str, note_id: str, user: dict = Depends(get_current_user)):
    """Delete a note from a support query"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Add activity history entry
    activity = {
        "type": "note_deleted",
        "note_id": note_id,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_queries.update_one(
        {"id": query_id},
        {
            "$pull": {"notes": {"id": note_id}},
            "$push": {"activity_history": activity},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    return {"message": "Note deleted successfully"}

@api_router.get("/support/queries/{query_id}")
async def get_query_by_id(query_id: str, user: dict = Depends(get_current_user)):
    """Get a single support query with all its data including replies"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    return query


@api_router.post("/support/queries/{query_id}/replies")
async def add_query_reply(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a reply to a support query (chat-style)"""
    reply = {
        "id": str(uuid.uuid4()),
        "text": data.get("text", ""),
        "by": user.get("name", user.get("email", "admin")),
        "by_id": user.get("id", user.get("email")),
        "role": user.get("role", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "attachment": data.get("attachment")  # {url, filename, original_name, type}
    }
    
    # Add reply and activity history entry
    activity = {
        "type": "reply_added",
        "reply_id": reply["id"],
        "reply_preview": reply["text"][:100] if reply["text"] else "",
        "by": reply["by"],
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    # Update query - also set status to in_progress if currently new
    update = {
        "$push": {"replies": reply, "activity_history": activity},
        "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
    }
    
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if query and query.get("status") == "new":
        update["$set"]["status"] = "in_progress"
    
    await db.support_queries.update_one({"id": query_id}, update)
    return {"message": "Reply added successfully", "reply": reply}

@api_router.get("/support/queries/{query_id}/history")
async def get_query_history(query_id: str, user: dict = Depends(get_current_user)):
    """Get activity history for a support query"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    history = []
    
    # Add creation event
    history.append({
        "type": "created",
        "description": f"Query created by {query.get('created_by', 'User')}",
        "date": query.get("created_at", ""),
        "by": query.get("created_by", "User")
    })
    
    # Add activity history from database
    activity_history = query.get("activity_history", [])
    for activity in activity_history:
        if activity.get("type") == "status_change":
            history.append({
                "type": "status_change",
                "description": f"Status changed to {activity.get('new_status', 'unknown')}",
                "date": activity.get("date", ""),
                "by": activity.get("by", "Admin")
            })
        elif activity.get("type") == "note_added":
            history.append({
                "type": "note_added",
                "description": f"Note added: {activity.get('note_preview', '')}...",
                "date": activity.get("date", ""),
                "by": activity.get("by", "Admin")
            })
        elif activity.get("type") == "assigned":
            history.append({
                "type": "assigned",
                "description": f"Assigned to {activity.get('assigned_to_name', activity.get('assigned_to', 'unknown'))}",
                "date": activity.get("date", ""),
                "by": activity.get("by", "Admin")
            })
    
    # Add notes as history items (in case they're not in activity_history)
    notes = query.get("notes", [])
    for note in notes:
        # Check if not already in history
        note_exists = any(h.get("type") == "note_added" and h.get("date") == note.get("created_at") for h in history)
        if not note_exists:
            history.append({
                "type": "note_added",
                "description": f"Note: {note.get('text', '')[:100]}...",
                "date": note.get("created_at", ""),
                "by": note.get("by", "Unknown")
            })
    
    # Sort by date descending
    history.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return {"query_id": query_id, "history": history, "notes": notes}

@api_router.put("/support/queries/{query_id}")
async def edit_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Edit/update a support query"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Track what changed
    changes = []
    update_data = {}
    
    editable_fields = ["name", "phone", "email", "query_type", "inquiry_type", "message", "priority", "source"]
    for field in editable_fields:
        if field in data and data[field] != query.get(field):
            changes.append(f"{field}: '{query.get(field, '')}' -> '{data[field]}'")
            update_data[field] = data[field]
    
    if not update_data:
        return {"message": "No changes detected"}
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user.get("email", "admin")
    
    # Add activity history
    activity = {
        "type": "edited",
        "changes": changes,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_queries.update_one(
        {"id": query_id},
        {"$set": update_data, "$push": {"activity_history": activity}}
    )
    
    return {"message": "Query updated successfully", "changes": changes}

@api_router.delete("/support/queries/{query_id}")
async def delete_support_query(query_id: str, user: dict = Depends(get_current_user)):
    """Delete a support query"""
    # Only admin can delete
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete queries")
    
    result = await db.support_queries.delete_one({"id": query_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return {"message": "Query deleted successfully"}

@api_router.post("/support/queries/{query_id}/viewers")
async def manage_query_viewers(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add or remove viewers from a support query"""
    action = data.get("action", "add")  # "add" or "remove"
    viewer_id = data.get("viewer_id")
    
    if not viewer_id:
        raise HTTPException(status_code=400, detail="viewer_id is required")
    
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Get viewer name for activity log
    viewer = await db.team_users.find_one({"id": viewer_id}, {"_id": 0})
    if not viewer:
        viewer = await db.admins.find_one({"id": viewer_id}, {"_id": 0})
    viewer_name = viewer.get("name", "Unknown") if viewer else "Unknown"
    
    activity = {
        "type": "viewer_added" if action == "add" else "viewer_removed",
        "viewer_id": viewer_id,
        "viewer_name": viewer_name,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    if action == "add":
        await db.support_queries.update_one(
            {"id": query_id},
            {
                "$addToSet": {"viewers": viewer_id},
                "$push": {"activity_history": activity},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return {"message": f"Viewer {viewer_name} added successfully"}
    else:
        await db.support_queries.update_one(
            {"id": query_id},
            {
                "$pull": {"viewers": viewer_id},
                "$push": {"activity_history": activity},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return {"message": f"Viewer {viewer_name} removed successfully"}

@api_router.get("/support/queries/{query_id}/viewers")
async def get_query_viewers(query_id: str, user: dict = Depends(get_current_user)):
    """Get list of viewers for a support query with their details"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    viewer_ids = query.get("viewers", [])
    viewers = []
    
    for vid in viewer_ids:
        viewer = await db.team_users.find_one({"id": vid}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if not viewer:
            viewer = await db.admins.find_one({"id": vid}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if viewer:
            viewers.append(viewer)
    
    return {
        "query_id": query_id,
        "viewers": viewers,
        "created_by": query.get("created_by"),
        "created_by_name": query.get("created_by_name")
    }

@api_router.get("/support/school-queries")
async def get_school_support_queries(user: dict = Depends(get_current_user)):
    queries = await db.school_support_queries.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return queries

@api_router.get("/support/tickets")
async def get_support_tickets(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"source": {"$ne": "tracking_page"}}  # Exclude tracking page tickets
    if status:
        query["status"] = status
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for ticket in tickets:
        if isinstance(ticket.get('created_at'), str):
            try:
                ticket['created_at'] = datetime.fromisoformat(ticket['created_at'].replace('Z', '+00:00'))
            except:
                pass
        # Normalize fields for school_crm tickets
        if ticket.get('source') == 'school_crm':
            ticket['name'] = ticket.get('contact_name', ticket.get('school_name', ''))
            ticket['email'] = ticket.get('contact_email', '')
            ticket['phone'] = ticket.get('contact_phone', '')
            ticket['message'] = ticket.get('description', '')
            ticket['user_type'] = 'school'
            ticket['query_type'] = ticket.get('query_type', 'general')
    return tickets

@api_router.patch("/support/tickets/{ticket_id}")
async def update_support_ticket(ticket_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a support ticket"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user.get("email", "admin")
    
    # Track activity if status changed
    if "status" in data:
        activity = {
            "type": "status_change",
            "old_status": "",  # Will be filled if we want to track old status
            "new_status": data["status"],
            "by": user.get("name", user.get("email", "admin")),
            "date": datetime.now(timezone.utc).isoformat()
        }
        await db.support_tickets.update_one(
            {"id": ticket_id}, 
            {"$push": {"activity_history": activity}, "$set": update_data}
        )
    else:
        await db.support_tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    # Send notification if ticket is being assigned to someone
    if "assigned_to" in data and data.get("assigned_to"):
        # Get the updated ticket
        ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
        # Get assignee from team_users or users
        assignee = await db.team_users.find_one({"id": data["assigned_to"]}, {"_id": 0})
        if not assignee:
            assignee = await db.users.find_one({"id": data["assigned_to"]}, {"_id": 0})
        if assignee and assignee.get('phone') and ticket:
            await send_support_ticket_notification(ticket, assignee)
            print(f"Ticket assignment notification sent to {assignee.get('name')} at {assignee.get('phone')}")
    
    return {"message": "Updated successfully"}

# ========================
# ADMIN CREATE SUPPORT TICKET
# ========================

@api_router.post("/support/queries/create")
async def create_support_query(data: dict, user: dict = Depends(get_current_user)):
    """Create a new support query from admin"""
    query_id = str(uuid.uuid4())
    user_id = user.get("id") or user.get("email")
    
    # Initialize viewers with the creator
    viewers = [user_id] if user_id else []
    
    doc = {
        "id": query_id,
        "name": data.get("name", ""),
        "phone": data.get("phone", ""),
        "email": data.get("email", ""),
        "query_type": data.get("query_type", "other"),
        "related_to": data.get("related_to", ""),  # Sub-category
        "inquiry_type": data.get("inquiry_type", "student"),
        "message": data.get("message", ""),
        "query_details": data.get("message", ""),  # Also store as query_details for consistency
        "priority": data.get("priority", "normal"),
        "status": "open",
        "source": data.get("source", "admin_created"),
        "attachments": data.get("attachments", []),  # [{name, url, type, is_voice_note}]
        "created_by": user_id,
        "created_by_name": user.get("name", "Admin"),
        "viewers": viewers,  # Array of user IDs who can view this query
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "comments": [],
        "assigned_to": data.get("assigned_to"),
    }
    await db.support_queries.insert_one(doc)
    
    # Send notification if assigned to someone
    if data.get("assigned_to"):
        assignee = await db.team_users.find_one({"id": data["assigned_to"]}, {"_id": 0})
        if not assignee:
            assignee = await db.users.find_one({"id": data["assigned_to"]}, {"_id": 0})
        if assignee and assignee.get('phone'):
            # Reuse ticket notification function
            ticket_data = {
                "id": query_id,
                "subject": data.get("query_type", "Support Query"),
                "priority": data.get("priority", "normal"),
                "school_name": data.get("name", "Customer"),
                "contact_name": data.get("name", "")
            }
            await send_support_ticket_notification(ticket_data, assignee)
            print(f"Query notification sent to {assignee.get('name')} at {assignee.get('phone')}")
    
    return {"message": "Query created successfully", "id": query_id}

# ========================
# BATCH MANAGEMENT
# ========================

@api_router.post("/batches")
async def create_batch(data: dict, user: dict = Depends(get_current_user)):
    """Create a new batch for student sessions"""
    batch_id = str(uuid.uuid4())
    doc = {
        "id": batch_id,
        "name": data.get("name", f"Batch-{batch_id[:8]}"),
        "skill": data.get("skill", ""),
        "start_date": data.get("start_date"),
        "days": data.get("days", []),  # ['monday', 'wednesday', 'friday']
        "time_slot": data.get("time_slot", ""),
        "num_sessions": data.get("num_sessions", 12),
        "educator_id": data.get("educator_id"),
        "educator_name": data.get("educator_name", ""),
        "mode": data.get("mode", "online"),  # online, offline, hybrid
        "status": "active",
        "students": [],  # List of student IDs
        "created_by": user.get("email", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.batches.insert_one(doc)
    return {"message": "Batch created successfully", "id": batch_id, "batch": {k: v for k, v in doc.items() if k != '_id'}}

@api_router.get("/batches")
async def get_batches(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all batches"""
    query = {}
    if status:
        query["status"] = status
    batches = await db.batches.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return batches

@api_router.get("/batches/{batch_id}")
async def get_batch(batch_id: str, user: dict = Depends(get_current_user)):
    """Get batch by ID"""
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch

@api_router.put("/batches/{batch_id}")
async def update_batch(batch_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update batch"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.batches.update_one({"id": batch_id}, {"$set": update_data})
    return {"message": "Batch updated successfully"}

@api_router.post("/batches/{batch_id}/add-student")
async def add_student_to_batch(batch_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a student to a batch and generate sessions"""
    student_id = data.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id is required")
    
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Add student to batch
    if student_id not in batch.get("students", []):
        await db.batches.update_one(
            {"id": batch_id},
            {"$push": {"students": student_id}}
        )
    
    # Generate sessions for this student
    sessions = await generate_student_sessions(batch, student_id)
    
    # Update student inquiry with batch info
    await db.student_inquiries.update_one(
        {"id": student_id},
        {"$set": {
            "batch_id": batch_id,
            "batch_name": batch.get("name"),
            "onboarding_status": "active",
            "sessions_total": len(sessions),
            "sessions_completed": 0,
        }}
    )
    
    return {"message": "Student added to batch", "sessions_created": len(sessions)}

async def generate_student_sessions(batch: dict, student_id: str):
    """Generate session records for a student based on batch config"""
    from datetime import datetime, timedelta
    
    sessions = []
    start_date = datetime.strptime(batch["start_date"], "%Y-%m-%d") if isinstance(batch["start_date"], str) else batch["start_date"]
    days_map = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
    batch_days = [days_map.get(d.lower(), 0) for d in batch.get("days", [])]
    
    num_sessions = batch.get("num_sessions", 12)
    current_date = start_date
    session_count = 0
    
    # Generate Jitsi room name for online sessions
    jitsi_room = f"oll-{batch['id'][:8]}-{student_id[:8]}" if batch.get("mode") == "online" else None
    
    while session_count < num_sessions:
        if current_date.weekday() in batch_days:
            session_id = str(uuid.uuid4())
            session = {
                "id": session_id,
                "batch_id": batch["id"],
                "student_id": student_id,
                "educator_id": batch.get("educator_id"),
                "educator_name": batch.get("educator_name"),
                "session_number": session_count + 1,
                "date": current_date.strftime("%Y-%m-%d"),
                "time": batch.get("time_slot", ""),
                "skill": batch.get("skill", ""),
                "mode": batch.get("mode", "online"),
                "status": "scheduled",  # scheduled, completed, cancelled, rescheduled
                "jitsi_room": jitsi_room,
                "jitsi_link": f"https://meet.jit.si/{jitsi_room}" if jitsi_room else None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.sessions.insert_one(session)
            sessions.append(session)
            session_count += 1
        current_date += timedelta(days=1)
    
    return sessions

@api_router.get("/sessions")
async def get_sessions(
    student_id: Optional[str] = None,
    educator_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get sessions with filters"""
    query = {}
    if student_id:
        query["student_id"] = student_id
    if educator_id:
        query["educator_id"] = educator_id
    if batch_id:
        query["batch_id"] = batch_id
    if status:
        query["status"] = status
    
    sessions = await db.sessions.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return sessions

@api_router.put("/sessions/{session_id}")
async def update_session(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a session status"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.sessions.update_one({"id": session_id}, {"$set": update_data})
    
    # If marking as completed, update student's completed count
    if data.get("status") == "completed":
        session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
        if session:
            await db.student_inquiries.update_one(
                {"id": session["student_id"]},
                {"$inc": {"sessions_completed": 1}}
            )
    
    return {"message": "Session updated successfully"}

@api_router.get("/user/my-sessions/{phone}")
async def get_user_sessions(phone: str):
    """Get sessions for a student by phone number (no auth required for user flow)"""
    # First find the student inquiry by phone
    student = await db.student_inquiries.find_one({"phone": phone, "status": "converted"}, {"_id": 0})
    
    if not student:
        return {"sessions": [], "student": None}
    
    # Get sessions for this student
    sessions = await db.sessions.find({"student_id": student["id"]}, {"_id": 0}).sort("date", 1).to_list(100)
    
    # Enrich sessions with batch info
    for session in sessions:
        if session.get("batch_id"):
            batch = await db.batches.find_one({"id": session["batch_id"]}, {"_id": 0, "name": 1, "skill": 1})
            if batch:
                session["batch_name"] = batch.get("name")
                session["skill"] = batch.get("skill") or session.get("skill")
    
    return {
        "sessions": sessions,
        "student": {
            "id": student.get("id"),
            "name": student.get("name"),
            "skill": student.get("skill"),
            "batch_id": student.get("batch_id"),
            "batch_name": student.get("batch_name"),
            "sessions_total": student.get("sessions_total", 0),
            "sessions_completed": student.get("sessions_completed", 0)
        }
    }

@api_router.get("/educator/my-sessions")
async def get_educator_sessions(user: dict = Depends(get_current_user)):
    """Get all sessions assigned to the logged-in educator"""
    educator_id = user.get("educator_id") or user.get("id")
    
    if not educator_id:
        # Try to find educator by email
        educator = await db.educator_applications.find_one({"email": user.get("email")}, {"_id": 0})
        if educator:
            educator_id = educator["id"]
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    # Get all sessions for this educator
    sessions = await db.sessions.find({"educator_id": educator_id}, {"_id": 0}).sort("date", 1).to_list(500)
    
    # Enrich with student and batch info
    for session in sessions:
        # Get student info
        if session.get("student_id"):
            student = await db.student_inquiries.find_one({"id": session["student_id"]}, {"_id": 0, "name": 1, "phone": 1, "email": 1})
            if student:
                session["student_name"] = student.get("name")
                session["student_phone"] = student.get("phone")
                session["student_email"] = student.get("email")
        
        # Get batch info
        if session.get("batch_id"):
            batch = await db.batches.find_one({"id": session["batch_id"]}, {"_id": 0, "name": 1, "skill": 1})
            if batch:
                session["batch_name"] = batch.get("name")
    
    return sessions

# ========================
# SCHOOL ONBOARDING
# ========================

@api_router.post("/schools/onboard")
async def onboard_school(data: dict, user: dict = Depends(get_current_user)):
    """Onboard a converted school with contract details"""
    school_id = data.get("school_id")
    if not school_id:
        raise HTTPException(status_code=400, detail="school_id is required")
    
    # Check if this is a draft save
    is_draft = data.get("is_draft", False)
    
    # Create onboarding record
    onboarding_id = str(uuid.uuid4())
    doc = {
        "id": onboarding_id,
        "school_id": school_id,
        "offering": data.get("offering", ""),  # Selected offering ID
        "model": data.get("model", ""),  # From school offerings
        "book_type": data.get("book_type", ""),  # e.g., Level 1, Beginner
        "kit_type": data.get("kit_type", ""),  # lab_setup, individual, no_kit
        "training_type": data.get("training_type", ""),  # student_training, teacher_training, both
        "grade_pricing": data.get("grade_pricing", []),  # [{grade: "1-5", students: 50, price_per_student: 500}]
        "total_students": data.get("total_students", 0),
        "total_amount": data.get("total_amount", 0),
        "school_contacts": data.get("school_contacts", []),  # [{name, phone, email, role}]
        "payment_mode": data.get("payment_mode", "from_school"),  # from_school, from_student, online
        "payment_method": data.get("payment_method", ""),  # cheque, neft, online, cash, student
        "payment_tranches": data.get("payment_tranches", []),  # [{percentage, amount, date, notes}]
        "deadline_date": data.get("deadline_date", ""),  # Deadline for online payments
        "contract_start": data.get("contract_start"),
        "contract_end": data.get("contract_end"),
        "mou_url": data.get("mou_url", ""),  # MOU document URL
        "status": "draft" if is_draft else "active",
        "is_draft": is_draft,
        "created_by": user.get("email", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.school_onboarding.insert_one(doc)
    
    # Build onboarding_data to store in school_inquiries for easy viewing
    onboarding_data = {
        "model": data.get("model"),
        "book_type": data.get("book_type"),
        "kit_type": data.get("kit_type"),
        "training_type": data.get("training_type"),
        "grade_pricing": data.get("grade_pricing", []),
        "total_students": data.get("total_students", 0),
        "total_amount": data.get("total_amount", 0),
        "school_contacts": data.get("school_contacts", []),
        "payment_mode": data.get("payment_mode"),
        "payment_method": data.get("payment_method"),
        "payment_tranches": data.get("payment_tranches", []),
        "deadline_date": data.get("deadline_date", ""),
        "contract_start": data.get("contract_start"),
        "contract_end": data.get("contract_end"),
        "mou_url": data.get("mou_url", ""),
    }
    
    # Update school inquiry with onboarding data
    update_fields = {
        "onboarding_id": onboarding_id,
        "onboarding_status": "draft" if is_draft else "active",
        "onboarding_data": onboarding_data,  # Store all onboarding details
        "model": data.get("model"),
        "total_students": data.get("total_students"),
    }
    if not is_draft:
        update_fields["status"] = "active"
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": update_fields}
    )
    
    # Auto-create GP Share and School Share expenses if they exist
    if not is_draft:
        school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "school_name": 1})
        school_name = school.get("school_name", "") if school else ""
        
        # Create GP Share expense if configured
        gp_share_amount = data.get("gp_share_amount", 0)
        if gp_share_amount and float(gp_share_amount) > 0:
            gp_expense = {
                "id": str(uuid.uuid4()),
                "school_id": school_id,
                "school_name": school_name,
                "category": "gp_share",
                "category_name": "GP Share",
                "amount": float(gp_share_amount),
                "description": f"Growth Partner share for conversion ({data.get('gp_share_type', 'amount')} - {data.get('gp_share_calc', 'lumpsum')})",
                "expense_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "payment_status": "pending",
                "gp_share_type": data.get("gp_share_type"),
                "gp_share_calc": data.get("gp_share_calc"),
                "gp_share_value": data.get("gp_share_value"),
                "created_by": user.get("id"),
                "created_by_name": user.get("name", user.get("email", "Admin")),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "auto_created": True,
                "source": "conversion"
            }
            await db.school_expenses.insert_one(gp_expense)
        
        # Create School Share expense if configured
        school_share_amount = data.get("school_share_amount", 0)
        if school_share_amount and float(school_share_amount) > 0:
            school_share_expense = {
                "id": str(uuid.uuid4()),
                "school_id": school_id,
                "school_name": school_name,
                "category": "school_share",
                "category_name": "School Share",
                "amount": float(school_share_amount),
                "description": f"School revenue share for conversion ({data.get('school_share_type', 'amount')} - {data.get('school_share_calc', 'lumpsum')})",
                "expense_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "payment_status": "pending",
                "school_share_type": data.get("school_share_type"),
                "school_share_calc": data.get("school_share_calc"),
                "school_share_value": data.get("school_share_value"),
                "created_by": user.get("id"),
                "created_by_name": user.get("name", user.get("email", "Admin")),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "auto_created": True,
                "source": "conversion"
            }
            await db.school_expenses.insert_one(school_share_expense)
    
    return {"message": "School onboarded successfully" if not is_draft else "Draft saved successfully", "id": onboarding_id}

@api_router.get("/schools/onboarding/{school_id}")
async def get_school_onboarding(school_id: str, user: dict = Depends(get_current_user)):
    """Get school onboarding details"""
    onboarding = await db.school_onboarding.find_one({"school_id": school_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    return onboarding

@api_router.post("/schools/onboarding")
async def create_school_onboarding(data: dict, user: dict = Depends(get_current_user)):
    """Create school onboarding record"""
    school_id = data.get("school_id")
    if not school_id:
        raise HTTPException(status_code=400, detail="school_id is required")
    
    # Check if onboarding already exists
    existing = await db.school_onboarding.find_one({"school_id": school_id})
    if existing:
        # Update existing record instead
        update_data = {k: v for k, v in data.items() if v is not None and k != "school_id"}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.school_onboarding.update_one({"school_id": school_id}, {"$set": update_data})
        return {"message": "Onboarding updated successfully", "id": existing.get("id")}
    
    onboarding_id = str(uuid.uuid4())
    onboarding_doc = {
        "id": onboarding_id,
        "school_id": school_id,
        "offering": data.get("offering", ""),
        "model": data.get("model", ""),
        "book_type": data.get("book_type", ""),
        "kit_type": data.get("kit_type", ""),
        "training_type": data.get("training_type", ""),
        "grade_pricing": data.get("grade_pricing", []),
        "total_students": data.get("total_students", 0),
        "total_amount": data.get("total_amount", 0),
        "school_contacts": data.get("school_contacts", []),
        "payment_mode": data.get("payment_mode", "from_school"),
        "payment_method": data.get("payment_method", ""),
        "payment_tranches": data.get("payment_tranches", []),
        "contract_start": data.get("contract_start", ""),
        "contract_end": data.get("contract_end", ""),
        "mou_url": data.get("mou_url", ""),
        "status": "active",
        "is_draft": False,
        "created_by": user.get("email", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.school_onboarding.insert_one(onboarding_doc)
    
    # Update school inquiry with onboarding reference
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {
            "onboarding_id": onboarding_id,
            "onboarding_status": "active",
        }}
    )
    
    return {"message": "Onboarding created successfully", "id": onboarding_id}

@api_router.put("/schools/onboarding/{onboarding_id}")
async def update_school_onboarding(onboarding_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update school onboarding details and sync to school_inquiries.onboarding_data"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update the school_onboarding collection
    await db.school_onboarding.update_one({"id": onboarding_id}, {"$set": update_data})
    
    # Get the onboarding record to find the school_id
    onboarding_record = await db.school_onboarding.find_one({"id": onboarding_id})
    if onboarding_record:
        school_id = onboarding_record.get("school_id")
        if school_id:
            # Sync relevant fields to school_inquiries.onboarding_data
            # This ensures the tracking page and other views show updated data
            sync_fields = {
                "onboarding_data.mou_url": data.get("mou_url"),
                "onboarding_data.offering": data.get("offering"),
                "onboarding_data.model": data.get("model"),
                "onboarding_data.book_type": data.get("book_type"),
                "onboarding_data.kit_type": data.get("kit_type"),
                "onboarding_data.training_type": data.get("training_type"),
                "onboarding_data.total_students": data.get("total_students"),
                "onboarding_data.total_amount": data.get("total_amount"),
                "onboarding_data.school_contacts": data.get("school_contacts"),
                "onboarding_data.payment_mode": data.get("payment_mode"),
                "onboarding_data.payment_method": data.get("payment_method"),
                "onboarding_data.payment_tranches": data.get("payment_tranches"),
                "onboarding_data.contract_start": data.get("contract_start"),
                "onboarding_data.contract_end": data.get("contract_end"),
                "onboarding_data.pricing_type": data.get("pricing_type"),
                "onboarding_data.fixed_price": data.get("fixed_price"),
                "onboarding_data.grade_pricing": data.get("grade_pricing"),
                "onboarding_data.deadline_date": data.get("deadline_date"),
                "onboarding_data.school_share_type": data.get("school_share_type"),
                "onboarding_data.school_share_calc": data.get("school_share_calc"),
                "onboarding_data.school_share_value": data.get("school_share_value"),
                "onboarding_data.school_share_amount": data.get("school_share_amount"),
                "onboarding_data.gp_share_type": data.get("gp_share_type"),
                "onboarding_data.gp_share_calc": data.get("gp_share_calc"),
                "onboarding_data.gp_share_value": data.get("gp_share_value"),
                "onboarding_data.gp_share_amount": data.get("gp_share_amount"),
            }
            # Only update fields that are provided (not None)
            sync_update = {k: v for k, v in sync_fields.items() if v is not None}
            if sync_update:
                await db.school_inquiries.update_one(
                    {"id": school_id},
                    {"$set": sync_update}
                )
    
    return {"message": "Onboarding updated successfully"}

@api_router.get("/schools/bulk-import/template")
async def get_bulk_import_template():
    """Return CSV template for bulk school import"""
    template_columns = [
        "school_name", "contact_name", "phone", "email", "location", "board",
        "school_size", "fee_range", "student_count", "offering", "model", "book_type", "kit_type", "training_type",
        "total_students", "total_amount", "payment_mode", "payment_method",
        "contract_start", "contract_end", "notes"
    ]
    
    # Sample row for guidance
    sample_row = {
        "school_name": "Example School",
        "contact_name": "John Doe",
        "phone": "9876543210",
        "email": "school@example.com",
        "location": "Mumbai",
        "board": "CBSE",
        "school_size": "500-1000",
        "fee_range": "50000-100000",
        "student_count": "500",
        "offering": "Robotics Lab Setup",
        "model": "Lab Model",
        "book_type": "individual_books",
        "kit_type": "lab_setup",
        "training_type": "both",
        "total_students": "100",
        "total_amount": "50000",
        "payment_mode": "from_school",
        "payment_method": "neft",
        "contract_start": "2025-01-01",
        "contract_end": "2025-12-31",
        "notes": "Optional notes"
    }
    
    return {
        "columns": template_columns,
        "sample": sample_row,
        "instructions": {
            "board": "Options: CBSE, ICSE, IGCSE, State Board, IB",
            "school_size": "Examples: 0-500, 500-1000, 1000-2000, 2000+",
            "fee_range": "Examples: 0-50000, 50000-100000, 100000+",
            "book_type": "Options: individual_books, no_books",
            "kit_type": "Options: lab_setup, individual, no_kit",
            "training_type": "Options: student_training, teacher_training, both",
            "payment_mode": "Options: from_school, from_student",
            "payment_method": "Options: cheque, neft, online, cash",
            "date_format": "Use YYYY-MM-DD format for dates"
        }
    }

@api_router.post("/schools/bulk-import")
async def bulk_import_schools(data: dict, user: dict = Depends(get_current_user)):
    """Bulk import schools from CSV/Excel data - creates new or updates existing"""
    schools = data.get("schools", [])
    update_existing = data.get("update_existing", True)  # Default to updating existing
    
    if not schools:
        raise HTTPException(status_code=400, detail="No schools data provided")
    
    imported = 0
    updated = 0
    skipped = 0
    errors = []
    
    for idx, school_data in enumerate(schools):
        try:
            school_name = school_data.get("school_name", "").strip()
            phone = school_data.get("phone", "").strip()
            email = school_data.get("email", "").strip().lower()
            
            if not school_name:
                errors.append({"row": idx + 1, "error": "School name is required"})
                skipped += 1
                continue
            
            # Check for existing school by name first (case-insensitive), then by email/phone
            # Exclude archived schools from matching
            existing = await db.school_inquiries.find_one({
                "$and": [
                    {"status": {"$ne": "archived"}},
                    {"$or": [
                        {"school_name": {"$regex": f"^{school_name}$", "$options": "i"}},
                        {"email": email} if email else {"_id": None},
                        {"phone": phone} if phone else {"_id": None}
                    ]}
                ]
            })
            
            if existing:
                if update_existing:
                    # Update existing school
                    school_id = existing.get("id")
                    update_fields = {
                        "contact_name": school_data.get("contact_name") or existing.get("contact_name", ""),
                        "phone": phone or existing.get("phone", ""),
                        "email": email or existing.get("email", ""),
                        "location": school_data.get("location") or existing.get("location", ""),
                        "board": school_data.get("board") or existing.get("board", ""),
                        "student_count": school_data.get("student_count") or existing.get("student_count", ""),
                        "school_size": school_data.get("school_size") or existing.get("school_size", ""),
                        "fee_range": school_data.get("fee_range") or existing.get("fee_range", ""),
                        "model": school_data.get("model") or existing.get("model", ""),
                        "total_students": int(school_data.get("total_students") or existing.get("total_students", 0) or 0),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                    
                    # If notes provided, append to existing
                    if school_data.get("notes"):
                        existing_notes = existing.get("notes", "")
                        update_fields["notes"] = f"{existing_notes}\n[Bulk Update] {school_data.get('notes')}" if existing_notes else school_data.get("notes")
                    
                    await db.school_inquiries.update_one({"id": school_id}, {"$set": update_fields})
                    
                    # Update or create onboarding record
                    onboarding_data = {
                        "offering": school_data.get("offering", ""),
                        "model": school_data.get("model", ""),
                        "book_type": school_data.get("book_type", ""),
                        "kit_type": school_data.get("kit_type", ""),
                        "training_type": school_data.get("training_type", ""),
                        "total_students": int(school_data.get("total_students", 0) or 0),
                        "total_amount": float(school_data.get("total_amount", 0) or 0),
                        "payment_mode": school_data.get("payment_mode", "from_school"),
                        "payment_method": school_data.get("payment_method", ""),
                        "contract_start": school_data.get("contract_start", ""),
                        "contract_end": school_data.get("contract_end", ""),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                    
                    existing_onboarding = await db.school_onboarding.find_one({"school_id": school_id})
                    if existing_onboarding:
                        # Only update non-empty fields
                        onboarding_update = {k: v for k, v in onboarding_data.items() if v}
                        if onboarding_update:
                            await db.school_onboarding.update_one({"school_id": school_id}, {"$set": onboarding_update})
                    else:
                        # Create new onboarding record
                        onboarding_id = str(uuid.uuid4())
                        onboarding_doc = {
                            "id": onboarding_id,
                            "school_id": school_id,
                            **onboarding_data,
                            "grade_pricing": [],
                            "school_contacts": [{
                                "name": school_data.get("contact_name", ""),
                                "phone": phone,
                                "email": email,
                                "role": "Primary Contact"
                            }] if school_data.get("contact_name") else [],
                            "payment_tranches": [],
                            "status": "active",
                            "is_draft": False,
                            "created_by": user.get("email", "admin"),
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        }
                        await db.school_onboarding.insert_one(onboarding_doc)
                        await db.school_inquiries.update_one(
                            {"id": school_id},
                            {"$set": {"onboarding_id": onboarding_id, "onboarding_status": "active"}}
                        )
                    
                    updated += 1
                else:
                    errors.append({"row": idx + 1, "error": f"Duplicate: School '{school_name}' already exists"})
                    skipped += 1
                continue
            
            # Create new school inquiry record
            school_id = str(uuid.uuid4())
            school_doc = {
                "id": school_id,
                "school_name": school_name,
                "contact_name": school_data.get("contact_name", ""),
                "phone": phone,
                "email": email or f"school_{school_id[:8]}@placeholder.com",
                "location": school_data.get("location", ""),
                "board": school_data.get("board", ""),
                "student_count": school_data.get("student_count", ""),
                "school_size": school_data.get("school_size", ""),
                "fee_range": school_data.get("fee_range", ""),
                "programs_interested": school_data.get("programs_interested", "").split(",") if school_data.get("programs_interested") else [],
                "support_needed": school_data.get("support_needed", "").split(",") if school_data.get("support_needed") else [],
                "source": "bulk_import",
                "status": "active",
                "notes": school_data.get("notes", ""),
                "comments": [],
                "meeting_type": "offline",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": user.get("email", "admin"),
                "assigned_to": user.get("email"),
            }
            await db.school_inquiries.insert_one(school_doc)
            
            # Create onboarding record
            onboarding_id = str(uuid.uuid4())
            onboarding_doc = {
                "id": onboarding_id,
                "school_id": school_id,
                "offering": school_data.get("offering", ""),
                "model": school_data.get("model", ""),
                "book_type": school_data.get("book_type", ""),
                "kit_type": school_data.get("kit_type", ""),
                "training_type": school_data.get("training_type", ""),
                "grade_pricing": [],
                "total_students": int(school_data.get("total_students", 0) or 0),
                "total_amount": float(school_data.get("total_amount", 0) or 0),
                "school_contacts": [{
                    "name": school_data.get("contact_name", ""),
                    "phone": phone,
                    "email": email,
                    "role": "Primary Contact"
                }] if school_data.get("contact_name") else [],
                "payment_mode": school_data.get("payment_mode", "from_school"),
                "payment_method": school_data.get("payment_method", ""),
                "payment_tranches": [],
                "contract_start": school_data.get("contract_start", ""),
                "contract_end": school_data.get("contract_end", ""),
                "status": "active",
                "is_draft": False,
                "created_by": user.get("email", "admin"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.school_onboarding.insert_one(onboarding_doc)
            
            # Update school inquiry with onboarding reference
            await db.school_inquiries.update_one(
                {"id": school_id},
                {"$set": {
                    "onboarding_id": onboarding_id,
                    "onboarding_status": "active",
                    "model": school_data.get("model", ""),
                    "total_students": int(school_data.get("total_students", 0) or 0),
                }}
            )
            
            imported += 1
            
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})
            skipped += 1
    
    return {
        "message": f"Import completed. {imported} new schools, {updated} updated, {skipped} skipped.",
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors[:20]
    }

# Send personalized email to school
@api_router.post("/schools/send-personalized-email")
async def send_personalized_school_email(data: dict):
    """Send personalized email to school with offerings details"""
    try:
        school_name = data.get("school_name", "")
        contact_name = data.get("contact_name", "")
        email = data.get("email", "")
        programs = data.get("programs_interested", [])
        offerings_ids = data.get("selected_offerings", [])
        meeting_date = data.get("meeting_date")
        meeting_time = data.get("meeting_time")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email address is required")
        
        if not resend.api_key:
            raise HTTPException(status_code=500, detail="Email service not configured")
        
        # Fetch offerings details
        offerings_details = []
        if offerings_ids:
            offerings = await db.offerings.find({"id": {"$in": offerings_ids}}, {"_id": 0}).to_list(50)
            offerings_details = offerings
        
        # Build email content
        programs_str = ", ".join(programs) if programs else "Various Programs"
        
        offerings_html = ""
        if offerings_details:
            offerings_html = "<h3 style='color: #1E3A5F; margin-top: 24px;'>Recommended Offerings for Your School</h3><ul style='margin: 12px 0;'>"
            for o in offerings_details:
                price_str = f"₹{o.get('price', 0):,.0f}" if o.get('price') else "Contact for pricing"
                offerings_html += f"<li style='margin: 8px 0;'><strong>{o.get('name', '')}</strong> - {price_str}"
                if o.get('description'):
                    offerings_html += f"<br><span style='color: #666; font-size: 14px;'>{o.get('description', '')[:200]}</span>"
                offerings_html += "</li>"
            offerings_html += "</ul>"
        
        meeting_html = ""
        if meeting_date and meeting_time:
            meeting_html = f"""
            <div style='background: #f0f9ff; padding: 16px; border-radius: 8px; margin-top: 24px;'>
                <h3 style='color: #1E3A5F; margin: 0 0 12px 0;'>Meeting Scheduled</h3>
                <p style='margin: 4px 0;'><strong>Date:</strong> {meeting_date}</p>
                <p style='margin: 4px 0;'><strong>Time:</strong> {meeting_time}</p>
            </div>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d4a6f 100%); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Empowering Future Skills</p>
                </div>
                
                <div style="padding: 32px;">
                    <h2 style="color: #1E3A5F; margin-top: 0;">Dear {contact_name},</h2>
                    
                    <p style="color: #333; line-height: 1.6;">
                        Thank you for your interest in OLL's skill education programs for <strong>{school_name}</strong>!
                    </p>
                    
                    <p style="color: #333; line-height: 1.6;">
                        We're excited about the opportunity to partner with your institution to bring cutting-edge 
                        <strong>{programs_str}</strong> education to your students.
                    </p>
                    
                    {offerings_html}
                    
                    <h3 style="color: #1E3A5F; margin-top: 24px;">Why Partner with OLL?</h3>
                    <ul style="color: #333; line-height: 1.8;">
                        <li>Industry-aligned curriculum designed by experts</li>
                        <li>Hands-on learning with modern equipment and kits</li>
                        <li>Trained educators and comprehensive teacher support</li>
                        <li>Flexible implementation models (Lab setup, Individual kits, After-school programs)</li>
                        <li>50,000+ students impacted across India</li>
                    </ul>
                    
                    {meeting_html}
                    
                    <p style="color: #333; line-height: 1.6; margin-top: 24px;">
                        We look forward to discussing how OLL can help transform education at your school.
                    </p>
                    
                    <p style="color: #333; margin-top: 24px;">
                        Warm regards,<br>
                        <strong>OLL Team</strong><br>
                        <span style="color: #666;">www.oll.co</span>
                    </p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        OLL<br>
                        Transforming Education Through Innovation
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        email_params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": f"Welcome to OLL - {programs_str} Programs for {school_name}",
            "html": html_content
        }
        
        email_response = await asyncio.to_thread(resend.Emails.send, email_params)
        
        return {
            "success": True,
            "message": "Personalized email sent successfully",
            "email_id": email_response.get("id") if isinstance(email_response, dict) else str(email_response)
        }
        
    except Exception as e:
        print(f"Error sending personalized email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# ========================
# SCHOOL CRM EMAIL SEND ENDPOINT
# ========================

@api_router.post("/schools/{school_id}/send-crm-email")
async def send_crm_email_for_school(
    school_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """
    Send a CRM email to the school contact.
    data fields:
        email_type: introduction | meeting_confirmation | proposal | mou | followup
        to_email: override email (optional, uses school email by default)
        pdf_base64: base64-encoded PDF (optional)
        pdf_filename: filename for attachment (optional)
        custom_message: extra message for followup emails (optional)
    """
    try:
        school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")

        email_type = data.get("email_type", "introduction")
        to_email = data.get("to_email") or school.get("email", "")

        if not to_email or "@" not in to_email or to_email.endswith("@school.oll"):
            raise HTTPException(status_code=400, detail="Valid email address required. Please update the school's email first.")

        sender_name = user.get("name", "OLL Team")

        # Build extra_data for template
        extra_data = {
            "meeting_date": data.get("meeting_date") or school.get("meeting_date", ""),
            "meeting_time": data.get("meeting_time") or school.get("meeting_time", ""),
            "meeting_mode": data.get("meeting_mode") or school.get("meeting_type", "offline"),
            "meeting_link": data.get("meeting_link") or school.get("meeting_link", ""),
            "custom_message": data.get("custom_message", "")
        }

        result = await send_school_crm_email(
            to_email=to_email,
            email_type=email_type,
            school_name=school.get("school_name", ""),
            contact_name=school.get("contact_name", ""),
            sender_name=sender_name,
            extra_data=extra_data,
            pdf_base64=data.get("pdf_base64"),
            pdf_filename=data.get("pdf_filename")
        )

        if result.get("success"):
            # Log this email in the school's activity log
            await db.school_inquiries.update_one(
                {"id": school_id},
                {"$push": {"activity_log": {
                    "id": str(uuid.uuid4()),
                    "action": f"email_sent_{email_type}",
                    "description": f"Email sent ({email_type.replace('_', ' ').title()}) to {to_email}",
                    "performed_by": user.get("name", "Admin"),
                    "performed_at": datetime.now(timezone.utc).isoformat()
                }}}
            )
            # Auto-mark followup task as sent if this was a followup email
            if email_type in ("followup_1", "followup_2", "followup_3", "followup_4"):
                task_id_override = data.get("task_id")
                school_doc = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "followup_tasks": 1})
                tasks = school_doc.get("followup_tasks", []) if school_doc else []
                for task in tasks:
                    if (task_id_override and task["id"] == task_id_override) or \
                       (not task_id_override and task["email_type"] == email_type and task["status"] == "pending"):
                        task["status"] = "sent"
                        task["sent_at"] = datetime.now(timezone.utc).isoformat()
                        task["sent_by"] = user.get("name", "Admin")
                        break
                await db.school_inquiries.update_one(
                    {"id": school_id},
                    {"$set": {"followup_tasks": tasks}}
                )
            return {"success": True, "message": f"Email sent to {to_email}", "email_id": result.get("email_id")}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send email"))

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Send CRM email error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# FOLLOWUP TASK ENDPOINTS
# ========================

@api_router.patch("/schools/{school_id}/followup-task/{task_id}")
async def update_followup_task(
    school_id: str,
    task_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update a followup task: change date or mark as sent/completed/skipped"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    tasks = school.get("followup_tasks", [])
    updated = False
    for task in tasks:
        if task["id"] == task_id:
            if "scheduled_date" in data:
                task["scheduled_date"] = data["scheduled_date"]
            if "status" in data:
                task["status"] = data["status"]
            if data.get("status") in ("sent", "completed"):
                task["sent_at"] = datetime.now(timezone.utc).isoformat()
                task["sent_by"] = user.get("name", "Admin")
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {"followup_tasks": tasks}}
    )
    return {"success": True, "followup_tasks": tasks}


# Schedule AI-generated followup email
@api_router.post("/schools/schedule-followup-email")
async def schedule_followup_email(data: dict, user: dict = Depends(get_current_user)):
    """Schedule an AI-generated followup email for a school"""
    try:
        school_id = data.get("school_id")
        school_name = data.get("school_name", "")
        contact_name = data.get("contact_name", "")
        email = data.get("email", "")
        followup_date = data.get("followup_date")
        followup_comment = data.get("followup_comment", "")
        programs = data.get("programs_interested", [])
        
        if not email:
            raise HTTPException(status_code=400, detail="Email address is required")
        
        if not followup_date:
            raise HTTPException(status_code=400, detail="Followup date is required")
        
        # Generate AI email content
        llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not llm_key:
            raise HTTPException(status_code=500, detail="LLM service not configured")
        
        programs_str = ", ".join(programs) if programs else "skill education programs"
        
        # Create AI prompt for email generation
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"followup-{school_id}-{followup_date}",
            system_message="""You are a professional business development representative for OLL (Omni Learning Labs), 
            a company that provides skill education programs (Robotics, Coding, AI, Entrepreneurship, Financial Literacy) to schools.
            Write warm, professional, and personalized followup emails that encourage schools to continue the conversation.
            Keep emails concise (under 200 words), friendly but professional.
            Do not use generic templates - make each email feel personalized based on the context provided."""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        prompt = f"""Write a followup email for:
        - School: {school_name}
        - Contact Person: {contact_name}
        - Programs Discussed: {programs_str}
        - Previous Meeting Notes: {followup_comment if followup_comment else 'Initial discussion about partnership'}
        
        The email should:
        1. Reference our previous conversation naturally
        2. Mention the specific programs they showed interest in
        3. Offer to schedule a call or meeting to discuss next steps
        4. Include a soft call-to-action
        5. Be warm and personalized, not generic
        
        Write ONLY the email body (no subject line, no signature - just the greeting and body text).
        Start with "Dear {contact_name}," and end before the signature."""
        
        user_message = UserMessage(text=prompt)
        ai_email_content = await chat.send_message(user_message)
        
        # Store scheduled email in database
        scheduled_email = {
            "id": f"email-{uuid.uuid4().hex[:8]}",
            "school_id": school_id,
            "school_name": school_name,
            "contact_name": contact_name,
            "email": email,
            "scheduled_date": followup_date,
            "scheduled_time": "09:00",
            "email_content": ai_email_content,
            "programs_interested": programs,
            "followup_comment": followup_comment,
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("user_id", user.get("id", "")),
        }
        
        await db.scheduled_emails.insert_one(scheduled_email)
        
        return {
            "success": True,
            "message": f"Followup email scheduled for {followup_date} at 9:00 AM",
            "email_preview": ai_email_content[:300] + "..." if len(ai_email_content) > 300 else ai_email_content,
            "scheduled_id": scheduled_email["id"]
        }
        
    except Exception as e:
        print(f"Error scheduling followup email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to schedule email: {str(e)}")

# Get scheduled emails for a school
@api_router.get("/schools/{school_id}/scheduled-emails")
async def get_school_scheduled_emails(school_id: str, user: dict = Depends(get_current_user)):
    """Get all scheduled emails for a school"""
    emails = await db.scheduled_emails.find(
        {"school_id": school_id}, 
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(50)
    return emails

# ========================
# SCHOOL ONBOARDING WORKFLOW
# ========================

# Default onboarding steps template
DEFAULT_ONBOARDING_STEPS = {
    "payment_collection": {
        "title": "Payment Collection",
        "description": "Initial payment received from school",
        "completed": False, "completed_date": None,
        "data": {"amount": None, "payment_date": None, "payment_mode": None, "transaction_id": None, "notes": ""}
    },
    "kit_delivery": {
        "title": "Kit Delivery & Tracking",
        "description": "Kits dispatched and delivered to school",
        "completed": False, "completed_date": None,
        "data": {"dispatch_date": None, "tracking_link": "", "delivery_date": None, "items_list": [], "notes": ""}
    },
    "distribution_checking": {
        "title": "Kit Distribution",
        "description": "Kits distributed to students and verified",
        "completed": False, "completed_date": None,
        "data": {"distribution_date": None, "students_count": None, "queries": [], "notes": ""}
    },
    "lab_setup": {
        "title": "Lab Setup",
        "description": "School lab installed and configured",
        "completed": False, "completed_date": None,
        "data": {"setup_date": None, "technician_name": "", "checklist": [], "notes": ""}
    },
    "lab_refilling": {
        "title": "Kits Checking & Refilling",
        "description": "Existing lab kits inspected and refilled for renewal",
        "completed": False, "completed_date": None,
        "data": {"check_date": None, "items_replaced": [], "notes": ""}
    },
    "technical_check": {
        "title": "Technical Check",
        "description": "All technical requirements verified",
        "completed": False, "completed_date": None,
        "data": {"checklist": [
            {"item": "Lab/Classroom setup verified", "checked": False},
            {"item": "Power supply & electrical points", "checked": False},
            {"item": "Internet connectivity", "checked": False},
            {"item": "Projector/Display working", "checked": False},
            {"item": "All kits functional", "checked": False},
            {"item": "Software installed", "checked": False}
        ], "notes": ""}
    },
    "teacher_training": {
        "title": "Teacher Training",
        "description": "Teachers trained and certified",
        "completed": False, "completed_date": None,
        "data": {"training_date": None, "training_mode": "offline", "teachers_count": None,
                 "checklist": [
                     {"item": "Training session conducted", "checked": False},
                     {"item": "Assessment completed", "checked": False},
                     {"item": "Certificates issued", "checked": False},
                     {"item": "Doubt clearing session done", "checked": False}
                 ], "teachers": [], "notes": ""}
    },
    "teacher_allocation": {
        "title": "Teacher Allocation",
        "description": "OLL educator allocated to the school for student training",
        "completed": False, "completed_date": None,
        "data": {"educator_name": "", "educator_phone": "", "allocation_date": None, "grades_assigned": [], "notes": ""}
    },
    "teacher_approval": {
        "title": "Teacher Approval from School",
        "description": "School principal/contact approves the allocated educator",
        "completed": False, "completed_date": None,
        "data": {"approval_date": None, "approved_by": "", "approval_mode": "email", "notes": ""}
    },
    "timetable_finalization": {
        "title": "Timetable Creation",
        "description": "Class timetable created and confirmed by school",
        "completed": False, "completed_date": None,
        "data": {"grades": [], "sessions_per_week": None, "synced_to_checkin": False, "timetable_data": [], "notes": ""}
    },
    "calendar_making": {
        "title": "Calendar Making",
        "description": "Academic calendar finalized with all events",
        "completed": False, "completed_date": None,
        "data": {"holidays": [], "competitions": [], "exhibitions": [], "special_events": [], "notes": ""}
    },
    "mou_signing": {
        "title": "MOU Signing",
        "description": "Memorandum of Understanding signed",
        "completed": False, "completed_date": None,
        "data": {"mou_date": None, "signed_by_school": False, "signed_by_oll": False, "document_link": "", "notes": ""}
    },
    "lms_setup": {
        "title": "LMS Setup",
        "description": "Student credentials uploaded to LMS",
        "completed": False, "completed_date": None,
        "data": {"students_uploaded": 0, "upload_date": None, "file_url": "", "students_list": [], "notes": ""}
    },
    "school_confirmation": {
        "title": "School Finalization",
        "description": "Final confirmation received from school",
        "completed": False, "completed_date": None,
        "data": {"confirmation_date": None, "confirmed_by": "", "feedback": "", "notes": ""}
    }
}

# ── Ordered step keys per scenario ────────────────────────────────────────
# Used to control rendering order in the UI

def generate_dynamic_onboarding_steps(onboarding_data: dict, is_renewal: bool = False) -> dict:
    """
    Build a tailored onboarding workflow based on the school's program details.

    Rules
    ─────
    • individual kit  → kit_distribution step
    • lab setup       → no kit_distribution; new=lab_setup | renewal=lab_refilling
    • teacher_training (or both) → teacher_training step
    • student_training (or both) → teacher_allocation + teacher_approval + timetable_finalization
    """
    import copy

    kit_type      = (onboarding_data.get("kit_type") or "individual").lower()
    training_type = (onboarding_data.get("training_type") or "teacher_training").lower()

    all_steps = copy.deepcopy(DEFAULT_ONBOARDING_STEPS)

    # Determine which step keys are active (in order)
    ordered_keys = ["payment_collection", "kit_delivery"]

    if kit_type in ("individual", "student_kit", "individual_books"):
        ordered_keys.append("distribution_checking")
    elif kit_type == "lab_setup":
        ordered_keys.append("lab_refilling" if is_renewal else "lab_setup")

    ordered_keys.append("technical_check")

    needs_teacher_training = training_type in ("teacher_training", "both")
    needs_student_training = training_type in ("student_training", "both")

    if needs_teacher_training:
        ordered_keys.append("teacher_training")

    if needs_student_training:
        ordered_keys += ["teacher_allocation", "teacher_approval", "timetable_finalization"]

    ordered_keys += ["calendar_making", "mou_signing", "lms_setup", "school_confirmation"]

    # Return only the active steps (in order, as an ordered dict)
    from collections import OrderedDict
    active = OrderedDict()
    for key in ordered_keys:
        if key in all_steps:
            active[key] = all_steps[key]

    return dict(active)

@api_router.post("/schools/{school_id}/init-onboarding")
async def init_school_onboarding(school_id: str, data: dict = None, user: dict = Depends(get_current_user)):
    """Initialize onboarding workflow for a converted or renewed school - MOU is already done"""
    import copy
    
    if data is None:
        data = {}
    
    is_renewal = data.get("is_renewal", False)
    
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Generate unique tracking token
    tracking_token = f"oll-{uuid.uuid4().hex[:12]}"
    
    # Initialize onboarding steps dynamically based on what the school purchased
    onboarding_data_for_steps = school.get("onboarding_data", {})
    steps = generate_dynamic_onboarding_steps(onboarding_data_for_steps, is_renewal=is_renewal)
    if "mou_signing" in steps:
        steps["mou_signing"]["completed"] = True
        steps["mou_signing"]["completed_date"] = datetime.now(timezone.utc).isoformat()
    
    action_label = "Renewal Started" if is_renewal else "Onboarding Started"
    mou_label = "MOU Signed - School Renewed" if is_renewal else "MOU Signed - School Converted"
    
    onboarding_workflow = {
        "tracking_token": tracking_token,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "current_step": "payment_collection",  # Start from payment since MOU is done
        "is_renewal": is_renewal,
        "steps": steps,
        "timeline": [
            {
                "action": mou_label,
                "date": datetime.now(timezone.utc).isoformat(),
                "by": user.get("name", user.get("email", "Admin"))
            },
            {
                "action": action_label,
                "date": datetime.now(timezone.utc).isoformat(),
                "by": user.get("name", user.get("email", "Admin"))
            }
        ]
    }
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {
            "onboarding_workflow": onboarding_workflow,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get updated school and onboarding data
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    onboarding_data = school.get("onboarding_data", {})
    
    # Send welcome email to school
    school_emails = []
    if school.get("email"):
        school_emails.append(school.get("email"))
    
    # Get contacts from onboarding data
    school_contacts = onboarding_data.get("school_contacts", [])
    for contact in school_contacts:
        if contact.get("email") and contact.get("email") not in school_emails:
            school_emails.append(contact.get("email"))
    
    if school_emails:
        try:
            # Get MOU URL
            mou_url = onboarding_data.get("mou_url", "")
            
            # Build tracking URL
            tracking_url = f"https://oll.co/track/{tracking_token}"
            
            # Build email content - different for renewals
            if is_renewal:
                email_subject = f"Welcome Back! - {school.get('school_name')} Renewal Started"
                header_text = "🎉 Welcome Back to OLL!"
                header_subtext = "We're excited to continue our partnership"
                greeting_text = f"Thank you for renewing your partnership with us! We're thrilled to continue working with <strong style='color: #1E3A5F;'>{school.get('school_name')}</strong> for another successful year."
            else:
                email_subject = f"Welcome to OLL - {school.get('school_name')} Onboarding Started!"
                header_text = "🎉 Welcome to OLL!"
                header_subtext = "Your journey to transforming education begins now"
                greeting_text = f"Congratulations! We are thrilled to welcome <strong style='color: #1E3A5F;'>{school.get('school_name')}</strong> to the OLL family. Together, we'll embark on an exciting journey of innovation and skill-based education."
            
            offerings_list = ", ".join(school.get("selected_offerings", school.get("programs_interested", [])))
            contract_start = onboarding_data.get("contract_start", "TBD")
            contract_end = onboarding_data.get("contract_end", "TBD")
            total_students = onboarding_data.get("total_students", "TBD")
            
            email_html = f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
                <!-- Header with Logo and Celebration -->
                <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8f 100%); padding: 40px 30px; text-align: center;">
                    <img src="https://customer-assets.emergentagent.com/job_oll-skill-edu/artifacts/wzn0gh6k_OLL-horizontal-logo-white.png" alt="OLL Logo" style="height: 50px; margin-bottom: 20px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">{header_text}</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 16px;">{header_subtext}</p>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 35px 30px; background: #f8fafc;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        Dear {school.get('contact_name', 'Team')},
                    </p>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        {greeting_text}
                    </p>
                    
                    <!-- Program Details Card -->
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="color: #1E3A5F; font-size: 18px; margin: 0 0 20px 0; border-bottom: 2px solid #FFD93D; padding-bottom: 10px; display: inline-block;">📋 Partnership Details</h3>
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; width: 40%;">Programs</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 600;">{offerings_list or 'To be confirmed'}</td>
                            </tr>
                            <tr style="background: #f8fafc;">
                                <td style="padding: 10px; color: #6b7280; border-radius: 4px 0 0 4px;">Total Students</td>
                                <td style="padding: 10px; color: #111827; font-weight: 600; border-radius: 0 4px 4px 0;">{total_students}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280;">Contract Period</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 600;">{contract_start} to {contract_end}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Onboarding Steps Timeline -->
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="color: #1E3A5F; font-size: 18px; margin: 0 0 20px 0;">🚀 Your Onboarding Journey</h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; flex-shrink: 0;">✓</div>
                                <div>
                                    <strong style="color: #111827;">MOU Signing</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Partnership agreement completed</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #1E3A5F; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; flex-shrink: 0;">1</div>
                                <div>
                                    <strong style="color: #111827;">Payment Collection</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Complete payment as per agreed schedule</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #d1d5db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6b7280; font-weight: bold; font-size: 14px; flex-shrink: 0;">2</div>
                                <div>
                                    <strong style="color: #111827;">Kit Delivery</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Receive your robotics/STEM kits at school</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #d1d5db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6b7280; font-weight: bold; font-size: 14px; flex-shrink: 0;">3</div>
                                <div>
                                    <strong style="color: #111827;">Teacher Training</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Training sessions for your faculty</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #d1d5db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6b7280; font-weight: bold; font-size: 14px; flex-shrink: 0;">4</div>
                                <div>
                                    <strong style="color: #111827;">Program Launch</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Start classes with students</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{tracking_url}" style="display: inline-block; background: linear-gradient(135deg, #FFD93D 0%, #f59e0b 100%); color: #1E3A5F; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(255,217,61,0.4);">
                            📊 Track Your Onboarding Progress
                        </a>
                    </div>
                    
                    {"<div style='background: #e0f2fe; border: 1px solid #0284c7; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;'><strong style='color: #0369a1;'>📎 MOU Document:</strong> <a href='" + mou_url + "' style='color: #0284c7; font-weight: 600;'>Download MOU</a></div>" if mou_url else ""}
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 25px;">
                        Your dedicated relationship manager will be in touch soon to guide you through each step. 
                        If you have any questions, feel free to reach out at <a href="mailto:support@oll.co" style="color: #1E3A5F; font-weight: 600;">support@oll.co</a> or call us at <strong>+91 9920188188</strong>.
                    </p>
                    
                    <p style="color: #374151; font-size: 14px; margin-top: 25px;">
                        Warm regards,<br>
                        <strong style="color: #1E3A5F;">The OLL Team</strong>
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background: #1E3A5F; color: white; padding: 25px; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">OLL</p>
                    <p style="margin: 0; font-size: 12px; opacity: 0.8;">support@oll.co | +91 9920188188</p>
                </div>
            </div>
            """
            
            # Send email using Resend SDK directly
            for email in school_emails:
                try:
                    email_params = {
                        "from": "OLL Team <welcome@oll.co>",
                        "to": [email],
                        "subject": email_subject,
                        "html": email_html
                    }
                    await asyncio.to_thread(resend.Emails.send, email_params)
                    print(f"Welcome email sent to {email}")
                except Exception as email_err:
                    print(f"Failed to send welcome email to {email}: {email_err}")
                    
        except Exception as e:
            print(f"Welcome email error: {e}")
    
    return {
        "success": True,
        "tracking_token": tracking_token,
        "tracking_url": f"/track/{tracking_token}",
        "school": school,
        "emails_sent": school_emails
    }

@api_router.post("/schools/{school_id}/regenerate-workflow")
async def regenerate_onboarding_workflow(school_id: str, user: dict = Depends(get_current_user)):
    """
    Regenerate onboarding workflow steps based on current onboarding_data.
    Preserves completed status and data for steps that exist in both old and new workflow.
    Useful when a school's kit_type or training_type changes after onboarding was initialized.
    """
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    workflow = school.get("onboarding_workflow")
    if not workflow:
        raise HTTPException(status_code=400, detail="No onboarding workflow found. Initialize onboarding first.")

    onboarding_data = school.get("onboarding_data", {})
    is_renewal = workflow.get("is_renewal", False)

    # Generate fresh step set based on current onboarding_data
    new_steps = generate_dynamic_onboarding_steps(onboarding_data, is_renewal=is_renewal)

    # Preserve completed status and data from existing steps
    old_steps = workflow.get("steps", {})
    for key, step in new_steps.items():
        if key in old_steps:
            step["completed"] = old_steps[key].get("completed", False)
            step["completed_date"] = old_steps[key].get("completed_date")
            # Merge saved data fields
            saved_data = old_steps[key].get("data", {})
            if saved_data:
                step["data"] = {**step.get("data", {}), **saved_data}

    # Find next incomplete step
    current_step = None
    for sk in new_steps.keys():
        if not new_steps[sk].get("completed", False):
            current_step = sk
            break

    workflow["steps"] = new_steps
    workflow["current_step"] = current_step

    # Add timeline entry
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": "Workflow steps regenerated based on current program details",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": user.get("name", user.get("email", "Admin"))
    })
    workflow["timeline"] = timeline

    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {
            "onboarding_workflow": workflow,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    updated_school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    return {
        "success": True,
        "message": f"Workflow regenerated with {len(new_steps)} steps",
        "workflow": updated_school.get("onboarding_workflow"),
        "school": updated_school
    }


@api_router.patch("/schools/{school_id}/onboarding-step/{step_key}")
async def update_onboarding_step(
    school_id: str, 
    step_key: str, 
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update a specific onboarding step"""
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    workflow = school.get("onboarding_workflow", {})
    steps = workflow.get("steps", {})
    
    if step_key not in steps:
        raise HTTPException(status_code=400, detail=f"Invalid step: {step_key}")
    
    # Update step data
    step = steps[step_key]
    if "completed" in data:
        step["completed"] = data["completed"]
        if data["completed"]:
            step["completed_date"] = datetime.now(timezone.utc).isoformat()
        else:
            step["completed_date"] = None
    
    if "data" in data:
        step["data"] = {**step.get("data", {}), **data["data"]}
    
    steps[step_key] = step
    
    # Add to timeline
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": f"{step['title']} - {'Completed' if step['completed'] else 'Updated'}",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": user.get("name", user.get("email", "Admin")),
        "step": step_key
    })
    
    # Check if all steps completed
    all_completed = all(s.get("completed", False) for s in steps.values())
    
    # Update workflow
    workflow["steps"] = steps
    workflow["timeline"] = timeline
    if all_completed:
        workflow["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    # Find next incomplete step using actual workflow keys (preserves dynamic order)
    current_step = None
    for sk in steps.keys():
        if not steps.get(sk, {}).get("completed", False):
            current_step = sk
            break
    workflow["current_step"] = current_step
    
    update_data = {
        "onboarding_workflow": workflow,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If all steps completed and this is a renewal, move back to 'active'
    # If all steps completed and this is a new conversion, move to 'active'
    if all_completed:
        school = await db.school_inquiries.find_one({"id": school_id})
        current_status = school.get("status") if school else None
        if current_status in ["converted", "renewed"]:
            update_data["status"] = "active"
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": update_data}
    )
    
    return {"success": True, "step": step, "all_completed": all_completed}

@api_router.post("/schools/{school_id}/onboarding-query")
async def add_onboarding_query(
    school_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Add a query/issue during onboarding"""
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    query = {
        "id": f"query-{uuid.uuid4().hex[:8]}",
        "type": data.get("type", "general"),
        "description": data.get("description", ""),
        "step": data.get("step", "distribution_checking"),
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("name", user.get("email", "Admin")),
        "resolved_at": None,
        "resolution": ""
    }
    
    workflow = school.get("onboarding_workflow", {})
    steps = workflow.get("steps", {})
    step_data = steps.get(data.get("step", "distribution_checking"), {}).get("data", {})
    queries = step_data.get("queries", [])
    queries.append(query)
    step_data["queries"] = queries
    steps[data.get("step", "distribution_checking")]["data"] = step_data
    workflow["steps"] = steps
    
    # Add to timeline
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": f"Query Added: {data.get('type', 'general')}",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": user.get("name", user.get("email", "Admin")),
        "step": data.get("step", "distribution_checking")
    })
    workflow["timeline"] = timeline
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {"onboarding_workflow": workflow}}
    )
    
    return {"success": True, "query": query}

@api_router.get("/schools/{school_id}/onboarding")
async def get_school_onboarding(school_id: str, user: dict = Depends(get_current_user)):
    """Get onboarding workflow for a school"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    return {
        "school_id": school_id,
        "school_name": school.get("school_name"),
        "contact_name": school.get("contact_name"),
        "workflow": school.get("onboarding_workflow", {})
    }

@api_router.post("/schools/{school_id}/lms-students")
async def upload_lms_students(school_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Upload student credentials for LMS setup"""
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    students = data.get("students", [])
    file_url = data.get("file_url", "")
    
    workflow = school.get("onboarding_workflow", {})
    if not workflow:
        raise HTTPException(status_code=400, detail="Onboarding not initialized")
    
    # Update lms_setup step
    if "lms_setup" not in workflow.get("steps", {}):
        workflow["steps"]["lms_setup"] = {
            "title": "LMS Setup",
            "description": "Student credentials uploaded to LMS",
            "completed": False,
            "completed_date": None,
            "data": {
                "students_uploaded": 0,
                "upload_date": None,
                "file_url": "",
                "students_list": [],
                "notes": ""
            }
        }
    
    workflow["steps"]["lms_setup"]["data"]["students_list"] = students
    workflow["steps"]["lms_setup"]["data"]["students_uploaded"] = len(students)
    workflow["steps"]["lms_setup"]["data"]["file_url"] = file_url
    workflow["steps"]["lms_setup"]["data"]["upload_date"] = datetime.now(timezone.utc).isoformat()
    
    if len(students) > 0:
        workflow["steps"]["lms_setup"]["completed"] = True
        workflow["steps"]["lms_setup"]["completed_date"] = datetime.now(timezone.utc).isoformat()
    
    # Add to timeline
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": "lms_students_uploaded",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": user.get("name", user.get("email")),
        "details": f"Uploaded {len(students)} student credentials for LMS"
    })
    workflow["timeline"] = timeline
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {"onboarding_workflow": workflow}}
    )
    
    return {
        "success": True,
        "students_uploaded": len(students),
        "message": f"Successfully uploaded {len(students)} student credentials"
    }

# Public tracking endpoint (no auth required)
@api_router.get("/track/{tracking_token}")
async def get_public_tracking(tracking_token: str):
    """Public endpoint for schools to track their onboarding progress"""
    school = await db.school_inquiries.find_one(
        {"onboarding_workflow.tracking_token": tracking_token},
        {"_id": 0, "password": 0}
    )
    
    if not school:
        raise HTTPException(status_code=404, detail="Tracking not found")
    
    workflow = school.get("onboarding_workflow", {})
    steps = workflow.get("steps", {})
    onboarding_data = school.get("onboarding_data", {})
    
    # Fetch PO data for this school (for kit_delivery step) - with short timeout for better UX
    po_info = None
    school_name = school.get("school_name", "")
    if school_name:
        try:
            # Use shorter timeout for public tracking page (5 seconds total)
            po_list_data = await asyncio.wait_for(
                fetch_po_data("po", {"school_name": school_name, "limit": 10}, timeout=5.0),
                timeout=5.0
            )
            if po_list_data and "data" in po_list_data:
                # Filter out delivered POs
                active_pos = [
                    po for po in po_list_data.get("data", [])
                    if po.get("status", "").lower() != "delivered"
                ]
                if active_pos:
                    # Get detailed info for the first active PO
                    po_number = active_pos[0].get("po_number")
                    if po_number:
                        detailed_po = await asyncio.wait_for(
                            fetch_po_data(f"po/{po_number}", timeout=5.0),
                            timeout=5.0
                        )
                        if detailed_po:
                            dispatch_info = detailed_po.get("dispatch_info") or {}
                            po_info = {
                                "po_number": detailed_po.get("po_number"),
                                "status": detailed_po.get("status"),
                                "delivery_date": detailed_po.get("delivery_date"),
                                "dispatch_date": dispatch_info.get("dispatch_date"),
                                "tracking_link": transform_tracking_url(detailed_po.get("tracking_link")),
                                "public_tracking_url": transform_tracking_url(detailed_po.get("public_tracking_url")),
                                "vendor_name": detailed_po.get("vendor_name"),
                            }
        except asyncio.TimeoutError:
            logging.warning(f"PO data fetch timeout for tracking page: {school_name}")
        except Exception as e:
            logging.error(f"Error fetching PO data for tracking: {str(e)}")
    
    # Calculate progress
    total_steps = len(steps)
    completed_steps = sum(1 for s in steps.values() if s.get("completed", False))
    progress_percent = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0
    
    # Build public-safe response - MOU first, then rest in workflow order
    public_steps = []
    # Use actual step keys from workflow (preserves dynamic order), put mou_signing first
    all_step_keys = list(steps.keys())
    if "mou_signing" in all_step_keys:
        all_step_keys.remove("mou_signing")
        all_step_keys.insert(0, "mou_signing")
    
    for key in all_step_keys:
        step = steps.get(key, {})
        if not step:
            continue
        step_data = step.get("data", {})
        
        # For kit_delivery, include PO info
        kit_delivery_data = None
        kit_tracking_link = step_data.get("tracking_link")
        kit_scheduled_date = step_data.get("scheduled_date") or step_data.get("delivery_date") or step_data.get("dispatch_date") or step_data.get("distribution_date")
        
        if key == "kit_delivery" and po_info:
            kit_delivery_data = po_info
            # Use PO tracking link if not manually set
            if not kit_tracking_link:
                kit_tracking_link = po_info.get("tracking_link") or po_info.get("public_tracking_url")
            else:
                # Transform any preview URL in the stored tracking link
                kit_tracking_link = transform_tracking_url(kit_tracking_link)
            # Use PO delivery date if not manually set
            if not kit_scheduled_date:
                kit_scheduled_date = po_info.get("delivery_date")
        elif key == "kit_delivery" and kit_tracking_link:
            # Transform tracking link even if no PO info
            kit_tracking_link = transform_tracking_url(kit_tracking_link)
        
        public_steps.append({
            "key": key,
            "title": step.get("title", key.replace("_", " ").title()),
            "description": step.get("description", ""),
            "completed": step.get("completed", False),
            "completed_date": step.get("completed_date"),
            # Include scheduled dates for upcoming steps - also check for various date field names
            "scheduled_date": kit_scheduled_date if key == "kit_delivery" else (step_data.get("scheduled_date") or step_data.get("delivery_date") or step_data.get("dispatch_date") or step_data.get("distribution_date")),
            "tracking_link": kit_tracking_link if key == "kit_delivery" else None,
            "training_date": step_data.get("training_date") if key == "teacher_training" else None,
            "training_time": step_data.get("training_time") if key == "teacher_training" else None,
            # Additional date fields for other steps
            "payment_date": step_data.get("payment_date") if key == "payment_collection" else None,
            "mou_date": step_data.get("mou_date") if key == "mou_signing" else None,
            # LMS data
            "data": step_data if key == "lms_setup" else None,
            # PO data for kit_delivery
            "po_info": kit_delivery_data if key == "kit_delivery" else None,
        })
    
    # Public timeline (last 10 entries)
    timeline = workflow.get("timeline", [])[-10:]
    public_timeline = [
        {"action": t.get("action"), "date": t.get("date")}
        for t in timeline
    ]
    
    # Get assigned team member details
    assigned_team_member = None
    assigned_to = school.get("assigned_to")
    if assigned_to:
        team_member = await db.users.find_one({"id": assigned_to}, {"_id": 0, "password": 0})
        if team_member:
            assigned_team_member = {
                "name": team_member.get("name"),
                "email": team_member.get("email"),
                "phone": team_member.get("phone"),
                "role": team_member.get("role", "Account Manager")
            }
    
    return {
        "school_id": school.get("id"),  # Include school_id for payment links
        "school_name": school.get("school_name"),
        "contact_name": school.get("contact_name"),
        "programs": school.get("programs_interested", []),
        "offerings": school.get("selected_offerings", school.get("programs_interested", [])),
        "started_at": workflow.get("started_at"),
        "completed_at": workflow.get("completed_at"),
        "current_step": workflow.get("current_step"),
        "progress_percent": progress_percent,
        "completed_steps": completed_steps,
        "total_steps": total_steps,
        "steps": public_steps,
        "timeline": public_timeline,
        # School contacts
        "school_contacts": onboarding_data.get("school_contacts", []),
        # Assigned OLL team member
        "assigned_team_member": assigned_team_member,
        # MOU URL
        "mou_url": onboarding_data.get("mou_url"),
        # Is this a renewal onboarding?
        "is_renewal": workflow.get("is_renewal", False),
        # Include onboarding details for display
        "onboarding_details": {
            "offering": onboarding_data.get("offering"),
            "total_amount": onboarding_data.get("total_amount"),
            "total_students": onboarding_data.get("total_students"),
            "contract_start": onboarding_data.get("contract_start"),
            "contract_end": onboarding_data.get("contract_end"),
            "model": onboarding_data.get("model"),
            "kit_type": onboarding_data.get("kit_type"),
            "book_type": onboarding_data.get("book_type"),
            "training_type": onboarding_data.get("training_type"),
            "mou_url": onboarding_data.get("mou_url"),
            "parent_circular_url": onboarding_data.get("parent_circular_url"),
            "payment_link": onboarding_data.get("payment_link"),
            "payment_mode": onboarding_data.get("payment_mode"),
            "payment_method": onboarding_data.get("payment_method"),
            "deadline_date": onboarding_data.get("deadline_date"),
        },
        # Include documents
        "documents": school.get("documents", []),
        # Include payment tranches and payment status
        "payment_tranches": onboarding_data.get("payment_tranches", []),
        "payments": [
            {
                "tranche_index": p.get("tranche_index"),
                "status": p.get("status"),
                "invoice_url": p.get("invoice_url"),
                "payment_date": p.get("payment_date"),
                "payment_link": p.get("payment_link")
            }
            for p in school.get("payments", [])
        ]
    }

# Support ticket from tracking page (no auth required)
@api_router.post("/track/{tracking_token}/support-ticket")
async def create_public_support_ticket(tracking_token: str, ticket_data: dict):
    """Public endpoint for schools to raise support tickets from tracking page"""
    school = await db.school_inquiries.find_one(
        {"onboarding_workflow.tracking_token": tracking_token},
        {"_id": 0}
    )
    
    if not school:
        raise HTTPException(status_code=404, detail="Tracking not found")
    
    ticket_id = f"TKT-{uuid.uuid4().hex[:8].upper()}"
    
    ticket = {
        "id": ticket_id,
        "school_id": school.get("id"),
        "school_name": school.get("school_name"),
        "contact_name": school.get("contact_name"),
        "contact_phone": school.get("phone"),
        "contact_email": school.get("email"),
        "tracking_token": tracking_token,
        "step": ticket_data.get("step", "general"),
        "query_type": ticket_data.get("query_type", "general"),
        "description": ticket_data.get("description", ""),
        "priority": ticket_data.get("priority", "medium"),
        "status": "open",
        "source": "tracking_page",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "responses": []
    }
    
    await db.support_tickets.insert_one(ticket)
    
    # Add to onboarding timeline
    workflow = school.get("onboarding_workflow", {})
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": f"Support Ticket Created: {ticket_data.get('query_type', 'General Query')}",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": school.get("contact_name", "School")
    })
    
    await db.school_inquiries.update_one(
        {"id": school.get("id")},
        {"$set": {"onboarding_workflow.timeline": timeline}}
    )
    
    return {
        "success": True,
        "ticket_id": ticket_id,
        "message": "Support ticket created successfully. Our team will contact you soon."
    }

# Get tracking page tickets (for admin) - separate from general support tickets
@api_router.get("/support/tracking-tickets")
async def get_tracking_page_tickets(
    status: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Get support tickets created from tracking pages"""
    query = {"source": "tracking_page"}
    if status:
        query["status"] = status
    
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"tickets": tickets, "total": len(tickets)}

# Update tracking page ticket (for admin)
@api_router.patch("/support/tracking-tickets/{ticket_id}")
async def update_tracking_ticket(ticket_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a tracking page support ticket"""
    ticket = await db.support_tickets.find_one({"id": ticket_id, "source": "tracking_page"})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if "status" in data:
        update_data["status"] = data["status"]
    
    if "response" in data:
        responses = ticket.get("responses", [])
        responses.append({
            "text": data["response"],
            "by": user.get("name", user.get("email")),
            "date": datetime.now(timezone.utc).isoformat()
        })
        update_data["responses"] = responses
    
    if "assigned_to" in data:
        update_data["assigned_to"] = data["assigned_to"]
    
    await db.support_tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    updated_ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    return {"success": True, "ticket": updated_ticket}

@api_router.post("/support/tracking-tickets/{ticket_id}/assign")
async def assign_tracking_ticket(ticket_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Assign a tracking page support ticket to a user"""
    assigned_to = data.get("assigned_to")
    deadline = data.get("deadline")
    
    ticket = await db.support_tickets.find_one({"id": ticket_id, "source": "tracking_page"}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Handle unassign case
    if not assigned_to or assigned_to == "":
        await db.support_tickets.update_one(
            {"id": ticket_id}, 
            {"$set": {"assigned_to": None, "deadline": None}}
        )
        return {"message": "Ticket unassigned"}
    
    # Get the user being assigned
    assignee = await db.team_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.center_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.admins.find_one({"id": assigned_to}, {"_id": 0})
    
    assignee_name = assignee.get("name", "Team Member") if assignee else "Unknown"
    
    # Update the ticket with assignment
    update_data = {
        "assigned_to": assigned_to,
        "assigned_to_name": assignee_name,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "assigned_by": user.get("email", "admin"),
        "deadline": deadline,
        "status": "in_progress" if ticket.get("status") == "open" else ticket.get("status"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    return {"message": "Ticket assigned successfully", "assigned_to": assignee_name}

@api_router.delete("/support/tracking-tickets/{ticket_id}")
async def delete_tracking_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    """Delete a tracking page support ticket"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete tickets")
    
    result = await db.support_tickets.delete_one({"id": ticket_id, "source": "tracking_page"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"message": "Ticket deleted successfully"}

# ========================
# ORDERS & PAYMENTS
# ========================

@api_router.get("/orders/school-payments")
async def get_school_payments(
    user: dict = Depends(get_current_user)
):
    """Get all school payments from converted/active schools with payment tranches"""
    payments = []
    
    # Get all schools with onboarding_data containing payment tranches
    schools = await db.school_inquiries.find({
        "status": {"$in": ["converted", "active", "renewed"]},
    }).to_list(length=None)
    
    for school in schools:
        onboarding_data = school.get("onboarding_data", {})
        payment_tranches = onboarding_data.get("payment_tranches", [])
        school_payments = school.get("payments", [])
        
        # Create payment records from tranches
        for idx, tranche in enumerate(payment_tranches):
            # Check if there's already a payment record for this tranche
            existing_payment = next(
                (p for p in school_payments if p.get("tranche_index") == idx),
                None
            )
            
            amount = float(tranche.get("amount") or 0) if tranche.get("amount") else None
            if not amount and tranche.get("percentage"):
                total_amount = float(onboarding_data.get("total_amount") or 0)
                amount = total_amount * float(tranche.get("percentage") or 0) / 100
            
            payment = {
                "id": existing_payment.get("id") if existing_payment else f"pay-{school.get('id')}-{idx}",
                "school_id": school.get("id"),
                "school_name": school.get("school_name", ""),
                "contact_name": school.get("contact_name", ""),
                "tranche_index": idx,
                "tranche_info": f"Tranche {idx + 1}" + (f" ({tranche.get('percentage')}%)" if tranche.get("percentage") else ""),
                "amount": amount or 0,
                "due_date": tranche.get("date") or None,
                "status": existing_payment.get("status", tranche.get("status", "pending")) if existing_payment else tranche.get("status", "pending"),
                "gst_type": existing_payment.get("gst_type") if existing_payment else tranche.get("gst_type"),
                "payment_date": existing_payment.get("payment_date") if existing_payment else None,
                "transaction_id": existing_payment.get("transaction_id") if existing_payment else None,
                "invoice_url": existing_payment.get("invoice_url") if existing_payment else None,
                "receipt_url": existing_payment.get("receipt_url") if existing_payment else None,
                "notes": existing_payment.get("notes") if existing_payment else tranche.get("notes", ""),
                "paid_amount": existing_payment.get("paid_amount", 0) if existing_payment else 0,
                "created_at": existing_payment.get("created_at") if existing_payment else school.get("created_at"),
            }
            payments.append(payment)
    
    return payments


@api_router.get("/orders/school-details/{school_id}")
async def get_school_details_for_orders(
    school_id: str,
    user: dict = Depends(get_current_user)
):
    """Get school details for the Orders page - no role-based filtering since user can see payments"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school

@api_router.get("/orders/student-payments")
async def get_student_payments(
    user: dict = Depends(get_current_user)
):
    """Get all student payments (from converted students with payment details)"""
    payments = []
    
    # Get converted students from student_inquiries collection
    students = await db.student_inquiries.find({
        "status": {"$in": ["converted", "active", "enrolled"]}
    }).to_list(length=None)
    
    for student in students:
        onboarding_data = student.get("onboarding_data", {})
        student_payments = student.get("payments", [])
        
        # Create payment record from student conversion data
        amount = onboarding_data.get("amount") or onboarding_data.get("total_amount") or student.get("conversion_amount") or 0
        if amount:
            try:
                amount = float(amount)
            except:
                amount = 0
        
        existing_payment = student_payments[0] if student_payments else None
        
        payment = {
            "id": existing_payment.get("id") if existing_payment else f"stu-{student.get('id')}",
            "student_id": student.get("id"),
            "student_name": student.get("name", ""),
            "parent_name": student.get("parent_name", student.get("contact_name", "")),
            "phone": student.get("phone", ""),
            "email": student.get("email", ""),
            "description": f"{student.get('skill', '')} - {student.get('age_group', '')}".strip(' -'),
            "amount": amount,
            "due_date": onboarding_data.get("due_date") or student.get("due_date"),
            "status": existing_payment.get("status", "pending") if existing_payment else "pending",
            "payment_date": existing_payment.get("payment_date") if existing_payment else None,
            "transaction_id": existing_payment.get("transaction_id") if existing_payment else None,
            "invoice_url": (existing_payment.get("invoice_url") if existing_payment else None) or onboarding_data.get("invoice_url"),
            "receipt_url": (existing_payment.get("receipt_url") if existing_payment else None) or onboarding_data.get("receipt_url"),
            "payment_link": existing_payment.get("payment_link") if existing_payment else onboarding_data.get("payment_link"),
            "notes": existing_payment.get("notes") if existing_payment else "",
            "created_at": student.get("created_at"),
            # Payment source fields
            "payment_from": existing_payment.get("payment_from", "individual") if existing_payment else "individual",
            "payment_mode": existing_payment.get("payment_mode") if existing_payment else onboarding_data.get("payment_mode"),
            "gst_type": existing_payment.get("gst_type") if existing_payment else onboarding_data.get("gst_type"),
            "gst_amount": existing_payment.get("gst_amount") if existing_payment else onboarding_data.get("gst_amount"),
            "batch_name": student.get("batch_name", ""),
            # Additional conversion details
            "conversion_details": {
                "skill": student.get("skill", ""),
                "age_group": student.get("age_group", ""),
                "learning_mode": student.get("learning_mode", ""),
                "center": student.get("selected_center", ""),
                "city": student.get("city", ""),
                "demo_date": student.get("demo_date"),
                "converted_at": student.get("converted_at", student.get("updated_at")),
            }
        }
        payments.append(payment)
    
    # Also get payments from dedicated student_payments collection (Cashfree payments)
    direct_payments = await db.student_payments.find({}).to_list(length=None)
    direct_payment_student_ids = set()
    
    for dp in direct_payments:
        dp_id = dp.get("id", str(dp.get("_id", "")))
        student_id = dp.get("student_id")
        direct_payment_student_ids.add(student_id)
        
        # Format for display
        formatted_payment = {
            "id": dp_id,
            "student_id": student_id,
            "student_name": dp.get("student_name", ""),
            "phone": dp.get("student_phone", ""),
            "email": dp.get("student_email", ""),
            "description": f"{dp.get('batch_name', 'Batch')} - Paid via Cashfree",
            "amount": dp.get("amount", 0),
            "status": "paid" if dp.get("status") == "PAID" else dp.get("status", "pending"),
            "payment_date": dp.get("paid_at") or dp.get("created_at"),
            "transaction_id": dp.get("transaction_id") or dp.get("cf_payment_id"),
            "payment_method": dp.get("payment_method", "Cashfree"),
            "order_id": dp_id,
            "cf_order_id": dp.get("cf_order_id"),
            "notes": f"Online payment via Cashfree" if dp.get("status") == "PAID" else "",
            "created_at": dp.get("created_at"),
            # Payment source fields
            "payment_from": dp.get("payment_from", "individual"),
            "payment_mode": "online",
            "batch_name": dp.get("batch_name", ""),
            "conversion_details": {
                "skill": dp.get("skill", ""),
                "batch_name": dp.get("batch_name", ""),
                "batch_id": dp.get("batch_id", ""),
            }
        }
        dp.pop("_id", None)
        payments.append(formatted_payment)
    
    # Filter out students that already have direct payments to avoid duplicates
    payments = [p for p in payments if p.get("student_id") not in direct_payment_student_ids or p.get("payment_method")]
    
    return payments

@api_router.patch("/orders/{payment_id}")
async def update_payment(
    payment_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update a payment status, add invoice/receipt"""
    # Determine payment type from ID prefix or request data
    payment_type = data.get("type", "school")
    if payment_id.startswith("stu-"):
        payment_type = "student"
    
    if payment_type == "school":
        # Payment ID format: pay-{school_id}-{tranche_index}
        parts = payment_id.split("-")
        if len(parts) >= 3:
            school_id = "-".join(parts[1:-1])
            tranche_index = int(parts[-1])
        else:
            raise HTTPException(status_code=400, detail="Invalid payment ID format")
        
        school = await db.school_inquiries.find_one({"id": school_id})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        # Update the payment record
        payments = school.get("payments", [])
        existing_idx = next(
            (i for i, p in enumerate(payments) if p.get("tranche_index") == tranche_index),
            None
        )
        
        payment_record = {
            "id": payment_id,
            "tranche_index": tranche_index,
            "status": data.get("status", "pending"),
            "payment_date": data.get("payment_date"),
            "transaction_id": data.get("transaction_id"),
            "invoice_url": data.get("invoice_url"),
            "receipt_url": data.get("receipt_url"),
            "gst_type": data.get("gst_type"),
            "payment_link": data.get("payment_link"),
            "notes": data.get("notes", ""),
            "paid_amount": data.get("paid_amount", 0),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("name", user.get("email", "Admin")),
        }
        
        if existing_idx is not None:
            payment_record["created_at"] = payments[existing_idx].get("created_at", datetime.now(timezone.utc).isoformat())
            payments[existing_idx] = payment_record
        else:
            payment_record["created_at"] = datetime.now(timezone.utc).isoformat()
            payments.append(payment_record)
        
        # Send invoice email if new invoice is uploaded
        if data.get("invoice_url") and (existing_idx is None or not payments[existing_idx].get("invoice_url") if existing_idx is not None else True):
            # Get school contacts - specifically accounts team
            onboarding_data = school.get("onboarding_data", {})
            school_contacts = onboarding_data.get("school_contacts", [])
            accounts_contacts = [c for c in school_contacts if c.get("role") == "accounts"]
            
            # If no accounts contact, use all contacts
            recipient_contacts = accounts_contacts if accounts_contacts else school_contacts
            
            # Also add main school email
            recipient_emails = []
            if school.get("email"):
                recipient_emails.append(school.get("email"))
            for c in recipient_contacts:
                if c.get("email") and c.get("email") not in recipient_emails:
                    recipient_emails.append(c.get("email"))
            
            if recipient_emails:
                try:
                    mou_url = onboarding_data.get("mou_url", "")
                    school_name = school.get("school_name", "")
                    total_amount = onboarding_data.get("total_amount", 0)
                    
                    # Get tranche info
                    payment_tranches = onboarding_data.get("payment_tranches", [])
                    tranche_info = payment_tranches[tranche_index] if tranche_index < len(payment_tranches) else {}
                    tranche_amount = tranche_info.get("amount", 0)
                    
                    invoice_email_html = f"""
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
                        <!-- Header with Logo -->
                        <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8f 100%); padding: 30px; text-align: center;">
                            <img src="https://customer-assets.emergentagent.com/job_oll-skill-edu/artifacts/wzn0gh6k_OLL-horizontal-logo-white.png" alt="OLL Logo" style="height: 50px; margin-bottom: 15px;">
                            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Invoice for Payment</h1>
                        </div>
                        
                        <!-- Main Content -->
                        <div style="padding: 30px; background: #f8fafc;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                Dear {school.get('contact_name', 'Team')},
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                                Please find attached the invoice for <strong>{school_name}</strong>. We kindly request you to process the payment at your earliest convenience.
                            </p>
                            
                            <!-- Payment Details Box -->
                            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                                <h3 style="color: #1E3A5F; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #1E3A5F; padding-bottom: 10px;">Payment Details</h3>
                                <table style="width: 100%; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">School Name:</td>
                                        <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">{school_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">Payment For:</td>
                                        <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">Tranche {tranche_index + 1}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">Amount Due:</td>
                                        <td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 18px; text-align: right;">₹{float(tranche_amount):,.2f}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">Total Contract Value:</td>
                                        <td style="padding: 8px 0; color: #111827; text-align: right;">₹{float(total_amount):,.2f}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div style="text-align: center; margin-bottom: 25px;">
                                <a href="{data.get('invoice_url')}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 5px;">
                                    📄 Download Invoice
                                </a>
                                {"<a href='" + mou_url + "' style='display: inline-block; background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8f 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 5px;'>📋 Download MOU</a>" if mou_url else ""}
                            </div>
                            
                            <!-- Bank Details Box -->
                            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                                <h3 style="color: #92400e; font-size: 16px; margin: 0 0 15px 0; display: flex; align-items: center;">
                                    🏦 Bank Transfer Details
                                </h3>
                                <table style="width: 100%; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 6px 0; color: #78350f; width: 40%;">Account Name:</td>
                                        <td style="padding: 6px 0; color: #451a03; font-weight: 600;">Clonefutura Live Solutions Pvt Ltd</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #78350f;">Account No:</td>
                                        <td style="padding: 6px 0; color: #451a03; font-weight: 600;">50200063789133</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #78350f;">IFSC Code:</td>
                                        <td style="padding: 6px 0; color: #451a03; font-weight: 600;">HDFC0000240</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #78350f;">Bank:</td>
                                        <td style="padding: 6px 0; color: #451a03; font-weight: 600;">HDFC Bank - Sandoz House Worli</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Company Details -->
                            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                                <h4 style="color: #374151; font-size: 14px; margin: 0 0 12px 0;">Company Details</h4>
                                <p style="color: #6b7280; font-size: 13px; margin: 0; line-height: 1.6;">
                                    <strong style="color: #1E3A5F;">Clonefutura Live Solutions Pvt Ltd.</strong><br>
                                    103 1st floor - Kshitij building, Veera Desai Rd,<br>
                                    Dattaguru Nagar, Azad Nagar, Andheri West,<br>
                                    Mumbai, Maharashtra 400053<br><br>
                                    <strong>GST No:</strong> 27AAKCC1113B1ZC<br>
                                    <strong>PAN:</strong> AAKCC1113B<br>
                                    <strong>Phone:</strong> +91 9699188188
                                </p>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                                If you have any questions regarding this invoice, please don't hesitate to contact us at <a href="mailto:accounts@oll.co" style="color: #1E3A5F;">accounts@oll.co</a> or call +91 9699188188.
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #1E3A5F; color: white; padding: 20px; text-align: center; font-size: 12px;">
                            <p style="margin: 0 0 5px 0;">OLL</p>
                            <p style="margin: 0; opacity: 0.7;">accounts@oll.co | +91 9920188188</p>
                        </div>
                    </div>
                    """
                    
                    for email in recipient_emails:
                        try:
                            email_params = {
                                "from": "OLL Accounts <accounts@oll.co>",
                                "to": [email],
                                "subject": f"Invoice for {school_name} - Tranche {tranche_index + 1}",
                                "html": invoice_email_html
                            }
                            await asyncio.to_thread(resend.Emails.send, email_params)
                            print(f"Invoice email sent to {email}")
                        except Exception as email_err:
                            print(f"Failed to send invoice email to {email}: {email_err}")
                except Exception as e:
                    print(f"Invoice email error: {e}")
        
        # Update onboarding workflow if payment is marked as paid
        update_fields = {"payments": payments, "updated_at": datetime.now(timezone.utc).isoformat()}
        
        if data.get("status") == "paid":
            # Check if all tranches are paid
            onboarding_data = school.get("onboarding_data", {})
            payment_tranches = onboarding_data.get("payment_tranches", [])
            all_paid = all(
                any(p.get("tranche_index") == i and p.get("status") == "paid" for p in payments)
                for i in range(len(payment_tranches))
            ) if payment_tranches else True
            
            # Update onboarding workflow step
            workflow = school.get("onboarding_workflow", {})
            steps = workflow.get("steps", {})
            payment_step = steps.get("payment_collection", {})
            
            # Update payment step data
            payment_step["data"] = payment_step.get("data", {})
            payment_step["data"]["amount"] = data.get("amount") or payment_step["data"].get("amount")
            payment_step["data"]["payment_date"] = data.get("payment_date")
            payment_step["data"]["transaction_id"] = data.get("transaction_id")
            payment_step["data"]["receipt_url"] = data.get("receipt_url")
            payment_step["data"]["invoice_url"] = data.get("invoice_url")
            payment_step["data"]["payment_mode"] = "bank_transfer"  # Default
            
            # If all tranches paid, mark step as complete
            if all_paid and not payment_step.get("completed"):
                payment_step["completed"] = True
                payment_step["completed_date"] = datetime.now(timezone.utc).isoformat()
                
                # Update current step
                step_order = ["payment_collection", "kit_delivery", "distribution_checking", 
                              "technical_check", "teacher_training", "calendar_making", 
                              "timetable_finalization", "mou_signing", "school_confirmation"]
                for sk in step_order:
                    if not steps.get(sk, {}).get("completed", False):
                        workflow["current_step"] = sk
                        break
                
                # Add to timeline
                timeline = workflow.get("timeline", [])
                timeline.append({
                    "action": "Payment Collection - Completed",
                    "date": datetime.now(timezone.utc).isoformat(),
                    "by": user.get("name", user.get("email", "Admin")),
                    "step": "payment_collection"
                })
                workflow["timeline"] = timeline
            
            steps["payment_collection"] = payment_step
            workflow["steps"] = steps
            update_fields["onboarding_workflow"] = workflow
        
        await db.school_inquiries.update_one(
            {"id": school_id},
            {"$set": update_fields}
        )
        
        return {"success": True, "payment_id": payment_id, "status": data.get("status")}
    
    else:
        # Student payment - ID format: stu-{student_id}
        student_id = payment_id.replace("stu-", "")
        
        # Find the student
        student = await db.student_inquiries.find_one({"id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Get or initialize payments array
        payments = student.get("payments", [])
        
        # Find existing payment or create new one
        existing_idx = next(
            (i for i, p in enumerate(payments) if p.get("id") == payment_id),
            None
        )
        
        payment_record = {
            "id": payment_id,
            "status": data.get("status", "pending"),
            "payment_date": data.get("payment_date"),
            "transaction_id": data.get("transaction_id"),
            "invoice_url": data.get("invoice_url"),
            "receipt_url": data.get("receipt_url"),
            "notes": data.get("notes", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("name", user.get("email", "Admin")),
        }
        
        if existing_idx is not None:
            payment_record["created_at"] = payments[existing_idx].get("created_at", datetime.now(timezone.utc).isoformat())
            payments[existing_idx] = payment_record
        else:
            payment_record["created_at"] = datetime.now(timezone.utc).isoformat()
            payments.append(payment_record)
        
        # Update student record
        await db.student_inquiries.update_one(
            {"id": student_id},
            {"$set": {
                "payments": payments,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"success": True, "payment_id": payment_id, "status": data.get("status")}


@api_router.delete("/orders/student-payments/{payment_id}")
async def delete_student_payment(
    payment_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a student payment record"""
    # Check if it's a direct payment from student_payments collection (Cashfree)
    if not payment_id.startswith("stu-"):
        # This is a Cashfree payment - delete from student_payments collection
        result = await db.student_payments.delete_one({"id": payment_id})
        if result.deleted_count == 0:
            # Try with _id as string fallback
            result = await db.student_payments.delete_one({"order_id": payment_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Payment record not found")
        
        return {"success": True, "message": "Payment record deleted successfully"}
    
    # It's a student inquiry payment - ID format: stu-{student_id}
    student_id = payment_id.replace("stu-", "")
    
    # Find the student
    student = await db.student_inquiries.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get payments array
    payments = student.get("payments", [])
    
    # Find and remove the payment
    payment_idx = next(
        (i for i, p in enumerate(payments) if p.get("id") == payment_id),
        None
    )
    
    if payment_idx is not None:
        payments.pop(payment_idx)
        
        # Update student record
        await db.student_inquiries.update_one(
            {"id": student_id},
            {"$set": {
                "payments": payments,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {"success": True, "message": "Payment record deleted successfully"}


@api_router.delete("/orders/school-payments/{payment_id}")
async def delete_school_payment(
    payment_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a school payment record (tranche payment)"""
    # Parse school_id and tranche_index from payment_id
    # Format: sch-{school_id}-t{tranche_index}
    parts = payment_id.split("-t")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid payment ID format")
    
    school_id = parts[0].replace("sch-", "")
    try:
        tranche_index = int(parts[1])
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tranche index")
    
    # Find the school
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Get payments array
    payments = school.get("payments", [])
    
    # Find and remove the payment
    payment_idx = next(
        (i for i, p in enumerate(payments) if p.get("id") == payment_id),
        None
    )
    
    if payment_idx is not None:
        payments.pop(payment_idx)
        
        # Update school record
        await db.school_inquiries.update_one(
            {"id": school_id},
            {"$set": {
                "payments": payments,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {"success": True, "message": "Payment record deleted successfully"}


# ========================
# DATA CENTER - UNIFIED DATABASE
# ========================

@api_router.get("/data-center/search")
async def search_data_center(
    q: Optional[str] = None,
    data_type: Optional[str] = None,  # students, schools, educators, team, growth_partners, all
    status: Optional[str] = None,
    city: Optional[str] = None,
    age_group: Optional[str] = None,
    board: Optional[str] = None,
    skill: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Search across all data types including team and growth partners"""
    results = {"students": [], "schools": [], "educators": [], "team": [], "growth_partners": [], "total": 0}
    
    # Build search regex
    search_regex = {"$regex": q, "$options": "i"} if q else None
    
    # Search students
    if data_type in [None, "all", "students"]:
        student_query = {}
        if search_regex:
            student_query["$or"] = [
                {"name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"city": search_regex},
            ]
        if status:
            student_query["status"] = status
        if city:
            student_query["city"] = {"$regex": city, "$options": "i"}
        if age_group:
            student_query["age_group"] = age_group
        if skill:
            student_query["skill"] = skill
        
        students = await db.student_inquiries.find(student_query, {"_id": 0}).limit(limit).to_list(limit)
        results["students"] = students
    
    # Search schools
    if data_type in [None, "all", "schools"]:
        school_query = {}
        if search_regex:
            school_query["$or"] = [
                {"school_name": search_regex},
                {"contact_name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"location": search_regex},
            ]
        if status:
            school_query["status"] = status
        if city:
            school_query["location"] = {"$regex": city, "$options": "i"}
        if board:
            school_query["board"] = board
        
        schools = await db.school_inquiries.find(school_query, {"_id": 0}).limit(limit).to_list(limit)
        results["schools"] = schools
    
    # Search educators
    if data_type in [None, "all", "educators"]:
        educator_query = {}
        if search_regex:
            educator_query["$or"] = [
                {"name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"city": search_regex},
            ]
        if status:
            educator_query["status"] = status
        if city:
            educator_query["city"] = {"$regex": city, "$options": "i"}
        if skill:
            educator_query["skills"] = {"$regex": skill, "$options": "i"}
        
        educators = await db.educator_applications.find(educator_query, {"_id": 0}).limit(limit).to_list(limit)
        results["educators"] = educators
    
    # Search team members
    if data_type in [None, "all", "team"]:
        team_query = {}
        if search_regex:
            team_query["$or"] = [
                {"name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"username": search_regex},
            ]
        if status:
            team_query["is_active"] = status == "active"
        
        team_members = await db.team_users.find(team_query, {"_id": 0, "password_hash": 0}).limit(limit).to_list(limit)
        # Add status field for consistency
        for t in team_members:
            t["status"] = "active" if t.get("is_active", True) else "inactive"
        results["team"] = team_members
    
    # Search growth partners
    if data_type in [None, "all", "growth_partners"]:
        gp_query = {}
        if search_regex:
            gp_query["$or"] = [
                {"name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"company": search_regex},
            ]
        if status:
            gp_query["status"] = status
        if city:
            gp_query["city"] = {"$regex": city, "$options": "i"}
        
        growth_partners = await db.growth_partners.find(gp_query, {"_id": 0}).limit(limit).to_list(limit)
        results["growth_partners"] = growth_partners
    
    results["total"] = len(results["students"]) + len(results["schools"]) + len(results["educators"]) + len(results["team"]) + len(results["growth_partners"])
    return results

@api_router.get("/data-center/stats")
async def get_data_center_stats(user: dict = Depends(get_current_user)):
    """Get statistics for data center including team and growth partners"""
    student_count = await db.student_inquiries.count_documents({})
    school_count = await db.school_inquiries.count_documents({})
    educator_count = await db.educator_applications.count_documents({})
    team_count = await db.team_users.count_documents({})
    gp_count = await db.growth_partners.count_documents({})
    
    # Get status breakdowns
    student_statuses = {}
    async for doc in db.student_inquiries.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        student_statuses[doc["_id"] or "unknown"] = doc["count"]
    
    school_statuses = {}
    async for doc in db.school_inquiries.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        school_statuses[doc["_id"] or "unknown"] = doc["count"]
    
    educator_statuses = {}
    async for doc in db.educator_applications.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        educator_statuses[doc["_id"] or "unknown"] = doc["count"]
    
    # Team status breakdown (active/inactive)
    team_active = await db.team_users.count_documents({"is_active": True})
    team_inactive = await db.team_users.count_documents({"is_active": False})
    team_statuses = {"active": team_active, "inactive": team_inactive}
    
    # Growth partners status breakdown
    gp_statuses = {}
    async for doc in db.growth_partners.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        gp_statuses[doc["_id"] or "unknown"] = doc["count"]
    
    return {
        "totals": {
            "students": student_count,
            "schools": school_count,
            "educators": educator_count,
            "team": team_count,
            "growth_partners": gp_count,
        },
        "by_status": {
            "students": student_statuses,
            "schools": school_statuses,
            "educators": educator_statuses,
            "team": team_statuses,
            "growth_partners": gp_statuses,
        }
    }

@api_router.get("/data-center/autocomplete")
async def autocomplete_search(
    q: str,
    data_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Autocomplete search for forms - search by name, phone, or email"""
    if len(q) < 2:
        return []
    
    search_regex = {"$regex": q, "$options": "i"}
    results = []
    
    # Search students
    if data_type in [None, "students"]:
        students = await db.student_inquiries.find(
            {"$or": [{"name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "city": 1, "age_group": 1, "skill": 1, "learning_mode": 1, "learning_goal": 1, "address": 1}
        ).limit(5).to_list(5)
        for s in students:
            s["type"] = "student"
            results.append(s)
    
    # Search schools
    if data_type in [None, "schools"]:
        schools = await db.school_inquiries.find(
            {"$or": [{"school_name": search_regex}, {"contact_name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "id": 1, "school_name": 1, "contact_name": 1, "phone": 1, "email": 1, "location": 1, "board": 1, "student_count": 1, "meeting_type": 1}
        ).limit(5).to_list(5)
        for s in schools:
            s["type"] = "school"
            s["name"] = s.get("school_name") or s.get("contact_name")
            results.append(s)
    
    # Search educators
    if data_type in [None, "educators"]:
        educators = await db.educator_applications.find(
            {"$or": [{"name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "city": 1, "skills": 1}
        ).limit(5).to_list(5)
        for e in educators:
            e["type"] = "educator"
            results.append(e)
    
    return results[:10]

@api_router.put("/data-center/{data_type}/{record_id}")
async def update_data_center_record(
    data_type: str,
    record_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update a record in the data center"""
    collection_map = {
        "students": "student_inquiries",
        "schools": "school_inquiries",
        "educators": "educator_applications",
        "team": "team_applications",
        "growth_partners": "growth_partner_applications"
    }
    
    if data_type not in collection_map:
        raise HTTPException(status_code=400, detail="Invalid data type")
    
    collection_name = collection_map[data_type]
    collection = db[collection_name]
    
    # Remove fields that shouldn't be updated
    update_data = {k: v for k, v in data.items() if k not in ["id", "_id", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await collection.update_one({"id": record_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return {"message": "Record updated successfully"}

@api_router.delete("/data-center/{data_type}/{record_id}")
async def delete_data_center_record(
    data_type: str,
    record_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a record from the data center"""
    # Only admin can delete
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete records")
    
    collection_map = {
        "students": "student_inquiries",
        "schools": "school_inquiries",
        "educators": "educator_applications",
        "team": "team_applications",
        "growth_partners": "growth_partner_applications"
    }
    
    if data_type not in collection_map:
        raise HTTPException(status_code=400, detail="Invalid data type")
    
    collection_name = collection_map[data_type]
    collection = db[collection_name]
    
    result = await collection.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return {"message": "Record deleted successfully"}

# Public autocomplete endpoint (no auth required) for /add page
@api_router.get("/public/autocomplete")
async def public_autocomplete_search(
    q: str,
    data_type: Optional[str] = None
):
    """Public autocomplete for /add page - search by name, phone, or email"""
    if len(q) < 3:
        return []
    
    search_regex = {"$regex": q, "$options": "i"}
    results = []
    
    # Search students
    if data_type in [None, "students"]:
        students = await db.student_inquiries.find(
            {"$or": [{"name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "name": 1, "phone": 1, "email": 1, "city": 1, "age_group": 1, "skill": 1, "learning_mode": 1}
        ).limit(5).to_list(5)
        for s in students:
            s["type"] = "student"
            results.append(s)
    
    # Search schools
    if data_type in [None, "schools"]:
        schools = await db.school_inquiries.find(
            {"$or": [{"school_name": search_regex}, {"contact_name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "school_name": 1, "contact_name": 1, "phone": 1, "email": 1, "location": 1, "board": 1, "student_count": 1}
        ).limit(5).to_list(5)
        for s in schools:
            s["type"] = "school"
            s["name"] = s.get("school_name") or s.get("contact_name")
            results.append(s)
    
    # Search educators
    if data_type in [None, "educators"]:
        educators = await db.educator_applications.find(
            {"$or": [{"name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "name": 1, "phone": 1, "email": 1, "city": 1, "skills": 1}
        ).limit(5).to_list(5)
        for e in educators:
            e["type"] = "educator"
            results.append(e)
    
    return results[:10]

# School Offerings endpoint
@api_router.get("/school-offerings")
async def get_school_offerings():
    """Get all school offerings for selection"""
    offerings = await db.school_offerings.find({}, {"_id": 0}).to_list(100)
    if not offerings:
        # Return comprehensive offerings matching the website
        return [
            # Robotics Programs (12)
            {"id": "robotics-curriculum-kits", "title": "Robotics Curriculum with Take-home Kits & Books", "category": "Robotics", "type": "curriculum"},
            {"id": "robotics-lab-setup", "title": "Robotics Curriculum with Lab Setup & Books", "category": "Robotics", "type": "lab"},
            {"id": "robotics-exhibition-prep", "title": "Robotics Exhibition Preparation", "category": "Robotics", "type": "event"},
            {"id": "host-robotics-exhibition", "title": "Host a Robotics Exhibition in Your School", "category": "Robotics", "type": "event"},
            {"id": "iit-bombay-competitions", "title": "Participate in Robotics Competitions at IIT Bombay", "category": "Robotics", "type": "competition"},
            {"id": "robotics-competition-prep", "title": "Preparation for Robotics Competitions", "category": "Robotics", "type": "competition"},
            {"id": "icse-group3-kits", "title": "Grade 9 & 10 ICSE Group 3 Subject Kits", "category": "Robotics", "type": "curriculum"},
            {"id": "afterschool-robotics", "title": "Afterschool Robotics Classes", "category": "Robotics", "type": "afterschool"},
            {"id": "robotics-summer-camp", "title": "Robotics Summer Camp", "category": "Robotics", "type": "camp"},
            {"id": "robotics-ai-seminar", "title": "Robotics & AI Seminar for Students", "category": "Robotics", "type": "seminar"},
            {"id": "robotics-books", "title": "Robotics Books", "category": "Robotics", "type": "materials"},
            {"id": "robotics-kits", "title": "Robotics Kits", "category": "Robotics", "type": "materials"},
            
            # Financial Literacy & Entrepreneurship Programs (5)
            {"id": "entrepreneurship-workshop", "title": "Entrepreneurship 3 Day Workshop", "category": "Financial Literacy", "type": "workshop"},
            {"id": "skill-titans-olympiad", "title": "Skill Titans TV Show & Entrepreneurship Olympiad", "category": "Financial Literacy", "type": "competition"},
            {"id": "fl-curriculum", "title": "Financial Literacy & Entrepreneurship Program as Part of Curriculum", "category": "Financial Literacy", "type": "curriculum"},
            {"id": "ecell-opening", "title": "E-Cell Opening in School", "category": "Financial Literacy", "type": "program"},
            {"id": "fl-summer-camp", "title": "Financial Literacy & Entrepreneurship Summer Camp", "category": "Financial Literacy", "type": "camp"},
            
            # AI & Machine Learning Programs (5)
            {"id": "ai-center-excellence", "title": "Launch an AI Center for Excellence", "category": "AI & ML", "type": "lab"},
            {"id": "agentic-ai-workshop", "title": "Agentic AI Workshop for Students", "category": "AI & ML", "type": "workshop"},
            {"id": "ai-seminar", "title": "AI Seminar", "category": "AI & ML", "type": "seminar"},
            {"id": "agentic-ai-summer-camp", "title": "Agentic AI Summer Camp", "category": "AI & ML", "type": "camp"},
            {"id": "ai-services-agency-course", "title": "Start AI Services Agency Course for College Students", "category": "AI & ML", "type": "course"},
            
            # Coding & Programming Programs (3)
            {"id": "vibe-coding-seminar", "title": "Vibe Coding Seminar", "category": "Coding", "type": "seminar"},
            {"id": "coding-afterschool", "title": "Coding & Logic Building After School Classes", "category": "Coding", "type": "afterschool"},
            {"id": "coding-summer-camp", "title": "Coding Summer Camp", "category": "Coding", "type": "camp"},
        ]
    return offerings

@api_router.get("/partner-schools")
async def get_partner_schools():
    """Get list of partner schools for display"""
    schools = await db.partner_schools.find({"is_active": True}, {"_id": 0}).to_list(100)
    if not schools:
        # Return default partner schools if none in DB
        return [
            "Greenlawns High School", "G.D. Somani Memorial School", "N.L. Dalmia High School",
            "Hiranandani Foundation School", "JBCN International School", "Seven Square Academy",
            "Goregaon Education Society English Medium School", "Sanjeevani World School",
            "Fravashi International Academy", "Maneckji Cooper Education Trust", "Excelsior School",
            "J.N. Petit School", "Seth Anandram Jaipuria School", "St. Kabir School",
            "St. Gregorios High School", "St. Anne's High School Fort", "St. Wilfred's School",
            "Manav Mandir High School", "Jankidevi Public School", "Guardian School",
            "Parle Tilak Vidyalaya", "JB Vachha High School", "Vedas International School",
            "C.N.M. & N.D. Parekh ICSE School", "Ram Ratna International School", "Navodaya Central School"
        ]
    return [s.get("name", s) for s in schools]

# ========================
# ABOUT PAGE ENDPOINTS
# ========================

@api_router.get("/about", response_model=AboutContent)
async def get_about_content():
    content = await db.about_content.find_one({"id": "about-page"}, {"_id": 0})
    if not content:
        # Return default content
        return AboutContent(
            mission="To democratize skill education and empower every student with future-ready skills.",
            vision="A world where every child has access to quality skill education.",
            what_we_do="We provide comprehensive skill education programs in Robotics, Coding, AI, Entrepreneurship, and Financial Literacy.",
            media_features=[
                {"name": "Shark Tank India", "description": "Featured on Shark Tank India Season 2"},
                {"name": "KBC", "description": "Recognized by Kaun Banega Crorepati"}
            ],
            team_members=[],
            gallery_images=[],
            updates=[]
        )
    return content

@api_router.patch("/about", response_model=AboutContent)
async def update_about_content(data: AboutContentUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.about_content.update_one(
        {"id": "about-page"}, 
        {"$set": update_data}, 
        upsert=True
    )
    content = await db.about_content.find_one({"id": "about-page"}, {"_id": 0})
    return content

# ========================
# DEMO SLOTS ENDPOINTS
# ========================

@api_router.get("/demo-slots")
async def get_available_demo_slots(date: Optional[str] = None):
    # Generate available slots for next 14 days
    slots = []
    base_date = datetime.now(timezone.utc).date()
    times = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"]
    
    for i in range(14):
        current_date = base_date + timedelta(days=i)
        if current_date.weekday() < 6:  # Monday to Saturday
            date_str = current_date.isoformat()
            for time in times:
                # Check if slot is booked
                booked = await db.demo_bookings.find_one({
                    "date": date_str,
                    "time": time
                })
                slots.append({
                    "date": date_str,
                    "time": time,
                    "is_available": booked is None
                })
    
    if date:
        slots = [s for s in slots if s["date"] == date]
    
    return slots

# ========================
# DASHBOARD STATS ENDPOINTS
# ========================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    # Check if user is a team member (not admin)
    is_team_member = user.get("role") != "admin"
    user_id = user.get("id")
    
    from datetime import timedelta
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Calculate overdue date (demos/meetings in the past that are still "new" status)
    async def get_overdue_items(user_filter=None):
        """Get items where demo/meeting date has passed but status is still 'new'"""
        base_filter = {"status": "new"}
        if user_filter:
            base_filter["assigned_to"] = user_filter
        
        # Overdue student demos (demo_date < today and status is new)
        overdue_students = await db.student_inquiries.find(
            {**base_filter, "demo_date": {"$lt": today, "$ne": None, "$exists": True}},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, "demo_date": 1, "demo_time": 1, "skill": 1}
        ).to_list(20)
        
        # Overdue school meetings
        overdue_schools = await db.school_inquiries.find(
            {**base_filter, "meeting_date": {"$lt": today, "$ne": None, "$exists": True}},
            {"_id": 0, "id": 1, "school_name": 1, "contact_name": 1, "phone": 1, "meeting_date": 1, "meeting_time": 1}
        ).to_list(20)
        
        # Overdue educator demos
        overdue_filter = {"status": {"$in": ["new", "demo_scheduled"]}}
        if user_filter:
            overdue_filter["assigned_to"] = user_filter
        overdue_educators = await db.educator_applications.find(
            {**overdue_filter, "demo_date": {"$lt": today, "$ne": None, "$exists": True}},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, "demo_date": 1, "demo_time": 1, "skills": 1}
        ).to_list(20)
        
        return {
            "overdue_students": overdue_students,
            "overdue_schools": overdue_schools,
            "overdue_educators": overdue_educators,
            "total_overdue": len(overdue_students) + len(overdue_schools) + len(overdue_educators)
        }
    
    # If team member, filter by assigned_to
    if is_team_member and user_id:
        student_count = await db.student_inquiries.count_documents({"assigned_to": user_id})
        school_count = await db.school_inquiries.count_documents({"assigned_to": user_id})
        educator_count = await db.educator_applications.count_documents({"assigned_to": user_id})
        ticket_count = await db.support_tickets.count_documents({"assigned_to": user_id, "status": "open"})
        
        student_new = await db.student_inquiries.count_documents({"assigned_to": user_id, "status": "new"})
        student_converted = await db.student_inquiries.count_documents({"assigned_to": user_id, "status": "converted"})
        school_new = await db.school_inquiries.count_documents({"assigned_to": user_id, "status": "new"})
        educator_new = await db.educator_applications.count_documents({"assigned_to": user_id, "status": "new"})
        
        followups_today = await db.school_inquiries.count_documents({
            "assigned_to": user_id,
            "followup_date": {"$in": [today, tomorrow]}
        })
        
        # Count leads added by this user
        leads_added = await db.student_inquiries.count_documents({"added_by": user_id})
        leads_added += await db.school_inquiries.count_documents({"added_by": user_id})
        leads_added += await db.educator_applications.count_documents({"added_by": user_id})
        
        # Get today's meetings/demos for team member
        todays_student_demos = await db.student_inquiries.find(
            {"assigned_to": user_id, "demo_date": today, "status": "new"},
            {"_id": 0, "name": 1, "phone": 1, "demo_time": 1, "skill": 1}
        ).to_list(20)
        
        todays_school_meetings = await db.school_inquiries.find(
            {"assigned_to": user_id, "meeting_date": today, "status": "new"},
            {"_id": 0, "school_name": 1, "contact_name": 1, "phone": 1, "meeting_time": 1}
        ).to_list(20)
        
        todays_educator_demos = await db.educator_applications.find(
            {"assigned_to": user_id, "demo_date": today, "status": {"$in": ["new", "demo_scheduled"]}},
            {"_id": 0, "name": 1, "phone": 1, "demo_time": 1, "skills": 1}
        ).to_list(20)
        
        # Get overdue items for team member
        overdue_data = await get_overdue_items(user_id)
        
        return {
            "total_students": student_count,
            "total_schools": school_count,
            "total_educators": educator_count,
            "open_tickets": ticket_count,
            "new_student_leads": student_new,
            "converted_students": student_converted,
            "new_school_leads": school_new,
            "new_educator_applications": educator_new,
            "followups_due": followups_today,
            "leads_added_by_me": leads_added,
            "todays_student_demos": todays_student_demos,
            "todays_school_meetings": todays_school_meetings,
            "todays_educator_demos": todays_educator_demos,
            "overdue_students": overdue_data["overdue_students"],
            "overdue_schools": overdue_data["overdue_schools"],
            "overdue_educators": overdue_data["overdue_educators"],
            "total_overdue": overdue_data["total_overdue"],
            "is_team_member": True
        }
    
    # Admin gets all stats
    student_count = await db.student_inquiries.count_documents({})
    school_count = await db.school_inquiries.count_documents({})
    educator_count = await db.educator_applications.count_documents({})
    ticket_count = await db.support_tickets.count_documents({"status": "open"})
    
    # Get counts by status
    student_new = await db.student_inquiries.count_documents({"status": "new"})
    student_converted = await db.student_inquiries.count_documents({"status": "converted"})
    school_new = await db.school_inquiries.count_documents({"status": "new"})
    educator_new = await db.educator_applications.count_documents({"status": "new"})
    
    # Get today's meetings/demos for admin (all)
    todays_student_demos = await db.student_inquiries.find(
        {"demo_date": today, "status": "new"},
        {"_id": 0, "name": 1, "phone": 1, "demo_time": 1, "skill": 1, "assigned_to": 1}
    ).to_list(50)
    
    todays_school_meetings = await db.school_inquiries.find(
        {"meeting_date": today, "status": "new"},
        {"_id": 0, "school_name": 1, "contact_name": 1, "phone": 1, "meeting_time": 1, "assigned_to": 1}
    ).to_list(50)
    
    todays_educator_demos = await db.educator_applications.find(
        {"demo_date": today, "status": {"$in": ["new", "demo_scheduled"]}},
        {"_id": 0, "name": 1, "phone": 1, "demo_time": 1, "skills": 1, "assigned_to": 1}
    ).to_list(50)
    
    # Get overdue items for admin (all)
    overdue_data = await get_overdue_items(None)
    
    return {
        "total_students": student_count,
        "total_schools": school_count,
        "total_educators": educator_count,
        "open_tickets": ticket_count,
        "new_student_leads": student_new,
        "converted_students": student_converted,
        "new_school_leads": school_new,
        "new_educator_applications": educator_new,
        "todays_student_demos": todays_student_demos,
        "todays_school_meetings": todays_school_meetings,
        "todays_educator_demos": todays_educator_demos,
        "overdue_students": overdue_data["overdue_students"],
        "overdue_schools": overdue_data["overdue_schools"],
        "overdue_educators": overdue_data["overdue_educators"],
        "total_overdue": overdue_data["total_overdue"],
        "is_team_member": False
    }

# ========================
# CITY ENDPOINTS
# ========================

@api_router.get("/cities", response_model=List[City])
async def get_cities(search: Optional[str] = None, active_only: bool = False):
    query = {}
    if active_only:
        query["is_active"] = True
    cities = await db.cities.find(query, {"_id": 0}).sort([("state", 1), ("name", 1)]).to_list(2000)
    if search:
        s = search.lower()
        cities = [c for c in cities if s in c.get("name", "").lower() or s in c.get("state", "").lower()]
    return cities


@api_router.post("/cities/seed-india")
async def seed_india_cities(user: dict = Depends(get_current_user)):
    """Seed the DB with all India cities and states. Skips cities already present (by name)."""
    INDIA_CITIES = [
        # Andhra Pradesh
        ("Visakhapatnam", "Andhra Pradesh"), ("Vijayawada", "Andhra Pradesh"), ("Guntur", "Andhra Pradesh"),
        ("Nellore", "Andhra Pradesh"), ("Kurnool", "Andhra Pradesh"), ("Rajahmundry", "Andhra Pradesh"),
        ("Tirupati", "Andhra Pradesh"), ("Kakinada", "Andhra Pradesh"), ("Kadapa", "Andhra Pradesh"),
        ("Anantapur", "Andhra Pradesh"), ("Vizianagaram", "Andhra Pradesh"), ("Eluru", "Andhra Pradesh"),
        ("Ongole", "Andhra Pradesh"), ("Nandyal", "Andhra Pradesh"), ("Chittoor", "Andhra Pradesh"),
        # Arunachal Pradesh
        ("Itanagar", "Arunachal Pradesh"), ("Naharlagun", "Arunachal Pradesh"),
        # Assam
        ("Guwahati", "Assam"), ("Silchar", "Assam"), ("Dibrugarh", "Assam"), ("Jorhat", "Assam"),
        ("Nagaon", "Assam"), ("Tinsukia", "Assam"), ("Tezpur", "Assam"), ("Bongaigaon", "Assam"),
        # Bihar
        ("Patna", "Bihar"), ("Gaya", "Bihar"), ("Bhagalpur", "Bihar"), ("Muzaffarpur", "Bihar"),
        ("Darbhanga", "Bihar"), ("Purnia", "Bihar"), ("Arrah", "Bihar"), ("Begusarai", "Bihar"),
        ("Katihar", "Bihar"), ("Munger", "Bihar"), ("Chapra", "Bihar"), ("Saharsa", "Bihar"),
        ("Sitamarhi", "Bihar"), ("Hajipur", "Bihar"), ("Bihar Sharif", "Bihar"),
        # Chhattisgarh
        ("Raipur", "Chhattisgarh"), ("Bhilai", "Chhattisgarh"), ("Bilaspur", "Chhattisgarh"),
        ("Korba", "Chhattisgarh"), ("Durg", "Chhattisgarh"), ("Raigarh", "Chhattisgarh"),
        ("Rajnandgaon", "Chhattisgarh"), ("Jagdalpur", "Chhattisgarh"), ("Ambikapur", "Chhattisgarh"),
        # Goa
        ("Panaji", "Goa"), ("Vasco da Gama", "Goa"), ("Margao", "Goa"), ("Mapusa", "Goa"),
        # Gujarat
        ("Ahmedabad", "Gujarat"), ("Surat", "Gujarat"), ("Vadodara", "Gujarat"), ("Rajkot", "Gujarat"),
        ("Bhavnagar", "Gujarat"), ("Jamnagar", "Gujarat"), ("Junagadh", "Gujarat"), ("Gandhinagar", "Gujarat"),
        ("Gandhidham", "Gujarat"), ("Anand", "Gujarat"), ("Navsari", "Gujarat"), ("Morbi", "Gujarat"),
        ("Nadiad", "Gujarat"), ("Surendranagar", "Gujarat"), ("Bharuch", "Gujarat"), ("Mehsana", "Gujarat"),
        ("Bhuj", "Gujarat"), ("Porbandar", "Gujarat"), ("Palanpur", "Gujarat"), ("Valsad", "Gujarat"),
        # Haryana
        ("Faridabad", "Haryana"), ("Gurugram", "Haryana"), ("Panipat", "Haryana"), ("Ambala", "Haryana"),
        ("Yamunanagar", "Haryana"), ("Rohtak", "Haryana"), ("Hisar", "Haryana"), ("Karnal", "Haryana"),
        ("Sonipat", "Haryana"), ("Panchkula", "Haryana"), ("Bhiwani", "Haryana"), ("Sirsa", "Haryana"),
        ("Bahadurgarh", "Haryana"), ("Rewari", "Haryana"), ("Kurukshetra", "Haryana"),
        # Himachal Pradesh
        ("Shimla", "Himachal Pradesh"), ("Dharamshala", "Himachal Pradesh"), ("Solan", "Himachal Pradesh"),
        ("Mandi", "Himachal Pradesh"), ("Baddi", "Himachal Pradesh"), ("Kullu", "Himachal Pradesh"),
        # Jharkhand
        ("Ranchi", "Jharkhand"), ("Jamshedpur", "Jharkhand"), ("Dhanbad", "Jharkhand"),
        ("Bokaro", "Jharkhand"), ("Hazaribagh", "Jharkhand"), ("Deoghar", "Jharkhand"),
        ("Giridih", "Jharkhand"), ("Ramgarh", "Jharkhand"),
        # Karnataka
        ("Bangalore", "Karnataka"), ("Mysore", "Karnataka"), ("Hubli", "Karnataka"),
        ("Mangalore", "Karnataka"), ("Belgaum", "Karnataka"), ("Gulbarga", "Karnataka"),
        ("Davangere", "Karnataka"), ("Bellary", "Karnataka"), ("Shimoga", "Karnataka"),
        ("Tumkur", "Karnataka"), ("Udupi", "Karnataka"), ("Bijapur", "Karnataka"),
        ("Hassan", "Karnataka"), ("Bidar", "Karnataka"), ("Raichur", "Karnataka"),
        ("Dharwad", "Karnataka"), ("Bagalkot", "Karnataka"), ("Chitradurga", "Karnataka"),
        ("Hospet", "Karnataka"), ("Gadag", "Karnataka"),
        # Kerala
        ("Thiruvananthapuram", "Kerala"), ("Kochi", "Kerala"), ("Kozhikode", "Kerala"),
        ("Thrissur", "Kerala"), ("Kollam", "Kerala"), ("Alappuzha", "Kerala"),
        ("Kannur", "Kerala"), ("Palakkad", "Kerala"), ("Kottayam", "Kerala"),
        ("Malappuram", "Kerala"), ("Irinjalakuda", "Kerala"), ("Kasaragod", "Kerala"),
        # Madhya Pradesh
        ("Indore", "Madhya Pradesh"), ("Bhopal", "Madhya Pradesh"), ("Jabalpur", "Madhya Pradesh"),
        ("Gwalior", "Madhya Pradesh"), ("Ujjain", "Madhya Pradesh"), ("Sagar", "Madhya Pradesh"),
        ("Dewas", "Madhya Pradesh"), ("Satna", "Madhya Pradesh"), ("Ratlam", "Madhya Pradesh"),
        ("Rewa", "Madhya Pradesh"), ("Murwara", "Madhya Pradesh"), ("Singrauli", "Madhya Pradesh"),
        ("Burhanpur", "Madhya Pradesh"), ("Khandwa", "Madhya Pradesh"), ("Bhind", "Madhya Pradesh"),
        ("Chhindwara", "Madhya Pradesh"), ("Guna", "Madhya Pradesh"), ("Shivpuri", "Madhya Pradesh"),
        ("Vidisha", "Madhya Pradesh"), ("Damoh", "Madhya Pradesh"), ("Mandsaur", "Madhya Pradesh"),
        ("Neemuch", "Madhya Pradesh"), ("Itarsi", "Madhya Pradesh"),
        # Maharashtra
        ("Mumbai", "Maharashtra"), ("Pune", "Maharashtra"), ("Nagpur", "Maharashtra"),
        ("Thane", "Maharashtra"), ("Nashik", "Maharashtra"), ("Aurangabad", "Maharashtra"),
        ("Solapur", "Maharashtra"), ("Kolhapur", "Maharashtra"), ("Navi Mumbai", "Maharashtra"),
        ("Amravati", "Maharashtra"), ("Sangli", "Maharashtra"), ("Pimpri-Chinchwad", "Maharashtra"),
        ("Akola", "Maharashtra"), ("Latur", "Maharashtra"), ("Dhule", "Maharashtra"),
        ("Ahmednagar", "Maharashtra"), ("Chandrapur", "Maharashtra"), ("Parbhani", "Maharashtra"),
        ("Jalgaon", "Maharashtra"), ("Bhiwandi", "Maharashtra"), ("Jalna", "Maharashtra"),
        ("Nanded", "Maharashtra"), ("Osmanabad", "Maharashtra"), ("Ratnagiri", "Maharashtra"),
        ("Satara", "Maharashtra"), ("Beed", "Maharashtra"), ("Wardha", "Maharashtra"),
        ("Yavatmal", "Maharashtra"), ("Buldhana", "Maharashtra"), ("Vasai-Virar", "Maharashtra"),
        ("Mira-Bhayandar", "Maharashtra"), ("Kalyan", "Maharashtra"), ("Ulhasnagar", "Maharashtra"),
        # Manipur
        ("Imphal", "Manipur"),
        # Meghalaya
        ("Shillong", "Meghalaya"),
        # Mizoram
        ("Aizawl", "Mizoram"),
        # Nagaland
        ("Kohima", "Nagaland"), ("Dimapur", "Nagaland"),
        # Odisha
        ("Bhubaneswar", "Odisha"), ("Cuttack", "Odisha"), ("Rourkela", "Odisha"),
        ("Brahmapur", "Odisha"), ("Sambalpur", "Odisha"), ("Puri", "Odisha"),
        ("Balasore", "Odisha"), ("Bhadrak", "Odisha"), ("Baripada", "Odisha"),
        ("Jharsuguda", "Odisha"), ("Bargarh", "Odisha"),
        # Punjab
        ("Ludhiana", "Punjab"), ("Amritsar", "Punjab"), ("Jalandhar", "Punjab"),
        ("Patiala", "Punjab"), ("Bathinda", "Punjab"), ("Pathankot", "Punjab"),
        ("Hoshiarpur", "Punjab"), ("Batala", "Punjab"), ("Moga", "Punjab"),
        ("Mohali", "Punjab"), ("Abohar", "Punjab"), ("Phagwara", "Punjab"),
        # Rajasthan
        ("Jaipur", "Rajasthan"), ("Jodhpur", "Rajasthan"), ("Kota", "Rajasthan"),
        ("Bikaner", "Rajasthan"), ("Ajmer", "Rajasthan"), ("Udaipur", "Rajasthan"),
        ("Bhilwara", "Rajasthan"), ("Alwar", "Rajasthan"), ("Bharatpur", "Rajasthan"),
        ("Sikar", "Rajasthan"), ("Sri Ganganagar", "Rajasthan"), ("Pali", "Rajasthan"),
        ("Beawar", "Rajasthan"), ("Hanumangarh", "Rajasthan"), ("Gangapur City", "Rajasthan"),
        ("Churu", "Rajasthan"), ("Jhunjhunu", "Rajasthan"), ("Sawai Madhopur", "Rajasthan"),
        ("Tonk", "Rajasthan"), ("Barmer", "Rajasthan"), ("Jaisalmer", "Rajasthan"),
        # Sikkim
        ("Gangtok", "Sikkim"),
        # Tamil Nadu
        ("Chennai", "Tamil Nadu"), ("Coimbatore", "Tamil Nadu"), ("Madurai", "Tamil Nadu"),
        ("Tiruchirappalli", "Tamil Nadu"), ("Salem", "Tamil Nadu"), ("Tirunelveli", "Tamil Nadu"),
        ("Tiruppur", "Tamil Nadu"), ("Vellore", "Tamil Nadu"), ("Erode", "Tamil Nadu"),
        ("Thoothukudi", "Tamil Nadu"), ("Dindigul", "Tamil Nadu"), ("Thanjavur", "Tamil Nadu"),
        ("Ranipet", "Tamil Nadu"), ("Sivakasi", "Tamil Nadu"), ("Karur", "Tamil Nadu"),
        ("Udhagamandalam", "Tamil Nadu"), ("Hosur", "Tamil Nadu"), ("Nagercoil", "Tamil Nadu"),
        ("Kancheepuram", "Tamil Nadu"), ("Kumarapalayam", "Tamil Nadu"),
        # Telangana
        ("Hyderabad", "Telangana"), ("Warangal", "Telangana"), ("Nizamabad", "Telangana"),
        ("Karimnagar", "Telangana"), ("Khammam", "Telangana"), ("Ramagundam", "Telangana"),
        ("Secunderabad", "Telangana"), ("Mahbubnagar", "Telangana"), ("Nalgonda", "Telangana"),
        ("Adilabad", "Telangana"), ("Suryapet", "Telangana"), ("Mancherial", "Telangana"),
        # Tripura
        ("Agartala", "Tripura"),
        # Uttar Pradesh
        ("Lucknow", "Uttar Pradesh"), ("Kanpur", "Uttar Pradesh"), ("Ghaziabad", "Uttar Pradesh"),
        ("Agra", "Uttar Pradesh"), ("Varanasi", "Uttar Pradesh"), ("Meerut", "Uttar Pradesh"),
        ("Prayagraj", "Uttar Pradesh"), ("Noida", "Uttar Pradesh"), ("Bareilly", "Uttar Pradesh"),
        ("Aligarh", "Uttar Pradesh"), ("Moradabad", "Uttar Pradesh"), ("Saharanpur", "Uttar Pradesh"),
        ("Gorakhpur", "Uttar Pradesh"), ("Firozabad", "Uttar Pradesh"), ("Jhansi", "Uttar Pradesh"),
        ("Muzaffarnagar", "Uttar Pradesh"), ("Mathura", "Uttar Pradesh"), ("Rampur", "Uttar Pradesh"),
        ("Shahjahanpur", "Uttar Pradesh"), ("Farrukhabad", "Uttar Pradesh"), ("Hapur", "Uttar Pradesh"),
        ("Etawah", "Uttar Pradesh"), ("Mirzapur", "Uttar Pradesh"), ("Bulandshahr", "Uttar Pradesh"),
        ("Sambhal", "Uttar Pradesh"), ("Amroha", "Uttar Pradesh"), ("Hardoi", "Uttar Pradesh"),
        ("Fatehpur", "Uttar Pradesh"), ("Raebareli", "Uttar Pradesh"), ("Orai", "Uttar Pradesh"),
        ("Sitapur", "Uttar Pradesh"), ("Bahraich", "Uttar Pradesh"), ("Modinagar", "Uttar Pradesh"),
        ("Unnao", "Uttar Pradesh"), ("Jaunpur", "Uttar Pradesh"), ("Lakhimpur", "Uttar Pradesh"),
        ("Hathras", "Uttar Pradesh"), ("Banda", "Uttar Pradesh"), ("Pilibhit", "Uttar Pradesh"),
        ("Barabanki", "Uttar Pradesh"), ("Khurja", "Uttar Pradesh"), ("Gonda", "Uttar Pradesh"),
        ("Greater Noida", "Uttar Pradesh"), ("Ayodhya", "Uttar Pradesh"), ("Vrindavan", "Uttar Pradesh"),
        # Uttarakhand
        ("Dehradun", "Uttarakhand"), ("Haridwar", "Uttarakhand"), ("Roorkee", "Uttarakhand"),
        ("Haldwani", "Uttarakhand"), ("Rudrapur", "Uttarakhand"), ("Kashipur", "Uttarakhand"),
        ("Rishikesh", "Uttarakhand"), ("Kotdwar", "Uttarakhand"),
        # West Bengal
        ("Kolkata", "West Bengal"), ("Asansol", "West Bengal"), ("Siliguri", "West Bengal"),
        ("Durgapur", "West Bengal"), ("Bardhaman", "West Bengal"), ("Malda", "West Bengal"),
        ("Baharampur", "West Bengal"), ("Habra", "West Bengal"), ("Kharagpur", "West Bengal"),
        ("Shantipur", "West Bengal"), ("Raiganj", "West Bengal"), ("Darjeeling", "West Bengal"),
        ("Jalpaiguri", "West Bengal"), ("Bankura", "West Bengal"),
        # Union Territories
        ("New Delhi", "Delhi"), ("Delhi", "Delhi"), ("Dwarka", "Delhi"), ("Rohini", "Delhi"),
        ("Chandigarh", "Chandigarh"), ("Panchkula", "Chandigarh"),
        ("Puducherry", "Puducherry"),
        ("Srinagar", "Jammu & Kashmir"), ("Jammu", "Jammu & Kashmir"), ("Leh", "Ladakh"),
        ("Port Blair", "Andaman & Nicobar Islands"),
        ("Silvassa", "Dadra & Nagar Haveli"), ("Daman", "Daman & Diu"),
        ("Kavaratti", "Lakshadweep"),
    ]

    # Get existing city names (case-insensitive)
    existing = await db.cities.find({}, {"_id": 0, "name": 1}).to_list(5000)
    existing_names = {c["name"].lower() for c in existing}

    # Also update existing cities with missing states
    existing_full = await db.cities.find({}, {"_id": 0}).to_list(5000)
    city_state_map = {name.lower(): state for name, state in INDIA_CITIES}
    for city in existing_full:
        if not city.get("state") and city.get("name", "").lower() in city_state_map:
            await db.cities.update_one(
                {"id": city["id"]},
                {"$set": {"state": city_state_map[city["name"].lower()]}}
            )

    # Insert new cities
    inserted = 0
    order_start = await db.cities.count_documents({})
    for i, (name, state) in enumerate(INDIA_CITIES):
        if name.lower() not in existing_names:
            city_data = {
                "id": str(uuid.uuid4()),
                "name": name,
                "state": state,
                "is_active": True,
                "has_center": False,
                "order": order_start + i + 1,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.cities.insert_one(city_data)
            existing_names.add(name.lower())
            inserted += 1

    total = await db.cities.count_documents({})
    return {"message": f"Seeded {inserted} new cities. Total: {total} cities in DB."}


@api_router.post("/cities", response_model=City)
async def create_city(city: CityCreate):
    city_data = City(**city.model_dump())
    await db.cities.insert_one(city_data.model_dump())
    return city_data

@api_router.patch("/cities/{city_id}", response_model=City)
async def update_city(city_id: str, city_update: CityUpdate):
    update_data = {k: v for k, v in city_update.model_dump().items() if v is not None}
    if update_data:
        await db.cities.update_one({"id": city_id}, {"$set": update_data})
    city = await db.cities.find_one({"id": city_id}, {"_id": 0})
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    return city

@api_router.delete("/cities/{city_id}")
async def delete_city(city_id: str):
    result = await db.cities.delete_one({"id": city_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="City not found")
    return {"message": "City deleted"}

@api_router.post("/cities/reorder")
async def reorder_cities(city_orders: List[dict]):
    for item in city_orders:
        await db.cities.update_one({"id": item["id"]}, {"$set": {"order": item["order"]}})
    return {"message": "Cities reordered"}

# ========================
# CENTER ENDPOINTS
# ========================

@api_router.get("/centers", response_model=List[Center])
async def get_centers():
    centers = await db.centers.find({}, {"_id": 0}).to_list(100)
    return centers

@api_router.get("/centers/by-city/{city}")
async def get_centers_by_city(city: str):
    centers = await db.centers.find({"city": city, "is_active": True}, {"_id": 0}).to_list(100)
    return centers

@api_router.post("/centers", response_model=Center)
async def create_center(center: CenterCreate):
    center_data = Center(**center.model_dump())
    await db.centers.insert_one(center_data.model_dump())
    # Update city to mark it has a center
    await db.cities.update_one({"name": center.city}, {"$set": {"has_center": True}})
    return center_data

@api_router.patch("/centers/{center_id}", response_model=Center)
async def update_center(center_id: str, center_update: CenterUpdate):
    update_data = {k: v for k, v in center_update.model_dump().items() if v is not None}
    if update_data:
        await db.centers.update_one({"id": center_id}, {"$set": update_data})
    center = await db.centers.find_one({"id": center_id}, {"_id": 0})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
    return center

@api_router.delete("/centers/{center_id}")
async def delete_center(center_id: str):
    center = await db.centers.find_one({"id": center_id}, {"_id": 0})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
    await db.centers.delete_one({"id": center_id})
    # Check if city still has centers
    remaining = await db.centers.count_documents({"city": center["city"]})
    if remaining == 0:
        await db.cities.update_one({"name": center["city"]}, {"$set": {"has_center": False}})
    return {"message": "Center deleted"}

# ========================
# INQUIRY SYSTEM ENDPOINTS (Team Lead/Query Management)
# ========================

class InquiryLead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    inquiry_type: str  # student, school, growth_partner, teacher, team
    action_type: str = "lead"
    name: str
    phone: str
    email: str
    offering: str
    city: str = ""
    details: str = ""
    source: str = "team_inquiry_form"
    status: str = "new"  # new, contacted, converted, archived
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InquiryQuery(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    inquiry_type: str  # student, school, growth_partner, teacher, team
    action_type: str = "query"
    name: str = ""
    phone: str = ""
    email: str = ""
    query_type: str  # demo_related, payment, course_info, technical, partnership, feedback, other
    related_to: str = ""  # sub-category within query_type
    query_details: str = ""
    priority: str = "normal"  # low, normal, high, urgent
    source: str = "team_inquiry_form"
    page_context: str = ""  # which page the query was submitted from
    status: str = "open"  # open, in_progress, resolved, closed
    attachments: List[dict] = []  # [{name, url, type, is_voice_note}]
    added_by: str = ""
    added_by_name: str = ""
    viewers: List[str] = []  # Array of user IDs who can view this query
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.post("/inquiry/lead")
async def create_inquiry_lead(data: dict):
    lead = InquiryLead(**data)
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    # Get source from data or default to team_inquiry_form
    source = data.get('source', 'team_inquiry_form')
    added_by = data.get('added_by', '')  # user_id of who added this
    
    # Also add to appropriate CRM based on inquiry type
    inquiry_type = data.get('inquiry_type', 'student')
    
    if inquiry_type == 'student':
        # Add to student inquiries
        student_doc = {
            "id": doc['id'],
            "learner_type": "self",
            "age_group": "",
            "skill": doc.get('offering', ''),
            "learning_mode": "online",
            "city": doc.get('city', ''),
            "learning_goal": "",
            "name": doc['name'],
            "email": doc['email'],
            "phone": doc['phone'],
            "status": "new",
            "notes": f"Details: {doc.get('details', '')}",
            "comments": [],
            "source": source,
            "added_by": added_by,
            "assigned_to": "",
            "created_at": doc['created_at'],
            "updated_at": doc['created_at']
        }
        await db.student_inquiries.insert_one(student_doc)
    elif inquiry_type == 'school':
        # Add to school inquiries
        school_doc = {
            "id": doc['id'],
            "school_name": doc['name'],
            "contact_name": doc['name'],
            "email": doc['email'],
            "phone": doc['phone'],
            "location": doc.get('city', ''),
            "school_size": "",
            "fee_range": "",
            "board": "",
            "programs_interested": [doc.get('offering', '')] if doc.get('offering') else [],
            "support_needed": [],
            "status": "new",
            "notes": f"Details: {doc.get('details', '')}",
            "comments": [],
            "source": source,
            "added_by": added_by,
            "assigned_to": "",
            "created_at": doc['created_at'],
            "updated_at": doc['created_at']
        }
        await db.school_inquiries.insert_one(school_doc)
    elif inquiry_type == 'teacher':
        # Add to educator applications
        educator_doc = {
            "id": doc['id'],
            "name": doc['name'],
            "email": doc['email'],
            "phone": doc['phone'],
            "skills": [doc.get('offering', '')] if doc.get('offering') else [],
            "experience": "",
            "grades_comfortable": [],
            "city": doc.get('city', ''),
            "availability": "",
            "demo_ready": False,
            "status": "new",
            "notes": f"Details: {doc.get('details', '')}",
            "comments": [],
            "source": source,
            "added_by": added_by,
            "assigned_to": "",
            "created_at": doc['created_at'],
            "updated_at": doc['created_at']
        }
        await db.educator_applications.insert_one(educator_doc)
    elif inquiry_type in ['growth_partner', 'team']:
        # Add to growth partners collection
        partner_doc = {
            "id": doc['id'],
            "name": doc['name'],
            "email": doc['email'],
            "phone": doc['phone'],
            "city": doc.get('city', ''),
            "interest_type": doc.get('offering', ''),
            "details": doc.get('details', ''),
            "status": "new",
            "notes": "",
            "comments": [],
            "source": source,
            "added_by": added_by,
            "assigned_to": "",
            "created_at": doc['created_at'],
            "updated_at": doc['created_at']
        }
        await db.growth_partners.insert_one(partner_doc)
    
    return {"message": "Lead added successfully", "id": doc['id']}

@api_router.post("/inquiry/query")
async def create_inquiry_query(data: dict):
    query = InquiryQuery(**data)
    doc = query.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    # Get added_by user info and add as viewer
    added_by = data.get('added_by', '')
    if added_by:
        # Initialize viewers with the creator
        doc['viewers'] = [added_by]
        # Fetch user name for display
        user = await db.team_users.find_one({"id": added_by}, {"_id": 0})
        if not user:
            user = await db.admins.find_one({"id": added_by}, {"_id": 0})
        if user:
            doc['added_by_name'] = user.get('name', '')
    else:
        doc['viewers'] = []
    
    # Store in inquiry_queries collection (ticketing system)
    await db.inquiry_queries.insert_one(doc)
    
    return {"message": "Query submitted successfully", "id": doc['id']}

@api_router.get("/inquiry/leads")
async def get_inquiry_leads(
    inquiry_type: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if inquiry_type:
        query["inquiry_type"] = inquiry_type
    if status:
        query["status"] = status
    leads = await db.inquiry_leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return leads

@api_router.get("/inquiry/queries")
async def get_inquiry_queries(
    inquiry_type: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if inquiry_type:
        query["inquiry_type"] = inquiry_type
    if status:
        query["status"] = status
    
    # Non-admin users can only see queries assigned to them, where they are viewers, or created by them
    user_role = user.get("role", "")
    user_id = user.get("id") or user.get("email")
    
    if user_role not in ["admin", "super_admin"]:
        user_filter = {
            "$or": [
                {"assigned_to": user_id},
                {"viewers": user_id},
                {"added_by": user_id},
                {"added_by": user.get("email")}
            ]
        }
        if query:
            query = {"$and": [query, user_filter]}
        else:
            query = user_filter
    
    queries = await db.inquiry_queries.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return queries

@api_router.patch("/inquiry/leads/{lead_id}")
async def update_inquiry_lead(lead_id: str, data: dict, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.items() if v is not None}
    await db.inquiry_leads.update_one({"id": lead_id}, {"$set": update_data})
    return {"message": "Lead updated successfully"}

@api_router.patch("/inquiry/queries/{query_id}")
async def update_inquiry_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.items() if v is not None}
    await db.inquiry_queries.update_one({"id": query_id}, {"$set": update_data})
    return {"message": "Query updated successfully"}

@api_router.post("/inquiry/queries/{query_id}/assign")
async def assign_inquiry_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Assign an inquiry query to a user with optional deadline"""
    assigned_to = data.get("assigned_to")
    deadline = data.get("deadline")
    
    # Get the query
    query = await db.inquiry_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Handle unassign case
    if not assigned_to or assigned_to == "":
        await db.inquiry_queries.update_one(
            {"id": query_id}, 
            {"$set": {"assigned_to": None, "deadline": None}}
        )
        return {"message": "Query unassigned"}
    
    # Get the user being assigned
    assignee = await db.team_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.center_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.admins.find_one({"id": assigned_to}, {"_id": 0})
    
    assignee_name = assignee.get("name", "Team Member") if assignee else "Unknown"
    
    # Update the query with assignment
    update_data = {
        "assigned_to": assigned_to,
        "assigned_to_name": assignee_name,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "assigned_by": user.get("email", "admin"),
        "deadline": deadline,
        "status": "in_progress" if query.get("status") == "open" else query.get("status")
    }
    
    activity = {
        "type": "assigned",
        "assigned_to": assigned_to,
        "assigned_to_name": assignee_name,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inquiry_queries.update_one(
        {"id": query_id}, 
        {"$set": update_data, "$push": {"activity_history": activity}}
    )
    
    return {"message": "Query assigned successfully", "assigned_to": assignee_name}

@api_router.delete("/inquiry/queries/{query_id}")
async def delete_inquiry_query(query_id: str, user: dict = Depends(get_current_user)):
    """Delete an inquiry query"""
    # Only admin can delete
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete queries")
    
    result = await db.inquiry_queries.delete_one({"id": query_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return {"message": "Query deleted successfully"}

@api_router.post("/inquiry/queries/{query_id}/viewers")
async def manage_inquiry_query_viewers(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add or remove viewers from an inquiry query"""
    action = data.get("action", "add")
    viewer_id = data.get("viewer_id")
    
    if not viewer_id:
        raise HTTPException(status_code=400, detail="viewer_id is required")
    
    query = await db.inquiry_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    viewer = await db.team_users.find_one({"id": viewer_id}, {"_id": 0})
    if not viewer:
        viewer = await db.admins.find_one({"id": viewer_id}, {"_id": 0})
    viewer_name = viewer.get("name", "Unknown") if viewer else "Unknown"
    
    activity = {
        "type": "viewer_added" if action == "add" else "viewer_removed",
        "viewer_id": viewer_id,
        "viewer_name": viewer_name,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    if action == "add":
        await db.inquiry_queries.update_one(
            {"id": query_id},
            {"$addToSet": {"viewers": viewer_id}, "$push": {"activity_history": activity}}
        )
        return {"message": f"Viewer {viewer_name} added successfully"}
    else:
        await db.inquiry_queries.update_one(
            {"id": query_id},
            {"$pull": {"viewers": viewer_id}, "$push": {"activity_history": activity}}
        )
        return {"message": f"Viewer {viewer_name} removed successfully"}

# ========================
# HEALTH CHECK
# ========================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/admin/optimize-db")
async def optimize_database(user: dict = Depends(get_current_user)):
    """Manually trigger database index creation for better performance"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can optimize database")
    
    indexes_created = []
    try:
        # School Inquiries indexes
        await db.school_inquiries.create_index("id", unique=True)
        await db.school_inquiries.create_index("status")
        await db.school_inquiries.create_index("assigned_to")
        await db.school_inquiries.create_index("created_at")
        await db.school_inquiries.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("school_inquiries")
        
        # Student Inquiries indexes
        await db.student_inquiries.create_index("id", unique=True)
        await db.student_inquiries.create_index("status")
        await db.student_inquiries.create_index("assigned_to")
        await db.student_inquiries.create_index("demo_date")
        await db.student_inquiries.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("student_inquiries")
        
        # Educator Applications indexes
        await db.educator_applications.create_index("id", unique=True)
        await db.educator_applications.create_index("status")
        await db.educator_applications.create_index("assigned_to")
        await db.educator_applications.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("educator_applications")
        
        # Support Queries indexes
        await db.support_queries.create_index("id", unique=True)
        await db.support_queries.create_index("status")
        await db.support_queries.create_index("assigned_to")
        await db.support_queries.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("support_queries")
        
        # Inquiry Queries indexes
        await db.inquiry_queries.create_index("id", unique=True)
        await db.inquiry_queries.create_index("status")
        await db.inquiry_queries.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("inquiry_queries")
        
        # Support Tickets indexes
        await db.support_tickets.create_index("id", unique=True)
        await db.support_tickets.create_index("status")
        await db.support_tickets.create_index("source")
        await db.support_tickets.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("support_tickets")
        
        # Team Users indexes
        await db.team_users.create_index("id", unique=True)
        await db.team_users.create_index("email")
        indexes_created.append("team_users")
        
        # School Expenses indexes
        await db.school_expenses.create_index("id", unique=True)
        await db.school_expenses.create_index("school_id")
        await db.school_expenses.create_index([("school_id", 1), ("created_at", -1)])
        indexes_created.append("school_expenses")
        
        # External API Keys indexes
        await db.external_api_keys.create_index("id", unique=True)
        await db.external_api_keys.create_index("key", unique=True)
        indexes_created.append("external_api_keys")
        
        # GP Applications indexes
        await db.gp_applications.create_index("id", unique=True)
        await db.gp_applications.create_index("status")
        indexes_created.append("gp_applications")
        
        # Growth Partners indexes
        await db.growth_partners.create_index("id", unique=True)
        await db.growth_partners.create_index("status")
        indexes_created.append("growth_partners")
        
        # ═══ PAYMENT & HIGH-TRAFFIC INDEXES ═══════════════════════════════
        # Student Payments - Critical for payment lookups
        await db.student_payments.create_index("id", unique=True)
        await db.student_payments.create_index("school_id")
        await db.student_payments.create_index("student_id")
        await db.student_payments.create_index("order_id")
        await db.student_payments.create_index("payment_status")
        await db.student_payments.create_index([("school_id", 1), ("payment_status", 1)])
        await db.student_payments.create_index([("school_id", 1), ("created_at", -1)])
        indexes_created.append("student_payments")
        
        # School Payments - For school-level payment tracking
        await db.school_payments.create_index("id", unique=True)
        await db.school_payments.create_index("school_id")
        await db.school_payments.create_index("order_id")
        await db.school_payments.create_index([("school_id", 1), ("created_at", -1)])
        indexes_created.append("school_payments")
        
        # Students - For student lookups during payments
        await db.students.create_index("id", unique=True)
        await db.students.create_index("school_id")
        await db.students.create_index("phone")
        await db.students.create_index("email")
        await db.students.create_index([("school_id", 1), ("status", 1)])
        indexes_created.append("students")
        
        # Blogs - For public-facing blog queries
        await db.blogs.create_index("id", unique=True)
        await db.blogs.create_index("slug", unique=True)
        await db.blogs.create_index("status")
        await db.blogs.create_index([("status", 1), ("published_at", -1)])
        indexes_created.append("blogs")
        
        # Sessions - For auth lookups
        await db.sessions.create_index("token", unique=True)
        await db.sessions.create_index("user_id")
        await db.sessions.create_index("expires_at")
        indexes_created.append("sessions")
        
        return {
            "message": "Database optimization complete",
            "indexes_created": indexes_created,
            "collections_optimized": len(indexes_created)
        }
    except Exception as e:
        return {
            "message": f"Partial optimization - some indexes may already exist: {str(e)}",
            "indexes_created": indexes_created
        }

@api_router.get("/admin/mongodb-info")
async def get_mongodb_info(request: Request, user: dict = Depends(get_current_user)):
    """Get MongoDB connection info for data export/migration"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can access MongoDB info")
    
    try:
        # Get database stats
        db_name = os.environ.get("DB_NAME", "test_database")
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        
        # Get user's IP address
        client_ip = request.client.host if request.client else None
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Build a sanitized connection string (mask password if present)
        connection_display = mongo_url
        if "@" in mongo_url:
            # Has credentials - mask the password
            parts = mongo_url.split("@")
            prefix = parts[0]
            suffix = parts[1]
            if ":" in prefix:
                user_pass = prefix.split("//")[1] if "//" in prefix else prefix
                if ":" in user_pass:
                    username = user_pass.split(":")[0]
                    connection_display = f"mongodb+srv://{username}:****@{suffix}"
        
        # Get collection stats
        collections_info = []
        collection_names = await db.list_collection_names()
        for col_name in sorted(collection_names):
            try:
                count = await db[col_name].count_documents({})
                collections_info.append({"name": col_name, "count": count})
            except:
                collections_info.append({"name": col_name, "count": "N/A"})
        
        # For export, provide the actual connection string (admin only)
        export_connection = f"{mongo_url}/{db_name}"
        if not mongo_url.endswith("/"):
            export_connection = f"{mongo_url}/{db_name}"
        
        # Get whitelisted IPs from database
        whitelisted_ips = []
        try:
            whitelist_docs = await db.mongodb_whitelist.find({}, {"_id": 0}).to_list(100)
            whitelisted_ips = whitelist_docs
        except:
            pass
        
        return {
            "db_name": db_name,
            "connection_string": export_connection,
            "collections": collections_info,
            "total_collections": len(collection_names),
            "export_command": f'mongodump --uri="{export_connection}" --archive=backup.gz --gzip',
            "your_ip": client_ip,
            "whitelisted_ips": whitelisted_ips
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get MongoDB info: {str(e)}")

@api_router.post("/admin/mongodb-whitelist-ip")
async def whitelist_ip(data: dict, user: dict = Depends(get_current_user)):
    """Add an IP address to the whitelist"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can manage IP whitelist")
    
    ip_address = data.get("ip_address", "").strip()
    description = data.get("description", "")
    
    if not ip_address:
        raise HTTPException(status_code=400, detail="IP address is required")
    
    # Basic IP validation
    import re
    ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^0\.0\.0\.0\/0$'
    if not re.match(ip_pattern, ip_address):
        raise HTTPException(status_code=400, detail="Invalid IP address format")
    
    # Check if already exists
    existing = await db.mongodb_whitelist.find_one({"ip": ip_address})
    if existing:
        raise HTTPException(status_code=400, detail="IP already whitelisted")
    
    # Add to whitelist
    await db.mongodb_whitelist.insert_one({
        "ip": ip_address,
        "description": description,
        "added_by": user.get("email"),
        "added_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"IP {ip_address} added to whitelist", "success": True}

@api_router.delete("/admin/mongodb-whitelist-ip/{ip_address}")
async def remove_whitelisted_ip(ip_address: str, user: dict = Depends(get_current_user)):
    """Remove an IP address from the whitelist"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can manage IP whitelist")
    
    from urllib.parse import unquote
    ip_address = unquote(ip_address)
    
    result = await db.mongodb_whitelist.delete_one({"ip": ip_address})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="IP not found in whitelist")
    
    return {"message": f"IP {ip_address} removed from whitelist", "success": True}

# Cloudinary signature endpoint for frontend uploads
@api_router.get("/cloudinary/signature")
async def get_cloudinary_signature(
    resource_type: str = Query("raw", enum=["image", "video", "raw"]),
    folder: str = Query("oll_uploads")
):
    """Generate signed upload parameters for Cloudinary"""
    ALLOWED_FOLDERS = ("oll_uploads", "oll_documents", "oll_images", "oll_mou", "oll_invoices")
    if not any(folder.startswith(f) for f in ALLOWED_FOLDERS):
        folder = "oll_uploads"
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        os.getenv("CLOUDINARY_API_SECRET")
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }

# File Upload Endpoint - Uses Cloudinary for cloud storage
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), type: str = "general"):
    """Upload a file to Cloudinary cloud storage"""
    
    allowed_extensions = {'.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.csv'}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Check file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Generate unique public_id
    unique_id = f"{type}_{uuid.uuid4().hex}"
    folder = f"oll_{type}"
    
    # Determine resource type for Cloudinary
    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
    resource_type = "image" if file_ext in image_extensions else "raw"
    
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            BytesIO(content),
            public_id=unique_id,
            folder=folder,
            resource_type=resource_type,
            overwrite=True
        )
        
        # Get the secure URL
        file_url = result.get("secure_url")
        
        # Store reference in MongoDB for tracking
        file_doc = {
            "filename": f"{unique_id}{file_ext}",
            "original_name": file.filename,
            "cloudinary_public_id": result.get("public_id"),
            "cloudinary_url": file_url,
            "resource_type": resource_type,
            "size": len(content),
            "type": type,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        await db.uploaded_files.insert_one(file_doc)
        
        return {"url": file_url, "filename": f"{unique_id}{file_ext}", "public_id": result.get("public_id")}
        
    except Exception as e:
        # Fallback to MongoDB storage if Cloudinary fails
        import base64
        unique_filename = f"{unique_id}{file_ext}"
        
        content_types = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.csv': 'text/csv'
        }
        content_type = content_types.get(file_ext, 'application/octet-stream')
        
        file_doc = {
            "filename": unique_filename,
            "original_name": file.filename,
            "content_type": content_type,
            "data": base64.b64encode(content).decode('utf-8'),
            "size": len(content),
            "type": type,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "storage": "mongodb_fallback"
        }
        await db.uploaded_files.insert_one(file_doc)
        
        file_url = f"/api/files/{unique_filename}"
        return {"url": file_url, "filename": unique_filename, "fallback": True}

# Serve uploaded files - checks Cloudinary first, then MongoDB, then local
@api_router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve uploaded files - redirects to Cloudinary URL if available"""
    import base64
    from fastapi.responses import Response, RedirectResponse
    
    # Try to find file in MongoDB
    file_doc = await db.uploaded_files.find_one({"filename": filename})
    
    if file_doc:
        # If file is on Cloudinary, redirect to Cloudinary URL
        if file_doc.get("cloudinary_url"):
            return RedirectResponse(url=file_doc["cloudinary_url"], status_code=302)
        
        # Otherwise serve from MongoDB base64 data
        if file_doc.get("data"):
            content = base64.b64decode(file_doc["data"])
            return Response(
                content=content,
                media_type=file_doc.get("content_type", "application/octet-stream"),
                headers={
                    "Content-Disposition": f'inline; filename="{file_doc.get("original_name", filename)}"'
                }
            )
    
    # Fallback to local file (for backward compatibility)
    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        content_types = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg'
        }
        ext = Path(filename).suffix.lower()
        content_type = content_types.get(ext, 'application/octet-stream')
        
        with open(file_path, "rb") as f:
            content = f.read()
        
        return Response(
            content=content,
            media_type=content_type,
            headers={"Content-Disposition": f'inline; filename="{filename}"'}
        )
    
    raise HTTPException(status_code=404, detail="File not found")

# Backward compatibility: redirect old /api/uploads/ URLs to new /api/files/ endpoint
@api_router.get("/uploads/{filename}")
async def serve_uploaded_file_legacy(filename: str):
    """Backward compatibility endpoint - redirects to new /api/files/ endpoint"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/api/files/{filename}", status_code=307)

# Admin endpoint to migrate files to Cloudinary
@api_router.post("/admin/migrate-files-to-cloudinary")
async def migrate_files_to_cloudinary(user: dict = Depends(get_current_user)):
    """Migrate all MongoDB-stored files to Cloudinary for better performance"""
    import base64
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    migrated = 0
    skipped = 0
    errors = []
    
    # Find all files stored in MongoDB (with base64 data)
    cursor = db.uploaded_files.find({"data": {"$exists": True}, "cloudinary_url": {"$exists": False}})
    
    async for file_doc in cursor:
        try:
            filename = file_doc.get("filename", "")
            content = base64.b64decode(file_doc["data"])
            
            # Determine resource type
            ext = Path(filename).suffix.lower()
            image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
            resource_type = "image" if ext in image_extensions else "raw"
            
            # Determine folder from type
            file_type = file_doc.get("type", "general")
            folder = f"oll_{file_type}"
            
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                BytesIO(content),
                public_id=Path(filename).stem,
                folder=folder,
                resource_type=resource_type,
                overwrite=True
            )
            
            # Update MongoDB document with Cloudinary URL
            await db.uploaded_files.update_one(
                {"_id": file_doc["_id"]},
                {
                    "$set": {
                        "cloudinary_url": result.get("secure_url"),
                        "cloudinary_public_id": result.get("public_id"),
                        "migrated_to_cloudinary": True,
                        "migrated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$unset": {"data": ""}  # Remove base64 data to save space
                }
            )
            
            migrated += 1
        except Exception as e:
            errors.append({"filename": file_doc.get("filename", "unknown"), "error": str(e)})
    
    return {
        "success": True,
        "migrated": migrated,
        "skipped": skipped,
        "errors": errors,
        "message": f"Migrated {migrated} files to Cloudinary"
    }

# Legacy migration endpoint (kept for backward compatibility)
@api_router.post("/admin/migrate-files")
async def migrate_local_files_to_mongodb(user: dict = Depends(get_current_user)):
    """Migrate all local uploaded files to Cloudinary (updated to use Cloudinary)"""
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    migrated = 0
    skipped = 0
    errors = []
    
    if UPLOAD_DIR.exists():
        for file_path in UPLOAD_DIR.iterdir():
            if file_path.is_file():
                filename = file_path.name
                
                # Check if already migrated
                existing = await db.uploaded_files.find_one({
                    "filename": filename,
                    "cloudinary_url": {"$exists": True}
                })
                if existing:
                    skipped += 1
                    continue
                
                try:
                    with open(file_path, "rb") as f:
                        content = f.read()
                    
                    ext = Path(filename).suffix.lower()
                    
                    # Determine type from filename prefix
                    file_type = "general"
                    for prefix in ["mou_", "invoice_", "receipt_", "resume_", "document_"]:
                        if filename.startswith(prefix):
                            file_type = prefix.rstrip("_")
                            break
                    
                    # Determine resource type
                    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
                    resource_type = "image" if ext in image_extensions else "raw"
                    folder = f"oll_{file_type}"
                    
                    # Upload to Cloudinary
                    result = cloudinary.uploader.upload(
                        BytesIO(content),
                        public_id=Path(filename).stem,
                        folder=folder,
                        resource_type=resource_type,
                        overwrite=True
                    )
                    
                    # Store reference in MongoDB
                    file_doc = {
                        "filename": filename,
                        "original_name": filename,
                        "cloudinary_public_id": result.get("public_id"),
                        "cloudinary_url": result.get("secure_url"),
                        "resource_type": resource_type,
                        "size": len(content),
                        "type": file_type,
                        "uploaded_at": datetime.now(timezone.utc).isoformat(),
                        "migrated": True
                    }
                    
                    # Upsert to avoid duplicates
                    await db.uploaded_files.update_one(
                        {"filename": filename},
                        {"$set": file_doc},
                        upsert=True
                    )
                    
                    migrated += 1
                except Exception as e:
                    errors.append({"filename": filename, "error": str(e)})
    
    return {
        "success": True,
        "migrated": migrated,
        "skipped": skipped,
        "errors": errors,
        "message": f"Migrated {migrated} files to Cloudinary"
    }

# ========================
# BACKGROUND JOB ENDPOINTS - For Cron/Scheduler
# ========================

@api_router.post("/jobs/check-overdue-tickets")
async def check_overdue_tickets_job(secret: str = None):
    """
    Background job to check for tickets overdue by 48 hours and send notifications.
    Should be called by a cron job every hour.
    """
    # Simple security - use a secret key for cron jobs
    JOB_SECRET = os.environ.get("JOB_SECRET", "oll_cron_secret_2024")
    if secret != JOB_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    # Find tickets that are open/in_progress and created more than 48 hours ago
    threshold = datetime.now(timezone.utc) - timedelta(hours=48)
    
    # Find tickets that need 48h warning and haven't been notified yet
    tickets = await db.support_tickets.find({
        "status": {"$in": ["open", "in_progress"]},
        "created_at": {"$lte": threshold.isoformat()},
        "overdue_notified_at": {"$exists": False}
    }, {"_id": 0}).to_list(100)
    
    notified_count = 0
    
    # Get admin team phones for admin notification
    admin_users = await db.users.find(
        {"role": "admin"},
        {"_id": 0, "phone": 1}
    ).to_list(10)
    admin_phones = [u.get("phone") for u in admin_users if u.get("phone")]
    
    # Also get phones from team_users with admin role
    team_admins = await db.team_users.find(
        {"role": {"$in": ["admin", "super_admin"]}},
        {"_id": 0, "phone": 1}
    ).to_list(10)
    admin_phones.extend([u.get("phone") for u in team_admins if u.get("phone")])
    admin_phones = list(set(admin_phones))  # Remove duplicates
    
    for ticket in tickets:
        try:
            # Get assigned team member - check both collections
            assignee = None
            if ticket.get("assigned_to"):
                assignee = await db.team_users.find_one({"id": ticket["assigned_to"]}, {"_id": 0})
                if not assignee:
                    assignee = await db.users.find_one({"id": ticket["assigned_to"]}, {"_id": 0})
            
            # Send notification to assignee
            if assignee and assignee.get('phone'):
                await send_ticket_overdue_notification(ticket, assignee)
                print(f"Overdue notification sent to {assignee.get('name')}")
            
            # Send notification to admin team
            if admin_phones:
                await send_ticket_overdue_admin_notification(ticket, admin_phones)
            
            # Mark as notified
            await db.support_tickets.update_one(
                {"id": ticket["id"]},
                {"$set": {"overdue_notified_at": datetime.now(timezone.utc).isoformat()}}
            )
            notified_count += 1
            
        except Exception as e:
            print(f"Failed to send overdue notification for ticket {ticket.get('id')}: {e}")
    
    return {
        "success": True,
        "checked": len(tickets),
        "notified": notified_count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.post("/jobs/send-meeting-reminders")
async def send_meeting_reminders_job(secret: str = None):
    """
    Background job to send school meeting reminders.
    Should be called by a cron job every hour.
    Sends 24h reminder and 2h reminder based on meeting time.
    """
    JOB_SECRET = os.environ.get("JOB_SECRET", "oll_cron_secret_2024")
    if secret != JOB_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    now = datetime.now(timezone.utc)
    reminders_sent = {"24h": 0, "2h": 0}
    
    # Find schools with upcoming meetings
    schools = await db.school_inquiries.find({
        "status": {"$in": ["new", "meeting_done", "converted", "active"]},
        "meeting_date": {"$exists": True, "$ne": None, "$ne": ""}
    }, {"_id": 0}).to_list(500)
    
    for school in schools:
        try:
            meeting_date_str = school.get("meeting_date")
            meeting_time_str = school.get("meeting_time", "10:00")
            
            if not meeting_date_str:
                continue
            
            # Parse meeting datetime
            try:
                meeting_datetime = datetime.strptime(
                    f"{meeting_date_str} {meeting_time_str}",
                    "%Y-%m-%d %H:%M"
                ).replace(tzinfo=timezone.utc)
            except:
                continue
            
            # Calculate time until meeting
            time_until = meeting_datetime - now
            hours_until = time_until.total_seconds() / 3600
            
            # Get assigned sales manager - check both collections
            sales_manager = None
            if school.get("assigned_to"):
                sales_manager = await db.team_users.find_one({"id": school["assigned_to"]}, {"_id": 0})
                if not sales_manager:
                    sales_manager = await db.users.find_one({"id": school["assigned_to"]}, {"_id": 0})
            
            if not sales_manager or not sales_manager.get('phone'):
                print(f"Meeting reminder skipped for school {school.get('school_name')} - no sales manager phone")
                continue
            
            # Check if 24h reminder should be sent (between 23-25 hours before)
            if 23 <= hours_until <= 25 and not school.get("reminder_24h_sent"):
                await send_school_meeting_reminder_24h(school, sales_manager)
                await db.school_inquiries.update_one(
                    {"id": school["id"]},
                    {"$set": {"reminder_24h_sent": datetime.now(timezone.utc).isoformat()}}
                )
                reminders_sent["24h"] += 1
            
            # Check if 2h reminder should be sent (between 1.5-2.5 hours before)
            elif 1.5 <= hours_until <= 2.5 and not school.get("reminder_2h_sent"):
                await send_school_meeting_reminder_2h(school, sales_manager)
                await db.school_inquiries.update_one(
                    {"id": school["id"]},
                    {"$set": {"reminder_2h_sent": datetime.now(timezone.utc).isoformat()}}
                )
                reminders_sent["2h"] += 1
                
        except Exception as e:
            print(f"Failed to check meeting reminder for school {school.get('id')}: {e}")
    
    return {
        "success": True,
        "schools_checked": len(schools),
        "reminders_sent": reminders_sent,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.post("/jobs/test-notification")
async def test_notification_job(data: dict, user: dict = Depends(get_current_user)):
    """
    Test endpoint to send a notification to a specific user.
    For debugging notification issues.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    user_id = data.get("user_id")
    notification_type = data.get("type", "ticket")  # ticket, meeting_24h, meeting_2h
    
    # Get user from both collections
    target_user = await db.team_users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not target_user:
        return {"error": "User not found", "user_id": user_id}
    
    if not target_user.get("phone"):
        return {"error": "User has no phone number", "user": target_user.get("name")}
    
    try:
        if notification_type == "ticket":
            test_ticket = {
                "id": "test-ticket-123",
                "subject": "Test Ticket Notification",
                "priority": "high",
                "school_name": "Test School",
                "contact_name": "Test Contact"
            }
            await send_support_ticket_notification(test_ticket, target_user)
        elif notification_type == "meeting_24h":
            test_school = {
                "school_name": "Test School",
                "contact_name": "Test Contact",
                "meeting_date": "2024-01-01",
                "meeting_time": "10:00",
                "meeting_mode": "online"
            }
            await send_school_meeting_reminder_24h(test_school, target_user)
        elif notification_type == "meeting_2h":
            test_school = {
                "school_name": "Test School",
                "contact_name": "Test Contact",
                "meeting_time": "10:00",
                "meeting_mode": "online",
                "meeting_link": "https://meet.jit.si/test"
            }
            await send_school_meeting_reminder_2h(test_school, target_user)
        
        return {
            "success": True,
            "message": f"Test {notification_type} notification sent to {target_user.get('name')} at {target_user.get('phone')}"
        }
    except Exception as e:
        return {"error": str(e), "user": target_user.get("name")}


@api_router.get("/jobs/check-user-phones")
async def check_user_phones(user: dict = Depends(get_current_user)):
    """
    Check which users have phone numbers configured for notifications.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Get all team users
    team_users = await db.team_users.find({}, {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "role": 1}).to_list(100)
    users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "role": 1}).to_list(100)
    
    with_phone = []
    without_phone = []
    
    for u in team_users + users:
        user_info = {
            "id": u.get("id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "phone": u.get("phone"),
            "role": u.get("role")
        }
        if u.get("phone"):
            with_phone.append(user_info)
        else:
            without_phone.append(user_info)
    
    return {
        "total_users": len(team_users) + len(users),
        "with_phone": len(with_phone),
        "without_phone": len(without_phone),
        "users_with_phone": with_phone,
        "users_without_phone": without_phone
    }




@api_router.post("/jobs/sync-po-data")
async def sync_po_data_job(secret: str = None):
    """
    Background job to sync PO data from ProcureWay for all active/converted schools.
    Should be called by a cron job every 30 minutes or hourly.
    
    This job:
    1. Fetches active POs from ProcureWay for schools in onboarding
    2. Updates kit_delivery step with delivery/dispatch dates and tracking links
    3. Auto-creates expense records from PO invoice data
    """
    JOB_SECRET = os.environ.get("JOB_SECRET", "oll_cron_secret_2024")
    if secret != JOB_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    # Find schools in onboarding stages (converted, active, renewed, renewal_meeting)
    schools = await db.school_inquiries.find({
        "status": {"$in": ["converted", "active", "renewed", "renewal_meeting"]},
        "onboarding_workflow": {"$exists": True}
    }, {"_id": 0, "id": 1, "school_name": 1, "onboarding_workflow": 1}).to_list(500)
    
    results = {
        "schools_processed": 0,
        "po_data_synced": 0,
        "expenses_created": 0,
        "errors": []
    }
    
    for school in schools:
        try:
            school_id = school.get("id")
            school_name = school.get("school_name", "")
            
            if not school_name:
                continue
            
            # Fetch PO data from ProcureWay
            po_list_data = await fetch_po_data("po", {"school_name": school_name, "limit": 50})
            
            if not po_list_data or "data" not in po_list_data:
                continue
            
            # Filter for active POs (not delivered) - for tracking updates
            active_pos = [
                po for po in po_list_data.get("data", [])
                if po.get("status", "").lower() != "delivered"
            ]
            
            # Filter for delivered POs - for expense creation
            delivered_pos = [
                po for po in po_list_data.get("data", [])
                if po.get("status", "").lower() == "delivered"
            ]
            
            # Update tracking info from active POs
            if active_pos:
                po_number = active_pos[0].get("po_number")
                if po_number:
                    detailed_po = await fetch_po_data(f"po/{po_number}")
                    if detailed_po:
                        dispatch_info = detailed_po.get("dispatch_info") or {}
                        
                        # Check if kit_delivery step needs updating
                        workflow = school.get("onboarding_workflow", {})
                        kit_step = workflow.get("steps", {}).get("kit_delivery", {})
                        kit_data = kit_step.get("data", {})
                        
                        # Only update if PO number is different or not set
                        if kit_data.get("po_number") != po_number:
                            update_data = {
                                "onboarding_workflow.steps.kit_delivery.data.po_number": po_number,
                                "onboarding_workflow.steps.kit_delivery.data.po_status": detailed_po.get("status"),
                                "onboarding_workflow.steps.kit_delivery.data.vendor_name": detailed_po.get("vendor_name"),
                            }
                            
                            if not kit_data.get("delivery_date") and detailed_po.get("delivery_date"):
                                update_data["onboarding_workflow.steps.kit_delivery.data.delivery_date"] = detailed_po.get("delivery_date")
                            
                            if not kit_data.get("dispatch_date") and dispatch_info.get("dispatch_date"):
                                update_data["onboarding_workflow.steps.kit_delivery.data.dispatch_date"] = dispatch_info.get("dispatch_date")
                            
                            if not kit_data.get("tracking_link"):
                                tracking = transform_tracking_url(detailed_po.get("tracking_link") or detailed_po.get("public_tracking_url"))
                                if tracking:
                                    update_data["onboarding_workflow.steps.kit_delivery.data.tracking_link"] = tracking
                            
                            await db.school_inquiries.update_one(
                                {"id": school_id},
                                {"$set": update_data}
                            )
                            results["po_data_synced"] += 1
            
            # Create expenses ONLY from delivered POs
            for delivered_po_summary in delivered_pos:
                po_number = delivered_po_summary.get("po_number")
                if not po_number:
                    continue
                
                # IMPORTANT: Verify this PO actually belongs to this school by checking school_name match
                po_school_name = delivered_po_summary.get("school_name", "")
                if po_school_name and po_school_name.lower().strip() != school_name.lower().strip():
                    # PO belongs to a different school, skip it
                    continue
                    
                detailed_po = await fetch_po_data(f"po/{po_number}")
                if not detailed_po:
                    continue
                
                # Double-check school name from detailed PO
                detailed_school_name = detailed_po.get("school_name", "")
                if detailed_school_name and detailed_school_name.lower().strip() != school_name.lower().strip():
                    continue
                
                # Auto-create expenses from delivered PO data
                invoice_info = detailed_po.get("invoice_info") or {}
                invoice_amount = invoice_info.get("amount", 0) or detailed_po.get("subtotal", 0) or detailed_po.get("grand_total", 0)
                logistics_cost = invoice_info.get("logistics_cost", 0)
                
                # Get GST/Tax info
                total_tax = detailed_po.get("total_tax", 0)
                subtotal = detailed_po.get("subtotal", 0)
                grand_total = detailed_po.get("grand_total", 0)
                gst_rate = 18 if total_tax > 0 and subtotal > 0 else 0
                if total_tax > 0 and subtotal > 0:
                    gst_rate = round((total_tax / subtotal) * 100, 2)
                gst_type = "IGST" if total_tax > 0 else "None"
                
                # Check if kit expense already exists
                existing_kit = await db.school_expenses.find_one({
                    "school_id": school_id,
                    "po_number": po_number,
                    "category": "kit_cost"
                })
                
                if not existing_kit and invoice_amount > 0:
                    # Build attachments from PO files
                    kit_attachments = []
                    if detailed_po.get("po_pdf_url"):
                        kit_attachments.append({
                            "name": f"PO-{po_number}.pdf",
                            "url": detailed_po.get("po_pdf_url"),
                            "type": "po_file"
                        })
                    if detailed_po.get("invoice_file_url"):
                        kit_attachments.append({
                            "name": f"Invoice-{po_number}",
                            "url": detailed_po.get("invoice_file_url"),
                            "type": "invoice"
                        })
                    
                    kit_expense = {
                        "id": str(uuid.uuid4()),
                        "school_id": school_id,
                        "school_name": school_name,
                        "category": "kit_cost",
                        "category_name": "Kit Cost",
                        "amount": float(invoice_amount),
                        "subtotal": float(subtotal),
                        "gst_amount": float(total_tax),
                        "gst_rate": gst_rate,
                        "gst_type": gst_type,
                        "grand_total": float(grand_total),
                        "description": f"Kit cost from PO {po_number} (auto-synced)",
                        "expense_date": detailed_po.get("created_at", datetime.now(timezone.utc).isoformat())[:10],
                        "invoice_number": po_number,
                        "vendor_name": detailed_po.get("vendor_name", ""),
                        "payment_status": invoice_info.get("payment_status", "pending"),
                        "po_number": po_number,
                        "po_pdf_url": detailed_po.get("po_pdf_url"),
                        "invoice_file_url": detailed_po.get("invoice_file_url"),
                        "attachments": kit_attachments,
                        "created_by": "system",
                        "created_by_name": "Auto-Sync Job",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "auto_synced": True
                    }
                    await db.school_expenses.insert_one(kit_expense)
                    results["expenses_created"] += 1
                
                # Check if logistics expense already exists
                existing_logistics = await db.school_expenses.find_one({
                    "school_id": school_id,
                    "po_number": po_number,
                    "category": "logistics_cost"
                })
                
                if not existing_logistics and logistics_cost > 0:
                    # Build attachments for logistics
                    logistics_attachments = []
                    if detailed_po.get("logistics_bill_url"):
                        logistics_attachments.append({
                            "name": f"Logistics-Bill-{po_number}",
                            "url": detailed_po.get("logistics_bill_url"),
                            "type": "logistics_bill"
                        })
                    if detailed_po.get("delivery_proof_url"):
                        logistics_attachments.append({
                            "name": f"Delivery-Proof-{po_number}",
                            "url": detailed_po.get("delivery_proof_url"),
                            "type": "delivery_proof"
                        })
                    
                    logistics_expense = {
                        "id": str(uuid.uuid4()),
                        "school_id": school_id,
                        "school_name": school_name,
                        "category": "logistics_cost",
                        "category_name": "Logistics Cost",
                        "amount": float(logistics_cost),
                        "description": f"Logistics from PO {po_number} (auto-synced)",
                        "expense_date": detailed_po.get("created_at", datetime.now(timezone.utc).isoformat())[:10],
                        "invoice_number": f"{po_number}-LOGISTICS",
                        "vendor_name": detailed_po.get("vendor_name", ""),
                        "payment_status": "pending",
                        "po_number": po_number,
                        "logistics_bill_url": detailed_po.get("logistics_bill_url"),
                        "delivery_proof_url": detailed_po.get("delivery_proof_url"),
                        "attachments": logistics_attachments,
                        "created_by": "system",
                        "created_by_name": "Auto-Sync Job",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "auto_synced": True
                    }
                    await db.school_expenses.insert_one(logistics_expense)
                    results["expenses_created"] += 1
            
            results["schools_processed"] += 1
            
        except Exception as e:
            results["errors"].append({"school_id": school.get("id"), "error": str(e)})
    
    return {
        "success": True,
        "results": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ========================
# SCHOOL EXPENSES MANAGEMENT
# ========================

EXPENSE_CATEGORIES = [
    {"id": "kit_cost", "name": "Kit Cost", "description": "Learning kits and materials"},
    {"id": "teacher_cost", "name": "Teacher Cost", "description": "Teacher salaries and fees"},
    {"id": "logistics_cost", "name": "Logistics Cost", "description": "Delivery and transportation"},
    {"id": "books_cost", "name": "Books Cost", "description": "Textbooks and workbooks"},
    {"id": "gp_share", "name": "GP Share", "description": "Growth Partner commission"},
    {"id": "school_share", "name": "School Share", "description": "School's revenue share"},
    {"id": "printing_certification", "name": "Printing / Certification Cost", "description": "Certificates and printed materials"},
    {"id": "renewal_commission_team", "name": "Renewal Commission (Team)", "description": "Team commission on renewals"},
    {"id": "renewal_commission_teachers", "name": "Renewal Commission (Teachers)", "description": "Teacher commission on renewals"},
    {"id": "marketing_cost", "name": "Marketing Cost", "description": "Marketing and promotion expenses"},
    {"id": "technology_cost", "name": "Technology Cost", "description": "Software and platform costs"},
    {"id": "other", "name": "Other Expenses", "description": "Miscellaneous expenses"},
]


@api_router.get("/school-expenses/categories")
async def get_school_expense_categories(user: dict = Depends(get_current_user)):
    """Get all available expense categories"""
    return EXPENSE_CATEGORIES


@api_router.get("/school-expenses")
async def get_all_school_expenses(
    school_id: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all expenses with optional filters"""
    query = {}
    
    if school_id:
        query["school_id"] = school_id
    if category:
        query["category"] = category
    if start_date:
        query["expense_date"] = {"$gte": start_date}
    if end_date:
        if "expense_date" in query:
            query["expense_date"]["$lte"] = end_date
        else:
            query["expense_date"] = {"$lte": end_date}
    
    expenses = await db.school_expenses.find(query, {"_id": 0}).sort("expense_date", -1).to_list(1000)
    return expenses


@api_router.get("/school-expenses/summary")
async def get_school_expenses_summary(
    school_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get expense summary by school and category"""
    match_stage = {}
    if school_id:
        match_stage["school_id"] = school_id
    
    # Aggregate by school
    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {
            "$group": {
                "_id": {
                    "school_id": "$school_id",
                    "school_name": "$school_name",
                    "category": "$category"
                },
                "total_amount": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.school_name": 1, "_id.category": 1}}
    ]
    
    results = await db.school_expenses.aggregate(pipeline).to_list(1000)
    
    # Organize by school
    schools_summary = {}
    for r in results:
        school_id = r["_id"]["school_id"]
        school_name = r["_id"]["school_name"]
        category = r["_id"]["category"]
        
        if school_id not in schools_summary:
            schools_summary[school_id] = {
                "school_id": school_id,
                "school_name": school_name,
                "total_expenses": 0,
                "by_category": {}
            }
        
        schools_summary[school_id]["by_category"][category] = {
            "amount": r["total_amount"],
            "count": r["count"]
        }
        schools_summary[school_id]["total_expenses"] += r["total_amount"]
    
    # Get grand total
    total_pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    total_result = await db.school_expenses.aggregate(total_pipeline).to_list(1)
    grand_total = total_result[0]["total"] if total_result else 0
    
    return {
        "grand_total": grand_total,
        "schools": list(schools_summary.values())
    }


@api_router.get("/school-expenses/school/{school_id}")
async def get_single_school_expenses(school_id: str, user: dict = Depends(get_current_user)):
    """Get all expenses for a specific school"""
    expenses = await db.school_expenses.find(
        {"school_id": school_id}, 
        {"_id": 0}
    ).sort("expense_date", -1).to_list(500)
    
    # Calculate totals by category
    totals = {}
    grand_total = 0
    for exp in expenses:
        cat = exp.get("category", "other")
        if cat not in totals:
            totals[cat] = 0
        totals[cat] += exp.get("amount", 0)
        grand_total += exp.get("amount", 0)
    
    return {
        "expenses": expenses,
        "totals_by_category": totals,
        "grand_total": grand_total
    }


@api_router.post("/school-expenses")
async def create_school_expense(data: dict, user: dict = Depends(get_current_user)):
    """Create a new expense entry"""
    # Get school info
    school = await db.school_inquiries.find_one({"id": data.get("school_id")}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    expense = {
        "id": str(uuid.uuid4()),
        "school_id": data.get("school_id"),
        "school_name": school.get("school_name", "Unknown School"),
        "category": data.get("category"),
        "category_name": next((c["name"] for c in EXPENSE_CATEGORIES if c["id"] == data.get("category")), data.get("category")),
        "amount": float(data.get("amount", 0)),
        "description": data.get("description", ""),
        "expense_date": data.get("expense_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "invoice_number": data.get("invoice_number", ""),
        "vendor_name": data.get("vendor_name", ""),
        "payment_status": data.get("payment_status", "pending"),  # pending, paid, partial
        "payment_mode": data.get("payment_mode", ""),  # cash, bank_transfer, upi, cheque
        "notes": data.get("notes", ""),
        "attachments": data.get("attachments", []),
        "created_by": user.get("email"),
        "created_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.school_expenses.insert_one(expense)
    return {"message": "Expense created successfully", "expense": expense}


@api_router.patch("/school-expenses/{expense_id}")
async def update_school_expense(expense_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update an expense entry"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    allowed_fields = ["amount", "description", "expense_date", "invoice_number", 
                      "vendor_name", "payment_status", "payment_mode", "notes", "attachments", "category"]
    
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
            if field == "category":
                update_data["category_name"] = next((c["name"] for c in EXPENSE_CATEGORIES if c["id"] == data[field]), data[field])
    
    await db.school_expenses.update_one({"id": expense_id}, {"$set": update_data})
    return {"message": "Expense updated successfully"}


@api_router.delete("/school-expenses/{expense_id}")
async def delete_school_expense(expense_id: str, user: dict = Depends(get_current_user)):
    """Delete an expense entry"""
    await db.school_expenses.delete_one({"id": expense_id})
    return {"message": "Expense deleted successfully"}


@api_router.post("/expenses/cleanup-duplicates")
async def cleanup_duplicate_expenses(user: dict = Depends(get_current_user)):
    """Remove duplicate expenses - keeps only the first expense per school/PO/category combination"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find all auto-synced expenses with PO numbers
    expenses = await db.school_expenses.find(
        {"po_number": {"$exists": True, "$ne": None}},
        {"_id": 0}
    ).to_list(10000)
    
    # Group by school_id + po_number + category
    seen = {}
    duplicates_to_delete = []
    
    for exp in expenses:
        key = f"{exp.get('school_id')}_{exp.get('po_number')}_{exp.get('category')}"
        if key in seen:
            # This is a duplicate
            duplicates_to_delete.append(exp.get('id'))
        else:
            seen[key] = exp.get('id')
    
    # Delete duplicates
    if duplicates_to_delete:
        await db.school_expenses.delete_many({"id": {"$in": duplicates_to_delete}})
    
    return {
        "message": f"Cleanup complete. Removed {len(duplicates_to_delete)} duplicate expenses.",
        "duplicates_removed": len(duplicates_to_delete)
    }


@api_router.post("/expenses/clear-auto-synced")
async def clear_auto_synced_expenses(user: dict = Depends(get_current_user)):
    """Clear all auto-synced expenses to allow fresh sync. Manual expenses are preserved."""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.school_expenses.delete_many({"auto_synced": True})
    
    return {
        "message": f"Cleared {result.deleted_count} auto-synced expenses. Manual expenses preserved.",
        "deleted_count": result.deleted_count
    }


# ========================
# PO API INTEGRATION (PROCUREWAY)
# ========================

PO_API_BASE_URL = os.environ.get("PO_API_BASE_URL", "https://vendorplus-4.emergent.host/api/external")
PO_API_KEY = os.environ.get("PROCUREWAY_API_KEY", "oll_ext_O5MVdAo6KnEslbB3jtWcDBn_fPu7DRY78vr-ZkHZ7Tg")
# Production tracking URL domain (replace preview URLs with production)
PO_TRACKING_PROD_URL = os.environ.get("PO_TRACKING_URL", "https://vendorplus-4.emergent.host")

def transform_tracking_url(url: str) -> str:
    """Transform preview tracking URLs to production URLs"""
    if not url:
        return url
    # Replace preview domain with production domain
    preview_patterns = [
        "oll-procure.preview.emergentagent.com",
        "procureway.preview.emergentagent.com",
        "vendorplus.preview.emergentagent.com",
        "procureway.stage-preview.emergentagent.com",
        "vendorplus.stage-preview.emergentagent.com",
        "oll-procure.stage-preview.emergentagent.com"
    ]
    for pattern in preview_patterns:
        if pattern in url:
            # Extract the path after the domain
            url = url.replace(f"https://{pattern}", PO_TRACKING_PROD_URL)
            url = url.replace(f"http://{pattern}", PO_TRACKING_PROD_URL)
    return url

async def fetch_po_data(endpoint: str, params: dict = None, timeout: float = 10.0):
    """Helper function to fetch data from PO API"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{PO_API_BASE_URL}/{endpoint}",
                headers={"X-API-Key": PO_API_KEY},
                params=params,
                timeout=timeout
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logging.error(f"PO API HTTP error: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            logging.error(f"PO API error: {str(e)}")
            return None


@api_router.get("/schools/{school_id}/po-data")
async def get_school_po_data(school_id: str, user: dict = Depends(get_current_user)):
    """Get PO data for a school from ProcureWay - excludes delivered POs"""
    # Get school info
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    school_name = school.get("school_name", "")
    
    # Fetch all POs for this school (by school_name match)
    po_list_data = await fetch_po_data("po", {"school_name": school_name, "limit": 50})
    
    if not po_list_data or "data" not in po_list_data:
        return {
            "school_id": school_id,
            "school_name": school_name,
            "pos": [],
            "active_po": None,
            "message": "No POs found for this school"
        }
    
    # Filter out delivered POs
    active_pos = [
        po for po in po_list_data.get("data", [])
        if po.get("status", "").lower() != "delivered"
    ]
    
    # Fetch detailed info for each active PO
    detailed_pos = []
    for po in active_pos:
        po_number = po.get("po_number")
        if po_number:
            detailed = await fetch_po_data(f"po/{po_number}")
            if detailed:
                detailed_pos.append(detailed)
    
    # Get the most relevant PO (latest non-delivered one)
    active_po = detailed_pos[0] if detailed_pos else None
    
    return {
        "school_id": school_id,
        "school_name": school_name,
        "pos": detailed_pos,
        "active_po": active_po,
        "total_pos": len(detailed_pos)
    }


@api_router.post("/schools/{school_id}/sync-po-expenses")
async def sync_po_expenses(school_id: str, data: dict = None, user: dict = Depends(get_current_user)):
    """Sync expenses from PO data for a school - creates kit and logistics expenses only when delivery is confirmed"""
    if data is None:
        data = {}
    
    # Get school info
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    school_name = school.get("school_name", "")
    po_number = data.get("po_number")  # Optional - sync specific PO
    
    # If specific PO number provided, fetch that one
    if po_number:
        po_data = await fetch_po_data(f"po/{po_number}")
        pos_to_sync = [po_data] if po_data else []
    else:
        # Fetch all POs for this school - ONLY delivered ones for expenses
        po_list_data = await fetch_po_data("po", {"school_name": school_name, "status": "delivered", "limit": 50})
        if not po_list_data or "data" not in po_list_data:
            return {"message": "No delivered POs found", "expenses_created": 0, "note": "Expenses are only created after delivery is confirmed"}
        
        # Get detailed info for each delivered PO
        pos_to_sync = []
        for po in po_list_data.get("data", []):
            po_num = po.get("po_number")
            if po_num:
                detailed = await fetch_po_data(f"po/{po_num}")
                if detailed:
                    pos_to_sync.append(detailed)
    
    expenses_created = []
    
    for po in pos_to_sync:
        po_num = po.get("po_number", "Unknown")
        po_status = po.get("status", "").lower()
        
        # Only create expenses for delivered POs
        if po_status != "delivered":
            continue
        
        # Verify PO belongs to this school
        po_school_name = po.get("school_name", "")
        if po_school_name and po_school_name.lower().strip() != school_name.lower().strip():
            continue
            
        vendor_name = po.get("vendor_name", "")
        invoice_info = po.get("invoice_info") or {}
        
        # Get amounts from invoice_info if available, otherwise from PO total
        invoice_amount = invoice_info.get("amount", 0) or po.get("subtotal", 0) or po.get("grand_total", 0)
        logistics_cost = invoice_info.get("logistics_cost", 0)
        
        # Get GST/Tax info
        total_tax = po.get("total_tax", 0)
        subtotal = po.get("subtotal", 0)
        grand_total = po.get("grand_total", 0)
        
        # Determine GST type based on tax amount (18% is standard GST)
        gst_rate = 18 if total_tax > 0 and subtotal > 0 else 0
        if total_tax > 0 and subtotal > 0:
            gst_rate = round((total_tax / subtotal) * 100, 2)
        
        # Default to IGST for inter-state, can be configured
        gst_type = "IGST" if total_tax > 0 else "None"
        
        # Check if expense already exists for this PO
        existing_kit = await db.school_expenses.find_one({
            "school_id": school_id,
            "po_number": po_num,
            "category": "kit_cost"
        })
        
        existing_logistics = await db.school_expenses.find_one({
            "school_id": school_id,
            "po_number": po_num,
            "category": "logistics_cost"
        })
        
        # Create Kit Cost expense if not exists and amount > 0
        if not existing_kit and invoice_amount > 0:
            # Build attachments from PO files
            kit_attachments = []
            if po.get("po_pdf_url"):
                kit_attachments.append({
                    "name": f"PO-{po_num}.pdf",
                    "url": po.get("po_pdf_url"),
                    "type": "po_file"
                })
            if po.get("invoice_file_url"):
                kit_attachments.append({
                    "name": f"Invoice-{po_num}",
                    "url": po.get("invoice_file_url"),
                    "type": "invoice"
                })
            
            kit_expense = {
                "id": str(uuid.uuid4()),
                "school_id": school_id,
                "school_name": school_name,
                "category": "kit_cost",
                "category_name": "Kit Cost",
                "amount": float(invoice_amount),
                "subtotal": float(subtotal),
                "gst_amount": float(total_tax),
                "gst_rate": gst_rate,
                "gst_type": gst_type,
                "grand_total": float(grand_total),
                "description": f"Kit cost from PO {po_num}",
                "expense_date": po.get("created_at", datetime.now(timezone.utc).isoformat())[:10],
                "invoice_number": po_num,
                "vendor_name": vendor_name,
                "payment_status": invoice_info.get("payment_status", "pending"),
                "payment_mode": "",
                "notes": f"Auto-synced from ProcureWay PO {po_num}",
                "po_number": po_num,
                "po_pdf_url": po.get("po_pdf_url"),
                "invoice_file_url": po.get("invoice_file_url"),
                "attachments": kit_attachments,
                "created_by": user.get("email"),
                "created_by_name": user.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "auto_synced": True
            }
            await db.school_expenses.insert_one(kit_expense)
            expenses_created.append({"type": "kit_cost", "po": po_num, "amount": invoice_amount, "gst": total_tax})
        
        # Create Logistics Cost expense if not exists and amount > 0
        if not existing_logistics and logistics_cost > 0:
            # Build attachments for logistics
            logistics_attachments = []
            if po.get("logistics_bill_url"):
                logistics_attachments.append({
                    "name": f"Logistics-Bill-{po_num}",
                    "url": po.get("logistics_bill_url"),
                    "type": "logistics_bill"
                })
            if po.get("delivery_proof_url"):
                logistics_attachments.append({
                    "name": f"Delivery-Proof-{po_num}",
                    "url": po.get("delivery_proof_url"),
                    "type": "delivery_proof"
                })
            
            logistics_expense = {
                "id": str(uuid.uuid4()),
                "school_id": school_id,
                "school_name": school_name,
                "category": "logistics_cost",
                "category_name": "Logistics Cost",
                "amount": float(logistics_cost),
                "description": f"Logistics cost from PO {po_num}",
                "expense_date": po.get("created_at", datetime.now(timezone.utc).isoformat())[:10],
                "invoice_number": f"{po_num}-LOGISTICS",
                "vendor_name": vendor_name,
                "payment_status": "pending",
                "payment_mode": "",
                "notes": f"Auto-synced logistics from ProcureWay PO {po_num}",
                "po_number": po_num,
                "logistics_bill_url": po.get("logistics_bill_url"),
                "delivery_proof_url": po.get("delivery_proof_url"),
                "attachments": logistics_attachments,
                "created_by": user.get("email"),
                "created_by_name": user.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "auto_synced": True
            }
            await db.school_expenses.insert_one(logistics_expense)
            expenses_created.append({"type": "logistics_cost", "po": po_num, "amount": logistics_cost})
    
    return {
        "message": f"Synced {len(expenses_created)} expenses from POs",
        "expenses_created": expenses_created,
        "pos_processed": len(pos_to_sync)
    }


@api_router.get("/schools/{school_id}/onboarding-po-info")
async def get_onboarding_po_info(school_id: str, user: dict = Depends(get_current_user)):
    """Get PO delivery info for onboarding kit_delivery step"""
    # Get school info
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    school_name = school.get("school_name", "")
    
    # Fetch POs for this school (exclude delivered)
    po_list_data = await fetch_po_data("po", {"school_name": school_name, "limit": 50})
    
    if not po_list_data or "data" not in po_list_data:
        return {
            "has_po": False,
            "delivery_date": None,
            "dispatch_date": None,
            "tracking_link": None,
            "message": "No active POs found"
        }
    
    # Filter out delivered POs and get details
    active_pos = []
    for po in po_list_data.get("data", []):
        if po.get("status", "").lower() != "delivered":
            po_number = po.get("po_number")
            if po_number:
                detailed = await fetch_po_data(f"po/{po_number}")
                if detailed:
                    active_pos.append(detailed)
    
    if not active_pos:
        return {
            "has_po": False,
            "delivery_date": None,
            "dispatch_date": None,
            "tracking_link": None,
            "message": "All POs are delivered or no active POs"
        }
    
    # Get the most recent active PO
    primary_po = active_pos[0]
    dispatch_info = primary_po.get("dispatch_info") or {}
    
    return {
        "has_po": True,
        "po_number": primary_po.get("po_number"),
        "po_status": primary_po.get("status"),
        "delivery_date": primary_po.get("delivery_date"),
        "dispatch_date": dispatch_info.get("dispatch_date"),
        "tracking_link": transform_tracking_url(primary_po.get("tracking_link")),
        "public_tracking_url": transform_tracking_url(primary_po.get("public_tracking_url")),
        "vendor_name": primary_po.get("vendor_name"),
        "contact_person": primary_po.get("contact_person"),
        "delivery_address": primary_po.get("delivery_address"),
        "grand_total": primary_po.get("grand_total"),
        "all_pos": [{
            "po_number": po.get("po_number"),
            "status": po.get("status"),
            "delivery_date": po.get("delivery_date"),
            "tracking_link": transform_tracking_url(po.get("tracking_link")),
            "public_tracking_url": transform_tracking_url(po.get("public_tracking_url")),
            "vendor_name": po.get("vendor_name"),
            "grand_total": po.get("grand_total")
        } for po in active_pos]
    }


# ========================
# EXTERNAL API KEY SYSTEM
# ========================

import secrets

async def verify_external_api_key(api_key: str = Header(None, alias="X-API-Key")):
    """Verify external API key from header"""
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required. Use X-API-Key header.")
    
    # Find the API key in database
    key_doc = await db.external_api_keys.find_one({"key": api_key, "is_active": True}, {"_id": 0})
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    
    # Update last used timestamp
    await db.external_api_keys.update_one(
        {"key": api_key},
        {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}, "$inc": {"usage_count": 1}}
    )
    
    return key_doc


@api_router.post("/admin/api-keys/generate")
async def generate_external_api_key(data: dict, user: dict = Depends(get_current_user)):
    """Generate a new external API key for accessing school data"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Generate a secure API key
    api_key = f"oll_sk_{secrets.token_urlsafe(32)}"
    
    key_doc = {
        "id": str(uuid.uuid4()),
        "key": api_key,
        "name": data.get("name", "External API Key"),
        "description": data.get("description", ""),
        "permissions": data.get("permissions", ["schools:read"]),  # schools:read, schools:write
        "created_by": user.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used_at": None,
        "usage_count": 0,
        "is_active": True,
        "rate_limit": data.get("rate_limit", 1000),  # requests per day
        "allowed_ips": data.get("allowed_ips", []),  # empty = all IPs allowed
    }
    
    await db.external_api_keys.insert_one(key_doc)
    
    return {
        "message": "API key generated successfully",
        "api_key": api_key,
        "name": key_doc["name"],
        "id": key_doc["id"],
        "note": "Save this key securely. It won't be shown again."
    }


@api_router.get("/admin/api-keys")
async def list_external_api_keys(user: dict = Depends(get_current_user)):
    """List all external API keys (keys are masked)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    keys = await db.external_api_keys.find({}, {"_id": 0}).to_list(100)
    
    # Mask the actual keys
    for key in keys:
        if key.get("key"):
            key["key"] = key["key"][:12] + "..." + key["key"][-4:]
    
    return keys


@api_router.patch("/admin/api-keys/{key_id}")
async def update_external_api_key(key_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update an external API key (activate/deactivate, update name, etc.)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    update_data = {}
    if "is_active" in data:
        update_data["is_active"] = data["is_active"]
    if "name" in data:
        update_data["name"] = data["name"]
    if "description" in data:
        update_data["description"] = data["description"]
    if "rate_limit" in data:
        update_data["rate_limit"] = data["rate_limit"]
    
    if update_data:
        await db.external_api_keys.update_one({"id": key_id}, {"$set": update_data})
    
    return {"message": "API key updated successfully"}


@api_router.delete("/admin/api-keys/{key_id}")
async def delete_external_api_key(key_id: str, user: dict = Depends(get_current_user)):
    """Delete an external API key"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    await db.external_api_keys.delete_one({"id": key_id})
    return {"message": "API key deleted successfully"}


# ========================
# SERVICE API KEYS (Resend, etc.)
# ========================

@api_router.get("/admin/service-api-keys")
async def get_service_api_keys(user: dict = Depends(get_current_user)):
    """Get service API keys (masked for security)"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = {}
    
    # Get Resend API key from database (or fall back to env)
    resend_doc = await db.service_api_keys.find_one({"service": "resend"}, {"_id": 0})
    if resend_doc and resend_doc.get("api_key"):
        key = resend_doc["api_key"]
        result["resend_api_key"] = True
        result["resend_api_key_masked"] = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "****"
    else:
        # Fall back to environment variable
        env_key = os.environ.get("RESEND_API_KEY", "")
        if env_key:
            result["resend_api_key"] = True
            result["resend_api_key_masked"] = f"{env_key[:8]}...{env_key[-4:]}" if len(env_key) > 12 else "****"
        else:
            result["resend_api_key"] = False
            result["resend_api_key_masked"] = None
    
    return result

@api_router.post("/admin/service-api-keys/resend")
async def save_resend_api_key(data: dict, user: dict = Depends(get_current_user)):
    """Save Resend API key"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    
    api_key = data.get("api_key", "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    if not api_key.startswith("re_"):
        raise HTTPException(status_code=400, detail="Invalid Resend API key format")
    
    # Test the API key by initializing Resend
    try:
        resend.api_key = api_key
        # We can't easily test without sending an email, so just validate format
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid API key: {str(e)}")
    
    # Save to database
    await db.service_api_keys.update_one(
        {"service": "resend"},
        {
            "$set": {
                "service": "resend",
                "api_key": api_key,
                "updated_by": user.get("email"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Also update the runtime resend instance
    resend.api_key = api_key
    
    return {"message": "Resend API key saved successfully", "success": True}


# ========================
# EXTERNAL API ENDPOINTS (Protected by API Key)
# ========================

@api_router.get("/external/schools")
async def external_get_schools(
    status: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    api_key_data: dict = Depends(verify_external_api_key)
):
    """
    External API to get school data.
    
    Headers required:
        X-API-Key: your_api_key
    
    Query params:
        status: Filter by status (new, contacted, meeting_scheduled, meeting_done, converted, active, renewal_meeting, renewed, lost)
        city: Filter by city
        limit: Number of records (default 100, max 500)
        offset: Pagination offset
    
    Returns:
        List of schools with contact details, relationship manager, and stage info
    """
    # Build query
    query = {}
    if status:
        query["status"] = status
    if city:
        # Search in 'location' field (which contains city name)
        query["location"] = {"$regex": city, "$options": "i"}
    
    # Limit max results
    limit = min(limit, 500)
    
    # Get schools
    schools = await db.school_inquiries.find(query, {"_id": 0}).skip(offset).limit(limit).to_list(limit)
    
    # Get relationship managers info
    rm_ids = list(set([s.get("assigned_to") or s.get("relationship_manager") for s in schools if s.get("assigned_to") or s.get("relationship_manager")]))
    rm_map = {}
    if rm_ids:
        rms = await db.team_users.find({"id": {"$in": rm_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1}).to_list(100)
        rm_map = {rm["id"]: rm for rm in rms}
    
    # Format response
    result = []
    for school in schools:
        rm_id = school.get("assigned_to") or school.get("relationship_manager")
        rm_info = rm_map.get(rm_id, {})
        
        result.append({
            "id": school.get("id"),
            "school_name": school.get("school_name"),
            "status": school.get("status"),
            "stage": school.get("status"),  # alias for status
            
            # Contact details
            "contact": {
                "name": school.get("contact_name"),
                "phone": school.get("phone"),
                "email": school.get("email"),
                "designation": school.get("designation"),
            },
            
            # Location
            "location": {
                "city": school.get("location"),  # 'location' field contains city
                "state": school.get("state"),
                "address": school.get("address"),
                "area": school.get("city"),  # some schools may have 'city' as area
            },
            
            # Relationship Manager
            "relationship_manager": {
                "id": rm_id,
                "name": rm_info.get("name") or school.get("relationship_manager_name"),
                "email": rm_info.get("email"),
                "phone": rm_info.get("phone"),
            } if rm_id else None,
            
            # School details
            "school_details": {
                "board": school.get("board"),
                "student_count": school.get("student_count"),
                "type": school.get("school_type"),
            },
            
            # Dates
            "created_at": school.get("created_at"),
            "updated_at": school.get("updated_at"),
            "converted_at": school.get("converted_at"),
        })
    
    # Get total count
    total = await db.school_inquiries.count_documents(query)
    
    return {
        "data": result,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total
        }
    }


@api_router.get("/external/schools/{school_id}")
async def external_get_school_by_id(
    school_id: str,
    api_key_data: dict = Depends(verify_external_api_key)
):
    """Get a single school by ID"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Get RM info
    rm_id = school.get("assigned_to") or school.get("relationship_manager")
    rm_info = {}
    if rm_id:
        rm = await db.team_users.find_one({"id": rm_id}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1})
        if rm:
            rm_info = rm
    
    return {
        "id": school.get("id"),
        "school_name": school.get("school_name"),
        "status": school.get("status"),
        "stage": school.get("status"),
        
        "contact": {
            "name": school.get("contact_name"),
            "phone": school.get("phone"),
            "email": school.get("email"),
            "designation": school.get("designation"),
        },
        
        "location": {
            "city": school.get("location"),  # 'location' field contains city
            "state": school.get("state"),
            "address": school.get("address"),
            "area": school.get("city"),
        },
        
        "relationship_manager": {
            "id": rm_id,
            "name": rm_info.get("name") or school.get("relationship_manager_name"),
            "email": rm_info.get("email"),
            "phone": rm_info.get("phone"),
        } if rm_id else None,
        
        "school_details": {
            "board": school.get("board"),
            "student_count": school.get("student_count"),
            "type": school.get("school_type"),
        },
        
        "additional_contacts": school.get("school_contacts", []),
        
        "created_at": school.get("created_at"),
        "updated_at": school.get("updated_at"),
        "converted_at": school.get("converted_at"),
    }


@api_router.get("/external/schools/stats/summary")
async def external_get_schools_stats(
    api_key_data: dict = Depends(verify_external_api_key)
):
    """Get summary statistics of schools"""
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    status_counts = await db.school_inquiries.aggregate(pipeline).to_list(20)
    
    total = sum([s["count"] for s in status_counts])
    
    return {
        "total_schools": total,
        "by_status": {s["_id"]: s["count"] for s in status_counts if s["_id"]},
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


# ========================
# ADMIN REPORTS ENDPOINTS
# ========================

class ReportsDateFilter(BaseModel):
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None    # YYYY-MM-DD
    period: Optional[str] = None      # day, week, month, year

def get_date_range(start_date: Optional[str], end_date: Optional[str], period: Optional[str]):
    """Get date range for filtering"""
    now = datetime.now(timezone.utc)
    
    if start_date and end_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    elif period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "week":
        start = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "month":
        start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "year":
        start = (now - timedelta(days=365)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    else:
        # Default to all time
        start = datetime(2020, 1, 1, tzinfo=timezone.utc)
        end = now
    
    return start, end

def parse_date_field(date_val):
    """Parse date field from various formats and ensure timezone awareness"""
    if not date_val:
        return None
    if isinstance(date_val, datetime):
        if date_val.tzinfo is None:
            return date_val.replace(tzinfo=timezone.utc)
        return date_val
    if isinstance(date_val, str):
        try:
            # Handle ISO format with Z
            dt = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except:
            pass
        try:
            # Handle simple date format
            dt = datetime.strptime(date_val, "%Y-%m-%d")
            return dt.replace(tzinfo=timezone.utc)
        except:
            pass
        try:
            # Handle datetime without timezone
            dt = datetime.strptime(date_val, "%Y-%m-%dT%H:%M:%S")
            return dt.replace(tzinfo=timezone.utc)
        except:
            pass
    return None

@api_router.get("/admin/reports/overview")
async def get_reports_overview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get overall metrics for the dashboard"""
    start, end = get_date_range(start_date, end_date, period)
    
    # Get all student inquiries for date filtering
    all_student_inquiries = await db.student_inquiries.find({}, {"_id": 0}).to_list(10000)
    student_inquiries = []
    for inq in all_student_inquiries:
        created = parse_date_field(inq.get('created_at'))
        if created and start <= created <= end:
            if assigned_to and inq.get('assigned_to') != assigned_to:
                continue
            student_inquiries.append(inq)
    
    # Get all school inquiries
    all_school_inquiries = await db.school_inquiries.find({}, {"_id": 0}).to_list(10000)
    school_inquiries = []
    for inq in all_school_inquiries:
        created = parse_date_field(inq.get('created_at'))
        if created and start <= created <= end:
            if assigned_to and inq.get('assigned_to') != assigned_to:
                continue
            school_inquiries.append(inq)
    
    # Get all educator applications
    all_educators = await db.educator_applications.find({}, {"_id": 0}).to_list(10000)
    educators = []
    for edu in all_educators:
        created = parse_date_field(edu.get('created_at'))
        if created and start <= created <= end:
            if assigned_to and edu.get('assigned_to') != assigned_to:
                continue
            educators.append(edu)
    
    # Get demo bookings
    all_demos = await db.demo_bookings.find({}, {"_id": 0}).to_list(10000)
    demos = []
    for demo in all_demos:
        created = parse_date_field(demo.get('created_at'))
        if created and start <= created <= end:
            demos.append(demo)
    
    # Calculate metrics
    total_students = len(student_inquiries)
    paid_students = len([s for s in student_inquiries if s.get('status') == 'converted' or s.get('payment_status') == 'paid'])
    
    total_schools = len(school_inquiries)
    converted_schools = len([s for s in school_inquiries if s.get('status') == 'converted'])
    
    total_educators = len(educators)
    active_educators = len([e for e in educators if e.get('status') == 'active'])
    
    total_demos = len(demos)
    completed_demos = len([d for d in demos if d.get('status') == 'completed'])
    
    # Revenue calculation - includes amount_paid AND conversion_amount from onboarding
    student_revenue = 0
    for s in student_inquiries:
        if s.get('payment_status') == 'paid' or s.get('status') == 'converted':
            # Check for conversion_amount first (from onboarding), then amount_paid
            amount = float(s.get('conversion_amount') or s.get('amount_paid') or 0)
            student_revenue += amount
    
    school_revenue = 0
    for s in school_inquiries:
        if s.get('status') in ['converted', 'active', 'renewed']:
            # Check for conversion_amount, onboarding_data.total_amount, or amount_paid
            onboarding_data = s.get('onboarding_data', {})
            amount = float(s.get('conversion_amount') or onboarding_data.get('total_amount') or s.get('amount_paid') or 0)
            school_revenue += amount
    total_revenue = student_revenue + school_revenue
    
    return {
        "overview": {
            "total_revenue": total_revenue,
            "student_revenue": student_revenue,
            "school_revenue": school_revenue,
            "paid_students": paid_students,
            "converted_schools": converted_schools,
            "active_educators": active_educators,
        },
        "students": {
            "total": total_students,
            "new": len([s for s in student_inquiries if s.get('status') == 'new']),
            "demo_scheduled": len([s for s in student_inquiries if s.get('status') == 'demo_scheduled']),
            "demo_completed": len([s for s in student_inquiries if s.get('status') == 'demo_completed']),
            "converted": paid_students,
        },
        "schools": {
            "total": total_schools,
            "new": len([s for s in school_inquiries if s.get('status') == 'new']),
            "meeting_scheduled": len([s for s in school_inquiries if s.get('status') == 'meeting_scheduled']),
            "proposal_sent": len([s for s in school_inquiries if s.get('status') == 'proposal_sent']),
            "converted": converted_schools,
        },
        "educators": {
            "total": total_educators,
            "new": len([e for e in educators if e.get('status') == 'new']),
            "demo_scheduled": len([e for e in educators if e.get('status') == 'demo_scheduled']),
            "onboarding": len([e for e in educators if e.get('status') == 'onboarding']),
            "active": active_educators,
        },
        "demos": {
            "total": total_demos,
            "scheduled": len([d for d in demos if d.get('status') == 'scheduled']),
            "completed": completed_demos,
        },
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
        }
    }

@api_router.get("/admin/reports/sales-funnel")
async def get_sales_funnel_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user_type: str = "students",  # students, schools
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get sales funnel metrics with conversion rates"""
    start, end = get_date_range(start_date, end_date, period)
    
    if user_type == "students":
        collection = db.student_inquiries
    else:
        collection = db.school_inquiries
    
    all_items = await collection.find({}, {"_id": 0}).to_list(10000)
    items = []
    for item in all_items:
        created = parse_date_field(item.get('created_at'))
        if created and start <= created <= end:
            if assigned_to and item.get('assigned_to') != assigned_to:
                continue
            items.append(item)
    
    total = len(items)
    if total == 0:
        return {
            "funnel": [],
            "conversion_rates": {},
            "revenue": 0,
            "period": {"start": start.isoformat(), "end": end.isoformat()}
        }
    
    # Define stages based on user type
    if user_type == "students":
        stages = [
            {"name": "New Leads", "status": "new"},
            {"name": "Demo Scheduled", "status": "demo_scheduled"},
            {"name": "Demo Completed", "status": "demo_completed"},
            {"name": "Converted", "status": "converted"},
        ]
    else:
        stages = [
            {"name": "New Leads", "status": "new"},
            {"name": "Meeting Scheduled", "status": "meeting_scheduled"},
            {"name": "Proposal Sent", "status": "proposal_sent"},
            {"name": "Negotiation", "status": "negotiation"},
            {"name": "Converted", "status": "converted"},
        ]
    
    funnel = []
    for i, stage in enumerate(stages):
        count = len([item for item in items if item.get('status') == stage['status']])
        # Include all later stages in the count (funnel logic)
        for later_stage in stages[i+1:]:
            count += len([item for item in items if item.get('status') == later_stage['status']])
        funnel.append({
            "stage": stage['name'],
            "count": count,
            "percentage": round(count / total * 100, 1) if total > 0 else 0
        })
    
    # Calculate conversion rates
    converted = len([item for item in items if item.get('status') == 'converted'])
    demo_scheduled = len([item for item in items if item.get('status') in ['demo_scheduled', 'demo_completed', 'converted', 'meeting_scheduled', 'proposal_sent', 'negotiation']])
    
    conversion_rates = {
        "lead_to_demo": round(demo_scheduled / total * 100, 1) if total > 0 else 0,
        "demo_to_conversion": round(converted / demo_scheduled * 100, 1) if demo_scheduled > 0 else 0,
        "overall_conversion": round(converted / total * 100, 1) if total > 0 else 0,
    }
    
    # Revenue - includes conversion_amount from onboarding
    revenue = 0
    for item in items:
        if item.get('status') == 'converted' or item.get('payment_status') == 'paid':
            amount = float(item.get('conversion_amount') or item.get('amount_paid') or 0)
            revenue += amount
    
    return {
        "funnel": funnel,
        "conversion_rates": conversion_rates,
        "revenue": revenue,
        "total_leads": total,
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@api_router.get("/admin/reports/lead-analytics")
async def get_lead_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get lead analytics - source, age group, course interest breakdown"""
    start, end = get_date_range(start_date, end_date, period)
    
    all_items = await db.student_inquiries.find({}, {"_id": 0}).to_list(10000)
    items = []
    for item in all_items:
        created = parse_date_field(item.get('created_at'))
        if created and start <= created <= end:
            items.append(item)
    
    # Source breakdown
    sources = {}
    for item in items:
        source = item.get('source', 'website') or 'website'
        sources[source] = sources.get(source, 0) + 1
    
    # Age group breakdown
    age_groups = {}
    for item in items:
        age = item.get('child_age') or item.get('age_group', 'Unknown')
        if isinstance(age, (int, float)):
            if age < 6:
                age_group = "Under 6"
            elif age < 10:
                age_group = "6-9"
            elif age < 14:
                age_group = "10-13"
            else:
                age_group = "14+"
        else:
            age_group = str(age) if age else "Unknown"
        age_groups[age_group] = age_groups.get(age_group, 0) + 1
    
    # Course interest breakdown
    courses = {}
    for item in items:
        course = item.get('course_interest') or item.get('skill', 'Not Specified')
        if isinstance(course, list):
            for c in course:
                courses[c] = courses.get(c, 0) + 1
        else:
            courses[course] = courses.get(course, 0) + 1
    
    # Stage breakdown
    stages = {}
    for item in items:
        stage = item.get('status', 'new')
        stages[stage] = stages.get(stage, 0) + 1
    
    return {
        "by_source": [{"name": k, "count": v} for k, v in sorted(sources.items(), key=lambda x: -x[1])],
        "by_age_group": [{"name": k, "count": v} for k, v in sorted(age_groups.items(), key=lambda x: -x[1])],
        "by_course": [{"name": k, "count": v} for k, v in sorted(courses.items(), key=lambda x: -x[1])],
        "by_stage": [{"name": k, "count": v} for k, v in sorted(stages.items(), key=lambda x: -x[1])],
        "total": len(items),
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@api_router.get("/admin/reports/educator-metrics")
async def get_educator_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get educator/teacher quality metrics"""
    start, end = get_date_range(start_date, end_date, period)
    
    # Get all educators
    all_educators = await db.educator_applications.find({}, {"_id": 0}).to_list(10000)
    
    # Filter by date range for new educators
    new_educators = []
    all_active = []
    for edu in all_educators:
        created = parse_date_field(edu.get('created_at'))
        if created and start <= created <= end:
            new_educators.append(edu)
        if edu.get('status') == 'active':
            all_active.append(edu)
    
    # Get demo bookings to calculate demos per educator
    all_demos = await db.demo_bookings.find({}, {"_id": 0}).to_list(10000)
    demos_in_period = []
    for demo in all_demos:
        created = parse_date_field(demo.get('created_at'))
        if created and start <= created <= end:
            demos_in_period.append(demo)
    
    # Calculate demos per active educator
    educator_demo_count = {}
    for demo in demos_in_period:
        edu_id = demo.get('educator_id')
        if edu_id:
            educator_demo_count[edu_id] = educator_demo_count.get(edu_id, 0) + 1
    
    total_demos = sum(educator_demo_count.values())
    active_count = len(all_active)
    avg_demos_per_educator = round(total_demos / active_count, 1) if active_count > 0 else 0
    
    # Calculate earnings per educator (simplified)
    # Assuming each completed demo has a fixed earning or from demo_bookings
    demo_earning = 500  # Default earning per demo
    total_earnings = total_demos * demo_earning
    avg_earnings = round(total_earnings / active_count, 0) if active_count > 0 else 0
    
    # Status breakdown
    status_breakdown = {}
    for edu in new_educators:
        status = edu.get('status', 'new')
        status_breakdown[status] = status_breakdown.get(status, 0) + 1
    
    # Top performers (by demo count)
    top_educators = []
    for edu in all_active[:10]:
        demo_count = educator_demo_count.get(edu.get('id'), 0)
        if demo_count > 0:
            top_educators.append({
                "name": edu.get('name'),
                "demos": demo_count,
                "earnings": demo_count * demo_earning
            })
    top_educators.sort(key=lambda x: -x['demos'])
    
    return {
        "summary": {
            "new_educators": len(new_educators),
            "total_active": active_count,
            "avg_demos_per_educator": avg_demos_per_educator,
            "avg_earnings_per_educator": avg_earnings,
            "total_demos_conducted": total_demos,
        },
        "by_status": [{"name": k, "count": v} for k, v in sorted(status_breakdown.items(), key=lambda x: -x[1])],
        "top_performers": top_educators[:5],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@api_router.get("/admin/reports/support-metrics")
async def get_support_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get support query metrics"""
    start, end = get_date_range(start_date, end_date, period)
    
    # Get support queries with date filter in query (optimized)
    query_filter = {}
    if start and end:
        query_filter["created_at"] = {"$gte": start.isoformat(), "$lte": end.isoformat()}
    
    all_queries = await db.support_queries.find(query_filter, {"_id": 0}).to_list(5000)
    queries = []
    for q in all_queries:
        created = parse_date_field(q.get('created_at'))
        if created and start <= created <= end:
            queries.append(q)
    
    total = len(queries)
    
    # Status breakdown
    new_queries = len([q for q in queries if q.get('status') == 'new'])
    open_queries = len([q for q in queries if q.get('status') in ['new', 'open', 'in_progress']])
    resolved_queries = len([q for q in queries if q.get('status') in ['resolved', 'closed']])
    
    # Query type breakdown
    query_types = {}
    for q in queries:
        qtype = q.get('query_type') or q.get('category', 'General')
        query_types[qtype] = query_types.get(qtype, 0) + 1
    
    # Calculate average resolution time (for resolved queries)
    resolution_times = []
    for q in queries:
        if q.get('status') in ['resolved', 'closed']:
            created = parse_date_field(q.get('created_at'))
            resolved = parse_date_field(q.get('resolved_at') or q.get('updated_at'))
            if created and resolved:
                diff = (resolved - created).total_seconds() / 3600  # hours
                resolution_times.append(diff)
    
    avg_resolution_time = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0
    
    # Priority breakdown
    priority_breakdown = {}
    for q in queries:
        priority = q.get('priority', 'normal')
        priority_breakdown[priority] = priority_breakdown.get(priority, 0) + 1
    
    return {
        "summary": {
            "total": total,
            "new": new_queries,
            "open": open_queries,
            "resolved": resolved_queries,
            "avg_resolution_time_hours": avg_resolution_time,
        },
        "by_type": [{"name": k, "count": v} for k, v in sorted(query_types.items(), key=lambda x: -x[1])],
        "by_priority": [{"name": k, "count": v} for k, v in sorted(priority_breakdown.items(), key=lambda x: -x[1])],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@api_router.get("/admin/reports/user-stages")
async def get_user_stages_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all user types and their stages"""
    start, end = get_date_range(start_date, end_date, period)
    
    def is_in_range(item):
        created = parse_date_field(item.get('created_at'))
        if created is None:
            return True  # Include items without dates
        return start <= created <= end
    
    # Students
    all_students = await db.student_inquiries.find({}, {"_id": 0}).to_list(10000)
    students = [s for s in all_students if is_in_range(s)]
    
    student_stages = {}
    for s in students:
        stage = s.get('status', 'new')
        student_stages[stage] = student_stages.get(stage, 0) + 1
    
    # Schools
    all_schools = await db.school_inquiries.find({}, {"_id": 0}).to_list(10000)
    schools = [s for s in all_schools if is_in_range(s)]
    
    school_stages = {}
    for s in schools:
        stage = s.get('status', 'new')
        school_stages[stage] = school_stages.get(stage, 0) + 1
    
    # Educators
    all_educators = await db.educator_applications.find({}, {"_id": 0}).to_list(10000)
    educators = [e for e in all_educators if is_in_range(e)]
    
    educator_stages = {}
    for e in educators:
        stage = e.get('status', 'new')
        educator_stages[stage] = educator_stages.get(stage, 0) + 1
    
    # Team applications
    all_team = await db.team_applications.find({}, {"_id": 0}).to_list(10000)
    team = [t for t in all_team if is_in_range(t)]
    
    team_stages = {}
    for t in team:
        stage = t.get('status', 'new')
        team_stages[stage] = team_stages.get(stage, 0) + 1
    
    # Growth Partners
    all_gps = await db.growth_partners.find({}, {"_id": 0}).to_list(10000)
    gps = [g for g in all_gps if is_in_range(g)]
    
    gp_stages = {}
    for g in gps:
        stage = g.get('status', 'new')
        gp_stages[stage] = gp_stages.get(stage, 0) + 1
    
    return {
        "students": {
            "total": len(students),
            "stages": [{"name": k, "count": v} for k, v in sorted(student_stages.items(), key=lambda x: -x[1])]
        },
        "schools": {
            "total": len(schools),
            "stages": [{"name": k, "count": v} for k, v in sorted(school_stages.items(), key=lambda x: -x[1])]
        },
        "educators": {
            "total": len(educators),
            "stages": [{"name": k, "count": v} for k, v in sorted(educator_stages.items(), key=lambda x: -x[1])]
        },
        "team": {
            "total": len(team),
            "stages": [{"name": k, "count": v} for k, v in sorted(team_stages.items(), key=lambda x: -x[1])]
        },
        "growth_partners": {
            "total": len(gps),
            "stages": [{"name": k, "count": v} for k, v in sorted(gp_stages.items(), key=lambda x: -x[1])]
        },
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@api_router.get("/admin/reports/team-member/{user_id}")
async def get_team_member_report(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get performance report for a specific team member"""
    start, end = get_date_range(start_date, end_date, period)
    
    # Get the team member info
    team_member = await db.team_users.find_one({"id": user_id}, {"_id": 0})
    if not team_member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Get their role
    role = await db.roles.find_one({"id": team_member.get('role_id')}, {"_id": 0})
    role_name = role.get('name', 'Unknown') if role else 'Unknown'
    
    def is_in_range(item):
        created = parse_date_field(item.get('created_at'))
        if created is None:
            return True
        return start <= created <= end
    
    # Calculate metrics based on assigned leads and activities
    # Students assigned
    all_student_leads = await db.student_inquiries.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    student_leads = [s for s in all_student_leads if is_in_range(s)]
    student_converted = len([s for s in student_leads if s.get('status') == 'converted'])
    
    # Schools assigned
    all_school_leads = await db.school_inquiries.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    school_leads = [s for s in all_school_leads if is_in_range(s)]
    school_converted = len([s for s in school_leads if s.get('status') in ['converted', 'active', 'renewed']])
    
    # Schools as RM
    all_rm_schools = await db.school_inquiries.find({"relationship_manager": user_id}, {"_id": 0}).to_list(10000)
    rm_schools = [s for s in all_rm_schools if is_in_range(s)]
    
    # Educators assigned
    all_educator_leads = await db.educator_applications.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    educator_leads = [e for e in all_educator_leads if is_in_range(e)]
    educator_active = len([e for e in educator_leads if e.get('status') == 'active'])
    
    # Support tickets handled
    all_tickets = await db.support_queries.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    tickets = [t for t in all_tickets if is_in_range(t)]
    tickets_resolved = len([t for t in tickets if t.get('status') == 'resolved'])
    
    # Demo bookings facilitated
    all_demos = await db.demo_bookings.find({"assigned_to": user_id}, {"_id": 0}).to_list(10000)
    demos = [d for d in all_demos if is_in_range(d)]
    demos_completed = len([d for d in demos if d.get('status') == 'completed'])
    
    # Calculate conversion rates
    student_conversion_rate = round((student_converted / len(student_leads) * 100) if student_leads else 0, 1)
    school_conversion_rate = round((school_converted / len(school_leads) * 100) if school_leads else 0, 1)
    ticket_resolution_rate = round((tickets_resolved / len(tickets) * 100) if tickets else 0, 1)
    
    return {
        "member": {
            "id": user_id,
            "name": team_member.get('name'),
            "email": team_member.get('email'),
            "role": role_name,
            "city": team_member.get('city', ''),
            "is_active": team_member.get('is_active', True),
            "joined_at": team_member.get('created_at')
        },
        "metrics": {
            "students": {
                "assigned": len(student_leads),
                "converted": student_converted,
                "conversion_rate": student_conversion_rate
            },
            "schools": {
                "assigned": len(school_leads),
                "converted": school_converted,
                "conversion_rate": school_conversion_rate,
                "as_rm": len(rm_schools)
            },
            "educators": {
                "assigned": len(educator_leads),
                "active": educator_active
            },
            "support": {
                "total_tickets": len(tickets),
                "resolved": tickets_resolved,
                "resolution_rate": ticket_resolution_rate
            },
            "demos": {
                "total": len(demos),
                "completed": demos_completed
            }
        },
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@api_router.get("/admin/reports/b2c-insights")
async def get_b2c_insights(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get B2C (Student) insights - courses, age groups, cities, modes, preferred times"""
    start, end = get_date_range(start_date, end_date, period)
    
    all_students = await db.student_inquiries.find({}, {"_id": 0}).to_list(10000)
    students = []
    for s in all_students:
        created = parse_date_field(s.get('created_at'))
        if created and start <= created <= end:
            students.append(s)
    
    # Course/Skill breakdown
    courses = {}
    for s in students:
        course = s.get('course') or s.get('skill') or s.get('interest') or 'Unknown'
        courses[course] = courses.get(course, 0) + 1
    
    # Age group breakdown
    age_groups = {'Under 6': 0, '6-10': 0, '11-15': 0, '16-18': 0, 'Adult': 0, 'Unknown': 0}
    for s in students:
        age = s.get('age') or s.get('student_age')
        if age:
            try:
                age = int(age)
                if age < 6: age_groups['Under 6'] += 1
                elif age <= 10: age_groups['6-10'] += 1
                elif age <= 15: age_groups['11-15'] += 1
                elif age <= 18: age_groups['16-18'] += 1
                else: age_groups['Adult'] += 1
            except: age_groups['Unknown'] += 1
        else:
            age_groups['Unknown'] += 1
    
    # Learning goal breakdown
    goals = {}
    for s in students:
        goal = s.get('learning_goal') or s.get('goal') or 'Not specified'
        goals[goal] = goals.get(goal, 0) + 1
    
    # City breakdown
    cities = {}
    for s in students:
        city = s.get('city') or 'Unknown'
        cities[city] = cities.get(city, 0) + 1
    
    # Mode breakdown (online/offline)
    modes = {'online': 0, 'offline': 0, 'hybrid': 0, 'unknown': 0}
    for s in students:
        mode = (s.get('preferred_mode') or s.get('mode') or 'unknown').lower()
        if mode in modes:
            modes[mode] += 1
        else:
            modes['unknown'] += 1
    
    # Preferred days (from demo bookings)
    all_demos = await db.demo_bookings.find({}, {"_id": 0}).to_list(10000)
    day_counts = {'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0}
    time_slots = {'Morning (9-12)': 0, 'Afternoon (12-4)': 0, 'Evening (4-8)': 0, 'Night (8+)': 0}
    
    for demo in all_demos:
        demo_date = demo.get('scheduled_date') or demo.get('date')
        demo_time = demo.get('scheduled_time') or demo.get('time')
        if demo_date:
            try:
                d = parse_date_field(demo_date)
                if d:
                    day_name = d.strftime('%A')
                    if day_name in day_counts:
                        day_counts[day_name] += 1
            except: pass
        if demo_time:
            try:
                hour = int(demo_time.split(':')[0])
                if 9 <= hour < 12: time_slots['Morning (9-12)'] += 1
                elif 12 <= hour < 16: time_slots['Afternoon (12-4)'] += 1
                elif 16 <= hour < 20: time_slots['Evening (4-8)'] += 1
                else: time_slots['Night (8+)'] += 1
            except: pass
    
    # Calculate revenue
    student_revenue = sum(float(s.get('payment_amount', 0) or 0) for s in students if s.get('status') == 'converted')
    
    return {
        "total_students": len(students),
        "revenue": student_revenue,
        "courses": [{"name": k, "count": v} for k, v in sorted(courses.items(), key=lambda x: -x[1])[:10]],
        "age_groups": [{"name": k, "count": v} for k, v in age_groups.items()],
        "learning_goals": [{"name": k, "count": v} for k, v in sorted(goals.items(), key=lambda x: -x[1])[:8]],
        "cities": [{"name": k, "count": v} for k, v in sorted(cities.items(), key=lambda x: -x[1])[:10]],
        "modes": [{"name": k, "count": v} for k, v in modes.items()],
        "preferred_days": [{"name": k, "count": v} for k, v in day_counts.items()],
        "demo_times": [{"name": k, "count": v} for k, v in time_slots.items()],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@api_router.get("/admin/reports/b2b-insights")
async def get_b2b_insights(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get B2B (School) insights - offerings, cities, boards, active schools"""
    start, end = get_date_range(start_date, end_date, period)
    
    all_schools = await db.school_inquiries.find({}, {"_id": 0}).to_list(10000)
    schools = []
    for s in all_schools:
        created = parse_date_field(s.get('created_at'))
        if created and start <= created <= end:
            schools.append(s)
    
    # Status breakdown including active, renewal_meeting, renewed, lost
    status_counts = {}
    for s in all_schools:  # Use all schools for status breakdown
        status = s.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1
    
    active_count = status_counts.get('active', 0)
    renewal_meeting_count = status_counts.get('renewal_meeting', 0)
    renewed_count = status_counts.get('renewed', 0)
    lost_count = status_counts.get('lost', 0)
    converted_count = status_counts.get('converted', 0)
    
    # Offering breakdown
    offerings = {}
    for s in schools:
        selected = s.get('selected_offerings') or []
        if isinstance(selected, list):
            for off in selected:
                offerings[off] = offerings.get(off, 0) + 1
        offering = s.get('onboarding_data', {}).get('offering')
        if offering:
            offerings[offering] = offerings.get(offering, 0) + 1
    
    # City breakdown
    cities = {}
    for s in schools:
        city = s.get('city') or 'Unknown'
        cities[city] = cities.get(city, 0) + 1
    
    # Board breakdown
    boards = {}
    for s in schools:
        board = s.get('board') or 'Unknown'
        boards[board] = boards.get(board, 0) + 1
    
    # School type breakdown
    types = {}
    for s in schools:
        school_type = s.get('school_type') or s.get('type') or 'Unknown'
        types[school_type] = types.get(school_type, 0) + 1
    
    # Calculate revenue
    school_revenue = sum(float(s.get('conversion_amount', 0) or s.get('quoted_price', 0) or 0) for s in all_schools if s.get('status') in ['converted', 'active', 'renewed'])
    
    # Calculate renewal ratio: Renewed / (Active + Renewed + Lost)
    renewal_base = active_count + renewed_count + lost_count
    renewal_ratio = round((renewed_count / renewal_base * 100) if renewal_base > 0 else 0, 1)
    
    return {
        "total_schools": len(schools),
        "revenue": school_revenue,
        "active_schools": active_count,
        "renewal_meeting": renewal_meeting_count,
        "renewed": renewed_count,
        "lost": lost_count,
        "converted": converted_count,
        "renewal_ratio": renewal_ratio,
        "status_breakdown": [{"name": k, "count": v} for k, v in sorted(status_counts.items(), key=lambda x: -x[1])],
        "offerings": [{"name": k, "count": v} for k, v in sorted(offerings.items(), key=lambda x: -x[1])[:10]],
        "cities": [{"name": k, "count": v} for k, v in sorted(cities.items(), key=lambda x: -x[1])[:10]],
        "boards": [{"name": k, "count": v} for k, v in sorted(boards.items(), key=lambda x: -x[1])],
        "school_types": [{"name": k, "count": v} for k, v in sorted(types.items(), key=lambda x: -x[1])],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

@api_router.get("/admin/reports/support-insights")
async def get_support_insights(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get Support insights - resolution time, query types, team member performance"""
    start, end = get_date_range(start_date, end_date, period)
    
    all_queries = await db.support_queries.find({}, {"_id": 0}).to_list(10000)
    queries = []
    for q in all_queries:
        created = parse_date_field(q.get('created_at'))
        if created and start <= created <= end:
            queries.append(q)
    
    # Query type breakdown
    query_types = {}
    for q in queries:
        qtype = q.get('query_type') or q.get('type') or q.get('category') or 'General'
        query_types[qtype] = query_types.get(qtype, 0) + 1
    
    # Status breakdown
    status_counts = {'open': 0, 'in_progress': 0, 'resolved': 0, 'closed': 0}
    for q in queries:
        status = q.get('status', 'open').lower()
        if status in status_counts:
            status_counts[status] += 1
        else:
            status_counts['open'] += 1
    
    # Calculate resolution times
    resolution_times = []
    for q in queries:
        if q.get('status') in ['resolved', 'closed'] and q.get('resolved_at'):
            created = parse_date_field(q.get('created_at'))
            resolved = parse_date_field(q.get('resolved_at'))
            if created and resolved:
                delta = (resolved - created).total_seconds() / 3600  # Hours
                resolution_times.append(delta)
    
    avg_resolution_time = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0
    
    # Team member performance
    team_performance = {}
    team_users = await db.team_users.find({}, {"_id": 0}).to_list(1000)
    user_names = {u['id']: u.get('name', 'Unknown') for u in team_users}
    
    for q in queries:
        assigned = q.get('assigned_to')
        if assigned:
            if assigned not in team_performance:
                team_performance[assigned] = {'name': user_names.get(assigned, 'Unknown'), 'total': 0, 'resolved': 0}
            team_performance[assigned]['total'] += 1
            if q.get('status') in ['resolved', 'closed']:
                team_performance[assigned]['resolved'] += 1
    
    # Calculate resolution rates for each team member
    team_stats = []
    for uid, data in team_performance.items():
        resolution_rate = round((data['resolved'] / data['total'] * 100) if data['total'] > 0 else 0, 1)
        team_stats.append({
            'user_id': uid,
            'name': data['name'],
            'total': data['total'],
            'resolved': data['resolved'],
            'resolution_rate': resolution_rate
        })
    team_stats.sort(key=lambda x: -x['resolved'])
    
    # Priority breakdown
    priority_counts = {'high': 0, 'medium': 0, 'low': 0}
    for q in queries:
        priority = (q.get('priority') or 'medium').lower()
        if priority in priority_counts:
            priority_counts[priority] += 1
        else:
            priority_counts['medium'] += 1
    
    # Source breakdown
    source_counts = {}
    for q in queries:
        source = q.get('source') or q.get('user_type') or 'Unknown'
        source_counts[source] = source_counts.get(source, 0) + 1
    
    return {
        "total_queries": len(queries),
        "resolved": status_counts['resolved'] + status_counts['closed'],
        "pending": status_counts['open'] + status_counts['in_progress'],
        "avg_resolution_time_hours": avg_resolution_time,
        "query_types": [{"name": k, "count": v} for k, v in sorted(query_types.items(), key=lambda x: -x[1])],
        "status_breakdown": [{"name": k, "count": v} for k, v in status_counts.items()],
        "priority_breakdown": [{"name": k, "count": v} for k, v in priority_counts.items()],
        "source_breakdown": [{"name": k, "count": v} for k, v in sorted(source_counts.items(), key=lambda x: -x[1])],
        "team_performance": team_stats[:10],
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }

# Include router and middleware
app.include_router(api_router)

# Note: Static files mount removed - files are now served from MongoDB via /api/files/{filename}
# For backward compatibility, /api/uploads/{filename} redirects to /api/files/{filename}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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

scheduler = AsyncIOScheduler()

async def scheduled_payment_sync():
    """Background task to sync all pending payments with Cashfree"""
    if not CASHFREE_APP_ID or not CASHFREE_SECRET_KEY:
        logging.warning("[SCHEDULER] Payment sync skipped - Cashfree credentials not configured")
        return
    
    logging.info("[SCHEDULER] Starting automated payment sync...")
    
    results = {
        "student_payments": {"checked": 0, "updated": 0, "errors": 0},
        "school_payments": {"checked": 0, "updated": 0, "errors": 0}
    }
    
    try:
        # Sync student payments
        pending_student_payments = await db.student_payments.find(
            {"status": {"$nin": ["PAID", "CANCELLED", "EXPIRED"]}},
            {"_id": 0}
        ).to_list(500)
        
        for payment in pending_student_payments:
            order_id = payment.get("id")
            old_status = payment.get("status")
            results["student_payments"]["checked"] += 1
            
            try:
                api_response = get_cashfree_client().PGFetchOrder(
                    CASHFREE_API_VERSION,
                    order_id,
                    None
                )
                
                if api_response.data:
                    new_status = api_response.data.order_status
                    
                    if new_status != old_status:
                        cf_payment_id = None
                        payment_method = "Cashfree"
                        try:
                            payments_response = get_cashfree_client().PGOrderFetchPayments(
                                CASHFREE_API_VERSION, order_id, None
                            )
                            if payments_response.data and len(payments_response.data) > 0:
                                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                        except Exception:
                            pass
                        
                        update_data = {
                            "status": new_status,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                            "sync_source": "scheduler"
                        }
                        if cf_payment_id:
                            update_data["transaction_id"] = cf_payment_id
                            update_data["cf_payment_id"] = cf_payment_id
                            update_data["payment_method"] = payment_method
                        if new_status == "PAID":
                            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                        
                        await db.student_payments.update_one({"id": order_id}, {"$set": update_data})
                        
                        # Update student if PAID
                        if new_status == "PAID":
                            student_id = payment.get("student_id")
                            if student_id:
                                student_update = {
                                    "status": "converted",
                                    "payment_status": "paid",
                                    "payment_amount": payment.get("amount"),
                                    "payment_date": datetime.now(timezone.utc).isoformat(),
                                    "pending_payment": None,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }
                                if cf_payment_id:
                                    student_update["payment_transaction_id"] = cf_payment_id
                                    student_update["payment_method"] = payment_method
                                await db.student_inquiries.update_one({"id": student_id}, {"$set": student_update})
                        
                        results["student_payments"]["updated"] += 1
                        logging.info(f"[SCHEDULER] Student payment {order_id}: {old_status} -> {new_status}")
                        
            except Exception as e:
                results["student_payments"]["errors"] += 1
                logging.error(f"[SCHEDULER] Error syncing student payment {order_id}: {e}")
        
        # Sync school student payments (batch of 100 at a time)
        pending_school_payments = await db.school_student_payments.find(
            {"status": {"$nin": ["PAID", "CANCELLED", "EXPIRED"]}},
            {"_id": 0}
        ).to_list(100)
        
        for payment in pending_school_payments:
            order_id = payment.get("id")
            old_status = payment.get("status")
            results["school_payments"]["checked"] += 1
            
            try:
                api_response = get_cashfree_client().PGFetchOrder(
                    CASHFREE_API_VERSION,
                    order_id,
                    None
                )
                
                if api_response.data:
                    new_status = api_response.data.order_status
                    
                    if new_status != old_status:
                        cf_payment_id = None
                        payment_method = "Cashfree"
                        try:
                            payments_response = get_cashfree_client().PGOrderFetchPayments(
                                CASHFREE_API_VERSION, order_id, None
                            )
                            if payments_response.data and len(payments_response.data) > 0:
                                cf_payment_id = str(payments_response.data[0].cf_payment_id)
                                payment_method = f"Cashfree - {payments_response.data[0].payment_group or 'unknown'}"
                        except Exception:
                            pass
                        
                        update_data = {
                            "status": new_status,
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                            "sync_source": "scheduler"
                        }
                        if cf_payment_id:
                            update_data["transaction_id"] = cf_payment_id
                            update_data["cf_payment_id"] = cf_payment_id
                            update_data["payment_method"] = payment_method
                        if new_status == "PAID":
                            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                        
                        await db.school_student_payments.update_one({"id": order_id}, {"$set": update_data})
                        
                        results["school_payments"]["updated"] += 1
                        logging.info(f"[SCHEDULER] School payment {order_id}: {old_status} -> {new_status}")
                        
            except Exception as e:
                results["school_payments"]["errors"] += 1
                logging.error(f"[SCHEDULER] Error syncing school payment {order_id}: {e}")
        
        # Log summary
        total_checked = results["student_payments"]["checked"] + results["school_payments"]["checked"]
        total_updated = results["student_payments"]["updated"] + results["school_payments"]["updated"]
        total_errors = results["student_payments"]["errors"] + results["school_payments"]["errors"]
        
        logging.info(f"[SCHEDULER] Payment sync complete - Checked: {total_checked}, Updated: {total_updated}, Errors: {total_errors}")
        
    except Exception as e:
        logging.error(f"[SCHEDULER] Payment sync failed: {e}")


@app.on_event("startup")
async def startup_db_client():
    """Create database indexes on startup and start background scheduler"""
    try:
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
    
    # Start the payment sync scheduler
    if PAYMENT_SYNC_ENABLED and CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
        scheduler.add_job(
            scheduled_payment_sync,
            trigger=IntervalTrigger(minutes=PAYMENT_SYNC_INTERVAL_MINUTES),
            id="payment_sync_job",
            name="Automated Payment Sync",
            replace_existing=True
        )
        scheduler.start()
        print(f"[STARTUP] Payment sync scheduler started - runs every {PAYMENT_SYNC_INTERVAL_MINUTES} minutes")
    else:
        if not PAYMENT_SYNC_ENABLED:
            print("[STARTUP] Payment sync scheduler disabled via PAYMENT_SYNC_ENABLED=false")
        else:
            print("[STARTUP] Payment sync scheduler not started - Cashfree credentials missing")

@app.on_event("shutdown")
async def shutdown_db_client():
    # Stop the scheduler if running
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[SHUTDOWN] Payment sync scheduler stopped")
    client.close()
