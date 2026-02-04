"""
Test file for School CRM Data Transfer, Team Member Reports, and Mobile Responsiveness features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"


class TestTeamMemberReports:
    """Team Member Reports API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_team_users(self, headers):
        """Test getting team users list"""
        response = requests.get(f"{BASE_URL}/api/team-users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} team users")
    
    def test_get_team_onboarding(self, headers):
        """Test getting team onboarding records"""
        response = requests.get(f"{BASE_URL}/api/team-onboarding", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Find active team members
        active_members = [m for m in data if m.get('status') == 'active' and m.get('team_user_id')]
        print(f"Found {len(active_members)} active team members with team_user_id")
    
    def test_team_member_report_endpoint(self, headers):
        """Test team member report API endpoint"""
        # First get team users to find one with team_user_id
        response = requests.get(f"{BASE_URL}/api/team-users", headers=headers)
        assert response.status_code == 200
        team_users = response.json()
        
        if not team_users:
            pytest.skip("No team users found")
        
        # Get first active team user
        active_user = next((u for u in team_users if u.get('is_active')), None)
        if not active_user:
            pytest.skip("No active team users found")
        
        user_id = active_user['id']
        
        # Test the report endpoint
        response = requests.get(f"{BASE_URL}/api/admin/reports/team-member/{user_id}", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify response structure
        assert "member" in data, "Response should contain 'member' field"
        assert "metrics" in data, "Response should contain 'metrics' field"
        assert "period" in data, "Response should contain 'period' field"
        
        # Verify member info
        member = data["member"]
        assert "id" in member
        assert "name" in member
        assert "email" in member
        assert "role" in member
        
        # Verify metrics structure
        metrics = data["metrics"]
        assert "students" in metrics, "Metrics should contain 'students'"
        assert "schools" in metrics, "Metrics should contain 'schools'"
        assert "support" in metrics, "Metrics should contain 'support'"
        assert "demos" in metrics, "Metrics should contain 'demos'"
        
        # Verify students metrics
        students = metrics["students"]
        assert "assigned" in students
        assert "converted" in students
        assert "conversion_rate" in students
        
        # Verify schools metrics
        schools = metrics["schools"]
        assert "assigned" in schools
        assert "converted" in schools
        assert "conversion_rate" in schools
        assert "as_rm" in schools
        
        # Verify support metrics
        support = metrics["support"]
        assert "total_tickets" in support
        assert "resolved" in support
        assert "resolution_rate" in support
        
        # Verify demos metrics
        demos = metrics["demos"]
        assert "total" in demos
        assert "completed" in demos
        
        print(f"Team member report for {member['name']} retrieved successfully")
        print(f"Students assigned: {students['assigned']}, Schools assigned: {schools['assigned']}")


class TestSchoolCRM:
    """School CRM API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_school_inquiries(self, headers):
        """Test getting school inquiries"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} school inquiries")
    
    def test_create_school_inquiry(self, headers):
        """Test creating a school inquiry"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        response = requests.post(f"{BASE_URL}/api/schools/inquiry", headers=headers, json={
            "school_name": f"TEST_School_{unique_id}",
            "contact_name": "Test Contact",
            "email": f"test_{unique_id}@test.com",
            "phone": "9876543210",
            "location": "Mumbai",
            "school_size": "medium",
            "fee_range": "50000-100000",
            "source": "website"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["school_name"] == f"TEST_School_{unique_id}"
        print(f"Created school inquiry: {data['id']}")
        return data["id"]
    
    def test_update_school_with_offerings(self, headers):
        """Test updating school with selected_offerings"""
        # First create a school
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        create_response = requests.post(f"{BASE_URL}/api/schools/inquiry", headers=headers, json={
            "school_name": f"TEST_Offerings_School_{unique_id}",
            "contact_name": "Test Contact",
            "email": f"test_offerings_{unique_id}@test.com",
            "phone": "9876543210",
            "location": "Mumbai",
            "school_size": "medium",
            "fee_range": "50000-100000",
            "source": "website"
        })
        assert create_response.status_code == 200
        school_id = create_response.json()["id"]
        
        # Update with selected_offerings
        update_response = requests.patch(f"{BASE_URL}/api/schools/inquiry/{school_id}", headers=headers, json={
            "status": "meeting_done",
            "selected_offerings": ["robotics", "stem"],
            "notes": "Meeting notes: Discussed robotics lab setup."
        })
        assert update_response.status_code == 200
        
        # Verify the update
        get_response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert get_response.status_code == 200
        schools = get_response.json()
        school = next((s for s in schools if s.get('id') == school_id), None)
        
        assert school is not None, "School not found after update"
        assert school.get("status") == "meeting_done"
        assert school.get("selected_offerings") == ["robotics", "stem"]
        print(f"School updated with offerings: {school.get('selected_offerings')}")


class TestStudentCRM:
    """Student CRM API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_student_inquiries(self, headers):
        """Test getting student inquiries"""
        response = requests.get(f"{BASE_URL}/api/students/inquiries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} student inquiries")


class TestEducators:
    """Educator API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_educator_applications(self, headers):
        """Test getting educator applications"""
        response = requests.get(f"{BASE_URL}/api/educators/applications", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} educator applications")
