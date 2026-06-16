"""
Backend tests for the Robotics Kit Shop module (/api/shop and /api/admin/shop).

Covers:
  - Public product listing + filtering + delivery_charge constant
  - Order creation (positive + negative validation)
  - Payment initiation against Cashfree (production)
  - Webhook PAID flow + per-vendor purchase-order split
  - Verify endpoint
  - Admin orders, POs (with status patch), products list, product override
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@oll.co")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Dagaji03@")


# ── fixtures ───────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def admin_token():
    candidates = ["/admin/login", "/auth/login", "/login"]
    for path in candidates:
        try:
            r = requests.post(f"{API}{path}", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
            if r.status_code == 200:
                data = r.json()
                token = data.get("token") or data.get("access_token") or (data.get("user") or {}).get("token")
                if token:
                    return token
        except Exception:
            pass
    pytest.skip("Could not authenticate as admin")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def first_product():
    r = requests.get(f"{API}/shop/products", timeout=20)
    assert r.status_code == 200
    products = r.json().get("products", [])
    assert products, "No products returned"
    return products[0]


# ── Public: products ───────────────────────────────────────────────────────
class TestPublicProducts:
    def test_list_products_shape(self):
        r = requests.get(f"{API}/shop/products", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "products" in data and "count" in data and "delivery_charge" in data
        assert data["delivery_charge"] == 150
        assert data["count"] == len(data["products"])
        assert data["count"] > 0
        p = data["products"][0]
        for key in ("id", "name", "sku", "vendor_id", "vendor_name",
                    "image_url", "mrp", "selling_price", "show_on_shop", "category"):
            assert key in p, f"Missing key {key} in product"
        assert p["show_on_shop"] is True
        assert isinstance(p["mrp"], (int, float))

    def test_category_filter(self):
        r = requests.get(f"{API}/shop/products", params={"category": "Robotics Kits"}, timeout=20)
        assert r.status_code == 200
        for p in r.json()["products"]:
            assert p["category"].lower() == "robotics kits"

    def test_count_around_139(self):
        r = requests.get(f"{API}/shop/products", timeout=20)
        count = r.json().get("count")
        # allow some flexibility but must be in expected ballpark
        assert 100 <= count <= 200, f"Unexpected product count {count}"


# ── Public: orders ─────────────────────────────────────────────────────────
def _valid_shipping():
    return {
        "full_name": "Test Buyer",
        "email": "TEST_buyer@example.com",
        "phone": "9876543210",
        "line1": "1, Test Street",
        "line2": "Near Park",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "notes": "auto-test",
    }


class TestOrders:
    def test_create_order_success(self, first_product):
        body = {
            "items": [
                {"product_id": first_product["id"], "quantity": 2},
            ],
            "shipping": _valid_shipping(),
        }
        r = requests.post(f"{API}/shop/orders", json=body, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "order_id" in data and "order" in data
        order = data["order"]
        assert order["delivery_charge"] == 150
        sub = sum(it["line_total"] for it in order["items"])
        assert round(order["subtotal"], 2) == round(sub, 2)
        assert round(order["total"], 2) == round(sub + 150, 2)
        assert order["payment_status"] == "pending"
        # save for next test
        pytest.shared_order_id = data["order_id"]
        pytest.shared_total = order["total"]

    def test_create_order_two_items(self, first_product):
        # use same vendor + 2 quantities to test line totals
        body = {
            "items": [
                {"product_id": first_product["id"], "quantity": 1},
                {"product_id": first_product["id"], "quantity": 3},
            ],
            "shipping": _valid_shipping(),
        }
        r = requests.post(f"{API}/shop/orders", json=body, timeout=15)
        assert r.status_code == 200, r.text
        order = r.json()["order"]
        assert order["delivery_charge"] == 150
        assert round(order["total"], 2) == round(order["subtotal"] + 150, 2)

    def test_empty_cart_rejected(self):
        body = {"items": [], "shipping": _valid_shipping()}
        r = requests.post(f"{API}/shop/orders", json=body, timeout=15)
        assert r.status_code in (400, 422), r.text

    def test_invalid_pincode_rejected(self, first_product):
        s = _valid_shipping()
        s["pincode"] = "12"  # too short → pydantic 422
        body = {"items": [{"product_id": first_product["id"], "quantity": 1}], "shipping": s}
        r = requests.post(f"{API}/shop/orders", json=body, timeout=15)
        assert r.status_code in (400, 422)


# ── Public: payment init ──────────────────────────────────────────────────
class TestPayment:
    def test_initiate_payment(self):
        oid = getattr(pytest, "shared_order_id", None)
        if not oid:
            pytest.skip("Need an order_id from previous test")
        r = requests.post(f"{API}/shop/initiate-payment", json={"order_id": oid}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("payment_session_id")
        assert d.get("cashfree_order_id")
        assert d.get("cf_mode") in ("production", "sandbox")
        pytest.shared_cf_order_id = d["cashfree_order_id"]

    def test_verify_pending(self):
        oid = getattr(pytest, "shared_order_id", None)
        if not oid:
            pytest.skip("Need order id")
        r = requests.get(f"{API}/shop/verify/{oid}", timeout=20)
        assert r.status_code == 200
        d = r.json()
        # Order not actually paid in real Cashfree; should be pending/ACTIVE
        assert d["status"] in ("pending", "ACTIVE", "PAID")


# ── Webhook → PO split ─────────────────────────────────────────────────────
class TestWebhookAndPOs:
    def test_webhook_marks_paid_and_creates_pos(self, admin_headers, first_product):
        # create a fresh order so we have a known cashfree_order_id (after init)
        body = {
            "items": [{"product_id": first_product["id"], "quantity": 1}],
            "shipping": _valid_shipping(),
        }
        r = requests.post(f"{API}/shop/orders", json=body, timeout=15)
        assert r.status_code == 200
        oid = r.json()["order_id"]
        r2 = requests.post(f"{API}/shop/initiate-payment", json={"order_id": oid}, timeout=30)
        assert r2.status_code == 200, r2.text
        cf_order_id = r2.json()["cashfree_order_id"]

        # Simulate webhook PAID payload
        payload = {"data": {"order": {"order_id": cf_order_id, "order_status": "PAID"}}}
        wh = requests.post(f"{API}/shop/webhook", json=payload, timeout=30)
        assert wh.status_code == 200, wh.text
        assert wh.json().get("status") == "ok"

        # Verify the order shows PAID with purchase_orders array
        v = requests.get(f"{API}/shop/verify/{oid}", timeout=20)
        assert v.status_code == 200, v.text
        vdata = v.json()
        assert vdata["status"] == "PAID"
        assert vdata["order"]["payment_status"] == "paid"
        assert len(vdata["order"].get("purchase_orders") or []) >= 1

        # Admin: list POs and confirm at least one PO exists for this order
        pr = requests.get(f"{API}/admin/shop/purchase-orders", headers=admin_headers, timeout=20)
        assert pr.status_code == 200, pr.text
        pos = pr.json()["purchase_orders"]
        matching = [p for p in pos if p["shop_order_id"] == oid]
        assert len(matching) >= 1
        # there should be exactly one vendor (only one vendor in catalog right now)
        vendors = {p["vendor_id"] for p in matching}
        assert len(vendors) == len(matching)  # one PO per vendor
        pytest.shared_po_id = matching[0]["id"]


# ── Admin endpoints ───────────────────────────────────────────────────────
class TestAdminEndpoints:
    def test_admin_orders_listing(self, admin_headers):
        r = requests.get(f"{API}/admin/shop/orders", headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        assert "orders" in r.json()

    def test_admin_orders_paid_filter(self, admin_headers):
        r = requests.get(f"{API}/admin/shop/orders", params={"status": "paid"},
                         headers=admin_headers, timeout=20)
        assert r.status_code == 200
        for o in r.json()["orders"]:
            assert o["payment_status"] == "paid"

    def test_admin_products_list_with_overrides(self, admin_headers):
        r = requests.get(f"{API}/admin/shop/products", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["count"] >= 100
        assert isinstance(data["products"], list)
        assert "show_on_shop" in data["products"][0]

    def test_admin_update_product_override_persists(self, admin_headers, first_product):
        pid = first_product["id"]
        new_mrp = 3499.0
        new_sp = 2999.0
        r = requests.put(
            f"{API}/admin/shop/products/{pid}",
            json={"mrp": new_mrp, "selling_price": new_sp, "show_on_shop": True},
            headers=admin_headers, timeout=15
        )
        assert r.status_code == 200, r.text
        ov = r.json()["override"]
        assert ov["mrp"] == new_mrp and ov["selling_price"] == new_sp
        # Reflected in public list?
        time.sleep(1)
        pr = requests.get(f"{API}/shop/products", timeout=20)
        prods = {p["id"]: p for p in pr.json()["products"]}
        assert pid in prods
        assert prods[pid]["mrp"] == new_mrp
        assert prods[pid]["selling_price"] == new_sp

    def test_admin_hide_product(self, admin_headers, first_product):
        pid = first_product["id"]
        r = requests.put(
            f"{API}/admin/shop/products/{pid}",
            json={"show_on_shop": False},
            headers=admin_headers, timeout=15
        )
        assert r.status_code == 200
        time.sleep(1)
        pr = requests.get(f"{API}/shop/products", timeout=20)
        ids = [p["id"] for p in pr.json()["products"]]
        assert pid not in ids, "Hidden product still showing in public listing"
        # restore visibility for subsequent runs
        requests.put(
            f"{API}/admin/shop/products/{pid}",
            json={"show_on_shop": True},
            headers=admin_headers, timeout=15
        )

    def test_admin_patch_po_dispatched(self, admin_headers):
        po_id = getattr(pytest, "shared_po_id", None)
        if not po_id:
            pytest.skip("No PO created")
        r = requests.patch(
            f"{API}/admin/shop/purchase-orders/{po_id}",
            json={"fulfillment_status": "dispatched"},
            headers=admin_headers, timeout=15
        )
        assert r.status_code == 200, r.text
        assert r.json()["purchase_order"]["fulfillment_status"] == "dispatched"

    def test_admin_patch_po_invalid_status(self, admin_headers):
        po_id = getattr(pytest, "shared_po_id", None)
        if not po_id:
            pytest.skip("No PO created")
        r = requests.patch(
            f"{API}/admin/shop/purchase-orders/{po_id}",
            json={"fulfillment_status": "bogus_status"},
            headers=admin_headers, timeout=15
        )
        assert r.status_code == 400
