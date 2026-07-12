import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const HERO_IMG = 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/y7ilz188_image.png';

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '₹3,000',
    per: '/month',
    sub: 'Billed every month',
    savings: '',
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '₹2,500',
    per: '/month',
    sub: '₹30,000 billed up-front · 12 months',
    savings: 'Save ₹6,000',
    recommended: true,
  },
];

const DiscoverPayment = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    student_name: '',
    parent_email: '',
    parent_name: '',
    parent_phone: '',
    plan: 'annual',
  });
  const [busy, setBusy] = useState(false);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    if (form.student_name.trim().length < 2) return 'Please enter the student\u2019s name';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.parent_email)) return 'Please enter a valid parent email';
    if (!['monthly', 'annual'].includes(form.plan)) return 'Please choose a plan';
    return null;
  };

  const handlePay = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const create = await axios.post(`${API}/discover/create-booking`, form);
      const bookingId = create.data.booking_id;
      const init = await axios.post(`${API}/discover/initiate-payment`, {
        booking_id: bookingId,
        frontend_url: window.location.origin,
      });
      if (init.data?.payment_link) {
        window.location.href = init.data.payment_link;
      } else {
        toast.error('Could not open payment gateway. Please try again.');
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Something went wrong. Please try again.';
      toast.error(typeof msg === 'string' ? msg : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="discover-page">
      {/* Top brand strip */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#D63031] text-white flex items-center justify-center font-bold text-sm">
            OLL
          </div>
          <span className="text-sm font-semibold text-slate-800">OLL — Skills for All</span>
        </div>
      </div>

      {/* Hero image */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <img
          src={HERO_IMG}
          alt="52 Weeks Skills — a new skill every week for your child"
          className="w-full rounded-2xl shadow-sm border border-slate-100"
          data-testid="discover-hero-image"
        />
      </div>

      {/* Form + Plans */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6" data-testid="discover-form">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Enrol your child</h2>
          <p className="text-sm text-slate-500 mt-1">A new skill every week · 52 weeks of guided discovery</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            <div>
              <label className="text-xs font-medium text-slate-700">Student Name *</label>
              <input
                type="text"
                value={form.student_name}
                onChange={(e) => update('student_name', e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                data-testid="discover-input-student-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Parent Email *</label>
              <input
                type="email"
                value={form.parent_email}
                onChange={(e) => update('parent_email', e.target.value)}
                placeholder="parent@example.com"
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                data-testid="discover-input-parent-email"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Parent Name (optional)</label>
              <input
                type="text"
                value={form.parent_name}
                onChange={(e) => update('parent_name', e.target.value)}
                placeholder="Full name"
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                data-testid="discover-input-parent-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Parent Phone (optional)</label>
              <input
                type="tel"
                value={form.parent_phone}
                onChange={(e) => update('parent_phone', e.target.value)}
                placeholder="10-digit mobile"
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                data-testid="discover-input-parent-phone"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Choose a plan
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PLANS.map((p) => {
                const selected = form.plan === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => update('plan', p.id)}
                    className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                      selected
                        ? 'border-[#D63031] bg-red-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    data-testid={`discover-plan-${p.id}`}
                  >
                    {p.recommended && (
                      <span className="absolute -top-2 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                        Best value
                      </span>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{p.label}</div>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-slate-900">{p.price}</span>
                          <span className="text-xs text-slate-500">{p.per}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">{p.sub}</div>
                        {p.savings && (
                          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                            {p.savings}
                          </div>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${selected ? 'border-[#D63031] bg-[#D63031]' : 'border-slate-300'}`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={busy}
            className="mt-6 w-full h-12 rounded-xl bg-[#D63031] hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="discover-pay-btn"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {busy ? 'Redirecting to secure payment…' : `Pay ${form.plan === 'annual' ? '₹30,000' : '₹3,000'} & Enrol`}
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Secure checkout via Cashfree · UPI · Cards · Netbanking · Wallets
          </div>
        </div>

        <div className="text-center text-xs text-slate-400">
          Questions? Email <a href="mailto:hello@oll.co" className="text-red-600 hover:underline">hello@oll.co</a>
        </div>
      </div>
    </div>
  );
};

export default DiscoverPayment;
