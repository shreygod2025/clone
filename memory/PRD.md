# OLL - Skill Education Platform PRD

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Core Requirements
- **Global Structure:** Landing Page (user selector), Student/Parent Funnel, Educator Funnel, School Funnel, SEO Course Funnels, About OLL page, Blog, and Admin Panel.
- **Design:** Minimal, clean, fast, glassy design. Red for CTA buttons, blue for trust-building elements.
- **Funnels:**
  - **Student:** Multi-step inquiry form with dynamic options, OTP verification, and post-booking management.
  - **Educator:** Application form with dynamic requirements and "Other City" option, OTP verification, dedicated dashboard.
  - **School:** Multi-step B2B inquiry form followed by services showcase page.
- **Admin Panel:**
  - CRMs for Students, Schools, and Educators with lead tracking.
  - Detailed forms for manually adding leads.
  - Management sections for content, requirements, cities, and centers.
  - Demo rating system for educators.
  - Manual educator assignment with skill matching.
- **Login & Booking Management:**
  - Phone number + OTP based login system for all user types.
  - "My Bookings" page for users to view and reschedule demos/meetings.
  - Educator dashboard for managing assigned demos.

## Architecture
```
/app/
├── backend/
│   └── server.py      # FastAPI backend with multi-user auth, educator portal, demo management
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── EducatorDashboard.jsx     # Educator portal with availability toggle
│   │   │   ├── EducatorFunnel.jsx        # Educator application with OTP
│   │   │   ├── MyBookingsPage.jsx        # Student bookings with incomplete status
│   │   │   ├── LoginPage.jsx             # Multi-role login (Student/Educator)
│   │   │   ├── CentersPage.jsx           # Centers with Growth Partner CTA
│   │   │   └── admin/
│   │   │       ├── AdminStudentCRM.jsx   # Manual educator assignment
│   │   │       ├── AdminEducators.jsx    # Demo rating modal
│   │   │       ├── AdminDashboard.jsx    # Analytics dashboard
│   │   │       └── AdminSupportUnified.jsx
│   │   └── context/
│   │       ├── AuthContext.jsx           # Admin auth
│   │       └── UserAuthContext.jsx       # Student/Educator auth with loading state
└── memory/
    └── PRD.md
```

## Completed Features (Jan 2026)

### Session Persistence Bug Fix ✅
- Added `authLoading` state check to prevent premature redirects
- Both student and educator sessions now persist correctly after page refresh

### P1: Educator "Mark Demo Incomplete" ✅
- Endpoint: POST /api/educator/incomplete-demo/{inquiry_id}
- Allows educators to mark demos as incomplete if student didn't join
- Adds "incomplete" status to bookings
- Student sees highlighted notice with reschedule button
- WhatsApp notification attempted (via AiSensy)

### P3: Educator Availability Toggle ✅
- Endpoint: PATCH /api/educator/toggle-availability
- UI toggle on educator dashboard
- Auto-assignment skips unavailable educators
- Shows "Available for new demos" / "Not accepting new demos"

### P4: Growth Partner CTA on Centers Page ✅
- Added orange gradient section at bottom of /centers
- "Want to Open Your Own OLL Center?" heading
- "Become a Growth Partner" button linking to /growth-partner

### Educator Lifecycle (Complete) ✅
- Application with OTP verification
- Status tracking: new → demo_scheduled → demo_completed → onboarded/rejected
- Dedicated educator dashboard with demo list
- Pass demo to another educator
- Complete demo with feedback
- Mark demo as incomplete

## Upcoming Tasks (Prioritized)

### P2: Post-Demo Feedback Form
- After educator marks demo complete, prompt with form:
  - Did student join? (Yes/No)
  - Were they interested? (1-5 rating)
  - Current skill level? (Beginner/Intermediate/Advanced)
  - Recommended sessions? (Number)

### P5: Educator Query Categories
- On educator dashboard "Ask Query" modal
- Categories: Demo related, Ongoing Classes, Payment related
- Auto-open assigned demos list when category selected

### P6: WhatsApp Template Setup (AiSensy)
- Define templates for booking confirmations
- Add action buttons: "Reschedule", "Cancel"

## Future/Backlog

### P2 Features
- CSV Export for all CRM pages
- Real Calendar Integration (Calendly)

### P3 Features
- Lead scoring system
- Full CMS for Blog, FAQs, About Us

## Technical Notes

### Test Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Test OTP:** 1111 (backend-only, works for all phones)
- **Test Student:** 9999999999
- **Test Educator:** 7777777777 (onboarded)

### Key Integrations
- **AiSensy:** WhatsApp OTP and notifications (LIVE)
- **Jitsi Meet:** Video demos (public server, first to join = moderator)
- **PostHog:** Analytics

### Known Limitations
- Jitsi moderator control not available on public server
- WhatsApp templates for incomplete demo may need configuration

## Refactoring Needed
1. **Critical:** server.py is 2000+ lines, needs modular structure (/routers, /models, /services)
2. **High:** EducatorFunnel.jsx and AdminEducators.jsx are large, need component extraction
3. Shared CRM modal logic is duplicated across admin pages
