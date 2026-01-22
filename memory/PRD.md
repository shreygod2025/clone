# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 22, 2025 (Latest)

#### Offerings Page Restructure & Media Content ✅
- Created new `/offerings` page as the main offerings landing page
- Added "For Individuals" tab showing existing courses (Robotics, Coding, AI, Entrepreneurship, Financial Literacy)
- Added "For Schools" tab with:
  - School program categories linking to `/school-offerings`
  - 26 partner schools in "Schools We Work With" section
  - Main testimonial video (YouTube: OavfLmAdprc)
  - 6 School Case Studies with real YouTube videos:
    - Parle Tilak Vidyalaya ICSE (XGmUDHjPaq0)
    - Goregaon English Medium School (MM36G7rmAOU)
    - Maneckji Cooper Education Trust (vOik-WmE_n8)
    - Tayiah Biyah High School (dWo2wr02mq4)
    - Greenlawns High School Warden Road (YoIu5akBkr0)
    - OLL Success Story (q6mHoHsdmhA)
  - "Our Events" section with IIT Bombay Techfest (B0n8-RYegVc) and Skill Titans (KJMH8EAB6NI)

#### Updated Partner Schools List
Replaced generic school placeholders with actual partner schools across `/offerings`, `/about`, and `/school-offerings`:
- Greenlawns High School, G.D. Somani Memorial School, N.L. Dalmia High School
- Hiranandani Foundation School, JBCN International School, Seven Square Academy
- Goregaon Education Society English Medium School, Sanjeevani World School
- Fravashi International Academy, Maneckji Cooper Education Trust, Excelsior School
- J.N. Petit School, Seth Anandram Jaipuria School, St. Kabir School
- St. Gregorios High School, St. Anne's High School Fort, St. Wilfred's School
- Manav Mandir High School, Jankidevi Public School, Guardian School
- Parle Tilak Vidyalaya, JB Vachha High School, Vedas International School
- C.N.M. & N.D. Parekh ICSE School, Ram Ratna International School, Navodaya Central School

#### Updated Events Section with Real Videos
- About page and School Offerings page now show actual YouTube thumbnails
- IIT Bombay Techfest video (B0n8-RYegVc) with clickable play button
- Skill Titans CNBC TV18 video (KJMH8EAB6NI) with clickable play button

#### Navigation Update
- Changed "Courses" to "Offerings" in navbar
- Added route for `/offerings` page

### Previous Session: January 22, 2025

#### Educator Onboarding Flow Fixes ✅
- Fixed training step progression - educators no longer get stuck after quiz
- Added "Upload Video Assessment" button when quiz is passed but video upload is needed
- Implemented PDF generation for ID Card and Certificate using ReportLab with QR codes
- Added download buttons to educator dashboard for active educators

#### UI/UX Updates ✅

**1. Join Team Page Redesign**
- Added OLL logo header with redirect to home
- Two tabs: "General Application" and "Open Requirements"
- Fetches open positions from admin panel

**2. Growth Partner Page**
- Added OLL logo header with redirect to home

**3. About Us Page**
- Removed Investors section
- Updated Shreyaan's timeline (age 8 selling paintings, OLL founded April 4, 2020)
- Navbar shows "Join Team" and "Partner With Us" instead of Book Demo/Login
- Added "Schools We Work With" section with 26 partner schools
- Added "Our Events" section with Skill Titans and IIT Bombay Techfest videos

**4. School Landing Page (`/school-offerings`)**
- Complete redesign with expandable categories
- **Robotics** (12 offerings)
- **Financial Literacy & Entrepreneurship** (5 offerings)
- **AI & Machine Learning** (5 offerings)
- **Coding & Programming** (3 offerings)
- Each offering links to detailed page at `/school-offerings/:categoryId/:offeringId`

**5. Landing Page - School Card**
- Clicking "School" now shows dialog with "View Offerings" and "Book Meeting" options

**6. Student Demo Form**
- Replaced 18+ years with: Young Adult, Homemaker, Working Professional, Senior Citizen
- Added new "Learning Goal" step with goals customized per age category

**7. Admin Panel - Team Requirements**
- Added "Team Requirements" button in Admin Team Applications page
- Can create, edit, delete open positions

## Key Files Modified/Created

### New Files
- `/app/frontend/src/pages/OfferingsPage.jsx` - Main offerings landing with tabs
- `/app/frontend/src/pages/SchoolOfferingsPage.jsx` - School programs landing with categories
- `/app/frontend/src/pages/SchoolOfferingDetailPage.jsx` - Individual offering detail pages

### Modified Files
- `/app/frontend/src/pages/AboutPage.jsx` - Updated schools list, events with real videos
- `/app/frontend/src/pages/SchoolOfferingsPage.jsx` - Updated schools list, events, testimonial video
- `/app/frontend/src/components/Navbar.jsx` - Changed "Courses" to "Offerings"
- `/app/frontend/src/App.js` - Added `/offerings` route

## Routes
- `/offerings` - Main offerings page (For Individuals / For Schools)
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
