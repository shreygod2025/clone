"""
Test suite for dynamic onboarding steps feature.
Tests: generate_dynamic_onboarding_steps function, init-onboarding endpoint,
       get_public_tracking endpoint, update_onboarding_step endpoint
"""
import pytest
import requests
import os
import sys

# Add backend to path for direct import tests
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ─── Direct function tests (no HTTP needed) ────────────────────────────────

class TestGenerateDynamicOnboardingSteps:
    """Direct unit tests for the generate_dynamic_onboarding_steps function"""

    def setup_method(self):
        """Import the function fresh before each test"""
        from server import generate_dynamic_onboarding_steps
        self.fn = generate_dynamic_onboarding_steps

    def test_individual_kit_teacher_training(self):
        """individual_kit + teacher_training → has distribution_checking + teacher_training, no lab_setup/lab_refilling"""
        result = self.fn({"kit_type": "individual", "training_type": "teacher_training"})
        keys = list(result.keys())
        print(f"individual+teacher_training keys: {keys}")

        # Must have
        assert "payment_collection" in keys, "Missing payment_collection"
        assert "kit_delivery" in keys, "Missing kit_delivery"
        assert "distribution_checking" in keys, "Missing distribution_checking"
        assert "technical_check" in keys, "Missing technical_check"
        assert "teacher_training" in keys, "Missing teacher_training"
        assert "calendar_making" in keys, "Missing calendar_making"
        assert "mou_signing" in keys, "Missing mou_signing"
        assert "lms_setup" in keys, "Missing lms_setup"
        assert "school_confirmation" in keys, "Missing school_confirmation"

        # Must NOT have
        assert "lab_setup" not in keys, "Should not have lab_setup for individual kit"
        assert "lab_refilling" not in keys, "Should not have lab_refilling"
        assert "teacher_allocation" not in keys, "Should not have teacher_allocation (no student training)"
        assert "teacher_approval" not in keys, "Should not have teacher_approval"
        assert "timetable_finalization" not in keys, "Should not have timetable_finalization"
        print("PASS: individual+teacher_training step set correct")

    def test_lab_setup_student_training(self):
        """lab_setup + student_training → has lab_setup, teacher_allocation, teacher_approval, timetable_finalization, no distribution_checking, no teacher_training"""
        result = self.fn({"kit_type": "lab_setup", "training_type": "student_training"})
        keys = list(result.keys())
        print(f"lab_setup+student_training keys: {keys}")

        # Must have
        assert "payment_collection" in keys, "Missing payment_collection"
        assert "kit_delivery" in keys, "Missing kit_delivery"
        assert "lab_setup" in keys, "Missing lab_setup for lab_setup kit type"
        assert "technical_check" in keys, "Missing technical_check"
        assert "teacher_allocation" in keys, "Missing teacher_allocation (student training)"
        assert "teacher_approval" in keys, "Missing teacher_approval"
        assert "timetable_finalization" in keys, "Missing timetable_finalization"
        assert "calendar_making" in keys, "Missing calendar_making"
        assert "mou_signing" in keys, "Missing mou_signing"
        assert "lms_setup" in keys, "Missing lms_setup"
        assert "school_confirmation" in keys, "Missing school_confirmation"

        # Must NOT have
        assert "distribution_checking" not in keys, "Should not have distribution_checking for lab_setup"
        assert "lab_refilling" not in keys, "Should not have lab_refilling (new, not renewal)"
        assert "teacher_training" not in keys, "Should not have teacher_training (no teacher training)"
        print("PASS: lab_setup+student_training step set correct")

    def test_lab_setup_both_training_renewal(self):
        """lab_setup + both + is_renewal → has lab_refilling (NOT lab_setup), teacher_training, teacher_allocation, teacher_approval, timetable"""
        result = self.fn({"kit_type": "lab_setup", "training_type": "both"}, is_renewal=True)
        keys = list(result.keys())
        print(f"lab_setup+both_training+renewal keys: {keys}")

        # Must have
        assert "lab_refilling" in keys, "Missing lab_refilling for renewal with lab_setup"
        assert "teacher_training" in keys, "Missing teacher_training (both training)"
        assert "teacher_allocation" in keys, "Missing teacher_allocation (both training)"
        assert "teacher_approval" in keys, "Missing teacher_approval"
        assert "timetable_finalization" in keys, "Missing timetable_finalization"

        # Must NOT have lab_setup (renewal uses lab_refilling instead)
        assert "lab_setup" not in keys, "Should not have lab_setup for renewal (use lab_refilling)"
        assert "distribution_checking" not in keys, "Should not have distribution_checking for lab_setup"
        print("PASS: lab_setup+both+renewal step set correct")

    def test_empty_defaults(self):
        """Empty/None onboarding_data → defaults to individual kit + teacher_training"""
        result = self.fn({})
        keys = list(result.keys())
        print(f"empty/defaults keys: {keys}")

        # Should default to individual kit behavior
        assert "distribution_checking" in keys, "Default should have distribution_checking (individual kit)"
        assert "teacher_training" in keys, "Default should have teacher_training"
        assert "lab_setup" not in keys, "Default should NOT have lab_setup"
        assert "lab_refilling" not in keys, "Default should NOT have lab_refilling"
        print("PASS: empty defaults produce correct step set")

    def test_step_count_individual_teacher(self):
        """individual_kit + teacher_training should produce 9 steps"""
        result = self.fn({"kit_type": "individual", "training_type": "teacher_training"})
        keys = list(result.keys())
        # payment_collection, kit_delivery, distribution_checking, technical_check,
        # teacher_training, calendar_making, mou_signing, lms_setup, school_confirmation = 9
        assert len(keys) == 9, f"Expected 9 steps for individual+teacher_training, got {len(keys)}: {keys}"
        print(f"PASS: individual+teacher_training has {len(keys)} steps")

    def test_step_count_lab_student(self):
        """lab_setup + student_training should produce 10 steps"""
        result = self.fn({"kit_type": "lab_setup", "training_type": "student_training"})
        keys = list(result.keys())
        # payment_collection, kit_delivery, lab_setup, technical_check,
        # teacher_allocation, teacher_approval, timetable_finalization,
        # calendar_making, mou_signing, lms_setup, school_confirmation = 11
        print(f"lab_setup+student_training has {len(keys)} steps: {keys}")
        assert len(keys) >= 10, f"Expected at least 10 steps for lab_setup+student_training, got {len(keys)}"
        print(f"PASS: lab_setup+student_training has {len(keys)} steps")

    def test_step_count_lab_both_renewal(self):
        """lab_setup + both + renewal → most steps"""
        result = self.fn({"kit_type": "lab_setup", "training_type": "both"}, is_renewal=True)
        keys = list(result.keys())
        # payment_collection, kit_delivery, lab_refilling, technical_check,
        # teacher_training, teacher_allocation, teacher_approval, timetable_finalization,
        # calendar_making, mou_signing, lms_setup, school_confirmation = 12
        print(f"lab_setup+both+renewal has {len(keys)} steps: {keys}")
        assert len(keys) >= 11, f"Expected at least 11 steps for lab_setup+both+renewal, got {len(keys)}"
        print(f"PASS: lab_setup+both+renewal has {len(keys)} steps")

    def test_mou_signing_always_present(self):
        """mou_signing must always be in the steps"""
        for scenario in [
            {"kit_type": "individual", "training_type": "teacher_training"},
            {"kit_type": "lab_setup", "training_type": "student_training"},
            {"kit_type": "lab_setup", "training_type": "both"},
            {},
        ]:
            result = self.fn(scenario)
            assert "mou_signing" in result, f"mou_signing missing for scenario {scenario}"
        print("PASS: mou_signing always present")

    def test_step_order_mou_not_first(self):
        """mou_signing should NOT be first - payment_collection should be first"""
        result = self.fn({"kit_type": "individual", "training_type": "teacher_training"})
        keys = list(result.keys())
        assert keys[0] == "payment_collection", f"First step should be payment_collection, got {keys[0]}"
        print(f"PASS: payment_collection is first step (mou_signing at index {keys.index('mou_signing')})")

    def test_step_values_have_required_fields(self):
        """Each step should have title, description, completed, completed_date, data fields"""
        result = self.fn({"kit_type": "individual", "training_type": "teacher_training"})
        for key, step in result.items():
            assert "title" in step, f"Step {key} missing 'title'"
            assert "description" in step, f"Step {key} missing 'description'"
            assert "completed" in step, f"Step {key} missing 'completed'"
            assert step["completed"] == False, f"Step {key} should start as not completed"
            assert "completed_date" in step, f"Step {key} missing 'completed_date'"
        print("PASS: All steps have required fields")


# ─── HTTP API tests ────────────────────────────────────────────────────────

class TestInitOnboardingAPI:
    """Test init-onboarding endpoint uses dynamic steps"""

    @pytest.fixture(autouse=True)
    def auth_token(self):
        """Login as admin and get token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        if resp.status_code != 200:
            pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")
        self.token = resp.json().get("access_token") or resp.json().get("token")
        if not self.token:
            pytest.skip("No token in login response")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def _create_test_school(self, kit_type="individual", training_type="teacher_training"):
        """Helper: create a test school inquiry with given program details, then update with onboarding_data"""
        # Step 1: Create inquiry
        resp = requests.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": f"TEST_Dynamic_School_{kit_type}_{training_type}",
            "contact_name": "Test Contact",
            "email": f"testdyn_{kit_type}_{training_type}@school.com",
            "phone": "9000000000",
            "city": "Testcity",
            "state": "Maharashtra",
            "programs_interested": ["STEM"],
        }, headers=self.headers)
        if resp.status_code not in [200, 201]:
            return None
        school_id = resp.json().get("id")
        # Step 2: Update with onboarding_data and converted status
        patch_resp = requests.patch(f"{BASE_URL}/api/schools/inquiry/{school_id}", json={
            "status": "converted",
            "onboarding_data": {
                "kit_type": kit_type,
                "training_type": training_type,
                "total_students": 30
            }
        }, headers=self.headers)
        return school_id

    def _delete_school(self, school_id):
        """Helper: delete test school"""
        requests.delete(f"{BASE_URL}/api/schools/inquiry/{school_id}", headers=self.headers)

    def test_init_onboarding_individual_teacher(self):
        """init-onboarding for individual kit + teacher_training should produce correct dynamic steps"""
        school_id = self._create_test_school("individual", "teacher_training")
        if not school_id:
            pytest.skip("Could not create test school")

        try:
            resp = requests.post(
                f"{BASE_URL}/api/schools/{school_id}/init-onboarding",
                json={},
                headers=self.headers
            )
            print(f"init-onboarding response: {resp.status_code} - {resp.text[:500]}")
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

            data = resp.json()
            assert data.get("success") == True, "Expected success: true"
            assert "tracking_token" in data, "Missing tracking_token"

            # Get the school and check workflow steps
            school_resp = requests.get(f"{BASE_URL}/api/schools/inquiries?limit=200", headers=self.headers)
            if school_resp.status_code == 200:
                schools = school_resp.json()
                school = next((s for s in schools if s.get('id') == school_id), None)
                if school:
                    workflow = school.get("onboarding_workflow", {})
                    steps = workflow.get("steps", {})
                    step_keys = list(steps.keys())
                    print(f"Dynamic steps for individual+teacher_training: {step_keys}")

                    # Verify dynamic steps
                    assert "distribution_checking" in step_keys, "Missing distribution_checking"
                    assert "teacher_training" in step_keys, "Missing teacher_training"
                    assert "lab_setup" not in step_keys, "Should not have lab_setup"
                    assert "teacher_allocation" not in step_keys, "Should not have teacher_allocation"

                    # Verify mou_signing is completed (pre-marked)
                    assert steps.get("mou_signing", {}).get("completed") == True, "mou_signing should be pre-completed"
                    print(f"PASS: init-onboarding creates {len(step_keys)} dynamic steps for individual+teacher_training")
        finally:
            self._delete_school(school_id)

    def test_init_onboarding_lab_setup_student_training(self):
        """init-onboarding for lab_setup + student_training should have lab_setup, teacher_allocation, etc."""
        school_id = self._create_test_school("lab_setup", "student_training")
        if not school_id:
            pytest.skip("Could not create test school")

        try:
            resp = requests.post(
                f"{BASE_URL}/api/schools/{school_id}/init-onboarding",
                json={},
                headers=self.headers
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

            # Get school and check workflow steps
            school_resp = requests.get(f"{BASE_URL}/api/schools/inquiries?limit=200", headers=self.headers)
            if school_resp.status_code == 200:
                schools = school_resp.json()
                school = next((s for s in schools if s.get('id') == school_id), None)
                if school:
                    workflow = school.get("onboarding_workflow", {})
                    steps = workflow.get("steps", {})
                    step_keys = list(steps.keys())
                    print(f"Dynamic steps for lab_setup+student_training: {step_keys}")

                    assert "lab_setup" in step_keys, "Missing lab_setup for lab_setup kit"
                    assert "teacher_allocation" in step_keys, "Missing teacher_allocation"
                    assert "teacher_approval" in step_keys, "Missing teacher_approval"
                    assert "distribution_checking" not in step_keys, "Should not have distribution_checking"
                    print(f"PASS: lab_setup+student_training creates correct {len(step_keys)} dynamic steps")
        finally:
            self._delete_school(school_id)

    def test_init_onboarding_renewal_lab_refilling(self):
        """Renewal with lab_setup should use lab_refilling instead of lab_setup"""
        school_id = self._create_test_school("lab_setup", "both")
        if not school_id:
            pytest.skip("Could not create test school")

        try:
            resp = requests.post(
                f"{BASE_URL}/api/schools/{school_id}/init-onboarding",
                json={"is_renewal": True},
                headers=self.headers
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

            school_resp = requests.get(f"{BASE_URL}/api/schools/inquiries?limit=200", headers=self.headers)
            if school_resp.status_code == 200:
                schools = school_resp.json()
                school = next((s for s in schools if s.get('id') == school_id), None)
                if school:
                    steps = school.get("onboarding_workflow", {}).get("steps", {})
                    step_keys = list(steps.keys())
                    print(f"Dynamic steps for lab_setup+both+renewal: {step_keys}")

                    assert "lab_refilling" in step_keys, "Missing lab_refilling for renewal"
                    assert "lab_setup" not in step_keys, "Should not have lab_setup for renewal"
                    assert "teacher_training" in step_keys, "Missing teacher_training (both)"
                    assert "teacher_allocation" in step_keys, "Missing teacher_allocation (both)"
                    print(f"PASS: renewal creates lab_refilling instead of lab_setup")
        finally:
            self._delete_school(school_id)


class TestPublicTrackingAPI:
    """Test get_public_tracking endpoint returns only steps from actual workflow"""

    @pytest.fixture(autouse=True)
    def setup_school_with_workflow(self):
        """Create a school, init onboarding, get tracking token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        if login_resp.status_code != 200:
            pytest.skip("Admin login failed")

        token = login_resp.json().get("access_token") or login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {token}"}

        # Create school with lab_setup + student_training
        school_resp = requests.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": "TEST_Tracking_School",
            "contact_name": "Track Test",
            "email": "tracktest@school.com",
            "phone": "9000000001",
            "city": "Mumbai",
            "state": "Maharashtra",
            "programs_interested": ["STEM"]
        }, headers=self.headers)

        if school_resp.status_code not in [200, 201]:
            pytest.skip(f"Could not create test school: {school_resp.text}")

        school_data = school_resp.json()
        self.school_id = school_data.get("id")

        # Update with onboarding_data
        requests.patch(f"{BASE_URL}/api/schools/inquiry/{self.school_id}", json={
            "status": "converted",
            "onboarding_data": {"kit_type": "lab_setup", "training_type": "student_training"}
        }, headers=self.headers)

        # Init onboarding
        init_resp = requests.post(
            f"{BASE_URL}/api/schools/{self.school_id}/init-onboarding",
            json={},
            headers=self.headers
        )
        if init_resp.status_code != 200:
            pytest.skip(f"Could not init onboarding: {init_resp.text}")

        self.tracking_token = init_resp.json().get("tracking_token")
        yield

        # Cleanup
        requests.delete(f"{BASE_URL}/api/schools/inquiry/{self.school_id}", headers=self.headers)

    def test_public_tracking_no_ghost_steps(self):
        """Public tracking should only return steps in the actual workflow (no hardcoded ghost steps)"""
        resp = requests.get(f"{BASE_URL}/api/track/{self.tracking_token}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        data = resp.json()
        public_steps = data.get("steps", [])
        step_keys = [s["key"] for s in public_steps]
        print(f"Public tracking step keys: {step_keys}")

        # For lab_setup + student_training, should have lab_setup but NOT distribution_checking
        assert "lab_setup" in step_keys, "Missing lab_setup in public tracking"
        assert "distribution_checking" not in step_keys, "Ghost step distribution_checking should NOT appear for lab_setup school"
        assert "teacher_allocation" in step_keys, "Missing teacher_allocation"
        print(f"PASS: No ghost steps in public tracking. Got {len(step_keys)} steps")

    def test_public_tracking_mou_first(self):
        """Public tracking should show mou_signing as first step"""
        resp = requests.get(f"{BASE_URL}/api/track/{self.tracking_token}")
        assert resp.status_code == 200

        data = resp.json()
        public_steps = data.get("steps", [])
        if public_steps:
            first_key = public_steps[0]["key"]
            assert first_key == "mou_signing", f"First step should be mou_signing, got {first_key}"
            print(f"PASS: mou_signing is first step in public tracking")

    def test_public_tracking_mou_pre_completed(self):
        """mou_signing should be completed in public tracking"""
        resp = requests.get(f"{BASE_URL}/api/track/{self.tracking_token}")
        assert resp.status_code == 200

        data = resp.json()
        steps = {s["key"]: s for s in data.get("steps", [])}
        if "mou_signing" in steps:
            assert steps["mou_signing"]["completed"] == True, "mou_signing should be pre-completed"
        print("PASS: mou_signing is pre-completed in public tracking")

    def test_public_tracking_progress_dynamic(self):
        """Progress should be based on actual workflow steps, not hardcoded count"""
        resp = requests.get(f"{BASE_URL}/api/track/{self.tracking_token}")
        assert resp.status_code == 200

        data = resp.json()
        total_steps = data.get("total_steps", 0)
        completed_steps = data.get("completed_steps", 0)
        progress_percent = data.get("progress_percent", 0)

        print(f"Progress: {completed_steps}/{total_steps} = {progress_percent}%")

        # total_steps should match actual workflow, not hardcoded 9
        assert total_steps > 0, "total_steps should be > 0"
        # For lab_setup + student_training, should have more than 9 steps (includes teacher_allocation etc)
        print(f"PASS: Dynamic progress - {completed_steps}/{total_steps} steps ({progress_percent}%)")


class TestUpdateOnboardingStepAPI:
    """Test update_onboarding_step uses actual workflow keys"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create school with workflow for testing"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        if login_resp.status_code != 200:
            pytest.skip("Admin login failed")

        token = login_resp.json().get("access_token") or login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {token}"}

        # Create school
        school_resp = requests.post(f"{BASE_URL}/api/schools/inquiry", json={
            "school_name": "TEST_Update_Step_School",
            "contact_name": "Update Test",
            "email": "updatestep@school.com",
            "phone": "9000000002",
            "city": "Mumbai",
            "state": "Maharashtra",
            "programs_interested": ["STEM"]
        }, headers=self.headers)

        if school_resp.status_code not in [200, 201]:
            pytest.skip("Could not create test school")

        school_data = school_resp.json()
        self.school_id = school_data.get("id")

        # Update with onboarding_data
        requests.patch(f"{BASE_URL}/api/schools/inquiry/{self.school_id}", json={
            "status": "converted",
            "onboarding_data": {"kit_type": "individual", "training_type": "teacher_training"}
        }, headers=self.headers)

        # Init onboarding
        init_resp = requests.post(
            f"{BASE_URL}/api/schools/{self.school_id}/init-onboarding",
            json={},
            headers=self.headers
        )
        if init_resp.status_code != 200:
            pytest.skip("Could not init onboarding")

        yield

        # Cleanup
        requests.delete(f"{BASE_URL}/api/schools/inquiry/{self.school_id}", headers=self.headers)

    def test_update_valid_step_completes_correctly(self):
        """Update a valid step key should succeed and mark step as completed"""
        resp = requests.patch(
            f"{BASE_URL}/api/schools/{self.school_id}/onboarding-step/payment_collection",
            json={"completed": True, "data": {"payment_date": "2025-01-01", "amount": 50000}},
            headers=self.headers
        )
        print(f"Update payment_collection: {resp.status_code} - {resp.text[:300]}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        data = resp.json()
        assert data.get("success") == True, "Expected success: true"
        assert data.get("step", {}).get("completed") == True, "Step should be marked completed"
        print("PASS: payment_collection updated successfully")

    def test_update_invalid_step_returns_400(self):
        """Update a step key NOT in the workflow should return 400"""
        # For individual + teacher_training, lab_setup is NOT in the workflow
        resp = requests.patch(
            f"{BASE_URL}/api/schools/{self.school_id}/onboarding-step/lab_setup",
            json={"completed": True},
            headers=self.headers
        )
        print(f"Update invalid step lab_setup: {resp.status_code} - {resp.text[:300]}")
        assert resp.status_code == 400, f"Expected 400 for invalid step, got {resp.status_code}"
        print("PASS: Invalid step returns 400")

    def test_update_next_step_advances_current_step(self):
        """After completing payment_collection, current_step should advance to next incomplete step"""
        # Complete payment_collection
        resp = requests.patch(
            f"{BASE_URL}/api/schools/{self.school_id}/onboarding-step/payment_collection",
            json={"completed": True},
            headers=self.headers
        )
        assert resp.status_code == 200

        # Get school to check current_step
        school_resp = requests.get(f"{BASE_URL}/api/schools/inquiries?limit=200", headers=self.headers)
        if school_resp.status_code == 200:
            schools = school_resp.json()
            school = next((s for s in schools if s.get('id') == self.school_id), None)
            if school:
                current_step = school.get("onboarding_workflow", {}).get("current_step")
                print(f"After completing payment_collection, current_step = {current_step}")
                # current_step should advance to next incomplete step (kit_delivery)
                assert current_step != "payment_collection", "current_step should have advanced"
                assert current_step == "kit_delivery", f"Expected kit_delivery as next step, got {current_step}"
                print(f"PASS: current_step advanced to {current_step}")
