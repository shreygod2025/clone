"""Backend regression tests for Admin Custom Invoices (iteration 87).

Verifies list/create/get-pdf/delete endpoints under /api/admin/custom-invoices.
"""
import base64
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@oll.co")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Dagaji03@")


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok, f"no access_token in response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def test_list_custom_invoices(headers):
    r = requests.get(f"{BASE_URL}/api/admin/custom-invoices?limit=5", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "count" in data and "rows" in data
    assert isinstance(data["rows"], list)


def test_list_requires_auth():
    r = requests.get(f"{BASE_URL}/api/admin/custom-invoices?limit=5", timeout=30)
    # Should be 401/403 without token (this is what caused the original bug)
    assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"


def test_create_get_pdf_and_delete(headers):
    # Minimal valid PDF-ish base64 payload — server likely just stores/returns
    fake_pdf_b64 = base64.b64encode(b"%PDF-1.4\n%TEST\n").decode()
    payload = {
        "customer_name": "TEST_Playwright Regression Customer",
        "address": "Test Address",
        "gstin": "",
        "state": "Maharashtra",
        "gst_type": "exclusive_18",
        "notes": "iter87 backend regression",
        "place_of_supply": "Maharashtra",
        "ship_to_name": "TEST_Playwright Regression Customer",
        "ship_to_address": "Test Address",
        "ship_to_state": "Maharashtra",
        "line_items": [{"desc": "Test Item", "qty": 1, "rate": 1000}],
        "total_amount": 1180,
        "pdf_base64": fake_pdf_b64,
    }
    r = requests.post(f"{BASE_URL}/api/admin/custom-invoices", headers=headers, json=payload, timeout=45)
    assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
    created = r.json()
    inv_id = created.get("id")
    assert inv_id, f"no id in response: {created}"
    assert created.get("invoice_no"), f"no invoice_no: {created}"

    # GET PDF
    r2 = requests.get(f"{BASE_URL}/api/admin/custom-invoices/{inv_id}/pdf", headers=headers, timeout=30)
    assert r2.status_code == 200, f"pdf fetch failed: {r2.status_code}"
    ctype = r2.headers.get("content-type", "")
    assert "pdf" in ctype.lower(), f"unexpected content-type: {ctype}"

    # DELETE (cleanup)
    r3 = requests.delete(f"{BASE_URL}/api/admin/custom-invoices/{inv_id}", headers=headers, timeout=30)
    assert r3.status_code in (200, 204), f"delete failed: {r3.status_code} {r3.text}"
