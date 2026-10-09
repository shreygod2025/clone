import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Mail, Send, Loader2, Eye, Users, History as HistoryIcon, X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_LABELS = { student: 'Students', school: 'Schools', educator: 'Educators' };
const ZONES = ['north', 'south', 'east', 'west', 'central'];
const COMPETITIONS = [
  { id: 'robo_sumo', label: 'Robo Sumo' },
  { id: 'robo_race', label: 'Robo Race' },
  { id: 'robo_innovation', label: 'Robotics Innovation' },
];

export default function TechfestBulkEmailDialog({ open, onClose, getAuthHeaders }) {
  // Audience filters
  const [types, setTypes] = useState(['student', 'school', 'educator']);
  const [zones, setZones] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [showCustom, setShowCustom] = useState(false);

  // Content
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [name, setName] = useState('Techfest Important Checklist');

  // Preview state
  const [preview, setPreview] = useState(null); // {count, by_type, sample}
  const [previewLoading, setPreviewLoading] = useState(false);

  // Send state
  const [testEmail, setTestEmail] = useState('shreyaan@oll.co');
  const [sendingSample, setSendingSample] = useState(false);
  const [sendingBlast, setSendingBlast] = useState(false);
  const [confirmBlast, setConfirmBlast] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState(null); // {id, total, sent, failed, status}

  // Campaigns history
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // View mode: compose | preview
  const [view, setView] = useState('compose');

  // Load default template on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/admin/techfest/bulk-email/default-template`, {
          headers: getAuthHeaders(),
        });
        setSubject(data.subject || '');
        setHtml(data.html || '');
      } catch (e) {
        toast.error('Failed to load default template');
      }
    })();
  }, [open, getAuthHeaders]);

  // Auto-refresh preview whenever audience filters change
  useEffect(() => {
    if (!open) return;
    runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, types.join(','), zones.join(','), competitions.join(',')]);

  const runPreview = async () => {
    if (!open) return;
    if (types.length === 0) {
      setPreview({ count: 0, by_type: { student: 0, school: 0, educator: 0 }, sample: [] });
      return;
    }
    setPreviewLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/admin/techfest/bulk-email/preview`,
        { types, zones, competitions },
        { headers: getAuthHeaders() },
      );
      setPreview(data);
    } catch (e) {
      toast.error('Audience preview failed');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/techfest/bulk-email/campaigns`, {
        headers: getAuthHeaders(),
      });
      setCampaigns(data.items || []);
    } catch (e) {
      toast.error('Failed to load campaign history');
    } finally {
      setCampaignsLoading(false);
    }
  };

  useEffect(() => { if (showHistory) loadCampaigns(); }, [showHistory]);  // eslint-disable-line

  const toggleType = (t) => {
    setTypes(types.includes(t) ? types.filter(x => x !== t) : [...types, t]);
  };
  const toggleZone = (z) => {
    setZones(zones.includes(z) ? zones.filter(x => x !== z) : [...zones, z]);
  };
  const toggleComp = (c) => {
    setCompetitions(competitions.includes(c) ? competitions.filter(x => x !== c) : [...competitions, c]);
  };

  const handleSendSample = async () => {
    if (!testEmail || !subject || !html) {
      toast.error('Need tester email, subject and body');
      return;
    }
    setSendingSample(true);
    try {
      const { data } = await axios.post(
        `${API}/admin/techfest/bulk-email/send-sample`,
        { to_email: testEmail, subject, html },
        { headers: getAuthHeaders() },
      );
      toast.success(`Sample sent to ${data.to}`, { description: `Resend ID: ${data.resend_id || '—'}` });
    } catch (e) {
      toast.error('Sample send failed', { description: e.response?.data?.detail || e.message });
    } finally {
      setSendingSample(false);
    }
  };

  const handleSendBlast = async () => {
    if (!subject || !html) { toast.error('Subject and body required'); return; }
    if (!preview || preview.count === 0) { toast.error('Audience is empty'); return; }
    setSendingBlast(true);
    try {
      const { data } = await axios.post(
        `${API}/admin/techfest/bulk-email/send`,
        { types, zones, competitions, subject, html, name },
        { headers: getAuthHeaders() },
      );
      toast.success(`Blast started for ${data.total} recipients`, {
        description: `Live progress shown below. Sending ~5 emails / second.`,
      });
      setConfirmBlast(false);
      setActiveCampaign({ id: data.campaign_id, total: data.total, sent: 0, failed: 0, status: 'running' });
      // Live poller — refreshes every 1.5s until completed
      const pollId = data.campaign_id;
      const tick = async () => {
        try {
          const { data: c } = await axios.get(
            `${API}/admin/techfest/bulk-email/campaigns/${pollId}`,
            { headers: getAuthHeaders() },
          );
          setActiveCampaign({ id: c.id, total: c.total, sent: c.sent || 0, failed: c.failed || 0, status: c.status });
          if (c.status === 'completed') {
            toast.success(`Blast complete — ${c.sent}/${c.total} delivered${c.failed ? `, ${c.failed} failed` : ''}`);
            loadCampaigns();
            return;
          }
        } catch (e) { /* keep polling */ }
        setTimeout(tick, 1500);
      };
      setTimeout(tick, 1500);
      setShowHistory(true);
    } catch (e) {
      toast.error('Failed to start blast', { description: e.response?.data?.detail || e.message });
    } finally {
      setSendingBlast(false);
    }
  };

  const activeFilterCount =
    (types.length === 3 ? 0 : (3 - types.length)) +
    zones.length +
    competitions.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden" data-testid="techfest-bulk-email-dialog">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-gradient-to-br from-[#0A1F44] to-[#1E3A5F]">
          <DialogTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5" /> Techfest Email Blast
          </DialogTitle>
          <div className="text-xs text-slate-300 mt-1">
            Broadcast to all techfest registrants — Students, Schools &amp; Educators.
          </div>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-100">
          <button
            onClick={() => setView('compose')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${view === 'compose' ? 'border-[#DC2626] text-[#DC2626]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            data-testid="bulk-email-tab-compose"
          >Compose</button>
          <button
            onClick={() => setView('preview')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${view === 'preview' ? 'border-[#DC2626] text-[#DC2626]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            data-testid="bulk-email-tab-preview"
          >
            <Eye className="w-3.5 h-3.5 inline mr-1" /> Preview
          </button>
          <button
            onClick={() => setShowHistory(v => !v)}
            className={`ml-auto px-3 py-2 text-xs font-semibold rounded hover:bg-slate-100 text-slate-600 ${showHistory ? 'bg-slate-100' : ''}`}
            data-testid="bulk-email-history-toggle"
          >
            <HistoryIcon className="w-3.5 h-3.5 inline mr-1" /> History
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto">
          {/* ─── Audience selector ─── */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-500" />
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Audience</div>
              {previewLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 ml-2" />
              ) : preview ? (
                <span className="ml-2 text-sm font-bold text-[#0A1F44]" data-testid="bulk-email-audience-count">
                  {preview.count.toLocaleString()} recipient{preview.count === 1 ? '' : 's'}
                </span>
              ) : null}
              {activeFilterCount > 0 && (
                <span className="ml-2 text-[10px] font-bold bg-[#DC2626] text-white px-2 py-0.5 rounded-full">
                  {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
                </span>
              )}
              <button onClick={runPreview} className="ml-auto text-xs text-slate-500 hover:text-[#DC2626] flex items-center gap-1" data-testid="bulk-email-refresh-preview">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {/* Type checkboxes */}
            <div className="flex flex-wrap gap-2 mb-3">
              {['student', 'school', 'educator'].map(t => {
                const active = types.includes(t);
                const n = preview?.by_type?.[t] ?? 0;
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? 'bg-[#0A1F44] text-white border-[#0A1F44]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0A1F44]'}`}
                    data-testid={`bulk-email-type-${t}`}
                  >
                    {TYPE_LABELS[t]} {active && n > 0 && <span className="ml-1 opacity-80">({n})</span>}
                  </button>
                );
              })}
              <button
                onClick={() => setShowCustom(v => !v)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${showCustom || zones.length || competitions.length ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500'}`}
                data-testid="bulk-email-toggle-custom"
              >
                Custom segment {(zones.length + competitions.length) > 0 && `(${zones.length + competitions.length})`}
              </button>
            </div>

            {showCustom && (
              <div className="space-y-3 p-3 rounded-lg bg-white border border-slate-200">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Zones</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ZONES.map(z => (
                      <button key={z} onClick={() => toggleZone(z)}
                        className={`px-2.5 py-1 rounded text-xs font-medium border ${zones.includes(z) ? 'bg-[#DC2626] text-white border-[#DC2626]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#DC2626]'}`}
                        data-testid={`bulk-email-zone-${z}`}
                      >{z}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Competitions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {COMPETITIONS.map(c => (
                      <button key={c.id} onClick={() => toggleComp(c.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium border ${competitions.includes(c.id) ? 'bg-[#DC2626] text-white border-[#DC2626]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#DC2626]'}`}
                        data-testid={`bulk-email-comp-${c.id}`}
                      >{c.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Compose / Preview ─── */}
          {view === 'compose' ? (
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Campaign name (internal)</label>
                <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" data-testid="bulk-email-name-input" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subject</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1" data-testid="bulk-email-subject-input" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>HTML body — <span className="normal-case text-slate-400">use <code className="bg-slate-100 px-1 rounded">{'{{first_name}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{school}}'}</code></span></span>
                  <button
                    onClick={async () => {
                      const { data } = await axios.get(`${API}/admin/techfest/bulk-email/default-template`, { headers: getAuthHeaders() });
                      setSubject(data.subject); setHtml(data.html);
                      toast.success('Reset to default checklist');
                    }}
                    className="text-[10px] text-slate-500 hover:text-[#DC2626] font-semibold"
                  >Reset to default</button>
                </label>
                <textarea
                  value={html}
                  onChange={e => setHtml(e.target.value)}
                  rows={14}
                  className="mt-1 w-full font-mono text-xs p-3 border border-slate-200 rounded resize-y focus:outline-none focus:border-[#DC2626]"
                  data-testid="bulk-email-html-input"
                />
              </div>
            </div>
          ) : (
            <div className="px-6 py-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Preview (as recipient would see)</div>
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                <iframe
                  title="Email preview"
                  srcDoc={html}
                  className="w-full"
                  style={{ height: '540px', background: '#fff', border: 'none' }}
                  data-testid="bulk-email-preview-iframe"
                />
              </div>
              {preview?.sample && preview.sample.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Sample of recipients ({Math.min(preview.sample.length, 10)} of {preview.count})</div>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50"><tr>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Email</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Type</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">School</th>
                      </tr></thead>
                      <tbody>
                        {preview.sample.slice(0, 10).map((r, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2">{r.name}</td>
                            <td className="px-3 py-2 text-slate-500">{r.email}</td>
                            <td className="px-3 py-2 capitalize">{r.type}</td>
                            <td className="px-3 py-2 text-slate-500 truncate max-w-[160px]">{r.school || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Campaign history ─── */}
          {showHistory && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40">
              <div className="flex items-center gap-2 mb-2">
                <HistoryIcon className="w-4 h-4 text-slate-500" />
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Recent campaigns</div>
                <button onClick={loadCampaigns} className="ml-auto text-xs text-slate-500 hover:text-[#DC2626]"><RefreshCw className="w-3 h-3 inline" /> Refresh</button>
              </div>
              {campaignsLoading ? (
                <div className="py-6 text-center text-sm text-slate-500"><Loader2 className="w-4 h-4 inline animate-spin" /> Loading…</div>
              ) : campaigns.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">No campaigns yet.</div>
              ) : (
                <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50"><tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Campaign</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Subject</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Status</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Sent / Total</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">When</th>
                    </tr></thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-[#0A1F44]">{c.name}</td>
                          <td className="px-3 py-2 text-slate-500 truncate max-w-[220px]">{c.subject}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {c.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                              {c.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{c.sent || 0} / {c.total}{c.failed ? <span className="text-red-500 ml-1">(✕{c.failed})</span> : null}</td>
                          <td className="px-3 py-2 text-slate-500">{new Date(c.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Live blast progress banner ─── */}
        {activeCampaign && activeCampaign.status === 'running' && (
          <div className="px-6 py-3 border-t border-slate-100 bg-amber-50">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Sending in progress — {activeCampaign.sent} / {activeCampaign.total} delivered
                  {activeCampaign.failed > 0 && <span className="text-red-600 ml-1">({activeCampaign.failed} failed)</span>}
                </div>
                <div className="mt-1.5 h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round(((activeCampaign.sent + activeCampaign.failed) / activeCampaign.total) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {activeCampaign && activeCampaign.status === 'completed' && (
          <div className="px-6 py-3 border-t border-slate-100 bg-emerald-50">
            <div className="flex items-center gap-3 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              <span><strong>Delivered {activeCampaign.sent}/{activeCampaign.total}</strong>{activeCampaign.failed > 0 ? ` · ${activeCampaign.failed} failed` : ''}</span>
              <button onClick={() => setActiveCampaign(null)} className="ml-auto text-xs text-emerald-700 hover:underline">Dismiss</button>
            </div>
          </div>
        )}

        {/* ─── Footer actions ─── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Input
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="Tester email"
              className="h-9 text-sm"
              data-testid="bulk-email-tester-input"
            />
            <Button variant="outline" size="sm" onClick={handleSendSample} disabled={sendingSample || !subject || !html} data-testid="bulk-email-send-sample-btn">
              {sendingSample ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Send sample
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="bulk-email-cancel-btn">Cancel</Button>
          <Button
            size="sm"
            onClick={() => setConfirmBlast(true)}
            disabled={!preview || preview.count === 0 || !subject || !html}
            className="bg-[#DC2626] hover:bg-[#B91C1C]"
            data-testid="bulk-email-send-blast-btn"
          >
            <Send className="w-4 h-4 mr-1" /> Send to {preview?.count || 0} recipients
          </Button>
        </div>

        {/* ─── Confirm blast ─── */}
        {confirmBlast && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" data-testid="bulk-email-confirm-modal">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-bold text-[#0A1F44]">Fire the blast?</div>
                  <div className="text-sm text-slate-500 mt-1">
                    This will email <strong>{preview?.count || 0}</strong> recipient{preview?.count === 1 ? '' : 's'} across <strong>{types.length}</strong> group{types.length === 1 ? '' : 's'}.
                    Can't be undone.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setConfirmBlast(false)} disabled={sendingBlast}>Cancel</Button>
                <Button size="sm" onClick={handleSendBlast} disabled={sendingBlast} className="bg-[#DC2626] hover:bg-[#B91C1C]" data-testid="bulk-email-confirm-blast-btn">
                  {sendingBlast ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Yes, send to all
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
