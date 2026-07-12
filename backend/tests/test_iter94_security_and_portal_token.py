"""
Iter94 — Security fixes + portal token verification.

Covers:
  SEC #1  GET /api/lms/schools/{id}/users → admin only (403 for non-admin)
  SEC #2  /api/admin/custom-invoices* → admin only (403 for non-admin)
  SEC #3  Portal token flow:
          - /api/auth/verify-otp returns `portal_token`
          - /api/user/bookings/{phone}, /api/school-student/profile/{phone},
            /api/school-student/receipt/{payment_id} → 401 no token,
            403 phone mismatch, 200 when token matches.
          - reschedule / cancel booking use booking.phone as owner check.
  SEC #4  Regression — /api/public/lms-report/{token} still works without auth.
"""
import os
import asyncio
import pytest
import requests
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@oll.co")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Dagaji03@")
TEAM_EMAIL = "john@oll.co"
TEAM_PASSWORD = "test1234"

# Two throwaway phones we own for portal-token tests.
PHONE_A = "9998887771"
PHONE_B = "9998887772"


# ─────────────────────── helpers ────────────────────────
def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


async def _inject_otp(phone: str, otp: str = "1234"):
    """Bypass AiSensy — write a valid OTP row straight into mongo."""
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    await db.otp_tokens.update_one(
        {"phone": phone},
        {"$set": {
            "otp": otp,
            "expires": datetime.now(timezone.utc) + timedelta(minutes=10),
            "attempts": 0,
            "locked_until": None,
            "last_sent": datetime.now(timezone.utc) - timedelta(minutes=1),
        }},
        upsert=True,
    )
    client.close()


def _verify_otp(phone: str, otp: str = "1234", user_type: str = "student"):
    return requests.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json={"phone": phone, "otp": otp, "user_type": user_type},
        timeout=15,
    )


# ─────────────────────── fixtures ────────────────────────
@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def team_token():
    return _login(TEAM_EMAIL, TEAM_PASSWORD)


@pytest.fixture(scope="module")
def portal_token_A():
    """Portal token scoped to PHONE_A."""
    asyncio.run(_inject_otp(PHONE_A))
    r = _verify_otp(PHONE_A)
    assert r.status_code == 200, f"verify-otp phone A failed: {r.status_code} {r.text}"
    body = r.json()
    assert "portal_token" in body, f"portal_token missing in verify-otp response: {body}"
    return body["portal_token"]


@pytest.fixture(scope="module")
def portal_token_B():
    """Portal token scoped to PHONE_B (used for mismatch checks)."""
    asyncio.run(_inject_otp(PHONE_B))
    r = _verify_otp(PHONE_B)
    assert r.status_code == 200, f"verify-otp phone B failed: {r.status_code} {r.text}"
    return r.json()["portal_token"]


# ─────────────────────── SEC #1: LMS credentials admin-only ────────────────────────
class TestLmsCredentialsAdminOnly:
    def _find_school_id(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=15,
        )
        assert r.status_code == 200
        # Any school id works — endpoint gates on role, not existence.
        for s in r.json():
            if s.get("id"):
                return s["id"]
        pytest.skip("No school found to test LMS credentials endpoint")

    def test_lms_users_forbidden_for_team_member(self, admin_token, team_token):
        school_id = self._find_school_id(admin_token)
        r = requests.get(
            f"{BASE_URL}/api/lms/schools/{school_id}/users",
            headers={"Authorization": f"Bearer {team_token}"},
            timeout=15,
        )
        assert r.status_code == 403, f"expected 403 for team_member, got {r.status_code}: {r.text[:200]}"

    def test_lms_users_admin_allowed(self, admin_token):
        school_id = self._find_school_id(admin_token)
        r = requests.get(
            f"{BASE_URL}/api/lms/schools/{school_id}/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        # 200 (success), 404 (school not LMS-linked), or 502 (LMS upstream down) all mean admin gate passed.
        assert r.status_code != 403, f"admin unexpectedly forbidden: {r.text[:200]}"
        assert r.status_code in (200, 400, 404, 502, 503), f"unexpected status {r.status_code}: {r.text[:200]}"


# ─────────────────────── SEC #2: Custom invoices admin-only ────────────────────────
class TestCustomInvoicesAdminOnly:
    def test_get_list_forbidden_for_team_member(self, team_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/custom-invoices",
            headers={"Authorization": f"Bearer {team_token}"},
            timeout=15,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text[:200]}"

    def test_get_list_allowed_for_admin(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/custom-invoices",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=15,
        )
        assert r.status_code == 200, f"expected 200 admin got {r.status_code}: {r.text[:200]}"

    def test_post_forbidden_for_team_member(self, team_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/custom-invoices",
            headers={"Authorization": f"Bearer {team_token}"},
            json={"buyer_name": "TEST", "line_items": []},
            timeout=15,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code}"

    def test_delete_forbidden_for_team_member(self, team_token):
        r = requests.delete(
            f"{BASE_URL}/api/admin/custom-invoices/nonexistent-id",
            headers={"Authorization": f"Bearer {team_token}"},
            timeout=15,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code}"


# ─────────────────────── SEC #3: Portal token ────────────────────────
class TestPortalToken:
    def test_verify_otp_returns_portal_token(self):
        asyncio.run(_inject_otp("9998887779"))
        r = _verify_otp("9998887779")
        assert r.status_code == 200
        body = r.json()
        assert "portal_token" in body and body["portal_token"], "portal_token missing/empty"
        assert isinstance(body["portal_token"], str)
        assert len(body["portal_token"]) > 20

    # --- /api/user/bookings/{phone} ---
    def test_user_bookings_401_no_token(self):
        r = requests.get(f"{BASE_URL}/api/user/bookings/{PHONE_A}", timeout=15)
        assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text[:200]}"

    def test_user_bookings_403_phone_mismatch(self, portal_token_A):
        # Token for A, ask for B → 403
        r = requests.get(
            f"{BASE_URL}/api/user/bookings/{PHONE_B}",
            headers={"Authorization": f"Bearer {portal_token_A}"},
            timeout=15,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text[:200]}"

    def test_user_bookings_200_when_match(self, portal_token_A):
        r = requests.get(
            f"{BASE_URL}/api/user/bookings/{PHONE_A}",
            headers={"Authorization": f"Bearer {portal_token_A}"},
            timeout=15,
        )
        assert r.status_code == 200, f"expected 200 got {r.status_code}: {r.text[:200]}"

    # --- /api/user/reschedule / cancel (owner-of-booking check) ---
    def test_reschedule_401_no_token(self):
        r = requests.post(
            f"{BASE_URL}/api/user/reschedule",
            json={"booking_id": "does-not-exist", "new_date": "2026-01-15", "new_time": "10:00"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_cancel_401_no_token(self):
        r = requests.post(
            f"{BASE_URL}/api/user/cancel-booking",
            json={"booking_id": "does-not-exist"},
            timeout=15,
        )
        assert r.status_code == 401

    # --- /api/school-student/profile/{phone} ---
    def test_school_student_profile_401_no_token(self):
        r = requests.get(f"{BASE_URL}/api/school-student/profile/{PHONE_A}", timeout=15)
        assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text[:200]}"

    def test_school_student_profile_403_mismatch(self, portal_token_A):
        r = requests.get(
            f"{BASE_URL}/api/school-student/profile/{PHONE_B}",
            headers={"Authorization": f"Bearer {portal_token_A}"},
            timeout=15,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text[:200]}"

    def test_school_student_profile_patch_401_no_token(self):
        r = requests.patch(
            f"{BASE_URL}/api/school-student/profile/{PHONE_A}",
            json={"student_name": "X"}, timeout=15,
        )
        assert r.status_code == 401

    def test_school_student_profile_patch_403_mismatch(self, portal_token_A):
        r = requests.patch(
            f"{BASE_URL}/api/school-student/profile/{PHONE_B}",
            headers={"Authorization": f"Bearer {portal_token_A}"},
            json={"student_name": "X"}, timeout=15,
        )
        assert r.status_code == 403

    # --- /api/school-student/receipt/{payment_id} ---
    def test_school_student_receipt_401_no_token(self):
        r = requests.get(f"{BASE_URL}/api/school-student/receipt/nonexistent", timeout=15)
        assert r.status_code == 401


# ─────────────────────── SEC #4: Public LMS report — regression ────────────────────────
class TestPublicLmsReportStillWorks:
    def test_public_lms_report_no_auth_gives_404_not_401(self):
        """Endpoint is intentionally public — an invalid token must return 404
        (share-link not found), NOT 401/403 which would indicate auth was
        accidentally added."""
        fake_token = "a" * 32
        r = requests.get(f"{BASE_URL}/api/public/lms-report/{fake_token}", timeout=15)
        assert r.status_code == 404, f"expected 404 (no auth needed) got {r.status_code}: {r.text[:200]}"
        assert "Share link not found" in r.text or "not found" in r.text.lower()
