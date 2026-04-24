"""
Iteration 74 regression tests:
- GET /api/summer-camp/dashboard returns team_performance array + unassigned object
- PATCH /api/summer-camp/bookings/{id}/assign end-to-end (assign + unassign)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ── Dashboard team performance ──────────────────────────────────────────────
class TestDashboardTeamPerformance:
    def test_dashboard_returns_team_performance(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/summer-camp/dashboard", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        # Top-level keys
        assert "team_performance" in data, "team_performance missing from dashboard"
        assert "unassigned" in data, "unassigned missing from dashboard"
        assert isinstance(data["team_performance"], list)
        assert isinstance(data["unassigned"], dict)

    def test_team_performance_row_schema(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/summer-camp/dashboard", headers=auth_headers, timeout=30)
        data = r.json()
        tp = data["team_performance"]
        # There are 3 pre-assigned bookings across 2 users per context
        assert len(tp) >= 1, "expected at least one team performer"
        for row in tp:
            for k in ("user_id", "name", "leads", "converted", "hot_leads", "lost", "conversion_rate", "revenue"):
                assert k in row, f"missing key {k} in team_performance row: {row}"
            assert isinstance(row["leads"], int)
            assert isinstance(row["converted"], int)
            assert isinstance(row["conversion_rate"], (int, float))

    def test_unassigned_schema(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/summer-camp/dashboard", headers=auth_headers, timeout=30)
        data = r.json()
        un = data["unassigned"]
        for k in ("leads", "converted", "conversion_rate"):
            assert k in un, f"missing key {k} in unassigned: {un}"
        assert isinstance(un["leads"], int)
        assert un["leads"] >= 0

    def test_team_performance_sorted_by_converted_then_leads(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/summer-camp/dashboard", headers=auth_headers, timeout=30)
        tp = r.json()["team_performance"]
        for i in range(len(tp) - 1):
            a, b = tp[i], tp[i + 1]
            assert (a["converted"], a["leads"]) >= (b["converted"], b["leads"]), \
                "team_performance not sorted desc by (converted, leads)"

    def test_totals_vs_bookings_consistency(self, auth_headers):
        """team leads + unassigned.leads should equal total bookings (approx)."""
        r = requests.get(f"{BASE_URL}/api/summer-camp/dashboard", headers=auth_headers, timeout=30)
        data = r.json()
        team_total = sum(row["leads"] for row in data["team_performance"])
        un_total = data["unassigned"]["leads"]
        total_bookings = data.get("total_bookings", 0)
        assert team_total + un_total == total_bookings, \
            f"team {team_total} + unassigned {un_total} != total {total_bookings}"


# ── Assign / Unassign PATCH ─────────────────────────────────────────────────
class TestAssignUnassign:
    def _get_active_team_user(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/team-users", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text[:200]
        payload = r.json()
        users = payload if isinstance(payload, list) else payload.get("users", [])
        users = [u for u in users if u.get("is_active", True)]
        assert len(users) > 0, "no active team users"
        return users[0]

    def _get_any_booking(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/summer-camp/bookings?limit=1", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text[:200]
        payload = r.json()
        items = payload if isinstance(payload, list) else (payload.get("bookings") or payload.get("items") or [])
        assert isinstance(items, list) and items, "no bookings to assign"
        return items[0]

    def test_assign_then_unassign(self, auth_headers):
        booking = self._get_any_booking(auth_headers)
        tu = self._get_active_team_user(auth_headers)
        bid = booking["id"]
        tu_id = tu["id"]

        # Assign
        r = requests.patch(
            f"{BASE_URL}/api/summer-camp/bookings/{bid}/assign",
            json={"assigned_to": tu_id},
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"assign failed: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body.get("success") is True or body.get("assigned_to") == tu_id or "assigned_to" in body

        # Verify via GET list
        r2 = requests.get(f"{BASE_URL}/api/summer-camp/bookings?limit=500", headers=auth_headers, timeout=30)
        p2 = r2.json()
        items = p2 if isinstance(p2, list) else (p2.get("bookings") or p2.get("items") or [])
        row = next((b for b in items if b["id"] == bid), None)
        assert row is not None, "booking vanished after assign"
        assert row.get("assigned_to") == tu_id, f"assigned_to not persisted: {row.get('assigned_to')}"
        assert row.get("assigned_to_name"), "assigned_to_name not persisted"

        # Unassign (null assigned_to)
        r3 = requests.patch(
            f"{BASE_URL}/api/summer-camp/bookings/{bid}/assign",
            json={"assigned_to": None},
            headers=auth_headers,
            timeout=30,
        )
        assert r3.status_code == 200, f"unassign failed: {r3.status_code} {r3.text[:200]}"

        # Verify cleared
        r4 = requests.get(f"{BASE_URL}/api/summer-camp/bookings?limit=500", headers=auth_headers, timeout=30)
        p4 = r4.json()
        items = p4 if isinstance(p4, list) else (p4.get("bookings") or p4.get("items") or [])
        row = next((b for b in items if b["id"] == bid), None)
        assert not row.get("assigned_to"), f"assigned_to not cleared: {row.get('assigned_to')}"
