# OLL - Omni Learning Labs Platform

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

## Core Architecture
- **Frontend**: React with Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI with MongoDB
- **Integrations**: AiSensy (WhatsApp), Jitsi (Video), PostHog (Analytics), Resend (Email), Emergent LLM (AI)

## What's Been Implemented

### Jan 28, 2026 - Rich Text Blog Editor & Open Learning Resources
**Rich Text Editor for Blogs:**
- ✅ Installed TipTap editor with all extensions (image, link, youtube, code-block, etc.)
- ✅ Created RichTextEditor component with full toolbar
- ✅ Features: Bold, Italic, Underline, Strikethrough, Inline Code
- ✅ Headings: H1, H2, H3
- ✅ Lists: Bullet, Numbered, Blockquote, Code Block with syntax highlighting
- ✅ Media: Image upload, YouTube video embed, Link insertion
- ✅ Alignment: Left, Center, Right, Justify
- ✅ Undo/Redo functionality

**Open Learning Resources:**
- ✅ Created new "resource" blog type for documentation-style content
- ✅ Added Content Type selector in blog form (Blog Post vs Open Learning Resource)
- ✅ Created /resources page with sidebar navigation
- ✅ Support for nested resources (parent-child hierarchy)
- ✅ Tags support for categorization
- ✅ SEO meta tags for resources

**Updated Blog Model:**
- ✅ Added blog_type field ('blog' or 'resource')
- ✅ Added parent_id for nested resources
- ✅ Added order field for sorting
- ✅ Added tags array field

### Jan 28, 2026 - Student Payments & "Other" Skill Option
**Student Payments in Orders Module:**
- ✅ Fixed `/api/orders/student-payments` endpoint (was returning Internal Server Error)
- ✅ Fixed `/api/orders/{payment_id}` PATCH endpoint to handle student payments by ID prefix
- ✅ Student Payments tab now displays converted students
- ✅ Details modal shows Student Information, Enrollment Details, Payment Details
- ✅ Search filter now works for student_name and parent_name fields
- ✅ Can update student payment status (Pending/Paid) with proper persistence

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

**Admin UI/UX Improvements (Jan 28, 2026):**
- ✅ Support Center: Added "All User Types" filter (Student, School, Educator, Growth Partner, Teacher, Team)
- ✅ Users & Roles: Added filters for City, Role, and Status
- ✅ Orders Page: Removed duplicate title, now shows single "Orders & Payments" header

**Onboarding Tracker Page Improvements (Feb 2, 2026):**
- ✅ New title: "{School Name} Onboarding Tracker" with description
- ✅ MOU is now Step 1 with Download button
- ✅ Shows scheduled dates for: Kit Delivery, Distribution, Teacher Training
- ✅ Removed duplicate MOU at bottom
- ✅ School Team section showing all contacts with names and roles
- ✅ Programs & Offerings section displaying selected programs
- ✅ Your OLL Representative section showing assigned team member
- ✅ Need Help moved above Recent Activity
- ✅ Simple sticky footer with OLL logo and contact details (phone, email)
- ✅ Removed old footer, replaced with blue bar
- ✅ **Flow Reordered:** Phone → OTP → Name → Address (address comes after name for home visits)
- ✅ **Simplified OTP Flow:** Single "Verify Phone Number" button sends OTP and proceeds
- ✅ **OTP Step:** Shows "Verify OTP" with separate continue button
- ✅ **Name on Separate Page:** Dedicated step for entering student name
- ✅ **Simple Address Fields:** Removed Google Maps autocomplete, added:
  - Flat/Apartment/Building number
  - Street/Area/Locality (required)
  - City (pre-filled, disabled)
  - PIN Code (required, 6 digits)
  - Landmark (optional)
- ✅ **Address in Demo Summary:** Full address displayed in booking summary
- ✅ **Booking Confirmation Animation:** Animated checkmark loading screen
  - Eliminates flash back to date page
  - Shows "Confirming your booking..." 
  - Smooth transition to success page

**Meeting Done Popup in School CRM:**
- ✅ New "Meeting Completed" modal with required meeting notes/minutes textarea
- ✅ Added Quoted Price field to enter price discussed in meeting
- ✅ Two-step follow-up selection: No Follow-up, Message, or Meeting type
- ✅ Date/time selectors appear only after selecting Message or Meeting type
- ✅ Meeting notes appended with date stamp to existing notes
- ✅ Fixed modal overflow - now properly contained with max-h-[90vh] and scrollable

**Schedule Followup Popup in School CRM:**
- ✅ Two-step flow: Select follow-up type first (Message or Meeting)
- ✅ Date/time selectors, notes, and AI email option appear after type selection
- ✅ Fixed modal overflow - now properly contained with max-h-[90vh] and scrollable
- ✅ **Message Followup:** Shows only Date + Note (no time selector)
- ✅ **Meeting Followup:** Shows Date + Time + Mode selection (Online/In-Person)
- ✅ **Online Mode:** Shows Meeting Link input field
- ✅ **In-Person Mode:** Shows Meeting Address textarea
- ✅ Backend stores meeting_mode, meeting_link, meeting_address fields

**Contact Management Filters (Jan 28, 2026):**
- ✅ Added City filter dropdown (All Cities + CITIES list)
- ✅ Added Role filter dropdown (Principal, Trustee/Owner, Director, Coordinator, Accounts)
- ✅ Added Stage filter dropdown (New Leads, Meeting Done, Converted, Active, Renewed, Lost, Archived)
- ✅ Filters correctly narrow down contact list

**Edit School Modal Enhancement (Active Schools):**
- ✅ Added MOU Document upload section with view/remove functionality
- ✅ Added Grade-wise Student Count & Pricing with Add Grade button
- ✅ Added School Team Contacts section with Add Contact button
- ✅ Payment Details: Total Amount, Payment Mode, Payment Method
- ✅ Contract Period: Contract Start and End dates
- ✅ Now matches all features from the Conversion popup
- ✅ **Payment Tranches Section (Feb 2, 2026):** Added multi-tranche support with:
  - Percentage, Amount, Due Date, Status (pending/paid/overdue)
  - Auto-calculate amount from percentage when total amount is set
  - Maps to Orders module for payment tracking

### Feb 2, 2026 - Backend Bug Fixes & UI Enhancements
**P0 Backend Fixes:**
- ✅ **Fixed Edit Active Schools:** Updated SchoolInquiryUpdate model to include location, board, model, total_students fields
- ✅ **Fixed Bulk Upload:** Excludes archived schools when finding duplicates - now correctly updates active schools
- ✅ **MOU Auto-Complete:** init-onboarding endpoint now automatically marks MOU step as completed on school conversion

**UI/UX Fixes:**
- ✅ **Edit School Dropdowns:** Fixed offerings dropdown to show `title` property instead of `name`
- ✅ **Removed $ Icon:** Converted schools tab now shows ₹ amount without DollarSign icon
- ✅ **Programs & Offerings on Tracker:** Shows exact details from conversion (offering, kit_type, book_type, training_type, model)
- ✅ **Footer Updated:** Company name is "Clonefutura Live Solutions Pvt. Ltd", phone is +91 99201 88188
- ✅ **Relationship Manager:** Changed "Account Management" to "Relationship Manager" on tracking page
- ✅ **Scheduled Dates:** Tracker shows scheduled dates for kit_delivery, teacher_training even if step not yet reached

**Orders & Payments Enhancements (Feb 2, 2026):**
- ✅ **GST Type Dropdown:** Added GST type selector in order update popup with options:
  - Book GST
  - Inclusive GST  
  - Exclusive GST
- ✅ **GST Type Column:** Orders table now shows GST type with colored badges (blue/green/orange)
- ✅ **Revenue Calculation Fixed:** Reports revenue now correctly sums conversion_amount and onboarding_data.total_amount for converted/active/renewed schools

**Email Templates & Automation (Feb 2, 2026):**
- ✅ **Beautiful Welcome Email:** Redesigned welcome email with OLL branding, logo, onboarding timeline, and CTA buttons
- ✅ **Welcome Email to All Members:** Welcome email now sent to all team members listed in school_contacts on conversion
- ✅ **Invoice Email with Bank Details:** When invoice is uploaded, automatic email sent to accounts team with:
  - Invoice download link
  - MOU download link  
  - Company details (Clonefutura Live Solutions Pvt Ltd)
  - Bank account details (HDFC 50200063789133, IFSC: HDFC0000240)
  - GST No: 27AAKCC1113B1ZC, PAN: AAKCC1113B
  - Note: Emails require Resend domain verification to work in production

**School Renewal Workflow (Feb 2, 2026):**
- ✅ **Lost Reason Modal:** When marking school as lost, shows dropdown with reasons:
  - Budget constraints, Chose competitor, Program not suitable, Decision postponed, No response, Management change, Other (custom)
- ✅ **Renewal Meeting Stage:** New stage in workflow (teal color) between Active and Renewed
- ✅ **Renewal Meeting Button:** Replaced "Renewed" button in Active Schools with "Renewal Meeting"
- ✅ **Renewal Meeting Modal:** Schedule renewal meeting with:
  - Date picker and time slots
  - Meeting type (In-Person / Online)
  - Meeting link or address based on type
  - Notes field
- ✅ **Renewal Conversion Modal (Feb 3, 2026 - ENHANCED):** Now identical to Mark Converted modal with:
  - Previous Contract Details display (Last Amount, Model, Students)
  - Select Offering dropdown
  - Model/Type dropdown (Robotics Lab Setup, STEM Curriculum, After School, Teacher Training, Full Partnership)
  - Book Type, Kit Type, Training Type dropdowns
  - MOU Document upload with view/remove
  - **Grade-wise Student Count & Pricing** with add/remove grade rows, auto-calculated totals
  - **School Team Contacts** with phone input (country code selector), name, role, email
  - **Payment Details section:** Payment Mode (From School/Student), Payment Method (Cheque/NEFT/Online/Cash)
  - **Payment Tranches** with percentage/amount auto-calculation, due dates, notes
  - Contract Start/End dates
  - **Parent Circular upload** (conditional - appears when payment_mode='from_student')
  - **Payment Link input** (conditional - appears when payment_mode='from_student' AND payment_method='online')
  - Generates new tracking link on submission
- ✅ **Re-onboarding Flow:** Renewed schools get new onboarding workflow with tracking link
- ✅ **Auto-status Update:** Schools automatically move back to "Active" when re-onboarding completes
- ✅ **Renewed Section Progress Tracker:** Renewed schools show emerald/green styled "Re-Onboarding Progress" card with:
  - Progress bar showing step completion
  - Step count (e.g., "1/9 steps")
  - Current step name
  - "Copy tracking link" button
  - "View Details" link
- ✅ **Renewal Tracking Page:** Shows renewal-specific UI:
  - Green "Partnership Renewal - Thank you for continuing with OLL!" banner
  - "Renewal In Progress" status
  - "Renewal Steps" heading
  - is_renewal flag in API response
- ✅ **CRM Dashboard Renewal Meetings (Feb 3, 2026):** This Week's Meetings widget now includes:
  - Meetings from schools with status 'renewal_meeting' (using renewal_meeting_date field)
  - Emerald-colored "Renewal" badge with RefreshCw icon to distinguish renewal meetings from regular meetings

**Bug Fixes (Feb 3, 2026):**
- ✅ **Meeting Done Bug:** Fixed issue where leads with followup scheduled were changing to 'followup' status (no UI tab), causing them to "disappear". Leads now stay in 'meeting_done' tab with followup data attached.
- ✅ **Team User Support Queries:** Team members now only see support queries assigned to them (filtered by user ID or email). Admins see all queries. Added info banner for team members.
- ✅ **Autocomplete Click Fix:** Fixed issue where autocomplete dropdown suggestions couldn't be clicked due to blur event closing dropdown too fast. Added onBlur delay (200ms) and onMouseDown preventDefault to all autocomplete dropdowns in School CRM and /add page.
- ✅ **Assign Modal Scroller:** Added `max-h-64 overflow-y-auto` to team member lists in Assign Lead modals across School CRM, Student CRM, and Educator CRM. Modals now also have `max-h-[90vh]` to prevent overflow.
- ✅ **Docs Button Extended:** Documents button now appears in "Converted" and "Active" school status tabs (previously only in new/meeting_done/renewal_meeting).
- ✅ **Referral Source Field:** When source is set to "Referral", a new "Referred By" text input field appears in School CRM Add Lead modal and in /add page (InquiryPage). Backend also stores this field.
- ✅ **Latest Note Display:** Changed "Comments" display to "Latest Note" in all CRM cards (School, Student, Educator). Now shows only the last paragraph (2 lines max) instead of full notes with line-clamp-2.
- ✅ **Archive Reason Modal (Student CRM):** When archiving a student lead, a modal now asks for reason with dropdown options: Not interested, Budget constraints, Chose competitor, No response, Wrong contact, Age not suitable, Location not serviceable, Duplicate lead, Other.

### Feb 4, 2026 - Team Onboarding Workflow (P0)
**Complete Team Member Lifecycle Management:**
- ✅ **Team Onboarding Page (`/admin/team-onboarding`):** New admin page with 3 tabs:
  - Onboarding: Shows team members in the hiring/onboarding process
  - Active: Shows activated team members
  - Discontinued: Shows discontinued team members with reasons
- ✅ **Navigation Link:** Added "Team Onboarding" link in admin sidebar under Team Applications
- ✅ **4-Step Onboarding Process:**
  - Step 1: Personal Information (name, DOB, address, emergency contact)
  - Step 2: Bank Details (account holder, number, IFSC, bank name, PAN)
  - Step 3: Contract Signing (upload signed contract URL)
  - Step 4: Training (completion notes)
- ✅ **Step Completion Modals:** Click on any incomplete step to open form modal and mark as complete
- ✅ **Progress Tracking:** Visual progress bar showing completed steps (e.g., "2/4 steps")
- ✅ **Auto-Onboarding Initiation:** When team application is marked as "Hired", onboarding record is automatically created
- ✅ **Activation Workflow:**
  - "Activate" button appears when all 4 steps are complete
  - Opens modal to select role assignment
  - Creates new team_user with generated username and temporary password
  - Temp password copied to clipboard
- ✅ **Discontinuation Workflow:**
  - "Discontinue" button on active members
  - Modal with reason dropdown (Resignation, Termination, Contract End, Performance Issues, etc.)
  - Exit formalities checklist (Assets returned, Access revoked, Final settlement, Exit interview)
  - Notes field for additional details
  - Deactivates the team user account
- ✅ **View Details Modal:** Shows all personal info, bank details, role, city, status
- ✅ **Public Tracking Page (`/team-track/{token}`):**
  - Team members can view their onboarding progress
  - Shows all 4 steps with completion status and timestamps
  - Displays "discontinued" notice if applicable
  - Beautiful gradient UI with OLL branding
- ✅ **Copy Tracking Link:** Button to copy tracking link for sharing with new hires

**Backend Endpoints:**
- `POST /api/team-onboarding/init/{application_id}` - Initialize onboarding for hired applicant
- `GET /api/team-onboarding` - List all onboarding records (with status filter)
- `GET /api/team-onboarding/{id}` - Get single onboarding record
- `GET /api/team-onboarding/track/{token}` - Public tracking endpoint
- `POST /api/team-onboarding/{id}/complete-step` - Mark step as complete
- `POST /api/team-onboarding/{id}/activate` - Activate team member (create user)
- `POST /api/team-onboarding/{id}/discontinue` - Discontinue team member

### Feb 4, 2026 - GP Onboarding Workflow (P0)
**Complete Growth Partner Lifecycle Management:**
- ✅ **GP Onboarding Page (`/admin/gp-onboarding`):** New admin page with 3 tabs:
  - Onboarding: Shows GPs in the onboarding process
  - Active: Shows activated growth partners with referral stats
  - Discontinued: Shows discontinued partners with reasons
- ✅ **Navigation Link:** Added "GP Onboarding" link in admin sidebar under Growth Partners
- ✅ **3-Step Onboarding Process:**
  - Step 1: Personal Information (name, DOB, address, PAN, Aadhar, bank details)
  - Step 2: Contract Signing (contract URL, commission structure - student/school referral %)
  - Step 3: Training (completion notes)
- ✅ **Auto-Onboarding Initiation:** When Growth Partner is marked as "Converted", onboarding record is automatically created
- ✅ **Activation Workflow:**
  - "Activate" button appears when all 3 steps are complete
  - Auto-creates "Growth Partner" role if not exists
  - Creates team_user with GP permissions (students, schools)
  - Marks user as `is_growth_partner: true`
  - Returns temp password copied to clipboard
- ✅ **Partner Stats Display:** Shows referrals, conversions, earnings for active partners
- ✅ **Discontinuation Workflow:** With reason dropdown (Inactivity, Contract Violation, etc.)
- ✅ **Public Tracking Page (`/gp-track/{token}`):** Orange gradient UI for partners to track progress

### Feb 4, 2026 - Reports Overhaul (P0)
**Complete Reports & Analytics Redesign:**
- ✅ **7 Report Tabs:**
  - Overview: Key metrics, revenue, expenses, pipeline funnels
  - B2C (Students): Sales & Marketing, demos, conversions, revenue breakdown
  - B2B (Schools): Lead funnel, conversion rates, **renewal ratio** calculation
  - HR - Team: Applications, hired, hire rate, pipeline distribution
  - Educator HR: Applications, active, performance metrics, top performers
  - Growth Partners: Total, converted, conversion rate, pipeline
  - P&L Report: Revenue/expense breakdown, profit margin, expense management
- ✅ **Date Filtering:**
  - Month selector (past 24 months)
  - Year selector (past 5 years)
  - Custom date range picker (From - To)
- ✅ **Renewal Ratio Calculation:** `Renewed / (Active + Renewed + Lost) * 100%`
- ✅ **Expense Management System:**
  - CRUD operations for expenses
  - 10 categories: salary, marketing, operations, technology, office, travel, commission, utilities, professional_services, other
  - Subcategories for each category
  - Payment method tracking
  - Expense breakdown by category in P&L
- ✅ **Visual Components:**
  - StatCard, ProgressBar, FunnelCard, ConversionCard
  - Color-coded metrics (green for profit, red for expenses)
  - Pipeline visualization with progress bars

### Feb 4, 2026 - School CRM Data Transfer (P1)
**Data Flow Improvements:**
- ✅ **Reference from Previous Stages:** Conversion modal now shows data entered in earlier stages:
  - Quoted Price from meeting stage
  - Selected Offerings
  - Last Meeting Date
  - Expandable Meeting Notes section
- ✅ **openConversionModal Helper:** New function pre-populates onboardData with:
  - Existing onboarding_data
  - Inquiry's selected_offerings
  - Quoted price
  - Contact information

### Feb 4, 2026 - Team Member Reports (P1)
**Performance Metrics Dashboard:**
- ✅ **Reports API Endpoint:** `/api/admin/reports/team-member/{user_id}`
- ✅ **Metrics Tracked:**
  - Students: assigned, converted, conversion rate
  - Schools: assigned, converted, as Relationship Manager, conversion rate
  - Support: total tickets, resolved, resolution rate
  - Demos: total, completed
  - Educators: assigned, active
- ✅ **Reports Modal in AdminTeamOnboarding:**
  - Member info (role, city, status)
  - 4 key metrics cards (Total Leads, Conversions, Demos Done, Tickets Resolved)
  - Detailed breakdown by category (Students, Schools, Support, Educators)
  - Period filter support

### Feb 4, 2026 - Mobile Responsiveness (P1)
**Admin Pages Mobile-Friendly:**
- ✅ **School CRM:** Search, filters, buttons wrap on mobile, tabs scrollable
- ✅ **Student CRM:** Responsive header with flex-wrap
- ✅ **Educators:** Responsive header, buttons stack properly
- ✅ **All Pages:** Tested at 375x800 viewport

**Quoted Price & Offerings for School Leads:**
- ✅ Added Quoted Price (₹) field to Admin School CRM Add Lead form
- ✅ Added Offerings selection checkboxes to Admin School CRM Add Lead form
- ✅ Added Quoted Price (₹) field to public Inquiry page (/add) for schools
- ✅ School card in CRM now displays selected offerings (purple badges)
- ✅ School card shows Quoted Price in blue when not yet converted

### Feb 4, 2026 - School CRM Enhancements

**Selected Offerings & Meeting Display:**
- ✅ School cards now show `selected_offerings` with purple badges
- ✅ If offering title not found in database, displays the offering ID as fallback
- ✅ Meeting date/time displayed in red with Calendar icon: "Meeting: 2026-02-10 at 10:00 AM"

**Raise Ticket Modal Enhancement:**
- ✅ Added Query Type selector with 9 options:
  - Kit Delivery Issue, Payment Query, Teacher Training, Technical Support
  - Curriculum Query, Schedule Change, Contract/Renewal, Feedback/Complaint, Other
- ✅ Clicking query type auto-fills Subject and Description (FAQ content)
- ✅ Submit button disabled until query_type is selected
- ✅ Modal now scrollable (`max-h-[90vh] overflow-y-auto`)

### Feb 4, 2026 - Team Member Filter & Backend Refactoring

**Team Member Filter in Reports:**
- ✅ Added team member dropdown to Reports filter bar
- ✅ Fetches team members from `/api/team-users` endpoint
- ✅ Passes `assigned_to` parameter to all report endpoints
- ✅ Data filters correctly when team member is selected (tested: Students, Schools, Educators, Revenue all update)

**GP Application Visibility:**
- ✅ Verified GP applications from website are visible in Admin GP CRM
- ✅ Website sources correctly shown: `growth_partner_page`, `centers_page`, `about_page`

**Backend Refactoring:**
- ✅ Added TABLE OF CONTENTS comment at top of server.py (lines 52-82)
- ✅ Lists all major sections with line numbers for easy navigation
- ✅ Created `/app/backend/routes/` directory structure for future modularization:
  - `utils.py`: Shared utility functions (date parsing)
  - `reports.py`: Prepared for reports endpoint extraction
  - `onboarding.py`: Prepared for onboarding endpoint extraction

### Feb 4, 2026 - Query Sub-categorization System (P0)

**"Related To" Sub-category Feature:**
- ✅ **Admin Support Panel:** Create Ticket modal now has "Related To" dropdown that changes based on Query Type
- ✅ **Public Inquiry Page (/add):** Query form includes Related To sub-category selection
- ✅ **School CRM Raise Ticket:** Added TICKET_RELATED_TO_OPTIONS with sub-categories for each query type:
  - Kit Delivery: Not Received, Items Missing, Items Damaged, Wrong Items, Delivery Delay
  - Payment Query: Invoice Request, Receipt Request, Payment Pending, Refund Request, EMI Query
  - Teacher Training: Schedule, Materials, Additional Session, Feedback, Certification
  - Technical Support: Equipment Issue, Software Bug, Login Issue, Connectivity, Setup Help
  - And more for: Curriculum, Schedule Change, Contract/Renewal, Feedback/Complaint, Other
- ✅ **Support Center Display:** Tickets now show sub-category badge (e.g., "Kit Delivery → Items Missing")
- ✅ **Backend Support:** All 3 endpoints save `related_to` field:
  - `POST /api/support/queries/create`
  - `POST /api/inquiry/query`
  - `POST /api/schools/{school_id}/raise-ticket`

**Add Lead Modal Scroll Fix:**
- ✅ Fixed non-scrollable modal in School CRM Add Lead dialog
- ✅ Changed DialogContent to `flex flex-col` layout with `max-h-[85vh]`
- ✅ Inner content div uses `overflow-y-auto flex-1 pr-2` for proper scrolling
- ✅ Lead Assignment options (Assign to me / Let admin assign) now visible at bottom

### Feb 5, 2026 - School Card Design Fix & Global Help Button

**School CRM Card Design Overhaul:**
- ✅ Removed amber/yellow "Viewer Only" styling - now clean white cards with subtle gray badge
- ✅ Compact card layout with reduced padding and margins
- ✅ **Icon-only buttons** for common actions (Assign, Note, Delete, Docs, Followup, Archive)
  - Hover tooltips show action names
  - Documents button shows badge count
- ✅ **Primary action buttons** styled as solid colored pills:
  - "Done" (purple), "Convert" (green), "Renewal" (teal), "Renewed" (emerald), "Reactivate" (green)
- ✅ Truncated long text (school name, location, assignee) with ellipsis
- ✅ Compact progress bars and info sections
- ✅ Overall ~30% reduction in card height

**Global "Need Help?" Sticky Button:**
- ✅ Created `/app/frontend/src/components/RaiseQueryButton.jsx`
- ✅ Orange floating button fixed to bottom-right corner on all pages
- ✅ **Context-aware categories:** Automatically detects current page and sets appropriate category:
  - Admin pages: Student/School/Educator Management, Orders, Support, Reports, etc.
  - Public pages: Student/Parent Query, School Query, Educator Query, Demo Booking, etc.
- ✅ **Dynamic sub-categories** based on page context:
  - School Management → Lead Issue, Conversion Issue, Onboarding Issue, Kit Delivery, etc.
  - Student Query → Course Information, Demo Booking, Fee Query, Schedule Query, etc.
- ✅ **Features:** Priority selection, Attach File, Voice Note, text message
- ✅ All submissions routed to Support Center with source tracking (`quick_support_{page}`)

### Feb 4, 2026 - Bug Fixes & Feature Enhancements

**Bug Fixes:**
- ✅ **Team Application Submit** - Fixed `applied_position_id` sending null instead of empty string
- ✅ **GP from Website Visibility** - Verified GP applications from website are visible in Admin GP CRM
- ✅ **School CRM Offering Field** - Added `selected_offerings` to `SchoolInquiryCreate` model
- ✅ **Orders Popup Scrollable** - Added `max-h-[90vh] overflow-y-auto` to Payment Update modal
- ✅ **Educator Onboarding Count** - Fixed tabs checking 'onboarding' instead of 'onboarded' status
- ✅ **Team Interview Actions** - Added 'hired' and 'rejected' buttons to interview_scheduled stage

**Feature Enhancements:**
- ✅ **Support Ticket FAQs** - Added FAQ auto-fill to query type selection in School Tracking Page
- ✅ **Edit Converted School Details** - Added "Edit Details" button for converted (onboarding) schools
- ✅ **Educator Requirement OTP Flow** - Added confirmation screen + OTP verification for requirement applications
- ✅ **Team Applications Onboarding Tabs** - Merged onboarding functionality into Team Applications page with Onboarding/Active/Discontinued tabs

### Feb 4, 2026 - UI Consolidation & Reports Enhancement

**Onboarding Pages Merged into Lead Management:**
- ✅ **Team Applications:** Added Onboarding, Active, Discontinued tabs with color-coded badges
- ✅ **Team Onboarding UI:** Shows progress bar (0-4 steps), step buttons (Personal Info, Bank Details, Contract, Training)
- ✅ **Step Modals:** Clicking incomplete step opens modal with relevant form fields
- ✅ **Activate Modal:** Appears for members with 4/4 steps, allows role selection and creates user account
- ✅ **Discontinue Modal:** Exit formalities checklist with reason dropdown
- ✅ **Reports Modal:** View team member performance metrics from Active tab
- ✅ **Growth Partners:** All onboarding functionality already merged (Onboarding/Active/Discontinued tabs)
- ✅ **Sidebar Cleanup:** Removed separate "GP Onboarding" and "Team Onboarding" links

**Reports Page - Support Tab:**
- ✅ **New Support Tab:** Added to Reports page tabs (Overview, B2C, B2B, HR Team, Educator HR, GP, **Support**, P&L)
- ✅ **Support Metrics Cards:** Total Tickets, Pending, In Progress, Resolved, Resolution Rate
- ✅ **Support Insights Section:** 6 insight cards with data from `/admin/reports/support-insights`
  - Tickets by Category (query_types)
  - Tickets by Priority (priority_breakdown)
  - Tickets by Source (source_breakdown)
  - Avg Resolution Time (avg_resolution_time_hours)
  - Team Performance (team_performance)
  - Status Distribution (status_breakdown)
- ✅ **API Field Mapping:** Fixed frontend to match backend response field names

**Code Changes:**
- `/app/frontend/src/pages/admin/AdminTeamApplications.jsx` - Added onboarding tabs, step modals, activate/discontinue/reports modals
- `/app/frontend/src/pages/admin/AdminReports.jsx` - Added renderSupportTab() function with insight cards
- `/app/frontend/src/pages/admin/AdminDashboard.jsx` - Removed separate onboarding nav links
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

### Team Onboarding (NEW - Feb 4, 2026)
- `POST /api/team-onboarding/init/{application_id}` - Initialize onboarding for hired applicant
- `GET /api/team-onboarding` - List all onboarding records (filter by status)
- `GET /api/team-onboarding/{id}` - Get single onboarding record
- `GET /api/team-onboarding/track/{token}` - Public tracking endpoint
- `POST /api/team-onboarding/{id}/complete-step` - Complete an onboarding step
- `POST /api/team-onboarding/{id}/activate` - Activate team member, create user
- `POST /api/team-onboarding/{id}/discontinue` - Discontinue team member

### GP Onboarding (NEW - Feb 4, 2026)
- `POST /api/gp-onboarding/init/{partner_id}` - Initialize onboarding for converted GP
- `GET /api/gp-onboarding` - List all GP onboarding records (filter by status)
- `GET /api/gp-onboarding/{id}` - Get single GP onboarding record
- `GET /api/gp-onboarding/track/{token}` - Public GP tracking endpoint
- `POST /api/gp-onboarding/{id}/complete-step` - Complete GP onboarding step
- `POST /api/gp-onboarding/{id}/activate` - Activate GP, create team user with GP role
- `POST /api/gp-onboarding/{id}/discontinue` - Discontinue GP

### Expenses (NEW - Feb 4, 2026)
- `GET /api/expenses/categories` - Get expense categories and subcategories
- `POST /api/expenses` - Create new expense
- `GET /api/expenses` - List expenses with date filters
- `PATCH /api/expenses/{id}` - Update expense
- `DELETE /api/expenses/{id}` - Delete expense

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
- ✅ Fix Edit Active Schools bug (COMPLETED Feb 2, 2026)
- ✅ Fix Bulk Upload not updating existing schools (COMPLETED Feb 2, 2026)
- ✅ Team Onboarding Workflow (COMPLETED Feb 4, 2026)
- ✅ GP Onboarding Workflow (COMPLETED Feb 4, 2026)
- ✅ Reports Overhaul with Expense Management (COMPLETED Feb 4, 2026)
- ✅ Merge Onboarding Pages into Lead Management (COMPLETED Feb 4, 2026)
- ✅ Reports Support Tab with Insights (COMPLETED Feb 4, 2026)
- Generate Proposal & MOU PDFs from /add page

### P1 (High)
- ✅ MOU Auto-Complete on school conversion (COMPLETED Feb 2, 2026)
- ✅ School CRM Data Transfer - Ensure data transfers across popups (COMPLETED Feb 4, 2026)
- ✅ Team Member Reports - Performance metrics for active team members (COMPLETED Feb 4, 2026)
- ✅ Mobile Responsiveness - Admin pages mobile-friendly (COMPLETED Feb 4, 2026)
- Team member filters in Reports section
- Implement background scheduler (APScheduler) for AI follow-up emails at 9 AM
- CSV Export for all CRM, Data Center, Reports pages

### P2 (Medium)
- PO generation system with vendor panel
- Real calendar integration (Calendly)
- RBAC enforcement on frontend/backend
- Lead scoring system
- Refactor server.py into modular routers (auth, reports, onboarding, etc.)

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
