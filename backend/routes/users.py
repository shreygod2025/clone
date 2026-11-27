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
from auth_utils import (
    create_portal_token,
    get_portal_phone,
    assert_portal_owns_phone,
    _normalize_phone,
)
from database import otp_store_new, otp_verify, otp_send_allowed

router = APIRouter()

# ── Models ─────────────────────────────────────────────────────────────────────
class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "admin"  # admin, team_member, fs_center_owner
    username: str = ""  # unique username for /add/{username} routes
    is_active: bool = True
    permissions: List[str] = []  # ['students', 'schools', 'educators', 'support', 'growth_partners', 'team_applications']
    center_id: str = ""       # fs_center_owner scope
    center_name: str = ""     # fs_center_owner scope
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
    reports_to: str = ""  # id of another team_user this user reports to (manager)
    is_active: bool = True
    user_type: Optional[str] = "team_user"
    permissions: List[str] = []  # ['students', 'schools', 'educators', 'growth_partners']
    # HR / people data
    date_of_birth: Optional[str] = None       # ISO date "YYYY-MM-DD"
    marital_status: Optional[str] = None      # single | married | other
    anniversary_date: Optional[str] = None    # ISO date, shown only when married
    joining_date: Optional[str] = None        # ISO date
    work_mode: Optional[str] = None           # in_office | wfh | hybrid
    # Transfer / off-boarding trail — populated by the transfer-deactivate flow
    deactivated_at: Optional[str] = None
    deactivated_by: Optional[str] = None
    transferred_to: Optional[str] = None      # target team_user id
    transfer_snapshot: Optional[dict] = None  # { schools:[ids], support_queries:[ids], done_at }
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str = ""  # Phone number for WhatsApp notifications
    username: str
    role_id: str = ""
    city: str = ""
    reports_to: str = ""  # id of manager (another team_user)
    user_type: Optional[str] = "team_user"
    permissions: List[str] = []
    date_of_birth: Optional[str] = None
    marital_status: Optional[str] = None
    anniversary_date: Optional[str] = None
    joining_date: Optional[str] = None
    work_mode: Optional[str] = None

class TeamUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None  # Phone number for WhatsApp notifications
    password: Optional[str] = None  # Plain text password - will be hashed before storing
    is_active: Optional[bool] = None
    role_id: Optional[str] = None
    city: Optional[str] = None
    reports_to: Optional[str] = None  # id of manager (another team_user); pass "" to clear
    user_type: Optional[str] = None
    permissions: Optional[List[str]] = None
    date_of_birth: Optional[str] = None
    marital_status: Optional[str] = None
    anniversary_date: Optional[str] = None
    joining_date: Optional[str] = None
    work_mode: Optional[str] = None

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
    email: Optional[str] = None  # optional fallback when WhatsApp WCC is exhausted

class OTPVerify(BaseModel):
    phone: str
    otp: str
    user_type: str = "student"

class Role(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    permissions: List[str] = []
    kpis: List[str] = []  # KPI ids from KPI_CATALOG (see routes/kpis.py)
    is_system: bool = False
    is_active: bool = True
    grants_full_access: bool = False  # Users with this role get admin-level access
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/auth/register", response_model=TokenResponse)
async def register_admin(data: AdminCreate):
    # 🔒 Public admin self-registration is permanently DISABLED.
    # New admins must be provisioned by an existing admin via `/api/team-users`
    # or seeded server-side. This endpoint is kept for backwards compat but
    # returns 403 to prevent unauthenticated privilege escalation.
    raise HTTPException(
        status_code=403,
        detail="Admin self-registration is disabled. Please contact your administrator.",
    )

@router.post("/auth/login", response_model=TokenResponse)
async def login_admin(data: AdminLogin):
    # 🔒 Restricted to team_users + center_users (audit 2026-07-28). The legacy
    # `admins` collection is no longer consulted — only accounts provisioned
    # via the Users & Roles UI can log in.

    # team_users collection (canonical source of admin/team login accounts)
    team_user = await db.team_users.find_one({"email": data.email})
    if team_user:
        if not team_user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User account is disabled")

        if bcrypt.checkpw(data.password.encode('utf-8'), team_user.get("password_hash", "").encode('utf-8')):
            # Resolve effective role:
            #   admin / super_admin  → "admin" for downstream gates
            #   role_id → grants_full_access role → "admin"
            #   else stored role or team_member
            stored_role = team_user.get("role") or "team_member"
            effective_role = stored_role
            merged_perms = list(team_user.get("permissions") or [])
            if stored_role in ("admin", "super_admin"):
                effective_role = "admin"
            elif team_user.get("role_id"):
                role_doc = await db.roles.find_one({"id": team_user["role_id"]}, {"_id": 0})
                if role_doc and role_doc.get("is_active", True):
                    if role_doc.get("grants_full_access"):
                        effective_role = "admin"
                    # Merge role-level permissions so the sidebar reflects
                    # the assigned role immediately on login.
                    for p in (role_doc.get("permissions") or []):
                        if p not in merged_perms:
                            merged_perms.append(p)
            token = create_access_token({"sub": data.email, "role": effective_role, "user_id": team_user["id"]})
            user = AdminUser(
                id=team_user["id"],
                email=team_user["email"],
                name=team_user["name"],
                role=effective_role,
                username=team_user.get("username", ""),
                permissions=merged_perms,
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

    # Check Future Skills centre owners (login scoped to a single FS centre)
    fs_center = await db.centers.find_one({"owner_email": (data.email or "").lower()})
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

    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    # Attach is_manager flag so the frontend can hide "My Team" for non-managers.
    # Admins are always managers; team members only if someone has them as reports_to.
    uid = user.get("id") or ""
    if user.get("role") in ("admin", "super_admin"):
        is_manager = True
    else:
        reports_count = await db.team_users.count_documents({"reports_to": uid, "is_active": {"$ne": False}})
        is_manager = reports_count > 0
    return {**user, "is_manager": is_manager}

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
        reports_to=data.reports_to,
        permissions=data.permissions,
        date_of_birth=data.date_of_birth,
        marital_status=data.marital_status,
        anniversary_date=data.anniversary_date,
        joining_date=data.joining_date,
        work_mode=data.work_mode,
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


# ── Transfer & Deactivate ─────────────────────────────────────────────
# Off-boards a team user by reassigning all their live work to a target
# team user, then blocking their login. The move is reversible for
# `UNDO_WINDOW_DAYS` via `/team-users/{id}/undo-transfer`.
UNDO_WINDOW_DAYS = 30


class TransferDeactivateRequest(BaseModel):
    target_user_id: str
    reason: Optional[str] = None


@router.post("/team-users/{user_id}/transfer-deactivate")
async def transfer_and_deactivate_user(
    user_id: str,
    payload: TransferDeactivateRequest,
    user: dict = Depends(get_current_user),
):
    """Reassign a team user's live schools + open support queries to a
    target team user, then block the source user's login. All moved doc
    ids are snapshotted so the operation can be undone."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can transfer users")
    if user_id == payload.target_user_id:
        raise HTTPException(status_code=400, detail="Cannot transfer a user to themselves")

    source = await db.team_users.find_one({"id": user_id})
    if not source:
        raise HTTPException(status_code=404, detail="Source user not found")
    target = await db.team_users.find_one({"id": payload.target_user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")
    if target.get("is_active") is False:
        raise HTTPException(status_code=400, detail="Target user is inactive")

    now = datetime.now(timezone.utc).isoformat()
    target_id = payload.target_user_id
    target_name = target.get("name") or target.get("email")

    # 1. Reassign school_inquiries (assigned_to)
    school_ids = [
        s["id"] async for s in db.school_inquiries.find(
            {"assigned_to": user_id}, {"id": 1, "_id": 0},
        )
    ]
    if school_ids:
        await db.school_inquiries.update_many(
            {"id": {"$in": school_ids}},
            {"$set": {"assigned_to": target_id, "assigned_to_name": target_name}},
        )

    # 2. Reassign OPEN support queries (leave resolved/closed ones on the
    # original owner so history is preserved)
    open_query_ids = [
        q["id"] async for q in db.support_queries.find(
            {"assigned_to": user_id, "status": {"$nin": ["resolved", "closed"]}},
            {"id": 1, "_id": 0},
        )
    ]
    if open_query_ids:
        await db.support_queries.update_many(
            {"id": {"$in": open_query_ids}},
            {"$set": {"assigned_to": target_id, "assigned_to_name": target_name}},
        )

    # 3. Deactivate & stamp
    snapshot = {
        "target_user_id": target_id,
        "school_ids": school_ids,
        "support_query_ids": open_query_ids,
        "moved_at": now,
    }
    await db.team_users.update_one(
        {"id": user_id},
        {"$set": {
            "is_active": False,
            "deactivated_at": now,
            "deactivated_by": user.get("id"),
            "transferred_to": target_id,
            "transfer_reason": payload.reason or "",
            "transfer_snapshot": snapshot,
        }},
    )

    return {
        "message": f"Transferred {len(school_ids)} school(s) and {len(open_query_ids)} open queries to {target_name}",
        "schools_transferred": len(school_ids),
        "queries_transferred": len(open_query_ids),
        "target_name": target_name,
        "undo_deadline_days": UNDO_WINDOW_DAYS,
    }


@router.post("/team-users/{user_id}/undo-transfer")
async def undo_transfer(user_id: str, user: dict = Depends(get_current_user)):
    """Reverse a previous transfer if still within the undo window."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can undo transfers")

    source = await db.team_users.find_one({"id": user_id})
    if not source:
        raise HTTPException(status_code=404, detail="User not found")
    snapshot = source.get("transfer_snapshot") or None
    if not snapshot:
        raise HTTPException(status_code=400, detail="No transfer to undo for this user")

    moved_at = snapshot.get("moved_at")
    try:
        moved_dt = datetime.fromisoformat(moved_at.replace("Z", "+00:00")) if moved_at else None
    except Exception:
        moved_dt = None
    if not moved_dt:
        raise HTTPException(status_code=400, detail="Snapshot is missing a valid timestamp")
    age_days = (datetime.now(timezone.utc) - moved_dt).days
    if age_days > UNDO_WINDOW_DAYS:
        raise HTTPException(status_code=400, detail=f"Undo window expired ({age_days} days > {UNDO_WINDOW_DAYS})")

    source_name = source.get("name") or source.get("email")
    school_ids = snapshot.get("school_ids") or []
    query_ids = snapshot.get("support_query_ids") or []

    if school_ids:
        await db.school_inquiries.update_many(
            {"id": {"$in": school_ids}},
            {"$set": {"assigned_to": user_id, "assigned_to_name": source_name}},
        )
    if query_ids:
        await db.support_queries.update_many(
            {"id": {"$in": query_ids}},
            {"$set": {"assigned_to": user_id, "assigned_to_name": source_name}},
        )

    await db.team_users.update_one(
        {"id": user_id},
        {"$set": {"is_active": True},
         "$unset": {
             "deactivated_at": "",
             "deactivated_by": "",
             "transferred_to": "",
             "transfer_reason": "",
             "transfer_snapshot": "",
         }},
    )

    return {
        "message": f"Undid transfer — {len(school_ids)} school(s) and {len(query_ids)} queries restored to {source_name}",
        "schools_restored": len(school_ids),
        "queries_restored": len(query_ids),
    }


@router.get("/team-users/past/list")
async def list_past_team_users(user: dict = Depends(get_current_user)):
    """Deactivated team users, most recently off-boarded first, with the
    target user's display name resolved for the UI."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    docs = await db.team_users.find(
        {"is_active": False, "deactivated_at": {"$exists": True}},
        {"_id": 0, "password_hash": 0},
    ).sort("deactivated_at", -1).to_list(500)

    # Resolve transferred_to → name in one round-trip
    target_ids = list({d.get("transferred_to") for d in docs if d.get("transferred_to")})
    lookup = {}
    if target_ids:
        async for t in db.team_users.find({"id": {"$in": target_ids}}, {"_id": 0, "id": 1, "name": 1}):
            lookup[t["id"]] = t.get("name")
    for d in docs:
        d["transferred_to_name"] = lookup.get(d.get("transferred_to"))
        moved = (d.get("transfer_snapshot") or {}).get("moved_at") or d.get("deactivated_at")
        d["can_undo"] = False
        if moved:
            try:
                moved_dt = datetime.fromisoformat(moved.replace("Z", "+00:00"))
                d["can_undo"] = (datetime.now(timezone.utc) - moved_dt).days <= UNDO_WINDOW_DAYS
            except Exception:
                pass
    return docs


@router.post("/team-users/login")
async def team_user_login(data: AdminLogin):
    team_user = await db.team_users.find_one({"email": data.email})
    if not team_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(data.password.encode('utf-8'), team_user.get("password_hash", "").encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not team_user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is disabled")

    # Merge permissions from the linked role_id so the frontend sees the
    # effective set immediately on login (mirrors /auth/login above).
    effective_role = "team_member"
    merged_perms = list(team_user.get("permissions") or [])
    if team_user.get("role_id"):
        role_doc = await db.roles.find_one({"id": team_user["role_id"]}, {"_id": 0})
        if role_doc and role_doc.get("is_active", True):
            if role_doc.get("grants_full_access"):
                effective_role = "admin"
            for p in (role_doc.get("permissions") or []):
                if p not in merged_perms:
                    merged_perms.append(p)

    access_token = create_access_token(data={"sub": team_user["email"], "role": effective_role, "user_id": team_user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": team_user["id"],
            "email": team_user["email"],
            "name": team_user["name"],
            "username": team_user["username"],
            "role": effective_role,
            "permissions": merged_perms,
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
        kpis=data.get("kpis", []),
        is_system=data.get("is_system", False),
        is_active=data.get("is_active", True),
        grants_full_access=data.get("grants_full_access", False),
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
    
    # For system roles, only allow updating permissions, description, and kpis
    if role.get("is_system"):
        allowed_fields = ["permissions", "description", "kpis"]
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

    # Summer Camp parent login — validate phone against confirmed bookings
    if data.user_type == "summer_camp":
        phone_clean = data.phone.replace("+91", "").replace(" ", "").strip()
        booking = await db.summer_camp_bookings.find_one(
            {
                "parent_phone": {"$regex": f"{phone_clean}$"},
                "crm_status": {"$in": ["converted", "payment_offline"]},
            },
            {"_id": 0},
        )
        if not booking:
            raise HTTPException(
                status_code=400,
                detail="No confirmed Summer Camp booking found for this phone number. Please ensure you have completed your booking.",
            )
    
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
        
        # For educators, dispatch via BOTH WhatsApp and email in parallel so
        # they always get the code. For every OTHER user_type, we still fire
        # the email in parallel as a defensive fallback whenever an email
        # address is supplied — this saves the flow when the AiSensy "otp"
        # campaign is exhausted, throttled or de-approved (which was the
        # root cause of a "no OTP received" complaint on the educator apply
        # form when a caller forgot to pass user_type="educator").
        has_email = bool(data.email and "@" in (data.email or ""))
        send_email_too = has_email  # was: data.user_type == "educator" and has_email
        email_task = asyncio.create_task(_send_otp_via_email(data.email, otp)) if send_email_too else None

        async with httpx.AsyncClient() as client:
            response = await client.post(aisensy_url, json=payload, timeout=30.0)
            wa_ok = response.status_code == 200
            email_ok = False
            if email_task is not None:
                try:
                    email_ok = await email_task
                except Exception:
                    email_ok = False

            if wa_ok and email_ok:
                print(f"AiSensy + email OTP sent to {phone_number} / {data.email}")
                return {"message": "OTP sent to your WhatsApp and email", "sent": True, "channel": "whatsapp+email"}
            if wa_ok:
                print(f"AiSensy OTP sent successfully to {phone_number}")
                return {"message": "OTP sent via WhatsApp", "sent": True, "channel": "whatsapp"}

            # WhatsApp failed — at this point email_task already finished (or was None)
            print(f"AiSensy API error: {response.status_code} - {response.text}")
            if email_ok:
                return {"message": "OTP sent to your email", "sent": True, "channel": "email"}

            # Final attempt — try email if it wasn't requested initially
            if not send_email_too:
                sent_via_email = await _send_otp_via_email(data.email, otp)
                if sent_via_email:
                    return {"message": "OTP sent to your email", "sent": True, "channel": "email"}

            # Surface a helpful error
            try:
                err_body = response.json()
                if "WhatsApp Conversation Credits" in str(err_body) or err_body.get("errorCode") == 402:
                    raise HTTPException(status_code=503, detail="WhatsApp OTP service is temporarily unavailable (credits exhausted). Please contact us at info@oll.co or try again later.")
            except HTTPException:
                raise
            except Exception:
                pass
            raise HTTPException(status_code=500, detail="Failed to send OTP. Please try again.")

    except HTTPException:
        raise
    except Exception as e:
        print(f"AiSensy error: {str(e)}")
        # Last-ditch attempt: email fallback on exception path too
        sent_via_email = await _send_otp_via_email(data.email, otp)
        if sent_via_email:
            return {"message": "OTP sent to your email", "sent": True, "channel": "email"}
        raise HTTPException(status_code=500, detail="Failed to send OTP. Please try again.")


async def _send_otp_via_email(email: Optional[str], otp: str) -> bool:
    """Email fallback for OTP. Returns True on success, False otherwise.
    Does not raise — caller decides what to do on failure."""
    if not email or "@" not in email:
        return False
    try:
        from .shared import ensure_resend_api_key
        import resend
        configured = await ensure_resend_api_key()
        if not configured:
            return False
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #D63031 100%); padding: 22px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">OLL</h1>
            <p style="color: #f0f0f0; margin: 4px 0 0 0; font-size: 13px;">Your verification code</p>
          </div>
          <div style="background: #ffffff; padding: 26px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="color: #444; margin: 0 0 14px 0;">Enter this 4-digit code to verify your phone number:</p>
            <div style="font-size: 42px; font-weight: 800; color: #1E3A5F; letter-spacing: 14px; padding: 14px 0; background: #f5f7fa; border-radius: 10px; font-family: 'Courier New', monospace;">{otp}</div>
            <p style="color: #888; font-size: 12px; margin-top: 16px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
        """
        params = {
            "from": "OLL Team <welcome@oll.co>",
            "to": [email.strip().lower()],
            "subject": f"Your OLL verification code: {otp}",
            "html": html,
            "reply_to": "info@oll.co",
        }
        await asyncio.to_thread(resend.Emails.send, params)
        print(f"[OTP] Sent fallback email OTP to {email}")
        return True
    except Exception as e:
        print(f"[OTP] Email fallback failed: {e}")
        return False

@router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    success, error_msg = await otp_verify(data.phone, data.otp)
    if not success:
        raise HTTPException(status_code=400, detail=error_msg)

    # Issue a phone-scoped portal token so downstream `/user/*` and
    # `/school-student/*` calls can prove ownership (SEC-001 fix).
    portal_token = create_portal_token(data.phone)
    # Summer Camp parent — return booking data directly
    if data.user_type == "summer_camp":
        phone_clean = data.phone.replace("+91", "").replace(" ", "").strip()
        booking = await db.summer_camp_bookings.find_one(
            {
                "parent_phone": {"$regex": f"{phone_clean}$"},
                "crm_status": {"$in": ["converted", "payment_offline"]},
            },
            {"_id": 0},
        )
        return {
            "verified": True,
            "phone": data.phone,
            "user_type": "summer_camp",
            "user": booking,
            "is_registered": booking is not None,
            "portal_token": portal_token,
        }
    
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
            "verified": True,
            "phone": data.phone,
            "user_type": data.user_type,
            "name": user_data.get("student_name") if user_data else None,
            "email": user_data.get("email") if user_data else None,
            "grade": user_data.get("grade") if user_data else None,
            "division": user_data.get("division") if user_data else None,
            "school_name": user_data.get("school_name") if user_data else None,
            "payments": bookings,
            "is_registered": user_data is not None,
            "portal_token": portal_token,
        }
    
    return {
        "verified": True,
        "phone": data.phone,
        "user_type": data.user_type,
        "name": user_data.get("name") or user_data.get("contact_name") if user_data else None,
        "email": user_data.get("email") if user_data else None,
        "bookings": bookings,
        "is_registered": user_data is not None,
        "portal_token": portal_token,
    }

@router.get("/user/bookings/{phone}")
async def get_user_bookings(
    phone: str,
    user_type: str = "student",
    token_phone: str = Depends(get_portal_phone),
):
    assert_portal_owns_phone(token_phone, phone)
    collection_map = {
        "student": "student_inquiries",
        "educator": "educator_applications",
        "school": "school_inquiries"
    }
    collection = collection_map.get(user_type, "student_inquiries")
    bookings = await db[collection].find({"phone": phone}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return bookings

@router.post("/user/reschedule")
async def reschedule_booking(data: dict, token_phone: str = Depends(get_portal_phone)):
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

    # Ownership check — the token phone must match the booking's phone
    booking = await db[collection].find_one({"id": booking_id}, {"_id": 0, "phone": 1})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    assert_portal_owns_phone(token_phone, booking.get("phone", ""))

    update_data = {
        "demo_date" if data.get("user_type") == "student" else "meeting_date": new_date,
        "demo_time" if data.get("user_type") == "student" else "meeting_time": new_time,
        "status": "rescheduled",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db[collection].update_one({"id": booking_id}, {"$set": update_data})
    return {"message": "Booking rescheduled successfully"}

@router.post("/user/cancel-booking")
async def cancel_booking(data: dict, token_phone: str = Depends(get_portal_phone)):
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

    # Ownership check — the token phone must match the booking's phone
    booking = await db[collection].find_one({"id": booking_id}, {"_id": 0, "phone": 1})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    assert_portal_owns_phone(token_phone, booking.get("phone", ""))
    
    update_data = {
        "status": "cancelled",
        "cancellation_reason": reason,
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db[collection].update_one({"id": booking_id}, {"$set": update_data})
    return {"message": "Booking cancelled successfully"}

@router.get("/school-student/profile/{phone}")
async def get_school_student_profile(phone: str, token_phone: str = Depends(get_portal_phone)):
    """Get school student profile and payment history"""
    assert_portal_owns_phone(token_phone, phone)
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
async def update_school_student_profile(phone: str, data: dict, token_phone: str = Depends(get_portal_phone)):
    """Update school student profile details"""
    assert_portal_owns_phone(token_phone, phone)
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
async def get_school_student_receipt(payment_id: str, token_phone: str = Depends(get_portal_phone)):
    """Get a specific payment receipt"""
    payment = await db.school_student_payments.find_one(
        {"id": payment_id},
        {"_id": 0}
    )

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Ownership check — the token phone must match the payment's phone
    assert_portal_owns_phone(token_phone, payment.get("phone", ""))

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



# ── My Team (manager & admin view) ────────────────────────────────────────────
@router.get("/team/my-team")
async def get_my_team(user: dict = Depends(get_current_user)):
    """Return the team the current user manages.

    - **admin** (from `admins` collection): sees every team_user
    - **manager** (any team_user is `reports_to = current user`): sees those direct reports
    - **regular member**: empty list

    Each row includes real-time stats:
      - `tasks_assigned_open` (not completed & not pending_approval)
      - `tasks_pending_approval`
      - `tasks_completed`
      - `projects_leading`
      - `projects_member_of`
    """
    uid = user.get("id") or ""
    # A user is "team-admin" if they exist in the admins collection OR their
    # role is admin / super_admin (a team_user promoted via Users & Roles).
    # Without this second check, promoting a team_user to admin would still
    # limit them to their direct reports.
    is_admin_user = (
        bool(await db.admins.find_one({"id": uid}, {"_id": 0, "id": 1}))
        or user.get("role") in ("admin", "super_admin")
    )

    if is_admin_user:
        # Admin sees everyone
        members = await db.team_users.find({"is_active": {"$ne": False}}, {"_id": 0, "password_hash": 0, "password": 0}).to_list(1000)
        scope = "admin"
    else:
        members = await db.team_users.find({"reports_to": uid, "is_active": {"$ne": False}}, {"_id": 0, "password_hash": 0, "password": 0}).to_list(1000)
        scope = "manager" if members else "none"

    # Enrich each member with counts (in parallel via asyncio.gather)
    async def _enrich(m):
        mid = m.get("id")
        # role name
        role_doc = None
        if m.get("role_id"):
            role_doc = await db.roles.find_one({"id": m["role_id"]}, {"_id": 0, "name": 1})
        role_name = (role_doc or {}).get("name") or m.get("role") or "team_member"

        # Manager name
        mgr_name = ""
        if m.get("reports_to"):
            mgr = await db.team_users.find_one({"id": m["reports_to"]}, {"_id": 0, "name": 1}) \
                  or await db.admins.find_one({"id": m["reports_to"]}, {"_id": 0, "name": 1})
            mgr_name = (mgr or {}).get("name", "")

        # Counts
        tasks_open, tasks_pr, tasks_done, proj_lead, proj_member = await asyncio.gather(
            db.tasks.count_documents({"assigned_to": mid, "status": {"$in": ["pending", "in_progress", "rejected"]}}),
            db.tasks.count_documents({"assigned_to": mid, "status": "pending_approval"}),
            db.tasks.count_documents({"assigned_to": mid, "status": "completed"}),
            db.projects.count_documents({"lead_id": mid}),
            db.projects.count_documents({"$or": [{"member_ids": mid}, {"lead_id": mid}]}),
        )
        return {
            "id": mid,
            "name": m.get("name", ""),
            "email": m.get("email", ""),
            "phone": m.get("phone", ""),
            "role_name": role_name,
            "manager_name": mgr_name,
            "reports_to": m.get("reports_to", ""),
            "is_active": m.get("is_active", True),
            "tasks_assigned_open": tasks_open,
            "tasks_pending_approval": tasks_pr,
            "tasks_completed": tasks_done,
            "projects_leading": proj_lead,
            "projects_member_of": proj_member,
        }

    enriched = await asyncio.gather(*[_enrich(m) for m in members])
    # Sort: managers first, then by name
    def sort_key(row):
        # A user is a manager if any others report to them (approximate via projects_leading > 0 as proxy)
        return (0 if row["projects_leading"] > 0 else 1, row["name"].lower())
    enriched.sort(key=sort_key)
    return {
        "scope": scope,
        "current_user_id": uid,
        "is_admin": is_admin_user,
        "count": len(enriched),
        "members": enriched,
    }
