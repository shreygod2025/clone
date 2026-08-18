/**
 * OLL Robotics Beginner — brand-aligned landing page.
 *
 * Follows the OLL Brand Guidelines PDF:
 *   • Headings: Anton (bold condensed – "Olivare Base" replacement)
 *   • Body:     Inter (clean sans-serif)
 *   • Quotes:   Libre Baskerville (serif)
 *   • Accent:   Caveat (playful handwriting – "Bacony Script" replacement)
 *   • Palette:  deep aspirational blue #0A1F44 / #1E3A8A, bold red #DC2626,
 *              light blue #60A5FA. NO edtech-cyan.
 *   • Design:  glass panes, blurred spotlight orbs (red / blue / light-blue),
 *              gradient buttons (red → blue), real imagery.
 *
 * Sections:
 *   1) Sticky top bar
 *   2) Hero (headline + Robotics.gif + CTAs)
 *   3) About OLL impact band (500+ schools · 2L+ students · 35 cities)
 *   4) As Seen On (Shark Tank + KBC)
 *   5) Implementation in Schools (swipeable slider)
 *   6) Schools that work with us (placeholder logo wall)
 *   7) Download Curriculum PDF
 *   8) Book a Demo form  (POSTs to /api/schools/inquiry)
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, Toaster } from 'sonner';
import {
  CheckCircle2, Sparkles, Users, Cpu, ArrowRight, Phone, Mail, Building2,
  MapPin, Loader2, Download, ChevronLeft, ChevronRight, PlayCircle,
  Quote, ShieldCheck, Rocket, GraduationCap, School, Trophy,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CURRICULUM_PDF =
  'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/qorbag8g_OLL%20-%20Beginner%20Curriculum%202026-27%20%282%29.pdf';

const ROBOTICS_GIF =
  'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif';

const OLL_LOGO_WHITE =
  'https://customer-assets.emergentagent.com/job_0add39d8-6ba8-4c9a-b97e-1c8e22260bae/artifacts/bnp5i3h5_OLL-horizontal-logo-white.png';

const KBC_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png';
const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';

const IMPACT = [
  { k: '500+',      l: 'Schools Partnered', icon: School,         color: '#1E3A8A' },
  { k: '2,00,000+', l: 'Students Trained',  icon: GraduationCap,  color: '#60A5FA' },
  { k: '35',        l: 'Cities Reached',    icon: MapPin,         color: '#DC2626' },
  { k: '950+',      l: 'Competitions Won',  icon: Trophy,         color: '#DC2626' },
];

const OUTCOMES = [
  { icon: Cpu,       t: 'A complete first-year Robotics program',   s: 'Kits, curriculum, teacher plans — everything a school needs to start.' },
  { icon: Sparkles,  t: 'High creativity, low complexity',          s: 'No soldering, no jargon. Kids build, code and imagine from Day 1.' },
  { icon: Users,     t: 'For every child in the class',             s: 'Backbenchers to toppers — each lesson calibrated to keep them hooked.' },
  { icon: ShieldCheck, t: 'Easy to teach, easy to run',             s: 'Lesson plans, videos, rubrics and 5-day teacher training included.' },
];

// Placeholder implementation data (user will provide real schools + logos + videos later).
const IMPLEMENTATIONS = [
  {
    school: 'D. G. Khetan International School',
    city: 'Mumbai',
    students: 480,
    principal: 'Mrs. Meena Bhatia',
    feedback: 'OLL Robotics has become the highlight of our STEM curriculum. Children walk in excited every week and walk out with a real project in hand.',
    logoText: 'DGK',
    color: '#DC2626',
    video: '#',
  },
  {
    school: 'Veekays English High School',
    city: 'Pune',
    students: 320,
    principal: 'Dr. R. Menon',
    feedback: 'The kits and lesson plans are so well-thought that our teachers were confident from Week 1. Parents love the year-end showcase.',
    logoText: 'VEH',
    color: '#1E3A8A',
    video: '#',
  },
  {
    school: 'Bombay Scottish School',
    city: 'Mumbai',
    students: 260,
    principal: 'Ms. Sunita Iyer',
    feedback: 'We wanted a Robotics program that fits our academic rhythm — OLL delivered exactly that. Our Grade 3 students built line-followers this year.',
    logoText: 'BSS',
    color: '#60A5FA',
    video: '#',
  },
  {
    school: 'Ryan International School',
    city: 'Bengaluru',
    students: 540,
    principal: 'Mr. Anand Kumar',
    feedback: 'From backbenchers to toppers, everyone finds their pace. That inclusivity is rare in Robotics programs — and it is what won us over.',
    logoText: 'RYAN',
    color: '#DC2626',
    video: '#',
  },
  {
    school: 'DPS International',
    city: 'Delhi',
    students: 410,
    principal: 'Mrs. Kavita Sharma',
    feedback: 'The teacher training was hands-on and thorough. Our staff now leads Robotics classes with real confidence.',
    logoText: 'DPS',
    color: '#1E3A8A',
    video: '#',
  },
];

const PARTNER_SCHOOLS = [
  'Bombay Scottish', 'DPS International', 'Ryan International', 'Veekays English High',
  'D. G. Khetan', 'Podar International', 'Delhi Public School', 'The Cathedral School',
  'Modern School', 'Oberoi International', 'Ecole Mondiale', 'Jamnabai Narsee',
];

export default function RoboticsBeginnerLanding() {
  const navigate = useNavigate();
  const sliderRef = useRef(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [form, setForm] = useState({
    school_name: '', contact_name: '', email: '', phone: '',
    city: '', student_count: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Slider auto-advance (pauses on hover via CSS not needed; keep simple).
  useEffect(() => {
    const t = setInterval(() => {
      setSlideIdx((i) => (i + 1) % IMPLEMENTATIONS.length);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const goTo = (i) => setSlideIdx((i + IMPLEMENTATIONS.length) % IMPLEMENTATIONS.length);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.school_name || !form.contact_name || !form.phone) {
      toast.error('Please fill School, Name and Phone.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/schools/inquiry`, {
        school_name: form.school_name,
        contact_name: form.contact_name,
        contact_role: 'Principal / Coordinator',
        email: form.email,
        phone: form.phone,
        city: form.city,
        state: '',
        curriculum: 'Robotics — Beginner (First Year)',
        student_count: parseInt(form.student_count || '0') || 0,
        notes: `Demo request via /school/robotics/beginner. ${form.notes || ''}`.trim(),
        source: 'Robotics Beginner Landing',
      });
      setDone(true);
      toast.success('Demo request received — our expert will call you shortly.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not submit. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const current = IMPLEMENTATIONS[slideIdx];

  return (
    <div className="rb-page">
      <Toaster position="top-right" richColors />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400;700&display=swap');

        .rb-page { min-height: 100vh; background: #FFFFFF; font-family: 'Inter', system-ui, sans-serif; color: #0A1F44; overflow-x: hidden; }
        .rb-h1, .rb-h2, .rb-h3, .rb-h4, .rb-num { font-family: 'Anton', 'Inter', sans-serif; letter-spacing: 0.01em; text-transform: uppercase; }
        .rb-serif { font-family: 'Libre Baskerville', Georgia, serif; }
        .rb-hand  { font-family: 'Caveat', cursive; }

        /* Buttons */
        .rb-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.95rem 1.75rem; border-radius: 999px; font-weight: 800; font-size: 0.98rem; text-decoration: none; cursor: pointer; border: none; transition: transform .2s ease, box-shadow .2s ease, filter .2s ease; }
        .rb-btn-primary { background: linear-gradient(90deg, #DC2626 0%, #1E3A8A 100%); color: #fff; box-shadow: 0 16px 34px rgba(220,38,38,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset; }
        .rb-btn-primary:hover { transform: translateY(-2px); filter: brightness(1.06); box-shadow: 0 22px 46px rgba(220,38,38,0.45); }
        .rb-btn-outline { background: transparent; color: #0A1F44; border: 2px solid #0A1F44; }
        .rb-btn-outline:hover { background: #0A1F44; color: #fff; }
        .rb-btn-ghost-white { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.35); backdrop-filter: blur(8px); }
        .rb-btn-ghost-white:hover { background: rgba(255,255,255,0.16); }

        /* Blur orbs */
        .rb-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
        .rb-orb-red   { background: rgba(220,38,38,0.55); }
        .rb-orb-blue  { background: rgba(30,58,138,0.55); }
        .rb-orb-light { background: rgba(96,165,250,0.5); }

        /* Glass */
        .rb-glass { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(14px); }

        /* Reveal */
        .rb-reveal { opacity: 0; transform: translateY(24px); transition: opacity .8s ease, transform .8s ease; }
        .rb-reveal.on { opacity: 1; transform: none; }

        /* Slider transitions */
        .rb-slide { transition: opacity .6s ease, transform .6s ease; }

        /* Sticky top */
        .rb-topbar { position: sticky; top: 0; z-index: 40; background: rgba(10,31,68,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.08); }

        /* Marquee */
        .rb-marquee { display: flex; gap: 3rem; animation: rb-scroll 34s linear infinite; width: max-content; }
        @keyframes rb-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* Underline stroke */
        .rb-stroke { background-image: linear-gradient(90deg, #DC2626, #1E3A8A); -webkit-background-clip: text; background-clip: text; color: transparent; }

        @media (max-width: 900px) {
          .rb-hero-grid { grid-template-columns: 1fr !important; }
          .rb-hide-mobile { display: none !important; }
        }
      `}</style>

      {/* 1) ── TOP BAR ─────────────────────────────────────────── */}
      <div className="rb-topbar" data-testid="rb-topbar">
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img src={OLL_LOGO_WHITE} alt="OLL" style={{ height: 26 }} />
          </a>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <a href="tel:+919820106645" className="rb-hide-mobile" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Phone size={14} /> +91 98201 06645
            </a>
            <a href="#demo" onClick={(e) => { e.preventDefault(); navigate('/school'); }} data-testid="rb-top-cta" className="rb-btn rb-btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>Book a Demo <ArrowRight size={14} /></a>
          </div>
        </div>
      </div>

      {/* 2) ── HERO ─────────────────────────────────────────── */}
      <section
        data-testid="rb-hero"
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #0A1F44 0%, #0A1F44 60%, #10193A 100%)',
          color: '#fff',
          paddingTop: '3.5rem',
          paddingBottom: '5rem',
          overflow: 'hidden',
        }}>
        {/* orbs */}
        <div className="rb-orb rb-orb-red"   style={{ width: 460, height: 460, top: -140, left: -120 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 520, height: 520, bottom: -180, right: -140 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, top: '35%', right: '30%' }} />
        {/* subtle grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '56px 56px', pointerEvents: 'none' }} />

        <div className="rb-hero-grid" style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '3rem', alignItems: 'center', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', padding: '0.4rem 0.9rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
              <Rocket size={14} style={{ color: '#FCA5A5' }} />
              <span style={{ color: '#FCA5A5', letterSpacing: '0.12em', textTransform: 'uppercase' }}>For Schools · Robotics Beginner</span>
            </div>
            <h1 className="rb-h1" style={{ fontSize: 'clamp(2.6rem, 6.2vw, 4.6rem)', lineHeight: 0.96, marginTop: '1.1rem', marginBottom: '1.1rem', fontWeight: 400 }}>
              Meet the 8-year-old<br />
              who built her <span className="rb-stroke" style={{ backgroundImage: 'linear-gradient(90deg, #FCA5A5, #60A5FA)' }}>first robot.</span>
            </h1>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', maxWidth: 560 }}>
              A complete first-year Robotics program for schools — pocket-friendly, easy to teach, and designed so
              <em className="rb-serif" style={{ color: '#FCA5A5', fontStyle: 'italic' }}> every child</em> walks out with a project in hand.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '2rem' }}>
              <a href="#demo" onClick={(e) => { e.preventDefault(); navigate('/school'); }} data-testid="rb-cta-primary" className="rb-btn rb-btn-primary">
                Book a Product Demo <ArrowRight size={18} />
              </a>
              <a href={CURRICULUM_PDF} download="OLL-Robotics-Beginner-Curriculum-2026-27.pdf" target="_blank" rel="noreferrer" data-testid="rb-cta-download" className="rb-btn rb-btn-ghost-white">
                <Download size={16} /> Download Curriculum
              </a>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              {[
                { k: '500+',   l: 'schools' },
                { k: '2 Lac+', l: 'young builders' },
                { k: '35',     l: 'cities' },
                { k: 'Gr. 1–4', l: 'first year' },
              ].map((s) => (
                <div key={s.l} style={{ minWidth: 82 }}>
                  <div className="rb-num" style={{ fontSize: '1.65rem', color: '#fff', fontWeight: 400 }}>{s.k}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div style={{ position: 'relative' }}>
            <div className="rb-glass" style={{ borderRadius: '1.75rem', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
              <img src={ROBOTICS_GIF} alt="OLL Robotics classroom" style={{ width: '100%', borderRadius: '1.25rem', display: 'block' }} />
              <div style={{ position: 'absolute', top: 22, left: 22, background: 'rgba(220,38,38,0.9)', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Live in classrooms
              </div>
            </div>
            <div className="rb-hand" style={{ position: 'absolute', bottom: -18, right: -6, color: '#FCA5A5', fontSize: '1.6rem', transform: 'rotate(-6deg)' }}>
              real kids · real builds
            </div>
          </div>
        </div>
      </section>

      {/* 3) ── ABOUT OLL IMPACT ──────────────────────────── */}
      <section data-testid="rb-about-oll" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#FFFFFF', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 340, height: 340, top: -100, right: -80, opacity: 0.18 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 300, height: 300, bottom: -80, left: -60, opacity: 0.22 }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', textAlign: 'center', zIndex: 1 }}>
          <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>about OLL</div>
          <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.2rem)', lineHeight: 1.05, color: '#0A1F44', maxWidth: 900, margin: '0.35rem auto 0.75rem' }}>
            India&apos;s <span className="rb-stroke">largest young-builder</span> movement.
          </h2>
          <p className="rb-serif" style={{ fontSize: '1.05rem', maxWidth: 720, margin: '0 auto', color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>
            We work with schools, principals and teachers to turn every classroom into a launchpad for creators, coders and changemakers.
          </p>

          {/* Impact pill card — light, clean, icons + numbers (per brand reference) */}
          <div style={{ marginTop: '3rem', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '1.5rem', padding: '2rem 1.5rem', boxShadow: '0 20px 60px rgba(15,30,80,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {IMPACT.map((it, i) => (
              <div key={it.l} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', borderLeft: i === 0 ? 'none' : '1px solid #E5E7EB' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${it.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <it.icon size={30} strokeWidth={2} style={{ color: it.color }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div className="rb-num" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.4rem)', lineHeight: 1, color: '#0A1F44', fontWeight: 400 }}>{it.k}</div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#64748B', fontWeight: 600, letterSpacing: '0.02em' }}>{it.l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4) ── AS SEEN ON ─────────────────────────────── */}
      <section data-testid="rb-as-seen-on" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)', color: '#fff', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 420, height: 420, top: -140, left: '15%' }} />
        <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, bottom: -140, right: '10%' }} />

        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', textAlign: 'center', zIndex: 1 }}>
          <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>as seen on</div>
          <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.2rem)', lineHeight: 1.05, color: '#fff' }}>
            Featured on <span style={{ color: '#FCA5A5' }}>national television.</span>
          </h2>
          <p className="rb-serif" style={{ fontSize: '1.02rem', maxWidth: 640, margin: '0.75rem auto 0', color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
            Trusted by India&apos;s biggest stages — because the outcomes speak for themselves.
          </p>

          <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            <div data-testid="rb-media-kbc" style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 280, border: '1px solid rgba(255,255,255,0.15)' }}>
              <img src={KBC_IMG} alt="Kaun Banega Crorepati" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.92) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 20, left: 22, right: 22, textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: '#FCA5A5', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sony · KBC</div>
                <div className="rb-h3" style={{ fontSize: '1.4rem', fontWeight: 400, marginTop: 4 }}>Kaun Banega Crorepati</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Featured as India&apos;s leading EdTech for kids</div>
              </div>
            </div>

            <div data-testid="rb-media-shark-tank" style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 280, border: '1px solid rgba(255,255,255,0.15)' }}>
              <img src={SHARK_TANK_IMG} alt="Shark Tank India" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.92) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 20, left: 22, right: 22, textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sony LIV · Season Finale</div>
                <div className="rb-h3" style={{ fontSize: '1.4rem', fontWeight: 400, marginTop: 4 }}>Shark Tank India</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Pitched to India&apos;s top investors on national TV</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
            {['NDTV', 'Times of India', 'Business Standard', 'YourStory', 'Economic Times', 'The Hindu'].map(p => (<span key={p}>{p}</span>))}
          </div>
        </div>
      </section>

      {/* 5) ── OUTCOMES ─────────────────────────────── */}
      <section data-testid="rb-outcomes" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#F8FAFC', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-blue"  style={{ width: 380, height: 380, top: -140, right: -100, opacity: 0.22 }} />

        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#1E3A8A', fontSize: '1.5rem' }}>why schools choose us</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Built to make Robotics <span className="rb-stroke">work in every school.</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {OUTCOMES.map((o) => (
              <div key={o.t} style={{ background: '#fff', borderRadius: '1.2rem', padding: '1.75rem 1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 6px 24px rgba(15,30,80,0.05)' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #DC2626, #1E3A8A)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <o.icon size={24} />
                </div>
                <h3 className="rb-h3" style={{ fontWeight: 400, fontSize: '1.2rem', color: '#0A1F44', marginBottom: '0.55rem', lineHeight: 1.1 }}>{o.t}</h3>
                <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.55 }}>{o.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6) ── IMPLEMENTATION SLIDER ────────────────── */}
      <section data-testid="rb-implementations" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#FFFFFF', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 360, height: 360, top: -120, left: -60, opacity: 0.28 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, bottom: -160, right: -80, opacity: 0.3 }} />

        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>real classrooms, real outcomes</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Implementation in schools.
            </h2>
            <p className="rb-serif" style={{ fontSize: '1rem', maxWidth: 640, margin: '0.75rem auto 0', color: '#475569', fontStyle: 'italic' }}>
              A glimpse into how OLL Robotics is running today — in classrooms across India.
            </p>
          </div>

          <div ref={sliderRef} style={{ position: 'relative' }}>
            <div className="rb-slide rb-hero-grid" key={slideIdx} style={{ background: '#0A1F44', color: '#fff', borderRadius: '1.5rem', overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)', minHeight: 340, boxShadow: '0 30px 80px rgba(10,31,68,0.2)' }}>
              {/* Left panel: logo + school */}
              <div style={{ position: 'relative', background: `linear-gradient(135deg, ${current.color}, #0A1F44 130%)`, padding: '2.25rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 320 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>School #{slideIdx + 1} of {IMPLEMENTATIONS.length}</div>
                  <div style={{ marginTop: '1.25rem', width: 88, height: 88, borderRadius: 20, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="rb-h3" style={{ fontWeight: 400, fontSize: '1.5rem', color: '#fff' }}>{current.logoText}</span>
                  </div>
                  <h3 className="rb-h3" style={{ fontWeight: 400, fontSize: '1.7rem', lineHeight: 1.1, marginTop: '1.1rem' }}>{current.school}</h3>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                    <MapPin size={14} /> {current.city}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.18)' }}>
                  <div>
                    <div className="rb-num" style={{ fontSize: '1.9rem', fontWeight: 400, color: '#fff' }}>{current.students}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>students</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>{current.principal}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}><GraduationCap size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />Principal</div>
                  </div>
                </div>
              </div>

              {/* Right: quote + video */}
              <div style={{ padding: '2.25rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <Quote size={32} style={{ color: '#DC2626', opacity: 0.4 }} />
                  <p className="rb-serif" style={{ fontSize: '1.15rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.92)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    &ldquo;{current.feedback}&rdquo;
                  </p>
                </div>
                <a href={current.video} onClick={(e) => { if (current.video === '#') { e.preventDefault(); toast.info('Video coming soon.'); } }} data-testid="rb-impl-video" style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', color: '#60A5FA', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
                  <PlayCircle size={22} /> Watch the classroom in action
                </a>
              </div>
            </div>

            {/* Slider controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {IMPLEMENTATIONS.map((_, i) => (
                  <button key={i} onClick={() => goTo(i)} data-testid={`rb-impl-dot-${i}`} aria-label={`Go to slide ${i + 1}`}
                    style={{ width: i === slideIdx ? 26 : 10, height: 10, borderRadius: 999, border: 'none', cursor: 'pointer', background: i === slideIdx ? '#DC2626' : '#CBD5E1', transition: 'width .3s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => goTo(slideIdx - 1)} data-testid="rb-impl-prev" aria-label="Previous school" style={{ width: 44, height: 44, borderRadius: 999, border: '1.5px solid #0A1F44', background: '#fff', color: '#0A1F44', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => goTo(slideIdx + 1)} data-testid="rb-impl-next" aria-label="Next school" style={{ width: 44, height: 44, borderRadius: 999, border: 'none', background: '#0A1F44', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7) ── SCHOOLS THAT WORK WITH US ───────────── */}
      <section data-testid="rb-partner-schools" style={{ padding: '4rem 1.25rem', background: '#F1F5F9', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="rb-hand" style={{ color: '#1E3A8A', fontSize: '1.4rem' }}>schools that work with us</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', color: '#0A1F44', lineHeight: 1.05 }}>500+ partner schools & counting.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {PARTNER_SCHOOLS.map((name) => (
              <div key={name} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 78, textAlign: 'center' }}>
                <span className="rb-h4" style={{ fontWeight: 400, fontSize: '0.85rem', color: '#475569', lineHeight: 1.15 }}>{name}</span>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#64748B', fontStyle: 'italic' }} className="rb-serif">
            + hundreds more across CBSE, ICSE, IB and State boards.
          </p>
        </div>
      </section>

      {/* 8) ── DOWNLOAD CURRICULUM ─────────────────── */}
      <section data-testid="rb-curriculum" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#FFFFFF', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 400, height: 400, top: -140, right: '10%', opacity: 0.28 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 380, height: 380, bottom: -160, left: '10%', opacity: 0.28 }} />

        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', textAlign: 'center', zIndex: 1 }}>
          <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>the entire program, in one PDF</div>
          <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.2rem)', lineHeight: 1.05, color: '#0A1F44' }}>
            Download the <span className="rb-stroke">Beginner Curriculum.</span>
          </h2>
          <p className="rb-serif" style={{ fontSize: '1.05rem', maxWidth: 640, margin: '0.75rem auto 0', color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>
            Every project, kit component, teacher plan and rubric — mapped week-by-week for the entire academic year.
          </p>
          <a href={CURRICULUM_PDF} download="OLL-Robotics-Beginner-Curriculum-2026-27.pdf" target="_blank" rel="noreferrer" data-testid="rb-curriculum-download" className="rb-btn rb-btn-primary" style={{ marginTop: '2rem', padding: '1.1rem 2.2rem', fontSize: '1.05rem' }}>
            <Download size={20} /> Download Curriculum PDF
          </a>
          <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#94A3B8' }}>PDF · 4.6 MB · Free · Updated 2026-27</div>
        </div>
      </section>

      {/* 9) ── DEMO FORM ───────────────────────────── */}
      <section id="demo" data-testid="rb-demo-form" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)', color: '#fff', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 460, height: 460, top: -160, left: -100 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 420, height: 420, bottom: -160, right: -80 }} />

        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>free · no commitment</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#fff' }}>
              Book a demo with an <span style={{ color: '#FCA5A5' }}>OLL expert.</span>
            </h2>
            <p className="rb-serif" style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.75rem', fontStyle: 'italic' }}>
              30-min walkthrough of the kit, curriculum and outcomes — for your school.
            </p>
          </div>

          {done ? (
            <div data-testid="rb-done" style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid #10B981', borderRadius: '1.25rem', padding: '2.5rem', textAlign: 'center' }}>
              <CheckCircle2 size={44} style={{ color: '#10B981', margin: '0 auto 0.75rem' }} />
              <h3 className="rb-h3" style={{ fontSize: '1.6rem', fontWeight: 400, marginBottom: '0.5rem' }}>Request received</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)' }}>Our program expert will call you within 24 hours.</p>
              <button onClick={() => navigate('/')} className="rb-btn rb-btn-ghost-white" style={{ marginTop: '1.5rem' }}>Back to home</button>
            </div>
          ) : (
            <form onSubmit={submit} className="rb-glass" style={{ borderRadius: '1.25rem', padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.9rem' }}>
                <Field icon={Building2} placeholder="School name *"      value={form.school_name}   onChange={(v) => setForm({ ...form, school_name: v })}   testid="rb-school" />
                <Field icon={Users}     placeholder="Your name *"        value={form.contact_name}  onChange={(v) => setForm({ ...form, contact_name: v })}  testid="rb-name" />
                <Field icon={Phone}     placeholder="Phone (WhatsApp) *" value={form.phone}         onChange={(v) => setForm({ ...form, phone: v })}         testid="rb-phone" type="tel" />
                <Field icon={Mail}      placeholder="Email"              value={form.email}         onChange={(v) => setForm({ ...form, email: v })}         testid="rb-email" type="email" />
                <Field icon={MapPin}    placeholder="City"               value={form.city}          onChange={(v) => setForm({ ...form, city: v })}          testid="rb-city" />
                <Field icon={Users}     placeholder="No. of students"    value={form.student_count} onChange={(v) => setForm({ ...form, student_count: v })} testid="rb-count" type="number" />
              </div>
              <textarea
                placeholder="Anything specific you would like the expert to cover?"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                data-testid="rb-notes"
                style={{ width: '100%', marginTop: '0.9rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '0.75rem', padding: '0.8rem 0.9rem', color: '#fff', fontFamily: 'inherit', resize: 'vertical', fontSize: '0.95rem' }}
              />
              <button type="submit" disabled={submitting} data-testid="rb-submit" className="rb-btn rb-btn-primary"
                style={{ marginTop: '1.1rem', width: '100%', padding: '1.05rem', fontSize: '1.05rem', justifyContent: 'center' }}>
                {submitting ? <><Loader2 size={18} className="animate-spin" /> Requesting…</> : <>Book my Demo <ArrowRight size={18} /></>}
              </button>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: '0.9rem' }}>
                We respect your privacy. Your details go directly to our schools team.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Marquee ticker of partner schools */}
      <section style={{ background: '#0A1F44', color: 'rgba(255,255,255,0.5)', padding: '1.4rem 0', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.08)' }} data-testid="rb-ticker">
        <div className="rb-marquee">
          {[...PARTNER_SCHOOLS, ...PARTNER_SCHOOLS].map((n, i) => (
            <span key={i} className="rb-h4" style={{ fontWeight: 400, fontSize: '0.95rem', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>{n}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ icon: Icon, placeholder, value, onChange, testid, type = 'text' }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)' }} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        style={{
          width: '100%', paddingLeft: '2.6rem', paddingRight: '0.9rem', paddingTop: '0.8rem', paddingBottom: '0.8rem',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: '0.75rem', color: '#fff', fontFamily: 'inherit', fontSize: '0.95rem',
        }}
      />
    </div>
  );
}
