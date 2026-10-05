#!/usr/bin/env python3
"""
rebuild_product_sitemap.py
──────────────────────────
Fetches the live /api/shop/products catalogue and splices every product URL
into /app/frontend/public/sitemap.xml so Google can discover each product
detail page.

In production, /sitemap.xml is served from the FastAPI backend route
(backend/routes/seo.py) which already pulls products dynamically. On the
Emergent preview (and any CDN that serves /app/frontend/public statically)
the backend route is bypassed and this static file wins — so we keep it
in sync via this script.

Usage:
    python3 scripts/rebuild_product_sitemap.py

Re-run after a vendor-catalogue update (new products added, products
removed/renamed). Idempotent — running twice is safe (it strips the old
auto-generated block before writing a new one).
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import date
from urllib import request

BACKEND_URL = os.environ.get(
    'BACKEND_URL',
    'https://camp-lead-capture.preview.emergentagent.com',
)
SITEMAP_PATH = '/app/frontend/public/sitemap.xml'
AUTO_MARK_START = '<!-- Shop product PDPs (auto-generated'
AUTO_MARK_END   = '<!-- /Shop product PDPs -->'


def slugify(s: str) -> str:
    s = (s or '').lower().strip()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return re.sub(r'-+', '-', s)


def product_slug(p: dict) -> str | None:
    pid = (p.get('id') or '').replace('-', '')
    name = slugify(p.get('name') or '')
    if not pid or not name:
        return None
    return f'{name}-{pid[:8]}'


def fetch_products() -> list[dict]:
    req = request.Request(
        f'{BACKEND_URL}/api/shop/products',
        headers={'User-Agent': 'oll-sitemap-builder/1.0'},
    )
    with request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    return data.get('products', [])


def build_block(products: list[dict]) -> str:
    today = date.today().isoformat()
    lines = [f'  {AUTO_MARK_START} {today}, {{n}} products) -->']
    slugs = sorted({product_slug(p) for p in products if product_slug(p)})
    for slug in slugs:
        lines.append(
            f'  <url>\n'
            f'    <loc>https://oll.co/shop/product/{slug}</loc>\n'
            f'    <lastmod>{today}</lastmod>\n'
            f'    <changefreq>weekly</changefreq>\n'
            f'    <priority>0.7</priority>\n'
            f'  </url>'
        )
    lines.append(f'  {AUTO_MARK_END}')
    return '\n'.join(lines).replace('{n}', str(len(slugs))) + '\n'


def splice(sitemap: str, block: str) -> str:
    # Strip any previous auto-generated block
    start_re = re.escape(AUTO_MARK_START)
    end_re = re.escape(AUTO_MARK_END)
    sitemap = re.sub(
        rf'\n?\s*{start_re}.*?{end_re}\n',
        '\n',
        sitemap,
        flags=re.DOTALL,
    )
    return sitemap.replace('</urlset>', block + '</urlset>')


def main() -> int:
    products = fetch_products()
    block = build_block(products)
    with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
        sitemap = f.read()
    new = splice(sitemap, block)
    with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
        f.write(new)
    total = new.count('<loc>')
    print(f'ok — {len(products)} products merged → {total} total URLs in sitemap.xml')
    return 0


if __name__ == '__main__':
    sys.exit(main())
