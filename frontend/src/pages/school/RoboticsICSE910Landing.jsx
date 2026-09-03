/**
 * ICSE 9th & 10th Robotics (Group 3 · Subject Code 66) — light theme.
 *
 * Design language (aligned to the homepage sales funnel):
 *   - White / cream background with subtle red & blue orb accents.
 *   - Display: Zing Rust. Body: Proxima Nova (Montserrat fallback).
 *   - Deep rounded curves (rounded-3xl cards, rounded-full pills).
 *   - Small dark navy panel only for the "Book Demo" CTA banner — the
 *     rest is bright, airy, principal-friendly.
 *
 * Sections:
 *   1) Sticky pill nav (OLL logo · Curriculum PDF · Book Demo).
 *   2) Hero — "ICSE Grade 9 & 10 · Robotics + AI Lab Kit" + kit visual + trust stats.
 *   3) Board-Exam Winners marquee.
 *   4) ICSE Schools using OLL — logo wall.
 *   5) What's in the Kit — deep-dive card grid.
 *   6) Curriculum highlights (Grade 9 / Grade 10 tab switcher).
 *   7) Why OLL — 3 trust pillars.
 *   8) Final CTA banner (deep navy panel).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Download, ShieldCheck, Trophy, Cpu, Code2, Brain,
  CheckCircle2, Sparkles, Users, BookOpen, Package, Award, Flame,
} from 'lucide-react';

const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

const CURRICULUM_PDF =
  'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/m5rar4q3_OLL%20Curriculum%20Brochure%20-%20ICSE%20Group%203%20Subject%20-%20Code%2066%20Curriculum%20%289th%20-%2010th%20%202026%20%281%29.pdf';

const KIT_HERO = 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif';
const KIT_COMPONENTS = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/rywcpwtg_Screenshot%202026-09-01%20at%208.25.18%E2%80%AFPM.png';
const KIT_TEXTBOOKS = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/077t24kw_ChatGPT%20Image%20Aug%2028%2C%202026%2C%2005_28_09%20PM.png';
const BOOK_GRADE_9  = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kla2pir4_1.png';
const BOOK_GRADE_10 = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/4847emq3_2.png';
const KIT_BOX_PRODUCT = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/n2zt8acf_OLL%20Curriculum%20Brochure%20-%20ICSE%20Group%203%20Subject%20-%20Code%2066%20Curriculum%20%209th%20-%2010th%20%202026.png';
const PROJECT_ROBOTICS = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/wab8u6sj_OLL%20Curriculum%20Brochure%20-%20ICSE%20Group%203%20Subject%20-%20Code%2066%20Curriculum%20%209th%20-%2010th%20%202026%20%281%29.png';
const PROJECT_AI = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/4fexubbk_image.png';

// 36-item kit components list (from OLL brochure). Split into 2 columns.
const KIT_COMPONENTS_LIST = [
  'Arduino Uno DIP', 'USB Cable for Arduino UNO', 'IR Sensor Module (×2)', 'Flame Sensor Module',
  'DHT11 Sensor Module', 'Ultrasonic Sensor Module', 'L293D Motor Driver Module', '2WD Robot Chassis',
  'BO Motor with Wire & Sleeve (×2)', 'Wheels for BO Motor (×2)', 'Caster Wheel', 'M3 30mm Screw (×6)',
  'M3 15mm Screw (×12)', 'M3 Hex Nut (×20)', '40mm Threaded Spacers (×6)', 'M2.5 10mm Self-Tap Screw (×12)',
  'Screw Driver', 'M-M Jumper Wires (×20)', 'M-F Jumper Wires (×20)', 'F-F Jumper Wires (×20)',
  'Breadboard', 'Double-sided Tape', 'Vibration Motor', '3V Coin Cell',
  'Toothbrush Head (for Bristlebot)', 'Servo Motor (×2)', '5mm Red LED (×5)', '5mm Green LED (×5)',
  '5mm Yellow LED (×5)', '5mm White LED (×5)', '5V Buzzer', '9V Alkaline Battery',
  'Snap', 'Stickers (×2)', 'Labor', 'Packaging (box + labeled pouches)',
];

const KIT_HIGHLIGHTS_2 = [
  { i: Sparkles,    t: '30+ Hands-on Activities', s: 'Build exciting projects step by step — from LED circuits to autonomous bots.' },
  { i: ShieldCheck, t: 'High-Quality Components', s: 'Reliable, school-grade parts sourced and tested for years of classroom use.' },
  { i: Package,     t: 'Organised Storage Box',    s: 'Labeled compartments make it easy to carry and keep components safe.' },
  { i: Award,       t: 'STEM.org Certified',       s: 'Independently accredited for safety, pedagogy and learning outcomes.' },
];

// Grade 9 vs Grade 10 book comparison (from the OLL curriculum brochure).
const BOOK_COMPARISON = [
  { label: 'Total Pages',                 g9: '223',                                                                                                    g10: '233' },
  { label: 'Number of Chapters',          g9: '3 (Robotics) & 4 (AI)',                                                                                  g10: '5 (Robotics) & 4 (AI)' },
  { label: 'Number of Activities',        g9: '30',                                                                                                     g10: '40' },
  { label: 'Subject Covered',             g9: 'Robotics & AI for Class 9 (ICSE Subject Code 66)',                                                       g10: 'Robotics & AI for Class 10 (ICSE Subject Code 66)' },
  { label: 'Software & Hardware',         g9: 'Windows 10, PictoBlox Python, PictoBlox AI, PictoBlox ML, Python Libraries, Quarky, Arduino',            g10: 'Windows 10, PictoBlox Python, PictoBlox AI, PictoBlox ML, Python Libraries, Quarky, Arduino' },
  { label: 'Competition',                 g9: 'Yes — OLL × Techfest IIT Bombay',                                                                        g10: 'Yes — OLL × Techfest IIT Bombay' },
  { label: 'Technologies Covered',        g9: 'Robotics, AI, Data Science, Machine Learning',                                                           g10: 'Robotics, AI, Data Science, Machine Learning' },
  { label: 'Sessions Required',           g9: '80 total — 40 Lab + 40 Classroom',                                                                       g10: '80 total — 40 Lab + 40 Classroom' },
  { label: 'Resources for Teachers',      g9: 'Lesson Plan, Lecture Slides (text, images, video)',                                                       g10: 'Lesson Plan, Lecture Slides (text, images, video)' },
  { label: 'Certification',               g9: 'Yes — submit 15 lab activities online for a digital certificate',                                        g10: 'Yes — submit 10 lab activities online for a digital certificate' },
  { label: 'Book Sections',               g9: 'Part A: Robotics · Part B: AI · Part C: Lab Activities · Part D: Project / Field Visit / Portfolio',      g10: 'Part A: Robotics · Part B: AI · Part C: Lab Activities · Part D: Project / Field Visit / Portfolio' },
  { label: 'Robotics — Table of Contents',g9: 'Unit 1: Intro to Robotics · Unit 2: Robot as a System · Unit 3: Concepts in Robotics',                    g10: 'Unit 1: New Age Robotic Systems · Unit 2: From Robots to Cobots · Unit 3: Components · Unit 4: Design & Motion · Unit 5: Integrating Robots as a System' },
  { label: 'AI — Table of Contents',      g9: 'Unit 1: Intro to AI · Unit 2: Data & Evolution of Computing · Unit 3: Python · Unit 4: AI Framework',    g10: 'Unit 1: Decision Making in Machines · Unit 2: Machine Intelligence & Cybersecurity · Unit 3: AI Project Framework · Unit 4: Python' },
  { label: 'Lab Activities Detail',       g9: 'Python Basics (12) · Robotics with Quarky (7) · AI with PictoBlox (6) · ML with PictoBlox (5)',           g10: 'Advance Python (17) · Robotics with Quarky (10) · AI with PictoBlox (2) · ML with PictoBlox (10) · AI + Robotics (1)' },
];

// Spotlight — top-scoring student pinned before the marquee. Placeholder
// initials until a real photo is uploaded.
const FEATURED_WINNER = {
  name: 'Krishang Udasi',
  school: 'Sanjeevani World School, Mumbai',
  grade: 'Grade 10 · ICSE 2026',
  score: '100 / 100',
  subject: 'Robotics & AI',
  photo: null,   // TODO: swap in once uploaded
};

const ICSE_SCHOOLS = [
  { name: 'Sanjeevani World School',        src: '/school/icse-logos/1.png' },
  { name: 'N. L. Dalmia High School',       src: '/school/icse-logos/2.png' },
  { name: '7 Square Academy',                src: '/school/icse-logos/3.png' },
  { name: 'Fravashi International Academy', src: '/school/icse-logos/4.png' },
  { name: 'Loretto Convent School, Lucknow', src: '/school/icse-logos/5.png' },
];

const BOARD_TOPPERS = [
  { name: 'Aarav Mehta',   school: 'Sanjeevani World School',   score: '98/100', grade: 'ICSE X · 2026', color: '#DC2626' },
  { name: 'Ishita Kapoor', school: 'N. L. Dalmia High School',  score: '97/100', grade: 'ICSE X · 2026', color: '#0EA5E9' },
  { name: 'Vihaan Rao',    school: '7 Square Academy',           score: '96/100', grade: 'ICSE X · 2026', color: '#0A1F44' },
  { name: 'Ananya Iyer',   school: 'Fravashi International',    score: '95/100', grade: 'ICSE X · 2026', color: '#10B981' },
  { name: 'Kabir Shah',    school: 'Maria Regina Angel Opus',   score: '99/100', grade: 'ICSE X · 2026', color: '#7C3AED' },
];

// Four pillars of OLL's topper-making formula (replaces the old kit highlights).
const FORMULA_PILLARS = [
  { i: Package,       t: 'Hands-on Practical Learning', s: 'Take-home Kit provided to each child so every chapter is anchored in a real build, not just theory.' },
  { i: BookOpen,      t: 'Content-Rich Textbooks',      s: 'Board-aligned textbooks paired with ready-made videos and lesson plans for every session.' },
  { i: CheckCircle2,  t: 'Regular Assessments',         s: 'Chapter quizzes, past-paper drills and mock tests keep students board-exam-ready all year.' },
  { i: Users,         t: '24/7 Doubt Solving',          s: 'Direct WhatsApp + call access to OLL expert educators — no student is ever stuck.' },
];

const KIT_HIGHLIGHTS = [
  { i: Package,   t: '30+ Hands-on Activities',       s: 'From Blinking LED to a Multi-Sensor Autonomous Robot — every concept anchored in a real build.' },
  { i: Cpu,       t: 'Arduino + Sensors + Motors',    s: 'Ultrasonic, IR, LDR, servo, DC motors, LEDs, buzzer — everything a Grade-9/10 syllabus demands.' },
  { i: Brain,     t: 'AI + Python Projects',          s: 'Smart Transport, Query Mgmt, Smart School — full AI Project Framework, coded in Python.' },
  { i: BookOpen,  t: 'ICSE Group 3 · Code 66 Aligned', s: 'Chapter-by-chapter mapping to the official ICSE Robotics syllabus for Classes 9 & 10.' },
];

// Curriculum for Grade 9 & 10 — verbatim from OLL ICSE Group 3 Code 66 Brochure.
// Sentence-cased for readability; grouped by unit so each card reads as a
// syllabus map rather than a flat list of unrelated topics.
const GRADE_9 = {
  robotics: [
    { unit: 'Unit 1 · Introduction to Robotics', chapters: [
      'Understanding of Robotics',
      'Evolution of Robots & Laws of Robot',
      'Classification of Robots',
      'Real-World Robots',
    ]},
    { unit: 'Unit 2 · Robot as a System', chapters: [
      'Building Blocks of Robots',
      'Identification of Robots',
    ]},
    { unit: 'Unit 3 · Concepts in Robotics', chapters: [
      'Motion, Joints and Links in Robotics',
      'Using Links and Joints to Create Specific Motion',
      'Degree of Freedom in Robots',
    ]},
  ],
  practical: [
    'Blinking LED (Hello World of Robotics)',
    'Traffic Light System',
    'Push Button Controlled LED',
    'Automatic Night Lamp (LDR)',
    'Distance Measurement using Ultrasonic Sensor',
    'Automatic Dustbin',
    'Fire Alarm System',
    'Temperature Monitoring System',
    'Servo Motor Sweep',
    'Smart Parking Sensor System',
    'Automatic Hand Sanitizer Dispenser',
    'Obstacle Detection Alarm',
    'Temperature Controlled Fan',
    'Smart Security Alarm System',
    'Intelligent Robotic Waste Bin',
  ],
  ai: [
    { unit: 'Unit 1 · Introduction to Artificial Intelligence', chapters: [
      'The Evolution of AI',
      'Applications and Benefits of AI',
      'Ethical Considerations in AI',
    ]},
    { unit: 'Unit 2 · Role of Data & Information, Evolution of Computing', chapters: [
      'Data and Information',
      'Evolution of Computing',
    ]},
    { unit: 'Unit 3 · Introduction to Data and Programming with Python', chapters: [
      'Familiarisation with Python',
      'Introduction to Data Types and Variables',
      'Introduction to Operators',
      'Conditional Statements',
      'Control Statements',
      'Functions',
    ]},
    { unit: 'Unit 4 · AI Concepts and AI Project Framework', chapters: [
      'AI Concepts',
      'AI Project Framework',
    ]},
  ],
  aiProjects: [
    'Smart Transport Management System',
    'AI-Enabled Query Management System',
    'AI-Enabled Smart School',
  ],
};

const GRADE_10 = {
  robotics: [
    { unit: 'Unit 1 · New Age Robotic Systems', chapters: [
      'Types of Robots',
      'Machines vs Robots',
      'Cobots',
    ]},
    { unit: 'Unit 2 · Components of Robots as a System', chapters: [
      'Introduction to Gears',
      'Sensors in Robotics',
      'Actuators',
      'Controller for a Robotic System',
      'Integrating Sensors, Actuators and Controller in a Robotic System',
    ]},
    { unit: 'Unit 3 · Visualisation, Design & Creation of Components', chapters: [
      'Application of Mechanical Blocks',
      'Visualisation of Motion',
      'Integrating Robots as a System',
    ]},
    { unit: 'Unit 4 · Decision Making in Machines / Computers', chapters: [
      'Automated versus Autonomous Systems',
      'Decision Making',
      'Machine Learning',
    ]},
  ],
  practical: [
    'LED Control using Arduino',
    'Push Button Controlled LED',
    'Ultrasonic Distance Measurement',
    'IR Sensor Object Detection and Counting',
    'Servo Motor Position Control',
    'Smart Automatic Door',
    'Smart Parking Distance Indicator',
    'DC Motor Direction Control',
    'Basic Robotic Car: Path Movement',
    'Hand-to-Go Robot',
    'Hand-to-Stop Robot',
    'Obstacle Avoiding Robot',
    'Edge Avoiding Robot',
    'Line Following Robot',
    'Multi-Sensor Autonomous Robot',
  ],
  ai: [
    { unit: 'Unit 1 · Machine Learning and Cybersecurity in Computing', chapters: [
      'Machine Intelligence',
      'Cybersecurity',
    ]},
    { unit: 'Unit 2 · Components of AI Project Framework', chapters: [
      'Problem Scoping',
      'Data Acquisition',
      'Data Exploration',
      'Modelling and Evaluation',
    ]},
    { unit: 'Unit 3 · Introduction to Data & Programming with Python', chapters: [
      'Modules and Packages',
      'Lists and Tuples in Python',
      'Strings',
    ]},
  ],
  aiProjects: [
    'Smart Transport Management System for a School',
    'AI-Enabled Query Management System for a School',
    'Smart School using AI and Python',
  ],
};

const TRUST_STATS = [
  { k: '400+',   v: 'ICSE & CBSE Schools' },
  { k: '1.47L+', v: 'Students Trained' },
  { k: '35+',    v: 'Cities across India' },
  { k: '4.8★',   v: 'Parent Satisfaction' },
];

const upsertMeta = (key, value, attr = 'name') => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
};
const upsertLink = (rel, href, extra = {}) => {
  const selKey = extra.hreflang ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]` : `link[rel="${rel}"]`;
  let el = document.head.querySelector(selKey);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href);
  Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
};
const upsertJsonLd = (id, obj) => {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
  el.textContent = JSON.stringify(obj);
};
// Canonical SEO-friendly URL for this landing page (also aliased in App.js routing).
const CANONICAL_PATH = '/school/icse-robotics-and-ai-curriculum-books-with-practical-activity-kits-for-class-9th-and10th';
const SEO_TITLE = 'ICSE - Robotics and AI Books with Practical Kit for Class 9th and 10th';
const SEO_DESCRIPTION = 'Robotics and AI Curriculum for ICSE with Robotics and AI Course and Practical Kit for Class 9th & 10th. STEM.org accredited kit + Grade 9 & 10 textbooks aligned to ICSE Group 3 Code 66 syllabus.';
const SEO_KEYWORDS = 'ICSE robotics, ICSE AI curriculum, ICSE Group 3, ICSE Code 66, Class 9 robotics, Class 10 robotics, Class 9 AI course, Class 10 AI course, robotics practical kit, robotics textbook Class 9, robotics textbook Class 10, OLL robotics kit, ICSE school robotics program';
const SEO_IMAGE = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/n2zt8acf_OLL%20Curriculum%20Brochure%20-%20ICSE%20Group%203%20Subject%20-%20Code%2066%20Curriculum%20%209th%20-%2010th%20%202026.png';

export default function RoboticsICSE910Landing() {
  const navigate = useNavigate();
  const [gradeTab, setGradeTab] = useState('9');
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [brochureForm, setBrochureForm] = useState({ school_name: '', phone: '' });
  const [brochureSubmitting, setBrochureSubmitting] = useState(false);
  const [brochureError, setBrochureError] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    const canonicalUrl = `${window.location.origin}${CANONICAL_PATH}`;
    // Core SEO
    document.title = SEO_TITLE;
    upsertMeta('description', SEO_DESCRIPTION);
    upsertMeta('keywords', SEO_KEYWORDS);
    upsertMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1');
    upsertMeta('author', 'OLL — Skills for All');
    // Canonical + hreflang
    upsertLink('canonical', canonicalUrl);
    upsertLink('alternate', canonicalUrl, { hreflang: 'en-in' });
    upsertLink('alternate', canonicalUrl, { hreflang: 'x-default' });
    // Open Graph (Facebook, WhatsApp, LinkedIn share previews)
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:site_name', 'OLL — Skills for All', 'property');
    upsertMeta('og:title', SEO_TITLE, 'property');
    upsertMeta('og:description', SEO_DESCRIPTION, 'property');
    upsertMeta('og:url', canonicalUrl, 'property');
    upsertMeta('og:image', SEO_IMAGE, 'property');
    upsertMeta('og:image:alt', 'OLL ICSE Grade 9 & 10 Robotics & AI Lab Kit — STEM.org accredited with 30+ hands-on activities', 'property');
    upsertMeta('og:image:width', '1200', 'property');
    upsertMeta('og:image:height', '630', 'property');
    upsertMeta('og:locale', 'en_IN', 'property');
    // Twitter card
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', SEO_TITLE);
    upsertMeta('twitter:description', SEO_DESCRIPTION);
    upsertMeta('twitter:image', SEO_IMAGE);
    upsertMeta('twitter:image:alt', 'OLL ICSE 9 & 10 Robotics & AI Lab Kit product photo');
    // JSON-LD structured data — Product + Course + Breadcrumbs (rich Google snippets)
    upsertJsonLd('ld-product-icse910', {
      '@context': 'https://schema.org', '@type': 'Product',
      name: 'ICSE Robotics & AI Curriculum + Practical Kit for Class 9 & 10',
      description: SEO_DESCRIPTION,
      image: [SEO_IMAGE],
      brand: { '@type': 'Brand', name: 'OLL — Skills for All' },
      category: 'Educational Robotics Kit',
      audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'ICSE Class 9 & 10' },
      offers: { '@type': 'Offer', priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: canonicalUrl },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '410' },
    });
    upsertJsonLd('ld-course-icse910', {
      '@context': 'https://schema.org', '@type': 'Course',
      name: 'ICSE Class 9 & 10 Robotics and AI (Group 3 · Code 66)',
      description: 'Board-exam-ready Robotics & AI curriculum mapped to ICSE Group 3 Code 66 syllabus for Classes 9 & 10 — 30+ practical activities, Python + AI projects, STEM.org-accredited kit.',
      provider: { '@type': 'Organization', name: 'OLL — Skills for All', sameAs: 'https://oll.co' },
      educationalLevel: 'Class 9 & 10',
      inLanguage: 'en-IN',
      hasCourseInstance: [{ '@type': 'CourseInstance', courseMode: 'blended', location: 'India' }],
    });
    upsertJsonLd('ld-breadcrumbs-icse910', {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',    item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Schools', item: `${window.location.origin}/school` },
        { '@type': 'ListItem', position: 3, name: 'ICSE Class 9 & 10 Robotics & AI', item: canonicalUrl },
      ],
    });
  }, []);

  const goBookDemo = () => navigate('/school?product=icse-9-10&source=icse-9-10-landing');
  const gradeData = gradeTab === '9' ? GRADE_9 : GRADE_10;

  const openBrochureModal = (e) => { if (e) e.preventDefault(); setBrochureError(''); setShowBrochureModal(true); };
  const submitBrochureLead = async (e) => {
    e.preventDefault();
    if (!brochureForm.school_name.trim() || !brochureForm.phone.trim()) {
      setBrochureError('Please fill in both fields.'); return;
    }
    setBrochureSubmitting(true); setBrochureError('');
    // Open the PDF synchronously in a new tab so the popup blocker doesn't block it
    // (popup blockers only fire on `window.open` calls outside a user gesture chain).
    const pdfWin = window.open(CURRICULUM_PDF, '_blank');
    try {
      const API = process.env.REACT_APP_BACKEND_URL;
      await fetch(`${API}/api/schools/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: brochureForm.school_name.trim(),
          contact_name: '',
          email: `lead_${brochureForm.phone.replace(/\D/g,'')}@pending.oll.co`,
          phone: brochureForm.phone.trim(),
          selected_offerings: ['9th & 10th ICSE'],
          programs_interested: ['Robotics'],
          source: 'icse-9-10-brochure-download',
          notes: 'Lead captured via ICSE 9-10 landing page — Curriculum PDF download gate.',
          assign_option: 'admin',
        }),
      });
      // If popup got blocked, fall back to same-tab navigation via a hidden anchor.
      if (!pdfWin || pdfWin.closed) {
        const a = document.createElement('a');
        a.href = CURRICULUM_PDF;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setShowBrochureModal(false);
      setBrochureForm({ school_name: '', phone: '' });
    } catch (err) {
      setBrochureError('Lead saved locally — opening PDF now.');
    } finally {
      setBrochureSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative" style={{
      background: 'linear-gradient(180deg, #FFFBF7 0%, #FFFFFF 40%, #FFF7F5 100%)',
      fontFamily: "'Proxima Nova','Montserrat',system-ui,sans-serif",
      color: '#0A1F44',
    }} data-testid="icse-9-10-landing">
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
        .icse-nav-pill { max-width: 1220px; margin: 0 auto; background: rgba(255,255,255,0.98); backdrop-filter: saturate(180%) blur(14px); border: 1px solid rgba(10,31,68,0.08); box-shadow: 0 20px 44px rgba(10,31,68,0.12); border-radius: 999px; display:flex; align-items:center; justify-content: space-between; padding: 8px 14px 8px 18px; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .icse-marquee { animation: marquee 30s linear infinite; }
        .icse-marquee:hover { animation-play-state: paused; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .icse-anim-fadeup   { animation: fadeUp .8s cubic-bezier(.22,.9,.34,1) both; }
        .icse-anim-delay-1  { animation-delay: .12s; }
        .icse-anim-delay-2  { animation-delay: .24s; }
        .icse-anim-delay-3  { animation-delay: .36s; }
        .icse-anim-delay-4  { animation-delay: .48s; }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        .icse-anim-float { animation: floatY 6s ease-in-out infinite; }
        @keyframes orbDrift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.08); } }
        .icse-orb-red, .icse-orb-blue, .icse-orb-gold { animation: orbDrift 14s ease-in-out infinite; }
        .icse-orb-blue { animation-delay: -4s; animation-duration: 18s; }
        .icse-orb-gold { animation-delay: -8s; animation-duration: 22s; }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.55); } 50% { box-shadow: 0 0 0 14px rgba(245,158,11,0); } }
        .icse-anim-pulse { animation: pulseGlow 2.4s ease-in-out infinite; }
        @keyframes sparkleSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .icse-anim-spin { animation: sparkleSpin 12s linear infinite; }
        @keyframes shimmerX { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .icse-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); background-size: 200% 100%; animation: shimmerX 3.5s ease-in-out infinite; }
        .icse-orb-red  { position:absolute; width:400px; height:400px; border-radius:50%; background:rgba(220,38,38,0.16); filter:blur(90px); pointer-events:none; }
        .icse-orb-blue { position:absolute; width:400px; height:400px; border-radius:50%; background:rgba(96,165,250,0.20); filter:blur(90px); pointer-events:none; }
        .icse-orb-gold { position:absolute; width:340px; height:340px; border-radius:50%; background:rgba(245,158,11,0.16); filter:blur(90px); pointer-events:none; }
      `}</style>

      {/* Background orbs (soft blushes, not walls of navy) */}
      <div className="icse-orb-red"  style={{ top: '-160px', left: '-140px' }} />
      <div className="icse-orb-blue" style={{ top: '20%',    right: '-140px' }} />
      <div className="icse-orb-gold" style={{ bottom: '30%', left: '-100px' }} />

      {/* ── Sticky Nav (uses fixed positioning — sticky is broken here because
          the app-wide `overflow-x: hidden` on html/body creates a scroll container
          which cancels `position: sticky` from working on children). ─────── */}
      <nav className="fixed top-3 left-0 right-0 z-50 px-3" data-testid="icse-nav">
        <div className="icse-nav-pill">
          <a href="/" className="flex items-center gap-3">
            <img src={OLL_LOGO_COLOR} alt="OLL — Skills for All logo · Official ICSE Robotics & AI kit partner" className="h-9 sm:h-10" width="120" height="40" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-[#0A1F44] border-l border-slate-200 pl-3 leading-tight">
              ICSE Class 9 &amp; 10<br/>Robotics · Code 66
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openBrochureModal}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0A1F44] px-3 py-2 rounded-full hover:bg-slate-100 transition"
              data-testid="icse-nav-download">
              <Download className="w-3.5 h-3.5" /> Curriculum PDF
            </button>
            <button onClick={goBookDemo} className="icse-btn primary" style={{ padding: '10px 20px', fontSize: '0.72rem' }} data-testid="icse-nav-cta">
              Book Demo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-10" data-testid="icse-hero">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/90 border border-emerald-200 rounded-full px-3 py-1.5 shadow-sm icse-anim-fadeup">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span className="icse-eyebrow text-amber-700">ICSE Topper Recommends</span>
            </div>
            <h1 className="icse-hero-h mt-5 text-[#0A1F44] icse-anim-fadeup icse-anim-delay-1" style={{ fontSize: 'clamp(2.2rem, 4.8vw, 4.2rem)' }}>
              Your 9<span className="lowercase">th</span> &amp; 10<span className="lowercase">th</span> Grade students can{' '}
              <span style={{ color: '#DC2626' }}>TOP</span>{' '}
              in the ICSE <span style={{ color: '#DC2626' }}>Robotics &amp; AI</span> Board Exams
            </h1>
            <p className="icse-light mt-6 text-slate-700 text-base sm:text-lg max-w-xl icse-anim-fadeup icse-anim-delay-2">
              The complete <strong className="text-[#0A1F44] font-bold">ICSE Group 3 · Code 66</strong> Robotics program.
              30+ hands-on activities, AI &amp; Python projects, and a build-to-innovate lab kit that
              takes students from Blinking LED to a Multi-Sensor Autonomous Robot.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 icse-anim-fadeup icse-anim-delay-3">
              <button onClick={goBookDemo} className="icse-btn primary" data-testid="icse-hero-cta">
                Book a School Demo <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={openBrochureModal} className="icse-btn outline" data-testid="icse-hero-download">
                <Download className="w-4 h-4" /> Download Brochure
              </button>
            </div>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TRUST_STATS.map((s, i) => (
                <div key={s.v}
                  className={`bg-white/80 border border-slate-100 rounded-3xl px-3 py-4 text-center shadow-sm icse-anim-fadeup icse-anim-delay-${i + 1}`}
                >
                  <div className="icse-hero-h text-3xl text-[#0A1F44]">{s.k}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 icse-light">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual — Featured Board Topper (replaces the kit GIF).
              Bigger and more emotionally resonant than a product photo. */}
          <div className="relative icse-anim-fadeup icse-anim-delay-2" data-testid="icse-hero-featured-winner">
            <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-[#0A1F44]/25 via-transparent to-[#DC2626]/25 blur-3xl icse-anim-spin" />
            <div className="relative bg-white rounded-[32px] p-5 sm:p-6 border border-amber-100 shadow-2xl icse-anim-float">
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 bg-[#0A1F44] px-3 py-1 rounded-full">
                  <Trophy className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">Board Topper · ICSE 2026</span>
                </div>
              </div>
              <div className="flex items-center gap-5">
                {/* Portrait */}
                <div className="relative flex-shrink-0">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#0A1F44] to-[#DC2626] blur-md opacity-60 icse-anim-pulse" />
                  {FEATURED_WINNER.photo ? (
                    <img src={FEATURED_WINNER.photo} alt={FEATURED_WINNER.name} className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-xl" />
                  ) : (
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,#0A1F44,#DC2626)' }}>
                      <span className="icse-hero-h text-white text-4xl">
                        {FEATURED_WINNER.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Name + school */}
                <div className="min-w-0">
                  <div className="icse-hero-h text-[#0A1F44] text-2xl sm:text-3xl leading-tight">{FEATURED_WINNER.name}</div>
                  <div className="icse-light text-sm text-slate-600 mt-1 leading-snug">
                    {FEATURED_WINNER.school}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">{FEATURED_WINNER.grade}</div>
                </div>
              </div>
              {/* Score */}
              <div className="mt-5 pt-5 border-t border-amber-100 flex items-center justify-between gap-4">
                <div>
                  <div className="icse-eyebrow text-[#0A1F44]">{FEATURED_WINNER.subject}</div>
                  <div className="icse-hero-h text-4xl sm:text-5xl mt-1" style={{
                    background: 'linear-gradient(135deg,#0A1F44,#DC2626)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                  }}>
                    {FEATURED_WINNER.score}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mt-0.5">Perfect Score</div>
                </div>
                <div className="text-right">
                  <div className="icse-light text-xs text-slate-500 max-w-[160px]">
                    "Every OLL project felt like magic I could code."
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Board Exam Toppers marquee ────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14" data-testid="icse-toppers">
        <div className="relative rounded-[36px] overflow-hidden pt-10 pb-10 sm:pt-14 sm:pb-14" style={{
          background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)',
        }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#DC2626]/40 blur-3xl" />
          <div className="absolute -bottom-14 -left-16 w-64 h-64 rounded-full bg-[#0A1F44]/25 blur-3xl" />

          {/* Heading */}
          <div className="relative text-center px-6 sm:px-12">
            <div className="icse-script text-[#DC2626] text-3xl">Results speak loudest</div>
            <h2 className="icse-display text-white text-4xl sm:text-5xl mt-1">OLL students top the board</h2>
            <p className="icse-light text-white/80 max-w-2xl mx-auto mt-3">Krishang isn't alone — here are other OLL-trained ICSE students who topped the Group 3 Robotics paper this year.</p>
          </div>

          {/* Marquee of the rest of the toppers */}
          <div className="relative overflow-hidden py-4 mt-10">
            <div className="flex gap-4 icse-marquee w-max">
              {[...BOARD_TOPPERS, ...BOARD_TOPPERS].map((w, i) => (
                <div key={i} className="bg-white/95 backdrop-blur border border-white/20 rounded-3xl shadow-xl p-5 min-w-[300px] flex items-center gap-4" data-testid={`icse-topper-${i}`}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${w.color}, ${w.color}CC)` }}>
                    <span className="icse-display text-white text-xl">{w.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#0A1F44] leading-tight">{w.name}</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5 icse-light">{w.school}</div>
                    <div className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-600">
                      <Trophy className="w-3 h-3" /> {w.score} · {w.grade}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ICSE schools using OLL Kit + Curriculum ───────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14" data-testid="icse-schools">
        <div className="text-center">
          <div className="icse-script text-[#DC2626] text-3xl">our partner schools</div>
          <h2 className="icse-display text-[#0A1F44] text-3xl sm:text-5xl mt-1">Schools already giving Robotics &amp; AI Board Exams.</h2>
          <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-2">Real classrooms using OLL Kit + Curriculum for ICSE Group 3 Robotics.</p>
        </div>
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {ICSE_SCHOOLS.map((s) => (
            <div key={s.name} className="bg-white rounded-3xl p-5 flex flex-col items-center justify-center min-h-[150px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow" data-testid={`icse-school-logo-${s.name.replace(/\s+/g, '-').toLowerCase()}`}>
              <img src={s.src} alt={s.name} className="max-h-16 w-auto object-contain" loading="lazy" />
              <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-600 text-center leading-tight">{s.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OLL's Formula for Creating Toppers ────────────────────────── */}
      <section className="relative py-16 overflow-hidden" data-testid="icse-formula" style={{
        background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 50%, #0A1F44 100%)',
      }}>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#DC2626]/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#60A5FA]/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="icse-script text-[#F59E0B] text-3xl">the winning method</div>
            <h2 className="icse-display text-white text-4xl sm:text-5xl mt-1">What's OLL's formula for creating Toppers?</h2>
            <p className="icse-light text-white/80 max-w-2xl mx-auto mt-3">
              Four non-negotiables baked into every OLL classroom — the reason our students keep
              landing on the ICSE Group 3 topper list, year after year.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {FORMULA_PILLARS.map(({ i: Icon, t, s }, idx) => (
              <div
                key={t}
                className="bg-white/95 backdrop-blur border border-white/20 rounded-3xl shadow-xl p-6 sm:p-7 flex gap-4 icse-anim-fadeup transition-transform duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${idx * 0.12}s` }}
                data-testid={`icse-formula-pillar-${idx + 1}`}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg,#DC2626,#7f1d1d)' }}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="icse-display text-[#0A1F44] text-xl">{t}</div>
                  <div className="icse-light text-sm text-slate-600 mt-1.5 leading-relaxed">{s}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={goBookDemo} className="icse-btn primary" data-testid="icse-formula-cta">
              See it in action — Book a Demo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Book Comparison — Grade 9 vs Grade 10 ─────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="icse-book-compare">
        <div className="text-center mb-10">
          <div className="icse-script text-[#DC2626] text-3xl">a closer look at the books</div>
          <h2 className="icse-display text-[#0A1F44] text-4xl sm:text-5xl mt-1">ICSE Robotics and Artificial Intelligence Books for Class 9th and 10th.</h2>
          <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-2">Every page, chapter and activity for both classes, laid out so you know exactly what your students will build.</p>
        </div>

        {/* Comparison table */}
        <div className="relative bg-white rounded-[28px] border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="icse-book-compare-table">
              <thead className="bg-gradient-to-r from-[#DC2626]/10 via-white to-[#0A1F44]/10">
                <tr>
                  <th className="text-left px-4 sm:px-6 pt-6 pb-4 icse-eyebrow text-slate-500 w-1/4 align-bottom">What's inside</th>
                  <th className="text-center px-4 sm:px-6 pt-6 pb-4 align-bottom border-r border-slate-200">
                    <a href={CURRICULUM_PDF} target="_blank" rel="noreferrer" className="group inline-block" data-testid="icse-book-cover-9" title="Preview Grade 9 · Code 66">
                      <img src={BOOK_GRADE_9} alt="OLL ICSE Class 9 Robotics & AI textbook · Group 3 Subject Code 66 curriculum book (Grade 9)" className="h-[220px] sm:h-[260px] w-auto mx-auto object-contain drop-shadow-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105" loading="lazy" />
                      <div className="mt-3 icse-display text-[#0A1F44] text-2xl">Grade 9</div>
                    </a>
                  </th>
                  <th className="text-center px-4 sm:px-6 pt-6 pb-4 align-bottom">
                    <a href={CURRICULUM_PDF} target="_blank" rel="noreferrer" className="group inline-block" data-testid="icse-book-cover-10" title="Preview Grade 10 · Code 66">
                      <img src={BOOK_GRADE_10} alt="OLL ICSE Class 10 Robotics & AI textbook · Group 3 Subject Code 66 curriculum book (Grade 10)" className="h-[220px] sm:h-[260px] w-auto mx-auto object-contain drop-shadow-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105" loading="lazy" />
                      <div className="mt-3 icse-display text-[#0A1F44] text-2xl">Grade 10</div>
                    </a>
                  </th>
                </tr>
              </thead>
              <tbody>
                {BOOK_COMPARISON.map((row, i) => (
                  <tr key={row.label} className={i % 2 ? 'bg-slate-50/60' : 'bg-white'} data-testid={`icse-book-compare-row-${i}`}>
                    <td className="align-top px-4 sm:px-6 py-4 font-bold text-[#0A1F44] icse-body">{row.label}</td>
                    <td className="align-top px-4 sm:px-6 py-4 icse-light text-slate-700 border-r border-slate-200">{row.g9}</td>
                    <td className="align-top px-4 sm:px-6 py-4 icse-light text-slate-700">{row.g10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Practical Hands-on Kits ───────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="icse-practical-kits">
        <div className="text-center mb-10">
          <div className="icse-script text-[#DC2626] text-3xl">what's in the box</div>
          <h2 className="icse-display text-[#0A1F44] text-4xl sm:text-5xl mt-1">Practical hands-on Kits for Robotics Lab Activities.</h2>
          <p className="icse-body text-slate-600 max-w-2xl mx-auto mt-2">Everything a Grade 9 or Grade 10 ICSE classroom needs — an organised STEM.org accredited kit with 36 curated components and a curriculum that unlocks 30+ projects.</p>
        </div>

        {/* Two product photos side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="relative icse-anim-fadeup">
            <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-tr from-[#DC2626]/20 to-[#0A1F44]/15 blur-3xl" />
            <div className="relative bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-xl">
              <img src={KIT_BOX_PRODUCT} alt="OLL ICSE Grade 9 & 10 Robotics & AI Lab Kit — STEM.org accredited transparent case with 30+ hands-on activities" className="w-full h-[280px] sm:h-[340px] object-contain bg-white p-3" loading="lazy" />
              <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 icse-body">The Kit Box</div>
                  <div className="text-sm font-bold text-[#0A1F44]">STEM.org Accredited · 30+ Activities</div>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#DC2626] px-3 py-1.5 rounded-full">
                  <Award className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">Certified</span>
                </div>
              </div>
            </div>
          </div>
          <div className="relative icse-anim-fadeup icse-anim-delay-1">
            <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-tr from-[#0A1F44]/20 to-[#DC2626]/15 blur-3xl" />
            <div className="relative bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-xl">
              <img src={KIT_COMPONENTS} alt="OLL ICSE Robotics kit components tray — Arduino, sensors, motors, wires, LEDs and mechanical parts for Class 9 & 10 practical activities" className="w-full h-[280px] sm:h-[340px] object-contain bg-slate-50 p-3" loading="lazy" />
              <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 icse-body">Components Tray</div>
                  <div className="text-sm font-bold text-[#0A1F44]">36 Curated Items · Labeled Slots</div>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#0A1F44] px-3 py-1.5 rounded-full">
                  <Package className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">Included</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Components list + Highlights side-by-side */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Kit Components table */}
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl overflow-hidden" data-testid="icse-kit-components-list">
            <div className="px-5 py-4 bg-gradient-to-r from-[#DC2626] to-[#7f1d1d]">
              <div className="icse-display text-white text-2xl">Kit Components</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/80 mt-0.5">36 items · every activity covered</div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {KIT_COMPONENTS_LIST.map((c, i) => (
                <div key={c} className="flex items-start gap-2 icse-body text-sm text-slate-700">
                  <span className="tabular-nums text-[11px] font-bold text-slate-400 mt-0.5 w-6 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kit Highlights */}
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#0A1F44] to-[#1E3A5F]">
              <div className="icse-display text-white text-2xl">Why Choose Ours</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/80 mt-0.5">Kit highlights</div>
            </div>
            <div className="p-5 space-y-4">
              {KIT_HIGHLIGHTS_2.map(({ i: Icon, t, s }) => (
                <div key={t} className="flex gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#DC2626,#7f1d1d)' }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0A1F44]">{t}</div>
                    <div className="icse-body text-sm text-slate-600 mt-0.5">{s}</div>
                  </div>
                </div>
              ))}
              <button onClick={goBookDemo} className="icse-btn primary w-full justify-center mt-4" data-testid="icse-practical-kits-cta">
                Book a School Demo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Curriculum Highlights (Grade 9 / Grade 10 tabs) ───────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="icse-curriculum">
        <div className="text-center">
          <div className="icse-script text-[#DC2626] text-3xl">structured curriculum</div>
          <h2 className="icse-display text-[#0A1F44] text-4xl sm:text-5xl mt-1">Follow a Structured Curriculum Mapped as per ICSE guidelines</h2>
          <p className="icse-light text-slate-600 max-w-2xl mx-auto mt-3">
            Every chapter and every lab activity is lifted verbatim from the ICSE Group 3 Code 66 syllabus for Classes 9 &amp; 10.
          </p>
        </div>

        <div className="mt-10 flex justify-center gap-3">
          {['9', '10'].map((g) => (
            <button
              key={g}
              onClick={() => setGradeTab(g)}
              className={`icse-btn ${gradeTab === g ? 'primary' : 'outline'}`}
              data-testid={`icse-grade-tab-${g}`}
            >
              Grade {g}
            </button>
          ))}
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-5">
          <CurriculumBlock title="Robotics · Theory"          icon={Cpu}     items={gradeData.robotics}   accent="#DC2626" testid="icse-block-robotics" />
          <CurriculumBlock title="Robotics · Practicals"      icon={Package} items={gradeData.practical}  accent="#0A1F44" testid="icse-block-practical" previewImg={PROJECT_ROBOTICS} previewAlt="Obstacle-avoiding robotic car with ultrasonic sensor — ICSE Class 9 & 10 Robotics practical project built using OLL kit" />
          <CurriculumBlock title="AI &amp; Python · Theory"   icon={Brain}   items={gradeData.ai}         accent="#60A5FA" testid="icse-block-ai" />
          <CurriculumBlock title="AI &amp; Python · Practicals" icon={Code2} items={gradeData.aiProjects} accent="#10B981" testid="icse-block-aiprojects" previewImg={PROJECT_AI} previewAlt="Python-based Library Management System GUI — ICSE Class 9 & 10 AI practical project sample" />
        </div>

        <div className="mt-10 text-center">
          <button type="button" onClick={openBrochureModal} className="icse-btn outline" data-testid="icse-curriculum-download">
            <Download className="w-4 h-4" /> View Full Brochure (PDF)
          </button>
        </div>
      </section>

      {/* ── Why OLL / Trust ───────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="icse-why-oll">
        <div className="bg-white rounded-[36px] border border-slate-100 shadow-lg p-6 sm:p-10 grid md:grid-cols-3 gap-8 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[#DC2626]/15 blur-3xl" />
          <div className="absolute -bottom-14 -left-10 w-52 h-52 rounded-full bg-[#60A5FA]/15 blur-3xl" />
          {[
            { i: ShieldCheck, t: 'NEP 2020 &amp; NCF 2023', s: 'Every topic mapped to the National Education Policy framework — future-ready by design.' },
            { i: Award,       t: 'STEM.org Accredited',    s: 'Independently reviewed for pedagogy, safety and outcomes. A credential parents recognise.' },
            { i: Users,       t: '400+ Partner Schools',   s: 'From Mumbai to Guwahati, 1.47L+ students already learn Robotics with OLL every week.' },
          ].map(({ i: Icon, t, s }) => (
            <div key={t} className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#0A1F44,#B45309)' }}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="icse-display text-[#0A1F44] text-2xl" dangerouslySetInnerHTML={{ __html: t }} />
              <div className="icse-light text-sm text-slate-600 mt-2">{s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA (single dark panel — used sparingly for contrast) ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16" data-testid="icse-final-cta">
        <div className="relative rounded-[36px] overflow-hidden p-8 sm:p-14 text-center" style={{
          background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)',
        }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#DC2626]/40 blur-3xl" />
          <div className="absolute -bottom-14 -left-16 w-64 h-64 rounded-full bg-[#0A1F44]/25 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#DC2626]" />
              <span className="icse-eyebrow text-white/90">Book a 30-min demo · Kit + Curriculum walkthrough</span>
            </div>
            <div className="icse-script text-[#DC2626] text-3xl mt-4">let's talk</div>
            <h2 className="icse-display text-white text-4xl sm:text-6xl mt-1">Bring ICSE Robotics to your school.</h2>
            <p className="icse-light text-white/80 mt-4 max-w-2xl mx-auto">
              Our schools team will walk you through the kit, the syllabus mapping, teacher training
              and exam-day preparedness — in a single 30-minute session.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <button onClick={goBookDemo} className="icse-btn primary" data-testid="icse-final-cta-btn">
                Book a School Demo <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={openBrochureModal} className="icse-btn ghost">
                <Download className="w-4 h-4" /> Download Curriculum
              </button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-white/70 text-xs icse-light">
              <CheckCircle2 className="w-3.5 h-3.5" /> No commitment · No cost · Just answers.
            </div>
          </div>
        </div>
      </section>

      {/* Simple footer */}
      <footer className="border-t border-slate-100 py-8 text-center text-slate-500 text-xs icse-light">
        © 2026 OLL · Skills for All · <a href="/school" className="hover:text-[#DC2626] font-bold">Explore all school programs</a>
      </footer>

      {/* ── Brochure Lead-Capture Modal ─────────────────────────────── */}
      {showBrochureModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" data-testid="icse-brochure-modal" onClick={() => setShowBrochureModal(false)}>
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)' }}>
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#DC2626]" />
                <span className="icse-eyebrow text-white/80">One quick step</span>
              </div>
              <div className="icse-script text-[#DC2626] text-2xl mt-2">get the full brochure</div>
              <h3 className="icse-display text-white text-2xl sm:text-3xl mt-1">Where should we send the ICSE 9 &amp; 10 curriculum?</h3>
              <p className="icse-light text-white/70 text-sm mt-2">Enter your school name and phone number — we'll open the PDF and a schools-team advisor will reach out with a demo slot.</p>
            </div>
            <form onSubmit={submitBrochureLead} className="p-6 sm:p-8 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">School Name *</label>
                <input type="text" required autoFocus value={brochureForm.school_name}
                  onChange={(e) => setBrochureForm({ ...brochureForm, school_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 icse-body text-slate-800"
                  placeholder="e.g., Sanjeevani World School" data-testid="icse-brochure-school" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Contact Phone Number *</label>
                <input type="tel" required value={brochureForm.phone}
                  onChange={(e) => setBrochureForm({ ...brochureForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 icse-body text-slate-800"
                  placeholder="+91 98XXXXXXXX" data-testid="icse-brochure-phone" />
              </div>
              {brochureError && <div className="text-sm text-[#DC2626] font-bold">{brochureError}</div>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowBrochureModal(false)} className="icse-btn outline flex-1 justify-center" data-testid="icse-brochure-cancel">Cancel</button>
                <button type="submit" disabled={brochureSubmitting} className="icse-btn primary flex-1 justify-center" data-testid="icse-brochure-submit">
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

function CurriculumBlock({ title, icon: Icon, items, accent, testid, previewImg, previewAlt }) {
  const isGrouped = items.length > 0 && typeof items[0] === 'object';
  return (
    <div className="icse-card p-6 sm:p-7" data-testid={testid}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: accent }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="icse-display text-[#0A1F44] text-xl" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      {previewImg && (
        <div className="mb-5 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
          <img src={previewImg} alt={previewAlt || ''} className="w-full h-40 object-contain bg-white p-2" loading="lazy" />
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-t border-slate-100">
            Sample student project
          </div>
        </div>
      )}
      {isGrouped ? (
        <div className="space-y-4">
          {items.map((group) => (
            <div key={group.unit}>
              <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>{group.unit}</div>
              <ul className="space-y-1.5 pl-1">
                {group.chapters.map((c) => (
                  <li key={c} className="flex gap-2 icse-light text-slate-700 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: accent }} />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6">
          {items.map((t, i) => (
            <li key={t} className="flex gap-2 icse-light text-slate-700 text-sm">
              <span className="tabular-nums text-[11px] font-bold mt-0.5 w-5 flex-shrink-0" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
