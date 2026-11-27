/**
 * OG Image Optimizer
 * ──────────────────
 * WhatsApp, Twitter, LinkedIn, Slack and most social crawlers refuse to
 * fetch og:image assets larger than ~1 MB (WhatsApp is the strictest, ~600
 * KB in practice). Many of our marketing images on customer-assets are
 * 1–3 MB PNGs which is why link previews silently fail to show an image.
 *
 * We route OG images through wsrv.nl (a free, reliable CDN proxy used by
 * thousands of production sites including Cloudflare blogs) to resize +
 * recompress them to 1200×630 JPG @ q80, which lands at ~150–300 KB.
 *
 * Usage:
 *   import { ogImage } from '@/utils/ogImage';
 *   <meta property="og:image" content={ogImage(myImageUrl)} />
 *
 * The output URL is HTTPS, ratio-correct, and always-fresh (no caching
 * issues with WhatsApp/Facebook scrapers since each transform variant
 * gets its own cache key on wsrv.nl).
 */

const WSRV = 'https://wsrv.nl/?';

export function ogImage(src, { w = 1200, h = 630, q = 80 } = {}) {
  if (!src) return src;
  // Already a wsrv.nl-wrapped URL? Don't double-wrap.
  if (src.startsWith(WSRV)) return src;
  const params = new URLSearchParams({
    url: src,
    w: String(w),
    h: String(h),
    fit: 'cover',
    output: 'jpg',
    q: String(q),
    we: '1', // serve WebP if browser supports, JPG fallback — crawlers get JPG
  });
  return `${WSRV}${params.toString()}`;
}

export default ogImage;
