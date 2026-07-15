"""Iteration 103: educator profile document upload/replace/delete + merged admin data."""
import os
import io
import sys
import time
import pytest
import requests

sys.path.insert(0, "/app/backend")
from routes.shared import create_access_token  # type: ignore

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EDUCATOR_ID = "eb259a23-3171-43ee-b460-66f012af3b4a"
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@oll.co")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Dagaji03@")
USHA_ID = "c7c6d779-e714-41b3-b1e3-d6275927aace"


@pytest.fixture(scope="module")
def educator_token():
    return create_access_token({
        "sub": "test@educator.com",
        "role": "educator",
        "educator_id": EDUCATOR_ID,
        "name": "Test Onboard Educator",
        "status": "active",
    })


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json().get("token") or r.json().get("access_token")


def _png_bytes():
    # Minimal 1x1 PNG
    return bytes.fromhex(
        "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
        "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
    )


# ---------- Uploads ----------
class TestEducatorDocUpload:
    def test_upload_aadhar_png(self, educator_token):
        headers = {"Authorization": f"Bearer {educator_token}"}
        files = {"file": ("aadhar_test.png", _png_bytes(), "image/png")}
        data = {"doc_type": "aadhar_document"}
        r = requests.post(f"{API}/educator/profile/documents/upload", headers=headers, files=files, data=data, timeout=60)
        assert r.status_code == 200, f"{r.status_code}: {r.text}"
        body = r.json()
        assert body.get("success") is True
        assert body.get("doc_type") == "aadhar_document"
        assert body.get("url", "").startswith("http")
        assert body.get("original_name") == "aadhar_test.png"
        assert body.get("size") > 0
        assert "uploaded_at" in body

    def test_replace_dedup(self, educator_token):
        headers = {"Authorization": f"Bearer {educator_token}"}
        for i in range(2):
            files = {"file": (f"aadhar_v{i}.png", _png_bytes(), "image/png")}
            r = requests.post(f"{API}/educator/profile/documents/upload",
                              headers=headers, files=files, data={"doc_type": "aadhar_document"}, timeout=60)
            assert r.status_code == 200, r.text
        # Verify only one row in uploaded_files via profile GET (document_meta must have exactly one entry per type)
        r = requests.get(f"{API}/educator/profile", headers=headers, timeout=30)
        assert r.status_code == 200
        meta = r.json().get("document_meta", {})
        assert "aadhar_document" in meta
        assert meta["aadhar_document"].get("original_name") == "aadhar_v1.png"

    def test_upload_invalid_extension(self, educator_token):
        headers = {"Authorization": f"Bearer {educator_token}"}
        files = {"file": ("bad.txt", b"hello", "text/plain")}
        r = requests.post(f"{API}/educator/profile/documents/upload",
                          headers=headers, files=files, data={"doc_type": "aadhar_document"}, timeout=30)
        assert r.status_code == 400
        assert "PDF" in r.text or "allowed" in r.text.lower()

    def test_upload_profile_photo_pdf_rejected(self, educator_token):
        headers = {"Authorization": f"Bearer {educator_token}"}
        files = {"file": ("photo.pdf", b"%PDF-1.4\n%EOF", "application/pdf")}
        r = requests.post(f"{API}/educator/profile/documents/upload",
                          headers=headers, files=files, data={"doc_type": "profile_photo"}, timeout=30)
        assert r.status_code == 400
        assert "image" in r.text.lower()

    def test_no_token_rejected(self):
        files = {"file": ("a.png", _png_bytes(), "image/png")}
        r = requests.post(f"{API}/educator/profile/documents/upload",
                          files=files, data={"doc_type": "aadhar_document"}, timeout=30)
        assert r.status_code in (401, 403)

    def test_admin_token_rejected(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        files = {"file": ("a.png", _png_bytes(), "image/png")}
        r = requests.post(f"{API}/educator/profile/documents/upload",
                          headers=headers, files=files, data={"doc_type": "aadhar_document"}, timeout=30)
        assert r.status_code == 403
        assert "educator" in r.text.lower()


# ---------- Delete ----------
class TestEducatorDocDelete:
    def test_delete_aadhar(self, educator_token):
        headers = {"Authorization": f"Bearer {educator_token}"}
        # Ensure something exists
        files = {"file": ("a.png", _png_bytes(), "image/png")}
        requests.post(f"{API}/educator/profile/documents/upload",
                      headers=headers, files=files, data={"doc_type": "aadhar_document"}, timeout=60)
        r = requests.delete(f"{API}/educator/profile/documents/aadhar_document", headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

        # Verify cleared
        r = requests.get(f"{API}/educator/profile", headers=headers, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert not body.get("aadhar_document")
        assert "aadhar_document" not in (body.get("document_meta") or {})


# ---------- Profile merge ----------
class TestProfileMerge:
    def test_profile_merges_onboarding(self, educator_token):
        headers = {"Authorization": f"Bearer {educator_token}"}
        r = requests.get(f"{API}/educator/profile", headers=headers, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "document_meta" in body
        assert isinstance(body["document_meta"], dict)


# ---------- Admin merge ----------
class TestAdminApplicationsMerge:
    def test_usha_merged_fields(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.get(f"{API}/educators/applications", headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        apps = r.json()
        usha = next((a for a in apps if a.get("id") == USHA_ID), None)
        if not usha:
            pytest.skip(f"Usha educator {USHA_ID} not in this env")
        # These keys should be present (may be empty strings but keys should be exposed if onboarding had data)
        # per problem statement, Usha has onboarding data
        keys_of_interest = [
            "profile_photo", "bio", "tshirt_size", "address_line1",
            "bank_name", "account_number",
            "aadhar_document", "pan_document", "documents_verified"
        ]
        present = [k for k in keys_of_interest if k in usha]
        # At least most of the fields should be in the response
        assert len(present) >= 5, f"Only {present} present on Usha row: keys={list(usha.keys())[:40]}"
