"""
Iteration 89 — KPI selection + per-user Performance page

Backend tests for:
  - GET /api/kpis/catalog (auth + shape + grouped by 3 categories, 15 KPIs)
  - POST/GET/PATCH/DELETE /api/roles with kpis field
  - GET /api/users/{user_id}/performance (metrics computation, access control, no-kpi state)
"""
import os
import time
import uuid
import bcrypt
import pytest
import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@oll.co")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Dagaji03@")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ── Fixtures ────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:300]}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def mongo_db():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


# ── Test 1: KPI catalog ─────────────────────────────────────────────────────
class TestKpiCatalog:
    def test_catalog_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/kpis/catalog", timeout=15)
        # FastAPI HTTPBearer returns 403 when Authorization is missing
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"

    def test_catalog_returns_15_kpis_grouped(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/kpis/catalog", headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "catalog" in data and "grouped" in data
        cat = data["catalog"]
        assert isinstance(cat, list)
        assert len(cat) == 15, f"expected 15 KPIs, got {len(cat)}"
        for item in cat:
            for k in ("id", "label", "category", "unit"):
                assert k in item, f"KPI missing key {k}: {item}"
        grouped = data["grouped"]
        for key in ("Support Center", "Sales — B2B", "Sales — B2C"):
            assert key in grouped, f"grouped missing category '{key}'; keys={list(grouped.keys())}"
        # Total items across categories should equal 15
        total = sum(len(v) for v in grouped.values())
        assert total == 15


# ── Test 2 & 5: Roles CRUD with kpis ────────────────────────────────────────
class TestRoleKpisCrud:
    def test_role_with_kpis_crud(self, admin_headers):
        payload = {
            "name": f"TEST_KPI_Role_{uuid.uuid4().hex[:8]}",
            "description": "iter89 test",
            "permissions": ["team_admin"],
            "kpis": [
                "support_tickets_assigned",
                "support_tickets_resolved",
                "support_avg_resolution_hours",
                "support_resolution_rate",
            ],
        }
        role_id = None
        try:
            r = requests.post(f"{BASE_URL}/api/roles", headers=admin_headers, json=payload, timeout=15)
            assert r.status_code == 200, r.text[:300]
            role = r.json()
            role_id = role.get("id")
            assert role_id
            assert role.get("kpis") == payload["kpis"], f"kpis mismatch on create: {role.get('kpis')}"

            # GET /api/roles — should contain our role with kpis intact
            r2 = requests.get(f"{BASE_URL}/api/roles", headers=admin_headers, timeout=15)
            assert r2.status_code == 200
            roles = r2.json()
            match = next((x for x in roles if x.get("id") == role_id), None)
            assert match, "created role not found in list"
            assert match.get("kpis") == payload["kpis"]

            # PATCH different kpis
            new_kpis = ["b2b_leads_assigned", "b2b_schools_onboarded"]
            r3 = requests.patch(
                f"{BASE_URL}/api/roles/{role_id}",
                headers=admin_headers,
                json={"kpis": new_kpis},
                timeout=15,
            )
            assert r3.status_code == 200, r3.text[:200]
            updated = r3.json()
            assert updated.get("kpis") == new_kpis, f"kpis after patch: {updated.get('kpis')}"
        finally:
            if role_id:
                requests.delete(f"{BASE_URL}/api/roles/{role_id}", headers=admin_headers, timeout=15)

    def test_role_without_kpis_defaults_empty(self, admin_headers):
        payload = {
            "name": f"TEST_NoKpi_Role_{uuid.uuid4().hex[:8]}",
            "description": "iter89 regression",
            "permissions": ["team_admin"],
        }
        role_id = None
        try:
            r = requests.post(f"{BASE_URL}/api/roles", headers=admin_headers, json=payload, timeout=15)
            assert r.status_code == 200, r.text[:300]
            role = r.json()
            role_id = role.get("id")
            assert role.get("kpis") == [], f"expected empty kpis default, got {role.get('kpis')}"

            r2 = requests.get(f"{BASE_URL}/api/roles", headers=admin_headers, timeout=15)
            got = next((x for x in r2.json() if x.get("id") == role_id), None)
            assert got is not None
            assert got.get("kpis") == []
        finally:
            if role_id:
                requests.delete(f"{BASE_URL}/api/roles/{role_id}", headers=admin_headers, timeout=15)


# ── Helper to seed support_queries and users ────────────────────────────────
def _create_role(admin_headers, kpis=None):
    payload = {
        "name": f"TEST_PerfRole_{uuid.uuid4().hex[:8]}",
        "description": "iter89",
        "permissions": ["team_admin"],
        "kpis": kpis or [],
    }
    r = requests.post(f"{BASE_URL}/api/roles", headers=admin_headers, json=payload, timeout=15)
    assert r.status_code == 200, r.text[:300]
    return r.json()


def _create_team_user(admin_headers, role_id, reports_to=""):
    uniq = uuid.uuid4().hex[:8]
    body = {
        "email": f"TEST_perf_{uniq}@example.com",
        "name": f"TEST Perf {uniq}",
        "phone": "+911234567890",
        "username": f"TEST_perf_{uniq}",
        "password": "TestPass123!",
        "role_id": role_id,
        "city": "Mumbai",
        "reports_to": reports_to,
        "permissions": ["team_admin"],
    }
    r = requests.post(f"{BASE_URL}/api/team-users", headers=admin_headers, json=body, timeout=15)
    assert r.status_code == 200, r.text[:300]
    return r.json().get("id"), body


# ── Test 3: Performance metrics computation for support KPIs ────────────────
class TestPerformanceSupportMetrics:
    def test_performance_support_metrics(self, admin_headers, mongo_db):
        now = datetime.now(timezone.utc)
        month = now.month
        year = now.year

        support_kpis = [
            "support_tickets_assigned",
            "support_tickets_resolved",
            "support_avg_resolution_hours",
            "support_resolution_rate",
        ]
        role = _create_role(admin_headers, kpis=support_kpis)
        role_id = role["id"]
        user_id, _ = _create_team_user(admin_headers, role_id)

        # Seed 3 support_queries: 2 resolved + 1 open
        created_at = now.isoformat()
        # resolution: 2h apart
        upd = datetime(now.year, now.month, min(now.day, 28), now.hour, tzinfo=timezone.utc).isoformat()
        seeded_ids = []
        try:
            for i in range(2):
                doc = {
                    "id": f"TEST_sq_{uuid.uuid4().hex[:8]}",
                    "assigned_to": user_id,
                    "status": "resolved",
                    "subject": "seed",
                    "created_at": created_at,
                    "updated_at": upd,
                }
                mongo_db.support_queries.insert_one(doc)
                seeded_ids.append(doc["id"])
            open_doc = {
                "id": f"TEST_sq_{uuid.uuid4().hex[:8]}",
                "assigned_to": user_id,
                "status": "open",
                "subject": "seed open",
                "created_at": created_at,
                "updated_at": created_at,
            }
            mongo_db.support_queries.insert_one(open_doc)
            seeded_ids.append(open_doc["id"])

            # Call performance endpoint
            r = requests.get(
                f"{BASE_URL}/api/users/{user_id}/performance",
                headers=admin_headers,
                params={"month": month, "year": year},
                timeout=30,
            )
            assert r.status_code == 200, r.text[:400]
            data = r.json()
            assert data.get("user", {}).get("name")
            assert data.get("user", {}).get("role_name")
            assert data.get("month") == month
            assert data.get("year") == year
            kpis_arr = data.get("kpis") or []
            assert isinstance(kpis_arr, list)
            assert len(kpis_arr) == 4, f"expected 4 kpi cards, got {len(kpis_arr)}: {[k.get('id') for k in kpis_arr]}"
            by_id = {k["id"]: k for k in kpis_arr}
            assert by_id["support_tickets_assigned"]["value"] == 3, by_id["support_tickets_assigned"]
            assert by_id["support_tickets_resolved"]["value"] == 2, by_id["support_tickets_resolved"]
            rr = by_id["support_resolution_rate"]["value"]
            # 2/3 → 66.7 (rounded to 1 decimal)
            assert abs(float(rr) - 66.7) < 0.2, f"resolution_rate expected ~66.7 got {rr}"
        finally:
            for sid in seeded_ids:
                mongo_db.support_queries.delete_one({"id": sid})
            requests.delete(f"{BASE_URL}/api/team-users/{user_id}", headers=admin_headers, timeout=15)
            requests.delete(f"{BASE_URL}/api/roles/{role_id}", headers=admin_headers, timeout=15)


# ── Test 4: Access control ──────────────────────────────────────────────────
class TestPerformanceAccessControl:
    def test_non_admin_non_manager_forbidden_then_allowed_after_reports_to(self, admin_headers, mongo_db):
        role_a = _create_role(admin_headers, kpis=["support_tickets_assigned"])
        role_b = _create_role(admin_headers, kpis=["support_tickets_assigned"])
        role_a_id = role_a["id"]
        role_b_id = role_b["id"]

        # Requester (team_user A) — will attempt to view Target (team_user B)
        req_uid, req_body = _create_team_user(admin_headers, role_a_id)
        tgt_uid, tgt_body = _create_team_user(admin_headers, role_b_id)

        try:
            # Login as requester
            lr = requests.post(
                f"{BASE_URL}/api/team-users/login",
                json={"email": req_body["email"], "password": req_body["password"]},
                timeout=15,
            )
            assert lr.status_code == 200, lr.text[:300]
            req_headers = {"Authorization": f"Bearer {lr.json()['access_token']}"}

            now = datetime.now(timezone.utc)
            # 403 case
            r = requests.get(
                f"{BASE_URL}/api/users/{tgt_uid}/performance",
                headers=req_headers,
                params={"month": now.month, "year": now.year},
                timeout=15,
            )
            assert r.status_code == 403, f"expected 403 got {r.status_code} body={r.text[:200]}"

            # Now set target.reports_to = requester
            pr = requests.patch(
                f"{BASE_URL}/api/team-users/{tgt_uid}",
                headers=admin_headers,
                json={"reports_to": req_uid},
                timeout=15,
            )
            assert pr.status_code == 200, pr.text[:200]

            # Should now return 200
            r2 = requests.get(
                f"{BASE_URL}/api/users/{tgt_uid}/performance",
                headers=req_headers,
                params={"month": now.month, "year": now.year},
                timeout=15,
            )
            assert r2.status_code == 200, f"expected 200 got {r2.status_code} body={r2.text[:300]}"
        finally:
            requests.delete(f"{BASE_URL}/api/team-users/{tgt_uid}", headers=admin_headers, timeout=15)
            requests.delete(f"{BASE_URL}/api/team-users/{req_uid}", headers=admin_headers, timeout=15)
            requests.delete(f"{BASE_URL}/api/roles/{role_a_id}", headers=admin_headers, timeout=15)
            requests.delete(f"{BASE_URL}/api/roles/{role_b_id}", headers=admin_headers, timeout=15)


# ── Test 6: No KPIs configured state ────────────────────────────────────────
class TestPerformanceNoKpis:
    def test_no_kpis_state(self, admin_headers):
        role = _create_role(admin_headers, kpis=[])
        role_id = role["id"]
        user_id, _ = _create_team_user(admin_headers, role_id)
        try:
            now = datetime.now(timezone.utc)
            r = requests.get(
                f"{BASE_URL}/api/users/{user_id}/performance",
                headers=admin_headers,
                params={"month": now.month, "year": now.year},
                timeout=15,
            )
            assert r.status_code == 200, r.text[:300]
            data = r.json()
            assert data.get("kpis") == [], f"expected empty kpis, got {data.get('kpis')}"
            assert data.get("message"), "expected a message field explaining no KPIs configured"
        finally:
            requests.delete(f"{BASE_URL}/api/team-users/{user_id}", headers=admin_headers, timeout=15)
            requests.delete(f"{BASE_URL}/api/roles/{role_id}", headers=admin_headers, timeout=15)
