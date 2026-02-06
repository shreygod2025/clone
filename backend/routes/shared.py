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
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'oll-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Security
security = HTTPBearer()

# Common paths
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Decode JWT and return current user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        role = payload.get("role", "user")
        
        # Check if it's an admin/team user
        if role in ["admin", "super_admin", "team_member"]:
            user = await db.admin_users.find_one({"email": email}, {"_id": 0})
            if user:
                return user
        
        # Check for growth partner
        if role == "growth_partner":
            partner = await db.growth_partners.find_one({"email": email}, {"_id": 0})
            if partner:
                return {**partner, "role": "growth_partner"}
        
        # Check center user
        if role == "center_partner":
            center_user = await db.center_users.find_one({"email": email}, {"_id": 0})
            if center_user:
                return center_user
        
        # Check educator
        if role == "educator":
            educator = await db.educator_applications.find_one({"email": email}, {"_id": 0})
            if educator:
                return {**educator, "role": "educator"}
        
        # Return basic user info for students
        return {"email": email, "role": role}
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
