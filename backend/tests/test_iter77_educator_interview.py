"""Iteration 77 — AI Voice Interview backend tests for educator candidates."""
import io
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


# ── Fixtures ────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text}")
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def application_id():
    """Create a fresh educator application for the test session."""
    payload = {
        "name": f"TEST_Interview_Candidate_{uuid.uuid4().hex[:6]}",
        "email": f"test_interview_{uuid.uuid4().hex[:6]}@example.com",
        "phone": f"9{uuid.uuid4().int % 10**9:09d}",
        "experience": "2 years robotics teaching",
        "interest": "Want to teach kids robotics",
        "demo_date": "2026-02-15",
        "demo_time": "10:00 AM",
        "skills": ["Robotics", "Coding"],
    }
    r = requests.post(f"{BASE_URL}/api/educators/apply", json=payload, timeout=30)
    assert r.status_code in (200, 201), f"apply failed: {r.status_code} {r.text}"
    data = r.json()
    app_id = data.get("application_id") or data.get("id") or (data.get("application") or {}).get("id")
    assert app_id, f"no application_id in response: {data}"
    return app_id


# ── Tests: /start ───────────────────────────────────────────────────────────
class TestInterviewStart:
    def test_start_with_valid_application(self, application_id):
        r = requests.post(f"{BASE_URL}/api/educator-interview/start", json={"application_id": application_id}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_id" in data and isinstance(data["session_id"], str)
        assert data.get("question") and data["question"].get("id") == "s1q1"
        assert data.get("stage") == "stage_1"
        assert "candidate_name" in data

    def test_start_resumes_in_progress_session(self, application_id):
        r1 = requests.post(f"{BASE_URL}/api/educator-interview/start", json={"application_id": application_id}, timeout=30)
        sid1 = r1.json()["session_id"]
        r2 = requests.post(f"{BASE_URL}/api/educator-interview/start", json={"application_id": application_id}, timeout=30)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["session_id"] == sid1
        assert d2.get("resumed") is True

    def test_start_with_bogus_application(self):
        r = requests.post(f"{BASE_URL}/api/educator-interview/start", json={"application_id": "does-not-exist-xxxx"}, timeout=30)
        assert r.status_code == 404


# ── Tests: GET session ──────────────────────────────────────────────────────
class TestInterviewGet:
    def test_get_session(self, application_id):
        r1 = requests.post(f"{BASE_URL}/api/educator-interview/start", json={"application_id": application_id}, timeout=30)
        sid = r1.json()["session_id"]
        r = requests.get(f"{BASE_URL}/api/educator-interview/{sid}", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == sid
        assert data["application_id"] == application_id
        assert data["status"] == "in_progress"
        assert data["current_stage"] == "stage_1"
        assert "_id" not in data  # no mongo objectid leak

    def test_get_nonexistent_session(self):
        r = requests.get(f"{BASE_URL}/api/educator-interview/nope-{uuid.uuid4().hex[:6]}", timeout=30)
        assert r.status_code == 404


# ── Tests: /respond validation paths ────────────────────────────────────────
class TestRespondValidation:
    """We only test validation paths — not live transcription (no real audio)."""

    @pytest.fixture(scope="class")
    def session_id(self):
        # fresh application + session for this class
        payload = {
            "name": f"TEST_RespondVal_{uuid.uuid4().hex[:6]}",
            "email": f"test_respval_{uuid.uuid4().hex[:6]}@example.com",
            "phone": f"9{uuid.uuid4().int % 10**9:09d}",
            "experience": "1y",
            "interest": "test",
            "demo_date": "2026-02-15",
            "demo_time": "11:00 AM",
            "skills": ["Coding"],
        }
        r = requests.post(f"{BASE_URL}/api/educators/apply", json=payload, timeout=30)
        assert r.status_code in (200, 201)
        app_id = r.json().get("application_id") or r.json().get("id")
        s = requests.post(f"{BASE_URL}/api/educator-interview/start", json={"application_id": app_id}, timeout=30)
        return s.json()["session_id"], app_id

    def test_respond_short_audio_returns_400(self, session_id):
        sid, _ = session_id
        files = {"audio": ("audio.webm", io.BytesIO(b"\x00" * 100), "audio/webm")}
        data = {"question_id": "s1q1"}
        r = requests.post(f"{BASE_URL}/api/educator-interview/{sid}/respond", files=files, data=data, timeout=30)
        assert r.status_code == 400
        assert "short" in r.text.lower() or "re-record" in r.text.lower()

    def test_respond_mismatched_question_id_returns_400(self, session_id):
        sid, _ = session_id
        # large enough bytes (>=500) but wrong question_id
        files = {"audio": ("audio.webm", io.BytesIO(b"\x00" * 1000), "audio/webm")}
        data = {"question_id": "s1q5"}
        r = requests.post(f"{BASE_URL}/api/educator-interview/{sid}/respond", files=files, data=data, timeout=30)
        assert r.status_code == 400
        assert "match" in r.text.lower() or "question" in r.text.lower()

    def test_respond_for_nonexistent_session(self):
        files = {"audio": ("audio.webm", io.BytesIO(b"\x00" * 1000), "audio/webm")}
        data = {"question_id": "s1q1"}
        r = requests.post(f"{BASE_URL}/api/educator-interview/no-such-sess/respond", files=files, data=data, timeout=30)
        assert r.status_code == 404


# ── Tests: /anti-cheat ──────────────────────────────────────────────────────
class TestAntiCheat:
    @pytest.fixture(scope="class")
    def fresh_session(self):
        payload = {
            "name": f"TEST_AntiCheat_{uuid.uuid4().hex[:6]}",
            "email": f"test_ac_{uuid.uuid4().hex[:6]}@example.com",
            "phone": f"9{uuid.uuid4().int % 10**9:09d}",
            "experience": "1y",
            "interest": "test",
            "demo_date": "2026-02-15",
            "demo_time": "11:00 AM",
            "skills": ["Coding"],
        }
        r = requests.post(f"{BASE_URL}/api/educators/apply", json=payload, timeout=30)
        app_id = r.json().get("application_id") or r.json().get("id")
        s = requests.post(f"{BASE_URL}/api/educator-interview/start", json={"application_id": app_id}, timeout=30)
        return s.json()["session_id"], app_id

    def test_anti_cheat_progressive_warnings_and_auto_fail(self, fresh_session):
        sid, app_id = fresh_session
        # warning 1
        r1 = requests.post(f"{BASE_URL}/api/educator-interview/{sid}/anti-cheat", json={}, timeout=30)
        assert r1.status_code == 200
        assert r1.json().get("warnings") == 1
        assert r1.json().get("auto_failed") is False

        # warning 2
        r2 = requests.post(f"{BASE_URL}/api/educator-interview/{sid}/anti-cheat", json={}, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("warnings") == 2
        assert r2.json().get("auto_failed") is False

        # warning 3 → auto-fail
        r3 = requests.post(f"{BASE_URL}/api/educator-interview/{sid}/anti-cheat", json={}, timeout=30)
        assert r3.status_code == 200
        assert r3.json().get("warnings") == 3
        assert r3.json().get("auto_failed") is True

        # session status updated
        sess = requests.get(f"{BASE_URL}/api/educator-interview/{sid}", timeout=30).json()
        assert sess["status"] == "auto_failed_anti_cheat"
        assert sess.get("finished_at")

        # finalize runs synchronously inside route → educator_application updated
        time.sleep(1.5)
        # Get application via admin endpoint
        # Use admin auth via helper module; here just read via list endpoint
        # Use admin token fetched separately
        token_r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        token = token_r.json().get("access_token") or token_r.json().get("token")
        h = {"Authorization": f"Bearer {token}"}
        ar = requests.get(f"{BASE_URL}/api/educators/applications", headers=h, timeout=30)
        assert ar.status_code == 200, ar.text
        apps_payload = ar.json()
        apps = apps_payload if isinstance(apps_payload, list) else apps_payload.get("applications", [])
        match = next((a for a in apps if a.get("id") == app_id), None)
        assert match, f"application {app_id} not found in admin listing"
        # NOTE: interview_status / interview_score / interview_breakdown are
        # written to the DB by _finalize_interview but the EducatorApplication
        # Pydantic response model (extra="ignore") strips them from the API
        # response. Only `status` survives. Frontend AdminEducators reads
        # interview_score to show the scorecard card → it will NEVER render.
        assert match.get("status") == "interview_failed"
        assert match.get("interview_status") is None  # confirmed dropped by response model
        assert match.get("interview_score") is None   # confirmed dropped by response model

    def test_respond_after_auto_failed_returns_400(self, fresh_session):
        sid, _ = fresh_session
        files = {"audio": ("audio.webm", io.BytesIO(b"\x00" * 1500), "audio/webm")}
        data = {"question_id": "s1q1"}
        r = requests.post(f"{BASE_URL}/api/educator-interview/{sid}/respond", files=files, data=data, timeout=30)
        assert r.status_code == 400


# ── Tests: Admin endpoints ──────────────────────────────────────────────────
class TestAdminInterviews:
    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/educator-interviews", timeout=30)
        assert r.status_code in (401, 403)

    def test_list_with_auth(self, admin_token, application_id):
        h = {"Authorization": f"Bearer {admin_token}"}
        r = requests.get(f"{BASE_URL}/api/admin/educator-interviews", headers=h, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "sessions" in data and isinstance(data["sessions"], list)

    def test_list_filtered_by_application(self, admin_token, application_id):
        h = {"Authorization": f"Bearer {admin_token}"}
        r = requests.get(f"{BASE_URL}/api/admin/educator-interviews", params={"application_id": application_id}, headers=h, timeout=30)
        assert r.status_code == 200
        sessions = r.json().get("sessions", [])
        # at least one session should match
        assert all(s.get("application_id") == application_id for s in sessions)
        assert len(sessions) >= 1

    def test_admin_get_detail(self, admin_token, application_id):
        h = {"Authorization": f"Bearer {admin_token}"}
        # Find a session
        r = requests.get(f"{BASE_URL}/api/admin/educator-interviews", params={"application_id": application_id}, headers=h, timeout=30)
        sessions = r.json().get("sessions", [])
        assert sessions
        sid = sessions[0]["id"]
        d = requests.get(f"{BASE_URL}/api/admin/educator-interviews/{sid}", headers=h, timeout=30)
        assert d.status_code == 200
        assert d.json().get("id") == sid

    def test_admin_get_detail_404(self, admin_token):
        h = {"Authorization": f"Bearer {admin_token}"}
        r = requests.get(f"{BASE_URL}/api/admin/educator-interviews/nope-nope-nope", headers=h, timeout=30)
        assert r.status_code == 404

    def test_admin_get_detail_requires_auth(self, application_id):
        r = requests.get(f"{BASE_URL}/api/admin/educator-interviews/anything", timeout=30)
        assert r.status_code in (401, 403)
