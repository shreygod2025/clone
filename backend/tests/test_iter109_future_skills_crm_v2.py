"""
Iteration 109 — Future Skills CRM extended features:
- Lead creation without name (name optional)
- Lead followup (POST + history)
- Lead book-trial (creates trial, lead→converted)
- Trial convert with payment_mode + payment_status
- Reports endpoint: month + center_id filters, revenue/by_plan
"""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "OllistheBest@2026"

STATE = {}


@pytest.fixture(scope="session")
def auth():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    return {"Authorization": f"Bearer {tok}"}


# ── (1) Lead create — name optional ─────────────────────────────────────
def test_01_create_lead_without_name(auth):
    phone = f"9{int(time.time()) % 1_000_000_000:09d}"
    payload = {"phone": phone, "source": "Instagram", "child_age": "8-11"}
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads", json=payload, headers=auth)
    assert r.status_code == 200, r.text
    lead = r.json()["lead"]
    assert lead["phone"] == phone
    assert lead["name"] == ""
    assert lead["source"] == "Instagram"
    assert lead["child_age"] == "8-11"
    assert lead["status"] == "new"
    STATE["lead_id"] = lead["id"]
    STATE["lead_phone"] = phone


# ── (2) Followup + history ──────────────────────────────────────────────
def test_02_lead_followup_persists_and_returns_history(auth):
    lead_id = STATE["lead_id"]
    body = {
        "next_date": "2026-02-15",
        "note": "TEST_iter109 called parent, will call back",
        "outcome": "called",
    }
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/{lead_id}/followup",
                      json=body, headers=auth)
    assert r.status_code == 200, r.text
    lead = r.json()["lead"]
    assert lead["next_followup_date"] == "2026-02-15"
    assert lead["last_followup_outcome"] == "called"
    followups = lead.get("followups") or []
    assert len(followups) >= 1
    latest = followups[-1]
    assert latest["outcome"] == "called"
    assert latest["note"].startswith("TEST_iter109")
    assert latest["next_date"] == "2026-02-15"

    # Second followup appends to history
    r2 = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/{lead_id}/followup",
                       json={"next_date": "2026-02-20", "note": "no answer 2nd time",
                             "outcome": "no_answer"}, headers=auth)
    assert r2.status_code == 200
    lead2 = r2.json()["lead"]
    assert len(lead2["followups"]) >= 2
    assert lead2["last_followup_outcome"] == "no_answer"
    assert lead2["next_followup_date"] == "2026-02-20"


# ── (3) Fetch centre + batch for book-trial ─────────────────────────────
def test_03_get_centre_and_batch(auth):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/centers", headers=auth)
    assert r.status_code == 200, r.text
    centres = r.json().get("centers") or r.json().get("centres") or []
    assert centres, "Need at least one centre for book-trial test"
    STATE["center_id"] = centres[0]["id"]

    rb = requests.get(f"{BASE_URL}/api/admin/future-skills/batches",
                      params={"center_id": STATE["center_id"]}, headers=auth)
    assert rb.status_code == 200, rb.text
    batches = rb.json().get("batches") or []
    STATE["batch_id"] = batches[0]["id"] if batches else ""


# ── (4) Book trial from lead ────────────────────────────────────────────
def test_04_book_trial_from_lead(auth):
    # Fresh lead
    phone = f"8{int(time.time()) % 1_000_000_000:09d}"
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads",
                      json={"name": "TEST_iter109 Trial Src", "phone": phone,
                            "source": "Referral"}, headers=auth)
    assert r.status_code == 200
    lead_id = r.json()["lead"]["id"]

    body = {
        "center_id": STATE["center_id"],
        "batch_id": STATE.get("batch_id", ""),
        "scheduled_at": "2026-02-10T10:00:00Z",
    }
    r2 = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/{lead_id}/book-trial",
                       json=body, headers=auth)
    assert r2.status_code == 200, r2.text
    trial = r2.json()["trial"]
    assert trial["center_id"] == STATE["center_id"]
    assert trial["scheduled_at"].startswith("2026-02-10")
    assert trial["source_lead_id"] == lead_id
    assert trial["trial_status"] == "scheduled"
    STATE["trial_id"] = trial["id"]

    # Verify lead is now 'converted'
    r3 = requests.get(f"{BASE_URL}/api/admin/future-skills/leads",
                      params={"status": "converted"}, headers=auth)
    assert r3.status_code == 200
    ids = [l["id"] for l in r3.json()["leads"]]
    assert lead_id in ids


# ── (5) Convert trial with payment_mode + payment_status ────────────────
def test_05_convert_trial_with_payment_meta(auth):
    trial_id = STATE["trial_id"]
    body = {
        "plan": "monthly",
        "amount_paid": 2500,
        "payment_mode": "upi",
        "payment_status": "paid",
        "payment_date": "2026-02-11",
    }
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/trials/{trial_id}/convert-to-customer",
                      json=body, headers=auth)
    assert r.status_code == 200, r.text
    sub = r.json()["subscription"]
    assert sub["plan"] == "monthly"
    assert sub["payment_mode"] == "upi"
    assert sub["payment_status"] == "paid"
    assert sub["amount_paid"] == 2500
    assert sub["crm_status"] == "active"
    assert sub["source_trial_id"] == trial_id
    STATE["sub_id"] = sub["id"]


# ── (6) Reports: month + center_id + revenue/by_plan ────────────────────
def test_06_reports_all_time(auth):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/reports", headers=auth)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "funnel" in body
    assert "revenue" in body
    rev = body["revenue"]
    assert "total" in rev and "per_student" in rev and "by_plan" in rev
    by_plan = {p["plan"]: p for p in rev["by_plan"]}
    for k in ("monthly", "half_yearly", "yearly"):
        assert k in by_plan
        assert "count" in by_plan[k] and "revenue" in by_plan[k] and "label" in by_plan[k]


def test_07_reports_current_month_filter(auth):
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/reports",
                     params={"month": month}, headers=auth)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["filters"]["month"] == month
    assert body["revenue"]["total"] >= 2500  # includes our test_05 conversion this month


def test_08_reports_with_center_filter(auth):
    cid = STATE.get("center_id")
    if not cid:
        pytest.skip("No centre available")
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/reports",
                     params={"center_id": cid}, headers=auth)
    assert r.status_code == 200, r.text
    assert r.json()["filters"]["center_id"] == cid


def test_09_reports_center_all_treated_as_no_filter(auth):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/reports",
                     params={"center_id": "all"}, headers=auth)
    assert r.status_code == 200, r.text
    assert r.json()["filters"]["center_id"] is None


# ── (7) Trial followup ──────────────────────────────────────────────────
def test_10_trial_followup(auth):
    # Create a fresh trial via admin/trials
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/trials", json={
        "parent_name": "TEST_iter109 Trial Parent",
        "parent_phone": f"7{int(time.time()) % 1_000_000_000:09d}",
        "student_name": "TEST_iter109 Student",
    }, headers=auth)
    assert r.status_code == 200, r.text
    trial_id = r.json()["trial"]["id"]

    r2 = requests.post(f"{BASE_URL}/api/admin/future-skills/trials/{trial_id}/followup",
                       json={"next_date": "2026-02-20", "note": "TEST_iter109 tf",
                             "outcome": "interested"}, headers=auth)
    assert r2.status_code == 200, r2.text
    trial = r2.json()["trial"]
    assert trial["last_followup_outcome"] == "interested"
    assert trial["next_followup_date"] == "2026-02-20"
    assert len(trial.get("followups") or []) >= 1
