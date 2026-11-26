"""
Validators for Input Sanitization
"""
import re

PHONE_REGEX = re.compile(r'^[6-9]\d{9}$')
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')

def validate_indian_phone(phone: str) -> bool:
    """Validate 10-digit Indian mobile phone number."""
    clean = re.sub(r'\D', '', phone)
    if len(clean) == 12 and clean.startswith('91'):
        clean = clean[2:]
    return bool(PHONE_REGEX.match(clean))

def validate_email(email: str) -> bool:
    """Validate email address format."""
    return bool(EMAIL_REGEX.match(email.strip()))
