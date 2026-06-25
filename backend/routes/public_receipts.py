"""
Public receipt download — `oll.co/receipt`
==========================================

Lets a school parent / student fetch their own payment receipts from the
`school_student_payments` collection by:

    1. Entering their phone number              → POST /api/receipts/school-student/send-otp
    2. Receiving a 4-digit OTP on WhatsApp      → AiSensy "otp" campaign
    3. Entering OTP                              → POST /api/receipts/school-student/verify-otp
       (returns a 30-minute JWT + list of their paid receipts)
    4. Clicking "Download"                      → GET  /api/receipts/school-student/{payment_id}/view?token=...
       (returns receipt HTML — browser can save as PDF)

Security model: phone == identity. Anyone with WhatsApp access to the phone
that paid for the kit can fetch those receipts. No JWT for the existing app
auth — uses a separate short-lived signed token for download URLs only.
"""
import os
import re
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .shared import db
from database import otp_store_new, otp_verify, otp_send_allowed

router = APIRouter()

# ── Config ──────────────────────────────────────────────────────────────────
RECEIPT_JWT_SECRET = os.environ.get("JWT_SECRET", "oll-receipt-fallback-secret")
RECEIPT_JWT_TTL_MIN = 30


# ── Helpers ─────────────────────────────────────────────────────────────────
def _normalize_phone(phone: str) -> str:
    """Return last-10-digit normalized phone for DB matching."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) > 10:
        digits = digits[-10:]
    return digits


def _issue_receipt_token(phone: str) -> str:
    """Issue a short-lived JWT that allows downloading receipts for this phone."""
    payload = {
        "phone": _normalize_phone(phone),
        "scope": "receipt_download",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=RECEIPT_JWT_TTL_MIN),
    }
    return jwt.encode(payload, RECEIPT_JWT_SECRET, algorithm="HS256")


def _decode_receipt_token(token: str) -> str:
    """Returns the phone from a valid receipt JWT. Raises HTTPException otherwise."""
    try:
        data = jwt.decode(token, RECEIPT_JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Download link expired. Please verify OTP again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid download link.")
    if data.get("scope") != "receipt_download":
        raise HTTPException(status_code=401, detail="Invalid token scope.")
    return _normalize_phone(data.get("phone") or "")


async def _find_paid_payments_for_phone(phone: str) -> list:
    """Return all PAID `school_student_payments` matching the last-10-digit phone."""
    p10 = _normalize_phone(phone)
    if len(p10) != 10:
        return []
    # Phones in DB are stored inconsistently (with/without 91 prefix). Match the
    # last 10 digits using a regex so all variants resolve to the same set.
    docs = await db.school_student_payments.find(
        {
            "phone": {"$regex": f"{p10}$"},
            "$or": [
                {"payment_status": "paid"},
                {"status": "paid"},
                {"status": "PAID"},
                {"status": "SUCCESS"},
            ],
        },
        {"_id": 0},
    ).sort("payment_time", -1).to_list(50)
    return docs


def _payment_to_safe_dict(p: dict) -> dict:
    """Return only the fields the public UI needs (no internal sync metadata)."""
    return {
        "id": p.get("id"),
        "order_id": p.get("cf_order_id") or p.get("order_id"),
        "student_name": p.get("student_name"),
        "school_name": p.get("school_name"),
        "grade": p.get("grade"),
        "division": p.get("division"),
        "skill": p.get("skill"),
        "amount": p.get("amount"),
        "payment_time": p.get("payment_time") or p.get("updated_at") or p.get("created_at"),
    }


# ── Request bodies ──────────────────────────────────────────────────────────
class SendOtpBody(BaseModel):
    phone: str


class VerifyOtpBody(BaseModel):
    phone: str
    otp: str = Field(min_length=4, max_length=6)


# ── Endpoints ───────────────────────────────────────────────────────────────
@router.post("/receipts/school-student/send-otp")
async def receipts_send_otp(body: SendOtpBody):
    """Send a 4-digit OTP via AiSensy WhatsApp to the supplied phone.

    Only sends if the phone has at least one PAID school-student payment on
    record — otherwise the parent would never see a receipt anyway, and we
    avoid spamming random phone numbers.
    """
    phone = _normalize_phone(body.phone)
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit phone number.")

    payments = await _find_paid_payments_for_phone(phone)
    if not payments:
        raise HTTPException(
            status_code=404,
            detail=(
                "No paid receipts found for this phone number. "
                "Please ensure you completed an online payment via the school link "
                "and use the same phone number you entered on the payment form."
            ),
        )

    allowed, reason = await otp_send_allowed(phone)
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)

    # 4-digit OTP via SystemRandom
    import random
    otp = str(random.SystemRandom().randint(1000, 9999))
    await otp_store_new(phone, otp)

    aisensy_key = os.environ.get("AISENSY_API_KEY", "")
    if not aisensy_key:
        # In preview/dev, log the OTP so the agent can still test the flow.
        print(f"[RECEIPT_OTP] (dev) {phone} → {otp}")
        return {"sent": True, "channel": "console", "masked_phone": f"******{phone[-4:]}"}

    payload = {
        "apiKey": aisensy_key,
        "campaignName": "otp",
        "destination": f"91{phone}",
        "userName": "Clone Futura Live Solutions Ltd",
        "templateParams": [otp],
        "source": "OLL Receipt Portal",
        "media": {},
        "buttons": [
            {
                "type": "button",
                "sub_type": "url",
                "index": 0,
                "parameters": [{"type": "text", "text": otp}],
            }
        ],
        "carouselCards": [],
        "location": {},
        "attributes": {},
        "paramsFallbackValue": {"FirstName": otp},
    }
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://backend.aisensy.com/campaign/t1/api/v2",
                json=payload,
                timeout=20.0,
            )
            body_json = {}
            try:
                body_json = r.json()
            except Exception:
                body_json = {"raw": r.text}
            success = bool(body_json.get("submitted_message_id")) or str(body_json.get("success", "")).lower() == "true"
            print(f"[RECEIPT_OTP] AiSensy → 91{phone} | http={r.status_code} | body={body_json}")
            if not success:
                # Bubble the AiSensy error up so the admin (and the user) know
                # WHY OTP didn't arrive (e.g. WCC credits exhausted).
                raise HTTPException(
                    status_code=502,
                    detail=f"WhatsApp delivery failed: {body_json.get('message') or body_json.get('error') or 'unknown error'}",
                )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[RECEIPT_OTP] AiSensy exception: {e}")
        raise HTTPException(status_code=502, detail=f"WhatsApp service unreachable: {e}")

    return {"sent": True, "channel": "whatsapp", "masked_phone": f"******{phone[-4:]}"}


@router.post("/receipts/school-student/verify-otp")
async def receipts_verify_otp(body: VerifyOtpBody):
    """Verify the OTP and return a 30-min download token + list of paid receipts."""
    phone = _normalize_phone(body.phone)
    ok, err = await otp_verify(phone, body.otp)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Invalid OTP")

    payments = await _find_paid_payments_for_phone(phone)
    return {
        "phone": phone,
        "masked_phone": f"******{phone[-4:]}",
        "token": _issue_receipt_token(phone),
        "expires_in_minutes": RECEIPT_JWT_TTL_MIN,
        "payments": [_payment_to_safe_dict(p) for p in payments],
    }


@router.get("/receipts/school-student/{payment_id}/view")
async def receipts_view(
    payment_id: str,
    token: str = Query(..., description="Receipt download token from verify-otp"),
):
    """Return the receipt as a styled HTML page. The browser can save it as
    PDF via the native Print dialog (Cmd/Ctrl+P → Save as PDF)."""
    phone = _decode_receipt_token(token)
    payment = await db.school_student_payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if _normalize_phone(payment.get("phone") or "") != phone:
        # Phone in the token must match the payment's phone — prevents using a
        # valid token from one parent to fetch another parent's receipt.
        raise HTTPException(status_code=403, detail="This receipt does not belong to the verified phone number.")
    if (payment.get("payment_status") or payment.get("status") or "").lower() not in {"paid", "success"}:
        raise HTTPException(status_code=400, detail="Payment is not marked as paid yet.")

    # Re-use the same HTML template the receipt-email pipeline uses, with a
    # print-friendly `<style>` block + a Download button that triggers
    # window.print() so the parent can save the receipt as PDF.
    from .payments import _build_receipt_html  # local import avoids circular import at boot
    html = _build_receipt_html(
        student_name=payment.get("student_name") or "Student",
        school_name=payment.get("school_name") or "OLL",
        grade=str(payment.get("grade") or ""),
        division=str(payment.get("division") or ""),
        skill=str(payment.get("skill") or "Future Skills Program"),
        amount=float(payment.get("amount") or 0),
        transaction_id=str(payment.get("cf_payment_id") or payment.get("transaction_id") or ""),
        order_id=str(payment.get("cf_order_id") or payment.get("order_id") or payment.get("id") or ""),
    )
    # Inject a print/download button + print-friendly stylesheet (only on screen, hidden in print).
    inject = """
    <style>
      @media print { .no-print { display: none !important; } body { background:#fff !important; } }
      .no-print { position:fixed; top:16px; right:16px; z-index:99; display:flex; gap:8px; }
      .no-print button { font-family: 'Segoe UI', Arial, sans-serif; padding:10px 16px; border:0;
        border-radius:8px; cursor:pointer; font-weight:600; font-size:13px;
        box-shadow:0 2px 6px rgba(0,0,0,.12); background:#1E3A5F; color:#fff; }
      .no-print button:hover { background:#15294a; }
    </style>
    <div class="no-print">
      <button onclick="window.print()">Download / Print Receipt</button>
    </div>
    """
    # Inject before the closing </body>
    if "</body>" in html:
        html = html.replace("</body>", inject + "</body>")
    else:
        html += inject
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html, status_code=200)
