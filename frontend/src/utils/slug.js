// Tiny slug helper used to build SEO-friendly shop product URLs.
// Format: `${slugified-name}-${first-8-of-product-id}` — mirrors backend `_slugify`.
export function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'product';
}

export function productSlug(product) {
  if (!product) return '';
  const id = String(product.id || '').replace(/-/g, '');
  return `${slugify(product.name)}-${id.slice(0, 8)}`;
}
