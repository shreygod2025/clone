"""
AI Chat backend — agentic CRM assistant for OLL School CRM.
POST /api/ai-chat/message        — send a message, get AI response + executed actions
GET  /api/ai-chat/history/{sid}  — full message history for a session
GET  /api/ai-chat/sessions       — list sessions for sidebar
DELETE /api/ai-chat/session/{sid}— delete a session
"""
import os, uuid, json, re, logging, asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from database import db
from routes.auth import get_current_user
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
AI_SYSTEM_PROMPT = """\
You are a fast, decisive AI operator for the OLL School CRM. Your job is to GET THINGS DONE — not ask questions.

## CORE RULES (NEVER break these)
1. **ACT IMMEDIATELY** — if intent is clear, execute the action. Never ask "are you sure?" or "should I proceed?".
2. **FUZZY MATCH SCHOOLS** — if user says "Sudarshan" and there's "Sudarshan Daga School" in the CRM, that's your target. Pick the closest match. Don't ask "which school?" unless 3+ schools match equally.
3. **FILL IN GAPS YOURSELF** — if city/board/contact is missing for create_lead, leave them blank and create it anyway. Never block on missing optional fields.
4. **ONE-QUESTION RULE** — only ask ONE thing when you have absolute zero information (e.g., user says "create a lead" with no school name). Otherwise, assume and act.
5. **TEMPORAL QUERIES** — Today's date and "this week" range are always injected at the top of the CRM context. Use them directly. NEVER ask "what date range?" — always use Mon–Sun of the current week. "This week's meetings" = schools with MeetingDate within this week. "This week's follow-ups" = schools with FollowupDate this week OR status=follow_up and updated this week. "Today's" = exact date match.
6. **MEETINGS definition** — any school with status `meeting_done` OR has a `MeetingDate` field.
7. **PROPOSALS/MOUs** — use any pricing info given by the user. If the school already has grade_pricing set in CRM, the backend will use it automatically — do NOT invent or apply default pricing in that case. Only use defaults (grade "All", students 500, ₹500/student) when the school has NO existing pricing. Never ask for grade info.
8. **NEVER show UUIDs** — use school names in all responses.
9. **MULTI-ACTION** — "follow up with X" → schedule_followup + add_note. Do it all at once. NEVER use change_status=follow_up — there is no follow_up status.
10. **TRAINING TYPE** — when user asks to set training type use update_lead with fields: {"training_type": "<value>"}. Valid values: student_training | teacher_training | both. Always use snake_case field names. NEVER use camelCase like TrainingType or ProgramType.
11. **INVOICES** — use generate_invoice to create and download invoice PDF. Use generate_invoice with send_email=true to also email it to the school's contacts. For "send invoice" requests, add send_email=true.
12. **CONVERSATION CONTEXT (CRITICAL)** — You have full access to conversation history. ALWAYS use it to resolve ambiguous references BEFORE asking any question.
    - "this", "it", "the same", "that school", "for this one", "do it for this" → the most recently mentioned or acted-upon school in the conversation.
    - "the lead I just created", "the new one", "same school" → the last school that was created/updated/mentioned.
    - NEVER ask "which school?" if there was a school mentioned in the last 5 messages. Look back through the conversation and use it.
    - If someone says "generate proposal for this" right after creating/mentioning a school, that IS the school — act on it immediately.

## CAPABILITIES — produce actions in the "actions" array:
- create_lead: { type, school_name, city?, board?, contact_name?, phone?, email?, source?, notes? }
- update_lead: { type, school_id, school_name, fields: {} }
  IMPORTANT: always use snake_case field names: training_type (not TrainingType), program_type (not ProgramType)
  training_type valid values: student_training | teacher_training | both
- delete_lead: { type, school_id, school_name }
- change_status: { type, school_id, school_name, status }
  statuses → new | meeting_done | converted | active | renewal_meeting | renewed | lost | lost_lead | archived
  IMPORTANT: Do NOT use follow_up as a status — it does NOT exist in the CRM. For follow-up requests, use schedule_followup action instead.
- add_note: { type, school_id, school_name, note }
- convert_lead: { type, school_id, school_name, conversion_amount? }
- send_email: { type, school_id, school_name, email_type, to_email? }
  email_type → introduction | meeting_confirmation | proposal | mou | followup
- raise_ticket: { type, title, description, priority, school_id?, school_name? }
- generate_proposal: { type, school_id, school_name, data: { grade_pricing: [{grade, students, price_per_student}], grades_from?, grades_to?, min_students?, pricing_type?, program_type?, training_type? } }
  IMPORTANT: grades_from/grades_to must be in ordinal form e.g. "1st", "8th". If user says "grade 1-8", set grades_from="1st" grades_to="8th". If single range, set both from and to accordingly.
  DEFAULT GRADES: If no grades mentioned by user, always default to grades_from="Jr. Kg" grades_to="10th" (NOT "All").
  min_students → total students across all grades (integer). pricing_type → "per_student" (default) | "fixed" | "both".
  program_type → "lab_setup" (lab setup / lab kit model) | "per_student" (individual kit model). "individual kit" = per_student. "lab setup" = lab_setup.
  training_type → "student_training" | "teacher_training" | "both" (default: "both")
  ALWAYS include training_type and program_type in the data object. Never omit them.
- generate_mou: { type, school_id, school_name, data: { grade_pricing: [{grade, students, price_per_student}], grades_from?, grades_to?, min_students?, program_start_date?, program_type?, training_type? } }
  Same rules as generate_proposal for grades defaults, program_type and training_type.
- generate_invoice: { type, school_id, school_name, tranche_index?, send_email? }
  tranche_index → 0-based index of payment tranche (default 0, first tranche). Use 1 for second tranche etc.
  send_email → true to also email the invoice to school contacts. Default false.
  Use this when user says "generate invoice", "give invoice", "send invoice", "invoice for tranche X"
- schedule_meeting: { type, school_id, school_name, meeting_date, meeting_time?, meeting_type?, meeting_mode? }
  meeting_date format → YYYY-MM-DD (e.g. "2025-07-18"). meeting_time → "HH:MM" 24h format (e.g. "14:00"). meeting_type → optional label. meeting_mode → "online" | "offline".
  IMPORTANT: Do NOT add change_status unless the user explicitly asks to change the status.
- schedule_followup: { type, school_id, school_name, followup_date, followup_comment? }
  followup_date format → YYYY-MM-DD.
  IMPORTANT: Do NOT add change_status unless the user explicitly asks to change the status.

## CHAINED ACTIONS (create + schedule in one message):
- If user says "add school X and schedule meeting tomorrow at 2 PM", emit create_lead FIRST, then schedule_meeting with school_name matching exactly. The backend will automatically link the new school_id to subsequent actions in the same batch — do NOT worry about school_id for newly created leads.
- For "create renewal meeting for X", emit change_status(renewal_meeting) + schedule_meeting together.
- For "renew X school", emit change_status(renewed) + update_lead if pricing data provided.

## DATE INTERPRETATION RULES (critical for scheduling):
- "tomorrow" → today's date + 1 day, formatted as YYYY-MM-DD
- "next Monday/Tuesday/etc" → next occurrence of that weekday
- "this Friday" → the Friday of the current week
- "2 PM" → "14:00", "3:30 PM" → "15:30", "10 AM" → "10:00"
- If only a time is given for meeting, assume today's date
- If only a date is given, default time to "11:00"

## RESPONSE FORMAT — always return valid JSON, no markdown fences:
{"message": "...", "actions": [...]}

## TONE — short & direct. Use bullet lists for data queries. Never expose raw UUIDs.
"""


# ─────────────────────────────────────────────────────────────────────────────
async def _crm_context() -> str:
    """Return a rich snapshot of all school leads including date fields."""
    from datetime import timedelta
    today = datetime.now(timezone.utc)
    week_start = (today - timedelta(days=today.weekday())).strftime('%Y-%m-%d')
    week_end   = (today - timedelta(days=today.weekday()-6)).strftime('%Y-%m-%d')

    schools = await db.school_inquiries.find(
        {},
        {"_id": 0, "id": 1, "school_name": 1, "status": 1, "city": 1, "board": 1,
         "contact_name": 1, "phone": 1, "email": 1, "source": 1, "lead_value": 1,
         "notes": 1, "meeting_date": 1, "meeting_time": 1, "meeting_type": 1,
         "followup_date": 1, "followup_comment": 1,
         "renewal_meeting_date": 1, "renewal_meeting_time": 1,
         "onboarding_data": 1,
         "updated_at": 1, "created_at": 1}
    ).sort("created_at", -1).limit(150).to_list(length=150)

    header = (
        f"\n\n## Context\n"
        f"- Today: {today.strftime('%A, %d %B %Y')} (IST)\n"
        f"- This week: {week_start} to {week_end} (Mon–Sun)\n"
        f"- Total leads: {len(schools)}\n\n"
        f"## Live CRM Data (latest 150 leads)\n"
    )

    if not schools:
        return header + "No schools found."

    lines = []
    for s in schools:
        parts = [
            f"[{s.get('status','new')}]",
            f"\"{s.get('school_name','')}\"",
            f"(id:{s.get('id','')})",
            f"City:{s.get('city','')}",
            f"Board:{s.get('board','')}",
            f"Contact:{s.get('contact_name','')}",
            f"Phone:{s.get('phone','')}",
            f"Email:{s.get('email','')}"
        ]
        # Include grade pricing summary if already configured
        od = s.get("onboarding_data") or {}
        gp = od.get("grade_pricing") or []
        has_pricing = any(float(g.get("price_per_student") or g.get("price") or 0) > 0 for g in gp) if gp else False
        if has_pricing:
            total_students = sum(int(g.get("students") or 0) for g in gp)
            pricing_summary = ", ".join(
                f"Gr{g.get('grade')}:{g.get('students',0)}stu@₹{g.get('price_per_student') or g.get('price',0)}"
                for g in gp[:4]
            )
            parts.append(f"Pricing:[{pricing_summary}{', ...' if len(gp) > 4 else ''}] TotalStudents:{total_students}")
        # Include payment tranches summary for converted/active schools
        tranches = od.get("payment_tranches") or []
        if tranches and s.get("status") in ("converted", "active", "renewed"):
            tranche_summary = ", ".join(
                f"T{i+1}:₹{int(float(tr.get('amount') or 0)):,}({tr.get('status','pending')})"
                for i, tr in enumerate(tranches[:4])
            )
            parts.append(f"Tranches:[{tranche_summary}{', ...' if len(tranches) > 4 else ''}]")
        if s.get("meeting_date"):
            parts.append(f"MeetingDate:{s['meeting_date']} {s.get('meeting_time','')}")
        if s.get("followup_date"):
            parts.append(f"FollowupDate:{s['followup_date']}")
        if s.get("renewal_meeting_date"):
            parts.append(f"RenewalMeeting:{s['renewal_meeting_date']}")
        if s.get("notes"):
            parts.append(f"Note:{s['notes'][:60]}")
        lines.append(" | ".join(parts))

    return header + "\n".join(f"- {l}" for l in lines)


def _parse_response(raw: str) -> dict:
    """Extract JSON dict from LLM response, stripping any markdown fences."""
    text = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    text = re.sub(r"\s*```\s*$", "", text.strip(), flags=re.MULTILINE)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return {"message": raw, "actions": []}


async def _execute(action: dict, user: dict) -> dict:
    """Execute one CRM action. Returns result dict (merged into action for UI)."""
    t = action.get("type", "")
    sid = action.get("school_id")
    now = datetime.now(timezone.utc).isoformat()

    async def _resolve_school_id(school_id, school_name):
        """Return school_id; if missing, look up by name in DB."""
        if school_id:
            return school_id
        if school_name:
            doc = await db.school_inquiries.find_one(
                {"school_name": {"$regex": re.escape(school_name.strip()), "$options": "i"}},
                {"_id": 0, "id": 1}
            )
            return doc["id"] if doc else None
        return None

    def log(description):
        return {"id": str(uuid.uuid4()), "action": t, "description": description,
                "performed_by": user.get("name", "Admin"), "performed_at": now}

    try:
        # ── CREATE LEAD ──────────────────────────────────────────────
        if t == "create_lead":
            new_id = str(uuid.uuid4())
            await db.school_inquiries.insert_one({
                "id": new_id,
                "school_name": action.get("school_name", ""),
                "city": action.get("city", ""),
                "board": action.get("board", ""),
                "contact_name": action.get("contact_name", ""),
                "phone": action.get("phone", ""),
                "email": action.get("email", ""),
                "source": action.get("source", "AI Chat"),
                "status": "new",
                "notes": action.get("notes", ""),
                "created_at": now,
                "updated_at": now,
                "created_by": user.get("id"),
                "activity_log": [log(f"Lead created via AI Chat by {user.get('name','Admin')}")]
            })
            return {"status": "success", "school_id": new_id,
                    "detail": f"Lead \"{action.get('school_name')}\" created"}

        # ── UPDATE LEAD ──────────────────────────────────────────────
        elif t == "update_lead":
            if not sid:
                return {"status": "error", "detail": "school_id required"}
            raw_fields = action.get("fields", {})

            # Normalize common camelCase → snake_case mistakes by AI
            field_aliases = {
                "TrainingType": "training_type",
                "ProgramType": "program_type",
                "SchoolName": "school_name",
                "ContactName": "contact_name",
                "SkillType": "skill_type",
            }
            raw_fields = {field_aliases.get(k, k): v for k, v in raw_fields.items()}

            fields = {**raw_fields, "updated_at": now}

            # If training_type is being updated, also sync it into onboarding_data
            extra_set = {}
            if "training_type" in raw_fields:
                extra_set["onboarding_data.training_type"] = raw_fields["training_type"]
            if "program_type" in raw_fields:
                extra_set["onboarding_data.program_type"] = raw_fields["program_type"]
            if extra_set:
                fields.update(extra_set)

            res = await db.school_inquiries.update_one(
                {"id": sid},
                {"$set": fields,
                 "$push": {"activity_log": log(f"Fields updated via AI Chat: {', '.join(k for k in raw_fields)}")}}
            )
            if res.matched_count == 0:
                return {"status": "error", "detail": "School not found"}
            return {"status": "success",
                    "detail": f"Updated: {', '.join(k for k in raw_fields)}"}

        # ── DELETE LEAD ──────────────────────────────────────────────
        elif t == "delete_lead":
            if not sid:
                return {"status": "error", "detail": "school_id required"}
            res = await db.school_inquiries.delete_one({"id": sid})
            if res.deleted_count == 0:
                return {"status": "error", "detail": "School not found"}
            return {"status": "success", "detail": "Lead deleted"}

        # ── CHANGE STATUS ────────────────────────────────────────────
        elif t == "change_status":
            if not sid:
                return {"status": "error", "detail": "school_id required"}
            new_status = action.get("status", "")
            VALID_STATUSES = {"new", "meeting_done", "converted", "active", "renewal_meeting", "renewed", "lost", "lost_lead", "archived"}
            if new_status not in VALID_STATUSES:
                return {"status": "error", "detail": f"Invalid status '{new_status}'. Valid values: {', '.join(sorted(VALID_STATUSES))}. For follow-ups use schedule_followup instead."}
            res = await db.school_inquiries.update_one(
                {"id": sid},
                {"$set": {"status": new_status, "updated_at": now},
                 "$push": {"activity_log": log(f"Status changed to '{new_status}' via AI Chat")}}
            )
            if res.matched_count == 0:
                return {"status": "error", "detail": "School not found"}
            return {"status": "success", "detail": f"Status → \"{new_status}\""}

        # ── ADD NOTE ─────────────────────────────────────────────────
        elif t == "add_note":
            if not sid:
                return {"status": "error", "detail": "school_id required"}
            note = action.get("note", "")
            # Append note to both notes field and activity log
            res = await db.school_inquiries.update_one(
                {"id": sid},
                {"$set": {"notes": note, "updated_at": now},
                 "$push": {"activity_log": log(f"Note added via AI Chat: {note[:80]}")}}
            )
            if res.matched_count == 0:
                return {"status": "error", "detail": "School not found"}
            return {"status": "success", "detail": "Note saved"}

        # ── CONVERT LEAD ─────────────────────────────────────────────
        elif t == "convert_lead":
            if not sid:
                return {"status": "error", "detail": "school_id required"}
            upd = {"status": "converted", "updated_at": now}
            if action.get("conversion_amount"):
                try:
                    upd["lead_value"] = float(
                        str(action["conversion_amount"]).replace(",", "").replace("₹", "").strip()
                    )
                except ValueError:
                    pass
            res = await db.school_inquiries.update_one(
                {"id": sid},
                {"$set": upd,
                 "$push": {"activity_log": log("Lead converted to customer via AI Chat")}}
            )
            if res.matched_count == 0:
                return {"status": "error", "detail": "School not found"}
            return {"status": "success", "detail": "Marked as converted customer"}

        # ── SEND EMAIL ───────────────────────────────────────────────
        elif t == "send_email":
            if not sid:
                return {"status": "error", "detail": "school_id required"}
            email_type = action.get("email_type", "introduction")
            to_email = action.get("to_email")

            # For proposal/MOU emails, signal frontend to generate and attach PDF
            if email_type in ("proposal", "mou"):
                school = await db.school_inquiries.find_one({"id": sid}, {"_id": 0})
                to_email = to_email or (school.get("email") if school else None)
                return {
                    "status": "pending_pdf_send",
                    "email_type": email_type,
                    "school_id": sid,
                    "school_name": action.get("school_name") or (school.get("school_name") if school else ""),
                    "to_email": to_email,
                    "detail": f"{'Proposal' if email_type == 'proposal' else 'MOU'} PDF will be generated & emailed by your browser",
                }

            # All other email types — send directly from backend
            from server import send_crm_email_for_school
            email_data = {"email_type": email_type, "to_email": to_email}
            try:
                result = await send_crm_email_for_school(sid, email_data, user)
                return {"status": "success", "detail": result.get("message", "Email sent")}
            except HTTPException as e:
                return {"status": "error", "detail": e.detail}
            except Exception as e:
                return {"status": "error", "detail": str(e)}

        # ── RAISE TICKET ─────────────────────────────────────────────
        elif t == "raise_ticket":
            ticket_id = str(uuid.uuid4())

            # Enrich with school contact info if school is referenced
            school = None
            if action.get("school_id"):
                school = await db.school_inquiries.find_one({"id": action["school_id"]}, {"_id": 0})
            elif action.get("school_name"):
                school = await db.school_inquiries.find_one(
                    {"school_name": {"$regex": re.escape(action.get("school_name","").strip()), "$options": "i"}},
                    {"_id": 0}
                )

            contact_name  = (school.get("contact_name") or school.get("school_name") or "") if school else action.get("school_name", "")
            contact_phone = school.get("phone", "") if school else ""
            contact_email = school.get("email", "") if school else ""

            query_doc = {
                "id":              ticket_id,
                "name":            contact_name,
                "phone":           contact_phone,
                "email":           contact_email,
                "query_type":      "other",
                "related_to":      "",
                "inquiry_type":    "school" if school else "other",
                "message":         action.get("description", ""),
                "query_details":   action.get("description", ""),
                "subject":         action.get("title", "Support Request"),
                "priority":        action.get("priority", "medium"),
                "status":          "open",
                "source":          "ai_chat",
                "school_id":       school.get("id") if school else action.get("school_id"),
                "school_name":     school.get("school_name") if school else action.get("school_name", ""),
                "created_by":      user.get("id"),
                "created_by_name": user.get("name", "Admin"),
                "viewers":         [],
                "comments":        [],
                "assigned_to":     school.get("assigned_to") if school else None,
                "created_at":      now,
                "updated_at":      now,
            }
            await db.support_queries.insert_one(query_doc)
            return {"status": "success",
                    "detail": f"Ticket raised: \"{action.get('title', 'Support Request')}\"",
                    "ticket_id": ticket_id}

        # ── SCHEDULE MEETING ─────────────────────────────────────────
        elif t == "schedule_meeting":
            sid = await _resolve_school_id(sid, action.get("school_name"))
            if not sid:
                return {"status": "error", "detail": "school_id required (school not found by name either)"}
            fields = {"updated_at": now, "meeting_scheduled": True}
            if action.get("meeting_date"):
                fields["meeting_date"] = action["meeting_date"]
            if action.get("meeting_time"):
                fields["meeting_time"] = action["meeting_time"]
            if action.get("meeting_type"):
                fields["meeting_type"] = action["meeting_type"]
            if action.get("meeting_mode"):
                fields["meeting_mode"] = action["meeting_mode"]
            # Reset reminder flags so new reminders can fire
            fields["reminder_24h_sent"] = False
            fields["reminder_2h_sent"] = False
            fields["reminder_1h_sent"] = False
            detail = f"Meeting scheduled on {action.get('meeting_date', '?')} at {action.get('meeting_time', 'TBD')}"
            res = await db.school_inquiries.update_one(
                {"id": sid},
                {"$set": fields,
                 "$push": {"activity_log": log(detail + " via AI Chat")}}
            )
            if res.matched_count == 0:
                return {"status": "error", "detail": "School not found"}
            return {"status": "success", "detail": detail}

        # ── SCHEDULE FOLLOW-UP ───────────────────────────────────────
        elif t == "schedule_followup":
            sid = await _resolve_school_id(sid, action.get("school_name"))
            if not sid:
                return {"status": "error", "detail": "school_id required (school not found by name either)"}
            fields = {"updated_at": now}
            if action.get("followup_date"):
                fields["followup_date"] = action["followup_date"]
            if action.get("followup_comment"):
                fields["followup_comment"] = action["followup_comment"]
            detail = f"Follow-up scheduled on {action.get('followup_date', '?')}"
            if action.get("followup_comment"):
                detail += f" — {action['followup_comment']}"
            res = await db.school_inquiries.update_one(
                {"id": sid},
                {"$set": fields,
                 "$push": {"activity_log": log(detail + " via AI Chat")}}
            )
            if res.matched_count == 0:
                return {"status": "error", "detail": "School not found"}
            return {"status": "success", "detail": detail}

        # ── GENERATE PROPOSAL — save data to DB, then trigger frontend PDF ──
        elif t == "generate_proposal":
            sid = await _resolve_school_id(sid, action.get("school_name"))
            proposal_raw = action.get("data") or {}
            ai_grade_pricing = proposal_raw.get("grade_pricing", [])

            if sid:
                # Always fetch existing school data first
                existing = await db.school_inquiries.find_one({"id": sid}, {"_id": 0, "onboarding_data": 1})
                merged_onboard = dict(existing.get("onboarding_data") or {})

                # Protect existing grade_pricing: only use AI-provided pricing if no pricing exists yet
                existing_gp = merged_onboard.get("grade_pricing") or []
                has_real_pricing = any(
                    float(g.get("price_per_student") or g.get("price") or 0) > 0
                    for g in existing_gp
                ) if existing_gp else False

                if has_real_pricing:
                    # Use the school's already-configured pricing — don't overwrite
                    grade_pricing = existing_gp
                else:
                    # No existing pricing — use what AI provided (may be defaults)
                    grade_pricing = ai_grade_pricing

                # Default grades to Jr. Kg – 10th when not specified or only "All"
                all_grade_labels = [str(g.get("grade","")).strip().lower() for g in grade_pricing]
                is_default_all = (not grade_pricing) or (all_grade_labels == ["all"])

                if grade_pricing:
                    def _ordinal(n):
                        try:
                            i = int(str(n).strip().split("-")[0])
                            sfx = "th" if 11 <= i % 100 <= 13 else {1:"st",2:"nd",3:"rd"}.get(i%10,"th")
                            return f"{i}{sfx}"
                        except Exception:
                            return str(n)

                    all_grades = [str(g.get("grade","")).strip() for g in grade_pricing if g.get("grade")]

                    if is_default_all:
                        grades_from = proposal_raw.get("grades_from") or "Jr. Kg"
                        grades_to   = proposal_raw.get("grades_to")   or "10th"
                        # Replace "All" grade label with proper range in the fee table
                        price_per_student = grade_pricing[0].get("price_per_student", 500) if grade_pricing else 500
                        students = grade_pricing[0].get("students", 500) if grade_pricing else 500
                        grade_pricing = [{"grade": "Jr. Kg - 10th", "students": students, "price_per_student": price_per_student}]
                    else:
                        grades_from = proposal_raw.get("grades_from") or (_ordinal(all_grades[0]) if all_grades else "Jr. Kg")
                        grades_to   = proposal_raw.get("grades_to")   or (_ordinal(all_grades[-1]) if all_grades else "10th")

                    min_students = proposal_raw.get("min_students") or sum(int(g.get("students",0) or 0) for g in grade_pricing) or 800

                    # Extract training type and program type from AI data
                    training_type = proposal_raw.get("training_type") or merged_onboard.get("training_type") or "both"
                    program_type  = proposal_raw.get("program_type")  or merged_onboard.get("program_type")  or "lab_setup"

                    proposal_data = {
                        "grade_pricing":   grade_pricing,
                        "grades_from":     grades_from,
                        "grades_to":       grades_to,
                        "min_students":    min_students,
                        "pricing_type":    proposal_raw.get("pricing_type", "per_student"),
                        "program_type":    program_type,
                        "training_type":   training_type,
                        "updated_via_ai":  True,
                    }

                    # Update onboarding_data with training_type, program_type, and grades
                    if not has_real_pricing:
                        merged_onboard["grade_pricing"] = grade_pricing
                    # Always sync these fields to onboarding_data so Edit popup picks them up
                    merged_onboard["training_type"] = training_type
                    merged_onboard["program_type"]  = program_type
                    merged_onboard["grades_from"]   = grades_from
                    merged_onboard["grades_to"]     = grades_to

                    await db.school_inquiries.update_one(
                        {"id": sid},
                        {"$set": {
                            "proposal_data":  proposal_data,
                            "onboarding_data": merged_onboard,
                            "training_type":   training_type,
                            "updated_at": now,
                        },
                        "$push": {"activity_log": log(f"Proposal data saved via AI: {grades_from} to {grades_to}, {len(grade_pricing)} grade(s), training={training_type}, program={program_type}, existing_pricing_preserved={has_real_pricing}")}}
                    )
            else:
                proposal_data = {}

            return {"status": "frontend_action",
                    "detail": f"Proposal data saved. PDF will be generated in your browser.",
                    "school_id": sid,
                    "proposal_data": proposal_data if sid else {}}

        # ── GENERATE MOU — save data to DB, then trigger frontend PDF ────
        elif t == "generate_mou":
            sid = await _resolve_school_id(sid, action.get("school_name"))
            mou_raw = action.get("data") or {}
            ai_grade_pricing = mou_raw.get("grade_pricing", [])

            if sid:
                # Always fetch existing school data first
                existing = await db.school_inquiries.find_one({"id": sid}, {"_id": 0, "onboarding_data": 1})
                merged = dict(existing.get("onboarding_data") or {})

                # Protect existing grade_pricing: only use AI-provided pricing if no pricing exists yet
                existing_gp = merged.get("grade_pricing") or []
                has_real_pricing = any(
                    float(g.get("price_per_student") or g.get("price") or 0) > 0
                    for g in existing_gp
                ) if existing_gp else False

                if has_real_pricing:
                    grade_pricing = existing_gp
                else:
                    grade_pricing = ai_grade_pricing

                if grade_pricing:
                    def _ordinal(n):
                        try:
                            i = int(str(n).strip().split("-")[0])
                            sfx = "th" if 11 <= i % 100 <= 13 else {1:"st",2:"nd",3:"rd"}.get(i%10,"th")
                            return f"{i}{sfx}"
                        except Exception:
                            return str(n)

                    all_grades = [str(g.get("grade","")).strip() for g in grade_pricing if g.get("grade")]
                    all_grade_labels_mou = [str(g.get("grade","")).strip().lower() for g in grade_pricing]
                    is_default_all_mou = (all_grade_labels_mou == ["all"])

                    if is_default_all_mou:
                        grades_from = mou_raw.get("grades_from") or "Jr. Kg"
                        grades_to   = mou_raw.get("grades_to")   or "10th"
                        price_per_student_mou = grade_pricing[0].get("price_per_student", 500) if grade_pricing else 500
                        students_mou = grade_pricing[0].get("students", 500) if grade_pricing else 500
                        grade_pricing = [{"grade": "Jr. Kg - 10th", "students": students_mou, "price_per_student": price_per_student_mou}]
                    else:
                        grades_from = mou_raw.get("grades_from") or (_ordinal(all_grades[0]) if all_grades else "Jr. Kg")
                        grades_to   = mou_raw.get("grades_to")   or (_ordinal(all_grades[-1]) if all_grades else "10th")

                    min_students = mou_raw.get("min_students") or sum(int(g.get("students",0) or 0) for g in grade_pricing) or 800

                    training_type_mou = mou_raw.get("training_type") or merged.get("training_type") or "both"
                    program_type_mou  = mou_raw.get("program_type")  or merged.get("program_type")  or "lab_setup"

                    merged.update({
                        "grades_from":        grades_from,
                        "grades_to":          grades_to,
                        "min_students":       min_students,
                        "pricing_type":       mou_raw.get("pricing_type", "per_student"),
                        "program_type":       program_type_mou,
                        "training_type":      training_type_mou,
                        "program_start_date": mou_raw.get("program_start_date", ""),
                        "updated_via_ai":     True,
                    })
                    # Only write grade_pricing back if we're NOT overwriting existing data
                    if not has_real_pricing:
                        merged["grade_pricing"] = grade_pricing

                    await db.school_inquiries.update_one(
                        {"id": sid},
                        {"$set": {
                            "onboarding_data": merged,
                            "updated_at": now,
                        },
                        "$push": {"activity_log": log(f"MOU data saved via AI: {grades_from} to {grades_to}, {len(grade_pricing)} grade(s), existing_pricing_preserved={has_real_pricing}")}}
                    )
            return {"status": "frontend_action",
                    "detail": "MOU data saved. PDF will be generated in your browser.",
                    "school_id": sid}

        # ── GENERATE INVOICE — return payment data for frontend to generate with same Orders PDF ──
        elif t == "generate_invoice":
            sid = await _resolve_school_id(sid, action.get("school_name"))
            if not sid:
                return {"status": "error", "detail": "Could not find school"}

            school = await db.school_inquiries.find_one({"id": sid}, {"_id": 0})
            if not school:
                return {"status": "error", "detail": "School not found"}

            od = school.get("onboarding_data") or {}
            tranches = od.get("payment_tranches") or []
            tranche_index = int(action.get("tranche_index") or 0)
            send_email = bool(action.get("send_email", False))

            if not tranches:
                return {"status": "error", "detail": f"{school.get('school_name')} has no payment tranches configured"}
            if tranche_index >= len(tranches):
                tranche_index = 0  # fallback to first tranche

            tranche = tranches[tranche_index]
            school_name = school.get("school_name", "School")

            # Build the payment-like object the frontend invoice generator expects
            payment_id = f"pay-{sid}-{tranche_index}"
            payment = {
                "id": payment_id,
                "school_id": sid,
                "school_name": school_name,
                "tranche_index": tranche_index,
                "tranche_info": f"Tranche {tranche_index + 1}" + (f" ({tranche.get('percentage')}%)" if tranche.get("percentage") else ""),
                "amount": float(tranche.get("amount") or 0),
                "due_date": tranche.get("date") or None,
                "status": tranche.get("status", "pending"),
                "gst_type": tranche.get("gst_type") or od.get("gst_type") or "exclusive_18",
                "notes": tranche.get("notes", ""),
            }

            await db.school_inquiries.update_one(
                {"id": sid},
                {"$push": {"activity_log": log(f"Invoice generation triggered via AI Chat for Tranche {tranche_index + 1}")}}
            )

            return {
                "status": "frontend_action",
                "detail": f"Invoice ready for {school_name}, Tranche {tranche_index + 1}",
                "school_id": sid,
                "school_name": school_name,
                "payment": payment,
                "send_email": send_email,
            }

        else:
            return {"status": "skipped", "detail": f"Unknown action: {t}"}

    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ai-chat/message")
async def chat_message(payload: dict, user: dict = Depends(get_current_user)):
    from anthropic import AsyncAnthropic
    from config import ANTHROPIC_API_KEY

    session_id = payload.get("session_id") or str(uuid.uuid4())
    user_text = (payload.get("message") or "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # ── Pronoun resolution: inject last-mentioned school into message ──────
    # When user says "this", "it", "the same", "for this one" etc., look up
    # the most recently mentioned school from session history and prepend context.
    PRONOUN_PATTERNS = re.compile(
        r'\b(this|it|the same|that school|for this|same school|this one|the lead|this lead|this school|same one)\b',
        re.IGNORECASE
    )
    enriched_text = user_text
    if PRONOUN_PATTERNS.search(user_text):
        session_doc = await db.ai_chat_sessions.find_one(
            {"session_id": session_id}, {"_id": 0, "messages": 1}
        )
        messages_hist = (session_doc or {}).get("messages", [])

        # Fetch all known school names for content-matching
        known_schools = await db.school_inquiries.find(
            {}, {"_id": 0, "school_name": 1}
        ).to_list(200)
        known_names = [s.get("school_name", "") for s in known_schools if s.get("school_name")]

        last_school = None
        for msg in reversed(messages_hist[-20:]):
            content = msg.get("content", "")

            # 1. Check action cards (most reliable — AI explicitly named the school)
            for action in (msg.get("actions") or []):
                sn = action.get("school_name")
                if sn:
                    last_school = sn
                    break
            if last_school:
                break

            # 2. Match against known CRM school names in message content
            for school_name in known_names:
                if school_name and school_name.lower() in content.lower():
                    last_school = school_name
                    break
            if last_school:
                break

        if last_school:
            enriched_text = f'[Context: the user is referring to "{last_school}" based on conversation history]\n{user_text}'

    # Build system prompt with live CRM data
    crm_ctx = await _crm_context()
    system = AI_SYSTEM_PROMPT + crm_ctx

    # LLM call
    client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    # Build message history from session for multi-turn context
    session_doc = await db.ai_chat_sessions.find_one(
        {"session_id": session_id}, {"_id": 0, "messages": 1}
    )
    history_msgs = []
    for msg in (session_doc or {}).get("messages", [])[-20:]:
        role = "user" if msg.get("role") == "user" else "assistant"
        history_msgs.append({"role": role, "content": msg.get("content", "")})
    history_msgs.append({"role": "user", "content": enriched_text})

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system,
        messages=history_msgs,
    )
    raw = response.content[0].text

    # Parse response
    parsed = _parse_response(raw)
    message = parsed.get("message", raw)
    actions = parsed.get("actions", [])

    # Execute backend actions, chaining school_id from create_lead to subsequent actions
    results = []
    created_ids: dict = {}  # school_name.lower() → school_id, for newly created leads
    for action in actions:
        # Inject school_id for actions following a create_lead in the same batch
        if not action.get("school_id") and action.get("school_name"):
            name_key = action["school_name"].lower().strip()
            if name_key in created_ids:
                action = {**action, "school_id": created_ids[name_key]}

        exec_result = await _execute(action, user)
        results.append({**action, "execution": exec_result})

        # Track newly created school IDs so later actions in this batch can use them
        if action.get("type") == "create_lead" and exec_result.get("status") == "success":
            name_key = action.get("school_name", "").lower().strip()
            if name_key and exec_result.get("school_id"):
                created_ids[name_key] = exec_result["school_id"]

    # Save to DB for UI history (save original user_text, not enriched)
    now = datetime.now(timezone.utc).isoformat()
    await db.ai_chat_sessions.update_one(
        {"session_id": session_id},
        {"$push": {"messages": {"$each": [
            {"id": str(uuid.uuid4()), "role": "user", "content": user_text, "timestamp": now},
            {"id": str(uuid.uuid4()), "role": "assistant", "content": message,
             "actions": results, "timestamp": now}
        ]}},
         "$set": {"updated_at": now, "user_id": user.get("id"), "session_id": session_id}},
        upsert=True
    )

    return {"session_id": session_id, "message": message, "actions": results}


@router.get("/ai-chat/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    sessions = await db.ai_chat_sessions.find(
        {"user_id": user.get("id")},
        {"_id": 0, "session_id": 1, "updated_at": 1, "messages": {"$slice": -1}}
    ).sort("updated_at", -1).limit(30).to_list(length=30)
    return {"sessions": sessions}


@router.get("/ai-chat/history/{session_id}")
async def get_history(session_id: str, user: dict = Depends(get_current_user)):
    doc = await db.ai_chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    return {"messages": doc.get("messages", []) if doc else []}


@router.delete("/ai-chat/session/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    await db.ai_chat_sessions.delete_one({"session_id": session_id})
    return {"success": True}
