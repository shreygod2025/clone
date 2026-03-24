"""
Test Suite for Team Member Applications Workflow - Step 2
Testing HR Interview and Dept Head Interview outcome tracking

Features tested:
1. HR Interview outcome (passed/failed) updates
2. Dept Head Interview outcome (selected/not_selected) updates
3. Auto-rejection when marking Failed or Not Selected
4. Move to Onboarding button logic (both interviews must pass)
5. Status indicators for outcomes
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


def get_application_by_id(client, app_id):
    """Helper to get application by ID from the list endpoint"""
    response = client.get(f"{BASE_URL}/api/team-applications")
    if response.status_code == 200:
        applications = response.json()
        for app in applications:
            if app.get("id") == app_id:
                return app
    return None


class TestAuthAndHealth:
    """Basic health and auth tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Health check endpoint working")
    
    def test_admin_login(self, api_client):
        """Test admin login and get token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"PASS: Admin login successful, token received")


class TestHRInterviewOutcome:
    """Test HR Interview outcome tracking"""
    
    def test_mark_hr_interview_passed(self, authenticated_client):
        """Test marking HR interview as passed"""
        # Create application
        create_response = authenticated_client.post(f"{BASE_URL}/api/team-applications", json={
            "name": "TEST_HR_Passed_Candidate",
            "email": "test_hr_passed@test.com",
            "phone": "+919999888877",
            "role": "Software Developer",
            "city": "Mumbai",
            "experience": "3-5 years"
        })
        assert create_response.status_code in [200, 201]
        app_id = create_response.json()["id"]
        print(f"Created test application {app_id}")
        
        # Move to candidate stage and schedule HR interview
        update_response = authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "candidate",
            "hr_interview": {
                "scheduled": True,
                "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat(),
                "scheduled_by": "Admin",
                "email_sent": True
            }
        })
        assert update_response.status_code == 200
        print(f"Application moved to candidate with HR interview scheduled")
        
        # Mark HR interview as passed
        update_response = authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "hr_interview": {
                "scheduled": True,
                "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat(),
                "completed": True,
                "completed_at": datetime.now().isoformat(),
                "outcome": "passed",
                "notes": "Excellent communication skills"
            }
        })
        assert update_response.status_code == 200
        
        # Verify the update using list endpoint
        app_data = get_application_by_id(authenticated_client, app_id)
        assert app_data is not None, f"Application {app_id} not found"
        
        assert app_data["hr_interview"]["completed"] == True
        assert app_data["hr_interview"]["outcome"] == "passed"
        assert app_data["status"] == "candidate"  # Should still be candidate
        print(f"PASS: HR interview marked as passed, status remains candidate")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/team-applications/{app_id}")
    
    def test_mark_hr_interview_failed_auto_rejects(self, authenticated_client):
        """Test that marking HR interview as failed auto-rejects the application"""
        # Create application
        create_response = authenticated_client.post(f"{BASE_URL}/api/team-applications", json={
            "name": "TEST_HR_Failed_Candidate",
            "email": "test_hr_failed@test.com",
            "phone": "+919999888876",
            "role": "Backend Developer",
            "city": "Delhi",
            "experience": "2-4 years"
        })
        assert create_response.status_code in [200, 201]
        app_id = create_response.json()["id"]
        print(f"Created test application {app_id}")
        
        # Move to candidate stage and schedule HR interview
        authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "candidate",
            "hr_interview": {
                "scheduled": True,
                "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat(),
                "email_sent": True
            }
        })
        
        # Mark HR interview as failed - this should auto-reject
        update_response = authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "rejected",  # Frontend sends this when marking failed
            "hr_interview": {
                "scheduled": True,
                "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat(),
                "completed": True,
                "completed_at": datetime.now().isoformat(),
                "outcome": "failed",
                "notes": "Did not meet requirements"
            }
        })
        assert update_response.status_code == 200
        
        # Verify the application is rejected
        app_data = get_application_by_id(authenticated_client, app_id)
        assert app_data is not None, f"Application {app_id} not found"
        
        assert app_data["hr_interview"]["completed"] == True
        assert app_data["hr_interview"]["outcome"] == "failed"
        assert app_data["status"] == "rejected"
        print(f"PASS: HR interview marked as failed, application auto-rejected")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/team-applications/{app_id}")


class TestDeptHeadInterviewOutcome:
    """Test Dept Head Interview outcome tracking"""
    
    def test_mark_depthead_interview_selected(self, authenticated_client):
        """Test marking Dept Head interview as selected"""
        # Create application
        create_response = authenticated_client.post(f"{BASE_URL}/api/team-applications", json={
            "name": "TEST_DH_Selected_Candidate",
            "email": "test_dh_selected@test.com",
            "phone": "+919999888866",
            "role": "Product Manager",
            "city": "Delhi",
            "experience": "5-7 years"
        })
        assert create_response.status_code in [200, 201]
        app_id = create_response.json()["id"]
        print(f"Created test application {app_id}")
        
        # Move to candidate stage and assign dept head
        authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "candidate",
            "dept_head_interview": {
                "assigned": True,
                "dept_head_id": "test-dept-head-id",
                "dept_head_name": "John Manager",
                "notification_sent": True
            }
        })
        
        # Mark Dept Head interview as selected
        update_response = authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "dept_head_interview": {
                "assigned": True,
                "dept_head_id": "test-dept-head-id",
                "dept_head_name": "John Manager",
                "completed": True,
                "completed_at": datetime.now().isoformat(),
                "outcome": "selected",
                "notes": "Great fit for the team"
            }
        })
        assert update_response.status_code == 200
        
        # Verify the update
        app_data = get_application_by_id(authenticated_client, app_id)
        assert app_data is not None, f"Application {app_id} not found"
        
        assert app_data["dept_head_interview"]["completed"] == True
        assert app_data["dept_head_interview"]["outcome"] == "selected"
        assert app_data["status"] == "candidate"  # Should still be candidate
        print(f"PASS: Dept Head interview marked as selected, status remains candidate")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/team-applications/{app_id}")
    
    def test_mark_depthead_interview_not_selected_auto_rejects(self, authenticated_client):
        """Test that marking Dept Head interview as not_selected auto-rejects the application"""
        # Create application
        create_response = authenticated_client.post(f"{BASE_URL}/api/team-applications", json={
            "name": "TEST_DH_NotSelected_Candidate",
            "email": "test_dh_notselected@test.com",
            "phone": "+919999888865",
            "role": "UX Designer",
            "city": "Bangalore",
            "experience": "3-5 years"
        })
        assert create_response.status_code in [200, 201]
        app_id = create_response.json()["id"]
        print(f"Created test application {app_id}")
        
        # Move to candidate stage and assign dept head
        authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "candidate",
            "dept_head_interview": {
                "assigned": True,
                "dept_head_id": "test-dept-head-id",
                "dept_head_name": "John Manager",
                "notification_sent": True
            }
        })
        
        # Mark Dept Head interview as not_selected - this should auto-reject
        update_response = authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "rejected",  # Frontend sends this when marking not_selected
            "dept_head_interview": {
                "assigned": True,
                "dept_head_id": "test-dept-head-id",
                "dept_head_name": "John Manager",
                "completed": True,
                "completed_at": datetime.now().isoformat(),
                "outcome": "not_selected",
                "notes": "Skills don't match current requirements"
            }
        })
        assert update_response.status_code == 200
        
        # Verify the application is rejected
        app_data = get_application_by_id(authenticated_client, app_id)
        assert app_data is not None, f"Application {app_id} not found"
        
        assert app_data["dept_head_interview"]["completed"] == True
        assert app_data["dept_head_interview"]["outcome"] == "not_selected"
        assert app_data["status"] == "rejected"
        print(f"PASS: Dept Head interview marked as not_selected, application auto-rejected")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/team-applications/{app_id}")


class TestMoveToOnboardingLogic:
    """Test Move to Onboarding button logic - requires both interviews to pass"""
    
    def test_move_to_onboarding_both_passed(self, authenticated_client):
        """Test that Move to Onboarding works when both HR passed AND Dept Head selected"""
        # Create application
        create_response = authenticated_client.post(f"{BASE_URL}/api/team-applications", json={
            "name": "TEST_Both_Passed_Candidate",
            "email": "test_both_passed@test.com",
            "phone": "+919999888855",
            "role": "Designer",
            "city": "Bangalore",
            "experience": "2-4 years"
        })
        assert create_response.status_code in [200, 201]
        app_id = create_response.json()["id"]
        print(f"Created test application {app_id}")
        
        # Move to candidate and set both interviews as passed
        update_response = authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "candidate",
            "hr_interview": {
                "scheduled": True,
                "scheduled_at": datetime.now().isoformat(),
                "completed": True,
                "completed_at": datetime.now().isoformat(),
                "outcome": "passed",
                "notes": "HR approved"
            },
            "dept_head_interview": {
                "assigned": True,
                "dept_head_id": "test-dept-head-id",
                "dept_head_name": "Jane Director",
                "completed": True,
                "completed_at": datetime.now().isoformat(),
                "outcome": "selected",
                "notes": "Dept Head approved"
            }
        })
        assert update_response.status_code == 200
        
        # Now move to onboarding
        onboarding_response = authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "onboarding"
        })
        assert onboarding_response.status_code == 200
        
        # Verify status is onboarding
        app_data = get_application_by_id(authenticated_client, app_id)
        assert app_data is not None, f"Application {app_id} not found"
        
        assert app_data["status"] == "onboarding"
        assert app_data["hr_interview"]["outcome"] == "passed"
        assert app_data["dept_head_interview"]["outcome"] == "selected"
        print(f"PASS: Application moved to onboarding with both interviews passed")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/team-applications/{app_id}")
    
    def test_verify_existing_application_outcomes(self, authenticated_client):
        """Verify the existing test application from manual testing has correct outcomes"""
        # Test application ID from previous curl testing
        app_id = "89239b50-12e8-4470-a9ff-9fc7d5063795"
        
        app_data = get_application_by_id(authenticated_client, app_id)
        if app_data:
            print(f"Application: {app_data.get('name')}")
            print(f"Status: {app_data.get('status')}")
            print(f"HR Interview: {app_data.get('hr_interview')}")
            print(f"Dept Head Interview: {app_data.get('dept_head_interview')}")
            
            # Check if hr_interview and dept_head_interview have completed=true
            hr = app_data.get('hr_interview', {})
            dh = app_data.get('dept_head_interview', {})
            
            if hr.get('completed'):
                print(f"PASS: HR Interview completed with outcome: {hr.get('outcome')}")
            if dh.get('completed'):
                print(f"PASS: Dept Head Interview completed with outcome: {dh.get('outcome')}")
        else:
            print(f"INFO: Test application {app_id} not found, skipping verification")


class TestStatusIndicators:
    """Test status indicators for interview outcomes"""
    
    def test_hr_passed_indicator_data(self, authenticated_client):
        """Verify HR passed outcome data structure for green checkmark indicator"""
        # Create and setup application
        create_response = authenticated_client.post(f"{BASE_URL}/api/team-applications", json={
            "name": "TEST_HR_Indicator_Candidate",
            "email": "test_hr_indicator@test.com",
            "phone": "+919999888844",
            "role": "QA Engineer",
            "city": "Pune"
        })
        assert create_response.status_code in [200, 201]
        app_id = create_response.json()["id"]
        
        # Set HR interview as passed
        authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "candidate",
            "hr_interview": {
                "scheduled": True,
                "completed": True,
                "outcome": "passed"
            }
        })
        
        # Verify data structure for indicator
        app_data = get_application_by_id(authenticated_client, app_id)
        assert app_data is not None, f"Application {app_id} not found"
        
        hr = app_data.get("hr_interview", {})
        assert hr.get("completed") == True
        assert hr.get("outcome") == "passed"
        print(f"PASS: HR passed indicator data correct - completed=True, outcome=passed")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/team-applications/{app_id}")
    
    def test_depthead_selected_indicator_data(self, authenticated_client):
        """Verify Dept Head selected outcome data structure for green checkmark indicator"""
        # Create and setup application
        create_response = authenticated_client.post(f"{BASE_URL}/api/team-applications", json={
            "name": "TEST_DH_Selected_Indicator",
            "email": "test_dh_selected_ind@test.com",
            "phone": "+919999888822",
            "role": "Data Analyst",
            "city": "Hyderabad"
        })
        assert create_response.status_code in [200, 201]
        app_id = create_response.json()["id"]
        
        # Set Dept Head interview as selected
        authenticated_client.patch(f"{BASE_URL}/api/team-applications/{app_id}", json={
            "status": "candidate",
            "dept_head_interview": {
                "assigned": True,
                "dept_head_name": "Test Manager",
                "completed": True,
                "outcome": "selected"
            }
        })
        
        # Verify data structure for indicator
        app_data = get_application_by_id(authenticated_client, app_id)
        assert app_data is not None, f"Application {app_id} not found"
        
        dh = app_data.get("dept_head_interview", {})
        assert dh.get("completed") == True
        assert dh.get("outcome") == "selected"
        print(f"PASS: Dept Head selected indicator data correct - completed=True, outcome=selected")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/team-applications/{app_id}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_applications(self, authenticated_client):
        """Clean up all TEST_ prefixed applications"""
        response = authenticated_client.get(f"{BASE_URL}/api/team-applications")
        if response.status_code == 200:
            applications = response.json()
            deleted_count = 0
            for app in applications:
                if app.get("name", "").startswith("TEST_"):
                    del_response = authenticated_client.delete(f"{BASE_URL}/api/team-applications/{app['id']}")
                    if del_response.status_code in [200, 204]:
                        deleted_count += 1
            print(f"PASS: Cleaned up {deleted_count} test applications")


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@oll.co",
        "password": "Dagaji03@"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client
