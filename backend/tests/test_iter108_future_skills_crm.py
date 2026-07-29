"""
Iteration 108 - Future Skills CRM: Leads, Trials, Customers, Renewals, Lost.
Backend regression against /api/admin/future-skills/* endpoints.
"""
import os
import io
import csv
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "OllistheBest@2026"

STATE = {}  # cross-test state


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── LEADS ───────────────────────────────────────────────────────────────
def test_01_create_lead(auth):
    payload = {
        "name": "TEST_Lead One", "phone": "9876500001",
        "email": "test1@example.com", "source": "Instagram",
        "city": "Mumbai", "child_age": "10", "child_grade": "5",
        "notes": "Interested in coding",
    }
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads", json=payload, headers=auth)
    assert r.status_code == 200, r.text
    lead = r.json()["lead"]
    assert lead["name"] == "TEST_Lead One"
    assert lead["phone"] == "9876500001"
    assert lead["source"] == "Instagram"
    assert lead["city"] == "Mumbai"
    assert lead["child_age"] == "10"
    assert lead["child_grade"] == "5"
    assert lead["status"] == "new"
    assert lead["lead_ref"].startswith("FSL")
    STATE["lead_id"] = lead["id"]


def test_02_list_leads_filters(auth):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/leads?status=all", headers=auth)
    assert r.status_code == 200
    data = r.json()
    assert "leads" in data and "stats" in data
    ids = [ld["id"] for ld in data["leads"]]
    assert STATE["lead_id"] in ids

    r2 = requests.get(f"{BASE_URL}/api/admin/future-skills/leads?q=TEST_Lead", headers=auth)
    assert r2.status_code == 200
    assert any(ld["id"] == STATE["lead_id"] for ld in r2.json()["leads"])

    r3 = requests.get(f"{BASE_URL}/api/admin/future-skills/leads?status=new", headers=auth)
    assert r3.status_code == 200


def test_03_patch_lead(auth):
    r = requests.patch(f"{BASE_URL}/api/admin/future-skills/leads/{STATE['lead_id']}",
                       json={"city": "Pune", "status": "contacted"}, headers=auth)
    assert r.status_code == 200, r.text
    assert r.json()["lead"]["city"] == "Pune"
    assert r.json()["lead"]["status"] == "contacted"


def test_04_convert_lead_to_trial(auth):
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/{STATE['lead_id']}/convert-to-trial",
                      headers=auth)
    assert r.status_code == 200, r.text
    trial = r.json()["trial"]
    assert trial["trial_ref"].startswith("FST")
    assert trial["source_lead_id"] == STATE["lead_id"]
    STATE["trial_id"] = trial["id"]
    # Verify lead now converted
    r2 = requests.get(f"{BASE_URL}/api/admin/future-skills/leads?status=all", headers=auth)
    lead = next(ld for ld in r2.json()["leads"] if ld["id"] == STATE["lead_id"])
    assert lead["status"] == "converted"
    assert lead["converted_trial_id"] == STATE["trial_id"]


def test_05_create_second_lead_and_mark_lost(auth):
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads",
                      json={"name": "TEST_Lead Lost", "phone": "9876500002"}, headers=auth)
    assert r.status_code == 200
    lid = r.json()["lead"]["id"]
    STATE["lost_lead_id"] = lid

    r2 = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/{lid}/mark-lost",
                       json={"reason": "Not interested"}, headers=auth)
    assert r2.status_code == 200, r2.text
    ld = r2.json()["lead"]
    assert ld["status"] == "lost"
    assert ld["lost_reason"] == "Not interested"
    assert ld.get("lost_at")


# ── IMPORT LEADS ────────────────────────────────────────────────────────
def test_06_import_leads_csv(auth):
    import time as _t
    base = str(int(_t.time()))[-7:]
    p1 = "8" + base + "1"
    p2 = "8" + base + "2"
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["name", "phone", "email", "source", "city", "child_age", "child_grade"])
    w.writerow(["TEST_Import A", p1, "a@x.com", "Facebook", "Delhi", "9", "4"])
    w.writerow(["TEST_Import B", p2, "b@x.com", "Google", "Bangalore", "11", "6"])
    w.writerow(["", "9000000003", "no@x.com", "", "", "", ""])  # missing name -> skip
    w.writerow(["TEST_Import A", p1, "dup@x.com", "", "", "", ""])  # duplicate phone -> skip
    files = {"file": ("leads.csv", buf.getvalue().encode("utf-8"), "text/csv")}
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/import",
                      files=files, headers=auth)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["inserted"] == 2, d
    assert d["skipped"] >= 2
    assert d["total_rows"] == 4


def test_07_import_leads_bad_file(auth):
    files = {"file": ("bad.txt", b"random", "text/plain")}
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/import",
                      files=files, headers=auth)
    assert r.status_code == 400


# ── TRIALS ──────────────────────────────────────────────────────────────
def test_08_create_trial_directly(auth):
    payload = {
        "parent_name": "TEST_Trial Parent", "parent_phone": "9876500010",
        "parent_email": "trial@example.com", "student_name": "TEST_Student",
        "student_grade": "6", "preferred_skill": "Coding",
    }
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/trials", json=payload, headers=auth)
    assert r.status_code == 200, r.text
    t = r.json()["trial"]
    assert t["trial_ref"].startswith("FST")
    STATE["direct_trial_id"] = t["id"]


def test_09_convert_trial_to_customer(auth):
    payload = {
        "plan": "half_yearly", "amount_paid": 11000,
        "payment_date": "2026-01-05", "renewal_date": "2026-07-05",
    }
    r = requests.post(
        f"{BASE_URL}/api/admin/future-skills/trials/{STATE['trial_id']}/convert-to-customer",
        json=payload, headers=auth)
    assert r.status_code == 200, r.text
    sub = r.json()["subscription"]
    assert sub["subscription_ref"].startswith("FSP")
    assert sub["plan"] == "half_yearly"
    assert sub["plan_label"] == "Half Yearly"
    assert sub["amount_paid"] == 11000
    assert "2026-07-05" in sub["renewal_date"]
    assert sub["crm_status"] == "active"
    STATE["customer_id"] = sub["id"]


def test_10_mark_direct_trial_lost(auth):
    r = requests.post(
        f"{BASE_URL}/api/admin/future-skills/trials/{STATE['direct_trial_id']}/mark-lost",
        json={"reason": "Could not schedule"}, headers=auth)
    assert r.status_code == 200
    assert r.json()["trial"]["crm_status"] == "lost"


# ── CUSTOMERS ───────────────────────────────────────────────────────────
def test_11_create_customer_directly_auto_renewal(auth):
    payload = {
        "parent_name": "TEST_Direct Cust", "parent_phone": "9876500020",
        "parent_email": "d@example.com", "student_name": "TEST_Kid",
        "student_grade": "7", "plan": "monthly", "amount_paid": 2000,
        "payment_date": "2026-01-01",
        # no renewal_date → should auto compute +1 month
    }
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/customers", json=payload, headers=auth)
    assert r.status_code == 200, r.text
    sub = r.json()["subscription"]
    assert sub["plan"] == "monthly"
    assert sub["plan_label"] == "Monthly"
    assert sub["amount_paid"] == 2000
    assert sub["renewal_date"]  # auto computed
    ren = datetime.fromisoformat(sub["renewal_date"].replace("Z", "+00:00"))
    pay = datetime.fromisoformat(sub["payment_date"].replace("Z", "+00:00"))
    assert (ren - pay).days >= 28  # monthly ~30d
    STATE["auto_customer_id"] = sub["id"]


def test_12_create_customer_yearly(auth):
    payload = {
        "parent_name": "TEST_Year Cust", "parent_phone": "9876500021",
        "student_name": "TEST_YearKid", "plan": "yearly", "amount_paid": 21000,
    }
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/customers", json=payload, headers=auth)
    assert r.status_code == 200
    sub = r.json()["subscription"]
    assert sub["plan"] == "yearly"
    STATE["year_customer_id"] = sub["id"]


def test_13_backdate_and_renewals_overdue(auth):
    # Backdate the customer_id renewal to make it overdue
    past = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    r = requests.patch(f"{BASE_URL}/api/admin/future-skills/subscriptions/{STATE['customer_id']}",
                       json={"renewal_date": past}, headers=auth)
    assert r.status_code == 200, r.text

    r2 = requests.get(f"{BASE_URL}/api/admin/future-skills/renewals?bucket=overdue", headers=auth)
    assert r2.status_code == 200
    ids = [x["id"] for x in r2.json()["renewals"]]
    assert STATE["customer_id"] in ids
    row = next(x for x in r2.json()["renewals"] if x["id"] == STATE["customer_id"])
    assert row["renewal_bucket"] == "overdue"
    assert row["days_overdue"] >= 4


def test_14_upcoming_bucket(auth):
    # Auto customer has renewal ~30 days out — set to 3 days ahead
    future = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    r = requests.patch(f"{BASE_URL}/api/admin/future-skills/subscriptions/{STATE['auto_customer_id']}",
                       json={"renewal_date": future}, headers=auth)
    assert r.status_code == 200

    r2 = requests.get(f"{BASE_URL}/api/admin/future-skills/renewals?bucket=upcoming", headers=auth)
    assert r2.status_code == 200
    ids = [x["id"] for x in r2.json()["renewals"]]
    assert STATE["auto_customer_id"] in ids


def test_15_renew_customer(auth):
    today = datetime.now(timezone.utc).date().isoformat()
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/customers/{STATE['customer_id']}/renew",
                      json={"amount_paid": 11000, "payment_date": today}, headers=auth)
    assert r.status_code == 200, r.text
    sub = r.json()["subscription"]
    assert sub["crm_status"] == "active"
    assert isinstance(sub.get("renewal_history"), list)
    assert len(sub["renewal_history"]) >= 1
    ren = datetime.fromisoformat(sub["renewal_date"].replace("Z", "+00:00"))
    # Renewal must be in the future now
    assert ren > datetime.now(timezone.utc)


def test_16_mark_customer_lost(auth):
    r = requests.post(
        f"{BASE_URL}/api/admin/future-skills/customers/{STATE['year_customer_id']}/mark-lost",
        json={"reason": "Cancelled"}, headers=auth)
    assert r.status_code == 200
    assert r.json()["subscription"]["crm_status"] == "lost"


# ── LOST aggregation ────────────────────────────────────────────────────
def test_17_lost_aggregate(auth):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/lost?type=all", headers=auth)
    assert r.status_code == 200
    rows = r.json()["lost"]
    types = {row["entity_type"] for row in rows}
    assert {"lead", "trial", "customer"}.issubset(types), f"Missing types: {types}"
    for row in rows:
        assert "display_name" in row and "lost_reason" in row and "entity_ref" in row


def test_18_lost_filter_type(auth):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/lost?type=customer", headers=auth)
    assert r.status_code == 200
    for row in r.json()["lost"]:
        assert row["entity_type"] == "customer"


# ── STATS ───────────────────────────────────────────────────────────────
def test_19_stats(auth):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/stats", headers=auth)
    assert r.status_code == 200
    s = r.json()
    for k in ["leads", "trials", "customers", "renewals",
              "renewals_upcoming", "renewals_overdue", "lost", "lost_breakdown"]:
        assert k in s
    for k in ["leads", "trials", "customers"]:
        assert k in s["lost_breakdown"]
    assert s["lost_breakdown"]["customers"] >= 1
    assert s["lost_breakdown"]["leads"] >= 1
    assert s["lost_breakdown"]["trials"] >= 1


# ── AUTH GUARD ──────────────────────────────────────────────────────────
def test_20_admin_only_no_token():
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/stats")
    assert r.status_code in (401, 403)


def test_21_admin_only_bad_token():
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/stats",
                     headers={"Authorization": "Bearer invalid.token.here"})
    assert r.status_code in (401, 403)


# ── PLANS: half_yearly present ──────────────────────────────────────────
def test_22_plans_half_yearly_available(auth):
    # implicit via customer creation success above with half_yearly
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/customers",
                      json={"parent_name": "TEST_HY", "parent_phone": "9876500030",
                            "student_name": "TEST_HY_S", "plan": "half_yearly",
                            "amount_paid": 11000, "payment_date": "2026-01-01"},
                      headers=auth)
    assert r.status_code == 200
    sub = r.json()["subscription"]
    assert sub["plan"] == "half_yearly"
    assert sub["plan_label"] == "Half Yearly"
    ren = datetime.fromisoformat(sub["renewal_date"].replace("Z", "+00:00"))
    pay = datetime.fromisoformat(sub["payment_date"].replace("Z", "+00:00"))
    assert 170 <= (ren - pay).days <= 200  # ~6 months


# ── PUBLIC endpoints still work (regression) ────────────────────────────
def test_23_public_register_trial_still_ok():
    r = requests.post(f"{BASE_URL}/api/future-skills/register-trial",
                      json={"parent_name": "TEST_Public", "parent_phone": "9876500099",
                            "parent_email": "pub@example.com",
                            "student_name": "TEST_PubKid", "student_grade": "5"})
    assert r.status_code == 200, r.text


# ── CLEANUP ─────────────────────────────────────────────────────────────
def test_99_cleanup_delete_lead(auth):
    if STATE.get("lost_lead_id"):
        r = requests.delete(f"{BASE_URL}/api/admin/future-skills/leads/{STATE['lost_lead_id']}",
                            headers=auth)
        assert r.status_code == 200
