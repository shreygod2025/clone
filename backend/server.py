from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
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

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'oll-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

app = FastAPI(title="OLL Platform API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

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
    "ticket_assigned": "Support Ticket Assignment",
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
            "userName": user_name,
            "templateParams": params or [],
            "source": "OLL Platform",
            "media": {},
            "buttons": [],
            "carouselCards": [],
            "location": {},
            "attributes": {}
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
    feedback_url = f"https://oll-skill-edu.preview.emergentagent.com/feedback/{inquiry.get('id', '')}"
    
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
# EMAIL NOTIFICATION SYSTEM (Resend)
# ========================

# Initialize Resend
resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

# Email Templates for Educators
EMAIL_TEMPLATES = {
    "application_received": {
        "subject": "Application Received - Welcome to OLL!",
        "template": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">One Life Learning</p>
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
                <p>© 2026 OLL - One Life Learning. All rights reserved.</p>
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
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">One Life Learning</p>
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
                <p>© 2026 OLL - One Life Learning. All rights reserved.</p>
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
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">One Life Learning</p>
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
                <p>© 2026 OLL - One Life Learning. All rights reserved.</p>
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
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">One Life Learning</p>
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
                <p>© 2026 OLL - One Life Learning. All rights reserved.</p>
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
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">One Life Learning</p>
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
                <p>© 2026 OLL - One Life Learning. All rights reserved.</p>
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
                <p style="color: #e0e0e0; margin: 10px 0 0 0;">One Life Learning</p>
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
                <p>© 2026 OLL - One Life Learning. All rights reserved.</p>
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
    if not resend.api_key:
        print("Email notification skipped - Resend API key not configured")
        return {"success": False, "message": "API key not configured"}
    
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
        
        params = {
            "from": SENDER_EMAIL,
            "to": [recipient_email],
            "subject": subject,
            "html": html_content
        }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        
        print(f"Email [{template_key}] sent to {recipient_email}")
        return {"success": True, "message": "Email sent", "email_id": email_response.get("id")}
        
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
    username: str  # unique, used for /add/{username}
    password_hash: str = ""
    role: str = "team_member"
    role_id: str = ""  # Reference to roles collection
    is_active: bool = True
    permissions: List[str] = []  # ['students', 'schools', 'educators', 'growth_partners']
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    username: str
    role_id: str = ""
    permissions: List[str] = []

class TeamUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    role_id: Optional[str] = None
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
    message: str = ""
    status: str = "new"  # new, contacted, interview_scheduled, interviewed, hired, rejected, archived
    comments: List[dict] = []
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
    message: str = ""
    source: str = "about_page"

class TeamApplicationUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

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
    conversion_amount: Optional[str] = None
    source: str = "website"
    added_by: str = ""
    assigned_to: str = ""
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
    programs_interested: List[str] = []
    support_needed: List[str] = []
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_type: str = "offline"
    source: str = "website"
    added_by: str = ""
    assigned_to: str = ""
    notes: str = ""

class SchoolInquiryUpdate(BaseModel):
    status: Optional[str] = None
    school_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_type: Optional[str] = None
    followup_date: Optional[str] = None
    followup_comment: Optional[str] = None
    conversion_amount: Optional[str] = None
    assigned_to: Optional[str] = None

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
    status: str = "new"  # new, demo_scheduled, demo_completed, onboarded, archived
    notes: str = ""
    comments: List[dict] = []
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
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
    cover_image: str
    category: str  # students, parents, educators, schools
    author: str
    is_published: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogCreate(BaseModel):
    title: str
    slug: str
    excerpt: str
    content: str
    cover_image: str
    category: str
    author: str
    is_published: bool = False

class BlogUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    cover_image: Optional[str] = None
    category: Optional[str] = None
    is_published: Optional[bool] = None

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
otp_store = {}

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
        username=data.username,
        password_hash=bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        role_id=data.role_id,
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
    """Update a role"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update roles")
    
    update_data = {k: v for k, v in data.items() if v is not None and k not in ["id", "created_at"]}
    
    if update_data:
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
    
    # Generate random 4-digit OTP
    otp = str(random.randint(1000, 9999))
    
    # Store OTP
    otp_store[data.phone] = {
        "otp": otp,
        "user_type": data.user_type,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    
    # AiSensy WhatsApp API Integration
    AISENSY_API_KEY = os.environ.get("AISENSY_API_KEY", "")
    AISENSY_CAMPAIGN_NAME = os.environ.get("AISENSY_CAMPAIGN_NAME", "otpollsite")
    
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
            "campaignName": AISENSY_CAMPAIGN_NAME,
            "destination": phone_number,
            "userName": "OLL User",
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
    stored = otp_store.get(data.phone)
    
    # Test OTP for development/testing (not shown in frontend)
    TEST_OTP = "1111"
    
    # Check if using test OTP
    if data.otp == TEST_OTP:
        # Clear any stored OTP
        if stored and data.phone in otp_store:
            del otp_store[data.phone]
        # Continue to user lookup
    elif not stored:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Please request a new one.")
    elif stored["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    elif datetime.now(timezone.utc) > stored["expires"]:
        del otp_store[data.phone]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    else:
        # Valid OTP - clear it
        del otp_store[data.phone]
    
    # Find or create user based on phone and type
    collection_map = {
        "student": "student_inquiries",
        "educator": "educator_applications", 
        "school": "school_inquiries"
    }
    collection = collection_map.get(data.user_type, "student_inquiries")
    
    # Find user's bookings/applications
    user_data = await db[collection].find_one({"phone": data.phone}, {"_id": 0})
    
    # Get all bookings for this phone
    bookings = await db[collection].find({"phone": data.phone}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
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
    
    # Generate meeting link for the booking
    inquiry.meeting_link = generate_meeting_link(inquiry.id)
    
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.student_inquiries.insert_one(doc)
    
    # Send WhatsApp confirmation notifications
    if data.demo_date and data.demo_time:
        await send_demo_confirmation_notifications(doc, educator_data)
    
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
    doc = partner.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.growth_partners.insert_one(doc)
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
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.growth_partners.update_one({"id": partner_id}, {"$set": update_data})
    partner = await db.growth_partners.find_one({"id": partner_id}, {"_id": 0})
    return partner

# ========================
# TEAM APPLICATION ENDPOINTS
# ========================

@api_router.post("/team-applications", response_model=TeamApplication)
async def create_team_application(data: TeamApplicationCreate):
    application = TeamApplication(**data.model_dump())
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
# SCHOOL INQUIRY ENDPOINTS
# ========================

@api_router.post("/schools/inquiry", response_model=SchoolInquiry)
async def create_school_inquiry(data: SchoolInquiryCreate):
    inquiry = SchoolInquiry(**data.model_dump())
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.school_inquiries.insert_one(doc)
    return inquiry

@api_router.get("/schools/inquiries", response_model=List[SchoolInquiry])
async def get_school_inquiries(
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
    
    inquiries = await db.school_inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for inq in inquiries:
        if isinstance(inq.get('created_at'), str):
            inq['created_at'] = datetime.fromisoformat(inq['created_at'])
        if isinstance(inq.get('updated_at'), str):
            inq['updated_at'] = datetime.fromisoformat(inq['updated_at'])
    return inquiries

@api_router.patch("/schools/inquiry/{inquiry_id}", response_model=SchoolInquiry)
async def update_school_inquiry(
    inquiry_id: str, 
    data: SchoolInquiryUpdate,
    user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.school_inquiries.update_one({"id": inquiry_id}, {"$set": update_data})
    inquiry = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if isinstance(inquiry.get('created_at'), str):
        inquiry['created_at'] = datetime.fromisoformat(inquiry['created_at'])
    if isinstance(inquiry.get('updated_at'), str):
        inquiry['updated_at'] = datetime.fromisoformat(inquiry['updated_at'])
    return inquiry

# ========================
# EDUCATOR ENDPOINTS
# ========================

@api_router.post("/educators/apply", response_model=EducatorApplication)
async def create_educator_application(data: EducatorApplicationCreate):
    application = EducatorApplication(**data.model_dump())
    
    # If demo_date is provided, set status to demo_scheduled
    if data.demo_date:
        application.status = "demo_scheduled"
    
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
    # Test OTP for development
    TEST_OTP = "1111"
    
    stored = otp_store.get(data.phone)
    
    # Verify OTP
    if not stored:
        if data.otp != TEST_OTP:
            raise HTTPException(status_code=400, detail="OTP expired or not found")
    elif stored["otp"] != data.otp and data.otp != TEST_OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Clear OTP
    if stored and data.phone in otp_store:
        del otp_store[data.phone]
    
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
            "progress": len(onb.get("completed_steps", [])) / 8 * 100 if onb else 0
        })
    
    return result

# ========================
# EDUCATOR PORTAL ENDPOINTS
# ========================

@api_router.post("/educator/login")
async def educator_login(data: OTPVerify):
    """Login for educators (both onboarded and applicants) using phone + OTP"""
    # Test OTP for development/testing
    TEST_OTP = "1111"
    
    stored = otp_store.get(data.phone)
    
    # Verify OTP
    if not stored:
        if data.otp != TEST_OTP:
            raise HTTPException(status_code=400, detail="OTP expired or not found")
    elif stored["otp"] != data.otp and data.otp != TEST_OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    elif datetime.now(timezone.utc) > stored["expires"] and data.otp != TEST_OTP:
        del otp_store[data.phone]
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Clear OTP if stored
    if stored and data.phone in otp_store:
        del otp_store[data.phone]
    
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

@api_router.post("/requirements", response_model=OpenRequirement)
async def create_requirement(data: OpenRequirementCreate, user: dict = Depends(get_current_user)):
    requirement = OpenRequirement(**data.model_dump())
    doc = requirement.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.open_requirements.insert_one(doc)
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
# TEAM APPLICATIONS & REQUIREMENTS
# ========================

class TeamApplication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    role: str
    experience: str = ""
    city: str = ""
    availability: str = ""
    linkedin: str = ""
    portfolio: str = ""
    message: str = ""
    source: str = "website"
    status: str = "new"  # new, contacted, interviewing, hired, rejected
    notes: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

@api_router.post("/team-applications")
async def create_team_application(data: dict):
    """Submit a team application"""
    application = TeamApplication(
        name=data.get("name", ""),
        email=data.get("email", ""),
        phone=data.get("phone", ""),
        role=data.get("role", ""),
        experience=data.get("experience", ""),
        city=data.get("city", ""),
        availability=data.get("availability", ""),
        linkedin=data.get("linkedin", ""),
        portfolio=data.get("portfolio", ""),
        message=data.get("message", ""),
        source=data.get("source", "website")
    )
    
    doc = application.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.team_applications.insert_one(doc)
    
    return {"message": "Application submitted successfully", "id": application.id}

@api_router.get("/team-applications")
async def get_team_applications(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all team applications (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    applications = await db.team_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return applications

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
            "skills": ["Robotics", "Coding", "AI & ML", "Entrepreneurship", "Financial Literacy"],
            "grades": ["Pre-primary", "Primary (1-5)", "Middle (6-8)", "High School (9-10)", "Senior (11-12)"],
            "availability_options": ["Weekday Mornings", "Weekday Afternoons", "Weekday Evenings", "Weekends"],
            "experience_options": ["0-1 years", "1-3 years", "3-5 years", "5+ years"],
            "required_fields": ["name", "email", "phone", "skills"],
            "optional_fields": ["experience", "grades_comfortable", "city", "availability"]
        }
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
async def get_blogs(category: Optional[str] = None, published_only: bool = True):
    query = {}
    if published_only:
        query["is_published"] = True
    if category:
        query["category"] = category
    blogs = await db.blogs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for blog in blogs:
        if isinstance(blog.get('created_at'), str):
            blog['created_at'] = datetime.fromisoformat(blog['created_at'])
        if isinstance(blog.get('updated_at'), str):
            blog['updated_at'] = datetime.fromisoformat(blog['updated_at'])
    return blogs

@api_router.get("/blogs/{slug}", response_model=Blog)
async def get_blog(slug: str):
    blog = await db.blogs.find_one({"slug": slug}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if isinstance(blog.get('created_at'), str):
        blog['created_at'] = datetime.fromisoformat(blog['created_at'])
    if isinstance(blog.get('updated_at'), str):
        blog['updated_at'] = datetime.fromisoformat(blog['updated_at'])
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

@api_router.get("/support/queries")
async def get_support_queries(user: dict = Depends(get_current_user)):
    """Get all support queries for admin"""
    queries = await db.support_queries.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return queries

@api_router.patch("/support/queries/{query_id}")
async def update_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update support query status"""
    await db.support_queries.update_one(
        {"id": query_id},
        {"$set": {
            "status": data.get("status", "in_progress"),
            "admin_notes": data.get("admin_notes", ""),
            "resolved_by": user.get("name", "Admin"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Query updated"}

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
    """Get support queries - filters by assigned_to for non-admin users"""
    query = {}
    if status:
        query["status"] = status
    
    # If my_tickets is true or user is not admin, filter by assigned_to
    user_role = user.get("role", "")
    if my_tickets or (user_role not in ["admin", "super_admin"]):
        # For center users, team users, etc. - only show their assigned tickets
        user_id = user.get("id") or user.get("email")
        query["assigned_to"] = user_id
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
    await db.support_queries.update_one({"id": query_id}, {"$set": update_data})
    return {"message": "Query updated successfully"}

@api_router.post("/support/queries/{query_id}/assign")
async def assign_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Assign a support query to a user with deadline and send notifications"""
    assigned_to = data.get("assigned_to")
    deadline = data.get("deadline")  # ISO format datetime string
    
    if not assigned_to:
        raise HTTPException(status_code=400, detail="assigned_to is required")
    
    # Get the query
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Get the user being assigned
    assignee = await db.team_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.center_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.admins.find_one({"id": assigned_to}, {"_id": 0})
    
    # Update the query with assignment
    update_data = {
        "assigned_to": assigned_to,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "assigned_by": user.get("email", "admin"),
        "deadline": deadline,
        "status": "in_progress" if query.get("status") == "open" else query.get("status")
    }
    await db.support_queries.update_one({"id": query_id}, {"$set": update_data})
    
    # Send notifications to the assignee
    if assignee:
        assignee_name = assignee.get("name", "Team Member")
        assignee_phone = assignee.get("phone", "")
        assignee_email = assignee.get("email", "")
        
        query_type = query.get("query_type", query.get("type", "Support Request"))
        query_details = query.get("message", query.get("query", ""))[:100]
        deadline_str = deadline if deadline else "As soon as possible"
        
        # Send WhatsApp notification
        if assignee_phone:
            try:
                await send_whatsapp_message(
                    assignee_phone,
                    "ticket_assigned",
                    params=[assignee_name, query_type, query_details, deadline_str]
                )
            except Exception as e:
                print(f"Failed to send WhatsApp: {e}")
        
        # Send Email notification
        if assignee_email:
            try:
                await send_email(
                    to_email=assignee_email,
                    subject=f"New Support Ticket Assigned - {query_type}",
                    template_name="ticket_assigned",
                    context={
                        "assignee_name": assignee_name,
                        "query_type": query_type,
                        "query_details": query_details,
                        "deadline": deadline_str,
                        "customer_name": query.get("name", "Customer"),
                        "customer_phone": query.get("phone", "N/A")
                    }
                )
            except Exception as e:
                print(f"Failed to send email: {e}")
    
    return {"message": "Query assigned successfully", "assigned_to": assigned_to}

@api_router.get("/support/school-queries")
async def get_school_support_queries(user: dict = Depends(get_current_user)):
    queries = await db.school_support_queries.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return queries

@api_router.get("/support/tickets", response_model=List[SupportTicket])
async def get_support_tickets(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for ticket in tickets:
        if isinstance(ticket.get('created_at'), str):
            ticket['created_at'] = datetime.fromisoformat(ticket['created_at'])
    return tickets

@api_router.patch("/support/tickets/{ticket_id}")
async def update_support_ticket(ticket_id: str, status: str, user: dict = Depends(get_current_user)):
    await db.support_tickets.update_one({"id": ticket_id}, {"$set": {"status": status}})
    return {"message": "Updated successfully"}

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
async def get_cities():
    cities = await db.cities.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return cities

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
    name: str
    phone: str
    email: str
    query_type: str  # demo_related, payment, course_info, technical, partnership, feedback, other
    query_details: str = ""
    source: str = "team_inquiry_form"
    status: str = "open"  # open, in_progress, resolved, closed
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

# ========================
# HEALTH CHECK
# ========================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# File Upload Endpoint
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), type: str = "general"):
    """Upload a file (resume, document, etc.)"""
    allowed_extensions = {'.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Check file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    # Generate unique filename
    unique_filename = f"{type}_{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Return URL (relative path that will be served by static files)
    base_url = os.environ.get('BASE_URL', '')
    file_url = f"{base_url}/api/uploads/{unique_filename}"
    
    return {"url": file_url, "filename": unique_filename}

# Include router and middleware
app.include_router(api_router)

# Mount static files for uploads
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
