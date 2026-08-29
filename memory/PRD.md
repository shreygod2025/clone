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
- **Feb 2026** — Fixed Onboarding/Convert modal prefill bugs on `/admin/schools`:
  School Team Contacts role was hardcoded to "Principal" and the previously entered
  postal Address (from Add Lead) was ignored. `openConversionModal` now cascades:
  `onboarding_data → inquiry.school_contacts → proposal_data.school_contacts` for
  contacts, and `onboarding_data → proposal_data → inquiry.address → inquiry.location`
  for address. Default contact role now uses `inquiry.contact_role` (empty if unset)
  instead of the hardcoded "principal". File: `AdminSchoolCRM.jsx` (openConversionModal).

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

- 2026-02: **Bug-fix round after production deploy** (Feb 29):
  * **Educator bulk import** — sample CSV no longer references a fake `"Robotics Educator"` requirement (used to fail every row because that title didn't exist). Frontend preview parser now respects double-quoted fields so `"Robotics,Coding"` no longer shifts columns and drops the City value. Backend csv.DictReader was fine — it's the preview that was misleading.
  * **Educator card layout** — the City row now always renders (with "No city on file" placeholder) so a missing value doesn't look like the skill chips are standing in for the city field. Verified via screenshot.
  * **School Details modal — Address** — added a dedicated "School Address" block that renders whenever `viewInquiry.address` is set. Preserves line breaks with `whitespace-pre-wrap`.
  * **Perceived latency after Save** — `fetchInquiries()` now defaults to a background refresh (no `setLoading(true)` flash over the entire cards grid) and dedupes concurrent calls (39 call sites across the file used to trigger 3-4 racing fetches per Save). Initial mount still shows the spinner via `fetchInquiries({ background: false })`.

- 2026-02: **School CRM — round 3 upgrades** (Feb 28):
  * **Grades autofill**: picking Grades From + Grades To at the top of the Edit Lead / Proposal modal now auto-populates the first empty "Grade (e.g. 1-5)" row of the grade_pricing table with a compact shorthand (Jr.KG-10, 1-5, …). Only fills a truly empty row — a hand-edited value is never clobbered.
  * **Email preview + edit**: rewrote the "Send Email" modal in School CRM to fetch a live preview from the backend before sending. Admin can now edit To / additional recipients (comma-separated) / **CC (auto-set to sender)** / **Reply-To (auto-set to sender)** / Subject / and toggle to edit the raw HTML body. Applies to all email types routed through `send-crm-email` — Introduction, Proposal, MOU, Meeting Confirm, General Followup, F1/F2/F3/F4.
  * Backend: `send_school_crm_email()` in `server.py` gained `preview`, `cc`, `bcc`, `reply_to_override`, `additional_to`, `subject_override`, `body_override` params. Preview mode short-circuits before the Resend call and returns `{subject, html, to, cc, reply_to}`. Endpoint `POST /schools/{id}/send-crm-email` plumbs all of these through, and returns the preview payload when `preview: true`. Verified via curl end-to-end.
  * Frontend: existing `showEmailModal` state extended with `emailModalAdditionalTo / Cc / ReplyTo / Subject / BodyHtml / EditingBody` fields; a new `useEffect` fetches the preview on modal open + email-type change and seeds CC/Reply-To with `user.email`.

- 2026-02: **School CRM — round 2 upgrades** (Feb 28):
  * **School Team Contacts role dropdown** now shares the same `PRIMARY_CONTACT_ROLES` list as the primary-contact dropdown (adds Computer Teacher, Teacher, HoD, Admin, Other + 3 coordinator variants across 4 modals: Add Lead, Edit Lead, Onboard, Renewal Convert).
  * **Est. Students** switched from a plain number input to a tiered dropdown: 100–300 / 300–500 / 500–800 / 800–1000 / 1000–1500 / 1500+ (each pre-snaps `student_count` to the tier midpoint), with an "Other (enter exact)" free-input escape hatch.
  * **Quoted Price** now has a Fixed / Per-Student mode toggle. Per-student mode multiplies the price against the tier midpoint (or exact count) and shows a live "Approx lead value: ₹X (N students × ₹Y)" line.
  * **School Address** input gained a "Locate Me" button — reads browser geolocation, reverse-geocodes via OpenStreetMap Nominatim (no API key required), and fills both `address` and `location` when a city is detected.
  * **Upsell detection**: picking an existing school from the search autocomplete now stamps `is_upsell=true` and `parent_inquiry_id` on the new lead, pre-fills all existing school context, and shows an amber "Existing school — this will be logged as an Upsell inquiry" banner (with a "Not an upsell" escape). Cards render an amber "🔁 Upsell / Repeat customer" pill.
  * **View history**: every school card shows an inline "View history (N)" link when the phone or school-name matches other inquiries. Opens a new History modal that lists every linked inquiry in chronological order with stage badges, offerings, quoted price, and assignee.
  * **New filters**: City (auto-derived from live inquiries) + Offering (sourced from `/api/offerings`) added next to the existing Assignee search filter.
  * Backend: `SchoolInquiry`, `SchoolInquiryCreate`, `SchoolInquiryUpdate` gained `quoted_price_mode`, `student_count_tier`, `is_upsell`, `parent_inquiry_id`. `SchoolInquiryCreate` now uses `ConfigDict(extra="ignore")` to safely accept the new payload keys. Verified end-to-end via curl — all fields round-trip cleanly.

- 2026-02: **School CRM — Add Lead upgrades + list view + assignee filter fix** —
  * **Add Lead form**: new "Primary Contact" section heading; added a **Role** dropdown next to Contact Name (adds "Computer Teacher" + 11 other roles); new **School Address** textarea; **Not Affiliated** added to Board dropdown; meeting-date calendar now allows past dates so ops can log historic meetings; new **Assign to GP** option in Lead Assignment that auto-picks a `growth_partner` team user whose `city` matches the school's city (falls back to manual pick with a warning if no match).
  * **Assignee filter**: replaced plain `<select>` with a searchable typeahead dropdown (search by name/email/role, GP badge shown). Broadened the match to also accept email/name variants — older records that store `assigned_to` as an email string now surface correctly.
  * **List view + sort**: new Grid/List toggle. List view shows a compact table with School, Contact (+ role), Phone, City, Board, Assignee, and **Date Added** columns. New sort dropdown: Newest first (default), Date added ↑/↓, Name A→Z / Z→A. Card view also shows a small "Added dd MMM yyyy" line.
  * **Bulk Import** button now visible on every stage tab (previously only Active Schools).
  * Backend: `SchoolInquiry` / `SchoolInquiryCreate` / `SchoolInquiryUpdate` gained a `contact_role` field. `address` already existed and is now written by the Add Lead flow. Verified end-to-end via curl.

- 2026-02: **Educator Bulk Import — Requirement linkage** — enhanced `POST /api/educators/bulk-import` to accept an optional `default_requirement_id` form field + per-row `requirement_id` / `requirement_title` CSV columns. Per-row values override the batch default; typos surface as clear "not found — skipped" errors instead of silently unlinking. Added `import_as` field with two modes: **`applicants`** (default → status `new`, `onboarding_completed=false`, shows under Applicants tab) and **`active`** (legacy → status `active`, `onboarding_completed=true`). Frontend: Bulk Import button now also visible on the **Applicants** tab (previously only on Active Educators); modal has a Requirement dropdown, import-mode radio, updated sample CSV, and preview column showing the resolved requirement per row. Verified end-to-end via curl (2 rows imported → linked to "Test Requirement for Email", status `new`; invalid requirement rejected; active-mode preserves legacy behaviour).

- 2026-02: **Payment Tranches CRUD + Extra Students + Share Expense reverse sync** —
  * Backend: new endpoints `PATCH /api/schools/{id}/manage-tranches` (full replace of `onboarding_data.payment_tranches` with `payment_mode` + `gst_type` overrides, trims orphaned `payments[]` records, unconditionally recomputes `total_amount`) and `POST /api/schools/{id}/extra-students` (accepts batches of `{grade, students, price_per_student, date, notes, increment_existing}`; each valid entry appends a new pending tranche marked `extra_students: true` and either bumps the matching `grade_pricing` row or appends a new `Grade X (Extra)` row; recomputes `total_students` / `total_amount`).
  * Backend: `expenses.py` — added `_resync_school_share_from_expenses()` helper called from POST / PATCH / DELETE `/api/school-expenses`. When the touched expense's category is `school_share` or `gp_share` and `school_id` is set, aggregates all such expenses for that school+category and writes the sum to `onboarding_data.{school|gp}_share_amount`. Backfills `..._type = 'amount'` when previously unset/'none' and syncs `..._value` while in amount-mode. Clears value on delete-all; leaves manually-set `type=percentage` untouched.
  * Backend: `orders.py` — `GET /api/orders/school-payments` now includes `renewal_meeting` schools so mid-renewal tranches (incl. Extra Students) show up in Orders.
  * Frontend: `AdminOrders.jsx` — new **Manage Tranches** modal (add / delete / reorder / edit amount·percentage·date·gst·status·notes per row, live "New Total", saves via the new endpoint). Button visible even when a school has zero tranches so admins can seed the first tranche.
  * Frontend: `AdminSchoolCRM.jsx` — new **Add Extra Students (mid-contract)** amber block rendered inside three modals (Onboard modal for `meeting_done`/`converted`, Renewal Convert modal for `renewal_meeting`/`renewed`, and the actual Edit School modal for `converted`/`active`/`renewed`). Batch rows: grade autocomplete off existing `grade_pricing`, students, price/student, date, notes, "Bump existing grade row" toggle. Save calls the new endpoint and refetches the school so the modal doesn't overwrite the just-appended (Extra) row on next Save.
  * Verified end-to-end via pytest suite `/app/backend/tests/test_iter115_retest_fixes.py` (12/12) + prior regression (19/19) + Playwright UI walk-through: Add Batch → Grade 3 / 5 / ₹1000 → Save → toast + Grand Total jumps from 5,000 → 10,000, new "(Extra)" row appears, new tranche visible on `/admin/orders`.
