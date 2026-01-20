# OLL - Skill Education Platform PRD

## Latest Changes (Jan 2026)

### Email Notifications for Educators - Completed ✅
**Integration:** Resend API (Free tier: 100 emails/day)

**Email Types:**
1. **Application Received** - Confirmation when educator submits application
2. **Demo Scheduled** - Details when demo date/time is set
3. **Demo Reminder** - Reminder before scheduled demo
4. **Demo Completed** - Thank you after demo session
5. **Onboarded** - Congratulations when selected
6. **Rejected** - Polite rejection notification

**Automatic Triggers:**
- Application submission → Application Received email
- Status change to `demo_scheduled` → Demo Scheduled email
- Status change to `demo_completed` → Demo Completed email
- Status change to `onboarded` → Onboarded email
- Status change to `archived/rejected` → Rejected email

**Manual Triggers:**
- Admin can send any email type from Educator detail modal
- API: `POST /api/educators/{id}/send-email/{email_type}`
- API: `POST /api/educators/{id}/send-reminder`

**Setup Required:**
- Verify domain `oll.co` on https://resend.com/domains for production
- Update `SENDER_EMAIL` in backend/.env to `info@oll.co` after verification

### Users & Roles System (RBAC) - Completed ✅
**Admin Panel:** `/admin/users`

**Roles Management:**
- Create custom roles with name, description, and permissions
- System roles (Center Partner, Growth Partner) cannot be deleted
- Edit role permissions
- Delete non-system roles (only if no users assigned)

**Available Permissions:**
- `dashboard`, `students`, `schools`, `educators`, `growth_partners`
- `team_applications`, `support`, `settings`, `requirements`, `users`

**Team Users Management:**
- Create team users with role assignment
- Toggle user active/inactive status
- Edit user details and role assignment

### Join Team Page (/join-team) - Completed ✅
- Resume/CV upload (PDF, Word - Max 5MB)
- Dynamic requirements section from admin
- Scroll to top fixed

### Admin Panel Reorganization ✅
- "Settings" page: Cities, Centers, Blogs (with SEO)
- "Users & Roles" page: Users and Roles management
- Removed FAQs from navigation

---

## Completed Features

| Feature | Status | Notes |
|---------|--------|-------|
| Email Notifications (Educators) | ✅ | 6 email types via Resend |
| Users & Roles System (RBAC) | ✅ | Full CRUD with permissions |
| Join Team Page | ✅ | Resume upload, requirements |
| WhatsApp Integration | ✅ | AiSensy for OTP and notifications |
| Educator Availability Toggle | ✅ | Available/Unavailable status |
| Session Persistence | ✅ | Fixed for students/educators |
| About Page | ✅ | Founder story, embedded videos |

---

## Pending Tasks

### P1 - High Priority
- **Verify oll.co domain on Resend** (required for production emails)
- **Make Blogs Dynamic** - Full CRUD from admin with SEO

### P2 - Medium Priority
- Migrate Center Users to unified RBAC system
- Educator post-demo feedback form
- Categorize educator queries

### P3 - Lower Priority
- CSV Export for CRM pages
- Real Calendar Integration (Calendly)
- Lead scoring system

---

## API Endpoints (Email)
- `POST /api/educators/{id}/send-email/{type}` - Send specific email
- `POST /api/educators/{id}/send-reminder` - Send demo reminder

## Test Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Test OTP:** 1111

## Third-Party Integrations
- **Resend:** Email notifications (requires domain verification)
- **AiSensy:** WhatsApp OTPs and notifications
- **Jitsi Meet:** Video demos

## Environment Variables
```
RESEND_API_KEY=re_F3YtumJc_...
SENDER_EMAIL=OLL Team <onboarding@resend.dev>
```
Note: Change SENDER_EMAIL to `info@oll.co` after domain verification
