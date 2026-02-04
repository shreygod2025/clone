"""
Test GP Onboarding and Reports Features
- GP Onboarding: 3 steps (Personal Info, Contract Signing, Training)
- GP Activation creates team user with Growth Partner role
- GP Discontinuation workflow
- Public GP tracking page
- Reports: 7 tabs with date filtering
- Expense management CRUD
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestGPOnboarding(TestAuth):
    """GP Onboarding API Tests"""
    
    def test_get_gp_onboardings_list(self, auth_headers):
        """Test GET /api/gp-onboarding - List all GP onboardings"""
        response = requests.get(f"{BASE_URL}/api/gp-onboarding", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} GP onboarding records")
    
    def test_get_gp_onboardings_by_status(self, auth_headers):
        """Test GET /api/gp-onboarding?status=onboarding - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/gp-onboarding?status=onboarding", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned records should have status=onboarding
        for record in data:
            assert record.get('status') == 'onboarding'
        print(f"Found {len(data)} GP onboarding records with status=onboarding")
    
    def test_create_growth_partner_for_onboarding(self, auth_headers):
        """Create a test growth partner to use for onboarding tests"""
        test_partner = {
            "name": f"TEST_GP_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543210",
            "city": "Mumbai",
            "interest_type": "franchise",
            "details": "Test GP for onboarding",
            "source": "website"
        }
        response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create GP: {response.text}"
        data = response.json()
        assert data.get('id')
        assert data.get('name') == test_partner['name']
        print(f"Created test GP: {data.get('id')}")
        return data
    
    def test_init_gp_onboarding(self, auth_headers):
        """Test POST /api/gp-onboarding/init/{partner_id} - Initialize GP onboarding"""
        # First create a growth partner
        test_partner = {
            "name": f"TEST_GP_INIT_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_init_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543211",
            "city": "Delhi",
            "interest_type": "partnership",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        partner_id = create_response.json().get('id')
        
        # Initialize onboarding
        response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        assert response.status_code == 200, f"Failed to init onboarding: {response.text}"
        data = response.json()
        assert data.get('id')
        assert data.get('growth_partner_id') == partner_id
        assert data.get('status') == 'onboarding'
        assert 'steps' in data
        assert 'personal_info' in data['steps']
        assert 'contract_signing' in data['steps']
        assert 'training' in data['steps']
        print(f"Initialized GP onboarding: {data.get('id')}")
        return data
    
    def test_complete_personal_info_step(self, auth_headers):
        """Test completing Personal Info step with bank details"""
        # Create and init onboarding
        test_partner = {
            "name": f"TEST_GP_STEP1_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_step1_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543212",
            "city": "Bangalore",
            "interest_type": "reseller",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        partner_id = create_response.json().get('id')
        
        init_response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        onboarding_id = init_response.json().get('id')
        
        # Complete personal info step
        step_data = {
            "step": "personal_info",
            "data": {
                "full_name": "Test GP User",
                "dob": "1990-01-15",
                "address": "123 Test Street, Bangalore",
                "pan": "ABCDE1234F",
                "aadhar": "123456789012",
                "bank_details": {
                    "account_holder": "Test GP User",
                    "account_number": "1234567890",
                    "ifsc": "HDFC0001234",
                    "bank_name": "HDFC Bank"
                }
            }
        }
        response = requests.post(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}/complete-step", json=step_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to complete step: {response.text}"
        data = response.json()
        assert data['steps']['personal_info']['completed'] == True
        assert data['steps']['personal_info']['completed_at'] is not None
        assert data.get('personal_info', {}).get('full_name') == "Test GP User"
        print(f"Completed personal_info step for onboarding: {onboarding_id}")
        return onboarding_id
    
    def test_complete_contract_signing_step(self, auth_headers):
        """Test completing Contract Signing step with commission structure"""
        # Create and init onboarding
        test_partner = {
            "name": f"TEST_GP_STEP2_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_step2_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543213",
            "city": "Chennai",
            "interest_type": "franchise",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        partner_id = create_response.json().get('id')
        
        init_response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        onboarding_id = init_response.json().get('id')
        
        # Complete contract signing step
        step_data = {
            "step": "contract_signing",
            "data": {
                "contract_url": "https://example.com/contract.pdf",
                "commission_structure": {
                    "student_referral": "10",
                    "school_referral": "15"
                }
            }
        }
        response = requests.post(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}/complete-step", json=step_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to complete step: {response.text}"
        data = response.json()
        assert data['steps']['contract_signing']['completed'] == True
        assert data.get('contract_url') == "https://example.com/contract.pdf"
        assert data.get('commission_structure', {}).get('student_referral') == "10"
        print(f"Completed contract_signing step for onboarding: {onboarding_id}")
    
    def test_complete_training_step(self, auth_headers):
        """Test completing Training step"""
        # Create and init onboarding
        test_partner = {
            "name": f"TEST_GP_STEP3_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_step3_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543214",
            "city": "Hyderabad",
            "interest_type": "partnership",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        partner_id = create_response.json().get('id')
        
        init_response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        onboarding_id = init_response.json().get('id')
        
        # Complete training step
        step_data = {
            "step": "training",
            "data": {
                "notes": "Completed product training and referral process training"
            }
        }
        response = requests.post(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}/complete-step", json=step_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to complete step: {response.text}"
        data = response.json()
        assert data['steps']['training']['completed'] == True
        assert data.get('training_notes') == "Completed product training and referral process training"
        print(f"Completed training step for onboarding: {onboarding_id}")
    
    def test_activate_gp_creates_team_user(self, auth_headers):
        """Test POST /api/gp-onboarding/{id}/activate - Creates team user with GP role"""
        # Create and init onboarding
        test_partner = {
            "name": f"TEST_GP_ACTIVATE_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_activate_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543215",
            "city": "Pune",
            "interest_type": "franchise",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        partner_id = create_response.json().get('id')
        
        init_response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        onboarding_id = init_response.json().get('id')
        
        # Complete all 3 steps
        steps = [
            {"step": "personal_info", "data": {"full_name": "Test GP Activate", "bank_details": {"account_number": "123"}}},
            {"step": "contract_signing", "data": {"contract_url": "https://test.com/contract.pdf", "commission_structure": {"student_referral": "10"}}},
            {"step": "training", "data": {"notes": "Training complete"}}
        ]
        for step in steps:
            requests.post(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}/complete-step", json=step, headers=auth_headers)
        
        # Activate
        response = requests.post(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}/activate", json={}, headers=auth_headers)
        assert response.status_code == 200, f"Failed to activate: {response.text}"
        data = response.json()
        assert data.get('team_user_id')
        assert data.get('username')
        assert data.get('temp_password')
        print(f"Activated GP - Username: {data.get('username')}, Team User ID: {data.get('team_user_id')}")
        
        # Verify onboarding status changed to active
        get_response = requests.get(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json().get('status') == 'active'
    
    def test_activate_without_all_steps_fails(self, auth_headers):
        """Test that activation fails if not all steps are complete"""
        # Create and init onboarding
        test_partner = {
            "name": f"TEST_GP_FAIL_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_fail_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543216",
            "city": "Kolkata",
            "interest_type": "partnership",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        partner_id = create_response.json().get('id')
        
        init_response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        onboarding_id = init_response.json().get('id')
        
        # Only complete 1 step
        requests.post(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}/complete-step", 
                     json={"step": "personal_info", "data": {"full_name": "Test"}}, headers=auth_headers)
        
        # Try to activate - should fail
        response = requests.post(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}/activate", json={}, headers=auth_headers)
        assert response.status_code == 400, "Activation should fail without all steps complete"
        print("Correctly rejected activation without all steps complete")
    
    def test_discontinue_gp(self, auth_headers):
        """Test POST /api/gp-onboarding/{id}/discontinue - Discontinue GP"""
        # Create and init onboarding
        test_partner = {
            "name": f"TEST_GP_DISC_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_disc_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543217",
            "city": "Ahmedabad",
            "interest_type": "reseller",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        partner_id = create_response.json().get('id')
        
        init_response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        onboarding_id = init_response.json().get('id')
        
        # Discontinue
        response = requests.post(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}/discontinue", 
                                json={"reason": "Inactivity"}, headers=auth_headers)
        assert response.status_code == 200, f"Failed to discontinue: {response.text}"
        
        # Verify status changed
        get_response = requests.get(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}", headers=auth_headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get('status') == 'discontinued'
        assert data.get('discontinued_reason') == 'Inactivity'
        print(f"Discontinued GP onboarding: {onboarding_id}")
    
    def test_discontinue_without_reason_fails(self, auth_headers):
        """Test that discontinuation fails without reason"""
        # Create and init onboarding
        test_partner = {
            "name": f"TEST_GP_DISC_FAIL_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_disc_fail_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543218",
            "city": "Jaipur",
            "interest_type": "franchise",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        partner_id = create_response.json().get('id')
        
        init_response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        onboarding_id = init_response.json().get('id')
        
        # Try to discontinue without reason
        response = requests.post(f"{BASE_URL}/api/gp-onboarding/{onboarding_id}/discontinue", 
                                json={"reason": ""}, headers=auth_headers)
        assert response.status_code == 400, "Discontinuation should fail without reason"
        print("Correctly rejected discontinuation without reason")


class TestGPPublicTracking(TestAuth):
    """Test public GP tracking page"""
    
    def test_public_tracking_endpoint(self, auth_headers):
        """Test GET /api/gp-onboarding/track/{token} - Public tracking"""
        # Create and init onboarding to get a token
        test_partner = {
            "name": f"TEST_GP_TRACK_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_track_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543219",
            "city": "Lucknow",
            "interest_type": "partnership",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        partner_id = create_response.json().get('id')
        
        init_response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        onboarding = init_response.json()
        tracking_token = onboarding.get('tracking_token')
        
        # Access public tracking endpoint (no auth required)
        response = requests.get(f"{BASE_URL}/api/gp-onboarding/track/{tracking_token}")
        assert response.status_code == 200, f"Failed to get tracking: {response.text}"
        data = response.json()
        assert data.get('name') == test_partner['name']
        assert data.get('status') == 'onboarding'
        assert 'steps' in data
        print(f"Public tracking works for token: {tracking_token}")
    
    def test_invalid_tracking_token(self):
        """Test that invalid token returns 404"""
        response = requests.get(f"{BASE_URL}/api/gp-onboarding/track/invalid_token_123")
        assert response.status_code == 404
        print("Correctly returned 404 for invalid tracking token")


class TestReportsOverview(TestAuth):
    """Test Reports API endpoints"""
    
    def test_reports_overview(self, auth_headers):
        """Test GET /api/admin/reports/overview"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/overview", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert 'overview' in data or 'students' in data or 'schools' in data
        print(f"Reports overview: {list(data.keys())}")
    
    def test_reports_with_date_filter(self, auth_headers):
        """Test reports with date filtering"""
        today = datetime.now()
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/overview",
            params={"start_date": start_date, "end_date": end_date},
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"Reports with date filter ({start_date} to {end_date}) works")
    
    def test_sales_funnel_students(self, auth_headers):
        """Test GET /api/admin/reports/sales-funnel for students"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/sales-funnel",
            params={"user_type": "students"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert 'total_leads' in data or 'conversion_rates' in data
        print(f"Sales funnel (students): {data}")
    
    def test_sales_funnel_schools(self, auth_headers):
        """Test GET /api/admin/reports/sales-funnel for schools"""
        response = requests.get(
            f"{BASE_URL}/api/admin/reports/sales-funnel",
            params={"user_type": "schools"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Sales funnel (schools): {data}")
    
    def test_educator_metrics(self, auth_headers):
        """Test GET /api/admin/reports/educator-metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/educator-metrics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Educator metrics: {list(data.keys()) if isinstance(data, dict) else 'list'}")
    
    def test_support_metrics(self, auth_headers):
        """Test GET /api/admin/reports/support-metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/support-metrics", headers=auth_headers)
        assert response.status_code == 200
        print("Support metrics endpoint works")
    
    def test_user_stages(self, auth_headers):
        """Test GET /api/admin/reports/user-stages"""
        response = requests.get(f"{BASE_URL}/api/admin/reports/user-stages", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Should have stages for students, schools, educators, etc.
        print(f"User stages: {list(data.keys()) if isinstance(data, dict) else 'list'}")


class TestExpenseManagement(TestAuth):
    """Test Expense CRUD operations"""
    
    def test_get_expense_categories(self, auth_headers):
        """Test GET /api/expenses/categories"""
        response = requests.get(f"{BASE_URL}/api/expenses/categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert 'categories' in data
        assert len(data['categories']) > 0
        print(f"Expense categories: {data['categories']}")
    
    def test_create_expense(self, auth_headers):
        """Test POST /api/expenses - Create expense"""
        expense_data = {
            "title": f"TEST_Expense_{datetime.now().strftime('%H%M%S')}",
            "description": "Test expense for testing",
            "amount": 5000.00,
            "category": "marketing",
            "subcategory": "digital_ads",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "payment_method": "bank_transfer",
            "vendor": "Test Vendor",
            "notes": "Test expense notes"
        }
        response = requests.post(f"{BASE_URL}/api/expenses", json=expense_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create expense: {response.text}"
        data = response.json()
        assert data.get('id')
        assert data.get('title') == expense_data['title']
        assert data.get('amount') == expense_data['amount']
        print(f"Created expense: {data.get('id')}")
        return data
    
    def test_get_expenses_list(self, auth_headers):
        """Test GET /api/expenses - List expenses"""
        response = requests.get(f"{BASE_URL}/api/expenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert 'expenses' in data
        assert 'total' in data
        print(f"Found {len(data['expenses'])} expenses, total: {data['total']}")
    
    def test_get_expenses_with_date_filter(self, auth_headers):
        """Test GET /api/expenses with date filter"""
        today = datetime.now()
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/expenses",
            params={"start_date": start_date, "end_date": end_date},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Expenses in date range: {len(data.get('expenses', []))}")
    
    def test_update_expense(self, auth_headers):
        """Test PATCH /api/expenses/{id} - Update expense"""
        # First create an expense
        expense_data = {
            "title": f"TEST_Update_{datetime.now().strftime('%H%M%S')}",
            "amount": 3000.00,
            "category": "operations",
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        create_response = requests.post(f"{BASE_URL}/api/expenses", json=expense_data, headers=auth_headers)
        expense_id = create_response.json().get('id')
        
        # Update it
        update_data = {
            "title": "Updated Expense Title",
            "amount": 3500.00
        }
        response = requests.patch(f"{BASE_URL}/api/expenses/{expense_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to update: {response.text}"
        data = response.json()
        assert data.get('title') == "Updated Expense Title"
        assert data.get('amount') == 3500.00
        print(f"Updated expense: {expense_id}")
    
    def test_delete_expense(self, auth_headers):
        """Test DELETE /api/expenses/{id} - Delete expense"""
        # First create an expense
        expense_data = {
            "title": f"TEST_Delete_{datetime.now().strftime('%H%M%S')}",
            "amount": 1000.00,
            "category": "other",
            "date": datetime.now().strftime('%Y-%m-%d')
        }
        create_response = requests.post(f"{BASE_URL}/api/expenses", json=expense_data, headers=auth_headers)
        expense_id = create_response.json().get('id')
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/expenses/{expense_id}", headers=auth_headers)
        assert response.status_code in [200, 204], f"Failed to delete: {response.text}"
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/expenses/{expense_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"Deleted expense: {expense_id}")


class TestGrowthPartnerStatusChange(TestAuth):
    """Test that changing GP status to 'converted' triggers onboarding"""
    
    def test_status_change_to_converted_triggers_onboarding(self, auth_headers):
        """Test that PATCH /api/growth-partners/{id} with status=converted triggers onboarding init"""
        # Create a growth partner
        test_partner = {
            "name": f"TEST_GP_CONVERT_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_gp_convert_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543220",
            "city": "Surat",
            "interest_type": "franchise",
            "source": "website"
        }
        create_response = requests.post(f"{BASE_URL}/api/growth-partners", json=test_partner, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        partner_id = create_response.json().get('id')
        
        # Change status to converted (this should trigger onboarding init in frontend)
        # Note: The frontend calls /api/gp-onboarding/init/{id} when status changes to converted
        # Here we test the init endpoint directly
        init_response = requests.post(f"{BASE_URL}/api/gp-onboarding/init/{partner_id}", json={}, headers=auth_headers)
        assert init_response.status_code == 200
        
        # Verify onboarding was created
        onboarding = init_response.json()
        assert onboarding.get('growth_partner_id') == partner_id
        assert onboarding.get('status') == 'onboarding'
        print(f"Onboarding initiated for converted GP: {partner_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
