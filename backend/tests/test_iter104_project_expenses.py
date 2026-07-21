"""
Iteration 104 — Project-wise expense mapping.
Covers:
- POST /api/school-expenses with/without project_id
- PATCH /api/school-expenses/{id} setting/changing/unsetting project_id
- GET /api/school-expenses?project_id=... filter
- GET /api/school-expenses/project/{project_id} summary
- Bogus project_id -> 404
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@oll.co")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Dagaji03@")


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    token = r.json().get("token") or r.json().get("access_token")
    assert token, f"no token returned: {r.json()}"
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def active_project(auth_headers):
    # Try list active projects
    r = requests.get(f"{API}/projects?status=active", headers=auth_headers, timeout=30)
    if r.status_code != 200:
        r = requests.get(f"{API}/projects", headers=auth_headers, timeout=30)
    assert r.status_code == 200, f"projects fetch failed: {r.status_code} {r.text}"
    data = r.json()
    projects = data if isinstance(data, list) else data.get("projects", [])
    assert projects, "no projects found; seed one before running"
    # Prefer named 'New test project' if present
    for p in projects:
        if p.get("id") == "3c3cb1c1-9996-441b-a659-b91f8eae4cba":
            return p
    return projects[0]


created_ids = []


def _cleanup(auth_headers):
    for eid in list(created_ids):
        try:
            requests.delete(f"{API}/school-expenses/{eid}", headers=auth_headers, timeout=10)
        except Exception:
            pass


def test_create_expense_with_project(auth_headers, active_project):
    pid = active_project["id"]
    pname = active_project.get("name") or ""
    payload = {
        "category": "other",
        "amount": 1234.5,
        "description": "TEST_iter104 project expense",
        "project_id": pid,
        "vendor_name": "TEST Vendor",
    }
    r = requests.post(f"{API}/school-expenses", headers=auth_headers, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    exp = r.json().get("expense") or {}
    assert exp.get("project_id") == pid
    assert exp.get("project_name") == pname
    assert exp.get("amount") == 1234.5
    created_ids.append(exp["id"])


def test_create_expense_bogus_project_returns_404(auth_headers):
    payload = {"category": "other", "amount": 10, "project_id": "definitely-not-a-real-pid-xyz"}
    r = requests.post(f"{API}/school-expenses", headers=auth_headers, json=payload, timeout=30)
    assert r.status_code == 404, r.text
    assert "Project not found" in r.text


def test_create_general_expense_no_project(auth_headers):
    payload = {"category": "other", "amount": 99, "description": "TEST_iter104 general"}
    r = requests.post(f"{API}/school-expenses", headers=auth_headers, json=payload, timeout=30)
    assert r.status_code == 200
    exp = r.json().get("expense") or {}
    assert exp.get("project_id") == ""
    assert exp.get("project_name") == ""
    created_ids.append(exp["id"])


def test_patch_expense_change_project(auth_headers, active_project):
    # create general, then patch to project
    r = requests.post(f"{API}/school-expenses", headers=auth_headers, json={"category": "other", "amount": 50, "description": "TEST_iter104 patch"}, timeout=30)
    assert r.status_code == 200
    eid = r.json()["expense"]["id"]
    created_ids.append(eid)

    pid = active_project["id"]
    pname = active_project.get("name") or ""
    r = requests.patch(f"{API}/school-expenses/{eid}", headers=auth_headers, json={"project_id": pid}, timeout=30)
    assert r.status_code == 200, r.text

    # GET via filter to verify
    r = requests.get(f"{API}/school-expenses?project_id={pid}", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    ids = [e["id"] for e in r.json()]
    assert eid in ids
    exp = next(e for e in r.json() if e["id"] == eid)
    assert exp.get("project_name") == pname


def test_patch_expense_unlink_project(auth_headers, active_project):
    r = requests.post(f"{API}/school-expenses", headers=auth_headers, json={"category": "other", "amount": 60, "project_id": active_project["id"], "description": "TEST_iter104 unlink"}, timeout=30)
    assert r.status_code == 200
    eid = r.json()["expense"]["id"]
    created_ids.append(eid)

    r = requests.patch(f"{API}/school-expenses/{eid}", headers=auth_headers, json={"project_id": ""}, timeout=30)
    assert r.status_code == 200

    # verify no longer in project filter
    r = requests.get(f"{API}/school-expenses?project_id={active_project['id']}", headers=auth_headers, timeout=30)
    ids = [e["id"] for e in r.json()]
    assert eid not in ids


def test_patch_bogus_project_404(auth_headers, active_project):
    r = requests.post(f"{API}/school-expenses", headers=auth_headers, json={"category": "other", "amount": 5}, timeout=30)
    eid = r.json()["expense"]["id"]
    created_ids.append(eid)

    r = requests.patch(f"{API}/school-expenses/{eid}", headers=auth_headers, json={"project_id": "not-a-real-project"}, timeout=30)
    assert r.status_code == 404


def test_project_summary_endpoint(auth_headers, active_project):
    pid = active_project["id"]
    r = requests.get(f"{API}/school-expenses/project/{pid}", headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["project_id"] == pid
    assert "count" in data and "total" in data and "expenses" in data
    calc_total = sum(float(e.get("amount") or 0) for e in data["expenses"])
    assert round(data["total"], 2) == round(calc_total, 2)
    assert data["count"] == len(data["expenses"])


def test_project_summary_bogus_404(auth_headers):
    r = requests.get(f"{API}/school-expenses/project/xxx-not-real-project-xxx", headers=auth_headers, timeout=30)
    assert r.status_code == 404


def test_list_all_still_returns_general_and_project(auth_headers, active_project):
    r = requests.get(f"{API}/school-expenses", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    items = r.json()
    has_general = any((e.get("project_id") or "") == "" for e in items)
    has_project = any(e.get("project_id") == active_project["id"] for e in items)
    assert has_general, "expected at least one general expense"
    assert has_project, "expected at least one project-linked expense"


def test_cleanup(auth_headers):
    _cleanup(auth_headers)
