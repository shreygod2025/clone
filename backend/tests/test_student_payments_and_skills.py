"""
Test suite for Student Payments and 'Other' Skill Option features
Tests:
1. Student Payments endpoint - returns converted students
2. Educator Config endpoint - includes 'Other' in skills list
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStudentPayments:
    """Test Student Payments endpoint functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_student_payments_endpoint_returns_200(self):
        """Test that student payments endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/orders/student-payments",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Student payments endpoint returned 200 OK")
    
    def test_student_payments_returns_list(self):
        """Test that student payments endpoint returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/orders/student-payments",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Student payments returned {len(data)} records")
    
    def test_student_payments_structure(self):
        """Test that student payment records have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/orders/student-payments",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            payment = data[0]
            # Check required fields
            required_fields = ["id", "student_id", "student_name", "phone", "amount", "status"]
            for field in required_fields:
                assert field in payment, f"Missing field: {field}"
            
            # Check conversion_details structure
            assert "conversion_details" in payment, "Missing conversion_details"
            conversion_details = payment["conversion_details"]
            assert "skill" in conversion_details, "Missing skill in conversion_details"
            assert "age_group" in conversion_details, "Missing age_group in conversion_details"
            
            print(f"Student payment structure validated: {payment.get('student_name')}")
        else:
            print("No student payments found - skipping structure validation")


class TestEducatorConfig:
    """Test Educator Config endpoint for 'Other' skill option"""
    
    def test_educator_config_returns_200(self):
        """Test that educator config endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/educator-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Educator config endpoint returned 200 OK")
    
    def test_educator_config_includes_other_skill(self):
        """Test that educator config includes 'Other' in skills list"""
        response = requests.get(f"{BASE_URL}/api/educator-config")
        assert response.status_code == 200
        data = response.json()
        
        assert "skills" in data, "Missing 'skills' in educator config"
        skills = data["skills"]
        assert isinstance(skills, list), f"Expected skills to be list, got {type(skills)}"
        assert "Other" in skills, f"'Other' not found in skills list: {skills}"
        
        print(f"Educator config skills: {skills}")
        print("'Other' skill option verified in educator config")
    
    def test_educator_config_structure(self):
        """Test that educator config has correct structure"""
        response = requests.get(f"{BASE_URL}/api/educator-config")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["skills", "grades", "availability_options", "experience_options"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print("Educator config structure validated")


class TestStudentInquiryWithOtherSkill:
    """Test creating student inquiry with 'Other' skill"""
    
    def test_create_student_inquiry_with_other_skill(self):
        """Test creating a student inquiry with 'Other' skill option"""
        inquiry_data = {
            "type": "student",
            "name": "TEST_Other_Skill_Student",
            "phone": "9999888877",
            "email": "test_other_skill@test.com",
            "skill": "other",
            "other_skill": "Custom Test Skill",
            "age_group": "6-9",
            "learning_mode": "online",
            "source": "website"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inquiries",
            json=inquiry_data
        )
        
        # Should return 200 or 201
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing 'id' in response"
        
        print(f"Created student inquiry with 'Other' skill: {data.get('id')}")
        
        # Cleanup - delete the test inquiry
        inquiry_id = data.get("id")
        if inquiry_id:
            # Login to get admin token for deletion
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@oll.co",
                "password": "Dagaji03@"
            })
            if login_response.status_code == 200:
                token = login_response.json().get("access_token")
                delete_response = requests.delete(
                    f"{BASE_URL}/api/inquiries/{inquiry_id}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                print(f"Cleanup: Deleted test inquiry {inquiry_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
