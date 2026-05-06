import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Bot, Search, RefreshCw, Loader2, X, Phone, Mail, GraduationCap,
  TrendingUp, Users, IndianRupee, Calendar, MapPin, ExternalLink, Save, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { key: 'trials', label: 'Free Trials', icon: Calendar },
  { key: 'subs',   label: 'Subscriptions', icon: Sparkles },
];

const TRIAL_STATUS = [
  { value: 'trial_lead',     label: 'Lead' },
  { value: 'trial_contacted', label: 'Contacted' },
  { value: 'trial_scheduled', label: 'Scheduled' },
  { value: 'trial_attended',  label: 'Attended' },
  { value: 'converted',       label: 'Converted' },
  { value: 'lost',            label: 'Lost' },
];

const SUB_STATUS = [
  { value: 'subscription_lead', label: 'Lead' },
  { value: 'pending_payment',   label: 'Pending Payment' },
  { value: 'active',            label: 'Active' },
  { value: 'cancelled',         label: 'Cancelled' },
];

const fmtMoney = (v) => `₹${(v || 0).toLocaleString('en-IN')}`;
const fmtDate = (s) => { try { return s ? format(parseISO(s), 'MMM d · h:mm a') : '—'; } catch { return '—'; } };

const AdminFutureSkills = () => {
  const { getAuthHeaders } = useAuth();
  const [tab, setTab] = useState('trials');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('q', search.trim());
      const path = tab === 'trials' ? 'trials' : 'subscriptions';
      const r = await axios.get(`${API}/admin/future-skills/${path}?${params}`, { headers: getAuthHeaders() });
      setRows(r.data?.[path] || []);
      setStats(r.data?.stats || null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, search, getAuthHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = (r) => {
    setSelected(r);
    setEditing(tab === 'trials'
      ? { crm_status: r.crm_status || 'trial_lead', notes: r.notes || '', assigned_center: r.assigned_center || r.preferred_center || '' }
      : { crm_status: r.crm_status || 'subscription_lead', notes: r.notes || '', assigned_center: r.assigned_center || r.preferred_center || '' }
    );
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const path = tab === 'trials' ? `trials/${selected.id}` : `subscriptions/${selected.id}`;
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

  const STATUS_OPTIONS = tab === 'trials' ? TRIAL_STATUS : SUB_STATUS;

  return (
    <AdminLayout title="Future Skills">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5" data-testid="admin-future-skills">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <Bot className="w-7 h-7 text-[#D63031]" /> Future Skills CRM
            </h1>
            <p className="text-sm text-slate-500 mt-1">Trial leads & active subscriptions, all in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/future-skills" target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
              data-testid="open-landing-btn">
              <ExternalLink className="w-3.5 h-3.5" /> Open Landing
            </a>
            <button onClick={fetchData} disabled={loading}
              className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5 disabled:opacity-50"
              data-testid="refresh-btn">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => { setTab(t.key); setStatusFilter('all'); setSelected(null); }}
              className={`text-xs px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                tab === t.key ? 'bg-white text-[#0F1E33] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid={`tab-${t.key}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={Users} label={tab === 'trials' ? 'Total Trials' : 'Total Subs'} value={stats.total || 0} accent="#1E3A5F" />
            {tab === 'trials' ? (
              <>
                <Stat icon={Calendar} label="This view" value={rows.length} accent="#D63031" />
                <Stat icon={TrendingUp} label="Latest" value={rows[0]?.trial_ref || '—'} accent="#3B82F6" />
                <Stat icon={Sparkles} label="Status filter" value={statusFilter === 'all' ? 'All' : statusFilter} accent="#7C3AED" />
              </>
            ) : (
              <>
                <Stat icon={Sparkles} label="Active" value={stats.active || 0} accent="#16A34A" />
                <Stat icon={TrendingUp} label="Leads" value={stats.leads || 0} accent="#3B82F6" />
                <Stat icon={IndianRupee} label="Revenue" value={fmtMoney(stats.revenue || 0)} accent="#7C3AED" />
              </>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="filter-status">
            <option value="all">All statuses</option>
            {tab === 'trials'
              ? TRIAL_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)
              : <>
                  <option value="active">Active</option>
                  <option value="lead">Leads</option>
                </>}
          </select>
          <div className="ml-auto relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search ref / name / phone / email…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="search-input" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No {tab === 'trials' ? 'trial bookings' : 'subscriptions'} yet. New ones will show up here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">Ref</th>
                    <th className="text-left px-4 py-3 font-bold">Student</th>
                    <th className="text-left px-4 py-3 font-bold">Grade · Centre</th>
                    <th className="text-left px-4 py-3 font-bold">Parent</th>
                    {tab === 'subs' && <th className="text-left px-4 py-3 font-bold">Plan</th>}
                    <th className="text-left px-4 py-3 font-bold">Status</th>
                    <th className="text-right px-4 py-3 font-bold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} onClick={() => openDetail(r)}
                      className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
                      data-testid={`row-${r.trial_ref || r.subscription_ref}`}>
                      <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F]">{r.trial_ref || r.subscription_ref}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F1E33]">{r.student_name}</div>
                        <div className="text-[11px] text-slate-500">{r.preferred_skill ? `Loves: ${r.preferred_skill}` : '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><GraduationCap className="w-3 h-3" /> Grade {r.student_grade}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {r.assigned_center || r.preferred_center || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0F1E33] text-xs">{r.parent_name}</div>
                        <div className="text-xs text-slate-700 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {r.parent_phone}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {r.parent_email}</div>
                      </td>
                      {tab === 'subs' && (
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#0F1E33] text-xs">{r.plan_label}</div>
                          <div className="text-[11px] text-slate-500">{fmtMoney(r.amount)}</div>
                        </td>
                      )}
                      <td className="px-4 py-3"><StatusBadge status={r.crm_status} /></td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" data-testid="detail-drawer">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#D63031] font-bold">{tab === 'trials' ? 'Trial Booking' : 'Subscription'}</div>
                <div className="font-mono font-bold text-[#1E3A5F]">{selected.trial_ref || selected.subscription_ref}</div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg" data-testid="close-detail-btn">
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
                <Detail label="Phone" value={selected.parent_phone} testid="detail-phone" />
                <Detail label="Email" value={selected.parent_email} testid="detail-email" />
                <Detail label="Preferred centre" value={selected.preferred_center || '—'} />
                {selected.preferred_skill && <Detail label="Skill interest" value={selected.preferred_skill} />}
                {tab === 'subs' && <Detail label="Plan" value={selected.plan_label} />}
                {tab === 'subs' && <Detail label="Amount" value={fmtMoney(selected.amount)} />}
                {tab === 'subs' && <Detail label="Payment" value={(selected.payment_status || '').toUpperCase() || '—'} />}
              </div>

              {selected.payment_link && selected.payment_status !== 'paid' && (
                <a href={selected.payment_link} target="_blank" rel="noopener noreferrer"
                  className="block text-center py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100"
                  data-testid="payment-link-btn">
                  Open pending payment link →
                </a>
              )}

              <div>
                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">CRM Status</label>
                <select value={editing.crm_status || ''}
                  onChange={e => setEditing(prev => ({ ...prev, crm_status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  data-testid="edit-status-select">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">Assigned Centre</label>
                <input value={editing.assigned_center || ''}
                  onChange={e => setEditing(prev => ({ ...prev, assigned_center: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. Mumbai · Andheri"
                  data-testid="edit-center-input" />
              </div>

              <div>
                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">Notes</label>
                <textarea value={editing.notes || ''}
                  onChange={e => setEditing(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Conversation notes, follow-up plan, etc."
                  data-testid="edit-notes-input" />
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D63031] to-[#1E3A5F] text-white font-bold hover:from-[#B52828] hover:to-[#0F1E33] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="save-detail-btn">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const Stat = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-xl font-black text-[#0F1E33] truncate">{value}</div>
    </div>
  </div>
);

const Detail = ({ label, value, testid }) => (
  <div data-testid={testid}>
    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
    <div className="text-sm text-[#0F1E33] font-semibold break-all">{value || '—'}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    active:             { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'ACTIVE' },
    converted:          { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'CONVERTED' },
    trial_attended:     { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'ATTENDED' },
    trial_scheduled:    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: 'SCHEDULED' },
    trial_contacted:    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'CONTACTED' },
    pending_payment:    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'PENDING $' },
    cancelled:          { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'CANCELLED' },
    lost:               { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'LOST' },
  };
  const cfg = map[status] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'LEAD' };
  return <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>;
};

export default AdminFutureSkills;
