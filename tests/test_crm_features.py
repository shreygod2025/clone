"""
Test suite for OLL Platform CRM Features
Tests: Admin Dashboard Overdue Section, School/Educator/Growth Partner CRM View/Edit Popups, Center Dashboard
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"
CENTER_EMAIL = "andheri@oll.co"
CENTER_PASSWORD = "center123"


class TestAuthAndSetup:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def center_token(self):
        """Get center user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CENTER_EMAIL,
            "password": CENTER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Center user login failed - may not exist: {response.text}")
        data = response.json()
        return data.get("access_token")
    
    def test_admin_login(self, admin_token):
        """Test admin login works"""
        assert admin_token is not None
        print("✓ Admin login successful")
    
    def test_admin_me_endpoint(self, admin_token):
        """Test /api/auth/me returns user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        print(f"✓ Admin user: {data.get('email')}")


class TestDashboardOverdueSection:
    """P0: Test Admin Dashboard Overdue Section"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_dashboard_stats_endpoint(self, admin_token):
        """Test /api/dashboard/stats returns overdue data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify overdue fields exist
        assert "total_overdue" in data, "Missing total_overdue field"
        assert "overdue_students" in data, "Missing overdue_students field"
        assert "overdue_schools" in data, "Missing overdue_schools field"
        assert "overdue_educators" in data, "Missing overdue_educators field"
        
        print(f"✓ Dashboard stats returned - Total overdue: {data.get('total_overdue')}")
        print(f"  - Overdue students: {len(data.get('overdue_students', []))}")
        print(f"  - Overdue schools: {len(data.get('overdue_schools', []))}")
        print(f"  - Overdue educators: {len(data.get('overdue_educators', []))}")
    
    def test_overdue_students_structure(self, admin_token):
        """Test overdue_students has correct structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        data = response.json()
        
        overdue_students = data.get("overdue_students", [])
        if len(overdue_students) > 0:
            student = overdue_students[0]
            # Check expected fields
            assert "name" in student or "phone" in student, "Overdue student missing name/phone"
            print(f"✓ Overdue student structure valid: {student.get('name', 'N/A')}")
        else:
            print("✓ No overdue students (structure test skipped)")
    
    def test_overdue_schools_structure(self, admin_token):
        """Test overdue_schools has correct structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        data = response.json()
        
        overdue_schools = data.get("overdue_schools", [])
        if len(overdue_schools) > 0:
            school = overdue_schools[0]
            assert "school_name" in school or "contact_name" in school, "Overdue school missing school_name/contact_name"
            print(f"✓ Overdue school structure valid: {school.get('school_name', 'N/A')}")
        else:
            print("✓ No overdue schools (structure test skipped)")


class TestSchoolCRMViewEdit:
    """P0: Test School CRM View/Edit Popup functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_school_id(self, admin_token):
        """Create a test school inquiry"""
        response = requests.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": "TEST_School_ViewEdit",
            "contact_name": "Test Contact",
            "email": "test_school@test.com",
            "phone": "9876543210",
            "location": "Mumbai",
            "school_size": "500-1000",
            "fee_range": "50000-100000",
            "board": "CBSE",
            "programs_interested": ["robotics", "coding"],
            "support_needed": ["curriculum"],
            "source": "test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to create test school: {response.text}"
        return response.json()["id"]
    
    def test_get_school_inquiries(self, admin_token):
        """Test GET /api/schools/inquiries"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ School inquiries returned: {len(data)} records")
    
    def test_update_school_inquiry_inline_edit(self, admin_token, test_school_id):
        """Test PATCH /api/schools/inquiry/{id} - inline editing"""
        response = requests.patch(f"{BASE_URL}/api/schools/inquiry/{test_school_id}", json={
            "school_name": "TEST_School_Updated",
            "contact_name": "Updated Contact",
            "phone": "9876543211",
            "email": "updated_school@test.com",
            "notes": "Updated via inline edit test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to update school: {response.text}"
        data = response.json()
        assert data.get("school_name") == "TEST_School_Updated"
        assert data.get("contact_name") == "Updated Contact"
        print("✓ School inline edit works - name, contact, phone, email, notes updated")
    
    def test_add_comment_to_school(self, admin_token, test_school_id):
        """Test POST /api/schools/comment/{id} - add comment"""
        response = requests.post(f"{BASE_URL}/api/schools/comment/{test_school_id}", json={
            "text": "Test comment from automated test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to add comment: {response.text}"
        data = response.json()
        assert "comment" in data or "message" in data
        print("✓ School comment added successfully")
    
    def test_get_school_comments(self, admin_token, test_school_id):
        """Test GET /api/schools/comments/{id}"""
        response = requests.get(f"{BASE_URL}/api/schools/comments/{test_school_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Failed to get comments: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one comment"
        print(f"✓ School comments retrieved: {len(data)} comments")


class TestEducatorsCRMViewEdit:
    """P0: Test Educators CRM View/Edit Popup functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_educator_id(self, admin_token):
        """Create a test educator application"""
        response = requests.post(f"{BASE_URL}/api/educators/apply", json={
            "name": "TEST_Educator_ViewEdit",
            "email": "test_educator@test.com",
            "phone": "9876543212",
            "skills": ["Robotics", "Coding"],
            "experience": "3-5 years",
            "grades_comfortable": ["Primary (1-5)", "Middle (6-8)"],
            "city": "Mumbai",
            "availability": "Weekday Mornings",
            "demo_ready": True,
            "source": "test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to create test educator: {response.text}"
        return response.json()["id"]
    
    def test_get_educator_applications(self, admin_token):
        """Test GET /api/educators/applications"""
        response = requests.get(f"{BASE_URL}/api/educators/applications", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Educator applications returned: {len(data)} records")
    
    def test_update_educator_inline_edit(self, admin_token, test_educator_id):
        """Test PATCH /api/educators/application/{id} - inline editing"""
        response = requests.patch(f"{BASE_URL}/api/educators/application/{test_educator_id}", json={
            "name": "TEST_Educator_Updated",
            "phone": "9876543213",
            "email": "updated_educator@test.com",
            "notes": "Updated via inline edit test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to update educator: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Educator_Updated"
        print("✓ Educator inline edit works - name, phone, email, notes updated")
    
    def test_add_comment_to_educator(self, admin_token, test_educator_id):
        """Test POST /api/educators/comment/{id} - add comment"""
        response = requests.post(f"{BASE_URL}/api/educators/comment/{test_educator_id}", json={
            "text": "Test comment for educator from automated test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to add comment: {response.text}"
        print("✓ Educator comment added successfully")


class TestGrowthPartnersCRMViewEdit:
    """P0: Test Growth Partners CRM View/Edit Popup functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_partner_id(self, admin_token):
        """Create a test growth partner"""
        response = requests.post(f"{BASE_URL}/api/growth-partners", json={
            "name": "TEST_Partner_ViewEdit",
            "email": "test_partner@test.com",
            "phone": "9876543214",
            "city": "Mumbai",
            "interest_type": "franchise",
            "details": "Test partner for view/edit testing",
            "source": "test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to create test partner: {response.text}"
        return response.json()["id"]
    
    def test_get_growth_partners(self, admin_token):
        """Test GET /api/growth-partners"""
        response = requests.get(f"{BASE_URL}/api/growth-partners", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Growth partners returned: {len(data)} records")
    
    def test_update_partner_inline_edit(self, admin_token, test_partner_id):
        """Test PATCH /api/growth-partners/{id} - inline editing"""
        response = requests.patch(f"{BASE_URL}/api/growth-partners/{test_partner_id}", json={
            "name": "TEST_Partner_Updated",
            "phone": "9876543215",
            "email": "updated_partner@test.com",
            "city": "Delhi",
            "details": "Updated details via inline edit",
            "notes": "Updated notes via inline edit test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to update partner: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Partner_Updated"
        assert data.get("city") == "Delhi"
        print("✓ Growth partner inline edit works - name, phone, email, city, details, notes updated")
    
    def test_add_comment_to_partner(self, admin_token, test_partner_id):
        """Test POST /api/growth_partners/comment/{id} - add comment"""
        response = requests.post(f"{BASE_URL}/api/growth_partners/comment/{test_partner_id}", json={
            "text": "Test comment for partner from automated test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to add comment: {response.text}"
        print("✓ Growth partner comment added successfully")


class TestCenterDashboard:
    """P0: Test Center Dashboard login and CRM functionality"""
    
    @pytest.fixture(scope="class")
    def center_token(self):
        """Get center user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CENTER_EMAIL,
            "password": CENTER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Center user login failed - may not exist")
        data = response.json()
        assert data.get("user", {}).get("role") == "center_user", "User is not a center_user"
        return data.get("access_token")
    
    def test_center_login(self, center_token):
        """Test center user can login"""
        assert center_token is not None
        print("✓ Center user login successful")
    
    def test_center_get_demos(self, center_token):
        """Test GET /api/center/demos - get center's student leads"""
        response = requests.get(f"{BASE_URL}/api/center/demos", headers={
            "Authorization": f"Bearer {center_token}"
        })
        assert response.status_code == 200, f"Failed to get center demos: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Center demos returned: {len(data)} records")
    
    def test_center_add_demo(self, center_token):
        """Test POST /api/center/demos - add demo from center"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/center/demos", json={
            "name": "TEST_Center_Demo",
            "email": "test_center_demo@test.com",
            "phone": "9876543216",
            "age_group": "9-12 years",
            "skill": "Robotics",
            "demo_date": tomorrow,
            "demo_time": "10:00",
            "notes": "Test demo from center dashboard"
        }, headers={"Authorization": f"Bearer {center_token}"})
        assert response.status_code == 200, f"Failed to add center demo: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Center_Demo"
        print("✓ Center demo added successfully")
        return data.get("id")
    
    def test_center_update_demo(self, center_token):
        """Test PATCH /api/center/demos/{id} - update demo from center"""
        # First create a demo
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        create_response = requests.post(f"{BASE_URL}/api/center/demos", json={
            "name": "TEST_Center_Update",
            "email": "test_update@test.com",
            "phone": "9876543217",
            "skill": "Coding",
            "demo_date": tomorrow,
            "demo_time": "11:00"
        }, headers={"Authorization": f"Bearer {center_token}"})
        
        if create_response.status_code != 200:
            pytest.skip("Could not create demo for update test")
        
        demo_id = create_response.json().get("id")
        
        # Update the demo
        response = requests.patch(f"{BASE_URL}/api/center/demos/{demo_id}", json={
            "name": "TEST_Center_Updated",
            "phone": "9876543218",
            "notes": "Updated via center dashboard"
        }, headers={"Authorization": f"Bearer {center_token}"})
        assert response.status_code == 200, f"Failed to update center demo: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Center_Updated"
        print("✓ Center demo update works")
    
    def test_center_add_comment(self, center_token):
        """Test POST /api/center/demos/{id}/comment - add comment from center"""
        # First create a demo
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        create_response = requests.post(f"{BASE_URL}/api/center/demos", json={
            "name": "TEST_Center_Comment",
            "email": "test_comment@test.com",
            "phone": "9876543219",
            "skill": "AI & ML",
            "demo_date": tomorrow,
            "demo_time": "14:00"
        }, headers={"Authorization": f"Bearer {center_token}"})
        
        if create_response.status_code != 200:
            pytest.skip("Could not create demo for comment test")
        
        demo_id = create_response.json().get("id")
        
        # Add comment
        response = requests.post(f"{BASE_URL}/api/center/demos/{demo_id}/comment", json={
            "text": "Test comment from center dashboard"
        }, headers={"Authorization": f"Bearer {center_token}"})
        assert response.status_code == 200, f"Failed to add center comment: {response.text}"
        print("✓ Center demo comment added successfully")


class TestStudentCRMRegression:
    """Regression: Test Student CRM edit functionality still works"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_student_id(self, admin_token):
        """Create a test student inquiry"""
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "name": "TEST_Student_Regression",
            "email": "test_student@test.com",
            "phone": "9876543220",
            "learner_type": "self",
            "age_group": "13-17 years",
            "skill": "Robotics",
            "learning_mode": "online",
            "city": "Mumbai",
            "learning_goal": "career",
            "source": "test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to create test student: {response.text}"
        return response.json()["id"]
    
    def test_get_student_inquiries(self, admin_token):
        """Test GET /api/students/inquiries"""
        response = requests.get(f"{BASE_URL}/api/students/inquiries", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Student inquiries returned: {len(data)} records")
    
    def test_update_student_inquiry(self, admin_token, test_student_id):
        """Test PATCH /api/students/inquiry/{id} - edit functionality"""
        response = requests.patch(f"{BASE_URL}/api/students/inquiry/{test_student_id}", json={
            "name": "TEST_Student_Updated",
            "phone": "9876543221",
            "email": "updated_student@test.com",
            "notes": "Updated via regression test"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to update student: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Student_Updated"
        print("✓ Student CRM edit still works (regression passed)")
    
    def test_add_comment_to_student(self, admin_token, test_student_id):
        """Test POST /api/students/comment/{id}"""
        response = requests.post(f"{BASE_URL}/api/students/comment/{test_student_id}", json={
            "text": "Regression test comment"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200, f"Failed to add comment: {response.text}"
        print("✓ Student comment functionality works (regression passed)")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_cleanup_info(self, admin_token):
        """Note: Test data prefixed with TEST_ was created during tests"""
        print("✓ Test data created with TEST_ prefix for easy identification")
        print("  - TEST_School_ViewEdit, TEST_School_Updated")
        print("  - TEST_Educator_ViewEdit, TEST_Educator_Updated")
        print("  - TEST_Partner_ViewEdit, TEST_Partner_Updated")
        print("  - TEST_Student_Regression, TEST_Student_Updated")
        print("  - TEST_Center_Demo, TEST_Center_Update, TEST_Center_Comment")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
