# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 23, 2025 (Latest - Major Feature Update)

#### 1. Support Ticket Creation from Admin ✅ NEW
- "Create Ticket" button in Support Center
- Modal with: Name, Phone, Email, Query Type, User Type, Priority, Message
- Backend endpoint: `POST /api/support/queries/create`

#### 2. Student Onboarding System ✅ NEW
- **"Onboard" button** on converted students in CRM
- **Create New Batch:**
  - Batch name, Start date, Days selection (Mon-Sun)
  - Time slot, No. of sessions, Mode (Online/Offline/Hybrid)
  - Educator assignment
- **Join Existing Batch:** Select from active batches
- **Auto-generates sessions** with Jitsi links for online mode
- Backend endpoints:
  - `POST /api/batches` - Create batch
  - `GET /api/batches` - List batches
  - `POST /api/batches/{id}/add-student` - Add student to batch
  - `GET /api/sessions` - Get sessions (filterable)
  - `PUT /api/sessions/{id}` - Update session status

#### 3. School Onboarding System ✅ NEW
- **"Onboard" button** on converted schools in CRM
- **Full customization:**
  - Model selection (Robotics Lab, STEM, After School, etc.)
  - Grade-wise student count & pricing table (dynamically add rows)
  - Multiple school team contacts (name, phone, email, role)
  - Payment mode (Monthly/Quarterly/Annual/etc.)
  - Contract start & end dates
- Backend endpoint: `POST /api/schools/onboard`

#### 4. Data Center ✅ NEW
- New admin page at `/admin/data-center`
- **Stats Overview:** Total Students, Schools, Educators with status breakdowns
- **Search:** Global search across all records by name/phone/email
- **Filters:**
  - Data type (All/Students/Schools/Educators)
  - Status, City, Age Group, Board, Skill
- **Export to CSV**
- **Quick view details** with "Open in CRM" option
- Backend endpoints:
  - `GET /api/data-center/search` - Unified search
  - `GET /api/data-center/stats` - Statistics
  - `GET /api/data-center/autocomplete` - For form auto-fill

#### 5. Support Assignment Fix ✅
- Deadline is now **optional** (collapsed by default)
- Direct click assignment to team members

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

### P1 - High Priority
- Student & Educator Dashboard (view sessions)
- Make Blogs Dynamic (Admin CRUD)
- Auto-fill forms from Data Center search

### P2 - Medium Priority
- CSV Export for all CRM pages
- Real Calendar Integration (Calendly)
- Enforce RBAC permissions

### P3 - Future/Backlog
- Lead scoring system
- LinkedIn share in educator onboarding
- Payment gateway integration

## Test Credentials
- Admin: admin@oll.co / Dagaji03@
- User Login: Any 10-digit phone with OTP 1111

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: FastAPI + MongoDB
- Video: Jitsi Meet (auto-generated rooms for online sessions)
- Integrations: AiSensy (WhatsApp), PostHog (Analytics), Resend (Email)
