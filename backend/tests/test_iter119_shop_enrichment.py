"""Iteration 119: shop enrichment, categorization, PDP fields."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://camp-lead-capture.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def products():
    r = requests.get(f"{BASE_URL}/api/shop/products", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    return data


def test_products_listing_count_and_no_500(products):
    assert "products" in products
    assert len(products["products"]) >= 80  # ~90 expected
    # All items should have new fields
    for p in products["products"][:5]:
        assert "gallery_urls" in p and isinstance(p["gallery_urls"], list)
        assert "video_url" in p
        assert "includes" in p and isinstance(p["includes"], list)
        assert "description_html" in p
        assert "description_md" in p


def test_robo_sumo_pdp_enriched():
    slug = "robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a"
    r = requests.get(f"{BASE_URL}/api/shop/products/{slug}", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    p = data["product"]
    # Gallery with multiple images (hero + 3 extras minimum = 4)
    assert len(p["gallery_urls"]) >= 4, f"gallery={p['gallery_urls']}"
    # Video
    assert p["video_url"] and "D5ngdbvLMC4" in p["video_url"], p["video_url"]
    # Includes
    assert len(p["includes"]) == 9, f"includes count={len(p['includes'])}"
    for row in p["includes"]:
        assert "name" in row and "qty" in row and "unit" in row
    # Description md should include ** or - for bold/bullets
    assert p["description_md"]
    assert "**" in p["description_md"] or "- " in p["description_md"]


def test_bare_product_has_empty_rich_fields():
    # Pick any non-robo-sumo product
    r = requests.get(f"{BASE_URL}/api/shop/products", timeout=30)
    products = r.json()["products"]
    # Find a Blox product (bare)
    bare = next((p for p in products if "blox" in p["name"].lower() and "sumo" not in p["name"].lower()), None)
    assert bare is not None
    # Fetch its PDP
    from re import sub
    slug_name = sub(r"[^a-z0-9]+", "-", bare["name"].lower()).strip("-")
    pid_frag = bare["id"].replace("-", "")[:8]
    slug = f"{slug_name}-{pid_frag}"
    r = requests.get(f"{BASE_URL}/api/shop/products/{slug}", timeout=30)
    assert r.status_code == 200, r.text
    p = r.json()["product"]
    # gallery should be just hero (1), no video, no includes
    assert len(p["gallery_urls"]) <= 1, f"bare has gallery={p['gallery_urls']}"
    assert not p["video_url"]
    assert p["includes"] == []


def test_ai_vision_blox_in_individual_components():
    r = requests.get(f"{BASE_URL}/api/shop/products", timeout=30)
    products = r.json()["products"]
    ai_vision = [p for p in products if "ai vision blox" in p["name"].lower()]
    assert ai_vision, "AI Vision Blox product missing"
