"""Techfest IIT Bombay × OLL Robotics Championship — lead capture.

Public endpoint:
  POST /api/techfest/register — capture Educator/Mentor or School lead.
Admin:
  GET /api/admin/techfest/registrations — list captured leads (super_admin/admin).
"""
import csv
import io
import re
from datetime import datetime, timezone
from typing import Optional, Literal, List

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field

from .shared import db, get_current_user


router = APIRouter()

RegistrantType = Literal["educator", "school"]


class TechfestRegisterIn(BaseModel):
    type: RegistrantType
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=6, max_length=20)
    city: str = Field(..., min_length=2, max_length=80)
    # Educator/Mentor
    school_or_institute: Optional[str] = Field(None, max_length=200)
    grade_taught: Optional[str] = Field(None, max_length=80)
    experience: Optional[str] = Field(None, max_length=80)
    # School
    school_name: Optional[str] = Field(None, max_length=200)
    role_designation: Optional[str] = Field(None, max_length=120)
    student_count: Optional[str] = Field(None, max_length=40)
    tracks: Optional[List[str]] = None
    # Shared additions (school + educator)
    school_address: Optional[str] = Field(None, max_length=500)
    school_email: Optional[str] = Field(None, max_length=120)
    school_phone: Optional[str] = Field(None, max_length=20)
    message: Optional[str] = Field(None, max_length=1000)


def _sanitise_phone(raw: str) -> str:
    return re.sub(r"[^0-9+]", "", raw or "")[:20]


@router.post("/techfest/register")
async def register_techfest(payload: TechfestRegisterIn):
    now = datetime.now(timezone.utc)
    phone = _sanitise_phone(payload.phone)
    if len(re.sub(r"\D", "", phone)) < 6:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    doc = {
        "type": payload.type,
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "phone": phone,
        "city": payload.city.strip(),
        "created_at": now.isoformat(),
        "status": "new",
    }
    if payload.type == "educator":
        doc.update({
            "school_or_institute": (payload.school_or_institute or "").strip() or None,
            "grade_taught": (payload.grade_taught or "").strip() or None,
            "experience": (payload.experience or "").strip() or None,
            "student_count": (payload.student_count or "").strip() or None,
        })
    else:
        doc.update({
            "school_name": (payload.school_name or "").strip() or None,
            "role_designation": (payload.role_designation or "").strip() or None,
            "student_count": (payload.student_count or "").strip() or None,
            "tracks": payload.tracks or [],
        })
    # Shared additions
    for k in ("school_address", "school_email", "school_phone"):
        val = (getattr(payload, k) or "").strip() or None
        if val:
            doc[k] = val
    if payload.message:
        doc["message"] = payload.message.strip()

    # Upsert on email+phone to dedupe re-submissions
    key = {"email": doc["email"], "phone": doc["phone"], "type": doc["type"]}
    existing = await db.techfest_registrations.find_one(key)
    if existing:
        await db.techfest_registrations.update_one(
            {"_id": existing["_id"]},
            {"$set": {**{k: v for k, v in doc.items() if k != "created_at"}, "updated_at": now.isoformat()}},
        )
        return {"ok": True, "duplicate": True, "id": str(existing["_id"])}

    result = await db.techfest_registrations.insert_one(doc)
    return {"ok": True, "duplicate": False, "id": str(result.inserted_id)}


async def _admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/techfest/registrations")
async def list_techfest_registrations(
    type: Optional[RegistrantType] = None,
    user: dict = Depends(_admin),
):
    query = {}
    if type:
        query["type"] = type
    cursor = db.techfest_registrations.find(query).sort("created_at", -1).limit(1000)
    out = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        out.append(doc)
    return {"items": out, "count": len(out)}



# CSV column order — shared for export + import
_EXPORT_COLS = [
    "sr_no", "type", "created_at", "name", "email", "phone", "city",
    "school_name", "school_or_institute", "role_designation", "grade_taught",
    "experience", "student_count", "tracks",
    "school_address", "school_email", "school_phone",
    "message", "status",
]


@router.get("/admin/techfest/registrations/export")
async def export_techfest_csv(
    type: Optional[RegistrantType] = None,
    user: dict = Depends(_admin),
):
    query = {}
    if type:
        query["type"] = type
    cursor = db.techfest_registrations.find(query).sort("created_at", 1)
    rows = []
    async for doc in cursor:
        rows.append(doc)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(_EXPORT_COLS)
    for i, doc in enumerate(rows, 1):
        row = []
        for col in _EXPORT_COLS:
            if col == "sr_no":
                row.append(i)
            elif col == "tracks":
                row.append(", ".join(doc.get("tracks") or []))
            else:
                row.append(doc.get(col, "") or "")
        writer.writerow(row)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    filename = f"techfest-registrations-{type or 'all'}-{stamp}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/admin/techfest/registrations/import")
async def import_techfest_csv(
    file: UploadFile = File(...),
    user: dict = Depends(_admin),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")
    raw = (await file.read()).decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(raw))

    inserted = 0
    updated = 0
    skipped = 0
    errors: List[str] = []
    now = datetime.now(timezone.utc)

    for idx, row in enumerate(reader, 2):  # row 1 is header
        try:
            r_type = (row.get("type") or "").strip().lower()
            if r_type not in ("educator", "school"):
                skipped += 1
                continue
            email = (row.get("email") or "").strip().lower()
            phone = _sanitise_phone(row.get("phone") or "")
            if not email or not phone or not row.get("name"):
                skipped += 1
                continue

            doc = {
                "type": r_type,
                "name": (row.get("name") or "").strip(),
                "email": email,
                "phone": phone,
                "city": (row.get("city") or "").strip(),
                "status": (row.get("status") or "new").strip() or "new",
            }
            for k in ("school_name", "school_or_institute", "role_designation",
                      "grade_taught", "experience", "student_count",
                      "school_address", "school_email", "school_phone", "message"):
                v = (row.get(k) or "").strip()
                if v:
                    doc[k] = v
            tracks_raw = (row.get("tracks") or "").strip()
            if tracks_raw:
                doc["tracks"] = [t.strip() for t in tracks_raw.split(",") if t.strip()]

            key = {"email": doc["email"], "phone": doc["phone"], "type": doc["type"]}
            existing = await db.techfest_registrations.find_one(key)
            if existing:
                await db.techfest_registrations.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {**doc, "updated_at": now.isoformat()}},
                )
                updated += 1
            else:
                doc["created_at"] = (row.get("created_at") or now.isoformat()).strip()
                await db.techfest_registrations.insert_one(doc)
                inserted += 1
        except Exception as exc:
            errors.append(f"Row {idx}: {exc}")

    return {
        "ok": True,
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "errors": errors[:20],
    }
