"""
Educator routes: Applications, Onboarding, Requirements, FAQs, Blogs, Case Studies.
"""
import os
import uuid
import asyncio
import httpx
import io
import csv
import base64
import re
import json
import logging
from io import BytesIO
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator, EmailStr

from .shared import (
    db, get_current_user, hash_password, verify_password, create_access_token,
    auto_assign_educator, auto_assign_lead, generate_meeting_link, get_relationship_managers,
    ensure_resend_api_key, EMAIL_TEMPLATES, send_educator_email, SENDER_EMAIL,
    get_next_ticket_number
)
from .notifications import send_whatsapp_notification, send_demo_confirmation_notifications

# OTP types needed by educator routes
from database import otp_store_new, otp_verify, otp_send_allowed

# Local in-memory blog/content cache (self-contained in this module)
_blog_cache: dict = {}

def get_cached(key: str):
    return _blog_cache.get(key)

def set_cached(key: str, value, ttl: int = 300):
    _blog_cache[key] = value
    return value

def clear_cache(prefix: str = None):
    if prefix:
        for k in [k for k in list(_blog_cache.keys()) if k.startswith(prefix)]:
            _blog_cache.pop(k, None)
    else:
        _blog_cache.clear()

# OTPVerify model (shared with users.py)
class OTPVerify(BaseModel):
    phone: str
    otp: str

router = APIRouter()

# ── Models ─────────────────────────────────────────────────────────────────────

# Support ticket models (used in some educator-related endpoints)
class SupportTicket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    user_type: str
    subject: str
    message: str
    status: str = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupportTicketCreate(BaseModel):
    name: str
    email: EmailStr
    user_type: str
    subject: str
    message: str
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
    email: Optional[str] = ""   # Optional — EmailStr was too strict, empty email is valid for applications
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

# ── Email helper functions ─────────────────────────────────────────────────────
async def send_educator_application_received_email(doc: dict):
    email = doc.get("email", "")
    if not email:
        return
    skills = doc.get("skills", [])
    await send_educator_email(email, "application_received", {
        "name": doc.get("name", ""),
        "skills": ", ".join(skills) if isinstance(skills, list) else str(skills),
        "experience": doc.get("experience", ""),
        "city": doc.get("city", ""),
    })

async def send_educator_demo_scheduled_email(doc: dict):
    email = doc.get("email", "")
    if not email:
        return
    await send_educator_email(email, "demo_scheduled", {
        "name": doc.get("name", ""),
        "demo_date": doc.get("demo_date", ""),
        "demo_time": doc.get("demo_time", ""),
        "meeting_link": doc.get("meeting_link", ""),
    })

async def send_educator_demo_reminder_email(doc: dict):
    email = doc.get("email", "")
    if not email:
        return
    await send_educator_email(email, "demo_reminder", {
        "name": doc.get("name", ""),
        "demo_date": doc.get("demo_date", ""),
        "demo_time": doc.get("demo_time", ""),
        "meeting_link": doc.get("meeting_link", ""),
    })

async def send_educator_demo_completed_email(doc: dict):
    email = doc.get("email", "")
    if not email:
        return
    await send_educator_email(email, "demo_completed", {
        "name": doc.get("name", ""),
    })

async def send_educator_onboarded_email(doc: dict):
    email = doc.get("email", "")
    if not email:
        return
    await send_educator_email(email, "onboarded", {
        "name": doc.get("name", ""),
    })

async def send_educator_rejected_email(doc: dict):
    email = doc.get("email", "")
    if not email:
        return
    await send_educator_email(email, "rejected", {
        "name": doc.get("name", ""),
    })

# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/educators/apply", response_model=EducatorApplication)
async def create_educator_application(data: EducatorApplicationCreate, background_tasks: BackgroundTasks):
    # ── Deduplication: same phone OR email already exists (non-archived) ───
    phone_norm = (data.phone or "").strip()
    email_norm = (data.email or "").strip().lower()
    query_filters = []
    if phone_norm:
        query_filters.append({"phone": phone_norm})
    if email_norm and "@educator.oll" not in email_norm:
        query_filters.append({"email": email_norm})
    if query_filters:
        existing = await db.educator_applications.find_one(
            {"$and": [
                {"$or": query_filters},
                {"status": {"$nin": ["archived", "rejected"]}},
            ]},
            {"_id": 0}
        )
        if existing:
            # Re-application: update existing record with fresh data instead of returning stale info
            update_fields = {
                "name": data.name or existing.get("name", ""),
                "email": email_norm or existing.get("email", ""),
                "skills": data.skills or existing.get("skills", []),
                "experience": data.experience or existing.get("experience", ""),
                "grades_comfortable": data.grades_comfortable or existing.get("grades_comfortable", []),
                "city": data.city or existing.get("city", ""),
                "teaching_mode": data.teaching_mode or existing.get("teaching_mode", ""),
                "availability": data.availability or existing.get("availability", ""),
                "notes": data.notes or existing.get("notes", ""),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            if data.demo_date:
                update_fields["demo_date"] = data.demo_date
                update_fields["demo_time"] = data.demo_time
                update_fields["status"] = "demo_scheduled"
                update_fields["meeting_link"] = generate_meeting_link(existing["id"])
            await db.educator_applications.update_one(
                {"id": existing["id"]},
                {"$set": update_fields}
            )
            updated = await db.educator_applications.find_one({"id": existing["id"]}, {"_id": 0})
            logging.info(f"[Educators] Re-application updated for phone={phone_norm}, id={existing['id']}")
            if isinstance(updated.get('created_at'), str):
                updated['created_at'] = datetime.fromisoformat(updated['created_at'])
            if isinstance(updated.get('updated_at'), str):
                updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
            return EducatorApplication(**updated)
    # ────────────────────────────────────────────────────────────────────────

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
    
    # Fire email in background — don't block response
    background_tasks.add_task(send_educator_application_received_email, doc)
    
    return application

# Educator application with OTP verification
class EducatorApplyWithOTP(BaseModel):
    phone: str
    otp: str
    application_data: EducatorApplicationCreate

@router.post("/educators/apply-verified")
async def create_educator_application_verified(data: EducatorApplyWithOTP, background_tasks: BackgroundTasks):
    """Create educator application with OTP verification. Re-application updates existing record."""
    success, error_msg = await otp_verify(data.phone, data.otp)
    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    phone_norm = data.phone.strip()
    email_norm = (data.application_data.email or "").strip().lower()

    # Build the new application fields
    app_data = data.application_data.model_dump()
    app_data['phone'] = phone_norm
    application = EducatorApplication(**app_data)
    if data.application_data.demo_date:
        application.status = "demo_scheduled"
    meeting_link = generate_meeting_link(application.id)

    # ── Check if already exists (non-archived/rejected) ──────────────────────
    query_filters = [{"phone": phone_norm}]
    if email_norm and "@educator.oll" not in email_norm:
        query_filters.append({"email": email_norm})
    existing = await db.educator_applications.find_one(
        {"$and": [
            {"$or": query_filters},
            {"status": {"$nin": ["archived", "rejected"]}},
        ]},
        {"_id": 0}
    )

    if existing:
        # Re-application: update the existing record with fresh details
        update_fields = {
            "name": application.name or existing.get("name", ""),
            "email": application.email or existing.get("email", ""),
            "skills": application.skills or existing.get("skills", []),
            "experience": application.experience or existing.get("experience", ""),
            "grades_comfortable": application.grades_comfortable or existing.get("grades_comfortable", []),
            "city": application.city or existing.get("city", ""),
            "teaching_mode": application.teaching_mode or existing.get("teaching_mode", ""),
            "availability": application.availability or existing.get("availability", ""),
            "notes": application.notes or existing.get("notes", ""),
            "phone_verified": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        # Only update demo date if a new one was actually selected
        if data.application_data.demo_date:
            update_fields["demo_date"] = application.demo_date
            update_fields["demo_time"] = application.demo_time
            update_fields["status"] = "demo_scheduled"
            # Generate a fresh meeting link for the new demo
            new_link = generate_meeting_link(existing["id"])
            update_fields["meeting_link"] = new_link
            meeting_link = new_link

        await db.educator_applications.update_one(
            {"id": existing["id"]},
            {"$set": update_fields}
        )
        logging.info(f"[Educators-OTP] Re-application updated for phone={phone_norm}, id={existing['id']}")
        return {
            "success": True,
            "message": "Application updated successfully",
            "application": {
                "id": existing["id"],
                "name": update_fields.get("name", existing.get("name")),
                "status": update_fields.get("status", existing.get("status")),
                "demo_date": update_fields.get("demo_date", existing.get("demo_date")),
                "demo_time": update_fields.get("demo_time", existing.get("demo_time")),
                "meeting_link": meeting_link,
            }
        }
    # ─────────────────────────────────────────────────────────────────────────

    doc = application.model_dump()
    doc['meeting_link'] = meeting_link
    doc['phone_verified'] = True
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()

    try:
        await db.educator_applications.insert_one(doc)
    except Exception as e:
        # Handle race condition: another concurrent request may have just inserted
        if "duplicate" in str(e).lower() or "E11000" in str(e):
            existing_after = await db.educator_applications.find_one({"phone": phone_norm}, {"_id": 0})
            if existing_after:
                logging.info(f"[Educators-OTP] Race condition handled for {phone_norm}")
                return {
                    "success": True,
                    "message": "Application submitted successfully",
                    "application": {
                        "id": existing_after["id"],
                        "name": existing_after.get("name"),
                        "status": existing_after.get("status"),
                        "demo_date": existing_after.get("demo_date"),
                        "demo_time": existing_after.get("demo_time"),
                        "meeting_link": existing_after.get("meeting_link"),
                    }
                }
        raise HTTPException(status_code=500, detail="Failed to save application. Please try again.")

    background_tasks.add_task(send_educator_application_received_email, doc)

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

@router.get("/educators/applications", response_model=List[EducatorApplication])
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

@router.patch("/educators/application/{app_id}", response_model=EducatorApplication)
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
    
    # If status is changing to 'active', copy onboarding data to educator profile
    new_status = data.status
    if new_status == "active" and old_status != "active":
        # Fetch onboarding data
        onboarding = await db.educator_onboarding.find_one({"educator_id": app_id}, {"_id": 0})
        if onboarding:
            # Copy profile fields from onboarding to educator application
            profile_fields = [
                'profile_photo', 'bio', 'tshirt_size', 
                'address_line1', 'address_line2', 'city', 'state', 'pincode',
                'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
                'aadhar_number', 'aadhar_document', 'pan_number', 'pan_document', 'id_verification_document',
                'bank_name', 'account_holder_name', 'account_number', 'ifsc_code', 'bank_document',
                'contract_accepted', 'contract_accepted_at', 'digital_signature',
                'id_card_generated', 'certificate_generated', 'documents_verified', 'documents_verified_at'
            ]
            for field in profile_fields:
                if onboarding.get(field):
                    update_data[field] = onboarding[field]
            
            # Mark onboarding as completed
            await db.educator_onboarding.update_one(
                {"educator_id": app_id},
                {"$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    await db.educator_applications.update_one({"id": app_id}, {"$set": update_data})
    application = await db.educator_applications.find_one({"id": app_id}, {"_id": 0})
    if isinstance(application.get('created_at'), str):
        application['created_at'] = datetime.fromisoformat(application['created_at'])
    if isinstance(application.get('updated_at'), str):
        application['updated_at'] = datetime.fromisoformat(application['updated_at'])
    
    # Send email notifications based on status changes
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
@router.post("/educators/{app_id}/send-reminder")
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
@router.post("/educators/{app_id}/send-email/{email_type}")
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

@router.get("/educator/onboarding/content")
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

@router.get("/educator/onboarding/{educator_id}")
async def get_educator_onboarding(educator_id: str):
    """Get onboarding progress for an educator"""
    onboarding = await db.educator_onboarding.find_one({"educator_id": educator_id}, {"_id": 0})
    
    if not onboarding:
        # Create new onboarding record for educators without one
        educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
        if not educator:
            raise HTTPException(status_code=404, detail="Educator not found")
        
        new_onboarding = EducatorOnboarding(educator_id=educator_id)
        doc = new_onboarding.model_dump()
        doc['started_at'] = doc['started_at'].isoformat()
        doc['last_activity'] = doc['last_activity'].isoformat()
        await db.educator_onboarding.insert_one(doc)
        doc.pop('_id', None)  # Remove MongoDB ObjectId before returning
        onboarding = doc
    
    # Get educator details
    educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
    
    return {
        "onboarding": onboarding,
        "educator": educator
    }

@router.patch("/educator/onboarding/{educator_id}")
async def update_educator_onboarding(educator_id: str, data: EducatorOnboardingUpdate):
    """Update onboarding progress"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None and v != "" and v != {}}
    update_data['last_activity'] = datetime.now(timezone.utc).isoformat()
    
    # Check if contract is being accepted
    if data.contract_accepted:
        update_data['contract_accepted_at'] = datetime.now(timezone.utc).isoformat()
    
    # Use upsert to create record if it doesn't exist
    result = await db.educator_onboarding.update_one(
        {"educator_id": educator_id}, 
        {
            "$set": update_data,
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "current_step": 1,
                "completed_steps": [],
                "started_at": datetime.now(timezone.utc).isoformat(),
                "status": "in_progress",
                "documents_verified": False,
                "welcome_video_watched": False,
                "video_progress": {},
                "video_uploads": {}
            }
        },
        upsert=True
    )
    
    # No need to re-set educator_id separately — it's already in $set via update_data context
    # (educator_id is the query field so MongoDB includes it in upserted document)
    
    onboarding = await db.educator_onboarding.find_one({"educator_id": educator_id}, {"_id": 0})
    return onboarding

@router.post("/educator/onboarding/{educator_id}/complete-step")
async def complete_onboarding_step(educator_id: str, data: dict):
    """Mark a step as completed and move to next"""
    step = data.get("step")
    
    onboarding = await db.educator_onboarding.find_one({"educator_id": educator_id}, {"_id": 0})
    if not onboarding:
        # Auto-create missing onboarding record
        educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
        if not educator:
            raise HTTPException(status_code=404, detail="Educator not found")
        new_onboarding = EducatorOnboarding(educator_id=educator_id)
        doc = new_onboarding.model_dump()
        doc['started_at'] = doc['started_at'].isoformat()
        doc['last_activity'] = doc['last_activity'].isoformat()
        await db.educator_onboarding.insert_one(doc)
        doc.pop('_id', None)
        onboarding = doc
    
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

@router.post("/educator/onboarding/{educator_id}/submit-quiz")
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

@router.post("/educator/onboarding/{educator_id}/submit-assessment")
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

@router.get("/educator/onboarding/{educator_id}/quiz")
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

@router.get("/educator/onboarding/{educator_id}/assessment")
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

@router.post("/educators/add-active")
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

@router.post("/educators/deduplicate")
async def deduplicate_educator_applications(user: dict = Depends(get_current_user)):
    """
    Scan all educator applications and merge duplicates that share the same phone number.
    Keeps the oldest (first submitted) record, deletes the rest.
    """
    all_apps = await db.educator_applications.find(
        {"status": {"$nin": ["archived", "rejected"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(10000)

    # Group by phone
    phone_map = {}
    for app in all_apps:
        phone = (app.get("phone") or "").strip()
        if not phone:
            continue
        if phone not in phone_map:
            phone_map[phone] = []
        phone_map[phone].append(app)

    deleted_count = 0
    merged_phones = []
    for phone, apps in phone_map.items():
        if len(apps) <= 1:
            continue
        # Keep the first (oldest), delete the rest
        keeper = apps[0]
        dupes = apps[1:]
        ids_to_delete = [d["id"] for d in dupes]
        await db.educator_applications.delete_many({"id": {"$in": ids_to_delete}})
        deleted_count += len(ids_to_delete)
        merged_phones.append({"phone": phone, "kept": keeper["id"], "deleted": len(ids_to_delete), "name": keeper.get("name", "")})
        logging.info(f"[Educators-Dedup] Deleted {len(ids_to_delete)} duplicates for phone {phone}, kept {keeper['id']}")

    return {
        "message": f"Removed {deleted_count} duplicate applications",
        "deleted": deleted_count,
        "affected_phones": merged_phones,
    }


@router.post("/educators/bulk-import")
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

# Branded asset URLs (OLL vertical logo and signature)
_OLL_LOGO_URL = "https://customer-assets.emergentagent.com/job_9d6a9928-5e77-45f3-ad7f-05d2ff27ef55/artifacts/8m4bz68i_OLL-vertical-logo--skills.png"
_SHREYAAN_SIGN_URL = "https://customer-assets.emergentagent.com/job_9d6a9928-5e77-45f3-ad7f-05d2ff27ef55/artifacts/3iqpdsgr_Shreyaan%20Sign.png"
_img_cache: dict = {}

def _fetch_image_bytes(url: str):
    """Download image bytes with in-memory cache. Returns None on failure."""
    if url in _img_cache:
        return _img_cache[url]
    try:
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        if resp.status_code == 200:
            _img_cache[url] = resp.content
            return resp.content
    except Exception:
        pass
    return None

def _make_circular_png(img_bytes: bytes) -> BytesIO:
    """Apply circular mask to image bytes and return PNG BytesIO."""
    try:
        from PIL import Image, ImageDraw
        img = Image.open(BytesIO(img_bytes)).convert("RGBA")
        s = min(img.size)
        img = img.crop(((img.width - s) // 2, (img.height - s) // 2,
                        (img.width + s) // 2, (img.height + s) // 2))
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, s, s), fill=255)
        result = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        result.paste(img, mask=mask)
        out = BytesIO()
        result.save(out, format='PNG')
        out.seek(0)
        return out
    except Exception:
        return None

def generate_id_card_pdf(educator_data, onboarding_data) -> BytesIO:
    """Generate branded ID Card PDF with OLL logo and educator profile photo."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import inch, cm
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.pdfgen import canvas
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.utils import ImageReader
    import qrcode
    from PIL import Image

    buffer = BytesIO()
    width, height = 400, 550
    c = canvas.Canvas(buffer, pagesize=(width, height))

    dark_blue = HexColor('#1E3A5F')
    red = HexColor('#D63031')

    # Background
    c.setFillColor(white)
    c.rect(0, 0, width, height, fill=1)

    # Left blue border
    c.setFillColor(dark_blue)
    c.rect(0, 0, 15, height, fill=1)

    # Bottom section
    c.setFillColor(dark_blue)
    c.rect(0, 0, width, 60, fill=1)

    # Red accent circle in bottom corner
    c.setFillColor(red)
    c.circle(30, 30, 15, fill=1)

    # OLL Logo (top right) — actual image
    logo_bytes = _fetch_image_bytes(_OLL_LOGO_URL)
    if logo_bytes:
        c.drawImage(ImageReader(BytesIO(logo_bytes)),
                    width - 90, height - 80,
                    width=65, height=60,
                    preserveAspectRatio=True, mask='auto')
    else:
        c.setFillColor(dark_blue)
        c.setFont("Helvetica-Bold", 28)
        c.drawRightString(width - 20, height - 50, "OLL")

    # Profile photo (circular)
    profile_url = educator_data.get('profile_photo') or (onboarding_data or {}).get('profile_photo')
    cx, cy, r = width / 2, height - 180, 70
    if profile_url:
        photo_bytes = _fetch_image_bytes(profile_url)
        if photo_bytes:
            circ_buf = _make_circular_png(photo_bytes)
            if circ_buf:
                c.drawImage(ImageReader(circ_buf), cx - r, cy - r,
                            width=r * 2, height=r * 2, mask='auto')
            else:
                _draw_id_photo_placeholder(c, cx, cy, r, dark_blue)
        else:
            _draw_id_photo_placeholder(c, cx, cy, r, dark_blue)
    else:
        _draw_id_photo_placeholder(c, cx, cy, r, dark_blue)

    # Name
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 22)
    name = educator_data.get('name', 'Educator Name')
    c.drawCentredString(width / 2, height - 280, name)

    # Role
    c.setFont("Helvetica", 16)
    c.setFillColor(red)
    c.drawCentredString(width / 2, height - 305, "OLL Educator")

    # Phone & ID
    c.setFillColor(white)
    c.setFont("Helvetica", 12)
    phone = educator_data.get('phone', '')
    c.drawString(25, 38, f"Phone: +91 {phone}")
    educator_id = educator_data.get('id', '')[:8].upper()
    c.drawString(25, 20, f"ID: {educator_id}")

    # QR Code
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(f"OLL-EDU-{educator_id}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_temp_path = UPLOAD_DIR / f"qr_temp_{educator_id}.png"
    qr_img.save(str(qr_temp_path))
    c.drawImage(str(qr_temp_path), width - 88, 2, width=65, height=65)
    try:
        os.remove(qr_temp_path)
    except Exception:
        pass

    c.save()
    buffer.seek(0)
    return buffer

def _draw_id_photo_placeholder(c, cx, cy, r, color):
    """Draw a placeholder circle when profile photo is unavailable."""
    c.setStrokeColor(color)
    c.setLineWidth(3)
    c.setFillColor(HexColor('#E8EEF5'))
    c.circle(cx, cy, r, stroke=1, fill=1)
    c.setFillColor(HexColor('#8899AA'))
    c.setFont("Helvetica", 9)
    c.drawCentredString(cx, cy - 4, "No Photo")

def generate_certificate_pdf(educator_data) -> BytesIO:
    """Generate branded Certificate of Completion PDF with OLL logo and signature."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.pdfgen import canvas
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.utils import ImageReader

    buffer = BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=(width, height))

    dark_blue = HexColor('#1E3A5F')
    red = HexColor('#D63031')

    # White background
    c.setFillColor(white)
    c.rect(0, 0, width, height, fill=1)

    # Decorative border
    c.setStrokeColor(dark_blue)
    c.setLineWidth(8)
    c.rect(30, 30, width - 60, height - 60, stroke=1, fill=0)
    c.setLineWidth(2)
    c.rect(40, 40, width - 80, height - 80, stroke=1, fill=0)

    # OLL Logo at top center — actual image
    logo_bytes = _fetch_image_bytes(_OLL_LOGO_URL)
    if logo_bytes:
        logo_w, logo_h = 90, 80
        c.drawImage(ImageReader(BytesIO(logo_bytes)),
                    (width - logo_w) / 2, height - 105,
                    width=logo_w, height=logo_h,
                    preserveAspectRatio=True, mask='auto')
    else:
        c.setFillColor(dark_blue)
        c.setFont("Helvetica-Bold", 36)
        c.drawCentredString(width / 2, height - 100, "OLL")

    # Certificate Title
    c.setFillColor(dark_blue)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(width / 2, height - 165, "CERTIFICATE OF COMPLETION")

    # Subtitle
    c.setFillColor(HexColor('#666666'))
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 195, "This is to certify that")

    # Recipient Name
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 40)
    name = educator_data.get('name', 'Educator Name')
    c.drawCentredString(width / 2, height - 255, name)

    # Role in Red
    c.setFillColor(red)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width / 2, height - 295, "OLL Educator")

    # Description
    c.setFillColor(black)
    c.setFont("Helvetica", 14)
    today = datetime.now().strftime("%d %B %Y")
    c.drawCentredString(width / 2, height - 335,
                        "Has successfully completed the OLL Educator Training Program")
    c.drawCentredString(width / 2, height - 360,
                        "and is hereby certified as an official OLL Educator.")

    # Date
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 395, f"Date: {today}")

    # Signature image (above the line)
    sign_bytes = _fetch_image_bytes(_SHREYAAN_SIGN_URL)
    sig_x = width - 280
    if sign_bytes:
        c.drawImage(ImageReader(BytesIO(sign_bytes)),
                    sig_x, 115,
                    width=140, height=65,
                    preserveAspectRatio=True, mask='auto')

    # Signature line
    c.setStrokeColor(black)
    c.setLineWidth(1)
    c.line(sig_x, 115, sig_x + 150, 115)

    # Signatory name + title
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(sig_x + 5, 100, "SHREYAAN DAGA")
    c.setFont("Helvetica", 12)
    c.drawString(sig_x + 5, 82, "Cofounder - OLL")

    c.save()
    buffer.seek(0)
    return buffer

@router.get("/educator/onboarding/{educator_id}/download-id-card")
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

@router.get("/educator/onboarding/{educator_id}/download-certificate")
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

@router.post("/educator/onboarding/{educator_id}/generate-certificate")
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
@router.post("/admin/educators/{educator_id}/verify-documents")
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
@router.post("/admin/educators/direct-onboard")
async def direct_onboard_educator(data: dict, user: dict = Depends(get_current_user)):
    """Admin adds educator directly to onboarding (skips selection process)"""
    if user.get("role") not in ["admin", "team_member"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Handle skills - convert from string if necessary
    skills = data.get("skills", [])
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(',') if s.strip()]
    
    # Create educator application with onboarding status
    educator = EducatorApplication(
        name=data.get("name", ""),
        email=data.get("email", ""),
        phone=data.get("phone", ""),
        skills=skills,
        city=data.get("city", ""),
        experience=data.get("experience", ""),
        status="onboarded",
        source="direct_onboard",
        added_by=user.get("id", ""),
        onboarding_date=datetime.now(timezone.utc).strftime("%Y-%m-%d")
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
@router.get("/admin/educators/onboarding-progress")
async def get_all_onboarding_progress(user: dict = Depends(get_current_user)):
    """Get onboarding progress for all educators that have an onboarding record"""
    # Get ALL onboarding records first
    onboarding_records = await db.educator_onboarding.find({}, {"_id": 0}).to_list(500)
    
    if not onboarding_records:
        return []
    
    educator_ids = [o["educator_id"] for o in onboarding_records]
    
    # Get matching educators (any status)
    educators = await db.educator_applications.find(
        {"id": {"$in": educator_ids}},
        {"_id": 0}
    ).to_list(500)
    
    educator_map = {e["id"]: e for e in educators}
    onboarding_map = {o["educator_id"]: o for o in onboarding_records}
    
    result = []
    for educator_id in educator_ids:
        educator = educator_map.get(educator_id)
        onb = onboarding_map.get(educator_id, {})
        if not educator:
            continue
        completed = onb.get("completed_steps", [])
        result.append({
            "educator": educator,
            "onboarding": onb,
            "progress": len(completed) / 7 * 100
        })
    
    return result

# ========================
# EDUCATOR PORTAL ENDPOINTS
# ========================

@router.post("/educator/login")
async def educator_login(data: OTPVerify):
    """Login for educators (both onboarded and applicants) using phone + OTP"""
    success, error_msg = await otp_verify(data.phone, data.otp)
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

@router.patch("/educator/reschedule-demo")
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

@router.post("/educator/submit-query")
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

@router.get("/educator/my-application")
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

@router.get("/educator/my-demos")
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

@router.get("/educator/demo-history")
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

@router.post("/educator/pass-demo/{inquiry_id}")
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

@router.get("/educator/available-educators")
async def get_available_educators(user: dict = Depends(get_current_user)):
    """Get list of other onboarded educators for passing demos"""
    current_educator_id = user.get("educator_id") or user.get("id")
    
    educators = await db.educator_applications.find({
        "status": "onboarded",
        "id": {"$ne": current_educator_id}
    }, {"_id": 0, "id": 1, "name": 1, "skills": 1, "city": 1}).to_list(50)
    
    return educators

@router.patch("/educator/toggle-availability")
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

@router.post("/educator/complete-demo/{inquiry_id}")
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

@router.post("/educator/incomplete-demo/{inquiry_id}")
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

@router.post("/educator/notify-not-joined/{inquiry_id}")
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

# ========================
# EDUCATOR PROFILE ENDPOINTS
# ========================

@router.get("/educator/profile")
async def get_educator_profile(user: dict = Depends(get_current_user)):
    """Get educator's complete profile including onboarding data"""
    educator_id = user.get("educator_id") or user.get("id")
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    # Get educator application with all fields
    educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
    if not educator:
        raise HTTPException(status_code=404, detail="Educator not found")
    
    # If educator is in onboarding/active and doesn't have profile data, check onboarding collection
    if educator.get("status") in ["onboarded", "onboarding"] and not educator.get("profile_photo"):
        onboarding = await db.educator_onboarding.find_one({"educator_id": educator_id}, {"_id": 0})
        if onboarding:
            # Merge onboarding data with educator data for response
            profile_fields = [
                'profile_photo', 'bio', 'tshirt_size', 
                'address_line1', 'address_line2', 'city', 'state', 'pincode',
                'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
                'aadhar_number', 'aadhar_document', 'pan_number', 'pan_document', 'id_verification_document',
                'bank_name', 'account_holder_name', 'account_number', 'ifsc_code', 'bank_document',
                'contract_accepted', 'contract_accepted_at', 'digital_signature'
            ]
            for field in profile_fields:
                if onboarding.get(field) and not educator.get(field):
                    educator[field] = onboarding[field]
    
    # Mask sensitive info for security (only show last 4 digits)
    if educator.get("account_number"):
        acc_num = educator["account_number"]
        educator["account_number_masked"] = f"****{acc_num[-4:]}" if len(acc_num) > 4 else "****"
    if educator.get("aadhar_number"):
        aadhar = educator["aadhar_number"]
        educator["aadhar_number_masked"] = f"****{aadhar[-4:]}" if len(aadhar) > 4 else "****"
    
    return educator

@router.patch("/educator/profile")
async def update_educator_profile(data: dict, user: dict = Depends(get_current_user)):
    """Update educator's profile - allows updating personal info, bio, address, etc."""
    educator_id = user.get("educator_id") or user.get("id")
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    # Fields that educators can update themselves
    allowed_fields = [
        'name', 'bio', 'profile_photo', 'tshirt_size',
        'address_line1', 'address_line2', 'city', 'state', 'pincode',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
        'skills', 'experience', 'grades_comfortable', 'teaching_mode', 'availability',
        'is_available'
    ]
    
    # Filter only allowed fields
    update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Update educator application
    result = await db.educator_applications.update_one(
        {"id": educator_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Educator not found or no changes made")
    
    # Also update onboarding record if exists
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {"$set": {k: v for k, v in update_data.items() if k in ['bio', 'profile_photo', 'tshirt_size', 
            'address_line1', 'address_line2', 'city', 'state', 'pincode',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation']}},
        upsert=False
    )
    
    # Return updated educator
    educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
    return {"success": True, "message": "Profile updated successfully", "educator": educator}

@router.patch("/educator/profile/bank-details")
async def update_educator_bank_details(data: dict, user: dict = Depends(get_current_user)):
    """Update educator's bank details - requires verification"""
    educator_id = user.get("educator_id") or user.get("id")
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    # Bank detail fields
    bank_fields = ['bank_name', 'account_holder_name', 'account_number', 'ifsc_code', 'bank_document']
    update_data = {k: v for k, v in data.items() if k in bank_fields and v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid bank fields to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    update_data['bank_details_updated_at'] = datetime.now(timezone.utc).isoformat()
    update_data['bank_details_verified'] = False  # Mark as unverified after update
    
    # Update educator application
    await db.educator_applications.update_one(
        {"id": educator_id},
        {"$set": update_data}
    )
    
    # Also update onboarding record if exists
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {"$set": update_data},
        upsert=False
    )
    
    return {"success": True, "message": "Bank details updated. They will be verified soon."}

@router.patch("/educator/profile/documents")
async def update_educator_documents(data: dict, user: dict = Depends(get_current_user)):
    """Update educator's documents (Aadhar, PAN, etc.)"""
    educator_id = user.get("educator_id") or user.get("id")
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    # Document fields
    doc_fields = ['aadhar_number', 'aadhar_document', 'pan_number', 'pan_document', 'id_verification_document']
    update_data = {k: v for k, v in data.items() if k in doc_fields and v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid document fields to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    update_data['documents_verified'] = False  # Mark as unverified after update
    
    # Update educator application
    await db.educator_applications.update_one(
        {"id": educator_id},
        {"$set": update_data}
    )
    
    # Also update onboarding record if exists
    await db.educator_onboarding.update_one(
        {"educator_id": educator_id},
        {"$set": update_data},
        upsert=False
    )
    
    return {"success": True, "message": "Documents updated. They will be verified soon."}

@router.post("/admin/notify-not-joined/{inquiry_id}")
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

@router.post("/notifications/send-reminders")
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

@router.post("/educators/complete-demo/{app_id}")
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

@router.get("/educators/my-application")
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
@router.get("/requirements", response_model=List[OpenRequirement])
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

@router.get("/requirements/{req_id}")
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
        frontend_url = os.environ.get("FRONTEND_URL", "https://camp-lead-capture.preview.emergentagent.com")
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

@router.post("/requirements", response_model=OpenRequirement)
async def create_requirement(data: OpenRequirementCreate, user: dict = Depends(get_current_user), background_tasks: BackgroundTasks = None):
    requirement = OpenRequirement(**data.model_dump())
    doc = requirement.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.open_requirements.insert_one(doc)
    # Send email notifications to all educators in background
    if background_tasks:
        background_tasks.add_task(notify_educators_new_requirement, requirement.model_dump())
    return requirement

@router.patch("/requirements/{req_id}", response_model=OpenRequirement)
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

@router.delete("/requirements/{req_id}")
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

@router.patch("/team-applications/{app_id}")
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

@router.get("/team-requirements")
async def get_team_requirements(all: bool = False):
    """Get team requirements/open positions. By default returns only active ones."""
    query = {} if all else {"is_active": True}
    requirements = await db.team_requirements.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return requirements

@router.post("/team-requirements")
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

@router.patch("/team-requirements/{req_id}")
async def update_team_requirement(req_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a team requirement"""
    update_data = {k: v for k, v in data.items() if v is not None and k != "id"}
    await db.team_requirements.update_one({"id": req_id}, {"$set": update_data})
    requirement = await db.team_requirements.find_one({"id": req_id}, {"_id": 0})
    return requirement

@router.delete("/team-requirements/{req_id}")
async def delete_team_requirement(req_id: str, user: dict = Depends(get_current_user)):
    """Delete a team requirement"""
    await db.team_requirements.delete_one({"id": req_id})
    return {"message": "Deleted successfully"}

# ========================
# SCHOOL CASE STUDIES
# ========================

@router.get("/case-studies")
async def get_case_studies(all: bool = False):
    query = {} if all else {"is_active": True}
    case_studies = await db.case_studies.find(query, {"_id": 0}).sort("order", 1).to_list(50)
    return case_studies

@router.post("/case-studies")
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

@router.patch("/case-studies/{study_id}")
async def update_case_study(study_id: str, data: dict, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.items() if k != "id"}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.case_studies.update_one({"id": study_id}, {"$set": update_data})
    study = await db.case_studies.find_one({"id": study_id}, {"_id": 0})
    return study

@router.delete("/case-studies/{study_id}")
async def delete_case_study(study_id: str, user: dict = Depends(get_current_user)):
    await db.case_studies.delete_one({"id": study_id})
    return {"message": "Deleted successfully"}

# Educator Form Configuration
@router.get("/educator-config")
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

@router.put("/educator-config")
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

@router.get("/faqs", response_model=List[FAQ])
async def get_faqs(category: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    faqs = await db.faqs.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return faqs

@router.post("/faqs", response_model=FAQ)
async def create_faq(data: FAQCreate, user: dict = Depends(get_current_user)):
    faq = FAQ(**data.model_dump())
    doc = faq.model_dump()
    await db.faqs.insert_one(doc)
    return faq

@router.patch("/faqs/{faq_id}", response_model=FAQ)
async def update_faq(faq_id: str, data: FAQUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.faqs.update_one({"id": faq_id}, {"$set": update_data})
    faq = await db.faqs.find_one({"id": faq_id}, {"_id": 0})
    return faq

@router.delete("/faqs/{faq_id}")
async def delete_faq(faq_id: str, user: dict = Depends(get_current_user)):
    await db.faqs.delete_one({"id": faq_id})
    return {"message": "Deleted successfully"}

# ========================
# BLOG ENDPOINTS
# ========================

@router.get("/blogs", response_model=List[Blog])
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

@router.get("/blogs/{slug}", response_model=Blog)
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

@router.post("/blogs", response_model=Blog)
async def create_blog(data: BlogCreate, user: dict = Depends(get_current_user)):
    blog = Blog(**data.model_dump())
    doc = blog.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.blogs.insert_one(doc)
    return blog

@router.patch("/blogs/{blog_id}", response_model=Blog)
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

@router.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: str, user: dict = Depends(get_current_user)):
    await db.blogs.delete_one({"id": blog_id})
    return {"message": "Deleted successfully"}

# ========================
# SUPPORT TICKET ENDPOINTS
# ========================

@router.post("/support/ticket", response_model=SupportTicket)
async def create_support_ticket(data: SupportTicketCreate):
    ticket = SupportTicket(**data.model_dump())
    doc = ticket.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['ticket_number'] = await get_next_ticket_number()
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
