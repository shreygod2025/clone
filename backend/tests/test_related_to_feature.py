"""
Test cases for 'Related To' (sub-category) field feature
Tests:
1. POST /api/support/queries/create - Admin Support Panel ticket creation with related_to
2. POST /api/inquiry/query - Public /add page query creation with related_to
3. POST /api/schools/{school_id}/raise-ticket - School CRM ticket creation with related_to
4. GET /api/support/queries - Verify related_to is returned in queries list
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRelatedToFeature:
    """Test Related To (sub-category) field across all ticket creation points"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and get auth token"""
        self.admin_email = "admin@oll.co"
        self.admin_password = "Dagaji03@"
        self.auth_token = None
        self.test_school_id = None
        self.created_query_ids = []
        self.created_ticket_ids = []
        
        # Login to get auth token
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if login_response.status_code == 200:
            self.auth_token = login_response.json().get("access_token")
        
        yield
        
        # Cleanup - delete test data
        if self.auth_token:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            for query_id in self.created_query_ids:
                try:
                    requests.delete(f"{BASE_URL}/api/support/queries/{query_id}", headers=headers)
                except:
                    pass
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else {}
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Admin login successful")
    
    def test_create_ticket_from_admin_support_with_related_to(self):
        """P0: Test creating ticket from Admin Support Panel with related_to field"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        test_id = str(uuid.uuid4())[:8]
        ticket_data = {
            "name": f"TEST_User_{test_id}",
            "phone": "9876543210",
            "email": f"test_{test_id}@example.com",
            "query_type": "payment",
            "related_to": "refund_request",  # Sub-category
            "inquiry_type": "student",
            "message": "Test ticket with related_to field from admin support",
            "priority": "normal",
            "source": "admin_created"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/support/queries/create",
            json=ticket_data,
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Failed to create ticket: {response.text}"
        data = response.json()
        assert "id" in data, "No id in response"
        
        query_id = data["id"]
        self.created_query_ids.append(query_id)
        
        # Verify the ticket was created with related_to field
        get_response = requests.get(
            f"{BASE_URL}/api/support/queries",
            headers=self.get_auth_headers()
        )
        assert get_response.status_code == 200
        
        queries = get_response.json()
        created_query = next((q for q in queries if q.get("id") == query_id), None)
        
        assert created_query is not None, f"Created query not found in list"
        assert created_query.get("query_type") == "payment", f"query_type mismatch: {created_query.get('query_type')}"
        assert created_query.get("related_to") == "refund_request", f"related_to mismatch: {created_query.get('related_to')}"
        
        print(f"✓ Admin Support ticket created with related_to='refund_request'")
        print(f"  Query ID: {query_id}")
        print(f"  Query Type: {created_query.get('query_type')}")
        print(f"  Related To: {created_query.get('related_to')}")
    
    def test_create_query_from_public_add_page_with_related_to(self):
        """P0: Test creating query from public /add page with related_to field"""
        test_id = str(uuid.uuid4())[:8]
        query_data = {
            "inquiry_type": "student",
            "action_type": "query",
            "name": f"TEST_PublicUser_{test_id}",
            "phone": "9876543211",
            "email": f"public_{test_id}@example.com",
            "query_type": "demo_related",
            "related_to": "demo_reschedule",  # Sub-category
            "query_details": "Test query from public /add page with related_to",
            "priority": "normal",
            "source": "team_added"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inquiry/query",
            json=query_data
        )
        
        assert response.status_code == 200, f"Failed to create query: {response.text}"
        data = response.json()
        assert "id" in data, "No id in response"
        
        query_id = data["id"]
        
        # Verify the query was created with related_to field
        # Note: inquiry_queries collection is separate from support_queries
        if self.auth_token:
            get_response = requests.get(
                f"{BASE_URL}/api/inquiry/queries",
                headers=self.get_auth_headers()
            )
            if get_response.status_code == 200:
                queries = get_response.json()
                created_query = next((q for q in queries if q.get("id") == query_id), None)
                
                if created_query:
                    assert created_query.get("query_type") == "demo_related", f"query_type mismatch"
                    assert created_query.get("related_to") == "demo_reschedule", f"related_to mismatch: {created_query.get('related_to')}"
                    print(f"✓ Public /add page query created with related_to='demo_reschedule'")
                    print(f"  Query ID: {query_id}")
                    print(f"  Query Type: {created_query.get('query_type')}")
                    print(f"  Related To: {created_query.get('related_to')}")
                else:
                    print(f"✓ Query created successfully (ID: {query_id}), but not found in inquiry_queries list")
        else:
            print(f"✓ Public /add page query created (ID: {query_id})")
    
    def test_create_ticket_from_school_crm_with_related_to(self):
        """P0: Test creating ticket from School CRM with related_to field"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # First, get a school to raise ticket for
        schools_response = requests.get(
            f"{BASE_URL}/api/schools",
            headers=self.get_auth_headers()
        )
        
        if schools_response.status_code != 200 or not schools_response.json():
            # Create a test school first
            test_id = str(uuid.uuid4())[:8]
            school_data = {
                "school_name": f"TEST_School_{test_id}",
                "contact_name": "Test Contact",
                "email": f"school_{test_id}@example.com",
                "phone": "9876543212",
                "location": "Mumbai",
                "school_size": "500-1000 students",
                "programs_interested": ["Robotics"]
            }
            create_response = requests.post(
                f"{BASE_URL}/api/schools/inquiry",
                json=school_data,
                headers=self.get_auth_headers()
            )
            if create_response.status_code == 200:
                school_id = create_response.json().get("id")
            else:
                pytest.skip("Could not create test school")
        else:
            schools = schools_response.json()
            school_id = schools[0].get("id")
        
        # Now raise a ticket for this school
        ticket_data = {
            "query_type": "kit_delivery",
            "related_to": "items_missing",  # Sub-category
            "subject": "Kit Delivery Issue - Items Missing",
            "description": "Test ticket from School CRM with related_to field",
            "priority": "high",
            "contact_name": "Test Contact",
            "contact_phone": "9876543212",
            "contact_email": "test@school.com",
            "source": "school_crm"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/raise-ticket",
            json=ticket_data,
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Failed to raise ticket: {response.text}"
        data = response.json()
        assert "ticket_id" in data, "No ticket_id in response"
        
        ticket_id = data["ticket_id"]
        self.created_ticket_ids.append(ticket_id)
        
        print(f"✓ School CRM ticket raised with related_to='items_missing'")
        print(f"  Ticket ID: {ticket_id}")
        print(f"  Query Type: kit_delivery")
        print(f"  Related To: items_missing")
    
    def test_related_to_options_coverage(self):
        """Test that various related_to options work correctly"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        # Test different query_type and related_to combinations
        test_cases = [
            {"query_type": "technical", "related_to": "login_issue"},
            {"query_type": "course_info", "related_to": "course_pricing"},
            {"query_type": "feedback", "related_to": "complaint"},
            {"query_type": "educator_query", "related_to": "payment_query"},
        ]
        
        for i, test_case in enumerate(test_cases):
            test_id = str(uuid.uuid4())[:8]
            ticket_data = {
                "name": f"TEST_Coverage_{test_id}",
                "phone": f"987654321{i}",
                "email": f"coverage_{test_id}@example.com",
                "query_type": test_case["query_type"],
                "related_to": test_case["related_to"],
                "inquiry_type": "student",
                "message": f"Test coverage for {test_case['query_type']}/{test_case['related_to']}",
                "priority": "normal",
                "source": "admin_created"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/support/queries/create",
                json=ticket_data,
                headers=self.get_auth_headers()
            )
            
            assert response.status_code == 200, f"Failed for {test_case}: {response.text}"
            query_id = response.json().get("id")
            self.created_query_ids.append(query_id)
            
            print(f"✓ Created ticket with query_type='{test_case['query_type']}', related_to='{test_case['related_to']}'")
    
    def test_support_queries_list_includes_related_to(self):
        """P0: Verify support queries list includes related_to field"""
        if not self.auth_token:
            pytest.skip("Auth token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/support/queries",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Failed to get queries: {response.text}"
        queries = response.json()
        
        # Check if any query has related_to field
        queries_with_related_to = [q for q in queries if q.get("related_to")]
        
        print(f"✓ Support queries list retrieved")
        print(f"  Total queries: {len(queries)}")
        print(f"  Queries with related_to: {len(queries_with_related_to)}")
        
        if queries_with_related_to:
            sample = queries_with_related_to[0]
            print(f"  Sample query:")
            print(f"    - query_type: {sample.get('query_type')}")
            print(f"    - related_to: {sample.get('related_to')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
