/**
 * NoIndexMeta — drop-in <head> helper that stamps a strict
 * `robots: noindex, nofollow, noarchive` meta tag on the current page.
 *
 * Why we need this: Search Console shows private flow URLs
 * (/receipt, /school-pay/:id, /mycoursedetail/:id, /shop/success,
 * payment-success routes, etc.) getting indexed by Googlebot before
 * robots.txt disallow rules propagate.  Adding a page-level noindex
 * meta is the fastest signal — Google will drop these from the index
 * on the next crawl.
 *
 * Use either:
 *   <NoIndexMeta />                              // inline inside JSX
 *   or wrap a route:
 *   <Route path="/receipt" element={<><NoIndexMeta /><PublicReceiptPage /></>} />
 *
 * The component is intentionally render-nothing + effect-only so it
 * cleans itself up on unmount, restoring whatever robots meta the
 * previous page / index.html had.
 */
import { useEffect } from 'react';

const ATTR = 'data-noindex-meta';

const NoIndexMeta = () => {
  useEffect(() => {
    let el = document.head.querySelector('meta[name="robots"]');
    const previous = el ? el.getAttribute('content') : null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'robots');
      document.head.appendChild(el);
    }
    el.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');
    el.setAttribute(ATTR, '1');
    return () => {
      if (!el) return;
      if (previous === null) {
        el.remove();
      } else {
        el.setAttribute('content', previous);
        el.removeAttribute(ATTR);
      }
    };
  }, []);
  return null;
};

export default NoIndexMeta;
