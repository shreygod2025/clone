import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, ChevronDown, CheckCircle, Zap, Camera, Pen, TrendingUp, Film, Lightbulb, Play, Instagram, Youtube, Star, Quote } from 'lucide-react';

const JB = "'JetBrains Mono', monospace";
const NU = "'Nunito Sans', sans-serif";
const LIME = '#CCFF00';
const GREEN = '#00FF66';
const BG = '#050505';
const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_oll-skill-edu/artifacts/wzn0gh6k_OLL-horizontal-logo-white.png';

const MODULES = [
  { icon: Lightbulb,  title: 'Content Ideation', desc: 'Trend research, niche identification, viral content frameworks' },
  { icon: Pen,        title: 'Script Writing',   desc: 'Storytelling hooks, caption writing, brand voice' },
  { icon: Camera,     title: 'Video Shooting',   desc: 'Reels, Shorts, lighting, framing — mobile-first production' },
  { icon: Film,       title: 'Video Editing',    desc: 'CapCut, InShot, transitions, captions, sound design' },
  { icon: TrendingUp, title: 'Growth Strategy',  desc: 'Hashtags, collaboration, analytics, algorithm hacking' },
];

const OUTCOMES = [
  { icon: Play,        title: 'Live Portfolio',       desc: 'Real content published on their own channels.' },
  { icon: Zap,         title: 'Startup Projects',     desc: 'Work on actual brand briefs from partner startups.' },
  { icon: CheckCircle, title: 'Internship Placement', desc: 'Top students get placed as paid social media interns.' },
  { icon: Star,        title: 'Certificate',          desc: 'OLL-certified Social Media Intern — industry-ready.' },
];

const FAQS = [
  { q: 'Is prior experience required?',         a: 'No. This program is built for complete beginners. All you need is a smartphone and curiosity.' },
  { q: 'Is it safe for school students?',        a: 'Yes. Offline sessions are supervised at our centers. Online sessions are live instructor-led classes.' },
  { q: 'What kind of internships do students get?', a: 'Students work with real early-stage startups and content brands in Mumbai on social media campaigns.' },
  { q: 'Will every student get placed?',         a: 'Top-performing students get placement support. We aim for at least 70% of students to secure an internship.' },
  { q: 'What is the schedule?',                  a: '4 sessions/week, each 2 hours. Approx. 32 hours of training over 4 weeks. Weekday & weekend batches available.' },
  { q: 'Is there an EMI option?',                a: 'Yes! You can reserve your seat with ₹2,000 and pay the remaining amount at the center.' },
];

// Press ticker — same list used on Summer Camp page
const PRESS_ITEMS = [
  'Shark Tank India', 'Kaun Banega Crorepati', 'NDTV', 'Times of India',
  'Economic Times', 'India Today', 'YourStory', 'Inc42',
];

// Student review placeholders — user will replace text/videos later
const STUDENT_REVIEWS = [
  { name: 'Aanya R.', age: 15, quote: 'I went from 0 to 12K followers in 6 weeks. The script-writing classes changed how I think about every post.', handle: '@aanya.creates' },
  { name: 'Vivaan P.', age: 14, quote: 'My first brand deal at 14 — I couldn\'t believe it. The placement team actually made it happen.', handle: '@vivaanmakes' },
  { name: 'Ishita S.', age: 17, quote: 'Every session ended with a real deliverable. By Day 10 I had a portfolio I was proud to show colleges.', handle: '@ishita.shoots' },
];

// Placeholder company logos — user will replace
const PLACEHOLDER_COMPANIES = [
  'Startup Alpha', 'Brand Beta', 'Agency Gamma', 'Studio Delta',
  'Label Epsilon', 'Creator Co', 'Media Ltd', 'Content Inc',
];

// Gallery images (sneak peek) — reuse media from design guidelines + stock
const GALLERY = [
  'https://images.pexels.com/photos/7676403/pexels-photo-7676403.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  'https://images.pexels.com/photos/7676492/pexels-photo-7676492.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  'https://images.pexels.com/photos/13929251/pexels-photo-13929251.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  'https://images.unsplash.com/photo-1611605698335-8b1569810432?auto=format&fit=crop&w=940&q=70',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=940&q=70',
  'https://images.pexels.com/photos/7414026/pexels-photo-7414026.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
];

// ── Scroll-reveal hook ────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.sr-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('sr-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{ borderBottom: '1px solid #27272A', padding: '1.35rem 0', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span style={{ fontFamily: NU, fontWeight: 700, fontSize: '1rem', color: open ? LIME : '#F4F4F5', transition: 'color 0.2s' }}>{q}</span>
        <ChevronDown style={{ width: 18, height: 18, color: LIME, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s' }} />
      </div>
      {open && <p style={{ marginTop: '0.75rem', color: '#A1A1AA', fontFamily: NU, fontSize: '0.95rem', lineHeight: 1.7 }}>{a}</p>}
    </div>
  );
}

export default function SocialMediaInternPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useReveal();

  useEffect(() => {
    const target = new Date('2026-06-01T09:00:00+05:30').getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) return;
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const goBook = () => navigate('/social-media-intern/apply');

  return (
    <>
      <Helmet>
        <title>Social Media Internship Readiness Program for School Students | OLL</title>
        <meta name="description" content="India's First Offline Social Media Internship Readiness Program for school students aged 12–18. Learn. Create. Get Placed." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800;900&family=Nunito+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Helmet>

      {/* Inline styles for animations, ticker, fades */}
      <style>{`
        html, body { overflow-x: hidden; max-width: 100vw; }
        @keyframes smi-pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes smi-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes smi-marquee-slow { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes smi-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .smi-marquee-track { display:flex; gap:3rem; animation: smi-marquee 35s linear infinite; width: max-content; }
        .smi-marquee-slow   { display:flex; gap:2.5rem; animation: smi-marquee-slow 50s linear infinite; width: max-content; }
        .smi-marquee-wrap { overflow: hidden; width: 100%; position: relative; }
        .sr-reveal { opacity:0; transform: translateY(24px); transition: opacity 0.8s ease, transform 0.8s ease; }
        .sr-reveal.sr-in { opacity:1; transform: translateY(0); }
        .sr-delay-1 { transition-delay: 0.08s; }
        .sr-delay-2 { transition-delay: 0.16s; }
        .sr-delay-3 { transition-delay: 0.24s; }
        .sr-delay-4 { transition-delay: 0.32s; }
        .smi-nav-link { color:#A1A1AA; font-family:${NU}; font-size:0.88rem; font-weight:600; text-decoration:none; transition: color 0.2s; }
        .smi-nav-link:hover { color:${LIME}; }
        .smi-media-card { position:relative; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); background:#0B0B0B; }
        .smi-media-card img { width:100%; height:100%; object-fit:cover; transition: transform 0.6s ease; }
        .smi-media-card:hover img { transform: scale(1.06); }
        .smi-hero-title span.smi-grad { background: linear-gradient(90deg, ${LIME}, ${GREEN}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .smi-countdown-cell { min-width: 54px; padding: 0.7rem 0.7rem; }
        @media (max-width: 640px) {
          .smi-nav-label { display: none !important; }
          .smi-nav-sep   { display: none !important; }
          .smi-hero-title { font-size: clamp(2rem, 9vw, 3rem) !important; }
          .smi-countdown-cell { min-width: 46px !important; padding: 0.55rem 0.5rem !important; }
          .smi-countdown-num { font-size: 1.35rem !important; }
          .smi-reviews-video-tile { aspect-ratio: 9 / 12 !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .smi-marquee-track, .smi-marquee-slow { animation: none !important; }
          .sr-reveal { opacity:1; transform:none; }
        }
      `}</style>

      <div style={{ background: BG, color: '#F4F4F5', fontFamily: NU, minHeight: '100vh', overflowX: 'hidden', maxWidth: '100vw' }}>

        {/* ── STICKY NAV ── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(204,255,0,0.12)', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', minWidth: 0, flexShrink: 1 }}>
            <img src={OLL_LOGO} alt="OLL" data-testid="smi-oll-logo" style={{ height: 26, width: 'auto', flexShrink: 0 }} />
            <span className="smi-nav-sep" style={{ width: 1, height: 20, background: '#27272A' }} />
            <span className="smi-nav-label" style={{ fontFamily: JB, fontSize: '0.72rem', fontWeight: 700, color: LIME, letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Social Media Intern Program</span>
          </div>
          <button
            onClick={goBook}
            data-testid="nav-apply-btn"
            style={{ background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.78rem', padding: '0.55rem 1.4rem', borderRadius: 999, border: 'none', cursor: 'pointer', letterSpacing: '0.06em', boxShadow: `0 0 20px ${LIME}55` }}
          >
            Apply Now
          </button>
        </nav>

        {/* ── HERO ── */}
        <section style={{ position: 'relative', minHeight: '88vh', display: 'flex', alignItems: 'center', overflow: 'hidden', padding: '5rem 1.5rem 4rem' }}>
          {/* Grid + glows */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(#CCFF00 1px, transparent 1px), linear-gradient(90deg, #CCFF00 1px, transparent 1px)',
            backgroundSize: '60px 60px' }} />
          <div style={{ position: 'absolute', top: '10%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)', pointerEvents: 'none', animation: 'smi-float 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '5%', right: '8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,102,0.06) 0%, transparent 70%)', pointerEvents: 'none', animation: 'smi-float 10s ease-in-out infinite' }} />

          <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', position: 'relative' }}>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left */}
              <div className="sr-reveal">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: 999, padding: '4px 14px', marginBottom: '1.5rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: LIME, display: 'inline-block', animation: 'smi-pulse 1.5s infinite' }} />
                  <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Ages 12–18 · Mumbai + Online · June 2026</span>
                </div>

                <h1 className="smi-hero-title" style={{ fontFamily: JB, fontSize: 'clamp(2rem,8vw,4rem)', fontWeight: 900, lineHeight: 1.05, marginBottom: '1.25rem', letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
                  <span style={{ display: 'block', color: '#F4F4F5' }}>Turn Your</span>
                  <span style={{ display: 'block' }} className="smi-grad">Screen Time</span>
                  <span style={{ display: 'block', color: '#F4F4F5' }}>Into a Skill</span>
                  <span style={{ display: 'block' }} className="smi-grad">That Pays.</span>
                </h1>

                <p style={{ fontFamily: NU, fontSize: '1.05rem', color: '#A1A1AA', lineHeight: 1.7, marginBottom: '0.75rem', maxWidth: 480 }}>
                  1-Month Offline Program to become a job-ready Social Media Intern.
                  <strong style={{ color: '#F4F4F5' }}> Learn. Create. Get Placed.</strong>
                </p>
                <p style={{ fontFamily: JB, fontSize: '0.78rem', color: GREEN, fontWeight: 700, marginBottom: '2rem', letterSpacing: '0.08em' }}>
                  India's First Social Media Internship Readiness Program for School Students
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2.5rem' }}>
                  {[['1 Month', 'Program'], ['Ages 12–18', 'Eligibility'], ['Mumbai + Online', 'Mode']].map(([val, lbl]) => (
                    <div key={lbl} style={{ textAlign: 'center', background: '#121212', border: '1px solid #27272A', borderRadius: 6, padding: '0.6rem 1.1rem', minWidth: 90 }}>
                      <div style={{ fontFamily: JB, fontWeight: 800, fontSize: '0.95rem', color: LIME }}>{val}</div>
                      <div style={{ fontFamily: NU, fontSize: '0.7rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <button
                    onClick={goBook}
                    data-testid="hero-apply-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.95rem', padding: '1rem 2.2rem', borderRadius: 999, border: 'none', cursor: 'pointer', boxShadow: `0 0 28px rgba(204,255,0,0.35)`, letterSpacing: '0.06em', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 44px rgba(204,255,0,0.55)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(204,255,0,0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    Reserve Your Seat <ArrowRight style={{ width: 17, height: 17 }} />
                  </button>
                  <button
                    onClick={goBook}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#F4F4F5', fontFamily: JB, fontWeight: 700, fontSize: '0.88rem', padding: '0.95rem 1.8rem', borderRadius: 999, border: '1px solid #27272A', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.05em' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272A'; e.currentTarget.style.color = '#F4F4F5'; }}
                  >
                    Get a Callback
                  </button>
                </div>
              </div>

              {/* Right: countdown + image */}
              <div className="sr-reveal sr-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ background: '#121212', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 12, padding: '1.5rem', textAlign: 'center', boxShadow: '0 0 40px rgba(204,255,0,0.05) inset' }}>
                  <p style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Next Batch Starts In</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
                    {[['d', 'DAYS'], ['h', 'HRS'], ['m', 'MIN'], ['s', 'SEC']].map(([k, lbl]) => (
                      <div key={k} className="smi-countdown-cell" style={{ background: BG, border: '1px solid #27272A', borderRadius: 8 }}>
                        <div className="smi-countdown-num" style={{ fontFamily: JB, fontWeight: 900, fontSize: '1.75rem', color: LIME, lineHeight: 1 }}>{String(countdown[k]).padStart(2,'0')}</div>
                        <div style={{ fontFamily: NU, fontSize: '0.62rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontFamily: NU, fontSize: '0.78rem', color: '#71717A', marginTop: '1rem' }}>Limited to 15 students per batch</p>
                </div>

                <img
                  src="https://images.pexels.com/photos/13929251/pexels-photo-13929251.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                  alt="Student creating social media content"
                  style={{ borderRadius: 12, width: '100%', maxHeight: 280, objectFit: 'cover', border: '1px solid #27272A', filter: 'brightness(0.85) saturate(1.1)' }}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── PLATFORMS WE FOCUS ON (Instagram + YouTube) ── */}
        <section style={{ background: '#0A0A0A', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '3rem 1.5rem' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }} className="sr-reveal">
            <p style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Platforms You'll Master</p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.9 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#833AB4,#FD1D1D,#F77737)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Instagram style={{ width: 30, height: 30, color: '#FFF' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: JB, fontWeight: 800, color: '#F4F4F5', fontSize: '1.05rem' }}>Instagram</div>
                  <div style={{ fontFamily: NU, color: '#71717A', fontSize: '0.8rem' }}>Reels · Stories · Carousels</div>
                </div>
              </div>
              <div style={{ width: 1, height: 40, background: '#27272A' }} className="hidden md:block" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.9 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Youtube style={{ width: 32, height: 32, color: '#FFF' }} fill="#FFF" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: JB, fontWeight: 800, color: '#F4F4F5', fontSize: '1.05rem' }}>YouTube</div>
                  <div style={{ fontFamily: NU, color: '#71717A', fontSize: '0.8rem' }}>Shorts · Long-form · Vlogs</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── AS SEEN ON (reuses summer camp content) ── */}
        <section style={{ padding: '5rem 1.5rem', position: 'relative', background: 'rgba(8,8,12,0.6)' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(204,255,0,0.3), transparent)' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="sr-reveal">
              <p style={{ fontFamily: JB, fontSize: '0.65rem', color: LIME, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.75rem' }}>// featured.on.national.tv</p>
              <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 900, color: '#F4F4F5' }}>As Seen On</h2>
            </div>

            <div className="sr-reveal sr-delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.1rem' }}>
              {/* KBC */}
              <div className="smi-media-card" style={{ height: 260 }}>
                <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png" alt="Kaun Banega Crorepati" loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.3) 50%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem', right: '1.5rem' }}>
                  <div style={{ fontFamily: JB, fontSize: '0.6rem', letterSpacing: '0.18em', color: '#FFD700', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Sony Entertainment · KBC</div>
                  <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC' }}>Kaun Banega Crorepati</div>
                  <div style={{ fontFamily: NU, fontSize: '0.78rem', color: '#8899AA', marginTop: 3 }}>Featured as India's leading EdTech for kids</div>
                </div>
              </div>
              {/* Shark Tank */}
              <div className="smi-media-card" style={{ height: 260 }}>
                <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png" alt="Shark Tank India" loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.3) 50%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem', right: '1.5rem' }}>
                  <div style={{ fontFamily: JB, fontSize: '0.6rem', letterSpacing: '0.18em', color: LIME, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Sony LIV · Season Finale</div>
                  <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC' }}>Shark Tank India</div>
                  <div style={{ fontFamily: NU, fontSize: '0.78rem', color: '#8899AA', marginTop: 3 }}>Pitched to India's top investors on national TV</div>
                </div>
              </div>
            </div>

            {/* Press ticker */}
            <div style={{ marginTop: '2.5rem', overflow: 'hidden' }}>
              <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
                <span style={{ fontFamily: JB, fontSize: '0.62rem', color: '#52525B', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>// Also covered by</span>
              </div>
              <div style={{ position: 'relative', overflow: 'hidden', width: '100%', maskImage: 'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)' }}>
                <div className="smi-marquee-slow">
                  {[...PRESS_ITEMS, ...PRESS_ITEMS].map((name, i) => (
                    <span key={i} style={{ fontFamily: JB, fontSize: '0.9rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(204,255,0,0.2), transparent)' }} />
        </section>

        {/* ── SOLUTION INTRO + 3 PILLARS ── */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '3.5rem' }} className="sr-reveal">
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>// The Solution</span>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 900, lineHeight: 1.15, maxWidth: 780, marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
              India's First Offline Social Media<br />
              <span style={{ color: LIME }}>Internship Readiness Program</span><br />
              for School Students
            </h2>
            <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 580 }}>
              A real, hands-on 1-month program where students don't just learn social media — they <strong style={{ color: '#F4F4F5' }}>build their portfolio</strong>, <strong style={{ color: '#F4F4F5' }}>create for real brands</strong>, and <strong style={{ color: '#F4F4F5' }}>get placed as interns</strong>.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Zap,         title: 'Learn by Doing',         desc: 'No boring theory. Every session ends with a real deliverable — a reel, a caption, a content plan.' },
              { icon: Camera,      title: 'Real Startup Exposure',  desc: 'Students work on actual brand briefs from our partner startups and founders.' },
              { icon: CheckCircle, title: 'Internship Placement',   desc: 'Top performers get placed as social media interns. Work with real founders, earn your first stipend.' },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className={`sr-reveal sr-delay-${i+1}`}
                  style={{ background: '#0E0E0E', border: '1px solid #1F1F1F', borderRadius: 12, padding: '2rem 1.5rem', transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 0 40px rgba(204,255,0,0.08)`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1F1F'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Icon style={{ width: 22, height: 22, color: LIME }} />
                  </div>
                  <h3 style={{ fontFamily: JB, fontWeight: 800, fontSize: '1.05rem', color: '#F4F4F5', marginBottom: '0.65rem', letterSpacing: '-0.01em' }}>{p.title}</h3>
                  <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '0.92rem', lineHeight: 1.65 }}>{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── WHAT YOU'LL LEARN (Bento) ── */}
        <section style={{ background: '#080808', borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }} className="sr-reveal">
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>// Curriculum</span>
              <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.65rem,3.5vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.01em' }}>What You'll Learn</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <div key={mod.title}
                    className={`sr-reveal sr-delay-${Math.min(i+1, 4)} ${i === 4 ? 'col-span-2 md:col-span-2' : ''}`}
                    style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, padding: '1.75rem 1.5rem', position: 'relative', overflow: 'hidden', transition: 'all 0.3s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(204,255,0,0.35)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f1f1f'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                      <Icon style={{ width: 20, height: 20, color: LIME }} />
                    </div>
                    <div style={{ fontFamily: JB, fontSize: '0.68rem', color: '#52525B', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 4 }}>MODULE {String(i+1).padStart(2,'0')}</div>
                    <h3 style={{ fontFamily: JB, fontWeight: 800, fontSize: '1rem', color: '#F4F4F5', marginBottom: '0.5rem' }}>{mod.title}</h3>
                    <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '0.88rem', lineHeight: 1.6 }}>{mod.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SCROLLING GALLERY (Sneak Peek) ── */}
        <section style={{ padding: '5rem 0 4rem', overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem', padding: '0 1.5rem' }} className="sr-reveal">
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>// Sneak peek</span>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.65rem,3.5vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.01em' }}>Inside the Program</h2>
            <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '1rem', maxWidth: 480, margin: '0.75rem auto 0', lineHeight: 1.65 }}>
              Real students. Real shoots. Real deliverables — every single day.
            </p>
          </div>

          <div style={{ position: 'relative', overflow: 'hidden', width: '100%', maskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)' }}>
            <div className="smi-marquee-track">
              {[...GALLERY, ...GALLERY].map((src, i) => (
                <div key={i} style={{ flexShrink: 0, width: 340, height: 240, borderRadius: 14, overflow: 'hidden', border: '1px solid #1A1A1A', position: 'relative', background: '#0B0B0B' }}>
                  <img src={src} alt={`Sneak peek ${(i%GALLERY.length)+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.92) saturate(1.05)' }} loading="lazy" />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,5,0.6), transparent 40%)' }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STUDENTS WORKING AT (Company Logos Marquee) ── */}
        <section style={{ background: '#080808', borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', padding: '4rem 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '0 1.5rem' }} className="sr-reveal">
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: GREEN, letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>// Where our graduates work</span>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.5rem,3vw,2.25rem)', fontWeight: 900, letterSpacing: '-0.01em' }}>Students Placed At</h2>
            <p style={{ fontFamily: NU, color: '#71717A', fontSize: '0.9rem', marginTop: '0.5rem' }}>Real brands · Real stipends · Real portfolios</p>
          </div>

          <div style={{ position: 'relative', overflow: 'hidden', width: '100%', maskImage: 'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)' }}>
            <div className="smi-marquee-track">
              {[...PLACEHOLDER_COMPANIES, ...PLACEHOLDER_COMPANIES, ...PLACEHOLDER_COMPANIES].map((c, i) => (
                <div key={i} style={{ flexShrink: 0, padding: '0.9rem 2rem', border: '1px solid #27272A', borderRadius: 10, background: '#121212', fontFamily: JB, fontSize: '0.95rem', fontWeight: 800, color: '#A1A1AA', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {c}
                </div>
              ))}
            </div>
          </div>
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontFamily: NU, fontSize: '0.75rem', color: '#52525B' }}>Actual partner logos coming soon</p>
        </section>

        {/* ── STUDENT REVIEWS ── */}
        <section style={{ padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }} className="sr-reveal">
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: GREEN, letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>// Real student voices</span>
              <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.65rem,3.5vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.01em' }}>Hear It From Our Students</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {STUDENT_REVIEWS.map((r, i) => (
                <div key={r.name} className={`sr-reveal sr-delay-${i+1}`}
                  style={{ background: '#0E0E0E', border: '1px solid #1F1F1F', borderRadius: 14, padding: '1.75rem 1.5rem', position: 'relative', transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,102,0.35)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1F1F'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Quote style={{ width: 22, height: 22, color: GREEN, marginBottom: '0.75rem', opacity: 0.6 }} />
                  <p style={{ fontFamily: NU, color: '#E4E4E7', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                    "{r.quote}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: '1rem', borderTop: '1px solid #1F1F1F' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${LIME}, ${GREEN})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.95rem' }}>
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontFamily: JB, fontWeight: 800, fontSize: '0.88rem', color: '#F4F4F5' }}>{r.name}</div>
                      <div style={{ fontFamily: NU, fontSize: '0.72rem', color: '#71717A' }}>Age {r.age} · <span style={{ color: LIME }}>{r.handle}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Video placeholder row */}
            <div style={{ textAlign: 'center', marginTop: '3rem' }} className="sr-reveal">
              <span style={{ fontFamily: JB, fontSize: '0.62rem', color: '#52525B', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>// Watch student stories</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginTop: '1rem' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`sr-reveal sr-delay-${i}`}
                  style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', background: '#121212', border: '1px solid #1F1F1F', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = LIME; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1F1F'; }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(204,255,0,0.1)', border: `1px solid ${LIME}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play style={{ width: 22, height: 22, color: LIME, marginLeft: 3 }} fill={LIME} />
                  </div>
                  <span style={{ position: 'absolute', bottom: 10, left: 12, fontFamily: JB, fontSize: '0.65rem', color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>VIDEO {i}</span>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: '1rem', fontFamily: NU, fontSize: '0.75rem', color: '#52525B' }}>Real student videos uploading soon</p>
          </div>
        </section>

        {/* ── OUTCOMES ── */}
        <section style={{ background: '#080808', borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }} className="sr-reveal">
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>// Outcomes</span>
              <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.65rem,3.5vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.01em' }}>What Students Walk Away With</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {OUTCOMES.map((o, i) => {
                const Icon = o.icon;
                return (
                  <div key={o.title} className={`sr-reveal sr-delay-${i+1}`}
                    style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, padding: '1.75rem 1.25rem', textAlign: 'center', transition: 'all 0.3s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,102,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f1f1f'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(0,255,102,0.08)', border: '1px solid rgba(0,255,102,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                      <Icon style={{ width: 24, height: 24, color: GREEN }} />
                    </div>
                    <h3 style={{ fontFamily: JB, fontWeight: 800, fontSize: '0.92rem', color: '#F4F4F5', marginBottom: '0.5rem' }}>{o.title}</h3>
                    <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '0.82rem', lineHeight: 1.6 }}>{o.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── INTERNSHIP ANGLE ── */}
        <section style={{ background: 'linear-gradient(135deg, #0A100A 0%, #071207 100%)', padding: '5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '20%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,102,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }} className="sr-reveal">
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: GREEN, letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>// Placement Program</span>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 900, marginBottom: '1.25rem', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              Top Students Get Placed as<br /><span style={{ color: GREEN }}>Real Social Media Interns</span>
            </h2>
            <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: '2.5rem', maxWidth: 600, margin: '0 auto 2.5rem' }}>
              We partner with early-stage startups and brands in Mumbai. Top-performing students get placed as social media interns — working with real founders, not just practicing on dummy accounts.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
              {['Work with real founders', 'Earn a stipend', 'Build your portfolio', 'Get a reference letter', 'Start your career at 14'].map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,102,0.07)', border: '1px solid rgba(0,255,102,0.3)', color: GREEN, borderRadius: 999, padding: '5px 14px', fontFamily: JB, fontSize: '0.78rem', fontWeight: 700 }}>
                  <CheckCircle style={{ width: 12, height: 12 }} /> {t}
                </span>
              ))}
            </div>
            <button
              onClick={goBook}
              data-testid="placement-cta-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: GREEN, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.95rem', padding: '1rem 2.2rem', borderRadius: 999, border: 'none', cursor: 'pointer', boxShadow: '0 0 28px rgba(0,255,102,0.35)', letterSpacing: '0.06em', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 44px rgba(0,255,102,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(0,255,102,0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Book Your Seat <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </section>

        {/* ── PROGRAM STRUCTURE + PRICING ── */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 1.5rem' }}>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="sr-reveal">
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '1.25rem' }}>// Program Structure</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  ['Duration',    '1 Month (32 hrs total)'],
                  ['Mode',        'Offline at OLL Mumbai Centers + Online'],
                  ['Sessions',    '4 sessions/week, 2 hrs each'],
                  ['Batch Size',  'Max 15 students (limited)'],
                  ['Mentors',     'Industry creators & social media experts'],
                  ['Certificate', 'OLL-certified Social Media Intern'],
                  ['Ages',        '12 to 18 years'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #1A1A1A', paddingBottom: '0.7rem' }}>
                    <span style={{ fontFamily: JB, fontSize: '0.78rem', color: '#71717A', minWidth: 100, letterSpacing: '0.05em' }}>{k}</span>
                    <span style={{ fontFamily: NU, fontSize: '0.92rem', color: '#E4E4E7', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sr-reveal sr-delay-2" style={{ background: '#111', border: `2px solid ${LIME}`, borderRadius: 14, padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.7rem', padding: '4px 16px', letterSpacing: '0.12em' }}>BEST VALUE</div>
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,255,0,0.1) 0%, transparent 70%)' }} />
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: '#71717A', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>Program Investment</span>
              <div style={{ fontFamily: JB, fontWeight: 900, fontSize: '3rem', color: LIME, lineHeight: 1, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>₹19,900</div>
              <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                One-time fee. Includes all sessions, materials, placement support, and internship matching.
              </p>
              <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '1.5rem', fontFamily: NU, fontSize: '0.85rem', color: '#D1D1D1', lineHeight: 1.6 }}>
                💡 <strong style={{ color: '#F4F4F5' }}>Less than the cost of a new phone</strong> — and this skill lasts a lifetime.
              </div>
              <div style={{ fontFamily: NU, fontSize: '0.82rem', color: '#71717A', marginBottom: '1.5rem' }}>
                Or reserve with <strong style={{ color: LIME }}>₹2,000 deposit</strong> and pay balance at center.
              </div>
              {[
                'All 5 curriculum modules',
                'Startup project assignments',
                'Internship placement support',
                'Certificate of completion',
                'Lifetime OLL alumni network',
              ].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.55rem' }}>
                  <CheckCircle style={{ width: 14, height: 14, color: LIME, flexShrink: 0 }} />
                  <span style={{ fontFamily: NU, fontSize: '0.88rem', color: '#D4D4D8' }}>{f}</span>
                </div>
              ))}
              <button
                onClick={goBook}
                data-testid="pricing-apply-btn"
                style={{ width: '100%', marginTop: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '1rem', padding: '1.05rem', borderRadius: 999, border: 'none', cursor: 'pointer', boxShadow: `0 0 28px rgba(204,255,0,0.35)`, letterSpacing: '0.06em', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 44px rgba(204,255,0,0.55)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(204,255,0,0.35)'; }}
              >
                Apply Now — Reserve Your Seat <ArrowRight style={{ width: 17, height: 17 }} />
              </button>
            </div>
          </div>
        </section>

        {/* ── PARENT SECTION ── */}
        <section style={{ background: '#080808', borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', padding: '4rem 1.5rem' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }} className="sr-reveal">
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: '#71717A', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>// For Parents</span>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.35rem,3vw,2rem)', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.3 }}>
              "Don't let your child just consume content.<br />
              <span style={{ color: LIME }}>Let them create, grow, and earn from it."</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: '2rem' }}>
              {['Builds confidence & communication', 'Early career exposure', 'Productive screen time', 'Real-world portfolio'].map(b => (
                <div key={b} style={{ background: '#111', border: '1px solid #1F1F1F', borderRadius: 10, padding: '1.1rem 1rem', fontFamily: NU, fontSize: '0.85rem', color: '#A1A1AA', lineHeight: 1.55 }}>
                  <Star style={{ width: 14, height: 14, color: LIME, marginBottom: 6 }} fill={LIME} />
                  <div>{b}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ maxWidth: 780, margin: '0 auto', padding: '5rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="sr-reveal">
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>// FAQ</span>
            <h2 style={{ fontFamily: JB, fontWeight: 900, fontSize: 'clamp(1.5rem,3.5vw,2rem)', letterSpacing: '-0.01em' }}>Frequently Asked Questions</h2>
          </div>
          {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ background: 'linear-gradient(135deg, #080808, #0A100A)', borderTop: '1px solid #1A1A1A', padding: '5rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,255,0,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }} className="sr-reveal">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: 999, padding: '4px 14px', marginBottom: '1.5rem' }}>
              <Zap style={{ width: 12, height: 12, color: LIME }} />
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Seats Filling Fast</span>
            </div>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.85rem,4vw,2.85rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              The best time to start<br />was yesterday.<br />
              <span style={{ color: LIME }}>The second best is now.</span>
            </h2>
            <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
              Only 15 seats per batch. Register today to lock your spot before the batch fills up.
            </p>
            <button
              onClick={goBook}
              data-testid="final-cta-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '1.1rem', padding: '1.15rem 2.8rem', borderRadius: 999, border: 'none', cursor: 'pointer', boxShadow: '0 0 40px rgba(204,255,0,0.4)', letterSpacing: '0.06em', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 60px rgba(204,255,0,0.6)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(204,255,0,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Book My Seat Now <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: '1px solid #1A1A1A', padding: '2.5rem 1.5rem', textAlign: 'center', background: '#020202' }}>
          <img src={OLL_LOGO} alt="OLL" style={{ height: 24, marginBottom: '1rem', opacity: 0.75 }} />
          <p style={{ fontFamily: NU, color: '#52525B', fontSize: '0.82rem' }}>
            © 2026 OLL Future Skills. Social Media Internship Readiness Program.{' '}
            <a href="tel:+919920188188" style={{ color: '#A1A1AA', textDecoration: 'none' }}>+91 99201 88188</a>
          </p>
        </footer>
      </div>
    </>
  );
}
