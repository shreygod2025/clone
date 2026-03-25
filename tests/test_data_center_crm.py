"""
Test Data Center, Student CRM, School CRM, and File Upload features
Tests for iteration 11 - OLL Admin Panel CRM features
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://skill-education-hub-2.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access token in response"
        assert "user" in data, "No user in response"
        print(f"✓ Admin login successful - User: {data['user']['name']}")
        return data["access_token"]


class TestFileUpload:
    """Test file upload endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_upload_endpoint_exists(self, auth_token):
        """Test that upload endpoint exists and accepts files"""
        # Create a simple test file
        files = {
            'file': ('test_receipt.png', b'fake image content for testing', 'image/png')
        }
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(f"{BASE_URL}/api/upload", files=files, headers=headers)
        # Should either succeed or fail with validation error (not 404)
        assert response.status_code != 404, "Upload endpoint not found"
        print(f"✓ Upload endpoint exists - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "url" in data or "file_url" in data, "No URL in upload response"
            print(f"✓ File uploaded successfully - URL: {data.get('url') or data.get('file_url')}")


class TestDataCenter:
    """Test Data Center unified view"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_data_center_search(self, auth_headers):
        """Test Data Center search endpoint"""
        response = requests.get(f"{BASE_URL}/api/data-center/search", headers=auth_headers)
        assert response.status_code == 200, f"Data center search failed: {response.text}"
        data = response.json()
        
        # Should return students, schools, educators arrays
        assert "students" in data, "No students in response"
        assert "schools" in data, "No schools in response"
        assert "educators" in data, "No educators in response"
        assert "total" in data, "No total count in response"
        
        print(f"✓ Data Center search works - Total: {data['total']}")
        print(f"  Students: {len(data['students'])}, Schools: {len(data['schools'])}, Educators: {len(data['educators'])}")
    
    def test_data_center_filter_by_type(self, auth_headers):
        """Test Data Center filter by type"""
        # Filter by students only
        response = requests.get(f"{BASE_URL}/api/data-center/search?data_type=students", headers=auth_headers)
        assert response.status_code == 200, f"Filter by type failed: {response.text}"
        data = response.json()
        
        # Should only return students
        assert len(data.get("schools", [])) == 0, "Schools should be empty when filtering by students"
        assert len(data.get("educators", [])) == 0, "Educators should be empty when filtering by students"
        print(f"✓ Data Center filter by type works - Students only: {len(data['students'])}")
    
    def test_data_center_filter_by_status(self, auth_headers):
        """Test Data Center filter by status"""
        response = requests.get(f"{BASE_URL}/api/data-center/search?status=new", headers=auth_headers)
        assert response.status_code == 200, f"Filter by status failed: {response.text}"
        print(f"✓ Data Center filter by status works")
    
    def test_data_center_stats(self, auth_headers):
        """Test Data Center stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/data-center/stats", headers=auth_headers)
        assert response.status_code == 200, f"Data center stats failed: {response.text}"
        data = response.json()
        
        assert "totals" in data, "No totals in stats"
        assert "by_status" in data, "No by_status in stats"
        
        print(f"✓ Data Center stats works - Totals: {data['totals']}")


class TestStudentCRM:
    """Test Student CRM features"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_student_inquiries(self, auth_headers):
        """Test getting student inquiries"""
        response = requests.get(f"{BASE_URL}/api/students/inquiries", headers=auth_headers)
        assert response.status_code == 200, f"Get inquiries failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Get student inquiries works - Count: {len(data)}")
        
        # Check status distribution
        statuses = {}
        for inq in data:
            status = inq.get("status", "unknown")
            statuses[status] = statuses.get(status, 0) + 1
        print(f"  Status distribution: {statuses}")
        return data
    
    def test_create_student_inquiry(self, auth_headers):
        """Test creating a new student inquiry"""
        test_inquiry = {
            "name": "TEST_Student_CRM",
            "email": "test_student_crm@test.com",
            "phone": "9999888877",
            "learner_type": "self",
            "skill": "robotics",
            "learning_mode": "online",
            "city": "Mumbai",
            "source": "manual"
        }
        
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json=test_inquiry, headers=auth_headers)
        assert response.status_code in [200, 201], f"Create inquiry failed: {response.text}"
        data = response.json()
        assert "id" in data, "No ID in created inquiry"
        print(f"✓ Create student inquiry works - ID: {data['id']}")
        return data["id"]
    
    def test_update_student_status_to_demo_completed(self, auth_headers):
        """Test updating student status to demo_completed"""
        # First create a test inquiry
        test_inquiry = {
            "name": "TEST_Demo_Completed",
            "email": "test_demo_completed@test.com",
            "phone": "9999888866",
            "learner_type": "self",
            "skill": "coding",
            "learning_mode": "online",
            "source": "manual"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/students/inquiry", json=test_inquiry, headers=auth_headers)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        inquiry_id = create_response.json()["id"]
        
        # Update status to demo_completed
        update_response = requests.patch(
            f"{BASE_URL}/api/students/inquiry/{inquiry_id}",
            json={"status": "demo_completed"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Update status failed: {update_response.text}"
        print(f"✓ Update student status to demo_completed works")
        
        # Verify the status was updated
        get_response = requests.get(f"{BASE_URL}/api/students/inquiries", headers=auth_headers)
        inquiries = get_response.json()
        updated_inquiry = next((i for i in inquiries if i["id"] == inquiry_id), None)
        assert updated_inquiry is not None, "Inquiry not found after update"
        assert updated_inquiry["status"] == "demo_completed", f"Status not updated: {updated_inquiry['status']}"
        print(f"✓ Status verified as demo_completed")
        
        return inquiry_id
    
    def test_update_student_status_to_converted(self, auth_headers):
        """Test updating student status to converted (simulating Convert & Onboard)"""
        # First create a test inquiry
        test_inquiry = {
            "name": "TEST_Converted",
            "email": "test_converted@test.com",
            "phone": "9999888855",
            "learner_type": "self",
            "skill": "ai",
            "learning_mode": "online",
            "source": "manual"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/students/inquiry", json=test_inquiry, headers=auth_headers)
        inquiry_id = create_response.json()["id"]
        
        # Update to demo_completed first
        requests.patch(
            f"{BASE_URL}/api/students/inquiry/{inquiry_id}",
            json={"status": "demo_completed"},
            headers=auth_headers
        )
        
        # Update to converted with payment receipt URL
        update_response = requests.patch(
            f"{BASE_URL}/api/students/inquiry/{inquiry_id}",
            json={
                "status": "converted",
                "payment_receipt_url": "/api/uploads/test_receipt.png",
                "notes": "Converted with payment receipt"
            },
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Convert failed: {update_response.text}"
        print(f"✓ Update student status to converted works")
        
        return inquiry_id


class TestSchoolCRM:
    """Test School CRM features"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_school_inquiries(self, auth_headers):
        """Test getting school inquiries"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200, f"Get school inquiries failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Get school inquiries works - Count: {len(data)}")
        
        # Check status distribution
        statuses = {}
        for inq in data:
            status = inq.get("status", "unknown")
            statuses[status] = statuses.get(status, 0) + 1
        print(f"  Status distribution: {statuses}")
        return data
    
    def test_create_school_inquiry(self, auth_headers):
        """Test creating a new school inquiry"""
        test_inquiry = {
            "school_name": "TEST_School_CRM",
            "contact_name": "Test Contact",
            "email": "test_school_crm@test.com",
            "phone": "9999777766",
            "location": "Mumbai",
            "board": "CBSE",
            "programs_interested": ["robotics", "coding"],
            "source": "manual"
        }
        
        response = requests.post(f"{BASE_URL}/api/schools/inquiry", json=test_inquiry, headers=auth_headers)
        assert response.status_code in [200, 201], f"Create school inquiry failed: {response.text}"
        data = response.json()
        assert "id" in data, "No ID in created inquiry"
        print(f"✓ Create school inquiry works - ID: {data['id']}")
        return data["id"]
    
    def test_update_school_status_to_meeting_done(self, auth_headers):
        """Test updating school status to meeting_done"""
        # First create a test inquiry
        test_inquiry = {
            "school_name": "TEST_Meeting_Done",
            "contact_name": "Test Contact",
            "email": "test_meeting_done@test.com",
            "phone": "9999777755",
            "location": "Delhi",
            "source": "manual"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/schools/inquiry", json=test_inquiry, headers=auth_headers)
        inquiry_id = create_response.json()["id"]
        
        # Update status to meeting_done
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"status": "meeting_done"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Update status failed: {update_response.text}"
        print(f"✓ Update school status to meeting_done works")
        
        return inquiry_id
    
    def test_update_school_status_to_converted(self, auth_headers):
        """Test updating school status to converted"""
        test_inquiry = {
            "school_name": "TEST_Converted_School",
            "contact_name": "Test Contact",
            "email": "test_converted_school@test.com",
            "phone": "9999777744",
            "location": "Bangalore",
            "source": "manual"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/schools/inquiry", json=test_inquiry, headers=auth_headers)
        inquiry_id = create_response.json()["id"]
        
        # Update to meeting_done first
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"status": "meeting_done"},
            headers=auth_headers
        )
        
        # Update to converted
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"status": "converted"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Convert failed: {update_response.text}"
        print(f"✓ Update school status to converted works")
        
        return inquiry_id
    
    def test_update_school_status_to_active(self, auth_headers):
        """Test updating school status to active (after onboarding)"""
        test_inquiry = {
            "school_name": "TEST_Active_School",
            "contact_name": "Test Contact",
            "email": "test_active_school@test.com",
            "phone": "9999777733",
            "location": "Chennai",
            "source": "manual"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/schools/inquiry", json=test_inquiry, headers=auth_headers)
        inquiry_id = create_response.json()["id"]
        
        # Update to converted first
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"status": "converted"},
            headers=auth_headers
        )
        
        # Update to active
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"status": "active"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Activate failed: {update_response.text}"
        print(f"✓ Update school status to active works")
        
        return inquiry_id
    
    def test_update_school_status_to_renewed(self, auth_headers):
        """Test updating school status to renewed"""
        test_inquiry = {
            "school_name": "TEST_Renewed_School",
            "contact_name": "Test Contact",
            "email": "test_renewed_school@test.com",
            "phone": "9999777722",
            "location": "Hyderabad",
            "source": "manual"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/schools/inquiry", json=test_inquiry, headers=auth_headers)
        inquiry_id = create_response.json()["id"]
        
        # Update to active first
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"status": "active"},
            headers=auth_headers
        )
        
        # Update to renewed
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"status": "renewed"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Renew failed: {update_response.text}"
        print(f"✓ Update school status to renewed works")
        
        return inquiry_id
    
    def test_update_school_status_to_lost(self, auth_headers):
        """Test updating school status to lost"""
        test_inquiry = {
            "school_name": "TEST_Lost_School",
            "contact_name": "Test Contact",
            "email": "test_lost_school@test.com",
            "phone": "9999777711",
            "location": "Pune",
            "source": "manual"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/schools/inquiry", json=test_inquiry, headers=auth_headers)
        inquiry_id = create_response.json()["id"]
        
        # Update to active first
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"status": "active"},
            headers=auth_headers
        )
        
        # Update to lost
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"status": "lost"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Mark lost failed: {update_response.text}"
        print(f"✓ Update school status to lost works")
        
        return inquiry_id


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_cleanup_test_data(self, auth_headers):
        """Clean up TEST_ prefixed data"""
        # Get all student inquiries and delete TEST_ ones
        student_response = requests.get(f"{BASE_URL}/api/students/inquiries", headers=auth_headers)
        if student_response.status_code == 200:
            students = student_response.json()
            test_students = [s for s in students if s.get("name", "").startswith("TEST_")]
            for student in test_students:
                requests.patch(
                    f"{BASE_URL}/api/students/inquiry/{student['id']}",
                    json={"status": "archived"},
                    headers=auth_headers
                )
            print(f"✓ Archived {len(test_students)} test student inquiries")
        
        # Get all school inquiries and delete TEST_ ones
        school_response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        if school_response.status_code == 200:
            schools = school_response.json()
            test_schools = [s for s in schools if s.get("school_name", "").startswith("TEST_")]
            for school in test_schools:
                requests.patch(
                    f"{BASE_URL}/api/schools/inquiry/{school['id']}",
                    json={"status": "archived"},
                    headers=auth_headers
                )
            print(f"✓ Archived {len(test_schools)} test school inquiries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
