# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 22, 2025 (Latest Update)

#### Navbar & Offerings Page Updates ✅
- Fixed navbar across all pages to show "Offerings" instead of "Courses"
- `/offerings` page with "For Individuals" and "For Schools" tabs
- **For Schools tab now shows all offerings expanded by default**
- **Redesigned offerings as clear, clickable buttons** with arrow icons and hover states
- Each category shows: colored header with icon, subtitle, program count
- Grid layout (3 columns) for better readability

#### School Offerings Page Redesign ✅
- All 4 categories expanded by default (no collapse/expand)
- **Robotics** (12 programs) - Red gradient header
- **Financial Literacy & Entrepreneurship** (5 programs) - Green gradient header  
- **AI & Machine Learning** (5 programs) - Purple gradient header
- **Coding & Programming** (3 programs) - Blue gradient header
- Each offering is a clear clickable button with hover effect

#### Admin Case Studies Management ✅
- New "School Case Studies" tab in Admin Settings (first tab)
- Full CRUD for case studies (create, edit, delete)
- Each case study has: School Name, YouTube Video ID, Description, Order, Active status
- Video thumbnail preview when entering video ID
- Toggle visibility (show/hide on website)

#### Dynamic Case Studies on Frontend ✅
- SchoolOfferingsPage fetches case studies from backend API
- OfferingsPage uses dynamic data with static fallback
- Case studies displayed in responsive grid with video thumbnails and play buttons

#### Student Demo Time Slots ✅
- Extended time selection from **9AM to 9PM** (was 10AM to 5PM)
- Updated in StudentFunnel.jsx, SchoolFunnel.jsx, and AdminStudentCRM.jsx
- New slots: 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00, 18:00, 19:00, 20:00, 21:00

#### Admin Cancel Demo Feature ✅
- New "Cancel Demo" button in Student CRM for inquiries with scheduled demos
- Cancel Demo Modal with reason field (required)
- Cancellation logged in notes with timestamp
- Demo date/time cleared when cancelled

### Previous Session: January 22, 2025

(Previous session work preserved - educator onboarding fixes, PDF generation, UI updates, etc.)

## New API Endpoints

### Case Studies
- `GET /api/case-studies` - List case studies (public, only active by default)
- `GET /api/case-studies?all=true` - List all case studies (admin)
- `POST /api/case-studies` - Create case study (admin)
- `PATCH /api/case-studies/{id}` - Update case study (admin)
- `DELETE /api/case-studies/{id}` - Delete case study (admin)

## Key Files Modified

### New/Modified Backend
- `/app/backend/server.py` - Added case studies CRUD endpoints

### Modified Frontend
- `/app/frontend/src/pages/OfferingsPage.jsx` - Dynamic case studies, expanded school offerings
- `/app/frontend/src/pages/SchoolOfferingsPage.jsx` - All categories expanded, dynamic case studies section, clickable button design
- `/app/frontend/src/pages/admin/AdminSettings.jsx` - Case Studies tab and management
- `/app/frontend/src/pages/admin/AdminStudentCRM.jsx` - Cancel Demo modal and functionality
- `/app/frontend/src/pages/StudentFunnel.jsx` - Extended time slots (9AM-9PM)
- `/app/frontend/src/pages/SchoolFunnel.jsx` - Extended time slots (9AM-9PM)
- `/app/frontend/src/components/Navbar.jsx` - "Offerings" instead of "Courses"

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
- Real Calendar Integration (Calendly)
- Lead scoring system

## Test Credentials
- **Admin**: admin@oll.co / Dagaji03@
- **Educator**: Any 10-digit phone with OTP 1111
