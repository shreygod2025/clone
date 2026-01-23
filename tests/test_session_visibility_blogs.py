"""
Test Suite for P0 Session Visibility and P1 Blog CRUD Features
- P0: Student Session Visibility - GET /api/user/my-sessions/{phone}
- P0: Educator Session Visibility - GET /api/educator/my-sessions
- P1: Admin Blogs CRUD - GET/POST/PATCH/DELETE /api/blogs
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminAuth:
    """Admin authentication for protected endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@oll.co",
            "password": "Dagaji03@"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Auth headers for protected endpoints"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }


class TestStudentSessionVisibility(TestAdminAuth):
    """P0: Test student session visibility endpoint"""
    
    def test_get_user_sessions_endpoint_exists(self):
        """Test GET /api/user/my-sessions/{phone} endpoint exists"""
        # Use a test phone number
        response = requests.get(f"{BASE_URL}/api/user/my-sessions/9999999999")
        # Should return 200 even if no sessions found (returns empty array)
        assert response.status_code == 200, f"Endpoint returned {response.status_code}: {response.text}"
        data = response.json()
        assert "sessions" in data, "Response should have 'sessions' key"
        assert "student" in data, "Response should have 'student' key"
    
    def test_get_user_sessions_returns_correct_structure(self):
        """Test response structure for user sessions"""
        response = requests.get(f"{BASE_URL}/api/user/my-sessions/9999999999")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert isinstance(data["sessions"], list), "sessions should be a list"
        # student can be None if not found
        if data["student"]:
            assert "id" in data["student"] or data["student"] is None
    
    def test_get_user_sessions_no_auth_required(self):
        """Test that user sessions endpoint doesn't require auth"""
        # This endpoint should be public (phone-based OTP login)
        response = requests.get(f"{BASE_URL}/api/user/my-sessions/1234567890")
        # Should not return 401/403
        assert response.status_code != 401, "Endpoint should not require auth"
        assert response.status_code != 403, "Endpoint should not require auth"
        assert response.status_code == 200


class TestEducatorSessionVisibility(TestAdminAuth):
    """P0: Test educator session visibility endpoint"""
    
    def test_get_educator_sessions_requires_auth(self, auth_headers):
        """Test GET /api/educator/my-sessions requires authentication"""
        # Without auth
        response = requests.get(f"{BASE_URL}/api/educator/my-sessions")
        assert response.status_code in [401, 403], "Endpoint should require auth"
    
    def test_get_educator_sessions_with_auth(self, auth_headers):
        """Test GET /api/educator/my-sessions with valid auth"""
        response = requests.get(f"{BASE_URL}/api/educator/my-sessions", headers=auth_headers)
        # May return 403 if admin is not an educator, or 200 with sessions
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "Response should be a list of sessions"


class TestBlogsCRUD(TestAdminAuth):
    """P1: Test Admin Blogs CRUD operations"""
    
    @pytest.fixture(scope="class")
    def test_blog_id(self, auth_headers):
        """Create a test blog and return its ID for other tests"""
        unique_slug = f"test-blog-{uuid.uuid4().hex[:8]}"
        blog_data = {
            "title": "TEST_Blog Title for Testing",
            "slug": unique_slug,
            "excerpt": "This is a test blog excerpt",
            "content": "This is the full content of the test blog. It contains multiple paragraphs.",
            "cover_image": "https://example.com/test-image.jpg",
            "category": "students",
            "author": "Test Author",
            "is_published": False
        }
        
        response = requests.post(f"{BASE_URL}/api/blogs", json=blog_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create test blog: {response.text}"
        data = response.json()
        assert "id" in data, "Created blog should have an ID"
        return data["id"]
    
    def test_get_blogs_list(self, auth_headers):
        """Test GET /api/blogs returns list of blogs"""
        response = requests.get(f"{BASE_URL}/api/blogs?published_only=false", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get blogs: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_blogs_public_only_published(self):
        """Test GET /api/blogs (public) returns only published blogs"""
        response = requests.get(f"{BASE_URL}/api/blogs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned blogs should be published
        for blog in data:
            assert blog.get("is_published") == True, f"Unpublished blog returned: {blog.get('title')}"
    
    def test_create_blog(self, auth_headers):
        """Test POST /api/blogs creates a new blog"""
        unique_slug = f"test-create-{uuid.uuid4().hex[:8]}"
        blog_data = {
            "title": "TEST_New Blog Creation Test",
            "slug": unique_slug,
            "excerpt": "Testing blog creation",
            "content": "Full content for the new blog",
            "cover_image": "",
            "category": "parents",
            "author": "OLL Team",
            "is_published": True
        }
        
        response = requests.post(f"{BASE_URL}/api/blogs", json=blog_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create blog: {response.text}"
        data = response.json()
        
        # Verify created blog data
        assert data["title"] == blog_data["title"]
        assert data["slug"] == blog_data["slug"]
        assert data["category"] == blog_data["category"]
        assert data["is_published"] == True
        assert "id" in data
        
        # Cleanup - delete the test blog
        requests.delete(f"{BASE_URL}/api/blogs/{data['id']}", headers=auth_headers)
    
    def test_update_blog(self, auth_headers, test_blog_id):
        """Test PATCH /api/blogs/{id} updates a blog"""
        update_data = {
            "title": "TEST_Updated Blog Title",
            "excerpt": "Updated excerpt content",
            "is_published": True
        }
        
        response = requests.patch(f"{BASE_URL}/api/blogs/{test_blog_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to update blog: {response.text}"
        data = response.json()
        
        # Verify updates
        assert data["title"] == update_data["title"]
        assert data["excerpt"] == update_data["excerpt"]
        assert data["is_published"] == True
    
    def test_get_blog_by_slug(self, auth_headers, test_blog_id):
        """Test GET /api/blogs/{slug} returns specific blog"""
        # First get the blog to know its slug
        response = requests.get(f"{BASE_URL}/api/blogs?published_only=false", headers=auth_headers)
        blogs = response.json()
        test_blog = next((b for b in blogs if b["id"] == test_blog_id), None)
        
        if test_blog:
            slug = test_blog["slug"]
            response = requests.get(f"{BASE_URL}/api/blogs/{slug}")
            # May be 200 if published, or 404 if not found
            if test_blog.get("is_published"):
                assert response.status_code == 200
                data = response.json()
                assert data["slug"] == slug
    
    def test_delete_blog(self, auth_headers, test_blog_id):
        """Test DELETE /api/blogs/{id} deletes a blog"""
        response = requests.delete(f"{BASE_URL}/api/blogs/{test_blog_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to delete blog: {response.text}"
        
        # Verify deletion - blog should not be in list
        response = requests.get(f"{BASE_URL}/api/blogs?published_only=false", headers=auth_headers)
        blogs = response.json()
        deleted_blog = next((b for b in blogs if b["id"] == test_blog_id), None)
        assert deleted_blog is None, "Blog should be deleted"
    
    def test_blog_categories(self, auth_headers):
        """Test that blogs support all expected categories"""
        categories = ['students', 'parents', 'educators', 'schools']
        
        for category in categories:
            response = requests.get(f"{BASE_URL}/api/blogs?category={category}&published_only=false", headers=auth_headers)
            assert response.status_code == 200, f"Failed to filter by category {category}"


class TestBlogsPublicAccess:
    """Test public access to blogs"""
    
    def test_public_blogs_page_data(self):
        """Test that public /api/blogs endpoint works"""
        response = requests.get(f"{BASE_URL}/api/blogs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestCleanup(TestAdminAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_blogs(self, auth_headers):
        """Delete all TEST_ prefixed blogs"""
        response = requests.get(f"{BASE_URL}/api/blogs?published_only=false", headers=auth_headers)
        if response.status_code == 200:
            blogs = response.json()
            for blog in blogs:
                if blog.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/blogs/{blog['id']}", headers=auth_headers)
        assert True  # Cleanup always passes


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
