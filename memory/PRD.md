# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## What's Been Implemented

### Session: January 23, 2025 (Latest - Complete SEO Implementation)

#### Site-wide SEO Meta Tags ✅
Added Helmet SEO meta tags (title + description) to all remaining public-facing pages:
- BlogDetailPage.jsx - Dynamic title from blog post
- FAQPage.jsx - "FAQ - OLL | Robotics, Coding & AI Classes for Kids"
- JoinTeamPage.jsx - "Careers at OLL | Join India's Leading Skill Education Team"
- GrowthPartnerPage.jsx - "Growth Partner Program | OLL - Open an OLL Center"
- StudentFunnel.jsx - "Book a Free Demo | OLL - Robotics, Coding & AI Classes for Kids"
- EducatorFunnel.jsx - "Become an Educator | OLL - Teach Robotics, Coding & AI"
- SchoolFunnel.jsx - "School Partnership | OLL - Skill Education Programs for Schools"

#### Verified Features ✅
- Admin Student CRM (/admin/students) - Working correctly (URL was misreported as /admin/student-crm)
- Demo time slots: 9 AM to 9 PM (09:00 to 21:00) in student funnel - Confirmed
- Landing page footer: Shows after 150px scroll on desktop, immediately on mobile - Working

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
