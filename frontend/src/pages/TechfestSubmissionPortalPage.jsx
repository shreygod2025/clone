/**
 * Techfest Submission Portal — sign in with leader phone + OTP, Team ID, or
 * email + OTP, then view / edit every field of the submission until the
 * zone cutoff (East: 20 Oct 2026, others: 1 Nov 2026 · 11:59 PM IST).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, KeyRound, Loader2, CheckCircle2, Pencil, ArrowRight, AlertCircle, Lock, FileText, Phone, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import SubmissionEditor from '../components/techfest/SubmissionEditor';

const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = 'techfest_portal_token';
const EMAIL_KEY = 'techfest_portal_email';

const METHODS = [
  { key: 'phone', label: 'Leader Phone', icon: Phone },
  { key: 'team', label: 'Team ID', icon: Hash },
  { key: 'email', label: 'Email', icon: Mail },
];

const post = async (path, body) => {
  const res = await fetch(`${API_BASE}/techfest/submission-portal/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || 'Something went wrong.');
  return data;
};

const LoginStep = ({ method, setMethod, value, setValue, busy, onSubmit }) => {
  const cfg = {
    phone: { label: "Team leader's phone number", type: 'tel', ph: '98XXXXXXXX', help: "We'll send a 6-digit code on WhatsApp and to the email on your submission.", cta: 'Send verification code' },
    team: { label: 'Team ID', type: 'text', ph: 'e.g. TF-12345', help: 'Enter the Team ID you used while submitting your project.', cta: 'Open my submission' },
    email: { label: 'Email', type: 'email', ph: 'you@example.com', help: "We'll send a 6-digit code to the email you used to submit.", cta: 'Send verification code' },
  }[method];
  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto" data-testid="portal-login-form">
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3"><Pencil className="w-7 h-7 text-[#DC2626]" /></div>
        <div className="tpp-eyebrow text-[#DC2626]">Techfest 2026 · Submission Portal</div>
        <h1 className="tpp-h1 text-2xl sm:text-3xl text-[#0A1F44] mt-1">Edit your submission</h1>
      </div>
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 mb-5" role="tablist">
        {METHODS.map((m) => (
          <button key={m.key} type="button" onClick={() => { setMethod(m.key); setValue(''); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${method === m.key ? 'bg-white text-[#0A1F44] shadow-sm' : 'text-slate-500 hover:text-[#0A1F44]'}`}
            data-testid={`portal-method-${m.key}`}>
            <m.icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        ))}
      </div>
      <label className="tpp-label">{cfg.label}</label>
      <input type={cfg.type} required className="tpp-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={cfg.ph} data-testid={`portal-${method}-input`} />
      <p className="text-xs text-slate-500 mt-2">{cfg.help}</p>
      <button type="submit" disabled={busy} className="tpp-btn primary w-full justify-center mt-5" data-testid="portal-login-submit">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {busy ? 'Please wait…' : cfg.cta}
      </button>
    </form>
  );
};

const OtpStep = ({ target, otp, setOtp, busy, cooldown, onVerify, onResend, onBack }) => (
  <form onSubmit={onVerify} className="max-w-md mx-auto" data-testid="portal-otp-form">
    <div className="mb-6 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3"><KeyRound className="w-7 h-7 text-[#DC2626]" /></div>
      <h1 className="tpp-h1 text-2xl sm:text-3xl text-[#0A1F44]">Enter the code</h1>
      <p className="text-slate-600 mt-2 font-light text-sm">We sent a 6-digit code to <strong>{target}</strong>. It expires in 10 minutes.</p>
    </div>
    <label className="tpp-label">6-digit code</label>
    <input type="text" inputMode="numeric" maxLength={6} required autoFocus
      className="tpp-input text-center text-xl tracking-[0.5em] font-mono" value={otp}
      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" data-testid="portal-otp-input" />
    <button type="submit" disabled={busy || otp.length < 4} className="tpp-btn primary w-full justify-center mt-5" data-testid="portal-verify-otp">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
      {busy ? 'Verifying…' : 'Verify & continue'}
    </button>
    <div className="mt-4 flex items-center justify-between text-xs">
      <button type="button" onClick={onBack} className="text-slate-500 hover:text-[#0A1F44]" data-testid="portal-change-email">← Use a different method</button>
      <button type="button" onClick={onResend} disabled={cooldown > 0 || busy} className="font-bold text-[#DC2626] disabled:text-slate-300" data-testid="portal-resend-otp">
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
      </button>
    </div>
  </form>
);

export default function TechfestSubmissionPortalPage() {
  useEffect(() => { document.title = 'Edit Submission · OLL Robotics Championship · Techfest 2026'; }, []);

  const [step, setStep] = useState(() => (localStorage.getItem(TOKEN_KEY) ? 'portal' : 'login'));
  const [method, setMethod] = useState('phone');
  const [value, setValue] = useState('');
  const [who, setWho] = useState(() => localStorage.getItem(EMAIL_KEY) || '');
  const [otpTarget, setOtpTarget] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [submissions, setSubmissions] = useState([]);
  const [expandedId, setExpandedId] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'portal') loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const identityBody = () => (method === 'phone' ? { phone: value.trim() } : { email: value.trim() });

  const signedIn = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(EMAIL_KEY, data.email || '');
    setWho(data.email || '');
    setOtp('');
    setStep('portal');
  };

  const login = async (e) => {
    e?.preventDefault?.();
    if (!value.trim()) return;
    if (method === 'phone' && value.replace(/\D/g, '').length < 10) { toast.error('Enter a valid 10-digit phone number.'); return; }
    setBusy(true);
    try {
      if (method === 'team') {
        signedIn(await post('team-login', { team_id: value.trim() }));
      } else {
        const data = await post('request-otp', identityBody());
        setOtpTarget(method === 'phone' ? `WhatsApp ${value.trim()}${data.sent_to_email ? ` and ${data.sent_to_email}` : ''}` : value.trim());
        setStep('otp');
        setCooldown(30);
        toast.success('Verification code sent.');
      }
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try { signedIn(await post('verify-otp', { ...identityBody(), otp: otp.trim() })); }
    catch (err) { toast.error(err.message || 'Verification failed.'); }
    finally { setBusy(false); }
  };

  const loadSubmissions = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setStep('login'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/techfest/submission-portal/my`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setStep('login');
        toast.error('Your session expired — please sign in again.');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Could not load submissions.');
      setSubmissions(data.items || []);
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setWho(''); setValue(''); setSubmissions([]); setStep('login');
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
          <Link to="/techfest" className="inline-flex items-center gap-2"><img src={OLL_LOGO} alt="OLL" className="h-7" /></Link>
          <Link to="/techfest" className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-[#0A1F44]">← Back to Techfest</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {step === 'login' && <LoginStep method={method} setMethod={setMethod} value={value} setValue={setValue} busy={busy} onSubmit={login} />}
        {step === 'otp' && (
          <OtpStep target={otpTarget} otp={otp} setOtp={setOtp} busy={busy} cooldown={cooldown}
            onVerify={verify} onResend={login} onBack={() => { setStep('login'); setOtp(''); }} />
        )}

        {step === 'portal' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="tpp-eyebrow text-[#DC2626]">Techfest 2026 · Submission Portal</div>
                <h1 className="tpp-h1 text-2xl sm:text-3xl text-[#0A1F44] mt-1">Your submissions</h1>
                <p className="text-slate-500 text-sm mt-1" data-testid="portal-signed-in-as">Signed in with <strong>{who.replace(/^phone:/, 'phone ').replace(/^team:/, 'Team ID ')}</strong></p>
              </div>
              <button type="button" onClick={signOut} className="text-xs font-bold text-slate-500 hover:text-[#0A1F44] uppercase tracking-widest" data-testid="portal-signout">Sign out</button>
            </div>

            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>Edits are open until <strong>1 Nov 2026, 11:59 PM IST</strong> for all zones, and until <strong>20 Oct 2026, 11:59 PM IST</strong> for East Zone (IIT Kanpur). Every field can be changed; changes save immediately.</div>
            </div>

            {busy && submissions.length === 0 ? (
              <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#DC2626] mx-auto" /></div>
            ) : submissions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No submissions found.</p>
                <Link to="/techfest/submit" className="tpp-btn primary mt-5 inline-flex">Submit your project <ArrowRight className="w-4 h-4" /></Link>
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
                            {sub.competition?.replace('_', ' ') || 'Submission'} · {sub.age_category || '—'}{sub.zone ? ` · ${sub.zone} zone` : ''} · Team ID {sub.team_id || '—'}
                          </div>
                          <div className="text-base font-black text-[#0A1F44] mt-0.5">{sub.full_name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {sub.school_or_college} · {sub.city}{sub.updated_at ? ` · updated ${new Date(sub.updated_at).toLocaleString()}` : ''}
                          </div>
                        </div>
                        {sub.review_status === 'approved' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2" data-testid={`portal-locked-approved-${sub.id}`}>
                            <Lock className="w-3.5 h-3.5" /> Locked (approved)
                          </span>
                        ) : sub.edit_window_open ? (
                          <button type="button" onClick={() => setExpandedId(isOpen ? '' : sub.id)} className="tpp-btn border border-slate-200 text-[#0A1F44] text-xs" data-testid={`portal-edit-${sub.id}`}>
                            <Pencil className="w-3.5 h-3.5" /> {isOpen ? 'Close' : 'Edit'}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid={`portal-closed-${sub.id}`}>
                            <Lock className="w-3.5 h-3.5" /> Edits closed ({sub.edit_cutoff_label})
                          </span>
                        )}
                      </div>
                      {sub.review_status === 'rejected' && (
                        <div className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" data-testid={`portal-rejected-${sub.id}`}>
                          <strong>Not approved yet.</strong> Judge&apos;s remarks: {sub.judge_remarks || '—'}. Edit the details below and save to resubmit for review.
                        </div>
                      )}
                      {sub.review_status === 'approved' && (
                        <div className="mx-4 mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" data-testid={`portal-approved-${sub.id}`}>
                          <strong>Approved — you&apos;ve qualified!</strong>{sub.judge_remarks ? ` Judge's remarks: ${sub.judge_remarks}` : ''}
                        </div>
                      )}
                      {isOpen && sub.review_status !== 'approved' && (
                        <SubmissionEditor sub={sub} onCancel={() => setExpandedId('')} onSaved={() => { setExpandedId(''); loadSubmissions(); }} />
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
