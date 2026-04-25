"""
Admin DB Backup Routes — trigger backup and download via API
"""
import os
import glob
import subprocess
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse

from .shared import get_current_user

router = APIRouter()

BACKUP_DIR = "/app/backups"
BACKUP_SCRIPT = "/app/backups/backup.sh"
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "test_database")


def _latest_backup():
    """Return path of the most recent backup file."""
    files = sorted(glob.glob(f"{BACKUP_DIR}/oll_db_backup_*.tar.gz"), reverse=True)
    return files[0] if files else None


@router.post("/admin/db-backup/create")
async def create_backup(user: dict = Depends(get_current_user)):
    """Trigger a fresh DB backup. Dumps EVERY non-system database the server can see
    (test_database + oll_hub + oll_multiuser + teach_n_learn + …) into one archive."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    archive = f"{BACKUP_DIR}/oll_db_backup_{timestamp}.tar.gz"
    tmp_dir = f"{BACKUP_DIR}/tmp_{timestamp}"
    os.makedirs(tmp_dir, exist_ok=True)

    # Determine which databases to dump — skip Mongo internal DBs
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(MONGO_URL)
        all_dbs = await client.list_database_names()
        client.close()
    except Exception as e:
        logging.warning(f"listDatabases failed, falling back to primary db only: {e}")
        all_dbs = [DB_NAME]
    skip = {"admin", "local", "config"}
    target_dbs = [d for d in all_dbs if d and d not in skip]
    if not target_dbs:
        target_dbs = [DB_NAME]

    # mongodump each DB into its own folder under tmp_dir
    for db_name in target_dbs:
        dump_result = subprocess.run(
            ["mongodump", f"--uri={MONGO_URL}", f"--db={db_name}", f"--out={tmp_dir}"],
            capture_output=True, text=True, timeout=180,
        )
        if dump_result.returncode != 0:
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)
            logging.error(f"mongodump failed for {db_name}: {dump_result.stderr}")
            raise HTTPException(status_code=500, detail=f"Backup failed during dump of {db_name}")

    # Compress the entire tmp_dir into one archive
    tar_result = subprocess.run(
        ["tar", "-czf", archive, "-C", tmp_dir, "."],
        capture_output=True, text=True, timeout=120,
    )
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)

    if tar_result.returncode != 0:
        raise HTTPException(status_code=500, detail="Backup failed during compression")

    size_bytes = os.path.getsize(archive)
    size_mb = round(size_bytes / 1024 / 1024, 2)

    # Rotate — keep last 4
    all_backups = sorted(glob.glob(f"{BACKUP_DIR}/oll_db_backup_*.tar.gz"), reverse=True)
    for old in all_backups[4:]:
        try:
            os.remove(old)
        except Exception:
            pass

    filename = os.path.basename(archive)
    logging.info(f"DB backup created: {filename} ({size_mb} MB) across {len(target_dbs)} DBs: {target_dbs}")
    return {
        "filename": filename,
        "size_mb": size_mb,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "databases": target_dbs,
    }


@router.get("/admin/db-backup/download")
async def download_latest_backup(user: dict = Depends(get_current_user)):
    """Download the most recent backup file."""
    latest = _latest_backup()
    if not latest:
        raise HTTPException(status_code=404, detail="No backup found. Create one first via POST /admin/db-backup/create")
    filename = os.path.basename(latest)
    return FileResponse(
        path=latest,
        filename=filename,
        media_type="application/gzip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/admin/db-backup/list")
async def list_backups(user: dict = Depends(get_current_user)):
    """List all available backup files."""
    files = sorted(glob.glob(f"{BACKUP_DIR}/oll_db_backup_*.tar.gz"), reverse=True)
    result = []
    for f in files:
        stat = os.stat(f)
        result.append({
            "filename": os.path.basename(f),
            "size_mb": round(stat.st_size / 1024 / 1024, 2),
            "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        })
    return result


@router.get("/admin/db-backup/logs")
async def get_backup_logs(lines: int = 100, user: dict = Depends(get_current_user)):
    """Get the last N lines of the backup log."""
    log_file = f"{BACKUP_DIR}/backup.log"
    if not os.path.isfile(log_file):
        return {"logs": "", "line_count": 0, "exists": False}
    try:
        result = subprocess.run(["tail", f"-n{lines}", log_file], capture_output=True, text=True)
        log_content = result.stdout
        return {
            "logs": log_content,
            "line_count": log_content.count('\n'),
            "exists": True,
            "log_file": log_file,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/db-backup/status")
async def get_backup_status(user: dict = Depends(get_current_user)):
    """Get current backup status — latest file info + next scheduled run."""
    latest = _latest_backup()
    status = {"has_backup": False, "cron_schedule": "Daily at 10:00 PM"}
    if latest:
        stat = os.stat(latest)
        status.update({
            "has_backup": True,
            "filename": os.path.basename(latest),
            "size_mb": round(stat.st_size / 1024 / 1024, 2),
            "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        })
    return status


async def download_specific_backup(filename: str, user: dict = Depends(get_current_user)):
    """Download a specific backup file by filename."""
    # Security: only allow valid backup filenames
    if not filename.startswith("oll_db_backup_") or not filename.endswith(".tar.gz"):
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(BACKUP_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    return FileResponse(
        path=path,
        filename=filename,
        media_type="application/gzip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
