"""
Test Cashfree Payment Gateway Integration
Tests for student payment endpoints:
- GET /api/payments/student/{student_id} - Get student payment info
- POST /api/payments/create-session/{student_id} - Create Cashfree payment session
- PATCH /api/students/inquiry/{inquiry_id} - Update pending_payment field
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get API base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test student ID from the problem statement
TEST_STUDENT_ID = "c3559dd1-acd3-4246-804a-9f307c378bca"

# Admin credentials for authenticated requests
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestPaymentInfoEndpoint:
    """Tests for GET /api/payments/student/{student_id}"""
    
    def test_get_student_payment_info_with_test_student(self, api_client):
        """Test getting payment info for the test student with pending payment"""
        response = api_client.get(f"{BASE_URL}/api/payments/student/{TEST_STUDENT_ID}")
        
        # Check status code
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate response structure
        assert "has_pending_payment" in data, "Missing has_pending_payment field"
        assert "student_name" in data, "Missing student_name field"
        
        # If has pending payment, validate payment details
        if data.get("has_pending_payment"):
            assert "student_id" in data, "Missing student_id field"
            assert "student_phone" in data, "Missing student_phone field"
            assert "amount" in data, "Missing amount field"
            assert "batch_name" in data, "Missing batch_name field"
            
            # Verify amount is a positive number
            assert data["amount"] > 0, f"Amount should be positive, got {data['amount']}"
            
            # Verify batch_name is not empty
            assert data["batch_name"], "batch_name should not be empty"
            
            print(f"✓ Student payment info retrieved successfully")
            print(f"  - Student: {data['student_name']}")
            print(f"  - Phone: {data['student_phone']}")
            print(f"  - Amount: ₹{data['amount']}")
            print(f"  - Batch: {data['batch_name']}")
        else:
            print(f"✓ Student {data['student_name']} has no pending payment")
    
    def test_get_payment_info_for_nonexistent_student(self, api_client):
        """Test getting payment info for non-existent student returns 404"""
        fake_id = f"nonexistent-{uuid.uuid4()}"
        response = api_client.get(f"{BASE_URL}/api/payments/student/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returns 404 for non-existent student")


class TestCreatePaymentSessionEndpoint:
    """Tests for POST /api/payments/create-session/{student_id}"""
    
    def test_create_payment_session_with_test_student(self, api_client):
        """Test creating a Cashfree payment session for the test student"""
        # First check if student has pending payment
        info_response = api_client.get(f"{BASE_URL}/api/payments/student/{TEST_STUDENT_ID}")
        info_data = info_response.json()
        
        if not info_data.get("has_pending_payment"):
            pytest.skip("Test student has no pending payment - cannot test session creation")
        
        response = api_client.post(f"{BASE_URL}/api/payments/create-session/{TEST_STUDENT_ID}")
        
        # Check status code
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate response structure
        assert "success" in data, "Missing success field"
        assert data["success"] == True, "success should be True"
        assert "order_id" in data, "Missing order_id field"
        assert "payment_session_id" in data, "Missing payment_session_id field"
        assert "amount" in data, "Missing amount field"
        assert "environment" in data, "Missing environment field"
        
        # Validate order_id format (should start with OLL-STU-)
        assert data["order_id"].startswith("OLL-STU-"), f"Invalid order_id format: {data['order_id']}"
        
        # Validate payment_session_id is not empty
        assert data["payment_session_id"], "payment_session_id should not be empty"
        
        # Validate amount matches expected amount
        assert data["amount"] == info_data["amount"], f"Amount mismatch: {data['amount']} vs {info_data['amount']}"
        
        print(f"✓ Payment session created successfully")
        print(f"  - Order ID: {data['order_id']}")
        print(f"  - Session ID: {data['payment_session_id'][:20]}...")
        print(f"  - Amount: ₹{data['amount']}")
        print(f"  - Environment: {data['environment']}")
    
    def test_create_session_for_nonexistent_student(self, api_client):
        """Test creating session for non-existent student returns 404"""
        fake_id = f"nonexistent-{uuid.uuid4()}"
        response = api_client.post(f"{BASE_URL}/api/payments/create-session/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returns 404 for non-existent student")


class TestPendingPaymentUpdate:
    """Tests for PATCH /api/students/inquiry/{inquiry_id} with pending_payment field"""
    
    def test_update_student_with_pending_payment(self, authenticated_client):
        """Test updating a student record with pending_payment field"""
        # First create a test student
        test_id = f"TEST-payment-{uuid.uuid4()}"
        create_response = authenticated_client.post(f"{BASE_URL}/api/students/inquiry", json={
            "name": "Test Payment Student",
            "email": f"test-{test_id[:8]}@test.com",
            "phone": "9876543210",
            "skill": "Robotics",
            "learning_mode": "online",
            "city": "Mumbai",
            "learner_type": "self"
        })
        
        assert create_response.status_code in [200, 201], f"Failed to create test student: {create_response.text}"
        student_data = create_response.json()
        student_id = student_data.get("id")
        
        # Update with pending_payment
        update_response = authenticated_client.patch(f"{BASE_URL}/api/students/inquiry/{student_id}", json={
            "status": "demo_completed",
            "pending_payment": {
                "amount": 5000,
                "batch_id": "test-batch-123",
                "batch_name": "Test Robotics Batch",
                "status": "AWAITING_PAYMENT",
                "created_at": datetime.utcnow().isoformat()
            }
        })
        
        assert update_response.status_code == 200, f"Failed to update student: {update_response.text}"
        
        # Verify the update via payment info endpoint
        payment_info = authenticated_client.get(f"{BASE_URL}/api/payments/student/{student_id}")
        assert payment_info.status_code == 200
        
        info_data = payment_info.json()
        assert info_data.get("has_pending_payment") == True, "pending_payment should be set"
        assert info_data.get("amount") == 5000, "Amount should be 5000"
        assert info_data.get("batch_name") == "Test Robotics Batch", "Batch name should match"
        
        print(f"✓ Successfully updated student with pending_payment")
        print(f"  - Student ID: {student_id}")
        print(f"  - Amount: ₹{info_data['amount']}")
        print(f"  - Batch: {info_data['batch_name']}")
        
        # Clean up - archive the test student
        authenticated_client.patch(f"{BASE_URL}/api/students/inquiry/{student_id}", json={
            "status": "archived",
            "notes": "TEST_ cleanup"
        })


class TestApiHealthAndStructure:
    """Basic API health and structure tests"""
    
    def test_api_health(self, api_client):
        """Test that the API is accessible"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ API health check passed")
    
    def test_admin_login(self, api_client):
        """Test admin login works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        print("✓ Admin login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
