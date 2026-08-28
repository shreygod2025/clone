"""Iteration 114 — Backend tests for:
  1. PATCH /api/schools/{id}/manage-tranches  (full tranche CRUD)
  2. POST  /api/schools/{id}/extra-students   (mid-contract extra students)
  3. Reverse sync of school_share / gp_share expenses -> onboarding_data
  4. /api/school-expenses/pnl-summary includes renewal_meeting / meeting_done
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
    body = r.json()
    token = body.get("access_token") or body.get("token")
    assert token, "no token in login response"
    return {"Authorization": f"Bearer {token}"}


TEST_SCHOOL_ID = "e271fbf6-d0e2-42b5-a4b9-43949ada40c8"


def _get_school(h, sid=TEST_SCHOOL_ID):
    r = requests.get(f"{BASE_URL}/api/schools/inquiry/{sid}", headers=h, timeout=30)
    assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
    body = r.json()
    return body.get("school") or body.get("inquiry") or body


@pytest.fixture(scope="module")
def school_snapshot(h):
    """Snapshot the test school's onboarding_data so we can restore it after."""
    school = _get_school(h)
    assert school.get("id") == TEST_SCHOOL_ID, f"unexpected school payload keys: {list(school)[:12]}"
    od = school.get("onboarding_data") or {}
    original = {
        "payment_tranches": [dict(t) for t in (od.get("payment_tranches") or [])],
        "payment_mode": od.get("payment_mode") or "",
        "gst_type": od.get("gst_type") or "",
        "grade_pricing": [dict(g) for g in (od.get("grade_pricing") or [])],
        "total_students": od.get("total_students"),
        "total_amount": od.get("total_amount"),
    }
    yield original
    # restore tranches + mode/gst via manage-tranches, grade_pricing via direct patch
    requests.patch(
        f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches",
        headers=h,
        json={
            "payment_mode": original["payment_mode"],
            "gst_type": original["gst_type"],
            "payment_tranches": original["payment_tranches"],
        },
        timeout=30,
    )
    requests.patch(
        f"{BASE_URL}/api/schools/inquiry/{TEST_SCHOOL_ID}",
        headers=h,
        json={"onboarding_data": {
            **((_get_school(h).get("onboarding_data")) or {}),
            "grade_pricing": original["grade_pricing"],
            "total_students": original["total_students"],
            "total_amount": original["total_amount"],
        }},
        timeout=30,
    )


# ── 1. manage-tranches ────────────────────────────────────────────────
class TestManageTranches:
    def test_replace_tranches_and_persist(self, h, school_snapshot):
        payload = {
            "payment_mode": "from_school",
            "gst_type": "exclusive_18",
            "payment_tranches": [
                {"amount": "10000", "date": "2026-01-15", "notes": "TEST_Advance",
                 "gst_type": "exclusive_18", "status": "pending", "payment_mode": "online"},
                {"amount": "5000", "date": "2026-03-15", "notes": "TEST_Final",
                 "gst_type": "exclusive_18", "status": "pending", "payment_mode": "online"},
            ],
        }
        r = requests.patch(f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches",
                           headers=h, json=payload, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        body = r.json()
        assert body["ok"] is True
        assert body["total_amount"] == 15000.0
        assert len(body["tranches"]) == 2

        od = (_get_school(h).get("onboarding_data")) or {}
        tr = od.get("payment_tranches") or []
        assert len(tr) == 2
        assert tr[0]["amount"] == "10000"
        assert tr[0]["notes"] == "TEST_Advance"
        assert tr[1]["notes"] == "TEST_Final"
        assert float(od.get("total_amount") or 0) == 15000.0
        assert od.get("payment_mode") == "from_school"
        assert od.get("gst_type") == "exclusive_18"

    def test_reorder_and_edit(self, h, school_snapshot):
        payload = {"payment_tranches": [
            {"amount": "5000", "date": "2026-03-15", "notes": "TEST_Final", "status": "pending"},
            {"amount": "12000", "date": "2026-01-15", "notes": "TEST_Advance_edited", "status": "pending"},
        ]}
        r = requests.patch(f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches",
                           headers=h, json=payload, timeout=30)
        assert r.status_code == 200, r.text[:300]
        od = (_get_school(h).get("onboarding_data")) or {}
        tr = od["payment_tranches"]
        assert [t["notes"] for t in tr] == ["TEST_Final", "TEST_Advance_edited"]
        assert float(od["total_amount"]) == 17000.0

    def test_delete_down_to_one_trims_payments(self, h, school_snapshot):
        r = requests.patch(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches",
            headers=h,
            json={"payment_tranches": [{"amount": "7000", "date": "2026-01-15", "notes": "TEST_Only", "status": "pending"}]},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        school = _get_school(h)
        assert len(school["onboarding_data"]["payment_tranches"]) == 1
        for p in (school.get("payments") or []):
            assert int(p.get("tranche_index", -1)) < 1, f"orphan payment left: {p}"

    def test_missing_tranches_list_400(self, h):
        r = requests.patch(f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches",
                           headers=h, json={"payment_mode": "from_school"}, timeout=30)
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:200]}"

    def test_unknown_school_404(self, h):
        r = requests.patch(f"{BASE_URL}/api/schools/TEST_does_not_exist/manage-tranches",
                           headers=h, json={"payment_tranches": []}, timeout=30)
        assert r.status_code == 404, f"expected 404 got {r.status_code}"

    def test_requires_auth(self):
        r = requests.patch(f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/manage-tranches",
                           json={"payment_tranches": []}, timeout=30)
        assert r.status_code in (401, 403), f"expected auth error got {r.status_code}"


# ── 2. extra-students ─────────────────────────────────────────────────
class TestExtraStudents:
    def test_add_new_grade_creates_tranche(self, h, school_snapshot):
        before = (_get_school(h).get("onboarding_data")) or {}
        before_tr = len(before.get("payment_tranches") or [])
        before_gp = len(before.get("grade_pricing") or [])

        r = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/extra-students",
            headers=h,
            json={"entries": [{"grade": "Grade 9", "students": 20, "price_per_student": 1000,
                              "date": "2026-02-15", "increment_existing": False}]},
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        body = r.json()
        assert body["ok"] is True
        assert len(body["added_tranches"]) == 1
        assert "Extra Students" in body["added_tranches"][0]
        assert "Grade 9" in body["added_tranches"][0]

        od = (_get_school(h).get("onboarding_data")) or {}
        tr = od["payment_tranches"]
        assert len(tr) == before_tr + 1
        new_t = tr[-1]
        assert new_t.get("extra_students") is True
        assert float(new_t["amount"]) == 20000.0
        assert new_t["status"] == "pending"
        assert new_t["date"] == "2026-02-15"
        assert new_t.get("extra_students_count") == 20

        gp = od["grade_pricing"]
        assert len(gp) == before_gp + 1
        assert gp[-1]["grade"] == "Grade 9 (Extra)"
        assert int(gp[-1]["students"]) == 20
        # totals recomputed from grade_pricing
        expected_students = sum(int(float(g.get("students") or 0)) for g in gp)
        assert int(od["total_students"]) == expected_students
        assert body["total_students"] == expected_students

    def test_increment_existing_grade(self, h, school_snapshot):
        od = (_get_school(h).get("onboarding_data")) or {}
        gp = od.get("grade_pricing") or []
        if not gp:
            pytest.skip("school has no grade_pricing rows to increment")
        target = gp[0]
        grade = target["grade"]
        prev_students = int(float(target.get("students") or 0))
        gp_len = len(gp)

        r = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/extra-students",
            headers=h,
            json={"entries": [{"grade": grade, "students": 5, "price_per_student": 500,
                              "increment_existing": True}]},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        od2 = (_get_school(h).get("onboarding_data")) or {}
        gp2 = od2["grade_pricing"]
        assert len(gp2) == gp_len, "increment_existing should not append a new grade row"
        row = next(g for g in gp2 if str(g["grade"]).strip().lower() == grade.strip().lower())
        assert int(float(row["students"])) == prev_students + 5
        assert od2["payment_tranches"][-1].get("extra_students") is True
        assert float(od2["payment_tranches"][-1]["amount"]) == 2500.0

    def test_multiple_entries(self, h, school_snapshot):
        before_tr = len(((_get_school(h).get("onboarding_data")) or {}).get("payment_tranches") or [])
        r = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/extra-students",
            headers=h,
            json={"entries": [
                {"grade": "Grade 11", "students": 10, "price_per_student": 900},
                {"grade": "Grade 12", "students": 4, "price_per_student": 1100},
            ]},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        assert len(r.json()["added_tranches"]) == 2
        tr = ((_get_school(h).get("onboarding_data")) or {}).get("payment_tranches")
        assert len(tr) == before_tr + 2
        assert float(tr[-1]["amount"]) == 4400.0
        assert float(tr[-2]["amount"]) == 9000.0

    def test_invalid_entries_400(self, h):
        r = requests.post(f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/extra-students",
                          headers=h, json={"entries": [{"grade": "Grade 1", "students": 0, "price_per_student": 0}]},
                          timeout=30)
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:200]}"

    def test_empty_entries_400(self, h):
        r = requests.post(f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/extra-students",
                          headers=h, json={"entries": []}, timeout=30)
        assert r.status_code == 400

    def test_unknown_school_404(self, h):
        r = requests.post(f"{BASE_URL}/api/schools/TEST_nope/extra-students",
                          headers=h, json={"entries": [{"grade": "G1", "students": 1, "price_per_student": 1}]},
                          timeout=30)
        assert r.status_code == 404

    def test_tranche_visible_in_orders(self, h, school_snapshot):
        """Extra-student tranche should surface via the school payments endpoint used by Orders."""
        r = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/extra-students",
            headers=h,
            json={"entries": [{"grade": "Grade 7", "students": 3, "price_per_student": 1000}]},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        ro = requests.get(f"{BASE_URL}/api/orders/school-payments", headers=h, timeout=60)
        if ro.status_code != 200:
            pytest.skip(f"orders endpoint unavailable: {ro.status_code}")
        text = ro.text
        assert "Extra Students" in text, "extra-students tranche not present in school-payments payload"


# ── 3. school_share / gp_share reverse sync ───────────────────────────
class TestShareExpenseReverseSync:
    created_ids: list = []

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, h):
        yield
        for eid in list(TestShareExpenseReverseSync.created_ids):
            requests.delete(f"{BASE_URL}/api/school-expenses/{eid}", headers=h, timeout=30)

    def _share_amount(self, h, field):
        od = (_get_school(h).get("onboarding_data")) or {}
        return float(od.get(field) or 0)

    def test_create_school_share_expense_syncs(self, h):
        r = requests.post(
            f"{BASE_URL}/api/school-expenses",
            headers=h,
            json={"school_id": TEST_SCHOOL_ID, "category": "school_share", "amount": 3333,
                  "description": "TEST_school_share_sync", "expense_date": "2026-02-01"},
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        eid = r.json()["expense"]["id"]
        TestShareExpenseReverseSync.created_ids.append(eid)

        od = (_get_school(h).get("onboarding_data")) or {}
        # aggregate of all school_share expenses
        allx = requests.get(f"{BASE_URL}/api/school-expenses", headers=h,
                            params={"school_id": TEST_SCHOOL_ID}, timeout=30)
        assert allx.status_code == 200
        rows = allx.json()
        rows = rows.get("expenses", rows) if isinstance(rows, dict) else rows
        expected = sum(float(e.get("amount") or 0) for e in rows
                       if e.get("category") == "school_share" and e.get("school_id") == TEST_SCHOOL_ID)
        assert float(od.get("school_share_amount") or 0) == pytest.approx(expected), \
            f"onboarding school_share_amount={od.get('school_share_amount')} expected aggregate {expected}"
        assert od.get("school_share_type") in ("amount", "percentage", "per_student"), \
            f"school_share_type not defaulted: {od.get('school_share_type')}"

    def test_patch_amount_resyncs(self, h):
        assert TestShareExpenseReverseSync.created_ids, "no expense created in prior test"
        eid = TestShareExpenseReverseSync.created_ids[-1]
        before = self._share_amount(h, "school_share_amount")
        r = requests.patch(f"{BASE_URL}/api/school-expenses/{eid}", headers=h,
                           json={"amount": 4444}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        after = self._share_amount(h, "school_share_amount")
        assert after == pytest.approx(before - 3333 + 4444), f"before={before} after={after}"

    def test_gp_share_expense_syncs_and_delete_zeroes(self, h):
        r = requests.post(
            f"{BASE_URL}/api/school-expenses",
            headers=h,
            json={"school_id": TEST_SCHOOL_ID, "category": "gp_share", "amount": 2222,
                  "description": "TEST_gp_share_sync", "expense_date": "2026-02-01"},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        eid = r.json()["expense"]["id"]
        after_create = self._share_amount(h, "gp_share_amount")
        assert after_create >= 2222

        d = requests.delete(f"{BASE_URL}/api/school-expenses/{eid}", headers=h, timeout=30)
        assert d.status_code == 200, d.text[:300]
        after_delete = self._share_amount(h, "gp_share_amount")
        assert after_delete == pytest.approx(after_create - 2222), \
            f"gp_share_amount not resynced after delete: {after_create} -> {after_delete}"

    def test_delete_last_share_expense_sets_zero(self, h):
        """Create+delete on a school with no other gp_share expenses -> 0."""
        # find/create a distinct school without gp_share expenses: reuse test school
        # (previous test already removed its gp_share expense)
        r = requests.post(
            f"{BASE_URL}/api/school-expenses", headers=h,
            json={"school_id": TEST_SCHOOL_ID, "category": "gp_share", "amount": 1111,
                  "description": "TEST_gp_share_zero", "expense_date": "2026-02-02"},
            timeout=30)
        assert r.status_code == 200
        eid = r.json()["expense"]["id"]
        requests.delete(f"{BASE_URL}/api/school-expenses/{eid}", headers=h, timeout=30)
        remaining = requests.get(f"{BASE_URL}/api/school-expenses", headers=h,
                                 params={"school_id": TEST_SCHOOL_ID}, timeout=30).json()
        remaining = remaining.get("expenses", remaining) if isinstance(remaining, dict) else remaining
        gp_rows = [e for e in remaining if e.get("category") == "gp_share"]
        if gp_rows:
            pytest.skip("school still has other gp_share expenses")
        assert self._share_amount(h, "gp_share_amount") == 0.0


# ── 4. pnl-summary status coverage ────────────────────────────────────
class TestPnlSummary:
    def test_pnl_summary_ok_and_includes_new_statuses(self, h):
        r = requests.get(f"{BASE_URL}/api/school-expenses/pnl-summary", headers=h, timeout=120)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        body = r.json()
        rows = body.get("rows") or body.get("schools") or body.get("data") or []
        assert isinstance(rows, list) and rows, f"no pnl rows; keys={list(body)[:10]}"
        assert "school_id" in rows[0] and "total_costs" in rows[0]

    def test_zero_revenue_school_with_expense_not_dropped(self, h):
        """Add an expense to a renewal_meeting/meeting_done school and check it shows in pnl."""
        sl = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=h,
                          params={"status": "renewal_meeting,meeting_done", "view_all": "true"}, timeout=60)
        assert sl.status_code == 200, sl.text[:200]
        data = sl.json()
        if isinstance(data, dict):
            schools = data.get("schools") or data.get("inquiries") or []
        else:
            schools = data
        schools = [s for s in schools if s.get("status") in ("renewal_meeting", "meeting_done")]
        if not schools:
            pytest.skip("no renewal_meeting/meeting_done school found")
        sid = schools[0]["id"]
        r = requests.post(f"{BASE_URL}/api/school-expenses", headers=h,
                          json={"school_id": sid, "category": "kit_cost", "amount": 999,
                                "description": "TEST_pnl_visibility", "expense_date": "2026-02-03"},
                          timeout=30)
        assert r.status_code == 200, r.text[:300]
        eid = r.json()["expense"]["id"]
        try:
            p = requests.get(f"{BASE_URL}/api/school-expenses/pnl-summary", headers=h, timeout=120)
            assert p.status_code == 200
            body = p.json()
            rows = body.get("rows") or body.get("schools") or body.get("data") or []
            ids = {x.get("school_id") or x.get("id") for x in rows}
            assert sid in ids, f"school {sid} ({schools[0].get('school_name')}) missing from pnl rows"
        finally:
            requests.delete(f"{BASE_URL}/api/school-expenses/{eid}", headers=h, timeout=30)
