/**
 * GP Active Partner card — one card per team_user marked
 * `is_growth_partner: true`. Shows a KPI band (leads, conversions, revenue,
 * AOV, students, retention, lost) pulled from
 * `GET /api/growth-partners/{team_user_id}/kpis`, and expands to an
 * accordion listing every school assigned to that partner grouped by
 * stage. Each school row has a "View" action that opens the full-details
 * modal.
 */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronRight, BarChart3, Eye, UserMinus, Users, GraduationCap,
  IndianRupee, TrendingUp, TrendingDown, Repeat, Building2, Phone, Mail, MapPin,
  Calendar, X, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { useAuth } from '../../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const initialsOf = (n) => (n || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
};

const STAGE_META = {
  leads:       { label: 'Leads',       color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-500' },
  conversions: { label: 'Conversions', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  lost:        { label: 'Lost',        color: 'bg-rose-100 text-rose-700 border-rose-200',       dot: 'bg-rose-500' },
};

// ────────────────────────────────────────────────────────────────────
// School details modal
// ────────────────────────────────────────────────────────────────────
const SchoolDetailsModal = ({ school, onClose }) => {
  if (!school) return null;
  const rows = [
    ['Contact Name',   school.contact_name],
    ['Phone',          school.phone],
    ['Email',          school.email],
    ['Location',       school.location],
    ['Board',          school.board],
    ['Status',         school.status],
    ['Onboarding',     school.onboarding_status],
    ['Total Students', school.total_students],
    ['Conversion Amount', school.conversion_amount ? fmtINR(school.conversion_amount) : null],
    ['GP Share',        school.gp_share_amount ? fmtINR(school.gp_share_amount) : null],
    ['Fee Range',      school.fee_range],
    ['School Size',    school.school_size],
    ['Programs',       Array.isArray(school.programs_interested) ? school.programs_interested.join(', ') : school.programs_interested],
    ['Assigned To',    school.assigned_to_name],
    ['Meeting Date',   school.meeting_date ? fmtDate(school.meeting_date) : null],
    ['Created',        school.created_at ? fmtDate(school.created_at) : null],
    ['Updated',        school.updated_at ? fmtDate(school.updated_at) : null],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1E3A5F]" /> {school.school_name || '—'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rows.map(([label, value]) => (
              <div key={label} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
                <div className="text-sm font-semibold text-slate-900 break-words">{value}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-3 border-t border-slate-100 mt-3">
            <Link to={`/admin/schools?id=${school.id}`} onClick={onClose}>
              <button className="inline-flex items-center gap-1 text-sm font-bold text-[#1E3A5F] hover:underline">
                Open in School CRM <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ────────────────────────────────────────────────────────────────────
// KPI mini-card
// ────────────────────────────────────────────────────────────────────
const KpiPill = ({ icon: Icon, label, value, tone }) => (
  <div className={`rounded-lg border px-3 py-2 flex-1 min-w-[110px] ${tone}`}>
    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest opacity-80">
      <Icon className="w-3 h-3" /> {label}
    </div>
    <div className="text-base font-black leading-tight mt-0.5">{value}</div>
  </div>
);

// ────────────────────────────────────────────────────────────────────
// GP Active Partner Card
// ────────────────────────────────────────────────────────────────────
export default function GPActivePartnerCard({ user, role, onMarkInactive }) {
  const { getAuthHeaders } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);

  const load = useCallback(async () => {
    if (kpis) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/growth-partners/${user.id}/kpis`, { headers: getAuthHeaders() });
      setKpis(res.data);
    } catch (e) {
      toast.error('Failed to load partner KPIs');
    } finally {
      setLoading(false);
    }
  }, [user.id, kpis, getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const toggle = () => setExpanded((v) => !v);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-shadow" data-testid={`gp-active-card-${user.id}`}>
      {/* Header */}
      <div className="p-4 flex flex-wrap items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {initialsOf(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#1E3A5F] text-base">{user.name}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              Active Partner
            </span>
            {role?.name && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {role.name}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
            {user.phone && (
              <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1 hover:text-slate-900">
                <Phone className="w-3 h-3" /> {user.phone}
              </a>
            )}
            {user.email && (
              <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1 hover:text-slate-900">
                <Mail className="w-3 h-3" /> {user.email}
              </a>
            )}
            {user.city && (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <MapPin className="w-3 h-3" /> {user.city}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Link to={`/admin/users/${user.id}/performance`}>
            <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-xs font-bold" data-testid={`gp-reports-${user.id}`}>
              <BarChart3 className="w-3.5 h-3.5" /> Reports
            </button>
          </Link>
          <button
            onClick={() => onMarkInactive(user)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold"
            data-testid={`gp-mark-inactive-${user.id}`}
          >
            <UserMinus className="w-3.5 h-3.5" /> Mark Inactive
          </button>
          <button
            onClick={toggle}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold"
            data-testid={`gp-view-${user.id}`}
          >
            <Eye className="w-3.5 h-3.5" /> {expanded ? 'Hide' : 'View'}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-4 pb-3">
        {loading && !kpis ? (
          <div className="h-14 rounded-lg bg-slate-50 animate-pulse" />
        ) : kpis ? (
          <div className="flex flex-wrap gap-2">
            <KpiPill icon={Users}          label="Leads"       value={kpis.leads}          tone="border-blue-100 bg-blue-50 text-blue-900" />
            <KpiPill icon={TrendingUp}     label="Conversions" value={kpis.conversions}    tone="border-emerald-100 bg-emerald-50 text-emerald-900" />
            <KpiPill icon={IndianRupee}    label="Revenue"     value={fmtINR(kpis.revenue)} tone="border-indigo-100 bg-indigo-50 text-indigo-900" />
            <KpiPill icon={IndianRupee}    label="GP Earnings" value={fmtINR(kpis.gp_earnings)} tone="border-fuchsia-100 bg-fuchsia-50 text-fuchsia-900" data-testid="gp-earnings-chip" />
            <KpiPill icon={IndianRupee}    label="AOV"         value={fmtINR(kpis.aov)}    tone="border-purple-100 bg-purple-50 text-purple-900" />
            <KpiPill icon={GraduationCap}  label="Students"    value={kpis.total_students} tone="border-amber-100 bg-amber-50 text-amber-900" />
            <KpiPill icon={Repeat}         label="Retention"   value={`${kpis.retention_rate}%`} tone="border-teal-100 bg-teal-50 text-teal-900" />
            <KpiPill icon={TrendingDown}   label="Lost"        value={kpis.lost}           tone="border-rose-100 bg-rose-50 text-rose-900" />
          </div>
        ) : null}
      </div>

      {/* Accordion — schools by stage */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4" data-testid={`gp-accordion-${user.id}`}>
          {kpis && Object.entries(STAGE_META).map(([stage, meta]) => {
            const items = kpis.schools_by_stage?.[stage] || [];
            if (items.length === 0) return null;
            return (
              <div key={stage} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  <div className="text-xs font-black text-[#0F1E33] uppercase tracking-widest">
                    {meta.label} · {items.length}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-left">School</th>
                        <th className="px-3 py-2 text-left">Contact</th>
                        <th className="px-3 py-2 text-left">Location</th>
                        <th className="px-3 py-2 text-right">Students</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((s) => (
                        <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-[#0F1E33]">{s.school_name || '—'}</td>
                          <td className="px-3 py-2 text-xs">
                            <div className="text-slate-700">{s.contact_name || '—'}</div>
                            <div className="text-slate-500">{s.phone || ''}</div>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">{s.location || '—'}</td>
                          <td className="px-3 py-2 text-right">{s.total_students || 0}</td>
                          <td className="px-3 py-2 text-xs">
                            <span className={`inline-block px-2 py-0.5 rounded border font-bold uppercase tracking-wide text-[10px] ${meta.color}`}>
                              {(s.status || '').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => setSelectedSchool(s)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline"
                              data-testid={`school-view-${s.id}`}
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {kpis && kpis.schools_by_stage &&
            Object.values(kpis.schools_by_stage).every((a) => a.length === 0) && (
              <div className="text-center py-6 text-slate-500 text-sm">
                No schools assigned to this partner yet. Assign schools from the School CRM's "Reassign" action.
              </div>
            )}
        </div>
      )}

      <SchoolDetailsModal school={selectedSchool} onClose={() => setSelectedSchool(null)} />
    </div>
  );
}
