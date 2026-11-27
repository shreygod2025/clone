import { useEffect } from 'react';

/**
 * Directly injects SEO meta tags into the DOM via useEffect.
 * Works reliably in CSR mode where react-helmet-async may have issues.
 */
const setMeta = (selector, attrKey, attrVal, content) => {
  if (!content) return;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrKey, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setLink = (rel, href) => {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const addJsonLd = (id, data) => {
  let existing = document.getElementById(`jsonld-${id}`);
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = `jsonld-${id}`;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

export const usePageMeta = ({ title, description, canonical, ogTitle, ogDescription, keywords, jsonLd }) => {
  useEffect(() => {
    if (title) document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[name="keywords"]', 'name', 'keywords', keywords);
    setMeta('meta[property="og:title"]', 'property', 'og:title', ogTitle || title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', ogDescription || description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', ogTitle || title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', ogDescription || description);
    setLink('canonical', canonical);

    if (jsonLd) {
      if (Array.isArray(jsonLd)) {
        jsonLd.forEach((schema, i) => addJsonLd(`page-${i}`, schema));
      } else {
        addJsonLd('page-0', jsonLd);
      }
    }

    // Cleanup on unmount to restore defaults
    return () => {
      document.title = 'OLL - Learn Future Skills | Robotics, AI, Coding & Entrepreneurship';
    };
  }, [title, description, canonical, ogTitle, ogDescription, keywords, jsonLd]);
};
