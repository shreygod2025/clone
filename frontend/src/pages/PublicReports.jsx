import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Users, GraduationCap, Building2, DollarSign, 
  Calendar, RefreshCw, Lock, Eye, EyeOff, BarChart3,
  Briefcase, Handshake, Wallet, MessageSquare, Target,
  TrendingDown, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Generate month options for the past 2 years
const generateMonthOptions = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = subMonths(now, i);
    months.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy')
    });
  }
  return months;
};

// Generate year options
const generateYearOptions = () => {
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
};

const MONTH_OPTIONS = generateMonthOptions();
const YEAR_OPTIONS = generateYearOptions();

// Report Tabs
const REPORT_TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'b2c', label: 'B2C (Students)', icon: Users },
  { id: 'b2b', label: 'B2B (Schools)', icon: Building2 },
  { id: 'hr_team', label: 'HR - Team', icon: Briefcase },
  { id: 'educator_hr', label: 'Educator HR', icon: GraduationCap },
  { id: 'growth_partners', label: 'Growth Partners', icon: Handshake },
  { id: 'support', label: 'Support', icon: MessageSquare },
  { id: 'pnl', label: 'P&L Report', icon: Wallet },
];

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend, small = false }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    slate: 'from-slate-500 to-slate-600',
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 ${small ? 'p-4' : 'p-5'} hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`${small ? 'text-xs' : 'text-sm'} text-slate-500 mb-1`}>{title}</p>
          <p className={`${small ? 'text-2xl' : 'text-3xl'} font-bold text-slate-800`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}% vs last period
            </div>
          )}
        </div>
        <div className={`${small ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className={`${small ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
        </div>
      </div>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ label, value, total, color = '#1E3A5F' }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 capitalize">{label?.replace(/_/g, ' ')}</span>
        <span className="font-medium text-slate-800">{value} ({percentage}%)</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(percentage, 2)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// Funnel Card Component
const FunnelCard = ({ title, icon: Icon, color, stages, total }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color }} />
          {title}
        </h3>
        <span className="text-2xl font-bold text-slate-800">{total}</span>
      </div>
      <div className="space-y-3">
        {stages?.map((stage, idx) => (
          <ProgressBar 
            key={idx}
            label={stage.label || stage.name}
            value={stage.value || stage.count}
            total={total}
            color={stage.color || color}
          />
        ))}
      </div>
    </div>
  );
};

// Password Gate Component
const PasswordGate = ({ token, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API}/public/reports/${token}/verify`, { password });
      localStorage.setItem(`public_report_${token}`, res.data.access_token);
      onSuccess(res.data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">OLL Reports</h1>
          <p className="text-slate-500 mt-2">Enter password to view reports</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={loading || !password}
          >
            {loading ? 'Verifying...' : 'View Reports'}
          </Button>
        </form>
      </div>
    </div>
  );
};

// Main Public Reports Component
const PublicReports = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Date filter states
  const [dateFilterType, setDateFilterType] = useState('month');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  // Check for existing access token
  useEffect(() => {
    const stored = localStorage.getItem(`public_report_${token}`);
    if (stored) {
      setAccessToken(stored);
    } else {
      setLoading(false);
    }
  }, [token]);

  const getDateParams = useCallback(() => {
    let params = {};
    if (dateFilterType === 'custom' && customDateRange.start && customDateRange.end) {
      params = { start_date: customDateRange.start, end_date: customDateRange.end };
    } else if (dateFilterType === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const start = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const end = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      params = { start_date: format(start, 'yyyy-MM-dd'), end_date: format(end, 'yyyy-MM-dd') };
    } else if (dateFilterType === 'year' && selectedYear) {
      const start = startOfYear(new Date(parseInt(selectedYear), 0));
      const end = endOfYear(new Date(parseInt(selectedYear), 0));
      params = { start_date: format(start, 'yyyy-MM-dd'), end_date: format(end, 'yyyy-MM-dd') };
    }
    return params;
  }, [dateFilterType, customDateRange, selectedMonth, selectedYear]);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    const params = getDateParams();

    try {
      const res = await axios.get(`${API}/public/reports/${token}/data`, {
        params: { ...params, auth: accessToken }
      });
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        // Token expired, clear and show password gate
        localStorage.removeItem(`public_report_${token}`);
        setAccessToken(null);
        toast.error('Session expired. Please enter password again.');
      } else {
        toast.error('Failed to load report data');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, token, getDateParams]);

  useEffect(() => {
    if (accessToken) {
      fetchData();
    }
  }, [accessToken, fetchData]);

  // If no access token, show password gate
  if (!accessToken) {
    return <PasswordGate token={token} onSuccess={setAccessToken} />;
  }

  const { overview, students, schools, educators, team, growth_partners, support, expenses } = data || {};

  // Calculate derived values
  const totalRevenue = overview?.total_revenue || 0;
  const totalExpenses = overview?.total_expenses || 0;
  const netProfit = overview?.net_profit || 0;
  const studentRevenue = overview?.student_revenue || 0;
  const schoolRevenue = overview?.school_revenue || 0;

  const renderDateFilter = () => (
    <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-100 mb-6">
      {/* Filter Type Selector */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {[
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' },
          { value: 'custom', label: 'Custom' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setDateFilterType(opt.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              dateFilterType === opt.value ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      
      {/* Month Selector */}
      {dateFilterType === 'month' && (
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          {MONTH_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      
      {/* Year Selector */}
      {dateFilterType === 'year' && (
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          {YEAR_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      
      {/* Custom Date Range */}
      {dateFilterType === 'custom' && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={customDateRange.start}
            onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={customDateRange.end}
            onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
      )}
      
      <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto">
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={DollarSign} color="green" small />
        <StatCard title="Total Expenses" value={`₹${totalExpenses.toLocaleString()}`} icon={TrendingDown} color="red" small />
        <StatCard title="Net Profit" value={`₹${netProfit.toLocaleString()}`} icon={Wallet} color={netProfit >= 0 ? 'green' : 'red'} small />
        <StatCard title="Paid Students" value={overview?.paid_students || 0} subtitle={`of ${students?.total || 0}`} icon={Users} color="blue" small />
        <StatCard title="Converted Schools" value={overview?.converted_schools || 0} subtitle={`of ${schools?.total || 0}`} icon={Building2} color="purple" small />
        <StatCard title="Active Educators" value={overview?.active_educators || 0} icon={GraduationCap} color="orange" small />
      </div>

      {/* Pipelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FunnelCard
          title="Students"
          icon={Users}
          color="#3b82f6"
          total={students?.total || 0}
          stages={[
            { label: 'New Leads', value: students?.new || 0, color: '#3b82f6' },
            { label: 'Demo Scheduled', value: students?.demo_scheduled || 0, color: '#9333ea' },
            { label: 'Demo Completed', value: students?.demo_completed || 0, color: '#f97316' },
            { label: 'Converted', value: students?.converted || 0, color: '#22c55e' },
          ]}
        />
        <FunnelCard
          title="Schools"
          icon={Building2}
          color="#9333ea"
          total={schools?.total || 0}
          stages={[
            { label: 'New Leads', value: schools?.new || 0, color: '#9333ea' },
            { label: 'Meeting Done', value: schools?.meeting_done || 0, color: '#3b82f6' },
            { label: 'Converted', value: schools?.converted || 0, color: '#f97316' },
            { label: 'Active', value: schools?.active || 0, color: '#22c55e' },
          ]}
        />
        <FunnelCard
          title="Educators"
          icon={GraduationCap}
          color="#f97316"
          total={educators?.total || 0}
          stages={[
            { label: 'New', value: educators?.new || 0, color: '#f97316' },
            { label: 'Demo Scheduled', value: educators?.demo_scheduled || 0, color: '#9333ea' },
            { label: 'Onboarding', value: educators?.onboarding || 0, color: '#3b82f6' },
            { label: 'Active', value: educators?.active || 0, color: '#22c55e' },
          ]}
        />
      </div>
    </div>
  );

  const renderB2CTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">B2C - Student Sales & Marketing</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value={students?.total || 0} icon={Users} color="blue" />
        <StatCard title="Demos Scheduled" value={students?.demo_scheduled || 0} icon={Calendar} color="purple" />
        <StatCard title="Demos Completed" value={students?.demo_completed || 0} icon={Target} color="orange" />
        <StatCard title="Conversions" value={students?.converted || 0} icon={TrendingUp} color="green" />
      </div>
      
      {/* Stage Distribution */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Lead Stage Distribution</h3>
        <div className="space-y-3">
          {students?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name}
              value={stage.count}
              total={students?.total || 1}
              color={['#3b82f6', '#9333ea', '#f97316', '#22c55e', '#64748b'][idx % 5]}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderB2BTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">B2B - School Sales</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Leads" value={schools?.total || 0} icon={Building2} color="purple" />
        <StatCard title="Converted" value={schools?.converted || 0} icon={Target} color="orange" />
        <StatCard title="Active" value={schools?.active || 0} icon={TrendingUp} color="green" />
        <StatCard title="Renewed" value={schools?.renewed || 0} icon={RefreshCw} color="blue" />
        <StatCard title="Lost" value={schools?.lost || 0} icon={TrendingDown} color="red" />
      </div>
      
      {/* Stage Distribution */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">School Stage Distribution</h3>
        <div className="space-y-3">
          {schools?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name}
              value={stage.count}
              total={schools?.total || 1}
              color={['#9333ea', '#3b82f6', '#f97316', '#22c55e', '#10b981', '#ef4444', '#64748b'][idx % 7]}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderHRTeamTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">HR - Team Management</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Applications" value={team?.total || 0} icon={Briefcase} color="blue" />
        <StatCard title="Hired" value={team?.hired || 0} icon={Target} color="green" />
        <StatCard title="Hire Rate" value={`${team?.total > 0 ? Math.round((team?.hired / team?.total) * 100) : 0}%`} icon={TrendingUp} color="purple" />
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Application Funnel</h3>
        <div className="space-y-3">
          {team?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name}
              value={stage.count}
              total={team?.total || 1}
              color={['#3b82f6', '#9333ea', '#f97316', '#22c55e', '#ef4444', '#64748b'][idx % 6]}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderEducatorHRTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Educator HR</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Educators" value={educators?.total || 0} icon={GraduationCap} color="orange" />
        <StatCard title="Active" value={educators?.active || 0} icon={Target} color="green" />
        <StatCard title="In Onboarding" value={educators?.onboarding || 0} icon={Calendar} color="purple" />
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Educator Funnel</h3>
        <div className="space-y-3">
          {educators?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name}
              value={stage.count}
              total={educators?.total || 1}
              color={['#f97316', '#9333ea', '#3b82f6', '#22c55e', '#64748b'][idx % 5]}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderGPTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Growth Partners</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Partners" value={growth_partners?.total || 0} icon={Handshake} color="orange" />
        <StatCard title="Converted" value={growth_partners?.converted || 0} icon={Target} color="green" />
        <StatCard title="Conversion Rate" value={`${growth_partners?.total > 0 ? Math.round((growth_partners?.converted / growth_partners?.total) * 100) : 0}%`} icon={TrendingUp} color="purple" />
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Partner Pipeline</h3>
        <div className="space-y-3">
          {growth_partners?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name}
              value={stage.count}
              total={growth_partners?.total || 1}
              color={['#f97316', '#9333ea', '#3b82f6', '#22c55e', '#64748b'][idx % 5]}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderSupportTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Support Center Analytics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Tickets" value={support?.total || 0} icon={MessageSquare} color="blue" />
        <StatCard title="Pending" value={support?.pending || 0} icon={Calendar} color="orange" />
        <StatCard title="Resolved" value={support?.resolved || 0} icon={Target} color="green" />
        <StatCard 
          title="Resolution Rate" 
          value={`${support?.total > 0 ? Math.round((support?.resolved / support?.total) * 100) : 0}%`}
          icon={TrendingUp} 
          color={support?.total > 0 && (support?.resolved / support?.total) >= 0.7 ? 'green' : 'orange'} 
        />
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Ticket Status Distribution</h3>
        <div className="space-y-3">
          {support?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name}
              value={stage.count}
              total={support?.total || 1}
              color={['#3b82f6', '#f97316', '#22c55e', '#64748b'][idx % 4]}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderPnLTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Profit & Loss Report</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={TrendingUp} color="green" />
        <StatCard title="Total Expenses" value={`₹${totalExpenses.toLocaleString()}`} icon={TrendingDown} color="red" />
        <StatCard title="Net Profit" value={`₹${netProfit.toLocaleString()}`} icon={Wallet} color={netProfit >= 0 ? 'green' : 'red'} />
        <StatCard title="Profit Margin" value={`${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%`} icon={Target} color={netProfit >= 0 ? 'green' : 'red'} />
      </div>
      
      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" /> Revenue Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-slate-600">Student Revenue</span>
              <span className="font-bold text-blue-600">₹{studentRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-slate-600">School Revenue</span>
              <span className="font-bold text-purple-600">₹{schoolRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-100 rounded-lg border border-green-200">
              <span className="font-medium text-green-800">Total Revenue</span>
              <span className="text-xl font-bold text-green-700">₹{totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" /> Expense Breakdown
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {expenses?.by_category?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-600 capitalize">{String(item.name || '').replace(/_/g, ' ')}</span>
                <span className="font-medium text-slate-800">₹{(item.amount || 0).toLocaleString()}</span>
              </div>
            ))}
            {(!expenses?.by_category?.length) && (
              <p className="text-slate-500 text-center py-4">No expenses recorded</p>
            )}
            <div className="flex justify-between items-center p-4 bg-red-100 rounded-lg border border-red-200 mt-2">
              <span className="font-medium text-red-800">Total Expenses</span>
              <span className="text-xl font-bold text-red-700">₹{totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">OLL Analytics</h1>
                <p className="text-xs text-slate-500">Live Report Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {REPORT_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Date Filter */}
        {renderDateFilter()}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-500 mt-3">Loading reports...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'b2c' && renderB2CTab()}
            {activeTab === 'b2b' && renderB2BTab()}
            {activeTab === 'hr_team' && renderHRTeamTab()}
            {activeTab === 'educator_hr' && renderEducatorHRTab()}
            {activeTab === 'growth_partners' && renderGPTab()}
            {activeTab === 'support' && renderSupportTab()}
            {activeTab === 'pnl' && renderPnLTab()}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-slate-400">
        © {new Date().getFullYear()} OLL. Report generated in real-time.
      </footer>
    </div>
  );
};

export default PublicReports;
