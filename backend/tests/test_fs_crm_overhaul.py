"""Backend tests for Future Skills CRM overhaul (iteration 114)."""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "GodisGreat@2026"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _create_lead(headers, **fields):
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads", json=fields, headers=headers, timeout=20)
    assert r.status_code in (200, 201), r.text
    return r.json()["lead"]


def _delete_lead(headers, lead_id):
    try:
        requests.delete(f"{BASE_URL}/api/admin/future-skills/leads/{lead_id}", headers=headers, timeout=15)
    except Exception:
        pass


# --- Move to Trial bug fix ---
def test_move_to_trial_creates_scheduled_and_appears_in_trials(headers):
    lead = _create_lead(headers, name="QA MoveToTrial2", phone="9998887702", status="new")
    lead_id = lead["id"]
    try:
        r2 = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/{lead_id}/convert-to-trial", headers=headers, timeout=20)
        assert r2.status_code == 200, r2.text
        trial = r2.json()["trial"]
        assert trial.get("crm_status") == "scheduled", f"got crm_status={trial.get('crm_status')}"

        r3 = requests.get(f"{BASE_URL}/api/admin/future-skills/trials", headers=headers, timeout=20)
        assert r3.status_code == 200
        trials = r3.json().get("trials", [])
        assert any(t.get("parent_name") == "QA MoveToTrial2" for t in trials), \
            f"trial not in default trials list; found {[t.get('parent_name') for t in trials[:5]]}"
    finally:
        _delete_lead(headers, lead_id)


# --- CSV import age bucketing + source preservation ---
def test_csv_import_age_bucketing_and_source(headers):
    import time
    suffix = str(int(time.time()))[-6:]
    p1, p2, p3 = f"77{suffix}01", f"77{suffix}02", f"77{suffix}03"
    csv_data = (
        "name,phone,source,city,age_group,child_age\n"
        f"QA Import1,{p1},Instagram ads,Mumbai,,9\n"
        f"QA Import2,{p2},Instagram ads,Mumbai,8-11,\n"
        f"QA Import3,{p3},Facebook,Mumbai,,14\n"
    )
    files = {"file": ("leads.csv", io.BytesIO(csv_data.encode()), "text/csv")}
    r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/import", files=files, headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("inserted") == 3, f"expected 3 inserted, got {body}"

    r2 = requests.get(f"{BASE_URL}/api/admin/future-skills/leads", params={"q": "QA Import"}, headers=headers, timeout=20)
    assert r2.status_code == 200
    items = r2.json().get("leads", [])
    by_name = {i["name"]: i for i in items}
    try:
        assert by_name.get("QA Import1", {}).get("age_group") == "8-11", by_name.get("QA Import1")
        assert by_name.get("QA Import2", {}).get("age_group") == "8-11", by_name.get("QA Import2")
        assert by_name.get("QA Import3", {}).get("age_group") == "12-16", by_name.get("QA Import3")
        assert (by_name["QA Import1"].get("source") or "").lower() == "instagram ads"
        assert (by_name["QA Import2"].get("source") or "").lower() == "instagram ads"
        assert (by_name["QA Import3"].get("source") or "").lower() == "facebook"
    finally:
        for name in ["QA Import1", "QA Import2", "QA Import3"]:
            if name in by_name:
                _delete_lead(headers, by_name[name]["id"])


# --- Follow-up outcomes flip status ---
def test_followup_no_answer_then_not_interested(headers):
    lead = _create_lead(headers, name="QA Followup", phone="9998887721", status="new")
    lead_id = lead["id"]
    try:
        r2 = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/{lead_id}/followup",
                           json={"note": "x", "outcome": "no_answer"}, headers=headers, timeout=20)
        assert r2.status_code == 200, r2.text
        lead2 = r2.json()["lead"]
        assert lead2["status"] == "no_answer", f"got status {lead2['status']}"
        assert lead2.get("first_contact_at"), "first_contact_at missing"

        r3 = requests.get(f"{BASE_URL}/api/admin/future-skills/leads",
                          params={"status": "no_answer"}, headers=headers, timeout=20)
        assert r3.status_code == 200
        stats = r3.json().get("stats", {})
        assert stats.get("no_answer", 0) >= 1, f"stats.no_answer = {stats.get('no_answer')}"

        r4 = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/{lead_id}/followup",
                           json={"note": "not interested", "outcome": "not_interested"}, headers=headers, timeout=20)
        assert r4.status_code == 200, r4.text
        lead3 = r4.json()["lead"]
        assert lead3["status"] == "lost", f"expected lost, got {lead3['status']}"
        assert lead3.get("lost_reason") == "not_interested", f"lost_reason={lead3.get('lost_reason')}"
    finally:
        _delete_lead(headers, lead_id)


# --- Followup with incorrect_number outcome ---
def test_followup_incorrect_number_outcome(headers):
    lead = _create_lead(headers, name="QA IncorrectNum", phone="9998887722", status="new")
    lead_id = lead["id"]
    try:
        r = requests.post(f"{BASE_URL}/api/admin/future-skills/leads/{lead_id}/followup",
                          json={"note": "wrong", "outcome": "incorrect_number"}, headers=headers, timeout=20)
        assert r.status_code == 200, r.text
        lead2 = r.json()["lead"]
        assert lead2["status"] == "incorrect_number", f"got {lead2['status']}"
    finally:
        _delete_lead(headers, lead_id)


# --- Reports lead_metrics block ---
def test_reports_lead_metrics(headers):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/reports", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    lm = r.json().get("lead_metrics")
    assert lm is not None, "lead_metrics missing"
    for key in ["cost_per_lead", "marketing_spend", "no_answer_count", "incorrect_number_count",
                "avg_first_contact_hours", "avg_first_contact_minutes", "first_contact_sample"]:
        assert key in lm, f"missing key {key} in lead_metrics: {lm}"


# --- Lead list default status filter + stats returned ---
def test_leads_default_status_and_stats(headers):
    r = requests.get(f"{BASE_URL}/api/admin/future-skills/leads", headers=headers, timeout=20)
    assert r.status_code == 200
    stats = r.json().get("stats", {})
    for k in ["new", "followup", "no_answer", "incorrect_number"]:
        assert k in stats, f"stats missing {k}"


# --- Inline notes PATCH ---
def test_patch_lead_notes_persists(headers):
    lead = _create_lead(headers, name="QA Notes", phone="9998887731", status="new")
    lead_id = lead["id"]
    try:
        note_text = "inline notes QA"
        r2 = requests.patch(f"{BASE_URL}/api/admin/future-skills/leads/{lead_id}",
                            json={"notes": note_text}, headers=headers, timeout=20)
        assert r2.status_code == 200, r2.text
        r3 = requests.get(f"{BASE_URL}/api/admin/future-skills/leads",
                          params={"q": "QA Notes"}, headers=headers, timeout=20)
        items = r3.json().get("leads", [])
        found = next((i for i in items if i["id"] == lead_id), None)
        assert found and found.get("notes") == note_text, f"notes not persisted: {found}"
    finally:
        _delete_lead(headers, lead_id)
