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
    {"id": "software_subscription", "name": "Software Subscription", "description": "SaaS tools, AI/LLM subs, storage, communication and productivity subscriptions"},
    {"id": "office_expense", "name": "Office Expense", "description": "Office supplies, utilities and day-to-day office costs"},
    {"id": "rent", "name": "Rent", "description": "Office, warehouse or facility rent"},
    {"id": "employee_welfare", "name": "Employee Welfare", "description": "Employee benefits, meals, team activities and welfare"},
    {"id": "salary", "name": "Team Salary", "description": "Team member salary + incentives (auto-created from Users → Import Salaries)"},
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
    project_id: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 1000,
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    """Get all expenses with optional filters.

    Performance: the previous implementation pulled up to 1000 full documents
    (each with description, file URLs, GST breakdowns, …) and sorted by
    `expense_date` in-memory because no index existed for that field. As the
    collection grew this caused multi-second initial loads on /admin/expenses.

    Fix: ensure an index on `expense_date` exists on first call (idempotent —
    `create_index` is a no-op when the index already exists) and accept
    `limit` / `skip` so the frontend can paginate.

    Project mapping (2026-07-22): callers can filter by `project_id`.
    Expenses without a `project_id` are treated as "General" and never
    surface in project-scoped listings.
    """
    query = {}
    if school_id:
        query["school_id"] = school_id
    if project_id:
        query["project_id"] = project_id
    if category:
        query["category"] = category
    if start_date:
        query["expense_date"] = {"$gte": start_date}
    if end_date:
        if "expense_date" in query:
            query["expense_date"]["$lte"] = end_date
        else:
            query["expense_date"] = {"$lte": end_date}

    # Idempotent: MongoDB skips if already present. Cheap (~1ms).
    await db.school_expenses.create_index([("expense_date", -1)])
    await db.school_expenses.create_index([("school_id", 1), ("expense_date", -1)])
    await db.school_expenses.create_index([("project_id", 1), ("expense_date", -1)])

    cursor = (
        db.school_expenses
        .find(query, {"_id": 0})
        .sort("expense_date", -1)
        .skip(max(0, int(skip)))
        .limit(max(1, min(int(limit), 1000)))
    )
    docs = await cursor.to_list(length=None)

    # PERF: legacy rows sometimes stored file uploads as base64 `data:` URIs
    # directly on the document (some going into the MB range each). The
    # frontend already ignores anything that doesn't start with `http`, but
    # shipping those bytes over the wire was causing multi-megabyte payloads
    # and multi-second list loads on /admin/expenses. Strip them here so the
    # table endpoint stays lean; individual detail views can fetch the raw
    # doc if we ever need it.
    _URL_FIELDS = ("invoice_file_url", "logistics_bill_url", "delivery_proof_url")
    for d in docs:
        for f in _URL_FIELDS:
            v = d.get(f)
            if isinstance(v, str) and v.startswith("data:"):
                d[f] = ""
        atts = d.get("attachments")
        if isinstance(atts, list) and atts:
            d["attachments"] = [
                a for a in atts
                if not (
                    isinstance(a, dict)
                    and isinstance(a.get("url"), str)
                    and a["url"].startswith("data:")
                )
            ]
    return docs


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


@router.get("/school-expenses/pnl-summary")
async def get_pnl_summary(user: dict = Depends(get_current_user)):
    """
    School-wise P&L Master Sheet.
    Revenue from school_inquiries (payment tranches + paid amounts).
    Costs from school_expenses aggregated by category.
    """
    PNL_COST_KEYS = [
        ("kit_cost",               "Kit Cost"),
        ("logistics_cost",         "Logistics Cost"),
        ("books_cost",             "Book Cost"),
        ("printing_certification", "Certificate Cost"),
        ("teacher_cost",           "Educator Cost"),
        ("school_share",           "School Share"),
        ("gp_share",               "GP Share"),
    ]
    PNL_COST_IDS = {k for k, _ in PNL_COST_KEYS}
    PAID_STATUSES = {"paid", "completed", "cleared", "success", "PAID", "SUCCESS", "COMPLETED"}
    PARTIAL_STATUSES = {"partial", "partially_paid", "PARTIAL", "PARTIALLY_PAID"}

    # ── 1. Build revenue from school_inquiries ────────────────────────────────
    # Broadened from ["converted", "active", "renewed"] to also include
    # onboarding/in_progress/renewal_meeting/meeting_done — schools mid-setup
    # or up for renewal already have real kit_cost, logistics_cost, and
    # school_share expenses. A narrower filter caused those costs to silently
    # disappear from the P&L when the school hadn't been marked "active" yet.
    schools = await db.school_inquiries.find(
        {"status": {"$in": [
            "converted", "active", "renewed", "onboarding", "in_progress",
            "renewal_meeting", "meeting_done",
        ]}},
        {"_id": 0, "id": 1, "school_name": 1, "status": 1, "onboarding_data": 1, "payments": 1},
    ).to_list(1000)

    school_rev: dict = {}
    for school in schools:
        sid = school.get("id")
        od = school.get("onboarding_data") or {}
        tranches = od.get("payment_tranches", [])
        school_gst_type = od.get("gst_type", "")
        total_students = int(od.get("total_students") or 0)
        payment_method = od.get("payment_method") or od.get("payment_mode") or ""
        existing_payments = school.get("payments", [])

        total_revenue = 0.0   # what school pays (net + gst)
        net_rev       = 0.0   # base excluding GST
        gst_total     = 0.0
        received      = 0.0
        online_collected = 0.0

        for idx, tranche in enumerate(tranches):
            amt = float(tranche.get("amount") or 0) or 0.0
            if not amt and tranche.get("percentage"):
                base = float(od.get("total_amount") or 0)
                amt = base * float(tranche.get("percentage") or 0) / 100

            gst_type = tranche.get("gst_type") or school_gst_type

            # ── GST logic ──
            if gst_type in ("exclusive_18", "exclusive"):
                gst_amt     = round(amt * 18 / 100, 2)
                net_rev_amt = amt               # base (excl. GST)
                tot_rev_amt = amt + gst_amt     # total billed
            elif gst_type in ("inclusive_18", "inclusive"):
                gst_amt     = round(amt - amt / 1.18, 2)
                net_rev_amt = round(amt / 1.18, 2)   # base after extracting GST
                tot_rev_amt = amt               # as-billed (incl. GST)
            else:
                # no GST / book-rate / zero
                gst_amt     = 0.0
                net_rev_amt = amt
                tot_rev_amt = amt

            ep   = next((p for p in existing_payments if p.get("tranche_index") == idx), None)
            # Match the Orders-page status resolution: payments[] takes priority,
            # but if that record is missing fall back to the status set directly
            # on the tranche. Before this fix the P&L silently ignored tranches
            # that were marked "paid" inline (via the tranche field) — causing
            # huge "Receivable" amounts on schools that had actually been paid.
            ep_status = (
                ep.get("status") if ep and ep.get("status")
                else tranche.get("status")
            )

            # Robustly coerce paid_amount (may be stored as str/int/float/None).
            # Source-of-truth priority: payments[].paid_amount > tranche.paid_amount > 0
            raw_paid = (
                ep.get("paid_amount") if ep and ep.get("paid_amount") not in (None, "")
                else tranche.get("paid_amount", 0)
            )
            try:
                paid = float(raw_paid or 0)
            except (TypeError, ValueError):
                paid = 0.0

            # If admin marked the tranche fully PAID without entering a
            # paid_amount, treat the full billed amount as received. Handles
            # legacy data + Cashfree-synced webhook statuses (uppercase "PAID",
            # "success", etc.).
            if paid <= 0 and ep_status in PAID_STATUSES:
                paid = tot_rev_amt

            # Partial payments: respect paid_amount when set; otherwise leave 0
            # (admin needs to enter the actual amount received).
            # No fallback for "partial" without paid_amount because we cannot
            # guess how much they actually received.

            # Clamp paid to never exceed the tranche total so partial overpays
            # in one tranche don't artificially shrink another's receivable.
            if paid > tot_rev_amt:
                paid = tot_rev_amt

            total_revenue += tot_rev_amt
            net_rev       += net_rev_amt
            gst_total     += gst_amt
            received      += paid

            # track online-collected separately (payments[] record OR tranche field)
            pmode = (
                (ep or {}).get("payment_mode")
                or tranche.get("payment_mode")
                or tranche.get("payment_method")
                or ""
            )
            if pmode in ("online", "razorpay", "cashfree", "upi"):
                online_collected += paid

        if net_rev == 0 and not tranches:
            net_rev       = float(od.get("total_amount") or 0)
            total_revenue = net_rev

        school_rev[sid] = {
            "school_name":       school.get("school_name", "Unknown"),
            "student_count":     total_students,
            "total_revenue":     round(total_revenue, 2),
            "net_revenue":       round(net_rev, 2),
            "gst":               round(gst_total, 2),
            "received":          round(received, 2),
            "online_collected":  round(online_collected, 2),
            "payment_method":    payment_method,
        }

    # ── 2. Aggregate expenses by school_id & category ─────────────────────────
    # `$toLower` on category guards against legacy/imported rows that may have
    # been written with mixed case ("Kit Cost", "KIT_COST", "kitCost") — those
    # would otherwise be bucketed separately and disappear into Misc instead of
    # rolling up under the canonical lowercase IDs in PNL_COST_KEYS.
    exp_pipeline = [
        {"$match": {"school_id": {"$exists": True, "$nin": ["", None]}}},
        {"$group": {
            "_id": {"school_id": "$school_id", "category": {"$toLower": "$category"}},
            "total": {"$sum": "$amount"},
        }},
    ]
    exp_docs = await db.school_expenses.aggregate(exp_pipeline).to_list(10000)
    exp_map: dict = {}
    for row in exp_docs:
        sid = row["_id"]["school_id"]
        cat = row["_id"]["category"]
        exp_map.setdefault(sid, {})[cat] = row["total"]

    # Backfill: if an expense references a school not in the revenue set (e.g.
    # school still in `new`/`follow_up`/`lost`, or the id has drifted), we
    # still want it visible in the master P&L so bookkeeping additions never
    # silently disappear. Fetch those schools' names in one round-trip.
    missing_ids = [sid for sid in exp_map.keys() if sid and sid not in school_rev]
    if missing_ids:
        extra_schools = await db.school_inquiries.find(
            {"id": {"$in": missing_ids}},
            {"_id": 0, "id": 1, "school_name": 1, "onboarding_data": 1},
        ).to_list(1000)
        for s in extra_schools:
            sid = s.get("id")
            od = s.get("onboarding_data") or {}
            school_rev[sid] = {
                "school_name":       s.get("school_name", "Unknown"),
                "student_count":     int(od.get("total_students") or 0),
                "total_revenue":     0.0,
                "net_revenue":       0.0,
                "gst":               0.0,
                "received":          0.0,
                "online_collected":  0.0,
                "payment_method":    od.get("payment_method") or od.get("payment_mode") or "",
            }

    # ── 3. Build rows ─────────────────────────────────────────────────────────
    rows = []
    for sid, rev in school_rev.items():
        nr = rev["net_revenue"]
        tr = rev["total_revenue"]
        school_exp_preview = exp_map.get(sid, {})
        has_expenses = any(float(v or 0) for v in school_exp_preview.values())
        # Only skip schools with NO revenue AND NO expenses. Previously we
        # dropped any zero-revenue school even if it had real expenses, which
        # caused manually-added costs (e.g. School Share, marketing) to vanish
        # from the master P&L. Keeping the row lets admins see and reconcile
        # the expense against the school it belongs to.
        if tr == 0 and nr == 0 and not has_expenses:
            continue
        received   = rev["received"]
        # Compare received to total_revenue (gross incl. GST) — consistent since paid_amount is gross too
        receivable = max(tr - received, 0)

        if received <= 0:
            pay_status = "Pending"
        elif received >= tr * 0.99:   # 1% tolerance for rounding differences
            pay_status = "Paid"
        else:
            pay_status = "Partially Paid"

        school_exp = exp_map.get(sid, {})
        costs = {}
        total_costs = 0.0
        misc_cost   = 0.0

        for cat_id, cat_label in PNL_COST_KEYS:
            amt = float(school_exp.get(cat_id, 0))
            p   = round(amt / nr * 100, 1) if nr else 0
            costs[cat_id] = {"amount": round(amt, 2), "pct": p, "label": cat_label}
            total_costs  += amt

        # Misc = all expense categories NOT in PNL_COST_KEYS
        for cat_id, cat_amt in school_exp.items():
            if cat_id not in PNL_COST_IDS:
                misc_cost += float(cat_amt or 0)

        misc_cost   = round(misc_cost, 2)
        total_costs = round(total_costs + misc_cost, 2)
        misc_pct    = round(misc_cost / nr * 100, 1) if nr else 0

        gross_profit = round(nr - total_costs, 2)
        gp_pct       = round(gross_profit / nr * 100, 1) if nr else 0

        students = rev["student_count"]
        price_per_student = round(nr / students) if students else 0

        rows.append({
            "school_id":         sid,
            "school_name":       rev["school_name"],
            "student_count":     students,
            "price_per_student": price_per_student,
            "total_revenue":     tr,
            "gst":               rev["gst"],
            "net_revenue":       nr,
            "payment_status":    pay_status,
            "received":          received,
            "online_collected":  rev["online_collected"],
            "payment_method":    rev["payment_method"],
            "receivable":        round(receivable, 2),
            "costs":             costs,
            "misc_cost":         misc_cost,
            "misc_pct":          misc_pct,
            "total_costs":       total_costs,
            "gross_profit":      gross_profit,
            "gp_pct":            gp_pct,
        })

    rows.sort(key=lambda r: r["school_name"])

    def _sum(f): return round(sum(r[f] for r in rows), 2)
    total_nr = _sum("net_revenue")
    totals = {
        "student_count":    sum(r["student_count"] for r in rows),
        "total_revenue":    _sum("total_revenue"),
        "gst":              _sum("gst"),
        "net_revenue":      total_nr,
        "received":         _sum("received"),
        "receivable":       _sum("receivable"),
        "misc_cost":        _sum("misc_cost"),
        "total_costs":      _sum("total_costs"),
        "gross_profit":     _sum("gross_profit"),
        "gp_pct":           round(_sum("gross_profit") / total_nr * 100, 1) if total_nr else 0,
        "misc_pct":         round(_sum("misc_cost") / total_nr * 100, 1) if total_nr else 0,
    }
    for cat_id, _ in PNL_COST_KEYS:
        totals[cat_id] = round(sum(r["costs"].get(cat_id, {}).get("amount", 0) for r in rows), 2)
        totals[f"{cat_id}_pct"] = round(totals[cat_id] / total_nr * 100, 1) if total_nr else 0

    return {"rows": rows, "totals": totals, "cost_keys": PNL_COST_KEYS}


@router.post("/school-expenses")
async def create_school_expense(data: dict, user: dict = Depends(get_current_user)):
    """Create a new expense entry.

    Optional `project_id` maps the expense to a project. When present, we
    look the project up once and store `project_name` alongside so listings
    don't need a second query. Empty/missing `project_id` = general
    expense — hidden from project-scoped views.
    """
    school = None
    if data.get("school_id"):
        school = await db.school_inquiries.find_one({"id": data.get("school_id")}, {"_id": 0})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")

    project_id = (data.get("project_id") or "").strip()
    project_name = ""
    if project_id:
        project = await db.projects.find_one({"id": project_id}, {"_id": 0, "name": 1})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        project_name = project.get("name") or ""

    expense = {
        "id": str(uuid.uuid4()),
        "school_id": data.get("school_id", ""),
        "school_name": school.get("school_name", "Unknown School") if school else "General",
        "project_id": project_id,
        "project_name": project_name,
        "category": data.get("category"),
        "category_name": next((c["name"] for c in EXPENSE_CATEGORIES if c["id"] == data.get("category")), data.get("category")),
        "amount": float(data.get("amount", 0)),
        "description": data.get("description", ""),
        "expense_date": data.get("expense_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "invoice_number": data.get("invoice_number", ""),
        "vendor_name": data.get("vendor_name", ""),
        "payment_status": data.get("payment_status", "pending"),
        "payment_mode": data.get("payment_mode", ""),
        "notes": data.get("notes", ""),
        "attachments": data.get("attachments", []),
        "expense_breakup_type": data.get("expense_breakup_type", ""),
        "expense_breakup_value": float(data.get("expense_breakup_value")) if data.get("expense_breakup_value") else None,
        "expected_payment_date": data.get("expected_payment_date", ""),
        "partial_amount_paid": float(data.get("partial_amount_paid")) if data.get("partial_amount_paid") else None,
        "partial_payment_date": data.get("partial_payment_date", ""),
        "invoice_file_url": data.get("invoice_file_url", ""),
        # Allocation (B2B/B2C/Project/Office)
        "allocation_type": data.get("allocation_type", ""),
        "allocation_ref_id": data.get("allocation_ref_id", ""),
        "allocation_ref_label": data.get("allocation_ref_label", ""),
        "allocation_program": data.get("allocation_program", ""),
        "created_by": user.get("email"),
        "created_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.school_expenses.insert_one(expense)
    expense.pop('_id', None)  # Remove MongoDB ObjectId before returning

    # Reverse sync: when an admin adds a School Share / GP Share expense
    # directly from /admin/expenses, also refresh the linked school's
    # onboarding_data.{school_share_amount|gp_share_amount} so the amount
    # shown in the school edit modal + P&L cost column stays consistent.
    # Direct db.update — no round-trip through /schools endpoints — so the
    # auto-sync in schools.py doesn't fire back and create a duplicate.
    await _resync_school_share_from_expenses(expense.get("school_id"), expense.get("category"))

    return {"message": "Expense created successfully", "expense": expense}


async def _resync_school_share_from_expenses(school_id: str, category: str):
    """Aggregate all school_share / gp_share expenses for a school and write
    the sum back into `school_inquiries.onboarding_data.{school|gp}_share_amount`.

    Called after any insert / update / delete of a share-type expense so the
    School CRM edit modal + P&L pick up expense-side edits made from the
    Expenses page. No-op for non-share categories or when school_id missing.
    """
    if not school_id or category not in ("school_share", "gp_share"):
        return
    field = "school_share_amount" if category == "school_share" else "gp_share_amount"
    type_field = "school_share_type" if category == "school_share" else "gp_share_type"
    pipeline = [
        {"$match": {"school_id": school_id, "category": category}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    agg = await db.school_expenses.aggregate(pipeline).to_list(1)
    total = float(agg[0]["total"]) if agg else 0.0
    existing = await db.school_inquiries.find_one(
        {"id": school_id},
        {"_id": 0, "onboarding_data": 1},
    )
    if not existing:
        return
    onboarding = dict(existing.get("onboarding_data") or {})
    onboarding[field] = total
    value_field = "school_share_value" if category == "school_share" else "gp_share_value"
    if total > 0:
        # Backfill type + value when the admin has never configured them (or
        # explicitly cleared them to 'none') in the school modal so the modal
        # reflects the expense-driven amount instead of showing 0.
        if not onboarding.get(type_field) or onboarding.get(type_field) == "none":
            onboarding[type_field] = "amount"
        # When we're in the auto-managed 'amount' mode, keep the displayed
        # `_value` string in sync with the aggregate. If admin set the type to
        # 'percentage' manually, leave their percentage value alone.
        if onboarding.get(type_field) == "amount":
            onboarding[value_field] = str(total)
    else:
        # Aggregate went to zero (all share expenses deleted) — reset the
        # cached value so the school modal doesn't show a stale value
        # alongside amount ₹0. Preserve type if admin set it manually to
        # 'percentage' — only clear when we're in auto-managed 'amount' mode.
        if onboarding.get(type_field) == "amount":
            onboarding[value_field] = ""
    await db.school_inquiries.update_one(
        {"id": school_id},
        {"$set": {"onboarding_data": onboarding}},
    )


@router.patch("/school-expenses/{expense_id}")
async def update_school_expense(expense_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update an expense entry.

    `project_id` can be assigned, changed, or removed (empty string). When
    changed, the cached `project_name` is refreshed automatically.
    """
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

    allowed_fields = ["amount", "description", "expense_date", "invoice_number",
                      "vendor_name", "payment_status", "payment_mode", "notes", "attachments", "category",
                      "expense_breakup_type", "expense_breakup_value", "expected_payment_date",
                      "partial_amount_paid", "partial_payment_date", "invoice_file_url"]

    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
            if field == "category":
                update_data["category_name"] = next((c["name"] for c in EXPENSE_CATEGORIES if c["id"] == data[field]), data[field])

    # project_id — accept explicit unset (empty string) as well as reassignment.
    if "project_id" in data:
        new_pid = (data.get("project_id") or "").strip()
        update_data["project_id"] = new_pid
        if new_pid:
            project = await db.projects.find_one({"id": new_pid}, {"_id": 0, "name": 1})
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
            update_data["project_name"] = project.get("name") or ""
        else:
            update_data["project_name"] = ""

    await db.school_expenses.update_one({"id": expense_id}, {"$set": update_data})

    # If this update touched a share-type expense (amount changed, or category
    # was flipped to/from school_share/gp_share), resync the linked school's
    # onboarding_data so the school edit modal reflects the latest total.
    updated_exp = await db.school_expenses.find_one({"id": expense_id}, {"_id": 0, "school_id": 1, "category": 1})
    if updated_exp:
        await _resync_school_share_from_expenses(updated_exp.get("school_id"), updated_exp.get("category"))

    return {"message": "Expense updated successfully"}


@router.get("/school-expenses/project/{project_id}")
async def get_project_expenses(project_id: str, user: dict = Depends(get_current_user)):
    """List all expenses linked to a project + summary total.

    Used by the Project Details → Expenses tab.
    """
    # Verify project exists (returns 404 for typos rather than empty list).
    project = await db.projects.find_one({"id": project_id}, {"_id": 0, "name": 1})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    expenses = (
        await db.school_expenses
        .find({"project_id": project_id}, {"_id": 0})
        .sort("expense_date", -1)
        .to_list(length=None)
    )
    total = sum(float(e.get("amount") or 0) for e in expenses)
    return {
        "project_id": project_id,
        "project_name": project.get("name") or "",
        "count": len(expenses),
        "total": total,
        "expenses": expenses,
    }


@router.delete("/school-expenses/{expense_id}")
async def delete_school_expense(expense_id: str, user: dict = Depends(get_current_user)):
    """Delete an expense entry"""
    # Capture share-type context before deleting so we can resync afterwards.
    exp = await db.school_expenses.find_one({"id": expense_id}, {"_id": 0, "school_id": 1, "category": 1})
    await db.school_expenses.delete_one({"id": expense_id})
    if exp:
        await _resync_school_share_from_expenses(exp.get("school_id"), exp.get("category"))
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
# SEC-004: no fallback API key. If the env var is unset, `fetch_po_data`
# fails closed with a clear 503 so we never expose a baked-in key.
PO_API_KEY = os.environ.get("PROCUREWAY_API_KEY", "")
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
    if not PO_API_KEY:
        # SEC-004: fail closed when the env var isn't set instead of
        # falling back to a hardcoded key.
        raise HTTPException(
            status_code=503,
            detail="Procurement service is not configured. Contact an administrator.",
        )
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


