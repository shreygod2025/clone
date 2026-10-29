"""Franchise landing-page enquiries → Growth Partners CRM (Centre Franchise)."""
import os
import uuid
from datetime import timedelta
import logging
from datetime import datetime, timezone
from html import escape
from typing import Literal

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field

from .shared import db
from .techfest import _dispatch_email

router = APIRouter()
logger = logging.getLogger(__name__)

SPACE_LABELS = {"yes": "Yes, I have a space", "no": "No, not yet", "looking": "Currently looking"}


class FranchiseEnquiryIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$")
    email: EmailStr
    city_state: str = Field(..., min_length=2, max_length=120)
    occupation: str = Field(..., min_length=2, max_length=200)
    has_space: Literal["yes", "no", "looking"]
    reason: str = Field(..., min_length=5, max_length=2000)


def _thank_you_html(name: str) -> str:
    return f"""<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0A1F44">
  <div style="background:#0A1F44;color:#fff;padding:24px;border-radius:12px 12px 0 0">
    <div style="font-size:12px;letter-spacing:3px;color:#FCA5A5;text-transform:uppercase">OLL Franchise</div>
    <h2 style="margin:8px 0 0">Thank you for your interest, {escape(name)}!</h2>
  </div>
  <div style="padding:24px;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;line-height:1.6">
    <p>We've received your enquiry to start an <b>OLL Robotics &amp; AI Learning Center</b>.</p>
    <p>Our franchise team will call you within 2 working days to understand your goals, location and next steps.</p>
    <p style="background:#FEF2F2;border-left:4px solid #DC2626;padding:12px 14px;border-radius:6px">
      All you need: <b>1 furnished room &amp; 1 teacher</b>. Everything else is done by OLL.<br/>Total investment: <b>&#8377;2.5 Lakhs</b>.
    </p>
    <p>Warm regards,<br/><b>Team OLL</b></p>
  </div>
</div>"""


def _alert_html(d: dict) -> str:
    rows = "".join(
        f"<tr><td style='padding:6px 10px;color:#64748B'>{k}</td><td style='padding:6px 10px'><b>{escape(str(v))}</b></td></tr>"
        for k, v in [("Name", d["name"]), ("Phone", d["phone"]), ("Email", d["email"]), ("City / State", d["city_state"]),
                     ("Occupation", d["occupation"]), ("Has space", SPACE_LABELS[d["has_space"]]), ("Why OLL", d["reason"])]
    )
    return f"<div style='font-family:Arial,sans-serif'><h3>New franchise enquiry</h3><table style='border-collapse:collapse'>{rows}</table><p>View in Admin → Growth Partners.</p></div>"


async def _notify(d: dict) -> None:
    for to, subject, html in [
        (d["email"], "Thank you for your interest in an OLL Franchise", _thank_you_html(d["name"])),
        (os.environ["FRANCHISE_ALERT_EMAIL"], f"New franchise enquiry — {d['name']} ({d['city_state']})", _alert_html(d)),
    ]:
        try:
            await _dispatch_email(to, subject, html, from_addr="OLL Franchise <welcome@oll.co>", reply_to="welcome@oll.co")
        except Exception as exc:  # noqa: BLE001
            logger.warning("franchise email to %s failed: %s", to, exc)


@router.post("/franchise/enquiry")
async def create_franchise_enquiry(body: FranchiseEnquiryIn, background_tasks: BackgroundTasks):
    d = body.model_dump()
    d["email"] = str(d["email"]).lower()
    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    recent = await db.growth_partners.find_one(
        {"source": "franchise_landing", "$or": [{"phone": d["phone"]}, {"email": d["email"]}],
         "created_at": {"$gte": (now_dt - timedelta(hours=24)).isoformat()}}, {"_id": 0, "id": 1})
    if recent:
        return {"ok": True, "id": recent["id"], "duplicate": True}
    details = (f"Occupation: {d['occupation']}\nHas space: {SPACE_LABELS[d['has_space']]}\n"
               f"Why OLL franchise: {d['reason']}")
    doc = {
        "id": str(uuid.uuid4()), "name": d["name"].strip(), "email": d["email"], "phone": d["phone"].strip(),
        "city": d["city_state"].strip(), "interest_type": "centre_franchise", "details": details,
        "occupation": d["occupation"], "has_space": d["has_space"], "reason": d["reason"],
        "status": "new", "notes": "", "comments": [], "source": "franchise_landing", "added_by": "", "assigned_to": "",
        "created_at": now, "updated_at": now,
    }
    await db.growth_partners.insert_one(doc)
    background_tasks.add_task(_notify, d)
    return {"ok": True, "id": doc["id"]}


class BrochureLeadIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$")
    city: str = Field(..., min_length=2, max_length=120)


@router.post("/franchise/brochure-lead")
async def create_brochure_lead(body: BrochureLeadIn):
    now_dt = datetime.now(timezone.utc)
    recent = await db.growth_partners.find_one(
        {"source": {"$in": ["franchise_brochure", "franchise_landing"]}, "phone": body.phone,
         "created_at": {"$gte": (now_dt - timedelta(hours=24)).isoformat()}}, {"_id": 0, "id": 1})
    if recent:
        return {"ok": True, "duplicate": True}
    now = now_dt.isoformat()
    await db.growth_partners.insert_one({
        "id": str(uuid.uuid4()), "name": body.name.strip(), "email": "", "phone": body.phone, "city": body.city.strip(),
        "interest_type": "centre_franchise", "details": "Downloaded the franchise brochure from the franchise page.",
        "status": "new", "notes": "", "comments": [], "source": "franchise_brochure", "added_by": "", "assigned_to": "",
        "created_at": now, "updated_at": now,
    })
    return {"ok": True}
