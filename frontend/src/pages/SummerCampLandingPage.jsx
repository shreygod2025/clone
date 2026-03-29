import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Cpu, Code, Brain, Box, Clock, Users, MapPin, Wifi, Calendar, ChevronRight, Zap, Shield, Star, ArrowRight, Check, Play, Quote, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ── Images (Unsplash/Pexels – no auth needed) ──────────────────────────────
const IMAGES = {
  kidsRobot: 'https://images.unsplash.com/photo-1743677077216-00a458eff9e0?crop=entropy&cs=srgb&fm=jpg&w=800&q=75',
  kidsTable: 'https://images.unsplash.com/photo-1740205644066-0ca1535e19ff?crop=entropy&cs=srgb&fm=jpg&w=800&q=75',
  boySolder: 'https://images.unsplash.com/photo-1537151242758-331155dcf21b?crop=entropy&cs=srgb&fm=jpg&w=800&q=75',
  boyRobotToy: 'https://images.pexels.com/photos/8294682/pexels-photo-8294682.jpeg?auto=compress&cs=tinysrgb&w=600',
  twoKidsRobot: 'https://images.pexels.com/photos/8294687/pexels-photo-8294687.jpeg?auto=compress&cs=tinysrgb&w=600',
  girlCoding: 'https://images.unsplash.com/photo-1771408427146-09be9a1d4535?crop=entropy&cs=srgb&fm=jpg&w=800&q=75',
};

// ── Age group config ────────────────────────────────────────────────────────
const AGE_GROUPS = [
  {
    slug: 'explorers', label: 'Little Explorers', ages: '4 – 8',
    tagline: 'First steps into robotics & coding',
    color: '#00E5FF', icon: '🚀',
    subjects: [
      { icon: Cpu, name: 'Junior Robotics', desc: 'Build and control their first robot using drag-and-drop programming', level: 'Beginner' },
      { icon: Code, name: 'Block Coding', desc: 'Visual coding with Scratch — create games, stories, and animations', level: 'Beginner' },
      { icon: Brain, name: 'AI for Kids', desc: 'Train a simple AI model to recognize objects and voices', level: 'Intro' },
      { icon: Box, name: '3D Thinking', desc: 'Design and print simple 3D objects using kid-friendly tools', level: 'Intro' },
    ],
  },
  {
    slug: 'creators', label: 'Tech Creators', ages: '9 – 12',
    tagline: 'Build robots and write real code',
    color: '#D63031', icon: '⚙️',
    subjects: [
      { icon: Cpu, name: 'Arduino Robotics', desc: 'Build sensor-driven robots and program them with real code', level: 'Intermediate' },
      { icon: Code, name: 'Python Basics', desc: 'Write real Python programs — games, automations, and web scripts', level: 'Intermediate' },
      { icon: Brain, name: 'Machine Learning', desc: 'Train ML models to classify images and make predictions', level: 'Intermediate' },
      { icon: Box, name: '3D Designing', desc: 'Design 3D models in Tinkercad and understand engineering basics', level: 'Intermediate' },
    ],
  },
  {
    slug: 'innovators', label: 'Future Innovators', ages: '13 – 16',
    tagline: 'AI, 3D Design & advanced robotics',
    color: '#7C3AED', icon: '🤖',
    subjects: [
      { icon: Cpu, name: 'Advanced Robotics', desc: 'Build autonomous robots with vision systems and IoT connectivity', level: 'Advanced' },
      { icon: Code, name: 'Python + Web Dev', desc: 'Full Python programming with real-world project deployment', level: 'Advanced' },
      { icon: Brain, name: 'Deep Learning & AI', desc: 'Build neural networks, chatbots, and AI-powered applications', level: 'Advanced' },
      { icon: Box, name: 'Pro 3D Design', desc: 'Master Fusion 360 for engineering-grade product design', level: 'Advanced' },
    ],
  },
];

const CENTERS = [
  { id: 'mira_road', name: 'Mira Road', city: 'Mumbai', address: 'OLL Center, Mira Road' },
  { id: 'dombivli', name: 'Dombivli – Pallava', city: 'Mumbai', address: 'OLL Center, Pallava, Dombivli' },
  { id: 'andheri', name: 'Andheri West', city: 'Mumbai', address: 'OLL Center, Lokhandwala, Andheri West' },
];

const BATCH_DATES = [
  { id: 'week1', weekday: 'May 1–5, 2026', weekend: 'May 2–3 & 9–10, 2026', label: 'Batch 1' },
  { id: 'week2', weekday: 'May 8–12, 2026', weekend: 'May 9–10 & 16–17, 2026', label: 'Batch 2' },
  { id: 'week3', weekday: 'May 15–19, 2026', weekend: 'May 16–17 & 23–24, 2026', label: 'Batch 3' },
  { id: 'week4', weekday: 'May 22–26, 2026', weekend: 'May 23–24 & 30–31, 2026', label: 'Batch 4' },
];

const TESTIMONIALS = [
  { quote: 'My 6-year-old came home and said "Mom, I built a robot today!" — I couldn\'t believe it.', author: 'Priya Mehta', location: 'Mira Road, Mumbai', camp: 'Little Explorers' },
  { quote: 'He didn\'t want to leave the camp. He was debugging his robot at 6pm and refused to stop.', author: 'Rahul Sharma', location: 'Dombivli, Mumbai', camp: 'Tech Creators' },
  { quote: 'My daughter is now talking about doing computer science. Two weeks ago she had never coded.', author: 'Sunita Patel', location: 'Andheri West, Mumbai', camp: 'Future Innovators' },
  { quote: 'The mentors were so patient with my shy 7-year-old. He\'s now incredibly confident.', author: 'Vikram Nair', location: 'Online', camp: 'Little Explorers' },
  { quote: 'Best investment we\'ve made in our son\'s education. He talks about nothing else all summer.', author: 'Kavita Joshi', location: 'Mira Road, Mumbai', camp: 'Tech Creators' },
  { quote: 'My 14-year-old daughter trained an actual AI model that recognized her face. That\'s wild.', author: 'Sanjay Kumar', location: 'Dombivli, Mumbai', camp: 'Future Innovators' },
  { quote: 'All 3 of my kids enrolled — ages 5, 10, and 14. Each camp was perfectly tailored for them.', author: 'Anita Desai', location: 'Andheri West, Mumbai', camp: 'All Groups' },
  { quote: 'The 3D printing session was a highlight. My son designed his own trophy and printed it!', author: 'Deepak Malhotra', location: 'Online', camp: 'Tech Creators' },
];

const PRESS = [
  { name: 'Shark Tank India', emoji: '🦈', color: '#FF6B00', bg: 'rgba(255,107,0,0.12)' },
  { name: 'Kaun Banega Crorepati', emoji: '💡', color: '#FFD700', bg: 'rgba(255,215,0,0.12)' },
  { name: 'NDTV', emoji: '📺', color: '#E31E24', bg: 'rgba(227,30,36,0.12)' },
  { name: 'Times of India', emoji: '📰', color: '#E31E24', bg: 'rgba(227,30,36,0.1)' },
  { name: 'Economic Times', emoji: '📊', color: '#FF6B00', bg: 'rgba(255,107,0,0.1)' },
  { name: 'India Today', emoji: '🎙️', color: '#00E5FF', bg: 'rgba(0,229,255,0.1)' },
  { name: 'YourStory', emoji: '🚀', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  { name: 'Inc42', emoji: '📱', color: '#00E5FF', bg: 'rgba(0,229,255,0.1)' },
];

const INCLUDES = [
  'Kit & materials for all projects', 'Certificate of completion',
  'Live sessions with expert mentors', 'Max 10 students per batch',
  'Hands-on project portfolio', 'Camp memory photos & video reel',
];

// ── Countdown ───────────────────────────────────────────────────────────────
function useCountdown() {
  const target = new Date('2026-05-01T09:00:00+05:30').getTime();
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(t);
  }, [target]);
  return {
    days: Math.floor(timeLeft / 86400000),
    hours: Math.floor((timeLeft % 86400000) / 3600000),
    minutes: Math.floor((timeLeft % 3600000) / 60000),
    seconds: Math.floor((timeLeft % 60000) / 1000),
  };
}

// ── Circuit SVG Background ──────────────────────────────────────────────────
function CircuitBg({ opacity = 0.15 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity, pointerEvents: 'none' }} aria-hidden>
      <svg width="100%" height="100%">
        <defs>
          <pattern id="cb" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0L0 0 0 60" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
            <circle cx="0" cy="0" r="2" fill="#00E5FF" />
            <path d="M30 0L30 20 M30 40L30 60 M0 30L20 30 M40 30L60 30" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
            <circle cx="30" cy="30" r="3" fill="none" stroke="#00E5FF" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cb)" />
      </svg>
    </div>
  );
}

// ── Count unit ──────────────────────────────────────────────────────────────
function CUnit({ value, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.35)', fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#00E5FF' }}>
        {String(value).padStart(2, '0')}
      </div>
      <span style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'Outfit, sans-serif' }}>{label}</span>
    </div>
  );
}

// ── Animated floating image card ───────────────────────────────────────────
function FloatImg({ src, alt, style = {} }) {
  return (
    <div style={{
      borderRadius: '1.25rem', overflow: 'hidden',
      border: '1px solid rgba(0,229,255,0.2)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      animation: 'float 6s ease-in-out infinite',
      ...style,
    }}>
      <img src={src} alt={alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
}

export default function SummerCampLandingPage() {
  const { ageGroup } = useParams();
  const navigate = useNavigate();
  const countdown = useCountdown();
  const [activeAgeIdx, setActiveAgeIdx] = useState(() => {
    const idx = AGE_GROUPS.findIndex(g => g.slug === ageGroup);
    return idx >= 0 ? idx : 0;
  });
  const [batchType, setBatchType] = useState('weekday');
  const [spotsLeft] = useState({ week1: 3, week2: 6, week3: 8, week4: 10 });

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const activeCamp = AGE_GROUPS[activeAgeIdx];

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .camp-section { animation: fadeSlide 0.6s ease both; }
        .tab-btn { transition: all 0.25s; }
        .tab-btn:hover { background: rgba(0,229,255,0.1) !important; }
      `}</style>

      <Helmet>
        <title>Future Skills Summer Camp 2026 — Robotics, AI & Coding | OLL Mumbai</title>
        <meta name="description" content="India's best kids tech summer camp. Robotics, Coding, AI & 3D Design for ages 4-16. Mumbai centers + online. May 2026. As seen on Shark Tank India & KBC." />
      </Helmet>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
        <Navbar />

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section data-testid="camp-hero" style={{ position: 'relative', overflow: 'hidden', paddingTop: '7rem', paddingBottom: '5rem' }}>
          <CircuitBg opacity={0.18} />
          <div style={{ position: 'absolute', top: '10%', right: '0%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,48,49,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Left */}
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: '999px', background: 'rgba(214,48,49,0.2)', border: '1px solid #D63031', color: '#FF6B6B', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', animation: 'pulse 2s infinite' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D63031', display: 'inline-block' }} /> Limited Seats · May 2026
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: '999px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00E5FF', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    As Seen on Shark Tank India
                  </span>
                </div>

                <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '0.65rem', letterSpacing: '0.25em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Future Skills Summer Camp 2026
                </p>
                <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, color: '#F8FAFC', marginBottom: '1rem' }}>
                  Give Your Child the<br />
                  <span style={{ color: '#D63031' }}>Summer of the Future</span>
                </h1>
                <p style={{ fontSize: '1.05rem', color: '#94A3B8', lineHeight: 1.7, maxWidth: 480, marginBottom: '1.75rem' }}>
                  Robotics · Coding · AI · 3D Design — 10 days of hands-on learning for <strong style={{ color: '#CBD5E1' }}>ages 4–16</strong> at Mumbai centers or online. Batches of just 10 students.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                  {[
                    { icon: Clock, text: '10 Days · 1hr/day' },
                    { icon: Users, text: 'Max 10 students' },
                    { icon: MapPin, text: 'Mumbai + Online' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: '0.88rem' }}>
                      <Icon style={{ width: 15, height: 15, color: '#00E5FF' }} />{text}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <button
                    onClick={() => navigate('/summer-camp/book')}
                    data-testid="hero-book-btn"
                    style={{ background: '#D63031', color: '#fff', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.9rem', padding: '1rem 2rem', borderRadius: '999px', border: 'none', cursor: 'pointer', boxShadow: '0 0 28px rgba(214,48,49,0.4)', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.3s', letterSpacing: '0.04em' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FF3366'; e.currentTarget.style.boxShadow = '0 0 40px rgba(255,51,102,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#D63031'; e.currentTarget.style.boxShadow = '0 0 28px rgba(214,48,49,0.4)'; }}
                  >
                    Book Now <ArrowRight style={{ width: 17, height: 17 }} />
                  </button>
                  <span style={{ color: '#64748B', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif' }}>
                    Starts <span style={{ color: '#00E5FF', fontWeight: 600 }}>May 1, 2026</span>
                  </span>
                </div>
              </div>

              {/* Right: Images mosaic */}
              <div style={{ position: 'relative', height: 420, display: 'none' }} className="lg:block">
                <FloatImg src={IMAGES.kidsRobot} alt="Kids learning robotics" style={{ position: 'absolute', top: 0, right: 0, width: 280, height: 200, animationDelay: '0s' }} />
                <FloatImg src={IMAGES.kidsTable} alt="Kids working on project" style={{ position: 'absolute', top: 140, left: 0, width: 240, height: 170, animationDelay: '2s' }} />
                <FloatImg src={IMAGES.boySolder} alt="Boy building electronics" style={{ position: 'absolute', bottom: 0, right: 60, width: 200, height: 150, animationDelay: '4s' }} />
                {/* Glow orb */}
                <div style={{ position: 'absolute', top: '40%', left: '40%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,48,49,0.2) 0%, transparent 70%)', pointerEvents: 'none', transform: 'translate(-50%,-50%)' }} />
              </div>
            </div>

            {/* Countdown */}
            <div style={{ marginTop: '3rem', padding: '1.5rem 2rem', background: 'rgba(30,58,95,0.35)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,229,255,0.18)', borderRadius: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2rem', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', letterSpacing: '0.18em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Camp starts in</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <CUnit value={countdown.days} label="Days" />
                  <span style={{ color: '#00E5FF', fontSize: '1.5rem', marginBottom: '1.2rem', fontFamily: 'Unbounded, sans-serif' }}>:</span>
                  <CUnit value={countdown.hours} label="Hours" />
                  <span style={{ color: '#00E5FF', fontSize: '1.5rem', marginBottom: '1.2rem', fontFamily: 'Unbounded, sans-serif' }}>:</span>
                  <CUnit value={countdown.minutes} label="Mins" />
                  <span style={{ color: '#00E5FF', fontSize: '1.5rem', marginBottom: '1.2rem', fontFamily: 'Unbounded, sans-serif' }}>:</span>
                  <CUnit value={countdown.seconds} label="Secs" />
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {[{ v: '₹1,999', s: 'per child' }, { v: '10 kids', s: 'per batch' }, { v: '4 weeks', s: 'in May 2026' }, { v: '4 skills', s: 'in 2 weeks' }].map(f => (
                  <div key={f.v} style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#F8FAFC' }}>{f.v}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 2 }}>{f.s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── IMAGE GALLERY ──────────────────────────────────────────────── */}
        <section style={{ padding: '4rem 0', background: 'rgba(30,58,95,0.1)', overflow: 'hidden' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
              {[
                { src: IMAGES.kidsRobot, alt: 'Kids with robot', label: 'Robot Building' },
                { src: IMAGES.kidsTable, alt: 'Group project', label: 'Teamwork' },
                { src: IMAGES.boySolder, alt: 'Electronics', label: 'Electronics' },
                { src: IMAGES.boyRobotToy, alt: 'Robot play', label: 'AI Exploration' },
                { src: IMAGES.twoKidsRobot, alt: 'Robot demo', label: 'Showcase' },
                { src: IMAGES.girlCoding, alt: 'Girl coding', label: 'Coding' },
              ].map((img, i) => (
                <div key={i} style={{ flexShrink: 0, width: 220, height: 160, borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(0,229,255,0.15)', position: 'relative' }}>
                  <img src={img.src} alt={img.alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s' }} onMouseEnter={e => { e.target.style.transform = 'scale(1.06)'; }} onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }} />
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(8,12,22,0.75)', backdropFilter: 'blur(8px)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.68rem', color: '#00E5FF', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
                    {img.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CURRICULUM (all 3 age groups, tabbed) ─────────────────────── */}
        <section data-testid="camp-curriculum" style={{ padding: '5rem 0' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Curriculum</p>
              <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.75rem' }}>
                What Your Child Will Build
              </h2>
              <p style={{ color: '#94A3B8', maxWidth: 480, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Each curriculum is designed specifically for that age group's learning stage. Select an age group to explore:
              </p>
            </div>

            {/* Age group tabs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
              {AGE_GROUPS.map((g, i) => (
                <button
                  key={g.slug}
                  data-testid={`curriculum-tab-${g.slug}`}
                  onClick={() => setActiveAgeIdx(i)}
                  className="tab-btn"
                  style={{
                    padding: '0.75rem 1.5rem', borderRadius: '999px', cursor: 'pointer', border: 'none',
                    fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.88rem',
                    transition: 'all 0.25s',
                    ...(activeAgeIdx === i
                      ? { background: g.color, color: '#080C16', boxShadow: `0 0 20px ${g.color}44` }
                      : { background: 'rgba(255,255,255,0.06)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)' }),
                  }}
                >
                  <span style={{ marginRight: 6 }}>{g.icon}</span>
                  {g.label} <span style={{ opacity: 0.7, fontSize: '0.78rem' }}>(Ages {g.ages})</span>
                </button>
              ))}
            </div>

            {/* Curriculum cards */}
            <div key={activeCamp.slug} className="camp-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {activeCamp.subjects.map((subject, i) => {
                const Icon = subject.icon;
                return (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(30,58,95,0.35)', backdropFilter: 'blur(12px)',
                      border: `1px solid ${activeCamp.color}25`, borderRadius: '1.25rem', padding: '1.75rem',
                      position: 'relative', overflow: 'hidden',
                      transition: 'border-color 0.3s, transform 0.3s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeCamp.color}80`; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${activeCamp.color}25`; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: '3rem', color: 'rgba(255,255,255,0.04)' }}>0{i + 1}</div>
                    <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: `${activeCamp.color}20`, border: `1px solid ${activeCamp.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                      <Icon style={{ width: 22, height: 22, color: activeCamp.color }} />
                    </div>
                    <span style={{ fontSize: '0.6rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', background: `${activeCamp.color}20`, color: activeCamp.color, padding: '2px 8px', borderRadius: '999px', display: 'inline-block', marginBottom: '0.5rem' }}>
                      {subject.level}
                    </span>
                    <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>{subject.name}</h3>
                    <p style={{ fontSize: '0.83rem', color: '#94A3B8', lineHeight: 1.6 }}>{subject.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PRESS / AS SEEN ON ─────────────────────────────────────────── */}
        <section data-testid="camp-press" style={{ padding: '4rem 0', background: 'rgba(30,58,95,0.12)' }}>
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', letterSpacing: '0.2em', color: '#64748B', textTransform: 'uppercase', marginBottom: '2rem', fontWeight: 600 }}>
              As Seen On
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
              {PRESS.map(p => (
                <div
                  key={p.name}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '0.6rem 1.25rem',
                    background: p.bg,
                    border: `1px solid ${p.color}33`,
                    borderRadius: '999px',
                    fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: p.color,
                    transition: 'all 0.25s',
                    cursor: 'default',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = 'scale(1.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${p.color}33`; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <span>{p.emoji}</span> {p.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SCHEDULE & CENTERS ─────────────────────────────────────────── */}
        <section data-testid="camp-schedule" style={{ padding: '5rem 0' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Batches & Locations</p>
              <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 700, color: '#F8FAFC' }}>Choose Your Schedule</h2>
            </div>

            {/* Toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', background: 'rgba(30,58,95,0.4)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '999px', padding: '4px', gap: '4px' }}>
                {['weekday', 'weekend'].map(t => (
                  <button key={t} onClick={() => setBatchType(t)} style={{ padding: '0.6rem 1.4rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.3s', ...(batchType === t ? { background: '#00E5FF', color: '#080C16' } : { background: 'transparent', color: '#94A3B8' }) }}>
                    {t === 'weekday' ? 'Weekday · Mon–Fri (1hr/day)' : 'Weekend · Sat–Sun (2.5hrs/day)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
              {BATCH_DATES.map((b, i) => (
                <div key={b.id} style={{ background: 'rgba(30,58,95,0.3)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '1rem', padding: '1.25rem', transition: 'all 0.3s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#00E5FF44'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ fontSize: '0.65rem', color: '#00E5FF', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: '0.4rem' }}>{b.label}</div>
                  <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: '#F8FAFC', lineHeight: 1.3 }}>{b[batchType]}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.4rem' }}>10 seats only</div>
                </div>
              ))}
            </div>

            {/* Centers - Mumbai only */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>All centers in <span style={{ color: '#00E5FF', fontWeight: 600 }}>Mumbai</span> · Plus online option from anywhere</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[...CENTERS, { id: 'online', name: 'Online at Home', city: 'Anywhere', address: 'Live via Zoom/Google Meet' }].map(c => (
                <div key={c.id} style={{ background: c.id === 'online' ? 'rgba(214,48,49,0.08)' : 'rgba(30,58,95,0.28)', border: c.id === 'online' ? '1px solid rgba(214,48,49,0.25)' : '1px solid rgba(0,229,255,0.15)', borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ fontSize: '1.25rem' }}>{c.id === 'online' ? '💻' : '🏢'}</div>
                  <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#F8FAFC' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{c.address}</div>
                  <div style={{ fontSize: '0.68rem', color: c.id === 'online' ? '#D63031' : '#00E5FF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{c.city}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ────────────────────────────────────────────────────── */}
        <section data-testid="camp-pricing" style={{ padding: '5rem 0', background: 'rgba(30,58,95,0.1)' }}>
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Investment</p>
            <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 700, color: '#F8FAFC', marginBottom: '2.5rem' }}>Everything Included</h2>

            <div style={{ background: 'linear-gradient(135deg, rgba(30,58,95,0.5) 0%, rgba(8,12,22,0.8) 100%)', border: '1px solid rgba(0,229,255,0.22)', borderRadius: '2rem', padding: '3rem', boxShadow: '0 0 60px rgba(0,229,255,0.05)' }}>
              <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(3.5rem, 10vw, 6rem)', fontWeight: 900, color: '#F8FAFC', lineHeight: 1 }}>₹1,999</div>
              <div style={{ color: '#94A3B8', marginBottom: '2.5rem', marginTop: '0.4rem', fontSize: '0.95rem' }}>per child · all inclusive · same for all age groups</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem', textAlign: 'left' }}>
                {INCLUDES.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#CBD5E1', fontSize: '0.88rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,229,255,0.12)', border: '1px solid #00E5FF44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check style={{ width: 12, height: 12, color: '#00E5FF' }} />
                    </div>{item}
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/summer-camp/book')}
                data-testid="pricing-book-btn"
                style={{ background: '#D63031', color: '#fff', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.95rem', padding: '1.1rem 3rem', borderRadius: '999px', border: 'none', cursor: 'pointer', boxShadow: '0 0 30px rgba(214,48,49,0.4)', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.3s', letterSpacing: '0.04em' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FF3366'; e.currentTarget.style.boxShadow = '0 0 44px rgba(255,51,102,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#D63031'; e.currentTarget.style.boxShadow = '0 0 30px rgba(214,48,49,0.4)'; }}
              >
                Secure Your Spot Now <ArrowRight style={{ width: 18, height: 18 }} />
              </button>
              <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '1rem' }}>Cash at center or online via Cashfree (UPI, Card, Net Banking)</p>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
        <section data-testid="camp-testimonials" style={{ padding: '5rem 0' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Parents Love It</p>
              <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 700, color: '#F8FAFC' }}>What Parents Are Saying</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(30,58,95,0.3)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '1.25rem', padding: '1.75rem',
                    transition: 'all 0.3s',
                    animationDelay: `${i * 0.1}s`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.35)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ color: '#00E5FF', fontSize: '1.75rem', marginBottom: '0.75rem', lineHeight: 1 }}>"</div>
                  <p style={{ fontSize: '0.88rem', color: '#CBD5E1', fontStyle: 'italic', lineHeight: 1.7, marginBottom: '1.25rem' }}>{t.quote}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[...Array(5)].map((_, si) => <Star key={si} style={{ width: 12, height: 12, fill: '#FFD700', color: '#FFD700' }} />)}
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', fontFamily: 'Outfit, sans-serif' }}>{t.author}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>{t.location} · {t.camp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ──────────────────────────────────────────────────── */}
        <section style={{ padding: '5rem 0', position: 'relative', overflow: 'hidden' }}>
          <CircuitBg opacity={0.15} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(214,48,49,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div className="max-w-2xl mx-auto px-6 text-center" style={{ position: 'relative' }}>
            <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, color: '#F8FAFC', marginBottom: '1rem' }}>
              Don't Let Your Child Miss<br /><span style={{ color: '#D63031' }}>This Summer</span>
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Only 10 seats per batch. May 2026 batches filling fast.
            </p>
            <button
              onClick={() => navigate('/summer-camp/book')}
              data-testid="final-book-btn"
              style={{ background: '#D63031', color: '#fff', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '1rem', padding: '1.1rem 3rem', borderRadius: '999px', border: 'none', cursor: 'pointer', boxShadow: '0 0 40px rgba(214,48,49,0.4)', display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Book Your Spot Now <ArrowRight style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
