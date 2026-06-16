/**
 * AdminOnboardingTracker — tabular view of every school currently in
 * Customers (converted) or Renewals (renewed) stage, with step-wise
 * onboarding progress. Pulls /api/schools/onboarding-tracker.
 *
 * Also exposes the "Move to Active" action so admins can promote a school
 * once their onboarding checklist is done — works from both Customers and
 * Renewals stages.
 */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Search, ArrowRight, CheckCircle2, CircleDot, Clock, Users, Filter, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAGE_COLORS = {
  customers: 'bg-blue-100 text-blue-700',
  renewals: 'bg-purple-100 text-purple-700',
};

const AdminOnboardingTracker = () => {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('all'); // all | customers | renewals
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = stage !== 'all' ? { stage } : {};
      const r = await axios.get(`${API}/schools/onboarding-tracker`, {
        headers: getAuthHeaders(),
        params,
      });
      setData(r.data);
    } catch (e) {
      toast.error('Failed to load tracker');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [stage]);

  const filtered = useMemo(() => {
    if (!data?.rows) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data.rows;
    return data.rows.filter(
      (r) =>
        r.school_name?.toLowerCase().includes(s) ||
        r.rm?.toLowerCase().includes(s) ||
        r.city?.toLowerCase().includes(s) ||
        r.contact_name?.toLowerCase().includes(s)
    );
  }, [data, search]);

  return (
    <AdminLayout title="Onboarding Tracker">
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Onboarding Tracker</h1>
            <p className="text-sm text-slate-500">
              Step-wise onboarding progress for every school in Customers or Renewals stage.
            </p>
          </div>
          <Link
            to="/admin/schools"
            className="text-xs text-[#1E3A5F] hover:underline inline-flex items-center gap-1"
          >
            ← Back to School CRM
          </Link>
        </div>

        {/* Summary */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <SummaryCard label="Total Schools" value={data.total_schools} color="from-slate-700 to-slate-500" />
            <SummaryCard label="Fully Onboarded" value={data.fully_onboarded} color="from-emerald-700 to-emerald-500" />
            <SummaryCard
              label="In Customers Stage"
              value={data.rows?.filter((r) => r.stage === 'customers').length || 0}
              color="from-blue-700 to-blue-500"
            />
            <SummaryCard
              label="In Renewals Stage"
              value={data.rows?.filter((r) => r.stage === 'renewals').length || 0}
              color="from-purple-700 to-purple-500"
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute top-3 left-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by school, RM, contact, city…"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
              data-testid="onboarding-tracker-search"
            />
          </div>
          <div className="inline-flex gap-1.5 bg-slate-100 p-1 rounded-lg">
            {[
              { v: 'all',        label: 'All' },
              { v: 'customers',  label: 'Customers' },
              { v: 'renewals',   label: 'Renewals' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setStage(opt.v)}
                data-testid={`onboarding-tracker-stage-${opt.v}`}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  stage === opt.v ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400">
            <Loader2 className="w-6 h-6 mx-auto animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-sm">
            No schools found in this stage.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm" data-testid="onboarding-tracker-table">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left sticky left-0 bg-slate-50 z-10 min-w-[200px]">School</th>
                  <th className="px-3 py-3 text-left">Stage</th>
                  <th className="px-3 py-3 text-left">RM</th>
                  <th className="px-3 py-3 text-center">Progress</th>
                  <th className="px-3 py-3 text-left">Current Step</th>
                  {data.step_columns.map((c) => (
                    <th key={c.key} className="px-2 py-3 text-center min-w-[110px]" title={c.title}>
                      {c.title.replace(/ Distribution & Checking/, ' D&C').slice(0, 18)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.school_id} className="border-t border-slate-100 hover:bg-slate-50/40" data-testid={`tracker-row-${row.school_id}`}>
                    <td className="px-3 py-3 sticky left-0 bg-white z-10">
                      <Link to={`/admin/schools?focus=${row.school_id}`} className="font-semibold text-slate-900 hover:text-[#1E3A5F]">
                        {row.school_name}
                      </Link>
                      <p className="text-[11px] text-slate-400">{row.city || '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_COLORS[row.stage] || 'bg-slate-100 text-slate-600'}`}>
                        {row.stage}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.rm || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${row.completion_pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{row.completed_steps}/{row.total_steps}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.current_step || (row.all_completed ? <span className="text-emerald-700 font-semibold">Done</span> : '—')}</td>
                    {data.step_columns.map((c) => {
                      const st = row.steps[c.key];
                      if (!st) return <td key={c.key} className="px-2 py-3 text-center text-[11px] text-slate-300">—</td>;
                      return (
                        <td key={c.key} className="px-2 py-3 text-center">
                          {st.completed ? (
                            <div className="inline-flex flex-col items-center" title={`Completed ${st.completed_date ? 'on ' + new Date(st.completed_date).toLocaleDateString('en-IN') : ''}${st.assignee ? ' by ' + st.assignee : ''}`}>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              {st.completed_date && (
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  {new Date(st.completed_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <CircleDot className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const SummaryCard = ({ label, value, color }) => (
  <div className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white`}>
    <p className="text-white/70 text-xs font-medium mb-1">{label}</p>
    <p className="text-2xl font-bold">{value ?? 0}</p>
  </div>
);

export default AdminOnboardingTracker;
