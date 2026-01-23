# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 23, 2025 (Latest - P0 CRM & Data Center Complete + Feature Updates)

#### Latest Updates (16/16 tests passed - 100% success) ✅

**1. Amount Field in Student Onboarding**
- Added **Amount (₹)** field at top of Convert & Onboard modal
- Amount is mandatory and validates before submission
- Saves to `conversion_amount` field in student record
- **Revenue Reports now include conversion_amount** in calculations

**2. Data Center - Team & Growth Partners Added**
- **5 Stat Cards:** Students (70), Schools (29), Educators (23), **Team (4)**, **Growth Partners (8)**
- Type filter dropdown includes "Team" and "Growth Partners" options
- Status breakdown for all 5 categories

**3. Autocomplete in Add Lead Forms**
- Student CRM & School CRM Add Lead forms now have **autocomplete**
- Type 3+ characters in Name, Phone, or Email to search existing records
- Click suggestion to **auto-fill** the entire form
- Hint banner shows: "💡 Type at least 3 characters..."

---

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

### P2 - Medium Priority
- CSV Export for all CRM pages (Data Center export already done)
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
