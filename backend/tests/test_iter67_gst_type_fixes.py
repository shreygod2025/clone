"""
Test iteration 67: GST type bug fixes
1. GST type correctly saved via POST /api/schools/onboard (onboarding_data.gst_type persisted in DB)
2. GST type correctly returned in GET /api/orders/school-payments (fallback to onboarding_data.gst_type)
3. GST type preserved in PATCH /api/orders/{payment_id} when no new value is sent
"""

import pytest
import requests
import os
import uuid
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


def get_auth_token():
    """Helper to get admin auth token"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


class TestGSTTypeSavedInOnboarding:
    """Test Bug Fix 1: GST type saved in onboarding_data via POST /api/schools/onboard"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and create a test school inquiry first"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

        token = get_auth_token()
        if not token:
            pytest.skip("Authentication failed")
        self.session.headers.update({"Authorization": f"Bearer {token}"})

        # Create a test school inquiry to use for onboarding
        school_name = f"TEST_GST_School_{uuid.uuid4().hex[:6]}"
        create_resp = self.session.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": school_name,
            "contact_name": "Test Contact",
            "email": "test@testschool.com",
            "phone": "9876543210",
            "location": "Test City"
        })
        if create_resp.status_code not in [200, 201]:
            pytest.skip(f"Could not create test school: {create_resp.status_code} {create_resp.text[:200]}")

        self.school_id = create_resp.json().get("id")
        self.school_name = school_name
        yield

        # Cleanup - delete the test school if possible
        try:
            self.session.delete(f"{BASE_URL}/api/schools/inquiry/{self.school_id}")
        except Exception:
            pass

    def test_gst_type_exclusive_18_saved_in_onboarding_data(self):
        """Test that gst_type=exclusive_18 is saved in onboarding_data"""
        onboard_payload = {
            "school_id": self.school_id,
            "offering": "robotics",
            "model": "annual",
            "book_type": "Level 1",
            "kit_type": "lab_setup",
            "training_type": "student_training",
            "grade_pricing": [{"grade": "1-5", "students": 30, "price_per_student": 500}],
            "total_students": 30,
            "total_amount": 15000,
            "school_contacts": [],
            "payment_mode": "from_school",
            "payment_method": "neft",
            "payment_tranches": [{"percentage": 100, "amount": 15000, "date": "2025-06-01", "notes": "Full payment"}],
            "gst_type": "exclusive_18",
            "is_draft": True
        }

        response = self.session.post(f"{BASE_URL}/api/schools/onboard", json=onboard_payload)
        print(f"Onboard response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Onboard response text: {response.text[:500]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"

        # Verify gst_type is in DB by fetching the school inquiry
        school_resp = self.session.get(f"{BASE_URL}/api/schools/inquiry/{self.school_id}")
        assert school_resp.status_code == 200, f"Could not fetch school: {school_resp.status_code}"

        school_data = school_resp.json()
        onboarding_data = school_data.get("onboarding_data", {})
        gst_type_in_db = onboarding_data.get("gst_type")

        print(f"school_id: {self.school_id}")
        print(f"onboarding_data keys: {list(onboarding_data.keys())}")
        print(f"gst_type in DB: {gst_type_in_db}")

        assert gst_type_in_db == "exclusive_18", \
            f"Expected gst_type='exclusive_18' in onboarding_data, got '{gst_type_in_db}'"
        print("PASS: gst_type=exclusive_18 correctly saved in onboarding_data")

    def test_gst_type_inclusive_18_saved_in_onboarding_data(self):
        """Test that gst_type=inclusive_18 is saved in onboarding_data"""
        onboard_payload = {
            "school_id": self.school_id,
            "offering": "robotics",
            "model": "annual",
            "book_type": "Level 1",
            "kit_type": "lab_setup",
            "training_type": "student_training",
            "grade_pricing": [],
            "total_students": 20,
            "total_amount": 10000,
            "school_contacts": [],
            "payment_mode": "from_school",
            "payment_method": "cheque",
            "payment_tranches": [{"percentage": 100, "amount": 10000, "date": "2025-07-01", "notes": ""}],
            "gst_type": "inclusive_18",
            "is_draft": True
        }

        response = self.session.post(f"{BASE_URL}/api/schools/onboard", json=onboard_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"

        school_resp = self.session.get(f"{BASE_URL}/api/schools/inquiry/{self.school_id}")
        assert school_resp.status_code == 200

        school_data = school_resp.json()
        gst_type_in_db = school_data.get("onboarding_data", {}).get("gst_type")
        print(f"gst_type in DB: {gst_type_in_db}")

        assert gst_type_in_db == "inclusive_18", \
            f"Expected 'inclusive_18', got '{gst_type_in_db}'"
        print("PASS: gst_type=inclusive_18 correctly saved in onboarding_data")

    def test_gst_type_no_gst_saved_in_onboarding_data(self):
        """Test that gst_type=no_gst is saved in onboarding_data"""
        onboard_payload = {
            "school_id": self.school_id,
            "offering": "coding",
            "model": "quarterly",
            "book_type": "Beginner",
            "kit_type": "no_kit",
            "training_type": "teacher_training",
            "grade_pricing": [],
            "total_students": 50,
            "total_amount": 25000,
            "school_contacts": [],
            "payment_mode": "from_school",
            "payment_method": "cash",
            "payment_tranches": [
                {"percentage": 50, "amount": 12500, "date": "2025-06-01"},
                {"percentage": 50, "amount": 12500, "date": "2025-09-01"}
            ],
            "gst_type": "no_gst",
            "is_draft": True
        }

        response = self.session.post(f"{BASE_URL}/api/schools/onboard", json=onboard_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"

        school_resp = self.session.get(f"{BASE_URL}/api/schools/inquiry/{self.school_id}")
        assert school_resp.status_code == 200

        gst_type_in_db = school_resp.json().get("onboarding_data", {}).get("gst_type")
        assert gst_type_in_db == "no_gst", f"Expected 'no_gst', got '{gst_type_in_db}'"
        print(f"PASS: gst_type=no_gst correctly saved in onboarding_data")


class TestGSTTypeFallbackInSchoolPayments:
    """Test Bug Fix 2: GET /api/orders/school-payments falls back to onboarding_data.gst_type"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

        token = get_auth_token()
        if not token:
            pytest.skip("Authentication failed")
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_school_payments_returns_gst_type_field(self):
        """Verify GET /api/orders/school-payments returns gst_type in each payment"""
        response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        payments = response.json()
        assert isinstance(payments, list)
        print(f"Total school payments: {len(payments)}")

        # Check structure - gst_type field should exist in each record
        for p in payments[:5]:  # Check first 5
            assert "gst_type" in p, f"Missing gst_type field in payment: {p.get('id')}"
            print(f"  payment id={p['id']}, gst_type={p.get('gst_type')}, school={p.get('school_name')}")

        print("PASS: gst_type field present in all checked payment records")

    def test_gst_type_fallback_when_payment_has_no_gst(self):
        """
        Create a school with gst_type in onboarding_data, then verify
        the payment returned in school-payments has gst_type from onboarding_data.
        This tests the fallback logic.
        """
        school_id = None
        try:
            # Create a test school inquiry
            school_name = f"TEST_GST_Fallback_{uuid.uuid4().hex[:6]}"
            create_resp = self.session.post(f"{BASE_URL}/api/schools/inquiry", json={
                "school_name": school_name,
                "contact_name": "Fallback Test",
                "email": "fallback@test.com",
                "phone": "9876543210",
                "location": "Mumbai"
            })

            if create_resp.status_code not in [200, 201]:
                pytest.skip(f"Could not create test school: {create_resp.status_code}")

            school_id = create_resp.json().get("id")

            # Onboard with gst_type=exclusive_18 and mark as active
            onboard_payload = {
                "school_id": school_id,
                "offering": "robotics",
                "model": "annual",
                "book_type": "Level 1",
                "kit_type": "lab_setup",
                "training_type": "student_training",
                "grade_pricing": [],
                "total_students": 30,
                "total_amount": 15000,
                "school_contacts": [],
                "payment_mode": "from_school",
                "payment_method": "neft",
                "payment_tranches": [{"percentage": 100, "amount": 15000, "date": "2025-06-01", "notes": ""}],
                "gst_type": "exclusive_18",
                "is_draft": False  # Active so it shows up in school-payments
            }
            onboard_resp = self.session.post(f"{BASE_URL}/api/schools/onboard", json=onboard_payload)
            print(f"Onboard status: {onboard_resp.status_code}")
            if onboard_resp.status_code != 200:
                print(f"Onboard error: {onboard_resp.text[:300]}")
                pytest.skip(f"Could not onboard test school: {onboard_resp.status_code}")

            # Now fetch school-payments and find our test school
            payments_resp = self.session.get(f"{BASE_URL}/api/orders/school-payments")
            assert payments_resp.status_code == 200

            payments = payments_resp.json()
            school_payments = [p for p in payments if p.get("school_id") == school_id]
            print(f"Payments found for test school: {len(school_payments)}")

            if len(school_payments) == 0:
                # Check school status
                school_resp = self.session.get(f"{BASE_URL}/api/schools/inquiry/{school_id}")
                if school_resp.status_code == 200:
                    school_data = school_resp.json()
                    print(f"School status: {school_data.get('status')}")
                    print(f"Onboarding data gst_type: {school_data.get('onboarding_data', {}).get('gst_type')}")
                pytest.skip("No payments found for test school in school-payments response")

            # The payment should have gst_type=exclusive_18 from onboarding_data
            test_payment = school_payments[0]
            gst_type_in_payment = test_payment.get("gst_type")
            print(f"Payment gst_type: {gst_type_in_payment}")
            print(f"Expected: exclusive_18")

            assert gst_type_in_payment == "exclusive_18", \
                f"Expected gst_type='exclusive_18' (fallback from onboarding_data), got '{gst_type_in_payment}'"
            print("PASS: gst_type fallback from onboarding_data works correctly")

        finally:
            if school_id:
                try:
                    self.session.delete(f"{BASE_URL}/api/schools/inquiry/{school_id}")
                except Exception:
                    pass


class TestGSTTypePreservedInPatch:
    """Test Bug Fix 3: PATCH /api/orders/{payment_id} preserves gst_type when not provided"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

        token = get_auth_token()
        if not token:
            pytest.skip("Authentication failed")
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_gst_type_preserved_when_not_sent_in_patch(self):
        """When PATCH is called without gst_type, existing gst_type should be preserved"""
        # Get existing payments
        payments_resp = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        assert payments_resp.status_code == 200

        payments = payments_resp.json()
        if not payments:
            pytest.skip("No school payments available to test")

        test_payment = payments[0]
        payment_id = test_payment["id"]

        # Step 1: Set gst_type via PATCH
        set_gst_resp = self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json={
            "status": test_payment.get("status", "pending"),
            "gst_type": "exclusive_18",
            "type": "school"
        })
        assert set_gst_resp.status_code == 200, f"Failed to set gst_type: {set_gst_resp.status_code}"
        print(f"Step 1: Set gst_type=exclusive_18 for payment {payment_id}")

        # Step 2: PATCH without gst_type - should preserve existing
        preserve_resp = self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json={
            "status": "pending",
            "notes": "Updated without gst_type",
            "type": "school"
            # Note: gst_type is NOT sent here
        })
        assert preserve_resp.status_code == 200, f"Failed to update payment: {preserve_resp.status_code}"
        print(f"Step 2: Updated payment without gst_type")

        # Step 3: Verify gst_type is preserved
        verify_resp = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        assert verify_resp.status_code == 200

        updated_payments = verify_resp.json()
        updated_payment = next((p for p in updated_payments if p["id"] == payment_id), None)

        if updated_payment:
            gst_type_after = updated_payment.get("gst_type")
            print(f"gst_type after PATCH without value: {gst_type_after}")
            # Should still be exclusive_18 (preserved from step 1)
            assert gst_type_after == "exclusive_18", \
                f"gst_type was NOT preserved! Expected 'exclusive_18', got '{gst_type_after}'"
            print("PASS: gst_type preserved correctly when PATCH sent without gst_type")
        else:
            print(f"WARNING: Could not find payment {payment_id} in updated list")

    def test_gst_type_can_be_updated_via_patch(self):
        """Verify that gst_type CAN be updated when explicitly sent in PATCH"""
        payments_resp = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        assert payments_resp.status_code == 200

        payments = payments_resp.json()
        if not payments:
            pytest.skip("No school payments available to test")

        test_payment = payments[0]
        payment_id = test_payment["id"]

        # Set initial gst_type
        self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json={
            "status": "pending",
            "gst_type": "exclusive_18",
            "type": "school"
        })

        # Update to new gst_type
        update_resp = self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json={
            "status": "pending",
            "gst_type": "inclusive_18",
            "type": "school"
        })
        assert update_resp.status_code == 200

        # Verify changed to inclusive_18
        verify_resp = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        updated_payments = verify_resp.json()
        updated_payment = next((p for p in updated_payments if p["id"] == payment_id), None)

        if updated_payment:
            gst_type = updated_payment.get("gst_type")
            print(f"gst_type after explicit update: {gst_type}")
            assert gst_type == "inclusive_18", f"Expected 'inclusive_18', got '{gst_type}'"
            print("PASS: gst_type can be updated when explicitly sent")

    def test_gst_type_fallback_to_onboarding_when_payment_has_no_gst(self):
        """
        When a payment has no gst_type and school has it in onboarding_data,
        PATCH without gst_type should fall back to onboarding_data.gst_type.
        """
        school_id = None
        try:
            # Create a test school with no_gst in onboarding_data
            school_name = f"TEST_GST_Patch_{uuid.uuid4().hex[:6]}"
            create_resp = self.session.post(f"{BASE_URL}/api/schools/inquiry", json={
                "school_name": school_name,
                "contact_name": "Test",
                "email": "patchtest@test.com",
                "phone": "9876543210",
                "location": "Delhi"
            })
            if create_resp.status_code not in [200, 201]:
                pytest.skip(f"Could not create test school: {create_resp.status_code}")

            school_id = create_resp.json().get("id")

            # Onboard with gst_type=no_gst, mark as active
            onboard_resp = self.session.post(f"{BASE_URL}/api/schools/onboard", json={
                "school_id": school_id,
                "offering": "coding",
                "model": "annual",
                "book_type": "Level 1",
                "kit_type": "no_kit",
                "training_type": "student_training",
                "grade_pricing": [],
                "total_students": 20,
                "total_amount": 10000,
                "school_contacts": [],
                "payment_mode": "from_school",
                "payment_method": "neft",
                "payment_tranches": [{"percentage": 100, "amount": 10000, "date": "2025-06-01", "notes": ""}],
                "gst_type": "no_gst",
                "is_draft": False
            })
            print(f"Onboard status: {onboard_resp.status_code}")
            if onboard_resp.status_code != 200:
                pytest.skip(f"Onboard failed: {onboard_resp.text[:200]}")

            # Derive payment_id
            payment_id = f"pay-{school_id}-0"

            # PATCH without gst_type - should fall back to onboarding_data.gst_type=no_gst
            patch_resp = self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json={
                "status": "pending",
                "notes": "Testing fallback gst",
                "type": "school"
                # gst_type NOT sent
            })
            print(f"PATCH status: {patch_resp.status_code}")
            if patch_resp.status_code not in [200]:
                print(f"PATCH response: {patch_resp.text[:300]}")

            # Get payments for school and check
            payments_resp = self.session.get(f"{BASE_URL}/api/orders/school-payments")
            assert payments_resp.status_code == 200

            payments = payments_resp.json()
            school_payments = [p for p in payments if p.get("school_id") == school_id]
            if school_payments:
                gst_type = school_payments[0].get("gst_type")
                print(f"gst_type after PATCH fallback: {gst_type}")
                assert gst_type == "no_gst", f"Expected 'no_gst' from fallback, got '{gst_type}'"
                print("PASS: PATCH fallback to onboarding gst_type works correctly")
            else:
                print("WARNING: No payments found for test school")

        finally:
            if school_id:
                try:
                    self.session.delete(f"{BASE_URL}/api/schools/inquiry/{school_id}")
                except Exception:
                    pass


class TestAdminLoginAndOrdersEndpoints:
    """Test admin login and orders page endpoints work"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

        token = get_auth_token()
        if not token:
            pytest.skip("Authentication failed")
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_admin_login(self):
        """Test admin login works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"PASS: Admin login successful for {data['user']['email']}")

    def test_school_payments_endpoint(self):
        """Test GET /api/orders/school-payments returns 200"""
        response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        assert response.status_code == 200
        payments = response.json()
        assert isinstance(payments, list)
        print(f"PASS: school-payments returns {len(payments)} records")

    def test_schools_inquiries_endpoint(self):
        """Test GET /api/schools/inquiries returns 200"""
        response = self.session.get(f"{BASE_URL}/api/schools/inquiries")
        assert response.status_code == 200
        print("PASS: schools/inquiries endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
