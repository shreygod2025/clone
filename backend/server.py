from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
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

class TeamUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    username: str  # unique, used for /add/{username}
    password_hash: str = ""
    role: str = "team_member"
    is_active: bool = True
    permissions: List[str] = []  # ['students', 'schools', 'educators', 'growth_partners']
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    username: str
    permissions: List[str] = []

class TeamUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None

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
    notes: str = ""

class StudentInquiryUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    followup_date: Optional[str] = None
    conversion_amount: Optional[str] = None
    sessions_count: Optional[str] = None
    assigned_to: Optional[str] = None

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

class GrowthPartnerUpdate(BaseModel):
    status: Optional[str] = None
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
    notes: str = ""

class SchoolInquiryUpdate(BaseModel):
    status: Optional[str] = None
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
    experience: str
    grades_comfortable: List[str]
    city: str
    availability: str
    demo_ready: bool = False
    requirement_id: Optional[str] = None
    requirement_title: Optional[str] = None
    status: str = "new"  # new, demo_scheduled, demo_completed, onboarded, archived
    notes: str = ""
    comments: List[dict] = []
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    onboarding_date: Optional[str] = None
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
    availability: str = ""
    demo_ready: bool = False
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    requirement_id: Optional[str] = None
    requirement_title: Optional[str] = None
    source: str = "website"
    added_by: str = ""
    notes: str = ""

class EducatorApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    onboarding_date: Optional[str] = None
    assigned_to: Optional[str] = None

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
        user_id = payload.get("user_id")
        
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
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

@api_router.post("/auth/send-otp")
async def send_otp(data: OTPRequest):
    # Generate OTP (in production, send via WhatsApp/Twilio)
    otp = "1111"  # Mock OTP for testing
    otp_store[data.phone] = {
        "otp": otp,
        "user_type": data.user_type,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    # TODO: Integrate Twilio WhatsApp OTP in production
    return {"message": "OTP sent via WhatsApp", "hint": "Use 1111 for testing"}

@api_router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    stored = otp_store.get(data.phone)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Please request a new one.")
    
    if stored["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if datetime.now(timezone.utc) > stored["expires"]:
        del otp_store[data.phone]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    # Clear OTP after successful verification
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
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.student_inquiries.insert_one(doc)
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
    doc = application.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.educator_applications.insert_one(doc)
    return application

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
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.educator_applications.update_one({"id": app_id}, {"$set": update_data})
    application = await db.educator_applications.find_one({"id": app_id}, {"_id": 0})
    if isinstance(application.get('created_at'), str):
        application['created_at'] = datetime.fromisoformat(application['created_at'])
    if isinstance(application.get('updated_at'), str):
        application['updated_at'] = datetime.fromisoformat(application['updated_at'])
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
    user: dict = Depends(get_current_user)
):
    """Get all support queries from the SupportFlow component"""
    query = {}
    if status:
        query["status"] = status
    queries = await db.support_queries.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return queries

@api_router.patch("/support/queries/{query_id}")
async def update_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a support query status"""
    update_data = {k: v for k, v in data.items() if v is not None}
    await db.support_queries.update_one({"id": query_id}, {"$set": update_data})
    return {"message": "Query updated successfully"}

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
    student_count = await db.student_inquiries.count_documents({})
    school_count = await db.school_inquiries.count_documents({})
    educator_count = await db.educator_applications.count_documents({})
    ticket_count = await db.support_tickets.count_documents({"status": "open"})
    
    # Get counts by status
    student_new = await db.student_inquiries.count_documents({"status": "new"})
    student_converted = await db.student_inquiries.count_documents({"status": "converted"})
    school_new = await db.school_inquiries.count_documents({"status": "new"})
    educator_new = await db.educator_applications.count_documents({"status": "new"})
    
    return {
        "total_students": student_count,
        "total_schools": school_count,
        "total_educators": educator_count,
        "open_tickets": ticket_count,
        "new_student_leads": student_new,
        "converted_students": student_converted,
        "new_school_leads": school_new,
        "new_educator_applications": educator_new
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

# Include router and middleware
app.include_router(api_router)

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
