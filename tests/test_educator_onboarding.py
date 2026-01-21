"""
Test file for Educator Onboarding System
Tests the 8-step onboarding flow: Welcome, Profile, Personal Details, Bank Details, Contract, Training+Quiz, Curriculum+Assessment, Complete
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"
TEST_EDUCATOR_PHONE = "7777777777"
TEST_OTP = "1111"


class TestOnboardingContentAPI:
    """Test onboarding content endpoint (videos, quiz, contract)"""
    
    def test_get_onboarding_content(self):
        """GET /api/educator/onboarding/content - Returns videos, quiz, contract text"""
        response = requests.get(f"{BASE_URL}/api/educator/onboarding/content")
        assert response.status_code == 200
        
        data = response.json()
        # Verify training videos
        assert "training_videos" in data
        assert len(data["training_videos"]) >= 1
        assert all("id" in v and "title" in v and "url" in v for v in data["training_videos"])
        
        # Verify curriculum videos
        assert "curriculum_videos" in data
        assert len(data["curriculum_videos"]) >= 1
        
        # Verify welcome video
        assert "welcome_video" in data
        assert "url" in data["welcome_video"]
        
        # Verify contract text
        assert "contract_text" in data
        assert len(data["contract_text"]) > 100  # Contract should have substantial text
        print(f"✓ Onboarding content API returns {len(data['training_videos'])} training videos, {len(data['curriculum_videos'])} curriculum videos")


class TestEducatorOnboardingProgress:
    """Test educator onboarding progress APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token and educator token"""
        # Admin login
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_response.status_code == 200
        self.admin_token = admin_response.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Educator login via /api/educator/login endpoint
        login_response = requests.post(f"{BASE_URL}/api/educator/login", json={
            "phone": TEST_EDUCATOR_PHONE,
            "otp": TEST_OTP,
            "user_type": "educator"
        })
        if login_response.status_code == 200:
            self.educator_token = login_response.json().get("access_token")
            self.educator_id = login_response.json().get("user", {}).get("id")
            self.educator_headers = {"Authorization": f"Bearer {self.educator_token}"}
        else:
            self.educator_token = None
            self.educator_id = None
            self.educator_headers = {}
    
    def test_get_onboarding_progress(self):
        """GET /api/educator/onboarding/{educator_id} - Returns onboarding progress"""
        if not self.educator_id:
            pytest.skip("No educator available for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{self.educator_id}",
            headers=self.educator_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "onboarding" in data
        assert "educator" in data
        
        onboarding = data["onboarding"]
        assert "current_step" in onboarding
        assert "completed_steps" in onboarding
        assert "status" in onboarding
        print(f"✓ Onboarding progress: Step {onboarding['current_step']}, Completed: {onboarding['completed_steps']}")
    
    def test_update_onboarding_progress(self):
        """PATCH /api/educator/onboarding/{educator_id} - Updates onboarding data"""
        if not self.educator_id:
            pytest.skip("No educator available for testing")
        
        # Update bio
        response = requests.patch(
            f"{BASE_URL}/api/educator/onboarding/{self.educator_id}",
            json={"bio": "Test bio for onboarding testing"},
            headers=self.educator_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("bio") == "Test bio for onboarding testing"
        print("✓ Onboarding progress updated successfully")


class TestQuizAndAssessment:
    """Test quiz and assessment submission APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get educator token"""
        otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TEST_EDUCATOR_PHONE,
            "user_type": "educator"
        })
        
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": TEST_EDUCATOR_PHONE,
            "otp": TEST_OTP,
            "user_type": "educator"
        })
        if verify_response.status_code == 200:
            self.educator_token = verify_response.json().get("access_token")
            self.educator_id = verify_response.json().get("user", {}).get("educator_id") or verify_response.json().get("user", {}).get("id")
            self.educator_headers = {"Authorization": f"Bearer {self.educator_token}"}
        else:
            self.educator_token = None
            self.educator_id = None
            self.educator_headers = {}
    
    def test_get_quiz_questions(self):
        """GET /api/educator/onboarding/{educator_id}/quiz - Returns quiz questions without answers"""
        if not self.educator_id:
            pytest.skip("No educator available for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{self.educator_id}/quiz",
            headers=self.educator_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "questions" in data
        assert len(data["questions"]) >= 5  # Should have 5 quiz questions
        
        # Verify questions don't include correct answers
        for q in data["questions"]:
            assert "id" in q
            assert "question" in q
            assert "options" in q
            assert "correct" not in q  # Should not expose correct answer
        print(f"✓ Quiz has {len(data['questions'])} questions")
    
    def test_get_assessment_questions(self):
        """GET /api/educator/onboarding/{educator_id}/assessment - Returns assessment questions"""
        if not self.educator_id:
            pytest.skip("No educator available for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{self.educator_id}/assessment",
            headers=self.educator_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "questions" in data
        assert len(data["questions"]) >= 3  # Should have 3 assessment questions
        print(f"✓ Assessment has {len(data['questions'])} questions")
    
    def test_submit_quiz_pass(self):
        """POST /api/educator/onboarding/{educator_id}/submit-quiz - Pass with correct answers"""
        if not self.educator_id:
            pytest.skip("No educator available for testing")
        
        # Submit all correct answers (based on TRAINING_QUIZ in server.py)
        # q1: correct=2, q2: correct=1, q3: correct=1, q4: correct=1, q5: correct=1
        answers = {
            "q1": 2,  # 60 minutes
            "q2": 1,  # Provide extra attention
            "q3": 1,  # Student-centric
            "q4": 1,  # At the start of class
            "q5": 1   # Inform admin 24 hours before
        }
        
        response = requests.post(
            f"{BASE_URL}/api/educator/onboarding/{self.educator_id}/submit-quiz",
            json={"answers": answers},
            headers=self.educator_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "score" in data
        assert "passed" in data
        assert data["score"] == 100  # All correct
        assert data["passed"] == True
        print(f"✓ Quiz submitted: Score {data['score']}%, Passed: {data['passed']}")
    
    def test_submit_quiz_fail(self):
        """POST /api/educator/onboarding/{educator_id}/submit-quiz - Fail with wrong answers"""
        if not self.educator_id:
            pytest.skip("No educator available for testing")
        
        # Submit all wrong answers
        answers = {
            "q1": 0,  # Wrong
            "q2": 0,  # Wrong
            "q3": 0,  # Wrong
            "q4": 0,  # Wrong
            "q5": 0   # Wrong
        }
        
        response = requests.post(
            f"{BASE_URL}/api/educator/onboarding/{self.educator_id}/submit-quiz",
            json={"answers": answers},
            headers=self.educator_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["score"] == 0
        assert data["passed"] == False
        assert "70%" in data["message"]  # Should mention 70% threshold
        print(f"✓ Quiz fail test: Score {data['score']}%, Passed: {data['passed']}")
    
    def test_submit_assessment_pass(self):
        """POST /api/educator/onboarding/{educator_id}/submit-assessment - Pass with correct answers"""
        if not self.educator_id:
            pytest.skip("No educator available for testing")
        
        # Submit all correct answers (based on CURRICULUM_ASSESSMENT in server.py)
        # a1: correct=1, a2: correct=2, a3: correct=1
        answers = {
            "a1": 1,  # 6-10 years
            "a2": 2,  # Monthly
            "a3": 1   # 15-20 minutes
        }
        
        response = requests.post(
            f"{BASE_URL}/api/educator/onboarding/{self.educator_id}/submit-assessment",
            json={"answers": answers},
            headers=self.educator_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["score"] == 100
        assert data["passed"] == True
        print(f"✓ Assessment submitted: Score {data['score']}%, Passed: {data['passed']}")


class TestAdminOnboardingAPIs:
    """Test admin onboarding management APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_response.status_code == 200
        self.admin_token = admin_response.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_direct_onboard_educator(self):
        """POST /api/admin/educators/direct-onboard - Creates educator with onboarded status"""
        unique_id = str(uuid.uuid4())[:8]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/educators/direct-onboard",
            json={
                "name": f"TEST_DirectOnboard_{unique_id}",
                "email": f"test_direct_{unique_id}@example.com",
                "phone": f"99{unique_id[:8].replace('-', '0')}",
                "skills": ["Music", "Dance"],
                "city": "Mumbai",
                "experience": "3 years"
            },
            headers=self.admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "educator_id" in data
        assert "onboarding started" in data["message"].lower()
        
        # Verify educator was created with onboarded status
        educator_id = data["educator_id"]
        educators_response = requests.get(
            f"{BASE_URL}/api/educators/applications",
            headers=self.admin_headers
        )
        educators = educators_response.json()
        created_educator = next((e for e in educators if e["id"] == educator_id), None)
        assert created_educator is not None
        assert created_educator["status"] == "onboarded"
        
        # Cleanup - archive the test educator
        requests.patch(
            f"{BASE_URL}/api/educators/application/{educator_id}",
            json={"status": "archived"},
            headers=self.admin_headers
        )
        print(f"✓ Direct onboard created educator {educator_id} with onboarded status")
    
    def test_get_onboarding_progress_admin(self):
        """GET /api/admin/educators/onboarding-progress - Returns all onboarding data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/educators/onboarding-progress",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Each item should have educator and onboarding info
        if len(data) > 0:
            item = data[0]
            assert "educator" in item
            assert "onboarding" in item or "progress" in item
        print(f"✓ Admin onboarding progress returns {len(data)} educators")


class TestCompleteStepAPI:
    """Test step completion API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get educator token"""
        otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TEST_EDUCATOR_PHONE,
            "user_type": "educator"
        })
        
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": TEST_EDUCATOR_PHONE,
            "otp": TEST_OTP,
            "user_type": "educator"
        })
        if verify_response.status_code == 200:
            self.educator_token = verify_response.json().get("access_token")
            self.educator_id = verify_response.json().get("user", {}).get("educator_id") or verify_response.json().get("user", {}).get("id")
            self.educator_headers = {"Authorization": f"Bearer {self.educator_token}"}
        else:
            self.educator_token = None
            self.educator_id = None
            self.educator_headers = {}
    
    def test_complete_step_advances_progress(self):
        """POST /api/educator/onboarding/{educator_id}/complete-step - Advances to next step"""
        if not self.educator_id:
            pytest.skip("No educator available for testing")
        
        # Get current step
        progress_response = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{self.educator_id}",
            headers=self.educator_headers
        )
        current_step = progress_response.json()["onboarding"]["current_step"]
        
        # Complete current step
        response = requests.post(
            f"{BASE_URL}/api/educator/onboarding/{self.educator_id}/complete-step",
            json={"step": current_step},
            headers=self.educator_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "next_step" in data
        assert "completed_steps" in data
        assert current_step in data["completed_steps"]
        print(f"✓ Step {current_step} completed, next step: {data['next_step']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
