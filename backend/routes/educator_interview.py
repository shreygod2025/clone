"""
AI Voice Interview routes for educator candidates.

Flow:
  1. Candidate finishes application form → frontend calls POST /interview/start
  2. Backend creates a session, returns first question + section info
  3. Candidate records audio for each answer; frontend uploads to /interview/{id}/respond
     - Backend transcribes via Whisper, scores via GPT-4o, returns next question
  4. Stage 1 (Personality+Communication) gates Stage 2; Stage 2 gates Stage 3
  5. POST /interview/{id}/finish — finalize, write final scorecard to educator app
"""
from __future__ import annotations

import io
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from .shared import db, get_current_user

load_dotenv()

router = APIRouter(tags=["educator-interview"])

# ── Models ────────────────────────────────────────────────────────────────
class StartInterviewRequest(BaseModel):
    application_id: str


# ── Question bank (anchor questions; AI may rephrase / probe) ─────────────
INTERVIEW_QUESTIONS = {
    "stage_1": {
        "name": "Personality & Communication",
        "max_marks": 55,  # 35 communication + 20 personality
        "pass_marks": 30,
        "questions": [
            {"id": "s1q1", "text": "Welcome! Let's start simple. Please introduce yourself like you're speaking to a Grade 5 class of students.", "category": "communication", "section": "A"},
            {"id": "s1q2", "text": "Why do you want to teach Robotics or Coding to children?", "category": "personality", "section": "A"},
            {"id": "s1q3", "text": "Imagine a child says 'This is boring'. How will you respond?", "category": "personality", "section": "A"},
            {"id": "s1q4", "text": "If 10 students are shouting in your class, how will you handle the situation?", "category": "classroom_mgmt", "section": "A"},
            {"id": "s1q5", "text": "Tell me about a time you solved a problem on your own without help.", "category": "personality", "section": "A"},
            {"id": "s1q6", "text": "Now teach me what a sensor is, like I am a 9-year-old student.", "category": "communication", "section": "B"},
            {"id": "s1q7", "text": "Quick scenario — a motor stops working during a live class and students start getting distracted. What do you do in the next 60 seconds?", "category": "classroom_mgmt", "section": "C"},
        ],
    },
    "stage_2": {
        "name": "Subject Knowledge",
        "max_marks": 45,  # 20 subject + 25 classroom mgmt
        "pass_marks": 20,
        "questions": [
            {"id": "s2q1", "text": "What's the difference between a motor and a sensor?", "category": "subject", "section": "A"},
            {"id": "s2q2", "text": "What is Arduino, and what is it commonly used for in school robotics?", "category": "subject", "section": "A"},
            {"id": "s2q3", "text": "How would you explain Artificial Intelligence to a Grade 6 student in simple words?", "category": "subject", "section": "A"},
            {"id": "s2q4", "text": "Quickly outline a 30-minute robotics activity for Grade 4 — what would you do?", "category": "applied", "section": "B"},
            {"id": "s2q5", "text": "If your class has students with very different learning speeds, how do you keep everyone engaged?", "category": "classroom_mgmt", "section": "B"},
        ],
    },
    "stage_3": {
        "name": "Commitment & Reliability",
        "max_marks": 0,  # purely informational — captured for HR
        "pass_marks": 0,
        "questions": [
            {"id": "s3q1", "text": "How many days per week can you commit to teaching, and during what hours?", "category": "reliability", "section": "A"},
            {"id": "s3q2", "text": "Are you currently working or studying somewhere else? If yes, please share details.", "category": "reliability", "section": "A"},
            {"id": "s3q3", "text": "What's the longest you've stayed at any one job or commitment?", "category": "reliability", "section": "A"},
        ],
    },
}

# Aggregate scoring buckets (out of 100)
RUBRIC_BUCKETS = {
    "communication": 35,        # confidence, clarity, fluency, child-friendly
    "personality": 20,          # ownership, patience, energy, reliability
    "classroom_mgmt": 25,       # discipline, presence, problem solving
    "subject": 20,              # robotics basics, application
}


# ── Helper: AI scoring of a single answer ─────────────────────────────────
async def _score_answer_with_ai(question_text: str, answer_text: str, category: str) -> dict:
    """Returns {score_0_to_10, reasoning, confidence_signal} via GPT-4o."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.getenv("EMERGENT_LLM_KEY", "")
        if not api_key:
            raise RuntimeError("EMERGENT_LLM_KEY missing")
        sys_msg = (
            "You are an experienced HR interviewer at OLL — a kids' robotics & coding education company. "
            "Score the candidate's spoken answer to a single interview question. "
            "Be honest, fair, and forgiving of accent or grammar. "
            "Focus on the rubric category provided.\n\n"
            "Output STRICT JSON only (no markdown, no extra text). Format:\n"
            '{"score": <int 0-10>, "reasoning": "<one short sentence>", "signals": {"confidence": <int 1-5>, "clarity": <int 1-5>, "energy": <int 1-5>, "child_friendly": <int 1-5>}}'
        )
        chat = LlmChat(api_key=api_key, session_id=f"score-{uuid.uuid4()}", system_message=sys_msg).with_model("openai", "gpt-4o")
        prompt = (
            f"Rubric category: {category}\n"
            f"Question asked: {question_text}\n"
            f"Candidate answer (transcribed from audio): \"\"\"{answer_text}\"\"\"\n\n"
            "Return JSON only."
        )
        raw = await chat.send_message(UserMessage(text=prompt))
        # Strip code fences if any
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.strip("`")
            if clean.lower().startswith("json"):
                clean = clean[4:].strip()
        try:
            data = json.loads(clean)
        except Exception:
            # Try to extract JSON substring
            start = clean.find("{")
            end = clean.rfind("}")
            if start != -1 and end != -1:
                data = json.loads(clean[start:end + 1])
            else:
                raise
        score = max(0, min(10, int(data.get("score", 0))))
        return {
            "score": score,
            "reasoning": (data.get("reasoning") or "")[:300],
            "signals": data.get("signals", {}),
        }
    except Exception as e:
        logging.error(f"[Interview] AI scoring failed: {e}")
        # Fallback: very basic heuristic so we don't block the flow
        words = len((answer_text or "").split())
        baseline = 3 if words < 15 else (5 if words < 60 else 7)
        return {"score": baseline, "reasoning": f"Auto-scored fallback ({words} words)", "signals": {}}


# ── Whisper STT helper ─────────────────────────────────────────────────────
async def _transcribe_audio(file_bytes: bytes, filename: str) -> str:
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
        api_key = os.getenv("EMERGENT_LLM_KEY", "")
        if not api_key:
            raise RuntimeError("EMERGENT_LLM_KEY missing")
        stt = OpenAISpeechToText(api_key=api_key)
        # OpenAI SDK accepts file-like objects; need a name attribute for content-type sniffing
        buf = io.BytesIO(file_bytes)
        buf.name = filename or "audio.webm"
        response = await stt.transcribe(file=buf, model="whisper-1", response_format="json")
        return (getattr(response, "text", "") or "").strip()
    except Exception as e:
        logging.error(f"[Interview] Whisper failed: {e}")
        return ""


def _next_question(session: dict) -> Optional[dict]:
    stage = session.get("current_stage", "stage_1")
    idx = session.get("current_q_index", 0)
    questions = INTERVIEW_QUESTIONS[stage]["questions"]
    if idx < len(questions):
        return {**questions[idx], "stage": stage, "stage_label": INTERVIEW_QUESTIONS[stage]["name"], "q_index": idx, "total_in_stage": len(questions)}
    return None


def _stage_score(session: dict, stage: str) -> int:
    """Sum the per-answer scores assigned to a stage (0-10 each → scale)."""
    answers = [a for a in session.get("answers", []) if a.get("stage") == stage]
    if not answers:
        return 0
    raw_total = sum(a.get("score", 0) for a in answers)  # each 0-10
    max_per_stage_raw = len(answers) * 10
    if max_per_stage_raw == 0:
        return 0
    pct = raw_total / max_per_stage_raw  # 0..1
    return int(round(pct * INTERVIEW_QUESTIONS[stage]["max_marks"]))


def _bucket_breakdown(session: dict) -> dict:
    """Aggregate scores per rubric bucket (out of bucket max)."""
    bucket_raw: dict = {k: {"raw": 0, "count": 0} for k in RUBRIC_BUCKETS}
    for a in session.get("answers", []):
        cat = a.get("category", "")
        if cat in bucket_raw:
            bucket_raw[cat]["raw"] += a.get("score", 0)
            bucket_raw[cat]["count"] += 1
    out = {}
    for cat, max_marks in RUBRIC_BUCKETS.items():
        info = bucket_raw[cat]
        if info["count"] == 0:
            out[cat] = {"score": 0, "max": max_marks}
            continue
        pct = info["raw"] / (info["count"] * 10)
        out[cat] = {"score": int(round(pct * max_marks)), "max": max_marks}
    return out


# ── Routes ────────────────────────────────────────────────────────────────
@router.post("/educator-interview/start")
async def start_interview(data: StartInterviewRequest):
    """Public — candidate clicks Start right after submitting application."""
    application = await db.educator_applications.find_one({"id": data.application_id}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "skills": 1})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # If an interview session already exists & is not finished, resume it
    existing = await db.educator_interviews.find_one(
        {"application_id": data.application_id, "status": {"$in": ["in_progress"]}},
        {"_id": 0},
    )
    if existing:
        return {"session_id": existing["id"], "resumed": True, "question": _next_question(existing), "stage": existing.get("current_stage")}

    session_id = str(uuid.uuid4())
    session = {
        "id": session_id,
        "application_id": data.application_id,
        "candidate_name": application.get("name", ""),
        "candidate_email": application.get("email", ""),
        "candidate_phone": application.get("phone", ""),
        "current_stage": "stage_1",
        "current_q_index": 0,
        "answers": [],
        "tab_switch_warnings": 0,
        "status": "in_progress",  # in_progress | completed | failed_stage_1 | failed_stage_2 | auto_failed_anti_cheat
        "started_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
        "final_score": None,
        "scorecard": None,
    }
    await db.educator_interviews.insert_one(session)
    return {
        "session_id": session_id,
        "resumed": False,
        "question": _next_question(session),
        "stage": "stage_1",
        "candidate_name": application.get("name", ""),
    }


@router.get("/educator-interview/{session_id}")
async def get_interview(session_id: str):
    sess = await db.educator_interviews.find_one({"id": session_id}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return sess


@router.post("/educator-interview/{session_id}/respond")
async def submit_response(
    session_id: str,
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    question_id: str = Form(...),
):
    """Candidate submits an audio answer for the current question.
    Backend transcribes, scores, advances to the next question (or stage)."""
    sess = await db.educator_interviews.find_one({"id": session_id}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if sess.get("status") != "in_progress":
        raise HTTPException(status_code=400, detail=f"Interview already {sess.get('status')}")

    current_q = _next_question(sess)
    if not current_q or current_q["id"] != question_id:
        raise HTTPException(status_code=400, detail="Question id does not match the current step")

    # Transcribe
    audio_bytes = await audio.read()
    if len(audio_bytes) < 500:
        raise HTTPException(status_code=400, detail="Audio is too short — please re-record")
    transcript = await _transcribe_audio(audio_bytes, audio.filename or "audio.webm")
    if not transcript:
        transcript = "(unable to transcribe — candidate audio was unclear)"

    # Score (skip scoring for stage 3 — informational)
    if current_q["stage"] == "stage_3":
        scored = {"score": 0, "reasoning": "Informational — not scored.", "signals": {}}
    else:
        scored = await _score_answer_with_ai(current_q["text"], transcript, current_q["category"])

    answer_record = {
        "question_id": current_q["id"],
        "question": current_q["text"],
        "category": current_q["category"],
        "stage": current_q["stage"],
        "transcript": transcript,
        "score": scored["score"],
        "reasoning": scored["reasoning"],
        "signals": scored.get("signals", {}),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Advance pointer
    new_idx = sess.get("current_q_index", 0) + 1
    questions_in_stage = INTERVIEW_QUESTIONS[current_q["stage"]]["questions"]

    update = {"$push": {"answers": answer_record}, "$set": {"current_q_index": new_idx}}
    next_q_payload = None
    stage_complete = False
    interview_complete = False
    failure_reason: Optional[str] = None

    # Check if stage is finished
    if new_idx >= len(questions_in_stage):
        stage_complete = True
        # Compute stage score
        sess_after = {**sess, "answers": sess.get("answers", []) + [answer_record]}
        stage_score = _stage_score(sess_after, current_q["stage"])
        pass_marks = INTERVIEW_QUESTIONS[current_q["stage"]]["pass_marks"]

        if current_q["stage"] == "stage_1":
            if stage_score < pass_marks:
                update["$set"]["status"] = "failed_stage_1"
                update["$set"]["finished_at"] = datetime.now(timezone.utc).isoformat()
                interview_complete = True
                failure_reason = f"Stage 1 score {stage_score}/55 below threshold ({pass_marks})"
            else:
                update["$set"]["current_stage"] = "stage_2"
                update["$set"]["current_q_index"] = 0
        elif current_q["stage"] == "stage_2":
            if stage_score < pass_marks:
                update["$set"]["status"] = "failed_stage_2"
                update["$set"]["finished_at"] = datetime.now(timezone.utc).isoformat()
                interview_complete = True
                failure_reason = f"Stage 2 score {stage_score}/45 below threshold ({pass_marks})"
            else:
                update["$set"]["current_stage"] = "stage_3"
                update["$set"]["current_q_index"] = 0
        elif current_q["stage"] == "stage_3":
            interview_complete = True
            update["$set"]["status"] = "completed"
            update["$set"]["finished_at"] = datetime.now(timezone.utc).isoformat()

    await db.educator_interviews.update_one({"id": session_id}, update)

    refreshed = await db.educator_interviews.find_one({"id": session_id}, {"_id": 0})
    if not interview_complete:
        next_q_payload = _next_question(refreshed)

    if interview_complete:
        background_tasks.add_task(_finalize_interview, session_id)

    return {
        "transcript": transcript,
        "score": answer_record["score"],
        "reasoning": answer_record["reasoning"],
        "stage_complete": stage_complete,
        "interview_complete": interview_complete,
        "failure_reason": failure_reason,
        "next_question": next_q_payload,
        "current_stage": refreshed.get("current_stage") if not interview_complete else None,
        "stage_progress": {
            "stage": refreshed.get("current_stage"),
            "answered": len([a for a in refreshed.get("answers", []) if a.get("stage") == refreshed.get("current_stage")]),
            "total": len(INTERVIEW_QUESTIONS.get(refreshed.get("current_stage", "stage_1"), {}).get("questions", [])),
        } if not interview_complete else None,
    }


@router.post("/educator-interview/{session_id}/anti-cheat")
async def anti_cheat_event(session_id: str, payload: dict):
    """Frontend reports that the candidate switched tabs / lost focus."""
    sess = await db.educator_interviews.find_one({"id": session_id}, {"_id": 0})
    if not sess or sess.get("status") != "in_progress":
        return {"ok": True, "ignored": True}
    new_count = sess.get("tab_switch_warnings", 0) + 1
    update = {"$set": {"tab_switch_warnings": new_count, "last_warning_at": datetime.now(timezone.utc).isoformat()}}
    auto_failed = False
    if new_count >= 3:
        update["$set"]["status"] = "auto_failed_anti_cheat"
        update["$set"]["finished_at"] = datetime.now(timezone.utc).isoformat()
        auto_failed = True
    await db.educator_interviews.update_one({"id": session_id}, update)
    if auto_failed:
        await _finalize_interview(session_id)
    return {"ok": True, "warnings": new_count, "auto_failed": auto_failed}


async def _finalize_interview(session_id: str):
    """Compute scorecard & write summary to the educator application."""
    try:
        sess = await db.educator_interviews.find_one({"id": session_id}, {"_id": 0})
        if not sess:
            return
        breakdown = _bucket_breakdown(sess)
        final_score = sum(b["score"] for b in breakdown.values())
        passed = final_score >= 50 and sess.get("status") == "completed"
        scorecard = {
            "final_score": final_score,
            "max_score": 100,
            "breakdown": breakdown,
            "stage_1_score": _stage_score(sess, "stage_1"),
            "stage_2_score": _stage_score(sess, "stage_2"),
            "passed_stage_1": _stage_score(sess, "stage_1") >= INTERVIEW_QUESTIONS["stage_1"]["pass_marks"],
            "passed_stage_2": _stage_score(sess, "stage_2") >= INTERVIEW_QUESTIONS["stage_2"]["pass_marks"],
            "status": sess.get("status"),
            "tab_switch_warnings": sess.get("tab_switch_warnings", 0),
            "computed_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.educator_interviews.update_one(
            {"id": session_id},
            {"$set": {"final_score": final_score, "scorecard": scorecard}},
        )
        # Write summary on the educator application
        app_update = {
            "interview_session_id": session_id,
            "interview_score": final_score,
            "interview_status": sess.get("status"),
            "interview_breakdown": breakdown,
            "interview_completed_at": scorecard["computed_at"],
        }
        if passed:
            app_update["status"] = "interview_passed"
        elif sess.get("status") in ("failed_stage_1", "failed_stage_2", "auto_failed_anti_cheat"):
            app_update["status"] = "interview_failed"
        await db.educator_applications.update_one(
            {"id": sess["application_id"]},
            {"$set": app_update},
        )
        logging.info(f"[Interview] Finalized session {session_id} → {final_score}/100 ({sess.get('status')})")
    except Exception as e:
        logging.error(f"[Interview] Finalize failed: {e}")


# ── Admin: list & view sessions ───────────────────────────────────────────
@router.get("/admin/educator-interviews")
async def list_interviews(application_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if application_id:
        query["application_id"] = application_id
    rows = await db.educator_interviews.find(query, {"_id": 0}).sort("started_at", -1).to_list(500)
    return {"sessions": rows}


@router.get("/admin/educator-interviews/{session_id}")
async def admin_get_interview(session_id: str, user: dict = Depends(get_current_user)):
    sess = await db.educator_interviews.find_one({"id": session_id}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Not found")
    return sess
