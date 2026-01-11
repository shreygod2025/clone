import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Building2, GraduationCap, FileText, 
  HelpCircle, Briefcase, MessageSquare, LogOut, Menu, X, ChevronRight,
  MapPin, Building
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminLayout = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, getAuthHeaders } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/students', icon: GraduationCap, label: 'Student CRM' },
    { path: '/admin/schools', icon: Building2, label: 'School CRM' },
    { path: '/admin/educators', icon: Users, label: 'Educators' },
    { path: '/admin/inquiry-leads', icon: Briefcase, label: 'Inquiry Leads' },
    { path: '/admin/inquiry-queries', icon: MessageSquare, label: 'Support Queries' },
    { path: '/admin/requirements', icon: Briefcase, label: 'Requirements' },
    { path: '/admin/cities', icon: MapPin, label: 'Cities' },
    { path: '/admin/centers', icon: Building, label: 'Centers' },
    { path: '/admin/blogs', icon: FileText, label: 'Blogs' },
    { path: '/admin/faqs', icon: HelpCircle, label: 'FAQs' },
    { path: '/admin/support', icon: MessageSquare, label: 'Legacy Support' },
  ];

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
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState({
    total_students: 0,
    total_schools: 0,
    total_educators: 0,
    open_tickets: 0,
    new_student_leads: 0,
    converted_students: 0,
    new_school_leads: 0,
    new_educator_applications: 0
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

  const statCards = [
    { label: 'Total Student Leads', value: stats.total_students, color: 'bg-blue-500', icon: GraduationCap },
    { label: 'New Student Leads', value: stats.new_student_leads, color: 'bg-green-500', icon: Users },
    { label: 'Converted Students', value: stats.converted_students, color: 'bg-emerald-500', icon: Users },
    { label: 'School Leads', value: stats.total_schools, color: 'bg-purple-500', icon: Building2 },
    { label: 'New School Leads', value: stats.new_school_leads, color: 'bg-indigo-500', icon: Building2 },
    { label: 'Educator Applications', value: stats.total_educators, color: 'bg-orange-500', icon: Users },
    { label: 'New Educators', value: stats.new_educator_applications, color: 'bg-yellow-500', icon: Users },
    { label: 'Open Support Tickets', value: stats.open_tickets, color: 'bg-red-500', icon: MessageSquare },
  ];

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, index) => (
              <div key={index} className="stat-card" data-testid={`stat-${index}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-[#1E3A5F]">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="font-semibold text-[#1E3A5F] mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/admin/students" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <span className="text-slate-600">View Student Leads</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
                <Link to="/admin/schools" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <span className="text-slate-600">View School Leads</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
                <Link to="/admin/educators" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <span className="text-slate-600">Review Educator Applications</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
                <Link to="/admin/support" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <span className="text-slate-600">Handle Support Tickets</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
              </div>
            </div>

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
                <Link to="/admin/requirements" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <span className="text-slate-600">Manage Open Requirements</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
export { AdminLayout };
