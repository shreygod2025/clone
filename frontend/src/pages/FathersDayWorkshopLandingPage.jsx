/**
 * Father's Day Robotics Workshop landing page.
 * Hero: superhero dad-child image · headline "This Father's Day, Bond over Learning"
 * + Photoframe carousel · How-the-day-runs · Pricing (+999 per extra child) · FAQ · Hand silhouette
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import {
  Calendar, Clock, MapPin, Heart, Shield, Sparkles, ArrowRight, ArrowLeft,
  Camera, Cpu, Zap, Wrench, X, Loader2, Phone, Plus, Minus, ChevronDown,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { openCashfreeCheckout } from '../utils/cashfreeCheckout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WORKSHOP_KEY = 'fathers-day-robotics';

const YELLOW = '#FCE899';
const YELLOW_DEEP = '#F9D162';
const SUN = '#FFB627';
const NAVY = '#1E40AF';
const NAVY_DEEP = '#0F2960';
const SKY = '#A8DCF0';
const CORAL = '#FF7B6B';

// Hero image — superhero dad with child on shoulders
const HERO_SUPERHERO = 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/cf0u07ji_image.png';
// Hand silhouette with "BEST DAD" lettering
const HAND_VECTOR = 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/id8md3w8_image.png';
// Carousel — real workshop images (more to be added by client)
const CAROUSEL = [
  'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/b27p9fpm_IMG_20260525_105021.jpg',
];

const AGE_GROUPS = [
  { slug: '4-8',  label: 'Ages 4 – 8',  tagline: 'Tiny hands. Big imagination.', color: SUN,  emoji: '🌟',
    builds: ["Miner's Head Lamp 💡", '3D-Pen Name Tags ✏️', 'Motorised Windmill 🌀'],
    learns: ['Engineering basics', 'Electricity 101', 'How a motor works'] },
  { slug: '9-12', label: 'Ages 9 – 12', tagline: 'Build a real working robot.',   color: NAVY, emoji: '🤖',
    builds: ['Edge-Avoiding Robot 🚗', 'Hand-Following Robot 🤖', 'Black Line Follower 🛤️'],
    learns: ['Build a robot chassis', 'Add sensors', 'Wire motors', 'Power up & test'] },
];

const CENTERS = [
  { slug: 'kandivali', label: 'OLL Center — Kandivali', area: 'West, Mumbai' },
  { slug: 'mira_road', label: 'OLL Center — Mira Road', area: 'Mira Bhayandar' },
];

const DAY_RUNS = [
  { t: 'Welcome',  d: 'Meet your build-station and your teammate for the day' },
  { t: 'Intro to Parts', d: 'Discover the wires, motors, sensors & their roles' },
  { t: 'Assemble Together', d: 'Build the robot side-by-side — adults & kids' },
  { t: 'Wire it up', d: 'Learn what every part does as you connect them' },
  { t: 'Games',      d: 'Play with your robot, your child &amp; your team' },
  { t: 'Photo Time', d: 'Take a picture with your robot — yours to keep' },
];

const FAQS = [
  { q: 'Do I need any technical background?', a: 'No. The session is built for complete beginners, adults and kids alike. Your instructor guides every step.' },
  { q: 'What ages is this for?', a: 'Designed for children aged 8 to 12. Younger children (4–7) are welcome with more parent involvement.' },
  { q: 'Can I bring more than one child?', a: 'Yes! Add a second child for ₹999. Both kids get a build station with the parent guiding them.' },
  { q: 'Do we keep the robot?', a: 'The robot stays at OLL — but a printed photoframe of you and your child with the robot is yours to take home.' },
  { q: 'Is this online or in person?', a: 'In person at OLL Center, Kandivali or Mira Road. No kits shipped — everything is provided.' },
];

export default function FathersDayWorkshopLandingPage() {
  const navigate = useNavigate();
  const [showEnroll, setShowEnroll] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ age_group: '', center: '', parent_phone: '', additional_children: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Auto-rotate carousel every 4s
  useEffect(() => {
    if (CAROUSEL.length <= 1) return;
    const t = setInterval(() => setCarouselIdx(i => (i + 1) % CAROUSEL.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Navbar CTA opens modal
  useEffect(() => {
    const open = () => { setStep(0); setShowEnroll(true); };
    window.addEventListener('open-workshop-enroll', open);
    return () => window.removeEventListener('open-workshop-enroll', open);
  }, []);

  const openEnroll = () => { setStep(0); setForm({ age_group: '', center: '', parent_phone: '', additional_children: 0 }); setShowEnroll(true); };

  const handlePay = async () => {
    const phone = form.parent_phone.replace(/\D/g, '');
    if (phone.length < 10) return toast.error('Enter a valid 10-digit phone');
    setSubmitting(true);
    try {
      const reg = await axios.post(`${API}/workshops/register`, {
        workshop_key: WORKSHOP_KEY, parent_phone: phone,
        age_group: form.age_group, center: form.center,
        additional_children: Number(form.additional_children) || 0,
      });
      const bookingId = reg.data?.booking_id;
      if (!bookingId) throw new Error('Could not create booking');
      const pay = await axios.post(`${API}/workshops/initiate-payment`, {
        booking_id: bookingId, frontend_url: window.location.origin,
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

  const total = 1999 + (Number(form.additional_children) || 0) * 999;

  return (
    <div data-testid="fathers-day-landing" style={{ minHeight: '100vh', fontFamily: '"Fredoka", "Nunito", sans-serif', background: YELLOW }}>
      <Helmet>
        <title>This Father's Day, Bond Over Learning — OLL Robotics Workshop</title>
        <meta name="description" content="Father's Day Screen-Free Robotics Workshop · Sunday 21 June, 3-6 PM · Kandivali & Mira Road · ₹1,999 per duo." />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Caveat:wght@500;700&family=Bungee&display=swap" rel="stylesheet" />
      </Helmet>

      <Navbar variant="workshop" />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(180deg, ${YELLOW} 0%, ${YELLOW} 55%, ${SKY} 100%)`, paddingBottom: '4rem', position: 'relative', overflow: 'hidden' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-14 relative">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
            {/* Left — Superhero image ABOVE headline */}
            <div className="text-center lg:text-left">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }} className="lg:justify-start">
                <img
                  src={HERO_SUPERHERO}
                  alt="Superhero dad and child"
                  style={{ width: '100%', maxWidth: 360, height: 'auto', filter: 'drop-shadow(0 12px 30px rgba(30,64,175,0.35))' }}
                  data-testid="hero-superhero-img"
                />
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', background: '#FFFFFF', border: `2px solid ${NAVY}`, borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: NAVY }}>
                <Heart className="w-3.5 h-3.5" style={{ color: CORAL }} /> Father's Day · 1-Day Event
              </span>
              <h1 className="mt-4 leading-[1.06]" style={{ color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4.8vw, 3.6rem)' }}>
                This Father&apos;s Day,<br />
                <span style={{ display: 'inline-block', position: 'relative' }}>
                  Bond over Learning
                  <span style={{ display: 'inline-block', position: 'absolute', bottom: -6, left: 0, right: 0, height: 6, background: SUN, borderRadius: 999, opacity: 0.6 }} />
                </span>
              </h1>
              <p className="mt-5" style={{ fontFamily: '"Caveat", cursive', color: CORAL, fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 700, lineHeight: 1.2 }}>
                Father&apos;s Day Screen-Free Robotics Workshop
              </p>
              <p className="mt-3 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed" style={{ color: '#1F2937' }}>
                3 hours of zero screens, full smiles. Bond with your child while you build a real robot — and walk home with a photoframe to remember it.
              </p>
              <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-2.5">
                <Pill icon={Calendar} text="Sunday, 21 June" />
                <Pill icon={Clock}    text="3 – 6 PM" />
                <Pill icon={MapPin}   text="Kandivali / Mira Road" />
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button onClick={openEnroll} data-testid="hero-enroll-btn"
                  className="px-8 py-4 rounded-full text-base font-bold inline-flex items-center gap-2 shadow-xl hover:scale-[1.03] transition-transform"
                  style={{ background: NAVY, color: '#fff', fontFamily: '"Fredoka", sans-serif' }}>
                  Enroll Now <ArrowRight className="w-5 h-5" />
                </button>
                <div className="text-sm font-semibold" style={{ color: NAVY }}>Limited seats per center</div>
              </div>
            </div>

            {/* Right — Photoframe with carousel inside */}
            <div className="relative">
              <Photoframe imgSrc={CAROUSEL[carouselIdx]} />
              {CAROUSEL.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {CAROUSEL.map((_, i) => (
                    <button key={i} onClick={() => setCarouselIdx(i)}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{ background: i === carouselIdx ? NAVY : 'rgba(30,64,175,0.25)', width: i === carouselIdx ? 24 : 8 }}
                      data-testid={`carousel-dot-${i}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── USP STRIP ───────────────────────────────────── */}
      <section style={{ background: SKY }} className="-mt-8 pt-12 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 gap-4">
          <FeatureCard color={CORAL} icon={Heart}  title="Bonding time, no screens" sub="3 hours of fully present, hands-on time — building together." />
          <FeatureCard color={NAVY}  icon={Shield} title="100% screen-free zone"    sub="No phones, tablets or laptops. Just kits, smiles, and creativity." />
        </div>
      </section>

      {/* ── WHAT WILL YOU BUILD ─────────────────────────── */}
      <Section bg={SKY}>
        <SectionLabel>The Build</SectionLabel>
        <H2>What will you build together?</H2>
        <div className="grid lg:grid-cols-2 gap-5 mt-6">
          {AGE_GROUPS.map(g => (
            <div key={g.slug} className="rounded-3xl p-6 sm:p-8 shadow-lg" style={{ background: '#FFFEF7', border: `3px solid ${g.color}` }} data-testid={`age-card-${g.slug}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest font-bold" style={{ color: g.color }}>{g.label}</div>
                  <div className="text-xl font-bold mt-1" style={{ color: NAVY_DEEP }}>{g.tagline}</div>
                </div>
                <div className="text-4xl">{g.emoji}</div>
              </div>
              <div className="mt-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">You&apos;ll Build</div>
                <ul className="space-y-2">
                  {g.builds.map(b => (
                    <li key={b} className="flex items-center gap-3 text-base font-semibold" style={{ color: NAVY_DEEP }}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 pt-4 border-t" style={{ borderColor: `${g.color}30` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">You&apos;ll Learn</div>
                <div className="flex flex-wrap gap-2">
                  {g.learns.map(l => (
                    <span key={l} className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `${g.color}18`, color: g.color, border: `1.5px solid ${g.color}50` }}>{l}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => { setForm(p => ({ ...p, age_group: g.slug })); setStep(1); setShowEnroll(true); }}
                className="mt-5 w-full font-bold py-3.5 rounded-full inline-flex items-center justify-center gap-2 text-sm transition-transform hover:scale-[1.02]"
                style={{ background: NAVY, color: '#fff' }} data-testid={`enroll-from-age-${g.slug}`}>
                Enroll {g.label} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* ── HOW THE DAY RUNS ─────────────────────────── */}
      <section style={{ background: NAVY_DEEP, color: '#fff' }} className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel light>3-hour session</SectionLabel>
          <H2 light>How the day runs</H2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8" data-testid="how-the-day-runs">
            {DAY_RUNS.map((s, i) => (
              <div key={s.t} className="rounded-2xl p-5 relative" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full flex items-center justify-center font-black text-base shadow-lg" style={{ background: SUN, color: NAVY_DEEP }}>{i + 1}</div>
                <div className="font-bold text-lg" style={{ fontFamily: '"Fredoka", sans-serif' }}>{s.t}</div>
                <div className="text-sm mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }} dangerouslySetInnerHTML={{ __html: s.d }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT WILL CHILD LEARN ─────────────────────────── */}
      <section style={{ background: NAVY }} className="text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel light>The Learning</SectionLabel>
          <H2 light>What will your child learn?</H2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[{i:Zap,t:'Electricity & Circuits',s:'How current, batteries, and switches actually work'},
              {i:Cpu,t:'Motors & Movement',s:'Turning electricity into motion — the heart of robotics'},
              {i:Wrench,t:'Engineering Mindset',s:'Plan it · Build it · Test it · Fix it · Improve it'},
              {i:Sparkles,t:'Sensor Logic',s:'How robots "see" obstacles and follow paths'}].map(({i:Icon,t,s}) => (
              <div key={t} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Icon className="w-7 h-7 mb-3" style={{ color: SUN }} />
                <div className="font-bold text-base">{t}</div>
                <div className="text-sm mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ─────────────────────────── */}
      <Section bg={YELLOW}>
        <SectionLabel>The Take-home</SectionLabel>
        <H2>What will you get?</H2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { i: Camera, t: 'Take-home Photoframe', s: 'A printed memento of you & your child at the workshop' },
            { i: Heart,  t: 'Lifelong Memories',     s: 'Bonding over building something real, together' },
            { i: Sparkles, t: 'Hands-on Learning',   s: "STEM concepts they'll remember for years" },
          ].map(({ i: Icon, t, s }) => (
            <div key={t} className="rounded-2xl p-6 shadow-md" style={{ background: '#FFFEF7', border: `2px solid ${SKY}` }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: SKY, color: NAVY }}><Icon className="w-6 h-6" /></div>
              <div className="text-lg font-bold" style={{ color: NAVY_DEEP }}>{t}</div>
              <div className="text-sm mt-2 leading-relaxed text-slate-600">{s}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── PRICING ─────────────────────────── */}
      <section style={{ background: YELLOW }} className="pb-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <SectionLabel>Pricing</SectionLabel>
          <H2>One price. Everything included.</H2>
          <div className="mt-8 rounded-3xl p-8 sm:p-10 shadow-2xl text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }} data-testid="pricing-card">
            <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: SUN }}>Father-Child Pair</div>
            <div className="mt-2 font-black" style={{ fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(2.6rem, 6vw, 4rem)', lineHeight: 1 }}>₹1,999</div>
            <div className="text-base mt-1" style={{ color: 'rgba(255,255,255,0.78)' }}>per father-and-child duo</div>
            <p className="mt-5 max-w-md mx-auto text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>Includes everything: robot kit, materials, photoframe, refreshments — hardware yours to keep where applicable.</p>
            <div className="mt-5 inline-block rounded-full px-4 py-2 text-sm font-bold" style={{ background: 'rgba(252,232,153,0.18)', color: SUN, border: `1px solid ${SUN}55` }}>
              + ₹999 for each additional child
            </div>
            <button onClick={openEnroll} data-testid="pricing-cta-btn"
              className="mt-7 px-8 py-4 rounded-full font-bold text-base inline-flex items-center gap-2 shadow-xl hover:scale-[1.03] transition-transform"
              style={{ background: SUN, color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif' }}>
              Book your Father&apos;s Day session <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── DAD HAND SECTION (after pricing) ─────────────────────────── */}
      <section style={{ background: NAVY }} className="py-16 sm:py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
          <div className="flex justify-center">
            <img
              src={HAND_VECTOR}
              alt="Best Dad — handwritten lettering inside a hand silhouette"
              style={{ width: '100%', maxWidth: 360, height: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }}
              data-testid="hand-vector"
            />
          </div>
          <div className="text-white text-center lg:text-left">
            <p style={{ fontFamily: '"Caveat", cursive', fontSize: 'clamp(1.7rem, 3.5vw, 2.4rem)', color: SUN, lineHeight: 1.1, fontWeight: 700 }}>To the hand that held mine</p>
            <h3 className="mt-3 font-bold" style={{ fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>
              The same one that&apos;ll<br />build with me this Sunday.
            </h3>
            <p className="mt-4 text-base sm:text-lg" style={{ color: 'rgba(255,255,255,0.82)' }}>
              Spend three hours building, laughing, and learning together. Walk out with a robot, a photoframe, and the kind of memory that lives on a shelf for years.
            </p>
            <button onClick={openEnroll}
              className="mt-6 px-7 py-3.5 rounded-full font-bold text-base inline-flex items-center gap-2 shadow-xl hover:scale-[1.03] transition-transform"
              style={{ background: SUN, color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif' }}>
              Book the moment <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────── */}
      <Section bg={YELLOW}>
        <SectionLabel>FAQ</SectionLabel>
        <H2>Quick answers</H2>
        <div className="mt-6 max-w-3xl space-y-3" data-testid="faq-section">
          {FAQS.map((f, i) => (
            <div key={f.q} className="rounded-2xl overflow-hidden" style={{ background: '#FFFEF7', border: `2px solid ${SKY}` }}>
              <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-3 p-5 text-left" data-testid={`faq-q-${i}`}>
                <span className="font-bold text-base sm:text-lg" style={{ color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif' }}>{f.q}</span>
                <ChevronDown className="w-5 h-5 flex-shrink-0 transition-transform" style={{ color: NAVY, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-base leading-relaxed" style={{ color: '#475569' }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {showEnroll && (
        <EnrollModal step={step} setStep={setStep} form={form} setForm={setForm} total={total} submitting={submitting} onPay={handlePay} onClose={() => setShowEnroll(false)} />
      )}
    </div>
  );
}

const Photoframe = ({ imgSrc }) => (
  <div style={{ width: '100%', maxWidth: 460, margin: '0 auto', position: 'relative' }} data-testid="photoframe-carousel">
    <div style={{
      background: NAVY, borderRadius: 24, padding: '60px 28px 90px',
      boxShadow: '0 24px 60px rgba(15,30,80,0.35)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Yellow bunting at top */}
      <svg viewBox="0 0 400 60" style={{ position: 'absolute', top: 12, left: 0, right: 0, width: '100%' }} aria-hidden="true">
        <path d="M 0 5 Q 200 30 400 5" stroke={SUN} strokeWidth="1.5" fill="none" />
        {Array.from({ length: 9 }).map((_, i) => {
          const x = 30 + i * 42;
          return (
            <g key={i} transform={`translate(${x},${5 + Math.sin(i / 2) * 4})`}>
              <path d="M 0 0 L 18 0 L 9 22 Z" fill={SUN} stroke={YELLOW_DEEP} strokeWidth="0.6" />
              <circle cx="9" cy="11" r="2.5" fill={NAVY} />
            </g>
          );
        })}
      </svg>
      {/* White photo area */}
      <div style={{ background: '#fff', borderRadius: 8, aspectRatio: '4 / 5', overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
        <img src={imgSrc} alt="OLL workshop moment" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.6s ease' }} />
      </div>
      {/* "Happy Father's Day" branding bottom-left */}
      <div style={{ position: 'absolute', bottom: 14, left: 18, lineHeight: 1, transform: 'rotate(-2deg)' }}>
        <div style={{ fontFamily: '"Bungee", sans-serif', color: SUN, fontSize: '0.7rem', letterSpacing: '0.18em' }}>HAPPY</div>
        <div style={{ fontFamily: '"Caveat", cursive', color: SUN, fontSize: '2rem', fontWeight: 700, marginTop: -4 }}>Father&apos;s</div>
        <div style={{ fontFamily: '"Bungee", sans-serif', color: '#fff', fontSize: '0.7rem', letterSpacing: '0.18em', marginTop: 2 }}>DAY</div>
      </div>
      {/* Sparkles */}
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', bottom: 14, right: 14, width: 60, height: 60, opacity: 0.9 }} aria-hidden="true">
        <path d="M50 10 L54 42 L86 50 L54 58 L50 90 L46 58 L14 50 L46 42 Z" fill={SUN} />
      </svg>
    </div>
  </div>
);

const Pill = ({ icon: Icon, text }) => (
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm" style={{ background: '#FFFFFF', color: NAVY, border: `2px solid ${NAVY}20` }}>
    <Icon className="w-4 h-4" /> {text}
  </div>
);

const SectionLabel = ({ children, light }) => (
  <div className="text-xs uppercase tracking-widest font-bold" style={{ color: light ? SUN : CORAL }}>{children}</div>
);

const H2 = ({ children, light }) => (
  <h2 className="font-bold mt-2" style={{ color: light ? '#fff' : NAVY_DEEP, fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>{children}</h2>
);

const Section = ({ bg, children }) => (
  <section style={{ background: bg }} className="py-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
  </section>
);

const FeatureCard = ({ color, icon: Icon, title, sub }) => (
  <div className="rounded-3xl p-6 shadow-lg" style={{ background: '#FFFEF7', border: `2px solid ${color}40` }}>
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${color}18`, color }}><Icon className="w-6 h-6" /></div>
    <div className="text-lg font-bold" style={{ color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif' }}>{title}</div>
    <div className="text-sm mt-1.5 leading-relaxed text-slate-600">{sub}</div>
  </div>
);

function EnrollModal({ step, setStep, form, setForm, total, submitting, onPay, onClose }) {
  const setExtras = (n) => setForm(p => ({ ...p, additional_children: Math.max(0, Math.min(5, n)) }));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" data-testid="enroll-modal">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto" style={{ background: '#FFFEF7', fontFamily: '"Fredoka", sans-serif' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest font-bold" style={{ color: CORAL }}>Step {step + 1} of 3</div>
          <button onClick={onClose} className="text-slate-400" data-testid="enroll-close"><X className="w-5 h-5" /></button>
        </div>
        <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: SKY }}>
          <div className="h-full transition-all duration-300" style={{ width: `${((step + 1) / 3) * 100}%`, background: `linear-gradient(90deg, ${NAVY}, ${SUN})` }} />
        </div>

        {step === 0 && (
          <div>
            <h3 className="text-xl font-bold" style={{ color: NAVY_DEEP }}>How old is your child?</h3>
            <p className="text-sm mt-1 text-slate-500">We split projects by age so it&apos;s just right.</p>
            <div className="mt-5 space-y-3">
              {AGE_GROUPS.map(g => (
                <button key={g.slug} onClick={() => { setForm(p => ({ ...p, age_group: g.slug })); setStep(1); }}
                  className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01]"
                  style={{ border: `2.5px solid ${form.age_group === g.slug ? g.color : '#E2E8F0'}`, background: form.age_group === g.slug ? `${g.color}10` : '#fff' }}
                  data-testid={`modal-age-${g.slug}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{g.emoji}</div>
                    <div>
                      <div className="font-bold" style={{ color: NAVY_DEEP }}>{g.label}</div>
                      <div className="text-sm mt-0.5 text-slate-500">{g.tagline}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <button onClick={() => setStep(0)} className="text-xs inline-flex items-center gap-1 mb-3 text-slate-500"><ArrowLeft className="w-3 h-3" /> Back</button>
            <h3 className="text-xl font-bold" style={{ color: NAVY_DEEP }}>Pick your center</h3>
            <p className="text-sm mt-1 text-slate-500">Two locations available.</p>
            <div className="mt-5 space-y-3">
              {CENTERS.map(c => (
                <button key={c.slug} onClick={() => { setForm(p => ({ ...p, center: c.slug })); setStep(2); }}
                  className="w-full text-left rounded-2xl p-4 transition-all flex items-start gap-3 hover:scale-[1.01]"
                  style={{ border: `2.5px solid ${form.center === c.slug ? NAVY : '#E2E8F0'}`, background: form.center === c.slug ? `${NAVY}10` : '#fff' }}
                  data-testid={`modal-center-${c.slug}`}>
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: NAVY }} />
                  <div>
                    <div className="font-bold" style={{ color: NAVY_DEEP }}>{c.label}</div>
                    <div className="text-sm mt-0.5 text-slate-500">{c.area}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="text-xs inline-flex items-center gap-1 mb-3 text-slate-500"><ArrowLeft className="w-3 h-3" /> Back</button>
            <h3 className="text-xl font-bold" style={{ color: NAVY_DEEP }}>Confirm &amp; pay</h3>

            {/* Additional children selector */}
            <div className="mt-4 rounded-2xl p-4" style={{ background: YELLOW, border: `2px solid ${YELLOW_DEEP}` }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY_DEEP }}>Additional children</div>
                  <div className="text-xs text-slate-600 mt-0.5">₹999 per extra child</div>
                </div>
                <div className="inline-flex items-center gap-2">
                  <button onClick={() => setExtras((form.additional_children || 0) - 1)}
                    disabled={!form.additional_children} data-testid="extras-minus"
                    className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors"
                    style={{ background: '#fff', border: `2px solid ${NAVY}40`, color: NAVY }}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-lg w-6 text-center" style={{ color: NAVY_DEEP }} data-testid="extras-count">{form.additional_children || 0}</span>
                  <button onClick={() => setExtras((form.additional_children || 0) + 1)}
                    disabled={(form.additional_children || 0) >= 5} data-testid="extras-plus"
                    className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors"
                    style={{ background: NAVY, color: '#fff' }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl p-4 text-sm" style={{ background: '#fff', border: `2px solid ${SKY}` }}>
              <Row k="Age group" v={AGE_GROUPS.find(g => g.slug === form.age_group)?.label} />
              <Row k="Center"    v={CENTERS.find(c => c.slug === form.center)?.label} />
              <Row k="Date"      v="Sunday, 21 June · 3 – 6 PM" />
              <Row k="Base"      v="₹1,999" />
              {form.additional_children > 0 && (
                <Row k={`+${form.additional_children} extra child${form.additional_children > 1 ? 'ren' : ''}`} v={`₹${(form.additional_children * 999).toLocaleString()}`} />
              )}
              <div className="border-t mt-3 pt-3 flex justify-between text-base font-bold" style={{ borderColor: SKY, color: NAVY_DEEP }}>
                <span>Total</span><span data-testid="modal-total">₹{total.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block text-slate-600">Parent&apos;s Phone (WhatsApp) *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="tel" inputMode="numeric" maxLength={15}
                  value={form.parent_phone}
                  onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))}
                  placeholder="98XXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-base"
                  style={{ border: '2.5px solid #E2E8F0', background: '#fff' }}
                  onFocus={e => { e.currentTarget.style.borderColor = NAVY; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  data-testid="modal-phone-input" autoFocus />
              </div>
            </div>
            <button onClick={onPay} disabled={submitting || form.parent_phone.replace(/\D/g, '').length < 10}
              className="mt-5 w-full font-bold py-4 rounded-full text-base inline-flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: NAVY, color: '#fff' }} data-testid="modal-pay-btn">
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating booking…</> : <>Pay ₹{total.toLocaleString()} Securely <ArrowRight className="w-5 h-5" /></>}
            </button>
            <p className="text-xs text-center mt-3 inline-flex items-center justify-center gap-1.5 w-full text-slate-400">
              <Shield className="w-3 h-3" /> Secure Cashfree · UPI / Cards / Net Banking
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const Row = ({ k, v }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-slate-500">{k}</span>
    <span className="font-bold text-right" style={{ color: NAVY_DEEP }}>{v || '—'}</span>
  </div>
);
