"""Tests for reports_to field on team_users (Test 1-3)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip().rstrip("/")

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@oll.co")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Dagaji03@")


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def manager_user(headers):
    """Create a 'manager' team user to be referenced by others."""
    suffix = uuid.uuid4().hex[:8]
    body = {
        "email": f"TEST_mgr_{suffix}@example.com",
        "password": "testpass1",
        "name": f"TEST Manager {suffix}",
        "phone": "9000000001",
        "username": f"test_mgr_{suffix}",
        "role_id": "",
        "city": "Mumbai",
        "permissions": [],
    }
    r = requests.post(f"{BASE_URL}/api/team-users", json=body, headers=headers, timeout=30)
    assert r.status_code == 200, f"Create manager failed: {r.text}"
    mgr_id = r.json()["id"]
    yield {"id": mgr_id, "email": body["email"], "username": body["username"]}
    requests.delete(f"{BASE_URL}/api/team-users/{mgr_id}", headers=headers, timeout=30)


# Test 1: POST with reports_to persists correctly
def test_create_team_user_with_reports_to(headers, manager_user):
    suffix = uuid.uuid4().hex[:8]
    body = {
        "email": f"TEST_sub_{suffix}@example.com",
        "password": "testpass1",
        "name": f"TEST Sub {suffix}",
        "phone": "9000000002",
        "username": f"test_sub_{suffix}",
        "role_id": "",
        "city": "Delhi",
        "reports_to": manager_user["id"],
        "permissions": [],
    }
    r = requests.post(f"{BASE_URL}/api/team-users", json=body, headers=headers, timeout=30)
    assert r.status_code == 200, f"Create failed: {r.text}"
    new_id = r.json()["id"]

    try:
        # GET to verify persistence
        g = requests.get(f"{BASE_URL}/api/team-users/{new_id}", headers=headers, timeout=30)
        assert g.status_code == 200
        doc = g.json()
        assert doc["reports_to"] == manager_user["id"], \
            f"Expected reports_to={manager_user['id']}, got {doc.get('reports_to')}"
        assert doc["email"] == body["email"]
    finally:
        requests.delete(f"{BASE_URL}/api/team-users/{new_id}", headers=headers, timeout=30)


# Test 2: PATCH clears reports_to with empty string and updates with new value
def test_patch_reports_to_clear_and_update(headers, manager_user):
    # Create user with reports_to=manager_user.id
    suffix = uuid.uuid4().hex[:8]
    body = {
        "email": f"TEST_patch_{suffix}@example.com",
        "password": "testpass1",
        "name": f"TEST Patch {suffix}",
        "phone": "9000000003",
        "username": f"test_patch_{suffix}",
        "reports_to": manager_user["id"],
    }
    r = requests.post(f"{BASE_URL}/api/team-users", json=body, headers=headers, timeout=30)
    assert r.status_code == 200
    uid = r.json()["id"]

    # Create a second manager to switch to
    body2 = {
        "email": f"TEST_mgr2_{suffix}@example.com",
        "password": "testpass1",
        "name": f"TEST Mgr2 {suffix}",
        "phone": "9000000004",
        "username": f"test_mgr2_{suffix}",
    }
    r2 = requests.post(f"{BASE_URL}/api/team-users", json=body2, headers=headers, timeout=30)
    assert r2.status_code == 200
    mgr2_id = r2.json()["id"]

    try:
        # PATCH to switch manager
        p = requests.patch(f"{BASE_URL}/api/team-users/{uid}",
                           json={"reports_to": mgr2_id}, headers=headers, timeout=30)
        assert p.status_code == 200
        g = requests.get(f"{BASE_URL}/api/team-users/{uid}", headers=headers, timeout=30)
        assert g.json()["reports_to"] == mgr2_id

        # PATCH with "" to clear
        p2 = requests.patch(f"{BASE_URL}/api/team-users/{uid}",
                            json={"reports_to": ""}, headers=headers, timeout=30)
        assert p2.status_code == 200
        g2 = requests.get(f"{BASE_URL}/api/team-users/{uid}", headers=headers, timeout=30)
        assert g2.json()["reports_to"] == "", \
            f"Expected cleared reports_to, got {g2.json().get('reports_to')}"
    finally:
        requests.delete(f"{BASE_URL}/api/team-users/{uid}", headers=headers, timeout=30)
        requests.delete(f"{BASE_URL}/api/team-users/{mgr2_id}", headers=headers, timeout=30)


# Test 3: POST without reports_to defaults to ""
def test_create_without_reports_to_defaults_empty(headers):
    suffix = uuid.uuid4().hex[:8]
    body = {
        "email": f"TEST_noref_{suffix}@example.com",
        "password": "testpass1",
        "name": f"TEST NoRef {suffix}",
        "phone": "9000000005",
        "username": f"test_noref_{suffix}",
    }
    r = requests.post(f"{BASE_URL}/api/team-users", json=body, headers=headers, timeout=30)
    assert r.status_code == 200, f"Create without reports_to failed: {r.text}"
    uid = r.json()["id"]
    try:
        g = requests.get(f"{BASE_URL}/api/team-users/{uid}", headers=headers, timeout=30)
        assert g.status_code == 200
        assert g.json().get("reports_to", "") == "", \
            f"Expected reports_to='' default, got {g.json().get('reports_to')}"
    finally:
        requests.delete(f"{BASE_URL}/api/team-users/{uid}", headers=headers, timeout=30)
