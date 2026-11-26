"""
Utility Helpers for Backend API
"""
import re
import uuid
from typing import Any, Dict
from datetime import datetime, timezone

def generate_uuid() -> str:
    """Generate a clean UUID string."""
    return str(uuid.uuid4())

def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)

def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')

def clean_phone(phone: str) -> str:
    """Extract standard 10-digit Indian mobile number."""
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('91') and len(digits) == 12:
        return digits[2:]
    elif digits.startswith('0') and len(digits) == 11:
        return digits[1:]
    return digits[-10:] if len(digits) >= 10 else digits

def format_currency_inr(amount: float) -> str:
    """Format float into INR string format."""
    return f"₹{amount:,.0f}"
