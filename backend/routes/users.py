"""
User management routes: Auth, Team Users, Roles, Center Users, OTP, User Bookings, School-Student profile.
"""
import os
import uuid
import asyncio
import bcrypt
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from .shared import db, get_current_user, hash_password, verify_password, create_access_token
from database import otp_store_new, otp_verify, otp_send_allowed

router = APIRouter()

# ── Models ─────────────────────────────────────────────────────────────────────
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
class OTPRequest(BaseModel):
    phone: str
    user_type: str = "student"  # student, educator, school

class OTPVerify(BaseModel):
    phone: str
    otp: str
    user_type: str = "student"

class Role(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    permissions: List[str] = []
    is_system: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/auth/register", response_model=TokenResponse)
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

@router.post("/auth/login", response_model=TokenResponse)
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

@router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@router.post("/team-users")
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

@router.get("/team-users")
async def get_team_users(user: dict = Depends(get_current_user)):
    users = await db.team_users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(100)
    return users

@router.get("/team-users/{user_id}")
async def get_team_user(user_id: str, user: dict = Depends(get_current_user)):
    team_user = await db.team_users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not team_user:
        raise HTTPException(status_code=404, detail="User not found")
    return team_user

@router.get("/team-users/by-username/{username}")
async def get_team_user_by_username(username: str):
    team_user = await db.team_users.find_one({"username": username, "is_active": True}, {"_id": 0, "password_hash": 0})
    if not team_user:
        raise HTTPException(status_code=404, detail="User not found")
    return team_user

@router.patch("/team-users/{user_id}")
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

@router.delete("/team-users/{user_id}")
async def delete_team_user(user_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete team users")
    
    await db.team_users.delete_one({"id": user_id})
    return {"message": "User deleted"}

@router.post("/team-users/login")
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

@router.get("/roles")
async def get_roles(user: dict = Depends(get_current_user)):
    """Get all roles"""
    roles = await db.roles.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return roles

@router.post("/roles")
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

@router.patch("/roles/{role_id}")
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

@router.delete("/roles/{role_id}")
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

@router.post("/center-users")
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

@router.get("/center-users")
async def list_center_users(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view center users")
    
    users = await db.center_users.find({}, {"_id": 0, "hashed_password": 0}).to_list(100)
    return users

@router.delete("/center-users/{user_id}")
async def delete_center_user(user_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete center users")
    
    await db.center_users.delete_one({"id": user_id})
    return {"message": "Center user deleted"}
@router.post("/auth/send-otp")
async def send_otp(data: OTPRequest):
    import random
    import httpx

    # Rate limiting — enforce cooldown between sends
    allowed, reason = await otp_send_allowed(data.phone)
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)
    
    # Generate cryptographically random 4-digit OTP
    otp = str(random.SystemRandom().randint(1000, 9999))
    
    # Store OTP with expiration and attempt counter
    await otp_store_new(data.phone, otp)
    
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

@router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    success, error_msg = await otp_verify(data.phone, data.otp)
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

@router.get("/user/bookings/{phone}")
async def get_user_bookings(phone: str, user_type: str = "student"):
    collection_map = {
        "student": "student_inquiries",
        "educator": "educator_applications",
        "school": "school_inquiries"
    }
    collection = collection_map.get(user_type, "student_inquiries")
    bookings = await db[collection].find({"phone": phone}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return bookings

@router.post("/user/reschedule")
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

@router.post("/user/cancel-booking")
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

@router.get("/school-student/profile/{phone}")
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

@router.patch("/school-student/profile/{phone}")
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

@router.get("/school-student/receipt/{payment_id}")
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

