# OLL - Skill Education Platform PRD

## Latest Changes (Jan 2026)

### Educator Onboarding System - Complete ✅
**URL:** `/educator-onboarding`

**8-Step Onboarding Flow:**
1. **Welcome** - Introduction video, overview of what's next
2. **Profile** - Profile photo upload, bio (min 50 chars, visible to students)
3. **Personal Details** - T-shirt size (XS-XXL), delivery address, emergency contact, Aadhar/PAN upload
4. **Bank Details** - Bank name, account holder, account number, IFSC, cancelled cheque upload
5. **Contract** - Digital signature, accept terms checkbox
6. **Training** - 3 training videos + 5-question quiz (70% pass to continue)
7. **Curriculum** - 2 curriculum videos + 3-question assessment (70% pass)
8. **Complete** - Download ID Card and Certificate

**Features:**
- Progress bar shows completion percentage
- Step-by-step sidebar navigation
- Completed steps show green checkmarks
- File upload for documents (Aadhar, PAN, bank documents, profile photo)
- Quiz/Assessment retry on failure
- Automatic redirect from dashboard to onboarding for incomplete onboarding

**Admin Features:**
- **Direct Onboard** - Add educator directly to onboarding (skips selection process)
- **Onboarding Progress** - View all educators' progress with percentage bars

**API Endpoints:**
- `GET /api/educator/onboarding/content` - Get videos, quiz, contract text
- `GET /api/educator/onboarding/{id}` - Get progress
- `PATCH /api/educator/onboarding/{id}` - Update progress
- `POST /api/educator/onboarding/{id}/complete-step` - Mark step done
- `POST /api/educator/onboarding/{id}/submit-quiz` - Submit training quiz
- `POST /api/educator/onboarding/{id}/submit-assessment` - Submit curriculum assessment
- `POST /api/admin/educators/direct-onboard` - Add educator directly
- `GET /api/admin/educators/onboarding-progress` - View all progress

**⚠️ MOCKED:** Videos are placeholder YouTube embeds. Replace with actual OLL training content.

---

### Email Notifications for Educators - Complete ✅
**Integration:** Resend API (Free tier: 100 emails/day)

**6 Email Types:**
- Application Received, Demo Scheduled, Demo Reminder
- Demo Completed, Onboarded, Rejected

**⚠️ Action Required:** Verify domain `oll.co` on https://resend.com/domains

---

### Users & Roles System (RBAC) - Complete ✅
**Admin Panel:** `/admin/users`

**Features:**
- Create custom roles with permissions
- Assign roles to team users
- System roles cannot be deleted

---

## Completed Features

| Feature | Status | Notes |
|---------|--------|-------|
| Educator Onboarding (8 steps) | ✅ | Videos MOCKED |
| Email Notifications | ✅ | Domain verification needed |
| Users & Roles (RBAC) | ✅ | Full CRUD |
| WhatsApp Integration | ✅ | AiSensy |
| Session Persistence | ✅ | Fixed |

---

## Pending Tasks

### P1 - High Priority
- Replace placeholder videos with actual OLL content
- Verify oll.co domain on Resend

### P2 - Medium Priority  
- Make Blogs Dynamic (full CRUD)
- Migrate Center Users to RBAC

### P3 - Lower Priority
- CSV Export for CRM
- Calendar Integration (Calendly)

---

## Test Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Onboarded Educator:** 7777777777 (OTP: 1111)
- **Test OTP:** 1111 for all phones

## Key URLs
- Educator Onboarding: /educator-onboarding
- Admin Educators: /admin/educators (Direct Onboard + Progress buttons)
- Admin Users: /admin/users

## Third-Party Integrations
- **Resend:** Email notifications
- **AiSensy:** WhatsApp notifications
- **Jitsi Meet:** Video demos
