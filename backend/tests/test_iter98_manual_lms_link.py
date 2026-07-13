"""Iter98 - Manual LMS→CRM school link endpoints.

Covers:
  GET  /api/lms/all-schools (?q=)
  PATCH /api/schools/{id}/link-lms   (admin only, transfer, delete_previous)
  DELETE /api/schools/{id}/link-lms  (admin only)
  Durability across POST /api/lms/import-schools
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@oll.co")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Dagaji03@")

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ─────────── GET /api/lms/all-schools ───────────
def test_all_schools_unauth():
    r = requests.get(f"{API}/lms/all-schools", timeout=30)
    assert r.status_code in (401, 403), f"expected auth failure, got {r.status_code}"


def test_all_schools_admin(admin_headers):
    r = requests.get(f"{API}/lms/all-schools", headers=admin_headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "count" in data and "schools" in data
    assert isinstance(data["schools"], list)
    assert data["count"] == len(data["schools"])
    if data["schools"]:
        s0 = data["schools"][0]
        assert "lms_school_id" in s0 and "school_name" in s0
        assert "linked_to" in s0  # None or dict
        if s0["linked_to"]:
            assert "crm_school_id" in s0["linked_to"]
            assert "crm_school_name" in s0["linked_to"]


def test_all_schools_query_filter(admin_headers):
    r = requests.get(f"{API}/lms/all-schools", headers=admin_headers, timeout=60)
    all_schools = r.json()["schools"]
    if not all_schools:
        pytest.skip("no LMS schools available")
    needle = all_schools[0]["school_name"][:4].lower()
    r2 = requests.get(f"{API}/lms/all-schools", headers=admin_headers, params={"q": needle}, timeout=60)
    assert r2.status_code == 200
    filtered = r2.json()["schools"]
    assert len(filtered) <= len(all_schools)
    for s in filtered:
        assert needle in s["school_name"].lower()


# ─────────── PATCH /api/schools/{id}/link-lms ───────────
def _get_or_create_crm_school(admin_headers, name_hint):
    """Create a fresh CRM school for testing so we don't stomp real data."""
    payload = {
        "school_name": f"TEST_{name_hint}_{uuid.uuid4().hex[:6]}",
        "contact_name": "Test",
        "email": f"test_{uuid.uuid4().hex[:6]}@test.com",
        "phone": "9999999999",
        "location": "Test",
        "board": "CBSE",
        "school_size": "small",
        "fee_range": "low",
        "programs_interested": [],
        "support_needed": [],
        "notes": "iter98 test",
        "status": "active",
    }
    r = requests.post(f"{API}/schools/inquiry", json=payload, headers=admin_headers, timeout=30)
    assert r.status_code in (200, 201), r.text
    return r.json()


def _delete_crm_school(admin_headers, school_id):
    requests.delete(f"{API}/schools/inquiry/{school_id}", headers=admin_headers, timeout=30)


def test_link_lms_forbidden_no_auth():
    r = requests.patch(f"{API}/schools/fake-id/link-lms", json={"lms_school_id": "x"}, timeout=30)
    assert r.status_code in (401, 403)


def test_link_and_unlink_flow(admin_headers):
    # Prefer an orphan LMS school; fall back to any so the test still runs
    r = requests.get(f"{API}/lms/all-schools", headers=admin_headers, timeout=60)
    schools = r.json()["schools"]
    if not schools:
        pytest.skip("no LMS schools available")
    orphan = next((s for s in schools if not s.get("linked_to")), schools[0])

    crm = _get_or_create_crm_school(admin_headers, "linkflow")
    crm_id = crm["id"]
    try:
        # PATCH link
        r = requests.patch(
            f"{API}/schools/{crm_id}/link-lms",
            json={"lms_school_id": orphan["lms_school_id"]},
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["lms_school_id"] == orphan["lms_school_id"]

        # Verify via GET
        rr = requests.get(f"{API}/schools/inquiries", headers=admin_headers, timeout=60)
        assert rr.status_code == 200
        matches = [s for s in rr.json() if s.get("id") == crm_id]
        assert matches, "created school missing from list"
        found = matches[0]
        assert found.get("lms_school_id") == orphan["lms_school_id"]
        assert found.get("lms_link_manual") is True
        assert found.get("lms_linked_at")
        assert found.get("lms_linked_by")
        assert found.get("last_lms_sync_at")

        # Durability across import-schools cron
        pre_count = len(rr.json())
        imp = requests.post(f"{API}/lms/import-schools", headers=admin_headers, timeout=120)
        assert imp.status_code == 200, imp.text
        rr2 = requests.get(f"{API}/schools/inquiries", headers=admin_headers, timeout=60)
        after = rr2.json()
        still = [s for s in after if s.get("id") == crm_id]
        assert still, "manually-linked CRM school disappeared after import"
        assert still[0].get("lms_school_id") == orphan["lms_school_id"]
        # No duplicate should be created for this LMS id
        with_same_lms = [s for s in after if s.get("lms_school_id") == orphan["lms_school_id"]]
        assert len(with_same_lms) == 1, f"duplicate CRM rows share this lms_school_id: {len(with_same_lms)}"

        # DELETE link
        r = requests.delete(f"{API}/schools/{crm_id}/link-lms", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        rr3 = requests.get(f"{API}/schools/inquiries", headers=admin_headers, timeout=60)
        final = [s for s in rr3.json() if s.get("id") == crm_id][0]
        assert not final.get("lms_school_id")
        assert not final.get("lms_link_manual")
    finally:
        _delete_crm_school(admin_headers, crm_id)


def test_link_transfer_flow(admin_headers):
    """When lms_id is currently linked to crm A, linking to crm B unsets A."""
    r = requests.get(f"{API}/lms/all-schools", headers=admin_headers, timeout=60)
    schools = r.json()["schools"]
    if not schools:
        pytest.skip("no LMS schools available")
    orphan = next((s for s in schools if not s.get("linked_to")), schools[0])

    crm_a = _get_or_create_crm_school(admin_headers, "src")
    crm_b = _get_or_create_crm_school(admin_headers, "dst")
    try:
        # link to A
        r = requests.patch(
            f"{API}/schools/{crm_a['id']}/link-lms",
            json={"lms_school_id": orphan["lms_school_id"]},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200
        # transfer to B (delete_previous=false)
        r = requests.patch(
            f"{API}/schools/{crm_b['id']}/link-lms",
            json={"lms_school_id": orphan["lms_school_id"], "delete_previous": False},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("transferred_from") is not None
        assert body["transferred_from"]["id"] == crm_a["id"]
        assert body.get("deleted_previous") is False

        # Verify A no longer has the link, B does
        rr = requests.get(f"{API}/schools/inquiries", headers=admin_headers, timeout=60).json()
        a = [s for s in rr if s.get("id") == crm_a["id"]][0]
        b = [s for s in rr if s.get("id") == crm_b["id"]][0]
        assert not a.get("lms_school_id")
        assert b.get("lms_school_id") == orphan["lms_school_id"]

        # cleanup link
        requests.delete(f"{API}/schools/{crm_b['id']}/link-lms", headers=admin_headers, timeout=30)
    finally:
        _delete_crm_school(admin_headers, crm_a["id"])
        _delete_crm_school(admin_headers, crm_b["id"])


def test_link_merge_deletes_previous(admin_headers):
    r = requests.get(f"{API}/lms/all-schools", headers=admin_headers, timeout=60)
    schools = r.json()["schools"]
    if not schools:
        pytest.skip("no LMS schools available")
    orphan = next((s for s in schools if not s.get("linked_to")), schools[0])

    crm_a = _get_or_create_crm_school(admin_headers, "mergesrc")
    crm_b = _get_or_create_crm_school(admin_headers, "mergedst")
    try:
        requests.patch(
            f"{API}/schools/{crm_a['id']}/link-lms",
            json={"lms_school_id": orphan["lms_school_id"]},
            headers=admin_headers, timeout=30,
        )
        r = requests.patch(
            f"{API}/schools/{crm_b['id']}/link-lms",
            json={"lms_school_id": orphan["lms_school_id"], "delete_previous": True},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("deleted_previous") is True

        rr = requests.get(f"{API}/schools/inquiries", headers=admin_headers, timeout=60).json()
        a_still = [s for s in rr if s.get("id") == crm_a["id"]]
        assert not a_still, "crm_a should have been deleted on merge"
        b = [s for s in rr if s.get("id") == crm_b["id"]][0]
        assert b.get("lms_school_id") == orphan["lms_school_id"]

        requests.delete(f"{API}/schools/{crm_b['id']}/link-lms", headers=admin_headers, timeout=30)
    finally:
        _delete_crm_school(admin_headers, crm_a["id"])  # no-op if merged
        _delete_crm_school(admin_headers, crm_b["id"])
