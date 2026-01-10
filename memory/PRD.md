# OLL Skill Education Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Core Requirements
- **Global Structure:** Landing Page (user selector), Student/Parent Funnel, Educator Funnel, School Funnel, SEO Course Funnels, About OLL page, Blog, and an Admin Panel.
- **Design:** Minimal, clean, fast, glassy design. Red for CTA buttons, blue for trust-building elements. Dark blue (#1E3A5F) for Login button.
- **Authentication:** Phone/OTP-based login for students (WhatsApp integration pending - MOCKED with OTP 1111)

---

## What's Been Implemented

### December 2025 Updates

#### UI/UX Improvements (Latest Session)
- [x] Login button changed to dark blue (#1E3A5F)
- [x] Blog and FAQ moved to footer only (removed from navbar)
- [x] Student funnel: Removed "For My Child/For Myself" - only Age Group selection
- [x] Student funnel: Removed Email input field (auto-generated from phone)
- [x] Student funnel: Reordered steps - Skill first, then Age
- [x] Student funnel: Auto-advance on single selection questions
- [x] School funnel: Auto-advance on single selection questions
- [x] "Link to Join Demo" support option with login prompt
- [x] Logged-in students redirected to My Bookings page

#### Authentication System
- [x] Phone/OTP-based login system (backend endpoints)
- [x] OTP verification step in student funnel
- [x] My Bookings page with reschedule option
- [x] User auth context for session management
- [ ] WhatsApp OTP integration (MOCKED - uses 1111)

#### Student Funnel (7 Steps)
1. Choose a Skill (auto-advances)
2. Select Age Group (auto-advances)
3. Select City (auto-advances)
4. Learning Mode (Online auto-advances, Offline shows sub-options)
5. Select Center (if offline at center, auto-advances)
6. Schedule Demo (date + time)
7. Contact Details (name + phone only)
8. OTP Verification → Success

#### School Funnel (9 Steps with Auto-Advance)
1. Board (auto-advances)
2. Location (auto-advances)
3. School Size (auto-advances)
4. Fee Range (auto-advances)
5. Programs Interested (multi-select, manual Next)
6. Support Needed (multi-select, manual Next)
7. Meeting Date (auto-advances)
8. Meeting Time (auto-advances)
9. Contact Details

#### Support Flow
- [x] Demo Related queries
- [x] Link to Join Demo (requires login)
- [x] Ongoing Classes support
- [x] Ongoing School Course support
- [x] Other Query

#### SEO & Content
- [x] Dynamic course landing pages (/courses/:slug)
- [x] Course listing page (/courses)
- [x] SEO meta tags with react-helmet-async
- [x] Shared Navbar component across all pages

#### Admin Panel
- [x] Student CRM with detailed Add Lead form
- [x] School CRM with detailed Add Lead form
- [x] Educator applications management
- [x] Requirements management
- [x] Cities and Centers management

---

## Pending Tasks

### P0 - Critical
- [ ] Complete WhatsApp OTP integration (Twilio) when credentials provided

### P1 - High Priority
- [x] School Funnel Post-Submission Page (services showcase) ✅ DONE
- [x] Educator Funnel: Add "Other City" text input option ✅ DONE
- [x] Educator Funnel: Date/time selection for "Demo Class" ✅ DONE
- [ ] Admin: Support Queries View section

### P2 - Medium Priority
- [ ] Content Management (Blog posts, FAQ, About Us)
- [ ] Real Calendar Integration (replace mocked Calendly)

### P3 - Low Priority / Future
- [ ] Email/WhatsApp notifications for form submissions
- [ ] CSV Export for leads
- [ ] Lead Scoring system

---

## Technical Architecture

```
/app/
├── backend/
│   └── server.py      # FastAPI monolith with OTP auth routes
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Shared navigation (dark blue login)
│   │   │   └── ui/                  # Shadcn components
│   │   ├── context/
│   │   │   └── UserAuthContext.jsx  # Phone/OTP login context
│   │   └── pages/
│   │       ├── StudentFunnel.jsx    # 7-step funnel with auto-advance
│   │       ├── SchoolFunnel.jsx     # 9-step funnel with auto-advance
│   │       ├── EducatorFunnel.jsx
│   │       ├── SupportFlow.jsx      # With "Link to Join Demo" option
│   │       ├── LoginPage.jsx
│   │       ├── MyBookingsPage.jsx
│   │       └── admin/
└── memory/
    └── PRD.md
```

## Key API Endpoints
- `POST /api/auth/send-otp` - Send OTP (mocked, returns 1111)
- `POST /api/auth/verify-otp` - Verify OTP
- `GET /api/user/bookings/{phone}` - Get user bookings
- `POST /api/user/reschedule` - Reschedule booking
- `POST /api/students/inquiry` - Submit student inquiry
- `POST /api/schools/inquiry` - Submit school inquiry

## Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Test OTP:** 1111

## MOCKED Integrations
- OTP sending via WhatsApp - hardcoded to 1111
- Calendar integration for booking demos
