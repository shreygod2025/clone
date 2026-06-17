"""
Robotics Kit Shop — guest-checkout e-commerce module.

Flow:
  1. Products are fetched from the OLL Vendor Panel public API at
     `/api/public/products`. The vendor API currently returns only
     {id, name, sku, vendor_id, vendor_name, unit, description}.
     Until the vendor adds `image_url / mrp / unit_price / show_on_shop`,
     we augment each product with a deterministic SAMPLE image + MRP
     stored locally (collection `shop_product_overrides`). Admins can edit
     the override via /api/admin/shop/products/{vendor_product_id}.
  2. Guest customer adds items, fills shipping address, pays via Cashfree.
  3. On `PAID` webhook (or manual verify), the order is split per vendor and
     one POST `/api/public/po-request` is submitted to the vendor system per
     vendor, returning a `tracking_token` we save on each PO.
  4. Admin can view all shop orders + per-vendor POs at /admin/shop.

Endpoints:
  Public:
    GET    /api/shop/products
    POST   /api/shop/orders
    POST   /api/shop/initiate-payment
    POST   /api/shop/webhook
    GET    /api/shop/verify/{order_id}
    GET    /api/shop/order/{order_id}
  Admin (JWT required):
    GET    /api/admin/shop/orders
    GET    /api/admin/shop/purchase-orders
    PATCH  /api/admin/shop/purchase-orders/{po_id}
    GET    /api/admin/shop/products
    PUT    /api/admin/shop/products/{vendor_product_id}
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import time
import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Optional

import httpx
import resend
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

try:
    from cashfree_pg.models.create_order_request import CreateOrderRequest
    from cashfree_pg.api_client import Cashfree
    from cashfree_pg.models.customer_details import CustomerDetails as CashfreeCustomerDetails
    from cashfree_pg.models.order_meta import OrderMeta
    CASHFREE_AVAILABLE = True
except ImportError:
    CASHFREE_AVAILABLE = False
    Cashfree = None
    CashfreeCustomerDetails = None
    OrderMeta = None
    CreateOrderRequest = None

from .shared import db, get_current_user
from .expenses import (
    VENDOR_PUBLIC_API,
    PO_API_BASE_URL,
    PO_API_KEY,
    transform_tracking_url,
)

router = APIRouter()

CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENVIRONMENT = os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX")
CASHFREE_API_VERSION = "2023-08-01"
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://oll.co").rstrip("/")
BACKEND_PUBLIC_URL = os.getenv(
    "BACKEND_PUBLIC_URL", os.getenv("REACT_APP_BACKEND_URL", FRONTEND_URL)
).rstrip("/")

DELIVERY_CHARGE = 150.0  # flat shipping fee in INR

# Sample images for products (cycled deterministically per SKU)
SAMPLE_IMAGES = [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1546776230-bb86256870ce?w=600&h=600&fit=crop",
]


def _sample_image_for(product_id: str) -> str:
    h = int(hashlib.md5(product_id.encode("utf-8")).hexdigest(), 16)
    return SAMPLE_IMAGES[h % len(SAMPLE_IMAGES)]


# The vendor panel stores image URLs pointing to a stale preview host that
# returns 404. The same file IDs ARE served by the active vendor host. Rewrite
# the URL so images load on the storefront.
_VENDOR_IMAGE_HOST_REWRITES = {
    "oll-procure.preview.emergentagent.com": "vendorplus-4.emergent.host",
}


def _normalize_vendor_image(url: Optional[str]) -> Optional[str]:
    if not url or not isinstance(url, str):
        return url
    rewritten = url
    for stale, live in _VENDOR_IMAGE_HOST_REWRITES.items():
        if stale in rewritten:
            rewritten = rewritten.replace(stale, live)
            break
    return _optimized_image_url(rewritten)


def _optimized_image_url(url: Optional[str], width: int = 600) -> Optional[str]:
    """Route any HTTP(S) image through the free images.weserv.nl proxy which
    auto-resizes, converts to webp/avif, and edge-caches it globally. This is
    what shrinks the OLL vendor PNGs from ~1.5 MB → ~20 KB on the shop grid.

    `unsplash.com` URLs already serve optimized variants natively, so we let
    them through untouched to avoid a needless extra hop.
    """
    if not url or not isinstance(url, str) or not url.startswith(("http://", "https://")):
        return url
    if "images.unsplash.com" in url or "images.weserv.nl" in url:
        return url
    # Strip scheme — weserv requires bare host/path
    bare = url.split("://", 1)[1]
    # quote_plus would also escape ":/?" — but weserv accepts the unescaped form.
    from urllib.parse import quote
    return (
        f"https://images.weserv.nl/?url={quote(bare, safe='/:?&=')}"
        f"&w={width}&q=80&output=webp"
    )


def _sample_mrp_for(product_id: str, name: str) -> float:
    """Generate a deterministic sample MRP based on the product id + name."""
    name_l = (name or "").lower()
    # Higher MRP for advanced / IOT / certification kits
    if "iot" in name_l or "certification" in name_l:
        base = 2999.0
    elif "lab" in name_l:
        base = 4999.0
    elif "robotics" in name_l:
        base = 1999.0
    else:
        base = 1499.0
    # Add small per-product variance so prices don't all look identical
    h = int(hashlib.md5(product_id.encode("utf-8")).hexdigest()[:6], 16) % 500
    return float(int(base + h - 250))


def _get_cf_client():
    if not CASHFREE_AVAILABLE:
        raise HTTPException(status_code=500, detail="Cashfree SDK not available")
    if CASHFREE_APP_ID and CASHFREE_SECRET_KEY:
        Cashfree.XClientId = CASHFREE_APP_ID
        Cashfree.XClientSecret = CASHFREE_SECRET_KEY
        Cashfree.XEnvironment = (
            Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
        )
    cf_env = Cashfree.PRODUCTION if CASHFREE_ENVIRONMENT == "PRODUCTION" else Cashfree.SANDBOX
    return Cashfree(cf_env)


# ── Vendor catalog cache ────────────────────────────────────────────────────
_VENDOR_CACHE: dict = {"products": None, "ts": 0}
_VENDOR_CACHE_TTL = 300  # 5 minutes


async def _fetch_vendor_catalog(force: bool = False) -> List[dict]:
    """Fetch the vendor product catalog with a 5-minute in-memory cache."""
    now = time.time()
    if (
        not force
        and _VENDOR_CACHE["products"] is not None
        and now - _VENDOR_CACHE["ts"] < _VENDOR_CACHE_TTL
    ):
        return _VENDOR_CACHE["products"]
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(f"{VENDOR_PUBLIC_API}/products", timeout=10.0)
            resp.raise_for_status()
            products = resp.json() or []
            _VENDOR_CACHE["products"] = products
            _VENDOR_CACHE["ts"] = now
            return products
    except Exception as exc:
        logging.error(f"[shop] Failed to fetch vendor catalog: {exc}")
        return _VENDOR_CACHE.get("products") or []


async def _get_overrides_map() -> dict:
    """Load admin product overrides keyed by vendor_product_id."""
    cursor = db.shop_product_overrides.find({}, {"_id": 0})
    docs = await cursor.to_list(1000)
    return {d["vendor_product_id"]: d for d in docs if d.get("vendor_product_id")}


def _merge_product(v: dict, override: Optional[dict]) -> dict:
    """Combine vendor product + local override into the final shop card payload.

    Priority for each field: admin override → real vendor value → sample fallback.
    """
    pid = v["id"]
    name = v.get("name", "").strip()
    ov = override or {}

    vendor_mrp = v.get("mrp")
    vendor_image = _normalize_vendor_image(v.get("image_url"))
    vendor_show = v.get("show_on_shop")  # may be True / False / None
    vendor_unit_price = v.get("unit_price")

    mrp = float(ov.get("mrp") if ov.get("mrp") is not None
                else vendor_mrp if vendor_mrp is not None
                else _sample_mrp_for(pid, name))
    selling_price = float(ov.get("selling_price") if ov.get("selling_price") is not None
                          else vendor_unit_price if vendor_unit_price is not None
                          else mrp)
    image_url = ov.get("image_url") or vendor_image or _sample_image_for(pid)
    description = ov.get("description") or v.get("description") or name

    # show_on_shop precedence: admin override > vendor flag > default False (don't expose
    # anything the vendor hasn't approved).
    if "show_on_shop" in ov and ov.get("show_on_shop") is not None:
        show_on_shop = bool(ov["show_on_shop"])
    elif vendor_show is not None:
        show_on_shop = bool(vendor_show)
    else:
        show_on_shop = False

    return {
        "id": pid,
        "name": name,
        "sku": v.get("sku", "").strip(),
        "vendor_id": v.get("vendor_id"),
        "vendor_name": v.get("vendor_name"),
        "unit": v.get("unit", "pcs"),
        "description": description,
        "mrp": mrp,
        "selling_price": selling_price,
        "image_url": image_url,
        "show_on_shop": show_on_shop,
        "category": ov.get("category")
        or ("IoT Kits" if "iot" in name.lower() else "Robotics Kits"),
    }


# ── Public endpoints ────────────────────────────────────────────────────────


@router.get("/shop/products")
async def get_shop_products(category: Optional[str] = None):
    """Public: list products visible in the shop."""
    vendor_products = await _fetch_vendor_catalog()
    overrides = await _get_overrides_map()
    merged = [_merge_product(v, overrides.get(v["id"])) for v in vendor_products if v.get("id")]
    merged = [p for p in merged if p["show_on_shop"]]
    if category:
        merged = [p for p in merged if p["category"].lower() == category.lower()]
    # Sort: same vendor + name, deterministic
    merged.sort(key=lambda x: (x["category"], x["name"]))
    return {"products": merged, "delivery_charge": DELIVERY_CHARGE, "count": len(merged)}


class ShopCartItem(BaseModel):
    product_id: str
    quantity: int = Field(gt=0, le=20)


class ShippingAddress(BaseModel):
    full_name: str = Field(min_length=2, max_length=80)
    email: Optional[EmailStr] = None
    phone: str = Field(min_length=10, max_length=15)
    line1: str = Field(min_length=4, max_length=200)
    line2: Optional[str] = ""
    city: str = Field(min_length=2, max_length=60)
    state: str = Field(min_length=2, max_length=60)
    pincode: str = Field(min_length=6, max_length=6)
    notes: Optional[str] = ""


class ShopOrderCreate(BaseModel):
    items: List[ShopCartItem]
    shipping: ShippingAddress


@router.post("/shop/orders")
async def create_shop_order(body: ShopOrderCreate):
    """Create a pending shop order; returns order_id used for payment init."""
    if not body.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    vendor_products = await _fetch_vendor_catalog()
    overrides = await _get_overrides_map()
    catalog = {v["id"]: _merge_product(v, overrides.get(v["id"])) for v in vendor_products}

    line_items = []
    subtotal = 0.0
    for it in body.items:
        prod = catalog.get(it.product_id)
        if not prod or not prod["show_on_shop"]:
            raise HTTPException(status_code=400, detail=f"Product unavailable: {it.product_id}")
        price = float(prod["selling_price"])
        line_total = round(price * it.quantity, 2)
        subtotal += line_total
        line_items.append({
            "product_id": prod["id"],
            "name": prod["name"],
            "sku": prod["sku"],
            "vendor_id": prod["vendor_id"],
            "vendor_name": prod["vendor_name"],
            "image_url": prod["image_url"],
            "unit_price": price,
            "mrp": float(prod["mrp"]),
            "quantity": it.quantity,
            "line_total": line_total,
        })

    delivery = DELIVERY_CHARGE if subtotal > 0 else 0.0
    total = round(subtotal + delivery, 2)
    order_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()

    order_doc = {
        "id": order_id,
        "order_no": f"OLL-SHOP-{int(time.time())}",
        "items": line_items,
        "shipping": body.shipping.model_dump(),
        "subtotal": round(subtotal, 2),
        "delivery_charge": delivery,
        "total": total,
        "currency": "INR",
        "payment_status": "pending",
        "fulfillment_status": "pending",
        "cashfree_order_id": None,
        "cf_order_id": None,
        "payment_session_id": None,
        "payment_link": None,
        "purchase_orders": [],  # populated post-payment
        "created_at": now,
        "updated_at": now,
    }
    await db.shop_orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    return {"order_id": order_id, "order": order_doc}


class InitiatePaymentBody(BaseModel):
    order_id: str
    frontend_url: Optional[str] = None


@router.post("/shop/initiate-payment")
async def initiate_shop_payment(body: InitiatePaymentBody):
    """Create a Cashfree order for a pending shop order."""
    order = await db.shop_orders.find_one({"id": body.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Order already paid")

    frontend_url = (body.frontend_url or FRONTEND_URL).rstrip("/")
    backend_url = BACKEND_PUBLIC_URL.rstrip("/")
    shipping = order["shipping"]
    raw_phone = re.sub(r"\D", "", shipping.get("phone", ""))
    if len(raw_phone) > 10:
        raw_phone = raw_phone[-10:]
    if len(raw_phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number for payment")

    cf_order_id = f"SHOP-{order['id'][:8]}-{int(time.time())}"
    try:
        customer = CashfreeCustomerDetails(
            customer_id=order["id"][:50],
            customer_name=shipping["full_name"][:50] or "OLL Shopper",
            customer_email=shipping.get("email") or f"shopper+{raw_phone}@oll.co",
            customer_phone=raw_phone,
        )
        order_meta = OrderMeta(
            return_url=f"{frontend_url}/shop/success?order_id={order['id']}&cf={cf_order_id}",
            notify_url=f"{backend_url}/api/shop/webhook",
        )
        req = CreateOrderRequest(
            order_id=cf_order_id,
            order_amount=float(order["total"]),
            order_currency="INR",
            customer_details=customer,
            order_meta=order_meta,
            order_note=f"OLL Robotics Shop · {len(order['items'])} item(s)",
        )
        cf = _get_cf_client()
        api_response = await asyncio.to_thread(
            cf.PGCreateOrder, CASHFREE_API_VERSION, req, None, None
        )
        if not api_response.data:
            raise HTTPException(status_code=500, detail="Payment gateway error")
        session_id = api_response.data.payment_session_id
        await db.shop_orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "cashfree_order_id": cf_order_id,
                "cf_order_id": str(api_response.data.cf_order_id),
                "payment_session_id": session_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {
            "order_id": order["id"],
            "cashfree_order_id": cf_order_id,
            "payment_session_id": session_id,
            "cf_mode": "production" if CASHFREE_ENVIRONMENT == "PRODUCTION" else "sandbox",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logging.error(f"[shop] payment init error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Payment init failed: {exc}")


# ── Vendor PO submission ─────────────────────────────────────────────────────


async def _submit_vendor_pos(order: dict) -> List[dict]:
    """Split paid order by vendor and submit one PO request per vendor.
    Returns the list of saved PO dicts."""
    # Group items per vendor
    groups: dict = {}
    for it in order.get("items", []):
        vid = it.get("vendor_id") or "unknown"
        groups.setdefault(vid, {
            "vendor_id": vid,
            "vendor_name": it.get("vendor_name") or "Unknown Vendor",
            "items": [],
            "subtotal": 0.0,
        })
        groups[vid]["items"].append(it)
        groups[vid]["subtotal"] += float(it.get("line_total") or 0)

    shipping = order["shipping"]
    delivery_address = ", ".join(
        x for x in [
            shipping.get("line1"),
            shipping.get("line2"),
            shipping.get("city"),
            shipping.get("state"),
            shipping.get("pincode"),
        ] if x
    )
    # delivery date = today + 7 days (vendor expects YYYY-MM-DD)
    from datetime import timedelta
    delivery_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")

    saved_pos = []
    for vid, grp in groups.items():
        payload = {
            "delivery_date": delivery_date,
            "school_name": "OLL Shop Customer",
            "city": shipping.get("city"),
            "delivery_address": delivery_address,
            "contact_person": shipping.get("full_name"),
            "contact_number": shipping.get("phone"),
            "notes": f"OLL Shop order {order['order_no']} · {shipping.get('notes', '')}".strip(),
            "requester_name": "OLL Robotics Shop",
            "products": [
                {
                    "product_id": it["product_id"],
                    "product_name": it["name"],
                    "quantity": it["quantity"],
                }
                for it in grp["items"]
            ],
        }
        po_doc = {
            "id": uuid.uuid4().hex,
            "shop_order_id": order["id"],
            "vendor_id": vid,
            "vendor_name": grp["vendor_name"],
            "items": grp["items"],
            "subtotal": round(grp["subtotal"], 2),
            "delivery_address": delivery_address,
            "delivery_date": delivery_date,
            "contact_person": shipping.get("full_name"),
            "contact_number": shipping.get("phone"),
            "vendor_po_number": None,
            "vendor_tracking_token": None,
            "vendor_tracking_url": None,
            "vendor_submission_status": "pending",
            "vendor_error": None,
            "fulfillment_status": "pending",  # pending | dispatched | delivered
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                resp = await client.post(
                    f"{VENDOR_PUBLIC_API}/po-request",
                    json=payload,
                    timeout=20.0,
                )
                if resp.status_code in (200, 201):
                    data = resp.json() or {}
                    token = data.get("tracking_token") or data.get("token")
                    po_doc["vendor_po_number"] = data.get("po_number")
                    po_doc["vendor_tracking_token"] = token
                    if token:
                        po_doc["vendor_tracking_url"] = transform_tracking_url(
                            f"https://vendorplus-4.emergent.host/track/{token}"
                        )
                    po_doc["vendor_submission_status"] = "submitted"
                else:
                    po_doc["vendor_submission_status"] = "failed"
                    po_doc["vendor_error"] = f"{resp.status_code}: {resp.text[:300]}"
        except Exception as exc:
            po_doc["vendor_submission_status"] = "failed"
            po_doc["vendor_error"] = str(exc)[:300]
            logging.error(f"[shop] vendor PO submission failed for {vid}: {exc}")

        await db.shop_purchase_orders.insert_one(po_doc)
        po_doc.pop("_id", None)
        saved_pos.append(po_doc)

    return saved_pos


async def _send_order_confirmation_email(order: dict, pos: List[dict]):
    """Email the customer a paid confirmation + the admin team. No-op if email missing."""
    shipping = order["shipping"]
    if not shipping.get("email"):
        return
    try:
        from server import get_resend_api_key  # type: ignore
        key = await get_resend_api_key()
        if not key:
            return
        resend.api_key = key
    except Exception:
        if not resend.api_key:
            return
    item_rows = "".join(
        f"""<tr>
            <td style='padding:8px;border-bottom:1px solid #eee'>{it['name']}</td>
            <td style='padding:8px;border-bottom:1px solid #eee;text-align:center'>{it['quantity']}</td>
            <td style='padding:8px;border-bottom:1px solid #eee;text-align:right'>₹{it['line_total']:.0f}</td>
          </tr>"""
        for it in order.get("items", [])
    )
    po_rows = ""  # Legacy var — vendor names are no longer shown to customers.

    # Tracking call-to-action button(s) — no vendor name shown to customer
    tracking_pos = [p for p in pos if p.get("vendor_tracking_url")]
    if len(tracking_pos) == 1:
        _po = tracking_pos[0]
        tracking_block = f"""
          <div style='margin:22px 0;text-align:center'>
            <a href='{_po['vendor_tracking_url']}' target='_blank'
               style='display:inline-block;background:#D63031;color:#fff;font-weight:700;font-size:15px;
                      padding:14px 28px;border-radius:14px;text-decoration:none;
                      box-shadow:0 6px 18px rgba(214,48,49,0.35);letter-spacing:0.3px'>
              &#128230; Track Your Order
            </a>
            <p style='font-size:12px;color:#666;margin-top:8px'>Expected delivery by {_po['delivery_date']}</p>
          </div>
        """
    elif len(tracking_pos) > 1:
        _rows = "".join(
            f"""<a href='{p['vendor_tracking_url']}' target='_blank'
                   style='display:block;background:#D63031;color:#fff;font-weight:700;font-size:14px;
                          padding:12px 18px;border-radius:12px;text-decoration:none;margin:8px 0;text-align:left'>
                <span style='font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px'>Shipment {i+1}</span><br>
                Track {len(p['items'])} item(s) — by {p['delivery_date']}
               </a>"""
            for i, p in enumerate(tracking_pos)
        )
        tracking_block = (
            "<div style='margin:20px 0'>"
            "<p style='font-size:13px;color:#555;font-weight:600;margin-bottom:6px'>&#128230; Track Your Order</p>"
            f"{_rows}</div>"
        )
    else:
        tracking_block = ""
    html = f"""
    <div style='font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:20px;color:#1a1a1a'>
      <div style='background:#1E3A5F;padding:24px;border-radius:10px 10px 0 0;text-align:center'>
        <h1 style='color:#fff;margin:0;font-size:24px'>Order Confirmed · OLL Robotics Shop</h1>
        <p style='color:#cfd8dc;margin:4px 0 0 0'>Order {order['order_no']}</p>
      </div>
      <div style='background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px'>
        <p>Hi {shipping['full_name']},</p>
        <p>Thanks for your order! Here's your summary:</p>
        <table style='width:100%;border-collapse:collapse;margin:12px 0'>
          <thead><tr style='background:#f8f9fa'>
            <th style='padding:8px;text-align:left'>Item</th>
            <th style='padding:8px;text-align:center'>Qty</th>
            <th style='padding:8px;text-align:right'>Amount</th>
          </tr></thead>
          <tbody>{item_rows}</tbody>
        </table>
        <p style='margin:4px 0'>Subtotal: <strong>₹{order['subtotal']:.0f}</strong></p>
        <p style='margin:4px 0'>Delivery: <strong>₹{order['delivery_charge']:.0f}</strong></p>
        <p style='margin:4px 0;font-size:18px'>Total Paid: <strong>₹{order['total']:.0f}</strong></p>
        {tracking_block}
        <hr style='border:none;border-top:1px solid #eee;margin:16px 0'>
        <p><strong>Shipping to:</strong><br>
          {shipping['full_name']}<br>
          {shipping['line1']}{', ' + shipping['line2'] if shipping.get('line2') else ''}<br>
          {shipping['city']}, {shipping['state']} - {shipping['pincode']}<br>
          {shipping['phone']}</p>
        <p style='margin-top:18px'>Need help? Reply to this email or write to <a href='mailto:info@oll.co'>info@oll.co</a>.</p>
        <p>— Team OLL</p>
      </div>
    </div>
    """
    try:
        await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": "OLL Shop <welcome@oll.co>",
                "to": [shipping["email"]],
                "bcc": ["info@oll.co"],
                "subject": f"Order Confirmed · {order['order_no']} · OLL Robotics Shop",
                "html": html,
            },
        )
    except Exception as exc:
        logging.warning(f"[shop] confirmation email failed: {exc}")


async def _finalize_paid_order(order: dict) -> dict:
    """Mark order paid, submit POs, send email. Idempotent."""
    if order.get("payment_status") == "paid":
        return order
    pos = await _submit_vendor_pos(order)
    await db.shop_orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "payment_status": "paid",
            "fulfillment_status": "po_submitted" if any(
                p.get("vendor_submission_status") == "submitted" for p in pos
            ) else "pending",
            "purchase_orders": [p["id"] for p in pos],
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    order["payment_status"] = "paid"
    order["purchase_orders"] = [p["id"] for p in pos]
    asyncio.create_task(_send_order_confirmation_email(order, pos))
    return order


@router.post("/shop/webhook")
async def shop_webhook(request: Request):
    """Cashfree webhook — marks order paid and submits vendor POs."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    try:
        data = payload.get("data", {})
        order_data = data.get("order", {}) or {}
        cf_order_id = order_data.get("order_id")
        order_status = order_data.get("order_status")
        if not cf_order_id:
            return {"status": "ignored", "reason": "no order_id"}
        order = await db.shop_orders.find_one({"cashfree_order_id": cf_order_id}, {"_id": 0})
        if not order:
            return {"status": "ignored", "reason": "order not found"}
        if order_status == "PAID":
            await _finalize_paid_order(order)
        return {"status": "ok"}
    except Exception as exc:
        logging.error(f"[shop] webhook error: {exc}", exc_info=True)
        return {"status": "error"}


@router.get("/shop/verify/{order_id}")
async def verify_shop_payment(order_id: str):
    """Polled by the success page after Cashfree redirect."""
    order = await db.shop_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("payment_status") == "paid":
        return {"status": "PAID", "order": order}
    cf_order_id = order.get("cashfree_order_id")
    if not cf_order_id:
        return {"status": "pending", "order": order}
    try:
        cf = _get_cf_client()
        resp = await asyncio.to_thread(cf.PGFetchOrder, CASHFREE_API_VERSION, cf_order_id, None)
        if resp.data and resp.data.order_status == "PAID":
            order = await _finalize_paid_order(order)
            return {"status": "PAID", "order": order}
        return {"status": resp.data.order_status if resp.data else "pending", "order": order}
    except Exception as exc:
        logging.warning(f"[shop] verify error: {exc}")
        return {"status": "pending", "order": order}


@router.get("/shop/order/{order_id}")
async def get_shop_order(order_id: str):
    order = await db.shop_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    pos = []
    if order.get("purchase_orders"):
        cursor = db.shop_purchase_orders.find(
            {"id": {"$in": order["purchase_orders"]}}, {"_id": 0}
        )
        pos = await cursor.to_list(50)
    return {"order": order, "purchase_orders": pos}


# ── Admin endpoints ─────────────────────────────────────────────────────────


@router.get("/admin/shop/orders")
async def admin_list_orders(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    q: dict = {}
    if status:
        q["payment_status"] = status
    cursor = db.shop_orders.find(q, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    orders = await cursor.to_list(limit)
    total = await db.shop_orders.count_documents(q)
    return {"orders": orders, "total": total}


@router.get("/admin/shop/purchase-orders")
async def admin_list_pos(
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    q: dict = {}
    if status:
        q["fulfillment_status"] = status
    if vendor_id:
        q["vendor_id"] = vendor_id
    cursor = db.shop_purchase_orders.find(q, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    pos = await cursor.to_list(limit)
    total = await db.shop_purchase_orders.count_documents(q)
    return {"purchase_orders": pos, "total": total}


class POPatchBody(BaseModel):
    fulfillment_status: Optional[str] = None
    notes: Optional[str] = None


@router.patch("/admin/shop/purchase-orders/{po_id}")
async def admin_update_po(
    po_id: str, body: POPatchBody, user: dict = Depends(get_current_user)
):
    update: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.fulfillment_status:
        if body.fulfillment_status not in ("pending", "dispatched", "delivered", "cancelled"):
            raise HTTPException(status_code=400, detail="Invalid fulfillment_status")
        update["fulfillment_status"] = body.fulfillment_status
    if body.notes is not None:
        update["admin_notes"] = body.notes
    res = await db.shop_purchase_orders.update_one({"id": po_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="PO not found")
    po = await db.shop_purchase_orders.find_one({"id": po_id}, {"_id": 0})
    return {"purchase_order": po}


class ProductOverrideBody(BaseModel):
    image_url: Optional[str] = None
    mrp: Optional[float] = None
    selling_price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    show_on_shop: Optional[bool] = None


@router.post("/admin/shop/sync")
async def admin_sync_vendor_catalog(user: dict = Depends(get_current_user)):
    """Force-refresh the vendor catalog cache so brand-new products show up
    immediately on /shop without waiting for the 5-minute TTL."""
    products = await _fetch_vendor_catalog(force=True)
    visible = sum(1 for p in products if p.get("show_on_shop"))
    return {
        "ok": True,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "total_products": len(products),
        "visible_products": visible,
    }


@router.get("/admin/shop/products")
async def admin_list_products(user: dict = Depends(get_current_user)):
    vendor_products = await _fetch_vendor_catalog(force=True)
    overrides = await _get_overrides_map()
    merged = [_merge_product(v, overrides.get(v["id"])) for v in vendor_products if v.get("id")]
    merged.sort(key=lambda x: (x["vendor_name"] or "", x["name"]))
    return {"products": merged, "count": len(merged)}


@router.put("/admin/shop/products/{vendor_product_id}")
async def admin_update_product_override(
    vendor_product_id: str,
    body: ProductOverrideBody,
    user: dict = Depends(get_current_user),
):
    update: dict = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["vendor_product_id"] = vendor_product_id
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = user.get("email", "admin")
    await db.shop_product_overrides.update_one(
        {"vendor_product_id": vendor_product_id},
        {"$set": update, "$setOnInsert": {"created_at": update["updated_at"]}},
        upsert=True,
    )
    # Invalidate cached vendor list so /shop/products picks the change up
    _VENDOR_CACHE["ts"] = 0
    doc = await db.shop_product_overrides.find_one(
        {"vendor_product_id": vendor_product_id}, {"_id": 0}
    )
    return {"override": doc}
