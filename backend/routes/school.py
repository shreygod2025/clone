"""
School and Lab Program Routes
Endpoints for school leads, lab inquiries, brochure downloads, and school CRM.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from schemas.school_schema import SchoolInquiryCreate, BrochureDownloadRequest
from services.school_service import school_service
from dependencies.auth_dependency import require_permission

router = APIRouter(prefix="", tags=["School Programs"])

@router.post("/school-inquiries", status_code=status.HTTP_201_CREATED)
async def create_school_inquiry(req: SchoolInquiryCreate):
    """Submit school lab demo or partnership inquiry."""
    inquiry = await school_service.create_inquiry(req.dict())
    return {"success": True, "data": inquiry, "message": "Inquiry submitted successfully"}

@router.get("/school-inquiries")
async def list_school_inquiries(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_permission("schools"))
):
    """List all school inquiries for CRM (Admin protected)."""
    return await school_service.list_inquiries(skip=skip, limit=limit)

@router.post("/school-inquiries/brochure")
async def download_school_brochure(req: BrochureDownloadRequest):
    """Capture school brochure download lead."""
    data = req.dict()
    data["type"] = "brochure_download"
    await school_service.create_inquiry(data)
    return {
        "success": True,
        "message": "Brochure download recorded",
        "brochure_url": "/static/brochures/oll_robotics_ai_lab_brochure.pdf"
    }

@router.get("/school-offerings")
async def list_school_offerings():
    """Return all active school curriculum and turnkey lab tiers."""
    return [
        {
            "id": "robotics-ai-lab",
            "title": "Turnkey Robotics & AI Lab",
            "grades": "Grades 1 to 12",
            "highlights": ["30+ Kit Types", "National Competition Access", "Trainer Included"]
        },
        {
            "id": "csl",
            "title": "Composite Skill Lab (CBSE Skill-75/2024)",
            "grades": "Grades 6 to 10",
            "highlights": ["CBSE Compliant", "Multi-disciplinary modules", "Comprehensive Assessment"]
        },
        {
            "id": "icse-code-66",
            "title": "ICSE Robotics & AI (Code 66)",
            "grades": "Classes 9 & 10",
            "highlights": ["Board Curriculum Aligned", "Practical Activity Kits", "100 Marks Preparation"]
        },
        {
            "id": "after-school-club",
            "title": "After-School Robo Club",
            "grades": "Grades 3 to 10",
            "highlights": ["Zero School Investment", "Revenue Sharing", "Certified Mentors"]
        }
    ]
