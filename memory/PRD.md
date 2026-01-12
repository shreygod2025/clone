# OLL Skill Education Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

---

## What's Been Implemented

### January 12, 2026 (Latest Session)

#### P0 Bug Fix: Support Queries from Student Funnel
- [x] Fixed bug where queries from "I have a query / need support" in Student Funnel were not appearing in admin panel
- [x] Added `GET /api/support/queries` endpoint to fetch from `support_queries` collection
- [x] Added `PATCH /api/support/queries/{id}` endpoint to update query status
- [x] Updated `AdminSupportUnified.jsx` to fetch from 3 sources:
  - Team Inquiries (`/api/inquiry/queries`)
  - User Support (`/api/support/queries`) - **NEW**
  - Legacy Tickets (`/api/support/tickets`)
- [x] Added "User Support" badge to distinguish SupportFlow queries in admin panel
- [x] Added "User Support" filter option in Support Center

#### P1 Feature: Assign Lead in CRMs
- [x] **Student CRM**: Added Assign button with modal to select team members
- [x] **School CRM**: Added Assign button with modal to select team members  
- [x] **Growth Partners CRM**: Added Assign button with modal to select team members
- [x] All CRMs display "Assigned to: [Team Member Name]" on lead cards
- [x] Unassign functionality available for all CRMs
- [x] Backend models updated with `assigned_to` field in Update schemas

#### P1 Feature: Comment/Note Functionality in School CRM
- [x] Added Comment/Note modal to School CRM (was missing before)
- [x] School CRM now has full comment history like Student CRM
- [x] Previous comments displayed in modal before adding new comment

### Previous Sessions

#### Internal Lead/Query System
- [x] Created `/add` page for team members to create leads and queries
- [x] Implemented user-specific URLs (`/add/{username}`) that pre-fill "added by" field
- [x] Leads route to appropriate CRM based on type

#### Admin User Management
- [x] Built `/admin/users` page to create and manage team members with login credentials
- [x] Each user gets a unique add link: `/add/{username}`
- [x] CRM permissions per user

#### CRM Expansion & Enhancement
- [x] Student CRM with comment history
- [x] School CRM with comment history
- [x] Educators CRM
- [x] Growth Partners CRM
- [x] Team Users management

#### Unified Support Center
- [x] Merged legacy support tickets and new queries into single `/admin/support` view
- [x] Implemented "New," "Overdue" (unresolved for >24h), and "Closed" tabs
- [x] Now fetches from 3 data sources

#### Student Funnel Refinements
- [x] Replaced "Book Demo/See Course" modal with dedicated step
- [x] Implemented conditional "City" selection (only for Offline mode)

---

## Technical Architecture

```
/app/
├── backend/
│   └── server.py          # Team user mgmt, CRM filtering, support queries
├── frontend/
│   ├── src/
│   │   └── pages/
│   │       ├── SupportFlow.jsx          # User-facing support (submits to /api/support/query)
│   │       ├── InquiryPage.jsx          # /add and /add/:username
│   │       └── admin/
│   │           ├── AdminSupportUnified.jsx  # Fetches from 3 sources
│   │           ├── AdminStudentCRM.jsx      # Has Assign + Comment
│   │           ├── AdminSchoolCRM.jsx       # Has Assign + Comment (NEW)
│   │           ├── AdminGrowthPartners.jsx  # Has Assign + Comment
│   │           └── AdminUsers.jsx           # Team user management
```

## Key API Endpoints

### Support System (Updated)
- `POST /api/support/query` - Create support query from SupportFlow
- `GET /api/support/queries` - **NEW** Get all support queries
- `PATCH /api/support/queries/{id}` - **NEW** Update support query status
- `GET /api/inquiry/queries` - Get team inquiry queries
- `GET /api/support/tickets` - Get legacy support tickets

### CRM Endpoints (Updated with assigned_to)
- `PATCH /api/students/inquiry/{id}` - Update including `assigned_to`
- `PATCH /api/schools/inquiry/{id}` - Update including `assigned_to`
- `PATCH /api/growth-partners/{id}` - Update including `assigned_to`

### Comments Endpoints
- `POST /api/students/comment/{id}` - Add comment to student inquiry
- `POST /api/schools/comment/{id}` - Add comment to school inquiry
- `POST /api/growth_partners/comment/{id}` - Add comment to growth partner

### Team Users
- `GET /api/team-users` - Get all team users
- `POST /api/team-users` - Create team user
- `GET /api/team-users/by-username/{username}` - Get user by username

## Database Collections

- **support_queries** - Queries from SupportFlow.jsx (Student Funnel support)
- **inquiry_queries** - Team inquiry queries from /add form
- **support_tickets** - Legacy support tickets
- **student_inquiries** - Student leads (has `assigned_to`, `comments`)
- **school_inquiries** - School leads (has `assigned_to`, `comments`)
- **growth_partners** - Growth partner leads (has `assigned_to`, `comments`)
- **team_users** - Team member accounts

---

## Pending Tasks

### P1 - High Priority
- [ ] Connect "About Us" page forms to CRMs (Team and Growth Partner application forms)
- [ ] Make Educator application form dynamic (fields from admin config)

### P2 - Medium Priority
- [ ] CSV Export for all CRMs
- [ ] Content Management (Blog, FAQ admin UI)
- [ ] Real Calendar Integration (Calendly)
- [ ] Real WhatsApp OTP (Twilio)
- [ ] Add Comment History to Educators CRM

### P3 - Future
- [ ] Email/WhatsApp notifications for form submissions
- [ ] Lead Scoring system
- [ ] Refactor server.py into modular structure (`/routers`, `/models`)

---

## Credentials

**Admin:** admin@oll.co / Dagaji03@

**Test Team User:** john@oll.co / test123 (username: john-doe)
- Add form: /add/john-doe

**Test OTP:** 1111 (MOCKED)

## MOCKED Features
- OTP sending via WhatsApp - hardcoded to 1111
- Calendar integration for booking demos - mocked
