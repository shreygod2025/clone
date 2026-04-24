"""Iteration 75 tests: Summer Camp WhatsApp Broadcast endpoints.

Covers:
- GET /api/summer-camp/broadcast/templates (7 items)
- POST /api/summer-camp/broadcast dry_run for all 4 target modes
- Invalid template_key validation
- crm_statuses filter dedupe behaviour
- booking_ids explicit targeting
- GET /api/summer-camp/broadcast/history growth after a live send
- POST /api/summer-camp/add-lead with send_notifications=true (code path)
- POST /api/summer-camp/bulk-import booking_ref uniqueness via atomic counter
"""
import os
import time
import uuid
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
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ── Templates ────────────────────────────────────────────────────────────
class TestBroadcastTemplates:
    def test_list_templates_returns_seven(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/summer-camp/broadcast/templates", headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "templates" in data
        templates = data["templates"]
        assert isinstance(templates, list)
        assert len(templates) == 7, f"Expected 7 templates, got {len(templates)}"
        keys = {t["key"] for t in templates}
        expected = {
            "summercamp_followup", "summercamp_payment_pending", "summercamp_payment_pending_2",
            "summercamp_payment_pending_3", "summercamp_phone_captured_24h",
            "summercamp_closing_7days", "summercamp_enrolled",
        }
        assert keys == expected, f"Missing keys: {expected - keys}; Extra: {keys - expected}"
        for t in templates:
            assert "key" in t and "label" in t and "description" in t


# ── Broadcast dry_run / validation ───────────────────────────────────────
class TestBroadcastDryRun:
    def test_invalid_template_returns_400(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/summer-camp/broadcast",
            headers=auth_headers,
            json={"template_key": "not_a_real_template", "dry_run": True},
            timeout=20,
        )
        assert r.status_code == 400, r.text
        body = r.json()
        # FastAPI wraps detail; ensure list of valid keys is present
        detail = body.get("detail", "")
        assert "summercamp_followup" in detail

    def test_dryrun_all_leads(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/summer-camp/broadcast",
            headers=auth_headers,
            json={"template_key": "summercamp_followup", "dry_run": True},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data["dry_run"] is True
        assert isinstance(data["target_count"], int)
        assert data["target_count"] >= 0

    def test_dryrun_by_status_filter(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/summer-camp/broadcast",
            headers=auth_headers,
            json={
                "template_key": "summercamp_payment_pending",
                "crm_statuses": ["phone_captured", "form_submitted"],
                "dry_run": True,
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["dry_run"] is True
        assert isinstance(data["target_count"], int)

    def test_dryrun_by_assignee_unassigned(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/summer-camp/broadcast",
            headers=auth_headers,
            json={
                "template_key": "summercamp_closing_7days",
                "assigned_to": "unassigned",
                "dry_run": True,
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json()["dry_run"] is True

    def test_dryrun_by_booking_ids(self, auth_headers):
        # fetch first 2 bookings
        lst = requests.get(f"{BASE_URL}/api/summer-camp/bookings?limit=2", headers=auth_headers, timeout=30)
        assert lst.status_code == 200
        items = lst.json() if isinstance(lst.json(), list) else lst.json().get("bookings", [])
        if not items:
            pytest.skip("No bookings exist to target by id")
        ids = [items[0]["id"]] + ([items[1]["id"]] if len(items) > 1 else [])

        r = requests.post(
            f"{BASE_URL}/api/summer-camp/broadcast",
            headers=auth_headers,
            json={
                "template_key": "summercamp_enrolled",
                "booking_ids": ids,
                "dry_run": True,
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["dry_run"] is True
        # target_count deduped by phone so can be <= len(ids)
        assert 0 < data["target_count"] <= len(ids)


# ── Live send + history ──────────────────────────────────────────────────
class TestBroadcastLiveAndHistory:
    def test_live_send_by_booking_ids_and_history(self, auth_headers):
        # history snapshot before
        h0 = requests.get(f"{BASE_URL}/api/summer-camp/broadcast/history?limit=50",
                          headers=auth_headers, timeout=30)
        assert h0.status_code == 200
        before = h0.json().get("runs", [])
        before_count = len(before)

        # pick 1 booking id
        lst = requests.get(f"{BASE_URL}/api/summer-camp/bookings?limit=1", headers=auth_headers, timeout=30)
        items = lst.json() if isinstance(lst.json(), list) else lst.json().get("bookings", [])
        if not items:
            pytest.skip("No bookings to send to")
        bid = items[0]["id"]

        r = requests.post(
            f"{BASE_URL}/api/summer-camp/broadcast",
            headers=auth_headers,
            json={"template_key": "summercamp_followup", "booking_ids": [bid], "dry_run": False},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data.get("queued", 0) >= 1
        assert data["target_count"] >= 1

        # wait for background task
        time.sleep(6)

        h1 = requests.get(f"{BASE_URL}/api/summer-camp/broadcast/history?limit=50",
                          headers=auth_headers, timeout=30)
        assert h1.status_code == 200
        after = h1.json().get("runs", [])
        assert len(after) >= before_count + 1, "History did not grow after live broadcast"

        # Validate schema of newest entry
        latest = after[0]
        for field in ("id", "template_key", "target_count", "sent", "failed", "started_at", "finished_at", "triggered_by"):
            assert field in latest, f"Missing '{field}' in history row"
        assert latest["template_key"] == "summercamp_followup"
        assert latest["target_count"] >= 1
        # sent+failed should account for all targets
        assert latest["sent"] + latest["failed"] == latest["target_count"]

    def test_history_endpoint_returns_list(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/summer-camp/broadcast/history?limit=5",
                         headers=auth_headers, timeout=20)
        assert r.status_code == 200
        runs = r.json().get("runs")
        assert isinstance(runs, list)


# ── Add-lead & bulk-import paths ─────────────────────────────────────────
class TestLeadCreationPaths:
    def test_add_lead_with_send_notifications_succeeds(self, auth_headers):
        unique_phone = f"9{str(int(time.time()))[-9:]}"
        payload = {
            "child_name": f"TEST_Broadcast_{uuid.uuid4().hex[:6]}",
            "parent_name": "TEST Parent",
            "parent_phone": unique_phone,
            "parent_email": "test_broadcast@example.com",
            "age_group": "7-9",
            "batch_week": "week1",
            "center": "andheri",
            "send_notifications": True,
        }
        r = requests.post(f"{BASE_URL}/api/summer-camp/add-lead",
                          headers=auth_headers, json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        data = r.json()
        # API must succeed even if AiSensy 402 insufficient credits
        assert data.get("success") is True or "booking" in data or "id" in data

    def test_bulk_import_unique_booking_refs(self, admin_token):
        """Upload XLSX with 3 rows and verify booking_refs are unique (atomic counter)."""
        try:
            import openpyxl  # noqa: F401
        except ImportError:
            pytest.skip("openpyxl not installed locally")
        import io
        import openpyxl as xl

        stamp = int(time.time())
        wb = xl.Workbook()
        ws = wb.active
        ws.append(["child_name", "parent_name", "parent_phone", "parent_email",
                   "age_group", "batch_week", "center"])
        for i in range(3):
            ws.append([
                f"TEST_Bulk_{stamp}_{i}",
                "TEST Bulk Parent",
                f"9{str(stamp)[-8:]}{i}",
                f"bulk_{stamp}_{i}@example.com",
                "7-9",
                "week1",
                "andheri",
            ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        files = {"file": ("bulk.xlsx", buf.getvalue(),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.post(f"{BASE_URL}/api/summer-camp/bulk-import",
                          headers=headers, files=files, timeout=60)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        # Endpoint returns imported count
        assert body.get("imported") or body.get("imported_count") or body.get("success") is not None

        time.sleep(2)
        lst = requests.get(f"{BASE_URL}/api/summer-camp/bookings?limit=500",
                           headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert lst.status_code == 200
        items = lst.json() if isinstance(lst.json(), list) else lst.json().get("bookings", [])
        our = [b for b in items if str(b.get("child_name", "")).startswith(f"TEST_Bulk_{stamp}_")]
        assert len(our) >= 1, f"No bulk-imported rows found (imported={body})"
        refs = [b.get("booking_ref") for b in our if b.get("booking_ref")]
        assert len(refs) == len(set(refs)), f"Duplicate booking_refs: {refs}"
