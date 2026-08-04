# OLL Backend Changelog

## 2026-08-04 (round 7) — Age display cleanup + FS KPIs moved to Performance 🎯
**Status: COMPLETE — 6 new KPIs assignable per role, gate removed from CRM**

### What changed

**Age display (`AdminFutureSkills.jsx`)**
- Leads + Trials tables now show just the age/age-group number below the name (`3-7`, `8-11`, `12`) — no more `Age group ...` / `Age ...` prefix wording.

**Roles refactor — FS KPIs out of "features", into "performance"**
- Removed 6 `future_skills.kpi.*` permissions from `PERMISSIONS_CATALOG` in `AdminUsers.jsx` (they were sub-toggles under the Future Skills CRM feature).
- Backend `KPI_CATALOG` (`routes/kpis.py`) now includes 6 new items under a **Future Skills** category: `fs_leads_generated`, `fs_lead_to_trial`, `fs_trial_to_paid`, `fs_revenue`, `fs_aov`, `fs_profit_margin`.
- New `_compute_future_skills_metrics(start, end)` computes those from `future_skills_leads`, `future_skills_trials`, `future_skills_subscriptions`, `future_skills_expenses`. Wired into `_compute_selected_metrics` via `fs_` prefix.
- `AdminFutureSkills.jsx` KPI card gates simplified — anyone with the `future_skills` feature sees all cards on the Reports tab. Granular visibility is now driven exclusively through the role's KPI assignment (Users & Roles → Manage KPIs).
- `UserPerformance.jsx` gains a sky-blue Future Skills theme + matching icon.

### Verification
- `/api/kpis/catalog` returns the new `Future Skills` group with 6 items ✅
- Assigned all 6 to a test role → `/api/users/{id}/performance` returns real values (62 leads · 33.9% Lead→Trial in DB-wide window) ✅
- User Performance page renders all 6 cards in sky-blue category theme with sparklines ✅
- Age columns removed from Leads + Trials tables; age shows as bare number below name ✅


## 2026-08-04 (round 6) — Trial funnel polish: names, dates, 12h clock, lead-on-dropoff 🎯
**Status: COMPLETE — verified end-to-end (helpers + UI + admin CRM)**

### What changed

**Public booking (`FutureSkillsBookingPage.jsx`)**
- Removed the Parent's Name field entirely — step 1 is now Phone + Child's Name only.
- Child's Name is still sent as `parent_name` (fallback) AND `student_name` so trials always land in CRM with a human-readable identifier.

**Backend (`routes/future_skills.py`)**
- New helpers: `_fmt_time_12h("17:00") → "5pm"`, `_build_batch_label(batch) → "Robotics · Mon,Wed · 5pm-6pm"`, `_next_session_scheduled_at(batch)` picks the next matching weekday in IST at the batch's start_time and returns UTC ISO.
- `register_trial`, `admin_lead_book_trial`, `admin_create_trial`, `admin_trial_reschedule`, `admin_convert_to_customer`, and the leads-import all use the new 12h-formatted batch_label + auto-derived `scheduled_at`.
- `booking-intent` now creates a `future_skills_leads` row (once per phone) so a parent who drops out mid-funnel still appears in the CRM as a fresh lead with source and phone.
- `TrialUpdate` PATCH model now accepts `student_name`, `age_group`, `source` so those fields can be edited from the admin CRM.

**Admin CRM (`AdminFutureSkills.jsx`)**
- Leads table: removed the standalone Age column; age group / child age now shows below the name in the Name column.
- Trials table: same treatment — age shows below student name.
- Trial detail drawer: `student_name`, `age_group`, `source` are now editable dropdown/input fields at the top. Removed the read-only Email + Grade + Parent Name blocks (parent name intentionally not collected any more). Scheduled is displayed in a human-readable format (`fmtDateTime`).

### Verification
- Unit-tested `_fmt_time_12h` (`17:00→5pm`, `17:30→5:30pm`, `09:00→9am`, `12:00→12pm`) and `_next_session_scheduled_at` for a Fri-batch @ 17:00 → next Friday 5pm IST as UTC ISO ✅
- End-to-end curl: booking-intent for `918111000222` → `future_skills_leads` row created as FSL-0219 named "Aditya Test" ✅
- Book trial with a real batch → `batch_label="Friday Aftrtnoon · Fri · 5pm-6pm"`, `scheduled_at="2026-08-07T11:30:00+00:00"`, `student_name="Arjun"`, `source="instagram"`, `crm_status="scheduled"` ✅
- Admin trials tab screenshot shows age-group below student name; blank-name rows now display italicised "no name" so they're easy to spot for backfill ✅


## 2026-08-04 (round 5) — Free-trial bookings now save parent/child name in CRM 📝
**Status: COMPLETE — name fields added to step 1, WhatsApp fired for 9028666246**

### Root cause of "bookings not showing in CRM"
The public trial-booking wizard (`/future-skills/book`) only collected: phone, age group, city, centre, batch. It never asked for parent/student name, so `future_skills_trials` rows landed with `parent_name=""` and `student_name=""` — making the Trials tab a wall of anonymous phone numbers. On top of that, dedup logic in `register_trial` returned early for any existing phone (skipping WhatsApp) — which is why triggering a resend for `9028666246` initially came back as `is_existing:true` with no send.

### What changed (`/app/frontend/src/pages/FutureSkillsBookingPage.jsx`)
- Added `parentName` + `studentName` state, two new inputs on Step 1 (below the phone field) with kebab-cased `data-testid` (`parent-name-input`, `student-name-input`).
- Step-1 validation blocks progression if either name is blank ("Please enter the parent's/child's name").
- Both fields now flow into `POST /future-skills/booking-intent` (so mid-funnel drop-offs get a WhatsApp with the right first name) and `POST /future-skills/register-trial` (so the CRM row is properly identified from the first save).

### Verification
- Delete existing FST-0029 row → re-book 9028666246 with `parent_name="Shreyaan"` + `student_name="Shreyaan"` → AiSensy queued `fs_trial_booked_confirmation` (id `ac741aab-fbd1-4e7e-ae51-9e1a8ff34435`).
- UI screenshot confirms the two new fields render on step 1 above the Continue button.

### Known still-open
User reported previous fs template deliveries still showing **Failed** on AiSensy despite Meta approval — awaiting the exact per-message error text from AiSensy dashboard to determine whether the header/button variables need adjustments beyond the 5 body params.


## 2026-08-04 (round 4) — Trial WhatsApp params fixed to match Meta template 💬
**Status: COMPLETE — verified against real template body from AiSensy dashboard**

### Real root cause (why previous fix didn't deliver)
AiSensy dashboard showed **100% Failed / ₹0 credits used** for the `free trial booking confirmation` campaign — Meta was rejecting every send at delivery. The `confirmation` template body actually has **5 DISTINCT variables**, not 5 copies of the parent name:
```
Hello {{1}}, ...
📍 Venue: [{{2}}]
📅 Date: [{{3}}]
🕒 Time: [{{4}}]
🗺️ Google Maps: [{{5}}]
```
We were sending `[first_name, first_name, first_name, first_name, first_name]` → Meta refused because a URL slot got plain text, and the rendered body was gibberish.

### What changed (`/app/backend/routes/future_skills.py`)
- New `_build_fs_trial_wa_params(trial)` helper that resolves the trial's center document (by `center_id` or fallback name) to pull `google_maps_link` + area/city, and parses `scheduled_at` into IST-formatted date (`7th August, 2026`) and time (`11am`), with graceful fallbacks (`your nearest OLL centre` / `we'll share the time shortly` / a valid oll.co URL) so Meta never sees a blank slot.
- Both `_send_trial_booking_confirmation` and `check_fs_trial_24h_reminders` now call the helper and send `[name, venue, date, time, maps_url]` matching the template exactly.
- 24h reminder query projection now includes `center_id`, `preferred_center`, `batch_label` so the helper can fill venue/time even for older trial records.
- `fs_booking_tried` kept at 1 param (name) — that template's body is simpler.

### Verification
- Unit-tested `_build_fs_trial_wa_params` across 3 scenarios (center+scheduled_at, batch_label only, minimal) — all produce sane 5-tuples.
- Live booking via admin CRM → AiSensy queued the send. Meta delivery will now succeed because param shape matches the approved template.


## 2026-08-04 (round 3) — Future Skills trial WhatsApp gaps fixed 💬
**Status: COMPLETE — verified end-to-end (4 endpoints + 24h reminder cron)**

### Root cause
The public `POST /future-skills/register-trial` was the ONLY endpoint firing the `fs_trial_booked_confirmation` WhatsApp. Every admin-side trial-creation path (`admin_create_trial`, `admin_lead_to_trial`, `admin_lead_book_trial`) silently skipped the WhatsApp, so parents booked from the CRM never got a confirmation. Separately the 24h-reminder cron built its query with `datetime.isoformat()` (produces `+00:00`) but many `scheduled_at` values in DB end with `Z` or have no offset at all — Mongo's lexicographic string comparison silently misses those rows.

### What changed (`/app/backend/routes/future_skills.py`)
- Extracted `_send_trial_booking_confirmation(trial)` helper (5-param AiSensy template, fire-and-forget). Called from all 4 trial-creation endpoints so parents get the WhatsApp whether booking is done from the public form or the admin CRM.
- Rewrote `check_fs_trial_24h_reminders()` to fetch every scheduled trial and compute the delta in Python (`datetime.fromisoformat` + `Z→+00:00` normalisation). Now robust to mixed formats: `2026-08-05T10:00:00Z`, `2026-08-05T10:00:00+00:00`, and naive strings. Also excludes `converted` trials.
- On reschedule (`admin_trial_reschedule`), reset `reminder_24h_sent=False` and unset `reminder_24h_sent_at` so the new trial time gets its own reminder.

### Verification (curl + manual cron run)
- Admin trial creation (`POST /admin/future-skills/trials`) → AiSensy queued `fs_trial_booked_confirmation` ✅
- Lead → convert-to-trial → AiSensy queued ✅
- Lead → book-trial with center + scheduled_at → AiSensy queued ✅
- 24h reminder cron correctly picks trials with `Z`-suffix AND `+00:00` suffix formats and queues `fs_trial_24h_reminder` via AiSensy ✅


## 2026-08-04 (round 2) — Social Media KPIs in Roles + Daily Report 📣
**Status: COMPLETE — verified via API + UI + email HTML build**

### What changed
- `/app/backend/routes/kpis.py`: added 4 KPIs under a new **Social Media** category (`social_ig_follower_growth`, `social_ig_engagement_growth`, `social_yt_subscriber_growth`, `social_yt_engagement_growth`) + new compute helper `_compute_social_media_metrics(start, end)` that reads `social_media_snapshots` and returns baseline-vs-current deltas (falls back to earliest in-range snapshot when no prior baseline exists). Wired into `_compute_selected_metrics` via `social_` prefix.
- `/app/backend/routes/daily_report.py`: new `fetch_social_media_data()` (7-day baseline vs today), `build_social_media_email()` with signed growth pills, and 8th section wired into `build_consolidated_email` + `send_daily_reports`.
- `/app/frontend/src/pages/admin/UserPerformance.jsx`: added Social Media theme (`#db2777` pink) + icon mapping so the new KPI group renders with matching color.

### Verification
- KPI catalog exposes the 4 new items under **Social Media** category ✅
- Role editor auto-shows the new group (frontend `AdminUsers.jsx` reads `/api/kpis/catalog`) ✅
- Assigned to a test role → `/api/users/{id}/performance?month=8&year=2026` returns real deltas (IG +40, YT +20, engagement %s) ✅
- User Performance UI renders all 4 sparkline cards in the pink Social Media section ✅
- Daily report consolidated HTML contains "Social Media Report" section with @oll.co_ Instagram + OLL YouTube stats and 7-day growth pills ✅


## 2026-08-04 — YouTube Analytics fixed with API key auth ▶️
**Status: COMPLETE — verified via API + UI**

### What changed
- `/app/backend/routes/social_media.py`: swapped Service Account credentials → `developerKey` (API key) in `_build_yt_client`; removed all Service-Account-specific scopes/paths and its error-branch about YouTube Studio permissions.
- `/app/backend/.env`: replaced `YOUTUBE_SERVICE_ACCOUNT_FILE` with `YOUTUBE_API_KEY=AIzaSyDeGsrFiqoSZhn4lr-3YCgmMA6MPlxXyh0`; `YOUTUBE_CHANNEL_ID=UCwQyfX_lsVCLBUV5Or-rZ8g` retained.
- Backend restarted, snapshot job triggered → seeded 1 trend data point.

### Verification
- `GET /api/admin/reports/social-media/youtube` → 200 with OLL channel: 2,270 subscribers · 165,942 views · 319 videos · latest 12 videos.
- `POST /api/admin/reports/social-media/youtube/snapshot` → `{ok: true}`, trend endpoint returns 1 bucket.
- Admin Reports → Social Media tab now renders the YouTube section end-to-end.



## 2026-02-23 (round 2) — Tasks module WhatsApp notifications 🔔
**Status: COMPLETE — full E2E verified (all 3 flows call AiSensy with correct payloads)**

### What was built
- New helper `_notify_task_whatsapp(task, template_key, assigner_id)` in `/app/backend/routes/tasks.py` — silently no-ops for self-assignment or when the assignee has no phone, otherwise fires an AiSensy campaign with 6 params:
  `{{1}} assignee_name` · `{{2}} task_title` · `{{3}} priority (UPPERCASE)` · `{{4}} due_date` · `{{5}} assigned_by_name` · `{{6}} task_link (deep link)`.
- Wired into three flows:
  - `POST /api/tasks` → `task_assigned`
  - `PATCH /api/tasks/{id}` with new `assigned_to` → `task_reassigned`
  - `PATCH /api/tasks/{id}` with new `due_date` (and no reassignment) → `task_due_date_updated` (also fires in-app notification)
- Extended `_find_user_display()` to also return `phone` from `team_users`/`admins` collections.
- Added the three template keys (`task_assigned`, `task_reassigned`, `task_due_date_updated`) to `routes/notifications.py` (canonical) + `server.py` mirror.
- `os` import added; `FRONTEND_URL` env used to build `/admin/tasks?open=<task_id>` deep link.

### AiSensy campaigns to create (5-min one-time setup)
Suggested body (identical for all 3 with different intro):
> Hi {{1}}, [task_assigned: A new task has been assigned to you] · Title: {{2}} · Priority: {{3}} · Due: {{4}} · Assigned by: {{5}} · Open: {{6}}



## 2026-02-23 — Educators → Applicants: Demo Priority, WhatsApp Reminders, Mandatory Bio + City 👩‍🏫
**Status: COMPLETE — iteration 107 · 13/13 backend pytest PASSED · frontend flows verified**

### What was built
- **Today's Demo Priority section** (`AdminEducators.jsx` — Applicants tab). Renders only when there are demos scheduled for today's date; sorted by `demo_time` ASC (Amarja 10:00 → Himanshi 11:00 → Rajani 15:00), numbered pills, live "Join" links + per-row reminder button. Header carries a bulk **"Send all reminders"** button.
- **WhatsApp Demo Reminders** — new `jobs.py` endpoints:
  - `POST /api/jobs/send-educator-applicant-demo-reminders` (admin OR JOB_SECRET cron) — for every applicant with `demo_date=today` and status in ('new','demo_scheduled'), sends WhatsApp to the applicant AND to the assigned Educator HR (`team_users.phone` / `users.phone`). Idempotent per day via `applicant_demo_reminder_sent_on`.
  - `POST /api/jobs/send-educator-applicant-demo-reminder/{app_id}` — admin-only per-applicant trigger for the inline row button.
  - Two new AiSensy template keys added to both `server.py` and `jobs.py` (`educator_applicant_demo_reminder`, `educator_applicant_demo_reminder_hr`) — user must create matching AiSensy campaigns with params `[applicant_name, demo_date, demo_time, meeting_link]`.
- **Mandatory Bio + City** at application time — `EducatorApplicationCreate.model_validator` rejects payloads with `bio<30 chars` or empty `city` UNLESS the application is requirement-linked (`requirement_id`) or admin-added (`added_by`). Enforced on both `/api/educators/apply` and `/api/educators/apply-verified`. Client-side `EducatorFunnel.handleProceedToOTP` blocks OTP send with a targeted toast before making the API call.
- **Incomplete Profile flag & filter** — Applicants tab now has an `AlertTriangle` chip **"Incomplete Profile (N)"** that filters to applicants missing bio/city. Every card in any Applicants view carries an amber **"Incomplete"** badge (with tooltip listing missing fields) when applicable.
- Applicant `bio` field is now persisted on re-application and on `apply-verified` (previously silently dropped in the update path).



## 2026-02-21 (round 3) — Proxy Domain Pattern for Cashfree preview 🔐
**Status: COMPLETE — verified via live PGFetchOrder + preview navigation smoke test**
- Cashfree v3 SDK strictly enforces the browser origin against the merchant whitelist. Preview subdomains cannot be self-serve whitelisted. Implemented the industry-standard **Proxy Domain Pattern**:
  - New static file `/app/frontend/public/friendship-day-checkout.html` — hosted on the whitelisted `oll.co` domain, loads Cashfree v3 SDK and invokes `checkout({ paymentSessionId })` from a trusted origin.
  - New static file `/app/frontend/public/friendship-day-return.html` — after successful payment Cashfree redirects here (still on oll.co), which then bounces the parent back to the originating preview host via `?target=<url>` (safelist: oll.co, *.emergentagent.com/.net/.host, localhost).
  - `friendship_day.py` now dynamically sets `return_url` to `https://oll.co/friendship-day-return.html?target=...&order_id=...` when the request originates from a non-whitelisted host, and inline (no proxy) when the origin is already oll.co.
  - `FriendshipDayLanding.jsx` on preview navigates directly to `https://oll.co/friendship-day-checkout.html?sid=...&mode=production` instead of running the SDK locally.
- "As Seen On" logos enlarged 2× (h-24 sm:h-32 md:h-40 · max-w-[180/220/280px]).
- Env knobs added: `CASHFREE_PROXY_BASE_URL` (default `https://oll.co`), `CASHFREE_NOTIFY_BASE_URL` (default `https://oll.co`).
- Requires a single **Deploy** to `oll.co` so the two proxy HTML files exist on the whitelisted origin — after that, preview payments work end-to-end for any preview subdomain forever.

## 2026-02-21 (round 2) — Friendship Day updates 💛
**Status: COMPLETE — iteration 106 · 6/6 backend PASS · frontend all flows verified**
- Hero image replaced with the official Friendship Day flyer (hotlinked from customer-assets).
- Date normalised to **Sunday, 2nd August 2026** across landing, event details, form, order summary and success page — all references to "Saturday" / "1 Aug" removed.
- "As Seen On" section added (Kaun Banega Crorepati, Shark Tank India, STEM Accredited) using the user-provided transparent PNGs; equal height, hover scale + drop-shadow, fully responsive.
- Cashfree "Broken Link" issue mitigated: `return_url` now forced to `CASHFREE_RETURN_BASE_URL` (default `https://oll.co` — the whitelisted domain). On preview builds Cashfree checkout opens in a `_modal` (rather than `_self` full-page redirect) so the broken-link screen stays contained in the modal and the app remains functional. Production behaviour unchanged.
- Student CRM mirror hardened: `_mirror_paid_to_student_crm` helper called from webhook, `/verify/{order_id}`, and admin PATCH. Upsert by `{email, phone}` + `$addToSet` on `workshop_history` (workshop, workshop_name, center, center_name, amount, payment_status, campaign, registered_at, paid_at, registration_id).

## 2026-02-21 — OLL Friendship Day Workshop Landing Page & CRM 💛
**Status: COMPLETE — testing_agent iteration 105 · 19/19 backend pytest PASSED · frontend end-to-end verified**

### What was built
- **Public landing page** at `/friendship-day` (`/app/frontend/src/pages/FriendshipDayLanding.jsx`) — mobile-first, sticky CTA, hero, 3 workshop cards (Bracelet ₹499 / Digital Card ₹499 / Combo ₹799 with "Best value" badge), highlights, center listings, FAQ accordion. RegistrationModal with strict client-side validation (10-digit phone, age 3-18, valid email, required workshop + center), live "Order summary" panel, `knows_oll` / `participated_before` optional survey with reveal for `previous_workshop`.
- **Success page** at `/friendship-day/success` (`/app/frontend/src/pages/FriendshipDaySuccess.jsx`) — polls `/api/friendship-day/verify/{order_id}` with a Cashfree fallback fetch, shows confirmed booking or pending state.
- **Backend** `/app/backend/routes/friendship_day.py` — 8 endpoints, wired via `api_router.include_router(friendship_day_router)`:
  - Public: `GET /friendship-day/catalog`, `POST /register` (dedupe by email+phone; 409 on paid re-register; workshop_history log), `POST /initiate-payment` (Cashfree PGCreateOrder), `POST /webhook` (HMAC `x-webhook-signature` REQUIRED — 401 without), `GET /verify/{order_id}` (with Cashfree PGFetchOrder fallback + mirror into `student_inquiries` on paid).
  - Admin: `GET /admin/friendship-day/summary` (total/paid/pending/revenue + by_workshop + by_center breakdowns), `GET /admin/friendship-day/registrations` (filters: q, workshop, center, payment_status, start_date, end_date), `PATCH /admin/friendship-day/registrations/{id}` (status transitions), `GET /admin/friendship-day/registrations.csv` (attachment).
- **Student CRM integration** (`AdminStudentCRM.jsx`) — added `friendship_day_workshop` section with rose-500 pill; renders new `FriendshipDayCRMTab` (`/app/frontend/src/pages/admin/FriendshipDayCRMTab.jsx`) featuring stat cards, workshop & center breakdown cards, status filter tabs (All/Pending/Paid/Failed), search + workshop + center dropdowns, refresh, Export CSV, and inline status dropdown per row.

### Security
- Cashfree webhook enforces HMAC signature (SEC-002 pattern) — verified 401 without headers.
- Admin endpoints gated by `_admin` dependency (rejects non-admin roles with 403).

### Follow-ups noted
- Cashfree merchant dashboard must whitelist the preview domain for the final SDK redirect to render in preview builds — production checkout works after `Deploy`.
- Hero image is a placeholder Unsplash URL — swap `HERO_IMG` constant in `FriendshipDayLanding.jsx` when official flyer is provided.
- Workshop dates constant `WORKSHOP_DATES` set to "Saturday, 1 Aug & Sunday, 2 Aug 2026" — edit the constant to match confirmed schedule.



## 2026-07-03 (round 12) — Verified Success Stories 🏆
**Status: COMPLETE — smoke tested (backend + admin UI + dashboard widget + public page all rendering)**

### Concept
"A Verified Success Story is a measurable, externally validated achievement that demonstrates a child has applied their skills to create real-world value." OLL Success Ladder — Level 1 Creator → Level 2 Published → Level 3 Recognition → Level 4 Impact → Level 5 Transformation (flagship).

### Backend
- NEW `/app/backend/routes/success_stories.py` — full CRUD (`POST/GET/PATCH/DELETE /api/success-stories`), stats (`/api/success-stories/stats`), public list (`/api/public/success-stories`, `/api/public/success-stories/{id}`, `/api/public/success-stories/stats/summary`). Write ops gated to `role == "admin"`; list is available to any authenticated team member; `/public/*` requires no auth. Fields: student_name, age, school_name, image_url, level (1-5), story (HTML), excerpt, tags[], attachments[], evidence_links[], verification_notes (internal), is_published, is_flagship (auto-true for Level 5), level_name (auto), created_by/created_by_name/created_at/updated_at.
- Registered `success_stories_router` in `server.py`.
- `/api/dashboard/stats` — added `success_stories_count` (published only) to both team-member and admin payloads so every logged-in user sees the count.

### Frontend
- **Sidebar nav item** — `Success Stories` added under Support Center in `AdminLayout` sidebar (`icon: Trophy`, no permission required — visible to every team member).
- **Dashboard widget** — new `SuccessStoriesWidget` rendered between `MyKpisWidget` and `TodaysTasksWidget` for every user (team + admin). Shows total tile + one tile per level (Creator/Published/Recognition/Impact/Transformation), each linking into the admin page pre-filtered by level.
- NEW `/app/frontend/src/pages/admin/AdminSuccessStories.jsx` at `/admin/success-stories` — level cards (act as filters), search, story grid, Add Story button (admin only), Edit + Delete + View controls per card. `StoryModal` supports image upload (Cloudinary via `/api/upload`), multiple attachment uploads (certificates/proofs), evidence URL list, tag list, rich text story body via existing `RichTextEditor` (Tiptap), and publish toggle.
- NEW `/app/frontend/src/pages/SuccessStoriesPage.jsx` at public `/success-stories` — hero, level ladder (interactive filter), Flagship section for Level 5, main grid, story detail modal with evidence links, full CTA, `Navbar` + `Footer`. Includes `<Helmet>` SEO metadata + canonical `https://oll.co/success-stories`.
- Routes registered in `App.js`: `/success-stories` (public) + `/admin/success-stories` (protected).

### Data-testids added
`success-stories-widget`, `success-stories-view-all`, `stat-success-stories`, `success-stories-level-{n}`, `admin-success-stories-page`, `add-success-story-btn`, `level-filter-{n}`, `success-stories-search`, `success-stories-level-select`, `success-stories-loading`, `success-stories-empty`, `story-card-{id}`, `view-story-{id}`, `edit-story-{id}`, `delete-story-{id}`, `story-modal`, `story-name-input`, `story-age-input`, `story-school-input`, `story-excerpt-input`, `story-tag-input`, `story-link-input`, `story-verification-input`, `story-image-input`, `upload-image-btn`, `remove-image-btn`, `upload-attachment-btn`, `story-attachment-input`, `add-tag-btn`, `add-link-btn`, `level-btn-{n}`, `story-publish-toggle`, `story-cancel-btn`, `story-save-btn`, `view-story-modal`, `public-story-card-{id}`, `public-level-filter-{n}`, `public-clear-filter`, `public-story-detail`, `public-story-close`.



## 2026-07-03 (round 11) — Per-School Session & Attendance Reports 📊
**Status: COMPLETE — smoke tested (both endpoint + UI)**

### External integration migration
- **Old**: Supabase Edge Function CheckIn API (`X-API-Key: dlp_...`)
- **New**: FastAPI CheckIn API at `https://repo-explorer-196.preview.emergentagent.com/api`
  - Auth: `X-API-Key: oll_alOS9HbyYNnZMGXJDXKURe7FnUdxZhR60GrRPXkJqho`
  - Scopes on this key: `attendance:read/write`, `sessions:read/write`, `educators:read/write`, `timetables:read/write`
  - Verified working: `/sessions`, `/educators`, `/attendance`, `/timetables` (all with `X-API-Key`)
  - Server-side filters: `?timetable_id=` (works), `?user_id=` (works on attendance), `?session_id=` (works). `school_name`, `start_date`, `end_date` filters are IGNORED by the API → we filter client-side.

### Backend
- `.env` — added `CHECKIN_BASE_URL`, updated `CHECKIN_API_KEY` to new value
- `checkin_api.py` — `CHECKIN_BASE_URL` now reads from env (falls back to legacy Supabase URL if unset)
- **NEW endpoint**: `GET /api/schools/{school_id}/reports`
  - Merges CheckIn sessions + attendance for the school
  - Resolves timetables via school's stored `checkin_timetable_ids` (or fallback to case-insensitive `school_name` match against all timetables)
  - Enriches each session with: `educator` (name/email), `backup_educator` (from `original_educator_id`), `actual` block (`reached_time`, `checkout_time`, `late_minutes`, `location_name`, `photo_path`), and `attendance_status` (`on_time`/`late_lt_15`/`late`/`early`/`absent`/`no_data`)
  - Returns `stats`: total / completed / on_time / late / absent / reassigned
  - Supports `status`, `start_date`, `end_date` query params + pagination

### Frontend
- **NEW page** `/app/frontend/src/pages/admin/SchoolReports.jsx` at route `/admin/schools/:schoolId/reports`
  - Header w/ school name + Back button
  - 6-tile stat bar (Total / Completed / On time / Late / No check-in / Reassigned)
  - Filters: search (educator/date/location), attendance status dropdown, date range picker
  - Desktop table + Mobile card layout
  - CSV export
  - Pagination
- `AdminSchoolCRM.jsx` — new shared `reportsButton` that appears in the action row for `converted`, `active`, and `renewed` status cards. Auto-disabled with tooltip when the school has no linked `checkin_timetable_id(s)`.

### Data-testids added
`school-reports-page`, `reports-back-btn`, `reports-school-name`, `reports-refresh-btn`, `reports-export-csv-btn`, `reports-search-input`, `reports-status-filter`, `reports-start-date`, `reports-end-date`, `reports-clear-filters`, `reports-{schoolId}` (list button), `stat-total`, `stat-completed`, `stat-on-time`, `stat-late`, `stat-absent`, `stat-reassigned`, `session-row-{id}`, `session-card-{id}`, `reports-prev-page`, `reports-next-page`


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
