import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import useSeo from '../hooks/useSeo';
import axios from 'axios';
import { CheckCircle2, Loader2, Calendar, Clock, AlertCircle, MapPin, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FutureSkillsSuccessPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = params.get('type') === 'trial' ? 'trial' : 'subscription';
  const subId = params.get('subscription_id');
  const [status, setStatus] = useState(type === 'trial' ? 'paid' : 'verifying');
  const [sub, setSub] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    // Always verify when we have a subscription_id — the trial payment link
    // shares the same success URL and previously we skipped verify for
    // `type=trial`, which left paid subs stuck in "subscription_lead".
    if (!subId) { if (type === 'trial') return; setStatus('error'); setError('Missing subscription ID'); return; }
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

  useSeo({
    title: `${isTrial ? 'Trial Booked' : 'Subscription Active'} · Future Skills | OLL`,
    robots: 'noindex, follow',
    canonical: 'https://oll.co/future-skills',
  });

  // ── Minimal trial success view: welcome + day + time + centre ─────────
  if (isTrial) {
    const to12h = (t) => {
      if (!t) return '';
      const [hStr, mStr = '00'] = String(t).split(':');
      const h = parseInt(hStr, 10);
      if (Number.isNaN(h)) return t;
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = ((h + 11) % 12) + 1;
      return `${h12}:${mStr.padStart(2, '0')} ${period}`;
    };
    const days    = (params.get('days')  || '').split(',').filter(Boolean).join(' · ');
    const start   = to12h(params.get('start')  || '');
    const end     = to12h(params.get('end')    || '');
    const centre  = params.get('centre') || '';
    const address = params.get('address') || '';
    const maps    = params.get('maps')    || '';
    const nextDate = nextDateForDays(days);

    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50/40 to-white" data-testid="future-skills-success">
        <Navbar variant="futureskills" onBookDemo={() => navigate('/future-skills/book?mode=trial')} bookDemoLabel="Book Free Trial" />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg bg-white border-2 border-slate-100 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-blue-100/50 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-[#0F1E33]" data-testid="success-welcome">
              Welcome to OLL!
            </h1>
            <p className="text-slate-500 mt-2">Your free trial is booked.</p>

            {(days || start) && (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {days && <InfoTile icon={Calendar} label="Day" value={days} testid="success-day" />}
                {nextDate && <InfoTile icon={Calendar} label="Date" value={nextDate} testid="success-date" />}
                {(start || end) && (
                  <InfoTile icon={Clock} label="Time" value={`${start || '—'}${end ? ` – ${end}` : ''}`} testid="success-time" />
                )}
              </div>
            )}

            {/* Centre + address + Google Maps link */}
            {centre && (
              <div className="mt-5 text-left rounded-2xl border border-blue-100 bg-blue-50/50 p-5" data-testid="success-centre">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] text-white flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Your centre</div>
                    <div className="text-base font-black text-[#0F1E33] mt-0.5" data-testid="success-centre-name">{centre}</div>
                    {address && (
                      <div className="text-sm text-slate-600 mt-1 leading-snug" data-testid="success-centre-address">{address}</div>
                    )}
                    {maps && (
                      <a href={maps} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 rounded-lg bg-white border border-blue-200 hover:border-[#1E3A5F] text-[#1E3A5F] text-xs font-bold transition-colors"
                        data-testid="success-maps-link">
                        <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Subscription success view (unchanged legacy behaviour) ──────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-white" data-testid="future-skills-success">
      <Navbar variant="futureskills" onBookDemo={() => navigate('/future-skills/book?mode=trial')} bookDemoLabel="Book Free Trial" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-blue-100/50 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-[#1E3A5F] animate-spin" />
              <h1 className="text-2xl lg:text-3xl font-black text-[#0F1E33]">Confirming your payment…</h1>
              <p className="text-slate-500 mt-2">Hold tight — Cashfree usually takes a few seconds.</p>
            </>
          )}

          {status === 'paid' && sub && (
            <>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-[#0F1E33]">
                Welcome to Future Skills, {sub?.student_name?.split(' ')[0] || 'champion'}!
              </h1>
              <p className="text-slate-600 mt-3">
                Booking <span className="font-mono font-bold text-[#1E3A5F]">{sub.subscription_ref}</span> · {sub.plan_label} plan · ₹{(sub.amount || 0).toLocaleString()} paid
              </p>
              <button onClick={() => navigate('/')}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33]">
                Back to Home
              </button>
            </>
          )}

          {status === 'pending' && (
            <>
              <Loader2 className="w-14 h-14 mx-auto mb-4 text-[#D63031] animate-spin" />
              <h1 className="text-2xl font-black text-[#0F1E33]">Payment is taking a moment…</h1>
              <p className="text-slate-600 mt-2">Refresh in a minute, or check email/WhatsApp for confirmation.</p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-14 h-14 mx-auto mb-4 text-[#D63031]" />
              <h1 className="text-2xl font-black text-[#0F1E33]">Couldn&apos;t verify your payment</h1>
              <p className="text-slate-600 mt-2">{error}</p>
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

const InfoTile = ({ icon: Icon, label, value, testid }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 flex flex-col items-center gap-1.5" data-testid={testid}>
    <Icon className="w-4 h-4 text-[#1E3A5F]" />
    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
    <div className="text-sm font-black text-[#0F1E33] text-center leading-tight">{value}</div>
  </div>
);

// Compute the very next occurrence of any of the given day names (e.g. "Sat · Sun")
function nextDateForDays(daysStr) {
  if (!daysStr) return '';
  const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const targets = daysStr.split(' · ').map(d => short.indexOf(d.trim())).filter(i => i >= 0);
  if (!targets.length) return '';
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (targets.includes(d.getDay())) {
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  }
  return '';
}

export default FutureSkillsSuccessPage;
