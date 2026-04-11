"""
Support Queries, Support Tickets, Batches, and Sessions routes.
"""
import uuid
import asyncio
import resend
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field, ConfigDict, EmailStr

from .shared import db, get_current_user, ensure_resend_api_key, SENDER_EMAIL
from .notifications import send_whatsapp_notification, send_ticket_overdue_notification, send_ticket_overdue_admin_notification

router = APIRouter()

# ── Ticket Number Counter ───────────────────────────────────────────────────────
async def get_next_ticket_number() -> str:
    """Atomically increment and return next ticket number as zero-padded string."""
    result = await db.counters.find_one_and_update(
        {"key": "ticket_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,  # return AFTER update
    )
    num = result["seq"]
    return str(num).zfill(4)  # 0001, 0002, ... 9999, 10000, ...

# ── Models ─────────────────────────────────────────────────────────────────────
# (Models are defined inline in the route functions or pulled from server-level schema)

@router.get("/support/notification-settings")
async def get_notification_settings(user: dict = Depends(get_current_user)):
    """Get admin notification phone numbers for WhatsApp alerts"""
    doc = await db.settings.find_one({"key": "admin_notification_phones"}, {"_id": 0})
    phones = doc.get("value", []) if doc else []
    return {"phones": phones}


@router.post("/support/notification-settings")
async def save_notification_settings(data: dict, user: dict = Depends(get_current_user)):
    """Save admin notification phone numbers for WhatsApp alerts"""
    phones = data.get("phones", [])
    # Clean phone numbers
    cleaned = [str(p).strip() for p in phones if str(p).strip() and str(p).strip() not in ['', 'None']]
    await db.settings.update_one(
        {"key": "admin_notification_phones"},
        {"$set": {"key": "admin_notification_phones", "value": cleaned, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Notification settings saved", "phones": cleaned}


@router.post("/support/reset-overdue-flags")
async def reset_overdue_flags(user: dict = Depends(get_current_user)):
    """Reset overdue_notified for all open tickets so they get re-sent on next scheduler run"""
    result = await db.support_queries.update_many(
        {"status": {"$nin": ["resolved", "closed"]}, "overdue_notified": True},
        {"$set": {"overdue_notified": False}}
    )
    return {"message": f"Reset {result.modified_count} tickets", "count": result.modified_count}


@router.post("/support/backfill-ticket-numbers")
async def backfill_ticket_numbers(user: dict = Depends(get_current_user)):
    """One-time migration: assign sequential ticket_number to all tickets missing one."""
    tickets = await db.support_queries.find(
        {"ticket_number": {"$in": [None, "", 0]}},
        {"_id": 0, "id": 1, "created_at": 1}
    ).sort("created_at", 1).to_list(10000)

    updated = 0
    for ticket in tickets:
        num = await get_next_ticket_number()
        await db.support_queries.update_one(
            {"id": ticket["id"]},
            {"$set": {"ticket_number": num}}
        )
        updated += 1

    # Find the current max seq
    counter = await db.counters.find_one({"key": "ticket_number"}, {"_id": 0})
    return {"message": f"Backfilled {updated} tickets", "next_ticket_number": str((counter or {}).get("seq", 0) + 1).zfill(4)}



async def create_school_support_query(data: dict):
    query = SchoolSupportQuery(**data)
    doc = query.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.school_support_queries.insert_one(doc)
    return {"message": "Query submitted successfully", "id": query.id}

# General Support Query (demo, ongoing classes, school, other)
@router.post("/support/query")
async def create_support_query(data: dict):
    data['id'] = str(uuid.uuid4())
    data['ticket_number'] = await get_next_ticket_number()
    data['status'] = 'open'
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.support_queries.insert_one(data)
    return {"message": "Query submitted successfully", "id": data['id'], "ticket_number": data['ticket_number']}

@router.get("/support/queries")
async def get_support_queries(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    my_tickets: bool = False,
    user: dict = Depends(get_current_user)
):
    """Get support queries - filters by assigned_to OR viewers for non-admin users"""
    query = {}
    if status:
        query["status"] = status
    
    # If my_tickets is true or user is not admin, filter by assigned_to OR viewers
    user_role = user.get("role", "")
    user_id = user.get("id") or user.get("email")
    
    if my_tickets or (user_role not in ["admin", "super_admin"]):
        # For center users, team users, etc. - show tickets assigned to them OR where they are viewers OR created by them
        query["$or"] = [
            {"assigned_to": user_id},
            {"viewers": user_id},
            {"created_by": user_id},
            {"created_by": user.get("email")}
        ]
    elif assigned_to:
        query["assigned_to"] = assigned_to
        
    queries = await db.support_queries.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return queries

@router.patch("/support/queries/{query_id}")
async def update_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a support query status"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user.get("email", "admin")
    
    # Track status change in activity history
    if "status" in data:
        activity = {
            "type": "status_change",
            "new_status": data["status"],
            "by": user.get("name", user.get("email", "admin")),
            "date": datetime.now(timezone.utc).isoformat()
        }
        await db.support_queries.update_one(
            {"id": query_id},
            {"$set": update_data, "$push": {"activity_history": activity}}
        )
    else:
        await db.support_queries.update_one({"id": query_id}, {"$set": update_data})
    
    return {"message": "Query updated successfully"}

@router.post("/support/queries/{query_id}/assign")
async def assign_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Assign a support query to a user with optional deadline and send notifications"""
    assigned_to = data.get("assigned_to")
    deadline = data.get("deadline")  # ISO format datetime string
    
    # Get the query
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Handle unassign case
    if not assigned_to or assigned_to == "":
        await db.support_queries.update_one(
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
    
    # Update the query with assignment and activity history
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
    
    await db.support_queries.update_one(
        {"id": query_id}, 
        {"$set": update_data, "$push": {"activity_history": activity}}
    )
    
    # Send notifications to the assignee
    if assignee:
        assignee_phone = assignee.get("phone", "")
        assignee_email = assignee.get("email", "")
        
        query_type = query.get("query_type", query.get("type", "Support Request"))
        query_details = query.get("message", query.get("query", ""))[:100]
        deadline_str = deadline if deadline else "As soon as possible"
        
        print(f"[ASSIGN] Attempting to notify {assignee_name} (phone: {assignee_phone}, email: {assignee_email})")
        
        # Send WhatsApp notification
        # The support_ticket_added template expects: [Name, TicketID, Subject, Priority, CustomerName]
        if assignee_phone and assignee_phone not in ['None', '', 'null']:
            try:
                ticket_id = query_id[:8].upper()
                subject = query.get("query_type", "Support Request")
                priority = query.get("priority", "normal").upper()
                customer_name = query.get("name", "Customer")
                
                print(f"[ASSIGN] Sending WhatsApp to {assignee_phone} with params: [{assignee_name}, {ticket_id}, {subject}, {priority}, {customer_name}]")
                
                result = await send_whatsapp_notification(
                    assignee_phone,
                    "ticket_assigned",
                    params=[assignee_name, ticket_id, subject, priority, customer_name],
                    user_name="Clone Futura Live Solutions Ltd"
                )
                print(f"[ASSIGN] WhatsApp result: {result}")
            except Exception as e:
                print(f"[ASSIGN] Failed to send WhatsApp: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"[ASSIGN] Skipping WhatsApp - no phone for {assignee_name} (phone={assignee_phone})")
            # Fallback: notify admin phones that an assignment was made (so someone with a phone is aware)
            try:
                admin_phones_doc = await db.settings.find_one({"key": "admin_notification_phones"})
                admin_phones = admin_phones_doc.get("value", []) if admin_phones_doc else []
                if not admin_phones:
                    fallback_users = await db.team_users.find(
                        {"is_active": True, "phone": {"$nin": [None, "", "None", "null"]}},
                        {"_id": 0, "phone": 1}
                    ).to_list(10)
                    admin_phones = [u["phone"] for u in fallback_users if u.get("phone") and str(u["phone"]).strip() not in ['', 'None']]
                ticket_id_short = query_id[:8].upper()
                subject = query.get("query_type", "Support Request")
                priority = query.get("priority", "normal").upper()
                customer_name = query.get("name", "Customer")
                for phone in admin_phones:
                    await send_whatsapp_notification(
                        phone, "ticket_assigned",
                        params=[assignee_name, ticket_id_short, subject, priority, customer_name],
                        user_name="Clone Futura Live Solutions Ltd"
                    )
            except Exception as e:
                print(f"[ASSIGN] Admin fallback notification failed: {e}")
        
        # Send Email notification using resend
        resend_ready = await ensure_resend_api_key()
        if assignee_email and resend_ready:
            try:
                email_params = {
                    "from": SENDER_EMAIL,
                    "to": [assignee_email],
                    "subject": f"New Support Ticket Assigned - {query_type}",
                    "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1E3A5F;">New Support Ticket Assigned</h2>
                        <p>Hi {assignee_name},</p>
                        <p>A new support ticket has been assigned to you:</p>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Type:</strong> {query_type}</p>
                            <p><strong>Details:</strong> {query_details}...</p>
                            <p><strong>Customer:</strong> {query.get("name", "Customer")} ({query.get("phone", "N/A")})</p>
                            <p><strong>Deadline:</strong> {deadline_str}</p>
                        </div>
                        <p>Please resolve this ticket before the deadline.</p>
                        <p>Best regards,<br>OLL Team</p>
                    </div>
                    """
                }
                await asyncio.to_thread(resend.Emails.send, email_params)
            except Exception as e:
                print(f"Failed to send email: {e}")
    
    return {"message": "Query assigned successfully", "assigned_to": assigned_to}

@router.post("/support/queries/{query_id}/notes")
async def add_query_note(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a note to a support query"""
    note = {
        "id": str(uuid.uuid4()),
        "text": data.get("text", ""),
        "by": user.get("name", user.get("email", "admin")),
        "by_id": user.get("id", user.get("email")),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add note and activity history entry
    activity = {
        "type": "note_added",
        "note_id": note["id"],
        "note_preview": note["text"][:100] if note["text"] else "",
        "by": note["by"],
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_queries.update_one(
        {"id": query_id},
        {
            "$push": {"notes": note, "activity_history": activity},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat(), "latest_note": note["text"]}
        }
    )
    return {"message": "Note added successfully", "note": note}

@router.delete("/support/queries/{query_id}/notes/{note_id}")
async def delete_query_note(query_id: str, note_id: str, user: dict = Depends(get_current_user)):
    """Delete a note from a support query"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Add activity history entry
    activity = {
        "type": "note_deleted",
        "note_id": note_id,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_queries.update_one(
        {"id": query_id},
        {
            "$pull": {"notes": {"id": note_id}},
            "$push": {"activity_history": activity},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    return {"message": "Note deleted successfully"}

@router.get("/support/queries/{query_id}")
async def get_query_by_id(query_id: str, user: dict = Depends(get_current_user)):
    """Get a single support query with all its data including replies"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    return query


@router.post("/support/queries/{query_id}/replies")
async def add_query_reply(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a reply to a support query (chat-style)"""
    reply = {
        "id": str(uuid.uuid4()),
        "text": data.get("text", ""),
        "by": user.get("name", user.get("email", "admin")),
        "by_id": user.get("id", user.get("email")),
        "role": user.get("role", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "attachment": data.get("attachment")  # {url, filename, original_name, type}
    }
    
    # Add reply and activity history entry
    activity = {
        "type": "reply_added",
        "reply_id": reply["id"],
        "reply_preview": reply["text"][:100] if reply["text"] else "",
        "by": reply["by"],
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    # Update query - also set status to in_progress if currently new
    update = {
        "$push": {"replies": reply, "activity_history": activity},
        "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
    }
    
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if query and query.get("status") == "new":
        update["$set"]["status"] = "in_progress"
    
    await db.support_queries.update_one({"id": query_id}, update)
    
    # Send email notifications to assignee and viewers (fire-and-forget)
    if query:
        try:
            task = asyncio.create_task(_send_reply_notifications(query, reply, user))
            task.add_done_callback(lambda t: print(f"[REPLY_NOTIFY] Task done: {t.exception() if t.exception() else 'OK'}") if t.done() else None)
        except Exception as e:
            print(f"[REPLY_NOTIFY] Failed to create notification task: {e}")
    
    return {"message": "Reply added successfully", "reply": reply}


async def _send_reply_notifications(query: dict, reply: dict, replier: dict):
    """Send email notifications to assignee and viewers about a new reply"""
    try:
        await ensure_resend_api_key()
        if not resend.api_key:
            print("[REPLY_NOTIFY] Resend API key not configured, skipping email")
            return
        
        # Collect recipient emails (exclude the person who wrote the reply)
        replier_id = replier.get("id", replier.get("email"))
        recipients = []
        
        # Re-fetch query to get latest assigned_to (may have been updated just before reply)
        fresh_query = await db.support_queries.find_one({"id": query.get("id")}, {"_id": 0})
        if fresh_query:
            query = fresh_query
        
        # 1. Get assignee email
        assigned_to = query.get("assigned_to")
        if assigned_to and assigned_to != replier_id:
            assignee = await db.team_users.find_one({"id": assigned_to}, {"_id": 0})
            if not assignee:
                assignee = await db.admins.find_one({"id": assigned_to}, {"_id": 0})
            if assignee and assignee.get("email"):
                recipients.append({"email": assignee["email"], "name": assignee.get("name", "Team Member"), "role": "Assignee"})
        
        # 2. Get viewer emails
        viewer_ids = query.get("viewers", [])
        for vid in viewer_ids:
            if vid == replier_id:
                continue
            # Skip if already added as assignee
            if vid == assigned_to:
                continue
            viewer = await db.team_users.find_one({"id": vid}, {"_id": 0})
            if not viewer:
                viewer = await db.admins.find_one({"id": vid}, {"_id": 0})
            if viewer and viewer.get("email"):
                recipients.append({"email": viewer["email"], "name": viewer.get("name", "Team Member"), "role": "Viewer"})
        
        if not recipients:
            print(f"[REPLY_NOTIFY] No recipients for query {query.get('id', '')[:8]}")
            return
        
        # Build email
        query_type = query.get("query_type", "Support Request").replace("_", " ").title()
        customer_name = query.get("name", "Customer")
        ticket_id = query.get("id", "")[:8].upper()
        reply_text = reply.get("text", "No text")
        reply_by = reply.get("by", "Team")
        reply_time = reply.get("created_at", "")[:16].replace("T", " ")
        subject_line = query.get("subject", query_type)
        attachment_info = ""
        if reply.get("attachment"):
            att = reply["attachment"]
            attachment_info = f"""
            <div style="background: #e8f4fd; padding: 10px; border-radius: 6px; margin-top: 10px;">
                <p style="margin: 0; font-size: 13px; color: #1E3A5F;">
                    <strong>Attachment:</strong> {att.get('original_name', att.get('filename', 'File'))}
                </p>
            </div>
            """
        
        to_emails = [r["email"] for r in recipients]
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2d5a87 100%); padding: 20px 30px; border-radius: 10px 10px 0 0;">
                <h2 style="color: white; margin: 0; font-size: 20px;">New Reply on Ticket #{ticket_id}</h2>
                <p style="color: #b0c4de; margin: 5px 0 0; font-size: 13px;">{subject_line}</p>
            </div>
            <div style="background: #ffffff; padding: 25px 30px; border: 1px solid #e5e7eb; border-top: none;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #1E3A5F; margin-bottom: 20px;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                        <strong style="color: #1E3A5F;">{reply_by}</strong> replied on {reply_time}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">{reply_text}</p>
                    {attachment_info}
                </div>
                <div style="background: #f0f0f0; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">
                        <strong>Customer:</strong> {customer_name} &nbsp;|&nbsp;
                        <strong>Type:</strong> {query_type} &nbsp;|&nbsp;
                        <strong>Priority:</strong> {query.get('priority', 'normal').upper()}
                    </p>
                </div>
                <p style="margin: 0; font-size: 13px; color: #6b7280;">
                    Log in to the <a href="https://oll.co/admin/support" style="color: #1E3A5F; text-decoration: underline;">Support Center</a> to view the full conversation and respond.
                </p>
            </div>
            <div style="background: #f8f9fa; padding: 15px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center;">OLL Team &mdash; Support Notification</p>
            </div>
        </div>
        """
        
        email_params = {
            "from": SENDER_EMAIL,
            "to": to_emails,
            "subject": f"New Reply: Ticket #{ticket_id} - {subject_line}",
            "html": html_content,
            "reply_to": "info@oll.co"
        }
        
        result = await asyncio.to_thread(resend.Emails.send, email_params)
        print(f"[REPLY_NOTIFY] Email sent to {to_emails} for query {ticket_id}: {result}")
        
    except Exception as e:
        print(f"[REPLY_NOTIFY] Failed to send notification: {e}")

@router.get("/support/queries/{query_id}/history")
async def get_query_history(query_id: str, user: dict = Depends(get_current_user)):
    """Get activity history for a support query"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    history = []
    
    # Add creation event
    history.append({
        "type": "created",
        "description": f"Query created by {query.get('created_by', 'User')}",
        "date": query.get("created_at", ""),
        "by": query.get("created_by", "User")
    })
    
    # Add activity history from database
    activity_history = query.get("activity_history", [])
    for activity in activity_history:
        if activity.get("type") == "status_change":
            history.append({
                "type": "status_change",
                "description": f"Status changed to {activity.get('new_status', 'unknown')}",
                "date": activity.get("date", ""),
                "by": activity.get("by", "Admin")
            })
        elif activity.get("type") == "note_added":
            history.append({
                "type": "note_added",
                "description": f"Note added: {activity.get('note_preview', '')}...",
                "date": activity.get("date", ""),
                "by": activity.get("by", "Admin")
            })
        elif activity.get("type") == "assigned":
            history.append({
                "type": "assigned",
                "description": f"Assigned to {activity.get('assigned_to_name', activity.get('assigned_to', 'unknown'))}",
                "date": activity.get("date", ""),
                "by": activity.get("by", "Admin")
            })
    
    # Add notes as history items (in case they're not in activity_history)
    notes = query.get("notes", [])
    for note in notes:
        # Check if not already in history
        note_exists = any(h.get("type") == "note_added" and h.get("date") == note.get("created_at") for h in history)
        if not note_exists:
            history.append({
                "type": "note_added",
                "description": f"Note: {note.get('text', '')[:100]}...",
                "date": note.get("created_at", ""),
                "by": note.get("by", "Unknown")
            })
    
    # Sort by date descending
    history.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return {"query_id": query_id, "history": history, "notes": notes}

@router.put("/support/queries/{query_id}")
async def edit_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Edit/update a support query"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Track what changed
    changes = []
    update_data = {}
    
    editable_fields = ["name", "phone", "email", "query_type", "inquiry_type", "message", "priority", "source"]
    for field in editable_fields:
        if field in data and data[field] != query.get(field):
            changes.append(f"{field}: '{query.get(field, '')}' -> '{data[field]}'")
            update_data[field] = data[field]
    
    if not update_data:
        return {"message": "No changes detected"}
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user.get("email", "admin")
    
    # Add activity history
    activity = {
        "type": "edited",
        "changes": changes,
        "by": user.get("name", user.get("email", "admin")),
        "date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_queries.update_one(
        {"id": query_id},
        {"$set": update_data, "$push": {"activity_history": activity}}
    )
    
    return {"message": "Query updated successfully", "changes": changes}

@router.delete("/support/queries/{query_id}")
async def delete_support_query(query_id: str, user: dict = Depends(get_current_user)):
    """Delete a support query"""
    # Only admin can delete
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete queries")
    
    result = await db.support_queries.delete_one({"id": query_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return {"message": "Query deleted successfully"}

@router.post("/support/queries/{query_id}/viewers")
async def manage_query_viewers(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add or remove viewers from a support query"""
    action = data.get("action", "add")  # "add" or "remove"
    viewer_id = data.get("viewer_id")
    
    if not viewer_id:
        raise HTTPException(status_code=400, detail="viewer_id is required")
    
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Get viewer name for activity log
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
        await db.support_queries.update_one(
            {"id": query_id},
            {
                "$addToSet": {"viewers": viewer_id},
                "$push": {"activity_history": activity},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return {"message": f"Viewer {viewer_name} added successfully"}
    else:
        await db.support_queries.update_one(
            {"id": query_id},
            {
                "$pull": {"viewers": viewer_id},
                "$push": {"activity_history": activity},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return {"message": f"Viewer {viewer_name} removed successfully"}

@router.get("/support/queries/{query_id}/viewers")
async def get_query_viewers(query_id: str, user: dict = Depends(get_current_user)):
    """Get list of viewers for a support query with their details"""
    query = await db.support_queries.find_one({"id": query_id}, {"_id": 0})
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    viewer_ids = query.get("viewers", [])
    viewers = []
    
    for vid in viewer_ids:
        viewer = await db.team_users.find_one({"id": vid}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if not viewer:
            viewer = await db.admins.find_one({"id": vid}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if viewer:
            viewers.append(viewer)
    
    return {
        "query_id": query_id,
        "viewers": viewers,
        "created_by": query.get("created_by"),
        "created_by_name": query.get("created_by_name")
    }

@router.get("/support/school-queries")
async def get_school_support_queries(user: dict = Depends(get_current_user)):
    queries = await db.school_support_queries.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return queries

@router.get("/support/tickets")
async def get_support_tickets(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"source": {"$ne": "tracking_page"}}  # Exclude tracking page tickets
    if status:
        query["status"] = status
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for ticket in tickets:
        if isinstance(ticket.get('created_at'), str):
            try:
                ticket['created_at'] = datetime.fromisoformat(ticket['created_at'].replace('Z', '+00:00'))
            except:
                pass
        # Normalize fields for school_crm tickets
        if ticket.get('source') == 'school_crm':
            ticket['name'] = ticket.get('contact_name', ticket.get('school_name', ''))
            ticket['email'] = ticket.get('contact_email', '')
            ticket['phone'] = ticket.get('contact_phone', '')
            ticket['message'] = ticket.get('description', '')
            ticket['user_type'] = 'school'
            ticket['query_type'] = ticket.get('query_type', 'general')
    return tickets

@router.patch("/support/tickets/{ticket_id}")
async def update_support_ticket(ticket_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a support ticket"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user.get("email", "admin")
    
    # Track activity if status changed
    if "status" in data:
        activity = {
            "type": "status_change",
            "old_status": "",  # Will be filled if we want to track old status
            "new_status": data["status"],
            "by": user.get("name", user.get("email", "admin")),
            "date": datetime.now(timezone.utc).isoformat()
        }
        await db.support_tickets.update_one(
            {"id": ticket_id}, 
            {"$push": {"activity_history": activity}, "$set": update_data}
        )
    else:
        await db.support_tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    # Send notification if ticket is being assigned to someone
    if "assigned_to" in data and data.get("assigned_to"):
        # Get the updated ticket
        ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
        # Get assignee from team_users or users
        assignee = await db.team_users.find_one({"id": data["assigned_to"]}, {"_id": 0})
        if not assignee:
            assignee = await db.users.find_one({"id": data["assigned_to"]}, {"_id": 0})
        if assignee and assignee.get('phone') and ticket:
            await send_support_ticket_notification(ticket, assignee)
            print(f"Ticket assignment notification sent to {assignee.get('name')} at {assignee.get('phone')}")
    
    return {"message": "Updated successfully"}

# ========================
# ADMIN CREATE SUPPORT TICKET
# ========================

@router.post("/support/queries/create")
async def create_support_query(data: dict, user: dict = Depends(get_current_user)):
    """Create a new support query from admin"""
    query_id = str(uuid.uuid4())
    user_id = user.get("id") or user.get("email")
    
    # Initialize viewers with the creator
    viewers = [user_id] if user_id else []
    
    doc = {
        "id": query_id,
        "name": data.get("name", ""),
        "phone": data.get("phone", ""),
        "email": data.get("email", ""),
        "query_type": data.get("query_type", "other"),
        "related_to": data.get("related_to", ""),  # Sub-category
        "inquiry_type": data.get("inquiry_type", "student"),
        "message": data.get("message", ""),
        "query_details": data.get("message", ""),  # Also store as query_details for consistency
        "priority": data.get("priority", "normal"),
        "status": "open",
        "source": data.get("source", "admin_created"),
        "attachments": data.get("attachments", []),  # [{name, url, type, is_voice_note}]
        "created_by": user_id,
        "created_by_name": user.get("name", "Admin"),
        "viewers": viewers,  # Array of user IDs who can view this query
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "comments": [],
        "assigned_to": data.get("assigned_to"),
        "ticket_number": await get_next_ticket_number(),
    }
    await db.support_queries.insert_one(doc)
    
    # Send notification if assigned to someone
    if data.get("assigned_to"):
        assignee = await db.team_users.find_one({"id": data["assigned_to"]}, {"_id": 0})
        if not assignee:
            assignee = await db.users.find_one({"id": data["assigned_to"]}, {"_id": 0})
        if assignee and assignee.get('phone'):
            # Reuse ticket notification function
            ticket_data = {
                "id": query_id,
                "subject": data.get("query_type", "Support Query"),
                "priority": data.get("priority", "normal"),
                "school_name": data.get("name", "Customer"),
                "contact_name": data.get("name", "")
            }
            await send_support_ticket_notification(ticket_data, assignee)
            print(f"Query notification sent to {assignee.get('name')} at {assignee.get('phone')}")
    
    return {"message": "Query created successfully", "id": query_id}

# ========================
# BATCH MANAGEMENT
# ========================

@router.post("/batches")
async def create_batch(data: dict, user: dict = Depends(get_current_user)):
    """Create a new batch for student sessions"""
    batch_id = str(uuid.uuid4())
    doc = {
        "id": batch_id,
        "name": data.get("name", f"Batch-{batch_id[:8]}"),
        "skill": data.get("skill", ""),
        "start_date": data.get("start_date"),
        "days": data.get("days", []),  # ['monday', 'wednesday', 'friday']
        "time_slot": data.get("time_slot", ""),
        "num_sessions": data.get("num_sessions", 12),
        "educator_id": data.get("educator_id"),
        "educator_name": data.get("educator_name", ""),
        "mode": data.get("mode", "online"),  # online, offline, hybrid
        "status": "active",
        "students": [],  # List of student IDs
        "created_by": user.get("email", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.batches.insert_one(doc)
    return {"message": "Batch created successfully", "id": batch_id, "batch": {k: v for k, v in doc.items() if k != '_id'}}

@router.get("/batches")
async def get_batches(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all batches"""
    query = {}
    if status:
        query["status"] = status
    batches = await db.batches.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return batches

@router.get("/batches/{batch_id}")
async def get_batch(batch_id: str, user: dict = Depends(get_current_user)):
    """Get batch by ID"""
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch

@router.put("/batches/{batch_id}")
async def update_batch(batch_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update batch"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.batches.update_one({"id": batch_id}, {"$set": update_data})
    return {"message": "Batch updated successfully"}

@router.post("/batches/{batch_id}/add-student")
async def add_student_to_batch(batch_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a student to a batch and generate sessions"""
    student_id = data.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id is required")
    
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Add student to batch
    if student_id not in batch.get("students", []):
        await db.batches.update_one(
            {"id": batch_id},
            {"$push": {"students": student_id}}
        )
    
    # Generate sessions for this student
    sessions = await generate_student_sessions(batch, student_id)
    
    # Update student inquiry with batch info
    await db.student_inquiries.update_one(
        {"id": student_id},
        {"$set": {
            "batch_id": batch_id,
            "batch_name": batch.get("name"),
            "onboarding_status": "active",
            "sessions_total": len(sessions),
            "sessions_completed": 0,
        }}
    )
    
    return {"message": "Student added to batch", "sessions_created": len(sessions)}

async def generate_student_sessions(batch: dict, student_id: str):
    """Generate session records for a student based on batch config"""
    from datetime import datetime, timedelta
    
    sessions = []
    start_date = datetime.strptime(batch["start_date"], "%Y-%m-%d") if isinstance(batch["start_date"], str) else batch["start_date"]
    days_map = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
    batch_days = [days_map.get(d.lower(), 0) for d in batch.get("days", [])]
    
    num_sessions = batch.get("num_sessions", 12)
    current_date = start_date
    session_count = 0
    
    # Generate Jitsi room name for online sessions
    jitsi_room = f"oll-{batch['id'][:8]}-{student_id[:8]}" if batch.get("mode") == "online" else None
    
    while session_count < num_sessions:
        if current_date.weekday() in batch_days:
            session_id = str(uuid.uuid4())
            session = {
                "id": session_id,
                "batch_id": batch["id"],
                "student_id": student_id,
                "educator_id": batch.get("educator_id"),
                "educator_name": batch.get("educator_name"),
                "session_number": session_count + 1,
                "date": current_date.strftime("%Y-%m-%d"),
                "time": batch.get("time_slot", ""),
                "skill": batch.get("skill", ""),
                "mode": batch.get("mode", "online"),
                "status": "scheduled",  # scheduled, completed, cancelled, rescheduled
                "jitsi_room": jitsi_room,
                "jitsi_link": f"https://meet.jit.si/{jitsi_room}" if jitsi_room else None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.sessions.insert_one(session)
            sessions.append(session)
            session_count += 1
        current_date += timedelta(days=1)
    
    return sessions

@router.get("/sessions")
async def get_sessions(
    student_id: Optional[str] = None,
    educator_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get sessions with filters"""
    query = {}
    if student_id:
        query["student_id"] = student_id
    if educator_id:
        query["educator_id"] = educator_id
    if batch_id:
        query["batch_id"] = batch_id
    if status:
        query["status"] = status
    
    sessions = await db.sessions.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return sessions

@router.put("/sessions/{session_id}")
async def update_session(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a session status"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.sessions.update_one({"id": session_id}, {"$set": update_data})
    
    # If marking as completed, update student's completed count
    if data.get("status") == "completed":
        session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
        if session:
            await db.student_inquiries.update_one(
                {"id": session["student_id"]},
                {"$inc": {"sessions_completed": 1}}
            )
    
    return {"message": "Session updated successfully"}

@router.get("/user/my-sessions/{phone}")
async def get_user_sessions(phone: str):
    """Get sessions for a student by phone number (no auth required for user flow)"""
    # First find the student inquiry by phone
    student = await db.student_inquiries.find_one({"phone": phone, "status": "converted"}, {"_id": 0})
    
    if not student:
        return {"sessions": [], "student": None}
    
    # Get sessions for this student
    sessions = await db.sessions.find({"student_id": student["id"]}, {"_id": 0}).sort("date", 1).to_list(100)
    
    # Enrich sessions with batch info
    for session in sessions:
        if session.get("batch_id"):
            batch = await db.batches.find_one({"id": session["batch_id"]}, {"_id": 0, "name": 1, "skill": 1})
            if batch:
                session["batch_name"] = batch.get("name")
                session["skill"] = batch.get("skill") or session.get("skill")
    
    return {
        "sessions": sessions,
        "student": {
            "id": student.get("id"),
            "name": student.get("name"),
            "skill": student.get("skill"),
            "batch_id": student.get("batch_id"),
            "batch_name": student.get("batch_name"),
            "sessions_total": student.get("sessions_total", 0),
            "sessions_completed": student.get("sessions_completed", 0)
        }
    }

@router.get("/educator/my-sessions")
async def get_educator_sessions(user: dict = Depends(get_current_user)):
    """Get all sessions assigned to the logged-in educator"""
    educator_id = user.get("educator_id") or user.get("id")
    
    if not educator_id:
        # Try to find educator by email
        educator = await db.educator_applications.find_one({"email": user.get("email")}, {"_id": 0})
        if educator:
            educator_id = educator["id"]
    
    if not educator_id:
        raise HTTPException(status_code=403, detail="Educator not found")
    
    # Get all sessions for this educator
    sessions = await db.sessions.find({"educator_id": educator_id}, {"_id": 0}).sort("date", 1).to_list(500)
    
    # Enrich with student and batch info
    for session in sessions:
        # Get student info
        if session.get("student_id"):
            student = await db.student_inquiries.find_one({"id": session["student_id"]}, {"_id": 0, "name": 1, "phone": 1, "email": 1})
            if student:
                session["student_name"] = student.get("name")
                session["student_phone"] = student.get("phone")
                session["student_email"] = student.get("email")
        
        # Get batch info
        if session.get("batch_id"):
            batch = await db.batches.find_one({"id": session["batch_id"]}, {"_id": 0, "name": 1, "skill": 1})
            if batch:
                session["batch_name"] = batch.get("name")
    
    return sessions

# ========================
# SCHOOL ONBOARDING
# ========================