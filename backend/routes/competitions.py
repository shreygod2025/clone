"""
Competitions & Techfest Router
Handles RoboSumo, RoboRacer, RoboInnovation registrations, problem statements, and submissions.
"""
from fastapi import APIRouter
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from routes.techfest import router as _techfest_router
    router = _techfest_router
except Exception as e:
    router = APIRouter(prefix="/competitions", tags=["Competitions"])

__all__ = ["router"]
