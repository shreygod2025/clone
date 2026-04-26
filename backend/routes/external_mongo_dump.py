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

import asyncio
import csv
import io
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from pymongo import MongoClient

from .shared import get_current_user

router = APIRouter()


# ── In-memory job registry (process-local, fine for single-pod admin tool) ─
# Each job carries its own URI in memory only — never written to disk/db.
_JOBS: dict[str, dict] = {}
_JOBS_LOCK = threading.Lock()


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


# ── Per-collection BSON download (mongodump scoped to one collection) ──────
class CollectionExportRequest(BaseModel):
    uri: str
    db_name: str = Field(..., min_length=1)
    collection: str = Field(..., min_length=1)
    timeout_ms: int = Field(15000, ge=2000, le=60000)


@router.post("/admin/external-mongo/collection-bson")
async def export_collection_bson(
    body: CollectionExportRequest,
    user: dict = Depends(get_current_user),
):
    """Run `mongodump --db=X --collection=Y` and stream back a small zip
    containing `<coll>.bson` + `<coll>.metadata.json` — the canonical BSON
    format `mongorestore` consumes.
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    if not re.fullmatch(r"[A-Za-z0-9_.\-]+", body.db_name):
        raise HTTPException(status_code=400, detail="Invalid db_name")
    if not re.fullmatch(r"[A-Za-z0-9_.\-]+", body.collection):
        raise HTTPException(status_code=400, detail="Invalid collection name")

    redacted = _redact_uri(body.uri)
    out_dir = tempfile.mkdtemp(prefix=f"bson_{body.db_name}_{body.collection}_")
    cmd = [
        "mongodump",
        f"--uri={body.uri}",
        f"--db={body.db_name}",
        f"--collection={body.collection}",
        f"--out={out_dir}",
    ]
    logging.info(f"[external-mongo] BSON dump → {redacted} {body.db_name}.{body.collection}")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    except subprocess.TimeoutExpired:
        shutil.rmtree(out_dir, ignore_errors=True)
        raise HTTPException(status_code=504, detail="mongodump timed out (5 min)")

    if result.returncode != 0:
        shutil.rmtree(out_dir, ignore_errors=True)
        stderr = re.sub(r"://[^@\s]+@", "://<redacted>@", (result.stderr or "")[-1500:])
        raise HTTPException(status_code=502, detail=f"mongodump failed: {stderr.strip()[-400:]}")

    bson_path = os.path.join(out_dir, body.db_name, f"{body.collection}.bson")
    meta_path = os.path.join(out_dir, body.db_name, f"{body.collection}.metadata.json")
    if not os.path.isfile(bson_path):
        shutil.rmtree(out_dir, ignore_errors=True)
        raise HTTPException(status_code=502, detail="Dump produced no BSON (empty collection?)")

    # Bundle .bson + .metadata.json into a single zip so users get both files
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_db = re.sub(r"[^A-Za-z0-9_-]+", "_", body.db_name)
    safe_coll = re.sub(r"[^A-Za-z0-9_-]+", "_", body.collection)
    zip_path = os.path.join(tempfile.gettempdir(), f"bson_{safe_db}_{safe_coll}_{timestamp}.zip")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        zf.write(bson_path, arcname=f"{body.db_name}/{body.collection}.bson")
        if os.path.isfile(meta_path):
            zf.write(meta_path, arcname=f"{body.db_name}/{body.collection}.metadata.json")
    shutil.rmtree(out_dir, ignore_errors=True)

    filename = f"{safe_db}__{safe_coll}_{timestamp}.bson.zip"

    def file_iter():
        try:
            with open(zip_path, "rb") as fh:
                while True:
                    chunk = fh.read(64 * 1024)
                    if not chunk:
                        break
                    yield chunk
        finally:
            try:
                os.remove(zip_path)
            except Exception:
                pass

    return StreamingResponse(
        file_iter(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Async JSONL ZIP with live "X of Y" progress ────────────────────────────
class StartJobRequest(BaseModel):
    uri: str
    db_name: Optional[str] = None
    timeout_ms: int = Field(15000, ge=2000, le=60000)


def _set_job(job_id: str, **patch):
    with _JOBS_LOCK:
        if job_id in _JOBS:
            _JOBS[job_id].update(patch)


def _run_zip_job_sync(job_id: str, uri: str, db_name: Optional[str], timeout_ms: int):
    """Background worker — uses synchronous pymongo to keep things simple.
    Runs in a thread so the FastAPI event loop stays responsive.
    """
    redacted = _redact_uri(uri)
    client = None
    try:
        _set_job(job_id, status="connecting", message=f"Connecting to {redacted}…")
        client = MongoClient(uri, serverSelectionTimeoutMS=timeout_ms)
        client.admin.command("ping")

        if db_name:
            db_names = [db_name]
        else:
            try:
                db_names = client.list_database_names()
            except Exception:
                from urllib.parse import urlparse
                parsed = urlparse(uri)
                fallback = (parsed.path or "/").lstrip("/").split("?")[0]
                db_names = [fallback] if fallback else []
        skip = {"admin", "local", "config"}
        db_names = [d for d in db_names if d and d not in skip]
        if not db_names:
            raise RuntimeError("No accessible databases on this URI")

        # Plan: list every collection up front so progress total is accurate
        plan: list[tuple[str, str, int]] = []
        for d in db_names:
            try:
                colls = client[d].list_collection_names()
            except Exception as e:
                logging.warning(f"[job {job_id}] list {d} failed: {e}")
                continue
            for c in colls:
                if c.startswith("system."):
                    continue
                try:
                    cnt = client[d][c].estimated_document_count()
                except Exception:
                    cnt = -1
                plan.append((d, c, cnt))

        total = len(plan)
        _set_job(job_id, status="running", total=total, completed=0,
                 current_collection=None, message=f"Exporting {total} collections…",
                 plan=[{"db": d, "collection": c, "count": cnt} for d, c, cnt in plan])

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        zip_path = os.path.join(tempfile.gettempdir(), f"external_export_{job_id}_{timestamp}.zip")
        summary = []
        total_docs = 0
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            for idx, (d, c, expected) in enumerate(plan, 1):
                _set_job(job_id, completed=idx - 1, current_collection=f"{d}.{c}",
                         message=f"Exporting {idx}/{total}: {d}.{c}")
                # Stream collection straight to a per-collection JSONL inside the zip
                try:
                    cursor = client[d][c].find({})
                    # Build the JSONL as a single string per collection — safe for
                    # legacy DBs whose collections are typically small/medium. For
                    # genuinely huge ones, the .archive.gz endpoint is preferred.
                    lines = []
                    for doc in cursor:
                        lines.append(json.dumps(_stringify(doc), default=str, ensure_ascii=False))
                    zf.writestr(f"{d}/{c}.jsonl", "\n".join(lines))
                    summary.append({"db": d, "collection": c, "documents": len(lines)})
                    total_docs += len(lines)
                except Exception as e:
                    logging.warning(f"[job {job_id}] read fail {d}.{c}: {e}")
                    summary.append({"db": d, "collection": c, "documents": 0,
                                    "error": str(e)[:200]})
                _set_job(job_id, completed=idx, total_docs=total_docs)

            manifest = {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "source": redacted,
                "databases": db_names,
                "collections": summary,
                "total_documents": total_docs,
                "restore_hint": (
                    "For each <db>/<coll>.jsonl run: "
                    "mongoimport --uri='<TARGET>' --db=<db> --collection=<coll> "
                    "--file=<db>/<coll>.jsonl"
                ),
            }
            zf.writestr("MANIFEST.json", json.dumps(manifest, indent=2, default=str))

        size_mb = round(os.path.getsize(zip_path) / 1024 / 1024, 2)
        _set_job(job_id, status="ready", message=f"Done · {total} collections · {total_docs:,} docs · {size_mb} MB",
                 zip_path=zip_path, size_mb=size_mb, finished_at=datetime.now(timezone.utc).isoformat())
    except Exception as e:
        logging.warning(f"[job {job_id}] failed: {type(e).__name__}: {str(e)[:200]}")
        _set_job(job_id, status="error",
                 error=f"{type(e).__name__}: {str(e)[:300]}",
                 message=f"Failed: {str(e)[:200]}")
    finally:
        try:
            if client:
                client.close()
        except Exception:
            pass


@router.post("/admin/external-mongo/start-zip-job")
async def start_zip_job(
    body: StartJobRequest,
    user: dict = Depends(get_current_user),
):
    """Kick off a background JSONL-zip export with live progress tracking.
    Returns a job_id you can poll via /admin/external-mongo/job/{id}.
    """
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    job_id = uuid.uuid4().hex[:12]
    with _JOBS_LOCK:
        # Drop any jobs older than 1 hour so the registry doesn't bloat
        cutoff = time.time() - 3600
        for jid in list(_JOBS):
            if _JOBS[jid].get("started_at_ts", 0) < cutoff:
                # Clean up any leftover zip on disk
                zp = _JOBS[jid].get("zip_path")
                if zp and os.path.exists(zp):
                    try:
                        os.remove(zp)
                    except Exception:
                        pass
                _JOBS.pop(jid, None)
        _JOBS[job_id] = {
            "id": job_id,
            "status": "queued",
            "started_at_ts": time.time(),
            "started_at": datetime.now(timezone.utc).isoformat(),
            "total": 0, "completed": 0, "total_docs": 0,
            "current_collection": None,
            "db_name": body.db_name,
            "message": "Queued",
        }

    threading.Thread(
        target=_run_zip_job_sync,
        args=(job_id, body.uri, body.db_name, body.timeout_ms),
        daemon=True,
        name=f"export-zip-{job_id}",
    ).start()
    return {"job_id": job_id, "status": "queued"}


@router.get("/admin/external-mongo/job/{job_id}")
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    """Poll a job's progress. Safe to hit every 500-1000ms while running."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Unknown job_id")
        # Don't ever leak the zip_path or any uri in the JSON response
        public = {k: v for k, v in job.items() if k not in ("zip_path", "started_at_ts")}
    return public


@router.get("/admin/external-mongo/job/{job_id}/download")
async def download_job(job_id: str, user: dict = Depends(get_current_user)):
    """Download the resulting zip — only valid once status='ready'."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Unknown job_id")
    if job.get("status") != "ready":
        raise HTTPException(status_code=409, detail=f"Job is {job.get('status')}, not ready")
    zip_path = job.get("zip_path")
    if not zip_path or not os.path.isfile(zip_path):
        raise HTTPException(status_code=410, detail="Job artefact already removed — re-run the job")

    filename = f"external_export_{job_id}.zip"

    def file_iter():
        try:
            with open(zip_path, "rb") as fh:
                while True:
                    chunk = fh.read(64 * 1024)
                    if not chunk:
                        break
                    yield chunk
        finally:
            try:
                os.remove(zip_path)
            except Exception:
                pass
            with _JOBS_LOCK:
                if job_id in _JOBS:
                    _JOBS[job_id]["status"] = "downloaded"
                    _JOBS[job_id].pop("zip_path", None)

    return StreamingResponse(
        file_iter(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
