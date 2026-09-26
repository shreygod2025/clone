/**
 * Future Skills — ICT, Coding, AI & Robotics · 4-in-1 landing funnel.
 *
 * Shared component rendered for both:
 *   `/school/cs/future-skills-icse`  (board="ICSE")
 *   `/school/cs/future-skills-cbse`  (board="CBSE")
 *
 * Storyline the page walks a school leader through:
 *   1. Pain — 4 subjects (ICT + Coding + AI + Robotics) = timetable chaos,
 *      book burden, extra costs. Animated to feel visceral.
 *   2. Introduction — OLL Future Skills = one 4-in-1 program.
 *   3. Speciality — Hardcopy books, Virtual Labs, LMS.
 *   4. Deep-dives — Books (Grades 3-8), Virtual Lab (game video),
 *      Teacher LMS (lesson plans / PPTs / videos).
 *   + About Us, Schools We Work With, FAQ, sticky CTAs, Footer.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Download, ShieldCheck, Sparkles, CheckCircle2, BookOpen,
  Gamepad2, PlayCircle, Play, GraduationCap, School, MapPin,
  Monitor, Bot, Brain, Code2, X, Clock, Wallet, Users, AlertTriangle,
  Layers, Zap, Globe2, Smartphone, Wifi, Network, BarChart3, BrainCircuit, Rocket,
} from 'lucide-react';
import Footer from '../../components/Footer';
import LMSSection from '../../components/school/LMSSection';
import SchoolBreadcrumbs from '../../components/school/SchoolBreadcrumbs';
import SchoolRelatedPrograms from '../../components/school/SchoolRelatedPrograms';

// ── shared assets ──────────────────────────────────────────────────────────
const OLL_LOGO_COLOR = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const OLL_LOGO_WHITE = 'https://customer-assets.emergentagent.com/job_0add39d8-6ba8-4c9a-b97e-1c8e22260bae/artifacts/bnp5i3h5_OLL-horizontal-logo-white.png';
const FS_HERO_IMG    = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/mcvv1k20_Screenshot%202026-09-17%20at%208.13.35%E2%80%AFAM.png';
const BROCHURE_PDFS  = {
  CBSE: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/bb24ial1_OLL%20Future%20skills%20-%20CBSE%20Grade%201%20-%208.pdf',
  ICSE: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/bb24ial1_OLL%20Future%20skills%20-%20CBSE%20Grade%201%20-%208.pdf',
};

const KBC_IMG        = 'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png';
const SHARK_TANK_IMG = 'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
const SHARK_TANK_YT  = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT         = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

const MEDIA_LOGOS = [
  { src: '/media-logos/yourstory.svg',        alt: 'YourStory' },
  { src: '/media-logos/sony-tv.svg',          alt: 'Sony Entertainment TV' },
  { src: '/media-logos/hindustan-times.svg',  alt: 'Hindustan Times' },
  { src: '/media-logos/times-of-india.svg',   alt: 'The Times of India' },
  { src: '/media-logos/cnbc-tv18.svg',        alt: 'CNBC TV18' },
  { src: '/media-logos/indian-express.svg',   alt: 'The Indian Express' },
  { src: '/media-logos/business-insider.svg', alt: 'Business Insider' },
  { src: '/media-logos/pinkvilla.svg',        alt: 'Pinkvilla' },
];

const TEAM = [
  { name: 'Shreyaan Daga',     role: 'Founder & CEO',          bio: 'Youngest on Shark Tank India, on the Hot Seat of KBC.',              img: '/team/shreyaan.png?v=2' },
  { name: 'Vidushi Daga',      role: 'Chairperson · OLL',      bio: '15+ years in education. Taught over 5 lakh kids across India.',      img: '/team/vidushi.png?v=2'  },
  { name: 'Amit Modi',         role: 'IIT Bombay Alumni',      bio: '10+ years in Robotics education for kids across India.',             img: '/team/amit.png?v=2'     },
  { name: 'Heather Andersson', role: 'President · UNESCO WGF', bio: '15+ years in education. President, UNESCO World Genesis Foundation.', img: '/team/heather.png?v=2'  },
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

const BOOK_GRADES = [
  { grade: 1, tint: '#FEE2E2', spine: '#DC2626', cover: '/books/future-skills/grade-1.jpeg', flip: 'https://online.flippingbook.com/view/938028145/' },
  { grade: 2, tint: '#DBEAFE', spine: '#2563EB', cover: '/books/future-skills/grade-2.jpeg', flip: 'https://online.flippingbook.com/view/938443226/' },
  { grade: 3, tint: '#FDE68A', spine: '#D97706', cover: '/books/future-skills/grade-3.jpeg', flip: 'https://online.flippingbook.com/view/938126481/' },
  { grade: 4, tint: '#FCA5A5', spine: '#DC2626', cover: '/books/future-skills/grade-4.jpeg', flip: 'https://online.flippingbook.com/view/938234158/' },
  { grade: 5, tint: '#A5F3FC', spine: '#0891B2', cover: '/books/future-skills/grade-5.jpeg', flip: 'https://heyzine.com/flip-book/804ef5c90c.html' },
  { grade: 6, tint: '#C4B5FD', spine: '#7C3AED', cover: '/books/future-skills/grade-6.jpeg', flip: 'https://heyzine.com/flip-book/804ef5c90c.html' },
  { grade: 7, tint: '#86EFAC', spine: '#059669', cover: '/books/future-skills/grade-7.jpeg', flip: 'https://online.flippingbook.com/view/938233129/' },
  { grade: 8, tint: '#FDBA74', spine: '#EA580C', cover: '/books/future-skills/grade-8.jpeg', flip: 'https://heyzine.com/flip-book/def088cd92.html' },
];

// Grade-wise Robotics "Innovative Projects" — actual project names from the book.
const ROBOTICS_PROJECTS = {
  1: ['Funny Spectacles', 'Fidget Spinner', 'See-Saw', 'Ball Shooter'],
  2: ['Scissor Gripper', 'Railway Barrier', 'Simple Torch', 'Shadow Projector'],
  3: ['Motorcycle', 'Motorised Seesaw', 'Windshield Wiper', 'Turtle Robot'],
  4: ['Retractable Single Bridge', 'Dark to Go Robot', 'Chameleon', 'Lifting Crane'],
  5: ['Table Fan', 'Edge-Avoiding Robot', '4-Legged Monster', 'Show Hand to Seek'],
  6: ['Bi-directional Elevator', 'Contactless Water Fetcher', 'Show Hand to Go', 'Racing Car'],
  7: ['Roller Blinds', 'Bi-ped Rickshaw', 'Overhauling Crane Mechanism', 'The Car Lift'],
  8: ['Contactless Door', 'Ball Dribbling Companion', 'Smart Vault System', 'Sliding Door Mechanism'],
};

// Virtual Lab domains — 11 tiles rendered on a navy card grid.
// Mix of official language logos (devicon) + lucide icons for abstract domains.
const LAB_DOMAINS = [
  { key: 'web',      title: 'Web Development',        type: 'lucide', icon: 'Globe2',        color: '#F472B6' },
  { key: 'cpp',      title: 'C++',                    type: 'img',    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg', color: '#3B82F6' },
  { key: 'app',      title: 'App Development',        type: 'lucide', icon: 'Smartphone',    color: '#F97316' },
  { key: 'iot',      title: 'Internet of Things',     type: 'lucide', icon: 'Wifi',          color: '#0EA5E9' },
  { key: 'net',      title: 'Networking',             type: 'lucide', icon: 'Network',       color: '#A78BFA' },
  { key: 'ds',       title: 'Data Science',           type: 'lucide', icon: 'BarChart3',     color: '#EC4899' },
  { key: 'py',       title: 'Python Programming',     type: 'img',    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg', color: '#FBBF24' },
  { key: 'game',     title: 'Game Development',       type: 'lucide', icon: 'Gamepad2',      color: '#FCD34D' },
  { key: 'cyber',    title: 'Cyber Security',         type: 'lucide', icon: 'ShieldCheck',   color: '#EF4444' },
  { key: 'robot',    title: 'Robotics',               type: 'lucide', icon: 'Bot',           color: '#22C55E' },
  { key: 'ai',       title: 'Artificial Intelligence',type: 'lucide', icon: 'BrainCircuit',  color: '#8B5CF6' },
];
const LUCIDE_MAP = { Globe2, Smartphone, Wifi, Network, BarChart3, Gamepad2, ShieldCheck, Bot, BrainCircuit };

// Grade-wise curriculum index extracted from the official
// "OLL Future skills — CBSE Grade 1-8" brochure PDF, grouped by the 4 pillars.
const CURRICULUM_INDEX = {
  1: {
    ICT:      ['Meet the Digital World', 'Know Your Computer', 'Magic Mouse', 'Typing Fun', 'Create Digital Art', 'Being a Good Digital Citizen'],
    Coding:   ['Think Like a Problem Solver', 'My First Coding Project', 'Blockly Games', 'Scratch Junior'],
    AI:       ['Smart Technology & AI'],
    Robotics: ['Innovative Projects'],
  },
  2: {
    ICT:      ['How Computers Work', 'Keyboard & Mouse Skills', 'Start Drawing with Paint', 'Digital Creativity', 'Introduction to Word Processing', 'Digital Citizenship'],
    Coding:   ['Reasoning and Analysis', 'More on Google Blockly Games', 'More on ScratchJr'],
    AI:       ['Artificial Intelligence'],
    Robotics: ['Innovative Projects'],
  },
  3: {
    ICT:      ['Explore Operating System', 'Word Processing', 'Paint 3D', 'Internet & Cyber Safety'],
    Coding:   ['Computational Thinking', 'Scratch Programming'],
    AI:       ['Artificial Intelligence', 'AI Tools and Use Case'],
    Robotics: ['Innovative Projects'],
  },
  4: {
    ICT:      ['More on Windows 10', 'Graphics in Word', 'Tables in Word', 'Introduction to PowerPoint 2016', 'More on Internet'],
    Coding:   ['Events and Loops', 'Using Sensing Blocks'],
    AI:       ['Know about AI and its Domains', 'AI in Popular Tools', 'Responsible Use of AI'],
    Robotics: ['Innovative Projects'],
  },
  5: {
    ICT:      ['Data Storage and Memory', 'Introduction to Canva', 'Working with Spreadsheets', 'Creating Presentations', 'Internet and E-mail'],
    Coding:   ['Introduction to Scratch', 'Game Development in Scratch', 'Introduction to MIT App Inventor', 'Building an App in MIT App Inventor'],
    AI:       ['Know about AI and its Domains', 'AI in Popular Apps', 'AI: Responsible Use and Future of AI'],
    Robotics: ['Innovative Projects'],
  },
  6: {
    ICT:      ['Digital Tools: Beyond Typing', 'MS Presentation: Multimedia', 'MS Presentation: Slide Transition & Animation', 'MS Spreadsheet: Basic Data Operations', 'Surfing Internet'],
    Coding:   ['App Development Using MIT App Inventor', 'HTML: Structure, Images and Lists', 'Introduction to CSS', 'Python Basics'],
    AI:       ['Introduction to AI', 'Machine Learning for Kids', 'Computer Vision: Classify Objects', 'Generative AI'],
    Robotics: ['Innovative Projects'],
  },
  7: {
    ICT:      ['Understanding Binary', 'Computational Thinking', 'Performing Calculations Using Spreadsheets', 'Data Visualisation Using Spreadsheets', 'Organising Data with Databases', 'Google Forms and Databases', 'Staying Safe in the Digital World'],
    Coding:   ['Python Programming', 'Control Statements in Python', 'Introduction to Web Development', 'Images and Hyperlinks in HTML', 'Lists and Tables in HTML'],
    AI:       ['Computer Vision', 'Smart Living', 'Machine Learning'],
    Robotics: ['Innovative Projects'],
  },
  8: {
    ICT:      ['Advanced Internet Concepts', 'Digital Communication', 'Productivity Tools', 'Cyber Security and Safety'],
    Coding:   ['Fundamentals of Python', 'Strings in Python', 'Lists and Tuples in Python', 'More on HTML', 'Creating Forms in HTML', 'Inserting Multimedia in HTML'],
    AI:       ['AI: Agentic AI, AI Operating Systems and Real-World Use', 'Data Science Basics', 'AI Tools and Applications', 'AI in Society and Future'],
    Robotics: ['Innovative Projects'],
  },
};

const PILLAR_META = [
  { key: 'ICT',      icon: Monitor, color: '#3B82F6', label: 'ICT · Digital Literacy' },
  { key: 'Coding',   icon: Code2,   color: '#10B981', label: 'Coding' },
  { key: 'AI',       icon: Brain,   color: '#8B5CF6', label: 'Artificial Intelligence' },
  { key: 'Robotics', icon: Bot,     color: '#DC2626', label: 'Robotics' },
];

const FOUR_SUBJECTS = [
  { icon: Monitor, label: 'ICT',      color: '#3B82F6', bg: 'rgba(59,130,246,0.14)' },
  { icon: Code2,   label: 'Coding',   color: '#10B981', bg: 'rgba(16,185,129,0.14)' },
  { icon: Brain,   label: 'AI',       color: '#8B5CF6', bg: 'rgba(139,92,246,0.14)' },
  { icon: Bot,     label: 'Robotics', color: '#DC2626', bg: 'rgba(220,38,38,0.14)' },
];

const FAQ_ITEMS = [
  { q: 'What exactly is the Future Skills 4-in-1 program?',
    a: 'One integrated curriculum for Grades 1-8 that combines ICT, Coding, AI and Robotics into a single subject, single period slot, single book — with teacher lesson plans, virtual labs and assessments included on the OLL LMS.' },
  { q: 'How does it save my school time in the weekly timetable?',
    a: 'Instead of 4 separate periods for 4 separate subjects, you allocate ONE Future Skills period per week. That is 1 slot instead of 4 — an 80% reduction in timetable pressure.' },
  { q: 'What do the students receive?',
    a: 'A single hardcopy interactive workbook per grade, browser-based virtual labs, and lifetime access to their OLL LMS with lesson recordings, activities and assessments.' },
  { q: 'What do the teachers receive?',
    a: 'Ready-to-teach lesson plans, PPT slide decks, walkthrough videos, unit tests and analytics for every class — plus UNESCO WGF-backed upskilling paths.' },
  { q: 'Do parents have to buy 4 different books?',
    a: 'No. Just one Future Skills workbook per grade — lighter on the school bag AND on the parent’s wallet. That is the whole point.' },
  { q: 'Do I need to hire specialist AI or Robotics teachers?',
    a: 'No. The existing IT / Computer Science teacher takes the class using OLL’s lesson plans, videos and PPTs. OLL trains and certifies them at no extra cost.' },
];

// ── helpers ────────────────────────────────────────────────────────────────
const upsertMeta = (name, content, attr = 'name') => {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute('content', content);
};
const upsertLink = (rel, href, extra = {}) => {
  const sel = `link[rel="${rel}"]${Object.entries(extra).map(([k, v]) => `[${k}="${v}"]`).join('')}`;
  let el = document.head.querySelector(sel);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v)); document.head.appendChild(el); }
  el.setAttribute('href', href);
};
const upsertJsonLd = (id, obj) => {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
  el.textContent = JSON.stringify(obj);
};

// ── component ──────────────────────────────────────────────────────────────
export default function FutureSkillsLanding({ board = 'ICSE' }) {
  const navigate = useNavigate();
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [brochureForm, setBrochureForm] = useState({ school_name: '', phone: '' });
  const [brochureSubmitting, setBrochureSubmitting] = useState(false);
  const [brochureError, setBrochureError] = useState('');
  const [activeBook, setActiveBook] = useState(null);
  const [activeIndexGrade, setActiveIndexGrade] = useState(1);

  const boardLower = board.toLowerCase();
  // Keyword-rich canonical slug — matches the long-form SEO URL we ship on
  // production (`/school/{cbse|icse}-ict-robotics-ai-and-coding-curriculum...`).
  // The short `/school/cs/future-skills-{board}` route continues to render
  // this same component (see App.js) but Google is told this longer keyword
  // URL is the ranking canonical.
  const CANONICAL_PATH = `/school/${boardLower}-ict-robotics-ai-and-coding-curriculum-with-practical-activity-books-for-class-1-to-8`;
  const SEO_TITLE = `${board} All in 1 - ICT, AI, Coding & Robotics Curriculum with Practical Activity Books & Virtual Labs for Classes 1 to 8 - OLL`;
  const SEO_DESCRIPTION = `Transform your school with OLL's ICT, Coding, Robotics and AI Curriculum for ${board}, created by experts to teach kids future skills with Textbooks, Virtual Labs, and LMS with Teaching Resources. AI and Coding Curriculum for ${board === 'CBSE' ? 'CBSE Subject Code 417 and 843' : 'ICSE'} with AI Course and Practical Activity Books and Teachers Training on AI and Python.`;
  const SEO_KEYWORDS = `${board} ICT curriculum, ${board} AI curriculum for schools, ${board} Coding and Robotics curriculum, ${board} activity books classes 1 to 8, ${board} All in 1 curriculum, ${board === 'CBSE' ? 'CBSE Subject Code 417, CBSE Subject Code 843,' : 'ICSE ICT alternative,'} school AI activity workbook, ICT AI coding robotics 4-in-1, Virtual Labs for schools, LMS with teaching resources, OLL Future Skills program`;
  const BROCHURE_PDF_NAME = `OLL-${board}-Future-Skills-Brochure.pdf`;

  useEffect(() => { window.scrollTo(0, 0); }, [board]);

  // Trigger the "Introducing Future Skills" stage-curtain reveal only when
  // that section scrolls into view, so returning visitors see the animation
  // play again and page-load timing doesn't waste the effect above the fold.
  useEffect(() => {
    const el = document.querySelector(`[data-testid="fs-${boardLower}-landing"] [data-testid="fs-stage"]`);
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('fs-stage-in-view'); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          el.classList.add('fs-stage-in-view');
          io.disconnect(); // play once per page load
        }
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [board, boardLower]);
  useEffect(() => {
    const canonicalUrl = `${window.location.origin}${CANONICAL_PATH}`;
    document.title = SEO_TITLE;
    document.documentElement.setAttribute('lang', 'en-IN');
    upsertMeta('description', SEO_DESCRIPTION);
    upsertMeta('keywords', SEO_KEYWORDS);
    upsertMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1');
    upsertMeta('author', 'OLL — Skills for All');
    upsertMeta('theme-color', '#0A1F44');
    upsertMeta('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
    upsertLink('canonical', canonicalUrl);
    upsertLink('alternate', canonicalUrl, { hreflang: 'en-in' });
    upsertLink('alternate', canonicalUrl, { hreflang: 'x-default' });
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:site_name', 'OLL — Skills for All', 'property');
    upsertMeta('og:title', SEO_TITLE, 'property');
    upsertMeta('og:description', SEO_DESCRIPTION, 'property');
    upsertMeta('og:url', canonicalUrl, 'property');
    upsertMeta('og:image', FS_HERO_IMG, 'property');
    upsertMeta('og:image:alt', 'OLL Future Skills — ICT + Coding + AI + Robotics 4-in-1 curriculum for schools', 'property');
    upsertMeta('og:locale', 'en_IN', 'property');
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', SEO_TITLE);
    upsertMeta('twitter:description', SEO_DESCRIPTION);
    upsertMeta('twitter:image', FS_HERO_IMG);
    upsertJsonLd(`ld-course-fs-${boardLower}`, {
      '@context': 'https://schema.org', '@type': 'Course',
      name: `${board} Future Skills — ICT, Coding, AI & Robotics (Grades 1-8)`,
      description: SEO_DESCRIPTION,
      provider: { '@type': 'Organization', name: 'OLL — Skills for All', sameAs: 'https://oll.co' },
      educationalLevel: 'Classes 1 to 8', inLanguage: 'en-IN',
      hasCourseInstance: [{ '@type': 'CourseInstance', courseMode: 'blended', location: 'India' }],
    });
    upsertJsonLd(`ld-breadcrumb-fs-${boardLower}`, {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',    item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Schools', item: `${window.location.origin}/school` },
        { '@type': 'ListItem', position: 3, name: `${board} Future Skills`, item: canonicalUrl },
      ],
    });
    upsertJsonLd(`ld-faq-fs-${boardLower}`, {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((f) => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    upsertJsonLd(`ld-org-fs-${boardLower}`, {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: 'OLL — Skills for All', url: 'https://oll.co',
      logo: 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png',
      sameAs: ['https://www.instagram.com/oll.co', 'https://www.linkedin.com/company/oll-co'],
    });
  }, [board, boardLower, CANONICAL_PATH, SEO_TITLE, SEO_DESCRIPTION, SEO_KEYWORDS]);

  const goBookDemo = () => navigate(`/school?product=future-skills-${boardLower}&source=future-skills-${boardLower}-landing`);
  const openBrochureModal = (e) => { if (e) e.preventDefault(); setBrochureError(''); setShowBrochureModal(true); };

  const triggerPdfDownload = async () => {
    const url = BROCHURE_PDFS[board] || BROCHURE_PDFS.CBSE;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('fetch-fail');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = BROCHURE_PDF_NAME;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch {
      const a = document.createElement('a');
      a.href = url; a.download = BROCHURE_PDF_NAME;
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
          selected_offerings: [`${board} Future Skills (Grades 1-8)`],
          programs_interested: ['Future Skills — ICT, Coding, AI & Robotics'],
          source: `future-skills-${boardLower}-brochure-download`,
          notes: `Lead captured via ${board} Future Skills landing page — brochure download gate.`,
          assign_option: 'admin',
        }),
      });
    } catch { /* PDF already downloading */ }
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
    }} data-testid={`fs-${boardLower}-landing`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;500;600;700;800;900&family=Caveat:wght@400;700&display=swap');
        @font-face { font-family: 'Zing Rust'; src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype'); font-weight: 400; font-style: normal; font-display: swap; }
        .icse-display { font-family: 'Proxima Nova','Montserrat',system-ui,sans-serif; font-weight: 300; letter-spacing: -0.01em; line-height: 1.05; }
        .icse-hero-h  { font-family: 'Zing Rust','Bebas Neue',serif; font-weight: 400; letter-spacing: 0.005em; line-height: 0.95; text-transform: uppercase; }
        .icse-script  { font-family: 'Caveat', cursive; font-weight: 700; letter-spacing: 0; text-transform: none; }
        .icse-light   { font-family: 'Proxima Nova','Montserrat',system-ui,sans-serif; font-weight: 400; }
        .icse-body    { font-family: 'Proxima Nova','Montserrat',system-ui,sans-serif; font-weight: 400; }
        .icse-eyebrow { font-weight: 700; font-size: 0.7rem; letter-spacing: 0.28em; text-transform: uppercase; }
        .icse-btn { display:inline-flex; align-items:center; gap:8px; padding:14px 26px; border-radius:999px; font-weight:700; font-size:0.82rem; letter-spacing:0.05em; text-transform:uppercase; transition:transform .2s ease, box-shadow .2s ease, background .2s ease; cursor:pointer; text-decoration:none; border:none; }
        .icse-btn.primary { background:#DC2626; color:#fff; box-shadow:0 14px 28px rgba(220,38,38,0.28); }
        .icse-btn.primary:hover { background:#B91C1C; transform:translateY(-1px); }
        .icse-btn.outline { background:#fff; color:#0A1F44; border:1.5px solid #0A1F44; }
        .icse-btn.outline:hover { background:#0A1F44; color:#fff; }
        .icse-btn.ghost   { background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,0.30); }
        .icse-btn.ghost:hover { background:rgba(255,255,255,0.10); }
        .icse-card { background:#fff; border:1px solid #F1E9E1; border-radius:28px; box-shadow: 0 8px 24px rgba(10,31,68,0.06); transition:transform .3s ease, box-shadow .3s ease, border-color .3s ease; }
        .icse-card:hover { transform:translateY(-4px); box-shadow: 0 20px 40px rgba(10,31,68,0.10); border-color:#DC2626; }
        .icse-nav-pill { max-width: 1220px; margin: 0 auto; background: rgba(255,255,255,0.98); backdrop-filter: saturate(180%) blur(14px); border: 1px solid rgba(10,31,68,0.08); box-shadow: 0 20px 44px rgba(10,31,68,0.12); border-radius: 999px; display:flex; align-items:center; justify-content: space-between; padding: 8px 14px 8px 18px; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .icse-anim-fadeup { animation: fadeUp .8s cubic-bezier(.22,.9,.34,1) both; }
        .icse-anim-delay-1 { animation-delay: .12s; }
        .icse-anim-delay-2 { animation-delay: .24s; }
        .icse-anim-delay-3 { animation-delay: .36s; }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .icse-anim-float { animation: floatY 6s ease-in-out infinite; }

        .icse-orb-red  { position:absolute; width:400px; height:400px; border-radius:50%; background:rgba(220,38,38,0.14); filter:blur(90px); pointer-events:none; }
        .icse-orb-blue { position:absolute; width:400px; height:400px; border-radius:50%; background:rgba(96,165,250,0.20); filter:blur(90px); pointer-events:none; }
        .icse-orb-gold { position:absolute; width:340px; height:340px; border-radius:50%; background:rgba(245,158,11,0.16); filter:blur(90px); pointer-events:none; }

        /* Chaos animation — subject chips wobble & try to fit */
        @keyframes fs-jiggle {
          0%,100% { transform: rotate(-3deg) translateY(0); }
          50%     { transform: rotate(3deg)  translateY(-4px); }
        }
        @keyframes fs-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        .fs-chip-jiggle { animation: fs-jiggle 2.4s ease-in-out infinite; }
        .fs-chip-shake  { animation: fs-shake  0.9s ease-in-out infinite; }
        @keyframes fs-drip {
          0%   { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fs-drip { animation: fs-drip .7s ease-out both; }

        /* ── STAGE CURTAIN REVEAL (Section 2 · Introducing) ── */
        .fs-stage {
          position: relative;
          padding: 60px 24px 48px;
          border-radius: 32px;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 40px 80px rgba(0,0,0,0.4);
        }
        .fs-stage-content { position: relative; z-index: 3; }
        /* Curtain panels — closed by default; open only once the stage
           scrolls into view (see IntersectionObserver in the component). */
        .fs-curtain {
          position: absolute; top: 0; bottom: 0; width: 52%;
          background:
            repeating-linear-gradient(90deg,
              #8B0F1E 0px, #B91C1C 12px, #7F1123 24px, #B91C1C 36px, #8B0F1E 48px),
            linear-gradient(180deg, #9B1B22 0%, #6E0F1B 100%);
          box-shadow: inset -30px 0 60px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.4);
          z-index: 2;
          transform-origin: top center;
        }
        .fs-curtain-left  { left: 0;  border-right: 4px solid #4C0616; }
        .fs-curtain-right { right: 0; border-left:  4px solid #4C0616;
          background:
            repeating-linear-gradient(90deg,
              #8B0F1E 0px, #B91C1C 12px, #7F1123 24px, #B91C1C 36px, #8B0F1E 48px),
            linear-gradient(180deg, #9B1B22 0%, #6E0F1B 100%);
          box-shadow: inset 30px 0 60px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.4);
        }
        /* Only animate curtains open once the stage is scrolled into view */
        .fs-stage.fs-stage-in-view .fs-curtain-left  {
          animation: fs-curtain-open       2.2s cubic-bezier(.7,.05,.35,1) 0.35s both;
        }
        .fs-stage.fs-stage-in-view .fs-curtain-right {
          animation: fs-curtain-open-right 2.2s cubic-bezier(.7,.05,.35,1) 0.35s both;
        }
        /* Curtain rope decoration on top */
        .fs-curtain::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 22px;
          background: linear-gradient(180deg, #4C0616 0%, #8B0F1E 100%);
          border-bottom: 2px solid #2A040D;
        }
        @keyframes fs-curtain-open {
          0%   { transform: translateX(0) scaleX(1); }
          100% { transform: translateX(-100%) scaleX(0.75); }
        }
        @keyframes fs-curtain-open-right {
          0%   { transform: translateX(0) scaleX(1); }
          100% { transform: translateX(100%) scaleX(0.75); }
        }
        /* Spotlights */
        /* Spotlights — hidden until stage is in view */
        .fs-spotlights { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0; }
        .fs-stage.fs-stage-in-view .fs-spotlights { animation: fs-spotlights-in 1.6s ease-out 2s both; }
        .fs-spotlights span { position: absolute; top: -60px; width: 220px; height: 320px;
          background: radial-gradient(ellipse at top, rgba(252,165,165,0.42) 0%, rgba(252,165,165,0) 65%);
          filter: blur(6px); transform-origin: top center; }
        .fs-spotlights span:nth-child(1) { left: 12%; transform: rotate(18deg); }
        .fs-spotlights span:nth-child(2) { left: 42%; transform: rotate(-4deg); }
        .fs-spotlights span:nth-child(3) { right: 12%; transform: rotate(-18deg); }
        @keyframes fs-spotlights-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        /* Star field */
        .fs-stage-stars { position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
          background-image:
            radial-gradient(1px 1px at 12% 22%, #fff 100%, transparent),
            radial-gradient(1px 1px at 85% 35%, #fff 100%, transparent),
            radial-gradient(1.5px 1.5px at 48% 68%, #fff 100%, transparent),
            radial-gradient(1px 1px at 25% 78%, #fff 100%, transparent),
            radial-gradient(1px 1px at 70% 15%, #fff 100%, transparent),
            radial-gradient(1.5px 1.5px at 90% 82%, #fff 100%, transparent),
            radial-gradient(1px 1px at 62% 45%, #fff 100%, transparent);
          animation: fs-star-twinkle 4s ease-in-out infinite alternate;
        }
        @keyframes fs-star-twinkle { 0% { opacity: 0.35; } 100% { opacity: 0.75; } }
        /* Reveal steps — hidden by default, animate only when stage is in view */
        .fs-reveal { opacity: 0; transform: translateY(18px) scale(0.98); }
        .fs-stage.fs-stage-in-view .fs-reveal { animation: fs-reveal-in 0.9s cubic-bezier(.22,.9,.34,1) both; }
        .fs-reveal-1 { animation-delay: 1.9s; }
        .fs-reveal-2 { animation-delay: 2.1s; }
        .fs-reveal-3 { animation-delay: 2.35s; }
        .fs-reveal-4 { animation-delay: 2.55s; }
        .fs-reveal-5 { animation-delay: 2.75s; }
        @keyframes fs-reveal-in { 0% { opacity: 0; transform: translateY(18px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }

        /* ── 4-IN-1 CONVERGE DIAGRAM ── */
        .fs-converge { position: relative; padding-top: 20px; padding-bottom: 130px; }
        .fs-converge-lines {
          position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.7;
          display: none;
        }
        @media (min-width: 900px) {
          .fs-converge-lines { display: block; }
        }
        .fs-converge-lines .fs-line {
          stroke-dasharray: 1600;
          stroke-dashoffset: 1600;
          animation: fs-line-draw 2.4s ease-in-out forwards;
        }
        .fs-converge-lines .fs-line:nth-child(2) { animation-delay: 0.15s; }
        .fs-converge-lines .fs-line:nth-child(3) { animation-delay: 0.30s; }
        .fs-converge-lines .fs-line:nth-child(4) { animation-delay: 0.45s; }
        @keyframes fs-line-draw { to { stroke-dashoffset: 0; } }
        .fs-converge-pillars {
          position: relative; z-index: 1;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
        }
        @media (max-width: 900px) { .fs-converge-pillars { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .fs-converge-pillars { grid-template-columns: 1fr; } }
        .fs-converge-merged { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); z-index: 2; }
        .fs-converge-badge {
          display: inline-flex; align-items: center; gap: 12px;
          padding: 14px 22px; border-radius: 999px;
          background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
          color: #fff; box-shadow: 0 20px 40px rgba(220,38,38,0.45), inset 0 1px 0 rgba(255,255,255,0.25);
          position: relative;
        }
        .fs-converge-pulse {
          position: absolute; inset: -6px; border-radius: 999px;
          border: 2px solid rgba(220,38,38,0.55);
          animation: fs-pulse-ring 2.4s cubic-bezier(.4,0,.2,1) infinite;
        }
        @keyframes fs-pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.9; }
          75%  { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }

        /* Book card — CT&AI-style clean image with 3D perspective, no
           pedestal background, hover reveal pill floating over the book */
        .fs-book {
          position: relative; display: block; width: 100%;
          background: transparent; border: 0; padding: 0; cursor: pointer;
          perspective: 1400px;
        }
        .fs-book-inner {
          position: relative;
          transform-style: preserve-3d;
          transform-origin: left center;
          transition: transform .55s cubic-bezier(.2,.8,.2,1), box-shadow .4s ease;
          border-radius: 3px 5px 5px 3px;
          overflow: hidden;
          box-shadow:
            2px 3px 0 rgba(30, 20, 60, 0.18),
            5px 7px 0 rgba(30, 20, 60, 0.10),
            8px 12px 22px rgba(30, 20, 60, 0.18),
            0 30px 48px -14px rgba(30, 20, 60, 0.30);
        }
        .fs-book:hover .fs-book-inner {
          transform: rotateY(-22deg) translateZ(14px);
          box-shadow:
            3px 4px 0 rgba(30, 20, 60, 0.22),
            7px 9px 0 rgba(30, 20, 60, 0.12),
            14px 18px 30px rgba(30, 20, 60, 0.24),
            0 36px 60px -14px rgba(220, 38, 38, 0.28);
        }
        .fs-book-cover-img {
          display: block; width: 100%; height: auto;
          border-radius: 3px 5px 5px 3px;
          backface-visibility: hidden;
        }
        .fs-book-inner::after {
          content: ''; position: absolute; top: -2px; left: 2px; right: -1px; height: 2px;
          background: linear-gradient(180deg, #FEFEFE 0%, #E2E8F0 100%);
          border-radius: 2px 2px 0 0;
        }
        /* Hover / touch reveal pill — floats over the book (matches CT&AI) */
        .fs-book-reveal {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, calc(-50% + 14px));
          z-index: 4; opacity: 0; transition: opacity 0.28s ease, transform 0.35s cubic-bezier(.22,.9,.34,1);
          display: inline-flex; align-items: center; gap: 8px;
          background: #DC2626; color: #fff; padding: 10px 16px; border-radius: 999px;
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-size: 11px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase;
          box-shadow: 0 12px 28px rgba(220,38,38,0.45); pointer-events: none; white-space: nowrap;
        }
        .fs-book:hover .fs-book-reveal { opacity: 1; transform: translate(-50%, -50%); }
        .fs-book:focus-visible { outline: 3px solid #DC2626; outline-offset: 3px; }
        .fs-book:focus-visible .fs-book-reveal { opacity: 1; transform: translate(-50%, -50%); }
        @media (hover: none) {
          .fs-book-reveal {
            opacity: 0.95; transform: translate(-50%, -50%);
            box-shadow: 0 8px 18px rgba(220,38,38,0.4);
          }
        }
        @media (max-width: 520px) { .fs-sample-open-new { display: none !important; } }

        /* ── Virtual Lab domain grid (navy panel, 4×2 + 3-centered) ── */
        .fs-lab-panel {
          position: relative;
          background: linear-gradient(155deg, #26379D 0%, #1E2A80 60%, #1B2266 100%);
          border-radius: 40px;
          padding: 40px 32px 48px;
          box-shadow: 0 40px 80px rgba(30, 42, 128, 0.35);
          overflow: hidden;
        }
        .fs-lab-panel::before {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(circle at 15% 10%, rgba(147,197,253,0.10) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(236,72,153,0.10) 0%, transparent 40%);
          pointer-events: none;
        }
        .fs-lab-grid {
          position: relative; z-index: 1;
          display: flex; flex-wrap: wrap; justify-content: center; gap: 14px;
        }
        .fs-lab-tile {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          padding: 14px 10px 12px;
          text-align: center;
          backdrop-filter: blur(10px);
          transition: transform 0.35s cubic-bezier(.22,.9,.34,1), background 0.25s ease, border-color 0.25s ease, box-shadow 0.35s ease;
          flex: 0 0 calc((100% - 14px * 5) / 6);
          min-width: 0;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          animation: fadeUp .8s cubic-bezier(.22,.9,.34,1) both;
        }
        .fs-lab-tile:hover {
          transform: translateY(-4px);
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,255,255,0.22);
          box-shadow: 0 20px 40px rgba(0,0,0,0.35);
        }
        .fs-lab-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.35s ease;
          box-shadow: 0 6px 14px rgba(0,0,0,0.25), inset 0 -3px 6px rgba(0,0,0,0.15);
        }
        .fs-lab-tile:hover .fs-lab-icon { transform: translateY(-2px) scale(1.08); }
        .fs-lab-icon img { width: 62%; height: 62%; object-fit: contain; }
        .fs-lab-label {
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-weight: 700; color: #fff; font-size: 0.78rem; line-height: 1.15;
          letter-spacing: 0.005em;
        }
        @media (max-width: 1024px) {
          .fs-lab-tile { flex: 0 0 calc((100% - 14px * 4) / 5); }
        }
        @media (max-width: 760px) {
          .fs-lab-tile { flex: 0 0 calc((100% - 14px * 3) / 4); }
        }
        @media (max-width: 560px) {
          .fs-lab-panel { padding: 28px 18px 32px; border-radius: 32px; }
          .fs-lab-grid { gap: 10px; }
          .fs-lab-tile { flex: 0 0 calc((100% - 10px * 2) / 3); padding: 12px 8px 10px; border-radius: 16px; gap: 6px; }
          .fs-lab-icon { width: 44px; height: 44px; border-radius: 12px; }
          .fs-lab-label { font-size: 0.68rem; }
        }

        /* 4-pillar animated tiles (replaces the flat hero image) */
        @keyframes fs-pillar-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fs-icon-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .fs-pillar-card { animation: fs-pillar-in .8s cubic-bezier(.22,.9,.34,1) both; transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease; }
        .fs-pillar-card .fs-pillar-icon { animation: fs-icon-float 4s ease-in-out infinite; }
        .fs-pillar-card:hover { transform: translateY(-6px); }
        .fs-pillar-glow { position: absolute; inset: 0; opacity: 0; transition: opacity 0.35s ease; pointer-events: none; }
        .fs-pillar-card:hover .fs-pillar-glow { opacity: 1; }

        /* ══════════════════════════════════════════════════════════════════════
           4-IN-1 · IMAGE 1 EMULATION — pastel-tinted pillar cards with
           circular icons on top, colored bullet lists, ribbon flows to a
           bottom pedestal reading "OLL FUTURE SKILLS Grades 1-8".
           ══════════════════════════════════════════════════════════════════════ */
        .fs-4in1-v2 { position: relative; padding: 30px 0 200px; }
        .fs-4in1-cards {
          position: relative; z-index: 3;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
        }
        @media (max-width: 900px) { .fs-4in1-cards { grid-template-columns: repeat(2, 1fr); gap: 14px; } }
        @media (max-width: 480px) { .fs-4in1-cards { grid-template-columns: 1fr; } }
        .fs-4in1-card {
          position: relative; padding: 32px 22px 26px;
          border-radius: 22px;
          transition: transform .35s cubic-bezier(.22,.9,.34,1), box-shadow .35s ease;
          box-shadow: 0 10px 24px rgba(10,31,68,0.06);
        }
        .fs-4in1-card:hover { transform: translateY(-8px); box-shadow: 0 22px 40px rgba(10,31,68,0.14); }
        .fs-4in1-card::before {
          content: ''; position: absolute; inset: 0; border-radius: 22px;
          background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%);
          pointer-events: none;
        }
        /* Pastel tints per subject */
        .fs-4in1-card.fs-tint-blue   { background: linear-gradient(180deg, #EEF4FF 0%, #E0EAFB 100%); }
        .fs-4in1-card.fs-tint-red    { background: linear-gradient(180deg, #FEEEEE 0%, #FBDDDD 100%); }
        .fs-4in1-card.fs-tint-purple { background: linear-gradient(180deg, #F3EEFB 0%, #E4D9F5 100%); }
        .fs-4in1-card.fs-tint-red2   { background: linear-gradient(180deg, #FEEEEE 0%, #FBDDDD 100%); }

        /* Circular icon on top — floats above the card */
        .fs-4in1-icon-bubble {
          position: relative; width: 72px; height: 72px; margin: 0 auto 16px;
          border-radius: 999px;
          display: flex; align-items: center; justify-content: center; color: #fff;
          box-shadow: 0 14px 28px -4px currentColor, inset 0 -6px 12px rgba(0,0,0,0.12);
          transition: transform .4s cubic-bezier(.22,.9,.34,1);
        }
        .fs-4in1-card:hover .fs-4in1-icon-bubble { transform: rotate(-8deg) scale(1.06); }
        .fs-4in1-icon-bubble.blue   { background: linear-gradient(135deg, #1E3A8A, #2563EB); color: #2563EB; }
        .fs-4in1-icon-bubble.red    { background: linear-gradient(135deg, #B91C1C, #DC2626); color: #DC2626; }
        .fs-4in1-icon-bubble.purple { background: linear-gradient(135deg, #6B21A8, #7C3AED); color: #7C3AED; }
        .fs-4in1-icon-bubble.red2   { background: linear-gradient(135deg, #B91C1C, #DC2626); color: #DC2626; }

        .fs-4in1-title {
          text-align: center; font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-weight: 900; font-size: 1.35rem; letter-spacing: 0.02em;
          color: #0A1F44; line-height: 1.05;
        }
        .fs-4in1-title.purple { color: #6B21A8; }
        .fs-4in1-title.blue { color: #1E3A8A; }
        .fs-4in1-title.red { color: #B91C1C; }

        .fs-4in1-bullets { list-style: none; margin: 16px 0 0; padding: 0; }
        .fs-4in1-bullets li {
          position: relative; padding-left: 20px; margin-top: 8px;
          font-family: 'Proxima Nova', system-ui, sans-serif; font-size: 0.9rem;
          color: #334155; line-height: 1.4;
        }
        .fs-4in1-bullets li::before {
          content: ''; position: absolute; left: 4px; top: 8px; width: 7px; height: 7px;
          border-radius: 999px; background: currentColor;
        }
        .fs-4in1-bullets.blue li   { color: #1E40AF; }
        .fs-4in1-bullets.red li    { color: #B91C1C; }
        .fs-4in1-bullets.purple li { color: #6B21A8; }
        .fs-4in1-bullets li span { color: #334155; margin-left: 2px; }

        /* Ribbon flows — 4 curved paths converging at the pedestal below */
        .fs-4in1-ribbons {
          position: absolute; left: 0; right: 0; bottom: 60px; height: 160px; z-index: 1;
          pointer-events: none;
        }
        .fs-4in1-ribbons svg { width: 100%; height: 100%; display: block; }
        .fs-4in1-ribbons path {
          fill: none; stroke-linecap: round; stroke-width: 20;
          stroke-dasharray: 800; stroke-dashoffset: 800;
          animation: fs-ribbon-draw 2.6s cubic-bezier(.22,.9,.34,1) forwards;
          filter: drop-shadow(0 4px 8px rgba(10,31,68,0.15));
          opacity: 0.9;
        }
        .fs-4in1-ribbons path:nth-child(2) { animation-delay: .15s; }
        .fs-4in1-ribbons path:nth-child(3) { animation-delay: .30s; }
        .fs-4in1-ribbons path:nth-child(4) { animation-delay: .45s; }
        @keyframes fs-ribbon-draw { to { stroke-dashoffset: 0; } }

        /* Bottom pedestal — the "OLL FUTURE SKILLS" trophy that all ribbons meet at */
        .fs-4in1-pedestal {
          position: absolute; left: 50%; bottom: 0; transform: translateX(-50%);
          z-index: 4;
          padding: 22px 40px;
          background: linear-gradient(180deg, #ffffff 0%, #F1F5F9 100%);
          border-radius: 140px 140px 24px 24px;
          box-shadow:
            0 22px 48px -12px rgba(10,31,68,0.24),
            0 10px 22px rgba(10,31,68,0.10),
            inset 0 2px 0 rgba(255,255,255,0.95),
            inset 0 -1px 0 rgba(10,31,68,0.06);
          text-align: center;
          min-width: 320px;
          transform: translate(-50%, 0);
          transition: transform .35s ease;
        }
        .fs-4in1-pedestal:hover { transform: translate(-50%, -4px); }
        .fs-4in1-pedestal img { height: 34px; display: inline-block; }
        .fs-4in1-pedestal-title {
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-weight: 900; font-size: 1.35rem; color: #0A1F44;
          margin-top: 4px; letter-spacing: 0.02em;
        }
        .fs-4in1-pedestal-badge {
          display: inline-block; margin-top: 8px;
          padding: 5px 18px; background: #DC2626; color: #fff;
          border-radius: 999px; font-size: 0.72rem; font-weight: 800;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        @media (max-width: 640px) {
          .fs-4in1-pedestal { padding: 16px 24px; min-width: 260px; }
          .fs-4in1-pedestal-title { font-size: 1.1rem; }
          .fs-4in1-v2 { padding-bottom: 220px; }
        }

        /* ══════════════════════════════════════════════════════════════════════
           WHEEL · IMAGE 3 EMULATION — 4-quadrant pie chart with 4 corner
           content cards linked by dotted connector lines.
           ══════════════════════════════════════════════════════════════════════ */
        .fs-wheel-wrap {
          position: relative; padding: 40px 0; max-width: 1100px; margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          grid-template-areas: 'tl pie tr' 'bl pie br';
          gap: 20px 30px;
        }
        @media (max-width: 900px) {
          .fs-wheel-wrap {
            grid-template-columns: 1fr; grid-template-areas: 'pie' 'tl' 'tr' 'bl' 'br';
            gap: 18px;
          }
        }
        .fs-wheel-pie {
          grid-area: pie; position: relative;
          width: 360px; height: 360px;
          margin: auto;
          border-radius: 999px;
          background: conic-gradient(
            from -45deg,
            #1E3A8A 0deg 90deg,
            #DC2626 90deg 180deg,
            #DC2626 180deg 270deg,
            #6B21A8 270deg 360deg
          );
          box-shadow: 0 30px 60px -20px rgba(10,31,68,0.35), inset 0 0 0 6px rgba(255,255,255,0.15);
        }
        @media (max-width: 640px) { .fs-wheel-pie { width: 280px; height: 280px; } }
        .fs-wheel-pie::before {
          content: ''; position: absolute; inset: 12px;
          border-radius: 999px;
          background:
            conic-gradient(
              from -45deg,
              #1E3A8A 0deg 90deg,
              #DC2626 90deg 180deg,
              #DC2626 180deg 270deg,
              #6B21A8 270deg 360deg
            );
        }
        .fs-wheel-hub {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          width: 44%; height: 44%; border-radius: 999px;
          background: #fff;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 14px; text-align: center; z-index: 2;
          box-shadow: 0 8px 24px rgba(10,31,68,0.20), inset 0 0 0 5px #F1F5F9;
        }
        .fs-wheel-hub img { height: 36px; margin-bottom: 6px; }
        .fs-wheel-hub-title {
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-weight: 900; color: #0A1F44; font-size: 0.9rem; line-height: 1;
          letter-spacing: 0.03em;
        }
        .fs-wheel-hub-grades {
          margin-top: 4px; font-size: 0.65rem; font-weight: 700; color: #64748B;
          letter-spacing: 0.15em; text-transform: uppercase;
        }
        /* Quadrant label pills — floating over each slice */
        .fs-wheel-label {
          position: absolute; z-index: 3;
          display: flex; flex-direction: column; align-items: center;
          color: #fff; font-family: 'Proxima Nova', system-ui, sans-serif;
          font-weight: 800; font-size: 0.85rem; letter-spacing: 0.04em; text-align: center;
          text-shadow: 0 2px 6px rgba(0,0,0,0.25);
        }
        .fs-wheel-label svg { margin-bottom: 4px; }
        .fs-wheel-label.tl { top: 22%; left: 22%; }
        .fs-wheel-label.tr { top: 22%; right: 22%; }
        .fs-wheel-label.bl { bottom: 22%; left: 22%; }
        .fs-wheel-label.br { bottom: 22%; right: 22%; }

        .fs-wheel-card {
          padding: 22px 20px; border-radius: 18px;
          background: #fff; border: 1px solid #E2E8F0;
          box-shadow: 0 10px 24px rgba(10,31,68,0.06);
          transition: transform .3s ease, box-shadow .3s ease;
        }
        .fs-wheel-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(10,31,68,0.14); }
        .fs-wheel-card.tl { grid-area: tl; background: linear-gradient(180deg, #EEF4FF, #ffffff); }
        .fs-wheel-card.tr { grid-area: tr; background: linear-gradient(180deg, #FEEEEE, #ffffff); }
        .fs-wheel-card.bl { grid-area: bl; background: linear-gradient(180deg, #F3EEFB, #ffffff); }
        .fs-wheel-card.br { grid-area: br; background: linear-gradient(180deg, #FEEEEE, #ffffff); }
        .fs-wheel-card-title {
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-weight: 900; font-size: 1.15rem; letter-spacing: 0.02em; line-height: 1.05;
        }
        .fs-wheel-card.tl .fs-wheel-card-title { color: #1E3A8A; }
        .fs-wheel-card.tr .fs-wheel-card-title { color: #B91C1C; }
        .fs-wheel-card.bl .fs-wheel-card-title { color: #6B21A8; }
        .fs-wheel-card.br .fs-wheel-card-title { color: #B91C1C; }
        .fs-wheel-card-list { list-style: none; margin: 10px 0 0; padding: 0; }
        .fs-wheel-card-list li {
          position: relative; padding-left: 18px; margin-top: 6px;
          font-size: 0.88rem; color: #334155; line-height: 1.35;
        }
        .fs-wheel-card-list li::before {
          content: ''; position: absolute; left: 3px; top: 8px; width: 7px; height: 7px;
          border-radius: 999px; background: currentColor;
        }
        .fs-wheel-card.tl .fs-wheel-card-list li::before { background: #1E40AF; }
        .fs-wheel-card.tr .fs-wheel-card-list li::before { background: #B91C1C; }
        .fs-wheel-card.bl .fs-wheel-card-list li::before { background: #6B21A8; }
        .fs-wheel-card.br .fs-wheel-card-list li::before { background: #B91C1C; }

        /* ══════════════════════════════════════════════════════════════════════
           ECOSYSTEM · IMAGE 2 EMULATION — 4 outer cards around a puzzle
           center reading "Complete Learning Ecosystem".
           ══════════════════════════════════════════════════════════════════════ */
        .fs-eco-wrap {
          position: relative; max-width: 1200px; margin: 0 auto; padding: 30px 0 40px;
          display: grid; grid-template-columns: 1fr auto 1fr;
          grid-template-areas: 'tl hub tr' 'bl hub br';
          gap: 20px 40px;
        }
        @media (max-width: 900px) {
          .fs-eco-wrap {
            grid-template-columns: 1fr; grid-template-areas: 'hub' 'tl' 'tr' 'bl' 'br';
            gap: 16px;
          }
        }
        .fs-eco-hub {
          grid-area: hub; position: relative;
          width: 260px; height: 260px; margin: auto;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 18px;
          background: radial-gradient(circle at 50% 50%, #FFFFFF 0%, #F1F5F9 100%);
          border-radius: 999px;
          box-shadow: 0 20px 48px rgba(10,31,68,0.14), inset 0 0 0 4px #E2E8F0;
        }
        .fs-eco-hub::before, .fs-eco-hub::after {
          content: ''; position: absolute; width: 40px; height: 40px;
          background: linear-gradient(135deg, #DC2626, #B91C1C);
          border-radius: 12px;
        }
        .fs-eco-hub::before { top: -12px; left: -12px; transform: rotate(-30deg); }
        .fs-eco-hub::after  { bottom: -12px; right: -12px; transform: rotate(150deg); background: linear-gradient(135deg, #1E3A8A, #2563EB); }
        .fs-eco-hub img { height: 40px; margin-bottom: 6px; }
        .fs-eco-hub-title {
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-weight: 900; color: #0A1F44; font-size: 0.98rem; line-height: 1.1;
          letter-spacing: 0.02em; text-transform: uppercase;
        }
        .fs-eco-card {
          padding: 22px 20px; border-radius: 20px;
          transition: transform .3s ease, box-shadow .3s ease;
          box-shadow: 0 10px 24px rgba(10,31,68,0.06);
          position: relative;
        }
        .fs-eco-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(10,31,68,0.14); }
        .fs-eco-card.tl { grid-area: tl; background: linear-gradient(180deg, #FEEEEE, #ffffff); }
        .fs-eco-card.tr { grid-area: tr; background: linear-gradient(180deg, #EEF4FF, #ffffff); }
        .fs-eco-card.bl { grid-area: bl; background: linear-gradient(180deg, #F3EEFB, #ffffff); }
        .fs-eco-card.br { grid-area: br; background: linear-gradient(180deg, #FEEEEE, #ffffff); }
        .fs-eco-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
        }
        .fs-eco-icon.red    { background: linear-gradient(135deg, #DC2626, #B91C1C); }
        .fs-eco-icon.blue   { background: linear-gradient(135deg, #2563EB, #1E3A8A); }
        .fs-eco-icon.purple { background: linear-gradient(135deg, #7C3AED, #6B21A8); }
        .fs-eco-header { display: flex; align-items: flex-start; gap: 14px; }
        .fs-eco-title {
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-weight: 900; font-size: 1.15rem; line-height: 1.1; color: #0A1F44;
        }
        .fs-eco-desc {
          margin-top: 4px; font-size: 0.85rem; color: #475569; line-height: 1.45;
        }
        .fs-eco-list { list-style: none; margin: 14px 0 0; padding: 0; }
        .fs-eco-list li {
          position: relative; padding-left: 26px; margin-top: 8px;
          font-size: 0.88rem; color: #334155; line-height: 1.35;
        }
        .fs-eco-list li::before {
          content: '✓'; position: absolute; left: 0; top: 0; width: 18px; height: 18px;
          border-radius: 999px; background: #10B981; color: #fff;
          font-size: 0.75rem; font-weight: 900; display: inline-flex;
          align-items: center; justify-content: center;
        }

        .icse-mobile-cta { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0)); display: none; gap: 8px; background: rgba(255,255,255,0.96); backdrop-filter: saturate(180%) blur(14px); border-top: 1px solid rgba(10,31,68,0.08); box-shadow: 0 -12px 32px rgba(10,31,68,0.10); }
        .icse-mobile-cta .icse-btn { flex: 1; justify-content: center; padding: 12px 14px !important; font-size: 0.75rem !important; }

        /* Mobile-dynamic */
        @media (max-width: 640px) {
          .icse-nav-pill { padding: 6px 10px 6px 12px; }
          .icse-nav-pill img { height: 34px !important; }
          .icse-page { padding-bottom: 84px; }
          .icse-btn { padding: 12px 18px !important; font-size: 0.78rem !important; }
          .icse-btn.primary, .icse-btn.outline, .icse-btn.ghost { min-height: 46px; }
          .icse-hero-h { line-height: 1.02 !important; letter-spacing: -0.01em; }
          .icse-mobile-cta { display: flex; }
          section { padding-top: 3rem !important; padding-bottom: 3rem !important; }
          [data-testid="fs-hero"] .grid { gap: 1.5rem !important; }
          [data-testid="fs-speciality"] .grid { grid-template-columns: 1fr !important; }
          [data-testid="fs-speciality"] .icse-card { text-align: left !important; }
          [data-testid="fs-books"] .grid { grid-template-columns: 1fr 1fr !important; }
          [data-testid="fs-virtual-lab"] .grid { grid-template-columns: 1fr !important; }
          [data-testid="fs-4in1"] .grid { grid-template-columns: 1fr 1fr !important; }
          [data-testid="fs-pain"] .fs-pain-grid { grid-template-columns: 1fr !important; }
          [data-testid="fs-final-cta"] h2 { font-size: 2rem !important; line-height: 1.1 !important; }
        }
      `}</style>

      <div className="icse-orb-red"  style={{ top: '-160px', left: '-140px' }} />
      <div className="icse-orb-blue" style={{ top: '20%',    right: '-140px' }} />
      <div className="icse-orb-gold" style={{ bottom: '40%', left: '-100px' }} />

      {/* ── Sticky nav ─────────────────────────────────────────── */}
      <nav className="fixed top-3 left-0 right-0 z-50 px-3 hidden sm:block" data-testid="fs-nav" aria-label="Primary">
        <div className="icse-nav-pill">
          <a href="/" className="flex items-center gap-3" aria-label="OLL home">
            <img src={OLL_LOGO_COLOR} alt={`OLL — ${board} Future Skills 4-in-1 curriculum partner`} className="h-9 sm:h-10 w-auto" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-[#0A1F44] border-l border-slate-200 pl-3 leading-tight">
              {board} · Grades 1-8<br/>Future Skills · 4-in-1
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openBrochureModal}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0A1F44] px-3 py-2 rounded-full hover:bg-slate-100 transition"
              data-testid="fs-nav-brochure">
              <Download className="w-3.5 h-3.5" /> Download Brochure
            </button>
            <button onClick={goBookDemo} className="icse-btn primary" style={{ padding: '10px 20px', fontSize: '0.72rem' }} data-testid="fs-nav-cta">
              Book a Demo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Visible breadcrumb trail (also emits BreadcrumbList JSON-LD) ── */}
      <div style={{ paddingTop: 'clamp(2.5rem, 8vw, 5.5rem)' }}>
        <SchoolBreadcrumbs
          testid={`fs-${boardLower}-breadcrumbs`}
          schemaId={`ld-breadcrumb-fs-${boardLower}`}
          items={[
            { label: 'Home', href: '/' },
            { label: 'For Schools', href: '/school' },
            { label: 'Computer Science', href: '/school#computer-science' },
            { label: `${board} · Future Skills (Classes 1-8)` },
          ]}
        />
      </div>

      {/* ══════════ SECTION 1 · THE 4-SUBJECT NIGHTMARE ══════════ */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-14" data-testid="fs-pain" aria-labelledby="fs-pain-heading">
        {/* ── SEO-first H1 + intro copy (indexable, keyword-rich) ── */}
        <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-10">
          <h1 className="icse-display text-[#0A1F44] text-3xl sm:text-4xl md:text-5xl leading-[1.1] tracking-tight" data-testid="fs-h1">
            ICT, AI, Robotics and Coding Curriculum for {board}
          </h1>
          <p className="mt-4 sm:mt-5 text-slate-600 text-[15px] sm:text-base leading-relaxed font-light">
            {board === 'CBSE'
              ? 'OLL brings you India’s most comprehensive All-in-1 CBSE ICT + Coding + AI + Robotics curriculum for Classes 1 to 8 — aligned with CBSE Subject Codes 417 and 843, delivered as printed Practical Activity Books, browser-based Virtual Labs, a school LMS with Teaching Resources, and hands-on Teacher Training on AI and Python. Replace 4 fragmented subjects with 1 integrated future-skills program that fits a single weekly period and one lightweight workbook per grade.'
              : 'OLL brings you India’s most comprehensive All-in-1 ICSE ICT + Coding + AI + Robotics curriculum for Classes 1 to 8 — designed by IIT Alumni and delivered as printed Practical Activity Books, browser-based Virtual Labs, a school LMS with Teaching Resources, and hands-on Teacher Training on AI and Python. Replace 4 fragmented subjects with 1 integrated future-skills program that fits a single weekly period and one lightweight workbook per grade.'}
          </p>
          <p className="mt-4 text-[#DC2626] text-sm sm:text-base font-black uppercase tracking-widest" data-testid="fs-h1-badge">
            Designed for {board} Schools · Classes 1 to 8
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-700">{board} · Classes 1 – 8</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-700">Practical Activity Books</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-700">Virtual Labs</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-700">LMS + Teacher Training</span>
            {board === 'CBSE' && <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-700">Subject Code 417 &amp; 843</span>}
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white/90 border border-rose-200 rounded-full px-3 py-1.5 shadow-sm icse-anim-fadeup">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span className="icse-eyebrow text-rose-700">The school leader’s nightmare</span>
          </div>
          <h2 id="fs-pain-heading" className="icse-hero-h mt-5 text-[#0A1F44] icse-anim-fadeup icse-anim-delay-1" style={{ fontSize: 'clamp(1.85rem, 6.2vw, 4rem)' }}>
            4 subjects. <span style={{ color: '#DC2626' }}>4 headaches.</span><br/>
            <span className="icse-script text-[#0A1F44]" style={{ fontSize: 'clamp(1.4rem, 4.5vw, 2.6rem)', textTransform: 'none' }}>
              ICT, Coding, AI, Robotics — all at once?
            </span>
          </h2>
        </div>

        {/* Animated 4-chip row */}
        <div className="mt-10 flex flex-wrap justify-center gap-3" data-testid="fs-pain-chips">
          {FOUR_SUBJECTS.map((s, i) => {
            const Icon = s.icon;
            const anim = i % 2 === 0 ? 'fs-chip-jiggle' : 'fs-chip-shake';
            return (
              <div key={s.label} className={anim}
                style={{ background: '#fff', border: `2px solid ${s.color}`, borderRadius: 999, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 8px 24px ${s.bg}`, animationDelay: `${i * 0.2}s` }}>
                <Icon size={18} style={{ color: s.color }} />
                <span className="icse-display" style={{ fontSize: '1rem', color: '#0A1F44', fontWeight: 600 }}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* 3 pain cards */}
        <div className="mt-14 fs-pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {/* Card 1 — Timetable chaos */}
          <div className="icse-card p-6 sm:p-7" data-testid="fs-pain-timetable">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="icse-display text-[#0A1F44] text-xl mt-4">Timetable chaos</div>
            <p className="icse-light text-slate-600 text-sm mt-2">Where do I fit <strong>4 more periods</strong> in an already-packed week — without cutting Maths or English?</p>
            {/* Mini timetable visual */}
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {['Mon','Tue','Wed','Thu','Fri'].map((d) => (
                <div key={d} className="text-center">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{d}</div>
                  <div className="h-16 rounded-md bg-slate-50 border border-slate-200 flex flex-col p-1 gap-0.5">
                    <div className="h-2 rounded-sm bg-slate-200" />
                    <div className="h-2 rounded-sm bg-slate-200" />
                    <div className="h-2 rounded-sm" style={{ background: FOUR_SUBJECTS[(d.length + 0) % 4].color, opacity: 0.5 }} />
                    <div className="h-2 rounded-sm" style={{ background: FOUR_SUBJECTS[(d.length + 1) % 4].color, opacity: 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 — Book burden */}
          <div className="icse-card p-6 sm:p-7" data-testid="fs-pain-books">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10B981,#047857)' }}>
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="icse-display text-[#0A1F44] text-xl mt-4">Book burden</div>
            <p className="icse-light text-slate-600 text-sm mt-2"><strong>4 books = 4x the cost</strong> for parents. Plus a heavier bag on your kids’ shoulders.</p>
            {/* Book stack visual */}
            <div className="mt-4 flex items-end justify-center gap-1 h-24">
              {FOUR_SUBJECTS.map((s, i) => (
                <div key={s.label} className="fs-drip" style={{
                  width: 42, height: 60 + i * 6, background: s.color, borderRadius: '4px 4px 0 0',
                  boxShadow: 'inset 6px 0 0 rgba(255,255,255,0.35), 0 4px 12px rgba(0,0,0,0.10)',
                  animationDelay: `${i * 0.12}s`,
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
                  color: '#fff', fontSize: 9, fontWeight: 900, letterSpacing: '0.06em',
                }}>{s.label}</div>
              ))}
            </div>
          </div>

          {/* Card 3 — Cost + curriculum */}
          <div className="icse-card p-6 sm:p-7" data-testid="fs-pain-costs">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#DC2626,#F97316)' }}>
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="icse-display text-[#0A1F44] text-xl mt-4">Cost &amp; curriculum</div>
            <p className="icse-light text-slate-600 text-sm mt-2"><strong>4 specialists to hire.</strong> 4 curricula to review every year. Where do you even start?</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {FOUR_SUBJECTS.map((s, i) => (
                <div key={s.label} className="fs-drip flex flex-col items-center gap-1"
                     style={{ animationDelay: `${i * 0.15}s` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: s.bg }}>
                    <Users size={14} style={{ color: s.color }} />
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] icse-light text-slate-500">₹₹₹₹  ·  4 teachers on payroll</div>
          </div>
        </div>

        <p className="text-center text-slate-500 icse-light mt-10 max-w-2xl mx-auto">
          Sound familiar? You are not alone. <strong className="text-[#DC2626]">1,000+ school leaders</strong> walked into 2026 with the same problem — until they found a smarter path forward.
        </p>
      </section>

      {/* ══════════ SECTION 2 · INTRODUCING FUTURE SKILLS (curtain reveal) ══════════ */}
      <section className="relative overflow-hidden" data-testid="fs-intro" aria-labelledby="fs-intro-heading"
        style={{
          background: 'radial-gradient(ellipse at top, #1E3A8A 0%, #0A1F44 50%, #060F2A 100%)',
          color: '#fff', padding: '5rem 1.25rem 6rem',
        }}>
        {/* Animated starfield / gradient blobs */}
        <div className="fs-stage-stars" aria-hidden="true" />
        <div className="icse-orb-red"  style={{ width: 500, height: 500, top: -180, left: '5%', opacity: 0.35 }} />
        <div className="icse-orb-blue" style={{ width: 500, height: 500, bottom: -180, right: '5%', opacity: 0.35 }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Curtain reveal — 2 velvet panels sliding open */}
          <div className="fs-stage" data-testid="fs-stage">
            <div className="fs-curtain fs-curtain-left" aria-hidden="true" />
            <div className="fs-curtain fs-curtain-right" aria-hidden="true" />

            {/* Stage lights */}
            <div className="fs-spotlights" aria-hidden="true">
              <span /><span /><span />
            </div>

            <div className="fs-stage-content">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span className="icse-eyebrow text-emerald-200">The OLL solution</span>
              </div>
              <div className="icse-script text-[#FCA5A5] text-4xl mt-5 fs-reveal fs-reveal-1">introducing</div>
              <h2 id="fs-intro-heading" className="icse-hero-h text-white mt-1 fs-reveal fs-reveal-2" style={{ fontSize: 'clamp(2rem, 5.5vw, 3.8rem)', textShadow: '0 6px 24px rgba(0,0,0,0.35)' }}>
                Future Skills.<br/><span style={{ color: '#FCA5A5' }}>4 subjects, 1 curriculum.</span>
              </h2>
              <p className="icse-light text-white/80 mt-4 text-base sm:text-lg max-w-2xl mx-auto fs-reveal fs-reveal-3">
                One integrated program for <strong className="font-bold text-white">Grades 1-8</strong> that combines <strong className="text-white">ICT · Coding · AI · Robotics</strong> —
                taught in a single weekly period, with a single book per grade, by a single teacher, using a single curriculum.
                Trusted by 500+ schools across India for both <strong className="text-white">ICSE</strong> and <strong className="text-white">CBSE</strong> boards.
              </p>

              {/* Value pills */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto fs-reveal fs-reveal-4" data-testid="fs-value-pills">
                {[
                  { i: Layers,   k: '4 in 1', v: 'Curriculum' },
                  { i: Clock,    k: '1',      v: 'Period/week' },
                  { i: BookOpen, k: '1',      v: 'Book/grade' },
                  { i: Zap,      k: '80%',    v: 'Less overhead' },
                ].map((s) => (
                  <div key={s.v} className="bg-white/10 border border-white/20 rounded-2xl px-3 py-3 text-center backdrop-blur-sm">
                    <s.i className="w-4 h-4 text-[#FCA5A5] mx-auto" />
                    <div className="icse-display text-xl text-white mt-1">{s.k}</div>
                    <div className="icse-eyebrow text-white/70 mt-0.5" style={{ fontSize: '0.55rem' }}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3 justify-center fs-reveal fs-reveal-5">
                <button onClick={goBookDemo} className="icse-btn primary" data-testid="fs-intro-cta">
                  Book a School Demo <ArrowRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={openBrochureModal} className="icse-btn ghost" data-testid="fs-intro-download">
                  <Download className="w-4 h-4" /> Download Brochure
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 2b · 4-IN-1 (white bg, alternating rhythm) ══════════ */}
      {/* ══════════ SECTION 2 · THE 4-IN-1 (Image 1 emulation — pastel
              pillar cards flowing into a "OLL Future Skills" pedestal) ══════════ */}
      <section className="relative overflow-hidden" style={{ background: '#FFFFFF', padding: '5rem 1.25rem 3rem' }} data-testid="fs-4in1-section">
        <div className="max-w-6xl mx-auto" data-testid="fs-4in1">
          <div className="text-center">
            <div className="icse-eyebrow text-rose-600">The 4-in-1</div>
            <div className="icse-script text-[#DC2626] text-3xl mt-1">the merge, visualised</div>
            <h3 className="icse-display text-[#0A1F44] text-3xl sm:text-5xl mt-1">Bring ICT + Coding + AI + Robotics together</h3>
            <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-3">
              One structured learning journey for <strong className="text-[#DC2626] font-black">Grades 1-8</strong>.
            </p>
          </div>

          <div className="fs-4in1-v2 mt-10" data-testid="fs-4in1-v2">
            <div className="fs-4in1-cards">
              {/* ICT */}
              <div className="fs-4in1-card fs-tint-blue" data-testid="fs-4in1-ict">
                <div className="fs-4in1-icon-bubble blue"><Monitor size={30} color="#fff" /></div>
                <div className="fs-4in1-title blue">ICT</div>
                <ul className="fs-4in1-bullets blue">
                  <li><span>Digital literacy</span></li>
                  <li><span>Productivity tools</span></li>
                  <li><span>Online safety</span></li>
                  <li><span>Digital citizenship</span></li>
                </ul>
              </div>
              {/* CODING */}
              <div className="fs-4in1-card fs-tint-red" data-testid="fs-4in1-coding">
                <div className="fs-4in1-icon-bubble red"><Code2 size={30} color="#fff" /></div>
                <div className="fs-4in1-title red">CODING</div>
                <ul className="fs-4in1-bullets red">
                  <li><span>Blockly · Scratch</span></li>
                  <li><span>HTML · CSS</span></li>
                  <li><span>JavaScript · Python</span></li>
                  <li><span>Grade-appropriate</span></li>
                </ul>
              </div>
              {/* AI */}
              <div className="fs-4in1-card fs-tint-purple" data-testid="fs-4in1-ai">
                <div className="fs-4in1-icon-bubble purple"><Brain size={30} color="#fff" /></div>
                <div className="fs-4in1-title purple">ARTIFICIAL<br/>INTELLIGENCE</div>
                <ul className="fs-4in1-bullets purple">
                  <li><span>How AI learns</span></li>
                  <li><span>Everyday AI</span></li>
                  <li><span>Ethics</span></li>
                  <li><span>Simple ML projects</span></li>
                </ul>
              </div>
              {/* ROBOTICS */}
              <div className="fs-4in1-card fs-tint-red2" data-testid="fs-4in1-robotics">
                <div className="fs-4in1-icon-bubble red2"><Bot size={30} color="#fff" /></div>
                <div className="fs-4in1-title red">ROBOTICS</div>
                <ul className="fs-4in1-bullets red">
                  <li><span>Circuits · Sensors</span></li>
                  <li><span>Actuators</span></li>
                  <li><span>Build-your-own bots</span></li>
                  <li><span>Hands-on projects</span></li>
                </ul>
              </div>
            </div>

            {/* Ribbon flows converging into the pedestal below */}
            <div className="fs-4in1-ribbons" aria-hidden="true">
              <svg viewBox="0 0 1200 160" preserveAspectRatio="none">
                <path d="M 150 0 C 150 60, 400 100, 600 140" stroke="#2563EB" />
                <path d="M 450 0 C 480 60, 550 100, 600 140" stroke="#DC2626" />
                <path d="M 750 0 C 720 60, 650 100, 600 140" stroke="#7C3AED" />
                <path d="M 1050 0 C 1050 60, 800 100, 600 140" stroke="#DC2626" />
              </svg>
            </div>

            {/* Pedestal — where the 4 ribbons meet */}
            <div className="fs-4in1-pedestal" data-testid="fs-4in1-pedestal">
              <img src={OLL_LOGO_COLOR} alt="OLL" />
              <div className="fs-4in1-pedestal-title">FUTURE SKILLS</div>
              <span className="fs-4in1-pedestal-badge">Grades 1 – 8</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 2C · ECOSYSTEM (Image 2 emulation — 4 cards
              radiating from a central "Complete Learning Ecosystem" hub) ══════════ */}
      <section className="relative overflow-hidden" style={{ background: '#FFFFFF', padding: '5rem 1.25rem' }} data-testid="fs-eco-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="icse-script text-[#DC2626] text-3xl">everything you need</div>
            <h3 className="icse-display text-[#0A1F44] text-3xl sm:text-5xl mt-1">Complete Learning Ecosystem</h3>
            <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-3">
              Books · Virtual Labs · Teacher LMS · Hands-on projects — one integrated system so every teacher and every student has what they need.
            </p>
          </div>

          <div className="fs-eco-wrap mt-12" data-testid="fs-eco">
            <div className="fs-eco-card tl" data-testid="fs-eco-books">
              <div className="fs-eco-header">
                <div className="fs-eco-icon red"><BookOpen size={26} /></div>
                <div>
                  <div className="fs-eco-title">Interactive Books</div>
                  <div className="fs-eco-desc">Structured, grade-wise learning with activities and challenges.</div>
                </div>
              </div>
              <ul className="fs-eco-list">
                <li>Concepts made simple</li>
                <li>Engaging activities</li>
                <li>Real-world examples</li>
                <li>Grade-specific content</li>
              </ul>
            </div>

            <div className="fs-eco-card tr" data-testid="fs-eco-labs">
              <div className="fs-eco-header">
                <div className="fs-eco-icon blue"><Monitor size={26} /></div>
                <div>
                  <div className="fs-eco-title">Virtual Labs</div>
                  <div className="fs-eco-desc">Browser-based practical learning across coding, AI and emerging technologies.</div>
                </div>
              </div>
              <ul className="fs-eco-list">
                <li>Coding labs</li>
                <li>AI experiments</li>
                <li>Robotics simulations</li>
                <li>Creative projects</li>
              </ul>
            </div>

            <div className="fs-eco-hub" data-testid="fs-eco-hub">
              <img src={OLL_LOGO_COLOR} alt="OLL Skills for AI" />
              <div className="fs-eco-hub-title">Complete<br/>Learning<br/>Ecosystem</div>
            </div>

            <div className="fs-eco-card bl" data-testid="fs-eco-lms">
              <div className="fs-eco-header">
                <div className="fs-eco-icon purple"><Users size={26} /></div>
                <div>
                  <div className="fs-eco-title">Teacher-Ready LMS</div>
                  <div className="fs-eco-desc">Lesson plans, PPTs, videos, assessments and teaching resources.</div>
                </div>
              </div>
              <ul className="fs-eco-list">
                <li>Ready-to-teach lesson plans</li>
                <li>PPTs and videos</li>
                <li>Worksheets and assessments</li>
                <li>Student progress tracking</li>
                <li>One login for everything</li>
              </ul>
            </div>

            <div className="fs-eco-card br" data-testid="fs-eco-handson">
              <div className="fs-eco-header">
                <div className="fs-eco-icon red"><Rocket size={26} /></div>
                <div>
                  <div className="fs-eco-title">Hands-on Learning</div>
                  <div className="fs-eco-desc">Projects that move students from understanding concepts to applying them.</div>
                </div>
              </div>
              <ul className="fs-eco-list">
                <li>Real-world projects</li>
                <li>Build and experiment</li>
                <li>Develop problem-solving skills</li>
                <li>Learn by doing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 3 · OLL SPECIALITY ══════════ */}
      {/* ── 4a · Interactive Books (light section — CT&AI-style) ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="fs-books-wrap" aria-labelledby="fs-books-heading">
        <div className="relative" data-testid="fs-books">
          <div className="mb-10 text-center sm:text-left">
            <div className="icse-eyebrow text-rose-600">Speciality · 01</div>
            <div className="icse-script text-[#DC2626] text-3xl">learn by doing</div>
            <h3 id="fs-books-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Interactive Books · Grades 1 to 8</h3>
            <p className="icse-light text-slate-600 mt-3 max-w-2xl mx-auto sm:mx-0">
              A grade-by-grade learning arc — every book packed with age-appropriate activities across all 4 subjects, coding challenges,
              real-world AI stories and reflection prompts. Tap any grade to flip through the actual sample book right here.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7">
            {BOOK_GRADES.map((b) => (
              <div key={b.grade} className="group" data-testid={`fs-book-grade-${b.grade}`}>
                <button
                  type="button"
                  onClick={() => setActiveBook(b)}
                  aria-label={`Open Grade ${b.grade} Future Skills sample book`}
                  className="fs-book"
                  data-testid={`fs-book-card-${b.grade}`}
                >
                  <div className="fs-book-inner">
                    <img
                      src={b.cover}
                      alt={`OLL ${board} Grade ${b.grade} Future Skills workbook — ICT, Coding, AI, Robotics`}
                      loading="lazy"
                      className="fs-book-cover-img"
                      data-testid={`fs-book-cover-${b.grade}`}
                    />
                  </div>
                  <span className="fs-book-reveal" aria-hidden="true">
                    <PlayCircle className="w-3.5 h-3.5" /> View Sample
                  </span>
                </button>
                <button
                  onClick={() => setActiveBook(b)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#DC2626] hover:text-[#B91C1C]"
                  data-testid={`fs-book-sample-${b.grade}`}
                >
                  <PlayCircle className="w-3.5 h-3.5" /> View Sample
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] icse-light text-slate-400 mt-8 uppercase tracking-widest">
            Live sample flipbooks · Powered by OLL · Grades 1-8
          </p>
        </div>
      </section>

      {/* ── 4b · Grade-band deep dive with comparison tables (SEO-heavy) ─ */}
      <section className="relative bg-slate-50 border-y border-slate-200" data-testid="fs-book-bands" aria-labelledby="fs-book-bands-heading">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <div className="icse-eyebrow text-rose-600">Speciality · 01a</div>
            <h2 id="fs-book-bands-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">
              {board} AI, Coding, Robotics &amp; ICT Textbooks — Class-Wise Breakdown
            </h2>
            <p className="icse-light text-slate-600 mt-4 max-w-3xl mx-auto">
              Every {board} Future Skills workbook is grade-calibrated. Compare pages, chapters, lab sessions, software &amp; hardware used and coverage of ICT, Coding, AI and Robotics — side by side — before you order for your {board} school.
            </p>
          </div>

          {/* Reusable band renderer */}
          {[
            {
              testid: 'fs-band-1-2',
              range: '1 and 2',
              header: `${board} AI, Coding, Robotics, and ICT Textbooks for Classes 1 and 2`,
              intro: `${board} AI curriculum with Coding and Robotics for the Foundational Stage follows NEP 2020 and ${board === 'CBSE' ? 'CBSE Curricular Framework (NCF 2023)' : 'ICSE Curricular Framework'} — and introduces students to technology through activity-based learning. The PictoBlox Junior Blocks in the ${board} coding curriculum for Classes 1-2 make it easy for the youngest learners to grasp simplified coding.`,
              books: [
                { grade: 1, tint: '#D9F99D', spine: '#65A30D', pages: 68, chapters: 6, sessions: '36 (18 Lab + 18 Class)', tools: 'MS Paint, Notepad, PictoBlox Junior, Quarky' },
                { grade: 2, tint: '#FDE68A', spine: '#D97706', pages: 68, chapters: 6, sessions: '36 (18 Lab + 18 Class)', tools: 'Tux Paint, WordPad, PictoBlox Junior, Quarky' },
              ],
            },
            {
              testid: 'fs-band-3-5',
              range: '3, 4 and 5',
              header: `${board} AI, Coding, Robotics, and ICT Textbooks for Classes 3rd – 5th`,
              intro: `${board} AI, Coding &amp; Robotics for the Preparatory Stage (Classes 3-5) introduces creative drawing tools, block-based game design, story building and elementary robotics — building strong algorithmic-literacy and problem-solving foundations for ${board} primary-school learners.`,
              books: [
                { grade: 3, tint: '#FCD34D', spine: '#D97706', pages: 92, chapters: 8, sessions: '54 (27 Lab + 27 Class)', tools: 'PictoBlox, Scratch, Tinkercad, Quarky' },
                { grade: 4, tint: '#FCA5A5', spine: '#DC2626', pages: 92, chapters: 8, sessions: '54 (27 Lab + 27 Class)', tools: 'PictoBlox, Scratch, Tinkercad, Quarky' },
                { grade: 5, tint: '#A5F3FC', spine: '#0891B2', pages: 108, chapters: 9, sessions: '54 (27 Lab + 27 Class)', tools: 'PictoBlox, Scratch, Tinkercad, Quarky' },
              ],
            },
            {
              testid: 'fs-band-6-8',
              range: '6, 7 and 8',
              header: `${board} AI, Coding, Robotics, and ICT Textbooks for Classes 6th – 8th`,
              intro: board === 'CBSE'
                ? 'The CBSE Middle-School curriculum (Classes 6-8) covers Excite, Relate, Purpose, Possibilities and AI Ethics — mapped to CBSE Subject Codes 417 and 843 — with in-depth AI, ML, Human-Machine Interaction, Natural Language Processing and Python programming modules.'
                : 'The ICSE Middle-School curriculum (Classes 6-8) covers AI, ML, Human-Machine Interaction, Natural Language Processing and Python-lite programming — while strengthening algorithmic thinking through Scratch, PictoBlox and browser-based robotics simulations.',
              books: [
                { grade: 6, tint: '#C4B5FD', spine: '#7C3AED', pages: 132, chapters: 10, sessions: '72 (36 Lab + 36 Class)', tools: 'PictoBlox, Python Basics, Machine Learning, Quarky' },
                { grade: 7, tint: '#86EFAC', spine: '#059669', pages: 132, chapters: 10, sessions: '72 (36 Lab + 36 Class)', tools: 'PictoBlox, Python, ML, Data Analysis, Quarky' },
                { grade: 8, tint: '#FDBA74', spine: '#EA580C', pages: 140, chapters: 11, sessions: '72 (36 Lab + 36 Class)', tools: 'Python, PictoBlox AI, NLP, Computer Vision, Quarky' },
              ],
            },
          ].map((band) => (
            <div key={band.testid} className="mb-16 last:mb-0" data-testid={band.testid}>
              <div className="text-center mb-8">
                <h3 className="icse-display text-[#0A1F44] text-2xl sm:text-3xl">{band.header}</h3>
                <div className="h-1 w-16 bg-yellow-400 mt-2 mb-4 mx-auto" aria-hidden />
                <p className="icse-light text-slate-600 max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: band.intro }} />
              </div>

              {/* Book covers row */}
              <div className={`grid grid-cols-${band.books.length} gap-4 sm:gap-6 max-w-3xl mx-auto mb-6`}
                   style={{ gridTemplateColumns: `repeat(${band.books.length}, minmax(0, 1fr))` }}>
                {band.books.map((b) => {
                  const fullBook = BOOK_GRADES.find((x) => x.grade === b.grade);
                  return (
                    <button
                      key={b.grade}
                      type="button"
                      onClick={() => setActiveBook(fullBook)}
                      className="fs-book"
                      data-testid={`${band.testid}-cover-${b.grade}`}
                      aria-label={`Preview ${board} Class ${b.grade} Future Skills sample book`}
                    >
                      <div className="fs-book-inner">
                        <img
                          src={fullBook?.cover}
                          alt={`OLL ${board} Class ${b.grade} AI, Coding, Robotics &amp; ICT practical activity book cover`}
                          loading="lazy"
                          className="fs-book-cover-img"
                        />
                      </div>
                      <span className="fs-book-reveal" aria-hidden><PlayCircle className="w-3.5 h-3.5" /> Class {b.grade}</span>
                    </button>
                  );
                })}
              </div>

              {/* Comparison table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0A1F44] text-white">
                      <th className="text-left px-4 py-3 font-bold text-[12px] uppercase tracking-widest w-[220px]">Feature</th>
                      {band.books.map((b) => (
                        <th key={b.grade} className="text-center px-4 py-3 font-bold text-[12px] uppercase tracking-widest" style={{ borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
                          Class {b.grade}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {[
                      { k: 'Coding (PictoBlox)',                v: () => <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> },
                      { k: 'Introduction to AI',                v: () => <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> },
                      { k: 'Basics of Robotics',                v: () => <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> },
                      { k: 'Foundational Computer Education',   v: () => <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> },
                      { k: 'Total Pages',                       v: (b) => <span className="font-bold">{b.pages}</span> },
                      { k: 'Number of Chapters',                v: (b) => <span className="font-bold">{b.chapters}</span> },
                      { k: 'Lab + Classroom Sessions',          v: (b) => <span className="font-semibold text-[12px]">{b.sessions}</span> },
                      { k: 'Software &amp; Hardware Used',      v: (b) => <span className="text-[12px] leading-snug block">{b.tools}</span> },
                      { k: 'Resources for Teachers',            v: () => <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> },
                      { k: `${board}-aligned Certification`,    v: () => <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> },
                      { k: 'Codeavour Competition Access',      v: () => <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> },
                    ].map((row, ri) => (
                      <tr key={row.k} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 font-semibold text-slate-800 text-[13px]" dangerouslySetInnerHTML={{ __html: row.k }} />
                        {band.books.map((b) => (
                          <td key={b.grade} className="px-4 py-3 text-center border-l border-slate-100">
                            {row.v(b)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-[#FEF3C7]">
                      <td className="px-4 py-3 font-bold text-[#0A1F44] text-[13px]">Preview / Book a Demo</td>
                      {band.books.map((b) => {
                        const fullBook = BOOK_GRADES.find((x) => x.grade === b.grade);
                        return (
                          <td key={b.grade} className="px-4 py-3 text-center border-l border-yellow-200">
                            <button
                              type="button"
                              onClick={() => setActiveBook(fullBook)}
                              className="inline-flex items-center gap-1 rounded-full bg-[#DC2626] text-white px-3 py-1.5 text-[11px] font-black uppercase tracking-widest hover:bg-[#B91C1C] transition-colors"
                              data-testid={`${band.testid}-preview-${b.grade}`}
                            >
                              Class {b.grade} <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* SEO closing paragraph — one more mention of the board */}
          <p className="mt-8 text-center text-slate-600 icse-light max-w-3xl mx-auto text-sm">
            Every OLL {board} textbook is aligned with <strong>{board === 'CBSE' ? 'CBSE Subject Codes 417 &amp; 843' : 'ICSE Subject Code 66'}</strong>, <strong>NEP 2020</strong> guidelines and the modern <strong>{board} Future Skills</strong> pathway — with printed practical activity workbooks, Virtual Labs, teacher training on AI &amp; Python, and a school LMS with lesson plans, activity sheets and assessments included.
          </p>
        </div>
      </section>

      {/* ── 4· · Grade-wise Curriculum Index (moved below Interactive Books) ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="fs-curriculum-index" aria-labelledby="fs-index-heading">
        <div className="text-center mb-8">
          <div className="icse-eyebrow text-rose-600">What's inside</div>
          <div className="icse-script text-[#DC2626] text-3xl">grade-wise curriculum</div>
          <h3 id="fs-index-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Curriculum Index · Grades 1 to 8</h3>
          <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-3">
            Tap a grade to see every chapter — grouped by ICT, Coding, AI and Robotics — exactly as it appears in the OLL Future Skills workbook.
          </p>
        </div>

        {/* Grade tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6" role="tablist" aria-label="Grade selector">
          {[1,2,3,4,5,6,7,8].map((g) => {
            const active = activeIndexGrade === g;
            return (
              <button key={g} onClick={() => setActiveIndexGrade(g)} role="tab" aria-selected={active}
                data-testid={`fs-index-tab-${g}`}
                className="transition"
                style={{
                  padding: '10px 18px', borderRadius: 999, fontFamily: "'Proxima Nova', system-ui, sans-serif",
                  fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                  border: active ? '2px solid #DC2626' : '1.5px solid #E2E8F0',
                  background: active ? '#DC2626' : '#fff',
                  color: active ? '#fff' : '#0A1F44',
                  boxShadow: active ? '0 12px 24px rgba(220,38,38,0.28)' : '0 2px 6px rgba(10,31,68,0.05)',
                  cursor: 'pointer',
                }}>
                Grade {g}
              </button>
            );
          })}
        </div>

        {/* 4-pillar chapter grid for the selected grade */}
        <div className="icse-card p-4 sm:p-6" data-testid={`fs-index-content-${activeIndexGrade}`}>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PILLAR_META.map(({ key, icon: Icon, color, label }) => {
              const chapters = key === 'Robotics'
                ? (ROBOTICS_PROJECTS[activeIndexGrade] || [])
                : (CURRICULUM_INDEX[activeIndexGrade]?.[key] || []);
              const heading = key === 'Robotics' ? `${label} · Innovative Projects` : label;
              return (
                <div key={key} className="rounded-2xl p-4 h-full flex flex-col"
                  style={{ background: `${color}0d`, border: `1px solid ${color}33` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color }}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="icse-display text-[#0A1F44] text-sm font-semibold" style={{ letterSpacing: '0.01em' }}>{heading}</div>
                  </div>
                  <ol className="space-y-2 icse-light text-sm text-slate-700 list-none">
                    {chapters.length ? chapters.map((ch, i) => (
                      <li key={ch} className="flex gap-2">
                        <span style={{ color, fontWeight: 800, minWidth: 22 }}>{String(i+1).padStart(2, '0')}</span>
                        <span>{ch}</span>
                      </li>
                    )) : <li className="text-slate-400 italic">Coming soon</li>}
                  </ol>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="icse-light text-xs text-slate-500">
              Grade {activeIndexGrade} · {
                ['ICT','Coding','AI'].reduce((a,k) => a + (CURRICULUM_INDEX[activeIndexGrade]?.[k]?.length || 0), 0)
                + (ROBOTICS_PROJECTS[activeIndexGrade]?.length || 0)
              } chapters &amp; projects across 4 pillars
            </div>
            <button type="button" onClick={openBrochureModal} className="icse-btn primary" style={{ padding: '10px 18px', fontSize: '0.72rem' }} data-testid="fs-index-brochure">
              <Download className="w-3.5 h-3.5" /> Download Full Curriculum
            </button>
          </div>
        </div>
      </section>

      {/* ── 4b · Virtual Lab ───────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="fs-virtual-lab" aria-labelledby="fs-vlab-heading">
        <div className="text-center mb-10">
          <div className="icse-eyebrow text-rose-600">Speciality · 02</div>
          <div className="icse-script text-[#DC2626] text-3xl">play → practise → master</div>
          <h3 id="fs-vlab-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Virtual Labs for Future Skills</h3>
          <p className="icse-light text-slate-600 mt-3 max-w-2xl mx-auto">
            A browser-first playground with all the languages and tools your students need — Scratch, Python, HTML/CSS/JS, C, SQL, Excel — plus AI game simulations and mini robots. Every activity maps to a chapter from the book.
          </p>
        </div>
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 items-center">
          <div>
            <ul className="space-y-2.5 icse-light text-sm text-slate-700">
              {[
                'No separate login. No app to download. No subscription.',
                'Runs in-browser, on any school computer — Chromebook, Windows, Mac.',
                'Progress and time-on-task flow to the teacher dashboard live.',
              ].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /><span>{t}</span></li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={goBookDemo} className="icse-btn primary" data-testid="fs-vlab-cta">
                See the Lab Live <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Autoplaying YouTube demo of the Virtual Lab */}
          <div className="relative">
            <div
              className="relative rounded-[28px] overflow-hidden shadow-2xl border border-slate-100 bg-black"
              style={{ aspectRatio: '16 / 9' }}
              data-testid="fs-vlab-video"
            >
              <iframe
                src="https://www.youtube.com/embed/-AmMm-B76L4?autoplay=1&mute=1&loop=1&playlist=-AmMm-B76L4&controls=1&modestbranding=1&rel=0&playsinline=1"
                title="OLL Future Skills — Virtual Lab walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
              />
              <div className="pointer-events-none absolute inset-x-6 bottom-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/85 drop-shadow">
                <span>OLL · Virtual Labs</span><span>Future Skills · Live</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4b-ii · Virtual Lab domains grid (navy card) ─────────── */}
      <section className="relative py-16 px-4 sm:px-6" data-testid="fs-lab-domains" aria-labelledby="fs-lab-domains-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="icse-eyebrow text-rose-600">Virtual Labs</div>
            <div className="icse-script text-[#DC2626] text-3xl">every tool your students need</div>
            <h3 id="fs-lab-domains-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Domains you'll explore — in one browser tab</h3>
            <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-3">
              11 real-world tech domains — from Web &amp; App Development to AI, IoT and Cyber Security — every one running in-browser on the OLL Virtual Lab.
              No separate login. No app download. No subscription.
            </p>
          </div>

          <div className="fs-lab-panel">
            <div className="fs-lab-grid">
              {LAB_DOMAINS.map((d) => (
                <div key={d.key} className="fs-lab-tile" data-testid={`fs-lab-domain-${d.key}`}>
                  <div className="fs-lab-icon" style={{
                    background: `linear-gradient(155deg, ${d.color}30 0%, ${d.color}12 100%)`,
                    boxShadow: `0 14px 28px ${d.color}22, inset 0 1px 0 rgba(255,255,255,0.12)`,
                    border: `1px solid ${d.color}44`,
                  }}>
                    {d.type === 'img'
                      ? <img src={d.src} alt={`${d.title} logo`} loading="lazy" />
                      : (() => {
                          const Icon = LUCIDE_MAP[d.icon];
                          return Icon ? <Icon size={44} strokeWidth={1.6} style={{ color: d.color, filter: `drop-shadow(0 6px 12px ${d.color}66)` }} /> : null;
                        })()
                    }
                  </div>
                  <div className="fs-lab-label">{d.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4c · LMS ───────────────────────────────────────────── */}
      <section data-testid="fs-lms-wrapper" aria-labelledby="fs-lms-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 -mb-6 sm:-mb-10 relative z-[1] text-center">
          <div className="icse-eyebrow text-rose-600">Speciality · 03</div>
          <div className="icse-script text-[#DC2626] text-3xl">everything a teacher needs</div>
          <h3 id="fs-lms-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Teacher Lesson Plans, PPTs, Videos &amp; Tests</h3>
          <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-3">
            Ready-to-teach modules — every lesson comes with slide decks, videos, activities, assessments and upskilling paths.
          </p>
        </div>
        <LMSSection scriptClass="icse-script" displayClass="icse-display" lightClass="icse-light" testid="fs-lms" hideHeading />
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className="relative overflow-hidden" data-testid="fs-faq-wrap"
        style={{ background: 'linear-gradient(180deg, #EEF2FF 0%, #FFFFFF 100%)', padding: '4rem 1.25rem' }}>
        <div className="max-w-4xl mx-auto" data-testid="fs-faq" aria-labelledby="fs-faq-heading">
          <div className="text-center">
            <div className="icse-script text-[#DC2626] text-3xl">good to know</div>
            <h2 id="fs-faq-heading" className="icse-display text-[#0A1F44] text-3xl sm:text-4xl mt-1">Frequently asked questions</h2>
          </div>
          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((f, i) => (
              <details key={f.q} className="icse-card p-5 sm:p-6 group cursor-pointer" data-testid={`fs-faq-item-${i}`}>
                <summary className="flex items-start justify-between gap-4 list-none cursor-pointer">
                  <span className="icse-display text-[#0A1F44] text-base sm:text-lg pr-2">{f.q}</span>
                  <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-[#DC2626] font-bold group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
                </summary>
                <p className="icse-light text-sm text-slate-600 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="fs-final-cta">
        <div className="relative rounded-[36px] overflow-hidden p-8 sm:p-14 text-center" style={{ background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)' }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#DC2626]/40 blur-3xl" />
          <div className="absolute -bottom-14 -left-16 w-64 h-64 rounded-full bg-[#3B82F6]/25 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#DC2626]" />
              <span className="icse-eyebrow text-white/90">30-min demo · Books · Virtual Labs · LMS</span>
            </div>
            <div className="icse-script text-[#DC2626] text-3xl mt-4">let's talk</div>
            <h2 className="icse-display text-white text-4xl sm:text-6xl mt-1">Give {board === 'ICSE' ? 'your ICSE' : 'your CBSE'} students the future in one subject.</h2>
            <p className="icse-light text-white/80 mt-4 max-w-2xl mx-auto">
              Our schools team will walk you through the 4-in-1 curriculum, books, virtual labs and teacher training —
              everything you need to be ready for the next academic session in one 30-minute call.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <button onClick={goBookDemo} className="icse-btn primary" data-testid="fs-final-cta-btn">
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

      {/* ══════════ ABOUT US ══════════ */}
      <section data-testid="fs-about-oll" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)', color: '#fff', overflow: 'hidden' }} aria-labelledby="fs-about-heading">
        <div className="icse-orb-red"  style={{ width: 420, height: 420, top: -140, left: '10%' }} />
        <div className="icse-orb-blue" style={{ width: 380, height: 380, bottom: -140, right: '10%' }} />
        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="icse-script" style={{ color: '#FCA5A5', fontSize: '1.8rem' }}>about us</div>
            <img src={OLL_LOGO_WHITE} alt="OLL — Skills for All" style={{ height: 90, margin: '1rem auto 1.5rem', display: 'block' }} />
            <h2 id="fs-about-heading" className="icse-display" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05 }}>
              Trusted by schools <span style={{ color: '#FCA5A5' }}>across India.</span>
            </h2>
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

            <div style={{ marginTop: '3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1.5rem', padding: '2rem 1.5rem', backdropFilter: 'blur(10px)' }} data-testid="fs-team">
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

          {/* As seen on */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            {[
              { href: KBC_YT,        img: KBC_IMG,        label: 'Sony · KBC',            title: 'Kaun Banega Crorepati', sub: 'Featured as India\'s leading EdTech for kids', accent: '#FCA5A5', testid: 'fs-media-kbc' },
              { href: SHARK_TANK_YT, img: SHARK_TANK_IMG, label: 'Sony LIV · Season Finale', title: 'Shark Tank India',   sub: 'Pitched to India\'s top investors on national TV', accent: '#60A5FA', testid: 'fs-media-shark-tank' },
            ].map((c) => (
              <a key={c.testid} href={c.href} target="_blank" rel="noreferrer" data-testid={c.testid}
                style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 260, border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none', display: 'block', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                <img src={c.img} alt={`${c.title} — OLL feature`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.92) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 18, right: 18, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 999, background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)', color: '#fff', fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', boxShadow: '0 14px 28px rgba(220,38,38,0.5)', border: '2px solid rgba(255,255,255,0.55)' }}>
                  <Play size={13} fill="#fff" strokeWidth={0} /> Watch
                </div>
                <div style={{ position: 'absolute', left: 20, bottom: 20, right: 100 }}>
                  <div style={{ fontSize: '0.7rem', color: c.accent, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{c.label}</div>
                  <div className="icse-display" style={{ fontSize: '1.35rem', color: '#fff', marginTop: 4 }}>{c.title}</div>
                  <div className="icse-light" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{c.sub}</div>
                </div>
              </a>
            ))}
          </div>

          {/* Media logos strip */}
          <div data-testid="fs-media-logos">
            <div style={{ textAlign: 'center', marginBottom: '0.9rem' }}>
              <span style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(252,165,165,0.85)' }}>// Also covered by</span>
            </div>
            <style>{`
              @keyframes fs-logo-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
              .fs-logos-wrap { position: relative; overflow: hidden; padding: 8px 0; mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); }
              .fs-logos-track { display: inline-flex; gap: 3.25rem; padding: 0 1.5rem; align-items: center; animation: fs-logo-scroll 38s linear infinite; will-change: transform; width: max-content; }
              .fs-logos-track:hover { animation-play-state: paused; }
              .fs-logo-item { flex-shrink: 0; height: 44px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.88; filter: brightness(0) invert(1); transition: opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease; }
              .fs-logo-item img { max-height: 44px; max-width: 170px; height: auto; width: auto; display: block; object-fit: contain; }
              .fs-logo-item:hover { opacity: 1; filter: none; transform: scale(1.06); }
            `}</style>
            <div className="fs-logos-wrap">
              <div className="fs-logos-track">
                {[...MEDIA_LOGOS, ...MEDIA_LOGOS].map((l, i) => (
                  <div key={`${l.alt}-${i}`} className="fs-logo-item"><img src={l.src} alt={l.alt} loading="lazy" /></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SCHOOLS WE WORK WITH ══════════ */}
      <section data-testid="fs-schools-with" style={{ position: 'relative', padding: '5rem 1.25rem 3rem', background: '#F8FAFC', overflow: 'hidden' }} aria-labelledby="fs-schools-heading">
        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="icse-script" style={{ color: '#DC2626', fontSize: '1.6rem' }}>proof, not promises</div>
            <h2 id="fs-schools-heading" className="icse-display" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Schools we work with.
            </h2>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', maxWidth: 640, margin: '0.9rem auto 0', color: '#475569', lineHeight: 1.6 }}>
              Real classrooms. Real projects. Real principals telling the story in their own words.
            </p>
          </div>
          <style>{`
            @keyframes fs-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .fs-marquee-wrap { position: relative; overflow: hidden; padding: 10px 0; mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); }
            .fs-marquee-track { display: inline-flex; gap: 1.25rem; align-items: stretch; animation: fs-marquee 60s linear infinite; will-change: transform; width: max-content; }
            .fs-marquee-track:hover { animation-play-state: paused; }
            .fs-vid-card { flex-shrink: 0; min-width: 290px; max-width: 290px; background: #0A1F44; border-radius: 1rem; overflow: hidden; text-decoration: none; box-shadow: 0 10px 24px rgba(10,31,68,0.18); transition: transform 0.3s ease, box-shadow 0.3s ease; }
            .fs-vid-card:hover { transform: translateY(-3px); box-shadow: 0 18px 36px rgba(10,31,68,0.28); }
            .fs-vid-thumb { position: relative; aspect-ratio: 16/9; overflow: hidden; }
            .fs-vid-thumb img { width: 100%; height: 100%; object-fit: cover; }
            .fs-vid-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.55) 100%); color: #fff; }
            .fs-logos-inner { display: inline-flex; gap: 2rem; align-items: center; animation: fs-marquee 55s linear infinite; will-change: transform; width: max-content; }
            .fs-logos-inner:hover { animation-play-state: paused; }
            @media (max-width: 640px) {
              .fs-vid-card { min-width: 240px !important; max-width: 240px !important; }
            }
          `}</style>
          <div className="fs-marquee-wrap" data-testid="fs-videos-scroll">
            <div className="fs-marquee-track">
              {[...SCHOOL_VIDEOS, ...SCHOOL_VIDEOS].map((v, i) => (
                <a key={`${v.id}-${i}`} href={`https://youtu.be/${v.id}`} target="_blank" rel="noreferrer" className="fs-vid-card"
                  aria-label={`Watch ${v.name} case study on YouTube`}>
                  <div className="fs-vid-thumb">
                    <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt={`${v.name} — OLL school case study`} loading="lazy" />
                    <div className="fs-vid-play"><PlayCircle size={32} fill="rgba(255,255,255,0.15)" /></div>
                  </div>
                  <div style={{ padding: '0.9rem 1.1rem', color: '#fff', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>{v.name}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '3rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontSize: '0.78rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#94A3B8' }}>
              A few of our partner schools
            </div>
            <div className="fs-marquee-wrap">
              <div className="fs-logos-inner">
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

      <SchoolRelatedPrograms current={`future-skills-${boardLower}`} theme="light" testid={`fs-${boardLower}-related-programs`} />

      <Footer />

      {/* Mobile sticky CTA */}
      <div className="icse-mobile-cta" data-testid="fs-mobile-cta">
        <button type="button" onClick={openBrochureModal} className="icse-btn outline" data-testid="fs-mobile-cta-brochure">
          <Download className="w-3.5 h-3.5" /> Brochure
        </button>
        <button onClick={goBookDemo} className="icse-btn primary" data-testid="fs-mobile-cta-demo">
          Book a Demo <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sample book flipbook lightbox — embeds the FlippingBook / Heyzine flipbook per grade */}
      {activeBook && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Grade ${activeBook.grade} sample book`}
          data-testid="fs-sample-modal"
          onClick={() => setActiveBook(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0.75rem', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', maxWidth: 1200,
              height: 'min(92vh, 900px)',
              display: 'flex', flexDirection: 'column',
              background: '#fff', borderRadius: 20, overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.45)',
            }}
          >
            {/* Header */}
            <div style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: '0.85rem 1.1rem',
              background: `linear-gradient(135deg, ${activeBook.spine} 0%, #0A1F44 100%)`,
              color: '#fff',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, color: '#FCA5A5', fontSize: '1.15rem', lineHeight: 1 }}>
                  sample book
                </div>
                <div style={{
                  fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 700,
                  fontSize: 'clamp(0.95rem, 2.2vw, 1.4rem)', marginTop: 4,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  Grade {activeBook.grade} · Future Skills · {board}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <a
                  href={activeBook.flip}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="fs-sample-open-new"
                  className="fs-sample-open-new"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: "'Proxima Nova', 'Montserrat', sans-serif",
                    fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)',
                    padding: '0.5rem 0.85rem', borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.25)', textDecoration: 'none',
                  }}
                >
                  Open in new tab
                </a>
                <button
                  onClick={() => { setActiveBook(null); goBookDemo(); }}
                  data-testid="fs-sample-demo"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: "'Proxima Nova', 'Montserrat', sans-serif",
                    fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: '#fff', background: '#DC2626',
                    padding: '0.5rem 0.85rem', borderRadius: 999, border: 'none', cursor: 'pointer',
                  }}
                >
                  Book a Demo <ArrowRight size={12} />
                </button>
                <button
                  onClick={() => setActiveBook(null)}
                  aria-label="Close sample book"
                  data-testid="fs-sample-close"
                  style={{
                    width: 38, height: 38, borderRadius: 999,
                    background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', cursor: 'pointer',
                    fontSize: '1.35rem', fontWeight: 700, lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            {/* Flipbook iframe */}
            <div style={{ position: 'relative', flex: 1, background: '#F1F5F9', minHeight: 0 }}>
              <iframe
                key={activeBook.flip}
                src={activeBook.flip}
                title={`Grade ${activeBook.grade} · Future Skills sample book`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                allow="fullscreen; autoplay; clipboard-write"
                allowFullScreen
                loading="lazy"
                data-testid="fs-sample-frame"
              />
            </div>
          </div>
        </div>
      )}

      {/* Brochure lead capture modal */}
      {showBrochureModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" data-testid="fs-brochure-modal" onClick={() => setShowBrochureModal(false)}>
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)' }}>
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#DC2626]" />
                <span className="icse-eyebrow text-white/80">One quick step</span>
              </div>
              <div className="icse-script text-[#DC2626] text-2xl mt-2">get the full brochure</div>
              <h3 className="icse-display text-white text-2xl sm:text-3xl mt-1">Where should we send the {board} Future Skills brochure?</h3>
              <p className="icse-light text-white/70 text-sm mt-2">Enter your school name and phone number — we'll open the PDF and a schools-team advisor will reach out with a demo slot.</p>
            </div>
            <form onSubmit={submitBrochureLead} className="p-6 sm:p-8 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">School Name *</label>
                <input type="text" required autoFocus value={brochureForm.school_name}
                  onChange={(e) => setBrochureForm({ ...brochureForm, school_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 icse-body text-slate-800"
                  placeholder="e.g., Delhi Public School" data-testid="fs-brochure-school" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Contact Phone Number *</label>
                <input type="tel" required value={brochureForm.phone}
                  onChange={(e) => setBrochureForm({ ...brochureForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 icse-body text-slate-800"
                  placeholder="+91 98XXXXXXXX" data-testid="fs-brochure-phone" />
              </div>
              {brochureError && <div className="text-sm text-[#DC2626] font-bold">{brochureError}</div>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowBrochureModal(false)} className="icse-btn outline flex-1 justify-center" data-testid="fs-brochure-cancel">Cancel</button>
                <button type="submit" disabled={brochureSubmitting} className="icse-btn primary flex-1 justify-center" data-testid="fs-brochure-submit">
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
