"""
Test Lost Lead Feature for School CRM
Tests the new lost_lead and lost_customer statuses, lost_reason field,
and the ability to restore lost leads back to their original status.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Module-level variables to share state between tests
auth_token = None
test_school_id = None


def get_auth_token():
    """Get authentication token"""
    global auth_token
    if auth_token:
        return auth_token
    
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Use credentials from task spec
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@oll.co",
        "password": "admin123"
    })
    
    if login_response.status_code == 200:
        auth_token = login_response.json().get("access_token")
        return auth_token
    else:
        print(f"Login failed: {login_response.status_code} - {login_response.text}")
        return None


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def authenticated_client(api_client):
    """Session with auth header"""
    token = get_auth_token()
    if token:
        api_client.headers.update({"Authorization": f"Bearer {token}"})
    return api_client


class TestLostLeadFeature:
    """Tests for Lost Lead/Lost Customer functionality in School CRM"""
    
    # ============ Backend API Tests ============
    
    def test_01_login_success(self, api_client):
        """Test admin login works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print("PASS: Admin login successful")
    
    def test_02_get_school_inquiries(self, authenticated_client):
        """Test fetching school inquiries list"""
        response = authenticated_client.get(f"{BASE_URL}/api/schools/inquiries")
        assert response.status_code == 200, f"Failed to get inquiries: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Got {len(data)} school inquiries")
        
        # Check for existing lost schools
        lost_schools = [s for s in data if s.get('status') in ['lost', 'lost_lead', 'lost_customer']]
        print(f"INFO: Found {len(lost_schools)} lost schools in database")
        
        # Check for new/meeting_done schools (candidates for Lost Lead button)
        new_schools = [s for s in data if s.get('status') == 'new']
        meeting_done_schools = [s for s in data if s.get('status') == 'meeting_done']
        print(f"INFO: Found {len(new_schools)} new leads, {len(meeting_done_schools)} meeting_done schools")
    
    def test_03_create_test_school_for_lost_lead(self, authenticated_client):
        """Create a test school in 'new' status to test Lost Lead flow"""
        global test_school_id
        
        unique_id = str(uuid.uuid4())[:8]
        school_data = {
            "school_name": f"TEST_LostLead_School_{unique_id}",
            "contact_name": "Test Contact",
            "phone": "9876543210",
            "email": f"test_lost_{unique_id}@test.com",
            "location": "Test City",
            "status": "new",
            "notes": "Test school for Lost Lead feature testing"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/schools/inquiry", json=school_data)
        assert response.status_code == 200, f"Failed to create school: {response.text}"
        
        data = response.json()
        assert data.get("id"), "School should have an ID"
        assert data.get("status") == "new", "School should be in 'new' status"
        
        test_school_id = data.get("id")
        print(f"PASS: Created test school with ID: {test_school_id}")
    
    def test_04_mark_school_as_lost_lead(self, authenticated_client):
        """Test marking a school as lost_lead with reason"""
        global test_school_id
        if not test_school_id:
            pytest.skip("No test school created")
        
        update_data = {
            "status": "lost_lead",
            "lost_reason": "Budget constraints - school cannot afford program this year"
        }
        
        response = authenticated_client.patch(
            f"{BASE_URL}/api/schools/inquiry/{test_school_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update school: {response.text}"
        
        data = response.json()
        assert data.get("status") == "lost_lead", f"Status should be 'lost_lead', got: {data.get('status')}"
        assert data.get("lost_reason") == update_data["lost_reason"], "Lost reason should be saved"
        
        print(f"PASS: School marked as lost_lead with reason")
    
    def test_05_verify_lost_lead_in_list(self, authenticated_client):
        """Verify the lost_lead school appears in inquiries list"""
        global test_school_id
        if not test_school_id:
            pytest.skip("No test school created")
        
        response = authenticated_client.get(f"{BASE_URL}/api/schools/inquiries")
        assert response.status_code == 200
        
        data = response.json()
        test_school = next((s for s in data if s.get("id") == test_school_id), None)
        
        assert test_school is not None, "Test school should be in list"
        assert test_school.get("status") == "lost_lead", "Status should be lost_lead"
        assert test_school.get("lost_reason"), "Lost reason should be present"
        
        print(f"PASS: Lost lead school found in list with status: {test_school.get('status')}")
    
    def test_06_restore_lost_lead_to_new(self, authenticated_client):
        """Test restoring a lost_lead back to 'new' status"""
        global test_school_id
        if not test_school_id:
            pytest.skip("No test school created")
        
        update_data = {
            "status": "new"
        }
        
        response = authenticated_client.patch(
            f"{BASE_URL}/api/schools/inquiry/{test_school_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Failed to restore school: {response.text}"
        
        data = response.json()
        assert data.get("status") == "new", f"Status should be 'new', got: {data.get('status')}"
        
        print(f"PASS: Lost lead restored to 'new' status")
    
    def test_07_mark_school_as_lost_customer(self, authenticated_client):
        """Test marking a school as lost_customer (for active/converted schools)"""
        global test_school_id
        if not test_school_id:
            pytest.skip("No test school created")
        
        # First move to meeting_done, then to lost_customer
        authenticated_client.patch(
            f"{BASE_URL}/api/schools/inquiry/{test_school_id}",
            json={"status": "meeting_done"}
        )
        
        update_data = {
            "status": "lost_customer",
            "lost_reason": "Competitor offered lower price"
        }
        
        response = authenticated_client.patch(
            f"{BASE_URL}/api/schools/inquiry/{test_school_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update school: {response.text}"
        
        data = response.json()
        assert data.get("status") == "lost_customer", f"Status should be 'lost_customer', got: {data.get('status')}"
        assert data.get("lost_reason") == update_data["lost_reason"], "Lost reason should be saved"
        
        print(f"PASS: School marked as lost_customer with reason")
    
    def test_08_custom_lost_reason(self, authenticated_client):
        """Test custom lost reason (prefixed with 'custom:')"""
        global test_school_id
        if not test_school_id:
            pytest.skip("No test school created")
        
        update_data = {
            "status": "lost_lead",
            "lost_reason": "custom:School principal changed and new one not interested"
        }
        
        response = authenticated_client.patch(
            f"{BASE_URL}/api/schools/inquiry/{test_school_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update school: {response.text}"
        
        data = response.json()
        assert data.get("lost_reason").startswith("custom:"), "Custom reason should be preserved"
        
        print(f"PASS: Custom lost reason saved correctly")
    
    def test_09_lost_status_in_activity_log(self, authenticated_client):
        """Verify status change to lost is tracked in activity log"""
        global test_school_id
        if not test_school_id:
            pytest.skip("No test school created")
        
        response = authenticated_client.get(f"{BASE_URL}/api/schools/inquiries")
        assert response.status_code == 200
        
        data = response.json()
        test_school = next((s for s in data if s.get("id") == test_school_id), None)
        
        assert test_school is not None, "Test school should be in list"
        
        activity_log = test_school.get("activity_log", [])
        status_changes = [a for a in activity_log if a.get("type") == "status_change"]
        
        # Should have multiple status changes from our tests
        assert len(status_changes) > 0, "Should have status change entries in activity log"
        
        # Check for lost_lead or lost_customer in status changes
        lost_changes = [a for a in status_changes if 'lost' in a.get("new_status", "")]
        assert len(lost_changes) > 0, "Should have lost status changes in activity log"
        
        print(f"PASS: Found {len(lost_changes)} lost status changes in activity log")
    
    def test_10_cleanup_test_school(self, authenticated_client):
        """Cleanup: Delete the test school"""
        global test_school_id
        if not test_school_id:
            pytest.skip("No test school to cleanup")
        
        response = authenticated_client.delete(
            f"{BASE_URL}/api/schools/inquiry/{test_school_id}"
        )
        # Accept 200 or 204 for successful deletion
        assert response.status_code in [200, 204], f"Failed to delete school: {response.text}"
        
        print(f"PASS: Test school cleaned up")
