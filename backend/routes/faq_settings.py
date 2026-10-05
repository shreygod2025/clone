"""
Admin-managed FAQ chatbot settings — /api/admin/faq-settings

Lets admins edit the knowledge base served to OLLBot (the chatbot at /faq)
without a code deploy. Everything lives in a single document in the
`faq_settings` MongoDB collection with id = "main".

Each knowledge section is a free-form string that gets concatenated into
the chatbot's system prompt by `routes/faq_chat.py::build_system_prompt`.

Sections (editable in the admin UI):
  - techfest       Rules, dates, arena/track specs, prizes
  - shop           Product catalog overview, categories, delivery, pricing
  - programs       AI Foundations, Future Skills, Summer Camp, Workshops
  - support        Support SLAs, contact channels, escalation flow
  - core_facts     Company facts, URLs, sitemap

Also editable:
  - suggestions    List of starter-question chips shown on /faq
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import db
from routes.admin_keys import get_current_user

router = APIRouter()


class FaqSettings(BaseModel):
    techfest: str = ""
    shop: str = ""
    programs: str = ""
    support: str = ""
    core_facts: str = ""
    suggestions: List[str] = []
    include_live_products: bool = True
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


DEFAULT_SETTINGS = FaqSettings(
    techfest=(
        "OLL × Techfest IIT Bombay 2026-27 Robotics Championship\n"
        "- Three tracks: RoboSumo, RoboRacer, Robotics Innovation Challenge.\n"
        "- Registration deadline: October 10, 2026.\n"
        "- Round 1 submission (Innovation Challenge): October 20, 2026.\n"
        "- Regional qualifiers: East (IIT Kanpur, 24 Oct), South (RVU Bangalore, 26 Nov), West (IIT Bombay, 17 Dec).\n"
        "- Grand Finale: December 16-18, 2026 at IIT Bombay.\n"
        "- Participation is COMPLETELY FREE across all tracks and rounds.\n"
        "- Prize pool: ₹1.5L across top-3 teams per track.\n"
        "- Register: https://oll.co/techfest/register\n"
        "- Problem statement: https://oll.co/techfest-iitbombay/problem-statement\n"
        "\n"
        "RoboSumo specs (AUTHORITATIVE — override any older FAQ):\n"
        "- Arena: 100 cm (1 m) circular diameter.\n"
        "- Bot envelope: 25 × 25 × 25 cm max.\n"
        "- Max weight: 3 kg including battery.\n"
        "- Match: 2 min · 1v1 knockout · first bot pushed out loses.\n"
        "- Control: autonomous, wired or wireless RC — one channel per team.\n"
        "- 2 min grace period to fix a non-functional bot.\n"
        "\n"
        "RoboRacer specs (AUTHORITATIVE — override any older FAQ):\n"
        "- Track: 5 m straight · 2 parallel lanes.\n"
        "- Bot envelope: 20 × 20 × 15 cm max.\n"
        "- Max weight: 1.5 kg including battery.\n"
        "- Heat: 2 min · wireless RC only · first across the finish line wins.\n"
        "\n"
        "Robotics Innovation Challenge:\n"
        "- Two rounds — Round 1 online submission + Round 2 live pitch at IIT Bombay Grand Finale.\n"
        "- Team size: 2-4 students + 1 mentor.\n"
        "- Hardware is OPEN — Arduino, ESP32, Raspberry Pi, LLMs, CV, 3D-printed parts all allowed.\n"
    ),
    shop=(
        "OLL Shop — robotics kits, curriculum books & electronics components\n"
        "- Main shop URL: https://oll.co/shop (ALL purchases MUST happen here).\n"
        "- Flat ₹150 delivery, pan-India shipping, Cashfree checkout.\n"
        "- 4 categories (sticky nav on /shop):\n"
        "  * Curriculum Books (14 titles, Grades 1-10)  → /shop/category/curriculum-books\n"
        "  * Curriculum Robotic Kits (Grade 1-10)       → /shop/category/curriculum-robotic-kits\n"
        "  * Competition & Advanced Kits (RoboSumo, RoboRacer, Drone, Aeromodel, 3D Pen)\n"
        "       → /shop/category/competition-and-advanced-kits\n"
        "  * Individual Components (motors, sensors, Blox, wires, ESP32, AI Vision Blox)\n"
        "       → /shop/category/individual-components\n"
        "- Flagship Techfest kits:\n"
        "  * RoboSumo kit  → https://oll.co/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a\n"
        "  * RoboRacer kit → https://oll.co/shop/product/robo-racer-kit-specially-made-for-iit-bombay-8bf545dc\n"
        "- Order tracking: logged-in users → https://oll.co/my-bookings · others → email support@oll.co.\n"
        "\n"
        "🚫 STRICT POLICY — When someone asks where to buy components, kits, parts or\n"
        "robots, you MUST recommend the OLL Shop ONLY. NEVER mention or link to\n"
        "Robu.in, Amazon, Flipkart, RoboKits India, AliExpress, local electronics\n"
        "markets or any other third-party seller. If a specific OLL product does not\n"
        "exist, say 'this isn't on OLL Shop yet — please email support@oll.co and\n"
        "we'll help you source it.'\n"
    ),
    programs=(
        "OLL Learning Programs\n"
        "- AI Foundations (NEW · online · Grades 6-12, max 10 students/cohort, 10-day live course)\n"
        "    → https://oll.co/ai-foundations\n"
        "- Summer Internship Program (real portfolio, stipend on completion)\n"
        "- Continuous Learning Program (Robotics · Coding · AI · 3D Design · Grades 1-10 · once a week · OFFLINE)\n"
        "- Summer Camp 2026 — Mumbai (Andheri West, Mira Road, Dombivli, Dahisar) + Online India\n"
        "    By skill: Robotics, Coding & Python, AI & ML, 3D Design & Printing, Financial Literacy\n"
        "    By age: 4-6, 6-8, 8-10, 10-12 (Tech Creators), 12-14, 14-16 (Future Innovators)\n"
        "    → https://oll.co/summer-camp\n"
        "- One-day Workshops & Events (Father's Day Robotics, Mother's Day, Diwali, Christmas family events)\n"
        "    → https://oll.co/workshops/fathers-day-robotics\n"
        "- Future Skills program → https://oll.co/future-skills\n"
        "- Centers (physical labs) → https://oll.co/centers\n"
        "- All offerings → https://oll.co/offerings\n"
    ),
    support=(
        "OLL Support Policy\n"
        "- Public FAQs are at https://oll.co/faq (this page — the chatbot).\n"
        "- Email: support@oll.co · typical response within a few hours during business days.\n"
        "- WhatsApp / instant chat: use the 'Need Help' button at the bottom-right of any page.\n"
        "- Personal account / order / payment questions: ask the visitor to log in first\n"
        "  (https://oll.co/login) so the bot can see their tickets, otherwise escalate to email.\n"
        "- Payment issues: visitor should email support@oll.co with the order id —\n"
        "  resolved within 24h usually.\n"
        "- If the bot cannot answer confidently, offer: 'Would you like me to raise a\n"
        "  support ticket for you?' and point them at the Need Help button.\n"
    ),
    core_facts=(
        "About OLL (On Learn Learn)\n"
        "- OLL is India's leading school robotics, AI and future-skills partner.\n"
        "- 400+ partner schools, students across Grades 1-10.\n"
        "- Website: https://oll.co · Support: support@oll.co\n"
        "- Head office: Mumbai, India.\n"
        "\n"
        "COMPLETE SITEMAP — use these exact URLs when a user asks 'where is X?':\n"
        "- Techfest hub                 → https://oll.co/techfest\n"
        "- Register (all three tracks)  → https://oll.co/techfest/register\n"
        "- Submit Round 1 project       → https://oll.co/techfest/submit\n"
        "- Problem Statement HTML       → https://oll.co/techfest-iitbombay/problem-statement\n"
        "- RoboSumo competition page    → https://oll.co/techfest-iitbombay/robo-sumo-competition\n"
        "- RoboRacer competition page   → https://oll.co/techfest-iitbombay/robo-race-competition\n"
        "- Innovation Challenge page    → https://oll.co/techfest-iitbombay/robo-innovation-competition\n"
        "- Main shop                    → https://oll.co/shop\n"
        "- Login                        → https://oll.co/login\n"
        "- My bookings / orders         → https://oll.co/my-bookings\n"
        "- Blog                         → https://oll.co/blogs\n"
        "- About OLL                    → https://oll.co/about\n"
    ),
    suggestions=[
        "How do I register my school for Techfest 2026?",
        "What are the eligibility criteria for RoboSumo?",
        "How much does the RoboRacer kit cost?",
        "What is the Robotics Innovation Challenge about?",
        "When is the Grand Finale at IIT Bombay?",
        "What's included in the OLL curriculum kits?",
        "How do I track my OLL shop order?",
        "What's the prize money for winners?",
    ],
    include_live_products=True,
)


async def read_settings() -> FaqSettings:
    """Return the latest settings doc, merged on top of defaults so a newly
    added field is always present even if the stored doc is older."""
    doc = await db.faq_settings.find_one({"id": "main"}, {"_id": 0})
    if not doc:
        return DEFAULT_SETTINGS
    merged = DEFAULT_SETTINGS.model_dump()
    for key, val in doc.items():
        if key in merged and val is not None:
            merged[key] = val
    return FaqSettings(**merged)


@router.get("/admin/faq-settings")
async def get_faq_settings(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        if "settings" not in (user.get("permissions") or []):
            raise HTTPException(status_code=403, detail="Not authorised")
    s = await read_settings()
    return s.model_dump()


@router.put("/admin/faq-settings")
async def update_faq_settings(payload: FaqSettings, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        if "settings" not in (user.get("permissions") or []):
            raise HTTPException(status_code=403, detail="Not authorised")
    doc = payload.model_dump()
    doc["id"] = "main"
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_by"] = user.get("email") or user.get("id")
    await db.faq_settings.update_one({"id": "main"}, {"$set": doc}, upsert=True)
    return {"ok": True, "updated_at": doc["updated_at"]}
