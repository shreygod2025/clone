import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, Lock, CreditCard, Banknote, MapPin, Wifi, ArrowLeft, Check } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AGE_GROUPS = {
  explorers: { label: 'Little Explorers', ages: '4-8', color: '#00E5FF' },
  creators: { label: 'Tech Creators', ages: '9-12', color: '#D63031' },
  innovators: { label: 'Future Innovators', ages: '13-16', color: '#7C3AED' },
};

const CENTERS = [
  { id: 'mira_road', name: 'Mira Road', address: 'OLL Center, Mira Road, Mumbai', offline: true },
  { id: 'dombivli', name: 'Dombivli - Pallava', address: 'OLL Center, Pallava, Dombivli', offline: true },
  { id: 'andheri', name: 'Andheri West - Lokhandwala', address: 'OLL Center, Lokhandwala', offline: true },
  { id: 'online', name: 'Online at Home', address: 'Live via Zoom/Google Meet', offline: false },
];

const BATCH_WEEKS = [
  { id: 'week1', weekday: 'May 1-5, 2026', weekend: 'May 2-3, 2026' },
  { id: 'week2', weekday: 'May 8-12, 2026', weekend: 'May 9-10, 2026' },
  { id: 'week3', weekday: 'May 15-19, 2026', weekend: 'May 16-17, 2026' },
  { id: 'week4', weekday: 'May 22-26, 2026', weekend: 'May 23-24, 2026' },
];

function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: i < step ? '#D63031' : i === step ? 'rgba(214,48,49,0.2)' : 'rgba(255,255,255,0.1)',
              border: i === step ? '2px solid #D63031' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: i < step ? '#fff' : i === step ? '#D63031' : '#64748B',
              fontFamily: 'Outfit, sans-serif',
              transition: 'all 0.3s',
            }}
          >
            {i < step ? <Check style={{ width: 14, height: 14 }} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{ width: 24, height: 2, background: i < step ? '#D63031' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function InputField({ label, id, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Outfit, sans-serif' }}>
        {label}{required && <span style={{ color: '#D63031' }}> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'rgba(30,58,95,0.3)',
          border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: '0.75rem',
          color: '#F8FAFC',
          fontSize: '0.95rem',
          fontFamily: 'Outfit, sans-serif',
          outline: 'none',
          transition: 'border-color 0.2s',
          boxSizing: 'border-box',
        }}
        onFocus={e => { e.target.style.borderColor = '#00E5FF'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(0,229,255,0.2)'; }}
      />
    </div>
  );
}

export default function SummerCampBookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ageGroupParam = searchParams.get('age') || 'explorers';
  const camp = AGE_GROUPS[ageGroupParam] || AGE_GROUPS.explorers;

  const [step, setStep] = useState(0); // 0: details, 1: batch+center, 2: payment
  const [form, setForm] = useState({
    child_name: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    age_group: ageGroupParam,
    batch_type: 'weekday',
    batch_week: 'week1',
    mode: 'offline',
    center: 'mira_road',
    payment_mode: 'cashfree',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState(null);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleStep0 = (e) => {
    e.preventDefault();
    if (!form.child_name || !form.parent_name || !form.parent_phone || !form.parent_email) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setStep(1);
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const regResp = await axios.post(`${API}/summer-camp/register`, form);
      const bid = regResp.data.booking_id;
      setBookingId(bid);

      if (form.payment_mode === 'cash') {
        navigate(`/summer-camp/success?booking_id=${bid}&payment_mode=cash`);
        return;
      }

      // Initiate Cashfree payment
      const payResp = await axios.post(`${API}/summer-camp/initiate-payment`, { booking_id: bid });
      if (payResp.data.payment_link) {
        window.location.href = payResp.data.payment_link;
      } else {
        setError('Could not initiate payment. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBatch = BATCH_WEEKS.find(b => b.id === form.batch_week);
  const selectedCenter = CENTERS.find(c => c.id === form.center);

  return (
    <>
      <Helmet>
        <title>Book — Future Skills Summer Camp 2026 | OLL</title>
      </Helmet>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
        <Navbar />

        <div className="max-w-2xl mx-auto px-6 py-12">
          {/* Back button */}
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate(`/summer-camp/${ageGroupParam}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '2rem', padding: 0 }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Back
          </button>

          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '4px 14px', borderRadius: '999px',
                background: `${camp.color}18`, border: `1px solid ${camp.color}44`,
                marginBottom: '0.75rem',
              }}
            >
              <span style={{ fontSize: '0.7rem', color: camp.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                {camp.label} · Ages {camp.ages}
              </span>
            </div>
            <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, color: '#F8FAFC', marginBottom: '0.5rem' }}>
              Book Your Spot
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Future Skills Summer Camp 2026 · ₹1,999 / child</p>
          </div>

          <StepIndicator step={step} total={3} />

          {error && (
            <div style={{ background: 'rgba(214,48,49,0.12)', border: '1px solid rgba(214,48,49,0.3)', borderRadius: '0.75rem', padding: '0.75rem 1rem', color: '#FF6B6B', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {/* STEP 0: Child & Parent Details */}
          {step === 0 && (
            <form onSubmit={handleStep0}>
              <div
                style={{
                  background: 'rgba(30,58,95,0.3)',
                  border: '1px solid rgba(0,229,255,0.15)',
                  borderRadius: '1.5rem',
                  padding: '2rem',
                }}
              >
                <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.5rem' }}>
                  Child & Parent Details
                </h2>
                <div className="flex flex-col gap-4">
                  <InputField label="Child's Name" id="child_name" value={form.child_name} onChange={update('child_name')} placeholder="e.g. Aryan Kumar" required />
                  <InputField label="Parent's Name" id="parent_name" value={form.parent_name} onChange={update('parent_name')} placeholder="e.g. Rajesh Kumar" required />
                  <InputField label="Parent's Phone" id="parent_phone" type="tel" value={form.parent_phone} onChange={update('parent_phone')} placeholder="e.g. 9876543210" required />
                  <InputField label="Parent's Email" id="parent_email" type="email" value={form.parent_email} onChange={update('parent_email')} placeholder="e.g. rajesh@gmail.com" required />
                </div>
              </div>
              <button
                type="submit"
                data-testid="step-next-btn"
                style={{
                  width: '100%', marginTop: '1.5rem',
                  background: '#D63031', color: '#fff',
                  fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                  padding: '1rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                Continue
                <ChevronRight style={{ width: 18, height: 18 }} />
              </button>
            </form>
          )}

          {/* STEP 1: Batch & Center */}
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <div
                style={{
                  background: 'rgba(30,58,95,0.3)',
                  border: '1px solid rgba(0,229,255,0.15)',
                  borderRadius: '1.5rem',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.75rem',
                }}
              >
                <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                  Choose Your Batch
                </h2>

                {/* Batch type */}
                <div>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: 600 }}>Schedule</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { v: 'weekday', label: 'Weekday', sub: 'Mon–Fri · 1hr/day' },
                      { v: 'weekend', label: 'Weekend', sub: 'Sat–Sun · 2.5hrs/day' },
                    ].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, batch_type: opt.v }))}
                        style={{
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          border: form.batch_type === opt.v ? '2px solid #00E5FF' : '1px solid rgba(0,229,255,0.2)',
                          background: form.batch_type === opt.v ? 'rgba(0,229,255,0.1)' : 'rgba(30,58,95,0.2)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: form.batch_type === opt.v ? '#00E5FF' : '#F8FAFC' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Batch week */}
                <div>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: 600 }}>Start Date</p>
                  <div className="flex flex-col gap-2">
                    {BATCH_WEEKS.map((w, i) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, batch_week: w.id }))}
                        style={{
                          padding: '0.9rem 1.25rem',
                          borderRadius: '0.75rem',
                          border: form.batch_week === w.id ? '2px solid #00E5FF' : '1px solid rgba(0,229,255,0.15)',
                          background: form.batch_week === w.id ? 'rgba(0,229,255,0.08)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'all 0.2s',
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>Batch {i + 1}</span>
                        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600, fontSize: '0.82rem', color: form.batch_week === w.id ? '#00E5FF' : '#CBD5E1' }}>
                          {w[form.batch_type]}
                        </span>
                        {form.batch_week === w.id && <Check style={{ width: 16, height: 16, color: '#00E5FF', flexShrink: 0 }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: 600 }}>Mode</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { v: 'offline', label: 'At Center', icon: MapPin },
                      { v: 'online', label: 'Online', icon: Wifi },
                    ].map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, mode: opt.v, center: opt.v === 'online' ? 'online' : 'mira_road' }))}
                          style={{
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            border: form.mode === opt.v ? '2px solid #00E5FF' : '1px solid rgba(0,229,255,0.2)',
                            background: form.mode === opt.v ? 'rgba(0,229,255,0.1)' : 'rgba(30,58,95,0.2)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            transition: 'all 0.2s',
                          }}
                        >
                          <Icon style={{ width: 18, height: 18, color: form.mode === opt.v ? '#00E5FF' : '#94A3B8' }} />
                          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: form.mode === opt.v ? '#00E5FF' : '#F8FAFC' }}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Center (if offline) */}
                {form.mode === 'offline' && (
                  <div>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', fontWeight: 600 }}>Select Center</p>
                    <div className="flex flex-col gap-2">
                      {CENTERS.filter(c => c.offline).map(center => (
                        <button
                          key={center.id}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, center: center.id }))}
                          style={{
                            padding: '1rem 1.25rem',
                            borderRadius: '0.75rem',
                            border: form.center === center.id ? '2px solid #00E5FF' : '1px solid rgba(0,229,255,0.15)',
                            background: form.center === center.id ? 'rgba(0,229,255,0.08)' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 12,
                            transition: 'all 0.2s',
                          }}
                        >
                          <MapPin style={{ width: 18, height: 18, color: form.center === center.id ? '#00E5FF' : '#64748B', flexShrink: 0 }} />
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: form.center === center.id ? '#00E5FF' : '#F8FAFC' }}>{center.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>{center.address}</div>
                          </div>
                          {form.center === center.id && <Check style={{ width: 16, height: 16, color: '#00E5FF', marginLeft: 'auto' }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="submit"
                data-testid="step-batch-next-btn"
                style={{
                  width: '100%', marginTop: '1.5rem',
                  background: '#D63031', color: '#fff',
                  fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                  padding: '1rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                Continue to Payment
                <ChevronRight style={{ width: 18, height: 18 }} />
              </button>
            </form>
          )}

          {/* STEP 2: Payment */}
          {step === 2 && (
            <form onSubmit={handleSubmit}>
              {/* Order Summary */}
              <div
                style={{
                  background: 'rgba(30,58,95,0.3)',
                  border: '1px solid rgba(0,229,255,0.15)',
                  borderRadius: '1.5rem',
                  padding: '1.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem' }}>Order Summary</h2>
                <div className="flex flex-col gap-2" style={{ fontSize: '0.88rem', color: '#94A3B8' }}>
                  {[
                    ['Child', form.child_name],
                    ['Camp', `${camp.label} (Ages ${camp.ages})`],
                    ['Batch', `${selectedBatch?.[form.batch_type]} (${form.batch_type === 'weekday' ? 'Mon-Fri' : 'Sat-Sun'})`],
                    ['Mode', form.mode === 'online' ? 'Online at Home' : `At Center — ${selectedCenter?.name || ''}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>{k}</span>
                      <span style={{ color: '#CBD5E1', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
                    <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, color: '#F8FAFC', fontSize: '1rem' }}>Total</span>
                    <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, color: '#00E5FF', fontSize: '1.25rem' }}>₹1,999</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div
                style={{
                  background: 'rgba(30,58,95,0.3)',
                  border: '1px solid rgba(0,229,255,0.15)',
                  borderRadius: '1.5rem',
                  padding: '1.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem' }}>Payment Method</h2>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, payment_mode: 'cashfree' }))}
                    style={{
                      padding: '1rem 1.25rem', borderRadius: '0.75rem',
                      border: form.payment_mode === 'cashfree' ? '2px solid #00E5FF' : '1px solid rgba(0,229,255,0.2)',
                      background: form.payment_mode === 'cashfree' ? 'rgba(0,229,255,0.08)' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s',
                    }}
                  >
                    <CreditCard style={{ width: 20, height: 20, color: form.payment_mode === 'cashfree' ? '#00E5FF' : '#94A3B8' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, color: form.payment_mode === 'cashfree' ? '#00E5FF' : '#F8FAFC', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}>Pay Online</div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>UPI, Card, Net Banking via Cashfree</div>
                    </div>
                    {form.payment_mode === 'cashfree' && <Check style={{ width: 16, height: 16, color: '#00E5FF', marginLeft: 'auto' }} />}
                  </button>

                  {form.mode === 'offline' && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, payment_mode: 'cash' }))}
                      style={{
                        padding: '1rem 1.25rem', borderRadius: '0.75rem',
                        border: form.payment_mode === 'cash' ? '2px solid #00E5FF' : '1px solid rgba(0,229,255,0.2)',
                        background: form.payment_mode === 'cash' ? 'rgba(0,229,255,0.08)' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s',
                      }}
                    >
                      <Banknote style={{ width: 20, height: 20, color: form.payment_mode === 'cash' ? '#00E5FF' : '#94A3B8' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: form.payment_mode === 'cash' ? '#00E5FF' : '#F8FAFC', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}>Pay at Center</div>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Cash / UPI at {selectedCenter?.name || 'center'}</div>
                      </div>
                      {form.payment_mode === 'cash' && <Check style={{ width: 16, height: 16, color: '#00E5FF', marginLeft: 'auto' }} />}
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                data-testid="confirm-payment-btn"
                style={{
                  width: '100%',
                  background: submitting ? '#4a1515' : '#D63031', color: '#fff',
                  fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                  padding: '1rem', borderRadius: '0.75rem', border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: submitting ? 'none' : '0 0 24px rgba(214,48,49,0.35)',
                  transition: 'all 0.3s',
                }}
              >
                <Lock style={{ width: 16, height: 16 }} />
                {submitting ? 'Processing...' : form.payment_mode === 'cash' ? 'Confirm Booking (Pay at Center)' : 'Proceed to Pay ₹1,999'}
              </button>
              <p style={{ fontSize: '0.72rem', color: '#64748B', textAlign: 'center', marginTop: '0.75rem' }}>
                Secured by Cashfree · SSL encrypted
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
