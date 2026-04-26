"""
Admin External MongoDB Dump — connect to ANY MongoDB URI (e.g. legacy Atlas
clusters that aren't part of this app) and pull data out via mongodump or a
direct JSONL/CSV export.

Used to recover legacy data such as the eventmate-19 cluster used by older
funnels (camp-lead-capture / multi-funnel-oll).

⚠️ The submitted URI is held in memory only for the duration of the request,
   never persisted, never logged. Logs always show a redacted host-only form.
"""
from __future__ import annotations

import io
import json
import logging
import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from pymongo import MongoClient

from .shared import get_current_user

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────
def _is_admin(user: dict) -> bool:
    role = (user or {}).get("role", "")
    email = (user or {}).get("email", "")
    return role in ("admin", "super_admin") or email.endswith("@oll.co")


def _redact_uri(uri: str) -> str:
    """Strip credentials from a Mongo URI for safe logging."""
    if not uri:
        return ""
    return re.sub(r"://[^@]+@", "://<redacted>@", uri)


def _stringify(value):
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


# ── Models ─────────────────────────────────────────────────────────────────
class ExternalUriRequest(BaseModel):
    uri: str = Field(..., description="MongoDB connection string (mongodb:// or mongodb+srv://)")
    db_name: Optional[str] = Field(None, description="If set, restrict to this single database")
    timeout_ms: int = Field(15000, ge=2000, le=60000)


class ExternalDumpRequest(ExternalUriRequest):
    # mongodump archive format produces a single .gz file ready for `mongorestore --archive=`
    pass


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.post("/admin/external-mongo/inspect")
async def inspect_external(
    body: ExternalUriRequest,
    user: dict = Depends(get_current_user),
):
    """Connect to the given URI and return a list of databases + collection counts.
    Lets the admin verify the cluster is reachable BEFORE running a full dump.
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    redacted = _redact_uri(body.uri)
    client = None
    try:
        client = MongoClient(body.uri, serverSelectionTimeoutMS=body.timeout_ms)
        # Force a server selection so we fail fast on bad URI / IP allowlist issues
        client.admin.command("ping")

        if body.db_name:
            db_names = [body.db_name]
        else:
            try:
                db_names = client.list_database_names()
            except Exception as e:
                logging.warning(f"[external-mongo] listDatabases denied for {redacted}: {e}")
                # The user role may not have listDatabases — fall back to what's
                # implied by the URI's defaultauthdb, if any.
                from urllib.parse import urlparse
                parsed = urlparse(body.uri)
                default_db = (parsed.path or "/").lstrip("/").split("?")[0]
                db_names = [default_db] if default_db else []

        skip = {"admin", "local", "config"}
        out = []
        for name in db_names:
            if not name or name in skip:
                continue
            db = client[name]
            try:
                colls = db.list_collection_names()
            except Exception as e:
                out.append({"name": name, "error": str(e)[:200]})
                continue
            coll_info = []
            total_docs = 0
            for coll in colls:
                if coll.startswith("system."):
                    continue
                try:
                    count = db[coll].estimated_document_count()
                except Exception:
                    count = -1
                total_docs += max(count, 0)
                coll_info.append({"name": coll, "count": count})
            coll_info.sort(key=lambda c: (-c["count"], c["name"]))
            out.append({"name": name, "collections": coll_info, "total_documents": total_docs})

        return {"connected_to": redacted, "databases": out}

    except Exception as e:
        logging.warning(f"[external-mongo] inspect failed {redacted}: {type(e).__name__}: {str(e)[:200]}")
        raise HTTPException(status_code=502, detail=f"Could not connect: {type(e).__name__}: {str(e)[:200]}")
    finally:
        try:
            if client:
                client.close()
        except Exception:
            pass


@router.post("/admin/external-mongo/dump")
async def dump_external(
    body: ExternalDumpRequest,
    user: dict = Depends(get_current_user),
):
    """Run `mongodump --uri=… --gzip --archive=…` against the supplied cluster
    and stream the resulting single-file archive back as a download.

    The archive can be restored with:
        mongorestore --uri="<your-target-uri>" --gzip --archive=<file>
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    redacted = _redact_uri(body.uri)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_db = re.sub(r"[^A-Za-z0-9_-]+", "_", body.db_name or "all-dbs")
    archive_path = tempfile.NamedTemporaryFile(
        delete=False,
        prefix=f"external_dump_{safe_db}_{timestamp}_",
        suffix=".archive.gz",
    ).name

    cmd = [
        "mongodump",
        f"--uri={body.uri}",
        "--gzip",
        f"--archive={archive_path}",
    ]
    if body.db_name:
        cmd.append(f"--db={body.db_name}")

    logging.info(f"[external-mongo] mongodump → {redacted} db={body.db_name or '(all)'} → {archive_path}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minutes — big legacy DB
        )
    except subprocess.TimeoutExpired:
        try:
            os.remove(archive_path)
        except Exception:
            pass
        raise HTTPException(status_code=504, detail="mongodump timed out after 10 minutes")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="mongodump binary not installed on server")

    if result.returncode != 0:
        # Strip any stray credentials from stderr before bubbling up
        stderr = (result.stderr or "")[-1500:]
        stderr = re.sub(r"://[^@\s]+@", "://<redacted>@", stderr)
        try:
            os.remove(archive_path)
        except Exception:
            pass
        logging.error(f"[external-mongo] mongodump failed: {stderr}")
        raise HTTPException(status_code=502, detail=f"mongodump failed: {stderr.strip()[-400:]}")

    if not os.path.exists(archive_path) or os.path.getsize(archive_path) == 0:
        raise HTTPException(status_code=502, detail="mongodump produced no archive (was the DB empty or unreachable?)")

    size_mb = round(os.path.getsize(archive_path) / 1024 / 1024, 2)
    logging.info(f"[external-mongo] dump complete → {archive_path} ({size_mb} MB)")

    filename = f"mongodump_{safe_db}_{timestamp}.archive.gz"

    def file_iter():
        try:
            with open(archive_path, "rb") as fh:
                while True:
                    chunk = fh.read(64 * 1024)
                    if not chunk:
                        break
                    yield chunk
        finally:
            try:
                os.remove(archive_path)
            except Exception:
                pass

    return StreamingResponse(
        file_iter(),
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Restore-Hint": "mongorestore --uri='<TARGET>' --gzip --archive=" + filename,
            "X-Dump-Size-MB": str(size_mb),
        },
    )


@router.post("/admin/external-mongo/jsonl-zip")
async def export_external_as_zip(
    body: ExternalUriRequest,
    user: dict = Depends(get_current_user),
):
    """Read every collection of every (or specified) DB on the external cluster
    and bundle them as JSONL files inside a single ZIP. Useful when the target
    Mongo server is older or you don't want to install mongorestore.
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    import zipfile

    redacted = _redact_uri(body.uri)
    client = None
    try:
        client = MongoClient(body.uri, serverSelectionTimeoutMS=body.timeout_ms)
        client.admin.command("ping")

        if body.db_name:
            db_names = [body.db_name]
        else:
            try:
                db_names = client.list_database_names()
            except Exception:
                from urllib.parse import urlparse
                parsed = urlparse(body.uri)
                default_db = (parsed.path or "/").lstrip("/").split("?")[0]
                db_names = [default_db] if default_db else []
        skip = {"admin", "local", "config"}
        db_names = [d for d in db_names if d and d not in skip]
        if not db_names:
            raise HTTPException(status_code=400, detail="No accessible databases on this URI")

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip", prefix=f"external_export_{timestamp}_")
        tmp.close()

        summary = []
        with zipfile.ZipFile(tmp.name, mode="w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            for db_name in db_names:
                db = client[db_name]
                try:
                    colls = db.list_collection_names()
                except Exception as e:
                    logging.warning(f"[external-mongo] cannot list {db_name}: {e}")
                    continue
                for coll in colls:
                    if coll.startswith("system."):
                        continue
                    try:
                        cursor = db[coll].find({})
                        lines = []
                        count = 0
                        for doc in cursor:
                            lines.append(json.dumps(_stringify(doc), default=str, ensure_ascii=False))
                            count += 1
                        zf.writestr(f"{db_name}/{coll}.jsonl", "\n".join(lines))
                        summary.append({"db": db_name, "collection": coll, "documents": count})
                    except Exception as e:
                        logging.warning(f"[external-mongo] read fail {db_name}.{coll}: {e}")

            manifest = {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "source": redacted,
                "databases": db_names,
                "collections": summary,
                "total_documents": sum(c["documents"] for c in summary),
                "restore_hint": (
                    "For each <db>/<coll>.jsonl: "
                    "mongoimport --uri='<TARGET>' --db=<db> --collection=<coll> --file=<db>/<coll>.jsonl"
                ),
            }
            zf.writestr("MANIFEST.json", json.dumps(manifest, indent=2, default=str))

        zip_filename = f"external_export_{timestamp}.zip"

        def file_iter():
            try:
                with open(tmp.name, "rb") as fh:
                    while True:
                        chunk = fh.read(64 * 1024)
                        if not chunk:
                            break
                        yield chunk
            finally:
                try:
                    os.remove(tmp.name)
                except Exception:
                    pass

        return StreamingResponse(
            file_iter(),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.warning(f"[external-mongo] zip-export failed {redacted}: {type(e).__name__}: {str(e)[:200]}")
        raise HTTPException(status_code=502, detail=f"Export failed: {type(e).__name__}: {str(e)[:200]}")
    finally:
        try:
            if client:
                client.close()
        except Exception:
            pass


@router.get("/admin/external-mongo/outbound-ip")
async def outbound_ip(user: dict = Depends(get_current_user)):
    """Return the public outbound IP this server uses — needed to allowlist on
    Atlas Network Access settings before connecting to a private cluster.
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    import urllib.request
    for url in ("https://api.ipify.org", "https://ifconfig.me/ip", "https://checkip.amazonaws.com"):
        try:
            ip = urllib.request.urlopen(url, timeout=4).read().decode().strip()
            return {"ip": ip, "source": url}
        except Exception:
            continue
    raise HTTPException(status_code=502, detail="Could not detect outbound IP")
