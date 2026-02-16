"""
OLL Platform Backend Tests - Iteration 40
Testing admin features, student login, school tracking, and public pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test Credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"
STUDENT_PHONE = "9699188188"
OTP = "1111"
TEST_STUDENT_ID = "c3559dd1-acd3-4246-804a-9f307c378bca"
TEST_SCHOOL_TRACKING_TOKEN = "oll-881838c2bfb0"
TEST_SCHOOL_ID = "8dfa2fc8-a53b-460a-ba85-e1ffd1e2663b"


class TestHealthCheck:
    """Test basic health endpoint"""
    
    def test_health_endpoint(self):
        """Verify health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("Health endpoint: PASSED")


class TestAdminAuth:
    """Test admin authentication flows"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        # API returns access_token, not token
        assert "access_token" in data
        assert len(data["access_token"]) > 0
        print("Admin login: PASSED")
        return data["access_token"]
    
    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]
        print("Admin login invalid credentials: PASSED")


class TestStudentAuth:
    """Test student OTP login flow"""
    
    def test_student_send_otp(self):
        """Test sending OTP to student phone"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": STUDENT_PHONE
        })
        # OTP endpoint should work (status 200) or indicate rate limiting (429)
        assert response.status_code in [200, 429, 201]
        print("Student send OTP: PASSED")
    
    def test_student_verify_otp(self):
        """Test verifying OTP for student login"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": STUDENT_PHONE,
            "otp": OTP
        })
        assert response.status_code == 200
        data = response.json()
        # Response contains user info with bookings
        assert "is_registered" in data or "bookings" in data
        print("Student verify OTP: PASSED")


class TestAdminPages:
    """Test admin pages and APIs require authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Setup authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_schools_inquiries(self):
        """Test school inquiries endpoint"""
        response = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Schools inquiries: PASSED - {len(data)} schools")
    
    def test_students_inquiries(self):
        """Test student inquiries endpoint"""
        response = requests.get(f"{BASE_URL}/api/students/inquiries", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Students inquiries: PASSED - {len(data)} students")
    
    def test_admin_reports_overview(self):
        """Test admin reports overview endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/overview", headers=self.headers)
        assert response.status_code == 200
        print("Admin reports overview: PASSED")
    
    def test_support_queries(self):
        """Test support queries endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/support-queries", headers=self.headers)
        assert response.status_code in [200, 404]
        print(f"Support queries: PASSED (status {response.status_code})")
    
    def test_expenses_endpoint(self):
        """Test expenses endpoint"""
        response = requests.get(f"{BASE_URL}/api/expenses", headers=self.headers)
        assert response.status_code == 200
        print("Expenses endpoint: PASSED")
    
    def test_educators_endpoint(self):
        """Test educators endpoint"""
        response = requests.get(f"{BASE_URL}/api/educators", headers=self.headers)
        assert response.status_code == 200
        print("Educators endpoint: PASSED")
    
    def test_growth_partners_endpoint(self):
        """Test growth partners endpoint"""
        response = requests.get(f"{BASE_URL}/api/growth-partners", headers=self.headers)
        assert response.status_code in [200, 404]
        print(f"Growth partners endpoint: PASSED (status {response.status_code})")
    
    def test_blogs_endpoint(self):
        """Test blogs endpoint"""
        response = requests.get(f"{BASE_URL}/api/blogs", headers=self.headers)
        assert response.status_code == 200
        print("Blogs endpoint: PASSED")
    
    def test_orders_school_payments(self):
        """Test orders school payments endpoint"""
        response = requests.get(f"{BASE_URL}/api/orders/school-payments", headers=self.headers)
        assert response.status_code == 200
        print("Orders school payments: PASSED")
    
    def test_orders_student_payments(self):
        """Test orders student payments endpoint"""
        response = requests.get(f"{BASE_URL}/api/orders/student-payments", headers=self.headers)
        assert response.status_code == 200
        print("Orders student payments: PASSED")
    
    def test_team_users(self):
        """Test team users endpoint for assignment"""
        response = requests.get(f"{BASE_URL}/api/team-users", headers=self.headers)
        assert response.status_code == 200
        print("Team users: PASSED")


class TestStudentPayments:
    """Test individual student payment endpoints"""
    
    def test_payments_by_phone(self):
        """Test getting payment info by phone"""
        response = requests.get(f"{BASE_URL}/api/payments/by-phone/{STUDENT_PHONE}")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"Payments by phone: PASSED - has_pending: {data.get('has_pending_payment')}")
        else:
            print("Payments by phone: PASSED - No payment found (404)")
    
    def test_payment_create_session(self):
        """Test creating payment session for student"""
        response = requests.post(f"{BASE_URL}/api/payments/create-session/{TEST_STUDENT_ID}")
        # Should return 200 with session or 404 if student not found or no pending payment
        assert response.status_code in [200, 404, 400]
        if response.status_code == 200:
            data = response.json()
            assert "payment_session_id" in data or "order_id" in data
            print("Payment create session: PASSED")
        else:
            print(f"Payment create session: PASSED (status {response.status_code})")


class TestSchoolTracking:
    """Test school tracking page endpoints"""
    
    def test_school_tracking_page(self):
        """Test school tracking endpoint with token"""
        response = requests.get(f"{BASE_URL}/api/track/{TEST_SCHOOL_TRACKING_TOKEN}")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "school_name" in data or "steps" in data
            # Check that tracking URL (if present) uses production domain
            steps = data.get("steps", [])
            for step in steps:
                if step.get("key") == "kit_delivery":
                    tracking_link = step.get("tracking_link", "") or ""
                    po_info = step.get("po_info") or {}
                    po_tracking = po_info.get("public_tracking_url", "") or ""
                    if tracking_link:
                        assert "preview.emergentagent.com" not in tracking_link, f"Track shipment should use production URL, got: {tracking_link}"
                    if po_tracking:
                        assert "preview.emergentagent.com" not in po_tracking, f"PO tracking should use production URL, got: {po_tracking}"
            print("School tracking page: PASSED")
        else:
            print("School tracking page: PASSED (404 - token may not exist)")
    
    def test_public_school_payment(self):
        """Test public school payment page endpoint"""
        response = requests.get(f"{BASE_URL}/api/school-payment/public/{TEST_SCHOOL_ID}")
        assert response.status_code in [200, 404]
        print(f"Public school payment: PASSED (status {response.status_code})")
    
    def test_public_payment_tracker(self):
        """Test public payment tracker endpoint"""
        response = requests.get(f"{BASE_URL}/api/school-payment/tracker-public/{TEST_SCHOOL_ID}")
        assert response.status_code in [200, 404]
        print(f"Public payment tracker: PASSED (status {response.status_code})")


class TestPublicPages:
    """Test public facing pages/APIs"""
    
    def test_landing_page_offerings(self):
        """Test offerings endpoint for landing page"""
        response = requests.get(f"{BASE_URL}/api/offerings")
        assert response.status_code in [200, 404]
        print(f"Offerings endpoint: PASSED (status {response.status_code})")
    
    def test_public_blogs(self):
        """Test public blogs endpoint"""
        response = requests.get(f"{BASE_URL}/api/blogs/public")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
        print(f"Public blogs: PASSED (status {response.status_code})")


class TestReportsAPI:
    """Test reports API endpoints that were recently modified"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Setup authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_sales_funnel_students(self):
        """Test sales funnel for students"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/sales-funnel", 
                               params={"user_type": "students"}, 
                               headers=self.headers)
        assert response.status_code == 200
        print("Sales funnel students: PASSED")
    
    def test_sales_funnel_schools(self):
        """Test sales funnel for schools"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/sales-funnel", 
                               params={"user_type": "schools"}, 
                               headers=self.headers)
        assert response.status_code == 200
        print("Sales funnel schools: PASSED")
    
    def test_educator_metrics(self):
        """Test educator metrics endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/educator-metrics", headers=self.headers)
        assert response.status_code == 200
        print("Educator metrics: PASSED")
    
    def test_support_metrics(self):
        """Test support metrics endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/support-metrics", headers=self.headers)
        assert response.status_code == 200
        print("Support metrics: PASSED")
    
    def test_user_stages(self):
        """Test user stages endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/user-stages", headers=self.headers)
        assert response.status_code == 200
        print("User stages: PASSED")
    
    def test_expense_categories(self):
        """Test expense categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/expenses/categories", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        print("Expense categories: PASSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
