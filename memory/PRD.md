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

### P1 - High Priority
- [ ] Fix recurring file download issue (wrong name/type)
- [ ] Generate Proposal & MOU PDFs
- [ ] Gmail SMTP integration (blocked on credentials)

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

## Known Issues
1. **File Downloads:** Downloads have incorrect names/types (recurring - 3+ attempts)
2. **Jitsi Moderator:** Limited control with public meet.jit.si server
3. **Gmail SMTP:** Non-functional, blocked on user credentials
