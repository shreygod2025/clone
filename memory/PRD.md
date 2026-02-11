# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Core Features Implemented

### 1. User Funnels
- **Student/Learner Funnel**: Demo booking, skill selection, center-based learning
- **Educator Funnel**: Application, demo scheduling, onboarding
- **School Funnel**: B2B sales CRM, onboarding workflow, payment tracking
- **Growth Partner Funnel**: Multi-step onboarding with training modules

### 2. Admin Panel & CRM
- User & Role Management (RBAC)
- School CRM with full sales pipeline
- Educator Management
- Support Ticket System
- Orders & Payments Module
- Reports & Analytics

### 3. WhatsApp Notifications (AiSensy Integration)
**Templates Configured:**
- `otp` - OTP delivery (5 min expiration)
- `support_ticket_added` - New ticket notification to assignee
- `support_overdue_48hours` - 48h overdue warning to assignee
- `support_overdue_48hours_admin` - 48h overdue warning to admin
- `student_newlead_admin` - New student lead to B2C sales
- `gp_newlead_admin` - New GP lead to GP manager
- `school_meeting_reminder_24hours` - 24h meeting reminder
- `school_meeting_reminder_2hours` - 2h meeting reminder

### 4. File Storage
- Cloudinary integration for persistent file storage
- Migration tools for existing files
- Backward compatibility with old URLs

### 5. School Onboarding Workflow
10-step onboarding process with public tracking page:
1. MOU Signing
2. Payment Collection
3. Kit Delivery
4. Distribution Checking
5. Technical Check
6. Teacher Training
7. Calendar Making
8. Timetable Finalization
9. LMS Setup
10. School Confirmation

## Recent Updates (Feb 2025)

### WhatsApp Notifications Enhancement
- Added 7 new notification templates
- Created background job endpoints for automated notifications
- Updated OTP campaign to use "otp" template with 5-min expiration

### School CRM Improvements
- Same-day follow-ups/meetings now allowed
- User type selector (school/teacher/student) for queries
- "Added by" name displayed in activity history
- MOU document link fixed on public tracker
- Invoices added to public tracker documents

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB
- **File Storage**: Cloudinary
- **Notifications**: AiSensy (WhatsApp), Resend (Email)
- **Analytics**: PostHog
- **Video**: Jitsi Meet

## Background Jobs
Two cron job endpoints available:
```
POST /api/jobs/check-overdue-tickets?secret=<JOB_SECRET>
POST /api/jobs/send-meeting-reminders?secret=<JOB_SECRET>
```
Set `JOB_SECRET` environment variable and schedule hourly execution.

## Pending Tasks

### P1 - High Priority
- Full regression test for School CRM data consistency
- Generate Proposal & MOU PDFs feature
- CSV Export for CRM pages

### P2 - Medium Priority
- Refactor `server.py` into smaller route modules
- Refactor `AdminSchoolCRM.jsx` (7000+ lines)

### Future Backlog
- Background job for AI follow-up emails
- Table of Contents for rich text editor
- PO generation & vendor panel
- Calendar service integration (Calendly)
- Enforce RBAC on all backend endpoints
- Lead scoring system
- Automated SMS/Email reminders

## Credentials
- **Admin Login**: `/admin/login`
- **Admin Email**: `admin@oll.co`
- **Admin Password**: `Dagaji03@`
- **Test OTP**: `1111`
