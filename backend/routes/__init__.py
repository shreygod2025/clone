# Routes package
# This package contains modular route handlers for the OLL platform
# 
# Current structure:
# - auth.py: Authentication endpoints (login, register, OTP)
# - shared.py: Shared dependencies (db, auth helpers)
# - reports.py: Report and analytics endpoints (prepared for extraction)
# - onboarding.py: Team and GP onboarding endpoints (prepared for extraction)
# - utils.py: Shared utility functions (date parsing, etc.)
#
# Refactoring in progress - moving endpoints from server.py to route modules

from .utils import get_date_range, parse_date_field
from .shared import db, get_current_user, serialize_doc, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS

__all__ = [
    'get_date_range', 
    'parse_date_field',
    'db',
    'get_current_user',
    'serialize_doc',
    'SECRET_KEY',
    'ALGORITHM',
    'ACCESS_TOKEN_EXPIRE_HOURS'
]
