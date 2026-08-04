import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Clock, CheckCircle2, AlertTriangle,
  Users as UsersIcon, IndianRupee, ArrowLeft, Sparkles, Wallet, PiggyBank,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SCOPE_TABS = [
  { key: 'month',   label: 'Month',   sub: 'weeks' },
  { key: 'quarter', label: 'Quarter', sub: 'months' },
  { key: 'year',    label: 'Year',    sub: 'quarters' },
];

const iconFor = (kpi) => {
  const cat = kpi.category || '';
  if (cat.includes('Support')) return kpi.id.includes('breach') ? AlertTriangle : Clock;
  if (cat.includes('B2B')) return IndianRupee;
  if (cat.includes('B2C')) return UsersIcon;
  if (cat.includes('Task')) return CheckCircle2;
  if (cat.includes('Social')) return TrendingUp;
  return TrendingUp;
};

const formatValue = (val, unit) => {
  if (val === null || val === undefined) return '—';
  if (unit === '₹') return `₹${Number(val).toLocaleString('en-IN')}`;
  if (unit === '%') return `${val}%`;
  if (unit === 'hours') return `${val} hrs`;
  return Number(val).toLocaleString('en-IN');
};

const trendColor = (t) => (t > 0 ? 'text-green-600' : t < 0 ? 'text-red-600' : 'text-slate-400');
const TrendIcon = ({ t }) => (t > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : t < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Per-category theming (color used for chart stroke + gradient) ───────────
const CATEGORY_THEME = {
  'Tasks & Responsibilities': { color: '#3b82f6', badge: 'bg-blue-50 text-blue-700 border-blue-100' },       // blue
  'Support Center':           { color: '#f59e0b', badge: 'bg-amber-50 text-amber-700 border-amber-100' },     // amber
  'Sales — B2B':              { color: '#10b981', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' }, // emerald
  'Sales — B2C':              { color: '#06b6d4', badge: 'bg-cyan-50 text-cyan-700 border-cyan-100' },        // cyan
  'HR':                       { color: '#a855f7', badge: 'bg-purple-50 text-purple-700 border-purple-100' },   // purple
  'Educator HR':              { color: '#ec4899', badge: 'bg-pink-50 text-pink-700 border-pink-100' },        // pink
  'Growth Partners':          { color: '#f97316', badge: 'bg-orange-50 text-orange-700 border-orange-100' },   // orange
  'Social Media':             { color: '#db2777', badge: 'bg-pink-50 text-pink-700 border-pink-100' },        // pink
};
const themeFor = (cat) => CATEGORY_THEME[cat] || { color: '#64748b', badge: 'bg-slate-50 text-slate-700 border-slate-100' };

const UserPerformance = ({ mode = 'admin', embedded = false }) => {
  // mode = 'admin' (view any user by :id) OR 'me' (view self, no :id in URL)
  const { id: routeUserId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, getAuthHeaders } = useAuth();
  const selfMode = mode === 'me';
  const userId = selfMode ? (authUser?.id || '') : routeUserId;

  const [scope, setScope] = useState('month');
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);   // 1..12
  const [selQuarter, setSelQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);  // 1..4
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);

  // Compute the ref date (YYYY-MM-DD) from the current picker selection
  const buildRef = () => {
    let m;
    if (scope === 'month') m = selMonth;
    else if (scope === 'quarter') m = (selQuarter - 1) * 3 + 1;
    else m = 1; // year
    return `${selYear}-${String(m).padStart(2, '0')}-01`;
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const ref = buildRef();
        const url = selfMode
          ? `${API}/me/performance/timeseries?scope=${scope}&ref=${ref}`
          : `${API}/users/${userId}/performance/timeseries?scope=${scope}&ref=${ref}`;
        const res = await axios.get(url, { headers: getAuthHeaders(), signal: controller.signal });
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (cancelled || axios.isCancel(err) || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        toast.error(err?.response?.data?.detail || 'Failed to load performance');
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; controller.abort(); };
  }, [userId, scope, selMonth, selQuarter, selYear, selfMode]);

  // Load user switcher list only for admin/manager mode
  useEffect(() => {
    if (selfMode) return;
    axios.get(`${API}/team-users`, { headers: getAuthHeaders() })
      .then(res => setAllUsers(res.data || []))
      .catch(() => setAllUsers([]));
  }, [selfMode, getAuthHeaders]);

  const handleUserChange = (newUserId) => {
    if (newUserId && newUserId !== userId) navigate(`/admin/users/${newUserId}/performance`);
  };

  const scopeSub = SCOPE_TABS.find(t => t.key === scope)?.sub;
  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) years.push(y);

  const body = (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5" data-testid="user-performance-page">
        {!selfMode && (
          <button
            onClick={() => navigate('/admin/users')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
            data-testid="back-to-users-btn"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </button>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                {selfMode ? 'My Performance' : 'Performance'}
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900" data-testid="performance-user-name">
              {data?.user?.name || (selfMode ? authUser?.name || 'You' : '—')}
            </h1>
            <p className="text-sm text-slate-500">
              {data?.user?.email || authUser?.email}{data?.user?.role_name ? ` · ${data.user.role_name}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!selfMode && allUsers.length > 0 && (
              <select
                value={userId || ''}
                onChange={(e) => handleUserChange(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
                data-testid="user-switcher"
              >
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Scope tabs + Ref picker */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white border border-slate-200 rounded-2xl p-1 inline-flex" data-testid="scope-tabs">
            {SCOPE_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setScope(t.key)}
                className={`px-4 sm:px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  scope === t.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                data-testid={`scope-tab-${t.key}`}
              >
                {t.label}
                <span className="hidden sm:inline text-[10px] ml-1.5 opacity-70">by {t.sub}</span>
              </button>
            ))}
          </div>

          {/* Ref picker — swaps based on scope */}
          <div className="flex items-center gap-2" data-testid="ref-picker">
            {scope === 'month' && (
              <select
                value={selMonth}
                onChange={(e) => setSelMonth(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                data-testid="month-picker"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            )}
            {scope === 'quarter' && (
              <select
                value={selQuarter}
                onChange={(e) => setSelQuarter(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                data-testid="quarter-picker"
              >
                {[1,2,3,4].map(q => (
                  <option key={q} value={q}>Q{q}</option>
                ))}
              </select>
            )}
            <select
              value={selYear}
              onChange={(e) => setSelYear(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              data-testid="year-picker"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-slate-500" data-testid="performance-loading">
            Loading performance…
          </div>
        )}

        {/* Empty state */}
        {!loading && data && (data.kpis || []).length === 0 && (
          <Card className="p-8 text-center bg-amber-50 border-amber-200" data-testid="no-kpis-state">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-900 mb-1">No KPIs configured</h3>
            <p className="text-sm text-slate-600">
              {selfMode
                ? "Your role doesn't have KPIs assigned yet. Please contact an admin."
                : "This user's role has no KPIs assigned yet."}
            </p>
          </Card>
        )}

        {/* KPI grouped by category */}
        {!loading && data && (data.kpis || []).length > 0 && (() => {
          // Group by category preserving KPI order
          const groups = new Map();
          for (const kpi of data.kpis) {
            const cat = kpi.category || 'Other';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(kpi);
          }
          return (
            <div className="space-y-6" data-testid="kpi-groups">
              {Array.from(groups.entries()).map(([cat, kpis]) => {
                const theme = themeFor(cat);
                return (
                  <section key={cat} data-testid={`kpi-category-${cat.toLowerCase().replace(/\W+/g,'-')}`}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }} />
                      <h2 className="text-base font-bold text-slate-900">{cat}</h2>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${theme.badge}`}>
                        {kpis.length} {kpis.length === 1 ? 'metric' : 'metrics'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {kpis.map(kpi => (
                        <KpiChartCard key={kpi.id} kpi={kpi} scopeSub={scopeSub} theme={theme} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          );
        })()}

        {!loading && data && data.buckets && (
          <p className="text-xs text-slate-400 text-center pt-2">
            Showing {data.buckets.length} {scopeSub} · Trend compares the last {scopeSub.replace(/s$/, '')} against the previous one.
          </p>
        )}

        {/* Financial Growth (monthly salary + incentives) */}
        <FinancialGrowthSection userId={userId} selfMode={selfMode} />
      </div>
  );
  return embedded ? body : <AdminLayout>{body}</AdminLayout>;
};

// ── One KPI chart card ───────────────────────────────────────────────────────
const KpiChartCard = ({ kpi, scopeSub, theme }) => {
  const Icon = iconFor(kpi);
  const data = (kpi.series || []).map(pt => ({
    label: pt.label,
    sub: pt.sub,
    value: typeof pt.value === 'number' ? pt.value : Number(pt.value) || 0,
  }));
  const trend = kpi.trend || 0;
  const isPct = kpi.unit === '%';
  const isHrs = kpi.unit === 'hours';
  const display = kpi.display_value ?? kpi.total ?? 0;

  // Compute % change for the header pill
  const lastVal = data[data.length - 1]?.value ?? 0;
  const prevVal = data[data.length - 2]?.value ?? 0;
  let pctChange = 0;
  if (prevVal !== 0) pctChange = ((lastVal - prevVal) / Math.abs(prevVal)) * 100;
  else if (lastVal !== 0) pctChange = 100;

  const gradientId = `grad-${kpi.id}`;
  // Chart color uses the CATEGORY theme; trend pill still colors by direction
  const strokeColor = theme?.color || '#3b82f6';

  return (
    <Card className="p-5 bg-white" data-testid={`kpi-card-${kpi.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: strokeColor + '20' }}>
            <Icon className="w-4 h-4" style={{ color: strokeColor }} />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{kpi.category}</p>
            <p className="text-sm font-semibold text-slate-800">{kpi.label}</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${trendColor(trend)} ${
          trend > 0 ? 'bg-green-50' : trend < 0 ? 'bg-red-50' : 'bg-slate-50'
        }`} data-testid={`kpi-trend-${kpi.id}`}>
          <TrendIcon t={trend} />
          {pctChange !== 0 ? `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%` : '0%'}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <p className="text-3xl font-bold text-slate-900" data-testid={`kpi-value-${kpi.id}`}>
          {formatValue(display, kpi.unit)}
        </p>
        <p className="text-xs text-slate-400">
          {isPct || isHrs ? `avg across ${scopeSub}` : `total across ${scopeSub}`}
        </p>
      </div>

      <div className="h-32" data-testid={`kpi-chart-${kpi.id}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(v) => [formatValue(v, kpi.unit), kpi.label]}
              labelFormatter={(l, pl) => pl?.[0]?.payload?.sub || l}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: strokeColor, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};


// ─── Financial Growth section ────────────────────────────────────────────
const FinancialGrowthSection = ({ userId, selfMode }) => {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      setForbidden(false);
      try {
        const url = selfMode
          ? `${API}/me/salaries/timeseries?months=12`
          : `${API}/users/${userId}/salaries/timeseries?months=12`;
        const res = await axios.get(url, { headers: getAuthHeaders(), signal: controller.signal });
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (cancelled || axios.isCancel(err) || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        if (err?.response?.status === 403) {
          setForbidden(true);
        } else {
          setData({ records: [], summary: { total_base: 0, total_incentive: 0, total_deduction: 0, total_net: 0, growth_pct: null, records_count: 0 } });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; controller.abort(); };
  }, [userId, selfMode, getAuthHeaders]);

  if (forbidden) return null; // silently hide when user isn't allowed to see finance

  const records = data?.records || [];
  const summary = data?.summary || {};
  const chartData = records.map(r => ({
    month: (r.month || '').slice(2),  // "26-01"
    base: Number(r.base_salary || 0),
    incentive: Number(r.incentive || 0),
    deduction: Number(r.deduction || 0),
    net: Number(r.net_paid || 0),
  }));

  const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
  const growthTone = (summary.growth_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <Card className="p-4 md:p-5 mt-6" data-testid="financial-growth-section">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Financial Growth</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900">Monthly compensation over time</h2>
          <p className="text-xs text-slate-500 mt-0.5">Base salary + incentive minus deductions, mirrored to the Expenses ledger.</p>
        </div>
        {summary.growth_pct !== null && summary.growth_pct !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${growthTone}`}>
            {summary.growth_pct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {summary.growth_pct >= 0 ? '+' : ''}{summary.growth_pct}% growth
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-slate-500">Loading compensation…</div>
      ) : records.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center text-sm text-slate-500" data-testid="financial-growth-empty">
          <PiggyBank className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          No salary records yet. {selfMode ? 'Ask an admin to import your salary sheet.' : 'Import a salary sheet from Users & Roles → Import Salaries.'}
        </div>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
            <SumTile label="Total base" value={fmt(summary.total_base)} tone="bg-blue-50 text-blue-800 border-blue-100" testid="summary-base" />
            <SumTile label="Total incentive" value={fmt(summary.total_incentive)} tone="bg-emerald-50 text-emerald-800 border-emerald-100" testid="summary-incentive" />
            <SumTile label="Total deduction" value={fmt(summary.total_deduction)} tone="bg-red-50 text-red-800 border-red-100" testid="summary-deduction" />
            <SumTile label="Total net paid" value={fmt(summary.total_net)} tone="bg-slate-900 text-white border-slate-900" testid="summary-net" />
          </div>

          {/* Stacked bar chart */}
          <div className="h-56" data-testid="financial-growth-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : v} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(v, name) => [fmt(v), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar dataKey="base" stackId="pay" name="Base" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="incentive" stackId="pay" name="Incentive" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left py-2 px-2 font-medium">Month</th>
                  <th className="text-right py-2 px-2 font-medium">Base</th>
                  <th className="text-right py-2 px-2 font-medium">Incentive</th>
                  <th className="text-right py-2 px-2 font-medium">Deduction</th>
                  <th className="text-right py-2 px-2 font-medium">Net paid</th>
                  <th className="text-left py-2 px-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...records].reverse().map(r => (
                  <tr key={r.id} data-testid={`salary-row-${r.id}`}>
                    <td className="py-1.5 px-2 font-medium text-slate-800">{r.month}</td>
                    <td className="py-1.5 px-2 text-right text-slate-700">{fmt(r.base_salary)}</td>
                    <td className="py-1.5 px-2 text-right text-emerald-700">{fmt(r.incentive)}</td>
                    <td className="py-1.5 px-2 text-right text-red-700">{fmt(r.deduction)}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-slate-900">{fmt(r.net_paid)}</td>
                    <td className="py-1.5 px-2 text-slate-500 truncate max-w-[200px]">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
};

const SumTile = ({ label, value, tone, testid }) => (
  <div className={`rounded-xl border p-2.5 ${tone}`} data-testid={testid}>
    <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
    <div className="text-base md:text-lg font-bold mt-0.5">{value}</div>
  </div>
);

export default UserPerformance;
