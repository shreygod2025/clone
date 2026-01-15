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

## Completed Features (Jan 2026)

### Session Persistence Bug Fix ✅
- Added `authLoading` state check to prevent premature redirects
- Both student and educator sessions now persist correctly after page refresh

### P1: Educator "Mark Demo Incomplete" ✅
- Endpoint: POST /api/educator/incomplete-demo/{inquiry_id}
- Allows educators to mark demos as incomplete if student didn't join
- Shows "incomplete" status with reschedule button on student's My Bookings

### P3: Educator Availability Toggle ✅
- Endpoint: PATCH /api/educator/toggle-availability
- UI toggle on educator dashboard
- Auto-assignment skips unavailable educators

### P4: Growth Partner CTA on Centers Page ✅
- Added orange gradient section at bottom of /centers
- "Become a Growth Partner" button linking to /growth-partner

### P6: WhatsApp Template Integration (AiSensy) ✅
Full integration with 14 WhatsApp templates:

**Student Templates:**
| Template Key | AiSensy Campaign Name | Trigger |
|--------------|----------------------|---------|
| student_demo_confirmed_online | Online Student Demo Confirmation | Demo booked (online) |
| student_demo_confirmed_offline | Offline Student Demo Confirmation | Demo booked (offline) |
| student_reminder_1hr | Reminder 1 hour prior Student Demo Confirmation | Cron job |
| student_reminder_30min_offline | Reminder 30 min before Offline class | Cron job (offline only) |
| student_reminder_10min_online | Reminder 10 min before Online class | Cron job (online only) |
| student_not_joined | Class started still not joined | Admin/Educator button click |
| student_session_complete | Student Session completion | Demo marked complete |

**Educator Templates:**
| Template Key | AiSensy Campaign Name | Trigger |
|--------------|----------------------|---------|
| educator_demo_confirmed_online | Online Teacher Demo Confirmation | Demo assigned (online) |
| educator_demo_confirmed_offline | Offline Teacher Demo Confirmation | Demo assigned (offline) |
| educator_reminder_1hr | Reminder 1 hour prior Teacher Demo Confirmation | Cron job |
| educator_reminder_30min_offline | Reminder 30 min Teacher before Offline class | Cron job (offline only) |
| educator_reminder_10min_online | Reminder 10 min Teacher before Online class | Cron job (online only) |
| educator_not_joined | Class started still not joined educator | Admin button click |
| educator_session_complete | Educator Session completion | Demo marked complete |

**New Endpoints:**
- `POST /api/educator/notify-not-joined/{inquiry_id}` - Educator notifies student hasn't joined
- `POST /api/admin/notify-not-joined/{inquiry_id}` - Admin notifies student or educator
- `POST /api/notifications/send-reminders` - Cron endpoint for scheduled reminders

**UI Changes:**
- Educator Dashboard: "Not Joined?" button on demo cards
- Admin CRM: "Student?" and "Educator?" notification buttons

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

### Cron Job Setup
- Set up external cron to call `/api/notifications/send-reminders` every 10 minutes
- Can use services like cron-job.org or Render cron jobs

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
- **AiSensy:** WhatsApp OTP and notifications (LIVE - 14 templates integrated)
- **Jitsi Meet:** Video demos (public server, first to join = moderator)
- **PostHog:** Analytics

### Architecture
```
/app/
├── backend/
│   └── server.py      # FastAPI backend with WhatsApp notification utility
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── EducatorDashboard.jsx     # Availability toggle + Not Joined button
│   │   │   ├── MyBookingsPage.jsx        # Incomplete status display
│   │   │   ├── CentersPage.jsx           # Growth Partner CTA
│   │   │   └── admin/
│   │   │       └── AdminStudentCRM.jsx   # Student?/Educator? notification buttons
└── tests/
    └── test_whatsapp_notifications.py    # WhatsApp feature tests
```

## Known Limitations
- Jitsi moderator control not available on public server
- Reminder cron job needs external scheduler setup
