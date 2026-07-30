import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import useSeo from '../hooks/useSeo';
import axios from 'axios';
import {
  ArrowLeft, ArrowRight, Loader2, Check, Sparkles, Calendar,
  MapPin, Phone, Users, Clock, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { openCashfreeCheckout } from '../utils/cashfreeCheckout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Helpers ─────────────────────────────────────────────────────────────
const isValidPhone = (raw) => /^[6-9]\d{9}$/.test((raw || '').replace(/\D/g, '').slice(-10));

const daysLabel = (arr = []) => arr.join(' · ') || 'Days TBA';
const timeLabel = (start, end) => (start || end) ? `${start || '—'} – ${end || '—'}` : 'Timings TBA';

const FutureSkillsBookingPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'subscribe' ? 'subscribe' : 'trial';

  // ── Trial wizard state ────────────────────────────────────────────────
  const [step, setStep] = useState(1);            // 1 = phone, 2 = center, 3 = batch
  const [phone, setPhone] = useState('');
  const [centerId, setCenterId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [centers, setCenters] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Fetch centers when moving from Step 1 → Step 2
  useEffect(() => {
    if (mode !== 'trial') return;
    if (step >= 2 && centers.length === 0 && !loadingCenters) {
      setLoadingCenters(true);
      axios.get(`${API}/future-skills/centers`)
        .then(r => setCenters(r.data?.centers || []))
        .catch(() => toast.error('Could not load centres. Please try again.'))
        .finally(() => setLoadingCenters(false));
    }
  }, [step, centers.length, loadingCenters, mode]);

  // Fetch all batches when reaching Step 3 (so we can also show batches in other centers)
  useEffect(() => {
    if (mode !== 'trial') return;
    if (step === 3 && allBatches.length === 0 && !loadingBatches) {
      setLoadingBatches(true);
      axios.get(`${API}/future-skills/batches`)
        .then(r => setAllBatches(r.data?.batches || []))
        .catch(() => toast.error('Could not load batches. Please try again.'))
        .finally(() => setLoadingBatches(false));
    }
  }, [step, allBatches.length, loadingBatches, mode]);

  const selectedCenter = useMemo(() => centers.find(c => c.id === centerId), [centers, centerId]);
  const selectedBatch  = useMemo(() => allBatches.find(b => b.id === batchId), [allBatches, batchId]);
  const batchesForCenter = useMemo(() => allBatches.filter(b => b.center_id === centerId), [allBatches, centerId]);
  const otherBatches = useMemo(() => allBatches.filter(b => b.center_id !== centerId), [allBatches, centerId]);

  const goPrev = () => { setStep(s => Math.max(1, s - 1)); };
  const goNext = () => {
    if (step === 1) {
      if (!isValidPhone(phone)) { toast.error('Enter a valid 10-digit phone number'); return; }
      setStep(2); return;
    }
    if (step === 2) {
      if (!centerId) { toast.error('Please select a centre'); return; }
      setStep(3); return;
    }
  };

  const handleSubmitTrial = async () => {
    if (!batchId) { toast.error('Please pick a batch to continue'); return; }
    setSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      // If the user selected a batch in a different center, use that batch's center
      const effectiveCenterId = selectedBatch?.center_id || centerId;
      const r = await axios.post(`${API}/future-skills/register-trial`, {
        parent_phone: cleanPhone,
        center_id: effectiveCenterId,
        batch_id: batchId,
        source_ref: params.get('ref') || '',
      });
      const trialRef = r.data?.trial_ref;
      toast.success("Trial booked — we'll WhatsApp you shortly!");
      // Pass batch details forward so the success page can show day/time
      const successParams = new URLSearchParams({
        type: 'trial',
        ...(trialRef ? { ref: trialRef } : {}),
        ...(selectedBatch?.days?.length ? { days: selectedBatch.days.join(',') } : {}),
        ...(selectedBatch?.start_time ? { start: selectedBatch.start_time } : {}),
        ...(selectedBatch?.end_time ? { end: selectedBatch.end_time } : {}),
        ...(selectedBatch?.name ? { batch: selectedBatch.name } : {}),
        ...(selectedCenter?.name || selectedBatch?.center_name ? { centre: selectedCenter?.name || selectedBatch.center_name } : {}),
      });
      navigate(`/future-skills/success?${successParams.toString()}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Subscribe mode (legacy full form — untouched below) ───────────────
  const [plan, setPlan] = useState(params.get('plan') === 'monthly' ? 'monthly' : 'yearly');
  const [subForm, setSubForm] = useState({
    parent_name: '', parent_phone: '', parent_email: '',
    student_name: '', student_grade: '',
    preferred_center: '', notes: '',
  });
  const upd = (k, v) => setSubForm(prev => ({ ...prev, [k]: v }));
  const validSub = () => {
    if (!subForm.parent_name.trim()) return 'Parent name is required';
    if (!isValidPhone(subForm.parent_phone)) return 'Enter a valid 10-digit phone';
    if (!/^\S+@\S+\.\S+$/.test(subForm.parent_email)) return 'Enter a valid email';
    if (!subForm.student_name.trim()) return 'Student name is required';
    if (!subForm.student_grade) return 'Select student grade';
    return null;
  };
  const handleSubscribe = async () => {
    const err = validSub();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      const sub = await axios.post(`${API}/future-skills/subscribe`, {
        ...subForm,
        parent_phone: subForm.parent_phone.replace(/\D/g, '').slice(-10),
        plan,
        source_ref: params.get('ref') || '',
      });
      const subId = sub.data?.subscription_id;
      if (!subId) throw new Error('Subscription creation failed');
      const pay = await axios.post(`${API}/future-skills/initiate-payment`, {
        subscription_id: subId,
        frontend_url: window.location.origin,
      });
      const sessionId = pay.data?.payment_session_id;
      if (!sessionId) throw new Error('Could not initiate payment');
      toast.success('Opening secure payment…');
      await openCashfreeCheckout({ paymentSessionId: sessionId, mode: 'production', redirectTarget: '_self' });
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Subscription failed');
      setSubmitting(false);
    }
  };
  const PRICE = { monthly: 2000, yearly: 21000 };
  const PRICE_DISPLAY = { monthly: '₹2,000/mo', yearly: '₹1,750/mo · ₹21,000/yr' };

  useSeo({
    title: `${mode === 'trial' ? 'Book Free Trial' : 'Subscribe'} · Future Skills | OLL`,
    robots: 'noindex, follow',
    canonical: 'https://oll.co/future-skills',
  });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50/40 to-white" data-testid="future-skills-booking">
      <Navbar variant="futureskills" onBookDemo={() => navigate('/future-skills/book?mode=trial')} bookDemoLabel="Book Free Trial" />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
        <Link to="/future-skills" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#D63031] mb-5 transition-colors" data-testid="back-to-program-link">
          <ArrowLeft className="w-4 h-4" /> Back to program
        </Link>

        {/* ═══════════════════════════ TRIAL 3-STEP WIZARD ═══════════════════════════ */}
        {mode === 'trial' && (
          <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/40" data-testid="trial-wizard">
            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-6" data-testid="trial-stepper">
              {[
                { n: 1, label: 'Phone',  icon: Phone },
                { n: 2, label: 'Centre', icon: MapPin },
                { n: 3, label: 'Batch',  icon: Calendar },
              ].map((s, i) => (
                <div key={s.n} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex items-center gap-2 ${step === s.n ? 'text-[#D63031]' : step > s.n ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                      step === s.n ? 'bg-[#D63031] text-white border-[#D63031]'
                      : step > s.n ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                      {step > s.n ? <Check className="w-4 h-4" /> : s.n}
                    </div>
                    <span className={`hidden sm:inline text-xs font-bold uppercase tracking-wider ${step === s.n ? 'text-[#D63031]' : ''}`}>{s.label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 mx-2 ${step > s.n ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>

            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#D63031] uppercase">
                <Sparkles className="w-3.5 h-3.5" /> Free Trial Booking
              </span>
              <h1 className="text-2xl lg:text-3xl font-black text-[#0F1E33] mt-1">
                {step === 1 && "What's your phone number?"}
                {step === 2 && 'Which centre works best for you?'}
                {step === 3 && 'Pick a batch that fits your schedule'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {step === 1 && "We'll send your trial details on WhatsApp."}
                {step === 2 && "Choose the centre closest to you — we'll show you all live batches."}
                {step === 3 && "You can see other centres' batches too if the timings suit you better."}
              </p>
            </div>

            {/* ── Step 1: Phone ────────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <label className="block">
                  <span className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">Phone (WhatsApp)</span>
                  <div className="flex">
                    <div className="flex items-center px-3 border-2 border-r-0 border-slate-200 rounded-l-xl bg-slate-50 text-sm font-bold text-slate-500">+91</div>
                    <input type="tel" inputMode="numeric" maxLength={15}
                      autoFocus
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/[^\d ]/g, ''))}
                      onKeyDown={(e) => { if (e.key === 'Enter') goNext(); }}
                      className="flex-1 px-3.5 py-3 border-2 border-slate-200 rounded-r-xl text-base focus:outline-none focus:border-[#1E3A5F] focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="98XXXXXXXX"
                      data-testid="phone-input" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">10-digit Indian mobile · we&apos;ll send WhatsApp confirmation</p>
                </label>
                <button onClick={goNext}
                  className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-[#D63031] to-[#1E3A5F] hover:from-[#B52828] hover:to-[#0F1E33] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25"
                  data-testid="step1-next-btn">
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* ── Step 2: Center ───────────────────────────────────────── */}
            {step === 2 && (
              <div>
                {loadingCenters ? (
                  <div className="py-16 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading centres…</div>
                ) : centers.length === 0 ? (
                  <div className="p-8 text-center bg-amber-50 border-2 border-amber-200 rounded-xl">
                    <div className="font-bold text-amber-800 mb-1">No centres available yet</div>
                    <p className="text-sm text-amber-700">Please leave your number — our team will call you back within 24 hours.</p>
                    <button onClick={handleSubmitTrial} disabled={submitting}
                      className="mt-4 px-5 py-2.5 rounded-lg bg-amber-800 text-white font-bold text-sm hover:bg-amber-900 disabled:opacity-60"
                      data-testid="request-callback-btn">
                      {submitting ? 'Submitting…' : 'Request Callback'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5" data-testid="centers-list">
                    {centers.map(c => (
                      <button key={c.id}
                        onClick={() => { setCenterId(c.id); }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 group ${
                          centerId === c.id
                            ? 'border-[#D63031] bg-red-50/40 shadow-md'
                            : 'border-slate-200 hover:border-[#1E3A5F] hover:bg-blue-50/40'
                        }`}
                        data-testid={`center-option-${c.id}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          centerId === c.id ? 'bg-[#D63031] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-[#1E3A5F] group-hover:text-white'
                        }`}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#0F1E33]">{c.name}</div>
                          {(c.address || c.city) && (
                            <div className="text-xs text-slate-500 truncate">{[c.address, c.city].filter(Boolean).join(' · ')}</div>
                          )}
                        </div>
                        {centerId === c.id && <Check className="w-5 h-5 text-[#D63031] flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={goPrev}
                    className="px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm flex items-center gap-1.5"
                    data-testid="step2-back-btn">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={goNext} disabled={!centerId || loadingCenters}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D63031] to-[#1E3A5F] hover:from-[#B52828] hover:to-[#0F1E33] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/20"
                    data-testid="step2-next-btn">
                    See Available Batches <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Batch ────────────────────────────────────────── */}
            {step === 3 && (
              <div>
                {selectedCenter && (
                  <div className="bg-blue-50/60 border-2 border-blue-100 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-[#1E3A5F]" />
                    <span className="font-bold text-[#0F1E33]">{selectedCenter.name}</span>
                    <button onClick={() => setStep(2)} className="ml-auto text-xs font-bold text-[#D63031] hover:underline" data-testid="change-center-btn">
                      Change centre
                    </button>
                  </div>
                )}

                {loadingBatches ? (
                  <div className="py-16 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading batches…</div>
                ) : (
                  <>
                    {/* Batches at selected center */}
                    <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                      At this centre {batchesForCenter.length > 0 && `· ${batchesForCenter.length}`}
                    </div>
                    {batchesForCenter.length === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 text-sm text-amber-800 mb-4" data-testid="no-batches-msg">
                        No live batches at this centre yet. Browse batches at other centres below, or pick this centre and we&apos;ll open a batch for you.
                      </div>
                    ) : (
                      <div className="space-y-2.5 mb-6" data-testid="batches-list">
                        {batchesForCenter.map(b => <BatchCard key={b.id} batch={b} selected={batchId === b.id} onSelect={() => setBatchId(b.id)} showCenter={false} />)}
                      </div>
                    )}

                    {/* Batches at other centers */}
                    {otherBatches.length > 0 && (
                      <>
                        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2 mt-4">
                          Other centres · {otherBatches.length}
                        </div>
                        <div className="space-y-2.5" data-testid="other-batches-list">
                          {otherBatches.map(b => <BatchCard key={b.id} batch={b} selected={batchId === b.id} onSelect={() => setBatchId(b.id)} showCenter />)}
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={goPrev}
                    className="px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm flex items-center gap-1.5"
                    data-testid="step3-back-btn">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleSubmitTrial} disabled={!batchId || submitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D63031] to-[#1E3A5F] hover:from-[#B52828] hover:to-[#0F1E33] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/25"
                    data-testid="submit-trial-btn">
                    {submitting
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Booking…</>
                      : <>Confirm Free Trial <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════ SUBSCRIBE MODE (legacy) ═══════════════════════════ */}
        {mode === 'subscribe' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <form onSubmit={(e) => { e.preventDefault(); handleSubscribe(); }}
              className="lg:col-span-7 bg-white border-2 border-slate-100 rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/40 space-y-5">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#D63031] uppercase">
                  <Sparkles className="w-3.5 h-3.5" /> Subscribe & save
                </span>
                <h1 className="text-2xl lg:text-3xl font-black text-[#0F1E33] mt-1">Subscribe to Future Skills</h1>
                <p className="text-sm text-slate-500 mt-1">Cancel anytime. Robotic kit free with yearly.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl">
                {[{ key: 'monthly', label: 'Monthly · ₹2,000/mo' }, { key: 'yearly', label: 'Yearly · Save ₹3,000 + Free Kit' }].map(p => (
                  <button type="button" key={p.key} onClick={() => setPlan(p.key)}
                    className={`text-xs px-3 py-2.5 rounded-lg font-bold ${plan === p.key ? 'bg-white text-[#0F1E33] shadow' : 'text-slate-500 hover:text-slate-700'}`}
                    data-testid={`plan-toggle-${p.key}`}>{p.label}</button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Parent Name *"><input value={subForm.parent_name} onChange={e => upd('parent_name', e.target.value)} className="fs-input" required data-testid="parent-name-input" /></Field>
                <Field label="Phone *"><input type="tel" value={subForm.parent_phone} onChange={e => upd('parent_phone', e.target.value)} className="fs-input" required data-testid="parent-phone-input" /></Field>
                <Field label="Email *" className="sm:col-span-2"><input type="email" value={subForm.parent_email} onChange={e => upd('parent_email', e.target.value)} className="fs-input" required data-testid="parent-email-input" /></Field>
                <Field label="Student Name *"><input value={subForm.student_name} onChange={e => upd('student_name', e.target.value)} className="fs-input" required data-testid="student-name-input" /></Field>
                <Field label="Grade *">
                  <select value={subForm.student_grade} onChange={e => upd('student_grade', e.target.value)} className="fs-input" required data-testid="student-grade-input">
                    <option value="">Select grade…</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </Field>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-4 rounded-xl bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-blue-900/20"
                data-testid="submit-btn">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating…</> : <>Pay {PRICE_DISPLAY[plan]} & Activate <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
            <aside className="lg:col-span-5">
              <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F1E33] text-white rounded-3xl p-6 lg:p-7 shadow-xl">
                <div className="text-[11px] uppercase tracking-widest text-[#FCA5A5] font-bold">Order Summary</div>
                <h3 className="text-xl font-black mt-1">Future Skills Program</h3>
                <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-black">₹{PRICE[plan].toLocaleString()}</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <style>{`
        .fs-input{width:100%;padding:.7rem .85rem;border:2px solid #E2E8F0;border-radius:.75rem;font-size:.9rem;background:white;outline:none;transition:all .15s}
        .fs-input:focus{border-color:#1E3A5F;box-shadow:0 0 0 4px rgba(30,58,95,0.15)}
      `}</style>
      <Footer />
    </div>
  );
};

// ── Batch card ───────────────────────────────────────────────────────────
const BatchCard = ({ batch, selected, onSelect, showCenter }) => {
  const capacity = batch.capacity || 15;
  const filled = batch.student_count || 0;
  const seatsLeft = Math.max(0, capacity - filled);
  const isFull = seatsLeft === 0;
  return (
    <button
      onClick={onSelect}
      disabled={isFull}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        selected ? 'border-[#D63031] bg-red-50/40 shadow-md'
        : isFull ? 'border-slate-200 bg-slate-50'
        : 'border-slate-200 hover:border-[#1E3A5F] hover:bg-blue-50/40'
      }`}
      data-testid={`batch-option-${batch.id}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          selected ? 'bg-[#D63031] text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          <Calendar className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#0F1E33]">{batch.name}</span>
            {batch.skill && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase tracking-wider">{batch.skill}</span>}
            {isFull && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold uppercase tracking-wider">Full</span>}
          </div>
          <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {daysLabel(batch.days)}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {timeLabel(batch.start_time, batch.end_time)}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {showCenter && batch.center_name && (
              <span className="inline-flex items-center gap-1 font-semibold text-[#1E3A5F]"><MapPin className="w-3 h-3" /> {batch.center_name}</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {filled}/{capacity} students · {isFull ? 'Full' : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`}
            </span>
          </div>
        </div>
        {selected && <Check className="w-5 h-5 text-[#D63031] flex-shrink-0" />}
        {!selected && !isFull && <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </div>
    </button>
  );
};

const Field = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">{label}</span>
    {children}
  </label>
);

export default FutureSkillsBookingPage;
