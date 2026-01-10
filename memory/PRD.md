# OLL Platform - Product Requirements Document

## Original Problem Statement
Build a high-conversion, multi-user skill-education platform for OLL that:
- Clearly separates Students/Parents, Educators, and Schools
- Uses funnel-based flows, not generic pages
- Is SEO-first, scalable, and backend-driven
- Has a powerful admin + CRM system

## User Personas
1. **Students/Parents** - Seeking skill education (Robotics, Coding, AI, etc.)
2. **Educators** - Looking to join OLL's teaching network
3. **Schools** - Wanting to partner with OLL for skill programs
4. **Admins** - Managing CRM, content, and operations

## What's Been Implemented

### Latest Updates (January 10, 2026)

**SEO Course Funnel Pages (NEW):**
- ✅ Created `/courses` page listing all 5 courses with beautiful card grid
- ✅ Created individual course pages: `/courses/robotics`, `/courses/coding`, `/courses/ai`, `/courses/entrepreneurship`, `/courses/financial`
- ✅ Each course page includes:
  - SEO meta tags (title, description, keywords, og:tags)
  - Hero section with gradient, image, and CTAs
  - Benefits section (4 benefits per course)
  - Curriculum accordion (4 modules per course)
  - Student outcomes section
  - Testimonials section (2 per course)
  - FAQ accordion (3 FAQs per course)
  - "Explore Other Courses" section
  - Footer with navigation links
- ✅ "Book Free Demo" button passes skill as URL parameter (`/student?skill=robotics`)
- ✅ Student funnel recognizes skill parameter and skips to city step (Step 3)
- ✅ Installed `react-helmet-async` for SEO management
- ✅ Added "Courses" link to landing page navigation (desktop & mobile)

**Previous Updates:**
- ✅ Dynamic student funnel (city → mode selection)
- ✅ Admin: Cities & Centers management with CRUD
- ✅ Admin: Educator CRM pipeline
- ✅ Public `/centers` page
- ✅ All funnel forms fully responsive on mobile
- ✅ About page with Shark Tank India & KBC timeline

### Technical Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI + react-helmet-async
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT with bcrypt password hashing
- **Design**: Glassmorphism with OLL brand colors (Red #D63031, Navy #1E3A5F)

## Admin Credentials
- **Email**: admin@oll.co
- **Password**: Dagaji03@
- **Login URL**: /admin/login

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Email notifications integration
- [ ] WhatsApp automation for confirmations
- [ ] Real calendar integration (replace MOCKED demo booking)

### P1 - High Priority
- [x] ~~SEO course funnel pages~~ ✅ DONE
- [ ] City-based school landing pages
- [ ] Content Management in admin (Blogs, FAQs, About)
- [ ] Export leads to CSV

### P2 - Medium Priority
- [ ] Analytics dashboard
- [ ] Role-based access control
- [ ] Bulk status updates

## MOCKED Features
- **Calendar/Demo Booking**: Shows confirmation message only, no real calendar integration

## Course Data Structure
```javascript
// /app/frontend/src/pages/courses/CourseData.js
COURSES = {
  robotics: { ... },
  coding: { ... },
  ai: { ... },
  entrepreneurship: { ... },
  financial: { ... }
}
// Each course has: id, name, emoji, tagline, description, metaTitle, metaDescription,
// heroImage, color, gradient, ageGroups, duration, classSize, curriculum[], 
// benefits[], outcomes[], testimonials[], faqs[]
```

## File Structure
```
/app/
├── backend/
│   ├── server.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── courses/              # NEW
│   │   │   │   ├── CourseData.js     # Course definitions
│   │   │   │   ├── CoursePage.jsx    # Individual course page
│   │   │   │   └── CoursesListPage.jsx # All courses listing
│   │   │   ├── admin/
│   │   │   │   ├── AdminCities.jsx
│   │   │   │   ├── AdminCenters.jsx
│   │   │   │   ├── AdminStudentCRM.jsx
│   │   │   │   ├── AdminSchoolCRM.jsx
│   │   │   │   ├── AdminEducators.jsx
│   │   │   │   └── AdminRequirements.jsx
│   │   │   ├── StudentFunnel.jsx     # Updated: URL skill parameter
│   │   │   ├── LandingPage.jsx       # Updated: Courses nav link
│   │   │   ├── CentersPage.jsx
│   │   │   ├── AboutPage.jsx
│   │   │   └── ...
│   │   ├── index.js                  # Updated: HelmetProvider wrapper
│   │   └── App.js                    # Updated: Course routes
│   └── public/
│       └── index.html                # Updated: data-rh for SEO
└── memory/
    └── PRD.md
```

## Routes
### Public Routes
- `/` - Landing page
- `/student` - Student inquiry funnel
- `/student?skill=robotics` - Pre-selected skill funnel
- `/educator` - Educator application funnel
- `/school` - School partnership funnel
- `/courses` - All courses listing (NEW)
- `/courses/:courseSlug` - Individual course page (NEW)
- `/centers` - OLL centers listing
- `/about` - About OLL
- `/blogs` - Blog listing
- `/blogs/:slug` - Blog detail
- `/faq` - FAQs

### Admin Routes
- `/admin/login` - Admin login
- `/admin` - Dashboard
- `/admin/students` - Student CRM
- `/admin/schools` - School CRM
- `/admin/educators` - Educator CRM
- `/admin/requirements` - Open positions
- `/admin/cities` - City management
- `/admin/centers` - Center management
- `/admin/blogs` - Blog management
- `/admin/faqs` - FAQ management

## Last Update
- **Date**: January 10, 2026
- **Changes**: 
  1. Created SEO Course Funnel Pages (5 courses)
  2. Added courses list page at /courses
  3. Individual course pages with full SEO optimization
  4. Pre-selected skill flow from course → student funnel
  5. Added Courses link to navbar
- **Testing**: Verified via testing agent (100% pass rate)
