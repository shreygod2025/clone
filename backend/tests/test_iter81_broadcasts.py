"""
Iteration 81 - Bulk Email (Broadcasts) backend tests.

Covers:
- audience preview (counts, source filter, unsubscribe exclusion)
- campaign CRUD (create draft, get with stats, delete only draft/failed)
- send: schedule branch (no actual email send because of unknown audience)
- public unsubscribe lookup + confirm
- Resend webhook ingestion + auto-unsubscribe for bounces
"""
import os
import uuid

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip().strip('"').rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Dagaji03@")

# Direct DB connection for seeding (uses backend env vars same way the backend does)
MONGO_URL = None
DB_NAME = None
with open("/app/backend/.env") as f:
    for line in f:
        if line.startswith("MONGO_URL="):
            MONGO_URL = line.split("=", 1)[1].strip().strip('"')
        if line.startswith("DB_NAME="):
            DB_NAME = line.split("=", 1)[1].strip().strip('"')

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]

TEST_EMAIL = "resend.test+iter81@example.com"
TEST_PAYMENT_ID = f"TEST_iter81_{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json().get("access_token")


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module", autouse=True)
def seed_paid_record():
    """Seed a paid school_student_payments record so audience > 0."""
    db.school_student_payments.insert_one({
        "id": TEST_PAYMENT_ID,
        "payment_id": TEST_PAYMENT_ID,
        "status": "PAID",
        "order_status": "PAID",
        "student_email": TEST_EMAIL,
        "student_name": "Test Student",
        "school_name": "TEST_iter81 School",
        "grade": "7",
        "city": "Mumbai",
        "skill": "Robotics",
    })
    # Ensure email is NOT in unsubscribes initially
    db.broadcast_unsubscribes.delete_one({"email": TEST_EMAIL})
    yield
    # Cleanup
    db.school_student_payments.delete_one({"id": TEST_PAYMENT_ID})
    db.broadcast_unsubscribes.delete_one({"email": TEST_EMAIL})
    db.broadcast_campaigns.delete_many({"name": {"$regex": "^TEST_iter81"}})
    db.broadcast_events.delete_many({"recipient": TEST_EMAIL})
    db.unsubscribe_tokens.delete_many({"email": TEST_EMAIL})


# ── 1) Audience preview ────────────────────────────────────────
class TestAudiencePreview:
    def test_preview_school_includes_seeded(self, headers):
        r = requests.get(f"{API}/admin/broadcasts/audience/preview",
                         params={"source": "school", "school": "TEST_iter81"}, headers=headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "count" in data and "by_source" in data and "sample" in data
        assert data["count"] >= 1
        assert any(s["email"] == TEST_EMAIL for s in data["sample"])

    def test_preview_filter_by_city(self, headers):
        r = requests.get(f"{API}/admin/broadcasts/audience/preview",
                         params={"source": "school", "school": "TEST_iter81", "city": "Mumbai"},
                         headers=headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["count"] >= 1

    def test_preview_filter_excludes_other_city(self, headers):
        r = requests.get(f"{API}/admin/broadcasts/audience/preview",
                         params={"source": "school", "school": "TEST_iter81", "city": "NoSuchCityXYZ"},
                         headers=headers, timeout=15)
        assert r.status_code == 200
        emails = [s["email"] for s in r.json().get("sample", [])]
        assert TEST_EMAIL not in emails

    def test_preview_unauthenticated_rejected(self):
        r = requests.get(f"{API}/admin/broadcasts/audience/preview", timeout=15)
        assert r.status_code in (401, 403)

    def test_preview_respects_unsubscribed(self, headers):
        # Insert into unsubscribes, then preview should drop
        db.broadcast_unsubscribes.update_one(
            {"email": TEST_EMAIL},
            {"$set": {"email": TEST_EMAIL, "reason": "test", "unsubscribed_at": "now"}},
            upsert=True,
        )
        try:
            r = requests.get(f"{API}/admin/broadcasts/audience/preview",
                             params={"source": "school", "school": "TEST_iter81"}, headers=headers, timeout=15)
            assert r.status_code == 200
            emails = [s["email"] for s in r.json().get("sample", [])]
            assert TEST_EMAIL not in emails
        finally:
            db.broadcast_unsubscribes.delete_one({"email": TEST_EMAIL})


# ── 2) Campaign CRUD ───────────────────────────────────────────
class TestCampaignCRUD:
    def test_create_appends_unsubscribe_footer(self, headers):
        payload = {
            "name": "TEST_iter81 — create",
            "subject": "Hello",
            "html": "<p>Hi {{first_name}}</p>",  # no unsubscribe placeholder
            "filters": {"source": "school", "school": "TEST_iter81"},
        }
        r = requests.post(f"{API}/admin/broadcasts", json=payload, headers=headers, timeout=15)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["status"] == "draft"
        assert "id" in doc
        assert "{{unsubscribe_url}}" in doc["html"], "Unsubscribe placeholder should be auto-appended"

        # Verify via GET
        cid = doc["id"]
        g = requests.get(f"{API}/admin/broadcasts/{cid}", headers=headers, timeout=15)
        assert g.status_code == 200
        gdata = g.json()
        assert gdata["id"] == cid
        assert gdata["status"] == "draft"
        assert isinstance(gdata.get("stats"), dict)

    def test_create_preserves_existing_unsubscribe(self, headers):
        html = "<p>Hi {{first_name}} <a href='{{unsubscribe_url}}'>unsub</a></p>"
        r = requests.post(f"{API}/admin/broadcasts", json={
            "name": "TEST_iter81 — preserve",
            "subject": "S", "html": html,
            "filters": {"source": "school"},
        }, headers=headers, timeout=15)
        assert r.status_code == 200
        # Should not duplicate the boilerplate footer text
        assert r.json()["html"].count("{{unsubscribe_url}}") == 1

    def test_delete_draft_allowed(self, headers):
        r = requests.post(f"{API}/admin/broadcasts", json={
            "name": "TEST_iter81 — delete me",
            "subject": "S", "html": "<p>x</p>",
            "filters": {"source": "school"},
        }, headers=headers, timeout=15)
        cid = r.json()["id"]
        d = requests.delete(f"{API}/admin/broadcasts/{cid}", headers=headers, timeout=15)
        assert d.status_code == 200
        # Verify gone
        g = requests.get(f"{API}/admin/broadcasts/{cid}", headers=headers, timeout=15)
        assert g.status_code == 404

    def test_delete_sent_campaign_rejected(self, headers):
        # Insert a fake 'sent' campaign directly via DB
        cid = str(uuid.uuid4())
        db.broadcast_campaigns.insert_one({
            "id": cid, "name": "TEST_iter81 — sent campaign", "status": "sent",
            "subject": "x", "html": "<p>x</p>", "filters": {"source": "school"},
            "stats": {}, "from_address": "OLL <marketing@oll.co>",
        })
        try:
            r = requests.delete(f"{API}/admin/broadcasts/{cid}", headers=headers, timeout=15)
            assert r.status_code == 400
        finally:
            db.broadcast_campaigns.delete_one({"id": cid})


# ── 3) Send (schedule branch) ──────────────────────────────────
class TestSend:
    def test_schedule_sets_status_scheduled(self, headers):
        r = requests.post(f"{API}/admin/broadcasts", json={
            "name": "TEST_iter81 — schedule",
            "subject": "S", "html": "<p>x {{unsubscribe_url}}</p>",
            "filters": {"source": "school", "school": "TEST_iter81"},
        }, headers=headers, timeout=15)
        cid = r.json()["id"]
        s = requests.post(f"{API}/admin/broadcasts/{cid}/send",
                          json={"scheduled_at": "2099-01-01T00:00:00Z"}, headers=headers, timeout=15)
        assert s.status_code == 200, s.text
        assert s.json()["status"] == "scheduled"
        g = requests.get(f"{API}/admin/broadcasts/{cid}", headers=headers, timeout=15)
        assert g.json()["status"] == "scheduled"

    def test_send_now_returns_sending(self, headers):
        # Create campaign, send now. Resend may succeed or fail per env; we just
        # assert API accepts and queues it.
        r = requests.post(f"{API}/admin/broadcasts", json={
            "name": "TEST_iter81 — sendnow",
            "subject": "S", "html": "<p>x {{unsubscribe_url}}</p>",
            "filters": {"source": "school", "school": "TEST_iter81"},
        }, headers=headers, timeout=15)
        cid = r.json()["id"]
        s = requests.post(f"{API}/admin/broadcasts/{cid}/send", json={}, headers=headers, timeout=15)
        assert s.status_code == 200, s.text
        assert s.json()["status"] == "sending"


# ── 4) Public unsubscribe ──────────────────────────────────────
class TestUnsubscribe:
    def test_invalid_token_404(self):
        r = requests.get(f"{API}/unsubscribe/bogus-token-xyz", timeout=15)
        assert r.status_code == 404

    def test_lookup_and_confirm(self):
        # Manually mint a token
        tok = f"TEST_iter81_{uuid.uuid4().hex[:16]}"
        db.unsubscribe_tokens.insert_one({"token": tok, "email": TEST_EMAIL, "created_at": "now"})
        try:
            r = requests.get(f"{API}/unsubscribe/{tok}", timeout=15)
            assert r.status_code == 200
            data = r.json()
            assert data["email"] == TEST_EMAIL
            assert data["already_unsubscribed"] is False

            # Confirm opt-out
            p = requests.post(f"{API}/unsubscribe/{tok}", timeout=15)
            assert p.status_code == 200
            assert p.json()["ok"] is True

            # Lookup again — should reflect already unsubscribed
            r2 = requests.get(f"{API}/unsubscribe/{tok}", timeout=15)
            assert r2.json()["already_unsubscribed"] is True

            # And appears in broadcast_unsubscribes
            assert db.broadcast_unsubscribes.find_one({"email": TEST_EMAIL}) is not None
        finally:
            db.unsubscribe_tokens.delete_one({"token": tok})
            db.broadcast_unsubscribes.delete_one({"email": TEST_EMAIL})


# ── 5) Resend webhook ──────────────────────────────────────────
class TestResendWebhook:
    def test_email_delivered_event_persisted(self):
        cid = f"TEST_iter81_camp_{uuid.uuid4().hex[:8]}"
        payload = {
            "type": "email.delivered",
            "data": {
                "email_id": "evt_iter81_1",
                "to": ["someone@example.com"],
                "tags": [{"name": "campaign_id", "value": cid}],
            },
        }
        try:
            r = requests.post(f"{API}/webhooks/resend", json=payload, timeout=15)
            assert r.status_code == 200, r.text
            ev = db.broadcast_events.find_one({"campaign_id": cid})
            assert ev is not None
            assert ev["event_type"] == "delivered"
            assert ev["recipient"] == "someone@example.com"
        finally:
            db.broadcast_events.delete_many({"campaign_id": cid})

    def test_email_bounced_auto_unsubscribes(self):
        cid = f"TEST_iter81_camp_{uuid.uuid4().hex[:8]}"
        bounced_email = "bounced+iter81@example.com"
        payload = {
            "type": "email.bounced",
            "data": {"email_id": "evt_iter81_b", "to": [bounced_email],
                     "tags": [{"name": "campaign_id", "value": cid}]},
        }
        try:
            r = requests.post(f"{API}/webhooks/resend", json=payload, timeout=15)
            assert r.status_code == 200
            unsub = db.broadcast_unsubscribes.find_one({"email": bounced_email})
            assert unsub is not None
            assert unsub["reason"] == "email.bounced"
        finally:
            db.broadcast_events.delete_many({"campaign_id": cid})
            db.broadcast_unsubscribes.delete_one({"email": bounced_email})
