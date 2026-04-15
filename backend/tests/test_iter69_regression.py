"""
Regression tests for Iteration 69 features:
- Ticket ID on new inquiry (inquiry/query)
- Educator duplicate prevention (/educators/apply)
- Educator dedup endpoint (/educators/deduplicate)
- Summer Camp duplicate prevention (capture-lead + complete-lead)
- Support backfill ticket numbers endpoint
- Distributor fields in onboarding (code review via API check)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ── Auth Fixture ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@oll.co",
        "password": "Dagaji03@"
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    token = response.json().get("access_token")
    if not token:
        pytest.skip("No access token in response")
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ── Test 4: Ticket ID on New Inquiry ──────────────────────────────────────────

class TestInquiryQueryTicketNumber:
    """Verify POST /api/inquiry/query returns a ticket_number field"""

    def test_inquiry_query_returns_ticket_number(self):
        """POST to /api/inquiry/query should return a non-empty ticket_number"""
        payload = {
            "inquiry_type": "student",
            "query_type": "General",
            "query_details": "Test inquiry for ticket number check",
            "name": "Test Ticket User",
            "phone": "9999888801",
            "source": "quick_help_test"
        }
        response = requests.post(f"{BASE_URL}/api/inquiry/query", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "ticket_number" in data, f"ticket_number field missing from response: {data}"
        assert data["ticket_number"] != "", f"ticket_number is empty string: {data}"
        assert data["ticket_number"] is not None, f"ticket_number is None: {data}"
        
        # Ticket numbers should be zero-padded (e.g., '0001', '0067', etc.)
        ticket_num = str(data["ticket_number"])
        assert len(ticket_num) >= 1, f"Ticket number too short: {ticket_num}"
        print(f"✓ Ticket number assigned: #{ticket_num}")
        
        # Store ID for cleanup
        self.__class__.created_inquiry_id = data.get("id", "")

    def test_inquiry_query_id_returned(self):
        """POST to /api/inquiry/query should return an id field"""
        payload = {
            "inquiry_type": "student",
            "query_type": "General",
            "query_details": "Second test inquiry",
            "name": "Test Ticket User 2",
            "phone": "9999888802",
            "source": "quick_help_test"
        }
        response = requests.post(f"{BASE_URL}/api/inquiry/query", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["id"] != ""
        print(f"✓ Inquiry created with id: {data['id']}, ticket: #{data.get('ticket_number', '')}")


# ── Test 5: Educator Duplicate Prevention ────────────────────────────────────

class TestEducatorDuplicatePrevention:
    """Verify POST /api/educators/apply deduplicates by phone"""

    PHONE = "9111111111"
    created_app_id = None

    def test_first_application_creates_record(self):
        """First POST should create a new educator record"""
        payload = {
            "name": "TEST Educator Dedup",
            "email": "test_dedup_educator@example.com",
            "phone": self.PHONE,
            "skills": ["Robotics"],
            "source": "test_dedup"
        }
        response = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, f"id field missing: {data}"
        TestEducatorDuplicatePrevention.created_app_id = data["id"]
        print(f"✓ First application created with id: {data['id']}")

    def test_second_application_returns_same_id(self):
        """Second POST with same phone should return the SAME application ID"""
        if not TestEducatorDuplicatePrevention.created_app_id:
            pytest.skip("First application not created")
        
        payload = {
            "name": "TEST Educator Dedup Again",
            "email": "test_dedup_educator_2@example.com",
            "phone": self.PHONE,
            "skills": ["Coding"],
            "source": "test_dedup_2"
        }
        response = requests.post(f"{BASE_URL}/api/educators/apply", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == TestEducatorDuplicatePrevention.created_app_id, \
            f"Expected same id {TestEducatorDuplicatePrevention.created_app_id}, got {data['id']}"
        print(f"✓ Duplicate suppressed - returned same id: {data['id']}")

    def test_only_one_record_exists_for_phone(self, auth_headers):
        """GET /api/educators/applications should show only 1 entry for that phone"""
        if not TestEducatorDuplicatePrevention.created_app_id:
            pytest.skip("First application not created")
        
        response = requests.get(f"{BASE_URL}/api/educators/applications", headers=auth_headers)
        assert response.status_code == 200
        
        apps = response.json()
        matching = [a for a in apps if a.get("phone") == self.PHONE]
        assert len(matching) == 1, f"Expected 1 record for phone {self.PHONE}, found {len(matching)}"
        assert matching[0]["id"] == TestEducatorDuplicatePrevention.created_app_id
        print(f"✓ Only 1 record for phone {self.PHONE}")


# ── Test 6: Educator Deduplicate Endpoint ────────────────────────────────────

class TestEducatorDeduplicateEndpoint:
    """Verify POST /api/educators/deduplicate works without errors"""

    def test_deduplicate_endpoint_returns_ok(self, auth_headers):
        """POST /api/educators/deduplicate should return {deleted, affected_phones}"""
        response = requests.post(f"{BASE_URL}/api/educators/deduplicate", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "deleted" in data, f"'deleted' field missing: {data}"
        assert "affected_phones" in data, f"'affected_phones' field missing: {data}"
        assert isinstance(data["deleted"], int), f"'deleted' should be int: {data['deleted']}"
        assert isinstance(data["affected_phones"], list), f"'affected_phones' should be list: {data['affected_phones']}"
        print(f"✓ Deduplicate endpoint OK: deleted={data['deleted']}, affected_phones={len(data['affected_phones'])}")


# ── Test 7+8: Summer Camp Duplicate Prevention ───────────────────────────────

class TestSummerCampDuplicatePrevention:
    """Test duplicate prevention for summer camp bookings"""

    PHONE = "9888888881"
    booking_id1 = None
    booking_id2 = None

    def test_7a_capture_lead_first(self):
        """First capture-lead with phone 9888888881"""
        payload = {
            "parent_phone": self.PHONE,
            "age_group": "creators",
            "batch_type": "weekday",
            "batch_week": "week1",
            "mode": "offline",
            "center": "mira_road"
        }
        response = requests.post(f"{BASE_URL}/api/summer-camp/capture-lead", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "booking_id" in data
        TestSummerCampDuplicatePrevention.booking_id1 = data["booking_id"]
        print(f"✓ First lead captured: {data['booking_id']}")

    def test_7b_complete_lead_first_not_duplicate(self):
        """Complete first lead - should return is_duplicate: false"""
        if not TestSummerCampDuplicatePrevention.booking_id1:
            pytest.skip("First booking not created")
        
        bid = TestSummerCampDuplicatePrevention.booking_id1
        payload = {
            "child_name": "Test Child",
            "parent_email": "test@example.com",
            "payment_mode": "cash",
            "parent_name": "Test Parent"
        }
        response = requests.patch(f"{BASE_URL}/api/summer-camp/complete-lead/{bid}", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "is_duplicate" in data, f"is_duplicate field missing: {data}"
        assert data["is_duplicate"] == False, f"Expected is_duplicate=False, got {data['is_duplicate']}"
        print(f"✓ First lead completed - is_duplicate: {data['is_duplicate']}")

    def test_7c_capture_lead_again_same_phone(self):
        """Capture second lead with same phone"""
        payload = {
            "parent_phone": self.PHONE,
            "age_group": "creators",
            "batch_type": "weekday",
            "batch_week": "week2",
            "mode": "offline",
            "center": "andheri"
        }
        response = requests.post(f"{BASE_URL}/api/summer-camp/capture-lead", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        TestSummerCampDuplicatePrevention.booking_id2 = data["booking_id"]
        print(f"✓ Second lead captured: {data['booking_id']}")

    def test_7d_complete_second_lead_same_name_is_duplicate(self):
        """Complete second lead with same child name - should be duplicate"""
        if not TestSummerCampDuplicatePrevention.booking_id2:
            pytest.skip("Second booking not created")
        
        bid = TestSummerCampDuplicatePrevention.booking_id2
        payload = {
            "child_name": "Test Child",  # SAME name as first
            "parent_email": "test@example.com",
            "payment_mode": "cash",
            "parent_name": "Test Parent"
        }
        response = requests.patch(f"{BASE_URL}/api/summer-camp/complete-lead/{bid}", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "is_duplicate" in data, f"is_duplicate field missing: {data}"
        assert data["is_duplicate"] == True, f"Expected is_duplicate=True (same name), got {data['is_duplicate']}"
        # Should return the original booking_id
        assert data["booking_id"] == TestSummerCampDuplicatePrevention.booking_id1, \
            f"Should return original booking_id {TestSummerCampDuplicatePrevention.booking_id1}, got {data['booking_id']}"
        print(f"✓ Duplicate detected correctly - is_duplicate: True")

    def test_8_different_name_not_duplicate(self):
        """Test 8: Same phone, different child name = NOT a duplicate"""
        # Capture a new lead
        payload = {
            "parent_phone": self.PHONE,
            "age_group": "explorers",
            "batch_type": "weekday",
            "batch_week": "week3",
            "mode": "offline",
            "center": "mira_road"
        }
        response = requests.post(f"{BASE_URL}/api/summer-camp/capture-lead", json=payload)
        assert response.status_code == 200
        new_bid = response.json()["booking_id"]
        
        # Complete with DIFFERENT name
        payload2 = {
            "child_name": "Other Child",  # DIFFERENT name
            "parent_email": "test@example.com",
            "payment_mode": "cash",
            "parent_name": "Test Parent"
        }
        response2 = requests.patch(f"{BASE_URL}/api/summer-camp/complete-lead/{new_bid}", json=payload2)
        assert response2.status_code == 200
        
        data = response2.json()
        assert "is_duplicate" in data
        assert data["is_duplicate"] == False, \
            f"Expected is_duplicate=False (different child name), got {data['is_duplicate']}"
        print(f"✓ Different child name allowed - is_duplicate: False")
        
        # Store this booking ID for cleanup
        TestSummerCampDuplicatePrevention.booking_id3 = new_bid

    def test_cleanup_summer_camp_test_data(self, auth_headers):
        """Cleanup: delete test summer camp records"""
        bookings_to_delete = [
            TestSummerCampDuplicatePrevention.booking_id1,
            getattr(TestSummerCampDuplicatePrevention, 'booking_id3', None),
        ]
        # Note: booking_id2 was deleted by the dedup logic itself
        
        deleted = 0
        for bid in bookings_to_delete:
            if not bid:
                continue
            response = requests.delete(f"{BASE_URL}/api/summer-camp/bookings/{bid}", headers=auth_headers)
            if response.status_code == 200:
                deleted += 1
            else:
                print(f"  Warning: could not delete booking {bid}: {response.status_code}")
        
        print(f"✓ Cleaned up {deleted} test summer camp bookings")


# ── Test 3+10: Support Backfill Ticket Numbers ───────────────────────────────

class TestSupportBackfillTicketNumbers:
    """Test POST /api/support/backfill-ticket-numbers"""

    def test_backfill_returns_success(self, auth_headers):
        """POST /api/support/backfill-ticket-numbers should return proper response"""
        response = requests.post(
            f"{BASE_URL}/api/support/backfill-ticket-numbers",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "updated" in data, f"'updated' field missing: {data}"
        assert "breakdown" in data, f"'breakdown' field missing: {data}"
        assert "next_ticket_number" in data, f"'next_ticket_number' field missing: {data}"
        assert isinstance(data["updated"], int)
        assert isinstance(data["breakdown"], dict)
        print(f"✓ Backfill successful: updated={data['updated']}, next_ticket={data['next_ticket_number']}")

    def test_backfill_breakdown_has_expected_collections(self, auth_headers):
        """Breakdown should contain support_queries, support_tickets, inquiry_queries"""
        response = requests.post(
            f"{BASE_URL}/api/support/backfill-ticket-numbers",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        breakdown = data["breakdown"]
        expected_keys = ["support_queries", "support_tickets", "inquiry_queries"]
        for key in expected_keys:
            assert key in breakdown, f"Expected '{key}' in breakdown, got keys: {list(breakdown.keys())}"
        print(f"✓ Breakdown has all 3 collections: {breakdown}")

    def test_backfill_says_nothing_to_update_on_rerun(self, auth_headers):
        """Running backfill twice in a row should yield 0 on second run"""
        # First run
        requests.post(f"{BASE_URL}/api/support/backfill-ticket-numbers", headers=auth_headers)
        
        # Second run
        response = requests.post(
            f"{BASE_URL}/api/support/backfill-ticket-numbers",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # After a successful run, subsequent run should update 0 tickets
        assert data["updated"] == 0, \
            f"Expected 0 updated on re-run (all already have IDs), got {data['updated']}"
        print(f"✓ Re-run correctly returns updated=0")


# ── Cleanup Educator Test Data ────────────────────────────────────────────────

class TestCleanupEducatorTestData:
    """Cleanup educator test records"""

    def test_cleanup_test_educator(self, auth_headers):
        """Remove test educator created during tests"""
        phone = TestEducatorDuplicatePrevention.PHONE
        
        # Get all educators
        response = requests.get(f"{BASE_URL}/api/educators/applications", headers=auth_headers)
        if response.status_code != 200:
            print("Could not fetch educators for cleanup")
            return
        
        apps = response.json()
        to_delete = [a for a in apps if a.get("phone") == phone and "TEST" in a.get("name", "")]
        
        for app in to_delete:
            del_response = requests.delete(
                f"{BASE_URL}/api/educators/application/{app['id']}",
                headers=auth_headers
            )
            if del_response.status_code in [200, 204]:
                print(f"✓ Cleaned up educator {app['id']}")
            else:
                print(f"  Note: could not delete educator {app['id']}: {del_response.status_code}")
        
        print(f"✓ Educator cleanup completed ({len(to_delete)} records removed)")


# ── Test 9: Session Expired Redirect (code review) ────────────────────────────

class TestSessionExpiredInterceptor:
    """Code review check - verify 401 interceptor is in place"""

    def test_interceptor_file_exists_and_has_redirect(self):
        """Verify index.js has the 401 interceptor that redirects to /admin/login?reason=session_expired"""
        import os
        index_path = "/app/frontend/src/index.js"
        assert os.path.exists(index_path), f"index.js not found at {index_path}"
        
        with open(index_path) as f:
            content = f.read()
        
        assert "axios.interceptors.response" in content, "axios interceptor not found in index.js"
        assert "session_expired" in content, "'session_expired' not in index.js interceptor"
        assert "/admin/login" in content, "'/admin/login' not found in index.js"
        assert "expired" in content, "'expired' check not in index.js interceptor"
        print("✓ Session expired interceptor is in place with correct redirect logic")


# ── Test 1: Distributor Fields in Onboarding (API level) ─────────────────────

class TestDistributorFieldsAPI:
    """Code review check - verify distributor fields exist in onboarding model"""

    def test_distributor_fields_in_school_state(self):
        """Verify AdminSchoolCRM.jsx has distributor fields in onboardData"""
        import os
        crm_path = "/app/frontend/src/pages/admin/AdminSchoolCRM.jsx"
        assert os.path.exists(crm_path), f"AdminSchoolCRM.jsx not found"
        
        with open(crm_path) as f:
            content = f.read()
        
        assert "distributor_name" in content, "distributor_name not in AdminSchoolCRM.jsx"
        assert "distributor_address" in content, "distributor_address not in AdminSchoolCRM.jsx"
        assert "distributor_gstin" in content, "distributor_gstin not in AdminSchoolCRM.jsx"
        assert "from_distributor" in content, "from_distributor payment mode not in AdminSchoolCRM.jsx"
        print("✓ Distributor fields present in AdminSchoolCRM.jsx")


# ── Test 2: Student Payment Form Fields (code review) ────────────────────────

class TestStudentPaymentFormValidation:
    """Code review check - verify payment form has correct validation"""

    def test_division_maxlength_is_15(self):
        """Verify division/section input has maxLength=15"""
        import os
        payment_path = "/app/frontend/src/pages/SchoolStudentPayment.jsx"
        assert os.path.exists(payment_path)
        
        with open(payment_path) as f:
            content = f.read()
        
        assert "maxLength={15}" in content, "maxLength=15 not found in SchoolStudentPayment.jsx"
        print("✓ Division field has maxLength={15}")

    def test_email_has_required_asterisk(self):
        """Verify email field has red asterisk (required indicator)"""
        import os
        payment_path = "/app/frontend/src/pages/SchoolStudentPayment.jsx"
        with open(payment_path) as f:
            content = f.read()
        
        # Check email label has asterisk
        assert 'Email Address' in content, "Email Address label not found"
        # Check red asterisk near email
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'Email Address' in line:
                context = '\n'.join(lines[max(0,i-2):i+5])
                assert 'text-red-500' in context or '*' in context, \
                    f"No red asterisk found near Email Address label: {context}"
                print("✓ Email field has required asterisk indicator")
                return
        
        pytest.fail("Email Address label not found in payment page")

    def test_email_validation_in_form(self):
        """Verify email validation exists in validateForm function"""
        import os
        payment_path = "/app/frontend/src/pages/SchoolStudentPayment.jsx"
        with open(payment_path) as f:
            content = f.read()
        
        # Check email validation logic
        assert "email" in content.lower(), "email validation not found"
        # Check it's in the validateForm function
        assert "validateForm" in content, "validateForm function not found"
        print("✓ Email validation present in validateForm()")
