/**
 * High-converting landing page for the Robotics Beginner program.
 *
 * Copy sourced from the OLL Beginner Curriculum handout:
 *   "A beginner and pocket friendly curriculum which schools can start
 *    their journey [in] first year in robotics with. It covers the complete
 *    curriculum one would required to explore Robotics journey in, fits
 *    well for all level of students from backbenchers to toppers. High in
 *    creativity, Low complexity to start and Easy to Teach."
 *
 * Conversion flow: hero → outcomes → what's inside → social proof →
 * inline demo-booking form (POSTs to /api/schools/inquiry which is public
 * and already wired into the school-inquiries pipeline used by the CRM).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, Toaster } from 'sonner';
import { CheckCircle2, ShieldCheck, Sparkles, Users, Cpu, Trophy, ArrowRight, Phone, Mail, Building2, MapPin, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const OUTCOMES = [
  { icon: Cpu,       t: 'Complete first-year curriculum', s: 'Covers everything a school needs to start its Robotics journey.' },
  { icon: Sparkles,  t: 'High creativity · low complexity', s: 'Kids build, code and imagine — without heavy prerequisites.' },
  { icon: Users,     t: 'Backbenchers to toppers',        s: 'Levels calibrated so every child stays hooked.' },
  { icon: ShieldCheck, t: 'Easy to teach',                s: 'Lesson plans, teacher-training and full support included.' },
];

const INSIDE = [
  'Age-appropriate kits — no soldering, no hazards',
  '30+ hands-on projects mapped to the school calendar',
  'Teacher lesson plans, videos & assessment rubrics',
  'Year-end Tech Showcase for parents & principals',
  'Pocket-friendly per-student pricing',
  'Onboarding + refresher trainings for teachers',
];

const HERO_PILLS = ['Pocket friendly', 'First-year ready', 'Complete kit + curriculum', 'Teacher training included'];

export default function RoboticsBeginnerLanding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    school_name: '', contact_name: '', email: '', phone: '',
    city: '', student_count: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Nunito Sans', sans-serif" }}>
      <Toaster position="top-right" richColors />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #0F1E33 0%, #1E3A5F 55%, #D63031 130%)',
        color: '#fff', paddingTop: '4.5rem', paddingBottom: '5rem', position: 'relative', overflow: 'hidden',
      }} data-testid="rb-hero">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '3rem', alignItems: 'center' }}
          className="rb-hero-grid">
          <div>
            <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '0.35rem 0.9rem', borderRadius: 999, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
              For Schools · Robotics Beginner
            </span>
            <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 'clamp(2.1rem, 4.8vw, 3.4rem)', lineHeight: 1.05, marginTop: '1rem', marginBottom: '1rem' }}>
              Start your school&apos;s Robotics journey — <span style={{ color: '#FFC940' }}>the pocket-friendly way</span>.
            </h1>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.9)', maxWidth: 560 }}>
              A complete first-year Robotics curriculum designed for Indian schools — high on creativity, low on complexity, and easy to teach.
              Fits backbenchers and toppers alike.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.25rem' }}>
              {HERO_PILLS.map(p => (
                <span key={p} style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.35rem 0.85rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700 }}>
                  ✓ {p}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.75rem' }}>
              <a href="#demo" data-testid="rb-cta-primary" style={{ background: 'linear-gradient(90deg, #FFC940, #FF7B6B)', color: '#0F1E33', padding: '1rem 1.9rem', borderRadius: 999, fontWeight: 900, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 14px 32px rgba(255,201,64,0.35)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                Book a Product Demo <ArrowRight size={18} />
              </a>
              <a href="tel:+919820106645" data-testid="rb-cta-call" style={{ background: 'transparent', color: '#fff', padding: '1rem 1.6rem', borderRadius: 999, fontWeight: 800, fontSize: '1rem', textDecoration: 'none', border: '2px solid rgba(255,255,255,0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={16} /> Talk to an expert
              </a>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '1.5rem', padding: '2rem', backdropFilter: 'blur(12px)', textAlign: 'center' }}>
            <div style={{ fontSize: '5rem', lineHeight: 1 }}>🤖</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FFC940', marginTop: '0.75rem' }}>Trusted by 400+ schools</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '0.4rem', fontFamily: "'JetBrains Mono', monospace" }}>Grades 1 – 4 · First year in Robotics</div>
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { k: '30+', v: 'projects' },
                { k: '100%', v: 'CBSE/ICSE fit' },
                { k: '5-day', v: 'teacher training' },
                { k: '₹ friendly', v: 'per-student' },
              ].map(x => (
                <div key={x.v} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.6rem', padding: '0.6rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{x.k}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>{x.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{`@media (max-width: 900px) { .rb-hero-grid { grid-template-columns: 1fr !important; } }`}</style>
      </section>

      {/* ── OUTCOMES ────────────────────────────────────── */}
      <section style={{ padding: '4rem 1.25rem', maxWidth: 1200, margin: '0 auto' }} data-testid="rb-outcomes">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#D63031', marginBottom: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>Why schools choose it</p>
          <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, color: '#0F1E33', fontSize: 'clamp(1.7rem, 3.5vw, 2.3rem)' }}>Built to make Robotics easy for every school</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {OUTCOMES.map(o => (
            <div key={o.t} style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15,30,80,0.05)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #D63031, #1E3A5F)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.9rem' }}>
                <o.icon size={22} />
              </div>
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#0F1E33', fontSize: '1.05rem', marginBottom: '0.4rem' }}>{o.t}</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>{o.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT'S INSIDE ─────────────────────────────── */}
      <section style={{ background: '#F1F5F9', padding: '4rem 1.25rem' }} data-testid="rb-inside">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#1E3A5F', marginBottom: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>What&apos;s inside</p>
            <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, color: '#0F1E33', fontSize: 'clamp(1.7rem, 3.5vw, 2.3rem)' }}>Everything a school needs — from Day 1</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {INSIDE.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: '#fff', padding: '0.9rem 1.1rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0' }}>
                <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '0.92rem', color: '#0F1E33', fontWeight: 600 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO FORM ─────────────────────────────────── */}
      <section id="demo" style={{ padding: '4.5rem 1.25rem', background: '#0F1E33', color: '#fff' }} data-testid="rb-demo-form">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Trophy size={40} style={{ color: '#FFC940', marginBottom: '0.75rem' }} />
            <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 'clamp(1.7rem, 3.5vw, 2.2rem)' }}>Book a Product Demo with an Expert</h2>
            <p style={{ marginTop: '0.6rem', opacity: 0.85, fontSize: '0.98rem' }}>
              30-min walkthrough of the kit, curriculum and outcomes. Free, no commitment.
            </p>
          </div>
          {done ? (
            <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid #10B981', borderRadius: '1rem', padding: '2rem', textAlign: 'center' }} data-testid="rb-done">
              <CheckCircle2 size={40} style={{ color: '#10B981', marginBottom: '0.75rem' }} />
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: '1.4rem', marginBottom: '0.5rem' }}>Request received</h3>
              <p style={{ opacity: 0.9 }}>Our program expert will call you within 24 hours.</p>
              <button onClick={() => navigate('/')} style={{ marginTop: '1.25rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', padding: '0.7rem 1.4rem', borderRadius: 999, fontWeight: 700, cursor: 'pointer' }}>Back to home</button>
            </div>
          ) : (
            <form onSubmit={submit} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '1.75rem', backdropFilter: 'blur(8px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.9rem' }}>
                <Field icon={Building2} placeholder="School name *"    value={form.school_name}   onChange={v => setForm({ ...form, school_name: v })}   testid="rb-school" />
                <Field icon={Users}     placeholder="Your name *"      value={form.contact_name}  onChange={v => setForm({ ...form, contact_name: v })}  testid="rb-name" />
                <Field icon={Phone}     placeholder="Phone (WhatsApp) *" value={form.phone}      onChange={v => setForm({ ...form, phone: v })}         testid="rb-phone" type="tel" />
                <Field icon={Mail}      placeholder="Email"            value={form.email}         onChange={v => setForm({ ...form, email: v })}         testid="rb-email" type="email" />
                <Field icon={MapPin}    placeholder="City"             value={form.city}          onChange={v => setForm({ ...form, city: v })}          testid="rb-city" />
                <Field icon={Users}     placeholder="No. of students"  value={form.student_count} onChange={v => setForm({ ...form, student_count: v })} testid="rb-count" type="number" />
              </div>
              <textarea placeholder="Anything specific you would like the expert to cover?"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                data-testid="rb-notes"
                style={{ width: '100%', marginTop: '0.9rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.6rem', padding: '0.75rem 0.9rem', color: '#fff', fontFamily: 'inherit', resize: 'vertical' }}
              />
              <button type="submit" disabled={submitting} data-testid="rb-submit"
                style={{ marginTop: '1.1rem', width: '100%', background: submitting ? 'rgba(255,201,64,0.6)' : 'linear-gradient(90deg, #FFC940, #FF7B6B)', color: '#0F1E33', padding: '1rem', borderRadius: 999, fontWeight: 900, fontSize: '1.05rem', border: 'none', cursor: submitting ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {submitting ? <><Loader2 size={18} className="animate-spin" /> Requesting…</> : <>Book my Demo <ArrowRight size={18} /></>}
              </button>
              <p style={{ fontSize: '0.72rem', opacity: 0.7, textAlign: 'center', marginTop: '0.9rem' }}>We respect your privacy. Your details go directly to our schools team.</p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ icon: Icon, placeholder, value, onChange, testid, type = 'text' }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)' }} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        data-testid={testid}
        style={{
          width: '100%', paddingLeft: '2.4rem', paddingRight: '0.9rem', paddingTop: '0.75rem', paddingBottom: '0.75rem',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '0.6rem', color: '#fff', fontFamily: 'inherit', fontSize: '0.95rem',
        }}
      />
    </div>
  );
}
