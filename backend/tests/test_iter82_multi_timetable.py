"""
Iter 82 — Multi-timetable backend tests + BulkEmailModal token-key bug fix verification.

Backend coverage (/app/backend/routes/checkin_api.py):
  1) POST /api/schools/{id}/timetable WITHOUT timetable_id -> creates new and appends to checkin_timetable_ids
  2) POST /api/schools/{id}/timetable WITH timetable_id -> updates same (no new id created)
  3) GET /api/schools/{id}/timetable -> returns 'timetables' array + legacy 'timetable'/'timetable_id'
  4) DELETE /api/schools/{id}/timetable/{timetable_id} -> pulls id from list, clears legacy if matched

BulkEmailModal bug:
  • Source verification: BulkEmailModal.jsx uses localStorage.getItem('oll_token') (matches LoginPage which sets 'oll_token').
"""
import os
import re
import pytest
import requests
import pymongo
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Dagaji03@")


# ── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def db():
    from dotenv import dotenv_values
    cfg = dotenv_values("/app/backend/.env")
    client = pymongo.MongoClient(cfg["MONGO_URL"])
    return client[cfg["DB_NAME"]]


@pytest.fixture(scope="module")
def school_id(db):
    school = db.school_inquiries.find_one({}, {"_id": 0, "id": 1, "school_name": 1})
    assert school, "No school_inquiries seed data available"
    return school["id"]


@pytest.fixture(scope="module")
def educator_id(auth_headers):
    r = requests.get(f"{BASE_URL}/api/schools/checkin/educators", headers=auth_headers, timeout=20)
    assert r.status_code == 200, r.text
    eds = r.json().get("educators", [])
    assert eds, "No educators available from checkin API"
    return eds[0]["id"]


@pytest.fixture(scope="module")
def second_educator_id(auth_headers):
    r = requests.get(f"{BASE_URL}/api/schools/checkin/educators", headers=auth_headers, timeout=20)
    eds = r.json().get("educators", [])
    return eds[1]["id"] if len(eds) > 1 else eds[0]["id"]


# Track created timetable ids for cleanup
created_timetables = []


@pytest.fixture(scope="module", autouse=True)
def cleanup(school_id, auth_headers, db):
    """Snapshot the school's existing timetable ids; restore + delete what we created."""
    school_before = db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_id": 1, "checkin_timetable_ids": 1}) or {}
    original_ids = list(school_before.get("checkin_timetable_ids") or [])
    original_legacy = school_before.get("checkin_timetable_id")
    yield
    # Delete every id we created during the run
    for tid in created_timetables:
        try:
            requests.delete(f"{BASE_URL}/api/schools/{school_id}/timetable/{tid}",
                            headers=auth_headers, timeout=15)
        except Exception:
            pass
    # Restore the school's original ids precisely
    db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {"checkin_timetable_ids": original_ids, "checkin_timetable_id": original_legacy}},
    )


def _payload(educator):
    today = date.today().isoformat()
    end = (date.today() + timedelta(days=60)).isoformat()
    return {
        "educator_id": educator,
        "start_date": today,
        "end_date": end,
        "days_of_week": ["monday", "wednesday"],
        "time_slots": {
            "monday":    [{"start": "10:00", "end": "11:00"}],
            "wednesday": [{"start": "10:00", "end": "11:00"}],
        },
        "session_mode": "offline",
        "sessions_per_week": 2,
        "notes": "TEST_iter82 timetable",
    }


# ── 1) POST without timetable_id creates and appends ─────────────────────────
def test_create_new_timetable_appends_to_array(school_id, educator_id, auth_headers, db):
    school_before = db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_ids": 1}) or {}
    before_ids = list(school_before.get("checkin_timetable_ids") or [])

    r = requests.post(f"{BASE_URL}/api/schools/{school_id}/timetable",
                      headers=auth_headers, json=_payload(educator_id), timeout=30)
    assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("success") is True
    tid_a = body.get("timetable_id")
    assert tid_a and isinstance(tid_a, str)
    created_timetables.append(tid_a)

    school_after = db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_ids": 1, "checkin_timetable_id": 1})
    after_ids = list(school_after.get("checkin_timetable_ids") or [])
    assert tid_a in after_ids, "New timetable_id not appended to checkin_timetable_ids array"
    # array grew
    assert len(after_ids) >= len(before_ids) + 1 or tid_a in before_ids
    # legacy preserved or set
    assert school_after.get("checkin_timetable_id") is not None


def test_second_create_appends_again_with_distinct_id(school_id, second_educator_id, auth_headers, db):
    school_before = db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_ids": 1}) or {}
    before_ids = list(school_before.get("checkin_timetable_ids") or [])

    r = requests.post(f"{BASE_URL}/api/schools/{school_id}/timetable",
                      headers=auth_headers, json=_payload(second_educator_id), timeout=30)
    assert r.status_code == 200, r.text
    tid_b = r.json()["timetable_id"]
    assert tid_b
    created_timetables.append(tid_b)
    # second create must be a different id
    assert tid_b != created_timetables[0]
    school_after = db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_ids": 1})
    after_ids = list(school_after.get("checkin_timetable_ids") or [])
    assert tid_b in after_ids
    assert len(after_ids) >= len(before_ids) + 1


# ── 2) POST with timetable_id updates (no new id, no array growth) ──────────
def test_update_with_explicit_timetable_id_does_not_create_new(school_id, educator_id, auth_headers, db):
    assert created_timetables, "Need an existing timetable to update"
    target = created_timetables[0]
    school_before = db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_ids": 1}) or {}
    before_ids = list(school_before.get("checkin_timetable_ids") or [])

    payload = _payload(educator_id)
    payload["timetable_id"] = target
    payload["notes"] = "TEST_iter82 UPDATED"
    r = requests.post(f"{BASE_URL}/api/schools/{school_id}/timetable",
                      headers=auth_headers, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["timetable_id"] == target, "Update should return same id, not create new"

    school_after = db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_ids": 1})
    after_ids = list(school_after.get("checkin_timetable_ids") or [])
    assert len(after_ids) == len(before_ids), f"Array length changed on update: before={before_ids} after={after_ids}"
    assert target in after_ids


# ── 3) GET returns timetables array ──────────────────────────────────────────
def test_get_returns_timetables_array(school_id, auth_headers):
    r = requests.get(f"{BASE_URL}/api/schools/{school_id}/timetable",
                     headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "timetables" in data and isinstance(data["timetables"], list)
    # We created at least 2 above
    ids_returned = {t.get("id") for t in data["timetables"]}
    for tid in created_timetables:
        assert tid in ids_returned, f"created id {tid} missing from GET response"
    # legacy keys present
    assert "timetable" in data
    assert "timetable_id" in data
    if data["timetables"]:
        assert data["timetable_id"] == data["timetables"][0].get("id")


# ── 4) DELETE pulls id from array ────────────────────────────────────────────
def test_delete_pulls_id_and_clears_legacy(school_id, auth_headers, db):
    assert len(created_timetables) >= 2, "Need at least 2 created timetables to test delete"
    target = created_timetables[0]
    school_before = db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_ids": 1, "checkin_timetable_id": 1}) or {}
    before_ids = list(school_before.get("checkin_timetable_ids") or [])
    legacy_before = school_before.get("checkin_timetable_id")

    r = requests.delete(f"{BASE_URL}/api/schools/{school_id}/timetable/{target}",
                        headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json().get("success") is True

    school_after = db.school_inquiries.find_one({"id": school_id}, {"_id": 0, "checkin_timetable_ids": 1, "checkin_timetable_id": 1})
    after_ids = list(school_after.get("checkin_timetable_ids") or [])
    assert target not in after_ids, "deleted id still in checkin_timetable_ids"
    assert len(after_ids) == len(before_ids) - 1
    # legacy: if it pointed to the deleted id, it must be replaced (or set to None if no remaining)
    if legacy_before == target:
        assert school_after.get("checkin_timetable_id") != target
    created_timetables.remove(target)


# ── 5) BulkEmailModal token key static check ─────────────────────────────────
def test_bulk_email_modal_uses_correct_token_key():
    """Regression test for onboarding 'Send Email' logout bug.
    BulkEmailModal must read localStorage.getItem('oll_token'), NOT 'token'."""
    with open("/app/frontend/src/components/BulkEmailModal.jsx") as f:
        content = f.read()
    # Must use oll_token
    assert "localStorage.getItem('oll_token')" in content or 'localStorage.getItem("oll_token")' in content, \
        "BulkEmailModal must use 'oll_token' key"
    # Must NOT use the bare 'token' key
    bad = re.search(r"localStorage\.getItem\(\s*['\"]token['\"]\s*\)", content)
    assert bad is None, "BulkEmailModal still references the wrong 'token' key — admin logout regression"
    # Must build Authorization header
    assert "Bearer ${localStorage.getItem('oll_token')}" in content or \
           'Bearer ${localStorage.getItem("oll_token")}' in content, \
        "BulkEmailModal does not build a Bearer Authorization header"


# ── 6) LoginPage stores under same 'oll_token' key (sanity) ──────────────────
def test_login_page_sets_oll_token_key():
    """Make sure the login page writes to the key BulkEmailModal reads."""
    import glob
    matches = []
    for p in glob.glob("/app/frontend/src/**/*.jsx", recursive=True) + glob.glob("/app/frontend/src/**/*.js", recursive=True):
        try:
            with open(p) as f:
                txt = f.read()
            if "localStorage.setItem" in txt and "oll_token" in txt:
                matches.append(p)
        except Exception:
            pass
    assert matches, "No file sets localStorage 'oll_token' — admins would never have a token to read"
