"""
Authentication routes for OLL Platform.
Handles admin login, registration, OTP authentication for students/educators.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
import uuid
import bcrypt
import random

# Import shared dependencies
from .shared import db, get_current_user, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS
import jwt
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ========================
# PYDANTIC MODELS
# ========================

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "admin"
    username: str = ""
    permissions: list = []
    center_id: str = ""
    center_name: str = ""

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminUser(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "admin"
    username: str = ""
    is_active: bool = True
    permissions: list = []
    center_id: str = ""
    center_name: str = ""
    created_at: datetime = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AdminUser

class OTPRequest(BaseModel):
    phone: str
    user_type: str = "student"  # student, educator, school

class OTPVerify(BaseModel):
    phone: str
    otp: str
    user_type: str = "student"

# Store OTPs temporarily (in production, use Redis)
otp_store = {}

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

# ========================
# AUTH ENDPOINTS
# ========================

@router.post("/register", response_model=TokenResponse)
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

@router.post("/login", response_model=TokenResponse)
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

@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

# ========================
# OTP AUTHENTICATION (Student/Educator/School)
# ========================

@router.post("/send-otp")
async def send_otp(data: OTPRequest):
    """Send OTP to user phone. In dev mode, OTP is always 1111."""
    phone = data.phone.replace("+91", "").replace(" ", "").strip()
    
    if len(phone) != 10 or not phone.isdigit():
        raise HTTPException(status_code=400, detail="Invalid phone number. Please enter 10 digit number.")
    
    # Generate OTP (use 1111 for testing)
    otp = "1111"  # In production: str(random.randint(1000, 9999))
    
    # Store OTP with expiry
    otp_store[phone] = {
        "otp": otp,
        "user_type": data.user_type,
        "created_at": datetime.now(timezone.utc),
        "attempts": 0
    }
    
    # In production, send via WhatsApp/SMS
    print(f"OTP for {phone}: {otp}")
    
    return {"message": "OTP sent successfully", "phone": phone}

@router.post("/verify-otp")
async def verify_otp(data: OTPVerify):
    """Verify OTP and return JWT token."""
    phone = data.phone.replace("+91", "").replace(" ", "").strip()
    
    stored = otp_store.get(phone)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Please request a new OTP.")
    
    # Check attempts
    if stored["attempts"] >= 5:
        del otp_store[phone]
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new OTP.")
    
    # Verify OTP
    if stored["otp"] != data.otp:
        otp_store[phone]["attempts"] += 1
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # OTP verified - clean up
    del otp_store[phone]
    
    # Check if user exists based on type
    user_data = None
    if data.user_type == "student":
        user_data = await db.student_inquiries.find_one({"phone": phone}, {"_id": 0})
    elif data.user_type == "educator":
        user_data = await db.educator_applications.find_one({"phone": phone}, {"_id": 0})
    elif data.user_type == "school":
        user_data = await db.school_inquiries.find_one({"phone": phone}, {"_id": 0})
    
    # Create token
    token_data = {
        "sub": phone,
        "role": data.user_type,
        "phone": phone
    }
    
    if user_data:
        token_data["user_id"] = user_data.get("id")
        token_data["name"] = user_data.get("name", user_data.get("contact_name", ""))
    
    if data.user_type == "educator" and user_data:
        token_data["educator_id"] = user_data.get("id")
    
    token = create_access_token(token_data)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_type": data.user_type,
        "is_new_user": user_data is None,
        "user": user_data
    }
