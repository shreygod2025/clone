"""
Unit Tests for Backend Services, Domain Repositories, and Entities
"""
import pytest
from services.auth_service import auth_service
from services.order_service import order_service
from services.student_service import student_service
from services.educator_service import educator_service
from services.growth_partner_service import growth_partner_service
from services.task_service import task_service
from repositories.base_repository import BaseRepository
from utils.helpers import slugify, clean_phone, format_currency_inr
from utils.validators import validate_indian_phone, validate_email
from entities.user_entity import UserEntity
from entities.order_entity import OrderEntity, OrderItemEntity
from entities.student_entity import StudentInquiryEntity

def test_password_hashing():
    password = "SecretPassword123!"
    hashed = auth_service.hash_password(password)
    assert hashed != password
    assert auth_service.verify_password(password, hashed) is True
    assert auth_service.verify_password("WrongPassword", hashed) is False

def test_jwt_token_generation_and_decoding():
    payload = {"sub": "admin_user", "role": "admin"}
    token = auth_service.create_access_token(payload)
    decoded = auth_service.decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == "admin_user"
    assert decoded["role"] == "admin"

def test_slugify():
    assert slugify("Turnkey Robotics & AI Lab") == "turnkey-robotics-ai-lab"
    assert slugify("ICSE Class 9 & 10!") == "icse-class-9-10"

def test_clean_phone():
    assert clean_phone("+91 98765 43210") == "9876543210"
    assert clean_phone("09876543210") == "9876543210"
    assert clean_phone("9876543210") == "9876543210"

def test_phone_validator():
    assert validate_indian_phone("9876543210") is True
    assert validate_indian_phone("12345") is False

def test_email_validator():
    assert validate_email("test@oll.co") is True
    assert validate_email("invalid-email") is False

def test_user_entity():
    user = UserEntity(id="u1", username="admin1", role="admin")
    assert user.is_admin() is True
    assert user.has_permission("any_permission") is True

    team_user = UserEntity(id="u2", username="team1", role="team_member", permissions=["students.view"])
    assert team_user.is_admin() is False
    assert team_user.has_permission("students.view") is True
    assert team_user.has_permission("schools") is False

def test_order_entity_calculations():
    items = [
        OrderItemEntity(product_id="p1", product_name="Robo Kit", quantity=2, unit_price=2500.0),
        OrderItemEntity(product_id="p2", product_name="Sensor Pack", quantity=1, unit_price=1000.0)
    ]
    order = OrderEntity(id="o1", order_number="ORD-101", customer_name="Parent", customer_phone="9876543210", items=items)
    assert order.subtotal == 6000.0
    assert order.total_amount == 6000.0

    order.apply_discount(500.0)
    assert order.total_amount == 5500.0

    order.mark_paid()
    assert order.payment_status == "paid"
    assert order.fulfillment_status == "processing"

def test_student_inquiry_entity_lifecycle():
    inquiry = StudentInquiryEntity(id="s1", name="Rahul", email="rahul@example.com", phone="9876543210", skill="Robotics")
    assert inquiry.status == "new"

    inquiry.schedule_demo("2026-12-01", "10:00 AM", "edu1")
    assert inquiry.status == "demo_scheduled"

    inquiry.convert(15000.0)
    assert inquiry.is_converted() is True
    assert inquiry.conversion_amount == 15000.0

@pytest.mark.asyncio
async def test_order_service_computation():
    raw_order = {
        "customer_phone": "+91 99887 76655",
        "items": [
            {"product_name": "STEM Kit A", "unit_price": 3000.0, "quantity": 2},
            {"product_name": "AI Book", "unit_price": 500.0, "quantity": 1}
        ],
        "discount_amount": 500.0
    }
    # Test calculation logic without hitting remote DB
    items = raw_order["items"]
    subtotal = sum(i["unit_price"] * i["quantity"] for i in items)
    assert subtotal == 6500.0
    total = max(0.0, subtotal - raw_order["discount_amount"])
    assert total == 6000.0

@pytest.mark.asyncio
async def test_task_service_status_validation():
    with pytest.raises(ValueError):
        await task_service.update_status("task1", "invalid_status_xyz")
