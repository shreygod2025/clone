"""
Test Individual Student Payment Flow - Cashfree Integration
Tests the payment flow for individual students:
1. GET /api/payments/by-phone/{phone} - Get pending payment info
2. POST /api/payments/create-session/{student_id} - Create Cashfree payment session
3. GET /api/payments/verify/{order_id} - Verify payment status from Cashfree
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test student data (from review request)
TEST_STUDENT_PHONE = "9699188188"
TEST_STUDENT_ID = "c3559dd1-acd3-4246-804a-9f307c378bca"
TEST_ORDER_ID = "OLL-STU-c3559dd1-1771150759"


class TestHealthAndConfig:
    """Test API health and configuration"""
    
    def test_health_check(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data}")


class TestPaymentByPhoneEndpoint:
    """Test GET /api/payments/by-phone/{phone} endpoint"""
    
    def test_get_payment_info_for_test_student(self):
        """Test retrieving payment info for test student (phone: 9699188188)"""
        response = requests.get(f"{BASE_URL}/api/payments/by-phone/{TEST_STUDENT_PHONE}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify has pending payment
        assert data.get("has_pending_payment") == True, f"Should have pending payment, got: {data}"
        
        # Verify student details
        assert data.get("student_id") == TEST_STUDENT_ID, f"Student ID mismatch: {data.get('student_id')}"
        assert data.get("student_name") == "Shrey", f"Student name mismatch: {data.get('student_name')}"
        assert data.get("student_phone") == TEST_STUDENT_PHONE
        
        # Verify payment details
        assert data.get("amount") == 1, f"Amount should be 1, got: {data.get('amount')}"
        assert data.get("batch_name") == "ssj", f"Batch name mismatch: {data.get('batch_name')}"
        assert data.get("skill") == "robotics", f"Skill mismatch: {data.get('skill')}"
        
        print(f"✓ Payment info correct for student {data['student_name']}")
        print(f"  Amount: ₹{data['amount']}")
        print(f"  Batch: {data['batch_name']}")
        print(f"  Status: {data.get('status')}")
    
    def test_payment_info_returns_all_required_fields(self):
        """Test that all required fields are present in response"""
        response = requests.get(f"{BASE_URL}/api/payments/by-phone/{TEST_STUDENT_PHONE}")
        
        assert response.status_code == 200
        data = response.json()
        
        # All required fields for frontend display
        required_fields = [
            "has_pending_payment",
            "student_id",
            "student_name",
            "student_phone",
            "student_email",
            "skill",
            "amount",
            "batch_name",
            "batch_id",
            "order_id",
            "status"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ All {len(required_fields)} required fields present in response")
    
    def test_nonexistent_phone_returns_no_pending_payment(self):
        """Test that non-existent phone number returns no pending payment"""
        response = requests.get(f"{BASE_URL}/api/payments/by-phone/0000000000")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("has_pending_payment") == False
        print("✓ Non-existent phone correctly returns has_pending_payment=False")


class TestCreateSessionEndpoint:
    """Test POST /api/payments/create-session/{student_id} endpoint"""
    
    def test_create_payment_session_success(self):
        """Test creating a new Cashfree payment session"""
        response = requests.post(f"{BASE_URL}/api/payments/create-session/{TEST_STUDENT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify success response
        assert data.get("success") == True, f"Should be successful: {data}"
        assert "order_id" in data, "Missing order_id in response"
        assert "payment_session_id" in data, "Missing payment_session_id in response"
        assert "amount" in data, "Missing amount in response"
        
        # Verify order_id format
        order_id = data.get("order_id")
        assert order_id.startswith("OLL-STU-"), f"Order ID should start with OLL-STU-: {order_id}"
        
        # Verify environment
        assert data.get("environment") == "production", f"Should be production environment: {data.get('environment')}"
        
        print(f"✓ Payment session created successfully")
        print(f"  Order ID: {order_id}")
        print(f"  Amount: ₹{data['amount']}")
        print(f"  Environment: {data['environment']}")
    
    def test_create_session_for_nonexistent_student(self):
        """Test creating session for non-existent student returns 404"""
        response = requests.post(f"{BASE_URL}/api/payments/create-session/nonexistent-student-id")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent student correctly returns 404")


class TestVerifyPaymentEndpoint:
    """Test GET /api/payments/verify/{order_id} endpoint"""
    
    def test_verify_existing_order(self):
        """Test verifying an existing order returns correct status"""
        # Use the test order_id directly instead of creating a new one
        # This avoids rate limiting issues
        order_id = TEST_ORDER_ID
        
        # Verify the order
        response = requests.get(f"{BASE_URL}/api/payments/verify/{order_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "order_id" in data, "Missing order_id in response"
        assert "status" in data, "Missing status in response"
        assert "amount" in data, "Missing amount in response"
        assert "student_name" in data, "Missing student_name in response"
        
        # Status should be ACTIVE (order created but not paid)
        assert data.get("status") == "ACTIVE", f"Expected ACTIVE status, got: {data.get('status')}"
        assert data.get("order_id") == order_id
        
        print(f"✓ Order verification successful")
        print(f"  Order ID: {order_id}")
        print(f"  Status: {data['status']}")
        print(f"  Amount: ₹{data['amount']}")
    
    def test_verify_previously_created_order(self):
        """Test verifying the test order from review request"""
        response = requests.get(f"{BASE_URL}/api/payments/verify/{TEST_ORDER_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # For unpaid orders, status should be ACTIVE
        assert data.get("status") in ["ACTIVE", "PAID", "PENDING"], f"Unexpected status: {data.get('status')}"
        
        print(f"✓ Test order verification: {data.get('status')}")
    
    def test_verify_nonexistent_order(self):
        """Test verifying non-existent order returns 404"""
        response = requests.get(f"{BASE_URL}/api/payments/verify/NONEXISTENT-ORDER-ID")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent order correctly returns 404")


class TestEndToEndPaymentFlow:
    """Test complete payment flow from fetching info to creating session"""
    
    def test_complete_payment_flow(self):
        """Test the complete flow: fetch info -> create session -> verify"""
        # Step 1: Fetch payment info by phone
        print("\n--- Step 1: Fetch payment info ---")
        info_response = requests.get(f"{BASE_URL}/api/payments/by-phone/{TEST_STUDENT_PHONE}")
        assert info_response.status_code == 200
        payment_info = info_response.json()
        
        assert payment_info.get("has_pending_payment") == True
        student_id = payment_info.get("student_id")
        assert student_id is not None
        print(f"✓ Got payment info for {payment_info['student_name']}")
        
        # Step 2: Create payment session
        print("\n--- Step 2: Create payment session ---")
        session_response = requests.post(f"{BASE_URL}/api/payments/create-session/{student_id}")
        assert session_response.status_code == 200
        session_data = session_response.json()
        
        assert session_data.get("success") == True
        order_id = session_data.get("order_id")
        payment_session_id = session_data.get("payment_session_id")
        assert order_id is not None
        assert payment_session_id is not None
        print(f"✓ Created session: {order_id}")
        
        # Step 3: Verify payment status
        print("\n--- Step 3: Verify payment status ---")
        time.sleep(1)
        verify_response = requests.get(f"{BASE_URL}/api/payments/verify/{order_id}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data.get("status") == "ACTIVE"  # Not paid yet
        assert verify_data.get("order_id") == order_id
        print(f"✓ Verified order status: {verify_data['status']}")
        
        print("\n✓✓✓ Complete payment flow test PASSED ✓✓✓")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
