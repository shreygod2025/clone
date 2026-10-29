# Franchise landing enquiry -> Growth Partners (centre_franchise) tests
import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/frontend/.env')
load_dotenv('/app/backend/.env')
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
EP = f"{BASE_URL}/api/franchise/enquiry"


def payload(**kw):
    p = {"name": "TEST_E1 Franchise", "phone": "9876543210",
         "email": f"e1-franchise-{uuid.uuid4().hex[:6]}@oll.co", "city_state": "Pune, MH",
         "occupation": "Teacher", "has_space": "yes", "reason": "Want to start a robotics centre"}
    p.update(kw)
    return p


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@oll.co", "password": "GodisGreat@2026"})
    if r.status_code != 200:
        pytest.skip("admin login failed")
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    c = MongoClient(os.environ['MONGO_URL'])
    c[os.environ['DB_NAME']].growth_partners.delete_many({"email": {"$regex": "^e1-franchise-.*@oll.co$"}, "name": {"$regex": "^TEST_"}})


# Validation
@pytest.mark.parametrize("override", [
    {"email": "bad-email"}, {"name": "A"}, {"has_space": "maybe"}, {"phone": "123"}, {"reason": "hi"},
])
def test_validation_422(override):
    r = requests.post(EP, json=payload(**override))
    assert r.status_code == 422, r.text


def test_missing_fields_422():
    r = requests.post(EP, json={"name": "TEST_x"})
    assert r.status_code == 422


# Create + persistence in GP CRM
def test_create_and_visible_in_growth_partners(admin_token):
    p = payload(email="E1-Franchise-UPPER@oll.co".replace("UPPER", uuid.uuid4().hex[:5]), has_space="looking")
    r = requests.post(EP, json=p)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True and isinstance(data["id"], str)
    g = requests.get(f"{BASE_URL}/api/growth-partners", headers={"Authorization": f"Bearer {admin_token}"})
    assert g.status_code == 200
    rec = next((x for x in g.json() if x["id"] == data["id"]), None)
    assert rec is not None
    assert rec["interest_type"] == "centre_franchise"
    assert rec["source"] == "franchise_landing"
    assert rec["email"] == p["email"].lower()
    assert rec["city"] == "Pune, MH"
    assert rec["has_space"] == "looking"
    assert rec["status"] == "new"
    assert "Currently looking" in rec["details"]
    assert "_id" not in rec


def test_growth_partners_requires_auth():
    r = requests.get(f"{BASE_URL}/api/growth-partners")
    assert r.status_code in (401, 403)
