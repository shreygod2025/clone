"""
Test suite for Admin Orders page redesign and GP Role Assignment features
Tests:
1. Admin Orders API endpoints
2. GP Role Assignment (GP Manager role when activated)
3. GP Onboarding endpoints
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminOrdersAPI:
    """Test Admin Orders page API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_school_payments(self):
        """Test GET /api/orders/school-payments endpoint"""
        response = requests.get(f"{BASE_URL}/api/orders/school-payments", headers=self.headers)
        assert response.status_code == 200, f"Failed to get school payments: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ School payments endpoint returned {len(data)} records")
        
        # Verify payment structure if data exists
        if len(data) > 0:
            payment = data[0]
            assert "id" in payment, "Payment should have id"
            assert "school_name" in payment or "name" in payment, "Payment should have school_name or name"
            print(f"✓ Payment structure verified: {payment.get('school_name', payment.get('name', 'N/A'))}")
    
    def test_get_student_payments(self):
        """Test GET /api/orders/student-payments endpoint"""
        response = requests.get(f"{BASE_URL}/api/orders/student-payments", headers=self.headers)
        assert response.status_code == 200, f"Failed to get student payments: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Student payments endpoint returned {len(data)} records")


class TestGPRoleAssignment:
    """Test GP Role Assignment - should assign 'GP Manager' role when activated"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_gp_manager_role_exists(self):
        """Verify GP Manager role exists in roles collection"""
        response = requests.get(f"{BASE_URL}/api/roles", headers=self.headers)
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        
        roles = response.json()
        gp_manager_role = next((r for r in roles if r.get("name") == "GP Manager"), None)
        
        assert gp_manager_role is not None, "GP Manager role should exist"
        print(f"✓ GP Manager role found with ID: {gp_manager_role.get('id')}")
        print(f"  Permissions: {gp_manager_role.get('permissions', [])}")
    
    def test_create_and_activate_gp_assigns_gp_manager_role(self):
        """Test that activating a GP creates team user with GP Manager role"""
        # Create a new GP
        unique_id = datetime.now().strftime("%H%M%S")
        gp_data = {
            "name": f"TEST_GP_Role_{unique_id}",
            "email": f"test_gp_{unique_id}@example.com",
            "phone": f"98765{unique_id}",
            "city": "Mumbai",
            "interest_type": "franchise",
            "details": "Testing GP Manager role assignment"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", 
                                        json=gp_data, headers=self.headers)
        assert create_response.status_code == 200, f"Failed to create GP: {create_response.text}"
        
        gp = create_response.json()
        gp_id = gp["id"]
        print(f"✓ Created GP with ID: {gp_id}")
        
        # Activate the GP (change status to 'active')
        activate_response = requests.patch(f"{BASE_URL}/api/growth-partners/{gp_id}",
                                          json={"status": "active"}, headers=self.headers)
        assert activate_response.status_code == 200, f"Failed to activate GP: {activate_response.text}"
        
        activated_gp = activate_response.json()
        assert activated_gp.get("status") == "active", "GP status should be active"
        assert "team_user_id" in activated_gp, "Activated GP should have team_user_id"
        print(f"✓ GP activated, team_user_id: {activated_gp.get('team_user_id')}")
        
        # Verify team user was created with GP Manager role
        team_users_response = requests.get(f"{BASE_URL}/api/team-users", headers=self.headers)
        assert team_users_response.status_code == 200, f"Failed to get team users: {team_users_response.text}"
        
        team_users = team_users_response.json()
        team_user = next((u for u in team_users if u.get("email") == gp_data["email"]), None)
        
        assert team_user is not None, "Team user should be created for activated GP"
        assert team_user.get("role_name") == "GP Manager", f"Role should be 'GP Manager', got: {team_user.get('role_name')}"
        print(f"✓ Team user created with role: {team_user.get('role_name')}")
        
        # Cleanup - delete the test GP
        requests.delete(f"{BASE_URL}/api/growth-partners/{gp_id}", headers=self.headers)


class TestGPOnboarding:
    """Test GP Onboarding endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_gp_onboarding_list(self):
        """Test GET /api/gp-onboarding endpoint"""
        response = requests.get(f"{BASE_URL}/api/gp-onboarding", headers=self.headers)
        assert response.status_code == 200, f"Failed to get GP onboarding list: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GP Onboarding list returned {len(data)} records")
        
        # Verify structure if data exists
        if len(data) > 0:
            onboarding = data[0]
            assert "id" in onboarding, "Onboarding should have id"
            assert "tracking_token" in onboarding, "Onboarding should have tracking_token"
            assert "steps" in onboarding, "Onboarding should have steps"
            assert "training_progress" in onboarding, "Onboarding should have training_progress"
            print(f"✓ Onboarding structure verified for: {onboarding.get('name', 'N/A')}")
    
    def test_get_gp_onboarding_by_token(self):
        """Test GET /api/gp-onboard/{token} endpoint"""
        # First get a valid token
        list_response = requests.get(f"{BASE_URL}/api/gp-onboarding", headers=self.headers)
        if list_response.status_code == 200 and len(list_response.json()) > 0:
            token = list_response.json()[0].get("tracking_token")
            
            # Get onboarding by token (public endpoint)
            response = requests.get(f"{BASE_URL}/api/gp-onboard/{token}")
            assert response.status_code == 200, f"Failed to get GP onboarding by token: {response.text}"
            
            data = response.json()
            assert data.get("tracking_token") == token, "Token should match"
            print(f"✓ GP Onboarding retrieved by token: {token}")
        else:
            pytest.skip("No GP onboarding records available for testing")
    
    def test_gp_onboarding_training_progress_structure(self):
        """Verify training_progress has all 7 training steps"""
        response = requests.get(f"{BASE_URL}/api/gp-onboarding", headers=self.headers)
        if response.status_code == 200 and len(response.json()) > 0:
            onboarding = response.json()[0]
            training_progress = onboarding.get("training_progress", {})
            
            expected_steps = [
                "about_company",
                "about_skill", 
                "implementation_models",
                "product_training",
                "target_audiences",
                "pricing_training",
                "software_training"
            ]
            
            for step in expected_steps:
                assert step in training_progress, f"Training progress should have '{step}' step"
                print(f"✓ Training step '{step}' found in training_progress")
        else:
            pytest.skip("No GP onboarding records available for testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
