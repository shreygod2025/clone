# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 23, 2025 (Latest - Reports & Bug Fixes)

#### Admin Reports Section ✅ NEW
1. **Comprehensive Analytics Dashboard at `/admin/reports`:**
   - **Key Metrics Row:** Total Revenue, Paid Students, Converted Schools, Active Educators, Support Open, Team Apps
   - **All Pipelines Section:** 6 pipeline cards showing stages for Students, Schools, Educators, Support, Team Apps, Growth Partners
   - **Conversion Rates:** Student & School funnels with Lead→Demo, Demo→Convert, Overall conversion percentages
   - **Analytics Breakdown:** 4 donut charts for Leads by Source, Age Group, Course Interest, Support by Type
   - **Educator Quality Metrics:** New educators, Active, Avg demos/educator, Avg earnings, Top performers
   - **Support Metrics:** New tickets, Open, Resolved, Avg resolution time, Priority breakdown
   - **User Stage Distribution:** 5 donut charts showing stage breakdown for all user types
   
2. **Date Filters:** Today, This Week, This Month, This Year, All Time, Custom date range

3. **Backend Endpoints:**
   - `GET /api/admin/reports/overview` - Overall metrics
   - `GET /api/admin/reports/sales-funnel` - Sales funnel with conversion rates
   - `GET /api/admin/reports/lead-analytics` - Lead source, age group, course breakdown
   - `GET /api/admin/reports/educator-metrics` - Teacher quality metrics
   - `GET /api/admin/reports/support-metrics` - Support query analytics
   - `GET /api/admin/reports/user-stages` - All user types stage distribution

#### Support Assignment Fix ✅
- Removed mandatory deadline requirement
- Deadline is now optional (hidden behind collapsible section)
- Users can assign tickets by simply clicking on a team member
- Unassign functionality preserved

#### Admin Educators Bugs Fixed ✅
1. **Onboarding Step Count:** Fixed from /8 to /7 (step 7 is admin verification)
2. **View Applicants Button:** Now properly filters applicants by requirement ID
3. **Auto-load Onboarding Details:** Documents load automatically when viewing educator

### Session: January 23, 2025 (Earlier - Educator Management & Bulk Import)

#### Educator Admin Fixes ✅
1. **Edit Requirement Modal:** Fixed - now opens properly
2. **Applicants Tab:** Fixed with sub-filters
3. **Removed "Requirements" from sidebar:** Managed within Educators tab

#### Add Single Active Educator ✅
- Modal form with name, email, phone, city, skills, experience
- Backend endpoint: `POST /api/educators/add-active`
- Skips application process, immediately active

#### Bulk Import Educators ✅
- CSV upload with preview
- Sample CSV download
- Backend endpoint: `POST /api/educators/bulk-import`

#### Footer & SEO Updates ✅
- White OLL logo, updated social links
- Shortened titles <65 chars, canonical URLs

### Session: January 23, 2025 (Support & Admin Improvements)

#### Support Center Ticket Assignment ✅
- User-specific filtering (non-admins see only their tickets)
- Admin assignment with optional deadline
- WhatsApp + Email notifications

#### Educator Tab Restructuring ✅
- Tab-based interface: Requirements, Applicants, Onboarding, Active, Archived
- Status mapping (new + demo_scheduled → applicants)

### Previous Sessions

#### Site-Wide Rebranding ✅
- "Student / Parent" → "Learner"
- Company: "Clonefutura Live Solutions Pvt Ltd"

#### Student Funnel UX ✅
- Grouped time slots (Morning/Afternoon/Evening)
- Auto-advance on selection

#### School Case Studies ✅
- 16 schools seeded with video links
- Displayed on About Us and School Offerings pages

#### Landing Page Redesign ✅
- New design with user type selector
- Permanent footer

## Pending Tasks

### P0 - Critical
- None (all critical bugs fixed)

### P1 - High Priority
- Make Blogs Dynamic (Admin CRUD)
- CSV Export for all CRM pages

### P2 - Medium Priority
- Real Calendar Integration (Calendly)
- Enforce RBAC permissions frontend/backend
- Lead scoring system
- Automated follow-up reminders for educators

### P3 - Future/Backlog
- Filter school case studies by board type (ICSE/CBSE/IB)
- LinkedIn "Share Post" in educator onboarding
- Merge "Center Users" and "Growth Partners" into RBAC

## Known Issues/Limitations
- **Jitsi Moderator Control:** Public meet.jit.si doesn't support programmatic moderator assignment
- **Resend Domain:** User must verify oll.co domain for email sending

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: FastAPI + MongoDB
- Integrations: AiSensy (WhatsApp), Jitsi (Video), PostHog (Analytics), Resend (Email)

## Key Admin URLs
- Dashboard: `/admin`
- Students: `/admin/students`
- Schools: `/admin/schools`
- Educators: `/admin/educators`
- Reports: `/admin/reports` ← NEW
- Support: `/admin/support`
- Settings: `/admin/settings`

## Test Credentials
- Admin: admin@oll.co / Dagaji03@
- User Login: Any 10-digit phone with OTP 1111
