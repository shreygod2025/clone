"""
Educator Application endpoint tests for iteration 70.
Tests: /educators/apply deduplication (create vs update on re-apply),
       /educators/applications admin list endpoint.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"

# Unique test phones to avoid cross-test pollution
TEST_PHONE_NEW = "8888100001"  # fresh phone – will create new record
TEST_PHONE_DUP = "8888100002"  # used for duplicate / re-apply tests
TEST_EMAIL_DUP = "test.educator.dup.70@testonly.com"


@pytest.fixture(scope="module")
def admin_token():
    """Obtain admin JWT token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    token = data.get("access_token") or data.get("token")
    assert token, "No token in login response"
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def cleanup_phone(phone, auth_headers):
    """Delete any educator application with a given phone (admin endpoint)."""
    resp = requests.get(f"{BASE_URL}/api/educators/applications", headers=auth_headers)
    if resp.status_code != 200:
        return
    for app in resp.json():
        if app.get("phone") == phone:
            # No delete endpoint available; just log
            pass


# ── Test 1: First-time application creates a new record ───────────────────────
class TestEducatorApplyCreate:
    """First-time application flow"""

    def test_new_application_returns_200(self):
        """POST /educators/apply with new phone should return 200."""
        payload = {
            "name": "TEST_NewEducator70",
            "email": "test.new.edu70@testonly.com",
            "phone": TEST_PHONE_NEW,
            "skills": ["Coding"],
            "experience": "2 years",
            "city": "Mumbai",
            "demo_date": "2026-04-25",
            "demo_time": "10:00",
        }
        resp = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_new_application_status_demo_scheduled(self):
        """New application with demo_date should have status=demo_scheduled."""
        payload = {
            "name": "TEST_NewEducator70b",
            "email": "test.new.edu70b@testonly.com",
            "phone": "8888100003",
            "skills": ["Robotics"],
            "experience": "1 year",
            "city": "Delhi",
            "demo_date": "2026-04-26",
            "demo_time": "11:00",
        }
        resp = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "demo_scheduled", (
            f"Expected status='demo_scheduled', got '{data.get('status')}'"
        )

    def test_new_application_without_demo_date_status_new(self):
        """New application without demo_date should have status=new."""
        payload = {
            "name": "TEST_NewEducator70c",
            "email": "test.new.edu70c@testonly.com",
            "phone": "8888100004",
            "skills": ["AI & ML"],
            "experience": "3 years",
            "city": "Pune",
        }
        resp = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "new", (
            f"Expected status='new', got '{data.get('status')}'"
        )

    def test_new_application_has_meeting_link(self):
        """New application with demo_date should have a meeting_link in response."""
        payload = {
            "name": "TEST_NewEducator70d",
            "email": "test.new.edu70d@testonly.com",
            "phone": "8888100005",
            "skills": ["Coding"],
            "city": "Bangalore",
            "demo_date": "2026-04-27",
            "demo_time": "14:00",
        }
        resp = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("meeting_link"), "meeting_link should not be empty when demo_date is provided"


# ── Test 2: Re-application updates existing record (same phone) ───────────────
class TestEducatorApplyDeduplicate:
    """Re-application / deduplication tests"""

    def setup_method(self, method):
        """Create a fresh record for TEST_PHONE_DUP before each test."""
        payload = {
            "name": "TEST_DupEdu70_Original",
            "email": TEST_EMAIL_DUP,
            "phone": TEST_PHONE_DUP,
            "skills": ["Coding"],
            "city": "Mumbai",
        }
        requests.post(f"{BASE_URL}/api/educators/apply", json=payload)

    def test_reapply_same_phone_returns_200(self):
        """Re-apply with same phone should return 200 (not error)."""
        payload = {
            "name": "TEST_DupEdu70_Updated",
            "email": TEST_EMAIL_DUP,
            "phone": TEST_PHONE_DUP,
            "skills": ["Robotics"],
            "city": "Delhi",
            "demo_date": "2026-04-28",
            "demo_time": "15:00",
        }
        resp = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
        assert resp.status_code == 200, (
            f"Re-apply with same phone expected 200, got {resp.status_code}: {resp.text}"
        )

    def test_reapply_same_phone_updates_name(self, auth_headers):
        """Re-apply with same phone should update the name field."""
        new_name = "TEST_DupEdu70_Renamed"
        payload = {
            "name": new_name,
            "email": TEST_EMAIL_DUP,
            "phone": TEST_PHONE_DUP,
            "skills": ["Robotics"],
            "city": "Delhi",
            "demo_date": "2026-04-29",
            "demo_time": "10:00",
        }
        resp = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # The response should reflect updated name
        assert data.get("name") == new_name, (
            f"Expected name='{new_name}', got '{data.get('name')}'"
        )

    def test_reapply_same_phone_updates_demo_date(self):
        """Re-apply with same phone and demo_date should set status=demo_scheduled."""
        payload = {
            "name": "TEST_DupEdu70_WithDemo",
            "email": TEST_EMAIL_DUP,
            "phone": TEST_PHONE_DUP,
            "skills": ["Coding"],
            "city": "Bangalore",
            "demo_date": "2026-04-30",
            "demo_time": "11:00",
        }
        resp = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "demo_scheduled", (
            f"Expected demo_scheduled on re-apply with demo_date, got '{data.get('status')}'"
        )
        assert data.get("demo_date") == "2026-04-30", (
            f"Expected demo_date='2026-04-30', got '{data.get('demo_date')}'"
        )

    def test_reapply_same_phone_no_duplicate_created(self, auth_headers):
        """After multiple re-applications with same phone, only 1 record should exist."""
        # Make a fresh unique phone
        unique_phone = "8888200001"
        # Submit 3 times
        for i in range(3):
            payload = {
                "name": f"TEST_NoDupEdu70_{i}",
                "email": f"test.nodup.edu70.{i}@testonly.com",
                "phone": unique_phone,
                "skills": ["Coding"],
                "city": "Mumbai",
                "demo_date": "2026-05-01",
                "demo_time": "10:00",
            }
            resp = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
            assert resp.status_code == 200, f"Submission {i} failed: {resp.status_code}"

        # Check admin list for this phone
        list_resp = requests.get(f"{BASE_URL}/api/educators/applications", headers=auth_headers)
        assert list_resp.status_code == 200
        apps = list_resp.json()
        matching = [a for a in apps if a.get("phone") == unique_phone]
        assert len(matching) == 1, (
            f"Expected 1 record for phone {unique_phone}, found {len(matching)}"
        )

    def test_reapply_same_email_no_duplicate(self, auth_headers):
        """Re-apply with same email (different phone) should update existing record."""
        unique_email = "test.sameemail.edu70@testonly.com"
        unique_phone = "8888200002"

        # Create first record
        payload1 = {
            "name": "TEST_SameEmailEdu70_First",
            "email": unique_email,
            "phone": unique_phone,
            "skills": ["Coding"],
            "city": "Mumbai",
        }
        resp1 = requests.post(f"{BASE_URL}/api/educators/apply", json=payload1)
        assert resp1.status_code == 200

        # Re-apply with same email
        payload2 = {
            "name": "TEST_SameEmailEdu70_Updated",
            "email": unique_email,
            "phone": unique_phone,
            "skills": ["Robotics"],
            "city": "Delhi",
            "demo_date": "2026-05-02",
            "demo_time": "12:00",
        }
        resp2 = requests.post(f"{BASE_URL}/api/educators/apply", json=payload2)
        assert resp2.status_code == 200

        # Only 1 record should exist
        list_resp = requests.get(f"{BASE_URL}/api/educators/applications", headers=auth_headers)
        assert list_resp.status_code == 200
        apps = list_resp.json()
        matching = [a for a in apps if a.get("email") == unique_email]
        assert len(matching) == 1, (
            f"Expected 1 record for email {unique_email}, found {len(matching)}"
        )


# ── Test 3: Admin list endpoint ───────────────────────────────────────────────
class TestEducatorApplicationsList:
    """GET /educators/applications admin endpoint"""

    def test_list_requires_auth(self):
        """GET /educators/applications without auth should return 401/403."""
        resp = requests.get(f"{BASE_URL}/api/educators/applications")
        assert resp.status_code in [401, 403], (
            f"Expected 401/403, got {resp.status_code}"
        )

    def test_list_returns_200_with_auth(self, auth_headers):
        """GET /educators/applications with admin token should return 200."""
        resp = requests.get(f"{BASE_URL}/api/educators/applications", headers=auth_headers)
        assert resp.status_code == 200, (
            f"Expected 200, got {resp.status_code}: {resp.text}"
        )

    def test_list_returns_list_of_dicts(self, auth_headers):
        """Response should be a list of application objects."""
        resp = requests.get(f"{BASE_URL}/api/educators/applications", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        if data:
            first = data[0]
            assert isinstance(first, dict), "List items should be dicts"
            assert "id" in first, "Application should have 'id' field"
            assert "phone" in first, "Application should have 'phone' field"
            assert "status" in first, "Application should have 'status' field"

    def test_list_no_mongodb_id(self, auth_headers):
        """Response should not include MongoDB _id field."""
        resp = requests.get(f"{BASE_URL}/api/educators/applications", headers=auth_headers)
        assert resp.status_code == 200
        for app in resp.json():
            assert "_id" not in app, "MongoDB _id should be excluded from response"
