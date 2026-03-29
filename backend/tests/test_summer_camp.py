"""
Summer Camp 2026 Backend API Tests
Tests for: register, bookings, stats, verify endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials for authenticated endpoints
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Auth failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def created_booking_id():
    """Create a test booking and return its ID for use in other tests"""
    payload = {
        "child_name": "TEST_Riya Sharma",
        "parent_name": "TEST_Anita Sharma",
        "parent_phone": "9876543210",
        "parent_email": "test_anita@example.com",
        "age_group": "creators",
        "batch_type": "weekday",
        "batch_week": "week1",
        "mode": "offline",
        "center": "mira_road",
        "payment_mode": "cash"
    }
    resp = requests.post(f"{BASE_URL}/api/summer-camp/register", json=payload)
    if resp.status_code == 200:
        return resp.json().get("booking_id")
    return None


class TestSummerCampRegister:
    """Tests for POST /api/summer-camp/register"""

    def test_register_cash_payment_success(self):
        """Register a summer camp booking with cash payment"""
        payload = {
            "child_name": "TEST_Arjun Verma",
            "parent_name": "TEST_Rahul Verma",
            "parent_phone": "9876543211",
            "parent_email": "test_rahul@example.com",
            "age_group": "explorers",
            "batch_type": "weekday",
            "batch_week": "week1",
            "mode": "offline",
            "center": "dombivli",
            "payment_mode": "cash"
        }
        resp = requests.post(f"{BASE_URL}/api/summer-camp/register", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Validate response structure
        assert "booking_id" in data, "Missing booking_id"
        assert "booking_ref" in data, "Missing booking_ref"
        assert "payment_mode" in data, "Missing payment_mode"
        assert "amount" in data, "Missing amount"
        assert data["amount"] == 1999.0, f"Expected amount 1999.0, got {data['amount']}"
        assert data["booking_ref"].startswith("SC2026-"), f"Unexpected booking_ref format: {data['booking_ref']}"
        assert data["payment_mode"] == "cash"
        print(f"PASS: Register cash booking - ref: {data['booking_ref']}, id: {data['booking_id']}")

    def test_register_innovators_online(self):
        """Register innovators age group with online mode"""
        payload = {
            "child_name": "TEST_Priya Singh",
            "parent_name": "TEST_Meera Singh",
            "parent_phone": "9876543212",
            "parent_email": "test_meera@example.com",
            "age_group": "innovators",
            "batch_type": "weekend",
            "batch_week": "week2",
            "mode": "online",
            "center": "online",
            "payment_mode": "cash"
        }
        resp = requests.post(f"{BASE_URL}/api/summer-camp/register", json=payload)
        assert resp.status_code == 200, f"Expected 200: {resp.text}"
        data = resp.json()
        assert data["payment_mode"] == "cash"
        assert "booking_id" in data
        print(f"PASS: Register innovators online - ref: {data['booking_ref']}")

    def test_register_all_batch_weeks(self):
        """Test all 4 batch weeks are valid"""
        for week in ["week1", "week2", "week3", "week4"]:
            payload = {
                "child_name": f"TEST_Child {week}",
                "parent_name": "TEST_Parent",
                "parent_phone": "9876543213",
                "parent_email": f"test_{week}@example.com",
                "age_group": "creators",
                "batch_type": "weekday",
                "batch_week": week,
                "mode": "offline",
                "center": "andheri",
                "payment_mode": "cash"
            }
            resp = requests.post(f"{BASE_URL}/api/summer-camp/register", json=payload)
            assert resp.status_code == 200, f"Week {week} failed: {resp.text}"
            data = resp.json()
            assert "batch_dates" in data, f"Missing batch_dates for {week}"
            print(f"PASS: Batch week {week} - dates: {data['batch_dates']}")

    def test_register_invalid_age_group(self):
        """Invalid age group should return 400"""
        payload = {
            "child_name": "TEST_Child",
            "parent_name": "TEST_Parent",
            "parent_phone": "9876543214",
            "parent_email": "test@example.com",
            "age_group": "invalid_group",
            "batch_type": "weekday",
            "batch_week": "week1",
            "mode": "offline",
            "center": "mira_road",
            "payment_mode": "cash"
        }
        resp = requests.post(f"{BASE_URL}/api/summer-camp/register", json=payload)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print(f"PASS: Invalid age group rejected with 400")

    def test_register_invalid_batch_type(self):
        """Invalid batch type should return 400"""
        payload = {
            "child_name": "TEST_Child",
            "parent_name": "TEST_Parent",
            "parent_phone": "9876543215",
            "parent_email": "test@example.com",
            "age_group": "explorers",
            "batch_type": "monthly",  # Invalid
            "batch_week": "week1",
            "mode": "offline",
            "center": "mira_road",
            "payment_mode": "cash"
        }
        resp = requests.post(f"{BASE_URL}/api/summer-camp/register", json=payload)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print(f"PASS: Invalid batch type rejected with 400")

    def test_register_invalid_mode(self):
        """Invalid mode should return 400"""
        payload = {
            "child_name": "TEST_Child",
            "parent_name": "TEST_Parent",
            "parent_phone": "9876543216",
            "parent_email": "test@example.com",
            "age_group": "explorers",
            "batch_type": "weekday",
            "batch_week": "week1",
            "mode": "hybrid",  # Invalid
            "center": "mira_road",
            "payment_mode": "cash"
        }
        resp = requests.post(f"{BASE_URL}/api/summer-camp/register", json=payload)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print(f"PASS: Invalid mode rejected with 400")

    def test_register_invalid_batch_week(self):
        """Invalid batch week should return 400"""
        payload = {
            "child_name": "TEST_Child",
            "parent_name": "TEST_Parent",
            "parent_phone": "9876543216",
            "parent_email": "test@example.com",
            "age_group": "explorers",
            "batch_type": "weekday",
            "batch_week": "week5",  # Invalid
            "mode": "offline",
            "center": "mira_road",
            "payment_mode": "cash"
        }
        resp = requests.post(f"{BASE_URL}/api/summer-camp/register", json=payload)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print(f"PASS: Invalid batch week rejected with 400")


class TestSummerCampBookingsAPI:
    """Tests for GET /api/summer-camp/bookings (auth required)"""

    def test_get_bookings_without_auth_fails(self):
        """Bookings endpoint should require authentication"""
        resp = requests.get(f"{BASE_URL}/api/summer-camp/bookings")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Bookings requires auth - status {resp.status_code}")

    def test_get_bookings_with_auth(self, auth_headers):
        """Admin can fetch all summer camp bookings"""
        resp = requests.get(f"{BASE_URL}/api/summer-camp/bookings", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Bookings fetched - count: {len(data)}")

        # Validate structure if any exist
        if len(data) > 0:
            b = data[0]
            expected_fields = ["booking_ref", "child_name", "parent_name", "age_group", "batch_type", "mode", "crm_status", "payment_status"]
            for field in expected_fields:
                assert field in b, f"Missing field: {field}"
            # Ensure _id not leaked
            assert "_id" not in b, "MongoDB _id should not be in response"
            print(f"PASS: Booking structure valid - first booking: {b.get('booking_ref')}")

    def test_get_bookings_filter_by_crm_status(self, auth_headers):
        """Can filter bookings by crm_status"""
        for status in ["lead", "converted"]:
            resp = requests.get(f"{BASE_URL}/api/summer-camp/bookings?crm_status={status}", headers=auth_headers)
            assert resp.status_code == 200, f"Filter by {status} failed: {resp.status_code}"
            data = resp.json()
            # All returned should have the correct status
            for b in data:
                assert b["crm_status"] == status, f"Got crm_status {b['crm_status']} but expected {status}"
            print(f"PASS: Filter by crm_status={status} - count: {len(data)}")

    def test_get_bookings_filter_by_age_group(self, auth_headers):
        """Can filter bookings by age_group"""
        for ag in ["explorers", "creators", "innovators"]:
            resp = requests.get(f"{BASE_URL}/api/summer-camp/bookings?age_group={ag}", headers=auth_headers)
            assert resp.status_code == 200, f"Filter by age_group={ag} failed"
            data = resp.json()
            for b in data:
                assert b["age_group"] == ag, f"Got age_group {b['age_group']} but expected {ag}"
            print(f"PASS: Filter by age_group={ag} - count: {len(data)}")


class TestSummerCampStats:
    """Tests for GET /api/summer-camp/stats"""

    def test_stats_without_auth_fails(self):
        """Stats endpoint should require authentication"""
        resp = requests.get(f"{BASE_URL}/api/summer-camp/stats")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Stats requires auth - status {resp.status_code}")

    def test_stats_with_auth(self, auth_headers):
        """Admin can fetch stats"""
        resp = requests.get(f"{BASE_URL}/api/summer-camp/stats", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200: {resp.text}"
        data = resp.json()
        assert "total" in data, "Missing total"
        assert "converted" in data, "Missing converted"
        assert "leads" in data, "Missing leads"
        assert isinstance(data["total"], int)
        assert isinstance(data["converted"], int)
        assert isinstance(data["leads"], int)
        assert data["total"] >= 0
        # leads + converted should be roughly = total (could have pending states)
        print(f"PASS: Stats - total: {data['total']}, leads: {data['leads']}, converted: {data['converted']}")


class TestSummerCampVerify:
    """Tests for GET /api/summer-camp/verify/{booking_id}"""

    def test_verify_nonexistent_booking(self):
        """Verifying non-existent booking should 404"""
        resp = requests.get(f"{BASE_URL}/api/summer-camp/verify/nonexistent-id-12345")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print(f"PASS: Non-existent booking returns 404")

    def test_verify_existing_booking(self, created_booking_id):
        """Verify an existing booking returns its details"""
        if not created_booking_id:
            pytest.skip("No booking_id available for verification test")
        resp = requests.get(f"{BASE_URL}/api/summer-camp/verify/{created_booking_id}")
        assert resp.status_code == 200, f"Expected 200: {resp.text}"
        data = resp.json()
        assert "status" in data, "Missing status field"
        assert "booking" in data, "Missing booking field"
        booking = data["booking"]
        assert "_id" not in booking, "MongoDB _id leaked"
        assert "booking_ref" in booking
        assert "child_name" in booking
        assert booking["child_name"] == "TEST_Riya Sharma"
        print(f"PASS: Verify booking - status: {data['status']}, ref: {booking['booking_ref']}")


class TestSummerCampDataPersistence:
    """Test that booking data persists correctly"""

    def test_register_and_verify_data_persists(self, auth_headers):
        """Register a booking and confirm it appears in admin bookings list"""
        import time
        unique_name = f"TEST_Persist_Child_{int(time.time())}"
        payload = {
            "child_name": unique_name,
            "parent_name": "TEST_Persist_Parent",
            "parent_phone": "9123456789",
            "parent_email": "persist_test@example.com",
            "age_group": "explorers",
            "batch_type": "weekend",
            "batch_week": "week3",
            "mode": "online",
            "center": "online",
            "payment_mode": "cash"
        }
        # Create
        reg_resp = requests.post(f"{BASE_URL}/api/summer-camp/register", json=payload)
        assert reg_resp.status_code == 200
        booking_id = reg_resp.json()["booking_id"]

        # Verify via GET
        verify_resp = requests.get(f"{BASE_URL}/api/summer-camp/verify/{booking_id}")
        assert verify_resp.status_code == 200
        assert verify_resp.json()["booking"]["child_name"] == unique_name

        # Confirm it's in admin list
        list_resp = requests.get(f"{BASE_URL}/api/summer-camp/bookings", headers=auth_headers)
        assert list_resp.status_code == 200
        bookings = list_resp.json()
        found = any(b["id"] == booking_id for b in bookings)
        assert found, f"Booking {booking_id} not found in admin bookings list"

        # Verify crm_status is 'lead' for cash payment
        matching = next(b for b in bookings if b["id"] == booking_id)
        assert matching["crm_status"] == "lead", f"Expected lead, got {matching['crm_status']}"
        assert matching["payment_status"] == "pending"
        print(f"PASS: Data persistence verified - ref: {matching['booking_ref']}")
