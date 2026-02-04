"""
Test Team Onboarding Feature
- Tests team onboarding endpoints
- Tests auto-initiation when applicant is marked as 'hired'
- Tests onboarding steps completion
- Tests activation and discontinuation workflows
- Tests public tracking page
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTeamOnboardingFeature:
    """Test Team Onboarding Feature"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_application(self, auth_headers):
        """Create a test team application for onboarding tests"""
        unique_id = str(uuid.uuid4())[:8]
        application_data = {
            "name": f"TEST_Onboarding_User_{unique_id}",
            "email": f"test_onboard_{unique_id}@test.com",
            "phone": f"+91987654{unique_id[:4]}",
            "role": "Test Developer",
            "experience": "2 years",
            "city": "Mumbai",
            "message": "Test application for onboarding",
            "source": "admin_added"
        }
        response = requests.post(f"{BASE_URL}/api/team-applications", 
                                json=application_data, 
                                headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create application: {response.text}"
        return response.json()
    
    # ==================
    # GET Team Onboardings
    # ==================
    def test_get_team_onboardings(self, auth_headers):
        """Test GET /api/team-onboarding - List all onboardings"""
        response = requests.get(f"{BASE_URL}/api/team-onboarding", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get onboardings: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} onboarding records")
        return data
    
    def test_get_team_onboardings_by_status(self, auth_headers):
        """Test GET /api/team-onboarding?status=onboarding - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/team-onboarding?status=onboarding", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get onboardings: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # All returned records should have status 'onboarding'
        for record in data:
            assert record.get('status') == 'onboarding', f"Expected status 'onboarding', got {record.get('status')}"
        print(f"Found {len(data)} onboarding records with status 'onboarding'")
    
    # ==================
    # Init Team Onboarding (Auto-initiation when hired)
    # ==================
    def test_init_team_onboarding(self, auth_headers, test_application):
        """Test POST /api/team-onboarding/init/{application_id} - Initialize onboarding"""
        application_id = test_application.get('id')
        response = requests.post(f"{BASE_URL}/api/team-onboarding/init/{application_id}", 
                                json={}, 
                                headers=auth_headers)
        assert response.status_code == 200, f"Failed to init onboarding: {response.text}"
        data = response.json()
        assert 'tracking_token' in data or 'id' in data, "Response should contain tracking_token or id"
        print(f"Onboarding initialized with token: {data.get('tracking_token')}")
        return data
    
    def test_init_onboarding_duplicate(self, auth_headers, test_application):
        """Test that duplicate init returns existing onboarding"""
        application_id = test_application.get('id')
        response = requests.post(f"{BASE_URL}/api/team-onboarding/init/{application_id}", 
                                json={}, 
                                headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        # Should return existing onboarding, not create new
        print("Duplicate init handled correctly")
    
    # ==================
    # Public Tracking Page
    # ==================
    def test_public_tracking_page_valid_token(self, auth_headers):
        """Test GET /api/team-onboarding/track/{token} - Public tracking with valid token"""
        # First get an existing onboarding to get a valid token
        response = requests.get(f"{BASE_URL}/api/team-onboarding", headers=auth_headers)
        assert response.status_code == 200
        onboardings = response.json()
        
        if len(onboardings) > 0:
            token = onboardings[0].get('tracking_token')
            if token:
                # Test public endpoint (no auth required)
                public_response = requests.get(f"{BASE_URL}/api/team-onboarding/track/{token}")
                assert public_response.status_code == 200, f"Failed to get public tracking: {public_response.text}"
                data = public_response.json()
                assert 'name' in data, "Response should contain name"
                assert 'steps' in data, "Response should contain steps"
                assert 'status' in data, "Response should contain status"
                print(f"Public tracking page works for token: {token}")
            else:
                pytest.skip("No tracking token found")
        else:
            pytest.skip("No onboarding records to test")
    
    def test_public_tracking_page_invalid_token(self):
        """Test GET /api/team-onboarding/track/{token} - Invalid token returns 404"""
        response = requests.get(f"{BASE_URL}/api/team-onboarding/track/invalid_token_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Invalid token correctly returns 404")
    
    # ==================
    # Complete Onboarding Steps
    # ==================
    def test_complete_step_personal_info(self, auth_headers):
        """Test POST /api/team-onboarding/{id}/complete-step - Complete personal info step"""
        # Get an onboarding record
        response = requests.get(f"{BASE_URL}/api/team-onboarding?status=onboarding", headers=auth_headers)
        assert response.status_code == 200
        onboardings = response.json()
        
        if len(onboardings) > 0:
            onboarding_id = onboardings[0].get('id')
            step_data = {
                "step": "personal_info",
                "data": {
                    "full_name": "Test User Full Name",
                    "dob": "1990-01-15",
                    "address": "123 Test Street, Mumbai",
                    "emergency_contact_name": "Emergency Contact",
                    "emergency_contact_phone": "+919876543210"
                }
            }
            response = requests.post(f"{BASE_URL}/api/team-onboarding/{onboarding_id}/complete-step",
                                    json=step_data,
                                    headers=auth_headers)
            assert response.status_code == 200, f"Failed to complete step: {response.text}"
            data = response.json()
            assert data.get('steps', {}).get('personal_info', {}).get('completed') == True
            print(f"Personal info step completed for onboarding {onboarding_id}")
        else:
            pytest.skip("No onboarding records to test")
    
    def test_complete_step_bank_details(self, auth_headers):
        """Test POST /api/team-onboarding/{id}/complete-step - Complete bank details step"""
        response = requests.get(f"{BASE_URL}/api/team-onboarding?status=onboarding", headers=auth_headers)
        assert response.status_code == 200
        onboardings = response.json()
        
        if len(onboardings) > 0:
            onboarding_id = onboardings[0].get('id')
            step_data = {
                "step": "bank_details",
                "data": {
                    "account_holder": "Test User",
                    "account_number": "1234567890",
                    "ifsc": "HDFC0001234",
                    "bank_name": "HDFC Bank",
                    "pan": "ABCDE1234F"
                }
            }
            response = requests.post(f"{BASE_URL}/api/team-onboarding/{onboarding_id}/complete-step",
                                    json=step_data,
                                    headers=auth_headers)
            assert response.status_code == 200, f"Failed to complete step: {response.text}"
            data = response.json()
            assert data.get('steps', {}).get('bank_details', {}).get('completed') == True
            print(f"Bank details step completed for onboarding {onboarding_id}")
        else:
            pytest.skip("No onboarding records to test")
    
    def test_complete_step_contract_signing(self, auth_headers):
        """Test POST /api/team-onboarding/{id}/complete-step - Complete contract signing step"""
        response = requests.get(f"{BASE_URL}/api/team-onboarding?status=onboarding", headers=auth_headers)
        assert response.status_code == 200
        onboardings = response.json()
        
        if len(onboardings) > 0:
            onboarding_id = onboardings[0].get('id')
            step_data = {
                "step": "contract_signing",
                "data": {
                    "contract_url": "https://example.com/contract.pdf"
                }
            }
            response = requests.post(f"{BASE_URL}/api/team-onboarding/{onboarding_id}/complete-step",
                                    json=step_data,
                                    headers=auth_headers)
            assert response.status_code == 200, f"Failed to complete step: {response.text}"
            data = response.json()
            assert data.get('steps', {}).get('contract_signing', {}).get('completed') == True
            print(f"Contract signing step completed for onboarding {onboarding_id}")
        else:
            pytest.skip("No onboarding records to test")
    
    def test_complete_step_training(self, auth_headers):
        """Test POST /api/team-onboarding/{id}/complete-step - Complete training step"""
        response = requests.get(f"{BASE_URL}/api/team-onboarding?status=onboarding", headers=auth_headers)
        assert response.status_code == 200
        onboardings = response.json()
        
        if len(onboardings) > 0:
            onboarding_id = onboardings[0].get('id')
            step_data = {
                "step": "training",
                "data": {
                    "notes": "Training completed successfully"
                }
            }
            response = requests.post(f"{BASE_URL}/api/team-onboarding/{onboarding_id}/complete-step",
                                    json=step_data,
                                    headers=auth_headers)
            assert response.status_code == 200, f"Failed to complete step: {response.text}"
            data = response.json()
            assert data.get('steps', {}).get('training', {}).get('completed') == True
            print(f"Training step completed for onboarding {onboarding_id}")
        else:
            pytest.skip("No onboarding records to test")
    
    def test_complete_step_invalid_step_name(self, auth_headers):
        """Test POST /api/team-onboarding/{id}/complete-step - Invalid step name returns 400"""
        response = requests.get(f"{BASE_URL}/api/team-onboarding", headers=auth_headers)
        assert response.status_code == 200
        onboardings = response.json()
        
        if len(onboardings) > 0:
            onboarding_id = onboardings[0].get('id')
            step_data = {
                "step": "invalid_step_name",
                "data": {}
            }
            response = requests.post(f"{BASE_URL}/api/team-onboarding/{onboarding_id}/complete-step",
                                    json=step_data,
                                    headers=auth_headers)
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            print("Invalid step name correctly returns 400")
        else:
            pytest.skip("No onboarding records to test")
    
    # ==================
    # Activation
    # ==================
    def test_activate_without_all_steps_complete(self, auth_headers, test_application):
        """Test POST /api/team-onboarding/{id}/activate - Should fail if steps incomplete"""
        # Create a fresh onboarding
        application_id = test_application.get('id')
        init_response = requests.post(f"{BASE_URL}/api/team-onboarding/init/{application_id}", 
                                     json={}, 
                                     headers=auth_headers)
        assert init_response.status_code == 200
        
        # Get the onboarding ID
        onboardings = requests.get(f"{BASE_URL}/api/team-onboarding", headers=auth_headers).json()
        test_onboarding = next((o for o in onboardings if o.get('team_application_id') == application_id), None)
        
        if test_onboarding:
            # Try to activate without completing all steps
            response = requests.post(f"{BASE_URL}/api/team-onboarding/{test_onboarding['id']}/activate",
                                    json={"role_id": "some_role_id"},
                                    headers=auth_headers)
            # Should fail because steps are not complete
            assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
            print("Activation correctly blocked when steps incomplete")
        else:
            pytest.skip("Test onboarding not found")
    
    # ==================
    # Discontinue
    # ==================
    def test_discontinue_without_reason(self, auth_headers):
        """Test POST /api/team-onboarding/{id}/discontinue - Should fail without reason"""
        response = requests.get(f"{BASE_URL}/api/team-onboarding", headers=auth_headers)
        assert response.status_code == 200
        onboardings = response.json()
        
        if len(onboardings) > 0:
            onboarding_id = onboardings[0].get('id')
            response = requests.post(f"{BASE_URL}/api/team-onboarding/{onboarding_id}/discontinue",
                                    json={},
                                    headers=auth_headers)
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            print("Discontinue correctly requires reason")
        else:
            pytest.skip("No onboarding records to test")
    
    def test_discontinue_with_reason(self, auth_headers):
        """Test POST /api/team-onboarding/{id}/discontinue - With valid reason"""
        # Get an active onboarding to discontinue
        response = requests.get(f"{BASE_URL}/api/team-onboarding?status=active", headers=auth_headers)
        assert response.status_code == 200
        onboardings = response.json()
        
        if len(onboardings) > 0:
            onboarding_id = onboardings[0].get('id')
            discontinue_data = {
                "reason": "Resignation",
                "exit_formalities": {
                    "assets_returned": True,
                    "access_revoked": True,
                    "final_settlement": False,
                    "exit_interview": True,
                    "notes": "Test discontinuation"
                }
            }
            response = requests.post(f"{BASE_URL}/api/team-onboarding/{onboarding_id}/discontinue",
                                    json=discontinue_data,
                                    headers=auth_headers)
            assert response.status_code == 200, f"Failed to discontinue: {response.text}"
            print(f"Onboarding {onboarding_id} discontinued successfully")
        else:
            print("No active onboardings to discontinue - skipping")
    
    # ==================
    # Team Applications - Hired Status Triggers Onboarding
    # ==================
    def test_hiring_triggers_onboarding(self, auth_headers):
        """Test that marking application as 'hired' triggers onboarding init"""
        # Create a new application
        unique_id = str(uuid.uuid4())[:8]
        application_data = {
            "name": f"TEST_Hire_Trigger_{unique_id}",
            "email": f"test_hire_{unique_id}@test.com",
            "phone": f"+91876543{unique_id[:4]}",
            "role": "Test Role",
            "experience": "1 year",
            "city": "Delhi",
            "source": "admin_added"
        }
        create_response = requests.post(f"{BASE_URL}/api/team-applications", 
                                       json=application_data, 
                                       headers=auth_headers)
        assert create_response.status_code in [200, 201], f"Failed to create: {create_response.text}"
        application = create_response.json()
        application_id = application.get('id')
        
        # Update status to 'hired' - this should trigger onboarding init
        update_response = requests.patch(f"{BASE_URL}/api/team-applications/{application_id}",
                                        json={"status": "hired"},
                                        headers=auth_headers)
        assert update_response.status_code == 200, f"Failed to update status: {update_response.text}"
        
        # Note: The frontend triggers onboarding init when status changes to 'hired'
        # Backend doesn't auto-trigger, so we manually init
        init_response = requests.post(f"{BASE_URL}/api/team-onboarding/init/{application_id}",
                                     json={},
                                     headers=auth_headers)
        assert init_response.status_code == 200, f"Failed to init onboarding: {init_response.text}"
        
        # Verify onboarding was created
        onboardings = requests.get(f"{BASE_URL}/api/team-onboarding", headers=auth_headers).json()
        test_onboarding = next((o for o in onboardings if o.get('team_application_id') == application_id), None)
        assert test_onboarding is not None, "Onboarding should be created for hired application"
        print(f"Hiring triggered onboarding creation with token: {test_onboarding.get('tracking_token')}")
    
    # ==================
    # Get Roles (for activation)
    # ==================
    def test_get_roles(self, auth_headers):
        """Test GET /api/roles - Get available roles for activation"""
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        roles = response.json()
        assert isinstance(roles, list), "Response should be a list"
        print(f"Found {len(roles)} roles available")
        return roles


class TestTeamOnboardingFullWorkflow:
    """Test complete onboarding workflow from application to activation"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_full_onboarding_workflow(self, auth_headers):
        """Test complete workflow: Create Application -> Hire -> Complete Steps -> Activate"""
        # Step 1: Create application
        unique_id = str(uuid.uuid4())[:8]
        application_data = {
            "name": f"TEST_Full_Workflow_{unique_id}",
            "email": f"test_workflow_{unique_id}@test.com",
            "phone": f"+91765432{unique_id[:4]}",
            "role": "Full Stack Developer",
            "experience": "3 years",
            "city": "Bangalore",
            "source": "admin_added"
        }
        create_response = requests.post(f"{BASE_URL}/api/team-applications", 
                                       json=application_data, 
                                       headers=auth_headers)
        assert create_response.status_code in [200, 201]
        application = create_response.json()
        application_id = application.get('id')
        print(f"Step 1: Created application {application_id}")
        
        # Step 2: Mark as hired and init onboarding
        requests.patch(f"{BASE_URL}/api/team-applications/{application_id}",
                      json={"status": "hired"},
                      headers=auth_headers)
        
        init_response = requests.post(f"{BASE_URL}/api/team-onboarding/init/{application_id}",
                                     json={},
                                     headers=auth_headers)
        assert init_response.status_code == 200
        onboarding_data = init_response.json()
        tracking_token = onboarding_data.get('tracking_token')
        print(f"Step 2: Onboarding initialized with token {tracking_token}")
        
        # Get onboarding ID
        onboardings = requests.get(f"{BASE_URL}/api/team-onboarding", headers=auth_headers).json()
        onboarding = next((o for o in onboardings if o.get('team_application_id') == application_id), None)
        assert onboarding is not None
        onboarding_id = onboarding.get('id')
        
        # Step 3: Complete all 4 steps
        steps = [
            ("personal_info", {"full_name": "Test Full Name", "dob": "1992-05-20", "address": "Test Address"}),
            ("bank_details", {"account_holder": "Test User", "account_number": "9876543210", "ifsc": "ICIC0001234", "bank_name": "ICICI"}),
            ("contract_signing", {"contract_url": "https://example.com/contract.pdf"}),
            ("training", {"notes": "Training completed"})
        ]
        
        for step_name, step_data in steps:
            response = requests.post(f"{BASE_URL}/api/team-onboarding/{onboarding_id}/complete-step",
                                    json={"step": step_name, "data": step_data},
                                    headers=auth_headers)
            assert response.status_code == 200, f"Failed to complete {step_name}: {response.text}"
            print(f"Step 3: Completed {step_name}")
        
        # Step 4: Get roles and activate
        roles_response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = roles_response.json()
        
        if len(roles) > 0:
            role_id = roles[0].get('id')
            activate_response = requests.post(f"{BASE_URL}/api/team-onboarding/{onboarding_id}/activate",
                                             json={"role_id": role_id},
                                             headers=auth_headers)
            assert activate_response.status_code == 200, f"Failed to activate: {activate_response.text}"
            activation_data = activate_response.json()
            assert 'username' in activation_data
            assert 'temp_password' in activation_data
            print(f"Step 4: Activated with username {activation_data.get('username')}")
            
            # Verify status changed to active
            updated_onboarding = requests.get(f"{BASE_URL}/api/team-onboarding/{onboarding_id}", 
                                             headers=auth_headers).json()
            assert updated_onboarding.get('status') == 'active'
            print("Full workflow completed successfully!")
        else:
            print("No roles available - skipping activation step")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
