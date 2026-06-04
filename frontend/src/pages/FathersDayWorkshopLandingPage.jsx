/**
 * Father's Day Robotics Workshop — 1-day event landing page.
 * Sunday 21 June 2026, 3 – 6 PM. ₹1999 per parent-child duo.
 * Centers: Kandivali or Mira Road.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import {
  Calendar, Clock, MapPin, Heart, Shield, Sparkles, ArrowRight, ArrowLeft,
  Camera, Cpu, Zap, Wrench, Check, X, Loader2, Phone,
} from 'lucide-react';
import { openCashfreeCheckout } from '../utils/cashfreeCheckout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WORKSHOP_KEY = 'fathers-day-robotics';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80';

const AGE_GROUPS = [
  {
    slug: '4-8',
    label: 'Ages 4 – 8',
    tagline: 'Engineering fundamentals through play',
    color: '#F97316',
    builds: [
      "Miner's Head Lamp 💡",
      '3D Pen Nametags ✏️',
      'Motorised Windmill 🌀',
    ],
    learns: ['Engineering basics', 'Electricity 101', 'How a motor works'],
  },
  {
    slug: '9-12',
    label: 'Ages 9 – 12',
    tagline: 'Build a real working robot car',
    color: '#3B82F6',
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
  { icon: Camera, title: 'Take-home Photoframe', sub: 'A printed memento of you & your child at the workshop' },
  { icon: Heart,  title: 'Lifelong Memories',     sub: 'Bonding over creating something real, together' },
  { icon: Sparkles, title: 'Hands-on Learning',    sub: 'STEM concepts your child will remember for years' },
];

export default function FathersDayWorkshopLandingPage() {
  const navigate = useNavigate();
  const [showEnroll, setShowEnroll] = useState(false);
  const [step, setStep] = useState(0); // 0-age 1-center 2-phone
  const [form, setForm] = useState({ age_group: '', center: '', parent_phone: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

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
      await openCashfreeCheckout({
        paymentSessionId: sessionId,
        mode: 'production',
        redirectTarget: '_self',
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Booking failed — please retry');
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="fathers-day-landing" style={{ background: '#FFF8F0', minHeight: '100vh', fontFamily: '"Nunito Sans", sans-serif' }}>
      <Helmet>
        <title>Father's Day Robotics Workshop — Sunday 21 June | OLL</title>
        <meta name="description" content="A 3-hour screen-free father-child robotics workshop on Sunday 21 June 2026, 3-6 PM. Build a robot together. ₹1999 per duo. Kandivali & Mira Road." />
      </Helmet>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingBottom: '4rem' }}>
        <div style={{ background: 'linear-gradient(135deg,#F97316 0%,#D63031 100%)', color: '#fff' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 lg:pt-16 lg:pb-20">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-white/15 backdrop-blur border border-white/20">
                  <Heart className="w-3.5 h-3.5" /> Father's Day Special · 1-Day Event
                </span>
                <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.1]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  Father's Day<br /><span style={{ background: 'linear-gradient(90deg,#FFE066,#FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Robotics Workshop</span>
                </h1>
                <p className="mt-4 text-base sm:text-lg text-white/90 max-w-xl leading-relaxed">
                  Bond with your child over building a real robot together. No screens. Just hands, hearts, and circuits.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Pill icon={Calendar} text="Sunday, 21 June 2026" />
                  <Pill icon={Clock}    text="3:00 PM – 6:00 PM" />
                  <Pill icon={MapPin}   text="Kandivali / Mira Road" />
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <button
                    onClick={openEnroll}
                    data-testid="hero-enroll-btn"
                    className="bg-white text-[#D63031] font-black px-7 py-4 rounded-full shadow-xl hover:scale-[1.02] transition-transform text-base inline-flex items-center gap-2"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    Enroll Now · ₹1,999 <ArrowRight className="w-5 h-5" />
                  </button>
                  <div className="text-sm text-white/85">
                    <strong className="block">Limited seats per center</strong>
                    Cashfree payment · Instant confirmation
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20" style={{ aspectRatio: '4 / 3', background: '#FFE5D1' }}>
                  <img
                    src={HERO_IMAGE}
                    alt="Father and child building a robot together"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.src = 'https://customer-assets.emergentagent.com/job_skill-engagement-1/artifacts/dad-child-robot.jpg'; }}
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 sm:bottom-4 sm:right-4 bg-white text-[#D63031] rounded-2xl px-4 py-3 shadow-xl text-sm">
                  <div className="font-black text-lg" style={{ fontFamily: '"JetBrains Mono", monospace' }}>₹1,999</div>
                  <div className="text-xs text-slate-500">per parent-child duo</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USP STRIP ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 mb-20 relative z-10">
        <div className="grid sm:grid-cols-2 gap-4">
          <FeatureCard
            color="#D63031"
            icon={Heart}
            title="Bonding time with your child"
            sub="Three hours of undivided, hands-on time — building something real together."
          />
          <FeatureCard
            color="#1E3A5F"
            icon={Shield}
            title="Screen-free zone"
            sub="No phones, no tablets, no screens. Just the two of you, parts, and creativity."
          />
        </div>
      </section>

      {/* ── WHAT WILL YOU BUILD ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <SectionLabel>The Build</SectionLabel>
        <h2 className="text-3xl sm:text-4xl font-black text-[#0F1E33] mb-8" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          What will you build together?
        </h2>
        <div className="grid lg:grid-cols-2 gap-5">
          {AGE_GROUPS.map(g => (
            <div
              key={g.slug}
              className="rounded-3xl p-6 sm:p-8 border-2 bg-white shadow-lg"
              style={{ borderColor: `${g.color}40` }}
              data-testid={`age-card-${g.slug}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: g.color }}>{g.label}</div>
                  <div className="text-lg font-black text-[#0F1E33] mt-1">{g.tagline}</div>
                </div>
                <Cpu style={{ width: 28, height: 28, color: g.color }} />
              </div>
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">You'll Build</div>
                <ul className="space-y-2">
                  {g.builds.map(b => (
                    <li key={b} className="flex items-center gap-3 text-base text-slate-800 font-semibold">
                      <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">You'll Learn</div>
                <div className="flex flex-wrap gap-2">
                  {g.learns.map(l => (
                    <span
                      key={l}
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `${g.color}12`, color: g.color, border: `1px solid ${g.color}30` }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setForm(prev => ({ ...prev, age_group: g.slug })); setStep(1); setShowEnroll(true); }}
                className="mt-5 w-full bg-[#0F1E33] hover:bg-[#1E3A5F] text-white font-bold py-3.5 rounded-xl inline-flex items-center justify-center gap-2 text-sm transition-colors"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
                data-testid={`enroll-from-age-${g.slug}`}
              >
                Enroll {g.label} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT WILL YOUR CHILD LEARN ─────────────────── */}
      <section className="bg-[#0F1E33] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel light>The Learning</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            What will your child learn?
          </h2>
          <p className="text-white/70 max-w-2xl mb-10">Hands-on STEM concepts they'll carry into school, projects, and life — taught through actual building, not slides.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap,    title: 'Electricity & Circuits', sub: 'How current, batteries, and switches actually work' },
              { icon: Cpu,    title: 'Motors & Movement',      sub: 'Turning electricity into motion — the heart of robotics' },
              { icon: Wrench, title: 'Engineering Mindset',    sub: 'Plan it · Build it · Test it · Fix it · Improve it' },
              { icon: Sparkles, title: 'Sensor Logic',         sub: 'How robots "see" obstacles and follow paths' },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <Icon className="w-7 h-7 text-orange-400 mb-3" />
                <div className="font-bold text-base">{title}</div>
                <div className="text-sm text-white/65 mt-1.5 leading-relaxed">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT WILL YOU GET ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <SectionLabel>The Take-home</SectionLabel>
        <h2 className="text-3xl sm:text-4xl font-black text-[#0F1E33] mb-3" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          What will you get?
        </h2>
        <p className="text-slate-500 max-w-2xl mb-10">Walk out with more than just a robot.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {TAKEAWAYS.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="rounded-2xl bg-white border-2 border-orange-100 p-6 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#D63031] flex items-center justify-center mb-4"><Icon className="w-6 h-6" /></div>
              <div className="text-lg font-black text-[#0F1E33]">{title}</div>
              <div className="text-sm text-slate-500 mt-2 leading-relaxed">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ─────────────────────────────────── */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="rounded-3xl p-8 sm:p-12 text-white shadow-2xl" style={{ background: 'linear-gradient(135deg,#D63031 0%,#F97316 100%)' }}>
            <h3 className="text-2xl sm:text-3xl font-black mb-3" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Make this Father's Day unforgettable
            </h3>
            <p className="text-white/90 max-w-xl mx-auto mb-6">3 hours · No screens · A bot, a frame, and memories you'll keep on the shelf for years.</p>
            <button
              onClick={openEnroll}
              className="bg-white text-[#D63031] font-black px-8 py-4 rounded-full shadow-xl hover:scale-[1.02] transition-transform text-base inline-flex items-center gap-2"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
              data-testid="footer-enroll-btn"
            >
              Enroll Now · ₹1,999 <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── ENROLL MODAL ──────────────────────────────── */}
      {showEnroll && (
        <EnrollModal
          step={step}
          setStep={setStep}
          form={form}
          setForm={setForm}
          submitting={submitting}
          onPay={handlePay}
          onClose={close}
        />
      )}
    </div>
  );
}

const Pill = ({ icon: Icon, text }) => (
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur border border-white/20 text-sm font-semibold">
    <Icon className="w-4 h-4" /> {text}
  </div>
);

const SectionLabel = ({ children, light }) => (
  <div className={`text-[11px] uppercase tracking-widest font-bold mb-3 ${light ? 'text-orange-300' : 'text-[#D63031]'}`}>
    {children}
  </div>
);

const FeatureCard = ({ color, icon: Icon, title, sub }) => (
  <div className="rounded-2xl p-6 bg-white shadow-lg border-2" style={{ borderColor: `${color}30` }}>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}15`, color }}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="text-lg font-black text-[#0F1E33]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{title}</div>
    <div className="text-sm text-slate-500 mt-1.5 leading-relaxed">{sub}</div>
  </div>
);

function EnrollModal({ step, setStep, form, setForm, submitting, onPay, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" data-testid="enroll-modal">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-widest text-[#D63031] font-bold">Step {step + 1} of 3</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" data-testid="enroll-close"><X className="w-5 h-5" /></button>
        </div>
        <div className="h-1 bg-orange-100 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#D63031] to-orange-400 transition-all duration-300" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>

        {step === 0 && (
          <div>
            <h3 className="text-xl font-black text-[#0F1E33]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>How old is your child?</h3>
            <p className="text-sm text-slate-500 mt-1">We split the projects by age so it's just right.</p>
            <div className="mt-5 space-y-3">
              {AGE_GROUPS.map(g => (
                <button
                  key={g.slug}
                  onClick={() => { setForm(p => ({ ...p, age_group: g.slug })); setStep(1); }}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${form.age_group === g.slug ? 'border-[#D63031] bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}
                  data-testid={`modal-age-${g.slug}`}
                >
                  <div className="font-black text-[#0F1E33]">{g.label}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{g.tagline}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <button onClick={() => setStep(0)} className="text-xs text-slate-500 inline-flex items-center gap-1 mb-3"><ArrowLeft className="w-3 h-3" /> Back</button>
            <h3 className="text-xl font-black text-[#0F1E33]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Pick your center</h3>
            <p className="text-sm text-slate-500 mt-1">Two locations available for this workshop.</p>
            <div className="mt-5 space-y-3">
              {CENTERS.map(c => (
                <button
                  key={c.slug}
                  onClick={() => { setForm(p => ({ ...p, center: c.slug })); setStep(2); }}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-start gap-3 ${form.center === c.slug ? 'border-[#D63031] bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}
                  data-testid={`modal-center-${c.slug}`}
                >
                  <MapPin className="w-5 h-5 mt-0.5 text-[#D63031] flex-shrink-0" />
                  <div>
                    <div className="font-black text-[#0F1E33]">{c.label}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{c.area}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="text-xs text-slate-500 inline-flex items-center gap-1 mb-3"><ArrowLeft className="w-3 h-3" /> Back</button>
            <h3 className="text-xl font-black text-[#0F1E33]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Confirm & pay</h3>
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm">
              <Row k="Age group" v={AGE_GROUPS.find(g => g.slug === form.age_group)?.label} />
              <Row k="Center"    v={CENTERS.find(c => c.slug === form.center)?.label} />
              <Row k="Date"      v="Sunday, 21 June 2026 · 3 – 6 PM" />
              <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between text-base font-black text-[#0F1E33]">
                <span>Total</span><span>₹1,999</span>
              </div>
            </div>
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">Parent's Phone (WhatsApp) *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  value={form.parent_phone}
                  onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))}
                  placeholder="98XXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-[#D63031] transition-colors text-base"
                  data-testid="modal-phone-input"
                  autoFocus
                />
              </div>
            </div>
            <button
              onClick={onPay}
              disabled={submitting || form.parent_phone.replace(/\D/g, '').length < 10}
              className="mt-5 w-full bg-[#D63031] hover:bg-[#B91C1C] text-white font-black py-4 rounded-xl text-base inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
              data-testid="modal-pay-btn"
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating booking…</> : <>Pay ₹1,999 Securely <ArrowRight className="w-5 h-5" /></>}
            </button>
            <p className="text-xs text-slate-400 text-center mt-3 inline-flex items-center justify-center gap-1.5 w-full">
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
    <span className="text-slate-500">{k}</span>
    <span className="font-bold text-slate-800 text-right">{v || '—'}</span>
  </div>
);
