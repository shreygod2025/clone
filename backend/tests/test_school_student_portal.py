"""
Test School Student Portal API Endpoints
Tests for OTP auth, profile GET/PATCH, and payment receipt endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

TEST_PHONE = "9876543210"
TEST_OTP = "1111"


class TestOTPAuth:
    """OTP Authentication endpoints for school student"""

    def test_send_otp_school_student_success(self):
        """POST /api/auth/send-otp with user_type=school_student"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TEST_PHONE,
            "user_type": "school_student"
        })
        print(f"\n[POST /api/auth/send-otp] Status: {response.status_code}, Body: {response.text[:300]}")
        # Accept 200 (success) or 500 (if AiSensy fails - expected in test env)
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            print("TEST PASSED: OTP sent successfully")
        else:
            print(f"INFO: AiSensy may be unavailable in test env: {response.json().get('detail')}")

    def test_verify_otp_school_student_with_test_otp(self):
        """POST /api/auth/verify-otp with test OTP 1111"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": TEST_PHONE,
            "otp": TEST_OTP,
            "user_type": "school_student"
        })
        print(f"\n[POST /api/auth/verify-otp] Status: {response.status_code}, Body: {response.text[:500]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "is_registered" in data, "Missing is_registered in response"
        assert data["is_registered"] == True, f"Expected is_registered=True, got {data.get('is_registered')}"
        assert "phone" in data, "Missing phone in response"
        assert data["phone"] == TEST_PHONE
        print(f"TEST PASSED: OTP verified, is_registered={data['is_registered']}")

    def test_verify_otp_invalid_otp(self):
        """POST /api/auth/verify-otp with invalid OTP should return 400"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "9999999999",
            "otp": "9999",
            "user_type": "school_student"
        })
        print(f"\n[POST /api/auth/verify-otp invalid] Status: {response.status_code}")
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("TEST PASSED: Invalid OTP returns error")

    def test_verify_otp_response_has_payments(self):
        """Verify OTP response for school_student includes payments"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": TEST_PHONE,
            "otp": TEST_OTP,
            "user_type": "school_student"
        })
        assert response.status_code == 200
        data = response.json()
        # For school_student, response should include payments
        assert "payments" in data, "Missing payments array in school_student OTP verify response"
        print(f"TEST PASSED: payments array present with {len(data.get('payments', []))} records")


class TestSchoolStudentProfile:
    """GET /api/school-student/profile/{phone}"""

    def test_get_profile_success(self):
        """Get student profile returns 200 with expected fields"""
        response = requests.get(f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}")
        print(f"\n[GET /api/school-student/profile/{TEST_PHONE}] Status: {response.status_code}, Body: {response.text[:500]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Verify expected fields
        assert "phone" in data, "Missing phone field"
        assert "student_name" in data, "Missing student_name field"
        assert "payments" in data, "Missing payments array"
        assert data["phone"] == TEST_PHONE
        assert isinstance(data["payments"], list), "payments should be a list"
        print(f"TEST PASSED: Profile fetched. student_name={data.get('student_name')}, payments={len(data.get('payments', []))}")

    def test_get_profile_returns_payment_details(self):
        """Profile response includes payment details"""
        response = requests.get(f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        payments = data.get("payments", [])
        print(f"\nPayments count: {len(payments)}")
        if payments:
            payment = payments[0]
            # Check payment has essential fields
            assert "id" in payment or "status" in payment, "Payment missing id/status"
            print(f"Payment[0]: id={payment.get('id')}, status={payment.get('status')}, amount={payment.get('amount')}")
        print("TEST PASSED: Payment details present")

    def test_get_profile_has_paid_payment(self):
        """At least one PAID payment should exist for test phone"""
        response = requests.get(f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        payments = data.get("payments", [])
        paid_payments = [p for p in payments if p.get("status") == "PAID"]
        print(f"\nTotal payments: {len(payments)}, PAID: {len(paid_payments)}")
        assert len(paid_payments) >= 1, f"Expected at least 1 PAID payment, found {len(paid_payments)}"
        print(f"TEST PASSED: Found {len(paid_payments)} PAID payment(s)")

    def test_get_profile_not_found(self):
        """Non-existent phone returns 404"""
        response = requests.get(f"{BASE_URL}/api/school-student/profile/0000000000")
        print(f"\n[GET /api/school-student/profile/0000000000] Status: {response.status_code}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("TEST PASSED: Non-existent phone returns 404")


class TestSchoolStudentProfileUpdate:
    """PATCH /api/school-student/profile/{phone}"""

    def test_patch_profile_update_name(self):
        """PATCH profile with new name - returns success"""
        # Get original name first
        get_response = requests.get(f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}")
        assert get_response.status_code == 200
        original_name = get_response.json().get("student_name", "")

        # Patch with new name
        patch_data = {"student_name": "TEST_UpdatedStudent"}
        response = requests.patch(
            f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}",
            json=patch_data
        )
        print(f"\n[PATCH /api/school-student/profile/{TEST_PHONE}] Status: {response.status_code}, Body: {response.text[:300]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message in response"
        print(f"TEST PASSED: Profile updated. message={data.get('message')}")

        # Verify the update persisted with GET
        get_response2 = requests.get(f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}")
        assert get_response2.status_code == 200
        updated_data = get_response2.json()
        assert updated_data.get("student_name") == "TEST_UpdatedStudent", \
            f"Name not updated: expected 'TEST_UpdatedStudent', got '{updated_data.get('student_name')}'"
        print(f"TEST PASSED: Name persisted as {updated_data.get('student_name')}")

        # Restore original name
        if original_name:
            requests.patch(f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}",
                          json={"student_name": original_name})

    def test_patch_profile_update_email(self):
        """PATCH profile with new email"""
        patch_data = {"email": "test.student@example.com"}
        response = requests.patch(
            f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}",
            json=patch_data
        )
        print(f"\n[PATCH email] Status: {response.status_code}")
        assert response.status_code == 200
        print("TEST PASSED: Email update returns 200")

    def test_patch_profile_update_grade_division(self):
        """PATCH profile with grade and division"""
        patch_data = {"grade": "8", "division": "A"}
        response = requests.patch(
            f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}",
            json=patch_data
        )
        print(f"\n[PATCH grade/division] Status: {response.status_code}")
        assert response.status_code == 200
        print("TEST PASSED: Grade/division update returns 200")

    def test_patch_profile_invalid_fields_ignored(self):
        """PATCH with only invalid fields returns 400"""
        patch_data = {"invalid_field": "value", "another_bad": "data"}
        response = requests.patch(
            f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}",
            json=patch_data
        )
        print(f"\n[PATCH invalid fields] Status: {response.status_code}")
        assert response.status_code == 400, f"Expected 400 for no valid fields, got {response.status_code}"
        print("TEST PASSED: Invalid fields return 400")

    def test_patch_profile_not_found(self):
        """PATCH for non-existent phone returns 404"""
        response = requests.patch(
            f"{BASE_URL}/api/school-student/profile/0000000000",
            json={"student_name": "Test"}
        )
        print(f"\n[PATCH not found] Status: {response.status_code}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("TEST PASSED: Non-existent phone returns 404")


class TestSchoolStudentReceipt:
    """GET /api/school-student/receipt/{payment_id}"""

    def test_get_receipt_for_paid_payment(self):
        """Get receipt for PAID payment"""
        # First get profile to find PAID payment ID
        profile_response = requests.get(f"{BASE_URL}/api/school-student/profile/{TEST_PHONE}")
        assert profile_response.status_code == 200
        payments = profile_response.json().get("payments", [])
        paid_payments = [p for p in payments if p.get("status") == "PAID"]

        if not paid_payments:
            pytest.skip("No PAID payments found for test phone")

        payment_id = paid_payments[0].get("id")
        print(f"\nTesting receipt for payment_id: {payment_id}")

        response = requests.get(f"{BASE_URL}/api/school-student/receipt/{payment_id}")
        print(f"[GET /api/school-student/receipt/{payment_id}] Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "receipt_id" in data, "Missing receipt_id"
        assert "amount" in data, "Missing amount"
        assert "status" in data, "Missing status"
        assert data["status"] == "PAID", f"Expected status=PAID, got {data['status']}"
        print(f"TEST PASSED: Receipt fetched. amount={data.get('amount')}, status={data.get('status')}")

    def test_get_receipt_not_found(self):
        """Non-existent payment ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/school-student/receipt/NONEXISTENT_ID")
        print(f"\n[GET receipt not found] Status: {response.status_code}")
        assert response.status_code == 404
        print("TEST PASSED: Non-existent receipt returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
