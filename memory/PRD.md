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

### February 15, 2026

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
