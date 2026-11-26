"""
API Route Tests
"""
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json().get("status") == "healthy"

def test_schools_protected_endpoint_rejects_unauthenticated():
    response = client.get("/api/schools/names")
    # Verifies permission gate & security middleware are functioning
    assert response.status_code in [401, 403]
