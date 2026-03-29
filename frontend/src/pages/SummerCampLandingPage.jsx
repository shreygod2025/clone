import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Cpu, Code, Brain, Box, Clock, Users, MapPin, Wifi, Calendar, ChevronRight, Zap, Shield, Star, ArrowRight, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Age group config
const AGE_GROUPS = {
  explorers: {
    slug: 'explorers',
    label: 'Little Explorers',
    ages: '4 – 8',
    tagline: 'Where Curiosity Meets Technology',
    description: 'Your child\'s first steps into the world of robotics and coding — through play, creativity, and wonder.',
    color: '#00E5FF',
    subjects: [
      { icon: Cpu, name: 'Junior Robotics', desc: 'Build and control their first robot using drag-and-drop programming', level: 'Beginner' },
      { icon: Code, name: 'Block Coding', desc: 'Visual coding with Scratch — create games, stories, and animations', level: 'Beginner' },
      { icon: Brain, name: 'AI for Kids', desc: 'Train a simple AI model to recognize objects and voices', level: 'Intro' },
      { icon: Box, name: '3D Thinking', desc: 'Design and print simple 3D objects using kid-friendly tools', level: 'Intro' },
    ],
    testimonial: { quote: 'My 6-year-old came home and said "Mom, I built a robot today!" — I couldn\'t believe it.', author: 'Priya Mehta, Parent (Mira Road)' },
    badge: 'Ages 4-8',
    gradient: 'from-[#00E5FF] to-[#0099CC]',
  },
  creators: {
    slug: 'creators',
    label: 'Tech Creators',
    ages: '9 – 12',
    tagline: 'Build Things That Actually Work',
    description: 'Move from consumer to creator — write code, build robots, and start thinking like an engineer.',
    color: '#D63031',
    subjects: [
      { icon: Cpu, name: 'Arduino Robotics', desc: 'Build sensor-driven robots and program them with real code', level: 'Intermediate' },
      { icon: Code, name: 'Python Basics', desc: 'Write real Python programs — games, automations, and web scripts', level: 'Intermediate' },
      { icon: Brain, name: 'Machine Learning', desc: 'Train ML models to classify images and make predictions', level: 'Intermediate' },
      { icon: Box, name: '3D Designing', desc: 'Design 3D models in Tinkercad and understand engineering basics', level: 'Intermediate' },
    ],
    testimonial: { quote: 'He didn\'t want to leave the camp. He was debugging his robot at 6pm and refused to stop.', author: 'Rahul Sharma, Parent (Dombivli)' },
    badge: 'Ages 9-12',
    gradient: 'from-[#D63031] to-[#FF6B35]',
  },
  innovators: {
    slug: 'innovators',
    label: 'Future Innovators',
    ages: '13 – 16',
    tagline: 'Engineer the Future. Starting Now.',
    description: 'Deep-dive into the technologies shaping the world — AI, robotics, and 3D design at a serious level.',
    color: '#7C3AED',
    subjects: [
      { icon: Cpu, name: 'Advanced Robotics', desc: 'Build autonomous robots with vision systems and IoT connectivity', level: 'Advanced' },
      { icon: Code, name: 'Python + Web Dev', desc: 'Full Python programming with real-world project deployment', level: 'Advanced' },
      { icon: Brain, name: 'Deep Learning & AI', desc: 'Build neural networks, chatbots, and AI-powered applications', level: 'Advanced' },
      { icon: Box, name: 'Professional 3D Design', desc: 'Master Fusion 360 for engineering-grade product design', level: 'Advanced' },
    ],
    testimonial: { quote: 'My daughter is now talking about doing computer science. Two weeks ago she had never coded.', author: 'Sunita Patel, Parent (Andheri)' },
    badge: 'Ages 13-16',
    gradient: 'from-[#7C3AED] to-[#D63031]',
  },
};

const CENTERS = [
  { id: 'mira_road', name: 'Mira Road', address: 'OLL Center, Mira Road, Mumbai', type: 'offline', icon: '🏢' },
  { id: 'dombivli', name: 'Dombivli - Pallava', address: 'OLL Center, Pallava, Dombivli', type: 'offline', icon: '🏢' },
  { id: 'andheri', name: 'Andheri West', address: 'OLL Center, Lokhandwala, Andheri West', type: 'offline', icon: '🏢' },
  { id: 'online', name: 'Online at Home', address: 'Live sessions via Zoom/Google Meet', type: 'online', icon: '💻' },
];

const BATCH_DATES = {
  week1: { weekday: 'May 1–5, 2026', weekend: 'May 2–3 & 9–10, 2026' },
  week2: { weekday: 'May 8–12, 2026', weekend: 'May 9–10 & 16–17, 2026' },
  week3: { weekday: 'May 15–19, 2026', weekend: 'May 16–17 & 23–24, 2026' },
  week4: { weekday: 'May 22–26, 2026', weekend: 'May 23–24 & 30–31, 2026' },
};

const INCLUDES = [
  'Kit & materials for all projects',
  'Certificate of completion',
  'Live sessions with expert mentors',
  'Max 10 students per batch',
  'Hands-on project portfolio',
  'Camp memory photos & video reel',
];

// Countdown to May 1, 2026
function useCountdown() {
  const target = new Date('2026-05-01T09:00:00+05:30').getTime();
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = target - Date.now();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = target - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

// Circuit grid background SVG
function CircuitBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20" aria-hidden="true">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
            <circle cx="0" cy="0" r="2" fill="#00E5FF" />
            <circle cx="60" cy="60" r="2" fill="#D63031" />
            <path d="M30 0 L30 20 M30 40 L30 60 M0 30 L20 30 M40 30 L60 30" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
            <circle cx="30" cy="30" r="3" fill="none" stroke="#00E5FF" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>
    </div>
  );
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl border border-[#00E5FF]/40 text-[#00E5FF]"
        style={{ background: 'rgba(0,229,255,0.08)', fontFamily: 'Unbounded, sans-serif', fontSize: '1.5rem', fontWeight: 900 }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[10px] sm:text-xs text-[#94A3B8] mt-1 uppercase tracking-widest" style={{ fontFamily: 'Outfit, sans-serif' }}>{label}</span>
    </div>
  );
}

export default function SummerCampLandingPage() {
  const { ageGroup } = useParams();
  const navigate = useNavigate();
  const camp = AGE_GROUPS[ageGroup];
  const countdown = useCountdown();
  const [batchType, setBatchType] = useState('weekday');
  const [spotsLeft] = useState(Math.floor(Math.random() * 4) + 2); // 2-5 spots left

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ageGroup]);

  if (!camp) {
    return (
      <div style={{ background: '#080C16', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center text-white">
          <p>Camp not found.</p>
          <button onClick={() => navigate('/offerings')} className="mt-4 text-[#00E5FF] underline">Go back to Offerings</button>
        </div>
      </div>
    );
  }

  const handleBookNow = () => {
    navigate(`/summer-camp/book?age=${ageGroup}`);
  };

  return (
    <>
      <Helmet>
        <title>Future Skills Summer Camp 2026 — {camp.label} (Ages {camp.ages}) | OLL</title>
        <meta name="description" content={`${camp.description} Robotics, Coding, AI & 3D Design. ₹1,999. Mumbai centers or online. May 2026.`} />
      </Helmet>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
        <Navbar showBookDemo onBookDemo={handleBookNow} />

        {/* HERO */}
        <section data-testid="camp-hero-section" style={{ position: 'relative', overflow: 'hidden', paddingTop: '7rem', paddingBottom: '5rem' }}>
          <CircuitBackground />
          {/* Glow blobs */}
          <div style={{ position: 'absolute', top: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${camp.color}22 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '0', left: '-5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            {/* Top badges */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest animate-pulse"
                style={{ borderColor: '#D63031', background: 'rgba(214,48,49,0.12)', color: '#FF6B6B', fontFamily: 'Outfit, sans-serif' }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D63031', display: 'inline-block' }} />
                Only {spotsLeft} spots left
              </span>
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest"
                style={{ borderColor: '#00E5FF44', background: 'rgba(0,229,255,0.08)', color: '#00E5FF', fontFamily: 'Outfit, sans-serif' }}
              >
                {camp.badge}
              </span>
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}
              >
                May 2026 · Mumbai
              </span>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Text */}
              <div>
                <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '0.7rem', letterSpacing: '0.2em', color: camp.color, textTransform: 'uppercase', marginBottom: '1rem' }}>
                  Future Skills Summer Camp 2026
                </p>
                <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, color: '#F8FAFC', marginBottom: '1rem' }}>
                  {camp.label}<br />
                  <span style={{ color: camp.color }}>{camp.tagline}</span>
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#94A3B8', maxWidth: 480, lineHeight: 1.7, marginBottom: '2rem' }}>
                  {camp.description}
                </p>

                <div className="flex flex-wrap gap-4 items-center mb-8">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: '0.9rem' }}>
                    <Clock style={{ width: 16, height: 16, color: '#00E5FF' }} />
                    10 Days · 1hr/day
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: '0.9rem' }}>
                    <Users style={{ width: 16, height: 16, color: '#00E5FF' }} />
                    Max 10 students
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: '0.9rem' }}>
                    <MapPin style={{ width: 16, height: 16, color: '#00E5FF' }} />
                    Mumbai / Online
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={handleBookNow}
                    data-testid="book-now-btn"
                    style={{
                      background: '#D63031',
                      color: '#fff',
                      fontFamily: 'Unbounded, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      padding: '1rem 2rem',
                      borderRadius: '999px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 0 24px rgba(214,48,49,0.4)',
                      transition: 'all 0.3s',
                      letterSpacing: '0.05em',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FF3366'; e.currentTarget.style.boxShadow = '0 0 36px rgba(255,51,102,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#D63031'; e.currentTarget.style.boxShadow = '0 0 24px rgba(214,48,49,0.4)'; }}
                  >
                    Book Your Spot — ₹1,999
                  </button>
                  <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                    Starts <span style={{ color: '#00E5FF', fontWeight: 600 }}>May 1, 2026</span>
                  </div>
                </div>
              </div>

              {/* Right: Countdown + visual */}
              <div className="flex flex-col items-center gap-6">
                <div
                  style={{
                    background: 'rgba(30,58,95,0.4)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(0,229,255,0.2)',
                    borderRadius: '1.5rem',
                    padding: '2rem',
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: 400,
                  }}
                >
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', letterSpacing: '0.15em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                    Camp starts in
                  </p>
                  <div className="flex justify-center gap-3 sm:gap-4">
                    <CountdownUnit value={countdown.days} label="Days" />
                    <span style={{ color: '#00E5FF', fontSize: '2rem', marginTop: '0.8rem', fontFamily: 'Unbounded, sans-serif' }}>:</span>
                    <CountdownUnit value={countdown.hours} label="Hours" />
                    <span style={{ color: '#00E5FF', fontSize: '2rem', marginTop: '0.8rem', fontFamily: 'Unbounded, sans-serif' }}>:</span>
                    <CountdownUnit value={countdown.minutes} label="Mins" />
                    <span style={{ color: '#00E5FF', fontSize: '2rem', marginTop: '0.8rem', fontFamily: 'Unbounded, sans-serif' }}>:</span>
                    <CountdownUnit value={countdown.seconds} label="Secs" />
                  </div>
                </div>

                {/* Key facts */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm sm:max-w-md">
                  {[
                    { label: '₹1,999', sub: 'per child' },
                    { label: '10 kids', sub: 'per batch' },
                    { label: '4 skills', sub: 'in 2 weeks' },
                    { label: '3 cities', sub: '+ online' },
                  ].map((f) => (
                    <div
                      key={f.label}
                      style={{
                        background: 'rgba(30,58,95,0.3)',
                        border: '1px solid rgba(0,229,255,0.15)',
                        borderRadius: '1rem',
                        padding: '1rem',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>{f.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>{f.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT THEY'LL LEARN — Bento Grid */}
        <section data-testid="camp-subjects-bento" style={{ padding: '5rem 0', position: 'relative' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-12">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Curriculum
              </p>
              <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 700, color: '#F8FAFC' }}>
                What Your Child Will Build
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {camp.subjects.map((subject, i) => {
                const Icon = subject.icon;
                return (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(30,58,95,0.35)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(0,229,255,0.15)',
                      borderRadius: '1.25rem',
                      padding: '1.75rem',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'border-color 0.3s, transform 0.3s',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '3rem', fontFamily: 'Unbounded, sans-serif', fontWeight: 900, color: 'rgba(255,255,255,0.04)' }}>
                      0{i + 1}
                    </div>
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: '0.75rem',
                        background: `${camp.color}22`,
                        border: `1px solid ${camp.color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1rem',
                      }}
                    >
                      <Icon style={{ width: 22, height: 22, color: camp.color }} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.65rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        background: `${camp.color}22`, color: camp.color,
                        padding: '2px 8px', borderRadius: '999px', display: 'inline-block', marginBottom: '0.5rem',
                      }}
                    >
                      {subject.level}
                    </span>
                    <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                      {subject.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.6 }}>
                      {subject.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SCHEDULE & CENTERS */}
        <section data-testid="camp-schedule-centers" style={{ padding: '5rem 0', background: 'rgba(30,58,95,0.15)' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-10">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Batches & Locations
              </p>
              <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 700, color: '#F8FAFC' }}>
                Choose Your Schedule
              </h2>
            </div>

            {/* Batch type toggle */}
            <div className="flex justify-center mb-8">
              <div style={{ display: 'flex', background: 'rgba(30,58,95,0.4)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '999px', padding: '4px', gap: '4px' }}>
                {['weekday', 'weekend'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setBatchType(t)}
                    style={{
                      padding: '0.6rem 1.5rem',
                      borderRadius: '999px',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: 'all 0.3s',
                      ...(batchType === t
                        ? { background: '#00E5FF', color: '#080C16' }
                        : { background: 'transparent', color: '#94A3B8' }),
                    }}
                  >
                    {t === 'weekday' ? 'Weekday (Mon-Fri)' : 'Weekend (Sat-Sun)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch timing info */}
            <div
              style={{
                background: 'rgba(0,229,255,0.05)',
                border: '1px solid rgba(0,229,255,0.2)',
                borderRadius: '1rem',
                padding: '1.25rem 2rem',
                marginBottom: '2.5rem',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00E5FF', fontSize: '0.9rem' }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {batchType === 'weekday' ? '1 hour / day · Mon–Fri' : '2.5 hours / day · Sat & Sun'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: '0.9rem' }}>
                  <Calendar style={{ width: 16, height: 16, color: '#00E5FF' }} />
                  10 sessions total (2 weeks)
                </div>
              </div>
            </div>

            {/* 4 batch weeks */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {Object.entries(BATCH_DATES).map(([week, dates], i) => (
                <div
                  key={week}
                  style={{
                    background: 'rgba(30,58,95,0.3)',
                    border: '1px solid rgba(0,229,255,0.15)',
                    borderRadius: '1rem',
                    padding: '1.25rem',
                    transition: 'border-color 0.3s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.15)'; }}
                >
                  <div style={{ fontSize: '0.7rem', fontFamily: 'Outfit, sans-serif', color: '#00E5FF', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
                    Batch {i + 1}
                  </div>
                  <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.3 }}>
                    {dates[batchType]}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.5rem' }}>
                    Limited to 10 seats
                  </div>
                </div>
              ))}
            </div>

            {/* Centers */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CENTERS.map((center) => (
                <div
                  key={center.id}
                  style={{
                    background: center.type === 'online' ? 'rgba(214,48,49,0.08)' : 'rgba(30,58,95,0.3)',
                    border: center.type === 'online' ? '1px solid rgba(214,48,49,0.3)' : '1px solid rgba(0,229,255,0.15)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ fontSize: '1.5rem' }}>{center.icon}</div>
                  <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, color: '#F8FAFC', fontSize: '0.9rem' }}>
                    {center.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.4 }}>{center.address}</div>
                  {center.type === 'online' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D63031', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                      <span style={{ fontSize: '0.72rem', color: '#D63031', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Sessions</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section data-testid="camp-pricing" style={{ padding: '5rem 0' }}>
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-10">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Investment
              </p>
              <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 700, color: '#F8FAFC' }}>
                Everything Included
              </h2>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, rgba(30,58,95,0.5) 0%, rgba(8,12,22,0.8) 100%)',
                border: '1px solid rgba(0,229,255,0.25)',
                borderRadius: '2rem',
                padding: '3rem',
                boxShadow: '0 0 60px rgba(0,229,255,0.05)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 900, color: '#F8FAFC', lineHeight: 1 }}>
                ₹1,999
              </div>
              <div style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: '2rem', marginTop: '0.5rem' }}>per child · all inclusive</div>

              <div className="grid sm:grid-cols-2 gap-3 mb-8 text-left max-w-lg mx-auto">
                {INCLUDES.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#CBD5E1', fontSize: '0.9rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,229,255,0.15)', border: '1px solid #00E5FF44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ChevronRight style={{ width: 12, height: 12, color: '#00E5FF' }} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              <button
                onClick={handleBookNow}
                data-testid="book-now-pricing-btn"
                style={{
                  background: '#D63031',
                  color: '#fff',
                  fontFamily: 'Unbounded, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '1.1rem 3rem',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 0 30px rgba(214,48,49,0.4)',
                  transition: 'all 0.3s',
                  letterSpacing: '0.05em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(255,51,102,0.6)'; e.currentTarget.style.background = '#FF3366'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(214,48,49,0.4)'; e.currentTarget.style.background = '#D63031'; }}
              >
                Secure Your Spot Now
                <ArrowRight style={{ width: 18, height: 18 }} />
              </button>

              <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '1rem' }}>
                Cash payment available at center · Online via Cashfree (UPI, Card, Net Banking)
              </p>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL + TRUST */}
        <section style={{ padding: '4rem 0', background: 'rgba(30,58,95,0.12)' }}>
          <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
            <div
              style={{
                background: 'rgba(30,58,95,0.35)',
                border: '1px solid rgba(0,229,255,0.15)',
                borderRadius: '1.5rem',
                padding: '2.5rem',
                marginBottom: '3rem',
              }}
            >
              <div style={{ fontSize: '3rem', color: '#00E5FF', marginBottom: '1rem', lineHeight: 1 }}>"</div>
              <p style={{ fontSize: '1.1rem', color: '#CBD5E1', fontStyle: 'italic', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                {camp.testimonial.quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${camp.color}22`, border: `1px solid ${camp.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star style={{ width: 18, height: 18, color: camp.color }} />
                </div>
                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{camp.testimonial.author}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6">
              {[
                { icon: Shield, text: 'Safe Environment', sub: 'Background-checked mentors' },
                { icon: Users, text: 'Small Batches', sub: 'Max 10 students only' },
                { icon: Zap, text: 'Expert-Led', sub: 'IIT/IIM trained educators' },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 20, height: 20, color: '#00E5FF' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}>{t.text}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{t.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: '5rem 0', position: 'relative', overflow: 'hidden' }}>
          <CircuitBackground />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(214,48,49,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div className="max-w-2xl mx-auto px-6 text-center" style={{ position: 'relative' }}>
            <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, color: '#F8FAFC', marginBottom: '1rem' }}>
              Give Your Child the<br />
              <span style={{ color: '#D63031' }}>Summer of Their Life</span>
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Seats are limited to 10 per batch. Don't miss your child's chance to experience the future of learning.
            </p>
            <button
              onClick={handleBookNow}
              data-testid="book-now-final-btn"
              style={{
                background: '#D63031',
                color: '#fff',
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '1.1rem 3rem',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 40px rgba(214,48,49,0.4)',
                transition: 'all 0.3s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Book Your Spot — ₹1,999
              <ArrowRight style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
