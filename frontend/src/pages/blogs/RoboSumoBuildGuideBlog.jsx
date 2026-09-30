/**
 * How to Build a RoboSumo Robot for Robotics Competitions
 * ─────────────────────────────────────────────────────────
 * Long-form, SEO-first pillar blog aimed at ranking #1 for queries like:
 *   • how to build a robosumo robot
 *   • robosumo robot design guide
 *   • IIT Bombay TechFest robotics competition
 *   • BTS7960 ESP32 sumo bot
 *
 * Key SEO features baked in:
 *   • Single, prominent H1 with primary keyword
 *   • Canonical URL, hreflang, og:* + twitter:* full stack
 *   • Article + HowTo + BreadcrumbList + FAQPage JSON-LD schema
 *   • Semantic HTML (article, header, nav toc, figure/figcaption)
 *   • Descriptive image alt text + width/height + lazy loading
 *   • Rich internal linking to /techfest and the RoboSumo shop kit PDP
 *   • YouTube video as privacy-first iframe (youtube-nocookie)
 *   • Code samples in accessible, copy-friendly <pre><code> blocks
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Rocket,
  ShieldAlert,
  Youtube,
} from 'lucide-react';
import Footer from '../../components/Footer';
import { ogImage } from '../../utils/ogImage';
import { useSeo } from '../../hooks/useSeo';

/* Same logos the Techfest page uses — keeps the pill-nav visually consistent. */
const OLL_LOGO_HORIZONTAL =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const TECHFEST_LOGO = '/techfest/techfest-iitb-logo.webp';

/* ─────────────────────────────────────────────────────────
   Constants — all SEO-critical strings live at the top so
   they are easy to audit / update in one place.
   ───────────────────────────────────────────────────────── */
const CANONICAL_URL =
  'https://oll.co/blogs/how-to-build-robosumo-robot-iit-bombay-techfest';
const PAGE_TITLE =
  'How to Build a RoboSumo Robot: Complete Step-by-Step Guide (2026)';
const META_DESCRIPTION =
  'Learn how to build a competition-ready RoboSumo robot with ESP32, BTS7960 motor drivers, 300 RPM Johnson motors and a 3S LiPo battery. Full wiring diagram, ESP32 code, weight, wedge angle & rules for the OLL × TechFest IIT Bombay 2026-27 championship.';
const KEYWORDS =
  'robosumo robot, how to build robosumo, sumo bot, IIT Bombay TechFest 2026, OLL TechFest, ESP32 sumo robot, BTS7960 motor driver, 300 RPM Johnson motor, LiPo battery robotics, robotics competition India, school robotics championship, robosumo kit, robotics for kids, STEM competition India, RoboRacer, robotics innovation challenge';
const AUTHOR_NAME = 'Pratyoosh · RoboSumo Winner, NL Dalmia High School';
const PUBLISHED_ISO = '2026-09-29T09:00:00+05:30';
const MODIFIED_ISO = new Date().toISOString();

const HERO_IMAGE = '/blog-assets/robosumo/hero-robosumo-circuit-diagram.png';
const SHOP_KIT_URL =
  'https://oll.co/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a';
const TECHFEST_URL = '/techfest';
const RESOURCES_URL =
  'https://drive.google.com/drive/folders/1M_8ZRMyDigl5VaabcrEx95enAyfIjCNw?usp=drive_link';
const CODE_DOWNLOAD_URL =
  'https://drive.google.com/file/d/1ZIiiUKZYWj2SdlV-DkYzf6onR9YnWzV3/view?usp=drive_link';

// The PDF's shortened URL had homoglyphs — this is the correct video ID.
// If a different tutorial is uploaded, only this string needs to change.
const YOUTUBE_ID = 'qCyF9I3IXCM';
const YOUTUBE_URL = `https://www.youtube.com/watch?v=${YOUTUBE_ID}`;

/* Table of Contents entries — used for both the sticky sidebar TOC and the
   in-body "in this guide" list, keeping the two in sync automatically. */
const SECTIONS = [
  { id: 'what-is-techfest', label: 'What is OLL × TechFest?' },
  { id: 'what-is-robosumo', label: 'What is a RoboSumo Robot?' },
  { id: 'components', label: 'Components You’ll Need' },
  { id: 'kit', label: 'Get the Official Kit' },
  { id: 'chassis', label: 'Step 1 · Build the Chassis' },
  { id: 'wedge', label: 'Step 2 · Design the Wedge' },
  { id: 'battery', label: 'Step 3 · Choose the Battery' },
  { id: 'motors', label: 'Step 4 · Install the Motors' },
  { id: 'motor-driver', label: 'Step 5 · Wire the BTS7960' },
  { id: 'bracket', label: 'Step 6 · Motor-Driver Bracket' },
  { id: 'wiring', label: 'Step 7-10 · Power & Wiring' },
  { id: 'esp32', label: 'Step 11-12 · Connect the ESP32' },
  { id: 'code', label: 'Step 13 · ESP32 Code Walkthrough' },
  { id: 'testing', label: 'Step 14 · Final Testing' },
  { id: 'weight', label: 'Step 15 · Weigh Your Bot' },
  { id: 'faq', label: 'FAQ' },
];

/* JSON-LD schema — Google reads this and can build rich results (recipe-
   style cards for the HowTo, breadcrumbs, sitelinks, and FAQ accordions). */
const buildJsonLd = () => [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: PAGE_TITLE,
    description: META_DESCRIPTION,
    image: [
      `https://oll.co${HERO_IMAGE}`,
      'https://oll.co/blog-assets/robosumo/robosumo-chassis-with-battery.jpg',
      'https://oll.co/blog-assets/robosumo/bts7960-motor-driver-pinout.jpg',
    ],
    datePublished: PUBLISHED_ISO,
    dateModified: MODIFIED_ISO,
    author: {
      '@type': 'Person',
      name: 'Pratyoosh',
      description:
        'RoboSumo winner from NL Dalmia High School and OLL × TechFest championship participant.',
    },
    publisher: {
      '@type': 'Organization',
      name: 'OLL',
      logo: {
        '@type': 'ImageObject',
        url: 'https://oll.co/favicon.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': CANONICAL_URL,
    },
    keywords: KEYWORDS,
    articleSection: 'Robotics',
    inLanguage: 'en-IN',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Build a Competition-Ready RoboSumo Robot',
    description:
      'A complete 15-step guide to designing, wiring, coding and testing an ESP32-powered RoboSumo robot for the OLL × TechFest IIT Bombay championship.',
    image: `https://oll.co${HERO_IMAGE}`,
    totalTime: 'PT8H',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'INR',
      value: '9999',
    },
    supply: [
      { '@type': 'HowToSupply', name: 'Robot chassis (wood or acrylic)' },
      { '@type': 'HowToSupply', name: 'Stainless-steel wedge' },
      { '@type': 'HowToSupply', name: '3S LiPo battery + charger' },
      { '@type': 'HowToSupply', name: 'BTS7960 motor drivers × 2' },
      { '@type': 'HowToSupply', name: '300 RPM Johnson motors × 2' },
      { '@type': 'HowToSupply', name: 'ESP32-S3 / ESP32-C3' },
      { '@type': 'HowToSupply', name: 'LM2596 DC-DC step-down module' },
      { '@type': 'HowToSupply', name: 'Rubber wheels, XT60 connectors, wires' },
    ],
    tool: [
      { '@type': 'HowToTool', name: 'Soldering iron' },
      { '@type': 'HowToTool', name: 'Multimeter' },
      { '@type': 'HowToTool', name: 'Screwdriver set' },
    ],
    step: SECTIONS.filter((s) => s.id.startsWith('chassis') || s.id.startsWith('wedge') || s.id.startsWith('battery') || s.id.startsWith('motors') || s.id.startsWith('motor-driver') || s.id.startsWith('bracket') || s.id.startsWith('wiring') || s.id.startsWith('esp32') || s.id.startsWith('code') || s.id.startsWith('testing') || s.id.startsWith('weight')).map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.label.replace(/^Step [\d\-]+ · /, ''),
      url: `${CANONICAL_URL}#${s.id}`,
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://oll.co/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://oll.co/blogs' },
      { '@type': 'ListItem', position: 3, name: 'How to Build a RoboSumo Robot', item: CANONICAL_URL },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the weight limit for a RoboSumo robot at OLL × TechFest?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'For this reference build the target is under 3 kg. Always confirm against the latest official OLL × TechFest RoboSumo rulebook before your final build — weight, dimensions and construction rules can change per season.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which ESP32 board is best for a sumo bot?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'An ESP32-S3 or ESP32-C3 is ideal because both include hardware Wi-Fi, support 20 kHz PWM out-of-the-box and have enough GPIOs to drive two BTS7960 modules plus an FS-CT6B RC receiver. GPIO pins are 3.3 V — never feed them 5 V directly.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need a 3D printer to build a RoboSumo?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. The 3D-printed motor-driver bracket is optional — you can mount the BTS7960 modules with strong double-sided tape or a small aluminium/acrylic plate. The chassis in this guide is made from wood.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I control the RoboSumo from my phone?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The ESP32 hosts its own Wi-Fi access point (SSID: SumoBot, password: sumo12345). Connect your phone or laptop, open 192.168.4.1 in any browser and use the on-screen joystick — no app installation required.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where can I buy the official RoboSumo kit?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The official OLL × TechFest RoboSumo Competition Kit is available at ${SHOP_KIT_URL} and ships across India with essential components pre-selected for the competition ruleset.`,
        },
      },
    ],
  },
];

/* ─────────────────────────────────────────────────────────
   Reusable UI atoms
   ───────────────────────────────────────────────────────── */
const Section = ({ id, eyebrow, title, children }) => (
  <section
    id={id}
    className="scroll-mt-28 mb-16"
    data-testid={`section-${id}`}
  >
    {eyebrow && (
      <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D63031] mb-3">
        {eyebrow}
      </p>
    )}
    <h2
      className="text-[26px] md:text-[32px] font-bold text-[#0F172A] mb-6 leading-tight tracking-tight"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {title}
    </h2>
    <div className="rs-prose">
      {children}
    </div>
  </section>
);

const Figure = ({ src, alt, caption, w = 1200, h = 800 }) => (
  <figure className="my-8 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
    <img
      src={src}
      alt={alt}
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      className="w-full h-auto object-contain bg-slate-50"
    />
    {caption && (
      <figcaption className="px-5 py-3 text-sm text-slate-500 border-t border-slate-100 bg-white">
        {caption}
      </figcaption>
    )}
  </figure>
);

const CodeBlock = ({ language = 'cpp', code, label }) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {
      /* ignore */
    }
  };
  return (
    <div className="my-6 rounded-xl overflow-hidden border border-slate-800 bg-[#0B1120] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-[#111827] text-slate-300 text-xs">
        <span className="uppercase tracking-wider font-semibold">
          {label || language}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          data-testid="copy-code-btn"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto text-[13.5px] leading-6 p-4 text-slate-100">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

const Callout = ({ tone = 'info', icon: Icon = ShieldAlert, title, children }) => {
  const palette = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    danger: 'bg-red-50 border-red-200 text-red-900',
  }[tone];
  return (
    <aside
      className={`not-prose my-6 rounded-2xl border p-5 flex gap-4 ${palette}`}
      role="note"
    >
      <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-[15px] leading-relaxed">{children}</div>
      </div>
    </aside>
  );
};

/* ─────────────────────────────────────────────────────────
   Main page component
   ───────────────────────────────────────────────────────── */
const RoboSumoBuildGuideBlog = () => {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  // Highlight the current section in the sidebar TOC as the user scrolls.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const jsonLd = useMemo(buildJsonLd, []);
  const ogImageUrl = ogImage(`https://oll.co${HERO_IMAGE}`);

  // Primary SEO — uses the codebase's imperative hook (works under React 19,
  // unlike react-helmet-async@2 which silently fails to inject <meta>).
  useSeo({
    title: PAGE_TITLE,
    description: META_DESCRIPTION,
    keywords: KEYWORDS,
    canonical: CANONICAL_URL,
    robots:
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    og: {
      type: 'article',
      url: CANONICAL_URL,
      title: PAGE_TITLE,
      description: META_DESCRIPTION,
      image: ogImageUrl,
      siteName: 'OLL',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@olledu',
      title: PAGE_TITLE,
      description: META_DESCRIPTION,
      image: ogImageUrl,
    },
    jsonLd,
  });

  // Extra tags not covered by the shared useSeo helper.
  useEffect(() => {
    const owned = [];
    const upsert = (tag, attrs) => {
      const selector = Object.entries(attrs)
        .filter(([, v]) => v)
        .map(([k, v]) => `[${k}="${v}"]`)
        .join('');
      let el = document.head.querySelector(`${tag}${selector}`);
      if (!el) {
        el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => v && el.setAttribute(k, v));
        document.head.appendChild(el);
        owned.push(el);
      }
      return el;
    };

    upsert('meta', { property: 'og:image:width', content: '1200' });
    upsert('meta', { property: 'og:image:height', content: '630' });
    upsert('meta', {
      property: 'og:image:alt',
      content:
        'Complete ESP32-S3 wiring diagram for a RoboSumo robot with dual BTS7960 motor drivers, LM2596 buck converter and 3S LiPo battery.',
    });
    upsert('meta', { property: 'og:locale', content: 'en_IN' });
    upsert('meta', {
      property: 'article:published_time',
      content: PUBLISHED_ISO,
    });
    upsert('meta', {
      property: 'article:modified_time',
      content: MODIFIED_ISO,
    });
    upsert('meta', { property: 'article:author', content: 'Pratyoosh' });
    upsert('meta', { property: 'article:section', content: 'Robotics' });
    ['RoboSumo', 'ESP32', 'IIT Bombay TechFest', 'Robotics Competition'].forEach(
      (tag) => {
        const el = document.createElement('meta');
        el.setAttribute('property', 'article:tag');
        el.setAttribute('content', tag);
        document.head.appendChild(el);
        owned.push(el);
      },
    );

    // hreflang alternates
    ['en-IN', 'x-default'].forEach((lang) => {
      const el = document.createElement('link');
      el.setAttribute('rel', 'alternate');
      el.setAttribute('hreflang', lang);
      el.setAttribute('href', CANONICAL_URL);
      document.head.appendChild(el);
      owned.push(el);
    });

    // Preconnects for YouTube (LCP)
    ['https://www.youtube-nocookie.com', 'https://i.ytimg.com'].forEach((h) => {
      const el = document.createElement('link');
      el.setAttribute('rel', 'preconnect');
      el.setAttribute('href', h);
      document.head.appendChild(el);
      owned.push(el);
    });

    return () => owned.forEach((el) => el.remove());
  }, []);

  return (
    <>
      <style>{`
        /* Page-scoped override: the global stylesheet sets
           "html, body { overflow-x: hidden; }" which, since
           overflow-x != visible, silently creates a body-level
           scroll container that breaks position: sticky for the
           right-rail TOC. overflow: clip blocks overflow the
           same way but WITHOUT creating a scroll container, so
           sticky descendants behave correctly again. */
        html:has(.rs-page), body:has(.rs-page) {
          overflow-x: clip !important;
          overflow-y: visible !important;
          max-width: none !important;
        }
        .rs-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 8%, rgba(220,38,38,0.28), transparent 40%),
            radial-gradient(circle at 85% 30%, rgba(96,165,250,0.18), transparent 50%),
            linear-gradient(180deg, #0A1F44 0%, #1E3A5F 45%, #0A1F44 100%);
          background-attachment: fixed;
        }
        @media (max-width: 820px), (hover: none) and (pointer: coarse) {
          .rs-page { background-attachment: scroll; }
        }
        /* ── Sticky pill nav (identical to Techfest page) ─────── */
        .tf-pillnav { position: sticky; top: 12px; z-index: 60; margin: 0 auto; padding: 12px 12px 0; }
        .tf-pillnav-inner {
          max-width: 1220px; margin: 0 auto;
          background: rgba(255,255,255,0.94);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          backdrop-filter: saturate(180%) blur(14px);
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 20px 44px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.12);
          border-radius: 999px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px 8px 18px;
        }
        .tf-pillnav-brands { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .tf-pillnav-brands .divider { width: 1px; height: 36px; background: rgba(10,31,68,0.15); }
        .tf-pillnav-brands img { display: block; height: 42px; width: auto; }
        .tf-pillnav-brands img.tf-mark { height: 46px; }
        .tf-pillnav-ctas { display: flex; align-items: center; gap: 8px; }
        .tf-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px; border-radius: 999px;
          font-family: 'Proxima Nova', 'Montserrat', sans-serif;
          font-weight: 700; font-size: 0.8rem; letter-spacing: 0.04em; text-transform: uppercase;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          cursor: pointer; text-decoration: none;
        }
        .tf-btn.primary { background: #DC2626; color: #fff; box-shadow: 0 12px 22px rgba(220,38,38,0.35); }
        .tf-btn.primary:hover { background: #B91C1C; transform: translateY(-1px); }
        .tf-btn.ghost-dark { background: transparent; color: #0A1F44; border: 1.5px solid rgba(10,31,68,0.30); }
        .tf-btn.ghost-dark:hover { background: #0A1F44; color: #fff; border-color: #0A1F44; }
        @media (max-width: 640px) {
          .tf-pillnav { top: 8px; padding: 8px 8px 0; }
          .tf-pillnav-inner { padding: 6px 6px 6px 10px; }
          .tf-pillnav-brands { gap: 8px; }
          .tf-pillnav-brands img { height: 28px; }
          .tf-pillnav-brands img.tf-mark { height: 32px; }
          .tf-pillnav-brands .divider { height: 26px; }
          .tf-pillnav-ctas { gap: 6px; }
          .tf-btn { padding: 8px 10px; font-size: 0.65rem; letter-spacing: 0.03em; gap: 4px; }
          .tf-btn .tf-hide-sm { display: none; }
        }

        /* ── Blog typography ───────────────────────────────────
           Slightly bigger body copy for comfortable long-form reading,
           and generous side padding on the content column so nothing
           bleeds into the sticky right-rail. */
        .rs-prose { font-size: 18px; line-height: 1.85; color: #334155; }
        .rs-prose p { margin: 0 0 1.15rem; }
        .rs-prose ul, .rs-prose ol { margin: 0.4rem 0 1.25rem; padding-left: 1.4rem; }
        .rs-prose li { margin-bottom: 0.35rem; }
        .rs-prose strong { color: #0F172A; font-weight: 700; }
        .rs-prose code { font-size: 0.94em; padding: 2px 6px; border-radius: 4px;
          background: #F1F5F9; color: #0F172A; }
      `}</style>

      <div className="rs-page">
        {/* ── Sticky pill nav ─────────────────────────────────── */}
        <nav
          className="tf-pillnav"
          aria-label="RoboSumo blog primary navigation"
          data-testid="robosumo-pillnav"
        >
          <div className="tf-pillnav-inner">
            <div className="tf-pillnav-brands">
              <Link to="/" data-testid="rs-nav-oll-logo" aria-label="OLL Home">
                <img src={OLL_LOGO_HORIZONTAL} alt="OLL" />
              </Link>
              <span className="divider" aria-hidden="true" />
              <Link to={TECHFEST_URL} aria-label="Techfest IIT Bombay">
                <img className="tf-mark" src={TECHFEST_LOGO} alt="Techfest IIT Bombay" />
              </Link>
            </div>
            <div className="tf-pillnav-ctas">
              <a
                href={SHOP_KIT_URL}
                target="_blank"
                rel="noopener"
                className="tf-btn ghost-dark"
                data-testid="rs-nav-buy-kit"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span className="tf-hide-sm">Buy </span>Kit
              </a>
              <Link
                to={TECHFEST_URL}
                className="tf-btn primary"
                data-testid="rs-nav-register"
              >
                Register<span className="tf-hide-sm"> Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────────────── */}
        <header className="relative overflow-hidden text-white">
          <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_10%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_40%)]" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14">
            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumb"
              className="text-sm text-white/70 flex items-center gap-2 mb-6"
            >
              <Link to="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link to="/blogs" className="hover:text-white transition-colors">
                Blog
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white/90">RoboSumo Build Guide</span>
            </nav>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-wider mb-5">
              <Award className="w-3.5 h-3.5 text-[#FDBA74]" />
              OLL × TechFest IIT Bombay 2026-27
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] mb-5"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              data-testid="blog-h1"
            >
              How to Build a RoboSumo Robot for Robotics Competitions{' '}
              <span className="text-[#FDBA74]">
                — Complete Step-by-Step Guide
              </span>
            </h1>

            <p className="text-lg text-white/85 max-w-3xl leading-relaxed mb-8">
              A practical, tested walkthrough — from chassis and wedge design to
              ESP32 code, Wi-Fi joystick control and rules-compliant testing —
              written by a national RoboSumo winner for students competing at
              the <strong>OLL × TechFest Robotics Championship at IIT Bombay</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/75">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={PUBLISHED_ISO}>29 September 2026</time>
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> 18 min read
              </span>
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> {AUTHOR_NAME}
              </span>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href={SHOP_KIT_URL}
                target="_blank"
                rel="noopener"
                data-testid="hero-cta-kit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D63031] hover:bg-[#B02222] text-white font-semibold shadow-lg transition-colors"
              >
                <Rocket className="w-4 h-4" />
                Get the Official RoboSumo Kit
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to={TECHFEST_URL}
                data-testid="hero-cta-techfest"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold transition-colors"
              >
                Register for OLL × TechFest
              </Link>
            </div>
          </div>
        </header>

        {/* ── Body layout: article + sticky TOC ─────────────────
             White sheet on the gradient makes the article read as a
             "document" the way Substack / Medium do, and gives the sticky
             right-rail a clean surface to live against. */}
        <main className="relative bg-white">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-14 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-x-12 gap-y-8">
          <article className="min-w-0">
            {/* Watch first — hero YouTube directly under the H1 */}
            <div className="not-prose my-2 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-black">
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?rel=0&modestbranding=1`}
                  title="RoboSumo Robot Build Tutorial — full step-by-step video (OLL × TechFest IIT Bombay)"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid="hero-youtube-embed"
                />
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-8 mt-2 text-center">
              Fig. 1 — Full build walkthrough. Prefer reading? Every step is
              below with wiring diagrams and code.
            </p>

            <p className="text-lg leading-[1.8] text-slate-700 mb-6">
              Planning to compete at the <strong>OLL × TechFest Robotics
              Championship</strong> and unsure where to start? This guide packs
              the entire build — mechanical design, electronics, ESP32
              firmware and testing — into a single reference you can follow
              even if this is your first robotics project. It’s written by{' '}
              <em>Pratyoosh, a RoboSumo winner from NL Dalmia High School</em>{' '}
              and refined against the current championship ruleset.
            </p>

            <Callout tone="warn" icon={ShieldAlert} title="Important">
              This build is a reference project. Always cross-check the
              latest official <Link className="underline" to={TECHFEST_URL}>OLL × TechFest RoboSumo rulebook</Link>{' '}
              for permitted dimensions, weight and construction before your
              final competition build.
            </Callout>

            {/* In-page contents (helps SEO & UX for long-form) */}
            <div className="not-prose bg-slate-50 rounded-2xl p-6 my-10 border border-slate-100">
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-3">
                In this guide
              </p>
              <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 list-decimal list-inside text-[15px] text-slate-700">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      className="hover:text-[#D63031] transition-colors"
                      href={`#${s.id}`}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ol>
            </div>

            {/* ── What is OLL × TechFest ───────────────────────── */}
            <Section
              id="what-is-techfest"
              eyebrow="Championship"
              title="What is OLL × TechFest IIT Bombay?"
            >
              <p>
                <strong>OLL × TechFest 2026-27</strong> is a national robotics
                championship for school students in Grades 4–12. It gives
                young makers a stage to build, compete and innovate — and its
                Grand Finale is held at{' '}
                <strong>IIT Bombay from 16–18 December 2026</strong>.
              </p>
              <p>The championship runs three parallel tracks:</p>
              <ul>
                <li>
                  <strong>RoboSumo</strong> — 1 v 1 robot battle (this guide).
                </li>
                <li>
                  <strong>RoboRacer</strong> — high-speed autonomous / manual
                  robot racing.
                </li>
                <li>
                  <strong>Robotics Innovation Challenge</strong> — build an
                  original robotic or automated solution to a real-world
                  problem.
                </li>
              </ul>
              <p>
                Participation is <strong>FREE</strong>, with a{' '}
                <strong>₹1.5 lakh prize pool</strong> and qualification rounds
                you can join from anywhere in India:
              </p>
              <p className="not-prose text-slate-800 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-[15px]">
                National Online Qualifier → Regional Qualifier → Grand Finale @ IIT Bombay
              </p>
              <p>
                <Link
                  to={TECHFEST_URL}
                  className="inline-flex items-center gap-1 font-semibold text-[#D63031] hover:underline"
                >
                  See full championship details, dates and tracks{' '}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </p>
            </Section>

            {/* ── What is a RoboSumo ────────────────────────────── */}
            <Section
              id="what-is-robosumo"
              eyebrow="Concept"
              title="What is a RoboSumo Robot?"
            >
              <p>
                RoboSumo is a robot-versus-robot pushing contest — your bot
                must shove its opponent out of a circular arena. Sounds
                simple, but a winning RoboSumo demands the right balance of{' '}
                <strong>torque, traction, weight, ground clearance,
                wedge geometry and control</strong>. Raw motor power alone
                loses matches. Winning bots blend mechanical design,
                electronics and firmware.
              </p>
              <ul>
                <li>Motor torque &amp; RPM</li>
                <li>Wheel traction &amp; ground clearance</li>
                <li>Chassis weight distribution</li>
                <li>Wedge angle (getting <em>under</em> the opponent)</li>
                <li>Power delivery &amp; PWM control</li>
                <li>Overall stability under impact</li>
              </ul>
            </Section>

            {/* ── Components ────────────────────────────────────── */}
            <Section
              id="components"
              eyebrow="Bill of materials"
              title="Components You’ll Need"
            >
              <p>
                Every part in this build is available off-the-shelf in India,
                or bundled together in the official RoboSumo kit (see below).
              </p>

              <div className="not-prose overflow-x-auto my-6 rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="text-left py-3 px-4">Component</th>
                      <th className="text-left py-3 px-4">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {[
                      ['Robot chassis (wood / acrylic)', 'Main body of the robot'],
                      ['Stainless-steel wedge', 'Slides under the opponent'],
                      ['3S LiPo battery (11.1 V)', 'Main power source'],
                      ['LiPo battery charger', 'Safe charging'],
                      ['BTS7960 motor drivers ×2', '43 A H-bridge motor control'],
                      ['300 RPM Johnson motors ×2', 'High-torque drive'],
                      ['ESP32-S3 / ESP32-C3', 'Main control unit'],
                      ['Rubber wheels', 'Traction on the arena floor'],
                      ['XT60 connectors', 'Battery power delivery'],
                      ['LM2596 DC-DC step-down', '12 V → 5 V regulation for ESP32'],
                      ['100 µF / 0.1 µF capacitors', 'Voltage smoothing'],
                      ['U-clamps + shaft enclosures', 'Motor mounting'],
                      ['Soldering iron, multimeter, screwdrivers', 'Assembly tools'],
                      ['Heat-shrink tubing, jumper wires', 'Insulation & wiring'],
                    ].map(([c, p]) => (
                      <tr key={c}>
                        <td className="py-2.5 px-4 font-medium">{c}</td>
                        <td className="py-2.5 px-4">{p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ── Kit CTA ──────────────────────────────────────── */}
            <Section id="kit" eyebrow="Save time" title="Get the Official RoboSumo Competition Kit">
              <p>
                Sourcing 15+ compatible components can eat weeks. The{' '}
                <strong>OLL × TechFest RoboSumo Kit</strong> ships every
                essential — motor drivers, ESP32, LiPo, wheels, XT60s, LM2596
                — pre-selected for the current ruleset so you can spend your
                time <em>building</em>, not shopping.
              </p>
              <div className="not-prose my-8 rounded-3xl bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2] border border-red-100 p-8 grid md:grid-cols-[1.2fr_1fr] gap-6 items-center">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-[#D63031] mb-2">
                    Official Competition Kit
                  </p>
                  <h3 className="text-2xl font-bold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    RoboSumo Kit — Specially for TechFest IIT Bombay
                  </h3>
                  <p className="text-slate-600 text-[15px] mb-4">
                    Everything you need to start your build. Ships across
                    India. Refined by past championship winners.
                  </p>
                  <a
                    href={SHOP_KIT_URL}
                    target="_blank"
                    rel="noopener"
                    data-testid="body-cta-kit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D63031] hover:bg-[#B02222] text-white font-semibold text-sm transition-colors"
                  >
                    Purchase the Kit <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
                <ul className="text-sm text-slate-700 space-y-2">
                  {[
                    'ESP32-S3 development board',
                    '2 × BTS7960 43 A motor drivers',
                    '2 × 300 RPM Johnson motors',
                    '3S 2200 mAh LiPo + charger',
                    'LM2596 DC-DC buck module',
                    'Rubber wheels + XT60 + wiring',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p>
                Prefer to source parts individually? All build resources —
                STL files, motor-driver bracket CAD and the full ESP32 code —
                are in the{' '}
                <a
                  href={RESOURCES_URL}
                  target="_blank"
                  rel="noopener"
                  className="text-[#D63031] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  RoboSumo Resources folder <ExternalLink className="w-3.5 h-3.5" />
                </a>
                .
              </p>
            </Section>

            {/* ── Step 1: Chassis ──────────────────────────────── */}
            <Section id="chassis" eyebrow="Step 1" title="Build the Robot Chassis">
              <p>
                The chassis is the mechanical backbone. In this reference
                build it’s made from plywood (light, cheap, easy to cut) with
                the stainless-steel wedge bolted to the front. Two circular
                cutouts host the wheels; the sloped front lets the bot slide
                under the opponent.
              </p>
              <p>Approximate dimensions used here:</p>
              <ul>
                <li><strong>Length:</strong> 24 cm</li>
                <li><strong>Width:</strong> 19.6 cm</li>
                <li><strong>Height:</strong> 9.6 cm</li>
                <li><strong>Wheel opening radius:</strong> ~5 cm</li>
                <li><strong>Front slope:</strong> ~45°</li>
              </ul>
              <div className="not-prose grid md:grid-cols-2 gap-4 my-6">
                <Figure
                  src="/blog-assets/robosumo/robosumo-chassis-with-battery.jpg"
                  alt="Side view of a wooden RoboSumo chassis showing the 45° front slope, 13.7 cm sloped edge, 24 cm length and internal 3S LiPo battery + motor mount pocket."
                  caption="Side profile with the 45° sloped front and battery/motor pocket."
                  w={1200}
                  h={720}
                />
                <Figure
                  src="/blog-assets/robosumo/robosumo-chassis-internal-wiring.jpg"
                  alt="Two-panel image: on the left, the chassis top plate showing the 7.8 cm wheel cutouts and 4 cm motor mount; on the right, the completed internal wiring with BTS7960 modules, ESP32 and 3S LiPo battery."
                  caption="Wheel cutouts (left) and the finished internal wiring (right)."
                  w={1200}
                  h={720}
                />
              </div>
            </Section>

            {/* ── Step 2: Wedge ────────────────────────────────── */}
            <Section id="wedge" eyebrow="Step 2" title="Design the RoboSumo Wedge">
              <p>
                The wedge is arguably the single most important mechanical
                part. Angled at roughly <strong>25° (measured 15.7°
                effective in this build)</strong> and cut from{' '}
                <strong>stainless steel</strong>, it lets the robot get
                beneath the opponent — killing their traction and letting
                yours do the pushing.
              </p>
              <Figure
                src="/blog-assets/robosumo/robosumo-wedge-dimensions.jpg"
                alt="Stainless-steel RoboSumo wedge held by hand, annotated with dimensions: 19.8 cm outer length, 14.3 cm inner, 14.2 cm base, 2.9 cm folded lip and 15.73° effective wedge angle."
                caption="Wedge shown at scale — a hard, low, sharp leading edge is what matters."
                w={1600}
                h={900}
              />
              <p>
                Ensure your final wedge complies with the official rules on
                edges, dimensions and materials. A wedge that’s too sharp or
                overhangs beyond limits can disqualify an otherwise legal bot.
              </p>
            </Section>

            {/* ── Step 3: Battery ─────────────────────────────── */}
            <Section id="battery" eyebrow="Step 3" title="Choose the Battery">
              <p>
                RoboSumo motors pull massive current in short bursts. A{' '}
                <strong>3S LiPo (11.1 V)</strong> is the classic choice —
                high discharge C-rating, generous capacity for a short match
                and small enough to fit inside a 3 kg bot.
              </p>
              <Figure
                src="/blog-assets/robosumo/lipo-3s-battery.jpg"
                alt="Pro-Range 5200 mAh 3S 11.1 V 40C LiPo battery with red-and-black leads and XT60-style balance connector — main power source for the RoboSumo robot."
                caption="Any reputable 3S LiPo (2200–5200 mAh, 40 C+) works well for this build."
                w={1200}
                h={900}
              />
              <Callout tone="danger" icon={ShieldAlert} title="LiPo safety — non-negotiable">
                Only charge with a <strong>compatible balance charger</strong>{' '}
                inside a LiPo-safe bag. Inspect for punctures or puffiness
                before every session. Never leave a charging LiPo unattended.
              </Callout>
            </Section>

            {/* ── Step 4: Motors ──────────────────────────────── */}
            <Section id="motors" eyebrow="Step 4" title="Install the 300 RPM Johnson Motors">
              <p>
                Two <strong>300 RPM Johnson gear motors</strong> drive the
                two rubber wheels. 300 RPM is the sweet spot between torque
                and speed for a 3 kg sumo. Mount each motor with U-clamps
                into the chassis cutouts.
              </p>
              <div className="not-prose grid md:grid-cols-2 gap-4 my-6">
                <Figure
                  src="/blog-assets/robosumo/johnson-300rpm-motor.jpg"
                  alt="Side view of a 300 RPM 12 V Johnson gear motor with metal gearbox and D-shaft — used to drive the RoboSumo robot wheels."
                  caption="300 RPM Johnson motor — solid metal gearbox for shock loads."
                  w={1200}
                  h={900}
                />
                <Figure
                  src="/blog-assets/robosumo/robosumo-chassis-bottom.jpg"
                  alt="Bottom-plate view of the RoboSumo chassis, 24 cm wide, showing motor-mount screw holes."
                  caption="Bottom plate — flat, rigid, drilled for the U-clamps."
                  w={1200}
                  h={720}
                />
              </div>
            </Section>

            {/* ── Step 5: Motor driver ────────────────────────── */}
            <Section id="motor-driver" eyebrow="Step 5" title="Wire the BTS7960 Motor Drivers">
              <p>
                Each Johnson motor is driven by a{' '}
                <strong>BTS7960 43 A H-bridge</strong> module. One driver per
                motor gives you full independent PWM control, which is what
                differential-drive steering needs.
              </p>
              <div className="not-prose grid md:grid-cols-2 gap-4 my-6">
                <Figure
                  src="/blog-assets/robosumo/bts7960-motor-driver-pinout.jpg"
                  alt="BTS7960 motor driver board with labelled terminals — 5V, GND, RPWM, LPWM, R_EN, L_EN on the logic side and B+, B-, M+, M- on the high-current side. Motor supply range 5.5 V-27 V DC."
                  caption="BTS7960 pinout — memorise which side is logic and which is high-current."
                  w={1200}
                  h={900}
                />
                <Figure
                  src="/blog-assets/robosumo/bts7960-motor-driver-top.jpg"
                  alt="Top-down photo of a BTS7960 43 A dual half-bridge motor driver with heatsink and green screw terminals."
                  caption="The BTS7960’s heatsink handles the short current spikes cleanly."
                  w={1200}
                  h={900}
                />
              </div>
              <p>Motor terminal convention used throughout this build:</p>
              <ul>
                <li><strong>Black wire → M-</strong></li>
                <li><strong>Red wire → M+</strong></li>
              </ul>
            </Section>

            {/* ── Step 6: Bracket ─────────────────────────────── */}
            <Section id="bracket" eyebrow="Step 6" title="Design a Motor-Driver Bracket">
              <p>
                A pair of small 3D-printed brackets (designed in Autodesk
                Fusion) holds each BTS7960 securely to the chassis. Using two
                narrow clamps rather than one wide one keeps the driver’s
                screw terminals accessible after mounting.
              </p>
              <Figure
                src="/blog-assets/robosumo/motor-driver-bracket-3d.jpg"
                alt="Isometric render of a small yellow 3D-printed U-shaped bracket used to clamp a BTS7960 motor driver to the RoboSumo chassis."
                caption="Simple U-bracket — 3D print in PETG for heat resistance."
                w={800}
                h={600}
              />
              <Callout tone="info" icon={ShieldAlert} title="No 3D printer? No problem.">
                Strong double-sided VHB tape or a laser-cut acrylic plate
                works equally well. Just ensure nothing shorts across the
                BTS7960’s high-current traces.
              </Callout>
            </Section>

            {/* ── Steps 7-10: Power & wiring ───────────────────── */}
            <Section id="wiring" eyebrow="Steps 7-10" title="Power Delivery &amp; Wiring">
              <p>
                With the mechanical build done, we can move to power. Steps
                7-10 all belong to the same subsystem — the goal is to feed
                <strong> 11.1 V from the LiPo</strong> to both BTS7960s
                directly, and a clean <strong>5 V rail</strong> to the ESP32
                through an LM2596.
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <strong>Solder the motor wires</strong> onto each motor and
                  into the corresponding <code>M+</code>/<code>M-</code>{' '}
                  terminal on the BTS7960.
                </li>
                <li>
                  <strong>Add the XT60 pigtail</strong> to the LiPo lead —
                  this becomes the master power connector for the whole
                  robot. Confirm polarity twice.
                </li>
                <li>
                  <strong>Split the battery feed</strong> into two branches:
                  one to the BTS7960 <code>B+/B-</code> pair, the other into
                  the LM2596 input.
                </li>
                <li>
                  <strong>Set the LM2596 to 5.0 V</strong> using a multimeter{' '}
                  <em>before</em> connecting the ESP32. A 100 µF electrolytic
                  cap across the output (with an optional 0.1 µF ceramic in
                  parallel) will crush the ripple.
                </li>
              </ol>
              <div className="not-prose grid md:grid-cols-2 gap-4 my-6">
                <Figure
                  src="/blog-assets/robosumo/xt60-connector.jpg"
                  alt="Yellow female XT60 connector — the industry-standard high-current battery plug used to connect a 3S LiPo to the RoboSumo power rail."
                  caption="XT60 — polarised, high-current, near-impossible to plug in backwards."
                  w={900}
                  h={700}
                />
                <Figure
                  src="/blog-assets/robosumo/lm2596-buck-converter.jpg"
                  alt="LM2596 DC-DC step-down module with input and output capacitors and trim-pot, used to step 11.1 V LiPo down to 5 V for the ESP32."
                  caption="LM2596 buck converter — tiny, cheap, does 3 A cleanly with a heatsink."
                  w={900}
                  h={700}
                />
              </div>
              <Callout tone="warn" icon={ShieldAlert} title="Never power motors from the ESP32">
                The ESP32’s 5 V pin cannot source the tens of amps a Johnson
                motor pulls under stall. Motors always go direct to LiPo via
                the BTS7960; logic power comes from the LM2596. Both
                grounds must be common.
              </Callout>
            </Section>

            {/* ── Steps 11-12: ESP32 wiring ───────────────────── */}
            <Section id="esp32" eyebrow="Steps 11-12" title="Connect the BTS7960 to the ESP32">
              <p>
                The BTS7960 exposes six logic pins:{' '}
                <code>RPWM</code>, <code>LPWM</code>, <code>R_EN</code>,{' '}
                <code>L_EN</code>, <code>VCC</code>, <code>GND</code>. Wire
                them to the following ESP32 GPIOs — this mapping matches the
                firmware in the next section:
              </p>
              <Figure
                src="/blog-assets/robosumo/esp32-s3-board.jpg"
                alt="ESP32-S3 development board with dual USB-C connectors, yellow header pins and integrated Wi-Fi antenna — the main control unit for the RoboSumo robot."
                caption="ESP32-S3 dev board — Wi-Fi + 20 kHz hardware PWM in one chip."
                w={900}
                h={700}
              />
              <Figure
                src={HERO_IMAGE}
                w={1600}
                h={900}
                alt="Full ESP32-S3 connection diagram for a RoboSumo robot showing dual BTS7960 motor drivers, an LM2596 DC-DC buck converter stepping 12 V to 5 V, a 3S 2200 mAh LiPo battery, two 300 RPM Johnson gear motors, GPIO pin mapping and Wi-Fi access-point credentials."
                caption="Complete circuit diagram — Wi-Fi AP SSID: SumoBot · Password: sumo12345 · IP: 192.168.4.1."
              />
              <CodeBlock
                language="cpp"
                label="ESP32 pin map"
                code={`// LEFT BTS7960
#define L_RPWM 4
#define L_LPWM 5
#define L_R_EN 6
#define L_L_EN 7

// RIGHT BTS7960
#define R_RPWM 15
#define R_LPWM 16
#define R_R_EN 17
#define R_L_EN 18

// FlySky FS-CT6B receiver (optional RC control)
#define RC_CH1 8   // Steering
#define RC_CH2 9   // Throttle`}
              />
              <p>
                Use short jumper wires while prototyping so you can rewire
                fast during testing. Solder them once you’re confident the
                mapping is stable.
              </p>
            </Section>

            {/* ── Step 13: Code walkthrough ───────────────────── */}
            <Section id="code" eyebrow="Step 13" title="ESP32 Firmware Walkthrough">
              <p>
                A single Arduino sketch handles everything: motor PWM, the
                Wi-Fi joystick web-app, optional FlySky RC input and a hard
                failsafe that stops the motors if either controller drops.
              </p>

              <h3 className="text-xl font-bold text-[#0F172A] mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                1. Wi-Fi access-point setup
              </h3>
              <p>
                The ESP32 hosts its own Wi-Fi so no router is needed at the
                venue. Connect any phone to the SSID{' '}
                <code>SumoBot</code> and open <code>192.168.4.1</code>.
              </p>
              <CodeBlock
                language="cpp"
                label="Wi-Fi + failsafe config"
                code={`#include <WiFi.h>
#include <WebServer.h>

const char* AP_SSID     = "SumoBot";
const char* AP_PASSWORD = "sumo12345";

const int RC_FAILSAFE_MS   = 300;   // stop motors if no RC pulse in 300ms
const int WIFI_FAILSAFE_MS = 500;   // stop motors if no phone cmd in 500ms
const int PWM_FREQ         = 20000; // 20 kHz — inaudible to humans
const int PWM_RES_BITS     = 8;     // 0..255
const int MOTOR_MAX        = 255;`}
              />

              <h3 className="text-xl font-bold text-[#0F172A] mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                2. Differential-drive mixing
              </h3>
              <p>
                Throttle drives both wheels forward/back; steering biases the
                left/right speed to make the bot turn. Constrain to keep PWM
                inside legal bounds.
              </p>
              <CodeBlock
                language="cpp"
                label="Motor mixer"
                code={`int left  = throttle + steering;
int right = throttle - steering;

left  = constrain(left,  -MOTOR_MAX, MOTOR_MAX);
right = constrain(right, -MOTOR_MAX, MOTOR_MAX);

driveMotor(L_RPWM, L_LPWM, left);
driveMotor(R_RPWM, R_LPWM, right);`}
              />

              <h3 className="text-xl font-bold text-[#0F172A] mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                3. Phone joystick endpoint
              </h3>
              <p>
                The on-board web page (also served by the ESP32) sends
                joystick values over a single HTTP endpoint. Format:{' '}
                <code>/cmd?t=&lt;throttle&gt;&amp;s=&lt;steering&gt;</code>.
              </p>
              <CodeBlock
                language="cpp"
                label="Phone → ESP32"
                code={`server.on("/cmd", HTTP_GET, []() {
  lastPhoneMs = millis();                 // reset failsafe timer
  phoneThrottle = server.arg("t").toInt();
  phoneSteering = server.arg("s").toInt();
  server.send(200, "text/plain", "OK");
});`}
              />

              <h3 className="text-xl font-bold text-[#0F172A] mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                4. Failsafe priority
              </h3>
              <p>
                RC control always wins if it’s live — the moment the sticks
                move off centre by more than the deadband, phone commands are
                ignored. If <em>both</em> inputs go silent, the motors are
                cut hard.
              </p>
              <CodeBlock
                language="cpp"
                label="Control-priority loop"
                code={`bool rcLive    = (millis() - lastRcMs)    < RC_FAILSAFE_MS;
bool phoneLive = (millis() - lastPhoneMs) < WIFI_FAILSAFE_MS;

if (rcLive) {
  applyMix(rcThrottle, rcSteering);
} else if (phoneLive) {
  applyMix(phoneThrottle, phoneSteering);
} else {
  stopMotors();     // final safety state
}`}
              />

              <Callout tone="success" icon={Rocket} title="Download the full firmware">
                The complete Arduino sketch (Wi-Fi + FlySky RC + failsafe +
                HTML joystick page) is available in the resources folder:
                <a
                  href={CODE_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener"
                  className="ml-1 font-semibold underline text-emerald-800 hover:text-emerald-900"
                >
                  Download the ESP32 code
                </a>
                .
              </Callout>
            </Section>

            {/* ── Step 14: Testing ────────────────────────────── */}
            <Section id="testing" eyebrow="Step 14" title="Final Testing Checklist">
              <p>Before the first powered test, walk this list top-to-bottom:</p>
              <ul>
                <li>All solder joints solid and heat-shrunk.</li>
                <li>Battery polarity confirmed with a multimeter.</li>
                <li>LM2596 measured at 5.0 V — no more, no less.</li>
                <li>No stray strands bridging BTS7960 terminals.</li>
                <li>Wheels mount square; nothing rubs.</li>
                <li>Common ground between LiPo, LM2596, ESP32 and both BTS7960s.</li>
              </ul>
              <p>
                Now power up and test each motion in isolation — forward,
                reverse, left, right, stop. Both motors should spin in the
                direction you expect at each throttle/steering input.
              </p>
            </Section>

            {/* ── Step 15: Weight ─────────────────────────────── */}
            <Section id="weight" eyebrow="Step 15" title="Weigh Your RoboSumo">
              <p>
                Finally — put the bot on a kitchen scale. The target for this
                reference build is <strong>≤ 3 kg</strong>. Always confirm
                against the current rulebook — a bot over-weight by 20 g on
                match day is a lost season.
              </p>
              <Callout tone="success" icon={Award} title="You’re competition-ready!">
                Design → chassis → motors → drivers → battery → wiring →
                ESP32 → firmware → tested → weighed. Time to enter the
                arena.
              </Callout>
            </Section>

            {/* ── Final CTA card ──────────────────────────────── */}
            <div className="not-prose my-14 rounded-3xl overflow-hidden border border-slate-200 bg-gradient-to-br from-[#0F172A] to-[#1E3A5F] text-white p-8 md:p-10">
              <p className="text-xs uppercase tracking-widest text-[#FDBA74] font-semibold mb-3">
                Ready to compete?
              </p>
              <h2
                className="text-2xl md:text-3xl font-bold mb-3"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Take your RoboSumo to IIT Bombay.
              </h2>
              <p className="text-white/80 max-w-2xl mb-6">
                OLL × TechFest 2026-27 is FREE to enter, open to Grades 4–12
                across India, and offers a ₹1.5 lakh prize pool with the
                Grand Finale at IIT Bombay in December.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={TECHFEST_URL}
                  data-testid="footer-cta-techfest"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D63031] hover:bg-[#B02222] text-white font-semibold shadow-lg transition-colors"
                >
                  Register for OLL × TechFest <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={SHOP_KIT_URL}
                  target="_blank"
                  rel="noopener"
                  data-testid="footer-cta-kit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold transition-colors"
                >
                  Buy the RoboSumo Kit
                </a>
              </div>
            </div>

            {/* ── FAQ ─────────────────────────────────────────── */}
            <Section id="faq" eyebrow="FAQ" title="RoboSumo Build FAQs">
              <div className="not-prose space-y-3">
                {[
                  {
                    q: 'What is the weight limit for a RoboSumo robot at OLL × TechFest?',
                    a: 'For this reference build the target is under 3 kg. Always confirm against the latest official OLL × TechFest RoboSumo rulebook — weight, dimensions and construction rules can change per season.',
                  },
                  {
                    q: 'Which ESP32 board is best for a sumo bot?',
                    a: 'An ESP32-S3 or ESP32-C3 is ideal — both include hardware Wi-Fi, support 20 kHz PWM out-of-the-box and have enough GPIOs to drive two BTS7960 modules plus an FS-CT6B RC receiver. GPIO pins are 3.3 V, never feed them 5 V directly.',
                  },
                  {
                    q: 'Do I need a 3D printer to build a RoboSumo?',
                    a: 'No. The 3D-printed motor-driver bracket is optional — you can mount the BTS7960 modules with strong double-sided VHB tape or a small aluminium/acrylic plate. The chassis in this guide is made from wood.',
                  },
                  {
                    q: 'How do I control the RoboSumo from my phone?',
                    a: 'The ESP32 hosts its own Wi-Fi access point (SSID: SumoBot, password: sumo12345). Connect any phone or laptop, open 192.168.4.1 in the browser and use the on-screen joystick — no app installation needed.',
                  },
                  {
                    q: 'Where can I buy the official RoboSumo kit?',
                    a: 'The official OLL × TechFest RoboSumo Competition Kit ships across India with all essentials pre-selected for the current ruleset. Get it from the OLL shop.',
                  },
                ].map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm"
                  >
                    <summary className="flex items-center justify-between cursor-pointer text-[16px] font-semibold text-[#0F172A] list-none">
                      {item.q}
                      <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-3 text-slate-600 text-[15px] leading-relaxed">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </Section>

            {/* Author card */}
            <div className="not-prose my-14 rounded-3xl border border-slate-200 bg-white p-6 flex items-start gap-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#D63031] flex items-center justify-center text-white font-bold text-xl shrink-0">
                P
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">
                  Written by
                </p>
                <p className="font-bold text-[#0F172A] text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Pratyoosh
                </p>
                <p className="text-slate-600 text-[15px] leading-relaxed mt-1">
                  RoboSumo winner from NL Dalmia High School and past
                  participant of the OLL × TechFest Robotics Championship. He
                  writes about ESP32, mechatronics and school-level robotics
                  competitions.
                </p>
              </div>
            </div>
          </article>

          {/* ── Sticky TOC (desktop) ─────────────────────────────
               Explicit `top: 100px` clears the sticky pill-nav (which is
               ~72 px tall + 12 px offset). `max-h` + `overflow-y-auto`
               guarantees the TOC stays inside the viewport even when the
               sections list grows. */}
          <aside className="hidden lg:block">
            <div
              className="max-h-[calc(100vh-8rem)] overflow-y-auto pr-1"
              style={{ position: 'sticky', top: '100px' }}
              data-testid="rs-toc-sidebar"
            >
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-3">
                On this page
              </p>
              <nav
                aria-label="Table of contents"
                className="border-l border-slate-200 pl-4 space-y-2 text-[14px]"
              >
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`block leading-snug transition-colors ${
                      activeId === s.id
                        ? 'text-[#D63031] font-semibold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    data-testid={`toc-${s.id}`}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default RoboSumoBuildGuideBlog;
