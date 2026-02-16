"""
Test: School CRM Role-Based Lead Filtering
Verifies that:
- Admin users can see ALL school leads
- Team members can only see leads assigned to them, added by them, or where they're the relationship manager
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"
TEAM_EMAIL = "john@oll.co"
TEAM_PASSWORD = "test1234"

# Expected values based on agent_to_agent_context_note
EXPECTED_ADMIN_LEAD_COUNT = 80
EXPECTED_JOHN_LEAD_COUNT = 71
JOHN_USER_ID = "5841e68d-30f2-4a26-8179-d2390543da9f"


class TestSchoolCRMRoleBasedFiltering:
    """Test role-based filtering for school leads"""
    
    @pytest.fixture
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture
    def admin_token(self, api_client):
        """Get admin authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.fail(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def team_token(self, api_client):
        """Get team member authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_EMAIL,
            "password": TEAM_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.fail(f"Team member login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def authenticated_admin(self, api_client, admin_token):
        """Session with admin auth header"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        return api_client
    
    @pytest.fixture
    def authenticated_team(self, api_client, team_token):
        """Session with team member auth header"""
        api_client.headers.update({"Authorization": f"Bearer {team_token}"})
        return api_client
    
    # ============ LOGIN TESTS ============
    
    def test_admin_login_success(self, api_client):
        """Test admin can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("role") == "admin", "User role should be admin"
        print(f"✅ Admin login successful - Role: {data.get('user', {}).get('role')}")
    
    def test_team_member_login_success(self, api_client):
        """Test team member can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_EMAIL,
            "password": TEAM_PASSWORD
        })
        assert response.status_code == 200, f"Team member login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        user = data.get("user", {})
        print(f"✅ Team member login successful - Role: {user.get('role')}, User ID: {user.get('id')}")
    
    # ============ ADMIN LEAD COUNT TESTS ============
    
    def test_admin_sees_all_leads(self):
        """Test admin can see all 80 school leads"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        admin_token = login_response.json().get("access_token")
        
        # Fetch school inquiries
        response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to fetch inquiries: {response.text}"
        
        leads = response.json()
        lead_count = len(leads)
        
        print(f"✅ Admin sees {lead_count} school leads")
        
        # Verify count (allow small variance as data may change)
        assert lead_count >= EXPECTED_ADMIN_LEAD_COUNT - 5, f"Admin should see ~{EXPECTED_ADMIN_LEAD_COUNT} leads, got {lead_count}"
        print(f"✅ Admin lead count verified: {lead_count} (expected ~{EXPECTED_ADMIN_LEAD_COUNT})")
    
    # ============ TEAM MEMBER LEAD COUNT TESTS ============
    
    def test_team_member_sees_only_assigned_leads(self):
        """Test team member only sees leads assigned to them, added by them, or where they're RM"""
        # Login as team member
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_EMAIL,
            "password": TEAM_PASSWORD
        })
        assert login_response.status_code == 200, f"Team login failed: {login_response.text}"
        team_token = login_response.json().get("access_token")
        user_id = login_response.json().get("user", {}).get("id")
        
        print(f"Team member logged in - User ID: {user_id}")
        
        # Fetch school inquiries
        response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers={"Authorization": f"Bearer {team_token}"}
        )
        assert response.status_code == 200, f"Failed to fetch inquiries: {response.text}"
        
        leads = response.json()
        lead_count = len(leads)
        
        print(f"✅ Team member ({TEAM_EMAIL}) sees {lead_count} school leads")
        
        # Verify count - should be less than admin sees
        assert lead_count < EXPECTED_ADMIN_LEAD_COUNT, f"Team member should see fewer leads than admin ({EXPECTED_ADMIN_LEAD_COUNT})"
        
        # Verify it's approximately the expected count (allow variance)
        assert lead_count >= EXPECTED_JOHN_LEAD_COUNT - 10, f"Team member should see ~{EXPECTED_JOHN_LEAD_COUNT} leads, got {lead_count}"
        
        print(f"✅ Team member lead count verified: {lead_count} (expected ~{EXPECTED_JOHN_LEAD_COUNT})")
    
    def test_team_member_leads_have_correct_ownership(self):
        """Verify all leads returned to team member have correct ownership relationship"""
        # Login as team member
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_EMAIL,
            "password": TEAM_PASSWORD
        })
        assert login_response.status_code == 200
        team_token = login_response.json().get("access_token")
        user_id = login_response.json().get("user", {}).get("id")
        
        # Fetch school inquiries
        response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers={"Authorization": f"Bearer {team_token}"}
        )
        assert response.status_code == 200
        
        leads = response.json()
        
        # Check each lead has the correct ownership relationship
        invalid_leads = []
        for lead in leads:
            assigned_to = lead.get("assigned_to", "")
            added_by = lead.get("added_by", "")
            rm_id = lead.get("relationship_manager_id", "")
            
            is_valid = (
                assigned_to == user_id or 
                added_by == user_id or 
                rm_id == user_id
            )
            
            if not is_valid:
                invalid_leads.append({
                    "id": lead.get("id"),
                    "school_name": lead.get("school_name"),
                    "assigned_to": assigned_to,
                    "added_by": added_by,
                    "relationship_manager_id": rm_id
                })
        
        if invalid_leads:
            print(f"❌ Found {len(invalid_leads)} leads without proper ownership:")
            for lead in invalid_leads[:5]:  # Print first 5
                print(f"   - {lead}")
        
        assert len(invalid_leads) == 0, f"Team member should only see leads where they're assigned/added/RM. Found {len(invalid_leads)} invalid leads."
        print(f"✅ All {len(leads)} leads have correct ownership relationship with user {user_id}")
    
    # ============ COMPARISON TESTS ============
    
    def test_admin_sees_more_leads_than_team_member(self):
        """Verify admin sees more leads than team member (role-based filtering works)"""
        # Get admin leads
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_login.json().get("access_token")
        admin_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_lead_count = len(admin_response.json())
        
        # Get team member leads
        team_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_EMAIL,
            "password": TEAM_PASSWORD
        })
        team_token = team_login.json().get("access_token")
        team_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers={"Authorization": f"Bearer {team_token}"}
        )
        team_lead_count = len(team_response.json())
        
        print(f"Admin sees: {admin_lead_count} leads")
        print(f"Team member sees: {team_lead_count} leads")
        print(f"Difference: {admin_lead_count - team_lead_count} leads")
        
        assert admin_lead_count > team_lead_count, "Admin should see more leads than team member"
        print(f"✅ Role-based filtering verified: Admin ({admin_lead_count}) > Team ({team_lead_count})")
    
    # ============ FILTER TESTS ============
    
    def test_admin_filter_by_status(self):
        """Test admin can filter leads by status"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = login_response.json().get("access_token")
        
        # Test filter by 'new' status
        response = requests.get(
            f"{BASE_URL}/api/schools/inquiries?status=new",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        leads = response.json()
        for lead in leads:
            assert lead.get("status") == "new", f"Lead {lead.get('id')} has status {lead.get('status')}, expected 'new'"
        
        print(f"✅ Admin filter by status 'new' works - returned {len(leads)} leads")
    
    def test_team_member_filter_by_status(self):
        """Test team member can filter leads by status (within their permitted leads)"""
        # Login as team member
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_EMAIL,
            "password": TEAM_PASSWORD
        })
        team_token = login_response.json().get("access_token")
        
        # Get all leads first
        all_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers={"Authorization": f"Bearer {team_token}"}
        )
        all_leads = all_response.json()
        
        # Filter by status 'converted'
        filtered_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries?status=converted",
            headers={"Authorization": f"Bearer {team_token}"}
        )
        assert filtered_response.status_code == 200
        
        filtered_leads = filtered_response.json()
        
        # Filtered count should be <= all leads
        assert len(filtered_leads) <= len(all_leads), "Filtered leads should be subset of all leads"
        
        # All filtered leads should have 'converted' status
        for lead in filtered_leads:
            assert lead.get("status") == "converted", f"Lead should have status 'converted'"
        
        print(f"✅ Team member filter by status works - All: {len(all_leads)}, Converted: {len(filtered_leads)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
