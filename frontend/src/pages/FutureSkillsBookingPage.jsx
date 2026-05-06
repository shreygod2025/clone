import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Loader2, Shield, Check, Gift, Sparkles, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Tiered grades — curriculum hint shown next to selector
const GRADE_TIERS = [
  { label: 'Junior · Grades 1–4',  hint: 'Story-led robotics · Block coding (Scratch) · AI play · Intro 3D',  grades: ['1','2','3','4'] },
  { label: 'Middle · Grades 5–7',  hint: 'Sensor robotics · Python intro · AI tools · Tinkercad 3D',         grades: ['5','6','7'] },
  { label: 'Senior · Grades 8–10', hint: 'Advanced robotics + IoT · Python projects · ML basics · Fusion 360', grades: ['8','9','10'] },
];

const CENTERS = [
  'Mumbai · Andheri',
  'Mumbai · Borivali',
  'Mumbai · Mira Road',
  'Mumbai · Thane',
  'Navi Mumbai · Vashi',
  'Pune · Kothrud',
  'Pune · Hinjewadi',
  'Bengaluru · Indiranagar',
  'Bengaluru · Whitefield',
  'Hyderabad · Madhapur',
  'Delhi NCR · Gurugram',
  'Other / Help me pick',
];

const tierForGrade = (g) => GRADE_TIERS.find(t => t.grades.includes(String(g)));

const initialForm = {
  parent_name: '', parent_phone: '', parent_email: '',
  student_name: '', student_grade: '',
  preferred_center: '', preferred_skill: '',
  notes: '',
};

const FutureSkillsBookingPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'subscribe' ? 'subscribe' : 'trial';
  const [plan, setPlan] = useState(params.get('plan') === 'monthly' ? 'monthly' : 'yearly');
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const valid = () => {
    if (!form.parent_name.trim()) return 'Parent name is required';
    if (!/^[6-9]\d{9}$/.test(form.parent_phone.replace(/\D/g, '').slice(-10))) return 'Enter a valid 10-digit phone';
    if (!/^\S+@\S+\.\S+$/.test(form.parent_email)) return 'Enter a valid email';
    if (!form.student_name.trim()) return 'Student name is required';
    if (!form.student_grade) return 'Select student grade';
    if (!form.preferred_center) return 'Pick your preferred centre';
    return null;
  };

  const handleTrial = async () => {
    setSubmitting(true);
    try {
      const r = await axios.post(`${API}/future-skills/register-trial`, {
        ...form,
        parent_phone: form.parent_phone.replace(/\D/g, '').slice(-10),
        source_ref: params.get('ref') || '',
      });
      const trialRef = r.data?.trial_ref;
      toast.success('Trial class booked — we\'ll WhatsApp you shortly!');
      navigate(`/future-skills/success?type=trial&ref=${trialRef}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubscribe = async () => {
    setSubmitting(true);
    try {
      const sub = await axios.post(`${API}/future-skills/subscribe`, {
        ...form,
        parent_phone: form.parent_phone.replace(/\D/g, '').slice(-10),
        plan,
        source_ref: params.get('ref') || '',
      });
      const subId = sub.data?.subscription_id;
      if (!subId) throw new Error('Subscription creation failed');
      const pay = await axios.post(`${API}/future-skills/initiate-payment`, {
        subscription_id: subId,
        frontend_url: process.env.REACT_APP_BACKEND_URL,
      });
      const link = pay.data?.payment_link;
      if (!link) throw new Error('Could not initiate payment');
      toast.success('Redirecting to secure payment…');
      window.location.href = link;
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Subscription failed');
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = valid();
    if (err) { toast.error(err); return; }
    if (mode === 'trial') handleTrial();
    else handleSubscribe();
  };

  const PRICE = { monthly: 2000, yearly: 21000 };
  const PRICE_DISPLAY = { monthly: '₹2,000/mo', yearly: '₹1,750/mo · ₹21,000/yr' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-white" data-testid="future-skills-booking">
      <Helmet><title>{mode === 'trial' ? 'Book Free Trial' : 'Subscribe'} · Future Skills | OLL</title></Helmet>
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/future-skills" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#D63031] mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to program
        </Link>

        <div className="grid lg:grid-cols-12 gap-6">
          <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border-2 border-slate-100 rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/40 space-y-5">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#D63031] uppercase">
                <Sparkles className="w-3.5 h-3.5" /> {mode === 'trial' ? 'Single-page trial booking' : 'Subscribe & save'}
              </span>
              <h1 className="text-2xl lg:text-3xl font-black text-[#0F1E33] mt-1">
                {mode === 'trial' ? 'Book a Free Trial Class' : 'Subscribe to Future Skills'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {mode === 'trial' ? 'No payment now — we\'ll WhatsApp to confirm date & centre.' : 'Cancel anytime. Robotic kit free with yearly.'}
              </p>
            </div>

            {/* Plan switcher (only in subscribe mode) */}
            {mode === 'subscribe' && (
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl">
                {[
                  { key: 'monthly', label: 'Monthly · ₹2,000/mo' },
                  { key: 'yearly',  label: 'Yearly · ₹1,750/mo · Save ₹3,000 + Free Kit' },
                ].map(p => (
                  <button type="button" key={p.key}
                    onClick={() => setPlan(p.key)}
                    className={`text-xs px-3 py-2.5 rounded-lg font-bold transition-all ${
                      plan === p.key ? 'bg-white text-[#0F1E33] shadow' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    data-testid={`plan-toggle-${p.key}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Parent Name *">
                <input value={form.parent_name} onChange={e => update('parent_name', e.target.value)}
                  className="fs-input" placeholder="Anita Sharma" required data-testid="parent-name-input" />
              </Field>
              <Field label="Phone (WhatsApp) *">
                <input type="tel" inputMode="numeric" maxLength={15}
                  value={form.parent_phone} onChange={e => update('parent_phone', e.target.value)}
                  className="fs-input" placeholder="98XXXXXXXX" required data-testid="parent-phone-input" />
              </Field>
              <Field label="Email *" className="sm:col-span-2">
                <input type="email" value={form.parent_email} onChange={e => update('parent_email', e.target.value)}
                  className="fs-input" placeholder="parent@email.com" required data-testid="parent-email-input" />
              </Field>
              <Field label="Student Name *">
                <input value={form.student_name} onChange={e => update('student_name', e.target.value)}
                  className="fs-input" placeholder="Aanya" required data-testid="student-name-input" />
              </Field>
              <Field label="Grade *">
                <select value={form.student_grade} onChange={e => update('student_grade', e.target.value)}
                  className="fs-input" required data-testid="student-grade-input">
                  <option value="">Select grade…</option>
                  {GRADE_TIERS.map(t => (
                    <optgroup key={t.label} label={t.label}>
                      {t.grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </optgroup>
                  ))}
                </select>
                {form.student_grade && tierForGrade(form.student_grade) && (
                  <div className="mt-2 text-[11px] text-[#1E3A5F] bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                    <span className="font-bold text-[#D63031]">{tierForGrade(form.student_grade).label}:</span>{' '}
                    {tierForGrade(form.student_grade).hint}
                  </div>
                )}
              </Field>
              <Field label="Preferred Centre *" className="sm:col-span-2">
                <select value={form.preferred_center} onChange={e => update('preferred_center', e.target.value)}
                  className="fs-input" required data-testid="preferred-center-input">
                  <option value="">Pick your nearest centre…</option>
                  {CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Offline only — we'll confirm your batch slot within 24h.</p>
              </Field>
              {mode === 'trial' && (
                <Field label="What interests you most? (optional)" className="sm:col-span-2">
                  <select value={form.preferred_skill} onChange={e => update('preferred_skill', e.target.value)}
                    className="fs-input" data-testid="preferred-skill-input">
                    <option value="">Surprise us · sample all</option>
                    <option value="robotics">Robotics</option>
                    <option value="coding">Coding</option>
                    <option value="ai">Artificial Intelligence</option>
                    <option value="3d">3D Design</option>
                    <option value="emerging">Emerging Tech</option>
                  </select>
                </Field>
              )}
              <Field label="Anything we should know? (optional)" className="sm:col-span-2">
                <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
                  className="fs-input min-h-[64px]" rows={2} placeholder="Special interests, accessibility needs…"
                  data-testid="notes-input" />
              </Field>
            </div>

            <button type="submit" disabled={submitting}
              className={`w-full py-4 rounded-xl text-white font-bold text-base transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                mode === 'trial' ? 'bg-gradient-to-r from-[#D63031] to-[#1E3A5F] hover:from-[#B52828] hover:to-[#0F1E33] shadow-lg shadow-blue-900/25'
                                 : 'bg-[#1E3A5F] hover:bg-[#0F1E33] shadow-lg shadow-blue-900/20'
              }`}
              data-testid="submit-btn">
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> {mode === 'trial' ? 'Booking…' : 'Creating…'}</>
                : mode === 'trial'
                  ? <>Book Free Trial Class <ArrowRight className="w-5 h-5" /></>
                  : <>Pay {PRICE_DISPLAY[plan]} & Activate <ArrowRight className="w-5 h-5" /></>}
            </button>
            {mode === 'subscribe' && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5" /> Secure Cashfree payment · UPI · Cards · Net Banking
              </p>
            )}
          </form>

          <aside className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F1E33] text-white rounded-3xl p-6 lg:p-7 shadow-xl shadow-blue-900/20">
              <div className="text-[11px] uppercase tracking-widest text-[#FCA5A5] font-bold">
                {mode === 'trial' ? 'Trial Summary' : 'Order Summary'}
              </div>
              <h3 className="text-xl font-black mt-1">Future Skills Continuous Program</h3>
              <p className="text-blue-200 text-sm mt-1">
                {mode === 'trial'
                  ? 'A complimentary 90-min hands-on session at your nearest centre.'
                  : `${plan === 'yearly' ? '48 classes / year · Free robotic kit included' : '4 classes / month · Cancel anytime'}`}
              </p>
              <div className="mt-5 pt-5 border-t border-white/10 space-y-2 text-sm">
                {mode === 'trial' ? (
                  <>
                    <Row k="1 trial class" v="Free" />
                    <Row k="Kit & materials" v="Included" />
                    <Row k="Educator-led" v="In person" />
                  </>
                ) : (
                  <>
                    <Row k={plan === 'yearly' ? 'Yearly plan' : 'Monthly plan'} v={`₹${PRICE[plan].toLocaleString()}`} />
                    <Row k="Make-up classes" v="1 / month free" />
                    <Row k="Robotic kit" v={plan === 'yearly' ? 'Free · Take home' : 'At centre'} />
                    {plan === 'yearly' && <Row k="You save" v="₹3,000" />}
                  </>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="font-bold">{mode === 'trial' ? 'Total today' : 'Total'}</span>
                <span className="text-2xl font-black">{mode === 'trial' ? 'Free' : `₹${PRICE[plan].toLocaleString()}`}</span>
              </div>
            </div>
            <div className="bg-blue-50/60 border-2 border-blue-100 rounded-2xl p-5 text-sm text-slate-700">
              <div className="font-bold text-[#0F1E33] mb-1.5">{mode === 'trial' ? 'After booking' : 'After payment'}</div>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><Check className="w-4 h-4 text-[#1E3A5F] mt-0.5 flex-shrink-0" /> Instant WhatsApp confirmation</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-[#1E3A5F] mt-0.5 flex-shrink-0" /> Centre & batch details within 24h</li>
                {mode === 'trial'
                  ? <li className="flex gap-2"><Check className="w-4 h-4 text-[#1E3A5F] mt-0.5 flex-shrink-0" /> Trial scheduled at your convenience</li>
                  : <li className="flex gap-2"><Gift className="w-4 h-4 text-[#D63031] mt-0.5 flex-shrink-0" /> {plan === 'yearly' ? 'Robotic kit ships in 5-7 days' : 'Kit access at centre on Day 1'}</li>}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <style>{`.fs-input{width:100%;padding:.7rem .85rem;border:2px solid #E2E8F0;border-radius:.75rem;font-size:.9rem;background:white;outline:none;transition:all .15s}
        .fs-input:focus{border-color:#1E3A5F;box-shadow:0 0 0 4px rgba(30,58,95,0.15)}`}</style>
      <Footer />
    </div>
  );
};

const Field = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">{label}</span>
    {children}
  </label>
);
const Row = ({ k, v }) => (
  <div className="flex items-center justify-between text-blue-100">
    <span>{k}</span><span className="font-semibold text-white">{v}</span>
  </div>
);

export default FutureSkillsBookingPage;
