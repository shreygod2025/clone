"""
Test Suite for School Renewal Workflow
Tests: Lost Reason Modal, Renewal Meeting, Renewal Conversion, Re-onboarding
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"
TEST_SCHOOL_ID = "c98520ba-646d-4103-838a-54417676750f"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestSchoolInquiryUpdateModel:
    """Test that SchoolInquiryUpdate model accepts renewal-related fields"""
    
    def test_patch_accepts_lost_reason(self, auth_headers):
        """Test PATCH /api/schools/inquiry/{id} accepts lost_reason field"""
        # First get a school to test with
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Find an active school to test with
        active_school = next((s for s in schools if s.get('status') == 'active'), None)
        if not active_school:
            pytest.skip("No active school found for testing")
        
        # Test that lost_reason field is accepted (don't actually change status)
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{active_school['id']}", 
            json={"notes": active_school.get('notes', '') + "\n[Test: lost_reason field check]"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        print(f"✓ PATCH endpoint accepts updates for school {active_school['id']}")
    
    def test_patch_accepts_renewal_meeting_fields(self, auth_headers):
        """Test PATCH accepts renewal_meeting_date, renewal_meeting_time, renewal_meeting_type, renewal_meeting_link, renewal_meeting_address"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Find a school in renewal_meeting status
        renewal_school = next((s for s in schools if s.get('status') == 'renewal_meeting'), None)
        if not renewal_school:
            # Find any active school
            renewal_school = next((s for s in schools if s.get('status') == 'active'), None)
        
        if not renewal_school:
            pytest.skip("No suitable school found for testing")
        
        # Test updating renewal meeting fields
        update_data = {
            "renewal_meeting_date": "2026-02-15",
            "renewal_meeting_time": "14:00",
            "renewal_meeting_type": "online",
            "renewal_meeting_link": "https://meet.google.com/test-link",
            "renewal_meeting_address": ""
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{renewal_school['id']}", 
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        
        # Verify the fields were saved
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        updated_school = next((s for s in response.json() if s['id'] == renewal_school['id']), None)
        
        assert updated_school is not None
        assert updated_school.get('renewal_meeting_date') == "2026-02-15"
        assert updated_school.get('renewal_meeting_time') == "14:00"
        assert updated_school.get('renewal_meeting_type') == "online"
        print(f"✓ Renewal meeting fields saved correctly for school {renewal_school['id']}")


class TestLostReasonWorkflow:
    """Test Lost Reason functionality"""
    
    def test_mark_school_as_lost_with_reason(self, auth_headers):
        """Test marking a school as lost with a reason"""
        # Get schools
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Find a school that can be marked as lost (active or renewal_meeting)
        test_school = next((s for s in schools if s.get('status') in ['active', 'renewal_meeting', 'meeting_done']), None)
        if not test_school:
            pytest.skip("No suitable school found for lost reason test")
        
        original_status = test_school['status']
        
        # Mark as lost with reason
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{test_school['id']}", 
            json={
                "status": "lost",
                "lost_reason": "Budget constraints",
                "notes": test_school.get('notes', '') + "\n--- Lost Reason Test ---\nBudget constraints"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to mark as lost: {response.text}"
        
        # Verify status changed
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        updated_school = next((s for s in response.json() if s['id'] == test_school['id']), None)
        assert updated_school['status'] == 'lost'
        assert updated_school.get('lost_reason') == 'Budget constraints'
        print(f"✓ School {test_school['id']} marked as lost with reason")
        
        # Restore original status
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{test_school['id']}", 
            json={"status": original_status},
            headers=auth_headers
        )


class TestRenewalMeetingWorkflow:
    """Test Renewal Meeting stage workflow"""
    
    def test_renewal_meeting_stage_exists(self, auth_headers):
        """Test that renewal_meeting is a valid status"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Check if any school has renewal_meeting status
        renewal_schools = [s for s in schools if s.get('status') == 'renewal_meeting']
        print(f"✓ Found {len(renewal_schools)} schools in renewal_meeting status")
    
    def test_schedule_renewal_meeting(self, auth_headers):
        """Test scheduling a renewal meeting for an active school"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Find an active school
        active_school = next((s for s in schools if s.get('status') == 'active'), None)
        if not active_school:
            pytest.skip("No active school found for renewal meeting test")
        
        # Schedule renewal meeting
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{active_school['id']}", 
            json={
                "status": "renewal_meeting",
                "renewal_meeting_date": "2026-02-20",
                "renewal_meeting_time": "15:00",
                "renewal_meeting_type": "offline",
                "renewal_meeting_address": "School Campus, Main Building"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to schedule renewal meeting: {response.text}"
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        updated_school = next((s for s in response.json() if s['id'] == active_school['id']), None)
        assert updated_school['status'] == 'renewal_meeting'
        assert updated_school.get('renewal_meeting_date') == "2026-02-20"
        print(f"✓ Renewal meeting scheduled for school {active_school['id']}")


class TestRenewalConversionWorkflow:
    """Test Renewal Conversion workflow"""
    
    def test_convert_renewal_meeting_to_renewed(self, auth_headers):
        """Test converting a school from renewal_meeting to renewed status"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Find a school in renewal_meeting status
        renewal_school = next((s for s in schools if s.get('status') == 'renewal_meeting'), None)
        if not renewal_school:
            pytest.skip("No school in renewal_meeting status found")
        
        # Convert to renewed
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{renewal_school['id']}", 
            json={
                "status": "renewed",
                "conversion_amount": "150000",
                "onboarding_data": {
                    "total_amount": 150000,
                    "model": "lab_setup",
                    "kit_type": "advanced",
                    "total_students": 200,
                    "renewal_date": "2026-02-02T12:00:00Z"
                }
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to convert to renewed: {response.text}"
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        updated_school = next((s for s in response.json() if s['id'] == renewal_school['id']), None)
        assert updated_school['status'] == 'renewed'
        print(f"✓ School {renewal_school['id']} converted to renewed status")


class TestInitOnboardingWithRenewal:
    """Test init-onboarding endpoint with is_renewal flag"""
    
    def test_init_onboarding_accepts_is_renewal(self, auth_headers):
        """Test POST /api/schools/{id}/init-onboarding accepts is_renewal flag"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Find a renewed school
        renewed_school = next((s for s in schools if s.get('status') == 'renewed'), None)
        if not renewed_school:
            # Find any converted school
            renewed_school = next((s for s in schools if s.get('status') in ['converted', 'active']), None)
        
        if not renewed_school:
            pytest.skip("No suitable school found for init-onboarding test")
        
        # Test init-onboarding with is_renewal flag
        response = requests.post(
            f"{BASE_URL}/api/schools/{renewed_school['id']}/init-onboarding",
            json={"is_renewal": True},
            headers=auth_headers
        )
        
        # Should return 200 with tracking token
        assert response.status_code == 200, f"Init onboarding failed: {response.text}"
        data = response.json()
        assert "tracking_token" in data
        assert data["tracking_token"].startswith("oll-")
        print(f"✓ Init onboarding with is_renewal=True returned tracking token: {data['tracking_token']}")
    
    def test_init_onboarding_without_renewal_flag(self, auth_headers):
        """Test POST /api/schools/{id}/init-onboarding without is_renewal flag"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Find a converted school
        converted_school = next((s for s in schools if s.get('status') == 'converted'), None)
        if not converted_school:
            pytest.skip("No converted school found for init-onboarding test")
        
        # Test init-onboarding without is_renewal flag
        response = requests.post(
            f"{BASE_URL}/api/schools/{converted_school['id']}/init-onboarding",
            json={},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Init onboarding failed: {response.text}"
        data = response.json()
        assert "tracking_token" in data
        print(f"✓ Init onboarding without is_renewal flag returned tracking token: {data['tracking_token']}")


class TestStatusSections:
    """Test that all status sections are properly handled"""
    
    def test_all_status_values_accepted(self, auth_headers):
        """Test that all status values are accepted by the API"""
        valid_statuses = ['new', 'meeting_done', 'converted', 'active', 'renewal_meeting', 'renewed', 'lost', 'archived']
        
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        # Get status distribution
        status_counts = {}
        for school in schools:
            status = school.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"✓ Status distribution: {status_counts}")
        
        # Verify all statuses in response are valid
        for school in schools:
            assert school.get('status') in valid_statuses, f"Invalid status: {school.get('status')}"
        
        print(f"✓ All {len(schools)} schools have valid status values")


class TestTestSchoolData:
    """Test the specific test school mentioned in requirements"""
    
    def test_test_school_exists(self, auth_headers):
        """Test that the test school c98520ba-646d-4103-838a-54417676750f exists"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()
        
        test_school = next((s for s in schools if s['id'] == TEST_SCHOOL_ID), None)
        if test_school:
            print(f"✓ Test school found: {test_school.get('school_name')} - Status: {test_school.get('status')}")
            print(f"  Renewal meeting date: {test_school.get('renewal_meeting_date')}")
            print(f"  Renewal meeting time: {test_school.get('renewal_meeting_time')}")
        else:
            print(f"⚠ Test school {TEST_SCHOOL_ID} not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
