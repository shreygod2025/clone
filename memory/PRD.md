# OLL - Omni Learning Labs Platform

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Core Architecture
- **Frontend**: React with Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI with MongoDB
- **Integrations**: AiSensy (WhatsApp), Jitsi (Video), PostHog (Analytics), Resend (Email), Emergent LLM (AI)

## What's Been Implemented

### Jan 26, 2026 Session
**School CRM Enhancements:**
- ✅ Sub-dashboard with tabs: Dashboard, Leads & Schools, Contact Management
- ✅ Dashboard shows: This week's meetings, followup schedule, quick stats
- ✅ Contact Management tab with all school contacts, edit capability
- ✅ Add Followup Meeting button (+) on school cards for meeting_done, converted, active, renewed statuses
- ✅ AI-generated followup email with checkbox in followup modal
- ✅ Scheduled emails stored in database with 9AM send time

**Inquiry Page (/add) Enhancements:**
- ✅ Multi-select skills for students
- ✅ Offerings selection for schools (appears when programs selected)
- ✅ Better program-to-offering matching (Robotics → Lab Setup, STEM Curriculum)
- ✅ Send personalized email checkbox with offerings details

**Phone Input Integration:**
- ✅ Country code selector on Login, Student Funnel, Educator Funnel, School Funnel
- ✅ Country code on Admin Student CRM, Admin School CRM add lead modals
- ✅ Country code on Inquiry Page (/add)

### Previous Sessions
- Multi-funnel structure (Student, Educator, School)
- Admin Panel with CRM for students and schools
- SEO implementation with react-helmet-async
- OTP-based authentication
- Bulk school import (CSV/Excel)
- Student/Educator dashboards with session visibility
- Dynamic blog management

## Key API Endpoints
- `POST /api/schools/send-personalized-email` - Send welcome email with offerings
- `POST /api/schools/schedule-followup-email` - Schedule AI-generated followup
- `GET /api/schools/{id}/scheduled-emails` - Get scheduled emails for school
- `GET /api/school-offerings` - Get all school offerings
- `PATCH /api/schools/inquiry/{id}` - Update school with followup_auto_email field

## Database Collections
- `school_inquiries` - School leads and active schools
- `student_inquiries` - Student leads
- `educators` - Educator applications
- `scheduled_emails` - AI-generated followup emails queue
- `offerings` / `school-offerings` - Products and services

## Credentials
- Admin: admin@oll.co / Dagaji03@
- Test OTP: 1111

## P0/P1/P2 Priorities

### Completed This Session
- ✅ P0: School Funnel phone country code (was already in place)
- ✅ P1: Multi-meeting support (Add Followup Meeting)
- ✅ P1: Contact Management tab
- ✅ P1: Sub-dashboard for School CRM
- ✅ P1: Multi-select skills/offerings on /add
- ✅ P1: Auto email with AI followup

### Remaining Backlog
- P1: PDF generation for Proposal and MOU documents
- P2: Draft notifications for incomplete school onboarding
- P2: Process scheduled emails at 9AM (cron job or background task)
- P2: CSV Export for CRM pages
- P3: Real calendar integration (Calendly)
- P3: Lead scoring system
- P3: Automated SMS/Email reminders

## Tech Notes
- Emergent LLM Key used for AI email generation (gemini-3-flash)
- Resend requires domain verification for production emails
- School offerings use `title` field (not `name`)
