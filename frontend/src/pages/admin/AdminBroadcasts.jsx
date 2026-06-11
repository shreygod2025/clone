import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Mail, Send, Users, Trash2, Eye, RefreshCw, X, Plus,
  Calendar, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STARTER_TEMPLATES = [
  {
    label: 'Course update / class schedule',
    subject: 'Important update for your OLL class',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
  <h1 style="font-size:22px;font-weight:700;margin:0 0 12px 0">Hi {{first_name}},</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0">A quick update about your child's OLL program:</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0"><strong>What changed:</strong> [write here]</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0"><strong>What you need to do:</strong> [write here]</p>
  <p style="font-size:15px;line-height:1.6;margin:24px 0 6px 0">Thanks,<br/>Team OLL</p>
</div>`
  },
  {
    label: 'Promotional / new program',
    subject: 'New at OLL — early access for you',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
  <h1 style="font-size:24px;font-weight:700;margin:0 0 12px 0">Hi {{first_name}},</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0">Because your child is part of the OLL family, you get early access to our newest program:</p>
  <div style="background:#FEF3C7;border-radius:12px;padding:18px;margin:18px 0">
    <p style="margin:0;font-weight:700;font-size:18px;color:#92400E">[Program name]</p>
    <p style="margin:6px 0 0 0;font-size:14px;color:#78350F">[One-liner about the program]</p>
  </div>
  <a href="https://oll.co/" style="display:inline-block;background:#1E3A5F;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px">Learn more →</a>
  <p style="font-size:15px;line-height:1.6;margin:24px 0 6px 0">Cheers,<br/>Team OLL</p>
</div>`
  },
  {
    label: 'Monthly newsletter',
    subject: 'OLL Monthly — what your child built this month',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
  <h1 style="font-size:22px;font-weight:700;margin:0 0 12px 0">Hi {{first_name}},</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px 0">A quick recap of what kids across OLL built this month:</p>
  <ul style="font-size:15px;line-height:1.8;padding-left:18px;margin:0 0 14px 0">
    <li>[Highlight 1]</li>
    <li>[Highlight 2]</li>
    <li>[Highlight 3]</li>
  </ul>
  <p style="font-size:15px;line-height:1.6;margin:24px 0 6px 0">Until next month,<br/>Team OLL</p>
</div>`
  },
];

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-amber-100 text-amber-700',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
};

export default function AdminBroadcasts() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [selected, setSelected] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/broadcasts`, { headers });
      setCampaigns(r.data.campaigns || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load');
    } finally { setLoading(false); }
  }, [token]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  return (
    <AdminLayout title="Bulk Email Campaigns">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bulk Email Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">Send marketing emails to paid students via Resend. Unsubscribes are tracked automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium" data-testid="broadcasts-refresh">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowComposer(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#152a47] text-white text-sm font-semibold" data-testid="broadcasts-new">
            <Plus className="w-4 h-4" /> New campaign
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-dashed border-slate-300">
          <Mail className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No campaigns yet</h3>
          <p className="text-sm text-slate-500 mt-1">Create your first campaign to email paid students.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left py-3 px-4">Campaign</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Audience</th>
                <th className="text-left py-3 px-4">Sent / Opens</th>
                <th className="text-left py-3 px-4">Created</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-xs">{c.subject}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || 'bg-slate-100'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {c.filters?.source} {c.filters?.course ? `· ${c.filters.course}` : ''} {c.filters?.city ? `· ${c.filters.city}` : ''}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {c.status === 'sent' ? `${c.stats?.sent || 0} sent` : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">{c.created_at?.slice(0, 10)}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => setSelected(c.id)} className="text-slate-500 hover:text-slate-900 p-1" data-testid={`broadcast-view-${c.id}`} title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showComposer && (
        <CampaignComposer
          onClose={() => setShowComposer(false)}
          onSent={() => { setShowComposer(false); load(); }}
          headers={headers}
        />
      )}

      {selected && (
        <CampaignDetail
          campaignId={selected}
          onClose={() => setSelected(null)}
          onChanged={load}
          headers={headers}
        />
      )}
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Campaign Composer (modal wizard)
// ─────────────────────────────────────────────────────────────
const CampaignComposer = ({ onClose, onSent, headers }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', subject: '', html: STARTER_TEMPLATES[0].html,
    source: 'both', course: '', city: '', grade: '',
    schedule_type: 'now', schedule_dt: '',
  });
  const [preview, setPreview] = useState({ count: null, by_source: {}, sample: [], loading: false });
  const [sending, setSending] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const runPreview = async () => {
    setPreview(p => ({ ...p, loading: true }));
    try {
      const params = new URLSearchParams({ source: form.source });
      if (form.course) params.set('course', form.course);
      if (form.city) params.set('city', form.city);
      if (form.grade) params.set('grade', form.grade);
      const r = await axios.get(`${API}/admin/broadcasts/audience/preview?${params}`, { headers });
      setPreview({ ...r.data, loading: false });
    } catch (e) {
      toast.error('Preview failed: ' + (e.response?.data?.detail || e.message));
      setPreview(p => ({ ...p, loading: false }));
    }
  };

  useEffect(() => {
    if (step === 1) runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.source, form.course, form.city, form.grade, step]);

  const applyTemplate = (t) => setForm(f => ({ ...f, subject: t.subject, html: t.html }));

  const sendNow = async () => {
    if (!form.name || !form.subject || !form.html) { toast.error('Fill name, subject and body'); return; }
    setSending(true);
    try {
      const created = await axios.post(`${API}/admin/broadcasts`, {
        name: form.name, subject: form.subject, html: form.html,
        filters: { source: form.source, course: form.course || null, city: form.city || null, grade: form.grade || null },
      }, { headers });
      const id = created.data.id;
      const payload = form.schedule_type === 'now' ? {} : { scheduled_at: form.schedule_dt };
      const r = await axios.post(`${API}/admin/broadcasts/${id}/send`, payload, { headers });
      toast.success(r.data.status === 'scheduled' ? `Scheduled for ${form.schedule_dt}` : `Sending to ${preview.count} contacts…`);
      onSent();
    } catch (e) {
      toast.error('Failed: ' + (e.response?.data?.detail || e.message));
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="composer-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold">New Campaign · Step {step} of 3</h2>
            <p className="text-xs text-slate-500">
              {step === 1 ? 'Choose audience' : step === 2 ? 'Compose email' : 'Schedule & send'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded" data-testid="composer-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600 uppercase">Campaign name (internal)</span>
                <input value={form.name} onChange={e => update('name', e.target.value)}
                  placeholder="e.g. June 2026 — Robotics Camp launch"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  data-testid="composer-name" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 uppercase">Audience source</span>
                  <select value={form.source} onChange={e => update('source', e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" data-testid="composer-source">
                    <option value="both">Both (school + B2C)</option>
                    <option value="school">School payers only</option>
                    <option value="b2c">B2C payers only</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 uppercase">Course (optional)</span>
                  <input value={form.course} onChange={e => update('course', e.target.value)} placeholder="e.g. Robotics, AI" className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 uppercase">City (optional)</span>
                  <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="e.g. Mumbai" className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 uppercase">Grade (optional)</span>
                  <input value={form.grade} onChange={e => update('grade', e.target.value)} placeholder="e.g. 7" className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </label>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 rounded-xl p-4" data-testid="composer-preview">
                {preview.loading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Calculating audience…</div>
                ) : preview.count === null ? null : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-emerald-700">{preview.count}</span>
                      <span className="text-sm text-emerald-700">paid users will receive this</span>
                    </div>
                    <div className="text-xs text-emerald-700/70 mt-1">
                      School: {preview.by_source?.school || 0} · B2C: {preview.by_source?.b2c || 0}
                    </div>
                    {(preview.sample || []).length > 0 && (
                      <details className="mt-2 text-xs text-slate-600">
                        <summary className="cursor-pointer">Sample recipients</summary>
                        <ul className="mt-1 space-y-0.5">
                          {preview.sample.map((s, i) => (
                            <li key={i}><code className="text-xs">{s.email}</code> · {s.first_name} · {s.course || s.source}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-600 uppercase mr-1 self-center">Starter:</span>
                {STARTER_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => applyTemplate(t)} className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full" data-testid={`composer-template-${i}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600 uppercase">Subject line</span>
                <input value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="e.g. Robotics camp seats open this Saturday"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" data-testid="composer-subject" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600 uppercase">HTML body</span>
                <textarea rows={14} value={form.html} onChange={e => update('html', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  data-testid="composer-html" />
                <p className="text-xs text-slate-500 mt-1">
                  Tokens: <code className="bg-slate-100 px-1 rounded">{'{{first_name}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{unsubscribe_url}}'}</code> (auto-appended if missing). Inline CSS only.
                </p>
              </label>
              <div className="border border-slate-200 rounded-lg p-4 max-h-72 overflow-auto bg-white" data-testid="composer-html-preview">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Preview</p>
                <div dangerouslySetInnerHTML={{ __html: form.html.replaceAll('{{first_name}}', 'Priya').replaceAll('{{unsubscribe_url}}', '#') }} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div><span className="text-slate-500">To:</span> <strong>{preview.count}</strong> paid contacts ({preview.by_source?.school || 0} school + {preview.by_source?.b2c || 0} B2C)</div>
                <div><span className="text-slate-500">Subject:</span> {form.subject}</div>
                <div><span className="text-slate-500">From:</span> OLL &lt;marketing@oll.co&gt;</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className={`block border rounded-lg p-3 cursor-pointer ${form.schedule_type === 'now' ? 'border-[#1E3A5F] bg-[#1E3A5F]/5' : 'border-slate-200'}`}>
                  <input type="radio" name="schedule" checked={form.schedule_type === 'now'} onChange={() => update('schedule_type', 'now')} className="mr-2" />
                  <span className="font-medium text-sm">Send now</span>
                  <p className="text-xs text-slate-500 mt-1">Start sending immediately at ~4 emails/sec.</p>
                </label>
                <label className={`block border rounded-lg p-3 cursor-pointer ${form.schedule_type === 'later' ? 'border-[#1E3A5F] bg-[#1E3A5F]/5' : 'border-slate-200'}`}>
                  <input type="radio" name="schedule" checked={form.schedule_type === 'later'} onChange={() => update('schedule_type', 'later')} className="mr-2" />
                  <span className="font-medium text-sm">Schedule</span>
                  <p className="text-xs text-slate-500 mt-1">Pick a date &amp; time.</p>
                </label>
              </div>
              {form.schedule_type === 'later' && (
                <input type="datetime-local" value={form.schedule_dt} onChange={e => update('schedule_dt', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>By sending, you confirm these recipients have a paid relationship with OLL and have legitimate interest under DPDP/CAN-SPAM. Every email carries a one-click unsubscribe link.</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 1 && (!form.name || preview.count === 0)} className="px-5 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#152a47] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed" data-testid="composer-next">
              Next
            </button>
          ) : (
            <button onClick={sendNow} disabled={sending || (form.schedule_type === 'later' && !form.schedule_dt)} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-1.5" data-testid="composer-send">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {form.schedule_type === 'now' ? `Send to ${preview.count}` : 'Schedule send'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// Campaign Detail (analytics)
// ─────────────────────────────────────────────────────────────
const CampaignDetail = ({ campaignId, onClose, onChanged, headers }) => {
  const [camp, setCamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/broadcasts/${campaignId}`, { headers });
      setCamp(r.data);
    } catch (e) {
      toast.error('Load failed');
    } finally { setLoading(false); }
  }, [campaignId]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await axios.delete(`${API}/admin/broadcasts/${campaignId}`, { headers });
      toast.success('Deleted');
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="campaign-detail">
        {loading || !camp ? (
          <div className="p-10 text-center text-slate-500">Loading…</div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold">{camp.name}</h2>
                <p className="text-xs text-slate-500 truncate">{camp.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={load} className="p-1 hover:bg-slate-100 rounded" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
                {(camp.status === 'draft' || camp.status === 'failed') && (
                  <button onClick={remove} className="p-1 hover:bg-rose-100 rounded text-rose-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                )}
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'complained', 'failed'].filter(k => camp.stats?.[k] !== undefined).map(k => (
                  <div key={k} className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-900">{camp.stats?.[k] || 0}</div>
                    <div className="text-xs text-slate-500 capitalize">{k}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Status:</span> <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[camp.status] || 'bg-slate-100'}`}>{camp.status}</span></div>
                <div><span className="text-slate-500">From:</span> {camp.from_address}</div>
                <div><span className="text-slate-500">Created:</span> {camp.created_at?.slice(0, 19).replace('T', ' ')}</div>
                <div><span className="text-slate-500">Sent:</span> {camp.sent_at?.slice(0, 19).replace('T', ' ') || '—'}</div>
                <div className="col-span-2"><span className="text-slate-500">Filters:</span> {camp.filters?.source} {camp.filters?.course ? `· course=${camp.filters.course}` : ''} {camp.filters?.city ? `· city=${camp.filters.city}` : ''} {camp.filters?.grade ? `· grade=${camp.filters.grade}` : ''}</div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Email preview</p>
                <div className="border border-slate-200 rounded-lg p-4 bg-white max-h-72 overflow-auto">
                  <div dangerouslySetInnerHTML={{ __html: (camp.html || '').replaceAll('{{first_name}}', 'Priya').replaceAll('{{unsubscribe_url}}', '#') }} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
