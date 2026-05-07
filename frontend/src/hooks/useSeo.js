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
 *     canonical: 'https://oll.co/route',
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

    // Canonical (link tag, not meta)
    let canonicalEl = null;
    let canonicalOriginal;
    if (canonical) {
      canonicalEl = document.head.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalOriginal = canonicalEl.getAttribute('href');
      canonicalEl.setAttribute('href', canonical);
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
