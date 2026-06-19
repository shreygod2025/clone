"""
Support Queries, Support Tickets, Batches, and Sessions routes.
"""
import uuid
import asyncio
import logging
import resend
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field, ConfigDict, EmailStr

from .shared import db, get_current_user, ensure_resend_api_key, SENDER_EMAIL, get_next_ticket_number
from .notifications import send_whatsapp_notification, send_ticket_overdue_notification, send_ticket_overdue_admin_notification
from .expenses import transform_tracking_url, VENDOR_PUBLIC_API, fetch_vendor_products
import httpx

router = APIRouter()


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
    """Assign sequential ticket_number to all tickets missing one across all collections."""
    updated = 0
    collection_stats = {}
    for collection_name in ["support_queries", "support_tickets", "inquiry_queries"]:
        try:
            # Fetch tickets with missing/empty/null ticket_number
            tickets = await db[collection_name].find(
                {"$or": [
                    {"ticket_number": {"$exists": False}},
                    {"ticket_number": None},
                    {"ticket_number": ""},
                ]},
                {"_id": 0, "id": 1, "created_at": 1}
            ).sort("created_at", 1).to_list(10000)

            count = 0
            for ticket in tickets:
                if not ticket.get("id"):
                    continue
                num = await get_next_ticket_number()
                await db[collection_name].update_one(
                    {"id": ticket["id"]},
                    {"$set": {"ticket_number": num}}
                )
                updated += 1
                count += 1
            collection_stats[collection_name] = count
        except Exception as e:
            logging.warning(f"[Backfill] Skipped collection '{collection_name}': {e}")
            collection_stats[collection_name] = 0

    counter = await db.counters.find_one({"key": "ticket_number"}, {"_id": 0})
    next_num = str((counter or {}).get("seq", 0) + 1).zfill(4)
    return {
        "message": f"Assigned ticket IDs to {updated} tickets",
        "updated": updated,
        "breakdown": collection_stats,
        "next_ticket_number": next_num
    }



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

    # Pre-fetch the doc once so we can both manage the hold timer AND fire
    # the customer-facing status-change email below.
    new_status = data.get("status")
    existing = await db.support_queries.find_one({"id": query_id}, {"_id": 0}) if new_status is not None else None
    prev_status = (existing or {}).get("status")

    # ── Hold lifecycle: pause resolution timer ─────────────────────────────
    # When status → on_hold: stamp hold_started_at + hold_reason.
    # When status → away from on_hold: accumulate (now - hold_started_at) into paused_seconds.
    if new_status is not None and existing is not None:
        now_iso = datetime.now(timezone.utc).isoformat()

        if new_status == "on_hold" and prev_status != "on_hold":
            update_data["hold_started_at"] = now_iso
            update_data["hold_reason"] = data.get("hold_reason") or existing.get("hold_reason") or "Other"
        elif prev_status == "on_hold" and new_status != "on_hold":
            try:
                if existing.get("hold_started_at"):
                    held = (datetime.now(timezone.utc) - datetime.fromisoformat(existing["hold_started_at"].replace("Z", "+00:00"))).total_seconds()
                    update_data["paused_seconds"] = int(existing.get("paused_seconds", 0) + max(0, held))
            except Exception:
                pass
            update_data["hold_started_at"] = None  # clear

    # Auto-set resolved_at when status → resolved/closed (if not already set)
    if data.get("status") in ("resolved", "closed"):
        if not (existing or {}).get("resolved_at"):
            update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    elif data.get("status") in ("new", "open", "in_progress"):
        # Re-opened — clear resolved_at so resolution-time recalculates on next close
        update_data["resolved_at"] = None

    # Track status change in activity history
    if "status" in data:
        activity = {
            "type": "status_change",
            "new_status": data["status"],
            "by": user.get("name", user.get("email", "admin")),
            "date": datetime.now(timezone.utc).isoformat()
        }
        if data.get("status") == "on_hold" and data.get("hold_reason"):
            activity["hold_reason"] = data["hold_reason"]
        await db.support_queries.update_one(
            {"id": query_id},
            {"$set": update_data, "$push": {"activity_history": activity}}
        )
    else:
        await db.support_queries.update_one({"id": query_id}, {"$set": update_data})

    # ── Customer status-change email ────────────────────────────────────────
    # Fires ONLY on actual transitions (prev != new) into one of:
    # in_progress · on_hold · resolved · closed. Replied & sent only if a
    # customer email is on file. Failures are logged but don't break the
    # status update — the admin's primary action still succeeds.
    if (
        new_status
        and existing
        and prev_status != new_status
        and new_status in ("in_progress", "on_hold", "resolved", "closed")
    ):
        ticket_for_mail = {**existing, **update_data}
        hold_reason = data.get("hold_reason") or existing.get("hold_reason")
        # Run in the background so the admin's PATCH returns instantly
        asyncio.create_task(_send_customer_status_email(
            ticket=ticket_for_mail,
            new_status=new_status,
            hold_reason=hold_reason,
            admin_name=user.get("name") or user.get("email") or "OLL Support",
        ))

    return {"message": "Query updated successfully"}


async def _send_customer_status_email(ticket: dict, new_status: str, hold_reason: Optional[str], admin_name: str):
    """Send a status-change notification to the customer via Resend.

    Templates per status:
      - in_progress: "We're working on it"
      - on_hold:     "Paused — here's why" (uses hold_reason)
      - resolved:    "Resolved — please confirm"
      - closed:      same as resolved but final
    Silent no-op if no customer email is on file.
    """
    customer_email = (ticket.get("email") or "").strip()
    if not customer_email or "@" not in customer_email:
        return
    try:
        if not await ensure_resend_api_key():
            return
        first_name = (ticket.get("name") or "there").split()[0]
        ticket_no = ticket.get("ticket_number") or (ticket.get("id") or "")[:8].upper()
        query_type_label = (ticket.get("query_type") or "support").replace("_", " ").title()

        copy = {
            "in_progress": {
                "subject": f"Update on your query — Ticket #{ticket_no} | In Progress",
                "headline": "We're now working on this",
                "body_html": f"<p>Good news — our team has picked up your query and we are actively working on it.</p>"
                             f"<p>We'll come back to you with a resolution as soon as possible. If you'd like to add any extra context, "
                             f"just reply to this email.</p>",
                "body_text": "Good news — our team has picked up your query and we are actively working on it. "
                             "We'll come back to you with a resolution as soon as possible. If you'd like to add any extra context, "
                             "just reply to this email.",
                "accent": "#2563eb",
            },
            "on_hold": {
                "subject": f"Your query is on hold — Ticket #{ticket_no}",
                "headline": "We've placed this on hold",
                "body_html": f"<p>We're temporarily pausing work on this ticket while we wait on some information from your side.</p>"
                             + (f"<p><strong>Reason:</strong> {hold_reason}</p>" if hold_reason else "")
                             + "<p>Please reply to this email with the details — we'll resume the moment we hear from you.</p>",
                "body_text": "We're temporarily pausing work on this ticket while we wait on some information from your side.\n"
                             + (f"Reason: {hold_reason}\n" if hold_reason else "")
                             + "Please reply to this email with the details — we'll resume the moment we hear from you.",
                "accent": "#d97706",
            },
            "resolved": {
                "subject": f"Resolved — Ticket #{ticket_no} | OLL Support",
                "headline": "Your query has been resolved",
                "body_html": "<p>Your query has been marked <strong>resolved</strong>. If everything looks good on your side, no further "
                             "action is needed — this thread will close automatically.</p>"
                             "<p>If anything is still pending, simply reply to this email and we'll re-open the ticket.</p>",
                "body_text": "Your query has been marked resolved. If everything looks good on your side, no further action is needed — "
                             "this thread will close automatically. If anything is still pending, simply reply to this email and we'll "
                             "re-open the ticket.",
                "accent": "#15803d",
            },
            "closed": {
                "subject": f"Closed — Ticket #{ticket_no} | OLL Support",
                "headline": "This ticket is now closed",
                "body_html": "<p>This ticket has been closed. Thank you for reaching out to OLL.</p>"
                             "<p>Need help with something new? Just reply to this email or write to "
                             "<a href='mailto:welcome@oll.co'>welcome@oll.co</a> and we'll open a fresh ticket.</p>",
                "body_text": "This ticket has been closed. Thank you for reaching out to OLL.\n"
                             "Need help with something new? Just reply to this email or write to welcome@oll.co and we'll open a fresh ticket.",
                "accent": "#475569",
            },
        }[new_status]

        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a202c;">
            <h2 style="color: {copy['accent']}; margin-bottom: 8px;">{copy['headline']} — Ticket #{ticket_no}</h2>
            <p>Hi {first_name},</p>
            {copy['body_html']}
            <div style="background: #f6f8fa; padding: 14px 18px; border-radius: 10px; margin: 18px 0; border-left: 4px solid {copy['accent']};">
                <p style="margin: 4px 0;"><strong>Ticket #</strong> {ticket_no}</p>
                <p style="margin: 4px 0;"><strong>Category:</strong> {query_type_label}</p>
                <p style="margin: 4px 0;"><strong>Updated by:</strong> {admin_name}</p>
            </div>
            <p style="margin-top: 28px;">Warm regards,<br><strong>OLL Support Team</strong><br><a href="https://oll.co" style="color: #1E3A5F;">oll.co</a></p>
        </div>
        """
        plain_body = (
            f"Hi {first_name},\n\n"
            f"{copy['body_text']}\n\n"
            f"Ticket #: {ticket_no}\n"
            f"Category: {query_type_label}\n"
            f"Updated by: {admin_name}\n\n"
            f"Warm regards,\nOLL Support Team\nhttps://oll.co"
        )
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [customer_email],
            "subject": copy["subject"],
            "html": html_body,
            "text": plain_body,
            "reply_to": ["welcome@oll.co"],
            "headers": {"List-Unsubscribe": "<mailto:unsubscribe@oll.co>"},
        })
        # Persist the last status-update notification on the ticket for audit
        await db.support_queries.update_one(
            {"id": ticket["id"]},
            {"$set": {
                "last_status_email_at": datetime.now(timezone.utc).isoformat(),
                "last_status_email_to": customer_email,
                "last_status_email_status": new_status,
            }},
        )
        print(f"[support/status-email] sent '{new_status}' email to {customer_email} for ticket #{ticket_no}")
    except Exception as e:
        print(f"[support/status-email] failed for {customer_email}: {e}")
        try:
            await db.support_queries.update_one(
                {"id": ticket["id"]},
                {"$set": {"last_status_email_error": str(e)[:200]}},
            )
        except Exception:
            pass

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
    
    assignee = await _resolve_assignee(assigned_to)
    assignee_name = assignee.get("name", "Team Member") if assignee else "Unknown"

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

    await send_assignment_notifications(query, assignee, assignee_name, query_id, deadline)
    return {"message": "Query assigned successfully", "assigned_to": assigned_to}


async def _resolve_assignee(user_id: str):
    assignee = await db.team_users.find_one({"id": user_id}, {"_id": 0})
    if not assignee:
        assignee = await db.center_users.find_one({"id": user_id}, {"_id": 0})
    if not assignee:
        assignee = await db.admins.find_one({"id": user_id}, {"_id": 0})
    return assignee


async def send_assignment_notifications(query: dict, assignee: dict, assignee_name: str, query_id: str, deadline):
    """Shared helper — fires WhatsApp + Email when a query is assigned.

    Used by both /support/queries/{id}/assign and /inquiry/queries/{id}/assign so
    the Need Help popup queries also notify the assignee.
    """
    if not assignee:
        return

    assignee_phone = assignee.get("phone", "")
    assignee_email = assignee.get("email", "")
    query_type = query.get("query_type", query.get("type", "Support Request"))
    query_details = (query.get("message") or query.get("query") or query.get("query_details") or "")[:100]
    deadline_str = deadline if deadline else "As soon as possible"

    print(f"[ASSIGN] Notify {assignee_name} (phone={assignee_phone}, email={assignee_email})")

    # WhatsApp notification (template: ticket_assigned)
    if assignee_phone and str(assignee_phone).strip() not in ['None', '', 'null']:
        try:
            ticket_id = (query.get("ticket_number") or query_id[:8]).upper()
            subject = query.get("query_type", "Support Request")
            priority = (query.get("priority") or "normal").upper()
            customer_name = query.get("name", "Customer")
            result = await send_whatsapp_notification(
                assignee_phone, "ticket_assigned",
                params=[assignee_name, ticket_id, subject, priority, customer_name],
                user_name="Clone Futura Live Solutions Ltd"
            )
            print(f"[ASSIGN] WhatsApp → {assignee_phone}: {result}")
        except Exception as e:
            print(f"[ASSIGN] WhatsApp failed: {e}")
    else:
        # Fallback: notify admin phones
        try:
            admin_phones_doc = await db.settings.find_one({"key": "admin_notification_phones"})
            admin_phones = admin_phones_doc.get("value", []) if admin_phones_doc else []
            ticket_id_short = (query.get("ticket_number") or query_id[:8]).upper()
            subject = query.get("query_type", "Support Request")
            priority = (query.get("priority") or "normal").upper()
            customer_name = query.get("name", "Customer")
            for phone in admin_phones:
                await send_whatsapp_notification(
                    phone, "ticket_assigned",
                    params=[assignee_name, ticket_id_short, subject, priority, customer_name],
                    user_name="Clone Futura Live Solutions Ltd"
                )
        except Exception as e:
            print(f"[ASSIGN] Admin fallback WhatsApp failed: {e}")

    # Email via Resend
    resend_ready = await ensure_resend_api_key()
    if assignee_email and resend_ready:
        try:
            ticket_id_full = (query.get("ticket_number") or query_id[:8]).upper()
            email_params = {
                "from": SENDER_EMAIL,
                "to": [assignee_email],
                "subject": f"New Support Ticket Assigned — #{ticket_id_full} ({query_type})",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1E3A5F;">New Support Ticket Assigned</h2>
                    <p>Hi {assignee_name},</p>
                    <p>A new support ticket has been assigned to you:</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Ticket #:</strong> {ticket_id_full}</p>
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
            print(f"[ASSIGN] Email sent to {assignee_email}")
        except Exception as e:
            print(f"[ASSIGN] Email failed: {e}")

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

    # Auto-set resolved_at when status → resolved/closed (if not already set)
    if data.get("status") in ("resolved", "closed"):
        existing = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0, "resolved_at": 1})
        if not (existing or {}).get("resolved_at"):
            update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    elif data.get("status") in ("new", "open", "in_progress"):
        update_data["resolved_at"] = None

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
    """Create a new support query from admin.

    Includes a 10-second dedup window: if an admin double-clicks (or two near-
    simultaneous POSTs land due to network retries), we return the already-
    created ticket instead of inserting a duplicate. The dedup key is the
    tuple (created_by, phone, email, message) — admins explicitly creating
    two near-identical tickets within 10s is virtually never intentional.
    """
    user_id = user.get("id") or user.get("email")
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()
    message = (data.get("message") or "").strip()

    # ── Dedup safety net ──────────────────────────────────────────────────
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat()
    if phone or email or message:
        existing = await db.support_queries.find_one(
            {
                "created_by": user_id,
                "phone": phone,
                "email": email,
                "message": message,
                "created_at": {"$gte": cutoff},
            },
            {"_id": 0, "id": 1, "ticket_number": 1},
        )
        if existing:
            return {
                "id": existing.get("id"),
                "ticket_number": existing.get("ticket_number"),
                "deduped": True,
                "message": "Same ticket was just created — returning existing one.",
            }

    query_id = str(uuid.uuid4())

    # Initialize viewers with the creator
    viewers = [user_id] if user_id else []

    doc = {
        "id": query_id,
        "name": data.get("name", ""),
        "phone": phone,
        "email": email,
        "query_type": data.get("query_type", "other"),
        "related_to": data.get("related_to", ""),  # Sub-category
        "inquiry_type": data.get("inquiry_type", "student"),
        "message": message,
        "query_details": message,  # Also store as query_details for consistency
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

    # ── Customer acknowledgment email ───────────────────────────────────────
    # Sent via Resend. We also send for admin-created tickets so the customer
    # gets the same "ticket #XXXX received, replying within 48h" promise that
    # Gmail-bot auto-tickets get. Skip if no customer email is on record.
    customer_email = (data.get("email") or "").strip()
    if customer_email and "@" in customer_email:
        try:
            resend_ready = await ensure_resend_api_key()
            if resend_ready:
                first_name = (data.get("name") or "there").split()[0]
                ticket_no = doc["ticket_number"]
                query_type_label = (data.get("query_type") or "support").replace("_", " ").title()
                preview = (data.get("message") or "")[:400]
                html_body = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a202c;">
                    <h2 style="color: #1E3A5F; margin-bottom: 8px;">We've received your query — Ticket #{ticket_no}</h2>
                    <p>Hi {first_name},</p>
                    <p>Thank you for reaching out to OLL. We've logged your query and our team will get back to you within <strong>48 hours</strong>.</p>
                    <div style="background: #f6f8fa; padding: 16px 20px; border-radius: 10px; margin: 18px 0; border-left: 4px solid #1E3A5F;">
                        <p style="margin: 4px 0;"><strong>Ticket #</strong> {ticket_no}</p>
                        <p style="margin: 4px 0;"><strong>Category:</strong> {query_type_label}</p>
                        {f'<p style="margin: 4px 0;"><strong>Details:</strong> {preview}{"…" if len(data.get("message") or "")>400 else ""}</p>' if preview else ""}
                    </div>
                    <p>If your matter is urgent or you'd like to add more context, simply reply to this email and we'll prioritise it.</p>
                    <p style="margin-top: 28px;">Warm regards,<br><strong>OLL Support Team</strong><br><a href="https://oll.co" style="color: #1E3A5F;">oll.co</a></p>
                </div>
                """
                plain_body = (
                    f"Hi {first_name},\n\n"
                    f"Thank you for reaching out to OLL. We've logged your query and our team will get back to you within 48 hours.\n\n"
                    f"Ticket #: {ticket_no}\n"
                    f"Category: {query_type_label}\n"
                    + (f"Details: {preview}\n\n" if preview else "\n")
                    + "If your matter is urgent or you'd like to add more context, simply reply to this email and we'll prioritise it.\n\n"
                    f"Warm regards,\nOLL Support Team\nhttps://oll.co"
                )
                email_params = {
                    "from": SENDER_EMAIL,
                    "to": [customer_email],
                    "subject": f"We've received your query — Ticket #{ticket_no} | OLL Support",
                    "html": html_body,
                    "text": plain_body,
                    "reply_to": ["welcome@oll.co"],
                    "headers": {"List-Unsubscribe": "<mailto:unsubscribe@oll.co>"},
                }
                await asyncio.to_thread(resend.Emails.send, email_params)
                # Persist the ack flag so the support panel can show "ack sent ✓"
                await db.support_queries.update_one(
                    {"id": query_id},
                    {"$set": {
                        "ack_sent": True,
                        "ack_sent_at": datetime.now(timezone.utc).isoformat(),
                        "ack_channel": "resend_email",
                    }},
                )
                print(f"[support/create] ack email sent to {customer_email} for ticket #{ticket_no}")
        except Exception as e:
            print(f"[support/create] ack email failed for {customer_email}: {e}")
            await db.support_queries.update_one(
                {"id": query_id},
                {"$set": {"ack_error": str(e)[:200]}},
            )

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


# ============================================================================
# Raise PO for a Support Query (typically kit_related issues)
# ============================================================================
@router.post("/support/queries/{query_id}/raise-po")
async def raise_po_for_support_query(query_id: str, data: dict, user: dict = Depends(get_current_user)):
    """
    Raise a PO to the vendor panel for a kit-related support query.
    Used when a kit component is missing / damaged / delayed and needs replacement.
    Looks up the query across support_queries / support_tickets / inquiry_queries.
    """
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")

    delivery_date = data.get("delivery_date")
    products = data.get("products") or []
    delivery_address = (data.get("delivery_address") or "").strip()
    contact_person = (data.get("contact_person") or "").strip()
    contact_number = (data.get("contact_number") or "").strip()
    notes = data.get("notes") or ""

    if not delivery_date:
        raise HTTPException(status_code=400, detail="Delivery date is required")
    if not delivery_address:
        raise HTTPException(status_code=400, detail="Delivery address is required")
    if not contact_person or not contact_number:
        raise HTTPException(status_code=400, detail="Contact person and number are required")
    cleaned = [
        {
            "product_name": (p.get("product_name") or "").strip(),
            "product_id": (p.get("product_id") or "").strip() or None,
            "quantity": int(p.get("quantity") or 0),
        }
        for p in products if (p.get("product_name") or "").strip() and int(p.get("quantity") or 0) > 0
    ]
    if not cleaned:
        raise HTTPException(status_code=400, detail="At least one product with quantity is required")

    # Locate the query across the three collections
    query, collection_name = None, None
    for coll in ("support_queries", "support_tickets", "inquiry_queries"):
        doc = await db[coll].find_one({"id": query_id}, {"_id": 0})
        if doc:
            query, collection_name = doc, coll
            break
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    # Build PO payload for vendor panel (same shape as school onboarding raise-po)
    po_payload = {
        "requester_name": user.get("name") or user.get("email", "OLL Support"),
        "delivery_date": delivery_date,
        "delivery_address": delivery_address,
        "contact_person": contact_person,
        "contact_number": contact_number,
        "school_name": query.get("school_name") or query.get("user_name") or contact_person,
        "city": query.get("city") or "",
        "notes": notes or f"Replacement PO raised from support ticket #{query_id[-8:]}",
        "source_system": "oll_support",
        "products": cleaned,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{VENDOR_PUBLIC_API}/po-request",
                json=po_payload,
                timeout=15.0,
            )
            response.raise_for_status()
            po_result = response.json()
        except httpx.HTTPStatusError as e:
            err_text = e.response.text if hasattr(e.response, 'text') else str(e)
            logging.error(f"Vendor PO API error from support: {e.response.status_code} - {err_text}")
            raise HTTPException(status_code=502, detail=f"Vendor API error: {err_text}")
        except Exception as e:
            logging.error(f"Vendor PO API error from support: {str(e)}")
            raise HTTPException(status_code=502, detail=f"Failed to reach vendor API: {str(e)}")

    po_info = {
        "po_number": po_result.get("po_number"),
        "po_id": po_result.get("po_id"),
        "tracking_token": po_result.get("tracking_token"),
        "tracking_url": transform_tracking_url(po_result.get("tracking_url")),
        "status": po_result.get("status"),
        "products": cleaned,
        "delivery_date": delivery_date,
        "delivery_address": delivery_address,
        "contact_person": contact_person,
        "contact_number": contact_number,
        "raised_at": datetime.now(timezone.utc).isoformat(),
        "raised_by": user.get("email"),
    }

    await db[collection_name].update_one(
        {"id": query_id},
        {
            "$set": {
                "po_info": po_info,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            "$push": {
                "activity_history": {
                    "id": str(uuid.uuid4()),
                    "action": "raise_po",
                    "details": f"PO {po_result.get('po_number')} raised for {len(cleaned)} product(s)",
                    "by": user.get("email"),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        },
    )

    return {
        "success": True,
        "po_number": po_result.get("po_number"),
        "tracking_url": transform_tracking_url(po_result.get("tracking_url")),
        "products_count": len(cleaned),
        "po_info": po_info,
        "message": f"PO {po_result.get('po_number')} raised successfully with {len(cleaned)} product(s)",
    }



# Cached vendor catalog (60s)
_vendor_catalog_cache = {"data": [], "at": 0}


@router.get("/support/vendor-products")
async def list_vendor_products(_user: dict = Depends(get_current_user)):
    """
    Fetch vendor product catalog for the Raise-PO dropdown in Support Center.
    Lightweight 60s cache to avoid hitting vendor API on every keystroke.
    """
    import time as _time
    now = _time.time()
    if _vendor_catalog_cache["data"] and (now - _vendor_catalog_cache["at"]) < 60:
        return {"products": _vendor_catalog_cache["data"]}

    catalog = await fetch_vendor_products()
    # Normalise to the minimum shape the frontend needs
    simplified = [
        {
            "id": p.get("id") or p.get("_id") or p.get("product_id"),
            "name": p.get("name") or p.get("product_name") or "",
            "sku": p.get("sku") or "",
            "price": p.get("price") or p.get("unit_price"),
            "category": p.get("category") or p.get("type") or "",
        }
        for p in (catalog or [])
        if (p.get("name") or p.get("product_name"))
    ]
    simplified.sort(key=lambda p: p["name"].lower())
    _vendor_catalog_cache["data"] = simplified
    _vendor_catalog_cache["at"] = now
    return {"products": simplified}

# ========================