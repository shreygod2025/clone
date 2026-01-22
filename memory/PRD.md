# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 22, 2025

#### Educator Onboarding Flow Fixes ✅
- Fixed training step progression - educators no longer get stuck after quiz
- Added "Upload Video Assessment" button when quiz is passed but video upload is needed
- Implemented PDF generation for ID Card and Certificate using ReportLab with QR codes
- Added download buttons to educator dashboard for active educators

#### UI/UX Updates ✅

**1. Join Team Page Redesign**
- Added OLL logo header with redirect to home
- Two tabs like educator page: "General Application" and "Open Requirements"
- Fetches open positions from admin panel

**2. Growth Partner Page**
- Added OLL logo header with redirect to home

**3. About Us Page**
- Removed Investors section
- Updated Shreyaan's timeline (age 8 selling paintings, OLL founded April 4, 2020)
- Navbar shows "Join Team" and "Partner With Us" instead of Book Demo/Login
- Added "Schools We Work With" section with 12 partner schools
- Added "Our Events" section with Skill Titans and IIT Bombay Techfest

**4. School Landing Page (`/school-offerings`)**
- Complete redesign with expandable categories
- **Robotics** (12 offerings):
  - Robotics Curriculum with Take-home Kits & Books
  - Robotics Curriculum with Lab Setup & Books
  - Robotics Exhibition Preparation
  - Host a Robotics Exhibition in Your School
  - Participate in Robotics Competitions at IIT Bombay
  - Preparation for Robotics Competitions
  - Grade 9 & 10 ICSE Group 3 Subject Kits
  - Afterschool Robotics Classes
  - Robotics Summer Camp
  - Robotics & AI Seminar for Students
  - Robotics Books
  - Robotics Kits

- **Financial Literacy & Entrepreneurship** (5 offerings):
  - Entrepreneurship 3 Day Workshop
  - Skill Titans TV Show & Entrepreneurship Olympiad
  - Financial Literacy & Entrepreneurship Program as Part of Curriculum
  - E-Cell Opening in School
  - Financial Literacy & Entrepreneurship Summer Camp

- **AI & Machine Learning** (5 offerings):
  - Launch an AI Center for Excellence
  - Agentic AI Workshop for Students
  - AI Seminar
  - Agentic AI Summer Camp
  - Start AI Services Agency Course for College Students

- **Coding & Programming** (3 offerings):
  - Vibe Coding Seminar
  - Coding & Logic Building After School Classes
  - Coding Summer Camp

- Added "Schools We Work With" section
- Added "Our Events" section (Skill Titans, IIT Bombay Techfest)
- Each offering links to detailed page at `/school-offerings/:categoryId/:offeringId`

**5. Landing Page - School Card**
- Clicking "School" now shows dialog with "View Offerings" and "Book Meeting" options

**6. Courses Page**
- Removed age group badge display from course cards

**7. Student Demo Form**
- Replaced 18+ years with: Young Adult, Homemaker, Working Professional, Senior Citizen
- Added new "Learning Goal" step with goals customized per age category

**8. Admin Panel - Team Requirements**
- Added "Team Requirements" button in Admin Team Applications page
- Can create, edit, delete open positions
- Positions appear in Join Team page under "Open Requirements" tab

**9. Admin Panel - Educator Requirements**
- Added "Educator Requirements" button linking to requirements page

## Key Files Modified/Created

### New Files
- `/app/frontend/src/pages/SchoolOfferingsPage.jsx` - School programs landing with categories
- `/app/frontend/src/pages/SchoolOfferingDetailPage.jsx` - Individual offering detail pages

### Modified Files
- `/app/frontend/src/pages/JoinTeamPage.jsx` - Two-tab design with logo
- `/app/frontend/src/pages/GrowthPartnerPage.jsx` - Added logo header
- `/app/frontend/src/pages/LandingPage.jsx` - School dialog with options
- `/app/frontend/src/pages/AboutPage.jsx` - Schools, Events, removed Investors
- `/app/frontend/src/pages/StudentFunnel.jsx` - New age groups, learning goals
- `/app/frontend/src/pages/courses/CoursesListPage.jsx` - Removed age group display
- `/app/frontend/src/pages/admin/AdminTeamApplications.jsx` - Team requirements modal
- `/app/frontend/src/pages/admin/AdminEducators.jsx` - Educator requirements button
- `/app/frontend/src/components/Navbar.jsx` - About page variant
- `/app/frontend/src/App.js` - New routes

## Routes Added
- `/school-offerings` - School programs landing page
- `/school-offerings/:categoryId/:offeringId` - Individual program pages

## Prioritized Backlog

### P1 (Next Priority)
- LinkedIn Post Feature in final educator onboarding step
- Make Blogs Dynamic (admin CMS)
- Merge User Types into RBAC system

### P2
- Enforce RBAC Permissions across app
- CSV Export for CRM pages

### P3+
- Full School and SEO Course Funnels
- Real Calendar Integration (Calendly)
- Lead scoring system

## Test Credentials
- **Admin**: admin@oll.co / Dagaji03@
- **Educator**: Any 10-digit phone with OTP 1111
