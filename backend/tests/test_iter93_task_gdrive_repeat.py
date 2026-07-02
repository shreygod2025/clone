"""Iter93 backend tests: gdrive_link persistence + scheduled_tasks integration."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def admin_token(admin_credentials):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=admin_credentials, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_id(admin_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    return r.json()["id"]


class TestGdriveLink:
    def test_create_task_with_gdrive_link(self, admin_headers, admin_id):
        url1 = "https://drive.google.com/file/d/xyz"
        r = requests.post(f"{BASE_URL}/api/tasks", headers=admin_headers, json={
            "title": "TEST_iter93 gd-link",
            "assigned_to": admin_id,
            "gdrive_link": url1,
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("gdrive_link") == url1
        task_id = data["id"]

        # GET verifies persistence
        r2 = requests.get(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers, timeout=30)
        assert r2.status_code == 200, r2.text
        assert r2.json().get("gdrive_link") == url1

        # PATCH update
        url2 = "https://drive.google.com/file/d/UPDATED"
        r3 = requests.patch(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers,
                            json={"gdrive_link": url2}, timeout=30)
        assert r3.status_code == 200, r3.text

        r4 = requests.get(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers, timeout=30)
        assert r4.json().get("gdrive_link") == url2

        # cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=admin_headers, timeout=30)


class TestScheduledTasksEndpoint:
    def test_scheduled_tasks_endpoint_reachable(self, admin_headers, admin_id):
        # Create a scheduled_tasks rule the way the frontend does
        payload = {
            "title": "TEST_iter93 daily repeat",
            "assigned_to": admin_id,
            "frequency": "daily",
            "priority": "medium",
        }
        r = requests.post(f"{BASE_URL}/api/scheduled-tasks", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code in (200, 201), f"scheduled-tasks create failed: {r.status_code} {r.text}"
        rule = r.json()
        assert rule.get("frequency") == "daily"
        assert rule.get("title") == payload["title"]
        rule_id = rule.get("id")

        # GET list should include it
        r2 = requests.get(f"{BASE_URL}/api/scheduled-tasks", headers=admin_headers, timeout=30)
        assert r2.status_code == 200, r2.text
        items = r2.json() if isinstance(r2.json(), list) else r2.json().get("items", [])
        titles = [i.get("title") for i in items]
        assert payload["title"] in titles

        # cleanup
        if rule_id:
            requests.delete(f"{BASE_URL}/api/scheduled-tasks/{rule_id}", headers=admin_headers, timeout=30)
