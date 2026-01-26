"""
Test file for Bulk Import and Edit functionality for Active Schools
Tests:
1. GET /api/schools/bulk-import/template - Returns template with columns and sample data
2. POST /api/schools/bulk-import - Accepts array of schools and creates them as active
3. Duplicate detection by school name or email
4. Edit Active Schools - GET /api/schools/onboarding/{school_id}
5. Edit Active Schools - PUT /api/schools/onboarding/{onboarding_id}
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBulkImportTemplate:
    """Test bulk import template endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_bulk_import_template(self):
        """Test GET /api/schools/bulk-import/template returns template with columns and sample data"""
        response = requests.get(f"{BASE_URL}/api/schools/bulk-import/template", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        data = response.json()
        
        # Verify columns exist
        assert "columns" in data, "Response should have 'columns' field"
        columns = data["columns"]
        
        # Verify required columns are present
        required_columns = ["school_name", "contact_name", "phone", "email", "location", "board"]
        for col in required_columns:
            assert col in columns, f"Column '{col}' should be in template"
        
        # Verify sample data exists
        assert "sample" in data, "Response should have 'sample' field"
        sample = data["sample"]
        assert sample.get("school_name") == "Example School", "Sample should have example school name"
        
        # Verify instructions exist
        assert "instructions" in data, "Response should have 'instructions' field"
        instructions = data["instructions"]
        assert "board" in instructions, "Instructions should include board options"
        assert "payment_mode" in instructions, "Instructions should include payment_mode options"
        
        print(f"✓ Template has {len(columns)} columns")
        print(f"✓ Sample data provided for guidance")
        print(f"✓ Instructions provided for {len(instructions)} fields")


class TestBulkImport:
    """Test bulk import functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.test_schools = []
    
    def test_bulk_import_creates_active_schools(self):
        """Test POST /api/schools/bulk-import creates schools with active status"""
        unique_id = str(uuid.uuid4())[:8]
        
        schools_data = [
            {
                "school_name": f"TEST_Bulk_School_A_{unique_id}",
                "contact_name": "Test Contact A",
                "phone": f"98765{unique_id[:5]}",
                "email": f"test_bulk_a_{unique_id}@test.com",
                "location": "Mumbai",
                "board": "CBSE",
                "total_students": "100",
                "total_amount": "50000",
                "model": "Lab Model",
                "notes": "Bulk import test"
            },
            {
                "school_name": f"TEST_Bulk_School_B_{unique_id}",
                "contact_name": "Test Contact B",
                "phone": f"98764{unique_id[:5]}",
                "email": f"test_bulk_b_{unique_id}@test.com",
                "location": "Delhi",
                "board": "ICSE",
                "total_students": "200",
                "total_amount": "100000",
                "model": "Franchise Model",
                "notes": "Bulk import test"
            }
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/schools/bulk-import",
            json={"schools": schools_data},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Bulk import failed: {response.text}"
        result = response.json()
        
        # Verify import results
        assert "imported" in result, "Response should have 'imported' count"
        assert result["imported"] == 2, f"Should import 2 schools, got {result['imported']}"
        assert result["skipped"] == 0, f"Should skip 0 schools, got {result['skipped']}"
        
        print(f"✓ Imported {result['imported']} schools successfully")
        
        # Verify schools are in Active status by fetching them
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        all_schools = response.json()
        
        # Find our test schools
        imported_schools = [s for s in all_schools if f"TEST_Bulk_School" in s.get("school_name", "") and unique_id in s.get("school_name", "")]
        assert len(imported_schools) == 2, f"Should find 2 imported schools, found {len(imported_schools)}"
        
        for school in imported_schools:
            assert school["status"] == "active", f"School {school['school_name']} should have 'active' status"
            assert school.get("source") == "bulk_import", f"School should have 'bulk_import' source"
            self.test_schools.append(school["id"])
        
        print(f"✓ Both schools have 'active' status")
        print(f"✓ Both schools have 'bulk_import' source")
    
    def test_bulk_import_duplicate_detection_by_name(self):
        """Test duplicate detection by school name"""
        unique_id = str(uuid.uuid4())[:8]
        
        # First import
        schools_data = [{
            "school_name": f"TEST_Duplicate_Name_{unique_id}",
            "contact_name": "Test Contact",
            "phone": f"98763{unique_id[:5]}",
            "email": f"test_dup_name_{unique_id}@test.com",
            "location": "Mumbai",
            "board": "CBSE"
        }]
        
        response = requests.post(
            f"{BASE_URL}/api/schools/bulk-import",
            json={"schools": schools_data},
            headers=self.headers
        )
        assert response.status_code == 200
        assert response.json()["imported"] == 1
        
        # Second import with same name (should be skipped)
        schools_data_dup = [{
            "school_name": f"TEST_Duplicate_Name_{unique_id}",  # Same name
            "contact_name": "Different Contact",
            "phone": "9999999999",
            "email": "different@test.com",
            "location": "Delhi",
            "board": "ICSE"
        }]
        
        response = requests.post(
            f"{BASE_URL}/api/schools/bulk-import",
            json={"schools": schools_data_dup},
            headers=self.headers
        )
        assert response.status_code == 200
        result = response.json()
        
        assert result["imported"] == 0, "Duplicate by name should not be imported"
        assert result["skipped"] == 1, "Duplicate should be skipped"
        assert len(result["errors"]) > 0, "Should have error message for duplicate"
        assert "Duplicate" in result["errors"][0]["error"], "Error should mention duplicate"
        
        print(f"✓ Duplicate detection by school name works")
        print(f"✓ Error message: {result['errors'][0]['error']}")
    
    def test_bulk_import_duplicate_detection_by_email(self):
        """Test duplicate detection by email"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"test_dup_email_{unique_id}@test.com"
        
        # First import
        schools_data = [{
            "school_name": f"TEST_School_Email_A_{unique_id}",
            "contact_name": "Test Contact",
            "phone": f"98762{unique_id[:5]}",
            "email": email,
            "location": "Mumbai",
            "board": "CBSE"
        }]
        
        response = requests.post(
            f"{BASE_URL}/api/schools/bulk-import",
            json={"schools": schools_data},
            headers=self.headers
        )
        assert response.status_code == 200
        assert response.json()["imported"] == 1
        
        # Second import with same email (should be skipped)
        schools_data_dup = [{
            "school_name": f"TEST_School_Email_B_{unique_id}",  # Different name
            "contact_name": "Different Contact",
            "phone": "8888888888",
            "email": email,  # Same email
            "location": "Delhi",
            "board": "ICSE"
        }]
        
        response = requests.post(
            f"{BASE_URL}/api/schools/bulk-import",
            json={"schools": schools_data_dup},
            headers=self.headers
        )
        assert response.status_code == 200
        result = response.json()
        
        assert result["imported"] == 0, "Duplicate by email should not be imported"
        assert result["skipped"] == 1, "Duplicate should be skipped"
        
        print(f"✓ Duplicate detection by email works")
    
    def test_bulk_import_creates_onboarding_record(self):
        """Test that bulk import creates both school inquiry and onboarding record"""
        unique_id = str(uuid.uuid4())[:8]
        
        schools_data = [{
            "school_name": f"TEST_Onboarding_Check_{unique_id}",
            "contact_name": "Test Contact",
            "phone": f"98761{unique_id[:5]}",
            "email": f"test_onb_{unique_id}@test.com",
            "location": "Bangalore",
            "board": "CBSE",
            "total_students": "150",
            "total_amount": "75000",
            "model": "Lab Model",
            "payment_mode": "from_school",
            "payment_method": "neft",
            "contract_start": "2025-01-01",
            "contract_end": "2025-12-31"
        }]
        
        response = requests.post(
            f"{BASE_URL}/api/schools/bulk-import",
            json={"schools": schools_data},
            headers=self.headers
        )
        assert response.status_code == 200
        assert response.json()["imported"] == 1
        
        # Find the school
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        all_schools = response.json()
        school = next((s for s in all_schools if f"TEST_Onboarding_Check_{unique_id}" in s.get("school_name", "")), None)
        
        assert school is not None, "Should find the imported school"
        assert school.get("onboarding_id"), "School should have onboarding_id"
        assert school.get("onboarding_status") == "active", "Onboarding status should be active"
        
        # Fetch onboarding record
        response = requests.get(
            f"{BASE_URL}/api/schools/onboarding/{school['id']}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get onboarding: {response.text}"
        onboarding = response.json()
        
        assert onboarding.get("total_students") == 150, "Onboarding should have total_students"
        assert onboarding.get("total_amount") == 75000, "Onboarding should have total_amount"
        assert onboarding.get("model") == "Lab Model", "Onboarding should have model"
        
        print(f"✓ Bulk import creates onboarding record")
        print(f"✓ Onboarding has total_students: {onboarding.get('total_students')}")
        print(f"✓ Onboarding has total_amount: {onboarding.get('total_amount')}")


class TestEditActiveSchools:
    """Test edit functionality for active schools"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_school_onboarding_details(self):
        """Test GET /api/schools/onboarding/{school_id} returns onboarding details"""
        # First, find an active school
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        all_schools = response.json()
        
        active_schools = [s for s in all_schools if s.get("status") == "active" and s.get("onboarding_id")]
        
        if not active_schools:
            pytest.skip("No active schools with onboarding found")
        
        school = active_schools[0]
        school_id = school["id"]
        
        # Get onboarding details
        response = requests.get(
            f"{BASE_URL}/api/schools/onboarding/{school_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get onboarding: {response.text}"
        onboarding = response.json()
        
        # Verify onboarding fields
        assert "id" in onboarding, "Onboarding should have id"
        assert "school_id" in onboarding, "Onboarding should have school_id"
        
        print(f"✓ GET /api/schools/onboarding/{school_id} returns onboarding details")
        print(f"✓ Onboarding ID: {onboarding.get('id')}")
        print(f"✓ Model: {onboarding.get('model', 'N/A')}")
        print(f"✓ Total Students: {onboarding.get('total_students', 0)}")
    
    def test_update_school_inquiry_details(self):
        """Test PATCH /api/schools/inquiry/{id} updates school details"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create a test school via bulk import
        schools_data = [{
            "school_name": f"TEST_Edit_School_{unique_id}",
            "contact_name": "Original Contact",
            "phone": f"98760{unique_id[:5]}",
            "email": f"test_edit_{unique_id}@test.com",
            "location": "Chennai",
            "board": "CBSE",
            "total_students": "100"
        }]
        
        response = requests.post(
            f"{BASE_URL}/api/schools/bulk-import",
            json={"schools": schools_data},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Find the school
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        all_schools = response.json()
        school = next((s for s in all_schools if f"TEST_Edit_School_{unique_id}" in s.get("school_name", "")), None)
        assert school is not None
        
        # Update school details
        update_data = {
            "school_name": f"TEST_Edit_School_Updated_{unique_id}",
            "contact_name": "Updated Contact",
            "phone": "9999888877",
            "location": "Hyderabad",
            "board": "ICSE"
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/schools/inquiry/{school['id']}",
            json=update_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to update school: {response.text}"
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        all_schools = response.json()
        updated_school = next((s for s in all_schools if s["id"] == school["id"]), None)
        
        assert updated_school is not None
        assert "Updated" in updated_school["school_name"], "School name should be updated"
        assert updated_school["contact_name"] == "Updated Contact", "Contact name should be updated"
        assert updated_school["location"] == "Hyderabad", "Location should be updated"
        
        print(f"✓ School inquiry details updated successfully")
        print(f"✓ School name: {updated_school['school_name']}")
        print(f"✓ Contact: {updated_school['contact_name']}")
        print(f"✓ Location: {updated_school['location']}")
    
    def test_update_school_onboarding_details(self):
        """Test PUT /api/schools/onboarding/{onboarding_id} updates onboarding details"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create a test school via bulk import
        schools_data = [{
            "school_name": f"TEST_Edit_Onboarding_{unique_id}",
            "contact_name": "Test Contact",
            "phone": f"98759{unique_id[:5]}",
            "email": f"test_edit_onb_{unique_id}@test.com",
            "location": "Pune",
            "board": "CBSE",
            "total_students": "100",
            "total_amount": "50000",
            "model": "Lab Model"
        }]
        
        response = requests.post(
            f"{BASE_URL}/api/schools/bulk-import",
            json={"schools": schools_data},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Find the school
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        all_schools = response.json()
        school = next((s for s in all_schools if f"TEST_Edit_Onboarding_{unique_id}" in s.get("school_name", "")), None)
        assert school is not None
        assert school.get("onboarding_id"), "School should have onboarding_id"
        
        onboarding_id = school["onboarding_id"]
        
        # Update onboarding details
        update_data = {
            "model": "Franchise Model",
            "total_students": 200,
            "total_amount": 100000,
            "payment_mode": "from_student",
            "payment_method": "online",
            "contract_start": "2025-02-01",
            "contract_end": "2026-01-31"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/schools/onboarding/{onboarding_id}",
            json=update_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to update onboarding: {response.text}"
        
        # Verify update
        response = requests.get(
            f"{BASE_URL}/api/schools/onboarding/{school['id']}",
            headers=self.headers
        )
        assert response.status_code == 200
        updated_onboarding = response.json()
        
        assert updated_onboarding.get("model") == "Franchise Model", "Model should be updated"
        assert updated_onboarding.get("total_students") == 200, "Total students should be updated"
        assert updated_onboarding.get("total_amount") == 100000, "Total amount should be updated"
        
        print(f"✓ Onboarding details updated successfully")
        print(f"✓ Model: {updated_onboarding.get('model')}")
        print(f"✓ Total Students: {updated_onboarding.get('total_students')}")
        print(f"✓ Total Amount: {updated_onboarding.get('total_amount')}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_cleanup_test_schools(self):
        """Archive TEST_ prefixed schools"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        all_schools = response.json()
        
        test_schools = [s for s in all_schools if s.get("school_name", "").startswith("TEST_")]
        archived_count = 0
        
        for school in test_schools:
            response = requests.patch(
                f"{BASE_URL}/api/schools/inquiry/{school['id']}",
                json={"status": "archived"},
                headers=self.headers
            )
            if response.status_code == 200:
                archived_count += 1
        
        print(f"✓ Archived {archived_count} test schools")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
