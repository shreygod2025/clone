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
// Convert "HH:MM" 24h → "h:MM AM/PM" 12h. Tolerant of nulls/empty strings.
const to12h = (t) => {
  if (!t) return '';
  const [hStr, mStr = '00'] = String(t).split(':');
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${mStr.padStart(2, '0')} ${period}`;
};
const timeLabel = (start, end) => {
  const s = to12h(start), e = to12h(end);
  if (!s && !e) return 'Timings TBA';
  return `${s || '—'} – ${e || '—'}`;
};

const FutureSkillsBookingPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'subscribe' ? 'subscribe' : 'trial';

  // ── Trial wizard state ────────────────────────────────────────────────
  // Flow: phone → age group → city → centre → batch (auto-advance)
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [studentName, setStudentName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [city, setCity] = useState('');
  const [centerId, setCenterId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [centers, setCenters] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showBatchReq, setShowBatchReq] = useState(false);            // modal toggle
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqForm, setReqForm] = useState({ preferred_area: '', preferred_days: [], preferred_time: '', notes: '' });

  const submitBatchRequest = async () => {
    if (!isValidPhone(phone)) { toast.error('Please enter a valid phone first (step 1)'); return; }
    setReqSubmitting(true);
    try {
      const composedNotes = [
        reqForm.preferred_area ? `Preferred area/centre: ${reqForm.preferred_area}` : '',
        reqForm.notes || '',
      ].filter(Boolean).join(' — ');
      await axios.post(`${API}/future-skills/batch-request`, {
        parent_phone: phone.replace(/\D/g, '').slice(-10),
        city, age_group: ageGroup,
        center_id: centerId,
        center_name: (centers.find(c => c.id === centerId)?.name) || '',
        preferred_days: reqForm.preferred_days,
        preferred_time: reqForm.preferred_time,
        notes: composedNotes,
        source_ref: params.get('ref') || '',
      });
      toast.success("Thanks! We'll WhatsApp you as soon as a batch matching your preference opens.");
      setShowBatchReq(false);
      setReqForm({ preferred_area: '', preferred_days: [], preferred_time: '', notes: '' });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not submit request');
    } finally { setReqSubmitting(false); }
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Fetch centres once we reach the "select city" step (step 3+) so we can
  // both populate the city list and later filter centres by (city + age).
  useEffect(() => {
    if (mode !== 'trial') return;
    if (step >= 3 && centers.length === 0 && !loadingCenters) {
      setLoadingCenters(true);
      axios.get(`${API}/future-skills/centers`)
        .then(r => setCenters(r.data?.centers || []))
        .catch(() => toast.error('Could not load centres. Please try again.'))
        .finally(() => setLoadingCenters(false));
    }
  }, [step, centers.length, loadingCenters, mode]);

  // Fetch batches as soon as the user picks the city — we need them to
  // filter centres in step 4 (hide centres that have no batches for the
  // chosen age group). Guarded so we only fetch once.
  useEffect(() => {
    if (mode !== 'trial') return;
    if (step >= 3 && allBatches.length === 0 && !loadingBatches) {
      setLoadingBatches(true);
      axios.get(`${API}/future-skills/batches`)
        .then(r => setAllBatches(r.data?.batches || []))
        .catch(() => toast.error('Could not load batches. Please try again.'))
        .finally(() => setLoadingBatches(false));
    }
  }, [step, allBatches.length, loadingBatches, mode]);

  // Age groups shown as chips — matches AGE_GROUP_OPTIONS on the admin side.
  const AGE_GROUPS = [
    { value: '3-7',   label: '3 – 7 yrs',   emoji: '🎨' },
    { value: '8-11',  label: '8 – 11 yrs',  emoji: '🤖' },
    { value: '12-16', label: '12 – 16 yrs', emoji: '🚀' },
  ];

  // Cities are inferred from the centres list so users only see cities where
  // we actually operate.
  const availableCities = useMemo(() => {
    const set = new Set(
      centers
        .map(c => (c.city || '').trim())
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [centers]);

  // Centres in the picked city — we now show ALL city centres, but each
  // centre gets a `has_matching_batch` flag so the card can visually mark
  // centres that don't yet have a batch for the chosen age. This is more
  // helpful than silently hiding them: users who see their local centre
  // can tap it and immediately request a batch for their age.
  const centersForCity = useMemo(() => {
    if (!city) return [];
    const inCity = centers.filter(c => (c.city || '').toLowerCase() === city.toLowerCase());
    if (!ageGroup || allBatches.length === 0) {
      return inCity.map(c => ({ ...c, has_matching_batch: true }));
    }
    const matchIds = new Set(
      allBatches
        .filter(b => !b.age_group || b.age_group === ageGroup)
        .map(b => b.center_id)
    );
    return inCity.map(c => ({ ...c, has_matching_batch: matchIds.has(c.id) }));
  }, [centers, city, ageGroup, allBatches]);

  const selectedCenter = useMemo(() => centers.find(c => c.id === centerId), [centers, centerId]);
  const selectedBatch  = useMemo(() => allBatches.find(b => b.id === batchId), [allBatches, batchId]);
  // Only batches at the chosen centre AND matching the age group — never
  // "other centres" (user asked to hide those).
  const batchesForCenter = useMemo(
    () => allBatches
      .filter(b => b.center_id === centerId)
      .filter(b => !ageGroup || !b.age_group || b.age_group === ageGroup),
    [allBatches, centerId, ageGroup],
  );

  const goPrev = () => { setStep(s => Math.max(1, s - 1)); };
  const goNext = () => {
    if (step === 1) {
      if (!isValidPhone(phone)) { toast.error('Enter a valid 10-digit phone number'); return; }
      if (!studentName.trim()) { toast.error("Please enter the child's name"); return; }
      // Fire-and-forget booking-intent so the scheduler can nudge the parent
      // via WhatsApp if they don't complete the trial in the next 30 minutes.
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      axios.post(`${API}/future-skills/booking-intent`, {
        parent_phone: cleanPhone,
        parent_name: studentName.trim(),
        source_ref: params.get('ref') || (typeof window !== 'undefined' ? window.localStorage.getItem('fs_source_ref') : '') || '',
      }).catch(() => { /* best-effort — never block the funnel */ });
      setStep(2); return;
    }
    if (step === 2) {
      if (!ageGroup) { toast.error("Pick your child's age group"); return; }
      setStep(3); return;
    }
    if (step === 3) {
      if (!city) { toast.error('Pick your city'); return; }
      setStep(4); return;
    }
    if (step === 4) {
      if (!centerId) { toast.error('Please select a centre'); return; }
      setStep(5); return;
    }
  };

  const handleSubmitTrial = async (overrideBatchId) => {
    // Accept an explicit batchId so callers can pass the tapped batch without
    // waiting for the async React state update (fixes the "please pick a
    // batch" toast that appeared on the first tap of a card).
    const effectiveBatchId = overrideBatchId || batchId;
    if (!effectiveBatchId) { toast.error('Please pick a batch to continue'); return; }
    setSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const effectiveBatch = allBatches.find(b => b.id === effectiveBatchId) || selectedBatch;
      const effectiveCenterId = effectiveBatch?.center_id || centerId;
      const r = await axios.post(`${API}/future-skills/register-trial`, {
        parent_phone: cleanPhone,
        student_name: studentName.trim(),
        center_id: effectiveCenterId,
        batch_id: effectiveBatchId,
        age_group: ageGroup,
        city,
        source_ref: params.get('ref') || (typeof window !== 'undefined' ? window.localStorage.getItem('fs_source_ref') : '') || '',
      });
      const trialRef = r.data?.trial_ref;
      toast.success("Trial booked — we'll WhatsApp you shortly!");
      const centreAddress = selectedCenter?.address || '';
      const mapsLink = selectedCenter?.google_maps_link
        || (centreAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(centreAddress)}` : '');
      const successParams = new URLSearchParams({
        type: 'trial',
        ...(trialRef ? { ref: trialRef } : {}),
        ...(effectiveBatch?.days?.length ? { days: effectiveBatch.days.join(',') } : {}),
        ...(effectiveBatch?.start_time ? { start: effectiveBatch.start_time } : {}),
        ...(effectiveBatch?.end_time ? { end: effectiveBatch.end_time } : {}),
        ...(effectiveBatch?.name ? { batch: effectiveBatch.name } : {}),
        ...(selectedCenter?.name || effectiveBatch?.center_name ? { centre: selectedCenter?.name || effectiveBatch.center_name } : {}),
        ...(centreAddress ? { address: centreAddress } : {}),
        ...(mapsLink ? { maps: mapsLink } : {}),
      });
      navigate(`/future-skills/success?${successParams.toString()}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Subscribe mode ────────────────────────────────────────────────────
  // Fields kept minimal by design: phone identifies the parent, student
  // name + age group + centre + batch are enough for the CRM to route the
  // enrolment. Full profile (parent name, email, grade) is captured during
  // onboarding after payment.
  const [plan, setPlan] = useState(params.get('plan') === 'monthly' ? 'monthly' : 'yearly');
  const [subForm, setSubForm] = useState({
    parent_phone: '',
    student_name: '',
    age_group: '',
    center_id: '',
    batch_id: '',
    notes: '',
  });
  const upd = (k, v) => setSubForm(prev => ({ ...prev, [k]: v }));

  // Reuse the centres/batches state from the trial wizard — same public
  // endpoints, just fetch on mount when we render the subscribe form.
  useEffect(() => {
    if (mode !== 'subscribe') return;
    if (centers.length === 0 && !loadingCenters) {
      setLoadingCenters(true);
      axios.get(`${API}/future-skills/centers`).then(r => setCenters(r.data?.centers || [])).catch(() => {}).finally(() => setLoadingCenters(false));
    }
    if (allBatches.length === 0 && !loadingBatches) {
      setLoadingBatches(true);
      axios.get(`${API}/future-skills/batches`).then(r => setAllBatches(r.data?.batches || [])).catch(() => {}).finally(() => setLoadingBatches(false));
    }
  }, [mode, centers.length, allBatches.length, loadingCenters, loadingBatches]);

  const subCentres = useMemo(() => {
    if (!subForm.age_group) return centers;
    if (allBatches.length === 0) return centers;
    const centreIds = new Set(
      allBatches.filter(b => !b.age_group || b.age_group === subForm.age_group).map(b => b.center_id)
    );
    return centers.filter(c => centreIds.has(c.id));
  }, [centers, allBatches, subForm.age_group]);
  const subBatches = useMemo(() => {
    if (!subForm.center_id) return [];
    return allBatches
      .filter(b => b.center_id === subForm.center_id)
      .filter(b => !subForm.age_group || !b.age_group || b.age_group === subForm.age_group);
  }, [allBatches, subForm.center_id, subForm.age_group]);

  const validSub = () => {
    if (!isValidPhone(subForm.parent_phone)) return 'Enter a valid 10-digit phone';
    if (!subForm.student_name.trim()) return 'Student name is required';
    if (!subForm.age_group) return "Pick your child's age group";
    if (!subForm.center_id) return 'Please pick a centre';
    if (!subForm.batch_id) return 'Please pick a batch';
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
        source_ref: params.get('ref') || (typeof window !== 'undefined' ? window.localStorage.getItem('fs_source_ref') : '') || '',
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
  const PRICE = { monthly: 2500, yearly: 24000 };
  const PRICE_DISPLAY = { monthly: '₹2,500/mo', yearly: '₹2,000/mo · ₹24,000/yr' };

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
                { n: 2, label: 'Age',    icon: Users },
                { n: 3, label: 'City',   icon: MapPin },
                { n: 4, label: 'Centre', icon: MapPin },
                { n: 5, label: 'Batch',  icon: Calendar },
              ].map((s, i, arr) => (
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
                  {i < arr.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${step > s.n ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>

            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#D63031] uppercase">
                <Sparkles className="w-3.5 h-3.5" /> Free Trial Booking
              </span>
              <h1 className="text-2xl lg:text-3xl font-black text-[#0F1E33] mt-1">
                {step === 1 && "What's your phone number?"}
                {step === 2 && "What's your child's age?"}
                {step === 3 && 'Which city are you in?'}
                {step === 4 && 'Pick your closest centre'}
                {step === 5 && 'Pick a batch that fits your schedule'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {step === 1 && "We'll send your trial details on WhatsApp."}
                {step === 2 && "We'll match you to the right level."}
                {step === 3 && "We'll only show cities where we run classes."}
                {step === 4 && "Only centres in your city that host the age group."}
                {step === 5 && "All live batches at your centre for this age group."}
              </p>
            </div>

            {/* ── Step 1: Phone + Names ────────────────────────────────── */}
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
                      className="flex-1 px-3.5 py-3 border-2 border-slate-200 rounded-r-xl text-base focus:outline-none focus:border-[#1E3A5F] focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="98XXXXXXXX"
                      data-testid="phone-input" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">10-digit Indian mobile · we&apos;ll send WhatsApp confirmation</p>
                </label>
                <label className="block mt-4">
                  <span className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">Child&apos;s Name</span>
                  <input type="text" maxLength={80}
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') goNext(); }}
                    className="w-full px-3.5 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:border-[#1E3A5F] focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="Your child's first name"
                    data-testid="student-name-input" />
                </label>
                <button onClick={goNext}
                  className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-[#D63031] to-[#1E3A5F] hover:from-[#B52828] hover:to-[#0F1E33] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25"
                  data-testid="step1-next-btn">
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* ── Step 2: Age Group (auto-advance on tap) ─────────────── */}
            {step === 2 && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" data-testid="age-group-list">
                  {AGE_GROUPS.map(a => (
                    <button key={a.value}
                      onClick={() => { setAgeGroup(a.value); setStep(3); }}
                      className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                        ageGroup === a.value
                          ? 'border-[#D63031] bg-red-50/40 shadow-md'
                          : 'border-slate-200 hover:border-[#1E3A5F] hover:bg-blue-50/40'
                      }`}
                      data-testid={`age-option-${a.value}`}>
                      <div className="text-3xl">{a.emoji}</div>
                      <div className="font-black text-[#0F1E33] mt-1">{a.label}</div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={goPrev}
                    className="px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm flex items-center gap-1.5"
                    data-testid="step2-back-btn">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: City (auto-advance on tap) ──────────────────── */}
            {step === 3 && (
              <div>
                {loadingCenters ? (
                  <div className="py-16 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading cities…</div>
                ) : availableCities.length === 0 ? (
                  <div className="p-8 text-center bg-amber-50 border-2 border-amber-200 rounded-xl">
                    <div className="font-bold text-amber-800 mb-1">No cities available yet</div>
                    <p className="text-sm text-amber-700">Please leave your number — our team will call you back within 24 hours.</p>
                    <button onClick={handleSubmitTrial} disabled={submitting}
                      className="mt-4 px-5 py-2.5 rounded-lg bg-amber-800 text-white font-bold text-sm hover:bg-amber-900 disabled:opacity-60"
                      data-testid="request-callback-btn">
                      {submitting ? 'Submitting…' : 'Request Callback'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid="city-list">
                    {availableCities.map(c => (
                      <button key={c}
                        onClick={() => { setCity(c); setCenterId(''); setStep(4); }}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 group ${
                          city === c
                            ? 'border-[#D63031] bg-red-50/40 shadow-md'
                            : 'border-slate-200 hover:border-[#1E3A5F] hover:bg-blue-50/40'
                        }`}
                        data-testid={`city-option-${c.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          city === c ? 'bg-[#D63031] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-[#1E3A5F] group-hover:text-white'
                        }`}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="font-bold text-[#0F1E33]">{c}</div>
                        {city === c && <Check className="w-5 h-5 text-[#D63031] ml-auto flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
                {/* Escape hatch: parent doesn't see their city — capture as
                    a batch-request with the typed city so ops can follow up. */}
                {availableCities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBatchReq(true)}
                    className="w-full mt-3 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#1E3A5F] text-slate-600 hover:text-[#1E3A5F] text-sm font-bold flex items-center justify-center gap-1.5"
                    data-testid="city-not-listed-btn">
                    <MapPin className="w-4 h-4" /> Can&apos;t find your city? Add your city
                  </button>
                )}
                <div className="flex gap-3 mt-6">
                  <button onClick={goPrev}
                    className="px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm flex items-center gap-1.5"
                    data-testid="step3-back-btn">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Centre (auto-advance on tap; filtered by city + age) ── */}
            {step === 4 && (
              <div>
                {loadingCenters ? (
                  <div className="py-16 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading centres…</div>
                ) : centersForCity.length === 0 ? (
                  <div className="p-8 text-center bg-amber-50 border-2 border-amber-200 rounded-xl">
                    <div className="font-bold text-amber-800 mb-1">No centres for this age group in {city} yet</div>
                    <p className="text-sm text-amber-700">Tell us the day/time that works — we&apos;ll open a batch near you.</p>
                    <button onClick={() => setShowBatchReq(true)} disabled={submitting}
                      className="mt-4 px-5 py-2.5 rounded-lg bg-amber-800 text-white font-bold text-sm hover:bg-amber-900 disabled:opacity-60"
                      data-testid="request-callback-btn">
                      Request a batch near me
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5" data-testid="centers-list">
                    {centersForCity.map(c => (
                      <button key={c.id}
                        onClick={() => {
                          setCenterId(c.id);
                          setBatchId('');
                          if (c.has_matching_batch) {
                            setStep(5);
                          } else {
                            // Prefill the request modal with this centre so
                            // the user can ask for their preferred day/time
                            // at this specific location.
                            setReqForm(f => ({ ...f, preferred_area: c.name }));
                            setShowBatchReq(true);
                          }
                        }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 group ${
                          centerId === c.id
                            ? 'border-[#D63031] bg-red-50/40 shadow-md'
                            : c.has_matching_batch
                              ? 'border-slate-200 hover:border-[#1E3A5F] hover:bg-blue-50/40'
                              : 'border-slate-200 bg-slate-50/40 hover:border-amber-400 hover:bg-amber-50/40'
                        }`}
                        data-testid={`center-option-${c.id}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          centerId === c.id ? 'bg-[#D63031] text-white'
                            : c.has_matching_batch ? 'bg-slate-100 text-slate-500 group-hover:bg-[#1E3A5F] group-hover:text-white'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#0F1E33]">{c.name}</div>
                          {(c.address || c.city) && (
                            <div className="text-xs text-slate-500 truncate">{[c.address, c.city].filter(Boolean).join(' · ')}</div>
                          )}
                          {!c.has_matching_batch && (
                            <div className="mt-1 text-[11px] font-bold text-amber-700 flex items-center gap-1" data-testid={`center-nobatch-${c.id}`}>
                              <Clock className="w-3 h-3" /> No batches for {ageGroup} yrs yet — tap to request
                            </div>
                          )}
                        </div>
                        {centerId === c.id && <Check className="w-5 h-5 text-[#D63031] flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
                {/* Escape hatch on centre step — parent can add their own
                    area if the centres shown aren't near where they live. */}
                {centersForCity.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBatchReq(true)}
                    className="w-full mt-3 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#1E3A5F] text-slate-600 hover:text-[#1E3A5F] text-sm font-bold flex items-center justify-center gap-1.5"
                    data-testid="area-not-listed-btn">
                    <MapPin className="w-4 h-4" /> No centre in your area? Add your area
                  </button>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={goPrev}
                    className="px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm flex items-center gap-1.5"
                    data-testid="step4-back-btn">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 5: Batch (only batches at this centre for this age) ── */}
            {step === 5 && (
              <div>
                {selectedCenter && (
                  <div className="bg-blue-50/60 border-2 border-blue-100 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-[#1E3A5F]" />
                    <span className="font-bold text-[#0F1E33]">{selectedCenter.name}</span>
                    <span className="text-slate-500">· {ageGroup} yrs</span>
                    <button onClick={() => setStep(4)} className="ml-auto text-xs font-bold text-[#D63031] hover:underline" data-testid="change-center-btn">
                      Change centre
                    </button>
                  </div>
                )}

                {loadingBatches ? (
                  <div className="py-16 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading batches…</div>
                ) : batchesForCenter.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 text-sm text-amber-800 mb-4" data-testid="no-batches-msg">
                    No live batches for this age group at {selectedCenter?.name} yet. Tap <b>Request different time / centre</b> below and we&apos;ll open a batch for you.
                  </div>
                ) : (
                  <div className="space-y-2.5" data-testid="batches-list">
                    {batchesForCenter.map(b => (
                      <BatchCard
                        key={b.id}
                        batch={b}
                        selected={batchId === b.id}
                        onSelect={() => { setBatchId(b.id); handleSubmitTrial(b.id); }}
                        showCenter={false}
                      />
                    ))}
                    {/* Always allow parents to ask for a different day / time */}
                    <button
                      type="button"
                      onClick={() => setShowBatchReq(true)}
                      className="w-full mt-2 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#1E3A5F] text-slate-600 hover:text-[#1E3A5F] text-sm font-bold flex items-center justify-center gap-1.5"
                      data-testid="request-diff-timing-btn">
                      <Clock className="w-4 h-4" /> Request a different day, time or centre
                    </button>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={goPrev}
                    className="px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm flex items-center gap-1.5"
                    data-testid="step5-back-btn">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  {batchesForCenter.length === 0 && (
                    <button onClick={() => setShowBatchReq(true)} disabled={submitting}
                      className="flex-1 py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                      data-testid="request-callback-btn">
                      Request different time / centre <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  {submitting && batchesForCenter.length > 0 && (
                    <div className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D63031] to-[#1E3A5F] text-white font-bold flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Booking…
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Batch Request modal (different day/time/centre) ── */}
        {showBatchReq && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={() => setShowBatchReq(false)} data-testid="batch-req-modal">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F1E33] text-white px-5 py-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-blue-200">
                  <Sparkles className="w-3.5 h-3.5" /> Batch Preference
                </div>
                <h3 className="mt-1 text-lg font-black">Tell us what works for you</h3>
                <p className="text-xs text-blue-100/90 mt-0.5">We&apos;ll open a batch matching your day / time when there&apos;s enough demand.</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Preferred area or centre</div>
                  <input
                    value={reqForm.preferred_area}
                    onChange={e => setReqForm(f => ({ ...f, preferred_area: e.target.value }))}
                    placeholder="e.g. Kandivali, Andheri West, Whitefield…"
                    className="w-full text-sm px-3 py-2 rounded-lg border-2 border-slate-200 focus:outline-none focus:border-[#1E3A5F]"
                    data-testid="req-area" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Preferred days</div>
                  <div className="flex flex-wrap gap-2" data-testid="req-days">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
                      const on = reqForm.preferred_days.includes(d);
                      return (
                        <button type="button" key={d}
                          onClick={() => setReqForm(f => ({
                            ...f, preferred_days: on ? f.preferred_days.filter(x => x !== d) : [...f.preferred_days, d],
                          }))}
                          className={`text-xs px-3 py-1.5 rounded-full font-bold border-2 ${on ? 'bg-[#D63031] border-[#D63031] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
                          data-testid={`req-day-${d.toLowerCase()}`}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Preferred time</div>
                  <div className="grid grid-cols-3 gap-2" data-testid="req-time-slots">
                    {[
                      { key: 'Morning',   sub: '8 AM – 12 PM' },
                      { key: 'Afternoon', sub: '12 PM – 4 PM' },
                      { key: 'Evening',   sub: '4 PM – 8 PM' },
                    ].map(t => (
                      <button type="button" key={t.key}
                        onClick={() => setReqForm(f => ({ ...f, preferred_time: t.key }))}
                        className={`text-xs px-2 py-2 rounded-lg font-bold border-2 flex flex-col items-center leading-tight ${reqForm.preferred_time === t.key ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'}`}
                        data-testid={`req-time-${t.key.toLowerCase()}`}>
                        <span>{t.key}</span>
                        <span className={`text-[10px] font-semibold mt-0.5 ${reqForm.preferred_time === t.key ? 'text-blue-100' : 'text-slate-400'}`}>{t.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Anything else? (optional)</div>
                  <textarea
                    value={reqForm.notes}
                    onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    placeholder="Any other centre you'd prefer, or specific time slot…"
                    className="w-full text-sm px-3 py-2 rounded-lg border-2 border-slate-200 focus:outline-none focus:border-[#1E3A5F]"
                    data-testid="req-notes" />
                </div>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button type="button" onClick={() => setShowBatchReq(false)}
                  className="flex-1 py-2.5 rounded-lg border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm"
                  data-testid="req-cancel">Cancel</button>
                <button type="button" onClick={submitBatchRequest} disabled={reqSubmitting}
                  className="flex-[2] py-2.5 rounded-lg bg-[#D63031] hover:bg-[#B02324] text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                  data-testid="req-submit">
                  {reqSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <>Send request <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
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
                {[{ key: 'monthly', label: 'Monthly · ₹2,500/mo' }, { key: 'yearly', label: 'Yearly · ₹2,000/mo + Free Kit' }].map(p => (
                  <button type="button" key={p.key} onClick={() => setPlan(p.key)}
                    className={`text-xs px-3 py-2.5 rounded-lg font-bold ${plan === p.key ? 'bg-white text-[#0F1E33] shadow' : 'text-slate-500 hover:text-slate-700'}`}
                    data-testid={`plan-toggle-${p.key}`}>{p.label}</button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Phone *"><input type="tel" value={subForm.parent_phone} onChange={e => upd('parent_phone', e.target.value)} className="fs-input" required data-testid="parent-phone-input" /></Field>
                <Field label="Student Name *"><input value={subForm.student_name} onChange={e => upd('student_name', e.target.value)} className="fs-input" required data-testid="student-name-input" /></Field>
                <Field label="Age Group *" className="sm:col-span-2">
                  <div className="grid grid-cols-3 gap-2" data-testid="sub-age-list">
                    {[
                      { value: '3-7',   label: '3 – 7 yrs',   emoji: '🎨' },
                      { value: '8-11',  label: '8 – 11 yrs',  emoji: '🤖' },
                      { value: '12-16', label: '12 – 16 yrs', emoji: '🚀' },
                    ].map(a => (
                      <button key={a.value} type="button"
                        onClick={() => { upd('age_group', a.value); upd('center_id', ''); upd('batch_id', ''); }}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-0.5 ${
                          subForm.age_group === a.value
                            ? 'border-[#D63031] bg-red-50/40 shadow-sm'
                            : 'border-slate-200 hover:border-[#1E3A5F] hover:bg-blue-50/40'
                        }`}
                        data-testid={`sub-age-${a.value}`}>
                        <div className="text-xl">{a.emoji}</div>
                        <div className="font-bold text-xs text-[#0F1E33]">{a.label}</div>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Centre *">
                  <select value={subForm.center_id} onChange={e => { upd('center_id', e.target.value); upd('batch_id', ''); }} className="fs-input" required data-testid="sub-center-input">
                    <option value="">{loadingCenters ? 'Loading centres…' : 'Select centre…'}</option>
                    {subCentres.map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` · ${c.city}` : ''}</option>)}
                  </select>
                </Field>
                <Field label="Batch *">
                  <select value={subForm.batch_id} onChange={e => upd('batch_id', e.target.value)} className="fs-input" required disabled={!subForm.center_id} data-testid="sub-batch-input">
                    <option value="">{!subForm.center_id ? 'Pick a centre first' : loadingBatches ? 'Loading batches…' : subBatches.length === 0 ? 'No batches for this age group' : 'Select batch…'}</option>
                    {subBatches.map(b => <option key={b.id} value={b.id}>{b.name}{b.days?.length ? ' · ' + b.days.join('/') : ''}{b.time ? ' · ' + b.time : ''}</option>)}
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
  const dayText = daysLabel(batch.days) || 'Schedule';
  const timeText = timeLabel(batch.start_time, batch.end_time) || '—';
  return (
    <button
      onClick={onSelect}
      disabled={isFull}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        selected ? 'border-[#D63031] bg-red-50/40 shadow-md'
        : isFull ? 'border-slate-200 bg-slate-50'
        : 'border-slate-200 hover:border-[#1E3A5F] hover:bg-blue-50/40'
      }`}
      data-testid={`batch-option-${batch.id}`}>
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          selected ? 'bg-[#D63031] text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          <Calendar className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Big headline = Day + Timing (what parents actually care about) */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg sm:text-xl font-black text-[#0F1E33] tracking-tight" data-testid={`batch-day-${batch.id}`}>
              {dayText}
            </span>
            <span className="text-base sm:text-lg font-bold text-[#D63031]" data-testid={`batch-time-${batch.id}`}>
              {timeText}
            </span>
          </div>
          {/* Smaller secondary line — batch difficulty (level) + pills */}
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {batch.level && (
              <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]" data-testid={`batch-level-${batch.id}`}>
                {batch.level}
              </span>
            )}
            {batch.skill && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase tracking-wider">{batch.skill}</span>}
            {isFull && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold uppercase tracking-wider">Full</span>}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
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
