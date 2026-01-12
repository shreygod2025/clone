# OLL Skill Education Platform - PRD

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. SEO-first with admin panel and CRM system.

---

## Completed Work - January 12, 2026

### Session 3 (Latest) - P1 Tasks Complete

#### 1. Team Applications Admin CRM
- [x] Created `/admin/team-applications` page
- [x] Full CRM with status pipeline: New → Contacted → Interview → Hired/Rejected
- [x] Assign, Comment/Note features
- [x] Backend endpoints: POST/GET/PATCH `/api/team-applications`
- [x] Added to admin sidebar navigation

#### 2. About Us Forms → CRM Connection
- [x] Team form now submits to `/api/team-applications` (was going to educators)
- [x] Growth Partner form now submits to `/api/growth-partners` (was going to schools)
- [x] Both forms route to correct CRM pages in admin

#### 3. Redesigned /add Page (Single Page Form)
- [x] All fields on one page (no multi-step wizard)
- [x] Type selection: Student, School, Growth Partner, Teacher/Educator, Team
- [x] Lead or Query toggle
- [x] Dynamic fields based on type:
  - Student: Age group, Skill, Learning mode
  - School: School name, Size, Board, Programs
  - Educator: Skills, Grades, Experience, Availability
  - Growth Partner: Interest type, Investment capacity
  - Team: Role, Experience
- [x] Query section with query type dropdown

#### 4. Dynamic Educator Form
- [x] Added `/api/educator-config` endpoint for dynamic form configuration
- [x] Skills, Grades, Availability options fetched from config
- [x] Can be managed from admin (PUT endpoint available)

### Session 2 - User Experience
- [x] Other Courses section on My Bookings
- [x] Streamlined booking for logged-in users (skip contact/OTP)
- [x] Course page → Booking starts at age step
- [x] Duplicate booking prevention

### Session 1 - Bug Fixes & Assign Feature
- [x] P0: Support queries now appear in admin
- [x] P1: Assign Lead in all CRMs
- [x] P1: Comments in School CRM

---

## Key Endpoints

### Team Applications
- `POST /api/team-applications` - Create application
- `GET /api/team-applications` - List all (with status filter)
- `PATCH /api/team-applications/{id}` - Update status/assign
- `POST /api/team_applications/comment/{id}` - Add comment

### Educator Config
- `GET /api/educator-config` - Get dynamic form config
- `PUT /api/educator-config` - Update form config (admin only)

---

## Pending Tasks

### P2 - Medium Priority
- [ ] CSV Export for all CRMs
- [ ] Blog/FAQ content management UI
- [ ] Real Calendly integration
- [ ] Real WhatsApp OTP (Twilio)

### P3 - Future
- [ ] Email/WhatsApp notifications
- [ ] Lead scoring system
- [ ] Refactor server.py monolith

---

## Credentials
**Admin:** admin@oll.co / Dagaji03@
**Test OTP:** 1111 (MOCKED)

## MOCKED Features
- OTP via WhatsApp (hardcoded 1111)
- Calendar booking integration
