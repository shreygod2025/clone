"""
Shared dependencies for all route modules.
This module provides common database connections, authentication, and utilities.
"""
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import jwt
import asyncio
import resend
from datetime import datetime, timezone

# Resolved lazily inside send_notification_email() to avoid circular import
# with server.py (which imports from this module at startup).
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

async def send_email_gmail(*_args, **_kwargs):  # pragma: no cover
    """Placeholder shim — the real implementation lives in server.py and is
    resolved lazily at call sites (see routes/techfest.py::_dispatch_email)."""
    return {"success": False, "error": "Gmail helper not loaded"}

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / '.env')

# Canonical MongoDB connection — shared single instance from db
from database import client, db
mongo_url = str(client.topology_description) if hasattr(client, 'topology_description') else ""

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'oll-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72

# Security
security = HTTPBearer()

# Common paths
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Decode JWT and return current user"""
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

        # Future Skills centre-owner login (scoped to a single fs centre)
        if role == "fs_center_owner" and center_id:
            fs_center = await db.centers.find_one(
                {"id": center_id}, {"_id": 0, "owner_password_hash": 0}
            )
            if fs_center and fs_center.get("is_active", True):
                return {
                    "id": fs_center["id"],
                    "email": email,
                    "name": fs_center.get("owner_name") or fs_center.get("name", "Centre Owner"),
                    "role": "fs_center_owner",
                    "center_id": fs_center["id"],
                    "center_name": fs_center.get("name", ""),
                }
            raise HTTPException(status_code=401, detail="Centre not accessible")
        
        # 🔒 Login is restricted to `team_users`. The legacy `admins` collection
        # is no longer consulted (audit 2026-07-28).
        team_user = await db.team_users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
        if team_user:
            # Resolve effective role.
            # 1. Any user whose stored role is `admin` or `super_admin` → treat
            #    as "admin" for the purposes of every downstream gate. This makes
            #    role-based access simple and consistent across the codebase.
            # 2. Otherwise, if a role_id points at a Role document that grants
            #    full access, also promote to "admin" (existing behaviour).
            # 3. Fallback to the stored role or "team_member".
            stored_role = team_user.get("role") or "team_member"
            effective_role = stored_role
            role_perms: list = []
            if stored_role in ("admin", "super_admin"):
                effective_role = "admin"
            elif team_user.get("role_id"):
                role_doc = await db.roles.find_one(
                    {"id": team_user["role_id"]},
                    {"_id": 0, "grants_full_access": 1, "is_active": 1, "permissions": 1},
                )
                if role_doc and role_doc.get("is_active", True):
                    if role_doc.get("grants_full_access"):
                        effective_role = "admin"
                    role_perms = list(role_doc.get("permissions") or [])
            team_user["role"] = effective_role
            # Merge role-level permissions onto the user so every route +
            # /auth/me sees the effective permission set on each request.
            # Without this the sidebar and ProtectedRoute both fail to reflect
            # role assignments made after the user first logged in.
            merged_perms = list(dict.fromkeys((team_user.get("permissions") or []) + role_perms))
            team_user["permissions"] = merged_perms
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

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user if token is valid, otherwise return None"""
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

def require_role(*roles):
    """Dependency to require specific roles"""
    async def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail=f"Requires one of roles: {roles}")
        return user
    return role_checker

def require_admin():
    """Shortcut for admin/super_admin role requirement"""
    return require_role("admin", "super_admin")


# ── RBAC & Data Isolation Helpers ─────────────────────────────────────────────

def has_permission(user: dict, perm: str) -> bool:
    """Check if user has a specific permission or is an admin."""
    if not user:
        return False
    if user.get("role") in ("admin", "super_admin"):
        return True
    return perm in (user.get("permissions") or [])


def has_school_permission(user: dict) -> bool:
    return has_permission(user, "schools")


def has_field_visit_permission(user: dict) -> bool:
    if user.get("role") in ("admin", "super_admin"):
        return True
    perms = user.get("permissions") or []
    return any(p in perms for p in ("field_reports", "field_visit", "field_reports_admin"))


async def get_managed_user_ids(manager_id: str) -> list:
    """Recursively return all team_user IDs who report directly or indirectly to manager_id."""
    if not manager_id:
        return []
    managed = set()
    to_visit = [manager_id]
    visited = set()
    while to_visit:
        curr = to_visit.pop(0)
        if curr in visited:
            continue
        visited.add(curr)
        cursor = db.team_users.find({"reports_to": curr, "is_active": {"$ne": False}}, {"_id": 0, "id": 1})
        async for doc in cursor:
            uid = doc.get("id")
            if uid and uid not in managed:
                managed.add(uid)
                to_visit.append(uid)
    return list(managed)


async def can_manage_user(manager: dict, target_user_id: str) -> bool:
    """Return True if manager is admin, target is self, or target is in manager's reporting line."""
    if not manager or not target_user_id:
        return False
    if manager.get("role") in ("admin", "super_admin"):
        return True
    uid = manager.get("id") or manager.get("user_id")
    if target_user_id == uid:
        return True
    managed_ids = await get_managed_user_ids(uid)
    return target_user_id in managed_ids


async def get_assignable_users(user: dict) -> list:
    """
    Returns list of eligible users the given user can assign tasks to:
    - If admin: all active team users + admins
    - If manager: self + managed team users
    - If regular: only self
    """
    uid = user.get("id") or user.get("user_id")
    is_admin = user.get("role") in ("admin", "super_admin")

    if is_admin:
        team_users = await db.team_users.find(
            {"is_active": {"$ne": False}},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "department": 1}
        ).sort("name", 1).to_list(1000)
        admins = await db.admins.find(
            {},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
        ).sort("name", 1).to_list(100)

        seen = set()
        result = []
        for u in team_users:
            if u.get("id") and u["id"] not in seen:
                seen.add(u["id"])
                result.append({
                    "id": u["id"],
                    "name": u.get("name") or u.get("email"),
                    "email": u.get("email", ""),
                    "role": u.get("role") or u.get("department") or "Team Member",
                    "is_self": u["id"] == uid,
                })
        for a in admins:
            if a.get("id") and a["id"] not in seen:
                seen.add(a["id"])
                result.append({
                    "id": a["id"],
                    "name": a.get("name") or a.get("email"),
                    "email": a.get("email", ""),
                    "role": a.get("role") or "Admin",
                    "is_self": a["id"] == uid,
                })
        return result

    managed_ids = await get_managed_user_ids(uid)
    allowed_ids = list(set([uid] + managed_ids))

    docs = await db.team_users.find(
        {"id": {"$in": allowed_ids}, "is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "department": 1}
    ).sort("name", 1).to_list(500)

    result = []
    self_found = False
    for u in docs:
        is_self = (u["id"] == uid)
        if is_self:
            self_found = True
        result.append({
            "id": u["id"],
            "name": u.get("name") or u.get("email"),
            "email": u.get("email", ""),
            "role": u.get("role") or u.get("department") or "Team Member",
            "is_self": is_self,
        })

    if not self_found:
        result.insert(0, {
            "id": uid,
            "name": user.get("name") or user.get("email") or "Myself",
            "email": user.get("email", ""),
            "role": user.get("role") or "Team Member",
            "is_self": True,
        })

    return result


async def can_access_school(user: dict, school: dict) -> bool:
    """Check if user is authorized to view/modify the given school lead."""
    if not user or not school:
        return False
    if not has_school_permission(user):
        return False
    if user.get("role") in ("admin", "super_admin"):
        return True

    uid = user.get("id") or user.get("user_id")
    uemail = (user.get("email") or "").strip().lower()
    uname = (user.get("name") or "").strip().lower()

    school_assigned_to = str(school.get("assigned_to") or "")
    school_assigned_name = str(school.get("assigned_to_name") or "").lower()
    school_added_by = str(school.get("added_by") or "")
    school_rm_id = str(school.get("relationship_manager_id") or "")
    school_rm_name = str(school.get("relationship_manager_name") or "").lower()

    if uid and uid in (school_assigned_to, school_added_by, school_rm_id):
        return True
    if uemail and uemail in (school_assigned_to.lower(), school_added_by.lower(), school_rm_id.lower()):
        return True
    if uname and (uname == school_assigned_name or uname == school_rm_name):
        return True

    managed_ids = await get_managed_user_ids(uid)
    if set(managed_ids).intersection({school_assigned_to, school_added_by, school_rm_id}):
        return True

    return False


async def get_authorized_school_query(user: dict) -> dict:
    """Build a MongoDB filter dict that strictly limits schools to those the user may access."""
    if user.get("role") in ("admin", "super_admin"):
        return {}

    uid = user.get("id") or user.get("user_id")
    user_email = (user.get("email") or "").strip()
    user_name = (user.get("name") or "").strip()

    managed_ids = await get_managed_user_ids(uid)
    all_scoped_ids = list(set([uid] + managed_ids))
    candidates = [v for v in all_scoped_ids if v]
    if user_email:
        candidates.append(user_email)
    if user_name:
        candidates.append(user_name)

    return {
        "$or": [
            {"assigned_to": {"$in": candidates}},
            {"assigned_to_name": {"$in": candidates}},
            {"added_by": {"$in": candidates}},
            {"relationship_manager_id": {"$in": candidates}},
            {"relationship_manager_name": {"$in": candidates}},
        ]
    }

def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id and convert datetime to ISO string"""
    if doc is None:
        return None
    doc.pop('_id', None)
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


# ── JWT / Password helpers ─────────────────────────────────────────────────────
import bcrypt
import jwt as _jwt
from datetime import timedelta

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=int(os.environ.get("ACCESS_TOKEN_EXPIRE_HOURS", str(ACCESS_TOKEN_EXPIRE_HOURS))))
    to_encode.update({"exp": expire})
    return _jwt.encode(to_encode, os.environ.get("JWT_SECRET", ""), algorithm="HS256")

# ── Auto-assign helpers ────────────────────────────────────────────────────────
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



# ── Resend email helpers ────────────────────────────────────────────────────────
import resend as _resend

async def get_resend_api_key() -> str:
    """Get Resend API key from database or environment"""
    import os
    try:
        resend_doc = await db.service_api_keys.find_one({"service": "resend"}, {"_id": 0})
        if resend_doc and resend_doc.get("api_key"):
            return resend_doc["api_key"]
    except Exception:
        pass
    return os.environ.get("RESEND_API_KEY", "")

async def ensure_resend_api_key() -> bool:
    """Ensure Resend API key is set; returns True if configured."""
    key = await get_resend_api_key()
    if key:
        _resend.api_key = key
    return bool(key)


# ── Email Templates & Sending ────────────────────────────────────────────────
import resend as _resend_mod

SENDER_EMAIL = "OLL Team <welcome@oll.co>"

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



# ── Ticket Number Counter ───────────────────────────────────────────────────────
async def get_next_ticket_number() -> str:
    """Atomically increment and return next ticket number as zero-padded string."""
    result = await db.counters.find_one_and_update(
        {"key": "ticket_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    num = result["seq"]
    return str(num).zfill(4)
