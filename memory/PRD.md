# Future Skills / Multi-Vertical CRM — PRD

## Original Problem Statement
Deeply refine the multi-vertical CRM. Add comprehensive sorting/filtering across all
modules, completely redesign the Future Skills CRM UI to resemble an Excel spreadsheet
(tight grids, subsheets, column-level filters, auto-colored rows by status), build
advanced lead metric tracking (cost-per-lead, time-to-contact), refine workflow modals
(Follow-up ↔ Mark Lost chaining) and fix the Cashfree payment webhook bug where paid
trials/renewals were not being auto-promoted to "Active Customers".

## Personas
- Admin / Ops team — manages 60+ leads/day, needs Excel-level data density.
- Educator / Support — reviews trials, follow-ups.
- Payments Ops — reconciles Cashfree state with app state.

## Core Requirements
- Excel-like Future Skills CRM (dense grid, column filters, inline notes, status auto-tint).
- Consolidated toolbar (single row): search + status chips + Add / Import buttons.
- Column-level date filter with presets + custom range (Leads sheet).
- Cashfree payment auto-reconciliation via `/api/admin/future-skills/reconcile-payments`.
- Cost/Lead + Avg Time to 1st Contact reports.
- Workflow chaining: "Not Interested" → Mark Lost modal auto-open.
- Free Trials tab parity with Leads (status chips, inline notes, date-added column,
  attendance dropdown with Attended/Absent/Reschedule).

## Implemented (latest first)
- **18 Aug 2026** — Redesigned `/school/robotics/beginner` per OLL Brand Guidelines PDF.
  New sections: sticky top bar, hero (Anton headline + Robotics.gif + red/blue/light-blue
  blur orbs), About OLL impact band (500+ schools · 2,00,000+ students · 35 cities),
  As Seen On (Shark Tank + KBC), Why-schools cards, Implementation slider (5 schools with
  logo/name/students/city/principal/feedback/video, auto-advance + arrows + dots),
  Schools-that-work-with-us logo wall, Download Curriculum PDF CTA (OLL Beginner
  Curriculum 2026-27), and re-styled demo booking form. Typography swapped from JetBrains
  Mono to Anton (headings) / Inter (body) / Libre Baskerville (quotes) / Caveat (accents).
- **08 Aug 2026** — Free Trials tab: added status chips (Scheduled / Rescheduled /
  Attended / Absent), inline Notes column (saves on blur), replaced Ref with
  "Date Added" column, removed Parent Name from phone cell, combined
  Attended + Absent + Reschedule into one "Attendance" dropdown. Lead detail popup
  now shows Lead-added and Trial-booked timestamps. New backend endpoint
  `POST /admin/future-skills/trials/{id}/absent`.
- **07 Aug 2026** — Toolbar simplified: removed Sort & Date row, reduced search width,
  merged search + status chips + Add + Import into a single row. Added
  `SheetDateFilterTh` — Excel-style Date column header filter with presets and range.
- Cashfree reconcile-payments endpoint + Sync Payments button.
- ExcelSheet.jsx wrappers (SheetTabs / SheetTable / SheetTh / SheetSortTh / SheetFilterTh).
- Auto row tint by status (blue / yellow / green / red).
- SortFilterBar reusable across Summer Camp, Orders, Student CRM (still used there).
- CSV import mapping fix for age_group and custom sources.
- Cost/Lead & Avg Time to 1st Contact metrics in Reports.
- B2B invoice PDF address update.

## Backlog (P1 → P2)
- **P1** WhatsApp AI Chat via AiSensy webhook.
- **P2** Multiple chat sessions browser in AI Chat.
- **P2** "Top-performing video/post this month" spotlight card.
- **Tech-debt** Split monolithic `AdminFutureSkills.jsx` (4500+ lines) into
  LeadsTable / TrialsTable / Toolbar sub-components; same for AdminReports / AdminOrders.
- **Tech-debt** Add markdown rendering to AI responses.
- **Tech-debt** Audit-log sensitive admin actions.

## Key Files
- `/app/backend/routes/future_skills.py`
- `/app/frontend/src/pages/admin/AdminFutureSkills.jsx`
- `/app/frontend/src/components/admin/ExcelSheet.jsx`
- `/app/frontend/src/components/SortFilterBar.jsx` (still used on Summer Camp / Orders)

## Integrations
Apify, YouTube Data API v3, AiSensy WhatsApp, Cashfree Payments,
Cloudinary storage, Resend email, OpenAI (Emergent LLM key).

## Test Credentials
See `/app/memory/test_credentials.md`.


## Changelog (Latest)
- 2026-02: Robotics Beginner landing — swapped Team section placeholders with real portraits (Shreyaan, Vidushi, Amit, Heather) extracted from user-supplied composite. Portraits saved locally at `/app/frontend/public/team/*.png`; referenced in `RoboticsBeginnerLanding.jsx` (~L972-976).
- 2026-02: Homepage + Robotics Beginner — "As Seen On" cards (KBC, Shark Tank) now clickable → YouTube (KBC ep `8M3A_InpVKw?t=883s`, Shark Tank `aVzl6yzPPTw`), with red "▶ Watch clip" pill (top-right). Added infinite-scroll media houses ticker (`/media-logos/*` — 8 outlets: YourStory, Sony TV, HT, TOI, CNBC TV18, Indian Express, Business Insider, Pinkvilla) under both. "Inside an OLL classroom" rebuilt as asymmetric mosaic mirroring Future Skills page (10 real classroom photos+videos, lightbox playback). Parent/student testimonial cards: first click now guarantees unmute + play.

- 2026-02: Pricing Calculator page added at /pricing (permission-gated by `pricing`). Route + `PRICING` button added in School CRM header (visible to admin/super_admin or users with `pricing` perm). Course-based catalogue with grade-wise MRP+GP from Pricing_Sheet_2027-28.pdf, MRP editable and margin auto-recomputes, qty-slab discount off GP (0/10/15/20/30/40/45%), grand totals + Export PDF via new browser window. Added `pricing` to Growth Partner default role permissions (gp_onboarding.py, students.py, AdminUsers.jsx defaults + permission catalogue).


- 2026-02: `/techfest` — (1) Sticky pill nav now actually sticks — root cause: `overflow-x: hidden` on `.tf-page` was killing `position: sticky`; switched to `overflow-x: clip`. (2) Replaced plain "Techfest" SVG mark with official **Techfest IIT Bombay** logo (WebP at `/public/techfest/techfest-iitb-logo.webp`, 27 KB). (3) Refactored "Competition Rounds" from a flat 3-round timeline into per-track 2-round paths: **RoboSumo · RoboRacer** = R1 Online Submission → R2 Regional Qualifier; **Robotics Innovation Challenge** = R1 Online Submission → R2 Direct Grand Finale (no regionals). RIC stats and FAQ copy updated to match.

- 2026-02: Admin Expenses / School P&L — fixed silent-drop bug where manually added expenses (esp. School Share) never appeared on the P&L master sheet. Root cause in `/api/school-expenses/pnl-summary`: (a) status filter excluded schools in `renewal_meeting` / `meeting_done`, (b) schools with zero contract value were skipped even if they had real expenses. Fix: broadened status filter to include `renewal_meeting` and `meeting_done`, backfilled missing schools from `school_expenses` collection, and kept any school with non-zero expenses in the rows even when revenue is 0. Verified with School Share expense on both an `active` and a `meeting_done` school. Confirmed `school_share` category is already present in the Add Expense modal dropdown (option 6 of 17).

- 2026-02: **Educator Bulk Import — Requirement linkage** — enhanced `POST /api/educators/bulk-import` to accept an optional `default_requirement_id` form field + per-row `requirement_id` / `requirement_title` CSV columns. Per-row values override the batch default; typos surface as clear "not found — skipped" errors instead of silently unlinking. Added `import_as` field with two modes: **`applicants`** (default → status `new`, `onboarding_completed=false`, shows under Applicants tab) and **`active`** (legacy → status `active`, `onboarding_completed=true`). Frontend: Bulk Import button now also visible on the **Applicants** tab (previously only on Active Educators); modal has a Requirement dropdown, import-mode radio, updated sample CSV, and preview column showing the resolved requirement per row. Verified end-to-end via curl (2 rows imported → linked to "Test Requirement for Email", status `new`; invalid requirement rejected; active-mode preserves legacy behaviour).

- 2026-02: **Payment Tranches CRUD + Extra Students + Share Expense reverse sync** —
  * Backend: new endpoints `PATCH /api/schools/{id}/manage-tranches` (full replace of `onboarding_data.payment_tranches` with `payment_mode` + `gst_type` overrides, trims orphaned `payments[]` records, unconditionally recomputes `total_amount`) and `POST /api/schools/{id}/extra-students` (accepts batches of `{grade, students, price_per_student, date, notes, increment_existing}`; each valid entry appends a new pending tranche marked `extra_students: true` and either bumps the matching `grade_pricing` row or appends a new `Grade X (Extra)` row; recomputes `total_students` / `total_amount`).
  * Backend: `expenses.py` — added `_resync_school_share_from_expenses()` helper called from POST / PATCH / DELETE `/api/school-expenses`. When the touched expense's category is `school_share` or `gp_share` and `school_id` is set, aggregates all such expenses for that school+category and writes the sum to `onboarding_data.{school|gp}_share_amount`. Backfills `..._type = 'amount'` when previously unset/'none' and syncs `..._value` while in amount-mode. Clears value on delete-all; leaves manually-set `type=percentage` untouched.
  * Backend: `orders.py` — `GET /api/orders/school-payments` now includes `renewal_meeting` schools so mid-renewal tranches (incl. Extra Students) show up in Orders.
  * Frontend: `AdminOrders.jsx` — new **Manage Tranches** modal (add / delete / reorder / edit amount·percentage·date·gst·status·notes per row, live "New Total", saves via the new endpoint). Button visible even when a school has zero tranches so admins can seed the first tranche.
  * Frontend: `AdminSchoolCRM.jsx` — new **Add Extra Students (mid-contract)** amber block rendered inside three modals (Onboard modal for `meeting_done`/`converted`, Renewal Convert modal for `renewal_meeting`/`renewed`, and the actual Edit School modal for `converted`/`active`/`renewed`). Batch rows: grade autocomplete off existing `grade_pricing`, students, price/student, date, notes, "Bump existing grade row" toggle. Save calls the new endpoint and refetches the school so the modal doesn't overwrite the just-appended (Extra) row on next Save.
  * Verified end-to-end via pytest suite `/app/backend/tests/test_iter115_retest_fixes.py` (12/12) + prior regression (19/19) + Playwright UI walk-through: Add Batch → Grade 3 / 5 / ₹1000 → Save → toast + Grand Total jumps from 5,000 → 10,000, new "(Extra)" row appears, new tranche visible on `/admin/orders`.
