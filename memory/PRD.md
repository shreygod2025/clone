# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Core Features Implemented

### 1. User Funnels
- **Student/Learner Funnel**: Demo booking, skill selection, center-based learning
- **Educator Funnel**: Application, demo scheduling, onboarding
- **School Funnel**: B2B sales CRM, onboarding workflow, payment tracking
- **Growth Partner Funnel**: Multi-step onboarding with training modules

### 2. Admin Panel & CRM
- User & Role Management (RBAC)
- School CRM with full sales pipeline
- Educator Management
- Support Ticket System
- Orders & Payments Module
- Reports & Analytics
- **School Expenses Module**
- **Cashfree Payment Gateway Integration** (NEW - Feb 14, 2026)

### 3. WhatsApp Notifications (AiSensy Integration)
**Templates Configured:**
- `otp` - OTP delivery (5 min expiration)
- `support_ticket_added` - New ticket notification to assignee
- `support_overdue_48hours` - 48h overdue warning to assignee
- `support_overdue_48hours_admin` - 48h overdue warning to admin
- `student_newlead_admin` - New student lead to B2C sales
- `gp_newlead_admin` - New GP lead to GP manager
- `school_meeting_reminder_24hours` - 24h meeting reminder
- `school_meeting_reminder_2hours` - 2h meeting reminder

### 4. File Storage
- Cloudinary integration for persistent file storage
- Migration tools for existing files
- Backward compatibility with old URLs

### 5. School Onboarding Workflow
10-step onboarding process with public tracking page:
1. MOU Signing
2. Payment Collection
3. Kit Delivery (with ProcureWay PO integration)
4. Distribution Checking
5. Technical Check
6. Teacher Training
7. Calendar Making
8. Timetable Finalization
9. LMS Setup
10. School Confirmation

### 6. ProcureWay PO Integration (NEW - Feb 13, 2025)
- **API Integration**: Connected to ProcureWay external API for PO data
- **Onboarding Sync**: Fetch delivery date, dispatch date, and tracking link from POs
- **Expense Auto-Sync**: Automatically create kit_cost and logistics_cost expenses from PO data
- **Smart Filtering**: Excludes delivered POs, shows only active orders
- **Public Tracking**: PO info (delivery date, dispatch date, tracking link) displayed on public school tracking page

**API Endpoints:**
- `GET /api/schools/{school_id}/po-data` - Fetch all PO data for a school
- `GET /api/schools/{school_id}/onboarding-po-info` - Get active PO info for onboarding
- `POST /api/schools/{school_id}/sync-po-expenses` - Auto-create expenses from PO data

**ProcureWay API Key:** `oll_ext_fgARmlTncPH3PvRFtcbzEMsRa0E033_gCsvDAPVhIDc`
**VendorPlus URL:** `https://vendorplus-4.emergent.host/`

### 7. School Expenses Module (NEW - Feb 13, 2025)
- Full CRUD for school-wise expense tracking
- Categories: Kit Cost, Teacher Cost, Logistics Cost, Books Cost, GP Share, School Share, etc.
- School dropdown filter
- Date range filtering
- Summary with totals by category
- Auto-sync from ProcureWay POs

**API Endpoints:**
- `GET /api/school-expenses` - List all expenses with filters
- `POST /api/school-expenses` - Create new expense
- `PATCH /api/school-expenses/{id}` - Update expense
- `DELETE /api/school-expenses/{id}` - Delete expense
- `GET /api/school-expenses/summary` - Get expense summary

## Recent Updates (Feb 2025)

### Feb 14, 2026
- **NEW FEATURE - School Student Payment System (Cashfree)**: Complete online fee collection system for schools where students pay directly
  - **School Setup (Admin)**:
    - In School Convert/Re-onboard popup, select "Online (Student Payment via Cashfree)" as payment mode
    - Configure grade-wise pricing in the onboarding form
    - Payment link auto-generated: `/school-pay/{school_id}`
  - **Student Payment Page** (`/school-pay/{school_id}`):
    - Shows school name and program
    - Student selects grade → displays fee amount
    - Enters: Name, Phone, Division
    - Clicks "Pay" → Cashfree payment popup (UPI, Cards, Net Banking)
    - Success screen with transaction ID after payment
  - **Payment Tracker Page** (`/admin/school-payments/{school_id}`):
    - Lists all student payments: Date, Name, Phone, Grade, Division, Amount, Status, Transaction ID
    - Grade-wise filter and search
    - Export to CSV
    - Grade-wise count summary
    - Progress bar showing collection %
  - **School Tracking Page Updates**:
    - Shows "Student Fee Payment Link" for parents
    - Fee Collection Progress card with collected/expected amounts
    - Grade-wise payment breakdown
  - **Orders Section Updates**:
    - New "School Student Payments (Online)" tab
    - School-wise summary: Total collected, Students paid, Expected total, Collection %
    - Link to Payment Tracker for each school
    - Copy payment link functionality
  - **API Endpoints:**
    - `GET /api/school-payment/{school_id}` - Get school payment info (public)
    - `POST /api/school-payment/create-session` - Create Cashfree session (public)
    - `POST /api/school-payment/webhook` - Handle Cashfree webhooks
    - `GET /api/school-payment/verify/{order_id}` - Verify payment status
    - `GET /api/school-payment/tracker/{school_id}` - Get all payments (admin)
    - `GET /api/school-payment/tracker-public/{school_id}` - Get payment summary (public)
  - **New Files:**
    - `/app/frontend/src/pages/SchoolStudentPayment.jsx` - Student payment page
    - `/app/frontend/src/pages/admin/SchoolPaymentTracker.jsx` - Admin tracker

- **ENHANCED - Student Dashboard Payment Integration**: Integrated "Pay Fees" feature directly into the student dashboard after OTP login
  - **Dashboard Flow**:
    - Student logs in via OTP
    - If pending_payment exists, shows prominent green "Pay Your Fees" card
    - Displays: Batch name, Course, Amount due
    - "Pay Now" button opens Cashfree Drop-in modal
    - After successful payment:
      - Shows success message card
      - Student status changes to "converted"
      - Sessions created from batch schedule
      - Payment hidden from dashboard
  - **Backend Improvements**:
    - `GET /api/payments/by-phone/{phone}` - Fetch payment info by phone (for logged-in students)
    - Webhook now captures transaction_id (cf_payment_id) from Cashfree
    - Duplicate processing prevention in webhook and verify endpoints
    - Sessions auto-created from batch schedule on payment success
    - Student marked as "converted" with payment_transaction_id stored
  - **Orders Display**:
    - Transaction ID visible in Admin Orders
    - Shows "Paid via Cashfree" with payment method details
    - Prevents duplicate entries

- **NEW FEATURE - Cashfree Payment Gateway Integration (Drop-in Checkout)**: Fully integrated Cashfree for student online payments using embedded checkout
  - **Admin Flow**: 
    - "Convert & Onboard" modal has "Online Payment" option
    - Admin enters amount and selects/creates batch
    - Click "Setup Payment" saves pending_payment to student record
    - Generates shareable payment link: `/student/pay/{studentId}`
  - **Student Flow**:
    - Student visits payment page via link shared by admin
    - Sees their details: name, phone, batch, amount
    - Clicks "Pay Fees" → Cashfree Drop-in modal opens (embedded checkout)
    - Pays via UPI, Card, NetBanking, or Wallets
    - Payment auto-verifies via webhook
  - **API Endpoints:**
    - `GET /api/payments/student/{student_id}` - Get pending payment info (public)
    - `GET /api/payments/by-phone/{phone}` - Get pending payment info by phone (for dashboard)
    - `POST /api/payments/create-session/{student_id}` - Create Cashfree session for Drop-in checkout (public)
    - `GET /api/payments/verify/{order_id}` - Verify payment status
    - `POST /api/payments/webhook` - Cashfree webhook handler
  - **Updated Files:**
    - `/app/frontend/src/pages/MyBookingsPage.jsx` - Payment section integrated in student dashboard
    - `/app/frontend/src/pages/StudentPayment.jsx` - Standalone payment page
    - `/app/frontend/src/pages/admin/AdminStudentCRM.jsx` - Updated handleGeneratePaymentLink
    - `/app/backend/server.py` - Payment endpoints with session creation, webhook, verification
  - **Credentials:** Production Cashfree keys in `.env` (APP_ID, SECRET_KEY)
  - **IMPORTANT**: User must whitelist production domain in Cashfree Dashboard (merchant.cashfree.com > developers) for payments to work

- **BUG FIX - File Downloads (Comprehensive)**: Fixed ALL document downloads across the platform
  - Updated download utility to detect file type from Content-Type header
  - Files now download with proper names (e.g., `Invoice_SchoolName_Tranche1.pdf`)
  - Fixed downloads in: AdminSchoolCRM, AdminOrders, SchoolTrackingPage

- **BUG FIX - Resend Email 403 Error**: Fixed email sending failures by replacing non-existent `emergentintegrations.llm.resend` module with direct Resend SDK calls
  - Root Cause: Code was importing from a module that doesn't exist in the emergentintegrations library
  - Fix: Updated `server.py` to use `resend.Emails.send` directly with `asyncio.to_thread`
  - Affected: Welcome emails and Invoice emails now working correctly

- **PERFORMANCE - Tracking Page Speed**: Reduced PO API timeout from 30s to 5s for faster tracking page loads

- **UI - Removed Expenses Summary**: Removed "School-wise Expenses Summary" section from AdminExpenses.jsx per user request

- **Config Update**: Updated `SENDER_EMAIL` from `resend.dev` test domain to `oll.co` production domain

- **CRITICAL BUG FIX - School CRM Data Persistence**: Fixed the recurring issue (7+ reports) where data appeared to not save when updating schools
  - **Root Cause**: SchoolInquiry Pydantic model was missing fields (`onboarding_data`, `onboarding_workflow`, `activity_log`, etc.). Data WAS being saved to MongoDB but stripped from API responses.
  - **Fix**: Added all missing fields to SchoolInquiry model
  - **Also Fixed**: TypeError in `/api/schools/{id}/history` endpoint with timezone-aware datetime handling

### Feb 13, 2026 (continued)
- **API Key Management UI**: Complete UI for generating, listing, and revoking API keys in Admin Settings
  - Admin can now self-manage API keys for production integrations like ProcureWay/VendorPlus
  - Keys are securely masked in the list view, full key shown only once at generation

### Feb 13, 2025
- **ProcureWay PO Integration**: Added external API integration to fetch PO data for schools
- **Auto-Expense Creation**: Expenses automatically created from PO data (kit_cost, logistics_cost)
- **School Expenses Module**: New admin section for managing school-wise expenses
- **Address Field**: Added school address field to Convert, Renew, and Edit School modals
- **Onboarding UI Enhancement**: "Fetch from ProcureWay" and "Sync Expenses" buttons in Kit Delivery step
- **Public Tracker Update**: Shows PO delivery info on school tracking page

### Earlier Feb 2025
- WhatsApp Notifications Enhancement
- School CRM Improvements (same-day selection, skip renewal meeting)
- External API for schools
- Admin User phone numbers for WhatsApp

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB
- **File Storage**: Cloudinary
- **Notifications**: AiSensy (WhatsApp), Gmail SMTP (Email - pending GMAIL_APP_PASSWORD)
- **Analytics**: PostHog
- **Video**: Jitsi Meet
- **External APIs**: ProcureWay (PO Management)
- **Payments**: Cashfree Payment Gateway (Production)

### 8. API Key Management (NEW - Feb 13, 2026)
Admin Settings page now includes full API Key management:
- **List Keys**: View all API keys with masked display, creation date, last used time, and status
- **Generate Keys**: Create new API keys with custom names for external integrations
- **Revoke Keys**: Delete/deactivate API keys
- **Security**: Full key shown only once at generation time with copy-to-clipboard support

**API Endpoints:**
- `GET /api/admin/api-keys` - List all API keys
- `POST /api/admin/api-keys/generate` - Generate new API key
- `DELETE /api/admin/api-keys/{key_id}` - Revoke/delete an API key

## Background Jobs
Two cron job endpoints available:
```
POST /api/jobs/check-overdue-tickets?secret=<JOB_SECRET>
POST /api/jobs/send-meeting-reminders?secret=<JOB_SECRET>
```
Set `JOB_SECRET` environment variable and schedule hourly execution.

## Pending Tasks

### P0 - Blocking
- **Email Notifications**: Gmail SMTP implemented but awaiting `GMAIL_APP_PASSWORD` from user
- **Cashfree Domain Whitelist**: User must whitelist production domain in Cashfree Dashboard for payments to work

### P1 - High Priority
- **File Downloads Bug (Recurring)**: Multiple reports of files downloading with wrong names/types - needs comprehensive audit
- Generate Proposal & MOU PDFs feature
- CSV Export for CRM pages

### P2 - Medium Priority
- Refactor `server.py` into smaller route modules
- Refactor `AdminSchoolCRM.jsx` (8000+ lines)
- Cron job setup instructions for production

### Future Backlog
- Background job for AI follow-up emails
- Table of Contents for rich text editor
- PO generation & vendor panel
- Calendar service integration (Calendly)
- Enforce RBAC on all backend endpoints
- Lead scoring system
- Automated SMS/Email reminders

## Credentials
- **Admin Login**: `/admin/login`
- **Admin Email**: `admin@oll.co`
- **Admin Password**: `Dagaji03@`
- **Test OTP**: `1111`
