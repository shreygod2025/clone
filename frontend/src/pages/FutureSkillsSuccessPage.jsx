import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { CheckCircle2, Loader2, Sparkles, Calendar, Home, AlertCircle, Gift } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FutureSkillsSuccessPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = params.get('type') === 'trial' ? 'trial' : 'subscription';
  const subId = params.get('subscription_id');
  const trialRef = params.get('ref');
  const [status, setStatus] = useState(type === 'trial' ? 'paid' : 'verifying');
  const [sub, setSub] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (type === 'trial') return;
    if (!subId) { setStatus('error'); setError('Missing subscription ID'); return; }
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const r = await axios.get(`${API}/future-skills/verify/${subId}`);
        setSub(r.data?.subscription || null);
        if (r.data?.status === 'PAID') { setStatus('paid'); return; }
        if (attempts >= 8) { setStatus('pending'); return; }
        setTimeout(tick, 2000);
      } catch (e) {
        if (attempts >= 5) { setStatus('error'); setError(e.response?.data?.detail || 'Could not verify'); }
        else setTimeout(tick, 2000);
      }
    };
    tick();
  }, [subId, type]);

  const isTrial = type === 'trial';

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white" data-testid="future-skills-success">
      <Helmet><title>{isTrial ? 'Trial Booked' : 'Subscription Active'} · Future Skills | OLL</title></Helmet>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-orange-100/40 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-orange-500 animate-spin" />
              <h1 className="text-2xl lg:text-3xl font-black text-[#0F1E33]">Confirming your payment…</h1>
              <p className="text-slate-500 mt-2">Hold tight — Cashfree usually takes a few seconds.</p>
            </>
          )}

          {status === 'paid' && (
            <>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-orange-50 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-orange-500" />
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-orange-600 uppercase">
                <Sparkles className="w-3.5 h-3.5" /> {isTrial ? 'Free trial booked' : 'Subscription active'}
              </span>
              <h1 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">
                {isTrial
                  ? 'Welcome to OLL — see you soon!'
                  : `Welcome to Future Skills, ${sub?.student_name?.split(' ')[0] || 'champion'}!`}
              </h1>
              <p className="text-slate-600 mt-3 max-w-xl mx-auto">
                {isTrial && trialRef && <>Booking ref <span className="font-mono font-bold text-[#1E3A5F]">{trialRef}</span> · We'll WhatsApp shortly to lock your trial slot.</>}
                {!isTrial && sub && <>Booking <span className="font-mono font-bold text-[#1E3A5F]">{sub.subscription_ref}</span> · {sub.plan_label} plan · ₹{(sub.amount || 0).toLocaleString()} paid</>}
              </p>

              {!isTrial && sub && (
                <div className="mt-8 grid sm:grid-cols-3 gap-3 text-left">
                  <Stat label="Plan" value={sub.plan_label} />
                  <Stat label="Mode" value="Offline · Once a week" />
                  <Stat label="Robotic Kit" value={sub.plan === 'yearly' ? 'Free · Ships 5-7 days' : 'At centre'} />
                </div>
              )}

              <div className="mt-8 bg-orange-50 border border-orange-100 rounded-2xl p-5 text-left text-sm text-slate-700 space-y-2">
                <p className="font-bold text-[#0F1E33]">What happens next</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>WhatsApp + Email confirmation just landed in your inbox.</li>
                  <li>Our team will call within 24h to assign your nearest centre & batch slot.</li>
                  {!isTrial
                    ? <li>{sub?.plan === 'yearly' ? 'Robotic kit ships in 5-7 working days.' : 'Day 1 starts your weekly journey.'}</li>
                    : <li>The trial class is fully complimentary — bring just your kid + curiosity.</li>}
                </ol>
              </div>

              <button onClick={() => navigate('/')}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] transition-all shadow-lg shadow-blue-900/20"
                data-testid="success-home-btn">
                <Home className="w-4 h-4" /> Back to Home
              </button>

              {/* Soft pitch — only for trial bookings */}
              {isTrial && (
                <div className="mt-10 text-left bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 text-white rounded-3xl p-6 lg:p-8 relative overflow-hidden" data-testid="success-soft-pitch">
                  <div className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                      backgroundSize: '40px 40px',
                    }} />
                  <div className="relative">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 border border-white/30 text-[10px] font-bold tracking-widest uppercase backdrop-blur-sm">
                      <Sparkles className="w-3 h-3" /> Save your seat early
                    </div>
                    <h3 className="text-xl lg:text-2xl font-black mt-3">Already sure? Lock the full year now & save ₹3,000.</h3>
                    <p className="text-orange-50 text-sm mt-2 max-w-lg">
                      Yearly subscribers get the robotic kit free, priority batch slot, and the year-end Tech Showcase entry. Cancel anytime.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3 mt-5">
                      <button onClick={() => navigate('/future-skills/book?mode=subscribe&plan=yearly')}
                        className="px-5 py-3 rounded-xl bg-white text-[#1E3A5F] font-bold text-sm hover:bg-slate-100 transition-all shadow-lg flex items-center justify-center gap-2"
                        data-testid="soft-pitch-yearly-btn">
                        <Gift className="w-4 h-4" /> Subscribe Yearly · ₹1,750/mo
                      </button>
                      <button onClick={() => navigate('/future-skills/book?mode=subscribe&plan=monthly')}
                        className="px-5 py-3 rounded-xl border-2 border-white text-white font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        data-testid="soft-pitch-monthly-btn">
                        <Calendar className="w-4 h-4" /> Subscribe Monthly · ₹2,000/mo
                      </button>
                    </div>
                    <p className="text-[11px] text-orange-100 mt-3 opacity-90">No pressure — your free trial is fully booked either way.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {status === 'pending' && (
            <>
              <Loader2 className="w-14 h-14 mx-auto mb-4 text-amber-500 animate-spin" />
              <h1 className="text-2xl font-black text-[#0F1E33]">Payment is taking a moment…</h1>
              <p className="text-slate-600 mt-2">Refresh in a minute, or check email/WhatsApp for confirmation.</p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-14 h-14 mx-auto mb-4 text-rose-500" />
              <h1 className="text-2xl font-black text-[#0F1E33]">Couldn't verify your payment</h1>
              <p className="text-slate-600 mt-2">{error}</p>
              <p className="text-slate-500 mt-2 text-sm">If money was debited, ping welcome@oll.co with your booking ID — we'll fix it.</p>
              <Link to="/future-skills" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33]">
                Back to Future Skills
              </Link>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
    <div className="text-base font-black text-[#0F1E33] mt-0.5">{value}</div>
  </div>
);

export default FutureSkillsSuccessPage;
