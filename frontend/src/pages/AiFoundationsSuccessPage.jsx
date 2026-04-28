import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { CheckCircle2, Loader2, Sparkles, ArrowRight, Home, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AiFoundationsSuccessPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const bid = params.get('booking_id');
    if (!bid) { setStatus('error'); setError('Missing booking ID'); return; }

    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const r = await axios.get(`${API}/ai-foundations/verify/${bid}`);
        setBooking(r.data?.booking || null);
        if (r.data?.status === 'PAID') { setStatus('paid'); return; }
        if (attempts >= 8) { setStatus('pending'); return; }
        setTimeout(tick, 2000);
      } catch (e) {
        if (attempts >= 5) {
          setStatus('error');
          setError(e.response?.data?.detail || e.message || 'Could not verify payment');
        } else {
          setTimeout(tick, 2000);
        }
      }
    };
    tick();
  }, [params]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white" data-testid="ai-foundations-success">
      <Helmet>
        <title>Enrolment Confirmed · AI Foundations | OLL</title>
      </Helmet>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-blue-900/10 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
              <h1 className="text-2xl lg:text-3xl font-black text-[#0F1E33]">Confirming your payment…</h1>
              <p className="text-slate-500 mt-2">Hold tight — Cashfree usually takes a few seconds.</p>
            </>
          )}

          {status === 'paid' && booking && (
            <>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-blue-600" />
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-blue-600 uppercase">
                <Sparkles className="w-3.5 h-3.5" /> Welcome to AI Foundations
              </span>
              <h1 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">Seat confirmed for {booking.student_name?.split(' ')[0] || 'your child'}!</h1>
              <p className="text-slate-600 mt-3 max-w-xl mx-auto">
                Booking <span className="font-mono font-bold text-[#1E3A5F]">{booking.booking_ref}</span> ·
                {' '}{booking.track_label} · ₹{(booking.amount || 1999).toLocaleString()} paid
              </p>

              <div className="mt-8 grid sm:grid-cols-3 gap-3 text-left">
                <Stat label="Mode" value="Online live" />
                <Stat label="Track" value={booking.track_label || '—'} />
                <Stat label="Cohort size" value="12 students" />
              </div>

              <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-5 text-left text-sm text-slate-700 space-y-2">
                <p className="font-bold text-[#0F1E33]">What happens next</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Receipt landed in <span className="font-semibold">{booking.parent_email}</span> (and on WhatsApp).</li>
                  <li>Cohort batch link + Day 1 schedule arrives within 24 hours.</li>
                  <li>Educator Vrishank will host a 10-min orientation call within 48 hours.</li>
                </ol>
              </div>

              <button
                onClick={() => navigate('/')}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] transition-all shadow-lg shadow-blue-900/20"
                data-testid="success-home-btn"
              >
                <Home className="w-4 h-4" /> Back to Home
              </button>
            </>
          )}

          {status === 'pending' && (
            <>
              <Loader2 className="w-14 h-14 mx-auto mb-4 text-amber-500 animate-spin" />
              <h1 className="text-2xl font-black text-[#0F1E33]">Payment is taking a moment…</h1>
              <p className="text-slate-600 mt-2 max-w-xl mx-auto">
                Cashfree is still processing. Refresh this page in a minute, or check the email/WhatsApp for confirmation.
              </p>
              <Link to="/" className="inline-flex items-center gap-2 mt-6 text-blue-700 font-bold hover:underline">
                Back to Home <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-14 h-14 mx-auto mb-4 text-rose-500" />
              <h1 className="text-2xl font-black text-[#0F1E33]">We couldn{`'`}t verify your payment</h1>
              <p className="text-slate-600 mt-2">{error || 'Something went wrong'}</p>
              <p className="text-slate-500 mt-2 text-sm">If money was debited, ping us at welcome@oll.co with your booking ID — we{`'`}ll fix it instantly.</p>
              <Link to="/ai-foundations" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33]">
                Back to AI Foundations <ArrowRight className="w-4 h-4" />
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

export default AiFoundationsSuccessPage;
