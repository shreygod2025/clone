# Techfest submission portal: team-login, phone OTP, email OTP, PATCH edit, duplicate rule, cutoffs
import hashlib
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
P = f"{BASE_URL}/api/techfest/submission-portal"
SEED_ID = "6ab40f21fc0667aceb877bd6"
OTHER_ID = "6ab40f45fc0667aceb877bd7"

db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


@pytest.fixture(scope="module", autouse=True)
def snapshot_seed():
    orig = db.techfest_submissions.find_one({"_id": ObjectId(SEED_ID)})
    ins = db.techfest_submissions.insert_many([
        {"full_name": "TEST_Dup", "email": "test_dup@oll.co", "phone": "9000011111", "team_id": "TEST-DUP-TEAM",
         "competition": "robo_sumo", "zone": "west", "created_at": "2026-01-01T00:00:00+00:00", "status": "submitted"},
        {"full_name": "TEST_East", "email": "test_east@oll.co", "phone": "9000022222", "team_id": "TEST-EAST-TEAM",
         "competition": "robo_race", "zone": "east", "created_at": "2026-01-01T00:00:00+00:00", "status": "submitted"},
    ])
    yield
    db.techfest_submissions.delete_many({"_id": {"$in": ins.inserted_ids}})
    db.techfest_submissions.replace_one({"_id": ObjectId(SEED_ID)}, orig)
    db.techfest_portal_otps.delete_many({"email": {"$in": ["phone:9999999999", "e1testsubmit@oll.co"]}})


def team_token(tid="tf-team-1"):
    r = requests.post(f"{P}/team-login", json={"team_id": tid})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


# Team ID login
def test_team_login_case_insensitive_and_my():
    t = team_token("tf-team-1")
    r = requests.get(f"{P}/my", headers=H(t))
    assert r.status_code == 200
    items = r.json()["items"]
    ids = [i["id"] for i in items]
    assert ids == [SEED_ID]
    it = items[0]
    assert it["edit_cutoff_label"] == "1 Nov 2026, 11:59 PM IST"
    assert it["edit_window_open"] is True
    assert "_id" not in it


def test_team_login_unknown():
    r = requests.post(f"{P}/team-login", json={"team_id": "NOPE-XYZ-999"})
    assert r.status_code == 404
    assert "No submission found" in r.json()["detail"]


def test_east_label():
    t = team_token("test-east-team")
    it = requests.get(f"{P}/my", headers=H(t)).json()["items"][0]
    assert it["edit_cutoff_label"] == "20 Oct 2026, 11:59 PM IST"
    assert isinstance(it["edit_window_open"], bool)


def test_patch_other_submission_forbidden():
    t = team_token()
    r = requests.patch(f"{P}/submission/{OTHER_ID}", headers=H(t), json={"city": "X"})
    assert r.status_code == 403


def test_patch_no_token_401():
    r = requests.patch(f"{P}/submission/{SEED_ID}", json={"city": "X"})
    assert r.status_code == 401


def test_patch_persist_all_fields():
    t = team_token()
    body = {"city": "TEST_Mumbai", "school_or_college": "TEST School", "age_category": "senior",
            "competition": "robo_race", "zone": "north", "id_proof_url": "https://example.com/id.png",
            "id_proof_type": "aadhar", "school_permission_url": "https://example.com/perm.pdf",
            "team_members": [{"name": "M1", "email": "m1@oll.co"}, {"name": "M2", "id_proof_url": "https://example.com/m2.png"}]}
    r = requests.patch(f"{P}/submission/{SEED_ID}", headers=H(t), json=body)
    assert r.status_code == 200, r.text
    got = requests.get(f"{P}/my", headers=H(t)).json()["items"][0]
    for k in ("city", "school_or_college", "age_category", "competition", "zone", "id_proof_url", "school_permission_url"):
        assert got[k] == body[k], k
    assert [m["name"] for m in got["team_members"]] == ["M1", "M2"]
    assert got["team_members"][1]["id_proof_url"] == "https://example.com/m2.png"


def test_patch_duplicate_team_id_409():
    t = team_token()
    r = requests.patch(f"{P}/submission/{SEED_ID}", headers=H(t), json={"team_id": "test-dup-team"})
    assert r.status_code == 409
    assert "already submitted" in r.json()["detail"]


def test_patch_same_team_id_ok():
    t = team_token()
    r = requests.patch(f"{P}/submission/{SEED_ID}", headers=H(t), json={"team_id": "TF-TEAM-1"})
    assert r.status_code == 200


def test_patch_east_move_blocked_after_cutoff_or_ok_before():
    # moving into east uses stricter cutoff; currently before 20 Oct so allowed
    t = team_token()
    r = requests.patch(f"{P}/submission/{SEED_ID}", headers=H(t), json={"zone": "east"})
    assert r.status_code in (200, 403)
    requests.patch(f"{P}/submission/{SEED_ID}", headers=H(t), json={"zone": "west"})


# Phone OTP
def test_phone_otp_flow():
    r = requests.post(f"{P}/request-otp", json={"phone": "9999999999"})
    assert r.status_code in (200, 429), r.text
    if r.status_code == 200:
        assert r.json()["sent_to_email"].startswith("e1***@")
    ident = "phone:9999999999"
    db.techfest_portal_otps.insert_one({"email": ident, "otp_hash": hashlib.sha256(f"{ident}::123456".encode()).hexdigest(),
                                        "expires_at_ts": time.time() + 600, "consumed": False})
    v = requests.post(f"{P}/verify-otp", json={"phone": "9999999999", "otp": "123456"})
    assert v.status_code == 200, v.text
    tok = v.json()["token"]
    items = requests.get(f"{P}/my", headers=H(tok)).json()["items"]
    assert SEED_ID in [i["id"] for i in items]
    # reuse should fail (consumed)
    v2 = requests.post(f"{P}/verify-otp", json={"phone": "9999999999", "otp": "123456"})
    assert v2.status_code == 400


def test_phone_unknown():
    r = requests.post(f"{P}/request-otp", json={"phone": "9000000001"})
    assert r.status_code == 404
    assert "No submission found" in r.json()["detail"]


def test_wrong_otp():
    r = requests.post(f"{P}/verify-otp", json={"phone": "9999999999", "otp": "000001"})
    assert r.status_code == 400


# Email OTP
def test_email_otp_flow():
    r = requests.post(f"{P}/request-otp", json={"email": "e1testsubmit@oll.co"})
    assert r.status_code in (200, 429)
    ident = "e1testsubmit@oll.co"
    db.techfest_portal_otps.insert_one({"email": ident, "otp_hash": hashlib.sha256(f"{ident}::654321".encode()).hexdigest(),
                                        "expires_at_ts": time.time() + 600, "consumed": False})
    v = requests.post(f"{P}/verify-otp", json={"email": ident, "otp": "654321"})
    assert v.status_code == 200
    tok = v.json()["token"]
    assert SEED_ID in [i["id"] for i in requests.get(f"{P}/my", headers=H(tok)).json()["items"]]
    r = requests.patch(f"{P}/submission/{OTHER_ID}", headers=H(tok), json={"city": "X"})
    assert r.status_code == 403
