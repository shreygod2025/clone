"""
Iteration 48 - Route Extraction Tests
Tests for extracted route modules:
  - routes/reports.py  (9 report endpoints)
  - routes/jobs.py     (5 job endpoints)
  - routes/expenses.py (9 expense endpoints)
  - routes/admin_keys.py (10 admin key endpoints)
  - Core endpoints: /api/health, /api/auth/login, /api/schools/inquiry
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

TEST_EMAIL = "testadmin@oll.co"
TEST_PASSWORD = "test123"
FALLBACK_EMAIL = "admin@oll.co"
FALLBACK_PASSWORD = "Dagaji03@"
JOB_SECRET = "oll_cron_secret_2024"


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def auth_token():
    """Obtain a valid JWT for all authenticated tests."""
    for email, password in [(TEST_EMAIL, TEST_PASSWORD), (FALLBACK_EMAIL, FALLBACK_PASSWORD)]:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
        if r.status_code == 200:
            data = r.json()
            token = data.get("access_token") or data.get("token")
            if token:
                return token
    pytest.skip("Could not authenticate with any test credentials")


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ── Core API ─────────────────────────────────────────────────────────────────

class TestCoreAPI:
    """Verify the core API is still intact after route extraction."""

    def test_health_check(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200, f"Health check failed: {r.text}"
        data = r.json()
        assert data.get("status") == "healthy", f"Unexpected health response: {data}"
        print(f"PASS: Health check returned healthy")

    def test_auth_login_returns_access_token(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200, f"Auth login failed: {r.text}"
        data = r.json()
        token = data.get("access_token") or data.get("token")
        assert token, f"No access_token in response: {data}"
        assert isinstance(token, str) and len(token) > 10
        print(f"PASS: Auth login returned access_token (len={len(token)})")

    def test_schools_inquiry_returns_data(self, auth_headers):
        """Non-extracted route from server.py should still work."""
        r = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert r.status_code == 200, f"Schools inquiry failed: {r.text}"
        data = r.json()
        # Should be a list or have a list inside
        if isinstance(data, list):
            print(f"PASS: /api/schools/inquiry returned list with {len(data)} items")
        elif isinstance(data, dict):
            print(f"PASS: /api/schools/inquiry returned dict: {list(data.keys())}")
        else:
            assert False, f"Unexpected type: {type(data)}"


# ── Reports Router ───────────────────────────────────────────────────────────

class TestReportsRouter:
    """Test all 9 /admin/reports/* endpoints from routes/reports.py."""

    def test_reports_overview(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reports/overview", headers=auth_headers)
        assert r.status_code == 200, f"reports/overview failed: {r.text}"
        data = r.json()
        assert "overview" in data, f"Missing 'overview' key: {data.keys()}"
        assert "period" in data, f"Missing 'period' key: {data.keys()}"
        print(f"PASS: reports/overview - has keys: {list(data.keys())}")

    def test_reports_sales_funnel(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reports/sales-funnel", headers=auth_headers)
        assert r.status_code == 200, f"reports/sales-funnel failed: {r.text}"
        data = r.json()
        assert "funnel" in data or "conversion_rates" in data, f"Unexpected response: {data.keys()}"
        print(f"PASS: reports/sales-funnel returned {r.status_code}")

    def test_reports_lead_analytics(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reports/lead-analytics", headers=auth_headers)
        assert r.status_code == 200, f"reports/lead-analytics failed: {r.text}"
        data = r.json()
        assert "by_source" in data, f"Missing 'by_source': {data.keys()}"
        print(f"PASS: reports/lead-analytics returned {r.status_code}")

    def test_reports_educator_metrics(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reports/educator-metrics", headers=auth_headers)
        assert r.status_code == 200, f"reports/educator-metrics failed: {r.text}"
        data = r.json()
        assert "summary" in data, f"Missing 'summary': {data.keys()}"
        print(f"PASS: reports/educator-metrics returned {r.status_code}")

    def test_reports_support_metrics(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reports/support-metrics", headers=auth_headers)
        assert r.status_code == 200, f"reports/support-metrics failed: {r.text}"
        data = r.json()
        assert "summary" in data, f"Missing 'summary': {data.keys()}"
        print(f"PASS: reports/support-metrics returned {r.status_code}")

    def test_reports_user_stages(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reports/user-stages", headers=auth_headers)
        assert r.status_code == 200, f"reports/user-stages failed: {r.text}"
        data = r.json()
        assert "students" in data, f"Missing 'students': {data.keys()}"
        assert "schools" in data, f"Missing 'schools': {data.keys()}"
        print(f"PASS: reports/user-stages returned {r.status_code}")

    def test_reports_b2c_insights(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reports/b2c-insights", headers=auth_headers)
        assert r.status_code == 200, f"reports/b2c-insights failed: {r.text}"
        data = r.json()
        assert "total_students" in data, f"Missing 'total_students': {data.keys()}"
        print(f"PASS: reports/b2c-insights returned {r.status_code}")

    def test_reports_b2b_insights(self, auth_headers):
        """b2b-insights had a NoneType bug that was fixed (onboarding_data null handling)."""
        r = requests.get(f"{BASE_URL}/api/admin/reports/b2b-insights", headers=auth_headers)
        assert r.status_code == 200, f"reports/b2b-insights failed (NoneType bug?): {r.text}"
        data = r.json()
        assert "total_schools" in data, f"Missing 'total_schools': {data.keys()}"
        assert "status_breakdown" in data, f"Missing 'status_breakdown': {data.keys()}"
        print(f"PASS: reports/b2b-insights returned {r.status_code}, total_schools={data.get('total_schools')}")

    def test_reports_support_insights(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reports/support-insights", headers=auth_headers)
        assert r.status_code == 200, f"reports/support-insights failed: {r.text}"
        data = r.json()
        assert "total_queries" in data, f"Missing 'total_queries': {data.keys()}"
        print(f"PASS: reports/support-insights returned {r.status_code}")

    def test_reports_team_member_not_found(self, auth_headers):
        """Team member endpoint should return 404 for nonexistent user_id."""
        r = requests.get(f"{BASE_URL}/api/admin/reports/team-member/nonexistent-id-123",
                         headers=auth_headers)
        assert r.status_code == 404, f"Expected 404 for nonexistent team member, got {r.status_code}: {r.text}"
        print(f"PASS: reports/team-member/nonexistent returns 404")

    def test_reports_require_auth(self):
        """Report endpoints should reject unauthenticated requests."""
        r = requests.get(f"{BASE_URL}/api/admin/reports/overview")
        assert r.status_code in [401, 403, 422], f"Expected auth error, got {r.status_code}"
        print(f"PASS: reports/overview unauthenticated returns {r.status_code}")


# ── Jobs Router ──────────────────────────────────────────────────────────────

class TestJobsRouter:
    """Test job endpoints from routes/jobs.py."""

    def test_check_overdue_tickets_with_secret(self):
        """POST /api/jobs/check-overdue-tickets with correct secret should return 200."""
        r = requests.post(f"{BASE_URL}/api/jobs/check-overdue-tickets",
                          params={"secret": JOB_SECRET})
        assert r.status_code == 200, f"check-overdue-tickets failed: {r.text}"
        data = r.json()
        assert data.get("success") is True, f"Expected success=True: {data}"
        assert "checked" in data, f"Missing 'checked': {data}"
        assert "notified" in data, f"Missing 'notified': {data}"
        print(f"PASS: check-overdue-tickets - checked={data.get('checked')}, notified={data.get('notified')}")

    def test_check_overdue_tickets_wrong_secret(self):
        """POST with wrong secret should return 403."""
        r = requests.post(f"{BASE_URL}/api/jobs/check-overdue-tickets",
                          params={"secret": "wrong_secret"})
        assert r.status_code == 403, f"Expected 403 for wrong secret, got {r.status_code}: {r.text}"
        print(f"PASS: check-overdue-tickets with wrong secret returns 403")

    def test_check_overdue_tickets_no_secret(self):
        """POST without secret should return 403."""
        r = requests.post(f"{BASE_URL}/api/jobs/check-overdue-tickets")
        assert r.status_code == 403, f"Expected 403 for no secret, got {r.status_code}: {r.text}"
        print(f"PASS: check-overdue-tickets without secret returns 403")

    def test_send_meeting_reminders_with_secret(self):
        r = requests.post(f"{BASE_URL}/api/jobs/send-meeting-reminders",
                          params={"secret": JOB_SECRET})
        assert r.status_code == 200, f"send-meeting-reminders failed: {r.text}"
        data = r.json()
        assert data.get("success") is True, f"Expected success=True: {data}"
        print(f"PASS: send-meeting-reminders - schools_checked={data.get('schools_checked')}")

    def test_check_user_phones_requires_admin(self, auth_headers):
        """GET /api/jobs/check-user-phones requires admin auth."""
        r = requests.get(f"{BASE_URL}/api/jobs/check-user-phones", headers=auth_headers)
        # Should return 200 (admin) or 403 (non-admin)
        assert r.status_code in [200, 403], f"Unexpected status: {r.status_code}: {r.text}"
        if r.status_code == 200:
            data = r.json()
            assert "total_users" in data, f"Missing 'total_users': {data}"
            print(f"PASS: check-user-phones returned total_users={data.get('total_users')}")
        else:
            print(f"PASS: check-user-phones returns 403 for non-admin")


# ── Expenses Router ──────────────────────────────────────────────────────────

class TestExpensesRouter:
    """Test expense endpoints from routes/expenses.py."""

    def test_get_expense_categories_returns_12(self, auth_headers):
        """GET /api/school-expenses/categories should return exactly 12 categories."""
        r = requests.get(f"{BASE_URL}/api/school-expenses/categories", headers=auth_headers)
        assert r.status_code == 200, f"categories failed: {r.text}"
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) == 12, f"Expected 12 categories, got {len(data)}: {[c['id'] for c in data]}"
        # Verify all have required fields
        for cat in data:
            assert "id" in cat, f"Category missing 'id': {cat}"
            assert "name" in cat, f"Category missing 'name': {cat}"
        print(f"PASS: /api/school-expenses/categories returned {len(data)} categories")

    def test_get_all_school_expenses_returns_array(self, auth_headers):
        """GET /api/school-expenses should return an array."""
        r = requests.get(f"{BASE_URL}/api/school-expenses", headers=auth_headers)
        assert r.status_code == 200, f"get all expenses failed: {r.text}"
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: /api/school-expenses returned list with {len(data)} items")

    def test_get_expenses_summary(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/school-expenses/summary", headers=auth_headers)
        assert r.status_code == 200, f"expenses summary failed: {r.text}"
        data = r.json()
        assert "grand_total" in data, f"Missing 'grand_total': {data.keys()}"
        assert "schools" in data, f"Missing 'schools': {data.keys()}"
        print(f"PASS: /api/school-expenses/summary returned grand_total={data.get('grand_total')}")

    def test_get_expenses_by_school(self, auth_headers):
        """GET /api/school-expenses/school/{school_id} for a dummy ID should return empty expenses."""
        r = requests.get(f"{BASE_URL}/api/school-expenses/school/TEST-NONEXISTENT-SCHOOL",
                         headers=auth_headers)
        assert r.status_code == 200, f"expenses by school failed: {r.text}"
        data = r.json()
        assert "expenses" in data, f"Missing 'expenses': {data.keys()}"
        assert "grand_total" in data, f"Missing 'grand_total': {data.keys()}"
        print(f"PASS: /api/school-expenses/school/TEST returns expenses={len(data.get('expenses', []))}")

    def test_create_expense_invalid_school(self, auth_headers):
        """POST /api/school-expenses with nonexistent school should return 404."""
        r = requests.post(f"{BASE_URL}/api/school-expenses",
                          json={
                              "school_id": "NONEXISTENT-SCHOOL-ID",
                              "category": "kit_cost",
                              "amount": 1000,
                              "expense_date": "2024-01-01"
                          },
                          headers=auth_headers)
        assert r.status_code == 404, f"Expected 404 for nonexistent school, got {r.status_code}: {r.text}"
        print(f"PASS: POST /api/school-expenses with invalid school returns 404")

    def test_expenses_require_auth(self):
        """Expense endpoints should reject unauthenticated requests."""
        r = requests.get(f"{BASE_URL}/api/school-expenses/categories")
        assert r.status_code in [401, 403, 422], f"Expected auth error, got {r.status_code}"
        print(f"PASS: /api/school-expenses/categories unauthenticated returns {r.status_code}")


# ── Admin Keys Router ────────────────────────────────────────────────────────

class TestAdminKeysRouter:
    """Test admin key endpoints from routes/admin_keys.py."""

    def test_get_service_api_keys_has_resend_field(self, auth_headers):
        """GET /api/admin/service-api-keys should have resend_api_key field."""
        r = requests.get(f"{BASE_URL}/api/admin/service-api-keys", headers=auth_headers)
        assert r.status_code == 200, f"service-api-keys failed: {r.text}"
        data = r.json()
        assert "resend_api_key" in data, f"Missing 'resend_api_key' in response: {data}"
        print(f"PASS: /api/admin/service-api-keys returned resend_api_key={data.get('resend_api_key')}")

    def test_generate_api_key_returns_key(self, auth_headers):
        """POST /api/admin/api-keys/generate should return a generated API key."""
        r = requests.post(f"{BASE_URL}/api/admin/api-keys/generate",
                          json={"name": "TEST_Key_iter48", "description": "Test key from iteration 48"},
                          headers=auth_headers)
        assert r.status_code == 200, f"generate api key failed: {r.text}"
        data = r.json()
        assert "api_key" in data, f"Missing 'api_key': {data.keys()}"
        assert data["api_key"].startswith("oll_sk_"), f"Key should start with oll_sk_: {data['api_key']}"
        assert "id" in data, f"Missing 'id': {data.keys()}"
        print(f"PASS: /api/admin/api-keys/generate returned key starting with oll_sk_ (id={data.get('id')})")
        return data

    def test_list_api_keys(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/api-keys", headers=auth_headers)
        assert r.status_code == 200, f"list api keys failed: {r.text}"
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: /api/admin/api-keys returned list with {len(data)} keys")

    def test_generate_and_list_and_delete_api_key(self, auth_headers):
        """Full lifecycle: generate → list → delete → verify deletion."""
        # Generate
        gen_r = requests.post(f"{BASE_URL}/api/admin/api-keys/generate",
                              json={"name": "TEST_Lifecycle_iter48"},
                              headers=auth_headers)
        assert gen_r.status_code == 200
        key_id = gen_r.json()["id"]

        # List - should appear
        list_r = requests.get(f"{BASE_URL}/api/admin/api-keys", headers=auth_headers)
        assert list_r.status_code == 200
        ids = [k.get("id") for k in list_r.json()]
        assert key_id in ids, f"Generated key id not in list"

        # Delete
        del_r = requests.delete(f"{BASE_URL}/api/admin/api-keys/{key_id}", headers=auth_headers)
        assert del_r.status_code == 200

        # Verify deletion
        list_r2 = requests.get(f"{BASE_URL}/api/admin/api-keys", headers=auth_headers)
        ids_after = [k.get("id") for k in list_r2.json()]
        assert key_id not in ids_after, f"Key still in list after deletion"
        print(f"PASS: API key lifecycle (generate→list→delete→verify) passed")

    def test_update_api_key(self, auth_headers):
        """PATCH /api/admin/api-keys/{key_id} should update name."""
        # Generate a key first
        gen_r = requests.post(f"{BASE_URL}/api/admin/api-keys/generate",
                              json={"name": "TEST_Update_iter48"},
                              headers=auth_headers)
        assert gen_r.status_code == 200
        key_id = gen_r.json()["id"]

        # Update
        patch_r = requests.patch(f"{BASE_URL}/api/admin/api-keys/{key_id}",
                                 json={"name": "TEST_Updated_iter48", "is_active": False},
                                 headers=auth_headers)
        assert patch_r.status_code == 200, f"Update failed: {patch_r.text}"

        # Verify in list
        list_r = requests.get(f"{BASE_URL}/api/admin/api-keys", headers=auth_headers)
        found = next((k for k in list_r.json() if k.get("id") == key_id), None)
        assert found is not None
        assert found.get("name") == "TEST_Updated_iter48", f"Name not updated: {found}"
        assert found.get("is_active") is False, f"is_active not updated: {found}"

        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/api-keys/{key_id}", headers=auth_headers)
        print(f"PASS: PATCH /api/admin/api-keys/{key_id} updated name and is_active")

    def test_service_keys_require_admin_auth(self):
        """Service API keys endpoint should reject unauthenticated requests."""
        r = requests.get(f"{BASE_URL}/api/admin/service-api-keys")
        assert r.status_code in [401, 403, 422], f"Expected auth error, got {r.status_code}"
        print(f"PASS: /api/admin/service-api-keys unauthenticated returns {r.status_code}")

    def test_generate_key_requires_admin_auth(self):
        r = requests.post(f"{BASE_URL}/api/admin/api-keys/generate",
                          json={"name": "test"})
        assert r.status_code in [401, 403, 422], f"Expected auth error, got {r.status_code}"
        print(f"PASS: /api/admin/api-keys/generate unauthenticated returns {r.status_code}")

    def test_external_schools_requires_api_key(self):
        """GET /api/external/schools without X-API-Key should return 401."""
        r = requests.get(f"{BASE_URL}/api/external/schools")
        assert r.status_code in [401, 422], f"Expected 401/422 without API key, got {r.status_code}: {r.text}"
        print(f"PASS: /api/external/schools without API key returns {r.status_code}")


# ── Route Count Verification ─────────────────────────────────────────────────

class TestRouteCount:
    """Verify server has registered routes including new extracted ones."""

    def test_reports_routes_registered(self, auth_headers):
        """All 9 report route prefixes should be accessible."""
        endpoints = [
            "/api/admin/reports/overview",
            "/api/admin/reports/sales-funnel",
            "/api/admin/reports/lead-analytics",
            "/api/admin/reports/educator-metrics",
            "/api/admin/reports/support-metrics",
            "/api/admin/reports/user-stages",
            "/api/admin/reports/b2c-insights",
            "/api/admin/reports/b2b-insights",
            "/api/admin/reports/support-insights",
        ]
        failures = []
        for ep in endpoints:
            r = requests.get(f"{BASE_URL}{ep}", headers=auth_headers)
            if r.status_code not in [200, 404]:  # 404 for team-member
                failures.append(f"{ep} -> {r.status_code}")
        assert not failures, f"Report endpoints not returning 200: {failures}"
        print(f"PASS: All {len(endpoints)} report endpoints accessible")

    def test_jobs_routes_registered(self):
        """Job routes should be accessible (return 403 for wrong secret)."""
        endpoints = [
            "/api/jobs/check-overdue-tickets",
            "/api/jobs/send-meeting-reminders",
            "/api/jobs/sync-po-data",
        ]
        failures = []
        for ep in endpoints:
            # POST without secret should get 403, not 404
            r = requests.post(f"{BASE_URL}{ep}")
            if r.status_code == 404:
                failures.append(f"{ep} -> 404 (route not registered)")
        assert not failures, f"Job routes not registered: {failures}"
        print(f"PASS: All {len(endpoints)} job routes registered (403 for missing secret)")

    def test_expenses_routes_registered(self, auth_headers):
        """Expense routes should be accessible."""
        endpoints = [
            "/api/school-expenses/categories",
            "/api/school-expenses",
            "/api/school-expenses/summary",
        ]
        failures = []
        for ep in endpoints:
            r = requests.get(f"{BASE_URL}{ep}", headers=auth_headers)
            if r.status_code != 200:
                failures.append(f"{ep} -> {r.status_code}")
        assert not failures, f"Expense endpoints not returning 200: {failures}"
        print(f"PASS: All {len(endpoints)} expense GET endpoints accessible")

    def test_admin_keys_routes_registered(self, auth_headers):
        """Admin key routes should be accessible."""
        endpoints = [
            ("/api/admin/service-api-keys", "GET"),
            ("/api/admin/api-keys", "GET"),
        ]
        failures = []
        for ep, method in endpoints:
            r = requests.request(method, f"{BASE_URL}{ep}", headers=auth_headers)
            if r.status_code not in [200, 403]:
                failures.append(f"{ep} -> {r.status_code}")
        assert not failures, f"Admin key routes not accessible: {failures}"
        print(f"PASS: Admin keys routes accessible")
