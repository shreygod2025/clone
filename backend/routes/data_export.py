"""
Admin Data Export — list every database/collection and export to CSV/JSON.

Lets the admin point at any MongoDB the server can see (default DB + any sibling
DBs like `eventmate19`) and pull all data out for migration.

Notes:
  • bcrypt password hashes are kept as-is (they're one-way, no "decryption" possible).
    When you restore to your own MongoDB, existing passwords keep working.
  • ObjectId and datetime fields are stringified so the export is portable.
"""
from __future__ import annotations

import csv
import io
import json
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from .shared import get_current_user

router = APIRouter()

# Reuse a single client for all export requests so we don't churn connections
_client: Optional[AsyncIOMotorClient] = None


def _get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return _client


# Default DB the app uses — always allow it; allow others if listDatabases is permitted.
_PRIMARY_DB = os.environ.get("DB_NAME", "")


def _is_admin(user: dict) -> bool:
    role = (user or {}).get("role", "")
    email = (user or {}).get("email", "")
    return role in ("admin", "super_admin") or email.endswith("@oll.co")


def _stringify(value):
    """Make any BSON value JSON/CSV-safe."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [_stringify(v) for v in value]
    if isinstance(value, dict):
        return {k: _stringify(v) for k, v in value.items()}
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8", errors="replace")
        except Exception:
            return repr(value)
    return value


def _flatten(d: dict, parent_key: str = "", sep: str = ".") -> dict:
    """Flatten nested dicts using dot-paths so CSV columns stay tidy."""
    items = {}
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.update(_flatten(v, new_key, sep=sep))
        elif isinstance(v, list):
            # Lists are JSON-encoded inline so they're a single CSV cell
            items[new_key] = json.dumps(_stringify(v), default=str, ensure_ascii=False)
        else:
            items[new_key] = _stringify(v)
    return items


# ── Endpoints ─────────────────────────────────────────────────────────────
@router.get("/admin/data-export/databases")
async def list_databases(user: dict = Depends(get_current_user)):
    """List every database the connected user can see (default DB + siblings)."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    client = _get_client()
    try:
        names = await client.list_database_names()
    except Exception as e:
        # If listDatabases isn't allowed for this user, still surface the primary DB
        logging.warning(f"[data-export] listDatabases failed: {e}")
        names = [_PRIMARY_DB] if _PRIMARY_DB else []

    # Filter out internal Mongo DBs the user can't usefully export
    skip = {"admin", "local", "config"}
    out = []
    for name in names:
        if name in skip:
            continue
        try:
            stats = await client[name].command("dbstats")
            out.append({
                "name": name,
                "collections": stats.get("collections", 0),
                "objects": stats.get("objects", 0),
                "size_mb": round((stats.get("dataSize") or 0) / (1024 * 1024), 2),
                "is_primary": name == _PRIMARY_DB,
            })
        except Exception as e:
            out.append({"name": name, "collections": 0, "objects": 0, "size_mb": 0,
                        "is_primary": name == _PRIMARY_DB, "error": str(e)[:120]})
    out.sort(key=lambda x: (not x.get("is_primary"), x["name"]))
    return {"databases": out, "primary": _PRIMARY_DB}


@router.get("/admin/data-export/{db_name}/collections")
async def list_collections(db_name: str, user: dict = Depends(get_current_user)):
    """List every collection in the chosen database, with document counts."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    db = _get_client()[db_name]
    try:
        names = await db.list_collection_names()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cannot read {db_name}: {e}")
    out = []
    for name in names:
        if name.startswith("system."):
            continue
        try:
            count = await db[name].estimated_document_count()
        except Exception:
            count = -1
        out.append({"name": name, "count": count})
    out.sort(key=lambda c: (-c["count"], c["name"]))
    return {"db": db_name, "collections": out}


@router.get("/admin/data-export/{db_name}/{collection}/preview")
async def preview_collection(
    db_name: str,
    collection: str,
    limit: int = Query(10, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """Return a small sample so the admin can see the shape before exporting."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    db = _get_client()[db_name]
    cursor = db[collection].find({}).limit(limit)
    rows = []
    async for doc in cursor:
        rows.append(_stringify(doc))
    total = await db[collection].estimated_document_count()
    return {"db": db_name, "collection": collection, "rows": rows, "total": total}


@router.get("/admin/data-export/{db_name}/{collection}/csv")
async def export_collection_csv(
    db_name: str,
    collection: str,
    user: dict = Depends(get_current_user),
):
    """Stream the entire collection as CSV with flattened dot-path columns."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    db = _get_client()[db_name]
    if collection not in await db.list_collection_names():
        raise HTTPException(status_code=404, detail="Collection not found")

    async def row_iter():
        # Pass 1: collect headers (we walk all docs once for stability;
        # for >100k docs admins should use the JSON / mongodump export)
        headers = ["_id"]
        seen = {"_id"}
        # We materialize a small first batch to determine headers, then stream rest
        first_batch: list = []
        async for doc in db[collection].find({}).limit(2000):
            flat = _flatten(_stringify(doc))
            first_batch.append(flat)
            for k in flat:
                if k not in seen:
                    seen.add(k)
                    headers.append(k)

        # Write CSV header + first batch rows
        sio = io.StringIO()
        writer = csv.DictWriter(sio, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in first_batch:
            writer.writerow({h: row.get(h, "") for h in headers})
        yield sio.getvalue().encode("utf-8")
        sio.seek(0)
        sio.truncate()

        # Stream remaining docs (skip = batch size used)
        async for doc in db[collection].find({}).skip(len(first_batch)):
            flat = _flatten(_stringify(doc))
            # Add any newly-discovered headers as extra columns are silently dropped
            # by extrasaction="ignore" — to avoid losing data, we encode unknowns into
            # a special "_extras" column if present
            extras = {k: v for k, v in flat.items() if k not in seen}
            row = {h: flat.get(h, "") for h in headers}
            if extras:
                if "_extras" not in headers:
                    # Append _extras column to subsequent rows only — emit a comment row
                    # explaining (CSV-safe) and from now on include it
                    headers.append("_extras")
                    seen.add("_extras")
                row["_extras"] = json.dumps(extras, default=str, ensure_ascii=False)
            writer = csv.DictWriter(sio, fieldnames=headers, extrasaction="ignore")
            writer.writerow(row)
            yield sio.getvalue().encode("utf-8")
            sio.seek(0)
            sio.truncate()

    filename = f"{db_name}__{collection}.csv"
    return StreamingResponse(
        row_iter(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/admin/data-export/{db_name}/{collection}/json")
async def export_collection_json(
    db_name: str,
    collection: str,
    user: dict = Depends(get_current_user),
):
    """Stream the entire collection as JSON Lines (one JSON object per line)."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    db = _get_client()[db_name]
    if collection not in await db.list_collection_names():
        raise HTTPException(status_code=404, detail="Collection not found")

    async def line_iter():
        async for doc in db[collection].find({}):
            yield (json.dumps(_stringify(doc), default=str, ensure_ascii=False) + "\n").encode("utf-8")

    filename = f"{db_name}__{collection}.jsonl"
    return StreamingResponse(
        line_iter(),
        media_type="application/x-ndjson",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
