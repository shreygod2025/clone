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

## What's Been Implemented

### Latest Updates (January 10, 2026)

**UI/UX Improvements:**
- ✅ Removed "Made with Emergent" badge from all pages
- ✅ Landing page cards now show arrow only (removed "Get Started" text)
- ✅ Progress bar hidden on mobile for Student/School funnels (shows "Step X of Y" text only)
- ✅ All funnel forms (Student, School, Educator) are fully responsive on mobile

**Admin Requirements Enhancement:**
- ✅ Added **Working Days** selection (Mon-Sun)
- ✅ Added **Timing From / To** fields
- ✅ Added **Pay** amount and **Pay Type** (per session / per month)
- ✅ Requirements now display days, timings, and pay information

**Educator Funnel Enhancement:**
- ✅ Two tabs: "General Application" and "Open Positions"
- ✅ Open Positions shows available requirements with days, timings, pay
- ✅ **Requirement-specific application form** - When clicking "Apply for This Position":
  - Shows position summary (skill, city, pay)
  - Asks for relevant experience in that specific skill
  - Asks why interested in this position
  - Shows available days to select from
  - Different from general application form

**CRM Improvements (Previous Session):**
- Student CRM: Status-based CTAs (New→Demo Completed/Reschedule/Archive, Demo Completed→Converted/Archive)
- School CRM: Similar workflow with Offline/Online meeting type
- Convert action asks for amount and sessions

**About Page (Previous Session):**
- Timeline with Shark Tank India (Feb 1, 2023) and KBC (Mar 4, 2025)
- Our Team, Board of Advisors, Our Investors sections

### Technical Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT with bcrypt password hashing
- **Design**: Glassmorphism with OLL brand colors (Red #D63031, Navy #1E3A5F)

## Admin Credentials
- **Email**: admin@oll.co
- **Password**: Dagaji03@
- **Login URL**: /admin/login

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Educator CRM in Admin Panel (view applications with requirement_id tracking)
- [ ] Email notifications integration
- [ ] WhatsApp automation for confirmations
- [ ] Real calendar integration (replace MOCKED demo booking)

### P1 - High Priority
- [ ] SEO course funnel pages
- [ ] City-based school landing pages
- [ ] Content Management in admin
- [ ] Export leads to CSV

### P2 - Medium Priority
- [ ] Analytics dashboard
- [ ] Role-based access control
- [ ] Bulk status updates

## MOCKED Features
- **Calendar/Demo Booking**: Shows confirmation message only, no real calendar integration

## Key Database Schema Updates

**OpenRequirement** (new fields):
```python
days: List[str] = []           # ['Monday', 'Wednesday', 'Friday']
timing_from: str = ""          # '10:00'
timing_to: str = ""            # '17:00'
pay_per_session: str = ""      # '500'
pay_type: str = "per_session"  # 'per_session' or 'per_month'
```

**EducatorApplication** (new fields):
```python
requirement_id: Optional[str] = None      # Links to specific requirement
requirement_title: Optional[str] = None   # For display
```

## File Structure
```
/app/
├── backend/
│   ├── server.py      # Updated with new requirement fields
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminRequirements.jsx  # Days, timings, pay fields
│   │   │   │   ├── AdminStudentCRM.jsx    # Status-based workflow
│   │   │   │   └── AdminSchoolCRM.jsx     # Meeting type, workflow
│   │   │   ├── StudentFunnel.jsx   # Mobile responsive, hidden progress bar
│   │   │   ├── SchoolFunnel.jsx    # Mobile responsive, hidden progress bar
│   │   │   ├── EducatorFunnel.jsx  # Requirement-specific applications
│   │   │   ├── AboutPage.jsx       # Timeline with Shark Tank/KBC
│   │   │   └── LandingPage.jsx     # Arrow only cards
│   │   └── ...
│   └── public/
│       └── index.html  # Removed Made with Emergent badge
└── memory/
    └── PRD.md
```

## Last Update
- **Date**: January 10, 2026
- **Changes**: 
  1. Removed Made with Emergent badge
  2. Progress bar hidden on mobile for funnels
  3. Landing page cards show arrow only
  4. Admin Requirements: Added days, timings, pay fields
  5. Educator funnel: Requirement-specific application form
- **Testing**: Verified via screenshots
