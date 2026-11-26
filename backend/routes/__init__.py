"""
API Routes Package
Aggregates all modular route blueprints into a unified /api router.
Provides shared dependencies and backwards compatibility exports.
"""
from fastapi import APIRouter
import sys
import logging

logger = logging.getLogger("routes")

# Ensure 'routes' alias points to this module for legacy imports
sys.modules['routes'] = sys.modules[__name__]

# ── Shared Dependencies & Utilities ─────────────────────────────────────────
from .utils import get_date_range, parse_date_field
from .shared import db, get_current_user, serialize_doc, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS

# ── Master API Router ────────────────────────────────────────────────────────
api_router = APIRouter(prefix="/api")

# List of route modules to mount into api_router
_ROUTE_MODULES = [
    # Core Auth & Identity
    'auth',
    'user_routes',
    'users',
    'team',
    
    # Students & CRM
    'students',
    'school',
    'schools',
    'school_emails',
    
    # Educators & HR
    'educators',
    'educator_interview',
    'educator_reports',
    'educator_salary_sync',
    'salaries',
    
    # Partners & Growth
    'growth_partners',
    'gp_onboarding',
    'simple_partners',
    'franchise',
    
    # Performance, Tasks & Operations
    'performance',
    'tasks',
    'task_reminders',
    'projects',
    'reports',
    'field_reports',
    'live_dashboard',
    'team_reports',
    'team_reports_cron',
    'kpis',
    'telecalling',
    'accounts_scheduler',
    'daily_report',
    
    # Notifications & Broadcasts
    'notifications',
    'inapp_notifications',
    'broadcasts',
    'scheduled_tasks',
    
    # Commerce, Orders & Expenses
    'expenses',
    'orders',
    'payments',
    'custom_invoices',
    'coupons',
    'shop',
    'public_receipts',
    
    # Academics, Courses & AI
    'future_skills',
    'workshops',
    'discover',
    'lms_api',
    'ai_chat',
    'faq_chat',
    'faq_settings',
    'ai_foundations',
    
    # Competitions & Events
    'competitions',
    'techfest',
    'techfest_submission_portal',
    'techfest_bulk_email',
    'techfest_emails',
    'techfest_permission_letter',
    'friendship_day',
    'summer_camp',
    
    # Communications & Integrations
    'whatsapp_link',
    'whatsapp_twilio',
    'gmail_bot',
    'social_media',
    'social_media_intern',
    
    # System & Data Services
    'central_database',
    'data_export',
    'db_backup',
    'external_mongo_dump',
    'admin_keys',
    'checkin_api',
    'link_preview',
    'share_links',
    'proposal_pdf',
    'support',
    'unified_search',
    'jobs',
    'misc',
    'success_stories',
    'vendor_link_migration'
]

# Dynamically mount all existing routers
for _mod_name in _ROUTE_MODULES:
    try:
        _mod = __import__(f"routes.{_mod_name}", fromlist=["router"])
        if hasattr(_mod, "router"):
            api_router.include_router(_mod.router)
    except Exception as _e:
        logger.warning(f"Could not load router routes.{_mod_name}: {_e}")

__all__ = [
    'api_router',
    'get_date_range', 
    'parse_date_field',
    'db',
    'get_current_user',
    'serialize_doc',
    'SECRET_KEY',
    'ALGORITHM',
    'ACCESS_TOKEN_EXPIRE_HOURS'
]
