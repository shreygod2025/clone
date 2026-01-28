import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Building2, GraduationCap, FileText, 
  Briefcase, MessageSquare, LogOut, Menu, X, ChevronRight,
  MapPin, Building, Calendar, Clock, Phone, User, Settings, Shield, BarChart3, Database, PenSquare,
  Receipt
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminLayout = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, getAuthHeaders } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // All navigation items with permission keys
  const allNavItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', permission: null }, // Always visible
    { path: '/admin/students', icon: GraduationCap, label: 'Student CRM', permission: 'students' },
    { path: '/admin/schools', icon: Building2, label: 'School CRM', permission: 'schools' },
    { path: '/admin/orders', icon: Receipt, label: 'Orders', permission: 'orders' },
    { path: '/admin/educators', icon: Users, label: 'Educators', permission: 'educators' },
    { path: '/admin/growth-partners', icon: Briefcase, label: 'Growth Partners', permission: 'growth_partners' },
    { path: '/admin/team-applications', icon: FileText, label: 'Team Applications', permission: 'team_applications' },
    { path: '/admin/support', icon: MessageSquare, label: 'Support Center', permission: 'support' },
    { path: '/admin/blogs', icon: PenSquare, label: 'Blogs', permission: 'blogs' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reports', permission: 'reports' },
    { path: '/admin/data-center', icon: Database, label: 'Data Center', permission: 'data_center' },
    { path: '/admin/users', icon: Users, label: 'Users & Roles', permission: 'users' },
    { path: '/admin/settings', icon: Settings, label: 'Settings', permission: 'settings' },
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
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1E3A5F] text-white px-4 py-3 flex items-center justify-between">
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
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {title && (
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {title}
            </h1>
          )}
          {children}
        </div>
      </main>
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

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {statCards.map((stat, index) => (
              <Link 
                key={index} 
                to={stat.link || '#'}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all group cursor-pointer"
                data-testid={`stat-${index}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-[#1E3A5F]">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </Link>
            ))}
          </div>

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
