/**
 * ICSE Robotics & AI Code 66: Complete Guide for Classes 9 & 10
 * ──────────────────────────────────────────────────────────────
 * Long-form, SEO-first pillar blog aimed at ranking #1 for queries like:
 *   • ICSE Robotics and AI
 *   • ICSE Robotics and Artificial Intelligence Code 66
 *   • CISCE Robotics and AI syllabus
 *   • ICSE Class 9 / Class 10 Robotics and AI exam pattern
 *   • robotics kit for schools ICSE
 *
 * Same SEO stack pattern as /blogs/how-to-build-robosumo-robot-iit-bombay-techfest:
 *   - Sticky pill-nav (matching Techfest / RoboSumo blog for site-wide continuity)
 *   - Right-rail sticky ToC with scroll-spy
 *   - Article + FAQPage + BreadcrumbList JSON-LD
 *   - Full og / twitter card stack via useSeo (React 19 safe)
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
  ExternalLink,
  GraduationCap,
  Rocket,
  ShieldAlert,
} from 'lucide-react';
import Footer from '../../components/Footer';
import RelatedBlogsRail from '../../components/RelatedBlogsRail';
import { ogImage } from '../../utils/ogImage';
import { useSeo } from '../../hooks/useSeo';

const OLL_LOGO_HORIZONTAL =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

/* ─── SEO constants ────────────────────────────────────────── */
const CANONICAL_URL =
  'https://oll.co/blogs/icse-robotics-ai-code-66-classes-9-10-guide';
const PAGE_TITLE =
  'ICSE Robotics & AI Group 3 Subject (Code 66): Complete Guide for Schools to Implementing Classes 9 & 10';
const META_DESCRIPTION =
  'Planning ICSE Robotics and Artificial Intelligence (Code 66) for Classes 9 & 10? Learn the CISCE syllabus, assessment pattern, lab setup, Python programming and teacher support your school needs — with a ready-to-run implementation checklist and OLL Code 66 program overview.';
const KEYWORDS =
  'ICSE Robotics and AI, ICSE Robotics and Artificial Intelligence, Code 66, CISCE Robotics and AI syllabus, ICSE Class 9 Robotics and AI, ICSE Class 10 Robotics and AI, ICSE Robotics and AI exam pattern, robotics lab for schools, robotics kit for schools, robotics and AI curriculum for schools, robotics and AI teacher training, Python for ICSE, OLL Code 66, ICSE Group 3';
const AUTHOR_NAME = 'The OLL Curriculum Team';
const PUBLISHED_ISO = '2026-09-30T09:00:00+05:30';
const MODIFIED_ISO = new Date().toISOString();

const IMG = (name) => `/blog-assets/icse-code66/${name}`;
const HERO_IMAGE = IMG('icse-code66-hero-banner-v2.jpg');
const ECOSYSTEM_IMAGE = IMG('oll-code66-program-ecosystem.jpg');
const BOARD_ASSESSMENT_IMAGE = IMG('icse-board-assessment-format.jpg');
const YEAR_PLAN_IMAGE = IMG('assessment-plan-7-stage-timeline.jpg');
const KIT_COMPONENTS_IMAGE = IMG('oll-kit-components-36-items.jpg');

const SHOP_URL = 'https://oll.co/shop';
const PROGRAM_URL =
  '/school/icse-robotics-and-ai-curriculum-books-with-practical-activity-kits-for-class-9th-and10th';

const SECTIONS = [
  { id: 'why-cisce',        label: 'Why CISCE introduced Code 66' },
  { id: 'introduce',        label: 'Should your school introduce it?' },
  { id: 'expectations',     label: 'What CISCE expects from schools' },
  { id: 'assessment',       label: 'How Code 66 is assessed' },
  { id: 'assessment-plan',  label: 'Structuring assessments across the year' },
  { id: 'assignments',      label: 'Recommended assignments' },
  { id: 'infrastructure',   label: 'Lab infrastructure' },
  { id: 'concept-practical', label: 'Connecting every practical to a concept' },
  { id: 'choose-provider',  label: 'Choosing a curriculum provider' },
  { id: 'curriculum',       label: 'Class 9 & 10 curriculum breakdown' },
  { id: 'books',            label: 'Recommended books' },
  { id: 'teacher-select',   label: 'Selecting the right teacher' },
  { id: 'oll',              label: 'How OLL supports implementation' },
  { id: 'results',          label: 'Real student results' },
  { id: 'schools',          label: 'Schools already using OLL Code 66' },
  { id: 'checklist',        label: 'Readiness checklist' },
  { id: 'faq',              label: 'FAQs' },
];

const buildJsonLd = () => [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: PAGE_TITLE,
    description: META_DESCRIPTION,
    image: [
      `https://oll.co${HERO_IMAGE}`,
      `https://oll.co${ECOSYSTEM_IMAGE}`,
      `https://oll.co${BOARD_ASSESSMENT_IMAGE}`,
    ],
    datePublished: PUBLISHED_ISO,
    dateModified: MODIFIED_ISO,
    author: {
      '@type': 'Organization',
      name: 'OLL',
      url: 'https://oll.co',
    },
    publisher: {
      '@type': 'Organization',
      name: 'OLL',
      logo: { '@type': 'ImageObject', url: 'https://oll.co/favicon.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL_URL },
    keywords: KEYWORDS,
    articleSection: 'Curriculum',
    inLanguage: 'en-IN',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://oll.co/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://oll.co/blogs' },
      { '@type': 'ListItem', position: 3, name: 'ICSE Robotics & AI Code 66 Guide', item: CANONICAL_URL },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is ICSE Robotics and Artificial Intelligence Code 66?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Code 66 is the CISCE subject code for Robotics and Artificial Intelligence in ICSE Classes 9 and 10. It combines classroom instruction, lab work and projects across robotic systems, components, motion, AI, data, Python programming and AI project frameworks.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is ICSE Robotics and AI assessed?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Through a two-hour written paper of 100 marks and an internal assessment of 100 marks — theory and practical carry equal weight.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many assignments are required in Class 9 and Class 10?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A minimum of 15 assignments in Class 9 across Robotics (3), AI (2) and Python (10), and a minimum of 20 in Class 10 across Robotics (4), AI (4) and Python (12).',
        },
      },
      {
        '@type': 'Question',
        name: 'What equipment is needed for an ICSE Robotics and AI lab?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Computers with Python, robotics boards such as Arduino, sensors, motors and servos, LEDs and electronic components, wires and breadboards, robotics chassis and mechanical parts, plus simulation or virtual-lab tools.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does CISCE provide resources for teachers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. The CISCE Primer on Robotics and Artificial Intelligence for Teachers includes suggested activities, assignments and lesson-planning guidance for Classes IX and X.',
        },
      },
    ],
  },
];

/* ─── UI atoms ─────────────────────────────────────────────── */
const Section = ({ id, eyebrow, title, children }) => (
  <section id={id} className="scroll-mt-28 mb-16" data-testid={`section-${id}`}>
    {eyebrow && (
      <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#DC2626] mb-3">
        {eyebrow}
      </p>
    )}
    <h2
      className="text-[26px] md:text-[32px] font-bold text-[#0A1F44] mb-6 leading-tight tracking-tight"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {title}
    </h2>
    <div className="icse-prose">{children}</div>
  </section>
);

const Figure = ({ src, alt, caption, w = 1600, h = 900 }) => (
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

const Callout = ({ tone = 'info', icon: Icon = ShieldAlert, title, children }) => {
  const palette = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  }[tone];
  return (
    <aside className={`not-prose my-6 rounded-2xl border p-5 flex gap-4 ${palette}`} role="note">
      <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-[15px] leading-relaxed">{children}</div>
      </div>
    </aside>
  );
};

/* ─── Page ─────────────────────────────────────────────────── */
const ICSECode66BlogPage = () => {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); }),
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

  useSeo({
    title: PAGE_TITLE,
    description: META_DESCRIPTION,
    keywords: KEYWORDS,
    canonical: CANONICAL_URL,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1',
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

  // Extra tags
  useEffect(() => {
    const owned = [];
    const upsert = (tag, attrs) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => v && el.setAttribute(k, v));
      document.head.appendChild(el);
      owned.push(el);
    };
    upsert('meta', { property: 'og:image:width', content: '1200' });
    upsert('meta', { property: 'og:image:height', content: '630' });
    upsert('meta', { property: 'og:locale', content: 'en_IN' });
    upsert('meta', { property: 'article:published_time', content: PUBLISHED_ISO });
    upsert('meta', { property: 'article:modified_time', content: MODIFIED_ISO });
    upsert('meta', { property: 'article:section', content: 'Curriculum' });
    ['ICSE', 'Robotics', 'Artificial Intelligence', 'Code 66', 'CISCE', 'Python'].forEach(
      (t) => upsert('meta', { property: 'article:tag', content: t }),
    );
    ['en-IN', 'x-default'].forEach((lang) =>
      upsert('link', { rel: 'alternate', hreflang: lang, href: CANONICAL_URL }),
    );
    return () => owned.forEach((el) => el.remove());
  }, []);

  return (
    <>
      <style>{`
        /* See RoboSumo blog for rationale on the overflow override. */
        html:has(.icse-page), body:has(.icse-page) {
          overflow-x: clip !important;
          overflow-y: visible !important;
          max-width: none !important;
        }
        .icse-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 8%, rgba(220,38,38,0.28), transparent 40%),
            radial-gradient(circle at 85% 30%, rgba(96,165,250,0.18), transparent 50%),
            linear-gradient(180deg, #0A1F44 0%, #1E3A5F 45%, #0A1F44 100%);
          background-attachment: fixed;
        }
        @media (max-width: 820px), (hover: none) and (pointer: coarse) {
          .icse-page { background-attachment: scroll; }
        }
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
        .tf-pillnav-brands img { display: block; height: 42px; width: auto; }
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
          .tf-pillnav-brands img { height: 28px; }
          .tf-btn { padding: 8px 10px; font-size: 0.65rem; gap: 4px; }
          .tf-btn .tf-hide-sm { display: none; }
        }

        .icse-prose { font-size: 18px; line-height: 1.85; color: #334155; }
        .icse-prose p { margin: 0 0 1.15rem; }
        .icse-prose ul, .icse-prose ol { margin: 0.4rem 0 1.25rem; padding-left: 1.4rem; }
        .icse-prose li { margin-bottom: 0.35rem; }
        .icse-prose strong { color: #0A1F44; font-weight: 700; }
      `}</style>

      <div className="icse-page">
        {/* ── Pill nav ─────────────────────────────────────────── */}
        <nav
          className="tf-pillnav"
          aria-label="ICSE Code 66 blog primary navigation"
          data-testid="icse-pillnav"
        >
          <div className="tf-pillnav-inner">
            <div className="tf-pillnav-brands">
              <Link to="/" data-testid="icse-nav-oll-logo" aria-label="OLL Home">
                <img src={OLL_LOGO_HORIZONTAL} alt="OLL" />
              </Link>
            </div>
            <div className="tf-pillnav-ctas">
              <a
                href={SHOP_URL}
                target="_blank"
                rel="noopener"
                className="tf-btn ghost-dark"
                data-testid="icse-nav-shop"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span className="tf-hide-sm">Shop </span>Kits
              </a>
              <Link
                to={PROGRAM_URL}
                className="tf-btn primary"
                data-testid="icse-nav-program"
              >
                Explore<span className="tf-hide-sm"> Code 66</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <header className="relative overflow-hidden text-white">
          <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_10%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_40%)]" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14">
            <nav aria-label="Breadcrumb" className="text-sm text-white/70 flex items-center gap-2 mb-6">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link to="/blogs" className="hover:text-white transition-colors">Blog</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white/90">ICSE Robotics &amp; AI Code 66 Guide</span>
            </nav>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-wider mb-5">
              <GraduationCap className="w-3.5 h-3.5 text-[#FDBA74]" />
              CISCE Group 3 · Subject Code 66 · Classes 9 &amp; 10
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] mb-5"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              data-testid="blog-h1"
            >
              ICSE Robotics &amp; AI Group 3 Subject (Code 66):{' '}
              <span className="text-[#FDBA74]">
                Complete Guide for Schools to Implementing Classes 9 &amp; 10
              </span>
            </h1>

            <p className="text-lg text-white/85 max-w-3xl leading-relaxed mb-8">
              Planning to introduce <strong>ICSE Robotics and Artificial
              Intelligence (Subject Code 66)</strong> at your school? This is
              the practical playbook — syllabus, assessment pattern, lab setup,
              Python environment and teacher support — with every stage mapped
              to the CISCE framework.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/75">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /><time dateTime={PUBLISHED_ISO}>30 September 2026</time></span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 22 min read</span>
              <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> {AUTHOR_NAME}</span>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to={PROGRAM_URL}
                data-testid="hero-cta-program"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold shadow-lg transition-colors"
              >
                <Rocket className="w-4 h-4" />
                Explore the OLL Code 66 Program
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={SHOP_URL}
                target="_blank"
                rel="noopener"
                data-testid="hero-cta-shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold transition-colors"
              >
                Book a Kit &amp; Curriculum Walkthrough
              </a>
            </div>
          </div>
        </header>

        {/* ── Body ─────────────────────────────────────────────── */}
        <main className="relative bg-white">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-14 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-x-12 gap-y-8">
            <article className="min-w-0">
              <Figure
                src={HERO_IMAGE}
                alt="OLL ICSE Group 3 Subject — Code 66: Robotics & AI for Classes 9th & 10th. Implementation Guide for Schools. Blue-and-red circuit-board hero banner featuring the OLL logo, the CODE 66 label and the '9th & 10th' badge."
                caption="Fig. 1 — OLL ICSE Group 3 · Code 66 · Robotics & AI Implementation Guide for Schools."
                w={1600}
                h={533}
              />

              <p className="text-lg leading-[1.85] text-slate-700 mb-6">
                Introducing <strong>ICSE Robotics and Artificial Intelligence
                (Subject Code 66)</strong> in Classes 9 and 10 takes more than
                adding another subject to the timetable. Schools need to plan
                curriculum, the Robotics &amp; AI lab, teacher support,
                practical activities and internal assessment{' '}
                <em>together</em>, from the first week of the academic year.
              </p>

              <Callout tone="info" icon={GraduationCap} title="Who this guide is for">
                School leaders, academic coordinators and STEM heads planning
                Code 66 for the coming academic year. Everything is mapped
                to the current CISCE framework and drawn from four years of
                OLL implementations across 400+ schools.
              </Callout>

              {/* Overview list */}
              <div className="not-prose bg-slate-50 rounded-2xl p-6 my-10 border border-slate-100">
                <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-3">
                  In this guide
                </p>
                <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 list-decimal list-inside text-[15px] text-slate-700">
                  {SECTIONS.map((s) => (
                    <li key={s.id}>
                      <a className="hover:text-[#DC2626] transition-colors" href={`#${s.id}`}>
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Why CISCE */}
              <Section id="why-cisce" eyebrow="Rationale" title="Why did CISCE introduce Code 66?">
                <p>The CISCE aims of the programme are to:</p>
                <ol>
                  <li>Develop an understanding of concepts and applications in Robotics and Artificial Intelligence.</li>
                  <li>Build competencies via classroom instruction, laboratory learning and self-directed project-based work.</li>
                  <li>Facilitate hands-on application of concepts through practical activities.</li>
                  <li>Instill AI-readiness skills through Data, Computer Vision and Natural Language Processing.</li>
                  <li>Introduce the AI Project Framework.</li>
                  <li>Familiarise students with computational skills (basic Python coding).</li>
                  <li>Create awareness of the ethical considerations of AI.</li>
                </ol>
              </Section>

              {/* Should you introduce */}
              <Section id="introduce" eyebrow="Decision" title="Should your school introduce this subject? Yes — here's why.">
                <ol>
                  <li>
                    <strong>Build practical technology skills.</strong> ICSE
                    Robotics &amp; AI moves students beyond theory into
                    working robotics, programming, AI and hands-on projects.
                  </li>
                  <li>
                    <strong>Develop future-ready competencies.</strong> The
                    subject combines Robotics, AI, Python, Data and
                    computational thinking — increasingly relevant across
                    technology-driven fields.
                  </li>
                  <li>
                    <strong>Encourage learning through projects.</strong>{' '}
                    Students experiment, build, test and apply rather than
                    memorise.
                  </li>
                  <li>
                    <strong>Offer a structured ICSE pathway.</strong> Instead
                    of occasional workshops, Robotics &amp; AI runs as a
                    proper ICSE Group 3 subject with a defined curriculum,
                    practical work and assessment framework.
                  </li>
                </ol>
              </Section>

              {/* Expectations */}
              <Section id="expectations" eyebrow="CISCE Framework" title="What does CISCE expect schools to do?">
                <p>
                  The CISCE Robotics and AI syllabus is built around a mix of
                  classroom instruction, laboratory learning and project-based
                  work. Six operational responsibilities sit with the school:
                </p>
                <ol>
                  <li>
                    <strong>Getting students to opt for the programme.</strong>{' '}
                    Introduce the subject, its learning areas and practical
                    applications so students make an informed choice.
                  </li>
                  <li>
                    <strong>Identifying and training the right teacher.</strong>{' '}
                    Ensure the teacher is adequately trained on concepts,
                    curriculum, practical activities and resources.
                  </li>
                  <li>
                    <strong>Arranging a curriculum provider.</strong> Books,
                    structured lesson plans, instructional videos and other
                    resources are all required.
                  </li>
                  <li>
                    <strong>Purchasing materials for practicals.</strong>{' '}
                    Robotics kits, controllers, sensors, motors and other
                    components for hands-on activity.
                  </li>
                  <li>
                    <strong>Implementing Robotics &amp; AI in the timetable.</strong>{' '}
                    Allocate regular periods for both instruction and
                    practical work.
                  </li>
                  <li>
                    <strong>Regular assessment.</strong> Tests, examinations,
                    practical assessments and project-based evaluation across
                    theory and practice.
                  </li>
                </ol>
              </Section>

              {/* Assessment */}
              <Section id="assessment" eyebrow="Assessment" title="How is Code 66 assessed?">
                <p>
                  The prescribed ICSE Robotics &amp; AI exam pattern gives{' '}
                  <strong>equal weight to theory and practice</strong>: a
                  two-hour written paper of 100 marks, and 100 marks of
                  internal assessment.
                </p>
                <p>
                  Because half the marks come from internal assessment, {' '}
                  <strong>year-round implementation matters</strong>. CISCE
                  sets a minimum number of assignments for each class:
                </p>
                <Figure
                  src={IMG('minimum-assignments-cisce.jpg')}
                  alt="OLL infographic showing the minimum assignments prescribed by CISCE for Robotics, AI, and Python. Class 9 requires 15 assignments: 3 Robotics, 2 AI, and 10 Python. Class 10 requires 20 assignments: 4 Robotics, 4 AI, and 12 Python."
                  caption="Fig. 3 — Minimum assignments prescribed by CISCE. Python carries the largest share."
                />
                <Callout tone="warn" icon={ShieldAlert} title="Don't leave IA to the last two weeks">
                  Schools need an internal-assessment system in place from{' '}
                  <em>day one</em> of the academic year. Rushing 15+
                  practical/programming assignments in the weeks before board
                  exams leads to weaker learning and lower scores.
                </Callout>
              </Section>

              {/* Assessment plan */}
              <Section id="assessment-plan" eyebrow="Year plan" title="How should schools structure assessments through the year?">
                <Figure
                  src={KIT_COMPONENTS_IMAGE}
                  alt="OLL Kit Components infographic listing 36 items included in the Robotics and AI kit — including Arduino Uno, sensors, motor driver, robot chassis, motors, wheels, screws, jumper wires, breadboard, servo motor, LEDs, buzzer, battery, tools, stickers, and packaging, with quantities shown for applicable components."
                  caption="An implementation-ready kit anchors every stage of the yearly plan — practicals map directly to the assignments prescribed in each term."
                />

                <div className="not-prose grid md:grid-cols-2 gap-4 my-6">
                  {[
                    ['1. Before the academic session', ['Lab & kit readiness', 'Python setup and software', 'Lab infrastructure', 'Teacher training']],
                    ['2. Term 1 — foundation & continuous assessment', ['Concepts + practical learning', 'Begin internal-assessment assignments', 'Robotics, AI and Python basics']],
                    ['3. Mid-year assessment', ['First structured evaluation', 'Syllabus-based test on concepts covered', 'Practical/programming evaluation']],
                    ['4. Term 2 — advanced learning & projects', ['Complete syllabus', 'Advanced Robotics, AI and Python', 'Integrated projects', 'Finish remaining IA work']],
                    ['5. Pre-Prelims', ['First full-syllabus examination', 'Full-length theory paper', 'Practical/programming revision', 'Identify learning gaps for remediation']],
                    ['6. Prelims', ['Final board-style preparation', 'Full-syllabus mock exam under exam conditions', 'Final revision based on performance']],
                    ['7. Before the ICSE exam', ['Complete IA records', 'Revise weak areas', 'Practise Python/programming', 'Final doubt-solving sessions']],
                  ].map(([title, items]) => (
                    <div key={title} className="rounded-2xl border border-slate-200 p-4 bg-white">
                      <p className="font-semibold text-[#0A1F44] mb-2">{title}</p>
                      <ul className="text-[14px] text-slate-600 list-disc pl-4 space-y-1">
                        {items.map((it) => <li key={it}>{it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Assignments */}
              <Section id="assignments" eyebrow="Practicals" title="Recommended assignments & practical activities">
                <p>
                  The CISCE-suggested assignments mix Robotics, AI and Python
                  Programming, with increasing complexity across Grades 9 and 10.
                </p>

                <h3 className="text-xl font-bold text-[#0A1F44] mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Grade 9</h3>
                <p><strong>Robotics.</strong></p>
                <ul>
                  <li>Identify and present 5 unique smart robots and their applications.</li>
                  <li>Explain: "All robots are machines, but all machines are not robots."</li>
                  <li>Create a mind map of features, applications and classification of robots.</li>
                </ul>
                <p><strong>Artificial Intelligence.</strong></p>
                <ul>
                  <li>Explore how AI can be used in classrooms and how teaching could change in an AI-enabled classroom.</li>
                  <li>Discuss how AI can be a blessing or a curse, with relevant examples.</li>
                  <li>Use the AI Project Framework to design a Smart School — attendance, homework, fees, library.</li>
                </ul>
                <p><strong>Python Programming.</strong></p>
                <ul>
                  <li>Create a mind map of Python data types with examples.</li>
                  <li>Explore uses of Python functions and modular programming.</li>
                  <li>Explain different types of errors in Python.</li>
                  <li>Write programs using <code>while</code> loops.</li>
                  <li>Find the larger of two numbers, prime/composite, HCF and LCM.</li>
                  <li>Print: <em>"AI is a Powerful Tool; however, it is to be used with Discretion."</em></li>
                </ul>

                <h3 className="text-xl font-bold text-[#0A1F44] mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Grade 10</h3>
                <p><strong>Robotics.</strong></p>
                <ul>
                  <li>Presentation on machine vs. robot vs. cobot.</li>
                  <li>How is technology evolving, and how does it impact us?</li>
                  <li>Are smart systems making humans less smart?</li>
                  <li>Report on robotic systems in different areas of life.</li>
                </ul>
                <p><strong>Artificial Intelligence.</strong></p>
                <ul>
                  <li>Concept map for a Smart Transport Management System for a school.</li>
                  <li>Design an AI-enabled Query Management System using the AI Project Framework.</li>
                  <li>Ideas for implementing AI across a school using the AI Project Framework.</li>
                </ul>
                <p><strong>Python Programming &amp; Data Analysis.</strong></p>
                <ul>
                  <li>Work with lists, strings and dictionaries on real-world datasets.</li>
                  <li>NumPy arrays: indexing, slicing, searching, sorting, reshaping.</li>
                  <li>Pandas for CSV / JSON.</li>
                  <li>Matplotlib plots, bar graphs, histograms.</li>
                  <li>Basic data analysis on real-world datasets.</li>
                  <li>Regression, trend analysis and predictions.</li>
                  <li>Normal distribution + analysing student scores (mean, median, mode).</li>
                  <li>Python programs for real-world applications: electricity bills, employee bonuses.</li>
                </ul>
              </Section>

              {/* Infrastructure */}
              <Section id="infrastructure" eyebrow="Lab" title="What infrastructure does a Robotics & AI lab need?">
                <p>
                  An ICSE Robotics &amp; AI lab needs both a{' '}
                  <strong>digital and a physical layer</strong>. Students need
                  computers with a Python programming environment, the right
                  robotics hardware and access to simulation tools.
                </p>
                <Figure
                  src={IMG('digital-physical-layer-lab.jpg')}
                  alt="OLL infographic illustrating the connection between digital and physical layers in Robotics and AI. The Digital Layer includes Computers with Python and Simulation & Virtual Labs, while the Physical Layer includes Arduino/SBC boards, sensors, motors and servos, LEDs and components, wires and breadboards, and chassis and mechanics."
                  caption="Fig. 5 — Digital + Physical: two halves of a working Code 66 lab."
                />
                <p>Depending on the school's model, a robotics kit for schools may include:</p>
                <ul>
                  <li>Robotics boards such as Arduino or other single-board systems</li>
                  <li>Sensors, motors and servo motors</li>
                  <li>LEDs and electronic components</li>
                  <li>Wires and breadboards</li>
                  <li>Robotics chassis and mechanical components</li>
                  <li>Simulation and virtual laboratory environments</li>
                  <li>Computers with Python installed / OLL's Virtual Python IDE</li>
                </ul>
                <p>
                  The real question isn't how many components you buy. It is
                  whether those components are enough for{' '}
                  <em>every activity</em> your students are expected to
                  perform across Class 9 and Class 10.
                </p>
              </Section>

              {/* Concept-Practical */}
              <Section id="concept-practical" eyebrow="Pedagogy" title="Connect every practical to a concept">
                <p>
                  Practical work should not be an occasional workshop. It
                  works best when it{' '}
                  <strong>follows directly from what was just taught</strong>.
                  After learning about sensors, students work with sensors.
                  After learning programming concepts, they write and test
                  code. After learning about robotic systems, they combine
                  components into a working project.
                </p>
                <Figure
                  src={ECOSYSTEM_IMAGE}
                  alt="OLL Code 66 Program infographic showing a complete Robotics and AI learning ecosystem, including ICSE-aligned textbooks, 30+ hands-on activities, robotics kits, Python and AI projects, virtual labs, teacher resources, assessments, and LMS-based progress tracking."
                  caption="OLL Code 66: an end-to-end ecosystem where every practical maps back to a concept — books to kits to code to LMS assessments."
                />
              </Section>

              {/* Choose provider */}
              <Section id="choose-provider" eyebrow="Vendor evaluation" title="How to choose an ICSE Robotics & AI curriculum provider">
                <p>
                  Choosing the right curriculum provider is about more than a
                  textbook or a set of robotics kits. Schools need a programme
                  aligned with the CISCE framework{' '}
                  <em>while making Robotics, AI and Python practical, engaging and easy to implement</em>.
                </p>
                <p>When comparing providers, ask five questions:</p>
                <Figure
                  src={YEAR_PLAN_IMAGE}
                  alt="OLL infographic showing a suggested ICSE Robotics & AI assessment plan for Classes 9 and 10, presented as a seven-stage academic timeline from pre-session preparation through Term 1, mid-year assessment, Term 2, pre-prelims, prelims, and final ICSE examination preparation."
                  caption="A strong Code 66 provider maps every practical, assignment and assessment against a year-long academic timeline — from pre-session prep to the ICSE board exam."
                />
                <div className="not-prose overflow-x-auto my-6 rounded-2xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="text-left py-3 px-4">Question</th>
                        <th className="text-left py-3 px-4">What a strong answer looks like</th>
                        <th className="text-center py-3 px-4">OLL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {[
                        ['Is the curriculum mapped to ICSE Code 66?', 'Every chapter, activity and assessment linked to the CISCE syllabus.'],
                        ['Robotics kits & lab infrastructure', 'Required kits, components and lab setup for every practical activity.'],
                        ['Are teachers supported?', 'Lesson plans, videos, presentations, activity instructions and training reduce the load on teachers.'],
                        ['Can student progress be tracked?', 'LMS, assignments, assessments and practical work visible throughout the year.'],
                        ['Service support', 'Ongoing academic + technical support for implementation, teacher queries, lab issues and practical activities.'],
                      ].map(([q, a]) => (
                        <tr key={q}>
                          <td className="py-2.5 px-4 font-medium">{q}</td>
                          <td className="py-2.5 px-4">{a}</td>
                          <td className="py-2.5 px-4 text-center text-emerald-600 font-bold text-lg">✓</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Curriculum breakdown */}
              <Section id="curriculum" eyebrow="Syllabus" title="Class 9 & 10 curriculum — what students actually learn">
                <p>
                  The CISCE Robotics &amp; AI curriculum for Classes 9 and 10
                  combines Robotics, Artificial Intelligence and Python
                  Programming. Students move from foundational concepts in
                  Class 9 to more advanced applications, programming and
                  integrated robotic systems in Class 10.
                </p>

                <h3 className="text-xl font-bold text-[#0A1F44] mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Class 9 — building the foundations</h3>
                <div className="not-prose grid md:grid-cols-3 gap-4 my-4">
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <p className="font-semibold text-[#0A1F44] mb-2">Robotics</p>
                    <ul className="text-[14px] text-slate-600 list-disc pl-4 space-y-1">
                      <li>Introduction to Robotics</li>
                      <li>Evolution, types, applications</li>
                      <li>Laws of Robotics</li>
                      <li>Robot components &amp; systems</li>
                      <li>Motion, joints, links, DOF</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <p className="font-semibold text-[#0A1F44] mb-2">Artificial Intelligence</p>
                    <ul className="text-[14px] text-slate-600 list-disc pl-4 space-y-1">
                      <li>Intro &amp; applications</li>
                      <li>Data and information</li>
                      <li>Evolution of computing</li>
                      <li>AI ethics, bias, fairness</li>
                      <li>Computer Vision, NLP, Neural Networks</li>
                      <li>AI Project Cycle</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <p className="font-semibold text-[#0A1F44] mb-2">Python</p>
                    <ul className="text-[14px] text-slate-600 list-disc pl-4 space-y-1">
                      <li>Python fundamentals</li>
                      <li>Data types &amp; variables</li>
                      <li>Operators</li>
                      <li>Conditional statements</li>
                      <li>Loops and functions</li>
                    </ul>
                  </div>
                </div>
                <p><strong>Assessment:</strong> Minimum 15 assignments covering Robotics, AI and Python.</p>

                <h3 className="text-xl font-bold text-[#0A1F44] mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Class 10 — advancing skills and applications</h3>
                <div className="not-prose grid md:grid-cols-3 gap-4 my-4">
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <p className="font-semibold text-[#0A1F44] mb-2">Robotics</p>
                    <ul className="text-[14px] text-slate-600 list-disc pl-4 space-y-1">
                      <li>New-age robotic systems</li>
                      <li>Drones, autonomous vehicles, healthcare robots</li>
                      <li>Cobots &amp; human-robot interaction</li>
                      <li>Gears, sensors, actuators, controllers</li>
                      <li>Robotic design in Tinkercad</li>
                      <li>Integration of robotic systems</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <p className="font-semibold text-[#0A1F44] mb-2">Artificial Intelligence</p>
                    <ul className="text-[14px] text-slate-600 list-disc pl-4 space-y-1">
                      <li>Machine &amp; computer decision-making</li>
                      <li>Automated &amp; autonomous systems</li>
                      <li>Introduction to Machine Learning</li>
                      <li>Machine intelligence</li>
                      <li>Cybersecurity &amp; AI ethics</li>
                      <li>Advanced AI Project Cycle</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <p className="font-semibold text-[#0A1F44] mb-2">Python</p>
                    <ul className="text-[14px] text-slate-600 list-disc pl-4 space-y-1">
                      <li>Modules &amp; packages</li>
                      <li>NumPy, Pandas, SciPy, Matplotlib</li>
                      <li>Lists, tuples, strings</li>
                    </ul>
                  </div>
                </div>
                <p><strong>Assessment:</strong> Minimum 20 assignments covering Robotics, AI and Python.</p>
              </Section>

              {/* Books */}
              <Section id="books" eyebrow="Resources" title="Books for Class 9 & 10 ICSE Robotics & AI">
                <ol>
                  <li>
                    <strong>OLL</strong> — ICSE Code 66-focused Robotics &amp;
                    AI books for Classes 9 and 10, combining theory with
                    practical activities, Python, AI and robotics projects.
                    Includes lesson plans, videos, assessments and practical
                    kits.{' '}
                    <a href={SHOP_URL} target="_blank" rel="noopener" className="text-[#DC2626] font-semibold hover:underline inline-flex items-center gap-1">
                      Buy from OLL <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </li>
                  <li>
                    <strong>Orange Publication</strong> — Robotics &amp; AI
                    learning books for ICSE students with structured chapters
                    and activities.
                  </li>
                  <li>
                    <strong>KIPPS</strong> — ICSE-focused Robotics &amp; AI
                    resources designed to help students understand concepts
                    and prepare for assessments.
                  </li>
                  <li>
                    <strong>STEMpedia</strong> — Robotics, AI and STEM
                    resources with a practical, project-based approach.
                  </li>
                </ol>
              </Section>

              {/* Teacher select */}
              <Section id="teacher-select" eyebrow="Staffing" title="Selecting the right teacher for Code 66">
                <p><strong>Educational background.</strong></p>
                <ul>
                  <li>Preferably a graduate/postgraduate in Computer Science, IT, Electronics, Engineering, Physics, Mathematics, STEM Education or a related field.</li>
                  <li>Basic understanding of coding, computational thinking, robotics and technology.</li>
                  <li>A formal Robotics/AI degree is <em>not</em> essential if the teacher has the right technical aptitude and willingness to learn.</li>
                </ul>
                <p><strong>Teaching &amp; STEM/Robotics experience.</strong></p>
                <ul>
                  <li>Prior teaching experience in Computer Science, STEM, Robotics, Coding or AI is preferred.</li>
                  <li>Experience conducting practical sessions and projects is an advantage.</li>
                  <li>Comfort with robotics kits, sensors, motors, programming tools and AI-based activities.</li>
                  <li>Ability to explain technical concepts in a simple, student-friendly manner.</li>
                </ul>
                <Callout tone="success" icon={Check} title="No ideal candidate? Train an existing teacher.">
                  Existing Computer Science / Computer / Physics teachers can
                  be up-skilled with structured teacher training, lesson
                  plans, practical activity guides and ongoing academic
                  support — no new hire required.
                </Callout>
              </Section>

              {/* OLL support */}
              <Section id="oll" eyebrow="Full implementation" title="How OLL supports ICSE Robotics & AI implementation">
                <Figure
                  src={BOARD_ASSESSMENT_IMAGE}
                  alt="OLL infographic explaining the ICSE Robotics & AI Board Assessment Format for Subject Code 66. It shows a 100-mark Written Paper and 100-mark Internal Assessment, with internal assessment components including Robotics, Artificial Intelligence, Python Programming, and Report and Presentation."
                  caption="OLL's programme is built around the 100 + 100 board pattern — theory paper, and an internal-assessment stream that keeps Robotics, AI, Python and the final report all covered."
                />
                <p>
                  OLL's ICSE Robotics &amp; AI programme for Classes 9 and 10
                  is an <strong>integrated school solution</strong>, not just
                  a textbook or a hardware package. It brings together:
                </p>
                <ul>
                  <li><strong>ICSE-Aligned Curriculum &amp; Textbooks</strong> — Class 9 &amp; 10 books mapped to Code 66.</li>
                  <li><strong>30+ Hands-on Activities</strong> — practical activities across Robotics, AI and Python.</li>
                  <li><strong>Complete Robotics Kits</strong> — Arduino, sensors, motors and all required hardware.</li>
                  <li><strong>Python, AI &amp; Machine-Learning Projects</strong> — apply Python, AI and ML in real projects.</li>
                  <li><strong>Assessments</strong> — quizzes, assignments, practical assessments and tests.</li>
                  <li><strong>LMS &amp; Progress Tracking</strong> — student-wise progress across the year.</li>
                  <li><strong>Virtual Labs &amp; Online Python IDE</strong> — practise from any computer with internet, no install.</li>
                </ul>
                <Callout tone="info" icon={Award} title="One system, end-to-end">
                  Curriculum, practical learning and internal assessment all
                  run from one place — physical Arduino/sensor work in the
                  lab, digital Python/AI environments in the browser, and a
                  dedicated LMS for the school to track everything.
                </Callout>

                <div className="not-prose my-8 rounded-3xl bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2] border border-red-100 p-8 grid md:grid-cols-[1.2fr_1fr] gap-6 items-center">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-[#DC2626] mb-2">OLL Code 66 Program</p>
                    <h3 className="text-2xl font-bold text-[#0A1F44] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      ICSE Robotics &amp; AI · Class 9 &amp; 10
                    </h3>
                    <p className="text-slate-600 text-[15px] mb-4">
                      A ready-to-run implementation: books, 36-item kits,
                      Python IDE, LMS, assessments and teacher training —
                      all mapped to CISCE Code 66.
                    </p>
                    <Link
                      to={PROGRAM_URL}
                      data-testid="body-cta-program"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-sm transition-colors"
                    >
                      See the Program <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <ul className="text-sm text-slate-700 space-y-2">
                    {[
                      'ICSE-aligned textbooks (9 & 10)',
                      '36-item Robotics & AI Lab Kit',
                      'Virtual Python IDE (browser)',
                      'LMS + student progress tracking',
                      'Lesson plans, videos, worksheets',
                      'Assessments + IA framework',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>

              {/* Results */}
              <Section id="results" eyebrow="Impact" title="Real student results from OLL Code 66">
                <p>
                  OLL students have shown consistent strength in ICSE Robotics
                  &amp; AI, with several scoring 95+ including multiple perfect
                  100/100s.
                </p>
                <h3 className="text-xl font-bold text-[#0A1F44] mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Students who scored 100/100</h3>
                <div className="not-prose overflow-x-auto rounded-2xl border border-slate-200 my-4">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="text-left py-3 px-4">Student</th>
                        <th className="text-left py-3 px-4">School</th>
                        <th className="text-left py-3 px-4">Grade</th>
                        <th className="text-left py-3 px-4">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {[
                        ['Anany Abhay Srivastava', 'N. L. Dalmia High School', 'ICSE X', '100/100'],
                        ['Aashlesha Dhanraj Kotian', 'N. L. Dalmia High School', 'ICSE X', '100/100'],
                        ['Hinesh Komal Nyati', 'N. L. Dalmia High School', 'ICSE IX', '100/100'],
                        ['Ranveer Mukesh Singh', 'N. L. Dalmia High School', 'ICSE IX', '100/100'],
                        ['Krishang Udasi', 'Sanjeevani World School', 'ICSE X', '100/100'],
                      ].map(([n, s, g, r]) => (
                        <tr key={n}>
                          <td className="py-2.5 px-4 font-medium">{n}</td>
                          <td className="py-2.5 px-4">{s}</td>
                          <td className="py-2.5 px-4">{g}</td>
                          <td className="py-2.5 px-4 font-semibold text-emerald-700">{r}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  Complemented by several high scores — Isha Dipen Chokshi
                  (ICSE X · 100), Lakshanya Panwar (ICSE X · 99), Deeveesha
                  Vijay Bhatt (ICSE IX · 99), Mahika Amitkumar Sankhe (ICSE IX ·
                  98), Ayaan Ashish Singh (ICSE IX · 98) — the pattern is not a
                  handful of toppers but a whole cohort clearing 90+.
                </p>
              </Section>

              {/* Schools */}
              <Section id="schools" eyebrow="Adoption" title="Schools already running OLL Code 66">
                <p>
                  Several schools have adopted OLL Code 66 as a{' '}
                  <strong>third-subject option</strong> for ICSE students,
                  bringing Robotics &amp; AI into the regular academic
                  curriculum with kits, teacher resources, assessments and
                  LMS-based learning.
                </p>
                <ul>
                  <li>N. L. Dalmia High School</li>
                  <li>Sanjeevani World School</li>
                  <li>Seven Eleven Scholastic School, ICSE</li>
                  <li>Fravashi International Academy</li>
                  <li>Loretto Convent School, Lucknow</li>
                </ul>
                <p>
                  <strong>Ecosystem at a glance:</strong> 400+ schools,{' '}
                  1,47,500+ students, 35+ cities.
                </p>
              </Section>

              {/* Checklist */}
              <Section id="checklist" eyebrow="Get ready" title="ICSE Robotics & AI readiness checklist for schools">
                <p>Before the academic year begins, make sure your school has clarity on each of these:</p>
                <ul className="not-prose grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[15px] text-slate-700">
                  {[
                    'Student and parent communication',
                    'Curriculum & syllabus mapping / provider selection',
                    'Timetable and instructional hours',
                    'Laboratory infrastructure',
                    'Robotics kits & component availability',
                    'Python environment',
                    'Teacher selection',
                    'Teacher training',
                    'Practical activity plan',
                    'Internal assessment schedule',
                    'Student project documentation',
                    'Examination preparation',
                  ].map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      {it}
                    </li>
                  ))}
                </ul>
                <p>
                  Planning these early keeps the subject from becoming rushed
                  or overly theory-focused later in the year.
                </p>
              </Section>

              {/* Final CTA */}
              <div className="not-prose my-14 rounded-3xl overflow-hidden border border-slate-200 bg-gradient-to-br from-[#0A1F44] to-[#1E3A5F] text-white p-8 md:p-10">
                <p className="text-xs uppercase tracking-widest text-[#FDBA74] font-semibold mb-3">
                  Ready to implement Code 66?
                </p>
                <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Bring OLL's ICSE Robotics &amp; AI to your school.
                </h2>
                <p className="text-white/80 max-w-2xl mb-6">
                  Curriculum, robotics kits, virtual labs, teacher resources
                  and LMS — mapped to CISCE Code 66 and running in 400+ schools.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={PROGRAM_URL}
                    data-testid="footer-cta-program"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold shadow-lg transition-colors"
                  >
                    Explore the OLL Code 66 Program <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href={SHOP_URL}
                    target="_blank"
                    rel="noopener"
                    data-testid="footer-cta-shop"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold transition-colors"
                  >
                    Book a Kit &amp; Curriculum Walkthrough
                  </a>
                </div>
              </div>

              {/* FAQ */}
              <Section id="faq" eyebrow="FAQ" title="Frequently asked questions">
                <div className="not-prose space-y-3">
                  {[
                    ['What is ICSE Robotics and Artificial Intelligence Code 66?', 'Code 66 is the CISCE subject code for Robotics and Artificial Intelligence in ICSE Classes 9 and 10. It combines classroom instruction, lab work and projects across robotic systems, components, motion, AI, data, Python programming and AI project frameworks.'],
                    ['How is ICSE Robotics and AI assessed?', 'Through a two-hour written paper of 100 marks and an internal assessment of 100 marks — theory and practical carry equal weight.'],
                    ['How many assignments are required in Class 9 and Class 10?', 'A minimum of 15 assignments in Class 9 across Robotics (3), AI (2) and Python (10), and a minimum of 20 in Class 10 across Robotics (4), AI (4) and Python (12).'],
                    ['What equipment is needed for an ICSE Robotics and AI lab?', 'Computers with Python, robotics boards such as Arduino, sensors, motors and servos, LEDs and electronic components, wires and breadboards, robotics chassis and mechanical parts, plus simulation or virtual-lab tools.'],
                    ['Does CISCE provide resources for teachers?', 'Yes. The CISCE Primer on Robotics and Artificial Intelligence for Teachers includes suggested activities, assignments and lesson-planning guidance for Classes IX and X.'],
                  ].map(([q, a]) => (
                    <details key={q} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm">
                      <summary className="flex items-center justify-between cursor-pointer text-[16px] font-semibold text-[#0A1F44] list-none">
                        {q}
                        <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
                      </summary>
                      <p className="mt-3 text-slate-600 text-[15px] leading-relaxed">{a}</p>
                    </details>
                  ))}
                </div>
              </Section>
            </article>

            {/* ── Sticky TOC ─────────────────────────────────────── */}
            <aside className="hidden lg:block">
              <div
                className="max-h-[calc(100vh-8rem)] overflow-y-auto pr-1"
                style={{ position: 'sticky', top: '100px' }}
                data-testid="icse-toc-sidebar"
              >
                <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-3">
                  On this page
                </p>
                <nav aria-label="Table of contents" className="border-l border-slate-200 pl-4 space-y-2 text-[14px]">
                  {SECTIONS.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={`block leading-snug transition-colors ${
                        activeId === s.id
                          ? 'text-[#DC2626] font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      data-testid={`icse-toc-${s.id}`}
                    >
                      {s.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </main>

        <div className="bg-white">
          <RelatedBlogsRail exclude="icse-code66-guide" />
        </div>

        <Footer />
      </div>
    </>
  );
};

export default ICSECode66BlogPage;
