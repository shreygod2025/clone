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
from routes.shared import get_next_ticket_number
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
13. **IMAGE INPUTS — CLASSIFY ONCE, EMIT ONE ACTION** — When the user attaches images (business cards, WhatsApp screenshots, enquiry forms, event invites, receipts, demo-request slips, visiting cards, emails):
    - Read EVERY visible detail: names, phone numbers, emails, school/organisation names, cities, boards (ICSE/CBSE/state), designations, dates, amounts, follow-up asks, demo preferences, grade bands, student counts.
    - **STEP 1 — CLASSIFY the image into exactly ONE primary intent (never multiple):**
       • `lead`     — contact details for a NEW school/person we don't yet have (visiting card, business card, enquiry form, registration slip, demo-booking screenshot, inbound WhatsApp intro).  → emit ONE `create_lead` only.
       • `ticket`   — a complaint, grievance, problem report, "not working", "can't register", "QR not scanning", "payment failed", "please help", "need help", complaints forwarded by someone, support screenshot where the sender is asking us to RESOLVE something, or ANY user instruction containing the Indian support word **"query"** ("add query", "raise query", "log a query", "create a query", "add this as a query", "support query") — in Indian CRM parlance a "query" IS a support ticket.  → emit ONE `raise_ticket` only. Never say "query added to ticket #TECH-xxx" without emitting `raise_ticket` — the ticket ID is assigned by the backend after you emit the action, you must never invent one.
       • `task`     — a to-do, action-item, reminder, meeting invite, event invite, calendar screenshot, internal MoM, "please follow up on", "need to do".  → emit ONE `create_task` only.
       • `note`     — receipt / payment proof / UTR screenshot / invoice snippet for a KNOWN school → emit ONE `add_note` on the matching school.
       • `followup` — a "please call me back", "follow up on <date>" screenshot for a KNOWN school → emit ONE `schedule_followup` on the matching school.
    - **STEP 2 — EMIT that single action** with every field you can extract. Do NOT also emit a lead + a task + a ticket. Pick ONE.
    - **STEP 3 — EXCEPTION: multiple contacts in one image** (e.g. a photo of 3 business cards side-by-side, or a group WhatsApp list with 5 people). ONLY in that case emit multiple `create_lead` actions — one per person. Still never mix action types.
    - **STEP 4 — WRITE A SHORT HUMAN MESSAGE** confirming what you did. ONE sentence like `"Created lead for Greenfield International School (Saravanan Shekar, +91 80970 77709)."` or `"Raised ticket for Gokul Public School — QR code registration issue."`. The UI auto-renders the action chip; do NOT paste an "ACTIONS COMPLETED" block, a numbered list, or a "QUERY ADDED TO TICKET #TECH-xxx" block.
    - **DISAMBIGUATION** — If a WhatsApp screenshot has both contact info AND a problem description (e.g. "I'm Priya from Delhi School, my registration QR is broken"), the primary intent is `ticket` because they are asking us to RESOLVE something. If the message is purely introductory ("I'm Priya from Delhi School, we're interested in the robotics program"), the primary intent is `lead`.
    - **USER REFINEMENT OVERRIDES YOUR CLASSIFICATION** — If a prior turn uploaded an image and this turn says "raise ticket" / "add query" / "log a query" / "create a query" / "make this a ticket", you MUST emit `raise_ticket` with details from the (replayed) image. If it says "make it a lead" / "add as lead", emit `create_lead`. If "make it a task", emit `create_task`. Treat the current turn's text as the final classifier override.
    - If the image is genuinely unreadable (blurry, no text), say so plainly and ask for a clearer upload — this is the ONLY case where asking is OK.

## FORBIDDEN MESSAGE PATTERNS (never write these in the `message` field)
- `✅ ACTIONS COMPLETED:` headers or lists
- `1. Created Lead ... 2. Raised Ticket ... 3. Created Task` numbered action logs
- `✅ **TICKET RAISED** #TECH-002` or `**LEAD CREATED** #L-xxx` receipt-style blocks
- Any claim like "I have created / raised / scheduled" that is NOT backed by a matching entry in the `actions` array
- **ANY raw JSON code block** inside the message (```json {"action": "raise_ticket" ...} ``` is FORBIDDEN — JSON lives ONLY in the top-level `actions` array)
- Phrases like "I can emit the action payload", "I'll emit the action", "action payload you asked for", "pending missing fields" — if you have enough info, just emit the action; if you don't, ask ONE short question instead
- "I don't currently have the attached image" / "image not available in this chat" — the backend AUTOMATICALLY replays the admin's most recently uploaded image on every follow-up turn, so if a prior turn had an image, THIS turn has it too. Re-read it and act. Never claim the image is missing when a prior turn uploaded one.

If you did not emit a `create_lead` action, you MUST NOT say "Created lead". The UI only trusts the `actions` array — writing it in text without emitting the action means the admin sees "done" while nothing was actually done. This is a critical bug. If the right action is unclear, ask ONE short question instead.

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
- convert_lead: { type, school_id, school_name, conversion_amount?, gst_type?, state?, payment_tranches? }
  conversion_amount → total deal value in ₹ (number, no commas/symbols)
  gst_type → "inclusive_18" | "exclusive_18" | "book_gst_0" (default: "exclusive_18")
  state → Indian state name e.g. "Haryana", "Maharashtra". Required for correct IGST vs CGST/SGST on invoices.
  payment_tranches → array of tranche objects: [{ percentage: 100, date: "YYYY-MM-DD", notes?: "" }]
    - percentages must sum to 100. Use "YYYY-MM-DD" for dates. "11 april" → "2026-04-11"
    - e.g. single payment: [{ percentage: 100, date: "2026-04-11" }]
    - e.g. two tranches: [{ percentage: 50, date: "2026-04-11" }, { percentage: 50, date: "2026-05-01" }]
  IMPORTANT: ALWAYS provide gst_type, state, and payment_tranches when converting a lead. Without payment_tranches, invoices CANNOT be generated.
  EXAMPLE: user says "mark X as converted, Haryana, GST inclusive, 100% by 11 april" →
    { type: "convert_lead", school_id: "...", school_name: "X", gst_type: "inclusive_18", state: "Haryana", payment_tranches: [{ percentage: 100, date: "2026-04-11" }] }
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

## MY SPACE — TASKS & PROJECTS (admin-only actions)
Tasks and Projects are shown at the bottom of the context (Team members / Projects / Open tasks lists) with real ids.
When the user talks about "task", "todo", "assignment", "project", "board", "sprint", "reminder", "assign", "ping",
"remind", "nudge", or refers to an item by title/code, use these actions:

- create_task: { type, title, description?, assigned_to?, assigned_to_name?, priority?, due_date?, project_id?, project_name?, tags?, notify_whatsapp? }
    priority → "low" | "medium" | "high"    (default "medium")
    due_date → "YYYY-MM-DD"                 ("tomorrow", "next Friday" → resolve BEFORE emitting)
    assigned_to → user id from the Team-members list. If user names someone ("assign to Priya"), pick the id from the Team-members list.
      If no assignee given, assign to the current admin (leave assigned_to blank; backend will default to self).
    project_id / project_name → optional. If user says "in the Website project", match project_name against the Projects list.
    notify_whatsapp → default true (fires the AiSensy "New Task" campaign to the assignee automatically).
- update_task: { type, task_id, task_title?, fields: {} }
    fields may contain: title, description, status, priority, due_date, project_id, tags.
    status values: pending | in_progress | in_review | done | rejected | cancelled
- delete_task: { type, task_id, task_title? }
- assign_task: { type, task_id, task_title?, assigned_to?, assigned_to_name? }
    Use for reassignments. Backend fires the "task_reassigned" WhatsApp.
- remind_task: { type, task_id, task_title?, reminder_text? }
    Fires a WhatsApp nudge + in-app notification to the current assignee immediately.
    reminder_text is optional freeform ("gentle reminder — this is due today").
- create_project: { type, name, description?, color?, member_names?, member_ids?, end_date?, status? }
- update_project: { type, project_id, project_name?, fields: {} }
- delete_project: { type, project_id, project_name? }

## TASK/PROJECT SHORT-CIRCUITS
- "remind X to close their tasks" or "ping X" → for every open task where assigned_to matches X, emit one remind_task per task.
- "give this task to X" / "reassign task Y to X" → emit assign_task with X's id.
- "close task Y" / "mark task Y done" → emit update_task with fields.status = "done".
- "delete all my done tasks" → emit multiple delete_task actions. Do it.
- Use task IDs (id:...) from the Open-tasks list. Never invent an id. If the user's title doesn't match any open task, ask ONE clarifying question with the closest 2-3 titles.

## MINUTES OF MEETING → BULK TASK CREATION (CRITICAL)
When the user pastes Minutes of Meeting (MoM) text — recognisable by patterns like "MoM", "minutes of meeting", "action items", "action points", "To-do", "Assignee", "Deadline", "By when", "Owner", "PIC" or a bulleted / numbered list of what different people will do — you MUST:

1. **CREATE ALL TASKS IMMEDIATELY** in the same response — emit one `create_task` action per action item. Do NOT ask "should I create these?" first. Just create them.

2. **For each action item, extract:**
   - `title` — the action itself, concise (≤ 12 words). Strip fluff like "action item:", "todo:", bullet markers.
   - `description` — the fuller sentence + any context (e.g. discussion notes leading to the task).
   - `assigned_to` / `assigned_to_name` — match against the Team-members list. Accept first names, last names, short forms. If user writes "@priya", "Priya to send", "Owner: Priya" — match "Priya" against the team list. If NO match found in team → leave `assigned_to` blank AND note the raw owner name in `description`.
   - `due_date` — parse phrases like "by Friday", "by 15 Feb", "next Monday", "EOD", "end of week", "in 3 days", "before month end". Format YYYY-MM-DD.
   - `priority` — "high" if words like "urgent", "critical", "asap", "blocker", "P0" appear; "low" if "when free", "nice to have", "optional", "P2"; else "medium".

3. **AFTER emitting the create_task actions**, the `message` field MUST:
   - State "Created N task(s) from your MoM." (with the actual count).
   - Then, if ANY tasks are missing owner / due date / priority, list them like this so the user can fill them in with a follow-up message:
     ```
     A few tasks need details — reply with the missing bits and I'll update them:
     1. "<task title>" — needs: owner, due date
     2. "<task title>" — needs: owner
     3. "<task title>" — needs: due date, priority
     ```
   - If everything is filled, just confirm "All tasks have owners and due dates."
   - Do NOT block on missing fields. The tasks are ALREADY created — the follow-up is optional.

4. **When the user replies with the missing details** (e.g. "1 → Ankit, Friday; 2 → Priya"), emit `update_task` actions for the ones referenced by number, title, or context. Match against the tasks you just created — their titles will be in the Open-tasks list on the next turn.

5. **MoM examples the model should handle:**
   - `"MoM Feb 4: Priya to prepare pitch deck by Fri. Ankit — send GST invoices (high). Need to fix login bug ASAP."` → 3 create_task actions. Task 3 has no owner → flag in message.
   - `"1. Rohit → follow up with Bombay school 2. Send email to Shalini's team 3. Book venue for Feb 20"` → 3 create_task; task 2 & 3 have no explicit owner → flag both.

6. This flow is enabled ONLY for MoM-style input. Regular "create a task to X" one-liners still work exactly as before.

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


async def _tasks_projects_context() -> str:
    """Compact snapshot of open tasks, projects and team members for the AI.

    Injected alongside _crm_context so the assistant can add / edit /
    delete / assign / remind on tasks & projects without asking who
    someone is or which task they meant.
    """
    from datetime import timedelta
    today = datetime.now(timezone.utc)
    today_str = today.strftime('%Y-%m-%d')

    # Team members (assignable) — team_users + admins with name + role + id.
    team_users = await db.team_users.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "department": 1}
    ).limit(200).to_list(length=200)
    admins = await db.admins.find(
        {}, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
    ).limit(50).to_list(length=50)
    people = [{"id": u["id"], "name": u.get("name") or u.get("email"),
               "role": u.get("role") or u.get("department") or "team"} for u in team_users if u.get("id")]
    people += [{"id": a["id"], "name": a.get("name") or a.get("email"),
                "role": a.get("role") or "admin"} for a in admins if a.get("id")]

    # Projects
    projects = await db.projects.find(
        {"status": {"$ne": "archived"}},
        {"_id": 0, "id": 1, "name": 1, "status": 1, "lead_id": 1, "end_date": 1}
    ).sort("created_at", -1).limit(80).to_list(length=80)

    # Open + due-soon tasks
    tasks = await db.tasks.find(
        {"status": {"$nin": ["done", "cancelled", "rejected"]}},
        {"_id": 0, "id": 1, "code": 1, "title": 1, "status": 1, "priority": 1,
         "assigned_to": 1, "due_date": 1, "project_id": 1, "created_at": 1}
    ).sort("due_date", 1).limit(120).to_list(length=120)

    lines = []
    lines.append(f"\n\n## Team members (assignable — use id when creating tasks)")
    for p in people[:80]:
        lines.append(f"- {p['name']} ({p['role']}) id:{p['id']}")
    if len(people) > 80:
        lines.append(f"- …and {len(people)-80} more")

    lines.append(f"\n## Projects (My Space)")
    if not projects:
        lines.append("- (no projects)")
    for p in projects:
        end = p.get("end_date") or ""
        lines.append(f"- \"{p.get('name','')}\" [{p.get('status','')}]{' due '+end if end else ''} id:{p.get('id','')}")

    lines.append(f"\n## Open tasks (My Space) — sorted by due date")
    if not tasks:
        lines.append("- (no open tasks)")
    for t in tasks:
        due = t.get("due_date") or ""
        overdue = " OVERDUE" if (due and due < today_str) else ""
        assignee_name = next((p["name"] for p in people if p["id"] == t.get("assigned_to")), t.get("assigned_to","")[:8])
        proj_name = next((pr.get("name","") for pr in projects if pr.get("id") == t.get("project_id")), "")
        code = t.get("code") or ""
        line_parts = [f"[{t.get('status','')}]", f"[{(t.get('priority') or 'medium').upper()}]",
                      f"\"{t.get('title','')}\""]
        if code: line_parts.append(f"code:{code}")
        line_parts.append(f"id:{t.get('id','')}")
        if assignee_name: line_parts.append(f"→ {assignee_name}")
        if proj_name: line_parts.append(f"proj:{proj_name}")
        if due: line_parts.append(f"due:{due}{overdue}")
        lines.append("- " + " ".join(line_parts))

    return "\n".join(lines)


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


async def _resolve_team_user_id(name_or_id: str) -> str | None:
    """Given a fuzzy name (e.g. "Priya", "priya sharma") OR an id, return the
    matching team_users.id or admins.id. None if no match."""
    if not name_or_id:
        return None
    v = name_or_id.strip()
    # id match first
    for coll in (db.team_users, db.admins):
        doc = await coll.find_one({"id": v}, {"_id": 0, "id": 1})
        if doc:
            return doc["id"]
    # name / email fuzzy
    esc = re.escape(v)
    q = {"$or": [
        {"name":  {"$regex": esc, "$options": "i"}},
        {"email": {"$regex": esc, "$options": "i"}},
    ]}
    for coll in (db.team_users, db.admins):
        doc = await coll.find_one(q, {"_id": 0, "id": 1})
        if doc:
            return doc["id"]
    return None


async def _resolve_project_id(project_id: str | None, project_name: str | None) -> str | None:
    if project_id:
        return project_id
    if not project_name:
        return None
    doc = await db.projects.find_one(
        {"name": {"$regex": re.escape(project_name.strip()), "$options": "i"}},
        {"_id": 0, "id": 1},
    )
    return doc["id"] if doc else None


async def _resolve_task_id(task_id: str | None, task_title: str | None) -> str | None:
    if task_id:
        return task_id
    if not task_title:
        return None
    # try code match first (e.g. "TASK-000123")
    if re.match(r"^TASK-\d+$", task_title.strip(), re.IGNORECASE):
        doc = await db.tasks.find_one({"code": task_title.strip().upper()}, {"_id": 0, "id": 1})
        if doc:
            return doc["id"]
    doc = await db.tasks.find_one(
        {"title": {"$regex": re.escape(task_title.strip()), "$options": "i"}},
        {"_id": 0, "id": 1},
    )
    return doc["id"] if doc else None


async def _execute_tasks_projects(action: dict, user: dict, log, now: str):
    """Handle create/update/delete/assign/remind on Tasks and CRUD on Projects.

    Returns a result dict, or None if the action type isn't a tasks/projects
    action (so `_execute` falls back to its "Unknown action" branch)."""
    t = action.get("type", "")
    uid = user.get("id") or user.get("user_id") or ""

    # ── CREATE TASK ──────────────────────────────────────────────
    if t == "create_task":
        assignee = await _resolve_team_user_id(action.get("assigned_to") or action.get("assigned_to_name") or "")
        assignee = assignee or uid  # fallback: assign to self
        project_id = await _resolve_project_id(action.get("project_id"), action.get("project_name"))

        task_id = str(uuid.uuid4())
        # Next code (matches routes/tasks.py _next_task_code convention)
        last = await db.tasks.find_one({}, sort=[("created_at", -1)], projection={"_id": 0, "code": 1})
        try:
            last_num = int(re.sub(r"\D", "", (last or {}).get("code", "")) or "0")
        except Exception:
            last_num = 0
        code = f"TASK-{last_num + 1:06d}"

        doc = {
            "id": task_id,
            "code": code,
            "title": action.get("title", "Untitled task").strip(),
            "description": (action.get("description") or "").strip(),
            "status": "pending",
            "priority": (action.get("priority") or "medium").lower(),
            "assigned_to": assignee,
            "assigned_by": uid,
            "created_by": uid,
            "due_date": action.get("due_date") or None,
            "project_id": project_id,
            "parent_task_id": None,
            "tags": action.get("tags") or [],
            "attachments": [],
            "gdrive_link": None,
            "created_at": now,
            "updated_at": now,
            "activity_log": [log(f"Task created via AI Chat by {user.get('name','Admin')}")],
        }
        await db.tasks.insert_one(doc)

        # Fire WhatsApp to assignee (background best-effort)
        if action.get("notify_whatsapp", True) and assignee and assignee != uid:
            try:
                from routes.tasks import _notify_task_whatsapp
                await _notify_task_whatsapp(doc, "task_assigned", uid)
            except Exception as exc:
                logging.warning("ai_chat create_task notify failed: %s", exc)

        return {"status": "success", "task_id": task_id, "code": code,
                "detail": f"Task \"{doc['title']}\" created (code {code})"}

    # ── UPDATE TASK ──────────────────────────────────────────────
    if t == "update_task":
        tid = await _resolve_task_id(action.get("task_id"), action.get("task_title"))
        if not tid:
            return {"status": "error", "detail": "Task not found"}
        raw_fields = action.get("fields") or {}
        allowed = {"title", "description", "status", "priority", "due_date", "project_id", "tags"}
        set_fields = {k: v for k, v in raw_fields.items() if k in allowed and v is not None}
        if "project_id" not in set_fields and raw_fields.get("project_name"):
            resolved = await _resolve_project_id(None, raw_fields.get("project_name"))
            if resolved:
                set_fields["project_id"] = resolved
        if not set_fields:
            return {"status": "error", "detail": "No valid fields to update"}
        set_fields["updated_at"] = now
        old = await db.tasks.find_one({"id": tid}, {"_id": 0})
        await db.tasks.update_one(
            {"id": tid},
            {"$set": set_fields,
             "$push": {"activity_log": log(f"Updated via AI Chat: {', '.join(set_fields.keys())}")}}
        )
        # WhatsApp if due_date changed
        if "due_date" in set_fields and old:
            try:
                from routes.tasks import _notify_task_whatsapp
                updated = {**old, **set_fields}
                await _notify_task_whatsapp(updated, "task_due_date_updated", uid)
            except Exception as exc:
                logging.warning("ai_chat update_task notify failed: %s", exc)
        return {"status": "success", "task_id": tid, "detail": f"Task updated ({', '.join(set_fields.keys())})"}

    # ── DELETE TASK ──────────────────────────────────────────────
    if t == "delete_task":
        tid = await _resolve_task_id(action.get("task_id"), action.get("task_title"))
        if not tid:
            return {"status": "error", "detail": "Task not found"}
        res = await db.tasks.delete_one({"id": tid})
        if res.deleted_count == 0:
            return {"status": "error", "detail": "Task not deleted"}
        return {"status": "success", "task_id": tid, "detail": "Task deleted"}

    # ── ASSIGN / REASSIGN TASK ──────────────────────────────────
    if t == "assign_task":
        tid = await _resolve_task_id(action.get("task_id"), action.get("task_title"))
        if not tid:
            return {"status": "error", "detail": "Task not found"}
        assignee = await _resolve_team_user_id(action.get("assigned_to") or action.get("assigned_to_name") or "")
        if not assignee:
            return {"status": "error", "detail": "Assignee not found"}
        await db.tasks.update_one(
            {"id": tid},
            {"$set": {"assigned_to": assignee, "updated_at": now},
             "$push": {"activity_log": log("Reassigned via AI Chat")}}
        )
        task = await db.tasks.find_one({"id": tid}, {"_id": 0})
        if task:
            try:
                from routes.tasks import _notify_task_whatsapp
                await _notify_task_whatsapp(task, "task_reassigned", uid)
            except Exception as exc:
                logging.warning("ai_chat assign_task notify failed: %s", exc)
        return {"status": "success", "task_id": tid, "detail": "Task reassigned"}

    # ── REMIND TASK (WhatsApp + in-app nudge to current assignee) ──
    if t == "remind_task":
        tid = await _resolve_task_id(action.get("task_id"), action.get("task_title"))
        if not tid:
            return {"status": "error", "detail": "Task not found"}
        task = await db.tasks.find_one({"id": tid}, {"_id": 0})
        if not task:
            return {"status": "error", "detail": "Task not found"}
        # Push activity log entry
        reminder_text = (action.get("reminder_text") or "Gentle reminder").strip()
        await db.tasks.update_one(
            {"id": tid},
            {"$push": {"activity_log": log(f"Reminder sent: {reminder_text}")},
             "$set":  {"updated_at": now}}
        )
        try:
            from routes.tasks import _notify_task_whatsapp
            await _notify_task_whatsapp(task, "task_due_date_updated", uid)
        except Exception as exc:
            logging.warning("ai_chat remind_task notify failed: %s", exc)
        # In-app notification (best-effort)
        try:
            from routes.inapp_notifications import create_notification
            await create_notification(
                user_id=task.get("assigned_to"),
                type_="task_reminder",
                title=f"Reminder · {task.get('title','Task')}",
                message=reminder_text,
                task_id=tid,
                actor_id=uid,
                cta_path=f"/admin/tasks?open={tid}",
            )
        except Exception:
            pass
        return {"status": "success", "task_id": tid, "detail": "Reminder sent"}

    # ── CREATE PROJECT ──────────────────────────────────────────
    if t == "create_project":
        pid = str(uuid.uuid4())
        member_ids = []
        for nm in action.get("member_names") or []:
            mid = await _resolve_team_user_id(nm)
            if mid:
                member_ids.append(mid)
        member_ids += action.get("member_ids") or []
        member_ids = list(dict.fromkeys(member_ids))  # dedupe, preserve order
        doc = {
            "id": pid,
            "name": (action.get("name") or "Untitled project").strip(),
            "description": (action.get("description") or "").strip(),
            "color": action.get("color") or "#3B82F6",
            "status": (action.get("status") or "active").lower(),
            "lead_id": uid,
            "member_ids": member_ids,
            "start_date": action.get("start_date"),
            "end_date":   action.get("end_date"),
            "created_by": uid,
            "created_at": now,
            "updated_at": now,
        }
        await db.projects.insert_one(doc)
        return {"status": "success", "project_id": pid, "detail": f"Project \"{doc['name']}\" created"}

    # ── UPDATE PROJECT ──────────────────────────────────────────
    if t == "update_project":
        pid = await _resolve_project_id(action.get("project_id"), action.get("project_name"))
        if not pid:
            return {"status": "error", "detail": "Project not found"}
        allowed = {"name", "description", "color", "status", "lead_id",
                   "member_ids", "start_date", "end_date"}
        raw_fields = action.get("fields") or {}
        set_fields = {k: v for k, v in raw_fields.items() if k in allowed and v is not None}
        if not set_fields:
            return {"status": "error", "detail": "No valid fields to update"}
        set_fields["updated_at"] = now
        await db.projects.update_one({"id": pid}, {"$set": set_fields})
        return {"status": "success", "project_id": pid, "detail": f"Project updated ({', '.join(set_fields.keys())})"}

    # ── DELETE PROJECT ──────────────────────────────────────────
    if t == "delete_project":
        pid = await _resolve_project_id(action.get("project_id"), action.get("project_name"))
        if not pid:
            return {"status": "error", "detail": "Project not found"}
        # Detach open tasks (don't delete them — safety)
        await db.tasks.update_many({"project_id": pid}, {"$set": {"project_id": None, "updated_at": now}})
        res = await db.projects.delete_one({"id": pid})
        if res.deleted_count == 0:
            return {"status": "error", "detail": "Project not deleted"}
        return {"status": "success", "project_id": pid, "detail": "Project deleted (tasks detached, not removed)"}

    return None


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

            # Parse conversion amount
            lead_value = None
            if action.get("conversion_amount"):
                try:
                    lead_value = float(
                        str(action["conversion_amount"]).replace(",", "").replace("₹", "").strip()
                    )
                except ValueError:
                    pass

            # Build/merge onboarding_data
            existing = await db.school_inquiries.find_one({"id": sid}, {"_id": 0, "onboarding_data": 1, "onboarding_workflow": 1})
            merged_onboard = dict((existing or {}).get("onboarding_data") or {})

            gst_type = action.get("gst_type") or merged_onboard.get("gst_type") or "exclusive_18"
            state = action.get("state") or merged_onboard.get("state") or ""
            total_amount = lead_value or merged_onboard.get("total_amount") or 0

            # Build payment tranches
            ai_tranches = action.get("payment_tranches") or []
            if ai_tranches:
                built_tranches = []
                for tr in ai_tranches:
                    pct = float(tr.get("percentage") or 100)
                    amt = round(total_amount * pct / 100, 2) if total_amount else 0
                    built_tranches.append({
                        "percentage": pct,
                        "amount": amt,
                        "date": tr.get("date") or "",
                        "notes": tr.get("notes") or "",
                        "status": "pending",
                    })
                merged_onboard["payment_tranches"] = built_tranches
            elif not merged_onboard.get("payment_tranches") and total_amount:
                merged_onboard["payment_tranches"] = [{
                    "percentage": 100,
                    "amount": total_amount,
                    "date": "",
                    "notes": "",
                    "status": "pending",
                }]

            merged_onboard["gst_type"] = gst_type
            if state:
                merged_onboard["state"] = state
            if total_amount:
                merged_onboard["total_amount"] = total_amount

            # Build onboarding_workflow if not already present
            from routes.schools import generate_dynamic_onboarding_steps
            import copy
            existing_workflow = (existing or {}).get("onboarding_workflow")
            if not existing_workflow:
                tracking_token = f"oll-{uuid.uuid4().hex[:12]}"
                steps = generate_dynamic_onboarding_steps(merged_onboard, is_renewal=False)
                # Mark MOU as complete since AI-converted schools skip MOU step
                if "mou_signing" in steps:
                    steps["mou_signing"]["completed"] = True
                    steps["mou_signing"]["completed_date"] = now
                onboarding_workflow = {
                    "tracking_token": tracking_token,
                    "started_at": now,
                    "completed_at": None,
                    "current_step": "payment_collection",
                    "is_renewal": False,
                    "steps": steps,
                    "timeline": [
                        {"action": "School Converted via AI Chat", "date": now,
                         "by": user.get("name", user.get("email", "Admin"))}
                    ]
                }
            else:
                onboarding_workflow = existing_workflow

            upd = {
                "status": "converted",
                "updated_at": now,
                "onboarding_data": merged_onboard,
                "onboarding_workflow": onboarding_workflow,
            }
            if state:
                upd["state"] = state
            if lead_value is not None:
                upd["lead_value"] = lead_value

            res = await db.school_inquiries.update_one(
                {"id": sid},
                {"$set": upd,
                 "$push": {"activity_log": log(f"Lead converted via AI Chat. state={state}, gst={gst_type}, tranches={len(merged_onboard.get('payment_tranches',[]))}")}}
            )
            if res.matched_count == 0:
                return {"status": "error", "detail": "School not found"}
            tranche_count = len(merged_onboard.get("payment_tranches") or [])
            return {"status": "success", "detail": f"Marked as converted with onboarding tracker. {tranche_count} payment tranche(s) set. State={state or 'not set'}, GST={gst_type}."}

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
            from routes.schools import send_crm_email_for_school
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
            ticket_number = await get_next_ticket_number()

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
                "ticket_number":   ticket_number,
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
                    "detail": f"Ticket #{ticket_number} raised: \"{action.get('title', 'Support Request')}\"",
                    "ticket_id": ticket_id,
                    "ticket_number": ticket_number}

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
            # ── TASKS & PROJECTS (My Space) ─────────────────────────
            result = await _execute_tasks_projects(action, user, log, now)
            if result is not None:
                return result
            return {"status": "skipped", "detail": f"Unknown action: {t}"}

    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ai-chat/message")
async def chat_message(payload: dict, user: dict = Depends(get_current_user)):
    session_id = payload.get("session_id") or str(uuid.uuid4())
    user_text = (payload.get("message") or "").strip()
    # Optional attached images (base64, data URLs or vendor file urls).
    # Each item: {"content_type": "image/png", "data_base64": "<...>",
    #             "filename": "whiteboard.jpg"}  — frontend sends from the paperclip
    attachments = payload.get("attachments") or []
    if not user_text and not attachments:
        raise HTTPException(status_code=400, detail="Message or an image is required")
    # If the user ONLY attached images, give the LLM a nudge to actually look at them.
    if not user_text and attachments:
        n = len(attachments)
        subj = "an image" if n == 1 else f"{n} images"
        user_text = (
            f"I've attached {subj}. Extract every detail (names, phones, emails, "
            "school names, dates, amounts, requests) and IMMEDIATELY emit the "
            "right action (create_lead / create_task / raise_ticket / add_note / "
            "schedule_followup). Do NOT ask me to confirm — just do it and tell me "
            "what you did."
        )
    return await run_ai_chat_turn(
        session_id=session_id,
        user_text=user_text,
        user=user,
        attachments=attachments,
    )


async def run_ai_chat_turn(session_id: str, user_text: str, user: dict, attachments: list | None = None) -> dict:
    """Core AI-chat turn — extracted from the HTTP route so non-HTTP callers
    (e.g. the Twilio WhatsApp webhook) can invoke the same logic without
    round-tripping through FastAPI. Returns
    ``{"session_id", "message", "actions"}``.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent


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

    # ── "query" → raise_ticket hint ──────────────────────────────────────
    # In Indian CRM parlance a "query" IS a support ticket. If the admin
    # types "add query" / "raise query" / "log a query" / "create a query"
    # / "support query", explicitly tell the LLM to emit `raise_ticket` so
    # it doesn't fabricate a "QUERY ADDED TO TICKET #TECH-xxx" narrative
    # without actually executing anything.
    _QUERY_RE = re.compile(
        r'\b(?:add|raise|log|create|note|file|open|submit|send)\s+(?:a\s+|this\s+(?:as\s+a\s+)?)?quer(?:y|ies)\b'
        r'|\bquery\s+(?:this|it|for\s+)',
        re.IGNORECASE,
    )
    if _QUERY_RE.search(user_text or ""):
        enriched_text = (
            "[The user said 'query' — in Indian support parlance this means a "
            "support TICKET. Emit a `raise_ticket` action with the full details "
            "from the (replayed) image or message. Do NOT invent a ticket ID "
            "like '#TECH-002' — the backend assigns the real ID after you "
            "emit the action.]\n" + enriched_text
        )

    # Build system prompt with live CRM data + tasks/projects/team snapshot
    crm_ctx = await _crm_context()
    tp_ctx  = await _tasks_projects_context()
    system = AI_SYSTEM_PROMPT + crm_ctx + tp_ctx

    # Load prior conversation history so the LLM has full memory across
    # process restarts (LlmChat's own memory is process-local and dies
    # every hot-reload). Keep the last ~30 turns to stay well under the
    # context window.
    prior = await db.ai_chat_sessions.find_one(
        {"session_id": session_id}, {"_id": 0, "messages": 1},
    )
    prior_messages = ((prior or {}).get("messages") or [])
    initial_messages: list[dict] = []
    for m in prior_messages[-30:]:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if role == "assistant":
            # Reconstruct the JSON shape of past assistant turns so the LLM sees
            # its own prior output as valid structured JSON (not plain prose).
            # Without this, Claude mirrors the plain-text format of recent
            # messages and stops emitting the actions[] array.
            shadow_actions = []
            for a in (m.get("actions") or []):
                if isinstance(a, dict):
                    shadow_actions.append(
                        {k: v for k, v in a.items() if k != "execution"}
                    )
            try:
                content = json.dumps(
                    {"message": content, "actions": shadow_actions},
                    ensure_ascii=False,
                )
            except Exception:
                pass
            initial_messages.append({"role": role, "content": content})
        elif role == "user" and content:
            initial_messages.append({"role": role, "content": content})

    # ── IMAGE CARRY-FORWARD ──────────────────────────────────────────────
    # If this turn has no fresh attachments but the admin's IMMEDIATELY
    # previous turn uploaded images (e.g. they uploaded a WhatsApp screenshot,
    # then typed "raise ticket" to correct the classification), replay those
    # images on this turn so the vision model can re-read them. Without this
    # the LLM responds with "I don't have the image available" and emits a
    # payload full of nulls.
    _replayed_images = False
    if not attachments:
        for m in reversed(prior_messages):
            if m.get("role") == "user":
                prev_atts = m.get("attachments") or []
                if prev_atts:
                    attachments = [
                        {
                            "content_type": a.get("content_type") or "image/png",
                            "data_base64": a.get("data_base64") or "",
                            "filename": a.get("filename") or "upload",
                        }
                        for a in prev_atts
                        if (a.get("data_base64") or "").strip()
                    ]
                    if attachments:
                        _replayed_images = True
                        logging.info(
                            "ai_chat: replaying %d image(s) from prior turn for session %s",
                            len(attachments), session_id,
                        )
                break

    if _replayed_images:
        enriched_text = (
            f"[The admin's previous turn uploaded {len(attachments)} image(s) which "
            f"have been re-attached to THIS turn for you. Treat them as fully "
            f"available — read every detail, classify, and emit exactly ONE action. "
            f"NEVER say the image is missing. "
            f"RESPOND ONLY WITH VALID JSON matching the exact format "
            f'{{"message":"...","actions":[{{"type":"raise_ticket",...}}]}} — '
            f"no markdown, no plain prose, no code fences.]\n{enriched_text}"
        )

    # LLM call. GPT-5.2 is the default for text — but emergentintegrations only
    # wraps PDFs for the OpenAI provider ('messages[].content[].file.file_data'),
    # which 400s on images. When the user attaches images we route to
    # Claude Sonnet 4.5 instead — Anthropic's provider handler sends them as
    # proper vision content blocks.
    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    use_vision = bool(attachments)
    chat = LlmChat(
        api_key=llm_key,
        session_id=session_id,
        system_message=system,
        initial_messages=initial_messages or None,
    )
    if use_vision:
        chat = chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
    else:
        chat = chat.with_model("openai", "gpt-5.2")

    # Build the user message with any attached images so the vision-capable
    # model can read business cards, event invites, WhatsApp screenshots, etc.
    file_contents = []
    for att in (attachments or []):
        ctype = (att.get("content_type") or "image/png").strip() or "image/png"
        data_b64 = (att.get("data_base64") or "").strip()
        if not data_b64:
            continue
        # Accept both raw base64 and full data URLs — normalise to raw base64.
        if data_b64.startswith("data:"):
            try:
                _, _, data_b64 = data_b64.partition(",")
            except Exception:
                continue
        try:
            file_contents.append(ImageContent(image_base64=data_b64))
        except Exception:
            continue

    user_msg = (
        UserMessage(text=enriched_text, file_contents=file_contents)
        if file_contents
        else UserMessage(text=enriched_text)
    )
    raw = await chat.send_message(user_msg)

    # Parse response
    parsed = _parse_response(raw)
    message = parsed.get("message", raw)
    actions = parsed.get("actions", [])

    # ── Hallucination guard ──────────────────────────────────────────────
    # The LLM has been caught (a) writing an "ACTIONS COMPLETED" narrative,
    # (b) writing "TICKET RAISED #TECH-002" style completion claims,
    # (c) pasting raw JSON action payloads in markdown fences, and
    # (d) saying "I can emit the action payload you asked for" instead of
    # actually emitting the action — all while the actions[] array is empty.
    # The frontend only renders chips from the array, so the admin sees
    # "completed" text but nothing is written to Mongo. We detect any of
    # these patterns and overwrite the message with a plain warning.
    _entities = r'(?:lead|ticket|task|follow[- ]?up|meeting|note|proposal|invoice|mou|project|quer(?:y|ies))s?'
    _verbs = r'(?:created|raised|scheduled|added|updated|emitted|generated|opened|logged)'
    narrative_patterns = [
        r'actions?\s+(?:completed|taken|performed|executed)',
        rf'{_verbs}\s+{_entities}',           # "Created Lead", "Raised Ticket", "Added Query"
        rf'{_entities}\s+{_verbs}',           # "LEAD CREATED", "TICKET RAISED", "QUERY ADDED"
        r'query\s+added\s+to\s+ticket',       # "QUERY ADDED TO TICKET #TECH-002"
        r'ticket\s*#\s*[a-z]+-?\d+',          # "Ticket #TECH-002", "#TECH-001" invented IDs
        r'quer(?:y|ies)\s*#\s*[a-z0-9-]+',    # "Query #Q-123" invented IDs
        r'lead\s*id\s*[:#]',
        r'i\s+(?:have|just|will|can|can\'?t)\s+(?:emit|emitted|create|created|raise|raised|add|added|log|logged)',
        r'action\s+payload',
        r'"\s*action\s*"\s*:\s*"(?:create_|raise_|schedule_|update_|generate_|add_)',  # raw JSON
    ]
    narrative_regex = re.compile("|".join(narrative_patterns), re.IGNORECASE)
    emitted_types = {a.get("type") for a in actions if isinstance(a, dict)}
    emitted_any_write = bool(emitted_types & {
        "create_lead", "update_lead", "delete_lead", "change_status", "add_note",
        "convert_lead", "send_email", "raise_ticket", "schedule_meeting",
        "schedule_followup", "generate_proposal", "generate_mou", "generate_invoice",
        "create_task", "update_task", "delete_task", "assign_task", "remind_task",
        "create_project", "update_project", "delete_project",
    })
    if narrative_regex.search(message or "") and not emitted_any_write:
        logging.warning(
            "ai_chat hallucination: message narrates completion but actions array is empty. "
            "attachments=%d message=%r raw=%r",
            len(attachments or []), (message or "")[:300], (raw or "")[:500],
        )
        message = (
            "⚠️ I couldn't commit a real action — nothing was saved to the system. "
            "Please re-upload the image (or paste the details as text) and tell me "
            "which single action you want: **create lead**, **raise ticket**, "
            "**create task**, or **just note it**. I'll execute it in one go."
        )

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

    # Save to DB for UI history (save original user_text + attachment thumbnails
    # so the chat replay reconstructs what the admin uploaded). When images
    # were REPLAYED from a prior turn (image carry-forward), we don't re-store
    # them on this turn — they already live on the earlier user message.
    now = datetime.now(timezone.utc).isoformat()
    stored_attachments = []
    if not _replayed_images:
        for att in (attachments or []):
            data_b64 = (att.get("data_base64") or "")
            if data_b64.startswith("data:"):
                _, _, data_b64 = data_b64.partition(",")
            # cap at ~1MB base64 (~750KB original) to keep the session doc small
            if len(data_b64) > 1_400_000:
                continue
            stored_attachments.append({
                "content_type": att.get("content_type") or "image/png",
                "data_base64": data_b64,
                "filename": att.get("filename") or "upload",
            })
    await db.ai_chat_sessions.update_one(
        {"session_id": session_id},
        {"$push": {"messages": {"$each": [
            {"id": str(uuid.uuid4()), "role": "user", "content": user_text, "attachments": stored_attachments, "timestamp": now},
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
