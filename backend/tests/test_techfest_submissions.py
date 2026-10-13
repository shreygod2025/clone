"""Tests for techfest admin submissions - region/age/track/status filters, review flow, duplicate blocking."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASS = "GodisGreat@2026"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def test_list_submissions(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/techfest/submissions", headers=admin_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    items = data if isinstance(data, list) else data.get("items") or data.get("submissions") or []
    assert len(items) >= 4, f"Expected at least 4 submissions, got {len(items)}: {items}"
    # ensure each has review_status
    for it in items:
        assert "review_status" in it, f"Missing review_status in {it}"


def test_duplicate_blocked_public_submit():
    """Public submission with existing team_id should return 409."""
    payload = {
        "full_name": "Dup Tester",
        "date_of_birth": "2010-01-01",
        "age": 14,
        "email": "dup@test.com",
        "phone": "9999999999",
        "country": "India",
        "pincode": "400001",
        "state": "Maharashtra",
        "city": "Mumbai",
        "school_or_college": "Test School",
        "age_category": "junior",
        "id_proof_url": "https://example.com/id.pdf",
        "id_proof_type": "aadhar",
        "competition": "robo_sumo",
        "zone": "west",
        "team_id": "TF-TEAM-1",
        "competition_id": "DUP-CHECK-STUDENT",
        "drive_link": "https://drive.google.com/xyz",
    }
    r = requests.post(f"{BASE_URL}/api/techfest/submissions", json=payload)
    assert r.status_code == 409, f"Expected 409 got {r.status_code}: {r.text}"
    body = r.json()
    detail = body.get("detail") or body.get("message") or ""
    assert "already submitted" in detail.lower() or "once" in detail.lower(), f"Unexpected error msg: {detail}"


def test_review_blank_remarks_rejected(admin_headers):
    # First get a submission id
    r = requests.get(f"{BASE_URL}/api/admin/techfest/submissions", headers=admin_headers)
    items = r.json() if isinstance(r.json(), list) else (r.json().get("items") or r.json().get("submissions") or [])
    assert items
    sub_id = items[0].get("id") or items[0].get("_id")
    r2 = requests.patch(
        f"{BASE_URL}/api/admin/techfest/submissions/{sub_id}/review",
        headers=admin_headers,
        json={"decision": "rejected", "remarks": "   "},
    )
    assert r2.status_code == 400, f"Expected 400 blank remarks, got {r2.status_code}: {r2.text}"


def test_review_approve_then_reject_persists(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/techfest/submissions", headers=admin_headers)
    items = r.json() if isinstance(r.json(), list) else (r.json().get("items") or r.json().get("submissions") or [])
    # pick ZZ-T-777 approved row to toggle
    target = None
    for it in items:
        if (it.get("team_id") or "").upper() == "ZZ-T-777":
            target = it
            break
    if not target:
        target = items[0]
    sub_id = target.get("id") or target.get("_id")

    # Approve
    r_appr = requests.patch(
        f"{BASE_URL}/api/admin/techfest/submissions/{sub_id}/review",
        headers=admin_headers,
        json={"decision": "approved", "remarks": "Great work from test"},
    )
    assert r_appr.status_code == 200, r_appr.text
    assert r_appr.json().get("review_status") == "approved"

    # Verify via GET list
    r2 = requests.get(f"{BASE_URL}/api/admin/techfest/submissions", headers=admin_headers)
    items2 = r2.json() if isinstance(r2.json(), list) else (r2.json().get("items") or r2.json().get("submissions") or [])
    found = next((x for x in items2 if (x.get("id") or x.get("_id")) == sub_id), None)
    assert found and found.get("review_status") == "approved"
    assert "Great work from test" in (found.get("judge_remarks") or "")


def test_legacy_duplicate_flagged(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/techfest/submissions", headers=admin_headers)
    items = r.json() if isinstance(r.json(), list) else (r.json().get("items") or r.json().get("submissions") or [])
    # Legacy Dupe row - team_id 'tf-team-1 '
    dupe = next((x for x in items if "legacy dupe" in (x.get("project_title") or "").lower() or "legacy dupe" in (x.get("team_leader_name") or "").lower()), None)
    if not dupe:
        # fallback by team_id trimmed
        dupe = next((x for x in items if (x.get("team_id") or "").strip().lower() == "tf-team-1" and (x.get("zone") or "").lower() == "north"), None)
    assert dupe, f"Legacy duplicate row not found in {[i.get('team_id') for i in items]}"
    assert dupe.get("is_duplicate") is True, f"Legacy dupe not flagged: {dupe}"
