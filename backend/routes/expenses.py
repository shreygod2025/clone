"""
School Expenses routes.
Endpoints: /school-expenses/*, /expenses/*
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import httpx
import os
import re
import logging

from .shared import db, get_current_user

EXPENSE_CATEGORIES = [
    {"id": "kit_cost", "name": "Kit Cost", "description": "Learning kits and materials for students"},
    {"id": "teacher_cost", "name": "Teacher Cost", "description": "Teacher salary and training costs"},
    {"id": "logistics_cost", "name": "Logistics Cost", "description": "Delivery and shipping expenses"},
    {"id": "books_cost", "name": "Books Cost", "description": "Textbooks and workbooks"},
    {"id": "gp_share", "name": "GP Share", "description": "Growth Partner commission share"},
    {"id": "school_share", "name": "School Share", "description": "School's revenue share"},
    {"id": "printing_certification", "name": "Printing / Certification Cost", "description": "Printing and certification expenses"},
    {"id": "renewal_commission_team", "name": "Renewal Commission (Team)", "description": "Team renewal commission"},
    {"id": "renewal_commission_teachers", "name": "Renewal Commission (Teachers)", "description": "Teacher renewal commission"},
    {"id": "marketing_cost", "name": "Marketing Cost", "description": "Marketing and promotional expenses"},
    {"id": "technology_cost", "name": "Technology Cost", "description": "Software and technology costs"},
    {"id": "other", "name": "Other Expenses", "description": "Miscellaneous expenses"},
]

router = APIRouter()

@router.get("/school-expenses/categories")
async def get_school_expense_categories(user: dict = Depends(get_current_user)):
    """Get all available expense categories"""
    return EXPENSE_CATEGORIES


@router.get("/school-expenses")
async def get_all_school_expenses(
    school_id: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all expenses with optional filters"""
    query = {}
    
    if school_id:
        query["school_id"] = school_id
    if category:
        query["category"] = category
    if start_date:
        query["expense_date"] = {"$gte": start_date}
    if end_date:
        if "expense_date" in query:
            query["expense_date"]["$lte"] = end_date
        else:
            query["expense_date"] = {"$lte": end_date}
    
    expenses = await db.school_expenses.find(query, {"_id": 0}).sort("expense_date", -1).to_list(1000)
    return expenses


@router.get("/school-expenses/summary")
async def get_school_expenses_summary(
    school_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get expense summary by school and category"""
    match_stage = {}
    if school_id:
        match_stage["school_id"] = school_id
    
    # Aggregate by school
    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {
            "$group": {
                "_id": {
                    "school_id": "$school_id",
                    "school_name": "$school_name",
                    "category": "$category"
                },
                "total_amount": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.school_name": 1, "_id.category": 1}}
    ]
    
    results = await db.school_expenses.aggregate(pipeline).to_list(1000)
    
    # Organize by school
    schools_summary = {}
    for r in results:
        school_id = r["_id"]["school_id"]
        school_name = r["_id"]["school_name"]
        category = r["_id"]["category"]
        
        if school_id not in schools_summary:
            schools_summary[school_id] = {
                "school_id": school_id,
                "school_name": school_name,
                "total_expenses": 0,
                "by_category": {}
            }
        
        schools_summary[school_id]["by_category"][category] = {
            "amount": r["total_amount"],
            "count": r["count"]
        }
        schools_summary[school_id]["total_expenses"] += r["total_amount"]
    
    # Get grand total
    total_pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    total_result = await db.school_expenses.aggregate(total_pipeline).to_list(1)
    grand_total = total_result[0]["total"] if total_result else 0
    
    return {
        "grand_total": grand_total,
        "schools": list(schools_summary.values())
    }


@router.get("/school-expenses/school/{school_id}")
async def get_single_school_expenses(school_id: str, user: dict = Depends(get_current_user)):
    """Get all expenses for a specific school"""
    expenses = await db.school_expenses.find(
        {"school_id": school_id}, 
        {"_id": 0}
    ).sort("expense_date", -1).to_list(500)
    
    # Calculate totals by category
    totals = {}
    grand_total = 0
    for exp in expenses:
        cat = exp.get("category", "other")
        if cat not in totals:
            totals[cat] = 0
        totals[cat] += exp.get("amount", 0)
        grand_total += exp.get("amount", 0)
    
    return {
        "expenses": expenses,
        "totals_by_category": totals,
        "grand_total": grand_total
    }


@router.post("/school-expenses")
async def create_school_expense(data: dict, user: dict = Depends(get_current_user)):
    """Create a new expense entry"""
    # Get school info
    school = await db.school_inquiries.find_one({"id": data.get("school_id")}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    expense = {
        "id": str(uuid.uuid4()),
        "school_id": data.get("school_id"),
        "school_name": school.get("school_name", "Unknown School"),
        "category": data.get("category"),
        "category_name": next((c["name"] for c in EXPENSE_CATEGORIES if c["id"] == data.get("category")), data.get("category")),
        "amount": float(data.get("amount", 0)),
        "description": data.get("description", ""),
        "expense_date": data.get("expense_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "invoice_number": data.get("invoice_number", ""),
        "vendor_name": data.get("vendor_name", ""),
        "payment_status": data.get("payment_status", "pending"),  # pending, paid, partial
        "payment_mode": data.get("payment_mode", ""),  # cash, bank_transfer, upi, cheque
        "notes": data.get("notes", ""),
        "attachments": data.get("attachments", []),
        "created_by": user.get("email"),
        "created_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.school_expenses.insert_one(expense)
    return {"message": "Expense created successfully", "expense": expense}


@router.patch("/school-expenses/{expense_id}")
async def update_school_expense(expense_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update an expense entry"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    allowed_fields = ["amount", "description", "expense_date", "invoice_number", 
                      "vendor_name", "payment_status", "payment_mode", "notes", "attachments", "category"]
    
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
            if field == "category":
                update_data["category_name"] = next((c["name"] for c in EXPENSE_CATEGORIES if c["id"] == data[field]), data[field])
    
    await db.school_expenses.update_one({"id": expense_id}, {"$set": update_data})
    return {"message": "Expense updated successfully"}


@router.delete("/school-expenses/{expense_id}")
async def delete_school_expense(expense_id: str, user: dict = Depends(get_current_user)):
    """Delete an expense entry"""
    await db.school_expenses.delete_one({"id": expense_id})
    return {"message": "Expense deleted successfully"}


@router.post("/school-expenses/bulk-delete")
async def bulk_delete_expenses(data: dict, user: dict = Depends(get_current_user)):
    """Delete multiple expense entries by IDs"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    result = await db.school_expenses.delete_many({"id": {"$in": ids}})
    return {"deleted": result.deleted_count, "message": f"Deleted {result.deleted_count} expense(s)"}


@router.post("/expenses/cleanup-duplicates")
async def cleanup_duplicate_expenses(user: dict = Depends(get_current_user)):
    """Remove duplicate expenses - keeps only the first expense per school/PO/category combination"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find all auto-synced expenses with PO numbers
    expenses = await db.school_expenses.find(
        {"po_number": {"$exists": True, "$ne": None}},
        {"_id": 0}
    ).to_list(10000)
    
    # Group by school_id + po_number + category
    seen = {}
    duplicates_to_delete = []
    
    for exp in expenses:
        key = f"{exp.get('school_id')}_{exp.get('po_number')}_{exp.get('category')}"
        if key in seen:
            # This is a duplicate
            duplicates_to_delete.append(exp.get('id'))
        else:
            seen[key] = exp.get('id')
    
    # Delete duplicates
    if duplicates_to_delete:
        await db.school_expenses.delete_many({"id": {"$in": duplicates_to_delete}})
    
    return {
        "message": f"Cleanup complete. Removed {len(duplicates_to_delete)} duplicate expenses.",
        "duplicates_removed": len(duplicates_to_delete)
    }


@router.post("/expenses/clear-auto-synced")
async def clear_auto_synced_expenses(user: dict = Depends(get_current_user)):
    """Clear all auto-synced expenses to allow fresh sync. Manual expenses are preserved."""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.school_expenses.delete_many({"auto_synced": True})
    
    return {
        "message": f"Cleared {result.deleted_count} auto-synced expenses. Manual expenses preserved.",
        "deleted_count": result.deleted_count
    }


# ========================
# PO API INTEGRATION (PROCUREWAY)
# ========================

PO_API_BASE_URL = os.environ.get("PO_API_BASE_URL", "https://vendorplus-4.emergent.host/api/external")
PO_API_KEY = os.environ.get("PROCUREWAY_API_KEY", "oll_ext_O5MVdAo6KnEslbB3jtWcDBn_fPu7DRY78vr-ZkHZ7Tg")
# Production tracking URL domain (replace preview URLs with production)
PO_TRACKING_PROD_URL = os.environ.get("PO_TRACKING_URL", "https://vendorplus-4.emergent.host")

def transform_tracking_url(url: str) -> str:
    """Transform preview tracking URLs to production URLs"""
    if not url:
        return url
    # Replace any *.preview.emergentagent.com or *.stage-preview.emergentagent.com with production domain
    url = re.sub(r'https?://[^/]*\.preview\.emergentagent\.com', PO_TRACKING_PROD_URL, url)
    url = re.sub(r'https?://[^/]*\.stage-preview\.emergentagent\.com', PO_TRACKING_PROD_URL, url)
    return url

async def fetch_po_data(endpoint: str, params: dict = None, timeout: float = 10.0):
    """Helper function to fetch data from PO API"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{PO_API_BASE_URL}/{endpoint}",
                headers={"X-API-Key": PO_API_KEY},
                params=params,
                timeout=timeout
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logging.error(f"PO API HTTP error: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            logging.error(f"PO API error: {str(e)}")
            return None


VENDOR_PUBLIC_API = os.environ.get("VENDOR_PUBLIC_API", "https://vendorplus-4.emergent.host/api/public")


async def fetch_vendor_products():
    """Fetch product catalog from vendor panel"""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            response = await client.get(
                f"{VENDOR_PUBLIC_API}/products",
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logging.error(f"Failed to fetch vendor products: {e}")
            return []


def match_vendor_product(products_catalog, grade, product_type, course_type):
    """Match a grade+type to the best vendor product_id.
    product_type: 'kit', 'book', 'lab_kit'
    """
    grade_str = str(grade).strip()
    grade_num = int(grade_str) if grade_str.isdigit() else 0

    if product_type == 'lab_kit':
        # Lab kits
        if course_type == 'robotics_coding_ai':
            candidates = ['lab kit-iot', 'lab kit iot', 'labkit-iot']
        else:
            candidates = ['lab kit rob', 'lab kit-rob', 'labkit rob']
        for p in products_catalog:
            name_lower = p.get('name', '').strip().lower()
            sku_lower = p.get('sku', '').strip().lower()
            for c in candidates:
                if c in name_lower or c.replace(' ', '') in sku_lower.replace('-', '').replace(' ', ''):
                    return p['id'], p['name']
        return None, None

    if product_type == 'kit':
        # Determine kit variant
        is_iot = (course_type == 'robotics_coding_ai' and grade_num >= 7)
        for p in products_catalog:
            name_lower = p.get('name', '').strip().lower()
            sku_lower = p.get('sku', '').strip().lower()
            # Match grade number in name
            if f'grade {grade_str}' in name_lower or f'g-{grade_str.zfill(2)}' in sku_lower or f'g-{grade_str}' in sku_lower:
                if is_iot and ('iot' in name_lower or 'iot' in sku_lower):
                    return p['id'], p['name']
                elif not is_iot and ('robotics' in name_lower or 'rob' in sku_lower) and 'iot' not in name_lower and 'iot' not in sku_lower:
                    return p['id'], p['name']
        # Fallback: just grade match
        for p in products_catalog:
            name_lower = p.get('name', '').strip().lower()
            if f'grade {grade_str}' in name_lower and 'book' not in name_lower:
                if is_iot and 'iot' in name_lower:
                    return p['id'], p['name']
                elif not is_iot and 'iot' not in name_lower:
                    return p['id'], p['name']
        return None, None

    if product_type == 'book':
        is_iot = (course_type == 'robotics_coding_ai' and grade_num >= 7)
        for p in products_catalog:
            name_lower = p.get('name', '').strip().lower()
            sku_lower = p.get('sku', '').strip().lower()
            if 'book' not in name_lower and 'book' not in sku_lower:
                continue
            # Match grade
            if f'g-{grade_str}' in name_lower or f'g-{grade_str}' in sku_lower or f'grade {grade_str}' in name_lower:
                if grade_num >= 7:
                    if is_iot and ('iot' in name_lower or 'iot' in sku_lower):
                        return p['id'], p['name']
                    elif not is_iot and ('rob' in name_lower or 'rob' in sku_lower):
                        return p['id'], p['name']
                else:
                    # Grade 1-6 books don't have IOT/ROB variants
                    if 'iot' not in name_lower and 'rob' not in name_lower and 'iot' not in sku_lower and 'rob' not in sku_lower:
                        return p['id'], p['name']
        return None, None

    return None, None


