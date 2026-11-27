/**
 * useSeo — imperatively syncs SEO tags into <head> for React 19.
 *
 * Why: react-helmet-async@2.0.5 silently fails to inject <meta>/<link>/<script>
 * under React 19 (peerDep stops at 18). Title still gets replaced via document.title
 * directly, but description/canonical/OG/JSON-LD never make it to the DOM,
 * which is why every page on the site shares index.html's default description
 * (Search Console-confirmed).
 *
 * This hook works around the bug for now without a major migration: it adds
 * the requested tags on mount, removes them on unmount, and tags them with
 * data-seo-hook="1" so multiple components don't fight each other.
 *
 * Usage:
 *   useSeo({
 *     title: 'Page title | OLL',
 *     description: '160-char description for SERPs.',
 *     canonical: 'https://oll.co/route',   // explicit, OR
 *     canonical: 'auto',                   // auto self-reference from window.location
 *     robots: 'index, follow, max-image-preview:large',
 *     og: { title, description, image, type, url, siteName },
 *     twitter: { card, title, description, image },
 *     jsonLd: [ { '@context': 'https://schema.org', ... }, ... ],
 *   });
 *
 * NOTE: react-snap still captures whatever DOM mutations happen during pre-render,
 * so this hook is also picked up at build time for static SEO.
 */
import { useEffect } from 'react';

const ATTR = 'data-seo-hook';
const CANONICAL_HOST = 'https://oll.co';

/**
 * Normalise ANY URL (or path) into the one canonical form:
 *   • force https://
 *   • strip www.
 *   • rewrite oll.co/blog/… → oll.co/blogs/…  (we moved to /blogs plural)
 *   • strip any ?utm_*, ?ref=, ?fbclid, ?gclid tracking params
 *   • strip trailing slash (except root)
 * Accepts either a full URL or a path starting with /.
 */
export const normaliseCanonical = (input) => {
  if (!input) return CANONICAL_HOST + '/';
  try {
    const u = new URL(input, CANONICAL_HOST);
    // Force https + non-www canonical host
    u.protocol = 'https:';
    u.host = 'oll.co';
    // Legacy /blog/* → /blogs/*
    if (u.pathname.startsWith('/blog/')) {
      u.pathname = '/blogs/' + u.pathname.slice('/blog/'.length);
    } else if (u.pathname === '/blog') {
      u.pathname = '/blogs';
    }
    // Strip tracking params
    const strip = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                   'ref', 'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'igshid', 'yclid'];
    strip.forEach((k) => u.searchParams.delete(k));
    // Strip trailing slash (keep root)
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    const qs = u.searchParams.toString();
    return `${u.origin}${u.pathname}${qs ? '?' + qs : ''}`;
  } catch {
    return CANONICAL_HOST + (input.startsWith('/') ? input : '/' + input);
  }
};

const upsertMeta = (selectorAttrs, content) => {
  if (!content) return null;
  const selector = Object.entries(selectorAttrs)
    .map(([k, v]) => `[${k}="${v}"]`)
    .join('');
  // Re-use any existing matching tag (e.g. the index.html base description)
  let el = document.head.querySelector(`meta${selector}`);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(selectorAttrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  // Remember the original content so we can restore on unmount
  if (el.dataset.seoOriginal === undefined) {
    el.dataset.seoOriginal = el.getAttribute('content') ?? '__none__';
  }
  el.setAttribute('content', content);
  el.setAttribute(ATTR, '1');
  return el;
};

const restoreMeta = (el) => {
  if (!el) return;
  const orig = el.dataset.seoOriginal;
  if (orig === '__none__') {
    el.remove();
  } else if (orig !== undefined) {
    el.setAttribute('content', orig);
    delete el.dataset.seoOriginal;
    el.removeAttribute(ATTR);
  }
};

export const useSeo = ({
  title,
  description,
  keywords,
  canonical,
  robots,
  og,
  twitter,
  jsonLd,
}) => {
  useEffect(() => {
    const owned = [];
    const previousTitle = document.title;

    if (title) document.title = title;

    owned.push(upsertMeta({ name: 'description' }, description));
    owned.push(upsertMeta({ name: 'keywords' }, keywords));
    owned.push(upsertMeta({ name: 'robots' }, robots));

    if (og) {
      const fields = ['title', 'description', 'image', 'type', 'url'];
      fields.forEach((k) => owned.push(upsertMeta({ property: `og:${k}` }, og[k])));
      if (og.siteName) owned.push(upsertMeta({ property: 'og:site_name' }, og.siteName));
    }

    if (twitter) {
      ['card', 'title', 'description', 'image', 'site'].forEach((k) =>
        owned.push(upsertMeta({ name: `twitter:${k}` }, twitter[k])),
      );
    }

    // Canonical (link tag, not meta) — ALWAYS normalise to https://oll.co form
    let canonicalEl = null;
    let canonicalOriginal;
    let resolvedCanonical = null;
    if (canonical) {
      // 'auto' = derive from current location (self-referencing canonical).
      // Falls back to '/' during SSR / prerender where window is undefined.
      const raw =
        canonical === 'auto'
          ? (typeof window !== 'undefined'
              ? window.location.pathname + window.location.search
              : '/')
          : canonical;
      resolvedCanonical = normaliseCanonical(raw);

      canonicalEl = document.head.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalOriginal = canonicalEl.getAttribute('href');
      canonicalEl.setAttribute('href', resolvedCanonical);
      canonicalEl.setAttribute(ATTR, '1');
    }

    // JSON-LD (schema.org)
    const ldNodes = [];
    if (Array.isArray(jsonLd)) {
      jsonLd.forEach((obj) => {
        try {
          const s = document.createElement('script');
          s.type = 'application/ld+json';
          s.textContent = JSON.stringify(obj);
          s.setAttribute(ATTR, '1');
          document.head.appendChild(s);
          ldNodes.push(s);
        } catch {
          // ignore malformed JSON-LD
        }
      });
    }

    return () => {
      if (title) document.title = previousTitle;
      owned.forEach(restoreMeta);
      if (canonicalEl) {
        if (canonicalOriginal) {
          canonicalEl.setAttribute('href', canonicalOriginal);
          canonicalEl.removeAttribute(ATTR);
        } else {
          canonicalEl.remove();
        }
      }
      ldNodes.forEach((n) => n.remove());
    };
  }, [
    title,
    description,
    keywords,
    canonical,
    robots,
    JSON.stringify(og),
    JSON.stringify(twitter),
    JSON.stringify(jsonLd),
  ]);
};

export default useSeo;
