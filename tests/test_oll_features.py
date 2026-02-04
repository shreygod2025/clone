"""
OLL Platform API Tests - Iteration 2
Testing new features: About page sections, Student CRM learning_mode, School Funnel
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://learn-hub-474.preview.emergentagent.com')

class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_admin_login(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@oll.co"
        print("✓ Admin login passed")
        return data["access_token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login rejected correctly")


class TestStudentInquiry:
    """Student inquiry CRUD tests - including learning_mode feature"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_create_student_inquiry_online(self):
        """Test creating student inquiry with online learning mode"""
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "learner_type": "self",
            "age_group": "13-15",
            "skill": "coding",
            "learning_mode": "online",
            "city": "",
            "learning_goal": "hobby",
            "name": "TEST_Online_Student",
            "email": "test_online@test.com",
            "phone": "9876543210",
            "source": "website"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["learning_mode"] == "online"
        assert data["name"] == "TEST_Online_Student"
        print("✓ Online student inquiry created")
        return data["id"]
    
    def test_create_student_inquiry_offline(self):
        """Test creating student inquiry with offline learning mode and city"""
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "learner_type": "child",
            "age_group": "10-12",
            "skill": "robotics",
            "learning_mode": "offline",
            "city": "Delhi",
            "learning_goal": "career",
            "name": "TEST_Offline_Student_Delhi",
            "email": "test_offline_delhi@test.com",
            "phone": "9876543211",
            "source": "website"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["learning_mode"] == "offline"
        assert data["city"] == "Delhi"
        assert data["name"] == "TEST_Offline_Student_Delhi"
        print("✓ Offline student inquiry with city created")
        return data["id"]
    
    def test_get_student_inquiries(self, auth_token):
        """Test fetching student inquiries (requires auth)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/students/inquiries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify learning_mode field exists in inquiries
        if len(data) > 0:
            assert "learning_mode" in data[0]
            print(f"✓ Fetched {len(data)} student inquiries with learning_mode field")
        else:
            print("✓ Student inquiries endpoint working (no data)")


class TestSchoolInquiry:
    """School inquiry tests - including multi-step funnel data"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_create_school_inquiry(self):
        """Test creating school inquiry with all funnel fields"""
        response = requests.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": "TEST_School_ABC",
            "contact_name": "Test Principal",
            "email": "test_school@test.com",
            "phone": "9876543212",
            "location": "Mumbai",
            "school_size": "500_1000",
            "fee_range": "50k_1l",
            "board": "cbse",
            "programs_interested": ["stem", "coding"],
            "support_needed": ["curriculum", "lab"],
            "source": "website"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["school_name"] == "TEST_School_ABC"
        assert data["board"] == "cbse"
        assert "stem" in data["programs_interested"]
        print("✓ School inquiry created with all funnel fields")
        return data["id"]
    
    def test_get_school_inquiries(self, auth_token):
        """Test fetching school inquiries"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} school inquiries")


class TestEducatorApplication:
    """Educator application tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_create_educator_application(self):
        """Test creating educator application"""
        response = requests.post(f"{BASE_URL}/api/educators/apply", json={
            "name": "TEST_Educator",
            "email": "test_educator@test.com",
            "phone": "9876543213",
            "skills": ["Robotics", "Coding"],
            "experience": "5 years",
            "grades_comfortable": ["6-8", "9-10"],
            "city": "Bangalore",
            "availability": "Full-time",
            "demo_ready": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Educator"
        assert "Robotics" in data["skills"]
        print("✓ Educator application created")
    
    def test_get_educator_applications(self, auth_token):
        """Test fetching educator applications"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/educators/applications", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} educator applications")


class TestAboutPage:
    """About page content tests"""
    
    def test_get_about_content(self):
        """Test fetching about page content"""
        response = requests.get(f"{BASE_URL}/api/about")
        assert response.status_code == 200
        data = response.json()
        assert "mission" in data
        assert "vision" in data
        print("✓ About page content fetched")


class TestDashboardStats:
    """Dashboard statistics tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_dashboard_stats(self, auth_token):
        """Test fetching dashboard statistics"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_students" in data
        assert "total_schools" in data
        assert "total_educators" in data
        print(f"✓ Dashboard stats: Students={data['total_students']}, Schools={data['total_schools']}, Educators={data['total_educators']}")


class TestFAQs:
    """FAQ endpoint tests"""
    
    def test_get_faqs(self):
        """Test fetching FAQs"""
        response = requests.get(f"{BASE_URL}/api/faqs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} FAQs")


class TestSupportTicket:
    """Support ticket tests"""
    
    def test_create_support_ticket(self):
        """Test creating support ticket"""
        response = requests.post(f"{BASE_URL}/api/support/ticket", json={
            "name": "TEST_Support_User",
            "email": "test_support@test.com",
            "user_type": "student",
            "subject": "Test Support Request",
            "message": "This is a test support ticket"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Support_User"
        assert data["status"] == "open"
        print("✓ Support ticket created")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
