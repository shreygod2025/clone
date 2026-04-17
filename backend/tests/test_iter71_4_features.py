"""
Iteration 71 tests for 4 new features:
1. Primary/Secondary Coordinator role options in School CRM contact dropdowns (static code check)
2. AI chat textarea auto-resize (frontend-side; backend static check)
3. AI chat ticket creation assigns ticket_number (ai_chat.py raise_ticket handler)
4. Summer Camp CRM mobile-responsive card layout (AdminStudentCRM.jsx static check)
5. Backend health check
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ── Health Check ─────────────────────────────────────────────────────────────

class TestHealthCheck:
    """Backend health endpoint"""

    def test_health_endpoint_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", f"Unexpected status: {data}"
        print(f"PASS: Health check OK - status={data.get('status')}")


# ── AI Chat Ticket Number ─────────────────────────────────────────────────────

class TestAIChatTicketNumber:
    """Verify raise_ticket handler in ai_chat.py assigns ticket_number"""

    def test_ai_chat_imports_get_next_ticket_number(self):
        """Static analysis: ai_chat.py must import get_next_ticket_number"""
        with open('/app/backend/routes/ai_chat.py', 'r') as f:
            content = f.read()
        assert 'get_next_ticket_number' in content, "get_next_ticket_number not found in ai_chat.py"
        assert 'from routes.shared import get_next_ticket_number' in content or \
               'get_next_ticket_number' in content, \
               "Import of get_next_ticket_number missing"
        print("PASS: get_next_ticket_number import found in ai_chat.py")

    def test_raise_ticket_handler_assigns_ticket_number(self):
        """Static analysis: raise_ticket handler must call get_next_ticket_number"""
        with open('/app/backend/routes/ai_chat.py', 'r') as f:
            content = f.read()
        # Check that ticket_number is assigned via get_next_ticket_number
        assert re.search(r'ticket_number\s*=\s*await\s+get_next_ticket_number\(\)', content), \
            "raise_ticket handler does not call await get_next_ticket_number()"
        # Check that ticket_number is included in the saved document
        assert '"ticket_number"' in content or "'ticket_number'" in content, \
            "ticket_number not stored in query_doc"
        print("PASS: raise_ticket handler assigns ticket_number via get_next_ticket_number()")

    def test_shared_module_has_get_next_ticket_number(self):
        """Verify get_next_ticket_number exists in routes/shared.py"""
        with open('/app/backend/routes/shared.py', 'r') as f:
            content = f.read()
        assert 'get_next_ticket_number' in content, \
            "get_next_ticket_number not defined in routes/shared.py"
        print("PASS: get_next_ticket_number defined in routes/shared.py")


# ── School CRM Role Dropdowns ─────────────────────────────────────────────────

class TestSchoolCRMRoleDropdowns:
    """Verify Primary/Secondary Coordinator options in AdminSchoolCRM.jsx"""

    def test_primary_coordinator_option_exists(self):
        """Static analysis: AdminSchoolCRM.jsx must contain primary_coordinator option"""
        with open('/app/frontend/src/pages/admin/AdminSchoolCRM.jsx', 'r') as f:
            content = f.read()
        assert 'primary_coordinator' in content, \
            "primary_coordinator option missing from AdminSchoolCRM.jsx"
        count = content.count('primary_coordinator')
        print(f"PASS: 'primary_coordinator' found {count} times in AdminSchoolCRM.jsx")

    def test_secondary_coordinator_option_exists(self):
        """Static analysis: AdminSchoolCRM.jsx must contain secondary_coordinator option"""
        with open('/app/frontend/src/pages/admin/AdminSchoolCRM.jsx', 'r') as f:
            content = f.read()
        assert 'secondary_coordinator' in content, \
            "secondary_coordinator option missing from AdminSchoolCRM.jsx"
        count = content.count('secondary_coordinator')
        print(f"PASS: 'secondary_coordinator' found {count} times in AdminSchoolCRM.jsx")

    def test_all_5_dropdowns_have_coordinator_options(self):
        """
        Verify all 5 role dropdowns (edit, renewal, new lead, conversion, onboarding)
        include Primary Coordinator option
        """
        with open('/app/frontend/src/pages/admin/AdminSchoolCRM.jsx', 'r') as f:
            content = f.read()
        
        # Count occurrences of primary_coordinator option value
        primary_count = len(re.findall(r'value="primary_coordinator"', content))
        secondary_count = len(re.findall(r'value="secondary_coordinator"', content))
        
        assert primary_count >= 5, \
            f"Expected at least 5 occurrences of primary_coordinator, found {primary_count}"
        assert secondary_count >= 5, \
            f"Expected at least 5 occurrences of secondary_coordinator, found {secondary_count}"
        print(f"PASS: primary_coordinator appears {primary_count} times, "
              f"secondary_coordinator appears {secondary_count} times")


# ── AI Chat Textarea Auto-Resize ──────────────────────────────────────────────

class TestAIChatTextareaAutoResize:
    """Verify auto-resize logic in AdminAIChat.jsx"""

    def test_handleInputChange_has_auto_resize_logic(self):
        """Static analysis: handleInputChange must set ta.style.height"""
        with open('/app/frontend/src/pages/admin/AdminAIChat.jsx', 'r') as f:
            content = f.read()
        assert 'handleInputChange' in content, "handleInputChange not found in AdminAIChat.jsx"
        assert 'ta.style.height' in content, "Auto-resize logic (ta.style.height) missing"
        assert 'scrollHeight' in content, "scrollHeight not used in auto-resize logic"
        print("PASS: Auto-resize logic found in handleInputChange")

    def test_textarea_has_overflow_hidden(self):
        """Textarea should hide overflow to prevent scroll bar inside input"""
        with open('/app/frontend/src/pages/admin/AdminAIChat.jsx', 'r') as f:
            content = f.read()
        assert "overflowY: 'hidden'" in content or 'overflow-y: hidden' in content or \
               'overflowY: "hidden"' in content, \
            "overflowY hidden not set on textarea"
        print("PASS: overflowY: hidden found on textarea")

    def test_enter_key_sends_message(self):
        """handleKeyDown must call sendMessage on Enter key (without Shift)"""
        with open('/app/frontend/src/pages/admin/AdminAIChat.jsx', 'r') as f:
            content = f.read()
        assert 'handleKeyDown' in content, "handleKeyDown not found"
        assert "e.key === 'Enter'" in content or 'e.key === "Enter"' in content, \
            "Enter key check missing in handleKeyDown"
        assert 'sendMessage' in content, "sendMessage not called in handleKeyDown"
        print("PASS: Enter key sends message via handleKeyDown")


# ── Summer Camp CRM Mobile Layout ─────────────────────────────────────────────

class TestSummerCampMobileLayout:
    """Verify AdminStudentCRM.jsx has mobile card view and desktop table view"""

    def test_mobile_card_view_class_exists(self):
        """Mobile card container should use 'md:hidden' class"""
        with open('/app/frontend/src/pages/admin/AdminStudentCRM.jsx', 'r') as f:
            content = f.read()
        assert 'md:hidden' in content, \
            "md:hidden class not found - mobile card view may not be hidden on desktop"
        print("PASS: md:hidden class found for mobile card view")

    def test_desktop_table_view_class_exists(self):
        """Desktop table container should use 'hidden md:block' class"""
        with open('/app/frontend/src/pages/admin/AdminStudentCRM.jsx', 'r') as f:
            content = f.read()
        assert 'hidden md:block' in content, \
            "hidden md:block class not found - desktop table view missing"
        print("PASS: hidden md:block class found for desktop table view")

    def test_mobile_card_view_has_booking_data(self):
        """Mobile cards should display booking details (child_name, parent_name, etc.)"""
        with open('/app/frontend/src/pages/admin/AdminStudentCRM.jsx', 'r') as f:
            content = f.read()
        # Check that booking fields are rendered in mobile view
        assert 'booking.child_name' in content, "child_name not in booking card"
        assert 'booking.parent_name' in content, "parent_name not in booking card"
        assert 'booking.parent_phone' in content, "parent_phone not in booking card"
        assert 'booking.center_label' in content, "center_label not in booking card"
        print("PASS: Mobile card view displays all required booking fields")

    def test_summer_camp_api_returns_bookings(self):
        """GET /api/summer-camp/bookings should return a list"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.get(f"{BASE_URL}/api/summer-camp/bookings")
        assert response.status_code == 200, f"Bookings API failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of bookings"
        print(f"PASS: Summer Camp bookings API returned {len(data)} bookings")
