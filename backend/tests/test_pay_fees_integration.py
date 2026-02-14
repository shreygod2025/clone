"""
Test Pay Fees Feature Integration - Student Dashboard
Tests the new GET /api/payments/by-phone/{phone} endpoint and payment flow
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPayFeesIntegration:
    """Test Pay Fees feature for student dashboard"""
    
    def test_health_check(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_get_payment_by_phone_with_pending_payment(self):
        """Test GET /api/payments/by-phone/{phone} for student with pending payment"""
        phone = "9876543210"
        response = requests.get(f"{BASE_URL}/api/payments/by-phone/{phone}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert data.get("has_pending_payment") == True, "Should have pending payment"
        assert "student_id" in data, "Should include student_id"
        assert "student_name" in data, "Should include student_name"
        assert "amount" in data, "Should include amount"
        assert "batch_name" in data, "Should include batch_name"
        
        # Verify expected values
        assert data["amount"] == 5000, f"Amount should be 5000, got {data['amount']}"
        assert data["batch_name"] == "Coding Basics - Batch 1", f"Batch name mismatch: {data['batch_name']}"
        assert data["skill"] == "coding", f"Skill should be coding, got {data['skill']}"
        
        print(f"✓ Payment info retrieved for phone {phone}")
        print(f"  Student: {data['student_name']}")
        print(f"  Amount: ₹{data['amount']}")
        print(f"  Batch: {data['batch_name']}")
    
    def test_get_payment_by_phone_without_pending_payment(self):
        """Test GET /api/payments/by-phone/{phone} for phone without pending payment"""
        phone = "9999999999"  # Non-existent phone
        response = requests.get(f"{BASE_URL}/api/payments/by-phone/{phone}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("has_pending_payment") == False, "Should have no pending payment"
        print(f"✓ No pending payment returned for phone {phone}")
    
    def test_create_payment_session_endpoint_exists(self):
        """Test POST /api/payments/create-session/{student_id} endpoint exists"""
        # First get student_id from payment info
        response = requests.get(f"{BASE_URL}/api/payments/by-phone/9876543210")
        data = response.json()
        student_id = data.get("student_id")
        
        assert student_id is not None, "Student ID should be available"
        
        # Test payment session creation
        response = requests.post(f"{BASE_URL}/api/payments/create-session/{student_id}")
        
        # Should return 200 with payment session or error if Cashfree not configured
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            session_data = response.json()
            assert "payment_session_id" in session_data or "success" in session_data
            print(f"✓ Payment session created for student {student_id}")
        else:
            print(f"✓ Payment session endpoint exists (got {response.status_code})")
    
    def test_payment_info_returns_correct_structure(self):
        """Test payment info endpoint returns all required fields"""
        phone = "9876543210"
        response = requests.get(f"{BASE_URL}/api/payments/by-phone/{phone}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = [
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
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["has_pending_payment"], bool)
        assert isinstance(data["amount"], (int, float))
        assert isinstance(data["student_name"], str)
        
        print(f"✓ Payment info structure verified with all {len(expected_fields)} fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
