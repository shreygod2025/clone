"""
Test Suite for OLL Platform - Support Center and CRM Features
Tests:
- P0 Bug Fix: Support queries from Student Funnel appearing in admin Support Center
- P1 Feature: Assign Lead functionality in Student, School, and Growth Partners CRM
- P1 Feature: Comment/Note functionality in School CRM
- Support Center displays queries from 3 sources
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


class TestSetup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestHealthCheck(TestSetup):
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestSupportQueryP0BugFix(TestSetup):
    """P0 Bug Fix: Support queries from SupportFlow should appear in admin Support Center"""
    
    def test_create_support_query_from_student_funnel(self, auth_headers):
        """Test creating a support query via POST /api/support/query (SupportFlow.jsx)"""
        test_id = str(uuid.uuid4())[:8]
        query_data = {
            "main_category": "demo",
            "category": "reschedule",
            "sub_category": "",
            "phone": f"TEST_{test_id}_9876543210",
            "email": f"test_{test_id}@example.com",
            "contact_name": f"TEST_Support_User_{test_id}",
            "details": f"TEST: I need to reschedule my demo - {test_id}",
            "new_date": "2025-01-15",
            "new_time": "14:00"
        }
        
        response = requests.post(f"{BASE_URL}/api/support/query", json=query_data)
        assert response.status_code == 200, f"Failed to create support query: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ Support query created with ID: {data['id']}")
        return data["id"]
    
    def test_get_support_queries_endpoint_exists(self, auth_headers):
        """Test GET /api/support/queries endpoint exists and returns data"""
        response = requests.get(f"{BASE_URL}/api/support/queries", headers=auth_headers)
        assert response.status_code == 200, f"GET /api/support/queries failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/support/queries returned {len(data)} queries")
        return data
    
    def test_support_query_appears_in_admin_panel(self, auth_headers):
        """Test that support queries from SupportFlow appear in admin panel"""
        # First create a unique query
        test_id = str(uuid.uuid4())[:8]
        query_data = {
            "main_category": "other",
            "category": "",
            "phone": f"TEST_{test_id}_1234567890",
            "contact_name": f"TEST_Admin_Check_{test_id}",
            "details": f"TEST: Query for admin panel verification - {test_id}"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/support/query", json=query_data)
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        
        # Now fetch all support queries and verify our query is there
        get_response = requests.get(f"{BASE_URL}/api/support/queries", headers=auth_headers)
        assert get_response.status_code == 200
        queries = get_response.json()
        
        # Find our created query
        found_query = next((q for q in queries if q.get("id") == created_id), None)
        assert found_query is not None, f"Created query {created_id} not found in admin panel"
        assert found_query.get("contact_name") == f"TEST_Admin_Check_{test_id}"
        print(f"✓ Support query {created_id} appears in admin Support Center")


class TestSupportCenterThreeSources(TestSetup):
    """Test Support Center displays queries from 3 sources"""
    
    def test_inquiry_queries_endpoint(self, auth_headers):
        """Test /api/inquiry/queries endpoint (Team Inquiries)"""
        response = requests.get(f"{BASE_URL}/api/inquiry/queries", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✓ Team Inquiries endpoint works - {len(response.json())} queries")
    
    def test_support_queries_endpoint(self, auth_headers):
        """Test /api/support/queries endpoint (User Support from SupportFlow)"""
        response = requests.get(f"{BASE_URL}/api/support/queries", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✓ User Support endpoint works - {len(response.json())} queries")
    
    def test_support_tickets_endpoint(self, auth_headers):
        """Test /api/support/tickets endpoint (Legacy Tickets)"""
        response = requests.get(f"{BASE_URL}/api/support/tickets", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✓ Legacy Tickets endpoint works - {len(response.json())} tickets")
    
    def test_update_support_query_status(self, auth_headers):
        """Test updating support query status"""
        # Create a query first
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/support/query", json={
            "main_category": "demo",
            "phone": f"TEST_{test_id}",
            "contact_name": f"TEST_Status_{test_id}",
            "details": "Test status update"
        })
        assert create_response.status_code == 200
        query_id = create_response.json()["id"]
        
        # Update status
        update_response = requests.patch(
            f"{BASE_URL}/api/support/queries/{query_id}",
            json={"status": "in_progress"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Failed to update status: {update_response.text}"
        print(f"✓ Support query status updated successfully")


class TestStudentCRMAssignLead(TestSetup):
    """P1 Feature: Assign Lead functionality in Student CRM"""
    
    def test_get_team_users(self, auth_headers):
        """Test fetching team users for assignment"""
        response = requests.get(f"{BASE_URL}/api/team-users", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        team_users = response.json()
        print(f"✓ Team users endpoint works - {len(team_users)} users found")
        return team_users
    
    def test_create_student_inquiry_for_assignment(self, auth_headers):
        """Create a student inquiry to test assignment"""
        test_id = str(uuid.uuid4())[:8]
        inquiry_data = {
            "name": f"TEST_Assign_Student_{test_id}",
            "email": f"test_assign_{test_id}@example.com",
            "phone": f"TEST_{test_id}",
            "learner_type": "self",
            "age_group": "9-12 years",
            "skill": "robotics",
            "learning_mode": "online",
            "city": "Mumbai",
            "learning_goal": "skill_building",
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json=inquiry_data)
        assert response.status_code == 200, f"Failed to create inquiry: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ Student inquiry created: {data['id']}")
        return data["id"]
    
    def test_assign_student_lead(self, auth_headers):
        """Test assigning a student lead to a team member"""
        # First create an inquiry
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "name": f"TEST_Assign_{test_id}",
            "email": f"test_{test_id}@example.com",
            "phone": f"TEST_{test_id}",
            "learner_type": "self",
            "skill": "coding"
        })
        assert create_response.status_code == 200
        inquiry_id = create_response.json()["id"]
        
        # Assign to a fake user ID (testing the API accepts the field)
        fake_user_id = str(uuid.uuid4())
        assign_response = requests.patch(
            f"{BASE_URL}/api/students/inquiry/{inquiry_id}",
            json={"assigned_to": fake_user_id},
            headers=auth_headers
        )
        assert assign_response.status_code == 200, f"Failed to assign: {assign_response.text}"
        
        # Verify assignment persisted
        get_response = requests.get(
            f"{BASE_URL}/api/students/inquiry/{inquiry_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("assigned_to") == fake_user_id, "Assignment not persisted"
        print(f"✓ Student lead assigned successfully to {fake_user_id}")
    
    def test_unassign_student_lead(self, auth_headers):
        """Test unassigning a student lead"""
        # Create and assign
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "name": f"TEST_Unassign_{test_id}",
            "email": f"test_{test_id}@example.com",
            "phone": f"TEST_{test_id}",
            "learner_type": "self",
            "skill": "ai"
        })
        inquiry_id = create_response.json()["id"]
        
        # Assign first
        requests.patch(
            f"{BASE_URL}/api/students/inquiry/{inquiry_id}",
            json={"assigned_to": "some-user-id"},
            headers=auth_headers
        )
        
        # Unassign (empty string)
        unassign_response = requests.patch(
            f"{BASE_URL}/api/students/inquiry/{inquiry_id}",
            json={"assigned_to": ""},
            headers=auth_headers
        )
        assert unassign_response.status_code == 200
        
        # Verify unassignment
        get_response = requests.get(
            f"{BASE_URL}/api/students/inquiry/{inquiry_id}",
            headers=auth_headers
        )
        data = get_response.json()
        assert data.get("assigned_to") == "", "Unassignment not persisted"
        print(f"✓ Student lead unassigned successfully")


class TestSchoolCRMAssignLead(TestSetup):
    """P1 Feature: Assign Lead functionality in School CRM"""
    
    def test_create_school_inquiry_for_assignment(self, auth_headers):
        """Create a school inquiry to test assignment"""
        test_id = str(uuid.uuid4())[:8]
        inquiry_data = {
            "school_name": f"TEST_School_{test_id}",
            "contact_name": f"TEST_Contact_{test_id}",
            "email": f"test_school_{test_id}@example.com",
            "phone": f"TEST_{test_id}",
            "location": "Mumbai",
            "school_size": "500-1000",
            "fee_range": "50000-100000",
            "board": "CBSE",
            "programs_interested": ["robotics", "coding"],
            "support_needed": ["curriculum"],
            "meeting_type": "offline",
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/schools/inquiry", json=inquiry_data)
        assert response.status_code == 200, f"Failed to create school inquiry: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ School inquiry created: {data['id']}")
        return data["id"]
    
    def test_assign_school_lead(self, auth_headers):
        """Test assigning a school lead to a team member"""
        # Create inquiry
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": f"TEST_Assign_School_{test_id}",
            "contact_name": f"TEST_Contact_{test_id}",
            "email": f"test_{test_id}@school.com",
            "phone": f"TEST_{test_id}",
            "location": "Delhi",
            "programs_interested": [],
            "support_needed": []
        })
        assert create_response.status_code == 200
        inquiry_id = create_response.json()["id"]
        
        # Assign
        fake_user_id = str(uuid.uuid4())
        assign_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{inquiry_id}",
            json={"assigned_to": fake_user_id},
            headers=auth_headers
        )
        assert assign_response.status_code == 200, f"Failed to assign school lead: {assign_response.text}"
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert get_response.status_code == 200
        inquiries = get_response.json()
        found = next((i for i in inquiries if i.get("id") == inquiry_id), None)
        assert found is not None
        assert found.get("assigned_to") == fake_user_id
        print(f"✓ School lead assigned successfully")


class TestSchoolCRMCommentNote(TestSetup):
    """P1 Feature: Comment/Note functionality in School CRM"""
    
    def test_add_comment_to_school_inquiry(self, auth_headers):
        """Test adding a comment to a school inquiry"""
        # Create inquiry
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": f"TEST_Comment_School_{test_id}",
            "contact_name": f"TEST_Contact_{test_id}",
            "email": f"test_{test_id}@school.com",
            "phone": f"TEST_{test_id}",
            "location": "Bangalore",
            "programs_interested": [],
            "support_needed": []
        })
        assert create_response.status_code == 200
        inquiry_id = create_response.json()["id"]
        
        # Add comment
        comment_text = f"TEST: This is a test comment - {test_id}"
        comment_response = requests.post(
            f"{BASE_URL}/api/schools/comment/{inquiry_id}",
            json={"text": comment_text},
            headers=auth_headers
        )
        assert comment_response.status_code == 200, f"Failed to add comment: {comment_response.text}"
        data = comment_response.json()
        assert "comment" in data
        assert data["comment"]["text"] == comment_text
        print(f"✓ Comment added to school inquiry successfully")
    
    def test_get_comments_from_school_inquiry(self, auth_headers):
        """Test retrieving comments from a school inquiry"""
        # Create inquiry and add comment
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": f"TEST_GetComment_School_{test_id}",
            "contact_name": f"TEST_Contact_{test_id}",
            "email": f"test_{test_id}@school.com",
            "phone": f"TEST_{test_id}",
            "location": "Chennai",
            "programs_interested": [],
            "support_needed": []
        })
        inquiry_id = create_response.json()["id"]
        
        # Add comment
        comment_text = f"TEST: Comment to retrieve - {test_id}"
        requests.post(
            f"{BASE_URL}/api/schools/comment/{inquiry_id}",
            json={"text": comment_text},
            headers=auth_headers
        )
        
        # Get comments
        get_response = requests.get(
            f"{BASE_URL}/api/schools/comments/{inquiry_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200, f"Failed to get comments: {get_response.text}"
        comments = get_response.json()
        assert isinstance(comments, list)
        assert len(comments) > 0
        assert any(c.get("text") == comment_text for c in comments)
        print(f"✓ Comments retrieved from school inquiry successfully")


class TestGrowthPartnersCRMAssignLead(TestSetup):
    """P1 Feature: Assign Lead functionality in Growth Partners CRM"""
    
    def test_create_growth_partner_for_assignment(self, auth_headers):
        """Create a growth partner to test assignment"""
        test_id = str(uuid.uuid4())[:8]
        partner_data = {
            "name": f"TEST_Partner_{test_id}",
            "email": f"test_partner_{test_id}@example.com",
            "phone": f"TEST_{test_id}",
            "city": "Mumbai",
            "interest_type": "franchise",
            "details": f"TEST: Growth partner for assignment test - {test_id}",
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/growth-partners", json=partner_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create growth partner: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ Growth partner created: {data['id']}")
        return data["id"]
    
    def test_assign_growth_partner_lead(self, auth_headers):
        """Test assigning a growth partner lead to a team member"""
        # Create partner
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json={
            "name": f"TEST_Assign_Partner_{test_id}",
            "email": f"test_{test_id}@partner.com",
            "phone": f"TEST_{test_id}",
            "city": "Delhi",
            "interest_type": "partnership",
            "source": "website"
        }, headers=auth_headers)
        assert create_response.status_code == 200
        partner_id = create_response.json()["id"]
        
        # Assign
        fake_user_id = str(uuid.uuid4())
        assign_response = requests.patch(
            f"{BASE_URL}/api/growth-partners/{partner_id}",
            json={"assigned_to": fake_user_id},
            headers=auth_headers
        )
        assert assign_response.status_code == 200, f"Failed to assign growth partner: {assign_response.text}"
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/growth-partners", headers=auth_headers)
        assert get_response.status_code == 200
        partners = get_response.json()
        found = next((p for p in partners if p.get("id") == partner_id), None)
        assert found is not None
        assert found.get("assigned_to") == fake_user_id
        print(f"✓ Growth partner lead assigned successfully")
    
    def test_add_comment_to_growth_partner(self, auth_headers):
        """Test adding a comment to a growth partner"""
        # Create partner
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json={
            "name": f"TEST_Comment_Partner_{test_id}",
            "email": f"test_{test_id}@partner.com",
            "phone": f"TEST_{test_id}",
            "city": "Bangalore",
            "interest_type": "investment",
            "source": "website"
        }, headers=auth_headers)
        partner_id = create_response.json()["id"]
        
        # Add comment
        comment_text = f"TEST: Growth partner comment - {test_id}"
        comment_response = requests.post(
            f"{BASE_URL}/api/growth_partners/comment/{partner_id}",
            json={"text": comment_text},
            headers=auth_headers
        )
        assert comment_response.status_code == 200, f"Failed to add comment: {comment_response.text}"
        print(f"✓ Comment added to growth partner successfully")


class TestStudentCRMCommentNote(TestSetup):
    """Test Comment/Note functionality in Student CRM"""
    
    def test_add_comment_to_student_inquiry(self, auth_headers):
        """Test adding a comment to a student inquiry"""
        # Create inquiry
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "name": f"TEST_Comment_Student_{test_id}",
            "email": f"test_{test_id}@student.com",
            "phone": f"TEST_{test_id}",
            "learner_type": "self",
            "skill": "robotics"
        })
        assert create_response.status_code == 200
        inquiry_id = create_response.json()["id"]
        
        # Add comment
        comment_text = f"TEST: Student comment - {test_id}"
        comment_response = requests.post(
            f"{BASE_URL}/api/students/comment/{inquiry_id}",
            json={"text": comment_text},
            headers=auth_headers
        )
        assert comment_response.status_code == 200, f"Failed to add comment: {comment_response.text}"
        data = comment_response.json()
        assert "comment" in data
        print(f"✓ Comment added to student inquiry successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
