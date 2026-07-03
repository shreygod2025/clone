import { useState, useEffect, useCallback } from 'react';
import TaskCreateModal from '../../components/tasks/TaskCreateModal';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Building2, GraduationCap, FileText, 
  Briefcase, MessageSquare, LogOut, Menu, X, ChevronRight,
  MapPin, Building, Calendar, Clock, Phone, User, Settings, Shield, BarChart3, Database, PenSquare,
  Receipt, UserPlus, Upload, Cloud, Wallet, Download, Sparkles, Bot, Link2, Send, ShoppingBag,
  CheckSquare, FolderKanban, Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminLayout = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, getAuthHeaders } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAIChat = location.pathname === '/admin/ai-chat';

  // All navigation items with permission keys
  const allNavItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', permission: null },
    { path: '/admin/tasks', icon: CheckSquare, label: 'Tasks', permission: null },
    { path: '/admin/projects', icon: FolderKanban, label: 'Projects', permission: null },
    { path: '/admin/me/performance', icon: BarChart3, label: 'My Performance', permission: null },
    { path: '/admin/ai-chat', icon: MessageSquare, label: 'AI Chat', permission: null },
    { path: '/admin/students', icon: GraduationCap, label: 'Student CRM', permission: 'students' },
    { path: '/admin/schools', icon: Building2, label: 'School CRM', permission: 'schools' },
    { path: '/admin/orders', icon: Receipt, label: 'Orders', permission: 'orders' },
    { path: '/admin/expenses', icon: Wallet, label: 'Expenses', permission: 'orders' },
    { path: '/admin/educators', icon: Users, label: 'Educators', permission: 'educators' },
    { path: '/admin/growth-partners', icon: Briefcase, label: 'Growth Partners', permission: 'growth_partners' },
    { path: '/admin/team-applications', icon: FileText, label: 'Team Applications', permission: 'team_applications' },
    { path: '/admin/support', icon: MessageSquare, label: 'Support Center', permission: 'support' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reports', permission: 'reports' },
    { path: '/admin/users', icon: Users, label: 'Users & Roles', permission: 'users' },
    { path: '/admin/settings', icon: Settings, label: 'Settings', permission: 'settings' },
    // ── Moved into Settings tabs (not shown in sidebar):
    //   Future Skills      → lives under Student CRM
    //   Blogs              → Settings → Blogs tab
    //   Bulk Email         → Settings → Bulk Email tab
    //   Data Center        → Settings → Data Center tab
    //   Data Export        → Settings → Data Export tab
    //   Link Preview Tester→ Settings → Link Preview tab
    // Routes themselves remain registered in App.js so deep links still work.
  ];

  // Filter nav items based on user role and permissions
  const navItems = allNavItems.filter(item => {
    // Admin sees everything
    if (user?.role === 'admin') return true;
    
    // Dashboard is always visible
    if (item.permission === null) return true;
    
    // Check if team member has permission
    const userPermissions = user?.permissions || [];
    return userPermissions.includes(item.permission);
  });

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header — hidden on AI Chat (full-screen mode) */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1E3A5F] text-white px-4 py-3 flex items-center justify-between ${isAIChat ? 'hidden' : ''}`}>
        <button onClick={() => setSidebarOpen(true)} data-testid="mobile-menu-toggle">
          <Menu className="w-6 h-6" />
        </button>
        <img 
          src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/rugags0w_OLL-horizontal-logo-white.png" 
          alt="OLL" 
          className="h-8"
        />
        <div className="w-6" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-[#1E3A5F] text-white transform transition-transform duration-300 flex flex-col
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 flex items-center justify-between shrink-0">
          <img 
            src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/rugags0w_OLL-horizontal-logo-white.png" 
            alt="OLL" 
            className="h-8"
          />
          <button 
            className="lg:hidden text-white/70 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-2 mb-4 shrink-0">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white font-medium truncate">{user?.name || 'Admin'}</p>
            <p className="text-white/60 text-sm truncate">{user?.email}</p>
          </div>
        </div>

        <nav className="px-2 space-y-1 flex-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {location.pathname === item.path && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            className="admin-nav-item w-full text-red-300 hover:bg-red-500/20"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`lg:ml-64 ${isAIChat ? 'pt-0' : 'pt-14'} lg:pt-0 min-h-screen`}>
        <div className={isAIChat ? '' : 'p-4 lg:p-8'}>
          {!isAIChat && (
            <div className="flex items-center justify-between mb-6">
              {title ? (
                <h1 className="text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {title}
                </h1>
              ) : <div />}
              <NotificationBell />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
};

// ── Notification bell ────────────────────────────────────────────────────────
const NotificationBell = () => {
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const [l, c] = await Promise.all([
        axios.get(`${API}/notifications?limit=20`, { headers: getAuthHeaders() }),
        axios.get(`${API}/notifications/unread-count`, { headers: getAuthHeaders() }),
      ]);
      setItems(l.data || []);
      setUnread(c.data?.count || 0);
    } catch { /* noop */ }
  }, [getAuthHeaders]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (id) => {
    try {
      await axios.patch(`${API}/notifications/${id}/read`, {}, { headers: getAuthHeaders() });
      load();
    } catch { /* noop */ }
  };

  const markAll = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`, {}, { headers: getAuthHeaders() });
      load();
    } catch { /* noop */ }
  };

  const openItem = async (n) => {
    if (!n.is_read) await markRead(n.id);
    setOpen(false);
    if (n.cta_path) navigate(n.cta_path);
  };

  return (
    <div className="relative" data-testid="notification-bell-container">
      <button onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-slate-100"
        data-testid="notification-bell">
        <Bell className="w-5 h-5 text-slate-700" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center font-bold"
            data-testid="notification-unread-count">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 max-h-[70vh] overflow-hidden flex flex-col"
          data-testid="notification-dropdown">
          <div className="flex items-center justify-between p-3 border-b">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll}
                className="text-xs text-blue-600 hover:underline"
                data-testid="notification-mark-all">
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-xs text-slate-400 text-center">No notifications yet.</p>
            ) : items.map(n => (
              <button key={n.id}
                onClick={() => openItem(n)}
                className={`w-full text-left px-3 py-2.5 border-b hover:bg-slate-50 ${n.is_read ? 'bg-white' : 'bg-blue-50/60'}`}
                data-testid={`notification-item-${n.id}`}>
                <p className="text-sm font-medium text-slate-900">{n.title}</p>
                {n.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Role-driven KPI strip with time filter (Today / Week / Month / Year) ────
const SCOPE_LABELS = { today: 'Today', week: 'This Week', month: 'This Month', year: 'This Year' };
const KPI_UNIT_FMT = (val, unit) => {
  if (val === null || val === undefined) return '—';
  if (unit === '₹') return `₹${Number(val).toLocaleString('en-IN')}`;
  if (unit === '%') return `${val}%`;
  if (unit === 'hours') return `${val} hrs`;
  return Number(val).toLocaleString('en-IN');
};

const MyKpisWidget = () => {
  const { getAuthHeaders } = useAuth();
  const [scope, setScope] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/me/performance?scope=${scope}`, { headers: getAuthHeaders() })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [scope, getAuthHeaders]);

  const kpis = data?.kpis || [];

  return (
    <div className="mb-6" data-testid="my-kpis-widget">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 text-lg">My KPIs</h3>
          <p className="text-xs text-slate-500">Live snapshot of the metrics defined on your role.</p>
        </div>
        <div className="inline-flex bg-white border rounded-lg p-0.5 text-xs" data-testid="my-kpis-scope">
          {Object.entries(SCOPE_LABELS).map(([v, l]) => (
            <button key={v}
              onClick={() => setScope(v)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${scope === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              data-testid={`my-kpis-scope-${v}`}
            >{l}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-sm">Loading KPIs…</div>
      ) : kpis.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-slate-700">
          No KPIs configured for your role yet. An admin can assign KPIs under <Link to="/admin/users" className="underline text-blue-600">Users &amp; Roles</Link>.
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1 scrollbar-thin scrollbar-thumb-slate-200"
          data-testid="my-kpis-grid"
          style={{ scrollbarWidth: 'thin' }}
        >
          {kpis.map(k => (
            <div key={k.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow snap-start shrink-0 w-[210px]"
              data-testid={`my-kpi-${k.id}`}
            >
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1 truncate">{k.category}</p>
              <p className="text-xs text-slate-600 mb-1.5 truncate" title={k.label}>{k.label}</p>
              <p className="text-2xl font-bold text-slate-900" data-testid={`my-kpi-value-${k.id}`}>
                {KPI_UNIT_FMT(k.value, k.unit)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Today's Tasks widget (shown on Admin Dashboard) ──────────────────────────
const TodaysTasksWidget = () => {
  const { user, getAuthHeaders } = useAuth();
  const [today, setToday] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const reload = () => {
    axios.get(`${API}/tasks/today`, { headers: getAuthHeaders() })
      .then(r => {
        setToday(r.data?.today || []);
        setOverdue(r.data?.overdue || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = async (t) => {
    const next = t.status === 'pending' ? 'in_progress' : 'completed';
    try {
      await axios.patch(`${API}/tasks/${t.id}`, { status: next }, { headers: getAuthHeaders() });
      // Refresh
      const r = await axios.get(`${API}/tasks/today`, { headers: getAuthHeaders() });
      setToday(r.data?.today || []);
      setOverdue(r.data?.overdue || []);
    } catch { /* noop */ }
  };

  if (loading) return null;

  return (
    <div className="mb-8" data-testid="todays-tasks-widget">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-600" />
          Today&apos;s Tasks
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{today.length}</span>
          {overdue.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{overdue.length} overdue</span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
            data-testid="dashboard-add-task-btn"
          >
            + Add Task
          </button>
          <Link to="/admin/tasks" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>
      </div>

      {today.length === 0 && overdue.length === 0 ? (
        <div className="bg-white rounded-xl border p-6 text-center text-slate-500 text-sm">
          No tasks due today. Nice work.
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {[...overdue, ...today].map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-slate-50" data-testid={`dashboard-task-${t.id}`}>
              <div className={`w-2 h-2 rounded-full ${
                t.priority === 'urgent' ? 'bg-red-500' :
                t.priority === 'high' ? 'bg-amber-500' :
                t.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-300'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                <p className="text-xs text-slate-500">
                  {t.code}{t.due_date ? ` · Due ${new Date(t.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                  {overdue.some(o => o.id === t.id) && <span className="text-red-600 font-medium"> · Overdue</span>}
                </p>
              </div>
              {t.status !== 'completed' && (
                <button
                  onClick={() => advance(t)}
                  className="text-xs font-medium text-blue-600 hover:underline shrink-0"
                  data-testid={`dashboard-task-advance-${t.id}`}
                >
                  {t.status === 'pending' ? 'Start' : 'Complete'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <TaskCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={reload}
        currentUser={user}
      />
    </div>
  );
};

const AdminDashboard = () => {
  const { user, getAuthHeaders } = useAuth();
  const [stats, setStats] = useState({
    total_students: 0,
    total_schools: 0,
    total_educators: 0,
    open_tickets: 0,
    new_student_leads: 0,
    converted_students: 0,
    new_school_leads: 0,
    new_educator_applications: 0,
    followups_due: 0,
    leads_added_by_me: 0,
    todays_student_demos: [],
    todays_school_meetings: [],
    todays_educator_demos: [],
    is_team_member: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: getAuthHeaders()
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  // Different stat cards for team members vs admin
  const adminStatCards = [
    { label: 'Total Students', value: stats.total_students, color: 'from-blue-500 to-blue-600', icon: GraduationCap, link: '/admin/students' },
    { label: 'New Leads', value: stats.new_student_leads, color: 'from-green-500 to-emerald-600', icon: Users, link: '/admin/students' },
    { label: 'Converted', value: stats.converted_students, color: 'from-emerald-500 to-green-600', icon: Users, link: '/admin/students' },
    { label: 'Schools', value: stats.total_schools, color: 'from-purple-500 to-indigo-600', icon: Building2, link: '/admin/schools' },
    { label: 'Educators', value: stats.total_educators, color: 'from-orange-500 to-red-500', icon: Users, link: '/admin/educators' },
    { label: 'Support', value: stats.open_tickets, color: 'from-red-500 to-pink-500', icon: MessageSquare, link: '/admin/support' },
  ];

  const teamStatCards = [
    { label: 'My Leads', value: stats.total_students, color: 'from-blue-500 to-blue-600', icon: GraduationCap },
    { label: 'New', value: stats.new_student_leads, color: 'from-green-500 to-emerald-600', icon: Users },
    { label: 'Converted', value: stats.converted_students, color: 'from-emerald-500 to-green-600', icon: Users },
    { label: 'Schools', value: stats.total_schools, color: 'from-purple-500 to-indigo-600', icon: Building2 },
    { label: 'Followups', value: stats.followups_due || 0, color: 'from-cyan-500 to-blue-500', icon: Calendar },
    { label: 'Support', value: stats.open_tickets, color: 'from-red-500 to-pink-500', icon: MessageSquare },
  ];

  const statCards = stats.is_team_member ? teamStatCards : adminStatCards;

  // Get user permissions for quick actions
  const userPermissions = user?.permissions || [];
  const isAdmin = user?.role === 'admin';

  return (
    <AdminLayout title={stats.is_team_member ? `Welcome, ${user?.name || 'Team Member'}` : 'Dashboard'}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
        </div>
      ) : (
        <>
          {/* Welcome Banner */}
          <div className="mb-6 bg-gradient-to-r from-[#1E3A5F] to-[#3A7BD5] rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {stats.is_team_member ? `Hey ${user?.name?.split(' ')[0] || 'there'}!` : 'Admin Dashboard'}
                </h2>
                <p className="text-white/80 text-sm">
                  {stats.is_team_member 
                    ? 'Here\'s your performance overview for today'
                    : `Managing ${stats.total_students + stats.total_schools} total leads`
                  }
                </p>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-white/60 text-xs">Today&apos;s Date</p>
                  <p className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Role-driven KPI strip (with time filter) */}
          <MyKpisWidget />

          {/* Today's Tasks */}
          <TodaysTasksWidget />

          {/* Overdue Section - Show first as it's urgent */}
          {stats.total_overdue > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Overdue ({stats.total_overdue})
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">Requires Attention</span>
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {/* Overdue Student Demos */}
                {stats.overdue_students?.length > 0 && (
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-5 border border-red-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-red-800">Student Demos</h4>
                        <p className="text-xs text-red-500">{stats.overdue_students?.length || 0} overdue</p>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {stats.overdue_students.map((demo, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-red-100 hover:border-red-300 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-slate-800">{demo.name}</span>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              {demo.demo_date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            {demo.phone}
                            {demo.skill && <span className="ml-2 text-red-600">• {demo.skill}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overdue School Meetings */}
                {stats.overdue_schools?.length > 0 && (
                  <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-red-800">School Meetings</h4>
                        <p className="text-xs text-red-500">{stats.overdue_schools?.length || 0} overdue</p>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {stats.overdue_schools.map((meeting, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-red-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-slate-800">{meeting.school_name}</span>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              {meeting.meeting_date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <User className="w-3 h-3" />
                            {meeting.contact_name}
                            <Phone className="w-3 h-3 ml-2" />
                            {meeting.phone}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overdue Educator Demos */}
                {stats.overdue_educators?.length > 0 && (
                  <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-red-800">Educator Demos</h4>
                        <p className="text-xs text-red-500">{stats.overdue_educators?.length || 0} overdue</p>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {stats.overdue_educators.map((demo, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-red-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-slate-800">{demo.name}</span>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              {demo.demo_date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            {demo.phone}
                            {demo.skills?.length > 0 && <span className="ml-2 text-red-600">• {demo.skills.slice(0, 2).join(', ')}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Today's Schedule Section */}
          {(stats.todays_student_demos?.length > 0 || stats.todays_school_meetings?.length > 0 || stats.todays_educator_demos?.length > 0) && (
            <div className="mb-8">
              <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Today&apos;s Schedule
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {/* Student Demos */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">Student Demos</h4>
                      <p className="text-xs text-slate-500">{stats.todays_student_demos?.length || 0} scheduled</p>
                    </div>
                  </div>
                  {stats.todays_student_demos?.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {stats.todays_student_demos.map((demo, idx) => (
                        <div key={idx} className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-slate-800">{demo.name}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {demo.demo_time || 'TBD'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            {demo.phone}
                            {demo.skill && <span className="ml-2 text-blue-600">• {demo.skill}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No demos today</p>
                  )}
                </div>

                {/* School Meetings */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">School Meetings</h4>
                      <p className="text-xs text-slate-500">{stats.todays_school_meetings?.length || 0} scheduled</p>
                    </div>
                  </div>
                  {stats.todays_school_meetings?.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {stats.todays_school_meetings.map((meeting, idx) => (
                        <div key={idx} className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-slate-800">{meeting.school_name}</span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {meeting.meeting_time || 'TBD'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <User className="w-3 h-3" />
                            {meeting.contact_name}
                            <Phone className="w-3 h-3 ml-2" />
                            {meeting.phone}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No meetings today</p>
                  )}
                </div>

                {/* Educator Demos */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Users className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">Educator Demos</h4>
                      <p className="text-xs text-slate-500">{stats.todays_educator_demos?.length || 0} scheduled</p>
                    </div>
                  </div>
                  {stats.todays_educator_demos?.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {stats.todays_educator_demos.map((demo, idx) => (
                        <div key={idx} className="bg-orange-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-slate-800">{demo.name}</span>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {demo.demo_time || 'TBD'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            {demo.phone}
                            {demo.skills?.length > 0 && <span className="ml-2 text-orange-600">• {demo.skills.slice(0, 2).join(', ')}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No demos today</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="font-semibold text-[#1E3A5F] mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {(isAdmin || userPermissions.includes('students')) && (
                  <Link to="/admin/students" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="text-slate-600">{stats.is_team_member ? 'View My Student Leads' : 'View Student Leads'}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </Link>
                )}
                {(isAdmin || userPermissions.includes('schools')) && (
                  <Link to="/admin/schools" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="text-slate-600">{stats.is_team_member ? 'View My School Leads' : 'View School Leads'}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </Link>
                )}
                {(isAdmin || userPermissions.includes('educators')) && (
                  <Link to="/admin/educators" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="text-slate-600">Review Educator Applications</span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </Link>
                )}
                {(isAdmin || userPermissions.includes('support')) && (
                  <Link to="/admin/support" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="text-slate-600">{stats.is_team_member ? 'My Support Tickets' : 'Handle Support Tickets'}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </Link>
                )}
              </div>
            </div>

            {isAdmin ? (
              <>
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">Content Management</h3>
                <div className="space-y-3">
                  <Link to="/admin/blogs" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="text-slate-600">Manage Blogs</span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </Link>
                  <Link to="/admin/faqs" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="text-slate-600">Manage FAQs</span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </Link>
                </div>
              </div>
              
              {/* System Tools - Admin Only */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  System Tools
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('oll_token');
                        const res = await fetch(API + '/admin/migrate-files', {
                          method: 'POST',
                          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert('Migration Complete!\n\nMigrated: ' + data.migrated + ' files\nSkipped: ' + data.skipped + ' files\nErrors: ' + (data.errors?.length || 0));
                        } else {
                          alert('Migration failed: ' + JSON.stringify(data));
                        }
                      } catch (err) {
                        alert('Error: ' + err.message);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left"
                  >
                    <div>
                      <span className="text-blue-700 font-medium">Migrate Files to Cloud</span>
                      <p className="text-xs text-blue-500">Upload local files to Cloudinary</p>
                    </div>
                    <Upload className="w-5 h-5 text-blue-500" />
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('oll_token');
                        const res = await fetch(API + '/admin/migrate-files-to-cloudinary', {
                          method: 'POST',
                          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert('Cloud Migration Complete!\n\nMigrated: ' + data.migrated + ' files\nSkipped: ' + data.skipped + ' files\nErrors: ' + (data.errors?.length || 0));
                        } else {
                          alert('Migration failed: ' + JSON.stringify(data));
                        }
                      } catch (err) {
                        alert('Error: ' + err.message);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-left"
                  >
                    <div>
                      <span className="text-green-700 font-medium">Sync Database Files to Cloud</span>
                      <p className="text-xs text-green-500">Move MongoDB files to Cloudinary</p>
                    </div>
                    <Cloud className="w-5 h-5 text-green-500" />
                  </button>
                </div>
              </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">Add New Lead</h3>
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 mb-4">Use your personalized link to add leads that auto-assign to you:</p>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm font-mono text-slate-600 break-all">
                      {window.location.origin}/add/{user?.username || user?.id}
                    </p>
                  </div>
                  <Link 
                    to={`/add/${user?.username || user?.id}`} 
                    className="flex items-center justify-center gap-2 p-3 bg-[#D63031] text-white rounded-xl hover:bg-[#b52828] transition-colors font-medium"
                  >
                    Add New Lead
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
export { AdminLayout };
