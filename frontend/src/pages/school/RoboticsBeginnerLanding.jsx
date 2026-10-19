/**
 * OLL Robotics Beginner — Full-page Future-Skills pitch for schools.
 * Structure (per brief):
 *   1)  Hero — "Turn your school into a Future-Skills powerhouse" + winner-student slider
 *   2)  IIT Bombay Techfest — "Put your school on the big stage"
 *   3)  STEM.org Certification — "Recognition that goes beyond the classroom"
 *   4)  Parents Satisfaction — build → demonstrate → watch → photograph → share
 *   5)  Future Skills bouquet — horizontal slider of 9 disciplines
 *   6)  What the school gets — features grid
 *   7)  What your school gets — 3 pillars
 *   8)  About OLL — Shark Tank / KBC + trust stats (4.8/5 · 98% renewal · 500+ schools)
 *   9)  Growth path — Foundation → Intermediate → Advanced
 *   10) Final CTA — Book a School Demo (→ /school SchoolFunnel flow)
 *
 * Design: Anton headlines, Libre Baskerville quotes, Caveat accents, Inter body.
 * Palette: navy #0A1F44, red #DC2626, light blue #60A5FA. Red/blue/light-blue
 * blur orbs and glass panels throughout, matching OLL Brand Guidelines PDF.
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import Footer from '../../components/Footer';
import LMSSection from '../../components/school/LMSSection';
import SchoolBreadcrumbs from '../../components/school/SchoolBreadcrumbs';
import SchoolRelatedPrograms from '../../components/school/SchoolRelatedPrograms';
import { RbAboutOLL, RbRealSchools, SCHOOL_VIDEOS } from '../../components/school/RbTrustSections';
import CurriculumGateModal from '../../components/school/CurriculumGateModal';
import {
  ArrowRight, Phone, Download, ChevronLeft, ChevronRight, Trophy,
  School, GraduationCap, MapPin, Cpu, Code2, Brain, Boxes, Lightbulb,
  FlaskConical, Rocket, Plane, Radio, BookOpen, Package, ClipboardCheck,
  Award, LifeBuoy, Heart, Sparkles, PlayCircle, Play, Quote, Star, CheckCircle2,
  Camera, Share2, Eye, Hammer, Users, Cog, Zap, TerminalSquare, Wifi,
  Calculator, Palette, Gift,
} from 'lucide-react';

const CURRICULUM_PDF =
  'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/qorbag8g_OLL%20-%20Beginner%20Curriculum%202026-27%20%282%29.pdf';

const ROBOTICS_GIF =
  'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif';

const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

const TECHFEST_LOGO =
  'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/cj9em2vn_image.png';

const SKILLS_LIST = 'Robotics • Coding • AI • 3D Design • STEM • Space • Drones';

const SKILLS = [
  { l: 'Drones',           src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&h=800&fit=crop' },
  { l: 'Robotics',         src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif' },
  { l: 'Design Thinking',  src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=800&fit=crop' },
  { l: 'Coding',           src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/8i8zob06_Pyhton%20.gif' },
  { l: 'Aeromodelling',    src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/w1wq10h8_image.png' },
  { l: '3D Design',        src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/xj8dva2y_3D%20Design.gif' },
  { l: 'Space Technology', src: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=600&h=800&fit=crop' },
];

const SCHOOL_GETS = [
  { i: BookOpen,        t: 'Structured Curriculum',       s: 'Grade-wise progression designed for beginner learners.' },
  { i: Package,         t: 'Hands-on Kits',               s: 'Students learn by building, experimenting and creating.' },
  { i: BookOpen,        t: 'Interactive Books',           s: 'Engaging student books mapped to every lesson.' },
  { i: Hammer,          t: 'Teacher Empowerment Program', s: 'Training + lesson plans + rubrics so teachers own the classroom from day one.' },
  { i: ClipboardCheck,  t: 'Assessment & Certification',  s: 'Track practical & conceptual learning. Certify every child.' },
  { i: Trophy,          t: 'Showcase Opportunities',      s: 'Exhibitions and competitions to demonstrate what they built.' },
  { i: LifeBuoy,        t: 'Service & Support',           s: 'Onboarding, refreshers and a dedicated success partner.' },
  { i: TerminalSquare,  t: 'LMS & Reporting',             s: 'A Learning Management System with progress dashboards for teachers and parents.' },
];

const BOOKS = [
  { grade: 'Grade 1', theme: 'Be a Creator',    src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/9qs738wd_A3%20Book%20Chart.png',       spine: '#7C3AED', flip: 'https://heyzine.com/flip-book/b88e40c849.html' },
  { grade: 'Grade 2', theme: "Let's Explore",   src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/4y6z7vtw_A3%20Book%20Chart%20%281%29.png', spine: '#0EA5E9', flip: 'https://heyzine.com/flip-book/5e35827f8b.html' },
  { grade: 'Grade 3', theme: 'Storm Rescue',    src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/mzm4izo2_A3%20Book%20Chart%20%284%29.png', spine: '#1E3A8A', flip: 'https://heyzine.com/flip-book/6302e4b924.html' },
  { grade: 'Grade 4', theme: 'Cyber Lab',       src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/fd8swouq_A3%20Book%20Chart%20%282%29.png', spine: '#059669', flip: 'https://heyzine.com/flip-book/b65650ada0.html' },
  { grade: 'Grade 5', theme: 'Maze Mission',    src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h26jsi3o_A3%20Book%20Chart%20%283%29.png', spine: '#EA580C', flip: 'https://heyzine.com/flip-book/044922eea3.html' },
  { grade: 'Grade 6', theme: 'Robot Academy',   src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/v97f8iit_A3%20Book%20Chart%20%285%29.png', spine: '#0891B2', flip: 'https://heyzine.com/flip-book/93d70c702f.html' },
  { grade: 'Grade 7', theme: 'AI Matrix',       src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h4cauczc_A3%20Book%20Chart%20%286%29.png', spine: '#111827', flip: 'https://heyzine.com/flip-book/a26a34f273.html' },
  { grade: 'Grade 8', theme: 'Human + Machine', src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/el5uo7fb_A3%20Book%20Chart%20%287%29.png', spine: '#0284C7', flip: 'https://heyzine.com/flip-book/32be158b45.html' },
];

const PARENT_QUOTES = [
  'My child couldn\u2019t stop talking about what they built.',
  'It\u2019s amazing to see them actually create something.',
  'Every week she comes home with a new project — and a bigger smile.',
];

const PARTS_BREAKDOWN = [
  { i: Cog,   t: 'WitBrix Construction', s: 'Chassis, frames, wheels, mounts — snap-fit building system',              color: '#DC2626', img: '/kits/pillar-witbrix.png' },
  { i: Code2, t: 'WitPro Coding Block',  s: 'Block-based to Python — grade by grade programming platform',              color: '#0EA5E9', img: '/kits/pillar-witpro.png' },
  { i: Brain, t: 'AI Vision Blox',       s: 'Vision, voice, ML — real AI projects from Grade 4 upward',                 color: '#7C3AED', img: '/kits/pillar-ai-vision.png' },
  { i: Cpu,   t: 'Electronics',          s: 'Micro-controllers, sensors, motors — plus open-source Arduino',            color: '#1E3A8A', img: '/kits/pillar-electronics.png' },
];

const TAKE_HOME_KITS = [
  { grade: 'Grade 1', theme: 'Be a Creator',    src: '/kits/grade-1.png', bg: '#FBBF24', unboxing: 'https://www.youtube.com/watch?v=xHhMLBzB_GU' },
  { grade: 'Grade 2', theme: "Let's Explore",   src: '/kits/grade-2.png', bg: '#F97316', unboxing: 'https://www.youtube.com/watch?v=xHhMLBzB_GU' },
  { grade: 'Grade 3', theme: 'Discover',        src: '/kits/grade-3.png', bg: '#84CC16', unboxing: 'https://www.youtube.com/watch?v=xHhMLBzB_GU' },
  { grade: 'Grade 4', theme: 'Innovate',        src: '/kits/grade-4.png', bg: '#22C55E', unboxing: 'https://www.youtube.com/watch?v=xHhMLBzB_GU' },
  { grade: 'Grade 5', theme: 'Prototype',       src: '/kits/grade-5.png', bg: '#1E3A8A', unboxing: 'https://www.youtube.com/watch?v=xHhMLBzB_GU' },
  { grade: 'Grade 6', theme: 'Robot Academy',   src: '/kits/grade-6.png', bg: '#0F172A', unboxing: 'https://www.youtube.com/watch?v=xHhMLBzB_GU' },
  { grade: 'Grade 7', theme: 'AI Matrix',       src: '/kits/grade-7.png', bg: '#7C3AED', unboxing: 'https://www.youtube.com/watch?v=xHhMLBzB_GU' },
  { grade: 'Grade 8', theme: 'Human + Machine', src: '/kits/grade-8.png', bg: '#0891B2', unboxing: 'https://www.youtube.com/watch?v=xHhMLBzB_GU' },
];

const LAB_KITS = [
  { title: 'Master Lab Kit · Junior',   sub: 'Grades 1–5 · Class-set of components',  src: '/kits/master-lab.png',   bg: '#0EA5E9' },
  { title: 'Master Lab Kit · Advanced', sub: 'Grades 6–8 · Robotics, Coding & A.I.',  src: '/kits/master-lab-2.png', bg: '#1E3A8A' },
];

const TRUST_STATS = [
  { k: '4.8/5', l: 'School Rating',   i: Star,           color: '#DC2626' },
  { k: '98%',   l: 'Renewal Rate',    i: Heart,          color: '#1E3A8A' },
  { k: '500+',  l: 'Schools',         i: School,         color: '#60A5FA' },
  { k: '35',    l: 'Cities Reached',  i: MapPin,         color: '#DC2626' },
];

const GROWTH_PATH = [
  { level: 'Foundation',   verb: 'Explore',           s: 'Beginner Robotics · Grades 1–4', color: '#60A5FA' },
  { level: 'Intermediate', verb: 'Build & Compete',   s: 'Sensors, coding, teamwork · Grades 5–7', color: '#1E3A8A' },
  { level: 'Advanced',     verb: 'Innovate',          s: 'IoT, automation, showcase · Grades 8–10', color: '#DC2626' },
];

export default function RoboticsBeginnerLanding() {
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const openGate = (e) => { e.preventDefault(); setGateOpen(true); };
  const [winIdx, setWinIdx] = useState(0);
  const [parentIdx, setParentIdx] = useState(0);
  const [curtainProgress, setCurtainProgress] = useState(0);
  const [chartKey, setChartKey] = useState(0);
  const [growthCount, setGrowthCount] = useState(0);
  const [activeKit, setActiveKit] = useState(null);
  // Currently-open book for the sample-flipbook lightbox (holds the BOOKS row).
  const [activeBook, setActiveBook] = useState(null);
  const chartRef = useRef(null);
  const certRef = useRef(null);
  const bookDemo = () => navigate('/school');

  // Scroll-triggered admissions chart animation — re-plays every time it enters the viewport
  useEffect(() => {
    if (!chartRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setChartKey((k) => k + 1);
            // Count up 0 → 21
            let start = 0;
            const target = 21;
            const step = () => {
              start += 1;
              setGrowthCount(start);
              if (start < target) setTimeout(step, 55);
            };
            setGrowthCount(0);
            setTimeout(step, 300);
          }
        });
      },
      { threshold: 0.35 }
    );
    obs.observe(chartRef.current);
    return () => obs.disconnect();
  }, []);

  // Certificate scroll-in "grow big" animation — toggles class on enter/leave so it replays
  useEffect(() => {
    if (!certRef.current) return;
    const el = certRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) el.classList.add('rb-cert-in');
          else el.classList.remove('rb-cert-in');
        });
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const w = setInterval(() => setWinIdx((i) => (i + 1) % SCHOOL_VIDEOS.length), 6500);
    const p = setInterval(() => setParentIdx((i) => (i + 1) % PARENT_QUOTES.length), 4500);
    // Curtains open progressively with scroll — tied to stage element position in viewport
    const onScroll = () => {
      const el = document.querySelector('[data-testid="rb-stage"]');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when stage top is at bottom of viewport, 1 when stage top has scrolled 70% up
      const raw = (vh - rect.top) / (vh * 0.85);
      const clamped = Math.max(0, Math.min(1, raw));
      setCurtainProgress(clamped);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearInterval(w); clearInterval(p); window.removeEventListener('scroll', onScroll); };
  }, []);

  const goWin = (i) => setWinIdx((i + SCHOOL_VIDEOS.length) % SCHOOL_VIDEOS.length);
  const currentVideo = SCHOOL_VIDEOS[winIdx];

  // ── SEO: imperative <head> injection (react-helmet-async unreliable) ──
  useEffect(() => {
    const CANONICAL = 'https://oll.co/school/robotics-ai-lab-for-schools-turnkey-solution/';
    const TITLE = 'AI and Robotics Lab for Schools · Grades 1-8 | OLL Turnkey Solution';
    const DESC = "OLL's turnkey Robotics & AI Lab for schools — end-to-end program for Grades 1-8 with curriculum, kits, teacher training and STEM.org accreditation. Aligned with NEP 2020 & NCF 2023.";
    const KEYWORDS = "robotics and ai lab for schools, robotics lab setup, ai lab for schools, turnkey robotics program, robotics for schools, school robotics program, robotics curriculum India, STEM lab setup, ICSE robotics, CBSE robotics, NEP 2020 robotics, NCF 2023, robotics grade 1 to 8, STEM.org accredited, school robotics lab, K-12 robotics, ai education for kids";
    const OG_IMG = 'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
    document.title = TITLE;
    const upsertMeta = (key, value, attr = 'name') => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', value);
    };
    upsertMeta('description', DESC);
    upsertMeta('keywords', KEYWORDS);
    upsertMeta('robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    upsertMeta('theme-color', '#0A1F44');
    upsertMeta('og:type', 'product', 'property');
    upsertMeta('og:url', CANONICAL, 'property');
    upsertMeta('og:title', 'AI & Robotics Lab for Schools (Grade 1–8) | OLL Turnkey Solution', 'property');
    upsertMeta('og:description', "OLL's turnkey Robotics & AI Lab for schools — curriculum, kits, teacher training, competitions and STEM.org-accredited outcomes. Grades 1–8. Featured on Shark Tank India & KBC.", 'property');
    upsertMeta('og:image', OG_IMG, 'property');
    upsertMeta('og:image:width', '1200', 'property');
    upsertMeta('og:image:height', '630', 'property');
    upsertMeta('og:site_name', 'OLL', 'property');
    upsertMeta('og:locale', 'en_IN', 'property');
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:url', CANONICAL);
    upsertMeta('twitter:title', 'AI & Robotics Lab for Schools (Grade 1–8) | OLL');
    upsertMeta('twitter:description', 'Turnkey Robotics & AI Lab for Grades 1–8. Curriculum, kits, teacher training & STEM.org-accredited outcomes.');
    upsertMeta('twitter:image', OG_IMG);
    let canon = document.head.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
    canon.href = CANONICAL;
    const schemas = [
      {
        "@context": "https://schema.org", "@type": "Course",
        "name": "AI & Robotics Lab Program for Schools (Grade 1–8)",
        "description": "OLL's turnkey Robotics & AI Lab program for schools — end-to-end curriculum for Grades 1–8 with lab kits, teacher training, competitions and STEM.org-accredited outcomes. Aligned with NEP 2020 & NCF 2023. Designed for CBSE, ICSE and State Board schools.",
        "url": CANONICAL, "inLanguage": "en",
        "educationalLevel": "Primary & Middle School (Grades 1–8)",
        "coursePrerequisites": "None — a year-round Robotics & AI program.",
        "teaches": ["Robotics", "Artificial Intelligence", "Electronics", "Mechanics", "Block Coding", "Python", "IoT", "STEM Reasoning", "Design Thinking"],
        "provider": { "@type": "EducationalOrganization", "name": "OLL", "url": "https://oll.co", "logo": "https://oll.co/favicon.png", "sameAs": ["https://www.instagram.com/ollindia/", "https://www.linkedin.com/company/ollindia/", "https://www.youtube.com/@ollindia"] },
        "hasCourseInstance": { "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Partner Schools across India" }, "courseWorkload": "PT2H" },
        "audience": { "@type": "EducationalAudience", "educationalRole": "student", "audienceType": "Children · Grades 1–8" },
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "500", "bestRating": "5", "worstRating": "1" },
        "offers": { "@type": "Offer", "category": "School Program", "priceCurrency": "INR", "availability": "https://schema.org/InStock", "url": "https://oll.co/school" }
      },
      {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "OLL", "item": "https://oll.co/" },
          { "@type": "ListItem", "position": 2, "name": "For Schools", "item": "https://oll.co/school" },
          { "@type": "ListItem", "position": 3, "name": "Robotics", "item": "https://oll.co/school#robotics" },
          { "@type": "ListItem", "position": 4, "name": "Robotics & AI Lab (Grade 1–8)", "item": CANONICAL }
        ]
      },
      {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "Which grades is the OLL Robotics & AI Lab program for?", "acceptedAnswer": { "@type": "Answer", "text": "Grades 1 to 8. It is a year-round Robotics & AI program with age-appropriate builds, block-coding, Python and STEM problem-solving — aligned with NEP 2020 & NCF 2023." } },
          { "@type": "Question", "name": "Does the program come with a Robotics lab kit for the school?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Each school receives grade-wise hands-on kits (sensors, motors, structural parts, storage) along with printed workbooks and a teacher's manual." } },
          { "@type": "Question", "name": "Is the curriculum accredited?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The OLL Robotics curriculum is STEM.org accredited and is aligned with CBSE, ICSE and major State Board learning outcomes." } },
          { "@type": "Question", "name": "Do you provide teacher training?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. All partner schools get structured teacher-training sessions, ongoing pedagogy support and access to lesson plans through the OLL LMS." } },
          { "@type": "Question", "name": "Has OLL been featured on national television?", "acceptedAnswer": { "@type": "Answer", "text": "Yes — OLL was featured on Shark Tank India (Season 2) and Kaun Banega Crorepati with Amitabh Bachchan." } },
          { "@type": "Question", "name": "How does a school get started?", "acceptedAnswer": { "@type": "Answer", "text": "Book a free live demo with our school program expert. We walk you through the lab setup, syllabus, kit and outcomes tailored to your board and student count." } }
        ]
      },
      {
        "@context": "https://schema.org", "@type": "Product",
        "name": "OLL Robotics & AI Lab — Grade 1–8 School Program",
        "description": "Turnkey Robotics & AI Lab program for CBSE / ICSE / State Board schools: year-long curriculum for Grades 1–8, hands-on kits, teacher training and STEM.org-accredited outcomes. Aligned with NEP 2020 & NCF 2023.",
        "image": ["https://oll.co/favicon.png"],
        "brand": { "@type": "Brand", "name": "OLL" },
        "category": "K-12 School Programs · Robotics",
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "500", "bestRating": "5", "worstRating": "1" },
        "offers": { "@type": "AggregateOffer", "priceCurrency": "INR", "lowPrice": "0", "offerCount": "1", "availability": "https://schema.org/InStock", "url": "https://oll.co/school" }
      }
    ];
    const addedIds = [];
    schemas.forEach((obj, i) => {
      const id = `rb-jsonld-${i}`;
      let el = document.getElementById(id);
      if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
      el.textContent = JSON.stringify(obj);
      addedIds.push(id);
    });
    return () => { addedIds.forEach((id) => { const el = document.getElementById(id); if (el) el.remove(); }); };
  }, []);

  return (
    <div className="rb-page">
      <Toaster position="top-right" richColors />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400;700&family=Montserrat:wght@300;400;500;600;700&display=swap');

        /* Hero display face — provided by user */
        @font-face {
          font-family: 'Zing Rust';
          src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }

        .rb-page { min-height: 100vh; background: #FFFFFF; font-family: 'Inter', system-ui, sans-serif; color: #0A1F44; overflow-x: hidden; }

        /* Hero only — Zing Rust display face */
        .rb-hero-title { font-family: 'Zing Rust', 'Anton', 'Inter', sans-serif; letter-spacing: 0.005em; text-transform: uppercase; font-weight: 400; }

        /* All other section titles — Proxima Nova Light (Montserrat 300 as free fallback) */
        .rb-h1, .rb-h2, .rb-h3, .rb-h4 { font-family: 'Proxima Nova', 'Montserrat', 'Inter', sans-serif; font-weight: 300; letter-spacing: -0.01em; text-transform: none; }
        .rb-h1 { font-weight: 400; }
        .rb-h4 { font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }

        /* Numbers keep a strong condensed feel */
        .rb-num { font-family: 'Proxima Nova', 'Montserrat', sans-serif; font-weight: 700; letter-spacing: -0.02em; }

        .rb-serif { font-family: 'Libre Baskerville', Georgia, serif; }
        .rb-hand  { font-family: 'Caveat', cursive; }
        .rb-stroke { background-image: linear-gradient(90deg, #DC2626, #1E3A8A); -webkit-background-clip: text; background-clip: text; color: transparent; }

        .rb-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.95rem 1.75rem; border-radius: 999px; font-weight: 700; font-size: 0.95rem; text-decoration: none; cursor: pointer; border: none; transition: transform .2s ease, box-shadow .2s ease, filter .2s ease; font-family: 'Proxima Nova', 'Montserrat', 'Inter', sans-serif; }
        .rb-btn-primary { background: linear-gradient(90deg, #DC2626 0%, #1E3A8A 100%); color: #fff; box-shadow: 0 16px 34px rgba(220,38,38,0.35); }
        .rb-btn-primary:hover { transform: translateY(-2px); filter: brightness(1.06); box-shadow: 0 22px 46px rgba(220,38,38,0.45); }
        .rb-btn-outline { background: transparent; color: #0A1F44; border: 2px solid #0A1F44; }
        .rb-btn-outline:hover { background: #0A1F44; color: #fff; }

        /* Media card caption/pill responsive tweaks (Shark Tank / KBC) */
        .rb-media-caption { position: absolute; bottom: 20px; left: 22px; right: 22px; padding-right: 118px; }
        .rb-media-caption .rb-media-title { font-size: 1.35rem; }
        .rb-media-caption .rb-media-sub { font-size: 0.85rem; }
        @media (max-width: 640px) {
          .rb-media-caption { left: 16px; right: 16px; bottom: 14px; padding-right: 100px; }
          .rb-media-caption .rb-media-title { font-size: 1.1rem; }
          .rb-media-caption .rb-media-sub { font-size: 0.75rem; }
          .rb-watch-pill { bottom: 14px !important; right: 14px !important; padding: 7px 12px !important; font-size: 0.68rem !important; letter-spacing: 0.14em !important; }
        }
        .rb-btn-ghost-white { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.35); backdrop-filter: blur(8px); }
        .rb-btn-ghost-white:hover { background: rgba(255,255,255,0.16); }

        .rb-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
        .rb-orb-red   { background: rgba(220,38,38,0.5); }
        .rb-orb-blue  { background: rgba(30,58,138,0.5); }
        .rb-orb-light { background: rgba(96,165,250,0.5); }

        /* Wide centered pill nav — spans hero content width */
        .rb-topbar {
          position: fixed;
          top: 22px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.55rem 0.65rem 0.55rem 1.5rem;
          width: min(1180px, calc(100vw - 48px));
          background: linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(224,242,254,0.88) 100%);
          backdrop-filter: blur(22px) saturate(180%);
          -webkit-backdrop-filter: blur(22px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 999px;
          box-shadow: 0 20px 48px rgba(10,31,68,0.28), 0 0 0 1px rgba(15,30,80,0.04) inset;
          white-space: nowrap;
        }
        .rb-topbar .rb-btn-outline-dark { background: transparent; color: #0A1F44; border: 1.5px solid rgba(10,31,68,0.35); padding: 0.55rem 1.15rem; border-radius: 999px; font-weight: 700; font-size: 0.88rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem; transition: all .2s ease; cursor: pointer; font-family: 'Proxima Nova', 'Montserrat', 'Inter', sans-serif; white-space: nowrap; }
        .rb-topbar .rb-btn-outline-dark:hover { background: #0A1F44; color: #fff; border-color: #0A1F44; }
        .rb-topbar .rb-btn { white-space: nowrap; }

        /* Book pedestal cards — compact 8-in-a-row layout with 3D back-cover shadow */
        .rb-book-pad {
          background: linear-gradient(180deg, #FFFFFF 0%, #F5F3FF 100%);
          border-radius: 18px;
          padding: 22px 12px 16px 14px;
          box-shadow: 0 8px 20px rgba(15,30,80,0.06), 0 1px 2px rgba(15,30,80,0.05);
          transition: box-shadow .4s ease, transform .4s ease;
        }
        .rb-book-pad:hover { box-shadow: 0 20px 44px rgba(124,58,237,0.18), 0 4px 10px rgba(15,30,80,0.08); transform: translateY(-3px); }
        .rb-book { perspective: 1400px; position: relative; }
        .rb-book-inner {
          position: relative;
          transform-style: preserve-3d;
          transform-origin: left center;
          transition: transform .55s cubic-bezier(.2,.8,.2,1), box-shadow .4s ease;
          border-radius: 3px 5px 5px 3px;
          /* Layered 3D shadow: solid back-cover offset + soft ambient + deep drop */
          box-shadow:
            2px 3px 0 rgba(30, 20, 60, 0.18),
            5px 7px 0 rgba(30, 20, 60, 0.10),
            8px 12px 22px rgba(30, 20, 60, 0.18),
            0 30px 48px -14px rgba(30, 20, 60, 0.30);
        }
        .rb-book:hover .rb-book-inner {
          transform: rotateY(-22deg) translateZ(14px);
          box-shadow:
            3px 4px 0 rgba(30, 20, 60, 0.22),
            7px 9px 0 rgba(30, 20, 60, 0.12),
            14px 18px 30px rgba(30, 20, 60, 0.24),
            0 36px 60px -14px rgba(220, 38, 38, 0.28);
        }
        .rb-book-cover { display: block; width: 100%; border-radius: 3px 5px 5px 3px; backface-visibility: hidden; }
        .rb-book-inner::after {
          content: ''; position: absolute; top: -2px; left: 2px; right: -1px; height: 2px;
          background: linear-gradient(180deg, #FEFEFE 0%, #E2E8F0 100%);
          border-radius: 2px 2px 0 0;
        }
        /* Hover reveal — CTA appears BELOW the card */
        .rb-book-pad { position: relative; }
        .rb-book-cta {
          margin-top: 0.55rem;
          text-align: center;
          font-family: 'Proxima Nova', 'Montserrat', sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #DC2626;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity .25s ease, transform .25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
        }
        .rb-book-pad:hover .rb-book-cta { opacity: 1; transform: translateY(0); }
        .rb-book-link { display: block; text-decoration: none; color: inherit; cursor: pointer; }

        /* Sample-book modal header — hide "Open in new tab" pill on tight phones,
           keep the "Book a Demo" CTA + close button always visible. */
        @media (max-width: 520px) {
          .rb-sample-open-new { display: none !important; }
        }

        /* 8-book row */
        .rb-books-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.1rem 0.85rem; align-items: end; }
        @media (max-width: 900px) { .rb-books-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 640px)  { .rb-books-grid { grid-template-columns: repeat(2, 1fr); } }

        /* Curtains — scroll-linked (transform set via inline style) */
        .rb-curtain { will-change: transform; transition: transform .12s linear; }

        .rb-glass { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(14px); }

        .rb-marquee-wrap { overflow: hidden; }
        .rb-marquee { display: flex; gap: 1.25rem; animation: rb-scroll 42s linear infinite; width: max-content; }
        @keyframes rb-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* Skills auto-scrolling marquee — no visible scrollbar, uneven heights */
        .rb-skills-wrap {
          overflow: hidden;
          padding: 30px 0 40px;
          -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%);
                  mask-image: linear-gradient(90deg, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%);
        }
        .rb-skills-track {
          display: flex;
          gap: 1rem;
          width: max-content;
          animation: rb-skills-scroll 42s linear infinite;
        }
        .rb-skills-wrap:hover .rb-skills-track { /* keep running on hover — no pause */ }
        @keyframes rb-skills-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .rb-skill-card {
          position: relative;
          flex: 0 0 240px;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 22px 44px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.06) inset;
          transition: transform .4s ease, box-shadow .4s ease;
          background: rgba(255,255,255,0.05);
        }
        .rb-skill-card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(220,38,38,0.28), 0 0 0 1px rgba(255,255,255,0.1) inset; }
        .rb-skill-card img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .rb-skill-card::after {
          content: '';
          position: absolute; left: 0; right: 0; bottom: 0; height: 55%;
          background: linear-gradient(180deg, transparent 0%, rgba(10,15,40,0.9) 100%);
          pointer-events: none;
        }
        .rb-skill-label {
          position: absolute; left: 18px; right: 18px; bottom: 18px;
          color: #fff;
          font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 700;
          font-size: 1.15rem; letter-spacing: -0.005em;
          z-index: 2;
        }
        .rb-skill-card:nth-child(5n+1) { height: 340px; margin-top: 40px; }
        .rb-skill-card:nth-child(5n+2) { height: 420px; margin-top: 0px; }
        .rb-skill-card:nth-child(5n+3) { height: 360px; margin-top: 60px; }
        .rb-skill-card:nth-child(5n+4) { height: 400px; margin-top: 10px; }
        .rb-skill-card:nth-child(5n+5) { height: 340px; margin-top: 50px; }

        /* Horizontal video slider — hidden scrollbar, snap */
        .rb-vids-scroll { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 8px; }
        .rb-vids-scroll::-webkit-scrollbar { display: none; }
        .rb-vids-row { display: flex; gap: 1rem; padding: 0 2px; }
        .rb-vid-card {
          position: relative;
          flex: 0 0 340px;
          border-radius: 18px;
          overflow: hidden;
          background: #0A1F44;
          scroll-snap-align: start;
          box-shadow: 0 12px 30px rgba(15,30,80,0.14);
          text-decoration: none;
          color: inherit;
          transition: transform .3s ease, box-shadow .3s ease;
        }
        .rb-vid-card:hover { transform: translateY(-4px); box-shadow: 0 22px 44px rgba(220,38,38,0.22); }
        .rb-vid-thumb { position: relative; aspect-ratio: 16 / 9; overflow: hidden; }
        .rb-vid-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .rb-vid-thumb::after {
          content: '';
          position: absolute; left: 0; right: 0; bottom: 0; height: 55%;
          background: linear-gradient(180deg, transparent, rgba(0,0,0,0.55));
        }
        .rb-vid-play {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          width: 60px; height: 60px; border-radius: 999px;
          background: rgba(220,38,38,0.9);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 10px 30px rgba(220,38,38,0.55), 0 0 0 6px rgba(255,255,255,0.16);
          transition: transform .3s ease, background .3s ease;
          z-index: 2;
        }
        .rb-vid-card:hover .rb-vid-play { transform: translate(-50%, -50%) scale(1.08); background: #DC2626; }

        .rb-fade-in { animation: rb-fade .55s ease both; }
        @keyframes rb-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

        /* ── Admissions growth chart ── */
        .rb-adm-wrap { display: grid; grid-template-columns: 340px 1fr; gap: 2rem; align-items: center; background: linear-gradient(135deg, #FFF 0%, #FFF6F6 100%); border: 1px solid #FCA5A5; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 20px 60px rgba(220,38,38,0.10); overflow: hidden; position: relative; }
        .rb-adm-wrap::before { content: ''; position: absolute; top: -80px; right: -80px; width: 260px; height: 260px; border-radius: 50%; background: radial-gradient(circle, rgba(220,38,38,0.18), transparent 70%); pointer-events: none; }
        .rb-adm-big { font-family: 'Zing Rust', 'Anton', sans-serif; font-size: clamp(3.5rem, 6vw, 5.5rem); line-height: 0.95; background: linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.02em; }
        .rb-adm-lbl { font-family: 'Proxima Nova', 'Montserrat', sans-serif; font-weight: 700; color: #0A1F44; font-size: 1rem; letter-spacing: 0.02em; margin-top: 0.6rem; line-height: 1.35; }
        .rb-adm-sub { font-size: 0.85rem; color: #64748B; line-height: 1.55; margin-top: 0.5rem; }
        .rb-adm-pill { display: inline-flex; align-items: center; gap: 6px; background: #DC2626; color: #fff; font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; padding: 6px 12px; border-radius: 999px; margin-bottom: 0.9rem; box-shadow: 0 8px 20px rgba(220,38,38,0.30); }
        .rb-adm-pulse { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: rb-pulse 1.4s infinite; }
        @keyframes rb-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }

        .rb-adm-chart { position: relative; height: 260px; width: 100%; }
        .rb-adm-chart svg { width: 100%; height: 100%; overflow: visible; }
        .rb-adm-area { fill: url(#rbAdmArea); opacity: 0; animation: rb-adm-fadein 1.1s .7s ease forwards; }
        .rb-adm-line { fill: none; stroke: #DC2626; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: rb-adm-draw 1.6s .1s ease-out forwards; filter: drop-shadow(0 4px 8px rgba(220,38,38,0.35)); }
        @keyframes rb-adm-draw { to { stroke-dashoffset: 0; } }
        @keyframes rb-adm-fadein { to { opacity: 1; } }
        .rb-adm-dot { fill: #fff; stroke: #DC2626; stroke-width: 3; opacity: 0; animation: rb-adm-pop .35s ease forwards; }
        .rb-adm-badge { opacity: 0; animation: rb-adm-pop .4s ease forwards; }
        @keyframes rb-adm-pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .rb-adm-grid { stroke: #E2E8F0; stroke-width: 1; stroke-dasharray: 4 4; }
        .rb-adm-xlbl { font-family: 'Proxima Nova', sans-serif; font-size: 11px; font-weight: 700; fill: #64748B; letter-spacing: 0.06em; }
        .rb-adm-bval { font-family: 'Proxima Nova', sans-serif; font-size: 11px; font-weight: 800; fill: #DC2626; }

        @media (max-width: 900px) { .rb-adm-wrap { grid-template-columns: 1fr !important; padding: 1.5rem; } .rb-adm-chart { height: 220px; } }

        /* ── STEM Certificate — scroll-in "grow big" animation ── */
        .rb-cert-frame { position: relative; opacity: 0; transform: scale(0.55) translateY(40px); transform-origin: center center; transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease; will-change: transform, opacity; filter: drop-shadow(0 40px 80px rgba(15, 30, 80, 0.28)); }
        .rb-cert-frame.rb-cert-in { opacity: 1; transform: scale(1) translateY(0); }
        .rb-cert-frame img { width: 100%; height: auto; display: block; border-radius: 14px; border: 1px solid #E2E8F0; box-shadow: 0 30px 80px rgba(15, 30, 80, 0.18); }
        .rb-cert-frame::after { content: ''; position: absolute; inset: 0; border-radius: 14px; background: linear-gradient(135deg, rgba(220,38,38,0.10) 0%, rgba(30,58,138,0.10) 100%); mix-blend-mode: overlay; pointer-events: none; opacity: 0; transition: opacity 0.8s ease 0.6s; }
        .rb-cert-frame.rb-cert-in::after { opacity: 1; }
        .rb-cert-badge { position: absolute; top: -14px; right: -14px; background: linear-gradient(135deg, #DC2626, #1E3A8A); color: #fff; padding: 0.5rem 1rem; border-radius: 999px; font-family: 'Proxima Nova', sans-serif; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; box-shadow: 0 12px 30px rgba(220,38,38,0.35); z-index: 2; opacity: 0; transform: scale(0.6) rotate(-8deg); transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.55s, opacity 0.5s ease 0.55s; }
        .rb-cert-frame.rb-cert-in .rb-cert-badge { opacity: 1; transform: scale(1) rotate(-8deg); }

        /* ── Hands-on Kits section ── */
        .rb-kits-sub { font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.22em; text-transform: uppercase; color: #DC2626; margin-bottom: 0.6rem; }
        .rb-kits-title { font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: clamp(1.4rem, 2.4vw, 1.9rem); color: #0A1F44; margin-bottom: 1.5rem; line-height: 1.15; }

        .rb-kit-placeholder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
        .rb-kit-ph { position: relative; aspect-ratio: 16/10; border-radius: 1rem; background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; color: #64748B; border: 2px dashed #CBD5E1; overflow: hidden; transition: all 0.3s ease; }
        .rb-kit-ph:hover { border-color: #DC2626; color: #DC2626; transform: translateY(-4px); }
        .rb-kit-ph-label { font-family: 'Proxima Nova', sans-serif; font-weight: 700; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; }
        .rb-kit-ph-sub { font-size: 0.7rem; color: #94A3B8; font-style: italic; }
        .rb-projects-video { aspect-ratio: 16 / 8.5; border-radius: 1.25rem; background: linear-gradient(135deg, #0A1F44 0%, #1E3A8A 100%); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 30px 60px rgba(10,31,68,0.25); border: 1px solid rgba(255,255,255,0.1); }
        .rb-projects-video::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 44px 44px; }
        .rb-projects-video-inner { position: relative; z-index: 1; text-align: center; color: rgba(255,255,255,0.9); padding: 2rem; }
        .rb-projects-video-inner > svg { color: #FCA5A5; filter: drop-shadow(0 8px 32px rgba(252,165,165,0.4)); margin-bottom: 1rem; }
        .rb-projects-video-title { font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: clamp(1.05rem, 2vw, 1.4rem); color: #fff; letter-spacing: 0.02em; }
        .rb-projects-video-sub { font-family: 'Proxima Nova', sans-serif; font-size: 0.85rem; font-style: italic; color: rgba(255,255,255,0.7); margin-top: 0.5rem; }

        .rb-parts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
        .rb-part-card { position: relative; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 1.25rem; padding: 1.5rem 1.25rem; text-align: center; transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1); overflow: hidden; }
        .rb-part-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--pc); transform: scaleX(0); transform-origin: left; transition: transform 0.5s ease; }
        .rb-part-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.10); border-color: var(--pc); }
        .rb-part-card:hover::before { transform: scaleX(1); }
        .rb-part-icon { width: 56px; height: 56px; border-radius: 16px; background: color-mix(in srgb, var(--pc) 12%, transparent); color: var(--pc); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.9rem; }
        .rb-part-t { font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: 1.05rem; color: #0A1F44; margin-bottom: 0.3rem; }
        .rb-part-s { font-size: 0.85rem; color: #64748B; line-height: 1.45; }
        .rb-pillar-img { width: 100%; aspect-ratio: 4 / 3; border-radius: 14px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; }
        .rb-pillar-img img { width: 100%; height: 100%; object-fit: contain; padding: 12px; display: block; }
        .rb-pillar-fallback { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; flex-direction: column; gap: 6px; }
        .rb-pillar-fallback::after { content: 'Image placeholder'; font-family: 'Proxima Nova', sans-serif; font-size: 0.65rem; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; opacity: 0.7; }

        .rb-takehome-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        @media (max-width: 1080px) { .rb-takehome-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 620px)  { .rb-takehome-grid { grid-template-columns: repeat(2, 1fr); } }
        .rb-kit-card { position: relative; cursor: pointer; background: var(--kb); border-radius: 1.25rem; padding: 1rem; overflow: hidden; transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1); border: 2px solid transparent; }
        .rb-kit-card::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 100%, rgba(255,255,255,0.25), transparent 60%); pointer-events: none; opacity: 0; transition: opacity 0.4s ease; }
        .rb-kit-card:hover { transform: translateY(-8px) rotate(-1deg); box-shadow: 0 30px 60px rgba(0,0,0,0.28); border-color: rgba(255,255,255,0.4); }
        .rb-kit-card:hover::after { opacity: 1; }
        .rb-kit-img { width: 100%; height: 150px; object-fit: contain; display: block; filter: drop-shadow(0 8px 12px rgba(0,0,0,0.20)); transition: transform 0.4s ease; }
        .rb-kit-card:hover .rb-kit-img { transform: scale(1.06) rotate(2deg); }
        .rb-kit-tag { display: inline-block; margin-top: 0.7rem; background: rgba(255,255,255,0.20); color: #FFFFFF; font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; backdrop-filter: blur(6px); }
        .rb-kit-name { font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: 0.95rem; color: #FFFFFF; margin-top: 0.35rem; line-height: 1.2; }
        .rb-kit-theme { font-size: 0.72rem; color: rgba(255,255,255,0.85); margin-top: 0.15rem; font-style: italic; }
        .rb-kit-hint { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.22); color: #fff; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; padding: 4px 8px; border-radius: 999px; backdrop-filter: blur(6px); opacity: 0; transform: translateY(-4px); transition: all 0.3s ease; }
        .rb-kit-card:hover .rb-kit-hint { opacity: 1; transform: translateY(0); }
        .rb-kit-unbox { position: relative; z-index: 3; margin-top: 0.75rem; display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.35); color: #fff; font-family: 'Proxima Nova', sans-serif; font-weight: 700; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 999px; text-decoration: none; backdrop-filter: blur(6px); transition: all 0.25s ease; }
        .rb-kit-unbox:hover { background: #DC2626; border-color: #DC2626; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(220,38,38,0.35); }

        .rb-lab-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        @media (max-width: 720px) { .rb-lab-grid { grid-template-columns: 1fr; } }
        .rb-lab-card { background: var(--kb); border-radius: 1.25rem; padding: 1.5rem; display: grid; grid-template-columns: 160px 1fr; gap: 1.25rem; align-items: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1); border: 2px solid transparent; }
        .rb-lab-card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.35); }
        .rb-lab-card img { width: 100%; height: 130px; object-fit: contain; filter: drop-shadow(0 10px 16px rgba(0,0,0,0.25)); }

        /* Offer ribbon */
        .rb-offer { position: relative; margin-top: 3rem; background: linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%); color: #fff; border-radius: 1.5rem; padding: 2.5rem 2rem; overflow: hidden; box-shadow: 0 30px 80px rgba(220,38,38,0.35); }
        .rb-offer::before, .rb-offer::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; }
        .rb-offer::before { width: 260px; height: 260px; top: -100px; right: -60px; background: radial-gradient(circle, rgba(255,255,255,0.20), transparent 70%); }
        .rb-offer::after  { width: 220px; height: 220px; bottom: -100px; left: -60px; background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%); }
        .rb-offer-pill { display: inline-flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.30); color: #FEE2E2; font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase; padding: 7px 14px; border-radius: 999px; margin-bottom: 1rem; }
        .rb-offer h3 { font-family: 'Zing Rust', 'Anton', sans-serif; font-size: clamp(2rem, 4vw, 3rem); line-height: 1; letter-spacing: -0.01em; margin: 0; }
        .rb-offer h3 span { color: #FBBF24; }
        .rb-offer p { font-family: 'Proxima Nova', sans-serif; font-size: 1rem; color: rgba(255,255,255,0.9); margin: 0.7rem 0 1.25rem; max-width: 620px; line-height: 1.55; }
        .rb-offer-btn { background: #FFFFFF; color: #DC2626; border: none; border-radius: 999px; padding: 14px 26px; font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: 0.9rem; letter-spacing: 0.06em; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 12px 30px rgba(0,0,0,0.25); transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .rb-offer-btn:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(0,0,0,0.35); }
        .rb-slots-bar { margin-top: 1.5rem; background: rgba(0,0,0,0.25); border-radius: 999px; height: 10px; overflow: hidden; position: relative; }
        .rb-slots-fill { height: 100%; background: linear-gradient(90deg, #FBBF24, #FFFFFF); border-radius: 999px; width: 23%; animation: rb-slot-grow 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes rb-slot-grow { from { width: 0; } to { width: 23%; } }
        .rb-slots-caption { display: flex; justify-content: space-between; margin-top: 0.5rem; font-family: 'Proxima Nova', sans-serif; font-size: 0.78rem; color: rgba(255,255,255,0.85); font-weight: 700; letter-spacing: 0.06em; }

        /* Kit inspection modal */
        .rb-modal-back { position: fixed; inset: 0; background: rgba(10,31,68,0.75); backdrop-filter: blur(8px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1.5rem; animation: rb-mfade 0.25s ease; }
        @keyframes rb-mfade { from { opacity: 0; } to { opacity: 1; } }
        .rb-modal { background: #FFFFFF; color: #0A1F44; max-width: 780px; width: 100%; max-height: 90vh; overflow-y: auto; border-radius: 1.5rem; box-shadow: 0 40px 100px rgba(0,0,0,0.5); animation: rb-mpop 0.35s cubic-bezier(0.22, 1, 0.36, 1); display: grid; grid-template-columns: 1fr 1fr; gap: 0; overflow: hidden; }
        @keyframes rb-mpop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @media (max-width: 720px) { .rb-modal { grid-template-columns: 1fr; } }
        .rb-modal-img { background: var(--kb, #F1F5F9); display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .rb-modal-img img { width: 100%; max-width: 260px; height: auto; filter: drop-shadow(0 14px 22px rgba(0,0,0,0.25)); }
        .rb-modal-body { padding: 2rem 1.75rem; }
        .rb-modal-close { position: absolute; top: 1rem; right: 1rem; background: #FFFFFF; color: #0A1F44; border: 1px solid #E2E8F0; border-radius: 50%; width: 40px; height: 40px; font-size: 1.4rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 210; box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .rb-modal-close:hover { color: #DC2626; }

        @media (max-width: 900px) {
          .rb-2col { grid-template-columns: 1fr !important; }
          .rb-hide-mobile { display: none !important; }
        }
      `}</style>

      {/* ─────────── FLOATING GLACIAL-BLUE PILL NAV ─────────── */}
      <div className="rb-topbar" data-testid="rb-topbar">
        <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img src={OLL_LOGO_COLOR} alt="OLL" style={{ height: 44 }} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.75rem' }}>
          <a href={CURRICULUM_PDF} onClick={openGate} data-testid="rb-nav-download" className="rb-btn-outline-dark">
            <Download size={14} /> <span className="rb-hide-mobile">Download Curriculum</span>
          </a>
          <button onClick={bookDemo} data-testid="rb-top-cta" className="rb-btn rb-btn-primary" style={{ padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}>
            Book a Demo <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Visible breadcrumb trail (also emits BreadcrumbList JSON-LD) ── */}
      <div style={{ background: '#0A1F44', paddingTop: 'clamp(4.5rem, 9vw, 7rem)', paddingBottom: '0.5rem' }}>
        <SchoolBreadcrumbs
          testid="rb-breadcrumbs"
          theme="dark"
          schemaId="rb-jsonld-1"
          items={[
            { label: 'Home', href: '/' },
            { label: 'For Schools', href: '/school' },
            { label: 'Robotics', href: '/school#robotics' },
            { label: 'Robotics & AI Lab · Grades 1-8' },
          ]}
        />
      </div>

      {/* ═══════════ 01 — HERO ═══════════ */}
      <section data-testid="rb-hero" style={{ position: 'relative', background: '#0A1F44', color: '#fff', paddingTop: '2rem', paddingBottom: '4rem', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 460, height: 460, top: -140, left: -120 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 520, height: 520, bottom: -180, right: -140 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, top: '35%', right: '30%' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '56px 56px', pointerEvents: 'none' }} />

        <div className="rb-2col" style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '3rem', alignItems: 'center', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', padding: '0.4rem 0.9rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
              <Rocket size={14} style={{ color: '#FCA5A5' }} />
              <span style={{ color: '#FCA5A5', letterSpacing: '0.12em', textTransform: 'uppercase' }}>For Schools · Robotics &amp; AI Lab · Grade 1–8</span>
            </div>
            <h1 className="rb-hero-title" style={{ fontSize: 'clamp(2.2rem, 5.2vw, 4.2rem)', lineHeight: 0.98, marginTop: '1.1rem', marginBottom: '1rem' }}>
              AI and Robotics Lab<br />
              for Schools<br />
              <span className="rb-stroke" style={{ backgroundImage: 'linear-gradient(90deg, #FCA5A5, #60A5FA)' }}>Grade 1 to 8.</span>
            </h1>
            <div style={{ fontFamily: "'Proxima Nova', 'Montserrat', 'Inter', sans-serif" }}>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#FCA5A5', letterSpacing: '0.02em', marginBottom: '0.6rem' }}>
                Introducing OLL&rsquo;s Robotics and AI Labs
              </p>
              <p style={{ fontWeight: 300, fontSize: '1.02rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', maxWidth: 620, letterSpacing: '0.005em' }}>
                OLL is taking the lead in revolutionizing Robotics &amp; AI Labs worldwide, thanks to the expertise of our
                <strong style={{ color: '#fff', fontWeight: 700 }}> IIT Bombay alumni curriculum developers</strong>. We are proud to state that we are teaching a massive
                <strong style={{ color: '#fff', fontWeight: 700 }}> 1,55,000 students in ten countries</strong> to date. Our comprehensive product suite includes robotics kits,
                AI and coding software, teacher training programs, books, and global competitions — supporting schools to introduce an
                impressive curriculum that focuses on <strong style={{ color: '#fff', fontWeight: 700 }}>coding, AI, IoT, and robotics education</strong>.
              </p>
              <p style={{ fontWeight: 300, fontSize: '0.95rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.7)', maxWidth: 620, marginTop: '0.8rem' }}>
                Curriculum for {SKILLS_LIST}.
              </p>
            </div>
          </div>

          {/* Real Schools, Real Results — school video carousel */}
          <div style={{ position: 'relative' }} data-testid="rb-school-video-carousel">
            <div className="rb-hand" style={{ position: 'absolute', top: -30, left: 4, color: '#FCA5A5', fontSize: '1.4rem', transform: 'rotate(-4deg)', zIndex: 2 }}>Real Schools, Real Results</div>
            <a
              href={`https://youtu.be/${currentVideo.id}`}
              target="_blank"
              rel="noreferrer"
              className="rb-glass rb-fade-in"
              key={winIdx}
              data-testid={`rb-hero-video-${currentVideo.id}`}
              style={{ display: 'block', borderRadius: '1.5rem', padding: '0.9rem', position: 'relative', textDecoration: 'none' }}
            >
              {/* Video thumbnail with play overlay */}
              <div style={{ position: 'relative', aspectRatio: '16 / 10', borderRadius: '1rem', overflow: 'hidden', background: '#0A1F44' }}>
                <img
                  src={`https://i.ytimg.com/vi/${currentVideo.id}/hqdefault.jpg`}
                  alt={currentVideo.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,31,68,0.15) 0%, rgba(10,31,68,0.85) 100%)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(220,38,38,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(220,38,38,0.5)', border: '3px solid rgba(255,255,255,0.85)' }}>
                    <Play size={30} fill="#fff" strokeWidth={0} style={{ marginLeft: 4 }} />
                  </div>
                </div>
                <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.3)', padding: '0.35rem 0.8rem', borderRadius: 999, fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 800, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backdropFilter: 'blur(6px)' }}>
                  <School size={12} /> Partner School
                </div>
              </div>
              <div style={{ marginTop: '0.9rem', padding: '0.25rem 0.5rem' }}>
                <div className="rb-h3" style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 600, lineHeight: 1.25 }}>{currentVideo.name}</div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginTop: 4, fontStyle: 'italic' }}>Watch what our students &amp; teachers built.</div>
              </div>
            </a>
            {/* Controls */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {SCHOOL_VIDEOS.map((_, i) => (
                  <button key={i} onClick={() => goWin(i)} data-testid={`rb-hero-video-dot-${i}`} aria-label={`School ${i + 1}`}
                    style={{ width: i === winIdx ? 22 : 8, height: 8, borderRadius: 999, border: 'none', cursor: 'pointer', background: i === winIdx ? '#FCA5A5' : 'rgba(255,255,255,0.3)', transition: 'width .3s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => goWin(winIdx - 1)} data-testid="rb-hero-video-prev" aria-label="Previous school video" style={{ width: 36, height: 36, borderRadius: 999, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => goWin(winIdx + 1)} data-testid="rb-hero-video-next" aria-label="Next school video" style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: '#DC2626', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 02 — IIT BOMBAY (Theatrical Stage) ═══════════ */}
      <section data-testid="rb-iit" style={{ position: 'relative', padding: '3rem 1.25rem 0', background: '#0A1F44', color: '#fff', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 400, height: 400, top: -120, left: -80, opacity: 0.3 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 400, height: 400, bottom: 200, right: -80, opacity: 0.3 }} />

        {/* Section intro */}
        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto 3rem', textAlign: 'center', zIndex: 2 }}>
          <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>the big stage</div>
          <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#fff', marginTop: '0.35rem' }}>
            Put your school on a <span style={{ color: '#FCA5A5' }}>national stage.</span>
          </h2>
          <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.9rem', maxWidth: 640, margin: '0.9rem auto 0', lineHeight: 1.6 }}>
            Give your students the opportunity to showcase what they&apos;ve built — at one of India&apos;s largest technology festivals.
          </p>
        </div>

        {/* THE STAGE */}
        <div data-testid="rb-stage" style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', paddingBottom: '2rem', zIndex: 2 }}>
          {/* Curtain top valance (fixed) */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(180deg, #7A1616 0%, #4A0E0E 100%)', borderBottom: '3px solid #DC2626', boxShadow: '0 6px 20px rgba(220,38,38,0.35)', zIndex: 5 }} />

          {/* LEFT CURTAIN — slides left with scroll progress */}
          <div className="rb-curtain" style={{ position: 'absolute', top: 40, left: 0, bottom: 120, width: '50%', background: 'linear-gradient(90deg, #4A0E0E 0%, #7A1616 55%, #A11A1A 90%, #B91C1C 100%)', boxShadow: 'inset -30px 0 60px rgba(0,0,0,0.5)', zIndex: 4, borderRight: '2px solid rgba(0,0,0,0.3)', backgroundImage: 'linear-gradient(90deg, #4A0E0E 0%, #7A1616 55%, #A11A1A 90%, #B91C1C 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0 2px, transparent 2px 24px)', backgroundBlendMode: 'overlay', transform: `translateX(${-curtainProgress * 96}%)` }} />

          {/* RIGHT CURTAIN — slides right with scroll progress */}
          <div className="rb-curtain" style={{ position: 'absolute', top: 40, right: 0, bottom: 120, width: '50%', background: 'linear-gradient(-90deg, #4A0E0E 0%, #7A1616 55%, #A11A1A 90%, #B91C1C 100%)', boxShadow: 'inset 30px 0 60px rgba(0,0,0,0.5)', zIndex: 4, borderLeft: '2px solid rgba(0,0,0,0.3)', backgroundImage: 'linear-gradient(-90deg, #4A0E0E 0%, #7A1616 55%, #A11A1A 90%, #B91C1C 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0 2px, transparent 2px 24px)', backgroundBlendMode: 'overlay', transform: `translateX(${curtainProgress * 96}%)` }} />

          {/* Backdrop with spotlight — centered stack */}
          <div style={{ position: 'relative', minHeight: 620, background: 'radial-gradient(ellipse at 50% 15%, rgba(255,244,200,0.28) 0%, rgba(96,165,250,0.18) 20%, rgba(30,58,138,0.35) 45%, rgba(10,15,40,0.9) 75%)', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 2rem' }}>
            {/* Spotlight beam */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '220px solid transparent', borderRight: '220px solid transparent', borderTop: '620px solid rgba(255, 244, 200, 0.18)', filter: 'blur(24px)', pointerEvents: 'none' }} />
            {/* Spotlight glow */}
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,244,200,0.75) 0%, rgba(255,244,200,0) 70%)', filter: 'blur(10px)' }} />

            {/* Centered content — Showcasing → YOUR SCHOOL → Techfest logo */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 780 }}>
              <div className="rb-hand" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)', color: '#FCD34D', lineHeight: 1, textShadow: '0 0 30px rgba(255,244,200,0.45)' }}>
                Showcasing
              </div>

              <div className="rb-hero-title" style={{ marginTop: '1rem', fontSize: 'clamp(2.6rem, 6vw, 4.2rem)', lineHeight: 1, color: '#fff', textShadow: '0 0 40px rgba(255,244,200,0.55), 0 0 80px rgba(255,244,200,0.3)' }}>
                YOUR SCHOOL
              </div>

              {/* Techfest logo */}
              <div style={{ marginTop: '2rem', background: '#fff', display: 'inline-block', padding: '1.25rem 2rem', borderRadius: '0.75rem', boxShadow: '0 30px 80px rgba(255,244,200,0.32), 0 0 0 4px rgba(255,255,255,0.12)' }}>
                <img src={TECHFEST_LOGO} alt="Techfest IIT Bombay" style={{ height: 78, display: 'block' }} />
              </div>
            </div>
          </div>

          {/* THE STAGE PLATFORM */}
          <div style={{ position: 'relative', height: 120, background: 'linear-gradient(180deg, #2D1810 0%, #5C3421 40%, #3D2214 100%)', borderTop: '4px solid #DC2626', boxShadow: '0 -8px 30px rgba(220,38,38,0.25)', overflow: 'hidden', zIndex: 3 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.35) 1px, transparent 1px)', backgroundSize: '110px 100%' }} />
            <div style={{ position: 'absolute', top: 6, left: 0, right: 0, display: 'flex', justifyContent: 'space-around' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: 'radial-gradient(circle, #FCD34D 0%, #DC2626 100%)', boxShadow: '0 0 20px rgba(252,211,77,0.9), 0 0 40px rgba(252,211,77,0.6)' }} />
              ))}
            </div>
            <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.75rem', color: 'rgba(255,220,180,0.7)', letterSpacing: '0.32em', textTransform: 'uppercase' }}>
              The Stage · IIT Bombay
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 03 — STEM.ORG CERTIFICATION ═══════════ */}
      <section data-testid="rb-stem" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#F8FAFC', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-light" style={{ width: 400, height: 400, top: -140, right: -80, opacity: 0.22 }} />
        <div className="rb-orb rb-orb-red"   style={{ width: 300, height: 300, bottom: -120, left: -60, opacity: 0.18 }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#1E3A8A', fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1 }}>international recognition</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44', marginTop: '0.4rem' }}>
              Recognition that goes <span className="rb-stroke">beyond the classroom.</span>
            </h2>
            <p className="rb-serif" style={{ fontSize: '1rem', maxWidth: 640, margin: '0.9rem auto 0', color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>
              Make your school&apos;s future-skills journey visible — with a globally recognised STEM education credential.
            </p>
          </div>

          <div className="rb-2col" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '3rem', alignItems: 'center' }}>
            {/* Real certificate image — scale-up animation on scroll into view */}
            <div className="rb-cert-frame" ref={certRef}>
              <span className="rb-cert-badge">STEM.org Accredited</span>
              <img src="/school/certificate.png" alt="OLL Certificate of Recognition — STEM.org Accredited" loading="lazy" />
            </div>

            <div>
              <h3 className="rb-h3" style={{ fontSize: '1.4rem', color: '#0A1F44' }}>What a STEM.org accreditation means for your school</h3>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.25rem', display: 'grid', gap: '0.7rem' }}>
                {[
                  'A globally recognised STEM education credential.',
                  'Added credibility for your STEM initiatives with parents and boards.',
                  'A certificate you can display, share and market with pride.',
                  'Alignment with international STEM education standards.',
                ].map((t) => (
                  <li key={t} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', color: '#334155', fontSize: '0.98rem', lineHeight: 1.5 }}>
                    <CheckCircle2 size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 04 — PARENTS SATISFACTION ═══════════ */}
      <section data-testid="rb-parents" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#FFFFFF', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 380, height: 380, top: -120, right: -80, opacity: 0.2 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 380, height: 380, bottom: -140, left: -60, opacity: 0.22 }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1 }}>parent satisfaction</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Make parents proud of what their <span className="rb-stroke">children can create.</span>
            </h2>
            <p className="rb-serif" style={{ fontSize: '1rem', maxWidth: 620, margin: '0.9rem auto 0', color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>
              Don&apos;t just tell parents &ldquo;your child learned Robotics&rdquo;. Let them see it.
            </p>
          </div>

          {/* Admissions growth chart — animated red line/area chart (re-plays on scroll into view) */}
          <div className="rb-adm-wrap" data-testid="rb-admissions-chart" ref={chartRef} style={{ marginBottom: '2.5rem' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="rb-adm-big">+{growthCount}%</div>
              <div className="rb-adm-lbl">Average annual admissions growth for schools running OLL Robotics.</div>
              <div className="rb-adm-sub">Parents drive admissions once they see what their children actually build. Robotics turns your school into the &ldquo;the one that&apos;s doing something different.&rdquo;</div>
            </div>

            {(() => {
              const data = [
                { y: '2020', v: 100, pct: null },
                { y: '2021', v: 138, pct: '+38%' },
                { y: '2022', v: 182, pct: '+32%' },
                { y: '2023', v: 245, pct: '+35%' },
                { y: '2024', v: 296, pct: '+21%' },
                { y: '2025', v: 318, pct: '+7%' },
              ];
              const W = 560, H = 260, PL = 40, PR = 20, PT = 30, PB = 42;
              const CW = W - PL - PR, CH = H - PT - PB;
              const maxV = 340;
              const xAt = (i) => PL + (i * CW) / (data.length - 1);
              const yAt = (v) => PT + CH - (v / maxV) * CH;
              const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(d.v)}`).join(' ');
              const areaPath = `${linePath} L ${xAt(data.length - 1)} ${PT + CH} L ${PL} ${PT + CH} Z`;
              return (
                <div className="rb-adm-chart" key={chartKey}>
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="rbAdmArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor="#DC2626" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* horizontal grid */}
                    {[0.25, 0.5, 0.75, 1].map((f) => (
                      <line key={f} x1={PL} x2={W - PR} y1={PT + CH * f} y2={PT + CH * f} className="rb-adm-grid" />
                    ))}
                    {/* area */}
                    <path d={areaPath} className="rb-adm-area" />
                    {/* line */}
                    <path d={linePath} className="rb-adm-line" />
                    {/* dots + badges */}
                    {data.map((d, i) => (
                      <g key={d.y}>
                        <circle cx={xAt(i)} cy={yAt(d.v)} r={5} className="rb-adm-dot" style={{ animationDelay: `${1.2 + i * 0.15}s` }} />
                        {d.pct && (
                          <g className="rb-adm-badge" style={{ animationDelay: `${1.3 + i * 0.15}s` }}>
                            <rect x={xAt(i) - 22} y={yAt(d.v) - 30} width="44" height="20" rx="10" fill="#DC2626" />
                            <text x={xAt(i)} y={yAt(d.v) - 16} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="'Proxima Nova', sans-serif">{d.pct}</text>
                          </g>
                        )}
                        <text x={xAt(i)} y={H - 18} textAnchor="middle" className="rb-adm-xlbl">{d.y}</text>
                      </g>
                    ))}
                    {/* Y-axis min/max labels */}
                    <text x={PL - 8} y={PT + 4} textAnchor="end" className="rb-adm-xlbl">{maxV}</text>
                    <text x={PL - 8} y={PT + CH + 4} textAnchor="end" className="rb-adm-xlbl">0</text>
                  </svg>
                </div>
              );
            })()}
          </div>

          {/* Rotating parent quote */}
          <div style={{ background: 'linear-gradient(135deg, #0A1F44, #1E3A8A)', color: '#fff', borderRadius: '1.5rem', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
            <div className="rb-orb rb-orb-red" style={{ width: 240, height: 240, top: -80, right: -60, opacity: 0.4 }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
              <Quote size={36} style={{ color: '#FCA5A5', opacity: 0.6, margin: '0 auto' }} />
              <p key={parentIdx} className="rb-serif rb-fade-in" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.5rem)', lineHeight: 1.5, fontStyle: 'italic', marginTop: '0.6rem' }}>
                &ldquo;{PARENT_QUOTES[parentIdx]}&rdquo;
              </p>
              <div style={{ marginTop: '0.9rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>— A proud parent</div>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.98rem', color: '#475569', fontStyle: 'italic' }} className="rb-serif">
            Because the best school experiences are the ones children take home — and the best school achievements are the ones parents proudly share.
          </p>
        </div>
      </section>

      {/* ═══════════ 05 — FUTURE SKILLS BOUQUET ═══════════ */}
      <section data-testid="rb-skills" style={{ position: 'relative', padding: '4rem 1.5rem', background: '#F8FAFC', overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', background: '#0A1F44', color: '#fff', borderRadius: '32px', overflow: 'hidden', padding: '3.5rem 0 3rem', boxShadow: '0 30px 80px rgba(10,31,68,0.35)' }}>
          <div className="rb-orb rb-orb-red"   style={{ width: 420, height: 420, top: -140, right: -80 }} />
          <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, bottom: -140, left: -60 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0 1.5rem' }}>
              <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>the easiest way to start</div>
              <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#fff' }}>
                Your school&apos;s <span style={{ color: '#FCA5A5' }}>first step</span> into the future.
              </h2>
              <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', maxWidth: 700, margin: '0.9rem auto 0', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                Don&apos;t limit your students to one skill — give them the opportunity to explore the technologies shaping tomorrow.
              </p>
            </div>

            {/* Auto-scrolling marquee — duplicated for seamless loop, hidden scrollbar */}
            <div className="rb-skills-wrap" data-testid="rb-skills-scroll">
              <div className="rb-skills-track">
                {[...SKILLS, ...SKILLS].map((s, i) => (
                  <div key={`${s.l}-${i}`} className="rb-skill-card" data-testid={i < SKILLS.length ? `rb-skill-${s.l.toLowerCase().replace(/\s+/g, '-')}` : undefined}>
                    <img src={s.src} alt={s.l} loading="lazy" />
                    <div className="rb-skill-label">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 06 — WHAT THE SCHOOL GETS ═══════════ */}
      <section data-testid="rb-school-gets" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#FFFFFF', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-blue"  style={{ width: 380, height: 380, top: -140, right: -80, opacity: 0.2 }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>what the school actually gets</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Everything you need to start an <span className="rb-stroke">AI and Robotics Program</span> for School.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {SCHOOL_GETS.map((c) => (
              <div key={c.t} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '1.15rem', padding: '1.5rem', boxShadow: '0 6px 24px rgba(15,30,80,0.05)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${'#DC2626'}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.9rem' }}>
                  <c.i size={22} style={{ color: '#DC2626' }} />
                </div>
                <h3 className="rb-h4" style={{ fontSize: '1.05rem', color: '#0A1F44', lineHeight: 1.1 }}>{c.t}</h3>
                <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.4rem', lineHeight: 1.5 }}>{c.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 06A — STRUCTURED CURRICULUM ═══════════ */}
      <section data-testid="rb-curriculum" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)', color: '#fff', overflow: 'hidden' }}>
        {/* orbs */}
        <div className="rb-orb rb-orb-red"   style={{ width: 460, height: 460, top: -160, left: -120 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 520, height: 520, bottom: -200, right: -140 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 340, height: 340, top: '35%', left: '40%', opacity: 0.5 }} />
        {/* subtle tech grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '52px 52px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.8rem' }}>structured curriculum</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1.03, color: '#fff' }}>
              A <span style={{ color: '#FCA5A5' }}>grade-wise progression</span> designed for beginners.
            </h2>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1.05rem', maxWidth: 720, margin: '1rem auto 0', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
              Every module builds on the last — from mechanical fundamentals in early grades to real-world programming and IoT by Grade 8.
            </p>
          </div>

          <div className="rb-2col" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '3rem', alignItems: 'center' }}>

            {/* ── LEFT: futuristic grade ladder ── */}
            <div data-testid="rb-grade-ladder" style={{ display: 'grid', gap: '0.85rem' }}>
              {[
                { rail: 'linear-gradient(180deg, #DC2626, #F87171)', glow: 'rgba(220,38,38,0.35)', num: '#FCA5A5', a: '1', b: '2', title: 'Mechanics',   sub: 'Construction',       icon: Cog },
                { rail: 'linear-gradient(180deg, #EA580C, #FBBF24)', glow: 'rgba(234,88,12,0.32)', num: '#FDBA74', a: '3', b: '4', title: 'Robotics',    sub: 'Motorised Output',   icon: Cpu },
                { rail: 'linear-gradient(180deg, #06B6D4, #60A5FA)', glow: 'rgba(6,182,212,0.32)', num: '#7DD3FC', a: '5', b: '6', title: 'Electronics', sub: 'Input & Logic',      icon: Zap },
                { rail: 'linear-gradient(180deg, #1E3A8A, #6366F1)', glow: 'rgba(99,102,241,0.35)', num: '#A5B4FC', a: '7', b: '8', title: 'Programming', sub: 'Internet of Things', icon: Wifi },
              ].map((row) => (
                <div key={row.title} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '6px 96px 1fr auto', alignItems: 'center', gap: '0.9rem', padding: '1.15rem 1.25rem 1.15rem 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', backdropFilter: 'blur(10px)', overflow: 'hidden', boxShadow: `0 12px 30px ${row.glow}` }}>
                  {/* Left rail */}
                  <div style={{ height: '75%', width: 6, background: row.rail, borderRadius: '0 4px 4px 0', boxShadow: `0 0 20px ${row.glow}` }} />
                  {/* Numbers + brace */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: '0.35rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div className="rb-hero-title" style={{ fontSize: '2rem', color: row.num, lineHeight: 1, textShadow: `0 0 18px ${row.glow}` }}>{row.a}</div>
                      <div className="rb-hero-title" style={{ fontSize: '2rem', color: row.num, lineHeight: 1, textShadow: `0 0 18px ${row.glow}` }}>{row.b}</div>
                    </div>
                    <svg width="14" height="60" viewBox="0 0 14 60" style={{ color: row.num, opacity: 0.75 }} aria-hidden>
                      <path d="M11 2 C 4 2, 4 16, 2 30 C 4 44, 4 58, 11 58" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </div>
                  {/* Title + sub */}
                  <div>
                    <div className="rb-h3" style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 600, fontSize: '1.45rem', color: '#fff', lineHeight: 1.1, letterSpacing: '-0.005em' }}>{row.title}</div>
                    <div style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '0.98rem', color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{row.sub}</div>
                  </div>
                  {/* Icon tile */}
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: row.rail, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 8px 22px ${row.glow}` }}>
                    <row.icon size={22} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── RIGHT: futuristic STEAM pentagon ── */}
            <div data-testid="rb-steam">
              <div style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>
                <h3 className="rb-h3" style={{ fontSize: '1.75rem', color: '#fff', fontWeight: 600 }}>
                  Subject <span style={{ color: '#FCA5A5' }}>Integrated</span> Learning
                </h3>
                <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', color: 'rgba(255,255,255,0.72)', marginTop: '0.6rem', lineHeight: 1.55, maxWidth: 460 }}>
                  Every project blends STEAM disciplines — so Robotics isn&apos;t just a hobby, it lifts core subjects too.
                </p>
              </div>

              <div style={{ marginTop: '1.75rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                {/* SVG pentagon with gradient slices + glow */}
                <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 320, display: 'block', filter: 'drop-shadow(0 30px 60px rgba(220,38,38,0.25))' }} aria-label="STEAM pentagon">
                  <defs>
                    <linearGradient id="g-red"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#DC2626" /><stop offset="1" stopColor="#F87171" /></linearGradient>
                    <linearGradient id="g-orn"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EA580C" /><stop offset="1" stopColor="#FBBF24" /></linearGradient>
                    <linearGradient id="g-blu"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1E3A8A" /><stop offset="1" stopColor="#3B82F6" /></linearGradient>
                    <linearGradient id="g-cyn"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0891B2" /><stop offset="1" stopColor="#60A5FA" /></linearGradient>
                    <linearGradient id="g-ind"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4F46E5" /><stop offset="1" stopColor="#A5B4FC" /></linearGradient>
                  </defs>
                  {(() => {
                    const cx = 150, cy = 150, r = 130;
                    const slices = [
                      { name: 'ENGINEERING', fill: 'url(#g-blu)', angleOffset: -90 },
                      { name: 'ART',         fill: 'url(#g-red)', angleOffset: -18 },
                      { name: 'MATHEMATICS', fill: 'url(#g-ind)', angleOffset:  54 },
                      { name: 'SCIENCE',     fill: 'url(#g-cyn)', angleOffset: 126 },
                      { name: 'TECHNOLOGY',  fill: 'url(#g-orn)', angleOffset: 198 },
                    ];
                    const rad = (d) => (d * Math.PI) / 180;
                    return slices.map((s) => {
                      const half = 36;
                      const x1 = cx + r * Math.cos(rad(s.angleOffset - half));
                      const y1 = cy + r * Math.sin(rad(s.angleOffset - half));
                      const x2 = cx + r * Math.cos(rad(s.angleOffset + half));
                      const y2 = cy + r * Math.sin(rad(s.angleOffset + half));
                      const lx = cx + r * 0.62 * Math.cos(rad(s.angleOffset));
                      const ly = cy + r * 0.62 * Math.sin(rad(s.angleOffset));
                      // Rotate label to run along slice axis (readable orientation)
                      let rot = s.angleOffset + 90;
                      if (rot > 90 && rot < 270) rot -= 180;
                      return (
                        <g key={s.name}>
                          <path d={`M${cx},${cy} L${x1},${y1} L${x2},${y2} Z`} fill={s.fill} stroke="#0A1F44" strokeWidth="4" strokeLinejoin="round" />
                          <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${rot} ${lx} ${ly})`} style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 800, fontSize: 11, fill: '#fff', letterSpacing: '0.14em' }}>{s.name}</text>
                        </g>
                      );
                    });
                  })()}
                  {/* center hub */}
                  <circle cx="150" cy="150" r="34" fill="#FFFFFF" stroke="#DC2626" strokeWidth="3" />
                  <text x="150" y="152" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 800, fontSize: 15, fill: '#0A1F44', letterSpacing: '0.16em' }}>STEAM</text>
                </svg>

                {/* Improves grades in — glass card */}
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '1.25rem 1.25rem', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", minWidth: 190, backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', letterSpacing: '0.04em' }}>Improves grades in</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0', display: 'grid', gap: '0.6rem' }}>
                    {[
                      { l: 'Physics',      i: Zap,            c: '#F87171' },
                      { l: 'Maths',        i: Calculator,     c: '#60A5FA' },
                      { l: 'Computers',    i: TerminalSquare, c: '#A5B4FC' },
                      { l: 'Art & Craft',  i: Palette,        c: '#FBBF24' },
                    ].map((it) => (
                      <li key={it.l} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${it.c}22`, color: it.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${it.c}44` }}>
                          <it.i size={15} />
                        </div>
                        {it.l}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* Download Curriculum CTA under the pentagon */}
          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
            <a href={CURRICULUM_PDF} onClick={openGate} data-testid="rb-curr-download" className="rb-btn rb-btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem' }}>
              <Download size={18} /> Download Full Curriculum
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ 06B — INTERACTIVE BOOKS ═══════════ */}
      <section data-testid="rb-books" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"  style={{ width: 360, height: 360, top: -120, left: -80, opacity: 0.18 }} />
        <div className="rb-orb rb-orb-blue" style={{ width: 400, height: 400, bottom: -140, right: -80, opacity: 0.18 }} />

        <div style={{ position: 'relative', maxWidth: 1320, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '2rem' }}>interactive books</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2.2rem, 4.6vw, 3.4rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              A Robotics &amp; AI Book for <span className="rb-stroke">Grade 1 to Grade 8.</span>
            </h2>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1.1rem', maxWidth: 720, margin: '1rem auto 0', color: '#475569', lineHeight: 1.6 }}>
              Beautifully illustrated, story-driven student books — mapped to every lesson and every kit component.
            </p>
          </div>

          <div className="rb-books-grid">
            {BOOKS.map((b) => (
              <button
                key={b.grade}
                type="button"
                onClick={() => setActiveBook(b)}
                aria-label={`Open ${b.grade} · ${b.theme} sample book`}
                className="rb-book-link rb-book-pad"
                style={{ background: 'transparent', border: 'none', padding: 0, width: '100%', textAlign: 'inherit', font: 'inherit' }}
                data-testid={`rb-book-${b.grade.replace(/\s+/g, '').toLowerCase()}`}
              >
                <div className="rb-book">
                  <div className="rb-book-inner" style={{ '--spine': b.spine }}>
                    <img src={b.src} alt={`Robotics ${b.grade}`} className="rb-book-cover" />
                  </div>
                </div>
                <div style={{ marginTop: '0.85rem', textAlign: 'center', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>
                  <div className="rb-h4" style={{ fontSize: '0.78rem', color: '#0A1F44' }}>{b.grade}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 1 }}>{b.theme}</div>
                </div>
                <div className="rb-book-cta">
                  <BookOpen size={11} /> Click to open sample
                </div>
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: '2rem', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontSize: '0.95rem', color: '#DC2626', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <BookOpen size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
            Click any book to open a sample
          </p>
        </div>
      </section>

      {/* ═══════════ 07 — (removed: What your school gets pillars section) ═══════════ */}

      {/* ═══════════ 07.5 — HANDS-ON KITS ═══════════ */}
      <section data-testid="rb-kits" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #F1F5F9 0%, #FFFFFF 60%)', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red" style={{ width: 380, height: 380, top: -140, left: -80, opacity: 0.15 }} />
        <div className="rb-orb rb-orb-blue" style={{ width: 320, height: 320, bottom: -100, right: -80, opacity: 0.18 }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1 }}>hands-on kits</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44', marginTop: '0.4rem' }}>
              Real hardware in <span className="rb-stroke">every child&apos;s hands.</span>
            </h2>
            <p className="rb-serif" style={{ fontSize: '1rem', maxWidth: 700, margin: '0.9rem auto 0', color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>
              Every OLL kit is designed grade-by-grade — with the exact components, coding platform and AI tools each child needs for that year.
            </p>
          </div>

          {/* ── Robotics & AI Projects for Students (Grade 1–10) — Single video ── */}
          <div style={{ marginBottom: '3.5rem' }}>
            <div className="rb-kits-sub">01 · Projects</div>
            <div className="rb-kits-title">Robotics &amp; AI Projects for Students grade 1 to 10.</div>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', maxWidth: 820, margin: '0.75rem 0 1.5rem', color: '#475569', lineHeight: 1.6 }}>
              A single showreel of grade-wise projects — from first robots in Grade 1 to full IoT &amp; AI builds by Grade 10.
            </p>
            <div className="rb-projects-video" data-testid="rb-projects-video">
              <div className="rb-projects-video-inner">
                <PlayCircle size={72} strokeWidth={1.2} />
                <div className="rb-projects-video-title">Grade-wise Robotics &amp; AI Projects · Full Showreel</div>
                <div className="rb-projects-video-sub">Video will be embedded here — reach out to your OLL coordinator for the latest reel.</div>
              </div>
            </div>
          </div>

          {/* ── Parts breakdown — 4 Pillars in every Robotics Project ── */}
          <div style={{ marginBottom: '3.5rem' }}>
            <div className="rb-kits-sub">02 · The 4 Pillars</div>
            <div className="rb-kits-title">4 pillars in every Robotics project.</div>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', maxWidth: 900, margin: '0.75rem 0 1.75rem', color: '#475569', lineHeight: 1.65 }} data-testid="rb-kits-parts-intro">
              We offer robotics kits that are fully aligned with the rigorous Robotics and AI curriculum guidelines set forth in
              <strong style={{ color: '#0A1F44', fontWeight: 700 }}> NEP 2020 and NCF 2023</strong>. Our Robotic kits are specifically designed for classroom learning,
              providing students with a hands-on experience that brings theories and concepts to life. The kits are easily programmable, providing a seamless learning experience.
              Additionally, all kits come with a comprehensive <strong style={{ color: '#0A1F44', fontWeight: 700 }}>12-month warranty on damage</strong>, giving schools peace of mind and the assurance that our kits are of the highest quality.
              We also provide open-source hardware like <strong style={{ color: '#0A1F44', fontWeight: 700 }}>Arduino</strong>.
            </p>
            <div className="rb-parts-grid" data-testid="rb-kits-parts">
              {PARTS_BREAKDOWN.map((p) => (
                <div key={p.t} className="rb-part-card" style={{ '--pc': p.color }}>
                  <div className="rb-pillar-img" style={{ background: `${p.color}0F`, border: `1px solid ${p.color}33` }}>
                    <img
                      src={p.img}
                      alt={p.t}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                    />
                    <div className="rb-pillar-fallback" style={{ color: p.color }}>
                      <p.i size={40} strokeWidth={1.6} />
                    </div>
                  </div>
                  <div className="rb-part-t" style={{ marginTop: '0.9rem' }}>{p.t}</div>
                  <div className="rb-part-s">{p.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Individual Take-home kits ── */}
          <div style={{ marginBottom: '3.5rem' }}>
            <div className="rb-kits-sub">03 · Individual Take-Home Kits</div>
            <div className="rb-kits-title">A dedicated kit — one for every child, one for every grade.</div>
            <div className="rb-takehome-grid" data-testid="rb-kits-takehome">
              {TAKE_HOME_KITS.map((k) => (
                <div
                  key={k.grade}
                  className="rb-kit-card"
                  style={{ '--kb': k.bg }}
                  onClick={() => setActiveKit({ type: 'grade', ...k })}
                  data-testid={`rb-kit-${k.grade.toLowerCase().replace(' ', '-')}`}
                >
                  <div className="rb-kit-hint">Click to peek inside</div>
                  <img src={k.src} alt={`${k.grade} Robotics Kit`} className="rb-kit-img" loading="lazy" />
                  <div className="rb-kit-tag">{k.grade}</div>
                  <div className="rb-kit-name">Robotics Kit</div>
                  <div className="rb-kit-theme">{k.theme}</div>
                  {k.unboxing && (
                    <a
                      href={k.unboxing}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="rb-kit-unbox"
                      data-testid={`rb-kit-unbox-${k.grade.toLowerCase().replace(' ', '-')}`}
                    >
                      <PlayCircle size={14} /> Unboxing video
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Lab setup - Master Kit ── */}
          <div style={{ marginBottom: '3rem' }}>
            <div className="rb-kits-sub">04 · Lab Setup — Master Kit</div>
            <div className="rb-kits-title">Setup a Full Robotics Lab in your school.</div>
            <div className="rb-lab-grid" data-testid="rb-kits-lab">
              {LAB_KITS.map((l) => (
                <div
                  key={l.title}
                  className="rb-lab-card"
                  style={{ '--kb': l.bg }}
                  onClick={() => setActiveKit({ type: 'lab', grade: l.title, theme: l.sub, src: l.src, bg: l.bg })}
                  data-testid={`rb-lab-${l.title.toLowerCase().includes('junior') ? 'junior' : 'advanced'}`}
                >
                  <img src={l.src} alt={l.title} loading="lazy" />
                  <div>
                    <div className="rb-kit-tag">Master Kit</div>
                    <div style={{ fontFamily: "'Proxima Nova', sans-serif", fontWeight: 800, fontSize: '1.15rem', color: '#FFFFFF', marginTop: '0.5rem', lineHeight: 1.2 }}>{l.title}</div>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.3rem', fontStyle: 'italic' }}>{l.sub}</div>
                    <div style={{ marginTop: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Proxima Nova', sans-serif", fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FFFFFF', opacity: 0.9 }}>
                      Click to see what&apos;s inside <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Offer — Free Robotics Lab for first 100 schools ── */}
          <div className="rb-offer" data-testid="rb-kits-offer">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="rb-offer-pill"><Gift size={13} /> Limited launch offer</div>
              <h3>Get a Robotics Lab <span>FREE.</span></h3>
              <p>Only for the <strong style={{ color: '#FBBF24' }}>first 100 schools</strong> that book a demo this season. One complete Master Lab Kit — on the house — when you sign up for the Robotics Beginner program.</p>
              <button className="rb-offer-btn" onClick={bookDemo} data-testid="rb-offer-book-demo">
                Book a Demo <ArrowRight size={16} />
              </button>
              <div className="rb-slots-bar"><div className="rb-slots-fill" /></div>
              <div className="rb-slots-caption">
                <span>23 / 100 slots booked</span>
                <span style={{ color: '#FBBF24' }}>Hurry — 77 slots remaining</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 07.75 — LMS · Learning Management System ═══════════ */}
      <LMSSection
        scriptClass="rb-hand"
        displayClass="rb-h2"
        lightClass="rb-serif"
        eyebrowText="live analytics & resources"
        testid="rb-lms"
      />

      {/* ═══════════ 07.9 — YEAR-LONG TEACHER EMPOWERMENT PROGRAM ═══════════ */}
      <section data-testid="rb-teacher-empowerment" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"  style={{ width: 380, height: 380, top: -140, left: -80, opacity: 0.14 }} />
        <div className="rb-orb rb-orb-blue" style={{ width: 400, height: 400, bottom: -140, right: -80, opacity: 0.18 }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.8rem' }}>empowering educators</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Year Long <span className="rb-stroke">Teacher Empowerment</span> Program.
            </h2>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1.02rem', maxWidth: 860, margin: '1rem auto 0', color: '#475569', lineHeight: 1.65 }}>
              We believe in empowering our school&rsquo;s teachers to make this a long-term sustainable program — <strong style={{ color: '#0A1F44', fontWeight: 700 }}>Computers, Science and Maths teachers</strong> are preferred to teach this program. At the end, all teachers get a certification from <strong style={{ color: '#0A1F44', fontWeight: 700 }}>STEM.org</strong>. Empower them with the tools to implement advanced technologies in education. Our focus on continuous professional development ensures quality education, preparing students for a digitized future.
            </p>
          </div>

          {/* Year-round training timeline */}
          <div className="rb-tep-timeline" data-testid="rb-tep-timeline">
            {[
              { m: 'Month 1', d: '6 Days',  t: 'Initial Training Workshop',    c: '#DC2626', ic: GraduationCap },
              { m: 'Month 3', d: '3 Days',  t: 'Competition Prep',             c: '#EA580C', ic: Trophy },
              { m: 'Month 6', d: '2 Days',  t: 'Exhibition Prep',              c: '#0EA5E9', ic: Sparkles },
              { m: 'Month 8', d: '2 Days',  t: 'Advanced Refresher',           c: '#1E3A8A', ic: Award },
            ].map((s, i) => (
              <div key={s.m} className="rb-tep-step" style={{ '--tc': s.c }} data-testid={`rb-tep-step-${i}`}>
                <div className="rb-tep-icon"><s.ic size={22} /></div>
                <div className="rb-tep-month">{s.m}</div>
                <div className="rb-tep-days">{s.d}</div>
                <div className="rb-tep-title">{s.t}</div>
              </div>
            ))}
          </div>

          {/* Ongoing support pills */}
          <div className="rb-tep-support" data-testid="rb-tep-support">
            {[
              { i: BookOpen, t: 'Weekly Learning Workshops', s: 'Ongoing pedagogy refreshers, every week — with the OLL Academic Team.' },
              { i: LifeBuoy, t: '24×7 Doubt Solving',        s: 'Dedicated WhatsApp group for real-time doubt solving with expert educators.' },
              { i: Phone,    t: 'Video Call Expert Support', s: 'On-demand video calls with senior OLL educators — anytime, any grade.' },
              { i: Award,    t: 'STEM.org Certification',    s: 'Every teacher earns a globally recognised STEM.org educator certificate.' },
            ].map((c, i) => (
              <div key={c.t} className="rb-tep-card" data-testid={`rb-tep-support-${i}`}>
                <div className="rb-tep-card-icon"><c.i size={22} /></div>
                <div className="rb-tep-card-title">{c.t}</div>
                <div className="rb-tep-card-sub">{c.s}</div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          .rb-tep-timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; position: relative; margin-bottom: 3rem; }
          .rb-tep-timeline::before { content: ''; position: absolute; top: 42px; left: 12%; right: 12%; height: 2px; background: linear-gradient(90deg, #DC2626, #EA580C, #0EA5E9, #1E3A8A); opacity: 0.35; z-index: 0; }
          @media (max-width: 780px) { .rb-tep-timeline { grid-template-columns: repeat(2, 1fr); } .rb-tep-timeline::before { display: none; } }
          @media (max-width: 460px) { .rb-tep-timeline { grid-template-columns: 1fr; } }
          .rb-tep-step { position: relative; z-index: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 1.15rem; padding: 1.4rem 1.25rem; text-align: center; box-shadow: 0 10px 30px rgba(15,30,80,0.06); transition: transform 0.3s ease, box-shadow 0.3s ease; }
          .rb-tep-step:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(15,30,80,0.12); }
          .rb-tep-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--tc); color: #fff; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px color-mix(in srgb, var(--tc) 35%, transparent); margin-bottom: 0.9rem; }
          .rb-tep-month { font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--tc); }
          .rb-tep-days { font-family: 'Anton', 'Proxima Nova', sans-serif; font-weight: 400; font-size: 2rem; line-height: 1; color: #0A1F44; margin: 4px 0 6px; letter-spacing: 0.02em; }
          .rb-tep-title { font-family: 'Proxima Nova', sans-serif; font-weight: 600; font-size: 0.92rem; color: #475569; line-height: 1.4; }

          .rb-tep-support { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
          @media (max-width: 900px) { .rb-tep-support { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 520px) { .rb-tep-support { grid-template-columns: 1fr; } }
          .rb-tep-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 1.15rem; padding: 1.4rem 1.25rem; box-shadow: 0 6px 18px rgba(15,30,80,0.05); transition: all 0.3s ease; }
          .rb-tep-card:hover { border-color: #DC2626; transform: translateY(-4px); box-shadow: 0 16px 32px rgba(220,38,38,0.12); }
          .rb-tep-card-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(220,38,38,0.10); color: #DC2626; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; }
          .rb-tep-card-title { font-family: 'Proxima Nova', sans-serif; font-weight: 800; font-size: 1rem; color: #0A1F44; }
          .rb-tep-card-sub { font-family: 'Proxima Nova', sans-serif; font-weight: 400; font-size: 0.86rem; color: #64748B; margin-top: 0.35rem; line-height: 1.5; }
        `}</style>
      </section>

      {/* ═══════════ 08 — ABOUT OLL + 08B — REAL SCHOOLS (shared) ═══════════ */}
      <RbAboutOLL />
      <RbRealSchools />

      {/* ═══════════ 09 — GROWTH PATH ═══════════ */}
      <section data-testid="rb-growth" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#FFFFFF', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 380, height: 380, top: -140, left: -80, opacity: 0.2 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 380, height: 380, bottom: -140, right: -80, opacity: 0.2 }} />

        <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>a long-term journey</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Start here. Then go <span className="rb-stroke">advanced.</span>
            </h2>
            <p className="rb-serif" style={{ fontSize: '1rem', maxWidth: 640, margin: '0.9rem auto 0', color: '#475569', fontStyle: 'italic' }}>
              OLL is a long-term partner — not a one-year Robotics vendor.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {GROWTH_PATH.map((g, i) => (
              <div key={g.level} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1.15rem', padding: '1.25rem 1.5rem', position: 'relative' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${g.color}, #0A1F44 130%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="rb-h3" style={{ fontSize: '1.3rem' }}>0{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: g.color, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800 }}>{g.level}</div>
                  <h3 className="rb-h3" style={{ fontSize: '1.4rem', color: '#0A1F44', marginTop: 3 }}>{g.verb}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#64748B', marginTop: 4 }}>{g.s}</div>
                </div>
                {i < GROWTH_PATH.length - 1 && (
                  <div style={{ position: 'absolute', bottom: -14, left: 43, width: 2, height: 20, background: '#E2E8F0' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 10 — FINAL CTA ═══════════ */}
      <section id="demo" data-testid="rb-final-cta" style={{ position: 'relative', padding: '6rem 1.25rem', background: 'linear-gradient(135deg, #DC2626 0%, #1E3A8A 100%)', color: '#fff', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 460, height: 460, top: -160, left: -100 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 420, height: 420, bottom: -160, right: -80 }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 780, margin: '0 auto', textAlign: 'center', zIndex: 1 }}>
          <Sparkles size={38} style={{ color: '#FCA5A5', margin: '0 auto 0.9rem' }} />
          <h2 className="rb-h1" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', lineHeight: 1 }}>
            Ready to build your<br />future-skills powerhouse?
          </h2>
          <p className="rb-serif" style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.9)', marginTop: '1rem', fontStyle: 'italic' }}>
            Start your school&apos;s Robotics journey with OLL.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2rem' }}>
            <button onClick={bookDemo} data-testid="rb-final-book" className="rb-btn" style={{ background: '#fff', color: '#0A1F44', padding: '1.1rem 2.2rem', fontSize: '1.05rem', boxShadow: '0 18px 40px rgba(0,0,0,0.3)' }}>
              Book a School Demo <ArrowRight size={18} />
            </button>
            <a href="tel:+919820106645" data-testid="rb-final-call" className="rb-btn rb-btn-ghost-white" style={{ padding: '1.1rem 2.2rem', fontSize: '1.05rem' }}>
              <Phone size={16} /> Talk to an OLL Expert
            </a>
          </div>
          <div style={{ marginTop: '2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
            <PlayCircle size={14} /> Free · No commitment · 30-min walkthrough
          </div>
        </div>
      </section>

      <CurriculumGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        pdfUrl={CURRICULUM_PDF}
        pdfName="OLL-Robotics-Beginner-Curriculum-2026-27.pdf"
        title="Where should we send the Robotics & AI curriculum?"
        offering="Robotics & AI Program (Grades 1-8)"
        program="Robotics"
        source="robotics-ai-program-curriculum-download"
        testid="rb-curriculum-gate"
      />

      {/* ═══════════ Kit inspection modal ═══════════ */}
      {activeKit && (
        <div className="rb-modal-back" onClick={() => setActiveKit(null)} data-testid="rb-kit-modal">
          <div className="rb-modal" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <button className="rb-modal-close" onClick={() => setActiveKit(null)} data-testid="rb-kit-modal-close" aria-label="Close">×</button>
            <div className="rb-modal-img" style={{ '--kb': activeKit.bg }}>
              <img src={activeKit.src} alt={`${activeKit.grade} kit`} />
            </div>
            <div className="rb-modal-body">
              <div style={{ fontFamily: "'Proxima Nova', sans-serif", fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#DC2626', marginBottom: '0.5rem' }}>
                {activeKit.type === 'lab' ? "What's inside — Master Lab Kit" : `What's inside — ${activeKit.grade} Kit`}
              </div>
              <h3 className="rb-h3" style={{ fontSize: '1.4rem', color: '#0A1F44', lineHeight: 1.2, marginBottom: '0.35rem' }}>
                {activeKit.type === 'lab' ? activeKit.grade : `${activeKit.grade} — Robotics Kit`}
              </h3>
              <div style={{ fontStyle: 'italic', color: '#64748B', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{activeKit.theme}</div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.7rem' }}>
                {(activeKit.type === 'lab'
                  ? [
                      { i: Cog,   t: 'Construction sets for 30 students' },
                      { i: Cpu,   t: 'Micro-controllers, sensors & motors — class-set quantities' },
                      { i: Code2, t: 'Block-based + Python coding platform access' },
                      { i: Brain, t: 'AI Vision & voice add-on modules' },
                      { i: BookOpen, t: 'Teacher handbook + lesson plans + student workbooks' },
                    ]
                  : [
                      { i: Cog,   t: 'Grade-specific chassis, frames & mounts' },
                      { i: Cpu,   t: 'Micro-controller with sensors & motors matched to the grade' },
                      { i: Code2, t: 'Coding platform access (block-based → Python)' },
                      { i: BookOpen, t: 'Student workbook with 20+ hands-on projects' },
                      { i: Award, t: 'Certificate on programme completion' },
                    ]
                ).map((it) => (
                  <li key={it.t} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', color: '#334155', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    <it.i size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                    <span>{it.t}</span>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: '1.5rem', padding: '0.9rem 1rem', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '0.75rem', fontSize: '0.82rem', color: '#78350F', fontStyle: 'italic' }}>
                Detailed component photos coming soon — reach out to your OLL coordinator for a full bill of materials.
              </div>
            </div>
          </div>
        </div>
      )}
      <SchoolRelatedPrograms current="robotics-beginner" theme="light" testid="rb-related-programs" />

      {/* ── Sample Book flipbook lightbox — embeds the Heyzine flipbook per grade ── */}
      {activeBook && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${activeBook.grade} sample book`}
          data-testid="rb-sample-modal"
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
                <div style={{
                  fontFamily: "'Caveat', cursive", fontWeight: 700, color: '#FCA5A5',
                  fontSize: '1.15rem', lineHeight: 1,
                }}>
                  sample book
                </div>
                <div style={{
                  fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 700,
                  fontSize: 'clamp(0.95rem, 2.2vw, 1.4rem)', marginTop: 4,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {activeBook.grade} · {activeBook.theme}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <a
                  href={activeBook.flip}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="rb-sample-open-new"
                  className="rb-sample-open-new"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: "'Proxima Nova', 'Montserrat', sans-serif",
                    fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)',
                    padding: '0.5rem 0.85rem', borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.25)', textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Open in new tab
                </a>
                <button
                  onClick={() => { setActiveBook(null); bookDemo(); }}
                  data-testid="rb-sample-demo"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: "'Proxima Nova', 'Montserrat', sans-serif",
                    fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: '#fff', background: '#DC2626',
                    padding: '0.5rem 0.85rem', borderRadius: 999, border: 'none', cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                >
                  Book a Demo <ArrowRight size={12} />
                </button>
                <button
                  onClick={() => setActiveBook(null)}
                  aria-label="Close sample book"
                  data-testid="rb-sample-close"
                  style={{
                    width: 38, height: 38, borderRadius: 999,
                    background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', cursor: 'pointer',
                    fontSize: '1.35rem', fontWeight: 700, lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
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
                title={`${activeBook.grade} · ${activeBook.theme} sample book`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                allow="fullscreen; autoplay; clipboard-write"
                allowFullScreen
                loading="lazy"
                data-testid="rb-sample-frame"
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
