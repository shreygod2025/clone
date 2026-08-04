import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  TrendingUp, Users, GraduationCap, Building2, DollarSign, 
  Calendar, RefreshCw, ArrowUpRight, ArrowDownRight,
  UserCheck, Clock, MessageSquare, Target, BarChart3,
  Briefcase, Handshake, Wallet, Receipt, TrendingDown,
  FileText, Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, Link, Copy, Eye, EyeOff, ExternalLink, Lock,
  PieChart, AlertCircle, Send, MessageCircle, MapPin, Instagram, Heart, MessageSquare as CommentIcon, Play, CheckCircle2, Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import axios from 'axios';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, Area, AreaChart, PieChart as RechartsPie, Pie, Cell
} from 'recharts';

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
  { id: 'social', label: 'Social Media', icon: Instagram },
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

// Generate week options (last 13 weeks)
const generateWeekOptions = () => {
  const weeks = [];
  const today = new Date();
  for (let i = 0; i < 13; i++) {
    const weekEnd = subDays(today, i * 7);
    const weekStart = subDays(weekEnd, 6);
    weeks.push({
      value: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd'),
      label: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`,
    });
  }
  return weeks;
};
const WEEK_OPTIONS = generateWeekOptions();

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

// Simple Pie Chart Component (CSS-based)
const SimplePieChart = ({ title, icon: Icon, data, emptyMessage = "No data" }) => {
  const total = data?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;
  
  // Colors for pie slices
  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];
  
  // Calculate percentages and angles
  let cumulativePercent = 0;
  const slices = data?.map((item, idx) => {
    const percent = total > 0 ? (item.count / total) * 100 : 0;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    return {
      ...item,
      percent,
      startPercent,
      color: COLORS[idx % COLORS.length]
    };
  }) || [];

  // Generate conic gradient for pie chart
  const gradientStops = slices.map((slice, idx) => {
    const start = slice.startPercent;
    const end = start + slice.percent;
    return `${slice.color} ${start}% ${end}%`;
  }).join(', ');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-red-500" />}
        {title}
      </h3>
      
      {total === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Pie Chart */}
          <div 
            className="w-32 h-32 rounded-full flex-shrink-0"
            style={{
              background: gradientStops ? `conic-gradient(${gradientStops})` : '#e2e8f0'
            }}
          />
          
          {/* Legend */}
          <div className="flex-1 space-y-2">
            {slices.map((slice, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-slate-600 truncate">{slice.name?.replace(/_/g, ' ') || 'Unknown'}</span>
                </div>
                <span className="font-medium text-[#1E3A5F] ml-2">
                  {slice.count} ({Math.round(slice.percent)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Conversion Rate Card
const ConversionCard = ({ title, icon: Icon, color, rates, totalLeads, totalLabel = 'Total Leads' }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5" style={{ color }} />
        {title}
      </h3>
      <div className={`grid ${rates.length === 3 ? 'grid-cols-3' : rates.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
        {rates.map((rate, idx) => (
          <div key={idx} className={`text-center p-3 rounded-xl`} style={{ backgroundColor: `${rate.color}15` }}>
            <p className="text-2xl font-bold" style={{ color: rate.color }}>{rate.value}%</p>
            <p className="text-xs text-slate-500 mt-1">{rate.label}</p>
            {rate.countLabel && (
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{rate.countLabel}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t flex justify-between items-center">
        <span className="text-sm text-slate-600">{totalLabel}</span>
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
  const [dateFilterType, setDateFilterType] = useState('month'); // 'custom', 'week', 'month', 'year'
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedWeek, setSelectedWeek] = useState(WEEK_OPTIONS[0]?.value || '');
  
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

  // Public link management
  const [showPublicLinkModal, setShowPublicLinkModal] = useState(false);
  const [publicLinkInfo, setPublicLinkInfo] = useState(null);
  const [publicLinkPassword, setPublicLinkPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [publicLinkLoading, setPublicLinkLoading] = useState(false);

  // Sub-category drill-down state
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subcategoryTickets, setSubcategoryTickets] = useState([]);
  const [subcategoryLoading, setSubcategoryLoading] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [supportTimeline, setSupportTimeline] = useState([]);

  // Social Media (Instagram via Apify) state — lazy-loaded on tab open.
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialData,    setSocialData]    = useState(null);
  const [socialError,   setSocialError]   = useState('');
  const [socialTrend, setSocialTrend]     = useState([]);
  const [socialTrendLoading, setSocialTrendLoading] = useState(false);
  // Derive chart granularity from the page-level date filter — Week/Custom → day,
  // Month → day, Year → month. Keeps the top filter as the single source of truth.
  const socialGranularity = ({ week: 'day', month: 'day', year: 'month', custom: 'day' }[dateFilterType]) || 'day';

  const loadSocial = async (force = false) => {
    setSocialLoading(true); setSocialError('');
    try {
      const r = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reports/social-media/instagram${force ? '?refresh=true' : ''}`,
        { headers: getAuthHeaders() },
      );
      setSocialData(r.data);
    } catch (e) {
      setSocialError(e.response?.data?.detail || 'Failed to load Instagram stats');
    } finally { setSocialLoading(false); }
  };
  const loadSocialTrend = async (granularity) => {
    setSocialTrendLoading(true);
    try {
      const r = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reports/social-media/instagram/trend?granularity=${granularity}`,
        { headers: getAuthHeaders() },
      );
      setSocialTrend(r.data?.series || []);
    } catch { setSocialTrend([]); }
    finally { setSocialTrendLoading(false); }
  };
  const captureSocialSnapshot = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reports/social-media/instagram/snapshot`,
        {}, { headers: getAuthHeaders() },
      );
      // refresh both the live card and the chart
      await Promise.all([loadSocial(false), loadSocialTrend(socialGranularity)]);
    } catch (e) {
      setSocialError(e.response?.data?.detail || 'Snapshot failed');
    }
  };
  // Auto-load when the Social Media tab is opened or when the top filter changes.
  useEffect(() => {
    if (activeTab !== 'social') return;
    if (!socialData && !socialLoading) loadSocial(false);
    loadSocialTrend(socialGranularity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, socialGranularity]);

  // ── YouTube (Data API v3 via service account) ─────────────────────────
  const [ytData, setYtData]           = useState(null);
  const [ytLoading, setYtLoading]     = useState(false);
  const [ytError, setYtError]         = useState('');
  const [ytTrend, setYtTrend]         = useState([]);
  const [ytTrendLoading, setYtTrendLoading] = useState(false);

  const loadYouTube = async (force = false) => {
    setYtLoading(true); setYtError('');
    try {
      const r = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reports/social-media/youtube${force ? '?refresh=true' : ''}`,
        { headers: getAuthHeaders() },
      );
      setYtData(r.data);
    } catch (e) {
      setYtError(e.response?.data?.detail || 'Failed to load YouTube stats');
    } finally { setYtLoading(false); }
  };
  const loadYtTrend = async (granularity) => {
    setYtTrendLoading(true);
    try {
      const r = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reports/social-media/youtube/trend?granularity=${granularity}`,
        { headers: getAuthHeaders() },
      );
      setYtTrend(r.data?.series || []);
    } catch { setYtTrend([]); }
    finally { setYtTrendLoading(false); }
  };
  const captureYtSnapshot = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reports/social-media/youtube/snapshot`,
        {}, { headers: getAuthHeaders() },
      );
      await Promise.all([loadYouTube(false), loadYtTrend(socialGranularity)]);
    } catch (e) { setYtError(e.response?.data?.detail || 'Snapshot failed'); }
  };
  useEffect(() => {
    if (activeTab !== 'social') return;
    if (!ytData && !ytLoading) loadYouTube(false);
    loadYtTrend(socialGranularity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, socialGranularity]);

  const getDateParams = () => {
    let params = {};
    if (dateFilterType === 'custom' && customDateRange.start && customDateRange.end) {
      params = { start_date: customDateRange.start, end_date: customDateRange.end };
    } else if (dateFilterType === 'week') {
      const weekOpt = WEEK_OPTIONS.find(w => w.value === selectedWeek) || WEEK_OPTIONS[0];
      if (weekOpt) {
        params = { start_date: weekOpt.value, end_date: weekOpt.end };
      }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubcategoryTickets = async (subcategory) => {
    setSubcategoryLoading(true);
    setExpandedReplies({});
    try {
      const params = { ...getDateParams(), subcategory };
      const res = await axios.get(`${API}/admin/reports/support-subcategory-tickets`, {
        params, headers: getAuthHeaders()
      });
      setSubcategoryTickets(res.data?.tickets || []);
    } catch (e) {
      toast.error('Failed to load tickets');
      setSubcategoryTickets([]);
    } finally {
      setSubcategoryLoading(false);
    }
  };

  const handleSubcategoryClick = (name) => {
    setSelectedSubcategory(name);
    fetchSubcategoryTickets(name);
  };

  const toggleReplies = (ticketId) => {
    setExpandedReplies(prev => ({ ...prev, [ticketId]: !prev[ticketId] }));
  };

  const fetchAllData = async () => {
    setLoading(true);
    const params = getDateParams();
    const headers = getAuthHeaders();
    
    try {
      const [overviewRes, studentFunnelRes, schoolFunnelRes, educatorRes, supportRes, stagesRes, expensesRes, categoriesRes, b2cInsightsRes, b2bInsightsRes, supportInsightsRes, supportTimelineRes, cashflowRes,
        b2cConsolidatedRes, centersBatchesRes, revenueSplitRes, expensesSummaryRes] = await Promise.all([
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
        axios.get(`${API}/admin/reports/support-timeline`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/cashflow`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/b2c-consolidated`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/centers-batches`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/revenue-split`, { params, headers }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/reports/expenses-summary`, { params, headers }).catch(() => ({ data: null })),
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
        cashflow: cashflowRes.data,
        b2cConsolidated: b2cConsolidatedRes.data,
        centersBatches: centersBatchesRes.data,
        revenueSplit: revenueSplitRes.data,
        expensesSummary: expensesSummaryRes.data,
      });
      setSupportTimeline(supportTimelineRes.data?.timeline || []);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Public Link Management Functions
  const fetchPublicLinkInfo = async () => {
    try {
      const res = await axios.get(`${API}/admin/reports/public-link`, { headers: getAuthHeaders() });
      setPublicLinkInfo(res.data);
    } catch (error) {
      console.error('Failed to fetch public link info:', error);
    }
  };

  useEffect(() => {
    fetchPublicLinkInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateOrUpdatePublicLink = async () => {
    if (!publicLinkPassword || publicLinkPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    setPublicLinkLoading(true);
    try {
      const res = await axios.post(`${API}/admin/reports/public-link`, {
        password: publicLinkPassword
      }, { headers: getAuthHeaders() });
      
      toast.success('Public report link created/updated!');
      setPublicLinkInfo({ exists: true, token: res.data.token });
      setPublicLinkPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create public link');
    } finally {
      setPublicLinkLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!publicLinkPassword || publicLinkPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    setPublicLinkLoading(true);
    try {
      await axios.patch(`${API}/admin/reports/public-link/password`, {
        new_password: publicLinkPassword
      }, { headers: getAuthHeaders() });
      
      toast.success('Password updated successfully!');
      setPublicLinkPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update password');
    } finally {
      setPublicLinkLoading(false);
    }
  };

  const handleDeletePublicLink = async () => {
    if (!window.confirm('Delete the public report link? Anyone with the link will no longer be able to access reports.')) return;
    try {
      await axios.delete(`${API}/admin/reports/public-link`, { headers: getAuthHeaders() });
      toast.success('Public link deleted');
      setPublicLinkInfo({ exists: false });
    } catch (error) {
      toast.error('Failed to delete public link');
    }
  };

  const copyPublicLink = () => {
    if (publicLinkInfo?.token) {
      const link = `${window.location.origin}/reports/${publicLinkInfo.token}`;
      navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard!');
    }
  };

  // Calculate derived metrics
  const { overview, studentFunnel, schoolFunnel, educator, support, stages, b2cInsights, b2bInsights, supportInsights, cashflow } = reportData;

  // School metrics
  const totalSchools = overview?.schools?.total || 0;
  const convertedSchools = overview?.schools?.converted || 0;
  const activeSchools = b2bInsights?.active_schools ?? (stages?.schools?.stages?.find(s => s.name === 'active')?.count || 0);
  const renewedSchools = b2bInsights?.renewed ?? (stages?.schools?.stages?.find(s => s.name === 'renewed')?.count || 0);
  const lostSchools = stages?.schools?.stages?.find(s => s.name === 'lost')?.count || 0;
  const renewalRatio = b2bInsights?.renewal_ratio ?? ((activeSchools + renewedSchools) > 0
    ? Math.round((renewedSchools / (activeSchools + renewedSchools)) * 100)
    : 0);
  
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
  
  // Revenue — prefer B2B insights (all-time, always computed), fall back to overview
  const totalRevenue = (overview?.overview?.total_revenue || 0);
  const studentRevenue = (overview?.overview?.student_revenue || 0);
  const schoolRevenue = (b2bInsights?.revenue || overview?.overview?.school_revenue || 0);
  const netProfit = totalRevenue - totalExpenses;

  const renderDateFilter = () => (
    <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-100">
      {/* Filter Type Selector */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {[
          { value: 'week', label: 'Week' },
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
      
      {/* Week Selector */}
      {dateFilterType === 'week' && (
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          {WEEK_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

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
      
      <div className="flex items-center gap-2 ml-auto">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowPublicLinkModal(true)}
          className="border-blue-200 text-blue-600 hover:bg-blue-50"
          data-testid="share-report-btn"
        >
          <Link className="w-4 h-4 mr-2" />
          Share Report
        </Button>
        <Button variant="outline" size="sm" onClick={fetchAllData}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
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
    const consol = reportData.b2cConsolidated;
    const centersBatches = reportData.centersBatches;
    const revenueSplit = reportData.revenueSplit;
    const bd = consol?.breakdown || {};
    const totals = consol?.totals || {};
    return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1E3A5F]">B2C — Student Sales & Marketing</h2>
      <p className="text-xs text-slate-500 -mt-4">Includes Student CRM, Future Skills and Summer Camp funnels combined.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value={(totals.leads ?? studentFunnel?.total_leads ?? 0).toLocaleString()} icon={Users} color="blue" data-testid="b2c-total-leads" />
        <StatCard title="Total Demos / Trials" value={(totals.demos ?? 0).toLocaleString()} icon={Calendar} color="purple" data-testid="b2c-total-demos" />
        <StatCard title="Total Customers" value={(totals.customers ?? 0).toLocaleString()} icon={UserCheck} color="orange" data-testid="b2c-total-customers" />
        <StatCard title="Total Revenue" value={`₹${(totals.revenue ?? 0).toLocaleString()}`} icon={DollarSign} color="green" data-testid="b2c-total-revenue" />
      </div>

      {/* Breakdown by source */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="b2c-breakdown">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">Breakdown by Funnel Source</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium">Leads</th>
                <th className="pb-2 font-medium">Demos</th>
                <th className="pb-2 font-medium">Customers</th>
                <th className="pb-2 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'student_crm', label: 'Student CRM',    stats: bd.student_crm },
                { key: 'future_skills', label: 'Future Skills', stats: bd.future_skills },
                { key: 'summer_camp',   label: 'Summer Camp',   stats: bd.summer_camp },
              ].map(row => (
                <tr key={row.key} className="border-b border-slate-50" data-testid={`b2c-row-${row.key}`}>
                  <td className="py-3 font-medium text-[#0F1E33]">{row.label}</td>
                  <td className="py-3">{(row.stats?.leads ?? 0).toLocaleString()}</td>
                  <td className="py-3">{(row.stats?.demos ?? 0).toLocaleString()}</td>
                  <td className="py-3">{(row.stats?.customers ?? 0).toLocaleString()}</td>
                  <td className="py-3 font-semibold text-emerald-700">₹{(row.stats?.revenue ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue split: SC · Home · Center */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="revenue-split">
        <h3 className="font-semibold text-[#1E3A5F] mb-4">Revenue Split — Where Money Comes From</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(revenueSplit?.buckets || []).map(b => (
            <div key={b.key} className="rounded-xl p-4 border border-slate-100 bg-gradient-to-br from-slate-50 to-white"
                 data-testid={`revenue-bucket-${b.key}`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{b.label}</div>
              <div className="text-2xl font-black text-[#0F1E33] mt-1">₹{Number(b.revenue || 0).toLocaleString()}</div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#1E3A5F]" style={{ width: `${b.percent}%` }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{b.percent}% of total</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-500">Total: <strong className="text-emerald-700">₹{Number(revenueSplit?.total || 0).toLocaleString()}</strong> across all three channels.</div>
      </div>

      {/* Centres · Batches · Batch filling */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="centers-batches">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-[#1E3A5F]">Centres, Batches & Filling</h3>
          <div className="text-xs text-slate-500">
            {centersBatches?.centers?.total || 0} centres · {centersBatches?.batches?.total || 0} batches ·{' '}
            <strong>{centersBatches?.batches?.overall_fill_percent || 0}%</strong> filled overall
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard title="Total Centres"      value={centersBatches?.centers?.total || 0}  icon={Users}  color="blue"   small />
          <StatCard title="Active Centres"     value={centersBatches?.centers?.active || 0} icon={UserCheck} color="green"  small />
          <StatCard title="Total Batches"      value={centersBatches?.batches?.total || 0}  icon={Calendar} color="purple" small />
          <StatCard title="Seats Filled"       value={`${centersBatches?.batches?.total_enrolled || 0} / ${centersBatches?.batches?.total_capacity || 0}`} icon={Target} color="orange" small />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 font-medium">Batch</th>
                <th className="pb-2 font-medium">Centre</th>
                <th className="pb-2 font-medium">Days · Time</th>
                <th className="pb-2 font-medium">Capacity</th>
                <th className="pb-2 font-medium">Enrolled</th>
                <th className="pb-2 font-medium">Fill</th>
              </tr>
            </thead>
            <tbody>
              {(centersBatches?.batches?.rows || []).map(row => (
                <tr key={row.id} className="border-b border-slate-50" data-testid={`batch-row-${row.id}`}>
                  <td className="py-2 font-medium text-[#0F1E33]">{row.name}</td>
                  <td className="py-2 text-slate-600">{row.center_name || '—'}</td>
                  <td className="py-2 text-slate-500 text-xs">
                    {(row.days || []).join(',')} · {row.start_time}-{row.end_time}
                  </td>
                  <td className="py-2">{row.capacity}</td>
                  <td className="py-2">{row.enrolled}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full ${row.fill_percent >= 80 ? 'bg-emerald-500' : row.fill_percent >= 40 ? 'bg-amber-500' : 'bg-rose-400'}`}
                             style={{ width: `${Math.min(100, row.fill_percent)}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{row.fill_percent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {(!centersBatches?.batches?.rows?.length) && (
                <tr><td colSpan={6} className="py-4 text-center text-slate-400 text-sm">No batches yet. Create batches under Future Skills → Centres.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConversionCard
          title="Student CRM Conversion Rates"
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
          <h3 className="font-semibold text-[#1E3A5F] mb-4">Revenue vs Customers</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <span className="text-slate-600">Total Revenue</span>
              <span className="text-xl font-bold text-emerald-700">₹{Number(totals.revenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-slate-600">Avg. Ticket Size</span>
              <span className="text-xl font-bold text-blue-600">
                ₹{(totals.customers || 0) > 0 ? Math.round((totals.revenue || 0) / totals.customers).toLocaleString() : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
      );
  };

  const renderB2BTab = () => {
    // Merged lost reasons
    const mergedLostReasons = (() => {
      const m = {};
      (stages?.schools?.lost_lead_reasons || []).forEach(r => { m[r.name] = (m[r.name] || 0) + r.count; });
      (stages?.schools?.lost_customer_reasons || []).forEach(r => { m[r.name] = (m[r.name] || 0) + r.count; });
      return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    })();

    const pipelineValue = b2bInsights?.pipeline_value || 0;
    const totalLostValue = b2bInsights?.total_lost_value || stages?.schools?.total_lost_value || 0;
    const conversionRatio = b2bInsights?.conversion_ratio || schoolFunnel?.conversion_rates?.overall_conversion || 0;

    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1E3A5F]">B2B - School Sales</h2>
        {/* B2B Year-Only Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(e.target.value); setDateFilterType('year'); }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium"
            data-testid="b2b-year-filter"
          >
            {YEAR_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: 5 Key KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Revenue Generated" value={`₹${schoolRevenue.toLocaleString()}`} icon={DollarSign} color="green" />
        <StatCard title="Conversions" value={activeSchools + renewedSchools + convertedSchools} subtitle="converted + active + renewed" icon={Target} color="orange" />
        <StatCard title="Conversion Ratio" value={`${conversionRatio}%`} subtitle="of total leads" icon={TrendingUp} color="blue" />
        <StatCard title="Value Pipeline" value={`₹${pipelineValue.toLocaleString()}`} subtitle="in-progress deals" icon={Briefcase} color="purple" />
        <StatCard title="Lost Value" value={`₹${totalLostValue.toLocaleString()}`} subtitle="leads + customers" icon={TrendingDown} color="red" />
      </div>

      {/* Row 2: Revenue Overview + School Conversion Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Revenue Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <div className="text-slate-600">Total School Revenue</div>
                <div className="text-xs text-slate-400 mt-0.5">New Revenue + Renewed Revenue</div>
              </div>
              <span className="text-xl font-bold text-green-600">₹{schoolRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="text-slate-600">New Schools</div>
                <div className="text-xs text-slate-400 mt-0.5">Converted section count</div>
              </div>
              <span className="text-xl font-bold text-blue-600">{b2bInsights?.new_schools_count ?? convertedSchools}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
              <div>
                <div className="text-slate-600">New Revenue</div>
                <div className="text-xs text-slate-400 mt-0.5">From converted schools</div>
              </div>
              <span className="text-xl font-bold text-indigo-600">₹{(b2bInsights?.new_revenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <div>
                <div className="text-slate-600">Renewal Rate</div>
                <div className="text-xs text-slate-400 mt-0.5">Renewed / (Renewal Meeting + Active)</div>
              </div>
              <span className="text-xl font-bold text-emerald-600">{renewalRatio}%</span>
            </div>
            <p className="text-xs text-slate-400 text-right">
              {renewedSchools} renewed / {(b2bInsights?.renewal_base || (activeSchools + (b2bInsights?.renewal_meeting || 0)))} total
            </p>
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
              <span className="text-slate-600">Avg. Deal Size</span>
              <span className="text-xl font-bold text-amber-600">
                ₹{Math.round(b2bInsights?.avg_deal_size || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <ConversionCard
          title="School Conversion Rate"
          icon={Building2}
          color="#9333ea"
          totalLabel="New + Meeting Done"
          totalLeads={(b2bInsights?.school_conversion_denominator || 0)}
          rates={[
            {
              label: `Converted / (New + Meeting Done)`,
              value: b2bInsights?.school_conversion_rate || 0,
              color: '#22c55e',
              countLabel: `${b2bInsights?.school_conversion_numerator || 0} / ${b2bInsights?.school_conversion_denominator || 0}`,
            },
            { label: 'Lead → Meeting',     value: schoolFunnel?.conversion_rates?.lead_to_demo || 0,       color: '#9333ea' },
            { label: 'Meeting → Convert',  value: schoolFunnel?.conversion_rates?.demo_to_conversion || 0, color: '#f97316' },
          ]}
        />
      </div>

      {/* Row 3: Source of Leads + Pipeline Stage distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-1 flex items-center gap-2">
            <Handshake className="w-5 h-5 text-blue-500" />
            Source of Leads
          </h3>
          <p className="text-xs text-slate-400 mb-4">From New Leads, Meeting Done & Converted schools</p>
          {(!b2bInsights?.lead_source_breakdown?.length) ? (
            <p className="text-sm text-slate-400 py-4 text-center">No source data available</p>
          ) : (
            <div className="space-y-2">
              {b2bInsights.lead_source_breakdown.map((src, i) => (
                <ProgressBar
                  key={i}
                  label={src.name}
                  value={src.count}
                  total={b2bInsights.lead_source_breakdown.reduce((s, x) => s + x.count, 0)}
                  color={['#3b82f6','#9333ea','#f97316','#22c55e','#06b6d4','#ec4899'][i % 6]}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Lost Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-slate-600">Lost Leads</span>
              <span className="text-xl font-bold text-red-500">{stages?.schools?.lost_leads || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg">
              <span className="text-slate-600">Lost Customers</span>
              <span className="text-xl font-bold text-red-600">{stages?.schools?.lost_customers || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-200 rounded-lg border border-red-300">
              <span className="font-medium text-red-800">Total Lost Value</span>
              <span className="text-xl font-bold text-red-800">₹{totalLostValue.toLocaleString()}</span>
            </div>

            {/* Merged Lost Reasons */}
            <div className="pt-3 border-t border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Top Lost Reasons</span>
              </div>
              {mergedLostReasons.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">No lost records</p>
              ) : (
                <div className="space-y-2">
                  {mergedLostReasons.slice(0, 6).map((r, i) => {
                    const tot = mergedLostReasons.reduce((s, x) => s + x.count, 0) || 1;
                    const pct = Math.round((r.count / tot) * 100);
                    const COLORS = ['#ef4444', '#f97316', '#eab308', '#dc2626', '#c2410c', '#a16207'];
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-slate-700 flex-1 truncate">{r.name || 'Unknown'}</span>
                        <span className="text-xs font-mono text-slate-500">{r.count}</span>
                        <span className="text-xs font-semibold text-red-600 min-w-[38px] text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: New vs Renewal Pie + City Division */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* New Schools vs Renewal Schools Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-500" />
            New Schools vs Renewals
          </h3>
          {(() => {
            const newCount = b2bInsights?.new_vs_renewal?.new || 0;
            const renewalCount = b2bInsights?.new_vs_renewal?.renewal || 0;
            const total = newCount + renewalCount;
            if (total === 0) return <p className="text-sm text-slate-400 py-4 text-center">No data available</p>;
            const pieData = [
              { name: 'New Schools', value: newCount },
              { name: 'Renewals', value: renewalCount }
            ];
            const COLORS = ['#3b82f6', '#22c55e'];
            return (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, '']} />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-600">New Schools</span>
                    <span className="ml-auto font-bold text-blue-600">{newCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-slate-600">Renewals</span>
                    <span className="ml-auto font-bold text-green-600">{renewalCount}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total</span>
                      <span className="font-bold text-[#1E3A5F]">{total}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-slate-500">Renewal Rate</span>
                      <span className="font-bold text-green-600">{total > 0 ? Math.round(renewalCount / total * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* City Division of Customers */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            City Division of Customers
          </h3>
          {(!b2bInsights?.customer_cities?.length) ? (
            <p className="text-sm text-slate-400 py-4 text-center">No city data available</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {b2bInsights.customer_cities.map((city, i) => (
                <ProgressBar
                  key={i}
                  label={city.name}
                  value={city.count}
                  total={b2bInsights.customer_cities.reduce((s, x) => s + x.count, 0)}
                  color={['#f97316','#3b82f6','#9333ea','#22c55e','#06b6d4','#ec4899','#eab308','#14b8a6','#8b5cf6','#f43f5e'][i % 10]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Complete Stage Distribution (full width) */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">Complete Stage Distribution</h3>
          <div className="space-y-3">
            {stages?.schools?.stages?.map((stage, idx) => (
              <ProgressBar
                key={idx}
                label={stage.name?.replace(/_/g, ' ')}
                value={stage.count}
                total={stages?.schools?.total || 1}
                color={['#9333ea', '#3b82f6', '#f97316', '#22c55e', '#10b981', '#06b6d4', '#ef4444', '#f43f5e', '#64748b'][idx % 9]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  };

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
          <StatCard title="Total Tickets" value={supportInsights?.total_queries || 0} icon={MessageSquare} color="blue" />
          <StatCard title="Pending" value={supportInsights?.pending || 0} icon={Clock} color="orange" />
          <StatCard title="Overdue (>48h)" value={supportInsights?.overdue || 0} icon={UserCheck} color="red" />
          <StatCard title="Resolved" value={supportInsights?.resolved || 0} icon={Target} color="green" />
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
            <ProgressBar label="Open" value={supportInsights?.status_breakdown?.find(s => s.name === 'open')?.count || 0} total={supportInsights?.total_queries || 1} color="#3b82f6" />
            <ProgressBar label="Overdue Queries (>48h)" value={supportInsights?.overdue || 0} total={supportInsights?.total_queries || 1} color="#ef4444" />
            <ProgressBar label="Resolved" value={supportInsights?.status_breakdown?.find(s => s.name === 'resolved')?.count || 0} total={supportInsights?.total_queries || 1} color="#22c55e" />
            <ProgressBar label="Closed" value={supportInsights?.status_breakdown?.find(s => s.name === 'closed')?.count || 0} total={supportInsights?.total_queries || 1} color="#64748b" />
          </div>
        </div>

        {/* Query Volume & Status Over Time */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Query Volume & Status Breakdown
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {dateFilterType === 'week' ? 'By day (last 7 days)'
              : dateFilterType === 'year' ? 'By month'
              : 'By week'}
          </p>
          {supportTimeline.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-300 text-sm">No data for selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={supportTimeline} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="open" stackId="a" fill="#3b82f6" name="Open" radius={[0, 0, 0, 0]} />
                <Bar dataKey="in_progress" stackId="a" fill="#f97316" name="In Progress" />
                <Bar dataKey="resolved" stackId="a" fill="#22c55e" name="Resolved" />
                <Bar dataKey="closed" stackId="a" fill="#94a3b8" name="Closed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Avg Resolution Time Over Time */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            Average Resolution Time
          </h3>
          <p className="text-xs text-slate-400 mb-4">Hours to resolve per {dateFilterType === 'week' ? 'day' : dateFilterType === 'year' ? 'month' : 'week'}</p>
          {supportTimeline.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-300 text-sm">No data for selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={supportTimeline} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="resTimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="h" />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v) => [`${v}h`, 'Avg Resolution Time']}
                />
                <Area
                  type="monotone"
                  dataKey="avg_resolution_hours"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#resTimeGrad)"
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name="Avg Resolution"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tickets by Sub-Category (clickable drill-down) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Tickets by Sub-Category
          </h3>
          {(!supportInsights?.subcategory_breakdown?.length) ? (
            <p className="text-sm text-slate-400">No data for the selected period</p>
          ) : (
            <div className="space-y-1">
              {supportInsights.subcategory_breakdown.map((item, i) => (
                <button
                  key={i}
                  data-testid={`subcategory-row-${item.name}`}
                  onClick={() => handleSubcategoryClick(item.name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:bg-blue-600 transition-colors" />
                    <span className="text-sm text-slate-700 capitalize group-hover:text-blue-700 font-medium">
                      {item.name.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {item.count}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sub-Category Ticket Drill-Down Panel */}
        {selectedSubcategory && (
          <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedSubcategory(null)}>
            <div className="flex-1 bg-black/40" />
            <div
              className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-lg font-bold text-[#1E3A5F] capitalize">
                    {selectedSubcategory.replace(/_/g, ' ')} Tickets
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {subcategoryLoading ? 'Loading...' : `${subcategoryTickets.length} ticket${subcategoryTickets.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <button
                  data-testid="close-subcategory-panel"
                  onClick={() => setSelectedSubcategory(null)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 p-5 space-y-3">
                {subcategoryLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : subcategoryTickets.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">No tickets found</div>
                ) : (
                  subcategoryTickets.map((ticket) => {
                    const name = ticket.contact_name || ticket.name || 'Unknown';
                    const details = ticket.details || ticket.message || ticket.query_details || '';
                    const replies = ticket.replies || [];
                    const isExpanded = expandedReplies[ticket.id];
                    const statusColors = {
                      resolved: 'bg-green-100 text-green-700',
                      closed: 'bg-slate-100 text-slate-600',
                      open: 'bg-blue-100 text-blue-700',
                      new: 'bg-blue-100 text-blue-700',
                      in_progress: 'bg-orange-100 text-orange-700',
                    };
                    const statusColor = statusColors[ticket.status] || 'bg-slate-100 text-slate-600';
                    const priorityColors = { high: 'text-red-600', medium: 'text-orange-500', low: 'text-green-600', normal: 'text-slate-500' };
                    const priorityColor = priorityColors[ticket.priority] || 'text-slate-500';

                    return (
                      <div
                        key={ticket.id}
                        data-testid={`ticket-card-${ticket.id}`}
                        className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
                      >
                        {/* Ticket Header */}
                        <div className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-800 text-sm">{name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor}`}>
                                  {ticket.status?.replace(/_/g, ' ')}
                                </span>
                                {ticket.priority && (
                                  <span className={`text-xs font-medium capitalize ${priorityColor}`}>
                                    {ticket.priority} priority
                                  </span>
                                )}
                              </div>
                              {ticket.phone && (
                                <p className="text-xs text-slate-500 mt-0.5">{ticket.phone}</p>
                              )}
                              {ticket.email && (
                                <p className="text-xs text-slate-500">{ticket.email}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-slate-400">
                                {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                              </p>
                            </div>
                          </div>
                          {details && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                              {details}
                            </p>
                          )}
                        </div>

                        {/* View Replies Toggle */}
                        <div className="border-t border-slate-200 px-4 py-2 flex items-center justify-between bg-white">
                          <button
                            data-testid={`view-replies-${ticket.id}`}
                            onClick={() => toggleReplies(ticket.id)}
                            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {replies.length > 0
                              ? `${isExpanded ? 'Hide' : 'View'} ${replies.length} repl${replies.length !== 1 ? 'ies' : 'y'}`
                              : 'No replies yet'}
                          </button>
                          {ticket.admin_notes && (
                            <span className="text-xs text-slate-400 italic truncate max-w-[200px]">
                              Note: {ticket.admin_notes}
                            </span>
                          )}
                        </div>

                        {/* Replies Thread */}
                        {isExpanded && replies.length > 0 && (
                          <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3 space-y-2.5">
                            {replies.map((reply, ri) => {
                              const isAdmin = reply.role === 'admin' || reply.by?.toLowerCase().includes('admin');
                              return (
                                <div key={reply.id || ri} className={`flex gap-2 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isAdmin ? 'bg-[#1E3A5F]' : 'bg-slate-400'}`}>
                                    {(reply.by || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div className={`max-w-[80%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col`}>
                                    <div className={`px-3 py-2 rounded-xl text-sm ${isAdmin ? 'bg-[#1E3A5F] text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                                      {reply.text}
                                    </div>
                                    <span className="text-xs text-slate-400 mt-0.5 px-1">
                                      {reply.by} · {reply.created_at ? new Date(reply.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSocialTab = () => {
    const fmtNum = (n) => (n === null || n === undefined) ? '—' : Number(n).toLocaleString('en-IN');
    const fmtRel = (iso) => {
      if (!iso) return '';
      try {
        const t = new Date(iso).getTime();
        const secs = Math.max(1, Math.floor((Date.now() - t) / 1000));
        if (secs < 60) return `${secs}s ago`;
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
      } catch { return ''; }
    };

    return (
      <div className="space-y-6" data-testid="social-tab">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-[#1E3A5F] flex items-center gap-2">
              <Instagram className="w-5 h-5 text-pink-500" /> Instagram — @{socialData?.username || 'oll.co_'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Live stats via Apify · cached 6h · {socialData?.fetched_at && `fetched ${fmtRel(socialData.fetched_at)}`}
            </p>
          </div>
          <div className="flex gap-2">
            <a href={socialData?.profile_url || 'https://www.instagram.com/oll.co_/'} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-slate-700"
              data-testid="social-open-profile">
              <ExternalLink className="w-3.5 h-3.5" /> Open profile
            </a>
            <Button onClick={() => loadSocial(true)} disabled={socialLoading}
              className="bg-[#D63031] hover:bg-[#b52828] text-white h-9"
              data-testid="social-refresh">
              {socialLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Refreshing…</> : <><RefreshCw className="w-4 h-4 mr-2" /> Refresh</>}
            </Button>
          </div>
        </div>

        {socialError && (
          <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-100 text-sm text-rose-800" data-testid="social-error">
            {socialError}
          </div>
        )}

        {socialLoading && !socialData ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
            <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Scraping latest stats — may take up to a minute…
          </div>
        ) : socialData ? (
          <>
            {/* Profile summary card */}
            <div className="bg-gradient-to-br from-pink-50 via-white to-purple-50 border border-pink-100 rounded-2xl p-5 flex items-center gap-4" data-testid="social-profile-card">
              {socialData.profile_pic && (
                <img src={socialData.profile_pic} alt={socialData.username} className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="font-black text-lg text-[#0F1E33]">{socialData.full_name || `@${socialData.username}`}</div>
                  {socialData.verified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="text-xs text-slate-500">@{socialData.username}</div>
                {socialData.biography && <div className="text-xs text-slate-600 mt-1 line-clamp-2 max-w-2xl">{socialData.biography}</div>}
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="social-kpis">
              {[
                { label: 'Followers',   value: socialData.followers,  accent: 'text-pink-600',   testid: 'social-kpi-followers' },
                { label: 'Following',   value: socialData.following,  accent: 'text-purple-600', testid: 'social-kpi-following' },
                { label: 'Posts',       value: socialData.post_count, accent: 'text-[#1E3A5F]',  testid: 'social-kpi-posts' },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5" data-testid={k.testid}>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{k.label}</div>
                  <div className={`text-3xl font-black mt-1 ${k.accent}`}>{fmtNum(k.value)}</div>
                </div>
              ))}
            </div>

            {/* Trend charts */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="social-trend">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-black text-[#0F1E33]">Growth &amp; engagement over time</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Grouped by <b>{socialGranularity === 'month' ? 'month' : 'day'}</b> — driven by the {dateFilterType} filter above. Snapshot cron runs every 24h.
                  </p>
                </div>
                <button onClick={captureSocialSnapshot}
                  className="text-[11px] px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  title="Capture a snapshot now (bypasses the 24h scheduler)"
                  data-testid="social-snapshot-now">
                  Snapshot now
                </button>
              </div>

              {socialTrendLoading ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading trend…
                </div>
              ) : socialTrend.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-center text-slate-400 text-sm p-6">
                  <div>
                    <div>No snapshots yet — data collects daily.</div>
                    <div className="text-[11px] mt-1">Hit &ldquo;Snapshot now&rdquo; to capture today&apos;s baseline.</div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6">
                  {/* Follower count */}
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Follower count</div>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={socialTrend} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="socialFollowersFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#EC4899" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#EC4899" stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} width={50} />
                        <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                        <Area type="monotone" dataKey="followers" stroke="#EC4899" strokeWidth={2} fill="url(#socialFollowersFill)" name="Followers" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Engagement */}
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 flex items-center gap-2">
                      Engagement (new per {socialGranularity})
                      <span className="text-[9px] font-semibold text-slate-400 normal-case tracking-normal">day-over-day delta on latest posts</span>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart
                        data={socialTrend.map((row, idx, arr) => {
                          const prev = idx > 0 ? arr[idx - 1] : null;
                          const delta = (curr, key) => prev ? Math.max(0, (curr[key] || 0) - (prev[key] || 0)) : 0;
                          return {
                            ...row,
                            likes_new:    delta(row, 'likes'),
                            comments_new: delta(row, 'comments'),
                            views_new:    delta(row, 'views'),
                          };
                        })}
                        margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} width={50} />
                        <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="likes_new"    stroke="#D63031" strokeWidth={2} dot={false} name="Likes" />
                        <Line type="monotone" dataKey="comments_new" stroke="#1E3A5F" strokeWidth={2} dot={false} name="Comments" />
                        <Line type="monotone" dataKey="views_new"    stroke="#8B5CF6" strokeWidth={2} dot={false} name="Views" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Latest posts */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="social-latest-posts">
              <h3 className="text-sm font-black text-[#0F1E33] mb-3">Latest posts</h3>
              {(socialData.latest_posts?.length || 0) === 0 ? (
                <div className="text-sm text-slate-400 py-6 text-center">No recent posts available.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {socialData.latest_posts.map((p) => (
                    <a key={p.id || p.shortcode || p.url} href={p.url || '#'} target="_blank" rel="noopener noreferrer"
                      className="group block rounded-xl overflow-hidden border border-slate-100 hover:shadow-md transition-shadow"
                      data-testid={`social-post-${p.id || p.shortcode}`}>
                      <div className="aspect-square bg-slate-100 relative overflow-hidden">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Instagram className="w-8 h-8" />
                          </div>
                        )}
                        {(p.type === 'video' || p.type === 'Video' || p.video_view_count) && (
                          <div className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1">
                            <Play className="w-3 h-3 text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-[11px] text-slate-600 flex items-center gap-3">
                        <span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" /> {fmtNum(p.like_count)}</span>
                        <span className="inline-flex items-center gap-0.5"><CommentIcon className="w-3 h-3" /> {fmtNum(p.comment_count)}</span>
                        {p.video_view_count ? <span className="inline-flex items-center gap-0.5"><Play className="w-3 h-3" /> {fmtNum(p.video_view_count)}</span> : null}
                      </div>
                      {p.caption && (
                        <div className="px-2 pb-2 text-[11px] text-slate-500 line-clamp-2" title={p.caption}>{p.caption}</div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">No data yet — hit refresh.</div>
        )}

        {/* ────────────── YOUTUBE ────────────── */}
        <div className="pt-4 border-t border-slate-100 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <h2 className="text-lg font-semibold text-[#1E3A5F] flex items-center gap-2">
                <Play className="w-5 h-5 text-red-600 fill-red-600" /> YouTube — {ytData?.channel_title || 'OLL Channel'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Live stats via YouTube Data API v3 · cached 6h {ytData?.fetched_at && `· fetched ${fmtRel(ytData.fetched_at)}`}
              </p>
            </div>
            <div className="flex gap-2">
              {ytData?.channel_url && (
                <a href={ytData.channel_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-slate-700"
                  data-testid="yt-open-channel">
                  <ExternalLink className="w-3.5 h-3.5" /> Open channel
                </a>
              )}
              <Button onClick={() => loadYouTube(true)} disabled={ytLoading}
                className="bg-red-600 hover:bg-red-700 text-white h-9" data-testid="yt-refresh">
                {ytLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Refreshing…</> : <><RefreshCw className="w-4 h-4 mr-2" /> Refresh</>}
              </Button>
            </div>
          </div>

          {ytError && (
            <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-100 text-sm text-rose-800 mb-3" data-testid="yt-error">
              {ytError}
              {ytError.includes('403') || ytError.toLowerCase().includes('permission') ? (
                <div className="mt-1 text-[11px] text-rose-700">
                  Grant <code>oll-admin-reports@optical-hexagon-381014.iam.gserviceaccount.com</code> access via YouTube Studio → Settings → Permissions.
                </div>
              ) : null}
            </div>
          )}

          {ytLoading && !ytData ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
              <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Fetching YouTube stats…
            </div>
          ) : ytData ? (
            <div className="space-y-6">
              {/* Channel card */}
              <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4" data-testid="yt-channel-card">
                {ytData.thumbnail && <img src={ytData.thumbnail} alt={ytData.channel_title} className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow" />}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-lg text-[#0F1E33] truncate">{ytData.channel_title}</div>
                  {ytData.description && <div className="text-xs text-slate-600 mt-0.5 line-clamp-2 max-w-2xl">{ytData.description}</div>}
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="yt-kpis">
                {[
                  { label: 'Subscribers',  value: ytData.hidden_subs ? 'Hidden' : ytData.subscribers, accent: 'text-red-600',   testid: 'yt-kpi-subs' },
                  { label: 'Total views',  value: ytData.views_total, accent: 'text-[#1E3A5F]',                                testid: 'yt-kpi-views' },
                  { label: 'Videos',       value: ytData.video_count, accent: 'text-orange-600',                               testid: 'yt-kpi-videos' },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5" data-testid={k.testid}>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{k.label}</div>
                    <div className={`text-3xl font-black mt-1 ${k.accent}`}>{typeof k.value === 'number' ? fmtNum(k.value) : (k.value || '—')}</div>
                  </div>
                ))}
              </div>

              {/* Trend */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="yt-trend">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black text-[#0F1E33]">Growth &amp; engagement over time</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Grouped by <b>{socialGranularity === 'month' ? 'month' : 'day'}</b> — driven by the {dateFilterType} filter above. Snapshot cron runs every 24h.
                    </p>
                  </div>
                  <button onClick={captureYtSnapshot}
                    className="text-[11px] px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    data-testid="yt-snapshot-now">
                    Snapshot now
                  </button>
                </div>

                {ytTrendLoading ? (
                  <div className="h-56 flex items-center justify-center text-slate-400 text-sm"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading trend…</div>
                ) : ytTrend.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-center text-slate-400 text-sm p-6">
                    <div>
                      <div>No snapshots yet — data collects daily.</div>
                      <div className="text-[11px] mt-1">Hit &ldquo;Snapshot now&rdquo; to capture today&apos;s baseline.</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Subscribers</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={ytTrend} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="ytSubsFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#DC2626" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                          <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} width={50} />
                          <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                          <Area type="monotone" dataKey="followers" stroke="#DC2626" strokeWidth={2} fill="url(#ytSubsFill)" name="Subscribers" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 flex items-center gap-2">
                        Engagement (new per {socialGranularity})
                        <span className="text-[9px] font-semibold text-slate-400 normal-case tracking-normal">day-over-day delta on latest videos</span>
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart
                          data={ytTrend.map((row, idx, arr) => {
                            const prev = idx > 0 ? arr[idx - 1] : null;
                            const delta = (curr, key) => prev ? Math.max(0, (curr[key] || 0) - (prev[key] || 0)) : 0;
                            return { ...row,
                              likes_new:    delta(row, 'likes'),
                              comments_new: delta(row, 'comments'),
                              views_new:    delta(row, 'views'),
                            };
                          })}
                          margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                          <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} width={50} />
                          <Tooltip formatter={(v) => Number(v).toLocaleString('en-IN')} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Line type="monotone" dataKey="views_new"    stroke="#8B5CF6" strokeWidth={2} dot={false} name="Views" />
                          <Line type="monotone" dataKey="likes_new"    stroke="#DC2626" strokeWidth={2} dot={false} name="Likes" />
                          <Line type="monotone" dataKey="comments_new" stroke="#1E3A5F" strokeWidth={2} dot={false} name="Comments" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Latest videos */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="yt-latest-videos">
                <h3 className="text-sm font-black text-[#0F1E33] mb-3">Latest videos</h3>
                {(ytData.latest_videos?.length || 0) === 0 ? (
                  <div className="text-sm text-slate-400 py-6 text-center">No videos found on this channel.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ytData.latest_videos.map((v) => (
                      <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                        className="group block rounded-xl overflow-hidden border border-slate-100 hover:shadow-md transition-shadow"
                        data-testid={`yt-video-${v.id}`}>
                        <div className="aspect-video bg-slate-100 relative overflow-hidden">
                          {v.thumbnail ? (
                            <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                          ) : (<div className="w-full h-full flex items-center justify-center text-slate-300"><Play className="w-8 h-8" /></div>)}
                        </div>
                        <div className="p-2">
                          <div className="text-[11px] font-semibold text-[#0F1E33] line-clamp-2" title={v.title}>{v.title}</div>
                          <div className="mt-1 text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-0.5"><Play className="w-3 h-3" /> {fmtNum(v.view_count)}</span>
                            <span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" /> {fmtNum(v.like_count)}</span>
                            <span className="inline-flex items-center gap-0.5"><CommentIcon className="w-3 h-3" /> {fmtNum(v.comment_count)}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
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
      
      {/* Summary Cards — expenses come from the dedicated /expenses-summary endpoint
           so they respect the date filter and include both the main ledger + FS centre economics. */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={TrendingUp} color="green" />
        <StatCard
          title="Total Expenses"
          value={`₹${(reportData.expensesSummary?.total ?? totalExpenses).toLocaleString()}`}
          icon={TrendingDown}
          color="red"
          data-testid="pnl-total-expenses"
        />
        <StatCard
          title="Net Profit"
          value={`₹${(totalRevenue - (reportData.expensesSummary?.total ?? totalExpenses)).toLocaleString()}`}
          icon={Wallet}
          color={(totalRevenue - (reportData.expensesSummary?.total ?? totalExpenses)) >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Profit Margin"
          value={`${totalRevenue > 0 ? Math.round(((totalRevenue - (reportData.expensesSummary?.total ?? totalExpenses)) / totalRevenue) * 100) : 0}%`}
          icon={Target}
          color={(totalRevenue - (reportData.expensesSummary?.total ?? totalExpenses)) >= 0 ? 'green' : 'red'}
        />
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
        
        <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="expense-breakdown-card">
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" /> Expense Breakdown
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(reportData.expensesSummary?.by_category || []).map((c) => (
              <div key={c.name} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-600 capitalize">{c.name}</span>
                <span className="font-medium text-slate-800">₹{Number(c.amount || 0).toLocaleString()} <span className="text-[10px] text-slate-400 ml-1">{c.percent}%</span></span>
              </div>
            ))}
            {(!reportData.expensesSummary?.by_category?.length) && (
              <p className="text-slate-500 text-center py-4">No expenses recorded for this period</p>
            )}
            <div className="flex justify-between items-center p-4 bg-red-100 rounded-lg border border-red-200 mt-2">
              <span className="font-medium text-red-800">Total Expenses</span>
              <span className="text-xl font-bold text-red-700">₹{Number(reportData.expensesSummary?.total || totalExpenses).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly trend of expenses */}
      {(reportData.expensesSummary?.trend?.length || 0) > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" data-testid="expense-trend-card">
          <h3 className="font-semibold text-[#1E3A5F] mb-4">Month-over-Month Expenses</h3>
          <div className="flex items-end gap-2 h-40">
            {reportData.expensesSummary.trend.map((t) => {
              const max = Math.max(...reportData.expensesSummary.trend.map(x => x.amount || 0));
              const h = max > 0 ? Math.round(((t.amount || 0) / max) * 100) : 0;
              return (
                <div key={t.month} className="flex-1 flex flex-col items-center justify-end" title={`${t.month}: ₹${Number(t.amount||0).toLocaleString()}`}>
                  <div className="w-full bg-[#D63031] rounded-t-md" style={{ height: `${h}%` }} />
                  <div className="text-[10px] text-slate-500 mt-1">{t.month}</div>
                  <div className="text-[10px] font-semibold text-slate-700">₹{Number(t.amount||0).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
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
                        {String(expense.category || '').replace(/_/g, ' ')}
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

      {/* Cashflow Section */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-500" />
          Cashflow
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">Receivables</p>
            <p className="text-2xl font-bold text-emerald-700">₹{(cashflow?.receivables?.total || 0).toLocaleString()}</p>
            <p className="text-xs text-emerald-500 mt-1">{cashflow?.receivables?.count || 0} pending school payments</p>
          </div>
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-center">
            <p className="text-xs text-rose-600 font-medium uppercase tracking-wide mb-1">Payables</p>
            <p className="text-2xl font-bold text-rose-700">₹{(cashflow?.payables?.total || 0).toLocaleString()}</p>
            <p className="text-xs text-rose-500 mt-1">{cashflow?.payables?.count || 0} pending expense payments</p>
          </div>
          <div className={`p-4 rounded-xl border text-center ${(cashflow?.net_cashflow || 0) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${(cashflow?.net_cashflow || 0) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Net Cashflow</p>
            <p className={`text-2xl font-bold ${(cashflow?.net_cashflow || 0) >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
              {(cashflow?.net_cashflow || 0) >= 0 ? '+' : ''}₹{Math.abs(cashflow?.net_cashflow || 0).toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${(cashflow?.net_cashflow || 0) >= 0 ? 'text-blue-500' : 'text-amber-500'}`}>receivables − payables</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Receivables by School</h4>
            {(!cashflow?.receivables?.items?.length) ? (
              <p className="text-sm text-slate-400 py-3 text-center">No receivables recorded</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {cashflow.receivables.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                    <span className="text-slate-600 truncate max-w-[60%]">{item.name}</span>
                    <span className="font-semibold text-emerald-600">₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Payables by Category</h4>
            {(!cashflow?.payables?.breakdown?.length) ? (
              <p className="text-sm text-slate-400 py-3 text-center">No outstanding payables</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {cashflow.payables.breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                    <span className="text-slate-600">{item.category}</span>
                    <span className="font-semibold text-rose-600">₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
      
      {/* Date Filter - hide for B2B (has its own year filter) */}
      {activeTab !== 'b2b' && renderDateFilter()}

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
            {activeTab === 'social' && renderSocialTab()}
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

      {/* Public Report Link Modal */}
      <Dialog open={showPublicLinkModal} onOpenChange={setShowPublicLinkModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-blue-600" />
              Share Reports Externally
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Create a password-protected public link to share reports with external stakeholders. 
              They can view all tabs and filters with real-time data. Contact details and names are hidden for privacy.
            </p>

            {publicLinkInfo?.exists ? (
              <>
                {/* Existing Link Info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800">Public Link Active</p>
                      <p className="text-xs text-green-600">Anyone with the link and password can view</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Input
                      value={`${window.location.origin}/reports/${publicLinkInfo.token}`}
                      readOnly
                      className="text-sm bg-white"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyPublicLink}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Change Password */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Change Password
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={publicLinkPassword}
                        onChange={(e) => setPublicLinkPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button 
                      onClick={handleUpdatePassword}
                      disabled={publicLinkLoading || !publicLinkPassword}
                      className="shrink-0 bg-blue-600 hover:bg-blue-700"
                    >
                      {publicLinkLoading ? 'Updating...' : 'Update'}
                    </Button>
                  </div>
                </div>

                {/* Delete Link */}
                <div className="border-t pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDeletePublicLink}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Public Link
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Create New Link */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Set Password for Public Access *
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={publicLinkPassword}
                      onChange={(e) => setPublicLinkPassword(e.target.value)}
                      placeholder="Enter password (min 4 characters)"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    This password will be required to view the reports
                  </p>
                </div>

                <Button 
                  onClick={handleCreateOrUpdatePublicLink}
                  disabled={publicLinkLoading || publicLinkPassword.length < 4}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {publicLinkLoading ? 'Creating...' : 'Create Public Link'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReports;
