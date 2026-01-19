# OLL - Skill Education Platform PRD

## Latest Changes (Jan 2026)

### Join Team Page (/join-team) - Updated ✅
- **Resume/CV upload** - Supports PDF and Word documents (Max 5MB)
- **Role** changed from dropdown to **text input field**
- **Requirements section** shows current openings (from admin)
- **Scroll to top** fixed on page load
- Form fields: Name, Email, Phone, City, Role, Experience, Availability, Resume, LinkedIn, Portfolio, Message

### Admin Panel Reorganization ✅

**Navigation Changes:**
- Renamed "Team Users" → **"Users & Roles"**
- **Removed FAQs** from navigation
- Created new **"Settings"** page combining:
  - Cities
  - Centers
  - Blogs (with SEO fields)

**Settings Page Features:**
- Tabbed interface for Cities, Centers, Blogs
- Add/Edit/Delete for all items
- Search functionality
- Blog SEO settings: meta_title, meta_description, keywords
- Publish/Unpublish toggle for blogs

### Growth Partner Page - Fixed ✅
- **Scroll to top** on page load

### Backend Updates ✅
- **File upload endpoint**: `POST /api/upload`
  - Supports PDF, DOC, DOCX, PNG, JPG
  - Max file size: 5MB
  - Returns URL for uploaded files
- Static file serving for uploads

---

## Pending Tasks (From User Request)

### 1. Users & Roles System
- [ ] Create Roles tab in Users page
- [ ] Each role has fixed set of features/permissions
- [ ] Admin can add/edit roles
- [ ] Control which admin pages visible to each role
- [ ] Merge center users into Users page
- [ ] Assign roles to users

### 2. Educators Requirements Button
- [ ] Add "Requirements" button in Educators section
- [ ] Shows current educator requirements in modal

### 3. Team Requirements
- [ ] Add requirements management similar to educators
- [ ] Requirements visible in frontend /join-team page

---

## Completed Features

| Feature | Status | Notes |
|---------|--------|-------|
| Join Team Page | ✅ | Resume upload, text role input |
| Scroll to Top Fix | ✅ | JoinTeamPage, GrowthPartnerPage |
| Admin Settings Page | ✅ | Cities, Centers, Blogs combined |
| FAQs Removed | ✅ | Removed from admin nav |
| File Upload API | ✅ | /api/upload endpoint |
| Blog SEO Fields | ✅ | meta_title, meta_description, keywords |

---

## Test Credentials
- **Admin:** admin@oll.co / Dagaji03@
- **Test OTP:** 1111 (works for all phones)

## Key URLs
- Join Team: /join-team
- Growth Partner: /growth-partner
- Admin Settings: /admin/settings
- Admin Users: /admin/users
