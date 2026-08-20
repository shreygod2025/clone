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
