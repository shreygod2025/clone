# Helper: insert known OTP 123456 for phone:9999999999 (testing only)
import os, time, hashlib
from dotenv import load_dotenv
from pymongo import MongoClient
load_dotenv('/app/backend/.env')
db = MongoClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
i = 'phone:9999999999'
db.techfest_portal_otps.insert_one({'email': i, 'otp_hash': hashlib.sha256((i + '::123456').encode()).hexdigest(),
                                    'expires_at_ts': time.time() + 600, 'consumed': False})
print('ok')
