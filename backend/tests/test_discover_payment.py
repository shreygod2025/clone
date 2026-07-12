"""Tests for /api/discover payment SDK fix (Cashfree v3 checkout)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def booking_id():
    payload = {
        "student_name": "QA Discover",
        "parent_phone": "9876543210",
        "plan": "annual",
    }
    r = requests.post(f"{API}/discover/create-booking", json=payload, timeout=30)
    assert r.status_code == 200, f"create-booking failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("booking_id")
    assert data.get("amount") == 30000.0
    assert data.get("plan") == "annual"
    return data["booking_id"]


def test_create_booking_monthly():
    r = requests.post(f"{API}/discover/create-booking", json={
        "student_name": "QA Monthly",
        "parent_phone": "9876543211",
        "plan": "monthly",
    }, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["amount"] == 3000.0
    assert d["plan"] == "monthly"
    assert "booking_id" in d


def test_initiate_payment_response_shape(booking_id):
    r = requests.post(f"{API}/discover/initiate-payment", json={
        "booking_id": booking_id,
        "frontend_url": "https://camp-lead-capture.preview.emergentagent.com",
    }, timeout=30)
    assert r.status_code == 200, f"initiate-payment failed: {r.status_code} {r.text}"
    d = r.json()
    # Required fields per spec
    assert d.get("success") is True
    assert isinstance(d.get("payment_session_id"), str) and len(d["payment_session_id"]) > 0
    assert isinstance(d.get("order_id"), str) and d["order_id"].startswith("DISC-")
    assert d.get("environment") in ("production", "sandbox")
    # Must NOT contain legacy payment_link with /forms/
    assert "payment_link" not in d, f"payment_link should be removed, got: {d.get('payment_link')}"


def test_initiate_payment_invalid_booking():
    r = requests.post(f"{API}/discover/initiate-payment", json={
        "booking_id": "does-not-exist-uuid",
    }, timeout=30)
    assert r.status_code == 404


def test_create_booking_invalid_phone():
    r = requests.post(f"{API}/discover/create-booking", json={
        "student_name": "QA Bad",
        "parent_phone": "123",
        "plan": "annual",
    }, timeout=30)
    assert r.status_code in (400, 422)
