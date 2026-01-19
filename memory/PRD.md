# OLL - Skill Education Platform PRD

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Latest Updates (Jan 2026)

### About Page - Founder Section ✅
- Changed team section to focus on **Shreyaan Daga's story**
- Tagline: "FOR THE STUDENTS, BY THE STUDENTS"
- Entrepreneur journey timeline (Age 8-15)
- Instagram & LinkedIn social links
- Photo with "Started at 15" badge

### Media Features - Embedded Videos ✅
- **Shark Tank India** video embedded as iframe (no click required)
- **KBC** video embedded with timestamp (starts at Shreyaan's segment)
- Videos are visible directly on the page

### Join Team Page (/join-team) ✅
- Dedicated team application page with shareable URL
- Form fields: Name, Email, Phone, City, Role, Experience, Availability, LinkedIn, Portfolio, Message
- Backend endpoints:
  - `POST /api/team-applications` - Submit application
  - `GET /api/team-applications` - List applications (admin)
  - `PATCH /api/team-applications/{id}` - Update status/notes
  - `GET /api/team-requirements` - Get open positions
  - `POST /api/team-requirements` - Create position (admin)

### WhatsApp Integration (AiSensy) ✅
- 14 templates integrated for Students & Educators
- Demo confirmation (Online/Offline)
- Reminders: 1 hour, 30 min (offline), 10 min (online)
- "Not joined yet" notifications
- Session completion messages
- Cron endpoint: `POST /api/notifications/send-reminders`

### Session Persistence ✅
- Fixed bug where users were logged out on refresh
- Both student and educator sessions persist correctly

### Educator Features ✅
- "Mark Demo Incomplete" option
- Availability toggle (Go Available/Unavailable)
- "Not Joined?" button to notify students

## Completed Features Summary

| Feature | Status | Route/Component |
|---------|--------|-----------------|
| Student Funnel | ✅ | /student |
| Educator Funnel | ✅ | /educator |
| School Funnel | ✅ | /school |
| My Bookings | ✅ | /my-bookings |
| Educator Dashboard | ✅ | /educator-dashboard |
| Join Team Page | ✅ | /join-team |
| Admin Panel | ✅ | /admin/* |
| WhatsApp Notifications | ✅ | AiSensy integrated |
| Session Persistence | ✅ | UserAuthContext |

## Upcoming Tasks

### P2: Post-Demo Feedback Form
- After educator marks demo complete, prompt with form
- Questions: Did student join? Interest level? Skill level? Recommended sessions?

### P5: Educator Query Categories
- Categories: Demo related, Ongoing Classes, Payment related
- Auto-open assigned demos list when category selected

### Admin Panel - Team CRM
- Create admin page to manage team applications
- Status tracking: new → contacted → interviewing → hired/rejected

## Test Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Test OTP:** 1111 (works for all phones)
- **Test Educator:** 7777777777

## Key URLs
- About Page: /about
- Join Team: /join-team
- Centers: /centers
- Growth Partner: /growth-partner
