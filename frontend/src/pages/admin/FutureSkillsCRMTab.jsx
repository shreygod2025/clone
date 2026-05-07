/**
 * FutureSkillsCRMTab — in-CRM view of the Future Skills Continuous Learning Program
 * Mirrors the AdminFutureSkills page but styled to live inside AdminStudentCRM as a tab.
 *
 * Data flow:
 *   Trials       — GET  /api/admin/future-skills/trials       (crm_status filtering)
 *   Subscriptions— GET  /api/admin/future-skills/subscriptions (Cashfree payment_status)
 *   Cashfree     — verify endpoint + webhook already flip payment_status to 'paid'
 *                  when the order is captured, so "Converted" here is 1:1 with real revenue.
 */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  Loader2, Search, RefreshCw, Phone, Mail, Calendar, Sparkles, MapPin,
  GraduationCap, X, Save, ExternalLink, IndianRupee, TrendingUp, Users,
  CheckCircle2, Clock, Gift,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SUB_TABS = [
  { v: 'trials', l: 'Free Trials', icon: Calendar },
  { v: 'subscriptions', l: 'Paid Subscriptions', icon: Sparkles },
];

const TRIAL_STATUS_OPTIONS = [
  { value: 'trial_lead', label: 'Lead' },
  { value: 'trial_contacted', label: 'Contacted' },
  { value: 'trial_scheduled', label: 'Scheduled' },
  { value: 'trial_attended', label: 'Attended' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const SUB_STATUS_OPTIONS = [
  { value: 'subscription_lead', label: 'Lead' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' },
];

const fmtMoney = (v) => `₹${(v || 0).toLocaleString('en-IN')}`;
const fmtDate = (s) => { try { return s ? format(parseISO(s), 'MMM d · h:mm a') : '—'; } catch { return '—'; } };

const FutureSkillsCRMTab = ({ getAuthHeaders }) => {
  const [subTab, setSubTab] = useState('trials');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('q', search.trim());
      const path = subTab === 'trials' ? 'trials' : 'subscriptions';
      const r = await axios.get(`${API}/admin/future-skills/${path}?${params}`, { headers: getAuthHeaders() });
      setRows(r.data?.[path] || []);
      setStats(r.data?.stats || null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load Future Skills data');
    } finally {
      setLoading(false);
    }
  }, [subTab, statusFilter, search, getAuthHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = (r) => {
    setSelected(r);
    setEditing(subTab === 'trials'
      ? {
          crm_status: r.crm_status || 'trial_lead',
          notes: r.notes || '',
          assigned_center: r.assigned_center || r.preferred_center || '',
        }
      : {
          crm_status: r.crm_status || 'subscription_lead',
          notes: r.notes || '',
          assigned_center: r.assigned_center || r.preferred_center || '',
        });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const path = subTab === 'trials' ? `trials/${selected.id}` : `subscriptions/${selected.id}`;
      const r = await axios.patch(`${API}/admin/future-skills/${path}`, editing, { headers: getAuthHeaders() });
      const updated = r.data?.trial || r.data?.subscription;
      toast.success('Saved');
      setSelected(updated);
      setRows(prev => prev.map(x => x.id === updated.id ? updated : x));
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // Re-hit Cashfree and refresh this one subscription's payment_status.
  const handleCashfreeVerify = async () => {
    if (!selected || subTab !== 'subscriptions') return;
    setVerifying(true);
    try {
      const r = await axios.get(`${API}/future-skills/verify/${selected.id}`, { headers: getAuthHeaders() });
      const updated = r.data?.subscription;
      if (updated) {
        setSelected(updated);
        setRows(prev => prev.map(x => x.id === updated.id ? updated : x));
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

  // ── Stat cards (clickable filters) ──
  const statCards = subTab === 'trials' ? [
    { label: 'All', count: rows.length, filter: 'all', color: 'bg-blue-50 border-blue-200 text-blue-700', active: 'bg-blue-600 border-blue-600 text-white' },
    { label: 'New Leads', count: rows.filter(r => r.crm_status === 'trial_lead').length, filter: 'trial_lead', color: 'bg-slate-50 border-slate-200 text-slate-700', active: 'bg-slate-600 border-slate-600 text-white' },
    { label: 'Contacted', count: rows.filter(r => r.crm_status === 'trial_contacted').length, filter: 'trial_contacted', color: 'bg-amber-50 border-amber-200 text-amber-700', active: 'bg-amber-500 border-amber-500 text-white' },
    { label: 'Scheduled', count: rows.filter(r => r.crm_status === 'trial_scheduled').length, filter: 'trial_scheduled', color: 'bg-violet-50 border-violet-200 text-violet-700', active: 'bg-violet-600 border-violet-600 text-white' },
    { label: 'Attended', count: rows.filter(r => r.crm_status === 'trial_attended').length, filter: 'trial_attended', color: 'bg-sky-50 border-sky-200 text-sky-700', active: 'bg-sky-600 border-sky-600 text-white' },
    { label: 'Converted', count: rows.filter(r => r.crm_status === 'converted').length, filter: 'converted', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', active: 'bg-emerald-600 border-emerald-600 text-white' },
    { label: 'Lost', count: rows.filter(r => r.crm_status === 'lost').length, filter: 'lost', color: 'bg-red-50 border-red-200 text-red-700', active: 'bg-red-500 border-red-500 text-white' },
  ] : [
    { label: 'All', count: rows.length, filter: 'all', color: 'bg-blue-50 border-blue-200 text-blue-700', active: 'bg-blue-600 border-blue-600 text-white' },
    { label: 'Pending Payment', count: rows.filter(r => r.payment_status !== 'paid' && r.crm_status !== 'cancelled').length, filter: 'lead', color: 'bg-amber-50 border-amber-200 text-amber-700', active: 'bg-amber-500 border-amber-500 text-white' },
    { label: 'Paid · Active', count: rows.filter(r => r.payment_status === 'paid' && r.crm_status !== 'cancelled').length, filter: 'active', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', active: 'bg-emerald-600 border-emerald-600 text-white' },
    { label: 'Cancelled', count: rows.filter(r => r.crm_status === 'cancelled').length, filter: 'cancelled', color: 'bg-red-50 border-red-200 text-red-700', active: 'bg-red-500 border-red-500 text-white' },
  ];

  const statusOptions = subTab === 'trials' ? TRIAL_STATUS_OPTIONS : SUB_STATUS_OPTIONS;

  return (
    <div className="space-y-5" data-testid="future-skills-crm-tab">
      {/* Header strip */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-[#0F1E33] flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-[#D63031] to-[#1E3A5F]" />
            Future Skills — Continuous Learning Program
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trial funnel & paid subscriptions (Cashfree-backed) · Grades 1–10 · Weekly offline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/future-skills" target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
            data-testid="fscrm-open-landing">
            <ExternalLink className="w-3.5 h-3.5" /> Landing Page
          </a>
          <a href="/admin/future-skills" target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
            data-testid="fscrm-open-full">
            Full CRM <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={fetchData} disabled={loading}
            className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            data-testid="fscrm-refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {SUB_TABS.map(t => (
          <button key={t.v}
            onClick={() => { setSubTab(t.v); setStatusFilter('all'); setSelected(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              subTab === t.v
                ? 'bg-gradient-to-r from-[#D63031] to-[#1E3A5F] text-white shadow-md shadow-blue-900/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            data-testid={`fscrm-subtab-${t.v}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.l}
          </button>
        ))}
      </div>

      {/* Revenue / headline stats for subscriptions */}
      {subTab === 'subscriptions' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="fscrm-revenue-cards">
          <HeadlineCard icon={Users} label="Total Subs" value={stats.total || 0} gradient="from-[#1E3A5F] to-[#0F1E33]" />
          <HeadlineCard icon={CheckCircle2} label="Active Paid" value={stats.active || 0} gradient="from-emerald-600 to-emerald-800" />
          <HeadlineCard icon={TrendingUp} label="Leads Pending" value={stats.leads || 0} gradient="from-amber-500 to-amber-700" />
          <HeadlineCard icon={IndianRupee} label="Revenue" value={fmtMoney(stats.revenue || 0)} gradient="from-[#D63031] to-[#7B2C5C]" small />
        </div>
      )}

      {/* Stat filter pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {statCards.map(s => {
          const isActive = (statusFilter === 'all' && s.filter === 'all') || statusFilter === s.filter;
          return (
            <button key={s.label}
              onClick={() => setStatusFilter(s.filter === 'all' ? 'all' : s.filter)}
              className={`text-left px-3 py-2.5 rounded-lg border-2 transition-all ${isActive ? s.active : s.color} hover:shadow-md`}
              data-testid={`fscrm-stat-${s.filter}`}>
              <div className="text-[10px] font-bold tracking-wide uppercase opacity-80">{s.label}</div>
              <div className="text-xl font-black mt-0.5">{s.count}</div>
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search ref / child / parent / phone / email…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            data-testid="fscrm-search" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No {subTab === 'trials' ? 'trial bookings' : 'subscriptions'} yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Ref</th>
                  <th className="text-left px-4 py-3 font-bold">Student · Grade</th>
                  <th className="text-left px-4 py-3 font-bold">Parent · Phone</th>
                  <th className="text-left px-4 py-3 font-bold">Centre</th>
                  {subTab === 'subscriptions' && <th className="text-left px-4 py-3 font-bold">Plan · ₹</th>}
                  <th className="text-left px-4 py-3 font-bold">Status</th>
                  {subTab === 'subscriptions' && <th className="text-left px-4 py-3 font-bold">Payment</th>}
                  <th className="text-right px-4 py-3 font-bold">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} onClick={() => openDetail(r)}
                    className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
                    data-testid={`fscrm-row-${r.trial_ref || r.subscription_ref}`}>
                    <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F]">{r.trial_ref || r.subscription_ref}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0F1E33]">{r.student_name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Grade {r.student_grade}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#0F1E33] text-xs">{r.parent_name}</div>
                      <div className="text-xs text-slate-700 flex items-center gap-1"><Phone className="w-3 h-3" /> {r.parent_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" /> {r.assigned_center || r.preferred_center || '—'}</td>
                    {subTab === 'subscriptions' && (
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F1E33] text-xs">{r.plan_label}</div>
                        <div className="text-[11px] text-slate-500">{fmtMoney(r.amount)}</div>
                      </td>
                    )}
                    <td className="px-4 py-3"><StatusBadge status={r.crm_status} /></td>
                    {subTab === 'subscriptions' && (
                      <td className="px-4 py-3"><PaymentBadge status={r.payment_status} /></td>
                    )}
                    <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" data-testid="fscrm-drawer">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#D63031] font-bold">
                  {subTab === 'trials' ? 'Trial Booking' : 'Subscription'}
                </div>
                <div className="font-mono font-bold text-[#1E3A5F]">{selected.trial_ref || selected.subscription_ref}</div>
              </div>
              <button onClick={() => setSelected(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg" data-testid="fscrm-drawer-close">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Student</div>
                <div className="text-lg font-black text-[#0F1E33]">{selected.student_name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Grade {selected.student_grade}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Detail label="Parent" value={selected.parent_name} />
                <Detail label="Created" value={fmtDate(selected.created_at)} />
                <Detail label="Phone" value={selected.parent_phone} icon={<Phone className="w-3 h-3" />} />
                <Detail label="Email" value={selected.parent_email} icon={<Mail className="w-3 h-3" />} />
                <Detail label="Pref. Centre" value={selected.preferred_center || '—'} />
                {selected.preferred_skill && <Detail label="Skill" value={selected.preferred_skill} />}
                {subTab === 'subscriptions' && <>
                  <Detail label="Plan" value={selected.plan_label} />
                  <Detail label="Amount" value={fmtMoney(selected.amount)} />
                  <Detail label="Cashfree Order" value={selected.order_id || '—'} mono />
                  <Detail label="Payment" value={(selected.payment_status || '').toUpperCase() || '—'} />
                </>}
              </div>

              {/* Cashfree area for subscriptions */}
              {subTab === 'subscriptions' && (
                <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-slate-600">
                    <IndianRupee className="w-3 h-3" /> Cashfree payment
                  </div>
                  {selected.payment_link && selected.payment_status !== 'paid' && (
                    <a href={selected.payment_link} target="_blank" rel="noopener noreferrer"
                      className="block text-center py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-100"
                      data-testid="fscrm-payment-link">
                      Open pending payment link →
                    </a>
                  )}
                  <button onClick={handleCashfreeVerify} disabled={verifying}
                    className="w-full py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#1E3A5F] text-[#1E3A5F] text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                    data-testid="fscrm-verify-cashfree">
                    {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Re-verify with Cashfree
                  </button>
                  {selected.payment_status === 'paid' && selected.paid_at && (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paid on {fmtDate(selected.paid_at)}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">CRM Status</label>
                <select value={editing.crm_status || ''}
                  onChange={e => setEditing(prev => ({ ...prev, crm_status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  data-testid="fscrm-edit-status">
                  {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">Assigned Centre</label>
                <input value={editing.assigned_center || ''}
                  onChange={e => setEditing(prev => ({ ...prev, assigned_center: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. Mumbai · Andheri"
                  data-testid="fscrm-edit-center" />
              </div>

              <div>
                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">Notes</label>
                <textarea value={editing.notes || ''}
                  onChange={e => setEditing(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Conversation notes, follow-up plan…"
                  data-testid="fscrm-edit-notes" />
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D63031] to-[#1E3A5F] text-white font-bold hover:from-[#B52828] hover:to-[#0F1E33] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="fscrm-save">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HeadlineCard = ({ icon: Icon, label, value, gradient, small }) => (
  <div className={`rounded-xl p-4 text-white bg-gradient-to-br ${gradient} shadow-lg shadow-slate-900/10`}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">{label}</span>
      <Icon className="w-4 h-4 opacity-70" />
    </div>
    <div className={`font-black ${small ? 'text-xl' : 'text-2xl'}`}>{value}</div>
  </div>
);

const Detail = ({ label, value, icon, mono }) => (
  <div>
    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">{icon} {label}</div>
    <div className={`text-sm text-[#0F1E33] font-semibold break-all ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    active:             { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'ACTIVE', Icon: CheckCircle2 },
    converted:          { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'CONVERTED', Icon: CheckCircle2 },
    trial_attended:     { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'ATTENDED', Icon: CheckCircle2 },
    trial_scheduled:    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: 'SCHEDULED', Icon: Calendar },
    trial_contacted:    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'CONTACTED', Icon: Phone },
    pending_payment:    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'PENDING', Icon: Clock },
    cancelled:          { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'CANCELLED', Icon: X },
    lost:               { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'LOST', Icon: X },
  };
  const cfg = map[status] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'LEAD', Icon: Sparkles };
  const { Icon } = cfg;
  return (
    <span className={`text-[10px] px-2 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
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
  return <span className="text-[10px] px-2 py-1 rounded-full font-bold border bg-amber-50 text-amber-700 border-amber-200">PENDING</span>;
};

export default FutureSkillsCRMTab;
