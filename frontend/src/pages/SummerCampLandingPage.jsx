import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Cpu, Code, Brain, Box, Clock, Users, MapPin, ArrowRight, Check, Star, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ── Images ────────────────────────────────────────────────────────────────────
const IMAGES = {
  kidsRobot:   'https://images.unsplash.com/photo-1743677077216-00a458eff9e0?crop=entropy&cs=srgb&fm=jpg&w=800&q=75',
  kidsTable:   'https://images.unsplash.com/photo-1740205644066-0ca1535e19ff?crop=entropy&cs=srgb&fm=jpg&w=800&q=75',
  boySolder:   'https://images.unsplash.com/photo-1537151242758-331155dcf21b?crop=entropy&cs=srgb&fm=jpg&w=800&q=75',
  boyRobotToy: 'https://images.pexels.com/photos/8294682/pexels-photo-8294682.jpeg?auto=compress&cs=tinysrgb&w=600',
  twoKidsRobot:'https://images.pexels.com/photos/8294687/pexels-photo-8294687.jpeg?auto=compress&cs=tinysrgb&w=600',
  girlCoding:  'https://images.unsplash.com/photo-1771408427146-09be9a1d4535?crop=entropy&cs=srgb&fm=jpg&w=800&q=75',
};

// ── Data ──────────────────────────────────────────────────────────────────────
const AGE_GROUPS = [
  {
    slug: 'explorers', label: 'Little Explorers', ages: '4 – 8',
    tagline: 'First steps into robotics & coding',
    color: '#00E5FF', accentBg: 'rgba(0,229,255,0.08)',
    subjects: [
      { icon: Cpu,   name: 'Junior Robotics',  desc: 'Build and control their first robot using drag-and-drop programming', level: 'Beginner' },
      { icon: Code,  name: 'Block Coding',      desc: 'Visual coding with Scratch — create games, stories, and animations', level: 'Beginner' },
      { icon: Brain, name: 'AI for Kids',        desc: 'Train a simple AI model to recognize objects and voices', level: 'Intro' },
      { icon: Box,   name: '3D Thinking',        desc: 'Design and print simple 3D objects using kid-friendly tools', level: 'Intro' },
    ],
  },
  {
    slug: 'creators', label: 'Tech Creators', ages: '9 – 12',
    tagline: 'Build robots and write real code',
    color: '#D63031', accentBg: 'rgba(214,48,49,0.08)',
    subjects: [
      { icon: Cpu,   name: 'Arduino Robotics',  desc: 'Build sensor-driven robots and program them with real code', level: 'Intermediate' },
      { icon: Code,  name: 'Python Basics',      desc: 'Write real Python programs — games, automations, and web scripts', level: 'Intermediate' },
      { icon: Brain, name: 'Machine Learning',   desc: 'Train ML models to classify images and make predictions', level: 'Intermediate' },
      { icon: Box,   name: '3D Designing',       desc: 'Design 3D models in Tinkercad and understand engineering basics', level: 'Intermediate' },
    ],
  },
  {
    slug: 'innovators', label: 'Future Innovators', ages: '13 – 16',
    tagline: 'AI, 3D Design & advanced robotics',
    color: '#7C3AED', accentBg: 'rgba(124,58,237,0.08)',
    subjects: [
      { icon: Cpu,   name: 'Advanced Robotics', desc: 'Build autonomous robots with vision systems and IoT connectivity', level: 'Advanced' },
      { icon: Code,  name: 'Python + Web Dev',  desc: 'Full Python programming with real-world project deployment', level: 'Advanced' },
      { icon: Brain, name: 'Deep Learning & AI',desc: 'Build neural networks, chatbots, and AI-powered applications', level: 'Advanced' },
      { icon: Box,   name: 'Pro 3D Design',     desc: 'Master Fusion 360 for engineering-grade product design', level: 'Advanced' },
    ],
  },
];

const CENTERS = [
  { id: 'mira_road', name: 'Mira Road',     address: 'OLL Center, Mira Road, Mumbai' },
  { id: 'dombivli',  name: 'Dombivli',      address: 'OLL Center, Pallava, Dombivli' },
  { id: 'andheri',   name: 'Andheri West',  address: 'Lokhandwala Complex, Andheri W' },
  { id: 'online',    name: 'Online',         address: 'Live via Zoom · Anywhere in India' },
];

const BATCH_DATES = [
  { id: 'week1', weekday: 'May 1–5, 2026',   weekend: 'May 2–3 & 9–10',   label: 'Batch 1' },
  { id: 'week2', weekday: 'May 8–12, 2026',  weekend: 'May 9–10 & 16–17', label: 'Batch 2' },
  { id: 'week3', weekday: 'May 15–19, 2026', weekend: 'May 16–17 & 23–24',label: 'Batch 3' },
  { id: 'week4', weekday: 'May 22–26, 2026', weekend: 'May 23–24 & 30–31',label: 'Batch 4' },
];

const TESTIMONIALS = [
  { quote: 'My 6-year-old came home and said "Mom, I built a robot today!" — I couldn\'t believe it.', author: 'Priya Mehta', location: 'Mira Road', camp: 'Little Explorers' },
  { quote: 'He didn\'t want to leave the camp. He was debugging his robot at 6pm and refused to stop.', author: 'Rahul Sharma', location: 'Dombivli', camp: 'Tech Creators' },
  { quote: 'My daughter is now talking about doing computer science. Two weeks ago she had never coded.', author: 'Sunita Patel', location: 'Andheri West', camp: 'Future Innovators' },
  { quote: 'The mentors were so patient with my shy 7-year-old. He\'s now incredibly confident.', author: 'Vikram Nair', location: 'Online', camp: 'Little Explorers' },
  { quote: 'Best investment we\'ve made in our son\'s education. He talks about nothing else.', author: 'Kavita Joshi', location: 'Mira Road', camp: 'Tech Creators' },
  { quote: 'My 14-year-old daughter trained an AI model that recognized her face. Wild.', author: 'Sanjay Kumar', location: 'Dombivli', camp: 'Future Innovators' },
];

const PRESS_ITEMS = [
  'Shark Tank India', 'Kaun Banega Crorepati', 'NDTV', 'Times of India',
  'Economic Times', 'India Today', 'YourStory', 'Inc42',
];

const INCLUDES = [
  'Kit & materials for all projects', 'Certificate of completion',
  'Live sessions with expert mentors', 'Max 10 students per batch',
  'Hands-on project portfolio', 'Camp photos & video reel',
];

// ── Countdown hook ─────────────────────────────────────────────────────────
function useCountdown() {
  const target = new Date('2026-05-01T09:00:00+05:30').getTime();
  const [t, setT] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setT(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  return {
    days: Math.floor(t / 86400000),
    hours: Math.floor((t % 86400000) / 3600000),
    minutes: Math.floor((t % 3600000) / 60000),
    seconds: Math.floor((t % 60000) / 1000),
  };
}

// ── Scroll-reveal hook ─────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.sr');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('sr-vis'); io.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ── Typed text animation component ─────────────────────────────────────────
function TypedText({ text, speed = 52, startDelay = 0 }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted]     = useState(startDelay === 0);
  const [done, setDone]           = useState(false);

  useEffect(() => {
    if (startDelay === 0) return;
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (!started || done) return;
    if (displayed.length >= text.length) { setDone(true); return; }
    const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
    return () => clearTimeout(t);
  }, [displayed, started, done, text, speed]);

  return (
    <span>
      {displayed}
      <span className={`typed-cursor${done ? ' typed-cursor-blink' : ''}`} />
    </span>
  );
}
function CircuitBg({ opacity = 0.22 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity, pointerEvents: 'none' }} aria-hidden>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="ckt" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            {/* Full cell border — draws all 4 sides */}
            <rect x="0" y="0" width="100" height="100" fill="none" stroke="#00E5FF" strokeWidth="0.8" opacity="0.35"/>
            {/* Glowing corner node */}
            <circle cx="0" cy="0" r="3.5" fill="#00E5FF" opacity="0.9"/>
            {/* Mid-line traces — horizontal + vertical */}
            <line x1="50" y1="0" x2="50" y2="36" stroke="#00E5FF" strokeWidth="0.8" opacity="0.4"/>
            <line x1="50" y1="64" x2="50" y2="100" stroke="#00E5FF" strokeWidth="0.8" opacity="0.4"/>
            <line x1="0" y1="50" x2="36" y2="50" stroke="#00E5FF" strokeWidth="0.8" opacity="0.4"/>
            <line x1="64" y1="50" x2="100" y2="50" stroke="#00E5FF" strokeWidth="0.8" opacity="0.4"/>
            {/* Centre node ring */}
            <circle cx="50" cy="50" r="5" fill="none" stroke="#00E5FF" strokeWidth="1" opacity="0.6"/>
            <circle cx="50" cy="50" r="2"   fill="#00E5FF" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ckt)"/>
      </svg>
    </div>
  );
}

// ── Countdown unit ──────────────────────────────────────────────────────────
function CUnit({ value, label }) {
  return (
    <div className="cunit">
      <div className="cunit-val">{String(value).padStart(2, '0')}</div>
      <div className="cunit-lbl">{label}</div>
    </div>
  );
}

export default function SummerCampLandingPage() {
  const { ageGroup } = useParams();
  const navigate = useNavigate();
  const countdown = useCountdown();
  useScrollReveal();

  const [activeAgeIdx, setActiveAgeIdx] = useState(() => {
    const idx = AGE_GROUPS.findIndex(g => g.slug === ageGroup);
    return idx >= 0 ? idx : 0;
  });
  const [batchType, setBatchType] = useState('weekday');
  const activeCamp = AGE_GROUPS[activeAgeIdx];

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <Helmet>
        <title>Future Skills Summer Camp 2026 — Robotics, AI & Coding | OLL Mumbai</title>
        <meta name="description" content="India's best kids tech summer camp. Robotics, Coding, AI & 3D Design for ages 4–16. Mumbai + online. May 2026. As seen on Shark Tank India." />
      </Helmet>

      <style>{`
        /* ── Fonts ── */
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;0,800;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');

        /* ── Typing cursor ── */
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .typed-cursor {
          display:inline-block; width:3px; height:0.9em;
          background:#00E5FF; margin-left:4px; border-radius:1px;
          vertical-align:text-bottom;
          box-shadow: 0 0 8px rgba(0,229,255,0.9);
        }
        .typed-cursor-blink { animation: cursor-blink 1s step-end infinite; }

        /* ── Animations ── */
        @keyframes fadeUp   { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes ticker   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes glowPulse{ 0%,100%{box-shadow:0 0 22px rgba(214,48,49,0.45)} 50%{box-shadow:0 0 55px rgba(214,48,49,0.75),0 0 100px rgba(214,48,49,0.2)} }
        @keyframes scanline { 0%{top:-5%} 100%{top:105%} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes countUp  { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
        @keyframes borderGlow { 0%,100%{border-color:rgba(0,229,255,0.2)} 50%{border-color:rgba(0,229,255,0.6)} }

        /* ── Hero entrance stagger ── */
        .h-badge  { animation: fadeUp 0.5s ease 0.05s both; }
        .h-eyebrow{ animation: fadeUp 0.5s ease 0.15s both; }
        .h-title  { animation: fadeUp 0.6s ease 0.25s both; }
        .h-body   { animation: fadeUp 0.6s ease 0.38s both; }
        .h-pills  { animation: fadeUp 0.5s ease 0.5s  both; }
        .h-cta    { animation: fadeUp 0.5s ease 0.6s  both; }
        .h-imgs   { animation: fadeUp 0.7s ease 0.35s both; }
        .h-count  { animation: fadeUp 0.5s ease 0.75s both; }

        /* ── Scroll reveal ── */
        .sr { opacity:0; transform:translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .sr.sr-vis { opacity:1; transform:translateY(0); }
        .sr-d1 { transition-delay:0.1s; }
        .sr-d2 { transition-delay:0.2s; }
        .sr-d3 { transition-delay:0.3s; }
        .sr-d4 { transition-delay:0.4s; }
        .sr-d5 { transition-delay:0.5s; }

        /* ── Countdown ── */
        .cunit { display:flex; flex-direction:column; align-items:center; gap:6px; }
        .cunit-val {
          min-width:72px; height:78px;
          display:flex; align-items:center; justify-content:center;
          border-radius:12px;
          background:linear-gradient(145deg,rgba(0,229,255,0.15),rgba(0,229,255,0.04));
          border:1px solid rgba(0,229,255,0.4);
          font-family:'JetBrains Mono',monospace; font-weight:800; font-size:1.75rem; color:#00E5FF;
          letter-spacing:-0.02em;
          animation: borderGlow 3s ease-in-out infinite;
          box-shadow: 0 0 24px rgba(0,229,255,0.12), inset 0 0 20px rgba(0,229,255,0.05);
        }
        .cunit-lbl { font-size:0.62rem; color:#334155; text-transform:uppercase; letter-spacing:0.18em; font-family:'JetBrains Mono',monospace; font-weight:700; }

        /* ── Ticker ── */
        .ticker-wrap { overflow:hidden; mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent); -webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent); }
        .ticker-inner { display:flex; width:max-content; animation:ticker 28s linear infinite; }
        .ticker-inner:hover { animation-play-state:paused; }
        .ticker-item {
          display:inline-flex; align-items:center; gap:8px;
          padding:10px 28px; margin:0 6px; border-radius:999px; white-space:nowrap;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
          font-family:'JetBrains Mono',monospace; font-weight:700; font-size:0.88rem; color:#94A3B8;
          transition:all 0.2s;
        }
        .ticker-item:hover { color:#F8FAFC; border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.08); }

        /* ── Neon CTA button ── */
        .neon-btn {
          display:inline-flex; align-items:center; gap:10px;
          background:#D63031; color:#fff;
          font-family:'JetBrains Mono',monospace; font-weight:700; font-size:0.98rem; letter-spacing:0.01em;
          padding:1.1rem 2.6rem; border-radius:999px; border:none; cursor:pointer;
          animation: glowPulse 3s ease-in-out infinite;
          transition: transform 0.2s, background 0.2s;
          position:relative; overflow:hidden;
        }
        .neon-btn::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);
          transform:translateX(-100%); transition:transform 0.5s;
        }
        .neon-btn:hover { transform:scale(1.04) translateY(-1px); background:#e8353f; }
        .neon-btn:hover::after { transform:translateX(100%); }
        .neon-btn-sm { padding:0.7rem 1.6rem; font-size:0.82rem; }

        /* ── Card hover ── */
        .camp-card {
          border-radius:1.25rem; padding:1.75rem;
          background:rgba(15,28,50,0.7); backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.07);
          transition:border-color 0.3s, transform 0.3s, box-shadow 0.3s;
          position:relative; overflow:hidden;
        }
        .camp-card:hover { transform:translateY(-5px); box-shadow:0 20px 50px rgba(0,0,0,0.4); }

        /* ── Tab button ── */
        .age-tab {
          padding:0.75rem 1.6rem; border-radius:999px; cursor:pointer;
          font-family:'JetBrains Mono',monospace; font-weight:700; font-size:0.9rem;
          border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04);
          color:#64748B; transition:all 0.25s; white-space:nowrap;
        }
        .age-tab:hover { border-color:rgba(255,255,255,0.2); color:#CBD5E1; background:rgba(255,255,255,0.08); }
        .age-tab.active { color:#080C16; border-color:transparent; box-shadow: 0 0 20px var(--tab-color, #00E5FF)44; }

        /* ── Floating images ── */
        .fimg { border-radius:1.1rem; overflow:hidden; border:1px solid rgba(0,229,255,0.18); box-shadow:0 20px 60px rgba(0,0,0,0.55); }
        .fimg img { width:100%; height:100%; object-fit:cover; display:block; }
        .fimg-1 { animation:float 7s ease-in-out 0s infinite; }
        .fimg-2 { animation:float 7s ease-in-out 2.3s infinite; }
        .fimg-3 { animation:float 7s ease-in-out 4.6s infinite; }

        /* ── Mobile responsive ── */
        @media (max-width:640px) {
          .cunit-val { min-width:56px; height:62px; font-size:1.35rem; }
          .hero-grid { grid-template-columns:1fr !important; }
          .hero-img-col { display:none !important; }
          .countdown-inner { flex-direction:column; gap:1rem; }
          .countdown-stats { justify-content:center; }
          .age-tabs-row { justify-content:flex-start !important; overflow-x:auto; padding-bottom:4px; flex-wrap:nowrap !important; }
          .age-tab { font-size:0.8rem; padding:0.6rem 1.1rem; }
          .batch-toggle { flex-direction:column; }
          .neon-btn { font-size:0.85rem; padding:0.95rem 1.9rem; }
          .center-grid { grid-template-columns:1fr 1fr !important; }
          .stats-row { grid-template-columns:repeat(3,1fr) !important; }
        }
        @media (max-width:400px) {
          .center-grid { grid-template-columns:1fr !important; }
          .cunit-val { min-width:48px; height:54px; font-size:1.1rem; }
          .stats-row { grid-template-columns:repeat(2,1fr) !important; }
        }

        /* ── Cert 3D flip-in reveal ── */
        .cert-reveal {
          opacity:0;
          transform: perspective(900px) rotateX(40deg) scale(0.88);
          transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
        }
        .cert-reveal.sr-vis { opacity:1; transform: perspective(900px) rotateX(0deg) scale(1); }
        .cert-reveal.sr-d1 { transition-delay:0.05s; }
        .cert-reveal.sr-d2 { transition-delay:0.22s; }
        .cert-reveal.sr-d3 { transition-delay:0.39s; }

        /* ── Cert card ── */
        .cert-card {
          border-radius:1.5rem; overflow:hidden; position:relative;
          border:1px solid rgba(255,255,255,0.08);
          background:rgba(10,20,40,0.8); backdrop-filter:blur(16px);
          transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
          display:flex; flex-direction:column; align-items:center;
        }
        .cert-card:hover {
          transform:translateY(-8px) scale(1.02);
          box-shadow:0 32px 80px rgba(0,0,0,0.55);
        }

        /* ── Media card ── */
        .media-card {
          position:relative; overflow:hidden; border-radius:1.25rem;
          border:1px solid rgba(255,255,255,0.08); cursor:pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .media-card:hover { transform:scale(1.03); box-shadow:0 24px 60px rgba(0,0,0,0.55); }
        .media-card img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.5s ease; }
        .media-card:hover img { transform:scale(1.06); }

        /* ── Scanline overlay ── */
        .scanline {
          position:absolute; left:0; right:0; height:2px;
          background:linear-gradient(90deg,transparent,rgba(0,229,255,0.25),transparent);
          animation: scanline 8s linear infinite;
          pointer-events:none;
        }

        /* ── Prose section label ── */
        .sec-label { font-family:'JetBrains Mono',monospace; font-size:0.78rem; letter-spacing:0.2em; text-transform:uppercase; font-weight:700; color:#00E5FF; margin-bottom:0.65rem; }
        .sec-label::before { content:'// '; opacity:0.45; }
        .sec-title { font-family:'JetBrains Mono',monospace; font-weight:800; font-size:clamp(1.9rem,4.5vw,3rem); color:#F8FAFC; line-height:1.15; }
      `}</style>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: 'Outfit, sans-serif', overflow: 'clip', position: 'relative' }}>
        {/* ── GLOBAL FIXED CIRCUIT BACKGROUND ── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.22 }} aria-hidden>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'sticky', top: 0 }}>
            <defs>
              <pattern id="ckt-global" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="100" height="100" fill="none" stroke="#00E5FF" strokeWidth="0.8" opacity="0.35"/>
                <circle cx="0" cy="0" r="3.5" fill="#00E5FF" opacity="0.9"/>
                <line x1="50" y1="0" x2="50" y2="36" stroke="#00E5FF" strokeWidth="0.8" opacity="0.4"/>
                <line x1="50" y1="64" x2="50" y2="100" stroke="#00E5FF" strokeWidth="0.8" opacity="0.4"/>
                <line x1="0" y1="50" x2="36" y2="50" stroke="#00E5FF" strokeWidth="0.8" opacity="0.4"/>
                <line x1="64" y1="50" x2="100" y2="50" stroke="#00E5FF" strokeWidth="0.8" opacity="0.4"/>
                <circle cx="50" cy="50" r="5" fill="none" stroke="#00E5FF" strokeWidth="1" opacity="0.6"/>
                <circle cx="50" cy="50" r="2" fill="#00E5FF" opacity="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ckt-global)"/>
          </svg>
        </div>

        <Navbar variant="camp" />

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section data-testid="camp-hero" style={{ position: 'relative', zIndex: 1, overflow: 'hidden', paddingTop: '5rem', paddingBottom: '4rem', minHeight: '92vh', display: 'flex', alignItems: 'center' }}>
          <div className="scanline" />
          {/* Orbs */}
          <div style={{ position: 'absolute', top: '-8%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,48,49,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '0%', left: '-10%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '40%', right: '35%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', width: '100%', position: 'relative' }}>
            <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>

              {/* Left */}
              <div>
                {/* Eyebrow */}
                <p className="h-eyebrow" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1.1rem' }}>
                  <span style={{ opacity: 0.45 }}>{'>'}</span> future_skills.summer_camp_2026
                </p>

                {/* H1 */}
                <h1 className="h-title" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 'clamp(2.4rem, 5.5vw, 4.5rem)', fontWeight: 800, lineHeight: 1.08, color: '#F8FAFC', marginBottom: '1.4rem', letterSpacing: '-0.025em' }}>
                  Give Your Child the
                  <br />
                  <span style={{
                    color: '#00E5FF',
                    display: 'inline-block',
                    position: 'relative',
                    textShadow: '0 0 20px rgba(0,229,255,0.9), 0 0 50px rgba(0,229,255,0.45), 0 0 90px rgba(0,229,255,0.2)',
                  }}>
                    <TypedText text="Summer of the Future" startDelay={900} speed={52} />
                    <span style={{ position: 'absolute', bottom: '-5px', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #00E5FF, rgba(0,229,255,0.1))', borderRadius: 2 }} />
                  </span>
                </h1>

                <p className="h-body" style={{ fontSize: '1.12rem', color: '#8899AA', lineHeight: 1.8, maxWidth: 480, marginBottom: '2rem' }}>
                  Robotics · Coding · AI · 3D Design — 10 days of hands-on learning for{' '}
                  <strong style={{ color: '#CBD5E1', fontWeight: 600 }}>ages 4–16</strong> at Mumbai centers or online. Batches of just{' '}
                  <strong style={{ color: '#CBD5E1', fontWeight: 600 }}>10 students.</strong>
                </p>

                {/* Stat pills */}
                <div className="h-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                  {[
                    { Icon: Clock, text: '10 Days · 1hr/day' },
                    { Icon: Users, text: 'Max 10 per batch' },
                    { Icon: MapPin, text: 'Mumbai + Online' },
                  ].map(({ Icon, text }) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', fontSize: '0.82rem' }}>
                      <Icon style={{ width: 14, height: 14, color: '#00E5FF', flexShrink: 0 }} />{text}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="h-cta">
                  <button className="neon-btn" onClick={() => navigate('/summer-camp/book')} data-testid="hero-book-btn"
                    style={{ padding: '1.35rem 4rem', fontSize: '1.15rem', borderRadius: '1rem', width: '100%', maxWidth: 360, justifyContent: 'center' }}>
                    Book Now <ArrowRight style={{ width: 20, height: 20 }} />
                  </button>
                </div>
              </div>

              {/* Right: Floating image mosaic */}
              <div className="h-imgs hero-img-col" style={{ position: 'relative', height: 440 }}>
                {/* Glow beneath */}
                <div style={{ position: 'absolute', top: '45%', left: '45%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,48,49,0.22) 0%, transparent 70%)', pointerEvents: 'none', transform: 'translate(-50%,-50%)' }} />
                <div className="fimg fimg-1" style={{ position: 'absolute', top: 0, right: 0, width: 270, height: 195 }}>
                  <img src={IMAGES.kidsRobot} alt="Kids learning robotics" loading="eager" />
                </div>
                <div className="fimg fimg-2" style={{ position: 'absolute', top: 160, left: 0, width: 230, height: 165 }}>
                  <img src={IMAGES.kidsTable} alt="Kids working together" loading="eager" />
                </div>
                <div className="fimg fimg-3" style={{ position: 'absolute', bottom: 10, right: 50, width: 195, height: 145 }}>
                  <img src={IMAGES.boySolder} alt="Building electronics" loading="eager" />
                </div>
                {/* Cyber tag */}
                <div style={{ position: 'absolute', top: 175, right: 285, background: 'rgba(8,12,22,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '0.75rem', padding: '0.6rem 0.9rem' }}>
                  <div style={{ fontSize: '0.6rem', color: '#00E5FF', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Live Camp</div>
                  <div style={{ fontSize: '0.82rem', color: '#F8FAFC', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>400+ Schools</div>
                </div>
              </div>
            </div>

            {/* ── Countdown bar ── */}
            <div className="h-count" style={{ marginTop: '3rem', padding: '1.5rem 2rem', background: 'rgba(10,20,40,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '1.25rem' }}>
              <div className="countdown-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', letterSpacing: '0.2em', color: '#475569', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.85rem' }}>Camp starts in</p>
                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end' }}>
                    <CUnit value={countdown.days} label="Days" />
                    <span style={{ color: '#1e3a5f', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginBottom: '1.2rem' }}>:</span>
                    <CUnit value={countdown.hours} label="Hours" />
                    <span style={{ color: '#1e3a5f', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginBottom: '1.2rem' }}>:</span>
                    <CUnit value={countdown.minutes} label="Mins" />
                    <span style={{ color: '#1e3a5f', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', marginBottom: '1.2rem' }}>:</span>
                    <CUnit value={countdown.seconds} label="Secs" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR — OMOTEC style ─────────────────────────────────── */}
        <div style={{ background: 'rgba(8,15,30,0.9)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '2rem 1.5rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', textAlign: 'center' }} className="stats-row">
            {[
              { num: '400+', label: 'Schools Trust OLL' },
              { num: '2,000+', label: 'Kids Trained' },
              { num: '10', label: 'Kids Per Batch' },
              { num: '4', label: 'Age Groups' },
              { num: '98%', label: 'Parents Recommend' },
            ].map(s => (
              <div key={s.num} className="sr">
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', color: '#F8FAFC', lineHeight: 1, letterSpacing: '-0.03em' }}>{s.num}</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: '#475569', marginTop: '0.5rem', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CERTIFICATIONS ─────────────────────────────────────────────── */}
        <section data-testid="camp-certifications" style={{ padding: '5.5rem 0', position: 'relative', zIndex: 1, overflow: 'hidden', background: 'rgba(5,12,28,0.82)' }}>
          {/* Top separator glow */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.35), transparent)' }} />

          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
            {/* Header */}
            <div className="sr" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <p className="sec-label" style={{ marginBottom: '0.65rem' }}>globally.recognized</p>
              <h2 className="sec-title" style={{ marginBottom: '0.85rem' }}>Certified by the World's Best</h2>
              <p style={{ color: '#475569', fontSize: '0.93rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.65, fontFamily: 'Outfit, sans-serif' }}>
                Our curriculum meets the highest international standards — accredited by STEM.org and aligned with UNESCO's global education framework.
              </p>
            </div>

            {/* Cert badge cards — 2 col, larger, more impact */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>

              {/* STEM.org Educational Experience — large centrepiece card */}
              <div className="cert-card cert-reveal sr sr-d1"
                style={{ padding: '3rem 2.5rem', borderColor: 'rgba(230,85,13,0.25)', boxShadow: '0 0 60px rgba(230,85,13,0.07), inset 0 0 40px rgba(230,85,13,0.03)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(230,85,13,0.6)'; e.currentTarget.style.boxShadow = '0 0 80px rgba(230,85,13,0.22), inset 0 0 40px rgba(230,85,13,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(230,85,13,0.25)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(230,85,13,0.07), inset 0 0 40px rgba(230,85,13,0.03)'; }}
              >
                {/* Circuit border accent */}
                <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: 'linear-gradient(90deg, transparent, #E6550D, transparent)', borderRadius: 1 }} />
                <div style={{ position: 'absolute', bottom: 0, left: '25%', right: '25%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(230,85,13,0.5), transparent)', borderRadius: 1 }} />
                {/* Corner accents */}
                <div style={{ position: 'absolute', top: 12, left: 12, width: 18, height: 18, borderTop: '2px solid rgba(230,85,13,0.5)', borderLeft: '2px solid rgba(230,85,13,0.5)', borderRadius: '2px 0 0 0' }} />
                <div style={{ position: 'absolute', top: 12, right: 12, width: 18, height: 18, borderTop: '2px solid rgba(230,85,13,0.5)', borderRight: '2px solid rgba(230,85,13,0.5)', borderRadius: '0 2px 0 0' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 12, width: 18, height: 18, borderBottom: '2px solid rgba(230,85,13,0.5)', borderLeft: '2px solid rgba(230,85,13,0.5)', borderRadius: '0 0 0 2px' }} />
                <div style={{ position: 'absolute', bottom: 12, right: 12, width: 18, height: 18, borderBottom: '2px solid rgba(230,85,13,0.5)', borderRight: '2px solid rgba(230,85,13,0.5)', borderRadius: '0 0 2px 0' }} />

                {/* Badge */}
                <div style={{ width: 220, height: 220, marginBottom: '2rem', position: 'relative' }}>
                  <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/ko80g3wd_images.png"
                    alt="STEM.org Accredited Educational Experience" loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '0.75rem' }} />
                  {/* Glow bloom */}
                  <div style={{ position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)', width: 160, height: 60, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(230,85,13,0.35), transparent)', filter: 'blur(18px)', pointerEvents: 'none' }} />
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.22em', color: '#E6550D', textTransform: 'uppercase', marginBottom: '0.6rem' }}>STEM.ORG</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.3rem', color: '#F0F4F8', textAlign: 'center', marginBottom: '0.9rem', lineHeight: 1.25 }}>
                  Accredited<br/>Educational Experience™
                </div>
                <p style={{ fontSize: '0.85rem', color: '#475569', textAlign: 'center', lineHeight: 1.7, fontFamily: 'Outfit, sans-serif', maxWidth: 280 }}>
                  Every session is certified by STEM.org — ensuring each child receives a world-class, hands-on learning experience.
                </p>
              </div>

              {/* UNESCO */}
              <div className="cert-card cert-reveal sr sr-d2"
                style={{ padding: '3rem 2.5rem', borderColor: 'rgba(30,80,180,0.25)', boxShadow: '0 0 60px rgba(30,80,180,0.07), inset 0 0 40px rgba(30,80,180,0.03)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(50,120,255,0.55)'; e.currentTarget.style.boxShadow = '0 0 80px rgba(50,120,255,0.2), inset 0 0 40px rgba(50,120,255,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(30,80,180,0.25)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(30,80,180,0.07), inset 0 0 40px rgba(30,80,180,0.03)'; }}
              >
                <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: 'linear-gradient(90deg, transparent, #3264CC, transparent)', borderRadius: 1 }} />
                <div style={{ position: 'absolute', bottom: 0, left: '25%', right: '25%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(50,100,204,0.5), transparent)', borderRadius: 1 }} />
                <div style={{ position: 'absolute', top: 12, left: 12, width: 18, height: 18, borderTop: '2px solid rgba(50,100,204,0.5)', borderLeft: '2px solid rgba(50,100,204,0.5)', borderRadius: '2px 0 0 0' }} />
                <div style={{ position: 'absolute', top: 12, right: 12, width: 18, height: 18, borderTop: '2px solid rgba(50,100,204,0.5)', borderRight: '2px solid rgba(50,100,204,0.5)', borderRadius: '0 2px 0 0' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 12, width: 18, height: 18, borderBottom: '2px solid rgba(50,100,204,0.5)', borderLeft: '2px solid rgba(50,100,204,0.5)', borderRadius: '0 0 0 2px' }} />
                <div style={{ position: 'absolute', bottom: 12, right: 12, width: 18, height: 18, borderBottom: '2px solid rgba(50,100,204,0.5)', borderRight: '2px solid rgba(50,100,204,0.5)', borderRadius: '0 0 2px 0' }} />

                <div style={{ width: 260, height: 180, marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/cqfv2iw2_USFUCA%20logo%203.jpg"
                    alt="UNESCO USFUCA" loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '0.75rem' }} />
                  <div style={{ position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)', width: 160, height: 60, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(30,80,180,0.4), transparent)', filter: 'blur(18px)', pointerEvents: 'none' }} />
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.22em', color: '#5B8EFF', textTransform: 'uppercase', marginBottom: '0.6rem' }}>UNESCO</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '1.3rem', color: '#F0F4F8', textAlign: 'center', marginBottom: '0.9rem', lineHeight: 1.25 }}>
                  U.S. Federation of<br/>UNESCO Clubs
                </div>
                <p style={{ fontSize: '0.85rem', color: '#475569', textAlign: 'center', lineHeight: 1.7, fontFamily: 'Outfit, sans-serif', maxWidth: 280 }}>
                  Aligned with UNESCO's global framework for quality education, scientific literacy, and sustainable development.
                </p>
              </div>
            </div>

            {/* ── FEATURED ON ── */}
            <div className="sr" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <p className="sec-label">featured.on.national.tv</p>
              <h2 className="sec-title" style={{ marginBottom: '0.5rem' }}>As Seen On</h2>
            </div>

            <div className="sr sr-d1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.1rem' }}>
              {/* KBC */}
              <div className="media-card" style={{ height: 260 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png"
                  alt="Kaun Banega Crorepati" loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,12,28,0.95) 0%, rgba(5,12,28,0.3) 50%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem', right: '1.5rem' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.18em', color: '#FFD700', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Sony Entertainment · KBC</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC' }}>Kaun Banega Crorepati</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: '#8899AA', marginTop: 3 }}>Featured as India's leading EdTech for kids</div>
                </div>
              </div>

              {/* Shark Tank India */}
              <div className="media-card" style={{ height: 260 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png"
                  alt="Shark Tank India" loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,12,28,0.95) 0%, rgba(5,12,28,0.3) 50%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem', right: '1.5rem' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.18em', color: '#00E5FF', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Sony LIV · Season Finale</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC' }}>Shark Tank India</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: '#8899AA', marginTop: 3 }}>Pitched to India's top investors on national TV</div>
                </div>
              </div>
            </div>

            {/* ── AS SEEN ON ticker — right below the media cards ── */}
            <div style={{ marginTop: '2.5rem', overflow: 'hidden' }}>
              <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: '#2d4060', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>// Also covered by</span>
              </div>
              <div className="ticker-wrap">
                <div className="ticker-inner">
                  {[...PRESS_ITEMS, ...PRESS_ITEMS].map((name, i) => (
                    <span key={i} className="ticker-item">{name}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom separator glow */}
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.2), transparent)' }} />
        </section>
        <section style={{ padding: '3rem 0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: '0.25rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { src: IMAGES.kidsRobot,    label: 'Robot Building' },
              { src: IMAGES.kidsTable,    label: 'Teamwork' },
              { src: IMAGES.boySolder,    label: 'Electronics' },
              { src: IMAGES.boyRobotToy,  label: 'AI Exploration' },
              { src: IMAGES.twoKidsRobot, label: 'Showcase' },
              { src: IMAGES.girlCoding,   label: 'Coding' },
            ].map((img, i) => (
              <div key={i} style={{ flexShrink: 0, width: 'clamp(160px, 22vw, 240px)', height: 'clamp(115px, 15vw, 165px)', borderRadius: '0.9rem', overflow: 'hidden', border: '1px solid rgba(0,229,255,0.12)', position: 'relative' }}>
                <img src={img.src} alt={img.label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
                  onMouseEnter={e => { e.target.style.transform = 'scale(1.08)'; }}
                  onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
                />
                <div style={{ position: 'absolute', bottom: 6, left: 8, background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(8px)', borderRadius: '999px', padding: '2px 9px', fontSize: '0.6rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {img.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4 PILLARS — OMOTEC style ─────────────────────────────────── */}
        <section style={{ padding: '4.5rem 0', background: 'rgba(8,15,30,0.85)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem' }}>
            <div className="sr" style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
              <p className="sec-label">why.choose.us</p>
              <h2 className="sec-title">Every Detail, Designed for Your Child</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
              {[
                { icon: '🏅', color: '#E6550D', title: 'STEM.org Certified', desc: 'Every session carries a globally recognised STEM.org accreditation.' },
                { icon: '🧠', color: '#00E5FF', title: 'No Prior Knowledge', desc: 'Every course is designed for beginners — no background needed.' },
                { icon: '📄', color: '#7C3AED', title: 'Certificate Included', desc: 'Children receive a verified STEM.org certificate on completion.' },
                { icon: '🚀', color: '#D63031', title: 'Future-Ready Skills', desc: "AI, Robotics and Coding skills for the world's best colleges." },
              ].map((p, i) => (
                <div key={i} className={`sr sr-d${i + 1} camp-card`}
                  style={{ padding: '1.75rem', textAlign: 'center', background: 'rgba(10,20,42,0.7)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${p.color}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  <div style={{ fontSize: '2.25rem', marginBottom: '0.9rem', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.15))' }}>{p.icon}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.88rem', color: p.color, marginBottom: '0.55rem' }}>{p.title}</div>
                  <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.65, fontFamily: 'Outfit, sans-serif' }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CURRICULUM ────────────────────────────────────────────────── */}
        <section data-testid="camp-curriculum" style={{ padding: '6rem 0', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
            <div className="sr" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p className="sec-label">Curriculum</p>
              <h2 className="sec-title" style={{ marginBottom: '0.75rem' }}>What Your Child Will Build</h2>
              <p style={{ color: '#64748B', maxWidth: 460, margin: '0 auto', fontSize: '0.93rem', lineHeight: 1.65 }}>
                Each curriculum is purpose-built for that age group's stage. Select your child's group:
              </p>
            </div>

            {/* Age tabs */}
            <div className="age-tabs-row sr sr-d1" style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
              {AGE_GROUPS.map((g, i) => (
                <button
                  key={g.slug}
                  data-testid={`curriculum-tab-${g.slug}`}
                  onClick={() => setActiveAgeIdx(i)}
                  className={`age-tab${activeAgeIdx === i ? ' active' : ''}`}
                  style={{
                    '--tab-color': g.color,
                    ...(activeAgeIdx === i ? { background: g.color, color: '#080C16', fontWeight: 700 } : {}),
                  }}
                >
                  {g.label}
                  <span style={{ marginLeft: 5, opacity: 0.65, fontSize: '0.75rem' }}>· {g.ages}</span>
                </button>
              ))}
            </div>

            {/* Cards */}
            <div key={activeCamp.slug} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.1rem', animation: 'fadeIn 0.35s ease' }}>
              {activeCamp.subjects.map((subject, i) => {
                const Icon = subject.icon;
                return (
                  <div
                    key={i}
                    className="camp-card"
                    style={{ animationDelay: `${i * 0.07}s` }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeCamp.color}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                  >
                    {/* Ghost number */}
                    <div style={{ position: 'absolute', top: '0.75rem', right: '1rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: '2.75rem', color: 'rgba(255,255,255,0.03)', lineHeight: 1, pointerEvents: 'none' }}>0{i + 1}</div>
                    {/* Icon */}
                    <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: activeCamp.accentBg, border: `1px solid ${activeCamp.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                      <Icon style={{ width: 20, height: 20, color: activeCamp.color }} />
                    </div>
                    <span style={{ fontSize: '0.58rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', background: activeCamp.accentBg, color: activeCamp.color, padding: '2px 8px', borderRadius: '999px', display: 'inline-block', marginBottom: '0.6rem' }}>
                      {subject.level}
                    </span>
                    <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.95rem', fontWeight: 700, color: '#F0F4F8', marginBottom: '0.45rem', lineHeight: 1.3 }}>{subject.name}</h3>
                    <p style={{ fontSize: '0.82rem', color: '#5f7a9a', lineHeight: 1.65 }}>{subject.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SCHEDULE & CENTERS ────────────────────────────────────────── */}
        <section data-testid="camp-schedule" style={{ padding: '6rem 0', background: 'rgba(8,15,30,0.78)', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
            <div className="sr" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p className="sec-label">Batches & Locations</p>
              <h2 className="sec-title">Choose Your Schedule</h2>
            </div>

            {/* Toggle */}
            <div className="sr sr-d1" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              <div className="batch-toggle" style={{ display: 'flex', background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(0,229,255,0.18)', borderRadius: '999px', padding: 4, gap: 4 }}>
                {[
                  { k: 'weekday', label: 'Weekday  Mon–Fri' },
                  { k: 'weekend', label: 'Weekend  Sat–Sun' },
                ].map(t => (
                  <button
                    key={t.k}
                    onClick={() => setBatchType(t.k)}
                    style={{ padding: '0.6rem 1.4rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.83rem', transition: 'all 0.25s', whiteSpace: 'nowrap', ...(batchType === t.k ? { background: '#00E5FF', color: '#080C16' } : { background: 'transparent', color: '#64748B' }) }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch cards */}
            <div className="sr sr-d2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.85rem', marginBottom: '3rem' }}>
              {BATCH_DATES.map(b => (
                <div key={b.id} className="camp-card" style={{ padding: '1.25rem' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  <div style={{ fontSize: '0.6rem', color: '#00E5FF', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, marginBottom: '0.4rem' }}>{b.label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.8rem', color: '#F0F4F8', lineHeight: 1.4 }}>{b[batchType]}</div>
                  <div style={{ fontSize: '0.68rem', color: '#334155', marginTop: '0.4rem' }}>10 seats only</div>
                </div>
              ))}
            </div>

            {/* Centers */}
            <div className="center-grid sr sr-d3" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
              {CENTERS.map(c => (
                <div key={c.id} className="camp-card" style={{ padding: '1.25rem', ...(c.id === 'online' ? { borderColor: 'rgba(214,48,49,0.2)', background: 'rgba(214,48,49,0.04)' } : {}) }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = c.id === 'online' ? 'rgba(214,48,49,0.45)' : 'rgba(0,229,255,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = c.id === 'online' ? 'rgba(214,48,49,0.2)' : 'rgba(255,255,255,0.07)'; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: c.id === 'online' ? 'rgba(214,48,49,0.12)' : 'rgba(0,229,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <MapPin style={{ width: 15, height: 15, color: c.id === 'online' ? '#D63031' : '#00E5FF' }} />
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.82rem', color: '#F0F4F8', marginBottom: '0.35rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.45 }}>{c.address}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────────────────────── */}
        <section data-testid="camp-pricing" style={{ padding: '6rem 0', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 1.5rem', textAlign: 'center' }}>
            <div className="sr">
              <p className="sec-label">Investment</p>
              <h2 className="sec-title" style={{ marginBottom: '2.5rem' }}>Everything Included</h2>
            </div>

            <div className="sr sr-d1 camp-card" style={{ padding: 'clamp(2rem,5vw,3.25rem)', background: 'linear-gradient(135deg, rgba(8,20,45,0.9) 0%, rgba(8,12,22,0.95) 100%)', border: '1px solid rgba(0,229,255,0.18)', boxShadow: '0 0 60px rgba(0,229,255,0.04), 0 40px 80px rgba(0,0,0,0.4)' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 'clamp(3.5rem,12vw,6rem)', fontWeight: 900, color: '#F8FAFC', lineHeight: 1, letterSpacing: '-0.03em' }}>₹1,999</div>
              <div style={{ color: '#475569', marginBottom: '2.5rem', marginTop: '0.5rem', fontSize: '0.88rem', letterSpacing: '0.05em' }}>per child · all inclusive · all age groups</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', marginBottom: '2.5rem', textAlign: 'left' }}>
                {INCLUDES.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8899AA', fontSize: '0.85rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check style={{ width: 11, height: 11, color: '#00E5FF' }} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              <button className="neon-btn" onClick={() => navigate('/summer-camp/book')} data-testid="pricing-book-btn" style={{ fontSize: '0.95rem', padding: '1.1rem 3rem' }}>
                Secure Your Spot Now <ArrowRight style={{ width: 18, height: 18 }} />
              </button>
              <p style={{ fontSize: '0.7rem', color: '#334155', marginTop: '0.9rem', letterSpacing: '0.03em' }}>Cash at center · or online via Cashfree (UPI, Card, Net Banking)</p>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
        <section data-testid="camp-testimonials" style={{ padding: '6rem 0', background: 'rgba(8,15,30,0.78)', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
            <div className="sr" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p className="sec-label">Parents Love It</p>
              <h2 className="sec-title">What Parents Are Saying</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className={`sr sr-d${Math.min(i % 3 + 1, 4)} camp-card`}
                  style={{ padding: '1.75rem', background: 'rgba(8,18,38,0.8)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 2, marginBottom: '0.85rem' }}>
                    {[...Array(5)].map((_, si) => <Star key={si} style={{ width: 13, height: 13, fill: '#F59E0B', color: '#F59E0B' }} />)}
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#8899AA', fontStyle: 'italic', lineHeight: 1.72, marginBottom: '1.25rem' }}>"{t.quote}"</p>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1', fontFamily: 'Outfit, sans-serif' }}>{t.author}</div>
                    <div style={{ fontSize: '0.7rem', color: '#334155', marginTop: 2 }}>{t.location} · {t.camp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <section style={{ padding: '7rem 0', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
          <CircuitBg opacity={0.1} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(214,48,49,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div className="scanline" />
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.5rem', textAlign: 'center', position: 'relative' }}>
            <div className="sr">
              <p className="sec-label">Don't Wait</p>
              <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 'clamp(1.75rem, 5vw, 3rem)', fontWeight: 900, color: '#F8FAFC', lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                Don't Let Your Child Miss<br />
                <span style={{ color: '#D63031' }}>This Summer</span>
              </h2>
              <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '2.5rem', lineHeight: 1.65 }}>
                Only 10 seats per batch. May 2026 batches are filling up fast.
              </p>
              <button className="neon-btn" onClick={() => navigate('/summer-camp/book')} data-testid="final-book-btn" style={{ fontSize: '1rem', padding: '1.15rem 3rem' }}>
                Book Your Spot Now <ArrowRight style={{ width: 19, height: 19 }} />
              </button>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
