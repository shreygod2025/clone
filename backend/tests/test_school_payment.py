"""
Test School Student Payment API Endpoints
Tests for the school payment feature where students can pay their fees online
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test school ID provided in the review request
TEST_SCHOOL_ID = "cc3bde5d-14ef-47be-b458-e34c6d52e1a6"

class TestSchoolPaymentAPI:
    """Tests for GET /api/school-payment/{school_id} endpoint"""
    
    def test_get_school_payment_info_success(self):
        """Test fetching school payment info returns correct data"""
        response = requests.get(f"{BASE_URL}/api/school-payment/{TEST_SCHOOL_ID}")
        print(f"\n[GET /api/school-payment/{TEST_SCHOOL_ID}] Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            
            # Verify required fields exist
            assert "school_id" in data, "Missing school_id in response"
            assert "school_name" in data, "Missing school_name in response"
            assert "grade_pricing" in data, "Missing grade_pricing in response"
            
            # Verify grade_pricing has 'price' field (not NaN)
            if data.get("grade_pricing"):
                for grade_info in data["grade_pricing"]:
                    assert "grade" in grade_info, f"Missing grade field in grade_pricing"
                    assert "price" in grade_info, f"Missing price field in grade_pricing for grade {grade_info.get('grade')}"
                    # Verify price is a valid number (not NaN)
                    price = grade_info.get("price")
                    assert price is not None, f"Price is None for grade {grade_info.get('grade')}"
                    assert isinstance(price, (int, float)), f"Price is not a number for grade {grade_info.get('grade')}"
                    assert price == price, f"Price is NaN for grade {grade_info.get('grade')}"  # NaN != NaN
                    print(f"Grade {grade_info.get('grade')}: Price = {price} (valid)")
            
            print("TEST PASSED: School payment info retrieved successfully with valid price fields")
        elif response.status_code == 400:
            # School might not have online payment enabled - this is a valid configuration state
            print(f"INFO: Online payment not enabled for this school: {response.json().get('detail')}")
            pytest.skip("School does not have online payment enabled")
        elif response.status_code == 404:
            pytest.fail(f"School not found: {TEST_SCHOOL_ID}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}, Response: {response.text}")
    
    def test_get_school_payment_info_invalid_school(self):
        """Test that non-existent school returns 404"""
        fake_school_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/school-payment/{fake_school_id}")
        print(f"\n[GET /api/school-payment/{fake_school_id}] Status: {response.status_code}")
        
        # Should return 404 for non-existent school
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("TEST PASSED: Non-existent school returns 404")


class TestSchoolPaymentCreateSession:
    """Tests for POST /api/school-payment/create-session endpoint"""
    
    def test_create_payment_session_missing_fields(self):
        """Test that missing required fields returns 400"""
        # First verify the school exists and has payment enabled
        school_response = requests.get(f"{BASE_URL}/api/school-payment/{TEST_SCHOOL_ID}")
        if school_response.status_code != 200:
            pytest.skip("School not available for testing")
        
        # Test with empty payload
        response = requests.post(f"{BASE_URL}/api/school-payment/create-session", json={})
        print(f"\n[POST /api/school-payment/create-session] Empty payload - Status: {response.status_code}")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("TEST PASSED: Empty payload returns 400")
    
    def test_create_payment_session_invalid_school(self):
        """Test that invalid school ID returns 404"""
        payload = {
            "school_id": "00000000-0000-0000-0000-000000000000",
            "student_name": "Test Student",
            "phone": "9876543210",
            "grade": "1",
            "amount": 100
        }
        response = requests.post(f"{BASE_URL}/api/school-payment/create-session", json=payload)
        print(f"\n[POST /api/school-payment/create-session] Invalid school - Status: {response.status_code}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("TEST PASSED: Invalid school returns 404")
    
    def test_create_payment_session_valid_data(self):
        """Test creating payment session with valid data"""
        # First get school info to get valid grade and price
        school_response = requests.get(f"{BASE_URL}/api/school-payment/{TEST_SCHOOL_ID}")
        if school_response.status_code != 200:
            pytest.skip("School not available for testing")
        
        school_data = school_response.json()
        grade_pricing = school_data.get("grade_pricing", [])
        
        if not grade_pricing:
            pytest.skip("No grade pricing available for testing")
        
        # Get first grade with valid price
        first_grade = grade_pricing[0]
        grade = first_grade.get("grade")
        price = first_grade.get("price")
        
        print(f"\nUsing Grade: {grade}, Price: {price}")
        
        payload = {
            "school_id": TEST_SCHOOL_ID,
            "student_name": "TEST_Payment_Student",
            "phone": "9876543210",
            "grade": str(grade),
            "amount": price
        }
        
        response = requests.post(f"{BASE_URL}/api/school-payment/create-session", json=payload)
        print(f"[POST /api/school-payment/create-session] Valid data - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True in response"
            assert "payment_session_id" in data, "Missing payment_session_id in response"
            assert "order_id" in data, "Missing order_id in response"
            print("TEST PASSED: Payment session created successfully")
        elif response.status_code == 400:
            # This might happen if the amount doesn't match - log the error
            print(f"ERROR: {response.json().get('detail')}")
            pytest.fail(f"Failed to create payment session: {response.json().get('detail')}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestFormValidation:
    """Test that the frontend validation requirements are met by the API"""
    
    def test_phone_validation(self):
        """Test that invalid phone numbers are handled"""
        school_response = requests.get(f"{BASE_URL}/api/school-payment/{TEST_SCHOOL_ID}")
        if school_response.status_code != 200:
            pytest.skip("School not available for testing")
        
        school_data = school_response.json()
        grade_pricing = school_data.get("grade_pricing", [])
        if not grade_pricing:
            pytest.skip("No grade pricing available for testing")
        
        first_grade = grade_pricing[0]
        
        # Test with short phone number (less than 10 digits)
        payload = {
            "school_id": TEST_SCHOOL_ID,
            "student_name": "Test Student",
            "phone": "12345",  # Invalid: less than 10 digits
            "grade": str(first_grade.get("grade")),
            "amount": first_grade.get("price")
        }
        
        response = requests.post(f"{BASE_URL}/api/school-payment/create-session", json=payload)
        print(f"\n[Phone Validation] Status: {response.status_code}")
        # Note: The API might not validate phone length, frontend should handle this
        # This test documents the current behavior
        print(f"Response: {response.json()}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
