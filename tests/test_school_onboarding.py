"""
Test Suite for School Onboarding UX P0 Features
Tests:
1. Admin Login
2. School CRM page loads with tabs
3. Mark Converted button and conversion modal
4. Auto-initialization of onboarding workflow
5. Onboarding progress display on school cards
6. Copy tracking link functionality
7. Public tracking page
8. Get Support modal with step-specific queries
9. Support ticket submission from tracking page
10. Tracking tickets endpoint
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://oll-edu-hub.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful - User: {data['user']['name']}")
        return data["access_token"]


class TestSchoolCRMEndpoints:
    """Test School CRM related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_school_inquiries(self):
        """Test fetching school inquiries list"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200, f"Failed to get inquiries: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} school inquiries")
        
        # Check for schools with different statuses
        statuses = set(s.get("status") for s in data)
        print(f"  Statuses found: {statuses}")
        return data
    
    def test_get_meeting_done_schools(self):
        """Test filtering schools with meeting_done status"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        meeting_done = [s for s in data if s.get("status") == "meeting_done"]
        print(f"✓ Found {len(meeting_done)} schools with 'meeting_done' status")
        return meeting_done
    
    def test_get_converted_schools(self):
        """Test filtering schools with converted status"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        converted = [s for s in data if s.get("status") == "converted"]
        print(f"✓ Found {len(converted)} schools with 'converted' status")
        return converted
    
    def test_get_active_schools_with_onboarding(self):
        """Test filtering active schools with onboarding workflow"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        active_with_onboarding = [s for s in data if s.get("status") == "active" and s.get("onboarding_workflow")]
        print(f"✓ Found {len(active_with_onboarding)} active schools with onboarding workflow")
        
        # Check onboarding workflow structure
        for school in active_with_onboarding[:1]:  # Check first one
            workflow = school.get("onboarding_workflow", {})
            assert "tracking_token" in workflow, "Missing tracking_token in workflow"
            assert "steps" in workflow, "Missing steps in workflow"
            assert "current_step" in workflow, "Missing current_step in workflow"
            print(f"  School: {school.get('school_name')}")
            print(f"  Tracking token: {workflow.get('tracking_token')}")
            print(f"  Current step: {workflow.get('current_step')}")
            steps = workflow.get("steps", {})
            completed = sum(1 for s in steps.values() if s.get("completed"))
            print(f"  Progress: {completed}/9 steps")
        
        return active_with_onboarding


class TestSchoolConversion:
    """Test school conversion flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_convert_school_endpoint(self):
        """Test converting a school from meeting_done to converted"""
        # First get a meeting_done school
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        meeting_done = [s for s in data if s.get("status") == "meeting_done"]
        if not meeting_done:
            pytest.skip("No meeting_done schools available for testing")
        
        school = meeting_done[0]
        school_id = school["id"]
        print(f"Testing conversion for school: {school.get('school_name')}")
        
        # Test the conversion endpoint (PATCH)
        convert_data = {
            "status": "converted",
            "conversion_amount": "50000",
            "initial_onboard_data": {
                "model": "robotics_lab",
                "book_type": "individual_books",
                "kit_type": "lab_setup",
                "training_type": "student_training"
            }
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json=convert_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Conversion failed: {response.text}"
        print(f"✓ School conversion endpoint works")
        
        # Revert back to meeting_done for other tests
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "meeting_done"},
            headers=self.headers
        )


class TestOnboardingWorkflow:
    """Test onboarding workflow initialization and management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_init_onboarding_endpoint(self):
        """Test initializing onboarding workflow for a school"""
        # Get a converted or active school without onboarding
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find a school that can have onboarding initialized
        eligible = [s for s in data if s.get("status") in ["converted", "active"] and not s.get("onboarding_workflow")]
        
        if not eligible:
            # Use an existing school with onboarding to test the endpoint structure
            with_onboarding = [s for s in data if s.get("onboarding_workflow")]
            if with_onboarding:
                school = with_onboarding[0]
                workflow = school.get("onboarding_workflow", {})
                assert "tracking_token" in workflow
                assert "steps" in workflow
                print(f"✓ Verified onboarding workflow structure for: {school.get('school_name')}")
                print(f"  Tracking token: {workflow.get('tracking_token')}")
                return
            pytest.skip("No eligible schools for onboarding init test")
        
        school = eligible[0]
        school_id = school["id"]
        print(f"Testing onboarding init for: {school.get('school_name')}")
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/init-onboarding",
            headers=self.headers
        )
        assert response.status_code == 200, f"Init onboarding failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "tracking_token" in data
        assert "tracking_url" in data
        print(f"✓ Onboarding initialized successfully")
        print(f"  Tracking token: {data.get('tracking_token')}")
        print(f"  Tracking URL: {data.get('tracking_url')}")
    
    def test_get_school_onboarding(self):
        """Test getting onboarding workflow for a school"""
        # Get a school with onboarding
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        with_onboarding = [s for s in data if s.get("onboarding_workflow")]
        if not with_onboarding:
            pytest.skip("No schools with onboarding workflow")
        
        school = with_onboarding[0]
        school_id = school["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/schools/{school_id}/onboarding",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get onboarding failed: {response.text}"
        data = response.json()
        
        assert "school_id" in data
        assert "school_name" in data
        assert "workflow" in data
        print(f"✓ Got onboarding data for: {data.get('school_name')}")


class TestPublicTrackingPage:
    """Test public tracking page endpoints (no auth required)"""
    
    def get_tracking_token(self):
        """Helper to get a valid tracking token"""
        # Login to get schools
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        data = response.json()
        
        with_onboarding = [s for s in data if s.get("onboarding_workflow")]
        if with_onboarding:
            return with_onboarding[0]["onboarding_workflow"]["tracking_token"]
        return None
    
    def test_public_tracking_endpoint(self):
        """Test public tracking page endpoint"""
        tracking_token = self.get_tracking_token()
        if not tracking_token:
            pytest.skip("No tracking token available")
        
        # This endpoint should work without auth
        response = requests.get(f"{BASE_URL}/api/track/{tracking_token}")
        assert response.status_code == 200, f"Tracking failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "school_name" in data
        assert "contact_name" in data
        assert "progress_percent" in data
        assert "completed_steps" in data
        assert "total_steps" in data
        assert "steps" in data
        assert "current_step" in data
        
        print(f"✓ Public tracking page works")
        print(f"  School: {data.get('school_name')}")
        print(f"  Progress: {data.get('progress_percent')}%")
        print(f"  Steps: {data.get('completed_steps')}/{data.get('total_steps')}")
        print(f"  Current step: {data.get('current_step')}")
        
        # Verify steps structure
        steps = data.get("steps", [])
        assert len(steps) == 9, f"Expected 9 steps, got {len(steps)}"
        for step in steps:
            assert "key" in step
            assert "title" in step
            assert "completed" in step
        print(f"  All 9 onboarding steps present")
        
        return tracking_token
    
    def test_invalid_tracking_token(self):
        """Test tracking with invalid token returns 404"""
        response = requests.get(f"{BASE_URL}/api/track/invalid-token-12345")
        assert response.status_code == 404
        print("✓ Invalid tracking token returns 404")


class TestSupportTickets:
    """Test support ticket functionality from tracking page"""
    
    def get_tracking_token(self):
        """Helper to get a valid tracking token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        data = response.json()
        
        with_onboarding = [s for s in data if s.get("onboarding_workflow")]
        if with_onboarding:
            return with_onboarding[0]["onboarding_workflow"]["tracking_token"]
        return None
    
    def test_create_support_ticket_from_tracking(self):
        """Test creating support ticket from tracking page (no auth)"""
        tracking_token = self.get_tracking_token()
        if not tracking_token:
            pytest.skip("No tracking token available")
        
        ticket_data = {
            "step": "kit_delivery",
            "query_type": "track_shipment",
            "description": "TEST: Automated test ticket - please ignore",
            "priority": "medium"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/track/{tracking_token}/support-ticket",
            json=ticket_data
        )
        assert response.status_code == 200, f"Create ticket failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "ticket_id" in data
        assert data["ticket_id"].startswith("TKT-")
        print(f"✓ Support ticket created: {data.get('ticket_id')}")
        print(f"  Message: {data.get('message')}")
        
        return data.get("ticket_id")
    
    def test_get_tracking_tickets_admin(self):
        """Test admin endpoint to get tracking page tickets"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/support/tracking-tickets",
            headers=headers
        )
        assert response.status_code == 200, f"Get tickets failed: {response.text}"
        data = response.json()
        
        assert "tickets" in data
        assert "total" in data
        print(f"✓ Got {data.get('total')} tracking page tickets")
        
        # Verify ticket structure
        if data["tickets"]:
            ticket = data["tickets"][0]
            assert "id" in ticket
            assert "school_name" in ticket
            assert "query_type" in ticket
            assert "status" in ticket
            assert "source" in ticket
            assert ticket["source"] == "tracking_page"
            print(f"  Latest ticket: {ticket.get('id')} - {ticket.get('query_type')}")


class TestOnboardingStepUpdate:
    """Test updating onboarding steps"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_update_onboarding_step(self):
        """Test updating an onboarding step"""
        # Get a school with onboarding
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        with_onboarding = [s for s in data if s.get("onboarding_workflow")]
        if not with_onboarding:
            pytest.skip("No schools with onboarding workflow")
        
        school = with_onboarding[0]
        school_id = school["id"]
        
        # Update a step (just add data, don't mark complete to avoid affecting real data)
        response = requests.patch(
            f"{BASE_URL}/api/schools/{school_id}/onboarding-step/kit_delivery",
            json={
                "data": {"test_note": "Automated test update"}
            },
            headers=self.headers
        )
        assert response.status_code == 200, f"Update step failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        print(f"✓ Onboarding step update works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
