"""
Tests for Social Media Internship Readiness Program (iteration 72)
+ regression on summer-camp endpoints.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# Unique phone per test run so we can cleanup cleanly
PHONE_A = f"9{int(time.time()) % 1000000000:09d}"
PHONE_B = f"8{int(time.time()) % 1000000000:09d}"

created_lead_ids: list[str] = []


# ────────── SMI — Core flow ──────────
class TestSMICaptureRegister:
    def test_capture_lead_creates_new(self, session):
        r = session.post(f"{API}/social-media-intern/capture-lead", json={"phone": PHONE_A})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "lead_id" in data and data["lead_id"]
        assert data["booking_ref"].startswith("SMI-")
        assert data["existing"] is False
        created_lead_ids.append(data["lead_id"])

    def test_capture_lead_invalid_phone(self, session):
        r = session.post(f"{API}/social-media-intern/capture-lead", json={"phone": "123"})
        assert r.status_code == 400

    def test_capture_lead_duplicate_returns_existing(self, session):
        r1 = session.post(f"{API}/social-media-intern/capture-lead", json={"phone": PHONE_A})
        assert r1.status_code == 200
        d = r1.json()
        assert d["existing"] is True
        assert d["lead_id"] == created_lead_ids[0]
        assert d["crm_status"] == "phone_captured"

    def test_register_updates_full_details(self, session):
        payload = {
            "phone": PHONE_A,
            "student_name": "TEST Teen Aarav",
            "email": "TEST_aarav@oll.co",
            "parent_name": "TEST Parent",
            "school_name": "TEST High School",
            "age": "15",
            "grade": "10",
            "mode": "online",
            "has_social_media": "yes",
            "instagram_link": "https://instagram.com/test",
            "youtube_link": "",
            "payment_mode": "full",
        }
        r = session.post(f"{API}/social-media-intern/register", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "registered"
        assert data["booking_ref"].startswith("SMI-")

    def test_register_promotes_status_to_lead(self, session, auth_headers):
        # verify via CRM endpoint
        r = session.get(f"{API}/social-media-intern/crm?limit=100", headers=auth_headers)
        assert r.status_code == 200
        leads = r.json()["leads"]
        me = next((l for l in leads if l["id"] == created_lead_ids[0]), None)
        assert me is not None
        assert me["crm_status"] == "lead"
        assert me["student_name"] == "TEST Teen Aarav"
        assert me["mode"] == "online"


# ────────── SMI — Payment ──────────
class TestSMIPayment:
    def test_initiate_payment_full(self, session):
        lead_id = created_lead_ids[0]
        r = session.post(f"{API}/social-media-intern/initiate-payment",
                         json={"lead_id": lead_id, "frontend_url": "https://oll.co"})
        # Might be 200 with payment_session_id OR 500 if Cashfree production creds misconfigured.
        # Accept both but capture the outcome.
        if r.status_code == 200:
            d = r.json()
            assert "payment_session_id" in d
            assert d["amount"] == 19900.0 or d["amount"] == 19900
            assert d["order_id"].startswith("SMI-")
        else:
            pytest.skip(f"Cashfree order creation not configured: {r.status_code} {r.text[:200]}")

    def test_initiate_payment_invalid_lead(self, session):
        r = session.post(f"{API}/social-media-intern/initiate-payment",
                         json={"lead_id": "non-existent-id"})
        assert r.status_code == 404

    def test_verify_returns_pending_before_payment(self, session):
        # Create a fresh lead with no payment
        phone_v = f"7{int(time.time()*10) % 1000000000:09d}"
        rc = session.post(f"{API}/social-media-intern/capture-lead", json={"phone": phone_v})
        assert rc.status_code == 200
        lid = rc.json()["lead_id"]
        created_lead_ids.append(lid)

        r = session.get(f"{API}/social-media-intern/verify/{lid}")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "PENDING"
        assert data["lead"]["id"] == lid

    def test_verify_unknown_lead(self, session):
        r = session.get(f"{API}/social-media-intern/verify/{uuid.uuid4()}")
        assert r.status_code == 404


# ────────── SMI — Webhook ──────────
class TestSMIWebhook:
    def test_webhook_marks_lead_as_paid(self, session, auth_headers):
        # Create lead with phone
        phone_w = f"6{int(time.time()*100) % 1000000000:09d}"
        rc = session.post(f"{API}/social-media-intern/capture-lead", json={"phone": phone_w})
        lead_id = rc.json()["lead_id"]
        created_lead_ids.append(lead_id)

        # Seed register with full payment_mode
        session.post(f"{API}/social-media-intern/register", json={
            "phone": phone_w, "student_name": "TEST Webhook", "payment_mode": "full", "mode": "offline",
        })

        # Manually set an order_id by calling initiate-payment (may fail) — fallback: inject via DB not possible
        # Instead, simulate by first calling initiate — skip if it errors; else grab order_id
        ip = session.post(f"{API}/social-media-intern/initiate-payment",
                          json={"lead_id": lead_id, "frontend_url": "https://oll.co"})
        if ip.status_code != 200:
            pytest.skip("Cannot test webhook without initiate-payment generating order_id")

        order_id = ip.json()["order_id"]

        # Fire webhook
        payload = {"data": {"order": {"order_id": order_id, "order_status": "PAID"}}}
        r = session.post(f"{API}/social-media-intern/webhook", json=payload)
        assert r.status_code == 200
        assert r.json().get("success") is True

        # Verify lead flipped to converted
        time.sleep(1)
        crm = session.get(f"{API}/social-media-intern/crm?limit=200", headers=auth_headers).json()
        lead = next((l for l in crm["leads"] if l["id"] == lead_id), None)
        assert lead is not None
        assert lead["crm_status"] == "converted"
        assert lead["payment_status"] == "paid"
        assert lead["amount_paid"] == 19900.0 or lead["amount_paid"] == 19900


# ────────── SMI — CRM & Auth ──────────
class TestSMICRM:
    def test_crm_requires_auth(self, session):
        r = requests.get(f"{API}/social-media-intern/crm")
        assert r.status_code in (401, 403)

    def test_crm_returns_kpis_and_leads(self, session, auth_headers):
        r = session.get(f"{API}/social-media-intern/crm?limit=500", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "leads" in d and isinstance(d["leads"], list)
        assert "kpis" in d
        for k in ("total", "phone_captured", "lead", "converted", "seat_reserved", "lost", "revenue"):
            assert k in d["kpis"]
        assert d["kpis"]["total"] >= 1

    def test_crm_search_filter(self, session, auth_headers):
        r = session.get(f"{API}/social-media-intern/crm?search=TEST", headers=auth_headers)
        assert r.status_code == 200

    def test_patch_crm_status_requires_auth(self, session):
        r = requests.patch(f"{API}/social-media-intern/{created_lead_ids[0]}/crm-status",
                           json={"crm_status": "lost"})
        assert r.status_code in (401, 403)

    def test_patch_crm_status_success(self, session, auth_headers):
        lid = created_lead_ids[0]
        r = session.patch(f"{API}/social-media-intern/{lid}/crm-status",
                          json={"crm_status": "lost", "lost_reason": "budget"},
                          headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["success"] is True

        # Verify change persisted
        crm = session.get(f"{API}/social-media-intern/crm?limit=500", headers=auth_headers).json()
        lead = next((l for l in crm["leads"] if l["id"] == lid), None)
        assert lead["crm_status"] == "lost"
        assert lead.get("lost_reason") == "budget"

    def test_add_comment_requires_auth(self, session):
        r = requests.post(f"{API}/social-media-intern/{created_lead_ids[0]}/comment",
                          json={"text": "x"})
        assert r.status_code in (401, 403)

    def test_add_comment_success(self, session, auth_headers):
        lid = created_lead_ids[0]
        r = session.post(f"{API}/social-media-intern/{lid}/comment",
                         json={"text": "TEST comment body", "author": "TestAdmin"},
                         headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["text"] == "TEST comment body"
        assert "id" in r.json()

    def test_delete_requires_auth(self, session):
        r = requests.delete(f"{API}/social-media-intern/{uuid.uuid4()}")
        assert r.status_code in (401, 403)

    def test_get_lead_public(self, session):
        r = session.get(f"{API}/social-media-intern/lead/{created_lead_ids[0]}")
        assert r.status_code == 200
        d = r.json()
        assert "lead" in d
        assert "order_id" not in d["lead"]


# ────────── Regression: summer-camp still works ──────────
class TestSummerCampRegression:
    def test_stats_requires_auth(self, session):
        r = requests.get(f"{API}/summer-camp/stats")
        assert r.status_code in (401, 403)

    def test_stats_with_admin(self, session, auth_headers):
        r = session.get(f"{API}/summer-camp/stats", headers=auth_headers)
        assert r.status_code == 200

    def test_bookings_with_admin(self, session, auth_headers):
        r = session.get(f"{API}/summer-camp/bookings", headers=auth_headers)
        assert r.status_code == 200

    def test_availability_requires_params(self, session):
        # 422 is acceptable — endpoint is alive and validating
        r = session.get(f"{API}/summer-camp/availability")
        assert r.status_code in (200, 422)


# ────────── Cleanup ──────────
@pytest.fixture(scope="session", autouse=True)
def cleanup(request, session):
    yield
    # Login and purge created leads
    try:
        tok = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}
        for lid in created_lead_ids:
            try:
                session.delete(f"{API}/social-media-intern/{lid}", headers=h)
            except Exception:
                pass
    except Exception as e:
        print(f"cleanup error: {e}")
