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
│   │   │   ├── InquiryPage.jsx         # Internal /add form (mobile-friendly, auto-assign)
│   │   │   ├── StudentFunnel.jsx       # Student booking flow
│   │   │   ├── MyBookingsPage.jsx      # User's bookings
│   │   │   ├── AboutPage.jsx           # About OLL page
│   │   │   ├── EducatorFunnel.jsx      # Dynamic educator form
│   │   │   └── admin/
│   │   │       ├── AdminStudentCRM.jsx       # With Add Demo/Reschedule
│   │   │       ├── AdminSchoolCRM.jsx        # With Followup feature
│   │   │       ├── AdminEducators.jsx        # With Assign/Comment/Filter
│   │   │       ├── AdminSupportUnified.jsx
│   │   │       ├── AdminTeamApplications.jsx
│   │   │       └── AdminDashboard.jsx        # Individual analytics for team
│   │   └── context/
│   │       └── AuthContext.jsx
└── memory/
    └── PRD.md
```

## What's Been Implemented (January 2026)

### Latest Session (Jan 12, 2026)
- ✅ **Team User Dashboard with Individual Analytics:**
  - Shows personalized stats: My Leads, My Conversions, Followups Due, Leads Added by Me
  - Performance Overview banner
  - Quick Actions filtered by user permissions
  - Personalized "Add New Lead" link
- ✅ **Add/Change Demo Date in Admin CRM:**
  - Button shows "Add Demo" for leads without demo date
  - Button shows "Reschedule" for leads with existing demo
  - Modal shows current date when rescheduling
- ✅ **/add Form - Assignment Options:**
  - When using team user link (/add/username), shows "Assign to Me" or "Let Admin Assign"
  - Default is "Assign to Me" - auto-assigns lead to the team member
  - Source field now includes team member name: "walk_in (Added by: Test User)"
- ✅ **Mobile-Friendly /add Form:** Responsive design
- ✅ **Demo/Meeting Booking Always Visible:** Calendar shown directly without toggle
- ✅ **Student Form - Center Selection:** For offline mode
- ✅ **School CRM - Followup Feature:** Date/comment visible on cards

### Previous Sessions
- ✅ Student/School/Educator booking funnels
- ✅ OTP verification system (mocked with 1111)
- ✅ Admin Panel with multiple CRMs
- ✅ "Assign Lead" functionality across CRMs
- ✅ "Comment/Note" functionality
- ✅ Assignee filter dropdowns
- ✅ Team User management with permissions
- ✅ Role-based sidebar navigation
- ✅ Unified Support Center
- ✅ Dynamic Educator form configuration
- ✅ PostHog analytics integration

## Mocked/Placeholder Features
- **OTP System:** Hardcoded "1111" for verification
- **Calendar Integration:** No real Calendly integration yet

## Key API Endpoints
- `POST /auth/login` - Unified login for admins and team users
- `GET /auth/me` - Get current user with permissions
- `GET /dashboard/stats` - Returns individual stats for team members, global stats for admin
- `PATCH /students/inquiry/{id}` - Update student (includes demo_date, assigned_to)
- `PATCH /schools/inquiry/{id}` - Update school (includes followup_date, followup_comment)
- All Create endpoints now support `assigned_to` field

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
- [ ] Proposal/MOU generation for Schools (deferred)

### P3 - Future
- [ ] Lead Scoring system
- [ ] Admin Dashboard Analytics widgets (charts, graphs)
- [ ] SEO optimization for course pages

## Refactoring Needs
- **Critical:** Break down `/app/backend/server.py` into modules (`/routers`, `/models`, `/services`)
- **High:** Extract shared CRM functionality into reusable React hooks
