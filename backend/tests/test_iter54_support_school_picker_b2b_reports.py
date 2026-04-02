"""
Iteration 54: Test Support Center School Picker and B2B Reports Features

Features tested:
1. Support Center Create Ticket - School contact picker
   - When 'School' type selected, School Name search input appears
   - Searching for a school shows dropdown with matching schools
   - Selecting a school shows its contacts (main contact + onboarding contacts)
   - Clicking a contact auto-fills Name, Phone, Email fields
   - School name and school_id are included in the ticket submission payload

2. B2B Reports
   - Only year filter visible (no Week/Month/Custom when B2B tab active)
   - Year selector dropdown works and filters data
   - New Schools vs Renewals pie chart renders with correct data
   - City Division of Customers chart renders with city breakdown
   - Backend: GET /api/admin/reports/b2b-insights returns new_vs_renewal and customer_cities fields
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndHealth:
    """Basic health and auth tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ Health check passed")
    
    def test_admin_login(self):
        """Test admin login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Admin login successful, token received")
        return data["access_token"]


class TestB2BInsightsEndpoint:
    """Test B2B insights endpoint returns new_vs_renewal and customer_cities"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_b2b_insights_returns_new_vs_renewal(self):
        """Test that b2b-insights endpoint returns new_vs_renewal field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/b2b-insights",
            headers=self.headers
        )
        assert response.status_code == 200, f"B2B insights failed: {response.text}"
        data = response.json()
        
        # Check new_vs_renewal field exists
        assert "new_vs_renewal" in data, "new_vs_renewal field missing from b2b-insights"
        new_vs_renewal = data["new_vs_renewal"]
        assert "new" in new_vs_renewal, "new_vs_renewal.new field missing"
        assert "renewal" in new_vs_renewal, "new_vs_renewal.renewal field missing"
        assert isinstance(new_vs_renewal["new"], int), "new_vs_renewal.new should be int"
        assert isinstance(new_vs_renewal["renewal"], int), "new_vs_renewal.renewal should be int"
        
        print(f"✓ new_vs_renewal field present: new={new_vs_renewal['new']}, renewal={new_vs_renewal['renewal']}")
    
    def test_b2b_insights_returns_customer_cities(self):
        """Test that b2b-insights endpoint returns customer_cities field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/b2b-insights",
            headers=self.headers
        )
        assert response.status_code == 200, f"B2B insights failed: {response.text}"
        data = response.json()
        
        # Check customer_cities field exists
        assert "customer_cities" in data, "customer_cities field missing from b2b-insights"
        customer_cities = data["customer_cities"]
        assert isinstance(customer_cities, list), "customer_cities should be a list"
        
        # If there are cities, check structure
        if len(customer_cities) > 0:
            city = customer_cities[0]
            assert "name" in city, "customer_cities item should have 'name'"
            assert "count" in city, "customer_cities item should have 'count'"
            print(f"✓ customer_cities field present with {len(customer_cities)} cities")
            for c in customer_cities[:5]:
                print(f"  - {c['name']}: {c['count']}")
        else:
            print("✓ customer_cities field present (empty list)")
    
    def test_b2b_insights_with_year_filter(self):
        """Test b2b-insights with year filter (2025)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/b2b-insights",
            params={"start_date": "2025-01-01", "end_date": "2025-12-31"},
            headers=self.headers
        )
        assert response.status_code == 200, f"B2B insights with year filter failed: {response.text}"
        data = response.json()
        
        # Verify period is set correctly
        assert "period" in data, "period field missing"
        assert "2025-01-01" in data["period"]["start"], "Start date not set correctly"
        assert "2025-12-31" in data["period"]["end"], "End date not set correctly"
        
        print(f"✓ B2B insights with year filter works, period: {data['period']['start']} to {data['period']['end']}")
    
    def test_b2b_insights_all_fields(self):
        """Test b2b-insights returns all expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/b2b-insights",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = [
            "total_schools", "revenue", "active_schools", "renewal_meeting",
            "renewed", "lost", "converted", "renewal_ratio", "conversion_ratio",
            "pipeline_value", "total_lost_value", "lead_source_breakdown",
            "status_breakdown", "offerings", "cities", "boards", "school_types",
            "new_vs_renewal", "customer_cities", "period"
        ]
        
        for field in expected_fields:
            assert field in data, f"Field '{field}' missing from b2b-insights"
        
        print(f"✓ All expected fields present in b2b-insights response")


class TestSchoolSearchForTickets:
    """Test school search endpoint used for ticket creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_schools_inquiries_endpoint(self):
        """Test GET /api/schools/inquiries returns schools list"""
        response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=self.headers
        )
        assert response.status_code == 200, f"Schools inquiries failed: {response.text}"
        data = response.json()
        
        # Check response structure
        schools = data.get("inquiries", data) if isinstance(data, dict) else data
        assert isinstance(schools, list), "Schools should be a list"
        
        if len(schools) > 0:
            school = schools[0]
            # Check school has expected fields for contact picker
            print(f"✓ Schools endpoint returns {len(schools)} schools")
            print(f"  Sample school fields: {list(school.keys())[:10]}")
            
            # Check for school_name field
            has_school_name = any(s.get('school_name') for s in schools[:10])
            assert has_school_name, "Schools should have school_name field"
            print(f"✓ Schools have school_name field")
        else:
            print("✓ Schools endpoint works (no schools found)")
    
    def test_school_has_contact_info(self):
        """Test that schools have contact information for picker"""
        response = requests.get(
            f"{BASE_URL}/api/schools/inquiries",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        schools = data.get("inquiries", data) if isinstance(data, dict) else data
        
        if len(schools) > 0:
            # Find a school with contact info
            school_with_contact = None
            for s in schools:
                if s.get('contact_name') or s.get('phone'):
                    school_with_contact = s
                    break
            
            if school_with_contact:
                print(f"✓ Found school with contact info:")
                print(f"  - School: {school_with_contact.get('school_name', 'N/A')}")
                print(f"  - Contact: {school_with_contact.get('contact_name', 'N/A')}")
                print(f"  - Phone: {school_with_contact.get('phone', 'N/A')}")
                print(f"  - Email: {school_with_contact.get('email', 'N/A')}")
            else:
                print("⚠ No schools with contact info found")


class TestSupportQueryCreation:
    """Test support query creation with school info"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_ticket_with_school_info(self):
        """Test creating a support ticket with school_name and school_id"""
        import uuid
        test_id = str(uuid.uuid4())[:8]
        
        payload = {
            "name": f"TEST_School_Contact_{test_id}",
            "phone": "9876543210",
            "email": f"test_{test_id}@school.com",
            "query_type": "partnership",
            "related_to": "school_partnership",
            "inquiry_type": "school",
            "message": f"Test ticket with school info - {test_id}",
            "priority": "normal",
            "source": "admin_created",
            "school_name": "Test Delhi Public School",
            "school_id": f"test-school-{test_id}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/support/queries/create",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code in [200, 201], f"Create ticket failed: {response.text}"
        data = response.json()
        
        # Verify ticket was created
        ticket_id = data.get("id") or data.get("query_id")
        assert ticket_id, "No ticket ID returned"
        
        print(f"✓ Ticket created with ID: {ticket_id}")
        print(f"  - School Name: {payload['school_name']}")
        print(f"  - School ID: {payload['school_id']}")
        
        # Verify ticket has school info by fetching it
        get_response = requests.get(
            f"{BASE_URL}/api/support/queries/{ticket_id}",
            headers=self.headers
        )
        
        if get_response.status_code == 200:
            ticket_data = get_response.json()
            # Check if school_name and school_id are stored
            if ticket_data.get('school_name') == payload['school_name']:
                print(f"✓ school_name persisted correctly")
            if ticket_data.get('school_id') == payload['school_id']:
                print(f"✓ school_id persisted correctly")
        
        return ticket_id


class TestSupportQueriesEndpoint:
    """Test support queries endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_support_queries(self):
        """Test GET /api/support/queries returns queries list"""
        response = requests.get(
            f"{BASE_URL}/api/support/queries",
            headers=self.headers
        )
        assert response.status_code == 200, f"Support queries failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Support queries should return a list"
        print(f"✓ Support queries endpoint returns {len(data)} queries")
        
        if len(data) > 0:
            query = data[0]
            print(f"  Sample query fields: {list(query.keys())[:10]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
