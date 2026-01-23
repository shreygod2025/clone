# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 23, 2025 (Latest - Support & Admin Improvements)

#### Support Center Ticket Assignment ✅
1. **User-Specific Ticket Filtering:**
   - Non-admin users (center users, team members) only see tickets assigned to them
   - Admin users can see all tickets with option to filter by assignee
   - Backend endpoint `/api/support/queries` now filters by user role

2. **Admin Ticket Assignment with Notifications:**
   - New `/api/support/queries/{id}/assign` endpoint
   - Assignment modal includes deadline picker
   - WhatsApp notification sent to assignee (template: "ticket_assigned")
   - Email notification sent with ticket details and deadline

#### Admin Educator Section Restructure ✅
1. **Requirements Tab First:**
   - Requirements tab is now the first tab (before applicants)
   - Shows all educator requirements with add/edit functionality
   - Displays application count for each requirement

2. **Merged Applicants View:**
   - "New Applications" and "Demo Scheduled" merged into single "Applicants" tab
   - Sub-filters: All, Demo Pending, Demo Scheduled
   - Combined count shows total applicants

3. **Tab Structure:**
   - Requirements → Applicants → Onboarding → Active Educators → Archived

### Session: January 23, 2025 (Earlier - UX & Branding)

#### "Learner" Rebranding ✅
Changed "Student / Parent" to "Learner" across all pages:
- Landing page card title
- Login page user type selector
- FAQ page dropdown
- Footer section header ("For Learners")

#### Updated Learning Goals by Age ✅
All age groups now have consistent, practical goal options:
- **6-9 years:** Regular Weekly Classes, Certification Courses, Project Support, Competition Preparation, Fun & Interactive Learning
- **10-14 years:** Regular Weekly Classes, Certification Courses, Project/Assignment Support, Competition Preparation, Resume/Portfolio Building
- **15-18 years:** Regular Weekly Classes, Certification Courses, Project/Research Support, Olympiad & Competition Prep, Resume/College Application
- **Young Adults:** Skill Development Classes, Professional Certification, Project/Portfolio Building, Job-Ready Skills, Freelancing
- **Homemakers:** Regular Learning Classes, Certification Courses, Digital Literacy, Income Generation, Help Children
- **Working Professionals:** Weekend/Evening Classes, Professional Certification, Career Switch, AI & Automation, Upskilling
- **Senior Citizens:** Regular Learning Sessions, Digital Literacy, Stay Updated, Connect with Family, Learn Something New

#### Student Funnel UX Enhancements ✅
1. **Time Slots Divided by Time of Day:**
   - Morning (9 AM - 12 PM): 4 slots
   - Afternoon (1 PM - 5 PM): 5 slots
   - Evening (6 PM - 9 PM): 4 slots
   - Each section has clear labels and formatted times (9:00 AM format)

2. **Auto-Advance on Selection:**
   - Age group selection auto-advances to next step
   - Learning goal selection auto-advances (no Continue button needed)
   - Offline type selection auto-advances
   - Online selection auto-advances

#### Landing Page Redesign ✅
- Taller cards on desktop (400px min-height)
- White background instead of slate-50
- Footer always visible (no scroll-to-reveal)
- Cards centered vertically on desktop

#### School Case Studies Feature ✅
1. **New Component:** `/app/frontend/src/components/SchoolCaseStudies.jsx`
   - Carousel/pagination for navigating schools
   - YouTube video thumbnail + play button
   - Video modal for viewing
   - Responsive grid (1/2/3 columns)

2. **16 Partner Schools Added:**
   - Parle Tilak Vidyalay ICSE
   - Goregaon English Medium School
   - Maneckji Cooper Education Trust
   - Tayiah Biyah High School
   - Greenlawns High School Warden Road
   - Priyadarshani Group of Schools, Pune
   - Shree Chandulal Nanavati High School
   - St Agnes School, St Annes School, Scholar High School
   - Sanjeevani World School, NL Dalmia School
   - MSB School Mumbai, Greenlawns School Worli
   - Dosti Foundation School, GD Somani School

3. **Integrated Into:**
   - About Page (`/about`) - "Our School Partners"
   - School Offerings Page (`/school-offerings`) - "Success Stories from Our Partner Schools"

### Session: January 23, 2025 (Earlier - SEO Implementation)

#### Site-wide SEO Meta Tags ✅
Added Helmet SEO meta tags to all remaining public-facing pages:
- BlogDetailPage, FAQPage, JoinTeamPage, GrowthPartnerPage
- StudentFunnel, EducatorFunnel, SchoolFunnel

### Session: January 22, 2025 (SEO & Footer Update)

#### Comprehensive SEO-Friendly Footer ✅
Created a new standard Footer component used across all pages:

**View All Offerings Section (Expandable):**
- For Students & Individuals: All 5 courses with descriptions + Book Demo link
- For Schools - Robotics & Coding: 12 robotics offerings, 3 coding offerings
- For Schools - AI & Business: 5 AI offerings, 5 entrepreneurship offerings

**Main Footer Navigation:**
- For Students: All Courses, Robotics, Coding, AI & ML, Book Demo
- For Schools: All Programs, Lab Setup, AI Center, Skill Titans, Book Meeting
- Company: About Us, Careers, Become Educator, Partner With Us, Blog
- Support: Learning Centers, FAQs
- Contact: info@oll.co, +91 9920188188, Mumbai, India

**Bottom Bar:**
- Copyright notice
- Terms & Conditions link
- Privacy Policy link
- Refund Policy link
- FAQs link

**Schema.org Markup:**
- Organization itemScope
- Contact Point with email and telephone
- Social media sameAs links

#### Landing Page Footer Behavior ✅
- Footer appears after 2-second delay or after scrolling 100px
- Smooth fade-in animation
- Full footer (not compact) shown on home page

#### Pages Updated with Standard Footer ✅
- LandingPage (scroll-reveal)
- AboutPage
- OfferingsPage
- SchoolOfferingsPage
- SchoolOfferingDetailPage
- BlogsPage
- CentersPage
- FAQPage
- JoinTeamPage
- TermsPage
- PrivacyPage
- RefundPolicyPage

#### Contact Information Updated ✅
- Support Email: info@oll.co
- Support Phone: +91 9920188188
- Location: Mumbai, India

### Previous Updates (Same Session)

#### SEO Optimization ✅
- ScrollToTop component for all routes
- Rich meta tags, Open Graph, Twitter Cards
- JSON-LD structured data (Organization, Course schemas)
- Canonical URLs

#### Legal Pages ✅
- Terms & Conditions (/terms)
- Privacy Policy (/privacy)
- Refund & Cancellation Policy (/refund-policy)

#### Rich School Offering Content ✅
- 25 school offerings with detailed descriptions
- Learning outcomes for each program
- Program details (grades, duration, batch size)

#### School Funnel Dynamic Support ✅
- Support selection shows offerings based on selected programs

## Footer Component

**File:** `/app/frontend/src/components/Footer.jsx`

**Props:**
- `variant`: 'full' (default) or 'compact'

**Features:**
- All student offerings with links
- All school offerings organized by category
- Collapsible "View All Offerings" section
- Social media links
- Legal page links
- SEO schema markup

## Routes
- `/` - Landing page (scroll-reveal footer)
- `/offerings` - All offerings
- `/school-offerings` - School programs
- `/school-offerings/:categoryId/:offeringId` - Individual programs
- `/terms` - Terms & Conditions
- `/privacy` - Privacy Policy
- `/refund-policy` - Refund Policy
- `/faqs` - FAQs

## Prioritized Backlog

### P0 (Resolved)
- ~~Admin Student CRM Bug~~ - Was not a bug, URL was /admin/students not /admin/student-crm ✅

### P1 (Next Priority)
- LinkedIn Post Feature in educator onboarding (pre-written text + share button)
- Make Blogs Dynamic (full CRUD in admin CMS)
- Add sitemap.xml and robots.txt

### P2
- Merge Center Users and Growth Partners into RBAC Users & Roles system
- Enforce RBAC Permissions on frontend/backend

### P3+
- Real Calendar Integration (Calendly)
- CSV Export for CRM pages
- Lead scoring system
- Automated follow-up reminders

## Test Credentials
- **Admin**: admin@oll.co / Dagaji03@
- **Educator**: Any 10-digit phone with OTP 1111
