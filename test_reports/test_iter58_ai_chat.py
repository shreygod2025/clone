"""
Backend tests for AI Chat feature - Iteration 58
Tests: POST /api/ai-chat/message, GET /api/ai-chat/sessions, GET /api/ai-chat/history/{id},
       DELETE /api/ai-chat/session/{id}
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@oll.co",
        "password": "Dagaji03@"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json().get("access_token")

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestAIChatSessions:
    """Tests for GET /api/ai-chat/sessions"""

    def test_list_sessions_authenticated(self, headers):
        """Sessions endpoint returns 200 with valid auth"""
        resp = requests.get(f"{BASE_URL}/api/ai-chat/sessions", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "sessions" in data, "Response missing 'sessions' key"
        assert isinstance(data["sessions"], list), "'sessions' should be a list"
        print(f"PASS: Sessions endpoint returned {len(data['sessions'])} sessions")

    def test_list_sessions_unauthenticated(self):
        """Sessions endpoint requires auth"""
        resp = requests.get(f"{BASE_URL}/api/ai-chat/sessions")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: Sessions endpoint properly requires authentication")

    def test_sessions_response_structure(self, headers):
        """Sessions have correct structure"""
        resp = requests.get(f"{BASE_URL}/api/ai-chat/sessions", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        sessions = data["sessions"]
        if sessions:
            s = sessions[0]
            assert "session_id" in s, "Session missing session_id"
            assert "updated_at" in s, "Session missing updated_at"
            assert "messages" in s, "Session missing messages"
            print(f"PASS: Session structure valid - id:{s['session_id']}, updated:{s['updated_at']}")
        else:
            print("PASS: No sessions yet (empty list is valid)")


class TestAIChatMessage:
    """Tests for POST /api/ai-chat/message"""
    created_session_id = None

    def test_send_message_empty(self, headers):
        """Empty message returns 400"""
        resp = requests.post(f"{BASE_URL}/api/ai-chat/message",
                             json={"session_id": "test-session", "message": ""},
                             headers=headers)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print("PASS: Empty message correctly returns 400")

    def test_send_message_unauthenticated(self):
        """Message endpoint requires auth"""
        resp = requests.post(f"{BASE_URL}/api/ai-chat/message",
                             json={"session_id": "test", "message": "hello"})
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: Message endpoint properly requires authentication")

    def test_send_simple_message(self, headers):
        """Send a simple greeting and get response"""
        session_id = f"test-{int(time.time())}-pytest"
        resp = requests.post(f"{BASE_URL}/api/ai-chat/message",
                             json={"session_id": session_id, "message": "Hello, what can you do?"},
                             headers=headers,
                             timeout=45)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "session_id" in data, "Response missing session_id"
        assert "message" in data, "Response missing message"
        assert "actions" in data, "Response missing actions"
        assert isinstance(data["actions"], list), "actions should be a list"
        assert len(data["message"]) > 0, "Response message should not be empty"
        TestAIChatMessage.created_session_id = session_id
        print(f"PASS: Simple message sent, got response: {data['message'][:80]}...")

    def test_send_message_creates_session(self, headers):
        """Sending a message creates/updates a session"""
        session_id = f"test-session-{int(time.time())}-new"
        resp = requests.post(f"{BASE_URL}/api/ai-chat/message",
                             json={"session_id": session_id, "message": "Show me all leads"},
                             headers=headers,
                             timeout=45)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["session_id"] == session_id, "session_id mismatch"
        print(f"PASS: Message creates session with id: {session_id}")
        TestAIChatMessage.created_session_id = session_id

    def test_add_note_action(self, headers):
        """Test add note CRM action"""
        session_id = f"test-note-{int(time.time())}"
        resp = requests.post(f"{BASE_URL}/api/ai-chat/message",
                             json={
                                 "session_id": session_id,
                                 "message": "Add a note to Sudarshan Daga School: pytest test note"
                             },
                             headers=headers,
                             timeout=60)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "message" in data
        assert "actions" in data
        print(f"PASS: Add note message sent. Response: {data['message'][:100]}")
        # Check if action was executed
        if data.get("actions"):
            action = data["actions"][0]
            print(f"  Action type: {action.get('type')}")
            print(f"  Execution status: {action.get('execution', {}).get('status')}")
            if action.get("type") == "add_note":
                exec_status = action.get("execution", {}).get("status")
                assert exec_status in ["success", "error"], f"Unexpected exec status: {exec_status}"
                print(f"  Note action execution: {exec_status} - {action.get('execution', {}).get('detail')}")


class TestAIChatHistory:
    """Tests for GET /api/ai-chat/history/{session_id}"""

    def test_get_history_valid_session(self, headers):
        """Get history for a real session"""
        # First get sessions list
        sessions_resp = requests.get(f"{BASE_URL}/api/ai-chat/sessions", headers=headers)
        assert sessions_resp.status_code == 200
        sessions = sessions_resp.json()["sessions"]
        if not sessions:
            pytest.skip("No sessions available to test history")
        
        sid = sessions[0]["session_id"]
        resp = requests.get(f"{BASE_URL}/api/ai-chat/history/{sid}", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "messages" in data, "Response missing 'messages'"
        assert isinstance(data["messages"], list), "'messages' should be a list"
        print(f"PASS: History for session {sid}: {len(data['messages'])} messages")

    def test_get_history_nonexistent_session(self, headers):
        """History for non-existent session returns empty messages"""
        resp = requests.get(f"{BASE_URL}/api/ai-chat/history/nonexistent-session-12345", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["messages"] == [], f"Expected empty messages, got {data['messages']}"
        print("PASS: Non-existent session returns empty messages list")

    def test_get_history_unauthenticated(self):
        """History endpoint requires auth"""
        resp = requests.get(f"{BASE_URL}/api/ai-chat/history/some-session")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: History endpoint properly requires authentication")

    def test_history_message_structure(self, headers):
        """Messages in history have correct structure"""
        sessions_resp = requests.get(f"{BASE_URL}/api/ai-chat/sessions", headers=headers)
        sessions = sessions_resp.json()["sessions"]
        if not sessions:
            pytest.skip("No sessions available")
        
        sid = sessions[0]["session_id"]
        resp = requests.get(f"{BASE_URL}/api/ai-chat/history/{sid}", headers=headers)
        data = resp.json()
        messages = data["messages"]
        if messages:
            msg = messages[0]
            assert "role" in msg, "Message missing 'role'"
            assert "content" in msg, "Message missing 'content'"
            assert msg["role"] in ["user", "assistant"], f"Invalid role: {msg['role']}"
            print(f"PASS: Message structure valid. role={msg['role']}, content={msg['content'][:50]}")
        else:
            print("PASS: Empty messages list (valid)")


class TestAIChatDelete:
    """Tests for DELETE /api/ai-chat/session/{session_id}"""

    def test_delete_nonexistent_session(self, headers):
        """Deleting a non-existent session should succeed gracefully"""
        resp = requests.delete(f"{BASE_URL}/api/ai-chat/session/nonexistent-del-test", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True
        print("PASS: Delete non-existent session returns success")

    def test_delete_session_and_verify(self, headers):
        """Create a session, delete it, verify it's gone"""
        # Create session by sending message
        session_id = f"test-delete-{int(time.time())}"
        resp = requests.post(f"{BASE_URL}/api/ai-chat/message",
                             json={"session_id": session_id, "message": "Hi"},
                             headers=headers,
                             timeout=45)
        if resp.status_code != 200:
            pytest.skip(f"Could not create test session: {resp.status_code}")

        # Delete the session
        del_resp = requests.delete(f"{BASE_URL}/api/ai-chat/session/{session_id}", headers=headers)
        assert del_resp.status_code == 200, f"Delete failed: {del_resp.status_code}: {del_resp.text}"
        assert del_resp.json().get("success") is True

        # Verify it's gone from history
        hist_resp = requests.get(f"{BASE_URL}/api/ai-chat/history/{session_id}", headers=headers)
        data = hist_resp.json()
        assert data["messages"] == [], f"Session should be gone but got messages: {data['messages']}"
        print(f"PASS: Session {session_id} created, deleted, and verified removed")

    def test_delete_unauthenticated(self):
        """Delete endpoint requires auth"""
        resp = requests.delete(f"{BASE_URL}/api/ai-chat/session/some-session")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: Delete endpoint properly requires authentication")
