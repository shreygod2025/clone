"""
Test Team Applications, Growth Partners, and Reports Support Tab functionality
Tests for iteration 25 - merged onboarding tabs and support insights
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"


class TestTeamApplications:
    """Team Applications endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json()["access_token"]
    
    def test_get_team_applications(self, auth_token):
        """Test fetching team applications"""
        response = requests.get(
            f"{BASE_URL}/api/team-applications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} team applications")
    
    def test_get_team_onboarding(self, auth_token):
        """Test fetching team onboarding records"""
        response = requests.get(
            f"{BASE_URL}/api/team-onboarding",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} team onboarding records")
        
        # Verify structure of onboarding records
        if data:
            record = data[0]
            assert "id" in record
            assert "name" in record
            assert "status" in record
            assert "steps" in record


class TestTeamOnboardingSteps:
    """Team Onboarding step completion tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json()["access_token"]
    
    def test_onboarding_steps_structure(self, auth_token):
        """Test that onboarding records have proper step structure"""
        response = requests.get(
            f"{BASE_URL}/api/team-onboarding",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for record in data:
            if record.get("status") == "onboarding":
                steps = record.get("steps", {})
                # Check all 4 steps exist
                expected_steps = ["personal_info", "bank_details", "contract_signing", "training"]
                for step in expected_steps:
                    if step in steps:
                        assert "completed" in steps[step]
                        print(f"Record {record['name']}: {step} = {steps[step].get('completed')}")


class TestGrowthPartners:
    """Growth Partners endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json()["access_token"]
    
    def test_get_growth_partners(self, auth_token):
        """Test fetching growth partners"""
        response = requests.get(
            f"{BASE_URL}/api/growth-partners",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} growth partners")
    
    def test_get_gp_onboarding(self, auth_token):
        """Test fetching GP onboarding records"""
        response = requests.get(
            f"{BASE_URL}/api/gp-onboarding",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} GP onboarding records")


class TestSupportInsights:
    """Support Insights endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json()["access_token"]
    
    def test_get_support_insights(self, auth_token):
        """Test fetching support insights"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "total_queries" in data
        assert "resolved" in data
        assert "pending" in data
        assert "query_types" in data
        assert "status_breakdown" in data
        assert "priority_breakdown" in data
        
        print(f"Total queries: {data['total_queries']}")
        print(f"Resolved: {data['resolved']}")
        print(f"Pending: {data['pending']}")
    
    def test_support_insights_query_types_structure(self, auth_token):
        """Test query_types has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        query_types = data.get("query_types", [])
        assert isinstance(query_types, list)
        
        for qt in query_types:
            assert "name" in qt
            assert "count" in qt
            print(f"Query type: {qt['name']} = {qt['count']}")
    
    def test_support_insights_status_breakdown_structure(self, auth_token):
        """Test status_breakdown has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        status_breakdown = data.get("status_breakdown", [])
        assert isinstance(status_breakdown, list)
        
        for sb in status_breakdown:
            assert "name" in sb
            assert "count" in sb
            print(f"Status: {sb['name']} = {sb['count']}")
    
    def test_support_insights_priority_breakdown_structure(self, auth_token):
        """Test priority_breakdown has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        priority_breakdown = data.get("priority_breakdown", [])
        assert isinstance(priority_breakdown, list)
        
        for pb in priority_breakdown:
            assert "name" in pb
            assert "count" in pb
            print(f"Priority: {pb['name']} = {pb['count']}")


class TestTeamMemberReports:
    """Team Member Reports endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        return response.json()["access_token"]
    
    def test_get_team_member_report(self, auth_token):
        """Test fetching team member report for active member"""
        # First get team onboarding to find an active member with team_user_id
        response = requests.get(
            f"{BASE_URL}/api/team-onboarding",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find an active member with team_user_id
        active_member = None
        for member in data:
            if member.get("status") == "active" and member.get("team_user_id"):
                active_member = member
                break
        
        if active_member:
            team_user_id = active_member["team_user_id"]
            report_response = requests.get(
                f"{BASE_URL}/api/admin/reports/team-member/{team_user_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert report_response.status_code == 200
            report_data = report_response.json()
            
            # Verify report structure
            assert "member" in report_data
            assert "metrics" in report_data
            print(f"Team member report fetched for: {active_member['name']}")
            print(f"Report metrics: {report_data.get('metrics', {}).keys()}")
        else:
            pytest.skip("No active team member with team_user_id found")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
