import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Check, MapPin, Wifi, CreditCard, Banknote, Lock } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CASHFREE_ENV = 'production';

const JB = "'JetBrains Mono', monospace";
const NU = "'Nunito Sans', sans-serif";

const AGE_GROUPS = [
  { slug: 'explorers',  label: 'Little Explorers',  ages: '4 – 8',   icon: '🚀', tagline: 'First steps into robotics & coding',  color: '#00E5FF' },
  { slug: 'creators',   label: 'Tech Creators',      ages: '9 – 12',  icon: '⚙️', tagline: 'Build robots and write real code',     color: '#D63031' },
  { slug: 'innovators', label: 'Future Innovators',  ages: '13 – 16', icon: '🤖', tagline: 'AI, 3D Design & advanced robotics',    color: '#7C3AED' },
];

const BATCH_WEEKS = [
  { id: 'week1', label: 'Batch 1', date: 'May 4–8, 2026' },
  { id: 'week2', label: 'Batch 2', date: 'May 11–15, 2026' },
  { id: 'week3', label: 'Batch 3', date: 'May 18–22, 2026' },
  { id: 'week4', label: 'Batch 4', date: 'May 25–29, 2026' },
];

// Steps: 0-Age | 1-Mode | 2-Center(offline) | 3-Batch | 4-Phone | 5-Details+Pay

function ProgressBar({ step, total }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden', marginBottom: '2.75rem' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#D63031,#FF6B6B)', borderRadius: 999, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.88rem', padding: 0, marginBottom: '2rem', fontFamily: NU, fontWeight: 600, letterSpacing: '0.01em' }}>
      <ArrowLeft style={{ width: 15, height: 15 }} /> Back
    </button>
  );
}

function ChoiceCard({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: selected ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.03)',
        border: selected ? '2px solid #00E5FF' : '1px solid rgba(255,255,255,0.09)',
        borderRadius: '1rem', padding: '1.35rem 1.5rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.2s', textAlign: 'left', boxSizing: 'border-box',
        boxShadow: selected ? '0 0 30px rgba(0,229,255,0.08)' : 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(0,229,255,0.35)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
    >
      {children}
      {selected && (
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#00E5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
          <Check style={{ width: 12, height: 12, color: '#080C16' }} />
        </div>
      )}
    </button>
  );
}

function InputField({ label, id, type = 'text', value, onChange, placeholder, required, autoFocus }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: JB }}>
        {label}{required && <span style={{ color: '#D63031' }}> *</span>}
      </label>
      <input
        id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} autoFocus={autoFocus}
        style={{ width: '100%', padding: '1rem 1.15rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.875rem', color: '#F8FAFC', fontSize: '1.05rem', fontFamily: NU, fontWeight: 600, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s' }}
        onFocus={e => { e.target.style.borderColor = '#00E5FF'; e.target.style.background = 'rgba(0,229,255,0.05)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
      />
    </div>
  );
}

function StepHeader({ stepNum, total, title, sub }) {
  return (
    <div style={{ marginBottom: '2.25rem' }}>
      <p style={{ fontFamily: JB, fontSize: '0.62rem', letterSpacing: '0.22em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.6rem', fontWeight: 700 }}>
        Step {stepNum} of {total}
      </p>
      <h2 style={{ fontFamily: JB, fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.2, marginBottom: sub ? '0.6rem' : 0 }}>
        {title}
      </h2>
      {sub && <p style={{ color: '#64748B', fontSize: '1rem', fontFamily: NU, fontWeight: 500, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children, type = 'button' }) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{ width: '100%', background: disabled ? '#1E293B' : '#D63031', color: disabled ? '#475569' : '#fff', fontFamily: JB, fontWeight: 700, fontSize: '1rem', padding: '1.1rem', borderRadius: '12px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: disabled ? 'none' : '0 0 28px rgba(214,48,49,0.3)', transition: 'all 0.25s', letterSpacing: '0.02em' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#e8353f'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = '#D63031'; }}
    >
      {children}
    </button>
  );
}

export default function SummerCampBookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preAge = searchParams.get('age') || '';

  const [step, setStep] = useState(preAge ? 1 : 0);
  const [capturedBookingId, setCapturedBookingId] = useState(null);
  const [centers, setCenters] = useState([]);
  const [form, setForm] = useState({
    age_group: preAge || '',
    mode: '',
    center: '',
    batch_week: '',
    batch_type: 'weekday',
    parent_phone: '',
    child_name: '',
    parent_name: '',
    parent_email: '',
    payment_mode: 'cashfree',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load Cashfree JS SDK
    if (!window.Cashfree) {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      document.head.appendChild(script);
    }
    // Fetch active non-online centers
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/centers`)
      .then(r => r.json())
      .then(data => setCenters(data.filter(c => c.is_active && !c.name?.toLowerCase().includes('online') && !c.city?.toLowerCase().includes('online'))))
      .catch(() => {});
  }, []);

  const stepsWithCenter = form.mode === 'offline';
  // Steps: 0=age 1=mode 2=center(offline) 3=batch 4=phone 5=details+pay
  const TOTAL = stepsWithCenter ? 6 : 5;

  const update = (field) => (val) => setForm(prev => ({ ...prev, [field]: val }));

  const goBack = () => {
    setError('');
    if (step === 0) { navigate('/summer-camp'); return; }
    if (step === 3 && form.mode === 'online') { setStep(1); return; }
    if (step === 4 && form.mode === 'online') { setStep(3); return; }
    setStep(s => s - 1);
  };

  const goNext = () => {
    setError('');
    if (step === 2 && form.mode === 'online') { setStep(3); return; }
    setStep(s => s + 1);
  };

  // Map logical step to visual progress position
  const visualStep = () => {
    if (stepsWithCenter) return step;
    // online: skip center (step 2)
    if (step <= 1) return step;
    return step - 1; // step 3→2, step 4→3, step 5→4
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.child_name || !form.parent_phone || !form.parent_email) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let bid = capturedBookingId;

      if (bid) {
        // Update the existing phone-captured lead
        const upd = await axios.patch(`${API}/summer-camp/complete-lead/${bid}`, {
          child_name: form.child_name,
          parent_email: form.parent_email,
          payment_mode: form.payment_mode,
        });
        bid = upd.data.booking_id;
      } else {
        // Fallback: full register (e.g. if capture-lead failed silently)
        const payload = {
          child_name: form.child_name,
          parent_name: '',
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
        bid = reg.data.booking_id;
      }

      if (form.payment_mode === 'cash') {
        navigate(`/summer-camp/success?booking_id=${bid}&payment_mode=cash`);
        return;
      }

      // Initiate Cashfree payment via JS SDK modal
      const pay = await axios.post(`${API}/summer-camp/initiate-payment`, { booking_id: bid });
      if (!pay.data.payment_session_id) {
        setError('Could not initiate payment. Please try again.');
        return;
      }

      if (!window.Cashfree) {
        setError('Payment gateway is still loading. Please try again in a moment.');
        return;
      }
      const cashfree_instance = window.Cashfree({ mode: CASHFREE_ENV });
      const result = await cashfree_instance.checkout({
        paymentSessionId: pay.data.payment_session_id,
        redirectTarget: '_modal',
      });

      if (result?.error) {
        setError(result.error.message || 'Payment failed. Please try again.');
      }
      // On success, Cashfree redirects to the return_url (/summer-camp/success)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAge = AGE_GROUPS.find(g => g.slug === form.age_group);
  const selectedBatch = BATCH_WEEKS.find(b => b.id === form.batch_week);
  const selectedCenter = centers.find(c => c.id === form.center);

  return (
    <>
      <Helmet><title>Book — Future Skills Summer Camp 2026 | OLL</title></Helmet>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: NU }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(0,229,255,0.1)', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 40, background: 'rgba(8,12,22,0.92)' }}>
          <button onClick={() => navigate('/summer-camp')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', fontFamily: JB, fontWeight: 700, fontSize: '0.88rem' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft style={{ width: 14, height: 14 }} />
            </span>
            Summer Camp 2026
          </button>
          <span style={{ fontSize: '0.82rem', color: '#475569', fontFamily: NU, fontWeight: 600 }}>
            {selectedAge ? `${selectedAge.icon}  ${selectedAge.label}` : 'Booking'}
          </span>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
          <ProgressBar step={visualStep()} total={TOTAL} />

          {error && (
            <div style={{ background: 'rgba(214,48,49,0.1)', border: '1px solid rgba(214,48,49,0.3)', borderRadius: '0.875rem', padding: '0.85rem 1.1rem', color: '#FF6B6B', fontSize: '0.95rem', fontFamily: NU, fontWeight: 500, marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {/* ── STEP 0: Age Group ── */}
          {step === 0 && (
            <div style={{ animation: 'fadeSlide 0.35s ease both' }}>
              <StepHeader stepNum={1} total={TOTAL} title="How old is your child?" sub="Each camp is designed for that specific age group's learning level." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {AGE_GROUPS.map(g => (
                  <ChoiceCard key={g.slug} selected={form.age_group === g.slug} onClick={() => { update('age_group')(g.slug); setTimeout(goNext, 200); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: '2.25rem', lineHeight: 1, flexShrink: 0 }}>{g.icon}</span>
                      <div>
                        <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '0.9rem', color: g.color, marginBottom: '0.2rem' }}>Ages {g.ages}</div>
                        <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC', marginBottom: '0.25rem' }}>{g.label}</div>
                        <div style={{ fontSize: '0.88rem', color: '#64748B', fontFamily: NU }}>{g.tagline}</div>
                      </div>
                    </div>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: Mode ── */}
          {step === 1 && (
            <div style={{ animation: 'fadeSlide 0.35s ease both' }}>
              <BackBtn onClick={goBack} />
              <StepHeader stepNum={2} total={TOTAL} title="How would you like to attend?" sub="At one of our Mumbai centers or from the comfort of home." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <ChoiceCard selected={form.mode === 'offline'} onClick={() => { update('mode')('offline'); setTimeout(goNext, 200); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '0.875rem', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin style={{ width: 22, height: 22, color: '#00E5FF' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC', marginBottom: '0.25rem' }}>At a Center</div>
                      <div style={{ fontSize: '0.88rem', color: '#64748B', fontFamily: NU }}>{centers.length ? [...new Set(centers.map(c => c.city))].join(' · ') : 'Multiple cities'}</div>
                    </div>
                  </div>
                </ChoiceCard>
                <ChoiceCard selected={form.mode === 'online'} onClick={() => { update('mode')('online'); update('center')('online'); setTimeout(() => setStep(3), 200); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '0.875rem', background: 'rgba(214,48,49,0.08)', border: '1px solid rgba(214,48,49,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wifi style={{ width: 22, height: 22, color: '#D63031' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1.05rem', color: '#F8FAFC', marginBottom: '0.25rem' }}>Online at Home</div>
                      <div style={{ fontSize: '0.88rem', color: '#64748B', fontFamily: NU }}>Live sessions via Zoom/Meet — from anywhere</div>
                    </div>
                  </div>
                </ChoiceCard>
              </div>
            </div>
          )}

          {/* ── STEP 2: Center (offline only) ── */}
          {step === 2 && (
            <div style={{ animation: 'fadeSlide 0.35s ease both' }}>
              <BackBtn onClick={goBack} />
              <StepHeader stepNum={3} total={TOTAL} title="Choose your center" sub={centers.length ? `${[...new Set(centers.map(c => c.city))].join(' · ')}` : 'Loading centers...'} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {centers.map(c => (
                  <ChoiceCard key={c.id} selected={form.center === c.id} onClick={() => { update('center')(c.id); setTimeout(goNext, 200); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }}>🏢</span>
                      <div>
                        <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1.2rem', color: '#F8FAFC', marginBottom: '0.25rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.88rem', color: '#64748B', fontFamily: NU }}>{c.area ? `${c.area}, ${c.city}` : c.address}</div>
                      </div>
                    </div>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: Batch ── */}
          {step === 3 && (
            <div style={{ animation: 'fadeSlide 0.35s ease both' }}>
              <BackBtn onClick={goBack} />
              <StepHeader stepNum={stepsWithCenter ? 4 : 3} total={TOTAL} title="Pick your batch" sub="Mon–Fri · 5 days of hands-on learning." />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {BATCH_WEEKS.map((b, i) => (
                  <ChoiceCard key={b.id} selected={form.batch_week === b.id}
                    onClick={() => { update('batch_week')(b.id); update('batch_type')('weekday'); setTimeout(goNext, 220); }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem', fontFamily: JB }}>{b.label}</div>
                      <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1.2rem', color: '#F8FAFC' }}>{b.date}</div>
                    </div>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4: Phone number only ── */}
          {step === 4 && (
            <div style={{ animation: 'fadeSlide 0.35s ease both' }}>
              <BackBtn onClick={goBack} />
              <StepHeader stepNum={stepsWithCenter ? 5 : 4} total={TOTAL} title="What's your phone number?" sub="We'll send your booking confirmation on WhatsApp." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <InputField label="Parent's Phone" id="parent_phone" type="tel" value={form.parent_phone} onChange={e => update('parent_phone')(e.target.value)} placeholder="e.g. 9876543210" required autoFocus />
                <PrimaryBtn
                  disabled={form.parent_phone.trim().length < 10}
                  onClick={async () => {
                    // Save partial lead immediately so it appears in admin even if user drops off
                    try {
                      const campRef = sessionStorage.getItem('camp_ref') || '';
                      const res = await axios.post(`${API}/summer-camp/capture-lead`, {
                        parent_phone: form.parent_phone,
                        age_group: form.age_group,
                        batch_type: form.batch_type,
                        batch_week: form.batch_week,
                        mode: form.mode,
                        center: form.mode === 'online' ? 'online' : form.center,
                        ref: campRef || undefined,
                      });
                      setCapturedBookingId(res.data.booking_id);
                    } catch (err) {
                      // Don't block the user if capture fails — they can still proceed
                      console.warn('Partial lead capture failed', err);
                    }
                    goNext();
                  }}
                >
                  Continue <ArrowRight style={{ width: 18, height: 18 }} />
                </PrimaryBtn>
              </div>
            </div>
          )}

          {/* ── STEP 5: Details + Pay ── */}
          {step === 5 && (
            <div style={{ animation: 'fadeSlide 0.35s ease both' }}>
              <BackBtn onClick={goBack} />
              <StepHeader stepNum={stepsWithCenter ? 6 : 5} total={TOTAL} title="Almost there!" sub="Just a few more details to confirm your spot." />

              {/* Order summary */}
              <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.88rem', color: '#94A3B8', fontFamily: NU }}>{selectedAge?.icon} {selectedAge?.label} · Ages {selectedAge?.ages}</span>
                {selectedBatch && <span style={{ fontSize: '0.88rem', color: '#94A3B8', fontFamily: NU }}>{selectedBatch[form.batch_type]}</span>}
                <span style={{ fontSize: '0.88rem', color: '#94A3B8', fontFamily: NU }}>{form.mode === 'online' ? '💻 Online' : `🏢 ${selectedCenter?.name || ''}`}</span>
                <span style={{ fontFamily: JB, fontWeight: 900, color: '#00E5FF', fontSize: '1.1rem' }}>₹1,999</span>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                <InputField label="Child's Name"   id="child_name"   value={form.child_name}   onChange={e => update('child_name')(e.target.value)}   placeholder="e.g. Aryan Kumar"    required autoFocus />
                <InputField label="Parent's Email" id="parent_email" type="email" value={form.parent_email} onChange={e => update('parent_email')(e.target.value)} placeholder="e.g. rajesh@gmail.com" required />

                {/* Payment method */}
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '0.85rem', fontFamily: JB }}>Payment Method</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <ChoiceCard selected={form.payment_mode === 'cashfree'} onClick={() => update('payment_mode')('cashfree')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: form.payment_mode === 'cashfree' ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.payment_mode === 'cashfree' ? 'rgba(0,229,255,0.3)' : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CreditCard style={{ width: 20, height: 20, color: form.payment_mode === 'cashfree' ? '#00E5FF' : '#64748B' }} />
                        </div>
                        <div>
                          <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1rem', color: form.payment_mode === 'cashfree' ? '#00E5FF' : '#F8FAFC', marginBottom: '0.2rem' }}>Pay Online</div>
                          <div style={{ fontSize: '0.85rem', color: '#64748B', fontFamily: NU }}>UPI, Card, Net Banking via Cashfree</div>
                        </div>
                      </div>
                    </ChoiceCard>
                    {form.mode === 'offline' && (
                      <ChoiceCard selected={form.payment_mode === 'cash'} onClick={() => update('payment_mode')('cash')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: form.payment_mode === 'cash' ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.payment_mode === 'cash' ? 'rgba(0,229,255,0.3)' : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Banknote style={{ width: 20, height: 20, color: form.payment_mode === 'cash' ? '#00E5FF' : '#64748B' }} />
                          </div>
                          <div>
                            <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1rem', color: form.payment_mode === 'cash' ? '#00E5FF' : '#F8FAFC', marginBottom: '0.2rem' }}>Pay at Center</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748B', fontFamily: NU }}>Cash or UPI at {selectedCenter?.name || 'center'}</div>
                          </div>
                        </div>
                      </ChoiceCard>
                    )}
                  </div>
                </div>

                <PrimaryBtn type="submit" disabled={submitting}>
                  <Lock style={{ width: 15, height: 15 }} />
                  {submitting ? 'Processing...' : form.payment_mode === 'cash' ? 'Confirm Booking' : 'Pay ₹1,999'}
                </PrimaryBtn>
                <p style={{ fontSize: '0.78rem', color: '#334155', textAlign: 'center', fontFamily: NU }}>
                  Secured by Cashfree · SSL encrypted · No hidden charges
                </p>
              </form>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Nunito+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: #334155; }
      `}</style>
    </>
  );
}
