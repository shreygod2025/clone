import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Check, MapPin, Wifi, CreditCard, Banknote, Lock } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AGE_GROUPS = [
  { slug: 'explorers', label: 'Little Explorers', ages: '4 – 8', icon: '🚀', tagline: 'First steps into robotics & coding', color: '#00E5FF' },
  { slug: 'creators',  label: 'Tech Creators',    ages: '9 – 12', icon: '⚙️', tagline: 'Build robots and write real code', color: '#D63031' },
  { slug: 'innovators',label: 'Future Innovators', ages: '13 – 16', icon: '🤖', tagline: 'AI, 3D Design & advanced robotics', color: '#7C3AED' },
];

const CENTERS = [
  { id: 'mira_road', name: 'Mira Road',          address: 'OLL Center, Mira Road, Mumbai' },
  { id: 'dombivli',  name: 'Dombivli – Pallava', address: 'OLL Center, Pallava, Dombivli, Mumbai' },
  { id: 'andheri',   name: 'Andheri West',        address: 'OLL Center, Lokhandwala, Andheri West, Mumbai' },
];

const BATCH_WEEKS = [
  { id: 'week1', weekday: 'May 1–5, 2026',   weekend: 'May 2–3 & 9–10, 2026' },
  { id: 'week2', weekday: 'May 8–12, 2026',  weekend: 'May 9–10 & 16–17, 2026' },
  { id: 'week3', weekday: 'May 15–19, 2026', weekend: 'May 16–17 & 23–24, 2026' },
  { id: 'week4', weekday: 'May 22–26, 2026', weekend: 'May 23–24 & 30–31, 2026' },
];

// Steps:
// 0 – Age group
// 1 – Learning mode
// 2 – Center (if offline)
// 3 – Batch selection
// 4 – Child/Parent details + payment

const TOTAL_STEPS = 5; // 0..4 + pay

function ProgressBar({ step, total }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginBottom: '2.5rem' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: '#D63031', borderRadius: 999, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: 0, marginBottom: '2rem', fontFamily: 'Outfit, sans-serif' }}>
      <ArrowLeft style={{ width: 15, height: 15 }} /> Back
    </button>
  );
}

function ChoiceCard({ selected, onClick, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: selected ? 'rgba(0,229,255,0.08)' : 'rgba(30,58,95,0.25)',
        border: selected ? '2px solid #00E5FF' : '1px solid rgba(0,229,255,0.18)',
        borderRadius: '1.25rem', padding: '1.5rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.25s', textAlign: 'left',
        ...style,
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.18)'; } }}
    >
      {children}
      {selected && (
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#00E5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
          <Check style={{ width: 14, height: 14, color: '#080C16' }} />
        </div>
      )}
    </button>
  );
}

function InputField({ label, id, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Outfit, sans-serif' }}>
        {label}{required && <span style={{ color: '#D63031' }}> *</span>}
      </label>
      <input
        id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(30,58,95,0.3)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '0.75rem', color: '#F8FAFC', fontSize: '0.95rem', fontFamily: 'Outfit, sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
        onFocus={e => { e.target.style.borderColor = '#00E5FF'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(0,229,255,0.2)'; }}
      />
    </div>
  );
}

function QuestionLabel({ step, total, label, sub }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700 }}>
        Step {step + 1} of {total}
      </p>
      <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: 900, color: '#F8FAFC', lineHeight: 1.2, marginBottom: sub ? '0.5rem' : 0 }}>
        {label}
      </h2>
      {sub && <p style={{ color: '#64748B', fontSize: '0.88rem', fontFamily: 'Outfit, sans-serif' }}>{sub}</p>}
    </div>
  );
}

export default function SummerCampBookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preAge = searchParams.get('age') || '';

  const [step, setStep] = useState(preAge ? 1 : 0);
  const [form, setForm] = useState({
    age_group: preAge || '',
    mode: '',
    center: '',
    batch_week: '',
    batch_type: 'weekday',
    child_name: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    payment_mode: 'cashfree',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Steps accounting for center (only if offline)
  const stepsWithCenter = form.mode === 'offline';
  const TOTAL = stepsWithCenter ? 5 : 4; // age, mode, [center], batch, details+pay

  const update = (field) => (val) => setForm(prev => ({ ...prev, [field]: val }));

  const goBack = () => {
    setError('');
    if (step === 0) { navigate('/summer-camp'); return; }
    // Skip center step when going back if online
    if (step === 3 && form.mode === 'online') { setStep(1); return; }
    setStep(s => s - 1);
  };

  const goNext = () => {
    setError('');
    // Skip center step if online
    if (step === 2 && form.mode === 'online') { setStep(3); return; }
    setStep(s => s + 1);
  };

  // Progress position (visual) — normalize for center skip
  const visualStep = () => {
    const steps = ['age', 'mode', ...(stepsWithCenter ? ['center'] : []), 'batch', 'pay'];
    if (step === 0) return 0;
    if (step === 1) return 1;
    if (step === 2 && stepsWithCenter) return 2;
    if (step === 3) return stepsWithCenter ? 3 : 2;
    if (step === 4) return stepsWithCenter ? 4 : 3;
    return step;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.child_name || !form.parent_name || !form.parent_phone || !form.parent_email) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        child_name: form.child_name,
        parent_name: form.parent_name,
        parent_phone: form.parent_phone,
        parent_email: form.parent_email,
        age_group: form.age_group,
        batch_type: form.batch_type,
        batch_week: form.batch_week,
        mode: form.mode,
        center: form.mode === 'online' ? 'online' : form.center,
        payment_mode: form.payment_mode,
      };
      const reg = await axios.post(`${API}/summer-camp/register`, payload);
      const bid = reg.data.booking_id;

      if (form.payment_mode === 'cash') {
        navigate(`/summer-camp/success?booking_id=${bid}&payment_mode=cash`);
        return;
      }
      const pay = await axios.post(`${API}/summer-camp/initiate-payment`, { booking_id: bid });
      if (pay.data.payment_link) { window.location.href = pay.data.payment_link; }
      else { setError('Could not initiate payment. Please try again.'); }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAge = AGE_GROUPS.find(g => g.slug === form.age_group);
  const selectedBatch = BATCH_WEEKS.find(b => b.id === form.batch_week);
  const selectedCenter = CENTERS.find(c => c.id === form.center);

  return (
    <>
      <Helmet><title>Book — Future Skills Summer Camp 2026 | OLL</title></Helmet>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
        {/* Header bar */}
        <div style={{ borderBottom: '1px solid rgba(0,229,255,0.1)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/summer-camp')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.85rem' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft style={{ width: 14, height: 14 }} /></span>
            Summer Camp 2026
          </button>
          <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
            {selectedAge ? `${selectedAge.icon} ${selectedAge.label}` : 'Booking'}
          </span>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
          <ProgressBar step={visualStep()} total={TOTAL} />

          {error && (
            <div style={{ background: 'rgba(214,48,49,0.12)', border: '1px solid rgba(214,48,49,0.3)', borderRadius: '0.75rem', padding: '0.75rem 1rem', color: '#FF6B6B', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {/* ── STEP 0: Age Group ─────────────────────────────────────── */}
          {step === 0 && (
            <div key="age" className="camp-section" style={{ animation: 'fadeSlide 0.4s ease both' }}>
              <QuestionLabel step={0} total={TOTAL} label="How old is your child?" sub="Each camp is designed for that specific age group's learning level." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {AGE_GROUPS.map(g => (
                  <ChoiceCard
                    key={g.slug}
                    selected={form.age_group === g.slug}
                    onClick={() => { update('age_group')(g.slug); setTimeout(goNext, 220); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: '2.5rem', lineHeight: 1, flexShrink: 0 }}>{g.icon}</span>
                      <div>
                        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: g.color, marginBottom: '0.15rem' }}>Ages {g.ages}</div>
                        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#F8FAFC', marginBottom: '0.25rem' }}>{g.label}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>{g.tagline}</div>
                      </div>
                    </div>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: Learning Mode ─────────────────────────────────── */}
          {step === 1 && (
            <div key="mode" style={{ animation: 'fadeSlide 0.4s ease both' }}>
              <BackBtn onClick={goBack} />
              <QuestionLabel step={1} total={TOTAL} label="How would you like to attend?" sub="At one of our Mumbai centers or from the comfort of home." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ChoiceCard selected={form.mode === 'offline'} onClick={() => { update('mode')('offline'); setTimeout(goNext, 220); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin style={{ width: 22, height: 22, color: '#00E5FF' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#F8FAFC', marginBottom: '0.2rem' }}>At a Center</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Mira Road · Dombivli · Andheri West — all in Mumbai</div>
                    </div>
                  </div>
                </ChoiceCard>
                <ChoiceCard selected={form.mode === 'online'} onClick={() => { update('mode')('online'); update('center')('online'); setTimeout(goNext, 220); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'rgba(214,48,49,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wifi style={{ width: 22, height: 22, color: '#D63031' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#F8FAFC', marginBottom: '0.2rem' }}>Online at Home</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Live sessions via Zoom/Google Meet — from anywhere</div>
                    </div>
                  </div>
                </ChoiceCard>
              </div>
            </div>
          )}

          {/* ── STEP 2: Center (offline only) ─────────────────────────── */}
          {step === 2 && (
            <div key="center" style={{ animation: 'fadeSlide 0.4s ease both' }}>
              <BackBtn onClick={goBack} />
              <QuestionLabel step={2} total={TOTAL} label="Choose your center" sub="All centers are in Mumbai." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {CENTERS.map(c => (
                  <ChoiceCard key={c.id} selected={form.center === c.id} onClick={() => { update('center')(c.id); setTimeout(goNext, 220); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }}>🏢</span>
                      <div>
                        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC', marginBottom: '0.2rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{c.address}</div>
                      </div>
                    </div>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: Batch ─────────────────────────────────────────── */}
          {step === 3 && (
            <div key="batch" style={{ animation: 'fadeSlide 0.4s ease both' }}>
              <BackBtn onClick={goBack} />
              <QuestionLabel step={stepsWithCenter ? 3 : 2} total={TOTAL} label="Pick your batch" sub="Select your preferred schedule and start week." />

              {/* Type toggle */}
              <div style={{ display: 'flex', background: 'rgba(30,58,95,0.4)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '999px', padding: '4px', gap: '4px', marginBottom: '1.5rem' }}>
                {[{ v: 'weekday', l: 'Weekday · Mon–Fri' }, { v: 'weekend', l: 'Weekend · Sat–Sun' }].map(opt => (
                  <button key={opt.v} onClick={() => update('batch_type')(opt.v)} style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.3s', ...(form.batch_type === opt.v ? { background: '#00E5FF', color: '#080C16' } : { background: 'transparent', color: '#94A3B8' }) }}>
                    {opt.l}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '2rem' }}>
                {BATCH_WEEKS.map((b, i) => (
                  <ChoiceCard key={b.id} selected={form.batch_week === b.id} onClick={() => update('batch_week')(b.id)}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem', fontFamily: 'Outfit, sans-serif' }}>Batch {i + 1}</div>
                      <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#F8FAFC' }}>{b[form.batch_type]}</div>
                    </div>
                  </ChoiceCard>
                ))}
              </div>

              <button
                disabled={!form.batch_week}
                onClick={goNext}
                data-testid="batch-next-btn"
                style={{ width: '100%', background: form.batch_week ? '#D63031' : '#2D3748', color: '#fff', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.9rem', padding: '1rem', borderRadius: '0.875rem', border: 'none', cursor: form.batch_week ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.3s' }}
              >
                Continue <ArrowRight style={{ width: 18, height: 18 }} />
              </button>
            </div>
          )}

          {/* ── STEP 4: Details + Pay ─────────────────────────────────── */}
          {step === 4 && (
            <div key="pay" style={{ animation: 'fadeSlide 0.4s ease both' }}>
              <BackBtn onClick={goBack} />
              <QuestionLabel step={stepsWithCenter ? 4 : 3} total={TOTAL} label="Almost there!" sub="Enter your details and choose how to pay." />

              {/* Order summary pill */}
              <div style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.18)', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>
                <span>{selectedAge?.icon} {selectedAge?.label} · Ages {selectedAge?.ages}</span>
                {selectedBatch && <span>{selectedBatch[form.batch_type]} · {form.batch_type === 'weekday' ? 'Mon–Fri' : 'Sat–Sun'}</span>}
                <span>{form.mode === 'online' ? '💻 Online' : `🏢 ${selectedCenter?.name || ''}`}</span>
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, color: '#00E5FF', fontSize: '1rem' }}>₹1,999</span>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <InputField label="Child's Name" id="child_name" value={form.child_name} onChange={e => update('child_name')(e.target.value)} placeholder="e.g. Aryan Kumar" required />
                <InputField label="Parent's Name" id="parent_name" value={form.parent_name} onChange={e => update('parent_name')(e.target.value)} placeholder="e.g. Rajesh Kumar" required />
                <InputField label="Parent's Phone" id="parent_phone" type="tel" value={form.parent_phone} onChange={e => update('parent_phone')(e.target.value)} placeholder="e.g. 9876543210" required />
                <InputField label="Parent's Email" id="parent_email" type="email" value={form.parent_email} onChange={e => update('parent_email')(e.target.value)} placeholder="e.g. rajesh@gmail.com" required />

                {/* Payment method */}
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif' }}>Payment Method</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <ChoiceCard selected={form.payment_mode === 'cashfree'} onClick={() => update('payment_mode')('cashfree')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CreditCard style={{ width: 20, height: 20, color: form.payment_mode === 'cashfree' ? '#00E5FF' : '#64748B', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: form.payment_mode === 'cashfree' ? '#00E5FF' : '#F8FAFC', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}>Pay Online</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>UPI, Card, Net Banking via Cashfree</div>
                        </div>
                      </div>
                    </ChoiceCard>
                    {form.mode === 'offline' && (
                      <ChoiceCard selected={form.payment_mode === 'cash'} onClick={() => update('payment_mode')('cash')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Banknote style={{ width: 20, height: 20, color: form.payment_mode === 'cash' ? '#00E5FF' : '#64748B', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: form.payment_mode === 'cash' ? '#00E5FF' : '#F8FAFC', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}>Pay at Center</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Cash or UPI at {selectedCenter?.name || 'center'}</div>
                          </div>
                        </div>
                      </ChoiceCard>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="confirm-booking-btn"
                  style={{ width: '100%', background: submitting ? '#4a1515' : '#D63031', color: '#fff', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.9rem', padding: '1.1rem', borderRadius: '0.875rem', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: submitting ? 'none' : '0 0 24px rgba(214,48,49,0.35)', transition: 'all 0.3s', marginTop: '0.5rem' }}
                >
                  <Lock style={{ width: 15, height: 15 }} />
                  {submitting ? 'Processing...' : form.payment_mode === 'cash' ? 'Confirm Booking' : 'Pay ₹1,999'}
                </button>
                <p style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'center', fontFamily: 'Outfit, sans-serif' }}>
                  Secured by Cashfree · SSL encrypted · No hidden charges
                </p>
              </form>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
