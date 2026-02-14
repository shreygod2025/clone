# OLL - Skill Education Platform
## Product Requirements Document

### Original Problem Statement
Build a high-conversion, multi-user skill-education platform for "OLL" with separate funnels for Students/Parents, Educators, and Schools. The platform must be SEO-first and include a powerful backend admin panel and CRM system.

### Core Requirements
- **Global Structure:** Landing Page, Learner/Educator/School Funnels, Offerings, About OLL, Blog, Admin Panel
- **SEO & Social Sharing:** Unique titles, meta descriptions, H1 tags, canonical URLs, OG tags
- **Admin Panel & RBAC:** Users & Roles management, custom permissions
- **Content Management:** Dynamic blog management
- **Funnels & Login:** OTP-based login for all user types
- **Admin CRM:** Full school management with bulk import, onboarding workflows, inquiry management

### Architecture
```
/app/
├── backend/
│   └── server.py              # FastAPI backend with all endpoints
└── frontend/
    ├── src/
    │   ├── App.js             # Routes and main app structure
    │   ├── pages/
    │   │   ├── admin/         # Admin panel pages
    │   │   ├── public/        # Public pages (tracking, payment)
    │   │   ├── school/        # School-specific pages
    │   │   └── student/       # Student dashboard
    │   └── components/        # Reusable UI components
```

### Key Integrations
- **Cashfree:** Payment gateway for individual and school student payments
- **AiSensy:** WhatsApp messaging
- **Cloudinary:** File storage
- **Gmail SMTP:** Email notifications (BLOCKED - awaiting credentials)
- **Jitsi Meet:** Video conferencing

### Database Collections (MongoDB)
- `school_inquiries` - School CRM data with onboarding workflows
- `student_inquiries` - Student/parent leads
- `orders` - Centralized payment orders
- `student_payments` - Individual student payments
- `school_student_payments` - School-based student payments
- `school_onboarding` - Detailed onboarding records

---

## CHANGELOG

### February 14, 2026

#### School Student Payments - Bug Fixes
**Fixed Issues:**
1. ✅ Payment links now appear on public tracking page for schools with online payment mode
2. ✅ Edit modal retains "Online" payment mode correctly  
3. ✅ Edit modal hides tranches and shows deadline date for online mode
4. ✅ Convert/Renew modal hides tranches and shows deadline date for online mode
5. ✅ Backend returns `school_id` in tracking API response
6. ✅ Fixed API endpoint in SchoolStudentPayment.jsx (was missing /api prefix)

**New Files:**
- `/app/frontend/src/pages/public/SchoolPaymentTrackerPublic.jsx` - Public tracker page

**Modified Files:**
- `backend/server.py` - Added school_id and deadline_date to tracking response
- `AdminSchoolCRM.jsx` - Updated Edit, Convert, Renew modals for online payment handling
- `SchoolTrackingPage.jsx` - Added payment link buttons
- `SchoolStudentPayment.jsx` - Fixed API endpoint
- `App.js` - Added route for public tracker

---

## ROADMAP

### P0 - Critical (Current)
- [x] Individual Student Payment Flow
- [x] School Student Payment Flow (Initial)
- [x] Fix School Student Payment bugs (links, edit modal, convert/renew modal)

### P1 - High Priority
- [ ] Fix recurring file download issue (wrong name/type)
- [ ] Generate Proposal & MOU PDFs
- [ ] Gmail SMTP integration (blocked on credentials)

### P2 - Medium Priority
- [ ] CSV Export for all major tables
- [ ] Finalize "Viewer" feature for support queries
- [ ] Cron job setup instructions for production

### P3 - Low Priority/Future
- [ ] Refactor server.py into modules
- [ ] Refactor AdminSchoolCRM.jsx into components
- [ ] AI Follow-up Emails background job
- [ ] Table of Contents for rich text editor
- [ ] PO generation with vendor panel
- [ ] RBAC enforcement on backend
- [ ] Lead scoring system
- [ ] SMS/Email session reminders

---

## Known Issues
1. **File Downloads:** Downloads have incorrect names/types (recurring - 3+ attempts)
2. **Jitsi Moderator:** Limited control with public meet.jit.si server
3. **Gmail SMTP:** Non-functional, blocked on user credentials
