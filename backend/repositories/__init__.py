"""
Repositories Package
Exports all domain repositories and the shared BaseRepository.
"""
from repositories.base_repository import BaseRepository
from repositories.user_repository import UserRepository, user_repository
from repositories.school_repository import SchoolRepository, school_repository
from repositories.student_repository import StudentRepository, student_repository
from repositories.educator_repository import EducatorRepository, educator_repository
from repositories.order_repository import OrderRepository, order_repository
from repositories.expense_repository import ExpenseRepository, expense_repository
from repositories.growth_partner_repository import GrowthPartnerRepository, growth_partner_repository
from repositories.task_repository import TaskRepository, task_repository

__all__ = [
    "BaseRepository",
    "UserRepository", "user_repository",
    "SchoolRepository", "school_repository",
    "StudentRepository", "student_repository",
    "EducatorRepository", "educator_repository",
    "OrderRepository", "order_repository",
    "ExpenseRepository", "expense_repository",
    "GrowthPartnerRepository", "growth_partner_repository",
    "TaskRepository", "task_repository",
]
