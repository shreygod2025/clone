#!/usr/bin/env node
/**
 * seo-prerender — deterministic per-route static HTML generator
 * ──────────────────────────────────────────────────────────────
 * Replaces `react-snap` (which was unreliable: puppeteer races with
 * react-helmet-async under React 19 strict mode, and one slow API call
 * on /about would crash the whole prerender pass, leaving the entire
 * site without any per-route HTML — which is why WhatsApp & Google saw
 * the homepage OG tags for every URL on oll.co).
 *
 * What this does
 * ──────────────
 *   1. Reads CRA's `build/index.html` (the SPA shell).
 *   2. For each route in `seo-routes.cjs`, clones the shell and rewrites
 *      `<title>`, `<meta name="description">`, `<link rel="canonical">`,
 *      and a full OpenGraph + Twitter Card block to that route's data.
 *   3. Writes the result to `build/<route>/index.html`, so the host
 *      serves the right HTML on first byte. React then hydrates as
 *      usual on the client.
 *
 * Why this is robust
 * ──────────────────
 *   - No puppeteer, no JS execution, no race conditions.
 *   - One CRA `build/index.html` failing → still fine (each route
 *     written independently).
 *   - Tag rewriting is regex-based and idempotent.
 *   - Runs in ~2 seconds for 20 routes.
 *
 * Sanity-check after a build:
 *   grep -o '<meta property="og:image"[^>]*>' build/workshops/fathers-day-robotics/index.html
 */

const fs = require('fs');
const path = require('path');
const { SITE, ROUTES, DEFAULT_OG_IMAGE } = require('./seo-routes.cjs');

const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const SHELL_PATH = path.join(BUILD_DIR, 'index.html');

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Rewrite the SPA shell with route-specific SEO tags.
 *
 * @param {string} shell — raw HTML from build/index.html
 * @param {string} routePath — e.g. '/workshops/fathers-day-robotics'
 * @param {object} meta — entry from ROUTES
 */
function rewriteShell(shell, routePath, meta) {
  const canonicalUrl = routePath === '/' ? `${SITE}/` : `${SITE}${routePath}`;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const ogTitle = escapeHtml(meta.ogTitle || meta.title);
  const ogDescription = escapeHtml(meta.ogDescription || meta.description);
  const ogImage = escapeHtml(meta.ogImage || DEFAULT_OG_IMAGE);
  const ogType = escapeHtml(meta.ogType || 'website');

  let html = shell;

  // 1) Replace <title>...</title> (single line in CRA output).
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);

  // 2) Replace existing <meta name="description"> (CRA emits this verbatim
  //    from public/index.html). The content attribute is always wrapped in
  //    double-quotes by CRA's HtmlWebpackPlugin, so we match the value as
  //    "everything up to the next double-quote" (rather than `[^"']*`,
  //    which prematurely stopped at apostrophes like "India's").
  html = html.replace(
    /<meta\s+name=["']description["']\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${description}"/>`,
  );

  // 3) Replace canonical link if present, else we'll add via OG block.
  html = html.replace(
    /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}"/>`,
  );

  // 4) Strip any existing OG / Twitter tags from the shell so we don't
  //    end up with duplicates. Per OGP spec, the *first* occurrence
  //    wins — and the shell's homepage defaults would override per-route
  //    tags if they survived.
  html = html.replace(
    /<meta\s+(?:property|name)=["'](?:og:[a-z_:]+|twitter:[a-z_:]+)["'][^>]*\/?>/gi,
    '',
  );

  // 5) Inject route-specific OG + Twitter block just before </head>.
  const ogBlock = `
    <meta property="og:type" content="${ogType}"/>
    <meta property="og:site_name" content="OLL — Skills for All"/>
    <meta property="og:url" content="${canonicalUrl}"/>
    <meta property="og:title" content="${ogTitle}"/>
    <meta property="og:description" content="${ogDescription}"/>
    <meta property="og:image" content="${ogImage}"/>
    <meta property="og:image:secure_url" content="${ogImage}"/>
    <meta property="og:image:width" content="1200"/>
    <meta property="og:image:height" content="630"/>
    <meta property="og:image:alt" content="${ogTitle}"/>
    <meta property="og:locale" content="en_IN"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:site" content="@ollindia"/>
    <meta name="twitter:title" content="${ogTitle}"/>
    <meta name="twitter:description" content="${ogDescription}"/>
    <meta name="twitter:image" content="${ogImage}"/>
    <meta name="twitter:image:alt" content="${ogTitle}"/>
  `.trim();

  html = html.replace(/<\/head>/i, `${ogBlock}\n</head>`);

  return html;
}

function writeRouteHtml(routePath, html) {
  // '/' → build/index.html (already the shell, but overwrite with
  // homepage meta block so root URL also gets clean OG tags).
  // '/foo/bar' → build/foo/bar/index.html
  let outDir;
  let outPath;
  if (routePath === '/') {
    outDir = BUILD_DIR;
    outPath = path.join(BUILD_DIR, 'index.html');
  } else {
    outDir = path.join(BUILD_DIR, routePath.replace(/^\//, ''));
    outPath = path.join(outDir, 'index.html');
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
}

function generateSitemap(routes) {
  // Priority heuristic based on route depth + family. Top-level brand
  // pages get higher priority than 17 location pages, etc. Anything truly
  // critical (homepage, summer-camp, courses index, schools) gets >= 0.9.
  const priorityFor = (p) => {
    if (p === '/') return '1.0';
    if (p === '/summer-camp' || p === '/future-skills' || p === '/ai-foundations') return '0.95';
    if (p === '/school' || p === '/for-schools' || p === '/school-offerings' || p === '/offerings') return '0.9';
    if (p === '/courses' || p === '/student' || p === '/educator' || p === '/centers' || p === '/about') return '0.85';
    if (p === '/blogs' || p === '/resources' || p === '/workshops' || p === '/social-media-intern') return '0.8';
    if (p === '/faq' || p === '/growth-partner' || p === '/join-team') return '0.7';
    if (p === '/privacy' || p === '/terms') return '0.3';
    // Dynamic family routes — keep mid-priority so brand pages outrank them
    if (p.startsWith('/summer-camp/')) return '0.75';
    if (p.startsWith('/school-offerings/')) return '0.8';
    if (p.startsWith('/courses/')) return '0.8';
    if (p.startsWith('/workshops/')) return '0.85';
    return '0.6';
  };
  const changefreqFor = (p) => {
    if (p === '/' || p === '/summer-camp' || p === '/blogs') return 'weekly';
    if (p.startsWith('/workshops/')) return 'weekly';
    if (p === '/privacy' || p === '/terms') return 'yearly';
    return 'monthly';
  };
  const today = new Date().toISOString().slice(0, 10);
  const urls = Object.keys(routes)
    .sort()
    .map((p) => {
      const loc = p === '/' ? `${SITE}/` : `${SITE}${p}`;
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreqFor(p)}</changefreq>\n    <priority>${priorityFor(p)}</priority>\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <!-- Auto-generated by scripts/seo-prerender.cjs from seo-routes.cjs.\n       Edit seo-routes.cjs to change. Do not hand-edit this file. -->\n${urls}\n</urlset>\n`;
}

function main() {
  if (!fs.existsSync(SHELL_PATH)) {
    console.error(`[seo-prerender] build/index.html not found at ${SHELL_PATH}. Did CRA build run?`);
    process.exit(0); // Don't fail the build pipeline.
  }

  const shell = fs.readFileSync(SHELL_PATH, 'utf8');
  const routes = Object.keys(ROUTES);

  console.log(`[seo-prerender] Generating ${routes.length} static route HTML files…`);

  let ok = 0;
  let fail = 0;
  for (const routePath of routes) {
    try {
      const html = rewriteShell(shell, routePath, ROUTES[routePath]);
      writeRouteHtml(routePath, html);
      ok += 1;
    } catch (e) {
      fail += 1;
      console.error(`[seo-prerender] ✗ ${routePath} — ${e.message}`);
    }
  }

  console.log(`[seo-prerender] Done. ${ok} routes written, ${fail} failed.`);

  // Regenerate sitemap.xml so it stays in sync with ROUTES. Without this,
  // Google's sitemap-driven crawl misses dynamic family routes (e.g. all 17
  // /summer-camp/location/* pages) even though their prerendered HTML
  // exists on disk, which kills the indexing throughput.
  try {
    const sitemap = generateSitemap(ROUTES);
    const sitemapPath = path.join(BUILD_DIR, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    console.log(`[seo-prerender] sitemap.xml regenerated with ${Object.keys(ROUTES).length} URLs.`);
  } catch (e) {
    console.error(`[seo-prerender] sitemap regeneration failed — ${e.message}`);
  }
}

main();
