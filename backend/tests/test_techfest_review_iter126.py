# Iter126: Techfest judge review emails, rejected->pending on portal edit, vendor link migration
import os

import pytest
import requests
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
P = f"{BASE_URL}/api/techfest/submission-portal"
SEED_ID = "6ab40f21fc0667aceb877bd6"
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


@pytest.fixture(scope="module", autouse=True)
def snapshot_seed():
    orig = db.techfest_submissions.find_one({"_id": ObjectId(SEED_ID)})
    yield
    db.techfest_submissions.replace_one({"_id": ObjectId(SEED_ID)}, orig)


@pytest.fixture(scope="module")
def admin_h():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@oll.co", "password": "GodisGreat@2026"})
    if r.status_code != 200:
        pytest.skip("admin login failed")
    d = r.json()
    tok = d.get("token") or d.get("access_token")
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def team_h():
    r = requests.post(f"{P}/team-login", json={"team_id": "TF-TEAM-1"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def review(admin_h, decision, remarks):
    return requests.patch(f"{BASE_URL}/api/admin/techfest/submissions/{SEED_ID}/review",
                          json={"decision": decision, "remarks": remarks}, headers=admin_h)


# Review endpoint validation
def test_review_requires_remarks(admin_h):
    r = review(admin_h, "rejected", "  ")
    assert r.status_code == 400


def test_review_bad_decision(admin_h):
    assert review(admin_h, "maybe", "some remarks").status_code == 422


def test_review_unauth():
    r = requests.patch(f"{BASE_URL}/api/admin/techfest/submissions/{SEED_ID}/review",
                       json={"decision": "approved", "remarks": "abc"})
    assert r.status_code in (401, 403)


def test_review_404(admin_h):
    r = requests.patch(f"{BASE_URL}/api/admin/techfest/submissions/aaaaaaaaaaaaaaaaaaaaaaaa/review",
                       json={"decision": "approved", "remarks": "abc"}, headers=admin_h)
    assert r.status_code == 404


# Full reject -> portal edit (resubmit) -> approve flow
def test_reject_edit_resubmit_approve(admin_h, team_h):
    r = review(admin_h, "rejected", "TEST_ Please add bot photos")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["review_status"] == "rejected" and d["email_sent"] is True
    doc = db.techfest_submissions.find_one({"_id": ObjectId(SEED_ID)})
    assert doc["review_email_sent_at"]

    my = requests.get(f"{P}/my", headers=team_h).json()["items"][0]
    assert my["review_status"] == "rejected"
    assert my["judge_remarks"] == "TEST_ Please add bot photos"
    assert "review_history" not in my and "reviewed_by" not in my and "_id" not in my

    e = requests.patch(f"{P}/submission/{SEED_ID}", json={"city": "TEST_Mumbai"}, headers=team_h)
    assert e.status_code == 200, e.text
    s = e.json()["submission"]
    assert s["review_status"] == "pending" and s["city"] == "TEST_Mumbai" and s["resubmitted_at"]
    assert "review_history" not in s and "reviewed_by" not in s

    # admin list reflects pending + resubmitted_at
    lst = requests.get(f"{BASE_URL}/api/admin/techfest/submissions", headers=admin_h)
    assert lst.status_code == 200
    row = next(i for i in lst.json()["items"] if i.get("_id") == SEED_ID or i.get("id") == SEED_ID)
    assert row["review_status"] == "pending" and row.get("resubmitted_at")

    # editing a pending one doesn't change status
    e2 = requests.patch(f"{P}/submission/{SEED_ID}", json={"city": "Pune"}, headers=team_h)
    assert e2.json()["submission"]["review_status"] == "pending"

    a = review(admin_h, "approved", "TEST_ Great build")
    assert a.status_code == 200 and a.json()["email_sent"] is True
    my2 = requests.get(f"{P}/my", headers=team_h).json()["items"][0]
    assert my2["review_status"] == "approved" and my2["city"] == "Pune"
    doc = db.techfest_submissions.find_one({"_id": ObjectId(SEED_ID)})
    assert len(doc.get("review_history", [])) >= 2


# Vendor link migration: no retired hosts remain
@pytest.mark.parametrize("coll", ["shop_orders", "shop_product_overrides", "support_queries", "school_expenses",
                                  "shop_purchase_orders", "school_inquiries"])
def test_no_old_vendor_hosts(coll):
    bad = [d["_id"] for d in db[coll].find({}) if "vendorplus-4" in str(d) or "oll-procure" in str(d)]
    assert bad == []


def test_po_tracking_urls():
    for po in db.shop_purchase_orders.find({"vendor_tracking_url": {"$nin": [None, ""]}}):
        assert po["vendor_tracking_url"].startswith("https://vendor-panel-1rt3.vercel.app/track/")


def test_migration_rewrite_unit():
    import sys
    sys.path.insert(0, "/app/backend")
    from routes.vendor_link_migration import rewrite
    assert rewrite("https://vendorplus-4.emergent.host/track/ABC") == "https://vendor-panel-1rt3.vercel.app/track/ABC"
    assert rewrite("https://vendorplus-4.emergent.host/api/files/x.png") == "https://vendor-panel-6kjc.onrender.com/api/files/x.png"
    assert rewrite("https://oll-procure.preview.emergentagent.com/api/files/y") == "https://vendor-panel-6kjc.onrender.com/api/files/y"
    assert rewrite({"a": ["https://oll-procure.preview.emergentagent.com/login"]}) == {"a": ["https://vendor-panel-1rt3.vercel.app/login"]}
    assert rewrite("https://images.weserv.nl/?url=vendorplus-4.emergent.host/api/files/z.jpg") == \
        "https://images.weserv.nl/?url=vendor-panel-6kjc.onrender.com/api/files/z.jpg"


def test_shop_products_images(admin_h):
    r = requests.get(f"{BASE_URL}/api/shop/products")
    assert r.status_code == 200
    body = r.text
    assert "vendorplus-4" not in body and "oll-procure" not in body
