#!/bin/bash
# OLL MongoDB Daily Backup Script
# Runs: every day at 10:00 PM
# Keeps: only the LATEST backup (deletes previous)
# Location: /app/backups/

MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="oll_db_backup_${TIMESTAMP}.tar.gz"
TMP_DIR="${BACKUP_DIR}/tmp_${TIMESTAMP}"
LOG_FILE="${BACKUP_DIR}/backup.log"

echo "======================================" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting OLL DB backup..." >> "$LOG_FILE"

mkdir -p "$TMP_DIR"

# Run mongodump
mongodump --uri="$MONGO_URL" --db="$DB_NAME" --out="$TMP_DIR" >> "$LOG_FILE" 2>&1
DUMP_EXIT=$?

if [ $DUMP_EXIT -ne 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: mongodump failed (exit $DUMP_EXIT)" >> "$LOG_FILE"
  rm -rf "$TMP_DIR"
  echo "======================================" >> "$LOG_FILE"
  exit 1
fi

# Compress
tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "$TMP_DIR" . >> "$LOG_FILE" 2>&1
TAR_EXIT=$?
rm -rf "$TMP_DIR"

if [ $TAR_EXIT -ne 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Compression failed (exit $TAR_EXIT)" >> "$LOG_FILE"
  echo "======================================" >> "$LOG_FILE"
  exit 1
fi

SIZE=$(du -sh "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: ${ARCHIVE_NAME} (${SIZE})" >> "$LOG_FILE"

# Delete ALL previous backups - keep only this latest one
cd "$BACKUP_DIR" || exit 1
ls -t oll_db_backup_*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm -f
KEPT=$(ls oll_db_backup_*.tar.gz 2>/dev/null | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleanup done. Backup files kept: ${KEPT}" >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"
