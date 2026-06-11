import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState({ loading: true, email: '', alreadyUnsub: false, error: '', done: false });

  useEffect(() => {
    if (!token) {
      setState({ loading: false, error: 'Missing unsubscribe token', email: '', alreadyUnsub: false, done: false });
      return;
    }
    axios.get(`${API}/unsubscribe/${token}`)
      .then(r => setState({ loading: false, email: r.data.email, alreadyUnsub: r.data.already_unsubscribed, error: '', done: false }))
      .catch(e => setState({ loading: false, error: e.response?.data?.detail || 'Invalid link', email: '', alreadyUnsub: false, done: false }));
  }, [token]);

  const confirm = async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      await axios.post(`${API}/unsubscribe/${token}`);
      setState(s => ({ ...s, loading: false, done: true, alreadyUnsub: true }));
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.response?.data?.detail || 'Could not process' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center" data-testid="unsubscribe-page">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        </div>

        {state.loading && <p className="text-slate-500">Loading…</p>}

        {!state.loading && state.error && (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Link expired</h1>
            <p className="text-slate-600 text-sm">{state.error}</p>
          </>
        )}

        {!state.loading && !state.error && state.alreadyUnsub && (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-2">You&apos;re unsubscribed</h1>
            <p className="text-slate-600 text-sm">
              <strong>{state.email}</strong> will no longer receive marketing emails from OLL.
            </p>
            <p className="text-xs text-slate-400 mt-4">You&apos;ll still get transactional emails like payment receipts and class confirmations.</p>
          </>
        )}

        {!state.loading && !state.error && !state.alreadyUnsub && !state.done && (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Unsubscribe from OLL emails?</h1>
            <p className="text-slate-600 text-sm">
              We&apos;ll stop sending marketing emails to <strong>{state.email}</strong>.
            </p>
            <p className="text-xs text-slate-400 mt-2">You&apos;ll still get payment receipts &amp; class confirmations.</p>
            <button
              onClick={confirm}
              className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition-colors"
              data-testid="unsubscribe-confirm"
            >
              Yes, unsubscribe me
            </button>
            <p className="mt-3 text-xs text-slate-400">Or close this window to stay subscribed.</p>
          </>
        )}
      </div>
    </div>
  );
}
