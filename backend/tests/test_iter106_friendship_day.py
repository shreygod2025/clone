"""Iteration 106 — Friendship Day: workshop_history mirror, dedupe, 409, PATCH→CRM mirror."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@oll.co"
ADMIN_PASSWORD = "Dagaji03@"


@pytest.fixture(scope="module")
def admin_token():
    for path in ("/auth/login", "/login"):
        r = requests.post(f"{API}{path}", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        if r.status_code == 200:
            data = r.json()
            token = data.get("access_token") or data.get("token") or data.get("data", {}).get("access_token")
            if token:
                return token
    pytest.skip("Admin auth failed")


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _payload(**over):
    base = {
        "full_name": "TEST Iter106 Kid",
        "email": "test_iter106@example.com",
        "phone": "9876500000",
        "age": 10,
        "address": "TEST Address, Mumbai 400001",
        "workshop": "bracelet",
        "center": "kandivali",
        "knows_oll": True,
        "participated_before": False,
        "previous_workshop": "",
    }
    base.update(over)
    return base


@pytest.fixture
def unique_lead():
    ts = int(time.time() * 1000) % 10**10
    return {"email": f"test_i106_{ts}@example.com", "phone": f"9{ts % 1000000000:09d}"[:10]}


# --- Catalog smoke ---
def test_catalog_two_centers_and_three_workshops():
    r = requests.get(f"{API}/friendship-day/catalog", timeout=10)
    assert r.status_code == 200
    d = r.json()
    centers = {c["key"]: c["name"] for c in d["centers"]}
    assert set(centers.keys()) == {"kandivali", "mira_road"}
    assert "EuroKids" in centers["kandivali"]
    assert "Makoons" in centers["mira_road"]
    ws = {w["key"]: w["amount"] for w in d["workshops"]}
    assert ws == {"bracelet": 499.0, "card": 499.0, "combo": 799.0}


# --- Dedupe + workshop_history append ---
def test_dedupe_appends_workshop_history(admin_headers, unique_lead):
    p1 = _payload(email=unique_lead["email"], phone=unique_lead["phone"], workshop="bracelet")
    r1 = requests.post(f"{API}/friendship-day/register", json=p1, timeout=15)
    assert r1.status_code == 200, r1.text
    reg_id_1 = r1.json()["registration_id"]

    p2 = _payload(email=unique_lead["email"], phone=unique_lead["phone"], workshop="combo")
    r2 = requests.post(f"{API}/friendship-day/register", json=p2, timeout=15)
    assert r2.status_code == 200
    assert r2.json()["registration_id"] == reg_id_1

    # Verify only ONE doc + workshop_history has both entries
    lr = requests.get(f"{API}/admin/friendship-day/registrations",
                      params={"q": unique_lead["email"]}, headers=admin_headers, timeout=15)
    assert lr.status_code == 200
    rows = [r for r in lr.json()["registrations"] if r["email"] == unique_lead["email"]]
    assert len(rows) == 1, f"expected 1 dedupe doc, got {len(rows)}"
    hist = rows[0].get("workshop_history") or []
    workshops = [h.get("workshop") for h in hist]
    assert "bracelet" in workshops and "combo" in workshops


# --- Third register after paid returns 409 ---
def test_third_register_after_paid_returns_409(admin_headers, unique_lead):
    p = _payload(email=unique_lead["email"], phone=unique_lead["phone"], workshop="card")
    r = requests.post(f"{API}/friendship-day/register", json=p, timeout=15)
    assert r.status_code == 200
    reg_id = r.json()["registration_id"]

    # Mark paid via admin PATCH → this also mirrors to Student CRM
    rp = requests.patch(f"{API}/admin/friendship-day/registrations/{reg_id}",
                        json={"payment_status": "paid"}, headers=admin_headers, timeout=15)
    assert rp.status_code == 200

    # Re-register same workshop while paid → 409
    r2 = requests.post(f"{API}/friendship-day/register", json=p, timeout=15)
    assert r2.status_code == 409


# --- PATCH → Student CRM mirror with workshop_history entry ---
def test_admin_patch_paid_mirrors_to_student_crm(admin_headers, unique_lead):
    p = _payload(
        email=unique_lead["email"], phone=unique_lead["phone"],
        workshop="combo", full_name="TEST CRMMirror Child",
    )
    r = requests.post(f"{API}/friendship-day/register", json=p, timeout=15)
    assert r.status_code == 200
    reg_id = r.json()["registration_id"]

    rp = requests.patch(f"{API}/admin/friendship-day/registrations/{reg_id}",
                        json={"payment_status": "paid"}, headers=admin_headers, timeout=15)
    assert rp.status_code == 200

    # Look for the student in student_inquiries via admin list-inquiries endpoints.
    # We probe common admin endpoints.
    rr = requests.get(f"{API}/students/inquiries", headers=admin_headers, timeout=20)
    assert rr.status_code == 200, rr.text
    items = rr.json()
    found = next((x for x in items if x.get("email") == unique_lead["email"]), None)
    if not found:
        pytest.fail(f"Student CRM mirror missing for {unique_lead['email']}")

    # StudentInquiry response model strips extra fields (extra='ignore'),
    # so payment_status/workshop_history aren't exposed via the list endpoint.
    # Verify persistence via direct DB.
    import asyncio as _asyncio
    from motor.motor_asyncio import AsyncIOMotorClient as _Cli
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url:
        pytest.skip("MONGO_URL not available in test env")

    async def _check():
        cli = _Cli(mongo_url)
        d = await cli[db_name].student_inquiries.find_one(
            {"email": unique_lead["email"], "phone": unique_lead["phone"]}, {"_id": 0}
        )
        return d

    doc = _asyncio.run(_check())
    assert doc is not None, "Mirror doc missing in student_inquiries"
    assert doc.get("payment_status") == "paid"
    hist = doc.get("workshop_history") or []
    assert any(
        h.get("registration_id") == reg_id and h.get("workshop") == "combo" and h.get("payment_status") == "paid"
        for h in hist
    ), f"workshop_history entry missing/mismatched: {hist}"


# --- Webhook still needs signature ---
def test_webhook_missing_signature_401():
    r = requests.post(f"{API}/friendship-day/webhook", data="{}", timeout=10)
    assert r.status_code == 401


# --- Initiate payment: verify return_url on Cashfree side is oll.co ---
def test_initiate_payment_success_shape(unique_lead):
    p = _payload(email=unique_lead["email"], phone=unique_lead["phone"])
    r = requests.post(f"{API}/friendship-day/register", json=p, timeout=15)
    assert r.status_code == 200
    reg_id = r.json()["registration_id"]

    r2 = requests.post(f"{API}/friendship-day/initiate-payment",
                       json={"registration_id": reg_id, "frontend_url": "https://camp-lead-capture.preview.emergentagent.com"},
                       timeout=25)
    if r2.status_code != 200:
        pytest.skip(f"Cashfree init not available in this env: {r2.status_code} {r2.text[:200]}")
    d = r2.json()
    assert d.get("order_id") and d.get("payment_session_id")
    assert d.get("environment") in ("production", "sandbox")

    # Verify Cashfree order was created with return_url on oll.co
    cf_env = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX").upper()
    cf_base = "https://api.cashfree.com/pg" if cf_env == "PRODUCTION" else "https://sandbox.cashfree.com/pg"
    cf_headers = {
        "x-api-version": "2023-08-01",
        "x-client-id": os.getenv("CASHFREE_APP_ID", ""),
        "x-client-secret": os.getenv("CASHFREE_SECRET_KEY", ""),
    }
    if not cf_headers["x-client-id"]:
        pytest.skip("No Cashfree keys locally; skipping direct return_url verification")
    cf_resp = requests.get(f"{cf_base}/orders/{d['order_id']}", headers=cf_headers, timeout=15)
    if cf_resp.status_code != 200:
        pytest.skip(f"Cashfree fetch failed: {cf_resp.status_code}")
    cf_data = cf_resp.json()
    return_url = (cf_data.get("order_meta") or {}).get("return_url", "")
    assert return_url.startswith("https://oll.co/"), f"return_url must be on oll.co, got: {return_url}"
