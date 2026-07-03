# OLL Backend Changelog

## 2026-07-03 (round 10) — My Team page (Manager + Admin view) 👥
**Status: COMPLETE — screenshots verified**

### Backend
- New endpoint `GET /api/team/my-team` in `/app/backend/routes/users.py`:
  - **Admin** → returns every active team_user
  - **Manager** (any user with `reports_to == current_user.id`) → returns those direct reports
  - **Regular member** → returns empty (`scope: "none"`)
  - Each member enriched with real-time counts: `tasks_assigned_open`, `tasks_pending_approval`, `tasks_completed`, `projects_leading`, `projects_member_of`, plus role name and manager name
- `GET /api/tasks?assignee={user_id}` now accepts an explicit `assignee` filter. Admins can view any user's tasks; managers can view their reports; anyone else → 403

### Frontend
- New page `/app/frontend/src/pages/admin/AdminMyTeam.jsx` at route `/admin/team`:
  - Header shows "Team Overview" (admin) or "My Team" (manager)
  - Search input (name/email/role) + 4 summary tiles (Open / Pending Review / Completed / Leading)
  - Each member rendered as a **card** with avatar + role + contact info + "Lead" badge + 6-cell stats grid + three action buttons:
    - **Assign Task** → opens `TaskCreateModal` with the assignee chip pre-filled via new `defaultAssigneeId` prop
    - **View Tasks** → deep-links to `/admin/tasks?assignee={id}` (tasks list scoped to that user)
    - **Performance** icon → opens `/admin/users/{id}/performance` (existing per-user performance page)
- `AdminTasks.jsx` reads the `?assignee=` URL param and forwards it to the tasks endpoint
- `TaskCreateModal.jsx` accepts `defaultAssigneeId` prop
- Sidebar: added "My Team" (Users icon) link between Projects and My Performance, `permission: null` so both managers and admins see it

### Files touched
- `/app/backend/routes/users.py` (new endpoint at bottom)
- `/app/backend/routes/tasks.py` (assignee query param)
- `/app/frontend/src/pages/admin/AdminMyTeam.jsx` (new)
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (loadTasks reads ?assignee)
- `/app/frontend/src/pages/admin/AdminDashboard.jsx` (sidebar link)
- `/app/frontend/src/components/tasks/TaskCreateModal.jsx` (defaultAssigneeId prop)
- `/app/frontend/src/App.js` (route + lazy import)



## 2026-07-03 (round 9) — Categorized Performance + Project-window KPIs + Weekly Task Widget 🎨
**Status: COMPLETE — screenshots verified**

### Performance page — categorized layout with color theming
- KPIs are now **grouped by category** into individual sections. Each section has a colored dot + title + `N metrics` pill.
- Chart strokes, gradient fills, and icon backgrounds now use the **category color**:
  - Tasks & Responsibilities → blue (`#3b82f6`)
  - Support Center → amber (`#f59e0b`)
  - Sales — B2B → emerald (`#10b981`)
  - Sales — B2C → cyan (`#06b6d4`)
  - HR → purple (`#a855f7`)
  - Educator HR → pink (`#ec4899`)
  - Growth Partners → orange (`#f97316`)
- KPI catalog category renamed `Task & Project Delivery` → `Tasks & Responsibilities`

### Projects KPI — active-window overlap
`projects_member_of` + `projects_leading` no longer return an all-time snapshot. For each time bucket, a project is counted only when its `start_date` ≤ `bucket_end` and (`end_date` is null OR `end_date` ≥ `bucket_start`). Aggregation changed from `snapshot` to `max` so the header display shows peak concurrent projects during the scope (not the sum).

### Dashboard — "This Week's Tasks" (was "Today's Tasks")
Backend `/api/tasks/today` now returns three arrays:
- `today` — due today
- `this_week` — due later this week (Mon–Sun, excluding today)
- `overdue` — due < today AND not completed

Widget rendered as a full-width card list using the shared `<TaskCard>` component — same rich design as the Tasks page (priority dot, overdue chip, due-date pill, status pill, Start/Complete actions, 3-dot menu with Edit/Delete). Overdue rows appear first, then today, then rest of week.

### Files touched
- `/app/backend/routes/kpis.py` (category rename, project window overlap logic, `max` aggregation)
- `/app/backend/routes/tasks.py` (`/tasks/today` returns `today` + `this_week` + `overdue`)
- `/app/frontend/src/pages/admin/UserPerformance.jsx` (category grouping + theming)
- `/app/frontend/src/pages/admin/AdminDashboard.jsx` (widget uses shared `TaskCard`)



## 2026-07-03 (round 8) — Added 12 new KPIs (Renewal, HR, Educator HR, Growth Partners) 📊
**Status: COMPLETE — verified end-to-end via direct compute functions**

### New KPI catalog entries in `/app/backend/routes/kpis.py`

**Sales — B2B (2 new):**
- `b2b_renewal_rate` — `(customers − lost) / customers × 100 %`  (unit: %)
- `b2b_lost_schools` — count of schools with status ∈ {archived, lost, churned}

**HR (3 new, org-wide):**
- `hr_team_openings` — `team_requirements` created in period
- `hr_openings_filled` — `team_applications` with status ∈ {hired, onboarded, onboarding} created in period
- `hr_openings_over_deadline` — `team_requirements` still `is_active=True` and `created_at > 30 days ago` (**snapshot**)

**Educator HR (3 new, org-wide):**
- `edu_requirements` — `open_requirements` created in period
- `edu_requirements_fulfilled` — `educator_onboarding` docs created in period
- `edu_requirements_over_deadline` — active `open_requirements` older than 30 days (**snapshot**)

**Growth Partners (3 new, per-user if `assigned_to` exists on doc, else org-wide):**
- `gp_leads` — `growth_partners` created in period
- `gp_onboarded` — status ∈ {onboarding, active, converted}
- `gp_conversions` — status ∈ {converted, active}

### Compute functions added
- `_compute_b2b_metrics` extended with renewal / lost math
- `_compute_hr_metrics` (new)
- `_compute_educator_hr_metrics` (new)
- `_compute_growth_partner_metrics` (new)
- Dispatcher `_compute_selected_metrics` now routes prefixes `hr_`, `edu_`, `gp_`

### Verified via direct backend call
- HR: openings=1, filled=5, over_deadline=1
- Educator HR: requirements=2, fulfilled=0, over_deadline=2
- Growth Partners: leads=31, onboarded=17, conversions=4
- B2B renewal rate=15.0%, lost_schools=17

Existing Users & Roles UI consumes `/api/kpis/catalog` dynamically, so all 12 new KPIs are now selectable when configuring a role.



## 2026-07-03 (round 7) — Performance Picker + Snapshot KPIs + Dashboard Slider 📈
**Status: COMPLETE — verified end-to-end**

### 1. Ref-date picker on Performance page
- **Month scope** → Month + Year dropdowns
- **Quarter scope** → Quarter (Q1–Q4) + Year dropdowns
- **Year scope** → Year dropdown only
- Each change re-fetches with the correct `ref=YYYY-MM-DD` query string, so users can drill into any past period.

### 2. Fixed "Projects assigned to" (and similar snapshot KPIs)
- Added `aggregation` field to KPI catalog entries. New value `"snapshot"` used for KPIs whose queries don't have a time filter:
  - `tasks_overdue` — real-time snapshot of currently-overdue open tasks
  - `projects_member_of` — all-time count of projects the user is a member of OR leads
  - `projects_leading` — all-time count of projects the user leads
- In `_timeseries_payload`, snapshot KPIs use the **last-bucket value** for `display_value` (no summing).
- **Also fixed the query** for `projects_member_of` to include both `member_ids` and `lead_id` (previously missed leads-only projects).

### 3. Dashboard — one-line horizontal KPI slider
- Replaced the responsive grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`) with a `flex overflow-x-auto snap-x` horizontal scrolling strip.
- Each card is `w-[210px]` with `snap-start` — swipe or scroll horizontally on any device.

### Files touched
- `/app/backend/routes/kpis.py` (KPI catalog + timeseries snapshot logic + member/lead OR query)
- `/app/frontend/src/pages/admin/UserPerformance.jsx` (month/quarter/year pickers + ref builder)
- `/app/frontend/src/pages/admin/AdminDashboard.jsx` (dashboard KPI horizontal slider)



## 2026-07-03 (round 6) — My Performance Page with Time-Series Charts 📊
**Status: COMPLETE — verified end-to-end**

### Backend
Added two endpoints to `/app/backend/routes/kpis.py`:
- `GET /api/me/performance/timeseries?scope=month|quarter|year` — current user
- `GET /api/users/{user_id}/performance/timeseries?scope=...` — admin/manager view
Response contains:
- `buckets`: array of `{label, sub}` (weeks / months / quarters)
- `kpis`: per-KPI series `{id, label, category, unit, series: [{label, sub, value}], trend, total, avg, display_value}`

Bucket logic (`_buckets_for_scope`):
- **month** → weekly buckets (Wk 1..N) clipped to the calendar month, Mon-Sun aligned
- **quarter** → 3 monthly buckets (Jan/Feb/Mar or Apr/May/Jun etc.) for the quarter containing `ref`
- **year** → 4 quarterly buckets (Q1..Q4) for the year containing `ref`

### Frontend — `UserPerformance.jsx` rewritten
- Component accepts `mode="admin"` (default, reads `:id` from URL) or `mode="me"` (uses logged-in user)
- **Scope tabs** (Month / Quarter / Year) as pill-style toggle in a rounded container
- Each KPI renders as a Card with:
  - Icon + category + label
  - **Trend pill** with % change (green ↑ up, red ↓ down, slate = no change)
  - Large display value (sum for counts/currency, average for %/hours)
  - **Recharts AreaChart** with gradient fill, colored by trend direction, hover tooltip
- Fully responsive (`grid-cols-1 lg:grid-cols-2`, mobile-friendly paddings)

### Routing & sidebar
- Added route `/admin/me/performance` → `<UserPerformance mode="me" />`
- Added sidebar link **"My Performance"** (BarChart3 icon, `permission: null` so all team members see it)

### Files touched
- `/app/backend/routes/kpis.py`
- `/app/frontend/src/pages/admin/UserPerformance.jsx` (rewritten)
- `/app/frontend/src/pages/admin/AdminDashboard.jsx` (sidebar item)
- `/app/frontend/src/App.js` (new route)



## 2026-07-03 (round 5) — Task Cards: Edit + Start + Shared Component + Mobile 🎯
**Status: COMPLETE — verified end-to-end**

### Features
1. **Edit task** — `TaskCreateModal` now doubles as an **edit modal** via a new `existingTask` prop:
   - Header switches to "Edit task"
   - Fields pre-filled from the task
   - Footer button becomes "Save Changes" (`⌘+ENTER TO SAVE`)
   - Submits via `PATCH /api/tasks/:id` (backend `TaskUpdate` now supports `assigned_to` in the update loop)
   - "Edit task" appears as the top item in the 3-dot menu (visible to assignee, assigner, and admin)
2. **Start task** — dedicated `Play` icon button appears on pending tasks assigned to the current user. One click → PATCH `status: in_progress`.
3. **Reordering** — status pill → **Start (▶)** → **Complete (✓)** → assignee → menu. Both action buttons are now next to the status pill (as requested).
4. **Removed** the empty left status circle on task cards (visual clutter; the priority dot alone is enough).

### Shared component
- `TaskCard` and `FloatingMenu` are now `export`ed from `AdminTasks.jsx`.
- `AdminProjectDetail.jsx` **reuses `TaskCard` directly** for its Tasks section — same design, same functionality (edit, start, complete, delete, sub-task).
- Added a prominent **"Add Task"** button (blue, matching Tasks page) in the project's Tasks section header.

### Mobile responsive
- Task cards ship two layouts:
  - **≥ sm**: multi-column row with fixed-width slots
  - **< sm**: stacked layout — title + description → chips (project/status/date) → assignee + action buttons + menu
- Container paddings reduced on mobile (`p-4 sm:p-6`)
- Search input becomes full-width on mobile

### Bug fixed
- `FloatingMenu` clicks (Add sub-task, Edit, Delete) were being killed by the document-level `mousedown` outside-click handler race. Added `onMouseDown={e => e.stopPropagation()}` on the popup wrapper so mousedown never bubbles to `document`. The menu now closes only on genuine outside clicks.

### Files touched
- `/app/backend/routes/tasks.py` (added `assigned_to` to update loop)
- `/app/frontend/src/components/tasks/TaskCreateModal.jsx` (edit mode via `existingTask`)
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (rewritten TaskCard: no left circle, mobile layout, Start/Edit actions, FloatingMenu bugfix, exports)
- `/app/frontend/src/pages/admin/AdminProjectDetail.jsx` (imports shared `TaskCard`, Add Task button)



## 2026-07-03 (round 4) — Project Detail: Stacked Sections + In-Place Task Modal 🗂️
**Status: COMPLETE — verified**

### Changes
1. **AdminProjectDetail.jsx** — removed the tab strip (Overview / Tasks / Milestones / Knowledge Base). All four sections now render **stacked vertically** on the same page with a `<SectionHeader>` per section (title + count). Users can scroll through everything without switching contexts.
2. **Add task from project** — was `<Link to="/admin/tasks?new=1">` which navigated away. Replaced with in-place `<TaskCreateModal>` triggered by an "+ Add task" button. Uses `defaultProjectId={id}` so the project is pre-selected in the modal chip. On create, calls `load()` to refresh the tasks list.
3. **Project name chip on task cards** — 
   - Backend `_enrich_task()` now returns `project_name` and `project_color` when `project_id` is set
   - `AdminTasks.jsx` `TaskCard` shows a small colored pill next to the task title (background = project color at 20% opacity, dot in solid color) with `data-testid="task-project-{id}"`

### Files touched
- `/app/backend/routes/tasks.py` (project enrichment)
- `/app/frontend/src/pages/admin/AdminProjectDetail.jsx` (tabs → stacked sections, inline modal)
- `/app/frontend/src/pages/admin/AdminTasks.jsx` (project chip in card)



## 2026-07-03 (round 3) — Task Menu / Ownership / Alignment Fixes 🔧
**Status: COMPLETE — verified end-to-end**

### Bugs fixed
1. **Add sub-task & Delete task buttons dead in 3-dot menu**
   - Root cause: `FloatingMenu`'s document `mousedown` listener closed the popup before the child `click` handler could fire (because the popup wasn't in the anchor's DOM subtree)
   - Fix: added `popupRef` and skipped close when the mousedown target is inside the popup itself
   - Removed stray `onClick={e => e.stopPropagation()}` on the wrapper (no longer needed)

2. **Assigner/admin should NOT be able to mark someone else's task complete**
   - Rule now enforced: **the assignee is the OWNER of the task**
     - Self-assigned (assignee === assigner) → assignee marks complete directly
     - Someone-else assigned → assignee **submits for approval** → assigner or admin **approves** (only when status = `pending_approval`)
     - Assigner viewing an in-progress task no longer sees the Complete icon
   - `canComplete` (row + detail modal) now requires either:
     - `currentUserId === task.assigned_to` (assignee), OR
     - `task.status === 'pending_approval' && (isApprover || isAdmin)` (approver on submitted task)
   - Detail modal's Mark Complete button only shows for self-assigned tasks

3. **Row alignment broken when due date / status missing**
   - Root cause: conditional rendering caused columns to reflow horizontally per row
   - Fix: converted trailing columns into **fixed-width slots** with `w-[76px]` (due date), `w-[130px]` (status), `w-[180px]` (assignee), `w-[32px]` (complete), `w-[28px]` (menu). Empty cells still occupy the slot.

### Files touched
- `/app/frontend/src/pages/admin/AdminTasks.jsx`



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
