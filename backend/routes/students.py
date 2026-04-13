"""
Student Inquiry, Center Demos, School-Student Payments, Comments, Growth Partners.
"""
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from .shared import (
    db, get_current_user,
    auto_assign_educator, auto_assign_lead, generate_meeting_link
)
from .notifications import (
    send_demo_confirmation_notifications,
    send_student_newlead_notification,
    send_gp_newlead_notification
)

router = APIRouter()

# ── Models ─────────────────────────────────────────────────────────────────────
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
    assigned_educator_id: str = ""  # educator assigned to conduct demo
    assigned_educator_name: str = ""  # educator name for display
    meeting_link: str = ""  # Jitsi meeting link
    pending_payment: Optional[dict] = None  # For online payment tracking
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
    assigned_to: str = ""
    notes: str = ""

class StudentInquiryUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    demo_date: Optional[str] = None
    demo_time: Optional[str] = None
    followup_date: Optional[str] = None
    conversion_amount: Optional[str] = None
    sessions_count: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_educator_id: Optional[str] = None
    assigned_educator_name: Optional[str] = None
    pending_payment: Optional[dict] = None

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
    assigned_to: str = ""

class GrowthPartnerUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    details: Optional[str] = None
    notes: Optional[str] = None
    interest_type: Optional[str] = None
    assigned_to: Optional[str] = None

# Team Application Models

# ── Routes ─────────────────────────────────────────────────────────────────────
@router.get("/center/demos")
async def get_center_demos(user: dict = Depends(get_current_user)):
    """Get all student inquiries for the logged-in center user's center - full CRM view"""
    if user.get("role") != "center_user":
        raise HTTPException(status_code=403, detail="Only center users can access this endpoint")
    
    center_name = user.get("center_name", "")
    center_city = center_name.split('-')[0].strip() if '-' in center_name else center_name
    
    # Find student inquiries that are for this center
    # Match by: learning_mode offline_center AND city matches, OR notes mention center
    demos = await db.student_inquiries.find({
        "$or": [
            {"notes": {"$regex": center_name, "$options": "i"}},
            {"learning_mode": "offline_center", "city": {"$regex": center_city, "$options": "i"}},
            {"source": {"$regex": center_name, "$options": "i"}}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    return demos

@router.patch("/center/demos/{inquiry_id}")
async def update_center_demo(inquiry_id: str, data: StudentInquiryUpdate, user: dict = Depends(get_current_user)):
    """Update a student inquiry from center dashboard"""
    if user.get("role") != "center_user":
        raise HTTPException(status_code=403, detail="Only center users can access this endpoint")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.student_inquiries.update_one({"id": inquiry_id}, {"$set": update_data})
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    return inquiry

@router.post("/center/demos/{inquiry_id}/comment")
async def add_center_demo_comment(inquiry_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a comment to a student inquiry from center dashboard"""
    if user.get("role") != "center_user":
        raise HTTPException(status_code=403, detail="Only center users can access this endpoint")
    
    comment = {
        "id": str(uuid.uuid4()),
        "text": data.get("text", ""),
        "author": f"{user.get('name', 'Center')} ({user.get('center_name', '')})",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.student_inquiries.update_one(
        {"id": inquiry_id},
        {"$push": {"comments": comment}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Comment added", "comment": comment}

@router.post("/center/demos")
async def create_center_demo(data: StudentInquiryCreate, user: dict = Depends(get_current_user)):
    """Quick add a demo for the logged-in center user's center"""
    if user.get("role") != "center_user":
        raise HTTPException(status_code=403, detail="Only center users can access this endpoint")
    
    center_name = user.get("center_name", "")
    
    inquiry = StudentInquiry(
        learner_type=data.learner_type or "self",
        age_group=data.age_group,
        skill=data.skill,
        learning_mode="offline_center",
        city=center_name.split('-')[0].strip() if '-' in center_name else center_name,
        learning_goal=data.learning_goal or "general",
        name=data.name,
        email=data.email,
        phone=data.phone,
        demo_date=data.demo_date,
        demo_time=data.demo_time,
        source=f"center_added ({center_name})",
        notes=f"Center: {center_name}\n{data.notes or ''}"
    )
    
    await db.student_inquiries.insert_one(inquiry.model_dump())
    return inquiry.model_dump()

@router.post("/students/inquiry", response_model=StudentInquiry)
async def create_student_inquiry(data: StudentInquiryCreate, background_tasks: BackgroundTasks):
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
    
    # Auto-assign educator based on skill (for online demos or matching city)
    educator_data = None
    if data.skill:
        educator_data = await auto_assign_educator(data.skill, data.city, data.learning_mode)
        if educator_data:
            inquiry.assigned_educator_id = educator_data.get('id', '')
            inquiry.assigned_educator_name = educator_data.get('name', '')
    
    # Auto-assign to B2C Sales team user (round-robin)
    # Skip if already assigned (e.g., from team user link) or if assignment_option is 'admin'
    if not data.assigned_to and getattr(data, 'assignment_option', '') != 'admin':
        # For offline at center, assign to center user
        if data.learning_mode == 'offline' and getattr(data, 'selected_center', ''):
            assigned = await auto_assign_lead('student', data.city, 'offline', data.selected_center)
        else:
            # For online/at_home, auto-assign to B2C Sales
            assigned = await auto_assign_lead('student', data.city, data.learning_mode)
        
        if assigned and assigned.get('user_id'):
            inquiry.assigned_to = assigned['user_id']
    
    # Generate meeting link for the booking
    inquiry.meeting_link = generate_meeting_link(inquiry.id)
    
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.student_inquiries.insert_one(doc)
    
    # Fire WhatsApp notifications in background so they don't block the response
    # (Prevents timeout-caused duplicate submissions when AiSensy is slow)
    async def _send_all_notifications(doc_copy, edu_data, has_demo):
        try:
            if has_demo:
                await send_demo_confirmation_notifications(doc_copy, edu_data)
            sales_team = await db.users.find(
                {"department": "sales", "role": {"$in": ["admin", "team_member"]}},
                {"_id": 0, "phone": 1}
            ).to_list(10)
            sales_phones = [u.get("phone") for u in sales_team if u.get("phone")]
            if sales_phones:
                await send_student_newlead_notification(doc_copy, sales_phones)
        except Exception as e:
            print(f"[BG] Student inquiry notifications failed: {e}")

    background_tasks.add_task(_send_all_notifications, doc, educator_data, bool(data.demo_date and data.demo_time))
    
    return inquiry

@router.get("/students/inquiries", response_model=List[StudentInquiry])
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

@router.get("/students/inquiry/{inquiry_id}", response_model=StudentInquiry)
async def get_student_inquiry(inquiry_id: str, user: dict = Depends(get_current_user)):
    inquiry = await db.student_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    if isinstance(inquiry.get('created_at'), str):
        inquiry['created_at'] = datetime.fromisoformat(inquiry['created_at'])
    if isinstance(inquiry.get('updated_at'), str):
        inquiry['updated_at'] = datetime.fromisoformat(inquiry['updated_at'])
    return inquiry

@router.patch("/students/inquiry/{inquiry_id}", response_model=StudentInquiry)
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
# NOTE: payments routes moved to routes/payments.py
@router.get("/orders/school-student-payments")
async def get_all_school_student_payments(user: dict = Depends(get_current_user)):
    """Get aggregated school student payments (online) for Orders page - school-wise summary"""
    
    # Get all schools with online student payment mode
    schools = await db.school_inquiries.find({
        "status": {"$in": ["converted", "active", "renewed"]},
        "onboarding_data.payment_mode": "online",
        "onboarding_data.payment_method": "student"
    }, {"_id": 0}).to_list(1000)
    
    school_summaries = []
    
    for school in schools:
        school_id = school.get("id")
        school_name = school.get("school_name", "Unknown School")
        onboarding_data = school.get("onboarding_data") or {}
        
        # Get all payments for this school
        payments = await db.school_student_payments.find(
            {"school_id": school_id}, 
            {"_id": 0}
        ).to_list(5000)
        
        paid_payments = [p for p in payments if p.get("status") == "PAID"]
        pending_payments = [p for p in payments if p.get("status") in ["PENDING", "ACTIVE"]]
        
        total_collected = sum(p.get("amount", 0) for p in paid_payments)
        paid_count = len(paid_payments)
        pending_count = len(pending_payments)
        
        total_students = onboarding_data.get("total_students", 0) or 0
        total_expected = onboarding_data.get("total_amount", 0) or 0
        
        # Grade-wise breakdown
        grade_stats = {}
        for p in payments:
            g = p.get("grade", "Unknown")
            if g not in grade_stats:
                grade_stats[g] = {"paid": 0, "pending": 0, "amount": 0}
            if p.get("status") == "PAID":
                grade_stats[g]["paid"] += 1
                grade_stats[g]["amount"] += p.get("amount", 0)
            else:
                grade_stats[g]["pending"] += 1
        
        # Get recent paid students (last 5)
        recent_payments = sorted(
            paid_payments, 
            key=lambda x: x.get("paid_at", x.get("created_at", "")), 
            reverse=True
        )[:5]
        
        school_summaries.append({
            "school_id": school_id,
            "school_name": school_name,
            "city": school.get("city", ""),
            "contact_name": school.get("contact_name", ""),
            "contact_phone": school.get("phone", ""),
            "skill": onboarding_data.get("offering", school.get("skill", "")),
            "total_collected": total_collected,
            "total_expected": total_expected,
            "paid_count": paid_count,
            "pending_count": pending_count,
            "total_students": total_students,
            "collection_percentage": round((total_collected / total_expected * 100), 1) if total_expected > 0 else 0,
            "grade_stats": grade_stats,
            "recent_payments": [
                {
                    "student_name": p.get("student_name", ""),
                    "grade": p.get("grade", ""),
                    "division": p.get("division", ""),
                    "amount": p.get("amount", 0),
                    "paid_at": p.get("paid_at", p.get("created_at", "")),
                    "transaction_id": p.get("transaction_id", "")
                } for p in recent_payments
            ],
            "payment_link": f"/school-pay/{school_id}",
            "tracker_link": f"/admin/school-payments/{school_id}",
            "public_tracker_link": f"/school-payment-tracker/{school_id}",
            "deadline_date": onboarding_data.get("deadline_date", ""),
            "status": school.get("status", "")
        })
    
    # Sort by collection amount (highest first)
    school_summaries.sort(key=lambda x: x["total_collected"], reverse=True)
    
    # Overall aggregates
    overall_stats = {
        "total_schools": len(school_summaries),
        "total_collected": sum(s["total_collected"] for s in school_summaries),
        "total_expected": sum(s["total_expected"] for s in school_summaries),
        "total_paid_students": sum(s["paid_count"] for s in school_summaries),
        "total_pending_students": sum(s["pending_count"] for s in school_summaries),
        "total_students": sum(s["total_students"] for s in school_summaries)
    }
    overall_stats["collection_percentage"] = round(
        (overall_stats["total_collected"] / overall_stats["total_expected"] * 100), 1
    ) if overall_stats["total_expected"] > 0 else 0
    
    return {
        "schools": school_summaries,
        "overall_stats": overall_stats
    }

@router.get("/orders/school-student-payments/{school_id}/export")
async def export_school_student_payments(school_id: str, user: dict = Depends(get_current_user)):
    """Export all payments for a specific school as JSON (for Excel export on frontend)"""
    
    # Get school info
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Get all payments for this school
    payments = await db.school_student_payments.find(
        {"school_id": school_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(5000)
    
    # Format for export
    export_data = []
    for p in payments:
        export_data.append({
            "Student Name": p.get("student_name", ""),
            "Phone": p.get("phone", ""),
            "Grade": p.get("grade", ""),
            "Division": p.get("division", ""),
            "Amount": p.get("amount", 0),
            "Status": p.get("status", ""),
            "Payment Date": p.get("paid_at", p.get("created_at", "")).split("T")[0] if p.get("paid_at") or p.get("created_at") else "",
            "Transaction ID": p.get("transaction_id", ""),
            "Order ID": p.get("id", "")
        })
    
    return {
        "school_name": school.get("school_name", ""),
        "export_data": export_data
    }

@router.post("/{collection}/comment/{item_id}")
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

@router.get("/{collection}/comments/{item_id}")
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

@router.post("/growth-partners", response_model=GrowthPartner)
async def create_growth_partner(data: GrowthPartnerCreate):
    partner = GrowthPartner(**data.model_dump())
    
    # Auto-assign to Growth Partner Manager (round-robin)
    if not data.assigned_to:
        assigned = await auto_assign_lead('growth_partner', data.city or '', 'online')
        if assigned and assigned.get('user_id'):
            partner.assigned_to = assigned['user_id']
    
    doc = partner.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.growth_partners.insert_one(doc)
    
    # Send new GP lead notification to GP Manager team
    try:
        gp_managers = await db.users.find(
            {"department": {"$in": ["growth_partner", "gp_manager", "sales"]}, "role": {"$in": ["admin", "team_member"]}},
            {"_id": 0, "phone": 1}
        ).to_list(10)
        gp_phones = [u.get("phone") for u in gp_managers if u.get("phone")]
        if gp_phones:
            await send_gp_newlead_notification(doc, gp_phones)
    except Exception as e:
        print(f"Failed to send GP new lead notification: {e}")
    
    return partner

@router.get("/growth-partners")
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

@router.patch("/growth-partners/{partner_id}")
async def update_growth_partner(
    partner_id: str, 
    data: GrowthPartnerUpdate,
    user: dict = Depends(get_current_user)
):
    # Get current partner data to check status change
    current_partner = await db.growth_partners.find_one({"id": partner_id}, {"_id": 0})
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Check if status is changing to 'active' - auto-create team user with GP role
    new_status = update_data.get('status')
    old_status = current_partner.get('status') if current_partner else None
    
    if new_status == 'active' and old_status != 'active' and current_partner:
        # Check if team user already exists for this GP
        existing_team_user = await db.team_users.find_one({
            "$or": [
                {"email": current_partner.get('email')},
                {"phone": current_partner.get('phone')}
            ]
        })
        
        if not existing_team_user:
            # Find the "GP Manager" role (as requested by user)
            gp_role = await db.roles.find_one({"name": "GP Manager"}, {"_id": 0})
            if not gp_role:
                # Create the GP Manager role if it doesn't exist
                gp_role = {
                    "id": str(uuid.uuid4()),
                    "name": "GP Manager",
                    "description": "Growth Partner Manager - Can manage schools and student leads",
                    "permissions": ["dashboard", "schools", "students", "growth_partners"],
                    "is_system": False,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.roles.insert_one(gp_role)
            gp_role_id = gp_role.get('id')
            
            # Create team user for this GP with GP Manager role
            team_user_id = str(uuid.uuid4())
            team_user_doc = {
                "id": team_user_id,
                "name": current_partner.get('name', ''),
                "email": current_partner.get('email', ''),
                "phone": current_partner.get('phone', ''),
                "role_id": gp_role_id,
                "role_name": "GP Manager",
                "is_active": True,
                "growth_partner_id": partner_id,  # Link back to GP
                "permissions": ['dashboard', 'schools', 'students', 'growth_partners'],  # GP Manager permissions
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.team_users.insert_one(team_user_doc)
            
            # Update GP with team_user_id reference
            update_data['team_user_id'] = team_user_id
    
    await db.growth_partners.update_one({"id": partner_id}, {"$set": update_data})
    partner = await db.growth_partners.find_one({"id": partner_id}, {"_id": 0})
    return partner
