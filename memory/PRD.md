# OLL - Skill Education Platform PRD

## Latest Changes (Jan 2026)

### Users & Roles System (RBAC) - Completed ✅
**Admin Panel:** `/admin/users`

**Roles Management:**
- Create custom roles with name, description, and permissions
- System roles (Center Partner, Growth Partner) cannot be deleted
- Default roles created on first load
- Edit role permissions
- Delete non-system roles (only if no users assigned)

**Available Permissions:**
- `dashboard` - View admin dashboard and analytics
- `students` - Student CRM management
- `schools` - School CRM management
- `educators` - Educator management
- `growth_partners` - Growth partner applications
- `team_applications` - Team applications management
- `support` - Support center
- `settings` - Cities, centers, blogs management
- `requirements` - Educator requirements
- `users` - Users & Roles management

**Team Users Management:**
- Create team users with name, email, username, password
- Assign roles to users via dropdown
- Users inherit permissions from assigned role
- Toggle user active/inactive status
- Edit user details and role assignment
- Delete users

**API Endpoints:**
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create new role
- `PATCH /api/roles/{role_id}` - Update role
- `DELETE /api/roles/{role_id}` - Delete role (non-system only)
- `GET /api/team-users` - List all team users
- `POST /api/team-users` - Create team user with role_id
- `PATCH /api/team-users/{user_id}` - Update user
- `DELETE /api/team-users/{user_id}` - Delete user

### Join Team Page (/join-team) - Completed ✅
- Resume/CV upload - Supports PDF and Word documents (Max 5MB)
- Role changed from dropdown to text input field
- Requirements section shows current openings from admin
- Scroll to top fixed on page load

### Admin Panel Reorganization ✅

**Navigation Changes:**
- Renamed "Team Users" → **"Users & Roles"**
- **Removed FAQs** from navigation
- Created new **"Settings"** page combining:
  - Cities
  - Centers
  - Blogs (with SEO fields)

**Settings Page Features:**
- Tabbed interface for Cities, Centers, Blogs
- Add/Edit/Delete for all items
- Search functionality
- Blog SEO settings: meta_title, meta_description, keywords
- Publish/Unpublish toggle for blogs

### Growth Partner Page (/growth-partner) - Fixed ✅
- Scroll to top on page load

### Backend Updates ✅
- **File upload endpoint**: `POST /api/upload`
  - Supports PDF, DOC, DOCX, PNG, JPG
  - Max file size: 5MB
  - Returns URL for uploaded files
- Static file serving for uploads

---

## Completed Features

| Feature | Status | Notes |
|---------|--------|-------|
| Users & Roles System (RBAC) | ✅ | Full CRUD for roles and users with permission assignment |
| Join Team Page | ✅ | Resume upload, text role input |
| Scroll to Top Fix | ✅ | JoinTeamPage, GrowthPartnerPage |
| Admin Settings Page | ✅ | Cities, Centers, Blogs combined |
| FAQs Removed | ✅ | Removed from admin nav |
| File Upload API | ✅ | /api/upload endpoint |
| Blog SEO Fields | ✅ | meta_title, meta_description, keywords |
| WhatsApp Integration | ✅ | AiSensy for OTP and demo notifications |
| Educator Availability Toggle | ✅ | Available/Unavailable status |
| Session Persistence | ✅ | Fixed for students and educators |
| About Page Overhaul | ✅ | Founder story, embedded videos |

---

## Pending/Upcoming Tasks

### P1 - High Priority
- **Make Blogs Dynamic:** Full CRUD from admin with SEO support (partial - backend exists, needs frontend completion)
- **Migrate Existing Users to RBAC:** Move "Center Users" and "Growth Partners" into unified Users & Roles system

### P2 - Medium Priority
- **Educator Demo Management:**
  - Post-demo feedback form for educators
  - Categorize educator queries (Demo related, Payment related, etc.)

### P3 - Lower Priority
- CSV Export for all CRM pages
- Real Calendar Integration (Calendly)
- Lead scoring system

### Future/Backlog
- Full School Funnel implementation
- SEO Course Funnels
- Advanced analytics dashboard

---

## Test Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Test OTP:** 1111 (works for all phones)

## Key URLs
- Join Team: /join-team
- Growth Partner: /growth-partner
- Admin Settings: /admin/settings
- Admin Users & Roles: /admin/users

## Third-Party Integrations
- **AiSensy:** LIVE for WhatsApp OTPs and notifications
- **Jitsi Meet:** LIVE for video demos (meet.jit.si)
- **PostHog:** Analytics integration

## Known Limitations
- Jitsi moderator control limited (first joiner becomes moderator)
- Calendar integration is basic (date/time fields only, no Calendly yet)
