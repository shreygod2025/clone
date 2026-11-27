import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DiscoverSuccess = () => {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    if (!orderId) {
      setState({ loading: false, data: null, error: 'Missing order id' });
      return;
    }
    (async () => {
      try {
        const res = await axios.get(`${API}/discover/verify/${orderId}`);
        setState({ loading: false, data: res.data, error: '' });
      } catch (e) {
        setState({ loading: false, data: null, error: e?.response?.data?.detail || 'Could not verify payment' });
      }
    })();
  }, [orderId]);

  const paid = state.data?.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" data-testid="discover-success">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
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
            <h1 className="mt-4 text-xl font-bold text-slate-900">Enrolment confirmed 🎉</h1>
            <p className="text-sm text-slate-600 mt-2">
              Thanks{state.data?.student_name ? `, ${state.data.student_name}` : ''}! Your <span className="font-semibold">{state.data?.plan_label || '52 Weeks Skills'}</span> plan is active.
            </p>
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600">
              Amount paid: <span className="font-semibold text-slate-800">₹{Number(state.data?.amount || 0).toLocaleString('en-IN')}</span>
              <div className="mt-1">Our team will email you the onboarding kit + first workshop schedule within 24 hours.</div>
            </div>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-[#D63031] font-semibold hover:underline"
              data-testid="discover-success-home"
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
              {state.error || 'Your payment is still processing. If money has been deducted, it will reflect within a few minutes and we\u2019ll email a confirmation.'}
            </p>
            <Link
              to="/discover"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-[#D63031] font-semibold hover:underline"
              data-testid="discover-success-retry"
            >
              Try again <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default DiscoverSuccess;
