"""
Test file for Users & Roles RBAC feature
Tests:
- Roles CRUD endpoints
- Team Users CRUD endpoints with role assignment
- Role permissions and system role protection
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://oll-student-pay.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


class TestUsersAndRoles:
    """Test Users & Roles RBAC feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        token = response.json().get("access_token")
        assert token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_role_ids = []
        self.created_user_ids = []
        
        yield
        
        # Cleanup - delete test data
        for user_id in self.created_user_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/team-users/{user_id}")
            except:
                pass
        
        for role_id in self.created_role_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/roles/{role_id}")
            except:
                pass
    
    # ==================
    # ROLES TESTS
    # ==================
    
    def test_get_roles(self):
        """Test GET /api/roles - should return list of roles"""
        response = self.session.get(f"{BASE_URL}/api/roles")
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        
        roles = response.json()
        assert isinstance(roles, list), "Roles should be a list"
        print(f"✓ GET /api/roles returned {len(roles)} roles")
    
    def test_create_role(self):
        """Test POST /api/roles - create a new role"""
        unique_id = str(uuid.uuid4())[:8]
        role_data = {
            "name": f"TEST_Role_{unique_id}",
            "description": "Test role for automated testing",
            "permissions": ["dashboard", "students", "support"],
            "is_system": False,
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/roles", json=role_data)
        assert response.status_code == 200, f"Failed to create role: {response.text}"
        
        created_role = response.json()
        assert created_role.get("name") == role_data["name"], "Role name mismatch"
        assert created_role.get("permissions") == role_data["permissions"], "Permissions mismatch"
        assert "id" in created_role, "Role should have an ID"
        
        self.created_role_ids.append(created_role["id"])
        print(f"✓ POST /api/roles created role: {created_role['name']}")
        
        return created_role
    
    def test_create_duplicate_role_fails(self):
        """Test POST /api/roles - duplicate role name should fail"""
        unique_id = str(uuid.uuid4())[:8]
        role_data = {
            "name": f"TEST_DuplicateRole_{unique_id}",
            "description": "First role",
            "permissions": ["dashboard"],
            "is_system": False
        }
        
        # Create first role
        response1 = self.session.post(f"{BASE_URL}/api/roles", json=role_data)
        assert response1.status_code == 200, f"Failed to create first role: {response1.text}"
        self.created_role_ids.append(response1.json()["id"])
        
        # Try to create duplicate
        response2 = self.session.post(f"{BASE_URL}/api/roles", json=role_data)
        assert response2.status_code == 400, f"Duplicate role should fail with 400, got {response2.status_code}"
        print("✓ POST /api/roles correctly rejects duplicate role names")
    
    def test_update_role(self):
        """Test PATCH /api/roles/{role_id} - update role permissions"""
        # First create a role
        unique_id = str(uuid.uuid4())[:8]
        role_data = {
            "name": f"TEST_UpdateRole_{unique_id}",
            "description": "Role to update",
            "permissions": ["dashboard"],
            "is_system": False
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/roles", json=role_data)
        assert create_response.status_code == 200
        role_id = create_response.json()["id"]
        self.created_role_ids.append(role_id)
        
        # Update the role
        update_data = {
            "description": "Updated description",
            "permissions": ["dashboard", "students", "educators"]
        }
        
        update_response = self.session.patch(f"{BASE_URL}/api/roles/{role_id}", json=update_data)
        assert update_response.status_code == 200, f"Failed to update role: {update_response.text}"
        
        updated_role = update_response.json()
        assert updated_role.get("description") == "Updated description", "Description not updated"
        assert "educators" in updated_role.get("permissions", []), "Permissions not updated"
        print(f"✓ PATCH /api/roles/{role_id} updated role successfully")
    
    def test_delete_non_system_role(self):
        """Test DELETE /api/roles/{role_id} - delete non-system role"""
        # Create a role to delete
        unique_id = str(uuid.uuid4())[:8]
        role_data = {
            "name": f"TEST_DeleteRole_{unique_id}",
            "description": "Role to delete",
            "permissions": ["dashboard"],
            "is_system": False
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/roles", json=role_data)
        assert create_response.status_code == 200
        role_id = create_response.json()["id"]
        
        # Delete the role
        delete_response = self.session.delete(f"{BASE_URL}/api/roles/{role_id}")
        assert delete_response.status_code == 200, f"Failed to delete role: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/roles")
        roles = get_response.json()
        role_ids = [r.get("id") for r in roles]
        assert role_id not in role_ids, "Role should be deleted"
        print(f"✓ DELETE /api/roles/{role_id} deleted role successfully")
    
    def test_cannot_delete_system_role(self):
        """Test DELETE /api/roles/{role_id} - system roles cannot be deleted"""
        # Get existing roles to find a system role
        response = self.session.get(f"{BASE_URL}/api/roles")
        roles = response.json()
        
        system_roles = [r for r in roles if r.get("is_system") == True]
        
        if not system_roles:
            # Create a system role for testing
            unique_id = str(uuid.uuid4())[:8]
            role_data = {
                "name": f"TEST_SystemRole_{unique_id}",
                "description": "System role",
                "permissions": ["dashboard"],
                "is_system": True
            }
            create_response = self.session.post(f"{BASE_URL}/api/roles", json=role_data)
            if create_response.status_code == 200:
                system_role_id = create_response.json()["id"]
                self.created_role_ids.append(system_role_id)
            else:
                pytest.skip("Could not create system role for testing")
        else:
            system_role_id = system_roles[0]["id"]
        
        # Try to delete system role
        delete_response = self.session.delete(f"{BASE_URL}/api/roles/{system_role_id}")
        assert delete_response.status_code == 400, f"System role deletion should fail with 400, got {delete_response.status_code}"
        print("✓ DELETE /api/roles correctly prevents deletion of system roles")
    
    # ==================
    # TEAM USERS TESTS
    # ==================
    
    def test_get_team_users(self):
        """Test GET /api/team-users - should return list of team users"""
        response = self.session.get(f"{BASE_URL}/api/team-users")
        assert response.status_code == 200, f"Failed to get team users: {response.text}"
        
        users = response.json()
        assert isinstance(users, list), "Team users should be a list"
        print(f"✓ GET /api/team-users returned {len(users)} users")
    
    def test_create_team_user_with_role(self):
        """Test POST /api/team-users - create user with role assignment"""
        # First create a role
        unique_id = str(uuid.uuid4())[:8]
        role_data = {
            "name": f"TEST_UserRole_{unique_id}",
            "description": "Role for user test",
            "permissions": ["dashboard", "students"],
            "is_system": False
        }
        
        role_response = self.session.post(f"{BASE_URL}/api/roles", json=role_data)
        assert role_response.status_code == 200
        role_id = role_response.json()["id"]
        self.created_role_ids.append(role_id)
        
        # Create user with role
        user_data = {
            "name": f"TEST User {unique_id}",
            "email": f"test_user_{unique_id}@test.com",
            "username": f"test_user_{unique_id}",
            "password": "TestPassword123!",
            "role_id": role_id,
            "permissions": ["dashboard", "students"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/team-users", json=user_data)
        assert response.status_code == 200, f"Failed to create team user: {response.text}"
        
        result = response.json()
        assert "id" in result, "User should have an ID"
        assert result.get("username") == user_data["username"], "Username mismatch"
        
        self.created_user_ids.append(result["id"])
        print(f"✓ POST /api/team-users created user: {user_data['username']} with role_id: {role_id}")
        
        return result
    
    def test_create_user_duplicate_username_fails(self):
        """Test POST /api/team-users - duplicate username should fail"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "name": f"TEST Duplicate User {unique_id}",
            "email": f"test_dup1_{unique_id}@test.com",
            "username": f"test_dup_{unique_id}",
            "password": "TestPassword123!",
            "role_id": "",
            "permissions": ["dashboard"]
        }
        
        # Create first user
        response1 = self.session.post(f"{BASE_URL}/api/team-users", json=user_data)
        assert response1.status_code == 200, f"Failed to create first user: {response1.text}"
        self.created_user_ids.append(response1.json()["id"])
        
        # Try to create duplicate username
        user_data["email"] = f"test_dup2_{unique_id}@test.com"  # Different email
        response2 = self.session.post(f"{BASE_URL}/api/team-users", json=user_data)
        assert response2.status_code == 400, f"Duplicate username should fail with 400, got {response2.status_code}"
        print("✓ POST /api/team-users correctly rejects duplicate usernames")
    
    def test_create_user_duplicate_email_fails(self):
        """Test POST /api/team-users - duplicate email should fail"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "name": f"TEST Email User {unique_id}",
            "email": f"test_email_{unique_id}@test.com",
            "username": f"test_email1_{unique_id}",
            "password": "TestPassword123!",
            "role_id": "",
            "permissions": ["dashboard"]
        }
        
        # Create first user
        response1 = self.session.post(f"{BASE_URL}/api/team-users", json=user_data)
        assert response1.status_code == 200, f"Failed to create first user: {response1.text}"
        self.created_user_ids.append(response1.json()["id"])
        
        # Try to create duplicate email
        user_data["username"] = f"test_email2_{unique_id}"  # Different username
        response2 = self.session.post(f"{BASE_URL}/api/team-users", json=user_data)
        assert response2.status_code == 400, f"Duplicate email should fail with 400, got {response2.status_code}"
        print("✓ POST /api/team-users correctly rejects duplicate emails")
    
    def test_update_team_user_role(self):
        """Test PATCH /api/team-users/{user_id} - update user's role"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create two roles
        role1_data = {
            "name": f"TEST_Role1_{unique_id}",
            "permissions": ["dashboard"],
            "is_system": False
        }
        role2_data = {
            "name": f"TEST_Role2_{unique_id}",
            "permissions": ["dashboard", "students", "educators"],
            "is_system": False
        }
        
        role1_response = self.session.post(f"{BASE_URL}/api/roles", json=role1_data)
        role2_response = self.session.post(f"{BASE_URL}/api/roles", json=role2_data)
        assert role1_response.status_code == 200 and role2_response.status_code == 200
        
        role1_id = role1_response.json()["id"]
        role2_id = role2_response.json()["id"]
        self.created_role_ids.extend([role1_id, role2_id])
        
        # Create user with role1
        user_data = {
            "name": f"TEST Update User {unique_id}",
            "email": f"test_update_{unique_id}@test.com",
            "username": f"test_update_{unique_id}",
            "password": "TestPassword123!",
            "role_id": role1_id,
            "permissions": ["dashboard"]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/team-users", json=user_data)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        self.created_user_ids.append(user_id)
        
        # Update user to role2
        update_response = self.session.patch(f"{BASE_URL}/api/team-users/{user_id}", json={
            "role_id": role2_id,
            "permissions": ["dashboard", "students", "educators"]
        })
        assert update_response.status_code == 200, f"Failed to update user: {update_response.text}"
        
        # Verify update
        get_response = self.session.get(f"{BASE_URL}/api/team-users/{user_id}")
        assert get_response.status_code == 200
        updated_user = get_response.json()
        assert updated_user.get("role_id") == role2_id, "Role ID not updated"
        print(f"✓ PATCH /api/team-users/{user_id} updated user role successfully")
    
    def test_toggle_user_status(self):
        """Test PATCH /api/team-users/{user_id} - toggle active/inactive status"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create user
        user_data = {
            "name": f"TEST Status User {unique_id}",
            "email": f"test_status_{unique_id}@test.com",
            "username": f"test_status_{unique_id}",
            "password": "TestPassword123!",
            "role_id": "",
            "permissions": ["dashboard"]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/team-users", json=user_data)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        self.created_user_ids.append(user_id)
        
        # Deactivate user
        deactivate_response = self.session.patch(f"{BASE_URL}/api/team-users/{user_id}", json={
            "is_active": False
        })
        assert deactivate_response.status_code == 200
        
        # Verify deactivation
        get_response = self.session.get(f"{BASE_URL}/api/team-users/{user_id}")
        assert get_response.json().get("is_active") == False, "User should be inactive"
        
        # Reactivate user
        activate_response = self.session.patch(f"{BASE_URL}/api/team-users/{user_id}", json={
            "is_active": True
        })
        assert activate_response.status_code == 200
        
        # Verify activation
        get_response2 = self.session.get(f"{BASE_URL}/api/team-users/{user_id}")
        assert get_response2.json().get("is_active") == True, "User should be active"
        print(f"✓ PATCH /api/team-users/{user_id} toggle status works correctly")
    
    def test_delete_team_user(self):
        """Test DELETE /api/team-users/{user_id} - delete user"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create user
        user_data = {
            "name": f"TEST Delete User {unique_id}",
            "email": f"test_delete_{unique_id}@test.com",
            "username": f"test_delete_{unique_id}",
            "password": "TestPassword123!",
            "role_id": "",
            "permissions": ["dashboard"]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/team-users", json=user_data)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Delete user
        delete_response = self.session.delete(f"{BASE_URL}/api/team-users/{user_id}")
        assert delete_response.status_code == 200, f"Failed to delete user: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/team-users/{user_id}")
        assert get_response.status_code == 404, "Deleted user should return 404"
        print(f"✓ DELETE /api/team-users/{user_id} deleted user successfully")
    
    def test_cannot_delete_role_with_assigned_users(self):
        """Test DELETE /api/roles/{role_id} - cannot delete role with users assigned"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create role
        role_data = {
            "name": f"TEST_AssignedRole_{unique_id}",
            "permissions": ["dashboard"],
            "is_system": False
        }
        
        role_response = self.session.post(f"{BASE_URL}/api/roles", json=role_data)
        assert role_response.status_code == 200
        role_id = role_response.json()["id"]
        self.created_role_ids.append(role_id)
        
        # Create user with this role
        user_data = {
            "name": f"TEST Assigned User {unique_id}",
            "email": f"test_assigned_{unique_id}@test.com",
            "username": f"test_assigned_{unique_id}",
            "password": "TestPassword123!",
            "role_id": role_id,
            "permissions": ["dashboard"]
        }
        
        user_response = self.session.post(f"{BASE_URL}/api/team-users", json=user_data)
        assert user_response.status_code == 200
        user_id = user_response.json()["id"]
        self.created_user_ids.append(user_id)
        
        # Try to delete role with assigned user
        delete_response = self.session.delete(f"{BASE_URL}/api/roles/{role_id}")
        assert delete_response.status_code == 400, f"Should not be able to delete role with assigned users, got {delete_response.status_code}"
        print("✓ DELETE /api/roles correctly prevents deletion of roles with assigned users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
