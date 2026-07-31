import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { openCashfreeCheckout } from '../utils/cashfreeCheckout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

// Format ms → "hh h mm m ss s" (or "expired")
const fmtCountdown = (msLeft) => {
  if (msLeft <= 0) return 'expired';
  const s = Math.floor(msLeft / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
};

/**
 * Public white-labeled payment page — parents open this OLL-branded URL
 * (e.g. /pay/<token>) which resolves the underlying Cashfree checkout
 * session and hands off to Cashfree only on button click. Raw Cashfree
 * URLs are never exposed to end users.
 */
export default function PaymentRedirect() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [launching, setLaunching] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get(`${API}/future-skills/pay/${token}`);
        if (!cancelled) setState({ loading: false, data: r.data, error: null });
      } catch (e) {
        if (!cancelled) setState({
          loading: false,
          data: null,
          error: e.response?.data?.detail || 'Payment link not found or has expired.',
        });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Tick every second for the 24-hour countdown label.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const pay = async () => {
    if (!state.data?.payment_session_id) return;
    setLaunching(true);
    try {
      await openCashfreeCheckout({
        paymentSessionId: state.data.payment_session_id,
        mode: 'production',
        redirectTarget: '_self',
      });
    } catch (e) {
      setLaunching(false);
      setState(s => ({ ...s, error: e.message || 'Unable to open secure checkout. Please try again.' }));
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center" data-testid="pay-loading">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F] mx-auto" />
          <p className="mt-3 text-slate-500 text-sm font-medium">Loading your secure payment…</p>
        </div>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border-2 border-red-100 shadow-xl p-8 text-center" data-testid="pay-error">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-black text-[#0F1E33]">Link unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{state.error || 'This payment link is invalid or has expired.'}</p>
          <Link to="/future-skills" className="mt-6 inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold" data-testid="pay-error-home">
            Visit OLL Future Skills <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const d = state.data;
  const expiresAt = d.expires_at ? new Date(d.expires_at).getTime() : null;
  const msLeft = expiresAt ? Math.max(0, expiresAt - now) : null;
  const expired = msLeft !== null && msLeft <= 0;

  if (d.already_paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border-2 border-emerald-100 shadow-xl p-8 text-center" data-testid="pay-already-paid">
          <img src={OLL_LOGO} alt="OLL" className="h-9 mx-auto mb-5" data-testid="pay-logo-paid" />
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-black text-[#0F1E33]">Payment already received</h1>
          <p className="mt-2 text-sm text-slate-600">
            Thanks! We&apos;ve already received payment for {d.student_name || 'this enrolment'}.
            Our team will reach out with next steps.
          </p>
          <Link to="/future-skills" className="mt-6 inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold" data-testid="pay-already-paid-home">
            Explore Future Skills <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const gross = d.amount_before_discount || d.amount;
  const hasDiscount = d.discount_pct && d.discount_pct > 0 && gross > d.amount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full bg-white rounded-3xl border-2 border-slate-100 shadow-2xl shadow-blue-100/40 overflow-hidden" data-testid="pay-card">
        {/* Logo strip */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <img src={OLL_LOGO} alt="OLL" className="h-8" data-testid="pay-logo" />
          {msLeft !== null && (
            <div
              className={`text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                expired
                  ? 'bg-red-100 text-red-700'
                  : msLeft < 3 * 3600 * 1000
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
              }`}
              data-testid="pay-countdown"
              title="This secure payment link is valid for 24 hours from creation.">
              <Clock className="w-3 h-3" />
              {expired ? 'Link expired' : `Expires in ${fmtCountdown(msLeft)}`}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F1E33] text-white px-6 py-7">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-blue-200">
            <Sparkles className="w-3.5 h-3.5" /> Future Skills · Continuous Learning
          </div>
          <h1 className="mt-2 text-2xl font-black leading-tight">
            Complete payment for {d.student_name || 'your child'}
          </h1>
          <p className="mt-1 text-sm text-blue-100/90">
            You&apos;re one tap away from securing the seat.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Enrolment summary */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/60" data-testid="pay-summary">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Student</div>
                <div className="font-bold text-[#0F1E33] truncate">{d.student_name || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Plan</div>
                <div className="font-bold text-[#0F1E33]">{d.plan_label || d.plan}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Centre</div>
                <div className="font-bold text-[#0F1E33] truncate">{d.center_name || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Batch</div>
                <div className="font-bold text-[#0F1E33] truncate" data-testid="pay-batch">{d.batch_name || '—'}</div>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="border-2 border-[#1E3A5F]/10 rounded-2xl p-5 bg-blue-50/40" data-testid="pay-amount">
            <div className="text-[10px] uppercase tracking-widest text-[#1E3A5F] font-bold">You&apos;ll pay</div>
            <div className="flex items-baseline gap-3 mt-1 flex-wrap">
              <div className="text-4xl font-black text-[#0F1E33]">
                ₹{Number(d.amount || 0).toLocaleString('en-IN')}
              </div>
              {hasDiscount && (
                <>
                  <div className="text-lg text-slate-400 font-semibold line-through">
                    ₹{Number(gross).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                    {d.discount_pct}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Pay CTA */}
          <button
            onClick={pay}
            disabled={launching || !d.payment_session_id || expired}
            className="w-full py-4 rounded-2xl bg-[#D63031] hover:bg-[#B02324] text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-red-200/60 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            data-testid="pay-cta">
            {expired ? (
              <>Link expired — request a new one</>
            ) : launching ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Opening secure checkout…</>
            ) : (
              <>Pay ₹{Number(d.amount || 0).toLocaleString('en-IN')} securely <ArrowRight className="w-5 h-5" /></>
            )}
          </button>

          {/* Trust strip */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500" data-testid="pay-trust">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Secure payment powered by Cashfree · 256-bit SSL
          </div>
        </div>
      </div>
    </div>
  );
}
