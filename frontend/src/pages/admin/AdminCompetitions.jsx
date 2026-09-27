import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Trophy, Building2, GraduationCap, User, Download, Upload, Search,
  Mail, Phone, MapPin, Loader2, ExternalLink, Pencil, Trash2, Link2, Plus, Copy, X,
  Layers, CheckSquare, Square, UserPlus, ChevronDown, ChevronRight, FileText,
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TECHFEST_URL = '/techfest';

const TABS = [
  { key: 'combined',    label: 'Combined Data',     icon: Layers,         color: 'bg-slate-800' },
  { key: 'school',      label: 'Schools',           icon: Building2,      color: 'bg-blue-500' },
  { key: 'educator',    label: 'Educators/Mentors', icon: GraduationCap,  color: 'bg-red-500' },
  { key: 'student',     label: 'Students',          icon: User,           color: 'bg-amber-500' },
  { key: 'submissions', label: 'Submissions',       icon: Upload,         color: 'bg-fuchsia-500' },
  { key: 'referrers',   label: 'Referrers',         icon: Link2,          color: 'bg-emerald-500' },
];

const SOURCE_LABELS = {
  social_media: 'Social Media',
  google: 'Google Search',
  iit_techfest: 'IIT Techfest',
  through_someone: 'Through Someone',
  referral: 'Referral Link',
  other: 'Other',
};

const SOURCE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'google', label: 'Google Search' },
  { value: 'iit_techfest', label: 'IIT Techfest' },
  { value: 'through_someone', label: 'Through Someone' },
  { value: 'referral', label: 'Referral Link' },
  { value: 'other', label: 'Other' },
];

const COMPETITION_OPTIONS = [
  { slug: 'robo_sumo',       label: 'Robo Sumo',                 zonal: true  },
  { slug: 'robo_race',       label: 'Robo Race',                 zonal: true  },
  { slug: 'robo_innovation', label: 'Robo Innovation Challenge', zonal: false },
];
const ZONE_OPTIONS = [
  { slug: 'north',   label: 'North · Delhi'     },
  { slug: 'south',   label: 'South · Bangalore' },
  { slug: 'east',    label: 'East · Kanpur'     },
  { slug: 'west',    label: 'West · Mumbai'     },
  { slug: 'central', label: 'Central · Indore'  },
];
const COMPETITION_LABEL = Object.fromEntries(COMPETITION_OPTIONS.map((c) => [c.slug, c.label]));

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const roboticsSummary = (r) => {
  if (!r.teaches_robotics) return '—';
  if (r.teaches_robotics === 'No') return 'No';
  const parts = ['Yes'];
  if (r.robotics_format) parts.push(r.robotics_format);
  if (r.robotics_external_company) parts.push(`Vendor: ${r.robotics_external_company}`);
  return parts.join(' · ');
};

const sourceSummary = (r) => {
  if (!r.source) return '—';
  const label = SOURCE_LABELS[r.source] || r.source;
  if (r.source === 'through_someone' && r.source_details) return `${label} (${r.source_details})`;
  if (r.source === 'referral' && (r.source_details || r.referrer_slug)) {
    return `${label} — ${r.source_details || r.referrer_slug}`;
  }
  return label;
};

export default function AdminCompetitions() {
  const { getAuthHeaders, user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [tab, setTab] = useState('school');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);

  // My referral link (for non-admins & shown as a helper card for everyone)
  const [myRef, setMyRef] = useState(null);

  // Referrers state
  const [referrers, setReferrers] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const [showRefModal, setShowRefModal] = useState(null); // null | {} (new) | referrer obj (edit)
  const [refForm, setRefForm] = useState({ name: '', slug: '', notes: '' });
  const [savingRef, setSavingRef] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subCompFilter, setSubCompFilter] = useState('');

  // Combined-view state
  const [combined, setCombined] = useState([]);
  const [combinedLoading, setCombinedLoading] = useState(false);
  const [combinedSelected, setCombinedSelected] = useState(() => new Set());
  // Expanded submission row (id → true)
  const [expandedSub, setExpandedSub] = useState(() => new Set());
  const toggleExpandedSub = (id) => setExpandedSub(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  // Inline "assign coordinator" popover state on the combined table:
  //   { key: <school_key>, reg_id, current_user_id }
  const [inlineCoord, setInlineCoord] = useState(null);
  const [inlineZone, setInlineZone] = useState(null); // { key, reg_id, value }

  // Edit registration state
  const [editReg, setEditReg] = useState(null); // registration row being edited
  const [editForm, setEditForm] = useState({});
  const [savingReg, setSavingReg] = useState(false);
  // Team users for the coordinator picker (admin only can assign)
  const [teamUsers, setTeamUsers] = useState([]);
  const [coordQuery, setCoordQuery] = useState('');

  const visibleTabs = isAdmin ? TABS : TABS.filter((t) => t.key !== 'referrers');
  const isRegistrationTab = tab === 'school' || tab === 'educator' || tab === 'student';

  // Guard: if a non-admin somehow lands on the referrers tab, snap back to schools.
  useEffect(() => {
    if (!isAdmin && tab === 'referrers') setTab('school');
  }, [isAdmin, tab]);

  const loadCombined = async () => {
    setCombinedLoading(true);
    try {
      const res = await axios.get(`${API}/admin/techfest/combined-view`, { headers: getAuthHeaders() });
      setCombined(res.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load combined data');
    } finally { setCombinedLoading(false); }
  };

  // Inline update helper (assign coord / edit zone). Uses the school's
  // school_reg_id when available; otherwise picks the first educator reg id
  // so at least some record is updated. Refreshes the combined view after.
  const patchRegistration = async (regId, patch) => {
    if (!regId) {
      toast.error('This school has no registration to update yet');
      return false;
    }
    try {
      await axios.patch(`${API}/admin/techfest/registrations/${regId}`, patch, { headers: getAuthHeaders() });
      return true;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
      return false;
    }
  };

  const load = async () => {
    if (!isRegistrationTab) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/techfest/registrations`, {
        headers: getAuthHeaders(), params: { type: tab },
      });
      setRows(res.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load registrations');
    } finally { setLoading(false); }
  };

  const loadReferrers = async () => {
    setRefLoading(true);
    try {
      const res = await axios.get(`${API}/admin/techfest/referrers`, { headers: getAuthHeaders() });
      setReferrers(res.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load referrers');
    } finally { setRefLoading(false); }
  };

  const loadSubmissions = async () => {
    setSubLoading(true);
    try {
      const res = await axios.get(`${API}/admin/techfest/submissions`, {
        headers: getAuthHeaders(),
        params: subCompFilter ? { competition: subCompFilter } : {},
      });
      setSubmissions(res.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load submissions');
    } finally { setSubLoading(false); }
  };

  useEffect(() => {
    if (tab === 'referrers') loadReferrers();
    else if (tab === 'submissions') loadSubmissions();
    else if (tab === 'combined') loadCombined();
    else load();
     
  }, [tab, subCompFilter]);

  // Team users are only needed for the coordinator picker in the edit
  // modal — admin-only, fetch once.
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await axios.get(`${API}/team-users`, { headers: getAuthHeaders() });
        setTeamUsers((res.data || []).filter((u) => u.is_active !== false));
      } catch { /* silent — the picker just shows no options */ }
    })();
     
  }, [isAdmin]);

  // Fetch the current user's own referral link + counts on mount.
  // Admin sees this as a helper card; team members see it as their primary tool.
  const loadMyRef = async () => {
    try {
      const res = await axios.get(`${API}/admin/techfest/referrers/me`, { headers: getAuthHeaders() });
      setMyRef(res.data || null);
    } catch (err) {
      // Silently ignore — page still works without a personal link.
      console.warn('Failed to load personal referrer link', err?.response?.data || err);
    }
  };
  useEffect(() => { loadMyRef();  }, []);
  // Refresh my counts whenever the registrations list refreshes.
  useEffect(() => { if (isRegistrationTab && !loading) loadMyRef();  }, [rows, loading]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => [
      r.name, r.email, r.phone, r.city, r.school_name, r.school_or_institute,
      r.role_designation, r.grade_taught, r.school_email, r.school_phone, r.school_address,
      r.source, r.source_details, r.referrer_slug,
      r.robotics_format, r.robotics_external_company,
    ].some((v) => (v || '').toString().toLowerCase().includes(needle)));
  }, [rows, q]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/admin/techfest/registrations/export`, {
        headers: getAuthHeaders(), params: { type: tab }, responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      a.href = url; a.download = `techfest-${tab}-${stamp}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const endpoint = tab === 'student'
        ? `${API}/admin/techfest/students/import`
        : `${API}/admin/techfest/registrations/import`;
      const res = await axios.post(endpoint, fd, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      const { inserted = 0, updated = 0, skipped = 0, schools_linked = 0, errors = [] } = res.data || {};
      const linkedNote = tab === 'student' ? ` · ${schools_linked} schools linked` : '';
      toast.success(`Imported: ${inserted} new · ${updated} updated · ${skipped} skipped${linkedNote}${errors.length ? ` · ${errors.length} errors` : ''}`);
      if (errors.length) console.warn('Import errors', errors);
      if (tab === 'student') await loadCombined().catch(() => {});
      await load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Import failed'); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const openEdit = (row) => {
    setEditReg(row);
    setCoordQuery('');
    setEditForm({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      city: row.city || '',
      school_name: row.school_name || '',
      school_or_institute: row.school_or_institute || '',
      role_designation: row.role_designation || '',
      grade_taught: row.grade_taught || '',
      student_count: row.student_count || '',
      school_address: row.school_address || '',
      school_email: row.school_email || '',
      school_phone: row.school_phone || '',
      teaches_robotics: row.teaches_robotics || '',
      robotics_format: row.robotics_format || '',
      robotics_external_company: row.robotics_external_company || '',
      source: row.source || '',
      source_details: row.source_details || '',
      status: row.status || 'new',
      selected_competitions: row.selected_competitions || [],
      zone: row.zone || '',
      coordinator_user_id: row.coordinator_user_id || '',
      coordinator_name: row.coordinator_name || '',
      team_competition_id: row.team_competition_id || '',
    });
  };

  const saveEdit = async () => {
    if (!editReg) return;
    setSavingReg(true);
    try {
      await axios.patch(`${API}/admin/techfest/registrations/${editReg._id}`, editForm, { headers: getAuthHeaders() });
      toast.success('Registration updated');
      setEditReg(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally { setSavingReg(false); }
  };

  const deleteReg = async (row) => {
    if (!window.confirm(`Delete registration for ${row.name}? This can be undone by an admin from the database.`)) return;
    try {
      await axios.delete(`${API}/admin/techfest/registrations/${row._id}`, { headers: getAuthHeaders() });
      toast.success('Registration deleted');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  // ── Referrers actions ─────────────────────────────────────────────────
  const openRefNew = () => {
    setRefForm({ name: '', slug: '', notes: '' });
    setShowRefModal({});
  };
  const openRefEdit = (ref) => {
    setRefForm({ name: ref.name || '', slug: ref.slug || '', notes: ref.notes || '' });
    setShowRefModal(ref);
  };
  const saveReferrer = async () => {
    if (!refForm.name.trim()) { toast.error('Name is required'); return; }
    setSavingRef(true);
    try {
      if (showRefModal?._id) {
        await axios.patch(`${API}/admin/techfest/referrers/${showRefModal._id}`, {
          name: refForm.name, notes: refForm.notes,
        }, { headers: getAuthHeaders() });
        toast.success('Referrer updated');
      } else {
        await axios.post(`${API}/admin/techfest/referrers`, refForm, { headers: getAuthHeaders() });
        toast.success('Referrer link created');
      }
      setShowRefModal(null);
      await loadReferrers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSavingRef(false); }
  };
  const deleteReferrer = async (ref) => {
    if (!window.confirm(`Delete referrer "${ref.name}"? Existing registrations attributed to them will remain.`)) return;
    try {
      await axios.delete(`${API}/admin/techfest/referrers/${ref._id}`, { headers: getAuthHeaders() });
      toast.success('Referrer deleted');
      await loadReferrers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };
  const buildRefLink = (slug) => `${window.location.origin}/techfest?ref=${encodeURIComponent(slug)}`;
  const copyRefLink = async (slug) => {
    try {
      await navigator.clipboard.writeText(buildRefLink(slug));
      toast.success('Link copied');
    } catch {
      toast.error('Copy failed — please copy manually');
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto" data-testid="admin-competitions-page">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Admin · Competitions</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1">Competitions.</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base max-w-2xl">
              {isAdmin
                ? 'All OLL-run competitions in one place. Click a competition to see its registrations, filter by role, and import/export CSVs.'
                : 'Track schools and educators who signed up through your personal referral link.'}
            </p>
          </div>
        </div>

        {/* My personal referral link — visible to everyone. Team members see it as
            their primary tool; admins see it as their own share link alongside the
            Referrers tab. */}
        {myRef && (
          <div className="mb-6 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-4 sm:p-5" data-testid="admin-competitions-my-ref-card">
            <div className="flex flex-wrap items-start gap-4 justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Your Referral Link</div>
                  <div className="text-sm text-slate-700 mt-0.5">Share this link — every school & educator who registers through it will show up below.</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="text-[12px] sm:text-sm bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 font-mono text-emerald-800 max-w-full break-all" data-testid="admin-competitions-my-ref-link">{buildRefLink(myRef.slug)}</code>
                    <Button size="sm" onClick={() => copyRefLink(myRef.slug)} className="bg-emerald-600 hover:bg-emerald-700" data-testid="admin-competitions-my-ref-copy">
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-center pr-1">
                <div>
                  <div className="text-2xl font-bold text-blue-700 tabular-nums leading-tight" data-testid="admin-competitions-my-ref-school-count">{myRef.school_count}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Schools</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-700 tabular-nums leading-tight" data-testid="admin-competitions-my-ref-educator-count">{myRef.educator_count}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Educators</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">{myRef.total_count}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Competitions grid — Techfest as the first (currently only) card.
            Only shown to admins — team users see a simpler view focused on their leads. */}
        {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8" data-testid="admin-competitions-grid">
          <div className="relative rounded-2xl border-2 border-[#DC2626] bg-gradient-to-br from-[#0A1F44] via-[#1E3A5F] to-[#0A1F44] text-white p-5 shadow-lg overflow-hidden">
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#DC2626]/40 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-200"><Trophy className="w-3.5 h-3.5" /> Live</div>
              <div className="text-2xl font-bold mt-2 leading-tight">OLL × Techfest IIT Bombay 2026</div>
              <div className="text-xs text-white/70 mt-1">Grand Finale · 17 Dec 2026</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={TECHFEST_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-white text-[#0A1F44] px-3 py-1.5 rounded-full">
                  Open Campaign <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Tabs — School / Educator / Student / Referrers */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap border-b border-slate-200" role="tablist" data-testid="admin-competitions-tabs">
            {visibleTabs.map((t) => {
              const active = t.key === tab;
              const Icon = t.icon;
              const count = active ? (t.key === 'referrers' ? referrers.length : t.key === 'submissions' ? submissions.length : t.key === 'combined' ? combined.length : rows.length) : null;
              const isLoading = active && (t.key === 'referrers' ? refLoading : t.key === 'submissions' ? subLoading : t.key === 'combined' ? combinedLoading : loading);
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  role="tab"
                  aria-selected={active}
                  data-testid={`admin-competitions-tab-${t.key}`}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${active ? 'text-[#0A1F44] border-[#DC2626] bg-red-50/50' : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {active && !isLoading && (
                    <span className="ml-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          {isRegistrationTab && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search ${tab === 'school' ? 'schools' : tab === 'educator' ? 'educators' : 'students'}…`}
                  className="pl-9 bg-white"
                  data-testid="admin-competitions-search"
                />
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} data-testid="admin-competitions-import-input" />
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={handleImportClick} disabled={importing} data-testid="admin-competitions-import-btn">
                    {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />} Import CSV
                  </Button>
                )}
                <Button size="sm" onClick={handleExport} disabled={exporting} className="bg-[#0A1F44] hover:bg-[#1E3A5F]" data-testid="admin-competitions-export-btn">
                  {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />} Export CSV
                </Button>
              </div>
            </div>
          )}

          {tab === 'referrers' && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="text-sm text-slate-600">
                Share these links to auto-attribute registrations. Format: <code className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[12px]">oll.co/techfest?ref=slug</code>
              </div>
              <div className="flex-1" />
              <Button size="sm" onClick={openRefNew} className="bg-emerald-600 hover:bg-emerald-700" data-testid="admin-competitions-add-referrer-btn">
                <Plus className="w-4 h-4 mr-1" /> New Referrer Link
              </Button>
            </div>
          )}

          {/* Content area */}
          <div className="overflow-x-auto">
            {tab === 'combined' && (
              combinedLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
              ) : combined.length === 0 ? (
                <div className="p-10 text-center text-slate-500" data-testid="admin-competitions-combined-empty">No school data yet.</div>
              ) : (
                <table className="w-full text-sm" data-testid="admin-competitions-combined-table">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-3 font-bold w-8">
                        <button
                          onClick={() => setCombinedSelected(s => s.size === combined.length ? new Set() : new Set(combined.map(r => r.school_key)))}
                          className="text-slate-500 hover:text-slate-900"
                          data-testid="combined-select-all"
                        >
                          {combinedSelected.size === combined.length && combined.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="text-left px-3 py-3 font-bold">School</th>
                      <th className="text-left px-3 py-3 font-bold">City</th>
                      <th className="text-left px-3 py-3 font-bold">Competition</th>
                      <th className="text-left px-3 py-3 font-bold">Zone</th>
                      <th className="text-left px-3 py-3 font-bold">Coordinator</th>
                      <th className="text-center px-3 py-3 font-bold">School Reg</th>
                      <th className="text-center px-3 py-3 font-bold">Educators</th>
                      <th className="text-center px-3 py-3 font-bold">Students</th>
                      <th className="text-center px-3 py-3 font-bold">Submissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combined.map((r) => (
                      <tr key={r.school_key} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setCombinedSelected(prev => {
                              const next = new Set(prev);
                              if (next.has(r.school_key)) next.delete(r.school_key); else next.add(r.school_key);
                              return next;
                            })}
                            className="text-slate-500 hover:text-slate-900"
                            data-testid={`combined-check-${r.school_key}`}
                          >
                            {combinedSelected.has(r.school_key) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{r.school_name || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.city || '—'}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {r.selected_competitions && r.selected_competitions.length
                            ? r.selected_competitions.map(c => COMPETITION_LABEL[c] || c).join(', ')
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <InlineZonePicker
                            value={r.zone}
                            onSave={async (val) => {
                              const ok = await patchRegistration(r.school_reg_id || r.educator_reg_ids?.[0], { zone: val });
                              if (ok) { toast.success('Zone updated'); await loadCombined(); }
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <InlineCoordinatorPicker
                            value={r.coordinator_user_id}
                            currentName={r.coordinator_name}
                            options={teamUsers}
                            onSave={async (uid, uname) => {
                              const ok = await patchRegistration(r.school_reg_id || r.educator_reg_ids?.[0], { coordinator_user_id: uid || '', coordinator_name: uname || '' });
                              if (ok) { toast.success('Coordinator updated'); await loadCombined(); }
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.school_registered
                            ? <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 text-[11px] font-bold">✓ Yes</span>
                            : <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 text-[11px] font-bold">✗ No</span>}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums font-bold text-slate-800">{r.educator_count}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-bold text-slate-800">{r.student_count}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-bold text-slate-800">{r.submission_count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs">
                    <tr>
                      <td className="px-3 py-2" colSpan={2}>
                        <span className="font-bold text-slate-700">
                          {combinedSelected.size > 0 ? `${combinedSelected.size} selected` : `${combined.length} unique schools`}
                        </span>
                      </td>
                      <td colSpan={5}></td>
                      <td className="px-3 py-2 text-center font-bold text-slate-700 tabular-nums">
                        {combined.reduce((s, r) => s + r.educator_count, 0)}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-700 tabular-nums">
                        {combined.reduce((s, r) => s + r.student_count, 0)}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-700 tabular-nums">
                        {combined.reduce((s, r) => s + r.submission_count, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )
            )}
            {isRegistrationTab && (
              loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center" data-testid={tab === 'student' ? 'admin-competitions-empty-student' : 'admin-competitions-empty'}>
                  {tab === 'student' ? (
                    <>
                      <User className="w-10 h-10 mx-auto text-slate-300" />
                      <div className="mt-3 font-bold text-slate-800">No student registrations yet</div>
                      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Individual students register on techfest.org. Use <strong>Import CSV</strong> above to bulk-load a student roster from the Techfest export (must have a <code>type</code> column set to <code>student</code>).</p>
                      <a href="https://techfest.org/competitions/oll" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#DC2626] hover:underline">
                        Open techfest.org/competitions/oll <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </>
                  ) : (
                    <span className="text-slate-500">No {tab} registrations {q ? 'match your search' : 'yet'}.</span>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm" data-testid={`admin-competitions-table-${tab}`}>
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-3 font-bold">Sr.</th>
                      <th className="text-left px-3 py-3 font-bold">Registered</th>
                      <th className="text-left px-3 py-3 font-bold">Name</th>
                      <th className="text-left px-3 py-3 font-bold">Contact</th>
                      <th className="text-left px-3 py-3 font-bold">City</th>
                      {tab === 'school' ? (
                        <>
                          <th className="text-left px-3 py-3 font-bold">School</th>
                          <th className="text-left px-3 py-3 font-bold">Role</th>
                        </>
                      ) : tab === 'educator' ? (
                        <>
                          <th className="text-left px-3 py-3 font-bold">School / Institute</th>
                          <th className="text-left px-3 py-3 font-bold">Subject</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left px-3 py-3 font-bold">School</th>
                          <th className="text-left px-3 py-3 font-bold">Grade · Team · Track</th>
                        </>
                      )}
                      <th className="text-left px-3 py-3 font-bold">{tab === 'student' ? 'Team size' : 'Students'}</th>
                      <th className="text-left px-3 py-3 font-bold">Robotics</th>
                      <th className="text-left px-3 py-3 font-bold">Source</th>
                      <th className="text-left px-3 py-3 font-bold">School Address</th>
                      <th className="text-left px-3 py-3 font-bold">School Contact</th>
                      {(tab === 'school' || tab === 'educator') && (
                        <>
                          <th className="text-left px-3 py-3 font-bold">Competition</th>
                          <th className="text-left px-3 py-3 font-bold">Zone</th>
                          <th className="text-left px-3 py-3 font-bold">Coordinator</th>
                        </>
                      )}
                      <th className="text-left px-3 py-3 font-bold">Status</th>
                      <th className="text-right px-3 py-3 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50/70 align-top" data-testid={`admin-competitions-row-${r._id}`}>
                        <td className="px-3 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-700">{fmtDateTime(r.created_at)}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{r.name || '—'}</td>
                        <td className="px-3 py-3 text-slate-700">
                          <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-[13px] hover:text-[#DC2626]"><Mail className="w-3 h-3" />{r.email}</a>
                          <div className="text-[12px] text-slate-500 mt-0.5 inline-flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-700 inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{r.city || '—'}</td>
                        {tab === 'school' ? (
                          <>
                            <td className="px-3 py-3 text-slate-700">{r.school_name || '—'}</td>
                            <td className="px-3 py-3 text-slate-700">{r.role_designation || '—'}</td>
                          </>
                        ) : tab === 'educator' ? (
                          <>
                            <td className="px-3 py-3 text-slate-700">{r.school_or_institute || '—'}</td>
                            <td className="px-3 py-3 text-slate-700">{r.grade_taught || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-3 text-slate-700">{r.school_name || r.school_or_institute || '—'}</td>
                            <td className="px-3 py-3 text-slate-700 text-[12px]">
                              <div>{r.grade || '—'} {r.team_name ? `· ${r.team_name}` : ''}</div>
                              {r.track && <div className="text-slate-500">{r.track}</div>}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-3 text-slate-700">{r.student_count || '—'}</td>
                        <td className="px-3 py-3 text-slate-700 max-w-[220px] text-[12px]" data-testid={`admin-competitions-cell-robotics-${r._id}`}>{roboticsSummary(r)}</td>
                        <td className="px-3 py-3 text-slate-700 max-w-[180px] text-[12px]" data-testid={`admin-competitions-cell-source-${r._id}`}>{sourceSummary(r)}</td>
                        <td className="px-3 py-3 text-slate-700 max-w-[220px] text-[12px]">{r.school_address || '—'}</td>
                        <td className="px-3 py-3 text-slate-700 text-[12px]">
                          {r.school_email ? <div className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{r.school_email}</div> : null}
                          {r.school_phone ? <div className="mt-0.5 inline-flex items-center gap-1"><Phone className="w-3 h-3" />{r.school_phone}</div> : null}
                          {!(r.school_email || r.school_phone) && '—'}
                        </td>
                        {(tab === 'school' || tab === 'educator') && (
                          <>
                            <td className="px-3 py-3 text-[12px] text-slate-700 max-w-[160px]">
                              {(r.selected_competitions || []).length
                                ? (r.selected_competitions || []).map(c => COMPETITION_LABEL[c] || c).join(', ')
                                : <span className="text-slate-400">—</span>}
                            </td>
                            <td className="px-3 py-3 text-[12px]">
                              <InlineZonePicker
                                value={r.zone}
                                onSave={async (val) => {
                                  const ok = await patchRegistration(r._id, { zone: val });
                                  if (ok) { toast.success('Zone updated'); await load(); }
                                }}
                              />
                            </td>
                            <td className="px-3 py-3 text-[12px]">
                              <InlineCoordinatorPicker
                                value={r.coordinator_user_id}
                                currentName={r.coordinator_name}
                                options={teamUsers}
                                onSave={async (uid, uname) => {
                                  const ok = await patchRegistration(r._id, { coordinator_user_id: uid || '', coordinator_name: uname || '' });
                                  if (ok) { toast.success('Coordinator updated'); await load(); }
                                }}
                              />
                            </td>
                          </>
                        )}
                        <td className="px-3 py-3">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-blue-100 text-blue-800">{r.status || 'new'}</span>
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-600 hover:text-[#0A1F44] px-2 py-1 rounded hover:bg-slate-100"
                            data-testid={`admin-competitions-edit-${r._id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => deleteReg(r)}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                            data-testid={`admin-competitions-delete-${r._id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {tab === 'submissions' && (
              subLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
              ) : submissions.length === 0 ? (
                <div className="p-10 text-center">
                  <Upload className="w-10 h-10 mx-auto text-slate-300" />
                  <div className="mt-3 font-bold text-slate-800">No project submissions yet</div>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Once teams submit their bots via <code>/techfest/submit</code>, they'll appear here for the jury.</p>
                </div>
              ) : (
                <>
                  <div className="px-3 py-2 flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Filter by competition:</span>
                    <select
                      className="h-8 px-3 text-xs border border-slate-200 rounded-lg bg-white"
                      value={subCompFilter}
                      onChange={(e) => setSubCompFilter(e.target.value)}
                      data-testid="admin-submissions-filter"
                    >
                      <option value="">All</option>
                      <option value="robo_sumo">Robo Sumo</option>
                      <option value="robo_race">Robo Race</option>
                      <option value="robo_innovation">Robo Innovation Challenge</option>
                    </select>
                    <div className="flex-1" />
                    <span className="text-[11px] text-slate-500">{submissions.length} submissions</span>
                  </div>
                  <table className="w-full text-sm" data-testid="admin-competitions-submissions-table">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-2 py-3 w-8"></th>
                        <th className="text-left px-3 py-3 font-bold">Sr.</th>
                        <th className="text-left px-3 py-3 font-bold">Team Lead</th>
                        <th className="text-left px-3 py-3 font-bold">School</th>
                        <th className="text-left px-3 py-3 font-bold">Competition</th>
                        <th className="text-left px-3 py-3 font-bold">Zone</th>
                        <th className="text-left px-3 py-3 font-bold">Age Cat</th>
                        <th className="text-right px-3 py-3 font-bold">Members</th>
                        <th className="text-left px-3 py-3 font-bold">Drive</th>
                        <th className="text-left px-3 py-3 font-bold">Permission</th>
                        <th className="text-left px-3 py-3 font-bold">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s, i) => {
                        const isOpen = expandedSub.has(s._id);
                        return (
                        <React.Fragment key={s._id}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50/70" data-testid={`admin-submission-row-${s._id}`}>
                          <td className="px-2 py-3">
                            <button
                              onClick={() => toggleExpandedSub(s._id)}
                              className="text-slate-500 hover:text-slate-900"
                              data-testid={`admin-submission-toggle-${s._id}`}
                              aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                            >
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-900">{s.full_name}</div>
                            <div className="text-[11px] text-slate-500">{s.email} · {s.phone}</div>
                          </td>
                          <td className="px-3 py-3 text-slate-700">{s.school_or_college || '—'}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 bg-fuchsia-100 text-fuchsia-800 uppercase tracking-widest">
                              {s.competition?.replace('_', ' ')}
                            </span>
                            {s.project_theme && <div className="text-[11px] text-slate-500 mt-1">{s.project_category} · {s.project_theme}</div>}
                          </td>
                          <td className="px-3 py-3 text-slate-700 uppercase text-xs">{s.zone || '—'}</td>
                          <td className="px-3 py-3 text-slate-700 uppercase text-xs">{s.age_category || '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">{1 + (s.team_members?.length || 0)}</td>
                          <td className="px-3 py-3">
                            {s.drive_link ? (
                              <a href={s.drive_link} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline text-[11px] font-bold uppercase">Open</a>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-3">
                            {s.school_permission_url ? (
                              <a href={s.school_permission_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline text-[11px] font-bold uppercase">View</a>
                            ) : <span className="text-slate-400 text-[11px]">—</span>}
                          </td>
                          <td className="px-3 py-3 text-slate-600 text-[11px]">{s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                        </tr>
                        {isOpen && (
                          <tr data-testid={`admin-submission-detail-${s._id}`}>
                            <td colSpan={11} className="p-0 bg-slate-50 border-b border-slate-200">
                              <SubmissionDetail s={s} />
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )
            )}

            {tab === 'referrers' && (
              refLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
              ) : referrers.length === 0 ? (
                <div className="p-10 text-center">
                  <Link2 className="w-10 h-10 mx-auto text-slate-300" />
                  <div className="mt-3 font-bold text-slate-800">No referrer links yet</div>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Create a referral slug for anyone spreading the word. Every registration through their link is auto-attributed.</p>
                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={openRefNew}><Plus className="w-4 h-4 mr-1" /> Create your first referrer</Button>
                </div>
              ) : (
                <table className="w-full text-sm" data-testid="admin-competitions-referrers-table">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-3 font-bold">Sr.</th>
                      <th className="text-left px-3 py-3 font-bold">Name</th>
                      <th className="text-left px-3 py-3 font-bold">Slug</th>
                      <th className="text-left px-3 py-3 font-bold">Share Link</th>
                      <th className="text-right px-3 py-3 font-bold">Schools</th>
                      <th className="text-right px-3 py-3 font-bold">Educators</th>
                      <th className="text-right px-3 py-3 font-bold">Students</th>
                      <th className="text-right px-3 py-3 font-bold">Total</th>
                      <th className="text-left px-3 py-3 font-bold">Notes</th>
                      <th className="text-right px-3 py-3 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrers.map((r, i) => (
                      <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50/70" data-testid={`admin-competitions-referrer-row-${r._id}`}>
                        <td className="px-3 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{r.name}</td>
                        <td className="px-3 py-3 text-slate-700 font-mono text-[12px]">{r.slug}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={buildRefLink(r.slug)}
                              target="_blank" rel="noreferrer"
                              className="text-[12px] text-emerald-700 hover:underline truncate max-w-[220px]"
                            >{buildRefLink(r.slug)}</a>
                            <button
                              onClick={() => copyRefLink(r.slug)}
                              className="text-slate-500 hover:text-emerald-700"
                              title="Copy link"
                              data-testid={`admin-competitions-referrer-copy-${r._id}`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-blue-700">{r.school_count}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-red-700">{r.educator_count}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-amber-700">{r.student_count}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">{r.total_count}</td>
                        <td className="px-3 py-3 text-slate-600 text-[12px] max-w-[200px]">{r.notes || '—'}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <button onClick={() => openRefEdit(r)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-600 hover:text-[#0A1F44] px-2 py-1 rounded hover:bg-slate-100" data-testid={`admin-competitions-referrer-edit-${r._id}`}>
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button onClick={() => deleteReferrer(r)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50" data-testid={`admin-competitions-referrer-delete-${r._id}`}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </div>

      {/* Edit Registration Modal */}
      <Dialog open={!!editReg} onOpenChange={() => !savingReg && setEditReg(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="admin-competitions-edit-modal">
          <DialogHeader>
            <DialogTitle>Edit Registration</DialogTitle>
          </DialogHeader>
          {editReg && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <Field label="Name*"><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
              <Field label="Email*"><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></Field>
              <Field label="Phone*"><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></Field>
              <Field label="City*"><Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></Field>

              {editReg.type === 'school' && (
                <>
                  <Field label="School Name"><Input value={editForm.school_name} onChange={(e) => setEditForm({ ...editForm, school_name: e.target.value })} /></Field>
                  <Field label="Role / Designation"><Input value={editForm.role_designation} onChange={(e) => setEditForm({ ...editForm, role_designation: e.target.value })} /></Field>
                </>
              )}
              {editReg.type === 'educator' && (
                <>
                  <Field label="School / Institute"><Input value={editForm.school_or_institute} onChange={(e) => setEditForm({ ...editForm, school_or_institute: e.target.value })} /></Field>
                  <Field label="Subject"><Input value={editForm.grade_taught} onChange={(e) => setEditForm({ ...editForm, grade_taught: e.target.value })} /></Field>
                </>
              )}

              <Field label="Student Count"><Input value={editForm.student_count} onChange={(e) => setEditForm({ ...editForm, student_count: e.target.value })} /></Field>
              <Field label="School Email"><Input value={editForm.school_email} onChange={(e) => setEditForm({ ...editForm, school_email: e.target.value })} /></Field>
              <Field label="School Phone"><Input value={editForm.school_phone} onChange={(e) => setEditForm({ ...editForm, school_phone: e.target.value })} /></Field>

              <Field label="Teaches Robotics">
                <select className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm" value={editForm.teaches_robotics} onChange={(e) => setEditForm({ ...editForm, teaches_robotics: e.target.value })}>
                  <option value="">—</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </Field>
              {editForm.teaches_robotics === 'Yes' && (
                <>
                  <Field label="Robotics Format">
                    <select className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm" value={editForm.robotics_format} onChange={(e) => setEditForm({ ...editForm, robotics_format: e.target.value })}>
                      <option value="">—</option>
                      <option>In timetable as a subject</option>
                      <option>Afterschool classes</option>
                      <option>Through an external company</option>
                    </select>
                  </Field>
                  {editForm.robotics_format === 'Through an external company' && (
                    <Field label="Vendor / Company"><Input value={editForm.robotics_external_company} onChange={(e) => setEditForm({ ...editForm, robotics_external_company: e.target.value })} /></Field>
                  )}
                </>
              )}

              <Field label="Source">
                <select className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm" value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} data-testid="admin-competitions-edit-source">
                  {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              {(editForm.source === 'through_someone' || editForm.source === 'referral' || editForm.source === 'other') && (
                <Field label={editForm.source === 'referral' ? 'Referrer Name' : editForm.source === 'through_someone' ? 'Person\'s Name' : 'Details'}>
                  <Input value={editForm.source_details} onChange={(e) => setEditForm({ ...editForm, source_details: e.target.value })} />
                </Field>
              )}

              <Field label="Status">
                <select className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </Field>

              {/* Competition selection + zonal round (admin can add/change) */}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Selected Competitions</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" data-testid="admin-competitions-comp-picker">
                  {COMPETITION_OPTIONS.map((c) => {
                    const active = (editForm.selected_competitions || []).includes(c.slug);
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => {
                          const cur = editForm.selected_competitions || [];
                          const next = active ? cur.filter((s) => s !== c.slug) : [...cur, c.slug];
                          const stillZonal = next.some((s) => COMPETITION_OPTIONS.find((cc) => cc.slug === s)?.zonal);
                          setEditForm({ ...editForm, selected_competitions: next, zone: stillZonal ? editForm.zone : '' });
                        }}
                        className="text-left px-3 py-2 rounded-lg border-2 text-sm font-semibold transition"
                        style={{
                          borderColor: active ? '#DC2626' : '#e2e8f0',
                          background: active ? 'rgba(220,38,38,0.08)' : '#fff',
                          color: active ? '#DC2626' : '#0A1F44',
                        }}
                        data-testid={`admin-competitions-comp-${c.slug}`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(editForm.selected_competitions || []).some((s) => COMPETITION_OPTIONS.find((c) => c.slug === s)?.zonal) && (
                <Field label="Regional Zone">
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                    value={editForm.zone || ''}
                    onChange={(e) => setEditForm({ ...editForm, zone: e.target.value })}
                    data-testid="admin-competitions-zone"
                  >
                    <option value="">— Select zone —</option>
                    {ZONE_OPTIONS.map((z) => <option key={z.slug} value={z.slug}>{z.label}</option>)}
                  </select>
                </Field>
              )}

              <Field label="Team Competition ID">
                <Input
                  value={editForm.team_competition_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, team_competition_id: e.target.value })}
                  placeholder="e.g. TEAM-A-42"
                  data-testid="admin-competitions-team-id"
                />
              </Field>

              {/* Coordinator picker — admin-only, searchable */}
              {isAdmin && (
                <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Assign Coordinator</label>
                  {editForm.coordinator_user_id ? (
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2" data-testid="admin-competitions-coord-selected">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{editForm.coordinator_name || 'Assigned'}</div>
                        <div className="text-[11px] text-slate-500">Coordinator can now see this registration in their Competitions.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, coordinator_user_id: '', coordinator_name: '' })}
                        className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold"
                        data-testid="admin-competitions-coord-clear"
                      >
                        <X className="w-3 h-3 inline" /> Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={coordQuery}
                          onChange={(e) => setCoordQuery(e.target.value)}
                          placeholder="Search team member by name or email"
                          className="pl-9"
                          data-testid="admin-competitions-coord-search"
                        />
                      </div>
                      {coordQuery.trim() && (
                        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100" data-testid="admin-competitions-coord-results">
                          {teamUsers
                            .filter((u) => {
                              const q = coordQuery.trim().toLowerCase();
                              return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                            })
                            .slice(0, 8)
                            .map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setEditForm({ ...editForm, coordinator_user_id: u.id, coordinator_name: u.name });
                                  setCoordQuery('');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center justify-between"
                                data-testid={`admin-competitions-coord-option-${u.id}`}
                              >
                                <span>
                                  <span className="font-semibold text-slate-800">{u.name}</span>
                                  <span className="text-slate-400 text-xs ml-2">{u.email}</span>
                                </span>
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            ))}
                          {teamUsers.filter((u) => {
                            const q = coordQuery.trim().toLowerCase();
                            return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                          }).length === 0 && (
                            <div className="px-3 py-3 text-xs text-slate-400 text-center">No matches</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">School Address</label>
                <textarea
                  className="w-full min-h-[70px] px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm"
                  value={editForm.school_address}
                  onChange={(e) => setEditForm({ ...editForm, school_address: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setEditReg(null)} disabled={savingReg}>Cancel</Button>
                <Button onClick={saveEdit} disabled={savingReg} className="bg-[#0A1F44] hover:bg-[#1E3A5F]" data-testid="admin-competitions-edit-save">
                  {savingReg ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Referrer Modal (create/edit) */}
      <Dialog open={!!showRefModal} onOpenChange={() => !savingRef && setShowRefModal(null)}>
        <DialogContent className="max-w-md" data-testid="admin-competitions-referrer-modal">
          <DialogHeader>
            <DialogTitle>{showRefModal?._id ? 'Edit Referrer' : 'New Referrer Link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Field label="Name*">
              <Input value={refForm.name} onChange={(e) => setRefForm({ ...refForm, name: e.target.value })} placeholder="e.g. Rahul Sharma" data-testid="admin-competitions-referrer-name" />
            </Field>
            {!showRefModal?._id && (
              <Field label="Slug (optional)">
                <Input value={refForm.slug} onChange={(e) => setRefForm({ ...refForm, slug: e.target.value })} placeholder="Auto-generated from name if blank" data-testid="admin-competitions-referrer-slug" />
                <div className="text-[11px] text-slate-500 mt-1">Only lowercase letters, numbers, and hyphens.</div>
              </Field>
            )}
            <Field label="Notes (optional)">
              <Input value={refForm.notes} onChange={(e) => setRefForm({ ...refForm, notes: e.target.value })} placeholder="e.g. IIT Bombay alumni, PR volunteer" />
            </Field>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowRefModal(null)} disabled={savingRef}>Cancel</Button>
              <Button onClick={saveReferrer} disabled={savingRef} className="bg-emerald-600 hover:bg-emerald-700" data-testid="admin-competitions-referrer-save">
                {savingRef ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} {showRefModal?._id ? 'Save' : 'Create Link'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ─── Inline picker helpers (Combined tab) ─────────────────────────────
function InlineZonePicker({ value, onSave }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value || '');
  useEffect(() => { setLocal(value || ''); }, [value]);
  const zoneLabel = ZONE_OPTIONS.find(z => z.slug === value)?.label;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-left inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${value ? 'text-slate-800 hover:bg-slate-100' : 'text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300'}`}
      >
        {value ? zoneLabel : '+ Set zone'}
        <Pencil className="w-3 h-3 opacity-60" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <select
        autoFocus
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
      >
        <option value="">— None —</option>
        {ZONE_OPTIONS.map(z => (
          <option key={z.slug} value={z.slug}>{z.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={async () => { await onSave(local); setOpen(false); }}
        className="text-emerald-600 hover:bg-emerald-50 rounded p-1"
      >✓</button>
      <button
        type="button"
        onClick={() => { setLocal(value || ''); setOpen(false); }}
        className="text-slate-400 hover:bg-slate-100 rounded p-1"
      ><X className="w-3 h-3" /></button>
    </div>
  );
}

function InlineCoordinatorPicker({ value, currentName, options, onSave }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = (options || []).filter(u => {
    const s = (u.name + ' ' + (u.email || '')).toLowerCase();
    return !q || s.includes(q.toLowerCase());
  }).slice(0, 8);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-left inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${value ? 'text-slate-800 hover:bg-slate-100' : 'text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300'}`}
        data-testid="inline-coord-open"
      >
        {value ? (currentName || 'Assigned') : '+ Assign'}
        <UserPlus className="w-3 h-3 opacity-60" />
      </button>
    );
  }
  return (
    <div className="relative">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search team…"
        className="text-xs px-2 py-1 border border-slate-300 rounded bg-white w-40"
      />
      <div className="absolute z-30 mt-1 left-0 w-56 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
        <button
          type="button"
          onClick={async () => { await onSave('', ''); setOpen(false); }}
          className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 border-b border-slate-100"
        >Unassign</button>
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-slate-400">No matches</div>
        ) : filtered.map(u => (
          <button
            key={u.id || u._id || u.email}
            type="button"
            onClick={async () => { await onSave(u.id || u._id, u.name); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50"
          >
            <div className="font-semibold text-slate-800">{u.name}</div>
            <div className="text-slate-500 text-[10px]">{u.email}</div>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute -right-6 top-1 text-slate-400 hover:text-slate-700"
      ><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}


// ─── Full submission detail (expanded row in Submissions tab) ─────────
function SubmissionDetail({ s }) {
  const F = ({ label, value, mono }) => (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className={`text-sm text-slate-800 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value || <span className="text-slate-400">—</span>}</div>
    </div>
  );
  const Link = ({ label, href, cta = 'Open' }) => (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline text-sm font-bold mt-0.5">
          <ExternalLink className="w-3.5 h-3.5" /> {cta}
        </a>
      ) : <div className="text-slate-400 text-sm mt-0.5">—</div>}
    </div>
  );
  const members = [
    { name: s.full_name, date_of_birth: s.date_of_birth, email: s.email, phone: s.phone, school: s.school_or_college, id_proof_type: s.id_proof_type, id_proof_url: s.id_proof_url, isLead: true },
    ...(s.team_members || []),
  ];
  return (
    <div className="px-6 py-5 space-y-6" data-testid={`admin-submission-detail-body-${s._id}`}>
      {/* ── Section: Team lead / primary contact ── */}
      <section>
        <h4 className="text-[11px] uppercase tracking-[0.25em] font-bold text-slate-500 mb-3 flex items-center gap-1.5"><User className="w-3 h-3" /> Team Lead · Personal Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <F label="Full Name" value={s.full_name} />
          <F label="Date of Birth" value={s.date_of_birth} />
          <F label="Age" value={s.age} />
          <F label="Age Category" value={s.age_category} />
          <F label="Email" value={s.email} />
          <F label="Phone" value={s.phone} />
          <F label="City" value={s.city} />
          <F label="State" value={s.state} />
          <F label="Pincode" value={s.pincode} />
          <F label="Country" value={s.country} />
          <F label="School / College" value={s.school_or_college} />
          <F label="Referrer" value={s.referrer_slug} />
        </div>
      </section>

      {/* ── Section: Competition ── */}
      <section>
        <h4 className="text-[11px] uppercase tracking-[0.25em] font-bold text-slate-500 mb-3 flex items-center gap-1.5"><Trophy className="w-3 h-3" /> Competition</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <F label="Competition" value={s.competition?.replace('_', ' ')} />
          <F label="Zone" value={s.zone} />
          <F label="Project Category" value={s.project_category} />
          <F label="Project Theme" value={s.project_theme} />
          <F label="Team ID" value={s.team_id} mono />
          <F label="Competition ID" value={s.competition_id} mono />
        </div>
      </section>

      {/* ── Section: Attachments & links ── */}
      <section>
        <h4 className="text-[11px] uppercase tracking-[0.25em] font-bold text-slate-500 mb-3 flex items-center gap-1.5"><Link2 className="w-3 h-3" /> Attachments</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link label="Google Drive · Project Folder" href={s.drive_link} />
          <Link label="School Permission Letter" href={s.school_permission_url} cta="View letter" />
          <Link label={`Team Lead · ${s.id_proof_type ? s.id_proof_type.toUpperCase() : 'ID Proof'}`} href={s.id_proof_url} cta="View ID" />
          <F label="Submitted On" value={s.created_at ? new Date(s.created_at).toLocaleString('en-IN') : ''} />
        </div>
      </section>

      {/* ── Section: All team members (including lead) ── */}
      <section>
        <h4 className="text-[11px] uppercase tracking-[0.25em] font-bold text-slate-500 mb-3 flex items-center gap-1.5"><GraduationCap className="w-3 h-3" /> All Team Members ({members.length})</h4>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-bold">#</th>
                <th className="text-left px-3 py-2 font-bold">Name</th>
                <th className="text-left px-3 py-2 font-bold">DOB</th>
                <th className="text-left px-3 py-2 font-bold">Email</th>
                <th className="text-left px-3 py-2 font-bold">Phone</th>
                <th className="text-left px-3 py-2 font-bold">School</th>
                <th className="text-left px-3 py-2 font-bold">ID Proof</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {m.isLead ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-widest">Lead</span>
                    ) : (i + 1)}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{m.name || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{m.date_of_birth || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{m.email || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{m.phone || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{m.school || '—'}</td>
                  <td className="px-3 py-2">
                    {m.id_proof_url ? (
                      <a href={m.id_proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold">
                        <FileText className="w-3 h-3" />
                        {(m.id_proof_type || 'id').toUpperCase()}
                      </a>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

