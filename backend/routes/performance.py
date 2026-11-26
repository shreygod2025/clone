"""
Performance & Role-Based KPIs Router
Handles employee performance tracking, role metrics, targets, and KPI reporting.
"""
from fastapi import APIRouter
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from routes.kpis import router as _kpis_router
    router = _kpis_router
except Exception as e:
    router = APIRouter(prefix="/kpis", tags=["Performance & KPIs"])

__all__ = ["router"]
