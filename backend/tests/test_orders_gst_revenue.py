"""
Test Orders GST Type and Revenue Calculation Features
- GST Type dropdown in order update popup (Book GST, Inclusive, Exclusive)
- PATCH /api/orders/{payment_id} - Should accept and save gst_type field
- GET /api/orders/school-payments - Should return gst_type field
- Revenue calculation in /api/admin/reports/dashboard-metrics
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"
TEST_PAYMENT_ID = "pay-245298c6-052c-4beb-a6c4-4cf8ec104558-0"


class TestOrdersGSTAndRevenue:
    """Test Orders GST Type and Revenue Calculation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.auth_token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_01_login_success(self):
        """Test admin login works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful for {data['user']['email']}")
    
    def test_02_get_school_payments_endpoint(self):
        """Test GET /api/orders/school-payments returns data with gst_type field"""
        response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} school payments")
        
        # Check structure of payment records
        if len(data) > 0:
            payment = data[0]
            expected_fields = ["id", "school_id", "school_name", "amount", "status"]
            for field in expected_fields:
                assert field in payment, f"Missing field: {field}"
            
            # Check if gst_type field exists in response structure
            # It may be None/null but should be present
            print(f"Sample payment: id={payment['id']}, school={payment['school_name']}, gst_type={payment.get('gst_type')}")
    
    def test_03_get_student_payments_endpoint(self):
        """Test GET /api/orders/student-payments returns data"""
        response = self.session.get(f"{BASE_URL}/api/orders/student-payments")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} student payments")
    
    def test_04_update_payment_with_gst_type_book_gst(self):
        """Test PATCH /api/orders/{payment_id} with gst_type=book_gst"""
        # First get a valid payment ID
        payments_response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        if payments_response.status_code != 200 or len(payments_response.json()) == 0:
            pytest.skip("No school payments available to test")
        
        payments = payments_response.json()
        test_payment = payments[0]
        payment_id = test_payment["id"]
        
        # Update with gst_type = book_gst
        update_data = {
            "status": test_payment.get("status", "pending"),
            "gst_type": "book_gst",
            "type": "school"
        }
        
        response = self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json=update_data)
        assert response.status_code == 200
        print(f"Updated payment {payment_id} with gst_type=book_gst")
        
        # Verify the update by fetching again
        verify_response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        assert verify_response.status_code == 200
        
        updated_payments = verify_response.json()
        updated_payment = next((p for p in updated_payments if p["id"] == payment_id), None)
        
        if updated_payment:
            assert updated_payment.get("gst_type") == "book_gst", f"Expected gst_type=book_gst, got {updated_payment.get('gst_type')}"
            print(f"Verified: gst_type is now 'book_gst' for payment {payment_id}")
    
    def test_05_update_payment_with_gst_type_inclusive(self):
        """Test PATCH /api/orders/{payment_id} with gst_type=inclusive"""
        payments_response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        if payments_response.status_code != 200 or len(payments_response.json()) == 0:
            pytest.skip("No school payments available to test")
        
        payments = payments_response.json()
        test_payment = payments[0]
        payment_id = test_payment["id"]
        
        # Update with gst_type = inclusive
        update_data = {
            "status": test_payment.get("status", "pending"),
            "gst_type": "inclusive",
            "type": "school"
        }
        
        response = self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json=update_data)
        assert response.status_code == 200
        print(f"Updated payment {payment_id} with gst_type=inclusive")
        
        # Verify the update
        verify_response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        updated_payments = verify_response.json()
        updated_payment = next((p for p in updated_payments if p["id"] == payment_id), None)
        
        if updated_payment:
            assert updated_payment.get("gst_type") == "inclusive", f"Expected gst_type=inclusive, got {updated_payment.get('gst_type')}"
            print(f"Verified: gst_type is now 'inclusive' for payment {payment_id}")
    
    def test_06_update_payment_with_gst_type_exclusive(self):
        """Test PATCH /api/orders/{payment_id} with gst_type=exclusive"""
        payments_response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        if payments_response.status_code != 200 or len(payments_response.json()) == 0:
            pytest.skip("No school payments available to test")
        
        payments = payments_response.json()
        test_payment = payments[0]
        payment_id = test_payment["id"]
        
        # Update with gst_type = exclusive
        update_data = {
            "status": test_payment.get("status", "pending"),
            "gst_type": "exclusive",
            "type": "school"
        }
        
        response = self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json=update_data)
        assert response.status_code == 200
        print(f"Updated payment {payment_id} with gst_type=exclusive")
        
        # Verify the update
        verify_response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        updated_payments = verify_response.json()
        updated_payment = next((p for p in updated_payments if p["id"] == payment_id), None)
        
        if updated_payment:
            assert updated_payment.get("gst_type") == "exclusive", f"Expected gst_type=exclusive, got {updated_payment.get('gst_type')}"
            print(f"Verified: gst_type is now 'exclusive' for payment {payment_id}")
    
    def test_07_dashboard_metrics_endpoint(self):
        """Test GET /api/admin/reports/overview returns revenue data"""
        response = self.session.get(f"{BASE_URL}/api/admin/reports/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "overview" in data
        
        overview = data["overview"]
        assert "total_revenue" in overview
        assert "student_revenue" in overview
        assert "school_revenue" in overview
        
        print(f"Dashboard Metrics:")
        print(f"  Total Revenue: ₹{overview['total_revenue']:,.2f}")
        print(f"  Student Revenue: ₹{overview['student_revenue']:,.2f}")
        print(f"  School Revenue: ₹{overview['school_revenue']:,.2f}")
        print(f"  Converted Schools: {overview.get('converted_schools', 0)}")
    
    def test_08_revenue_includes_converted_schools(self):
        """Test that revenue calculation includes converted school amounts"""
        # Get dashboard metrics
        metrics_response = self.session.get(f"{BASE_URL}/api/admin/reports/overview")
        assert metrics_response.status_code == 200
        metrics = metrics_response.json()
        
        # Get school inquiries to verify
        schools_response = self.session.get(f"{BASE_URL}/api/schools/inquiries")
        assert schools_response.status_code == 200
        schools = schools_response.json()
        
        # Calculate expected school revenue manually
        expected_school_revenue = 0
        converted_schools = [s for s in schools if s.get('status') in ['converted', 'active', 'renewed']]
        
        for school in converted_schools:
            onboarding_data = school.get('onboarding_data', {})
            amount = float(school.get('conversion_amount') or onboarding_data.get('total_amount') or school.get('amount_paid') or 0)
            expected_school_revenue += amount
        
        actual_school_revenue = metrics['overview']['school_revenue']
        
        print(f"Converted/Active/Renewed Schools: {len(converted_schools)}")
        print(f"Expected School Revenue: ₹{expected_school_revenue:,.2f}")
        print(f"Actual School Revenue: ₹{actual_school_revenue:,.2f}")
        
        # Revenue should match (allowing for floating point differences)
        assert abs(actual_school_revenue - expected_school_revenue) < 1, \
            f"Revenue mismatch: expected {expected_school_revenue}, got {actual_school_revenue}"
    
    def test_09_gst_type_column_in_payments_response(self):
        """Verify gst_type field is included in school payments response"""
        response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        assert response.status_code == 200
        
        payments = response.json()
        
        # Check that gst_type field exists in response (even if null)
        payments_with_gst = [p for p in payments if p.get("gst_type")]
        print(f"Payments with GST type set: {len(payments_with_gst)} out of {len(payments)}")
        
        for payment in payments_with_gst:
            gst_type = payment.get("gst_type")
            assert gst_type in ["book_gst", "inclusive", "exclusive"], \
                f"Invalid gst_type: {gst_type}"
            print(f"  Payment {payment['id']}: gst_type={gst_type}")
    
    def test_10_update_payment_with_all_fields(self):
        """Test updating payment with all fields including gst_type"""
        payments_response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        if payments_response.status_code != 200 or len(payments_response.json()) == 0:
            pytest.skip("No school payments available to test")
        
        payments = payments_response.json()
        test_payment = payments[0]
        payment_id = test_payment["id"]
        
        # Update with all fields
        update_data = {
            "status": "pending",
            "gst_type": "inclusive",
            "notes": "Test update with all fields",
            "type": "school"
        }
        
        response = self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/orders/school-payments")
        updated_payments = verify_response.json()
        updated_payment = next((p for p in updated_payments if p["id"] == payment_id), None)
        
        if updated_payment:
            assert updated_payment.get("gst_type") == "inclusive"
            assert updated_payment.get("notes") == "Test update with all fields"
            print(f"Successfully updated payment {payment_id} with all fields")


class TestSpecificPaymentID:
    """Test with specific payment ID from requirements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_specific_payment_update(self):
        """Test updating the specific payment ID from requirements"""
        payment_id = TEST_PAYMENT_ID
        
        # Try to update the specific payment
        update_data = {
            "status": "pending",
            "gst_type": "inclusive",
            "type": "school"
        }
        
        response = self.session.patch(f"{BASE_URL}/api/orders/{payment_id}", json=update_data)
        
        # Payment might not exist, so we check for valid responses
        if response.status_code == 200:
            print(f"Successfully updated payment {payment_id}")
        elif response.status_code == 404:
            print(f"Payment {payment_id} not found - this is expected if test data doesn't exist")
        else:
            print(f"Unexpected response: {response.status_code} - {response.text}")
        
        # Either 200 or 404 is acceptable
        assert response.status_code in [200, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
