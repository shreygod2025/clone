# OLL Backend Changelog

## 2026-07-03 — Task Page: Menu Fix + Assignment Display + Sorting 📋
**Status: COMPLETE — Screenshot verified**

### Fixes
1. **3-dot popup no longer clipped** — introduced `<FloatingMenu>` that renders with `position: fixed` at button's `getBoundingClientRect()`, escaping any `overflow-hidden` parent. Also removed `overflow-hidden` from `StatusSection` container.
2. **Assigner can now complete someone else's task**:
   - Row card: `completeTask()` now allows `isApprover || isAdmin` → direct PATCH `status: 'completed'`
   - Detail modal: `canComplete` expanded to include `currentUserId === task.assigned_by || isAdmin`
   - `canComplete` is now gated on `canAct` (assignee || approver || admin) to prevent unauthorized clicks
3. **Card layout enrichment**:
   - **Description snippet** (first line, up to 140 chars) shown below title with `line-clamp-1`
   - **Big assignee name** (semibold, `text-sm`) with avatar + `(you)` badge when applicable
   - **Small "by X" line** (`text-[10px]` slate-400) below assignee — hidden when self-assigned
4. **Scope filter overhaul**:
   - Non-admin default changed from `my` → `all` (tasks assigned to me + by me)
   - "My direct reports" option **removed**; replaced with "All Tasks" as the first option
   - Admin filter options unchanged (All Team / Assigned to me / Assigned by me)
5. **Sort order**: due-date ASC (nulls last), then priority DESC (urgent > high > medium > low)
6. Search now also matches inside the task description

### Files touched
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (FloatingMenu component, TaskCard rewrite, TaskDetailModal canComplete fix, filterOptions update, sort logic)



## 2026-07-03 — Task Attachments + UX Refinements 🎯
**Status: COMPLETE — Backend + Frontend verified end-to-end**

### Backend (`/app/backend/routes/tasks.py`)
- Added `attachments: List[dict]` field to `TaskCreate` + `TaskUpdate` models
- Attachments persist on create + update (`PATCH /api/tasks/:id`)
- Each attachment: `{name, url, kind: 'file'|'link', size?}`

### Frontend UX changes (per user request)
1. **Hide task IDs (TSK-XXXX codes)** — removed from list cards and detail modal header
2. **Move due date outside** — now a prominent bordered pill on the right side of each card (red variant when overdue)
3. **Direct-complete flow** with smart routing:
   - **Self-assigned** (`assigned_to === assigned_by`) → PATCH `status: 'completed'` directly (no approval)
   - **Assigned by someone else** → POST `/tasks/:id/submit` (goes to `pending_approval`)
   - **Approver clicks complete on pending_approval** → POST `/tasks/:id/approve`
4. **Complete icon** (`CheckCircle2`) added per-row, visible on hover
5. **Delete moved to 3-dot menu** (was already there; removed the redundant status-advance action)
6. **Attachments panel** in TaskCreateModal is now fully functional:
   - "Upload file" → posts to `/api/upload?type=task` (Cloudinary, 10MB limit)
   - "Add link" → inline URL input with optional label
   - Files listed with type icon (📄 file / 🔗 link), click to open in new tab, trash-icon to remove
   - "Voice Note" section removed
7. **Attachments in TaskDetailModal** — view + add + remove after task creation (auto-saves on change)
8. **Attachment count** shown on each task card (paperclip icon)

### Verified
- Backend: created task with 2 attachments (file + link) — round-trip preserved
- Frontend: detail modal displays both, upload/add-link buttons visible, Mark Complete button present for self-assigned
- Direct-complete PATCH → status `completed` + `completed_at` stamp



## 2026-07-02 — Task Page UI Redesign (Card/List Hybrid) 🎨
**Status: COMPLETE — Screenshot verified**

### What was done
- Redesigned `/app/frontend/src/pages/admin/AdminTasks.jsx` from a table to a **card/list hybrid** layout, matching the modern chip-based aesthetic of `TaskCreateModal.jsx`
- **Mission Control** branding label + Sparkles icon in header
- Rich header meta: total count, in-progress count, pending-approval count (color-coded)
- Toolbar overhaul: 2-row toolbar with scope pills (All Team / Assigned to me / Assigned by me) + status filter chips with per-status counts + soft-focus search
- **Grouped-by-status** default view with collapsible sections (Pending Approval → In Progress → Pending → Rejected → Completed); "Ungroup" toggle for flat view
- New **TaskCard** row: clickable status circle (advances status), priority dot, title + code, metadata icons (due date, subtasks, comments, drive link), status pill, initials avatar with deterministic colors, hover-revealed 3-dot menu (start/complete, add sub-task, open detail, delete)
- Nested subtask rendering with left-connector line indent
- Overdue tasks now show a red "Overdue" chip
- Empty-state card with icon + inline CTA
- Detail modal upgraded: blue accents, avatar in header + comments, softer focus rings

### Cleanup
- Deleted iteration-94 automated test data:
  - Project: `TEST_Iter94_Project`
  - Tasks: `Iter94 shortcut test`, `test sub`, `Testing new task`

### Files touched
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (rewritten)
- MongoDB cleanup (projects, tasks)



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
