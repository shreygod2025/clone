# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for OLL that:
- Clearly separates Students/Parents, Educators, and Schools
- Uses funnel-based flows, not generic pages
- Is SEO-first, scalable, and backend-driven
- Has a powerful admin + CRM system

## User Personas
1. **Students/Parents** - Seeking skill education (Robotics, Coding, AI, etc.)
2. **Educators** - Looking to join OLL's teaching network
3. **Schools** - Wanting to partner with OLL for skill programs
4. **Admins** - Managing CRM, content, and operations

## Core Requirements (Static)
- Funnel-based user journeys with minimal friction
- Step-by-step inquiry forms (1 question per screen)
- Calendly-style demo booking (MOCKED)
- Smart FAQ system with support tickets
- Admin CRM for lead management
- Blog system for SEO
- Mobile-first, fast-loading design

## What's Been Implemented

### Phase 1 - MVP Complete ✅ (January 2026)

**Landing Page**
- Clean 3-card design with gradient backgrounds (no stock images)
- Full viewport display - no scrolling needed
- Navigation with About, Blog, FAQ (Admin link removed from nav)
- Admin access at separate /admin route

**Student Funnel**
- 8-step wizard form (learner type → age → skill → mode → city → goal → contact → demo)
- Calendar-based demo booking (Calendly-style, MOCKED)
- Progress indicator
- FAQ modal with common questions
- Conditional city field (only shows for offline mode)

**Educator Funnel**
- Application form with skills, experience, grades, availability
- Open requirements listing from backend
- Demo-ready toggle

**School Funnel** ✅ (Updated January 10, 2026)
- 9-step B2B inquiry wizard
- Board selection, location, school size, fee range
- Programs interested (multi-select checkboxes)
- Support needed (multi-select)
- Meeting date and time selection
- School Name moved to final contact step
- Credibility section post-submission

**FAQ Page**
- Searchable FAQs
- Category filters (Courses, Fees, Demos, Online vs Offline)
- Support ticket creation

**About Page** ✅ (Redesigned January 10, 2026)
- New hero: "Building a Religion of Practical Learning"
- Mission & Vision sections
- **Our Journey** - Timeline with milestones (2019, 2021, 2024)
  - YouTube video integration for founder story
  - "Watch: OLL BackStory" and "Watch: Introduction to OLL" buttons
- **Our Team** section - 3 members:
  - Shreyaan Daga (Co-Founder & CEO)
  - Neha Kambli (Business Head)
  - Ritesh Rathore (Growth Partners)
- **Board of Advisors** section - 6 advisors with photos and bios:
  - Ms. Vinita Mahajan, Lt Gen Surendra Kulkarni, Heather Anderson
  - Dr. Neeta Bali, Dr. Seema Negi, Ms. Alka Singh
- **Our Investors** section
- What We Do showcase
- Join OLL Team form
- Become Growth Partner form

**Blog System**
- Blog listing with categories
- Individual blog detail pages
- CTA integration

**Admin Panel**
- JWT authentication (login/register)
- Dashboard with 8 stat cards
- **Student CRM** ✅ (Updated January 10, 2026)
  - View, edit status, add notes, schedule demos
  - Shows "Mode: Online" or "Mode: Offline • [City]"
  - Kanban-style pipeline (New Leads, Demo Completed, Converted)
- **School CRM**
  - View, edit status, schedule meetings
  - Pipeline similar to Student CRM
- Educator Management (review applications, update status)
- Blog Management (CRUD)
- FAQ Management (CRUD)
- Open Requirements Management (CRUD)
- Support Ticket Management

### Technical Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT with bcrypt password hashing
- **Design**: Glassmorphism with OLL brand colors (Red #D63031, Navy #1E3A5F)

## Admin Credentials
- **Email**: admin@oll.co
- **Password**: Dagaji03@
- **Login URL**: /admin/login

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Educator CRM in Admin Panel (similar to Student/School CRMs)
- [ ] Email notifications integration (SendGrid/Resend)
- [ ] WhatsApp automation for confirmations
- [ ] Real calendar integration (replace MOCKED demo booking)

### P1 - High Priority
- [ ] SEO course funnel pages (by user type, by course)
- [ ] City-based school landing pages
- [ ] About page content editing in admin
- [ ] Gallery management in admin
- [ ] Content Management (Blogs, FAQs) - backend logic enhancement
- [ ] Export leads to CSV

### P2 - Medium Priority
- [ ] Analytics dashboard with charts
- [ ] Bulk status updates
- [ ] Role-based access control (Admin, Sales, Ops, Content)
- [ ] Password reset flow

### P3 - Nice to Have
- [ ] Dark mode toggle
- [ ] Multi-language support
- [ ] Payment tracking integration
- [ ] Advanced reporting
- [ ] Lead scoring system

## MOCKED Features
- **Calendar/Demo Booking**: Currently shows a confirmation message only. No real Calendly or calendar integration yet.

## File Structure
```
/app/
├── backend/
│   ├── server.py      # Main FastAPI app with all models and API endpoints
│   ├── tests/
│   │   └── test_oll_features.py  # API tests
│   └── .env           # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── components/ui/  # Shadcn/UI components
│   │   ├── context/
│   │   │   └── AuthContext.jsx # JWT token management
│   │   ├── pages/
│   │   │   ├── admin/     # Admin panel pages
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── AdminStudentCRM.jsx  # Updated to show learning_mode
│   │   │   │   └── AdminSchoolCRM.jsx
│   │   │   ├── AboutPage.jsx  # Redesigned with timeline/team/advisors
│   │   │   ├── BlogsPage.jsx
│   │   │   ├── EducatorFunnel.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── SchoolFunnel.jsx  # 9-step funnel
│   │   │   └── StudentFunnel.jsx
│   │   ├── App.js
│   │   └── index.css
│   └── package.json
├── memory/
│   └── PRD.md
└── test_reports/
    ├── iteration_1.json
    └── iteration_2.json
```

## Last Update
- **Date**: January 10, 2026
- **Changes**: 
  1. About page redesigned with timeline, team, advisors, investors sections
  2. Student CRM updated to show learning mode (Online/Offline) with city
  3. School Funnel verified - School Name is in final step (already implemented)
- **Testing**: All features verified working (iteration_2.json - 100% pass rate)
