"""Backend tests for the Admin Data Export feature (iter 79)."""
import os
import io
import csv
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in {data}"
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ── databases endpoint ────────────────────────────────────────────────
def test_list_databases(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/data-export/databases", headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "databases" in data and "primary" in data
    names = [db["name"] for db in data["databases"]]
    assert "test_database" in names, f"primary 'test_database' missing from {names}"
    primary = [db for db in data["databases"] if db["is_primary"]]
    assert len(primary) >= 1
    assert primary[0]["name"] == data["primary"]
    # Schema check
    for db in data["databases"]:
        assert "name" in db and "collections" in db and "objects" in db
        assert "size_mb" in db and "is_primary" in db


def test_list_databases_unauthenticated():
    r = requests.get(f"{BASE_URL}/api/admin/data-export/databases", timeout=30)
    assert r.status_code in (401, 403), r.status_code


# ── collections endpoint ──────────────────────────────────────────────
def test_list_collections_primary(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/data-export/test_database/collections",
                     headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["db"] == "test_database"
    cols = data["collections"]
    assert len(cols) >= 30, f"expected >=30 collections, got {len(cols)}"
    assert all("name" in c and "count" in c for c in cols)
    names = [c["name"] for c in cols]
    assert "summer_camp_bookings" in names


# ── preview endpoint ──────────────────────────────────────────────────
def test_preview_collection(auth_headers):
    r = requests.get(
        f"{BASE_URL}/api/admin/data-export/test_database/summer_camp_bookings/preview?limit=10",
        headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["collection"] == "summer_camp_bookings"
    assert isinstance(data["rows"], list)
    assert len(data["rows"]) <= 10
    assert data["total"] >= 0
    if data["rows"]:
        first = data["rows"][0]
        # _id should be stringified
        if "_id" in first:
            assert isinstance(first["_id"], str)


def test_preview_bogus_collection(auth_headers):
    """Bogus name returns empty rows (preview doesn't 404 — it just queries empty)."""
    r = requests.get(
        f"{BASE_URL}/api/admin/data-export/test_database/__nope_does_not_exist__/preview",
        headers=auth_headers, timeout=30)
    # Preview may return 200 with empty rows, OR 404. Both acceptable.
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        assert r.json()["rows"] == []


# ── CSV export ────────────────────────────────────────────────────────
def test_export_csv(auth_headers):
    r = requests.get(
        f"{BASE_URL}/api/admin/data-export/test_database/summer_camp_bookings/csv",
        headers=auth_headers, timeout=60, stream=False)
    assert r.status_code == 200, r.text[:500]
    assert "text/csv" in r.headers.get("content-type", "")
    cd = r.headers.get("content-disposition", "")
    assert "attachment" in cd.lower() and "summer_camp_bookings" in cd
    text = r.text
    lines = [l for l in text.split("\n") if l.strip()]
    # Expect 1 header + N rows.
    assert len(lines) >= 2
    # Header should contain _id
    reader = csv.reader(io.StringIO(text))
    headers = next(reader)
    assert "_id" in headers


def test_export_csv_404(auth_headers):
    r = requests.get(
        f"{BASE_URL}/api/admin/data-export/test_database/__nope_does_not_exist__/csv",
        headers=auth_headers, timeout=30)
    assert r.status_code == 404


# ── JSON (NDJSON) export ──────────────────────────────────────────────
def test_export_json_ndjson(auth_headers):
    r = requests.get(
        f"{BASE_URL}/api/admin/data-export/test_database/summer_camp_bookings/json",
        headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text[:500]
    ct = r.headers.get("content-type", "")
    assert "ndjson" in ct or "json" in ct
    cd = r.headers.get("content-disposition", "")
    assert "attachment" in cd.lower() and ".jsonl" in cd
    lines = [l for l in r.text.split("\n") if l.strip()]
    assert len(lines) >= 1
    # Each line should be a parseable JSON object
    for line in lines[:5]:
        obj = json.loads(line)
        assert isinstance(obj, dict)


def test_export_json_404(auth_headers):
    r = requests.get(
        f"{BASE_URL}/api/admin/data-export/test_database/__nope_does_not_exist__/json",
        headers=auth_headers, timeout=30)
    assert r.status_code == 404


# ── CSV / JSON line-count consistency ────────────────────────────────
def test_csv_json_row_consistency(auth_headers):
    """CSV should have header + N rows == NDJSON N lines."""
    csv_resp = requests.get(
        f"{BASE_URL}/api/admin/data-export/test_database/summer_camp_bookings/csv",
        headers=auth_headers, timeout=60)
    json_resp = requests.get(
        f"{BASE_URL}/api/admin/data-export/test_database/summer_camp_bookings/json",
        headers=auth_headers, timeout=60)
    assert csv_resp.status_code == 200 and json_resp.status_code == 200
    json_lines = [l for l in json_resp.text.split("\n") if l.strip()]
    # Use csv module to count proper CSV rows
    reader = csv.reader(io.StringIO(csv_resp.text))
    rows = list(reader)
    csv_data_rows = len(rows) - 1  # minus header
    assert csv_data_rows == len(json_lines), (
        f"CSV data rows ({csv_data_rows}) != JSON lines ({len(json_lines)})"
    )
