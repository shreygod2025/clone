"""Iteration 107 — Educators → Applicants:
    (1) Bio + City mandatory on public apply / apply-verified
    (2) Today's Demo Priority WhatsApp reminders (bulk + per-applicant)
    (3) Idempotency of the daily reminder job
"""
import os
import time
import uuid
import asyncio
import pytest
import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env"))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@oll.co")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Dagaji03@")

TODAY = datetime.now(timezone.utc).date().isoformat()


@pytest.fixture(scope="module")
def admin_token():
    for path in ("/auth/login", "/login"):
        r = requests.post(f"{API}{path}", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        if r.status_code == 200:
            data = r.json()
            token = data.get("access_token") or data.get("token") or data.get("data", {}).get("access_token")
            if token:
                return token
    pytest.skip("Admin auth failed")


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def db():
    client = MongoClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]


def _base_payload(**over):
    p = {
        "name": "TEST Iter107 Applicant",
        "email": f"test_iter107_{uuid.uuid4().hex[:8]}@example.com",
        "phone": f"98765{uuid.uuid4().int % 100000:05d}",
        "skills": ["robotics"],
        "experience": "2 years",
        "grades_comfortable": ["6-8"],
        "city": "Mumbai",
        "teaching_mode": "online",
        "availability": "weekdays",
        "bio": "I have been teaching robotics and coding to school children for over three years.",
        "source": "website",
    }
    p.update(over)
    return p


# ---------------- Bio + City validation ----------------

class TestBioCityValidation:
    def test_apply_rejects_missing_bio(self):
        r = requests.post(f"{API}/educators/apply", json=_base_payload(bio=""), timeout=15)
        assert r.status_code in (400, 422), r.text
        assert "bio" in r.text.lower()

    def test_apply_rejects_short_bio(self):
        r = requests.post(f"{API}/educators/apply", json=_base_payload(bio="too short"), timeout=15)
        assert r.status_code in (400, 422), r.text
        assert "bio" in r.text.lower()

    def test_apply_rejects_missing_city(self):
        r = requests.post(f"{API}/educators/apply", json=_base_payload(city=""), timeout=15)
        assert r.status_code in (400, 422), r.text
        assert "city" in r.text.lower()

    def test_apply_succeeds_with_valid_bio_city(self, db):
        payload = _base_payload()
        r = requests.post(f"{API}/educators/apply", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("name") == payload["name"]
        assert data.get("city") == "Mumbai"
        assert (data.get("bio") or "").startswith("I have been teaching")

    def test_apply_verified_rejects_short_bio(self):
        """apply-verified uses the same EducatorApplicationCreate model → 422 without needing valid OTP."""
        body = {
            "phone": "9876512345",
            "otp": "123456",
            "application_data": _base_payload(bio="too short"),
        }
        r = requests.post(f"{API}/educators/apply-verified", json=body, timeout=15)
        # Should be 422/400 from pydantic BEFORE OTP is even checked
        assert r.status_code in (400, 422), r.text
        assert "bio" in r.text.lower()

    def test_requirement_linked_bypasses_bio(self):
        """requirement_id present → bio/city not required."""
        payload = _base_payload(bio="", city="", requirement_id="req_dummy_123")
        r = requests.post(f"{API}/educators/apply", json=payload, timeout=15)
        # Either succeeds (200) or fails for other reason but NOT bio/city 422
        if r.status_code in (400, 422):
            body = r.text.lower()
            assert "bio" not in body and "city" not in body, f"bypass failed: {r.text}"


# ---------------- Job endpoints ----------------

class TestDemoReminderJobs:
    def test_bulk_endpoint_requires_admin_or_secret(self):
        r = requests.post(f"{API}/jobs/send-educator-applicant-demo-reminders", timeout=15)
        assert r.status_code in (401, 403), r.text

    def test_bulk_endpoint_admin_ok(self, admin_headers, db):
        # Clear idempotency flag on the three seed applicants first
        db.educator_applications.update_many(
            {"phone": {"$in": ["9876500401", "9876500402", "9876500403"]}},
            {"$unset": {"applicant_demo_reminder_sent_on": ""}},
        )

        r = requests.post(f"{API}/jobs/send-educator-applicant-demo-reminders",
                          headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert "checked" in data
        assert "sent_applicant" in data
        assert "sent_hr" in data
        assert isinstance(data.get("errors"), list)
        # At least 3 today (the seeds)
        assert data["checked"] >= 3, data

        # Idempotency: seeds should now have applicant_demo_reminder_sent_on=TODAY
        docs = list(db.educator_applications.find(
            {"phone": {"$in": ["9876500401", "9876500402", "9876500403"]}},
            {"_id": 0, "applicant_demo_reminder_sent_on": 1, "phone": 1},
        ))
        for d in docs:
            assert d.get("applicant_demo_reminder_sent_on") == TODAY, d

    def test_bulk_endpoint_idempotent_same_day(self, admin_headers):
        # Second call in the same day should skip everyone already sent
        r = requests.post(f"{API}/jobs/send-educator-applicant-demo-reminders",
                          headers=admin_headers, timeout=60)
        assert r.status_code == 200
        data = r.json()
        # checked==0 for the seeds (may pick up new same-day applicants added elsewhere → keep tolerant)
        assert data["checked"] == 0, f"expected 0 idempotent skip, got {data}"

    def test_single_reminder_404(self, admin_headers):
        r = requests.post(f"{API}/jobs/send-educator-applicant-demo-reminder/does-not-exist-{uuid.uuid4().hex}",
                          headers=admin_headers, timeout=15)
        assert r.status_code == 404, r.text

    def test_single_reminder_400_when_no_demo(self, admin_headers, db):
        appid = str(uuid.uuid4())
        db.educator_applications.insert_one({
            "id": appid, "name": "TEST NoDemo", "phone": "9199999123",
            "email": "test_nodemo@example.com", "status": "new",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        try:
            r = requests.post(f"{API}/jobs/send-educator-applicant-demo-reminder/{appid}",
                              headers=admin_headers, timeout=15)
            assert r.status_code == 400, r.text
            assert "demo" in r.text.lower()
        finally:
            db.educator_applications.delete_one({"id": appid})

    def test_single_reminder_200_with_demo(self, admin_headers, db):
        # Use one of the seeds (Amarja)
        r = requests.post(f"{API}/jobs/send-educator-applicant-demo-reminder/d330c690-3608-4ece-bdad-c195544702d3",
                          headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert "detail" in data
        assert "applicant" in data["detail"] and "hr" in data["detail"]

    def test_single_reminder_non_admin_forbidden(self):
        """No auth header → 401/403."""
        r = requests.post(f"{API}/jobs/send-educator-applicant-demo-reminder/some-id", timeout=15)
        assert r.status_code in (401, 403), r.text
