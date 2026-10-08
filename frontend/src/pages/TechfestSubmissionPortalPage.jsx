/**
 * Techfest Submission Portal — public login-free way for a submitter to
 * come back, verify via email OTP, and view / edit their submission(s)
 * until the admin-defined cutoff (20 Oct 2026 23:59 IST).
 *
 * Flow:
 *   1. Student enters their email → we request an OTP (also sent to their
 *      phone via AiSensy if configured).
 *   2. Student enters the 6-digit code → we exchange it for a 24h JWT.
 *   3. Submissions list renders; each row expands to an edit form.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, KeyRound, Loader2, CheckCircle2, Pencil, Save, ArrowRight, AlertCircle, Lock, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = 'techfest_portal_token';
const EMAIL_KEY = 'techfest_portal_email';

// Fields shown in the edit form — mirrors the backend whitelist in
// `techfest_submission_portal.SubmissionPatchIn`. Grouped so the UI stays
// readable; each entry is [field_key, label, optional_type].
const EDIT_FIELDS = [
  ['full_name', 'Team Lead Name'],
  ['phone', 'Phone'],
  ['date_of_birth', 'Date of Birth', 'date'],
  ['age', 'Age', 'number'],
  ['country', 'Country'],
  ['state', 'State'],
  ['city', 'City'],
  ['pincode', 'Pincode'],
  ['school_or_college', 'School / College'],
  ['team_id', 'Team ID'],
  ['competition_id', 'Competition ID'],
  ['drive_link', 'Project Drive Link'],
  ['project_category', 'Project Category (Innovation only)'],
  ['project_theme', 'Project Theme (Innovation only)'],
];

export default function TechfestSubmissionPortalPage() {
  useEffect(() => { document.title = 'Submission Portal · OLL Robotics Championship · Techfest 2026'; }, []);

  const [step, setStep] = useState(() => (localStorage.getItem(TOKEN_KEY) ? 'portal' : 'email'));
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) || '');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [submissions, setSubmissions] = useState([]);
  const [editCutoff, setEditCutoff] = useState('');
  const [editOpen, setEditOpen] = useState(true);
  const [expandedId, setExpandedId] = useState('');
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Resend-cooldown tick
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-load submissions if we have a stored token
  useEffect(() => {
    if (step === 'portal') loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const requestOtp = async (e) => {
    e?.preventDefault?.();
    const clean = (email || '').trim();
    if (!clean) {
      toast.error('Please enter the email you used to submit your project.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/techfest/submission-portal/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Could not send the code.');
      localStorage.setItem(EMAIL_KEY, clean);
      setStep('otp');
      setResendCooldown(30);
      toast.success('Verification code sent to your email.');
    } catch (err) {
      toast.error(err.message || 'Could not send the code.');
    } finally { setBusy(false); }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault?.();
    const code = (otp || '').trim();
    if (code.length < 4) {
      toast.error('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/techfest/submission-portal/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Invalid or expired code.');
      localStorage.setItem(TOKEN_KEY, data.token);
      setStep('portal');
      setOtp('');
    } catch (err) {
      toast.error(err.message || 'Verification failed.');
    } finally { setBusy(false); }
  };

  const loadSubmissions = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setStep('email'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/techfest/submission-portal/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        // Token expired → bounce back to OTP flow.
        localStorage.removeItem(TOKEN_KEY);
        setStep('email');
        toast.error('Your session expired — please verify again.');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Could not load submissions.');
      setSubmissions(data.items || []);
      setEditCutoff(data.edit_cutoff_utc || '');
      setEditOpen(!!data.edit_window_open);
    } catch (err) {
      toast.error(err.message || 'Could not load submissions.');
    } finally { setBusy(false); }
  };

  const startEdit = (sub) => {
    setExpandedId(sub.id);
    const draft = {};
    EDIT_FIELDS.forEach(([k]) => { draft[k] = sub[k] ?? ''; });
    setEditForm(draft);
  };

  const saveEdit = async (subId) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setStep('email'); return; }
    setSaving(true);
    try {
      // Strip empty strings so a half-edited field doesn't wipe a value.
      const body = {};
      Object.entries(editForm).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) body[k] = v;
      });
      const res = await fetch(`${API_BASE}/techfest/submission-portal/submission/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Save failed.');
      toast.success('Submission updated.');
      setExpandedId('');
      await loadSubmissions();
    } catch (err) {
      toast.error(err.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setEmail('');
    setStep('email');
    setSubmissions([]);
  };

  return (
    <div className="min-h-screen bg-white" data-testid="techfest-portal-page">
      <style>{`
        .tpp-input { width:100%; height:44px; padding:0 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:14px; background:#fff; transition:border-color .15s ease, box-shadow .15s ease; }
        .tpp-input:focus { border-color:#DC2626; outline:none; box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }
        .tpp-label { display:block; font-family:'Proxima Nova','Montserrat',sans-serif; font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#0A1F44; margin-bottom:6px; }
        .tpp-btn { display:inline-flex; align-items:center; gap:8px; padding:12px 20px; border-radius:12px; font-family:'Proxima Nova','Montserrat',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; transition:transform .15s ease, box-shadow .15s ease; }
        .tpp-btn.primary { background:#DC2626; color:#fff; box-shadow: 0 10px 24px rgba(220,38,38,0.35); }
        .tpp-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(220,38,38,0.45); }
        .tpp-btn.primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .tpp-h1 { font-family:'Proxima Nova','Montserrat',sans-serif; font-weight:900; letter-spacing:-0.02em; }
        .tpp-eyebrow { font-family:'Proxima Nova','Montserrat',sans-serif; font-size:11px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; }
      `}</style>

      <header className="border-b border-slate-100 py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/techfest" className="inline-flex items-center gap-2">
            <img src={OLL_LOGO} alt="OLL" className="h-7" />
          </Link>
          <Link to="/techfest" className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-[#0A1F44]">← Back to Techfest</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {step === 'email' && (
          <form onSubmit={requestOtp} className="max-w-md mx-auto">
            <div className="mb-6 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7 text-[#DC2626]" />
              </div>
              <div className="tpp-eyebrow text-[#DC2626]">Techfest 2026 · Submission Portal</div>
              <h1 className="tpp-h1 text-2xl sm:text-3xl text-[#0A1F44] mt-1">Access your submission</h1>
              <p className="text-slate-600 mt-2 font-light text-sm">
                Enter the email you used to submit your project. We'll send a 6-digit code to verify it's you.
              </p>
            </div>
            <label className="tpp-label">Email</label>
            <input
              type="email"
              required
              className="tpp-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              data-testid="portal-email-input"
            />
            <button type="submit" disabled={busy} className="tpp-btn primary w-full justify-center mt-5" data-testid="portal-request-otp">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {busy ? 'Sending…' : 'Send verification code'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp} className="max-w-md mx-auto">
            <div className="mb-6 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-7 h-7 text-[#DC2626]" />
              </div>
              <h1 className="tpp-h1 text-2xl sm:text-3xl text-[#0A1F44]">Enter the code</h1>
              <p className="text-slate-600 mt-2 font-light text-sm">
                We emailed a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
              </p>
            </div>
            <label className="tpp-label">6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              className="tpp-input text-center text-xl tracking-[0.5em] font-mono"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              data-testid="portal-otp-input"
              autoFocus
            />
            <button type="submit" disabled={busy || otp.length < 4} className="tpp-btn primary w-full justify-center mt-5" data-testid="portal-verify-otp">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {busy ? 'Verifying…' : 'Verify & continue'}
            </button>
            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); }}
                className="text-slate-500 hover:text-[#0A1F44]"
                data-testid="portal-change-email"
              >
                ← Use a different email
              </button>
              <button
                type="button"
                onClick={requestOtp}
                disabled={resendCooldown > 0 || busy}
                className="font-bold text-[#DC2626] disabled:text-slate-300"
                data-testid="portal-resend-otp"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {step === 'portal' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="tpp-eyebrow text-[#DC2626]">Techfest 2026 · Submission Portal</div>
                <h1 className="tpp-h1 text-2xl sm:text-3xl text-[#0A1F44] mt-1">Your submissions</h1>
                <p className="text-slate-500 text-sm mt-1">Signed in as <strong>{email}</strong></p>
              </div>
              <button type="button" onClick={signOut} className="text-xs font-bold text-slate-500 hover:text-[#0A1F44] uppercase tracking-widest" data-testid="portal-signout">
                Sign out
              </button>
            </div>

            {!editOpen && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  Submission edits are now <strong>closed</strong> (cutoff: 20 Oct 2026 11:59 PM IST). You can still view your submissions below. For any corrections, email <a href="mailto:info@oll.co" className="underline font-bold">info@oll.co</a>.
                </div>
              </div>
            )}
            {editOpen && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>You can edit your submission any time until <strong>20 Oct 2026, 11:59 PM IST</strong>. Changes are saved immediately.</div>
              </div>
            )}

            {busy && submissions.length === 0 ? (
              <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#DC2626] mx-auto" /></div>
            ) : submissions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No submissions found for <strong>{email}</strong>.</p>
                <Link to="/techfest/submit" className="tpp-btn primary mt-5 inline-flex">
                  Submit your project <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => {
                  const isOpen = expandedId === sub.id;
                  return (
                    <div key={sub.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden" data-testid={`portal-submission-${sub.id}`}>
                      <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {sub.competition?.replace('_', ' ') || 'Submission'} · {sub.age_category || '—'}
                          </div>
                          <div className="text-base font-black text-[#0A1F44] mt-0.5">{sub.full_name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {sub.school_or_college} · {sub.city}
                            {sub.updated_at ? ` · updated ${new Date(sub.updated_at).toLocaleString()}` : ''}
                          </div>
                        </div>
                        {editOpen && (
                          <button
                            type="button"
                            onClick={() => (isOpen ? setExpandedId('') : startEdit(sub))}
                            className="tpp-btn border border-slate-200 text-[#0A1F44] text-xs"
                            data-testid={`portal-edit-${sub.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" /> {isOpen ? 'Close' : 'Edit'}
                          </button>
                        )}
                      </div>

                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50 p-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            {EDIT_FIELDS.map(([key, label, type]) => (
                              <div key={key}>
                                <label className="tpp-label">{label}</label>
                                <input
                                  type={type || 'text'}
                                  className="tpp-input"
                                  value={editForm[key] ?? ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                                  data-testid={`portal-field-${key}`}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-5 flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setExpandedId('')}
                              className="tpp-btn border border-slate-200 text-slate-600 text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(sub.id)}
                              disabled={saving}
                              className="tpp-btn primary text-xs"
                              data-testid={`portal-save-${sub.id}`}
                            >
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              {saving ? 'Saving…' : 'Save changes'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
