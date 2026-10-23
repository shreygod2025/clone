import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Send, Loader2, CheckCircle2, RotateCcw, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const fmtD = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '');

const sendEmails = async (ids, kind, headers) => {
  const res = await axios.post(`${API}/admin/techfest/submissions/send-emails`, { ids, kind }, { headers });
  return res.data;
};

const reportResult = (data, label) => {
  if (data.queued) toast.success(`${label} queued for ${data.queued} submission(s) — sending in background`);
  else if (data.sent) toast.success(`${label} sent`);
  else toast.error(`${label} could not be sent`);
};

const MiniBtn = ({ onClick, busy, icon: Icon, children, testId, tone }) => (
  <button type="button" onClick={onClick} disabled={busy} data-testid={testId}
    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md transition-colors disabled:opacity-50 ${tone}`}>
    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />} {children}
  </button>
);

export const RowEmailActions = ({ s, headers, onSent }) => {
  const [busy, setBusy] = useState('');
  const reviewed = ['approved', 'rejected'].includes(s.review_status);
  const send = async (kind) => {
    setBusy(kind);
    try {
      const data = await sendEmails([s._id], kind, headers);
      reportResult(data, kind === 'confirmation' ? 'Confirmation email' : 'Result email');
      if (data.sent) onSent(s._id, { [kind === 'confirmation' ? 'confirmation_email_sent_at' : 'review_email_sent_at']: new Date().toISOString() });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Email failed');
    } finally { setBusy(''); }
  };
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid={`admin-submission-email-actions-${s._id}`}>
      <MiniBtn onClick={() => send('confirmation')} busy={busy === 'confirmation'} icon={Mail} testId={`admin-submission-send-confirmation-${s._id}`} tone="bg-blue-50 text-blue-700 hover:bg-blue-100">
        {s.confirmation_email_sent_at ? `Confirmation · ${fmtD(s.confirmation_email_sent_at)}` : 'Send confirmation'}
      </MiniBtn>
      {reviewed && (
        <MiniBtn onClick={() => send('result')} busy={busy === 'result'} icon={Send} testId={`admin-submission-send-result-${s._id}`} tone="bg-slate-100 text-slate-700 hover:bg-slate-200">
          {s.review_email_sent_at ? `Result mail · ${fmtD(s.review_email_sent_at)}` : 'Send result mail'}
        </MiniBtn>
      )}
    </div>
  );
};

export const BulkSubmissionBar = ({ ids, headers, onReview, onClear }) => {
  const [busy, setBusy] = useState('');
  if (!ids.length) return null;
  const send = async (kind) => {
    if (!window.confirm(`Send ${kind === 'confirmation' ? '"submission received" confirmation' : 'approval / rework result'} emails to ${ids.length} submission(s)?`)) return;
    setBusy(kind);
    try {
      reportResult(await sendEmails(ids, kind, headers), kind === 'confirmation' ? 'Confirmation emails' : 'Result emails');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bulk email failed');
    } finally { setBusy(''); }
  };
  return (
    <div className="px-3 py-2 flex flex-wrap items-center gap-2 border-b border-blue-200 bg-blue-50" data-testid="admin-submissions-bulk-bar">
      <span className="text-sm font-bold text-blue-900" data-testid="admin-submissions-selected-count">{ids.length} selected</span>
      <MiniBtn onClick={() => send('confirmation')} busy={busy === 'confirmation'} icon={Mail} testId="admin-submissions-bulk-confirmation" tone="bg-blue-600 text-white hover:bg-blue-700">Send confirmation</MiniBtn>
      <MiniBtn onClick={() => send('result')} busy={busy === 'result'} icon={Send} testId="admin-submissions-bulk-result" tone="bg-slate-800 text-white hover:bg-slate-900">Send result mail</MiniBtn>
      <MiniBtn onClick={() => onReview('approved')} icon={CheckCircle2} testId="admin-submissions-bulk-approve" tone="bg-emerald-600 text-white hover:bg-emerald-700">Approve + email</MiniBtn>
      <MiniBtn onClick={() => onReview('rejected')} icon={RotateCcw} testId="admin-submissions-bulk-rework" tone="bg-orange-600 text-white hover:bg-orange-700">Rework + email</MiniBtn>
      <button type="button" onClick={onClear} className="ml-auto text-xs text-blue-800 hover:underline inline-flex items-center gap-1" data-testid="admin-submissions-bulk-clear">
        <X className="w-3.5 h-3.5" /> Clear
      </button>
    </div>
  );
};
