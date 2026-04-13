"""
Background Job & Maintenance routes.
Endpoints: /jobs/*
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import os

from .shared import db, get_current_user
from .expenses import fetch_po_data, transform_tracking_url
import asyncio
import httpx

# ── WhatsApp notification utilities (inline to avoid circular import) ───────
# WHATSAPP NOTIFICATION TEMPLATES (AiSensy)
# ========================

# Student Templates
WHATSAPP_TEMPLATES = {
    # Student templates
    "student_demo_confirmed_online": "Online Student Demo Confirmation",
    "student_demo_confirmed_offline": "Offline Student Demo Confirmation",
    "student_reminder_1hr": "Reminder 1 hour prior Student Demo Confirmation",
    "student_reminder_30min_offline": "Reminder 30 min before Offline class",
    "student_reminder_10min_online": "Reminder 10 min before Online class",
    "student_not_joined": "Class started still not joined",
    "student_session_complete": "Student Session completion",
    
    # Educator templates
    "educator_demo_confirmed_online": "Online Teacher Demo Confirmation",
    "educator_demo_confirmed_offline": "Offline Teacher Demo Confirmation",
    "educator_reminder_1hr": "Reminder 1 hour prior Teacher Demo Confirmation",
    "educator_reminder_30min_offline": "Reminder 30 min Teacher before Offline class",
    "educator_reminder_10min_online": "Reminder 10 min Teacher before Online class",
    "educator_not_joined": "Class started still not joined educator",
    "educator_session_complete": "Educator Session completion",
    
    # Support ticket templates
    "ticket_assigned": "support_ticket_added",
    "support_ticket_added": "support_ticket_added",
    "support_overdue_48hours": "support_overdue_48hours",
    "support_overdue_48hours_admin": "support_overdue_48hours_admin",
    
    # New lead notifications
    "student_newlead_admin": "student_newlead_admin",
    "gp_newlead_admin": "gp_newlead_admin",
    
    # School CRM meeting reminders
    "school_meeting_reminder_24hours": "school_meeting_reminder_24hours",
    "school_meeting_reminder_2hours": "school_meeting_reminder_2hours",
}

async def send_whatsapp_notification(
    phone: str,
    template_key: str,
    params: list = None,
    user_name: str = "User"
) -> dict:
    """
    Send WhatsApp notification via AiSensy
    
    Args:
        phone: Phone number (10 digits, will add 91 prefix)
        template_key: Key from WHATSAPP_TEMPLATES dict
        params: List of template parameters
        user_name: User's name for the message
    
    Returns:
        dict with success status and message
    """
    AISENSY_API_KEY = os.environ.get("AISENSY_API_KEY", "")
    
    if not AISENSY_API_KEY:
        print("WhatsApp notification skipped - API key not configured")
        return {"success": False, "message": "API key not configured"}
    
    campaign_name = WHATSAPP_TEMPLATES.get(template_key)
    if not campaign_name:
        print(f"Unknown template key: {template_key}")
        return {"success": False, "message": f"Unknown template: {template_key}"}
    
    try:
        # Format phone number
        phone_number = str(phone).replace("+", "").replace(" ", "")
        if not phone_number.startswith("91"):
            phone_number = f"91{phone_number}"
        
        payload = {
            "apiKey": AISENSY_API_KEY,
            "campaignName": campaign_name,
            "destination": phone_number,
            "userName": user_name or "Clone Futura Live Solutions Ltd",
            "templateParams": params or [],
            "source": "OLL Platform",
            "media": {},
            "buttons": [],
            "carouselCards": [],
            "location": {},
            "attributes": {},
            "paramsFallbackValue": {
                "FirstName": "user"
            }
        }
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://backend.aisensy.com/campaign/t1/api/v2",
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200:
                print(f"WhatsApp [{template_key}] sent to {phone_number}")
                return {"success": True, "message": "Notification sent"}
            else:
                print(f"AiSensy error [{template_key}]: {response.status_code} - {response.text}")
                return {"success": False, "message": f"API error: {response.status_code}"}
                
    except Exception as e:
        print(f"WhatsApp notification error [{template_key}]: {str(e)}")
        return {"success": False, "message": str(e)}


async def send_demo_confirmation_notifications(inquiry: dict, educator: dict = None):
    """Send demo confirmation to student and assigned educator"""
    student_name = inquiry.get("name", "Student")
    student_phone = inquiry.get("phone")
    skill = inquiry.get("skill", "Demo").title()
    demo_date = inquiry.get("demo_date", "TBD")
    demo_time = inquiry.get("demo_time", "TBD")
    learning_mode = inquiry.get("learning_mode", "online")
    location = inquiry.get("selected_center_name") or inquiry.get("city") or "Online"
    
    is_online = learning_mode == "online"
    
    # Send to student
    if student_phone:
        template = "student_demo_confirmed_online" if is_online else "student_demo_confirmed_offline"
        await send_whatsapp_notification(
            phone=student_phone,
            template_key=template,
            params=[student_name, skill, demo_date, demo_time, location],
            user_name=student_name
        )
    
    # Send to educator
    if educator and educator.get("phone"):
        educator_name = educator.get("name", "Educator")
        template = "educator_demo_confirmed_online" if is_online else "educator_demo_confirmed_offline"
        await send_whatsapp_notification(
            phone=educator.get("phone"),
            template_key=template,
            params=[educator_name, student_name, skill, demo_date, demo_time],
            user_name=educator_name
        )


async def send_not_joined_notification(inquiry: dict, notify_type: str = "student"):
    """Send 'class started but not joined' notification"""
    student_name = inquiry.get("name", "Student")
    student_phone = inquiry.get("phone")
    skill = inquiry.get("skill", "Demo").title()
    
    if notify_type == "student" and student_phone:
        await send_whatsapp_notification(
            phone=student_phone,
            template_key="student_not_joined",
            params=[student_name, skill],
            user_name=student_name
        )
    elif notify_type == "educator":
        educator_id = inquiry.get("assigned_educator_id")
        if educator_id:
            educator = await db.educator_applications.find_one({"id": educator_id}, {"_id": 0})
            if educator and educator.get("phone"):
                await send_whatsapp_notification(
                    phone=educator.get("phone"),
                    template_key="educator_not_joined",
                    params=[educator.get("name", "Educator"), student_name, skill],
                    user_name=educator.get("name", "Educator")
                )


async def send_session_complete_notification(inquiry: dict, educator: dict = None):
    """Send session completion notifications with feedback form"""
    student_name = inquiry.get("name", "Student")
    student_phone = inquiry.get("phone")
    skill = inquiry.get("skill", "Demo").title()
    frontend_url = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", "https://oll.co").replace("/api", ""))
    feedback_url = f"{frontend_url}/feedback/{inquiry.get('id', '')}"
    
    # Send to student
    if student_phone:
        await send_whatsapp_notification(
            phone=student_phone,
            template_key="student_session_complete",
            params=[student_name, skill, feedback_url],
            user_name=student_name
        )
    
    # Send to educator
    if educator and educator.get("phone"):
        educator_name = educator.get("name", "Educator")
        await send_whatsapp_notification(
            phone=educator.get("phone"),
            template_key="educator_session_complete",
            params=[educator_name, student_name, skill],
            user_name=educator_name
        )


# ========================
# SUPPORT TICKET NOTIFICATIONS
# ========================

async def send_support_ticket_notification(ticket: dict, assignee: dict):
    """Send notification when a support ticket is assigned to a team member"""
    if not assignee or not assignee.get("phone"):
        print("Support ticket notification skipped - no assignee phone")
        return
    
    assignee_name = assignee.get("name", "Team Member")
    ticket_id = ticket.get("id", "N/A")[:8]
    subject = ticket.get("subject", "Support Request")
    priority = ticket.get("priority", "medium").upper()
    school_name = ticket.get("school_name", ticket.get("contact_name", "Customer"))
    
    await send_whatsapp_notification(
        phone=assignee.get("phone"),
        template_key="support_ticket_added",
        params=[assignee_name, ticket_id, subject, priority, school_name],
        user_name=assignee_name
    )


async def send_ticket_overdue_notification(ticket: dict, assignee: dict):
    """Send 48-hour overdue warning to the assigned team member"""
    if not assignee or not assignee.get("phone"):
        print("Overdue notification skipped - no assignee phone")
        return
    
    assignee_name = assignee.get("name", "Team Member")
    ticket_id = ticket.get("id", "N/A")[:8].upper()
    subject = ticket.get("subject", ticket.get("query_type", "Support Request"))
    
    # Template expects 3 params: [Name, TicketID, Subject]
    await send_whatsapp_notification(
        phone=assignee.get("phone"),
        template_key="support_overdue_48hours",
        params=[assignee_name, ticket_id, subject],
        user_name=assignee_name
    )


async def send_ticket_overdue_admin_notification(ticket: dict, admin_phones: list):
    """Send 48-hour overdue warning to admin team - 4 params"""
    ticket_id = ticket.get("id", "N/A")[:8].upper()
    subject = ticket.get("subject", ticket.get("query_type", "Support Request"))
    customer_name = ticket.get("school_name", ticket.get("contact_name", ticket.get("name", "Customer")))
    assigned_to = ticket.get("assigned_to_name", "Unassigned")
    
    # Template expects 4 params: [TicketID, Subject, CustomerName, AssignedTo]
    for phone in admin_phones:
        if phone:
            await send_whatsapp_notification(
                phone=phone,
                template_key="support_overdue_48hours_admin",
                params=[ticket_id, subject, customer_name, assigned_to],
                user_name="Admin"
            )


# ========================
# NEW LEAD NOTIFICATIONS
# ========================

async def send_student_newlead_notification(inquiry: dict, sales_team_phones: list):
    """Send notification to B2C sales team when a new student lead is created - 7 params"""
    student_name = inquiry.get("name", "Student")
    phone = inquiry.get("phone", "N/A")
    skill = inquiry.get("skill", "Not specified")
    city = inquiry.get("city", "Not specified")
    source = inquiry.get("source", "website")
    learning_mode = inquiry.get("learning_mode", "online")
    created_at = inquiry.get("created_at", "")[:10] if inquiry.get("created_at") else "Today"
    
    # Template expects 7 params: [Name, Phone, Skill, City, Source, LearningMode, Date]
    for sales_phone in sales_team_phones:
        if sales_phone:
            await send_whatsapp_notification(
                phone=sales_phone,
                template_key="student_newlead_admin",
                params=[student_name, phone, skill, city, source, learning_mode, created_at],
                user_name="Sales Team"
            )


async def send_gp_newlead_notification(gp_data: dict, gp_manager_phones: list):
    """Send notification to GP manager when a new growth partner applies"""
    gp_name = gp_data.get("name", "Growth Partner")
    phone = gp_data.get("phone", "N/A")
    city = gp_data.get("city", "Not specified")
    partnership_type = gp_data.get("partnership_type", "Not specified")
    
    for manager_phone in gp_manager_phones:
        if manager_phone:
            await send_whatsapp_notification(
                phone=manager_phone,
                template_key="gp_newlead_admin",
                params=[gp_name, phone, city, partnership_type],
                user_name="GP Manager"
            )


# ========================
# SCHOOL CRM MEETING REMINDERS
# ========================

async def send_school_meeting_reminder_24h(school: dict, sales_manager: dict):
    """Send meeting reminder 24 hours prior to sales manager - 7 params"""
    if not sales_manager or not sales_manager.get("phone"):
        print("24h meeting reminder skipped - no sales manager phone")
        return
    
    manager_name = sales_manager.get("name", "Sales Manager")
    school_name = school.get("school_name", "School")
    contact_name = school.get("contact_name", "Contact")
    contact_phone = school.get("phone", "N/A")
    meeting_date = school.get("meeting_date", "TBD")
    meeting_time = school.get("meeting_time", "TBD")
    meeting_mode = school.get("meeting_mode", "online").title()
    
    # Template expects 7 params: [ManagerName, SchoolName, ContactName, ContactPhone, Date, Time, Mode]
    await send_whatsapp_notification(
        phone=sales_manager.get("phone"),
        template_key="school_meeting_reminder_24hours",
        params=[manager_name, school_name, contact_name, contact_phone, meeting_date, meeting_time, meeting_mode],
        user_name=manager_name
    )


async def send_school_meeting_reminder_2h(school: dict, sales_manager: dict):
    """Send meeting reminder 2 hours prior to sales manager - 6 params"""
    if not sales_manager or not sales_manager.get("phone"):
        print("2h meeting reminder skipped - no sales manager phone")
        return
    
    manager_name = sales_manager.get("name", "Sales Manager")
    school_name = school.get("school_name", "School")
    contact_name = school.get("contact_name", "Contact")
    contact_phone = school.get("phone", "N/A")
    meeting_time = school.get("meeting_time", "TBD")
    meeting_mode = school.get("meeting_mode", "online")
    
    # Include meeting link for online meetings, address for offline
    location_info = school.get("meeting_link", "") if meeting_mode == "online" else school.get("meeting_address", "As discussed")
    
    # Template expects 6 params: [ManagerName, SchoolName, ContactName, ContactPhone, Time, Location/Link]
    await send_whatsapp_notification(
        phone=sales_manager.get("phone"),
        template_key="school_meeting_reminder_2hours",
        params=[manager_name, school_name, contact_name, contact_phone, meeting_time, location_info],
        user_name=manager_name
    )



router = APIRouter()

@router.post("/jobs/check-overdue-tickets")
async def check_overdue_tickets_job(secret: str = None):
    """
    Background job to check for tickets overdue by 48 hours and send notifications.
    Should be called by a cron job every hour.
    """
    # Simple security - use a secret key for cron jobs
    JOB_SECRET = os.environ.get("JOB_SECRET", "oll_cron_secret_2024")
    if secret != JOB_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    # Find tickets that are open/in_progress and created more than 48 hours ago
    threshold = datetime.now(timezone.utc) - timedelta(hours=48)
    
    # Find tickets that need 48h warning and haven't been notified yet
    tickets = await db.support_tickets.find({
        "status": {"$in": ["open", "in_progress"]},
        "created_at": {"$lte": threshold.isoformat()},
        "overdue_notified_at": {"$exists": False}
    }, {"_id": 0}).to_list(100)
    
    notified_count = 0
    
    # Get admin team phones for admin notification
    admin_users = await db.users.find(
        {"role": "admin"},
        {"_id": 0, "phone": 1}
    ).to_list(10)
    admin_phones = [u.get("phone") for u in admin_users if u.get("phone")]
    
    # Also get phones from team_users with admin role
    team_admins = await db.team_users.find(
        {"role": {"$in": ["admin", "super_admin"]}},
        {"_id": 0, "phone": 1}
    ).to_list(10)
    admin_phones.extend([u.get("phone") for u in team_admins if u.get("phone")])
    admin_phones = list(set(admin_phones))  # Remove duplicates
    
    for ticket in tickets:
        try:
            # Get assigned team member - check both collections
            assignee = None
            if ticket.get("assigned_to"):
                assignee = await db.team_users.find_one({"id": ticket["assigned_to"]}, {"_id": 0})
                if not assignee:
                    assignee = await db.users.find_one({"id": ticket["assigned_to"]}, {"_id": 0})
            
            # Send notification to assignee
            if assignee and assignee.get('phone'):
                await send_ticket_overdue_notification(ticket, assignee)
                print(f"Overdue notification sent to {assignee.get('name')}")
            
            # Send notification to admin team
            if admin_phones:
                await send_ticket_overdue_admin_notification(ticket, admin_phones)
            
            # Mark as notified
            await db.support_tickets.update_one(
                {"id": ticket["id"]},
                {"$set": {"overdue_notified_at": datetime.now(timezone.utc).isoformat()}}
            )
            notified_count += 1
            
        except Exception as e:
            print(f"Failed to send overdue notification for ticket {ticket.get('id')}: {e}")
    
    return {
        "success": True,
        "checked": len(tickets),
        "notified": notified_count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.post("/jobs/send-meeting-reminders")
async def send_meeting_reminders_job(secret: str = None):
    """
    Background job to send school meeting reminders.
    Should be called by a cron job every hour.
    Sends 24h reminder and 2h reminder based on meeting time.
    """
    JOB_SECRET = os.environ.get("JOB_SECRET", "oll_cron_secret_2024")
    if secret != JOB_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    now = datetime.now(timezone.utc)
    reminders_sent = {"24h": 0, "2h": 0}
    
    # Find schools with upcoming meetings
    schools = await db.school_inquiries.find({
        "status": {"$in": ["new", "meeting_done", "converted", "active"]},
        "meeting_date": {"$exists": True, "$ne": None, "$ne": ""}
    }, {"_id": 0}).to_list(500)
    
    for school in schools:
        try:
            meeting_date_str = school.get("meeting_date")
            meeting_time_str = school.get("meeting_time", "10:00")
            
            if not meeting_date_str:
                continue
            
            # Parse meeting datetime
            try:
                meeting_datetime = datetime.strptime(
                    f"{meeting_date_str} {meeting_time_str}",
                    "%Y-%m-%d %H:%M"
                ).replace(tzinfo=timezone.utc)
            except:
                continue
            
            # Calculate time until meeting
            time_until = meeting_datetime - now
            hours_until = time_until.total_seconds() / 3600
            
            # Get assigned sales manager - check both collections
            sales_manager = None
            if school.get("assigned_to"):
                sales_manager = await db.team_users.find_one({"id": school["assigned_to"]}, {"_id": 0})
                if not sales_manager:
                    sales_manager = await db.users.find_one({"id": school["assigned_to"]}, {"_id": 0})
            
            if not sales_manager or not sales_manager.get('phone'):
                print(f"Meeting reminder skipped for school {school.get('school_name')} - no sales manager phone")
                continue
            
            # Check if 24h reminder should be sent (between 23-25 hours before)
            if 23 <= hours_until <= 25 and not school.get("reminder_24h_sent"):
                await send_school_meeting_reminder_24h(school, sales_manager)
                await db.school_inquiries.update_one(
                    {"id": school["id"]},
                    {"$set": {"reminder_24h_sent": datetime.now(timezone.utc).isoformat()}}
                )
                reminders_sent["24h"] += 1
            
            # Check if 2h reminder should be sent (between 1.5-2.5 hours before)
            elif 1.5 <= hours_until <= 2.5 and not school.get("reminder_2h_sent"):
                await send_school_meeting_reminder_2h(school, sales_manager)
                await db.school_inquiries.update_one(
                    {"id": school["id"]},
                    {"$set": {"reminder_2h_sent": datetime.now(timezone.utc).isoformat()}}
                )
                reminders_sent["2h"] += 1
                
        except Exception as e:
            print(f"Failed to check meeting reminder for school {school.get('id')}: {e}")
    
    return {
        "success": True,
        "schools_checked": len(schools),
        "reminders_sent": reminders_sent,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.post("/jobs/test-notification")
async def test_notification_job(data: dict, user: dict = Depends(get_current_user)):
    """
    Test endpoint to send a notification to a specific user.
    For debugging notification issues.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    user_id = data.get("user_id")
    notification_type = data.get("type", "ticket")  # ticket, meeting_24h, meeting_2h
    
    # Get user from both collections
    target_user = await db.team_users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not target_user:
        return {"error": "User not found", "user_id": user_id}
    
    if not target_user.get("phone"):
        return {"error": "User has no phone number", "user": target_user.get("name")}
    
    try:
        if notification_type == "ticket":
            test_ticket = {
                "id": "test-ticket-123",
                "subject": "Test Ticket Notification",
                "priority": "high",
                "school_name": "Test School",
                "contact_name": "Test Contact"
            }
            await send_support_ticket_notification(test_ticket, target_user)
        elif notification_type == "meeting_24h":
            test_school = {
                "school_name": "Test School",
                "contact_name": "Test Contact",
                "meeting_date": "2024-01-01",
                "meeting_time": "10:00",
                "meeting_mode": "online"
            }
            await send_school_meeting_reminder_24h(test_school, target_user)
        elif notification_type == "meeting_2h":
            test_school = {
                "school_name": "Test School",
                "contact_name": "Test Contact",
                "meeting_time": "10:00",
                "meeting_mode": "online",
                "meeting_link": "https://meet.jit.si/test"
            }
            await send_school_meeting_reminder_2h(test_school, target_user)
        
        return {
            "success": True,
            "message": f"Test {notification_type} notification sent to {target_user.get('name')} at {target_user.get('phone')}"
        }
    except Exception as e:
        return {"error": str(e), "user": target_user.get("name")}


@router.get("/jobs/check-user-phones")
async def check_user_phones(user: dict = Depends(get_current_user)):
    """
    Check which users have phone numbers configured for notifications.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Get all team users
    team_users = await db.team_users.find({}, {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "role": 1}).to_list(100)
    users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "role": 1}).to_list(100)
    
    with_phone = []
    without_phone = []
    
    for u in team_users + users:
        user_info = {
            "id": u.get("id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "phone": u.get("phone"),
            "role": u.get("role")
        }
        if u.get("phone"):
            with_phone.append(user_info)
        else:
            without_phone.append(user_info)
    
    return {
        "total_users": len(team_users) + len(users),
        "with_phone": len(with_phone),
        "without_phone": len(without_phone),
        "users_with_phone": with_phone,
        "users_without_phone": without_phone
    }




@router.post("/jobs/sync-po-data")
async def sync_po_data_job(secret: str = None):
    """
    Background job to sync PO data from ProcureWay for all active/converted schools.
    Should be called by a cron job every 30 minutes or hourly.
    
    This job:
    1. Fetches active POs from ProcureWay for schools in onboarding
    2. Updates kit_delivery step with delivery/dispatch dates and tracking links
    3. Auto-creates expense records from PO invoice data
    """
    JOB_SECRET = os.environ.get("JOB_SECRET", "oll_cron_secret_2024")
    if secret != JOB_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    # Find schools in onboarding stages (converted, active, renewed, renewal_meeting)
    schools = await db.school_inquiries.find({
        "status": {"$in": ["converted", "active", "renewed", "renewal_meeting"]},
        "onboarding_workflow": {"$exists": True}
    }, {"_id": 0, "id": 1, "school_name": 1, "onboarding_workflow": 1}).to_list(500)
    
    results = {
        "schools_processed": 0,
        "po_data_synced": 0,
        "expenses_created": 0,
        "errors": []
    }
    
    for school in schools:
        try:
            school_id = school.get("id")
            school_name = school.get("school_name", "")
            
            if not school_name:
                continue
            
            # Fetch PO data from ProcureWay
            po_list_data = await fetch_po_data("po", {"school_name": school_name, "limit": 50})
            
            if not po_list_data or "data" not in po_list_data:
                continue
            
            # Filter for active POs (not delivered) - for tracking updates
            active_pos = [
                po for po in po_list_data.get("data", [])
                if po.get("status", "").lower() != "delivered"
            ]
            
            # Filter for delivered POs - for expense creation
            delivered_pos = [
                po for po in po_list_data.get("data", [])
                if po.get("status", "").lower() == "delivered"
            ]
            
            # Update tracking info from active POs
            if active_pos:
                po_number = active_pos[0].get("po_number")
                if po_number:
                    detailed_po = await fetch_po_data(f"po/{po_number}")
                    if detailed_po:
                        dispatch_info = detailed_po.get("dispatch_info") or {}
                        
                        # Check if kit_delivery step needs updating
                        workflow = school.get("onboarding_workflow", {})
                        kit_step = workflow.get("steps", {}).get("kit_delivery", {})
                        kit_data = kit_step.get("data", {})
                        
                        # Only update if PO number is different or not set
                        if kit_data.get("po_number") != po_number:
                            update_data = {
                                "onboarding_workflow.steps.kit_delivery.data.po_number": po_number,
                                "onboarding_workflow.steps.kit_delivery.data.po_status": detailed_po.get("status"),
                                "onboarding_workflow.steps.kit_delivery.data.vendor_name": detailed_po.get("vendor_name"),
                            }
                            
                            if not kit_data.get("delivery_date") and detailed_po.get("delivery_date"):
                                update_data["onboarding_workflow.steps.kit_delivery.data.delivery_date"] = detailed_po.get("delivery_date")
                            
                            if not kit_data.get("dispatch_date") and dispatch_info.get("dispatch_date"):
                                update_data["onboarding_workflow.steps.kit_delivery.data.dispatch_date"] = dispatch_info.get("dispatch_date")
                            
                            if not kit_data.get("tracking_link"):
                                tracking = transform_tracking_url(detailed_po.get("tracking_link") or detailed_po.get("public_tracking_url"))
                                if tracking:
                                    update_data["onboarding_workflow.steps.kit_delivery.data.tracking_link"] = tracking
                            
                            await db.school_inquiries.update_one(
                                {"id": school_id},
                                {"$set": update_data}
                            )
                            results["po_data_synced"] += 1
            
            # Create expenses ONLY from delivered POs
            for delivered_po_summary in delivered_pos:
                po_number = delivered_po_summary.get("po_number")
                if not po_number:
                    continue
                
                # IMPORTANT: Verify this PO actually belongs to this school by checking school_name match
                po_school_name = delivered_po_summary.get("school_name", "")
                if po_school_name and po_school_name.lower().strip() != school_name.lower().strip():
                    # PO belongs to a different school, skip it
                    continue
                    
                detailed_po = await fetch_po_data(f"po/{po_number}")
                if not detailed_po:
                    continue
                
                # Double-check school name from detailed PO
                detailed_school_name = detailed_po.get("school_name", "")
                if detailed_school_name and detailed_school_name.lower().strip() != school_name.lower().strip():
                    continue
                
                # Auto-create expenses from delivered PO data
                invoice_info = detailed_po.get("invoice_info") or {}
                invoice_amount = invoice_info.get("amount", 0) or detailed_po.get("subtotal", 0) or detailed_po.get("grand_total", 0)
                logistics_cost = invoice_info.get("logistics_cost", 0)
                
                # Get GST/Tax info
                total_tax = detailed_po.get("total_tax", 0)
                subtotal = detailed_po.get("subtotal", 0)
                grand_total = detailed_po.get("grand_total", 0)
                gst_rate = 18 if total_tax > 0 and subtotal > 0 else 0
                if total_tax > 0 and subtotal > 0:
                    gst_rate = round((total_tax / subtotal) * 100, 2)
                gst_type = "IGST" if total_tax > 0 else "None"
                
                # Check if kit expense already exists
                existing_kit = await db.school_expenses.find_one({
                    "school_id": school_id,
                    "po_number": po_number,
                    "category": "kit_cost"
                })
                
                if not existing_kit and invoice_amount > 0:
                    # Build attachments from PO files — normalize any old preview URLs
                    po_pdf_url     = transform_tracking_url(detailed_po.get("po_pdf_url") or "")
                    invoice_url    = transform_tracking_url(detailed_po.get("invoice_file_url") or "")
                    kit_attachments = []
                    if po_pdf_url:
                        kit_attachments.append({
                            "name": f"PO-{po_number}.pdf",
                            "url": po_pdf_url,
                            "type": "po_file"
                        })
                    if invoice_url:
                        kit_attachments.append({
                            "name": f"Invoice-{po_number}",
                            "url": invoice_url,
                            "type": "invoice"
                        })
                    
                    kit_expense = {
                        "id": str(uuid.uuid4()),
                        "school_id": school_id,
                        "school_name": school_name,
                        "category": "kit_cost",
                        "category_name": "Kit Cost",
                        "amount": float(invoice_amount),
                        "subtotal": float(subtotal),
                        "gst_amount": float(total_tax),
                        "gst_rate": gst_rate,
                        "gst_type": gst_type,
                        "grand_total": float(grand_total),
                        "description": f"Kit cost from PO {po_number} (auto-synced)",
                        "expense_date": detailed_po.get("created_at", datetime.now(timezone.utc).isoformat())[:10],
                        "invoice_number": po_number,
                        "vendor_name": detailed_po.get("vendor_name", ""),
                        "payment_status": invoice_info.get("payment_status", "pending"),
                        "po_number": po_number,
                        "po_pdf_url": po_pdf_url or None,
                        "invoice_file_url": invoice_url or None,
                        "attachments": kit_attachments,
                        "created_by": "system",
                        "created_by_name": "Auto-Sync Job",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "auto_synced": True
                    }
                    await db.school_expenses.insert_one(kit_expense)
                    results["expenses_created"] += 1
                
                # Check if logistics expense already exists
                existing_logistics = await db.school_expenses.find_one({
                    "school_id": school_id,
                    "po_number": po_number,
                    "category": "logistics_cost"
                })
                
                if not existing_logistics and logistics_cost > 0:
                    # Build attachments for logistics — normalize any old preview URLs
                    logistics_bill_url  = transform_tracking_url(detailed_po.get("logistics_bill_url") or "")
                    delivery_proof_url  = transform_tracking_url(detailed_po.get("delivery_proof_url") or "")
                    logistics_attachments = []
                    if logistics_bill_url:
                        logistics_attachments.append({
                            "name": f"Logistics-Bill-{po_number}",
                            "url": logistics_bill_url,
                            "type": "logistics_bill"
                        })
                    if delivery_proof_url:
                        logistics_attachments.append({
                            "name": f"Delivery-Proof-{po_number}",
                            "url": delivery_proof_url,
                            "type": "delivery_proof"
                        })
                    
                    logistics_expense = {
                        "id": str(uuid.uuid4()),
                        "school_id": school_id,
                        "school_name": school_name,
                        "category": "logistics_cost",
                        "category_name": "Logistics Cost",
                        "amount": float(logistics_cost),
                        "description": f"Logistics from PO {po_number} (auto-synced)",
                        "expense_date": detailed_po.get("created_at", datetime.now(timezone.utc).isoformat())[:10],
                        "invoice_number": f"{po_number}-LOGISTICS",
                        "vendor_name": detailed_po.get("vendor_name", ""),
                        "payment_status": "pending",
                        "po_number": po_number,
                        "logistics_bill_url": logistics_bill_url or None,
                        "delivery_proof_url": delivery_proof_url or None,
                        "attachments": logistics_attachments,
                        "created_by": "system",
                        "created_by_name": "Auto-Sync Job",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "auto_synced": True
                    }
                    await db.school_expenses.insert_one(logistics_expense)
                    results["expenses_created"] += 1
            
            results["schools_processed"] += 1
            
        except Exception as e:
            results["errors"].append({"school_id": school.get("id"), "error": str(e)})
    
    return {
        "success": True,
        "results": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }





