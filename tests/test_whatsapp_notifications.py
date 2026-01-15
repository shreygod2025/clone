"""
Test WhatsApp Notification Features for OLL Platform
Tests:
- POST /api/educator/notify-not-joined/{inquiry_id} - Educator notifies student hasn't joined
- POST /api/admin/notify-not-joined/{inquiry_id} - Admin notifies student or educator
- POST /api/notifications/send-reminders - Cron endpoint for scheduled reminders
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EDUCATOR_PHONE = "7777777777"
TEST_OTP = "1111"
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


class TestWhatsAppNotifications:
    """Test WhatsApp notification endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def educator_token(self):
        """Get educator authentication token via OTP"""
        # Send OTP
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TEST_EDUCATOR_PHONE,
            "user_type": "educator"
        })
        assert response.status_code == 200, f"Send OTP failed: {response.text}"
        
        # Verify OTP
        response = requests.post(f"{BASE_URL}/api/educator/login", json={
            "phone": TEST_EDUCATOR_PHONE,
            "otp": TEST_OTP
        })
        assert response.status_code == 200, f"Educator login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def educator_info(self, educator_token):
        """Get educator info"""
        response = requests.get(f"{BASE_URL}/api/educator/my-application", headers={
            "Authorization": f"Bearer {educator_token}"
        })
        assert response.status_code == 200, f"Get educator info failed: {response.text}"
        return response.json()
    
    @pytest.fixture(scope="class")
    def test_inquiry_with_educator(self, admin_token, educator_info):
        """Create a test inquiry assigned to the educator"""
        # Create a test inquiry
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        inquiry_data = {
            "name": f"TEST_WhatsApp_Student_{uuid.uuid4().hex[:6]}",
            "email": "test_whatsapp@example.com",
            "phone": "9876543210",
            "skill": "guitar",
            "learning_mode": "online",
            "city": "Mumbai",
            "learner_type": "self",
            "age_group": "18-25",
            "learning_goal": "hobby",
            "demo_date": tomorrow,
            "demo_time": "10:00",
            "source": "test"
        }
        
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json=inquiry_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Create inquiry failed: {response.text}"
        inquiry = response.json()
        
        # Assign educator to the inquiry
        educator_id = educator_info.get("id")
        educator_name = educator_info.get("name")
        
        response = requests.patch(f"{BASE_URL}/api/students/inquiry/{inquiry['id']}", json={
            "assigned_educator_id": educator_id,
            "assigned_educator_name": educator_name
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Assign educator failed: {response.text}"
        
        yield inquiry
        
        # Cleanup - archive the test inquiry
        requests.patch(f"{BASE_URL}/api/students/inquiry/{inquiry['id']}", json={
            "status": "archived"
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
    
    # ========================
    # EDUCATOR NOTIFY NOT JOINED TESTS
    # ========================
    
    def test_educator_notify_not_joined_success(self, educator_token, test_inquiry_with_educator):
        """Test educator can notify student hasn't joined"""
        inquiry_id = test_inquiry_with_educator["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/educator/notify-not-joined/{inquiry_id}",
            json={},
            headers={"Authorization": f"Bearer {educator_token}"}
        )
        
        assert response.status_code == 200, f"Notify not joined failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "notified" in data["message"].lower() or "student" in data["message"].lower()
        print(f"✓ Educator notify-not-joined success: {data['message']}")
    
    def test_educator_notify_not_joined_not_found(self, educator_token):
        """Test educator notify with non-existent inquiry returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/educator/notify-not-joined/{fake_id}",
            json={},
            headers={"Authorization": f"Bearer {educator_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Educator notify-not-joined returns 404 for non-existent inquiry")
    
    def test_educator_notify_not_joined_unauthorized(self, educator_token, admin_token):
        """Test educator cannot notify for demo not assigned to them"""
        # Create an inquiry NOT assigned to the test educator
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        inquiry_data = {
            "name": f"TEST_Unassigned_Student_{uuid.uuid4().hex[:6]}",
            "email": "test_unassigned@example.com",
            "phone": "9876543211",
            "skill": "piano",
            "learning_mode": "online",
            "city": "Delhi",
            "learner_type": "self",
            "demo_date": tomorrow,
            "demo_time": "11:00",
            "source": "test"
        }
        
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json=inquiry_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        inquiry = response.json()
        
        # Try to notify for this unassigned inquiry
        response = requests.post(
            f"{BASE_URL}/api/educator/notify-not-joined/{inquiry['id']}",
            json={},
            headers={"Authorization": f"Bearer {educator_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Educator notify-not-joined returns 403 for unassigned demo")
        
        # Cleanup
        requests.patch(f"{BASE_URL}/api/students/inquiry/{inquiry['id']}", json={
            "status": "archived"
        }, headers={"Authorization": f"Bearer {admin_token}"})
    
    # ========================
    # ADMIN NOTIFY NOT JOINED TESTS
    # ========================
    
    def test_admin_notify_student_not_joined(self, admin_token, test_inquiry_with_educator):
        """Test admin can notify student hasn't joined"""
        inquiry_id = test_inquiry_with_educator["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/notify-not-joined/{inquiry_id}",
            json={"notify_type": "student"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Admin notify student failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Admin notify student not-joined success: {data['message']}")
    
    def test_admin_notify_educator_not_joined(self, admin_token, test_inquiry_with_educator):
        """Test admin can notify educator hasn't joined"""
        inquiry_id = test_inquiry_with_educator["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/notify-not-joined/{inquiry_id}",
            json={"notify_type": "educator"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Admin notify educator failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Admin notify educator not-joined success: {data['message']}")
    
    def test_admin_notify_not_joined_not_found(self, admin_token):
        """Test admin notify with non-existent inquiry returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/admin/notify-not-joined/{fake_id}",
            json={"notify_type": "student"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Admin notify-not-joined returns 404 for non-existent inquiry")
    
    # ========================
    # SEND REMINDERS CRON ENDPOINT TESTS
    # ========================
    
    def test_send_reminders_endpoint_exists(self):
        """Test the send-reminders cron endpoint exists and responds"""
        response = requests.post(f"{BASE_URL}/api/notifications/send-reminders", json={})
        
        # Should return 200 even without auth (cron endpoint)
        assert response.status_code == 200, f"Send reminders failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Should return sent and errors arrays
        assert "sent" in data, "Response should contain 'sent' array"
        assert "errors" in data, "Response should contain 'errors' array"
        assert isinstance(data["sent"], list), "'sent' should be a list"
        assert isinstance(data["errors"], list), "'errors' should be a list"
        print(f"✓ Send reminders endpoint works: sent={len(data['sent'])}, errors={len(data['errors'])}")
    
    # ========================
    # VERIFY COMMENT LOGGING
    # ========================
    
    def test_notify_logs_comment(self, admin_token, test_inquiry_with_educator):
        """Test that notifications log a comment on the inquiry"""
        inquiry_id = test_inquiry_with_educator["id"]
        
        # Get inquiry before notification
        response = requests.get(f"{BASE_URL}/api/students/inquiry/{inquiry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        inquiry_before = response.json()
        comments_before = len(inquiry_before.get("comments", []))
        
        # Send notification
        response = requests.post(
            f"{BASE_URL}/api/admin/notify-not-joined/{inquiry_id}",
            json={"notify_type": "student"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Get inquiry after notification
        response = requests.get(f"{BASE_URL}/api/students/inquiry/{inquiry_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        inquiry_after = response.json()
        comments_after = len(inquiry_after.get("comments", []))
        
        # Should have one more comment
        assert comments_after > comments_before, "Notification should add a comment"
        
        # Check the latest comment mentions the notification
        latest_comment = inquiry_after["comments"][-1]
        assert "not joined" in latest_comment.get("text", "").lower(), "Comment should mention 'not joined'"
        print(f"✓ Notification logged comment: {latest_comment.get('text', '')[:50]}...")


class TestWhatsAppTemplates:
    """Test WhatsApp template configuration"""
    
    def test_templates_defined(self):
        """Verify all required templates are defined in the backend"""
        # This is a code review check - templates should be defined
        required_templates = [
            "student_demo_confirmed_online",
            "student_demo_confirmed_offline",
            "student_reminder_1hr",
            "student_reminder_30min_offline",
            "student_reminder_10min_online",
            "student_not_joined",
            "student_session_complete",
            "educator_demo_confirmed_online",
            "educator_demo_confirmed_offline",
            "educator_reminder_1hr",
            "educator_reminder_30min_offline",
            "educator_reminder_10min_online",
            "educator_not_joined",
            "educator_session_complete",
        ]
        
        # Read server.py to verify templates
        with open("/app/backend/server.py", "r") as f:
            server_code = f.read()
        
        for template in required_templates:
            assert template in server_code, f"Template '{template}' not found in server.py"
        
        print(f"✓ All {len(required_templates)} WhatsApp templates are defined")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
