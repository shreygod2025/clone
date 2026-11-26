"""
Schemas Package
Central barrel export for all API DTO schemas across all modules.
"""
from schemas.user_schema import (
    LoginRequest, TokenResponse, OTPRequest, OTPVerifyRequest,
    UserCreate, UserUpdate, UserResponse, RoleCreate, RoleResponse
)
from schemas.student_schema import (
    StudentInquiryCreate, StudentInquiryUpdate, StudentInquiryResponse,
    CommentCreate, CommentResponse, DemoSlotCreate, DemoSlotResponse
)
from schemas.school_schema import (
    SchoolCreate, SchoolUpdate, SchoolResponse,
    SchoolInquiryCreate, SchoolInquiryUpdate, SchoolInquiryResponse,
    BrochureDownloadRequest, SchoolReportCreate
)
from schemas.educator_schema import (
    EducatorApplicationCreate, EducatorApplicationUpdate, EducatorApplicationResponse,
    EducatorOnboardingCreate, EducatorOnboardingUpdate, EducatorOnboardingResponse
)
from schemas.growth_partner_schema import (
    GrowthPartnerCreate, GrowthPartnerUpdate, GrowthPartnerResponse,
    GPOnboardingCreate, GPOnboardingUpdate, GPOnboardingResponse
)
from schemas.team_schema import (
    OpenRequirementCreate, OpenRequirementUpdate, OpenRequirementResponse,
    TeamApplicationCreate, TeamApplicationUpdate, TeamApplicationResponse,
    TeamOnboardingCreate, TeamOnboardingUpdate, TeamOnboardingResponse
)
from schemas.order_schema import (
    OrderItemSchema, OrderCreate, OrderUpdate, OrderResponse,
    CouponCreate, CouponValidateRequest, CouponResponse
)
from schemas.expense_schema import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    ExpenseCategoryCreate, ExpenseCategoryResponse
)
from schemas.content_schema import (
    BlogCreate, BlogUpdate, BlogResponse,
    FAQCreate, FAQUpdate, FAQResponse,
    SupportTicketCreate, SupportTicketUpdate, SupportTicketResponse,
    AboutContentUpdate
)
from schemas.location_schema import (
    CityCreate, CityUpdate, CityResponse,
    CenterCreate, CenterUpdate, CenterResponse
)

__all__ = [
    # User & Auth
    "LoginRequest", "TokenResponse", "OTPRequest", "OTPVerifyRequest",
    "UserCreate", "UserUpdate", "UserResponse", "RoleCreate", "RoleResponse",
    # Student & Inquiry
    "StudentInquiryCreate", "StudentInquiryUpdate", "StudentInquiryResponse",
    "CommentCreate", "CommentResponse", "DemoSlotCreate", "DemoSlotResponse",
    # School
    "SchoolCreate", "SchoolUpdate", "SchoolResponse",
    "SchoolInquiryCreate", "SchoolInquiryUpdate", "SchoolInquiryResponse",
    "BrochureDownloadRequest", "SchoolReportCreate",
    # Educator
    "EducatorApplicationCreate", "EducatorApplicationUpdate", "EducatorApplicationResponse",
    "EducatorOnboardingCreate", "EducatorOnboardingUpdate", "EducatorOnboardingResponse",
    # Growth Partner
    "GrowthPartnerCreate", "GrowthPartnerUpdate", "GrowthPartnerResponse",
    "GPOnboardingCreate", "GPOnboardingUpdate", "GPOnboardingResponse",
    # Team
    "OpenRequirementCreate", "OpenRequirementUpdate", "OpenRequirementResponse",
    "TeamApplicationCreate", "TeamApplicationUpdate", "TeamApplicationResponse",
    "TeamOnboardingCreate", "TeamOnboardingUpdate", "TeamOnboardingResponse",
    # Order & Payments
    "OrderItemSchema", "OrderCreate", "OrderUpdate", "OrderResponse",
    "CouponCreate", "CouponValidateRequest", "CouponResponse",
    # Expense
    "ExpenseCreate", "ExpenseUpdate", "ExpenseResponse",
    "ExpenseCategoryCreate", "ExpenseCategoryResponse",
    # Content & Support
    "BlogCreate", "BlogUpdate", "BlogResponse",
    "FAQCreate", "FAQUpdate", "FAQResponse",
    "SupportTicketCreate", "SupportTicketUpdate", "SupportTicketResponse",
    "AboutContentUpdate",
    # Location
    "CityCreate", "CityUpdate", "CityResponse",
    "CenterCreate", "CenterUpdate", "CenterResponse",
]
