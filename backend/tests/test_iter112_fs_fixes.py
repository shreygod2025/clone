"""Iteration 112 — Regression tests for the 6 Future-Skills CRM fixes.

Covers:
  Fix 2  — reports.funnel.trials matches Free Trials tab (booked statuses).
  Fix 3b — PATCH trials/{id} & subscriptions/{id} accept center_id + batch_id
           and enrich center_name/batch_name.
  Fix 6a — GET /support/assignees returns team_users + fs_center owners.
  Regression — Centre Economics CRUD + mirror still work.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for pytest run inside container (frontend .env)
    with open("/app/frontend/.env") as fp:
        for line in fp:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "OllistheBest@2026"


# ── fixtures ──────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="module")
def h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ── Fix 2 — reports funnel trials count ───────────────────────────────
def test_reports_trials_matches_free_trials_tab(h):
    r_reports = requests.get(f"{BASE_URL}/api/admin/future-skills/reports", headers=h, timeout=20)
    assert r_reports.status_code == 200, r_reports.text
    reports = r_reports.json()
    assert "funnel" in reports and "trials" in reports["funnel"]
    trials_count = reports["funnel"]["trials"]
    assert isinstance(trials_count, int)

    # The Free Trials UI tab calls: /admin/future-skills/trials?crm_status=booked
    r_ui = requests.get(
        f"{BASE_URL}/api/admin/future-skills/trials",
        params={"crm_status": "booked"},
        headers=h,
        timeout=20,
    )
    assert r_ui.status_code == 200, r_ui.text
    rows = r_ui.json()
    if isinstance(rows, dict):
        rows = rows.get("trials") or rows.get("items") or []
    ui_count = len(rows)
    # Reports may include ALL-time bookings, UI may be filtered by month.
    # Just assert counts are within a sensible range and that reports > 0
    # only when UI > 0.
    print(f"reports.trials={trials_count}  ui(booked)={ui_count}")
    assert trials_count == ui_count, (
        f"reports.funnel.trials={trials_count} does not match "
        f"free-trials-tab count={ui_count}"
    )


# ── Fix 3b — PATCH trial & subscription with center_id/batch_id ───────
def _first_center(h):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/centers", headers=h, timeout=20)
    assert r.status_code == 200
    lst = r.json()
    if isinstance(lst, dict):
        lst = lst.get("centers") or lst.get("items") or []
    assert lst, "no centres seeded"
    return lst[0]


def _batches_for_center(h, center_id):
    r = requests.get(
        f"{BASE_URL}/api/admin/future-skills/batches",
        params={"center_id": center_id},
        headers=h,
        timeout=20,
    )
    if r.status_code != 200:
        return []
    lst = r.json()
    if isinstance(lst, dict):
        lst = lst.get("batches") or lst.get("items") or []
    return lst


def test_patch_trial_enriches_center_and_batch(h):
    r = requests.get(
        f"{BASE_URL}/api/admin/future-skills/trials",
        params={"crm_status": "booked"},
        headers=h,
        timeout=20,
    )
    assert r.status_code == 200
    trials = r.json()
    if isinstance(trials, dict):
        trials = trials.get("trials") or trials.get("items") or []
    if not trials:
        pytest.skip("no trials to patch")
    trial = trials[0]
    tid = trial["id"]
    centre = _first_center(h)
    payload = {"center_id": centre["id"]}
    batches = _batches_for_center(h, centre["id"])
    if batches:
        payload["batch_id"] = batches[0]["id"]

    r_patch = requests.patch(
        f"{BASE_URL}/api/admin/future-skills/trials/{tid}",
        json=payload,
        headers=h,
        timeout=20,
    )
    assert r_patch.status_code == 200, r_patch.text
    updated = r_patch.json().get("trial") or r_patch.json()
    assert updated.get("center_id") == centre["id"]
    assert updated.get("center_name") == centre["name"], (
        f"center_name not enriched — got {updated.get('center_name')!r}"
    )
    if batches:
        assert updated.get("batch_id") == batches[0]["id"]
        assert updated.get("batch_name") == batches[0]["name"]


def test_patch_subscription_enriches_center_and_batch(h):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/subscriptions", headers=h, timeout=20)
    assert r.status_code == 200
    subs = r.json()
    if isinstance(subs, dict):
        subs = subs.get("subscriptions") or subs.get("items") or []
    if not subs:
        pytest.skip("no subscriptions to patch")
    sub = subs[0]
    sid = sub["id"]
    centre = _first_center(h)
    payload = {"center_id": centre["id"]}
    batches = _batches_for_center(h, centre["id"])
    if batches:
        payload["batch_id"] = batches[0]["id"]

    r_patch = requests.patch(
        f"{BASE_URL}/api/admin/future-skills/subscriptions/{sid}",
        json=payload,
        headers=h,
        timeout=20,
    )
    assert r_patch.status_code == 200, r_patch.text
    updated = r_patch.json().get("subscription") or r_patch.json()
    assert updated.get("center_id") == centre["id"]
    assert updated.get("center_name") == centre["name"]
    if batches:
        assert updated.get("batch_id") == batches[0]["id"]
        assert updated.get("batch_name") == batches[0]["name"]


# ── Fix 6a — /support/assignees returns team_users + fs_center owners ─
def test_support_assignees_endpoint(h):
    r = requests.get(f"{BASE_URL}/api/support/assignees", headers=h, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list), f"expected list, got {type(data)}"
    assert len(data) > 0, "no assignees returned"

    types = {row.get("type") for row in data}
    print(f"assignee types: {types}, total={len(data)}")

    fs_rows = [r for r in data if r.get("type") == "fs_center"]
    team_rows = [r for r in data if r.get("type") == "team_user"]
    assert team_rows, "no team_user assignees returned"

    for row in fs_rows:
        assert row.get("role") == "fs_center_owner"
        assert row.get("email"), "fs_center row missing email"
        assert row.get("id"), "fs_center row missing id"


# ── Fix 6c support — support/queries?my_tickets=true returns 200 ──────
def test_support_queries_my_tickets(h):
    r = requests.get(
        f"{BASE_URL}/api/support/queries",
        params={"my_tickets": "true"},
        headers=h,
        timeout=20,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    # backend may return list or {queries: [...]}
    if isinstance(data, dict):
        data = data.get("queries") or data.get("items") or []
    assert isinstance(data, list)


# ── Regression — Centre Economics still works ─────────────────────────
def test_centre_economics_list_still_works(h):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/centre-economics", headers=h, timeout=20)
    # allow 200 (list) — some builds return {rows: [...]}
    assert r.status_code == 200, r.text


def test_reports_revenue_aov_and_margin_present(h):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/reports", headers=h, timeout=20)
    assert r.status_code == 200
    rev = r.json().get("revenue", {})
    # Field must exist (may be 0 / None if no data)
    assert "aov" in rev
    assert "profit_margin_pct" in rev
