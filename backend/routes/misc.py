"""
Misc routes: Data Center, Public Autocomplete, Content, Cities, Centers, Inquiry, Admin, Upload, Health.
"""
import os
import uuid
import asyncio
import httpx
import io
from io import BytesIO
from pathlib import Path
import csv
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, BackgroundTasks, Request, Header
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field, ConfigDict, EmailStr

from .shared import db, get_current_user, get_next_ticket_number
from .notifications import send_whatsapp_notification

# Cloudinary lazy loader
_cloudinary_configured = False
def _get_cloudinary():
    """Lazy-load and configure cloudinary to avoid slow startup."""
    global _cloudinary_configured
    import cloudinary
    import cloudinary.uploader
    import cloudinary.utils
    if not _cloudinary_configured:
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True
        )
        _cloudinary_configured = True
    return cloudinary

router = APIRouter()

# ── Models ─────────────────────────────────────────────────────────────────────
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


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.get("/data-center/search")
async def search_data_center(
    q: Optional[str] = None,
    data_type: Optional[str] = None,  # students, schools, educators, team, growth_partners, all
    status: Optional[str] = None,
    city: Optional[str] = None,
    age_group: Optional[str] = None,
    board: Optional[str] = None,
    skill: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Search across all data types including team and growth partners"""
    results = {"students": [], "schools": [], "educators": [], "team": [], "growth_partners": [], "total": 0}
    
    # Build search regex
    search_regex = {"$regex": q, "$options": "i"} if q else None
    
    # Search students
    if data_type in [None, "all", "students"]:
        student_query = {}
        if search_regex:
            student_query["$or"] = [
                {"name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"city": search_regex},
            ]
        if status:
            student_query["status"] = status
        if city:
            student_query["city"] = {"$regex": city, "$options": "i"}
        if age_group:
            student_query["age_group"] = age_group
        if skill:
            student_query["skill"] = skill
        
        students = await db.student_inquiries.find(student_query, {"_id": 0}).limit(limit).to_list(limit)
        results["students"] = students
    
    # Search schools
    if data_type in [None, "all", "schools"]:
        school_query = {}
        if search_regex:
            school_query["$or"] = [
                {"school_name": search_regex},
                {"contact_name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"location": search_regex},
            ]
        if status:
            school_query["status"] = status
        if city:
            school_query["location"] = {"$regex": city, "$options": "i"}
        if board:
            school_query["board"] = board
        
        schools = await db.school_inquiries.find(school_query, {"_id": 0}).limit(limit).to_list(limit)
        results["schools"] = schools
    
    # Search educators
    if data_type in [None, "all", "educators"]:
        educator_query = {}
        if search_regex:
            educator_query["$or"] = [
                {"name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"city": search_regex},
            ]
        if status:
            educator_query["status"] = status
        if city:
            educator_query["city"] = {"$regex": city, "$options": "i"}
        if skill:
            educator_query["skills"] = {"$regex": skill, "$options": "i"}
        
        educators = await db.educator_applications.find(educator_query, {"_id": 0}).limit(limit).to_list(limit)
        results["educators"] = educators
    
    # Search team members
    if data_type in [None, "all", "team"]:
        team_query = {}
        if search_regex:
            team_query["$or"] = [
                {"name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"username": search_regex},
            ]
        if status:
            team_query["is_active"] = status == "active"
        
        team_members = await db.team_users.find(team_query, {"_id": 0, "password_hash": 0}).limit(limit).to_list(limit)
        # Add status field for consistency
        for t in team_members:
            t["status"] = "active" if t.get("is_active", True) else "inactive"
        results["team"] = team_members
    
    # Search growth partners
    if data_type in [None, "all", "growth_partners"]:
        gp_query = {}
        if search_regex:
            gp_query["$or"] = [
                {"name": search_regex},
                {"phone": search_regex},
                {"email": search_regex},
                {"company": search_regex},
            ]
        if status:
            gp_query["status"] = status
        if city:
            gp_query["city"] = {"$regex": city, "$options": "i"}
        
        growth_partners = await db.growth_partners.find(gp_query, {"_id": 0}).limit(limit).to_list(limit)
        results["growth_partners"] = growth_partners
    
    results["total"] = len(results["students"]) + len(results["schools"]) + len(results["educators"]) + len(results["team"]) + len(results["growth_partners"])
    return results

@router.get("/data-center/stats")
async def get_data_center_stats(user: dict = Depends(get_current_user)):
    """Get statistics for data center including team and growth partners"""
    student_count = await db.student_inquiries.count_documents({})
    school_count = await db.school_inquiries.count_documents({})
    educator_count = await db.educator_applications.count_documents({})
    team_count = await db.team_users.count_documents({})
    gp_count = await db.growth_partners.count_documents({})
    
    # Get status breakdowns
    student_statuses = {}
    async for doc in db.student_inquiries.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        student_statuses[doc["_id"] or "unknown"] = doc["count"]
    
    school_statuses = {}
    async for doc in db.school_inquiries.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        school_statuses[doc["_id"] or "unknown"] = doc["count"]
    
    educator_statuses = {}
    async for doc in db.educator_applications.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        educator_statuses[doc["_id"] or "unknown"] = doc["count"]
    
    # Team status breakdown (active/inactive)
    team_active = await db.team_users.count_documents({"is_active": True})
    team_inactive = await db.team_users.count_documents({"is_active": False})
    team_statuses = {"active": team_active, "inactive": team_inactive}
    
    # Growth partners status breakdown
    gp_statuses = {}
    async for doc in db.growth_partners.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        gp_statuses[doc["_id"] or "unknown"] = doc["count"]
    
    return {
        "totals": {
            "students": student_count,
            "schools": school_count,
            "educators": educator_count,
            "team": team_count,
            "growth_partners": gp_count,
        },
        "by_status": {
            "students": student_statuses,
            "schools": school_statuses,
            "educators": educator_statuses,
            "team": team_statuses,
            "growth_partners": gp_statuses,
        }
    }

@router.get("/data-center/autocomplete")
async def autocomplete_search(
    q: str,
    data_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Autocomplete search for forms - search by name, phone, or email"""
    if len(q) < 2:
        return []
    
    search_regex = {"$regex": q, "$options": "i"}
    results = []
    
    # Search students
    if data_type in [None, "students"]:
        students = await db.student_inquiries.find(
            {"$or": [{"name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "city": 1, "age_group": 1, "skill": 1, "learning_mode": 1, "learning_goal": 1, "address": 1}
        ).limit(5).to_list(5)
        for s in students:
            s["type"] = "student"
            results.append(s)
    
    # Search schools
    if data_type in [None, "schools"]:
        schools = await db.school_inquiries.find(
            {"$or": [{"school_name": search_regex}, {"contact_name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "id": 1, "school_name": 1, "contact_name": 1, "phone": 1, "email": 1, "location": 1, "board": 1, "student_count": 1, "meeting_type": 1}
        ).limit(5).to_list(5)
        for s in schools:
            s["type"] = "school"
            s["name"] = s.get("school_name") or s.get("contact_name")
            results.append(s)
    
    # Search educators
    if data_type in [None, "educators"]:
        educators = await db.educator_applications.find(
            {"$or": [{"name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "city": 1, "skills": 1}
        ).limit(5).to_list(5)
        for e in educators:
            e["type"] = "educator"
            results.append(e)
    
    return results[:10]

@router.put("/data-center/{data_type}/{record_id}")
async def update_data_center_record(
    data_type: str,
    record_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update a record in the data center"""
    collection_map = {
        "students": "student_inquiries",
        "schools": "school_inquiries",
        "educators": "educator_applications",
        "team": "team_applications",
        "growth_partners": "growth_partner_applications"
    }
    
    if data_type not in collection_map:
        raise HTTPException(status_code=400, detail="Invalid data type")
    
    collection_name = collection_map[data_type]
    collection = db[collection_name]
    
    # Remove fields that shouldn't be updated
    update_data = {k: v for k, v in data.items() if k not in ["id", "_id", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await collection.update_one({"id": record_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return {"message": "Record updated successfully"}

@router.delete("/data-center/{data_type}/{record_id}")
async def delete_data_center_record(
    data_type: str,
    record_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a record from the data center"""
    # Only admin can delete
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete records")
    
    collection_map = {
        "students": "student_inquiries",
        "schools": "school_inquiries",
        "educators": "educator_applications",
        "team": "team_applications",
        "growth_partners": "growth_partner_applications"
    }
    
    if data_type not in collection_map:
        raise HTTPException(status_code=400, detail="Invalid data type")
    
    collection_name = collection_map[data_type]
    collection = db[collection_name]
    
    result = await collection.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return {"message": "Record deleted successfully"}

# Public autocomplete endpoint (no auth required) for /add page
@router.get("/public/autocomplete")
async def public_autocomplete_search(
    q: str,
    data_type: Optional[str] = None
):
    """Public autocomplete for /add page - search by name, phone, or email"""
    if len(q) < 3:
        return []
    
    search_regex = {"$regex": q, "$options": "i"}
    results = []
    
    # Search students
    if data_type in [None, "students"]:
        students = await db.student_inquiries.find(
            {"$or": [{"name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "name": 1, "phone": 1, "email": 1, "city": 1, "age_group": 1, "skill": 1, "learning_mode": 1}
        ).limit(5).to_list(5)
        for s in students:
            s["type"] = "student"
            results.append(s)
    
    # Search schools
    if data_type in [None, "schools"]:
        schools = await db.school_inquiries.find(
            {"$or": [{"school_name": search_regex}, {"contact_name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "school_name": 1, "contact_name": 1, "phone": 1, "email": 1, "location": 1, "board": 1, "student_count": 1}
        ).limit(5).to_list(5)
        for s in schools:
            s["type"] = "school"
            s["name"] = s.get("school_name") or s.get("contact_name")
            results.append(s)
    
    # Search educators
    if data_type in [None, "educators"]:
        educators = await db.educator_applications.find(
            {"$or": [{"name": search_regex}, {"phone": search_regex}, {"email": search_regex}]},
            {"_id": 0, "name": 1, "phone": 1, "email": 1, "city": 1, "skills": 1}
        ).limit(5).to_list(5)
        for e in educators:
            e["type"] = "educator"
            results.append(e)
    
    return results[:10]

# School Offerings endpoint
@router.get("/school-offerings")
async def get_school_offerings():
    """Get all school offerings for selection"""
    offerings = await db.school_offerings.find({}, {"_id": 0}).to_list(100)
    if not offerings:
        # Return comprehensive offerings matching the website
        return [
            # Robotics Programs (12)
            {"id": "robotics-curriculum-kits", "title": "Robotics Curriculum with Take-home Kits & Books", "category": "Robotics", "type": "curriculum"},
            {"id": "robotics-lab-setup", "title": "Robotics Curriculum with Lab Setup & Books", "category": "Robotics", "type": "lab"},
            {"id": "robotics-exhibition-prep", "title": "Robotics Exhibition Preparation", "category": "Robotics", "type": "event"},
            {"id": "host-robotics-exhibition", "title": "Host a Robotics Exhibition in Your School", "category": "Robotics", "type": "event"},
            {"id": "iit-bombay-competitions", "title": "Participate in Robotics Competitions at IIT Bombay", "category": "Robotics", "type": "competition"},
            {"id": "robotics-competition-prep", "title": "Preparation for Robotics Competitions", "category": "Robotics", "type": "competition"},
            {"id": "icse-group3-kits", "title": "Grade 9 & 10 ICSE Group 3 Subject Kits", "category": "Robotics", "type": "curriculum"},
            {"id": "afterschool-robotics", "title": "Afterschool Robotics Classes", "category": "Robotics", "type": "afterschool"},
            {"id": "robotics-summer-camp", "title": "Robotics Summer Camp", "category": "Robotics", "type": "camp"},
            {"id": "robotics-ai-seminar", "title": "Robotics & AI Seminar for Students", "category": "Robotics", "type": "seminar"},
            {"id": "robotics-books", "title": "Robotics Books", "category": "Robotics", "type": "materials"},
            {"id": "robotics-kits", "title": "Robotics Kits", "category": "Robotics", "type": "materials"},
            
            # Financial Literacy & Entrepreneurship Programs (5)
            {"id": "entrepreneurship-workshop", "title": "Entrepreneurship 3 Day Workshop", "category": "Financial Literacy", "type": "workshop"},
            {"id": "skill-titans-olympiad", "title": "Skill Titans TV Show & Entrepreneurship Olympiad", "category": "Financial Literacy", "type": "competition"},
            {"id": "fl-curriculum", "title": "Financial Literacy & Entrepreneurship Program as Part of Curriculum", "category": "Financial Literacy", "type": "curriculum"},
            {"id": "ecell-opening", "title": "E-Cell Opening in School", "category": "Financial Literacy", "type": "program"},
            {"id": "fl-summer-camp", "title": "Financial Literacy & Entrepreneurship Summer Camp", "category": "Financial Literacy", "type": "camp"},
            
            # AI & Machine Learning Programs (5)
            {"id": "ai-center-excellence", "title": "Launch an AI Center for Excellence", "category": "AI & ML", "type": "lab"},
            {"id": "agentic-ai-workshop", "title": "Agentic AI Workshop for Students", "category": "AI & ML", "type": "workshop"},
            {"id": "ai-seminar", "title": "AI Seminar", "category": "AI & ML", "type": "seminar"},
            {"id": "agentic-ai-summer-camp", "title": "Agentic AI Summer Camp", "category": "AI & ML", "type": "camp"},
            {"id": "ai-services-agency-course", "title": "Start AI Services Agency Course for College Students", "category": "AI & ML", "type": "course"},
            
            # Coding & Programming Programs (3)
            {"id": "vibe-coding-seminar", "title": "Vibe Coding Seminar", "category": "Coding", "type": "seminar"},
            {"id": "coding-afterschool", "title": "Coding & Logic Building After School Classes", "category": "Coding", "type": "afterschool"},
            {"id": "coding-summer-camp", "title": "Coding Summer Camp", "category": "Coding", "type": "camp"},
        ]
    return offerings

@router.get("/partner-schools")
async def get_partner_schools():
    """Get list of partner schools for display"""
    schools = await db.partner_schools.find({"is_active": True}, {"_id": 0}).to_list(100)
    if not schools:
        # Return default partner schools if none in DB
        return [
            "Greenlawns High School", "G.D. Somani Memorial School", "N.L. Dalmia High School",
            "Hiranandani Foundation School", "JBCN International School", "Seven Square Academy",
            "Goregaon Education Society English Medium School", "Sanjeevani World School",
            "Fravashi International Academy", "Maneckji Cooper Education Trust", "Excelsior School",
            "J.N. Petit School", "Seth Anandram Jaipuria School", "St. Kabir School",
            "St. Gregorios High School", "St. Anne's High School Fort", "St. Wilfred's School",
            "Manav Mandir High School", "Jankidevi Public School", "Guardian School",
            "Parle Tilak Vidyalaya", "JB Vachha High School", "Vedas International School",
            "C.N.M. & N.D. Parekh ICSE School", "Ram Ratna International School", "Navodaya Central School"
        ]
    return [s.get("name", s) for s in schools]

# ========================
# ABOUT PAGE ENDPOINTS
# ========================

@router.get("/about", response_model=AboutContent)
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

@router.patch("/about", response_model=AboutContent)
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

@router.get("/demo-slots")
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

@router.get("/dashboard/stats")
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

@router.get("/cities", response_model=List[City])
async def get_cities(search: Optional[str] = None, active_only: bool = False):
    query = {}
    if active_only:
        query["is_active"] = True
    cities = await db.cities.find(query, {"_id": 0}).sort([("state", 1), ("name", 1)]).to_list(2000)
    if search:
        s = search.lower()
        cities = [c for c in cities if s in c.get("name", "").lower() or s in c.get("state", "").lower()]
    return cities


@router.post("/cities/seed-india")
async def seed_india_cities(user: dict = Depends(get_current_user)):
    """Seed the DB with all India cities and states. Skips cities already present (by name)."""
    INDIA_CITIES = [
        # Andhra Pradesh
        ("Visakhapatnam", "Andhra Pradesh"), ("Vijayawada", "Andhra Pradesh"), ("Guntur", "Andhra Pradesh"),
        ("Nellore", "Andhra Pradesh"), ("Kurnool", "Andhra Pradesh"), ("Rajahmundry", "Andhra Pradesh"),
        ("Tirupati", "Andhra Pradesh"), ("Kakinada", "Andhra Pradesh"), ("Kadapa", "Andhra Pradesh"),
        ("Anantapur", "Andhra Pradesh"), ("Vizianagaram", "Andhra Pradesh"), ("Eluru", "Andhra Pradesh"),
        ("Ongole", "Andhra Pradesh"), ("Nandyal", "Andhra Pradesh"), ("Chittoor", "Andhra Pradesh"),
        # Arunachal Pradesh
        ("Itanagar", "Arunachal Pradesh"), ("Naharlagun", "Arunachal Pradesh"),
        # Assam
        ("Guwahati", "Assam"), ("Silchar", "Assam"), ("Dibrugarh", "Assam"), ("Jorhat", "Assam"),
        ("Nagaon", "Assam"), ("Tinsukia", "Assam"), ("Tezpur", "Assam"), ("Bongaigaon", "Assam"),
        # Bihar
        ("Patna", "Bihar"), ("Gaya", "Bihar"), ("Bhagalpur", "Bihar"), ("Muzaffarpur", "Bihar"),
        ("Darbhanga", "Bihar"), ("Purnia", "Bihar"), ("Arrah", "Bihar"), ("Begusarai", "Bihar"),
        ("Katihar", "Bihar"), ("Munger", "Bihar"), ("Chapra", "Bihar"), ("Saharsa", "Bihar"),
        ("Sitamarhi", "Bihar"), ("Hajipur", "Bihar"), ("Bihar Sharif", "Bihar"),
        # Chhattisgarh
        ("Raipur", "Chhattisgarh"), ("Bhilai", "Chhattisgarh"), ("Bilaspur", "Chhattisgarh"),
        ("Korba", "Chhattisgarh"), ("Durg", "Chhattisgarh"), ("Raigarh", "Chhattisgarh"),
        ("Rajnandgaon", "Chhattisgarh"), ("Jagdalpur", "Chhattisgarh"), ("Ambikapur", "Chhattisgarh"),
        # Goa
        ("Panaji", "Goa"), ("Vasco da Gama", "Goa"), ("Margao", "Goa"), ("Mapusa", "Goa"),
        # Gujarat
        ("Ahmedabad", "Gujarat"), ("Surat", "Gujarat"), ("Vadodara", "Gujarat"), ("Rajkot", "Gujarat"),
        ("Bhavnagar", "Gujarat"), ("Jamnagar", "Gujarat"), ("Junagadh", "Gujarat"), ("Gandhinagar", "Gujarat"),
        ("Gandhidham", "Gujarat"), ("Anand", "Gujarat"), ("Navsari", "Gujarat"), ("Morbi", "Gujarat"),
        ("Nadiad", "Gujarat"), ("Surendranagar", "Gujarat"), ("Bharuch", "Gujarat"), ("Mehsana", "Gujarat"),
        ("Bhuj", "Gujarat"), ("Porbandar", "Gujarat"), ("Palanpur", "Gujarat"), ("Valsad", "Gujarat"),
        # Haryana
        ("Faridabad", "Haryana"), ("Gurugram", "Haryana"), ("Panipat", "Haryana"), ("Ambala", "Haryana"),
        ("Yamunanagar", "Haryana"), ("Rohtak", "Haryana"), ("Hisar", "Haryana"), ("Karnal", "Haryana"),
        ("Sonipat", "Haryana"), ("Panchkula", "Haryana"), ("Bhiwani", "Haryana"), ("Sirsa", "Haryana"),
        ("Bahadurgarh", "Haryana"), ("Rewari", "Haryana"), ("Kurukshetra", "Haryana"),
        # Himachal Pradesh
        ("Shimla", "Himachal Pradesh"), ("Dharamshala", "Himachal Pradesh"), ("Solan", "Himachal Pradesh"),
        ("Mandi", "Himachal Pradesh"), ("Baddi", "Himachal Pradesh"), ("Kullu", "Himachal Pradesh"),
        # Jharkhand
        ("Ranchi", "Jharkhand"), ("Jamshedpur", "Jharkhand"), ("Dhanbad", "Jharkhand"),
        ("Bokaro", "Jharkhand"), ("Hazaribagh", "Jharkhand"), ("Deoghar", "Jharkhand"),
        ("Giridih", "Jharkhand"), ("Ramgarh", "Jharkhand"),
        # Karnataka
        ("Bangalore", "Karnataka"), ("Mysore", "Karnataka"), ("Hubli", "Karnataka"),
        ("Mangalore", "Karnataka"), ("Belgaum", "Karnataka"), ("Gulbarga", "Karnataka"),
        ("Davangere", "Karnataka"), ("Bellary", "Karnataka"), ("Shimoga", "Karnataka"),
        ("Tumkur", "Karnataka"), ("Udupi", "Karnataka"), ("Bijapur", "Karnataka"),
        ("Hassan", "Karnataka"), ("Bidar", "Karnataka"), ("Raichur", "Karnataka"),
        ("Dharwad", "Karnataka"), ("Bagalkot", "Karnataka"), ("Chitradurga", "Karnataka"),
        ("Hospet", "Karnataka"), ("Gadag", "Karnataka"),
        # Kerala
        ("Thiruvananthapuram", "Kerala"), ("Kochi", "Kerala"), ("Kozhikode", "Kerala"),
        ("Thrissur", "Kerala"), ("Kollam", "Kerala"), ("Alappuzha", "Kerala"),
        ("Kannur", "Kerala"), ("Palakkad", "Kerala"), ("Kottayam", "Kerala"),
        ("Malappuram", "Kerala"), ("Irinjalakuda", "Kerala"), ("Kasaragod", "Kerala"),
        # Madhya Pradesh
        ("Indore", "Madhya Pradesh"), ("Bhopal", "Madhya Pradesh"), ("Jabalpur", "Madhya Pradesh"),
        ("Gwalior", "Madhya Pradesh"), ("Ujjain", "Madhya Pradesh"), ("Sagar", "Madhya Pradesh"),
        ("Dewas", "Madhya Pradesh"), ("Satna", "Madhya Pradesh"), ("Ratlam", "Madhya Pradesh"),
        ("Rewa", "Madhya Pradesh"), ("Murwara", "Madhya Pradesh"), ("Singrauli", "Madhya Pradesh"),
        ("Burhanpur", "Madhya Pradesh"), ("Khandwa", "Madhya Pradesh"), ("Bhind", "Madhya Pradesh"),
        ("Chhindwara", "Madhya Pradesh"), ("Guna", "Madhya Pradesh"), ("Shivpuri", "Madhya Pradesh"),
        ("Vidisha", "Madhya Pradesh"), ("Damoh", "Madhya Pradesh"), ("Mandsaur", "Madhya Pradesh"),
        ("Neemuch", "Madhya Pradesh"), ("Itarsi", "Madhya Pradesh"),
        # Maharashtra
        ("Mumbai", "Maharashtra"), ("Pune", "Maharashtra"), ("Nagpur", "Maharashtra"),
        ("Thane", "Maharashtra"), ("Nashik", "Maharashtra"), ("Aurangabad", "Maharashtra"),
        ("Solapur", "Maharashtra"), ("Kolhapur", "Maharashtra"), ("Navi Mumbai", "Maharashtra"),
        ("Amravati", "Maharashtra"), ("Sangli", "Maharashtra"), ("Pimpri-Chinchwad", "Maharashtra"),
        ("Akola", "Maharashtra"), ("Latur", "Maharashtra"), ("Dhule", "Maharashtra"),
        ("Ahmednagar", "Maharashtra"), ("Chandrapur", "Maharashtra"), ("Parbhani", "Maharashtra"),
        ("Jalgaon", "Maharashtra"), ("Bhiwandi", "Maharashtra"), ("Jalna", "Maharashtra"),
        ("Nanded", "Maharashtra"), ("Osmanabad", "Maharashtra"), ("Ratnagiri", "Maharashtra"),
        ("Satara", "Maharashtra"), ("Beed", "Maharashtra"), ("Wardha", "Maharashtra"),
        ("Yavatmal", "Maharashtra"), ("Buldhana", "Maharashtra"), ("Vasai-Virar", "Maharashtra"),
        ("Mira-Bhayandar", "Maharashtra"), ("Kalyan", "Maharashtra"), ("Ulhasnagar", "Maharashtra"),
        # Manipur
        ("Imphal", "Manipur"),
        # Meghalaya
        ("Shillong", "Meghalaya"),
        # Mizoram
        ("Aizawl", "Mizoram"),
        # Nagaland
        ("Kohima", "Nagaland"), ("Dimapur", "Nagaland"),
        # Odisha
        ("Bhubaneswar", "Odisha"), ("Cuttack", "Odisha"), ("Rourkela", "Odisha"),
        ("Brahmapur", "Odisha"), ("Sambalpur", "Odisha"), ("Puri", "Odisha"),
        ("Balasore", "Odisha"), ("Bhadrak", "Odisha"), ("Baripada", "Odisha"),
        ("Jharsuguda", "Odisha"), ("Bargarh", "Odisha"),
        # Punjab
        ("Ludhiana", "Punjab"), ("Amritsar", "Punjab"), ("Jalandhar", "Punjab"),
        ("Patiala", "Punjab"), ("Bathinda", "Punjab"), ("Pathankot", "Punjab"),
        ("Hoshiarpur", "Punjab"), ("Batala", "Punjab"), ("Moga", "Punjab"),
        ("Mohali", "Punjab"), ("Abohar", "Punjab"), ("Phagwara", "Punjab"),
        # Rajasthan
        ("Jaipur", "Rajasthan"), ("Jodhpur", "Rajasthan"), ("Kota", "Rajasthan"),
        ("Bikaner", "Rajasthan"), ("Ajmer", "Rajasthan"), ("Udaipur", "Rajasthan"),
        ("Bhilwara", "Rajasthan"), ("Alwar", "Rajasthan"), ("Bharatpur", "Rajasthan"),
        ("Sikar", "Rajasthan"), ("Sri Ganganagar", "Rajasthan"), ("Pali", "Rajasthan"),
        ("Beawar", "Rajasthan"), ("Hanumangarh", "Rajasthan"), ("Gangapur City", "Rajasthan"),
        ("Churu", "Rajasthan"), ("Jhunjhunu", "Rajasthan"), ("Sawai Madhopur", "Rajasthan"),
        ("Tonk", "Rajasthan"), ("Barmer", "Rajasthan"), ("Jaisalmer", "Rajasthan"),
        # Sikkim
        ("Gangtok", "Sikkim"),
        # Tamil Nadu
        ("Chennai", "Tamil Nadu"), ("Coimbatore", "Tamil Nadu"), ("Madurai", "Tamil Nadu"),
        ("Tiruchirappalli", "Tamil Nadu"), ("Salem", "Tamil Nadu"), ("Tirunelveli", "Tamil Nadu"),
        ("Tiruppur", "Tamil Nadu"), ("Vellore", "Tamil Nadu"), ("Erode", "Tamil Nadu"),
        ("Thoothukudi", "Tamil Nadu"), ("Dindigul", "Tamil Nadu"), ("Thanjavur", "Tamil Nadu"),
        ("Ranipet", "Tamil Nadu"), ("Sivakasi", "Tamil Nadu"), ("Karur", "Tamil Nadu"),
        ("Udhagamandalam", "Tamil Nadu"), ("Hosur", "Tamil Nadu"), ("Nagercoil", "Tamil Nadu"),
        ("Kancheepuram", "Tamil Nadu"), ("Kumarapalayam", "Tamil Nadu"),
        # Telangana
        ("Hyderabad", "Telangana"), ("Warangal", "Telangana"), ("Nizamabad", "Telangana"),
        ("Karimnagar", "Telangana"), ("Khammam", "Telangana"), ("Ramagundam", "Telangana"),
        ("Secunderabad", "Telangana"), ("Mahbubnagar", "Telangana"), ("Nalgonda", "Telangana"),
        ("Adilabad", "Telangana"), ("Suryapet", "Telangana"), ("Mancherial", "Telangana"),
        # Tripura
        ("Agartala", "Tripura"),
        # Uttar Pradesh
        ("Lucknow", "Uttar Pradesh"), ("Kanpur", "Uttar Pradesh"), ("Ghaziabad", "Uttar Pradesh"),
        ("Agra", "Uttar Pradesh"), ("Varanasi", "Uttar Pradesh"), ("Meerut", "Uttar Pradesh"),
        ("Prayagraj", "Uttar Pradesh"), ("Noida", "Uttar Pradesh"), ("Bareilly", "Uttar Pradesh"),
        ("Aligarh", "Uttar Pradesh"), ("Moradabad", "Uttar Pradesh"), ("Saharanpur", "Uttar Pradesh"),
        ("Gorakhpur", "Uttar Pradesh"), ("Firozabad", "Uttar Pradesh"), ("Jhansi", "Uttar Pradesh"),
        ("Muzaffarnagar", "Uttar Pradesh"), ("Mathura", "Uttar Pradesh"), ("Rampur", "Uttar Pradesh"),
        ("Shahjahanpur", "Uttar Pradesh"), ("Farrukhabad", "Uttar Pradesh"), ("Hapur", "Uttar Pradesh"),
        ("Etawah", "Uttar Pradesh"), ("Mirzapur", "Uttar Pradesh"), ("Bulandshahr", "Uttar Pradesh"),
        ("Sambhal", "Uttar Pradesh"), ("Amroha", "Uttar Pradesh"), ("Hardoi", "Uttar Pradesh"),
        ("Fatehpur", "Uttar Pradesh"), ("Raebareli", "Uttar Pradesh"), ("Orai", "Uttar Pradesh"),
        ("Sitapur", "Uttar Pradesh"), ("Bahraich", "Uttar Pradesh"), ("Modinagar", "Uttar Pradesh"),
        ("Unnao", "Uttar Pradesh"), ("Jaunpur", "Uttar Pradesh"), ("Lakhimpur", "Uttar Pradesh"),
        ("Hathras", "Uttar Pradesh"), ("Banda", "Uttar Pradesh"), ("Pilibhit", "Uttar Pradesh"),
        ("Barabanki", "Uttar Pradesh"), ("Khurja", "Uttar Pradesh"), ("Gonda", "Uttar Pradesh"),
        ("Greater Noida", "Uttar Pradesh"), ("Ayodhya", "Uttar Pradesh"), ("Vrindavan", "Uttar Pradesh"),
        # Uttarakhand
        ("Dehradun", "Uttarakhand"), ("Haridwar", "Uttarakhand"), ("Roorkee", "Uttarakhand"),
        ("Haldwani", "Uttarakhand"), ("Rudrapur", "Uttarakhand"), ("Kashipur", "Uttarakhand"),
        ("Rishikesh", "Uttarakhand"), ("Kotdwar", "Uttarakhand"),
        # West Bengal
        ("Kolkata", "West Bengal"), ("Asansol", "West Bengal"), ("Siliguri", "West Bengal"),
        ("Durgapur", "West Bengal"), ("Bardhaman", "West Bengal"), ("Malda", "West Bengal"),
        ("Baharampur", "West Bengal"), ("Habra", "West Bengal"), ("Kharagpur", "West Bengal"),
        ("Shantipur", "West Bengal"), ("Raiganj", "West Bengal"), ("Darjeeling", "West Bengal"),
        ("Jalpaiguri", "West Bengal"), ("Bankura", "West Bengal"),
        # Union Territories
        ("New Delhi", "Delhi"), ("Delhi", "Delhi"), ("Dwarka", "Delhi"), ("Rohini", "Delhi"),
        ("Chandigarh", "Chandigarh"), ("Panchkula", "Chandigarh"),
        ("Puducherry", "Puducherry"),
        ("Srinagar", "Jammu & Kashmir"), ("Jammu", "Jammu & Kashmir"), ("Leh", "Ladakh"),
        ("Port Blair", "Andaman & Nicobar Islands"),
        ("Silvassa", "Dadra & Nagar Haveli"), ("Daman", "Daman & Diu"),
        ("Kavaratti", "Lakshadweep"),
    ]

    # Get existing city names (case-insensitive)
    existing = await db.cities.find({}, {"_id": 0, "name": 1}).to_list(5000)
    existing_names = {c["name"].lower() for c in existing}

    # Also update existing cities with missing states
    existing_full = await db.cities.find({}, {"_id": 0}).to_list(5000)
    city_state_map = {name.lower(): state for name, state in INDIA_CITIES}
    for city in existing_full:
        if not city.get("state") and city.get("name", "").lower() in city_state_map:
            await db.cities.update_one(
                {"id": city["id"]},
                {"$set": {"state": city_state_map[city["name"].lower()]}}
            )

    # Insert new cities
    inserted = 0
    order_start = await db.cities.count_documents({})
    for i, (name, state) in enumerate(INDIA_CITIES):
        if name.lower() not in existing_names:
            city_data = {
                "id": str(uuid.uuid4()),
                "name": name,
                "state": state,
                "is_active": True,
                "has_center": False,
                "order": order_start + i + 1,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.cities.insert_one(city_data)
            existing_names.add(name.lower())
            inserted += 1

    total = await db.cities.count_documents({})
    return {"message": f"Seeded {inserted} new cities. Total: {total} cities in DB."}


@router.post("/cities", response_model=City)
async def create_city(city: CityCreate):
    city_data = City(**city.model_dump())
    await db.cities.insert_one(city_data.model_dump())
    return city_data

@router.patch("/cities/{city_id}", response_model=City)
async def update_city(city_id: str, city_update: CityUpdate):
    update_data = {k: v for k, v in city_update.model_dump().items() if v is not None}
    if update_data:
        await db.cities.update_one({"id": city_id}, {"$set": update_data})
    city = await db.cities.find_one({"id": city_id}, {"_id": 0})
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    return city

@router.delete("/cities/{city_id}")
async def delete_city(city_id: str):
    result = await db.cities.delete_one({"id": city_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="City not found")
    return {"message": "City deleted"}

@router.post("/cities/reorder")
async def reorder_cities(city_orders: List[dict]):
    for item in city_orders:
        await db.cities.update_one({"id": item["id"]}, {"$set": {"order": item["order"]}})
    return {"message": "Cities reordered"}

# ========================
# CENTER ENDPOINTS
# ========================

@router.get("/centers", response_model=List[Center])
async def get_centers():
    centers = await db.centers.find({}, {"_id": 0}).to_list(100)
    return centers

@router.get("/centers/by-city/{city}")
async def get_centers_by_city(city: str):
    centers = await db.centers.find({"city": city, "is_active": True}, {"_id": 0}).to_list(100)
    return centers

@router.post("/centers", response_model=Center)
async def create_center(center: CenterCreate):
    center_data = Center(**center.model_dump())
    await db.centers.insert_one(center_data.model_dump())
    # Update city to mark it has a center
    await db.cities.update_one({"name": center.city}, {"$set": {"has_center": True}})
    return center_data

@router.patch("/centers/{center_id}", response_model=Center)
async def update_center(center_id: str, center_update: CenterUpdate):
    update_data = {k: v for k, v in center_update.model_dump().items() if v is not None}
    if update_data:
        await db.centers.update_one({"id": center_id}, {"$set": update_data})
    center = await db.centers.find_one({"id": center_id}, {"_id": 0})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
    return center

@router.delete("/centers/{center_id}")
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
    ticket_number: str = ""
    inquiry_type: str  # student, school, growth_partner, teacher, team
    action_type: str = "query"
    name: str = ""
    phone: str = ""
    email: str = ""
    query_type: str  # demo_related, payment, course_info, technical, partnership, feedback, other
    related_to: str = ""  # sub-category within query_type
    query_details: str = ""
    priority: str = "normal"  # low, normal, high, urgent
    source: str = "team_inquiry_form"
    page_context: str = ""  # which page the query was submitted from
    status: str = "open"  # open, in_progress, resolved, closed
    attachments: List[dict] = []  # [{name, url, type, is_voice_note}]
    added_by: str = ""
    added_by_name: str = ""
    viewers: List[str] = []  # Array of user IDs who can view this query
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@router.post("/inquiry/lead")
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

@router.post("/inquiry/query")
async def create_inquiry_query(data: dict):
    query = InquiryQuery(**data)
    doc = query.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['ticket_number'] = await get_next_ticket_number()

    # Get added_by user info and add as viewer
    added_by = data.get('added_by', '')
    if added_by:
        # Initialize viewers with the creator
        doc['viewers'] = [added_by]
        # Fetch user name for display
        user = await db.team_users.find_one({"id": added_by}, {"_id": 0})
        if not user:
            user = await db.admins.find_one({"id": added_by}, {"_id": 0})
        if user:
            doc['added_by_name'] = user.get('name', '')
    else:
        doc['viewers'] = []

    # Store in inquiry_queries collection (ticketing system)
    await db.inquiry_queries.insert_one(doc)

    return {"message": "Query submitted successfully", "id": doc['id'], "ticket_number": doc['ticket_number']}

@router.get("/inquiry/leads")
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

@router.get("/inquiry/queries")
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
    
    # Non-admin users can only see queries assigned to them, where they are viewers, or created by them
    user_role = user.get("role", "")
    user_id = user.get("id") or user.get("email")
    
    if user_role not in ["admin", "super_admin"]:
        user_filter = {
            "$or": [
                {"assigned_to": user_id},
                {"viewers": user_id},
                {"added_by": user_id},
                {"added_by": user.get("email")}
            ]
        }
        if query:
            query = {"$and": [query, user_filter]}
        else:
            query = user_filter
    
    queries = await db.inquiry_queries.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return queries

@router.patch("/inquiry/leads/{lead_id}")
async def update_inquiry_lead(lead_id: str, data: dict, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.items() if v is not None}
    await db.inquiry_leads.update_one({"id": lead_id}, {"$set": update_data})
    return {"message": "Lead updated successfully"}

@router.patch("/inquiry/queries/{query_id}")
async def update_inquiry_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Auto-set resolved_at when status → resolved/closed (if not already set)
    if data.get("status") in ("resolved", "closed"):
        existing = await db.inquiry_queries.find_one({"id": query_id}, {"_id": 0, "resolved_at": 1})
        if not (existing or {}).get("resolved_at"):
            update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    elif data.get("status") in ("new", "open", "in_progress"):
        update_data["resolved_at"] = None

    await db.inquiry_queries.update_one({"id": query_id}, {"$set": update_data})
    return {"message": "Query updated successfully"}

@router.post("/inquiry/queries/{query_id}/assign")
async def assign_inquiry_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Assign an inquiry query to a user with optional deadline"""
    assigned_to = data.get("assigned_to")
    deadline = data.get("deadline")
    
    # Get the query
    query = await db.inquiry_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Handle unassign case
    if not assigned_to or assigned_to == "":
        await db.inquiry_queries.update_one(
            {"id": query_id}, 
            {"$set": {"assigned_to": None, "deadline": None}}
        )
        return {"message": "Query unassigned"}
    
    # Get the user being assigned
    assignee = await db.team_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.center_users.find_one({"id": assigned_to}, {"_id": 0})
    if not assignee:
        assignee = await db.admins.find_one({"id": assigned_to}, {"_id": 0})
    
    assignee_name = assignee.get("name", "Team Member") if assignee else "Unknown"
    
    # Update the query with assignment
    update_data = {
        "assigned_to": assigned_to,
        "assigned_to_name": assignee_name,
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "assigned_by": user.get("email", "admin"),
        "deadline": deadline,
        "status": "in_progress" if query.get("status") == "open" else query.get("status")
    }
    
    activity = {
        "type": "assigned",
        "assigned_to": assigned_to,
        "assigned_to_name": assignee_name,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inquiry_queries.update_one(
        {"id": query_id}, 
        {"$set": update_data, "$push": {"activity_history": activity}}
    )
    
    return {"message": "Query assigned successfully", "assigned_to": assignee_name}

@router.delete("/inquiry/queries/{query_id}")
async def delete_inquiry_query(query_id: str, user: dict = Depends(get_current_user)):
    """Delete an inquiry query"""
    # Only admin can delete
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete queries")
    
    result = await db.inquiry_queries.delete_one({"id": query_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return {"message": "Query deleted successfully"}

@router.post("/inquiry/queries/{query_id}/viewers")
async def manage_inquiry_query_viewers(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add or remove viewers from an inquiry query"""
    action = data.get("action", "add")
    viewer_id = data.get("viewer_id")
    
    if not viewer_id:
        raise HTTPException(status_code=400, detail="viewer_id is required")
    
    query = await db.inquiry_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    viewer = await db.team_users.find_one({"id": viewer_id}, {"_id": 0})
    if not viewer:
        viewer = await db.admins.find_one({"id": viewer_id}, {"_id": 0})
    viewer_name = viewer.get("name", "Unknown") if viewer else "Unknown"
    
    activity = {
        "type": "viewer_added" if action == "add" else "viewer_removed",
        "viewer_id": viewer_id,
        "viewer_name": viewer_name,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    if action == "add":
        await db.inquiry_queries.update_one(
            {"id": query_id},
            {"$addToSet": {"viewers": viewer_id}, "$push": {"activity_history": activity}}
        )
        return {"message": f"Viewer {viewer_name} added successfully"}
    else:
        await db.inquiry_queries.update_one(
            {"id": query_id},
            {"$pull": {"viewers": viewer_id}, "$push": {"activity_history": activity}}
        )
        return {"message": f"Viewer {viewer_name} removed successfully"}

# ========================
# HEALTH CHECK
# ========================

@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.post("/admin/optimize-db")
async def optimize_database(user: dict = Depends(get_current_user)):
    """Manually trigger database index creation for better performance"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can optimize database")
    
    indexes_created = []
    try:
        # School Inquiries indexes
        await db.school_inquiries.create_index("id", unique=True)
        await db.school_inquiries.create_index("status")
        await db.school_inquiries.create_index("assigned_to")
        await db.school_inquiries.create_index("created_at")
        await db.school_inquiries.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("school_inquiries")
        
        # Student Inquiries indexes
        await db.student_inquiries.create_index("id", unique=True)
        await db.student_inquiries.create_index("status")
        await db.student_inquiries.create_index("assigned_to")
        await db.student_inquiries.create_index("demo_date")
        await db.student_inquiries.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("student_inquiries")
        
        # Educator Applications indexes
        await db.educator_applications.create_index("id", unique=True)
        await db.educator_applications.create_index("status")
        await db.educator_applications.create_index("assigned_to")
        await db.educator_applications.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("educator_applications")
        
        # Support Queries indexes
        await db.support_queries.create_index("id", unique=True)
        await db.support_queries.create_index("status")
        await db.support_queries.create_index("assigned_to")
        await db.support_queries.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("support_queries")
        
        # Inquiry Queries indexes
        await db.inquiry_queries.create_index("id", unique=True)
        await db.inquiry_queries.create_index("status")
        await db.inquiry_queries.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("inquiry_queries")
        
        # Support Tickets indexes
        await db.support_tickets.create_index("id", unique=True)
        await db.support_tickets.create_index("status")
        await db.support_tickets.create_index("source")
        await db.support_tickets.create_index([("status", 1), ("created_at", -1)])
        indexes_created.append("support_tickets")
        
        # Team Users indexes
        await db.team_users.create_index("id", unique=True)
        await db.team_users.create_index("email")
        indexes_created.append("team_users")
        
        # School Expenses indexes
        await db.school_expenses.create_index("id", unique=True)
        await db.school_expenses.create_index("school_id")
        await db.school_expenses.create_index([("school_id", 1), ("created_at", -1)])
        indexes_created.append("school_expenses")
        
        # External API Keys indexes
        await db.external_api_keys.create_index("id", unique=True)
        await db.external_api_keys.create_index("key", unique=True)
        indexes_created.append("external_api_keys")
        
        # GP Applications indexes
        await db.gp_applications.create_index("id", unique=True)
        await db.gp_applications.create_index("status")
        indexes_created.append("gp_applications")
        
        # Growth Partners indexes
        await db.growth_partners.create_index("id", unique=True)
        await db.growth_partners.create_index("status")
        indexes_created.append("growth_partners")
        
        # ═══ PAYMENT & HIGH-TRAFFIC INDEXES ═══════════════════════════════
        # Student Payments - Critical for payment lookups
        await db.student_payments.create_index("id", unique=True)
        await db.student_payments.create_index("school_id")
        await db.student_payments.create_index("student_id")
        await db.student_payments.create_index("order_id")
        await db.student_payments.create_index("payment_status")
        await db.student_payments.create_index([("school_id", 1), ("payment_status", 1)])
        await db.student_payments.create_index([("school_id", 1), ("created_at", -1)])
        indexes_created.append("student_payments")
        
        # School Payments - For school-level payment tracking
        await db.school_payments.create_index("id", unique=True)
        await db.school_payments.create_index("school_id")
        await db.school_payments.create_index("order_id")
        await db.school_payments.create_index([("school_id", 1), ("created_at", -1)])
        indexes_created.append("school_payments")
        
        # Students - For student lookups during payments
        await db.students.create_index("id", unique=True)
        await db.students.create_index("school_id")
        await db.students.create_index("phone")
        await db.students.create_index("email")
        await db.students.create_index([("school_id", 1), ("status", 1)])
        indexes_created.append("students")
        
        # Blogs - For public-facing blog queries
        await db.blogs.create_index("id", unique=True)
        await db.blogs.create_index("slug", unique=True)
        await db.blogs.create_index("status")
        await db.blogs.create_index([("status", 1), ("published_at", -1)])
        indexes_created.append("blogs")
        
        # Sessions - For auth lookups
        await db.sessions.create_index("token", unique=True)
        await db.sessions.create_index("user_id")
        await db.sessions.create_index("expires_at")
        indexes_created.append("sessions")
        
        return {
            "message": "Database optimization complete",
            "indexes_created": indexes_created,
            "collections_optimized": len(indexes_created)
        }
    except Exception as e:
        return {
            "message": f"Partial optimization - some indexes may already exist: {str(e)}",
            "indexes_created": indexes_created
        }

@router.get("/admin/mongodb-info")
async def get_mongodb_info(request: Request, user: dict = Depends(get_current_user)):
    """Get MongoDB connection info for data export/migration"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can access MongoDB info")
    
    try:
        # Get database stats
        db_name = os.environ.get("DB_NAME", "test_database")
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        
        # Get user's IP address
        client_ip = request.client.host if request.client else None
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Build a sanitized connection string (mask password if present)
        connection_display = mongo_url
        if "@" in mongo_url:
            # Has credentials - mask the password
            parts = mongo_url.split("@")
            prefix = parts[0]
            suffix = parts[1]
            if ":" in prefix:
                user_pass = prefix.split("//")[1] if "//" in prefix else prefix
                if ":" in user_pass:
                    username = user_pass.split(":")[0]
                    connection_display = f"mongodb+srv://{username}:****@{suffix}"
        
        # Get collection stats
        collections_info = []
        collection_names = await db.list_collection_names()
        for col_name in sorted(collection_names):
            try:
                count = await db[col_name].count_documents({})
                collections_info.append({"name": col_name, "count": count})
            except:
                collections_info.append({"name": col_name, "count": "N/A"})
        
        # For export, provide the actual connection string (admin only)
        export_connection = f"{mongo_url}/{db_name}"
        if not mongo_url.endswith("/"):
            export_connection = f"{mongo_url}/{db_name}"
        
        # Get whitelisted IPs from database
        whitelisted_ips = []
        try:
            whitelist_docs = await db.mongodb_whitelist.find({}, {"_id": 0}).to_list(100)
            whitelisted_ips = whitelist_docs
        except:
            pass
        
        return {
            "db_name": db_name,
            "connection_string": export_connection,
            "collections": collections_info,
            "total_collections": len(collection_names),
            "export_command": f'mongodump --uri="{export_connection}" --archive=backup.gz --gzip',
            "your_ip": client_ip,
            "whitelisted_ips": whitelisted_ips
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get MongoDB info: {str(e)}")

@router.post("/admin/mongodb-whitelist-ip")
async def whitelist_ip(data: dict, user: dict = Depends(get_current_user)):
    """Add an IP address to the whitelist"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can manage IP whitelist")
    
    ip_address = data.get("ip_address", "").strip()
    description = data.get("description", "")
    
    if not ip_address:
        raise HTTPException(status_code=400, detail="IP address is required")
    
    # Basic IP validation
    import re
    ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^0\.0\.0\.0\/0$'
    if not re.match(ip_pattern, ip_address):
        raise HTTPException(status_code=400, detail="Invalid IP address format")
    
    # Check if already exists
    existing = await db.mongodb_whitelist.find_one({"ip": ip_address})
    if existing:
        raise HTTPException(status_code=400, detail="IP already whitelisted")
    
    # Add to whitelist
    await db.mongodb_whitelist.insert_one({
        "ip": ip_address,
        "description": description,
        "added_by": user.get("email"),
        "added_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"IP {ip_address} added to whitelist", "success": True}

@router.delete("/admin/mongodb-whitelist-ip/{ip_address}")
async def remove_whitelisted_ip(ip_address: str, user: dict = Depends(get_current_user)):
    """Remove an IP address from the whitelist"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can manage IP whitelist")
    
    from urllib.parse import unquote
    ip_address = unquote(ip_address)
    
    result = await db.mongodb_whitelist.delete_one({"ip": ip_address})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="IP not found in whitelist")
    
    return {"message": f"IP {ip_address} removed from whitelist", "success": True}

# Cloudinary signature endpoint for frontend uploads
@router.get("/cloudinary/signature")
async def get_cloudinary_signature(
    resource_type: str = Query("raw", enum=["image", "video", "raw"]),
    folder: str = Query("oll_uploads")
):
    """Generate signed upload parameters for Cloudinary"""
    ALLOWED_FOLDERS = ("oll_uploads", "oll_documents", "oll_images", "oll_mou", "oll_invoices")
    if not any(folder.startswith(f) for f in ALLOWED_FOLDERS):
        folder = "oll_uploads"
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }
    
    signature = _get_cloudinary().utils.api_sign_request(
        params,
        os.getenv("CLOUDINARY_API_SECRET")
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }

# File Upload Endpoint - Uses Cloudinary for cloud storage
@router.post("/upload")
async def upload_file(file: UploadFile = File(...), type: str = "general"):
    """Upload a file to Cloudinary cloud storage"""
    
    allowed_extensions = {'.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.csv'}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Check file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Generate unique public_id — include file extension so Cloudinary serves with correct Content-Type
    unique_id = f"{type}_{uuid.uuid4().hex}{file_ext}"
    folder = f"oll_{type}"
    
    # Determine resource type for Cloudinary
    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
    resource_type = "image" if file_ext in image_extensions else "raw"
    
    try:
        # Upload to Cloudinary
        result = _get_cloudinary().uploader.upload(
            BytesIO(content),
            public_id=unique_id,
            folder=folder,
            resource_type=resource_type,
            overwrite=True
        )
        
        # Get the secure URL
        file_url = result.get("secure_url")
        
        # Store reference in MongoDB for tracking
        file_doc = {
            "filename": unique_id,
            "original_name": file.filename,
            "cloudinary_public_id": result.get("public_id"),
            "cloudinary_url": file_url,
            "resource_type": resource_type,
            "size": len(content),
            "type": type,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        await db.uploaded_files.insert_one(file_doc)
        
        return {"url": file_url, "filename": unique_id, "public_id": result.get("public_id")}
        
    except Exception as e:
        # Fallback to MongoDB storage if Cloudinary fails
        import base64
        unique_filename = unique_id  # unique_id already includes file_ext
        
        content_types = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.csv': 'text/csv'
        }
        content_type = content_types.get(file_ext, 'application/octet-stream')
        
        file_doc = {
            "filename": unique_filename,
            "original_name": file.filename,
            "content_type": content_type,
            "data": base64.b64encode(content).decode('utf-8'),
            "size": len(content),
            "type": type,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "storage": "mongodb_fallback"
        }
        await db.uploaded_files.insert_one(file_doc)
        
        file_url = f"/api/files/{unique_filename}"
        return {"url": file_url, "filename": unique_filename, "fallback": True}

# Serve uploaded files - checks Cloudinary first, then MongoDB, then local
@router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve uploaded files - redirects to Cloudinary URL if available"""
    import base64
    from fastapi.responses import Response, RedirectResponse
    
    # Try to find file in MongoDB
    file_doc = await db.uploaded_files.find_one({"filename": filename})
    
    if file_doc:
        # If file is on Cloudinary, redirect to Cloudinary URL
        if file_doc.get("cloudinary_url"):
            return RedirectResponse(url=file_doc["cloudinary_url"], status_code=302)
        
        # Otherwise serve from MongoDB base64 data
        if file_doc.get("data"):
            content = base64.b64decode(file_doc["data"])
            return Response(
                content=content,
                media_type=file_doc.get("content_type", "application/octet-stream"),
                headers={
                    "Content-Disposition": f'inline; filename="{file_doc.get("original_name", filename)}"'
                }
            )
    
    # Fallback to local file (for backward compatibility)
    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        content_types = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg'
        }
        ext = Path(filename).suffix.lower()
        content_type = content_types.get(ext, 'application/octet-stream')
        
        with open(file_path, "rb") as f:
            content = f.read()
        
        return Response(
            content=content,
            media_type=content_type,
            headers={"Content-Disposition": f'inline; filename="{filename}"'}
        )
    
    raise HTTPException(status_code=404, detail="File not found")

# Backward compatibility: redirect old /api/uploads/ URLs to new /api/files/ endpoint
@router.get("/uploads/{filename}")
async def serve_uploaded_file_legacy(filename: str):
    """Backward compatibility endpoint - redirects to new /api/files/ endpoint"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/api/files/{filename}", status_code=307)

# Admin endpoint to migrate files to Cloudinary
@router.post("/admin/migrate-files-to-cloudinary")
async def migrate_files_to_cloudinary(user: dict = Depends(get_current_user)):
    """Migrate all MongoDB-stored files to Cloudinary for better performance"""
    import base64
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    migrated = 0
    skipped = 0
    errors = []
    
    # Find all files stored in MongoDB (with base64 data)
    cursor = db.uploaded_files.find({"data": {"$exists": True}, "cloudinary_url": {"$exists": False}})
    
    async for file_doc in cursor:
        try:
            filename = file_doc.get("filename", "")
            content = base64.b64decode(file_doc["data"])
            
            # Determine resource type
            ext = Path(filename).suffix.lower()
            image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
            resource_type = "image" if ext in image_extensions else "raw"
            
            # Determine folder from type
            file_type = file_doc.get("type", "general")
            folder = f"oll_{file_type}"
            
            # Upload to Cloudinary
            result = _get_cloudinary().uploader.upload(
                BytesIO(content),
                public_id=Path(filename).stem,
                folder=folder,
                resource_type=resource_type,
                overwrite=True
            )
            await db.uploaded_files.update_one(
                {"_id": file_doc["_id"]},
                {
                    "$set": {
                        "cloudinary_url": result.get("secure_url"),
                        "cloudinary_public_id": result.get("public_id"),
                        "migrated_to_cloudinary": True,
                        "migrated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$unset": {"data": ""}  # Remove base64 data to save space
                }
            )
            
            migrated += 1
        except Exception as e:
            errors.append({"filename": file_doc.get("filename", "unknown"), "error": str(e)})
    
    return {
        "success": True,
        "migrated": migrated,
        "skipped": skipped,
        "errors": errors,
        "message": f"Migrated {migrated} files to Cloudinary"
    }

# Legacy migration endpoint (kept for backward compatibility)
@router.post("/admin/migrate-files")
async def migrate_local_files_to_mongodb(user: dict = Depends(get_current_user)):
    """Migrate all local uploaded files to Cloudinary (updated to use Cloudinary)"""
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    migrated = 0
    skipped = 0
    errors = []
    
    if UPLOAD_DIR.exists():
        for file_path in UPLOAD_DIR.iterdir():
            if file_path.is_file():
                filename = file_path.name
                
                # Check if already migrated
                existing = await db.uploaded_files.find_one({
                    "filename": filename,
                    "cloudinary_url": {"$exists": True}
                })
                if existing:
                    skipped += 1
                    continue
                
                try:
                    with open(file_path, "rb") as f:
                        content = f.read()
                    
                    ext = Path(filename).suffix.lower()
                    
                    # Determine type from filename prefix
                    file_type = "general"
                    for prefix in ["mou_", "invoice_", "receipt_", "resume_", "document_"]:
                        if filename.startswith(prefix):
                            file_type = prefix.rstrip("_")
                            break
                    
                    # Determine resource type
                    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
                    resource_type = "image" if ext in image_extensions else "raw"
                    folder = f"oll_{file_type}"
                    
                    # Upload to Cloudinary
                    result = _get_cloudinary().uploader.upload(
                        BytesIO(content),
                        public_id=Path(filename).stem,
                        folder=folder,
                        resource_type=resource_type,
                        overwrite=True
                    )
                    
                    # Store reference in MongoDB
                    file_doc = {
                        "filename": filename,
                        "original_name": filename,
                        "cloudinary_public_id": result.get("public_id"),
                        "cloudinary_url": result.get("secure_url"),
                        "resource_type": resource_type,
                        "size": len(content),
                        "type": file_type,
                        "uploaded_at": datetime.now(timezone.utc).isoformat(),
                        "migrated": True
                    }
                    
                    # Upsert to avoid duplicates
                    await db.uploaded_files.update_one(
                        {"filename": filename},
                        {"$set": file_doc},
                        upsert=True
                    )
                    
                    migrated += 1
                except Exception as e:
                    errors.append({"filename": filename, "error": str(e)})
    
    return {
        "success": True,
        "migrated": migrated,
        "skipped": skipped,
        "errors": errors,
        "message": f"Migrated {migrated} files to Cloudinary"
    }

# ========================
# BACKGROUND JOB ENDPOINTS - For Cron/Scheduler
# ========================

@router.post("/admin/trigger/overdue-check")
async def trigger_overdue_check(user: dict = Depends(get_current_user)):
    """Manually trigger overdue ticket check"""
    await check_overdue_tickets()
    return {"message": "Overdue ticket check triggered"}

@router.post("/admin/trigger/meeting-reminders")
async def trigger_meeting_reminders(user: dict = Depends(get_current_user)):
    """Manually trigger school meeting reminders check"""
    await check_school_meeting_reminders()
    return {"message": "Meeting reminders check triggered"}

@router.post("/admin/trigger/daily-digest")
async def trigger_daily_digest(user: dict = Depends(get_current_user)):
    """Manually trigger School CRM daily digest email"""
    await send_school_crm_daily_digest()
    return {"message": "Daily digest triggered"}

@router.post("/admin/test/whatsapp")
async def test_whatsapp_notification(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Test WhatsApp notification - send any template"""


# ── File Proxy ──────────────────────────────────────────────────────────────
# Proxies authenticated file downloads so the browser never needs to handle
# auth headers directly.  Trusted sources:
#   • res.cloudinary.com   → uses Cloudinary signed URL to bypass 401
#   • *.emergent.host      → adds X-API-Key (VENDORPLUS_API_KEY)

import re as _re

_TRUSTED = [
    r'res\.cloudinary\.com',
    r'[^.]+\.emergent\.host',
]


def _is_trusted(url: str) -> bool:
    return any(_re.search(p, url) for p in _TRUSTED)


@router.get("/proxy/file")
async def proxy_file(
    url: str,
    filename: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Proxy a remote file through the backend with appropriate auth headers.

    Supported sources:
    - Cloudinary raw resources (generates signed URL to bypass 401)
    - VendorPlus / emergent.host files (adds X-API-Key header)
    """
    if not url or not _is_trusted(url):
        raise HTTPException(status_code=400, detail="URL is not from a trusted source")

    fetch_url = url
    fetch_headers: dict = {}

    # ── Cloudinary: generate signed URL so raw resources are accessible ──────
    if "cloudinary.com" in url:
        try:
            cl = _get_cloudinary()
            # Extract resource type and public_id from URL
            # e.g. /raw/upload/v123/oll_invoice/invoice_abc.pdf
            m = _re.search(r'/(image|raw|video)/upload/(?:v\d+/)?(.+?)(\?|$)', url)
            if m:
                resource_type = m.group(1)
                public_id_raw = m.group(2)
                # Strip any Cloudinary transformation prefix (e.g. fl_attachment:...)
                public_id = _re.sub(r'^[a-z_]+:[^/]+/', '', public_id_raw)
                signed_url, _ = cl.utils.cloudinary_url(
                    public_id,
                    resource_type=resource_type,
                    sign_url=True,
                    secure=True,
                    type="upload",
                )
                fetch_url = signed_url
        except Exception as e:
            logging.warning(f"[Proxy] Cloudinary sign failed ({e}), trying direct fetch")
            # Fall through with original URL

    # ── VendorPlus / emergent.host: add API key ───────────────────────────────
    elif "emergent.host" in url:
        vp_key = os.environ.get("VENDORPLUS_API_KEY", "")
        if vp_key:
            fetch_headers["X-API-Key"] = vp_key

    # ── Fetch and stream ──────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(fetch_url, headers=fetch_headers)

        if resp.status_code not in (200, 206):
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Remote file returned HTTP {resp.status_code}",
            )

        content_type = resp.headers.get("content-type", "application/octet-stream")
        # Normalise: treat PDF API endpoints as application/pdf
        url_path = url.lower().split("?")[0]
        if url_path.endswith(".pdf") or url_path.endswith("/pdf") or "invoice" in url_path:
            content_type = "application/pdf"

        disp_name = (
            filename
            or url.rstrip("/").split("/")[-1].split("?")[0]
            or "file"
        )
        if not disp_name.endswith(".pdf") and "pdf" in content_type:
            disp_name += ".pdf"

        return StreamingResponse(
            iter([resp.content]),
            media_type=content_type,
            headers={
                "Content-Disposition": f'inline; filename="{disp_name}"',
                "Cache-Control": "private, max-age=3600",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch remote file: {exc}")
