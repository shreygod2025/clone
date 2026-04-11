"""
Schools CRM, Onboarding, Email automation, PO management, and Student Tracking routes.
"""
import os
import uuid
import asyncio
import httpx
import io
import csv
import json
import re
import resend
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Dict, Union, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks, Response, Header, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ConfigDict, EmailStr

from .shared import (
    db, get_current_user, auto_assign_lead, get_relationship_managers,
    ensure_resend_api_key, EMAIL_TEMPLATES, send_educator_email, SENDER_EMAIL,
    get_next_ticket_number
)
from .notifications import send_whatsapp_notification
from .expenses import transform_tracking_url, fetch_po_data, fetch_vendor_products, match_vendor_product, VENDOR_PUBLIC_API
from .payments import clear_payment_cache

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────
def get_followup_weekday_dates(start_date, count: int = 4, interval: int = 4) -> list:
    """Calculate N followup dates, each `interval` weekdays from the previous."""
    dates = []
    current = start_date
    for _ in range(count):
        weekdays_added = 0
        while weekdays_added < interval:
            current = current + timedelta(days=1)
            if current.weekday() < 5:  # Mon–Fri
                weekdays_added += 1
        dates.append(current)
    return dates


class SchoolInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_name: str
    contact_name: str = ""
    email: Optional[str] = ""          # made optional — AI-created leads may have no email
    phone: str = ""
    location: str = ""
    school_size: str = ""
    fee_range: str = ""
    board: str = ""
    address: str = ""  # Full school address
    state: str = ""   # School state (e.g., Maharashtra, Haryana)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = None
    programs_interested: List[str] = []
    support_needed: List[str] = []
    status: str = "new"  # new, meeting_done, converted, active, renewal_meeting, renewed, lost, lost_lead, lost_customer, archived
    notes: str = ""
    comments: List[dict] = []
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_type: str = "offline"  # offline, online
    followup_date: Optional[str] = None
    followup_comment: str = ""
    conversion_amount: Optional[Union[str, int, float]] = None
    quoted_price: Optional[Union[str, int, float]] = None  # Price quoted during meeting
    selected_offerings: Optional[List[str]] = None  # Offerings selected during meeting
    source: str = "website"
    referred_by: str = ""  # Name of person who referred (when source is referral)
    added_by: str = ""
    assigned_to: str = ""
    assigned_to_name: str = ""  # Name of assigned team member
    relationship_manager_id: str = ""  # RM assigned to converted schools
    relationship_manager_name: str = ""
    onboarding_data: Optional[dict] = None  # Onboarding details including offerings, pricing, contacts, payment tranches
    proposal_data: Optional[dict] = None  # Edit Lead / Generate Proposal data
    onboarding_workflow: Optional[dict] = None  # Onboarding workflow status and tracking
    activity_log: List[dict] = []  # Activity history log
    renewal_meeting_date: Optional[str] = None
    renewal_meeting_time: Optional[str] = None
    renewal_meeting_type: Optional[str] = None
    renewal_meeting_link: Optional[str] = None
    renewal_meeting_address: Optional[str] = None
    lost_reason: Optional[str] = None
    lead_value: Optional[float] = None  # Value of the lost lead/customer (for reports)
    followup_tasks: Optional[List[dict]] = None  # Auto-scheduled followup email tasks
    school_contacts: Optional[List[dict]] = []  # School team contacts
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
    address: str = ""  # Full school address
    programs_interested: List[str] = []
    support_needed: List[str] = []
    selected_offerings: Optional[List[str]] = None
    quoted_price: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_type: str = "offline"
    source: str = "website"
    referred_by: str = ""
    added_by: str = ""
    added_by_name: str = ""
    assigned_to: str = ""
    assign_option: str = "admin"  # 'self' or 'admin'
    notes: str = ""
    school_contacts: Optional[List[dict]] = []  # School team contacts added at creation

class SchoolInquiryUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    status: Optional[str] = None
    school_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    board: Optional[str] = None
    address: Optional[str] = None  # Full school address
    state: Optional[str] = None   # School state (for IGST vs CGST/SGST)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[int] = None
    model: Optional[str] = None
    total_students: Optional[int] = None
    school_size: Optional[str] = None
    fee_range: Optional[str] = None
    student_count: Optional[str] = None
    notes: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_type: Optional[str] = None
    followup_date: Optional[str] = None
    followup_comment: Optional[str] = None
    conversion_amount: Optional[Union[str, int, float]] = None
    quoted_price: Optional[Union[str, int, float]] = None  # Price quoted during meeting
    assigned_to: Optional[str] = None
    onboarding_data: Optional[dict] = None
    proposal_data: Optional[dict] = None  # Edit Lead / Generate Proposal data
    selected_offerings: Optional[list] = None
    programs_interested: Optional[list] = None
    # Lost reason
    lost_reason: Optional[str] = None
    lead_value: Optional[float] = None  # Value of lost lead/customer
    # Renewal meeting fields
    renewal_meeting_date: Optional[str] = None
    renewal_meeting_time: Optional[str] = None
    renewal_meeting_type: Optional[str] = None
    renewal_meeting_link: Optional[str] = None
    renewal_meeting_address: Optional[str] = None
    # Documents (proposal, MOU, parent circular, etc.)
    documents: Optional[list] = None
    # School team contacts (synced at top-level for quick access)
    school_contacts: Optional[List[dict]] = None


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/schools/inquiry", response_model=SchoolInquiry)
async def create_school_inquiry(data: SchoolInquiryCreate):
    inquiry = SchoolInquiry(**data.model_dump())
    
    # Handle assignment based on assign_option
    assign_option = getattr(data, 'assign_option', None) or 'admin'
    added_by = getattr(data, 'added_by', None)
    added_by_name = getattr(data, 'added_by_name', None)
    
    if assign_option == 'self' and added_by:
        # Assign to the user who created it
        inquiry.assigned_to = added_by
        inquiry.assigned_to_name = added_by_name or ''
    elif not data.assigned_to:
        # Auto-assign to B2B Sales team user (round-robin, prefer same city)
        assigned = await auto_assign_lead('school', data.location or '', 'offline')
        if assigned and assigned.get('user_id'):
            inquiry.assigned_to = assigned['user_id']
            inquiry.assigned_to_name = assigned.get('user_name', '')
    
    # Store added_by info
    if added_by:
        inquiry_dict = inquiry.model_dump()
        inquiry_dict['added_by'] = added_by
        inquiry_dict['added_by_name'] = added_by_name
    else:
        inquiry_dict = inquiry.model_dump()
    
    inquiry_dict['created_at'] = inquiry_dict['created_at'].isoformat()
    inquiry_dict['updated_at'] = inquiry_dict['updated_at'].isoformat()

    # Auto-schedule 4 followup tasks (every 4 weekdays)
    today = datetime.now(timezone.utc).date()
    followup_dates = get_followup_weekday_dates(today, count=4, interval=4)
    followup_tasks = [
        {
            "id": str(uuid.uuid4()),
            "number": i + 1,
            "scheduled_date": followup_dates[i].isoformat(),
            "email_type": f"followup_{i + 1}",
            "status": "pending",
            "sent_at": None,
            "sent_by": None
        }
        for i in range(4)
    ]
    inquiry_dict['followup_tasks'] = followup_tasks
    inquiry.followup_tasks = followup_tasks

    await db.school_inquiries.insert_one(inquiry_dict)
    return inquiry

@router.get("/schools/names")
async def get_school_names_list(user: dict = Depends(get_current_user)):
    """Lightweight endpoint returning only id + school_name for dropdowns"""
    schools = await db.school_inquiries.find({}, {"_id": 0, "id": 1, "school_name": 1}).sort("school_name", 1).to_list(2000)
    return schools


@router.get("/schools/inquiries")
async def get_school_inquiries(
    status: Optional[str] = None,
    view_all: bool = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        # Handle comma-separated status values
        if "," in status:
            query["status"] = {"$in": status.split(",")}
        else:
            query["status"] = status
    
    user_role = user.get("role", "")
    user_id = user.get("user_id", user.get("id", ""))
    
    # Check if user is admin - admins see all leads
    is_admin = user_role == "admin" or user.get("email") == "admin@oll.co"
    
    # Non-admin users only see leads assigned to them
    # Unless view_all is explicitly True (for managers with special permission)
    if not is_admin and not view_all:
        # Show leads where user is assigned OR added by them
        query["$or"] = [
            {"assigned_to": user_id},
            {"added_by": user_id},
            {"relationship_manager_id": user_id}
        ]
    
    inquiries = await db.school_inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Add ownership flag for display purposes
    for inq in inquiries:
        if isinstance(inq.get('created_at'), str):
            inq['created_at'] = datetime.fromisoformat(inq['created_at'])
        if isinstance(inq.get('updated_at'), str):
            inq['updated_at'] = datetime.fromisoformat(inq['updated_at'])
        
        # Add flags to indicate ownership
        inq['is_owner'] = inq.get('assigned_to') == user_id or inq.get('added_by') == user_id
        inq['is_viewer'] = not inq['is_owner']
        
        # Transform any stale preview tracking URLs in po_requests
        for po_req in inq.get('po_requests', []):
            if po_req.get('tracking_url'):
                po_req['tracking_url'] = transform_tracking_url(po_req['tracking_url'])
    
    return inquiries

@router.delete("/schools/inquiry/{inquiry_id}")
async def delete_school_inquiry(inquiry_id: str, user: dict = Depends(get_current_user)):
    """Delete a school inquiry/lead"""
    # Check if user has permission (admin or owner)
    inquiry = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    user_id = user.get("user_id", user.get("id", ""))
    is_admin = user.get("role") in ["admin", "super_admin"]
    is_owner = inquiry.get("assigned_to") == user_id or inquiry.get("added_by") == user_id
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this lead")
    
    await db.school_inquiries.delete_one({"id": inquiry_id})
    return {"message": "Lead deleted successfully"}

@router.delete("/schools/inquiry/{inquiry_id}/contacts/{contact_index}")
async def delete_school_contact(inquiry_id: str, contact_index: int, user: dict = Depends(get_current_user)):
    """Delete a contact from a school inquiry"""
    inquiry = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="School not found")
    
    school_contacts = inquiry.get("school_contacts", [])
    if contact_index < 0 or contact_index >= len(school_contacts):
        raise HTTPException(status_code=404, detail="Contact not found")
    
    school_contacts.pop(contact_index)
    await db.school_inquiries.update_one(
        {"id": inquiry_id}, 
        {"$set": {"school_contacts": school_contacts, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Contact deleted successfully"}

@router.delete("/educator-applications/{application_id}")
async def delete_educator_application(application_id: str, user: dict = Depends(get_current_user)):
    """Delete an educator application"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete applications")
    
    result = await db.educator_applications.delete_one({"id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted successfully"}

@router.delete("/team-applications/{application_id}")
async def delete_team_application(application_id: str, user: dict = Depends(get_current_user)):
    """Delete a team application"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete applications")
    
    result = await db.team_applications.delete_one({"id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted successfully"}

@router.delete("/growth-partner-applications/{application_id}")
async def delete_growth_partner_application(application_id: str, user: dict = Depends(get_current_user)):
    """Delete a growth partner application"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete applications")
    
    result = await db.growth_partner_applications.delete_one({"id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted successfully"}

@router.get("/schools/inquiry/{inquiry_id}")
async def get_school_inquiry(inquiry_id: str, user: dict = Depends(get_current_user)):
    """Get a single school inquiry by ID."""
    doc = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return doc

@router.patch("/schools/inquiry/{inquiry_id}")
async def update_school_inquiry(
    inquiry_id: str,
    data: SchoolInquiryUpdate,
    user: dict = Depends(get_current_user)
):
    # Get current inquiry to track changes
    current_inquiry = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if not current_inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Track status changes and other important updates in activity_log
    activity_entries = []
    
    # Status change
    if 'status' in update_data and update_data['status'] != current_inquiry.get('status'):
        activity_entries.append({
            "type": "status_change",
            "timestamp": update_data['updated_at'],
            "old_status": current_inquiry.get('status'),
            "new_status": update_data['status'],
            "description": f"Status changed from {current_inquiry.get('status', 'new')} to {update_data['status']}",
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Meeting scheduled
    if 'meeting_date' in update_data and update_data.get('meeting_date') != current_inquiry.get('meeting_date'):
        activity_entries.append({
            "type": "meeting_scheduled",
            "timestamp": update_data['updated_at'],
            "description": f"Meeting scheduled for {update_data.get('meeting_date')} at {update_data.get('meeting_time', 'TBD')}",
            "details": {
                "meeting_date": update_data.get('meeting_date'),
                "meeting_time": update_data.get('meeting_time'),
                "meeting_mode": update_data.get('meeting_mode')
            },
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Renewal meeting scheduled
    if 'renewal_meeting_date' in update_data and update_data.get('renewal_meeting_date') != current_inquiry.get('renewal_meeting_date'):
        activity_entries.append({
            "type": "renewal_meeting_scheduled",
            "timestamp": update_data['updated_at'],
            "description": f"Renewal meeting scheduled for {update_data.get('renewal_meeting_date')} at {update_data.get('renewal_meeting_time', 'TBD')}",
            "details": {
                "meeting_date": update_data.get('renewal_meeting_date'),
                "meeting_time": update_data.get('renewal_meeting_time'),
                "meeting_type": update_data.get('renewal_meeting_type')
            },
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Followup scheduled
    if 'followup_date' in update_data and update_data.get('followup_date') != current_inquiry.get('followup_date'):
        activity_entries.append({
            "type": "followup_scheduled",
            "timestamp": update_data['updated_at'],
            "description": f"Followup ({update_data.get('followup_type', 'general')}) scheduled for {update_data.get('followup_date')}",
            "details": {
                "followup_date": update_data.get('followup_date'),
                "followup_type": update_data.get('followup_type'),
                "followup_comment": update_data.get('followup_comment')
            },
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Notes added/updated
    if 'notes' in update_data and update_data.get('notes') != current_inquiry.get('notes'):
        activity_entries.append({
            "type": "notes_updated",
            "timestamp": update_data['updated_at'],
            "description": f"Notes updated: {(update_data.get('notes') or '')[:50]}...",
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Assignment changed
    if 'assigned_to' in update_data and update_data.get('assigned_to') != current_inquiry.get('assigned_to'):
        activity_entries.append({
            "type": "assigned",
            "timestamp": update_data['updated_at'],
            "description": f"Assigned to {update_data.get('assigned_to_name', update_data.get('assigned_to', 'team member'))}",
            "by": user.get('name', user.get('email', 'System'))
        })
    
    # Add activity entries to the log
    if activity_entries:
        await db.school_inquiries.update_one(
            {"id": inquiry_id},
            {"$push": {"activity_log": {"$each": activity_entries}}}
        )
    
    await db.school_inquiries.update_one({"id": inquiry_id}, {"$set": update_data})
    
    # Auto-sync GP Share and School Share expenses whenever onboarding_data changes
    onboarding_data = update_data.get('onboarding_data', {})
    if not onboarding_data:
        # Also check if share fields are passed directly at top level (legacy support)
        share_keys = ['gp_share_amount', 'school_share_amount', 'gp_share_type', 'school_share_type']
        if any(k in update_data for k in share_keys):
            onboarding_data = {**current_inquiry.get('onboarding_data', {}), **{k: update_data[k] for k in share_keys if k in update_data}}
    if onboarding_data:
        school_name = current_inquiry.get('school_name', '')
        
        # Check for GP Share expense - create or update (any existing expense for this school/category)
        gp_share_amount = onboarding_data.get('gp_share_amount', 0)
        if gp_share_amount and float(gp_share_amount) > 0:
            existing_gp = await db.school_expenses.find_one({
                "school_id": inquiry_id,
                "category": "gp_share"
            })
            if not existing_gp:
                gp_expense = {
                    "id": str(uuid.uuid4()),
                    "school_id": inquiry_id,
                    "school_name": school_name,
                    "category": "gp_share",
                    "category_name": "GP Share",
                    "amount": float(gp_share_amount),
                    "description": f"Growth Partner share ({onboarding_data.get('gp_share_type', 'amount')} - {onboarding_data.get('gp_share_calc', 'lumpsum')})",
                    "expense_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "payment_status": "pending",
                    "gp_share_type": onboarding_data.get("gp_share_type"),
                    "gp_share_calc": onboarding_data.get("gp_share_calc"),
                    "gp_share_value": onboarding_data.get("gp_share_value"),
                    "created_by": user.get("id"),
                    "created_by_name": user.get("name", user.get("email", "Admin")),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "auto_created": True,
                    "source": "edit"
                }
                await db.school_expenses.insert_one(gp_expense)
            else:
                # Update existing GP share expense amount
                await db.school_expenses.update_one(
                    {"id": existing_gp["id"]},
                    {"$set": {
                        "amount": float(gp_share_amount),
                        "description": f"Growth Partner share ({onboarding_data.get('gp_share_type', 'amount')} - {onboarding_data.get('gp_share_calc', 'lumpsum')})",
                        "gp_share_type": onboarding_data.get("gp_share_type"),
                        "gp_share_calc": onboarding_data.get("gp_share_calc"),
                        "gp_share_value": onboarding_data.get("gp_share_value"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        # Check for School Share expense - create or update (any existing expense for this school/category)
        school_share_amount = onboarding_data.get('school_share_amount', 0)
        if school_share_amount and float(school_share_amount) > 0:
            existing_school_share = await db.school_expenses.find_one({
                "school_id": inquiry_id,
                "category": "school_share"
            })
            if not existing_school_share:
                school_share_expense = {
                    "id": str(uuid.uuid4()),
                    "school_id": inquiry_id,
                    "school_name": school_name,
                    "category": "school_share",
                    "category_name": "School Share",
                    "amount": float(school_share_amount),
                    "description": f"School revenue share ({onboarding_data.get('school_share_type', 'amount')} - {onboarding_data.get('school_share_calc', 'lumpsum')})",
                    "expense_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "payment_status": "pending",
                    "school_share_type": onboarding_data.get("school_share_type"),
                    "school_share_calc": onboarding_data.get("school_share_calc"),
                    "school_share_value": onboarding_data.get("school_share_value"),
                    "created_by": user.get("id"),
                    "created_by_name": user.get("name", user.get("email", "Admin")),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "auto_created": True,
                    "source": "edit"
                }
                await db.school_expenses.insert_one(school_share_expense)
            else:
                # Update existing school share expense amount
                await db.school_expenses.update_one(
                    {"id": existing_school_share["id"]},
                    {"$set": {
                        "amount": float(school_share_amount),
                        "description": f"School revenue share ({onboarding_data.get('school_share_type', 'amount')} - {onboarding_data.get('school_share_calc', 'lumpsum')})",
                        "school_share_type": onboarding_data.get("school_share_type"),
                        "school_share_calc": onboarding_data.get("school_share_calc"),
                        "school_share_value": onboarding_data.get("school_share_value"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
    
    inquiry = await db.school_inquiries.find_one({"id": inquiry_id}, {"_id": 0})
    if isinstance(inquiry.get('created_at'), str):
        inquiry['created_at'] = datetime.fromisoformat(inquiry['created_at'])
    if isinstance(inquiry.get('updated_at'), str):
        inquiry['updated_at'] = datetime.fromisoformat(inquiry['updated_at'])
    
    # Clear school payment cache for this school
    clear_payment_cache(f"school_payment_{inquiry_id}")
    
    return inquiry

@router.get("/schools/relationship-managers")
async def get_relationship_managers_endpoint(user: dict = Depends(get_current_user)):
    """Get all users with Relationship Manager role"""
    managers = await get_relationship_managers()
    return managers

@router.post("/schools/{school_id}/assign-rm")
async def assign_relationship_manager(
    school_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Assign a relationship manager to a converted school"""
    rm_id = data.get('rm_id')
    rm_name = data.get('rm_name', '')
    
    if not rm_id:
        raise HTTPException(status_code=400, detail="Relationship manager ID required")
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {
            "$set": {
                "relationship_manager_id": rm_id,
                "relationship_manager_name": rm_name,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Relationship manager assigned successfully"}

@router.get("/schools/{school_id}/history")
async def get_school_history(school_id: str, user: dict = Depends(get_current_user)):
    """Get complete history of a school including status changes, meetings, notes, tickets, onboarding"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    history = []
    
    # Created event
    if school.get('created_at'):
        history.append({
            "type": "created",
            "date": school.get('created_at'),
            "description": f"School inquiry created from {school.get('source', 'website')}",
            "details": {"source": school.get('source')}
        })
    
    # Status history from activity log if exists
    activity_log = school.get('activity_log', [])
    for activity in activity_log:
        history.append({
            "type": "status_change",
            "date": activity.get('timestamp'),
            "description": activity.get('description', f"Status changed to {activity.get('new_status', '')}"),
            "details": activity
        })
    
    # Meeting scheduled
    if school.get('meeting_date'):
        history.append({
            "type": "meeting_scheduled",
            "date": school.get('meeting_date'),
            "description": f"Meeting scheduled for {school.get('meeting_date')} at {school.get('meeting_time', 'TBD')}",
            "details": {
                "meeting_date": school.get('meeting_date'),
                "meeting_time": school.get('meeting_time'),
                "meeting_mode": school.get('meeting_mode'),
                "meeting_link": school.get('meeting_link')
            }
        })
    
    # Followup scheduled
    if school.get('followup_date'):
        history.append({
            "type": "followup",
            "date": school.get('followup_date'),
            "description": f"Followup {school.get('followup_type', '')} scheduled for {school.get('followup_date')}",
            "details": {
                "followup_type": school.get('followup_type'),
                "followup_comment": school.get('followup_comment')
            }
        })
    
    # Conversion/Onboarding
    if school.get('onboarding_data'):
        onb_data = school.get('onboarding_data', {})
        history.append({
            "type": "converted",
            "date": onb_data.get('converted_at', school.get('updated_at')),
            "description": f"School converted - {onb_data.get('total_students', 0)} students, ₹{onb_data.get('total_amount', 0)}",
            "details": onb_data
        })
        
        # Onboarding steps
        steps = onb_data.get('onboarding_steps', {})
        for step_name, step_data in steps.items():
            if step_data.get('completed'):
                history.append({
                    "type": "onboarding_step",
                    "date": step_data.get('completed_at'),
                    "description": f"Onboarding step completed: {step_name.replace('_', ' ').title()}",
                    "details": step_data
                })
    
    # Notes
    if school.get('notes'):
        history.append({
            "type": "note",
            "date": school.get('updated_at'),
            "description": f"Notes: {school.get('notes')[:100]}...",
            "details": {"notes": school.get('notes')}
        })
    
    # Get tickets for this school
    tickets = await db.support_tickets.find({"school_id": school_id}, {"_id": 0}).to_list(50)
    for ticket in tickets:
        history.append({
            "type": "ticket",
            "date": ticket.get('created_at'),
            "description": f"Ticket raised: {ticket.get('subject', 'N/A')} ({ticket.get('status', 'open')})",
            "details": ticket
        })
    
    # Sort by date descending
    def parse_date(item):
        date_val = item.get('date')
        if not date_val:
            return datetime.min.replace(tzinfo=timezone.utc)
        if isinstance(date_val, datetime):
            if date_val.tzinfo is None:
                return date_val.replace(tzinfo=timezone.utc)
            return date_val
        if isinstance(date_val, str):
            try:
                parsed = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                if parsed.tzinfo is None:
                    return parsed.replace(tzinfo=timezone.utc)
                return parsed
            except Exception:
                return datetime.min.replace(tzinfo=timezone.utc)
        return datetime.min.replace(tzinfo=timezone.utc)
    
    try:
        history.sort(key=parse_date, reverse=True)
    except Exception as e:
        logging.error(f"Error sorting history: {e}")
        # Don't fail if sorting fails, just return unsorted
    
    return {"school_id": school_id, "history": history}

@router.post("/schools/{school_id}/raise-ticket")
async def raise_school_ticket(
    school_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Raise a support ticket on behalf of a school - saves to support_queries for unified Support Center"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    query_id = str(uuid.uuid4())
    user_id = user.get("id", "")
    
    # Build query document matching support_queries schema
    query_doc = {
        "id": query_id,
        "name": data.get('contact_name', school.get('contact_name', school.get('school_name', ''))),
        "phone": data.get('contact_phone', school.get('phone', '')),
        "email": data.get('contact_email', school.get('email', '')),
        "query_type": data.get('query_type', 'general'),
        "related_to": data.get('related_to', ''),  # Sub-category
        "inquiry_type": "school",  # Mark as school query
        "message": data.get('description', ''),
        "query_details": data.get('description', ''),  # Also store as query_details for consistency
        "priority": data.get('priority', 'medium'),
        "status": "open",
        "source": "school_crm",
        "attachments": data.get('attachments', []),  # [{name, url, type, is_voice_note}]
        "created_by": user_id,
        "created_by_name": user.get('name', ''),
        "viewers": [],  # Initialize empty viewers array
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "comments": [],  # Initialize empty comments array for replies
        "assigned_to": school.get('assigned_to'),  # Auto-assign to school's assigned team member
        # Additional school-specific fields
        "school_id": school_id,
        "school_name": school.get('school_name', ''),
        "subject": data.get('subject', ''),
        "user_type": data.get('user_type', 'school'),  # school, teacher, student
    }
    
    # Insert into support_queries collection (used by Support Center UI)
    await db.support_queries.insert_one(query_doc)
    
    # Send WhatsApp notification to assigned team member (if school has assigned_to)
    if school.get('assigned_to'):
        # Check both users and team_users collections
        assignee = await db.users.find_one({"id": school.get('assigned_to')}, {"_id": 0})
        if not assignee:
            assignee = await db.team_users.find_one({"id": school.get('assigned_to')}, {"_id": 0})
        if assignee and assignee.get('phone'):
            # Build ticket_data for notification
            ticket_data = {
                "id": query_id,
                "subject": data.get('subject', data.get('query_type', 'Support Query')),
                "priority": data.get('priority', 'medium'),
                "school_name": school.get('school_name', ''),
                "contact_name": data.get('contact_name', school.get('contact_name', '')),
                "assigned_to_name": assignee.get('name', '')
            }
            await send_support_ticket_notification(ticket_data, assignee)
            print(f"Query notification sent to {assignee.get('name')} at {assignee.get('phone')}")
        else:
            print(f"Query notification skipped - assignee {school.get('assigned_to')} has no phone number")
    
    return {"message": "Ticket raised successfully", "ticket_id": query_id}

# ========================
# EDUCATOR ENDPOINTS
# ========================

@router.post("/schools/onboard")
async def onboard_school(data: dict, user: dict = Depends(get_current_user)):
    """Onboard a converted school with contract details"""
    school_id = data.get("school_id")
    if not school_id:
        raise HTTPException(status_code=400, detail="school_id is required")
    
    # Check if this is a draft save
    is_draft = data.get("is_draft", False)
    
    # Create onboarding record
    onboarding_id = str(uuid.uuid4())
    doc = {
        "id": onboarding_id,
        "school_id": school_id,
        "offering": data.get("offering", ""),  # Selected offering ID
        "model": data.get("model", ""),  # From school offerings
        "book_type": data.get("book_type", ""),  # e.g., Level 1, Beginner
        "kit_type": data.get("kit_type", ""),  # lab_setup, individual, no_kit
        "training_type": data.get("training_type", ""),  # student_training, teacher_training, both
        "grade_pricing": data.get("grade_pricing", []),  # [{grade: "1-5", students: 50, price_per_student: 500}]
        "total_students": data.get("total_students", 0),
        "total_amount": data.get("total_amount", 0),
        "school_contacts": data.get("school_contacts", []),  # [{name, phone, email, role}]
        "payment_mode": data.get("payment_mode", "from_school"),  # from_school, from_student, online
        "payment_method": data.get("payment_method", ""),  # cheque, neft, online, cash, student
        "payment_tranches": data.get("payment_tranches", []),  # [{percentage, amount, date, notes}]
        "deadline_date": data.get("deadline_date", ""),  # Deadline for online payments
        "contract_start": data.get("contract_start"),
        "contract_end": data.get("contract_end"),
        "mou_url": data.get("mou_url", ""),  # MOU document URL
        "gst_type": data.get("gst_type", ""),  # GST type: exclusive_18, inclusive_18, no_gst
        "school_address": data.get("school_address", ""),  # Full school address for MOU
        "status": "draft" if is_draft else "active",
        "is_draft": is_draft,
        "created_by": user.get("email", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.school_onboarding.insert_one(doc)
    
    # Build onboarding_data to store in school_inquiries for easy viewing
    onboarding_data = {
        "model": data.get("model"),
        "book_type": data.get("book_type"),
        "kit_type": data.get("kit_type"),
        "training_type": data.get("training_type"),
        "grade_pricing": data.get("grade_pricing", []),
        "total_students": data.get("total_students", 0),
        "total_amount": data.get("total_amount", 0),
        "school_contacts": data.get("school_contacts", []),
        "payment_mode": data.get("payment_mode"),
        "payment_method": data.get("payment_method"),
        "payment_tranches": data.get("payment_tranches", []),
        "deadline_date": data.get("deadline_date", ""),
        "contract_start": data.get("contract_start"),
        "contract_end": data.get("contract_end"),
        "mou_url": data.get("mou_url", ""),
        "gst_type": data.get("gst_type", ""),  # GST type for payments and invoices
        "school_address": data.get("school_address", ""),  # Full school address for MOU
    }
    
    # Update school inquiry with onboarding data
    update_fields = {
        "onboarding_id": onboarding_id,
        "onboarding_status": "draft" if is_draft else "active",
        "onboarding_data": onboarding_data,  # Store all onboarding details
        "model": data.get("model"),
        "total_students": data.get("total_students"),
    }
    # Also update the address on the school record directly for convenience
    if data.get("school_address"):
        update_fields["address"] = data.get("school_address")
    if not is_draft:
        update_fields["status"] = "active"
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": update_fields}
    )
    
    # Auto-create GP Share and School Share expenses if they exist
    if not is_draft:
        school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "school_name": 1})
        school_name = school.get("school_name", "") if school else ""
        
        # Create GP Share expense if configured
        gp_share_amount = data.get("gp_share_amount", 0)
        if gp_share_amount and float(gp_share_amount) > 0:
            gp_expense = {
                "id": str(uuid.uuid4()),
                "school_id": school_id,
                "school_name": school_name,
                "category": "gp_share",
                "category_name": "GP Share",
                "amount": float(gp_share_amount),
                "description": f"Growth Partner share for conversion ({data.get('gp_share_type', 'amount')} - {data.get('gp_share_calc', 'lumpsum')})",
                "expense_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "payment_status": "pending",
                "gp_share_type": data.get("gp_share_type"),
                "gp_share_calc": data.get("gp_share_calc"),
                "gp_share_value": data.get("gp_share_value"),
                "created_by": user.get("id"),
                "created_by_name": user.get("name", user.get("email", "Admin")),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "auto_created": True,
                "source": "conversion"
            }
            await db.school_expenses.insert_one(gp_expense)
        
        # Create School Share expense if configured
        school_share_amount = data.get("school_share_amount", 0)
        if school_share_amount and float(school_share_amount) > 0:
            school_share_expense = {
                "id": str(uuid.uuid4()),
                "school_id": school_id,
                "school_name": school_name,
                "category": "school_share",
                "category_name": "School Share",
                "amount": float(school_share_amount),
                "description": f"School revenue share for conversion ({data.get('school_share_type', 'amount')} - {data.get('school_share_calc', 'lumpsum')})",
                "expense_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "payment_status": "pending",
                "school_share_type": data.get("school_share_type"),
                "school_share_calc": data.get("school_share_calc"),
                "school_share_value": data.get("school_share_value"),
                "created_by": user.get("id"),
                "created_by_name": user.get("name", user.get("email", "Admin")),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "auto_created": True,
                "source": "conversion"
            }
            await db.school_expenses.insert_one(school_share_expense)
    
    return {"message": "School onboarded successfully" if not is_draft else "Draft saved successfully", "id": onboarding_id}

@router.get("/schools/onboarding/{school_id}")
async def get_school_onboarding(school_id: str, user: dict = Depends(get_current_user)):
    """Get school onboarding details"""
    onboarding = await db.school_onboarding.find_one({"school_id": school_id}, {"_id": 0})
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    return onboarding

@router.post("/schools/onboarding")
async def create_school_onboarding(data: dict, user: dict = Depends(get_current_user)):
    """Create school onboarding record"""
    school_id = data.get("school_id")
    if not school_id:
        raise HTTPException(status_code=400, detail="school_id is required")
    
    # Check if onboarding already exists
    existing = await db.school_onboarding.find_one({"school_id": school_id})
    if existing:
        # Update existing record instead
        update_data = {k: v for k, v in data.items() if v is not None and k != "school_id"}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.school_onboarding.update_one({"school_id": school_id}, {"$set": update_data})
        return {"message": "Onboarding updated successfully", "id": existing.get("id")}
    
    onboarding_id = str(uuid.uuid4())
    onboarding_doc = {
        "id": onboarding_id,
        "school_id": school_id,
        "offering": data.get("offering", ""),
        "model": data.get("model", ""),
        "book_type": data.get("book_type", ""),
        "kit_type": data.get("kit_type", ""),
        "training_type": data.get("training_type", ""),
        "grade_pricing": data.get("grade_pricing", []),
        "total_students": data.get("total_students", 0),
        "total_amount": data.get("total_amount", 0),
        "school_contacts": data.get("school_contacts", []),
        "payment_mode": data.get("payment_mode", "from_school"),
        "payment_method": data.get("payment_method", ""),
        "payment_tranches": data.get("payment_tranches", []),
        "contract_start": data.get("contract_start", ""),
        "contract_end": data.get("contract_end", ""),
        "mou_url": data.get("mou_url", ""),
        "gst_type": data.get("gst_type", ""),
        "school_address": data.get("school_address", ""),
        "status": "active",
        "is_draft": False,
        "created_by": user.get("email", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.school_onboarding.insert_one(onboarding_doc)
    
    # Update school inquiry with onboarding reference
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {
            "onboarding_id": onboarding_id,
            "onboarding_status": "active",
        }}
    )
    
    return {"message": "Onboarding created successfully", "id": onboarding_id}

@router.put("/schools/onboarding/{onboarding_id}")
async def update_school_onboarding(onboarding_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update school onboarding details and sync to school_inquiries.onboarding_data"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update the school_onboarding collection
    await db.school_onboarding.update_one({"id": onboarding_id}, {"$set": update_data})
    
    # Get the onboarding record to find the school_id
    onboarding_record = await db.school_onboarding.find_one({"id": onboarding_id})
    if onboarding_record:
        school_id = onboarding_record.get("school_id")
        if school_id:
            # Sync relevant fields to school_inquiries.onboarding_data
            # This ensures the tracking page and other views show updated data
            sync_fields = {
                "onboarding_data.mou_url": data.get("mou_url"),
                "onboarding_data.offering": data.get("offering"),
                "onboarding_data.model": data.get("model"),
                "onboarding_data.book_type": data.get("book_type"),
                "onboarding_data.kit_type": data.get("kit_type"),
                "onboarding_data.training_type": data.get("training_type"),
                "onboarding_data.total_students": data.get("total_students"),
                "onboarding_data.total_amount": data.get("total_amount"),
                "onboarding_data.school_contacts": data.get("school_contacts"),
                "onboarding_data.payment_mode": data.get("payment_mode"),
                "onboarding_data.payment_method": data.get("payment_method"),
                "onboarding_data.payment_tranches": data.get("payment_tranches"),
                "onboarding_data.contract_start": data.get("contract_start"),
                "onboarding_data.contract_end": data.get("contract_end"),
                "onboarding_data.pricing_type": data.get("pricing_type"),
                "onboarding_data.fixed_price": data.get("fixed_price"),
                "onboarding_data.grade_pricing": data.get("grade_pricing"),
                "onboarding_data.deadline_date": data.get("deadline_date"),
                "onboarding_data.school_share_type": data.get("school_share_type"),
                "onboarding_data.school_share_calc": data.get("school_share_calc"),
                "onboarding_data.school_share_value": data.get("school_share_value"),
                "onboarding_data.school_share_amount": data.get("school_share_amount"),
                "onboarding_data.gp_share_type": data.get("gp_share_type"),
                "onboarding_data.gp_share_calc": data.get("gp_share_calc"),
                "onboarding_data.gp_share_value": data.get("gp_share_value"),
                "onboarding_data.gp_share_amount": data.get("gp_share_amount"),
                "onboarding_data.gst_type": data.get("gst_type"),
                "onboarding_data.school_address": data.get("school_address"),
            }
            # Only update fields that are provided (not None)
            sync_update = {k: v for k, v in sync_fields.items() if v is not None}
            if sync_update:
                await db.school_inquiries.update_one(
                    {"id": school_id},
                    {"$set": sync_update}
                )
    
    return {"message": "Onboarding updated successfully"}

@router.get("/schools/bulk-import/template")
async def get_bulk_import_template():
    """Return CSV template for bulk school import"""
    template_columns = [
        "school_name", "contact_name", "phone", "email", "location", "board",
        "school_size", "fee_range", "student_count", "offering", "model", "book_type", "kit_type", "training_type",
        "total_students", "total_amount", "payment_mode", "payment_method",
        "contract_start", "contract_end", "notes"
    ]
    
    # Sample row for guidance
    sample_row = {
        "school_name": "Example School",
        "contact_name": "John Doe",
        "phone": "9876543210",
        "email": "school@example.com",
        "location": "Mumbai",
        "board": "CBSE",
        "school_size": "500-1000",
        "fee_range": "50000-100000",
        "student_count": "500",
        "offering": "Robotics Lab Setup",
        "model": "Lab Model",
        "book_type": "individual_books",
        "kit_type": "lab_setup",
        "training_type": "both",
        "total_students": "100",
        "total_amount": "50000",
        "payment_mode": "from_school",
        "payment_method": "neft",
        "contract_start": "2025-01-01",
        "contract_end": "2025-12-31",
        "notes": "Optional notes"
    }
    
    return {
        "columns": template_columns,
        "sample": sample_row,
        "instructions": {
            "board": "Options: CBSE, ICSE, IGCSE, State Board, IB",
            "school_size": "Examples: 0-500, 500-1000, 1000-2000, 2000+",
            "fee_range": "Examples: 0-50000, 50000-100000, 100000+",
            "book_type": "Options: individual_books, no_books",
            "kit_type": "Options: lab_setup, individual, no_kit",
            "training_type": "Options: student_training, teacher_training, both",
            "payment_mode": "Options: from_school, from_student",
            "payment_method": "Options: cheque, neft, online, cash",
            "date_format": "Use YYYY-MM-DD format for dates"
        }
    }

@router.post("/schools/bulk-import")
async def bulk_import_schools(data: dict, user: dict = Depends(get_current_user)):
    """Bulk import schools from CSV/Excel data - creates new or updates existing"""
    schools = data.get("schools", [])
    update_existing = data.get("update_existing", True)  # Default to updating existing
    
    if not schools:
        raise HTTPException(status_code=400, detail="No schools data provided")
    
    imported = 0
    updated = 0
    skipped = 0
    errors = []
    
    for idx, school_data in enumerate(schools):
        try:
            school_name = school_data.get("school_name", "").strip()
            phone = school_data.get("phone", "").strip()
            email = school_data.get("email", "").strip().lower()
            
            if not school_name:
                errors.append({"row": idx + 1, "error": "School name is required"})
                skipped += 1
                continue
            
            # Check for existing school by name first (case-insensitive), then by email/phone
            # Exclude archived schools from matching
            existing = await db.school_inquiries.find_one({
                "$and": [
                    {"status": {"$ne": "archived"}},
                    {"$or": [
                        {"school_name": {"$regex": f"^{school_name}$", "$options": "i"}},
                        {"email": email} if email else {"_id": None},
                        {"phone": phone} if phone else {"_id": None}
                    ]}
                ]
            })
            
            if existing:
                if update_existing:
                    # Update existing school
                    school_id = existing.get("id")
                    update_fields = {
                        "contact_name": school_data.get("contact_name") or existing.get("contact_name", ""),
                        "phone": phone or existing.get("phone", ""),
                        "email": email or existing.get("email", ""),
                        "location": school_data.get("location") or existing.get("location", ""),
                        "board": school_data.get("board") or existing.get("board", ""),
                        "student_count": school_data.get("student_count") or existing.get("student_count", ""),
                        "school_size": school_data.get("school_size") or existing.get("school_size", ""),
                        "fee_range": school_data.get("fee_range") or existing.get("fee_range", ""),
                        "model": school_data.get("model") or existing.get("model", ""),
                        "total_students": int(school_data.get("total_students") or existing.get("total_students", 0) or 0),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                    
                    # If notes provided, append to existing
                    if school_data.get("notes"):
                        existing_notes = existing.get("notes", "")
                        update_fields["notes"] = f"{existing_notes}\n[Bulk Update] {school_data.get('notes')}" if existing_notes else school_data.get("notes")
                    
                    await db.school_inquiries.update_one({"id": school_id}, {"$set": update_fields})
                    
                    # Update or create onboarding record
                    onboarding_data = {
                        "offering": school_data.get("offering", ""),
                        "model": school_data.get("model", ""),
                        "book_type": school_data.get("book_type", ""),
                        "kit_type": school_data.get("kit_type", ""),
                        "training_type": school_data.get("training_type", ""),
                        "total_students": int(school_data.get("total_students", 0) or 0),
                        "total_amount": float(school_data.get("total_amount", 0) or 0),
                        "payment_mode": school_data.get("payment_mode", "from_school"),
                        "payment_method": school_data.get("payment_method", ""),
                        "contract_start": school_data.get("contract_start", ""),
                        "contract_end": school_data.get("contract_end", ""),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                    
                    existing_onboarding = await db.school_onboarding.find_one({"school_id": school_id})
                    if existing_onboarding:
                        # Only update non-empty fields
                        onboarding_update = {k: v for k, v in onboarding_data.items() if v}
                        if onboarding_update:
                            await db.school_onboarding.update_one({"school_id": school_id}, {"$set": onboarding_update})
                    else:
                        # Create new onboarding record
                        onboarding_id = str(uuid.uuid4())
                        onboarding_doc = {
                            "id": onboarding_id,
                            "school_id": school_id,
                            **onboarding_data,
                            "grade_pricing": [],
                            "school_contacts": [{
                                "name": school_data.get("contact_name", ""),
                                "phone": phone,
                                "email": email,
                                "role": "Primary Contact"
                            }] if school_data.get("contact_name") else [],
                            "payment_tranches": [],
                            "status": "active",
                            "is_draft": False,
                            "created_by": user.get("email", "admin"),
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        }
                        await db.school_onboarding.insert_one(onboarding_doc)
                        await db.school_inquiries.update_one(
                            {"id": school_id},
                            {"$set": {"onboarding_id": onboarding_id, "onboarding_status": "active"}}
                        )
                    
                    updated += 1
                else:
                    errors.append({"row": idx + 1, "error": f"Duplicate: School '{school_name}' already exists"})
                    skipped += 1
                continue
            
            # Create new school inquiry record
            school_id = str(uuid.uuid4())
            school_doc = {
                "id": school_id,
                "school_name": school_name,
                "contact_name": school_data.get("contact_name", ""),
                "phone": phone,
                "email": email or f"school_{school_id[:8]}@placeholder.com",
                "location": school_data.get("location", ""),
                "board": school_data.get("board", ""),
                "student_count": school_data.get("student_count", ""),
                "school_size": school_data.get("school_size", ""),
                "fee_range": school_data.get("fee_range", ""),
                "programs_interested": school_data.get("programs_interested", "").split(",") if school_data.get("programs_interested") else [],
                "support_needed": school_data.get("support_needed", "").split(",") if school_data.get("support_needed") else [],
                "source": "bulk_import",
                "status": "active",
                "notes": school_data.get("notes", ""),
                "comments": [],
                "meeting_type": "offline",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": user.get("email", "admin"),
                "assigned_to": user.get("email"),
            }
            await db.school_inquiries.insert_one(school_doc)
            
            # Create onboarding record
            onboarding_id = str(uuid.uuid4())
            onboarding_doc = {
                "id": onboarding_id,
                "school_id": school_id,
                "offering": school_data.get("offering", ""),
                "model": school_data.get("model", ""),
                "book_type": school_data.get("book_type", ""),
                "kit_type": school_data.get("kit_type", ""),
                "training_type": school_data.get("training_type", ""),
                "grade_pricing": [],
                "total_students": int(school_data.get("total_students", 0) or 0),
                "total_amount": float(school_data.get("total_amount", 0) or 0),
                "school_contacts": [{
                    "name": school_data.get("contact_name", ""),
                    "phone": phone,
                    "email": email,
                    "role": "Primary Contact"
                }] if school_data.get("contact_name") else [],
                "payment_mode": school_data.get("payment_mode", "from_school"),
                "payment_method": school_data.get("payment_method", ""),
                "payment_tranches": [],
                "contract_start": school_data.get("contract_start", ""),
                "contract_end": school_data.get("contract_end", ""),
                "status": "active",
                "is_draft": False,
                "created_by": user.get("email", "admin"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.school_onboarding.insert_one(onboarding_doc)
            
            # Update school inquiry with onboarding reference
            await db.school_inquiries.update_one(
                {"id": school_id},
                {"$set": {
                    "onboarding_id": onboarding_id,
                    "onboarding_status": "active",
                    "model": school_data.get("model", ""),
                    "total_students": int(school_data.get("total_students", 0) or 0),
                }}
            )
            
            imported += 1
            
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})
            skipped += 1
    
    return {
        "message": f"Import completed. {imported} new schools, {updated} updated, {skipped} skipped.",
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors[:20]
    }

# Send personalized email to school
@router.post("/schools/send-personalized-email")
async def send_personalized_school_email(data: dict):
    """Send personalized email to school with offerings details"""
    try:
        school_name = data.get("school_name", "")
        contact_name = data.get("contact_name", "")
        email = data.get("email", "")
        programs = data.get("programs_interested", [])
        offerings_ids = data.get("selected_offerings", [])
        meeting_date = data.get("meeting_date")
        meeting_time = data.get("meeting_time")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email address is required")
        
        if not resend.api_key:
            raise HTTPException(status_code=500, detail="Email service not configured")
        
        # Fetch offerings details
        offerings_details = []
        if offerings_ids:
            offerings = await db.offerings.find({"id": {"$in": offerings_ids}}, {"_id": 0}).to_list(50)
            offerings_details = offerings
        
        # Build email content
        programs_str = ", ".join(programs) if programs else "Various Programs"
        
        offerings_html = ""
        if offerings_details:
            offerings_html = "<h3 style='color: #1E3A5F; margin-top: 24px;'>Recommended Offerings for Your School</h3><ul style='margin: 12px 0;'>"
            for o in offerings_details:
                price_str = f"₹{o.get('price', 0):,.0f}" if o.get('price') else "Contact for pricing"
                offerings_html += f"<li style='margin: 8px 0;'><strong>{o.get('name', '')}</strong> - {price_str}"
                if o.get('description'):
                    offerings_html += f"<br><span style='color: #666; font-size: 14px;'>{o.get('description', '')[:200]}</span>"
                offerings_html += "</li>"
            offerings_html += "</ul>"
        
        meeting_html = ""
        if meeting_date and meeting_time:
            meeting_html = f"""
            <div style='background: #f0f9ff; padding: 16px; border-radius: 8px; margin-top: 24px;'>
                <h3 style='color: #1E3A5F; margin: 0 0 12px 0;'>Meeting Scheduled</h3>
                <p style='margin: 4px 0;'><strong>Date:</strong> {meeting_date}</p>
                <p style='margin: 4px 0;'><strong>Time:</strong> {meeting_time}</p>
            </div>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d4a6f 100%); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">OLL</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Empowering Future Skills</p>
                </div>
                
                <div style="padding: 32px;">
                    <h2 style="color: #1E3A5F; margin-top: 0;">Dear {contact_name},</h2>
                    
                    <p style="color: #333; line-height: 1.6;">
                        Thank you for your interest in OLL's skill education programs for <strong>{school_name}</strong>!
                    </p>
                    
                    <p style="color: #333; line-height: 1.6;">
                        We're excited about the opportunity to partner with your institution to bring cutting-edge 
                        <strong>{programs_str}</strong> education to your students.
                    </p>
                    
                    {offerings_html}
                    
                    <h3 style="color: #1E3A5F; margin-top: 24px;">Why Partner with OLL?</h3>
                    <ul style="color: #333; line-height: 1.8;">
                        <li>Industry-aligned curriculum designed by experts</li>
                        <li>Hands-on learning with modern equipment and kits</li>
                        <li>Trained educators and comprehensive teacher support</li>
                        <li>Flexible implementation models (Lab setup, Individual kits, After-school programs)</li>
                        <li>50,000+ students impacted across India</li>
                    </ul>
                    
                    {meeting_html}
                    
                    <p style="color: #333; line-height: 1.6; margin-top: 24px;">
                        We look forward to discussing how OLL can help transform education at your school.
                    </p>
                    
                    <p style="color: #333; margin-top: 24px;">
                        Warm regards,<br>
                        <strong>OLL Team</strong><br>
                        <span style="color: #666;">www.oll.co</span>
                    </p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        OLL<br>
                        Transforming Education Through Innovation
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        email_params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": f"Welcome to OLL - {programs_str} Programs for {school_name}",
            "html": html_content
        }
        
        email_response = await asyncio.to_thread(resend.Emails.send, email_params)
        
        return {
            "success": True,
            "message": "Personalized email sent successfully",
            "email_id": email_response.get("id") if isinstance(email_response, dict) else str(email_response)
        }
        
    except Exception as e:
        print(f"Error sending personalized email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# ========================
# SCHOOL CRM EMAIL SEND ENDPOINT
# ========================

@router.post("/schools/{school_id}/send-crm-email")
async def send_crm_email_for_school(
    school_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """
    Send a CRM email to the school contact.
    data fields:
        email_type: introduction | meeting_confirmation | proposal | mou | followup
        to_email: override email (optional, uses school email by default)
        pdf_base64: base64-encoded PDF (optional)
        pdf_filename: filename for attachment (optional)
        custom_message: extra message for followup emails (optional)
    """
    try:
        school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")

        email_type = data.get("email_type", "introduction")
        to_email = data.get("to_email") or school.get("email", "")

        if not to_email or "@" not in to_email or to_email.endswith("@school.oll"):
            raise HTTPException(status_code=400, detail="Valid email address required. Please update the school's email first.")

        sender_name = user.get("name", "OLL Team")

        # Build extra_data for template
        extra_data = {
            "meeting_date": data.get("meeting_date") or school.get("meeting_date", ""),
            "meeting_time": data.get("meeting_time") or school.get("meeting_time", ""),
            "meeting_mode": data.get("meeting_mode") or school.get("meeting_type", "offline"),
            "meeting_link": data.get("meeting_link") or school.get("meeting_link", ""),
            "custom_message": data.get("custom_message", "")
        }

        from server import send_school_crm_email  # lazy import to avoid circular dependency
        result = await send_school_crm_email(
            to_email=to_email,
            email_type=email_type,
            school_name=school.get("school_name", ""),
            contact_name=school.get("contact_name", ""),
            sender_name=sender_name,
            extra_data=extra_data,
            pdf_base64=data.get("pdf_base64"),
            pdf_filename=data.get("pdf_filename")
        )

        if result.get("success"):
            # Human-friendly email type labels
            email_labels = {
                "introduction":          "Introduction email sent",
                "proposal":              "Proposal email sent",
                "mou":                   "MOU email sent",
                "meeting_confirmation":  "Meeting confirmation email sent",
                "followup":              "Follow-up email sent",
                "followup_1":            "Follow-up 1 email sent",
                "followup_2":            "Follow-up 2 email sent",
                "followup_3":            "Follow-up 3 email sent",
                "followup_4":            "Follow-up 4 email sent",
            }
            label = email_labels.get(email_type, f"{email_type.replace('_', ' ').title()} email sent")
            pdf_note = " (with PDF)" if data.get("pdf_base64") else ""
            await db.school_inquiries.update_one(
                {"id": school_id},
                {"$push": {"activity_log": {
                    "id": str(uuid.uuid4()),
                    "action": f"email_sent_{email_type}",
                    "description": f"{label} to {to_email}{pdf_note}",
                    "performed_by": user.get("name", "Admin"),
                    "performed_at": datetime.now(timezone.utc).isoformat()
                }}}
            )
            # Auto-mark followup task as sent if this was a followup email
            if email_type in ("followup_1", "followup_2", "followup_3", "followup_4"):
                task_id_override = data.get("task_id")
                school_doc = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "followup_tasks": 1})
                tasks = school_doc.get("followup_tasks", []) if school_doc else []
                for task in tasks:
                    if (task_id_override and task["id"] == task_id_override) or \
                       (not task_id_override and task["email_type"] == email_type and task["status"] == "pending"):
                        task["status"] = "sent"
                        task["sent_at"] = datetime.now(timezone.utc).isoformat()
                        task["sent_by"] = user.get("name", "Admin")
                        break
                await db.school_inquiries.update_one(
                    {"id": school_id},
                    {"$set": {"followup_tasks": tasks}}
                )
            return {"success": True, "message": f"Email sent to {to_email}", "email_id": result.get("email_id")}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send email"))

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Send CRM email error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# FOLLOWUP TASK ENDPOINTS
# ========================

@router.patch("/schools/{school_id}/followup-task/{task_id}")
async def update_followup_task(
    school_id: str,
    task_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update a followup task: change date or mark as sent/completed/skipped"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    tasks = school.get("followup_tasks", [])
    updated = False
    for task in tasks:
        if task["id"] == task_id:
            if "scheduled_date" in data:
                task["scheduled_date"] = data["scheduled_date"]
            if "status" in data:
                task["status"] = data["status"]
            if data.get("status") in ("sent", "completed"):
                task["sent_at"] = datetime.now(timezone.utc).isoformat()
                task["sent_by"] = user.get("name", "Admin")
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {"followup_tasks": tasks}}
    )
    return {"success": True, "followup_tasks": tasks}


# Schedule AI-generated followup email
@router.post("/schools/schedule-followup-email")
async def schedule_followup_email(data: dict, user: dict = Depends(get_current_user)):
    """Schedule an AI-generated followup email for a school"""
    try:
        school_id = data.get("school_id")
        school_name = data.get("school_name", "")
        contact_name = data.get("contact_name", "")
        email = data.get("email", "")
        followup_date = data.get("followup_date")
        followup_comment = data.get("followup_comment", "")
        programs = data.get("programs_interested", [])
        
        if not email:
            raise HTTPException(status_code=400, detail="Email address is required")
        
        if not followup_date:
            raise HTTPException(status_code=400, detail="Followup date is required")
        
        # Generate AI email content
        llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not llm_key:
            raise HTTPException(status_code=500, detail="LLM service not configured")
        
        programs_str = ", ".join(programs) if programs else "skill education programs"
        
        # Create AI prompt for email generation
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"followup-{school_id}-{followup_date}",
            system_message="""You are a professional business development representative for OLL (Omni Learning Labs), 
            a company that provides skill education programs (Robotics, Coding, AI, Entrepreneurship, Financial Literacy) to schools.
            Write warm, professional, and personalized followup emails that encourage schools to continue the conversation.
            Keep emails concise (under 200 words), friendly but professional.
            Do not use generic templates - make each email feel personalized based on the context provided."""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        prompt = f"""Write a followup email for:
        - School: {school_name}
        - Contact Person: {contact_name}
        - Programs Discussed: {programs_str}
        - Previous Meeting Notes: {followup_comment if followup_comment else 'Initial discussion about partnership'}
        
        The email should:
        1. Reference our previous conversation naturally
        2. Mention the specific programs they showed interest in
        3. Offer to schedule a call or meeting to discuss next steps
        4. Include a soft call-to-action
        5. Be warm and personalized, not generic
        
        Write ONLY the email body (no subject line, no signature - just the greeting and body text).
        Start with "Dear {contact_name}," and end before the signature."""
        
        user_message = UserMessage(text=prompt)
        ai_email_content = await chat.send_message(user_message)
        
        # Store scheduled email in database
        scheduled_email = {
            "id": f"email-{uuid.uuid4().hex[:8]}",
            "school_id": school_id,
            "school_name": school_name,
            "contact_name": contact_name,
            "email": email,
            "scheduled_date": followup_date,
            "scheduled_time": "09:00",
            "email_content": ai_email_content,
            "programs_interested": programs,
            "followup_comment": followup_comment,
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("user_id", user.get("id", "")),
        }
        
        await db.scheduled_emails.insert_one(scheduled_email)
        
        return {
            "success": True,
            "message": f"Followup email scheduled for {followup_date} at 9:00 AM",
            "email_preview": ai_email_content[:300] + "..." if len(ai_email_content) > 300 else ai_email_content,
            "scheduled_id": scheduled_email["id"]
        }
        
    except Exception as e:
        print(f"Error scheduling followup email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to schedule email: {str(e)}")

# Get scheduled emails for a school
@router.get("/schools/{school_id}/scheduled-emails")
async def get_school_scheduled_emails(school_id: str, user: dict = Depends(get_current_user)):
    """Get all scheduled emails for a school"""
    emails = await db.scheduled_emails.find(
        {"school_id": school_id}, 
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(50)
    return emails

# ========================
# SCHOOL ONBOARDING WORKFLOW
# ========================

# Default onboarding steps template
DEFAULT_ONBOARDING_STEPS = {
    "payment_collection": {
        "title": "Payment Collection",
        "description": "Initial payment received from school",
        "completed": False, "completed_date": None,
        "data": {"amount": None, "payment_date": None, "payment_mode": None, "transaction_id": None, "notes": ""}
    },
    "kit_delivery": {
        "title": "Kit Delivery & Tracking",
        "description": "Kits dispatched and delivered to school",
        "completed": False, "completed_date": None,
        "data": {"dispatch_date": None, "tracking_link": "", "delivery_date": None, "items_list": [], "notes": ""}
    },
    "distribution_checking": {
        "title": "Kit Distribution",
        "description": "Kits distributed to students and verified",
        "completed": False, "completed_date": None,
        "data": {"distribution_date": None, "students_count": None, "queries": [], "notes": ""}
    },
    "lab_setup": {
        "title": "Lab Setup",
        "description": "School lab installed and configured",
        "completed": False, "completed_date": None,
        "data": {"setup_date": None, "technician_name": "", "checklist": [], "notes": ""}
    },
    "lab_refilling": {
        "title": "Kits Checking & Refilling",
        "description": "Existing lab kits inspected and refilled for renewal",
        "completed": False, "completed_date": None,
        "data": {"check_date": None, "items_replaced": [], "notes": ""}
    },
    "technical_check": {
        "title": "Technical Check",
        "description": "All technical requirements verified",
        "completed": False, "completed_date": None,
        "data": {"checklist": [
            {"item": "Lab/Classroom setup verified", "checked": False},
            {"item": "Power supply & electrical points", "checked": False},
            {"item": "Internet connectivity", "checked": False},
            {"item": "Projector/Display working", "checked": False},
            {"item": "All kits functional", "checked": False},
            {"item": "Software installed", "checked": False}
        ], "notes": ""}
    },
    "teacher_training": {
        "title": "Teacher Training",
        "description": "Teachers trained and certified",
        "completed": False, "completed_date": None,
        "data": {"training_date": None, "training_mode": "offline", "teachers_count": None,
                 "checklist": [
                     {"item": "Training session conducted", "checked": False},
                     {"item": "Assessment completed", "checked": False},
                     {"item": "Certificates issued", "checked": False},
                     {"item": "Doubt clearing session done", "checked": False}
                 ], "teachers": [], "notes": ""}
    },
    "teacher_allocation": {
        "title": "Teacher Allocation",
        "description": "OLL educator allocated to the school for student training",
        "completed": False, "completed_date": None,
        "data": {"educator_name": "", "educator_phone": "", "allocation_date": None, "grades_assigned": [], "notes": ""}
    },
    "teacher_approval": {
        "title": "Teacher Approval from School",
        "description": "School principal/contact approves the allocated educator",
        "completed": False, "completed_date": None,
        "data": {"approval_date": None, "approved_by": "", "approval_mode": "email", "notes": ""}
    },
    "timetable_finalization": {
        "title": "Timetable Creation",
        "description": "Class timetable created and confirmed by school",
        "completed": False, "completed_date": None,
        "data": {"grades": [], "sessions_per_week": None, "synced_to_checkin": False, "timetable_data": [], "notes": ""}
    },
    "calendar_making": {
        "title": "Calendar Making",
        "description": "Academic calendar finalized with all events",
        "completed": False, "completed_date": None,
        "data": {"holidays": [], "competitions": [], "exhibitions": [], "special_events": [], "notes": ""}
    },
    "mou_signing": {
        "title": "MOU Signing",
        "description": "Memorandum of Understanding signed",
        "completed": False, "completed_date": None,
        "data": {"mou_date": None, "signed_by_school": False, "signed_by_oll": False, "document_link": "", "notes": ""}
    },
    "lms_setup": {
        "title": "LMS Setup",
        "description": "Student credentials uploaded to LMS",
        "completed": False, "completed_date": None,
        "data": {"students_uploaded": 0, "upload_date": None, "file_url": "", "students_list": [], "notes": ""}
    },
    "school_confirmation": {
        "title": "School Finalization",
        "description": "Final confirmation received from school",
        "completed": False, "completed_date": None,
        "data": {"confirmation_date": None, "confirmed_by": "", "feedback": "", "notes": ""}
    }
}

# ── Ordered step keys per scenario ────────────────────────────────────────
# Used to control rendering order in the UI

def generate_dynamic_onboarding_steps(onboarding_data: dict, is_renewal: bool = False) -> dict:
    """
    Build a tailored onboarding workflow based on the school's program details.

    Rules
    ─────
    • individual kit  → kit_distribution step
    • lab setup       → no kit_distribution; new=lab_setup | renewal=lab_refilling
    • teacher_training (or both) → teacher_training step
    • student_training (or both) → teacher_allocation + teacher_approval + timetable_finalization
    """
    import copy

    kit_type      = (onboarding_data.get("kit_type") or "individual").lower()
    training_type = (onboarding_data.get("training_type") or "teacher_training").lower()

    all_steps = copy.deepcopy(DEFAULT_ONBOARDING_STEPS)

    # Determine which step keys are active (in order)
    ordered_keys = ["payment_collection", "kit_delivery"]

    if kit_type in ("individual", "student_kit", "individual_books"):
        ordered_keys.append("distribution_checking")
    elif kit_type == "lab_setup":
        ordered_keys.append("lab_refilling" if is_renewal else "lab_setup")

    ordered_keys.append("technical_check")

    needs_teacher_training = training_type in ("teacher_training", "both")
    needs_student_training = training_type in ("student_training", "both")

    if needs_teacher_training:
        ordered_keys.append("teacher_training")

    if needs_student_training:
        ordered_keys += ["timetable_finalization", "teacher_allocation", "teacher_approval"]

    ordered_keys += ["calendar_making", "mou_signing", "lms_setup", "school_confirmation"]

    # Return only the active steps (in order, as an ordered dict)
    from collections import OrderedDict
    active = OrderedDict()
    for key in ordered_keys:
        if key in all_steps:
            active[key] = all_steps[key]

    return dict(active)

@router.post("/schools/{school_id}/init-onboarding")
async def init_school_onboarding(school_id: str, data: dict = None, user: dict = Depends(get_current_user)):
    """Initialize onboarding workflow for a converted or renewed school - MOU is already done"""
    import copy
    
    if data is None:
        data = {}
    
    is_renewal = data.get("is_renewal", False)
    
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Generate unique tracking token
    tracking_token = f"oll-{uuid.uuid4().hex[:12]}"
    
    # Initialize onboarding steps dynamically based on what the school purchased
    onboarding_data_for_steps = school.get("onboarding_data") or {}
    steps = generate_dynamic_onboarding_steps(onboarding_data_for_steps, is_renewal=is_renewal)
    if "mou_signing" in steps:
        steps["mou_signing"]["completed"] = True
        steps["mou_signing"]["completed_date"] = datetime.now(timezone.utc).isoformat()
    
    action_label = "Renewal Started" if is_renewal else "Onboarding Started"
    mou_label = "MOU Signed - School Renewed" if is_renewal else "MOU Signed - School Converted"
    
    onboarding_workflow = {
        "tracking_token": tracking_token,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "current_step": "payment_collection",  # Start from payment since MOU is done
        "is_renewal": is_renewal,
        "steps": steps,
        "timeline": [
            {
                "action": mou_label,
                "date": datetime.now(timezone.utc).isoformat(),
                "by": user.get("name", user.get("email", "Admin"))
            },
            {
                "action": action_label,
                "date": datetime.now(timezone.utc).isoformat(),
                "by": user.get("name", user.get("email", "Admin"))
            }
        ]
    }
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {
            "onboarding_workflow": onboarding_workflow,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get updated school and onboarding data
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    onboarding_data = school.get("onboarding_data") or {}
    
    # Send welcome email to school
    school_emails = []
    if school.get("email"):
        school_emails.append(school.get("email"))
    
    # Get contacts from onboarding data
    school_contacts = onboarding_data.get("school_contacts", [])
    for contact in school_contacts:
        if contact.get("email") and contact.get("email") not in school_emails:
            school_emails.append(contact.get("email"))
    
    if school_emails:
        try:
            # Get MOU URL
            mou_url = onboarding_data.get("mou_url", "")
            
            # Build tracking URL
            tracking_url = f"https://oll.co/track/{tracking_token}"
            
            # Build email content - different for renewals
            if is_renewal:
                email_subject = f"Welcome Back! - {school.get('school_name')} Renewal Started"
                header_text = "🎉 Welcome Back to OLL!"
                header_subtext = "We're excited to continue our partnership"
                greeting_text = f"Thank you for renewing your partnership with us! We're thrilled to continue working with <strong style='color: #1E3A5F;'>{school.get('school_name')}</strong> for another successful year."
            else:
                email_subject = f"Welcome to OLL - {school.get('school_name')} Onboarding Started!"
                header_text = "🎉 Welcome to OLL!"
                header_subtext = "Your journey to transforming education begins now"
                greeting_text = f"Congratulations! We are thrilled to welcome <strong style='color: #1E3A5F;'>{school.get('school_name')}</strong> to the OLL family. Together, we'll embark on an exciting journey of innovation and skill-based education."
            
            offerings_list = ", ".join(school.get("selected_offerings", school.get("programs_interested", [])))
            contract_start = onboarding_data.get("contract_start", "TBD")
            contract_end = onboarding_data.get("contract_end", "TBD")
            total_students = onboarding_data.get("total_students", "TBD")
            
            email_html = f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
                <!-- Header with Logo and Celebration -->
                <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8f 100%); padding: 40px 30px; text-align: center;">
                    <img src="https://customer-assets.emergentagent.com/job_oll-skill-edu/artifacts/wzn0gh6k_OLL-horizontal-logo-white.png" alt="OLL Logo" style="height: 50px; margin-bottom: 20px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">{header_text}</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 16px;">{header_subtext}</p>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 35px 30px; background: #f8fafc;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        Dear {school.get('contact_name', 'Team')},
                    </p>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        {greeting_text}
                    </p>
                    
                    <!-- Program Details Card -->
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="color: #1E3A5F; font-size: 18px; margin: 0 0 20px 0; border-bottom: 2px solid #FFD93D; padding-bottom: 10px; display: inline-block;">📋 Partnership Details</h3>
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; width: 40%;">Programs</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 600;">{offerings_list or 'To be confirmed'}</td>
                            </tr>
                            <tr style="background: #f8fafc;">
                                <td style="padding: 10px; color: #6b7280; border-radius: 4px 0 0 4px;">Total Students</td>
                                <td style="padding: 10px; color: #111827; font-weight: 600; border-radius: 0 4px 4px 0;">{total_students}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280;">Contract Period</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 600;">{contract_start} to {contract_end}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Onboarding Steps Timeline -->
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="color: #1E3A5F; font-size: 18px; margin: 0 0 20px 0;">🚀 Your Onboarding Journey</h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; flex-shrink: 0;">✓</div>
                                <div>
                                    <strong style="color: #111827;">MOU Signing</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Partnership agreement completed</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #1E3A5F; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; flex-shrink: 0;">1</div>
                                <div>
                                    <strong style="color: #111827;">Payment Collection</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Complete payment as per agreed schedule</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #d1d5db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6b7280; font-weight: bold; font-size: 14px; flex-shrink: 0;">2</div>
                                <div>
                                    <strong style="color: #111827;">Kit Delivery</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Receive your robotics/STEM kits at school</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #d1d5db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6b7280; font-weight: bold; font-size: 14px; flex-shrink: 0;">3</div>
                                <div>
                                    <strong style="color: #111827;">Teacher Training</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Training sessions for your faculty</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="width: 30px; height: 30px; background: #d1d5db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6b7280; font-weight: bold; font-size: 14px; flex-shrink: 0;">4</div>
                                <div>
                                    <strong style="color: #111827;">Program Launch</strong>
                                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Start classes with students</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{tracking_url}" style="display: inline-block; background: linear-gradient(135deg, #FFD93D 0%, #f59e0b 100%); color: #1E3A5F; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(255,217,61,0.4);">
                            📊 Track Your Onboarding Progress
                        </a>
                    </div>
                    
                    {"<div style='background: #e0f2fe; border: 1px solid #0284c7; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;'><strong style='color: #0369a1;'>📎 MOU Document:</strong> <a href='" + mou_url + "' style='color: #0284c7; font-weight: 600;'>Download MOU</a></div>" if mou_url else ""}
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 25px;">
                        Your dedicated relationship manager will be in touch soon to guide you through each step. 
                        If you have any questions, feel free to reach out at <a href="mailto:support@oll.co" style="color: #1E3A5F; font-weight: 600;">support@oll.co</a> or call us at <strong>+91 9920188188</strong>.
                    </p>
                    
                    <p style="color: #374151; font-size: 14px; margin-top: 25px;">
                        Warm regards,<br>
                        <strong style="color: #1E3A5F;">The OLL Team</strong>
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background: #1E3A5F; color: white; padding: 25px; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">OLL</p>
                    <p style="margin: 0; font-size: 12px; opacity: 0.8;">support@oll.co | +91 9920188188</p>
                </div>
            </div>
            """
            
            # Send email using Resend SDK directly
            for email in school_emails:
                try:
                    email_params = {
                        "from": "OLL Team <welcome@oll.co>",
                        "to": [email],
                        "subject": email_subject,
                        "html": email_html
                    }
                    await asyncio.to_thread(resend.Emails.send, email_params)
                    print(f"Welcome email sent to {email}")
                except Exception as email_err:
                    print(f"Failed to send welcome email to {email}: {email_err}")
                    
        except Exception as e:
            print(f"Welcome email error: {e}")
    
    return {
        "success": True,
        "tracking_token": tracking_token,
        "tracking_url": f"/track/{tracking_token}",
        "school": school,
        "emails_sent": school_emails
    }

@router.post("/schools/{school_id}/regenerate-workflow")
async def regenerate_onboarding_workflow(school_id: str, user: dict = Depends(get_current_user)):
    """
    Regenerate onboarding workflow steps based on current onboarding_data.
    Preserves completed status and data for steps that exist in both old and new workflow.
    Useful when a school's kit_type or training_type changes after onboarding was initialized.
    """
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    workflow = school.get("onboarding_workflow")
    if not workflow:
        raise HTTPException(status_code=400, detail="No onboarding workflow found. Initialize onboarding first.")

    onboarding_data = school.get("onboarding_data") or {}
    is_renewal = workflow.get("is_renewal", False)

    # Generate fresh step set based on current onboarding_data
    new_steps = generate_dynamic_onboarding_steps(onboarding_data, is_renewal=is_renewal)

    # Preserve completed status and data from existing steps
    old_steps = workflow.get("steps", {})
    for key, step in new_steps.items():
        if key in old_steps:
            step["completed"] = old_steps[key].get("completed", False)
            step["completed_date"] = old_steps[key].get("completed_date")
            # Merge saved data fields
            saved_data = old_steps[key].get("data", {})
            if saved_data:
                step["data"] = {**step.get("data", {}), **saved_data}

    # Find next incomplete step
    current_step = None
    for sk in new_steps.keys():
        if not new_steps[sk].get("completed", False):
            current_step = sk
            break

    workflow["steps"] = new_steps
    workflow["current_step"] = current_step

    # Add timeline entry
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": "Workflow steps regenerated based on current program details",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": user.get("name", user.get("email", "Admin"))
    })
    workflow["timeline"] = timeline

    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {
            "onboarding_workflow": workflow,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    updated_school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    return {
        "success": True,
        "message": f"Workflow regenerated with {len(new_steps)} steps",
        "workflow": updated_school.get("onboarding_workflow"),
        "school": updated_school
    }


@router.patch("/schools/{school_id}/onboarding-step/{step_key}")
async def update_onboarding_step(
    school_id: str, 
    step_key: str, 
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update a specific onboarding step"""
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    workflow = school.get("onboarding_workflow", {})
    steps = workflow.get("steps", {})
    
    if step_key not in steps:
        raise HTTPException(status_code=400, detail=f"Invalid step: {step_key}")
    
    # Update step data
    step = steps[step_key]
    if "completed" in data:
        step["completed"] = data["completed"]
        if data["completed"]:
            step["completed_date"] = datetime.now(timezone.utc).isoformat()
        else:
            step["completed_date"] = None
    
    if "data" in data:
        step["data"] = {**step.get("data", {}), **data["data"]}
    
    steps[step_key] = step
    
    # Add to timeline
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": f"{step['title']} - {'Completed' if step['completed'] else 'Updated'}",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": user.get("name", user.get("email", "Admin")),
        "step": step_key
    })
    
    # Check if all steps completed
    all_completed = all(s.get("completed", False) for s in steps.values())
    
    # Update workflow
    workflow["steps"] = steps
    workflow["timeline"] = timeline
    if all_completed:
        workflow["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    # Find next incomplete step using actual workflow keys (preserves dynamic order)
    current_step = None
    for sk in steps.keys():
        if not steps.get(sk, {}).get("completed", False):
            current_step = sk
            break
    workflow["current_step"] = current_step
    
    update_data = {
        "onboarding_workflow": workflow,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If all steps completed and this is a renewal, move back to 'active'
    # If all steps completed and this is a new conversion, move to 'active'
    if all_completed:
        school = await db.school_inquiries.find_one({"id": school_id})
        current_status = school.get("status") if school else None
        if current_status in ["converted", "renewed"]:
            update_data["status"] = "active"
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": update_data}
    )
    
    return {"success": True, "step": step, "all_completed": all_completed}

@router.post("/schools/{school_id}/onboarding-query")
async def add_onboarding_query(
    school_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Add a query/issue during onboarding"""
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    query = {
        "id": f"query-{uuid.uuid4().hex[:8]}",
        "type": data.get("type", "general"),
        "description": data.get("description", ""),
        "step": data.get("step", "distribution_checking"),
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("name", user.get("email", "Admin")),
        "resolved_at": None,
        "resolution": ""
    }
    
    workflow = school.get("onboarding_workflow", {})
    steps = workflow.get("steps", {})
    step_data = steps.get(data.get("step", "distribution_checking"), {}).get("data", {})
    queries = step_data.get("queries", [])
    queries.append(query)
    step_data["queries"] = queries
    steps[data.get("step", "distribution_checking")]["data"] = step_data
    workflow["steps"] = steps
    
    # Add to timeline
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": f"Query Added: {data.get('type', 'general')}",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": user.get("name", user.get("email", "Admin")),
        "step": data.get("step", "distribution_checking")
    })
    workflow["timeline"] = timeline
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {"onboarding_workflow": workflow}}
    )
    
    return {"success": True, "query": query}


@router.post("/schools/{school_id}/send-mou-email")
async def send_mou_email(school_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Send MOU PDF as email attachment to school contacts"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")

    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    mou_url = data.get("mou_url")
    file_name = data.get("file_name", "MOU.pdf")
    recipient_emails = data.get("emails", [])

    # Collect school contact emails
    if not recipient_emails:
        if school.get("email"):
            recipient_emails.append(school["email"])
        od = school.get("onboarding_data") or {}
        for contact_key in ["coordinator", "principal", "accounts_coordinator"]:
            c = od.get(contact_key, {})
            if c.get("email") and c["email"] not in recipient_emails:
                recipient_emails.append(c["email"])

    if not recipient_emails:
        raise HTTPException(status_code=400, detail="No recipient email addresses found for this school")

    await ensure_resend_api_key()
    if not resend.api_key:
        raise HTTPException(status_code=400, detail="Email service not configured. Add Resend API key in Settings.")

    school_name = school.get("school_name", "School")

    # Build attachment from URL
    attachment = None
    if mou_url:
        attachment = {
            "path": mou_url,
            "filename": file_name,
        }

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E3A5F; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">OLL</h1>
            <p style="color: #e0e0e0; margin: 5px 0 0 0;">One Learner at a time, One Life skill at a time</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1E3A5F; margin-top: 0;">Memorandum of Understanding</h2>
            <p style="color: #444; line-height: 1.6;">Dear {school_name} Team,</p>
            <p style="color: #444; line-height: 1.6;">Please find attached the Memorandum of Understanding (MOU) for our programme partnership.</p>
            <p style="color: #444; line-height: 1.6;">Kindly review, sign, and return a copy at your earliest convenience.</p>
            <div style="background: #f0f5fc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #1E3A5F; margin: 0; font-weight: bold;">Next Steps:</p>
                <ul style="color: #444; margin: 8px 0 0 0; padding-left: 20px;">
                    <li>Review all terms and conditions</li>
                    <li>Sign and stamp the document</li>
                    <li>Share a scanned copy with us</li>
                </ul>
            </div>
            <p style="color: #444;">Warm regards,<br><strong>The OLL Team</strong></p>
        </div>
        <div style="text-align: center; padding: 15px; color: #888; font-size: 12px;">
            <p>Clone Futura Live Solutions Pvt Ltd | www.oll.co</p>
        </div>
    </div>
    """

    try:
        params = {
            "from": SENDER_EMAIL,
            "to": recipient_emails,
            "subject": f"MOU - OLL x {school_name}",
            "html": html_content,
        }
        if attachment:
            params["attachments"] = [attachment]

        email_response = await asyncio.to_thread(resend.Emails.send, params)
        email_id = email_response.get("id") if isinstance(email_response, dict) else str(email_response)
        return {
            "success": True,
            "message": f"MOU sent to {', '.join(recipient_emails)}",
            "email_id": email_id,
            "recipients": recipient_emails,
        }
    except Exception as e:
        error_msg = str(e)
        logging.error(f"MOU email error: {error_msg}")
        if "testing" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Resend API key is a TEST key. Update to production key.")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {error_msg}")


@router.post("/schools/{school_id}/add-document")
async def add_school_document(school_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Atomically append a document to school's documents array"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    
    doc_entry = {
        "type": data.get("type", "General"),
        "url": data.get("url"),
        "name": data.get("name"),
        "uploaded_at": data.get("uploaded_at", datetime.now(timezone.utc).isoformat()),
        "uploaded_by": data.get("uploaded_by", user.get("name") or user.get("email", "Admin")),
    }
    if not doc_entry["url"]:
        raise HTTPException(status_code=400, detail="Document URL is required")

    result = await db.school_inquiries.update_one(
        {"id": school_id},
        [{"$set": {
            "documents": {
                "$cond": {
                    "if": {"$isArray": "$documents"},
                    "then": {"$concatArrays": ["$documents", [doc_entry]]},
                    "else": [doc_entry]
                }
            }
        }}]
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="School not found")
    return {"success": True, "document": doc_entry}


@router.get("/schools/{school_id}/onboarding")
async def get_school_onboarding(school_id: str, user: dict = Depends(get_current_user)):
    """Get onboarding workflow for a school"""
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    po_requests = school.get("po_requests", [])
    for po_req in po_requests:
        if po_req.get('tracking_url'):
            po_req['tracking_url'] = transform_tracking_url(po_req['tracking_url'])
    
    return {
        "school_id": school_id,
        "school_name": school.get("school_name"),
        "contact_name": school.get("contact_name"),
        "workflow": school.get("onboarding_workflow", {}),
        "po_requests": po_requests,
        "onboarding_data": school.get("onboarding_data") or {},
    }

@router.post("/schools/{school_id}/lms-students")
async def upload_lms_students(school_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Upload student credentials for LMS setup"""
    school = await db.school_inquiries.find_one({"id": school_id})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    students = data.get("students", [])
    file_url = data.get("file_url", "")
    
    workflow = school.get("onboarding_workflow", {})
    if not workflow:
        raise HTTPException(status_code=400, detail="Onboarding not initialized")
    
    # Update lms_setup step
    if "lms_setup" not in workflow.get("steps", {}):
        workflow["steps"]["lms_setup"] = {
            "title": "LMS Setup",
            "description": "Student credentials uploaded to LMS",
            "completed": False,
            "completed_date": None,
            "data": {
                "students_uploaded": 0,
                "upload_date": None,
                "file_url": "",
                "students_list": [],
                "notes": ""
            }
        }
    
    workflow["steps"]["lms_setup"]["data"]["students_list"] = students
    workflow["steps"]["lms_setup"]["data"]["students_uploaded"] = len(students)
    workflow["steps"]["lms_setup"]["data"]["file_url"] = file_url
    workflow["steps"]["lms_setup"]["data"]["upload_date"] = datetime.now(timezone.utc).isoformat()
    
    if len(students) > 0:
        workflow["steps"]["lms_setup"]["completed"] = True
        workflow["steps"]["lms_setup"]["completed_date"] = datetime.now(timezone.utc).isoformat()
    
    # Add to timeline
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": "lms_students_uploaded",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": user.get("name", user.get("email")),
        "details": f"Uploaded {len(students)} student credentials for LMS"
    })
    workflow["timeline"] = timeline
    
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {"onboarding_workflow": workflow}}
    )
    
    return {
        "success": True,
        "students_uploaded": len(students),
        "message": f"Successfully uploaded {len(students)} student credentials"
    }

# Public tracking endpoint (no auth required)
@router.post("/schools/{school_id}/po-preview")
async def preview_po_products(school_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Preview the auto-computed PO products without submitting to vendor"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    od = school.get("onboarding_data") or {}
    course_type = od.get("course_type", "only_robotics")
    kit_type = od.get("kit_type", "individual")
    book_type = od.get("book_type", "no_books")
    lab_kit_count = int(od.get("lab_kit_count") or 0)
    grade_pricing = od.get("grade_pricing", [])
    products = []
    unmatched = []
    catalog = await fetch_vendor_products()
    if kit_type == "individual":
        for gp in grade_pricing:
            grade = gp.get("grade", "")
            students = int(gp.get("students") or 0)
            if not grade or students <= 0:
                continue
            pid, pname = match_vendor_product(catalog, grade, "kit", course_type)
            if pid:
                products.append({"product_id": pid, "product_name": pname, "quantity": students})
            else:
                grade_num = int(grade) if str(grade).isdigit() else 0
                fallback = "IOT Kit" if (course_type == "robotics_coding_ai" and grade_num >= 7) else "Robotics Kit"
                products.append({"product_name": f"{fallback} - Grade {grade}", "quantity": students})
                unmatched.append(f"{fallback} Grade {grade}")
    elif kit_type == "lab_setup" and lab_kit_count > 0:
        pid, pname = match_vendor_product(catalog, "", "lab_kit", course_type)
        if pid:
            products.append({"product_id": pid, "product_name": pname, "quantity": lab_kit_count})
        else:
            fallback = "IOT Lab Kit" if course_type == "robotics_coding_ai" else "Robotics Lab Kit"
            products.append({"product_name": fallback, "quantity": lab_kit_count})
            unmatched.append(fallback)
    if book_type == "individual_books":
        for gp in grade_pricing:
            grade = gp.get("grade", "")
            students = int(gp.get("students") or 0)
            if not grade or students <= 0:
                continue
            pid, pname = match_vendor_product(catalog, grade, "book", course_type)
            if pid:
                products.append({"product_id": pid, "product_name": pname, "quantity": students})
            else:
                products.append({"product_name": f"Book - Grade {grade}", "quantity": students})
                unmatched.append(f"Book Grade {grade}")
    return {"products": products, "unmatched": unmatched}


@router.post("/schools/{school_id}/raise-po")
async def raise_po_for_school(school_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Build PO products from onboarding data and submit to vendor panel"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")

    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    od = school.get("onboarding_data") or {}
    delivery_date = data.get("delivery_date")
    if not delivery_date:
        raise HTTPException(status_code=400, detail="Delivery date is required")

    course_type = od.get("course_type", "only_robotics")
    kit_type = od.get("kit_type", "individual")
    book_type = od.get("book_type", "no_books")
    lab_kit_count = int(od.get("lab_kit_count") or 0)
    grade_pricing = od.get("grade_pricing", [])

    products = []
    unmatched = []

    # Use products override if provided by frontend (post-preview edits)
    if data.get("products"):
        products = data["products"]
    else:
        # Fetch vendor product catalog for ID matching
        catalog = await fetch_vendor_products()

        # ── Kit Products ──
        if kit_type == "individual":
            for gp in grade_pricing:
                grade = gp.get("grade", "")
                students = int(gp.get("students") or 0)
                if not grade or students <= 0:
                    continue
                pid, pname = match_vendor_product(catalog, grade, "kit", course_type)
                if pid:
                    products.append({"product_id": pid, "product_name": pname, "quantity": students})
                else:
                    grade_num = int(grade) if str(grade).isdigit() else 0
                    fallback = "IOT Kit" if (course_type == "robotics_coding_ai" and grade_num >= 7) else "Robotics Kit"
                    products.append({"product_name": f"{fallback} - Grade {grade}", "quantity": students})
                    unmatched.append(f"{fallback} Grade {grade}")

        elif kit_type == "lab_setup" and lab_kit_count > 0:
            pid, pname = match_vendor_product(catalog, "", "lab_kit", course_type)
            if pid:
                products.append({"product_id": pid, "product_name": pname, "quantity": lab_kit_count})
            else:
                fallback = "IOT Lab Kit" if course_type == "robotics_coding_ai" else "Robotics Lab Kit"
                products.append({"product_name": fallback, "quantity": lab_kit_count})
                unmatched.append(fallback)

        # ── Book Products ──
        if book_type == "individual_books":
            for gp in grade_pricing:
                grade = gp.get("grade", "")
                students = int(gp.get("students") or 0)
                if not grade or students <= 0:
                    continue
                pid, pname = match_vendor_product(catalog, grade, "book", course_type)
                if pid:
                    products.append({"product_id": pid, "product_name": pname, "quantity": students})
                else:
                    products.append({"product_name": f"Book - Grade {grade}", "quantity": students})
                    unmatched.append(f"Book Grade {grade}")

    if not products:
        raise HTTPException(status_code=400, detail="No products could be determined from onboarding data. Check course type, kit type, and grade pricing.")

    school_name = school.get("school_name", "")
    contact_name = school.get("contact_name", "")
    contact_phone = school.get("contact_phone") or school.get("phone", "")
    address = school.get("address") or od.get("address") or school.get("city", "")

    po_payload = {
        "requester_name": user.get("name") or user.get("email", "OLL System"),
        "delivery_date": delivery_date,
        "delivery_address": address or school_name,
        "contact_person": contact_name or school_name,
        "contact_number": contact_phone or "",
        "school_name": school_name,
        "city": school.get("city", ""),
        "notes": f"Auto-generated PO for {school_name}. Course: {course_type}, Kit: {kit_type}, Book: {book_type}",
        "source_system": "oll_admin",
        "products": products,
    }

    # Call vendor panel API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{VENDOR_PUBLIC_API}/po-request",
                json=po_payload,
                timeout=15.0
            )
            response.raise_for_status()
            po_result = response.json()
        except httpx.HTTPStatusError as e:
            err_text = e.response.text if hasattr(e.response, 'text') else str(e)
            logging.error(f"Vendor PO API error: {e.response.status_code} - {err_text}")
            raise HTTPException(status_code=502, detail=f"Vendor API error: {err_text}")
        except Exception as e:
            logging.error(f"Vendor PO API error: {str(e)}")
            raise HTTPException(status_code=502, detail=f"Failed to reach vendor API: {str(e)}")

    # Store PO info on the school
    po_info = {
        "po_number": po_result.get("po_number"),
        "po_id": po_result.get("po_id"),
        "tracking_token": po_result.get("tracking_token"),
        "tracking_url": transform_tracking_url(po_result.get("tracking_url")),
        "status": po_result.get("status"),
        "products": products,
        "delivery_date": delivery_date,
        "raised_at": datetime.now(timezone.utc).isoformat(),
        "raised_by": user.get("email"),
    }
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$push": {"po_requests": po_info}}
    )

    # Also update onboarding kit_delivery step
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {
            "onboarding_workflow.steps.kit_delivery.data.po_number": po_result.get("po_number"),
            "onboarding_workflow.steps.kit_delivery.data.po_status": po_result.get("status"),
            "onboarding_workflow.steps.kit_delivery.data.delivery_date": delivery_date,
            "onboarding_workflow.steps.kit_delivery.data.tracking_url": transform_tracking_url(po_result.get("tracking_url")),
        }}
    )

    return {
        "success": True,
        "po_number": po_result.get("po_number"),
        "tracking_token": po_result.get("tracking_token"),
        "tracking_url": transform_tracking_url(po_result.get("tracking_url")),
        "products_count": len(products),
        "products": products,
        "unmatched_products": unmatched,
        "message": f"PO {po_result.get('po_number')} raised successfully with {len(products)} product(s)",
    }


@router.get("/schools/{school_id}/po-data")
async def get_school_po_data(school_id: str, user: dict = Depends(get_current_user)):
    """Get PO data for a school from ProcureWay - excludes delivered POs"""
    # Get school info
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    school_name = school.get("school_name", "")
    
    # Fetch all POs for this school (by school_name match)
    po_list_data = await fetch_po_data("po", {"school_name": school_name, "limit": 50})
    
    if not po_list_data or "data" not in po_list_data:
        return {
            "school_id": school_id,
            "school_name": school_name,
            "pos": [],
            "active_po": None,
            "message": "No POs found for this school"
        }
    
    # Filter out delivered POs
    active_pos = [
        po for po in po_list_data.get("data", [])
        if po.get("status", "").lower() != "delivered"
    ]
    
    # Fetch detailed info for each active PO
    detailed_pos = []
    for po in active_pos:
        po_number = po.get("po_number")
        if po_number:
            detailed = await fetch_po_data(f"po/{po_number}")
            if detailed:
                detailed_pos.append(detailed)
    
    # Get the most relevant PO (latest non-delivered one)
    active_po = detailed_pos[0] if detailed_pos else None
    
    return {
        "school_id": school_id,
        "school_name": school_name,
        "pos": detailed_pos,
        "active_po": active_po,
        "total_pos": len(detailed_pos)
    }


@router.post("/schools/{school_id}/sync-po-expenses")
async def sync_po_expenses(school_id: str, data: dict = None, user: dict = Depends(get_current_user)):
    """PO expense sync disabled - expenses are managed manually in the Admin Expenses panel."""
    return {"message": "PO expense sync is disabled. Add expenses manually via the Expenses page.", "expenses_created": 0}


@router.get("/schools/{school_id}/onboarding-po-info")
async def get_onboarding_po_info(school_id: str, user: dict = Depends(get_current_user)):
    """Get PO delivery info for onboarding kit_delivery step"""
    # Get school info
    school = await db.school_inquiries.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    school_name = school.get("school_name", "")
    
    # Fetch POs for this school (exclude delivered)
    po_list_data = await fetch_po_data("po", {"school_name": school_name, "limit": 50})
    
    if not po_list_data or "data" not in po_list_data:
        return {
            "has_po": False,
            "delivery_date": None,
            "dispatch_date": None,
            "tracking_link": None,
            "message": "No active POs found"
        }
    
    # Filter out delivered POs and get details
    active_pos = []
    for po in po_list_data.get("data", []):
        if po.get("status", "").lower() != "delivered":
            po_number = po.get("po_number")
            if po_number:
                detailed = await fetch_po_data(f"po/{po_number}")
                if detailed:
                    active_pos.append(detailed)
    
    if not active_pos:
        return {
            "has_po": False,
            "delivery_date": None,
            "dispatch_date": None,
            "tracking_link": None,
            "message": "All POs are delivered or no active POs"
        }
    
    # Get the most recent active PO
    primary_po = active_pos[0]
    dispatch_info = primary_po.get("dispatch_info") or {}
    
    return {
        "has_po": True,
        "po_number": primary_po.get("po_number"),
        "po_status": primary_po.get("status"),
        "delivery_date": primary_po.get("delivery_date"),
        "dispatch_date": dispatch_info.get("dispatch_date"),
        "tracking_link": transform_tracking_url(primary_po.get("tracking_link")),
        "public_tracking_url": transform_tracking_url(primary_po.get("public_tracking_url")),
        "vendor_name": primary_po.get("vendor_name"),
        "contact_person": primary_po.get("contact_person"),
        "delivery_address": primary_po.get("delivery_address"),
        "grand_total": primary_po.get("grand_total"),
        "all_pos": [{
            "po_number": po.get("po_number"),
            "status": po.get("status"),
            "delivery_date": po.get("delivery_date"),
            "tracking_link": transform_tracking_url(po.get("tracking_link")),
            "public_tracking_url": transform_tracking_url(po.get("public_tracking_url")),
            "vendor_name": po.get("vendor_name"),
            "grand_total": po.get("grand_total")
        } for po in active_pos]
    }


# ========================
# EXTERNAL API KEY SYSTEM
# ========================

import secrets

async def verify_external_api_key(api_key: str = Header(None, alias="X-API-Key")):
    """Verify external API key from header"""
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required. Use X-API-Key header.")
    
    # Find the API key in database
    key_doc = await db.external_api_keys.find_one({"key": api_key, "is_active": True}, {"_id": 0})
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    
    # Update last used timestamp
    await db.external_api_keys.update_one(
        {"key": api_key},
        {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}, "$inc": {"usage_count": 1}}
    )
    
    return key_doc


# NOTE: /admin_keys routes moved to routes/admin_keys.py
# NOTE: /reports routes moved to routes/reports.py

# ========================
# MANUAL TRIGGER ENDPOINTS (For Testing)
# ========================

@router.post("/admin/trigger/overdue-check")
@router.get("/track/{tracking_token}")
async def get_public_tracking(tracking_token: str):
    """Public endpoint for schools to track their onboarding progress"""
    school = await db.school_inquiries.find_one(
        {"onboarding_workflow.tracking_token": tracking_token},
        {"_id": 0, "password": 0}
    )
    
    if not school:
        raise HTTPException(status_code=404, detail="Tracking not found")
    
    workflow = school.get("onboarding_workflow", {})
    steps = workflow.get("steps", {})
    onboarding_data = school.get("onboarding_data") or {}
    
    # Fetch PO data for this school (for kit_delivery step) - with short timeout for better UX
    po_info = None
    school_name = school.get("school_name", "")
    if school_name:
        try:
            # Use shorter timeout for public tracking page (5 seconds total)
            po_list_data = await asyncio.wait_for(
                fetch_po_data("po", {"school_name": school_name, "limit": 10}, timeout=5.0),
                timeout=5.0
            )
            if po_list_data and "data" in po_list_data:
                # Filter out delivered POs
                active_pos = [
                    po for po in po_list_data.get("data", [])
                    if po.get("status", "").lower() != "delivered"
                ]
                if active_pos:
                    # Get detailed info for the first active PO
                    po_number = active_pos[0].get("po_number")
                    if po_number:
                        detailed_po = await asyncio.wait_for(
                            fetch_po_data(f"po/{po_number}", timeout=5.0),
                            timeout=5.0
                        )
                        if detailed_po:
                            dispatch_info = detailed_po.get("dispatch_info") or {}
                            po_info = {
                                "po_number": detailed_po.get("po_number"),
                                "status": detailed_po.get("status"),
                                "delivery_date": detailed_po.get("delivery_date"),
                                "dispatch_date": dispatch_info.get("dispatch_date"),
                                "tracking_link": transform_tracking_url(detailed_po.get("tracking_link")),
                                "public_tracking_url": transform_tracking_url(detailed_po.get("public_tracking_url")),
                                "vendor_name": detailed_po.get("vendor_name"),
                            }
        except asyncio.TimeoutError:
            logging.warning(f"PO data fetch timeout for tracking page: {school_name}")
        except Exception as e:
            logging.error(f"Error fetching PO data for tracking: {str(e)}")
    
    # Calculate progress
    total_steps = len(steps)
    completed_steps = sum(1 for s in steps.values() if s.get("completed", False))
    progress_percent = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0
    
    # Build public-safe response - MOU first, then rest in workflow order
    public_steps = []
    # Use actual step keys from workflow (preserves dynamic order), put mou_signing first
    all_step_keys = list(steps.keys())
    if "mou_signing" in all_step_keys:
        all_step_keys.remove("mou_signing")
        all_step_keys.insert(0, "mou_signing")
    
    for key in all_step_keys:
        step = steps.get(key, {})
        if not step:
            continue
        step_data = step.get("data", {})
        
        # For kit_delivery, include PO info
        kit_delivery_data = None
        kit_tracking_link = step_data.get("tracking_link")
        kit_scheduled_date = step_data.get("scheduled_date") or step_data.get("delivery_date") or step_data.get("dispatch_date") or step_data.get("distribution_date")
        
        if key == "kit_delivery" and po_info:
            kit_delivery_data = po_info
            # Use PO tracking link if not manually set
            if not kit_tracking_link:
                kit_tracking_link = po_info.get("tracking_link") or po_info.get("public_tracking_url")
            else:
                # Transform any preview URL in the stored tracking link
                kit_tracking_link = transform_tracking_url(kit_tracking_link)
            # Use PO delivery date if not manually set
            if not kit_scheduled_date:
                kit_scheduled_date = po_info.get("delivery_date")
        elif key == "kit_delivery" and kit_tracking_link:
            # Transform tracking link even if no PO info
            kit_tracking_link = transform_tracking_url(kit_tracking_link)
        
        public_steps.append({
            "key": key,
            "title": step.get("title", key.replace("_", " ").title()),
            "description": step.get("description", ""),
            "completed": step.get("completed", False),
            "completed_date": step.get("completed_date"),
            # Include scheduled dates for upcoming steps - also check for various date field names
            "scheduled_date": kit_scheduled_date if key == "kit_delivery" else (step_data.get("scheduled_date") or step_data.get("delivery_date") or step_data.get("dispatch_date") or step_data.get("distribution_date")),
            "tracking_link": kit_tracking_link if key == "kit_delivery" else None,
            "training_date": step_data.get("training_date") if key == "teacher_training" else None,
            "training_time": step_data.get("training_time") if key == "teacher_training" else None,
            # Additional date fields for other steps
            "payment_date": step_data.get("payment_date") if key == "payment_collection" else None,
            "mou_date": step_data.get("mou_date") if key == "mou_signing" else None,
            # LMS data
            "data": step_data if key == "lms_setup" else None,
            # PO data for kit_delivery
            "po_info": kit_delivery_data if key == "kit_delivery" else None,
        })
    
    # Public timeline (last 10 entries)
    timeline = workflow.get("timeline", [])[-10:]
    public_timeline = [
        {"action": t.get("action"), "date": t.get("date")}
        for t in timeline
    ]
    
    # Get assigned team member details
    assigned_team_member = None
    assigned_to = school.get("assigned_to")
    if assigned_to:
        team_member = await db.users.find_one({"id": assigned_to}, {"_id": 0, "password": 0})
        if team_member:
            assigned_team_member = {
                "name": team_member.get("name"),
                "email": team_member.get("email"),
                "phone": team_member.get("phone"),
                "role": team_member.get("role", "Account Manager")
            }
    
    return {
        "school_id": school.get("id"),  # Include school_id for payment links
        "school_name": school.get("school_name"),
        "contact_name": school.get("contact_name"),
        "programs": school.get("programs_interested", []),
        "offerings": school.get("selected_offerings", school.get("programs_interested", [])),
        "started_at": workflow.get("started_at"),
        "completed_at": workflow.get("completed_at"),
        "current_step": workflow.get("current_step"),
        "progress_percent": progress_percent,
        "completed_steps": completed_steps,
        "total_steps": total_steps,
        "steps": public_steps,
        "timeline": public_timeline,
        # School contacts
        "school_contacts": onboarding_data.get("school_contacts", []),
        # Assigned OLL team member
        "assigned_team_member": assigned_team_member,
        # MOU URL
        "mou_url": onboarding_data.get("mou_url"),
        # Is this a renewal onboarding?
        "is_renewal": workflow.get("is_renewal", False),
        # Include onboarding details for display
        "onboarding_details": {
            "offering": onboarding_data.get("offering"),
            "total_amount": onboarding_data.get("total_amount"),
            "total_students": onboarding_data.get("total_students"),
            "contract_start": onboarding_data.get("contract_start"),
            "contract_end": onboarding_data.get("contract_end"),
            "model": onboarding_data.get("model"),
            "kit_type": onboarding_data.get("kit_type"),
            "book_type": onboarding_data.get("book_type"),
            "training_type": onboarding_data.get("training_type"),
            "mou_url": onboarding_data.get("mou_url"),
            "parent_circular_url": onboarding_data.get("parent_circular_url"),
            "payment_link": onboarding_data.get("payment_link"),
            "payment_mode": onboarding_data.get("payment_mode"),
            "payment_method": onboarding_data.get("payment_method"),
            "deadline_date": onboarding_data.get("deadline_date"),
        },
        # Include documents
        "documents": school.get("documents", []),
        # Include payment tranches and payment status
        "payment_tranches": onboarding_data.get("payment_tranches", []),
        "payments": [
            {
                "tranche_index": p.get("tranche_index"),
                "status": p.get("status"),
                "invoice_url": p.get("invoice_url"),
                "payment_date": p.get("payment_date"),
                "payment_link": p.get("payment_link")
            }
            for p in school.get("payments", [])
        ]
    }

# Support ticket from tracking page (no auth required)
@router.post("/track/{tracking_token}/support-ticket")
async def create_public_support_ticket(tracking_token: str, ticket_data: dict):
    """Public endpoint for schools to raise support tickets from tracking page"""
    school = await db.school_inquiries.find_one(
        {"onboarding_workflow.tracking_token": tracking_token},
        {"_id": 0}
    )
    
    if not school:
        raise HTTPException(status_code=404, detail="Tracking not found")
    
    ticket_id = f"TKT-{uuid.uuid4().hex[:8].upper()}"
    
    ticket = {
        "id": ticket_id,
        "school_id": school.get("id"),
        "school_name": school.get("school_name"),
        "contact_name": school.get("contact_name"),
        "contact_phone": school.get("phone"),
        "contact_email": school.get("email"),
        "tracking_token": tracking_token,
        "step": ticket_data.get("step", "general"),
        "query_type": ticket_data.get("query_type", "general"),
        "description": ticket_data.get("description", ""),
        "priority": ticket_data.get("priority", "medium"),
        "status": "open",
        "source": "tracking_page",
        "ticket_number": await get_next_ticket_number(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "responses": []
    }
    
    await db.support_tickets.insert_one(ticket)
    
    # Add to onboarding timeline
    workflow = school.get("onboarding_workflow", {})
    timeline = workflow.get("timeline", [])
    timeline.append({
        "action": f"Support Ticket Created: {ticket_data.get('query_type', 'General Query')}",
        "date": datetime.now(timezone.utc).isoformat(),
        "by": school.get("contact_name", "School")
    })
    
    await db.school_inquiries.update_one(
        {"id": school.get("id")},
        {"$set": {"onboarding_workflow.timeline": timeline}}
    )
    
    return {
        "success": True,
        "ticket_id": ticket_id,
        "message": "Support ticket created successfully. Our team will contact you soon."
    }

# Get tracking page tickets (for admin) - separate from general support tickets