import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Check, Phone, User, School, Instagram, Youtube, Lock, Shield, Zap, CreditCard } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CASHFREE_ENV = 'production';

const JB = "'JetBrains Mono', monospace";
const NU = "'Nunito Sans', sans-serif";
const LIME = '#CCFF00';
const GREEN = '#00FF66';
const BG = '#050505';

const TOTAL = 3;

function ProgressBar({ step }) {
  const pct = Math.round(((step + 1) / TOTAL) * 100);
  return (
    <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden', marginBottom: '2.5rem' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${LIME}, ${GREEN})`, borderRadius: 999, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function Field({ label, children, required, hint }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontFamily: JB, fontWeight: 700, fontSize: '0.7rem', color: '#A1A1AA', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        {label} {required && <span style={{ color: LIME }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontFamily: NU, fontSize: '0.75rem', color: '#52525B', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.9rem 1rem',
  background: '#0F0F0F',
  border: '1px solid #27272A',
  borderRadius: 6,
  color: '#F4F4F5',
  fontFamily: NU,
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const btnPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  background: LIME,
  color: '#000',
  fontFamily: JB,
  fontWeight: 800,
  fontSize: '0.95rem',
  padding: '1rem 2rem',
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 0 28px rgba(204,255,0,0.35)',
  letterSpacing: '0.06em',
  transition: 'all 0.2s',
};

export default function SocialMediaInternApplyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [leadId, setLeadId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    phone: '',
    student_name: '',
    parent_name: '',
    email: '',
    school_name: '',
    age: '',
    grade: '',
    mode: 'offline',
    has_social_media: 'no',
    instagram_link: '',
    youtube_link: '',
    payment_mode: 'full',
  });

  useEffect(() => {
    if (!window.Cashfree) {
      const s = document.createElement('script');
      s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  const update = (field) => (e) => setForm(p => ({ ...p, [field]: e.target ? e.target.value : e }));

  const goBack = () => {
    setError('');
    if (step === 0) { navigate('/social-media-intern'); return; }
    setStep(s => s - 1);
  };

  // Step 0 → capture phone + get leadId
  const handlePhoneSubmit = async () => {
    setError('');
    const clean = String(form.phone || '').replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Please enter a valid 10-digit phone number.'); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/social-media-intern/capture-lead`, { phone: clean });
      setLeadId(res.data.lead_id);
      setForm(p => ({ ...p, phone: clean }));
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save. Please try again.');
    } finally { setSubmitting(false); }
  };

  // Step 1 → details submit moves to step 2 (payment select)
  const handleDetailsSubmit = () => {
    setError('');
    if (!form.student_name || !form.age) { setError('Please fill student name and age.'); return; }
    setStep(2);
  };

  // Step 2 → register + pay
  const handlePaymentSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const reg = await axios.post(`${API}/social-media-intern/register`, {
        lead_id: leadId,
        phone: form.phone,
        student_name: form.student_name,
        parent_name: form.parent_name,
        email: form.email,
        school_name: form.school_name,
        age: form.age,
        grade: form.grade,
        mode: form.mode,
        has_social_media: form.has_social_media,
        instagram_link: form.instagram_link,
        youtube_link: form.youtube_link,
        payment_mode: form.payment_mode,
      });
      const lid = reg.data.lead_id || leadId;

      const pay = await axios.post(`${API}/social-media-intern/initiate-payment`, {
        lead_id: lid,
        frontend_url: window.location.origin,
        amount: form.payment_mode === 'seat_reserve' ? 2000 : 19900,
      });
      if (!pay.data.payment_session_id) { setError('Could not initiate payment.'); return; }
      if (!window.Cashfree) { setError('Payment gateway is loading. Please try again in a moment.'); return; }

      const cf = window.Cashfree({ mode: CASHFREE_ENV });
      const result = await cf.checkout({
        paymentSessionId: pay.data.payment_session_id,
        redirectTarget: '_modal',
      });

      if (result?.error) {
        setError(result.error.message || 'Payment failed. Please try again.');
        return;
      }
      navigate(`/social-media-intern/success?lead_id=${lid}&order_id=${pay.data.order_id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <Helmet>
        <title>Apply — Social Media Internship Readiness Program | OLL</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800;900&family=Nunito+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Helmet>

      <div style={{ background: BG, color: '#F4F4F5', fontFamily: NU, minHeight: '100vh' }}>

        {/* Header */}
        <header style={{ borderBottom: '1px solid #1A1A1A', padding: '1rem 1.5rem', background: '#050505' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={goBack} data-testid="back-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontFamily: NU, fontWeight: 600 }}>
              <ArrowLeft style={{ width: 15, height: 15 }} /> Back
            </button>
            <span style={{ fontFamily: JB, fontSize: '0.7rem', fontWeight: 700, color: LIME, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Step {step + 1} / {TOTAL}</span>
          </div>
        </header>

        <main style={{ maxWidth: 600, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
          <ProgressBar step={step} />

          {error && (
            <div role="alert" data-testid="error-alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '0.8rem 1rem', color: '#FCA5A5', fontSize: '0.88rem', fontFamily: NU, marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {/* STEP 0 — PHONE */}
          {step === 0 && (
            <div data-testid="step-phone">
              <h1 style={{ fontFamily: JB, fontSize: 'clamp(1.5rem,3.5vw,2.25rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
                Let's start with your <span style={{ color: LIME }}>phone number</span>.
              </h1>
              <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.65 }}>
                We'll send your batch details and placement updates on WhatsApp. No spam, promise.
              </p>

              <Field label="Phone Number" required hint="We'll contact you on this number">
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ ...inputStyle, width: 70, textAlign: 'center', fontFamily: JB, color: LIME }}>+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    style={{ ...inputStyle, flex: 1, fontFamily: JB, fontSize: '1.05rem', letterSpacing: '0.05em' }}
                    data-testid="phone-input"
                    autoFocus
                  />
                </div>
              </Field>

              <button
                onClick={handlePhoneSubmit}
                disabled={submitting || form.phone.length !== 10}
                data-testid="phone-continue-btn"
                style={{ ...btnPrimary, width: '100%', marginTop: '0.5rem', opacity: (submitting || form.phone.length !== 10) ? 0.5 : 1 }}
              >
                {submitting ? 'Saving...' : <>Continue <ArrowRight style={{ width: 17, height: 17 }} /></>}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontFamily: JB, fontSize: '0.72rem', color: '#52525B', letterSpacing: '0.1em' }}>
                <Shield style={{ width: 12, height: 12, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                SECURE · NO SPAM · WHATSAPP-ENABLED
              </div>
            </div>
          )}

          {/* STEP 1 — DETAILS */}
          {step === 1 && (
            <div data-testid="step-details">
              <h1 style={{ fontFamily: JB, fontSize: 'clamp(1.5rem,3.5vw,2.25rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
                Tell us about the <span style={{ color: LIME }}>student</span>.
              </h1>
              <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.65 }}>
                This helps us match them to the right mentors and batch.
              </p>

              <Field label="Student Full Name" required>
                <input type="text" value={form.student_name} onChange={update('student_name')} style={inputStyle} placeholder="e.g. Aarav Sharma" data-testid="student-name-input" />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Field label="Age" required>
                  <select value={form.age} onChange={update('age')} style={inputStyle} data-testid="age-select">
                    <option value="">Select</option>
                    {Array.from({ length: 7 }, (_, i) => 12 + i).map(a => <option key={a} value={a}>{a} years</option>)}
                  </select>
                </Field>
                <Field label="Grade / Class">
                  <select value={form.grade} onChange={update('grade')} style={inputStyle} data-testid="grade-select">
                    <option value="">Select</option>
                    {[7,8,9,10,11,12].map(g => <option key={g} value={g}>Class {g}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="School Name">
                <input type="text" value={form.school_name} onChange={update('school_name')} style={inputStyle} placeholder="e.g. Dhirubhai Ambani International" data-testid="school-input" />
              </Field>

              <Field label="Parent Name">
                <input type="text" value={form.parent_name} onChange={update('parent_name')} style={inputStyle} placeholder="Parent / Guardian name" data-testid="parent-name-input" />
              </Field>

              <Field label="Email (optional)" hint="For certificate & internship updates">
                <input type="email" value={form.email} onChange={update('email')} style={inputStyle} placeholder="parent@email.com" data-testid="email-input" />
              </Field>

              <Field label="Mode">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['offline', 'online'].map(m => (
                    <button key={m} type="button" onClick={() => setForm(p => ({ ...p, mode: m }))}
                      data-testid={`mode-${m}-btn`}
                      style={{ background: form.mode === m ? 'rgba(204,255,0,0.08)' : '#0F0F0F', border: `1px solid ${form.mode === m ? LIME : '#27272A'}`, borderRadius: 6, padding: '0.85rem', color: form.mode === m ? LIME : '#D4D4D8', fontFamily: JB, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {m === 'offline' ? 'Offline (Mumbai)' : 'Online'}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Is the student already on social media?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['yes', 'no'].map(v => (
                    <button key={v} type="button" onClick={() => setForm(p => ({ ...p, has_social_media: v }))}
                      data-testid={`social-${v}-btn`}
                      style={{ background: form.has_social_media === v ? 'rgba(204,255,0,0.08)' : '#0F0F0F', border: `1px solid ${form.has_social_media === v ? LIME : '#27272A'}`, borderRadius: 6, padding: '0.75rem', color: form.has_social_media === v ? LIME : '#D4D4D8', fontFamily: JB, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </Field>

              {form.has_social_media === 'yes' && (
                <>
                  <Field label="Instagram Link" hint="Profile URL or handle">
                    <div style={{ position: 'relative' }}>
                      <Instagram style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: LIME }} />
                      <input type="text" value={form.instagram_link} onChange={update('instagram_link')} style={{ ...inputStyle, paddingLeft: 38 }} placeholder="@username or full URL" data-testid="insta-input" />
                    </div>
                  </Field>
                  <Field label="YouTube Channel" hint="Channel URL or handle">
                    <div style={{ position: 'relative' }}>
                      <Youtube style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: LIME }} />
                      <input type="text" value={form.youtube_link} onChange={update('youtube_link')} style={{ ...inputStyle, paddingLeft: 38 }} placeholder="@channel or full URL" data-testid="yt-input" />
                    </div>
                  </Field>
                </>
              )}

              <button onClick={handleDetailsSubmit} data-testid="details-continue-btn" style={{ ...btnPrimary, width: '100%', marginTop: '1.5rem' }}>
                Continue to Payment <ArrowRight style={{ width: 17, height: 17 }} />
              </button>
            </div>
          )}

          {/* STEP 2 — PAYMENT */}
          {step === 2 && (
            <div data-testid="step-payment">
              <h1 style={{ fontFamily: JB, fontSize: 'clamp(1.5rem,3.5vw,2.25rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
                Lock your <span style={{ color: LIME }}>seat</span>.
              </h1>
              <p style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.65 }}>
                Choose how you'd like to pay. Only 15 seats per batch — reserve yours before it fills up.
              </p>

              {/* Payment options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                {/* Full payment */}
                <button onClick={() => setForm(p => ({ ...p, payment_mode: 'full' }))}
                  data-testid="pay-full-btn"
                  style={{ textAlign: 'left', background: form.payment_mode === 'full' ? 'rgba(204,255,0,0.06)' : '#0F0F0F', border: `1px solid ${form.payment_mode === 'full' ? LIME : '#27272A'}`, borderRadius: 8, padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: JB, fontWeight: 800, fontSize: '1rem', color: form.payment_mode === 'full' ? LIME : '#F4F4F5' }}>Pay Full — ₹19,900</span>
                    <span style={{ background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.65rem', padding: '2px 10px', borderRadius: 3, letterSpacing: '0.1em' }}>RECOMMENDED</span>
                  </div>
                  <div style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    One-time payment. Full access to all modules, materials, placement support, and internship matching.
                  </div>
                </button>

                {/* Seat reserve */}
                <button onClick={() => setForm(p => ({ ...p, payment_mode: 'seat_reserve' }))}
                  data-testid="pay-reserve-btn"
                  style={{ textAlign: 'left', background: form.payment_mode === 'seat_reserve' ? 'rgba(0,255,102,0.06)' : '#0F0F0F', border: `1px solid ${form.payment_mode === 'seat_reserve' ? GREEN : '#27272A'}`, borderRadius: 8, padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ fontFamily: JB, fontWeight: 800, fontSize: '1rem', color: form.payment_mode === 'seat_reserve' ? GREEN : '#F4F4F5', marginBottom: 6 }}>
                    Reserve Seat — ₹2,000 now
                  </div>
                  <div style={{ fontFamily: NU, color: '#A1A1AA', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    Lock your spot with ₹2,000 today. Pay remaining ₹17,900 on your first day at the center.
                  </div>
                </button>
              </div>

              {/* Summary */}
              <div style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #1A1A1A' }}>
                  <span style={{ fontFamily: JB, fontSize: '0.72rem', color: '#71717A', letterSpacing: '0.1em' }}>STUDENT</span>
                  <span style={{ fontFamily: NU, fontSize: '0.9rem', color: '#F4F4F5', fontWeight: 600 }}>{form.student_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #1A1A1A' }}>
                  <span style={{ fontFamily: JB, fontSize: '0.72rem', color: '#71717A', letterSpacing: '0.1em' }}>MODE</span>
                  <span style={{ fontFamily: NU, fontSize: '0.9rem', color: '#F4F4F5', fontWeight: 600, textTransform: 'capitalize' }}>{form.mode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0 0.2rem' }}>
                  <span style={{ fontFamily: JB, fontSize: '0.78rem', color: LIME, letterSpacing: '0.1em' }}>AMOUNT TO PAY NOW</span>
                  <span style={{ fontFamily: JB, fontSize: '1.4rem', color: LIME, fontWeight: 900 }}>
                    ₹{form.payment_mode === 'seat_reserve' ? '2,000' : '19,900'}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePaymentSubmit}
                disabled={submitting}
                data-testid="pay-now-btn"
                style={{ ...btnPrimary, width: '100%', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Processing...' : <><CreditCard style={{ width: 17, height: 17 }} /> Pay Securely via Cashfree</>}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.25rem', fontFamily: JB, fontSize: '0.7rem', color: '#52525B', letterSpacing: '0.08em' }}>
                <Lock style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                SECURED BY CASHFREE · UPI · CARD · NETBANKING
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
