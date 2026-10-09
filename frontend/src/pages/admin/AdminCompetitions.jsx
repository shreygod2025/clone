import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Trophy, Building2, GraduationCap, User, Download, Upload, Search,
  Mail, Phone, MapPin, Loader2, ExternalLink, Pencil, Trash2, Link2, Plus, Copy, X,
  Layers, CheckSquare, Square, UserPlus, ChevronDown, ChevronRight, FileText,
  Filter, Megaphone,
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/popover';
import TechfestBulkEmailDialog from './TechfestBulkEmailDialog';

// ── HeaderFilter ───────────────────────────────────────────────────────
// Small funnel icon next to a column header that opens a popover with a
// search input and a scrollable checkbox list — supports MULTIPLE selected
// values on the same column (e.g. City = Mumbai + Delhi). Null-safe —
// renders nothing if there are no options. `value` is `string[]`.
const HeaderFilter = ({ label, value, options, onChange, testid }) => {
  const selected = Array.isArray(value) ? value : (value ? [value] : []);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return options;
    return options.filter((o) => (o || '').toLowerCase().includes(n));
  }, [q, options]);
  if (!options || options.length === 0) return null;
  const active = selected.length > 0;
  const toggle = (opt) => {
    const next = selected.includes(opt)
      ? selected.filter((v) => v !== opt)
      : [...selected, opt];
    onChange(next);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`ml-1 inline-flex items-center justify-center min-w-5 h-5 rounded hover:bg-slate-200 ${active ? 'text-[#DC2626]' : 'text-slate-400'}`}
          title={active ? `Filtered by ${label}: ${selected.join(', ')}` : `Filter by ${label}`}
          data-testid={testid}
        >
          <Filter className={`w-3 h-3 ${active ? 'fill-current' : ''}`} />
          {active && (
            <span className="ml-0.5 text-[9px] font-bold bg-[#DC2626] text-white rounded-full px-1 min-w-[14px] text-center">
              {selected.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-56" data-testid={`${testid}-popover`}>
        <div className="p-2 border-b border-slate-100 flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full h-7 pl-6 pr-2 text-xs rounded border border-slate-200 focus:outline-none focus:border-[#DC2626]"
              data-testid={`${testid}-search`}
            />
          </div>
          {active && (
            <button
              type="button"
              onClick={() => { onChange([]); setQ(''); }}
              className="text-[10px] text-slate-500 hover:text-[#DC2626] px-1.5 py-1 rounded hover:bg-slate-100"
              data-testid={`${testid}-clear`}
            >
              clear
            </button>
          )}
        </div>
        <div className="max-h-56 overflow-y-auto">
          {filtered.map((o) => {
            const picked = selected.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => toggle(o)}
                className={`w-full text-left text-xs px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 truncate ${picked ? 'bg-slate-50 font-bold' : ''}`}
                title={o}
              >
                {picked
                  ? <CheckSquare className="w-3.5 h-3.5 text-[#DC2626] flex-shrink-0" />
                  : <Square className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                <span className="truncate">{o}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-[11px] text-slate-400 italic px-3 py-2">No matches</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ── SearchableSelect ───────────────────────────────────────────────────
// Dropdown with a type-to-filter input. Used in the bulk / edit dialogs.
// `options` is Array<{ value: any, label: string, hint?: string }>.
const SearchableSelect = ({ value, options, onChange, placeholder = 'Select…', testid }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return options;
    return options.filter((o) => (o.label + ' ' + (o.hint || '')).toLowerCase().includes(n));
  }, [q, options]);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-white mt-1 flex items-center justify-between text-left text-sm hover:border-slate-300"
          data-testid={testid}
        >
          <span className={selected ? 'text-slate-900 truncate' : 'text-slate-400'}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-[var(--radix-popover-trigger-width)]" data-testid={`${testid}-popover`}>
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search…"
              className="w-full h-8 pl-6 pr-2 text-sm rounded border border-slate-200 focus:outline-none focus:border-[#DC2626]"
              autoFocus
              data-testid={`${testid}-search`}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((o) => (
            <button
              key={JSON.stringify(o.value)}
              type="button"
              onClick={() => { onChange(o.value); setQ(''); setOpen(false); }}
              className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${value === o.value ? 'bg-emerald-50' : ''}`}
              data-testid={`${testid}-opt-${o.value}`}
            >
              <div className="text-sm font-semibold text-slate-900 truncate">{o.label}</div>
              {o.hint && <div className="text-[11px] text-slate-500 truncate">{o.hint}</div>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-xs text-slate-400 italic px-3 py-2">No matches</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

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
  const [showBulkEmail, setShowBulkEmail] = useState(false);
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

  // ── Filters + sorting (all 3 registration tabs) ─────────────────────────
  // Each filter is an array of selected values. Empty array = "all".
  // Multi-value: e.g. filters.city = ['Mumbai', 'Delhi'] matches both.
  const [filters, setFilters] = useState({
    zone: [], city: [], source: [], competition: [], coordinator: [], status: [],
  });
  const [sortBy, setSortBy] = useState('');       // column key or '' for insertion order
  const [sortDir, setSortDir] = useState('asc');  // 'asc' | 'desc'
  useEffect(() => {
    setFilters({ zone: [], city: [], source: [], competition: [], coordinator: [], status: [] });
    setSortBy('');
    setSortDir('asc');
  }, [tab]);
  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  };

  // ── Students: multi-select + bulk actions + team modal ──────────────────
  const [studentSelected, setStudentSelected] = useState(() => new Set());
  // Educators (and other shared registrations) multi-select — same bulk-bar
  // routed through POST /admin/techfest/registrations/bulk-update.
  const [educatorSelected, setEducatorSelected] = useState(() => new Set());
  const [bulkDialog, setBulkDialog] = useState(null);  // null | 'zone' | 'coordinator' | 'team'
  const [bulkValue, setBulkValue] = useState('');
  const [bulkCoordQuery, setBulkCoordQuery] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  // Clear selections whenever tab changes OR rows reload
  useEffect(() => { setStudentSelected(new Set()); setEducatorSelected(new Set()); }, [tab, rows]);

  // Edit-student modal state
  const [editStudent, setEditStudent] = useState(null);         // row being edited
  const [editStudentForm, setEditStudentForm] = useState({});
  const [schoolSearch, setSchoolSearch] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);
  const openEditStudent = (row) => {
    setEditStudent(row);
    setEditStudentForm({
      name: row.name || '', email: row.email || '', phone: row.phone || '',
      school: row.school || '', city: row.city || '', state: row.state || '',
      team_id: row.team_id || '', team_name: row.team_name || '', team_role: row.team_role || '',
      zone: row.zone || '', status: row.status || '',
      assigned_school_id: row.assigned_school_id || '',
      assigned_school_name: row.assigned_school_name || row.school || '',
    });
    setSchoolSearch(row.assigned_school_name || row.school || '');
  };

  // Teams list for the "Add to Team" picker
  const [teamsList, setTeamsList] = useState([]);
  const loadTeams = async () => {
    try {
      const res = await axios.get(`${API}/admin/techfest/students/teams`, { headers: getAuthHeaders() });
      setTeamsList(res.data?.items || []);
    } catch { /* non-fatal */ }
  };

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
      // Student registrations live in their own collection (populated by CSV import)
      const url = tab === 'student'
        ? `${API}/admin/techfest/students`
        : `${API}/admin/techfest/registrations`;
      const params = tab === 'student' ? {} : { type: tab };
      const res = await axios.get(url, { headers: getAuthHeaders(), params });
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

  // Load teams list whenever we're on the Students tab (used by the bulk
  // "Add to existing team" picker + the edit-student modal).
  useEffect(() => { if (tab === 'student') loadTeams();  }, [tab, rows]);
  // Load combined-schools once the admin starts editing a student (needed by
  // the "Assign School" picker). Also populate it when switching to Students
  // so the picker opens with a warm list.
  useEffect(() => { if (tab === 'student' && combined.length === 0) loadCombined();  }, [tab]);

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

  // Distinct filter options derived from the currently loaded rows. Each
  // tab has different data shape, so we read every plausible field.
  const filterOptions = useMemo(() => {
    const pick = (keys) => {
      const s = new Set();
      rows.forEach((r) => keys.forEach((k) => { const v = (r?.[k] || '').toString().trim(); if (v) s.add(v); }));
      return Array.from(s).sort((a, b) => a.localeCompare(b));
    };
    return {
      zones: pick(['zone', 'zonal_city']),
      cities: pick(['city']),
      sources: pick(['source']),
      competitions: pick(['competition_code', 'competition_name']),
      coordinators: pick(['coordinator_name', 'coordinator_user_id']),
      statuses: pick(['status']),
    };
  }, [rows]);
  const activeFilterCount = Object.values(filters).filter((v) => Array.isArray(v) ? v.length > 0 : !!v).length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hasFilter = (arr) => Array.isArray(arr) ? arr.length > 0 : !!arr;
    const matchesFilter = (arr, candidates) => {
      if (!hasFilter(arr)) return true;
      const list = Array.isArray(arr) ? arr : [arr];
      return candidates.some((c) => list.includes(c));
    };
    let out = rows.filter((r) => {
      if (needle) {
        const hit = [
          r.name, r.email, r.phone, r.city, r.school_name, r.school_or_institute,
          r.role_designation, r.grade_taught, r.school_email, r.school_phone, r.school_address,
          r.source, r.source_details, r.referrer_slug,
          r.robotics_format, r.robotics_external_company,
          r.school, r.address, r.state, r.pincode, r.country, r.gender,
          r.techfest_id, r.compi_reg_id, r.competition_name, r.competition_code,
          r.team_id, r.team_name, r.team_role,
          r.team_leader_name, r.team_leader_email, r.team_leader_phone,
          r.zonal_city, r.zonal_college, r.coordinator_name, r.assigned_school_name,
          r.zone, r.status,
        ].some((v) => (v || '').toString().toLowerCase().includes(needle));
        if (!hit) return false;
      }
      if (!matchesFilter(filters.zone, [r.zone, r.zonal_city])) return false;
      if (!matchesFilter(filters.city, [r.city])) return false;
      if (!matchesFilter(filters.source, [r.source])) return false;
      if (!matchesFilter(filters.competition, [r.competition_code, r.competition_name])) return false;
      if (!matchesFilter(filters.coordinator, [r.coordinator_name, r.coordinator_user_id])) return false;
      if (!matchesFilter(filters.status, [r.status])) return false;
      return true;
    });
    if (sortBy) {
      const dir = sortDir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = (a?.[sortBy] || '').toString().toLowerCase();
        const bv = (b?.[sortBy] || '').toString().toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }
    return out;
  }, [rows, q, filters, sortBy, sortDir]);

  // Group students by team_id so team members render adjacent. Students with
  // no team_id go to a trailing "No team" bucket. Groups preserve the
  // filtered sort order (first-seen within each team wins).
  const studentGroups = useMemo(() => {
    if (tab !== 'student') return [];
    const map = new Map();
    const noTeam = [];
    filtered.forEach((r) => {
      const tid = (r.team_id || '').trim();
      if (!tid) { noTeam.push(r); return; }
      if (!map.has(tid)) map.set(tid, { team_id: tid, team_name: r.team_name || tid, members: [] });
      map.get(tid).members.push(r);
    });
    const groups = Array.from(map.values()).sort((a, b) => (a.team_name || '').localeCompare(b.team_name || ''));
    if (noTeam.length) groups.push({ team_id: '__noteam__', team_name: 'No team', members: noTeam });
    return groups;
  }, [filtered, tab]);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Students live in a dedicated collection — the combined /registrations/export
      // endpoint doesn't read it so the Students tab was downloading empty CSVs.
      const url = tab === 'student'
        ? `${API}/admin/techfest/students/export`
        : `${API}/admin/techfest/registrations/export`;
      const params = tab === 'student' ? {} : { type: tab };
      const res = await axios.get(url, {
        headers: getAuthHeaders(), params, responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const bUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      a.href = bUrl; a.download = `techfest-${tab}-${stamp}.csv`; a.click();
      URL.revokeObjectURL(bUrl);
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  // ── Bulk + edit handlers for students ───────────────────────────────────
  const applyStudentBulkPatch = async (patch) => {
    const ids = Array.from(studentSelected);
    if (!ids.length) { toast.error('Select at least one student'); return; }
    setBulkSaving(true);
    try {
      const res = await axios.post(
        `${API}/admin/techfest/students/bulk-update`,
        { ids, patch },
        { headers: getAuthHeaders() },
      );
      toast.success(`Updated ${res.data?.modified_count || 0} student(s)`);
      setBulkDialog(null); setBulkValue(''); setBulkCoordQuery('');
      setStudentSelected(new Set());
      await load();
      await loadTeams();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Bulk update failed');
    } finally { setBulkSaving(false); }
  };

  const saveEditStudent = async () => {
    if (!editStudent?._id) return;
    setSavingStudent(true);
    try {
      await axios.patch(
        `${API}/admin/techfest/students/${editStudent._id}`,
        editStudentForm,
        { headers: getAuthHeaders() },
      );
      toast.success('Student updated');
      setEditStudent(null); setEditStudentForm({});
      await load();
      await loadTeams();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally { setSavingStudent(false); }
  };

  // Toggle a single student checkbox / toggle all visible on current filter
  const toggleStudent = (id) => {
    setStudentSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleStudentAll = () => {
    const allIds = filtered.map((r) => r._id).filter(Boolean);
    const allSelected = allIds.length > 0 && allIds.every((id) => studentSelected.has(id));
    setStudentSelected(allSelected ? new Set() : new Set(allIds));
  };
  const toggleEducator = (id) => {
    setEducatorSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleEducatorAll = () => {
    const allIds = filtered.map((r) => r._id).filter(Boolean);
    const allSelected = allIds.length > 0 && allIds.every((id) => educatorSelected.has(id));
    setEducatorSelected(allSelected ? new Set() : new Set(allIds));
  };

  const applyEducatorBulkPatch = async (patch) => {
    const ids = Array.from(educatorSelected);
    if (!ids.length) { toast.error('Select at least one row'); return; }
    setBulkSaving(true);
    try {
      const body = { reg_ids: ids, ...patch };
      const res = await axios.post(
        `${API}/admin/techfest/registrations/bulk-update`,
        body,
        { headers: getAuthHeaders() },
      );
      toast.success(`Updated ${res.data?.modified_count || 0} row(s)`);
      setBulkDialog(null); setBulkValue(''); setBulkCoordQuery('');
      setEducatorSelected(new Set());
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Bulk update failed');
    } finally { setBulkSaving(false); }
  };

  // Schools (combined) bulk — translates school_keys back to the matching
  // school_reg_ids (or educator_reg_ids as a fallback) and calls the shared
  // registration bulk endpoint.
  const applySchoolBulkPatch = async (patch) => {
    const regIds = [];
    combined.forEach((row) => {
      if (!combinedSelected.has(row.school_key)) return;
      if (row.school_reg_id) regIds.push(row.school_reg_id);
      (row.educator_reg_ids || []).forEach((id) => regIds.push(id));
    });
    if (!regIds.length) { toast.error('Selected schools have no registration ids'); return; }
    setBulkSaving(true);
    try {
      const res = await axios.post(
        `${API}/admin/techfest/registrations/bulk-update`,
        { reg_ids: regIds, ...patch },
        { headers: getAuthHeaders() },
      );
      toast.success(`Updated ${res.data?.modified_count || 0} registration(s) across selected schools`);
      setBulkDialog(null); setBulkValue(''); setBulkCoordQuery('');
      setCombinedSelected(new Set());
      await loadCombined();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Bulk update failed');
    } finally { setBulkSaving(false); }
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
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => setShowBulkEmail(true)}
                    className="bg-[#DC2626] hover:bg-[#B91C1C]"
                    data-testid="admin-competitions-bulk-email-btn"
                  >
                    <Megaphone className="w-4 h-4 mr-1" /> Email Blast
                  </Button>
                )}
                <Button size="sm" onClick={handleExport} disabled={exporting} className="bg-[#0A1F44] hover:bg-[#1E3A5F]" data-testid="admin-competitions-export-btn">
                  {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />} Export CSV
                </Button>
              </div>
            </div>
          )}

          {/* ── Active-filters strip (shown only when at least one filter is set) ── */}
          {isRegistrationTab && (activeFilterCount > 0 || sortBy) && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/60" data-testid="admin-competitions-active-filters">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active</span>
              {Object.entries(filters).flatMap(([k, arr]) => {
                const vals = Array.isArray(arr) ? arr : (arr ? [arr] : []);
                return vals.map((v) => (
                  <span key={`${k}-${v}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-full pl-2 pr-1 py-0.5">
                    {k}: {v}
                    <button type="button" onClick={() => setFilters((p) => ({ ...p, [k]: (Array.isArray(p[k]) ? p[k].filter((x) => x !== v) : '') }))} className="w-4 h-4 rounded-full hover:bg-slate-200 flex items-center justify-center">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ));
              })}
              {sortBy && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626] bg-white border border-red-200 rounded-full pl-2 pr-1 py-0.5">
                  sort: {sortBy} {sortDir === 'asc' ? '↑' : '↓'}
                  <button type="button" onClick={() => { setSortBy(''); setSortDir('asc'); }} className="w-4 h-4 rounded-full hover:bg-red-50 flex items-center justify-center">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              <span className="ml-auto text-[11px] text-slate-500">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
            </div>
          )}

          {/* ── Students bulk-action bar (zone · coordinator · team) ── */}
          {tab === 'student' && studentSelected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-amber-200 bg-amber-50" data-testid="admin-competitions-student-bulkbar">
              <CheckSquare className="w-4 h-4 text-amber-700" />
              <span className="text-sm font-bold text-amber-900">{studentSelected.size} student{studentSelected.size === 1 ? '' : 's'} selected</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog('zone'); setBulkValue(''); }} data-testid="admin-competitions-bulk-zone-btn">
                <MapPin className="w-3.5 h-3.5 mr-1" /> Assign Zone
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog('coordinator'); setBulkValue(''); setBulkCoordQuery(''); }} data-testid="admin-competitions-bulk-coord-btn">
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign Coordinator
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog('team'); setBulkValue(''); }} data-testid="admin-competitions-bulk-team-btn">
                <Layers className="w-3.5 h-3.5 mr-1" /> Add to Team
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStudentSelected(new Set())} data-testid="admin-competitions-bulk-clear">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* ── Educators / Mentors bulk-action bar ── */}
          {tab === 'educator' && educatorSelected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-red-200 bg-red-50" data-testid="admin-competitions-educator-bulkbar">
              <CheckSquare className="w-4 h-4 text-red-700" />
              <span className="text-sm font-bold text-red-900">{educatorSelected.size} educator{educatorSelected.size === 1 ? '' : 's'} selected</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog('zone'); setBulkValue(''); }} data-testid="admin-competitions-edu-bulk-zone-btn">
                <MapPin className="w-3.5 h-3.5 mr-1" /> Assign Zone
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog('coordinator'); setBulkValue(''); setBulkCoordQuery(''); }} data-testid="admin-competitions-edu-bulk-coord-btn">
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign Coordinator
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEducatorSelected(new Set())}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* ── Schools (combined) bulk-action bar — reuses combinedSelected ── */}
          {tab === 'combined' && combinedSelected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-blue-200 bg-blue-50" data-testid="admin-competitions-school-bulkbar">
              <CheckSquare className="w-4 h-4 text-blue-700" />
              <span className="text-sm font-bold text-blue-900">{combinedSelected.size} school{combinedSelected.size === 1 ? '' : 's'} selected</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog('zone'); setBulkValue(''); }} data-testid="admin-competitions-school-bulk-zone-btn">
                <MapPin className="w-3.5 h-3.5 mr-1" /> Assign Zone
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog('coordinator'); setBulkValue(''); setBulkCoordQuery(''); }} data-testid="admin-competitions-school-bulk-coord-btn">
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign Coordinator
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCombinedSelected(new Set())}>
                <X className="w-3.5 h-3.5" />
              </Button>
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
              ) : tab === 'student' ? (
                <table className="w-full text-sm min-w-[2600px]" data-testid="admin-competitions-table-student">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap sticky left-0 bg-slate-50 z-10">
                        <button type="button" onClick={toggleStudentAll} className="hover:text-[#DC2626]" data-testid="admin-competitions-student-select-all">
                          {filtered.length > 0 && filtered.every((r) => r._id && studentSelected.has(r._id)) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">Sr.</th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">
                        <span className="inline-flex items-center">
                          <button type="button" onClick={() => toggleSort('name')} className="hover:text-[#DC2626]" data-testid="admin-competitions-sort-name">
                            Name {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                          </button>
                        </span>
                      </th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">Email</th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">Phone</th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">
                        <span className="inline-flex items-center">
                          <button type="button" onClick={() => toggleSort('city')} className="hover:text-[#DC2626]">City {sortBy === 'city' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                          <HeaderFilter label="City" value={filters.city} options={filterOptions.cities} onChange={(v) => setFilters((p) => ({ ...p, city: v }))} testid="admin-competitions-headfilter-city" />
                        </span>
                      </th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">School / Institute</th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">Assigned School</th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">
                        <span className="inline-flex items-center">
                          <button type="button" onClick={() => toggleSort('zone')} className="hover:text-[#DC2626]">Zone {sortBy === 'zone' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                          <HeaderFilter label="Zone" value={filters.zone} options={filterOptions.zones} onChange={(v) => setFilters((p) => ({ ...p, zone: v }))} testid="admin-competitions-headfilter-zone" />
                        </span>
                      </th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">
                        <span className="inline-flex items-center">
                          Status
                          <HeaderFilter label="Status" value={filters.status} options={filterOptions.statuses} onChange={(v) => setFilters((p) => ({ ...p, status: v }))} testid="admin-competitions-headfilter-status" />
                        </span>
                      </th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">
                        <span className="inline-flex items-center">
                          Coordinator
                          <HeaderFilter label="Coordinator" value={filters.coordinator} options={filterOptions.coordinators} onChange={(v) => setFilters((p) => ({ ...p, coordinator: v }))} testid="admin-competitions-headfilter-coord" />
                        </span>
                      </th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">
                        <span className="inline-flex items-center">
                          Competition
                          <HeaderFilter label="Competition" value={filters.competition} options={filterOptions.competitions} onChange={(v) => setFilters((p) => ({ ...p, competition: v }))} testid="admin-competitions-headfilter-competition" />
                        </span>
                      </th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">Team Role</th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">Techfest ID</th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap cursor-pointer" onClick={() => toggleSort('registration_date')}>
                        Registered {sortBy === 'registration_date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => { let sr = 0; return studentGroups.map((grp) => (
                      <React.Fragment key={grp.team_id}>
                        {/* Team header row — spans all columns, shows team name + member count */}
                        <tr className="bg-gradient-to-r from-amber-50 via-amber-50 to-transparent border-b border-amber-200" data-testid={`admin-competitions-team-row-${grp.team_id}`}>
                          <td colSpan={16} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-amber-700" />
                              <span className="text-sm font-bold text-amber-900">{grp.team_name || '(unnamed team)'}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-white border border-amber-200 rounded-full px-2 py-0.5">
                                {grp.team_id === '__noteam__' ? 'solo' : grp.team_id}
                              </span>
                              <span className="text-xs text-amber-700">· {grp.members.length} member{grp.members.length === 1 ? '' : 's'}</span>
                            </div>
                          </td>
                        </tr>
                        {grp.members.map((r) => { sr += 1; return (
                          <tr key={r._id || `${r.email}-${sr}`} className={`border-b border-slate-100 hover:bg-slate-50/70 align-top ${r._id && studentSelected.has(r._id) ? 'bg-amber-50/60' : ''}`} data-testid={`admin-competitions-row-student-${r._id || sr}`}>
                            <td className="px-3 py-3 sticky left-0 bg-white z-10">
                              {r._id && (
                                <button type="button" onClick={() => toggleStudent(r._id)} className="hover:text-[#DC2626]" data-testid={`admin-competitions-student-toggle-${r._id}`}>
                                  {studentSelected.has(r._id) ? <CheckSquare className="w-4 h-4 text-amber-700" /> : <Square className="w-4 h-4 text-slate-400" />}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-500 tabular-nums whitespace-nowrap">{sr}</td>
                            <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.name || '—'}</td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                              {r.email ? <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-[13px] hover:text-[#DC2626]"><Mail className="w-3 h-3" />{r.email}</a> : '—'}
                            </td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                              {r.phone ? <span className="inline-flex items-center gap-1 text-[12px]"><Phone className="w-3 h-3" />{r.phone}</span> : '—'}
                            </td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{r.city || '—'}</td>
                            <td className="px-3 py-3 text-slate-700 max-w-[260px] truncate" title={r.school || ''}>{r.school || '—'}</td>
                            <td className="px-3 py-3 text-slate-700 max-w-[220px] truncate" title={r.assigned_school_name || ''}>
                              {r.assigned_school_name
                                ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"><CheckSquare className="w-3 h-3" />{r.assigned_school_name}</span>
                                : <span className="text-slate-400 text-[11px] italic">not assigned</span>}
                            </td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{r.zone ? <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{r.zone}</span> : '—'}</td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{r.status || <span className="text-slate-400">—</span>}</td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{r.coordinator_name || <span className="text-slate-400">—</span>}</td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap text-[12px]">{r.competition_code || r.competition_name || '—'}</td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {r.team_role ? (
                                <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${/lead/i.test(r.team_role) ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{r.team_role}</span>
                              ) : '—'}
                            </td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap font-mono text-[12px]">{r.techfest_id || '—'}</td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap text-[12px]">{r.registration_date || fmtDateTime(r.created_at || r.imported_at)}</td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openEditStudent(r)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626] hover:text-[#B91C1C]"
                                data-testid={`admin-competitions-student-edit-${r._id}`}
                              >
                                <Pencil className="w-3 h-3" /> Edit
                              </button>
                            </td>
                          </tr>
                        ); })}
                      </React.Fragment>
                    )); })()}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm" data-testid={`admin-competitions-table-${tab}`}>
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <tr>
                      {tab === 'educator' && (
                        <th className="text-left px-3 py-3 font-bold w-8">
                          <button type="button" onClick={toggleEducatorAll} className="hover:text-[#DC2626]" data-testid="admin-competitions-educator-select-all">
                            {filtered.length > 0 && filtered.every((r) => r._id && educatorSelected.has(r._id)) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                        </th>
                      )}
                      <th className="text-left px-3 py-3 font-bold">Sr.</th>
                      <th className="text-left px-3 py-3 font-bold cursor-pointer" onClick={() => toggleSort('created_at')}>Registered {sortBy === 'created_at' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="text-left px-3 py-3 font-bold cursor-pointer" onClick={() => toggleSort('name')}>Name {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                      <th className="text-left px-3 py-3 font-bold">Contact</th>
                      <th className="text-left px-3 py-3 font-bold">
                        <span className="inline-flex items-center">
                          <button type="button" onClick={() => toggleSort('city')} className="hover:text-[#DC2626]">City {sortBy === 'city' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                          <HeaderFilter label="City" value={filters.city} options={filterOptions.cities} onChange={(v) => setFilters((p) => ({ ...p, city: v }))} testid={`admin-competitions-headfilter-city-${tab}`} />
                        </span>
                      </th>
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
                      <th className="text-left px-3 py-3 font-bold">
                        <span className="inline-flex items-center">
                          Source
                          <HeaderFilter label="Source" value={filters.source} options={filterOptions.sources} onChange={(v) => setFilters((p) => ({ ...p, source: v }))} testid={`admin-competitions-headfilter-source-${tab}`} />
                        </span>
                      </th>
                      <th className="text-left px-3 py-3 font-bold">School Address</th>
                      <th className="text-left px-3 py-3 font-bold">School Contact</th>
                      {(tab === 'school' || tab === 'educator') && (
                        <>
                          <th className="text-left px-3 py-3 font-bold">
                            <span className="inline-flex items-center">
                              Competition
                              <HeaderFilter label="Competition" value={filters.competition} options={filterOptions.competitions} onChange={(v) => setFilters((p) => ({ ...p, competition: v }))} testid={`admin-competitions-headfilter-competition-${tab}`} />
                            </span>
                          </th>
                          <th className="text-left px-3 py-3 font-bold">
                            <span className="inline-flex items-center">
                              <button type="button" onClick={() => toggleSort('zone')} className="hover:text-[#DC2626]">Zone {sortBy === 'zone' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                              <HeaderFilter label="Zone" value={filters.zone} options={filterOptions.zones} onChange={(v) => setFilters((p) => ({ ...p, zone: v }))} testid={`admin-competitions-headfilter-zone-${tab}`} />
                            </span>
                          </th>
                          <th className="text-left px-3 py-3 font-bold">
                            <span className="inline-flex items-center">
                              Coordinator
                              <HeaderFilter label="Coordinator" value={filters.coordinator} options={filterOptions.coordinators} onChange={(v) => setFilters((p) => ({ ...p, coordinator: v }))} testid={`admin-competitions-headfilter-coord-${tab}`} />
                            </span>
                          </th>
                        </>
                      )}
                      <th className="text-left px-3 py-3 font-bold">
                        <span className="inline-flex items-center">
                          Status
                          <HeaderFilter label="Status" value={filters.status} options={filterOptions.statuses} onChange={(v) => setFilters((p) => ({ ...p, status: v }))} testid={`admin-competitions-headfilter-status-${tab}`} />
                        </span>
                      </th>
                      <th className="text-right px-3 py-3 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r._id} className={`border-b border-slate-100 hover:bg-slate-50/70 align-top ${tab === 'educator' && r._id && educatorSelected.has(r._id) ? 'bg-red-50/60' : ''}`} data-testid={`admin-competitions-row-${r._id}`}>
                        {tab === 'educator' && (
                          <td className="px-3 py-3">
                            {r._id && (
                              <button type="button" onClick={() => toggleEducator(r._id)} className="hover:text-[#DC2626]" data-testid={`admin-competitions-educator-toggle-${r._id}`}>
                                {educatorSelected.has(r._id) ? <CheckSquare className="w-4 h-4 text-red-700" /> : <Square className="w-4 h-4 text-slate-400" />}
                              </button>
                            )}
                          </td>
                        )}
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

      {/* ── Student bulk-action dialog (Zone / Coordinator / Team) ── */}
      <Dialog open={!!bulkDialog} onOpenChange={() => !bulkSaving && setBulkDialog(null)}>
        <DialogContent data-testid="admin-competitions-bulk-dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkDialog === 'zone' && 'Assign Zone to Students'}
              {bulkDialog === 'coordinator' && 'Assign Coordinator'}
              {bulkDialog === 'team' && 'Add to Existing Team'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              Applying to <strong>{studentSelected.size}</strong> selected student{studentSelected.size === 1 ? '' : 's'}.
            </div>

            {bulkDialog === 'zone' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Zone</label>
                <SearchableSelect
                  value={bulkValue}
                  onChange={setBulkValue}
                  options={ZONE_OPTIONS.map((z) => ({ value: z.slug, label: z.label }))}
                  placeholder="Select a zone…"
                  testid="admin-competitions-bulk-zone-select"
                />
              </div>
            )}

            {bulkDialog === 'coordinator' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Search team member</label>
                <Input
                  value={bulkCoordQuery}
                  onChange={(e) => setBulkCoordQuery(e.target.value)}
                  placeholder="Name or email"
                  className="mt-1"
                  data-testid="admin-competitions-bulk-coord-search"
                />
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg mt-2 divide-y divide-slate-100">
                  {teamUsers
                    .filter((u) => {
                      const n = bulkCoordQuery.toLowerCase().trim();
                      if (!n) return true;
                      return (u.name || '').toLowerCase().includes(n) || (u.email || '').toLowerCase().includes(n);
                    })
                    .slice(0, 25)
                    .map((u) => (
                      <button
                        key={u.id || u.email}
                        type="button"
                        onClick={() => setBulkValue(JSON.stringify({ coordinator_user_id: u.id, coordinator_name: u.name }))}
                        className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${bulkValue && JSON.parse(bulkValue).coordinator_user_id === u.id ? 'bg-emerald-50' : ''}`}
                        data-testid={`admin-competitions-bulk-coord-opt-${u.id}`}
                      >
                        <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {bulkDialog === 'team' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pick an existing team</label>
                <SearchableSelect
                  value={bulkValue}
                  onChange={setBulkValue}
                  options={teamsList.map((t) => ({
                    value: JSON.stringify({ team_id: t.team_id, team_name: t.team_name, team_leader_name: t.team_leader_name, team_leader_email: t.team_leader_email, team_leader_phone: t.team_leader_phone }),
                    label: `${t.team_name} · ${t.team_id}`,
                    hint: `${t.member_count} member${t.member_count === 1 ? '' : 's'}${t.school ? ' · ' + t.school : ''}`,
                  }))}
                  placeholder="Search teams…"
                  testid="admin-competitions-bulk-team-select"
                />
                <div className="text-[11px] text-slate-500 mt-1.5">The selected students will be moved to this team (team_id, team_name and team_leader fields updated).</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setBulkDialog(null)} disabled={bulkSaving}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!bulkValue) return;
                  let patch = {};
                  if (bulkDialog === 'zone') patch = { zone: bulkValue };
                  else if (bulkDialog === 'coordinator') patch = JSON.parse(bulkValue);
                  else if (bulkDialog === 'team') patch = JSON.parse(bulkValue);
                  // Route the bulk call based on the active tab.
                  if (tab === 'student') applyStudentBulkPatch(patch);
                  else if (tab === 'educator') applyEducatorBulkPatch(patch);
                  else if (tab === 'combined') applySchoolBulkPatch(patch);
                }}
                disabled={bulkSaving || !bulkValue}
                className="bg-[#DC2626] hover:bg-[#B91C1C]"
                data-testid="admin-competitions-bulk-apply"
              >
                {bulkSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Apply to {tab === 'student' ? studentSelected.size : tab === 'educator' ? educatorSelected.size : combinedSelected.size}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit single student dialog (with school picker) ── */}
      <Dialog open={!!editStudent} onOpenChange={() => !savingStudent && setEditStudent(null)}>
        <DialogContent data-testid="admin-competitions-edit-student-dialog" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student — {editStudent?.name}</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Name</label>
                  <Input value={editStudentForm.name || ''} onChange={(e) => setEditStudentForm((p) => ({ ...p, name: e.target.value }))} className="mt-1" data-testid="admin-competitions-edit-student-name" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">City</label>
                  <Input value={editStudentForm.city || ''} onChange={(e) => setEditStudentForm((p) => ({ ...p, city: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email</label>
                  <Input value={editStudentForm.email || ''} onChange={(e) => setEditStudentForm((p) => ({ ...p, email: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Phone</label>
                  <Input value={editStudentForm.phone || ''} onChange={(e) => setEditStudentForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1" />
                </div>
              </div>

              {/* School picker — searchable autocomplete over combined-schools */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Assign School (from combined data)</label>
                <Input
                  value={schoolSearch}
                  onChange={(e) => {
                    setSchoolSearch(e.target.value);
                    setEditStudentForm((p) => ({ ...p, assigned_school_name: e.target.value, assigned_school_id: '' }));
                  }}
                  placeholder="Type to search schools…"
                  className="mt-1"
                  data-testid="admin-competitions-edit-student-school-search"
                />
                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg mt-1.5 divide-y divide-slate-100 bg-white">
                  {(() => {
                    const needle = (schoolSearch || '').toLowerCase().trim();
                    const matches = combined.filter((s) => (s.name || '').toLowerCase().includes(needle));
                    if (matches.length === 0 && needle) {
                      return (
                        <div className="px-3 py-2 text-[12px] text-amber-700 bg-amber-50">
                          <Square className="w-3 h-3 inline mr-1" />
                          No existing school matches "<strong>{schoolSearch}</strong>" — will save as a new / free-text school entry.
                        </div>
                      );
                    }
                    return matches.slice(0, 12).map((s) => {
                      const picked = (editStudentForm.assigned_school_name || '').toLowerCase() === (s.name || '').toLowerCase();
                      return (
                        <button
                          key={s.key || s.name}
                          type="button"
                          onClick={() => setEditStudentForm((p) => ({ ...p, assigned_school_id: s.school_reg_id || s.key || '', assigned_school_name: s.name || '' }))}
                          className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 ${picked ? 'bg-emerald-50' : ''}`}
                          data-testid={`admin-competitions-edit-student-school-opt-${s.key || s.name}`}
                        >
                          {picked ? <CheckSquare className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{s.city || '—'}{s.zone ? ` · ${s.zone}` : ''}</div>
                          </div>
                          {picked && <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-1.5 py-0.5">matched</span>}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Zone</label>
                  <SearchableSelect
                    value={editStudentForm.zone || ''}
                    onChange={(v) => setEditStudentForm((p) => ({ ...p, zone: v }))}
                    options={[{ value: '', label: '— no zone —' }, ...ZONE_OPTIONS.map((z) => ({ value: z.slug, label: z.label }))]}
                    placeholder="Select zone…"
                    testid="admin-competitions-edit-student-zone"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</label>
                  <SearchableSelect
                    value={editStudentForm.status || ''}
                    onChange={(v) => setEditStudentForm((p) => ({ ...p, status: v }))}
                    options={[
                      { value: '', label: '— no status —' },
                      { value: 'active', label: 'active' },
                      { value: 'confirmed', label: 'confirmed' },
                      { value: 'pending', label: 'pending' },
                      { value: 'disqualified', label: 'disqualified' },
                    ]}
                    placeholder="Select status…"
                    testid="admin-competitions-edit-student-status"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Team Role</label>
                  <SearchableSelect
                    value={editStudentForm.team_role || ''}
                    onChange={(v) => setEditStudentForm((p) => ({ ...p, team_role: v }))}
                    options={[
                      { value: '', label: '— no role —' },
                      { value: 'Lead', label: 'Lead' },
                      { value: 'Member', label: 'Member' },
                    ]}
                    placeholder="Select role…"
                    testid="admin-competitions-edit-student-role"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Move to existing team (optional)</label>
                <SearchableSelect
                  value={editStudentForm.team_id || ''}
                  onChange={(tid) => {
                    const t = teamsList.find((x) => x.team_id === tid);
                    if (!tid) { setEditStudentForm((p) => ({ ...p, team_id: '', team_name: '' })); return; }
                    setEditStudentForm((p) => ({ ...p, team_id: tid, team_name: t?.team_name || p.team_name }));
                  }}
                  options={[
                    { value: '', label: `— Keep current (${editStudent?.team_name || 'no team'}) —` },
                    ...teamsList.map((t) => ({ value: t.team_id, label: `${t.team_name} · ${t.team_id}`, hint: `${t.member_count} member${t.member_count === 1 ? '' : 's'}${t.school ? ' · ' + t.school : ''}` })),
                  ]}
                  placeholder="Search teams…"
                  testid="admin-competitions-edit-student-team"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setEditStudent(null)} disabled={savingStudent}>Cancel</Button>
                <Button onClick={saveEditStudent} disabled={savingStudent} className="bg-[#DC2626] hover:bg-[#B91C1C]" data-testid="admin-competitions-edit-student-save">
                  {savingStudent ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Email Blast */}
      <TechfestBulkEmailDialog
        open={showBulkEmail}
        onClose={() => setShowBulkEmail(false)}
        getAuthHeaders={getAuthHeaders}
      />
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

