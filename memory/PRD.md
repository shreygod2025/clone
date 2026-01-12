# OLL Skill Education Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

---

## What's Been Implemented

### January 12, 2026 - Session 2 (Latest)

#### User Experience Improvements for Logged-in Students
- [x] **"Other Courses Offered by OLL" section** - Now displays on My Bookings page with all 5 courses (Robotics, Coding, AI, Entrepreneurship, Financial Literacy)
- [x] **Streamlined booking for logged-in users** - Skip contact details and OTP verification
  - Logged-in users go directly from Schedule → Booking confirmation
  - Reduced from 7-8 steps to just 5 steps
  - Pre-fills name and phone from user profile
- [x] **Course page → Booking flow** - Starts at Step 3 (age group) instead of Step 1
- [x] **Book Free Demo button color** - Changed from red to blue (#1E3A5F) in Step 2
- [x] **Navbar logo redirect** - Logged-in users go to My Bookings instead of landing page
- [x] **Duplicate booking prevention** - Backend now checks for duplicate submissions within 1 hour

### January 12, 2026 - Session 1

#### P0 Bug Fix: Support Queries
- [x] Fixed "Support queries not appearing in admin panel"
- [x] Added `GET /api/support/queries` endpoint
- [x] Admin Support Center now fetches from 3 sources

#### P1 Feature: Assign Lead in CRMs
- [x] Added to Student CRM, School CRM, and Growth Partners CRM
- [x] Shows "Assigned to: [Name]" on lead cards

#### P1 Feature: Comment/Note in School CRM
- [x] Added Comment modal with history

### Previous Sessions
- Internal Lead/Query System (`/add` page)
- Admin User Management (`/admin/users`)
- Unified Support Center
- Student Funnel refinements (conditional city selection)
- Multiple bug fixes

---

## Technical Architecture

```
/app/
├── backend/
│   └── server.py          # Duplicate booking prevention, support queries
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx           # Logo redirect for logged-in users
│   │   ├── context/
│   │   │   └── UserAuthContext.jsx  # user_type always set on login
│   │   └── pages/
│   │       ├── MyBookingsPage.jsx   # Other Courses section
│   │       ├── StudentFunnel.jsx    # Streamlined flow for logged-in users
│   │       └── admin/
│   │           ├── AdminStudentCRM.jsx
│   │           ├── AdminSchoolCRM.jsx
│   │           ├── AdminGrowthPartners.jsx
│   │           └── AdminSupportUnified.jsx
```

## Key Flow Changes

### Booking Flow for Logged-in Users
```
NEW FLOW (5 steps):
Skill (pre-selected) → Age → Mode → [City if offline] → Schedule → ✓ Done

OLD FLOW (7-8 steps):
Skill → Action → Age → Mode → [City if offline] → Schedule → Contact → OTP → ✓ Done
```

### From Course Page
```
/courses/robotics → Click "Book Demo" → /student?skill=robotics → Start at Age step
```

---

## Pending Tasks

### P1 - High Priority
- [ ] Connect "About Us" page forms to CRMs
- [ ] Make Educator application form dynamic

### P2 - Medium Priority
- [ ] CSV Export for all CRMs
- [ ] Content Management (Blog, FAQ admin UI)
- [ ] Real Calendly Integration
- [ ] Real WhatsApp OTP (Twilio)

### P3 - Future
- [ ] Email/WhatsApp notifications
- [ ] Lead Scoring system
- [ ] Refactor server.py monolith

---

## Credentials

**Admin:** admin@oll.co / Dagaji03@
**Test OTP:** 1111 (MOCKED)

## MOCKED Features
- OTP sending via WhatsApp - hardcoded to 1111
- Calendar integration for booking demos
