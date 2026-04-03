# OLL Backend Changelog

## 2026-04-03 — server.py Modularization (MAJOR)
**Status: COMPLETE — Tested (34/34 backend tests passed)**

### What was done
- Refactored monolithic `server.py` from **14,805 lines → 4,226 lines** (71% reduction)
- Extracted 387 routes into 20 modular files in `/app/backend/routes/`
- Created new shared utilities in `routes/shared.py` and `routes/notifications.py`

### Files Created
| File | Routes | Description |
|------|--------|-------------|
| routes/users.py | 25 | Auth, Team Users, Roles, Center Users, OTP, User Bookings |
| routes/students.py | 15 | Student Inquiries, Growth Partners, Comments |
| routes/team.py | 25 | Team Applications, Onboarding, Vendor Expenses |
| routes/educators.py | 68 | Educator Applications, Onboarding, FAQs, Blogs |
| routes/support.py | 27 | Support Queries, Tickets, Batches, Sessions |
| routes/schools.py | 42 | School CRM, Onboarding, PO Management, Tracking |
| routes/orders.py | 10 | School/Student Payments, Tracking Tickets |
| routes/misc.py | 48 | Health, Cities, Dashboard, Admin, Upload |
| routes/notifications.py | - | WhatsApp notification helpers (WHATSAPP_TEMPLATES) |
| routes/shared.py | - | DB, JWT helpers, auto_assign, send_educator_email |

### Bug Fixes (during refactor)
- Fixed: `routes/schools.py` missing imports for `transform_tracking_url`, `fetch_po_data`, `fetch_vendor_products`, `match_vendor_product`, `VENDOR_PUBLIC_API` from `routes/expenses.py`
- Fixed: Duplicate `/health` route in `routes/misc.py`

## 2026-04-03 — Invoice URL Migration + GST Fix
**Status: COMPLETE**

- Migration script: `/app/backend/migrate_invoice_urls.py` — set empty-string `invoice_url` → `null` in `school_inquiries.payments`
- Cleared test invoice URLs from Walle, Followup Test 2, Shreshth Daga School
- Fixed GST formula: `exclusive_18` now uses `amount * 18 / 100` instead of `amount * 18 / 118`
