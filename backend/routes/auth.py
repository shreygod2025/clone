"""
Authentication routes for OLL Platform.
Handles admin login, registration, OTP authentication for students/educators.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import bcrypt
import random
import os
import re
import logging
import asyncio
import resend

# Import shared dependencies
from .shared import (
    db,
    get_current_user,
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_HOURS,
    ensure_resend_api_key,
    SENDER_EMAIL,
    send_email_gmail,
    GMAIL_APP_PASSWORD,
)
import jwt

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
    user_type: Optional[str] = None
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

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyResetOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    reset_token: Optional[str] = None
    new_password: str
    confirm_password: str

# Store OTPs temporarily (in production, use Redis)
otp_store = {}

logger = logging.getLogger("auth")

def get_reset_sender_email() -> str:
    """Return the verified sender email for password reset emails."""
    sender = os.environ.get("SENDER_EMAIL") or "OLL Support <welcome@oll.co>"
    # Ensure sender uses the verified oll.co domain
    if "resend.dev" in sender:
        sender = "OLL Support <welcome@oll.co>"
    return sender

async def send_password_reset_email(recipient_email: str, recipient_name: str, otp: str) -> dict:
    """
    Send 6-digit OTP email using Resend (verified oll.co domain: welcome@oll.co),
    with fallback to Gmail SMTP.
    """
    subject = f"🔒 {otp} is your OLL password reset code"
    current_year = datetime.now(timezone.utc).year
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your OLL Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
    <div style="background: linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">OLL Platform</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">Password Reset Verification</p>
    </div>
    
    <div style="padding: 32px 28px;">
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px 0;">Hello <strong>{recipient_name}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
        We received a request to reset your password for your OLL Admin account. Please use the 6-digit verification code below to reset your password:
      </p>
      
      <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 22px 16px; text-align: center; margin: 24px 0;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #1E3A5F; display: inline-block;">
          {otp}
        </span>
        <p style="font-size: 12px; color: #64748b; margin: 10px 0 0 0;">
          This OTP is valid for <strong>10 minutes</strong>.
        </p>
      </div>
      
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
        <p style="font-size: 12px; color: #92400e; margin: 0; line-height: 1.5;">
          <strong>Security Notice:</strong> Never share this code with anyone. OLL representatives will never ask for your password or verification code.
        </p>
      </div>
      
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 24px 0 0 0;">
        If you did not request a password reset, you can safely ignore this email — your password remains unchanged.
      </p>
    </div>
    
    <div style="border-top: 1px solid #e2e8f0; padding: 16px 24px; background: #f8fafc; text-align: center;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        © {current_year} OLL (Online Live Learning). Sent from welcome@oll.co.
      </p>
    </div>
  </div>
</body>
</html>"""

    # 1. Try Resend via verified domain (welcome@oll.co)
    sender = get_reset_sender_email()
    has_resend = await ensure_resend_api_key()
    if has_resend:
        try:
            params = {
                "from": sender,
                "to": [recipient_email],
                "subject": subject,
                "html": html_content,
            }
            res = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Password reset OTP sent via Resend to {recipient_email} from {sender}: {res}")
            return {"success": True, "provider": "resend", "id": res.get("id"), "sender": sender}
        except Exception as e:
            logger.warning(f"Resend send failed for {recipient_email}: {e}")

    # 2. Try Gmail SMTP fallback
    if GMAIL_APP_PASSWORD:
        try:
            res = await send_email_gmail(recipient_email, subject, html_content)
            if res.get("success"):
                logger.info(f"Password reset OTP sent via Gmail SMTP to {recipient_email}")
                return {"success": True, "provider": "gmail", "sender": os.environ.get("GMAIL_EMAIL", "clonefutura@gmail.com")}
        except Exception as e:
            logger.warning(f"Gmail SMTP fallback failed for {recipient_email}: {e}")

    # 3. Development / testing fallback
    logger.warning(f"No active email provider succeeded. OTP for {recipient_email} is {otp}")
    return {"success": True, "provider": "logged", "sender": sender, "note": "Email logged (check backend logs in dev)"}


async def send_password_reset_success_email(recipient_email: str, recipient_name: str) -> dict:
    """Send confirmation email after password reset."""
    subject = "✅ Your OLL account password was changed"
    current_year = datetime.now(timezone.utc).year
    now_str = datetime.now(timezone.utc).strftime("%d %b %Y at %I:%M %p UTC")
    sender = get_reset_sender_email()
    
    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%); padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0;">OLL Security Alert</h1>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 15px; margin: 0 0 12px 0;">Hello <strong>{recipient_name}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
        Your OLL account password was successfully reset on <strong>{now_str}</strong>.
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #dc2626; margin: 0 0 20px 0;">
        If you did not make this change, please contact our IT security team immediately at <a href="mailto:welcome@oll.co" style="color: #2563eb;">welcome@oll.co</a>.
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0 0;">
        © {current_year} OLL (Online Live Learning). Sent from welcome@oll.co.
      </p>
    </div>
  </div>
</body>
</html>"""
    try:
        has_resend = await ensure_resend_api_key()
        if has_resend:
            params = {
                "from": sender,
                "to": [recipient_email],
                "subject": subject,
                "html": html_content,
            }
            await asyncio.to_thread(resend.Emails.send, params)
    except Exception as e:
        logger.warning(f"Could not dispatch password reset success notification: {e}")
    return {"success": True}

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
    # 🔒 Public admin self-registration is permanently DISABLED.
    # New admins must be provisioned by an existing admin via `/api/team-users`
    # or seeded server-side. This endpoint is kept for backwards compat but
    # returns 403 to prevent unauthenticated privilege escalation.
    raise HTTPException(
        status_code=403,
        detail="Admin self-registration is disabled. Please contact your administrator.",
    )

@router.post("/login", response_model=TokenResponse)
async def login_admin(data: AdminLogin):
    # 🔒 Login is restricted to the `team_users` collection (= Users & Roles UI)
    # and `center_users`. The legacy `admins` collection is NO LONGER consulted —
    # this ensures only admins provisioned via the Users & Roles page can log in.
    # (Audit 2026-07-28 · issue: unauthorised admin accounts were self-registered
    # via the previously-open /register endpoint.)

    # Check team_users collection (canonical source of admin/team login accounts)
    team_user = await db.team_users.find_one({"email": data.email})
    if team_user:
        if not team_user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User account is disabled")

        if bcrypt.checkpw(data.password.encode('utf-8'), team_user.get("password_hash", "").encode('utf-8')):
            # Preserve actual role (super_admin / admin / team_member / manager …)
            actual_role = team_user.get("role") or "team_member"
            # Merge permissions from the linked role_id so that permissions
            # assigned via the "Assign Role" dropdown reflect in the sidebar
            # immediately on login (not only after the next /auth/me refresh).
            merged_perms = list(team_user.get("permissions") or [])
            role_id = team_user.get("role_id")
            if role_id:
                role_doc = await db.roles.find_one(
                    {"id": role_id, "is_active": True},
                    {"_id": 0, "permissions": 1, "grants_full_access": 1},
                )
                if role_doc:
                    if role_doc.get("grants_full_access"):
                        actual_role = "admin"
                    for p in (role_doc.get("permissions") or []):
                        if p not in merged_perms:
                            merged_perms.append(p)
            u_type = team_user.get("user_type", "team_user")
            token = create_access_token({
                "sub": data.email,
                "role": actual_role,
                "user_id": team_user["id"],
                "user_type": u_type,
            })
            user = AdminUser(
                id=team_user["id"],
                email=team_user["email"],
                name=team_user["name"],
                role=actual_role,
                username=team_user.get("username", ""),
                permissions=merged_perms,
                user_type=u_type,
            )
            return TokenResponse(access_token=token, user=user)

    # Check Future Skills centre owners (login scoped to a single fs centre)
    fs_center = await db.future_skills_centers.find_one({"owner_email": (data.email or "").lower()})
    if fs_center and fs_center.get("owner_password_hash"):
        if not fs_center.get("is_active", True):
            raise HTTPException(status_code=401, detail="Centre is disabled")
        if bcrypt.checkpw(data.password.encode('utf-8'), fs_center["owner_password_hash"].encode('utf-8')):
            token = create_access_token({
                "sub": data.email,
                "role": "fs_center_owner",
                "user_id": fs_center["id"],
                "center_id": fs_center["id"],
                "center_name": fs_center.get("name", ""),
            })
            user = AdminUser(
                id=fs_center["id"],
                email=data.email,
                name=fs_center.get("owner_name") or fs_center.get("name", "Centre Owner"),
                role="fs_center_owner",
                center_id=fs_center["id"],
                center_name=fs_center.get("name", ""),
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

    # Summer Camp parent login — validate phone against confirmed bookings
    if data.user_type == "summer_camp":
        booking = await db.summer_camp_bookings.find_one(
            {
                "parent_phone": {"$regex": f"{phone}$"},
                "crm_status": {"$in": ["converted", "payment_offline"]},
            },
            {"_id": 0},
        )
        if not booking:
            raise HTTPException(
                status_code=400,
                detail="No confirmed Summer Camp booking found for this phone number. Please ensure you have completed your booking.",
            )
    
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
    
    return {"message": "OTP sent successfully", "phone": phone, "sent": True}

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
    elif data.user_type == "summer_camp":
        user_data = await db.summer_camp_bookings.find_one(
            {"parent_phone": {"$regex": f"{phone}$"}, "crm_status": {"$in": ["converted", "payment_offline"]}},
            {"_id": 0},
        )
    
    # Create token
    token_data = {
        "sub": phone,
        "role": data.user_type,
        "phone": phone
    }
    
    if user_data:
        token_data["user_id"] = user_data.get("id")
        token_data["name"] = user_data.get("name", user_data.get("contact_name", user_data.get("child_name", "")))
    
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


# ========================
# FORGOT & RESET PASSWORD ENDPOINTS
# ========================

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """
    Request 6-digit OTP sent to registered email for password reset.
    Searches across team_users, future_skills_centers, and center_users.
    """
    email = data.email.strip().lower()

    user_doc = None
    collection_name = None
    name = "User"

    # Check 1: team_users
    u = await db.team_users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
    if u:
        user_doc = u
        collection_name = "team_users"
        name = u.get("name") or u.get("username") or "User"

    # Check 2: future_skills_centers
    if not user_doc:
        c = await db.future_skills_centers.find_one({"owner_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
        if c:
            user_doc = c
            collection_name = "future_skills_centers"
            name = c.get("owner_name") or c.get("name") or "Centre Owner"

    # Check 3: center_users
    if not user_doc:
        cu = await db.center_users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
        if cu:
            user_doc = cu
            collection_name = "center_users"
            name = cu.get("name") or "User"

    if not user_doc:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email address. Please check your email or contact your administrator."
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=403, detail="This account has been disabled. Please contact your administrator.")

    otp = f"{random.randint(100000, 999999):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.password_reset_otps.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "otp": otp,
            "user_id": user_doc.get("id"),
            "user_name": name,
            "collection": collection_name,
            "attempts": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat(),
            "verified": False,
        }},
        upsert=True
    )

    email_result = await send_password_reset_email(email, name, otp)

    return {
        "ok": True,
        "message": f"A 6-digit OTP verification code has been sent to {email}.",
        "email": email,
        "sender": email_result.get("sender") or "OLL Support <welcome@oll.co>",
    }


@router.post("/verify-reset-otp")
async def verify_reset_otp(data: VerifyResetOTPRequest):
    """
    Verify 6-digit OTP sent to user email. Returns temporary reset token.
    """
    email = data.email.strip().lower()
    otp_code = data.otp.strip()

    record = await db.password_reset_otps.find_one({"email": email})
    if not record:
        raise HTTPException(status_code=400, detail="No reset code found for this email or it has expired. Please request a new OTP.")

    if record.get("attempts", 0) >= 5:
        await db.password_reset_otps.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Too many invalid attempts. For security, please request a new verification code.")

    expires_at_str = record.get("expires_at")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            await db.password_reset_otps.delete_one({"email": email})
            raise HTTPException(status_code=400, detail="Verification code has expired (valid for 10 minutes). Please request a new one.")

    if record.get("otp") != otp_code:
        await db.password_reset_otps.update_one({"email": email}, {"$inc": {"attempts": 1}})
        remaining = 5 - (record.get("attempts", 0) + 1)
        raise HTTPException(status_code=400, detail=f"Invalid 6-digit OTP code. {remaining} attempt(s) remaining.")

    reset_token = str(uuid.uuid4())
    await db.password_reset_otps.update_one(
        {"email": email},
        {"$set": {
            "verified": True,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "reset_token": reset_token
        }}
    )

    return {
        "ok": True,
        "message": "OTP verified successfully. You can now reset your password.",
        "reset_token": reset_token
    }


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """
    Reset password after verifying 6-digit OTP.
    Hashes new password with bcrypt and updates in database.
    """
    email = data.email.strip().lower()
    otp_code = data.otp.strip()

    if not data.new_password:
        raise HTTPException(status_code=400, detail="New password cannot be empty.")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match.")

    record = await db.password_reset_otps.find_one({"email": email})
    if not record:
        raise HTTPException(status_code=400, detail="Reset session expired or invalid. Please request a new OTP code.")

    expires_at_str = record.get("expires_at")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        # Allow extra grace period after verification
        if datetime.now(timezone.utc) > expires_at + timedelta(minutes=15):
            await db.password_reset_otps.delete_one({"email": email})
            raise HTTPException(status_code=400, detail="Reset session has expired. Please request a new code.")

    token_valid = bool(data.reset_token and record.get("reset_token") == data.reset_token and record.get("verified"))
    otp_valid = bool(record.get("otp") == otp_code)
    if not (token_valid or otp_valid):
        raise HTTPException(status_code=400, detail="Invalid verification code or reset session. Please enter the valid OTP.")

    # Hash new password
    new_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    now_iso = datetime.now(timezone.utc).isoformat()
    coll = record.get("collection") or "team_users"

    if coll == "team_users":
        await db.team_users.update_one(
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
            {"$set": {"password_hash": new_hash, "password_updated_at": now_iso}}
        )
    elif coll == "future_skills_centers":
        await db.future_skills_centers.update_one(
            {"owner_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
            {"$set": {"owner_password_hash": new_hash, "password_updated_at": now_iso}}
        )
    elif coll == "center_users":
        await db.center_users.update_one(
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
            {"$set": {"hashed_password": new_hash, "password_updated_at": now_iso}}
        )

    # Invalidate OTP record so it can never be used again
    await db.password_reset_otps.delete_one({"email": email})

    # Dispatch confirmation notification asynchronously
    asyncio.create_task(send_password_reset_success_email(email, record.get("user_name", "User")))

    return {
        "ok": True,
        "message": "Password reset successfully. You can now log in with your new password."
    }
