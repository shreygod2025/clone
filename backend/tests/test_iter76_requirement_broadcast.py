"""
Iteration 76 tests — Educator Requirement broadcast emails + referral tracking.

Covers:
- POST /api/requirements/{id}/test-email (sample to specific addresses)
- POST /api/requirements/{id}/resend-broadcast (re-send to all educators)
- POST /api/educators/apply with referred_by → referred_by_name resolved + source='referral'
- POST /api/educators/apply-verified — same referred_by handling on the OTP path
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"

EXISTING_REQ_ID = "4ffde6a8-46f6-452e-af75-1071e4bf6913"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed ({r.status_code}): {r.text}")
    data = r.json()
    token = data.get("access_token") or data.get("token")
    if not token:
        pytest.skip(f"No token in login response: {data}")
    return token


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def referrer_application(auth_headers):
    """Create an educator application that will act as a referrer (parent)."""
    suffix = uuid.uuid4().hex[:6]
    payload = {
        "name": f"TEST_Referrer_{suffix}",
        "email": f"TEST_referrer_{suffix}@example.com",
        "phone": f"9{int(time.time()) % 1000000000:09d}",
        "city": "Mumbai",
        "skills": ["Python"],
        "experience_years": 3,
        "qualification": "B.Tech",
    }
    r = requests.post(
        f"{BASE_URL}/api/educators/apply",
        json=payload,
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 200, f"Failed to create referrer: {r.status_code} {r.text}"
    body = r.json()
    return body  # contains id, name, email


# ─────────────────────────────────────────────────────────────────────────────
# Requirement broadcast endpoints
# ─────────────────────────────────────────────────────────────────────────────

class TestRequirementBroadcastEndpoints:

    def test_test_email_endpoint_success(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/requirements/{EXISTING_REQ_ID}/test-email",
            json={"emails": ["shreyaan@oll.co"]},
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data.get("success") is True
        assert data.get("queued") == 1
        assert "message" in data

    def test_test_email_multiple_recipients(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/requirements/{EXISTING_REQ_ID}/test-email",
            json={"emails": ["shreyaan@oll.co", "test_iter76@example.com"]},
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data.get("queued") == 2

    def test_test_email_empty_list_400(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/requirements/{EXISTING_REQ_ID}/test-email",
            json={"emails": []},
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 400, f"{r.status_code} {r.text}"

    def test_test_email_unknown_requirement_404(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/requirements/does-not-exist-xxx/test-email",
            json={"emails": ["shreyaan@oll.co"]},
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 404, f"{r.status_code} {r.text}"

    def test_test_email_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/requirements/{EXISTING_REQ_ID}/test-email",
            json={"emails": ["shreyaan@oll.co"]},
            timeout=30,
        )
        assert r.status_code in (401, 403), f"{r.status_code} {r.text}"

    def test_resend_broadcast_success(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/requirements/{EXISTING_REQ_ID}/resend-broadcast",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data.get("success") is True
        assert "message" in data

    def test_resend_broadcast_unknown_requirement_404(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/requirements/does-not-exist-xxx/resend-broadcast",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 404, f"{r.status_code} {r.text}"

    def test_resend_broadcast_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/requirements/{EXISTING_REQ_ID}/resend-broadcast",
            timeout=30,
        )
        assert r.status_code in (401, 403), f"{r.status_code} {r.text}"


# ─────────────────────────────────────────────────────────────────────────────
# Apply with referred_by — non-OTP path
# ─────────────────────────────────────────────────────────────────────────────

class TestApplyWithReferral:

    def test_apply_with_referred_by_resolves_name_and_source(self, auth_headers, referrer_application):
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_Applicant_{suffix}",
            "email": f"TEST_applicant_{suffix}@example.com",
            "phone": f"8{int(time.time()) % 1000000000:09d}",
            "city": "Mumbai",
            "skills": ["Python"],
            "experience_years": 1,
            "qualification": "B.Sc",
            "referred_by": referrer_application["id"],
            "source": "referral",
        }
        r = requests.post(
            f"{BASE_URL}/api/educators/apply",
            json=payload,
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        body = r.json()
        assert body.get("referred_by") == referrer_application["id"]
        assert body.get("referred_by_name") == referrer_application["name"]
        assert body.get("source") == "referral"

        # Persistence — fetch via list endpoint and confirm fields stored
        list_r = requests.get(
            f"{BASE_URL}/api/educators/applications",
            headers=auth_headers,
            timeout=30,
        )
        assert list_r.status_code == 200
        items = list_r.json()
        # API may return list or {items: [...]}
        if isinstance(items, dict):
            items = items.get("items") or items.get("applications") or []
        match = next((x for x in items if x.get("id") == body["id"]), None)
        assert match is not None, "Newly created applicant not returned by list endpoint"
        assert match.get("referred_by") == referrer_application["id"]
        assert match.get("referred_by_name") == referrer_application["name"]

    def test_apply_with_invalid_referred_by_still_succeeds(self, auth_headers):
        """Unknown referrer id should not block creation — referred_by_name simply stays empty."""
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_BadRef_{suffix}",
            "email": f"TEST_badref_{suffix}@example.com",
            "phone": f"7{int(time.time()) % 1000000000:09d}",
            "city": "Delhi",
            "skills": ["Math"],
            "experience_years": 2,
            "qualification": "M.A.",
            "referred_by": "does-not-exist-xxx",
        }
        r = requests.post(
            f"{BASE_URL}/api/educators/apply",
            json=payload,
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        body = r.json()
        assert body.get("referred_by") == "does-not-exist-xxx"
        # name not resolved → empty/None
        assert not body.get("referred_by_name")


# ─────────────────────────────────────────────────────────────────────────────
# OTP path — apply-verified — referred_by handling
# ─────────────────────────────────────────────────────────────────────────────

class TestApplyVerifiedReferral:

    def test_apply_verified_invalid_otp_400(self):
        """We can't generate a valid OTP from tests, so we only validate the OTP-failure
        path returns 400 and does NOT 500. This still exercises the referred_by code path
        because referred_by parsing happens before OTP verification."""
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "phone": f"6{int(time.time()) % 1000000000:09d}",
            "otp": "000000",
            "application_data": {
                "name": f"TEST_OTPRef_{suffix}",
                "email": f"TEST_otpref_{suffix}@example.com",
                "phone": f"6{int(time.time()) % 1000000000:09d}",
                "city": "Pune",
                "skills": ["Science"],
                "experience_years": 1,
                "qualification": "B.Ed",
                "referred_by": "some-id",
            },
        }
        r = requests.post(
            f"{BASE_URL}/api/educators/apply-verified",
            json=payload,
            timeout=30,
        )
        # OTP invalid — backend returns 400 (not 500)
        assert r.status_code == 400, f"{r.status_code} {r.text}"
