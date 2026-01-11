# OLL Skill Education Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Core Requirements
- **Global Structure:** Landing Page (user selector), Student/Parent Funnel, Educator Funnel, School Funnel, SEO Course Funnels, About OLL page, Blog, and an Admin Panel.
- **Design:** Minimal, clean, fast, glassy design. Red for CTA buttons, blue for trust-building elements.
- **Authentication:** Phone/OTP-based login for students (WhatsApp integration pending - MOCKED with OTP 1111)

---

## What's Been Implemented

### January 2026 Updates (Latest Session)

#### Inquiry System Improvements
- [x] Added **Source field** to inquiry form (Walk-in, Phone Call, WhatsApp, Referral, Website, Social Media, Event, About Page, Other)
- [x] Source selection is now Step 3 when adding a Lead
- [x] Leads now properly route to respective CRMs:
  - Student leads → Student CRM
  - School leads → School CRM  
  - Teacher leads → Educators CRM
  - Growth Partner/Team leads → Growth Partners CRM

#### New Growth Partners CRM (`/admin/growth-partners`)
- [x] Full CRM with status tracking: New → Contacted → In Discussion → Converted → Archived
- [x] Add Partner form with Interest Type, City, Source, Details
- [x] Comment history feature
- [x] Connected to inquiry form (Growth Partner + Team types)

#### Unified Support Center (`/admin/support`)
- [x] Merged legacy support tickets and inquiry queries into one page
- [x] Source filter: All Sources / Team Inquiries / User Tickets
- [x] Query type filter (Demo, Payment, Technical, etc.)
- [x] Status filter with stats cards
- [x] Reply functionality

#### Comment History Feature (All CRMs)
- [x] Student CRM: "Add Note" button on each lead
- [x] School CRM: "Add Note" button (to be added)
- [x] Educator CRM: "Add Note" button (to be added)
- [x] Growth Partners CRM: Full comment history
- [x] Comments stored with author name and timestamp

#### Student Funnel Improvements (from previous session)
- [x] Removed popup modal for skill action - now a regular step
- [x] City selection only appears for OFFLINE mode
- [x] Online mode skips city and goes to Schedule Demo

### December 2025 Updates

#### UI/UX Improvements
- [x] Login button changed to dark blue (#1E3A5F)
- [x] Blog and FAQ moved to footer only
- [x] Student funnel: Removed "For My Child/For Myself" - only Age Group selection
- [x] Student funnel: Removed Email input field
- [x] Auto-advance on single selection questions

#### Authentication System
- [x] Phone/OTP-based login system
- [x] OTP verification step in student funnel
- [x] My Bookings page with reschedule option
- [ ] WhatsApp OTP integration (MOCKED - uses 1111)

---

## Pending Tasks

### P0 - Critical
- [ ] Complete WhatsApp OTP integration (Twilio) when credentials provided
- [ ] Make Educator application form dynamic (fields from admin requirements)
- [ ] Add comment history to School CRM and Educator CRM (partially done)

### P1 - High Priority
- [x] School Funnel Post-Submission Page ✅
- [x] Growth Partners CRM ✅ 
- [x] Unified Support Center ✅
- [x] Source field in inquiry form ✅

### P2 - Medium Priority
- [ ] Content Management (Blog posts, FAQ, About Us)
- [ ] Real Calendar Integration (replace mocked Calendly)
- [ ] About Us page with Growth Partner form

### P3 - Low Priority / Future
- [ ] Email/WhatsApp notifications for form submissions
- [ ] CSV Export for leads
- [ ] Lead Scoring system

---

## Technical Architecture

```
/app/
├── backend/
│   └── server.py          # FastAPI with OTP auth, comments API, growth partners API
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── StudentFunnel.jsx       # Dynamic steps with conditional city
│   │   │   ├── SchoolFunnel.jsx        # 9-step funnel
│   │   │   ├── EducatorFunnel.jsx
│   │   │   ├── InquiryPage.jsx         # Team inquiry with source selection
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminStudentCRM.jsx    # With comment history
│   │   │       ├── AdminSchoolCRM.jsx
│   │   │       ├── AdminEducators.jsx
│   │   │       ├── AdminGrowthPartners.jsx # NEW: Growth Partners CRM
│   │   │       └── AdminSupportUnified.jsx # NEW: Merged support center
└── memory/
    └── PRD.md
```

## Key API Endpoints

### Comments API (Universal)
- `POST /api/{collection}/comment/{item_id}` - Add comment to any CRM item
- `GET /api/{collection}/comments/{item_id}` - Get comments for item
- Collections: students, schools, educators, growth_partners

### Growth Partners API
- `POST /api/growth-partners` - Create partner
- `GET /api/growth-partners` - List partners
- `PATCH /api/growth-partners/{id}` - Update partner

### Inquiry API (Updated)
- `POST /api/inquiry/lead` - Add lead (routes to appropriate CRM based on type)
- `POST /api/inquiry/query` - Add query to support

## Database Collections

- `student_inquiries` - Student leads with comments[]
- `school_inquiries` - School leads with comments[]
- `educator_applications` - Educator applications with comments[]
- `growth_partners` - Growth partner leads with comments[]
- `inquiry_queries` - Support queries from team form

## Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Test OTP:** 1111

## MOCKED Integrations
- OTP sending via WhatsApp - hardcoded to 1111
- Calendar integration for booking demos
