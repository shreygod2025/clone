# OLL Educational Platform & Web Admin

Enterprise-grade, modular web application and learning management portal built with **FastAPI** (Python 3.11) and **React 18** (Tailwind CSS).

---

## 📁 Project Architecture

The codebase follows a strictly decoupled, layered architecture designed for readability, scalability, and testability.

```
project/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py                # Package root
│   │   ├── server.py                 # FastAPI application instance & middleware
│   │   ├── config.py                 # Central environment & settings configuration
│   │   ├── db.py                     # Motor / MongoDB client connection
│   │   │
│   │   ├── entities/                 # Pure Business Domain Entities (DDD)
│   │   │   ├── __init__.py           # Re-exports all domain entities
│   │   │   ├── user_entity.py        # UserEntity (RBAC & permissions)
│   │   │   ├── student_entity.py     # StudentInquiryEntity (Demo & conversion lifecycle)
│   │   │   ├── school_entity.py      # SchoolEntity (Turnkey partnership lifecycle)
│   │   │   ├── order_entity.py       # OrderEntity, OrderItemEntity (Discounts & totals)
│   │   │   ├── growth_partner_entity.py # GrowthPartnerEntity (Commissions & referral math)
│   │   │   ├── educator_entity.py    # EducatorEntity (Hiring & MOU verification)
│   │   │   └── expense_entity.py     # ExpenseEntity (Budget limits & approvals)
│   │   │
│   │   ├── models/                   # Data Domain Models (Pydantic / Mongo Documents)
│   │   │   ├── __init__.py           # Re-exports all 25+ models
│   │   │   ├── user.py               # UserModel, AdminUser, TeamUser, CenterUser, Role
│   │   │   ├── student.py            # StudentInquiry, DemoSlot, Comment
│   │   │   ├── school.py             # School, SchoolInquiry, SchoolReport
│   │   │   ├── educator.py           # EducatorApplication, EducatorOnboarding
│   │   │   ├── growth_partner.py     # GrowthPartner, GPOnboarding
│   │   │   ├── team.py               # OpenRequirement, TeamApplication, TeamOnboarding
│   │   │   ├── order.py              # Order, OrderItem, Coupon
│   │   │   ├── expense.py            # Expense, ExpenseCategory
│   │   │   ├── content.py            # Blog, FAQ, SupportTicket, AboutContent
│   │   │   └── location.py           # City, Center
│   │   │
│   │   ├── schemas/                  # API Transport DTOs & Validation Schemas
│   │   │   ├── __init__.py           # Re-exports all schemas
│   │   │   ├── user_schema.py        # Login, Token, User CRUD, Role schemas
│   │   │   ├── student_schema.py     # Inquiry, DemoSlot, Comment schemas
│   │   │   ├── school_schema.py      # School lead, brochure, report schemas
│   │   │   ├── educator_schema.py    # Educator application & onboarding schemas
│   │   │   ├── growth_partner_schema.py # GP application & onboarding schemas
│   │   │   ├── team_schema.py        # Job requirements & applicant schemas
│   │   │   ├── order_schema.py       # Order, Cart item, Voucher validation schemas
│   │   │   ├── expense_schema.py     # Expense & Category schemas
│   │   │   ├── content_schema.py     # Blog, FAQ, Support ticket schemas
│   │   │   └── location_schema.py    # City & Center schemas
│   │   │
│   │   ├── routes/                   # Route controllers (grouped by domain)
│   │   │   ├── __init__.py           # Route aggregator (/api router)
│   │   │   ├── auth.py               # /api/auth (Login, Verify, OTPs)
│   │   │   ├── user_routes.py        # /api/users (User management)
│   │   │   └── school.py             # /api/school-inquiries, offerings
│   │   │
│   │   ├── services/                 # Core business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py       # JWT creation/decoding, bcrypt hashing
│   │   │   ├── user_service.py       # User business logic
│   │   │   └── school_service.py     # School lead processing
│   │   │
│   │   ├── repositories/             # Database access layer (CRUD)
│   │   │   ├── __init__.py
│   │   │   ├── user_repository.py    # Users collection queries
│   │   │   └── school_repository.py  # Schools & inquiries queries
│   │   │
│   │   ├── middleware/               # HTTP request/response interceptors
│   │   │   ├── __init__.py
│   │   │   ├── auth_middleware.py    # Bearer token validation
│   │   │   ├── logging_middleware.py # Request latency & access logger
│   │   │   └── error_middleware.py   # Global JSON error formatting
│   │   │
│   │   ├── dependencies/             # FastAPI dependency injection
│   │   │   ├── __init__.py
│   │   │   ├── auth_dependency.py    # get_current_user, require_permission
│   │   │   └── database_dependency.py# get_db
│   │   │
│   │   ├── utils/                    # Shared utility functions
│   │   │   ├── __init__.py
│   │   │   ├── helpers.py            # UUIDs, phone cleaning, formatting
│   │   │   └── validators.py         # Phone & email validation regex
│   │   │
│   │   └── tests/                    # Backend test suite
│   │       ├── __init__.py
│   │       ├── test_routes.py        # Route integration tests
│   │       └── test_services.py      # Service unit tests
│   │
│   ├── migrations/                   # Database migration scripts
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Containerization specification
│   └── .env                          # Backend environment variables
│
├── frontend/
│   ├── public/                       # Static public assets, robots.txt, sitemap
│   │
│   ├── src/
│   │   ├── assets/                   # Static images, vectors, logos
│   │   │
│   │   ├── components/               # Modular UI components
│   │   │   ├── common/               # Shared indicators (Spinner, ScrollToTop)
│   │   │   ├── layout/               # Shell components (Navbar, Footer)
│   │   │   └── reusable/             # Generic primitives (Button, Card, Modal)
│   │   │
│   │   ├── pages/                    # Route entry points
│   │   │   ├── Home.jsx              # Landing page
│   │   │   ├── Login.jsx             # Auth portal
│   │   │   ├── Dashboard.jsx         # Administrative dashboard
│   │   │   └── school/               # Product landing pages
│   │   │
│   │   ├── context/                  # Centralized Context API Providers
│   │   │   ├── index.js              # Barrel export for all contexts & hooks
│   │   │   ├── AppContext.jsx        # Master provider (network, banners)
│   │   │   ├── AuthContext.jsx       # Admin session & permission context
│   │   │   ├── UserAuthContext.jsx   # Student/User OTP session context
│   │   │   ├── SchoolContext.jsx     # School program & inquiry state
│   │   │   └── CartContext.jsx       # E-commerce cart context
│   │   │
│   │   ├── hooks/                    # Reusable Custom React Hooks
│   │   │   ├── useAuth.js            # Admin authentication hook
│   │   │   ├── useUserAuth.js        # Student/User authentication hook
│   │   │   ├── useSchool.js          # School lead & brochure modal hook
│   │   │   └── useCart.js            # Shopping cart management hook
│   │   │
│   │   ├── services/                 # API Clients (Axios)
│   │   │   ├── api.js                # Base Axios instance with token interceptors
│   │   │   ├── authService.js        # Admin & student login calls
│   │   │   ├── userService.js        # Student profile & booking calls
│   │   │   └── schoolService.js      # School lead submission calls
│   │   │
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx         # Central route registry & ProtectedRoute gate
│   │   │
│   │   ├── utils/
│   │   │   └── helpers.js            # Currency formatting, dates, slugification
│   │   │
│   │   ├── styles/
│   │   │   └── global.css            # Global CSS variables & layout resets
│   │   │
│   │   ├── App.jsx                   # Application root with Provider wrapping
│   │   └── main.jsx                  # React 18 DOM mount entrypoint
│   │
│   ├── package.json
│   └── .env
│
├── .gitignore
├── docker-compose.yml                # Full stack container orchestration
└── README.md
```

---

## ⚛️ Frontend Context API Usage

Contexts are strictly isolated in `frontend/src/context/` and consumed via dedicated custom hooks in `frontend/src/hooks/`:

### 1. `useAuth()` (Admin Authentication)
```jsx
import { useAuth } from '@/hooks/useAuth';

function AdminNavbar() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) return null;
  return <div>Welcome, {user.name} <button onClick={logout}>Logout</button></div>;
}
```

### 2. `useSchool()` (School Leads & Program State)
```jsx
import { useSchool } from '@/hooks/useSchool';

function DemoRequestButton({ programId }) {
  const { openBrochureModal, submitInquiry } = useSchool();

  return (
    <button onClick={() => openBrochureModal(programId)}>
      Download Curriculum Brochure
    </button>
  );
}
```

### 3. `useCart()` (E-Commerce Robotics Kits)
```jsx
import { useCart } from '@/hooks/useCart';

function ProductCard({ product }) {
  const { addToCart } = useCart();
  return <button onClick={() => addToCart(product)}>Add to Cart</button>;
}
```

---

## 🐍 Backend Architecture & API Flow

Request handling follows a clean unidirectional flow:

```
Request → Middleware (Logging & Auth) → Routes (/api/...) → Dependencies (Permission Check) → Services (Business Logic) → Repositories (CRUD) → MongoDB
```

### 1. Starting the Backend
```bash
cd backend
uvicorn app.server:app --reload --port 8000
```
Interactive Swagger Documentation is automatically available at:
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

### 2. Running Unit & Integration Tests
```bash
cd backend
pytest app/tests/
```

---

## 🐳 Running with Docker Compose

To start MongoDB, the FastAPI backend, and the React frontend simultaneously:

```bash
docker-compose up --build
```

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **MongoDB:** `localhost:27017`
