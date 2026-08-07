import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Bot, Search, RefreshCw, Loader2, X, Phone, Mail, GraduationCap,
  TrendingUp, Users, IndianRupee, Calendar, MapPin, ExternalLink, Save, Sparkles,
  Plus, Upload, Download, AlertTriangle, XCircle, RotateCcw, ChevronRight,
  Clock, Building2, Trash2, Pencil, Power, BarChart3, PieChart, Target,
  Link2 as LinkIcon, Copy, Eye, FileText, UserX, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import SortFilterBar, { applySortFilter } from '../../components/SortFilterBar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { key: 'leads',           label: 'Leads',            icon: Users },
  { key: 'trials',          label: 'Free Trials',      icon: Calendar },
  { key: 'customers',       label: 'Active Customers', icon: Sparkles },
  { key: 'renewals',        label: 'Renewals',         icon: RotateCcw },
  { key: 'lost',            label: 'Lost',             icon: XCircle },
  { key: 'centers',         label: 'Centres & Batches', icon: MapPin },
  { key: 'batch_requests',  label: 'Batch Requests',   icon: Clock },
  { key: 'sources',         label: 'Source Links',     icon: LinkIcon },
  { key: 'economics',       label: 'Centre Economics', icon: IndianRupee },
  { key: 'reports',         label: 'Reports',          icon: BarChart3 },
];

const AGE_GROUP_OPTIONS = [
  { value: '',      label: 'Any age' },
  { value: '3-7',   label: '3 – 7 years' },
  { value: '8-11',  label: '8 – 11 years' },
  { value: '12-16', label: '12 – 16 years' },
];

const LEAD_SOURCE_OPTIONS = [
  { value: '',            label: 'Select source…' },
  { value: 'Instagram',   label: 'Instagram' },
  { value: 'Facebook',    label: 'Facebook' },
  { value: 'Website',     label: 'Website' },
  { value: 'Referral',    label: 'Referral' },
  { value: 'Walk-in',     label: 'Walk-in' },
  { value: 'Whatsapp',    label: 'Whatsapp' },
  { value: 'Google',      label: 'Google Search' },
  { value: 'Cold Call',   label: 'Cold Call' },
  { value: 'Event',       label: 'Event / Camp' },
  { value: 'Other',       label: 'Other' },
];

const PAYMENT_MODES = [
  { value: '',              label: 'Select mode…' },
  { value: 'cash',          label: 'Cash' },
  { value: 'upi',           label: 'UPI' },
  { value: 'card',          label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

const PAYMENT_STATUSES = [
  { value: 'paid',     label: 'Paid' },
  { value: 'partial',  label: 'Partial' },
  { value: 'pending',  label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
];

const FOLLOWUP_OUTCOMES = [
  { value: '',                  label: 'Select outcome…' },
  { value: 'called',            label: 'Called' },
  { value: 'no_answer',         label: 'No Answer' },
  { value: 'incorrect_number',  label: 'Incorrect Number' },
  { value: 'interested',        label: 'Interested' },
  { value: 'not_interested',    label: 'Not Interested (mark Lost)' },
];

const LEVEL_OPTIONS = [
  { value: '',            label: 'Any level' },
  { value: 'beginner',    label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',    label: 'Advanced' },
];

const LEAD_STATUSES = [
  { value: 'new',              label: 'New' },
  { value: 'followup',         label: 'Follow-up' },
  { value: 'no_answer',        label: 'No Answer' },
  { value: 'incorrect_number', label: 'Incorrect Number' },
];

const PLAN_OPTIONS = [
  { value: 'monthly',     label: 'Monthly',     defaultAmount: 2000 },
  { value: 'half_yearly', label: 'Half Yearly', defaultAmount: 11000 },
  { value: 'yearly',      label: 'Annual',      defaultAmount: 21000 },
];

const fmtMoney = (v) => `₹${(v || 0).toLocaleString('en-IN')}`;
const fmtDate  = (s) => { try { return s ? format(parseISO(s), 'MMM d, yyyy') : '—'; } catch { return '—'; } };
const fmtDateTime = (s) => { try { return s ? format(parseISO(s), 'MMM d · h:mm a') : '—'; } catch { return '—'; } };
// Convert "HH:MM" 24h → "h:MM AM/PM" 12h for batch time display.
const to12h = (t) => {
  if (!t) return '';
  const [hStr, mStr = '00'] = String(t).split(':');
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${mStr.padStart(2, '0')} ${period}`;
};
const timeRange = (s, e) => `${to12h(s) || '—'} – ${to12h(e) || '—'}`;

const AdminFutureSkills = () => {
  const { getAuthHeaders, user } = useAuth();
  const isCenterOwner = user?.role === 'fs_center_owner';
  const [tab, setTab] = useState('leads');
  const [renewalBucket, setRenewalBucket] = useState('all');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [tabStats, setTabStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [centerFilter, setCenterFilter] = useState('all');   // centre filter (admin only)
  const [centersForFilter, setCentersForFilter] = useState([]);  // for filter dropdown
  const [batchesForFilter, setBatchesForFilter] = useState([]);  // for centre/batch column rendering
  const [leadSources, setLeadSources] = useState([]);            // managed sources from server
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());   // bulk selection (leads tab)
  const [modal, setModal] = useState(null); // 'add-lead' | 'add-trial' | 'add-customer' | 'import' | 'renew' | 'lost' | 'convert-trial' | 'reschedule' | 'book-trial' | 'followup'
  // Sort + date-range filter — applied client-side across every tab that shows a list.
  const [sortKey, setSortKey] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const fileInputRef = useRef(null);

  // Load centres list once for the filter dropdown (admin only — owner is auto-scoped)
  useEffect(() => {
    if (isCenterOwner) return;
    axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() })
      .then(r => setCentersForFilter(r.data?.centers || []))
      .catch(() => setCentersForFilter([]));
  }, [isCenterOwner, getAuthHeaders]);

  // Load batches for centre/batch column rendering (all rows)
  useEffect(() => {
    axios.get(`${API}/admin/future-skills/batches`, { headers: getAuthHeaders() })
      .then(r => setBatchesForFilter(r.data?.batches || []))
      .catch(() => setBatchesForFilter([]));
  }, [getAuthHeaders]);

  // Load managed lead sources so admins can add new ones directly.
  const reloadSources = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/admin/future-skills/lead-sources`, { headers: getAuthHeaders() });
      setLeadSources(r.data?.sources || []);
    } catch { setLeadSources([]); }
  }, [getAuthHeaders]);
  useEffect(() => { reloadSources(); }, [reloadSources]);

  // ── Fetchers ─────────────────────────────────────────────────────────
  const fetchTabStats = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/admin/future-skills/stats`, { headers: getAuthHeaders() });
      setTabStats(r.data || null);
    } catch (_) { /* ignore */ }
  }, [getAuthHeaders]);

  const fetchData = useCallback(async () => {
    if (tab === 'centers' || tab === 'reports' || tab === 'sources' || tab === 'economics' || tab === 'batch_requests') { setRows([]); setStats(null); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (centerFilter && centerFilter !== 'all') params.set('center_id', centerFilter);
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
  }, [tab, statusFilter, search, renewalBucket, centerFilter, getAuthHeaders]);

  useEffect(() => { fetchData(); fetchTabStats(); }, [fetchData, fetchTabStats]);

  // Client-side sort A→Z / date range applied on top of the fetched rows.
  // Different tabs use different name fields, so we cover all common ones.
  const filteredRows = useMemo(() => {
    return applySortFilter(rows, sortKey, dateFrom, dateTo, {
      nameFields: ['child_name', 'student_name', 'name', 'parent_name'],
      dateFields: ['created_at', 'trial_date', 'renewal_date', 'due_date'],
    });
  }, [rows, sortKey, dateFrom, dateTo]);

  // Reset sort/date filter whenever the tab or status changes so users start clean.
  useEffect(() => { setSortKey(''); setDateFrom(''); setDateTo(''); }, [tab, statusFilter]);

  // Clear bulk-selection whenever the underlying tab or filters change.
  useEffect(() => { setSelectedIds(new Set()); }, [tab, statusFilter, search, centerFilter, renewalBucket]);

  const refreshAll = () => { fetchData(); fetchTabStats(); setSelectedIds(new Set()); };

  const toggleLeadSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllLeads = (allIds) => {
    setSelectedIds(prev => {
      // If every row is already selected, clear; otherwise select all.
      const allSelected = allIds.length > 0 && allIds.every(id => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  };
  const bulkDeleteLeads = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} lead${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    try {
      const r = await axios.post(`${API}/admin/future-skills/leads/bulk-delete`, { ids }, { headers: getAuthHeaders() });
      toast.success(`Deleted ${r.data?.deleted ?? ids.length} lead${(r.data?.deleted ?? ids.length) === 1 ? '' : 's'}`);
      refreshAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Bulk delete failed');
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────
  const handleImport = async (file, defaults = {}) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    if (defaults.default_center_id) fd.append('default_center_id', defaults.default_center_id);
    if (defaults.default_age_group) fd.append('default_age_group', defaults.default_age_group);
    if (defaults.default_source)    fd.append('default_source',    defaults.default_source);
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

  /**
   * Inline notes save — called by <InlineNotesField /> when the user tabs
   * away or hits Cmd/Ctrl+Enter. Uses the same PATCH endpoint that the
   * side-drawer save uses.
   */
  const handleInlineNotesSave = useCallback(async (lead, nextNotes) => {
    try {
      await axios.patch(
        `${API}/admin/future-skills/leads/${lead.id}`,
        { notes: nextNotes },
        { headers: getAuthHeaders() },
      );
      refreshAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not save notes');
    }
  }, [getAuthHeaders, refreshAll]);

  // ── Rendering per tab ────────────────────────────────────────────────
  const STATUS_FILTER_OPTIONS =
    tab === 'leads'   ? [
        { value: 'all',              label: `All (${(stats?.new || 0) + (stats?.followup || 0) + (stats?.no_answer || 0) + (stats?.incorrect_number || 0)})` },
        { value: 'new',              label: `New (${stats?.new || 0})` },
        { value: 'followup',         label: `Follow-up (${stats?.followup || 0})` },
        { value: 'no_answer',        label: `No Answer (${stats?.no_answer || 0})` },
        { value: 'incorrect_number', label: `Wrong Number (${stats?.incorrect_number || 0})` },
      ]
    : tab === 'trials' ? [
        { value: 'all',         label: `All (${(stats?.scheduled || 0) + (stats?.rescheduled || 0) + (stats?.completed || 0)})` },
        { value: 'scheduled',   label: `Scheduled (${stats?.scheduled || 0})` },
        { value: 'rescheduled', label: `Rescheduled (${stats?.rescheduled || 0})` },
        { value: 'completed',   label: `Completed (${stats?.completed || 0})` },
      ]
    : tab === 'lost' ? [
        { value: 'all', label: 'All types' },
        { value: 'lead', label: 'Leads' },
        { value: 'trial', label: 'Trials' },
        { value: 'customer', label: 'Customers' },
      ]
    : null;

  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';
  const userPerms = user?.permissions || [];
  // KPI cards on the Reports tab used to be gated by granular future_skills.kpi.*
  // permissions, but those have moved to the Performance KPIs section (assign a
  // KPI to a role from Users & Roles instead). Anyone with future_skills access
  // now sees all cards on the CRM Reports tab.
  const kpi = {
    leads: true, lead_to_trial: true, trial_to_paid: true,
    revenue: true, aov: true, profit_margin: true,
  };
  // Centre Economics gate: admins, centre owners, or holders of the
  // dedicated sub-permission.
  const canSeeEconomics = isAdminRole || isCenterOwner || userPerms.includes('future_skills.economics');

  // If the tab was auto-set to something the user can't see, bounce them home.
  useEffect(() => {
    if (tab === 'economics' && !canSeeEconomics) {
      setTab('leads');
    }
  }, [tab, canSeeEconomics]);

  return (
    <AdminLayout title="Future Skills CRM">
      <div className="-mt-4 sm:-mt-5 p-3 sm:p-4 max-w-7xl mx-auto space-y-3" data-testid="admin-future-skills">
        {/* Scope banner for centre owners */}
        {isCenterOwner && (
          <div className="bg-blue-50 border-2 border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm" data-testid="scope-banner">
            <MapPin className="w-4 h-4 text-[#1E3A5F]" />
            <span className="text-slate-700">You&apos;re viewing data for</span>
            <span className="font-bold text-[#0F1E33]">{user?.center_name || 'your centre'}</span>
          </div>
        )}

        {/* Tabs (horizontally scrollable on mobile so they never wrap) */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
            {TABS.filter(t => {
              if (isCenterOwner && (t.key === 'centers' || t.key === 'sources')) return false;
              if (t.key === 'economics' && !canSeeEconomics) return false;
              return true;
            }).map(t => {
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
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
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
        </div>

        {/* Toolbar (hidden for Centres / Reports / Sources / Economics tabs) */}
        {tab !== 'centers' && tab !== 'reports' && tab !== 'sources' && tab !== 'economics' && (
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
            <>
              <button onClick={() => setModal({ type: 'add-customer' })}
                className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center gap-1.5"
                data-testid="add-customer-btn">
                <Plus className="w-3.5 h-3.5" /> Add Customer
              </button>
              <button onClick={() => setModal({ type: 'import-customers' })}
                className="text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                data-testid="import-customers-btn">
                <Upload className="w-3.5 h-3.5" /> Import CSV / Excel
              </button>
            </>
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

          {/* Centre filter — admin only (owners are auto-scoped) */}
          {!isCenterOwner && (
            <select value={centerFilter} onChange={e => setCenterFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="filter-center">
              <option value="all">All Centres</option>
              {centersForFilter.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Search */}
          <div className="ml-auto relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search ref / name / phone…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="search-input" />
          </div>
        </div>
        )}

        {/* Sub-status chip filter — Leads tab only. Same source as the dropdown
            above but rendered as always-visible chips (with live counts) so
            admins can slice the pipeline in one click. */}
        {tab === 'leads' && STATUS_FILTER_OPTIONS && (
          <div className="bg-white rounded-2xl border border-slate-100 px-3 py-2 flex flex-wrap items-center gap-2" data-testid="lead-status-chips">
            <span className="text-xs text-slate-500 font-semibold mr-1">Status:</span>
            {STATUS_FILTER_OPTIONS.map(opt => {
              const active = statusFilter === opt.value;
              const chipColor = {
                'all':              active ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'   : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400',
                'new':              active ? 'bg-slate-700 text-white border-slate-700'    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400',
                'followup':         active ? 'bg-amber-500 text-white border-amber-500'    : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400',
                'no_answer':        active ? 'bg-orange-500 text-white border-orange-500'  : 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400',
                'incorrect_number': active ? 'bg-purple-600 text-white border-purple-600'  : 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400',
              }[opt.value] || 'bg-white text-slate-700 border-slate-200';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold border transition-colors ${chipColor}`}
                  data-testid={`lead-status-chip-${opt.value}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Sort + date-range filter — visible on every list tab (Leads · Trials · Customers · Renewals · Lost) */}
        {['leads', 'trials', 'customers', 'renewals', 'lost'].includes(tab) && (
          <div className="bg-white rounded-2xl border border-slate-100 px-3 py-2 flex flex-wrap items-center gap-2" data-testid="fs-sort-filter">
            <span className="text-xs text-slate-500 font-semibold">Sort & Date:</span>
            <SortFilterBar
              sort={sortKey}
              onSortChange={setSortKey}
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
              testIdPrefix="fs"
              compact
            />
            <span className="ml-auto text-xs text-slate-400">{filteredRows.length} of {rows.length} shown</span>
          </div>
        )}

        {/* Content: Reports OR Centers manager OR Sources OR Economics OR standard table */}
        {tab === 'reports' ? (
          <ReportsPanel getAuthHeaders={getAuthHeaders} kpi={kpi} />
        ) : tab === 'centers' ? (
          <CentersManager getAuthHeaders={getAuthHeaders} />
        ) : tab === 'sources' ? (
          <SourceLinksPanel getAuthHeaders={getAuthHeaders} />
        ) : tab === 'economics' ? (
          <CentreEconomicsPanel getAuthHeaders={getAuthHeaders} />
        ) : tab === 'batch_requests' ? (
          <BatchRequestsPanel getAuthHeaders={getAuthHeaders} />
        ) : (
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
              {tab === 'leads' && selectedIds.size > 0 && (
                <div className="mb-2 flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100" data-testid="leads-bulk-bar">
                  <div className="text-xs font-bold text-[#1E3A5F]" data-testid="leads-bulk-count">
                    {selectedIds.size} selected
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedIds(new Set())}
                      className="text-xs px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700"
                      data-testid="leads-bulk-clear">
                      Clear
                    </button>
                    <button onClick={bulkDeleteLeads}
                      className="text-xs px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5"
                      data-testid="leads-bulk-delete">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              )}
              {tab === 'leads'     && <LeadsTable rows={filteredRows} onOpen={setSelected} centers={centersForFilter} batches={batchesForFilter}
                selectedIds={selectedIds} onToggleSelect={toggleLeadSelection} onToggleSelectAll={toggleSelectAllLeads}
                onSaveNotes={handleInlineNotesSave}
                onAction={(action, r) => {
                if (action === 'book-trial') setModal({ type: 'book-trial', lead: r });
                if (action === 'followup')   setModal({ type: 'followup', entity: r, entityType: 'lead' });
                if (action === 'notes')      setModal({ type: 'notes', entity: r, entityType: 'lead' });
                if (action === 'mark-lost')  setModal({ type: 'lost', entity: r, entityType: 'lead' });
                if (action === 'delete')     setModal({ type: 'delete', entity: r, entityType: 'lead' });
              }} />}
              {tab === 'trials'    && <TrialsTable rows={filteredRows} onOpen={setSelected} centers={centersForFilter} batches={batchesForFilter} onAction={async (action, r) => {
                if (action === 'convert')      setModal({ type: 'convert-trial', trial: r });
                if (action === 'reschedule')   setModal({ type: 'reschedule', trial: r });
                if (action === 'followup')     setModal({ type: 'followup', entity: r, entityType: 'trial' });
                if (action === 'notes')        setModal({ type: 'notes', entity: r, entityType: 'trial' });
                if (action === 'mark-lost')    setModal({ type: 'lost', entity: r, entityType: 'trial' });
                if (action === 'delete')       setModal({ type: 'delete', entity: r, entityType: 'trial' });
                if (action === 'payment-link') setModal({ type: 'payment-link', trial: r });
                if (action === 'attended') {
                  try {
                    await axios.post(`${API}/admin/future-skills/trials/${r.id}/attend`, {}, { headers: getAuthHeaders() });
                    toast.success(`${r.student_name || r.trial_ref} marked attended`);
                    refreshAll();
                  } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
                }
              }} />}
              {tab === 'customers' && <CustomersTable rows={filteredRows} onOpen={setSelected} centers={centersForFilter} batches={batchesForFilter} onAction={(action, r) => {
                if (action === 'renew')      setModal({ type: 'renew', customer: r });
                if (action === 'notes')      setModal({ type: 'notes', entity: r, entityType: 'customer' });
                if (action === 'mark-lost')  setModal({ type: 'lost', entity: r, entityType: 'customer' });
                if (action === 'delete')     setModal({ type: 'delete', entity: r, entityType: 'customer' });
              }} />}
              {tab === 'renewals'  && <RenewalsTable  rows={filteredRows} onOpen={setSelected} centers={centersForFilter} batches={batchesForFilter} onAction={(action, r) => {
                if (action === 'renew')        setModal({ type: 'renew', customer: r });
                if (action === 'followup')     setModal({ type: 'followup', entity: r, entityType: 'customer' });
                if (action === 'notes')        setModal({ type: 'notes', entity: r, entityType: 'customer' });
                if (action === 'mark-lost')    setModal({ type: 'lost', entity: r, entityType: 'customer' });
                if (action === 'delete')       setModal({ type: 'delete', entity: r, entityType: 'customer' });
                if (action === 'payment-link') setModal({ type: 'payment-link', customer: r });
              }} />}
              {tab === 'lost'      && <LostTable rows={filteredRows} onOpen={setSelected} />}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'add-lead'     && <AddLeadModal    onClose={() => setModal(null)} onSaved={refreshAll} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'add-trial'    && <AddTrialModal   onClose={() => setModal(null)} onSaved={refreshAll} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'add-customer' && <AddCustomerModal onClose={() => setModal(null)} onSaved={refreshAll} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'import'       && <ImportModal     onClose={() => setModal(null)} onImport={handleImport} fileInputRef={fileInputRef} centers={centersForFilter} sources={leadSources} onSourceAdded={reloadSources} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'import-customers' && <ImportCustomersModal onClose={() => setModal(null)} onImported={refreshAll} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'renew'        && <RenewModal      customer={modal.customer} onClose={() => setModal(null)} onSaved={() => { refreshAll(); setSelected(null); }} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'lost'         && <MarkLostModal   entity={modal.entity} entityType={modal.entityType} onClose={() => setModal(null)} onSaved={() => { refreshAll(); setSelected(null); }} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'convert-trial' && <ConvertTrialModal trial={modal.trial} onClose={() => setModal(null)} onSaved={() => { refreshAll(); setSelected(null); }} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'reschedule'   && <RescheduleTrialModal trial={modal.trial} onClose={() => setModal(null)} onSaved={() => { setModal(null); refreshAll(); setSelected(null); }} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'book-trial'   && <BookTrialModal   lead={modal.lead} onClose={() => setModal(null)} onSaved={() => { setModal(null); refreshAll(); setSelected(null); }} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'payment-link' && <PaymentLinkModal
        trial={modal.trial}
        customer={modal.customer}
        onClose={() => setModal(null)}
        getAuthHeaders={getAuthHeaders}
      />}
      {modal?.type === 'followup'     && <FollowupModal    entity={modal.entity} entityType={modal.entityType} onClose={() => setModal(null)} onSaved={() => { setModal(null); refreshAll(); }} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'notes'        && <NotesModal       entity={modal.entity} entityType={modal.entityType} onClose={() => setModal(null)} onSaved={() => { refreshAll(); }} getAuthHeaders={getAuthHeaders} />}
      {modal?.type === 'delete'       && <DeleteConfirmModal entity={modal.entity} entityType={modal.entityType} onClose={() => setModal(null)} onSaved={() => { setModal(null); refreshAll(); }} getAuthHeaders={getAuthHeaders} />}

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          tab={tab}
          entity={selected}
          centers={centersForFilter}
          batches={batchesForFilter}
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
    followup:           { c: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'FOLLOW-UP' },
    no_answer:          { c: 'bg-orange-50 text-orange-700 border-orange-200',    label: 'NO ANSWER' },
    incorrect_number:   { c: 'bg-purple-50 text-purple-700 border-purple-200',    label: 'WRONG NUMBER' },
    scheduled:          { c: 'bg-violet-50 text-violet-700 border-violet-200',    label: 'SCHEDULED' },
    rescheduled:        { c: 'bg-indigo-50 text-indigo-700 border-indigo-200',    label: 'RESCHEDULED' },
    completed:          { c: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'COMPLETED' },
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

/**
 * Small uncontrolled textarea rendered inline in each Leads row.
 * Saves on blur or Cmd/Ctrl+Enter — no modal, no clicks.
 * Uses a `key` on the lead notes to reset local state when the lead reloads.
 */
const InlineNotesField = ({ lead, onSave }) => {
  const [value, setValue] = useState(lead?.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setValue(lead?.notes || ''); }, [lead?.id, lead?.notes]);

  const flush = async () => {
    const nextVal = (value || '').trim();
    const prevVal = (lead?.notes || '').trim();
    if (nextVal === prevVal) return;
    setSaving(true);
    try {
      await onSave?.(lead, nextVal);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={flush}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); flush(); } }}
        placeholder="Add notes…"
        rows={2}
        className="w-full text-[11px] px-2 py-1.5 rounded-md border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
        data-testid={`row-inline-notes-${lead?.lead_ref}`}
      />
      {saving && <span className="absolute -bottom-3 right-1 text-[9px] text-slate-400">saving…</span>}
      {saved && !saving && <span className="absolute -bottom-3 right-1 text-[9px] text-emerald-600 font-bold">saved ✓</span>}
    </div>
  );
};

// ── Tables ──────────────────────────────────────────────────────────
const LeadsTable = ({ rows, onOpen, onAction, centers = [], batches = [], selectedIds = new Set(), onToggleSelect, onToggleSelectAll, onSaveNotes }) => {
  const centerName = (cid) => centers.find(c => c.id === cid)?.name || '';
  const batchName  = (bid) => {
    const b = batches.find(x => x.id === bid);
    return b ? `${b.name}` : '';
  };
  const allIds = rows.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = allIds.some(id => selectedIds.has(id));
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
        <tr>
          <th className="px-3 py-2 w-8">
            <input type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
              onChange={() => onToggleSelectAll && onToggleSelectAll(allIds)}
              className="w-4 h-4 rounded border-slate-300 accent-[#1E3A5F] cursor-pointer"
              data-testid="leads-select-all"
              aria-label="Select all leads"
            />
          </th>
          <Th>Added</Th><Th>Name</Th><Th>Phone</Th><Th>Source</Th><Th>Centre · Batch</Th><Th>Status</Th><Th>Notes</Th><Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}
            className={`border-t border-slate-100 hover:bg-blue-50/40 ${selectedIds.has(r.id) ? 'bg-blue-50/60' : ''}`}
            data-testid={`row-${r.lead_ref}`}>
            <td className="px-3 py-3 w-8" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox"
                checked={selectedIds.has(r.id)}
                onChange={() => onToggleSelect && onToggleSelect(r.id)}
                className="w-4 h-4 rounded border-slate-300 accent-[#1E3A5F] cursor-pointer"
                data-testid={`row-select-${r.lead_ref}`}
                aria-label={`Select ${r.name || r.lead_ref}`}
              />
            </td>
            {/* ADDED — replaces the old REF column so admins see when the lead entered the CRM at a glance. */}
            <td className="px-4 py-3 text-xs text-slate-700 cursor-pointer whitespace-nowrap" onClick={() => onOpen(r)}
                data-testid={`row-added-${r.lead_ref}`}>
              <div className="font-bold text-[#0F1E33]">{fmtDateTime(r.created_at)}</div>
              <div className="text-[10px] text-slate-400 font-mono">{r.lead_ref}</div>
            </td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-bold text-[#0F1E33]">{r.name || <span className="text-slate-400 font-normal italic">no name</span>}</div>
              {(r.age_group || r.child_age) && (
                <div className="text-[11px] text-slate-500 mt-0.5" data-testid={`row-age-${r.lead_ref}`}>
                  {r.age_group || r.child_age}
                </div>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-slate-700 cursor-pointer" onClick={() => onOpen(r)}>
              <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {r.phone}</div>
            </td>
            <td className="px-4 py-3 text-xs font-semibold text-slate-700 cursor-pointer" onClick={() => onOpen(r)}>{r.source || '—'}</td>
            <td className="px-4 py-3 text-xs cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-semibold text-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3" /> {centerName(r.center_id) || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{batchName(r.batch_id) || '—'}</div>
            </td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}>
              <StatusBadge status={r.status} />
              {r.next_followup_date && (
                <div className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDate(r.next_followup_date)}</div>
              )}
            </td>
            {/* Inline notes — save on blur or Cmd/Ctrl+Enter. Uncontrolled input
                so the row doesn't re-render every keystroke. */}
            <td className="px-3 py-3 w-[220px]" onClick={(e) => e.stopPropagation()}>
              <InlineNotesField lead={r} onSave={onSaveNotes} />
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                <button onClick={(e) => { e.stopPropagation(); onAction('book-trial', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold flex items-center gap-1"
                  data-testid={`row-book-trial-${r.lead_ref}`} title="Book Trial">
                  <Calendar className="w-3 h-3" /> Trial
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('followup', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold flex items-center gap-1"
                  data-testid={`row-followup-${r.lead_ref}`} title="Add Followup">
                  <Clock className="w-3 h-3" /> Followup
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('notes', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1"
                  data-testid={`row-notes-${r.lead_ref}`} title="Notes">
                  <FileText className="w-3 h-3" /> Notes
                </button>
                <button onClick={(e) => { e.stopPropagation(); onOpen(r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1"
                  data-testid={`row-edit-${r.lead_ref}`} title="Edit">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('mark-lost', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold flex items-center gap-1"
                  data-testid={`row-mark-lost-${r.lead_ref}`} title="Mark Lost">
                  <XCircle className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('delete', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center gap-1"
                  data-testid={`row-delete-${r.lead_ref}`} title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const TrialsTable = ({ rows, onOpen, onAction, centers = [], batches = [] }) => {
  const centerName = (cid) => centers.find(c => c.id === cid)?.name || '';
  const batchInfo = (bid, fallback) => {
    const b = batches.find(x => x.id === bid);
    if (b) return `${b.name} · ${(b.days || []).join('/')}`;
    return fallback || '';
  };
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
        <tr><Th>Ref</Th><Th>Student</Th><Th>Parent Contact</Th><Th>Centre · Batch</Th><Th>Scheduled</Th><Th>Status</Th><Th>Actions</Th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}
            className="border-t border-slate-100 hover:bg-blue-50/40"
            data-testid={`row-${r.trial_ref}`}>
            <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F] cursor-pointer" onClick={() => onOpen(r)}>{r.trial_ref}</td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-bold text-[#0F1E33]">{r.student_name || <span className="text-slate-400 font-normal italic">no name</span>}</div>
              {(r.age_group || r.student_age) && (
                <div className="text-[11px] text-slate-500 mt-0.5" data-testid={`row-trial-age-${r.trial_ref}`}>
                  {r.age_group || r.student_age}
                </div>
              )}
            </td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-semibold text-[#0F1E33] text-xs">{r.parent_name || '—'}</div>
              <div className="text-xs text-slate-700 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {r.parent_phone}</div>
            </td>
            <td className="px-4 py-3 text-xs cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-semibold text-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3" /> {centerName(r.center_id) || r.preferred_center || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">{batchInfo(r.batch_id, r.batch_label) || '—'}</div>
            </td>
            <td className="px-4 py-3 text-xs cursor-pointer" onClick={() => onOpen(r)}>
              {r.scheduled_at ? <span className="font-semibold text-slate-700">{fmtDate(r.scheduled_at)}</span> : <span className="text-slate-400">—</span>}
            </td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}>
              <StatusBadge status={r.crm_status} />
              {r.next_followup_date && (
                <div className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDate(r.next_followup_date)}</div>
              )}
              {(r.last_note || r.notes) && (
                <div className="text-[11px] text-slate-600 mt-1 line-clamp-2 max-w-[220px]" title={r.last_note || r.notes} data-testid={`row-trial-note-${r.trial_ref}`}>
                  <span className="font-bold">📝 </span>{r.last_note || r.notes}
                </div>
              )}
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {(r.crm_status === 'scheduled' || r.crm_status === 'trial_scheduled' || r.crm_status === 'rescheduled') && (
                  <button onClick={(e) => { e.stopPropagation(); onAction('attended', r); }}
                    className="text-[10px] px-2 py-1 rounded-md bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold flex items-center gap-1"
                    data-testid={`row-attended-${r.trial_ref}`} title="Mark Attended → Completed">
                    ✓ Attended
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onAction('convert', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold flex items-center gap-1"
                  data-testid={`row-convert-${r.trial_ref}`} title="Convert to Customer">
                  <Sparkles className="w-3 h-3" /> Convert
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('payment-link', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold flex items-center gap-1"
                  data-testid={`row-trial-paylink-${r.trial_ref}`} title="Copy Payment Link">
                  <LinkIcon className="w-3 h-3" /> Pay Link
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('reschedule', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold flex items-center gap-1"
                  data-testid={`row-reschedule-${r.trial_ref}`} title="Reschedule">
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('followup', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold flex items-center gap-1"
                  data-testid={`row-trial-followup-${r.trial_ref}`} title="Add Followup">
                  <Clock className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('notes', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1"
                  data-testid={`row-trial-notes-${r.trial_ref}`} title="Notes">
                  <FileText className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onOpen(r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1"
                  data-testid={`row-trial-edit-${r.trial_ref}`} title="Edit">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('mark-lost', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold flex items-center gap-1"
                  data-testid={`row-trial-lost-${r.trial_ref}`} title="Mark Lost">
                  <XCircle className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('delete', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center gap-1"
                  data-testid={`row-trial-delete-${r.trial_ref}`} title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const CustomersTable = ({ rows, onOpen, onAction, centers = [], batches = [] }) => {
  const centerName = (cid) => centers.find(c => c.id === cid)?.name || '';
  const batchName  = (bid) => batches.find(x => x.id === bid)?.name || '';
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
        <tr><Th>Ref</Th><Th>Student · Parent</Th><Th>Centre · Batch</Th><Th>Plan</Th><Th>Amount Paid</Th><Th>Renewal Date</Th><Th>Actions</Th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-t border-slate-100 hover:bg-blue-50/40"
            data-testid={`row-${r.subscription_ref}`}>
            <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F] cursor-pointer" onClick={() => onOpen(r)}>{r.subscription_ref}</td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-bold text-[#0F1E33]">{r.student_name}</div>
              <div className="text-[11px] text-slate-500">{r.parent_name} · {r.parent_phone}</div>
            </td>
            <td className="px-4 py-3 text-xs cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-semibold text-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3" /> {centerName(r.center_id) || r.preferred_center || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{batchName(r.batch_id) || '—'}</div>
            </td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-bold text-[#0F1E33] text-xs">{r.plan_label}</div>
              <div className="text-[11px] text-slate-500">{fmtMoney(r.amount)}</div>
            </td>
            <td className="px-4 py-3 font-bold text-emerald-700 cursor-pointer" onClick={() => onOpen(r)}>{fmtMoney(r.amount_paid || r.amount)}</td>
            <td className="px-4 py-3 text-xs font-semibold text-[#0F1E33] cursor-pointer" onClick={() => onOpen(r)}>{fmtDate(r.renewal_date)}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                <button onClick={(e) => { e.stopPropagation(); onAction && onAction('renew', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold flex items-center gap-1"
                  data-testid={`row-customer-renew-${r.subscription_ref}`} title="Renew">
                  <RotateCcw className="w-3 h-3" /> Renew
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction && onAction('notes', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1"
                  data-testid={`row-customer-notes-${r.subscription_ref}`} title="Notes">
                  <FileText className="w-3 h-3" /> Notes
                </button>
                <button onClick={(e) => { e.stopPropagation(); onOpen(r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1"
                  data-testid={`row-customer-edit-${r.subscription_ref}`} title="Edit">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction && onAction('mark-lost', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold flex items-center gap-1"
                  data-testid={`row-customer-mark-lost-${r.subscription_ref}`} title="Mark Lost">
                  <XCircle className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction && onAction('delete', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center gap-1"
                  data-testid={`row-customer-delete-${r.subscription_ref}`} title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const RenewalsTable = ({ rows, onOpen, onAction, centers = [], batches = [] }) => {
  const centerName = (cid) => centers.find(c => c.id === cid)?.name || '';
  const batchName  = (bid) => batches.find(x => x.id === bid)?.name || '';
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
        <tr><Th>Ref</Th><Th>Student · Parent</Th><Th>Centre · Batch</Th><Th>Plan</Th><Th>Renewal</Th><Th>Status</Th><Th>Actions</Th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}
            className={`border-t border-slate-100 hover:bg-blue-50/40 ${r.renewal_bucket === 'overdue' ? 'bg-rose-50/40' : ''}`}
            data-testid={`row-${r.subscription_ref}`}>
            <td className="px-4 py-3 font-mono font-bold text-[#1E3A5F] cursor-pointer" onClick={() => onOpen(r)}>{r.subscription_ref}</td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-bold text-[#0F1E33]">{r.student_name}</div>
              <div className="text-[11px] text-slate-500">{r.parent_name} · {r.parent_phone}</div>
            </td>
            <td className="px-4 py-3 text-xs cursor-pointer" onClick={() => onOpen(r)}>
              <div className="font-semibold text-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3" /> {centerName(r.center_id) || r.preferred_center || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{batchName(r.batch_id) || '—'}</div>
            </td>
            <td className="px-4 py-3 text-xs font-bold text-[#0F1E33] cursor-pointer" onClick={() => onOpen(r)}>{r.plan_label}</td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}>
              <div className="text-xs font-semibold text-[#0F1E33]">{fmtDate(r.renewal_date)}</div>
              <div className="text-[11px] text-slate-500">
                {r.renewal_bucket === 'overdue'
                  ? `⚠ ${r.days_overdue}d overdue`
                  : `in ${r.days_to_renewal ?? 0}d`}
              </div>
            </td>
            <td className="px-4 py-3 cursor-pointer" onClick={() => onOpen(r)}><StatusBadge status={r.renewal_bucket} /></td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                <button onClick={(e) => { e.stopPropagation(); onAction('renew', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold flex items-center gap-1"
                  data-testid={`row-renew-${r.subscription_ref}`} title="Renew">
                  <RotateCcw className="w-3 h-3" /> Renewed
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('payment-link', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold flex items-center gap-1"
                  data-testid={`row-renewal-paylink-${r.subscription_ref}`} title="Copy Payment Link">
                  <LinkIcon className="w-3 h-3" /> Pay Link
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('followup', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold flex items-center gap-1"
                  data-testid={`row-renewal-followup-${r.subscription_ref}`} title="Add Followup">
                  <Clock className="w-3 h-3" /> Followup
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('notes', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1"
                  data-testid={`row-renewal-notes-${r.subscription_ref}`} title="Notes">
                  <FileText className="w-3 h-3" /> Notes
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('mark-lost', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold flex items-center gap-1"
                  data-testid={`row-renewal-lost-${r.subscription_ref}`} title="Mark Lost">
                  <XCircle className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAction('delete', r); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center gap-1"
                  data-testid={`row-renewal-delete-${r.subscription_ref}`} title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

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
const DetailDrawer = ({ tab, entity, centers = [], batches = [], onClose, onAction, onSaved, getAuthHeaders }) => {
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({});

  useEffect(() => {
    if (tab === 'leads') {
      setEdit({ name: entity.name, phone: entity.phone, email: entity.email, source: entity.source, city: entity.city, status: entity.status, notes: entity.notes });
    } else if (tab === 'trials') {
      setEdit({
        student_name: entity.student_name || '',
        age_group: entity.age_group || '',
        source: entity.source || '',
        crm_status: entity.crm_status,
        notes: entity.notes,
        assigned_center: entity.assigned_center || entity.preferred_center,
        center_id: entity.center_id || '',
        batch_id:  entity.batch_id  || '',
      });
    } else if (tab === 'customers' || tab === 'renewals') {
      setEdit({
        notes: entity.notes,
        amount_paid: entity.amount_paid,
        renewal_date: (entity.renewal_date || '').slice(0, 10),
        plan: entity.plan,
        center_id: entity.center_id || '',
        batch_id:  entity.batch_id  || '',
      });
    }
  }, [entity, tab]);

  // Batches filtered by the currently selected centre (in the modal)
  const availableBatches = (edit.center_id
    ? batches.filter(b => b.center_id === edit.center_id)
    : batches);

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
                <SelectField label="Source" value={edit.source || ''} onChange={v => setEdit({ ...edit, source: v })} options={LEAD_SOURCE_OPTIONS} />
                <SelectField label="Child Age" value={edit.child_age || ''} onChange={v => setEdit({ ...edit, child_age: v })}
                  options={[{ value: '', label: 'Select age…' }, ...AGE_GROUP_OPTIONS.filter(o => o.value !== '')]} />
                <SelectField label="Status" value={edit.status || 'new'} onChange={v => setEdit({ ...edit, status: v })} options={LEAD_STATUSES} colSpan={2} />
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
              <FieldGroup>
                <TextField label="Student Name" value={edit.student_name || ''} onChange={v => setEdit({ ...edit, student_name: v })} testid="edit-trial-student-name" colSpan={2} />
                <SelectField label="Age Group" value={edit.age_group || ''} onChange={v => setEdit({ ...edit, age_group: v })}
                  options={[{ value: '', label: 'Select age group…' }, ...AGE_GROUP_OPTIONS.filter(o => o.value !== '')]}
                  testid="edit-trial-age-group" />
                <SelectField label="Source" value={edit.source || ''} onChange={v => setEdit({ ...edit, source: v })}
                  options={LEAD_SOURCE_OPTIONS} testid="edit-trial-source" />
              </FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Phone" value={entity.parent_phone} />
                <Detail label="Preferred centre" value={entity.preferred_center || '—'} />
                <Detail label="Scheduled" value={entity.scheduled_at ? fmtDateTime(entity.scheduled_at) : '—'} />
                <Detail label="Created" value={fmtDateTime(entity.created_at)} />
              </div>
              <SelectField label="CRM Status" value={edit.crm_status || 'trial_lead'} onChange={v => setEdit({ ...edit, crm_status: v })}
                options={[
                  {value:'trial_lead',label:'Lead'},{value:'trial_contacted',label:'Contacted'},
                  {value:'trial_scheduled',label:'Scheduled'},{value:'trial_attended',label:'Attended'},
                  {value:'converted',label:'Converted'},
                ]} />
              <SelectField label="Centre"
                value={edit.center_id || ''}
                onChange={v => setEdit({ ...edit, center_id: v, batch_id: '' })}
                options={[{ value: '', label: '— Not assigned —' }, ...centers.map(c => ({ value: c.id, label: c.name }))]}
                testid="edit-trial-center" />
              <SelectField label="Batch"
                value={edit.batch_id || ''}
                onChange={v => setEdit({ ...edit, batch_id: v })}
                options={[{ value: '', label: '— Not assigned —' }, ...availableBatches.map(b => ({ value: b.id, label: `${b.name}${b.days && b.days.length ? ' · ' + b.days.join('/') : ''}` }))]}
                testid="edit-trial-batch" />
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
              <SelectField label="Centre"
                value={edit.center_id || ''}
                onChange={v => setEdit({ ...edit, center_id: v, batch_id: '' })}
                options={[{ value: '', label: '— Not assigned —' }, ...centers.map(c => ({ value: c.id, label: c.name }))]}
                testid="edit-customer-center" />
              <SelectField label="Batch"
                value={edit.batch_id || ''}
                onChange={v => setEdit({ ...edit, batch_id: v })}
                options={[{ value: '', label: '— Not assigned —' }, ...availableBatches.map(b => ({ value: b.id, label: `${b.name}${b.days && b.days.length ? ' · ' + b.days.join('/') : ''}` }))]}
                testid="edit-customer-batch" />
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
  const [f, setF] = useState({ name: '', phone: '', source: '', child_age: '', center_id: '', batch_id: '', notes: '' });
  const [centers, setCenters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() })
      .then(r => setCenters(r.data?.centers || [])).catch(() => {});
    axios.get(`${API}/admin/future-skills/batches`, { headers: getAuthHeaders() })
      .then(r => setBatches(r.data?.batches || [])).catch(() => {});
  }, [getAuthHeaders]);

  const batchesForCenter = f.center_id ? batches.filter(b => b.center_id === f.center_id) : [];

  const submit = async () => {
    if (!f.phone) { toast.error('Phone is required'); return; }
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
        <TextField label="Name (optional)" value={f.name} onChange={v => setF({ ...f, name: v })} testid="lead-name-input" />
        <TextField label="Phone" value={f.phone} onChange={v => setF({ ...f, phone: v })} required testid="lead-phone-input" />
        <SelectField label="Source" value={f.source} onChange={v => setF({ ...f, source: v })} options={LEAD_SOURCE_OPTIONS} testid="lead-source-select" />
        <SelectField label="Child Age" value={f.child_age} onChange={v => setF({ ...f, child_age: v })}
          options={[{ value: '', label: 'Select age…' }, ...AGE_GROUP_OPTIONS.filter(o => o.value !== '')]}
          testid="lead-age-select" />
        <SelectField label="Centre" value={f.center_id} onChange={v => setF({ ...f, center_id: v, batch_id: '' })}
          options={[{ value: '', label: 'Select a centre…' }, ...centers.map(c => ({ value: c.id, label: c.name }))]}
          testid="lead-center-select" colSpan={2} />
        <SelectField label="Batch (optional)" value={f.batch_id} onChange={v => setF({ ...f, batch_id: v })}
          options={[
            { value: '', label: f.center_id ? (batchesForCenter.length ? 'Select a batch…' : 'No batches at this centre') : 'Pick a centre first' },
            ...batchesForCenter.map(b => ({
              value: b.id,
              label: `${b.name} · ${(b.days || []).join('/')} ${timeRange(b.start_time, b.end_time)}`,
            })),
          ]}
          testid="lead-batch-select" colSpan={2} />
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
  const [f, setF] = useState({ parent_phone: '', student_name: '', center_id: '', batch_id: '', scheduled_at: '' });
  const [centers, setCenters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() })
      .then(r => setCenters(r.data?.centers || []));
    axios.get(`${API}/admin/future-skills/batches`, { headers: getAuthHeaders() })
      .then(r => setBatches(r.data?.batches || []));
  }, [getAuthHeaders]);

  const batchesForCenter = f.center_id ? batches.filter(b => b.center_id === f.center_id) : [];
  const selectedBatch = batches.find(b => b.id === f.batch_id);
  const allowedDayIdx = (selectedBatch?.days || []).map(dayIndexFromName).filter(x => x !== -1);
  const dateValid = !f.scheduled_at || !selectedBatch || allowedDayIdx.length === 0 || allowedDayIdx.includes(new Date(f.scheduled_at).getDay());

  const submit = async () => {
    if (!f.parent_phone) { toast.error('Parent phone required'); return; }
    if (!f.center_id) { toast.error('Please pick a centre'); return; }
    if (f.scheduled_at && !dateValid) { toast.error(`Selected date does not match batch days (${(selectedBatch?.days || []).join(', ')})`); return; }
    setSaving(true);
    try {
      const payload = {
        parent_phone: f.parent_phone,
        parent_name: '',
        student_name: (f.student_name || '').trim() || 'Student',
        center_id: f.center_id,
        batch_id: f.batch_id || '',
        scheduled_at: f.scheduled_at ? new Date(f.scheduled_at).toISOString() : '',
      };
      await axios.post(`${API}/admin/future-skills/trials`, payload, { headers: getAuthHeaders() });
      toast.success('Trial booking added');
      onSaved(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Free Trial" onClose={onClose} testid="add-trial-modal">
      <FieldGroup>
        <TextField label="Parent Phone" value={f.parent_phone} onChange={v => setF({ ...f, parent_phone: v })} required testid="trial-phone-input" colSpan={2} />
        <TextField label="Student Name (optional)" value={f.student_name} onChange={v => setF({ ...f, student_name: v })} testid="trial-student-input" colSpan={2} />
        <SelectField label="Centre" value={f.center_id} onChange={v => setF({ ...f, center_id: v, batch_id: '', scheduled_at: '' })}
          options={[{ value: '', label: 'Select a centre…' }, ...centers.map(c => ({ value: c.id, label: c.name }))]}
          testid="trial-center-select" colSpan={2} />
        <SelectField label="Batch (optional)" value={f.batch_id} onChange={v => setF({ ...f, batch_id: v, scheduled_at: '' })}
          options={[
            { value: '', label: f.center_id ? (batchesForCenter.length ? 'Select a batch…' : 'No batches at this centre') : 'Pick a centre first' },
            ...batchesForCenter.map(b => ({
              value: b.id,
              label: `${b.name} · ${(b.days || []).join('/')} ${timeRange(b.start_time, b.end_time)}`,
            })),
          ]}
          testid="trial-batch-select" colSpan={2} />
        <TextField label={`Trial Date${selectedBatch ? ` (must be ${(selectedBatch.days || []).join('/')})` : ''}`}
          type="date" value={f.scheduled_at} onChange={v => setF({ ...f, scheduled_at: v })}
          testid="trial-date-input" colSpan={2} />
        {f.scheduled_at && selectedBatch && !dateValid && (
          <div className="col-span-2 text-xs text-rose-600 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> This date does not fall on {(selectedBatch.days || []).join(', ')}.
          </div>
        )}
      </FieldGroup>
      <button onClick={submit} disabled={saving || (f.scheduled_at && !dateValid)}
        className="mt-4 w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-add-trial-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Trial</>}
      </button>
    </Modal>
  );
};

// Helper: convert "Mon"/"Tue"/... → JS getDay index (0=Sun)
const DAY_TO_IDX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function dayIndexFromName(name) {
  return Object.prototype.hasOwnProperty.call(DAY_TO_IDX, name) ? DAY_TO_IDX[name] : -1;
}

const AddCustomerModal = ({ onClose, onSaved, getAuthHeaders }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    parent_name: '', parent_phone: '', parent_email: '',
    student_name: '', student_age: '',
    center_id: '', batch_id: '',
    plan: 'monthly', amount_paid: 2000, payment_date: today, renewal_date: '',
    notes: '',
  });
  const [centers, setCenters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() })
      .then(r => setCenters(r.data?.centers || []));
    axios.get(`${API}/admin/future-skills/batches`, { headers: getAuthHeaders() })
      .then(r => setBatches(r.data?.batches || []));
  }, [getAuthHeaders]);

  const batchesForCenter = f.center_id ? batches.filter(b => b.center_id === f.center_id) : [];

  const onPlanChange = (plan) => {
    const p = PLAN_OPTIONS.find(x => x.value === plan);
    setF(prev => ({ ...prev, plan, amount_paid: p?.defaultAmount || prev.amount_paid }));
  };

  const submit = async () => {
    // Parent name is optional (some walk-ins are logged with just phone).
    // Phone and student name remain required so we can identify the record.
    if (!f.parent_phone || !f.student_name) { toast.error('Student name and phone are required'); return; }
    if (!f.center_id) { toast.error('Please pick a centre'); return; }
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
        <SelectField label="Age" value={f.student_age} onChange={v => setF({ ...f, student_age: v })}
          options={AGE_GROUP_OPTIONS.filter(o => o.value !== '').map(o => ({ value: o.value, label: o.label })).concat([{ value: '', label: 'Age not set' }])}
          testid="cust-age-select" />
        <TextField label="Parent Name" value={f.parent_name} onChange={v => setF({ ...f, parent_name: v })} testid="cust-parent-input" />
        <TextField label="Parent Phone" value={f.parent_phone} onChange={v => setF({ ...f, parent_phone: v })} required testid="cust-phone-input" />
        <TextField label="Email" value={f.parent_email} onChange={v => setF({ ...f, parent_email: v })} colSpan={2} />
        <SelectField label="Centre" value={f.center_id} onChange={v => setF({ ...f, center_id: v, batch_id: '' })}
          options={[{ value: '', label: 'Select a centre…' }, ...centers.map(c => ({ value: c.id, label: c.name }))]}
          testid="cust-center-select" colSpan={2} />
        <SelectField label="Batch (optional)" value={f.batch_id} onChange={v => setF({ ...f, batch_id: v })}
          options={[
            { value: '', label: f.center_id ? (batchesForCenter.length ? 'Select a batch…' : 'No batches at this centre') : 'Pick a centre first' },
            ...batchesForCenter.map(b => ({
              value: b.id,
              label: `${b.name} · ${(b.days || []).join('/')} ${timeRange(b.start_time, b.end_time)}`,
            })),
          ]}
          testid="cust-batch-select" colSpan={2} />
        <SelectField label="Plan" value={f.plan} onChange={onPlanChange} options={PLAN_OPTIONS} testid="cust-plan-select" />
        <TextField label="Amount Paid (₹)" type="number" value={f.amount_paid} onChange={v => setF({ ...f, amount_paid: parseFloat(v) || 0 })} required testid="cust-amount-input" />
        <TextField label="Payment Date" type="date" value={f.payment_date} onChange={v => setF({ ...f, payment_date: v })} />
        <TextField label="Renewal Date (auto if empty)" type="date" value={f.renewal_date} onChange={v => setF({ ...f, renewal_date: v })} testid="cust-renewal-input" />
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

const ImportModal = ({ onClose, onImport, fileInputRef, centers = [], sources = [], onSourceAdded, getAuthHeaders }) => {
  const [defaultCenterId, setDefaultCenterId] = useState('');
  const [defaultAgeGroup, setDefaultAgeGroup] = useState('');
  const [defaultSource,   setDefaultSource]   = useState('');
  const [addingSource,    setAddingSource]    = useState(false);
  const [newSourceName,   setNewSourceName]   = useState('');

  const downloadSample = () => {
    const csv = 'name,phone,source,city,center,age_group\nRahul Sharma,9812345678,Instagram,Mumbai,Dahisar,8-11\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'future-skills-leads-sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const submitNewSource = async () => {
    const name = newSourceName.trim();
    if (!name) return;
    try {
      const r = await axios.post(`${API}/admin/future-skills/lead-sources`, { name }, { headers: getAuthHeaders() });
      const saved = r.data?.name || name;
      setDefaultSource(saved);
      setNewSourceName('');
      setAddingSource(false);
      onSourceAdded && onSourceAdded();
      toast.success(r.data?.existed ? 'Source already exists — selected' : 'Source added');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not add source');
    }
  };

  // Sources list = server-managed union of defaults + admin-added
  const sourceOptions = [
    { value: '', label: '— No default (use CSV value) —' },
    ...sources.map(s => ({ value: s, label: s })),
  ];

  return (
    <Modal title="Import Leads (CSV / Excel)" onClose={onClose} testid="import-modal">
      <p className="text-sm text-slate-600 mb-3">
        Upload a <strong>.csv</strong>, <strong>.xlsx</strong> or <strong>.xls</strong> file. Excel files with multiple sheets will import all sheets in one go. Duplicates (by phone) are skipped.
      </p>

      {/* ── Bulk defaults: map centre / age / source for ALL rows that don't
          already have those values in the file. ─────────────────────── */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 mb-4 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-blue-800 font-bold">
          Map these to every imported lead
        </div>

        <SelectField
          label="Default centre"
          value={defaultCenterId}
          onChange={setDefaultCenterId}
          options={[{ value: '', label: '— No default (use CSV value) —' }, ...centers.map(c => ({ value: c.id, label: c.name }))]}
          testid="import-default-center"
        />

        <SelectField
          label="Default age group"
          value={defaultAgeGroup}
          onChange={setDefaultAgeGroup}
          options={[{ value: '', label: '— No default (use CSV value) —' }, ...AGE_GROUP_OPTIONS.filter(o => o.value !== '').map(o => ({ value: o.value, label: o.label }))]}
          testid="import-default-age"
        />

        <div>
          <SelectField
            label="Default source"
            value={defaultSource}
            onChange={setDefaultSource}
            options={sourceOptions}
            testid="import-default-source"
          />
          {!addingSource ? (
            <button type="button" onClick={() => setAddingSource(true)}
              className="mt-1.5 text-[11px] text-[#1E3A5F] hover:text-[#D63031] font-bold flex items-center gap-1"
              data-testid="import-add-source-btn">
              <Plus className="w-3 h-3" /> Add new source
            </button>
          ) : (
            <div className="mt-2 flex gap-2" data-testid="import-add-source-row">
              <input
                autoFocus
                value={newSourceName}
                onChange={e => setNewSourceName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitNewSource(); }}
                placeholder="e.g. Radio Ad, Society Flyer…"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                data-testid="import-new-source-input"
              />
              <button type="button" onClick={submitNewSource}
                className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold"
                data-testid="import-new-source-save">
                Add
              </button>
              <button type="button" onClick={() => { setAddingSource(false); setNewSourceName(''); }}
                className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                data-testid="import-new-source-cancel">
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-500">
          Rule: any default you pick above <strong>overrides</strong> whatever is in the file. Leave a field blank to keep the file&apos;s value.
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-600">
        <div className="font-bold mb-1">Supported columns:</div>
        <div className="font-mono">name*, phone*, source, city, center, age_group</div>
        <div className="mt-1 text-slate-500">* required · <span className="font-mono">center</span> is matched by name to your Centres list.</div>
      </div>
      <button onClick={downloadSample}
        className="mb-3 text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
        data-testid="download-sample-btn">
        <Download className="w-3.5 h-3.5" /> Download sample CSV
      </button>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onImport(f, {
              default_center_id: defaultCenterId,
              default_age_group: defaultAgeGroup,
              default_source:    defaultSource,
            });
            onClose();
          }
        }}
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

// Common reasons users pick when marking a lead / trial / customer as
// lost. Kept as separate lists per entity type so the dropdown always
// shows the most relevant options first. Adding "Other" reveals a free-
// text input so the reason field never traps a user with no fit.
const LOST_REASON_OPTIONS = {
  lead: [
    'Not interested',
    'Wrong contact / spam',
    'Duplicate lead',
    'Budget concerns',
    'Age not fit',
    'Wants offline only',
    'Wrong location',
    'Went with a competitor',
    'No response after multiple follow-ups',
    'Timing not right',
    'Other',
  ],
  trial: [
    'No-show at trial',
    'Attended but not interested',
    'Child not engaged',
    'Parent not convinced',
    'Budget concerns',
    'Timing / schedule conflict',
    'Prefers a different subject',
    'Went with a competitor',
    'No response after multiple follow-ups',
    'Other',
  ],
  customer: [
    'Course completed, not renewing',
    'Budget / financial reason',
    'Child lost interest',
    'Schedule / timing conflict',
    'Moved location',
    'Not satisfied with progress',
    'Not satisfied with teacher',
    'Switched to a competitor',
    'Health / personal reason',
    'Other',
  ],
};

const MarkLostModal = ({ entity, entityType, onClose, onSaved, getAuthHeaders }) => {
  const options = LOST_REASON_OPTIONS[entityType] || LOST_REASON_OPTIONS.lead;
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    // "Other" reveals free-text; every other option is used verbatim.
    const finalReason = selectedReason === 'Other'
      ? otherReason.trim()
      : selectedReason;
    if (!finalReason) {
      toast.error(selectedReason ? 'Please add a note for "Other"' : 'Please pick a reason');
      return;
    }
    setSaving(true);
    try {
      let path = '';
      if (entityType === 'lead')     path = `leads/${entity.id}/mark-lost`;
      if (entityType === 'trial')    path = `trials/${entity.id}/mark-lost`;
      if (entityType === 'customer') path = `customers/${entity.id}/mark-lost`;
      await axios.post(`${API}/admin/future-skills/${path}`, {
        reason:          finalReason,
        reason_category: selectedReason,   // preserve the picked category
      }, { headers: getAuthHeaders() });
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
      <div>
        <Label>Reason for loss *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="lost-reason-options">
          {options.map(opt => (
            <button key={opt} type="button"
              onClick={() => setSelectedReason(opt)}
              className={`text-xs px-3 py-2 rounded-lg border font-semibold text-left transition-all ${
                selectedReason === opt
                  ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              data-testid={`lost-reason-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {selectedReason === 'Other' && (
        <div className="mt-3">
          <TextAreaField
            label="Tell us more (required for Other)"
            value={otherReason}
            onChange={setOtherReason}
            testid="lost-reason-other-input"
          />
        </div>
      )}
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
  const [f, setF] = useState({ plan: 'monthly', amount_paid: 2000, payment_date: today, renewal_date: '', payment_mode: '', payment_status: 'paid', notes: '' });
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
        <SelectField label="Payment Mode" value={f.payment_mode} onChange={v => setF({ ...f, payment_mode: v })} options={PAYMENT_MODES} testid="convert-mode-select" />
        <SelectField label="Payment Status" value={f.payment_status} onChange={v => setF({ ...f, payment_status: v })} options={PAYMENT_STATUSES} testid="convert-status-select" />
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

// ── BOOK TRIAL from Lead row (centre + batch + date) ──────────────────
const BookTrialModal = ({ lead, onClose, onSaved, getAuthHeaders }) => {
  const [f, setF] = useState({ center_id: lead?.center_id || '', batch_id: lead?.batch_id || '', scheduled_at: '' });
  const [centers, setCenters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() })
      .then(r => setCenters(r.data?.centers || [])).catch(() => {});
    axios.get(`${API}/admin/future-skills/batches`, { headers: getAuthHeaders() })
      .then(r => setBatches(r.data?.batches || [])).catch(() => {});
  }, [getAuthHeaders]);

  const batchesForCenter = f.center_id ? batches.filter(b => b.center_id === f.center_id) : [];
  const selectedBatch = batches.find(b => b.id === f.batch_id);
  const allowedDayIdx = (selectedBatch?.days || []).map(dayIndexFromName).filter(x => x !== -1);
  const dateValid = !f.scheduled_at || !selectedBatch || allowedDayIdx.length === 0 || allowedDayIdx.includes(new Date(f.scheduled_at).getDay());

  const submit = async () => {
    if (!f.center_id) { toast.error('Please pick a centre'); return; }
    if (f.scheduled_at && !dateValid) { toast.error(`Date must be on ${(selectedBatch?.days || []).join(', ')}`); return; }
    setSaving(true);
    try {
      const payload = {
        center_id: f.center_id,
        batch_id: f.batch_id || '',
        scheduled_at: f.scheduled_at ? new Date(f.scheduled_at).toISOString() : '',
      };
      await axios.post(`${API}/admin/future-skills/leads/${lead.id}/book-trial`, payload, { headers: getAuthHeaders() });
      toast.success(`Trial booked for ${lead.name || lead.phone}`);
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`Book Trial — ${lead.name || lead.phone}`} onClose={onClose} testid="book-trial-modal">
      <FieldGroup>
        <SelectField label="Centre" value={f.center_id} onChange={v => setF({ ...f, center_id: v, batch_id: '', scheduled_at: '' })}
          options={[{ value: '', label: 'Select a centre…' }, ...centers.map(c => ({ value: c.id, label: c.name }))]}
          testid="book-center-select" colSpan={2} />
        <SelectField label="Batch (optional)" value={f.batch_id} onChange={v => setF({ ...f, batch_id: v, scheduled_at: '' })}
          options={[
            { value: '', label: f.center_id ? (batchesForCenter.length ? 'Select a batch…' : 'No batches at this centre') : 'Pick a centre first' },
            ...batchesForCenter.map(b => ({
              value: b.id,
              label: `${b.name} · ${(b.days || []).join('/')} ${timeRange(b.start_time, b.end_time)}`,
            })),
          ]}
          testid="book-batch-select" colSpan={2} />
        <TextField label={`Trial Date${selectedBatch ? ` (must be ${(selectedBatch.days || []).join('/')})` : ''}`}
          type="date" value={f.scheduled_at} onChange={v => setF({ ...f, scheduled_at: v })}
          testid="book-date-input" colSpan={2} />
        {f.scheduled_at && selectedBatch && !dateValid && (
          <div className="col-span-2 text-xs text-rose-600 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> This date does not fall on {(selectedBatch.days || []).join(', ')}.
          </div>
        )}
      </FieldGroup>
      <button onClick={submit} disabled={saving || (f.scheduled_at && !dateValid)}
        className="mt-4 w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-book-trial-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Calendar className="w-4 h-4" /> Book Trial</>}
      </button>
    </Modal>
  );
};

// ── RESCHEDULE Trial (centre + batch + date; adds reschedule history) ──
const RescheduleTrialModal = ({ trial, onClose, onSaved, getAuthHeaders }) => {
  const [f, setF] = useState({
    center_id: trial?.center_id || '',
    batch_id: trial?.batch_id || '',
    scheduled_at: trial?.scheduled_at ? String(trial.scheduled_at).slice(0, 10) : '',
    note: '',
  });
  const [centers, setCenters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() })
      .then(r => setCenters(r.data?.centers || [])).catch(() => {});
    axios.get(`${API}/admin/future-skills/batches`, { headers: getAuthHeaders() })
      .then(r => setBatches(r.data?.batches || [])).catch(() => {});
  }, [getAuthHeaders]);

  const batchesForCenter = f.center_id ? batches.filter(b => b.center_id === f.center_id) : [];
  const selectedBatch = batches.find(b => b.id === f.batch_id);
  const allowedDayIdx = (selectedBatch?.days || []).map(dayIndexFromName).filter(x => x !== -1);
  const dateValid = !f.scheduled_at || !selectedBatch || allowedDayIdx.length === 0 || allowedDayIdx.includes(new Date(f.scheduled_at).getDay());

  const history = Array.isArray(trial?.reschedules) ? [...trial.reschedules].reverse() : [];

  const submit = async () => {
    if (!f.scheduled_at) { toast.error('New trial date is required'); return; }
    if (!dateValid) { toast.error(`Selected date does not match batch days (${(selectedBatch?.days || []).join(', ')})`); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/future-skills/trials/${trial.id}/reschedule`, {
        scheduled_at: new Date(f.scheduled_at).toISOString(),
        batch_id: f.batch_id || '',
        note: f.note || '',
      }, { headers: getAuthHeaders() });
      toast.success('Trial rescheduled');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`Reschedule Trial — ${trial.student_name || trial.trial_ref}`} onClose={onClose} testid="reschedule-modal">
      <div className="text-xs text-slate-600 mb-3 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>Currently: <b>{trial.scheduled_at ? fmtDate(trial.scheduled_at) : 'not scheduled'}</b>{trial.batch_label && <> · {trial.batch_label}</>}</span>
      </div>
      <FieldGroup>
        <SelectField label="Centre" value={f.center_id} onChange={v => setF({ ...f, center_id: v, batch_id: '', scheduled_at: '' })}
          options={[{ value: '', label: 'Select a centre…' }, ...centers.map(c => ({ value: c.id, label: c.name }))]}
          testid="reschedule-center-select" colSpan={2} />
        <SelectField label="Batch" value={f.batch_id} onChange={v => setF({ ...f, batch_id: v, scheduled_at: '' })}
          options={[
            { value: '', label: f.center_id ? (batchesForCenter.length ? 'Select a batch…' : 'No batches at this centre') : 'Pick a centre first' },
            ...batchesForCenter.map(b => ({
              value: b.id,
              label: `${b.name} · ${(b.days || []).join('/')} ${timeRange(b.start_time, b.end_time)}`,
            })),
          ]}
          testid="reschedule-batch-select" colSpan={2} />
        <TextField label={`New Trial Date${selectedBatch ? ` (must be ${(selectedBatch.days || []).join('/')})` : ''}`}
          type="date" value={f.scheduled_at} onChange={v => setF({ ...f, scheduled_at: v })} required
          testid="reschedule-date-input" colSpan={2} />
        {f.scheduled_at && selectedBatch && !dateValid && (
          <div className="col-span-2 text-xs text-rose-600 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> This date does not fall on {(selectedBatch.days || []).join(', ')}.
          </div>
        )}
      </FieldGroup>
      <div className="mt-3"><TextAreaField label="Reason (optional)" value={f.note} onChange={v => setF({ ...f, note: v })} testid="reschedule-note-input" /></div>
      <button onClick={submit} disabled={saving || (f.scheduled_at && !dateValid)}
        className="mt-4 w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-reschedule-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><RotateCcw className="w-4 h-4" /> Reschedule</>}
      </button>

      {history.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">Reschedule history ({history.length})</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs" data-testid={`reschedule-entry-${i}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#0F1E33]">{fmtDate(h.prev_scheduled_at) || '—'} → {fmtDate(h.new_scheduled_at)}</div>
                  <div className="text-slate-500">{fmtDateTime(h.at)}</div>
                </div>
                {h.note && <div className="text-slate-700 mt-1 whitespace-pre-wrap">{h.note}</div>}
                {h.by && <div className="text-[10px] text-slate-400 mt-0.5">by {h.by}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── FOLLOWUP modal (Lead or Trial) ─────────────────────────────────────
const FollowupModal = ({ entity, entityType, onClose, onSaved, getAuthHeaders }) => {
  const [f, setF] = useState({
    next_date: entity?.next_followup_date ? String(entity.next_followup_date).slice(0, 10) : '',
    note: '',
    outcome: '',
  });
  const [saving, setSaving] = useState(false);

  const history = Array.isArray(entity?.followups) ? [...entity.followups].reverse() : [];

  const submit = async () => {
    if (!f.next_date && !f.note && !f.outcome) { toast.error('Enter a date, note or outcome'); return; }
    setSaving(true);
    try {
      const path = entityType === 'lead' ? `leads/${entity.id}/followup`
                 : entityType === 'trial' ? `trials/${entity.id}/followup`
                 : `customers/${entity.id}/followup`;
      const payload = { ...f };
      if (payload.next_date) payload.next_date = new Date(payload.next_date).toISOString();
      await axios.post(`${API}/admin/future-skills/${path}`, payload, { headers: getAuthHeaders() });
      toast.success('Followup saved');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  const displayName = entity.name || entity.student_name || entity.parent_name || entity.lead_ref || entity.trial_ref;
  return (
    <Modal title={`Followup — ${displayName}`} onClose={onClose} testid="followup-modal">
      <FieldGroup>
        <TextField label="Next Followup Date" type="date" value={f.next_date} onChange={v => setF({ ...f, next_date: v })} testid="followup-date-input" />
        <SelectField label="Outcome" value={f.outcome} onChange={v => setF({ ...f, outcome: v })} options={FOLLOWUP_OUTCOMES} testid="followup-outcome-select" />
      </FieldGroup>
      <div className="mt-3"><TextAreaField label="Note" value={f.note} onChange={v => setF({ ...f, note: v })} testid="followup-note-input" /></div>
      <button onClick={submit} disabled={saving}
        className="mt-4 w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-followup-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Followup</>}
      </button>

      {history.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">History ({history.length})</div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs" data-testid={`followup-entry-${i}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#0F1E33]">{h.outcome ? h.outcome.replace('_', ' ').toUpperCase() : 'NOTE'}</div>
                  <div className="text-slate-500">{fmtDateTime(h.at)}</div>
                </div>
                {h.next_date && <div className="text-slate-600 mt-0.5">Next: {fmtDate(h.next_date)}</div>}
                {h.note && <div className="text-slate-700 mt-1 whitespace-pre-wrap">{h.note}</div>}
                {h.by && <div className="text-[10px] text-slate-400 mt-0.5">by {h.by}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── NOTES modal (Lead / Trial / Customer) ────────────────────────────
const NotesModal = ({ entity, entityType, onClose, onSaved, getAuthHeaders }) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const history = Array.isArray(entity?.notes_log) ? [...entity.notes_log].reverse() : [];

  const submit = async () => {
    if (!note.trim()) { toast.error('Please write a note'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/future-skills/${entityType}/${entity.id}/notes`,
        { note: note.trim() }, { headers: getAuthHeaders() });
      toast.success('Note added');
      setNote('');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  const displayName = entity.name || entity.student_name || entity.parent_name || entity.lead_ref || entity.trial_ref || entity.subscription_ref;
  return (
    <Modal title={`Notes — ${displayName}`} onClose={onClose} testid="notes-modal">
      <TextAreaField label="Add a note" value={note} onChange={setNote} testid="note-input" />
      <button onClick={submit} disabled={saving}
        className="mt-3 w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-note-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Note</>}
      </button>
      {history.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">All notes ({history.length})</div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs" data-testid={`note-entry-${i}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-700 text-[10px]">{h.by || '—'}</div>
                  <div className="text-slate-500">{fmtDateTime(h.at)}</div>
                </div>
                <div className="text-slate-700 mt-1 whitespace-pre-wrap">{h.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── DELETE confirm modal ────────────────────────────────────────────────
const DeleteConfirmModal = ({ entity, entityType, onClose, onSaved, getAuthHeaders }) => {
  const [saving, setSaving] = useState(false);
  const remove = async () => {
    setSaving(true);
    try {
      await axios.delete(`${API}/admin/future-skills/${entityType}/${entity.id}`, { headers: getAuthHeaders() });
      toast.success('Deleted');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };
  const label = entity.lead_ref || entity.trial_ref || entity.subscription_ref;
  return (
    <Modal title="Delete record?" onClose={onClose} testid="delete-confirm-modal">
      <p className="text-sm text-slate-600">Are you sure you want to delete <b>{label}</b>? This cannot be undone.</p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={onClose} className="py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">Cancel</button>
        <button onClick={remove} disabled={saving}
          className="py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
          data-testid="confirm-delete-btn">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
        </button>
      </div>
    </Modal>
  );
};

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CentersManager = ({ getAuthHeaders }) => {
  const [centers, setCenters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchReqs, setBatchReqs] = useState({ items: [], suggestions: [] });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // {type:'batch'|'login', center?, batch?}

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, bRes, rRes] = await Promise.all([
        axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() }),
        axios.get(`${API}/admin/future-skills/batches`, { headers: getAuthHeaders() }),
        axios.get(`${API}/admin/future-skills/batch-requests?status=open`, { headers: getAuthHeaders() }).catch(() => ({ data: { items: [], suggestions: [] } })),
      ]);
      setCenters(cRes.data?.centers || []);
      setBatches(bRes.data?.batches || []);
      setBatchReqs({ items: rRes.data?.items || [], suggestions: rRes.data?.suggestions || [] });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load');
    } finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const clearLogin = async (c) => {
    if (!window.confirm(`Remove the login for "${c.name}"?`)) return;
    try {
      await axios.patch(`${API}/admin/future-skills/centers/${c.id}/login`, { clear_login: true }, { headers: getAuthHeaders() });
      toast.success('Login removed');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const deleteBatch = async (b) => {
    if (!window.confirm(`Delete batch "${b.name}"?`)) return;
    try {
      await axios.delete(`${API}/admin/future-skills/batches/${b.id}`, { headers: getAuthHeaders() });
      toast.success('Batch deleted');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const toggleBatch = async (b) => {
    try {
      await axios.patch(`${API}/admin/future-skills/batches/${b.id}`, { is_active: !b.is_active }, { headers: getAuthHeaders() });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const totalStudents = batches.reduce((sum, b) => sum + (b.student_count || 0), 0);

  return (
    <div className="space-y-5" data-testid="centers-manager">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat icon={Building2} label="Centres"  value={centers.length} accent="#1E3A5F" active />
        <MiniStat icon={Calendar}  label="Batches"  value={batches.length} accent="#3B82F6" active />
        <MiniStat icon={Users}     label="Students" value={totalStudents}   accent="#16A34A" active />
        <MiniStat icon={Power}     label="Active batches" value={batches.filter(b => b.is_active).length} accent="#F59E0B" active />
      </div>

      {/* Parent batch-request suggestions (open demand) */}
      {(batchReqs.suggestions?.length > 0 || batchReqs.items?.length > 0) && (
        <div className="bg-amber-50/60 border-2 border-amber-100 rounded-2xl p-4" data-testid="batch-requests-panel">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-black text-amber-900">Batch requests from parents</div>
              <div className="text-[11px] text-amber-800/80">Parents who asked for a different day, time or centre — open one of these batches to convert them.</div>
            </div>
            <span className="ml-auto text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-amber-500 text-white" data-testid="batch-requests-count">
              {batchReqs.items?.length || 0} open
            </span>
          </div>

          {/* Grouped suggestions (centre + age) */}
          {batchReqs.suggestions?.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3" data-testid="batch-req-suggestions">
              {batchReqs.suggestions.slice(0, 6).map((s, i) => (
                <div key={i} className="bg-white border border-amber-200 rounded-xl p-3 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-black text-[#0F1E33] truncate">{s.center_name || 'Unknown centre'}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">{s.count} parent{s.count === 1 ? '' : 's'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Age {s.age_group || '—'}{s.sample_days?.length ? ` · Days: ${s.sample_days.join(', ')}` : ''}</div>
                </div>
              ))}
            </div>
          )}

          {/* Latest raw requests */}
          {batchReqs.items?.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-amber-50 text-amber-800">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold">Parent</th>
                    <th className="text-left px-3 py-2 font-bold">Centre</th>
                    <th className="text-left px-3 py-2 font-bold">Age</th>
                    <th className="text-left px-3 py-2 font-bold">Wants</th>
                    <th className="text-right px-3 py-2 font-bold">When</th>
                  </tr>
                </thead>
                <tbody data-testid="batch-req-list">
                  {batchReqs.items.slice(0, 6).map(r => (
                    <tr key={r.id} className="border-t border-amber-50" data-testid={`batch-req-${r.id}`}>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.parent_phone}</div>
                        {r.parent_name && <div className="text-[10px] text-slate-500">{r.parent_name}</div>}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.center_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{r.age_group || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {r.preferred_days?.length ? r.preferred_days.join(', ') : '—'}
                        {r.preferred_time ? ` · ${r.preferred_time}` : ''}
                        {r.notes ? <div className="text-[10px] text-slate-500 truncate max-w-[180px]" title={r.notes}>“{r.notes}”</div> : null}
                      </td>
                      <td className="px-3 py-2 text-right text-[10px] text-slate-500">{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setModal({ type: 'batch' })} disabled={centers.length === 0}
          className="text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
          data-testid="add-batch-btn">
          <Plus className="w-3.5 h-3.5" /> Add Batch
        </button>
        <Link to="/admin/settings?tab=centers"
          className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5"
          data-testid="manage-centres-in-settings-link">
          <Building2 className="w-3.5 h-3.5" /> Manage centres in Settings
        </Link>
      </div>

      {/* Centres list — READ ONLY (managed in Settings). Only Set Login here. */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="font-black text-[#1E3A5F] flex items-center gap-2"><Building2 className="w-4 h-4" /> Centres</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Managed under Admin → Settings → Centres. Set the Future Skills login here.</div>
          </div>
          <span className="text-xs text-slate-500">{centers.length} total</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline-block mr-2" /> Loading…</div>
        ) : centers.length === 0 ? (
          <div className="p-10 text-center text-slate-400" data-testid="no-centers-msg">
            No centres yet. Add one under <Link to="/admin/settings?tab=centers" className="text-[#1E3A5F] font-bold underline">Settings → Centres</Link>.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {centers.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50" data-testid={`center-row-${c.id}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#0F1E33] flex items-center gap-2 flex-wrap">
                    {c.name}
                    {!c.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-black">INACTIVE</span>}
                    {c.has_login && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase tracking-wider">Login set</span>}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {[c.area, c.city].filter(Boolean).join(' · ') || '—'} · {c.batch_count || 0} batch(es)
                    {c.owner_email && ` · ${c.owner_email}`}
                  </div>
                </div>
                <button onClick={() => setModal({ type: 'login', center: c })}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  data-testid={`center-set-login-${c.id}`}>
                  {c.has_login ? 'Update login' : 'Set login'}
                </button>
                {c.has_login && (
                  <button onClick={() => clearLogin(c)} title="Remove login"
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500" data-testid={`center-clear-login-${c.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batches list */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="font-black text-[#1E3A5F] flex items-center gap-2"><Calendar className="w-4 h-4" /> Batches</div>
          <span className="text-xs text-slate-500">{batches.length} total · {totalStudents} student(s)</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline-block mr-2" /> Loading…</div>
        ) : batches.length === 0 ? (
          <div className="p-10 text-center text-slate-400" data-testid="no-batches-msg">
            No batches yet. {centers.length > 0 ? 'Add one so parents can book trials.' : 'Add a centre first.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Batch</Th>
                  <Th>Centre</Th>
                  <Th>Days · Time</Th>
                  <Th>Students</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => {
                  const filled = b.student_count || 0;
                  const cap = b.capacity || 15;
                  const pct = Math.min(100, Math.round((filled / cap) * 100));
                  return (
                    <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`batch-row-${b.id}`}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F1E33]">{b.name}</div>
                        {b.skill && <div className="text-[11px] text-slate-500">{b.skill}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{b.center_name || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-700 flex items-center gap-1"><Calendar className="w-3 h-3" /> {(b.days || []).join(' · ') || '—'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {timeRange(b.start_time, b.end_time)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-[#0F1E33]">{filled} / {cap}</div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full ${pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${b.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {b.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => toggleBatch(b)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500" title="Toggle active" data-testid={`batch-toggle-${b.id}`}>
                            <Power className="w-4 h-4" />
                          </button>
                          <button onClick={() => setModal({ type: 'batch', batch: b })} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500" title="Edit" data-testid={`batch-edit-${b.id}`}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteBatch(b)} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500" title="Delete" data-testid={`batch-delete-${b.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal?.type === 'login' && (
        <CentreLoginModal center={modal.center} onClose={() => setModal(null)} onSaved={load} getAuthHeaders={getAuthHeaders} />
      )}
      {modal?.type === 'batch' && (
        <BatchFormModal batch={modal.batch} centers={centers} onClose={() => setModal(null)} onSaved={load} getAuthHeaders={getAuthHeaders} />
      )}
    </div>
  );
};

const CentreLoginModal = ({ center, onClose, onSaved, getAuthHeaders }) => {
  const [f, setF] = useState({
    owner_email: center?.owner_email || '',
    owner_name: center?.owner_name || '',
    owner_password: '',
  });
  const [saving, setSaving] = useState(false);
  const hasLogin = !!center?.owner_email;

  const submit = async () => {
    if (!f.owner_email?.trim()) { toast.error('Login email is required'); return; }
    if (!hasLogin && !f.owner_password) { toast.error('Set an initial password'); return; }
    setSaving(true);
    try {
      const payload = { owner_email: f.owner_email, owner_name: f.owner_name };
      if (f.owner_password) payload.owner_password = f.owner_password;
      await axios.patch(`${API}/admin/future-skills/centers/${center.id}/login`, payload, { headers: getAuthHeaders() });
      toast.success(hasLogin ? 'Login updated' : 'Login created');
      onSaved(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`${hasLogin ? 'Update' : 'Set'} Centre Login — ${center?.name}`} onClose={onClose} testid="centre-login-modal">
      <p className="text-xs text-slate-500 mb-4">
        This owner will log in at <span className="font-mono font-bold text-[#1E3A5F]">/admin/login</span> and see <strong>only</strong> this centre&apos;s leads, trials, customers and renewals in Future Skills CRM.
      </p>
      <FieldGroup>
        <TextField label="Owner Name" value={f.owner_name} onChange={v => setF({ ...f, owner_name: v })} testid="login-owner-name" colSpan={2} />
        <TextField label="Login Email" value={f.owner_email} onChange={v => setF({ ...f, owner_email: v })} placeholder="owner@example.com" required testid="login-owner-email" colSpan={2} />
        <TextField
          label={hasLogin ? 'New Password (leave blank to keep current)' : 'Password'}
          type="password"
          value={f.owner_password}
          onChange={v => setF({ ...f, owner_password: v })}
          placeholder={hasLogin ? '••••••••' : 'Set a strong password'}
          testid="login-owner-password"
          colSpan={2}
        />
      </FieldGroup>
      <button onClick={submit} disabled={saving}
        className="mt-4 w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-login-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {hasLogin ? 'Update Login' : 'Create Login'}</>}
      </button>
    </Modal>
  );
};

const BatchFormModal = ({ batch, centers, onClose, onSaved, getAuthHeaders }) => {
  const editing = !!batch;
  const [f, setF] = useState(batch ? { ...batch } : {
    center_id: centers[0]?.id || '', name: '', days: [], start_time: '', end_time: '',
    age_group: '', level: '', capacity: 15, is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const toggleDay = (d) => {
    setF(prev => {
      const has = prev.days?.includes(d);
      return { ...prev, days: has ? prev.days.filter(x => x !== d) : [...(prev.days || []), d] };
    });
  };

  const submit = async () => {
    if (!f.center_id) { toast.error('Pick a centre'); return; }
    if (!f.name?.trim()) { toast.error('Batch name required'); return; }
    setSaving(true);
    try {
      const payload = { ...f };
      // Backend doesn't have "skill" anymore
      delete payload.skill;
      if (editing) {
        await axios.patch(`${API}/admin/future-skills/batches/${batch.id}`, payload, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API}/admin/future-skills/batches`, payload, { headers: getAuthHeaders() });
      }
      toast.success(editing ? 'Batch updated' : 'Batch added');
      onSaved(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={editing ? 'Edit Batch' : 'Add Batch'} onClose={onClose} testid="batch-modal">
      <FieldGroup>
        <SelectField label="Centre" value={f.center_id || ''} onChange={v => setF({ ...f, center_id: v })}
          options={centers.map(c => ({ value: c.id, label: c.name }))} testid="batch-center-select" colSpan={2} />
        <TextField label="Batch Name" value={f.name || ''} onChange={v => setF({ ...f, name: v })} required placeholder="e.g. Weekend Morning" testid="batch-name-input" colSpan={2} />
        <SelectField label="Age Group" value={f.age_group || ''} onChange={v => setF({ ...f, age_group: v })}
          options={AGE_GROUP_OPTIONS} testid="batch-age-select" />
        <SelectField label="Course Level" value={f.level || ''} onChange={v => setF({ ...f, level: v })}
          options={LEVEL_OPTIONS} testid="batch-level-select" />
        <TextField label="Capacity" type="number" value={f.capacity ?? 15} onChange={v => setF({ ...f, capacity: parseInt(v) || 0 })} testid="batch-capacity-input" />
        <TextField label="Start Time" type="time" value={f.start_time || ''} onChange={v => setF({ ...f, start_time: v })} testid="batch-start-input" />
        <TextField label="End Time" type="time" value={f.end_time || ''} onChange={v => setF({ ...f, end_time: v })} testid="batch-end-input" />
      </FieldGroup>
      <div className="mt-3">
        <Label>Days</Label>
        <div className="flex flex-wrap gap-1.5">
          {DAY_OPTIONS.map(d => (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold border-2 ${
                f.days?.includes(d) ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
              data-testid={`batch-day-${d}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 mt-4 text-sm">
        <input type="checkbox" checked={f.is_active !== false} onChange={e => setF({ ...f, is_active: e.target.checked })} data-testid="batch-active-check" />
        <span className="text-slate-700 font-semibold">Active — bookable from public page</span>
      </label>
      <button onClick={submit} disabled={saving}
        className="mt-4 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="submit-batch-btn">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {editing ? 'Update Batch' : 'Save Batch'}</>}
      </button>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// REPORTS PANEL
// ═══════════════════════════════════════════════════════════════════════
const ReportsPanel = ({ getAuthHeaders, kpi = {} }) => {
  const { user } = useAuth();
  const isCenterOwner = user?.role === 'fs_center_owner';
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [centerId, setCenterId] = useState('all');
  const [month, setMonth] = useState(currentMonth);
  const [centers, setCenters] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isCenterOwner) return;
    axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() })
      .then(r => setCenters(r.data?.centers || [])).catch(() => {});
  }, [isCenterOwner, getAuthHeaders]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (centerId && centerId !== 'all') params.set('center_id', centerId);
      if (month) params.set('month', month);
      const r = await axios.get(`${API}/admin/future-skills/reports?${params}`, { headers: getAuthHeaders() });
      setData(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load reports');
    } finally { setLoading(false); }
  }, [getAuthHeaders, centerId, month]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return <div className="p-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading reports…</div>;
  }
  if (!data) return null;

  const { funnel, source_breakdown = [], batches = [], revenue = { total: 0, students: 0, per_student: 0, by_plan: [] }, lost = { leads: { total: 0, by_reason: [] }, customers: { total: 0, by_reason: [] }, trials: { total: 0, by_reason: [] } } } = data;
  const totalLeadSource = source_breakdown.reduce((s, r) => s + r.count, 0) || 1;
  const revenueByPlan = revenue.by_plan || [];
  const totalPlanCount = revenueByPlan.reduce((s, p) => s + (p.count || 0), 0) || 1;

  return (
    <div className="space-y-5" data-testid="reports-panel">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-wrap items-center gap-2">
        {!isCenterOwner && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Centre</span>
            <select value={centerId} onChange={e => setCenterId(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="reports-center-filter">
              <option value="all">All Centres</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Month</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="reports-month-filter" />
          <button onClick={() => setMonth('')}
            className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
            data-testid="reports-month-clear">
            All Time
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <BarChart3 className="w-3.5 h-3.5" />
          {month ? `Showing data for ${month}` : 'Showing lifetime data'}
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpi.revenue && <RevenueCard label="Revenue" value={fmtMoney(revenue.total)} accent="#16A34A" icon={IndianRupee} sub={`${revenue.students} paying student${revenue.students === 1 ? '' : 's'}`} testid="revenue-total" />}
        <RevenueCard label="Revenue / student" value={fmtMoney(revenue.per_student)} accent="#1E3A5F" icon={TrendingUp} testid="revenue-per-student" />
        <RevenueCard label="Active customers" value={funnel.customers} accent="#3B82F6" icon={Sparkles} testid="revenue-customers" />
      </div>

      {/* KPI Row — AOV + Profit Margin (gated by role permissions) */}
      {(kpi.aov || kpi.profit_margin) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="kpi-extras-row">
          {kpi.aov && <RevenueCard label="Avg Order Value" value={fmtMoney(revenue.aov || 0)} accent="#8B5CF6" icon={IndianRupee} sub="Revenue ÷ paying customers" testid="kpi-aov" />}
          {kpi.profit_margin && <RevenueCard
            label="Profit Margin"
            value={`${revenue.profit_margin_pct ?? 0}%`}
            accent={(revenue.profit_margin_pct ?? 0) >= 0 ? '#16A34A' : '#D63031'}
            icon={TrendingUp}
            sub={`Revenue − Centre Costs = ${fmtMoney(revenue.profit || 0)}`}
            testid="kpi-profit-margin"
          />}
        </div>
      )}

      {/* Lead Health Metrics — cost efficiency + team responsiveness. Driven
          by the `lead_metrics` block added to /admin/future-skills/reports. */}
      {data.lead_metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="lead-metrics-row">
          <RevenueCard
            label="Cost per Lead"
            value={fmtMoney(data.lead_metrics.cost_per_lead || 0)}
            accent="#F59E0B"
            icon={IndianRupee}
            sub={`${fmtMoney(data.lead_metrics.marketing_spend || 0)} spent ÷ ${funnel.leads || 0} leads`}
            testid="metric-cost-per-lead"
          />
          <RevenueCard
            label="Avg time to 1st contact"
            value={
              (data.lead_metrics.avg_first_contact_hours || 0) >= 1
                ? `${data.lead_metrics.avg_first_contact_hours} h`
                : `${data.lead_metrics.avg_first_contact_minutes || 0} min`
            }
            accent="#3B82F6"
            icon={Clock}
            sub={`Across ${data.lead_metrics.first_contact_sample || 0} contacted leads`}
            testid="metric-time-to-first-contact"
          />
          <RevenueCard
            label="No-answer leads"
            value={data.lead_metrics.no_answer_count || 0}
            accent="#F97316"
            icon={XCircle}
            sub="Marked 'No Answer' in the CRM"
            testid="metric-no-answer"
          />
          <RevenueCard
            label="Wrong numbers"
            value={data.lead_metrics.incorrect_number_count || 0}
            accent="#A855F7"
            icon={XCircle}
            sub="Marked 'Incorrect Number' in the CRM"
            testid="metric-incorrect-number"
          />
        </div>
      )}

      {/* Plan breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5" /> Revenue by plan
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {revenueByPlan.map(p => {
            const pct = Math.round(((p.count || 0) / totalPlanCount) * 100);
            return (
              <div key={p.plan} className="rounded-xl border border-slate-100 p-3" data-testid={`plan-card-${p.plan}`}>
                <div className="text-xs font-black text-[#0F1E33]">{p.label}</div>
                <div className="text-2xl font-black text-[#0F1E33] mt-1">{fmtMoney(p.revenue)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{p.count} customer{p.count === 1 ? '' : 's'} · {pct}%</div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#D63031] to-[#1E3A5F]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-3">Conversion Funnel</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpi.leads
              ? <FunnelStep label="Leads" value={funnel.leads} accent="#1E3A5F" icon={Users} />
              : <FunnelStep label="Leads" value="—" accent="#94A3B8" icon={Users} />}
            <FunnelStep label="Free Trials" value={funnel.trials} accent="#3B82F6" icon={Calendar} />
            <FunnelStep label="Active Customers" value={funnel.customers} accent="#16A34A" icon={Sparkles} />
            <FunnelStep label="Renewals" value={funnel.renewals ?? 0} accent="#8B5CF6" icon={RotateCcw} />
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {kpi.lead_to_trial
              ? <RateBadge label="Lead → Trial" pct={funnel.lead_to_trial_rate} />
              : <div className="rounded-lg bg-slate-50 border border-slate-100 p-2"><div className="text-lg font-black text-slate-300">—</div><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Lead → Trial</div></div>}
            {kpi.trial_to_paid
              ? <RateBadge label="Trial → Customer" pct={funnel.trial_to_customer_rate} />
              : <div className="rounded-lg bg-slate-50 border border-slate-100 p-2"><div className="text-lg font-black text-slate-300">—</div><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Trial → Customer</div></div>}
            {(kpi.leads && kpi.trial_to_paid)
              ? <RateBadge label="Lead → Customer" pct={funnel.lead_to_customer_rate} />
              : <div className="rounded-lg bg-slate-50 border border-slate-100 p-2"><div className="text-lg font-black text-slate-300">—</div><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Lead → Customer</div></div>}
            <RateBadge label="Customer → Renewed" pct={funnel.customer_to_renewed_rate ?? 0} />
          </div>
        </div>

        {/* Source breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-1.5"><PieChart className="w-3.5 h-3.5" /> Source of Leads</div>
          {source_breakdown.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No lead sources logged yet.</div>
          ) : (
            <div className="space-y-2.5">
              {source_breakdown.map(row => {
                const pct = Math.round((row.count / totalLeadSource) * 100);
                return (
                  <div key={row.source} data-testid={`source-row-${row.source}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0F1E33]">{row.source}</span>
                      <span className="text-slate-500">{row.count} · {pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-gradient-to-r from-[#D63031] to-[#1E3A5F]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Batches */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="font-black text-[#1E3A5F] flex items-center gap-2"><Target className="w-4 h-4" /> Batch performance</div>
          <span className="text-xs text-slate-500">{batches.length} batches</span>
        </div>
        {batches.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Add a batch under Centres & Batches to see numbers here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Batch</Th>
                  <Th>Centre</Th>
                  <Th>Day · Time</Th>
                  <Th>Active / Cap</Th>
                  <Th>Free Trials</Th>
                  <Th>Leads at centre</Th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id} className="border-t border-slate-100" data-testid={`batch-report-${b.id}`}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0F1E33]">{b.name}</div>
                      <div className="text-[11px] text-slate-500 flex gap-2 flex-wrap">
                        {b.age_group && <span>Age {b.age_group}</span>}
                        {b.level && <span className="capitalize">{b.level}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{b.center_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div>{(b.days || []).join(' · ') || '—'}</div>
                      <div className="text-[11px] text-slate-500">{timeRange(b.start_time, b.end_time)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-[#0F1E33]">{b.active_count} / {b.capacity}</div>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full ${b.fill_pct >= 100 ? 'bg-rose-500' : b.fill_pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, b.fill_pct)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-blue-700">{b.trials_count}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{b.leads_at_centre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lost breakdowns — leads & customers with reason charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LostReasonPanel
          title="Lost Leads"
          subtitle="Why leads didn't convert"
          data={lost.leads || { total: 0, by_reason: [] }}
          accent="#D63031"
          icon={UserX}
          testid="lost-leads-panel"
        />
        <LostReasonPanel
          title="Lost Customers"
          subtitle="Why customers left"
          data={lost.customers || { total: 0, by_reason: [] }}
          accent="#8B5CF6"
          icon={XCircle}
          testid="lost-customers-panel"
        />
      </div>
    </div>
  );
};

// Reusable panel that renders a "Lost X" tile with total + horizontal bar
// chart for the top reasons. Empty-state is a friendly single line so the
// section never looks broken when the collection has zero lost rows.
const LostReasonPanel = ({ title, subtitle, data, accent, icon: Icon, testid }) => {
  const rows = (data?.by_reason || []).slice(0, 8);
  const total = data?.total || 0;
  const max   = rows.reduce((m, r) => Math.max(m, r.count || 0), 0) || 1;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid={testid}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" /> {title}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: accent }}>{total}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">total lost</div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">No losses logged in this period.</div>
      ) : (
        <div className="space-y-2.5">
          {rows.map(row => {
            const pct = Math.round((row.count / total) * 100);
            const bar = Math.round((row.count / max) * 100);
            return (
              <div key={row.reason} data-testid={`${testid}-row-${row.reason.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F1E33] truncate max-w-[70%]" title={row.reason}>{row.reason}</span>
                  <span className="text-slate-500 font-semibold whitespace-nowrap">{row.count} · {pct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${bar}%`, background: accent }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RevenueCard = ({ icon: Icon, label, value, accent, sub, testid }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3" data-testid={testid}>
    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-xl font-black text-[#0F1E33]">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  </div>
);

const FunnelStep = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-xl border border-slate-100 p-3 text-center" style={{ background: `${accent}08` }}>
    <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-1" style={{ background: `${accent}18`, color: accent }}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="text-2xl font-black text-[#0F1E33]">{value}</div>
    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
  </div>
);

const RateBadge = ({ label, pct }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
    <div className="text-lg font-black text-[#0F1E33]">{pct}%</div>
    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// CENTRE ECONOMICS PANEL — track direct costs per centre; auto-mirrors
// every entry into main /admin/expenses via program_key=future_skills.
// ═══════════════════════════════════════════════════════════════════════
const CATEGORY_META = [
  { key: 'rent',           label: 'Rent',             color: '#1E3A5F' },
  { key: 'teacher_cost',   label: 'Teacher Cost',     color: '#3B82F6' },
  { key: 'capex',          label: 'Capex',            color: '#8B5CF6' },
  { key: 'marketing',      label: 'Marketing',        color: '#D63031' },
  { key: 'printing_gifts', label: 'Printing & Gifts', color: '#F59E0B' },
  { key: 'logistics',      label: 'Logistics Cost',   color: '#10B981' },
  { key: 'other',          label: 'Other',            color: '#64748B' },
];

const EconField = ({ label, children }) => (
  <div>
    <Label>{label}</Label>
    {children}
  </div>
);

const CentreEconomicsPanel = ({ getAuthHeaders }) => {
  const { user } = useAuth();
  const isCenterOwner = user?.role === 'fs_center_owner';
  const [centerId, setCenterId] = useState('all');
  const [month, setMonth] = useState('');  // default to "All Time" so historical entries show up
  const [centers, setCenters] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { type: 'add' | 'edit', entry?: ... }
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (isCenterOwner) return;
    axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() })
      .then(r => setCenters(r.data?.centers || [])).catch(() => {});
  }, [isCenterOwner, getAuthHeaders]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (centerId && centerId !== 'all') params.set('center_id', centerId);
      if (month) params.set('month', month);
      const r = await axios.get(`${API}/admin/future-skills/centre-economics?${params}`, { headers: getAuthHeaders() });
      setData(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load economics');
    } finally { setLoading(false); }
  }, [getAuthHeaders, centerId, month]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (entryId) => {
    try {
      await axios.delete(`${API}/admin/future-skills/centre-economics/entry/${entryId}`, { headers: getAuthHeaders() });
      toast.success('Entry deleted');
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  if (loading && !data) {
    return <div className="p-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading centre economics…</div>;
  }
  if (!data) return null;

  const { entries = [], summary = {}, per_centre = [] } = data;
  const costByCat = summary.cost_by_category || {};
  const showPerCentre = !isCenterOwner && (centerId === 'all') && per_centre.length > 0;

  return (
    <div className="space-y-5" data-testid="centre-economics-panel">
      {/* Filters + Add */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-wrap items-center gap-2">
        {!isCenterOwner && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Centre</span>
            <select value={centerId} onChange={e => setCenterId(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="economics-center-filter">
              <option value="all">All Centres</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Month</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="economics-month-filter" />
          <button onClick={() => setMonth('')}
            className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
            data-testid="economics-month-clear">
            All Time
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setModal({ type: 'add' })}
            className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center gap-1.5"
            data-testid="add-economics-btn">
            <Plus className="w-3.5 h-3.5" /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary cards: Revenue · Cost · Profit · Margin */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RevenueCard label="Revenue" value={fmtMoney(summary.revenue || 0)} accent="#16A34A" icon={IndianRupee} sub={`${summary.paying_customers || 0} paying`} testid="econ-revenue" />
        <RevenueCard label="Total Costs" value={fmtMoney(summary.cost || 0)} accent="#D63031" icon={TrendingUp} testid="econ-cost" />
        <RevenueCard label="Profit"
          value={fmtMoney(summary.profit || 0)}
          accent={(summary.profit || 0) >= 0 ? '#16A34A' : '#D63031'}
          icon={IndianRupee} testid="econ-profit" />
        <RevenueCard label="Margin"
          value={`${summary.margin_pct ?? 0}%`}
          accent={(summary.margin_pct ?? 0) >= 0 ? '#16A34A' : '#D63031'}
          icon={TrendingUp} testid="econ-margin" />
      </div>

      {/* Cost by category */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5" /> Cost by category
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {CATEGORY_META.map(cat => {
            const c = costByCat[cat.key] || { label: cat.label, amount: 0 };
            const pct = summary.cost > 0 ? Math.round((c.amount / summary.cost) * 100) : 0;
            return (
              <div key={cat.key} className="rounded-xl border border-slate-100 p-3" data-testid={`econ-cat-${cat.key}`}>
                <div className="text-xs font-black text-[#0F1E33]">{cat.label}</div>
                <div className="text-xl font-black text-[#0F1E33] mt-1">{fmtMoney(c.amount)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{pct}%</div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full" style={{ width: `${pct}%`, background: cat.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-centre roll-up */}
      {showPerCentre && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-black text-[#1E3A5F] flex items-center gap-2">
            <Target className="w-4 h-4" /> Per-centre P&L
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Centre</Th>
                  <Th className="text-right">Revenue</Th>
                  <Th className="text-right">Cost</Th>
                  <Th className="text-right">Profit</Th>
                  <Th className="text-right">Margin</Th>
                </tr>
              </thead>
              <tbody>
                {per_centre.map(r => (
                  <tr key={r.center_id} className="border-t border-slate-100" data-testid={`econ-centre-row-${r.center_id}`}>
                    <td className="px-4 py-3 font-bold text-[#0F1E33]">{r.center_name}</td>
                    <td className="px-4 py-3 text-right">{fmtMoney(r.revenue)}</td>
                    <td className="px-4 py-3 text-right">{fmtMoney(r.cost)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmtMoney(r.profit)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.margin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{r.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entries table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="font-black text-[#1E3A5F] flex items-center gap-2">
            <FileText className="w-4 h-4" /> Expense entries
          </div>
          <span className="text-xs text-slate-500">{entries.length} entries</span>
        </div>
        {entries.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm" data-testid="econ-empty">
            No centre expenses yet. Click &quot;Add Expense&quot; to log Rent, Teacher Cost, Capex, Marketing or Other.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Date</Th>
                  <Th>Centre</Th>
                  <Th>Category</Th>
                  <Th>Description / Vendor</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const meta = CATEGORY_META.find(c => c.key === e.fs_category) || CATEGORY_META[4];
                  return (
                    <tr key={e.id} className="border-t border-slate-100" data-testid={`econ-row-${e.id}`}>
                      <td className="px-4 py-3 text-xs text-slate-700">{fmtDate(e.expense_date)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-[#0F1E33]">{e.fs_center_name || '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="inline-block px-2 py-1 rounded-md font-bold text-white" style={{ background: meta.color }}>
                          {e.fs_category_label || meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <div>{e.description || <span className="text-slate-400">—</span>}</div>
                        {e.vendor_name && <div className="text-[11px] text-slate-500">{e.vendor_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#0F1E33]">{fmtMoney(e.amount)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setModal({ type: 'edit', entry: e })}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-[#1E3A5F]"
                          data-testid={`econ-edit-${e.id}`}
                          title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(e)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                          data-testid={`econ-delete-${e.id}`}
                          title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <CentreEconomicsModal
          type={modal.type}
          entry={modal.entry}
          centers={isCenterOwner ? [] : centers}
          defaultCenterId={isCenterOwner ? '' : (centerId !== 'all' ? centerId : '')}
          onClose={() => setModal(null)}
          onSaved={(savedEntry) => {
            setModal(null);
            // If the entry's month falls outside the current month filter,
            // auto-jump the filter so the user actually sees what they added.
            const entryMonth = (savedEntry?.expense_date || '').slice(0, 7);
            if (month && entryMonth && entryMonth !== month) {
              setMonth(entryMonth); // triggers re-fetch via useEffect
            } else {
              load();
            }
          }}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal title="Delete entry?" onClose={() => setConfirmDelete(null)}>
          <div className="text-sm text-slate-600 mb-4">
            This will remove {fmtMoney(confirmDelete.amount)} · {confirmDelete.fs_category_label} from Centre Economics
            <b> and</b> the main Expenses ledger. Continue?
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700">
              Cancel
            </button>
            <button onClick={() => handleDelete(confirmDelete.id)} className="text-xs px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold" data-testid="econ-confirm-delete">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const CentreEconomicsModal = ({ type, entry, centers, defaultCenterId, onClose, onSaved, getAuthHeaders }) => {
  const isEdit = type === 'edit';
  const [form, setForm] = useState({
    center_id:   entry?.fs_center_id  || defaultCenterId || '',
    category:    entry?.fs_category   || 'rent',
    amount:      entry?.amount ? String(entry.amount) : '',
    expense_date: entry?.expense_date || new Date().toISOString().slice(0, 10),
    description: entry?.description || '',
    vendor_name: entry?.vendor_name || '',
    other_label: (entry?.fs_category === 'other' ? entry?.fs_category_label : '') || '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!isEdit && !form.center_id) { toast.error('Pick a centre'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter an amount'); return; }
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        amount: Number(form.amount),
        expense_date: form.expense_date,
        description: form.description,
        vendor_name: form.vendor_name,
        other_label: form.other_label,
      };
      if (!isEdit) payload.center_id = form.center_id;
      let savedEntry;
      if (isEdit) {
        await axios.patch(`${API}/admin/future-skills/centre-economics/${entry.id}`, payload, { headers: getAuthHeaders() });
        savedEntry = { ...entry, ...payload };
        toast.success('Entry updated');
      } else {
        const r = await axios.post(`${API}/admin/future-skills/centre-economics`, payload, { headers: getAuthHeaders() });
        savedEntry = r.data?.entry || payload;
        toast.success('Entry added & mirrored to main Expenses');
      }
      onSaved(savedEntry);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? 'Edit Centre Expense' : 'Add Centre Expense'} onClose={onClose} testid="economics-modal">
      <div className="space-y-3">
        {!isEdit && (
          <EconField label="Centre *">
            <select value={form.center_id} onChange={e => setForm({ ...form, center_id: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={!!defaultCenterId && centers.length === 0}
              data-testid="econ-modal-center">
              <option value="">Select centre…</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </EconField>
        )}
        <EconField label="Category *">
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="econ-modal-category">
            {CATEGORY_META.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </EconField>
        {form.category === 'other' && (
          <EconField label="Custom label (Other)">
            <input type="text" value={form.other_label}
              onChange={e => setForm({ ...form, other_label: e.target.value })}
              placeholder="e.g. Snacks, Signage, Utilities…"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="econ-modal-other-label" />
          </EconField>
        )}
        <div className="grid grid-cols-2 gap-3">
          <EconField label="Amount (₹) *">
            <input type="number" min="0" step="1" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="econ-modal-amount" />
          </EconField>
          <EconField label="Date">
            <input type="date" value={form.expense_date}
              onChange={e => setForm({ ...form, expense_date: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="econ-modal-date" />
          </EconField>
        </div>
        <EconField label="Description">
          <textarea rows={2} value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Optional notes…"
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="econ-modal-description" />
        </EconField>
        <EconField label="Vendor">
          <input type="text" value={form.vendor_name}
            onChange={e => setForm({ ...form, vendor_name: e.target.value })}
            placeholder="Landlord, tutor, agency…"
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="econ-modal-vendor" />
        </EconField>
        <div className="text-[11px] text-slate-500 flex items-start gap-1.5 bg-blue-50 border border-blue-100 rounded-lg p-2">
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
          <span>This entry will also appear in <b>Admin → Expenses</b> under the linked category so P&amp;L rollups stay unified.</span>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700" data-testid="econ-modal-cancel">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
            data-testid="econ-modal-submit">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </div>
    </Modal>
  );
};



// ═══════════════════════════════════════════════════════════════════════
// BATCH REQUESTS PANEL — parent requests for a different day/time/centre
// ═══════════════════════════════════════════════════════════════════════
const BATCH_REQ_STATUSES = [
  { key: '',          label: 'All',        accent: 'slate' },
  { key: 'open',      label: 'Open',       accent: 'amber' },
  { key: 'contacted', label: 'Contacted',  accent: 'blue' },
  { key: 'resolved',  label: 'Resolved',   accent: 'emerald' },
  { key: 'dropped',   label: 'Dropped',    accent: 'rose' },
];

const BATCH_REQ_STATUS_STYLES = {
  open:      { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-200' },
  contacted: { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-200' },
  resolved:  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  dropped:   { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-200' },
};

const BatchRequestsPanel = ({ getAuthHeaders }) => {
  const [status, setStatus] = useState('open');
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('limit', '500');
      const r = await axios.get(`${API}/admin/future-skills/batch-requests?${params}`, { headers: getAuthHeaders() });
      setItems(r.data?.items || []);
      setSuggestions(r.data?.suggestions || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not load requests');
    } finally { setLoading(false); }
  }, [status, getAuthHeaders]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(r => (
      (r.parent_phone || '').toLowerCase().includes(term) ||
      (r.parent_name  || '').toLowerCase().includes(term) ||
      (r.center_name  || '').toLowerCase().includes(term) ||
      (r.city         || '').toLowerCase().includes(term) ||
      (r.notes        || '').toLowerCase().includes(term)
    ));
  }, [items, q]);

  const setStatusFor = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await axios.patch(`${API}/admin/future-skills/batch-requests/${id}`, { status: newStatus }, { headers: getAuthHeaders() });
      toast.success(`Marked ${newStatus}`);
      // Optimistic update; then reload for aggregate counts
      setItems(prev => prev.map(x => x.id === id ? { ...x, status: newStatus } : x));
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Update failed');
    } finally { setUpdatingId(''); }
  };

  const statusCounts = useMemo(() => {
    const c = { open: 0, contacted: 0, resolved: 0, dropped: 0 };
    for (const it of items) if (c[it.status] !== undefined) c[it.status] += 1;
    return c;
  }, [items]);

  return (
    <div className="space-y-5" data-testid="batch-requests-panel-tab">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-700 font-black">Parent Preferences</div>
            <h2 className="text-lg font-black text-[#0F1E33] mt-1">Batch Requests</h2>
            <p className="text-xs text-slate-500 max-w-xl mt-0.5">
              Parents who tapped &ldquo;Request a different day, time or centre&rdquo; from the booking flow.
              Contact them, open the matching batch, and mark resolved so demand doesn&apos;t pile up.
            </p>
          </div>
          <button onClick={load}
            className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5"
            data-testid="batch-req-refresh">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Status filter pills */}
        <div className="mt-4 flex flex-wrap gap-2" data-testid="batch-req-status-tabs">
          {BATCH_REQ_STATUSES.map(s => {
            const active = status === s.key;
            const count = s.key ? statusCounts[s.key] : items.length;
            return (
              <button key={s.key || 'all'} onClick={() => setStatus(s.key)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold border-2 flex items-center gap-1.5 ${
                  active ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
                data-testid={`batch-req-tab-${s.key || 'all'}`}>
                {s.label}
                {status === '' || s.key === '' ? null : null}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search phone, centre, city…"
                className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 w-56"
                data-testid="batch-req-search" />
            </div>
          </div>
        </div>
      </div>

      {/* Aggregated demand suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-amber-50/60 border-2 border-amber-100 rounded-2xl p-4" data-testid="batch-req-suggestions-strip">
          <div className="text-[10px] uppercase tracking-widest text-amber-800 font-black mb-2">
            Hot demand — open a batch here
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {suggestions.slice(0, 6).map((s, i) => (
              <div key={i} className="bg-white border border-amber-200 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-black text-[#0F1E33] truncate">{s.center_name || 'Unknown centre'}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {s.count} parent{s.count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Age {s.age_group || '—'}{s.sample_days?.length ? ` · ${s.sample_days.join(', ')}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-12 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline-block mr-2" /> Loading requests…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm" data-testid="batch-req-empty">
            No {status ? `${status} ` : ''}requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Parent</Th>
                  <Th>Age</Th>
                  <Th>Centre / City</Th>
                  <Th>Wants</Th>
                  <Th>Status</Th>
                  <Th>When</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody data-testid="batch-req-list">
                {filtered.map(r => {
                  const stStyle = BATCH_REQ_STATUS_STYLES[r.status] || BATCH_REQ_STATUS_STYLES.open;
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-blue-50/30" data-testid={`batch-req-row-${r.id}`}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-bold text-[#0F1E33] flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {r.parent_phone}
                        </div>
                        {r.parent_name && <div className="text-[11px] text-slate-500 mt-0.5">{r.parent_name}</div>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {r.age_group ? (
                          <span className="inline-block text-[11px] font-bold px-2 py-1 rounded-full bg-violet-100 text-violet-800">
                            {r.age_group}
                          </span>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-700">
                        <div className="font-semibold text-[#1E3A5F]">{r.center_name || '—'}</div>
                        {r.city && <div className="text-[11px] text-slate-500">{r.city}</div>}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-700 max-w-[280px]">
                        <div className="font-semibold">
                          {r.preferred_days?.length ? r.preferred_days.join(', ') : '—'}
                          {r.preferred_time ? ` · ${r.preferred_time}` : ''}
                        </div>
                        {r.notes && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2" title={r.notes}>
                            &ldquo;{r.notes}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-block text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${stStyle.bg} ${stStyle.text} ${stStyle.border}`}
                          data-testid={`batch-req-status-${r.id}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-[11px] text-slate-500 whitespace-nowrap">
                        {fmtDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-1.5" data-testid={`batch-req-actions-${r.id}`}>
                          <a href={`https://wa.me/91${r.parent_phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi ${r.parent_name || 'there'}, this is OLL Future Skills — you asked for a batch preference. When's a good time to chat?`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[10px] px-2 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold flex items-center gap-1"
                            data-testid={`batch-req-wa-${r.id}`}>
                            <Phone className="w-3 h-3" /> WhatsApp
                          </a>
                          {r.status !== 'contacted' && r.status !== 'resolved' && r.status !== 'dropped' && (
                            <button onClick={() => setStatusFor(r.id, 'contacted')} disabled={updatingId === r.id}
                              className="text-[10px] px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold disabled:opacity-60"
                              data-testid={`batch-req-contacted-${r.id}`}>
                              Mark contacted
                            </button>
                          )}
                          {r.status !== 'resolved' && (
                            <button onClick={() => setStatusFor(r.id, 'resolved')} disabled={updatingId === r.id}
                              className="text-[10px] px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-60"
                              data-testid={`batch-req-resolved-${r.id}`}>
                              Resolved
                            </button>
                          )}
                          {r.status !== 'dropped' && r.status !== 'resolved' && (
                            <button onClick={() => setStatusFor(r.id, 'dropped')} disabled={updatingId === r.id}
                              className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-60"
                              data-testid={`batch-req-dropped-${r.id}`}>
                              Drop
                            </button>
                          )}
                          {(r.status === 'resolved' || r.status === 'dropped') && (
                            <button onClick={() => setStatusFor(r.id, 'open')} disabled={updatingId === r.id}
                              className="text-[10px] px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-60"
                              data-testid={`batch-req-reopen-${r.id}`}>
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════
// SOURCE LINKS PANEL — trackable landing-page links with per-source metrics
// ═══════════════════════════════════════════════════════════════════════
const SourceLinksPanel = ({ getAuthHeaders }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/future-skills/source-links`, { headers: getAuthHeaders() });
      setLinks(r.data?.source_links || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load');
    } finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!name.trim()) { toast.error('Source name is required'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/future-skills/source-links`,
        { name: name.trim(), slug: slug.trim(), notes: notes.trim() },
        { headers: getAuthHeaders() });
      toast.success('Source link created');
      setShowAdd(false); setName(''); setSlug(''); setNotes('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create');
    } finally { setSaving(false); }
  };

  const remove = async (link) => {
    try {
      await axios.delete(`${API}/admin/future-skills/source-links/${link.id}`, { headers: getAuthHeaders() });
      toast.success('Source link deleted');
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const copy = (url) => {
    navigator.clipboard?.writeText(url).then(() => toast.success('Link copied to clipboard'));
  };

  return (
    <div className="space-y-5" data-testid="sources-panel">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-slate-600 max-w-2xl">
            Create shareable landing-page URLs like <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">/future-skills/s/instagram-reels</code>.
            Every lead, free trial and paying customer that comes through a link is auto-tagged with the source name — so you always know what channel drove the conversion.
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center gap-1.5"
          data-testid="add-source-btn">
          <Plus className="w-3.5 h-3.5" /> New Source Link
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading && links.length === 0 ? (
          <div className="p-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading…</div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center text-slate-400" data-testid="sources-empty">
            No source links yet. Create your first one to start tracking channels.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <Th>Source</Th>
                  <Th>Link</Th>
                  <Th className="text-center">Views</Th>
                  <Th className="text-center">Leads</Th>
                  <Th className="text-center">Trials</Th>
                  <Th className="text-center">Conversions</Th>
                  <Th className="text-center">Lost</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {links.map(l => {
                  const url = `${origin}/future-skills/s/${l.slug}`;
                  const m = l.metrics || {};
                  return (
                    <tr key={l.id} className="border-t border-slate-100 hover:bg-blue-50/40" data-testid={`source-row-${l.slug}`}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F1E33]">{l.name}</div>
                        {l.notes && <div className="text-[11px] text-slate-500 mt-0.5">{l.notes}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-slate-700 break-all max-w-xs">/future-skills/s/{l.slug}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">created {fmtDate(l.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-[#0F1E33]">{m.views || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#1E3A5F]">{m.leads || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-700">{m.trials || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-700">{m.converted || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-700">{m.lost || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => copy(url)}
                            className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1"
                            data-testid={`copy-source-${l.slug}`} title="Copy link">
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold flex items-center gap-1"
                            data-testid={`open-source-${l.slug}`} title="Open link">
                            <Eye className="w-3 h-3" /> Open
                          </a>
                          <button onClick={() => setConfirmDelete(l)}
                            className="text-[10px] px-2 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold flex items-center gap-1"
                            data-testid={`delete-source-${l.slug}`} title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="New Source Link" onClose={() => setShowAdd(false)} testid="add-source-modal">
          <FieldGroup>
            <TextField label="Source name" value={name} onChange={setName} required
              placeholder="e.g. Instagram Reels" colSpan={2} testid="source-name-input" />
            <TextField label="Custom slug (optional)" value={slug} onChange={setSlug}
              placeholder="auto-generated from name" colSpan={2} testid="source-slug-input" />
          </FieldGroup>
          {(slug || name) && (
            <div className="mt-2 text-[11px] text-slate-500">
              URL preview: <span className="font-mono text-slate-700">{origin}/future-skills/s/{(slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'src'}</span>
            </div>
          )}
          <div className="mt-3">
            <TextAreaField label="Notes (optional)" value={notes} onChange={setNotes} testid="source-notes-input" />
          </div>
          <button onClick={submit} disabled={saving}
            className="mt-4 w-full py-3 rounded-xl bg-[#1E3A5F] text-white font-bold hover:bg-[#0F1E33] disabled:opacity-60 flex items-center justify-center gap-2"
            data-testid="submit-source-btn">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Create Source Link</>}
          </button>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete source link?" onClose={() => setConfirmDelete(null)} testid="delete-source-modal">
          <p className="text-sm text-slate-600">
            Deleting <b>{confirmDelete.name}</b> will stop future tracking, but existing leads/trials
            tagged with this source will keep the source name.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => setConfirmDelete(null)}
              className="py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
              Cancel
            </button>
            <button onClick={() => remove(confirmDelete)}
              className="py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              data-testid="confirm-delete-source-btn">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// IMPORT CUSTOMERS MODAL
// ═══════════════════════════════════════════════════════════════════════
const ImportCustomersModal = ({ onClose, onImported, getAuthHeaders }) => {
  const [centers, setCenters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [f, setF] = useState({ center_id: '', batch_id: '', plan: 'monthly' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axios.get(`${API}/admin/future-skills/centers`, { headers: getAuthHeaders() })
      .then(r => setCenters(r.data?.centers || []));
    axios.get(`${API}/admin/future-skills/batches`, { headers: getAuthHeaders() })
      .then(r => setBatches(r.data?.batches || []));
  }, [getAuthHeaders]);

  const batchesForCenter = f.center_id ? batches.filter(b => b.center_id === f.center_id) : [];

  const downloadSample = () => {
    const csv = 'parent_name,parent_phone,parent_email,student_name,age,amount_paid,payment_date,notes\nRahul Kapoor,9812345600,rahul@x.com,Aarav Kapoor,9,2000,2026-07-01,Interested in AI\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'future-skills-customers-sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!f.center_id) { toast.error('Pick a centre'); return; }
    if (!file) { toast.error('Choose a CSV or Excel file'); return; }
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('center_id', f.center_id);
    if (f.batch_id) fd.append('batch_id', f.batch_id);
    fd.append('plan', f.plan);
    try {
      const r = await axios.post(`${API}/admin/future-skills/customers/import`, fd, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Imported ${r.data.inserted} customers, skipped ${r.data.skipped}`);
      onImported();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Import failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal title="Import Active Customers" onClose={onClose} testid="import-customers-modal">
      <p className="text-sm text-slate-600 mb-4">Upload a <strong>.csv</strong>, <strong>.xlsx</strong> or <strong>.xls</strong>. Every row will be added to the centre and batch chosen below. Duplicates (same phone in this centre) are skipped.</p>

      <FieldGroup>
        <SelectField label="Centre" value={f.center_id} onChange={v => setF({ ...f, center_id: v, batch_id: '' })}
          options={[{ value: '', label: 'Select a centre…' }, ...centers.map(c => ({ value: c.id, label: c.name }))]}
          testid="import-cust-center-select" colSpan={2} />
        <SelectField label="Batch (optional)" value={f.batch_id} onChange={v => setF({ ...f, batch_id: v })}
          options={[
            { value: '', label: f.center_id ? (batchesForCenter.length ? 'Select a batch…' : 'No batches at this centre') : 'Pick a centre first' },
            ...batchesForCenter.map(b => ({
              value: b.id,
              label: `${b.name} · ${(b.days || []).join('/')} ${timeRange(b.start_time, b.end_time)}`,
            })),
          ]}
          testid="import-cust-batch-select" colSpan={2} />
        <SelectField label="Plan" value={f.plan} onChange={v => setF({ ...f, plan: v })}
          options={PLAN_OPTIONS} testid="import-cust-plan-select" colSpan={2} />
      </FieldGroup>

      <div className="bg-slate-50 rounded-lg p-3 my-4 text-xs text-slate-600">
        <div className="font-bold mb-1">Supported columns:</div>
        <div className="font-mono">parent_phone*, parent_name, parent_email, student_name, age, amount_paid, payment_date, renewal_date, notes</div>
        <div className="mt-1 text-slate-500">* required · amount_paid defaults to plan price · dates auto-computed</div>
      </div>

      <button onClick={downloadSample}
        className="mb-3 text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5"
        data-testid="download-cust-sample-btn">
        <Download className="w-3.5 h-3.5" /> Download sample CSV
      </button>

      <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full text-sm border border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:border-blue-400"
        data-testid="import-cust-file-input" />

      <button onClick={submit} disabled={busy || !f.center_id || !file}
        className="mt-4 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        data-testid="submit-import-cust-btn">
        {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4" /> Import Customers</>}
      </button>
    </Modal>
  );
};




// ═══════════════════════════════════════════════════════════════════════
// PAYMENT LINK MODAL — generates a Cashfree checkout link for a specific
// child (from a trial or an existing renewal subscription) with an
// optional discount %. The link is shareable via WhatsApp so parents can
// pay from their own device without re-entering child / age / batch info.
// ═══════════════════════════════════════════════════════════════════════
const PaymentLinkModal = ({ trial, customer, onClose, getAuthHeaders }) => {
  const entity = trial || customer;
  const [plan, setPlan] = useState('monthly');
  const [discount, setDiscount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const PLAN_PRICES = { monthly: 2500, half_yearly: 13500, yearly: 24000 };
  const grossAmount = PLAN_PRICES[plan] || 0;
  const netAmount = Math.round(grossAmount * (1 - (discount || 0) / 100));

  // White-labeled shareable URL built from the token returned by the backend.
  // Falls back to the raw Cashfree link if a legacy response (no token) comes back.
  const shareableLink = result?.token
    ? `${window.location.origin}/pay/${result.token}`
    : (result?.payment_link || '');

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const body = {
        plan,
        discount_pct: Number(discount) || 0,
      };
      if (trial)    body.trial_id        = trial.id;
      if (customer) body.subscription_id = customer.id;
      const r = await axios.post(`${API}/admin/future-skills/payment-link`, body, { headers: getAuthHeaders() });
      setResult(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate link');
    } finally { setGenerating(false); }
  };

  const copyLink = async () => {
    if (!shareableLink) return;
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast.success('Payment link copied');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy failed — long-press the link to copy manually');
    }
  };

  const shareOnWhatsApp = () => {
    if (!shareableLink) return;
    const student = entity?.student_name || 'your child';
    const msg = encodeURIComponent(
      `Hi! Here's the payment link for ${student}'s Future Skills enrolment (${result.plan_label} · ₹${result.amount}):\n\n${shareableLink}\n\n— Team OLL`
    );
    const phone = (entity?.parent_phone || '').replace(/\D/g, '').slice(-10);
    const url = phone ? `https://wa.me/91${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <Modal title="Custom Payment Link" onClose={onClose} testid="payment-link-modal">
      {/* Child summary — batch/centre already known, no picker needed */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 mb-4">
        <div className="text-[10px] uppercase tracking-widest text-blue-700 font-bold">For</div>
        <div className="font-black text-[#0F1E33]">{entity?.student_name || '—'}</div>
        <div className="text-xs text-slate-600 mt-0.5">
          {entity?.age_group ? `${entity.age_group} yrs · ` : ''}
          {entity?.center_name || entity?.preferred_center || '—'}
          {entity?.batch_name ? ` · ${entity.batch_name}` : ''}
        </div>
        {entity?.parent_phone && (
          <div className="text-[11px] text-slate-500 mt-0.5">Parent: {entity.parent_phone}</div>
        )}
      </div>

      <Label>Plan *</Label>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { key: 'monthly',     label: 'Monthly',     sub: '₹2,500/mo' },
          { key: 'half_yearly', label: 'Half Yearly', sub: '₹13,500' },
          { key: 'yearly',      label: 'Yearly',      sub: '₹24,000' },
        ].map(p => (
          <button key={p.key} type="button" onClick={() => setPlan(p.key)}
            className={`p-2.5 rounded-xl border-2 text-left transition-all ${
              plan === p.key ? 'border-[#1E3A5F] bg-blue-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'
            }`}
            data-testid={`paylink-plan-${p.key}`}>
            <div className="text-xs font-black text-[#0F1E33]">{p.label}</div>
            <div className="text-[11px] text-slate-500">{p.sub}</div>
          </button>
        ))}
      </div>

      <Label>Discount %</Label>
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        {[0, 5, 10, 15, 20, 25].map(pct => (
          <button key={pct} type="button" onClick={() => setDiscount(pct)}
            className={`text-xs py-2 rounded-lg font-bold ${
              Number(discount) === pct ? 'bg-[#D63031] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            data-testid={`paylink-discount-${pct}`}>
            {pct}%
          </button>
        ))}
      </div>
      <input type="number" min="0" max="90" value={discount}
        onChange={e => setDiscount(Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
        placeholder="Custom % (0-90)"
        className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
        data-testid="paylink-discount-input" />

      <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center justify-between" data-testid="paylink-amount-preview">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">You&apos;ll charge</div>
          <div className="text-2xl font-black text-[#0F1E33]">
            ₹{netAmount.toLocaleString()}
            {Number(discount) > 0 && (
              <span className="text-sm text-slate-400 font-semibold ml-2 line-through">₹{grossAmount.toLocaleString()}</span>
            )}
          </div>
        </div>
        <button onClick={generate} disabled={generating}
          className="text-xs px-4 py-2.5 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center gap-1.5 disabled:opacity-60"
          data-testid="paylink-generate-btn">
          {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : <><LinkIcon className="w-3.5 h-3.5" /> Generate link</>}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-3 border-2 border-emerald-200 bg-emerald-50/60 rounded-xl" data-testid="paylink-result">
          <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold mb-1">Payment link (OLL-branded)</div>
          <div className="text-xs font-mono break-all text-slate-700 bg-white rounded-lg p-2 border border-emerald-100" data-testid="paylink-url">
            {shareableLink}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={copyLink}
              className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] hover:bg-[#0F1E33] text-white font-bold flex items-center gap-1.5"
              data-testid="paylink-copy-btn">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
            </button>
            <button onClick={shareOnWhatsApp}
              className="text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
              data-testid="paylink-whatsapp-btn">
              Share on WhatsApp
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};



export default AdminFutureSkills;
