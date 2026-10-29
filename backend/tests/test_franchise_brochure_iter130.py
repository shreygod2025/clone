# Franchise brochure lead + enquiry (occupation/city) -> Growth Partners tests (iter130)
import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/frontend/.env')
load_dotenv('/app/backend/.env')
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
BL = f"{BASE_URL}/api/franchise/brochure-lead"
EN = f"{BASE_URL}/api/franchise/enquiry"
db = MongoClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    db.growth_partners.delete_many({"phone": {"$in": ["9000000550", "9000000551", "9000000552"]}})
    yield
    db.growth_partners.delete_many({"$or": [{"name": {"$regex": "^E1 "}}, {"email": {"$regex": "^e1-"}}]})


# Brochure lead validation
@pytest.mark.parametrize("body", [
    {"name": "E1 Bro", "phone": "12345", "city": "Pune, Maharashtra"},
    {"name": "E", "phone": "9000000550", "city": "Pune, Maharashtra"},
    {"name": "E1 Bro", "phone": "5000000550", "city": "Pune, Maharashtra"},
    {"name": "E1 Bro", "phone": "9000000550", "city": "P"},
    {"name": "E1 Bro", "phone": "9000000550"},
])
def test_brochure_validation_422(body):
    assert requests.post(BL, json=body).status_code == 422


# Brochure lead create + dedupe
def test_brochure_create_and_dedupe():
    body = {"name": "E1 Brochure", "phone": "9000000550", "city": "Pune, Maharashtra"}
    r = requests.post(BL, json=body)
    assert r.status_code == 200 and r.json()["ok"] is True and not r.json().get("duplicate")
    doc = db.growth_partners.find_one({"phone": "9000000550", "source": "franchise_brochure"})
    assert doc and doc["name"] == "E1 Brochure" and doc["city"] == "Pune, Maharashtra"
    assert doc["interest_type"] == "centre_franchise" and doc["status"] == "new"
    r2 = requests.post(BL, json=body)
    assert r2.status_code == 200 and r2.json().get("duplicate") is True
    assert db.growth_partners.count_documents({"phone": "9000000550"}) == 1


# Enquiry with custom occupation + city
def test_enquiry_custom_occupation():
    p = {"name": "E1 Enquiry", "phone": "9000000551", "email": f"e1-{uuid.uuid4().hex[:6]}@oll.co",
         "city_state": "Nashik, Maharashtra", "occupation": "Software engineer", "has_space": "yes",
         "reason": "Want to start a robotics centre"}
    r = requests.post(EN, json=p)
    assert r.status_code == 200 and r.json()["ok"] is True
    doc = db.growth_partners.find_one({"id": r.json()["id"]})
    assert doc["occupation"] == "Software engineer" and doc["city"] == "Nashik, Maharashtra"
    assert doc["source"] == "franchise_landing"


# Visible in admin growth partners
def test_brochure_lead_in_admin_list():
    t = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@oll.co", "password": "GodisGreat@2026"})
    if t.status_code != 200:
        pytest.skip("admin login failed")
    tok = t.json().get("access_token") or t.json().get("token")
    g = requests.get(f"{BASE_URL}/api/growth-partners", headers={"Authorization": f"Bearer {tok}"})
    assert g.status_code == 200
    data = g.json()
    items = data if isinstance(data, list) else (data.get("partners") or data.get("items") or data.get("growth_partners") or [])
    assert any(i.get("phone") == "9000000550" and i.get("source") == "franchise_brochure" for i in items)


# Public assets
def test_pdf_and_centers():
    r = requests.head(f"{BASE_URL}/franchise/oll-franchise-brochure.pdf")
    assert r.status_code == 200 and "application/pdf" in r.headers.get("content-type", "")
    c = requests.get(f"{BASE_URL}/api/future-skills/centers")
    assert c.status_code == 200 and len(c.json()["centers"]) > 0
    assert all("owner_password" not in x for x in c.json()["centers"])
