# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 22, 2025

#### P0: Educator Onboarding Flow Fixes ✅
- Fixed training step progression - educators no longer get stuck after quiz
- Added "Upload Video Assessment" button when quiz is passed but video upload is needed
- Implemented PDF generation for ID Card and Certificate using ReportLab with QR codes
- Added download buttons to educator dashboard for active educators

#### UI/UX Changes ✅
1. **About Page Navbar** - Shows "Join Team" and "Partner With Us" instead of "Book Demo" and "Login"
2. **About Page Timeline** - Fixed Shreyaan's journey (age 8 selling paintings, OLL founded April 4, 2020)
3. **School Landing Page** - Created `/school-offerings` with 6 program cards (Robotics Lab, Coding, AI/ML, Entrepreneurship, Financial Literacy, Teacher Training)
4. **School Offering Details** - Created `/school-offerings/:id` with detailed program information
5. **School Card Dialog** - When clicking "School" on landing page, shows dialog with "View Offerings" and "Book Meeting" options
6. **Courses Page** - Removed age group badge from course cards
7. **Student Funnel Age Groups** - Replaced 18+ with Young Adult, Homemaker, Working Professional, Senior Citizen
8. **Learning Goal Step** - Added new step in student funnel with goals customized per age group
9. **Team Requirements** - Added "Team Requirements" button in Admin Team Applications to manage open positions
10. **Educator Requirements** - Added "Educator Requirements" button in Admin Educators section

## Key Technical Implementation

### New Files Created
- `/app/frontend/src/pages/SchoolOfferingsPage.jsx` - School programs landing page
- `/app/frontend/src/pages/SchoolOfferingDetailPage.jsx` - Individual program detail pages

### Modified Files
- `/app/frontend/src/pages/LandingPage.jsx` - Added school dialog with two options
- `/app/frontend/src/components/Navbar.jsx` - Added `variant="about"` prop for different button set
- `/app/frontend/src/pages/AboutPage.jsx` - Updated timeline, uses about navbar variant
- `/app/frontend/src/pages/StudentFunnel.jsx` - New age groups, learning goals step
- `/app/frontend/src/pages/courses/CoursesListPage.jsx` - Removed age group display
- `/app/frontend/src/pages/admin/AdminTeamApplications.jsx` - Team requirements modal
- `/app/frontend/src/pages/admin/AdminEducators.jsx` - Educator requirements button
- `/app/backend/server.py` - PDF generation endpoints with ReportLab

### Routes Added
- `/school-offerings` - School programs landing page
- `/school-offerings/:offeringId` - Individual program pages

## Database Schema Updates
- `team_requirements` collection for open positions (already existed)
- `educator_onboarding` - Added `id_card_generated`, `certificate_generated` fields

## 3rd Party Integrations
- **ReportLab** - PDF generation for ID cards and certificates
- **qrcode** - QR code generation for ID cards

## Prioritized Backlog

### P1 (Next Priority)
- LinkedIn Post Feature - Pre-written post template in final onboarding step
- Make Blogs Dynamic - Admin CMS for blog posts
- Merge User Types into RBAC

### P2
- Enforce RBAC Permissions across app
- CSV Export for CRM pages

### P3+
- Full School and SEO Course Funnels
- Real Calendar Integration (Calendly)
- Lead scoring system
- Automated follow-up reminders

## Known Limitations
- **Resend Emails** - Domain verification pending on `oll.co`
- **Jitsi Moderator** - Public server doesn't support programmatic moderator roles
- **PDF Photos** - ID card shows placeholder circle instead of actual educator photo

## Test Credentials
- **Admin**: admin@oll.co / Dagaji03@
- **Educator**: Any 10-digit phone with OTP 1111
