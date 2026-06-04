/**
 * Workshop success page — pings backend to verify Cashfree payment.
 * Triggered as Cashfree return_url after the v3 checkout completes.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Loader2, Calendar, Clock, MapPin, ArrowRight, AlertCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WorkshopSuccessPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [params] = useSearchParams();
  const bookingId = params.get('booking_id');

  const [status, setStatus] = useState('verifying'); // verifying | paid | pending
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (!bookingId) { setStatus('pending'); return; }
    let mounted = true;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const r = await axios.get(`${API}/workshops/verify/${bookingId}`);
        if (!mounted) return;
        setBooking(r.data?.booking);
        if (r.data?.status === 'PAID') { setStatus('paid'); return; }
        if (attempts < 6) setTimeout(tick, 2000);
        else setStatus('pending');
      } catch {
        if (mounted) setStatus('pending');
      }
    };
    tick();
    return () => { mounted = false; };
  }, [bookingId]);

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F0', fontFamily: '"Nunito Sans", sans-serif' }} className="flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-7 sm:p-10 text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-[#D63031] mx-auto" />
            <h2 className="text-xl font-black mt-4 text-[#0F1E33]">Confirming your seat…</h2>
            <p className="text-slate-500 mt-2 text-sm">This usually takes 5–10 seconds.</p>
          </>
        )}
        {status === 'paid' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <h2 className="text-2xl font-black mt-4 text-[#0F1E33]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              You're in! See you Sunday.
            </h2>
            <p className="text-slate-500 mt-2">We've reserved your spot for the Father's Day workshop.</p>
            <div className="mt-6 rounded-2xl bg-orange-50 border border-orange-200 p-5 text-left space-y-2.5">
              <Row icon={Calendar} label="Date" value={booking?.workshop_date || 'Sunday, 21 June 2026'} />
              <Row icon={Clock}    label="Time" value={booking?.workshop_time || '3:00 PM – 6:00 PM'} />
              <Row icon={MapPin}   label="Center" value={booking?.center_label || '—'} />
              <Row icon={ArrowRight} label="Age group" value={booking?.age_group_label || '—'} />
            </div>
            <button
              onClick={() => navigate('/')}
              className="mt-7 w-full bg-[#D63031] text-white font-black py-3.5 rounded-xl"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
              data-testid="success-home-btn"
            >
              Back to Home
            </button>
          </>
        )}
        {status === 'pending' && (
          <>
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-black mt-4 text-[#0F1E33]">Payment still processing</h2>
            <p className="text-slate-500 mt-2 text-sm">If you've completed the payment, you'll get a WhatsApp confirmation within a minute. If money was deducted but you don't get a message, write to <a className="text-[#D63031] underline" href="mailto:hello@oll.co">hello@oll.co</a>.</p>
            <button onClick={() => navigate(`/workshops/${slug || 'fathers-day-robotics'}`)} className="mt-6 w-full border-2 border-slate-200 hover:border-[#D63031] text-[#0F1E33] font-black py-3 rounded-xl">
              Back to workshop
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 text-sm">
    <Icon className="w-4 h-4 text-[#D63031] flex-shrink-0" />
    <span className="text-slate-500 w-20">{label}</span>
    <span className="font-bold text-[#0F1E33]">{value}</span>
  </div>
);
