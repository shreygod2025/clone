# OLL - Skill Education Platform PRD

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Core Requirements
- **Global Structure:** Landing Page (user selector), Student/Parent Funnel, Educator Funnel, School Funnel, SEO Course Funnels, About OLL page, Blog, and Admin Panel.
- **Design:** Minimal, clean, fast, glassy design. Red for CTA buttons, blue for trust-building elements.
- **Funnels:**
  - **Student:** Multi-step inquiry form with dynamic options, OTP verification, and post-booking management.
  - **Educator:** Application form with dynamic requirements and "Other City" option.
  - **School:** Multi-step B2B inquiry form followed by services showcase page.
- **Admin Panel:**
  - CRMs for Students, Schools, and Educators with lead tracking.
  - Detailed forms for manually adding leads.
  - Management sections for content, requirements, cities, and centers.
- **Login & Booking Management:**
  - Phone number + OTP based login system for all user types.
  - "My Bookings" page for users to view and reschedule demos/meetings.

## Architecture
```
/app/
├── backend/
│   └── server.py      # FastAPI backend with all endpoints
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── InquiryPage.jsx         # Internal /add form (mobile-friendly)
│   │   │   ├── StudentFunnel.jsx       # Student booking flow
│   │   │   ├── MyBookingsPage.jsx      # User's bookings
│   │   │   ├── AboutPage.jsx           # About OLL page
│   │   │   ├── EducatorFunnel.jsx      # Dynamic educator form
│   │   │   └── admin/
│   │   │       ├── AdminStudentCRM.jsx
│   │   │       ├── AdminSchoolCRM.jsx    # With Followup feature
│   │   │       ├── AdminEducators.jsx    # With Assign/Comment/Filter
│   │   │       ├── AdminSupportUnified.jsx
│   │   │       ├── AdminTeamApplications.jsx
│   │   │       └── AdminDashboard.jsx    # Permission-based nav
│   │   └── context/
│   │       └── AuthContext.jsx
└── memory/
    └── PRD.md
```

## What's Been Implemented (January 2026)

### Latest Session (Jan 12, 2026)
- ✅ **Mobile-Friendly /add Form:** Complete redesign with responsive layout
- ✅ **Demo/Meeting Booking Always Visible:** Calendar shown directly without toggle button
- ✅ **Student Form - Center Selection:** When "Offline at Center" mode selected, center dropdown appears
- ✅ **Student Form - Meeting Type Removed:** Auto-determined from learning mode (online/offline)
- ✅ **School CRM - Followup Feature:** 
  - Added `followup_date` and `followup_comment` fields to backend
  - Added Followup button to all non-converted sections
  - Followup date/comment visible on cards
  - Followup Modal with calendar and note
- ✅ **Educator CRM - Assign/Comment/Filter:** Complete implementation with modals
- ✅ **Role-based Sidebar Navigation:** Team members only see CRMs they have permission for

### Previous Sessions
- ✅ Student/School/Educator booking funnels
- ✅ OTP verification system (mocked with 1111)
- ✅ Admin Panel with multiple CRMs
- ✅ "Assign Lead" functionality across CRMs
- ✅ "Comment/Note" functionality
- ✅ Assignee filter dropdowns
- ✅ Team User management with permissions
- ✅ Unified Support Center
- ✅ Internal /add page for team members
- ✅ Dynamic Educator form configuration
- ✅ PostHog analytics integration

## Mocked/Placeholder Features
- **OTP System:** Hardcoded "1111" for verification
- **Calendar Integration:** No real Calendly integration yet

## Key API Endpoints
- `POST /auth/login` - Unified login for admins and team users
- `GET /auth/me` - Get current user with permissions
- `PATCH /schools/inquiry/{id}` - Update school inquiry (includes followup_date, followup_comment)
- `PATCH /educators/application/{id}` - Update educator (includes assigned_to)
- `POST /{collection}/comment/{id}` - Add comment to any CRM item

## Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **OTP Code:** 1111
- **Team Users:** Create via Admin Panel → Team Users

## Backlog

### P1 - High Priority
- [ ] CSV Export for all CRM pages
- [ ] Content Management (Blog, FAQs, About Us admin)

### P2 - Medium Priority
- [ ] Real Calendar Integration (Calendly)
- [ ] Real WhatsApp OTP (Twilio)
- [ ] Email/WhatsApp notifications for form submissions

### P3 - Future
- [ ] Lead Scoring system
- [ ] Admin Dashboard Analytics widgets
- [ ] SEO optimization for course pages

## Refactoring Needs
- **Critical:** Break down `/app/backend/server.py` into modules (`/routers`, `/models`, `/services`)
- **High:** Extract shared CRM functionality into reusable React hooks
