"""
Shared WhatsApp notification helpers - used by all route modules.
"""
import os
import httpx

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

    # Summer Camp follow-up (phone captured but didn't complete)
    "summercamp_followup": "summercamp lead",
    # Summer Camp payment-pending follow-up (filled details but didn't pay)
    "summercamp_payment_pending": "summercamppaymentpending",
    # Summer Camp payment-pending 2nd follow-up at 20 hours
    "summercamp_payment_pending_2": "summercamp payment pending followup 1",
    # Summer Camp payment-pending 3rd follow-up at 48 hours (2 days)
    "summercamp_payment_pending_3": "summer camp payment pending followup 2",
    # Phone-captured 2nd follow-up at 24 hours
    "summercamp_phone_captured_24h": "summer camp phone captured followup 1",
    # Closing follow-up at 7 days (both phone_captured AND lead who never paid)
    "summercamp_closing_7days": "summer camp registraitons closing followup",
}

async def send_whatsapp_notification(
    phone: str,
    template_key: str,
    params: list = None,
    user_name: str = "User",
    media: dict = None,
) -> dict:
    """
    Send WhatsApp notification via AiSensy
    
    Args:
        phone: Phone number (10 digits, will add 91 prefix)
        template_key: Key from WHATSAPP_TEMPLATES dict
        params: List of template parameters
        user_name: User's name for the message
        media: Optional dict with {url, filename} for file attachments
    
    Returns:
        dict with success status and message
    """
    # Validate phone number first
    if not phone or str(phone).strip() in ['', 'None', 'null', 'undefined']:
        print(f"[WhatsApp] Skipped {template_key} - invalid phone: {phone}")
        return {"success": False, "message": "Invalid or missing phone number"}
    
    AISENSY_API_KEY = os.environ.get("AISENSY_API_KEY", "")
    
    if not AISENSY_API_KEY:
        print("[WhatsApp] Skipped - API key not configured")
        return {"success": False, "message": "API key not configured"}
    
    campaign_name = WHATSAPP_TEMPLATES.get(template_key)
    if not campaign_name:
        print(f"[WhatsApp] Unknown template key: {template_key}")
        return {"success": False, "message": f"Unknown template: {template_key}"}
    
    try:
        # Robust Indian phone normalization
        # Strip all non-digits, then ensure 91+10-digit format
        phone_number = ''.join(c for c in str(phone) if c.isdigit())
        if len(phone_number) == 10:
            phone_number = f"91{phone_number}"
        elif len(phone_number) == 11 and phone_number.startswith("0"):
            phone_number = f"91{phone_number[1:]}"
        elif len(phone_number) == 12 and phone_number.startswith("91"):
            pass  # already correct
        elif len(phone_number) == 13 and phone_number.startswith("091"):
            phone_number = phone_number[1:]  # drop leading 0
        else:
            # Fallback: prepend 91 if shorter than 12 digits
            if not phone_number.startswith("91"):
                phone_number = f"91{phone_number}"

        if len(phone_number) < 11:
            print(f"[WhatsApp] Skipped {template_key} - phone too short after normalisation: {phone}")
            return {"success": False, "message": "Phone number too short"}

        payload = {
            "apiKey": AISENSY_API_KEY,
            "campaignName": campaign_name,
            "destination": phone_number,
            "userName": "Clone Futura Live Solutions Ltd",
            "templateParams": params or [],
            "source": "OLL Platform",
            "media": media if media else {},
            "buttons": [],
            "carouselCards": [],
            "location": {},
            "attributes": {},
            "paramsFallbackValue": {
                "FirstName": user_name if user_name and user_name != "User" else "user"
            }
        }
        
        print(f"[WhatsApp] Sending {template_key} to {phone_number} - Campaign: {campaign_name}")

        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://backend.aisensy.com/campaign/t1/api/v2",
                json=payload,
                timeout=30.0
            )

            resp_body = {}
            try:
                resp_body = response.json()
            except Exception:
                resp_body = {"raw": response.text}

            # AiSensy returns HTTP 200 even for errors — must check body
            aisensy_success = (
                str(resp_body.get("success", "")).lower() == "true"
                or bool(resp_body.get("submitted_message_id"))
            )

            if aisensy_success:
                print(f"[WhatsApp] Queued [{template_key}] → {phone_number} | id={resp_body.get('submitted_message_id', '?')}")
                return {"success": True, "message": "Notification sent"}
            else:
                err = resp_body.get("message") or resp_body.get("error") or str(resp_body)
                print(f"[WhatsApp] AiSensy error [{template_key}] → {phone_number} | HTTP {response.status_code} | {err}")
                return {"success": False, "message": err}

    except Exception as e:
        print(f"[WhatsApp] Exception [{template_key}] → {str(e)}")
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

