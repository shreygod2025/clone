import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Clock, CheckCircle2, AlertTriangle,
  Users as UsersIcon, IndianRupee, ArrowLeft, Sparkles,
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

const UserPerformance = ({ mode = 'admin' }) => {
  // mode = 'admin' (view any user by :id) OR 'me' (view self, no :id in URL)
  const { id: routeUserId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, getAuthHeaders } = useAuth();
  const selfMode = mode === 'me';
  const userId = selfMode ? (authUser?.id || '') : routeUserId;

  const [scope, setScope] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const url = selfMode
        ? `${API}/me/performance/timeseries?scope=${scope}`
        : `${API}/users/${userId}/performance/timeseries?scope=${scope}`;
      const res = await axios.get(url, { headers: getAuthHeaders() });
      setData(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load performance');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, scope, selfMode, getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <AdminLayout>
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

        {/* Scope tabs */}
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

        {/* KPI charts grid */}
        {!loading && data && (data.kpis || []).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="kpi-grid">
            {data.kpis.map(kpi => (
              <KpiChartCard key={kpi.id} kpi={kpi} scopeSub={scopeSub} />
            ))}
          </div>
        )}

        {!loading && data && data.buckets && (
          <p className="text-xs text-slate-400 text-center pt-2">
            Showing {data.buckets.length} {scopeSub} · Trend compares the last {scopeSub.replace(/s$/, '')} against the previous one.
          </p>
        )}
      </div>
    </AdminLayout>
  );
};

// ── One KPI chart card ───────────────────────────────────────────────────────
const KpiChartCard = ({ kpi, scopeSub }) => {
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
  const strokeColor = trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#3b82f6';

  return (
    <Card className="p-5 bg-white" data-testid={`kpi-card-${kpi.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon className="w-4 h-4 text-slate-700" />
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

export default UserPerformance;
