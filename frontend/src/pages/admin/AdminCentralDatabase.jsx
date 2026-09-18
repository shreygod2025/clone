/**
 * Central Database — city-wise consolidated view of every human across
 * the OLL platform (team members, growth partners, teachers, schools,
 * students, Future Skills centres, FS leads).
 *
 * Tab 1: City Wise Database
 *   - Toggle between Map view (Leaflet + count-weighted markers) and
 *     List view (sortable rows).
 *   - Filter by role and stage.
 *   - Search or click a city to open a drawer showing every person in
 *     that city (name, contact, stage, role).
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Database, Search, Map as MapIcon, List as ListIcon, Users, Building2,
  GraduationCap, TrendingUp, Sparkles, UserCog, MapPin, Phone, Mail, X,
  Filter, RefreshCw, Layers, BarChart3,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Role catalogue — icon + label + colour used across map, list and drawer.
const ROLE_META = [
  { key: 'team',            label: 'Team',            icon: UserCog,        color: '#0EA5E9', hue: 'sky' },
  { key: 'growth_partners', label: 'Growth Partners', icon: TrendingUp,     color: '#10B981', hue: 'emerald' },
  { key: 'teachers',        label: 'Teachers',        icon: GraduationCap,  color: '#F59E0B', hue: 'amber' },
  { key: 'schools',         label: 'Schools',         icon: Building2,      color: '#7C3AED', hue: 'violet' },
  { key: 'students',        label: 'Students',        icon: Users,          color: '#DC2626', hue: 'rose' },
  { key: 'centers',         label: 'FS Centres',      icon: Sparkles,       color: '#0A1F44', hue: 'slate' },
  { key: 'fs_leads',        label: 'FS Leads',        icon: BarChart3,      color: '#EC4899', hue: 'pink' },
];
const ROLE_KEYS = ROLE_META.map((r) => r.key);
const ROLE_BY_KEY = Object.fromEntries(ROLE_META.map((r) => [r.key, r]));

const STAGE_BADGE = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  inquiry: 'bg-blue-100 text-blue-700 border-blue-200',
  applied: 'bg-blue-100 text-blue-700 border-blue-200',
  interested: 'bg-amber-100 text-amber-700 border-amber-200',
  qualified: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  onboarded: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  converted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  renewed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  active_school: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-100 text-slate-500 border-slate-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
};

const stageBadge = (stage) => STAGE_BADGE[(stage || '').toLowerCase()] || 'bg-slate-100 text-slate-600 border-slate-200';

// Marker radius scales roughly with log(count) so a city with 200 people
// isn't literally 40× bigger than a city with 5.
const markerRadius = (count) => Math.max(6, Math.min(28, Math.round(6 + Math.sqrt(count) * 1.6)));

const RoleChip = ({ role, count, active, onClick }) => {
  const meta = ROLE_BY_KEY[role];
  const Icon = meta?.icon || Users;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
        active
          ? 'text-white border-transparent'
          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
      }`}
      style={active ? { background: meta.color } : {}}
      data-testid={`role-chip-${role}`}
    >
      <Icon className="w-3 h-3" />
      {meta?.label || role}
      <span className={`ml-1 px-1.5 rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{count || 0}</span>
    </button>
  );
};

// ────────────────────────────────────────────────────────────────────
// City detail drawer
// ────────────────────────────────────────────────────────────────────
const CityDrawer = ({ city, onClose, roleFilter, stageFilter }) => {
  // Local filters inside the drawer — seeded from the page-level filters
  // so the drawer opens already scoped to what the admin was looking at,
  // but each control can be tuned without leaving the drawer.
  const [localSearch, setLocalSearch] = useState('');
  const [localRole, setLocalRole] = useState(roleFilter || 'all');
  const [localStage, setLocalStage] = useState(stageFilter || '');

  useEffect(() => {
    // Re-seed whenever the drawer opens against a new city / different
    // upstream filters.
    setLocalSearch('');
    setLocalRole(roleFilter || 'all');
    setLocalStage(stageFilter || '');
  }, [city?.city_key, roleFilter, stageFilter]);

  if (!city) return null;

  const entities = city.entities || {};
  const visibleRoles = localRole === 'all' ? ROLE_KEYS : [localRole];
  const stageQ = (localStage || '').toLowerCase();
  const searchQ = localSearch.trim().toLowerCase();

  // Stage options — union of stages across whichever role(s) are visible.
  const stageOptions = Array.from(new Set(
    visibleRoles.flatMap((r) => (entities[r] || []).map((e) => e.stage).filter(Boolean)),
  )).sort();

  const filterList = (items) => items.filter((e) => {
    if (stageQ && (e.stage || '').toLowerCase() !== stageQ) return false;
    if (searchQ) {
      const hay = `${e.name || ''} ${e.email || ''} ${e.phone || ''} ${e.contact_name || ''} ${e.meta || ''}`.toLowerCase();
      if (!hay.includes(searchQ)) return false;
    }
    return true;
  });

  const filteredByRole = visibleRoles.reduce((acc, r) => {
    acc[r] = filterList(entities[r] || []);
    return acc;
  }, {});
  const filteredTotal = Object.values(filteredByRole).reduce((s, arr) => s + arr.length, 0);
  const hasAny = filteredTotal > 0;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
      data-testid="city-drawer"
    >
      <div
        className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#0A1F44] to-[#1E3A5F] text-white sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
                <MapPin className="w-3.5 h-3.5" /> City
              </div>
              <div className="text-3xl font-black">{city.city}</div>
              <div className="text-sm text-white/70 mt-1">
                {filteredTotal} of {city.total} people match · {Object.keys(city.counts || {}).length} categories
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              aria-label="Close"
              data-testid="city-drawer-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Per-role summary chips (unfiltered totals for context) */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {ROLE_META.map((r) => (
              <span
                key={r.key}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10"
              >
                <r.icon className="w-3 h-3" /> {r.label}: {(city.counts || {})[r.key] || 0}
              </span>
            ))}
          </div>
        </div>

        {/* In-drawer filters */}
        <div className="px-6 pt-4 pb-3 bg-slate-50 border-b border-slate-100 space-y-2 sticky top-[152px] z-[5]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search name, email or phone..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/30 focus:border-[#0A1F44] bg-white"
                data-testid="drawer-search"
              />
            </div>
            <select
              value={localRole}
              onChange={(e) => { setLocalRole(e.target.value); setLocalStage(''); }}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white"
              data-testid="drawer-role-filter"
            >
              <option value="all">All roles</option>
              {ROLE_META.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label} ({(city.counts || {})[r.key] || 0})
                </option>
              ))}
            </select>
            <select
              value={localStage}
              onChange={(e) => setLocalStage(e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white"
              data-testid="drawer-stage-filter"
            >
              <option value="">All stages</option>
              {stageOptions.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {(localSearch || localRole !== 'all' || localStage) && (
              <button
                onClick={() => { setLocalSearch(''); setLocalRole('all'); setLocalStage(''); }}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2"
                data-testid="drawer-clear-filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          {!hasAny && (
            <div className="p-10 text-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
              No people match the current filters in {city.city}.
            </div>
          )}
          {visibleRoles.map((rk) => {
            const items = filteredByRole[rk] || [];
            if (items.length === 0) return null;
            const meta = ROLE_BY_KEY[rk];
            const Icon = meta.icon;
            return (
              <section key={rk} data-testid={`city-section-${rk}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                    style={{ background: meta.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="font-black text-[#0A1F44]">{meta.label}</div>
                  <span className="text-xs font-bold text-slate-500">· {items.length}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((e) => (
                    <div
                      key={`${rk}-${e.id}`}
                      className="flex items-start gap-2 border border-slate-100 hover:border-slate-200 rounded-lg px-3 py-2 bg-slate-50/50"
                      data-testid={`city-entity-${e.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">{e.name}</span>
                          {e.contact_name && (
                            <span className="text-[11px] text-slate-500">· {e.contact_name}</span>
                          )}
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${stageBadge(e.stage)}`}>
                            {(e.stage || '').replace('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-600">
                          {e.email && (
                            <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1 hover:text-slate-900">
                              <Mail className="w-3 h-3" /> {e.email}
                            </a>
                          )}
                          {e.phone && (
                            <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1 hover:text-slate-900">
                              <Phone className="w-3 h-3" /> {e.phone}
                            </a>
                          )}
                          {e.meta && <span className="text-slate-500">· {e.meta}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────
export default function AdminCentralDatabase() {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ cities: [], totals: {}, grand_total: 0 });
  const [view, setView] = useState('map');          // 'map' | 'list'
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/central-database/by-city`, { headers: getAuthHeaders() });
      setData(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load central database');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Search + role filter applied at the city list level.
  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.cities || []).filter((c) => {
      if (q && !c.city.toLowerCase().includes(q)) return false;
      if (roleFilter !== 'all' && !(c.counts || {})[roleFilter]) return false;
      return true;
    });
  }, [data.cities, search, roleFilter]);

  // Stage list (union across whichever role is selected).
  const stageOptions = useMemo(() => {
    const set = new Set();
    (data.cities || []).forEach((c) => {
      const roles = roleFilter === 'all' ? ROLE_KEYS : [roleFilter];
      roles.forEach((r) => (c.entities?.[r] || []).forEach((e) => e.stage && set.add(e.stage)));
    });
    return Array.from(set).sort();
  }, [data.cities, roleFilter]);

  // Map centre — default to India-ish middle; use first geo-coded city if we have one.
  const geoCities = useMemo(() => filteredCities.filter((c) => c.lat != null && c.lng != null), [filteredCities]);
  const center = geoCities.length > 0 ? [geoCities[0].lat, geoCities[0].lng] : [22.5937, 78.9629];

  // Totals — reflect current role filter.
  const currentTotals = useMemo(() => {
    if (roleFilter !== 'all') {
      return { [roleFilter]: filteredCities.reduce((s, c) => s + ((c.counts || {})[roleFilter] || 0), 0) };
    }
    return ROLE_KEYS.reduce((acc, r) => {
      acc[r] = filteredCities.reduce((s, c) => s + ((c.counts || {})[r] || 0), 0);
      return acc;
    }, {});
  }, [filteredCities, roleFilter]);

  return (
    <AdminLayout title="Central Database">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#0A1F44] flex items-center gap-2">
            <Database className="w-6 h-6" /> Central Database
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Everyone across the platform — team, growth partners, teachers, schools, students and Future Skills centres — grouped by city.
          </p>
        </div>

        {/* Tab bar — Tab 1 for now, more tabs can slot in later. */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit" data-testid="central-db-tabs">
          <button
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-white text-[#0A1F44] shadow-sm inline-flex items-center gap-2"
            data-testid="tab-city-wise"
          >
            <MapPin className="w-4 h-4" /> City Wise Database
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A1F44]/30 focus:border-[#0A1F44]"
                data-testid="city-search"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setStageFilter(''); }}
              className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
              data-testid="role-filter"
            >
              <option value="all">All roles</option>
              {ROLE_META.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
              data-testid="stage-filter"
            >
              <option value="">All stages</option>
              {stageOptions.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 ${view === 'map' ? 'bg-white shadow-sm text-[#0A1F44]' : 'text-slate-500'}`}
                data-testid="view-map"
              >
                <MapIcon className="w-3.5 h-3.5" /> Map
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 ${view === 'list' ? 'bg-white shadow-sm text-[#0A1F44]' : 'text-slate-500'}`}
                data-testid="view-list"
              >
                <ListIcon className="w-3.5 h-3.5" /> List
              </button>
            </div>
            <button
              onClick={fetchData}
              className="h-10 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Role total chips */}
          <div className="flex flex-wrap gap-1.5" data-testid="role-totals">
            <RoleChip role="team" count={currentTotals.team} active={roleFilter === 'team'} onClick={() => setRoleFilter(roleFilter === 'team' ? 'all' : 'team')} />
            <RoleChip role="growth_partners" count={currentTotals.growth_partners} active={roleFilter === 'growth_partners'} onClick={() => setRoleFilter(roleFilter === 'growth_partners' ? 'all' : 'growth_partners')} />
            <RoleChip role="teachers" count={currentTotals.teachers} active={roleFilter === 'teachers'} onClick={() => setRoleFilter(roleFilter === 'teachers' ? 'all' : 'teachers')} />
            <RoleChip role="schools" count={currentTotals.schools} active={roleFilter === 'schools'} onClick={() => setRoleFilter(roleFilter === 'schools' ? 'all' : 'schools')} />
            <RoleChip role="students" count={currentTotals.students} active={roleFilter === 'students'} onClick={() => setRoleFilter(roleFilter === 'students' ? 'all' : 'students')} />
            <RoleChip role="centers" count={currentTotals.centers} active={roleFilter === 'centers'} onClick={() => setRoleFilter(roleFilter === 'centers' ? 'all' : 'centers')} />
            <RoleChip role="fs_leads" count={currentTotals.fs_leads} active={roleFilter === 'fs_leads'} onClick={() => setRoleFilter(roleFilter === 'fs_leads' ? 'all' : 'fs_leads')} />
            <div className="ml-auto text-xs text-slate-500">
              {filteredCities.length} cities · {filteredCities.reduce((s, c) => s + (roleFilter === 'all' ? c.total : (c.counts?.[roleFilter] || 0)), 0)} people
            </div>
          </div>
        </div>

        {/* Content: Map or List */}
        {loading ? (
          <div className="p-10 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">Loading…</div>
        ) : view === 'map' ? (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" data-testid="city-map-view">
            <div className="h-[560px]">
              <MapContainer
                center={center}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoCities.map((c) => {
                  const count = roleFilter === 'all' ? c.total : (c.counts?.[roleFilter] || 0);
                  if (count === 0) return null;
                  const meta = roleFilter === 'all' ? null : ROLE_BY_KEY[roleFilter];
                  const color = meta?.color || '#DC2626';
                  return (
                    <CircleMarker
                      key={c.city_key}
                      center={[c.lat, c.lng]}
                      radius={markerRadius(count)}
                      pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.35 }}
                      eventHandlers={{ click: () => setSelected(c) }}
                    >
                      <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                        <div className="font-bold text-[#0A1F44]">{c.city}</div>
                        <div className="text-xs">
                          {count} {roleFilter === 'all' ? 'people' : (ROLE_BY_KEY[roleFilter]?.label || 'people')}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
            {filteredCities.some((c) => c.lat == null) && (
              <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
                {filteredCities.filter((c) => c.lat == null).length} cities have no coordinates yet — switch to List view to see them.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" data-testid="city-list-view">
            {filteredCities.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No cities match the current filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 text-left">City</th>
                      {ROLE_META.map((r) => (
                        <th key={r.key} className="px-3 py-2 text-right">
                          <span className="inline-flex items-center gap-1"><r.icon className="w-3 h-3" style={{ color: r.color }} /> {r.label}</span>
                        </th>
                      ))}
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCities.map((c) => (
                      <tr
                        key={c.city_key}
                        onClick={() => setSelected(c)}
                        className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                        data-testid={`city-row-${c.city_key}`}
                      >
                        <td className="px-4 py-2.5 font-bold text-[#0A1F44]">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.city}
                          </div>
                        </td>
                        {ROLE_META.map((r) => (
                          <td key={r.key} className="px-3 py-2.5 text-right">
                            {(c.counts?.[r.key] || 0) > 0 ? (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded" style={{ color: r.color, background: `${r.color}15` }}>
                                {c.counts[r.key]}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right font-black text-[#0A1F44]">{c.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <CityDrawer
        city={selected}
        onClose={() => setSelected(null)}
        roleFilter={roleFilter}
        stageFilter={stageFilter}
      />
    </AdminLayout>
  );
}
