import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Loader2, AlertTriangle, ArrowRight, Heart, MapPin } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FriendshipDaySuccess = () => {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    if (!orderId) { setState({ loading: false, data: null, error: 'Missing order id' }); return; }
    (async () => {
      try {
        const res = await axios.get(`${API}/friendship-day/verify/${orderId}`);
        setState({ loading: false, data: res.data, error: '' });
      } catch (e) {
        setState({ loading: false, data: null, error: e?.response?.data?.detail || 'Could not verify payment' });
      }
    })();
  }, [orderId]);

  const paid = state.data?.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-rose-50 flex items-center justify-center p-4" data-testid="fd-success">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-amber-100 p-8 text-center">
        {state.loading ? (
          <>
            <Loader2 className="w-10 h-10 mx-auto text-[#D63031] animate-spin" />
            <div className="text-slate-700 font-medium mt-4">Verifying your payment…</div>
          </>
        ) : paid ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
              You&apos;re in! <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              {state.data?.full_name ? `${state.data.full_name}'s ` : 'Your '}
              spot for <span className="font-semibold">{state.data?.workshop_name || 'the Friendship Day workshop'}</span> is confirmed.
            </p>
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600 space-y-2">
              <div className="flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#D63031]" />
                <span>{state.data?.center_name}</span>
              </div>
              <div>
                Amount paid: <span className="font-semibold text-slate-800">₹{Number(state.data?.amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="text-slate-500">
                We&apos;ll email you the venue schedule, checklist, and a reminder before the workshop.
              </div>
            </div>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-[#D63031] font-semibold hover:underline"
              data-testid="fd-success-home"
            >
              Go to homepage <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        ) : (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">Payment {state.data?.payment_status || 'pending'}</h1>
            <p className="text-sm text-slate-600 mt-2">
              {state.error || 'Your payment is still processing. If money was deducted it will reflect within a few minutes and we\u2019ll email a confirmation.'}
            </p>
            <Link
              to="/friendship-day"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-[#D63031] font-semibold hover:underline"
              data-testid="fd-success-retry"
            >
              Try again <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default FriendshipDaySuccess;
