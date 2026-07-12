"""LMS Sync tests against preview backend with correct env vars."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"No token in response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def test_lms_import_schools(headers):
    r = requests.post(f"{BASE_URL}/api/lms/import-schools", headers=headers, timeout=180)
    assert r.status_code == 200, f"import-schools failed: {r.status_code} {r.text[:500]}"
    data = r.json()
    print(f"Import result: {data}")
    total = data.get("total_lms_schools", 0)
    assert total > 0, f"Expected >0 schools, got {total}. Body: {data}"
    assert total >= 20, f"Expected ~25 schools, got {total}"
    assert "Resource not found" not in str(data)


def test_lms_sync_status(headers):
    r = requests.get(f"{BASE_URL}/api/lms/sync-status", headers=headers, timeout=30)
    assert r.status_code == 200, f"sync-status: {r.text}"
    data = r.json()
    print(f"Sync status: {data}")
    assert data.get("last_sync_at"), "last_sync_at missing"
    assert data.get("last_total", 0) > 0, f"last_total={data.get('last_total')}"


def test_schools_inquiries_have_lms_id(headers):
    r = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", data.get("inquiries", []))
    linked = [s for s in items if s.get("lms_school_id")]
    print(f"Total inquiries: {len(items)}, linked to LMS: {len(linked)}")
    assert len(linked) >= 20, f"Expected >=20 linked schools, got {len(linked)}"
    # store one id for next test
    global LINKED_SCHOOL_ID
    LINKED_SCHOOL_ID = linked[0].get("id") or linked[0].get("_id")
    print(f"Sample linked school id: {LINKED_SCHOOL_ID}, lms_id: {linked[0].get('lms_school_id')}")


def test_school_lms_report(headers):
    # find a linked school
    r = requests.get(f"{BASE_URL}/api/schools/inquiries", headers=headers, timeout=60)
    items = r.json() if isinstance(r.json(), list) else r.json().get("items", r.json().get("inquiries", []))
    linked = [s for s in items if s.get("lms_school_id")]
    assert linked, "No linked schools available"
    # try a few to find one with classes
    found = False
    tried = []
    for s in linked[:10]:
        sid = s.get("id") or s.get("_id")
        rr = requests.get(f"{BASE_URL}/api/schools/{sid}/lms-report", headers=headers, timeout=60)
        tried.append((sid, rr.status_code))
        if rr.status_code != 200:
            continue
        d = rr.json()
        print(f"lms-report for {sid}: linked={d.get('linked')} classes={len(d.get('classes') or [])}")
        if d.get("linked") and len(d.get("classes") or []) >= 1:
            found = True
            break
    assert found, f"No school with linked=true and >=1 class. Tried: {tried}"


def test_wrong_url_would_404():
    """Sanity check: wrong prod URL produces 404."""
    r = requests.get("https://oll.co/api/external/external/track-sheet", timeout=30, allow_redirects=True)
    print(f"Wrong URL status: {r.status_code}, body first 200: {r.text[:200]}")
    assert r.status_code in (404, 400, 502, 503, 301, 302) or "not found" in r.text.lower(), \
        f"Expected 404, got {r.status_code}"
