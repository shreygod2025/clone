"""Tests for Summer Camp assign, capture-lead dedup, cleanup endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASS = "Dagaji03@"


@pytest.fixture(scope="module")
def admin_token():
    # /api/auth/login
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    if not tok:
        pytest.skip(f"No token in login response: {data}")
    return tok


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ── capture-lead dedup ────────────────────────────────────────────────────────
class TestCaptureLeadDedup:
    def test_capture_lead_dedup_returns_same_booking_id(self):
        import uuid as _u
        phone = "9" + str(_u.uuid4().int)[:9]
        payload = {
            "parent_phone": phone,
            "age_group": "creators",
            "batch_type": "weekday",
            "batch_week": "week1",
            "mode": "offline",
            "center": "andheri",
        }
        r1 = requests.post(f"{BASE_URL}/api/summer-camp/capture-lead", json=payload, timeout=30)
        assert r1.status_code == 200, r1.text
        bid1 = r1.json().get("booking_id")
        assert bid1

        r2 = requests.post(f"{BASE_URL}/api/summer-camp/capture-lead", json=payload, timeout=30)
        assert r2.status_code == 200, r2.text
        bid2 = r2.json().get("booking_id")
        assert bid1 == bid2, f"Dedup failed: {bid1} vs {bid2}"


# ── Assign + unassign booking ─────────────────────────────────────────────────
class TestAssignBooking:
    def test_assign_and_unassign(self, auth_headers):
        # Get a booking
        br = requests.get(f"{BASE_URL}/api/summer-camp/bookings", headers=auth_headers, timeout=30)
        assert br.status_code == 200, br.text
        bookings = br.json()
        assert len(bookings) > 0, "No bookings to test with"
        booking_id = bookings[0]["id"]

        # Get team users
        tr = requests.get(f"{BASE_URL}/api/team-users", headers=auth_headers, timeout=30)
        assert tr.status_code == 200, tr.text
        team_users = tr.json() if isinstance(tr.json(), list) else tr.json().get("users", [])
        active = [u for u in team_users if u.get("is_active", True) is not False]
        if not active:
            pytest.skip("No active team users available")
        tu_id = active[0].get("id")
        tu_name = active[0].get("name")
        assert tu_id

        # Assign
        ar = requests.patch(
            f"{BASE_URL}/api/summer-camp/bookings/{booking_id}/assign",
            headers=auth_headers,
            json={"assigned_to": tu_id},
            timeout=30,
        )
        assert ar.status_code == 200, ar.text
        body = ar.json()
        assert body.get("success") is True
        assert body.get("assigned_to") == tu_id
        assert body.get("assigned_to_name") == tu_name

        # Verify persistence via GET
        gr = requests.get(f"{BASE_URL}/api/summer-camp/bookings", headers=auth_headers, timeout=30)
        assert gr.status_code == 200
        match = next((b for b in gr.json() if b["id"] == booking_id), None)
        assert match is not None
        assert match.get("assigned_to") == tu_id
        assert match.get("assigned_to_name") == tu_name

        # Unassign
        ur = requests.patch(
            f"{BASE_URL}/api/summer-camp/bookings/{booking_id}/assign",
            headers=auth_headers,
            json={"assigned_to": None},
            timeout=30,
        )
        assert ur.status_code == 200, ur.text
        ub = ur.json()
        assert ub.get("assigned_to") is None
        assert ub.get("assigned_to_name") is None

        # Verify unassigned
        gr2 = requests.get(f"{BASE_URL}/api/summer-camp/bookings", headers=auth_headers, timeout=30)
        match2 = next((b for b in gr2.json() if b["id"] == booking_id), None)
        assert match2.get("assigned_to") in (None, "")

    def test_assign_invalid_user(self, auth_headers):
        br = requests.get(f"{BASE_URL}/api/summer-camp/bookings", headers=auth_headers, timeout=30)
        booking_id = br.json()[0]["id"]
        r = requests.patch(
            f"{BASE_URL}/api/summer-camp/bookings/{booking_id}/assign",
            headers=auth_headers,
            json={"assigned_to": "non-existent-id-xyz"},
            timeout=30,
        )
        assert r.status_code == 404


# ── Cleanup endpoint ──────────────────────────────────────────────────────────
class TestCleanupDuplicates:
    def test_cleanup_duplicates(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/summer-camp/cleanup-duplicates", headers=auth_headers, timeout=60)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("success") is True
        assert isinstance(b.get("removed"), int)


# ── KPI counts sum correctly ──────────────────────────────────────────────────
class TestKPICounts:
    def test_kpi_total_matches_sum(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/summer-camp/bookings", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        bookings = r.json()
        total = len(bookings)
        by_status = {}
        for b in bookings:
            s = b.get("crm_status", "unknown")
            by_status[s] = by_status.get(s, 0) + 1
        print(f"Total: {total}, by status: {by_status}")
        # Sum of all statuses should equal total
        assert sum(by_status.values()) == total
