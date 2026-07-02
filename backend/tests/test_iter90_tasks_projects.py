"""
Iteration 90 — OLL Mission Control Phase 1: Tasks + Projects + Task/Project KPIs.

Covers:
- Tasks CRUD + validation + role-scoped filter + /tasks/today endpoint.
- Projects CRUD + computed task_count/task_done + delete-unlinks-tasks behaviour.
- KPI catalog contains new 'Task & Project Delivery' category (5 KPIs).
- Performance metrics for tasks_* / projects_* correctly computed.

All test data is prefixed with TEST_/E2E and cleaned up via try/finally.
"""
import os
import re
import uuid
import requests
import pytest
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://camp-lead-capture.preview.emergentagent.com"
API = f"{BASE_URL}/api"


# ── Fixtures ─────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def admin_token(admin_credentials):
    r = requests.post(f"{API}/auth/login", json=admin_credentials, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_id(admin_headers):
    r = requests.get(f"{API}/auth/me", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    return r.json()["id"]


@pytest.fixture(scope="module")
def seeded_team_user(admin_headers):
    """Create a throw-away team_user with a known password. Torn down at module end."""
    suffix = uuid.uuid4().hex[:6]
    email = f"TEST_iter90_{suffix}@example.com"
    username = f"test_iter90_{suffix}"
    password = "Iter90Test@123"
    payload = {
        "email": email, "name": f"TEST Iter90 {suffix}", "phone": "9999999999",
        "username": username, "password": password, "role_id": "", "city": "Test",
        "reports_to": "", "permissions": [],
    }
    r = requests.post(f"{API}/team-users", json=payload, headers=admin_headers, timeout=30)
    assert r.status_code == 200, f"team_user create failed: {r.status_code} {r.text}"
    uid = r.json()["id"]

    yield {"id": uid, "email": email, "username": username, "password": password}

    # cleanup
    requests.delete(f"{API}/team-users/{uid}", headers=admin_headers, timeout=30)


@pytest.fixture(scope="module")
def team_user_token(seeded_team_user):
    r = requests.post(f"{API}/auth/login",
                      json={"email": seeded_team_user["email"], "password": seeded_team_user["password"]},
                      timeout=30)
    assert r.status_code == 200, f"team_user login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def team_user_headers(team_user_token):
    return {"Authorization": f"Bearer {team_user_token}", "Content-Type": "application/json"}


def _today_iso():
    return datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0).isoformat()


def _days_ago_iso(days):
    return (datetime.now(timezone.utc) - timedelta(days=days)).replace(hour=12, minute=0, second=0, microsecond=0).isoformat()


# ── Test 1 — Tasks CRUD (happy path) ─────────────────────────────────────────
class TestTasksCRUD:
    def test_full_crud_flow(self, admin_headers, seeded_team_user):
        created_id = None
        try:
            # CREATE
            payload = {
                "title": "TEST_E2E Test Task",
                "assigned_to": seeded_team_user["id"],
                "priority": "high",
                "due_date": _today_iso(),
                "tags": ["e2e", "backend"],
            }
            r = requests.post(f"{API}/tasks", json=payload, headers=admin_headers, timeout=30)
            assert r.status_code == 200, f"POST /tasks failed: {r.status_code} {r.text}"
            body = r.json()
            assert "id" in body and body["title"] == "TEST_E2E Test Task"
            assert re.match(r"^TSK-\d{4}$", body["code"]), f"bad code: {body.get('code')}"
            assert body["assigned_to_name"], "assigned_to_name should be populated"
            created_id = body["id"]
            code = body["code"]

            # LIST filter=team (admin sees all)
            r = requests.get(f"{API}/tasks?filter=team", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            assert any(t["id"] == created_id for t in r.json())

            # GET single
            r = requests.get(f"{API}/tasks/{created_id}", headers=admin_headers, timeout=30)
            assert r.status_code == 200 and r.json()["code"] == code

            # PATCH -> in_progress
            r = requests.patch(f"{API}/tasks/{created_id}", json={"status": "in_progress"},
                               headers=admin_headers, timeout=30)
            assert r.status_code == 200 and r.json()["status"] == "in_progress"

            # PATCH -> completed
            r = requests.patch(f"{API}/tasks/{created_id}", json={"status": "completed"},
                               headers=admin_headers, timeout=30)
            assert r.status_code == 200
            b = r.json()
            assert b["status"] == "completed" and b.get("completed_at")

        finally:
            if created_id:
                r = requests.delete(f"{API}/tasks/{created_id}", headers=admin_headers, timeout=30)
                assert r.status_code == 200


# ── Test 2 — Tasks validation ────────────────────────────────────────────────
class TestTasksValidation:
    def test_missing_title(self, admin_headers, seeded_team_user):
        r = requests.post(f"{API}/tasks",
                          json={"title": "", "assigned_to": seeded_team_user["id"]},
                          headers=admin_headers, timeout=30)
        assert r.status_code == 400

    def test_missing_assigned_to(self, admin_headers):
        r = requests.post(f"{API}/tasks", json={"title": "x"}, headers=admin_headers, timeout=30)
        assert r.status_code == 400

    def test_invalid_status(self, admin_headers, seeded_team_user):
        r = requests.post(f"{API}/tasks",
                          json={"title": "x", "assigned_to": seeded_team_user["id"], "status": "foo"},
                          headers=admin_headers, timeout=30)
        assert r.status_code == 400

    def test_invalid_priority(self, admin_headers, seeded_team_user):
        r = requests.post(f"{API}/tasks",
                          json={"title": "x", "assigned_to": seeded_team_user["id"], "priority": "meh"},
                          headers=admin_headers, timeout=30)
        assert r.status_code == 400

    def test_nonexistent_assignee(self, admin_headers):
        r = requests.post(f"{API}/tasks",
                          json={"title": "x", "assigned_to": "does-not-exist-uuid"},
                          headers=admin_headers, timeout=30)
        assert r.status_code == 404

    def test_nonexistent_project(self, admin_headers, seeded_team_user):
        r = requests.post(f"{API}/tasks",
                          json={"title": "x", "assigned_to": seeded_team_user["id"],
                                "project_id": "no-such-project"},
                          headers=admin_headers, timeout=30)
        assert r.status_code == 404


# ── Test 3 — Role-scoped filtering + reassign guard ──────────────────────────
class TestRoleScopedFilter:
    def test_my_by_me_all_and_reassign_guard(self, admin_headers, team_user_headers, seeded_team_user, admin_id):
        u1 = seeded_team_user["id"]
        task_a_id = None  # assigned to U1
        task_b_id = None  # assigned by U1

        try:
            # A: admin assigns to U1
            ra = requests.post(f"{API}/tasks",
                               json={"title": "TEST_iter90 A→U1", "assigned_to": u1, "priority": "medium"},
                               headers=admin_headers, timeout=30)
            assert ra.status_code == 200
            task_a_id = ra.json()["id"]

            # B: U1 assigns to admin (so assigned_by = U1)
            rb = requests.post(f"{API}/tasks",
                               json={"title": "TEST_iter90 U1→A", "assigned_to": admin_id, "priority": "medium"},
                               headers=team_user_headers, timeout=30)
            assert rb.status_code == 200, rb.text
            task_b_id = rb.json()["id"]

            # my → A only
            r = requests.get(f"{API}/tasks?filter=my", headers=team_user_headers, timeout=30)
            assert r.status_code == 200
            ids_my = {t["id"] for t in r.json()}
            assert task_a_id in ids_my
            assert task_b_id not in ids_my

            # by_me → B only
            r = requests.get(f"{API}/tasks?filter=by_me", headers=team_user_headers, timeout=30)
            assert r.status_code == 200
            ids_by = {t["id"] for t in r.json()}
            assert task_b_id in ids_by
            assert task_a_id not in ids_by

            # all → both
            r = requests.get(f"{API}/tasks?filter=all", headers=team_user_headers, timeout=30)
            assert r.status_code == 200
            ids_all = {t["id"] for t in r.json()}
            assert task_a_id in ids_all and task_b_id in ids_all

            # Non-admin CANNOT PATCH assigned_to → 403
            r = requests.patch(f"{API}/tasks/{task_a_id}", json={"assigned_to": admin_id},
                               headers=team_user_headers, timeout=30)
            assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"

        finally:
            for tid in (task_a_id, task_b_id):
                if tid:
                    requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)


# ── Test 4 — /tasks/today endpoint ───────────────────────────────────────────
class TestTasksToday:
    def test_today_and_overdue_buckets(self, admin_headers, admin_id):
        created = []
        try:
            r = requests.get(f"{API}/tasks/today", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            body0 = r.json()
            assert set(body0.keys()) >= {"today", "overdue"}

            base_today_ids = {t["id"] for t in body0["today"]}
            base_overdue_ids = {t["id"] for t in body0["overdue"]}

            # today
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter90 today", "assigned_to": admin_id,
                "priority": "high", "due_date": _today_iso(),
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            id_today = r.json()["id"]; created.append(id_today)

            # overdue pending
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter90 overdue-pending", "assigned_to": admin_id,
                "priority": "high", "due_date": _days_ago_iso(2),
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            id_overdue = r.json()["id"]; created.append(id_overdue)

            # overdue completed (should NOT appear in overdue)
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter90 overdue-done", "assigned_to": admin_id,
                "priority": "high", "due_date": _days_ago_iso(1),
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            id_done = r.json()["id"]; created.append(id_done)
            requests.patch(f"{API}/tasks/{id_done}", json={"status": "completed"},
                           headers=admin_headers, timeout=30)

            r = requests.get(f"{API}/tasks/today", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            body = r.json()
            new_today = {t["id"] for t in body["today"]} - base_today_ids
            new_overdue = {t["id"] for t in body["overdue"]} - base_overdue_ids

            assert id_today in new_today, f"today task missing from `today` bucket"
            assert id_overdue in new_overdue, f"overdue-pending missing from `overdue`"
            assert id_done not in new_overdue, f"completed overdue must NOT be in overdue bucket"

        finally:
            for tid in created:
                requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)


# ── Test 5 — Projects CRUD + task_count / task_done + delete-unlinks ─────────
class TestProjectsCRUD:
    def test_full_project_flow(self, admin_headers, seeded_team_user, admin_id):
        proj_id = None
        task_ids = []
        try:
            # CREATE
            r = requests.post(f"{API}/projects", json={
                "name": "TEST_iter90 E2E Alpha",
                "lead_id": admin_id,
                "member_ids": [seeded_team_user["id"]],
                "color": "#10B981",
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200, f"POST /projects failed: {r.text}"
            body = r.json()
            proj_id = body["id"]
            assert body["name"] == "TEST_iter90 E2E Alpha"

            # LIST
            r = requests.get(f"{API}/projects", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            match = next((p for p in r.json() if p["id"] == proj_id), None)
            assert match is not None
            for k in ("lead_name", "members", "task_count", "task_done"):
                assert k in match, f"list missing field {k}"

            # GET single
            r = requests.get(f"{API}/projects/{proj_id}", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            body = r.json()
            assert body["task_count"] == 0 and body["task_done"] == 0

            # PATCH
            r = requests.patch(f"{API}/projects/{proj_id}",
                               json={"description": "updated"},
                               headers=admin_headers, timeout=30)
            assert r.status_code == 200 and r.json()["description"] == "updated"

            # Create 2 tasks in project, complete one
            for i in range(2):
                r = requests.post(f"{API}/tasks", json={
                    "title": f"TEST_iter90 proj-task-{i}",
                    "assigned_to": seeded_team_user["id"],
                    "project_id": proj_id,
                    "priority": "low",
                }, headers=admin_headers, timeout=30)
                assert r.status_code == 200
                task_ids.append(r.json()["id"])
            requests.patch(f"{API}/tasks/{task_ids[0]}", json={"status": "completed"},
                           headers=admin_headers, timeout=30)

            r = requests.get(f"{API}/projects/{proj_id}", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            body = r.json()
            assert body["task_count"] == 2, f"task_count expected 2, got {body['task_count']}"
            assert body["task_done"] == 1, f"task_done expected 1, got {body['task_done']}"

            # DELETE project → tasks unlinked (project_id=null) but not deleted
            r = requests.delete(f"{API}/projects/{proj_id}", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            proj_id = None  # already deleted

            for tid in task_ids:
                r = requests.get(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)
                assert r.status_code == 200, f"task {tid} should still exist"
                assert r.json().get("project_id") in (None, ""), \
                    f"task {tid} project_id should be null after project delete"
        finally:
            for tid in task_ids:
                requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)
            if proj_id:
                requests.delete(f"{API}/projects/{proj_id}", headers=admin_headers, timeout=30)


# ── Test 6 — KPI catalog updated ─────────────────────────────────────────────
class TestKPICatalog:
    def test_catalog_has_task_project_delivery(self, admin_headers):
        r = requests.get(f"{API}/kpis/catalog", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        catalog = r.json()
        assert isinstance(catalog, list) and len(catalog) >= 20, f"expected >=20 KPIs, got {len(catalog)}"

        categories = {k["category"] for k in catalog}
        assert "Task & Project Delivery" in categories

        tpd = [k for k in catalog if k["category"] == "Task & Project Delivery"]
        ids = {k["id"] for k in tpd}
        expected = {"tasks_assigned", "tasks_completed", "tasks_overdue",
                    "projects_member_of", "projects_leading"}
        assert ids == expected, f"Task & Project Delivery KPIs mismatch. Got {ids}"


# ── Test 7 — Performance metrics values ──────────────────────────────────────
class TestPerformanceMetrics:
    def test_task_project_kpi_values(self, admin_headers):
        role_id = None
        u2_id = None
        proj_leading_id = None
        proj_member_id = None
        task_ids = []
        try:
            # 1. Create role with all 5 new KPIs
            role_payload = {
                "name": f"TEST_iter90_role_{uuid.uuid4().hex[:6]}",
                "description": "iter90 test role",
                "permissions": [],
                "kpis": ["tasks_assigned", "tasks_completed", "tasks_overdue",
                         "projects_leading", "projects_member_of"],
            }
            r = requests.post(f"{API}/roles", json=role_payload,
                              headers=admin_headers, timeout=30)
            assert r.status_code == 200, f"role create failed: {r.text}"
            role_id = r.json().get("id")
            assert role_id

            # 2. Create user U2 with that role
            suffix = uuid.uuid4().hex[:6]
            u2_payload = {
                "email": f"TEST_iter90_u2_{suffix}@ex.com",
                "name": f"TEST U2 {suffix}", "phone": "8888888888",
                "username": f"test_iter90_u2_{suffix}",
                "password": "Iter90Test@123",
                "role_id": role_id, "city": "T", "reports_to": "", "permissions": [],
            }
            r = requests.post(f"{API}/team-users", json=u2_payload,
                              headers=admin_headers, timeout=30)
            assert r.status_code == 200, r.text
            u2_id = r.json()["id"]

            # 3. Create 3 tasks (2 completed, 1 pending) in current month
            for i in range(3):
                r = requests.post(f"{API}/tasks", json={
                    "title": f"TEST_iter90 u2 task {i}", "assigned_to": u2_id,
                    "priority": "medium", "due_date": _today_iso(),
                }, headers=admin_headers, timeout=30)
                assert r.status_code == 200
                task_ids.append(r.json()["id"])
            for tid in task_ids[:2]:
                requests.patch(f"{API}/tasks/{tid}", json={"status": "completed"},
                               headers=admin_headers, timeout=30)

            # 4. Overdue pending task with due_date 5 days ago
            r = requests.post(f"{API}/tasks", json={
                "title": "TEST_iter90 u2 overdue", "assigned_to": u2_id,
                "priority": "high", "due_date": _days_ago_iso(5),
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            task_ids.append(r.json()["id"])  # pending overdue

            # 5. Project where U2 leads
            r = requests.post(f"{API}/projects", json={
                "name": f"TEST_iter90 U2-lead {suffix}", "lead_id": u2_id,
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            proj_leading_id = r.json()["id"]

            # 6. Project where U2 is a member
            r = requests.post(f"{API}/projects", json={
                "name": f"TEST_iter90 U2-member {suffix}", "member_ids": [u2_id],
            }, headers=admin_headers, timeout=30)
            assert r.status_code == 200
            proj_member_id = r.json()["id"]

            # 7. GET performance
            now = datetime.now(timezone.utc)
            r = requests.get(
                f"{API}/users/{u2_id}/performance?month={now.month}&year={now.year}",
                headers=admin_headers, timeout=30)
            assert r.status_code == 200, r.text
            body = r.json()
            metrics = body.get("metrics", {})
            kpis = body.get("kpis", [])
            assert len(kpis) == 5, f"expected 5 KPIs, got {len(kpis)}"

            assert metrics.get("tasks_assigned") == 4, f"tasks_assigned expected 4, got {metrics.get('tasks_assigned')}"
            assert metrics.get("tasks_completed") == 2, f"tasks_completed expected 2, got {metrics.get('tasks_completed')}"
            assert metrics.get("tasks_overdue") == 1, f"tasks_overdue expected 1, got {metrics.get('tasks_overdue')}"
            assert metrics.get("projects_leading") == 1, f"projects_leading expected 1, got {metrics.get('projects_leading')}"
            assert metrics.get("projects_member_of") == 1, f"projects_member_of expected 1, got {metrics.get('projects_member_of')}"

        finally:
            for tid in task_ids:
                requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=30)
            for pid in (proj_leading_id, proj_member_id):
                if pid:
                    requests.delete(f"{API}/projects/{pid}", headers=admin_headers, timeout=30)
            if u2_id:
                requests.delete(f"{API}/team-users/{u2_id}", headers=admin_headers, timeout=30)
            if role_id:
                requests.delete(f"{API}/roles/{role_id}", headers=admin_headers, timeout=30)
