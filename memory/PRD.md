# OLL - Omni Learning Labs Platform

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Core Architecture
- **Frontend**: React with Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI with MongoDB
- **Integrations**: AiSensy (WhatsApp), Jitsi (Video), PostHog (Analytics), Resend (Email), Emergent LLM (AI)

## What's Been Implemented

### Jan 28, 2026 - Student Payments & "Other" Skill Option
**Student Payments in Orders Module:**
- ✅ Fixed `/api/orders/student-payments` endpoint (was returning Internal Server Error)
- ✅ Student Payments tab now displays converted students
- ✅ Details modal shows Student Information, Enrollment Details, Payment Details
- ✅ Search filter now works for student_name and parent_name fields

**"Other" Skill Option Across Platform:**
- ✅ InquiryPage (/add) - Student skills multi-select has "Other" option with text input
- ✅ InquiryPage (/add) - Teacher/Educator skills multi-select has "Other" option with text input
- ✅ Admin Student CRM - Add Lead form "Skill Interest" dropdown has "Other" option with text input
- ✅ Educator Funnel (/educator) - "Skills You Can Teach" has "Other" option with text input
- ✅ Backend /educator-config endpoint updated to always include "Other" in skills list
- ✅ Custom skill value saved correctly when "Other" is selected

**Role-Based Access Control (RBAC) Enhancement:**
- ✅ Updated ALL_SECTIONS in AdminUsers.jsx to include all 14 admin panel tabs
- ✅ Added new permission sections: orders, blogs, reports, data_center
- ✅ Updated DEFAULT_ROLES with relevant permissions (Sales Team now has 'orders')
- ✅ Added new "Accounts Team" role with orders and reports access
- ✅ AdminDashboard nav filtering now uses consistent permission keys
- ✅ All admin tabs are now assignable via role permissions

### Jan 28, 2026 - Team Applications & Inquiry Enhancements
**Team Applications View Modal Enhancement:**
- ✅ Expanded view modal to show all application details
- ✅ Personal Information section: Name, Phone, Email, City
- ✅ Professional Details section: Role, Experience, Availability, Source
- ✅ Links & Documents section: Resume, LinkedIn, Portfolio links with clickable URLs
- ✅ Cover Letter / Message section
- ✅ Status badge and assignment info
- ✅ Comments history with author and timestamp

**Team Applications Add Form:**
- ✅ Phone field now uses PhoneInput with country code selector (default: +91)
- ✅ Phone saved with full country code prefix

**Inquiry Page (/add) Attachments & Voice Recording:**
- ✅ Added "Attach File" button for uploading images, videos, audio, PDFs (max 10MB each)
- ✅ Added "Voice Note" button - WhatsApp-style voice recording
- ✅ Recording UI shows red pulsing indicator with timer
- ✅ Recorded audio preview with play/pause controls
- ✅ Attachments display with type-specific icons (Image, Video, Music, Document)
- ✅ Remove attachment functionality
- ✅ Attachments saved to backend with query submission
- ✅ Backend InquiryQuery model updated to store attachments array

### Jan 28, 2026 - Orders & Payments Module (P0)
**New Admin Orders Page (`/admin/orders`):**
- ✅ Created new "Orders" tab in admin navigation
- ✅ Two subtabs: School Payments, Student Payments
- ✅ Payment tracking table with columns: School/Student, Amount, Due Date, Status, Invoice, Receipt, Actions
- ✅ Auto-marks payments as "Overdue" when due date has passed
- ✅ Status badges: Pending (yellow), Overdue (red with days count), Paid (green), Partial (blue)
- ✅ Stats cards: Total Orders, Pending, Overdue, Paid, Collected Amount
- ✅ Search and status filter functionality
- ✅ Sort by status priority (overdue first) then by due date

**Payment Update Modal:**
- ✅ Upload Invoice (PDF, PNG, JPG)
- ✅ Upload Payment Receipt (PDF, PNG, JPG)
- ✅ Change status (Pending, Partial, Paid, Cancelled)
- ✅ Payment Date field (appears when paid/partial)
- ✅ Transaction ID / Reference field
- ✅ Notes textarea

**Onboarding Workflow Integration:**
- ✅ Enhanced Payment Collection step with:
  - Amount, Payment Date, Transaction ID
  - Payment Mode dropdown (Bank Transfer, UPI, Cheque, Cash, NEFT/RTGS)
  - Invoice file upload
  - Payment Receipt file upload
  - Link to Orders page for full tranche management
- ✅ When payment marked as Paid in Orders, automatically:
  - Updates onboarding workflow data
  - Marks Payment Collection step as complete (if all tranches paid)
  - Advances to next onboarding step
  - Adds timeline entry

**Backend Endpoints:**
- `GET /api/orders/school-payments` - Fetches all school payment tranches
- `GET /api/orders/student-payments` - Fetches student payments (placeholder)
- `PATCH /api/orders/{payment_id}` - Updates payment status, invoice, receipt

### Jan 27, 2026 - School Conversion Form Fixes (P0)
**Conversion Form Fixes:**
- ✅ Fixed "input should be a valid string" error (conversion_amount now sent as string)
- ✅ School contacts now use PhoneInput with country code selector (+91 default)
- ✅ School contacts role field changed to dropdown (Principal, Trustee/Owner, Director, Coordinator, Accounts)
- ✅ Phone numbers saved with country code prefix (e.g., +919876543210)
- ✅ Remove Contact button added for multiple contacts

**View Modal Enhancements:**
- ✅ All conversion form details now visible in View modal
- ✅ School Team Contacts display: Name (role) phone email
- ✅ Grade-wise Pricing display with student counts
- ✅ MOU Document section with "View MOU" and "Download MOU" buttons

**Public Tracking Page UI:**
- ✅ Navbar updated with OLL logo (brand image, not text)
- ✅ Navigation links: Home, Offerings, For Schools, About
- ✅ Share button for copying tracking link
- ✅ Footer updated to match main site style (slate-900 bg)
- ✅ Footer has OLL white logo, contact info, links
- ✅ No extra space at bottom of page
- ✅ Proper copyright: "Clonefutura Live Solutions Pvt. Ltd."

### Jan 27, 2026 - School Onboarding UX Overhaul (P0)
**Conversion Flow:**
- ✅ "Mark Converted" button opens full onboarding popup (not simplified modal)
- ✅ Popup captures: Offering, Model, Kit Type, Book Type, Training Type, Grade Pricing, Contacts, Payment Details, MOU
- ✅ "Mark as Converted" button in popup sets status to 'converted' (not 'active')
- ✅ Auto-initializes 9-step onboarding workflow with tracking token
- ✅ Tracking link auto-copied to clipboard on conversion

**Converted Tab:**
- ✅ All onboarding details visible in "View" modal (including MOU link)
- ✅ Removed "Onboard School" button (no longer needed)

**Active Schools:**
- ✅ Removed onboarding progress display from school cards
- ✅ Removed "View Onboarding" button

**Public Tracking Page (/track/{token}):**
- ✅ Proper OLL navbar with logo, navigation links, Book a Demo button
- ✅ Proper OLL footer with programs, contact info, privacy/terms links
- ✅ Step-specific "Get Support" modal with quick queries
- ✅ Ticket submission from tracking page

**Support Center Integration:**
- ✅ Tracking page tickets now appear in Support Center
- ✅ "Tracking Page" source filter added
- ✅ Orange badge distinguishes tracking page tickets
- ✅ Status updates work for tracking tickets

### Jan 26, 2026 Session
**School CRM Enhancements:**
- ✅ Sub-dashboard with tabs: Dashboard, Leads & Schools, Contact Management
- ✅ Dashboard shows: This week's meetings, followup schedule, quick stats
- ✅ Contact Management tab with all school contacts, edit capability
- ✅ Add Followup Meeting button (+) on school cards
- ✅ AI-generated followup email with checkbox in followup modal
- ✅ Scheduled emails stored in database with 9AM send time

**Inquiry Page (/add) Enhancements:**
- ✅ Multi-select skills for students
- ✅ Offerings selection for schools (appears when programs selected)
- ✅ Better program-to-offering matching
- ✅ Send personalized email checkbox with offerings details

**Phone Input Integration:**
- ✅ Country code selector on all forms

### Previous Sessions
- Multi-funnel structure (Student, Educator, School)
- Admin Panel with CRM for students and schools
- SEO implementation with react-helmet-async
- OTP-based authentication
- Bulk school import (CSV/Excel)
- Student/Educator dashboards

## Key API Endpoints

### School Onboarding
- `POST /api/schools/onboard` - Save onboarding data
- `POST /api/schools/{id}/init-onboarding` - Initialize 9-step workflow
- `PATCH /api/schools/{id}/onboarding-step/{key}` - Update step status
- `GET /api/schools/{id}/onboarding` - Get onboarding status
- `GET /api/track/{token}` - Public tracking page data

### Support Tickets
- `POST /api/track/{token}/support-ticket` - Create ticket from tracking page
- `GET /api/support/tracking-tickets` - Get tracking page tickets (admin)
- `PATCH /api/support/tracking-tickets/{id}` - Update tracking ticket

## Database Schema

### school_inquiries
```
{
  id, school_name, contact_name, phone, email, status,
  onboarding_data: { model, kit_type, book_type, training_type, grade_pricing, school_contacts, payment_*, contract_*, mou_url },
  onboarding_workflow: { tracking_token, started_at, completed_at, current_step, steps: {...}, timeline: [...] }
}
```

### support_tickets (tracking page tickets)
```
{
  id, school_id, school_name, contact_name, contact_phone, contact_email,
  tracking_token, step, query_type, description, priority, status, source: "tracking_page",
  created_at, updated_at, responses: [...]
}
```

## Prioritized Backlog

### P0 (Critical)
- ✅ Fix School Onboarding UX (COMPLETED Jan 27, 2026)
- Generate Proposal & MOU PDFs from /add page

### P1 (High)
- Implement background scheduler (APScheduler) for AI follow-up emails at 9 AM
- CSV Export for all CRM, Data Center, Reports pages

### P2 (Medium)
- PO generation system with vendor panel
- Real calendar integration (Calendly)
- RBAC enforcement on frontend/backend
- Lead scoring system

### Future
- SMS/Email reminders for students
- LinkedIn "Share Post" feature
- Advanced analytics dashboard

## Known Limitations
- **Jitsi Moderator Control**: Public meet.jit.si doesn't support programmatic moderator assignment
- **Resend Email**: Requires user domain verification on Resend dashboard
- **AI Email Scheduler**: Not yet implemented (emails scheduled but not sent automatically)

## Test Credentials
- **Admin**: admin@oll.co / Dagaji03@
- **User OTP**: Any phone number with OTP 1111
