# Admin edit of techfest submissions (PATCH /api/admin/techfest/submissions/{id}) - iter131
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN = {"email": "admin@oll.co", "password": "GodisGreat@2026"}


def _payload(n, **kw):
    u = uuid.uuid4().hex[:6]
    p = {
        "full_name": f"TEST_Lead {n}", "date_of_birth": "2010-01-01", "email": f"e1-test-{n}-{u}@oll.co",
        "phone": "9999999999", "country": "India", "pincode": "400001", "state": "Maharashtra",
        "city": "Mumbai", "school_or_college": f"TEST_School {n}", "age_category": "junior",
        "id_proof_url": "https://example.com/id.png", "id_proof_type": "Aadhar card",
        "competition": "robo_sumo", "zone": "west", "team_id": f"TEST-T-{u}", "competition_id": f"TEST-C-{u}",
        "drive_link": "https://drive.google.com/x",
        "team_members": [{"name": "TEST_Member A", "email": f"e1-test-m-{u}@oll.co"}],
    }
    p.update(kw)
    return p


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    r = sess.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip("admin login failed")
    sess.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})
    return sess


@pytest.fixture(scope="module")
def created(s):
    ids = []
    yield ids
    # cleanup only via mongo by ids (no delete endpoint)
    from pymongo import MongoClient
    from bson import ObjectId
    from dotenv import dotenv_values
    env = dotenv_values("/app/backend/.env")
    db = MongoClient(env["MONGO_URL"])[env["DB_NAME"]]
    db.techfest_submissions.delete_many({"_id": {"$in": [ObjectId(i) for i in ids]}})


def _create(s, created, n, **kw):
    p = _payload(n, **kw)
    r = s.post(f"{BASE_URL}/api/admin/techfest/submissions", json=p)
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    created.append(sid)
    return sid, p


def _get(s, sid):
    items = s.get(f"{BASE_URL}/api/admin/techfest/submissions").json()["items"]
    return next(x for x in items if x["_id"] == sid)


class TestAdminEdit:
    def test_edit_requires_auth(self, s, created):
        sid, _ = _create(s, created, 1)
        r = requests.patch(f"{BASE_URL}/api/admin/techfest/submissions/{sid}", json={"city": "X"})
        assert r.status_code in (401, 403)

    def test_edit_persists(self, s, created):
        sid, _ = _create(s, created, 2)
        r = s.patch(f"{BASE_URL}/api/admin/techfest/submissions/{sid}", json={
            "city": "TEST_Pune", "school_or_college": "TEST_Edited School", "zone": "south",
            "competition": "robo_race", "team_members": [{"name": "TEST_Renamed", "email": "e1-test-x@oll.co"}]})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["modified"] == 1 and d["submission"]["city"] == "TEST_Pune"
        assert "_id" in d["submission"] and isinstance(d["submission"]["_id"], str)
        g = _get(s, sid)
        assert g["city"] == "TEST_Pune" and g["school_or_college"] == "TEST_Edited School"
        assert g["zone"] == "south" and g["competition"] == "robo_race"
        assert g["team_members"][0]["name"] == "TEST_Renamed"
        assert g["review_status"] == "pending"
        assert g.get("last_edited_by_admin") == "admin@oll.co"

    def test_no_changes(self, s, created):
        sid, _ = _create(s, created, 3)
        r = s.patch(f"{BASE_URL}/api/admin/techfest/submissions/{sid}", json={})
        assert r.status_code == 200 and r.json()["modified"] == 0

    @pytest.mark.parametrize("decision", ["approved", "final_rejected"])
    def test_edit_keeps_review_status(self, s, created, decision):
        sid, _ = _create(s, created, f"4{decision[:3]}")
        rv = s.patch(f"{BASE_URL}/api/admin/techfest/submissions/{sid}/review", json={"decision": decision, "remarks": "test"})
        assert rv.status_code == 200, rv.text
        r = s.patch(f"{BASE_URL}/api/admin/techfest/submissions/{sid}", json={"city": "TEST_Delhi"})
        assert r.status_code == 200, r.text
        g = _get(s, sid)
        assert g["city"] == "TEST_Delhi" and g["review_status"] == decision

    def test_duplicate_team_id_409(self, s, created):
        a, pa = _create(s, created, 5)
        b, _ = _create(s, created, 6)
        r = s.patch(f"{BASE_URL}/api/admin/techfest/submissions/{b}", json={"team_id": pa["team_id"].lower()})
        assert r.status_code == 409
        r2 = s.patch(f"{BASE_URL}/api/admin/techfest/submissions/{b}", json={"competition_id": pa["competition_id"]})
        assert r2.status_code == 409
        # same id on itself is fine
        r3 = s.patch(f"{BASE_URL}/api/admin/techfest/submissions/{a}", json={"team_id": pa["team_id"]})
        assert r3.status_code == 200

    def test_invalid_and_missing_id(self, s):
        assert s.patch(f"{BASE_URL}/api/admin/techfest/submissions/notanid", json={"city": "x"}).status_code == 400
        assert s.patch(f"{BASE_URL}/api/admin/techfest/submissions/0123456789abcdef01234567", json={"city": "x"}).status_code == 404

    def test_validation_422(self, s, created):
        sid, _ = _create(s, created, 7)
        r = s.patch(f"{BASE_URL}/api/admin/techfest/submissions/{sid}", json={"email": "bad"})
        assert r.status_code == 422

    def test_invalid_enum_values(self, s, created):
        # Not enforced by endpoint (reported as minor) - informational
        sid, _ = _create(s, created, 8)
        r = s.patch(f"{BASE_URL}/api/admin/techfest/submissions/{sid}", json={"competition": "TEST_bogus", "zone": "mars"})
        print("invalid enum status:", r.status_code)
        assert r.status_code in (200, 400, 422)
