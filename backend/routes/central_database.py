"""
Central Database — city-wise consolidated view of every human across the OLL platform.

Returns one payload with every team member, growth partner, educator (teacher),
school lead, student lead and Future Skills centre grouped by their city so
the admin can drill into a single city and see everyone in one place.

The route is deliberately admin-only — it exposes contact details.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
import re
import logging

from routes.shared import db, get_current_user

router = APIRouter(prefix="/central-database", tags=["central-database"])

logger = logging.getLogger(__name__)


# ─── Static city → (lat, lng) lookup for the map view ─────────────────
# Kept intentionally short (top Indian cities the platform touches).
# Cities that aren't in the table just don't show on the map — they
# still appear in the list view.
CITY_COORDS: Dict[str, tuple] = {
    "mumbai": (19.0760, 72.8777),
    "navi mumbai": (19.0330, 73.0297),
    "thane": (19.2183, 72.9781),
    "dahisar": (19.2495, 72.8600),
    "borivali": (19.2288, 72.8570),
    "andheri": (19.1197, 72.8464),
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "gurgaon": (28.4595, 77.0266),
    "gurugram": (28.4595, 77.0266),
    "noida": (28.5355, 77.3910),
    "faridabad": (28.4089, 77.3178),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867),
    "secunderabad": (17.4399, 78.4983),
    "chennai": (13.0827, 80.2707),
    "coimbatore": (11.0168, 76.9558),
    "madurai": (9.9252, 78.1198),
    "kolkata": (22.5726, 88.3639),
    "howrah": (22.5958, 88.2636),
    "pune": (18.5204, 73.8567),
    "pimpri-chinchwad": (18.6298, 73.7997),
    "ahmedabad": (23.0225, 72.5714),
    "surat": (21.1702, 72.8311),
    "vadodara": (22.3072, 73.1812),
    "rajkot": (22.3039, 70.8022),
    "jaipur": (26.9124, 75.7873),
    "jodhpur": (26.2389, 73.0243),
    "udaipur": (24.5854, 73.7125),
    "kota": (25.2138, 75.8648),
    "lucknow": (26.8467, 80.9462),
    "kanpur": (26.4499, 80.3319),
    "varanasi": (25.3176, 82.9739),
    "agra": (27.1767, 78.0081),
    "prayagraj": (25.4358, 81.8463),
    "allahabad": (25.4358, 81.8463),
    "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577),
    "gwalior": (26.2183, 78.1828),
    "jabalpur": (23.1815, 79.9864),
    "nagpur": (21.1458, 79.0882),
    "nashik": (19.9975, 73.7898),
    "aurangabad": (19.8762, 75.3433),
    "kochi": (9.9312, 76.2673),
    "thiruvananthapuram": (8.5241, 76.9366),
    "trivandrum": (8.5241, 76.9366),
    "kozhikode": (11.2588, 75.7804),
    "calicut": (11.2588, 75.7804),
    "chandigarh": (30.7333, 76.7794),
    "ludhiana": (30.9010, 75.8573),
    "amritsar": (31.6340, 74.8723),
    "patna": (25.5941, 85.1376),
    "ranchi": (23.3441, 85.3096),
    "bhubaneswar": (20.2961, 85.8245),
    "cuttack": (20.4625, 85.8828),
    "raipur": (21.2514, 81.6296),
    "guwahati": (26.1445, 91.7362),
    "shillong": (25.5788, 91.8933),
    "dehradun": (30.3165, 78.0322),
    "shimla": (31.1048, 77.1734),
    "srinagar": (34.0837, 74.7973),
    "goa": (15.2993, 74.1240),
    "panaji": (15.4989, 73.8278),
    "vijayawada": (16.5062, 80.6480),
    "visakhapatnam": (17.6868, 83.2185),
    "mangalore": (12.9141, 74.8560),
    "mysore": (12.2958, 76.6394),
    "mysuru": (12.2958, 76.6394),
}


def _norm_city(v: Any) -> str:
    """Lower-case, trim, strip common suffixes so 'Mumbai ', 'MUMBAI', 'Mumbai, MH'
    all group into a single bucket. Returns '' for unknown/empty."""
    if not v:
        return ""
    s = str(v).strip().lower()
    # Drop trailing state/pincode chunk
    for sep in (",", " - ", " – "):
        if sep in s:
            s = s.split(sep, 1)[0].strip()
    # Collapse whitespace
    s = re.sub(r"\s+", " ", s)
    return s


def _pretty(name: str) -> str:
    if not name:
        return "Unknown"
    return " ".join(w.capitalize() for w in name.split())


def _bucket(cities: Dict[str, dict], city_norm: str, role: str, entity: dict) -> None:
    """Insert an entity into the city → role bucket, creating the row on demand."""
    if not city_norm:
        city_norm = "__unknown__"
    slot = cities.setdefault(city_norm, {
        "city": "Unknown" if city_norm == "__unknown__" else _pretty(city_norm),
        "city_key": city_norm,
        "counts": {},
        "total": 0,
        "entities": {
            "team": [], "growth_partners": [], "teachers": [],
            "schools": [], "students": [], "centers": [], "fs_leads": [],
        },
    })
    slot["entities"][role].append(entity)
    slot["counts"][role] = slot["counts"].get(role, 0) + 1
    slot["total"] += 1


@router.get("/by-city")
async def central_database_by_city(user: dict = Depends(get_current_user)):
    """Return every human across the platform grouped by city.

    Response:
    ```
    {
      "cities": [
        {
          "city": "Mumbai",
          "city_key": "mumbai",
          "lat": 19.076, "lng": 72.877,     # only when known
          "counts": { "team": 3, "students": 42, ... },
          "total": 87,
          "entities": {
            "team":  [{ id, name, email, phone, stage, role }],
            "growth_partners": [ ... ],
            "teachers":        [ ... ],
            "schools":         [ ... ],
            "students":        [ ... ],
            "centers":         [ ... ],
            "fs_leads":        [ ... ]
          }
        },
        ...
      ],
      "totals": { "team": 7, "growth_partners": 31, ... },
      "grand_total": 446
    }
    ```
    """
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")

    cities: Dict[str, dict] = {}

    # ── Team members ────────────────────────────────────────────
    async for u in db.team_users.find(
        {}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "city": 1,
             "role": 1, "role_id": 1, "is_active": 1},
    ):
        c = _norm_city(u.get("city"))
        _bucket(cities, c, "team", {
            "id": u.get("id"),
            "name": u.get("name") or u.get("email") or "—",
            "email": u.get("email") or "",
            "phone": u.get("phone") or "",
            "role": u.get("role") or "team_member",
            "stage": "active" if u.get("is_active", True) else "inactive",
        })

    # ── Growth partners ────────────────────────────────────────
    async for gp in db.growth_partners.find(
        {}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "city": 1,
             "status": 1, "interest_type": 1},
    ):
        c = _norm_city(gp.get("city"))
        _bucket(cities, c, "growth_partners", {
            "id": gp.get("id"),
            "name": gp.get("name") or "—",
            "email": gp.get("email") or "",
            "phone": gp.get("phone") or "",
            "stage": gp.get("status") or "new",
            "role": "growth_partner",
            "meta": gp.get("interest_type") or "",
        })

    # ── Teachers (educator applications) ──────────────────────
    async for ed in db.educator_applications.find(
        {}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "city": 1,
             "status": 1, "skills": 1, "experience": 1},
    ):
        c = _norm_city(ed.get("city"))
        skills = ed.get("skills") or []
        meta = ", ".join(skills) if isinstance(skills, list) else str(skills or "")
        _bucket(cities, c, "teachers", {
            "id": ed.get("id"),
            "name": ed.get("name") or "—",
            "email": ed.get("email") or "",
            "phone": ed.get("phone") or "",
            "stage": ed.get("status") or "applied",
            "role": "teacher",
            "meta": meta,
        })

    # ── Schools (inquiries → all stages) ──────────────────────
    # school_inquiries stores location instead of city.
    async for s in db.school_inquiries.find(
        {}, {"_id": 0, "id": 1, "school_name": 1, "contact_name": 1,
             "email": 1, "phone": 1, "location": 1, "status": 1,
             "total_students": 1},
    ):
        c = _norm_city(s.get("location"))
        _bucket(cities, c, "schools", {
            "id": s.get("id"),
            "name": s.get("school_name") or "—",
            "contact_name": s.get("contact_name") or "",
            "email": s.get("email") or "",
            "phone": s.get("phone") or "",
            "stage": s.get("status") or "inquiry",
            "role": "school",
            "meta": f"{s.get('total_students') or 0} students" if s.get("total_students") else "",
        })

    # ── Students (student_inquiries → all stages) ─────────────
    async for st in db.student_inquiries.find(
        {}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "city": 1,
             "status": 1, "age_group": 1, "skill": 1, "learning_mode": 1},
    ):
        c = _norm_city(st.get("city"))
        meta_parts = [x for x in (st.get("skill"), st.get("age_group"), st.get("learning_mode")) if x]
        _bucket(cities, c, "students", {
            "id": st.get("id"),
            "name": st.get("name") or "—",
            "email": st.get("email") or "",
            "phone": st.get("phone") or "",
            "stage": st.get("status") or "inquiry",
            "role": "student",
            "meta": " · ".join(meta_parts),
        })

    # ── Centres (Future Skills) ───────────────────────────────
    async for ctr in db.centers.find(
        {}, {"_id": 0, "id": 1, "name": 1, "contact_email": 1, "contact_phone": 1,
             "city": 1, "area": 1, "is_active": 1},
    ):
        c = _norm_city(ctr.get("city"))
        _bucket(cities, c, "centers", {
            "id": ctr.get("id"),
            "name": ctr.get("name") or "—",
            "email": ctr.get("contact_email") or "",
            "phone": ctr.get("contact_phone") or "",
            "stage": "active" if ctr.get("is_active", True) else "inactive",
            "role": "center",
            "meta": ctr.get("area") or "",
        })

    # ── Future Skills leads ───────────────────────────────────
    async for lead in db.future_skills_leads.find(
        {}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "city": 1,
             "status": 1, "child_grade": 1, "program_key": 1},
    ):
        c = _norm_city(lead.get("city"))
        meta_parts = [x for x in (lead.get("child_grade"), lead.get("program_key")) if x]
        _bucket(cities, c, "fs_leads", {
            "id": lead.get("id"),
            "name": lead.get("name") or "—",
            "email": lead.get("email") or "",
            "phone": lead.get("phone") or "",
            "stage": lead.get("status") or "new",
            "role": "fs_lead",
            "meta": " · ".join(meta_parts),
        })

    # Attach geo coords where known + sort by total desc for map + list ordering.
    out_cities: List[dict] = []
    grand_total = 0
    totals: Dict[str, int] = {}
    for key, row in cities.items():
        coords = CITY_COORDS.get(key)
        if coords:
            row["lat"] = coords[0]
            row["lng"] = coords[1]
        out_cities.append(row)
        grand_total += row["total"]
        for k, v in row["counts"].items():
            totals[k] = totals.get(k, 0) + v
    out_cities.sort(key=lambda r: (-r["total"], r["city"]))

    return {
        "cities": out_cities,
        "totals": totals,
        "grand_total": grand_total,
    }
