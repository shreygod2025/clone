"""Idempotent rewrite of retired vendor-panel hosts stored in Mongo.

Human-facing pages (tracking, login, panel) → new Vercel panel; file/API
paths (/api/...) → new vendor API host (Vercel serves only the SPA).
"""
import logging
import os
import re

from .shared import db

PANEL = os.environ.get("PO_TRACKING_URL", "https://vendor-panel-1rt3.vercel.app").rstrip("/")
API_HOST = re.sub(r"/api/.*$", "", os.environ.get("VENDOR_PUBLIC_API", "https://vendor-panel-6kjc.onrender.com/api/public"))
OLD = r"(?:https?://)?(?:vendorplus-4\.emergent\.host|oll-procure\.preview\.emergentagent\.com)"
_API_RE = re.compile(OLD + r"(?=/api/)")
_PAGE_RE = re.compile(OLD)
COLLECTIONS = ["shop_orders", "shop_product_overrides", "support_queries", "school_expenses",
               "shop_purchase_orders", "school_inquiries", "schools", "email_templates", "settings"]


def rewrite(value):
    if isinstance(value, str):
        api_host = API_HOST.split("://", 1)[1] if "weserv.nl" in value else API_HOST
        return _PAGE_RE.sub(PANEL, _API_RE.sub(api_host, value)) if "vendorplus-4" in value or "oll-procure" in value else value
    if isinstance(value, list):
        return [rewrite(v) for v in value]
    if isinstance(value, dict):
        return {k: rewrite(v) for k, v in value.items()}
    return value


async def migrate_vendor_links() -> int:
    changed = 0
    for name in COLLECTIONS:
        coll = db[name]
        async for doc in coll.find({}):
            new = {k: rewrite(v) for k, v in doc.items() if k != "_id"}
            diff = {k: v for k, v in new.items() if v != doc.get(k)}
            if diff:
                await coll.update_one({"_id": doc["_id"]}, {"$set": diff})
                changed += 1
    if changed:
        logging.info("[vendor-link-migration] rewrote %d docs", changed)
    return changed
