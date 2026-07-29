import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Bot, Search, RefreshCw, Loader2, X, Phone, Mail, GraduationCap,
  TrendingUp, Users, IndianRupee, Calendar, MapPin, ExternalLink, Save, Sparkles,
  Plus, Upload, Download, AlertTriangle, XCircle, RotateCcw, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { key: 'leads',     label: 'Leads',            icon: Users },
  { key: 'trials',    label: 'Free Trials',      icon: Calendar },
  { key: 'customers', label: 'Active Customers', icon: Sparkles },
  { key: 'renewals',  label: 'Renewals',         icon: RotateCcw },
  { key: 'lost',      label: 'Lost',             icon: XCircle },
];

const LEAD_STATUSES = [
  { value: 'new',          label: 'New' },
  { value: 'contacted',    label: 'Contacted' },
  { value: 'qualified',    label: 'Qualified' },
  { value: 'trial_booked', label: 'Trial Booked' },
];

const PLAN_OPTIONS = [
  { value: 'monthly',     label: 'Monthly',     defaultAmount: 2000 },
  { value: 'half_yearly', label: 'Half Yearly', defaultAmount: 11000 },
  { value: 'yearly',      label: 'Annual',      defaultAmount: 21000 },
];

const fmtMoney = (v) => `₹${(v || 0).toLocaleString('en-IN')}`;
const fmtDate  = (s) => { try { return s ? format(parseISO(s), 'MMM d, yyyy') : '—'; } catch { return '—'; } };
const fmtDateTime = (s) => { try { return s ? format(parseISO(s), 'MMM d · h:mm a') : '—'; } catch { return '—'; } };

const AdminFutureSkills = () => {
  const { getAuthHeaders } = useAuth();
  const [tab, setTab] = useState('leads');
  const [renewalBucket, setRenewalBucket] = useState('all');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [tabStats, setTabStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null); // 'add-lead' | 'add-trial' | 'add-customer' | 'import' | 'renew' | 'lost' | 'convert-trial'
  const fileInputRef = useRef(null);

  // ── Fetchers ─────────────────────────────────────────────────────────
  const fetchTabStats = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/admin/future-skills/stats`, { headers: getAuthHeaders() });
      setTabStats(r.data || null);
    } catch (_) { /* ignore */ }
  }, [getAuthHeaders]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      let path = '';
      let dataKey = '';
      if (tab === 'leads') {
        if (statusFilter !== 'all') params.set('status', statusFilter);
        path = 'leads'; dataKey = 'leads';
      } else if (tab === 'trials') {
        if (statusFilter !== 'all') params.set('status', statusFilter);
        path = 'trials'; dataKey = 'trials';
      } else if (tab === 'customers') {
        params.set('status', 'active');
        path = 'subscriptions'; dataKey = 'subscriptions';
      } else if (tab === 'renewals') {
        params.set('bucket', renewalBucket);
        path = 'renewals'; dataKey = 'renewals';
      } else if (tab === 'lost') {
        if (statusFilter !== 'all') params.set('type', statusFilter);
        path = 'lost'; dataKey = 'lost';
      }
      const r = await axios.get(`${API}/admin/future-skills/${path}?${params}`, { headers: getAuthHeaders() });
      setRows(r.data?.[dataKey] || []);
      setStats(r.data?.stats || null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, search, renewalBucket, getAuthHeaders]);

  useEffect(() => { fetchData(); fetchTabStats(); }, [fetchData, fetchTabStats]);

  const refreshAll = () => { fetchData(); fetchTabStats(); };

  // ── Actions ──────────────────────────────────────────────────────────
  const handleImport = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const promise = axios.post(`${API}/admin/future-skills/leads/import`, fd, {
      headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
    });
    toast.promise(promise, {
      loading: 'Importing leads…',
      success: (res) => {
        const d = res.data;
        refreshAll();
        return `Imported ${d.inserted} leads, skipped ${d.skipped}`;
      },
      error: (e) => e.response?.data?.detail || 'Import failed',
    });
  };

  const handleConvertLeadToTrial = async (lead) => {
    try {
      await axios.post(`${API}/admin/future-skills/leads/${lead.id}/convert-to-trial`, {}, { headers: getAuthHeaders() });
      toast.success(`${lead.name} moved to Free Trial`);
      refreshAll();
      setSelected(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Conversion failed');
    }
  };

  // ── Rendering per tab ────────────────────────────────────────────────
  const STATUS_FILTER_OPTIONS =
    tab === 'leads'   ? [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active only' }, ...LEAD_STATUSES]
    : tab === 'trials' ? [
        { value: 'all', label: 'All' },
        { value: 'trial_lead', label: 'Lead' },
        { value: 'trial_contacted', label: 'Contacted' },
        { value: 'trial_scheduled', label: 'Scheduled' },
        { value: 'trial_attended', label: 'Attended' },
        { value: 'converted', label: 'Converted' },
      ]
    : tab === 'lost' ? [
        { value: 'all', label: 'All types' },
        { value: 'lead', label: 'Leads' },
        { value: 'trial', label: 'Trials' },
        { value: 'customer', label: 'Customers' },
      ]
    : null;

  return (
    <AdminLayout title="Future Skills">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5" data-testid="admin-future-skills">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <Bot className="w-7 h-7 text-[#D63031]" /> Future Skills CRM
            </h1>
            <p className="text-sm text-slate-500 mt-1">Leads · Trials · Customers · Renewals · Lost — all in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/future-skills" target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
              data-testid="open-landing-btn">
              <ExternalLink className="w-3.5 h-3.5" /> Open Landing
            </a>
            <button onClick={refreshAll} disabled={loading}
              className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5 disabled:opacity-50"
              data-testid="refresh-btn">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Tabs with badges */}
        <div className="flex flex-wrap bg-slate-100 rounded-xl p-1 w-fit gap-1">
          {TABS.map(t => {
            const badge =
              t.key === 'leads'     ? tabStats?.leads
              : t.key === 'trials'  ? tabStats?.trials
              : t.key === 'customers' ? tabStats?.customers
              : t.key === 'renewals' ? tabStats?.renewals
              : t.key === 'lost'    ? tabStats?.lost
              : 0;
            return (
              <button key={t.key}
                onClick={() => { setTab(t.key); setStatusFilter('all'); setSelected(null); }}
                className={`text-xs px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  tab === t.key ? 'bg-white text-[#0F1E33] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                data-testid={`tab-${t.key}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
                {typeof badge === 'number' && badge > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    tab === t.key ? 'bg-[#D63031] text-white' : 'bg-slate-200 text-slate-600'
                  }`}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-wrap items-center gap-2">
          {/* Left: primary actions per tab */}
          {tab === 'leads' && (
            <>
              <button onClick={() => setModal({ type: 'add-lead' })}
                className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center gap-1.5"
                data-testid="add-lead-btn">
                <Plus className="w-3.5 h-3.5" /> Add Lead
              </button>
              <button onClick={() => setModal({ type: 'import' })}
                className="text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                data-testid="import-leads-btn">
                <Upload className="w-3.5 h-3.5" /> Import CSV / Excel
              </button>
            </>
          )}
          {tab === 'trials' && (
            <button onClick={() => setModal({ type: 'add-trial' })}
              className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center gap-1.5"
              data-testid="add-trial-btn">
              <Plus className="w-3.5 h-3.5" /> Add Free Trial
            </button>
          )}
          {tab === 'customers' && (
            <button onClick={() => setModal({ type: 'add-customer' })}
              className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center gap-1.5"
              data-testid="add-customer-btn">
              <Plus className="w-3.5 h-3.5" /> Add Customer
            </button>
          )}

          {/* Renewal bucket switch */}
          {tab === 'renewals' && (
            <div className="flex bg-slate-100 rounded-lg p-1">
              {[{k:'all',l:'All'},{k:'upcoming',l:'Upcoming (7d)'},{k:'overdue',l:'Overdue'}].map(b => (
                <button key={b.k} onClick={() => setRenewalBucket(b.k)}
                  className={`text-xs px-3 py-1.5 rounded font-bold ${
                    renewalBucket === b.k ? 'bg-white text-[#0F1E33] shadow-sm' : 'text-slate-500'
                  }`}
                  data-testid={`renewal-bucket-${b.k}`}>{b.l}</button>
              ))}
            </div>
          )}

          {/* Status filter */}
          {STATUS_FILTER_OPTIONS && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="filter-status">
              {STATUS_FILTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}

          {/* Search */}
          <div className="ml-auto relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search ref / name / phone / email…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="search-input" />
          </div>
        </div>

        {/* Stats row */}
        {tabStats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <MiniStat label="Leads"     value={tabStats.leads     || 0} accent="#1E3A5F" icon={Users}    active={tab==='leads'} />
            <MiniStat label="Trials"    value={tabStats.trials    || 0} accent="#3B82F6" icon={Calendar} active={tab==='trials'} />
            <MiniStat label="Customers" value={tabStats.customers || 0} accent="#16A34A" icon={Sparkles} active={tab==='customers'} />
            <MiniStat label="Renewals"  value={tabStats.renewals  || 0} accent="#F59E0B" icon={RotateCcw} active={tab==='renewals'}
              sub={`↑${tabStats.renewals_upcoming || 0}  ⚠${tabStats.renewals_overdue || 0}`} />
            <MiniStat label="Lost"      value={tabStats.lost      || 0} accent="#DC2626" icon={XCircle}  active={tab==='lost'} />
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-slate-400" data-testid="empty-state">
              Nothing here yet. {tab === 'leads' && 'Add your first lead or import a CSV.'}
              {tab === 'trials' && 'Trials booked from the website or converted from leads will show here.'}
              {tab === 'customers' && 'Add a paying customer or convert a trial.'}
              {tab === 'renewals' && 'Customers approaching or past their renewal date appear here.'}
              {tab === 'lost' && 'Marked-lost leads, trials and customers appear here.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {tab === 'leads'     && <LeadsTable rows={rows} onOpen={setSelected} />}
              {tab === 'trials'    && <TrialsTable rows={rows} onOpen={setSelected} />}
              {tab === 'customers' && <CustomersTable rows={rows} onOpen={setSelected} />}
              {tab === 'renewals'  && <RenewalsTable rows={rows} onOpen={setSelected} />}
              {tab === 'lost'      && <LostTable rows={rows} onOpen={setSelected} />}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'add-lead'     && <AddLeadModal    onClose={() => setModal(null)} onSaved={refreshAll} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'add-trial'    && <AddTrialModal   onClose={() => setModal(null)} onSaved={refreshAll} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'add-customer' && <AddCustomerModal onClose={() => setModal(null)} onSaved={refreshAll} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'import'       && <ImportModal     onClose={() => setModal(null)} onImport={handleImport} fileInputRef={fileInputRef} />}
      {modal?.type === 'renew'        && <RenewModal      customer={modal.customer} onClose={() => setModal(null)} onSaved={() => { refreshAll(); setSelected(null); }} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'lost'         && <MarkLostModal   entity={modal.entity} entityType={modal.entityType} onClose={() => setModal(null)} onSaved={() => { refreshAll(); setSelected(null); }} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'convert-trial' && <ConvertTrialModal trial={modal.trial} onClose={() => setModal(null)} onSaved={() => { refreshAll(); setSelected(null); }} getAuthHeaders={getAuthHeaders} />}

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          tab={tab}
          entity={selected}
          onClose={() => setSelected(null)}
          onAction={(action, extra) => {
            if (action === 'convert-lead')     handleConvertLeadToTrial(selected);
            if (action === 'convert-trial')    setModal({ type: 'convert-trial', trial: selected });
            if (action === 'renew')            setModal({ type: 'renew', customer: selected });
            if (action === 'mark-lost')        setModal({ type: 'lost', entity: selected, entityType: extra?.entityType });
          }}
          onSaved={() => { refreshAll(); }}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </AdminLayout>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

const MiniStat = ({ icon: Icon, label, value, accent, active, sub }) => (
  <div className={`bg-white rounded-2xl border p-3 flex items-center gap-3 ${active ? 'border-2 border-[#1E3A5F]' : 'border-slate-100'}`}>
    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
      <Icon className="w-4.5 h-4.5" />
    </div>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-lg font-black text-[#0F1E33] truncate leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    active:             { c: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'ACTIVE' },
    converted:          { c: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'CONVERTED' },
    new:                { c: 'bg-slate-50 text-slate-700 border-slate-200',       label: 'NEW' },
    contacted:          { c: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'CONTACTED' },
    qualified:          { c: 'bg-blue-50 text-blue-700 border-blue-200',          label: 'QUALIFIED' },
    trial_booked:       { c: 'bg-violet-50 text-violet-700 border-violet-200',    label: 'TRIAL BOOKED' },
    trial_lead:         { c: 'bg-slate-50 text-slate-700 border-slate-200',       label: 'LEAD' },
    trial_contacted:    { c: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'CONTACTED' },
    trial_scheduled:    { c: 'bg-violet-50 text-violet-700 border-violet-200',    label: 'SCHEDULED' },
    trial_attended:     { c: 'bg-blue-50 text-blue-700 border-blue-200',          label: 'ATTENDED' },
    lost:               { c: 'bg-rose-50 text-rose-700 border-rose-200',          label: 'LOST' },
    upcoming:           { c: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'UPCOMING' },
    overdue:            { c: 'bg-rose-50 text-rose-700 border-rose-200',          label: 'OVERDUE' },
  };
  const cfg = map[status] || { c: 'bg-slate-50 text-slate-700 border-slate-200', label: (status || '').toUpperCase() || 'LEAD' };
  return <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${cfg.c}`}>{cfg.label}</span>;
};

const Th = ({ children, className = '' }) => (
  <th className={`text-left px-4 py-3 font-bold ${className}`}>{children}</th>
);

// ── Tables ──────────────────────────────────────────────────────────
const LeadsTable = ({ rows, onOpen }) => (
  <table className="w-full text-sm">
    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
      <tr><Th>Ref</Th><Th>Name</Th><Th>Phone · Email</Th><Th>Source · City</Th><Th>Child</Th><Th>Status</Th><Th className="text-right">Created</Th></tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr key={r.id} onClick={() => onOpen(r)}
          className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer"
          data-testid={`row-${r.lead_ref}`}>
          <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F]">{r.lead_ref}</td>
          <td className="px-4 py-3 font-bold text-[#0F1E33]">{r.name}</td>
          <td className="px-4 py-3">
            <div className="text-xs text-slate-700 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {r.phone}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {r.email || '—'}</div>
          </td>
          <td className="px-4 py-3">
            <div className="text-xs font-semibold text-slate-700">{r.source || '—'}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {r.city || '—'}</div>
          </td>
          <td className="px-4 py-3 text-xs text-slate-600">
            {r.child_age && `Age ${r.child_age}`}{r.child_age && r.child_grade && ' · '}{r.child_grade && `Grade ${r.child_grade}`}
            {(!r.child_age && !r.child_grade) && '—'}
          </td>
          <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
          <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtDateTime(r.created_at)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const TrialsTable = ({ rows, onOpen }) => (
  <table className="w-full text-sm">
    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
      <tr><Th>Ref</Th><Th>Student</Th><Th>Parent Contact</Th><Th>Grade · Centre</Th><Th>Status</Th><Th className="text-right">Created</Th></tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr key={r.id} onClick={() => onOpen(r)}
          className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer"
          data-testid={`row-${r.trial_ref}`}>
          <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F]">{r.trial_ref}</td>
          <td className="px-4 py-3 font-bold text-[#0F1E33]">{r.student_name}</td>
          <td className="px-4 py-3">
            <div className="font-semibold text-[#0F1E33] text-xs">{r.parent_name}</div>
            <div className="text-xs text-slate-700 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {r.parent_phone}</div>
          </td>
          <td className="px-4 py-3">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><GraduationCap className="w-3 h-3" /> Grade {r.student_grade || '—'}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {r.assigned_center || r.preferred_center || '—'}</div>
          </td>
          <td className="px-4 py-3"><StatusBadge status={r.crm_status} /></td>
          <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtDateTime(r.created_at)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const CustomersTable = ({ rows, onOpen }) => (
  <table className="w-full text-sm">
    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
      <tr><Th>Ref</Th><Th>Student · Parent</Th><Th>Plan</Th><Th>Amount Paid</Th><Th>Renewal Date</Th><Th className="text-right">Since</Th></tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr key={r.id} onClick={() => onOpen(r)}
          className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer"
          data-testid={`row-${r.subscription_ref}`}>
          <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F]">{r.subscription_ref}</td>
          <td className="px-4 py-3">
            <div className="font-bold text-[#0F1E33]">{r.student_name}</div>
            <div className="text-[11px] text-slate-500">{r.parent_name} · {r.parent_phone}</div>
          </td>
          <td className="px-4 py-3">
            <div className="font-bold text-[#0F1E33] text-xs">{r.plan_label}</div>
            <div className="text-[11px] text-slate-500">{fmtMoney(r.amount)}</div>
          </td>
          <td className="px-4 py-3 font-bold text-emerald-700">{fmtMoney(r.amount_paid || r.amount)}</td>
          <td className="px-4 py-3 text-xs font-semibold text-[#0F1E33]">{fmtDate(r.renewal_date)}</td>
          <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtDate(r.subscription_start || r.created_at)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const RenewalsTable = ({ rows, onOpen }) => (
  <table className="w-full text-sm">
    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
      <tr><Th>Ref</Th><Th>Student · Parent</Th><Th>Plan</Th><Th>Renewal</Th><Th>Status</Th><Th className="text-right">Action</Th></tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr key={r.id} onClick={() => onOpen(r)}
          className={`border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer ${r.renewal_bucket === 'overdue' ? 'bg-rose-50/40' : ''}`}
          data-testid={`row-${r.subscription_ref}`}>
          <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F]">{r.subscription_ref}</td>
          <td className="px-4 py-3">
            <div className="font-bold text-[#0F1E33]">{r.student_name}</div>
            <div className="text-[11px] text-slate-500">{r.parent_name} · {r.parent_phone}</div>
          </td>
          <td className="px-4 py-3 text-xs font-bold text-[#0F1E33]">{r.plan_label}</td>
          <td className="px-4 py-3">
            <div className="text-xs font-semibold text-[#0F1E33]">{fmtDate(r.renewal_date)}</div>
            <div className="text-[11px] text-slate-500">
              {r.renewal_bucket === 'overdue'
                ? `⚠ ${r.days_overdue}d overdue`
                : `in ${r.days_to_renewal ?? 0}d`}
            </div>
          </td>
          <td className="px-4 py-3"><StatusBadge status={r.renewal_bucket} /></td>
          <td className="px-4 py-3 text-right">
            <ChevronRight className="w-4 h-4 text-slate-400 inline" />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const LostTable = ({ rows, onOpen }) => (
  <table className="w-full text-sm">
    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
      <tr><Th>Ref</Th><Th>Name · Contact</Th><Th>Type</Th><Th>Reason</Th><Th className="text-right">Lost At</Th></tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr key={`${r.entity_type}-${r.id}`} onClick={() => onOpen({ ...r, __lost_row: true })}
          className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer"
          data-testid={`row-lost-${r.entity_ref}`}>
          <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F]">{r.entity_ref}</td>
          <td className="px-4 py-3">
            <div className="font-bold text-[#0F1E33]">{r.display_name || '—'}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {r.display_phone || '—'}</div>
          </td>
          <td className="px-4 py-3">
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${
              r.entity_type === 'lead' ? 'bg-slate-50 text-slate-700 border-slate-200'
              : r.entity_type === 'trial' ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>{(r.entity_type || '').toUpperCase()}</span>
          </td>
          <td className="px-4 py-3 text-xs text-slate-700 max-w-md truncate">{r.lost_reason || '—'}</td>
          <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtDateTime(r.lost_at)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

// ── Detail Drawer ─────────────────────────────────────────────────────
const DetailDrawer = ({ tab, entity, onClose, onAction, onSaved, getAuthHeaders }) => {
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({});

  useEffect(() => {
    if (tab === 'leads') {
      setEdit({ name: entity.name, phone: entity.phone, email: entity.email, source: entity.source, city: entity.city, status: entity.status, notes: entity.notes });
    } else if (tab === 'trials') {
      setEdit({ crm_status: entity.crm_status, notes: entity.notes, assigned_center: entity.assigned_center || entity.preferred_center });
    } else if (tab === 'customers') {
      setEdit({ notes: entity.notes, amount_paid: entity.amount_paid, renewal_date: (entity.renewal_date || '').slice(0, 10), plan: entity.plan });
    }
  }, [entity, tab]);

  const save = async () => {
    setSaving(true);
    try {
      if (tab === 'leads') {
        await axios.patch(`${API}/admin/future-skills/leads/${entity.id}`, edit, { headers: getAuthHeaders() });
      } else if (tab === 'trials') {
        await axios.patch(`${API}/admin/future-skills/trials/${entity.id}`, edit, { headers: getAuthHeaders() });
      } else if (tab === 'customers') {
        const payload = { ...edit };
        if (payload.renewal_date) payload.renewal_date = new Date(payload.renewal_date).toISOString();
        await axios.patch(`${API}/admin/future-skills/subscriptions/${entity.id}`, payload, { headers: getAuthHeaders() });
      }
      toast.success('Saved');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const title = tab === 'leads' ? 'Lead' : tab === 'trials' ? 'Free Trial' : tab === 'customers' ? 'Customer' : tab === 'renewals' ? 'Renewal' : 'Lost Record';
  const ref = entity.lead_ref || entity.trial_ref || entity.subscription_ref || entity.entity_ref;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" data-testid="detail-drawer">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#D63031] font-bold">{title}</div>
            <div className="font-mono font-bold text-[#1E3A5F]">{ref}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" data-testid="close-detail-btn">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* LEAD */}
          {tab === 'leads' && (
            <>
              <FieldGroup>
                <TextField label="Name" value={edit.name || ''} onChange={v => setEdit({ ...edit, name: v })} testid="edit-lead-name" />
                <TextField label="Phone" value={edit.phone || ''} onChange={v => setEdit({ ...edit, phone: v })} testid="edit-lead-phone" />
                <TextField label="Email" value={edit.email || ''} onChange={v => setEdit({ ...edit, email: v })} />
                <TextField label="Source" value={edit.source || ''} onChange={v => setEdit({ ...edit, source: v })} />
                <TextField label="City" value={edit.city || ''} onChange={v => setEdit({ ...edit, city: v })} />
                <SelectField label="Status" value={edit.status || 'new'} onChange={v => setEdit({ ...edit, status: v })} options={LEAD_STATUSES} />
              </FieldGroup>
              <TextAreaField label="Notes" value={edit.notes || ''} onChange={v => setEdit({ ...edit, notes: v })} />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => onAction('convert-lead')}
                  className="py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  data-testid="lead-convert-trial-btn">
                  Move to Trial <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onAction('mark-lost', { entityType: 'lead' })}
                  className="py-2.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5"
                  data-testid="lead-mark-lost-btn">
                  <XCircle className="w-3.5 h-3.5" /> Mark Lost
                </button>
              </div>
            </>
          )}

          {/* TRIAL */}
          {tab === 'trials' && (
            <>
              <div>
                <Label>Student</Label>
                <div className="text-lg font-black text-[#0F1E33]">{entity.student_name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Grade {entity.student_grade || '—'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Parent" value={entity.parent_name} />
                <Detail label="Phone" value={entity.parent_phone} />
                <Detail label="Email" value={entity.parent_email} />
                <Detail label="Preferred centre" value={entity.preferred_center || '—'} />
                <Detail label="Scheduled" value={entity.scheduled_at || '—'} />
                <Detail label="Created" value={fmtDateTime(entity.created_at)} />
              </div>
              <SelectField label="CRM Status" value={edit.crm_status || 'trial_lead'} onChange={v => setEdit({ ...edit, crm_status: v })}
                options={[
                  {value:'trial_lead',label:'Lead'},{value:'trial_contacted',label:'Contacted'},
                  {value:'trial_scheduled',label:'Scheduled'},{value:'trial_attended',label:'Attended'},
                  {value:'converted',label:'Converted'},
                ]} />
              <TextField label="Assigned Centre" value={edit.assigned_center || ''} onChange={v => setEdit({ ...edit, assigned_center: v })} />
              <TextAreaField label="Notes" value={edit.notes || ''} onChange={v => setEdit({ ...edit, notes: v })} />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => onAction('convert-trial')}
                  className="py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  data-testid="trial-convert-customer-btn">
                  Convert to Customer <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onAction('mark-lost', { entityType: 'trial' })}
                  className="py-2.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5"
                  data-testid="trial-mark-lost-btn">
                  <XCircle className="w-3.5 h-3.5" /> Mark Lost
                </button>
              </div>
            </>
          )}

          {/* CUSTOMER or RENEWAL */}
          {(tab === 'customers' || tab === 'renewals') && (
            <>
              <div>
                <Label>Student</Label>
                <div className="text-lg font-black text-[#0F1E33]">{entity.student_name}</div>
                <div className="text-xs text-slate-500">Grade {entity.student_grade || '—'} · {entity.parent_name}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Phone" value={entity.parent_phone} />
                <Detail label="Email" value={entity.parent_email} />
                <Detail label="Payment status" value={(entity.payment_status || '').toUpperCase()} />
                <Detail label="Amount paid" value={fmtMoney(entity.amount_paid || entity.amount)} />
              </div>
              <SelectField label="Plan" value={edit.plan || entity.plan || 'monthly'} onChange={v => setEdit({ ...edit, plan: v })} options={PLAN_OPTIONS} />
              <TextField label="Amount Paid (₹)" type="number" value={edit.amount_paid ?? ''} onChange={v => setEdit({ ...edit, amount_paid: parseFloat(v) || 0 })} testid="edit-amount-paid" />
              <TextField label="Renewal Date" type="date" value={edit.renewal_date || ''} onChange={v => setEdit({ ...edit, renewal_date: v })} testid="edit-renewal-date" />
              <TextAreaField label="Notes" value={edit.notes || ''} onChange={v => setEdit({ ...edit, notes: v })} />
              {tab === 'renewals' && entity.renewal_bucket === 'overdue' && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex gap-2 text-xs text-rose-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Renewal was due {entity.days_overdue} day(s) ago. Renew now to keep this customer active.</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => onAction('renew')}
                  className="py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  data-testid="customer-renew-btn">
                  <RotateCcw className="w-3.5 h-3.5" /> Renew
                </button>
                <button onClick={() => onAction('mark-lost', { entityType: 'customer' })}
                  className="py-2.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5"
                  data-testid="customer-mark-lost-btn">
                  <XCircle className="w-3.5 h-3.5" /> Mark Lost
                </button>
              </div>
            </>
          )}

          {/* LOST */}
          {tab === 'lost' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Type" value={(entity.entity_type || '').toUpperCase()} />
                <Detail label="Lost at" value={fmtDateTime(entity.lost_at)} />
                <Detail label="Name" value={entity.display_name || entity.name || entity.student_name} />
                <Detail label="Phone" value={entity.display_phone || entity.phone || entity.parent_phone} />
                <Detail label="Email" value={entity.display_email || entity.email || entity.parent_email} />
                <Detail label="Lost by" value={entity.lost_by || '—'} />
              </div>
              <div>
                <Label>Reason for loss</Label>
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
                  {entity.lost_reason || '—'}
                </div>
              </div>
            </>
          )}

          {/* Save button (not shown for Lost) */}
          {tab !== 'lost' && (
            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D63031] to-[#1E3A5F] text-white font-bold hover:from-[#B52828] hover:to-[#0F1E33] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              data-testid="save-detail-btn">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save changes</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Form Field Primitives ─────────────────────────────────────────────
const Label = ({ children }) => <label className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-1.5 block">{children}</label>;
const Detail = ({ label, value }) => (
  <div>
    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
    <div className="text-sm text-[#0F1E33] font-semibold break-all">{value || '—'}</div>
  </div>
);
const FieldGroup = ({ children }) => <div className="grid grid-cols-2 gap-3">{children}</div>;

const TextField = ({ label, value, onChange, type = 'text', placeholder, testid, required, colSpan }) => (
  <div className={colSpan === 2 ? 'col-span-2' : ''}>
    <Label>{label}{required && <span className="text-rose-500">*</span>}</Label>
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
      data-testid={testid} />
  </div>
);
const TextAreaField = ({ label, value, onChange, testid }) => (
  <div>
    <Label>{label}</Label>
    <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={3}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
      data-testid={testid} />
  </div>
);
const SelectField = ({ label, value, onChange, options, testid, colSpan }) => (
  <div className={colSpan === 2 ? 'col-span-2' : ''}>
    <Label>{label}</Label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
      data-testid={testid}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ── Modal Wrapper ─────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, testid }) => (
  <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" data-testid={testid}>
      <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
        <div className="font-black text-[#1E3A5F]">{title}</div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" data-testid="modal-close-btn">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ── Modals ────────────────────────────────────────────────────────────
const AddLeadModal = ({ onClose, onSaved, getAuthHeaders }) => {
  const [f, setF] = useState({ name: '', phone: '', email: '', source: '', city: '', child_age: '', child_grade: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!f.name || !f.phone) { toast.error('Name and phone required'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/future-skills/leads`, f, { headers: getAuthHeaders() });
      toast.success('Lead added');
      onSaved(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };
  return (
    <Modal title="Add Lead" onClose={onClose} testid="add-lead-modal">
      <FieldGroup>
        <TextField label="Name" value={f.name} onChange={v => setF({ ...f, name: v })} required testid="lead-name-input" />
        <TextField label="Phone" value={f.phone} onChange={v => setF({ ...f, phone: v })} required testid="lead-phone-input" />
        <TextField label="Email" value={f.email} onChange={v => setF({ ...f, email: v })} />
        <TextField label="Source" value={f.source} onChange={v => setF({ ...f, source: v })} placeholder="e.g. Instagram, Referral" />
        <TextField label="City" value={f.city} onChange={v => setF({ ...f, city: v })} />
        <TextField label="Child Age" value={f.child_age} onChange={v => setF({ ...f, child_age: v })} />
        <TextField label="Child Grade" value={f.child_grade} onChange={v => setF({ ...f, child_grade: v })} colSpan={2} />
      </FieldGroup>
      <div className="mt-3"><TextAreaField label="Notes" value={f.notes} onChange={v => setF({ ...f, notes: v })} /></div>
      <button onClick={submit} disabled={saving}
        className="mt-4 w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-add-lead-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Lead</>}
      </button>
    </Modal>
  );
};

const AddTrialModal = ({ onClose, onSaved, getAuthHeaders }) => {
  const [f, setF] = useState({ parent_name: '', parent_phone: '', parent_email: '', student_name: '', student_grade: '', preferred_center: '', preferred_skill: '', scheduled_at: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!f.parent_name || !f.parent_phone || !f.student_name) { toast.error('Parent name, phone and student name required'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/future-skills/trials`, f, { headers: getAuthHeaders() });
      toast.success('Trial booking added');
      onSaved(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };
  return (
    <Modal title="Add Free Trial" onClose={onClose} testid="add-trial-modal">
      <FieldGroup>
        <TextField label="Student Name" value={f.student_name} onChange={v => setF({ ...f, student_name: v })} required testid="trial-student-input" />
        <TextField label="Grade" value={f.student_grade} onChange={v => setF({ ...f, student_grade: v })} />
        <TextField label="Parent Name" value={f.parent_name} onChange={v => setF({ ...f, parent_name: v })} required testid="trial-parent-input" />
        <TextField label="Parent Phone" value={f.parent_phone} onChange={v => setF({ ...f, parent_phone: v })} required testid="trial-phone-input" />
        <TextField label="Email" value={f.parent_email} onChange={v => setF({ ...f, parent_email: v })} colSpan={2} />
        <TextField label="Preferred Skill" value={f.preferred_skill} onChange={v => setF({ ...f, preferred_skill: v })} placeholder="e.g. Robotics" />
        <TextField label="Preferred Centre" value={f.preferred_center} onChange={v => setF({ ...f, preferred_center: v })} />
        <TextField label="Scheduled At" value={f.scheduled_at} onChange={v => setF({ ...f, scheduled_at: v })} placeholder="e.g. 2026-03-01 10:00 AM" colSpan={2} />
      </FieldGroup>
      <div className="mt-3"><TextAreaField label="Notes" value={f.notes} onChange={v => setF({ ...f, notes: v })} /></div>
      <button onClick={submit} disabled={saving}
        className="mt-4 w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-add-trial-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Trial</>}
      </button>
    </Modal>
  );
};

const AddCustomerModal = ({ onClose, onSaved, getAuthHeaders }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ parent_name: '', parent_phone: '', parent_email: '', student_name: '', student_grade: '', plan: 'monthly', amount_paid: 2000, payment_date: today, renewal_date: '', preferred_center: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const onPlanChange = (plan) => {
    const p = PLAN_OPTIONS.find(x => x.value === plan);
    setF(prev => ({ ...prev, plan, amount_paid: p?.defaultAmount || prev.amount_paid }));
  };

  const submit = async () => {
    if (!f.parent_name || !f.parent_phone || !f.student_name) { toast.error('Parent name, phone and student name required'); return; }
    if (!(f.amount_paid > 0)) { toast.error('Enter amount paid'); return; }
    setSaving(true);
    try {
      const payload = { ...f };
      if (payload.payment_date) payload.payment_date = new Date(payload.payment_date).toISOString();
      if (payload.renewal_date) payload.renewal_date = new Date(payload.renewal_date).toISOString();
      else delete payload.renewal_date;
      await axios.post(`${API}/admin/future-skills/customers`, payload, { headers: getAuthHeaders() });
      toast.success('Customer added');
      onSaved(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Customer" onClose={onClose} testid="add-customer-modal">
      <FieldGroup>
        <TextField label="Student Name" value={f.student_name} onChange={v => setF({ ...f, student_name: v })} required testid="cust-student-input" />
        <TextField label="Grade" value={f.student_grade} onChange={v => setF({ ...f, student_grade: v })} />
        <TextField label="Parent Name" value={f.parent_name} onChange={v => setF({ ...f, parent_name: v })} required testid="cust-parent-input" />
        <TextField label="Parent Phone" value={f.parent_phone} onChange={v => setF({ ...f, parent_phone: v })} required testid="cust-phone-input" />
        <TextField label="Email" value={f.parent_email} onChange={v => setF({ ...f, parent_email: v })} colSpan={2} />
        <SelectField label="Plan" value={f.plan} onChange={onPlanChange} options={PLAN_OPTIONS} testid="cust-plan-select" />
        <TextField label="Amount Paid (₹)" type="number" value={f.amount_paid} onChange={v => setF({ ...f, amount_paid: parseFloat(v) || 0 })} required testid="cust-amount-input" />
        <TextField label="Payment Date" type="date" value={f.payment_date} onChange={v => setF({ ...f, payment_date: v })} />
        <TextField label="Renewal Date (auto if empty)" type="date" value={f.renewal_date} onChange={v => setF({ ...f, renewal_date: v })} testid="cust-renewal-input" />
        <TextField label="Preferred Centre" value={f.preferred_center} onChange={v => setF({ ...f, preferred_center: v })} colSpan={2} />
      </FieldGroup>
      <div className="mt-3"><TextAreaField label="Notes" value={f.notes} onChange={v => setF({ ...f, notes: v })} /></div>
      <button onClick={submit} disabled={saving}
        className="mt-4 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-add-customer-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Customer</>}
      </button>
    </Modal>
  );
};

const ImportModal = ({ onClose, onImport, fileInputRef }) => {
  const downloadSample = () => {
    const csv = 'name,phone,email,source,city,child_age,child_grade,notes\nRahul Sharma,9812345678,rahul@x.com,Instagram,Mumbai,10,5,Interested in AI\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'future-skills-leads-sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Modal title="Import Leads (CSV / Excel)" onClose={onClose} testid="import-modal">
      <p className="text-sm text-slate-600 mb-3">Upload a <strong>.csv</strong>, <strong>.xlsx</strong> or <strong>.xls</strong> file with lead data. Duplicates (by phone) will be skipped.</p>
      <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-600">
        <div className="font-bold mb-1">Supported columns:</div>
        <div className="font-mono">name*, phone*, email, source, city, child_age, child_grade, notes</div>
        <div className="mt-1 text-slate-500">* required</div>
      </div>
      <button onClick={downloadSample}
        className="mb-3 text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
        data-testid="download-sample-btn">
        <Download className="w-3.5 h-3.5" /> Download sample CSV
      </button>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { onImport(f); onClose(); } }}
        className="w-full text-sm border border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-blue-400"
        data-testid="import-file-input" />
    </Modal>
  );
};

const RenewModal = ({ customer, onClose, onSaved, getAuthHeaders }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    plan: customer.plan || 'monthly',
    amount_paid: customer.amount || 2000,
    payment_date: today,
    renewal_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const onPlanChange = (plan) => {
    const p = PLAN_OPTIONS.find(x => x.value === plan);
    setF(prev => ({ ...prev, plan, amount_paid: p?.defaultAmount || prev.amount_paid }));
  };

  const submit = async () => {
    if (!(f.amount_paid > 0)) { toast.error('Enter amount paid'); return; }
    setSaving(true);
    try {
      const payload = { ...f };
      if (payload.payment_date) payload.payment_date = new Date(payload.payment_date).toISOString();
      if (payload.renewal_date) payload.renewal_date = new Date(payload.renewal_date).toISOString();
      else delete payload.renewal_date;
      await axios.post(`${API}/admin/future-skills/customers/${customer.id}/renew`, payload, { headers: getAuthHeaders() });
      toast.success('Customer renewed');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`Renew ${customer.student_name || customer.subscription_ref}`} onClose={onClose} testid="renew-modal">
      <div className="text-xs text-slate-500 mb-3">Current renewal date: <span className="font-bold text-[#0F1E33]">{fmtDate(customer.renewal_date)}</span></div>
      <FieldGroup>
        <SelectField label="Plan" value={f.plan} onChange={onPlanChange} options={PLAN_OPTIONS} testid="renew-plan-select" />
        <TextField label="Amount Paid (₹)" type="number" value={f.amount_paid} onChange={v => setF({ ...f, amount_paid: parseFloat(v) || 0 })} required testid="renew-amount-input" />
        <TextField label="Payment Date" type="date" value={f.payment_date} onChange={v => setF({ ...f, payment_date: v })} />
        <TextField label="New Renewal Date (auto if empty)" type="date" value={f.renewal_date} onChange={v => setF({ ...f, renewal_date: v })} testid="renew-renewal-input" />
      </FieldGroup>
      <div className="mt-3"><TextAreaField label="Notes" value={f.notes} onChange={v => setF({ ...f, notes: v })} /></div>
      <button onClick={submit} disabled={saving}
        className="mt-4 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-renew-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><RotateCcw className="w-4 h-4" /> Confirm Renewal</>}
      </button>
    </Modal>
  );
};

const MarkLostModal = ({ entity, entityType, onClose, onSaved, getAuthHeaders }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }
    setSaving(true);
    try {
      let path = '';
      if (entityType === 'lead')     path = `leads/${entity.id}/mark-lost`;
      if (entityType === 'trial')    path = `trials/${entity.id}/mark-lost`;
      if (entityType === 'customer') path = `customers/${entity.id}/mark-lost`;
      await axios.post(`${API}/admin/future-skills/${path}`, { reason: reason.trim() }, { headers: getAuthHeaders() });
      toast.success('Marked as lost');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  const displayName = entity.name || entity.student_name || entity.parent_name || entity.lead_ref || entity.trial_ref || entity.subscription_ref;

  return (
    <Modal title={`Mark as Lost — ${displayName}`} onClose={onClose} testid="mark-lost-modal">
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-4 flex gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <div>This entry will move to the Lost tab. You can still see it and its history there.</div>
      </div>
      <TextAreaField label="Reason for loss (required)" value={reason} onChange={setReason} testid="lost-reason-input" />
      <button onClick={submit} disabled={saving}
        className="mt-4 w-full py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-lost-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><XCircle className="w-4 h-4" /> Confirm Lost</>}
      </button>
    </Modal>
  );
};

const ConvertTrialModal = ({ trial, onClose, onSaved, getAuthHeaders }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ plan: 'monthly', amount_paid: 2000, payment_date: today, renewal_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const onPlanChange = (plan) => {
    const p = PLAN_OPTIONS.find(x => x.value === plan);
    setF(prev => ({ ...prev, plan, amount_paid: p?.defaultAmount || prev.amount_paid }));
  };

  const submit = async () => {
    if (!(f.amount_paid > 0)) { toast.error('Enter amount paid'); return; }
    setSaving(true);
    try {
      const payload = { ...f };
      if (payload.payment_date) payload.payment_date = new Date(payload.payment_date).toISOString();
      if (payload.renewal_date) payload.renewal_date = new Date(payload.renewal_date).toISOString();
      else delete payload.renewal_date;
      await axios.post(`${API}/admin/future-skills/trials/${trial.id}/convert-to-customer`, payload, { headers: getAuthHeaders() });
      toast.success('Trial converted to customer');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`Convert ${trial.student_name || trial.trial_ref} to Customer`} onClose={onClose} testid="convert-trial-modal">
      <FieldGroup>
        <SelectField label="Plan" value={f.plan} onChange={onPlanChange} options={PLAN_OPTIONS} testid="convert-plan-select" />
        <TextField label="Amount Paid (₹)" type="number" value={f.amount_paid} onChange={v => setF({ ...f, amount_paid: parseFloat(v) || 0 })} required testid="convert-amount-input" />
        <TextField label="Payment Date" type="date" value={f.payment_date} onChange={v => setF({ ...f, payment_date: v })} />
        <TextField label="Renewal Date (auto if empty)" type="date" value={f.renewal_date} onChange={v => setF({ ...f, renewal_date: v })} />
      </FieldGroup>
      <div className="mt-3"><TextAreaField label="Notes" value={f.notes} onChange={v => setF({ ...f, notes: v })} /></div>
      <button onClick={submit} disabled={saving}
        className="mt-4 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-convert-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Sparkles className="w-4 h-4" /> Convert to Customer</>}
      </button>
    </Modal>
  );
};

export default AdminFutureSkills;
