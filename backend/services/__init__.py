"""
Services Package
Exports all domain services handling business logic.
"""
from services.auth_service import AuthService, auth_service
from services.user_service import UserService, user_service
from services.school_service import SchoolService, school_service
from services.student_service import StudentService, student_service
from services.educator_service import EducatorService, educator_service
from services.order_service import OrderService, order_service
from services.expense_service import ExpenseService, expense_service
from services.growth_partner_service import GrowthPartnerService, growth_partner_service
from services.task_service import TaskService, task_service

__all__ = [
    "AuthService", "auth_service",
    "UserService", "user_service",
    "SchoolService", "school_service",
    "StudentService", "student_service",
    "EducatorService", "educator_service",
    "OrderService", "order_service",
    "ExpenseService", "expense_service",
    "GrowthPartnerService", "growth_partner_service",
    "TaskService", "task_service",
]
