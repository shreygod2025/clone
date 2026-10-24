# Future Skills CRM — lead assignee feature (iteration 128)
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api/admin/future-skills"


def _login(email, pw):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed for {email}")
    d = r.json()
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {d['access_token']}", "Content-Type": "application/json"})
    s.uid = d["user"]["id"]
    return s


@pytest.fixture(scope="module")
def admin():
    return _login("admin@oll.co", "GodisGreat@2026")


@pytest.fixture(scope="module")
def m1():
    return _login("fs.member1@oll.co", "FsTest@2026")


@pytest.fixture(scope="module")
def m2():
    return _login("fs.member2@oll.co", "FsTest@2026")


@pytest.fixture(scope="module")
def created(admin):
    ids = {"leads": [], "trials": []}
    yield ids
    for t in ids["trials"]:
        admin.delete(f"{API}/trial/{t}")
    for lid in ids["leads"]:
        admin.delete(f"{API}/leads/{lid}")


def _new_lead(admin, created, tag="A"):
    phone = "9" + str(uuid.uuid4().int)[:9]
    r = admin.post(f"{API}/leads", json={"name": f"TEST_assignee_{tag}", "phone": phone})
    assert r.status_code == 200, r.text
    lid = r.json()["lead"]["id"]
    created["leads"].append(lid)
    return lid


def _assign(s, entity, eid, aid):
    return s.patch(f"{API}/{entity}/{eid}/assign", json={"assignee_id": aid})


def _lead_ids(s, **params):
    r = s.get(f"{API}/leads", params=params)
    assert r.status_code == 200, r.text
    return {x["id"]: x for x in r.json()["leads"]}, r.json().get("stats", {})


# Assignees endpoint
class TestAssignees:
    def test_admin_assignees(self, admin, m1, m2):
        r = admin.get(f"{API}/assignees")
        assert r.status_code == 200
        d = r.json()
        assert d["is_manager"] is True and d["me"] == admin.uid
        ids = {a["id"] for a in d["assignees"]}
        assert m1.uid in ids and m2.uid in ids

    def test_member_assignees(self, m1):
        d = m1.get(f"{API}/assignees").json()
        assert d["is_manager"] is False and d["me"] == m1.uid


# Assign rules
class TestAssignRules:
    def test_invalid_entity(self, admin, created):
        lid = _new_lead(admin, created, "inv")
        assert _assign(admin, "foo", lid, None).status_code == 400

    def test_unknown_assignee(self, admin, created):
        lid = _new_lead(admin, created, "unk")
        assert _assign(admin, "leads", lid, "nope-" + uuid.uuid4().hex).status_code == 400

    def test_not_found(self, admin):
        assert _assign(admin, "leads", "nonexistent-" + uuid.uuid4().hex, None).status_code == 404

    def test_member_flow(self, admin, m1, m2, created):
        lid = _new_lead(admin, created, "flow")
        # member1 self-assigns unassigned lead
        r = _assign(m1, "leads", lid, m1.uid)
        assert r.status_code == 200 and r.json()["assignee_id"] == m1.uid
        # visibility: m1 sees, m2 doesn't
        assert lid in _lead_ids(m1)[0]
        assert lid not in _lead_ids(m2)[0]
        # m2 cannot grab or unassign
        assert _assign(m2, "leads", lid, m2.uid).status_code == 403
        assert _assign(m2, "leads", lid, None).status_code == 403
        # m1 filters
        assert lid in _lead_ids(m1, assignee="me")[0]
        assert lid not in _lead_ids(m1, assignee="unassigned")[0]
        # m1 can't bypass via assignee=<m2 id> or all
        rows, _ = _lead_ids(m1, assignee="all")
        assert all((x.get("assignee_id") in (None, "", m1.uid)) for x in rows.values())
        # admin filter by member
        assert lid in _lead_ids(admin, assignee=m1.uid)[0]
        # m1 hands over to m2
        assert _assign(m1, "leads", lid, m2.uid).status_code == 200
        assert lid not in _lead_ids(m1)[0]
        assert lid in _lead_ids(m2)[0]
        # admin reassigns any + unassign
        assert _assign(admin, "leads", lid, m1.uid).status_code == 200
        r = _assign(admin, "leads", lid, None)
        assert r.status_code == 200 and r.json()["assignee_id"] is None
        # m2 assigns unassigned lead to m1
        assert _assign(m2, "leads", lid, m1.uid).status_code == 200
        # m1 unassigns own lead
        assert _assign(m1, "leads", lid, None).status_code == 200
        assert lid in _lead_ids(m2)[0]

    def test_member_cannot_see_others_in_any_list(self, m1):
        for ep, key in [("leads", "leads"), ("trials", "trials"), ("subscriptions", "subscriptions"),
                        ("renewals", "renewals"), ("lost", "lost")]:
            r = m1.get(f"{API}/{ep}")
            assert r.status_code == 200, f"{ep}: {r.text[:200]}"
            for x in r.json().get(key, []):
                assert x.get("assignee_id") in (None, "", m1.uid), f"{ep} leaked {x.get('id')}"


# Carry-over + stats
class TestCarryOver:
    def test_convert_carries_assignee(self, admin, m1, created):
        lid = _new_lead(admin, created, "conv")
        assert _assign(admin, "leads", lid, m1.uid).status_code == 200
        r = admin.post(f"{API}/leads/{lid}/convert-to-trial")
        assert r.status_code == 200, r.text
        trials = admin.get(f"{API}/trials", params={"q": "TEST_assignee_conv"}).json()["trials"]
        t = [x for x in trials if x.get("source_lead_id") == lid]
        assert t, "trial not found"
        created["trials"].append(t[0]["id"])
        assert t[0]["assignee_id"] == m1.uid
        # reassign lead -> trial follows
        assert _assign(admin, "leads", lid, None).status_code == 200
        trials = admin.get(f"{API}/trials", params={"q": "TEST_assignee_conv"}).json()["trials"]
        t = [x for x in trials if x["id"] == created["trials"][-1]][0]
        assert not t.get("assignee_id")
        # trial assign endpoint
        assert _assign(admin, "trials", t["id"], m1.uid).status_code == 200
        assert _assign(admin, "trials", t["id"], None).status_code == 200

    def test_stats_scoped(self, admin, m1):
        a = admin.get(f"{API}/stats")
        b = m1.get(f"{API}/stats")
        assert a.status_code == 200 and b.status_code == 200
        print("admin stats", a.json(), "m1 stats", b.json())
        _, sa = _lead_ids(admin)
        _, sm = _lead_ids(m1)
        assert sm.get("total", 0) <= sa.get("total", 0)
