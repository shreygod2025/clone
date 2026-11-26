"""
Growth Partner (GP) Router
Handles franchise & growth partner applications, self-onboarding, and referrals.
"""
from fastapi import APIRouter
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from routes.gp_onboarding import router as _gp_router
    router = _gp_router
except Exception as e:
    router = APIRouter(prefix="/growth-partners", tags=["Growth Partners"])

__all__ = ["router"]
