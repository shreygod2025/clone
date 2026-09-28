"""Shop coupon codes.

Public endpoint:
  POST /api/shop/coupons/validate  (used by checkout)

Admin CRUD (settings → Coupons):
  GET    /api/admin/shop/coupons
  POST   /api/admin/shop/coupons
  PATCH  /api/admin/shop/coupons/{coupon_id}
  DELETE /api/admin/shop/coupons/{coupon_id}

Data model (``shop_coupons`` collection):
  id, code (upper), discount_type ('percent'|'amount'), discount_value,
  product_ids [vendor_product_ids] (empty = all products),
  expires_at (ISO or null), is_active (bool),
  max_uses (int or null), usage_count (int),
  created_at, updated_at.

The order-creation endpoint in ``shop.py`` calls ``compute_coupon_discount``
so validation stays server-side; the frontend just previews the amount.
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from .shared import db, get_current_user

router = APIRouter()
log = logging.getLogger(__name__)


# ── Models ─────────────────────────────────────────────────────────────────

class CouponIn(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    discount_type: str = Field(pattern=r"^(percent|amount)$")
    discount_value: float = Field(gt=0)
    product_ids: List[str] = Field(default_factory=list)
    expires_at: Optional[str] = None  # ISO datetime string
    is_active: bool = True
    max_uses: Optional[int] = None

    @field_validator("code")
    @classmethod
    def _normalise_code(cls, v: str) -> str:
        return re.sub(r"\s+", "", v).upper()

    @field_validator("discount_value")
    @classmethod
    def _validate_percent(cls, v: float, info):
        dtype = info.data.get("discount_type")
        if dtype == "percent" and v > 100:
            raise ValueError("Percentage discount cannot exceed 100")
        return v


class CouponPatch(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = Field(default=None, pattern=r"^(percent|amount)$")
    discount_value: Optional[float] = Field(default=None, gt=0)
    product_ids: Optional[List[str]] = None
    expires_at: Optional[str] = None
    is_active: Optional[bool] = None
    max_uses: Optional[int] = None


class CouponValidateIn(BaseModel):
    code: str
    items: List[dict]  # [{ product_id, quantity, unit_price }]


# ── Helpers ────────────────────────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def _is_expired(coupon: dict) -> bool:
    exp = coupon.get("expires_at")
    if not exp:
        return False
    try:
        # accept both ``YYYY-MM-DD`` and ISO datetime
        s = exp if "T" in exp else f"{exp}T23:59:59+00:00"
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return datetime.now(timezone.utc) > dt
    except Exception:
        return False


async def _find_coupon_by_code(code: str) -> Optional[dict]:
    code_u = re.sub(r"\s+", "", (code or "")).upper()
    if not code_u:
        return None
    return await db.shop_coupons.find_one({"code": code_u})


def compute_coupon_discount(coupon: dict, items: List[dict]) -> tuple[float, str]:
    """Return (discount_amount, error_message). If discount_amount == 0 and
    error_message is non-empty, the coupon is invalid for the given cart."""
    if not coupon:
        return 0.0, "Invalid coupon code"
    if not coupon.get("is_active", True):
        return 0.0, "This coupon is no longer active"
    if _is_expired(coupon):
        return 0.0, "This coupon has expired"
    max_uses = coupon.get("max_uses")
    if max_uses and coupon.get("usage_count", 0) >= max_uses:
        return 0.0, "This coupon has reached its usage limit"

    eligible_ids = set(coupon.get("product_ids") or [])
    eligible_subtotal = 0.0
    for it in items or []:
        pid = it.get("product_id")
        qty = float(it.get("quantity") or 0)
        price = float(it.get("unit_price") or 0)
        if not pid or qty <= 0 or price <= 0:
            continue
        if eligible_ids and pid not in eligible_ids:
            continue
        eligible_subtotal += price * qty

    if eligible_subtotal <= 0:
        return 0.0, "Coupon is not applicable to items in your cart"

    dtype = coupon.get("discount_type", "percent")
    dvalue = float(coupon.get("discount_value") or 0)
    if dtype == "percent":
        discount = round(eligible_subtotal * (dvalue / 100.0), 2)
    else:
        discount = round(min(dvalue, eligible_subtotal), 2)

    return max(discount, 0.0), ""


async def increment_coupon_usage(code: Optional[str]) -> None:
    if not code:
        return
    try:
        await db.shop_coupons.update_one(
            {"code": (code or "").upper()},
            {"$inc": {"usage_count": 1}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        )
    except Exception as exc:  # pragma: no cover — usage bump must never break checkout
        log.warning("Failed to bump coupon usage_count for %s: %s", code, exc)


def _is_admin(user: dict) -> bool:
    return user.get("role") in {"admin", "super_admin"}


# ── Public: coupon preview during checkout ────────────────────────────────

@router.post("/shop/coupons/validate")
async def validate_coupon(body: CouponValidateIn):
    coupon = await _find_coupon_by_code(body.code)
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    discount, err = compute_coupon_discount(coupon, body.items or [])
    if err:
        raise HTTPException(status_code=400, detail=err)
    return {
        "valid": True,
        "code": coupon["code"],
        "discount_amount": discount,
        "discount_type": coupon["discount_type"],
        "discount_value": coupon["discount_value"],
        "product_ids": coupon.get("product_ids") or [],
    }


# ── Admin CRUD ────────────────────────────────────────────────────────────

@router.get("/admin/shop/coupons")
async def list_coupons(user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    cursor = db.shop_coupons.find({}).sort("created_at", -1)
    items: List[dict] = []
    async for doc in cursor:
        items.append(_serialize(doc))
    return {"items": items, "count": len(items)}


@router.post("/admin/shop/coupons")
async def create_coupon(body: CouponIn, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    existing = await db.shop_coupons.find_one({"code": body.code})
    if existing:
        raise HTTPException(status_code=409, detail=f"Coupon code '{body.code}' already exists")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": uuid.uuid4().hex,
        **body.model_dump(),
        "usage_count": 0,
        "created_at": now,
        "updated_at": now,
        "created_by": user.get("email") or user.get("id"),
    }
    await db.shop_coupons.insert_one(doc)
    return _serialize(doc)


@router.patch("/admin/shop/coupons/{coupon_id}")
async def update_coupon(
    coupon_id: str,
    body: CouponPatch,
    user: dict = Depends(get_current_user),
):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")

    existing = await db.shop_coupons.find_one({"id": coupon_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Coupon not found")

    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None or k in {"expires_at", "max_uses", "product_ids"}}
    if "code" in updates and updates["code"]:
        updates["code"] = re.sub(r"\s+", "", updates["code"]).upper()
        # Ensure new code is unique
        conflict = await db.shop_coupons.find_one({"code": updates["code"], "id": {"$ne": coupon_id}})
        if conflict:
            raise HTTPException(status_code=409, detail=f"Another coupon uses code '{updates['code']}'")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.shop_coupons.update_one({"id": coupon_id}, {"$set": updates})
    updated = await db.shop_coupons.find_one({"id": coupon_id})
    return _serialize(updated)


@router.delete("/admin/shop/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin only")
    res = await db.shop_coupons.delete_one({"id": coupon_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"ok": True}


# ── Seed the OLLSCHOOL coupon (idempotent, run once on boot) ─────────────

async def ensure_default_coupons() -> None:
    """Create the default OLLSCHOOL coupon (10% off Robo Sumo & Robo Race kits)
    if it does not already exist. Product IDs are resolved lazily by looking
    at the vendor catalog so admins can still edit the coupon afterward."""
    try:
        existing = await db.shop_coupons.find_one({"code": "OLLSCHOOL"})
        if existing:
            return

        # Resolve RoboSumo / RoboRace product IDs from the vendor catalog if
        # available. Fallback to name-matching — admins can edit later.
        product_ids: List[str] = []
        try:
            from .shop import _fetch_vendor_catalog  # local import to avoid cycles
            catalog = await _fetch_vendor_catalog()
            for v in catalog:
                name = (v.get("name") or "").lower().replace("-", " ")
                if "robo sumo" in name or "robosumo" in name or "robo race" in name or "roborace" in name:
                    product_ids.append(v["id"])
        except Exception as exc:  # pragma: no cover — seed must never break boot
            log.warning("Coupon seed: could not resolve product ids: %s", exc)

        now = datetime.now(timezone.utc).isoformat()
        await db.shop_coupons.insert_one({
            "id": uuid.uuid4().hex,
            "code": "OLLSCHOOL",
            "discount_type": "percent",
            "discount_value": 10.0,
            "product_ids": product_ids,
            "expires_at": None,
            "is_active": True,
            "max_uses": None,
            "usage_count": 0,
            "created_at": now,
            "updated_at": now,
            "created_by": "system",
        })
        log.info("Seeded default coupon OLLSCHOOL with %d product(s)", len(product_ids))
    except Exception as exc:  # pragma: no cover
        log.warning("ensure_default_coupons failed: %s", exc)
