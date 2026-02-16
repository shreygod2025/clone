import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  TrendingUp, Users, GraduationCap, Building2, DollarSign, 
  Calendar, RefreshCw, ArrowUpRight, ArrowDownRight,
  UserCheck, Clock, MessageSquare, Target, BarChart3,
  Briefcase, Handshake, Wallet, Receipt, TrendingDown,
  FileText, Plus, Edit2, Trash2, X, ChevronDown
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend, small = false }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-[#D63031] to-red-600',
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
          <p className={`${small ? 'text-2xl' : 'text-3xl'} font-bold text-[#1E3A5F]`}>{value}</p>
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

// Funnel Card Component
const FunnelCard = ({ title, icon: Icon, color, stages, total }) => {
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

// Conversion Rate Card
const ConversionCard = ({ title, icon: Icon, color, rates, totalLeads }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5" style={{ color }} />
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {rates.map((rate, idx) => (
          <div key={idx} className={`text-center p-3 rounded-xl`} style={{ backgroundColor: `${rate.color}15` }}>
            <p className="text-2xl font-bold" style={{ color: rate.color }}>{rate.value}%</p>
            <p className="text-xs text-slate-500 mt-1">{rate.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t flex justify-between items-center">
        <span className="text-sm text-slate-600">Total Leads</span>
        <span className="text-xl font-bold text-[#1E3A5F]">{totalLeads}</span>
      </div>
    </div>
  );
};

const AdminReports = () => {
  const { getAuthHeaders, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Date filter states
  const [dateFilterType, setDateFilterType] = useState('month'); // 'custom', 'month', 'year'
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  
  // Team member filter
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState('');
  
  // Data states
  const [reportData, setReportData] = useState({});
  
  // Expense management
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState({ categories: [], subcategories: {} });
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    title: '', description: '', amount: '', category: '', subcategory: '',
    date: format(new Date(), 'yyyy-MM-dd'), payment_method: '', vendor: '', notes: ''
  });

  const getDateParams = () => {
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
    // Add team member filter if selected
    if (selectedTeamMember) {
      params.assigned_to = selectedTeamMember;
    }
    return params;
  };

  // Fetch team members for filter
  const fetchTeamMembers = async () => {
    try {
      const res = await axios.get(`${API}/team-users`, { headers: getAuthHeaders() });
      setTeamMembers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const params = getDateParams();
    const headers = getAuthHeaders();
    
    try {
      const [overviewRes, studentFunnelRes, schoolFunnelRes, educatorRes, supportRes, stagesRes, expensesRes, categoriesRes, b2cInsightsRes, b2bInsightsRes, supportInsightsRes] = await Promise.all([
        axios.get(`${API}/admin/reports/overview`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/sales-funnel`, { params: { ...params, user_type: 'students' }, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/sales-funnel`, { params: { ...params, user_type: 'schools' }, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/educator-metrics`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/support-metrics`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/user-stages`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/expenses`, { params, headers }).catch(() => ({ data: { expenses: [], total: 0 } })),
        axios.get(`${API}/expenses/categories`, { headers }).catch(() => ({ data: { categories: [], subcategories: {} } })),
        axios.get(`${API}/admin/reports/b2c-insights`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/b2b-insights`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/support-insights`, { params, headers }).catch(() => ({ data: null })),
      ]);
      
      setReportData({
        overview: overviewRes.data,
        studentFunnel: studentFunnelRes.data,
        schoolFunnel: schoolFunnelRes.data,
        educator: educatorRes.data,
        support: supportRes.data,
        stages: stagesRes.data,
        b2cInsights: b2cInsightsRes.data,
        b2bInsights: b2bInsightsRes.data,
        supportInsights: supportInsightsRes.data,
      });
      setExpenses(expensesRes.data?.expenses || []);
      setExpenseCategories(categoriesRes.data || { categories: [], subcategories: {} });
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [dateFilterType, customDateRange, selectedMonth, selectedYear, selectedTeamMember]);

  const handleSaveExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.category || !expenseForm.date) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      const payload = { ...expenseForm, amount: parseFloat(expenseForm.amount) };
      if (editingExpense) {
        await axios.patch(`${API}/expenses/${editingExpense.id}`, payload, { headers: getAuthHeaders() });
        toast.success('Expense updated');
      } else {
        await axios.post(`${API}/expenses`, payload, { headers: getAuthHeaders() });
        toast.success('Expense added');
      }
      setShowExpenseModal(false);
      setEditingExpense(null);
      setExpenseForm({ title: '', description: '', amount: '', category: '', subcategory: '', date: format(new Date(), 'yyyy-MM-dd'), payment_method: '', vendor: '', notes: '' });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`${API}/expenses/${id}`, { headers: getAuthHeaders() });
      toast.success('Expense deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  // Calculate derived metrics
  const { overview, studentFunnel, schoolFunnel, educator, support, stages } = reportData;
  
  // School metrics
  const totalSchools = overview?.schools?.total || 0;
  const convertedSchools = overview?.schools?.converted || 0;
  const activeSchools = stages?.schools?.stages?.find(s => s.name === 'active')?.count || 0;
  const renewedSchools = stages?.schools?.stages?.find(s => s.name === 'renewed')?.count || 0;
  const lostSchools = stages?.schools?.stages?.find(s => s.name === 'lost')?.count || 0;
  const renewalRatio = (activeSchools + renewedSchools + lostSchools) > 0 
    ? Math.round((renewedSchools / (activeSchools + renewedSchools + lostSchools)) * 100) 
    : 0;
  
  // Team metrics
  const teamTotal = stages?.team?.total || 0;
  const teamHired = stages?.team?.stages?.find(s => s.name === 'hired')?.count || 0;
  
  // GP metrics
  const gpTotal = stages?.growth_partners?.total || 0;
  const gpConverted = stages?.growth_partners?.stages?.find(s => s.name === 'converted')?.count || 0;
  
  // Expense totals
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expensesByCategory = {};
  expenses.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + (e.amount || 0);
  });
  
  // Revenue
  const totalRevenue = (overview?.overview?.total_revenue || 0);
  const studentRevenue = (overview?.overview?.student_revenue || 0);
  const schoolRevenue = (overview?.overview?.school_revenue || 0);
  const netProfit = totalRevenue - totalExpenses;

  const renderDateFilter = () => (
    <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-100">
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
              dateFilterType === opt.value ? 'bg-white shadow text-[#1E3A5F]' : 'text-slate-600 hover:text-slate-800'
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
      
      {/* Team Member Filter */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-400" />
        <select
          value={selectedTeamMember}
          onChange={(e) => setSelectedTeamMember(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[160px]"
          data-testid="team-member-filter"
        >
          <option value="">All Team Members</option>
          {teamMembers.map(member => (
            <option key={member.id} value={member.id}>
              {member.name || member.username}
            </option>
          ))}
        </select>
      </div>
      
      <Button variant="outline" size="sm" onClick={fetchAllData} className="ml-auto">
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
        <StatCard title="Paid Students" value={overview?.overview?.paid_students || 0} subtitle={`of ${overview?.students?.total || 0}`} icon={Users} color="blue" small />
        <StatCard title="Converted Schools" value={convertedSchools} subtitle={`of ${totalSchools}`} icon={Building2} color="purple" small />
        <StatCard title="Active Educators" value={overview?.overview?.active_educators || 0} icon={GraduationCap} color="orange" small />
      </div>

      {/* Pipelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FunnelCard
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
        <FunnelCard
          title="Schools"
          icon={Building2}
          color="#9333ea"
          total={totalSchools}
          stages={[
            { label: 'New Leads', value: overview?.schools?.new || 0, color: '#9333ea' },
            { label: 'Meeting Done', value: stages?.schools?.stages?.find(s => s.name === 'meeting_done')?.count || 0, color: '#3b82f6' },
            { label: 'Converted', value: convertedSchools, color: '#f97316' },
            { label: 'Active', value: activeSchools, color: '#22c55e' },
          ]}
        />
        <FunnelCard
          title="Educators"
          icon={GraduationCap}
          color="#f97316"
          total={overview?.educators?.total || 0}
          stages={[
            { label: 'New', value: overview?.educators?.new || 0, color: '#f97316' },
            { label: 'Demo Scheduled', value: overview?.educators?.demo_scheduled || 0, color: '#9333ea' },
            { label: 'Onboarding', value: overview?.educators?.onboarding || 0, color: '#3b82f6' },
            { label: 'Active', value: overview?.educators?.active || 0, color: '#22c55e' },
          ]}
        />
      </div>
    </div>
  );

  const renderB2CTab = () => {
    const b2cInsights = reportData.b2cInsights;
    return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1E3A5F]">B2C - Student Sales & Marketing</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Leads" value={studentFunnel?.total_leads || 0} icon={Users} color="blue" />
        <StatCard title="Demos Scheduled" value={overview?.students?.demo_scheduled || 0} icon={Calendar} color="purple" />
        <StatCard title="Demos Completed" value={overview?.students?.demo_completed || 0} icon={UserCheck} color="orange" />
        <StatCard title="Conversions" value={overview?.students?.converted || 0} icon={Target} color="green" />
        <StatCard title="Revenue" value={`₹${(b2cInsights?.revenue || studentRevenue).toLocaleString()}`} icon={DollarSign} color="green" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConversionCard
          title="Student Conversion Rates"
          icon={Users}
          color="#3b82f6"
          totalLeads={studentFunnel?.total_leads || 0}
          rates={[
            { label: 'Lead → Demo', value: studentFunnel?.conversion_rates?.lead_to_demo || 0, color: '#3b82f6' },
            { label: 'Demo → Convert', value: studentFunnel?.conversion_rates?.demo_to_conversion || 0, color: '#f97316' },
            { label: 'Overall', value: studentFunnel?.conversion_rates?.overall_conversion || 0, color: '#22c55e' },
          ]}
        />
        
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-slate-600">Student Revenue</span>
              <span className="text-xl font-bold text-blue-600">₹{studentRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-slate-600">Avg. Ticket Size</span>
              <span className="text-xl font-bold text-green-600">
                ₹{(overview?.students?.converted || 0) > 0 ? Math.round(studentRevenue / overview.students.converted).toLocaleString() : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* B2C Insights Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">📊 Student Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Course/Skill Breakdown */}
          <div className="bg-white rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Courses/Skills</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {b2cInsights?.courses?.slice(0, 5).map((c, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600 truncate">{c.name}</span>
                  <span className="font-medium text-blue-600">{c.count}</span>
                </div>
              ))}
              {(!b2cInsights?.courses?.length) && <p className="text-sm text-slate-400">No data</p>}
            </div>
          </div>
          
          {/* Age Group */}
          <div className="bg-white rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Age Groups</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {b2cInsights?.age_groups?.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600">{a.name}</span>
                  <span className="font-medium text-purple-600">{a.count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Learning Goals */}
          <div className="bg-white rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Learning Goals</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {b2cInsights?.learning_goals?.slice(0, 5).map((g, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600 truncate">{g.name}</span>
                  <span className="font-medium text-green-600">{g.count}</span>
                </div>
              ))}
              {(!b2cInsights?.learning_goals?.length) && <p className="text-sm text-slate-400">No data</p>}
            </div>
          </div>
          
          {/* City Breakdown */}
          <div className="bg-white rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Top Cities</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {b2cInsights?.cities?.slice(0, 5).map((c, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600 truncate">{c.name}</span>
                  <span className="font-medium text-orange-600">{c.count}</span>
                </div>
              ))}
              {(!b2cInsights?.cities?.length) && <p className="text-sm text-slate-400">No data</p>}
            </div>
          </div>
          
          {/* Mode Preference */}
          <div className="bg-white rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Preferred Mode</h4>
            <div className="space-y-2">
              {b2cInsights?.modes?.map((m, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600 capitalize">{m.name}</span>
                  <span className="font-medium text-cyan-600">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Preferred Days & Times */}
          <div className="bg-white rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Demo Timing</h4>
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1">Popular Days</p>
              <div className="flex flex-wrap gap-1">
                {b2cInsights?.preferred_days?.slice(0, 3).map((d, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">{d.name}: {d.count}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Popular Times</p>
              <div className="flex flex-wrap gap-1">
                {b2cInsights?.demo_times?.filter(t => t.count > 0).slice(0, 2).map((t, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">{t.name}: {t.count}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stage Distribution */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">Lead Stage Distribution</h3>
        <div className="space-y-3">
          {stages?.students?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name?.replace(/_/g, ' ')}
              value={stage.count}
              total={stages?.students?.total || 1}
              color={['#3b82f6', '#9333ea', '#f97316', '#22c55e', '#64748b'][idx % 5]}
            />
          ))}
        </div>
      </div>
    </div>
    );
  };

  const renderB2BTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1E3A5F]">B2B - School Sales</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Leads" value={totalSchools} icon={Building2} color="purple" />
        <StatCard title="Converted" value={convertedSchools} icon={Target} color="orange" />
        <StatCard title="Active" value={activeSchools} icon={UserCheck} color="green" />
        <StatCard title="Renewed" value={renewedSchools} icon={RefreshCw} color="blue" />
        <StatCard title="Renewal Ratio" value={`${renewalRatio}%`} subtitle="Renewed / (Active+Renewed+Lost)" icon={TrendingUp} color={renewalRatio >= 50 ? 'green' : 'orange'} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConversionCard
          title="School Conversion Rates"
          icon={Building2}
          color="#9333ea"
          totalLeads={totalSchools}
          rates={[
            { label: 'Lead → Meeting', value: schoolFunnel?.conversion_rates?.lead_to_demo || 0, color: '#9333ea' },
            { label: 'Meeting → Convert', value: schoolFunnel?.conversion_rates?.demo_to_conversion || 0, color: '#f97316' },
            { label: 'Overall', value: schoolFunnel?.conversion_rates?.overall_conversion || 0, color: '#22c55e' },
          ]}
        />
        
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">School Revenue</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-slate-600">Total School Revenue</span>
              <span className="text-xl font-bold text-purple-600">₹{schoolRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-slate-600">Avg. Deal Size</span>
              <span className="text-xl font-bold text-green-600">
                ₹{convertedSchools > 0 ? Math.round(schoolRevenue / convertedSchools).toLocaleString() : 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-slate-600">Lost Schools</span>
              <span className="text-xl font-bold text-blue-600">{lostSchools}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stage Distribution */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">School Stage Distribution</h3>
        <div className="space-y-3">
          {stages?.schools?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name?.replace(/_/g, ' ')}
              value={stage.count}
              total={stages?.schools?.total || 1}
              color={['#9333ea', '#3b82f6', '#f97316', '#22c55e', '#10b981', '#ef4444', '#64748b'][idx % 7]}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderHRTeamTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1E3A5F]">HR - Team Management</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Applications" value={teamTotal} icon={FileText} color="blue" />
        <StatCard title="Hired" value={teamHired} icon={UserCheck} color="green" />
        <StatCard title="Hire Rate" value={`${teamTotal > 0 ? Math.round((teamHired / teamTotal) * 100) : 0}%`} icon={Target} color="purple" />
        <StatCard title="In Pipeline" value={teamTotal - teamHired - (stages?.team?.stages?.find(s => s.name === 'rejected')?.count || 0) - (stages?.team?.stages?.find(s => s.name === 'archived')?.count || 0)} icon={Clock} color="orange" />
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">Application Funnel</h3>
        <div className="space-y-3">
          {stages?.team?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name?.replace(/_/g, ' ')}
              value={stage.count}
              total={teamTotal || 1}
              color={['#3b82f6', '#9333ea', '#f97316', '#22c55e', '#ef4444', '#64748b'][idx % 6]}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderEducatorHRTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1E3A5F]">Educator HR</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Educators" value={overview?.educators?.total || 0} icon={GraduationCap} color="orange" />
        <StatCard title="New This Period" value={educator?.summary?.new_educators || 0} icon={UserCheck} color="blue" />
        <StatCard title="Active" value={educator?.summary?.total_active || 0} icon={Users} color="green" />
        <StatCard title="In Onboarding" value={overview?.educators?.onboarding || 0} icon={Clock} color="purple" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-slate-600">Avg Demos/Educator</span>
              <span className="text-xl font-bold text-blue-600">{educator?.summary?.avg_demos_per_educator || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-slate-600">Avg Earnings/Educator</span>
              <span className="text-xl font-bold text-green-600">₹{(educator?.summary?.avg_earnings_per_educator || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">Application Funnel</h3>
          <div className="space-y-3">
            {stages?.educators?.stages?.slice(0, 5).map((stage, idx) => (
              <ProgressBar
                key={idx}
                label={stage.name?.replace(/_/g, ' ')}
                value={stage.count}
                total={stages?.educators?.total || 1}
                color={['#f97316', '#9333ea', '#3b82f6', '#22c55e', '#64748b'][idx % 5]}
              />
            ))}
          </div>
        </div>
      </div>
      
      {educator?.top_performers?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">Top Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {educator.top_performers.slice(0, 3).map((edu, idx) => (
              <div key={idx} className={`p-4 rounded-xl ${idx === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-[#1E3A5F]">{edu.name}</p>
                    <p className="text-sm text-slate-500">{edu.demos} demos</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderGPTab = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1E3A5F]">Growth Partners</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Partners" value={gpTotal} icon={Handshake} color="orange" />
        <StatCard title="Converted" value={gpConverted} icon={UserCheck} color="green" />
        <StatCard title="Conversion Rate" value={`${gpTotal > 0 ? Math.round((gpConverted / gpTotal) * 100) : 0}%`} icon={Target} color="purple" />
        <StatCard title="In Discussion" value={stages?.growth_partners?.stages?.find(s => s.name === 'in_discussion')?.count || 0} icon={MessageSquare} color="blue" />
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">Partner Pipeline</h3>
        <div className="space-y-3">
          {stages?.growth_partners?.stages?.map((stage, idx) => (
            <ProgressBar
              key={idx}
              label={stage.name?.replace(/_/g, ' ')}
              value={stage.count}
              total={gpTotal || 1}
              color={['#f97316', '#9333ea', '#3b82f6', '#22c55e', '#64748b'][idx % 5]}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderSupportTab = () => {
    const supportInsights = reportData.supportInsights;
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-[#1E3A5F]">Support Center Analytics</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Total Tickets" value={supportInsights?.total_queries || support?.total || 0} icon={MessageSquare} color="blue" />
          <StatCard title="Pending" value={supportInsights?.pending || support?.open || 0} icon={Clock} color="orange" />
          <StatCard title="In Progress" value={support?.in_progress || 0} icon={UserCheck} color="purple" />
          <StatCard title="Resolved" value={supportInsights?.resolved || support?.resolved || 0} icon={Target} color="green" />
          <StatCard 
            title="Resolution Rate" 
            value={`${(supportInsights?.total_queries || 0) > 0 ? Math.round(((supportInsights?.resolved || 0) / supportInsights.total_queries) * 100) : 0}%`} 
            icon={TrendingUp} 
            color={(supportInsights?.total_queries || 0) > 0 && ((supportInsights?.resolved || 0) / supportInsights.total_queries) >= 0.7 ? 'green' : 'orange'} 
          />
        </div>
        
        {/* Support Insights */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">📊 Support Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* By Query Type/Category */}
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Tickets by Category</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {supportInsights?.query_types?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600 capitalize">{item.name || 'Unknown'}</span>
                    <span className="font-medium text-blue-600">{item.count}</span>
                  </div>
                ))}
                {(!supportInsights?.query_types?.length) && <p className="text-sm text-slate-400">No data</p>}
              </div>
            </div>
            
            {/* By Priority */}
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Tickets by Priority</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {supportInsights?.priority_breakdown?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className={`capitalize ${
                      item.name === 'high' ? 'text-red-600' : 
                      item.name === 'medium' ? 'text-orange-600' : 'text-green-600'
                    }`}>{item.name || 'Unknown'}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
                {(!supportInsights?.priority_breakdown?.length) && <p className="text-sm text-slate-400">No data</p>}
              </div>
            </div>
            
            {/* By Source */}
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Tickets by Source</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {supportInsights?.source_breakdown?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600 capitalize">{item.name?.replace(/_/g, ' ') || 'Unknown'}</span>
                    <span className="font-medium text-purple-600">{item.count}</span>
                  </div>
                ))}
                {(!supportInsights?.source_breakdown?.length) && <p className="text-sm text-slate-400">No data</p>}
              </div>
            </div>
            
            {/* Resolution Time */}
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Avg Resolution Time</h4>
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-indigo-600">{supportInsights?.avg_resolution_time_hours || 0}</p>
                <p className="text-sm text-slate-500">hours</p>
              </div>
            </div>
            
            {/* Team Performance */}
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Team Performance</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {supportInsights?.team_performance?.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600 truncate">{item.name || 'Unknown'}</span>
                    <span className="font-medium text-cyan-600">{item.resolution_rate?.toFixed(0)}%</span>
                  </div>
                ))}
                {(!supportInsights?.team_performance?.length) && <p className="text-sm text-slate-400">No data</p>}
              </div>
            </div>
            
            {/* Status Distribution */}
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Status Distribution</h4>
              <div className="space-y-2">
                {supportInsights?.status_breakdown?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className={`capitalize ${
                      item.name === 'resolved' ? 'text-green-600' : 
                      item.name === 'open' ? 'text-blue-600' : 'text-orange-600'
                    }`}>{item.name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Ticket Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">Ticket Status Breakdown</h3>
          <div className="space-y-3">
            <ProgressBar label="Open" value={support?.open || 0} total={support?.total || 1} color="#3b82f6" />
            <ProgressBar label="In Progress" value={support?.in_progress || 0} total={support?.total || 1} color="#f97316" />
            <ProgressBar label="Resolved" value={support?.resolved || 0} total={support?.total || 1} color="#22c55e" />
            <ProgressBar label="Closed" value={support?.closed || 0} total={support?.total || 1} color="#64748b" />
          </div>
        </div>
      </div>
    );
  };

  const renderPnLTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#1E3A5F]">Profit & Loss Report</h2>
        <Button onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }} className="bg-[#D63031] hover:bg-[#b52828]">
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>
      
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
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
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
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" /> Expense Breakdown
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-600 capitalize">{category.replace(/_/g, ' ')}</span>
                <span className="font-medium text-slate-800">₹{amount.toLocaleString()}</span>
              </div>
            ))}
            {Object.keys(expensesByCategory).length === 0 && (
              <p className="text-slate-500 text-center py-4">No expenses recorded</p>
            )}
            <div className="flex justify-between items-center p-4 bg-red-100 rounded-lg border border-red-200 mt-2">
              <span className="font-medium text-red-800">Total Expenses</span>
              <span className="text-xl font-bold text-red-700">₹{totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expense List */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">Recent Expenses</h3>
        {expenses.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No expenses recorded for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 text-sm font-medium text-slate-500">Date</th>
                  <th className="pb-3 text-sm font-medium text-slate-500">Title</th>
                  <th className="pb-3 text-sm font-medium text-slate-500">Category</th>
                  <th className="pb-3 text-sm font-medium text-slate-500">Amount</th>
                  <th className="pb-3 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 20).map(expense => (
                  <tr key={expense.id} className="border-b last:border-0">
                    <td className="py-3 text-sm">{expense.date}</td>
                    <td className="py-3 text-sm font-medium">{expense.title}</td>
                    <td className="py-3">
                      <span className="text-xs px-2 py-1 bg-slate-100 rounded-full capitalize">
                        {expense.category?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-sm font-medium text-red-600">₹{expense.amount?.toLocaleString()}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingExpense(expense);
                            setExpenseForm({
                              title: expense.title,
                              description: expense.description || '',
                              amount: String(expense.amount),
                              category: expense.category,
                              subcategory: expense.subcategory || '',
                              date: expense.date,
                              payment_method: expense.payment_method || '',
                              vendor: expense.vendor || '',
                              notes: expense.notes || ''
                            });
                            setShowExpenseModal(true);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout title="Reports & Analytics">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {REPORT_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`report-tab-${tab.id}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-[#1E3A5F] text-white'
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
      <div className="mt-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
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
      </div>

      {/* Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={() => { setShowExpenseModal(false); setEditingExpense(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <Input
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                placeholder="e.g., Office Rent, Software Subscription"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value, subcategory: '' })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select category</option>
                  {expenseCategories.categories?.map(cat => (
                    <option key={cat} value={cat}>{String(cat || '').replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subcategory</label>
                <select
                  value={expenseForm.subcategory}
                  onChange={(e) => setExpenseForm({ ...expenseForm, subcategory: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  disabled={!expenseForm.category}
                >
                  <option value="">Select subcategory</option>
                  {(expenseCategories.subcategories?.[expenseForm.category] || []).map(sub => (
                    <option key={sub} value={sub}>{String(sub || '').replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={expenseForm.payment_method}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select method</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                <Input
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                  placeholder="Vendor name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <Textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Additional details..."
                rows={2}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => { setShowExpenseModal(false); setEditingExpense(null); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveExpense} className="flex-1 bg-[#D63031] hover:bg-[#b52828]">
                {editingExpense ? 'Update' : 'Add'} Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReports;
