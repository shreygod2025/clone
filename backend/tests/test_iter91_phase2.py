"""
Iteration 91 — Phase 2 features (Tasks Sub-tasks, Comments, Approval, /me/performance)
Also re-verifies iter90 blocked cases (admin as assignee/lead).
"""
import os
import uuid
import requests
import pytest
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://camp-lead-capture.preview.emergentagent.com"
API = f"{BASE_URL}/api"


# ── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def admin_token(admin_credentials):
    r = requests.post(f"{API}/auth/login", json=admin_credentials, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_id(admin_headers):
    r = requests.get(f"{API}/auth/me", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    return r.json()["id"]


def _seed_team_user(admin_headers, tag="u"):
    suffix = uuid.uuid4().hex[:6]
    email = f"TEST_iter91_{tag}_{suffix}@example.com"
    username = f"test_iter91_{tag}_{suffix}"
    password = "Iter91Test@123"
    payload = {
        "email": email, "name": f"TEST Iter91 {tag} {suffix}", "phone": "9999999999",
        "username": username, "password": password, "role_id": "", "city": "T",
        "reports_to": "", "permissions": [],
    }
    r = requests.post(f"{API}/team-users", json=payload, headers=admin_headers, timeout=30)
    assert r.status_code == 200, f"team_user create failed: {r.text}"
    uid = r.json()["id"]
    return {"id": uid, "email": email, "password": password}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def user_u1(admin_headers):
    u = _seed_team_user(admin_headers, "u1")
    yield u
    requests.delete(f"{API}/team-users/{u['id']}", headers=admin_headers, timeout=30)


@pytest.fixture(scope="module")
def user_u2(admin_headers):
    u = _seed_team_user(admin_headers, "u2")
    yield u
    requests.delete(f"{API}/team-users/{u['id']}", headers=admin_headers, timeout=30)


@pytest.fixture(scope="module")
def u1_headers(user_u1):
    return _login(user_u1["email"], user_u1["password"])


@pytest.fixture(scope="module")
def u2_headers(user_u2):
    return _login(user_u2["email"], user_u2["password"])


def _today_iso():
    return datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0).isoformat()


# ── Test 1 — Admin-as-assignee/lead re-verify ────────────────────────────────
class TestAdminAsAssignee:
    def test_admin_can_be_task_assignee(self, admin_headers, admin_id):
        tid = None
        try:
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter91 admin-self", "assigned_to": admin_id,
                "priority": "medium", "due_date": _today_iso(),
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200, f"expected 200 got {r.status_code}: {r.text}"
            body = r.json()
            tid = body["id"]
            assert body["assigned_to"] == admin_id
            assert body.get("assigned_to_name"), "assigned_to_name should be populated from admins"
        finally:
            if tid:
                requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)

    def test_admin_can_be_project_lead(self, admin_headers, admin_id):
        pid = None
        try:
            r = requests.post(f"{API}/projects", json={
                "name": f"TEST_iter91 admin-lead {uuid.uuid4().hex[:6]}",
                "lead_id": admin_id,
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200, f"expected 200 got {r.status_code}: {r.text}"
            pid = r.json()["id"]
        finally:
            if pid:
                requests.delete(f"{API}/projects/{pid}", headers=admin_headers, timeout=30)

    def test_admin_tasks_today_returns_self_assigned(self, admin_headers, admin_id):
        tid = None
        try:
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter91 admin-today", "assigned_to": admin_id,
                "priority": "high", "due_date": _today_iso(),
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            tid = r.json()["id"]
            r = requests.get(f"{API}/tasks/today", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            ids = {t["id"] for t in r.json().get("today", [])}
            assert tid in ids
        finally:
            if tid:
                requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)


# ── Test 2 — Sub-tasks ────────────────────────────────────────────────────────
class TestSubtasks:
    def test_subtask_lifecycle(self, admin_headers, user_u1):
        parent_id = None
        try:
            # Create parent
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter91 parent", "assigned_to": user_u1["id"], "priority": "medium",
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            parent_id = r.json()["id"]

            # Create sub-task
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter91 child", "assigned_to": user_u1["id"],
                "parent_task_id": parent_id, "priority": "low",
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200, r.text
            sub_id = r.json()["id"]

            # GET /api/tasks default should hide sub-tasks and show parent with counters
            r = requests.get(f"{API}/tasks?filter=team", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            docs = r.json()
            parent_doc = next((t for t in docs if t["id"] == parent_id), None)
            assert parent_doc is not None
            assert parent_doc.get("subtask_total") == 1
            assert parent_doc.get("subtask_done") == 0
            assert sub_id not in {t["id"] for t in docs}, "sub-task must not be in top-level list"

            # subtasks endpoint
            r = requests.get(f"{API}/tasks/{parent_id}/subtasks", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            subs = r.json()
            assert len(subs) == 1 and subs[0]["id"] == sub_id

            # Mark sub complete → parent subtask_done=1
            r = requests.patch(f"{API}/tasks/{sub_id}", json={"status": "completed"},
                               headers=admin_headers, timeout=30)
            assert r.status_code == 200
            r = requests.get(f"{API}/tasks/{parent_id}", headers=admin_headers, timeout=30)
            assert r.json()["subtask_done"] == 1

            # DELETE parent → sub cascade deleted
            r = requests.delete(f"{API}/tasks/{parent_id}", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            parent_id = None
            r = requests.get(f"{API}/tasks/{sub_id}", headers=admin_headers, timeout=30)
            assert r.status_code == 404, "sub-task should be cascade-deleted"
        finally:
            if parent_id:
                requests.delete(f"{API}/tasks/{parent_id}", headers=admin_headers, timeout=30)

    def test_subtask_with_missing_parent_returns_404(self, admin_headers, user_u1):
        r = requests.post(f"{API}/tasks", json={
            "title": "TEST_iter91 orphan", "assigned_to": user_u1["id"],
            "parent_task_id": "does-not-exist-xyz",
        }, headers=admin_headers, timeout=30)
        assert r.status_code == 404


# ── Test 3 — Comments ─────────────────────────────────────────────────────────
class TestComments:
    def test_comments_lifecycle(self, admin_headers, user_u1):
        tid = None
        try:
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter91 comments", "assigned_to": user_u1["id"],
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            tid = r.json()["id"]

            # empty
            r = requests.get(f"{API}/tasks/{tid}/comments", headers=admin_headers, timeout=30)
            assert r.status_code == 200 and r.json() == []

            # add
            r = requests.post(f"{API}/tasks/{tid}/comments",
                              json={"message": "hello"}, headers=admin_headers, timeout=30)
            assert r.status_code == 200, r.text
            c = r.json()
            assert c["message"] == "hello"
            assert c.get("user_name"), "user_name should be populated from admins collection"

            # empty message → 400
            r = requests.post(f"{API}/tasks/{tid}/comments",
                              json={"message": ""}, headers=admin_headers, timeout=30)
            assert r.status_code == 400

            # comment_count reflected on task
            r = requests.get(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)
            assert r.status_code == 200 and r.json().get("comment_count") == 1

            # DELETE task cascade deletes comments; commenting on missing task → 404
            requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)
            deleted_id = tid
            tid = None
            r = requests.get(f"{API}/tasks/{deleted_id}/comments", headers=admin_headers, timeout=30)
            assert r.status_code == 404
        finally:
            if tid:
                requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)


# ── Test 4 — Approval flow ────────────────────────────────────────────────────
class TestApprovalFlow:
    def test_submit_approve_reject(self, admin_headers, u1_headers, u2_headers, user_u1):
        t1 = t2 = None
        try:
            # Task 1: admin assigns to U1
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter91 approval-1", "assigned_to": user_u1["id"], "priority": "medium",
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            t1 = r.json()["id"]

            # U1 submits
            r = requests.post(f"{API}/tasks/{t1}/submit", headers=u1_headers, timeout=30)
            assert r.status_code == 200, r.text
            assert r.json()["status"] == "pending_approval"

            # U2 tries to approve → 403 (not assigner, not admin)
            r = requests.post(f"{API}/tasks/{t1}/approve", headers=u2_headers, timeout=30)
            assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"

            # admin approves
            r = requests.post(f"{API}/tasks/{t1}/approve", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            body = r.json()
            assert body["status"] == "completed" and body.get("completed_at")

            # Task 2: reject-then-resubmit
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter91 approval-2", "assigned_to": user_u1["id"], "priority": "medium",
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            t2 = r.json()["id"]

            r = requests.post(f"{API}/tasks/{t2}/submit", headers=u1_headers, timeout=30)
            assert r.status_code == 200

            r = requests.post(f"{API}/tasks/{t2}/reject",
                              json={"reason": "wrong output"}, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            body = r.json()
            assert body["status"] == "rejected"
            assert body.get("rejection_reason") == "wrong output"

            # U1 resubmits (from rejected)
            r = requests.post(f"{API}/tasks/{t2}/submit", headers=u1_headers, timeout=30)
            assert r.status_code == 200
            assert r.json()["status"] == "pending_approval"
        finally:
            for tid in (t1, t2):
                if tid:
                    requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)


# ── Test 5 — /me/performance ──────────────────────────────────────────────────
class TestMyPerformance:
    def test_admin_default_task_kpis(self, admin_headers):
        r = requests.get(f"{API}/me/performance?scope=today", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["scope"] == "today"
        assert "start" in body and "end" in body
        assert isinstance(body["kpis"], list) and len(body["kpis"]) >= 5
        ids = {k["id"] for k in body["kpis"]}
        expected = {"tasks_assigned", "tasks_completed", "tasks_overdue",
                    "projects_leading", "projects_member_of"}
        assert expected.issubset(ids), f"missing KPI ids: {expected - ids}"
        for k in body["kpis"]:
            assert isinstance(k.get("value"), (int, float))
            assert k["value"] >= 0

    def test_all_scopes(self, admin_headers):
        ranges = {}
        for scope in ("today", "week", "month", "year"):
            r = requests.get(f"{API}/me/performance?scope={scope}", headers=admin_headers, timeout=30)
            assert r.status_code == 200, f"{scope} failed: {r.text}"
            body = r.json()
            ranges[scope] = (body["start"], body["end"])
        assert len(set(ranges.values())) == 4, f"scopes should differ, got {ranges}"

    def test_invalid_scope(self, admin_headers):
        r = requests.get(f"{API}/me/performance?scope=foo", headers=admin_headers, timeout=30)
        # FastAPI Query regex → 422; explicit HTTPException → 400. Accept either as validation failure.
        assert r.status_code in (400, 422), f"expected 400/422 got {r.status_code}"

    def test_role_specific_kpis(self, admin_headers):
        """Non-admin user with a support role → gets support KPIs, not task-delivery defaults."""
        role_id = None
        user_id = None
        try:
            role_payload = {
                "name": f"TEST_iter91_role_{uuid.uuid4().hex[:6]}",
                "description": "iter91 support role",
                "permissions": [],
                "kpis": ["support_tickets_assigned", "support_resolution_rate"],
            }
            r = requests.post(f"{API}/roles", json=role_payload, headers=admin_headers, timeout=30)
            assert r.status_code == 200, r.text
            role_id = r.json().get("id")

            suffix = uuid.uuid4().hex[:6]
            r = requests.post(f"{API}/team-users", json={
                "email": f"TEST_iter91_role_{suffix}@ex.com",
                "name": f"TEST role user {suffix}", "phone": "8888888888",
                "username": f"test_iter91_role_{suffix}",
                "password": "Iter91Test@123",
                "role_id": role_id, "city": "T", "reports_to": "", "permissions": [],
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            user_id = r.json()["id"]

            # login as that user
            h = _login(f"TEST_iter91_role_{suffix}@ex.com", "Iter91Test@123")
            r = requests.get(f"{API}/me/performance?scope=month", headers=h, timeout=30)
            assert r.status_code == 200
            ids = {k["id"] for k in r.json()["kpis"]}
            # Must contain the role's kpis, and NOT the task-delivery defaults
            assert "support_tickets_assigned" in ids or "support_resolution_rate" in ids, \
                f"expected support KPIs, got {ids}"
            assert "tasks_assigned" not in ids, f"should not fall back to defaults when role has KPIs: {ids}"
        finally:
            if user_id:
                requests.delete(f"{API}/team-users/{user_id}", headers=admin_headers, timeout=30)
            if role_id:
                requests.delete(f"{API}/roles/{role_id}", headers=admin_headers, timeout=30)
