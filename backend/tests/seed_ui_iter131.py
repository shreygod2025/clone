import os, sys, json, uuid, requests
BASE = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
s = requests.Session()
t = s.post(f"{BASE}/api/auth/login", json={"email": "admin@oll.co", "password": "GodisGreat@2026"}).json()['access_token']
s.headers['Authorization'] = f'Bearer {t}'
rows = [
    ("Zara Test", "TEST_Alpha School", "robo_sumo", "north", "junior", None),
    ("Aaron Test", "TEST_Zeta School", "robo_race", "south", "senior", "approved"),
    ("Mona Test", "TEST_Beta School", "robo_innovation", None, "junior", "rejected"),
    ("Bob Test", "TEST_Gamma School", "robo_sumo", "south", "senior", "final_rejected"),
    ("Carl Test", "TEST_Delta School", "robo_race", "north", "junior", None),
]
ids = []
for i, (name, school, comp, zone, age, dec) in enumerate(rows):
    u = uuid.uuid4().hex[:6]
    p = {"full_name": f"TEST_{name}", "date_of_birth": "2010-01-01", "email": f"e1-test-ui{i}-{u}@oll.co",
         "phone": "9999999999", "country": "India", "pincode": "400001", "state": "Maharashtra", "city": "Mumbai",
         "school_or_college": school, "age_category": age, "id_proof_url": "https://example.com/id.png",
         "id_proof_type": "Aadhar card", "competition": comp, "zone": zone, "team_id": f"TEST-UI-T-{u}",
         "competition_id": f"TEST-UI-C-{u}", "drive_link": "https://drive.google.com/x",
         "team_members": [{"name": f"TEST_Mem{i}"}]}
    r = s.post(f"{BASE}/api/admin/techfest/submissions", json=p); r.raise_for_status()
    sid = r.json()['id']; ids.append(sid)
    if dec:
        s.patch(f"{BASE}/api/admin/techfest/submissions/{sid}/review", json={"decision": dec, "remarks": "test"}).raise_for_status()
json.dump(ids, open('/tmp/ui_seed_ids.json', 'w'))
print(ids)
