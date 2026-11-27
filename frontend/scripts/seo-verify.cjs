#!/usr/bin/env node
/**
 * seo-verify — post-build sanity check that hard-fails the deploy when
 * the SEO prerender step (seo-prerender.cjs) didn't run or produced
 * stale output.
 *
 * Why this exists
 * ───────────────
 * Symptom: WhatsApp/Facebook/Google all see the homepage <title> +
 * description + og:image when crawling internal URLs like
 *   https://oll.co/workshops/fathers-day-robotics
 * Root cause is always one of:
 *   1. The deploy host skipped the `postbuild` lifecycle (older deploy
 *      pipelines, Vercel "build command override", etc.).
 *   2. The prerender ran but the nested HTML was overwritten by a later
 *      step.
 *   3. The host doesn't serve nested `<route>/index.html` static files.
 *
 * This script catches (1) and (2) by reading a representative subset
 * of routes and verifying:
 *   - The nested `<route>/index.html` file exists.
 *   - Its `<title>` differs from the homepage's title (proof the
 *     rewrite actually happened).
 *   - It contains the route's `og:url` (proof we're not serving the
 *     shell as-is).
 *
 * Exits non-zero on the first failure so the CI/deploy fails loudly.
 * (3) is host-side and shows up as a runtime symptom — we surface it
 * with a clear "host config" error message hint.
 */
const fs = require('fs');
const path = require('path');
const { SITE, ROUTES } = require('./seo-routes.cjs');

const BUILD_DIR = path.resolve(__dirname, '..', 'build');

// Spot-check these routes. They cover: homepage, a Tier-1 marketing page,
// a hero product, and a dated time-boxed workshop (Father's Day) — the
// exact route the user reported as broken.
const SPOT_CHECK_ROUTES = [
  '/',
  '/about',
  '/summer-camp',
  '/workshops/fathers-day-robotics',
  '/future-skills',
];

function readRouteHtml(routePath) {
  const filePath = routePath === '/'
    ? path.join(BUILD_DIR, 'index.html')
    : path.join(BUILD_DIR, routePath.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(filePath)) return { filePath, html: null };
  return { filePath, html: fs.readFileSync(filePath, 'utf8') };
}

function extractTag(html, regex) {
  const m = html && html.match(regex);
  return m ? m[1] : null;
}

// HTML-decode the captured attribute so we can compare against the raw
// string in seo-routes.cjs (e.g. file has "AI &amp; Coding" but the
// declared title is "AI & Coding"). Only decodes the entities CRA's
// HtmlWebpackPlugin emits.
function htmlDecode(s) {
  if (s == null) return s;
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function main() {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`[seo-verify] ✗ build/ not found at ${BUILD_DIR}. Did craco build run?`);
    process.exit(1);
  }

  // 1. Homepage must exist + have its declared title.
  const home = readRouteHtml('/');
  if (!home.html) {
    console.error('[seo-verify] ✗ build/index.html is missing.');
    process.exit(1);
  }
  const homeTitle = htmlDecode(extractTag(home.html, /<title>([^<]*)<\/title>/i));
  const expectedHomeTitle = ROUTES['/'] && ROUTES['/'].title;

  let failures = 0;
  let passed = 0;
  const checks = [];

  for (const routePath of SPOT_CHECK_ROUTES) {
    const meta = ROUTES[routePath];
    if (!meta) {
      // Route not declared in seo-routes.cjs — skip silently (legitimate
      // dynamic route falling back to homepage shell).
      continue;
    }
    const { filePath, html } = readRouteHtml(routePath);
    if (!html) {
      failures += 1;
      checks.push(`✗ ${routePath} — missing file at ${path.relative(BUILD_DIR, filePath)}`);
      continue;
    }
    const title = htmlDecode(extractTag(html, /<title>([^<]*)<\/title>/i));
    const ogUrl = htmlDecode(extractTag(html, /<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']\s*\/?>/i));
    const expectedTitle = meta.title;
    const expectedOgUrl = routePath === '/' ? `${SITE}/` : `${SITE}${routePath}`;

    const titleMatch = title === expectedTitle;
    const ogMatch = ogUrl === expectedOgUrl;

    if (titleMatch && ogMatch) {
      passed += 1;
      checks.push(`✓ ${routePath}`);
    } else {
      failures += 1;
      checks.push(
        `✗ ${routePath} — ` +
        (titleMatch ? '' : `title="${title}" (expected "${expectedTitle}") `) +
        (ogMatch ? '' : `og:url="${ogUrl}" (expected "${expectedOgUrl}")`)
      );
      // If the file's title still matches the HOMEPAGE title, the
      // rewrite didn't run on this route — the most common failure mode.
      if (title === expectedHomeTitle && expectedTitle !== expectedHomeTitle) {
        checks.push(
          `   ↳ Looks like the rewrite was skipped — file still has the homepage shell title.`,
        );
      }
    }
  }

  console.log(`[seo-verify] ${passed} passed, ${failures} failed.`);
  checks.forEach((c) => console.log(`[seo-verify] ${c}`));

  if (failures > 0) {
    console.error(
      `\n[seo-verify] ✗ Build FAILED — per-route SEO meta is not being injected.\n` +
      `             Make sure 'node scripts/seo-prerender.cjs' runs after craco build.\n` +
      `             If files are present but the host serves the homepage shell instead,\n` +
      `             that's a host-config issue — the platform must serve nested\n` +
      `             '<route>/index.html' files for SPA routes, not fall back to /index.html.\n`,
    );
    process.exit(1);
  }

  console.log('[seo-verify] ✓ All spot-check routes have unique, route-specific SEO meta.');
}

main();
