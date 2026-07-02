import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import {
  BarChart3, TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Users as UsersIcon, IndianRupee, ArrowLeft
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// Pick an icon per KPI category
const iconFor = (kpi) => {
  const cat = kpi.category || '';
  if (cat.includes('Support')) return kpi.id.includes('breach') ? AlertTriangle : Clock;
  if (cat.includes('B2B')) return IndianRupee;
  if (cat.includes('B2C')) return UsersIcon;
  return TrendingUp;
};

// Format value based on unit
const formatValue = (val, unit) => {
  if (val === null || val === undefined) return '—';
  if (unit === '₹') return `₹${Number(val).toLocaleString('en-IN')}`;
  if (unit === '%') return `${val}%`;
  if (unit === 'hours') return `${val} hrs`;
  return Number(val).toLocaleString('en-IN');
};

const UserPerformance = () => {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [allUsers, setAllUsers] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load users list for switcher
  useEffect(() => {
    axios.get(`${API}/team-users`, { headers: getAuthHeaders() })
      .then(res => setAllUsers(res.data || []))
      .catch(() => setAllUsers([]));
  }, [getAuthHeaders]);

  // Load performance data whenever user/month/year changes
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    axios.get(`${API}/users/${userId}/performance?month=${month}&year=${year}`, {
      headers: getAuthHeaders(),
    })
      .then(res => setData(res.data))
      .catch(err => {
        toast.error(err?.response?.data?.detail || 'Failed to load performance');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [userId, month, year, getAuthHeaders]);

  const handleUserChange = (newUserId) => {
    if (newUserId && newUserId !== userId) {
      navigate(`/admin/users/${newUserId}/performance`);
    }
  };

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) years.push(y);

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="user-performance-page">
        {/* Back link */}
        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          data-testid="back-to-users-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </button>

        {/* Header: user name + selector */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <BarChart3 className="w-4 h-4" /> Performance
            </div>
            <h1 className="text-3xl font-bold text-slate-900" data-testid="performance-user-name">
              {data?.user?.name || '—'}
            </h1>
            <p className="text-sm text-slate-500">
              {data?.user?.email}{data?.user?.role_name ? ` · ${data.user.role_name}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={userId}
              onChange={(e) => handleUserChange(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
              data-testid="user-switcher"
            >
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>

            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
              data-testid="month-picker"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
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
        {!loading && data && data.kpis.length === 0 && (
          <Card className="p-8 text-center bg-amber-50 border-amber-200" data-testid="no-kpis-state">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-900 mb-1">No KPIs configured</h3>
            <p className="text-sm text-slate-600">
              {data.message || "This user's role has no KPIs assigned yet."}
              {' '}Go to <button className="underline" onClick={() => navigate('/admin/users?tab=roles')}>Users → Roles</button> and assign KPIs to the role.
            </p>
          </Card>
        )}

        {/* KPI Grid */}
        {!loading && data && data.kpis.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="kpi-grid">
            {data.kpis.map(kpi => {
              const Icon = iconFor(kpi);
              return (
                <Card
                  key={kpi.id}
                  className="p-5 bg-white hover:shadow-md transition-shadow"
                  data-testid={`kpi-card-${kpi.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-slate-700" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      {kpi.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid={`kpi-value-${kpi.id}`}>
                    {formatValue(kpi.value, kpi.unit)}
                  </p>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        {!loading && data && data.kpis.length > 0 && (
          <p className="text-xs text-slate-400 text-center pt-2">
            Metrics are computed from records where <span className="font-medium">assigned_to</span> = this user,
            within {MONTHS[month - 1]} {year}.
          </p>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserPerformance;
