"""
OLL Platform API Tests - OTP Authentication & Bookings
Testing: OTP send/verify, user bookings, reschedule functionality
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://oll-multiuser.preview.emergentagent.com')

# Test phone number and mock OTP
TEST_PHONE = "9876543210"
MOCK_OTP = "1111"


class TestOTPAuthentication:
    """OTP send and verify endpoint tests"""
    
    def test_send_otp_student(self):
        """Test sending OTP for student user type"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TEST_PHONE,
            "user_type": "student"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "OTP sent" in data["message"]
        # Verify hint for testing is present
        assert "hint" in data
        assert "1111" in data["hint"]
        print("✓ OTP sent successfully for student")
    
    def test_send_otp_educator(self):
        """Test sending OTP for educator user type"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "9876543211",
            "user_type": "educator"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ OTP sent successfully for educator")
    
    def test_send_otp_school(self):
        """Test sending OTP for school user type"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "9876543212",
            "user_type": "school"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ OTP sent successfully for school")
    
    def test_verify_otp_success(self):
        """Test verifying OTP with correct code (1111)"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TEST_PHONE,
            "user_type": "student"
        })
        
        # Then verify with mock OTP
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": TEST_PHONE,
            "otp": MOCK_OTP,
            "user_type": "student"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == TEST_PHONE
        assert data["user_type"] == "student"
        assert "bookings" in data
        assert isinstance(data["bookings"], list)
        print("✓ OTP verified successfully")
    
    def test_verify_otp_invalid(self):
        """Test verifying OTP with wrong code"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "9876543299",
            "user_type": "student"
        })
        
        # Then verify with wrong OTP
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "9876543299",
            "otp": "9999",
            "user_type": "student"
        })
        assert response.status_code == 400
        data = response.json()
        assert "Invalid OTP" in data["detail"]
        print("✓ Invalid OTP rejected correctly")
    
    def test_verify_otp_not_sent(self):
        """Test verifying OTP without sending first"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "1111111111",  # Phone that never received OTP
            "otp": MOCK_OTP,
            "user_type": "student"
        })
        assert response.status_code == 400
        data = response.json()
        assert "expired" in data["detail"].lower() or "not found" in data["detail"].lower()
        print("✓ OTP not found error handled correctly")


class TestUserBookings:
    """User bookings endpoint tests"""
    
    def test_get_bookings_student(self):
        """Test fetching bookings for a student phone number"""
        response = requests.get(f"{BASE_URL}/api/user/bookings/{TEST_PHONE}?user_type=student")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} student bookings")
    
    def test_get_bookings_educator(self):
        """Test fetching bookings for an educator phone number"""
        response = requests.get(f"{BASE_URL}/api/user/bookings/9876543211?user_type=educator")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} educator bookings")
    
    def test_get_bookings_school(self):
        """Test fetching bookings for a school phone number"""
        response = requests.get(f"{BASE_URL}/api/user/bookings/9876543212?user_type=school")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} school bookings")


class TestReschedule:
    """Reschedule booking endpoint tests"""
    
    @pytest.fixture
    def create_test_booking(self):
        """Create a test booking to reschedule"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "learner_type": "self",
            "age_group": "13-15",
            "skill": "coding",
            "learning_mode": "online",
            "city": "Mumbai",
            "learning_goal": "hobby",
            "name": "TEST_Reschedule_User",
            "email": "test_reschedule@test.com",
            "phone": "9876543299",
            "demo_date": tomorrow,
            "demo_time": "10:00",
            "source": "website"
        })
        assert response.status_code == 200
        return response.json()
    
    def test_reschedule_booking(self, create_test_booking):
        """Test rescheduling a booking"""
        booking = create_test_booking
        new_date = (datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d')
        
        response = requests.post(f"{BASE_URL}/api/user/reschedule", json={
            "booking_id": booking["id"],
            "user_type": "student",
            "new_date": new_date,
            "new_time": "15:00"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "rescheduled" in data["message"].lower()
        print("✓ Booking rescheduled successfully")
    
    def test_reschedule_missing_fields(self):
        """Test reschedule with missing required fields"""
        response = requests.post(f"{BASE_URL}/api/user/reschedule", json={
            "booking_id": "some-id",
            "user_type": "student"
            # Missing new_date and new_time
        })
        assert response.status_code == 400
        data = response.json()
        assert "Missing required fields" in data["detail"]
        print("✓ Missing fields error handled correctly")


class TestStudentFunnelWithOTP:
    """End-to-end student funnel with OTP verification"""
    
    def test_complete_student_funnel_flow(self):
        """Test complete student funnel: inquiry creation + OTP verification"""
        test_phone = "9876543288"
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Step 1: Create student inquiry
        inquiry_response = requests.post(f"{BASE_URL}/api/students/inquiry", json={
            "learner_type": "child",
            "age_group": "10-12",
            "skill": "robotics",
            "learning_mode": "offline_center",
            "city": "Delhi",
            "learning_goal": "career",
            "name": "TEST_OTP_Flow_User",
            "email": "test_otp_flow@test.com",
            "phone": test_phone,
            "demo_date": tomorrow,
            "demo_time": "11:00",
            "source": "website"
        })
        assert inquiry_response.status_code == 200
        inquiry_data = inquiry_response.json()
        assert inquiry_data["phone"] == test_phone
        print("✓ Step 1: Student inquiry created")
        
        # Step 2: Send OTP
        otp_send_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": test_phone,
            "user_type": "student"
        })
        assert otp_send_response.status_code == 200
        print("✓ Step 2: OTP sent")
        
        # Step 3: Verify OTP
        otp_verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": test_phone,
            "otp": MOCK_OTP,
            "user_type": "student"
        })
        assert otp_verify_response.status_code == 200
        verify_data = otp_verify_response.json()
        assert verify_data["phone"] == test_phone
        assert verify_data["is_registered"] == True
        assert len(verify_data["bookings"]) > 0
        print("✓ Step 3: OTP verified, user registered")
        
        # Step 4: Fetch bookings
        bookings_response = requests.get(f"{BASE_URL}/api/user/bookings/{test_phone}?user_type=student")
        assert bookings_response.status_code == 200
        bookings = bookings_response.json()
        assert len(bookings) > 0
        # Verify the booking we created is in the list
        booking_found = any(b["phone"] == test_phone and b["skill"] == "robotics" for b in bookings)
        assert booking_found, "Created booking not found in user's bookings"
        print("✓ Step 4: Bookings fetched successfully")
        
        return inquiry_data["id"]


class TestCitiesAndCenters:
    """Cities and Centers endpoints for student funnel"""
    
    def test_get_cities(self):
        """Test fetching cities list"""
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} cities")
    
    def test_get_centers(self):
        """Test fetching all centers"""
        response = requests.get(f"{BASE_URL}/api/centers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} centers")
    
    def test_get_centers_by_city(self):
        """Test fetching centers by city"""
        # First get cities to find one with centers
        cities_response = requests.get(f"{BASE_URL}/api/cities")
        cities = cities_response.json()
        
        if cities:
            city_name = cities[0]["name"]
            response = requests.get(f"{BASE_URL}/api/centers/by-city/{city_name}")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Fetched centers for city: {city_name}")
        else:
            print("⚠ No cities available to test centers by city")


class TestDemoSlots:
    """Demo slots endpoint tests"""
    
    def test_get_demo_slots(self):
        """Test fetching available demo slots"""
        response = requests.get(f"{BASE_URL}/api/demo-slots")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            # Verify slot structure
            slot = data[0]
            assert "date" in slot
            assert "time" in slot
            assert "is_available" in slot
        print(f"✓ Fetched {len(data)} demo slots")
    
    def test_get_demo_slots_by_date(self):
        """Test fetching demo slots for specific date"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        response = requests.get(f"{BASE_URL}/api/demo-slots?date={tomorrow}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned slots should be for the requested date
        for slot in data:
            assert slot["date"] == tomorrow
        print(f"✓ Fetched {len(data)} demo slots for {tomorrow}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
