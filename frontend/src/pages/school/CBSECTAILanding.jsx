/**
 * CBSE — Computational Thinking & AI (Classes III–VIII) landing funnel.
 *
 * Anchored to CBSE Circular Acad-15/2026 (01 April 2026) which mandates a new
 * Computational Thinking + AI framework for Classes III–VIII effective from
 * the 2026-27 session. Positions OLL as the turnkey partner:
 *  · Interactive books (Grades 3–8 — sample-view placeholders for now)
 *  · Virtual CT & AI Lab (browser games; YouTube demo swap-in later)
 *  · Teacher lesson-plans / PPTs / videos surfaced through OLL LMS
 *
 * Visual language matches the ICSE 9/10 landing:
 *   Zing Rust display, Proxima Nova body, Caveat script,
 *   red primary CTA, deep navy accents, cream/white background.
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Download, ShieldCheck, Trophy, Cpu, Brain, Sparkles,
  CheckCircle2, BookOpen, Users, Gamepad2, PlayCircle, Play,
  Lightbulb, Puzzle, Binary, GraduationCap, School, MapPin, FileText, Rocket, Lock,
} from 'lucide-react';
import Footer from '../../components/Footer';
import LMSSection from '../../components/school/LMSSection';
import SchoolBreadcrumbs from '../../components/school/SchoolBreadcrumbs';
import SchoolRelatedPrograms from '../../components/school/SchoolRelatedPrograms';

const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const OLL_LOGO_WHITE =
  'https://customer-assets.emergentagent.com/job_0add39d8-6ba8-4c9a-b97e-1c8e22260bae/artifacts/bnp5i3h5_OLL-horizontal-logo-white.png';

// "As seen on" media assets — shared with the Beginner landing.
const KBC_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png';
const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
const SHARK_TANK_YT = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT        = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

const MEDIA_LOGOS = [
  { src: '/media-logos/yourstory.svg',       alt: 'YourStory' },
  { src: '/media-logos/sony-tv.svg',         alt: 'Sony Entertainment TV' },
  { src: '/media-logos/hindustan-times.svg', alt: 'Hindustan Times' },
  { src: '/media-logos/times-of-india.svg',  alt: 'The Times of India' },
  { src: '/media-logos/cnbc-tv18.svg',       alt: 'CNBC TV18' },
  { src: '/media-logos/indian-express.svg',  alt: 'The Indian Express' },
  { src: '/media-logos/business-insider.svg', alt: 'Business Insider' },
  { src: '/media-logos/pinkvilla.svg',       alt: 'Pinkvilla' },
];

const TEAM = [
  { name: 'Shreyaan Daga',     role: 'Founder & CEO',          bio: 'Youngest on Shark Tank India, on the Hot Seat of KBC.',            img: '/team/shreyaan.png?v=2' },
  { name: 'Vidushi Daga',      role: 'Chairperson · OLL',      bio: '15+ years in education. Taught over 5 lakh kids across India.',    img: '/team/vidushi.png?v=2' },
  { name: 'Amit Modi',         role: 'IIT Bombay Alumni',      bio: '10+ years in Robotics education for kids across India.',           img: '/team/amit.png?v=2' },
  { name: 'Heather Andersson', role: 'President · UNESCO WGF', bio: '15+ years in education. President, UNESCO World Genesis Foundation.', img: '/team/heather.png?v=2' },
];

const PARTNER_LOGOS = Array.from({ length: 46 }, (_, i) => `/school-logos/${i + 1}.png`);

const SCHOOL_VIDEOS = [
  { name: 'Parle Tilak Vidyalay',            id: 'xHhMLBzB_GU' },
  { name: 'Maneckji Cooper Education Trust', id: 'vOik-WmE_n8' },
  { name: 'Hiranandani Foundation School',   id: 'OnK6oevnLeM' },
  { name: 'TayieBiyah High School',          id: 'dWo2wr02mq4' },
  { name: 'Greenlawns High School',          id: 'YoIu5akBkr0' },
  { name: 'Shree Chandulal Nanavati High',   id: 'r6xeqlTixYE' },
  { name: 'GD Somani School',                id: '5c2gZORdUxc' },
  { name: 'St. Agnes School',                id: 'I0uZ8aIIkwU' },
  { name: 'Sanjeevani World School',         id: 'YeyKFirPot4' },
  { name: 'Dosti Foundation School',         id: 'sqXE6tsUQ6g' },
];

// Reuse existing curriculum brochure until CBSE CT&AI-specific one is ready.
const BROCHURE_PDF =
  'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/4cp6p9fa_OLL%20Curriculum%20Brochure%20-%20ICSE%20Group%203%20Subject%20-%20Code%2066%20Curriculum%20%209th%20-%2010th%20%202026%20%281%29_compressed.pdf';
const BROCHURE_PDF_NAME = 'OLL-CBSE-CT-AI-Curriculum-Brochure.pdf';

// CBSE circular reference (public link included in the circular).
const CBSE_CIRCULAR_URL =
  'https://cbseacademic.nic.in/web_material/CurriculumMain27/CTAI_Pri_2026-27.pdf';

// Book grades — placeholders until real cover art lands.
const BOOK_GRADES = [
  {
    grade: 3, tint: '#FDE68A',
    flipbook: 'https://heyzine.com/flip-book/0cac3d9b13.html',
    cover: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/v94lyklh_WhatsApp%20Image%202026-09-17%20at%2012.42.49.jpeg',
  },
  {
    grade: 4, tint: '#FCA5A5',
    flipbook: 'https://heyzine.com/flip-book/9917b67b4c.html',
    cover: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/vhakayng_WhatsApp%20Image%202026-09-17%20at%2012.42.48.jpeg',
  },
  {
    grade: 5, tint: '#A5F3FC',
    flipbook: 'https://heyzine.com/flip-book/2550968eb2.html',
    cover: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/p1p3y0gd_WhatsApp%20Image%202026-09-17%20at%2012.47.22.jpeg',
  },
  {
    grade: 6, tint: '#C4B5FD',
    flipbook: 'https://heyzine.com/flip-book/9611e996e4.html',
    cover: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/ewifqlkn_WhatsApp%20Image%202026-09-17%20at%2012.47.22%20%281%29.jpeg',
  },
  {
    grade: 7, tint: '#86EFAC',
    flipbook: 'https://heyzine.com/flip-book/18f57cfdcc.html',
    cover: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/2ak773b5_WhatsApp%20Image%202026-09-17%20at%2012.48.42.jpeg',
  },
  {
    grade: 8, tint: '#FDBA74',
    flipbook: 'https://heyzine.com/flip-book/d2604cddf5.html',
    cover: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/ebsfr0fv_WhatsApp%20Image%202026-09-17%20at%2012.48.43.jpeg',
  },
];

const CT_PILLARS = [
  { icon: Puzzle,     title: 'Decomposition',      body: 'Break big problems into small solvable steps — the way engineers actually think.' },
  { icon: Binary,     title: 'Pattern Recognition',body: 'Spot repeating structures across math, science and everyday life to reuse solutions.' },
  { icon: Lightbulb,  title: 'Abstraction',        body: 'Ignore the noise, focus on what really matters — the core of every good model.' },
  { icon: Cpu,        title: 'Algorithms',         body: 'Design clear, step-by-step recipes a human OR a computer can follow to a result.' },
];

const AI_PILLARS = [
  { icon: Brain,      title: 'How AI Learns',      body: 'From training data to predictions — understand ML the way NEP 2020 intended.' },
  { icon: ShieldCheck,title: 'AI Ethics & Bias',   body: 'Fair, safe, responsible use of AI — with age-appropriate real-world case studies.' },
  { icon: Rocket,     title: 'Everyday AI',        body: 'From voice assistants to spam filters — see the AI already around your child.' },
  { icon: Sparkles,   title: 'Creative AI',        body: 'Make images, music and stories with AI — hands-on projects for every unit.' },
];

const TRUST_STATS = [
  { k: '400+',   v: 'Partner Schools' },
  { k: '1.47L+', v: 'Weekly Learners' },
  { k: 'NEP',    v: '2020 Aligned' },
  { k: 'CBSE',   v: 'CT-AI Framework' },
];

// Helper: <meta>/<link>/<script type=ld+json> upsert.
const upsertMeta = (name, content, attr = 'name') => {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute('content', content);
};
const upsertLink = (rel, href, extra = {}) => {
  const selector = `link[rel="${rel}"]${Object.entries(extra).map(([k, v]) => `[${k}="${v}"]`).join('')}`;
  let el = document.head.querySelector(selector);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v)); document.head.appendChild(el); }
  el.setAttribute('href', href);
};
const upsertJsonLd = (id, obj) => {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
  el.textContent = JSON.stringify(obj);
};

const SEO_TITLE = 'CBSE CT & AI Curriculum · Classes 3-8 · Books + Lab + LMS | OLL';
const SEO_DESCRIPTION = 'CBSE-mandated Computational Thinking & AI curriculum for Classes 3-8 (Acad-15/2026). OLL delivers workbooks, a virtual CT & AI lab and teacher LMS. Book a demo.';
const SEO_KEYWORDS = 'CBSE CT AI curriculum, CBSE Computational Thinking Classes 3 to 8, CBSE Artificial Intelligence school program, CBSE Acad-15/2026, NEP 2020 CT AI, CBSE 2026-27 CT AI curriculum, OLL CT AI books, virtual AI lab school, CBSE AI teacher lesson plans, CBSE AI PPT, CT AI framework CBSE primary middle';
const SEO_IMAGE = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/n2zt8acf_OLL%20Curriculum%20Brochure%20-%20ICSE%20Group%203%20Subject%20-%20Code%2066%20Curriculum%20%209th%20-%2010th%20%202026.png';
// Keyword-rich canonical slug. The short `/school/cs/cbse-ct-ai` and `/school/cs/cbse`
// routes still render the same page (see App.js) so any inbound backlinks keep working,
// but Google is told the canonical URL is the long descriptive one for ranking equity.
const CANONICAL_PATH = '/school/cs/computational-thinking-and-ai-classes-3-to-8';

const FAQ_ITEMS = [
  {
    q: 'What does the CBSE Circular Acad-15/2026 say about Computational Thinking and AI?',
    a: 'CBSE Circular Acad-15/2026 (dated 01 April 2026) launches the Curriculum Framework for Computational Thinking (CT) and Artificial Intelligence (AI) for Classes III–VIII, effective from the 2026-27 academic session, in alignment with NEP 2020.',
  },
  {
    q: 'Which classes does the CBSE CT & AI curriculum apply to?',
    a: 'It applies to Classes 3 to 8 in every CBSE-affiliated school, starting session 2026-27.',
  },
  {
    q: 'Does OLL provide books for the new CBSE CT & AI framework?',
    a: 'Yes — OLL provides age-appropriate interactive workbooks for Grades 3, 4, 5, 6, 7 and 8, mapped to the CBSE CT & AI curriculum framework, with activities, coding challenges, everyday-AI stories and reflection prompts.',
  },
  {
    q: 'Is there a virtual lab for CT and AI?',
    a: 'Yes — OLL runs a browser-based virtual lab with decomposition puzzles, pattern detectors, algorithm racers, tiny neural networks and everyday-AI role plays. It works on any school computer with no downloads and adapts difficulty across Grades 3–8.',
  },
  {
    q: 'What support do teachers get?',
    a: 'Teachers get ready-to-teach lesson plans, PPT slide decks, explainer videos, assessments and upskilling paths through the OLL LMS — plus class analytics and live reporting.',
  },
  {
    q: 'How can a school book a demo?',
    a: 'Click "Book a Demo" on this page or download the brochure. Our schools team will run a 30-minute walkthrough covering the framework mapping, books, virtual lab and teacher training.',
  },
];

export default function CBSECTAILanding() {
  const navigate = useNavigate();
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [brochureForm, setBrochureForm] = useState({ school_name: '', phone: '' });
  const [brochureSubmitting, setBrochureSubmitting] = useState(false);
  const [brochureError, setBrochureError] = useState('');
  const [activeBook, setActiveBook] = useState(null);
  const [vlabInView, setVlabInView] = useState(false);
  const vlabRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Autoplay the Virtual Lab video when its section scrolls into view. Muted
  // autoplay is used since browsers block un-muted auto-start; the user can
  // then unmute directly from the YouTube player. Only fires once per visit.
  useEffect(() => {
    const el = vlabRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVlabInView(true);
          io.disconnect();
        }
      });
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Global scroll-reveal for any [data-reveal] element on this page.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const canonicalUrl = `${window.location.origin}${CANONICAL_PATH}`;
    // Core SEO
    document.title = SEO_TITLE;
    document.documentElement.setAttribute('lang', 'en-IN');
    upsertMeta('description', SEO_DESCRIPTION);
    upsertMeta('keywords', SEO_KEYWORDS);
    upsertMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1');
    upsertMeta('author', 'OLL — Skills for All');
    upsertMeta('theme-color', '#0A1F44');
    upsertMeta('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
    // Canonical + hreflang
    upsertLink('canonical', canonicalUrl);
    upsertLink('alternate', canonicalUrl, { hreflang: 'en-in' });
    upsertLink('alternate', canonicalUrl, { hreflang: 'x-default' });
    // Open Graph
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:site_name', 'OLL — Skills for All', 'property');
    upsertMeta('og:title', SEO_TITLE, 'property');
    upsertMeta('og:description', SEO_DESCRIPTION, 'property');
    upsertMeta('og:url', canonicalUrl, 'property');
    upsertMeta('og:image', SEO_IMAGE, 'property');
    upsertMeta('og:image:alt', 'OLL CBSE Computational Thinking & AI curriculum — books, virtual lab, teacher LMS for Classes 3-8', 'property');
    upsertMeta('og:image:width', '1200', 'property');
    upsertMeta('og:image:height', '630', 'property');
    upsertMeta('og:locale', 'en_IN', 'property');
    // Twitter card
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', SEO_TITLE);
    upsertMeta('twitter:description', SEO_DESCRIPTION);
    upsertMeta('twitter:image', SEO_IMAGE);
    upsertMeta('twitter:image:alt', 'OLL CBSE Computational Thinking & AI curriculum preview');
    // JSON-LD · Course + Breadcrumbs + FAQ + Organization
    upsertJsonLd('ld-course-cbse-ctai', {
      '@context': 'https://schema.org', '@type': 'Course',
      name: 'CBSE Computational Thinking & AI Curriculum for Classes 3 to 8',
      description: SEO_DESCRIPTION,
      provider: { '@type': 'Organization', name: 'OLL — Skills for All', sameAs: 'https://oll.co' },
      educationalLevel: 'Classes 3 to 8',
      inLanguage: 'en-IN',
      hasCourseInstance: [{ '@type': 'CourseInstance', courseMode: 'blended', location: 'India' }],
    });
    upsertJsonLd('ld-breadcrumbs-cbse-ctai', {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',    item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Schools', item: `${window.location.origin}/school` },
        { '@type': 'ListItem', position: 3, name: 'CBSE CT & AI', item: canonicalUrl },
      ],
    });
    upsertJsonLd('ld-faq-cbse-ctai', {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    upsertJsonLd('ld-org-cbse-ctai', {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: 'OLL — Skills for All',
      url: 'https://oll.co',
      logo: 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png',
      sameAs: ['https://www.instagram.com/oll.co', 'https://www.linkedin.com/company/oll-co'],
    });
  }, []);

  const goBookDemo = () => navigate('/school?product=cbse-ct-ai&source=cbse-ct-ai-landing');

  const openBrochureModal = (e) => { if (e) e.preventDefault(); setBrochureError(''); setShowBrochureModal(true); };

  const triggerPdfDownload = async () => {
    try {
      const res = await fetch(BROCHURE_PDF, { mode: 'cors' });
      if (!res.ok) throw new Error('fetch-fail');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = BROCHURE_PDF_NAME;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      const a = document.createElement('a');
      a.href = BROCHURE_PDF; a.download = BROCHURE_PDF_NAME;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  };

  const submitBrochureLead = async (e) => {
    e.preventDefault();
    setBrochureError('');
    if (!brochureForm.school_name.trim()) return setBrochureError('School name is required');
    const digits = brochureForm.phone.replace(/\D/g, '');
    if (digits.length < 10) return setBrochureError('Please enter a valid phone number');
    setBrochureSubmitting(true);
    triggerPdfDownload();
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/schools/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: brochureForm.school_name.trim(),
          contact_name: '',
          email: `lead_${digits}@pending.oll.co`,
          phone: brochureForm.phone.trim(),
          selected_offerings: ['CBSE CT & AI (Grades 3–8)'],
          programs_interested: ['Computational Thinking & AI'],
          source: 'cbse-ct-ai-brochure-download',
          notes: 'Lead captured via CBSE CT & AI landing page — Curriculum PDF download gate.',
          assign_option: 'admin',
        }),
      });
    } catch (err) { /* PDF is already downloading — swallow silently */ }
    finally {
      setBrochureSubmitting(false);
      setShowBrochureModal(false);
      setBrochureForm({ school_name: '', phone: '' });
    }
  };

  return (
    <div className="min-h-screen relative icse-page" style={{
      background: 'linear-gradient(180deg, #FFFBF7 0%, #FFFFFF 40%, #F5F8FF 100%)',
      fontFamily: "'Proxima Nova','Montserrat',system-ui,sans-serif",
      color: '#0A1F44',
    }} data-testid="cbse-ct-ai-landing">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;500;600;700;800;900&family=Caveat:wght@400;700&display=swap');
        @font-face {
          font-family: 'Zing Rust';
          src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype');
          font-weight: 400; font-style: normal; font-display: swap;
        }
        .icse-display { font-family: 'Proxima Nova','Montserrat',system-ui,sans-serif; font-weight: 300; letter-spacing: -0.01em; line-height: 1.05; }
        .icse-hero-h  { font-family: 'Zing Rust','Bebas Neue',serif; font-weight: 400; letter-spacing: 0.005em; line-height: 0.95; text-transform: uppercase; }
        .icse-script  { font-family: 'Caveat', cursive; font-weight: 700; letter-spacing: 0; text-transform: none; }
        .icse-light   { font-family: 'Proxima Nova','Montserrat',system-ui,sans-serif; font-weight: 400; }
        .icse-body    { font-family: 'Proxima Nova','Montserrat',system-ui,sans-serif; font-weight: 400; }
        .icse-eyebrow { font-weight: 700; font-size: 0.7rem; letter-spacing: 0.28em; text-transform: uppercase; }
        .icse-btn     { display:inline-flex; align-items:center; gap:8px; padding:14px 26px; border-radius:999px; font-weight:700; font-size:0.82rem; letter-spacing:0.05em; text-transform:uppercase; transition:transform .2s ease, box-shadow .2s ease, background .2s ease; cursor:pointer; text-decoration:none; border:none; }
        .icse-btn.primary { background:#DC2626; color:#fff; box-shadow:0 14px 28px rgba(220,38,38,0.28); }
        .icse-btn.primary:hover { background:#B91C1C; transform:translateY(-1px); }
        .icse-btn.outline { background:#fff; color:#0A1F44; border:1.5px solid #0A1F44; }
        .icse-btn.outline:hover { background:#0A1F44; color:#fff; }
        .icse-btn.ghost   { background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,0.30); }
        .icse-btn.ghost:hover { background:rgba(255,255,255,0.10); }
        .icse-card { background:#fff; border:1px solid #F1E9E1; border-radius:28px; box-shadow: 0 8px 24px rgba(10,31,68,0.06); transition:transform .3s ease, box-shadow .3s ease, border-color .3s ease; }
        .icse-card:hover { transform:translateY(-4px); box-shadow: 0 20px 40px rgba(10,31,68,0.10); border-color:#DC2626; }

        /* ── Alternating navy tint band — wraps entire sections so we get a
           rhythm of white → tinted-blue → white across the page without
           having to invert every child's text color. Left/right radial
           glows sit inside these bands for extra depth. */
        .cbse-band-blue {
          position: relative;
          background:
            radial-gradient(1200px 300px at 15% 0%, rgba(37,99,235,0.10), transparent 60%),
            radial-gradient(1000px 240px at 90% 100%, rgba(59,130,246,0.08), transparent 60%),
            linear-gradient(180deg, #EEF3FB 0%, #F5F8FD 100%);
          overflow: hidden;
        }
        .cbse-band-blue::before {
          content: ''; position: absolute; inset: 0;
          background:
            repeating-linear-gradient(45deg, rgba(30,58,138,0.04) 0 1px, transparent 1px 22px);
          pointer-events: none;
        }
        /* Section divider curve — a subtle wave that separates a blue band
           from a white band above/below. */
        .cbse-band-blue .cbse-band-curve {
          position: absolute; left: 0; right: 0; height: 40px; pointer-events: none;
        }
        .cbse-band-blue .cbse-band-curve.top {
          top: -1px;
          background:
            radial-gradient(ellipse 60% 100% at 50% 100%, #fff 49%, transparent 50%);
        }
        .cbse-band-blue .cbse-band-curve.bottom {
          bottom: -1px;
          background:
            radial-gradient(ellipse 60% 100% at 50% 0%, #fff 49%, transparent 50%);
        }

        /* ── Scroll-reveal — sections slide up + fade in the first time they
           enter the viewport. Coordinated by an IntersectionObserver that
           adds .is-visible to any [data-reveal] element. */
        [data-reveal] {
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.85s cubic-bezier(.22,.9,.34,1), transform 0.85s cubic-bezier(.22,.9,.34,1);
          transition-delay: var(--reveal-delay, 0s);
          will-change: opacity, transform;
        }
        [data-reveal].is-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }
        }

        /* ── Browser-tab chrome wrapping the Virtual Lab video ─────────── */
        .cbse-tab-frame {
          position: relative;
          border-radius: 18px 18px 22px 22px;
          background: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);
          box-shadow:
            0 30px 60px -20px rgba(10,31,68,0.45),
            0 12px 24px -10px rgba(10,31,68,0.25),
            inset 0 1px 0 rgba(255,255,255,0.08);
          overflow: hidden;
        }
        /* Tab strip at the top */
        .cbse-tab-strip {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; background: linear-gradient(180deg, #334155 0%, #1E293B 100%);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cbse-tab-dots { display: inline-flex; gap: 6px; }
        .cbse-tab-dots span { width: 11px; height: 11px; border-radius: 999px; display: inline-block; }
        .cbse-tab-dots .r { background: #EF4444; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15); }
        .cbse-tab-dots .y { background: #F59E0B; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15); }
        .cbse-tab-dots .g { background: #10B981; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15); }
        .cbse-tab-active {
          display: inline-flex; align-items: center; gap: 8px;
          margin-left: 6px; padding: 6px 14px 6px 10px;
          background: #0F172A; color: #E2E8F0; border-radius: 8px 8px 0 0;
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.02em;
          border: 1px solid rgba(255,255,255,0.06); border-bottom: none;
          max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cbse-tab-active .fav {
          width: 14px; height: 14px; border-radius: 3px;
          background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
          display: inline-flex; align-items: center; justify-content: center;
          color: #fff; font-size: 8px; font-weight: 900; flex-shrink: 0;
        }
        .cbse-tab-url {
          flex: 1; margin-left: auto; padding: 6px 14px;
          background: rgba(255,255,255,0.06); color: #94A3B8;
          border-radius: 999px; font-size: 0.7rem; font-family: 'Proxima Nova', system-ui, sans-serif;
          border: 1px solid rgba(255,255,255,0.05);
          display: inline-flex; align-items: center; gap: 8px;
          max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cbse-tab-url .lock { color: #10B981; flex-shrink: 0; }
        .cbse-tab-frame-body {
          position: relative; aspect-ratio: 16 / 9; background: #000;
        }
        @media (max-width: 640px) {
          .cbse-tab-url { display: none; }
          .cbse-tab-active { max-width: 180px; font-size: 0.66rem; }
          .cbse-tab-strip { padding: 8px 10px; }
        }
        .icse-nav-pill { max-width: 1220px; margin: 0 auto; background: rgba(255,255,255,0.98); backdrop-filter: saturate(180%) blur(14px); border: 1px solid rgba(10,31,68,0.08); box-shadow: 0 20px 44px rgba(10,31,68,0.12); border-radius: 999px; display:flex; align-items:center; justify-content: space-between; padding: 8px 14px 8px 18px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .icse-anim-fadeup   { animation: fadeUp .8s cubic-bezier(.22,.9,.34,1) both; }
        .icse-anim-delay-1  { animation-delay: .12s; }
        .icse-anim-delay-2  { animation-delay: .24s; }
        .icse-anim-delay-3  { animation-delay: .36s; }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .icse-anim-float { animation: floatY 6s ease-in-out infinite; }
        .icse-orb-red  { position:absolute; width:400px; height:400px; border-radius:50%; background:rgba(220,38,38,0.14); filter:blur(90px); pointer-events:none; }
        .icse-orb-blue { position:absolute; width:400px; height:400px; border-radius:50%; background:rgba(96,165,250,0.20); filter:blur(90px); pointer-events:none; }
        .icse-orb-gold { position:absolute; width:340px; height:340px; border-radius:50%; background:rgba(245,158,11,0.16); filter:blur(90px); pointer-events:none; }

        /* Book cover placeholder — spiral binding + tape effect */
        /* Book card — natural-height image (no aspect-ratio cropping so the
           top of the cover is never clipped), with Robotics-Beginner-style
           3D perspective wrapper, layered stacked-book shadow, and a subtle
           rotateY flip on hover. Sharp corners on the right, tiny softening
           on the top-right / bottom-right to sell the paper edge. */
        .cbse-book {
          position: relative; display: block; width: 100%;
          background: transparent; border: 0; padding: 0; cursor: pointer;
          perspective: 1400px;
        }
        .cbse-book-inner {
          position: relative;
          transform-style: preserve-3d;
          transform-origin: left center;
          transition: transform .55s cubic-bezier(.2,.8,.2,1), box-shadow .4s ease;
          border-radius: 3px 5px 5px 3px;
          overflow: hidden;
          /* Stacked-book shadow: solid back-cover offsets + ambient + deep drop */
          box-shadow:
            2px 3px 0 rgba(30, 20, 60, 0.18),
            5px 7px 0 rgba(30, 20, 60, 0.10),
            8px 12px 22px rgba(30, 20, 60, 0.18),
            0 30px 48px -14px rgba(30, 20, 60, 0.30);
        }
        .cbse-book:hover .cbse-book-inner {
          transform: rotateY(-22deg) translateZ(14px);
          box-shadow:
            3px 4px 0 rgba(30, 20, 60, 0.22),
            7px 9px 0 rgba(30, 20, 60, 0.12),
            14px 18px 30px rgba(30, 20, 60, 0.24),
            0 36px 60px -14px rgba(220, 38, 38, 0.28);
        }
        .cbse-book-cover-img {
          display: block; width: 100%; height: auto;
          border-radius: 3px 5px 5px 3px;
          backface-visibility: hidden;
        }
        /* Top page-edge glimmer — sells the "physical book" look */
        .cbse-book-inner::after {
          content: ''; position: absolute; top: -2px; left: 2px; right: -1px; height: 2px;
          background: linear-gradient(180deg, #FEFEFE 0%, #E2E8F0 100%);
          border-radius: 2px 2px 0 0;
        }
        /* Fallback (no cover yet) — grade tag + text label rendered on a tinted card */
        .cbse-book-fallback {
          position: relative; aspect-ratio: 3/4; padding: 18px; color: #0A1F44;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .cbse-book-fallback .tape {
          position:absolute; top:14px; right:14px; background:#DC2626; color:#fff;
          font-size:9px; letter-spacing:0.22em; font-weight:900; padding:4px 8px;
          border-radius: 999px; text-transform:uppercase;
        }
        /* Hover / touch reveal pill — floats over the book */
        .cbse-book-reveal {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, calc(-50% + 14px));
          z-index: 4; opacity: 0; transition: opacity 0.28s ease, transform 0.35s cubic-bezier(.22,.9,.34,1);
          display: inline-flex; align-items: center; gap: 8px;
          background: #DC2626; color: #fff; padding: 10px 16px; border-radius: 999px;
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-size: 11px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase;
          box-shadow: 0 12px 28px rgba(220,38,38,0.45); pointer-events: none; white-space: nowrap;
        }
        .cbse-book:hover .cbse-book-reveal { opacity: 1; transform: translate(-50%, -50%); }
        .cbse-book:focus-visible { outline: 3px solid #DC2626; outline-offset: 3px; }
        .cbse-book:focus-visible .cbse-book-reveal { opacity: 1; transform: translate(-50%, -50%); }
        @media (hover: none) {
          .cbse-book-reveal {
            opacity: 0.95; transform: translate(-50%, -50%);
            box-shadow: 0 8px 18px rgba(220,38,38,0.4);
          }
        }

        /* Sticky mobile CTA bar */
        .icse-mobile-cta {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
          padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0));
          display: none;
          gap: 8px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: saturate(180%) blur(14px);
          border-top: 1px solid rgba(10,31,68,0.08);
          box-shadow: 0 -12px 32px rgba(10,31,68,0.10);
        }
        .icse-mobile-cta .icse-btn { flex: 1; justify-content: center; padding: 12px 14px !important; font-size: 0.75rem !important; }

        /* ── Mobile-dynamic tuning (≤640px) ─────────────────────── */
        @media (max-width: 640px) {
          .icse-nav-pill { padding: 6px 10px 6px 12px; }
          .icse-nav-pill img { height: 34px !important; }
          .icse-page { padding-bottom: 84px; }
          .icse-btn { padding: 12px 18px !important; font-size: 0.78rem !important; }
          .icse-btn.primary, .icse-btn.outline, .icse-btn.ghost { min-height: 46px; }
          .icse-hero-h { line-height: 1.02 !important; letter-spacing: -0.01em; }
          .icse-mobile-cta { display: flex; }

          /* Tighter section vertical rhythm on small screens */
          section { padding-top: 3rem !important; padding-bottom: 3rem !important; }
          /* Hero eyebrow chip wraps cleanly */
          [data-testid="cbse-hero"] .icse-eyebrow { font-size: 0.6rem !important; letter-spacing: 0.22em !important; }
          /* Circular highlight card sits BELOW the hero copy — no cramped side-by-side */
          [data-testid="cbse-hero"] > div { gap: 1.5rem !important; }
          /* CT / AI pillar grids never squish */
          [data-testid="cbse-what-ct"] .grid,
          [data-testid="cbse-what-ai"] .grid { grid-template-columns: 1fr !important; }
          /* Speciality summary trio → single column, left-aligned */
          [data-testid="cbse-speciality"] .grid { grid-template-columns: 1fr !important; }
          [data-testid="cbse-speciality"] .icse-card { text-align: left !important; }
          [data-testid="cbse-speciality"] .icse-card > div:first-child { margin-left: 0 !important; }
          /* Books grid — 2 per row (up from cramped 3) */
          [data-testid="cbse-books"] .grid { grid-template-columns: 1fr 1fr !important; }
          /* Book fallback cover (grade tint) — smaller inner text on phones */
          .cbse-book-fallback { padding: 14px !important; }
          .cbse-book-fallback .icse-hero-h { font-size: 1.5rem !important; }
          /* Virtual Lab side-by-side stacks; text card first, then video */
          [data-testid="cbse-virtual-lab"] .grid { grid-template-columns: 1fr !important; }
          [data-testid="cbse-vlab-video"] { aspect-ratio: 16 / 10 !important; }
          /* Trust stats: 2 columns feels better than 4 tiny ones */
          [data-testid="cbse-hero"] .grid-cols-2.sm\\:grid-cols-4 { grid-template-columns: 1fr 1fr !important; }
          /* FAQ card summary is tap-friendly */
          [data-testid="cbse-faq"] summary { min-height: 44px; align-items: center; }
          /* Final CTA display heading shrinks so it doesn't clip on small screens */
          [data-testid="cbse-final-cta"] h2 { font-size: 2rem !important; line-height: 1.1 !important; }
        }
        @media (min-width: 641px) and (max-width: 768px) {
          [data-testid="cbse-books"] .grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      <div className="icse-orb-red"  style={{ top: '-160px', left: '-140px' }} />
      <div className="icse-orb-blue" style={{ top: '20%',    right: '-140px' }} />
      <div className="icse-orb-gold" style={{ bottom: '30%', left: '-100px' }} />

      {/* ── Sticky pill nav ─────────────────────────────────────────── */}
      <nav className="fixed top-3 left-0 right-0 z-50 px-3 hidden sm:block" data-testid="cbse-nav" aria-label="Primary">
        <div className="icse-nav-pill">
          <a href="/" className="flex items-center gap-3" aria-label="OLL home">
            <img src={OLL_LOGO_COLOR} alt="OLL — Skills for All logo · CBSE CT & AI curriculum partner" className="h-9 sm:h-10 w-auto" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-[#0A1F44] border-l border-slate-200 pl-3 leading-tight">
              CBSE · Classes 3–8<br/>CT &amp; AI Curriculum
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openBrochureModal}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0A1F44] px-3 py-2 rounded-full hover:bg-slate-100 transition"
              data-testid="cbse-nav-brochure">
              <Download className="w-3.5 h-3.5" /> Download Brochure
            </button>
            <button onClick={goBookDemo} className="icse-btn primary" style={{ padding: '10px 20px', fontSize: '0.72rem' }} data-testid="cbse-nav-cta">
              Book a Demo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Visible breadcrumb trail (also emits BreadcrumbList JSON-LD) ── */}
      <div style={{ paddingTop: 'clamp(2.5rem, 8vw, 5.5rem)' }}>
        <SchoolBreadcrumbs
          testid="cbse-breadcrumbs"
          schemaId="ld-breadcrumbs-cbse-ctai"
          items={[
            { label: 'Home', href: '/' },
            { label: 'For Schools', href: '/school' },
            { label: 'Computer Science', href: '/school#computer-science' },
            { label: 'CBSE · CT & AI (Classes 3-8)' },
          ]}
        />
      </div>

      {/* ══════════ SECTION 1 · HERO ══════════ */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-10" data-testid="cbse-hero">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/90 border border-rose-200 rounded-full px-3 py-1.5 shadow-sm icse-anim-fadeup">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              <span className="icse-eyebrow text-rose-700">CBSE Circular Acad-15/2026 · Session 2026-27</span>
            </div>
            <h1 className="icse-hero-h mt-5 text-[#0A1F44] icse-anim-fadeup icse-anim-delay-1" style={{ fontSize: 'clamp(1.85rem, 6.2vw, 4rem)' }}>
              CBSE has mandated a{' '}
              <span style={{ color: '#DC2626' }}>New Subject</span>.
              <br/>
              Still confused about <span style={{ color: '#DC2626' }}>CT &amp; AI</span>?
              <br/>
              <span className="icse-script text-[#0A1F44]" style={{ fontSize: 'clamp(1.4rem, 4.5vw, 2.6rem)', textTransform: 'none' }}>
                let us guide you.
              </span>
            </h1>
            <p className="icse-light mt-6 text-slate-700 text-base sm:text-lg max-w-xl icse-anim-fadeup icse-anim-delay-2">
              Under NEP 2020, CBSE has launched a dedicated <strong className="text-[#0A1F44] font-bold">Computational Thinking + Artificial Intelligence</strong> framework
              for <strong className="text-[#0A1F44] font-bold">Classes 3 to 8</strong> effective 2026-27. OLL is your turnkey partner —
              interactive books, a virtual CT&amp;AI lab, and teacher-ready lesson plans on our LMS.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 icse-anim-fadeup icse-anim-delay-3">
              <button onClick={goBookDemo} className="icse-btn primary" data-testid="cbse-hero-cta">
                Book a School Demo <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={openBrochureModal} className="icse-btn outline" data-testid="cbse-hero-download">
                <Download className="w-4 h-4" /> Download Brochure
              </button>
            </div>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TRUST_STATS.map((s) => (
                <div key={s.v} className="bg-white/80 border border-slate-100 rounded-2xl px-3 py-3 text-center">
                  <div className="icse-display text-2xl text-[#0A1F44]">{s.k}</div>
                  <div className="icse-eyebrow text-slate-500 mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="relative bg-white rounded-[32px] border border-slate-100 shadow-xl p-6 sm:p-8 icse-anim-float">
              <div className="absolute -top-3 -right-3 bg-[#DC2626] text-white rounded-full text-[10px] font-black uppercase tracking-widest px-3 py-1.5 shadow-lg">
                Mandatory · 2026-27
              </div>
              <div className="icse-script text-[#DC2626] text-2xl">circular highlights</div>
              <div className="icse-display text-[#0A1F44] text-2xl sm:text-3xl mt-1">What CBSE actually said</div>
              <ul className="mt-5 space-y-3 icse-light text-sm text-slate-700">
                {[
                  'Classes III–VIII must adopt the new CT + AI framework from session 2026-27.',
                  'Focus: logical reasoning, problem solving, pattern recognition, algorithmic thinking.',
                  'Build AI-ready learners — everyday AI, ethics, creativity, cross-subject integration.',
                  'Aligned to NEP 2020 and the National Curriculum for School Education.',
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <a href={CBSE_CIRCULAR_URL} target="_blank" rel="noopener noreferrer"
                 className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#DC2626] hover:text-[#B91C1C]"
                 data-testid="cbse-hero-circular-link">
                Read CBSE Circular Acad-15/2026 <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 2 · WHAT IS CT & AI ══════════ */}
      <div className="cbse-band-blue" data-reveal>
        <span className="cbse-band-curve top" aria-hidden="true" />
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="cbse-what" aria-labelledby="cbse-what-heading">
        <div className="text-center">
          <div className="icse-script text-[#DC2626] text-3xl">the basics, decoded</div>
          <h2 id="cbse-what-heading" className="icse-display text-[#0A1F44] text-4xl sm:text-5xl mt-1">What is CT &amp; AI?</h2>
          <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-4">
            Computational Thinking is <em>how</em> a mind solves problems the way a computer scientist would.
            Artificial Intelligence is <em>what</em> happens when we teach machines to think along with us.
            Together they are the foundation your students need for the next decade.
          </p>
        </div>

        {/* CT + AI two-column card block */}
        <div className="grid lg:grid-cols-2 gap-6 mt-12">
          <div className="icse-card p-6 sm:p-8" data-testid="cbse-what-ct">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#DC2626,#F97316)' }}>
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="icse-eyebrow text-rose-600">Computational Thinking</div>
                <div className="icse-display text-[#0A1F44] text-2xl">Think like a problem-solver</div>
              </div>
            </div>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {CT_PILLARS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                  <div className="w-9 h-9 rounded-xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="icse-display text-[#0A1F44] text-base">{title}</div>
                  <div className="icse-light text-xs text-slate-600 mt-1.5 leading-relaxed">{body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="icse-card p-6 sm:p-8" data-testid="cbse-what-ai">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0A1F44,#3B82F6)' }}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="icse-eyebrow text-blue-600">Artificial Intelligence</div>
                <div className="icse-display text-[#0A1F44] text-2xl">Understand the AI around you</div>
              </div>
            </div>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {AI_PILLARS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="icse-display text-[#0A1F44] text-base">{title}</div>
                  <div className="icse-light text-xs text-slate-600 mt-1.5 leading-relaxed">{body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
        <span className="cbse-band-curve bottom" aria-hidden="true" />
      </div>

      {/* ══════════ SECTION 3 · OLL'S SPECIALITY ══════════ */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="cbse-speciality" aria-labelledby="cbse-speciality-heading">
        <div className="text-center" data-reveal>
          <div className="icse-script text-[#DC2626] text-3xl">why oll</div>
          <h2 id="cbse-speciality-heading" className="icse-display text-[#0A1F44] text-4xl sm:text-5xl mt-1">OLL's Speciality</h2>
          <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-4">
            Everything a CBSE-affiliated school needs to roll out the new CT &amp; AI framework — books,
            virtual games, and teacher-ready lesson plans — under one login.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {[
            { icon: BookOpen, title: 'Interactive Books · Grades 3-8', body: 'Bright, activity-first workbooks aligned to CBSE\'s CT + AI framework — 6 grades, one continuous learning arc.' },
            { icon: Gamepad2, title: 'Virtual Lab for CT & AI',       body: 'Browser-based games and simulations to sharpen logical reasoning, pattern recognition and algorithmic thinking — no downloads.' },
            { icon: GraduationCap, title: 'Teacher Lesson Plans, PPTs & Videos', body: 'Ready-to-teach LMS with lesson plans, slide decks, videos, quizzes, upskilling and analytics for every teacher.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="icse-card p-6 sm:p-7 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0A1F44,#DC2626)' }}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="icse-display text-[#0A1F44] text-xl mt-4">{title}</div>
              <div className="icse-light text-sm text-slate-600 mt-2">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3a · Interactive Books Grades 3-8 ─────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="cbse-books" aria-labelledby="cbse-books-heading">
        <div className="mb-10 text-center sm:text-left" data-reveal>
          <div className="icse-eyebrow text-rose-600">Speciality · 01</div>
          <div className="icse-script text-[#DC2626] text-3xl">learn by doing</div>
          <h3 id="cbse-books-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Interactive Books · Grades 3 to 8</h3>
          <p className="icse-light text-slate-600 mt-3 max-w-2xl mx-auto sm:mx-0">
            A grade-by-grade learning arc — every book packed with age-appropriate activities, coding challenges,
            real-world AI stories and reflection prompts. Tap any grade to flip through the actual sample book right here.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
          {BOOK_GRADES.map(({ grade, tint, cover }) => (
            <div key={grade} className="group" data-testid={`cbse-book-grade-${grade}`}>
              <button
                type="button"
                onClick={() => setActiveBook(grade)}
                aria-label={`Open Grade ${grade} CT & AI sample book`}
                className="cbse-book"
                data-testid={`cbse-book-card-${grade}`}
              >
                <div className="cbse-book-inner">
                  {cover ? (
                    <img
                      src={cover}
                      alt={`OLL CBSE Grade ${grade} Computational Thinking & AI workbook cover`}
                      loading="lazy"
                      className="cbse-book-cover-img"
                      data-testid={`cbse-book-cover-${grade}`}
                    />
                  ) : (
                    <div
                      className="cbse-book-fallback"
                      style={{ background: `linear-gradient(155deg, ${tint} 0%, #fff 100%)` }}
                    >
                      <span className="tape">CBSE · CT+AI</span>
                      <div className="mt-8">
                        <div className="icse-eyebrow text-[#0A1F44]/80">OLL Workbook</div>
                        <div className="icse-hero-h text-[#0A1F44] leading-none" style={{ fontSize: '2rem' }}>Grade {grade}</div>
                      </div>
                      <div>
                        <div className="icse-light text-[11px] text-[#0A1F44]/80 leading-snug">Computational Thinking + AI · Aligned to CBSE Acad-15/2026</div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Hover / touch reveal pill — floats over the book */}
                <span className="cbse-book-reveal" aria-hidden="true">
                  <PlayCircle className="w-3.5 h-3.5" /> View Sample
                </span>
              </button>
              <button
                onClick={() => setActiveBook(grade)}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#DC2626] hover:text-[#B91C1C]"
                data-testid={`cbse-book-sample-${grade}`}
              >
                <PlayCircle className="w-3.5 h-3.5" /> View Sample
              </button>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] icse-light text-slate-400 mt-6 uppercase tracking-widest">
          Live sample flipbooks · Powered by OLL · Grades 3-8
        </p>
      </section>

      {/* ── 3b · Virtual Lab for CT & AI ──────────────────────────── */}
      <div className="cbse-band-blue" data-reveal>
        <span className="cbse-band-curve top" aria-hidden="true" />
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="cbse-virtual-lab" aria-labelledby="cbse-vlab-heading">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 items-center">
          <div data-reveal>
            <div className="icse-eyebrow text-rose-600">Speciality · 02</div>
            <div className="icse-script text-[#DC2626] text-3xl">play → practise → master</div>
            <h3 id="cbse-vlab-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Virtual Lab for CT &amp; AI</h3>
            <p className="icse-light text-slate-600 mt-4">
              A browser-first playground of games and simulations that sharpen your child's cognitive thinking.
              Every activity maps to a CT / AI concept from the CBSE framework — decomposition puzzles, pattern
              detectors, algorithm racers, tiny neural networks and everyday-AI role plays.
            </p>
            <ul className="mt-5 space-y-2.5 icse-light text-sm text-slate-700">
              {[
                'No downloads — runs in-browser, on any school computer.',
                'Auto-difficulty tuning: each game adapts to Grade 3 through Grade 8.',
                'Progress and time-on-task flow to the teacher dashboard live.',
              ].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /><span>{t}</span></li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={goBookDemo} className="icse-btn primary" data-testid="cbse-vlab-cta">
                See the Lab Live <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Real YouTube walkthrough in a browser-tab chrome. Autoplay
              (muted) kicks in the moment the section scrolls into view. */}
          <div className="relative" ref={vlabRef}>
            <div className="cbse-tab-frame" data-testid="cbse-vlab-video">
              <div className="cbse-tab-strip">
                <span className="cbse-tab-dots" aria-hidden="true">
                  <span className="r" /><span className="y" /><span className="g" />
                </span>
                <span className="cbse-tab-active">
                  <span className="fav" aria-hidden="true">CT</span>
                  OLL · CT &amp; AI Virtual Lab
                </span>
                <span className="cbse-tab-url">
                  <Lock size={11} className="lock" />
                  oll.co/virtual-lab/ct-ai
                </span>
              </div>
              <div className="cbse-tab-frame-body">
                <iframe
                  src={`https://www.youtube.com/embed/10Jjn613V14?rel=0&modestbranding=1&playsinline=1${vlabInView ? '&autoplay=1&mute=1' : ''}`}
                  title="OLL CT & AI Virtual Lab — sample game walkthrough"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                  data-testid="cbse-vlab-iframe"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
        <span className="cbse-band-curve bottom" aria-hidden="true" />
      </div>

      {/* ── 3c · Teacher Lesson Plans / PPTs / Videos via LMS ─────── */}
      <section data-testid="cbse-lms-wrapper" aria-labelledby="cbse-lms-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 -mb-6 sm:-mb-10 relative z-[1] text-center">
          <div className="icse-eyebrow text-rose-600">Speciality · 03</div>
          <div className="icse-script text-[#DC2626] text-3xl">everything a teacher needs</div>
          <h3 id="cbse-lms-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Teacher Lesson Plans, PPTs &amp; Videos</h3>
          <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-3">
            Ready-to-teach modules — every lesson comes with slide decks, videos, activities,
            assessments and upskilling paths. All powered by OLL's LMS.
          </p>
        </div>
        <LMSSection
          scriptClass="icse-script"
          displayClass="icse-display"
          lightClass="icse-light"
          testid="cbse-lms"
          hideHeading
        />
      </section>

      {/* ══════════ FAQ (schema-backed) ══════════ */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16" data-testid="cbse-faq" aria-labelledby="cbse-faq-heading">
        <div className="text-center">
          <div className="icse-script text-[#DC2626] text-3xl">good to know</div>
          <h2 id="cbse-faq-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Frequently asked questions</h2>
        </div>
        <div className="mt-8 space-y-3">
          {FAQ_ITEMS.map((f, i) => (
            <details key={f.q} className="icse-card p-5 sm:p-6 group cursor-pointer" data-testid={`cbse-faq-item-${i}`}>
              <summary className="flex items-start justify-between gap-4 list-none cursor-pointer">
                <span className="icse-display text-[#0A1F44] text-base sm:text-lg pr-2">{f.q}</span>
                <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-[#DC2626] font-bold group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="icse-light text-sm text-slate-600 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="cbse-final-cta">
        <div className="relative rounded-[36px] overflow-hidden p-8 sm:p-14 text-center" style={{
          background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)',
        }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#DC2626]/40 blur-3xl" />
          <div className="absolute -bottom-14 -left-16 w-64 h-64 rounded-full bg-[#3B82F6]/25 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#DC2626]" />
              <span className="icse-eyebrow text-white/90">30-min demo · Books · Virtual Lab · LMS</span>
            </div>
            <div className="icse-script text-[#DC2626] text-3xl mt-4">let's talk</div>
            <h2 className="icse-display text-white text-4xl sm:text-6xl mt-1">Bring CBSE CT &amp; AI to your school.</h2>
            <p className="icse-light text-white/80 mt-4 max-w-2xl mx-auto">
              Our schools team will walk you through the framework mapping, books, virtual lab and teacher
              training — everything you need to be 2026-27 ready in one 30-minute session.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <button onClick={goBookDemo} className="icse-btn primary" data-testid="cbse-final-cta-btn">
                Book a School Demo <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={openBrochureModal} className="icse-btn ghost">
                <Download className="w-4 h-4" /> Download Brochure
              </button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-white/70 text-xs icse-light">
              <CheckCircle2 className="w-3.5 h-3.5" /> No commitment · No cost · Just answers.
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ ABOUT US · full narrative ══════════ */}
      <section data-testid="cbse-about-oll" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)', color: '#fff', overflow: 'hidden' }} aria-labelledby="cbse-about-heading">
        <div className="icse-orb-red"  style={{ width: 420, height: 420, top: -140, left: '10%' }} />
        <div className="icse-orb-blue" style={{ width: 380, height: 380, bottom: -140, right: '10%' }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="icse-script" style={{ color: '#FCA5A5', fontSize: '1.8rem' }}>about us</div>
            <img src={OLL_LOGO_WHITE} alt="OLL — Skills for All" style={{ height: 90, margin: '1rem auto 1.5rem', display: 'block' }} data-testid="cbse-oll-logo-big" />
            <h2 id="cbse-about-heading" className="icse-display" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05 }}>
              Trusted by schools <span style={{ color: '#FCA5A5' }}>across India.</span>
            </h2>

            {/* Quick stat pills — school / student / city counts */}
            <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              {[
                { i: School,        k: '500+',      l: 'Schools',  c: '#DC2626' },
                { i: GraduationCap, k: '2,00,000+', l: 'Students', c: '#60A5FA' },
                { i: MapPin,        k: '35',        l: 'Cities',   c: '#FBBF24' },
              ].map((s) => (
                <div key={s.l} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', padding: '0.65rem 1.1rem', borderRadius: 999, backdropFilter: 'blur(8px)' }}>
                  <s.i size={20} style={{ color: s.c }} />
                  <span className="icse-display" style={{ fontSize: '1.25rem', color: '#fff' }}>{s.k}</span>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{s.l}</span>
                </div>
              ))}
            </div>

            {/* Team card row */}
            <div style={{ marginTop: '3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1.5rem', padding: '2rem 1.5rem', backdropFilter: 'blur(10px)' }} data-testid="cbse-team">
              <div className="icse-script" style={{ color: '#FCA5A5', fontSize: '1.2rem', marginBottom: '0.35rem' }}>meet the team</div>
              <h3 className="icse-display" style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 600, marginBottom: '1.5rem' }}>The people behind OLL.</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                {TEAM.map((m) => (
                  <div key={m.name} style={{ textAlign: 'center', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>
                    <div style={{ width: 140, height: 140, borderRadius: '50%', margin: '0 auto', overflow: 'hidden', background: '#FFFFFF', border: '3px solid #FBBF24', boxShadow: '0 20px 40px rgba(0,0,0,0.35), 0 0 0 6px rgba(251,191,36,0.18)' }}>
                      <img src={m.img} alt={`${m.name} — ${m.role}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '1.05rem', color: '#fff', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{m.name}</div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: '#FCA5A5', fontWeight: 600 }}>{m.role}</div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.78)', fontWeight: 300, lineHeight: 1.5 }}>{m.bio}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* As seen on — KBC + Shark Tank */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <a href={KBC_YT} target="_blank" rel="noreferrer" data-testid="cbse-media-kbc"
              style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 260, border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none', display: 'block', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
              aria-label="Watch OLL on Kaun Banega Crorepati">
              <img src={KBC_IMG} alt="OLL featured on Sony's Kaun Banega Crorepati" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.92) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 18, right: 18, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 999, background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)', color: '#fff', fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', boxShadow: '0 14px 28px rgba(220,38,38,0.5)', border: '2px solid rgba(255,255,255,0.55)' }}>
                <Play size={13} fill="#fff" strokeWidth={0} /> Watch
              </div>
              <div style={{ position: 'absolute', left: 20, bottom: 20, right: 100 }}>
                <div style={{ fontSize: '0.7rem', color: '#FCA5A5', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sony · KBC</div>
                <div className="icse-display" style={{ fontSize: '1.35rem', color: '#fff', marginTop: 4 }}>Kaun Banega Crorepati</div>
                <div className="icse-light" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Featured as India&apos;s leading EdTech for kids</div>
              </div>
            </a>

            <a href={SHARK_TANK_YT} target="_blank" rel="noreferrer" data-testid="cbse-media-shark-tank"
              style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 260, border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none', display: 'block', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
              aria-label="Watch OLL on Shark Tank India">
              <img src={SHARK_TANK_IMG} alt="OLL pitched on Shark Tank India season finale" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.92) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 18, right: 18, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 999, background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)', color: '#fff', fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', boxShadow: '0 14px 28px rgba(220,38,38,0.5)', border: '2px solid rgba(255,255,255,0.55)' }}>
                <Play size={13} fill="#fff" strokeWidth={0} /> Watch
              </div>
              <div style={{ position: 'absolute', left: 20, bottom: 20, right: 100 }}>
                <div style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sony LIV · Season Finale</div>
                <div className="icse-display" style={{ fontSize: '1.35rem', color: '#fff', marginTop: 4 }}>Shark Tank India</div>
                <div className="icse-light" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Pitched to India&apos;s top investors on national TV</div>
              </div>
            </a>
          </div>

          {/* Media houses infinite scroll ticker */}
          <div data-testid="cbse-media-logos" style={{ marginBottom: '0.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.9rem' }}>
              <span style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(252,165,165,0.85)' }}>
                // Also covered by
              </span>
            </div>
            <style>{`
              @keyframes cbse-logo-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
              .cbse-logos-wrap { position: relative; overflow: hidden; padding: 8px 0; mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); }
              .cbse-logos-track { display: inline-flex; gap: 3.25rem; padding: 0 1.5rem; align-items: center; animation: cbse-logo-scroll 38s linear infinite; will-change: transform; width: max-content; }
              .cbse-logos-track:hover { animation-play-state: paused; }
              .cbse-logo-item { flex-shrink: 0; height: 44px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.88; filter: brightness(0) invert(1); transition: opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease; }
              .cbse-logo-item img { max-height: 44px; max-width: 170px; height: auto; width: auto; display: block; object-fit: contain; }
              .cbse-logo-item:hover { opacity: 1; filter: none; transform: scale(1.06); }
            `}</style>
            <div className="cbse-logos-wrap">
              <div className="cbse-logos-track">
                {[...MEDIA_LOGOS, ...MEDIA_LOGOS].map((l, i) => (
                  <div key={`${l.alt}-${i}`} className="cbse-logo-item">
                    <img src={l.src} alt={l.alt} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SCHOOLS WE WORK WITH ══════════ */}
      <section data-testid="cbse-schools-with" style={{ position: 'relative', padding: '5rem 1.25rem 3rem', background: '#F8FAFC', overflow: 'hidden' }} aria-labelledby="cbse-schools-heading">
        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="icse-script" style={{ color: '#DC2626', fontSize: '1.6rem' }}>proof, not promises</div>
            <h2 id="cbse-schools-heading" className="icse-display" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Schools we work with.
            </h2>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', maxWidth: 640, margin: '0.9rem auto 0', color: '#475569', lineHeight: 1.6 }}>
              Real classrooms. Real projects. Real principals telling the story in their own words.
            </p>
          </div>

          {/* Auto-scrolling YouTube video marquee */}
          <style>{`
            @keyframes cbse-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .cbse-marquee-wrap { position: relative; overflow: hidden; padding: 10px 0; mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); }
            .cbse-marquee-track { display: inline-flex; gap: 1.25rem; align-items: stretch; animation: cbse-marquee 60s linear infinite; will-change: transform; width: max-content; }
            .cbse-marquee-track:hover { animation-play-state: paused; }
            .cbse-vid-card { flex-shrink: 0; min-width: 290px; max-width: 290px; background: #0A1F44; border-radius: 1rem; overflow: hidden; text-decoration: none; box-shadow: 0 10px 24px rgba(10,31,68,0.18); transition: transform 0.3s ease, box-shadow 0.3s ease; }
            .cbse-vid-card:hover { transform: translateY(-3px); box-shadow: 0 18px 36px rgba(10,31,68,0.28); }
            .cbse-vid-thumb { position: relative; aspect-ratio: 16/9; overflow: hidden; }
            .cbse-vid-thumb img { width: 100%; height: 100%; object-fit: cover; }
            .cbse-vid-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.55) 100%); color: #fff; }
            .cbse-logos-inner { display: inline-flex; gap: 2rem; align-items: center; animation: cbse-marquee 55s linear infinite; will-change: transform; width: max-content; }
            .cbse-logos-inner:hover { animation-play-state: paused; }
            @media (max-width: 640px) {
              .cbse-vid-card { min-width: 240px !important; max-width: 240px !important; }
            }
          `}</style>
          <div className="cbse-marquee-wrap" data-testid="cbse-videos-scroll">
            <div className="cbse-marquee-track">
              {[...SCHOOL_VIDEOS, ...SCHOOL_VIDEOS].map((v, i) => (
                <a key={`${v.id}-${i}`} href={`https://youtu.be/${v.id}`} target="_blank" rel="noreferrer" className="cbse-vid-card"
                   aria-label={`Watch ${v.name} case study on YouTube`}
                   data-testid={i < SCHOOL_VIDEOS.length ? `cbse-video-${v.id}` : undefined}>
                  <div className="cbse-vid-thumb">
                    <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt={`${v.name} — OLL school case study`} loading="lazy" />
                    <div className="cbse-vid-play"><PlayCircle size={32} fill="rgba(255,255,255,0.15)" /></div>
                  </div>
                  <div style={{ padding: '0.9rem 1.1rem', color: '#fff', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>{v.name}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Rolling logo bar */}
          <div style={{ marginTop: '3rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontSize: '0.78rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#94A3B8' }}>
              A few of our partner schools
            </div>
            <div className="cbse-marquee-wrap">
              <div className="cbse-logos-inner">
                {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((src, i) => (
                  <div key={i} style={{ minWidth: 150, height: 90, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', boxShadow: '0 4px 12px rgba(15,30,80,0.05)' }}>
                    <img src={src} alt="OLL partner school" loading="lazy" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SchoolRelatedPrograms current="cbse-ct-ai" theme="light" testid="cbse-related-programs" />

      <Footer />

      {/* ── Mobile sticky CTA ─────────────────────────────────────── */}
      <div className="icse-mobile-cta" data-testid="cbse-mobile-cta">
        <button type="button" onClick={openBrochureModal} className="icse-btn outline" data-testid="cbse-mobile-cta-brochure">
          <Download className="w-3.5 h-3.5" /> Brochure
        </button>
        <button onClick={goBookDemo} className="icse-btn primary" data-testid="cbse-mobile-cta-demo">
          Book a Demo <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Sample Book flipbook lightbox — embeds the real Heyzine sample per grade ── */}
      {activeBook !== null && (() => {
        const active = BOOK_GRADES.find((b) => b.grade === activeBook);
        const flipUrl = active?.flipbook;
        return (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm"
            data-testid="cbse-sample-modal"
            onClick={() => setActiveBook(null)}
          >
            <div
              className="relative w-full max-w-6xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ height: 'min(92vh, 900px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)' }}
              >
                <div className="min-w-0">
                  <div className="icse-script text-[#FCA5A5] text-lg sm:text-2xl leading-none">sample book</div>
                  <h3 className="icse-display text-white text-base sm:text-2xl mt-1 truncate">
                    Grade {activeBook} · CT &amp; AI Workbook
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <a
                    href={flipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/80 hover:text-white px-3 py-2 rounded-full border border-white/20 hover:border-white/40 transition"
                    data-testid={`cbse-sample-open-new-${activeBook}`}
                  >
                    Open in new tab
                  </a>
                  <button
                    onClick={() => { setActiveBook(null); goBookDemo(); }}
                    className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-[#DC2626] hover:bg-[#B91C1C] text-white px-3 py-2 rounded-full transition"
                    data-testid="cbse-sample-demo"
                  >
                    Book a Demo <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveBook(null)}
                    aria-label="Close sample book"
                    className="w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition text-lg font-bold"
                    data-testid="cbse-sample-close"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Flipbook iframe */}
              <div className="relative flex-1 bg-slate-100 min-h-0">
                {flipUrl ? (
                  <iframe
                    key={flipUrl}
                    src={flipUrl}
                    title={`Grade ${activeBook} CT & AI sample book`}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="fullscreen; autoplay; clipboard-write"
                    allowFullScreen
                    loading="lazy"
                    data-testid={`cbse-sample-frame-${activeBook}`}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 icse-light text-sm px-6 text-center">
                    Sample not available for this grade yet. Please book a demo — our team will walk you through the full book live.
                  </div>
                )}
              </div>

              {/* Mobile footer actions (hidden on desktop where they're in the header) */}
              <div className="sm:hidden flex gap-2 p-3 border-t border-slate-200 bg-white flex-shrink-0">
                <a
                  href={flipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icse-btn outline flex-1 justify-center text-xs"
                  data-testid={`cbse-sample-open-new-mobile-${activeBook}`}
                >
                  Open Full Screen
                </a>
                <button
                  onClick={() => { setActiveBook(null); goBookDemo(); }}
                  className="icse-btn primary flex-1 justify-center text-xs"
                  data-testid="cbse-sample-demo-mobile"
                >
                  Book a Demo <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Brochure Lead-Capture Modal ───────────────────────────── */}
      {showBrochureModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" data-testid="cbse-brochure-modal" onClick={() => setShowBrochureModal(false)}>
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)' }}>
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#DC2626]" />
                <span className="icse-eyebrow text-white/80">One quick step</span>
              </div>
              <div className="icse-script text-[#DC2626] text-2xl mt-2">get the full brochure</div>
              <h3 className="icse-display text-white text-2xl sm:text-3xl mt-1">Where should we send the CBSE CT &amp; AI curriculum?</h3>
              <p className="icse-light text-white/70 text-sm mt-2">Enter your school name and phone number — we'll open the PDF and a schools-team advisor will reach out with a demo slot.</p>
            </div>
            <form onSubmit={submitBrochureLead} className="p-6 sm:p-8 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">School Name *</label>
                <input type="text" required autoFocus value={brochureForm.school_name}
                  onChange={(e) => setBrochureForm({ ...brochureForm, school_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 icse-body text-slate-800"
                  placeholder="e.g., Delhi Public School" data-testid="cbse-brochure-school" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Contact Phone Number *</label>
                <input type="tel" required value={brochureForm.phone}
                  onChange={(e) => setBrochureForm({ ...brochureForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 icse-body text-slate-800"
                  placeholder="+91 98XXXXXXXX" data-testid="cbse-brochure-phone" />
              </div>
              {brochureError && <div className="text-sm text-[#DC2626] font-bold">{brochureError}</div>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowBrochureModal(false)} className="icse-btn outline flex-1 justify-center" data-testid="cbse-brochure-cancel">Cancel</button>
                <button type="submit" disabled={brochureSubmitting} className="icse-btn primary flex-1 justify-center" data-testid="cbse-brochure-submit">
                  {brochureSubmitting ? 'Sending…' : (<>Download PDF <Download className="w-4 h-4" /></>)}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 icse-light text-center pt-1">We'll never spam. One-time contact from OLL's schools team.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
