import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  TrendingUp, Users, GraduationCap, Building2, DollarSign, 
  Calendar, RefreshCw, ArrowUpRight, ArrowDownRight,
  UserCheck, Clock, MessageSquare, Target, BarChart3,
  Briefcase, Handshake
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Date filter presets
const DATE_PRESETS = [
  { label: 'Today', value: 'day' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', small = false }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-[#D63031] to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 ${small ? 'p-4' : 'p-5'} hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`${small ? 'text-xs' : 'text-sm'} text-slate-500 mb-1`}>{title}</p>
          <p className={`${small ? 'text-2xl' : 'text-3xl'} font-bold text-[#1E3A5F]`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`${small ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className={`${small ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
        </div>
      </div>
    </div>
  );
};

// Progress bar component for funnel visualization
const ProgressBar = ({ label, value, total, color = '#1E3A5F' }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-[#1E3A5F]">{value} ({percentage}%)</span>
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

// Mini chart component for showing trends
const MiniBarChart = ({ data, title, color = '#1E3A5F' }) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.count));
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h4 className="font-semibold text-[#1E3A5F] mb-4 text-sm">{title}</h4>
      <div className="flex items-end gap-1 h-24">
        {data.slice(0, 10).map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full rounded-t transition-all hover:opacity-80"
              style={{ 
                height: `${Math.max((item.count / maxValue) * 80, 4)}px`,
                backgroundColor: color,
                opacity: 0.7 + (idx * 0.03)
              }}
              title={`${item.name}: ${item.count}`}
            />
            <span className="text-[10px] text-slate-500 truncate w-full text-center" title={item.name}>
              {item.name?.slice(0, 6)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Donut chart for showing distribution
const DonutChart = ({ data, title, total }) => {
  if (!data || data.length === 0) return null;
  
  const colors = ['#1E3A5F', '#D63031', '#3b82f6', '#f97316', '#9333ea', '#22c55e', '#64748b'];
  let cumulativePercent = 0;
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h4 className="font-semibold text-[#1E3A5F] mb-4 text-sm">{title}</h4>
      <div className="flex items-center gap-4">
        {/* SVG Donut */}
        <div className="relative">
          <svg viewBox="0 0 36 36" className="w-24 h-24">
            {data.slice(0, 6).map((item, idx) => {
              const percent = total > 0 ? (item.count / total) * 100 : 0;
              const dashArray = `${percent} ${100 - percent}`;
              const dashOffset = 25 - cumulativePercent;
              cumulativePercent += percent;
              return (
                <circle
                  key={idx}
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="transparent"
                  stroke={colors[idx % colors.length]}
                  strokeWidth="3"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-[#1E3A5F]">{total}</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex-1 space-y-1">
          {data.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                <span className="text-slate-600 capitalize">{item.name?.replace(/_/g, ' ')}</span>
              </div>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pipeline card showing stages
const PipelineCard = ({ title, icon: Icon, color, stages, total }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color }} />
          {title}
        </h3>
        <span className="text-2xl font-bold text-[#1E3A5F]">{total}</span>
      </div>
      <div className="space-y-3">
        {stages?.map((stage, idx) => (
          <ProgressBar 
            key={idx}
            label={stage.label}
            value={stage.value}
            total={total}
            color={stage.color || color}
          />
        ))}
      </div>
    </div>
  );
};

const AdminReports = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('month');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showCustomDate, setShowCustomDate] = useState(false);
  
  // Data states
  const [overview, setOverview] = useState(null);
  const [salesFunnel, setSalesFunnel] = useState(null);
  const [schoolFunnel, setSchoolFunnel] = useState(null);
  const [leadAnalytics, setLeadAnalytics] = useState(null);
  const [educatorMetrics, setEducatorMetrics] = useState(null);
  const [supportMetrics, setSupportMetrics] = useState(null);
  const [userStages, setUserStages] = useState(null);

  const getDateParams = () => {
    if (datePreset === 'custom' && customDateRange.start && customDateRange.end) {
      return { start_date: customDateRange.start, end_date: customDateRange.end };
    }
    if (datePreset === 'all') {
      return {};
    }
    return { period: datePreset };
  };

  const fetchAllData = async () => {
    setLoading(true);
    const params = getDateParams();
    const headers = getAuthHeaders();
    
    try {
      const [overviewRes, studentFunnelRes, schoolFunnelRes, leadsRes, educatorRes, supportRes, stagesRes] = await Promise.all([
        axios.get(`${API}/admin/reports/overview`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/sales-funnel`, { params: { ...params, user_type: 'students' }, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/sales-funnel`, { params: { ...params, user_type: 'schools' }, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/lead-analytics`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/educator-metrics`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/support-metrics`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/user-stages`, { params, headers }).catch(() => ({ data: null })),
      ]);
      
      setOverview(overviewRes.data);
      setSalesFunnel(studentFunnelRes.data);
      setSchoolFunnel(schoolFunnelRes.data);
      setLeadAnalytics(leadsRes.data);
      setEducatorMetrics(educatorRes.data);
      setSupportMetrics(supportRes.data);
      setUserStages(stagesRes.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [datePreset, customDateRange]);

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setShowCustomDate(preset === 'custom');
  };

  return (
    <AdminLayout title="Reports & Analytics">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Date Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <Calendar className="w-5 h-5 text-slate-400" />
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => handleDatePresetChange(preset.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                datePreset === preset.value
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
              data-testid={`date-filter-${preset.value}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        
        {/* Custom Date Range */}
        {showCustomDate && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        )}
        
        {/* Refresh Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchAllData}
          className="ml-auto"
          data-testid="refresh-reports"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
          <p className="text-slate-500 mt-3">Loading reports...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ============ KEY METRICS ============ */}
          <div>
            <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Key Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard 
                title="Total Revenue" 
                value={`₹${(overview?.overview?.total_revenue || 0).toLocaleString()}`}
                icon={DollarSign}
                color="green"
                small
              />
              <StatCard 
                title="Paid Students" 
                value={overview?.overview?.paid_students || 0}
                subtitle={`of ${overview?.students?.total || 0}`}
                icon={Users}
                color="blue"
                small
              />
              <StatCard 
                title="Converted Schools" 
                value={overview?.overview?.converted_schools || 0}
                subtitle={`of ${overview?.schools?.total || 0}`}
                icon={Building2}
                color="purple"
                small
              />
              <StatCard 
                title="Active Educators" 
                value={overview?.overview?.active_educators || 0}
                subtitle={`of ${overview?.educators?.total || 0}`}
                icon={GraduationCap}
                color="orange"
                small
              />
              <StatCard 
                title="Support Open" 
                value={supportMetrics?.summary?.open || 0}
                subtitle={`of ${supportMetrics?.summary?.total || 0}`}
                icon={MessageSquare}
                color="red"
                small
              />
              <StatCard 
                title="Team Apps" 
                value={userStages?.team?.total || 0}
                icon={Briefcase}
                color="indigo"
                small
              />
            </div>
          </div>

          {/* ============ ALL PIPELINES OVERVIEW ============ */}
          <div>
            <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              All Pipelines
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Student Pipeline */}
              <PipelineCard
                title="Students"
                icon={Users}
                color="#3b82f6"
                total={overview?.students?.total || 0}
                stages={[
                  { label: 'New Leads', value: overview?.students?.new || 0, color: '#3b82f6' },
                  { label: 'Demo Scheduled', value: overview?.students?.demo_scheduled || 0, color: '#9333ea' },
                  { label: 'Demo Completed', value: overview?.students?.demo_completed || 0, color: '#f97316' },
                  { label: 'Converted', value: overview?.students?.converted || 0, color: '#22c55e' },
                ]}
              />
              
              {/* School Pipeline */}
              <PipelineCard
                title="Schools"
                icon={Building2}
                color="#9333ea"
                total={overview?.schools?.total || 0}
                stages={[
                  { label: 'New Leads', value: overview?.schools?.new || 0, color: '#9333ea' },
                  { label: 'Meeting Scheduled', value: overview?.schools?.meeting_scheduled || 0, color: '#3b82f6' },
                  { label: 'Proposal Sent', value: overview?.schools?.proposal_sent || 0, color: '#f97316' },
                  { label: 'Converted', value: overview?.schools?.converted || 0, color: '#22c55e' },
                ]}
              />
              
              {/* Educator Pipeline */}
              <PipelineCard
                title="Educators"
                icon={GraduationCap}
                color="#f97316"
                total={overview?.educators?.total || 0}
                stages={[
                  { label: 'New Applications', value: overview?.educators?.new || 0, color: '#f97316' },
                  { label: 'Demo Scheduled', value: overview?.educators?.demo_scheduled || 0, color: '#9333ea' },
                  { label: 'Onboarding', value: overview?.educators?.onboarding || 0, color: '#3b82f6' },
                  { label: 'Active', value: overview?.educators?.active || 0, color: '#22c55e' },
                ]}
              />

              {/* Support Pipeline */}
              <PipelineCard
                title="Support Tickets"
                icon={MessageSquare}
                color="#D63031"
                total={supportMetrics?.summary?.total || 0}
                stages={[
                  { label: 'New', value: supportMetrics?.summary?.new || 0, color: '#D63031' },
                  { label: 'Open', value: supportMetrics?.summary?.open || 0, color: '#f97316' },
                  { label: 'Resolved', value: supportMetrics?.summary?.resolved || 0, color: '#22c55e' },
                ]}
              />

              {/* Team Applications */}
              <PipelineCard
                title="Team Applications"
                icon={Briefcase}
                color="#1E3A5F"
                total={userStages?.team?.total || 0}
                stages={userStages?.team?.stages?.slice(0, 4).map(s => ({
                  label: s.name?.replace(/_/g, ' '),
                  value: s.count,
                  color: '#1E3A5F'
                })) || []}
              />

              {/* Growth Partners */}
              <PipelineCard
                title="Growth Partners"
                icon={Handshake}
                color="#D63031"
                total={userStages?.growth_partners?.total || 0}
                stages={userStages?.growth_partners?.stages?.slice(0, 4).map(s => ({
                  label: s.name?.replace(/_/g, ' '),
                  value: s.count,
                  color: '#D63031'
                })) || []}
              />
            </div>
          </div>

          {/* ============ CONVERSION METRICS ============ */}
          <div>
            <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Conversion Rates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Conversions */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Student Conversion Rates
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">{salesFunnel?.conversion_rates?.lead_to_demo || 0}%</p>
                    <p className="text-xs text-slate-500 mt-1">Lead → Demo</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-xl">
                    <p className="text-2xl font-bold text-orange-600">{salesFunnel?.conversion_rates?.demo_to_conversion || 0}%</p>
                    <p className="text-xs text-slate-500 mt-1">Demo → Convert</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">{salesFunnel?.conversion_rates?.overall_conversion || 0}%</p>
                    <p className="text-xs text-slate-500 mt-1">Overall</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Leads</span>
                  <span className="text-xl font-bold text-[#1E3A5F]">{salesFunnel?.total_leads || 0}</span>
                </div>
              </div>

              {/* School Conversions */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-500" />
                  School Conversion Rates
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <p className="text-2xl font-bold text-purple-600">{schoolFunnel?.conversion_rates?.lead_to_demo || 0}%</p>
                    <p className="text-xs text-slate-500 mt-1">Lead → Meeting</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-xl">
                    <p className="text-2xl font-bold text-orange-600">{schoolFunnel?.conversion_rates?.demo_to_conversion || 0}%</p>
                    <p className="text-xs text-slate-500 mt-1">Meeting → Convert</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">{schoolFunnel?.conversion_rates?.overall_conversion || 0}%</p>
                    <p className="text-xs text-slate-500 mt-1">Overall</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Leads</span>
                  <span className="text-xl font-bold text-[#1E3A5F]">{schoolFunnel?.total_leads || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============ ANALYTICS CHARTS ============ */}
          <div>
            <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analytics Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DonutChart 
                data={leadAnalytics?.by_source} 
                title="Leads by Source" 
                total={leadAnalytics?.total || 0}
              />
              <DonutChart 
                data={leadAnalytics?.by_age_group} 
                title="Leads by Age Group" 
                total={leadAnalytics?.total || 0}
              />
              <DonutChart 
                data={leadAnalytics?.by_course} 
                title="Course Interest" 
                total={leadAnalytics?.total || 0}
              />
              <DonutChart 
                data={supportMetrics?.by_type} 
                title="Support by Type" 
                total={supportMetrics?.summary?.total || 0}
              />
            </div>
          </div>

          {/* ============ EDUCATOR & SUPPORT METRICS ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Educator Metrics */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-orange-500" />
                Educator Quality Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-orange-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-orange-600">{educatorMetrics?.summary?.new_educators || 0}</p>
                  <p className="text-xs text-slate-500">New This Period</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-green-600">{educatorMetrics?.summary?.total_active || 0}</p>
                  <p className="text-xs text-slate-500">Total Active</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-600">{educatorMetrics?.summary?.avg_demos_per_educator || 0}</p>
                  <p className="text-xs text-slate-500">Avg Demos/Educator</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-purple-600">₹{(educatorMetrics?.summary?.avg_earnings_per_educator || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Avg Earnings</p>
                </div>
              </div>
              {educatorMetrics?.top_performers?.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Top Performers</p>
                  {educatorMetrics.top_performers.slice(0, 3).map((edu, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                        }`}>{idx + 1}</span>
                        <span className="text-sm">{edu.name}</span>
                      </div>
                      <span className="text-sm font-medium text-[#1E3A5F]">{edu.demos} demos</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Support Metrics */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-red-500" />
                Support Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-red-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-red-600">{supportMetrics?.summary?.new || 0}</p>
                  <p className="text-xs text-slate-500">New Tickets</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-orange-600">{supportMetrics?.summary?.open || 0}</p>
                  <p className="text-xs text-slate-500">Open</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-green-600">{supportMetrics?.summary?.resolved || 0}</p>
                  <p className="text-xs text-slate-500">Resolved</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-600">{supportMetrics?.summary?.avg_resolution_time_hours || 0}h</p>
                  <p className="text-xs text-slate-500">Avg Resolution</p>
                </div>
              </div>
              {supportMetrics?.by_priority?.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">By Priority</p>
                  {supportMetrics.by_priority.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <span className="text-sm capitalize">{item.name?.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-medium px-2 py-0.5 bg-slate-100 rounded">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============ STAGE DISTRIBUTION ============ */}
          <div>
            <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Stage Distribution
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <DonutChart 
                data={userStages?.students?.stages} 
                title="Students" 
                total={userStages?.students?.total || 0}
              />
              <DonutChart 
                data={userStages?.schools?.stages} 
                title="Schools" 
                total={userStages?.schools?.total || 0}
              />
              <DonutChart 
                data={userStages?.educators?.stages} 
                title="Educators" 
                total={userStages?.educators?.total || 0}
              />
              <DonutChart 
                data={userStages?.team?.stages} 
                title="Team" 
                total={userStages?.team?.total || 0}
              />
              <DonutChart 
                data={userStages?.growth_partners?.stages} 
                title="Growth Partners" 
                total={userStages?.growth_partners?.total || 0}
              />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReports;
