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
- **School Expenses Module** (NEW)

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
3. Kit Delivery (with ProcureWay PO integration)
4. Distribution Checking
5. Technical Check
6. Teacher Training
7. Calendar Making
8. Timetable Finalization
9. LMS Setup
10. School Confirmation

### 6. ProcureWay PO Integration (NEW - Feb 13, 2025)
- **API Integration**: Connected to ProcureWay external API for PO data
- **Onboarding Sync**: Fetch delivery date, dispatch date, and tracking link from POs
- **Expense Auto-Sync**: Automatically create kit_cost and logistics_cost expenses from PO data
- **Smart Filtering**: Excludes delivered POs, shows only active orders
- **Public Tracking**: PO info (delivery date, dispatch date, tracking link) displayed on public school tracking page

**API Endpoints:**
- `GET /api/schools/{school_id}/po-data` - Fetch all PO data for a school
- `GET /api/schools/{school_id}/onboarding-po-info` - Get active PO info for onboarding
- `POST /api/schools/{school_id}/sync-po-expenses` - Auto-create expenses from PO data

**ProcureWay API Key:** `oll_ext_O5MVdAo6KnEslbB3jtWcDBn_fPu7DRY78vr-ZkHZ7Tg`

### 7. School Expenses Module (NEW - Feb 13, 2025)
- Full CRUD for school-wise expense tracking
- Categories: Kit Cost, Teacher Cost, Logistics Cost, Books Cost, GP Share, School Share, etc.
- School dropdown filter
- Date range filtering
- Summary with totals by category
- Auto-sync from ProcureWay POs

**API Endpoints:**
- `GET /api/school-expenses` - List all expenses with filters
- `POST /api/school-expenses` - Create new expense
- `PATCH /api/school-expenses/{id}` - Update expense
- `DELETE /api/school-expenses/{id}` - Delete expense
- `GET /api/school-expenses/summary` - Get expense summary

## Recent Updates (Feb 2025)

### Feb 13, 2025
- **ProcureWay PO Integration**: Added external API integration to fetch PO data for schools
- **Auto-Expense Creation**: Expenses automatically created from PO data (kit_cost, logistics_cost)
- **School Expenses Module**: New admin section for managing school-wise expenses
- **Address Field**: Added school address field to Convert, Renew, and Edit School modals
- **Onboarding UI Enhancement**: "Fetch from ProcureWay" and "Sync Expenses" buttons in Kit Delivery step
- **Public Tracker Update**: Shows PO delivery info on school tracking page

### Earlier Feb 2025
- WhatsApp Notifications Enhancement
- School CRM Improvements (same-day selection, skip renewal meeting)
- External API for schools
- Admin User phone numbers for WhatsApp

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB
- **File Storage**: Cloudinary
- **Notifications**: AiSensy (WhatsApp), Gmail SMTP (Email - pending GMAIL_APP_PASSWORD)
- **Analytics**: PostHog
- **Video**: Jitsi Meet
- **External APIs**: ProcureWay (PO Management)

### 8. API Key Management (NEW - Feb 13, 2026)
Admin Settings page now includes full API Key management:
- **List Keys**: View all API keys with masked display, creation date, last used time, and status
- **Generate Keys**: Create new API keys with custom names for external integrations
- **Revoke Keys**: Delete/deactivate API keys
- **Security**: Full key shown only once at generation time with copy-to-clipboard support

**API Endpoints:**
- `GET /api/admin/api-keys` - List all API keys
- `POST /api/admin/api-keys/generate` - Generate new API key
- `DELETE /api/admin/api-keys/{key_id}` - Revoke/delete an API key

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
- Refactor `AdminSchoolCRM.jsx` (8000+ lines)

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
