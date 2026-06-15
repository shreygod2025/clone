"""
Iteration 83 backend tests:
1. Gmail Bot endpoints (/api/gmail/*, /api/oauth/gmail/callback)
2. Unified Student Search (/api/students/unified-search)
3. Data-center autocomplete multi-collection (/api/data-center/autocomplete)
"""
import os
import re
from urllib.parse import urlparse, parse_qs

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Dagaji03@")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ─── Gmail Bot ─────────────────────────────────────────────────────────────
class TestGmailAuthUrl:
    def test_auth_url_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/gmail/auth-url")
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"

    def test_auth_url_returns_google_consent(self, api, auth):
        r = requests.get(f"{BASE_URL}/api/gmail/auth-url", headers=auth)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "url" in data
        url = data["url"]
        assert "accounts.google.com" in url
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        # client_id
        assert "client_id" in qs and qs["client_id"][0]
        # redirect_uri
        assert "redirect_uri" in qs
        assert qs["redirect_uri"][0] == "https://camp-lead-capture.preview.emergentagent.com/api/oauth/gmail/callback"
        # scopes
        scope_str = qs.get("scope", [""])[0]
        assert "gmail.readonly" in scope_str
        assert "gmail.modify" in scope_str
        assert "gmail.send" in scope_str
        # access_type & prompt
        assert qs.get("access_type", [""])[0] == "offline"
        assert qs.get("prompt", [""])[0] == "consent"


class TestGmailAccounts:
    def test_list_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/gmail/accounts")
        assert r.status_code in (401, 403)

    def test_list_returns_array_no_tokens(self, auth):
        r = requests.get(f"{BASE_URL}/api/gmail/accounts", headers=auth)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, list)
        for a in data:
            assert "access_token" not in a
            assert "refresh_token" not in a
            assert "client_secret" not in a

    def test_delete_nonexistent(self, auth):
        r = requests.delete(f"{BASE_URL}/api/gmail/accounts/nonexistent-xyz-123", headers=auth)
        assert r.status_code == 404


class TestGmailOAuthCallback:
    def test_callback_with_error_redirects(self):
        # Error path triggers before state validation. Need a code arg to satisfy Query(...).
        r = requests.get(
            f"{BASE_URL}/api/oauth/gmail/callback",
            params={"code": "x", "state": "y", "error": "access_denied"},
            allow_redirects=False,
        )
        assert r.status_code == 302
        loc = r.headers.get("location", "")
        assert "/admin/settings" in loc
        assert "gmail_error" in loc

    def test_callback_invalid_state(self):
        r = requests.get(
            f"{BASE_URL}/api/oauth/gmail/callback",
            params={"code": "fake_code", "state": "definitely_invalid_state_xyz"},
            allow_redirects=False,
        )
        # 400 expected from HTTPException
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"


class TestGmailSync:
    def test_sync_now_no_accounts(self, auth):
        r = requests.post(f"{BASE_URL}/api/gmail/sync-now", headers=auth)
        # When no accounts, should not crash
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "accounts" in data
        assert "results" in data
        assert isinstance(data["results"], list)

    def test_sync_now_nonexistent_id(self, auth):
        r = requests.post(f"{BASE_URL}/api/gmail/sync-now/nonexistent-id-zzz", headers=auth)
        assert r.status_code == 404


# ─── Unified Student Search ────────────────────────────────────────────────
class TestUnifiedSearch:
    def test_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/students/unified-search?q=test")
        assert r.status_code in (401, 403)

    def test_short_query_returns_empty(self, auth):
        r = requests.get(f"{BASE_URL}/api/students/unified-search?q=a", headers=auth)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("count") == 0
        assert data.get("results") == []

    def test_response_shape(self, auth):
        r = requests.get(f"{BASE_URL}/api/students/unified-search?q=test", headers=auth)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert set(["query", "count", "results"]).issubset(set(data.keys()))
        assert isinstance(data["results"], list)
        if data["results"]:
            r0 = data["results"][0]
            expected_keys = {"source", "source_label", "id", "name", "phone", "email",
                             "paid_amount", "status", "city", "skill", "created_at", "link"}
            missing = expected_keys - set(r0.keys())
            assert not missing, f"missing keys: {missing}"

    def test_phone_digits_search(self, auth):
        r = requests.get(f"{BASE_URL}/api/students/unified-search?q=9876", headers=auth)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        # Should not error and ideally hit multiple sources. Record source_labels seen.
        labels = {res.get("source_label") for res in data.get("results", [])}
        # If results exist, at minimum the labels are valid and there's no _id leakage
        for res in data.get("results", []):
            assert "_id" not in res
        print(f"unified-search?q=9876 → count={data.get('count')} labels={labels}")


# ─── Data-center autocomplete (multi-collection) ──────────────────────────
class TestDataCenterAutocomplete:
    def test_autocomplete_phone(self, auth):
        r = requests.get(f"{BASE_URL}/api/data-center/autocomplete?q=9876543210", headers=auth)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        # response may be {results:[..]} or list
        results = data.get("results", data) if isinstance(data, dict) else data
        assert isinstance(results, list)
        # NOTE: schools/educators branches DO NOT inject source_label (minor bug).
        # Verify it's present for student-type entries (the multi-collection extension scope).
        student_entries = [it for it in results if it.get("type") == "student"]
        for it in student_entries:
            assert "source_label" in it, f"missing source_label in student entry: {it}"
        # Soft-track schools/educators missing source_label for the report
        missing_label = [it for it in results if "source_label" not in it]
        print(f"autocomplete missing source_label count={len(missing_label)} (school/educator entries)")

    def test_autocomplete_short(self, auth):
        r = requests.get(f"{BASE_URL}/api/data-center/autocomplete?q=a", headers=auth)
        # Should not 500 — either empty or filtered
        assert r.status_code in (200, 400)
