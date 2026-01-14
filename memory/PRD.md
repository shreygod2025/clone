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
│   └── server.py      # FastAPI backend with multi-user auth (Admin, Team, Center)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── InquiryPage.jsx         # Internal /add form (mobile-friendly, auto-assign)
│   │   │   ├── StudentFunnel.jsx       # Student booking flow
│   │   │   ├── MyBookingsPage.jsx      # User's bookings
│   │   │   ├── AboutPage.jsx           # About OLL page
│   │   │   ├── GrowthPartnerPage.jsx   # Growth Partner landing page
│   │   │   ├── EducatorFunnel.jsx      # Dynamic educator form
│   │   │   └── admin/
│   │   │       ├── AdminStudentCRM.jsx       # Enhanced View/Edit modal
│   │   │       ├── AdminSchoolCRM.jsx        # Enhanced View/Edit modal
│   │   │       ├── AdminEducators.jsx        # Enhanced View/Edit modal
│   │   │       ├── AdminGrowthPartners.jsx   # Enhanced View/Edit modal
│   │   │       ├── AdminSupportUnified.jsx
│   │   │       ├── AdminTeamApplications.jsx
│   │   │       ├── AdminDashboard.jsx        # Overdue section + Today's Schedule
│   │   │       ├── CenterDashboard.jsx       # Full Student CRM for centers
│   │   │       └── AdminCenterUsers.jsx      # Center user management
│   │   └── context/
│   │       └── AuthContext.jsx         # Multi-user auth (Admin, Team, Center)
└── memory/
    └── PRD.md
```

## What's Been Implemented (January 2026)

### Latest Session (Jan 14, 2026)
- ✅ **Student Form Improvements:**
  - "Book Free Demo Class" button now appears ABOVE "See Course Details" (primary action)
  - "Resend OTP" link now appears BELOW "Confirm Booking" button
  - Fixed runtime error after OTP confirmation (currentStepData guard)
- ✅ **My Bookings Page Enhancements:**
  - Bookings sorted by earliest upcoming date
  - **Join Demo button** (blue-red gradient) for online classes - links to Jitsi Meet
  - **Go to Center button** for offline center bookings - opens Google Maps
  - **At Home** display for offline home bookings with address
  - **Cancel Demo** feature with reason selection (5 options)
  - Support button now navigates without logging out user
- ✅ **Admin CRM Join/Navigate Buttons:**
  - Student CRM shows "Join Demo" for online bookings
  - Student CRM shows "Go to Center" for offline center bookings
  - Location display enhanced: "Online Class", "Center Name, City", "At Home - Address"
- ✅ **Navigation Fix:**
  - Logo click keeps logged-in users on their dashboard (/my-bookings)

### Previous Session (Jan 13, 2026)
- ✅ **Enhanced View/Edit Popup for ALL CRMs:**
  - School CRM, Educators CRM, Growth Partners CRM now have inline editing
  - View popup shows Edit button to switch to edit mode
  - Edit mode allows changing: name, phone, email, dates, notes
  - Full Comments section with add comment functionality
  - Author and timestamp shown for each comment
- ✅ **Dashboard Overdue Section:**
  - Shows overdue student demos, school meetings, educator demos
  - "Requires Attention" badge with total count
  - Each item shows name, phone, date, and relevant details
  - Appears above Today's Schedule when items exist
- ✅ **Center Dashboard Full CRM:**
  - Center users see full Student CRM for their location
  - Add Demo functionality with complete form
  - View/Edit lead details with inline editing
  - Comment management system
  - Status management: New → Demo Completed → Converted → Archived
  - Overdue indicators on lead cards

### Previous Session (Jan 12, 2026)
- ✅ **Center Login & Dashboard:**
  - Separate authentication for center staff
  - Dedicated `/center` dashboard
  - Admin UI to manage center users
- ✅ **Growth Partner Landing Page:**
  - Dedicated `/growth-partner` page with detailed form
- ✅ **Today's Schedule on Dashboard:**
  - Shows appointments for current day
  - Separate sections for Student Demos, School Meetings, Educator Demos
- ✅ **Team User Dashboard with Individual Analytics:**
  - Shows personalized stats: My Leads, My Conversions, Followups Due, Leads Added by Me
  - Performance Overview banner
  - Quick Actions filtered by user permissions
- ✅ **Multi-select Availability:** Educator forms support multiple availability options
- ✅ **School CRM Follow-up Feature:** Date/comment visible on cards

### Foundation Features
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
- **OTP System:** ✅ AiSensy WhatsApp OTP fully integrated and working
- **Calendar Integration:** No real Calendly integration yet

## AiSensy WhatsApp OTP Setup
To enable real WhatsApp OTP:
1. Log in to AiSensy dashboard
2. Create an OTP template with one parameter: `Your OLL verification code is {{1}}`
3. Create an API Campaign using that template
4. Add to `/app/backend/.env`:
   ```
   AISENSY_API_KEY=your_api_key
   AISENSY_CAMPAIGN_NAME=your_campaign_name  # Must match exactly
   ```
5. Restart backend: `sudo supervisorctl restart backend`

## Key API Endpoints
- `POST /auth/login` - Unified login for admins, team users, and center users
- `GET /auth/me` - Get current user with role and permissions
- `GET /dashboard/stats` - Returns overdue items, today's schedule, individual stats for team
- `PATCH /students/inquiry/{id}` - Update student (name, phone, email, demo_date, notes)
- `PATCH /schools/inquiry/{id}` - Update school (school_name, contact_name, phone, email, meeting_date, notes)
- `PATCH /educators/application/{id}` - Update educator (name, phone, email, demo_date, notes)
- `PATCH /growth-partners/{id}` - Update partner (name, phone, email, city, details, notes)
- `GET /center/demos` - Get student inquiries for center user's location
- `PATCH /center/demos/{id}` - Update demo from center dashboard
- `POST /center/demos/{id}/comment` - Add comment from center dashboard
- `POST /user/cancel-booking` - Cancel a booking with reason (new)

## Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Center User:** andheri@oll.co / center123
- **OTP:** Sent via WhatsApp (AiSensy)
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
- **High:** Extract shared CRM modal functionality into reusable React component
