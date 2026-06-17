# OLL - Skill Education Platform
## Product Requirements Document

### Latest Changes (2026-06-17 pt3) — Full Bill-To/Ship-To overrides + IGST/Place of Supply (P0)

**Fixed**: Bill To / Ship To block in generated invoice PDFs no longer overlap when address text wraps. Refactored `renderPartyBlock(...)` in `invoicePdfGenerator.js` to:
- Use `doc.splitTextToSize(...)` to pre-compute wrapped lines.
- Compute dynamic block height from actual line counts.
- Print sections sequentially (label → name → address → GSTIN) at incremental y, never overlapping.

**Custom Invoice modal** now has:
- **Bill To section**: customer name, GSTIN, Bill To address, Bill To state, GST type.
- **Ship To section**: separate Ship To name + address + state, with a "Same as Bill To" checkbox (default ON).
- **Place of Supply selector** (drives GST math): when ≠ Maharashtra → IGST 18%; when = Maharashtra → CGST 9% + SGST 9%. Live preview pill shows which math is being applied.
- Tfoot updates to show IGST OR CGST+SGST breakdown based on Place of Supply.

**Per-school invoice overrides** (Update Payment modal in AdminOrders) now supports:
- `invoice_name_override` (legacy, name-only)
- `invoice_bill_to` { name, address, gstin } — full Bill To block override.
- `invoice_ship_to` { name, address } — separate Ship To override.
- `invoice_place_of_supply` — state name; outside-Maharashtra automatically switches to IGST.

**Backend changes**:
- `PATCH /api/schools/{id}/invoice-name-override` now accepts the expanded payload (`invoice_bill_to`, `invoice_ship_to`, `invoice_place_of_supply`) in addition to the legacy `invoice_name_override`. Each field can be cleared independently by passing empty values.

**Generator API**:
- `generateInvoicePDF(payment, schoolData, { skipDownload, nameOverride, customLineItems, billTo, shipTo, placeOfSupply })` — when `billTo`/`shipTo`/`placeOfSupply` are supplied they fully override the school's defaults.

**Smoke tests (curl + UI screenshots, all PASS)**:
- Update Payment modal: Bill To + Ship To + Place of Supply fields render, "Inter-state · IGST 18%" callout appears for non-Maharashtra states.
- Custom Invoice modal: Bill To + Ship To (with Same-as-Bill-To) + Place of Supply selector + live IGST math (₹9,344.16 on ₹51,912 base with UP place-of-supply).
- Backend PATCH writes and reads back all four override fields correctly.

### Latest Changes (2026-06-17 pt2) — Invoice "Bill To" Override + Custom Invoices (P0)

**1. Per-school "Bill To" name override (Update Payment popup)**
- Added an amber input block in the AdminOrders → Update Payment modal labelled "Invoice Bill To name override". Persists per-school as `school_inquiries.invoice_name_override`.
- Backend: `PATCH /api/schools/{id}/invoice-name-override {invoice_name_override}` (empty string clears).
- The override only affects the **Bill To** block on the generated PDF — Ship To, email recipients and CRM data continue to use the actual school name.
- `generateInvoicePDF` extended with a `nameOverride` option; AdminOrders passes `schoolData.invoice_name_override` on every PDF generation (download + email + save).

**2. Custom Invoice generator (FilePlus icon button in search bar)**
- New icon button in the AdminOrders search/filter bar opens a modal that lets admin author a one-off invoice for any non-onboarded customer.
- Fields: customer_name (req), GSTIN (optional), address, state, gst_type (exclusive_18 / inclusive_18 / book_gst_0).
- **Multi-row line items** (Description, Qty, Rate) with add/remove + live subtotal, GST and grand-total math.
- Generates a PDF in **the exact same visual format** as school invoices (same OLL branding, header, totals block, bank details, signature).
- Saves to new `custom_invoices` collection with sequential numbering: `OLL{YEAR}/CUST-NNNN` (atomic counter).
- "Recent Custom Invoices" history table inside the modal with one-click re-download.
- Backend module: `/app/backend/routes/custom_invoices.py`
  - `POST /api/admin/custom-invoices` — save (PDF base64 stored alongside metadata).
  - `GET /api/admin/custom-invoices` — list (without heavy PDF payload).
  - `GET /api/admin/custom-invoices/{id}/pdf` — stream saved PDF.
  - `DELETE /api/admin/custom-invoices/{id}` — remove.
- `invoicePdfGenerator.js` extended with `customLineItems` option — when supplied, replaces grade_pricing rendering and uses each line's plain description (no "Grade " prefix), preserving per-row GST math.

**Smoke tests (curl + screenshots, all PASS):**
- Override set/clear/round-trip via PATCH endpoint.
- Custom invoice create returns `OLL2026/CUST-0001`, list returns 1 row, PDF download returns valid `%PDF-1.4` bytes.
- Update Payment modal renders override field with school name as placeholder.
- Custom Invoice modal renders full form with GST math (Subtotal · GST 18% · Grand Total).

### Latest Changes (2026-06-17) — Gmail Dup-Fix + Accounts Communication Scheduler (P0)

**1. Gmail Bot Cross-Environment Conflict Fixed**
- Added `ENVIRONMENT` env var to `backend/.env` (defaults to `preview`).
- `server.py` only schedules `sync_all_gmail_accounts` when `ENVIRONMENT=production`.
- `routes/gmail_bot.py::sync_all_gmail_accounts()` also bails out early if `ENVIRONMENT != production` — so even a manual `/api/gmail/sync-now` triggered from preview becomes a no-op.
- Verified in startup logs: `[STARTUP] Gmail bot sync NOT scheduled — ENVIRONMENT='preview'`. On the deployed app, set `ENVIRONMENT=production` to enable the hourly sync.

**2. Accounts Communication Scheduler (Daily Invoice/Payment Reminders)**
- New module `/app/backend/routes/accounts_scheduler.py` with a daily 9:00 AM IST cron (CronTrigger `hour=3, minute=30, UTC`) that walks every `school_inquiries` with status in `[converted, active, renewed]` and `accounts_reminders_enabled != False`, scanning each open payment tranche for timeline offsets:
  - `T-7`, `T-2`, `T0` (due today), `T+1`, `T+3`, `T+7` (escalation — BCC to `clonefutura@gmail.com` + `lavisha@oll.co`).
- **6 approved templates (Anjali, OLL Accounts voice)** keyed by trigger. Same warm copy used for both school + distributor recipients. Sender: `Anjali, OLL Accounts <support@oll.co>`. Variables: `{name}` (first name), `{school}`, `{program}` (from `onboarding_data.offering`, fallback "Robotics program"), `{due_date}` (short "30 Jun" format).
- 250ms inter-send delay keeps the run safely below Resend's 5 req/sec rate-limit.
- Audience resolved by `onboarding_data.payment_mode`: `from_distributor` (when `distributor_contact_email` is filled) → distributor template path; else → school template path.
- Recipient priority (school): contact role contains `account` → `principal` → `trustee` → first contact with email → inquiry-level email fallback.
- Dedup via `accounts_reminder_log` collection (key: `school_id + tranche_index + trigger`).
- **Per-school kill-switch**: new field `accounts_reminders_enabled` (default True). Admin toggle in `AdminOrders.jsx` (School Payments tab) — green/grey switch under every school name with live "Auto reminders ON/OFF" label. Backend endpoint: `PATCH /api/schools/{id}/accounts-reminders {enabled}`.
- **Admin endpoints**:
  - `POST /api/admin/accounts-reminders/run-now` — manual trigger (admin only, dedup still applies).
  - `GET /api/admin/accounts-reminders/templates` — list all 6 templates + sender + escalation BCC.
  - `GET /api/admin/accounts-reminders/log?school_id=&limit=` — recent reminder send log.
- **Distributor contact fields** added to all 3 school onboarding modals (Convert, Renewal, Edit Onboarding) — `distributor_contact_email` + `distributor_contact_number`. Persisted in `onboarding_data` and synced via `PUT /schools/onboarding/{id}`.

**Smoke tests (curl + seeded test data, all PASS):**
- school T-7 routed to Accountant > Principal (priority winner verified).
- distributor T0 routed to `distributor_contact_email`.
- school T+7 BCC'd to `clonefutura@gmail.com` + `lavisha@oll.co`.
- Re-running `run-now` immediately = 0 sends (dedup verified).
- `accounts_reminders_enabled: false` = school's tranches skipped.

### Latest Changes (2026-06-16) — Robotics Kit E-commerce Shop (P0)

**New public funnel** at `/shop` — guest-checkout e-commerce for OLL Robotics & IoT kits.

**Backend (`routes/shop.py`, 730 lines, 17/17 pytest passing):**
- `GET /api/shop/products` — fetches catalog from OLL Vendor Panel public API (`vendorplus-4.emergent.host/api/public/products`), merges with local `shop_product_overrides` collection (image_url, mrp, selling_price, category, show_on_shop). Returns 139–140 visible products + `delivery_charge=150`.
- `POST /api/shop/orders` — creates a pending order with subtotal + flat ₹150 delivery; persists in `shop_orders` collection.
- `POST /api/shop/initiate-payment` — Cashfree v3 PGCreateOrder, returns `payment_session_id` (production env reused from existing `/payments` setup).
- `POST /api/shop/webhook` — Cashfree webhook: on `PAID`, marks order paid, **splits cart per `vendor_id`**, submits one `/api/public/po-request` per vendor to the vendor panel, saves the returned `tracking_token` + tracking URL on each PO, fires customer confirmation email via Resend.
- `GET /api/shop/verify/{order_id}` — success-page polling; also runs the finalize flow if webhook hasn't fired yet.
- Admin: `GET /api/admin/shop/orders`, `GET /api/admin/shop/purchase-orders` (with `?status` / `?vendor_id` filters), `PATCH /api/admin/shop/purchase-orders/{po_id}` (fulfillment_status: pending|dispatched|delivered|cancelled), `GET /api/admin/shop/products`, `PUT /api/admin/shop/products/{vendor_product_id}` (override image_url/mrp/selling_price/category/show_on_shop).
- Sample image + deterministic sample MRP filled-in until the vendor panel exposes those fields publicly (then we can drop the local generator).

**Frontend:**
- `/shop` page — hero, category filter pills, responsive product grid, "Add to Cart" with toast + cart drawer.
- `CartDrawer` — client-side localStorage cart, qty +/-, subtotal, navigates to /shop/checkout.
- `/shop/checkout` — guest form (full_name, email, 10-digit phone, line1/line2/city/state/6-digit pincode, notes) → calls `POST /api/shop/orders` → `POST /api/shop/initiate-payment` → Cashfree v3 hosted checkout.
- `/shop/success` — polls `/api/shop/verify/{order_id}` (up to 10 attempts × 2.5s), shows order summary + per-vendor PO tracking links.
- `AdminShopPanel.jsx` at `/admin/shop` — three tabs (Orders, Purchase Orders, Products); Orders detail modal shows full address + per-vendor PO breakdown.
- Footer: new "Robotics Shop" link (amber accent) under Support column.
- Admin sidebar: new "Robotics Shop" entry under Orders.

**New collections:**
- `shop_orders` — guest orders, shipping snapshot, items, totals, cashfree IDs, fulfillment_status.
- `shop_purchase_orders` — one per (order × vendor_id) with vendor_tracking_token + vendor_tracking_url returned by the vendor panel.
- `shop_product_overrides` — admin overrides keyed by `vendor_product_id`.

**Integration notes:**
- Vendor public API only exposes `id, name, sku, vendor_id, vendor_name, unit, description` today. `image_url`, `mrp`, `unit_price`, `show_on_shop` exist in their model but are not yet in the public response — when the vendor team enables those fields, swap the sample generator in `_merge_product` for live data.
- Cashfree webhook does NOT yet verify the `x-webhook-signature` header (advisory from testing agent — to add in a hardening pass).

### Previous Changes (2026-06-15) — Gmail Bot + Unified Student Search (P0)

**Feature 1 — Gmail Bot (Auto-create support tickets from inbox)**
- New backend module `routes/gmail_bot.py` with full Google OAuth 2.0 (Web App) flow.
- Admin connects any number of Gmail accounts (e.g., `info@oll.co`, `skills@oll.co`) via the Admin → Settings → **Gmail Bot** tab.
- Endpoints:
  - `GET /api/gmail/auth-url` → returns Google consent URL (offline + prompt=consent → guaranteed refresh_token).
  - `GET /api/oauth/gmail/callback` → exchanges code, upserts encrypted-on-rest tokens into `gmail_accounts`.
  - `GET /api/gmail/accounts` → list connected accounts (tokens stripped).
  - `POST /api/gmail/sync-now` / `/sync-now/{acc_id}` → manual trigger.
  - `DELETE /api/gmail/accounts/{acc_id}` → disconnect.
- **Hourly scheduler** (`sync_all_gmail_accounts`, APScheduler `IntervalTrigger(minutes=60)`):
  1. For each active Gmail account, list `is:unread in:inbox -category:promotions -category:social`.
  2. Skip obvious automation: no-reply, mailer-daemon, postmaster, Cashfree/Resend/AiSensy senders, our own outbound.
  3. Send subject + body to **Emergent LLM (gpt-4o-mini)** with a strict triage prompt → returns `{is_query, category, priority, subject_summary}`. Only `is_query=true` becomes a ticket.
  4. Auto-extract Indian phone numbers from the body for customer linking.
  5. Match sender email & extracted phone against **12 customer-bearing collections** (students, student_inquiries, demo_bookings, ai_foundations_bookings, summer_camp_bookings, workshop_bookings, student_payments, social_media_intern_registrations, inquiry_leads, future_skills_subscriptions/trials, school_inquiries). Attach `customer_link` to the ticket.
  6. Create `support_queries` ticket with `source='gmail_bot'`, embedded `gmail.{message_id, thread_id, gmail_url}` for traceability.
  7. Mark the Gmail message READ + log to `db.gmail_processed` so the next sync never reprocesses it.
- Failure modes are recorded on the account doc (`last_sync_error`) and shown in the UI.

**Feature 2 — Unified Student Search**
- New endpoint `GET /api/students/unified-search?q=<text|phone|email>` in `routes/unified_search.py` — searches all 11 customer-bearing collections, dedupes by `(phone | email | name)`, returns normalized `{source, source_label, name, phone, email, paid_amount, status, link, also_in[]}` with multi-source merge.
- Extended the existing `GET /api/data-center/autocomplete` (powers the Support → Create-Ticket form's Name/Phone/Email autocomplete) to also pull from every Cashfree booking + payment collection. The dropdown now shows source labels (`Cashfree · Summer Camp`, `Cashfree · AI Foundations`, `Future Skills Subscription`, etc.) plus the paid amount where applicable.
- Frontend: `AdminSupportUnified.jsx` autocomplete dropdowns now render the source label and ₹ paid amount per entry. Admins searching a name or phone in the support panel will now find **any student who paid via Cashfree on any funnel**, not just those in the legacy CRM.

**New collections:**
- `gmail_accounts` — connected Gmail accounts (encrypted tokens, last sync stats).
- `gmail_processed` — every Gmail message we've handled (msg_id, action, classification, ticket_id) — primary key (gmail_msg_id, account).
- `oauth_states` — short-lived OAuth state nonces (10-min TTL via expires_at).

**Credentials added to `/app/backend/.env`:**
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (Google Cloud Console OAuth 2.0 Web App). Redirect URI configured for both preview + `oll.co` production.

**Testing**: 15/15 backend pytest cases pass · Frontend Gmail Bot panel + Support autocomplete verified · OAuth consent URL generates correctly (full E2E OAuth not run — needs real Google account).

### Latest Changes (2026-06-15) — SEO / WhatsApp Link Preview Fix (P0)
- **Bug**: Sharing inner URLs like `oll.co/workshops/fathers-day-robotics` on WhatsApp/Facebook/Google showed the generic homepage image + title, instead of the workshop's own image + description. Confirmed via `curl -A "WhatsApp/2.23.20.0" https://oll.co/...` returning the homepage `<title>` and `og:image=https://oll.co/og-default.png`.
- **Root cause**:
  1. The previous prerenderer (`react-snap`) was unreliable under React 19 + `react-helmet-async`: puppeteer races sometimes captured the DOM *before* Helmet had flushed its `<head>` tags, so per-route HTML had a stripped head. One slow API call on `/about` also crashed the entire prerender pass, so the deploy fell back to the SPA shell for every URL.
  2. The `og:image` for the workshop pointed at a 2.1 MB Cloudinary PNG. WhatsApp refuses to fetch OG images > ~1 MB, so even with the right tag the image would silently fail to render.
- **Fix**:
  1. **Replaced `react-snap` with a deterministic Node postbuild script** (`frontend/scripts/seo-prerender.cjs`) that reads CRA's `build/index.html`, regex-rewrites `<title>`, `<meta name="description">`, `<link rel="canonical">`, and an OpenGraph + Twitter block, then writes `build/<route>/index.html` for every route in `seo-routes.cjs`. No puppeteer, no JS execution, no race conditions — runs in ~2s for 20 routes.
  2. **Auto-proxied all OG images through wsrv.nl** (`frontend/src/utils/ogImage.js` + same wrapper inside `seo-routes.cjs`). The Father's Day workshop image went from 2.1 MB PNG → 74 KB JPG, well under WhatsApp's hard ~1 MB ceiling.
  3. Updated `FathersDayWorkshopLandingPage.jsx` Helmet to also use `ogImage()` so the client-rendered tags stay consistent with the prerendered ones.
- **Verified**:
  - `yarn build` produced 20 per-route HTML files at `build/<route>/index.html`.
  - `grep og:image build/workshops/fathers-day-robotics/index.html` shows the wsrv.nl URL.
  - Locally served the `build/` dir and `curl -A "WhatsApp/..."` against the prerendered routes returned correct per-route `<title>`, `og:title`, `og:image`, `og:description`.
  - `curl -sI` against the wsrv.nl OG URL returns `200 / image/jpeg / content-length: 73833` (74 KB).
- **Deployment**: Cloudflare Pages / Netlify (per `public/_redirects`) always checks the filesystem first, so `/workshops/fathers-day-robotics/index.html` will win over the SPA `_redirects` fallback automatically on next deploy.

### Latest Changes (2026-06-12) — School CRM MoU View/Download Fix (P0)
- **Bug**: Admins/school users couldn't view or download uploaded MoU PDFs in School CRM. Files were served by Cloudinary with `Content-Type: application/octet-stream` and `Content-Disposition: attachment; filename="mou_xxx"` (no `.pdf` extension), so browsers downloaded an unreadable blob and PDF preview never opened.
- **Root cause**: Cloudinary's free-tier "Restricted media types: PDF" stripped extensions from raw-uploaded PDFs. URLs with `.pdf` returned 401; URLs without returned the file but with broken `Content-Disposition` headers.
- **Fix**: Added backend proxy `GET /api/files/proxy?url=<cloudinary_url>&download=0|1` that:
  - Looks up the file in `uploaded_files` collection to recover the original filename + content-type.
  - Generates a **Cloudinary signed URL** when fetching (bypasses the PDF restriction for both legacy URLs and new uploads).
  - Re-streams the file to the browser with correct `Content-Type: application/pdf` and `Content-Disposition: inline|attachment; filename="<original_name>.pdf"`.
- **Frontend updated**: `AdminSchoolCRM.jsx` (5 View/Download anchors + `downloadFile` helper) and `SchoolTrackingPage.jsx` (public school portal) now route MoU/document URLs through the new proxy.
- **Verified**: curl tests show valid `%PDF-1` headers, 509KB binary content, and correct filenames like `St Wilfred's Group School 2026-2028 MOU.pdf`.

### Latest Changes (2026-06-06) — School CRM: Move-Back Workflow Reset
- **Bug fix**: When admin clicks "Move Back" on an Active school to send it to Converted (or Renewed → Renewal Meeting/Active), the `onboarding_workflow.steps[].completed` flags now auto-reset to `false` so the admin can re-complete the purple onboarding progress bar. Step data is preserved.
- After all steps are re-completed via `/api/schools/{id}/onboarding-step/{step}`, the existing logic auto-transitions status back to `active`.
- Implemented in `backend/routes/schools.py` PATCH `/schools/inquiry/{id}` handler.


### Latest Changes (2026-05-15) — AI Foundations Overhaul + Cashfree v3 SDK
1. **🔴 Cashfree "Invalid form" fixed** — Root cause: `payments.cashfree.com/forms/{session_id}` is the deprecated v2 hosted URL; v3 sessions cannot be opened that way. Added the v3 SDK (`https://sdk.cashfree.com/js/v3/cashfree.js`) to `index.html`, created `frontend/src/utils/cashfreeCheckout.js` helper, and switched `AiFoundationsBookingPage.jsx` + `FutureSkillsBookingPage.jsx` to `cashfree.checkout({ paymentSessionId, redirectTarget:'_self', mode:'production' })`. Summer Camp was already using the SDK. On preview, Cashfree shows a domain whitelist error (expected — only `oll.co` is approved); on production it routes directly to the checkout.
2. **AI Foundations form simplified** — Removed parent_name, parent_email, school_name, notes from form. Phone + Student Name + Grade + Track + Batch only. Backend `BookingCreate` model made those fields optional for backwards-compat.
3. **AI Foundations navbar** — New `variant="aifoundations"` Navbar: sticky white nav, single "Book Now" CTA → `/ai-foundations/book`, Login hidden. Applied to landing, booking, and success pages.
4. **Mobile order** — Order Summary now renders first (order-1), form second (order-2) on mobile; reverts to right-column on `lg:` desktop.
5. **Copy update** — "Live classes · max 10 students (small cohort)" replaces "Cohort size · 12 students" in hero + FAQ + checkout summary.
6. **Batches feature** — New collection `ai_foundations_batches` + 5 endpoints (`/api/ai-foundations/batches` public + `/api/admin/ai-foundations/batches` CRUD). New `AiFoundationsBatchesSection.jsx` admin UI inside AI Foundations CRM tab lets admins create batches (label, track, days, timing, start_date, capacity, active). Booking form reads active batches via public endpoint and shows them as picker cards with seats-left counter.

### Previous Changes (2026-05-15) — Daily Report
- Support fetcher: unified queries across `support_queries`, `inquiry_queries`, `support_tickets` (counts, overdue, resolution rate now correct).
- Accounts receivables: partial payments now subtract `paid_amount` from tranche total (was showing full tranche due).
- Avg resolution time: 30-day rolling fallback when "today" is empty.

### Previous Changes (2026-05-07) — Bug Fixes
1. AI Interview commented out in apply flows.
2. Educator applications with empty status backfilled to `'new'` so all website apps are visible.
3. Student Partial Payment now saved; admin row shows Paid/Receivable + bar.
4. Need Help popup → maps page context to `inquiry_type`.

### Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

### Core Requirements
- **Global Structure:** Landing Page, Learner/Educator/School Funnels, Offerings, About OLL, Blog, Admin Panel
- **SEO & Social Sharing:** Unique titles, meta descriptions, H1 tags, canonical URLs, OG tags
- **Admin Panel & RBAC:** Users & Roles management, custom permissions
- **Content Management:** Dynamic blog management
- **Funnels & Login:** OTP-based login for all user types
- **Admin CRM:** Full school management with bulk import, onboarding workflows, inquiry management

### Architecture (Updated: 2026-02-XX — Future Skills Continuous Program)

### Changelog 2026-02 — Future Skills Continuous Learning Program (Grades 1–10)
- New flagship product: weekly offline classes in Robotics, Coding, AI, 3D Design & Emerging Tech.
- **Three age-mapped tiers**: Junior (Grades 1–4), Middle (Grades 5–7), Senior (Grades 8–10), each with distinct curriculum.
- **Two payment plans** (one-time upfront, no auto-debit mandate):
  - Monthly: ₹2,000 (cancel anytime)
  - Yearly: ₹21,000 (₹1,750/mo · saves ₹3,000 · free robotic kit · year-end Tech Showcase)
- **Two funnels:**
  - **Free Trial** (lead capture, no payment) → soft pitch on success page + post-trial conversion email
  - **Direct subscription** via Cashfree (sandbox + production-ready)
- Backend: `/app/backend/routes/future_skills.py`
  - `POST /api/future-skills/register-trial` — atomic FST-NNNN refs, dedup on phone, WhatsApp confirmation
  - `POST /api/future-skills/subscribe` — atomic FSP-NNNN refs, plan validation
  - `POST /api/future-skills/initiate-payment` — Cashfree order creation
  - `GET /api/future-skills/verify/{id}` — payment verification + auto-update
  - `POST /api/future-skills/webhook` — Cashfree webhook handler
  - Admin (auth required): `GET/PATCH /api/admin/future-skills/{trials,subscriptions}` — full CRM with status filters & search
- Frontend pages:
  - `/future-skills` — Hero, Problem, Solution, 5-track What-They-Learn, Tier curriculum cards, How-it-works, Transformation, Social proof, Pricing toggle, Final CTA, FAQ
  - `/future-skills/book?mode=trial|subscribe&plan=monthly|yearly` — single-page booking form with grade-tier curriculum hint and 12-centre offline dropdown
  - `/future-skills/success?type=trial|subscription` — success card + (trial-only) soft pitch panel for yearly/monthly subscribe
- Discoverability:
  - Homepage `/` adds a flagship Future Skills section (above AI Foundations 10-day card)
  - `/offerings` adds a Future Skills offering card with tier mini-grid
  - Admin sidebar: new "Future Skills" entry → `/admin/future-skills` with Trials + Subscriptions tabs, detail drawer with edit-status/centre/notes
- Test report: `/app/test_reports/iteration_80.json` — 24/24 backend + frontend critical flows PASS.
- Pytest regression: `/app/backend/tests/test_iter80_future_skills.py`

### Changelog 2026-04-26 — External MongoDB Dump
- Added `/api/admin/external-mongo/inspect` — connects to any URI, lists DBs/collections/counts (verifies connection before dump).
- Added `/api/admin/external-mongo/dump` — runs `mongodump --gzip --archive=…` against the supplied URI and streams the single-file archive back to the browser. Restore with `mongorestore --gzip --archive=<file>`.
- Added `/api/admin/external-mongo/jsonl-zip` — alternative bundled JSONL ZIP (no mongorestore needed).
- Added `/api/admin/external-mongo/outbound-ip` — surfaces the server's public IP so admins can allowlist it on Atlas Network Access.
- New UI section in Admin → Data Export with copy-paste IP, inspect/dump buttons and CLI cheatsheet.
- Pod outbound IP (allowlist on Atlas): **104.198.214.223**
- Submitted URI is held in memory for the request only; logs always show a redacted host-only form.

### Changelog 2026-04-28 — AI Foundations 10-Day Online Course
- New product: **AI Foundations** — 10-day live-online cohort for Grades 6-12, ₹1,999, direct Cashfree payment.
- Two parallel tracks: **Explorer** (Grade 6-8) & **Creator** (Grade 9-12) — same 10 days, different depth.
- Backend: `/app/backend/routes/ai_foundations.py` with atomic `AIF-NNNN` booking refs.
  - `POST /api/ai-foundations/register` — create lead
  - `POST /api/ai-foundations/initiate-payment` — open Cashfree order, return hosted payment link
  - `GET /api/ai-foundations/verify/{booking_id}` — payment verification
  - `POST /api/ai-foundations/webhook` — Cashfree webhook
  - `GET /api/admin/ai-foundations/bookings` — admin listing + stats
  - `PATCH /api/admin/ai-foundations/bookings/{id}` — update CRM status / notes

### Changelog 2026-04-29 — SEO Foundation Overhaul (Tier 1 + Pre-rendering)
**Symptom GSC reported:** 571 noindex, 553 crawled-not-indexed, 8 duplicate-no-canonical, 3 soft 404.
**Root cause:** SPA returned identical HTML (with summer-camp meta) for every URL.

Files changed:
- `frontend/public/index.html` — removed summer-camp pollution, added `EducationalOrganization` + `WebSite` JSON-LD, route-neutral defaults, `og:image` → `https://oll.co/og-default.png` (asset to upload).
- `frontend/public/sitemap.xml` — rewritten: 56 URLs, 7 tiers (brand, funnel, hero products, courses, school-offerings, summer-camp SEO subroutes, career), `image:image` for hero pages.
- `frontend/public/robots.txt` — tightened: blocks 22 admin/auth/payment paths, allowlists GPTBot/ClaudeBot/PerplexityBot, throttles SemrushBot/AhrefsBot.
- `frontend/public/_redirects` — NEW: explicit dynamic-route rules + final `/* /404.html 404` so unknown URLs return real HTTP 404 (drops 571 ghost noindex).
- `frontend/src/pages/NotFoundPage.jsx` — adds `<meta name="prerender-status-code" content="404">` so react-snap writes the prerendered file with HTTP 404 hint.
- `frontend/src/index.js` — uses `hydrateRoot` when prerendered DOM exists, `createRoot` otherwise. Required for react-snap.
- `frontend/package.json` — added `react-snap` devDep + `postbuild: react-snap` script + 47-route `reactSnap.include` config (with `puppeteerArgs: ["--no-sandbox"]` for CI compatibility).
- `backend/routes/seo.py` — NEW: dynamic `/sitemap.xml` (auto-includes published blog posts from DB) + `/robots.txt`, mounted at root (not `/api`). Available on the backend for any future host that proxies root paths.

**Production deploy notes:**
- Cloudflare/static host serves `oll.co/sitemap.xml` and `oll.co/robots.txt` directly from `frontend/public/`. Backend `/sitemap.xml` route only kicks in for hosts that proxy root paths to the FastAPI app.
- After deploy, in Google Search Console: re-submit `https://oll.co/sitemap.xml`, click "Validate Fix" on every page-indexing error category.
- Upload a 1200×630 PNG to `oll.co/og-default.png` (the homepage Open Graph fallback).

- Frontend pages (futuristic white & blue theme):
  - `/ai-foundations` — landing (`AiFoundationsLandingPage.jsx`) — hero, two tracks, 10-day curriculum, educator (Vrishank Mistry), outcomes, pricing, FAQ
  - `/ai-foundations/book` — single-page checkout (`AiFoundationsBookingPage.jsx`) — auto-redirects to Cashfree
  - `/ai-foundations/success` — post-payment (`AiFoundationsSuccessPage.jsx`) — polls verify endpoint
  - `/admin/ai-foundations` — admin CRM single-page (`AdminAiFoundations.jsx`) with stats, filters, detail drawer
- Homepage section + Offerings page card now feature this course (between SMI and footer).
- Educator: **Vrishank Mistry** — OLL Expert Educator (LinkedIn link prominent, bio is a short respectful placeholder ready to edit).
- New collection: `ai_foundations_bookings`.


```
/app/
├── backend/
│   ├── server.py              # FastAPI app setup ONLY (4,226 lines, was 14,805)
│   └── routes/                # 21 modular route files (390+ routes total)
│       ├── shared.py          # DB, JWT helpers, auto_assign, email utils
│       ├── notifications.py   # WhatsApp notification helpers
│       ├── users.py / students.py / team.py / educators.py
│       ├── support.py / schools.py / orders.py / misc.py  ← Proxy endpoint /api/proxy/file
│       └── payments.py / gp_onboarding.py / reports.py / jobs.py
│           expenses.py / summer_camp.py / ai_chat.py / school_emails.py
│           checkin_api.py / admin_keys.py / daily_report.py / db_backup.py
│           data_export.py / external_mongo_dump.py  ← NEW (legacy cluster dumps)
└── frontend/
    ├── public/
    │   └── sitemap.xml        # Updated with /school, all /courses/*, key /school-offerings/*
    ├── src/
    │   ├── App.js             # Routes + CourseRedirect (/course/:slug → /courses/:slug)
    │   ├── pages/
    │   │   ├── admin/
    │   │   │   ├── AdminSchoolCRM.jsx  # Distributor details fields in all 3 payment modals
    │   │   │   └── AdminOrders.jsx     # downloadFile routes Cloudinary/emergent.host via proxy
    │   └── utils/
    │       └── invoicePdfGenerator.js  # Uses distributor name/address/GST when from_distributor
```

### Key Integrations
- **Cashfree:** Payment gateway for individual and school student payments
- **AiSensy:** WhatsApp messaging
- **Cloudinary:** File storage
- **Gmail SMTP:** Email notifications (BLOCKED - awaiting credentials)
- **Jitsi Meet:** Video conferencing

### Database Collections (MongoDB)
- `school_inquiries` - School CRM data with onboarding workflows
- `student_inquiries` - Student/parent leads
- `orders` - Centralized payment orders
- `student_payments` - Individual student payments
- `school_student_payments` - School-based student payments
- `school_onboarding` - Detailed onboarding records
- `team_applications` - Team member applications (HR Pipeline)

---

## CHANGELOG

### 2026-04-25 (pt 6) — All-DB Export: mongodump now multi-DB + One-click "Download Everything"
**User feedback:** "I want ALL the data of OLL, ALL of it. Is mongodump working?"

**Yes — mongodump is working ✅** but it was previously only dumping the primary `test_database`. Fixed:
1. **`POST /api/admin/db-backup/create`** now lists every visible database (excluding admin/local/config) and runs `mongodump` for each into one tar.gz. Verified: 12.28 MB archive containing `oll_hub/`, `oll_multiuser/`, `teach_n_learn/`, `test_database/` — every DB the server can see.
2. **NEW `GET /api/admin/data-export/all-databases.zip?fmt=both`** — bundles every collection of every DB into one ZIP archive containing both `<db>/<coll>.jsonl` and `<db>/<coll>.csv` files plus a top-level `MANIFEST.json` with restore instructions.
3. **Frontend "Download Everything (ZIP)"** red button on `/admin/data-export` next to Refresh — one click pulls 25.7 MB containing 103 files / 51 collections / 1,236 docs across all 4 DBs.

**Restore path (single command per collection):**
`mongoimport --uri="mongodb://localhost:27017" --db=<db> --collection=<coll> --file=<db>/<coll>.jsonl`

### 2026-04-25 (pt 5) — Admin Data Export Panel (CSV / JSON Lines)
**Goal:** Let admin extract every collection in every visible MongoDB database (test_database, oll_hub, oll_multiuser, teach_n_learn, etc.) so they can self-host the data on their own MongoDB instance.

**Backend** — new `/app/backend/routes/data_export.py`:
- `GET /api/admin/data-export/databases` — lists every DB the connected user can `listDatabases` on, with collection count, doc count, size.
- `GET /api/admin/data-export/{db}/collections` — lists every collection + estimated doc count.
- `GET /api/admin/data-export/{db}/{coll}/preview?limit=10` — small JSON sample.
- `GET /api/admin/data-export/{db}/{coll}/csv` — streams CSV with flattened dot-path column names; ObjectIds + datetimes stringified; nested arrays inline-JSON encoded; unknown fields appearing later go into an `_extras` JSON column.
- `GET /api/admin/data-export/{db}/{coll}/json` — streams NDJSON (1 JSON object per line — the format `mongoimport` accepts directly).
- All endpoints require admin auth (role=admin/super_admin or @oll.co email).

**Frontend** — new `/admin/data-export` page (sidebar entry "Data Export" with Download icon):
- Database picker (primary DB highlighted), Collections list with Preview / CSV / JSON buttons per row, search filter, dark-themed JSON preview modal.
- Bcrypt note pinned at top: "Passwords are one-way bcrypt hashes — they cannot be decrypted. The hash is exported as-is so existing logins keep working when restored."

**Tested:** 100% (10/10 backend pytest + frontend playwright). `/app/test_reports/iteration_79.json`. Smoke results: 4 visible DBs, 47 collections in primary, summer_camp_bookings → CSV 71 lines (1 header + 70 rows), JSONL 70 lines.

### 2026-04-25 (pt 4) — Educator OTP: parallel WhatsApp + email send
For educators (user_type="educator") that supply an `email`, the backend now attempts WhatsApp AND email in parallel. Possible response channels: `whatsapp+email` (both succeeded), `whatsapp` (only WA), `email` (only email — falls through automatically when WA fails). UI toast updated. Currently WhatsApp returns 402 (WCC out), so educators receive only the email — this is invisible to them.

### 2026-04-25 (pt 3) — Fix: "Failed to send OTP" on educator forms (WhatsApp WCC exhausted) + Email fallback
**Root cause:** AiSensy account is out of WhatsApp Conversation Credits (HTTP 402 ERR402).

**Fix:**
1. `OTPRequest` now accepts an optional `email`. When AiSensy returns 402 (or any non-200), the backend automatically retries via Resend email.
2. `/auth/send-otp` now returns a `channel: "whatsapp" | "email"` in the success payload so the UI can show the right toast.
3. When both fail, the user sees a meaningful 503 error: "WhatsApp OTP service is temporarily unavailable (credits exhausted). Please contact us at info@oll.co".
4. Frontend `EducatorFunnel` + `EducatorApplyPage` (initial send + resend) now pass `formData.email` along with the phone, and show "OTP sent to your email" or "OTP sent to your WhatsApp" based on the response channel.

**User action still needed:** top up AiSensy WhatsApp Conversation Credits to restore WhatsApp delivery (currently every flow falls through to email).

**Verified via curl:** WCC-out + email → returns 200 with channel=email; WCC-out + no email → returns 503 with helpful message; the email fallback log says `[OTP] Sent fallback email OTP to shreyaan@oll.co`.

### 2026-04-25 (pt 2) — AI Voice Interview for Educator Candidates
**New feature:** End-to-end AI-driven voice interview triggered right after the educator application is submitted.

**Tech stack:**
- **STT:** OpenAI Whisper (`whisper-1`) via `emergentintegrations.llm.openai.OpenAISpeechToText` + Emergent LLM Universal Key.
- **LLM:** GPT-4o via `emergentintegrations.llm.chat.LlmChat` for question scoring with structured JSON output.
- **TTS:** Browser SpeechSynthesis (free, no integration needed) — picks `en-IN` female voice.
- **Capture:** Browser MediaRecorder (webm/opus); uploaded to FastAPI as multipart.

**3-stage interview** (out of 100):
- Stage 1 — Personality & Communication (55 marks, pass ≥30)
- Stage 2 — Subject Knowledge & Classroom Mgmt (45 marks, pass ≥20, gated on Stage 1 pass)
- Stage 3 — Commitment & Reliability (informational, gated on Stage 2 pass)

**Backend** — new file `/app/backend/routes/educator_interview.py`:
- `POST /api/educator-interview/start` (resume-aware)
- `POST /api/educator-interview/{id}/respond` (multipart audio → Whisper → GPT-4o score → next question; advances stage / fails / completes)
- `POST /api/educator-interview/{id}/anti-cheat` (3 strikes → status=auto_failed_anti_cheat)
- `GET /api/educator-interview/{id}` + `GET /api/admin/educator-interviews[?application_id=...]` + detail endpoint
- `_finalize_interview` writes `interview_score / interview_status / interview_breakdown / interview_session_id / interview_completed_at` onto the educator application doc.

**Frontend:**
- `/educator/interview/{applicationId}` page with intro consent screen (15–20 min, stay-on-screen), running phase (chat-style UI showing both bot questions and transcribed answers), tap-to-record / stop & submit, anti-cheat counter badge, replay-question button.
- `EducatorApplyPage` success screen now has a prominent **"Start AI Interview →"** CTA (red gradient) right after submission.
- `AdminEducators` — every educator card now shows an `AI <score>/100` badge (color-coded), and the view dialog has an **AI Interview Scorecard** card with bucket breakdown + **View full transcript** modal. Archived tab now includes `auto_failed_anti_cheat / interview_failed / rejected` so HR can review them.

**Bug fixed in retest:** EducatorApplication response model had `extra="ignore"` which stripped the new interview_* fields. Added them as Optional fields → AdminEducators scorecard now renders.

**Anti-cheat hardening:** added window `focus` event handler to reset the per-hide flag — Cmd-Tab edge cases are now counted reliably.

**Tested:** 100% (32/32 backend pytest combined iter77+78 + frontend playwright). `/app/test_reports/iteration_77.json` & `iteration_78.json`. Test files `/app/backend/tests/test_iter77_educator_interview.py`. Live transcription path (Whisper+GPT-4o) requires real audio and was only smoke-tested via the SDK import; validation paths (short audio, mismatched question_id, status guards) are fully covered.

### 2026-04-25 — Educator Requirement Broadcast + Per-Educator Referral Tracking
**New feature:**
1. When admin raises a new Requirement, every existing educator now receives a personalized email with their own unique `?ref=<their_id>` apply link. Anyone who applies through that link gets `referred_by` + `referred_by_name` stamped on their application + `source = "referral"`.
2. Two new admin actions on each requirement card:
   - **Send Test Email** (purple Mail icon) → prompts for email address(es), sends sample. **Sample sent to shreyaan@oll.co successfully.**
   - **Re-send broadcast** (green Send icon) → manually re-broadcasts to ALL existing educators (each with their own unique referral link).
3. Educator card now displays a purple "Referred by <name>" badge when applicable.

**Backend:**
- `EducatorApplication.referred_by` / `referred_by_name` fields.
- `notify_educators_new_requirement` rewritten to accept `override_emails` and to embed unique referral link per educator. Email body now has a clearly-marked "Your referral link" block with copy-friendly text.
- New endpoints: `POST /api/requirements/{id}/test-email`, `POST /api/requirements/{id}/resend-broadcast`.
- Both `/educators/apply` and `/educators/apply-verified` resolve referrer name from referred_by id.

**Frontend:**
- `EducatorApplyPage` reads `?ref=` from URL and passes `referred_by` + `source: 'referral'` to backend.
- `AdminEducators.jsx` Requirements tab: 2 new buttons + handlers (`handleSendTestEmail`, `handleResendBroadcast`).

**Tested:** 100% (11/11 backend pytest + frontend playwright). `/app/test_reports/iteration_76.json`. Sample email to shreyaan@oll.co confirmed via Resend.

### 2026-04-24 (pt 4) — Summer Camp: WhatsApp Broadcast + add-lead/bulk-import fixes
**Root cause of "WhatsApp not sending" on bulk-import / add-lead:**
- Code was firing sends correctly. AiSensy account returns **HTTP 402 `ERR402: Insufficient WhatsApp Conversation Credits (WCC)!`** — out of credits. Code path verified end-to-end in logs. **User must top up AiSensy.**

**Also fixed:**
- `bulk-import` used `count_documents + 1` for `booking_ref` — switched to atomic `_next_booking_ref()`.

**New feature — WhatsApp Broadcast:**
- Backend: `GET /api/summer-camp/broadcast/templates` (returns 7 templates), `POST /api/summer-camp/broadcast` (filters: booking_ids / crm_statuses / assigned_to / center / batch_week, dedup by phone, background task), `GET /api/summer-camp/broadcast/history`. Persists history in `summer_camp_broadcasts` collection + stamps `last_broadcast_*` fields on each booking.
- Frontend: new green "Broadcast" button in Summer Camp CRM action row opens modal with template picker, 4 target modes (filtered / all / status / assignee), live preview count, background send + success state.

**Tested:** 100% (backend 10/10 + frontend playwright). `/app/test_reports/iteration_75.json`. Pytest at `/app/backend/tests/test_iter75_broadcast.py`.

### 2026-04-24 (pt 3) — Summer Camp CRM: Booking Ref Uniqueness Fix
**Bug:** Duplicate `booking_ref` values (e.g., 0517, 0517, 0516, 0516) were showing in the CRM because refs were generated with `count_documents + 1` — which breaks after deletes / cleanups and under concurrent writes.

**Fix:**
1. Added atomic counter helper `_next_booking_ref()` using MongoDB `counters` collection (`find_one_and_update` with `$inc`).
2. Replaced 3 call sites (`capture-lead`, `register`, admin add-lead) with the atomic helper.
3. Backfill endpoint `/api/summer-camp/backfill-refs` now also syncs the counter to `total` so future refs continue from max+1.
4. Ran backfill: reassigned 53 refs, 1 duplicate removed (0065), counter synced to 65, next ref = 0066.

**Verified:** Concurrent capture-lead calls now produce sequential 0066, 0067; repeat of same phone correctly returns existing ref (0066).

### 2026-04-24 (pt 2) — Summer Camp CRM: Assignee visibility + Team Performance Dashboard
**Feedback fixes:**
1. **Mobile assignee always visible** — mobile booking card now renders either the assignee name badge OR a dashed-border "Assign" button in the tags row (regardless of crm_status).
2. **Team Performance on Dashboard** — `GET /api/summer-camp/dashboard` now returns `team_performance` (per-user `{leads, hot_leads, converted, lost, conversion_rate, revenue}`) and `unassigned` totals. Dashboard renders a sortable Team Performance table with an Unassigned row.
3. Outcomes panel on Summer Camp mobile was fixed to stack on <640px (no more one-word-per-line).

**Tested:** 100% (backend pytest 6/6 + frontend flows). `/app/test_reports/iteration_74.json`. Pytest at `/app/backend/tests/test_iter74_team_performance.py`.

### 2026-04-24 — Summer Camp CRM: Lead Assignment + Count Fix
**Features Added / Bugs Fixed:**
1. **Lead counts now accurate** — `/api/summer-camp/capture-lead` now dedupes by phone (returns existing booking_id if phone already captured). Added `POST /api/summer-camp/cleanup-duplicates` admin endpoint which removed 14 stale `phone_captured` rows (was: 79 total with 24 inflated phone_captured; now: 65 total with 10 genuine phone_captured).
2. **Assign Lead feature** — admin can assign any Summer Camp booking to a team user:
   - Backend: `PATCH /api/summer-camp/bookings/{id}/assign` body `{assigned_to: <user_id> | null}` → writes `assigned_to`, `assigned_to_name`, `assigned_at` (or clears them on unassign).
   - Frontend (`AdminStudentCRM.jsx`): new `campAssignModal` state, `handleAssignCampBooking`, Assign button in desktop row actions + mobile card actions, new `Assigned` column in desktop table, new `All Assignees / Unassigned / <team users>` filter dropdown, assignee badge in mobile card tags row.
3. Bumped `/api/summer-camp/bookings` list limit from 500 → 2000.

**Tested:** 100% pass (backend 5/5, frontend flows) — `/app/test_reports/iteration_73.json`. Pytest added at `/app/backend/tests/test_summer_camp_assign.py`.

### 2026-04-21 — Social Media Internship Readiness Program (NEW FEATURE)
**Features Added:**
1. **Landing Page** (`/social-media-intern`) — GenZ dark sci-fi HUD aesthetic (Archetype 7: Electric & Neon) with JetBrains Mono + Nunito Sans, countdown timer, bento curriculum grid, pricing card (₹19,900), FAQ accordion
2. **3-Step Booking Wizard** (`/social-media-intern/apply`): phone capture → student details (name, age, school, parent, email, mode, Instagram/YouTube) → payment selection (Full ₹19,900 or Seat Reserve ₹2,000)
3. **Success Page** (`/social-media-intern/success`) — polls `/verify/{lead_id}`, shows confirmation with booking_ref, payment details, and next-steps checklist
4. **Cashfree Integration** — sequential booking refs (SMI-XXXX), supports both full payment and ₹2,000 seat deposit with balance at center
5. **Admin CRM Tab** — new `section-social_media_intern` inside AdminStudentCRM with KPIs (Total, Phone Captured, Lead, Seat Reserved, Converted, Lost, Revenue), search, filter, status update modal (with lost reason), comment thread, delete, and CSV export
6. **WhatsApp Templates** — added 3 new template keys: `social_media_intern_confirmation`, `social_media_intern_seat_reserved`, `social_media_intern_lead_followup` (user to create in AiSensy dashboard)
7. **Home + Offerings CTA** — new promo section on home page and dedicated card on /offerings with `homepage-smi-apply-btn` and `social-media-intern-cta-btn`

**Backend:** `/app/backend/routes/social_media_intern.py` — 11 endpoints (capture, register, initiate-payment, verify, webhook, crm, followup, comment, crm-status, delete, lead/{id})
**Frontend:** `SocialMediaInternPage.jsx`, `SocialMediaInternApplyPage.jsx`, `SocialMediaInternSuccessPage.jsx`, `admin/SocialMediaInternCRM.jsx`
**DB Collection:** `social_media_intern_registrations` with crm_status transitions: phone_captured → lead → (converted | seat_reserved | lost)
**Tested:** 23/23 pytest passed including Cashfree payment init, webhook, CRM auth, and summer-camp regression. Frontend 3-step wizard verified with Playwright.

### 2026-04-11 — Ticket Numbers Added to Support Center
1. **Sequential ticket numbers** — new `ticket_number` field (e.g., `0001`, `0042`) using atomic MongoDB counter in `counters` collection
2. **Backfilled all 30 existing tickets** — `/api/support/backfill-ticket-numbers` endpoint ran successfully (next ticket = `#0031`)
3. **UI**: Dark pill badge `#XXXX` shown first on every ticket card in `AdminSupportUnified.jsx`. Also shown in Reply modal dialog title.
4. Files: `backend/routes/support.py`, `frontend/src/pages/admin/AdminSupportUnified.jsx`
**Features Added:**
1. **School field now optional** in Add Expense modal — removed `school_id` from required validation in `AdminExpenses.jsx`. Expenses without a school are saved with `school_name: "General"`.
2. **Invoice upload visible in Add mode** — previously only shown in Edit mode (`{editingExpense && ...}`). Now always visible in both Add and Edit modals.
3. **Backend updated** (`expenses.py`) — `create_school_expense` endpoint: school lookup is now optional; skips 404 if no `school_id` provided.

**Modified Files:**
- `frontend/src/pages/admin/AdminExpenses.jsx` — validation fix, label update, invoice section always visible
- `backend/routes/expenses.py` — optional school lookup in POST endpoint

**Tested:** Backend verified via curl (expense created with `school_name: "General"`, no school_id). Frontend screenshot confirmed modal shows "School (optional)" label and invoice upload field.

---

### 2026-04-09 — Summer Camp CRM: New Statuses + Conversion Funnel
**Features Added:**
1. **New statuses** in Summer Camp bookings:
   - `hot_lead` — "Interested, likely to convert" (shown as purple badge)
   - `payment_offline` — "Pay at Center" cash confirmed (counts as Converted in KPIs)
2. **Lost Lead Reason sub-modal**: When marking a lead as Lost, admin selects reason: Phone not picking / Not available during dates / Location too far / Other. Saved to `lost_reason` field in DB.
3. **Conversion Funnel on Dashboard**: Registrations → Hot Leads → Converted (online + cash) with % ratios between each stage
4. **Converted KPI card** now shows both online + cash (payment_offline) count with breakdown sub-label
5. **6 KPI filter cards** (added Hot Lead + renamed Paid→Converted combining both statuses)
6. **Filter dropdown** updated with all new status options
7. **Syntax fix**: Fixed broken IIFE closure in `AdminStudentCRM.jsx` causing parse error

**Backend:** `summer_camp.py` — `StatusUpdate` model + `update_booking_status` + `get_summer_camp_dashboard`
**Frontend:** `AdminStudentCRM.jsx` — status modal, lost reason modal, KPI cards, filter, dashboard


**Features Added:**
1. New backend endpoints in summer_camp.py: edit booking, delete booking, update CRM status (with `lost_lead`), add comment, dashboard analytics
2. Frontend AdminStudentCRM.jsx: new Dashboard sub-tab, Edit/Delete/Status/Comments action buttons per booking row, 4-stage status modal, revenue by age group bar chart, batch breakdown table with Spots Left
3. Fixed BATCH_DATES to accurate May 2026 dates
4. **Invoice Bug Fix:** Added invoice_url/receipt_url preservation for STUDENT payments in orders.py PATCH (was already fixed for school payments only)


**Bug:** School address was blank in generated MOU despite being entered in the onboarding form.

**Root Cause (3 layers):**
1. **Backend** (`POST /schools/onboard`): `school_address` was NOT saved to either the `school_onboarding` doc or `school_inquiries.onboarding_data` — stripped during server.py refactor
2. **Frontend** (`AdminSchoolCRM.jsx` `handleEditOnboarding`): `editOnboardData` was initialized with `address` field but NOT `school_address` — MOU generator reads `data.school_address`
3. **Frontend** (`AdminSchoolCRM.jsx` `handleSaveEditOnboarding`): `school_address` was missing from the `onboardingData` object sent to the backend

**Fixes Applied:**
1. `mouPdfGenerator.js` line 87: Added `data.address` fallback: `data.school_address || data.address || school?.location || school?.address`
2. `AdminSchoolCRM.jsx` edit init (both paths): Added `school_address: existingOnboardData.school_address || school.address || school.location`
3. `AdminSchoolCRM.jsx` save: Added `school_address: editOnboardData.school_address` to `onboardingData`
4. `schools.py` POST `/schools/onboard`: Added `school_address` to both `doc` and `onboarding_data` dicts; also writes to `school.address`
5. `schools.py` PUT `/schools/onboarding/{id}`: Added `onboarding_data.school_address` to sync_fields
6. `schools.py` POST `/schools/onboarding`: Added `school_address` to new doc

**Verified:** `onboarding_data.school_address` and `school.address` now correctly persist from the onboarding form.

### 2026-04-04 — Support Ticket Bugs Fixed + Deployment Hardening (cont.)
**Bugs Fixed:**
1. **Image Upload in Ticket Replies** (`/api/upload`): `misc.py` was missing `from pathlib import Path`, `from io import BytesIO`, and `_get_cloudinary()` function — all causing 500 errors. Added all three.
2. **Assign Ticket 500 Error** (`/api/support/queries/{id}/assign`): `support.py` was missing `import resend` and `SENDER_EMAIL` import. The assign handler tried to check `resend.api_key` to conditionally send email notifications but `resend` module was undefined — causing NameError and 500. Fixed by adding `import resend` and importing `ensure_resend_api_key, SENDER_EMAIL` from `.shared`.

### 2026-04-04 — GST Type Bug Fix + Deployment Hardening
**Context:** User reported GST type selected in onboarding popup was not being saved and not reflecting in the Update Payment modal or Edit Onboarding modal.

**Fixes Applied:**
1. `schools.py` POST `/schools/onboard`: Added `"gst_type": data.get("gst_type", "")` to both `doc` and `onboarding_data` dict
2. `schools.py` PUT `/schools/onboarding/{id}`: Added `"onboarding_data.gst_type"` to sync_fields
3. `schools.py` POST `/schools/onboarding`: Added `gst_type` to the onboarding document
4. `orders.py` GET `school-payments`: Fixed `gst_type` lookup with fallback
5. `orders.py` PATCH `/{payment_id}`: Added `incoming_gst_type` preservation
6. Same gst_type fallback fix applied to student payment fields

**Deployment Fixes:**
- `routes/shared.py`: Added Atlas-safe MongoDB connection timeouts
- `clear_cache` NameError: Already fixed in previous fork

**UI Update:**
- `SummerCampBookingPage.jsx`: Increased center card name and batch item font sizes to 1.2rem

### 2026-04-03 — SEO Improvements
**Key Issues Fixed:**
1. URL Redirect Fix (`App.js`): Added `CourseRedirect` component
2. Meta Tag Injection (`hooks/usePageMeta.js`): Created `usePageMeta` custom hook
3. Schema Improvements: Added JSON-LD to multiple pages
4. Title + Description Optimization: Updated `metaTitle`/`metaDescription`
5. Sitemap Update: Added missing key pages
6. `index.html Cleanup`: Removed conflicting static meta tags

### 2026-04-02 — Invoice Modal Bug Fix (AdminOrders.jsx)
**Root Cause:** Race condition — Save button not disabled during file upload.
**Fixes Applied:**
1. Disabled "Save Payment" button while uploading
2. Added `clear_invoice`/`clear_receipt` flags for intentional removal
3. Backend preserves existing URLs when incoming is empty and no clear flag set

### 2026-04-02 — Production Deployment Fix
- Fixed `.gitignore` blocking `.env` files from Docker build
- Fixed blocking `startup_db_client()` index creation — now async background task
- Added Atlas timeouts to Motor client

### 2026-03-31 — Invoice PDF GST Fix
- Fixed double-count GST for exclusive invoices in `invoicePdfGenerator.js`

---

## ROADMAP

### P0 - Critical (Current)
- [x] Success page timing fix — age-group-specific timing shown dynamically (2026-04-18)
- [x] WhatsApp confirmation now includes batch timing appended to batch_dates param (2026-04-18)
- [x] "Add to Calendar" on Success Page — Google Calendar (opens pre-filled recurring event) + Apple/iCal (.ics download, 5 VEVENT entries, TZID=Asia/Kolkata) (2026-04-18)
- [x] Individual Student Payment Flow - FIXED
- [x] School Student Payment Flow (Initial)
- [x] Email Notification System for School CRM
- [x] Admin Payment Tracker enhancements
- [x] Invoice visibility bug in AdminOrders.jsx - FIXED
- [x] Add Expense: optional school + invoice upload in popup - DONE 2026-04-11
- [x] AI convert_lead: creates onboarding_workflow + payment tranches + GST/state setup - DONE 2026-04-11
- [x] State field in Convert/Renewal/EditOnboarding modals (Indian states dropdown) - DONE 2026-04-11
- [x] Cashfree phone sanitization fix (strip +91/country code before API call) - DONE 2026-04-11
- [x] Laptop Required reminder on Step 4 booking page (no checkbox) - DONE 2026-04-11


### P1 - High Priority
- [ ] Fix Invoice Modal bug in AdminOrders.jsx (4+ ignores — invoice_url/invoice_amount not mapped to showPaymentModal state, shows ₹0 and "Not uploaded" even when saved)
- [ ] E2E testing of Summer Camp booking flow (testing_agent_v4_fork)
- [ ] Connect AI Chat to WhatsApp via AiSensy Webhook
- [ ] Multiple chat sessions browser in AI Chat
- [ ] Report Settings UI
- [ ] User to create 3 WhatsApp templates in AiSensy for Social Media Intern: `social_media_intern_confirmation`, `social_media_intern_seat_reserved`, `social_media_intern_lead_followup`

### P2 - Medium Priority
- [ ] CSV Export for all major tables
- [ ] Backend RBAC enforcement
- [ ] Audit logging for sensitive operations

### P3 - Low Priority/Future
- [ ] Refactor AdminSchoolCRM.jsx (still ~10,707 lines)
- [ ] Refactor AdminStudentCRM.jsx (~3,000 lines)
- [ ] Add markdown rendering to AI responses
- [ ] AI Follow-up Emails background job
- [ ] Lead scoring system

## Implementation Log

### 2026-04-17 — Summer Camp Timings, FAQ & OG Image Update
**Features Added:**
1. **Batch Timings**: Added timing to each age group (4–8: 12–2pm, 9–12: 2:30–4:30pm, 13–16: 5–7pm). Shows in: booking step 0 cards, booking step 2 header, landing page curriculum timing indicator (per-age), and a timings grid in the batch section
2. **Summer Camp FAQ**: New summer_camp config in `RaiseQueryButton.jsx` with 5 camp-specific categories (Registration & Booking, Batch & Timings, Fee & Payment, Camp Activities, Other Query). Triggers on any `/summer-camp` route
3. **OG Image for Link Sharing**: Updated `public/index.html` default OG meta tags to use the Summer Camp 2026 poster. Also updated Helmet in `SummerCampLandingPage.jsx`. Now shows camp poster when sharing on WhatsApp/social media

### 2026-04-17 — Summer Camp Timing/CRM/Dashboard Fixes
1. **Batch Timing on Cards**: Each batch date card in booking Step 3 now shows timing per age group directly (⏰ 12:00 PM – 2:00 PM). Subtitle header also shows timing dynamically.
2. **Mobile CRM KPI Cards**: Changed from 3-column grid to horizontal scroll — numbers and labels no longer truncate. Action buttons in separate row.
3. **Dashboard Center Normalization**: Added `_normalize_center_display()` to map historical center_label variants to canonical names. Now shows 6 clean centers instead of 15+ duplicates.

### 2026-04-17 — Multi-Feature Update
**Features Added / Bugs Fixed:**
1. **Role Dropdowns**: Added "Primary Coordinator" and "Secondary Coordinator" to all 5 contact role selects in AdminSchoolCRM.jsx (edit modal, renewal modal, new lead, conversion, onboarding)
2. **AI Chat Ticket IDs**: `raise_ticket` action in `ai_chat.py` now calls `get_next_ticket_number()` and stores `ticket_number` on every ticket raised via AI chat
3. **AI Chat Textarea Auto-resize**: Input box now grows up to 128px as user types multi-line messages. Resets to single line after sending. Uses `handleInputChange` with `scrollHeight`-based resize
4. **Summer Camp CRM Mobile Responsive**: Added dual-view layout — mobile card grid (`block md:hidden`) replaces the table below `md` breakpoint; desktop table (`hidden md:block`) visible at >= `md`

### 2026-04-16 — Educator Application Deduplication & Update Fix
**Bugs Fixed:**
1. **`/educators/apply` — Stale re-apply response**: When an existing applicant reapplied (same phone/email), the old record was returned silently without updating. Now properly updates the existing record with fresh name, skills, experience, city, teaching_mode, demo_date etc. and returns updated data.
2. **`/educators/apply-verified` — AttributeError crash on re-apply**: Update path referenced `application.subject` and `application.qualification` which don't exist on `EducatorApplication` model, causing 500 errors. Fixed with correct field references.
3. **Missing email helper functions**: `send_educator_application_received_email`, `send_educator_demo_scheduled_email` etc. were called but never defined. Added all 6 helper functions.
4. **`status=''` for new applications**: `sanitize_nullable_fields` model validator was blanking the `status` default. Fixed by explicitly setting status after construction.
5. **`meeting_link=''` in response**: Meeting link was set on `doc` dict but not on the `application` object returned. Fixed by setting `application.meeting_link = meeting_link` before return.

**Verified:** No duplicate records created on re-apply. Admin panel shows correct updated data.


- **Distributor Details Fields**: When "From Distributor" is selected as Payment Mode in all 3 school modals (Convert, New Onboard, Edit Onboard), shows amber-highlighted section with Distributor Name, Address, and GSTIN fields
- **Invoice PDF Generator**: When `payment_mode === 'from_distributor'`, invoice PDF header uses distributor's name/address/GST instead of OLL's details. Terms section also reflects distributor name.
- **downloadFile Proxy**: Updated `downloadFile` in AdminOrders.jsx to route Cloudinary and emergent.host URLs through `/api/proxy/file` endpoint to avoid CORS/auth failures
- **Invoice Modal Verified**: Update Payment modal correctly shows "Invoice uploaded" when invoice_url exists in DB

### Known Issues
1. **File Downloads:** Downloads have incorrect names/types (recurring - 3+ attempts)
2. **Jitsi Moderator:** Limited control with public meet.jit.si server
3. **Gmail SMTP:** Non-functional, blocked on user credentials
4. **Parent Circular docx:** Table formatting broken (recurring 3+)
5. **Data Transfer** (User Verification Pending): Converting a lead - Program Details should auto-fill from proposal_data
6. **MOU School Name** (User Verification Pending): School name should appear in MOU PDF header