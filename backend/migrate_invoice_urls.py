"""
One-time migration script: fix invoice_url / receipt_url in school payment records.

Tasks:
1. In school_inquiries.payments (root-level array):
   - Set invoice_url="" → null  and  receipt_url="" → null  (all schools)
2. Clear test invoice/receipt values written during investigation for:
   - Walle  (has fake test-upload-url.com URL)
   - Followup Test 2  (has test Cloudinary upload)
   - Shreshth Daga School  (has test Cloudinary upload)
3. In expenses collection: set invoice_url="" → null

Run once from /app/backend:
    python migrate_invoice_urls.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

# Schools whose test invoice/receipt URLs should be fully cleared
TEST_SCHOOL_NAMES = ["Walle", "Followup Test 2", "Shreshth Daga School"]


async def run():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    school_coll = db["school_inquiries"]

    # ── 1. Load all schools that have a root-level payments array ────────────
    schools = await school_coll.find(
        {"payments": {"$exists": True, "$ne": []}},
        {"_id": 1, "school_name": 1, "payments": 1}
    ).to_list(length=None)

    print(f"Schools with payment records: {len(schools)}")

    empty_fixed = 0
    test_cleared = 0

    for school in schools:
        name = school.get("school_name", "")
        payments = school.get("payments", [])
        is_test_school = any(t.lower() in name.lower() for t in TEST_SCHOOL_NAMES)
        modified = False

        for p in payments:
            # Fix empty strings → None for all schools
            if p.get("invoice_url") == "":
                p["invoice_url"] = None
                modified = True
                empty_fixed += 1
            if p.get("receipt_url") == "":
                p["receipt_url"] = None
                modified = True
                empty_fixed += 1

            # Clear test uploads for specific schools
            if is_test_school:
                if p.get("invoice_url") is not None:
                    p["invoice_url"] = None
                    modified = True
                    test_cleared += 1
                if p.get("receipt_url") is not None:
                    p["receipt_url"] = None
                    modified = True
                    test_cleared += 1

        if modified:
            await school_coll.update_one(
                {"_id": school["_id"]},
                {"$set": {"payments": payments}}
            )
            action = "CLEARED (test school)" if is_test_school else "FIXED (empty → null)"
            print(f"  [{action}] {name}")

    print(f"\nSummary:")
    print(f"  Empty strings fixed (→ null): {empty_fixed}")
    print(f"  Test URLs cleared: {test_cleared}")

    # ── 2. Fix expenses collection empty invoice_url ─────────────────────────
    exp_res = await db["expenses"].update_many(
        {"invoice_url": ""},
        {"$set": {"invoice_url": None}}
    )
    print(f"  Expenses invoice_url fixed: {exp_res.modified_count}")

    # ── 3. Verification ──────────────────────────────────────────────────────
    pipeline = [
        {"$unwind": "$payments"},
        {"$match": {"payments.invoice_url": ""}},
        {"$count": "remaining"}
    ]
    remaining = await school_coll.aggregate(pipeline).to_list(1)
    print(f"\nVerification - remaining empty-string invoice_url: {remaining or [{'remaining': 0}]}")

    client.close()
    print("\nMigration complete.")


if __name__ == "__main__":
    asyncio.run(run())
