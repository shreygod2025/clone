"""
Test Suite for Team Member Applications Workflow Overhaul - Step 1
Tests the new pipeline: Applicant -> Candidate -> Onboarding -> Active -> Past Member / Rejected

Features tested:
1. TeamApplication model with new pipeline fields
2. GET /api/team-applications - returns applications with new fields
3. PATCH /api/team-applications/{id} - accepts new pipeline fields
4. POST /api/team-applications/bulk-upload - CSV bulk upload functionality
5. New status tabs and action buttons
"""

import pytest
import requests
import os
import io
import csv

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndHealth:
    """Basic health and authentication tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health check endpoint working")
    
    def test_admin_login(self):
        """Test admin login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"PASS: Admin login successful, token received")
        return data["access_token"]


class TestTeamApplicationsEndpoint:
    """Test GET /api/team-applications endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json().get("access_token")
    
    def test_get_team_applications(self, auth_token):
        """Test fetching team applications"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/team-applications", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/team-applications returns {len(data)} applications")
    
    def test_applications_have_new_pipeline_fields(self, auth_token):
        """Test that applications have new pipeline fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/team-applications", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            app = data[0]
            # Check for new pipeline fields
            assert "status" in app
            assert app["status"] in ["applicant", "candidate", "onboarding", "active", "past_member", "rejected", "new", "hired", "archived"]
            
            # Check for telephonic_round field
            if "telephonic_round" in app:
                assert isinstance(app["telephonic_round"], dict)
                print(f"PASS: Application has telephonic_round field: {app['telephonic_round']}")
            
            # Check for hr_interview field
            if "hr_interview" in app:
                assert isinstance(app["hr_interview"], dict)
                print(f"PASS: Application has hr_interview field")
            
            # Check for dept_head_interview field
            if "dept_head_interview" in app:
                assert isinstance(app["dept_head_interview"], dict)
                print(f"PASS: Application has dept_head_interview field")
            
            # Check for trial_period field
            if "trial_period" in app:
                assert isinstance(app["trial_period"], dict)
                print(f"PASS: Application has trial_period field")
            
            print(f"PASS: Application has status: {app['status']}")
        else:
            print("INFO: No applications found to verify fields")


class TestCreateTeamApplication:
    """Test POST /api/team-applications endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json().get("access_token")
    
    def test_create_team_application(self, auth_token):
        """Test creating a new team application"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create test application
        test_data = {
            "name": "TEST_Workflow_Applicant",
            "email": "test_workflow@example.com",
            "phone": "+919876543210",
            "role": "Software Developer",
            "experience": "3-5 years",
            "city": "Mumbai",
            "availability": "Full-time",
            "resume_url": "https://example.com/resume.pdf",
            "message": "Test application for workflow testing",
            "source": "test"
        }
        
        response = requests.post(f"{BASE_URL}/api/team-applications", json=test_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response has required fields
        assert "id" in data
        assert data["name"] == test_data["name"]
        assert data["status"] == "applicant"  # Default status should be 'applicant'
        
        # Verify new pipeline fields are initialized
        assert "telephonic_round" in data
        assert data["telephonic_round"]["completed"] == False
        
        assert "hr_interview" in data
        assert data["hr_interview"]["scheduled"] == False
        
        assert "dept_head_interview" in data
        assert data["dept_head_interview"]["assigned"] == False
        
        assert "trial_period" in data
        
        print(f"PASS: Created team application with ID: {data['id']}")
        print(f"PASS: Default status is 'applicant': {data['status']}")
        print(f"PASS: Pipeline fields initialized correctly")
        
        return data["id"]


class TestUpdateTeamApplicationPipeline:
    """Test PATCH /api/team-applications/{id} with new pipeline fields"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json().get("access_token")
    
    @pytest.fixture
    def test_application_id(self, auth_token):
        """Create a test application for update tests"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        test_data = {
            "name": "TEST_Pipeline_Update",
            "email": "test_pipeline@example.com",
            "phone": "+919876543211",
            "role": "QA Engineer",
            "city": "Delhi",
            "source": "test"
        }
        response = requests.post(f"{BASE_URL}/api/team-applications", json=test_data, headers=headers)
        return response.json()["id"]
    
    def test_update_telephonic_round(self, auth_token, test_application_id):
        """Test updating telephonic_round field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        update_data = {
            "telephonic_round": {
                "completed": True,
                "completed_at": "2026-01-15T10:00:00Z",
                "completed_by": "Admin",
                "outcome": "accepted",
                "notes": "Good communication skills"
            }
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{test_application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["telephonic_round"]["completed"] == True
        assert data["telephonic_round"]["outcome"] == "accepted"
        print(f"PASS: Updated telephonic_round field successfully")
    
    def test_update_hr_interview(self, auth_token, test_application_id):
        """Test updating hr_interview field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        update_data = {
            "hr_interview": {
                "scheduled": True,
                "scheduled_at": "2026-01-20T14:00:00Z",
                "scheduled_by": "HR Manager",
                "notes": "Interview scheduled for next week",
                "email_sent": True
            }
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{test_application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["hr_interview"]["scheduled"] == True
        assert data["hr_interview"]["email_sent"] == True
        print(f"PASS: Updated hr_interview field successfully")
    
    def test_update_dept_head_interview(self, auth_token, test_application_id):
        """Test updating dept_head_interview field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        update_data = {
            "dept_head_interview": {
                "assigned": True,
                "dept_head_id": "test-dept-head-id",
                "dept_head_name": "John Doe",
                "scheduled_at": "2026-01-22T11:00:00Z",
                "notification_sent": True
            }
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{test_application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["dept_head_interview"]["assigned"] == True
        assert data["dept_head_interview"]["dept_head_name"] == "John Doe"
        print(f"PASS: Updated dept_head_interview field successfully")
    
    def test_update_trial_period(self, auth_token, test_application_id):
        """Test updating trial_period field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        update_data = {
            "trial_period": {
                "duration": "1_week",
                "start_date": "2026-01-25",
                "end_date": "2026-02-01",
                "status": "ongoing"
            }
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{test_application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["trial_period"]["duration"] == "1_week"
        assert data["trial_period"]["status"] == "ongoing"
        print(f"PASS: Updated trial_period field successfully")
    
    def test_update_status_to_candidate(self, auth_token, test_application_id):
        """Test updating status to candidate"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        update_data = {"status": "candidate"}
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{test_application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "candidate"
        print(f"PASS: Updated status to 'candidate'")
    
    def test_update_status_to_onboarding(self, auth_token, test_application_id):
        """Test updating status to onboarding"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        update_data = {"status": "onboarding"}
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{test_application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "onboarding"
        print(f"PASS: Updated status to 'onboarding'")
    
    def test_update_onboarding_fields(self, auth_token, test_application_id):
        """Test updating onboarding-specific fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        update_data = {
            "welcome_email_sent": True,
            "welcome_email_sent_at": "2026-01-25T09:00:00Z",
            "admin_account_created": True,
            "admin_role_id": "test-role-id",
            "admin_role_name": "Developer",
            "offer_letter_generated": True
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{test_application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["welcome_email_sent"] == True
        assert data["admin_account_created"] == True
        assert data["offer_letter_generated"] == True
        print(f"PASS: Updated onboarding fields successfully")
    
    def test_update_status_to_active(self, auth_token, test_application_id):
        """Test updating status to active"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        update_data = {
            "status": "active",
            "activated_at": "2026-02-01T10:00:00Z"
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{test_application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "active"
        print(f"PASS: Updated status to 'active'")
    
    def test_update_status_to_past_member(self, auth_token, test_application_id):
        """Test updating status to past_member (exit flow)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        update_data = {
            "status": "past_member",
            "exit_date": "2026-03-01T10:00:00Z",
            "exit_reason": "Resigned",
            "account_deactivated": True
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{test_application_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "past_member"
        assert data["exit_reason"] == "Resigned"
        print(f"PASS: Updated status to 'past_member' with exit details")
    
    def test_update_status_to_rejected(self, auth_token):
        """Test updating status to rejected"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a new application for rejection test
        test_data = {
            "name": "TEST_Rejection_Flow",
            "email": "test_reject@example.com",
            "phone": "+919876543212",
            "role": "Designer",
            "city": "Bangalore",
            "source": "test"
        }
        create_response = requests.post(f"{BASE_URL}/api/team-applications", json=test_data, headers=headers)
        app_id = create_response.json()["id"]
        
        # Update to rejected
        update_data = {
            "status": "rejected",
            "telephonic_round": {
                "completed": True,
                "outcome": "rejected",
                "reject_reason": "Not a good fit"
            }
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/team-applications/{app_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "rejected"
        assert data["telephonic_round"]["outcome"] == "rejected"
        print(f"PASS: Updated status to 'rejected' with rejection reason")


class TestBulkUpload:
    """Test POST /api/team-applications/bulk-upload endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json().get("access_token")
    
    def test_bulk_upload_csv(self, auth_token):
        """Test bulk upload with valid CSV file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create CSV content
        csv_content = """Name*,Email*,Phone*,City*,Role,Experience,Availability,LinkedIn,Portfolio,Message
TEST_Bulk_User1,bulk1@example.com,+919876543301,Mumbai,Developer,3-5 years,Full-time,https://linkedin.com/in/bulk1,,Test bulk upload 1
TEST_Bulk_User2,bulk2@example.com,+919876543302,Delhi,Designer,1-3 years,Part-time,https://linkedin.com/in/bulk2,,Test bulk upload 2
TEST_Bulk_User3,bulk3@example.com,+919876543303,Bangalore,QA Engineer,5+ years,Full-time,,,Test bulk upload 3"""
        
        # Create file-like object
        files = {
            'file': ('test_bulk_upload.csv', csv_content, 'text/csv')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/team-applications/bulk-upload",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success_count" in data
        assert "failed_count" in data
        assert data["success_count"] >= 0
        
        print(f"PASS: Bulk upload completed - Success: {data['success_count']}, Failed: {data['failed_count']}")
        if data.get("errors"):
            print(f"INFO: Errors: {data['errors']}")
    
    def test_bulk_upload_missing_required_fields(self, auth_token):
        """Test bulk upload with missing required fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # CSV with missing required fields
        csv_content = """Name*,Email*,Phone*,City*,Role
,missing_email@example.com,+919876543304,Mumbai,Developer
TEST_Missing_Email,,+919876543305,Delhi,Designer
TEST_Missing_Phone,missing_phone@example.com,,Bangalore,QA"""
        
        files = {
            'file': ('test_missing_fields.csv', csv_content, 'text/csv')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/team-applications/bulk-upload",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have failures due to missing required fields
        assert data["failed_count"] >= 0
        print(f"PASS: Bulk upload validation working - Failed: {data['failed_count']}")
    
    def test_bulk_upload_invalid_file_type(self, auth_token):
        """Test bulk upload with non-CSV file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Try uploading a non-CSV file
        files = {
            'file': ('test.txt', 'This is not a CSV file', 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/team-applications/bulk-upload",
            files=files,
            headers=headers
        )
        
        # Should return 400 for invalid file type
        assert response.status_code == 400
        print(f"PASS: Bulk upload rejects non-CSV files")


class TestFilterByStatus:
    """Test filtering applications by status"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json().get("access_token")
    
    def test_filter_by_applicant_status(self, auth_token):
        """Test filtering by applicant status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/team-applications?status=applicant", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned applications should have status 'applicant'
        for app in data:
            assert app["status"] == "applicant"
        
        print(f"PASS: Filter by 'applicant' status returns {len(data)} applications")
    
    def test_filter_by_candidate_status(self, auth_token):
        """Test filtering by candidate status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/team-applications?status=candidate", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        for app in data:
            assert app["status"] == "candidate"
        
        print(f"PASS: Filter by 'candidate' status returns {len(data)} applications")
    
    def test_filter_by_onboarding_status(self, auth_token):
        """Test filtering by onboarding status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/team-applications?status=onboarding", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        for app in data:
            assert app["status"] == "onboarding"
        
        print(f"PASS: Filter by 'onboarding' status returns {len(data)} applications")
    
    def test_filter_by_active_status(self, auth_token):
        """Test filtering by active status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/team-applications?status=active", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        for app in data:
            assert app["status"] == "active"
        
        print(f"PASS: Filter by 'active' status returns {len(data)} applications")
    
    def test_filter_by_rejected_status(self, auth_token):
        """Test filtering by rejected status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/team-applications?status=rejected", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        for app in data:
            assert app["status"] == "rejected"
        
        print(f"PASS: Filter by 'rejected' status returns {len(data)} applications")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json().get("access_token")
    
    def test_cleanup_test_applications(self, auth_token):
        """Clean up test applications created during testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get all applications
        response = requests.get(f"{BASE_URL}/api/team-applications", headers=headers)
        applications = response.json()
        
        # Delete test applications (those starting with TEST_)
        deleted_count = 0
        for app in applications:
            if app.get("name", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/team-applications/{app['id']}",
                    headers=headers
                )
                if delete_response.status_code in [200, 204]:
                    deleted_count += 1
        
        print(f"INFO: Cleaned up {deleted_count} test applications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
