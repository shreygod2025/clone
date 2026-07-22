import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Check, ArrowRight, Loader2, ShieldCheck, MapPin, Calendar, Sparkles,
  Heart, Users, Trophy, X, Phone, Mail, User, Home,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Hero — official Friendship Day flyer
const HERO_IMG = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/wqisxdqr_WhatsApp%20Image%202026-07-22%20at%209.51.11%20AM.jpeg';
const HERO_FALLBACK = 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=1200&q=80';

// Event date — single confirmed date
const WORKSHOP_DATES = 'Sunday, 2nd August 2026';

// "As Seen On" logos (transparent PNGs)
const AS_SEEN_LOGOS = [
  { name: 'Kaun Banega Crorepati', src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/jx3fnrhd_3.png' },
  { name: 'Shark Tank India',       src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/1rcosycu_1.png' },
  { name: 'STEM Accredited Educational Experience', src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/r6tt9qmw_2.png' },
];

const HIGHLIGHTS = [
  { icon: Heart,   title: 'Celebrate Friendship',  desc: 'Hands-on projects designed around friendship & bonding' },
  { icon: Sparkles, title: 'Real Skills',         desc: '3D printing · Coding · Design — take home real creations' },
  { icon: Users,   title: 'Small Batches',        desc: 'Max 12 kids per session for personal mentorship' },
  { icon: Trophy,  title: 'Certificate',          desc: 'OLL Achievement Certificate + digital badge' },
];

const FAQS = [
  { q: 'Who can join?', a: 'Kids aged 6 to 14. We adapt the difficulty by age group inside the session.' },
  { q: 'Do we bring anything?', a: 'No — all materials (3D pen filament, laptops, kits) are provided at the venue.' },
  { q: 'What is the schedule?', a: 'The workshop runs on Sunday, 2nd August 2026 — a hands-on ~2 hour session. The Mega Combo covers both projects in a single extended session.' },
  { q: 'Refund policy?', a: 'Full refund available up to 48 hours before the workshop. Reschedules always free.' },
];

const FriendshipDayLanding = () => {
  const [catalog, setCatalog] = useState({ workshops: [], centers: [] });
  const [showForm, setShowForm] = useState(false);
  const [cashfreeReady, setCashfreeReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', age: '',
    address: '', workshop: '', center: '',
    knows_oll: false, participated_before: false, previous_workshop: '',
  });

  // Load Cashfree SDK
  useEffect(() => {
    if (window.Cashfree) { setCashfreeReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    s.async = true;
    s.onload = () => setCashfreeReady(true);
    s.onerror = () => toast.error('Payment SDK failed to load — please refresh');
    document.head.appendChild(s);
  }, []);

  // Fetch workshops + centers
  useEffect(() => {
    axios.get(`${API}/friendship-day/catalog`)
      .then(r => setCatalog(r.data || { workshops: [], centers: [] }))
      .catch(() => toast.error('Could not load workshop details'));
  }, []);

  const selectedWorkshop = useMemo(
    () => catalog.workshops.find(w => w.key === form.workshop),
    [form.workshop, catalog.workshops]
  );
  const selectedCenter = useMemo(
    () => catalog.centers.find(c => c.key === form.center),
    [form.center, catalog.centers]
  );

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    if (form.full_name.trim().length < 2) return 'Please enter the child\u2019s full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email';
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length !== 10) return 'Phone must be exactly 10 digits';
    const age = parseInt(form.age, 10);
    if (isNaN(age) || age < 3 || age > 18) return 'Age should be between 3 and 18';
    if (form.address.trim().length < 5) return 'Please enter your address';
    if (!form.workshop) return 'Please choose a workshop';
    if (!form.center) return 'Please choose a center';
    return null;
  };

  const handleRegisterAndPay = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!cashfreeReady || !window.Cashfree) {
      toast.error('Payment SDK still loading — try again in a second');
      return;
    }
    setBusy(true);
    try {
      const reg = await axios.post(`${API}/friendship-day/register`, {
        ...form,
        phone: form.phone.replace(/\D/g, ''),
        age: parseInt(form.age, 10),
      });
      const registrationId = reg.data.registration_id;

      const init = await axios.post(`${API}/friendship-day/initiate-payment`, {
        registration_id: registrationId,
        frontend_url: window.location.origin,
      });

      const { payment_session_id, environment, order_id } = init.data || {};
      if (!payment_session_id) {
        toast.error('Could not initialise payment session.');
        return;
      }

      const cashfree = window.Cashfree({
        mode: environment === 'production' ? 'production' : 'sandbox',
      });
      const isPreview = !/^(oll\.co|www\.oll\.co|eventmate-19\.emergent\.host)$/.test(window.location.hostname);
      const result = await cashfree.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: isPreview ? '_modal' : '_self',
      });

      if (result?.error) {
        const msg = result.error.message || '';
        if (/not enabled|whitelist|approved/i.test(msg)) {
          toast.error('Preview build — Cashfree needs this domain whitelisted. Payments work on the live site.');
        } else {
          toast.error(msg || 'Payment was not completed. Please try again.');
        }
      } else if (result?.paymentDetails?.paymentMessage) {
        // Modal was closed with a status
        window.location.href = `${window.location.origin}/friendship-day/success?order_id=${order_id}&registration_id=${registrationId}`;
      } else if (!result?.redirect && order_id) {
        window.location.href = `${window.location.origin}/friendship-day/success?order_id=${order_id}&registration_id=${registrationId}`;
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Something went wrong. Please try again.';
      toast.error(typeof msg === 'string' ? msg : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-rose-50" data-testid="friendship-day-page">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-amber-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-bold text-[#1E3A5F] tracking-tight">OLL · Friendship Day</div>
          <button
            onClick={() => setShowForm(true)}
            className="h-9 px-4 rounded-full bg-[#D63031] hover:bg-red-700 text-white text-xs font-semibold shadow-sm"
            data-testid="fd-nav-register-btn"
          >
            Register Now
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-6 md:pt-10 pb-8">
        <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold uppercase tracking-wider">
              <Heart className="w-3 h-3" /> Friendship Day 2026
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
              Make something <span className="text-[#D63031]">unforgettable</span> with your best friend.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-lg">
              Two hands-on workshops for kids 6–14. Design a 3D friendship bracelet or code a digital
              friendship card — take home a real creation and a memory that lasts.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-700">
              <div className="inline-flex items-center gap-1.5 bg-white border border-amber-200 rounded-full px-3 py-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" /> {WORKSHOP_DATES}
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white border border-amber-200 rounded-full px-3 py-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" /> Kandivali · Mira Road
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 h-12 px-6 rounded-xl bg-[#D63031] hover:bg-red-700 text-white font-semibold text-sm flex items-center gap-2 shadow-md"
              data-testid="fd-hero-register-btn"
            >
              Reserve your spot <ArrowRight className="w-4 h-4" />
            </button>
            <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Secure Cashfree checkout · UPI · Cards · Netbanking
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-amber-100 bg-white">
            <img
              src={HERO_IMG}
              alt="OLL Friendship Day Workshop — Sunday 2nd August 2026"
              className="block w-full h-auto object-contain"
              loading="eager"
              onError={(e) => { e.currentTarget.src = HERO_FALLBACK; }}
              data-testid="fd-hero-image"
            />
          </div>
        </div>
      </section>

      {/* As Seen On */}
      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12" data-testid="fd-as-seen-on">
        <div className="text-center">
          <div className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-slate-500">As Seen On</div>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-6 sm:gap-10 md:gap-16 items-center justify-items-center">
          {AS_SEEN_LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center justify-center h-24 sm:h-32 md:h-40 w-full transition-transform duration-300 ease-out hover:scale-110 hover:drop-shadow-2xl"
              data-testid={`fd-logo-${logo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
            >
              <img
                src={logo.src}
                alt={logo.name}
                title={logo.name}
                className="max-h-full max-w-[180px] sm:max-w-[220px] md:max-w-[280px] object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Workshop cards */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Pick your workshop</h2>
          <p className="text-sm text-slate-500 mt-1">All materials & mentorship included</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {catalog.workshops.map(w => {
            const isCombo = w.key === 'combo';
            return (
              <button
                key={w.key}
                onClick={() => { update('workshop', w.key); setShowForm(true); }}
                className={`text-left rounded-2xl p-5 border-2 transition-all bg-white hover:shadow-lg ${
                  isCombo ? 'border-[#D63031] shadow-md relative' : 'border-slate-200 hover:border-amber-300'
                }`}
                data-testid={`fd-workshop-card-${w.key}`}
              >
                {isCombo && (
                  <span className="absolute -top-2 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                    Best value
                  </span>
                )}
                <div className="text-xs font-bold uppercase tracking-widest text-amber-600">
                  {isCombo ? 'Combo' : w.key === 'bracelet' ? '3D Design' : 'Coding'}
                </div>
                <div className="mt-2 font-bold text-slate-900 text-lg leading-snug">{w.name}</div>
                <div className="mt-3 text-3xl font-black text-slate-900">
                  ₹{Number(w.amount).toLocaleString('en-IN')}
                </div>
                {isCombo && (
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                    Save ₹199 vs booking both separately
                  </div>
                )}
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#D63031]">
                  Select this workshop <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl bg-white border border-amber-100 p-4">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-amber-700" />
              </div>
              <div className="mt-3 font-semibold text-slate-900 text-sm">{title}</div>
              <div className="text-xs text-slate-500 mt-1">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Centers */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-center text-2xl font-bold text-slate-900">Where we are</h2>
        <div className="grid md:grid-cols-2 gap-3 mt-6">
          {catalog.centers.map(c => (
            <div key={c.key} className="rounded-xl bg-white border border-amber-100 p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#D63031] mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 text-sm">
                  {c.key === 'kandivali' ? 'Kandivali West' : 'Mira Road East'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{c.name}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="text-center text-2xl font-bold text-slate-900">Questions parents ask</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="rounded-xl bg-white border border-amber-100 p-4">
              <summary className="cursor-pointer font-semibold text-slate-900 text-sm">{q}</summary>
              <div className="text-xs text-slate-600 mt-2 leading-relaxed">{a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t border-amber-100 p-3 z-40">
        <button
          onClick={() => setShowForm(true)}
          className="w-full h-12 rounded-xl bg-[#D63031] hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2"
          data-testid="fd-sticky-register-btn"
        >
          Reserve your spot <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8 text-center text-xs text-slate-500">
        Questions? Email <a href="mailto:info@oll.co" className="text-[#D63031] hover:underline">info@oll.co</a>
      </footer>

      {/* Registration Modal */}
      {showForm && (
        <RegistrationModal
          form={form}
          update={update}
          catalog={catalog}
          selectedWorkshop={selectedWorkshop}
          selectedCenter={selectedCenter}
          busy={busy}
          onClose={() => setShowForm(false)}
          onSubmit={handleRegisterAndPay}
        />
      )}
    </div>
  );
};

/** Registration Modal */
const RegistrationModal = ({ form, update, catalog, selectedWorkshop, selectedCenter, busy, onClose, onSubmit }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4 overflow-y-auto" data-testid="fd-modal">
      <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-600">Register</div>
            <h3 className="text-lg font-bold text-slate-900">Friendship Day Workshop</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center" data-testid="fd-modal-close">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Child details */}
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Child's full name *" icon={User}>
              <input
                type="text" value={form.full_name}
                onChange={e => update('full_name', e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D63031]"
                data-testid="fd-input-full-name"
              />
            </Field>
            <Field label="Age *">
              <input
                type="number" min="3" max="18" value={form.age}
                onChange={e => update('age', e.target.value)}
                placeholder="6 – 14"
                className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D63031]"
                data-testid="fd-input-age"
              />
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Parent email *" icon={Mail}>
              <input
                type="email" value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="parent@example.com"
                className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D63031]"
                data-testid="fd-input-email"
              />
            </Field>
            <Field label="Parent phone *" icon={Phone}>
              <input
                type="tel" value={form.phone}
                onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                inputMode="numeric"
                className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D63031]"
                data-testid="fd-input-phone"
              />
            </Field>
          </div>
          <Field label="Address *" icon={Home}>
            <textarea
              value={form.address}
              onChange={e => update('address', e.target.value)}
              placeholder="Building / Street / Area / Pincode"
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D63031]"
              data-testid="fd-input-address"
            />
          </Field>

          {/* Workshop selector */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Choose workshop *</div>
            <div className="grid grid-cols-1 gap-2">
              {catalog.workshops.map(w => {
                const active = form.workshop === w.key;
                return (
                  <button
                    key={w.key} type="button"
                    onClick={() => update('workshop', w.key)}
                    className={`text-left rounded-lg border-2 px-3 py-2.5 flex items-center justify-between ${
                      active ? 'border-[#D63031] bg-red-50/50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    data-testid={`fd-select-workshop-${w.key}`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{w.name}</div>
                      <div className="text-[11px] text-slate-500">₹{Number(w.amount).toLocaleString('en-IN')}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${active ? 'border-[#D63031] bg-[#D63031]' : 'border-slate-300'}`}>
                      {active && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center selector */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Choose center *</div>
            <div className="grid grid-cols-1 gap-2">
              {catalog.centers.map(c => {
                const active = form.center === c.key;
                return (
                  <button
                    key={c.key} type="button"
                    onClick={() => update('center', c.key)}
                    className={`text-left rounded-lg border-2 px-3 py-2.5 flex items-start gap-2 ${
                      active ? 'border-[#D63031] bg-red-50/50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    data-testid={`fd-select-center-${c.key}`}
                  >
                    <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${active ? 'text-[#D63031]' : 'text-slate-400'}`} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {c.key === 'kandivali' ? 'Kandivali West' : 'Mira Road East'}
                      </div>
                      <div className="text-[11px] text-slate-500">{c.name}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${active ? 'border-[#D63031] bg-[#D63031]' : 'border-slate-300'}`}>
                      {active && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional survey */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox" checked={form.knows_oll}
                onChange={e => update('knows_oll', e.target.checked)}
                className="mt-0.5"
                data-testid="fd-checkbox-knows-oll"
              />
              <span className="text-xs text-slate-700">I&apos;ve heard of OLL before</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox" checked={form.participated_before}
                onChange={e => update('participated_before', e.target.checked)}
                className="mt-0.5"
                data-testid="fd-checkbox-participated"
              />
              <span className="text-xs text-slate-700">My child has attended an OLL workshop before</span>
            </label>
            {form.participated_before && (
              <input
                type="text" value={form.previous_workshop}
                onChange={e => update('previous_workshop', e.target.value)}
                placeholder="Which workshop? (optional)"
                className="w-full h-9 px-3 border border-amber-300 rounded-lg text-xs mt-1"
                data-testid="fd-input-previous-workshop"
              />
            )}
          </div>

          {/* Live order summary */}
          {(selectedWorkshop || selectedCenter) && (
            <div className="rounded-xl bg-slate-900 text-white p-4" data-testid="fd-order-summary">
              <div className="text-[11px] uppercase tracking-widest text-amber-300 font-bold">Order summary</div>
              {selectedWorkshop && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm">{selectedWorkshop.name}</span>
                  <span className="text-sm font-semibold">₹{Number(selectedWorkshop.amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              {selectedCenter && (
                <div className="text-[11px] text-slate-300 mt-1">
                  <MapPin className="w-3 h-3 inline mr-1" />{selectedCenter.name}
                </div>
              )}
              <div className="border-t border-slate-700 mt-3 pt-3 flex items-center justify-between">
                <span className="text-xs text-slate-300">Total payable</span>
                <span className="text-xl font-black text-amber-300">
                  ₹{Number(selectedWorkshop?.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sticky submit */}
        <div className="border-t border-slate-100 p-4 bg-white sticky bottom-0">
          <button
            onClick={onSubmit}
            disabled={busy}
            className="w-full h-12 rounded-xl bg-[#D63031] hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="fd-submit-btn"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {busy ? 'Redirecting to secure payment…' :
              (selectedWorkshop ? `Pay ₹${Number(selectedWorkshop.amount).toLocaleString('en-IN')} & Reserve` : 'Reserve my spot')}
          </button>
          <div className="text-center text-[10px] text-slate-400 mt-2">
            You&apos;ll be redirected to Cashfree · UPI · Cards · Netbanking · Wallets
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, icon: Icon, children }) => (
  <div>
    <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />} {label}
    </label>
    <div className="mt-1">{children}</div>
  </div>
);

export default FriendshipDayLanding;
