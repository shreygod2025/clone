"""Custom Invoices — admin-authored standalone invoices.

Used when the accounts team needs to bill an entity that isn't an onboarded
school (e.g. one-off workshops, distributor sample orders, sponsorship POs).
The frontend renders the PDF locally using `invoicePdfGenerator.js` (same
visual format as a school invoice) and POSTs the resulting base64 + form
data back here for persistence + re-download.
"""
from __future__ import annotations

import base64
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response

from .shared import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


def _require_admin(user: dict) -> None:
    """Custom invoices are financial/order records — restrict CRUD to admins
    and team members with orders access."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    role = (user.get("role") or "").lower()
    perms = user.get("permissions") or []
    if (
        role in ("admin", "super_admin")
        or "orders" in perms
        or any(isinstance(p, str) and p.startswith("orders") for p in perms)
        or "all" in perms
    ):
        return
    raise HTTPException(status_code=403, detail="Admin or orders access required")



def _increment_invoice_number(last_no: str, year: int) -> str:
    """Strictly increment any invoice number pattern without going backward.
    Examples:
      '1100' -> '1101'
      'OLL2026/1100' -> 'OLL2026/1101'
      'OLL2026/CUST-0011' -> 'OLL2026/CUST-0012'
      'INV-99' -> 'INV-100'
    """
    raw = (last_no or "").strip()
    if not raw:
        return f"OLL{year}/CUST-0001"
    match = re.search(r"^(.*?)(\d+)$", raw)
    if match:
        prefix, digits = match.groups()
        next_num = int(digits) + 1
        formatted_digits = str(next_num).zfill(len(digits))
        return f"{prefix}{formatted_digits}"
    return f"{raw}-1"


async def _sync_counter_from_invoice_no(invoice_no: str) -> None:
    """If an invoice number ends with digits, ensure our counter is at least that high
    so future sequential generations strictly continue upwards."""
    now = datetime.now(timezone.utc)
    year = now.year
    match = re.search(r"(\d+)$", (invoice_no or "").strip())
    if match:
        num = int(match.group(1))
        await db.counters.update_one(
            {"key": f"custom_invoice_{year}"},
            {"$max": {"seq": num}},
            upsert=True,
        )


async def _peek_next_invoice_number() -> str:
    """Returns what the next invoice number will be without consuming the counter."""
    now = datetime.now(timezone.utc)
    year = now.year
    counter = await db.counters.find_one({"key": f"custom_invoice_{year}"})
    counter_seq = counter.get("seq", 0) if counter else 0

    # Also inspect the most recently created custom invoice
    last_inv = await db.custom_invoices.find(
        {},
        {"invoice_no": 1, "created_at": 1}
    ).sort("created_at", -1).limit(1).to_list(1)

    if last_inv and last_inv[0].get("invoice_no"):
        last_no = last_inv[0]["invoice_no"]
        match = re.search(r"(\d+)$", last_no)
        last_digits = int(match.group(1)) if match else 0
        if last_digits >= counter_seq:
            return _increment_invoice_number(last_no, year)

    return f"OLL{year}/CUST-{str(counter_seq + 1).zfill(4)}"


async def _next_custom_invoice_number() -> str:
    """Atomic counter → returns sequential 'OLL{YEAR}/CUST-NNNN'."""
    now = datetime.now(timezone.utc)
    year = now.year
    counter = await db.counters.find_one_and_update(
        {"key": f"custom_invoice_{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter["seq"]
    return f"OLL{year}/CUST-{str(seq).zfill(4)}"



@router.post("/admin/custom-invoices")
async def create_custom_invoice(
    payload: dict,
    user: dict = Depends(get_current_user),
):
    """Persist a new custom invoice.

    Body:
        customer_name (str, required)
        address (str)
        gstin (str, optional)
        state (str, optional — defaults Maharashtra)
        gst_type (str, optional — exclusive_18 | inclusive_18 | book_gst_0)
        line_items: [{desc, qty, rate}, ...]
        total_amount (float — inclusive of GST when applicable)
        pdf_base64 (str — the PDF the frontend just generated)
        notes (str, optional)
    """
    _require_admin(user)
    customer_name = (payload.get("customer_name") or "").strip()
    if not customer_name:
        raise HTTPException(status_code=400, detail="customer_name is required")

    line_items = payload.get("line_items") or []
    if not isinstance(line_items, list) or not line_items:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    pdf_base64 = payload.get("pdf_base64") or ""
    invoice_no = (payload.get("invoice_no") or payload.get("generated_invoice_no") or "").strip()
    if not invoice_no:
        invoice_no = await _next_custom_invoice_number()
    else:
        # Check if already exists in custom_invoices
        existing = await db.custom_invoices.find_one({
            "invoice_no": {"$regex": f"^{re.escape(invoice_no)}$", "$options": "i"}
        })
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Invoice number '{invoice_no}' already exists. Please choose a different number or edit the existing invoice."
            )
        await _sync_counter_from_invoice_no(invoice_no)

    # ── Payment status normalisation ────────────────────────────────────
    total_amount = float(payload.get("total_amount") or 0)
    payment_status = (payload.get("payment_status") or "pending").strip().lower()
    if payment_status not in {"pending", "paid", "partial"}:
        payment_status = "pending"
    raw_paid = payload.get("paid_amount")
    try:
        paid_amount = float(raw_paid) if raw_paid not in (None, "") else 0.0
    except (TypeError, ValueError):
        paid_amount = 0.0
    if payment_status == "paid":
        paid_amount = total_amount
    elif payment_status == "pending":
        paid_amount = 0.0
    else:  # partial
        paid_amount = max(0.0, min(paid_amount, total_amount))

    invoice_date = (payload.get("invoice_date") or "").strip()
    if not invoice_date:
        invoice_date = datetime.now(timezone.utc).date().isoformat()

    # ── Payment tranches (optional) ──────────────────────────────────────
    tranches_in = payload.get("tranches") or []
    if not isinstance(tranches_in, list):
        tranches_in = []
    tranches_clean: list[dict] = []
    for i, t in enumerate(tranches_in):
        if not isinstance(t, dict):
            continue
        try:
            amt = float(t.get("amount") or 0)
        except (TypeError, ValueError):
            amt = 0.0
        if amt <= 0:
            raise HTTPException(status_code=400, detail=f"Tranche {i + 1} must have amount > 0")
        status = (t.get("status") or "pending").strip().lower()
        if status not in {"paid", "pending"}:
            status = "pending"
        tranches_clean.append({
            "id": (t.get("id") or str(uuid.uuid4())),
            "name": (t.get("name") or f"Tranche {i + 1}").strip(),
            "amount": amt,
            "due_date": (t.get("due_date") or "").strip(),
            "status": status,
        })
    if tranches_clean:
        trance_sum = sum(x["amount"] for x in tranches_clean)
        if trance_sum > total_amount + 0.01:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Tranche total (₹{trance_sum:.2f}) exceeds invoice total "
                    f"(₹{total_amount:.2f})"
                ),
            )
        # Auto-derive payment status + paid_amount from tranches
        paid_from_tranches = sum(x["amount"] for x in tranches_clean if x["status"] == "paid")
        if paid_from_tranches <= 0:
            payment_status = "pending"
            paid_amount = 0.0
        elif abs(paid_from_tranches - total_amount) < 0.01 and all(x["status"] == "paid" for x in tranches_clean):
            payment_status = "paid"
            paid_amount = total_amount
        else:
            payment_status = "partial"
            paid_amount = paid_from_tranches

    doc = {
        "id": str(uuid.uuid4()),
        "invoice_no": invoice_no,
        "customer_name": customer_name,
        "address": (payload.get("address") or "").strip(),
        "gstin": (payload.get("gstin") or "").strip(),
        "state": (payload.get("state") or "").strip(),
        "place_of_supply": (payload.get("place_of_supply") or payload.get("state") or "").strip(),
        "ship_to_name": (payload.get("ship_to_name") or "").strip(),
        "ship_to_address": (payload.get("ship_to_address") or "").strip(),
        "ship_to_state": (payload.get("ship_to_state") or "").strip(),
        "gst_type": (payload.get("gst_type") or "").strip(),
        "line_items": line_items,
        "total_amount": total_amount,
        "notes": (payload.get("notes") or "").strip(),
        "pdf_base64": pdf_base64,
        # Invoice date + payment status
        "invoice_date": invoice_date,
        "payment_status": payment_status,
        "paid_amount": paid_amount,
        "tranches": tranches_clean,
        "created_by": user.get("email", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.custom_invoices.insert_one(doc)

    # Echo back without the heavy pdf_base64 payload
    res = {k: v for k, v in doc.items() if k not in {"_id", "pdf_base64"}}
    return res


@router.get("/admin/custom-invoices/next-number")
async def get_next_invoice_number_route(
    user: dict = Depends(get_current_user),
):
    """Peek the next sequential custom invoice number without consuming the counter."""
    _require_admin(user)
    next_no = await _peek_next_invoice_number()
    return {"next_invoice_no": next_no}


@router.get("/admin/custom-invoices/lookup")
async def lookup_custom_invoice(
    q: str,
    user: dict = Depends(get_current_user),
):
    """Lookup an invoice by number or query string for editing."""
    _require_admin(user)
    raw_q = (q or "").strip()
    if not raw_q:
        raise HTTPException(status_code=400, detail="Search query 'q' is required")

    # 1. Exact match in custom_invoices
    doc = await db.custom_invoices.find_one(
        {"invoice_no": {"$regex": f"^{re.escape(raw_q)}$", "$options": "i"}},
        {"_id": 0}
    )
    if doc:
        return doc

    # 2. Suffix / partial regex match in custom_invoices (e.g. '0011', '1100', 'CUST-0011')
    doc = await db.custom_invoices.find_one(
        {"invoice_no": {"$regex": re.escape(raw_q), "$options": "i"}},
        {"_id": 0}
    )
    if doc:
        return doc

    # 3. Check school invoices in db.invoices
    inv = await db.invoices.find_one(
        {"invoice_no": {"$regex": f"^{re.escape(raw_q)}$", "$options": "i"}},
        {"_id": 0}
    )
    if not inv:
        inv = await db.invoices.find_one(
            {"invoice_no": {"$regex": re.escape(raw_q), "$options": "i"}},
            {"_id": 0}
        )
    if inv:
        school = {}
        if inv.get("school_id"):
            school = await db.school_inquiries.find_one(
                {"id": inv["school_id"]},
                {"_id": 0, "school_name": 1, "address": 1, "gstin": 1, "state": 1, "onboarding_data": 1}
            ) or {}
        onboarding = school.get("onboarding_data") or {}
        return {
            "id": inv.get("id") or str(uuid.uuid4()),
            "invoice_no": inv.get("invoice_no"),
            "customer_name": inv.get("school_name") or school.get("school_name") or "School Customer",
            "address": school.get("address") or onboarding.get("address") or "",
            "gstin": school.get("gstin") or onboarding.get("gstin") or "",
            "state": school.get("state") or onboarding.get("state") or "Maharashtra",
            "place_of_supply": school.get("state") or onboarding.get("state") or "Maharashtra",
            "gst_type": onboarding.get("gst_type") or "exclusive_18",
            "line_items": [{
                "desc": f"Course Fee - {inv.get('tranche_info', 'Tranche')}",
                "qty": 1,
                "rate": float(inv.get("amount") or 0),
            }],
            "total_amount": float(inv.get("amount") or 0),
            "invoice_date": (inv.get("updated_at") or inv.get("created_at") or "")[:10] or datetime.now(timezone.utc).date().isoformat(),
            "payment_status": inv.get("status") or "pending",
            "paid_amount": float(inv.get("amount") or 0) if inv.get("status") == "paid" else 0.0,
            "notes": f"Imported from School Invoice: {inv.get('school_name', '')}",
            "is_school_invoice": True,
            "payment_id": inv.get("payment_id"),
            "school_id": inv.get("school_id"),
        }

    raise HTTPException(status_code=404, detail=f"Invoice '{raw_q}' not found")


@router.get("/admin/custom-invoices/by-number/{invoice_no:path}")
async def get_invoice_by_number(
    invoice_no: str,
    user: dict = Depends(get_current_user),
):
    """Lookup invoice by path invoice number."""
    return await lookup_custom_invoice(q=invoice_no, user=user)


@router.put("/admin/custom-invoices/{invoice_id}")
async def update_custom_invoice(
    invoice_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
):
    """Update an existing custom invoice and replace stored PDF base64."""
    _require_admin(user)
    existing = await db.custom_invoices.find_one({"id": invoice_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Custom invoice not found")

    customer_name = (payload.get("customer_name") or "").strip()
    if not customer_name:
        raise HTTPException(status_code=400, detail="customer_name is required")

    line_items = payload.get("line_items") or []
    if not isinstance(line_items, list) or not line_items:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    invoice_no = (payload.get("invoice_no") or existing.get("invoice_no") or "").strip()
    if not invoice_no:
        invoice_no = existing.get("invoice_no")

    # If invoice_no changed, check for conflict with another invoice
    if invoice_no.lower() != (existing.get("invoice_no") or "").lower():
        conflict = await db.custom_invoices.find_one({
            "invoice_no": {"$regex": f"^{re.escape(invoice_no)}$", "$options": "i"},
            "id": {"$ne": invoice_id}
        })
        if conflict:
            raise HTTPException(status_code=400, detail=f"Invoice number '{invoice_no}' already in use by another invoice")
        await _sync_counter_from_invoice_no(invoice_no)

    total_amount = float(payload.get("total_amount") or 0)
    payment_status = (payload.get("payment_status") or "pending").strip().lower()
    if payment_status not in {"pending", "paid", "partial"}:
        payment_status = "pending"
    raw_paid = payload.get("paid_amount")
    try:
        paid_amount = float(raw_paid) if raw_paid not in (None, "") else 0.0
    except (TypeError, ValueError):
        paid_amount = 0.0
    if payment_status == "paid":
        paid_amount = total_amount
    elif payment_status == "pending":
        paid_amount = 0.0
    else:
        paid_amount = max(0.0, min(paid_amount, total_amount))

    # Payment tranches
    tranches_in = payload.get("tranches") or []
    tranches_clean: list[dict] = []
    if isinstance(tranches_in, list):
        for i, t in enumerate(tranches_in):
            if not isinstance(t, dict):
                continue
            try:
                amt = float(t.get("amount") or 0)
            except (TypeError, ValueError):
                amt = 0.0
            if amt <= 0:
                raise HTTPException(status_code=400, detail=f"Tranche {i + 1} must have amount > 0")
            status = (t.get("status") or "pending").strip().lower()
            if status not in {"paid", "pending"}:
                status = "pending"
            tranches_clean.append({
                "id": (t.get("id") or str(uuid.uuid4())),
                "name": (t.get("name") or f"Tranche {i + 1}").strip(),
                "amount": amt,
                "due_date": (t.get("due_date") or "").strip(),
                "status": status,
            })
    if tranches_clean:
        trance_sum = sum(x["amount"] for x in tranches_clean)
        if trance_sum > total_amount + 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Tranche total (₹{trance_sum:.2f}) exceeds invoice total (₹{total_amount:.2f})"
            )
        paid_from_tranches = sum(x["amount"] for x in tranches_clean if x["status"] == "paid")
        if paid_from_tranches <= 0:
            payment_status = "pending"
            paid_amount = 0.0
        elif abs(paid_from_tranches - total_amount) < 0.01 and all(x["status"] == "paid" for x in tranches_clean):
            payment_status = "paid"
            paid_amount = total_amount
        else:
            payment_status = "partial"
            paid_amount = paid_from_tranches

    invoice_date = (payload.get("invoice_date") or "").strip() or existing.get("invoice_date") or datetime.now(timezone.utc).date().isoformat()

    update_fields = {
        "invoice_no": invoice_no,
        "customer_name": customer_name,
        "address": (payload.get("address") or "").strip(),
        "gstin": (payload.get("gstin") or "").strip(),
        "state": (payload.get("state") or "").strip(),
        "place_of_supply": (payload.get("place_of_supply") or "").strip(),
        "ship_to_name": (payload.get("ship_to_name") or "").strip(),
        "ship_to_address": (payload.get("ship_to_address") or "").strip(),
        "ship_to_state": (payload.get("ship_to_state") or "").strip(),
        "gst_type": (payload.get("gst_type") or "").strip(),
        "line_items": line_items,
        "total_amount": total_amount,
        "notes": (payload.get("notes") or "").strip(),
        "invoice_date": invoice_date,
        "payment_status": payment_status,
        "paid_amount": paid_amount,
        "tranches": tranches_clean,
        "updated_by": user.get("email", "admin"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if payload.get("pdf_base64"):
        update_fields["pdf_base64"] = payload["pdf_base64"]

    await db.custom_invoices.update_one({"id": invoice_id}, {"$set": update_fields})
    updated_doc = await db.custom_invoices.find_one({"id": invoice_id}, {"_id": 0, "pdf_base64": 0})
    return updated_doc


@router.get("/admin/custom-invoices")
async def list_custom_invoices(
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    """List recent custom invoices (without the inline PDF base64)."""
    _require_admin(user)
    rows = await db.custom_invoices.find(
        {},
        {"_id": 0, "pdf_base64": 0},
    ).sort("created_at", -1).to_list(length=max(1, min(limit, 500)))
    return {"count": len(rows), "rows": rows}


@router.get("/admin/custom-invoices/{invoice_id}/pdf")
async def download_custom_invoice_pdf(
    invoice_id: str,
    user: dict = Depends(get_current_user),
):
    """Stream back the saved PDF for re-download."""
    _require_admin(user)
    doc = await db.custom_invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Custom invoice not found")
    pdf_b64 = doc.get("pdf_base64") or ""
    if not pdf_b64:
        raise HTTPException(status_code=404, detail="PDF not stored for this invoice")
    try:
        pdf_bytes = base64.b64decode(pdf_b64)
    except Exception:
        raise HTTPException(status_code=500, detail="Invoice PDF is corrupted")
    safe_name = (doc.get("invoice_no") or "custom_invoice").replace("/", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
    )


@router.patch("/admin/custom-invoices/{invoice_id}/status")
async def update_custom_invoice_status(
    invoice_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
):
    """Update just the `payment_status` + `paid_amount` for a custom invoice.
    Used by the accounts team to mark a pending invoice as partial / paid
    without having to regenerate the PDF."""
    _require_admin(user)
    doc = await db.custom_invoices.find_one({"id": invoice_id}, {"_id": 0, "total_amount": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Custom invoice not found")

    status = (payload.get("payment_status") or "").strip().lower()
    if status not in {"pending", "paid", "partial"}:
        raise HTTPException(status_code=400, detail="Invalid payment_status")

    total = float(doc.get("total_amount") or 0)
    try:
        paid = float(payload.get("paid_amount") or 0)
    except (TypeError, ValueError):
        paid = 0.0
    if status == "paid":
        paid = total
    elif status == "pending":
        paid = 0.0
    else:  # partial
        paid = max(0.0, min(paid, total))
        if paid <= 0:
            raise HTTPException(status_code=400, detail="Partial status requires paid_amount > 0")

    await db.custom_invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "payment_status": status,
            "paid_amount": paid,
            "status_updated_at": datetime.now(timezone.utc).isoformat(),
            "status_updated_by": user.get("email", "admin"),
        }},
    )
    return {"ok": True, "payment_status": status, "paid_amount": paid}


@router.delete("/admin/custom-invoices/{invoice_id}")
async def delete_custom_invoice(
    invoice_id: str,
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    res = await db.custom_invoices.delete_one({"id": invoice_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom invoice not found")
    return {"ok": True}
