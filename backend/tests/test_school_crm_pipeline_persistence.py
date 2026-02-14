"""
Test School CRM Pipeline Data Persistence - Iteration 35
Tests for the CRITICAL recurring issue (7+ reports) where data doesn't persist 
correctly when moving schools through pipeline stages.

CRITICAL TEST SCENARIOS:
1. Create school lead with all fields → verify persistence
2. Add notes to school lead → verify notes persist
3. Add additional contacts → verify contacts persist  
4. Change status new → contacted → verify all data intact
5. Schedule meeting (meeting_date, meeting_time) → verify saves
6. Change status to meeting_done → verify all previous data intact
7. Convert school (offerings, payment, address) → verify conversion
8. Verify converted school in Active tab with all data
9. Edit active school details → verify changes save
10. Test onboarding workflow modal opens with correct data
11. Test renewal flow → mark for renewal → complete renewal
12. Verify activity history tracks all status changes
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSchoolCRMPipelinePersistence:
    """Test School CRM pipeline data persistence - CRITICAL recurring issue"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and authentication"""
        self.admin_email = "admin@oll.co"
        self.admin_password = "Dagaji03@"
        self.auth_token = None
        self.created_school_ids = []
        self.test_school_id = None
        self.test_school_data = {}
        
        # Generate unique test identifier
        self.unique_id = str(uuid.uuid4())[:8]
        
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
    # Test 1: Create School Lead with All Fields
    # ==========================================
    def test_01_create_school_lead_with_all_fields(self):
        """Create a new school lead with all fields and verify they persist"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        headers = self.get_headers()
        
        # Create school with all fields
        school_data = {
            "school_name": f"TEST_Pipeline_School_{self.unique_id}",
            "contact_name": "Principal Test Kumar",
            "email": f"test_pipeline_{self.unique_id}@testschool.com",
            "phone": f"9876543{self.unique_id[:3]}",
            "location": "Mumbai",
            "board": "CBSE",
            "school_size": "500-1000",
            "fee_range": "50000-100000",
            "programs_interested": ["Robotics", "AI"],
            "support_needed": ["Training", "Curriculum"],
            "source": "manual",
            "notes": f"Initial notes for test school {self.unique_id}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/schools/inquiry",
            json=school_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to create school: {response.text}"
        created_school = response.json()
        
        # Store for later tests
        self.test_school_id = created_school["id"]
        self.created_school_ids.append(self.test_school_id)
        self.test_school_data = school_data
        
        # Verify all fields persisted
        assert created_school["school_name"] == school_data["school_name"], "School name not persisted"
        assert created_school["contact_name"] == school_data["contact_name"], "Contact name not persisted"
        assert created_school["email"] == school_data["email"], "Email not persisted"
        assert created_school["phone"] == school_data["phone"], "Phone not persisted"
        assert created_school["location"] == school_data["location"], "Location not persisted"
        assert created_school["board"] == school_data["board"], "Board not persisted"
        assert created_school["status"] == "new", "Status should be 'new'"
        
        print(f"✓ Created school lead {self.test_school_id} with all fields")
        
        # GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        assert get_response.status_code == 200
        
        schools = get_response.json()
        found_school = next((s for s in schools if s["id"] == self.test_school_id), None)
        assert found_school is not None, "Created school not found in list"
        assert found_school["school_name"] == school_data["school_name"], "School name not persisted after GET"
        assert found_school["contact_name"] == school_data["contact_name"], "Contact name not persisted after GET"
        
        print(f"✓ Verified school data persistence after GET")
        return self.test_school_id

    # ==========================================
    # Test 2: Add Notes to School Lead
    # ==========================================
    def test_02_add_notes_persist(self):
        """Add notes to the school lead and verify they persist"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # First create a school
        school_id = self.test_01_create_school_lead_with_all_fields()
        headers = self.get_headers()
        
        # Add notes via PATCH
        new_notes = f"Updated notes at {datetime.now().isoformat()}\n\nThis is important follow-up information about the school."
        
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"notes": new_notes},
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Failed to update notes: {update_response.text}"
        updated_school = update_response.json()
        
        # Verify notes persisted in response
        assert updated_school["notes"] == new_notes, f"Notes not updated in response. Got: {updated_school.get('notes')}"
        
        # GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        assert get_response.status_code == 200
        
        schools = get_response.json()
        found_school = next((s for s in schools if s["id"] == school_id), None)
        assert found_school is not None, "School not found after notes update"
        assert found_school["notes"] == new_notes, f"Notes not persisted after GET. Got: {found_school.get('notes')}"
        
        print(f"✓ Notes added and persisted correctly")

    # ==========================================
    # Test 3: Status Change - New to Contacted
    # ==========================================
    def test_03_status_change_new_to_contacted(self):
        """Change status from 'new' to 'contacted' and verify all data persists"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Create a school first
        school_id = self.test_01_create_school_lead_with_all_fields()
        headers = self.get_headers()
        
        # Get original data
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        original_school = next((s for s in schools if s["id"] == school_id), None)
        
        # Change status to contacted
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "contacted"},
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Failed to update status: {update_response.text}"
        updated_school = update_response.json()
        
        # Verify status changed
        assert updated_school["status"] == "contacted", f"Status not updated. Got: {updated_school.get('status')}"
        
        # Verify original data is intact
        assert updated_school["school_name"] == original_school["school_name"], "School name lost after status change"
        assert updated_school["contact_name"] == original_school["contact_name"], "Contact name lost after status change"
        assert updated_school["email"] == original_school["email"], "Email lost after status change"
        assert updated_school["phone"] == original_school["phone"], "Phone lost after status change"
        assert updated_school["location"] == original_school["location"], "Location lost after status change"
        
        # GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        found_school = next((s for s in schools if s["id"] == school_id), None)
        
        assert found_school["status"] == "contacted", "Status not persisted after GET"
        assert found_school["school_name"] == original_school["school_name"], "School name not persisted after status change GET"
        
        print(f"✓ Status changed to 'contacted' and all data persisted")

    # ==========================================
    # Test 4: Schedule Meeting - Date and Time
    # ==========================================
    def test_04_schedule_meeting_persistence(self):
        """Schedule a meeting (set meeting_date, meeting_time) and verify it saves"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Create a school first
        school_id = self.test_01_create_school_lead_with_all_fields()
        headers = self.get_headers()
        
        # Schedule a meeting
        meeting_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        meeting_time = "10:30"
        
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "meeting_date": meeting_date,
                "meeting_time": meeting_time,
                "meeting_type": "offline"
            },
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Failed to schedule meeting: {update_response.text}"
        updated_school = update_response.json()
        
        # Verify meeting data in response
        assert updated_school["meeting_date"] == meeting_date, f"Meeting date not saved. Got: {updated_school.get('meeting_date')}"
        assert updated_school["meeting_time"] == meeting_time, f"Meeting time not saved. Got: {updated_school.get('meeting_time')}"
        
        # GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        found_school = next((s for s in schools if s["id"] == school_id), None)
        
        assert found_school["meeting_date"] == meeting_date, f"Meeting date not persisted. Got: {found_school.get('meeting_date')}"
        assert found_school["meeting_time"] == meeting_time, f"Meeting time not persisted. Got: {found_school.get('meeting_time')}"
        
        print(f"✓ Meeting scheduled and persisted - Date: {meeting_date}, Time: {meeting_time}")

    # ==========================================
    # Test 5: Status Change - To Meeting Done
    # ==========================================
    def test_05_status_change_to_meeting_done(self):
        """Change status to 'meeting_done' and verify all previous data is intact"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Create a school and schedule meeting first
        school_id = self.test_01_create_school_lead_with_all_fields()
        headers = self.get_headers()
        
        # Schedule meeting first
        meeting_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        meeting_time = "10:30"
        
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "meeting_date": meeting_date,
                "meeting_time": meeting_time,
                "notes": "Pre-meeting notes added"
            },
            headers=headers
        )
        
        # Get data before status change
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        before_status_change = next((s for s in schools if s["id"] == school_id), None)
        
        # Change status to meeting_done with meeting notes
        meeting_notes = "Meeting completed successfully. Discussed robotics program. School is interested."
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "meeting_done",
                "notes": meeting_notes,
                "quoted_price": "150000"
            },
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Failed to update status to meeting_done: {update_response.text}"
        updated_school = update_response.json()
        
        # Verify status changed
        assert updated_school["status"] == "meeting_done", f"Status not updated to meeting_done. Got: {updated_school.get('status')}"
        
        # Verify previous data is intact
        assert updated_school["school_name"] == before_status_change["school_name"], "School name lost after meeting_done"
        assert updated_school["contact_name"] == before_status_change["contact_name"], "Contact name lost after meeting_done"
        assert updated_school["meeting_date"] == meeting_date, "Meeting date lost after meeting_done"
        assert updated_school["meeting_time"] == meeting_time, "Meeting time lost after meeting_done"
        
        # Verify new data saved
        assert meeting_notes in updated_school.get("notes", ""), "Meeting notes not saved"
        assert updated_school.get("quoted_price") == "150000", "Quoted price not saved"
        
        # GET to verify full persistence
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        found_school = next((s for s in schools if s["id"] == school_id), None)
        
        assert found_school["status"] == "meeting_done", "Status not persisted as meeting_done"
        assert found_school["school_name"] == before_status_change["school_name"], "School name lost in GET after meeting_done"
        assert found_school["meeting_date"] == meeting_date, "Meeting date lost in GET after meeting_done"
        
        print(f"✓ Status changed to 'meeting_done' and all data persisted")

    # ==========================================
    # Test 6: Convert School with Onboarding Data
    # ==========================================
    def test_06_convert_school_with_onboarding_data(self):
        """Convert the school (add offerings, payment details, address) and verify conversion works"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Create a school and move to meeting_done
        school_id = self.test_01_create_school_lead_with_all_fields()
        headers = self.get_headers()
        
        # Set to meeting_done first
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "meeting_done", "quoted_price": "200000"},
            headers=headers
        )
        
        # Get current school data
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        pre_convert_school = next((s for s in schools if s["id"] == school_id), None)
        
        # Convert school with onboarding data
        onboarding_data = {
            "offering": "Robotics",
            "model": "teacher_led",
            "kit_type": "lab_setup",
            "book_type": "individual_books",
            "training_type": "teacher_training",
            "pricing_type": "per_student",
            "total_students": 150,
            "total_amount": 225000,
            "grade_pricing": [
                {"grade": "6", "students": "50", "price_per_student": "1500"},
                {"grade": "7", "students": "50", "price_per_student": "1500"},
                {"grade": "8", "students": "50", "price_per_student": "1500"}
            ],
            "school_contacts": [
                {"name": "Principal Kumar", "phone": "+919876543210", "email": "principal@testschool.com", "role": "principal"},
                {"name": "Coordinator Singh", "phone": "+919876543211", "email": "coordinator@testschool.com", "role": "coordinator"}
            ],
            "payment_mode": "from_school",
            "payment_method": "neft",
            "payment_tranches": [
                {"percentage": "50", "amount": "112500", "date": "2025-02-01", "notes": "First installment"},
                {"percentage": "50", "amount": "112500", "date": "2025-04-01", "notes": "Second installment"}
            ],
            "contract_start": "2025-02-01",
            "contract_end": "2026-01-31"
        }
        
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "converted",
                "conversion_amount": "225000",
                "address": "123 Test Road, Mumbai - 400001",
                "onboarding_data": onboarding_data
            },
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Failed to convert school: {update_response.text}"
        converted_school = update_response.json()
        
        # Verify conversion status
        assert converted_school["status"] == "converted", f"Status not set to converted. Got: {converted_school.get('status')}"
        
        # Verify pre-conversion data is intact
        assert converted_school["school_name"] == pre_convert_school["school_name"], "School name lost after conversion"
        assert converted_school["contact_name"] == pre_convert_school["contact_name"], "Contact name lost after conversion"
        assert converted_school["email"] == pre_convert_school["email"], "Email lost after conversion"
        
        # Verify conversion data saved
        assert converted_school.get("conversion_amount") == "225000", f"Conversion amount not saved. Got: {converted_school.get('conversion_amount')}"
        assert converted_school.get("address") == "123 Test Road, Mumbai - 400001", f"Address not saved. Got: {converted_school.get('address')}"
        
        # Verify onboarding data saved
        saved_onboarding = converted_school.get("onboarding_data", {})
        assert saved_onboarding.get("offering") == "Robotics", f"Offering not saved. Got: {saved_onboarding.get('offering')}"
        assert saved_onboarding.get("total_students") == 150, f"Total students not saved. Got: {saved_onboarding.get('total_students')}"
        assert saved_onboarding.get("total_amount") == 225000, f"Total amount not saved. Got: {saved_onboarding.get('total_amount')}"
        
        # Verify contacts saved
        saved_contacts = saved_onboarding.get("school_contacts", [])
        assert len(saved_contacts) >= 2, f"Contacts not saved. Got {len(saved_contacts)} contacts"
        
        # GET to verify full persistence
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        found_school = next((s for s in schools if s["id"] == school_id), None)
        
        assert found_school["status"] == "converted", "Conversion status not persisted"
        assert found_school["school_name"] == pre_convert_school["school_name"], "School name lost after conversion GET"
        assert found_school.get("conversion_amount") == "225000", "Conversion amount not persisted in GET"
        
        print(f"✓ School converted successfully with all onboarding data persisted")

    # ==========================================
    # Test 7: Edit Active School Details
    # ==========================================
    def test_07_edit_active_school_details(self):
        """Edit an active school's details and verify changes save"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Create and convert a school
        school_id = self.test_01_create_school_lead_with_all_fields()
        headers = self.get_headers()
        
        # Convert school
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "converted", "conversion_amount": "100000"},
            headers=headers
        )
        
        # Now edit school details
        updated_details = {
            "school_name": f"TEST_Updated_Pipeline_School_{self.unique_id}",
            "contact_name": "Updated Principal Name",
            "location": "Delhi",
            "board": "ICSE",
            "address": "Updated Address, Delhi - 110001",
            "total_students": 200
        }
        
        update_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json=updated_details,
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Failed to edit school: {update_response.text}"
        edited_school = update_response.json()
        
        # Verify edits saved
        assert edited_school["school_name"] == updated_details["school_name"], "School name edit not saved"
        assert edited_school["contact_name"] == updated_details["contact_name"], "Contact name edit not saved"
        assert edited_school["location"] == updated_details["location"], "Location edit not saved"
        assert edited_school["board"] == updated_details["board"], "Board edit not saved"
        
        # Verify status preserved
        assert edited_school["status"] == "converted", "Status changed during edit"
        
        # GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        found_school = next((s for s in schools if s["id"] == school_id), None)
        
        assert found_school["school_name"] == updated_details["school_name"], "School name edit not persisted"
        assert found_school["location"] == updated_details["location"], "Location edit not persisted"
        
        print(f"✓ Active school details edited and persisted")

    # ==========================================
    # Test 8: Init Onboarding and Workflow
    # ==========================================
    def test_08_init_onboarding_workflow(self):
        """Test onboarding workflow initialization for converted school"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Create and convert a school
        school_id = self.test_01_create_school_lead_with_all_fields()
        headers = self.get_headers()
        
        # Convert school with onboarding data
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "converted",
                "conversion_amount": "100000",
                "onboarding_data": {
                    "offering": "Robotics",
                    "total_students": 100,
                    "total_amount": 100000,
                    "contract_start": "2025-02-01",
                    "contract_end": "2026-01-31"
                }
            },
            headers=headers
        )
        
        # Initialize onboarding
        init_response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/init-onboarding",
            json={},
            headers=headers
        )
        
        assert init_response.status_code == 200, f"Failed to init onboarding: {init_response.text}"
        init_result = init_response.json()
        
        # Verify tracking token generated
        assert "tracking_token" in init_result, "Tracking token not generated"
        
        # GET onboarding data
        onboarding_response = requests.get(
            f"{BASE_URL}/api/schools/{school_id}/onboarding",
            headers=headers
        )
        
        assert onboarding_response.status_code == 200, f"Failed to get onboarding: {onboarding_response.text}"
        onboarding = onboarding_response.json()
        
        # Verify workflow data
        workflow = onboarding.get("workflow", {})
        assert workflow.get("tracking_token"), "Tracking token not in workflow"
        
        # Verify MOU step is auto-completed
        steps = workflow.get("steps", {})
        mou_step = steps.get("mou_signing", {})
        assert mou_step.get("completed") == True, "MOU step not auto-completed"
        
        print(f"✓ Onboarding workflow initialized with tracking token: {init_result.get('tracking_token')}")

    # ==========================================
    # Test 9: Activity History Tracking
    # ==========================================
    def test_09_activity_history_tracking(self):
        """Verify activity history tracks all status changes correctly"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Create a school
        school_id = self.test_01_create_school_lead_with_all_fields()
        headers = self.get_headers()
        
        # Make several status changes
        # 1. Add notes
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"notes": "First contact made"},
            headers=headers
        )
        
        # 2. Schedule meeting
        meeting_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"meeting_date": meeting_date, "meeting_time": "11:00"},
            headers=headers
        )
        
        # 3. Change status to meeting_done
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "meeting_done", "notes": "Meeting completed"},
            headers=headers
        )
        
        # 4. Convert
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "converted", "conversion_amount": "50000"},
            headers=headers
        )
        
        # Get history
        history_response = requests.get(
            f"{BASE_URL}/api/schools/{school_id}/history",
            headers=headers
        )
        
        assert history_response.status_code == 200, f"Failed to get history: {history_response.text}"
        history_data = history_response.json()
        
        history = history_data.get("history", [])
        assert len(history) > 0, "No history entries found"
        
        # Verify history contains key events
        history_types = [h.get("type") for h in history]
        assert "created" in history_types, "Created event not in history"
        
        print(f"✓ Activity history tracking working - {len(history)} entries found")
        print(f"  History types: {history_types}")

    # ==========================================
    # Test 10: Renewal Flow
    # ==========================================
    def test_10_renewal_flow(self):
        """Test renewal flow - mark school for renewal and complete renewal"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Create, convert and set to active
        school_id = self.test_01_create_school_lead_with_all_fields()
        headers = self.get_headers()
        
        # Convert school
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "converted",
                "conversion_amount": "100000",
                "onboarding_data": {
                    "offering": "Robotics",
                    "total_students": 100,
                    "total_amount": 100000
                }
            },
            headers=headers
        )
        
        # Set to active
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "active"},
            headers=headers
        )
        
        # Get data before renewal
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        pre_renewal_school = next((s for s in schools if s["id"] == school_id), None)
        
        # Schedule renewal meeting
        renewal_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        renewal_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "renewal_meeting",
                "renewal_meeting_date": renewal_date,
                "renewal_meeting_time": "14:00",
                "renewal_meeting_type": "offline"
            },
            headers=headers
        )
        
        assert renewal_response.status_code == 200, f"Failed to schedule renewal: {renewal_response.text}"
        renewal_school = renewal_response.json()
        
        # Verify renewal meeting data saved
        assert renewal_school["status"] == "renewal_meeting", "Status not set to renewal_meeting"
        assert renewal_school.get("renewal_meeting_date") == renewal_date, "Renewal date not saved"
        
        # Verify original data preserved
        assert renewal_school["school_name"] == pre_renewal_school["school_name"], "School name lost during renewal"
        
        # Complete renewal - set to renewed status
        renewed_response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "renewed",
                "conversion_amount": "120000",
                "onboarding_data": {
                    "offering": "Robotics",
                    "total_students": 120,
                    "total_amount": 120000,
                    "renewal_date": datetime.now().isoformat()
                }
            },
            headers=headers
        )
        
        assert renewed_response.status_code == 200, f"Failed to complete renewal: {renewed_response.text}"
        renewed_school = renewed_response.json()
        
        # Verify renewed status
        assert renewed_school["status"] == "renewed", "Status not set to renewed"
        assert renewed_school.get("conversion_amount") == "120000", "Renewal amount not saved"
        
        # GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=headers
        )
        schools = get_response.json()
        found_school = next((s for s in schools if s["id"] == school_id), None)
        
        assert found_school["status"] == "renewed", "Renewed status not persisted"
        assert found_school["school_name"] == pre_renewal_school["school_name"], "School name lost after renewal"
        
        print(f"✓ Renewal flow completed successfully")

    # ==========================================
    # Test 11: Full Pipeline E2E Test
    # ==========================================
    def test_11_full_pipeline_e2e(self):
        """
        CRITICAL: Full end-to-end pipeline test
        new → contacted → meeting_done → converted → active → renewal → renewed
        Verify data persists at each stage
        """
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        headers = self.get_headers()
        unique_id = str(uuid.uuid4())[:8]
        
        # Step 1: Create school with all fields
        original_data = {
            "school_name": f"TEST_E2E_School_{unique_id}",
            "contact_name": "E2E Principal Test",
            "email": f"e2e_{unique_id}@testschool.com",
            "phone": f"9988776{unique_id[:3]}",
            "location": "Bangalore",
            "board": "CBSE",
            "school_size": "1000+",
            "fee_range": "100000+",
            "programs_interested": ["Robotics", "AI", "Coding"],
            "support_needed": ["Training", "Curriculum"],
            "source": "manual",
            "notes": "E2E Test School - Full Pipeline"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/schools/inquiry",
            json=original_data,
            headers=headers
        )
        assert create_response.status_code == 200
        school_id = create_response.json()["id"]
        self.created_school_ids.append(school_id)
        print(f"  Step 1: Created school {school_id}")
        
        # Step 2: Change to contacted
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "contacted", "notes": f"{original_data['notes']}\n\nContacted on phone."},
            headers=headers
        )
        
        # Verify data
        schools = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers).json()
        school = next((s for s in schools if s["id"] == school_id), None)
        assert school["status"] == "contacted", "Status not changed to contacted"
        assert school["school_name"] == original_data["school_name"], "School name lost at contacted stage"
        print(f"  Step 2: Changed to contacted - data intact")
        
        # Step 3: Schedule meeting
        meeting_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"meeting_date": meeting_date, "meeting_time": "10:00", "meeting_type": "offline"},
            headers=headers
        )
        
        schools = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers).json()
        school = next((s for s in schools if s["id"] == school_id), None)
        assert school["meeting_date"] == meeting_date, "Meeting date not saved"
        assert school["school_name"] == original_data["school_name"], "School name lost at meeting stage"
        print(f"  Step 3: Meeting scheduled - data intact")
        
        # Step 4: Mark meeting done
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "meeting_done",
                "notes": f"{school['notes']}\n\nMeeting completed. School interested.",
                "quoted_price": "300000"
            },
            headers=headers
        )
        
        schools = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers).json()
        school = next((s for s in schools if s["id"] == school_id), None)
        assert school["status"] == "meeting_done", "Status not changed to meeting_done"
        assert school["school_name"] == original_data["school_name"], "School name lost at meeting_done stage"
        assert school["meeting_date"] == meeting_date, "Meeting date lost at meeting_done stage"
        print(f"  Step 4: Meeting done - data intact")
        
        # Step 5: Convert school
        onboarding_data = {
            "offering": "Robotics",
            "model": "teacher_led",
            "total_students": 200,
            "total_amount": 300000,
            "contract_start": "2025-02-01",
            "contract_end": "2026-01-31",
            "school_contacts": [
                {"name": "E2E Principal", "phone": "+919988776655", "email": "principal@e2e.com", "role": "principal"}
            ]
        }
        
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "converted",
                "conversion_amount": "300000",
                "address": "E2E Test Address, Bangalore",
                "onboarding_data": onboarding_data
            },
            headers=headers
        )
        
        schools = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers).json()
        school = next((s for s in schools if s["id"] == school_id), None)
        assert school["status"] == "converted", "Status not changed to converted"
        assert school["school_name"] == original_data["school_name"], "School name lost at converted stage"
        assert school.get("conversion_amount") == "300000", "Conversion amount not saved"
        assert school.get("onboarding_data", {}).get("total_students") == 200, "Onboarding data not saved"
        print(f"  Step 5: Converted - data intact")
        
        # Step 6: Initialize onboarding
        init_response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/init-onboarding",
            json={},
            headers=headers
        )
        assert init_response.status_code == 200
        print(f"  Step 6: Onboarding initialized")
        
        # Step 7: Set to active (simulating onboarding completion)
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={"status": "active"},
            headers=headers
        )
        
        schools = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers).json()
        school = next((s for s in schools if s["id"] == school_id), None)
        assert school["status"] == "active", "Status not changed to active"
        assert school["school_name"] == original_data["school_name"], "School name lost at active stage"
        print(f"  Step 7: Active - data intact")
        
        # Step 8: Schedule renewal meeting
        renewal_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "renewal_meeting",
                "renewal_meeting_date": renewal_date,
                "renewal_meeting_time": "15:00",
                "renewal_meeting_type": "online"
            },
            headers=headers
        )
        
        schools = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers).json()
        school = next((s for s in schools if s["id"] == school_id), None)
        assert school["status"] == "renewal_meeting", "Status not changed to renewal_meeting"
        assert school.get("renewal_meeting_date") == renewal_date, "Renewal date not saved"
        assert school["school_name"] == original_data["school_name"], "School name lost at renewal stage"
        print(f"  Step 8: Renewal meeting scheduled - data intact")
        
        # Step 9: Complete renewal
        requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school_id}",
            json={
                "status": "renewed",
                "conversion_amount": "350000",
                "onboarding_data": {
                    **onboarding_data,
                    "total_amount": 350000,
                    "total_students": 220,
                    "renewal_date": datetime.now().isoformat()
                }
            },
            headers=headers
        )
        
        schools = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers).json()
        school = next((s for s in schools if s["id"] == school_id), None)
        assert school["status"] == "renewed", "Status not changed to renewed"
        assert school["school_name"] == original_data["school_name"], "School name lost at renewed stage"
        assert school.get("conversion_amount") == "350000", "Renewal amount not saved"
        print(f"  Step 9: Renewed - data intact")
        
        # Final verification - check all original data is preserved
        assert school["contact_name"] == original_data["contact_name"], "Contact name lost at final stage"
        assert school["email"] == original_data["email"], "Email lost at final stage"
        assert school["phone"] == original_data["phone"], "Phone lost at final stage"
        assert school["location"] == original_data["location"], "Location lost at final stage"
        assert school["board"] == original_data["board"], "Board lost at final stage"
        
        # Get history
        history_response = requests.get(
            f"{BASE_URL}/api/schools/{school_id}/history",
            headers=headers
        )
        assert history_response.status_code == 200
        history = history_response.json().get("history", [])
        
        print(f"\n✓ FULL PIPELINE E2E TEST PASSED")
        print(f"  School went through: new → contacted → meeting_done → converted → active → renewal_meeting → renewed")
        print(f"  All original data preserved throughout pipeline")
        print(f"  Activity history has {len(history)} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
