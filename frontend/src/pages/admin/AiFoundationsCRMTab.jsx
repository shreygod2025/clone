/**
 * AiFoundationsCRMTab — in-CRM view of the 10-Day AI Foundations Course
 * Mirrors the standalone AdminAiFoundations page but lives as a tab inside AdminStudentCRM.
 *
 * Endpoints:
 *   GET   /api/admin/ai-foundations/bookings  (?status=&track=&q=)
 *   PATCH /api/admin/ai-foundations/bookings/:id
 *   Cashfree: /api/ai-foundations/verify/:id  (auto-flip payment_status on capture)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  Sparkles, Search, RefreshCw, Loader2, X, Phone, Mail, GraduationCap,
  TrendingUp, Users, IndianRupee, Award, ExternalLink, Save, CheckCircle2, Clock, Gift,
} from 'lucide-react';
import AiFoundationsBatchesSection from './AiFoundationsBatchesSection';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'lead', label: 'Leads' },
  { key: 'converted', label: 'Converted' },
];
const TRACK_FILTERS = [
  { key: '', label: 'All Tracks' },
  { key: 'explorer', label: 'Explorer (6-8)' },
  { key: 'creator', label: 'Creator (9-12)' },
];
const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const fmtMoney = (v) => `₹${(v || 0).toLocaleString('en-IN')}`;
const fmtDate = (s) => { try { return s ? format(parseISO(s), 'MMM d · h:mm a') : '—'; } catch { return '—'; } };

const AiFoundationsCRMTab = ({ getAuthHeaders }) => {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [trackFilter, setTrackFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState({ crm_status: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      if (trackFilter) params.set('track', trackFilter);
      if (search.trim()) params.set('q', search.trim());
      const r = await axios.get(`${API}/admin/ai-foundations/bookings?${params}`, { headers: getAuthHeaders() });
      setBookings(r.data?.bookings || []);
      setStats(r.data?.stats || null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, trackFilter, search, getAuthHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = (b) => {
    setSelected(b);
    setEditing({ crm_status: b.crm_status || 'lead', notes: b.notes || '' });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await axios.patch(
        `${API}/admin/ai-foundations/bookings/${selected.id}`,
        editing,
        { headers: getAuthHeaders() },
      );
      const updated = r.data?.booking;
      toast.success('Saved');
      setSelected(updated);
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCashfreeVerify = async () => {
    if (!selected) return;
    setVerifying(true);
    try {
      const r = await axios.get(`${API}/ai-foundations/verify/${selected.id}`, { headers: getAuthHeaders() });
      const updated = r.data?.booking;
      if (updated) {
        setSelected(updated);
        setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
        toast.success(`Cashfree says: ${(updated.payment_status || 'unknown').toUpperCase()}`);
        fetchData();
      } else {
        toast.info('Cashfree returned no status update yet');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Verify failed');
    } finally {
      setVerifying(false);
    }
  };

  const filtered = useMemo(() => bookings, [bookings]);

  return (
    <div className="space-y-5" data-testid="ai-foundations-crm-tab">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-[#0F1E33] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" /> AI Foundations — 10-Day Course
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Bookings funnel & Cashfree-tracked enrolments · Grades 6–12</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/ai-foundations" target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
            data-testid="aifcrm-open-landing">
            <ExternalLink className="w-3.5 h-3.5" /> Landing Page
          </a>
          <a href="/admin/ai-foundations" target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
            data-testid="aifcrm-open-full">
            Full CRM <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={fetchData} disabled={loading}
            className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            data-testid="aifcrm-refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="aifcrm-stats">
          <Stat icon={Users} label="Total Bookings" value={stats.total} accent="#1E3A5F" />
          <Stat icon={Award} label="Converted" value={stats.converted} accent="#16A34A" />
          <Stat icon={TrendingUp} label="Conv. Rate" value={`${stats.conversion_rate}%`} accent="#3B82F6" />
          <Stat icon={IndianRupee} label="Revenue" value={fmtMoney(stats.revenue)} accent="#7C3AED" />
        </div>
      )}

      {/* Batches manager */}
      <AiFoundationsBatchesSection getAuthHeaders={getAuthHeaders} />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-2">
        <div className="flex bg-slate-100 rounded-lg p-1">
          {STATUS_FILTERS.map(f => (
            <button key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${
                statusFilter === f.key ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid={`aifcrm-filter-${f.key}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={trackFilter} onChange={e => setTrackFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          data-testid="aifcrm-filter-track">
          {TRACK_FILTERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <div className="ml-auto relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search ref / name / phone / email…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="aifcrm-search" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading && bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading bookings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No bookings yet. The first enrolment will show up here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Ref</th>
                  <th className="text-left px-4 py-3 font-bold">Student</th>
                  <th className="text-left px-4 py-3 font-bold">Track / Grade</th>
                  <th className="text-left px-4 py-3 font-bold">Parent Contact</th>
                  <th className="text-left px-4 py-3 font-bold">Status</th>
                  <th className="text-left px-4 py-3 font-bold">Payment</th>
                  <th className="text-right px-4 py-3 font-bold">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} onClick={() => openDetail(b)}
                    className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
                    data-testid={`aifcrm-row-${b.booking_ref}`}>
                    <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F]">{b.booking_ref}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0F1E33]">{b.student_name}</div>
                      <div className="text-[11px] text-slate-500">{b.school_name || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-700">{b.track_label}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Grade {b.student_grade}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-700 flex items-center gap-1"><Phone className="w-3 h-3" /> {b.parent_phone}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {b.parent_email}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={b.crm_status} payment={b.payment_status} /></td>
                    <td className="px-4 py-3"><PaymentBadge status={b.payment_status} /></td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">{fmtDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" data-testid="aifcrm-drawer">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">AI Foundations</div>
                <div className="font-mono font-bold text-[#1E3A5F]">{selected.booking_ref}</div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg" data-testid="aifcrm-drawer-close">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Student</div>
                <div className="text-lg font-black text-[#0F1E33]">{selected.student_name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Grade {selected.student_grade} · {selected.track_label}
                </div>
              </div>

              {selected.school_name && <Detail label="School" value={selected.school_name} />}

              <div className="grid grid-cols-2 gap-3">
                <Detail label="Parent" value={selected.parent_name} />
                <Detail label="Created" value={fmtDate(selected.created_at)} />
                <Detail label="Phone" value={selected.parent_phone} />
                <Detail label="Email" value={selected.parent_email} />
                <Detail label="Amount" value={fmtMoney(selected.amount)} />
                <Detail label="Cashfree Order" value={selected.order_id || '—'} mono />
              </div>

              {/* Cashfree section */}
              <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-slate-600">
                  <IndianRupee className="w-3 h-3" /> Cashfree payment
                </div>
                {selected.payment_link && selected.payment_status !== 'paid' && (
                  <a href={selected.payment_link} target="_blank" rel="noopener noreferrer"
                    className="block text-center py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-100"
                    data-testid="aifcrm-payment-link">
                    Open pending payment link →
                  </a>
                )}
                <button onClick={handleCashfreeVerify} disabled={verifying}
                  className="w-full py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#1E3A5F] text-[#1E3A5F] text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                  data-testid="aifcrm-verify-cashfree">
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Re-verify with Cashfree
                </button>
                {selected.payment_status === 'paid' && selected.paid_at && (
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid on {fmtDate(selected.paid_at)}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">CRM Status</label>
                <select value={editing.crm_status}
                  onChange={e => setEditing(prev => ({ ...prev, crm_status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  disabled={selected.payment_status === 'paid'}
                  data-testid="aifcrm-edit-status">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {selected.payment_status === 'paid' && (
                  <p className="text-[11px] text-slate-400 mt-1">Locked — payment has been confirmed.</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">Notes</label>
                <textarea value={editing.notes}
                  onChange={e => setEditing(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Conversation notes, follow-up plan, etc."
                  data-testid="aifcrm-edit-notes" />
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="aifcrm-save">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-xl font-black text-[#0F1E33]">{value}</div>
    </div>
  </div>
);

const Detail = ({ label, value, mono }) => (
  <div>
    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
    <div className={`text-sm text-[#0F1E33] font-semibold break-all ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</div>
  </div>
);

const StatusBadge = ({ status, payment }) => {
  const isPaid = payment === 'paid' || status === 'converted';
  const cfg = isPaid
    ? { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'CONVERTED' }
    : status === 'lost'
      ? { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'LOST' }
      : status === 'qualified'
        ? { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'QUALIFIED' }
        : status === 'contacted'
          ? { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: 'CONTACTED' }
          : { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'LEAD' };
  return <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>;
};

const PaymentBadge = ({ status }) => {
  if (status === 'paid') {
    return <span className="text-[10px] px-2 py-1 rounded-full font-black border bg-emerald-50 text-emerald-700 border-emerald-300 inline-flex items-center gap-1">
      <Gift className="w-3 h-3" /> PAID
    </span>;
  }
  if (status === 'failed') {
    return <span className="text-[10px] px-2 py-1 rounded-full font-black border bg-red-50 text-red-700 border-red-200">FAILED</span>;
  }
  return <span className="text-[10px] px-2 py-1 rounded-full font-bold border bg-amber-50 text-amber-700 border-amber-200 inline-flex items-center gap-1">
    <Clock className="w-3 h-3" /> PENDING
  </span>;
};

export default AiFoundationsCRMTab;
