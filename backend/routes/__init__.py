# Routes package
# This package contains modular route handlers for the OLL platform
# 
# Current structure:
# - reports.py: Report and analytics endpoints (prepared for extraction)
# - onboarding.py: Team and GP onboarding endpoints (prepared for extraction)
# - utils.py: Shared utility functions (date parsing, etc.)
#
# Note: Most endpoints are still in server.py for backward compatibility
# New endpoints should be added to the appropriate router file

from .utils import get_date_range, parse_date_field

__all__ = ['get_date_range', 'parse_date_field']
