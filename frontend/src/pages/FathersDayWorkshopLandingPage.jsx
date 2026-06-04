/**
 * Father's Day Robotics Workshop — friendly illustrated landing.
 * Theme: warm yellow + sky blue · cartoon vectors · Fredoka font.
 * Sunday 21 June 2026, 3-6 PM · ₹1999 · Kandivali / Mira Road.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import {
  Calendar, Clock, MapPin, Heart, Shield, Sparkles, ArrowRight, ArrowLeft,
  Camera, Cpu, Zap, Wrench, X, Loader2, Phone,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { openCashfreeCheckout } from '../utils/cashfreeCheckout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WORKSHOP_KEY = 'fathers-day-robotics';

// Palette
const YELLOW = '#FCE899';      // warm yellow background
const YELLOW_DEEP = '#F9D162';
const SKY = '#A8DCF0';         // light sky blue
const SKY_DEEP = '#7FC4E5';
const NAVY = '#1E40AF';        // deep blue
const NAVY_DEEP = '#1E3A8A';
const SUN = '#FFB627';         // warm sun yellow
const CORAL = '#FF7B6B';

const AGE_GROUPS = [
  {
    slug: '4-8',
    label: 'Ages 4 – 8',
    tagline: 'Tiny hands. Big imagination.',
    color: '#FFB627',
    emoji: '🌟',
    builds: [
      "Miner's Head Lamp 💡",
      '3D-Pen Name Tags ✏️',
      'Motorised Windmill 🌀',
    ],
    learns: ['Engineering basics', 'Electricity 101', 'How a motor works'],
  },
  {
    slug: '9-12',
    label: 'Ages 9 – 12',
    tagline: 'Build a real working robot.',
    color: '#1E40AF',
    emoji: '🤖',
    builds: [
      'Edge-Avoiding Robot 🚗',
      'Hand-Following Robot 🤖',
      'Black Line Follower 🛤️',
    ],
    learns: ['Build a robotic car chassis', 'Add sensors', 'Wire motors', 'Power up & test'],
  },
];

const CENTERS = [
  { slug: 'kandivali', label: 'OLL Center — Kandivali', area: 'West, Mumbai' },
  { slug: 'mira_road', label: 'OLL Center — Mira Road', area: 'Mira Bhayandar' },
];

const TAKEAWAYS = [
  { icon: Camera,   title: 'Take-home Photoframe', sub: 'A printed memento of you & your child at the workshop' },
  { icon: Heart,    title: 'Lifelong Memories',     sub: 'Bonding over building something real, together' },
  { icon: Sparkles, title: 'Hands-on Learning',     sub: 'STEM concepts they\'ll remember for years' },
];

// Animated decorative cloud
const Cloud = ({ style }) => (
  <svg viewBox="0 0 200 90" style={style} aria-hidden="true">
    <ellipse cx="50" cy="60" rx="40" ry="22" fill="#FFFFFF" opacity="0.85" />
    <ellipse cx="95" cy="48" rx="42" ry="28" fill="#FFFFFF" opacity="0.95" />
    <ellipse cx="140" cy="58" rx="36" ry="22" fill="#FFFFFF" opacity="0.85" />
  </svg>
);

// Sun illustration with rays
const Sun = ({ style }) => (
  <svg viewBox="0 0 120 120" style={style} aria-hidden="true">
    <circle cx="60" cy="60" r="26" fill={SUN} />
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * 45 * Math.PI) / 180;
      const x1 = 60 + Math.cos(angle) * 36;
      const y1 = 60 + Math.sin(angle) * 36;
      const x2 = 60 + Math.cos(angle) * 52;
      const y2 = 60 + Math.sin(angle) * 52;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={SUN} strokeWidth="4" strokeLinecap="round" />;
    })}
  </svg>
);

// Father-and-child SVG illustration (warm cartoon)
const HeroIllustration = () => (
  <svg viewBox="0 0 500 500" style={{ width: '100%', height: '100%' }} aria-label="Father carrying child on shoulders">
    {/* Decorative blob */}
    <ellipse cx="250" cy="430" rx="200" ry="22" fill="#000" opacity="0.08" />
    {/* Father body — yellow shirt */}
    <path d="M170 280 Q170 240 200 230 L300 230 Q330 240 330 280 L335 470 L165 470 Z" fill="#FCD34D" />
    {/* Yellow shirt highlight */}
    <path d="M180 280 L180 470 L200 470 L195 290 Z" fill="#FBBF24" opacity="0.5" />
    {/* Father shorts — blue */}
    <rect x="200" y="450" width="100" height="40" fill={NAVY} />
    {/* Father neck */}
    <rect x="225" y="200" width="50" height="40" fill="#F4C99A" />
    {/* Father head */}
    <ellipse cx="250" cy="180" rx="50" ry="55" fill="#F4C99A" />
    {/* Beard */}
    <path d="M210 195 Q210 230 250 235 Q290 230 290 195 Q280 210 250 215 Q220 210 210 195 Z" fill="#3B2817" />
    {/* Hair */}
    <path d="M205 145 Q220 115 250 115 Q280 115 295 145 Q300 130 285 120 Q270 105 250 105 Q230 105 215 120 Q200 130 205 145 Z" fill="#3B2817" />
    {/* Closed eye crescents */}
    <path d="M225 175 Q230 170 235 175" stroke="#3B2817" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M265 175 Q270 170 275 175" stroke="#3B2817" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* Smile */}
    <path d="M232 195 Q250 210 268 195" stroke="#3B2817" strokeWidth="2.5" fill="#FFFFFF" />
    <rect x="232" y="195" width="36" height="8" fill="#FFFFFF" opacity="0.4" />

    {/* Child sitting on shoulders — orange shirt */}
    <ellipse cx="250" cy="130" rx="40" ry="42" fill="#F4C99A" />
    {/* Hair */}
    <path d="M212 110 Q220 80 250 78 Q280 80 288 110 Q285 90 270 84 Q260 80 250 80 Q240 80 230 84 Q215 90 212 110 Z" fill="#3B2817" />
    <ellipse cx="220" cy="105" rx="6" ry="10" fill="#3B2817" />
    <ellipse cx="280" cy="105" rx="6" ry="10" fill="#3B2817" />
    {/* Child face */}
    <circle cx="237" cy="130" r="2.5" fill="#1F2937" />
    <circle cx="263" cy="130" r="2.5" fill="#1F2937" />
    <path d="M232 145 Q250 158 268 145" stroke="#1F2937" strokeWidth="2.5" fill="#FFFFFF" />
    <rect x="232" y="145" width="36" height="6" fill="#FFFFFF" opacity="0.4" />
    {/* Cheek blush */}
    <circle cx="222" cy="140" r="4" fill={CORAL} opacity="0.5" />
    <circle cx="278" cy="140" r="4" fill={CORAL} opacity="0.5" />
    {/* Child body — orange shirt */}
    <path d="M222 168 Q220 175 215 200 L220 240 L280 240 L285 200 Q280 175 278 168 Z" fill="#F97316" />
    {/* Child arms raised in joy */}
    <g className="float-arm-left">
      <path d="M225 175 Q200 130 175 100 Q170 95 175 90 Q182 87 188 95 Q215 130 232 175 Z" fill="#F97316" />
      <ellipse cx="178" cy="92" rx="9" ry="11" fill="#F4C99A" />
    </g>
    <g className="float-arm-right">
      <path d="M278 175 Q302 130 325 100 Q330 95 325 90 Q318 87 312 95 Q288 130 273 175 Z" fill="#F97316" />
      <ellipse cx="322" cy="92" rx="9" ry="11" fill="#F4C99A" />
    </g>
    {/* Tiny robot bot the dad holds */}
    <g className="robot-bob">
      <rect x="320" y="320" width="55" height="55" rx="8" fill={SKY_DEEP} stroke={NAVY} strokeWidth="3" />
      <circle cx="335" cy="340" r="5" fill="#FFF" />
      <circle cx="360" cy="340" r="5" fill="#FFF" />
      <rect x="335" y="355" width="25" height="6" rx="3" fill="#FFF" />
      <line x1="347" y1="310" x2="347" y2="320" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
      <circle cx="347" cy="307" r="4" fill={SUN} />
    </g>
    {/* Sparkles around the child's hands */}
    <g className="sparkle-twinkle">
      <path d="M150 80 L155 90 L165 92 L155 95 L150 105 L145 95 L135 92 L145 90 Z" fill={SUN} />
      <path d="M340 75 L344 83 L352 85 L344 87 L340 95 L336 87 L328 85 L336 83 Z" fill={SUN} />
      <circle cx="380" cy="120" r="3" fill={CORAL} />
      <circle cx="115" cy="140" r="3" fill={CORAL} />
    </g>
  </svg>
);

export default function FathersDayWorkshopLandingPage() {
  const navigate = useNavigate();
  const [showEnroll, setShowEnroll] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ age_group: '', center: '', parent_phone: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Listen for the Navbar CTA "Enroll Now" event
  useEffect(() => {
    const open = () => { setStep(0); setForm({ age_group: '', center: '', parent_phone: '' }); setShowEnroll(true); };
    window.addEventListener('open-workshop-enroll', open);
    return () => window.removeEventListener('open-workshop-enroll', open);
  }, []);

  const openEnroll = () => { setStep(0); setForm({ age_group: '', center: '', parent_phone: '' }); setShowEnroll(true); };
  const close = () => setShowEnroll(false);

  const handlePay = async () => {
    const phone = form.parent_phone.replace(/\D/g, '');
    if (phone.length < 10) return toast.error('Enter a valid 10-digit phone');
    setSubmitting(true);
    try {
      const reg = await axios.post(`${API}/workshops/register`, {
        workshop_key: WORKSHOP_KEY,
        parent_phone: phone,
        age_group: form.age_group,
        center: form.center,
      });
      const bookingId = reg.data?.booking_id;
      if (!bookingId) throw new Error('Could not create booking');
      const pay = await axios.post(`${API}/workshops/initiate-payment`, {
        booking_id: bookingId,
        frontend_url: window.location.origin,
      });
      const sessionId = pay.data?.payment_session_id;
      if (!sessionId) throw new Error('Could not initiate payment');
      toast.success('Opening secure payment…');
      await openCashfreeCheckout({ paymentSessionId: sessionId, mode: 'production', redirectTarget: '_self' });
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Booking failed — please retry');
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="fathers-day-landing" style={{ minHeight: '100vh', fontFamily: '"Fredoka", "Nunito", sans-serif', background: YELLOW }}>
      <Helmet>
        <title>Father's Day Robotics Workshop — Sunday 21 June | OLL</title>
        <meta name="description" content="3-hour screen-free father-child robotics workshop on Sunday 21 June 2026, 3-6 PM. Build a robot together. Kandivali & Mira Road." />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Pacifico&display=swap" rel="stylesheet" />
      </Helmet>

      <Navbar variant="workshop" />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(180deg, ${YELLOW} 0%, ${YELLOW} 55%, ${SKY} 100%)`, paddingBottom: '4rem' }}>
        {/* Animated decorative SVGs */}
        <Cloud style={{ position: 'absolute', top: '6%',  left: '4%',  width: 110, animation: 'drift 18s ease-in-out infinite', opacity: 0.85 }} />
        <Cloud style={{ position: 'absolute', top: '15%', right: '6%', width: 90,  animation: 'drift 22s ease-in-out infinite reverse', opacity: 0.8 }} />
        <Cloud style={{ position: 'absolute', top: '38%', left: '12%', width: 70,  animation: 'drift 24s ease-in-out infinite 2s', opacity: 0.6 }} />
        <Sun   style={{ position: 'absolute', top: '8%',  right: '14%',width: 76,  animation: 'spinSun 28s linear infinite' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16 relative">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
            {/* Left — copy */}
            <div className="text-center lg:text-left">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', background: '#FFFFFF', border: `2px solid ${NAVY}`, borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: NAVY }}>
                <Heart className="w-3.5 h-3.5" style={{ color: CORAL }} /> Father's Day · 1-Day Event
              </span>
              <h1 className="mt-5 leading-[1.05]" style={{ color: NAVY, fontFamily: '"Fredoka", sans-serif', fontWeight: 700, fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)' }}>
                Happy<br />
                <span style={{ display: 'inline-block', position: 'relative' }}>
                  Father&apos;s Day
                  <span style={{ display: 'inline-block', position: 'absolute', bottom: '-6px', left: 0, right: 0, height: 6, background: SUN, borderRadius: 999, opacity: 0.6 }} />
                </span>
                <br />
                <span style={{ fontFamily: '"Pacifico", cursive', color: CORAL, fontSize: '0.66em', fontWeight: 400 }}>build a robot, together</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed" style={{ color: '#1F2937' }}>
                3 hours of zero screens, full smiles. Bond with your child while you build a real robot — and walk home with a photoframe to remember it.
              </p>
              <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-2.5">
                <Pill icon={Calendar} text="Sunday, 21 June" />
                <Pill icon={Clock}    text="3 – 6 PM" />
                <Pill icon={MapPin}   text="Kandivali / Mira Road" />
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={openEnroll}
                  data-testid="hero-enroll-btn"
                  className="px-8 py-4 rounded-full text-base font-bold inline-flex items-center gap-2 shadow-xl hover:scale-[1.03] transition-transform"
                  style={{ background: NAVY, color: '#fff', fontFamily: '"Fredoka", sans-serif' }}
                >
                  Enroll Now <ArrowRight className="w-5 h-5" />
                </button>
                <div className="text-sm font-semibold" style={{ color: NAVY }}>
                  Limited seats per center
                </div>
              </div>
            </div>

            {/* Right — illustration */}
            <div className="relative">
              <div style={{ aspectRatio: '1 / 1', maxWidth: 520, margin: '0 auto', position: 'relative' }}>
                <HeroIllustration />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USP STRIP ───────────────────────────────────── */}
      <section style={{ background: SKY }} className="-mt-8 pt-12 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <FeatureCard color={CORAL}    icon={Heart}  title="Bonding time, no screens" sub="3 hours of fully present, hands-on time — building something real together." />
            <FeatureCard color={NAVY}     icon={Shield} title="100% screen-free zone"    sub="No phones, tablets or laptops. Just kits, smiles, and creativity." />
          </div>
        </div>
      </section>

      {/* ── WHAT WILL YOU BUILD ─────────────────────────── */}
      <section style={{ background: SKY }} className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>The Build</SectionLabel>
          <h2 className="font-bold mb-6" style={{ color: NAVY, fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>
            What will you build together?
          </h2>
          <div className="grid lg:grid-cols-2 gap-5">
            {AGE_GROUPS.map(g => (
              <div key={g.slug} className="rounded-3xl p-6 sm:p-8 shadow-lg" style={{ background: '#FFFEF7', border: `3px solid ${g.color}` }} data-testid={`age-card-${g.slug}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs uppercase tracking-widest font-bold" style={{ color: g.color, fontFamily: '"Fredoka", sans-serif' }}>{g.label}</div>
                    <div className="text-xl font-bold mt-1" style={{ color: NAVY }}>{g.tagline}</div>
                  </div>
                  <div className="text-4xl">{g.emoji}</div>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>You&apos;ll Build</div>
                  <ul className="space-y-2">
                    {g.builds.map(b => (
                      <li key={b} className="flex items-center gap-3 text-base font-semibold" style={{ color: NAVY }}>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 pt-4 border-t" style={{ borderColor: `${g.color}30` }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>You&apos;ll Learn</div>
                  <div className="flex flex-wrap gap-2">
                    {g.learns.map(l => (
                      <span key={l} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `${g.color}18`, color: g.color, border: `1.5px solid ${g.color}50` }}>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setForm(prev => ({ ...prev, age_group: g.slug })); setStep(1); setShowEnroll(true); }}
                  className="mt-5 w-full font-bold py-3.5 rounded-full inline-flex items-center justify-center gap-2 text-sm transition-transform hover:scale-[1.02]"
                  style={{ background: NAVY, color: '#fff', fontFamily: '"Fredoka", sans-serif' }}
                  data-testid={`enroll-from-age-${g.slug}`}
                >
                  Enroll {g.label} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT WILL YOUR CHILD LEARN ─────────────────── */}
      <section style={{ background: NAVY, color: '#fff' }} className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel light>The Learning</SectionLabel>
          <h2 className="font-bold mb-3" style={{ fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>
            What will your child learn?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)' }} className="max-w-2xl mb-10">Hands-on STEM concepts they&apos;ll carry into school, projects, and life — taught through actual building, not slides.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap,      title: 'Electricity & Circuits', sub: 'How current, batteries, and switches actually work' },
              { icon: Cpu,      title: 'Motors & Movement',      sub: 'Turning electricity into motion — the heart of robotics' },
              { icon: Wrench,   title: 'Engineering Mindset',    sub: 'Plan it · Build it · Test it · Fix it · Improve it' },
              { icon: Sparkles, title: 'Sensor Logic',           sub: 'How robots "see" obstacles and follow paths' },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="rounded-2xl p-5 transition-colors" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Icon className="w-7 h-7 mb-3" style={{ color: SUN }} />
                <div className="font-bold text-base">{title}</div>
                <div className="text-sm mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT WILL YOU GET ─────────────────────────── */}
      <section style={{ background: YELLOW }} className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>The Take-home</SectionLabel>
          <h2 className="font-bold mb-3" style={{ color: NAVY, fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>What will you get?</h2>
          <p style={{ color: '#475569' }} className="max-w-2xl mb-10">Walk out with more than just a robot.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {TAKEAWAYS.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="rounded-2xl p-6 shadow-md" style={{ background: '#FFFEF7', border: `2px solid ${SKY_DEEP}` }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: SKY, color: NAVY }}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-lg font-bold" style={{ color: NAVY }}>{title}</div>
                <div className="text-sm mt-2 leading-relaxed" style={{ color: '#475569' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ─────────────────────────────────── */}
      <section style={{ background: YELLOW }} className="pb-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${SKY_DEEP} 100%)` }}>
            <Sun style={{ position: 'absolute', top: -30, right: -30, width: 120, opacity: 0.35 }} />
            <h3 className="font-bold mb-3" style={{ fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}>
              Make this Father&apos;s Day unforgettable
            </h3>
            <p className="max-w-xl mx-auto mb-6" style={{ color: 'rgba(255,255,255,0.9)' }}>3 hours · No screens · A bot, a frame, and memories you&apos;ll keep on the shelf for years.</p>
            <button
              onClick={openEnroll}
              className="px-9 py-4 rounded-full font-bold text-base inline-flex items-center gap-2 shadow-xl hover:scale-[1.03] transition-transform"
              style={{ background: SUN, color: NAVY, fontFamily: '"Fredoka", sans-serif' }}
              data-testid="footer-enroll-btn"
            >
              Enroll Now · ₹1,999 <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {showEnroll && (
        <EnrollModal step={step} setStep={setStep} form={form} setForm={setForm} submitting={submitting} onPay={handlePay} onClose={close} />
      )}

      {/* Animations */}
      <style>{`
        @keyframes drift { 0%, 100% { transform: translateX(0) translateY(0); } 50% { transform: translateX(28px) translateY(-12px); } }
        @keyframes spinSun { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @keyframes bobArmL  { 0%, 100% { transform: rotate(-6deg); transform-origin: 225px 175px; } 50% { transform: rotate(2deg); } }
        @keyframes bobArmR  { 0%, 100% { transform: rotate(6deg);  transform-origin: 278px 175px; } 50% { transform: rotate(-2deg); } }
        @keyframes botBob   { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes twinkle  { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
        .float-arm-left  { animation: bobArmL 3.2s ease-in-out infinite; }
        .float-arm-right { animation: bobArmR 3.4s ease-in-out infinite; }
        .robot-bob       { animation: botBob 2.8s ease-in-out infinite; }
        .sparkle-twinkle { animation: twinkle 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

const Pill = ({ icon: Icon, text }) => (
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm" style={{ background: '#FFFFFF', color: NAVY, border: `2px solid ${NAVY}20` }}>
    <Icon className="w-4 h-4" /> {text}
  </div>
);

const SectionLabel = ({ children, light }) => (
  <div className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: light ? SUN : CORAL, fontFamily: '"Fredoka", sans-serif' }}>
    {children}
  </div>
);

const FeatureCard = ({ color, icon: Icon, title, sub }) => (
  <div className="rounded-3xl p-6 shadow-lg" style={{ background: '#FFFEF7', border: `2px solid ${color}40` }}>
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${color}18`, color }}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="text-lg font-bold" style={{ color: NAVY, fontFamily: '"Fredoka", sans-serif' }}>{title}</div>
    <div className="text-sm mt-1.5 leading-relaxed" style={{ color: '#475569' }}>{sub}</div>
  </div>
);

function EnrollModal({ step, setStep, form, setForm, submitting, onPay, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" data-testid="enroll-modal">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto" style={{ background: '#FFFEF7', fontFamily: '"Fredoka", sans-serif' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest font-bold" style={{ color: CORAL }}>Step {step + 1} of 3</div>
          <button onClick={onClose} style={{ color: '#94A3B8' }} data-testid="enroll-close"><X className="w-5 h-5" /></button>
        </div>
        <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: `${SKY}` }}>
          <div className="h-full transition-all duration-300" style={{ width: `${((step + 1) / 3) * 100}%`, background: `linear-gradient(90deg, ${NAVY}, ${SUN})` }} />
        </div>

        {step === 0 && (
          <div>
            <h3 className="text-xl font-bold" style={{ color: NAVY }}>How old is your child?</h3>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>We split the projects by age so it&apos;s just right.</p>
            <div className="mt-5 space-y-3">
              {AGE_GROUPS.map(g => (
                <button
                  key={g.slug}
                  onClick={() => { setForm(p => ({ ...p, age_group: g.slug })); setStep(1); }}
                  className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01]"
                  style={{ border: `2.5px solid ${form.age_group === g.slug ? g.color : '#E2E8F0'}`, background: form.age_group === g.slug ? `${g.color}10` : '#FFFFFF' }}
                  data-testid={`modal-age-${g.slug}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{g.emoji}</div>
                    <div>
                      <div className="font-bold" style={{ color: NAVY }}>{g.label}</div>
                      <div className="text-sm mt-0.5" style={{ color: '#64748B' }}>{g.tagline}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <button onClick={() => setStep(0)} className="text-xs inline-flex items-center gap-1 mb-3" style={{ color: '#64748B' }}><ArrowLeft className="w-3 h-3" /> Back</button>
            <h3 className="text-xl font-bold" style={{ color: NAVY }}>Pick your center</h3>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>Two locations available for this workshop.</p>
            <div className="mt-5 space-y-3">
              {CENTERS.map(c => (
                <button
                  key={c.slug}
                  onClick={() => { setForm(p => ({ ...p, center: c.slug })); setStep(2); }}
                  className="w-full text-left rounded-2xl p-4 transition-all flex items-start gap-3 hover:scale-[1.01]"
                  style={{ border: `2.5px solid ${form.center === c.slug ? NAVY : '#E2E8F0'}`, background: form.center === c.slug ? `${NAVY}10` : '#FFFFFF' }}
                  data-testid={`modal-center-${c.slug}`}
                >
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: NAVY }} />
                  <div>
                    <div className="font-bold" style={{ color: NAVY }}>{c.label}</div>
                    <div className="text-sm mt-0.5" style={{ color: '#64748B' }}>{c.area}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="text-xs inline-flex items-center gap-1 mb-3" style={{ color: '#64748B' }}><ArrowLeft className="w-3 h-3" /> Back</button>
            <h3 className="text-xl font-bold" style={{ color: NAVY }}>Confirm &amp; pay</h3>
            <div className="mt-4 rounded-2xl p-4 text-sm" style={{ background: YELLOW, border: `2px solid ${YELLOW_DEEP}` }}>
              <Row k="Age group" v={AGE_GROUPS.find(g => g.slug === form.age_group)?.label} />
              <Row k="Center"    v={CENTERS.find(c => c.slug === form.center)?.label} />
              <Row k="Date"      v="Sunday, 21 June 2026 · 3 – 6 PM" />
              <div className="border-t mt-3 pt-3 flex justify-between text-base font-bold" style={{ borderColor: YELLOW_DEEP, color: NAVY }}>
                <span>Total</span><span>₹1,999</span>
              </div>
            </div>
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#475569' }}>Parent&apos;s Phone (WhatsApp) *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                <input
                  type="tel" inputMode="numeric" maxLength={15}
                  value={form.parent_phone}
                  onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))}
                  placeholder="98XXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-colors text-base"
                  style={{ border: `2.5px solid #E2E8F0`, background: '#fff' }}
                  onFocus={e => { e.currentTarget.style.borderColor = NAVY; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  data-testid="modal-phone-input"
                  autoFocus
                />
              </div>
            </div>
            <button
              onClick={onPay}
              disabled={submitting || form.parent_phone.replace(/\D/g, '').length < 10}
              className="mt-5 w-full font-bold py-4 rounded-full text-base inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-[1.02]"
              style={{ background: NAVY, color: '#fff' }}
              data-testid="modal-pay-btn"
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating booking…</> : <>Pay ₹1,999 Securely <ArrowRight className="w-5 h-5" /></>}
            </button>
            <p className="text-xs text-center mt-3 inline-flex items-center justify-center gap-1.5 w-full" style={{ color: '#94A3B8' }}>
              <Shield className="w-3 h-3" /> Secure Cashfree payment · UPI / Cards / Net Banking
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const Row = ({ k, v }) => (
  <div className="flex items-center justify-between py-1.5">
    <span style={{ color: '#64748B' }}>{k}</span>
    <span className="font-bold text-right" style={{ color: NAVY }}>{v || '—'}</span>
  </div>
);
