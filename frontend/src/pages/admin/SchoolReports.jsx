import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  ArrowLeft, RefreshCw, Search, Building2, Users, CheckCircle2, XCircle,
  Clock, MapPin, Camera, UserCheck, Repeat, CalendarDays, Download,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_TONE = {
  green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber:  'bg-amber-100 text-amber-700 border-amber-200',
  red:    'bg-red-100 text-red-700 border-red-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  slate:  'bg-slate-100 text-slate-600 border-slate-200',
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
};

const fmtTime = (t) => {
  if (!t) return '—';
  // t could be "09:05:00" (session scheduled) or ISO string (actual)
  if (t.length <= 8 && t.includes(':')) return t.slice(0, 5);
  try {
    const dt = new Date(t);
    return dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return t; }
};

const SchoolReports = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  // Debounce search input so we don't hammer the backend on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, startDate, endDate]);

  const buildParams = (overrides = {}) => {
    const p = new URLSearchParams({
      page: String(overrides.page ?? page),
      per_page: String(overrides.per_page ?? perPage),
    });
    if (startDate) p.append('start_date', startDate);
    if (endDate) p.append('end_date', endDate);
    if (statusFilter !== 'all') p.append('attendance_status', statusFilter);
    if (debouncedSearch) p.append('search', debouncedSearch);
    return p;
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const fetchReports = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(
          `${API}/api/schools/${schoolId}/reports?${buildParams().toString()}`,
          { headers: getAuthHeaders(), signal: controller.signal }
        );
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (cancelled || axios.isCancel(err) || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        const msg = err?.response?.data?.detail || err?.message || 'Failed to load reports';
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchReports();
    return () => { cancelled = true; controller.abort(); };
  }, [schoolId, page, startDate, endDate, statusFilter, debouncedSearch]);

  const refreshManual = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(
        `${API}/api/schools/${schoolId}/reports?${buildParams().toString()}`,
        { headers: getAuthHeaders() }
      );
      setData(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const rows = data?.sessions || [];
  const stats = data?.stats || { total: 0, completed: 0, on_time: 0, late: 0, absent: 0, reassigned: 0 };

  // Server already applies filters/pagination; render `rows` directly.
  const filteredRows = rows;

  const exportCsv = async () => {
    setExporting(true);
    try {
      // Pull the FULL filtered set (bypass pagination) for a complete CSV
      const res = await axios.get(
        `${API}/api/schools/${schoolId}/reports?${buildParams({ page: 1, per_page: 5000 }).toString()}`,
        { headers: getAuthHeaders() }
      );
      const allRows = res.data?.sessions || [];
      if (!allRows.length) { toast.error('No rows to export'); return; }
      const header = [
        'Session Date', 'Scheduled Start', 'Scheduled End', 'Reached', 'Checked Out',
        'Status', 'Attendance', 'Late (min)', 'Educator', 'Educator Email',
        'Backup Educator', 'Mode', 'Location',
      ];
      const rowsCsv = allRows.map(r => [
        r.session_date, r.start_time, r.end_time,
        r.actual?.reached_time || '', r.actual?.checkout_time || '',
        r.status || '', r.attendance_status?.label || '',
        r.actual?.late_minutes ?? '',
        r.educator?.name || '', r.educator?.email || '',
        r.backup_educator?.name || '', r.mode || '',
        r.actual?.location_name || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      const csv = [header.join(','), ...rowsCsv].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(data?.school_name || 'school').replace(/[^a-z0-9]+/gi, '_')}_reports.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allRows.length} rows`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4" data-testid="school-reports-page">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/schools')}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              data-testid="reports-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Building2 className="w-3.5 h-3.5" />
                Session & Attendance Report
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900" data-testid="reports-school-name">
                {data?.school_name || (loading ? 'Loading…' : 'School')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshManual}
              disabled={refreshing}
              className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 font-medium"
              data-testid="reports-refresh-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={!filteredRows.length || exporting}
              className="text-xs px-3 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center gap-1.5 font-medium disabled:opacity-40"
              data-testid="reports-export-csv-btn"
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
              {exporting ? 'Exporting…' : 'CSV'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard icon={<CalendarDays className="w-4 h-4" />} label="Total" value={stats.total} tone="slate" testid="stat-total" />
          <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Completed" value={stats.completed} tone="blue" testid="stat-completed" />
          <StatCard icon={<UserCheck className="w-4 h-4" />} label="On time" value={stats.on_time} tone="green" testid="stat-on-time" />
          <StatCard icon={<Clock className="w-4 h-4" />} label="Late" value={stats.late} tone="amber" testid="stat-late" />
          <StatCard icon={<XCircle className="w-4 h-4" />} label="No check-in" value={stats.absent} tone="red" testid="stat-absent" />
          <StatCard icon={<Repeat className="w-4 h-4" />} label="Reassigned" value={stats.reassigned} tone="blue" testid="stat-reassigned" />
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search educator, date, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
              data-testid="reports-search-input"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-sm border border-slate-200 rounded-lg px-2"
            data-testid="reports-status-filter"
          >
            <option value="all">All attendance</option>
            <option value="on_time">On time</option>
            <option value="late_lt_15">Late &lt; 15 min</option>
            <option value="late">Late</option>
            <option value="early">Early</option>
            <option value="absent">Absent</option>
            <option value="no_data">No check-in</option>
          </select>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 text-sm w-[140px]"
            data-testid="reports-start-date"
          />
          <span className="text-xs text-slate-400">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 text-sm w-[140px]"
            data-testid="reports-end-date"
          />
          {(startDate || endDate || search || statusFilter !== 'all') && (
            <Button
              onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setStatusFilter('all'); }}
              variant="ghost"
              className="h-9 text-xs"
              data-testid="reports-clear-filters"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="text-center py-16 text-slate-500" data-testid="reports-loading">Loading sessions…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700" data-testid="reports-error">
            {error}
          </div>
        ) : data?.note ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800" data-testid="reports-empty-note">
            {data.note}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500" data-testid="reports-empty">
            No sessions match the current filters.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Scheduled</th>
                    <th className="px-3 py-2.5">Reached</th>
                    <th className="px-3 py-2.5">Attendance</th>
                    <th className="px-3 py-2.5">Educator</th>
                    <th className="px-3 py-2.5">Session</th>
                    <th className="px-3 py-2.5">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((r) => (
                    <ReportRow key={r.id} r={r} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filteredRows.map((r) => (
                <MobileCard key={r.id} r={r} />
              ))}
            </div>

            {/* Pagination */}
            {data?.meta?.total > perPage && (
              <div className="flex items-center justify-between text-sm">
                <div className="text-slate-500">
                  Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, data.meta.total)} of {data.meta.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    variant="outline"
                    className="h-8 text-xs"
                    data-testid="reports-prev-page"
                  >Prev</Button>
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * perPage >= data.meta.total}
                    variant="outline"
                    className="h-8 text-xs"
                    data-testid="reports-next-page"
                  >Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

const StatCard = ({ icon, label, value, tone, testid }) => (
  <div className={`rounded-xl border p-3 ${STATUS_TONE[tone] || STATUS_TONE.slate}`} data-testid={testid}>
    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide opacity-80">
      {icon}
      {label}
    </div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

const ReportRow = ({ r }) => {
  const toneClass = STATUS_TONE[r.attendance_status?.tone] || STATUS_TONE.slate;
  return (
    <tr className="hover:bg-slate-50" data-testid={`session-row-${r.id}`}>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="font-medium text-slate-900">{fmtDate(r.session_date)}</div>
        <div className="text-[11px] text-slate-400">{r.mode || ''}</div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="text-slate-700">{fmtTime(r.start_time)} – {fmtTime(r.end_time)}</div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {r.actual?.reached_time ? (
          <div>
            <div className="text-slate-900 font-medium">{fmtTime(r.actual.reached_time)}</div>
            {typeof r.actual.late_minutes === 'number' && (
              <div className={`text-[11px] ${r.actual.late_minutes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {r.actual.late_minutes > 0 ? `+${r.actual.late_minutes}m late` : r.actual.late_minutes < 0 ? `${Math.abs(r.actual.late_minutes)}m early` : 'on the dot'}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${toneClass}`}>
          {r.attendance_status?.label || '—'}
        </span>
        {r.status && r.status !== 'scheduled' && (
          <div className="text-[11px] text-slate-500 mt-1 capitalize">Session: {r.status}</div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="text-slate-900 text-xs font-medium">{r.educator?.name || '—'}</div>
        {r.educator?.email && <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{r.educator.email}</div>}
        {r.was_reassigned && r.backup_educator && (
          <div className="text-[11px] text-blue-600 mt-1 flex items-center gap-1">
            <Repeat className="w-3 h-3" />
            Backup for {r.backup_educator?.name || 'original'}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="text-[11px] text-slate-500 capitalize">
          {r.iscompleted ? 'Completed' : (r.status || '—')}
        </div>
        {r.session_type && r.session_type !== 'regular' && (
          <div className="text-[10px] text-slate-400 capitalize">{r.session_type}</div>
        )}
      </td>
      <td className="px-3 py-2.5 max-w-[220px]">
        {r.actual?.location_name ? (
          <div className="text-[11px] text-slate-600 flex items-start gap-1">
            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{r.actual.location_name}</span>
          </div>
        ) : <span className="text-slate-400 text-xs">—</span>}
        {r.actual?.photo_path && (
          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Camera className="w-3 h-3" />
            Photo verified
          </div>
        )}
      </td>
    </tr>
  );
};

const MobileCard = ({ r }) => {
  const toneClass = STATUS_TONE[r.attendance_status?.tone] || STATUS_TONE.slate;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3" data-testid={`session-card-${r.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-slate-900">{fmtDate(r.session_date)}</div>
          <div className="text-xs text-slate-500">{fmtTime(r.start_time)} – {fmtTime(r.end_time)} · {r.mode || ''}</div>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${toneClass}`}>
          {r.attendance_status?.label || '—'}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-slate-400 text-[10px] uppercase">Reached</div>
          <div className="text-slate-900 font-medium">{r.actual?.reached_time ? fmtTime(r.actual.reached_time) : '—'}</div>
          {typeof r.actual?.late_minutes === 'number' && (
            <div className={`text-[10px] ${r.actual.late_minutes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {r.actual.late_minutes > 0 ? `+${r.actual.late_minutes}m` : `${Math.abs(r.actual.late_minutes)}m early`}
            </div>
          )}
        </div>
        <div>
          <div className="text-slate-400 text-[10px] uppercase">Educator</div>
          <div className="text-slate-900 font-medium truncate">{r.educator?.name || '—'}</div>
          {r.was_reassigned && r.backup_educator && (
            <div className="text-[10px] text-blue-600">Backup for {r.backup_educator.name || 'original'}</div>
          )}
        </div>
      </div>
      {r.actual?.location_name && (
        <div className="mt-2 text-[11px] text-slate-500 flex items-start gap-1">
          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
          {r.actual.location_name}
        </div>
      )}
    </div>
  );
};

export default SchoolReports;
