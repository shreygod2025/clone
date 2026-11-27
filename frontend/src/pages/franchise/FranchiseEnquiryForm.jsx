import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { CityCombobox } from './CityCombobox';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const EMPTY = { name: '', phone: '', email: '', city_state: '', occupation: '', occupation_other: '', has_space: '', reason: '' };
const OCCUPATIONS = ['Educator', 'Institute Owner', 'Other'];
const SPACE_OPTS = [
  { v: 'yes', l: 'Yes, I have a space' },
  { v: 'looking', l: 'Currently looking' },
  { v: 'no', l: 'No, not yet' },
];

const Field = ({ label, children }) => (
  <label className="fr-field">
    <span>{label} <b style={{ color: '#DC2626' }}>*</b></span>
    {children}
  </label>
);

const SuccessCard = () => (
  <div className="fr-form-card" data-testid="franchise-form-success" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
    <CheckCircle2 size={56} style={{ color: '#16A34A', margin: '0 auto' }} />
    <h3 className="rb-h2" style={{ fontSize: '1.8rem', color: '#0A1F44', marginTop: '1rem' }}>Thank you! We&apos;ve got your enquiry.</h3>
    <p style={{ color: '#475569', marginTop: '0.6rem', lineHeight: 1.6 }}>
      Our franchise team will call you within 2 working days. A confirmation has been sent to your email.
    </p>
  </div>
);

export const FranchiseEnquiryForm = () => {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, '').slice(-10))) { toast.error('Enter a valid 10-digit mobile number'); return; }
    if (!f.city_state) { toast.error('Please select your city'); return; }
    const occupation = f.occupation === 'Other' ? f.occupation_other.trim() : f.occupation;
    if (!occupation || occupation.length < 2) { toast.error('Please tell us your current occupation'); return; }
    if (!f.has_space) { toast.error('Tell us whether you already have a space'); return; }
    setBusy(true);
    try {
      const { occupation_other: _o, ...rest } = f;
      await axios.post(`${API}/franchise/enquiry`, { ...rest, occupation, phone: f.phone.replace(/\D/g, '').slice(-10) });
      setDone(true);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : 'Please check the form and try again');
    } finally { setBusy(false); }
  };

  if (done) return <SuccessCard />;
  return (
    <form onSubmit={submit} className="fr-form-card" data-testid="franchise-enquiry-form">
      <div className="fr-form-grid">
        <Field label="Full Name"><input required minLength={2} value={f.name} onChange={set('name')} placeholder="Your full name" data-testid="franchise-input-name" /></Field>
        <Field label="Phone Number"><input required inputMode="numeric" value={f.phone} onChange={set('phone')} placeholder="10-digit mobile" data-testid="franchise-input-phone" /></Field>
        <Field label="Email Address"><input required type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" data-testid="franchise-input-email" /></Field>
        <div className="fr-field"><span>City / State <b style={{ color: '#DC2626' }}>*</b></span>
          <CityCombobox value={f.city_state} onChange={(v) => setF((p) => ({ ...p, city_state: v }))} testid="franchise-input-city" />
        </div>
        <div style={{ gridColumn: '1 / -1' }} className="fr-field">
          <span>Current Occupation or Business <b style={{ color: '#DC2626' }}>*</b></span>
          <div className="fr-chip-row">
            {OCCUPATIONS.map((o) => (
              <button type="button" key={o} onClick={() => setF((p) => ({ ...p, occupation: o }))}
                className={`fr-chip ${f.occupation === o ? 'on' : ''}`} data-testid={`franchise-occupation-${o.toLowerCase().replace(/\s+/g, '-')}`}>{o}</button>
            ))}
          </div>
          {f.occupation === 'Other' && (
            <input value={f.occupation_other} onChange={set('occupation_other')} placeholder="Tell us what you do" style={{ marginTop: 4 }} data-testid="franchise-input-occupation-other" />
          )}
        </div>
        <div style={{ gridColumn: '1 / -1' }} className="fr-field">
          <span>Do you already have a space? <b style={{ color: '#DC2626' }}>*</b></span>
          <div className="fr-chip-row">
            {SPACE_OPTS.map((o) => (
              <button type="button" key={o.v} onClick={() => setF((p) => ({ ...p, has_space: o.v }))}
                className={`fr-chip ${f.has_space === o.v ? 'on' : ''}`} data-testid={`franchise-space-${o.v}`}>{o.l}</button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Why are you interested in an OLL franchise?">
            <textarea required minLength={5} rows={3} value={f.reason} onChange={set('reason')} placeholder="Tell us a little about your goals" data-testid="franchise-input-reason" />
          </Field>
        </div>
      </div>
      <button type="submit" disabled={busy} className="fr-cta" style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem' }} data-testid="franchise-submit-btn">
        {busy ? <Loader2 size={18} className="animate-spin" /> : <>Enquire About the Franchise <ArrowRight size={18} /></>}
      </button>
      <p style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', marginTop: '0.75rem' }}>Our team will connect with you. No spam, ever.</p>
    </form>
  );
};
