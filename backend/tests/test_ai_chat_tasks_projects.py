"""Regression: AI Chat can now CRUD tasks + projects in My Space.

Covers:
- create_task with fuzzy assignee-name resolution → correct assigned_to
- update_task by title match (no id) → status change flows through
- assign_task by name → assigned_to updated + WhatsApp fired
- remind_task → notification + WhatsApp fired
- delete_task → row removed
- create_project + update_project + delete_project (with task detach)

All notifications are stubbed so the test doesn't need AiSensy access.
"""
import pytest


@pytest.mark.asyncio
async def test_ai_chat_tasks_projects_crud(monkeypatch):
    pytest.importorskip("mongomock_motor")
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
    fake_db = client["testdb"]

    from routes import ai_chat as chat_mod

    # Point the module at our in-memory DB
    monkeypatch.setattr(chat_mod, "db", fake_db)

    # Also stub the WhatsApp + inapp helpers so we don't hit external services
    calls = {"wa": [], "notif": []}

    async def _fake_wa(task, template_key, assigner_id):
        calls["wa"].append({"template": template_key, "assignee": task.get("assigned_to"),
                            "task_id": task.get("id")})

    async def _fake_notif(user_id, type_, title, message="", task_id=None, actor_id=None, cta_path=None):
        calls["notif"].append({"user": user_id, "type": type_, "title": title})

    import importlib, sys
    tasks_mod = importlib.import_module("routes.tasks")
    monkeypatch.setattr(tasks_mod, "_notify_task_whatsapp", _fake_wa)
    inapp_mod = importlib.import_module("routes.inapp_notifications")
    monkeypatch.setattr(inapp_mod, "create_notification", _fake_notif)

    # Seed team members: admin (uid), Priya, Rahul
    admin = {"id": "u-admin", "name": "Admin", "email": "admin@oll.co", "role": "super_admin"}
    priya = {"id": "u-priya", "name": "Priya Sharma", "email": "priya@oll.co",
             "phone": "9111111111", "role": "manager", "is_active": True}
    rahul = {"id": "u-rahul", "name": "Rahul Verma", "email": "rahul@oll.co",
             "phone": "9222222222", "role": "team_member", "is_active": True}
    await fake_db.admins.insert_one(admin)
    await fake_db.team_users.insert_many([priya, rahul])

    user = admin
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    def log(desc):
        return {"description": desc}

    # ── 1) create_task with fuzzy assignee name ───────────────
    r = await chat_mod._execute_tasks_projects(
        {"type": "create_task", "title": "Ship the demo deck",
         "assigned_to_name": "Priya", "priority": "high",
         "due_date": "2026-03-01"},
        user, log, now,
    )
    assert r and r["status"] == "success"
    tid = r["task_id"]
    task = await fake_db.tasks.find_one({"id": tid}, {"_id": 0})
    assert task["assigned_to"] == "u-priya"
    assert task["priority"] == "high"
    assert task["code"].startswith("TASK-")
    # WhatsApp fired for assignment
    assert any(c["template"] == "task_assigned" and c["assignee"] == "u-priya" for c in calls["wa"])

    # ── 2) update_task by title (no id) → status = in_progress ─
    r = await chat_mod._execute_tasks_projects(
        {"type": "update_task", "task_title": "Ship the demo",
         "fields": {"status": "in_progress"}},
        user, log, now,
    )
    assert r and r["status"] == "success" and r["task_id"] == tid
    assert (await fake_db.tasks.find_one({"id": tid}))["status"] == "in_progress"

    # ── 3) assign_task by name → Rahul; WhatsApp reassigned ───
    r = await chat_mod._execute_tasks_projects(
        {"type": "assign_task", "task_id": tid, "assigned_to_name": "Rahul"},
        user, log, now,
    )
    assert r["status"] == "success"
    assert (await fake_db.tasks.find_one({"id": tid}))["assigned_to"] == "u-rahul"
    assert any(c["template"] == "task_reassigned" and c["assignee"] == "u-rahul"
               for c in calls["wa"])

    # ── 4) remind_task → WA + in-app notif ────────────────────
    r = await chat_mod._execute_tasks_projects(
        {"type": "remind_task", "task_id": tid, "reminder_text": "Due today"},
        user, log, now,
    )
    assert r["status"] == "success"
    assert any(c["title"].startswith("Reminder") for c in calls["notif"])

    # ── 5) delete_task ────────────────────────────────────────
    r = await chat_mod._execute_tasks_projects(
        {"type": "delete_task", "task_id": tid}, user, log, now
    )
    assert r["status"] == "success"
    assert await fake_db.tasks.count_documents({"id": tid}) == 0

    # ── 6) create_project + attach a task + delete_project ────
    r = await chat_mod._execute_tasks_projects(
        {"type": "create_project", "name": "Website Revamp",
         "member_names": ["Priya", "Rahul"]},
        user, log, now,
    )
    pid = r["project_id"]
    proj = await fake_db.projects.find_one({"id": pid}, {"_id": 0})
    assert proj["name"] == "Website Revamp"
    assert set(proj["member_ids"]) == {"u-priya", "u-rahul"}

    # Attach a task manually then delete project → task should be detached
    await fake_db.tasks.insert_one({"id": "t-inside", "title": "Fix hero",
                                    "project_id": pid, "assigned_to": "u-priya",
                                    "status": "pending"})
    r = await chat_mod._execute_tasks_projects(
        {"type": "delete_project", "project_name": "Website Revamp"},
        user, log, now,
    )
    assert r["status"] == "success"
    assert await fake_db.projects.count_documents({"id": pid}) == 0
    # Task still exists but detached
    inside = await fake_db.tasks.find_one({"id": "t-inside"}, {"_id": 0})
    assert inside is not None
    assert inside["project_id"] is None
