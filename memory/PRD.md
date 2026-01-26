# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 26, 2025 (Latest - School Bulk Import + Student Funnel UX Fixes)

#### Latest Updates ✅

**1. School CRM - Bulk Import & Edit Active Schools**
- **Bulk Import Feature:**
  - "Bulk Import" button in Active Schools tab
  - Supports CSV and Excel file uploads
  - Downloadable template with all required columns
  - Duplicate detection by school name or email
  - Schools imported directly as "Active"
  - Creates both `school_inquiries` and `school_onboarding` records
- **Edit Active Schools:**
  - "Edit" button on Active and Renewed school cards
  - Modal shows all onboarding fields: School Info, Program Details, Payment Details, Contract Period
  - Updates both school inquiry and onboarding record

**2. Student Demo Booking - UX Improvements**
- **Simplified Flow:** Phone number first → OTP → Profile (if new user) → Age → Goal → Mode → Schedule
- **Continue Button Removed:** Clicking on options auto-advances, no more "Continue" button flash
- **OTP Duration:** Clarified as 10 minutes (message shows "Valid for 10 minutes")
- **Schedule Step:** Clean booking summary with "Book Demo" or "Continue to Book" button

**3. For Schools Page - Desktop Spacing**
- More content sections: Stats, Programs, Why Partner, CTA
- Requires scrolling to see footer on desktop
- Proper spacing and visual hierarchy

---

### Session: January 23, 2025 (Session Visibility + Dynamic Blogs)

**1. P0: Session Visibility - IMPLEMENTED**
- **Student Dashboard (MyBookingsPage):**
  - New "My Sessions" tab shows sessions when student is converted
  - Sessions display: date, time, mode (online/in-person), status
  - Progress bar showing completed/total sessions
  - "Join Now" button for online sessions with Jitsi link
  - Join window: 15 mins before to 1 hour after session time
- **Educator Dashboard:**
  - New "Sessions" tab shows assigned student sessions
  - Sessions include student name, phone, skill, batch info
  - "Join Session" button for online classes
- **Backend Endpoints:**
  - `GET /api/user/my-sessions/{phone}` - Public endpoint for students
  - `GET /api/educator/my-sessions` - Auth required for educators

**2. P1: Dynamic Blogs Admin - IMPLEMENTED**
- Full CRUD admin panel at `/admin/blogs`
- Create/Edit/Delete blog posts
- Fields: title, slug (auto-generated), category, author, cover image, excerpt, content
- Publish/Draft toggle
- Published blogs appear on public `/blogs` page
- Added "Blogs" nav item to admin sidebar

**3. UI: For Schools Page - Enhanced Desktop Layout**
- `/for-schools` page now has proper spacing and requires scrolling
- Added sections: Stats, Programs We Offer, Why Partner With OLL, CTA
- 4 program cards: Robotics Lab Setup, STEM Curriculum, AI & Coding, Entrepreneurship
- Benefits checklist with partnership CTA

**4. Deployment Fix - Hardcoded URL Removed**
- Removed hardcoded `https://oll-learning-hub.preview.emergentagent.com` from server.py
- Now uses `FRONTEND_URL` environment variable
- Added `FRONTEND_URL` to backend .env

---

### Previous Session: January 20, 2025 (School Onboarding Overhaul + Autocomplete)

**1. School Onboarding Modal - Major Enhancements**
- **Select Offering** dropdown - populated from `/api/school-offerings` endpoint
- **Book Type** dropdown - "Individual Books" / "No Books" options
- **Kit Type** dropdown - "Lab Setup" / "Individual Kit" / "No Kit"
- **Training Type** dropdown - "Student Training" / "Teacher Training" / "Both"
- **MOU Document Upload** - optional file upload for MOU documents
- **Payment Mode** - "From School" / "From Student"
- **Payment Method** - "Cheque" / "NEFT" / "Online" / "Cash"
- **Payment Tranches** - Multiple tranches with:
  - % field → auto-calculates Amount
  - Amount field → auto-calculates %
  - Date picker for each tranche
  - Notes field
- **Save as Draft** button - saves progress without completing onboarding
- **Draft Progress Bar** - shows on school cards when onboarding is in draft state with "Continue →" button

**2. Public /add Page - Autocomplete Fixed**
- Created new **public endpoint** `/api/public/autocomplete` (no auth required)
- Works for both Lead and Query submissions
- Type 3+ characters in Name, Phone, or Email to see suggestions
- Auto-fills form when suggestion is clicked

**3. Support Center - Autocomplete Added**
- Create Ticket modal now has autocomplete on Name, Phone, Email fields
- Uses existing data to auto-fill customer information

**4. Backend - New Endpoints**
- `GET /api/public/autocomplete` - Public autocomplete for /add page
- `GET /api/school-offerings` - Returns available offerings for school onboarding

---

### Previous Session Updates

#### 1. Data Center - Unified View ✅ VERIFIED & TESTED
- Single unified list showing ALL Students, Schools, Educators, **Team, Growth Partners**
- **No tabs** - one searchable/filterable list with Type badge for each record
- **Stats Overview:** 5 categories with status breakdowns
- **Search:** Global search across all records by name/phone/email
- **Filters:** Type (5 options), Status, City, Age Group, Skill, Fee Range, Student Count, Availability
- **Export to CSV** functionality
- Backend endpoints fully working

#### 2. Student CRM - Convert & Onboard Flow ✅ VERIFIED & TESTED
- **4 Status Tabs:** New Leads, Demo Completed, Converted, Archived
- **Convert & Onboard button** appears on Demo Completed leads
- **Amount (₹)** field at top of modal (mandatory)
- **Mandatory Payment Receipt Upload** below amount
- **Batch Options:** Create New Batch / Join Existing Batch
- **Autocomplete** in Add Lead form for existing records
- Status transitions: new → demo_completed → converted (with payment_receipt_url, conversion_amount)

#### 3. School CRM - New Status Tabs ✅ VERIFIED & TESTED
- **7 Status Tabs:** New Leads, Meeting Done, Converted, **Active Schools**, **Renewed**, **Lost**, Archived
- **Autocomplete** in Add Lead form for existing records
- Onboarding flow for converted schools with custom model, pricing, contacts

#### 4. Previous Features (Still Working)
- Support Ticket Creation from Admin
- Student Onboarding System with batch/session creation
- School Onboarding System with custom configuration
- Support Assignment (deadline optional)
- Admin Reports Dashboard

### Previous Sessions (Summary)

#### Admin Reports Section ✅
- Comprehensive analytics dashboard at `/admin/reports`
- Key metrics, All pipelines, Conversion rates, Analytics charts
- Date filters (Today/Week/Month/Year/Custom)

#### Admin Educator Management ✅
- Tab-based interface (Requirements, Applicants, Onboarding, Active)
- Bulk import via CSV
- Onboarding flow with document verification

#### Site-wide Features ✅
- Rebranding to "Learner" and "Clonefutura Live Solutions"
- School Case Studies (16 schools)
- SEO optimization across all pages

## Database Collections (New)

### batches
```javascript
{
  id: string,
  name: string,
  skill: string,
  start_date: string,
  days: ['monday', 'wednesday', 'friday'],
  time_slot: '10:00 AM',
  num_sessions: 12,
  educator_id: string,
  educator_name: string,
  mode: 'online' | 'offline' | 'hybrid',
  status: 'active' | 'completed' | 'cancelled',
  students: [student_ids],
  created_at: datetime
}
```

### sessions
```javascript
{
  id: string,
  batch_id: string,
  student_id: string,
  educator_id: string,
  session_number: 1,
  date: '2025-01-25',
  time: '10:00 AM',
  skill: string,
  mode: 'online',
  status: 'scheduled' | 'completed' | 'cancelled',
  jitsi_room: 'oll-batch123-student456',
  jitsi_link: 'https://meet.jit.si/oll-batch123-student456',
  created_at: datetime
}
```

### school_onboarding
```javascript
{
  id: string,
  school_id: string,
  model: 'robotics_lab' | 'stem_curriculum' | etc,
  grade_pricing: [{ grade: '1-5', students: 50, price_per_student: 500 }],
  total_students: 200,
  total_amount: 100000,
  school_contacts: [{ name, phone, email, role }],
  payment_mode: 'monthly' | 'quarterly' | 'annual',
  contract_start: date,
  contract_end: date,
  status: 'active',
  created_at: datetime
}
```

## Key Admin URLs
- Dashboard: `/admin`
- Student CRM: `/admin/students`
- School CRM: `/admin/schools`
- Educators: `/admin/educators`
- **Reports: `/admin/reports`**
- **Data Center: `/admin/data-center`** ← NEW
- Support: `/admin/support`
- Settings: `/admin/settings`

## Pending Tasks

### P0 - Immediate Priority
- ✅ COMPLETED: Data Center unified view, Student CRM onboarding with payment receipt, School CRM new tabs

### P1 - High Priority
- Session Visibility: Sessions created during onboarding should show on Student & Educator dashboards
- Make Blogs Dynamic (Admin CRUD)
- Auto-fill forms from Data Center search

### P1 - High Priority
- Draft Notifications: Show reminders to admins when school onboarding is saved as draft
- CSV Export for all CRM pages (Data Center export already done)

### P2 - Medium Priority
- Real Calendar Integration (Calendly)
- Enforce RBAC permissions on frontend/backend

### P3 - Future/Backlog
- Lead scoring system
- Automated follow-up reminders for educators before demos
- Automated SMS/Email reminders for students before sessions
- LinkedIn share in educator onboarding
- Payment gateway integration
- Merge Center Users and Growth Partners into main RBAC

## Backend Refactoring (Recommended)
- `/app/backend/server.py` is ~5,400+ lines - should split into `/routers`, `/models`, `/services`
- Large admin components should be broken into smaller focused components

## Test Credentials
- Admin: admin@oll.co / Dagaji03@
- User Login: Any 10-digit phone with OTP 1111

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: FastAPI + MongoDB
- Video: Jitsi Meet (auto-generated rooms for online sessions)
- Integrations: AiSensy (WhatsApp), PostHog (Analytics), Resend (Email)
