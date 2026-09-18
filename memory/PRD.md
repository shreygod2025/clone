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
- **Feb 2026** — **Users & Roles: HR fields + Transfer & Deactivate flow**
  (`routes/users.py`, `admin/AdminUsers.jsx`, `admin/AdminGrowthPartners.jsx`).
  - Extended `TeamUser` model with `date_of_birth`, `marital_status`,
    `anniversary_date` (shown only when Married), `joining_date` and
    `work_mode` (In Office / WFH / Hybrid).
  - New "Transfer & Deactivate" row action that: reassigns every
    `school_inquiries.assigned_to` and every **open** support query
    (`support_queries.status ∉ {resolved, closed}`) to a target team
    user, stamps `deactivated_at/by`, `transferred_to`, and stores a
    `transfer_snapshot` for a 30-day undo window.
  - New tab **Past Team Members** on `/admin/users` listing off-boarded
    users with target-user and one-tap **Undo Transfer** (`POST
    /team-users/{id}/undo-transfer`).
  - Historical (resolved/closed) queries keep the original owner's name.
- **Feb 2026** — **Growth Partners → Active Partners tab fixed**
  (`AdminGrowthPartners.jsx`).
  - Previously filtered by the legacy `is_growth_partner=true` flag,
    which mis-listed users whose role in Users & Roles was actually
    something else (e.g. B2C Sales). Now the source of truth is the
    role assignment: `team_users.role_id → roles.name = "Growth Partner"`.
  - Existing KPI accordion (leads, conversions, revenue, AOV, students,
    retention, lost + schools-by-stage) works unchanged for any team
    user via `GET /growth-partners/{team_user_id}/kpis`.
- **Feb 2026** — **Future Skills book covers + flipbook popup (ICSE/CBSE)**
  (`school/FutureSkillsLanding.jsx`, assets in `public/books/future-skills/`).
  - Swapped the 8 placeholder pedestal cards for the real Grade 1–8 covers.
  - New `.fs-book-pad` / `.fs-book-inner` styles ported from Robotics
    Beginner — perspective + `rotateY(-22deg)` on hover with layered shadow.
  - Replaced the "sample chapter coming soon" placeholder modal with a
    real Heyzine / FlippingBook iframe lightbox (matches CT&AI). Each
    grade has its own flipbook URL (user-supplied).
- **Feb 2026** — **Success Story image upload fix, round 2**
  (`AdminSuccessStories.jsx`, `routes/misc.py`).
  - Root cause was `/api/upload` requiring auth; modal posted without
    the `Authorization` header. Now sends `getAuthHeaders()` and lets
    axios manage the multipart boundary.
  - Backend now accepts `.webp .gif .heic .heif .ppt .pptx` (was
    rejecting common phone-camera formats).
  - Verified end-to-end via Playwright on the preview: modal → file
    picked → `Replace` button visible (Cloudinary URL stored).
- **Feb 2026** — **Fixed Admin Success Story image upload (401)**
  (`AdminSuccessStories.jsx` `uploadImage` / `uploadAttachment`).
  - `/api/upload` requires auth; the modal was posting without headers →
    `403 Not authenticated`.
  - Fix: pass `getAuthHeaders()` and stop manually setting `Content-Type`
    so axios adds the correct multipart boundary. Error toasts surface
    the backend's `detail` message.
  - Verified with curl (no-auth → 403, with-auth → 200 + Cloudinary URL).
- **Feb 2026** — **Admin Organisation Chart interactions wired end-to-end**
  (`/admin/org-chart` → `OrgChartView.jsx`, `AdminOrgChart.jsx`).
  - Fixed empty tree caused by wrong roles endpoint (`/api/team-roles` →
    `/api/roles`) and mismatched user field names (`full_name` → `name`,
    `role` → `role_id`).
  - Clicking any node opens a right-side drawer with the selected member's
    Monthly Salary (net_paid) plus Base / Incentive / Deduction breakdown,
    role-linked KPI count, and a "View Performance" CTA that routes to
    `/admin/users/:id/performance`.
  - Salary fetched from `GET /api/salaries?user_id=<id>&limit=1` with
    role-based visibility (admin sees all, manager sees direct reports).

- **Feb 2026** — **SEO + mobile hardening for all 4 school landing pages**
  (CBSE CT & AI, ICSE Future Skills, CBSE Future Skills, ICSE Robotics 9-10,
  Beginner Robotics). Tested via testing_agent iteration_116 — all PASS.
  - Trimmed `<title>` to ≤63 chars and meta description to ≤160 chars on
    every landing page (SERP-safe).
  - Switched canonical URLs to keyword-rich slugs (short original routes are
    kept as aliases so any inbound backlinks continue to work):
    - CBSE CT&AI  → `/school/cs/computational-thinking-and-ai-classes-3-to-8`
    - ICSE Future Skills → `/school/cs/icse-future-skills-classes-1-to-8`
    - CBSE Future Skills → `/school/cs/cbse-future-skills-classes-1-to-8`
  - Added a shared **`SchoolBreadcrumbs`** component
    (`/app/frontend/src/components/school/SchoolBreadcrumbs.jsx`) that
    renders a visible breadcrumb trail AND overwrites the page's JSON-LD
    `BreadcrumbList` schema (via matching `schemaId`) so the visible trail
    and structured data stay in sync.
  - Added a shared **`SchoolRelatedPrograms`** component
    (`/app/frontend/src/components/school/SchoolRelatedPrograms.jsx`) —
    renders 4 keyword-rich cross-links to the other landing pages just
    before the footer. Builds topical authority + gives principals a
    next-step without bouncing back to the homepage. Supports dark theme
    (used on Beginner Robotics page).
  - Appended all 5 school landing URLs to `/app/frontend/public/sitemap.xml`
    under a new "Tier 5b" block with `priority=0.9-0.95` and weekly
    changefreq.

- **Feb 2026** — New landing funnel: **CBSE Computational Thinking & AI
  (Classes 3–8)** at `/school/cs/cbse-ct-ai` (aliases: `/school/cs/cbse`,
  `/school/cs/computational-thinking-and-ai-classes-3-to-8`).
  - File: `/app/frontend/src/pages/school/CBSECTAILanding.jsx`
    - Anchored to real CBSE Circular Acad-15/2026 (01.04.2026) — links to
      the official circular PDF from the hero card.
    - Sticky pill nav (OLL logo + subject tag + Download Brochure + Book a
      Demo) plus mobile sticky bottom CTA — same pattern as the ICSE 9/10
      landing.
    - Section 1 hero: "CBSE has mandated a New Subject. Still confused about
      CT & AI? *let us guide you.*" — Zing Rust display + Caveat script
      subtitle + circular-highlights card.
    - Section 2: "What is CT & AI?" with 4 CT pillars (Decomposition,
      Pattern Recognition, Abstraction, Algorithms) and 4 AI pillars
      (How AI Learns, Ethics & Bias, Everyday AI, Creative AI).
    - Section 3: OLL's Speciality — 3 cards summary, then deep-dives:
      * Interactive Books · Grades 3–8 — 6 tinted book placeholders with
        spiral binding + "View Sample" that opens a lead-friendly placeholder
        modal (real book covers to be swapped in later).
      * Virtual Lab for CT & AI — placeholder video window (16:9) ready to
        accept the YouTube ID once the demo game clip is ready.
      * Teacher Lesson Plans, PPTs & Videos — reuses the shared
        `LMSSection` component so the Student/Teacher/School role columns
        stay in sync with the other landings.
    - Final navy CTA banner, short About block, shared Footer, and full
      brochure lead-capture modal (POSTs to `/api/schools/register` and
      triggers PDF blob download).
    - SEO: title, meta description/keywords, canonical, Open Graph,
      Twitter card and JSON-LD Course + BreadcrumbList.
  - `App.js` routes updated: `/school/cs/cbse`, `/school/cs/cbse-ct-ai`
    and long-tail slug now point to the new component (were previously
    aliased to the Beginner landing as a placeholder).
  - Verified on desktop (1920) and mobile (390) viewports — all 9 sections
    render, sample modal opens, sticky bottom CTA is pinned correctly.

- **Feb 2026** — Support Center now has a dedicated **Techfest** category,
  and every entry point that classifies a ticket has been taught about it.
  - Admin (`AdminSupportUnified.jsx`): added `techfest` to `QUERY_TYPES`
    (rose pill, Trophy icon) and 10 sub-categories to `RELATED_TO_OPTIONS`:
    `registration_query`, `tracks_rounds`, `kits`, `regionals`, `prizes_fees`,
    `confirmation`, `sponsorship`, `media`, `feedback`, `other`. Shows up in
    the top-bar Query Type filter, list badges, Create Ticket modal and
    Edit Ticket modal.
  - Need Help button (`RaiseQueryButton.jsx`): submissions from `/techfest*`
    pages now collapse the two-level Need Help selection into
    `query_type = "techfest"` + one of the 10 admin slugs. The human
    "Category → Sub-question" is prefixed to the message body so agents keep
    the full context (`[Registration & Eligibility → How do I register?]…`).
  - Gmail bot (`gmail_bot.py`): added `techfest` to `VALID_QUERY_TYPES`,
    the full slug set to `VALID_RELATED_TO`, and updated `CLASSIFIER_PROMPT`
    with a rule that inbound customer emails about the OLL × Techfest IIT
    Bombay championship route to `query_type=techfest` (not to be confused
    with the existing "outside college sponsorship pitch = is_query false"
    rule). Added 5 few-shot examples covering registration, kits, regionals,
    prizes and confirmation-not-received.
  - Verified end-to-end: submitted a real inquiry through
    `/api/inquiry/query` → ticket #0329 lands in Support Center with
    Techfest rose pill + Registration & Eligibility sub-category. Cascading
    Related-To dropdown returns all 10 sub-categories when Query Type is
    switched to Techfest.

- **Feb 2026** — Robotics Shop admin now has Cashfree Verify + Refund actions,
  matching the pattern used on Student Online Payments.
  - Backend: two new admin-only endpoints in `/app/backend/routes/shop.py`:
    - `POST /api/admin/shop/orders/{order_id}/verify` — calls
      `PGFetchOrder` and, when Cashfree reports PAID, calls the existing
      `_finalize_paid_order` (which is idempotent) so vendor POs are
      submitted and the confirmation email is sent.
    - `POST /api/admin/shop/orders/{order_id}/refund` — validates the order
      is PAID + has a `cashfree_order_id`, calls `PGOrderCreateRefund` and
      marks the order `payment_status="refunded"` with refund_id/amount/note/at/by.
  - Frontend (`AdminShopPanel.jsx`): new "Verify" button on non-paid rows,
    new "Refund" button on paid rows, purple REFUNDED badge, "Refunded"
    filter option, and a `RefundModal` with pre-filled amount, reason
    textarea and safety warning. Order detail modal now shows the refund
    receipt block (refund id, amount, note, at, by) when applicable.
  - Verified end-to-end with curl (verify with & without cf id, refund on
    non-paid = 400, order-not-found = 404) and via UI screenshot.

- **Feb 2026** — Mobile scroll bug on Admin My Space Task Detail modal fixed
  (`AdminTasks.jsx` line ~1079). Root cause: modal used `h-[95vh]` inside a
  `fixed inset-0` overlay; on mobile browsers `vh` includes the URL bar area,
  so the top of the modal (title, status pills, Mark Complete button) sat
  behind the browser chrome and the internal scroll region was clipped by
  the visible viewport. Fix: switched to `h-[100dvh]` (dynamic viewport
  height), dropped mobile backdrop padding (`p-2` → `p-0`), rounded only the
  top corners on mobile (`rounded-t-2xl sm:rounded-2xl`) so it feels like a
  proper full-screen bottom sheet, and added iOS safe-area bottom padding
  (`pb-[max(1rem,env(safe-area-inset-bottom))]`). Verified on 390×780 mobile
  viewport — modal now fills exactly the visible viewport (clientHeight ==
  window.innerHeight, top offset 0) with all task actions reachable.

- **Feb 2026** — ICSE 9/10 Landing Kit Box image fix: `RoboticsICSE910Landing.jsx`
  now points `KIT_BOX_PRODUCT` to the correct transparent-case product photo
  (asset `n2zt8acf_...`, showing OLL Grade 9 & 10 ICSE Robotics & AI Lab Kit with
  STEM.org accreditation + 30+ Hands-on Activities badge). Previously pointed to
  a Kit Highlights text-card screenshot by mistake.

- **Feb 2026** — Team-user-scoped referral links on `/admin/competitions`:
  Every team user now gets an auto-provisioned personal referrer link
  (`oll.co/techfest?ref={slug}`), visible as a green banner on the page with
  live counts (schools · educators · total). Non-admin users see *only* the
  registrations attributed to their own slug — list, export, edit and
  soft-delete are all scoped by `owner_email` on the backend (403 on cross-user
  actions). Admin retains full access + the Referrers tab. New endpoint:
  `GET /api/admin/techfest/referrers/me`.

- **Feb 2026** — Techfest Admin + Registration upgrades:
  1. `/admin/competitions` now shows **Robotics** column (Yes/No + format + vendor)
     and **Source** column, plus per-row **Edit** / **Soft-Delete** actions with a
     Dialog-based edit modal. Soft-deleted rows are excluded from list/export.
  2. Techfest registration form (school + educator) captures **How did you find
     out about us?** — Social Media / Google Search / IIT Techfest / Through
     Someone (with name field) / Other. When the visitor arrives via
     `oll.co/techfest?ref={slug}` the source is auto-tagged as `referral` and
     the referrer's friendly name is shown as a pill (no manual selection).
  3. New **Referrers** tab: admin can create referral slugs, copy shareable
     `oll.co/techfest?ref={slug}` links, and see per-slug counts of Schools /
     Educators / Students / Total. Backend: `POST/GET/PATCH/DELETE
     /api/admin/techfest/referrers`, public `GET /api/techfest/referrer/{slug}`.
     `/techfest` landing preserves `?ref=` when navigating to `/techfest/register`.
- **Feb 2026** — Invoice PDF signature block now anchored at fixed bottom of
  page 1 (Notes inlined, Terms rendered in 2 columns, sig 24×10mm).

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
