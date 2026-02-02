"""
OLL Platform API Tests - Iteration 4
Testing new features:
1. Inquiry Lead API - POST /api/inquiry/lead
2. Inquiry Query API - POST /api/inquiry/query
3. Student funnel flow changes (skill selection, action step, city conditional)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://edufunnel.preview.emergentagent.com')


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestInquiryLeadAPI:
    """Test /api/inquiry/lead endpoint - adds leads to CRM"""
    
    def test_create_student_lead(self):
        """Test creating a student lead via inquiry form"""
        response = requests.post(f"{BASE_URL}/api/inquiry/lead", json={
            "inquiry_type": "student",
            "action_type": "lead",
            "name": "TEST_Student_Lead",
            "phone": "9876543001",
            "email": "test_student_lead@test.com",
            "offering": "robotics",
            "city": "Mumbai",
            "details": "Interested in robotics classes for 10 year old",
            "source": "team_inquiry_form"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Lead added successfully"
        print(f"✓ Student lead created with ID: {data['id']}")
        return data["id"]
    
    def test_create_school_lead(self):
        """Test creating a school lead via inquiry form"""
        response = requests.post(f"{BASE_URL}/api/inquiry/lead", json={
            "inquiry_type": "school",
            "action_type": "lead",
            "name": "TEST_School_Lead",
            "phone": "9876543002",
            "email": "test_school_lead@test.com",
            "offering": "school_partnership",
            "city": "Delhi",
            "details": "School interested in STEM partnership",
            "source": "team_inquiry_form"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Lead added successfully"
        print(f"✓ School lead created with ID: {data['id']}")
    
    def test_create_growth_partner_lead(self):
        """Test creating a growth partner lead via inquiry form"""
        response = requests.post(f"{BASE_URL}/api/inquiry/lead", json={
            "inquiry_type": "growth_partner",
            "action_type": "lead",
            "name": "TEST_Growth_Partner",
            "phone": "9876543003",
            "email": "test_growth@test.com",
            "offering": "franchise",
            "city": "Bangalore",
            "details": "Interested in franchise opportunity",
            "source": "team_inquiry_form"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Growth partner lead created with ID: {data['id']}")
    
    def test_create_teacher_lead(self):
        """Test creating a teacher lead via inquiry form"""
        response = requests.post(f"{BASE_URL}/api/inquiry/lead", json={
            "inquiry_type": "teacher",
            "action_type": "lead",
            "name": "TEST_Teacher_Lead",
            "phone": "9876543004",
            "email": "test_teacher@test.com",
            "offering": "educator_role",
            "city": "Chennai",
            "details": "Experienced robotics educator",
            "source": "team_inquiry_form"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Teacher lead created with ID: {data['id']}")
    
    def test_create_team_lead(self):
        """Test creating a team lead via inquiry form"""
        response = requests.post(f"{BASE_URL}/api/inquiry/lead", json={
            "inquiry_type": "team",
            "action_type": "lead",
            "name": "TEST_Team_Lead",
            "phone": "9876543005",
            "email": "test_team@test.com",
            "offering": "other",
            "city": "Hyderabad",
            "details": "Internal team inquiry",
            "source": "team_inquiry_form"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Team lead created with ID: {data['id']}")


class TestInquiryQueryAPI:
    """Test /api/inquiry/query endpoint - adds queries to ticketing system"""
    
    def test_create_demo_related_query(self):
        """Test creating a demo related query"""
        response = requests.post(f"{BASE_URL}/api/inquiry/query", json={
            "inquiry_type": "student",
            "action_type": "query",
            "name": "TEST_Query_User",
            "phone": "9876543010",
            "email": "test_query@test.com",
            "query_type": "demo_related",
            "query_details": "Need to reschedule demo class",
            "source": "team_inquiry_form"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Query submitted successfully"
        print(f"✓ Demo related query created with ID: {data['id']}")
    
    def test_create_payment_query(self):
        """Test creating a payment related query"""
        response = requests.post(f"{BASE_URL}/api/inquiry/query", json={
            "inquiry_type": "student",
            "action_type": "query",
            "name": "TEST_Payment_Query",
            "phone": "9876543011",
            "email": "test_payment@test.com",
            "query_type": "payment",
            "query_details": "Payment not reflecting in account",
            "source": "team_inquiry_form"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Payment query created with ID: {data['id']}")
    
    def test_create_technical_query(self):
        """Test creating a technical support query"""
        response = requests.post(f"{BASE_URL}/api/inquiry/query", json={
            "inquiry_type": "school",
            "action_type": "query",
            "name": "TEST_Tech_Query",
            "phone": "9876543012",
            "email": "test_tech@test.com",
            "query_type": "technical",
            "query_details": "LMS login not working",
            "source": "team_inquiry_form"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Technical query created with ID: {data['id']}")
    
    def test_create_feedback_query(self):
        """Test creating a feedback query"""
        response = requests.post(f"{BASE_URL}/api/inquiry/query", json={
            "inquiry_type": "teacher",
            "action_type": "query",
            "name": "TEST_Feedback_Query",
            "phone": "9876543013",
            "email": "test_feedback@test.com",
            "query_type": "feedback",
            "query_details": "Feedback about the platform",
            "source": "team_inquiry_form"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Feedback query created with ID: {data['id']}")


class TestInquiryLeadsRetrieval:
    """Test retrieving inquiry leads (requires auth)"""
    
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
    
    def test_get_inquiry_leads(self, auth_token):
        """Test fetching inquiry leads"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/inquiry/leads", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} inquiry leads")
    
    def test_get_inquiry_queries(self, auth_token):
        """Test fetching inquiry queries"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/inquiry/queries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} inquiry queries")


class TestCitiesAndCenters:
    """Test cities and centers endpoints for student funnel"""
    
    def test_get_cities(self):
        """Test fetching cities"""
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} cities")
        return data
    
    def test_get_centers_by_city(self):
        """Test fetching centers by city"""
        # First get cities
        cities_response = requests.get(f"{BASE_URL}/api/cities")
        cities = cities_response.json()
        
        if len(cities) > 0:
            city_name = cities[0].get("name", "Mumbai")
            response = requests.get(f"{BASE_URL}/api/centers/by-city/{city_name}")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Fetched {len(data)} centers for {city_name}")
        else:
            print("✓ No cities available to test centers")


class TestOTPFlow:
    """Test OTP flow for student funnel"""
    
    def test_send_otp(self):
        """Test sending OTP"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "9876543100",
            "user_type": "student"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ OTP sent successfully")
    
    def test_verify_otp(self):
        """Test verifying OTP with test code 1111"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "9876543101",
            "user_type": "student"
        })
        
        # Verify with test OTP
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "9876543101",
            "otp": "1111",
            "user_type": "student"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "9876543101"
        print("✓ OTP verified successfully with test code 1111")


class TestStudentInquiryWithDemoBooking:
    """Test student inquiry with demo booking (full flow)"""
    
    def test_create_student_inquiry_online_mode(self):
        """Test creating student inquiry with online mode (no city)"""
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "learner_type": "self",
            "age_group": "10-14",
            "skill": "coding",
            "learning_mode": "online",
            "city": "",
            "learning_goal": "general",
            "name": "TEST_Online_Student_Flow",
            "email": "test_online_flow@test.com",
            "phone": "9876543200",
            "demo_date": "2025-01-15",
            "demo_time": "14:00",
            "source": "website"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["learning_mode"] == "online"
        assert data["city"] == ""
        print("✓ Online student inquiry created (no city required)")
    
    def test_create_student_inquiry_offline_center(self):
        """Test creating student inquiry with offline center mode"""
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "learner_type": "self",
            "age_group": "6-9",
            "skill": "robotics",
            "learning_mode": "offline_center",
            "city": "Mumbai",
            "learning_goal": "general",
            "name": "TEST_Offline_Center_Student",
            "email": "test_offline_center@test.com",
            "phone": "9876543201",
            "demo_date": "2025-01-16",
            "demo_time": "10:00",
            "source": "website"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["learning_mode"] == "offline_center"
        assert data["city"] == "Mumbai"
        print("✓ Offline center student inquiry created with city")
    
    def test_create_student_inquiry_offline_home(self):
        """Test creating student inquiry with offline home mode"""
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "learner_type": "self",
            "age_group": "15-18",
            "skill": "ai",
            "learning_mode": "offline_home",
            "city": "Delhi",
            "learning_goal": "general",
            "name": "TEST_Offline_Home_Student",
            "email": "test_offline_home@test.com",
            "phone": "9876543202",
            "demo_date": "2025-01-17",
            "demo_time": "16:00",
            "source": "website"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["learning_mode"] == "offline_home"
        assert data["city"] == "Delhi"
        print("✓ Offline home student inquiry created with city")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
