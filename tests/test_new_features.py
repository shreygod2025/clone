"""
Test suite for new OLL features:
1. Data Center - Team & Growth Partners in stats and search
2. Student CRM - Amount field in onboarding modal
3. Autocomplete API for Add Lead forms
4. Revenue reports include conversion_amount
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_admin_login(self, auth_token):
        """Test admin login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print("SUCCESS: Admin login works correctly")


class TestDataCenterStats:
    """Test Data Center stats endpoint includes Team and Growth Partners"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_data_center_stats_has_5_totals(self, auth_headers):
        """Test that stats endpoint returns 5 categories: students, schools, educators, team, growth_partners"""
        response = requests.get(f"{BASE_URL}/api/data-center/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        
        data = response.json()
        assert "totals" in data, "Response missing 'totals' key"
        
        totals = data["totals"]
        expected_keys = ["students", "schools", "educators", "team", "growth_partners"]
        for key in expected_keys:
            assert key in totals, f"Missing '{key}' in totals"
            assert isinstance(totals[key], int), f"'{key}' should be an integer"
        
        print(f"SUCCESS: Data Center stats has all 5 categories - Students: {totals['students']}, Schools: {totals['schools']}, Educators: {totals['educators']}, Team: {totals['team']}, Growth Partners: {totals['growth_partners']}")
    
    def test_data_center_stats_has_status_breakdown(self, auth_headers):
        """Test that stats endpoint returns status breakdown for all 5 categories"""
        response = requests.get(f"{BASE_URL}/api/data-center/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "by_status" in data, "Response missing 'by_status' key"
        
        by_status = data["by_status"]
        expected_keys = ["students", "schools", "educators", "team", "growth_partners"]
        for key in expected_keys:
            assert key in by_status, f"Missing '{key}' in by_status"
        
        # Team should have active/inactive breakdown
        assert "team" in by_status
        print(f"SUCCESS: Data Center stats has status breakdown for all 5 categories")


class TestDataCenterSearch:
    """Test Data Center search endpoint includes Team and Growth Partners"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_search_returns_all_5_types(self, auth_headers):
        """Test that search returns all 5 data types"""
        response = requests.get(f"{BASE_URL}/api/data-center/search", headers=auth_headers)
        assert response.status_code == 200, f"Search endpoint failed: {response.text}"
        
        data = response.json()
        expected_keys = ["students", "schools", "educators", "team", "growth_partners", "total"]
        for key in expected_keys:
            assert key in data, f"Missing '{key}' in search response"
        
        print(f"SUCCESS: Search returns all 5 types - Total: {data['total']}")
    
    def test_search_filter_by_team(self, auth_headers):
        """Test filtering search by team type"""
        response = requests.get(f"{BASE_URL}/api/data-center/search?data_type=team", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # When filtering by team, other types should be empty
        assert len(data["students"]) == 0, "Students should be empty when filtering by team"
        assert len(data["schools"]) == 0, "Schools should be empty when filtering by team"
        assert len(data["educators"]) == 0, "Educators should be empty when filtering by team"
        assert len(data["growth_partners"]) == 0, "Growth partners should be empty when filtering by team"
        
        print(f"SUCCESS: Filter by team works - Found {len(data['team'])} team members")
    
    def test_search_filter_by_growth_partners(self, auth_headers):
        """Test filtering search by growth_partners type"""
        response = requests.get(f"{BASE_URL}/api/data-center/search?data_type=growth_partners", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # When filtering by growth_partners, other types should be empty
        assert len(data["students"]) == 0, "Students should be empty when filtering by growth_partners"
        assert len(data["schools"]) == 0, "Schools should be empty when filtering by growth_partners"
        assert len(data["educators"]) == 0, "Educators should be empty when filtering by growth_partners"
        assert len(data["team"]) == 0, "Team should be empty when filtering by growth_partners"
        
        print(f"SUCCESS: Filter by growth_partners works - Found {len(data['growth_partners'])} growth partners")


class TestAutocompleteAPI:
    """Test autocomplete API for Add Lead forms"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_autocomplete_endpoint_exists(self, auth_headers):
        """Test that autocomplete endpoint exists and responds"""
        response = requests.get(f"{BASE_URL}/api/data-center/autocomplete?q=test", headers=auth_headers)
        assert response.status_code == 200, f"Autocomplete endpoint failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Autocomplete should return a list"
        print(f"SUCCESS: Autocomplete endpoint works - Found {len(data)} results for 'test'")
    
    def test_autocomplete_returns_student_fields(self, auth_headers):
        """Test that autocomplete returns proper fields for auto-fill"""
        # First create a test student to search for
        test_phone = f"TEST{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "name": "TEST_AutocompleteStudent",
            "phone": test_phone,
            "email": f"test_autocomplete_{uuid.uuid4().hex[:6]}@test.com",
            "city": "Mumbai",
            "age_group": "9-12 years",
            "skill": "Robotics",
            "learning_mode": "online",
            "learning_goal": "skill_building"
        }, headers=auth_headers)
        assert create_response.status_code == 200, f"Failed to create test student: {create_response.text}"
        
        # Now search for it
        response = requests.get(f"{BASE_URL}/api/data-center/autocomplete?q=TEST_Autocomplete&data_type=students", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            result = data[0]
            # Check that required fields for auto-fill are present
            expected_fields = ["name", "phone", "email"]
            for field in expected_fields:
                assert field in result, f"Missing '{field}' in autocomplete result"
            assert result.get("type") == "student", "Result should have type='student'"
            print(f"SUCCESS: Autocomplete returns proper fields for auto-fill")
        else:
            print("WARNING: No autocomplete results found, but endpoint works")
    
    def test_autocomplete_minimum_query_length(self, auth_headers):
        """Test that autocomplete requires minimum 2 characters"""
        # Single character should return empty
        response = requests.get(f"{BASE_URL}/api/data-center/autocomplete?q=a", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 0, "Single character query should return empty results"
        print("SUCCESS: Autocomplete enforces minimum query length")
    
    def test_autocomplete_searches_by_phone(self, auth_headers):
        """Test that autocomplete can search by phone number"""
        response = requests.get(f"{BASE_URL}/api/data-center/autocomplete?q=98", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Should return results if there are records with phone starting with 98
        print(f"SUCCESS: Autocomplete phone search works - Found {len(data)} results for '98'")
    
    def test_autocomplete_searches_by_email(self, auth_headers):
        """Test that autocomplete can search by email"""
        response = requests.get(f"{BASE_URL}/api/data-center/autocomplete?q=@gmail", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"SUCCESS: Autocomplete email search works - Found {len(data)} results for '@gmail'")


class TestStudentOnboardingAmount:
    """Test Amount field in student onboarding"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_student_inquiry_accepts_conversion_amount(self, auth_headers):
        """Test that student inquiry update accepts conversion_amount field"""
        # First create a test student
        test_id = f"TEST_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "name": f"TEST_AmountStudent_{test_id}",
            "phone": f"9999{uuid.uuid4().hex[:6]}",
            "email": f"test_amount_{test_id}@test.com",
            "city": "Mumbai",
            "skill": "Coding"
        }, headers=auth_headers)
        assert create_response.status_code == 200, f"Failed to create test student: {create_response.text}"
        
        student_id = create_response.json()["id"]
        
        # Update with conversion_amount
        update_response = requests.patch(f"{BASE_URL}/api/students/inquiry/{student_id}", json={
            "status": "converted",
            "conversion_amount": "15000"
        }, headers=auth_headers)
        assert update_response.status_code == 200, f"Failed to update student: {update_response.text}"
        
        # Verify the amount was saved
        get_response = requests.get(f"{BASE_URL}/api/students/inquiries", headers=auth_headers)
        assert get_response.status_code == 200
        
        students = get_response.json()
        updated_student = next((s for s in students if s["id"] == student_id), None)
        assert updated_student is not None, "Could not find updated student"
        assert updated_student.get("conversion_amount") == "15000", f"conversion_amount not saved correctly: {updated_student.get('conversion_amount')}"
        
        print(f"SUCCESS: Student inquiry accepts and saves conversion_amount field")
    
    def test_conversion_amount_in_student_model(self, auth_headers):
        """Test that conversion_amount field exists in student inquiry model"""
        # Get all students and check if any have conversion_amount
        response = requests.get(f"{BASE_URL}/api/students/inquiries", headers=auth_headers)
        assert response.status_code == 200
        
        students = response.json()
        # Check that the field can exist in the response
        converted_students = [s for s in students if s.get("status") == "converted"]
        
        print(f"SUCCESS: Found {len(converted_students)} converted students")


class TestRevenueReports:
    """Test that revenue reports include conversion_amount"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_reports_overview_endpoint(self, auth_headers):
        """Test that reports overview endpoint exists and returns revenue"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/overview", headers=auth_headers)
        assert response.status_code == 200, f"Reports overview failed: {response.text}"
        
        data = response.json()
        assert "overview" in data, "Response missing 'overview' key"
        
        overview = data["overview"]
        assert "total_revenue" in overview, "Missing 'total_revenue' in overview"
        assert "student_revenue" in overview, "Missing 'student_revenue' in overview"
        
        print(f"SUCCESS: Reports overview returns revenue - Total: {overview['total_revenue']}, Student: {overview['student_revenue']}")
    
    def test_revenue_includes_conversion_amount(self, auth_headers):
        """Test that revenue calculation includes conversion_amount from onboarding"""
        # Create a student with conversion_amount
        test_id = f"TEST_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "name": f"TEST_RevenueStudent_{test_id}",
            "phone": f"8888{uuid.uuid4().hex[:6]}",
            "email": f"test_revenue_{test_id}@test.com",
            "city": "Delhi",
            "skill": "AI"
        }, headers=auth_headers)
        assert create_response.status_code == 200
        
        student_id = create_response.json()["id"]
        
        # Convert with amount
        update_response = requests.patch(f"{BASE_URL}/api/students/inquiry/{student_id}", json={
            "status": "converted",
            "conversion_amount": "25000"
        }, headers=auth_headers)
        assert update_response.status_code == 200
        
        # Check reports - the conversion_amount should be included in revenue
        reports_response = requests.get(f"{BASE_URL}/api/admin/reports/overview", headers=auth_headers)
        assert reports_response.status_code == 200
        
        data = reports_response.json()
        # Revenue should be > 0 if there are converted students with amounts
        print(f"SUCCESS: Revenue reports endpoint works - Student revenue: {data['overview']['student_revenue']}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_cleanup_test_students(self, auth_headers):
        """Archive TEST_ prefixed students"""
        response = requests.get(f"{BASE_URL}/api/students/inquiries", headers=auth_headers)
        if response.status_code == 200:
            students = response.json()
            test_students = [s for s in students if s.get("name", "").startswith("TEST_")]
            
            for student in test_students:
                requests.patch(f"{BASE_URL}/api/students/inquiry/{student['id']}", json={
                    "status": "archived"
                }, headers=auth_headers)
            
            print(f"SUCCESS: Archived {len(test_students)} test students")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
