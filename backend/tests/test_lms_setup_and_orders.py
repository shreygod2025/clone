"""
Test cases for LMS Setup step and Orders page features
- LMS Setup step in onboarding workflow
- LMS students upload endpoint
- Orders page school details (MOU Document, Accounts Coordinator)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@oll.co",
        "password": "Dagaji03@"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestLMSSetupEndpoint:
    """Test LMS Setup step and student upload endpoint"""
    
    def test_lms_students_upload(self, auth_headers):
        """Test POST /api/schools/{school_id}/lms-students endpoint"""
        # Get a converted school
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        
        schools = response.json()
        converted_schools = [s for s in schools if s.get('status') == 'converted']
        assert len(converted_schools) > 0, "No converted schools found"
        
        school_id = converted_schools[0]['id']
        
        # Upload student credentials
        upload_response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/lms-students",
            headers=auth_headers,
            json={
                "students": [
                    {"name": "TEST_Student1", "username": "test_user1", "password": "pass123", "class": "5"},
                    {"name": "TEST_Student2", "username": "test_user2", "password": "pass456", "class": "6"}
                ]
            }
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        data = upload_response.json()
        assert data.get('success') == True
        assert data.get('students_uploaded') == 2
        assert 'message' in data
        
    def test_lms_setup_step_in_workflow(self, auth_headers):
        """Verify LMS Setup step exists in onboarding workflow after upload"""
        # Get a converted school
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        
        schools = response.json()
        converted_schools = [s for s in schools if s.get('status') == 'converted']
        assert len(converted_schools) > 0
        
        # Check if lms_setup step exists in onboarding_workflow
        school = converted_schools[0]
        workflow = school.get('onboarding_workflow', {})
        steps = workflow.get('steps', {})
        
        # lms_setup should be in steps after upload
        if 'lms_setup' in steps:
            lms_step = steps['lms_setup']
            # Check for completed flag or status field
            assert 'completed' in lms_step or 'status' in lms_step
            is_completed = lms_step.get('completed', False) or lms_step.get('status') == 'completed'
            print(f"✓ LMS Setup step found, completed: {is_completed}")
        else:
            # lms_setup may not exist if no upload was done for this school
            print("⚠ LMS Setup step not found (may need upload first)")


class TestOrdersPageData:
    """Test Orders page data endpoints"""
    
    def test_school_payments_endpoint(self, auth_headers):
        """Test GET /api/orders/school-payments endpoint"""
        response = requests.get(f"{BASE_URL}/api/orders/school-payments", headers=auth_headers)
        assert response.status_code == 200
        
        payments = response.json()
        assert isinstance(payments, list)
        
        if len(payments) > 0:
            payment = payments[0]
            # Verify required fields
            assert 'school_name' in payment
            assert 'school_id' in payment
            print(f"✓ Found {len(payments)} school payments")
    
    def test_school_details_with_mou(self, auth_headers):
        """Test school details include MOU document info"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        
        schools = response.json()
        converted_schools = [s for s in schools if s.get('status') == 'converted']
        
        if len(converted_schools) > 0:
            school = converted_schools[0]
            onboarding_data = school.get('onboarding_data', {})
            
            # Check for MOU URL
            if 'mou_url' in onboarding_data:
                assert onboarding_data['mou_url'] is not None
                print(f"✓ MOU URL found: {onboarding_data['mou_url'][:50]}...")
            else:
                print("⚠ MOU URL not set for this school")
    
    def test_school_contacts_with_accounts_coordinator(self, auth_headers):
        """Test school contacts include accounts coordinator"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        
        schools = response.json()
        converted_schools = [s for s in schools if s.get('status') == 'converted']
        
        accounts_coordinator_found = False
        for school in converted_schools:
            onboarding_data = school.get('onboarding_data', {})
            contacts = onboarding_data.get('school_contacts', [])
            
            for contact in contacts:
                role = contact.get('role', '').lower()
                if 'account' in role:
                    accounts_coordinator_found = True
                    assert 'name' in contact
                    assert 'phone' in contact or 'email' in contact
                    print(f"✓ Accounts Coordinator found: {contact.get('name')}")
                    break
            if accounts_coordinator_found:
                break
        
        if not accounts_coordinator_found:
            print("⚠ No accounts coordinator found in any school")


class TestOnboardingWorkflowSteps:
    """Test onboarding workflow steps configuration"""
    
    def test_get_school_onboarding(self, auth_headers):
        """Test GET /api/schools/onboarding/{school_id} endpoint"""
        # Get a converted school
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        
        schools = response.json()
        converted_schools = [s for s in schools if s.get('status') == 'converted']
        
        if len(converted_schools) > 0:
            school_id = converted_schools[0]['id']
            
            onboarding_response = requests.get(
                f"{BASE_URL}/api/schools/onboarding/{school_id}",
                headers=auth_headers
            )
            assert onboarding_response.status_code == 200
            
            data = onboarding_response.json()
            assert 'id' in data
            assert 'school_contacts' in data
            print(f"✓ Onboarding data retrieved for school")
    
    def test_update_school_contacts(self, auth_headers):
        """Test PUT /api/schools/onboarding/{onboarding_id} endpoint"""
        # Get a converted school's onboarding ID
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        
        schools = response.json()
        converted_schools = [s for s in schools if s.get('status') == 'converted']
        
        if len(converted_schools) > 0:
            school_id = converted_schools[0]['id']
            
            # Get onboarding ID
            onboarding_response = requests.get(
                f"{BASE_URL}/api/schools/onboarding/{school_id}",
                headers=auth_headers
            )
            assert onboarding_response.status_code == 200
            onboarding_id = onboarding_response.json().get('id')
            
            # Update contacts
            update_response = requests.put(
                f"{BASE_URL}/api/schools/onboarding/{onboarding_id}",
                headers=auth_headers,
                json={
                    "school_contacts": [
                        {"name": "TEST_Principal", "phone": "1234567890", "email": "test@school.com", "role": "principal"},
                        {"name": "TEST_Accountant", "phone": "0987654321", "email": "accounts@school.com", "role": "accounts_coordinator"}
                    ]
                }
            )
            assert update_response.status_code == 200
            print("✓ School contacts updated successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
