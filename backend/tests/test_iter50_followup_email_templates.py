"""
Iteration 50: Follow-up Email Template System Tests
- Admin auth endpoint
- GET schools list (find meeting_done school)
- POST /api/schools/{id}/send-meeting-followup (200 with valid payload)
- POST /api/schools/contacts/bulk-email (200)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ─── Auth Fixture ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and return JWT token."""
    # Try admin@oll.co with Dagaji03@ first; fall back to testadmin@oll.co/test123
    for creds in [
        {"email": "admin@oll.co", "password": "Dagaji03@"},
        {"email": "testadmin@oll.co", "password": "test123"},
    ]:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access_token") or data.get("token")
            if token:
                return token
    pytest.skip(f"Admin login failed with all credential sets")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ─── Health ───────────────────────────────────────────────────────────────────

class TestHealth:
    """Basic health check"""

    def test_health_endpoint(self):
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200, f"Health failed: {resp.text}"
        print("PASS: Health endpoint 200")


# ─── Admin Auth ───────────────────────────────────────────────────────────────

class TestAdminAuth:
    """Admin login endpoint"""

    def test_admin_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text[:300]}"
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        print(f"PASS: Admin login returns token: {token[:30]}...")

    def test_admin_login_wrong_password(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "wrongpassword"
        })
        assert resp.status_code in [401, 400, 403], f"Expected auth error, got {resp.status_code}"
        print(f"PASS: Wrong password returns {resp.status_code}")


# ─── Schools List ─────────────────────────────────────────────────────────────

class TestSchoolsList:
    """Schools endpoint — find meeting_done schools"""

    def test_get_schools_list(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert resp.status_code == 200, f"Schools list failed: {resp.status_code} {resp.text[:300]}"
        data = resp.json()
        # Could be a list or dict with 'schools' key
        schools = data if isinstance(data, list) else data.get("schools") or data.get("data") or []
        assert isinstance(schools, list), f"Expected list, got {type(schools)}"
        print(f"PASS: Got {len(schools)} schools")

    def test_schools_list_has_meeting_done(self, auth_headers):
        """Check if there's at least one meeting_done school (needed for followup test)."""
        resp = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        schools = data if isinstance(data, list) else data.get("schools") or data.get("data") or []
        meeting_done = [s for s in schools if s.get("status") == "meeting_done"]
        print(f"INFO: Found {len(meeting_done)} meeting_done school(s)")
        # Not asserting existence — test data may vary; just report


# ─── Send Meeting Follow-up Email ─────────────────────────────────────────────

@pytest.fixture(scope="module")
def meeting_done_school_id(auth_headers):
    """Find a meeting_done school ID, or create/use fallback."""
    resp = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
    if resp.status_code != 200:
        pytest.skip("Could not get schools list")
    data = resp.json()
    schools = data if isinstance(data, list) else data.get("schools") or data.get("data") or []
    meeting_done = [s for s in schools if s.get("status") == "meeting_done"]
    if not meeting_done:
        # Try to get any school with an email to test
        with_email = [s for s in schools if s.get("email")]
        if with_email:
            print(f"WARNING: No meeting_done schools found; using school id={with_email[0].get('id')} with status={with_email[0].get('status')}")
            return with_email[0].get("id")
        pytest.skip("No schools with email found for send-meeting-followup test")
    school = meeting_done[0]
    print(f"INFO: Using meeting_done school: {school.get('school_name')} id={school.get('id')}")
    return school.get("id")


class TestSendMeetingFollowup:
    """POST /api/schools/{id}/send-meeting-followup"""

    def test_send_meeting_followup_valid_payload(self, auth_headers, meeting_done_school_id):
        """Send follow-up email with custom subject and body_html — expect 200."""
        payload = {
            "subject": "Next Steps — OLL Program for Test School",
            "body_html": "<p>Dear Contact, thank you for the meeting. Here are your next steps with OLL.</p>"
        }
        resp = requests.post(
            f"{BASE_URL}/api/schools/{meeting_done_school_id}/send-meeting-followup",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:300]}"
        data = resp.json()
        # Should have sent_to and message fields
        assert "sent_to" in data or "message" in data, f"Unexpected response: {data}"
        print(f"PASS: send-meeting-followup 200: {data}")

    def test_send_meeting_followup_next_steps_template(self, auth_headers, meeting_done_school_id):
        """Send with next_steps template content."""
        school_name = "Test School"
        payload = {
            "subject": f"Next Steps — OLL Program for {school_name}",
            "body_html": """<!DOCTYPE html><html><body><p>Dear there, Thank you for the productive discussion! 
            Here are the next steps to get started with OLL.</p></body></html>"""
        }
        resp = requests.post(
            f"{BASE_URL}/api/schools/{meeting_done_school_id}/send-meeting-followup",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:300]}"
        data = resp.json()
        print(f"PASS: next_steps template email sent: {data.get('message', '')}")

    def test_send_meeting_followup_confirmation_template(self, auth_headers, meeting_done_school_id):
        """Send with confirmation reminder template content."""
        school_name = "Test School"
        payload = {
            "subject": f"Action Required — Confirm OLL Program for {school_name}",
            "body_html": """<!DOCTYPE html><html><body><p>Dear there, We hope you are doing well! 
            Please confirm your enrollment at your earliest convenience.</p></body></html>"""
        }
        resp = requests.post(
            f"{BASE_URL}/api/schools/{meeting_done_school_id}/send-meeting-followup",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:300]}"
        data = resp.json()
        print(f"PASS: confirmation template email sent: {data.get('message', '')}")

    def test_send_meeting_followup_404_invalid_school(self, auth_headers):
        """Non-existent school should return 404."""
        payload = {
            "subject": "Test Subject",
            "body_html": "<p>Test body</p>"
        }
        resp = requests.post(
            f"{BASE_URL}/api/schools/nonexistent-school-id-123/send-meeting-followup",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 404, f"Expected 404 for invalid school, got {resp.status_code}: {resp.text[:200]}"
        print(f"PASS: Invalid school returns 404")

    def test_send_meeting_followup_requires_auth(self, meeting_done_school_id):
        """Should return 401/403 without auth header."""
        payload = {"subject": "Test", "body_html": "<p>Test</p>"}
        resp = requests.post(
            f"{BASE_URL}/api/schools/{meeting_done_school_id}/send-meeting-followup",
            json=payload
        )
        assert resp.status_code in [401, 403], f"Expected auth error, got {resp.status_code}"
        print(f"PASS: Unauthenticated request returns {resp.status_code}")


# ─── Bulk Email ───────────────────────────────────────────────────────────────

class TestBulkEmail:
    """POST /api/schools/contacts/bulk-email"""

    def test_bulk_email_valid_payload(self, auth_headers):
        """Send bulk email with valid contacts, subject and body_html."""
        payload = {
            "contacts": [
                {"email": "test@example.com", "name": "Test User", "school_name": "Test School"}
            ],
            "subject": "Test Bulk Email Subject",
            "body_html": "<p>Hello {{name}}, this is a test email for {{school_name}}.</p>"
        }
        resp = requests.post(
            f"{BASE_URL}/api/schools/contacts/bulk-email",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:300]}"
        data = resp.json()
        assert "sent" in data or "message" in data, f"Unexpected response: {data}"
        print(f"PASS: bulk-email 200: {data}")

    def test_bulk_email_empty_contacts(self, auth_headers):
        """Should return 400 when no contacts provided."""
        payload = {
            "contacts": [],
            "subject": "Test Subject",
            "body_html": "<p>Test body</p>"
        }
        resp = requests.post(
            f"{BASE_URL}/api/schools/contacts/bulk-email",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 400, f"Expected 400 for empty contacts, got {resp.status_code}: {resp.text[:200]}"
        print(f"PASS: Empty contacts returns 400")

    def test_bulk_email_missing_subject(self, auth_headers):
        """Should return 400 when subject is missing."""
        payload = {
            "contacts": [{"email": "test@example.com", "name": "Test"}],
            "subject": "",
            "body_html": "<p>Test body</p>"
        }
        resp = requests.post(
            f"{BASE_URL}/api/schools/contacts/bulk-email",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 400, f"Expected 400 for empty subject, got {resp.status_code}: {resp.text[:200]}"
        print(f"PASS: Empty subject returns 400")

    def test_bulk_email_missing_body(self, auth_headers):
        """Should return 400 when body_html is missing."""
        payload = {
            "contacts": [{"email": "test@example.com", "name": "Test"}],
            "subject": "Test Subject",
            "body_html": ""
        }
        resp = requests.post(
            f"{BASE_URL}/api/schools/contacts/bulk-email",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 400, f"Expected 400 for empty body, got {resp.status_code}: {resp.text[:200]}"
        print(f"PASS: Empty body returns 400")

    def test_bulk_email_requires_auth(self):
        """Should return 401/403 without auth header."""
        payload = {
            "contacts": [{"email": "test@example.com", "name": "Test"}],
            "subject": "Test Subject",
            "body_html": "<p>Test body</p>"
        }
        resp = requests.post(f"{BASE_URL}/api/schools/contacts/bulk-email", json=payload)
        assert resp.status_code in [401, 403], f"Expected auth error, got {resp.status_code}"
        print(f"PASS: Unauthenticated bulk-email returns {resp.status_code}")
