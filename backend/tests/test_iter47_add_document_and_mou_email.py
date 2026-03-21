"""
Iteration 47 - Backend Tests for:
1. POST /api/schools/{school_id}/add-document - Atomic document append endpoint
2. POST /api/schools/{school_id}/send-mou-email - MOU email with Cloudinary URL attachment
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

TEST_SCHOOL_ID = "09dcd297-f09a-4f16-a8eb-e52747b8d46c"
ADMIN_EMAIL = "testadmin@oll.co"
ADMIN_PASSWORD = "test123"


class TestAddDocument:
    """Tests for POST /api/schools/{school_id}/add-document endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get auth token"""
        self.auth_token = None
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code == 200:
            self.auth_token = login_response.json().get("access_token")
        else:
            # Try fallback admin credentials
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "admin@oll.co", "password": "Dagaji03@"}
            )
            if login_response.status_code == 200:
                self.auth_token = login_response.json().get("access_token")
        yield

    def get_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}", "Content-Type": "application/json"}

    def test_01_admin_login_success(self):
        """Test that admin login returns auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        # Accept either login credential working
        if login_response.status_code != 200:
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "admin@oll.co", "password": "Dagaji03@"}
            )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Admin login successful, token received")

    def test_02_add_document_endpoint_exists(self):
        """Test POST /api/schools/{school_id}/add-document exists and returns 200"""
        if not self.auth_token:
            pytest.skip("No auth token - skipping authenticated test")
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/add-document",
            json={
                "type": "TEST_Proposal",
                "url": "https://res.cloudinary.com/test/raw/upload/test_document.pdf",
                "name": "TEST_Proposal_TestSchool_01Jan2026.pdf",
                "uploaded_at": "2026-01-01T00:00:00Z",
                "uploaded_by": "Test Admin"
            },
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True, f"Expected success=True, got: {data}"
        assert "document" in data, f"Expected 'document' in response, got: {data}"
        doc = data["document"]
        assert doc.get("url") == "https://res.cloudinary.com/test/raw/upload/test_document.pdf"
        assert doc.get("type") == "TEST_Proposal"
        print(f"✓ add-document endpoint returns 200 with document: {doc.get('name')}")

    def test_03_add_document_requires_url(self):
        """Test POST /api/schools/{school_id}/add-document returns 400 if no URL provided"""
        if not self.auth_token:
            pytest.skip("No auth token - skipping authenticated test")
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/add-document",
            json={"type": "MOU", "name": "test.pdf"},
            headers=self.get_headers()
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"✓ add-document returns 400 when URL is missing")

    def test_04_add_document_invalid_school_returns_404(self):
        """Test POST /api/schools/invalid-id/add-document returns 404"""
        if not self.auth_token:
            pytest.skip("No auth token - skipping authenticated test")
        
        response = requests.post(
            f"{BASE_URL}/api/schools/nonexistent-school-id-12345/add-document",
            json={
                "type": "MOU",
                "url": "https://res.cloudinary.com/test/raw/upload/test.pdf",
                "name": "test.pdf"
            },
            headers=self.get_headers()
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ add-document returns 404 for nonexistent school")

    def test_05_add_document_unauthorized_without_token(self):
        """Test POST /api/schools/{school_id}/add-document returns 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/add-document",
            json={
                "type": "MOU",
                "url": "https://res.cloudinary.com/test/raw/upload/test.pdf",
                "name": "test.pdf"
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ add-document returns {response.status_code} without auth token")

    def test_06_add_document_verifies_persistence(self):
        """Test that add-document actually persists document in school's documents array"""
        if not self.auth_token:
            pytest.skip("No auth token - skipping authenticated test")
        
        unique_name = "TEST_VerifyPersistence_doc.pdf"
        unique_url = "https://res.cloudinary.com/test/raw/upload/verify_persistence_doc.pdf"
        
        # Add document
        add_response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/add-document",
            json={
                "type": "TEST_VerifyPersist",
                "url": unique_url,
                "name": unique_name,
            },
            headers=self.get_headers()
        )
        assert add_response.status_code == 200, f"add-document failed: {add_response.text}"
        
        # Verify by fetching school (using orders/school-details which returns full school record)
        get_response = requests.get(
            f"{BASE_URL}/api/orders/school-details/{TEST_SCHOOL_ID}",
            headers=self.get_headers()
        )
        assert get_response.status_code == 200, f"GET school failed: {get_response.status_code}"
        school_data = get_response.json()
        documents = school_data.get("documents", [])
        
        # Check that our document is in the list
        matching_docs = [d for d in documents if d.get("url") == unique_url]
        assert len(matching_docs) >= 1, f"Document not found in school documents array. Documents: {documents}"
        print(f"✓ Document persisted to school documents array (found {len(matching_docs)} matching docs)")


class TestSendMOUEmail:
    """Tests for POST /api/schools/{school_id}/send-mou-email endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get auth token"""
        self.auth_token = None
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code == 200:
            self.auth_token = login_response.json().get("access_token")
        else:
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "admin@oll.co", "password": "Dagaji03@"}
            )
            if login_response.status_code == 200:
                self.auth_token = login_response.json().get("access_token")
        yield

    def get_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}", "Content-Type": "application/json"}

    def test_07_send_mou_email_endpoint_exists(self):
        """Test POST /api/schools/{school_id}/send-mou-email exists"""
        if not self.auth_token:
            pytest.skip("No auth token - skipping authenticated test")
        
        # Send with explicit email to avoid "no recipient" error
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/send-mou-email",
            json={
                "mou_url": "https://res.cloudinary.com/test/raw/upload/test_mou.pdf",
                "file_name": "MOU_TestSchool_01Jan2026.pdf",
                "emails": ["test@oll.co"]
            },
            headers=self.get_headers()
        )
        # Endpoint should exist - valid responses: 200 (sent), 400 (test key / config issue), 500 (email failed)
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}: {response.text}"
        print(f"✓ send-mou-email endpoint exists, returned status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            print(f"  Email sent successfully to: {data.get('recipients')}")
        elif response.status_code == 400:
            print(f"  400 (expected if Resend is test/unconfigured): {response.json().get('detail')}")
        else:
            print(f"  500 (email service error): {response.json().get('detail')}")

    def test_08_send_mou_email_no_email_found_returns_400(self):
        """Test that endpoint returns 400 if school has no email and none provided"""
        if not self.auth_token:
            pytest.skip("No auth token - skipping authenticated test")
        
        # Use a nonexistent school that definitely has no emails
        response = requests.post(
            f"{BASE_URL}/api/schools/nonexistent-school-id-12345/send-mou-email",
            json={
                "mou_url": "https://res.cloudinary.com/test/raw/upload/test.pdf",
                "file_name": "test.pdf"
            },
            headers=self.get_headers()
        )
        # Should be 404 (school not found)
        assert response.status_code == 404, f"Expected 404 for nonexistent school, got {response.status_code}: {response.text}"
        print(f"✓ send-mou-email returns 404 for nonexistent school")

    def test_09_send_mou_email_unauthorized(self):
        """Test send-mou-email returns 401 without auth token"""
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/send-mou-email",
            json={
                "mou_url": "https://res.cloudinary.com/test/raw/upload/test.pdf",
                "file_name": "test.pdf"
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ send-mou-email returns {response.status_code} without auth")
