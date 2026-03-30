#!/bin/bash
# OLL MongoDB Weekly Backup Script
# Runs: every Sunday at 2:00 AM
# Keeps: last 4 weekly backups (rotate)
# Location: /app/backups/

MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="oll_db_backup_${TIMESTAMP}.tar.gz"
TMP_DIR="${BACKUP_DIR}/tmp_${TIMESTAMP}"
LOG_FILE="${BACKUP_DIR}/backup.log"
KEEP_LATEST=4  # number of backup files to keep

echo "======================================" >> "$LOG_FILE"
echo "[$(date)] Starting OLL DB backup..." >> "$LOG_FILE"

# Create temp dir
mkdir -p "$TMP_DIR"

# Run mongodump
mongodump --uri="$MONGO_URL" --db="$DB_NAME" --out="$TMP_DIR" >> "$LOG_FILE" 2>&1
DUMP_EXIT=$?

if [ $DUMP_EXIT -ne 0 ]; then
  echo "[$(date)] ERROR: mongodump failed (exit $DUMP_EXIT)" >> "$LOG_FILE"
  rm -rf "$TMP_DIR"
  exit 1
fi

# Compress
tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "$TMP_DIR" . >> "$LOG_FILE" 2>&1
TAR_EXIT=$?

# Clean temp
rm -rf "$TMP_DIR"

if [ $TAR_EXIT -ne 0 ]; then
  echo "[$(date)] ERROR: Compression failed (exit $TAR_EXIT)" >> "$LOG_FILE"
  exit 1
fi

SIZE=$(du -sh "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -f1)
echo "[$(date)] SUCCESS: ${ARCHIVE_NAME} (${SIZE})" >> "$LOG_FILE"

# Rotate: keep only last N backups
cd "$BACKUP_DIR" || exit 1
ls -t oll_db_backup_*.tar.gz 2>/dev/null | tail -n +$((KEEP_LATEST + 1)) | xargs -r rm -f
echo "[$(date)] Rotation done. Keeping last ${KEEP_LATEST} backups." >> "$LOG_FILE"

# Print summary
echo "[$(date)] Backup complete. Files in ${BACKUP_DIR}:" >> "$LOG_FILE"
ls -lh "${BACKUP_DIR}"/oll_db_backup_*.tar.gz 2>/dev/null >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"
