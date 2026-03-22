"""
Test Public Reports Feature - Iteration 51
Tests for password-protected public report link functionality:
- Create public link with password
- Get public link info
- Update password
- Delete public link
- Verify password access
- Get public report data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "admin123"

# Test password for public link
TEST_PASSWORD = "demo123"
NEW_TEST_PASSWORD = "newpass456"


class TestPublicReportsFeature:
    """Test suite for public reports feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.auth_token = None
        self.public_link_token = None
        self.public_access_token = None
        
    def get_auth_token(self):
        """Get admin auth token"""
        if self.auth_token:
            return self.auth_token
            
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            # API returns access_token, not token
            self.auth_token = data.get("access_token") or data.get("token")
            return self.auth_token
        else:
            pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
            
    def get_auth_headers(self):
        """Get headers with auth token"""
        token = self.get_auth_token()
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 1: Admin Login Works
    # ─────────────────────────────────────────────────────────────────────────
    def test_01_admin_login(self):
        """Test admin login works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token, not token
        assert "access_token" in data or "token" in data, "No token in response"
        print(f"✓ Admin login successful")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 2: Get Public Link Info (Before Creation)
    # ─────────────────────────────────────────────────────────────────────────
    def test_02_get_public_link_info_initial(self):
        """Test getting public link info"""
        headers = self.get_auth_headers()
        response = self.session.get(f"{BASE_URL}/api/admin/reports/public-link", headers=headers)
        
        assert response.status_code == 200, f"Failed to get public link info: {response.text}"
        data = response.json()
        # Either exists or doesn't exist - both are valid states
        assert "exists" in data or "token" in data, "Response should have exists or token field"
        print(f"✓ Get public link info works - exists: {data.get('exists', data.get('token') is not None)}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 3: Create Public Link with Password
    # ─────────────────────────────────────────────────────────────────────────
    def test_03_create_public_link(self):
        """Test creating a public link with password"""
        headers = self.get_auth_headers()
        
        response = self.session.post(f"{BASE_URL}/api/admin/reports/public-link", 
            json={"password": TEST_PASSWORD},
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to create public link: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "token" in data, "Response should contain token"
        self.public_link_token = data["token"]
        print(f"✓ Public link created with token: {self.public_link_token}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 4: Verify Public Link Exists After Creation
    # ─────────────────────────────────────────────────────────────────────────
    def test_04_verify_public_link_exists(self):
        """Test that public link exists after creation"""
        headers = self.get_auth_headers()
        response = self.session.get(f"{BASE_URL}/api/admin/reports/public-link", headers=headers)
        
        assert response.status_code == 200, f"Failed to get public link info: {response.text}"
        data = response.json()
        assert data.get("exists") == True, "Public link should exist"
        assert "token" in data, "Response should contain token"
        self.public_link_token = data["token"]
        print(f"✓ Public link verified - token: {self.public_link_token}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 5: Verify Password - Wrong Password
    # ─────────────────────────────────────────────────────────────────────────
    def test_05_verify_wrong_password(self):
        """Test that wrong password is rejected"""
        # First get the token
        headers = self.get_auth_headers()
        link_response = self.session.get(f"{BASE_URL}/api/admin/reports/public-link", headers=headers)
        token = link_response.json().get("token")
        
        if not token:
            pytest.skip("No public link token available")
        
        response = self.session.post(f"{BASE_URL}/api/public/reports/{token}/verify",
            json={"password": "wrongpassword123"}
        )
        
        assert response.status_code == 401, f"Wrong password should return 401, got {response.status_code}"
        print(f"✓ Wrong password correctly rejected with 401")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 6: Verify Password - Correct Password
    # ─────────────────────────────────────────────────────────────────────────
    def test_06_verify_correct_password(self):
        """Test that correct password grants access"""
        # First get the token
        headers = self.get_auth_headers()
        link_response = self.session.get(f"{BASE_URL}/api/admin/reports/public-link", headers=headers)
        token = link_response.json().get("token")
        
        if not token:
            pytest.skip("No public link token available")
        
        response = self.session.post(f"{BASE_URL}/api/public/reports/{token}/verify",
            json={"password": TEST_PASSWORD}
        )
        
        assert response.status_code == 200, f"Correct password should return 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "access_token" in data, "Response should contain access_token"
        self.public_access_token = data["access_token"]
        print(f"✓ Correct password verified - access token received")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 7: Get Public Report Data with Access Token
    # ─────────────────────────────────────────────────────────────────────────
    def test_07_get_public_report_data(self):
        """Test getting public report data with valid access token"""
        # First get the token and verify password
        headers = self.get_auth_headers()
        link_response = self.session.get(f"{BASE_URL}/api/admin/reports/public-link", headers=headers)
        token = link_response.json().get("token")
        
        if not token:
            pytest.skip("No public link token available")
        
        # Verify password to get access token
        verify_response = self.session.post(f"{BASE_URL}/api/public/reports/{token}/verify",
            json={"password": TEST_PASSWORD}
        )
        
        if verify_response.status_code != 200:
            pytest.skip("Could not verify password")
            
        access_token = verify_response.json().get("access_token")
        
        # Get report data
        response = self.session.get(f"{BASE_URL}/api/public/reports/{token}/data",
            params={"auth": access_token}
        )
        
        assert response.status_code == 200, f"Failed to get report data: {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "overview" in data, "Response should contain overview"
        assert "students" in data, "Response should contain students"
        assert "schools" in data, "Response should contain schools"
        assert "educators" in data, "Response should contain educators"
        assert "period" in data, "Response should contain period"
        
        print(f"✓ Public report data retrieved successfully")
        print(f"  - Overview: total_revenue={data['overview'].get('total_revenue', 0)}")
        print(f"  - Students: total={data['students'].get('total', 0)}")
        print(f"  - Schools: total={data['schools'].get('total', 0)}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 8: Get Public Report Data with Date Filters
    # ─────────────────────────────────────────────────────────────────────────
    def test_08_get_public_report_data_with_filters(self):
        """Test getting public report data with date filters"""
        # First get the token and verify password
        headers = self.get_auth_headers()
        link_response = self.session.get(f"{BASE_URL}/api/admin/reports/public-link", headers=headers)
        token = link_response.json().get("token")
        
        if not token:
            pytest.skip("No public link token available")
        
        # Verify password to get access token
        verify_response = self.session.post(f"{BASE_URL}/api/public/reports/{token}/verify",
            json={"password": TEST_PASSWORD}
        )
        
        if verify_response.status_code != 200:
            pytest.skip("Could not verify password")
            
        access_token = verify_response.json().get("access_token")
        
        # Get report data with date filters
        response = self.session.get(f"{BASE_URL}/api/public/reports/{token}/data",
            params={
                "auth": access_token,
                "start_date": "2024-01-01",
                "end_date": "2025-12-31"
            }
        )
        
        assert response.status_code == 200, f"Failed to get filtered report data: {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify period in response
        assert "period" in data, "Response should contain period"
        assert "start" in data["period"], "Period should have start date"
        assert "end" in data["period"], "Period should have end date"
        
        print(f"✓ Public report data with filters retrieved successfully")
        print(f"  - Period: {data['period']['start']} to {data['period']['end']}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 9: Get Public Report Data without Auth - Should Fail
    # ─────────────────────────────────────────────────────────────────────────
    def test_09_get_public_report_data_no_auth(self):
        """Test that getting report data without auth fails"""
        # First get the token
        headers = self.get_auth_headers()
        link_response = self.session.get(f"{BASE_URL}/api/admin/reports/public-link", headers=headers)
        token = link_response.json().get("token")
        
        if not token:
            pytest.skip("No public link token available")
        
        # Try to get report data without auth
        response = self.session.get(f"{BASE_URL}/api/public/reports/{token}/data")
        
        assert response.status_code == 401, f"Should return 401 without auth, got {response.status_code}"
        print(f"✓ Correctly rejected request without auth token")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 10: Update Password
    # ─────────────────────────────────────────────────────────────────────────
    def test_10_update_password(self):
        """Test updating the public link password"""
        headers = self.get_auth_headers()
        
        response = self.session.patch(f"{BASE_URL}/api/admin/reports/public-link/password",
            json={"new_password": NEW_TEST_PASSWORD},
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to update password: {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        print(f"✓ Password updated successfully")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 11: Verify Old Password No Longer Works
    # ─────────────────────────────────────────────────────────────────────────
    def test_11_verify_old_password_fails(self):
        """Test that old password no longer works after update"""
        # First get the token
        headers = self.get_auth_headers()
        link_response = self.session.get(f"{BASE_URL}/api/admin/reports/public-link", headers=headers)
        token = link_response.json().get("token")
        
        if not token:
            pytest.skip("No public link token available")
        
        response = self.session.post(f"{BASE_URL}/api/public/reports/{token}/verify",
            json={"password": TEST_PASSWORD}  # Old password
        )
        
        assert response.status_code == 401, f"Old password should be rejected, got {response.status_code}"
        print(f"✓ Old password correctly rejected after update")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 12: Verify New Password Works
    # ─────────────────────────────────────────────────────────────────────────
    def test_12_verify_new_password_works(self):
        """Test that new password works after update"""
        # First get the token
        headers = self.get_auth_headers()
        link_response = self.session.get(f"{BASE_URL}/api/admin/reports/public-link", headers=headers)
        token = link_response.json().get("token")
        
        if not token:
            pytest.skip("No public link token available")
        
        response = self.session.post(f"{BASE_URL}/api/public/reports/{token}/verify",
            json={"password": NEW_TEST_PASSWORD}  # New password
        )
        
        assert response.status_code == 200, f"New password should work, got {response.status_code}: {response.text}"
        print(f"✓ New password verified successfully")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 13: Reset Password Back to Original for Other Tests
    # ─────────────────────────────────────────────────────────────────────────
    def test_13_reset_password(self):
        """Reset password back to original for other tests"""
        headers = self.get_auth_headers()
        
        response = self.session.patch(f"{BASE_URL}/api/admin/reports/public-link/password",
            json={"new_password": TEST_PASSWORD},
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to reset password: {response.status_code}"
        print(f"✓ Password reset to original")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 14: Invalid Token Returns 404
    # ─────────────────────────────────────────────────────────────────────────
    def test_14_invalid_token_returns_404(self):
        """Test that invalid token returns 404"""
        response = self.session.post(f"{BASE_URL}/api/public/reports/invalidtoken123/verify",
            json={"password": TEST_PASSWORD}
        )
        
        assert response.status_code == 404, f"Invalid token should return 404, got {response.status_code}"
        print(f"✓ Invalid token correctly returns 404")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 15: Password Validation - Too Short
    # ─────────────────────────────────────────────────────────────────────────
    def test_15_password_too_short(self):
        """Test that password less than 4 characters is rejected"""
        headers = self.get_auth_headers()
        
        response = self.session.post(f"{BASE_URL}/api/admin/reports/public-link",
            json={"password": "abc"},  # Only 3 characters
            headers=headers
        )
        
        assert response.status_code == 400, f"Short password should return 400, got {response.status_code}"
        print(f"✓ Short password correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
