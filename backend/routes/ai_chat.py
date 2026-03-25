"""
AI Chat backend — agentic CRM assistant for OLL School CRM.
POST /api/ai-chat/message        — send a message, get AI response + executed actions
GET  /api/ai-chat/history/{sid}  — full message history for a session
GET  /api/ai-chat/sessions       — list sessions for sidebar
DELETE /api/ai-chat/session/{sid}— delete a session
"""
import os, uuid, json, re
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
2. **FUZZY MATCH SCHOOLS** — if user says "Sudarshan" and there's "Sudarshan Daga School" in the CRM, that's your target. Pick the closest match. Don't ask "which school do you mean?" unless 3+ schools match equally.
3. **FILL IN GAPS YOURSELF** — if city/board/contact is missing for create_lead, leave them blank and create it anyway. Never block on missing optional fields.
4. **ONE-QUESTION RULE** — you are allowed to ask ONE thing only when you have absolute zero information to proceed (e.g., user says "create a lead" with no school name at all). Otherwise, make a reasonable assumption and act.
5. **PROPOSALS/MOUs** — if the user provides any pricing info (even partial), generate immediately using what's given. Default: grade "All", students 500, price_per_student 500. Never ask for grade info if user didn't mention it.
6. **MULTI-ACTION** — do multiple things in one shot when the request implies it (e.g., "follow up with X" → change_status to follow_up + add_note).

## CAPABILITIES
Produce actions in the "actions" array:

**Lead Management**
- create_lead: { type, school_name, city?, board?, contact_name?, phone?, email?, source?, notes? }
- update_lead: { type, school_id, school_name, fields: {} }
- delete_lead: { type, school_id, school_name }
- change_status: { type, school_id, school_name, status }
  → new | meeting_done | converted | active | renewal_meeting | renewed | lost | lost_lead | archived | follow_up
- add_note: { type, school_id, school_name, note }
- convert_lead: { type, school_id, school_name, conversion_amount? }

**Communication**
- send_email: { type, school_id, school_name, email_type, to_email? }
  → introduction | meeting_confirmation | proposal | mou | followup

**Support**
- raise_ticket: { type, title, description, priority, school_id?, school_name? }

**Document Generation (PDF rendered in browser)**
- generate_proposal: { type, school_id, school_name, data: { grade_pricing: [{grade, students, price_per_student}] } }
- generate_mou: { type, school_id, school_name, data: { grade_pricing: [{grade, students, price_per_student}], program_start_date? } }

## RESPONSE FORMAT — always return valid JSON, no markdown fences:
{"message": "...", "actions": [...]}

## TONE
- Short, direct confirmations: "Done — added note to Sudarshan Daga School."
- When you act on a partial match, briefly say which school you picked.
- If genuinely nothing can be inferred (truly 0 info), ask the ONE missing thing.
"""


# ─────────────────────────────────────────────────────────────────────────────
async def _crm_context() -> str:
    """Return a compact snapshot of all school leads for AI context."""
    schools = await db.school_inquiries.find(
        {},
        {"_id": 0, "id": 1, "school_name": 1, "status": 1, "city": 1,
         "board": 1, "contact_name": 1, "phone": 1, "email": 1, "source": 1,
         "lead_value": 1, "notes": 1, "created_at": 1}
    ).sort("created_at", -1).limit(150).to_list(length=150)

    if not schools:
        return "\n\n## CRM Data\nNo schools found."

    lines = ["\n\n## Live CRM Data (latest 150 leads)"]
    for s in schools:
        note_snippet = (s.get("notes") or "")[:60]
        note_part = f" | Note:{note_snippet}" if note_snippet else ""
        lines.append(
            f"- [{s.get('status','new')}] \"{s.get('school_name','')}\" "
            f"(id:{s.get('id','')}) | "
            f"City:{s.get('city','')} | Board:{s.get('board','')} | "
            f"Contact:{s.get('contact_name','')} | Phone:{s.get('phone','')} | "
            f"Email:{s.get('email','')}{note_part}"
        )
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


async def _execute(action: dict, user: dict) -> dict:
    """Execute one CRM action. Returns result dict (merged into action for UI)."""
    t = action.get("type", "")
    sid = action.get("school_id")
    now = datetime.now(timezone.utc).isoformat()

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
            fields = {**action.get("fields", {}), "updated_at": now}
            res = await db.school_inquiries.update_one(
                {"id": sid},
                {"$set": fields,
                 "$push": {"activity_log": log(f"Fields updated via AI Chat: {', '.join(k for k in fields if k != 'updated_at')}")}}
            )
            if res.matched_count == 0:
                return {"status": "error", "detail": "School not found"}
            return {"status": "success",
                    "detail": f"Updated: {', '.join(k for k in fields if k != 'updated_at')}"}

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
            from server import send_crm_email_for_school
            email_data = {
                "email_type": action.get("email_type", "introduction"),
                "to_email": action.get("to_email"),
            }
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
            await db.support_tickets.insert_one({
                "id": ticket_id,
                "subject": action.get("title", "Support Request"),
                "description": action.get("description", ""),
                "priority": action.get("priority", "medium"),
                "status": "open",
                "source": "ai_chat",
                "school_id": action.get("school_id"),
                "school_name": action.get("school_name", ""),
                "created_by": user.get("id"),
                "created_by_name": user.get("name", "Admin"),
                "created_at": now,
                "updated_at": now,
            })
            return {"status": "success", "detail": "Ticket raised", "ticket_id": ticket_id}

        # ── FRONTEND ACTIONS (generate_proposal / generate_mou) ─────
        elif t in ("generate_proposal", "generate_mou"):
            return {"status": "frontend_action",
                    "detail": "PDF will be generated in your browser"}

        else:
            return {"status": "skipped", "detail": f"Unknown action: {t}"}

    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ai-chat/message")
async def chat_message(payload: dict, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    session_id = payload.get("session_id") or str(uuid.uuid4())
    user_text = (payload.get("message") or "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Build system prompt with live CRM data
    crm_ctx = await _crm_context()
    system = AI_SYSTEM_PROMPT + crm_ctx

    # LLM call
    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    chat = LlmChat(
        api_key=llm_key,
        session_id=session_id,
        system_message=system
    ).with_model("openai", "gpt-5.2")

    raw = await chat.send_message(UserMessage(text=user_text))

    # Parse response
    parsed = _parse_response(raw)
    message = parsed.get("message", raw)
    actions = parsed.get("actions", [])

    # Execute backend actions
    results = []
    for action in actions:
        exec_result = await _execute(action, user)
        results.append({**action, "execution": exec_result})

    # Save to DB for UI history
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
