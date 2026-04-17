# OLL - Skill Education Platform
## Product Requirements Document

### Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

### Core Requirements
- **Global Structure:** Landing Page, Learner/Educator/School Funnels, Offerings, About OLL, Blog, Admin Panel
- **SEO & Social Sharing:** Unique titles, meta descriptions, H1 tags, canonical URLs, OG tags
- **Admin Panel & RBAC:** Users & Roles management, custom permissions
- **Content Management:** Dynamic blog management
- **Funnels & Login:** OTP-based login for all user types
- **Admin CRM:** Full school management with bulk import, onboarding workflows, inquiry management

### Architecture (Updated: 2026-04-14 — Distributor Invoice Feature, Proxy Download Fix)
```
/app/
├── backend/
│   ├── server.py              # FastAPI app setup ONLY (4,226 lines, was 14,805)
│   └── routes/                # 20 modular route files (387+ routes total)
│       ├── shared.py          # DB, JWT helpers, auto_assign, email utils
│       ├── notifications.py   # WhatsApp notification helpers
│       ├── users.py / students.py / team.py / educators.py
│       ├── support.py / schools.py / orders.py / misc.py  ← Proxy endpoint /api/proxy/file
│       └── payments.py / gp_onboarding.py / reports.py / jobs.py
│           expenses.py / summer_camp.py / ai_chat.py / school_emails.py
│           checkin_api.py / admin_keys.py / daily_report.py / db_backup.py
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
- [ ] E2E testing of Summer Camp booking flow (testing_agent_v4_fork)
- [ ] Connect AI Chat to WhatsApp via AiSensy Webhook
- [ ] Multiple chat sessions browser in AI Chat
- [ ] Report Settings UI

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