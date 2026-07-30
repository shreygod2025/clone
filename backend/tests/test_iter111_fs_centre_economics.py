"""Iteration 111 tests
Covers:
- Perf: GET /api/school-expenses returns lean payload (no data: base64 URIs), fast
- Future Skills Centre Economics CRUD (POST/GET/PATCH/DELETE)
- Mirror to school_expenses (program_key=future_skills), category mapping
- Reports KPI extras (aov, cost, profit, profit_margin_pct)
- Permission gating with a temp team_user holding only future_skills.economics
"""
import os
import time
import uuid
import pytest
import requests

def _read_frontend_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        return None
    return None

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_env() or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "OllistheBest@2026"

FS_CATEGORY_MAP = {
    "rent": "rent",
    "teacher_cost": "teacher_cost",
    "capex": "kit_cost",
    "marketing": "marketing_cost",
    "other": "other",
}


# ────────────────────── Session-scoped fixtures ──────────────────────
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def a_centre_id(admin_headers):
    """Get (or create) a centre we can attach economics entries to."""
    r = requests.get(f"{API}/admin/future-skills/centres", headers=admin_headers, timeout=30)
    if r.status_code == 200:
        data = r.json()
        centres = data.get("centres") if isinstance(data, dict) else data
        if centres:
            return centres[0]["id"]
    # Fallback: use plain /admin/centers listing
    r2 = requests.get(f"{API}/centers", headers=admin_headers, timeout=30)
    if r2.status_code == 200 and r2.json():
        return r2.json()[0]["id"]
    pytest.skip("No centre available to attach centre-economics entries to")


@pytest.fixture(scope="session")
def created_entry_ids():
    return []


# ────────────────────── PERF: /api/school-expenses ──────────────────────
class TestExpensesPerf:
    def test_school_expenses_lean_and_fast(self, admin_headers):
        t0 = time.perf_counter()
        r = requests.get(f"{API}/school-expenses", headers=admin_headers, timeout=30)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        body = r.text
        size_kb = len(body) / 1024
        print(f"school-expenses payload={size_kb:.1f}KB, elapsed={elapsed_ms:.0f}ms, rows={len(r.json())}")
        # No base64 data: URIs should leak through
        assert "data:image" not in body and "data:application" not in body, "Base64 data URI leaked in response"
        # Soft budget checks (log-only if breached slightly)
        assert size_kb < 500, f"Payload {size_kb:.1f}KB too heavy (should be lean)"
        # Preview infra may add latency; keep generous ceiling
        assert elapsed_ms < 5000, f"Response took {elapsed_ms:.0f}ms"


# ────────────────────── CENTRE ECONOMICS CRUD ──────────────────────
class TestCentreEconomicsCRUD:
    def test_categories_endpoint(self, admin_headers):
        r = requests.get(f"{API}/admin/future-skills/centre-economics/categories", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        keys = {c["key"] for c in data["categories"]}
        assert keys == {"rent", "teacher_cost", "capex", "marketing", "other"}

    @pytest.mark.parametrize("category,amount", [
        ("rent", 15000.0),
        ("teacher_cost", 22000.0),
        ("capex", 8000.0),
        ("marketing", 3500.0),
        ("other", 999.0),
    ])
    def test_create_and_mirror(self, admin_headers, a_centre_id, created_entry_ids, category, amount):
        payload = {
            "center_id": a_centre_id,
            "category": category,
            "amount": amount,
            "expense_date": "2026-01-15",
            "description": f"TEST_iter111 {category}",
            "vendor_name": "TEST vendor",
        }
        if category == "other":
            payload["other_label"] = "Internet Bill"

        r = requests.post(
            f"{API}/admin/future-skills/centre-economics",
            headers=admin_headers, json=payload, timeout=30,
        )
        assert r.status_code == 200, f"POST failed: {r.status_code} {r.text}"
        entry = r.json()["entry"]
        assert entry["fs_center_id"] == a_centre_id
        assert entry["fs_category"] == category
        assert float(entry["amount"]) == amount
        # Category mapping into main expenses schema
        assert entry["category"] == FS_CATEGORY_MAP[category], f"category mapping wrong for {category}"
        assert entry["program_key"] == "future_skills"
        assert entry["fs_center_name"]
        if category == "other":
            assert entry["fs_category_label"] == "Internet Bill"

        eid = entry["id"]
        created_entry_ids.append(eid)

        # Verify mirror exists in /school-expenses list
        r2 = requests.get(f"{API}/school-expenses?limit=1000", headers=admin_headers, timeout=30)
        assert r2.status_code == 200
        mirror = next((x for x in r2.json() if x.get("id") == eid), None)
        assert mirror is not None, f"Mirror row missing in school_expenses for entry {eid}"
        assert mirror["category"] == FS_CATEGORY_MAP[category]
        assert mirror.get("program_key") == "future_skills"

    def test_list_summary_and_filters(self, admin_headers, a_centre_id, created_entry_ids):
        # Ensure at least one entry exists
        assert created_entry_ids, "Prior CRUD test must have run"

        r = requests.get(f"{API}/admin/future-skills/centre-economics", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "entries" in data and "summary" in data
        s = data["summary"]
        for k in ("revenue", "cost", "profit", "margin_pct", "cost_by_category"):
            assert k in s
        # Per-centre roll-up when no center filter
        assert isinstance(data.get("per_centre"), list)

        # Cost totals include our 15000 + 22000 + 8000 + 3500 + 999 = 49499 for this centre entries
        # Filter by centre
        r2 = requests.get(
            f"{API}/admin/future-skills/centre-economics",
            headers=admin_headers, params={"center_id": a_centre_id}, timeout=30,
        )
        assert r2.status_code == 200
        d2 = r2.json()
        for e in d2["entries"]:
            assert e["fs_center_id"] == a_centre_id

        # Month filter narrows to Jan 2026
        r3 = requests.get(
            f"{API}/admin/future-skills/centre-economics",
            headers=admin_headers, params={"center_id": a_centre_id, "month": "2026-01"}, timeout=30,
        )
        assert r3.status_code == 200
        for e in r3.json()["entries"]:
            assert e["expense_date"].startswith("2026-01")

    def test_patch_updates_mirror_row(self, admin_headers, created_entry_ids):
        eid = created_entry_ids[0]  # was 'rent' @ 15000
        r = requests.patch(
            f"{API}/admin/future-skills/centre-economics/{eid}",
            headers=admin_headers,
            json={"amount": 17777.0, "description": "TEST_iter111 patched", "category": "marketing"},
            timeout=30,
        )
        assert r.status_code == 200, r.text

        # Fetch mirror row from /school-expenses; should reflect new amount + mapped category
        r2 = requests.get(f"{API}/school-expenses?limit=1000", headers=admin_headers, timeout=30)
        row = next((x for x in r2.json() if x.get("id") == eid), None)
        assert row is not None
        assert float(row["amount"]) == 17777.0
        assert row["description"] == "TEST_iter111 patched"
        assert row["category"] == "marketing_cost", "Mirror should reflect remapped category"

    def test_delete_removes_from_both_listings(self, admin_headers, created_entry_ids):
        eid = created_entry_ids[-1]
        r = requests.delete(
            f"{API}/admin/future-skills/centre-economics/entry/{eid}",
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, r.text

        # Confirm gone from centre-economics
        r2 = requests.get(f"{API}/admin/future-skills/centre-economics", headers=admin_headers, timeout=30)
        assert not any(e["id"] == eid for e in r2.json()["entries"])
        # Confirm gone from school-expenses
        r3 = requests.get(f"{API}/school-expenses?limit=1000", headers=admin_headers, timeout=30)
        assert not any(x.get("id") == eid for x in r3.json())
        created_entry_ids.remove(eid)

    def test_delete_endpoint_path_does_not_collide_with_catchall(self, admin_headers, created_entry_ids):
        """/admin/future-skills/centre-economics/entry/{id} shouldn't hit the
        catch-all DELETE /admin/future-skills/{entity_type}/{entity_id}."""
        r = requests.delete(
            f"{API}/admin/future-skills/centre-economics/entry/does-not-exist-xyz",
            headers=admin_headers, timeout=30,
        )
        # Should be 404 from the economics handler (not a 200 no-op from catch-all)
        assert r.status_code == 404


# ────────────────────── REPORTS: KPI extras ──────────────────────
class TestReportsKpis:
    def test_reports_includes_aov_cost_profit_margin(self, admin_headers):
        r = requests.get(f"{API}/admin/future-skills/reports", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        rev = data.get("revenue") or {}
        for key in ("total", "aov", "cost", "profit", "profit_margin_pct"):
            assert key in rev, f"Missing revenue.{key}"

        total = float(rev["total"])
        aov = float(rev["aov"])
        margin = float(rev["profit_margin_pct"])
        if total <= 0:
            # 0 revenue case → aov=0, margin=0
            assert aov == 0.0
            assert margin == 0.0
        else:
            assert aov >= 0
            # profit == total - cost (approx)
            assert abs(float(rev["profit"]) - (total - float(rev["cost"]))) < 0.5


# ────────────────────── PERMISSION GATING ──────────────────────
class TestPermissionGating:
    """Create a temp team user with ONLY future_skills.economics permission,
    verify they can hit centre-economics endpoints but NOT (say) leads."""

    @pytest.fixture(scope="class")
    def temp_user(self, admin_headers, a_centre_id):
        suffix = uuid.uuid4().hex[:8]
        email = f"TEST_econ_{suffix}@example.com"
        payload = {
            "email": email,
            "password": "TestPass@2026",
            "name": "TEST Econ Only",
            "username": f"test_econ_{suffix}",
            "permissions": ["future_skills.economics"],
        }
        r = requests.post(f"{API}/team-users", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code == 200, f"create team user failed: {r.status_code} {r.text}"
        uid = r.json()["id"]
        # Login as this user
        r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": "TestPass@2026"}, timeout=30)
        assert r2.status_code == 200, r2.text
        token = r2.json()["access_token"]
        yield {"id": uid, "email": email, "token": token, "headers": {"Authorization": f"Bearer {token}"}}
        # cleanup
        requests.delete(f"{API}/team-users/{uid}", headers=admin_headers, timeout=30)

    def test_econ_perm_can_list(self, temp_user):
        r = requests.get(f"{API}/admin/future-skills/centre-economics", headers=temp_user["headers"], timeout=30)
        assert r.status_code == 200, f"expected 200, got {r.status_code} {r.text}"

    def test_econ_perm_can_create_patch_delete(self, temp_user, a_centre_id):
        # CREATE
        r = requests.post(
            f"{API}/admin/future-skills/centre-economics",
            headers=temp_user["headers"],
            json={
                "center_id": a_centre_id, "category": "capex",
                "amount": 111.0, "expense_date": "2026-01-20",
                "description": "TEST_iter111 perm user",
            },
            timeout=30,
        )
        assert r.status_code == 200, f"POST expected 200, got {r.status_code} {r.text}"
        eid = r.json()["entry"]["id"]

        # PATCH
        r2 = requests.patch(
            f"{API}/admin/future-skills/centre-economics/{eid}",
            headers=temp_user["headers"], json={"amount": 222.0}, timeout=30,
        )
        assert r2.status_code == 200

        # DELETE
        r3 = requests.delete(
            f"{API}/admin/future-skills/centre-economics/entry/{eid}",
            headers=temp_user["headers"], timeout=30,
        )
        assert r3.status_code == 200

    def test_econ_perm_denied_on_other_fs_endpoints(self, temp_user):
        """User with ONLY future_skills.economics should NOT be able to access
        broader FS admin endpoints (which require _is_admin=True i.e. the wider
        `future_skills` perm)."""
        r = requests.get(
            f"{API}/admin/future-skills/leads",
            headers=temp_user["headers"], timeout=30,
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code} {r.text[:200]}"

    def test_no_perm_user_gets_403(self, admin_headers, a_centre_id):
        """A user with NO relevant perms should get 403 on centre-economics endpoints."""
        suffix = uuid.uuid4().hex[:8]
        email = f"TEST_noperm_{suffix}@example.com"
        r = requests.post(
            f"{API}/team-users", headers=admin_headers,
            json={
                "email": email, "password": "TestPass@2026",
                "name": "TEST No Perm", "username": f"test_noperm_{suffix}",
                "permissions": [],
            }, timeout=30,
        )
        assert r.status_code == 200, r.text
        uid = r.json()["id"]
        try:
            r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": "TestPass@2026"}, timeout=30)
            tok = r2.json()["access_token"]
            h = {"Authorization": f"Bearer {tok}"}

            r3 = requests.get(f"{API}/admin/future-skills/centre-economics", headers=h, timeout=30)
            assert r3.status_code == 403

            r4 = requests.post(
                f"{API}/admin/future-skills/centre-economics",
                headers=h,
                json={"center_id": a_centre_id, "category": "rent", "amount": 1.0},
                timeout=30,
            )
            assert r4.status_code == 403
        finally:
            requests.delete(f"{API}/team-users/{uid}", headers=admin_headers, timeout=30)


# ────────────────────── CLEANUP ──────────────────────
def test_zzz_cleanup(admin_headers, created_entry_ids):
    """Delete any leftover TEST_iter111 entries."""
    for eid in list(created_entry_ids):
        requests.delete(
            f"{API}/admin/future-skills/centre-economics/entry/{eid}",
            headers=admin_headers, timeout=30,
        )
        created_entry_ids.remove(eid)
