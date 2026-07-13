"""Iteration 101 - Verify task-assignment email pipeline end-to-end.

Flow:
1. Admin login (admin@oll.co)
2. GET /api/team/users -> pick a team user with email
3. POST /api/tasks assigning to that user
4. Verify notification row in notifications_inapp
5. Verify [task-email] log line with status=200 in backend log
"""
import os
import time
import subprocess
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def test_standalone_script_dispatches_resend_200():
    """Run the one-off script and assert Resend 200 line."""
    proc = subprocess.run(
        ["python", "/app/backend/tests/send_test_task_email.py"],
        capture_output=True, text=True, timeout=30, cwd="/app/backend",
    )
    combined = proc.stdout + proc.stderr
    print(combined)
    assert proc.returncode == 0, f"script failed: {combined}"
    assert "status=200" in combined, "Expected `[task-email] sent ... status=200` line in output"
    assert "shreyaan@oll.co" in combined


def test_list_team_users(headers):
    r = requests.get(f"{BASE_URL}/api/team/users", headers=headers, timeout=15)
    assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
    data = r.json()
    users = data if isinstance(data, list) else data.get("users") or data.get("data") or []
    assert users, "No team users returned"
    with_email = [u for u in users if u.get("email")]
    assert with_email, "No team users have email"
    # cache for next test
    test_list_team_users.picked = with_email[0]


def test_create_task_triggers_notification_and_email(headers):
    picked = getattr(test_list_team_users, "picked", None)
    assert picked, "Prior test must run first"
    assignee_id = picked.get("id") or picked.get("user_id")
    assignee_email = picked["email"]
    print(f"Assigning task to user_id={assignee_id} email={assignee_email}")

    due = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    payload = {
        "title": "TEST_iter101 verify email pipeline",
        "description": "Automated test to verify task-assignment email dispatch",
        "assigned_to": assignee_id,
        "priority": "high",
        "due_date": due,
    }
    # snapshot backend log length
    log_path_candidates = [
        "/var/log/supervisor/backend.err.log",
        "/var/log/supervisor/backend.out.log",
    ]
    before = {}
    for p in log_path_candidates:
        try:
            before[p] = os.path.getsize(p)
        except OSError:
            before[p] = 0

    r = requests.post(f"{BASE_URL}/api/tasks", headers=headers, json=payload, timeout=20)
    assert r.status_code in (200, 201), f"{r.status_code} {r.text[:400]}"
    task = r.json()
    task_id = task.get("id") or task.get("task_id")
    assert task_id, f"No task id in response: {task}"
    assert task["assigned_to"] == assignee_id

    # Wait for fire-and-forget email + notification insert
    time.sleep(4)

    # Verify notification row via Mongo
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio
    async def _check_notif():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        n = await db.notifications_inapp.find_one({"task_id": task_id, "user_id": assignee_id})
        client.close()
        return n
    notif = asyncio.get_event_loop().run_until_complete(_check_notif())
    assert notif, f"No notifications_inapp row for task {task_id} user {assignee_id}"
    assert notif["type"] == "task_assigned"

    # Verify log line
    found = False
    for p, offset in before.items():
        try:
            with open(p, "r") as f:
                f.seek(offset)
                new_content = f.read()
                if f"[task-email] sent to={assignee_email} status=200" in new_content:
                    found = True
                    break
                if f"[task-email] sent to={assignee_email}" in new_content and "status=200" in new_content:
                    found = True
                    break
        except OSError:
            continue
    assert found, f"Did not find `[task-email] sent to={assignee_email} status=200` in backend logs since task creation"

    # Cleanup: delete task
    try:
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=headers, timeout=10)
    except Exception:
        pass
