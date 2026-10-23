# Iter127: Techfest admin submission confirmation / result emails (single + bulk) and bulk review
import os
import time

import pytest
import requests
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
A = f"{BASE_URL}/api/admin/techfest/submissions"
P = f"{BASE_URL}/api/techfest/submission-portal"
APPROVED_ID = "6ab40f21fc0667aceb877bd6"
PENDING_ID = "6ab40f45fc0667aceb877bd7"
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


@pytest.fixture(scope="module", autouse=True)
def snapshot_seed():
    origs = [db.techfest_submissions.find_one({"_id": ObjectId(i)}) for i in (APPROVED_ID, PENDING_ID)]
    yield
    for o in origs:
        db.techfest_submissions.replace_one({"_id": o["_id"]}, o)


@pytest.fixture(scope="module")
def admin_h():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@oll.co", "password": "GodisGreat@2026"})
    if r.status_code != 200:
        pytest.skip("admin login failed")
    d = r.json()
    return {"Authorization": f"Bearer {d.get('token') or d.get('access_token')}"}


def send(h, ids, kind):
    return requests.post(f"{A}/send-emails", json={"ids": ids, "kind": kind}, headers=h)


# send-emails: validation / auth
def test_send_emails_unauth():
    assert requests.post(f"{A}/send-emails", json={"ids": [PENDING_ID], "kind": "confirmation"}).status_code in (401, 403)


def test_send_emails_invalid_id(admin_h):
    assert send(admin_h, ["not-an-id"], "confirmation").status_code == 400


def test_send_emails_bad_kind(admin_h):
    assert send(admin_h, [PENDING_ID], "spam").status_code == 422


def test_send_emails_empty_ids(admin_h):
    assert send(admin_h, [], "confirmation").status_code == 422


# send-emails: synchronous confirmation
def test_send_confirmation_single(admin_h):
    db.techfest_submissions.update_one({"_id": ObjectId(PENDING_ID)}, {"$unset": {"confirmation_email_sent_at": ""}})
    r = send(admin_h, [PENDING_ID], "confirmation")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True and d["sent"] == 1 and d["skipped_or_failed"] == 0
    doc = db.techfest_submissions.find_one({"_id": ObjectId(PENDING_ID)})
    assert doc.get("confirmation_email_sent_at")


# kind=result: pending skipped, approved sent
def test_send_result_skips_pending(admin_h):
    r = send(admin_h, [PENDING_ID, APPROVED_ID], "result")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["sent"] == 1 and d["skipped_or_failed"] == 1
    assert db.techfest_submissions.find_one({"_id": ObjectId(APPROVED_ID)}).get("review_email_sent_at")


# >3 ids -> queued
def test_send_emails_queued(admin_h):
    ids = [PENDING_ID, APPROVED_ID, "aaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbb"]
    r = send(admin_h, ids, "result")
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True, "queued": 4}


# bulk-review
def test_bulk_review_requires_remarks(admin_h):
    r = requests.post(f"{A}/bulk-review", json={"ids": [PENDING_ID], "decision": "rejected", "remarks": " "}, headers=admin_h)
    assert r.status_code == 400


def test_bulk_review_invalid_id(admin_h):
    r = requests.post(f"{A}/bulk-review", json={"ids": ["x"], "decision": "rejected", "remarks": "abcd"}, headers=admin_h)
    assert r.status_code == 400


def test_bulk_review_rework_then_restore(admin_h):
    r = requests.post(f"{A}/bulk-review",
                      json={"ids": [PENDING_ID], "decision": "rejected", "remarks": "TEST_ add wiring photos"}, headers=admin_h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["updated"] == 1 and d["review_status"] == "rejected" and d["judge_remarks"] == "TEST_ add wiring photos"
    lst = requests.get(A, headers=admin_h).json()["items"]
    row = next(i for i in lst if i["_id"] == PENDING_ID)
    assert row["review_status"] == "rejected" and row["judge_remarks"] == "TEST_ add wiring photos"
    time.sleep(4)
    doc = db.techfest_submissions.find_one({"_id": ObjectId(PENDING_ID)})
    assert doc["review_history"][-1]["decision"] == "rejected"


# Regression: approved submission locked in portal
def test_portal_patch_approved_locked():
    r = requests.post(f"{P}/team-login", json={"team_id": "TF-TEAM-1"})
    assert r.status_code == 200, r.text
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    e = requests.patch(f"{P}/submission/{APPROVED_ID}", json={"city": "TEST_X"}, headers=h)
    assert e.status_code == 403
    assert "locked" in e.json()["detail"].lower()
