# Latest update (2026-02-10)
- **Techfest Bulk Email broadcaster** shipped in Admin → Competitions. Admins can blast the OLL × Techfest "Important Checklist" (editable HTML + subject) to any combination of Students / Schools / Educators, optionally filtered by zone and competition. Includes live audience preview, sample-send flow (default `shreyaan@oll.co`), background sender with 5 emails/sec throttle, and campaign history logged to `techfest_bulk_campaigns`.
- Files: `backend/routes/techfest_bulk_email.py`, `frontend/src/pages/admin/TechfestBulkEmailDialog.jsx`, `frontend/src/pages/admin/AdminCompetitions.jsx` (toolbar button + dialog mount).


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


## 2026-10-07 — Need-Help popup rich rendering + thumbs feedback + shop-card-persistence fix
- **Extracted `BubbleContent` as a shared component** from
  `FAQPage.jsx` so the Need-Help popup can reuse the exact same
  markdown-to-HTML pipeline (clickable links, bold/italic, bullet lists,
  product-card hydration, YouTube iframe short-circuit). Component is
  wrapped in a tight `React.memo` keyed on `content` only — parent
  re-renders triggered by thumbs-up/down clicks, composer typing, or any
  other sibling state change no longer wipe the hydrated DOM.
- **Fixed the "shop card disappears when I thumbs-up" bug** on `/faq`:
  previously the whole `MessageRow` re-rendered on feedback flip, and
  although `useMemo` returned a cached html string, the `__html` prop
  object reference changed every render which was causing React to
  re-apply `innerHTML`, wiping the hydrated card. By moving the bubble
  into a nested memo'd component that ignores feedback state, the
  hydrated card stays in the DOM across any number of thumbs clicks.
- **Need-Help popup now has all /faq features**:
  - Markdown bold / lists render as HTML
  - Links are clickable `<a>` tags
  - Shop URLs become rich product cards (image · price · See details · Buy now)
  - YouTube URLs on their own line become responsive iframes
  - Thumbs up / down under every AI reply, POST to `/api/faq-chat/feedback`
  - Thumbs bar collapses to "Thanks" after one click
  - Greeting message is flagged `isGreeting: true` so the thumbs don't
    appear on it (nothing to rate yet).
- Verified Playwright: ask "I want to buy robo sumo kit" → shop card
  renders with product image → click thumbs-up → card STILL rendered
  after the re-render (assertion green).


## 2026-10-07 — Multi-value filters · Need-Help AI chat · Public /admin/live
- **Multi-value column-header filters**: Admin Competitions header funnels
  now accept multiple selected values per column (checkbox list) — e.g.
  City = Mumbai + Delhi filters rows matching either. Filter state is
  array-based with proper clear-all and per-chip remove on the active
  strip. Supports type-to-filter inside the popover for long option lists.
- **Need-Help popup rewritten** (`RaiseQueryButton.jsx`): clicking the
  floating "Need Help?" button on any page now opens an inline AI FAQ bot
  (same `/api/faq-chat` engine as the public /faq page) with session
  continuity and pre-canned-answer indicator. Persistent 3-button footer:
  **Raise a Ticket** (switches into the existing 4-step wizard),
  **WhatsApp** (deeplinks `wa.me/919920188188`), **Email**
  (`mailto:info@oll.co`). Wizard mode now has a "Back to chat" shortcut.
- **/admin/live is now PUBLIC**: dropped the `ProtectedRoute` wrapper, the
  in-page `isAuthenticated` guard, and the backend auth dependency on
  `GET /api/live-dashboard/snapshot`. The dashboard can now be opened
  without login — intended for lobby TVs and public share.
- **Removed the India Map section** from `/admin/live`. The map was taking
  50% of the screen; the real signal is in the ops metrics. Grid is now
  6/6 (left + right) instead of 3/6/3. Metric values bumped `text-2xl →
  text-4xl` and hero numbers `text-3xl → text-5xl` to fill the reclaimed
  real estate on wall TVs.
- Verified end-to-end: public snapshot JSON returns all blocks; Playwright
  confirms URL stays at /admin/live without login; chat popup renders
  with messages, composer and 3 footer actions; column funnels now show
  numeric badges for selected count.


## 2026-10-06 — Header-column filters + searchable dropdowns everywhere
- **Moved filters INTO column headers**: the standalone "Filters" toolbar
  was replaced by a tiny funnel icon next to each filterable column header
  (City, Zone, Status, Coordinator, Competition, Source). The funnel turns
  red when a filter is active. One click opens a popover with a search
  input and the live-filtered option list; selecting an option applies it
  immediately and closes. Builder: new `HeaderFilter` component in
  `AdminCompetitions.jsx`.
- **All dropdowns are now searchable**: bulk Assign-Zone / Add-to-Team
  pickers and the Edit-Student Zone / Status / Team-Role / Move-to-Team
  pickers were migrated from plain `<select>` to a new reusable
  `SearchableSelect` component (type-to-filter input + scrollable option
  list with optional hint lines). Required for large teams rosters where
  a native `<select>` would be unusable.
- **Active-filters strip** at the top of each tab shows removable chips for
  every active filter + the current sort, with a one-click X on each.
- Verified via Playwright: funnel icon on the City column opens a
  searchable popover with 3 cities for the live Students tab; search
  filter works; team grouping and bulk/edit flows still render correctly.


## 2026-10-06 — Techfest copy · Competitions filters/sorting/bulk · Students team-grouping · School-assign + Export fix
- **Public Techfest Register copy**: "Register as an Individual" → "Register
  as a Student" (`TechfestRegisterPage.jsx` + the meta description + the
  Techfest FAQ answer on `/techfest`).
- **AdminCompetitions filters + sorting** on all 3 registration tabs
  (Students, Educators, Schools): adaptive dropdowns for Zone · City · Source
  · Competition · Coordinator · Status (options derived from loaded rows,
  blank filters hidden). Click any sortable column header to toggle asc / desc.
  Reset on tab change.
- **Students export FIXED**: `handleExport` now routes to the new
  `/admin/techfest/students/export` endpoint when tab=student (previously
  pointed at `/registrations/export` which only reads `techfest_registrations`
  — the Students CSV was always empty).
- **Students team-grouping**: students with the same `team_id` render as
  contiguous rows under an amber "Team · XYZ · N members" header; students
  with no team land in a trailing "No team" bucket.
- **Students multi-select + bulk actions**: Assign Zone · Assign Coordinator
  · Add to Existing Team. Backed by new
  `POST /admin/techfest/students/bulk-update`.
- **Educators + Schools multi-select + bulk actions**: same Assign Zone +
  Assign Coordinator buttons on both tabs. Backed by new
  `POST /admin/techfest/registrations/bulk-update` (admin-scoped; team users
  only patch their own referred records).
- **Edit-single-student dialog**: new per-row edit modal with Name / Email /
  Phone / City editable AND an "Assign School (from combined data)" searchable
  autocomplete over the combined-schools view — matching options get a
  green ✓ "matched" chip, free-text (no match) saves as a new school name.
  Zone · Status · Team Role · Move-to-team pickers included.
- **New backend endpoints** on `routes/techfest.py`:
  - `GET  /admin/techfest/students/export`
  - `PATCH /admin/techfest/students/{id}`
  - `POST /admin/techfest/students/bulk-update`
  - `GET  /admin/techfest/students/teams`
  - `POST /admin/techfest/registrations/bulk-update`
- Verified end-to-end via curl: export returns full header + rows, bulk-patch
  writes zone to Mongo, teams-aggregation returns 3 teams. UI smoke-tested in
  Playwright — team headers render with correct TM-xxx badges + member counts.


## 2026-10-06 — FAQ limit 10 · Week-nav timezone fix · Support metrics rework
- **FAQ daily limit**: Raised public FAQ chatbot daily cap from 3 → 10
  questions per visitor. Updated `faq_chat.py` DAILY_LIMIT constant and
  the limit-reached message copy ("come back tomorrow for 10 more").
- **Week navigator timezone bug** on
  `/admin/users/:id/performance`: the right arrow was skipping the
  28-Sept-to-04-Oct boundary week — root cause was
  `toISOString().slice(0,10)` which converts to UTC and rolls dates
  back a day for IST (UTC+5:30) when parsed at local midnight. Replaced
  with a `toLocalISO` helper on both the initial `_thisMon` state seed
  and the `shift(deltaDays)` prev/next handler. Verified via Playwright
  that 3×prev → 3×next produces the exact same sequence of weeks with
  no duplicates and no skipped weeks.
- **Support Center metrics rewrite** per user spec
  (`backend/routes/kpis.py` → `_compute_support_metrics`):
  - `support_tickets_assigned` — now strict: tickets whose `created_at`
    falls in the window AND are assigned to this user (no more backlog
    carry-forward).
  - `support_tickets_resolved` — subset of assigned with
    `status in [resolved, closed]`.
  - `support_resolution_rate` — resolved / assigned.
  - `support_avg_resolution_hours` — avg(resolved_at − created_at) over
    the resolved subset.
  - **NEW**: `support_overdue_queries` — of the assigned subset, how
    many are still open AND were created > 24h ago. Replaces the old
    `support_sla_breach_over_3d` (3-day threshold).
  - **REMOVED**: `support_first_response_hours` ("Avg first-response time").
- **Idempotent migration** on server startup (`_migrate_support_kpis`)
  rewrites every role's / user's stored `kpis` array to replace
  `support_sla_breach_over_3d` with `support_overdue_queries` and drop
  `support_first_response_hours`, so the role-filtered performance view
  starts returning the new KPI immediately after deploy — no manual
  reassignment needed.


## 2026-10-06 — AI Chat "add query" → raise_ticket + "QUERY ADDED" hallucination fix
- Fixed the user flow: upload image → type "add query" was producing a
  hallucinated "✅ QUERY ADDED TO TICKET #TECH-002" markdown block with ZERO
  real action emitted (no DB write, invented ticket ID). Also "raise query",
  "log a query", "create a query", "support query" all suffered the same bug
  — the LLM treated "query" as "add a comment to an existing ticket" instead
  of raising a new one.
- Three-layer fix:
  1. **System-prompt**: Rule #13 now explicitly maps the Indian support
     word "query" to `raise_ticket` and documents that user text on the
     current turn overrides the LLM's own prior classification.
  2. **Backend pre-hint**: new `_QUERY_RE` detects "add/raise/log/create/
     file/open/submit/send a query" patterns in the user text and
     prepends an explicit directive telling Claude to emit `raise_ticket`
     and NEVER invent a `#TECH-xxx` ticket ID (backend assigns the real
     one after the action runs).
  3. **Hallucination guard**: broadened to catch "QUERY ADDED TO TICKET",
     "Query Added / Raised / Logged", "Query #Q-123" invented IDs, and
     "log a query" speculative phrasings.
- Verified end-to-end: upload WhatsApp screenshot → turn 2 "add query"
  → image replayed → `raise_ticket` emitted → real ticket #0367 written
  to Mongo with full extracted details (name, phone, school, issue).


## 2026-10-06 — AI Chat image-context + action-execution fix (round 2)
- Fixed 3 critical bugs in `/admin/ai-chat` reported by the user:
  1. **Image context lost across turns** — When the admin uploaded an image
     in turn 1 and typed a refinement ("raise ticket", "make it a lead") in
     turn 2, the LLM would respond "I don't currently have the attached
     image in this chat thread" and emit a payload with all nulls. Fixed by
     **image carry-forward**: `run_ai_chat_turn` now auto-replays the
     attachments from the admin's most recent prior user turn whenever the
     current turn has no fresh attachments. The vision model is kept
     routed to Claude Sonnet 4.5 so the image is actually re-read.
  2. **LLM reverted to plain-text markdown on turn 2** — Because only the
     parsed `message` field was saved to session history, Claude saw its
     own prior assistant turns as prose and mirrored that format, breaking
     the required `{message, actions}` JSON envelope. Fixed by
     **reconstructing JSON** for every past assistant turn in
     `initial_messages` using `message` + stored `actions[]`.
  3. **"TICKET RAISED #TECH-002" style narrative with empty actions[]**
     — The old hallucination regex only matched verb-noun patterns
     ("Raised Ticket"), not noun-verb ("TICKET RAISED"). Broadened to
     catch both orders plus "Ticket #TECH-00X", "action payload",
     "I can emit", and raw-JSON `"action":"raise_ticket"` patterns.
     Also added a FORBIDDEN MESSAGE PATTERNS block to the system prompt
     explicitly banning raw JSON code blocks in `message` and claims that
     "the image is missing".
- Prevented DB bloat: replayed attachments are NOT re-stored on the
  current turn's user message (they already live on the earlier turn).
- Verified: upload WhatsApp screenshot → turn 1 raises ticket + writes to
  Mongo; turn 2 "make it a lead instead" → image replayed, lead created
  in Mongo. Clean messages, one action per turn, no hallucination.


## 2026-10-06 — AI Chat classification + hallucination guard
- Fixed Admin AI Chat (`/admin/ai-chat`) image-upload bug where the LLM was
  (a) emitting all 3 actions (lead + ticket + task) for every screenshot and
  (b) writing a fake "ACTIONS COMPLETED" narrative in the message text while
  the `actions[]` array was empty — admin saw "done" but no record was ever
  written to Mongo.
- Rewrote system-prompt rule #13 ("IMAGE INPUTS") to force a single
  classification step: lead | ticket | task | note | followup → emit exactly
  ONE primary action per image. Multiple actions only allowed when the image
  literally contains multiple contacts (e.g. 3 business cards side-by-side).
- Added a backend hallucination guard: if the LLM's `message` contains
  completion-narrative patterns ("Created Lead", "Raised Ticket",
  "Created Task", "ACTIONS COMPLETED", etc.) but the `actions[]` array has
  zero write-actions, the message is overwritten with a plain error so the
  admin knows nothing was actually saved. Logs the raw response to
  `backend.err.log` for inspection.
- Added a FORBIDDEN MESSAGE PATTERNS block to the prompt — the UI already
  renders action chips from the `actions` array, so narrating "ACTIONS
  COMPLETED" lists in the message is wasted + misleading output.


## 2026-10-06 — Prize-money correction + FAQ settings persistence fix
- Corrected Techfest 2026 prize structure across all surfaces: ₹1,50,000 is now
  the TOTAL championship pool (not "per track"). Split: ₹50,000 per competition
  (3 competitions) → 2 age groups per competition (Junior Grades 4-7 / Senior
  Grades 8-12) → shared across top-3 teams per age group.
- Updated: `backend/routes/faq_settings.py` (techfest default + "prize money"
  pre-canned), `backend/data/oll_pages_verbatim.md` (all 3 competition sections
  + cross-cutting block + hero ledes), `frontend/src/pages/TechfestPage.jsx`
  (prizes section hero/body, FAQ answer, hero chip).
- Fixed FAQ settings persistence: added `Cache-Control: no-store` on
  `GET /api/admin/faq-settings`, cache-buster `?t=` on frontend GET, PUT now
  returns the authoritative saved doc so the frontend re-syncs state from DB
  truth, admin PUT now auto-invalidates the in-memory FAQ response cache so new
  settings take effect on the very next public /faq query.
- Admin UI: added a visible "Saved · timestamp" badge next to the Save button;
  stronger error toast + console log on save failure.


## 2026-10-05 — OLLBot v3 (admin-editable knowledge base + live shop catalog)
- Bot no longer recommends external sellers (Robu.in, Amazon etc.) — hard rule in system prompt + live OLL product catalog injected on every reply.
- Scroll bug fixed: new replies anchor the user's latest question near the top of the viewport (no more jump-to-footer).
- Full knowledge base now editable at `/admin/faq-settings` (Admin → Settings → FAQ Chatbot) with 5 structured sections, starter-chip editor, and live-products toggle. No code deploy needed for content tweaks.
- New collection `faq_settings` (single doc, `id="main"`). Falls back to curated defaults when missing.
- Endpoints: `GET/PUT /api/admin/faq-settings` (permission=settings), `GET /api/faq-chat/suggestions` now reads from DB.


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
- **Sep 27, 2026** — **CheckIn → School P&L Educator-Cost Sync**
  Rotated CheckIn API base + key to a working preview instance. New helper distributes each educator's monthly earnings across their schools (weighted by active timetables) and merges into `teacher_cost` via `MAX(manual, checkin)`. Live sync now surfaces ₹4.13L across 13 schools (16 educators). Unmatched earnings (missing timetable / school not onboarded) are shown in a P&L modal so admins can reconcile upstream. New endpoint `GET /school-expenses/checkin-teacher-costs`. **See CHANGELOG.md**.

- **Sep 27, 2026** — **Live TV Dashboard (`/admin/live`)**
  Office wall-mounted 1920×1080 command centre with auto-refresh (30s):
  - India dark-map (ESRI tiles) with pulsing city dots — reuses `/central-database/by-city`.
  - Success Stories with Level 1–5 bar chart, Today's Sessions (CheckIn API, on-time/late/absent),
    Today's Support (new/overdue/resolved), School CRM & Student+FS CRM today counters,
    Coverage-by-segment breakdown, scrolling live activity ticker.
  - Backend: `routes/live_dashboard.py` with `GET /api/live-dashboard/snapshot` — six async
    aggregations run in parallel, IST-aware "today" bucketing.
  - Frontend: `pages/admin/AdminLive.jsx` (dark UI, live IST clock, scoped CSS pulse
    animations). "Need Help?" widget hidden on this route.

- **Sep 2026** — **Techfest Auto-fill Permission Letter + Submission Notifications**
  (`routes/techfest_permission_letter.py`, `routes/techfest_emails.py`,
   `routes/techfest.py`, `TechfestSubmitPage.jsx`).
  - `POST /api/techfest/permission-letter` — accepts submission form
    state and streams back a `.docx` filled with team lead, up to 5
    team members, competition/zone/age category, coordinator and
    signatory fields (falls back to blank placeholders).
  - Frontend "Download pre-filled letter" button replaces the static
    template link; POSTs current state and triggers browser download.
  - Submission endpoint fires background email (Gmail→Resend) +
    WhatsApp (AiSensy campaign `techfest_submission_confirmed`) to team
    lead AND every team member with contact info.
  - Emails carry reference ID, competition, zone, age category, drive
    link and full team roster.
  - **⚠️ Pending user action:** create the AiSensy campaign
    `techfest_submission_confirmed` with params `[name, competition,
    zone, reference_id]` — until then WhatsApp gracefully 400s and
    only email fires.

- **Feb 2026** — **Techfest Submission Portal · v2 (multi-member, permission letter, admin submissions tab)**
  (`routes/techfest.py`, `TechfestSubmitPage.jsx`, `AdminCompetitions.jsx`).
  - Competition-first order — zone field only appears when Robo Sumo /
    Robo Race is selected (Innovation hides zone). Backend enforces
    the same rule with a 400 on mismatch.
  - New **Age Category** dropdown — Junior (Grade 4-7) / Senior
    (Grade 8-12).
  - **Team Members** — repeatable rows, up to 5 additional members
    (lead + 5 = 6 max). Each captures name / DOB / email / phone /
    school + ID-proof upload (Aadhar · PAN · Other).
  - **School Permission Letter** — sample template download + upload
    of the signed scan (PDF / image).
  - **Google Drive checklist** now spells out the Technical Abstract
    (500-800 words + 5 sub-points), design diagram / CAD sketch and
    video demo, plus the "Anyone with the link · Viewer" reminder.
  - New public `POST /api/techfest/upload` endpoint (Cloudinary +
    per-IP rate limit) — participants aren't logged in.
  - **Admin → Competitions → Submissions tab** with a competition
    filter shows every submission incl. Drive & permission-letter
    view links.
## Implemented (latest first)
- **Feb 2026** — **STEM Preschool landing v2: navbar + LMS + About + Schools**
  (`school/StemPreschoolLanding.jsx`, `App.js`).
  - `/school/robotics/pre-school` now serves the STEM landing (was the
    old Robotics Beginner page) — the homepage "Pre-School" tile lands
    users straight on this page.
  - Swapped the generic global Navbar for a sticky **pill nav** matching
    Future Skills / Robotics landings: logo · "Preschool STEAM · Jr KG ·
    Sr KG" label · anchor links (Modules · LMS · About OLL · Our
    Schools) · red "Partner with OLL" CTA.
  - New **LMS & Parent App** section — 4 feature cards (Teacher app,
    Principal dashboard, Parent WhatsApp, Two-way messaging).
  - New **About OLL** section — "Big-school skills, tiny-school heart"
    headline + 4-stat strip (500+ schools, 50k+ kids, 95% teacher
    retention, 4.9★ parent rating) + NEP / ISO / Techfest badges.
  - New **Schools we work with** section — 8 partner preschools with
    city tags (placeholder logos ready to swap for real marks).
- **Feb 2026** — **STEM Preschool (Jr KG & Sr KG) landing page**
  (`school/StemPreschoolLanding.jsx`, `App.js`).
  - New public page at `/school/stem-preschool` (alias
    `/school/preschool/stem-jr-sr-kg`) built to mirror the "Little
    Innovators, Big Tomorrows" poster: hero with headline "Want Your
    Preschool to Have STEAM & Future-Ready Skills?", corner ribbon,
    handwritten cursive callout, "Grades Jr KG & Sr KG" pill and
    "Partner with OLL" CTA.
  - Sections: **Build Strong Foundations Early** (4 cards) → **The 5
    Pillars of STEAM** (Science · Technology · Engineering · Art ·
    Maths) → **What Your Preschool Gets** (8 offerings) → **Our STEAM
    Learning Modules** (Science Experiments · Paper Circuits · Lego
    Construction · Coding Bot).
  - **Video slots**: each module card renders an image + "Video
    coming soon" ribbon by default. Drop a YouTube URL into the
    module's `videoUrl` field and the card auto-swaps to a
    click-to-play embed — no other code changes needed.
- **Feb 2026** — **Techfest project Submission Portal**
  (`routes/techfest.py`, `TechfestSubmitPage.jsx`, `TechfestPage.jsx`,
  `App.js`).
  - New public route `/techfest/submit` with a full-fledged submission
    form: name, DOB (age auto-computed), email, phone, country,
    pincode, state, city, school/college, zone (5 options),
    competition (3 options), Team ID, Competition ID, and a required
    Google Drive link. When *Robo Innovation Challenge* is picked, the
    form reveals Project Category (8 preset options) + Project Theme.
  - Backend `POST /api/techfest/submissions` (public, no auth) + admin
    `GET /api/admin/techfest/submissions` with `zone` + `competition`
    filters. Data lives in a new `techfest_submissions` collection —
    kept separate from registrations so the submissions dashboard doesn't
    fight for space with the funnel.
  - **Submit Project** buttons now appear next to Register in both the
    Techfest landing top nav and hero CTA row.
  - Verified end-to-end with curl (public POST → admin GET returns it)
    and Playwright (form renders, DOB→Age auto-fill, Innovation
    conditional fields appear).
- **Feb 2026** — **Field Reports module (Admin)**
  (`routes/field_reports.py`, `AdminFieldReports.jsx`, sidebar + route).
  - New `/admin/field-reports` gated by the new `field_reports`
    permission (grant to Manager via Users & Roles). Sits between
    Central Database and Settings in the sidebar.
  - **My Field Day** tab: geolocation-tagged **Check In** (photo/selfie
    upload), one live session at a time, **Add School Visit** for every
    stop (school name / city / board / student bucket / fees bucket /
    has-robotics + provider + repeatable contact rows aligned with the
    school-CRM lead schema), **Add meeting note** per visit (report /
    product problems faced / next step), and **Check Out** to close.
  - **Reports** tab: read-only accordion. Regular users see their own
    days; admin (and anyone with `field_reports_admin` permission) sees
    the whole team.
  - Backend auto-creates a matching `school_inquiries` row (source
    `field_visit`, status `new`) for every visit and stamps
    `field_report_id` / `field_visit_id` so the record flows straight
    into School CRM. Verified end-to-end via curl (checkin → visit →
    meeting → checkout → list + school_inquiry created).
- **Feb 2026** — **Growth Partners: GP Earnings + author edit/delete stories + Educator location save fix**
- **Feb 2026** — **Techfest competitions + zones + coordinator workflow**
  (`routes/techfest.py`, `TechfestRegisterPage.jsx`, `AdminCompetitions.jsx`,
  `public/techfest/school-permission-letter.docx`).
  - **Registration form (school + educator)**: added *Select Competitions*
    multi-picker (Robo Sumo, Robo Race, Robo Innovation Challenge). When
    Sumo or Race is picked a *Regional Round Zone* dropdown appears —
    North · Delhi / South · Bangalore / East · Kanpur / West · Mumbai /
    Central · Indore. Zone is auto-cleared if the user un-picks every
    zonal competition.
  - **Success screen**: inline participants editor to add multiple
    students (name / grade / competition ID) and a team competition ID.
    A revisit link `/techfest/register?edit=<id>` is shown so the
    registrant can email themselves and update later — the endpoint
    `GET/POST /api/techfest/registrations/{id}` treats the Mongo id as
    the shared secret.
  - **School Permission Letter** download button added to the success
    resources (points to `/techfest/school-permission-letter.docx`).
  - **Admin Competitions edit modal**: 3-way competition picker, zone
    dropdown (revealed only when a zonal comp is chosen), Team
    Competition ID field, and a searchable **Assign Coordinator** panel
    (team-user autocomplete). Coordinator stamp = `coordinator_user_id`
    + `coordinator_name`.
  - **Coordinator visibility**: `GET /admin/techfest/registrations` now
    ORs the referrer-slug scope with `coordinator_user_id == user.id` so
    the assigned team member sees the row under their existing tab. The
    PATCH endpoint applies the same broadened check.
  - Verified end-to-end with curl (register → PATCH by admin → refetch)
    and Playwright (full form fill + participants save flow).
- **Feb 2026** — **School CRM: Assign RM in Renewed stage + broader RM data scoping**
  (`AdminSchoolCRM.jsx`, `routes/schools.py`).
  - Added the missing **Assign RM / Change RM** action button to the
    Renewed pipeline stage (matches Converted / Active).
  - Backend `/schools/inquiries` now scopes non-admin users by matching
    their `user_id`, `email` OR `name` against `assigned_to`,
    `assigned_to_name`, `added_by`, `relationship_manager_id` and
    `relationship_manager_name` — so RMs see every school they own
    across **all** stages, even for legacy records where the RM was
    stored as an email or a name string.
  - `is_owner` flag now uses the same broadened check.
  - Verified end-to-end with a temp RM token: only their 2 schools
    (Cathedral · renewed as RM + VVhs · renewed as assignee) came back;
    admin token still sees all 176.
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

- 2026-06: Shark Tank India S6 Young Founders — homepage poster banner + /shark-tank-young-founders full blue/yellow poster re-theme (see CHANGELOG). Pending P0: vendor API URL (blocked on user), P1: Sync Expenses button, file modularisation.
- BRAND RULE: OLL has NO full form — never write "Online Learning Launchpad".
- RESOLVED 2026-06: Vendor Panel API mismatch — now on https://vendor-panel-6kjc.onrender.com/api.

## 2026-06 (fork) updates
- Fixed build-blocking lint error in AdminExpenses.jsx (PnLSheet now receives getAuthHeaders + onRefresh props).
- "Sync Expenses (Educator Salaries)" button now always visible on School P&L Sheet (calls POST /api/school-expenses/import-educator-salaries); refreshes P&L after sync.
- Techfest: APPROVED submissions are locked — PATCH returns 403; portal shows "Locked (approved)" instead of Edit.

### Backlog
- P1: Backend permission enforcement mirroring AdminDashboard UI permissions
- P2: Split AdminCompetitions/AdminOrders/AdminTasks/AdminExpenses
- Future: duplicate invoice warning, multi-currency invoices, per-school invite email, audit logs
- Techfest admin Submissions: per-row "Send confirmation" + "Send result mail" buttons, checkbox selection with bulk bar (Send confirmation, Send result mail, Approve + email, Rework + email). "Rejected" relabelled "Rework" in UI (DB value still `rejected`); rework remarks emailed as "Changes Required". Endpoints: POST /api/admin/techfest/submissions/send-emails {ids, kind}, POST /api/admin/techfest/submissions/bulk-review. Bulk (>3) runs in background, throttled 0.6s/submission; Gmail SMTP moved to thread.
- Future Skills CRM lead assignee (all stages: Leads, Trials, Customers, Renewals, Lost): searchable assignee dropdown per row + toolbar Assignee filter. Managers (admin/super_admin, centre owners within centre) see/reassign all; regular members see own + unassigned, can assign unassigned to anyone, hand over/unassign own, cannot touch others' (403 on all mutation endpoints via `_owner_guard`). Assignee carries Lead → Trial → Subscription. Endpoints: GET /api/admin/future-skills/assignees, PATCH /api/admin/future-skills/{leads|trials|subscriptions}/{id}/assign, lists accept ?assignee=me|unassigned|<id>.
- 2026-06 fix: Robotics Shop Orders "Verify" button was dead — `verifyWithCashfree`, `onRefundDone`, `copyTracking` handlers were accidentally deleted from AdminShopPanel.jsx in an earlier edit; restored. Verify endpoint now also allowed for team members with `orders` permission. Lesson: run `npx oxlint -D no-undef` after large edits.
- Shop stock: vendor API `stock_status`/`in_stock` mapped to product `in_stock`. Out-of-stock items show "Out of stock" badge/disabled buttons (shop grid, PDP inline/bottom bar/Techfest nav), cart addItem guard, checkout warning + pay disabled, backend POST /api/shop/orders rejects OOS (400). Vendor cache TTL lowered to 60s.
- Franchise landing page `/franchise/robotics-ai-learning-center` (+ `/franchise` redirect) from user PDF: hero (₹2.5L, 1 room + 1 teacher), RbSkillsCarousel, Why/Different/Parents visibility/Included tabs/Services/Roles/Space/Who/Steps, RbAboutOLL, ParentsFeedback, InsideClassroom, enquiry form. POST /api/franchise/enquiry → growth_partners (interest_type centre_franchise, source franchise_landing), 24h duplicate guard, thank-you + team alert emails (FRANCHISE_ALERT_EMAIL=welcome@oll.co, from "OLL Franchise <welcome@oll.co>"). Homepage sections extracted into components/home/ParentsFeedback.jsx & InsideClassroom.jsx (+MediaLightbox); skills marquee extracted into components/school/RbSkillsCarousel.jsx. Navbar link: pending user decision.
- Franchise page re-themed to the Franchise Pitch PPT: royal-blue background, neon blue/red glow cards, heavy italic uppercase two-tone headings, pixel-square accents; images cropped from the deck into /app/frontend/public/franchise/*.webp (build-kid, thanks-kid, eco-kids, teacher, marketing, 5 skill cards). New "One Program. Five Future Skills." section. Source deck kept in /app/tmp_fr (can delete).
- Franchise page v3: sticky navbar (overflow-x: clip), Zing Rust headings, removed "One Program. Five Future Skills." section, "What Your Investment Builds" shows all 4 blocks stacked, Parent Visibility replaced by "Easy Implementation" (You Already Have: classroom space, educator, student batches — no projector; We Provide: curriculum, equipment, teacher training & SOPs, LMS & assessments, academic framework).
- Franchise page v4: "Easy Implementation" now merged with roles content (You Manage tiles + OLL Provides list), FrRoles removed; Services & Space as full-width rows with one-line pointers (desktop); How It Works = vertical alternating milestone timeline; skills carousel & About OLL re-skinned via `.fr-themed` wrapper CSS overrides.
- Franchise page v5: hero video (/franchise/hero.mp4, compressed 1.9MB, poster build-kid), chip Drones replaces 3D Printing, FrCenters (live from GET /api/future-skills/centers, now hides owner_email/owner_name), City searchable combobox from /api/cities (custom typed allowed), Occupation chips Educator/Institute Owner/Other(+text), Download Brochure (nav/hero/final) gated by name+phone+city → POST /api/franchise/brochure-lead (growth_partners source franchise_brochure, 24h phone dedupe) → /franchise/oll-franchise-brochure.pdf (3.8MB compressed pitch deck). Full mobile polish pass (≤640px).
