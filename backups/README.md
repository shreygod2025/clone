# OLL Database Backup Guide

## Backup File Location (for VS Code Download)
```
/app/backups/oll_db_backup_YYYYMMDD_HHMMSS.tar.gz
```
Current backup: **`/app/backups/oll_db_backup_20260330_070132.tar.gz`** (12 MB)
Contains all 41 MongoDB collections including: school_inquiries, students, payments, educators, batches, etc.

---

## How to Download the Backup

### Option 1 — VS Code File Explorer (Right now)
1. Open VS Code
2. Navigate to `/app/backups/`
3. Right-click `oll_db_backup_20260330_070132.tar.gz`
4. Click **Download**

### Option 2 — Admin API
```bash
# Download latest backup via API
curl -L -o oll_backup.tar.gz \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://camp-lead-capture.preview.emergentagent.com/api/admin/db-backup/download
```

### Option 3 — Trigger Fresh Backup via API
```bash
# Create a new backup
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://camp-lead-capture.preview.emergentagent.com/api/admin/db-backup/create
```

---

## Weekly Auto-Backup (Cron Job)
**Schedule:** Every Sunday at 2:00 AM (server time)
**Script:** `/app/backups/backup.sh`
**Cron config:** `/etc/cron.d/oll-db-backup`
**Logs:** `/app/backups/backup.log`
**Retention:** Keeps last 4 backups (4 weeks rolling)

---

## How to Restore
```bash
# Extract backup
tar -xzf oll_db_backup_YYYYMMDD_HHMMSS.tar.gz

# Restore to MongoDB
mongorestore --uri="mongodb://localhost:27017" --db=test_database ./test_database/
```

---

## IMPORTANT — Disaster Recovery Warning
The weekly backups are stored **on the server itself**.
If the server is completely deleted, backups stored here will also be lost.

### Recommended: External Backup (Set up manually)
1. **Google Drive / Dropbox**: Download from VS Code weekly and upload to cloud
2. **S3 / GCS**: We can add a step to the backup script to `aws s3 cp` the file
3. **Email**: We can send the backup download link to your email after each cron run

To set up any of these, let the AI agent know and it can modify `/app/backups/backup.sh`.

---

## API Endpoints (Admin only, requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/db-backup/list` | List all backup files |
| POST | `/api/admin/db-backup/create` | Trigger a fresh backup |
| GET | `/api/admin/db-backup/download` | Download latest backup |
| GET | `/api/admin/db-backup/download/{filename}` | Download specific backup |
