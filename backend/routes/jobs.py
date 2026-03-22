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
                    # Build attachments from PO files
                    kit_attachments = []
                    if detailed_po.get("po_pdf_url"):
                        kit_attachments.append({
                            "name": f"PO-{po_number}.pdf",
                            "url": detailed_po.get("po_pdf_url"),
                            "type": "po_file"
                        })
                    if detailed_po.get("invoice_file_url"):
                        kit_attachments.append({
                            "name": f"Invoice-{po_number}",
                            "url": detailed_po.get("invoice_file_url"),
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
                        "po_pdf_url": detailed_po.get("po_pdf_url"),
                        "invoice_file_url": detailed_po.get("invoice_file_url"),
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
                    # Build attachments for logistics
                    logistics_attachments = []
                    if detailed_po.get("logistics_bill_url"):
                        logistics_attachments.append({
                            "name": f"Logistics-Bill-{po_number}",
                            "url": detailed_po.get("logistics_bill_url"),
                            "type": "logistics_bill"
                        })
                    if detailed_po.get("delivery_proof_url"):
                        logistics_attachments.append({
                            "name": f"Delivery-Proof-{po_number}",
                            "url": detailed_po.get("delivery_proof_url"),
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
                        "logistics_bill_url": detailed_po.get("logistics_bill_url"),
                        "delivery_proof_url": detailed_po.get("delivery_proof_url"),
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


# ========================
# SCHOOL EXPENSES MANAGEMENT
# ========================

EXPENSE_CATEGORIES = [
    {"id": "kit_cost", "name": "Kit Cost", "description": "Learning kits and materials"},
    {"id": "teacher_cost", "name": "Teacher Cost", "description": "Teacher salaries and fees"},
    {"id": "logistics_cost", "name": "Logistics Cost", "description": "Delivery and transportation"},
    {"id": "books_cost", "name": "Books Cost", "description": "Textbooks and workbooks"},
    {"id": "gp_share", "name": "GP Share", "description": "Growth Partner commission"},
    {"id": "school_share", "name": "School Share", "description": "School's revenue share"},
    {"id": "printing_certification", "name": "Printing / Certification Cost", "description": "Certificates and printed materials"},
    {"id": "renewal_commission_team", "name": "Renewal Commission (Team)", "description": "Team commission on renewals"},
    {"id": "renewal_commission_teachers", "name": "Renewal Commission (Teachers)", "description": "Teacher commission on renewals"},
    {"id": "marketing_cost", "name": "Marketing Cost", "description": "Marketing and promotion expenses"},
    {"id": "technology_cost", "name": "Technology Cost", "description": "Software and platform costs"},
    {"id": "other", "name": "Other Expenses", "description": "Miscellaneous expenses"},
]


