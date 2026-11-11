"""
Admin-managed FAQ chatbot settings — /api/admin/faq-settings

Lets admins edit the knowledge base served to OLLBot (the chatbot at /faq)
without a code deploy. Everything lives in a single document in the
`faq_settings` MongoDB collection with id = "main".

Each knowledge section is a free-form string that gets concatenated into
the chatbot's system prompt by `routes/faq_chat.py::build_system_prompt`.

Sections (editable in the admin UI):
  - techfest         Rules, dates, arena/track specs, prizes, regional venues
  - shop             Product catalog overview, categories, delivery, pricing
  - school_products  B2B — school programs, labs, Future Skills, Group 3
  - programs         Camps, workshops, AI Foundations, continuous learning
  - centers          Physical lab locations, batches, B2C classes
  - brochures        Downloadable PDFs — problem statements, program brochures
  - support          Support SLAs, contact channels, escalation flow
  - core_facts       Company facts, URLs, sitemap

Live-data sections (not stored — pulled from MongoDB on every chat request):
  - OLL Shop catalog with real prices & slug URLs (toggle: include_live_products)
  - OLL Centers list with address/phone/email      (toggle: include_live_centers)
  - OLL School Offerings catalog with URLs         (toggle: include_live_offerings)
  - Published blog titles & URLs                   (toggle: include_live_blogs)

Also editable:
  - suggestions      List of starter-question chips shown on /faq
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from database import db
from routes.admin_keys import get_current_user

router = APIRouter()


class YoutubeMapping(BaseModel):
    youtube_url: str = ""
    description: str = ""
    keywords: str = ""


class PreCannedAnswer(BaseModel):
    """An admin-authored Q→A pair that bypasses the LLM entirely.
    When a user's question matches `question` or any of `keywords` (comma-sep),
    the cached `answer` is returned instantly — $0 cost, <50ms latency."""
    question: str = ""
    answer: str = ""
    keywords: str = ""   # comma-separated — multiple phrasings/synonyms


class FaqSettings(BaseModel):
    techfest: str = ""
    shop: str = ""
    school_products: str = ""
    programs: str = ""
    centers: str = ""
    brochures: str = ""
    support: str = ""
    core_facts: str = ""
    # Admin can paste any extra context — exam syllabi, kit datasheets, pricing
    # grids, Excel-copy-paste. Injected verbatim at the end of the prompt.
    extra_knowledge: str = ""
    # List of OLL URLs the admin considers "authoritative" — the bot is told
    # to always link to these when relevant. Not scraped — just referenced.
    training_urls: List[str] = []
    # YouTube videos the bot should embed as answers when the question matches.
    # Rendered as iframes in the chat UI.
    youtube_mappings: List[YoutubeMapping] = []
    suggestions: List[str] = []
    include_live_products: bool = True
    include_live_centers: bool = True
    include_live_offerings: bool = True
    include_live_blogs: bool = True
    # Instant-answer cache. Each entry bypasses the LLM when the user's
    # question matches `question` or any `keywords`. Zero cost per hit.
    pre_canned: List[PreCannedAnswer] = []
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


DEFAULT_SETTINGS = FaqSettings(
    techfest=(
        "OLL × Techfest IIT Bombay 2026-27 Robotics Championship\n"
        "- Three tracks: RoboSumo (combat), RoboRacer (speed), Robotics Innovation Challenge (ideas).\n"
        "- Participation is COMPLETELY FREE across every track and every round.\n"
        "- Prize pool: ₹1,50,000 TOTAL across the whole championship — split as ₹50,000 per competition "
        "(3 competitions), and within each competition the ₹50,000 is further split between the two "
        "age groups (Junior: Grades 4-7, Senior: Grades 8-12). The age-group pool is shared across "
        "that competition's top-3 teams. There is NO ₹1.5 Lakh per track — it is ₹1.5 Lakh in total.\n"
        "- Target students: Grades 5-12.\n"
        "- Team size: 2-4 students + 1 mentor/teacher per team.\n"
        "\n"
        "KEY DATES (2026-27 season — AUTHORITATIVE):\n"
        "- Registration opens: now (free, online).\n"
        "- Registration DEADLINE: October 10, 2026.\n"
        "- Round 1 submission (Innovation Challenge): October 20, 2026 — online 90-sec video + 3-slide PDF.\n"
        "- Submission EDITS (portal https://oll.co/techfest/my-submission — sign in with just the Team ID (no password needed), OR the team leader phone number + WhatsApp OTP, OR email OTP; every field editable): open till 1 November 2026, 11:59 PM IST for all zones; East Zone (IIT Kanpur) till 20 October 2026, 11:59 PM IST.\n"
        "\n"
        "REGIONAL QUALIFIER ROUNDS (physical, Round 2):\n"
        "- East Qualifier  — IIT Kanpur             — Saturday, 24 October 2026\n"
        "- North Qualifier — Modern Public School, Shalimar Bagh, Delhi — Saturday, 21 November 2026\n"
        "- South Qualifier — RVCE College, Bangalore — Thursday, 26 November 2026\n"
        "- West Qualifier  — Venue TBA              — Date TBA\n"
        "- Teams unable to attend their regional qualifier can request a video submission —\n"
        "  reach out to the organisers via info@oll.co.\n"
        "\n"
        "GRAND FINALE:\n"
        "- IIT Bombay, Techfest 2026 campus\n"
        "- Wednesday → Friday · December 16-18, 2026\n"
        "- Top teams from each region face off live on the IIT Bombay competition stage.\n"
        "- Winners announced on 18 December · prizes handed out same evening.\n"
        "\n"
        "OFFICIAL LINKS (always paste these raw — frontend auto-links):\n"
        "- Techfest hub                 → https://oll.co/techfest\n"
        "- Register (all three tracks)  → https://oll.co/techfest/register\n"
        "- Submit Round 1 project       → https://oll.co/techfest/submit\n"
        "- Problem statement (HTML)     → https://oll.co/techfest-iitbombay/problem-statement\n"
        "- RoboSumo page                → https://oll.co/techfest-iitbombay/robo-sumo-competition\n"
        "- RoboRacer page               → https://oll.co/techfest-iitbombay/robo-race-competition\n"
        "- Innovation Challenge page    → https://oll.co/techfest-iitbombay/robo-innovation-competition\n"
        "\n"
        "RoboSumo specs (AUTHORITATIVE — override any older PDF/FAQ):\n"
        "- Arena: 100 cm (1 m) circular diameter.\n"
        "- Bot envelope: 25 × 25 × 25 cm max.\n"
        "- Max weight: 3 kg including battery.\n"
        "- Match: 2 min · 1v1 knockout · first bot pushed out of the ring loses.\n"
        "- Control: autonomous, wired or wireless RC — one radio channel per team.\n"
        "- 2 min grace period to fix a non-functional bot before forfeit.\n"
        "\n"
        "RoboRacer specs (AUTHORITATIVE):\n"
        "- Track: 5 m straight · 2 parallel lanes.\n"
        "- Bot envelope: 20 × 20 × 15 cm max.\n"
        "- Max weight: 1.5 kg including battery.\n"
        "- Heat: 2 min · wireless RC only · first across the finish line wins.\n"
        "\n"
        "Robotics Innovation Challenge:\n"
        "- Round 1 online submission (90-sec video + 3-slide PDF, deadline 20 Oct 2026).\n"
        "- Round 2 live pitch at the IIT Bombay Grand Finale.\n"
        "- Hardware is OPEN — Arduino, ESP32, Raspberry Pi, LLMs, CV, 3D-printed parts, custom PCBs.\n"
        "- Theme: everyday problems solved with robotics + AI (education, agriculture, accessibility, environment).\n"
    ),
    shop=(
        "OLL Shop — robotics kits, curriculum books & electronics components\n"
        "- Main shop URL: https://oll.co/shop (ALL purchases MUST happen here).\n"
        "- Flat ₹150 delivery, pan-India shipping, Cashfree checkout.\n"
        "- 4 sticky-nav categories:\n"
        "  * Curriculum Books (14 titles, Grades 1-10)  → /shop/category/curriculum-books\n"
        "  * Curriculum Robotic Kits (Grade 1-10)       → /shop/category/curriculum-robotic-kits\n"
        "  * Competition & Advanced Kits (RoboSumo, RoboRacer, Drone, Aeromodel, 3D Pen)\n"
        "       → /shop/category/competition-and-advanced-kits\n"
        "  * Individual Components (motors, sensors, Blox, wires, ESP32, AI Vision Blox)\n"
        "       → /shop/category/individual-components\n"
        "- Flagship Techfest kits:\n"
        "  * RoboSumo kit  → https://oll.co/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a\n"
        "  * RoboRacer kit → https://oll.co/shop/product/robo-racer-kit-specially-made-for-iit-bombay-8bf545dc\n"
        "- Order tracking: logged-in users → https://oll.co/my-bookings · others → email info@oll.co.\n"
        "\n"
        "🚫 STRICT POLICY — When someone asks where to buy components, kits, parts or\n"
        "robots, you MUST recommend the OLL Shop ONLY. NEVER mention or link to\n"
        "Robu.in, Amazon, Flipkart, RoboKits India, AliExpress, local electronics\n"
        "markets or any other third-party seller. If a specific OLL product does not\n"
        "exist in the LIVE CATALOG below, say 'this isn\\'t on OLL Shop yet — please\n"
        "email info@oll.co and we\\'ll help you source it.'\n"
        "\n"
        "🔗 PRODUCT LINKING — CRITICAL: Only ever use product URLs that appear verbatim\n"
        "in the LIVE OLL SHOP CATALOG section below. NEVER invent, guess or shorten a\n"
        "product slug (e.g. don\\'t write `/product/book-g-1/` or `/shop/product/mm-coupler-...`\n"
        "unless that exact URL is listed below). If you can\\'t find the exact product\n"
        "URL, link to the matching CATEGORY page or `https://oll.co/shop` instead.\n"
    ),
    school_products=(
        "OLL for Schools — B2B programs (K-12)\n"
        "Landing page: https://oll.co/for-schools (hub for all school programs).\n"
        "Also listed on: https://oll.co/offerings\n"
        "\n"
        "PRODUCT FAMILY · ROBOTICS:\n"
        "- Pre-School — play + explore · Ages 3-5\n"
        "- Robotics & AI Program for Schools (FLAGSHIP) — Grades 1-8 · turnkey lab + curriculum\n"
        "  → https://oll.co/school-offerings/robotics/robotics-lab-setup\n"
        "- ICSE — Group 3 Subject (9th & 10th) — board-mapped elective\n"
        "  → https://oll.co/school-offerings/robotics/icse-group3-kits\n"
        "- Robotics Curriculum with Take-home Kits & Books (Grades 1-10)\n"
        "  → https://oll.co/school-offerings/robotics/robotics-curriculum-kits\n"
        "- Robotics Exhibition Preparation / Host a Robotics Exhibition in your school\n"
        "- Participate in Robotics Competitions at IIT Bombay (Techfest tie-in)\n"
        "- Robotics Books, Robotics Kits (standalone purchases)\n"
        "\n"
        "PRODUCT FAMILY · COMPUTER SCIENCE / FUTURE SKILLS:\n"
        "- ICSE — Future Skills — 4-in-1 (ICT · Coding · AI · Robotics) · Grades 1-8\n"
        "- CBSE — Future Skills — 4-in-1 (ICT · Coding · AI · Robotics) · Grades 1-8\n"
        "- CBSE — Computational Thinking & AI — CBSE Acad-15/2026 elective · Grades 9-10\n"
        "\n"
        "PRODUCT FAMILY · AI & ML:\n"
        "- Launch an AI Center for Excellence (lab setup)\n"
        "  → https://oll.co/school-offerings/ai/ai-center-excellence\n"
        "- Agentic AI Workshop for Students / AI Seminar / Agentic AI Summer Camp\n"
        "- Start AI Services Agency Course (for college students)\n"
        "\n"
        "PRODUCT FAMILY · CODING:\n"
        "- Vibe Coding Seminar\n"
        "- Coding & Logic Building After School Classes\n"
        "  → https://oll.co/school-offerings/coding/coding-afterschool\n"
        "- Coding Summer Camp\n"
        "\n"
        "PRODUCT FAMILY · FINANCIAL LITERACY & ENTREPRENEURSHIP:\n"
        "- Entrepreneurship 3-Day Workshop\n"
        "  → https://oll.co/school-offerings/financial-literacy/entrepreneurship-workshop\n"
        "- Skill Titans TV Show & Entrepreneurship Olympiad\n"
        "- Financial Literacy & Entrepreneurship Program (part of curriculum)\n"
        "- E-Cell Opening in School / FL Summer Camp\n"
        "\n"
        "HOW SCHOOLS ENGAGE:\n"
        "- Book a live demo → https://oll.co/for-schools (program expert walks through lab + syllabus + outcomes).\n"
        "- Email: info@oll.co for a partnership proposal.\n"
        "- Each program ships with: curriculum books, teacher training, lab setup support, student kits (where applicable).\n"
        "- 500+ partner schools, 50K+ students currently.\n"
        "\n"
        "If a user is a school admin / principal / teacher asking about pricing,\n"
        "ALWAYS suggest booking the live demo (programs are quoted per school based on\n"
        "grade bands + student count). Do not fabricate prices.\n"
    ),
    programs=(
        "OLL B2C Programs (students & families)\n"
        "- AI Foundations (NEW · ONLINE · Grades 6-12, max 10 students/cohort, 10-day live course)\n"
        "    → https://oll.co/ai-foundations\n"
        "- Summer Internship Program (real portfolio, stipend on completion)\n"
        "    → https://oll.co/summer-internship\n"
        "- Continuous Learning Program — FLAGSHIP · OFFLINE\n"
        "    Robotics · Coding · AI · 3D Design · Grades 1-10 · once a week at an OLL Center.\n"
        "- Summer Camp 2026 — in-person Mumbai + Online India-wide\n"
        "    Mumbai locations: Andheri West, Mira Road, Dombivli, Dahisar · plus Online all-India.\n"
        "    By skill: Robotics · Coding & Python · AI & ML · 3D Design & Printing · Financial Literacy\n"
        "    By age: 4-6 (Little Explorers) · 6-8 · 8-10 · 10-12 (Tech Creators) · 12-14 · 14-16 (Future Innovators)\n"
        "    → https://oll.co/summer-camp\n"
        "- One-day Workshops & Events\n"
        "    * Father's Day Robotics Workshop → https://oll.co/workshops/fathers-day-robotics\n"
        "    * Mother's Day, Diwali, Christmas hands-on family events (coming soon)\n"
        "- Future Skills program → https://oll.co/future-skills\n"
        "- All offerings hub → https://oll.co/offerings\n"
    ),
    centers=(
        "OLL Centers — Physical labs where kids attend weekly classes\n"
        "Hub: https://oll.co/centers\n"
        "\n"
        "The LIVE CENTERS LIST below is injected automatically on every reply —\n"
        "always quote the exact address / phone / email from that live list, not from\n"
        "memory. If a user asks for a city not in the live list, offer online\n"
        "programs instead (https://oll.co/ai-foundations · https://oll.co/summer-camp).\n"
        "\n"
        "WHAT HAPPENS AT A CENTER:\n"
        "- Weekly 90-min classes (continuous learning · Grades 1-10)\n"
        "- Small batches (max 8-10 students) · dedicated educator\n"
        "- Students build real projects (robots, apps, AI tools) they can take home\n"
        "- Progress reports shared every 4 weeks with parents\n"
        "\n"
        "HOW TO JOIN:\n"
        "- Walk into any center during business hours OR\n"
        "- Book a free trial class at https://oll.co/future-skills OR\n"
        "- Email info@oll.co with your city — the Growth Partners team will\n"
        "  reply with the nearest center + available batch times.\n"
    ),
    brochures=(
        "Downloadable OLL brochures & PDFs\n"
        "- Techfest 2026 Problem Statement PDF → https://oll.co/techfest/problem-statement.pdf\n"
        "- Techfest 2026 Rulebook (HTML)       → https://oll.co/techfest-iitbombay/problem-statement\n"
        "- RoboSumo kit datasheet              → https://oll.co/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a (see 'Kit Includes' section)\n"
        "- RoboRacer kit datasheet             → https://oll.co/shop/product/robo-racer-kit-specially-made-for-iit-bombay-8bf545dc (see 'Kit Includes' section)\n"
        "- Robotics & AI Program brochure (for schools) → request via https://oll.co/for-schools (program expert emails it after demo booking)\n"
        "- Future Skills curriculum brochure (ICSE / CBSE) → request via https://oll.co/for-schools\n"
        "- Summer Camp 2026 brochure           → https://oll.co/summer-camp (scroll to the download button)\n"
        "- AI Foundations course outline       → https://oll.co/ai-foundations\n"
        "- Centers list                        → https://oll.co/centers\n"
        "\n"
        "If a user asks for a brochure that isn\\'t in this list, tell them to email\n"
        "info@oll.co and the Growth Partners team will share it within a few hours.\n"
    ),
    support=(
        "OLL Support Policy\n"
        "- Public FAQs are at https://oll.co/faq (this page — the chatbot).\n"
        "- Support email: info@oll.co · typical response within a few hours during business days.\n"
        "- Business/partnership email: info@oll.co\n"
        "- WhatsApp / instant chat: use the 'Need Help' button at the bottom-right of any page.\n"
        "- Personal account / order / payment questions: ask the visitor to log in first\n"
        "  (https://oll.co/login) so the bot can see their tickets, otherwise escalate to email.\n"
        "- Payment issues: visitor should email info@oll.co with the order id —\n"
        "  resolved within 24h usually.\n"
        "- If the bot cannot answer confidently, offer: 'Would you like me to raise a\n"
        "  support ticket for you?' and point them at the Need Help button.\n"
    ),
    core_facts=(
        "About OLL (On Learn Learn)\n"
        "- OLL is India's leading school robotics, AI and future-skills partner.\n"
        "- 500+ partner schools, 50,000+ students across Grades 1-12.\n"
        "- Website: https://oll.co · Support: info@oll.co · Partnerships: info@oll.co\n"
        "- Head office: Mumbai, India.\n"
        "- NOTE: OLL = On Learn Learn. Do NOT expand it as 'Open League Learning' or anything else.\n"
        "\n"
        "COMPLETE SITEMAP — use these exact URLs when a user asks 'where is X?':\n"
        "- Techfest hub                 → https://oll.co/techfest\n"
        "- Register (all three tracks)  → https://oll.co/techfest/register\n"
        "- Submit Round 1 project       → https://oll.co/techfest/submit\n"
        "- Problem Statement HTML       → https://oll.co/techfest-iitbombay/problem-statement\n"
        "- Problem Statement PDF        → https://oll.co/techfest/problem-statement.pdf\n"
        "- RoboSumo competition page    → https://oll.co/techfest-iitbombay/robo-sumo-competition\n"
        "- RoboRacer competition page   → https://oll.co/techfest-iitbombay/robo-race-competition\n"
        "- Innovation Challenge page    → https://oll.co/techfest-iitbombay/robo-innovation-competition\n"
        "- Main shop                    → https://oll.co/shop\n"
        "- For Schools (B2B hub)        → https://oll.co/for-schools\n"
        "- Offerings catalog            → https://oll.co/offerings\n"
        "- Centers (physical labs)      → https://oll.co/centers\n"
        "- AI Foundations               → https://oll.co/ai-foundations\n"
        "- Future Skills                → https://oll.co/future-skills\n"
        "- Summer Camp 2026             → https://oll.co/summer-camp\n"
        "- Login                        → https://oll.co/login\n"
        "- My bookings / orders         → https://oll.co/my-bookings\n"
        "- Blog                         → https://oll.co/blogs\n"
        "- About OLL                    → https://oll.co/about\n"
    ),
    suggestions=[
        "How do I register my school for Techfest 2026?",
        "When and where are the Techfest regional rounds?",
        "What are the RoboSumo arena specs?",
        "Where can I buy a RoboRacer kit?",
        "What school programs does OLL offer?",
        "Where is my nearest OLL center?",
        "Can I get a brochure for the Robotics & AI Program?",
        "What's the prize money for Techfest winners?",
    ],
    include_live_products=True,
    include_live_centers=True,
    include_live_offerings=True,
    include_live_blogs=True,
    extra_knowledge="",
    training_urls=[
        "https://oll.co/techfest",
        "https://oll.co/techfest-iitbombay/problem-statement",
        "https://oll.co/techfest-iitbombay/robo-sumo-competition",
        "https://oll.co/techfest-iitbombay/robo-race-competition",
        "https://oll.co/techfest-iitbombay/robo-innovation-competition",
        "https://oll.co/shop",
        "https://oll.co/for-schools",
        "https://oll.co/centers",
    ],
    youtube_mappings=[
        YoutubeMapping(
            youtube_url="https://youtu.be/D5ngdbvLMC4",
            description="RoboSumo competition overview video",
            keywords="robo sumo, robosumo, sumo bot, sumo competition, sumo rules",
        ),
        YoutubeMapping(
            youtube_url="https://youtu.be/5Egq4njczf4",
            description="RoboRacer competition overview video",
            keywords="robo race, roboracer, race competition, race rules, rc race",
        ),
        YoutubeMapping(
            youtube_url="https://youtu.be/Px1kNkio0oY",
            description="Robotics Innovation Challenge overview video",
            keywords="innovation challenge, prototype, pitch, innovation competition",
        ),
        YoutubeMapping(
            youtube_url="https://youtu.be/5GsFOwR2gj4",
            description="Student registration guide",
            keywords="student registration, how to register, register as student",
        ),
        YoutubeMapping(
            youtube_url="https://youtu.be/Q-L4rrule-Y",
            description="Educator / Mentor registration guide",
            keywords="mentor registration, educator registration, teacher registration",
        ),
        YoutubeMapping(
            youtube_url="https://youtu.be/Qdqs0hCc1bY",
            description="School registration guide",
            keywords="school registration, how to register school, principal registration",
        ),
        YoutubeMapping(
            youtube_url="https://youtu.be/AwgBPOTevpg",
            description="How to submit Round 1 project",
            keywords="submit, submission, round 1 submission, how to submit project",
        ),
    ],
    pre_canned=[
        PreCannedAnswer(
            question="What is the registration deadline for Techfest 2026?",
            answer=(
                "The **Techfest 2026-27 registration deadline is October 10, 2026**. "
                "Round 1 submission (video + abstract) is due by **October 20, 2026**.\n\n"
                "Register here: https://oll.co/techfest\n\n"
                "Registration is **completely free** — no fee for any track or round."
            ),
            keywords="registration deadline, when register, last date register, registration date, deadline to register",
        ),
        PreCannedAnswer(
            question="When is the Techfest Grand Finale?",
            answer=(
                "The **Techfest Grand Finale** is on **16-18 December 2026 at IIT Bombay**. "
                "Top teams from the five regional qualifiers compete across all three tracks "
                "(RoboSumo, RoboRacer, Robotics Innovation Challenge).\n\n"
                "Details: https://oll.co/techfest"
            ),
            keywords="grand finale, finale date, when finale, iit bombay date, december finale",
        ),
        PreCannedAnswer(
            question="How much is the prize money?",
            answer=(
                "**Total prize pool: ₹1,50,000** across the entire championship (not per track).\n\n"
                "Split structure:\n"
                "- ₹50,000 per competition — RoboSumo · RoboRacer · Robotics Innovation Challenge\n"
                "- Each competition's ₹50,000 is further split between **2 age groups** — "
                "Junior (Grades 4-7) and Senior (Grades 8-12)\n"
                "- Within each age group, the pool is shared across the **top-3 teams**\n\n"
                "Every finalist also gets a Certificate of Finalist Recognition and every "
                "participant gets a Certificate of Participation.\n\n"
                "Payouts via NEFT by May 2027 · bank-details form deadline **31 December 2026**."
            ),
            keywords="prize money, prize pool, how much prize, winning amount, cash prize, prizes",
        ),
        PreCannedAnswer(
            question="What is the team size for Techfest?",
            answer=(
                "**Team size: 3 to 5 students** for RoboSumo and RoboRacer.\n\n"
                "**Robotics Innovation Challenge** also allows individual participation or teams of 1-5 students.\n\n"
                "Each team is accompanied by **1 teacher or 1 parent** as mentor. Each student picks ONLY ONE track."
            ),
            keywords="team size, how many members, team members, students per team, max team",
        ),
        PreCannedAnswer(
            question="How do I contact support?",
            answer=(
                "You can reach the OLL team in three ways:\n\n"
                "- 💬 **WhatsApp**: +91 99201 88188 (fastest)\n"
                "- ✉️ **Email**: info@oll.co\n"
                "- 🎫 **Raise a ticket** using the button below any of my answers\n\n"
                "We usually reply within a few hours on business days."
            ),
            keywords="contact support, how contact, email support, whatsapp support, phone number, how reach",
        ),
    ],
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
    # Saved docs pre-date the North qualifier announcement — splice it in.
    tf = (merged.get("techfest") or "").replace("RV University, Bangalore", "RVCE College, Bangalore")
    merged["techfest"] = tf
    if "Submission EDITS" not in tf and "REGIONAL QUALIFIER ROUNDS" in tf:
        tf = tf.replace("REGIONAL QUALIFIER ROUNDS", "- Submission EDITS (portal https://oll.co/techfest/my-submission — sign in with just the Team ID (no password needed), OR the team leader phone number + WhatsApp OTP, OR email OTP; every field editable): open till 1 November 2026, 11:59 PM IST for all zones; East Zone (IIT Kanpur) till 20 October 2026, 11:59 PM IST.\n\nREGIONAL QUALIFIER ROUNDS", 1)
        merged["techfest"] = tf
    if "Shalimar" not in tf and "- South Qualifier" in tf:
        merged["techfest"] = tf.replace(
            "- South Qualifier",
            "- North Qualifier — Modern Public School, Shalimar Bagh, Delhi — Saturday, 21 November 2026\n- South Qualifier", 1)
    return FaqSettings(**merged)


@router.get("/admin/faq-settings")
async def get_faq_settings(response: Response, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "super_admin"):
        if "settings" not in (user.get("permissions") or []):
            raise HTTPException(status_code=403, detail="Not authorised")
    # Prevent any browser / CDN / proxy from serving a stale copy of the settings
    # after an admin saves — otherwise the next page-load would appear to "revert".
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
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
    # Invalidate the in-memory FAQ response cache so the next public /faq
    # query uses the freshly saved content, not a stale cached reply.
    try:
        from routes.faq_chat import _RESPONSE_CACHE
        _RESPONSE_CACHE.clear()
    except Exception:
        pass
    # Read back from DB to prove the write succeeded and return the authoritative
    # saved document — the frontend uses this to re-sync state so no cached /
    # optimistic value can mask a failed save.
    saved = await read_settings()
    return {
        "ok": True,
        "updated_at": doc["updated_at"],
        "updated_by": doc["updated_by"],
        "settings": saved.model_dump(),
    }
