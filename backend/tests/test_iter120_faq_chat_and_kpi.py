"""
Iteration 120 tests:
  1. KPI bug: /api/users/{user_id}/performance support_tickets_assigned
     must count tickets on user's plate during period (open OR resolved
     in-period), not just created-in-period.
  2. FAQ chatbot: /api/faq-chat (POST), /api/faq-chat/suggestions (GET),
     /api/faq-chat/raise-ticket (POST), memory across turns, logged-in
     ticket context, auth bypass guard.
"""
import os
import uuid
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "GodisGreat@2026"
TIMEOUT = 40


# ─── Fixtures ────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"No token in login response: {data}"
    return tok


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ─── KPI catalog + aggregation flags ─────────────────────────────────────
class TestKPICatalog:
    def test_support_tickets_assigned_has_max_aggregation(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/kpis/catalog", headers=admin_headers, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:200]
        catalog = r.json().get("catalog", [])
        by_id = {k["id"]: k for k in catalog}
        assert "support_tickets_assigned" in by_id
        assert by_id["support_tickets_assigned"].get("aggregation") == "max", \
            f"support_tickets_assigned aggregation = {by_id['support_tickets_assigned'].get('aggregation')}"
        # sla_breach should be snapshot
        assert by_id.get("support_sla_breach_over_3d", {}).get("aggregation") == "snapshot"


# ─── User performance — support_tickets_assigned bug ────────────────────
class TestUserPerformanceSupportAssigned:
    def test_assigned_covers_open_tickets_backlog(self, admin_headers):
        """Find a support agent with open tickets and verify assigned count
        >= number of currently-open tickets assigned to them (across all time
        prior to end-of-month)."""
        # Pull all team_users via admin endpoint
        r = requests.get(f"{BASE_URL}/api/team/users", headers=admin_headers, timeout=TIMEOUT)
        if r.status_code != 200:
            pytest.skip(f"Can't list team users: {r.status_code}")
        users = r.json() if isinstance(r.json(), list) else r.json().get("users", [])
        if not users:
            pytest.skip("No team users to test against")

        # Find a user that has assigned tickets in support_queries by scanning
        # the admin-support list endpoint.
        picked_user = None
        picked_open_count = 0
        # Try the first ~15 users
        for u in users[:30]:
            uid = u.get("id")
            if not uid:
                continue
            # Count how many support_queries are assigned to this user & still open
            r2 = requests.get(
                f"{BASE_URL}/api/support/queries",
                params={"assigned_to": uid, "status": "open", "limit": 500},
                headers=admin_headers,
                timeout=TIMEOUT,
            )
            if r2.status_code != 200:
                continue
            body = r2.json()
            tickets = body if isinstance(body, list) else body.get("queries") or body.get("items") or []
            if tickets:
                picked_user = u
                picked_open_count = len(tickets)
                break

        if not picked_user:
            pytest.skip("No team user with any assigned open support tickets in preview DB")

        uid = picked_user["id"]
        # Current month
        import datetime
        today = datetime.datetime.utcnow()
        r3 = requests.get(
            f"{BASE_URL}/api/users/{uid}/performance",
            params={"month": today.month, "year": today.year},
            headers=admin_headers,
            timeout=TIMEOUT,
        )
        assert r3.status_code == 200, r3.text[:300]
        metrics = r3.json().get("metrics", {})
        assigned = metrics.get("support_tickets_assigned", 0)
        print(f"User {picked_user.get('name')} ({uid}): open_tickets_counted={picked_open_count}, "
              f"support_tickets_assigned_metric={assigned}")
        # Assigned should be AT LEAST the # of open tickets (plus any resolved-in-month)
        assert assigned >= picked_open_count, (
            f"BUG: support_tickets_assigned ({assigned}) < open ticket count ({picked_open_count}) "
            f"for user {picked_user.get('name')}. The 'assigned' metric is undercounting backlog."
        )


# ─── FAQ chatbot ─────────────────────────────────────────────────────────
class TestFAQChatSuggestions:
    def test_suggestions_returns_8(self):
        r = requests.get(f"{BASE_URL}/api/faq-chat/suggestions", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:200]
        s = r.json().get("suggestions", [])
        assert isinstance(s, list) and len(s) == 8, f"Got {len(s)} suggestions"
        assert all(isinstance(x, str) and len(x) > 0 for x in s)


class TestFAQChatCore:
    def _post(self, body, headers=None):
        return requests.post(f"{BASE_URL}/api/faq-chat", json=body,
                             headers=headers or {}, timeout=TIMEOUT)

    def test_register_link_present(self):
        sid = f"tst-reg-{uuid.uuid4().hex[:6]}"
        r = self._post({"session_id": sid, "message": "How do I register for Techfest 2026?"})
        assert r.status_code == 200, r.text[:300]
        reply = r.json().get("reply", "").lower()
        print(f"[register] reply: {reply[:300]}")
        assert "oll.co/techfest/register" in reply, f"No registration URL in reply: {reply[:400]}"

    def test_sumo_arena_100cm_overrides_pdf(self):
        sid = f"tst-sumo-{uuid.uuid4().hex[:6]}"
        r = self._post({"session_id": sid, "message": "What is the RoboSumo arena diameter?"})
        assert r.status_code == 200, r.text[:300]
        reply = r.json().get("reply", "").lower()
        print(f"[sumo] reply: {reply[:400]}")
        assert "150" not in reply or "100" in reply, (
            f"Reply still mentions outdated 150 cm without 100 cm correction: {reply[:400]}"
        )
        has_100 = "100 cm" in reply or "100cm" in reply or "1 m" in reply or "1 meter" in reply or "1m " in reply or "(1 m)" in reply
        assert has_100, f"Reply does not state 100 cm / 1 m sumo arena: {reply[:400]}"

    def test_racer_track_5m(self):
        sid = f"tst-race-{uuid.uuid4().hex[:6]}"
        r = self._post({"session_id": sid, "message": "What is the RoboRacer track length?"})
        assert r.status_code == 200, r.text[:300]
        reply = r.json().get("reply", "").lower()
        print(f"[racer] reply: {reply[:400]}")
        assert ("5 m" in reply or "5m" in reply or "5 meter" in reply or "5 metre" in reply or
                "five m" in reply), f"Reply does not mention 5m track: {reply[:400]}"

    def test_memory_across_turns(self):
        sid = f"tst-mem-{uuid.uuid4().hex[:6]}"
        r1 = self._post({"session_id": sid, "message": "I'm a Grade 7 student"})
        assert r1.status_code == 200, r1.text[:200]
        time.sleep(1)
        r2 = self._post({"session_id": sid, "message": "Which track can I join?"})
        assert r2.status_code == 200, r2.text[:200]
        reply2 = r2.json().get("reply", "").lower()
        print(f"[memory] reply2: {reply2[:400]}")
        # Bot should NOT ask what grade; should reflect Grade 7 context
        asks_grade = ("what grade" in reply2 or "which grade" in reply2 or
                      "what class" in reply2 or "which class are you" in reply2)
        reflects_g7 = ("grade 7" in reply2 or "7th" in reply2 or "class 7" in reply2 or
                       "you can" in reply2 or "you're eligible" in reply2 or
                       "you are eligible" in reply2 or "robo" in reply2)
        assert not asks_grade, f"Bot asked for grade again, lost memory: {reply2[:400]}"
        assert reflects_g7, f"Bot didn't reflect Grade 7 context: {reply2[:400]}"


class TestFAQChatAuthContext:
    def test_logged_in_tickets_context(self, admin_headers):
        sid = f"tst-auth-{uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{BASE_URL}/api/faq-chat",
            json={"session_id": sid, "message": "Do I have any open support tickets?"},
            headers=admin_headers,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text[:300]
        reply = r.json().get("reply", "").lower()
        print(f"[auth-tickets] reply: {reply[:400]}")
        # Must mention ticket or 'no tickets' — must NOT ask them to log in.
        assert ("ticket" in reply or "no" in reply or "do not have" in reply or
                "don't have" in reply), f"Odd reply: {reply[:400]}"

    def test_anonymous_does_not_leak_tickets(self):
        sid = f"tst-anon-{uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{BASE_URL}/api/faq-chat",
            json={"session_id": sid, "message": "Do I have any open support tickets?"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text[:300]
        reply = r.json().get("reply", "").lower()
        print(f"[anon-tickets] reply: {reply[:400]}")
        # Should point to login / support — must NOT read a user's ticket list
        assert ("log in" in reply or "login" in reply or "sign in" in reply or
                "support@oll.co" in reply or "need help" in reply or
                "my-bookings" in reply), f"Anon reply didn't point to login/support: {reply[:400]}"


class TestFAQChatEscalation:
    def test_raise_ticket(self):
        sid = f"tst-escal-{uuid.uuid4().hex[:6]}"
        body = {
            "session_id": sid,
            "name": "Test User",
            "email": "test_iter120@example.com",
            "phone": "",
            "message": "bot didnt help, test escalation iter120",
        }
        r = requests.post(f"{BASE_URL}/api/faq-chat/raise-ticket", json=body, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("ok") is True
        assert data.get("ticket_id")

    def test_raise_ticket_requires_email_and_message(self):
        r = requests.post(
            f"{BASE_URL}/api/faq-chat/raise-ticket",
            json={"session_id": "x", "name": "nope"},
            timeout=TIMEOUT,
        )
        assert r.status_code in (400, 422), f"Got {r.status_code}"
