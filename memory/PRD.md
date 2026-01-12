# OLL Skill Education Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

---

## What's Been Implemented

### January 2026 (Latest Session)

#### Route Change
- [x] Changed `/inquiry` to `/add` for team lead/query form
- [x] Added personalized routes `/add/{username}` for each team user

#### Team User Management (`/admin/users`)
- [x] Admin can create team users with name, email, username, password
- [x] Each user gets a unique add link: `/add/{username}`
- [x] CRM permissions per user (Students, Schools, Educators, Growth Partners)
- [x] Toggle user active/inactive status
- [x] Copy link button for easy sharing

#### CRM Lead Assignment
- [x] All CRM models updated with `added_by` and `assigned_to` fields
- [x] Leads added via `/add/{username}` automatically tracked with `added_by`
- [x] Team members can only see:
  - Leads they added (`added_by` matches their user_id)
  - Leads assigned to them (`assigned_to` matches their user_id)
- [x] Admins see all leads

#### Support Center Tabs
- [x] **New Queries** - Open/In Progress queries not overdue
- [x] **Overdue** - Any query open >24 hours (highlighted in red)
- [x] **Closed** - Resolved/Closed queries
- [x] Overdue queries shown with red warning badge

### Previous Sessions

#### Inquiry System
- [x] Source field in inquiry form (Walk-in, Phone, WhatsApp, Referral, etc.)
- [x] Leads route to appropriate CRM based on type
- [x] Growth Partners CRM for franchise/partnership leads
- [x] Unified Support Center merging legacy + inquiry queries

#### Student Funnel
- [x] Skill selection → Action choice (See Details/Book Demo) → Age → Mode
- [x] City selection only for OFFLINE mode
- [x] OTP verification (mocked with 1111)

#### Admin Panel
- [x] Student CRM with comment history
- [x] School CRM with comment history
- [x] Educators CRM
- [x] Growth Partners CRM
- [x] Team Users management
- [x] Support Center with New/Overdue/Closed tabs

---

## Technical Architecture

```
/app/
├── backend/
│   └── server.py          # Team user mgmt, CRM filtering, overdue tracking
├── frontend/
│   ├── src/
│   │   └── pages/
│   │       ├── InquiryPage.jsx         # /add and /add/:username
│   │       └── admin/
│   │           ├── AdminUsers.jsx       # Team user management
│   │           ├── AdminStudentCRM.jsx  # Filtered by added_by/assigned_to
│   │           ├── AdminSchoolCRM.jsx
│   │           ├── AdminEducators.jsx
│   │           ├── AdminGrowthPartners.jsx
│   │           └── AdminSupportUnified.jsx # New/Overdue/Closed tabs
```

## Key API Endpoints

### Team Users
- `POST /api/team-users` - Create team user (admin only)
- `GET /api/team-users` - List all team users
- `GET /api/team-users/by-username/{username}` - Get user by username (public)
- `PATCH /api/team-users/{id}` - Update user
- `DELETE /api/team-users/{id}` - Delete user
- `POST /api/team-users/login` - Team user login

### CRM (Updated with filtering)
- `GET /api/students/inquiries` - Returns filtered leads for team members
- `GET /api/schools/inquiries` - Returns filtered leads for team members
- `GET /api/educators/applications` - Returns filtered leads for team members
- `GET /api/growth-partners` - Returns filtered leads for team members

## Database Collections

### New
- `team_users` - Team user accounts with permissions

### Updated Fields
All CRM collections now have:
- `added_by` - user_id who added this lead
- `assigned_to` - user_id assigned to handle this lead
- `comments` - array of comment objects with author and timestamp

---

## Pending Tasks

### P0 - Critical
- [ ] Complete WhatsApp OTP integration when credentials provided
- [ ] Make Educator application form dynamic

### P1 - High Priority
- [ ] Admin: Assign leads to team members functionality
- [ ] About Us page with Growth Partner form

### P2 - Medium Priority
- [ ] Team member dashboard (view their own leads only)
- [ ] Content Management (Blog, FAQ)
- [ ] Real Calendar Integration

### P3 - Future
- [ ] CSV Export for leads
- [ ] Lead Scoring system
- [ ] Email/WhatsApp notifications

---

## Credentials

**Admin:** admin@oll.co / Dagaji03@

**Test Team User:** john@oll.co / test123 (username: john-doe)
- Add form: /add/john-doe

**Test OTP:** 1111 (mocked)

## MOCKED Features
- OTP sending via WhatsApp - hardcoded to 1111
- Calendar integration for booking demos
