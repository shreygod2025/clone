import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, ChevronDown, CheckCircle, Star, Zap, Camera, Pen, TrendingUp, Film, Lightbulb } from 'lucide-react';

const JB = "'JetBrains Mono', monospace";
const NU = "'Nunito Sans', sans-serif";
const LIME = '#CCFF00';
const GREEN = '#00FF66';
const BG = '#050505';

const MODULES = [
  { icon: Lightbulb, title: 'Content Ideation', desc: 'Trend research, niche identification, viral content frameworks', span: 'col-span-1' },
  { icon: Pen,       title: 'Script Writing',   desc: 'Storytelling hooks, caption writing, brand voice', span: 'col-span-1' },
  { icon: Camera,    title: 'Video Shooting',   desc: 'Reels, Shorts, lighting, framing — mobile-first production', span: 'col-span-1' },
  { icon: Film,      title: 'Video Editing',    desc: 'CapCut, InShot, transitions, captions, sound design', span: 'col-span-1' },
  { icon: TrendingUp,title: 'Growth Strategy',  desc: 'Hashtags, collaboration, analytics, algorithm hacking', span: 'col-span-1 md:col-span-2' },
];

const OUTCOMES = [
  { emoji: '📱', title: 'Live Portfolio',       desc: 'Real content published on their own channels.' },
  { emoji: '🚀', title: 'Startup Projects',     desc: 'Work on actual brand briefs from partner startups.' },
  { emoji: '🏆', title: 'Internship Placement', desc: 'Top students get placed as paid social media interns.' },
  { emoji: '📜', title: 'Certificate',          desc: 'OLL-certified Social Media Intern — industry-ready.' },
];

const FAQS = [
  { q: 'Is prior experience required?',         a: 'No. This program is built for complete beginners. All you need is a smartphone and curiosity.' },
  { q: 'Is it safe for school students?',        a: 'Yes. Offline sessions are supervised at our centers. Online sessions are live instructor-led classes.' },
  { q: 'What kind of internships do students get?', a: 'Students work with real early-stage startups and content brands in Mumbai on social media campaigns.' },
  { q: 'Will every student get placed?',         a: 'Top-performing students get placement support. We aim for at least 70% of students to secure an internship.' },
  { q: 'What is the schedule?',                  a: '4 sessions/week, each 2 hours. Approx. 32 hours of training over 4 weeks. Weekday & weekend batches available.' },
  { q: 'Is there an EMI option?',                a: 'Yes! You can reserve your seat with ₹2,000 and pay the remaining ₹17,900 at the center.' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{ borderBottom: '1px solid #27272A', padding: '1.35rem 0', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span style={{ fontFamily: JB, fontWeight: 700, fontSize: '0.95rem', color: open ? LIME : '#F4F4F5', transition: 'color 0.2s' }}>{q}</span>
        <ChevronDown style={{ width: 18, height: 18, color: LIME, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s' }} />
      </div>
      {open && <p style={{ marginTop: '0.75rem', color: '#A1A1AA', fontFamily: NU, fontSize: '0.92rem', lineHeight: 1.7 }}>{a}</p>}
    </div>
  );
}

export default function SocialMediaInternPage() {
  const navigate = useNavigate();
  const heroRef  = useRef(null);
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    // Countdown to next batch (May 15 2026 as placeholder)
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
        <title>Social Media Internship Readiness Program | OLL Future Skills</title>
        <meta name="description" content="India's First Offline Social Media Internship Readiness Program for school students aged 12–18. Learn. Create. Get Placed. ₹19,900." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800;900&family=Nunito+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Helmet>

      <div style={{ background: BG, color: '#F4F4F5', fontFamily: NU, minHeight: '100vh' }}>

        {/* ── STICKY NAV ── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #27272A', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/oll-logo.png" alt="OLL" style={{ height: 28 }} onError={e => { e.target.style.display='none'; }} />
            <span style={{ fontFamily: JB, fontSize: '0.78rem', fontWeight: 700, color: LIME, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Social Media Intern Program</span>
          </div>
          <button
            onClick={goBook}
            data-testid="nav-apply-btn"
            style={{ background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.78rem', padding: '0.55rem 1.4rem', borderRadius: 4, border: 'none', cursor: 'pointer', letterSpacing: '0.08em' }}
          >
            Apply Now
          </button>
        </nav>

        {/* ── HERO ── */}
        <section ref={heroRef} style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', overflow: 'hidden', padding: '5rem 1.5rem 4rem' }}>
          {/* Grid pattern */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(#CCFF00 1px, transparent 1px), linear-gradient(90deg, #CCFF00 1px, transparent 1px)',
            backgroundSize: '60px 60px' }} />
          {/* Glow orbs */}
          <div style={{ position: 'absolute', top: '10%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '5%', right: '8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,102,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', position: 'relative' }}>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left */}
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: 4, padding: '4px 14px', marginBottom: '1.5rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: LIME, display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Ages 12–18 · Mumbai + Online · June 2026</span>
                </div>

                <h1 style={{ fontFamily: JB, fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem' }}>
                  <span style={{ display: 'block', color: '#F4F4F5' }}>Turn Your</span>
                  <span style={{ display: 'block', color: LIME }}>Screen Time</span>
                  <span style={{ display: 'block', color: '#F4F4F5' }}>Into a Skill</span>
                  <span style={{ display: 'block', background: 'linear-gradient(90deg, #CCFF00, #00FF66)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>That Pays.</span>
                </h1>

                <p style={{ fontFamily: NU, fontSize: '1.05rem', color: '#A1A1AA', lineHeight: 1.7, marginBottom: '0.75rem', maxWidth: 460 }}>
                  1-Month Offline Program to become a job-ready Social Media Intern.
                  <strong style={{ color: '#F4F4F5' }}> Learn. Create. Get Placed.</strong>
                </p>
                <p style={{ fontFamily: JB, fontSize: '0.8rem', color: GREEN, fontWeight: 700, marginBottom: '2rem', letterSpacing: '0.08em' }}>India's First Social Media Internship Readiness Program for School Students</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2.5rem' }}>
                  {[['1 Month', 'Program'], ['Ages 12–18', 'Eligibility'], ['Mumbai + Online', 'Mode'], ['₹19,900', 'Fee']].map(([val, lbl]) => (
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
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.95rem', padding: '1rem 2.2rem', borderRadius: 4, border: 'none', cursor: 'pointer', boxShadow: `0 0 28px rgba(204,255,0,0.35)`, letterSpacing: '0.06em', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 44px rgba(204,255,0,0.55)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(204,255,0,0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    Reserve Your Seat <ArrowRight style={{ width: 17, height: 17 }} />
                  </button>
                  <button
                    onClick={goBook}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#F4F4F5', fontFamily: JB, fontWeight: 700, fontSize: '0.88rem', padding: '0.95rem 1.8rem', borderRadius: 4, border: '1px solid #27272A', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.05em' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272A'; e.currentTarget.style.color = '#F4F4F5'; }}
                  >
                    Get a Callback
                  </button>
                </div>
              </div>

              {/* Right: countdown + image */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ background: '#121212', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 8, padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Next Batch Starts In</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                    {[['d', 'DAYS'], ['h', 'HRS'], ['m', 'MIN'], ['s', 'SEC']].map(([k, lbl]) => (
                      <div key={k} style={{ background: BG, border: '1px solid #27272A', borderRadius: 6, padding: '0.75rem 1rem', minWidth: 60 }}>
                        <div style={{ fontFamily: JB, fontWeight: 900, fontSize: '1.8rem', color: LIME, lineHeight: 1 }}>{String(countdown[k]).padStart(2,'0')}</div>
                        <div style={{ fontFamily: NU, fontSize: '0.62rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontFamily: NU, fontSize: '0.78rem', color: '#71717A', marginTop: '1rem' }}>Limited to 15 students per batch</p>
                </div>

                <img
                  src="https://images.pexels.com/photos/13929251/pexels-photo-13929251.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                  alt="Student creating social media content"
                  style={{ borderRadius: 8, width: '100%', maxHeight: 300, objectFit: 'cover', border: '1px solid #27272A', filter: 'brightness(0.85) saturate(1.1)' }}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEM TICKER ── */}
        <section style={{ background: '#0A0A0A', borderTop: '1px solid #27272A', borderBottom: '1px solid #27272A', padding: '1.25rem 1.5rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '0.5rem 2rem', justifyContent: 'center' }}>
            {[
              'Students scroll 7+ hours/day but create nothing',
              'No social media skills taught in school',
              'Zero internship exposure before college',
              'Parents worry about unproductive screen time',
            ].map((t, i) => (
              <span key={i} style={{ fontFamily: JB, fontSize: '0.78rem', color: '#71717A', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D63031', flexShrink: 0, display: 'inline-block' }} />
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* ── SOLUTION INTRO ── */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>The Solution</span>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 900, lineHeight: 1.15, maxWidth: 700, marginBottom: '1.25rem' }}>
              India's First Offline Social Media<br />
              <span style={{ color: LIME }}>Internship Readiness Program</span><br />
              for School Students
            </h2>
            <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 580 }}>
              A real, hands-on 1-month program where students don't just learn social media — they <strong style={{ color: '#F4F4F5' }}>build their portfolio</strong>, <strong style={{ color: '#F4F4F5' }}>create for real brands</strong>, and <strong style={{ color: '#F4F4F5' }}>get placed as interns</strong>.
            </p>
          </div>

          {/* 3 pillars */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: '⚡', title: 'Learn by Doing', desc: 'No boring theory. Every session ends with a real deliverable — a reel, a caption, a content plan.' },
              { icon: '🏢', title: 'Real Startup Exposure', desc: 'Students work on actual brand briefs from our partner startups and founders.' },
              { icon: '💼', title: 'Internship Placement', desc: 'Top performers get placed as social media interns. Work with real founders, earn your first stipend.' },
            ].map(p => (
              <div key={p.title} style={{ background: '#121212', border: '1px solid #27272A', borderRadius: 8, padding: '2rem 1.5rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.boxShadow = `0 0 24px rgba(204,255,0,0.08)`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272A'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{p.icon}</div>
                <h3 style={{ fontFamily: JB, fontWeight: 800, fontSize: '1rem', color: '#F4F4F5', marginBottom: '0.65rem' }}>{p.title}</h3>
                <p style={{ fontFamily: NU, color: '#71717A', fontSize: '0.9rem', lineHeight: 1.65 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHAT YOU'LL LEARN (Bento) ── */}
        <section style={{ background: '#080808', borderTop: '1px solid #27272A', borderBottom: '1px solid #27272A', padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>Curriculum</span>
              <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.5rem,3.5vw,2.5rem)', fontWeight: 900 }}>What You'll Learn</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <div key={mod.title}
                    className={i === 4 ? 'col-span-2 md:col-span-2' : ''}
                    style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, padding: '1.75rem 1.5rem', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(204,255,0,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f1f1f'; }}
                  >
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle, rgba(204,255,0,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                      <Icon style={{ width: 20, height: 20, color: LIME }} />
                    </div>
                    <h3 style={{ fontFamily: JB, fontWeight: 800, fontSize: '0.9rem', color: '#F4F4F5', marginBottom: '0.5rem' }}>Module {i + 1}: {mod.title}</h3>
                    <p style={{ fontFamily: NU, color: '#71717A', fontSize: '0.85rem', lineHeight: 1.6 }}>{mod.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── OUTCOMES ── */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: GREEN, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>Outcomes</span>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.5rem,3.5vw,2.5rem)', fontWeight: 900 }}>What Students Walk Away With</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {OUTCOMES.map(o => (
              <div key={o.title} style={{ background: '#121212', border: '1px solid #27272A', borderRadius: 8, padding: '1.75rem 1.25rem', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,102,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272A'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>{o.emoji}</div>
                <h3 style={{ fontFamily: JB, fontWeight: 800, fontSize: '0.88rem', color: '#F4F4F5', marginBottom: '0.5rem' }}>{o.title}</h3>
                <p style={{ fontFamily: NU, color: '#71717A', fontSize: '0.82rem', lineHeight: 1.6 }}>{o.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── INTERNSHIP ANGLE ── */}
        <section style={{ background: 'linear-gradient(135deg, #0A100A 0%, #071207 100%)', border: '1px solid rgba(0,255,102,0.15)', margin: '0', padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: GREEN, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>Placement Program</span>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 900, marginBottom: '1.25rem', lineHeight: 1.15 }}>
              Top Students Get Placed as<br /><span style={{ color: GREEN }}>Real Social Media Interns</span>
            </h2>
            <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: '2.5rem', maxWidth: 600, margin: '0 auto 2.5rem' }}>
              We partner with early-stage startups and brands in Mumbai. Top-performing students get placed as social media interns — working with real founders, not just practicing on dummy accounts.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
              {['Work with real founders', 'Earn a stipend', 'Build your portfolio', 'Get a reference letter', 'Start your career at 14'].map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,102,0.07)', border: '1px solid rgba(0,255,102,0.2)', color: GREEN, borderRadius: 4, padding: '5px 14px', fontFamily: JB, fontSize: '0.78rem', fontWeight: 700 }}>
                  <CheckCircle style={{ width: 12, height: 12 }} /> {t}
                </span>
              ))}
            </div>
            <button
              onClick={goBook}
              data-testid="placement-cta-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: GREEN, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.95rem', padding: '1rem 2.2rem', borderRadius: 4, border: 'none', cursor: 'pointer', boxShadow: '0 0 28px rgba(0,255,102,0.35)', letterSpacing: '0.06em', transition: 'all 0.2s' }}
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
            {/* Structure */}
            <div>
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '1.25rem' }}>Program Structure</span>
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
                  <div key={k} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #1A1A1A', paddingBottom: '0.65rem' }}>
                    <span style={{ fontFamily: JB, fontSize: '0.78rem', color: '#71717A', minWidth: 100 }}>{k}</span>
                    <span style={{ fontFamily: NU, fontSize: '0.9rem', color: '#D4D4D8', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing card */}
            <div style={{ background: '#111', border: `2px solid ${LIME}`, borderRadius: 10, padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.72rem', padding: '4px 16px', letterSpacing: '0.1em' }}>BEST VALUE</div>
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,255,0,0.1) 0%, transparent 70%)' }} />
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: '#71717A', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>Program Investment</span>
              <div style={{ fontFamily: JB, fontWeight: 900, fontSize: '3rem', color: LIME, lineHeight: 1, marginBottom: '0.5rem' }}>₹19,900</div>
              <p style={{ fontFamily: NU, color: '#71717A', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                One-time fee. Includes all sessions, materials, placement support, and internship matching.
              </p>
              <div style={{ background: '#1A1A00', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 6, padding: '0.9rem 1rem', marginBottom: '1.5rem', fontFamily: NU, fontSize: '0.85rem', color: '#A3A300', lineHeight: 1.6 }}>
                💡 <strong>Less than the cost of a new phone — and this skill lasts a lifetime.</strong>
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
                style={{ width: '100%', marginTop: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '1rem', padding: '1.05rem', borderRadius: 4, border: 'none', cursor: 'pointer', boxShadow: `0 0 28px rgba(204,255,0,0.35)`, letterSpacing: '0.06em', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 44px rgba(204,255,0,0.55)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(204,255,0,0.35)'; }}
              >
                Apply Now — Reserve Your Seat <ArrowRight style={{ width: 17, height: 17 }} />
              </button>
            </div>
          </div>
        </section>

        {/* ── PARENT SECTION ── */}
        <section style={{ background: '#080808', borderTop: '1px solid #27272A', borderBottom: '1px solid #27272A', padding: '4rem 1.5rem' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: '#71717A', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>For Parents</span>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.3rem,3vw,2rem)', fontWeight: 900, marginBottom: '1.5rem' }}>
              "Don't let your child just consume content.<br />
              <span style={{ color: LIME }}>Let them create, grow, and earn from it."</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: '2rem' }}>
              {['Builds confidence & communication', 'Early career exposure', 'Productive screen time', 'Real-world portfolio'].map(b => (
                <div key={b} style={{ background: '#121212', border: '1px solid #27272A', borderRadius: 6, padding: '1rem', fontFamily: NU, fontSize: '0.85rem', color: '#A1A1AA', lineHeight: 1.5 }}>
                  <Star style={{ width: 14, height: 14, color: LIME, marginBottom: 6 }} />
                  <div>{b}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '5rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>FAQ</span>
            <h2 style={{ fontFamily: JB, fontWeight: 900, fontSize: 'clamp(1.4rem,3.5vw,2rem)' }}>Frequently Asked Questions</h2>
          </div>
          {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ background: 'linear-gradient(135deg, #080808, #0A100A)', borderTop: '1px solid #27272A', padding: '5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: 4, padding: '4px 14px', marginBottom: '1.5rem' }}>
              <Zap style={{ width: 12, height: 12, color: LIME }} />
              <span style={{ fontFamily: JB, fontSize: '0.65rem', fontWeight: 700, color: LIME, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Seats Filling Fast</span>
            </div>
            <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '1.25rem' }}>
              The best time to start<br />was yesterday.<br />
              <span style={{ color: LIME }}>The second best is now.</span>
            </h2>
            <p style={{ fontFamily: NU, color: '#71717A', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
              Only 15 seats per batch. Register today to lock your spot before the batch fills up.
            </p>
            <button
              onClick={goBook}
              data-testid="final-cta-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '1.1rem', padding: '1.15rem 2.8rem', borderRadius: 4, border: 'none', cursor: 'pointer', boxShadow: '0 0 40px rgba(204,255,0,0.4)', letterSpacing: '0.06em', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 60px rgba(204,255,0,0.6)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(204,255,0,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Book My Seat Now <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: '1px solid #27272A', padding: '2rem 1.5rem', textAlign: 'center', background: '#020202' }}>
          <p style={{ fontFamily: NU, color: '#3F3F46', fontSize: '0.82rem' }}>
            © 2026 OLL Future Skills. Social Media Internship Readiness Program.{' '}
            <a href="tel:+919920188188" style={{ color: '#71717A', textDecoration: 'none' }}>+91 99201 88188</a>
          </p>
        </footer>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </>
  );
}
