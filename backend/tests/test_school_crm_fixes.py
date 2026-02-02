"""
Test School CRM Bug Fixes - Iteration 17
Tests for:
1. P0: Edit Active Schools - PUT /api/schools/onboarding/{onboarding_id} should update onboarding details
2. P0: Edit Active Schools - PATCH /api/schools/inquiry/{inquiry_id} should update school basic info including location, board, model, total_students
3. P0: Bulk Upload - POST /api/schools/bulk-import should update existing active schools (not archived ones)
4. P1: MOU Auto-Complete - POST /api/schools/{school_id}/init-onboarding should automatically mark mou_signing step as completed
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSchoolCRMFixes:
    """Test School CRM bug fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and authentication"""
        self.admin_email = "admin@oll.co"
        self.admin_password = "Dagaji03@"
        self.auth_token = None
        self.created_school_ids = []
        self.created_onboarding_ids = []
        
        # Login to get auth token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.admin_email, "password": self.admin_password}
        )
        if login_response.status_code == 200:
            self.auth_token = login_response.json().get("access_token")
        
        yield
        
        # Cleanup: Archive test schools
        if self.auth_token:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            for school_id in self.created_school_ids:
                try:
                    requests.patch(
                        f"{BASE_URL}/api/schools/inquiry/{school_id}",
                        json={"status": "archived"},
                        headers=headers
                    )
                except:
                    pass
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}", "Content-Type": "application/json"}
    
    # ==========================================
    # Test 1: Authentication
    # ==========================================
    def test_01_admin_login(self):
        """Test admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.admin_email, "password": self.admin_password}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == self.admin_email
        print(f"✓ Admin login successful")
    
    # ==========================================
    # Test 2: PUT /api/schools/onboarding/{onboarding_id} - Update onboarding details
    # ==========================================
    def test_02_update_onboarding_details(self):
        """P0: Test PUT /api/schools/onboarding/{onboarding_id} updates onboarding details"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        headers = self.get_headers()
        
        # First create a test school
        unique_id = str(uuid.uuid4())[:8]
        school_data = {
            "school_name": f"TEST_Onboarding_Update_School_{unique_id}",
            "contact_name": "Test Contact",
            "email": f"test_onboarding_{unique_id}@test.com",
            "phone": f"98765{unique_id[:5]}",
            "location": "Mumbai",
            "board": "CBSE",
            "school_size": "500-1000",
            "fee_range": "50000-100000",
            "programs_interested": ["Robotics"],
            "support_needed": ["Training"]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/schools/inquiry",
            json=school_data,
            headers=headers
        )
        assert create_response.status_code == 200, f"Failed to create school: {create_response.text}"
        school = create_response.json()
        school_id = school["id"]
        self.created_school_ids.append(school_id)
        print(f"✓ Created test school: {school_id}")
        
        # Convert school to active (create onboarding)
        convert_response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/onboarding",
            json={
                "offering": "Robotics Lab Setup",
                "model": "Lab Model",
                "total_students": 100,
                "total_amount": 50000
            },
            headers=headers
        )
        assert convert_response.status_code == 200, f"Failed to create onboarding: {convert_response.text}"
        onboarding_id = convert_response.json().get("id")
        self.created_onboarding_ids.append(onboarding_id)
        print(f"✓ Created onboarding: {onboarding_id}")
        
        # Now test PUT to update onboarding details
        update_data = {
            "offering": "Updated Robotics Lab",
            "model": "Updated Lab Model",
            "total_students": 200,
            "total_amount": 100000,
            "payment_mode": "from_student",
            "payment_method": "neft",
            "contract_start": "2025-02-01",
            "contract_end": "2025-12-31"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/schools/onboarding/{onboarding_id}",
            json=update_data,
            headers=headers
        )
        assert update_response.status_code == 200, f"Failed to update onboarding: {update_response.text}"
        print(f"✓ PUT /api/schools/onboarding/{onboarding_id} returned 200")
        
        # Verify the update by fetching onboarding details
        get_response = requests.get(
            f"{BASE_URL}/api/schools/onboarding/{onboarding_id}",
            headers=headers
        )
        assert get_response.status_code == 200, f"Failed to get onboarding: {get_response.text}"
        updated_onboarding = get_response.json()
        
        # Verify updated fields
        assert updated_onboarding.get("offering") == "Updated Robotics Lab", f"Offering not updated: {updated_onboarding.get('offering')}"
        assert updated_onboarding.get("model") == "Updated Lab Model", f"Model not updated: {updated_onboarding.get('model')}"
        assert updated_onboarding.get("total_students") == 200, f"Total students not updated: {updated_onboarding.get('total_students')}"
        assert updated_onboarding.get("total_amount") == 100000, f"Total amount not updated: {updated_onboarding.get('total_amount')}"
        print(f"✓ Onboarding details verified after update")
    
    # ==========================================
    # Test 3: PATCH /api/schools/inquiry/{inquiry_id} - Update school basic info
    # ==========================================
    def test_03_update_school_inquiry_with_new_fields(self):
        """P0: Test PATCH /api/schools/inquiry/{inquiry_id} updates location, board, model, total_students"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        headers = self.get_headers()
        
        # Create a test school
        unique_id = str(uuid.uuid4())[:8]
        school_data = {
            "school_name": f"TEST_Inquiry_Update_School_{unique_id}",
            "contact_name": "Test Contact",
            "email": f"test_inquiry_{unique_id}@test.com",
            "phone": f"98764{unique_id[:5]}",
            "location": "Delhi",
            "board": "ICSE",
            "school_size": "500-1000",
            "fee_range": "50000-100000",
            "programs_interested": ["Robotics"],
            "support_needed": ["Training"]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/schools/inquiry",
            json=school_data,
            headers=headers
        )
        assert create_response.status_code == 200, f"Failed to create school: {create_response.text}"
        school = create_response.json()
        school_id = school["id"]
        self.created_school_ids.append(school_id)
        print(f"✓ Created test school: {school_id}")
        
        # Test PATCH with new fields: location, board, model, total_students
        update_data = {
            "location": "Mumbai Updated",
            "board": "CBSE",
            "model": "Franchise Model",
            "total_students": 500
        }
        
        patch_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json=update_data,
            headers=headers
        )
        assert patch_response.status_code == 200, f"Failed to patch school: {patch_response.text}"
        updated_school = patch_response.json()
        print(f"✓ PATCH /api/schools/inquiry/{school_id} returned 200")
        
        # Verify updated fields
        assert updated_school.get("location") == "Mumbai Updated", f"Location not updated: {updated_school.get('location')}"
        assert updated_school.get("board") == "CBSE", f"Board not updated: {updated_school.get('board')}"
        assert updated_school.get("model") == "Franchise Model", f"Model not updated: {updated_school.get('model')}"
        assert updated_school.get("total_students") == 500, f"Total students not updated: {updated_school.get('total_students')}"
        print(f"✓ School inquiry fields (location, board, model, total_students) verified after update")
    
    # ==========================================
    # Test 4: Bulk Import - Update existing active schools (not archived)
    # ==========================================
    def test_04_bulk_import_updates_active_not_archived(self):
        """P0: Test POST /api/schools/bulk-import updates existing active schools but not archived ones"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        headers = self.get_headers()
        
        # Create two test schools with same name - one active, one archived
        unique_id = str(uuid.uuid4())[:8]
        school_name = f"TEST_Bulk_Import_School_{unique_id}"
        
        # Create first school (will be archived)
        archived_school_data = {
            "school_name": school_name,
            "contact_name": "Archived Contact",
            "email": f"archived_{unique_id}@test.com",
            "phone": f"98763{unique_id[:5]}",
            "location": "Archived Location",
            "board": "State Board",
            "school_size": "0-500",
            "fee_range": "0-50000",
            "programs_interested": ["Robotics"],
            "support_needed": ["Training"]
        }
        
        create_archived_response = requests.post(
            f"{BASE_URL}/api/schools/inquiry",
            json=archived_school_data,
            headers=headers
        )
        assert create_archived_response.status_code == 200, f"Failed to create archived school: {create_archived_response.text}"
        archived_school = create_archived_response.json()
        archived_school_id = archived_school["id"]
        self.created_school_ids.append(archived_school_id)
        print(f"✓ Created school to be archived: {archived_school_id}")
        
        # Archive the first school
        archive_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{archived_school_id}",
            json={"status": "archived"},
            headers=headers
        )
        assert archive_response.status_code == 200, f"Failed to archive school: {archive_response.text}"
        print(f"✓ Archived school: {archived_school_id}")
        
        # Create second school with same name (active)
        active_school_data = {
            "school_name": school_name,
            "contact_name": "Active Contact",
            "email": f"active_{unique_id}@test.com",
            "phone": f"98762{unique_id[:5]}",
            "location": "Active Location",
            "board": "CBSE",
            "school_size": "500-1000",
            "fee_range": "50000-100000",
            "programs_interested": ["Robotics"],
            "support_needed": ["Training"]
        }
        
        create_active_response = requests.post(
            f"{BASE_URL}/api/schools/inquiry",
            json=active_school_data,
            headers=headers
        )
        assert create_active_response.status_code == 200, f"Failed to create active school: {create_active_response.text}"
        active_school = create_active_response.json()
        active_school_id = active_school["id"]
        self.created_school_ids.append(active_school_id)
        print(f"✓ Created active school: {active_school_id}")
        
        # Now do bulk import with same school name - should update active, not archived
        bulk_import_data = {
            "schools": [
                {
                    "school_name": school_name,
                    "contact_name": "Bulk Updated Contact",
                    "phone": f"98761{unique_id[:5]}",
                    "email": f"bulk_{unique_id}@test.com",
                    "location": "Bulk Updated Location",
                    "board": "IGCSE",
                    "total_students": 300,
                    "model": "Bulk Model"
                }
            ],
            "update_existing": True
        }
        
        bulk_response = requests.post(
            f"{BASE_URL}/api/schools/bulk-import",
            json=bulk_import_data,
            headers=headers
        )
        assert bulk_response.status_code == 200, f"Bulk import failed: {bulk_response.text}"
        bulk_result = bulk_response.json()
        print(f"✓ Bulk import result: {bulk_result}")
        
        # Verify: Active school should be updated
        assert bulk_result.get("updated") >= 1, f"Expected at least 1 update, got: {bulk_result.get('updated')}"
        print(f"✓ Bulk import updated {bulk_result.get('updated')} school(s)")
        
        # Verify active school was updated
        get_active_response = requests.get(
            f"{BASE_URL}/api/schools/inquiry/{active_school_id}",
            headers=headers
        )
        assert get_active_response.status_code == 200
        updated_active = get_active_response.json()
        
        # Check that active school was updated with bulk import data
        assert updated_active.get("location") == "Bulk Updated Location", f"Active school location not updated: {updated_active.get('location')}"
        assert updated_active.get("board") == "IGCSE", f"Active school board not updated: {updated_active.get('board')}"
        print(f"✓ Active school was updated by bulk import")
        
        # Verify archived school was NOT updated
        get_archived_response = requests.get(
            f"{BASE_URL}/api/schools/inquiry/{archived_school_id}",
            headers=headers
        )
        assert get_archived_response.status_code == 200
        archived_after = get_archived_response.json()
        
        # Archived school should still have original location
        assert archived_after.get("location") == "Archived Location", f"Archived school was incorrectly updated: {archived_after.get('location')}"
        assert archived_after.get("status") == "archived", f"Archived school status changed: {archived_after.get('status')}"
        print(f"✓ Archived school was NOT updated by bulk import (correct behavior)")
    
    # ==========================================
    # Test 5: MOU Auto-Complete on init-onboarding
    # ==========================================
    def test_05_mou_auto_complete_on_init_onboarding(self):
        """P1: Test POST /api/schools/{school_id}/init-onboarding automatically marks mou_signing as completed"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        headers = self.get_headers()
        
        # Create a test school
        unique_id = str(uuid.uuid4())[:8]
        school_data = {
            "school_name": f"TEST_MOU_AutoComplete_School_{unique_id}",
            "contact_name": "Test Contact",
            "email": f"test_mou_{unique_id}@test.com",
            "phone": f"98760{unique_id[:5]}",
            "location": "Mumbai",
            "board": "CBSE",
            "school_size": "500-1000",
            "fee_range": "50000-100000",
            "programs_interested": ["Robotics"],
            "support_needed": ["Training"]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/schools/inquiry",
            json=school_data,
            headers=headers
        )
        assert create_response.status_code == 200, f"Failed to create school: {create_response.text}"
        school = create_response.json()
        school_id = school["id"]
        self.created_school_ids.append(school_id)
        print(f"✓ Created test school: {school_id}")
        
        # Convert to active status first
        convert_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "converted"},
            headers=headers
        )
        assert convert_response.status_code == 200, f"Failed to convert school: {convert_response.text}"
        print(f"✓ School converted to active status")
        
        # Call init-onboarding
        init_response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/init-onboarding",
            headers=headers
        )
        assert init_response.status_code == 200, f"Failed to init onboarding: {init_response.text}"
        init_result = init_response.json()
        print(f"✓ Init onboarding called successfully")
        
        # Verify MOU step is auto-completed
        assert init_result.get("success") == True, f"Init onboarding not successful: {init_result}"
        
        # Get the school to check onboarding_workflow
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            headers=headers
        )
        assert get_response.status_code == 200
        school_after = get_response.json()
        
        onboarding_workflow = school_after.get("onboarding_workflow", {})
        steps = onboarding_workflow.get("steps", {})
        mou_step = steps.get("mou_signing", {})
        
        # Verify MOU step is marked as completed
        assert mou_step.get("completed") == True, f"MOU step not auto-completed: {mou_step}"
        assert mou_step.get("completed_date") is not None, f"MOU completed_date not set: {mou_step}"
        print(f"✓ MOU signing step is auto-completed: {mou_step.get('completed')}")
        
        # Verify current_step is set to payment_collection (next step after MOU)
        assert onboarding_workflow.get("current_step") == "payment_collection", f"Current step not set to payment_collection: {onboarding_workflow.get('current_step')}"
        print(f"✓ Current step is set to 'payment_collection' (after MOU)")
    
    # ==========================================
    # Test 6: Test with existing test data IDs
    # ==========================================
    def test_06_update_existing_onboarding_id(self):
        """Test updating the existing onboarding ID provided in test data"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        headers = self.get_headers()
        existing_onboarding_id = "7674d19c-025e-41d6-a122-63154b68066c"
        
        # First check if the onboarding exists
        get_response = requests.get(
            f"{BASE_URL}/api/schools/onboarding/{existing_onboarding_id}",
            headers=headers
        )
        
        if get_response.status_code == 404:
            pytest.skip(f"Existing onboarding ID {existing_onboarding_id} not found - may have been deleted")
        
        assert get_response.status_code == 200, f"Failed to get existing onboarding: {get_response.text}"
        original_onboarding = get_response.json()
        print(f"✓ Found existing onboarding: {existing_onboarding_id}")
        
        # Update with test data
        update_data = {
            "notes": f"Test update at {datetime.now().isoformat()}"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/schools/onboarding/{existing_onboarding_id}",
            json=update_data,
            headers=headers
        )
        assert update_response.status_code == 200, f"Failed to update existing onboarding: {update_response.text}"
        print(f"✓ Successfully updated existing onboarding ID")
    
    def test_07_update_existing_school_id(self):
        """Test updating the existing school ID provided in test data"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        headers = self.get_headers()
        existing_school_id = "c98520ba-646d-4103-838a-54417676750f"
        
        # First check if the school exists
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiry/{existing_school_id}",
            headers=headers
        )
        
        if get_response.status_code == 404:
            pytest.skip(f"Existing school ID {existing_school_id} not found - may have been deleted")
        
        assert get_response.status_code == 200, f"Failed to get existing school: {get_response.text}"
        original_school = get_response.json()
        print(f"✓ Found existing school: {original_school.get('school_name')}")
        
        # Update with test data - testing the new fields
        update_data = {
            "location": original_school.get("location", "Test Location"),
            "board": original_school.get("board", "CBSE"),
            "model": "Test Model Update",
            "total_students": 999
        }
        
        patch_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{existing_school_id}",
            json=update_data,
            headers=headers
        )
        assert patch_response.status_code == 200, f"Failed to patch existing school: {patch_response.text}"
        updated_school = patch_response.json()
        
        # Verify the new fields were updated
        assert updated_school.get("model") == "Test Model Update", f"Model not updated: {updated_school.get('model')}"
        assert updated_school.get("total_students") == 999, f"Total students not updated: {updated_school.get('total_students')}"
        print(f"✓ Successfully updated existing school with new fields (model, total_students)")
        
        # Restore original values
        restore_data = {
            "model": original_school.get("model", ""),
            "total_students": original_school.get("total_students", 0)
        }
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{existing_school_id}",
            json=restore_data,
            headers=headers
        )
        print(f"✓ Restored original values")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
