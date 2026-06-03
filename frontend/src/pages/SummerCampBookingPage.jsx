import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Check, MapPin, Bell, Sparkles } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const JB = "'JetBrains Mono', monospace";
const NU = "'Nunito Sans', sans-serif";

// Steps: 0-Age | 1-Center | 2-Phone | 3-Confirmation
const TOTAL = 4;

const AGE_GROUPS = [
  { slug: 'explorers',  label: 'Little Explorers',  ages: '4 – 8',   icon: '🚀', tagline: 'First steps into robotics & coding',  color: '#00E5FF' },
  { slug: 'creators',   label: 'Tech Creators',      ages: '9 – 12',  icon: '⚙️', tagline: 'Build robots and write real code',     color: '#D63031' },
  { slug: 'innovators', label: 'Future Innovators',  ages: '13 – 16', icon: '🤖', tagline: 'AI, 3D Design & advanced robotics',    color: '#7C3AED' },
];

const NSCI_CENTER = {
  id: 'oll_nsci_south_mumbai',
  name: 'OLL x NSCI — South Mumbai',
  address_line1: 'Lala Lajpatrai Marg, Lotus Colony, Worli',
  city: 'Mumbai',
  area: 'Worli',
  is_active: true,
  is_partner: true,
};

function ProgressBar({ step }) {
  const pct = Math.round(((step + 1) / TOTAL) * 100);
  return (
    <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden', marginBottom: '2.75rem' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#D63031,#FF6B6B)', borderRadius: 999, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.88rem', padding: 0, marginBottom: '2rem', fontFamily: NU, fontWeight: 600 }}>
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
        style={{ width: '100%', padding: '0.95rem 1.1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.875rem', color: '#F8FAFC', fontSize: '1rem', outline: 'none', fontFamily: NU, transition: 'all 0.2s', boxSizing: 'border-box' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#00E5FF'; e.currentTarget.style.background = 'rgba(0,229,255,0.04)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      />
    </div>
  );
}

function PrimaryBtn({ disabled, onClick, children, type = 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%', background: disabled ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#D63031,#FF6B6B)',
        color: disabled ? '#475569' : '#fff', fontWeight: 800, fontSize: '1rem',
        padding: '1rem 1.5rem', border: 'none', borderRadius: '0.875rem',
        cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: JB, letterSpacing: '0.04em',
        boxShadow: disabled ? 'none' : '0 12px 30px rgba(214,48,49,0.3)',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}

function StepHeader({ stepNum, title, sub }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ fontFamily: JB, fontSize: '0.72rem', fontWeight: 700, color: '#00E5FF', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Step {stepNum} of {TOTAL}</div>
      <h1 style={{ fontFamily: JB, fontSize: 'clamp(1.5rem, 3.5vw, 1.85rem)', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.2, marginBottom: '0.55rem' }}>{title}</h1>
      <p style={{ fontSize: '1rem', color: '#64748B', fontFamily: NU, lineHeight: 1.55 }}>{sub}</p>
    </div>
  );
}

export default function SummerCampBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preAge = searchParams.get('age') || '';

  const [step, setStep] = useState(preAge ? 1 : 0);
  const [centers, setCenters] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    age_group: preAge || '',
    center: '',
    parent_phone: '',
  });

  useEffect(() => {
    fetch(`${API}/centers`)
      .then(r => r.json())
      .then(data => {
        const regular = (data || []).filter(c => c.is_active && !c.name?.toLowerCase().includes('online'));
        setCenters([NSCI_CENTER, ...regular]);
      })
      .catch(() => setCenters([NSCI_CENTER]));
  }, []);

  const update = (field) => (val) => setForm(prev => ({ ...prev, [field]: val }));

  const goBack = () => {
    setError('');
    if (step === 0) { navigate('/summer-camp'); return; }
    setStep(s => s - 1);
  };

  const submitBroadcastLead = async () => {
    if (!/^\d{10,15}$/.test(form.parent_phone.replace(/\D/g, ''))) {
      setError('Please enter a valid phone number.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const campRef = sessionStorage.getItem('camp_ref') || '';
      await axios.post(`${API}/summer-camp/capture-lead`, {
        parent_phone: form.parent_phone,
        age_group: form.age_group,
        batch_type: 'weekday',
        batch_week: '',
        mode: 'offline',
        center: form.center,
        is_broadcast_lead: true,
        crm_status: 'broadcast_only',
        broadcast_tag: 'summer_camp_2026_closed_waitlist',
        ref: campRef || undefined,
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAge = AGE_GROUPS.find(g => g.slug === form.age_group);
  const selectedCenter = centers.find(c => c.id === form.center);

  return (
    <>
      <Helmet><title>Join Broadcast — Future Skills Summer Camp | OLL</title></Helmet>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: NU }} data-testid="summer-camp-booking-page">

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(0,229,255,0.1)', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 40, background: 'rgba(8,12,22,0.92)' }}>
          <button onClick={() => navigate('/summer-camp')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', fontFamily: JB, fontWeight: 700, fontSize: '0.88rem' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft style={{ width: 14, height: 14 }} />
            </span>
            Summer Camp
          </button>
          <span style={{ fontSize: '0.82rem', color: '#475569', fontFamily: NU, fontWeight: 600 }}>
            {selectedAge ? `${selectedAge.icon}  ${selectedAge.label}` : 'Join Broadcast'}
          </span>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
          {step < 3 && <ProgressBar step={step} />}

          {error && (
            <div style={{ background: 'rgba(214,48,49,0.1)', border: '1px solid rgba(214,48,49,0.3)', borderRadius: '0.875rem', padding: '0.85rem 1.1rem', color: '#FF6B6B', fontSize: '0.95rem', fontFamily: NU, fontWeight: 500, marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {/* ── STEP 0: Age Group ── */}
          {step === 0 && (
            <div style={{ animation: 'fadeSlide 0.35s ease both' }}>
              <StepHeader stepNum={1} title="How old is your child?" sub="Each camp is tailored for that specific age group's learning level." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {AGE_GROUPS.map(g => (
                  <ChoiceCard
                    key={g.slug}
                    selected={form.age_group === g.slug}
                    onClick={() => { update('age_group')(g.slug); setTimeout(() => setStep(1), 200); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: '2.25rem', lineHeight: 1, flexShrink: 0 }}>{g.icon}</span>
                      <div>
                        <div style={{ fontFamily: JB, fontWeight: 800, fontSize: '1.2rem', color: '#F8FAFC', marginBottom: '0.2rem' }}>Ages {g.ages}</div>
                        <div style={{ fontSize: '0.88rem', color: '#64748B', fontFamily: NU }}>{g.tagline}</div>
                      </div>
                    </div>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: Center ── */}
          {step === 1 && (
            <div style={{ animation: 'fadeSlide 0.35s ease both' }}>
              <BackBtn onClick={goBack} />
              <StepHeader stepNum={2} title="Choose your center" sub={centers.length ? `Available in ${[...new Set(centers.map(c => c.city))].join(' · ')}` : 'Loading centers...'} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {centers.map(c => (
                  <ChoiceCard key={c.id} selected={form.center === c.id} onClick={() => { update('center')(c.id); setTimeout(() => setStep(2), 200); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 46, height: 46, borderRadius: '0.875rem', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MapPin style={{ width: 20, height: 20, color: '#00E5FF' }} />
                      </div>
                      <div>
                        <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1.08rem', color: '#F8FAFC', marginBottom: '0.25rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.88rem', color: '#64748B', fontFamily: NU }}>{c.area ? `${c.area}, ${c.city}` : c.address}</div>
                      </div>
                    </div>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Phone ── */}
          {step === 2 && (
            <div style={{ animation: 'fadeSlide 0.35s ease both' }}>
              <BackBtn onClick={goBack} />
              <StepHeader stepNum={3} title="Last step — your phone number" sub="We'll add you to our broadcast list for the upcoming workshops & annual classes." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <InputField label="Parent's Phone" id="parent_phone" type="tel" value={form.parent_phone} onChange={e => update('parent_phone')(e.target.value)} placeholder="e.g. 9876543210" required autoFocus />
                <PrimaryBtn
                  disabled={submitting || form.parent_phone.trim().length < 10}
                  onClick={submitBroadcastLead}
                >
                  {submitting ? 'Submitting...' : <>Join Broadcast <ArrowRight style={{ width: 18, height: 18 }} /></>}
                </PrimaryBtn>
                <p style={{ fontSize: '0.78rem', color: '#334155', textAlign: 'center', fontFamily: NU }}>
                  We'll only message you about new programs. No spam, ever.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Broadcast confirmation ── */}
          {step === 3 && (
            <div style={{ animation: 'fadeSlide 0.45s ease both', textAlign: 'center', paddingTop: '1.5rem' }} data-testid="broadcast-confirmation">
              <div style={{ display: 'inline-flex', width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Bell style={{ width: 32, height: 32, color: '#00E5FF' }} />
              </div>
              <h1 style={{ fontFamily: JB, fontSize: 'clamp(1.45rem, 3.5vw, 1.85rem)', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.25, marginBottom: '0.85rem' }}>
                Summer Camps 2026 are over
              </h1>
              <p style={{ fontSize: '1.02rem', color: '#94A3B8', fontFamily: NU, lineHeight: 1.6, maxWidth: 460, margin: '0 auto 2rem' }}>
                Thank you for your interest! We've added <span style={{ color: '#00E5FF', fontWeight: 700 }}>{form.parent_phone}</span> to our broadcast list. You'll be the first to hear about upcoming workshops and our annual classes — including our flagship <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Continuous Learning Program</span>.
              </p>

              <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '1rem', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.85rem' }}>
                  <Sparkles style={{ width: 18, height: 18, color: '#00E5FF' }} />
                  <span style={{ fontFamily: JB, fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC' }}>What's next?</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    'Upcoming weekend workshops & holiday camps',
                    'Annual Continuous Learning Program (Robotics, Coding, AI, 3D Design)',
                    'Early-bird discounts & priority slot allocation',
                  ].map(t => (
                    <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.92rem', color: '#94A3B8', fontFamily: NU, lineHeight: 1.5 }}>
                      <Check style={{ width: 16, height: 16, color: '#22C55E', flexShrink: 0, marginTop: 2 }} />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <PrimaryBtn onClick={() => navigate('/future-skills')}>
                  Explore Continuous Learning Program <ArrowRight style={{ width: 18, height: 18 }} />
                </PrimaryBtn>
                <button
                  onClick={() => navigate('/')}
                  style={{ width: '100%', padding: '0.85rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.875rem', color: '#94A3B8', fontFamily: JB, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', letterSpacing: '0.04em' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94A3B8'; }}
                >
                  Back to Home
                </button>
              </div>

              {selectedCenter && (
                <p style={{ marginTop: '2rem', fontSize: '0.76rem', color: '#334155', fontFamily: JB, letterSpacing: '0.04em' }}>
                  Tagged for: {selectedAge?.label || ''} · {selectedCenter.name}
                </p>
              )}
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
