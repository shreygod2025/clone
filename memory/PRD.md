# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for OLL that:
- Clearly separates Students/Parents, Educators, and Schools
- Uses funnel-based flows, not generic pages
- Is SEO-first, scalable, and backend-driven
- Has a powerful admin + CRM system

## User Personas
1. **Students/Parents** - Seeking skill education (Robotics, Coding, AI, etc.)
2. **Educators** - Looking to join OLL's teaching network
3. **Schools** - Wanting to partner with OLL for skill programs
4. **Admins** - Managing CRM, content, and operations

## Core Requirements (Static)
- Funnel-based user journeys with minimal friction
- Step-by-step inquiry forms (1 question per screen)
- Calendly-style demo booking
- Smart FAQ system with support tickets
- Admin CRM for lead management
- Blog system for SEO
- Mobile-first, fast-loading design

## What's Been Implemented (January 2026)

### Phase 1 - MVP Complete ✅

**Landing Page**
- Clean 3-card design with gradient backgrounds (no stock images)
- Full viewport display - no scrolling needed
- Navigation with About, Blog, FAQ (Admin link removed from nav)
- Admin access at separate /admin route

**Student Funnel**
- 8-step wizard form (learner type → age → skill → mode → city → goal → contact → demo)
- Calendar-based demo booking (Calendly-style)
- Progress indicator
- FAQ modal with common questions

**Educator Funnel**
- Application form with skills, experience, grades, availability
- Open requirements listing from backend
- Demo-ready toggle

**School Funnel**
- B2B inquiry form
- Programs interested checkboxes
- Support needed options
- Credibility section post-submission

**FAQ Page**
- Searchable FAQs
- Category filters (Courses, Fees, Demos, Online vs Offline)
- Support ticket creation

**About Page**
- Mission & Vision sections
- What We Do showcase
- Media features (Shark Tank, KBC)
- Gallery section
- Latest updates

**Blog System**
- Blog listing with categories
- Individual blog detail pages
- CTA integration

**Admin Panel**
- JWT authentication (login/register)
- Dashboard with 8 stat cards
- Student CRM (view, edit status, add notes, schedule demos)
- School CRM (view, edit status, schedule meetings)
- Educator Management (review applications, update status)
- Blog Management (CRUD)
- FAQ Management (CRUD)
- Open Requirements Management (CRUD)
- Support Ticket Management

### Technical Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT with bcrypt password hashing
- **Design**: Glassmorphism with OLL brand colors (Red #D63031, Navy #1E3A5F)

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Email notifications integration (SendGrid/Resend)
- [ ] WhatsApp automation for confirmations
- [ ] Real Google Calendar integration for demo slots

### P1 - High Priority
- [ ] SEO course funnel pages (by user type, by course)
- [ ] City-based school landing pages
- [ ] About page content editing in admin
- [ ] Gallery management in admin
- [ ] Team members management

### P2 - Medium Priority
- [ ] Analytics dashboard with charts
- [ ] Export leads to CSV
- [ ] Bulk status updates
- [ ] Role-based access control (Admin, Sales, Ops, Content)
- [ ] Password reset flow

### P3 - Nice to Have
- [ ] Dark mode toggle
- [ ] Multi-language support
- [ ] Payment tracking integration
- [ ] Advanced reporting

## Next Tasks
1. Integrate email notifications for demo confirmations
2. Add real calendar booking integration
3. Build SEO landing pages for each course
4. Implement role-based admin access
