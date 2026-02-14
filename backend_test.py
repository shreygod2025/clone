import requests
import sys
import json
from datetime import datetime

class OLLAPITester:
    def __init__(self, base_url="https://learning-admin-hub.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.passed_tests.append(name)
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200] if response.text else "No response"
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_admin_register(self):
        """Test admin registration"""
        test_data = {
            "email": f"admin_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!",
            "name": "Test Admin",
            "role": "admin"
        }
        success, response = self.run_test("Admin Registration", "POST", "auth/register", 200, test_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_admin_login(self):
        """Test admin login with existing credentials"""
        test_data = {
            "email": f"admin_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!"
        }
        # First register
        self.run_test("Admin Registration for Login", "POST", "auth/register", 200, {
            **test_data,
            "name": "Test Admin",
            "role": "admin"
        })
        
        # Then login
        success, response = self.run_test("Admin Login", "POST", "auth/login", 200, test_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_student_inquiry(self):
        """Test student inquiry creation"""
        test_data = {
            "learner_type": "self",
            "age_group": "13-16",
            "skill": "coding",
            "learning_mode": "online",
            "city": "Mumbai",
            "learning_goal": "career",
            "name": "Test Student",
            "email": "student@test.com",
            "phone": "9876543210",
            "demo_date": "2024-12-20",
            "demo_time": "10:00"
        }
        success, response = self.run_test("Student Inquiry Creation", "POST", "students/inquiry", 200, test_data)
        return response.get('id') if success else None

    def test_school_inquiry(self):
        """Test school inquiry creation"""
        test_data = {
            "school_name": "Test School",
            "contact_name": "Test Contact",
            "email": "school@test.com",
            "phone": "9876543210",
            "location": "Mumbai",
            "school_size": "500-1000 students",
            "fee_range": "₹50,000 - ₹1,00,000/year",
            "programs_interested": ["stem", "ai"],
            "support_needed": ["curriculum", "lab"]
        }
        success, response = self.run_test("School Inquiry Creation", "POST", "schools/inquiry", 200, test_data)
        return response.get('id') if success else None

    def test_educator_application(self):
        """Test educator application"""
        test_data = {
            "name": "Test Educator",
            "email": "educator@test.com",
            "phone": "9876543210",
            "skills": ["Robotics", "Coding"],
            "experience": "5 years teaching experience",
            "grades_comfortable": ["Primary (1-5)", "Middle (6-8)"],
            "city": "Mumbai",
            "availability": "Weekday Evenings",
            "demo_ready": True
        }
        success, response = self.run_test("Educator Application", "POST", "educators/apply", 200, test_data)
        return response.get('id') if success else None

    def test_support_ticket(self):
        """Test support ticket creation"""
        test_data = {
            "name": "Test User",
            "email": "user@test.com",
            "user_type": "student",
            "subject": "Test Support",
            "message": "This is a test support ticket"
        }
        success, response = self.run_test("Support Ticket Creation", "POST", "support/ticket", 200, test_data)
        return response.get('id') if success else None

    def test_faqs(self):
        """Test FAQ retrieval"""
        return self.run_test("FAQ Retrieval", "GET", "faqs", 200)

    def test_requirements(self):
        """Test requirements retrieval"""
        return self.run_test("Requirements Retrieval", "GET", "requirements", 200)

    def test_blogs(self):
        """Test blog retrieval"""
        return self.run_test("Blog Retrieval", "GET", "blogs", 200)

    def test_about_content(self):
        """Test about content retrieval"""
        return self.run_test("About Content Retrieval", "GET", "about", 200)

    def test_demo_slots(self):
        """Test demo slots retrieval"""
        return self.run_test("Demo Slots Retrieval", "GET", "demo-slots", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats (requires auth)"""
        if not self.token:
            print("⚠️ Skipping dashboard stats test - no auth token")
            return False
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_admin_crm_endpoints(self):
        """Test admin CRM endpoints (requires auth)"""
        if not self.token:
            print("⚠️ Skipping CRM tests - no auth token")
            return False
        
        # Test student inquiries retrieval
        self.run_test("Student Inquiries Retrieval", "GET", "students/inquiries", 200)
        
        # Test school inquiries retrieval
        self.run_test("School Inquiries Retrieval", "GET", "schools/inquiries", 200)
        
        # Test educator applications retrieval
        self.run_test("Educator Applications Retrieval", "GET", "educators/applications", 200)
        
        # Test support tickets retrieval
        self.run_test("Support Tickets Retrieval", "GET", "support/tickets", 200)

def main():
    print("🚀 Starting OLL Platform API Tests")
    print("=" * 50)
    
    tester = OLLAPITester()
    
    # Test basic endpoints first
    tester.test_health_check()
    
    # Test public endpoints
    tester.test_faqs()
    tester.test_requirements()
    tester.test_blogs()
    tester.test_about_content()
    tester.test_demo_slots()
    
    # Test inquiry submissions
    student_id = tester.test_student_inquiry()
    school_id = tester.test_school_inquiry()
    educator_id = tester.test_educator_application()
    support_id = tester.test_support_ticket()
    
    # Test admin authentication
    if tester.test_admin_register():
        print("✅ Admin registration successful, testing authenticated endpoints...")
        tester.test_dashboard_stats()
        tester.test_admin_crm_endpoints()
    else:
        print("❌ Admin registration failed, skipping authenticated tests")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"  - {failure.get('test', 'Unknown')}: {failure.get('error', failure.get('actual', 'Unknown error'))}")
    
    if tester.passed_tests:
        print(f"\n✅ Passed Tests: {', '.join(tester.passed_tests)}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())