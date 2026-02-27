#!/usr/bin/env python3
"""
Script to fix tracking URLs in the database.
Replaces preview URLs with production vendorplus-4.emergent.host URLs.

Run this on your production database to fix existing records.
"""
import os
import sys
from pymongo import MongoClient

# Configuration
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "oll_db")
PROD_URL = "https://vendorplus-4.emergent.host"

PREVIEW_PATTERNS = [
    "oll-procure.preview.emergentagent.com",
    "procureway.preview.emergentagent.com",
    "vendorplus.preview.emergentagent.com",
    "procureway.stage-preview.emergentagent.com",
    "vendorplus.stage-preview.emergentagent.com",
    "oll-procure.stage-preview.emergentagent.com"
]

def transform_url(url):
    """Transform preview URL to production URL"""
    if not url:
        return url
    for pattern in PREVIEW_PATTERNS:
        if pattern in url:
            url = url.replace(f"https://{pattern}", PROD_URL)
            url = url.replace(f"http://{pattern}", PROD_URL)
    return url

def fix_tracking_urls():
    print(f"Connecting to MongoDB: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    print(f"Production URL: {PROD_URL}")
    print("-" * 50)
    
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    updated_count = 0
    
    # Find all school inquiries
    for school in db.school_inquiries.find({}):
        updates = {}
        school_name = school.get("school_name", "Unknown")
        
        # Path 1: onboarding_workflow.steps.kit_delivery.data.tracking_link
        tracking_link = (school.get("onboarding_workflow", {})
                        .get("steps", {})
                        .get("kit_delivery", {})
                        .get("data", {})
                        .get("tracking_link", ""))
        
        if tracking_link:
            new_link = transform_url(tracking_link)
            if new_link != tracking_link:
                updates["onboarding_workflow.steps.kit_delivery.data.tracking_link"] = new_link
                print(f"[{school_name}] Path 1: {tracking_link[:50]}... -> {new_link[:50]}...")
        
        # Path 2: steps.kit_delivery.data.tracking_link (alternate structure)
        tracking_link2 = (school.get("steps", {})
                         .get("kit_delivery", {})
                         .get("data", {})
                         .get("tracking_link", ""))
        
        if tracking_link2:
            new_link2 = transform_url(tracking_link2)
            if new_link2 != tracking_link2:
                updates["steps.kit_delivery.data.tracking_link"] = new_link2
                print(f"[{school_name}] Path 2: {tracking_link2[:50]}... -> {new_link2[:50]}...")
        
        # Apply updates
        if updates:
            db.school_inquiries.update_one({"_id": school["_id"]}, {"$set": updates})
            updated_count += 1
    
    print("-" * 50)
    print(f"Total schools updated: {updated_count}")
    client.close()

if __name__ == "__main__":
    fix_tracking_urls()
