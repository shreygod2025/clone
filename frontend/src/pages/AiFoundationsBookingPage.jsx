import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { Sparkles, ArrowLeft, ArrowRight, Loader2, Shield, Check, Users, Video } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { openCashfreeCheckout } from '../utils/cashfreeCheckout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TRACKS = [
  { key: 'explorer', label: 'Explorer Track', grades: 'Grade 6 – 8', accent: '#3B82F6' },
  { key: 'creator',  label: 'Creator Track',  grades: 'Grade 9 – 12', accent: '#1E3A5F' },
];

const GRADES = ['6', '7', '8', '9', '10', '11', '12'];

const initialForm = {
  parent_phone: '',
  student_name: '',
  student_grade: '',
  track: '',
  batch_id: '',
};

const AiFoundationsBookingPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isTrial = params.get('trial') === '1';
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Pre-select track from query string ?track=explorer|creator
  useEffect(() => {
    const t = params.get('track');
    if (t === 'explorer' || t === 'creator') setForm(prev => ({ ...prev, track: t }));
  }, [params]);

  // Fetch active batches
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/ai-foundations/batches`);
        setBatches(res.data?.batches || []);
      } catch (e) {
        // batches endpoint may not exist yet — silently fall back
      }
    })();
  }, []);

  // Auto-pick track based on grade if not chosen yet
  useEffect(() => {
    if (form.student_grade && !form.track) {
      const g = parseInt(form.student_grade, 10);
      if (!Number.isNaN(g)) {
        setForm(prev => ({ ...prev, track: g <= 8 ? 'explorer' : 'creator' }));
      }
    }
  }, [form.student_grade]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const visibleBatches = batches.filter(b => !form.track || b.track === form.track || !b.track);

  const valid = () => {
    if (!/^[6-9]\d{9}$/.test(form.parent_phone.replace(/\D/g, '').slice(-10))) return 'Enter a valid 10-digit phone';
    if (!form.student_name.trim()) return 'Student name is required';
    if (!form.student_grade) return 'Select student grade';
    if (!form.track) return 'Select a track';
    if (visibleBatches.length > 0 && !form.batch_id) return 'Please select a batch';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = valid();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      // 1) Create the lead — flag as trial if user came via Book Free Trial CTA
      const reg = await axios.post(`${API}/ai-foundations/register`, {
        ...form,
        parent_phone: form.parent_phone.replace(/\D/g, '').slice(-10),
        source_ref: params.get('ref') || (isTrial ? 'trial' : ''),
        is_trial: isTrial,
      });
      const bookingId = reg.data?.booking_id;
      if (!bookingId) throw new Error('Booking creation failed');

      // Trial flow — skip Cashfree. First session is free.
      if (isTrial) {
        toast.success("You're in! We'll WhatsApp the joining link.");
        navigate(`/ai-foundations/success?booking_id=${bookingId}&trial=1`);
        return;
      }

      // 2) Paid flow — Initiate Cashfree payment
      const pay = await axios.post(`${API}/ai-foundations/initiate-payment`, {
        booking_id: bookingId,
        frontend_url: window.location.origin,
      });
      const sessionId = pay.data?.payment_session_id;
      if (!sessionId) throw new Error('Could not initiate payment');

      toast.success('Opening secure payment…');
      // 3) Use Cashfree JS SDK v3 (the old /forms/ URL is deprecated)
      await openCashfreeCheckout({
        paymentSessionId: sessionId,
        mode: 'production',
        redirectTarget: '_self',
      });
    } catch (e2) {
      toast.error(e2.response?.data?.detail || e2.message || 'Booking failed — please retry');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white" data-testid="ai-foundations-booking">
      <Helmet>
        <title>Enrol · AI Foundations 10-Day Course | OLL</title>
        <meta name="description" content="Enrol in the OLL AI Foundations 10-day online course for Grades 6-12. Direct ₹1,999 payment via Cashfree." />
      </Helmet>
      <Navbar variant="aifoundations" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/ai-foundations" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600 mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to course details
        </Link>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Order summary — shows FIRST on mobile (order-1), right column on desktop (lg:order-2) */}
          <aside className="lg:col-span-5 space-y-4 order-1 lg:order-2">
            <div className="bg-gradient-to-br from-[#0F1E33] to-[#1E3A5F] text-white rounded-3xl p-6 lg:p-7 shadow-xl shadow-blue-900/20">
              <div className="text-[11px] uppercase tracking-widest text-sky-300 font-bold">Order Summary</div>
              <h3 className="text-xl font-black mt-1">AI Foundations · 10-Day Online</h3>
              <div className="mt-2 space-y-1.5">
                <p className="flex items-center gap-2 text-sm text-blue-100"><Video className="w-4 h-4 text-sky-300" /> Live classes · educator-led</p>
                <p className="flex items-center gap-2 text-sm text-blue-100"><Users className="w-4 h-4 text-sky-300" /> Max 10 students · small cohort</p>
              </div>
              <div className="mt-5 pt-5 border-t border-white/10 space-y-2 text-sm">
                <Row k="Course fee" v="₹1,999" />
                <Row k="Discounts" v="—" />
                <Row k="Taxes" v="Included" />
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="font-bold">Total</span>
                <span className="text-2xl font-black">₹1,999</span>
              </div>
            </div>
            <div className="bg-blue-50/60 border-2 border-blue-100 rounded-2xl p-5 text-sm text-slate-700">
              <div className="font-bold text-[#0F1E33] mb-1.5">{isTrial ? 'How your free trial works' : 'What happens after payment?'}</div>
              {isTrial ? (
                <ul className="space-y-1.5">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /> Session 1 is completely free</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /> WhatsApp confirmation with the joining link</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /> If your child loves it, pay ₹1,999 for sessions 2 – 10</li>
                </ul>
              ) : (
                <ul className="space-y-1.5">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /> Instant WhatsApp confirmation</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /> Cohort details + Day 1 link by next day</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /> Educator briefing call within 48 hours</li>
                </ul>
              )}
            </div>
          </aside>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border-2 border-slate-100 rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-900/5 space-y-5 order-2 lg:order-1">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-blue-600 uppercase">
                <Sparkles className="w-3.5 h-3.5" /> {isTrial ? 'Free Trial Booking' : 'Quick checkout'}
              </span>
              <h1 className="text-2xl lg:text-3xl font-black text-[#0F1E33] mt-1">{isTrial ? 'Book Your Free Trial' : 'Enrol in AI Foundations'}</h1>
              <p className="text-sm text-slate-500 mt-1">{isTrial ? 'First session FREE · Pay only if you continue from session 2' : '10 days · live online classes · max 10 students per cohort'}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Phone (WhatsApp) *" testid="parent-phone" className="sm:col-span-2">
                <input type="tel" inputMode="numeric" maxLength={15}
                  value={form.parent_phone} onChange={e => update('parent_phone', e.target.value)}
                  className="ai-input" placeholder="98XXXXXXXX" data-testid="parent-phone-input" required />
              </Field>
              <Field label="Student Name *" testid="student-name">
                <input value={form.student_name} onChange={e => update('student_name', e.target.value)}
                  className="ai-input" placeholder="Aanya" data-testid="student-name-input" required />
              </Field>
              <Field label="Grade *" testid="student-grade">
                <select value={form.student_grade} onChange={e => update('student_grade', e.target.value)}
                  className="ai-input" data-testid="student-grade-input" required>
                  <option value="">Select grade…</option>
                  {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </Field>
            </div>

            <div>
              <label className="text-xs font-bold tracking-widest text-blue-600 uppercase">Pick a track *</label>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                {TRACKS.map(t => {
                  const sel = form.track === t.key;
                  return (
                    <button
                      type="button" key={t.key}
                      onClick={() => update('track', t.key)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${sel ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                      data-testid={`track-pick-${t.key}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] uppercase tracking-wider font-bold" style={{ color: t.accent }}>{t.grades}</div>
                          <div className="text-base font-black text-[#0F1E33]">{t.label}</div>
                        </div>
                        {sel && <Check className="w-5 h-5 text-blue-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {visibleBatches.length > 0 && (
              <div>
                <label className="text-xs font-bold tracking-widest text-blue-600 uppercase">Pick a batch — date &amp; timing *</label>
                <div className="grid gap-2.5 mt-2">
                  {visibleBatches.map(b => {
                    const sel = form.batch_id === b.id;
                    return (
                      <button
                        type="button" key={b.id}
                        onClick={() => update('batch_id', b.id)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${sel ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                        data-testid={`batch-pick-${b.id}`}
                      >
                        <div>
                          <div className="text-base font-black text-[#0F1E33]">{b.label || `${b.days_label || ''} · ${b.timing || ''}`}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Starts {b.start_date_label || b.start_date}{b.seats_left != null ? ` · ${b.seats_left} seat${b.seats_left === 1 ? '' : 's'} left` : ''}</div>
                        </div>
                        {sel && <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit" disabled={submitting}
              className="w-full py-4 rounded-xl bg-[#1E3A5F] text-white font-bold text-base hover:bg-[#0F1E33] transition-all shadow-lg shadow-blue-900/20 disabled:opacity-60 flex items-center justify-center gap-2"
              data-testid="submit-pay-btn"
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> {isTrial ? 'Booking your trial…' : 'Creating your booking…'}</>
                : isTrial
                  ? <>Confirm Free Trial Seat <ArrowRight className="w-5 h-5" /></>
                  : <>Pay ₹1,999 &amp; Confirm Seat <ArrowRight className="w-5 h-5" /></>}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5" /> {isTrial ? 'No payment required for your free trial' : 'Secure Cashfree payment · UPI · Cards · Net Banking'}
            </p>
          </form>
        </div>
      </div>

      <style>{`.ai-input{width:100%;padding:.7rem .85rem;border:2px solid #E2E8F0;border-radius:.75rem;font-size:.9rem;background:white;outline:none;transition:all .15s}
        .ai-input:focus{border-color:#2563EB;box-shadow:0 0 0 4px rgba(37,99,235,0.12)}
      `}</style>
      <Footer />
    </div>
  );
};

const Field = ({ label, children, className = '', testid }) => (
  <label className={`block ${className}`} data-testid={testid}>
    <span className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">{label}</span>
    {children}
  </label>
);
const Row = ({ k, v }) => (
  <div className="flex items-center justify-between text-blue-100">
    <span>{k}</span><span className="font-semibold text-white">{v}</span>
  </div>
);

export default AiFoundationsBookingPage;
