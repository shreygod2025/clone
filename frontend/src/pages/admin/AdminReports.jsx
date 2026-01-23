import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  TrendingUp, Users, GraduationCap, Building2, DollarSign, 
  Calendar, Filter, RefreshCw, ArrowUpRight, ArrowDownRight,
  UserCheck, Clock, MessageSquare, Target, BarChart3, PieChart,
  Briefcase, Phone, Mail, ChevronDown
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

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

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-[#D63031] to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg transition-shadow" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-[#1E3A5F]">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(trend)}% from previous period</span>
        </div>
      )}
    </div>
  );
};

const FunnelChart = ({ data, title }) => {
  if (!data || data.length === 0) return null;
  const maxCount = Math.max(...data.map(d => d.count));
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="funnel-chart">
      <h3 className="font-semibold text-[#1E3A5F] mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{item.stage}</span>
              <span className="font-medium text-[#1E3A5F]">{item.count} ({item.percentage}%)</span>
            </div>
            <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#1E3A5F] to-[#D63031] rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${Math.max((item.count / maxCount) * 100, 5)}%` }}
              >
                {item.count > 0 && <span className="text-xs text-white font-medium">{item.count}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BreakdownList = ({ data, title, icon: Icon, color = '#1E3A5F' }) => {
  if (!data || data.length === 0) return null;
  const total = data.reduce((acc, d) => acc + d.count, 0);
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid={`breakdown-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5" style={{ color }} />
        {title}
      </h3>
      <div className="space-y-2">
        {data.slice(0, 8).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-600 capitalize">{item.name?.replace(/_/g, ' ') || 'Unknown'}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1E3A5F]">{item.count}</span>
              <span className="text-xs text-slate-400">({total > 0 ? Math.round((item.count / total) * 100) : 0}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ConversionCard = ({ rates }) => {
  if (!rates) return null;
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="conversion-rates">
      <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-green-500" />
        Conversion Rates
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-xl">
          <p className="text-2xl font-bold text-blue-600">{rates.lead_to_demo}%</p>
          <p className="text-xs text-slate-500 mt-1">Lead → Demo</p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-xl">
          <p className="text-2xl font-bold text-orange-600">{rates.demo_to_conversion}%</p>
          <p className="text-xs text-slate-500 mt-1">Demo → Convert</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-xl">
          <p className="text-2xl font-bold text-green-600">{rates.overall_conversion}%</p>
          <p className="text-xs text-slate-500 mt-1">Overall</p>
        </div>
      </div>
    </div>
  );
};

const UserStagesCard = ({ title, total, stages, icon: Icon, color }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid={`stages-${title.toLowerCase()}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color }} />
          {title}
        </h3>
        <span className="text-2xl font-bold text-[#1E3A5F]">{total}</span>
      </div>
      <div className="space-y-2">
        {stages?.slice(0, 5).map((stage, idx) => (
          <div key={idx} className="flex items-center justify-between py-1">
            <span className="text-sm text-slate-600 capitalize">{stage.name?.replace(/_/g, ' ')}</span>
            <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
              {stage.count}
            </span>
          </div>
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
  const [activeSection, setActiveSection] = useState('overview');
  const [funnelType, setFunnelType] = useState('students');
  
  // Data states
  const [overview, setOverview] = useState(null);
  const [salesFunnel, setSalesFunnel] = useState(null);
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
      const [overviewRes, funnelRes, leadsRes, educatorRes, supportRes, stagesRes] = await Promise.all([
        axios.get(`${API}/admin/reports/overview`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/sales-funnel`, { params: { ...params, user_type: funnelType }, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/lead-analytics`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/educator-metrics`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/support-metrics`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/user-stages`, { params, headers }).catch(() => ({ data: null })),
      ]);
      
      setOverview(overviewRes.data);
      setSalesFunnel(funnelRes.data);
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
  }, [datePreset, customDateRange, funnelType]);

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setShowCustomDate(preset === 'custom');
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sales', label: 'Sales Funnel', icon: TrendingUp },
    { id: 'leads', label: 'Lead Analytics', icon: Target },
    { id: 'educators', label: 'Educators', icon: GraduationCap },
    { id: 'support', label: 'Support', icon: MessageSquare },
    { id: 'stages', label: 'User Stages', icon: Users },
  ];

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
              data-testid="custom-start-date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              data-testid="custom-end-date"
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

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSection === section.id
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
            data-testid={`section-${section.id}`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
          <p className="text-slate-500 mt-3">Loading reports...</p>
        </div>
      ) : (
        <>
          {/* Overview Section */}
          {activeSection === 'overview' && overview && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  title="Total Revenue" 
                  value={`₹${(overview.overview?.total_revenue || 0).toLocaleString()}`}
                  subtitle="All paid enrollments"
                  icon={DollarSign}
                  color="green"
                />
                <StatCard 
                  title="Paid Students" 
                  value={overview.overview?.paid_students || 0}
                  subtitle={`of ${overview.students?.total || 0} total`}
                  icon={Users}
                  color="blue"
                />
                <StatCard 
                  title="Converted Schools" 
                  value={overview.overview?.converted_schools || 0}
                  subtitle={`of ${overview.schools?.total || 0} total`}
                  icon={Building2}
                  color="purple"
                />
                <StatCard 
                  title="Active Educators" 
                  value={overview.overview?.active_educators || 0}
                  subtitle={`of ${overview.educators?.total || 0} total`}
                  icon={GraduationCap}
                  color="orange"
                />
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Students Pipeline */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Student Pipeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-600">New Leads</span>
                      <span className="font-semibold text-[#1E3A5F]">{overview.students?.new || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-600">Demo Scheduled</span>
                      <span className="font-semibold text-purple-600">{overview.students?.demo_scheduled || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-600">Demo Completed</span>
                      <span className="font-semibold text-orange-600">{overview.students?.demo_completed || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-600">Converted</span>
                      <span className="font-semibold text-green-600">{overview.students?.converted || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Schools Pipeline */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-500" />
                    School Pipeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-600">New Leads</span>
                      <span className="font-semibold text-[#1E3A5F]">{overview.schools?.new || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-600">Meeting Scheduled</span>
                      <span className="font-semibold text-purple-600">{overview.schools?.meeting_scheduled || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-600">Proposal Sent</span>
                      <span className="font-semibold text-orange-600">{overview.schools?.proposal_sent || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-600">Converted</span>
                      <span className="font-semibold text-green-600">{overview.schools?.converted || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Educators Pipeline */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-orange-500" />
                    Educator Pipeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-600">New Applications</span>
                      <span className="font-semibold text-[#1E3A5F]">{overview.educators?.new || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-600">Demo Scheduled</span>
                      <span className="font-semibold text-purple-600">{overview.educators?.demo_scheduled || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm text-slate-600">Onboarding</span>
                      <span className="font-semibold text-orange-600">{overview.educators?.onboarding || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-600">Active</span>
                      <span className="font-semibold text-green-600">{overview.educators?.active || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales Funnel Section */}
          {activeSection === 'sales' && (
            <div className="space-y-6">
              {/* Funnel Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFunnelType('students')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    funnelType === 'students'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                  data-testid="funnel-students"
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Students
                </button>
                <button
                  onClick={() => setFunnelType('schools')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    funnelType === 'schools'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                  data-testid="funnel-schools"
                >
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Schools
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Funnel Chart */}
                <FunnelChart 
                  data={salesFunnel?.funnel} 
                  title={`${funnelType === 'students' ? 'Student' : 'School'} Sales Funnel`} 
                />

                {/* Conversion Rates + Revenue */}
                <div className="space-y-4">
                  <ConversionCard rates={salesFunnel?.conversion_rates} />
                  
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      Revenue & Leads
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <p className="text-3xl font-bold text-green-600">₹{(salesFunnel?.revenue || 0).toLocaleString()}</p>
                        <p className="text-sm text-slate-500 mt-1">Total Revenue</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <p className="text-3xl font-bold text-blue-600">{salesFunnel?.total_leads || 0}</p>
                        <p className="text-sm text-slate-500 mt-1">Total Leads</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lead Analytics Section */}
          {activeSection === 'leads' && leadAnalytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  title="Total Leads" 
                  value={leadAnalytics.total || 0}
                  icon={Target}
                  color="blue"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <BreakdownList 
                  data={leadAnalytics.by_source} 
                  title="By Source" 
                  icon={TrendingUp}
                  color="#1E3A5F"
                />
                <BreakdownList 
                  data={leadAnalytics.by_age_group} 
                  title="By Age Group" 
                  icon={Users}
                  color="#D63031"
                />
                <BreakdownList 
                  data={leadAnalytics.by_course} 
                  title="By Course Interest" 
                  icon={GraduationCap}
                  color="#9333ea"
                />
                <BreakdownList 
                  data={leadAnalytics.by_stage} 
                  title="By Stage" 
                  icon={Target}
                  color="#f97316"
                />
              </div>
            </div>
          )}

          {/* Educator Metrics Section */}
          {activeSection === 'educators' && educatorMetrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard 
                  title="New Educators" 
                  value={educatorMetrics.summary?.new_educators || 0}
                  subtitle="This period"
                  icon={UserCheck}
                  color="blue"
                />
                <StatCard 
                  title="Total Active" 
                  value={educatorMetrics.summary?.total_active || 0}
                  icon={GraduationCap}
                  color="green"
                />
                <StatCard 
                  title="Demos / Educator" 
                  value={educatorMetrics.summary?.avg_demos_per_educator || 0}
                  subtitle="Average"
                  icon={Calendar}
                  color="purple"
                />
                <StatCard 
                  title="Earnings / Educator" 
                  value={`₹${(educatorMetrics.summary?.avg_earnings_per_educator || 0).toLocaleString()}`}
                  subtitle="Average"
                  icon={DollarSign}
                  color="orange"
                />
                <StatCard 
                  title="Total Demos" 
                  value={educatorMetrics.summary?.total_demos_conducted || 0}
                  icon={BarChart3}
                  color="red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BreakdownList 
                  data={educatorMetrics.by_status} 
                  title="By Status" 
                  icon={Target}
                  color="#1E3A5F"
                />
                
                {/* Top Performers */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Top Performers
                  </h3>
                  {educatorMetrics.top_performers?.length > 0 ? (
                    <div className="space-y-3">
                      {educatorMetrics.top_performers.map((edu, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                              idx === 1 ? 'bg-slate-100 text-slate-700' :
                              idx === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-50 text-slate-500'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-slate-700">{edu.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#1E3A5F]">{edu.demos} demos</p>
                            <p className="text-xs text-green-600">₹{edu.earnings?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No data available</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Support Metrics Section */}
          {activeSection === 'support' && supportMetrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard 
                  title="Total Queries" 
                  value={supportMetrics.summary?.total || 0}
                  icon={MessageSquare}
                  color="blue"
                />
                <StatCard 
                  title="New" 
                  value={supportMetrics.summary?.new || 0}
                  icon={Mail}
                  color="purple"
                />
                <StatCard 
                  title="Open" 
                  value={supportMetrics.summary?.open || 0}
                  icon={Phone}
                  color="orange"
                />
                <StatCard 
                  title="Resolved" 
                  value={supportMetrics.summary?.resolved || 0}
                  icon={UserCheck}
                  color="green"
                />
                <StatCard 
                  title="Avg Resolution Time" 
                  value={`${supportMetrics.summary?.avg_resolution_time_hours || 0}h`}
                  subtitle="Hours"
                  icon={Clock}
                  color="red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BreakdownList 
                  data={supportMetrics.by_type} 
                  title="By Query Type" 
                  icon={MessageSquare}
                  color="#1E3A5F"
                />
                <BreakdownList 
                  data={supportMetrics.by_priority} 
                  title="By Priority" 
                  icon={Target}
                  color="#D63031"
                />
              </div>
            </div>
          )}

          {/* User Stages Section */}
          {activeSection === 'stages' && userStages && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <UserStagesCard 
                  title="Students" 
                  total={userStages.students?.total || 0}
                  stages={userStages.students?.stages}
                  icon={Users}
                  color="#3b82f6"
                />
                <UserStagesCard 
                  title="Schools" 
                  total={userStages.schools?.total || 0}
                  stages={userStages.schools?.stages}
                  icon={Building2}
                  color="#9333ea"
                />
                <UserStagesCard 
                  title="Educators" 
                  total={userStages.educators?.total || 0}
                  stages={userStages.educators?.stages}
                  icon={GraduationCap}
                  color="#f97316"
                />
                <UserStagesCard 
                  title="Team" 
                  total={userStages.team?.total || 0}
                  stages={userStages.team?.stages}
                  icon={Briefcase}
                  color="#1E3A5F"
                />
                <UserStagesCard 
                  title="Growth Partners" 
                  total={userStages.growth_partners?.total || 0}
                  stages={userStages.growth_partners?.stages}
                  icon={TrendingUp}
                  color="#D63031"
                />
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default AdminReports;
