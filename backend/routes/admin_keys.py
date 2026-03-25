"""
Admin API Keys, Service Keys, and External Schools API routes.
Endpoints: /admin/api-keys/*, /admin/service-api-keys/*, /external/*
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import resend
import os
import asyncio
import secrets

from .shared import db, get_current_user
from config import SENDER_EMAIL

# Inline resend helpers (same logic as server.py)
async def get_resend_api_key():
    """Get Resend API key from database or environment"""
    try:
        import logging
        resend_doc = await db.service_api_keys.find_one({"service": "resend"}, {"_id": 0})
        if resend_doc and resend_doc.get("api_key"):
            return resend_doc["api_key"]
    except Exception as e:
        import logging; logging.warning(f"Failed to get Resend key from DB: {e}")
    return os.environ.get("RESEND_API_KEY", "")

async def ensure_resend_api_key():
    """Ensure Resend API key is set from DB or env"""
    key = await get_resend_api_key()
    if key:
        resend.api_key = key
    return bool(key)


async def verify_external_api_key(api_key: str = Header(None, alias="X-API-Key")):
    """Verify external API key from header"""
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required. Use X-API-Key header.")
    key_doc = await db.external_api_keys.find_one({"key": api_key, "is_active": True}, {"_id": 0})
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    await db.external_api_keys.update_one(
        {"key": api_key},
        {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}, "$inc": {"usage_count": 1}}
    )
    return key_doc

router = APIRouter()

@router.post("/admin/api-keys/generate")
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


@router.get("/admin/api-keys")
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


@router.patch("/admin/api-keys/{key_id}")
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


@router.get("/admin/api-keys/{key_id}/test")
async def test_external_api_key(key_id: str, user: dict = Depends(get_current_user)):
    """Test an external API key by fetching sample school data with it"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    key_doc = await db.external_api_keys.find_one({"id": key_id}, {"_id": 0})
    if not key_doc:
        raise HTTPException(status_code=404, detail="API key not found")
    if not key_doc.get("is_active"):
        return {"success": False, "error": "API key is inactive"}
    
    # Fetch sample active schools using the key
    schools = await db.school_inquiries.find(
        {"status": {"$in": ["active", "converted", "renewed"]}},
        {"_id": 0, "school_name": 1, "address": 1, "location": 1, "latitude": 1, "longitude": 1, "contact_name": 1, "phone": 1}
    ).limit(3).to_list(3)

    sample = [{
        "school_name": s.get("school_name") or "",
        "address": s.get("address") or "",
        "city": s.get("location") or "",
        "latitude": s.get("latitude"),
        "longitude": s.get("longitude"),
        "contact_person": s.get("contact_name") or "",
        "contact_phone": s.get("phone") or "",
    } for s in schools]

    return {
        "success": True,
        "key_name": key_doc.get("name"),
        "count_active_schools": await db.school_inquiries.count_documents({"status": {"$in": ["active", "converted", "renewed"]}}),
        "sample": sample
    }


@router.delete("/admin/api-keys/{key_id}")
async def delete_external_api_key(key_id: str, user: dict = Depends(get_current_user)):
    """Delete an external API key"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    await db.external_api_keys.delete_one({"id": key_id})
    return {"message": "API key deleted successfully"}


# ========================
# SERVICE API KEYS (Resend, etc.)
# ========================

@router.get("/admin/service-api-keys")
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

@router.post("/admin/service-api-keys/resend")
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


@router.post("/admin/service-api-keys/resend/test")
async def test_resend_email(data: dict, user: dict = Depends(get_current_user)):
    """Send a test email to verify Resend API key works (detects test vs production key)"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")

    test_to = data.get("to_email", user.get("email", ""))
    if not test_to:
        raise HTTPException(status_code=400, detail="Recipient email required")

    await ensure_resend_api_key()
    if not resend.api_key:
        return {"success": False, "error": "No Resend API key configured. Go to Settings > API Keys to add one."}

    key_masked = f"{resend.api_key[:8]}...{resend.api_key[-4:]}" if len(resend.api_key) > 12 else "****"
    try:
        email_response = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [test_to],
            "subject": "OLL - Test Email",
            "html": "<h2>Test Email from OLL</h2><p>If you received this, your Resend email integration is working correctly.</p>"
        })
        email_id = email_response.get("id") if isinstance(email_response, dict) else str(email_response)
        return {
            "success": True,
            "message": f"Test email sent to {test_to}",
            "email_id": email_id,
            "key_used": key_masked,
            "key_type": "production"
        }
    except Exception as e:
        error_msg = str(e)
        is_test_key = "testing" in error_msg.lower() or "test" in error_msg.lower()
        return {
            "success": False,
            "error": error_msg,
            "key_used": key_masked,
            "key_type": "test (restricted)" if is_test_key else "unknown",
            "fix_instructions": (
                "Your Resend API key is a TEST key. Test keys can only send emails to the account owner's email. "
                "To fix: 1) Go to https://resend.com/api-keys  2) Create a new API key with 'Sending access' permission  "
                "3) Make sure your sending domain (oll.co) is verified at https://resend.com/domains  "
                "4) Update the key in OLL Admin > Settings > API Keys"
            ) if is_test_key else f"Email send failed: {error_msg}"
        }


# ========================
# EXTERNAL API ENDPOINTS (Protected by API Key)
# ========================

@router.get("/external/schools")
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
                "latitude": school.get("latitude"),
                "longitude": school.get("longitude"),
                "geofence_radius": school.get("geofence_radius", 500),
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


@router.get("/external/schools/stats/summary")
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


@router.get("/external/schools/active")
async def external_get_active_schools_flat(
    city: Optional[str] = None,
    limit: int = 500,
    api_key_data: dict = Depends(verify_external_api_key)
):
    """
    Simplified flat-format endpoint returning active OLL partner schools.

    Headers required:
        X-API-Key: your_api_key

    Returns a flat list with:
        school_name, address, latitude, longitude,
        contact_person, contact_phone, city, status
    """
    query: dict = {"status": {"$in": ["active", "converted", "renewed"]}}
    if city:
        query["location"] = {"$regex": city, "$options": "i"}

    limit = min(limit, 1000)
    schools = await db.school_inquiries.find(query, {"_id": 0}).limit(limit).to_list(limit)

    result = []
    for s in schools:
        result.append({
            "school_name": s.get("school_name") or "",
            "address": s.get("address") or "",
            "city": s.get("location") or s.get("city") or "",
            "state": s.get("state") or "",
            "latitude": s.get("latitude"),
            "longitude": s.get("longitude"),
            "contact_person": s.get("contact_name") or "",
            "contact_phone": s.get("phone") or "",
            "contact_email": s.get("email") or "",
            "board": s.get("board") or "",
            "status": s.get("status") or "",
        })

    return {
        "count": len(result),
        "schools": result,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/external/schools/{school_id}")
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
            "city": school.get("location"),
            "state": school.get("state"),
            "address": school.get("address"),
            "area": school.get("city"),
            "latitude": school.get("latitude"),
            "longitude": school.get("longitude"),
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





