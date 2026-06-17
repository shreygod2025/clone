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
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response

from .shared import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


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
    customer_name = (payload.get("customer_name") or "").strip()
    if not customer_name:
        raise HTTPException(status_code=400, detail="customer_name is required")

    line_items = payload.get("line_items") or []
    if not isinstance(line_items, list) or not line_items:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    pdf_base64 = payload.get("pdf_base64") or ""
    invoice_no = await _next_custom_invoice_number()
    doc = {
        "id": str(uuid.uuid4()),
        "invoice_no": invoice_no,
        "customer_name": customer_name,
        "address": (payload.get("address") or "").strip(),
        "gstin": (payload.get("gstin") or "").strip(),
        "state": (payload.get("state") or "").strip(),
        "gst_type": (payload.get("gst_type") or "").strip(),
        "line_items": line_items,
        "total_amount": float(payload.get("total_amount") or 0),
        "notes": (payload.get("notes") or "").strip(),
        "pdf_base64": pdf_base64,
        "created_by": user.get("email", "admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.custom_invoices.insert_one(doc)

    # Echo back without the heavy pdf_base64 payload
    res = {k: v for k, v in doc.items() if k not in {"_id", "pdf_base64"}}
    return res


@router.get("/admin/custom-invoices")
async def list_custom_invoices(
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    """List recent custom invoices (without the inline PDF base64)."""
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


@router.delete("/admin/custom-invoices/{invoice_id}")
async def delete_custom_invoice(
    invoice_id: str,
    user: dict = Depends(get_current_user),
):
    res = await db.custom_invoices.delete_one({"id": invoice_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom invoice not found")
    return {"ok": True}
