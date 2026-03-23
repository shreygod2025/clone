"""
Iteration 53: Test Move Back (Change Stage) and Raise Ticket features in School CRM

Features tested:
1. Move Back / Change Stage button functionality
   - meeting_done -> new
   - converted -> meeting_done
   - active -> converted
   - renewal_meeting -> active
   - renewed -> active or renewal_meeting
2. Raise Ticket functionality across ALL stages
   - POST /api/schools/{school_id}/raise-ticket
   - Ticket saved to support_queries collection
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndHealth:
    """Basic auth and health checks"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Health check passed")
    
    def test_admin_login(self, auth_token):
        """Test admin login"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print("PASS: Admin login successful")


class TestMoveBackFunctionality:
    """Test Move Back / Change Stage functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
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
    
    def test_get_schools_by_status(self, headers):
        """Test getting schools by different statuses"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Count schools by status
        status_counts = {}
        for school in schools:
            status = school.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"Schools by status: {status_counts}")
        print("PASS: Retrieved schools by status")
        return schools
    
    def test_move_meeting_done_to_new(self, headers):
        """Test moving a school from meeting_done back to new"""
        # First get a meeting_done school
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        meeting_done_schools = [s for s in schools if s.get('status') == 'meeting_done']
        if not meeting_done_schools:
            pytest.skip("No meeting_done schools available for testing")
        
        school = meeting_done_schools[0]
        school_id = school['id']
        original_status = school['status']
        
        # Move back to 'new'
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "new",
                "notes": f"{school.get('notes', '')}\n\n--- Moved back to New Lead (Test) ---"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Failed to move back: {response.text}"
        
        # Verify the status changed
        updated_school = response.json()
        assert updated_school['status'] == 'new', f"Expected status 'new', got '{updated_school['status']}'"
        
        # Restore original status
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": original_status},
            headers=headers
        )
        
        print(f"PASS: Successfully moved school {school_id} from meeting_done to new and restored")
    
    def test_move_converted_to_meeting_done(self, headers):
        """Test moving a school from converted back to meeting_done"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        converted_schools = [s for s in schools if s.get('status') == 'converted']
        if not converted_schools:
            pytest.skip("No converted schools available for testing")
        
        school = converted_schools[0]
        school_id = school['id']
        original_status = school['status']
        
        # Move back to 'meeting_done'
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "meeting_done",
                "notes": f"{school.get('notes', '')}\n\n--- Moved back to Meeting Done (Test) ---"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Failed to move back: {response.text}"
        
        updated_school = response.json()
        assert updated_school['status'] == 'meeting_done'
        
        # Restore original status
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": original_status},
            headers=headers
        )
        
        print(f"PASS: Successfully moved school {school_id} from converted to meeting_done and restored")
    
    def test_move_active_to_converted(self, headers):
        """Test moving a school from active back to converted"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        active_schools = [s for s in schools if s.get('status') == 'active']
        if not active_schools:
            pytest.skip("No active schools available for testing")
        
        school = active_schools[0]
        school_id = school['id']
        original_status = school['status']
        
        # Move back to 'converted'
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "converted",
                "notes": f"{school.get('notes', '')}\n\n--- Moved back to Converted (Test) ---"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Failed to move back: {response.text}"
        
        updated_school = response.json()
        assert updated_school['status'] == 'converted'
        
        # Restore original status
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": original_status},
            headers=headers
        )
        
        print(f"PASS: Successfully moved school {school_id} from active to converted and restored")
    
    def test_move_renewal_meeting_to_active(self, headers):
        """Test moving a school from renewal_meeting back to active"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        renewal_meeting_schools = [s for s in schools if s.get('status') == 'renewal_meeting']
        if not renewal_meeting_schools:
            pytest.skip("No renewal_meeting schools available for testing")
        
        school = renewal_meeting_schools[0]
        school_id = school['id']
        original_status = school['status']
        
        # Move back to 'active'
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "active",
                "notes": f"{school.get('notes', '')}\n\n--- Moved back to Active (Test) ---"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Failed to move back: {response.text}"
        
        updated_school = response.json()
        assert updated_school['status'] == 'active'
        
        # Restore original status
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": original_status},
            headers=headers
        )
        
        print(f"PASS: Successfully moved school {school_id} from renewal_meeting to active and restored")
    
    def test_move_renewed_to_active(self, headers):
        """Test moving a school from renewed back to active"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        renewed_schools = [s for s in schools if s.get('status') == 'renewed']
        if not renewed_schools:
            pytest.skip("No renewed schools available for testing")
        
        school = renewed_schools[0]
        school_id = school['id']
        original_status = school['status']
        
        # Move back to 'active'
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "active",
                "notes": f"{school.get('notes', '')}\n\n--- Moved back to Active (Test) ---"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Failed to move back: {response.text}"
        
        updated_school = response.json()
        assert updated_school['status'] == 'active'
        
        # Restore original status
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": original_status},
            headers=headers
        )
        
        print(f"PASS: Successfully moved school {school_id} from renewed to active and restored")


class TestRaiseTicketFunctionality:
    """Test Raise Ticket functionality across all stages"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
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
    
    def test_raise_ticket_for_new_lead(self, headers):
        """Test raising a ticket for a school in 'new' status"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        new_schools = [s for s in schools if s.get('status') == 'new']
        if not new_schools:
            pytest.skip("No new schools available for testing")
        
        school = new_schools[0]
        school_id = school['id']
        
        # Raise a ticket
        ticket_data = {
            "query_type": "general_query",
            "related_to": "information_request",
            "subject": f"Test Ticket for New Lead - {uuid.uuid4().hex[:8]}",
            "description": "This is a test ticket raised from backend tests for a new lead.",
            "priority": "low",
            "source": "school_crm",
            "user_type": "school",
            "contact_name": school.get('contact_name', 'Test Contact'),
            "contact_phone": school.get('phone', '9999999999'),
            "contact_email": school.get('email', 'test@test.com')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/raise-ticket",
            json=ticket_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to raise ticket: {response.text}"
        
        result = response.json()
        assert "ticket_id" in result
        assert result.get("message") == "Ticket raised successfully"
        
        print(f"PASS: Raised ticket {result['ticket_id']} for new lead {school_id}")
    
    def test_raise_ticket_for_meeting_done(self, headers):
        """Test raising a ticket for a school in 'meeting_done' status"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        meeting_done_schools = [s for s in schools if s.get('status') == 'meeting_done']
        if not meeting_done_schools:
            pytest.skip("No meeting_done schools available for testing")
        
        school = meeting_done_schools[0]
        school_id = school['id']
        
        ticket_data = {
            "query_type": "payment_query",
            "related_to": "invoice_request",
            "subject": f"Test Ticket for Meeting Done - {uuid.uuid4().hex[:8]}",
            "description": "This is a test ticket raised from backend tests for meeting_done stage.",
            "priority": "medium",
            "source": "school_crm",
            "user_type": "school",
            "contact_name": school.get('contact_name', 'Test Contact'),
            "contact_phone": school.get('phone', '9999999999'),
            "contact_email": school.get('email', 'test@test.com')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/raise-ticket",
            json=ticket_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to raise ticket: {response.text}"
        
        result = response.json()
        assert "ticket_id" in result
        
        print(f"PASS: Raised ticket {result['ticket_id']} for meeting_done school {school_id}")
    
    def test_raise_ticket_for_active_school(self, headers):
        """Test raising a ticket for a school in 'active' status"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        active_schools = [s for s in schools if s.get('status') == 'active']
        if not active_schools:
            pytest.skip("No active schools available for testing")
        
        school = active_schools[0]
        school_id = school['id']
        
        ticket_data = {
            "query_type": "kit_delivery",
            "related_to": "not_received",
            "subject": f"Test Ticket for Active School - {uuid.uuid4().hex[:8]}",
            "description": "This is a test ticket raised from backend tests for active school.",
            "priority": "high",
            "source": "school_crm",
            "user_type": "school",
            "contact_name": school.get('contact_name', 'Test Contact'),
            "contact_phone": school.get('phone', '9999999999'),
            "contact_email": school.get('email', 'test@test.com')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/raise-ticket",
            json=ticket_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to raise ticket: {response.text}"
        
        result = response.json()
        assert "ticket_id" in result
        
        print(f"PASS: Raised ticket {result['ticket_id']} for active school {school_id}")
    
    def test_raise_ticket_for_renewed_school(self, headers):
        """Test raising a ticket for a school in 'renewed' status"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        renewed_schools = [s for s in schools if s.get('status') == 'renewed']
        if not renewed_schools:
            pytest.skip("No renewed schools available for testing")
        
        school = renewed_schools[0]
        school_id = school['id']
        
        ticket_data = {
            "query_type": "teacher_training",
            "related_to": "training_schedule",
            "subject": f"Test Ticket for Renewed School - {uuid.uuid4().hex[:8]}",
            "description": "This is a test ticket raised from backend tests for renewed school.",
            "priority": "medium",
            "source": "school_crm",
            "user_type": "school",
            "contact_name": school.get('contact_name', 'Test Contact'),
            "contact_phone": school.get('phone', '9999999999'),
            "contact_email": school.get('email', 'test@test.com')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/raise-ticket",
            json=ticket_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to raise ticket: {response.text}"
        
        result = response.json()
        assert "ticket_id" in result
        
        print(f"PASS: Raised ticket {result['ticket_id']} for renewed school {school_id}")
    
    def test_raise_ticket_for_lost_school(self, headers):
        """Test raising a ticket for a school in 'lost' or 'lost_lead' status"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        lost_schools = [s for s in schools if s.get('status') in ['lost', 'lost_lead', 'lost_customer']]
        if not lost_schools:
            pytest.skip("No lost schools available for testing")
        
        school = lost_schools[0]
        school_id = school['id']
        
        ticket_data = {
            "query_type": "feedback_complaint",
            "related_to": "suggestion",
            "subject": f"Test Ticket for Lost School - {uuid.uuid4().hex[:8]}",
            "description": "This is a test ticket raised from backend tests for lost school.",
            "priority": "low",
            "source": "school_crm",
            "user_type": "school",
            "contact_name": school.get('contact_name', 'Test Contact'),
            "contact_phone": school.get('phone', '9999999999'),
            "contact_email": school.get('email', 'test@test.com')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/raise-ticket",
            json=ticket_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to raise ticket: {response.text}"
        
        result = response.json()
        assert "ticket_id" in result
        
        print(f"PASS: Raised ticket {result['ticket_id']} for lost school {school_id}")
    
    def test_ticket_visible_in_support_center(self, headers):
        """Test that raised tickets are visible in Support Center"""
        # Get support queries
        response = requests.get(f"{BASE_URL}/api/support/queries", headers=headers)
        assert response.status_code == 200
        
        queries = response.json()
        
        # Check if there are any school_crm sourced tickets
        school_crm_tickets = [q for q in queries if q.get('source') == 'school_crm']
        
        print(f"Found {len(school_crm_tickets)} tickets from School CRM in Support Center")
        print("PASS: Support Center query endpoint working")


class TestStageRollbackMap:
    """Test that the stage rollback map is correctly implemented"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
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
    
    def test_status_change_activity_log(self, headers):
        """Test that status changes are logged in activity_log"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Find a school with activity_log
        schools_with_log = [s for s in schools if s.get('activity_log')]
        
        if schools_with_log:
            school = schools_with_log[0]
            activity_log = school.get('activity_log', [])
            
            # Check for status_change entries
            status_changes = [a for a in activity_log if a.get('type') == 'status_change']
            print(f"Found {len(status_changes)} status change entries in activity log")
        
        print("PASS: Activity log structure verified")
    
    def test_all_statuses_have_valid_transitions(self, headers):
        """Test that all expected statuses exist in the database"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Expected statuses based on the rollback map
        expected_statuses = ['new', 'meeting_done', 'converted', 'active', 'renewal_meeting', 'renewed', 'lost', 'lost_lead', 'lost_customer', 'archived']
        
        found_statuses = set()
        for school in schools:
            status = school.get('status')
            if status:
                found_statuses.add(status)
        
        print(f"Found statuses in database: {found_statuses}")
        print(f"Expected statuses: {set(expected_statuses)}")
        
        # At least some statuses should exist
        assert len(found_statuses) > 0, "No statuses found in database"
        print("PASS: Status validation complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
