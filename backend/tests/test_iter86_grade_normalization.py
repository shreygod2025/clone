"""
Iteration 86 - Bug fix: Grade normalization in school payment (Maneckji Cooper Education Trust).
Verifies backend handles mixed int/string/whitespace grade values in onboarding_data.grade_pricing.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://camp-lead-capture.preview.emergentagent.com').rstrip('/')
SCHOOL_ID = 'test-maneckji-grade3-repro'


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Test 1: GET /api/school-payment/{school_id} returns normalized grade_pricing ---
def test_get_school_payment_info_normalizes_grades(api):
    r = api.get(f"{BASE_URL}/api/school-payment/{SCHOOL_ID}", timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data["school_id"] == SCHOOL_ID
    assert "Maneckji Cooper" in data["school_name"]

    gp = data["grade_pricing"]
    assert isinstance(gp, list) and len(gp) == 5

    grades = [g["grade"] for g in gp]
    # All grades must be clean stripped strings
    assert grades == ["1", "2", "3", "4", "5"], f"Grades not normalized: {grades}"
    for g in gp:
        assert isinstance(g["grade"], str)
        assert g["grade"] == g["grade"].strip()  # no whitespace
        assert g["price"] == 2500.0, f"Grade {g['grade']} price wrong: {g['price']}"


# --- Test 2: POST create-session for Grade 3 (originally INT) — the exact user bug scenario ---
def test_create_session_grade_3_int_type(api):
    payload = {
        "school_id": SCHOOL_ID,
        "student_name": "Ravi Kumar",
        "phone": "9876500001",
        "email": "parent@x.com",
        "grade": "3",
        "division": "A",
        "amount": 2500,
    }
    r = api.post(f"{BASE_URL}/api/school-payment/create-session", json=payload, timeout=30)
    assert r.status_code == 200, f"Grade 3 create-session failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("success") is True, f"success flag not true: {body}"
    assert body.get("payment_session_id"), f"payment_session_id missing: {body}"


# --- Test 3: POST create-session for Grade 5 (originally '5 ' with trailing whitespace) ---
def test_create_session_grade_5_with_whitespace(api):
    payload = {
        "school_id": SCHOOL_ID,
        "student_name": "Priya Sharma",
        "phone": "9876500005",
        "email": "parent5@x.com",
        "grade": "5",
        "division": "B",
        "amount": 2500,
    }
    r = api.post(f"{BASE_URL}/api/school-payment/create-session", json=payload, timeout=30)
    assert r.status_code == 200, f"Grade 5 create-session failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("success") is True
    assert body.get("payment_session_id")


# --- Test 4: Invalid grade should still be rejected (regression) ---
def test_create_session_invalid_grade_rejected(api):
    payload = {
        "school_id": SCHOOL_ID,
        "student_name": "Test Student",
        "phone": "9876500099",
        "email": "test@x.com",
        "grade": "99",
        "division": "C",
        "amount": 2500,
    }
    r = api.post(f"{BASE_URL}/api/school-payment/create-session", json=payload, timeout=30)
    assert r.status_code == 400, f"Expected 400 for invalid grade, got {r.status_code}: {r.text}"
    detail = r.json().get("detail", "")
    assert "Invalid grade" in detail and "99" in detail, f"Unexpected error: {detail}"


# --- Test 5: All 5 grades should be usable (comprehensive check) ---
@pytest.mark.parametrize("grade", ["1", "2", "3", "4", "5"])
def test_create_session_all_grades(api, grade):
    payload = {
        "school_id": SCHOOL_ID,
        "student_name": f"Student G{grade}",
        "phone": f"98765001{grade.zfill(2)}",
        "email": f"parent_g{grade}@x.com",
        "grade": grade,
        "division": "A",
        "amount": 2500,
    }
    r = api.post(f"{BASE_URL}/api/school-payment/create-session", json=payload, timeout=30)
    assert r.status_code == 200, f"Grade {grade} failed: {r.status_code} {r.text}"
    assert r.json().get("payment_session_id"), f"Grade {grade} missing session id"
