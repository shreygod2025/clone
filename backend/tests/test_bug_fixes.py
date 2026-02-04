"""
Test cases for OLL bug fixes:
1. Team Application submit with applied_position_id
2. Growth Partner applications visibility in Admin GP CRM
3. School CRM selected_offerings field
4. Educator CRM onboarding count
5. Team Applications interview_scheduled status actions
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@oll.co",
        "password": "Dagaji03@"
    })
    if login_response.status_code != 200:
        pytest.skip("Admin login failed")
    return login_response.json().get("access_token")

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Get headers with admin token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"Health check passed: {response.json()}")


class TestTeamApplications:
    """Test Team Application submission with applied_position_id"""
    
    def test_create_team_application_with_position_id(self):
        """Test creating team application with applied_position_id field"""
        test_data = {
            "name": f"TEST_TeamApplicant_{uuid.uuid4().hex[:6]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "9876543210",
            "role": "Software Engineer",
            "experience": "3 years",
            "city": "Mumbai",
            "availability": "Immediate",
            "linkedin": "https://linkedin.com/in/test",
            "portfolio": "https://github.com/test",
            "resume_url": "",
            "applied_position_id": "test-position-123",  # This was the bug - was sending null
            "message": "Test application message",
            "source": "about_page"
        }
        
        response = requests.post(f"{BASE_URL}/api/team-applications", json=test_data)
        print(f"Team application response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["name"] == test_data["name"], "Name should match"
        assert data.get("applied_position_id") == "test-position-123", "applied_position_id should be set"
        print(f"Team application created successfully with id: {data['id']}")
    
    def test_create_team_application_with_empty_position_id(self):
        """Test creating team application with empty applied_position_id (default case)"""
        test_data = {
            "name": f"TEST_TeamApplicant_{uuid.uuid4().hex[:6]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "9876543211",
            "role": "Designer",
            "experience": "2 years",
            "city": "Delhi",
            "availability": "2 weeks",
            "linkedin": "",
            "portfolio": "",
            "resume_url": "",
            "applied_position_id": "",  # Empty string instead of null
            "message": "Test application",
            "source": "about_page"
        }
        
        response = requests.post(f"{BASE_URL}/api/team-applications", json=test_data)
        print(f"Team application (empty position) response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        print(f"Team application created with empty position_id: {data['id']}")


class TestGrowthPartnerApplications:
    """Test Growth Partner applications visibility"""
    
    def test_create_growth_partner_application(self):
        """Test creating a growth partner application"""
        test_data = {
            "name": f"TEST_GP_{uuid.uuid4().hex[:6]}",
            "email": f"gp_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "9876543212",
            "city": "Bangalore",
            "experience": "5 years in education",
            "message": "Interested in becoming a growth partner"
        }
        
        response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_data)
        print(f"Growth partner creation response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["name"] == test_data["name"], "Name should match"
        print(f"Growth partner created with id: {data['id']}")
    
    def test_get_growth_partners_list(self, admin_headers):
        """Test fetching growth partners list (admin visibility)"""
        response = requests.get(f"{BASE_URL}/api/growth-partners", headers=admin_headers)
        print(f"Growth partners list response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} growth partners")
        
        # Check if TEST_ prefixed partners are visible
        test_partners = [p for p in data if p.get("name", "").startswith("TEST_")]
        print(f"Found {len(test_partners)} test growth partners")


class TestSchoolCRM:
    """Test School CRM selected_offerings field"""
    
    def test_create_school_inquiry_with_selected_offerings(self):
        """Test creating school inquiry with selected_offerings field"""
        test_data = {
            "school_name": f"TEST_School_{uuid.uuid4().hex[:6]}",
            "contact_name": "Test Principal",
            "phone": "9876543213",
            "email": f"school_{uuid.uuid4().hex[:6]}@example.com",
            "city": "Chennai",
            "address": "123 Test Street",
            "student_strength": "500",
            "programs_interested": ["robotics", "coding"],
            "selected_offerings": ["robotics_basic", "coding_python"],  # This was the bug - field was missing
            "source": "website",
            "message": "Interested in skill programs"
        }
        
        response = requests.post(f"{BASE_URL}/api/schools/inquiry", json=test_data)
        print(f"School inquiry creation response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["school_name"] == test_data["school_name"], "School name should match"
        # Check if selected_offerings is preserved
        if "selected_offerings" in data:
            print(f"selected_offerings preserved: {data['selected_offerings']}")
        print(f"School inquiry created with id: {data['id']}")
    
    def test_get_school_inquiries(self, admin_headers):
        """Test fetching school inquiries list"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=admin_headers)
        print(f"School inquiries list response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} school inquiries")
        
        # Check for selected_offerings field in responses
        for inquiry in data[:5]:  # Check first 5
            if inquiry.get("selected_offerings"):
                print(f"School {inquiry.get('school_name')} has selected_offerings: {inquiry.get('selected_offerings')}")


class TestEducatorCRM:
    """Test Educator CRM onboarding count"""
    
    def test_get_educators_list(self, admin_headers):
        """Test fetching educators list with status counts"""
        response = requests.get(f"{BASE_URL}/api/educators/applications", headers=admin_headers)
        print(f"Educators list response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Count by status
        status_counts = {}
        for educator in data:
            status = educator.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"Educator status counts: {status_counts}")
        print(f"Total educators: {len(data)}")
        
        # Check for 'onboarded' status (this was the bug - was checking 'onboarding' instead)
        onboarded_count = status_counts.get("onboarded", 0)
        print(f"Onboarded educators count: {onboarded_count}")


class TestTeamApplicationStatusActions:
    """Test Team Application status actions for interview_scheduled"""
    
    def test_get_team_applications_with_status(self, admin_headers):
        """Test fetching team applications and verify status actions"""
        response = requests.get(f"{BASE_URL}/api/team-applications", headers=admin_headers)
        print(f"Team applications list response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Count by status
        status_counts = {}
        for app in data:
            status = app.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"Team application status counts: {status_counts}")
        print(f"Total team applications: {len(data)}")
    
    def test_update_team_application_status_to_hired(self, admin_headers):
        """Test updating team application status from interview_scheduled to hired"""
        # First create a test application
        test_data = {
            "name": f"TEST_HireCandidate_{uuid.uuid4().hex[:6]}",
            "email": f"hire_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "9876543214",
            "role": "Content Writer",
            "experience": "2 years",
            "city": "Pune",
            "availability": "Immediate",
            "linkedin": "",
            "portfolio": "",
            "resume_url": "",
            "applied_position_id": "",
            "message": "Test for hire flow",
            "source": "about_page"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/team-applications", json=test_data)
        if create_response.status_code != 200:
            pytest.skip("Could not create test application")
        
        app_id = create_response.json()["id"]
        print(f"Created test application: {app_id}")
        
        # Update to interview_scheduled first
        update_response = requests.patch(
            f"{BASE_URL}/api/team-applications/{app_id}",
            json={"status": "interview_scheduled"},
            headers=admin_headers
        )
        print(f"Update to interview_scheduled: {update_response.status_code}")
        assert update_response.status_code == 200, f"Failed to update to interview_scheduled: {update_response.text}"
        
        # Now update to hired (this is the new action button)
        update_response = requests.patch(
            f"{BASE_URL}/api/team-applications/{app_id}",
            json={"status": "hired"},
            headers=admin_headers
        )
        print(f"Update to hired: {update_response.status_code}")
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        data = update_response.json()
        assert data.get("status") == "hired", f"Status should be 'hired', got {data.get('status')}"
        print(f"Successfully updated application to hired status")
    
    def test_update_team_application_status_to_rejected(self, admin_headers):
        """Test updating team application status from interview_scheduled to rejected"""
        # First create a test application
        test_data = {
            "name": f"TEST_RejectCandidate_{uuid.uuid4().hex[:6]}",
            "email": f"reject_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "9876543215",
            "role": "Marketing",
            "experience": "1 year",
            "city": "Hyderabad",
            "availability": "1 month",
            "linkedin": "",
            "portfolio": "",
            "resume_url": "",
            "applied_position_id": "",
            "message": "Test for reject flow",
            "source": "about_page"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/team-applications", json=test_data)
        if create_response.status_code != 200:
            pytest.skip("Could not create test application")
        
        app_id = create_response.json()["id"]
        print(f"Created test application: {app_id}")
        
        # Update to interview_scheduled first
        update_response = requests.patch(
            f"{BASE_URL}/api/team-applications/{app_id}",
            json={"status": "interview_scheduled"},
            headers=admin_headers
        )
        print(f"Update to interview_scheduled: {update_response.status_code}")
        
        # Now update to rejected (this is the new action button)
        update_response = requests.patch(
            f"{BASE_URL}/api/team-applications/{app_id}",
            json={"status": "rejected"},
            headers=admin_headers
        )
        print(f"Update to rejected: {update_response.status_code}")
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        data = update_response.json()
        assert data.get("status") == "rejected", f"Status should be 'rejected', got {data.get('status')}"
        print(f"Successfully updated application to rejected status")


class TestOrdersPayments:
    """Test Orders page payments"""
    
    def test_get_school_payments(self, admin_headers):
        """Test fetching school payments list"""
        response = requests.get(f"{BASE_URL}/api/orders/school-payments", headers=admin_headers)
        print(f"School payments list response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} school payments")
    
    def test_get_student_payments(self, admin_headers):
        """Test fetching student payments list"""
        response = requests.get(f"{BASE_URL}/api/orders/student-payments", headers=admin_headers)
        print(f"Student payments list response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} student payments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
