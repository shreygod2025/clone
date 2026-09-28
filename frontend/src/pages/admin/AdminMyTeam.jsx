import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import TaskCreateModal from '../../components/tasks/TaskCreateModal';
import { generateTeamMemberReportPDF } from '../../utils/teamMemberReportPdf';
import {
  Users as UsersIcon, Sparkles, ListChecks, Send, CheckCircle2, FolderKanban,
  BarChart3, Plus, Search, Mail, Phone, FileDown, Calendar, Loader2,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AVATAR_COLORS = ['bg-rose-500','bg-orange-500','bg-amber-500','bg-lime-500','bg-emerald-500','bg-teal-500','bg-cyan-500','bg-sky-500','bg-blue-500','bg-indigo-500','bg-violet-500','bg-fuchsia-500'];
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
};

const AdminMyTeam = () => {
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [taskFor, setTaskFor] = useState(null); // team_user object to assign a task to
  const [period, setPeriod] = useState('weekly'); // 'weekly' | 'monthly' | 'quarterly'
  const [downloadingId, setDownloadingId] = useState(null);
  // Ref anchor for the report window — used only when period=weekly to let
  // managers step back through earlier weeks before downloading.
  const _thisMonday = (() => {
    const d = new Date(); const dow = d.getDay();
    d.setDate(d.getDate() + ((dow === 0 ? -6 : 1) - dow));
    return d.toISOString().slice(0, 10);
  })();
  const [weekRef, setWeekRef] = useState(_thisMonday);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/team/my-team`, { headers: getAuthHeaders() });
      setData(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load team');
      setData(null);
    } finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const handleDownloadPDF = async (member) => {
    setDownloadingId(member.id);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'weekly') params.set('ref', weekRef);
      const res = await axios.get(
        `${API}/team/member-report/${member.id}?${params.toString()}`,
        { headers: getAuthHeaders() },
      );
      await generateTeamMemberReportPDF(res.data);
      toast.success(`Downloaded ${period} report for ${member.name}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to generate report');
    } finally {
      setDownloadingId(null);
    }
  };

  const members = (data?.members || []).filter(m => {
    if (!query.trim()) return true;
    const s = query.toLowerCase();
    return m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s) || m.role_name.toLowerCase().includes(s);
  });

  const totals = (data?.members || []).reduce((acc, m) => {
    acc.open += m.tasks_assigned_open;
    acc.pr += m.tasks_pending_approval;
    acc.done += m.tasks_completed;
    acc.leading += m.projects_leading;
    return acc;
  }, { open: 0, pr: 0, done: 0, leading: 0 });

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-[1500px] mx-auto space-y-5" data-testid="admin-my-team-page">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                {data?.is_admin ? 'Team Overview' : 'My Team'}
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {data?.is_admin ? 'All Team Members' : 'People reporting to you'}
            </h1>
            <p className="text-sm text-slate-500">
              {data?.count || 0} member{(data?.count || 0) === 1 ? '' : 's'}
              {!data?.is_admin && data?.scope === 'none' && ' • You have no direct reports yet'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            {/* Period filter for the PDF report */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" data-testid="team-report-period">
              {[
                { v: 'weekly',    l: 'Weekly' },
                { v: 'monthly',   l: 'Monthly' },
                { v: 'quarterly', l: 'Quarterly' },
              ].map(o => (
                <button
                  key={o.v}
                  onClick={() => setPeriod(o.v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    period === o.v ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  data-testid={`team-period-${o.v}`}
                >
                  {o.l}
                </button>
              ))}
            </div>

            {/* Week navigator — only when period=weekly */}
            {period === 'weekly' && (() => {
              const d = new Date(weekRef + 'T00:00:00');
              const dow = d.getDay();
              const monday = new Date(d);
              monday.setDate(d.getDate() + ((dow === 0 ? -6 : 1) - dow));
              const sunday = new Date(monday);
              sunday.setDate(monday.getDate() + 6);
              const fmt = (dd) => dd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
              const shift = (days) => {
                const nd = new Date(monday);
                nd.setDate(monday.getDate() + days);
                setWeekRef(nd.toISOString().slice(0, 10));
              };
              const now = new Date();
              const nowDow = now.getDay();
              const nowMon = new Date(now); nowMon.setDate(now.getDate() + ((nowDow === 0 ? -6 : 1) - nowDow));
              const isThisWeek = monday.toDateString() === nowMon.toDateString();
              return (
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1" data-testid="team-week-nav">
                  <button type="button" onClick={() => shift(-7)} aria-label="Previous week"
                    className="w-8 h-8 rounded-md text-slate-600 hover:bg-slate-100 flex items-center justify-center" data-testid="team-week-prev">‹</button>
                  <div className="px-2 py-1 min-w-[160px] text-center">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                      {isThisWeek ? 'This Week' : 'Week'}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 leading-tight" data-testid="team-week-range">
                      {fmt(monday)} – {fmt(sunday)}
                    </div>
                  </div>
                  <button type="button" onClick={() => shift(7)} disabled={isThisWeek} aria-label="Next week"
                    className="w-8 h-8 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center" data-testid="team-week-next">›</button>
                  <input type="date" value={weekRef} onChange={(e) => setWeekRef(e.target.value)}
                    className="w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer" data-testid="team-week-picker" title="Pick any date in the week" />
                </div>
              );
            })()}

            <div className="relative w-full md:w-56">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="pl-9 pr-3 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                data-testid="team-search-input"
              />
            </div>
          </div>
        </div>

        {/* Summary tiles */}
        {!loading && data?.members?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="team-summary">
            <SummaryTile label="Open Tasks" value={totals.open} icon={ListChecks} color="text-blue-600 bg-blue-50" />
            <SummaryTile label="Pending Review" value={totals.pr} icon={Send} color="text-amber-600 bg-amber-50" />
            <SummaryTile label="Tasks Completed" value={totals.done} icon={CheckCircle2} color="text-green-600 bg-green-50" />
            <SummaryTile label="Projects Led" value={totals.leading} icon={FolderKanban} color="text-purple-600 bg-purple-50" />
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading team…</div>
        ) : members.length === 0 ? (
          <Card className="p-10 text-center" data-testid="team-empty">
            <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {data?.scope === 'none'
                ? "You don't have any direct reports yet. Ask admin to set your `reports_to` on team members."
                : "No members match your search."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="team-grid">
            {members.map(m => (
              <MemberCard
                key={m.id}
                member={m}
                period={period}
                downloading={downloadingId === m.id}
                onAssignTask={() => setTaskFor(m)}
                onViewPerformance={() => navigate(`/admin/users/${m.id}/performance`)}
                onViewTasks={() => navigate(`/admin/tasks?assignee=${m.id}`)}
                onDownloadPDF={() => handleDownloadPDF(m)}
              />
            ))}
          </div>
        )}

        {/* Assign task modal (in-place, defaults to selected member) */}
        <TaskCreateModal
          open={!!taskFor}
          onClose={() => setTaskFor(null)}
          onCreated={() => { load(); setTaskFor(null); }}
          currentUser={user}
          defaultAssigneeId={taskFor?.id}
        />
      </div>
    </AdminLayout>
  );
};

// ── Summary tile ────────────────────────────────────────────────────────────
const SummaryTile = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

// ── Member Card ─────────────────────────────────────────────────────────────
const MemberCard = ({ member, period, downloading, onAssignTask, onViewPerformance, onViewTasks, onDownloadPDF }) => (
  <Card className="p-4 bg-white flex flex-col gap-3" data-testid={`member-card-${member.id}`}>
    {/* Header */}
    <div className="flex items-start gap-3">
      <div className={`w-11 h-11 ${avatarColor(member.name)} rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
        {initials(member.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
        <p className="text-xs text-slate-500 truncate">{member.role_name}</p>
      </div>
      {member.projects_leading > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-medium">
          Lead
        </span>
      )}
    </div>

    {/* Contact info */}
    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
      <span className="inline-flex items-center gap-1 truncate max-w-[220px]"><Mail className="w-3 h-3" /> {member.email}</span>
      {member.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</span>}
    </div>
    {member.manager_name && (
      <p className="text-[10px] text-slate-400">Reports to <span className="font-medium text-slate-600">{member.manager_name}</span></p>
    )}

    {/* Stats grid */}
    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100" data-testid={`member-stats-${member.id}`}>
      <Stat label="Open" value={member.tasks_assigned_open} tone="blue" />
      <Stat label="Pending Review" value={member.tasks_pending_approval} tone="amber" />
      <Stat label="Completed" value={member.tasks_completed} tone="green" />
      <Stat label="Leading" value={member.projects_leading} tone="purple" />
      <Stat label="Member of" value={member.projects_member_of} tone="slate" />
      <Stat label="Total tasks" value={member.tasks_assigned_open + member.tasks_pending_approval + member.tasks_completed} tone="slate" />
    </div>

    {/* Actions */}
    <div className="flex flex-wrap gap-2 pt-1">
      <button
        onClick={onAssignTask}
        className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg"
        data-testid={`assign-task-${member.id}`}
      >
        <Plus className="w-3.5 h-3.5" /> Assign Task
      </button>
      <button
        onClick={onViewTasks}
        className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg"
        data-testid={`view-tasks-${member.id}`}
      >
        <ListChecks className="w-3.5 h-3.5" /> View Tasks
      </button>
      <button
        onClick={onDownloadPDF}
        disabled={downloading}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-wait text-white text-xs font-medium rounded-lg"
        title={`Download ${period} PDF report`}
        data-testid={`download-report-${member.id}`}
      >
        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline capitalize">{period} PDF</span>
      </button>
      <button
        onClick={onViewPerformance}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg"
        title="Performance report"
        data-testid={`view-performance-${member.id}`}
      >
        <BarChart3 className="w-3.5 h-3.5" />
      </button>
    </div>
  </Card>
);

const TONE = {
  blue:   'text-blue-700   bg-blue-50/60',
  amber:  'text-amber-700  bg-amber-50/60',
  green:  'text-green-700  bg-green-50/60',
  purple: 'text-purple-700 bg-purple-50/60',
  slate:  'text-slate-700  bg-slate-50',
};
const Stat = ({ label, value, tone = 'slate' }) => (
  <div className={`rounded-lg px-2 py-2 text-center ${TONE[tone]}`}>
    <p className="text-[9px] font-medium uppercase tracking-wider opacity-70">{label}</p>
    <p className="text-lg font-bold leading-none mt-0.5">{value}</p>
  </div>
);

export default AdminMyTeam;
