"""Iteration 115 — RETEST of iteration-114 fixes:
  FIX 1: PATCH /api/schools/{id}/manage-tranches always overwrites total_amount (incl. 0)
  FIX 2: _resync_school_share_from_expenses syncs value_field + resets on delete-all
  FIX 3: GET /api/orders/school-payments includes renewal_meeting schools
  REGRESSION: GET /api/school-expenses/pnl-summary
"""
import os
import re
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as fp:
        for line in fp:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

CRED_FILE = Path("/app/memory/test_credentials.md")
TEST_SCHOOL_ID = "e271fbf6-d0e2-42b5-a4b9-43949ada40c8"


def _creds():
    content = CRED_FILE.read_text(encoding="utf-8")
    email = re.search(r'(?im)^\s*[-*]?\s*Email\s*:\s*`?([^`\s]+)', content)
    pwd = re.search(r'(?im)^\s*[-*]?\s*Password\s*:\s*`?([^`\s]+)', content)
    if not email or not pwd:
        pytest.skip("credentials not parseable")
    return email.group(1), pwd.group(1)


@pytest.fixture(scope="module")
def h():
    email, password = _creds()
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"admin login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("access_token") or r.json().get("token")
    assert token, "no token in login response"
    return {"Authorization": f"Bearer {token}"}


def _get_school(h, sid=TEST_SCHOOL_ID):
    r = requests.get(f"{BASE_URL}/api/schools/inquiry/{sid}", headers=h, timeout=30)
    assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
    body = r.json()
    return body.get("school") or body.get("inquiry") or body


def _od(h, sid=TEST_SCHOOL_ID):
    return _get_school(h, sid).get("onboarding_data") or {}


@pytest.fixture(scope="module")
def school_snapshot(h):
    od = _od(h)
    original = {
        "payment_tranches": [dict(t) for t in (od.get("payment_tranches") or [])],
        "payment_mode": od.get("payment_mode") or "",
        "gst_type": od.get("gst_type") or "",
        "total_amount": od.get("total_amount"),
        "school_share_type": od.get("school_share_type"),
        "school_share_value": od.get("school_share_value"),
        "school_share_amount": od.get("school_share_amount"),
        "gp_share_type": od.get("gp_share_type"),
        "gp_share_value": od.get("gp_share_value"),
        "gp_share_amount": od.get("gp_share_amount"),
    }
    yield original
    requests.patch(
        f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches",
        headers=h,
        json={"payment_mode": original["payment_mode"], "gst_type": original["gst_type"],
              "payment_tranches": original["payment_tranches"]},
        timeout=30,
    )
    cur = _od(h)
    requests.patch(
        f"{BASE_URL}/api/schools/inquiry/{TEST_SCHOOL_ID}",
        headers=h,
        json={"onboarding_data": {**cur,
                                  "total_amount": original["total_amount"],
                                  "school_share_type": original["school_share_type"],
                                  "school_share_value": original["school_share_value"],
                                  "school_share_amount": original["school_share_amount"],
                                  "gp_share_type": original["gp_share_type"],
                                  "gp_share_value": original["gp_share_value"],
                                  "gp_share_amount": original["gp_share_amount"]}},
        timeout=30,
    )


# ── FIX 1: total_amount always overwritten ────────────────────────────
class TestManageTranchesTotalAmount:
    def test_set_two_tranches_total(self, h, school_snapshot):
        r = requests.patch(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches", headers=h,
            json={"payment_tranches": [
                {"amount": "10000", "date": "2026-01-15", "notes": "TEST_A", "status": "pending"},
                {"amount": "5000", "date": "2026-03-15", "notes": "TEST_B", "status": "pending"},
            ]}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["total_amount"] == 15000.0
        assert float(_od(h).get("total_amount", -1) if _od(h).get("total_amount") is not None else -1) == 15000.0

    def test_empty_tranches_zeroes_total(self, h, school_snapshot):
        r = requests.patch(f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches",
                           headers=h, json={"payment_tranches": []}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["total_amount"] == 0.0, f"response total_amount not 0: {r.json()}"
        od = _od(h)
        assert od.get("payment_tranches") == []
        assert float(od.get("total_amount", -1) if od.get("total_amount") is not None else -1) == 0.0, \
            f"stale total_amount left after deleting all tranches: {od.get('total_amount')}"

    def test_percentage_only_tranches_zero_total(self, h, school_snapshot):
        r = requests.patch(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches", headers=h,
            json={"payment_tranches": [{"percentage": "50", "date": "2026-01-15", "status": "pending"},
                                       {"percentage": "50", "date": "2026-06-15", "status": "pending"}]},
            timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["total_amount"] == 0.0
        assert float(_od(h).get("total_amount", -1) if _od(h).get("total_amount") is not None else -1) == 0.0

    def test_lower_total_overwrites_higher(self, h, school_snapshot):
        requests.patch(f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches", headers=h,
                       json={"payment_tranches": [{"amount": "150000", "date": "2026-01-01", "status": "pending"}]},
                       timeout=30)
        assert float(_od(h)["total_amount"]) == 150000.0
        requests.patch(f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches", headers=h,
                       json={"payment_tranches": [{"amount": "1000", "date": "2026-01-01", "status": "pending"}]},
                       timeout=30)
        assert float(_od(h)["total_amount"]) == 1000.0


# ── FIX 2: share expense reverse sync ─────────────────────────────────
class TestShareReverseSync:
    created = []

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, h):
        yield
        for eid in list(TestShareReverseSync.created):
            requests.delete(f"{BASE_URL}/api/school-expenses/{eid}", headers=h, timeout=30)

    def _wipe_share_expenses(self, h, category):
        r = requests.get(f"{BASE_URL}/api/school-expenses", headers=h,
                         params={"school_id": TEST_SCHOOL_ID}, timeout=30)
        assert r.status_code == 200, r.text[:200]
        rows = r.json()
        rows = rows.get("expenses", rows) if isinstance(rows, dict) else rows
        for e in rows:
            if e.get("category") == category and e.get("school_id") == TEST_SCHOOL_ID:
                requests.delete(f"{BASE_URL}/api/school-expenses/{e['id']}", headers=h, timeout=30)

    def _set_stale(self, h, type_field, value_field, value):
        cur = _od(h)
        r = requests.patch(f"{BASE_URL}/api/schools/inquiry/{TEST_SCHOOL_ID}", headers=h,
                           json={"onboarding_data": {**cur, type_field: "amount", value_field: value}},
                           timeout=30)
        assert r.status_code == 200, r.text[:200]
        assert str(_od(h).get(value_field)) == value

    def test_stale_value_synced_on_new_expense(self, h, school_snapshot):
        """(a) stale share_value must be overwritten with the new aggregate."""
        self._wipe_share_expenses(h, "school_share")
        self._set_stale(h, "school_share_type", "school_share_value", "4444")

        r = requests.post(f"{BASE_URL}/api/school-expenses", headers=h,
                          json={"school_id": TEST_SCHOOL_ID, "category": "school_share", "amount": 3000,
                                "description": "TEST_share_sync_115", "expense_date": "2026-02-01"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        TestShareReverseSync.created.append(r.json()["expense"]["id"])

        od = _od(h)
        assert float(od.get("school_share_amount") or 0) == 3000.0, \
            f"school_share_amount={od.get('school_share_amount')}"
        assert float(od.get("school_share_value") or 0) == 3000.0, \
            f"stale school_share_value not synced: {od.get('school_share_value')}"
        assert od.get("school_share_type") == "amount"

    def test_patch_amount_resyncs_value(self, h, school_snapshot):
        eid = TestShareReverseSync.created[-1]
        r = requests.patch(f"{BASE_URL}/api/school-expenses/{eid}", headers=h,
                           json={"amount": 5500}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        od = _od(h)
        assert float(od.get("school_share_amount") or 0) == 5500.0
        assert float(od.get("school_share_value") or 0) == 5500.0

    def test_delete_all_resets_amount_and_value(self, h, school_snapshot):
        """(b) delete-all → amount 0, value empty, type stays 'amount'."""
        self._wipe_share_expenses(h, "school_share")
        TestShareReverseSync.created.clear()
        od = _od(h)
        assert float(od.get("school_share_amount") or 0) == 0.0, \
            f"amount not reset: {od.get('school_share_amount')}"
        assert (od.get("school_share_value") or "") == "", \
            f"value not cleared: {od.get('school_share_value')}"
        assert od.get("school_share_type") == "amount", \
            f"type changed unexpectedly: {od.get('school_share_type')}"

    def test_gp_share_same_behaviour(self, h, school_snapshot):
        self._wipe_share_expenses(h, "gp_share")
        self._set_stale(h, "gp_share_type", "gp_share_value", "9999")
        r = requests.post(f"{BASE_URL}/api/school-expenses", headers=h,
                          json={"school_id": TEST_SCHOOL_ID, "category": "gp_share", "amount": 1200,
                                "description": "TEST_gp_share_115", "expense_date": "2026-02-01"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        eid = r.json()["expense"]["id"]
        od = _od(h)
        assert float(od.get("gp_share_amount") or 0) == 1200.0
        assert float(od.get("gp_share_value") or 0) == 1200.0
        d = requests.delete(f"{BASE_URL}/api/school-expenses/{eid}", headers=h, timeout=30)
        assert d.status_code == 200, d.text[:200]
        od2 = _od(h)
        assert float(od2.get("gp_share_amount") or 0) == 0.0
        assert (od2.get("gp_share_value") or "") == ""
        assert od2.get("gp_share_type") == "amount"

    def test_percentage_type_value_preserved(self, h, school_snapshot):
        """When admin set type='percentage', the manual value must not be touched."""
        self._wipe_share_expenses(h, "school_share")
        cur = _od(h)
        requests.patch(f"{BASE_URL}/api/schools/inquiry/{TEST_SCHOOL_ID}", headers=h,
                       json={"onboarding_data": {**cur, "school_share_type": "percentage",
                                                 "school_share_value": "12"}}, timeout=30)
        r = requests.post(f"{BASE_URL}/api/school-expenses", headers=h,
                          json={"school_id": TEST_SCHOOL_ID, "category": "school_share", "amount": 700,
                                "description": "TEST_share_pct_115", "expense_date": "2026-02-01"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        eid = r.json()["expense"]["id"]
        od = _od(h)
        assert od.get("school_share_type") == "percentage"
        assert str(od.get("school_share_value")) == "12"
        assert float(od.get("school_share_amount") or 0) == 700.0
        requests.delete(f"{BASE_URL}/api/school-expenses/{eid}", headers=h, timeout=30)


# ── FIX 3: orders school-payments includes renewal_meeting ────────────
class TestOrdersRenewalMeeting:
    def test_renewal_meeting_school_tranches_present(self, h):
        """No renewal_meeting school exists in DB, so create a temp one."""
        c = requests.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": "TEST_RenewalMeeting QA School",
            "contact_name": "TEST QA",
            "phone": "9999900001",
            "email": "test_rm_qa@qatest.com",
            "location": "Mumbai",
        }, timeout=30)
        assert c.status_code in (200, 201), f"{c.status_code} {c.text[:300]}"
        sid = c.json()["id"]
        try:
            p = requests.patch(f"{BASE_URL}/api/schools/inquiry/{sid}", headers=h,
                               json={"status": "renewal_meeting"}, timeout=30)
            assert p.status_code == 200, p.text[:200]
            assert _get_school(h, sid).get("status") == "renewal_meeting"

            t = requests.patch(f"{BASE_URL}/api/schools/{sid}/manage-tranches", headers=h,
                               json={"payment_tranches": [
                                   {"amount": "4321", "date": "2026-04-01",
                                    "notes": "TEST_Extra Students · Grade 3 · 5 × ₹1000",
                                    "status": "pending"}]}, timeout=30)
            assert t.status_code == 200, t.text[:300]

            ro = requests.get(f"{BASE_URL}/api/orders/school-payments", headers=h, timeout=90)
            assert ro.status_code == 200, f"{ro.status_code} {ro.text[:300]}"
            body = ro.json()
            rows = body if isinstance(body, list) else (
                body.get("schools") or body.get("payments") or body.get("rows") or [])
            assert isinstance(rows, list) and rows, f"empty school-payments payload"
            mine = [r_ for r_ in rows if r_.get("school_id") == sid]
            assert mine, (f"renewal_meeting school {sid} missing from /api/orders/school-payments")
            assert float(mine[0]["amount"]) == 4321.0
            assert "Extra Students" in (mine[0].get("notes") or mine[0].get("tranche_info") or "")
        finally:
            requests.delete(f"{BASE_URL}/api/schools/inquiry/{sid}", headers=h, timeout=30)


# ── REGRESSION: pnl-summary ───────────────────────────────────────────
class TestPnlSummaryRegression:
    def test_pnl_summary_rows(self, h):
        r = requests.get(f"{BASE_URL}/api/school-expenses/pnl-summary", headers=h, timeout=120)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        body = r.json()
        rows = body.get("rows") or []
        assert isinstance(rows, list) and rows, f"no pnl rows; keys={list(body)[:10]}"
        assert "school_id" in rows[0] and "total_costs" in rows[0]

    def test_zero_revenue_school_with_expense_present(self, h):
        sl = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=h,
                          params={"status": "meeting_done", "view_all": "true"}, timeout=60)
        assert sl.status_code == 200
        data = sl.json()
        schools = data.get("schools") or data.get("inquiries") or [] if isinstance(data, dict) else data
        schools = [s for s in schools if s.get("status") == "meeting_done"]
        if not schools:
            pytest.skip("no meeting_done school")
        sid = schools[0]["id"]
        r = requests.post(f"{BASE_URL}/api/school-expenses", headers=h,
                          json={"school_id": sid, "category": "kit_cost", "amount": 999,
                                "description": "TEST_pnl_visibility_115", "expense_date": "2026-02-03"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        eid = r.json()["expense"]["id"]
        try:
            p = requests.get(f"{BASE_URL}/api/school-expenses/pnl-summary", headers=h, timeout=120)
            assert p.status_code == 200
            ids = {x.get("school_id") for x in (p.json().get("rows") or [])}
            assert sid in ids, f"meeting_done school {sid} missing from pnl rows"
        finally:
            requests.delete(f"{BASE_URL}/api/school-expenses/{eid}", headers=h, timeout=30)
