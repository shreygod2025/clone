"""Backend tests for Projects earnings endpoints + live-dashboard sessions block.

Covers:
 - POST/GET/PUT/DELETE /api/projects/{pid}/earnings and /api/projects/earnings/{id}
 - GST calculation (gst_amount, total_amount)
 - GET /api/live-dashboard/snapshot sessions block has required keys
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
PROJECT_ID = "7ff3645b-008c-4d9f-a65c-c48c05d3a820"


@pytest.fixture(scope="module")
def admin_token():
    for ep in ("/api/auth/login",):
        r = requests.post(f"{BASE_URL}{ep}", json={"email": "admin@oll.co", "password": "GodisGreat@2026"})
        if r.status_code == 200 and r.json().get("access_token"):
            return r.json()["access_token"]
    pytest.skip("Admin login failed")


@pytest.fixture(scope="module")
def h(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestProjectEarnings:
    created_ids = []

    def test_list_earnings_initial(self, h):
        r = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/earnings", headers=h)
        assert r.status_code == 200
        d = r.json()
        assert "earnings" in d and "total" in d and "total_gst" in d and "total_with_gst" in d
        assert isinstance(d["earnings"], list)

    def test_create_earning_with_gst(self, h):
        payload = {
            "amount": 5000,
            "gst_percent": 18,
            "earning_date": "2026-01-15",
            "source": "Test Client Pytest",
            "description": "pytest earning",
            "invoice_number": "INV-TEST-001",
            "invoice_url": "",
        }
        r = requests.post(f"{BASE_URL}/api/projects/{PROJECT_ID}/earnings", json=payload, headers=h)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == 5000
        assert d["gst_percent"] == 18
        assert d["gst_amount"] == 900.0
        assert d["total_amount"] == 5900.0
        assert d["source"] == "Test Client Pytest"
        assert "id" in d
        TestProjectEarnings.created_ids.append(d["id"])

    def test_create_earning_no_gst(self, h):
        payload = {
            "amount": 1000, "gst_percent": 0, "earning_date": "2026-01-10",
            "source": "Test Client Zero", "description": "", "invoice_number": "", "invoice_url": "",
        }
        r = requests.post(f"{BASE_URL}/api/projects/{PROJECT_ID}/earnings", json=payload, headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["gst_amount"] == 0.0
        assert d["total_amount"] == 1000.0
        TestProjectEarnings.created_ids.append(d["id"])

    def test_update_earning(self, h):
        eid = TestProjectEarnings.created_ids[-1]
        payload = {
            "amount": 2000, "gst_percent": 5, "earning_date": "2026-01-11",
            "source": "Test Client Updated", "description": "upd", "invoice_number": "I2", "invoice_url": "",
        }
        r = requests.put(f"{BASE_URL}/api/projects/earnings/{eid}", json=payload, headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["amount"] == 2000
        assert d["gst_amount"] == 100.0
        assert d["total_amount"] == 2100.0
        assert d["source"] == "Test Client Updated"

    def test_totals_after_adds(self, h):
        r = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/earnings", headers=h)
        assert r.status_code == 200
        d = r.json()
        # Should include the pytest-created ones
        src_names = [e["source"] for e in d["earnings"]]
        assert any("Test Client" in s for s in src_names)

    def test_delete_earnings_cleanup(self, h):
        for eid in TestProjectEarnings.created_ids:
            r = requests.delete(f"{BASE_URL}/api/projects/earnings/{eid}", headers=h)
            assert r.status_code == 200
        # verify gone
        r = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/earnings", headers=h)
        remaining_ids = [e["id"] for e in r.json()["earnings"]]
        for eid in TestProjectEarnings.created_ids:
            assert eid not in remaining_ids

    def test_delete_nonexistent(self, h):
        r = requests.delete(f"{BASE_URL}/api/projects/earnings/non-existent-xyz", headers=h)
        assert r.status_code == 404


class TestLiveDashboardSessions:
    def test_snapshot_sessions_block(self):
        r = requests.get(f"{BASE_URL}/api/live-dashboard/snapshot", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "sessions" in d
        s = d["sessions"]
        # Required keys per task
        for k in ("total", "checked_in", "not_checked_in", "on_time", "late"):
            assert k in s, f"missing {k} in sessions block"
        # checked_in == on_time + late
        assert s["checked_in"] == s["on_time"] + s["late"]
        # checked_in + not_checked_in == total
        assert s["checked_in"] + s["not_checked_in"] == s["total"]
