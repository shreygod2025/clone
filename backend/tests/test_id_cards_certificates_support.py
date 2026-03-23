"""
Tests for:
1. ID Card PDF generation endpoint
2. Certificate PDF generation endpoint
3. Support Insights endpoint (overdue, resolution time, status breakdown)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
EDUCATOR_ID = "eb259a23-3171-43ee-b460-66f012af3b4a"

@pytest.fixture(scope="module")
def auth_token():
    """Get auth token using admin credentials"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@oll.co",
        "password": "Dagaji03@"
    })
    if resp.status_code == 200:
        data = resp.json()
        token = data.get('access_token') or data.get('token')
        assert token, f"No token in response: {data}"
        return token
    pytest.skip(f"Admin login failed: {resp.status_code} {resp.text}")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return auth headers dict"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestIDCardPDF:
    """Tests for ID Card PDF generation"""

    def test_download_id_card_returns_200(self, auth_headers):
        """ID card endpoint should return 200 for active educator"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{EDUCATOR_ID}/download-id-card",
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        print(f"PASS: ID card endpoint returned 200")

    def test_download_id_card_content_type_pdf(self, auth_headers):
        """ID card should return PDF content type"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{EDUCATOR_ID}/download-id-card",
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        content_type = resp.headers.get('content-type', '')
        assert 'pdf' in content_type.lower() or 'application/octet-stream' in content_type.lower(), \
            f"Expected PDF content type, got: {content_type}"
        print(f"PASS: Content-Type is {content_type}")

    def test_download_id_card_file_size_gt_20kb(self, auth_headers):
        """ID card PDF should be > 20KB (indicating OLL logo is embedded)"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{EDUCATOR_ID}/download-id-card",
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        size_kb = len(resp.content) / 1024
        print(f"ID Card PDF size: {size_kb:.2f} KB")
        assert size_kb > 20, f"Expected PDF > 20KB (with OLL logo), got {size_kb:.2f} KB"
        print(f"PASS: ID Card PDF size {size_kb:.2f} KB > 20 KB")

    def test_download_id_card_starts_with_pdf_header(self, auth_headers):
        """PDF bytes should start with %PDF magic bytes"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{EDUCATOR_ID}/download-id-card",
            headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.content[:4] == b'%PDF', f"File does not start with %PDF header"
        print(f"PASS: ID Card file has valid PDF header")

    def test_download_id_card_invalid_educator_returns_404(self, auth_headers):
        """Invalid educator ID should return 404"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/nonexistent-id-99999/download-id-card",
            headers=auth_headers
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print(f"PASS: Invalid educator ID returns 404")


class TestCertificatePDF:
    """Tests for Certificate PDF generation"""

    def test_download_certificate_returns_200(self, auth_headers):
        """Certificate endpoint should return 200 for active educator"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{EDUCATOR_ID}/download-certificate",
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        print(f"PASS: Certificate endpoint returned 200")

    def test_download_certificate_content_type_pdf(self, auth_headers):
        """Certificate should return PDF content type"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{EDUCATOR_ID}/download-certificate",
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        content_type = resp.headers.get('content-type', '')
        assert 'pdf' in content_type.lower() or 'application/octet-stream' in content_type.lower(), \
            f"Expected PDF content type, got: {content_type}"
        print(f"PASS: Content-Type is {content_type}")

    def test_download_certificate_file_size_gt_100kb(self, auth_headers):
        """Certificate PDF should be > 100KB (indicating signature image is present)"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{EDUCATOR_ID}/download-certificate",
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        size_kb = len(resp.content) / 1024
        print(f"Certificate PDF size: {size_kb:.2f} KB")
        assert size_kb > 100, f"Expected PDF > 100KB (with signature), got {size_kb:.2f} KB"
        print(f"PASS: Certificate PDF size {size_kb:.2f} KB > 100 KB")

    def test_download_certificate_starts_with_pdf_header(self, auth_headers):
        """Certificate bytes should start with %PDF magic bytes"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/{EDUCATOR_ID}/download-certificate",
            headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.content[:4] == b'%PDF', f"File does not start with %PDF header"
        print(f"PASS: Certificate file has valid PDF header")

    def test_download_certificate_invalid_educator_returns_404(self, auth_headers):
        """Invalid educator ID should return 404"""
        resp = requests.get(
            f"{BASE_URL}/api/educator/onboarding/nonexistent-id-99999/download-certificate",
            headers=auth_headers
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print(f"PASS: Invalid educator ID returns 404")


class TestSupportInsights:
    """Tests for Support Insights endpoint"""

    def test_support_insights_returns_200(self, auth_headers):
        """Support insights endpoint should return 200"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        print(f"PASS: Support insights returned 200")

    def test_support_insights_has_overdue_field(self, auth_headers):
        """Response must contain 'overdue' field"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert 'overdue' in data, f"'overdue' field missing from response. Keys: {list(data.keys())}"
        print(f"PASS: 'overdue' field present with value: {data['overdue']}")

    def test_support_insights_overdue_gt_zero(self, auth_headers):
        """Overdue count should be > 0 (queries older than 48h with open/in_progress status)"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        overdue = data.get('overdue', 0)
        print(f"Overdue count: {overdue}")
        assert overdue > 0, f"Expected overdue > 0, got {overdue}"
        print(f"PASS: Overdue count is {overdue}")

    def test_support_insights_avg_resolution_time_gt_zero(self, auth_headers):
        """avg_resolution_time_hours should be > 0"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        avg_time = data.get('avg_resolution_time_hours', 0)
        print(f"Avg resolution time: {avg_time} hours")
        assert avg_time > 0, f"Expected avg_resolution_time_hours > 0, got {avg_time}"
        print(f"PASS: avg_resolution_time_hours is {avg_time}")

    def test_support_insights_status_breakdown_not_all_zeros(self, auth_headers):
        """status_breakdown should have actual counts, not all zeros"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        status_breakdown = data.get('status_breakdown', [])
        assert len(status_breakdown) > 0, f"status_breakdown is empty"
        total = sum(item.get('count', 0) for item in status_breakdown)
        print(f"Status breakdown: {status_breakdown}")
        assert total > 0, f"All status_breakdown counts are 0: {status_breakdown}"
        print(f"PASS: status_breakdown total count is {total}")

    def test_support_insights_has_required_fields(self, auth_headers):
        """Response should contain all required fields"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        required_fields = ['total_queries', 'resolved', 'pending', 'overdue',
                           'avg_resolution_time_hours', 'status_breakdown', 'query_types']
        for field in required_fields:
            assert field in data, f"Missing required field: '{field}' in response"
        print(f"PASS: All required fields present: {required_fields}")

    def test_support_insights_total_queries_gt_zero(self, auth_headers):
        """total_queries should be > 0 (data exists)"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/reports/support-insights",
            headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        total = data.get('total_queries', 0)
        print(f"Total queries: {total}")
        assert total > 0, f"Expected total_queries > 0, got {total}"
        print(f"PASS: total_queries is {total}")
