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

### Architecture
```
/app/
├── backend/
│   └── server.py              # FastAPI backend with all endpoints
└── frontend/
    ├── src/
    │   ├── App.js             # Routes and main app structure
    │   ├── pages/
    │   │   ├── admin/         # Admin panel pages
    │   │   ├── public/        # Public pages (tracking, payment)
    │   │   ├── school/        # School-specific pages
    │   │   └── student/       # Student dashboard
    │   └── components/        # Reusable UI components
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

---

## CHANGELOG

### March 22, 2026

#### Public Reports Link Feature
**Feature Implemented:**

Created a password-protected public shareable link for the Reports page, allowing external stakeholders to view reports without admin access.

**Backend (routes/reports.py):**
1. **Public Link Management Endpoints:**
   - `POST /api/admin/reports/public-link` - Create/update public link with password
   - `GET /api/admin/reports/public-link` - Get current link info
   - `PATCH /api/admin/reports/public-link/password` - Change password
   - `DELETE /api/admin/reports/public-link` - Delete public link
2. **Public Access Endpoints (No Admin Auth):**
   - `POST /api/public/reports/{token}/verify` - Verify password, returns JWT access token (24h expiry)
   - `GET /api/public/reports/{token}/data` - Get report data (with JWT auth)
3. **Security:**
   - Bcrypt password hashing
   - JWT tokens with 24-hour expiration
   - No sensitive data exposed (contact details, names hidden)

**Frontend:**
1. **AdminReports.jsx - Share Report Modal:**
   - "Share Report" button in filter bar
   - Modal shows: link URL, copy button, change password, delete link
   - Create new link with password (min 4 characters)
2. **PublicReports.jsx - Public Reports Page:**
   - Password gate requiring authentication
   - All 8 tabs: Overview, B2C, B2B, HR-Team, Educator HR, Growth Partners, Support, P&L
   - Full date filters (Month/Year/Custom)
   - Real-time data display
   - Privacy: No contact details or names visible

**Testing:** All 15 backend tests pass. Frontend UI verified.

**Public Link URL:** `/reports/{token}` (password protected)

**Modified Files:**
- `backend/routes/reports.py` - Added public link endpoints
- `frontend/src/pages/admin/AdminReports.jsx` - Share Report modal
- `frontend/src/pages/PublicReports.jsx` - New public reports page
- `frontend/src/App.js` - Added route `/reports/:token`

---

#### School CRM Lost Lead Feature
**Feature Implemented:**

Enhanced the School CRM to better track lost opportunities by dividing them into "Lost Leads" (before conversion) and "Lost Customers" (after conversion).

**Changes:**
1. **New Statuses:** Added `lost_lead` and `lost_customer` statuses
2. **Lost Lead Button:** Added "Lost Lead" action button to:
   - New Leads section
   - Meeting Done section
3. **Updated Lost Reason Modal:**
   - Type selector: Lost Lead vs Lost Customer
   - Context-aware reason options (e.g., "Service dissatisfaction" for lost customers)
4. **Divided Lost Tab:**
   - "Lost Leads" subsection with count
   - "Lost Customers" subsection with count
5. **Lost Card Display:**
   - Shows "Lost Lead" or "Lost Customer" badge
   - Displays lost reason on card
   - "Restore to Lead" button for lost leads
   - "Reactivate" button for lost customers

**Modified Files:**
- `frontend/src/pages/admin/AdminSchoolCRM.jsx` - STATUS_SECTIONS, renderSchoolCard, renderActionButtons, Lost tab rendering
- `backend/server.py` - Updated status comment

---

### March 13, 2026

#### School CRM Email Notification System
**Feature Implemented:**

Built a comprehensive email notification system for the School CRM, integrating with the existing Resend email service.

**Backend (server.py):**
1. 5 HTML email templates with OLL branding:
   - **Introduction** — Welcome/intro email for new leads with About OLL, resource links, brochure/YouTube links
   - **Meeting Confirmation** — Meeting details confirmation
   - **Proposal** — Sends proposal with key highlights
   - **MOU / Agreement** — Formal MOU sharing email
   - **Follow-up** — Customizable follow-up email
2. Email helper function `send_school_crm_email()`:
   - Uses Resend API with `reply_to: info@oll.co`
   - Footer: phone +91 9920188188, info@oll.co (no company name)
   - Supports optional PDF base64 attachment
3. New endpoint: `POST /api/schools/{school_id}/send-crm-email`
   - Accepts: email_type, to_email, pdf_base64, pdf_filename, custom_message
   - Logs email activity to school's activity_log

**Frontend (AdminSchoolCRM.jsx):**
1. **"Mail" button** on every lead card → opens Send Email modal
2. **Send Email modal** with:
   - 5 email type selector buttons (Introduction, Meeting Confirm, Proposal, MOU, Follow-up)
   - Editable "To Email" field (pre-filled from school email)
   - Custom message field (for Follow-up type)
   - Reply-to/From info display
3. **"Send introduction email" checkbox** in Add New Lead modal:
   - Auto-sends intro email after lead creation if checked and valid email provided
4. **"Send Proposal Email" button** in Edit Lead / Proposal section
5. **"Send MOU Email" button** in Onboarding modal near Generate MOU button

**Testing:** All 5 email types verified via API (sent to shreyaan@oll.co successfully)

**Modified Files:**
- `backend/server.py` - Added SCHOOL_EMAIL_TEMPLATES, send_school_crm_email(), POST endpoint
- `frontend/src/pages/admin/AdminSchoolCRM.jsx` - Mail button, email modal, intro checkbox, proposal/MOU email buttons

---

### March 12, 2026

#### Generate Proposal PDF - Iteration 2
**Feature Updated:**

Updated the "Generate Proposal" feature in the Edit Lead modal based on user feedback:

1. **New OLL Logo** - Replaced horizontal logo with latest brand version provided by user
2. **OLL Brand Blue Color** - Applied `#1e3a5f` (navy blue) to:
   - Main proposal title
   - All section headers (Robotics & AI Lab Set-up, Program Deliverables, Fees Structure, Requirements from School, Closing message)
   - Bullet point markers
   - Table header backgrounds
3. **Model Dropdown Options** - Changed from "In-School/Hybrid" to "Compulsory/Optional" to match business terminology

**Modified Files:**
- `frontend/src/pages/admin/AdminSchoolCRM.jsx` - Logo constant, generateProposalPDF function, model dropdown options

---

### March 11, 2026

#### MOU PDF Generation Feature
**Feature Implemented:**

Added "Generate MOU" button to the School CRM Conversion (Onboarding) modal. The PDF is fully structured to match the official OLL MOU template.

**Template Sections:**
1. Header - OLL logo (white on navy #1E3A5F) on every page
2. Party details - OLL (Clonefutura Live Solutions) + School name/address
3. Section 1: Program Details - Course Name, Type, Model, Kit, Mode, Training, Timeline
4. Section 2: Count & Payment - Full grade pricing table, requirements, payment collection, payment terms
5. Section 3: Program Execution & Deliverables
6. Section 4: Kit & Book Management
7. Section 5: Educator Confirmation & Training Schedule
8. Section 6: Reports
9. Section 7: Assessment & Audit
10. Section 8: Display
11. Section 9: Certification
12. Section 10: Term of Agreement
13. Section 11: Contact Details (Program Coordinator, Accounts Coordinator, Principal)
14. Authorized Signatories - OLL (Vidushi Daga, Chairman) + School Rep
15. Footer - OLL contact details + page numbers on every page

**Key Features:**
- Auto-downloads PDF on click
- Uploads to Cloudinary and saves in school's Documents section
- Loading state with spinner during generation
- Leaves fields blank when data not available
- Supports multiple school contacts by role (principal, coordinator, accounts)

**Modified Files:**
- `frontend/src/pages/admin/AdminSchoolCRM.jsx` - generateMOUPDF function + imports

**Dependencies Added:**
- `jspdf` (v4.x)
- `jspdf-autotable` (v5.x)

---

#### School CRM - New Fields: Course Type & Lab Kit Count
**Feature Added:**

Added two new fields to the School CRM conversion, renewal, and edit modals:

1. **Course Type** - New dropdown field with options:
   - "Only Robotics"
   - "Robotics, Coding & AI"

2. **No. of Lab Kits** - Conditional input field that appears only when Kit Type is set to "Lab Kit"
   - Number input with min value of 1
   - Shows dynamically based on kit_type selection

**Modals Updated:**
- Quick Conversion Modal (Meeting Done → Convert)
- Onboarding Modal (full conversion process)
- Renewal/Reconversion Modal
- Edit Onboarding Modal (for Active/Renewed schools)

**Modified Files:**
- `frontend/src/pages/admin/AdminSchoolCRM.jsx` - Added new fields to state definitions, UI components, and API submission logic

**State Changes:**
- `convertData`: Added `lab_kit_count`, `course_type`
- `renewalConvertData`: Added `lab_kit_count`, `course_type`
- `onboardData`: Added `lab_kit_count`, `course_type`
- `editOnboardData`: Now includes `lab_kit_count`, `course_type` from existing data

---

#### School CRM → Support Center Ticket Integration Fix
**Bug Fixed:**

Tickets created from the School CRM page (via "Raise Query" button) were appearing in the Support Center but were non-interactive - couldn't be opened, replied to, or deleted.

**Root Cause:**
The `/api/schools/{school_id}/raise-ticket` endpoint was saving tickets to the `support_tickets` collection, but the Support Center UI reads from the `support_queries` collection.

**Fix Applied:**
- Modified the `raise_school_ticket` endpoint in `server.py`
- Changed target collection from `support_tickets` to `support_queries`
- Adjusted field mapping to match the `support_queries` schema:
  - Added `inquiry_type: "school"` to identify school queries
  - Added `comments: []` array for reply support
  - Added `viewers: []` array for viewer feature
  - Preserved school-specific fields (`school_id`, `school_name`, `subject`, `user_type`)

**Modified Files:**
- `backend/server.py` - Lines 6614-6681: Updated raise-ticket endpoint

**Result:**
- ✅ School tickets now appear in Support Center
- ✅ Full interactivity restored (Reply, Notes, History, Edit, Delete, Assign, Viewers)
- ✅ Reply conversation modal works correctly
- ✅ Ticket source correctly shows "school_crm"

---

### March 10, 2026

#### Cashfree Payment Sync System
**Features Implemented:**

1. **Payment Sync Panel on Orders Page**
   - Added "Cashfree Payment Sync" panel with sync buttons
   - "Status Report" button - Opens modal showing all payment statuses with breakdown
   - "Sync Student Payments" button - Syncs all pending student payments with Cashfree
   - "Sync School Payments" button - Syncs all pending school student payments
   - "Sync All Payments" button - Syncs both student and school payments in one action

2. **Individual Payment Sync Button**
   - Added sync (🔄) icon to each pending payment row in Student Payments tab
   - Only appears for non-PAID payments
   - Clicking syncs that specific payment with Cashfree API
   - Shows spinner animation while syncing

3. **Payment Status Report Modal**
   - Shows total counts by status (PENDING, ACTIVE, PAID, etc.)
   - Lists all pending payments with individual sync buttons
   - Separates Student Payments and School Student Payments
   - Allows one-click sync from the report modal

4. **Automated Background Sync Scheduler (APScheduler)**
   - Runs automatically every 60 minutes (configurable via `PAYMENT_SYNC_INTERVAL_MINUTES`)
   - Can be enabled/disabled via `PAYMENT_SYNC_ENABLED` environment variable
   - Shows live status in UI with green pulsing dot and next run time
   - Logs all sync activity for debugging
   - Gracefully shuts down when server stops

5. **Backend Sync Endpoints**
   - `POST /api/payments/sync-single/{order_id}` - Sync single payment with Cashfree
   - `POST /api/payments/sync-all?payment_type=` - Bulk sync all pending payments
   - `GET /api/payments/status-report` - Get payment status breakdown report
   - `GET /api/payments/scheduler-status` - Get scheduler status (running, interval, next_run)
   - `POST /api/payments/trigger-sync` - Manually trigger a sync
   - All endpoints handle both `student_payments` and `school_student_payments` collections
   - Updates student status to "converted" when payment is confirmed as PAID

**Environment Variables:**
- `PAYMENT_SYNC_ENABLED` - Enable/disable auto-sync (default: true)
- `PAYMENT_SYNC_INTERVAL_MINUTES` - Sync interval in minutes (default: 60)

**Modified Files:**
- `backend/server.py` - Added scheduler, sync endpoints, and background task
- `backend/requirements.txt` - Added APScheduler dependency
- `frontend/src/pages/admin/AdminOrders.jsx` - Added sync panel, buttons, status display, and modal

---

#### School Conversion/Renewal Modal Updates
**Features Implemented:**

1. **Removed Model/Type Field**
   - Removed from both Conversion Modal and Renewal Modal
   - Offering selection now takes full width

2. **Added School Share & GP Share to Conversion Modal**
   - Previously only available in Renewal Modal
   - Type options: None, Percentage (%), Fixed Amount (₹)
   - Calculation options: Lumpsum, Per Student
   - Auto-calculated share amount display

3. **Fixed Payment Tranche Auto-calculation**
   - Now includes fixed_price when pricing_type is "fixed" or "both"
   - Previously only calculated from per-student pricing

**Modified Files:**
- `frontend/src/pages/admin/AdminSchoolCRM.jsx` - Modal updates and calculation fixes

---

### February 24, 2026

#### Orders Page - Student Payments Tab Enhancements
**Features Implemented:**

1. **Receivables Summary Card**
   - Shows total pending amount (payments with status !== 'paid')
   - Displays ₹55,013 in pending receivables
   - Purple gradient styling with Wallet icon

2. **Payment From Column**
   - Shows "Individual" or "School" with appropriate icons
   - User icon (blue) for individual payments
   - Building2 icon (orange) for school-routed payments
   - Backend returns `payment_from` field in student payments response

3. **Payment Mode Column**
   - Shows "Online", "Cash", or "N/A" with icons
   - CreditCard icon (green) for online payments
   - BanknoteIcon icon (amber) for cash payments
   - Wallet icon (slate) for unspecified
   - Transaction ID displayed below payment mode when available

4. **View Payment Modal**
   - Opens via eye icon in Actions column
   - Displays: Student name, Parent/Guardian, Phone, Email, Batch
   - Shows: Amount, Status, Payment From, Payment Mode
   - Shows: Transaction ID, Due Date, Payment Date
   - GST information section (when applicable)
   - Notes section and document download buttons

5. **Delete Payment Functionality**
   - Delete button (trash icon) in Actions column
   - Confirmation modal with payment details
   - Warning message about permanent deletion
   - Backend `DELETE /api/orders/student-payments/{payment_id}` endpoint
   - Handles both `student_payments` collection and embedded `student_inquiries` payments

**Modified Files:**
- `backend/server.py` - Added DELETE endpoint (lines 10658-10747), updated GET endpoint with payment_from/payment_mode fields
- `frontend/src/pages/admin/AdminOrders.jsx` - Added View modal (lines 1647-1813), Delete modal (lines 1815-1862), updated table columns

**Testing:**
- Test Report: `/app/test_reports/iteration_41.json`
- Backend: 100% (10/10 tests passed)
- Frontend: 100% (All Student Payments tab features working)

---

### February 16, 2026

#### Support Center - Query System Enhancements (Session 2)
**Features Implemented:**

1. **Chat-Style Replies System**
   - New `/api/support/queries/{query_id}/replies` endpoint for adding replies
   - Reply modal redesigned as a conversation view
   - Shows all replies in chat bubbles with sender info and timestamps
   - Original message always visible at the top
   - Replies preview on query cards showing count and latest message

2. **Delete Notes Feature**
   - New `DELETE /api/support/queries/{query_id}/notes/{note_id}` endpoint
   - Delete button (trash icon) appears on hover in Notes modal
   - Confirmation dialog before deletion

3. **Enhanced Edit Modal**
   - Added User Type selector (visual buttons like Create modal)
   - Added "Related To" sub-category field
   - Added Status dropdown (New, In Progress, Resolved, Closed)
   - All fields from Create modal now available in Edit

4. **Original Message Always Visible**
   - Query cards now show "Original Message:" label
   - Message/details visible across all stages even after replies

**Modified Files:**
- `backend/server.py` - Lines 7968-8067: Added delete note and add reply endpoints
- `frontend/src/pages/admin/AdminSupportUnified.jsx` - Chat-style reply modal, delete notes, enhanced edit modal

---

#### School CRM Access Control + Renewal Bug Fix (Session 1)
**Issues Fixed:**

1. **User-based Lead Filtering (Security)**
   - Team members now only see leads assigned to them (`assigned_to`, `added_by`, or `relationship_manager_id`)
   - Admin users continue to see all leads
   - Modified `/api/schools/inquiries` endpoint to filter based on user role

2. **School Renewal "Failed" Error**
   - Root cause: `conversion_amount` type mismatch - backend model expected `str` but received `int/float`
   - Fixed: Updated `SchoolInquiry` and `SchoolInquiryUpdate` models to accept `Union[str, int, float]`
   - Added better error logging in frontend to show actual error message

3. **Modal Closes on Outside Click (UX)**
   - Added `preventClose` prop to Dialog component
   - Applied to Convert and Renewal modals to prevent accidental closure

**Modified Files:**
- `backend/server.py` - Lines 5471-5510: User-based filtering for school inquiries
- `backend/server.py` - Lines 1397, 1465: Changed `conversion_amount` type to `Union[str, int, float]`
- `frontend/src/components/ui/dialog.jsx` - Added `preventClose` prop with `onInteractOutside` and `onEscapeKeyDown` handlers
- `frontend/src/pages/admin/AdminSchoolCRM.jsx` - Added `preventClose` to Convert and Renewal modals, improved error logging

**Testing:**
- Backend verified: Admin sees 80 leads, team member sees 71 leads
- Renewal endpoint tested: Now accepts numeric `conversion_amount`

---

### February 15, 2026

#### Orders Page - School Student Payments Enhancement (Session 2)
**Feature Request:**
- Display school student online payments in the Orders page
- Show school-wise rows with progress and payment counts
- Add total amount collected / total amount required
- Add export option for each school

**Implementation:**
1. **New Backend Endpoint** `/api/orders/school-student-payments`:
   - Aggregates all school student payments by school
   - Returns overall stats (total schools, total collected, students paid, collection rate)
   - Returns per-school summary with grade breakdown, recent payments

2. **New Backend Endpoint** `/api/orders/school-student-payments/{school_id}/export`:
   - Exports all payments for a school as JSON for Excel generation

3. **Frontend Updates** (`AdminOrders.jsx`):
   - Added overall stats banner (Total Schools, Total Collected, Students Paid, Collection Rate)
   - School-wise cards with progress bar and amount stats
   - Grade breakdown showing paid/pending counts
   - Export Excel button for each school
   - Links: View Tracker, Copy Payment Link, Copy Tracker Link

**Modified Files:**
- `backend/server.py` - Added 2 new endpoints after line 3985
- `frontend/src/pages/admin/AdminOrders.jsx` - Updated school-students tab

---

#### Individual Student Payment - P0 Bug Fix (Session 1)
**Issue:**
- Individual student payment verification was failing with 404 error from Cashfree
- Student status was not updating to "converted" after successful payment
- No success screen displayed after payment completion

**Root Cause:**
- `order_id` was NOT being passed to `CreateOrderRequest` when creating Cashfree orders
- Cashfree assigned its own internal `cf_order_id`
- When verifying, we were trying to use our `order_id` which Cashfree didn't recognize

**Fix Applied:**
- Added `order_id=order_id` to `CreateOrderRequest` in the `/api/payments/create-session/{student_id}` endpoint
- Now Cashfree tracks orders by our ID, making verification work correctly
- Verification endpoint returns "ACTIVE" for unpaid orders, "PAID" for completed

**Testing:**
- Test Report: `/app/test_reports/iteration_39.json`
- Backend: 100% (10/10 tests passed)
- Frontend: 100% (Login, payment card, Pay Now button all working)

**Modified Files:**
- `backend/server.py` - Lines 3163-3170: Added order_id to CreateOrderRequest
- `backend/server.py` - Lines 3369-3577: Enhanced logging in verify endpoint

**Note:** "Broken Link" error in Cashfree modal is expected - preview domain not whitelisted in Cashfree merchant dashboard. Code is working correctly.

---

### February 14, 2026

#### School Student Payment Page - UI Improvements (Session 3)
**Changes:**
1. ✅ **Grade dropdown** - Removed amount from dropdown, now shows just "Grade 1", "Grade 2" etc.
2. ✅ **Amount display** - Fee amount shown in a highlighted box after grade selection
3. ✅ **Need Help button** - Moved FAQs into a modal, accessed via "Need Help?" button in header
4. ✅ **Footer contact info** - Added info@oll.co and +91 9920188188 to footer
5. ✅ **Program name** - Header now shows program name (e.g., "Robotics Fee Payment" instead of generic text)
6. ✅ **Single column layout** - Cleaner layout without sidebar FAQs

**XLSX Export:**
- Added "Export Excel" button to School Payment Tracker (`/admin/school-payments/{schoolId}`)
- Added "Export Excel" button to onboarding modal in Admin School CRM (for schools with online payment)

**Modified Files:**
- `frontend/src/pages/SchoolStudentPayment.jsx` - Complete redesign with new layout and features
- `frontend/src/pages/admin/SchoolPaymentTracker.jsx` - Added XLSX export function
- `frontend/src/pages/admin/AdminSchoolCRM.jsx` - Added XLSX export to onboarding modal

**Dependencies:**
- Added `xlsx` package for Excel file generation

#### School Student Payments - P0 Bug Fixes (Session 2)
**Fixed Issues:**
1. ✅ **NaN Fee Amount Bug** - Fee amount showed "NaN" after selecting a grade. Fixed by transforming `price_per_student` to `price` in backend API response (server.py lines 3512-3524)
2. ✅ **Pay Fees Button** - Now correctly triggers Cashfree payment popup. The "Broken Link" error is expected in preview environment (domain not whitelisted in Cashfree)

**Modified Files:**
- `backend/server.py` - GET `/api/school-payment/{school_id}` now transforms grade_pricing to use 'price' field
- `backend/server.py` - POST `/api/school-payment/create-session` now handles both 'price' and 'price_per_student' field names

**Testing:**
- Test Report: `/app/test_reports/iteration_38.json`
- Backend: 100% (6/6 tests passed)
- Frontend: 100% (all features working)

#### School Student Payments - Bug Fixes (Session 1)
**Fixed Issues:**
1. ✅ Payment links now appear on public tracking page for schools with online payment mode
2. ✅ Edit modal retains "Online" payment mode correctly  
3. ✅ Edit modal hides tranches and shows deadline date for online mode
4. ✅ Convert/Renew modal hides tranches and shows deadline date for online mode
5. ✅ Backend returns `school_id` in tracking API response
6. ✅ Fixed API endpoint in SchoolStudentPayment.jsx (was missing /api prefix)

**New Files:**
- `/app/frontend/src/pages/public/SchoolPaymentTrackerPublic.jsx` - Public tracker page

**Modified Files:**
- `backend/server.py` - Added school_id and deadline_date to tracking response
- `AdminSchoolCRM.jsx` - Updated Edit, Convert, Renew modals for online payment handling
- `SchoolTrackingPage.jsx` - Added payment link buttons
- `SchoolStudentPayment.jsx` - Fixed API endpoint
- `App.js` - Added route for public tracker

---

## ROADMAP

### P0 - Critical (Current)
- [x] Individual Student Payment Flow - FIXED Feb 15, 2026
- [x] School Student Payment Flow (Initial)
- [x] Fix School Student Payment bugs (links, edit modal, convert/renew modal)
- [x] Fix NaN fee amount on School Student Payment page
- [x] Fix Pay Fees button to trigger Cashfree popup
- [x] Email Notification System for School CRM - DONE March 13, 2026
- [x] School Student Portal (Login + Dashboard) - DONE Feb 2026 - 100% tests passing
- [x] Admin Payment Tracker: Fix missing payments (limit 1000→10000), add edit/refund actions - DONE March 2026

### P1 - High Priority
- [ ] Fix recurring file download issue (wrong name/type)
- [ ] Generate Proposal & MOU PDFs
- [ ] Gmail SMTP integration (blocked on credentials)
- [ ] Fix Parent Circular docx table formatting (recurring 3+)
- [ ] Phase 2 email: Meeting Reminder automation via APScheduler

### P2 - Medium Priority
- [ ] CSV Export for all major tables
- [ ] Finalize "Viewer" feature for support queries
- [ ] Cron job setup instructions for production

### P3 - Low Priority/Future
- [ ] Refactor server.py into modules
- [ ] Refactor AdminSchoolCRM.jsx into components
- [ ] AI Follow-up Emails background job
- [ ] Table of Contents for rich text editor
- [ ] PO generation with vendor panel
- [ ] RBAC enforcement on backend
- [ ] Lead scoring system
- [ ] SMS/Email session reminders

---

### March 21, 2026
- **Dynamic Onboarding Steps (DONE):** School onboarding workflow now generates tailored step sets based on purchase:
  - Individual kit → includes `distribution_checking`, excludes `lab_setup/refilling`
  - Lab setup → includes `lab_setup` (new) / `lab_refilling` (renewal), excludes distribution
  - Student training → includes `teacher_allocation`, `teacher_approval`, `timetable_finalization`
  - Teacher training → includes `teacher_training` only
  - `both` → includes all student + teacher training steps
  - Fixed: `init_school_onboarding` now uses `generate_dynamic_onboarding_steps` instead of hardcoded `DEFAULT_ONBOARDING_STEPS`
  - Fixed: `get_public_tracking` iterates over actual workflow steps (no ghost steps from hardcoded list)
  - Fixed: `update_onboarding_step` uses actual workflow keys for `current_step` calculation
  - Fixed: `AdminSchoolCRM.jsx` 3 hardcoded `/9` replaced with dynamic step count
  - Fixed: `SchoolTrackingPage.jsx` added icons for `lab_setup` (Building2), `lab_refilling` (Package), `teacher_allocation` (User), `teacher_approval` (ThumbsUp)
  - Tested: 20/20 tests passed (iteration 44)

## Known Issues
1. **File Downloads:** Downloads have incorrect names/types (recurring - 3+ attempts)
2. **Jitsi Moderator:** Limited control with public meet.jit.si server
3. **Gmail SMTP:** Non-functional, blocked on user credentials
4. **Parent Circular docx:** Table formatting broken (recurring 3+)
5. **Data Transfer** (User Verification Pending): Converting a lead - Program Details should auto-fill from proposal_data
6. **MOU School Name** (User Verification Pending): School name should appear in MOU PDF header

### March 21, 2026 (Session 2)
- **P0 Fix: Backend Shutdown Crash (DONE):** Fixed `NameError: name 'client' is not defined` on server restart. Import `_client as mongo_client` from `database.py`.
- **P0 Fix: Resend Email Diagnostics (DONE):** Added test email endpoint and "Send Test Email" button in Admin Settings > API Keys. Production issue is a test API key.
- **School Receipt Filtering & PDF Download (DONE):**
  - Student /my-bookings: School Receipts tab now only shows PAID/REFUNDED payments (filters out ACTIVE, EXPIRED, PENDING)
  - Student /my-bookings: Added "Download Receipt" button for each receipt card
  - Admin SchoolPaymentTracker: Added download receipt (FileText icon) action for PAID/REFUNDED payments
  - Created `/utils/receiptPdfGenerator.js` - generates styled receipt PDF with OLL branding using jsPDF
  - Tested: 5/5 features passed (iteration 46)

### March 21, 2026 (Session 2 - continued)
- **Raise PO Request from Onboarding (DONE):**
  - Backend: `POST /api/schools/{school_id}/raise-po` builds products from onboarding data (course_type, kit_type, book_type, grade_pricing) and submits to vendor panel API (`vendorplus-4.emergent.host/api/public/po-request`)
  - Product logic: Only Robotics → Robotics Kit all grades; Robotics+Coding+AI → Robotics Kit (Grade 1-6), IOT Kit (Grade 7-10); Lab Setup → Lab Kit × count; Individual Books → 1 per student per grade
  - Frontend: "Raise PO Request" button in onboarding workflow > payment_collection step (activated when payment step complete or partial payment received)
  - Delivery date dialog prompts for date before raising PO
  - PO response stored on school record (`po_requests` array) and kit_delivery step auto-updated
  - Tested: Backend API verified with curl, multiple scenarios (individual kit, lab setup, robotics_coding_ai grade split)

### March 2026 (Fork Session 3 - P0 MOU Fix + P0 Refactor)
- **P0 BUG FIX: MOU PDF document not saving (DONE, TESTED):**
  - Root cause: FormData uploads had `Content-Type: multipart/form-data` manually set, breaking the multipart boundary — server returned 400.
  - Fix: Removed all manual `Content-Type: multipart/form-data` headers from FormData axios calls in `AdminSchoolCRM.jsx` using `sed`.
  - Atomic append: Created `POST /api/schools/{school_id}/add-document` endpoint using MongoDB `$push` to prevent race conditions when saving documents.
  - Proposal and Parent Circular document saves also updated to use atomic `/add-document` instead of PATCH.
  - Tested: 9/9 backend tests pass (iteration_47). Frontend: 100% pass.

- **P0 REFACTOR: AdminSchoolCRM.jsx extraction (DONE, TESTED):**
  - Extracted 3 large PDF generator functions (~1,370 lines total) from AdminSchoolCRM.jsx into dedicated utility files:
    - `/utils/proposalPdfGenerator.js` — exports `generateProposalDocument(school, data, ctx)`
    - `/utils/mouPdfGenerator.js` — exports `generateMOUDocument(school, data, ctx)`  
    - `/utils/parentCircularGenerator.js` — exports `generateParentCircularDocument(school, data, ctx)`
    - `/utils/ollAssets.js` — exports `OLL_LOGO_B64` and `OLL_LOGO_HORIZONTAL` base64 logos
  - AdminSchoolCRM.jsx reduced from 12,077 → 10,707 lines (-1,370 lines).
  - All 3 functions replaced with thin wrappers that manage loading state and pass context to utilities.
  - Also fixed bug: `generateProposalPDF` was reading `onboardData?.grade_pricing` instead of `data?.grade_pricing` (now fixed in utility).
  - Tested: 100% pass — 9/9 backend + frontend compilation verified (iteration_47).

## Session: March 22, 2026 — server.py P0 Refactoring Batch 2 (DONE, TESTED)
- Extracted 2 more route groups from server.py:
  - `routes/payments.py` — 21 routes: `/payments/*` + `/school-payment/*` + `scheduled_payment_sync` background task + `scheduler` (AsyncIOScheduler)
  - `routes/gp_onboarding.py` — 19 routes: `/gp-onboarding/*` + `/gp-onboard/*` (includes GPOnboarding + TeamUser models)
- Moved `scheduler` instance and `PAYMENT_SYNC_*` config to `routes/payments.py`; server.py startup handler imports them
- Fixed duplicate `verify_gp_payment` route in gp_onboarding.py (dead code removed)
- server.py: 15,704 → 13,217 lines (−2,487 lines, total −4,690 lines from original 17,907)
- Tested: 20/20 pytest pass + scheduler-status 200 verified (iteration_49)

## Session: March 22, 2026 — Daily Report Emailer (DONE)
- Created `/app/backend/routes/daily_report.py` — generates and emails 5 separate daily category reports
- Recipients: shreyaan@oll.co, lavisha@oll.co, clonefutura@gmail.com
- Scheduled at 8:00 PM IST (14:30 UTC) daily using APScheduler CronTrigger
- Manual trigger available at POST /api/admin/daily-report/send-now
- Reports: Support (queries/categories/resolution), B2C (leads/demos/conversions/revenue), Growth Partners, Team Members, Educators (all with rich HTML metrics)

## Session: March 22, 2026 — PO Tracking URL Fix (DONE)
- Fixed PO tracking links redirecting to wrong preview domain (`vendor-mgmt-v2.preview.emergentagent.com`) instead of `vendorplus-4.emergent.host`
- Updated `transform_tracking_url` in `routes/expenses.py` to use regex wildcard for any `*.preview.emergentagent.com` domain
- Applied transform at write-time (PO raise) and read-time (inquiries + onboarding endpoints) to fix both new and existing records
- Also fixed bonus `add-document` 500 error: MongoDB `$push` on null `documents` field now handled via aggregation pipeline update
- Also fixed proper import: `transform_tracking_url`, `fetch_po_data`, `VENDOR_PUBLIC_API`, `fetch_vendor_products`, `match_vendor_product` now properly imported into server.py

## Session: March 22, 2026 — P0 MOU PDF Save Bug Fix (DONE)
- Fixed critical React event handler bug in `AdminSchoolCRM.jsx`:
  - `onClick={generateMOUPDF}` was passing the SyntheticEvent as `overrideSchool`, making `school.id` undefined → `/api/schools/undefined/add-document` 404
  - Fixed by wrapping in arrow functions: `onClick={() => generateMOUPDF()}` and `onClick={() => generateParentCircularPDF()}`
  - Same bug existed in both MOU and Parent Circular buttons (lines 8359 and 8300)
- Root cause: Classic React onClick direct function reference pitfall with optional-arg functions

## Prioritized Backlog

### March 22, 2026 (Session 3)
- **School Map Picker** — COMPLETE
  - Created `/app/frontend/src/components/SchoolMapPicker.jsx` using Leaflet.js + OpenStreetMap (no API key)
  - Free geocoding via Nominatim (search → lat/lng) + reverse geocoding (click map → address)
  - GPS button (browser geolocation), draggable marker, interactive geofence circle
  - Geofence radius slider (100m–5km)
  - Added to 3 modals in AdminSchoolCRM.jsx: Edit School, Convert (Onboard), Renewal Convert
  - Saves `latitude`, `longitude`, `address`, `geofence_radius` to `school_inquiries` root level
  - External API (`GET /external/schools`) now returns `latitude`, `longitude`, `geofence_radius` in `location` object for Check-in app integration
- **Orders: Send Invoice Email with saved invoices** — COMPLETE
  - New `POST /api/orders/send-invoice-email` endpoint in `school_emails.py`
  - Generates invoice PDF (fpdf2), saves to new `invoices` MongoDB collection (with base64 PDF for resending)
  - Determines email type automatically: `invoice` (pending), `overdue` (past due), `confirmation` (paid)
  - Recipients: Accounts + Principal contacts from `school_contacts`; falls back to primary contact
  - On resend: uses the same saved PDF (same invoice number, consistent accounting)
  - `GET /api/orders/{payment_id}/invoice-status` endpoint to check saved invoice status
  - Frontend: "Send Email" button added to all order rows (single + multi-tranche); shows "Resend" after first send
  - Confirmation dialog shows: school, tranche, amount, due date, email type badge, recipient note
  - Activity logged to `school_inquiries.activity_log`
- **Follow-up Email Template System for Meeting Done Schools** — COMPLETE (iter_50: 15/15 backend, 11/11 frontend tests PASS)
  - Added `meetingDoneEmailState` state + `buildMeetingDoneTemplate` + `handleSendMeetingDoneEmail` to `AdminSchoolCRM.jsx`
  - New purple "Send Follow-up Email" section in Follow-up Modal (visible only for `meeting_done` status schools)
  - 3 templates: "Next Steps for Your School" (5-step onboarding roadmap), "Confirmation Reminder" (purple header, urgency cue), "Custom Message" (free-text)
  - Template subject auto-fills with school name; preview shows rendered HTML; editable subject before send
  - Wired to existing `POST /api/schools/{id}/send-meeting-followup` endpoint (school_emails.py)
  - Bulk email (`POST /api/schools/contacts/bulk-email`) confirmed working

### P0 (Critical)
- Continue refactoring `server.py` (13,217 lines → extract schools_onboarding ~2500 lines, auth_routes ~700 lines, support ~600 lines)
- Target: Get server.py under 8,000 lines

### P1 (High Priority)
- CSV Export button for all major admin data tables
- Phase 2 & 3 email notification templates

### P2 (Medium Priority)
- Background job for AI follow-up emails
- Backend RBAC enforcement
- Audit logging for sensitive operations
- AdminSchoolCRM.jsx further reduction (still 10,707 lines)
- Extracted 4 route groups from server.py into modular files under `backend/routes/`:
  - `routes/reports.py` — 10 `/admin/reports/*` endpoints (886 lines, includes get_date_range/parse_date_field helpers)
  - `routes/jobs.py` — 5 `/jobs/*` endpoints (868 lines, includes WhatsApp helpers + notification helpers + PO fetch)
  - `routes/expenses.py` — 9 `/school-expenses/*` endpoints (392 lines, includes EXPENSE_CATEGORIES constant)
  - `routes/admin_keys.py` — 10 `/admin/api-keys/*` + `/admin/service-api-keys/*` + `/external/*` endpoints (447 lines)
- Fixed latent bugs: missing `os`, `asyncio`, `secrets` imports; `verify_external_api_key` dependency added to admin_keys.py; `get_date_range` helpers added to reports.py; notification helpers + `send_whatsapp_notification` added to jobs.py
- Fixed pre-existing bug: b2b-insights NoneType error on `onboarding_data.get()`
- server.py: 17,907 → 15,704 lines (−2,203 lines, −12.3%)
- All routes registered (315 total). Tested: 37/37 backend tests pass (iteration_48). All 4 module groups verified HTTP 200.

