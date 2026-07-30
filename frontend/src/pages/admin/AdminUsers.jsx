import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Plus, User, Mail, Key, Shield, CheckCircle, XCircle, 
  Edit, Trash2, Copy, Users, Settings, Eye, EyeOff, Save, X, Phone, BarChart3, FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';
import CitySearch from '../../components/CitySearch';
import BulkEmailModal from '../../components/BulkEmailModal';
import ImportSalariesModal from '../../components/ImportSalariesModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// All available admin sections/permissions
const ALL_SECTIONS = [
  { value: 'dashboard', label: 'Dashboard', description: 'View admin dashboard and analytics' },
  { value: 'students', label: 'Student CRM', description: 'Manage student inquiries and demos' },
  { value: 'schools', label: 'School CRM', description: 'Manage school partnerships' },
  { value: 'future_skills', label: 'Future Skills CRM', description: 'Manage Future Skills leads, trials, customers and centres' },
  { value: 'future_skills.economics',        label: '↳ Centre Economics',       description: 'Add & view centre P&L (Rent, Teacher, Capex, Marketing)', parent: 'future_skills' },
  { value: 'future_skills.kpi.leads',        label: '↳ KPI · Leads generated',  description: 'See total leads generated in Reports', parent: 'future_skills' },
  { value: 'future_skills.kpi.lead_to_trial',label: '↳ KPI · Lead → Trial %',   description: 'See lead-to-trial conversion rate', parent: 'future_skills' },
  { value: 'future_skills.kpi.trial_to_paid',label: '↳ KPI · Trial → Paid %',   description: 'See trial-to-customer conversion rate', parent: 'future_skills' },
  { value: 'future_skills.kpi.revenue',      label: '↳ KPI · Revenue',          description: 'See total revenue in Reports', parent: 'future_skills' },
  { value: 'future_skills.kpi.aov',          label: '↳ KPI · Avg Order Value',  description: 'See average order value in Reports', parent: 'future_skills' },
  { value: 'future_skills.kpi.profit_margin',label: '↳ KPI · Profit Margin',    description: 'See profit margin in Reports', parent: 'future_skills' },
  { value: 'orders', label: 'Orders', description: 'Manage school and student payments' },
  { value: 'orders.school',          label: '↳ School Payments',                description: 'Only school payments tab', parent: 'orders' },
  { value: 'orders.student',         label: '↳ Student Payments',               description: 'Only student payments tab', parent: 'orders' },
  { value: 'orders.school_students', label: '↳ School Student Payments (Online)', description: 'Only school-student online payments tab', parent: 'orders' },
  { value: 'orders.robotics_shop',   label: '↳ Robotics Shop Orders',           description: 'Only robotics shop orders tab', parent: 'orders' },
  { value: 'expenses', label: 'Expenses', description: 'Manage school expenses and cost tracking' },
  { value: 'expenses.list', label: '↳ Expenses list only', description: 'Manage expense entries — hides P&L', parent: 'expenses' },
  { value: 'expenses.pnl',  label: '↳ P&L only',          description: 'View Profit & Loss only', parent: 'expenses' },
  { value: 'educators', label: 'Educators', description: 'Manage educator applications and assignments' },
  { value: 'growth_partners', label: 'Growth Partners', description: 'Manage growth partner applications' },
  { value: 'team_applications', label: 'Team Applications', description: 'View and manage team applications' },
  { value: 'support', label: 'Support Center', description: 'Handle support queries' },
  { value: 'blogs', label: 'Blogs', description: 'Create and manage blog posts' },
  { value: 'reports', label: 'Reports', description: 'View analytics and reports' },
  { value: 'data_center', label: 'Data Center', description: 'Manage platform data and exports' },
  { value: 'settings', label: 'Settings', description: 'Manage cities, centers, blogs, team openings' },
  { value: 'requirements', label: 'Requirements', description: 'Manage educator requirements' },
  { value: 'users', label: 'Users & Roles', description: 'Manage users and role permissions' },
];

// Default roles to create
const DEFAULT_ROLES = [
  {
    name: 'Center Partner',
    description: 'Center partners can manage their center operations',
    permissions: ['dashboard', 'students', 'educators', 'support'],
    is_system: true
  },
  {
    name: 'Growth Partner',
    description: 'Growth partners can view their referrals and leads',
    permissions: ['dashboard', 'students', 'growth_partners'],
    is_system: true
  },
  {
    name: 'Sales Team',
    description: 'Sales team members can manage student and school CRM',
    permissions: ['dashboard', 'students', 'schools', 'orders', 'support'],
    is_system: false
  },
  {
    name: 'Content Manager',
    description: 'Content managers can manage blogs and settings',
    permissions: ['dashboard', 'blogs', 'settings'],
    is_system: false
  },
  {
    name: 'Accounts Team',
    description: 'Accounts team can manage orders and payments',
    permissions: ['dashboard', 'orders', 'reports'],
    is_system: false
  }
];

const AdminUsers = () => {
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters for users
  const [cityFilter, setCityFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Bulk email modal
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());

  // Salary import modal
  const [showSalaryImportModal, setShowSalaryImportModal] = useState(false);
  
  // User modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // Role modals
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [showDeleteRoleConfirm, setShowDeleteRoleConfirm] = useState(null);
  
  // User form
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    role_id: '',
    city: '',
    reports_to: '',
    permissions: [],
    is_active: true
  });
  
  // Role form
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [],
    kpis: [],
    is_active: true,
    grants_full_access: false,
  });

  // KPI catalog (grouped by category) for role builder
  const [kpiCatalog, setKpiCatalog] = useState({ grouped: {}, catalog: [] });

  useEffect(() => {
    fetchData();
    // Fetch KPI catalog for role builder
    axios.get(`${API}/kpis/catalog`, { headers: getAuthHeaders() })
      .then(res => setKpiCatalog(res.data || { grouped: {}, catalog: [] }))
      .catch(() => setKpiCatalog({ grouped: {}, catalog: [] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get(`${API}/team-users`, { headers: getAuthHeaders() }),
        axios.get(`${API}/roles`, { headers: getAuthHeaders() }).catch(() => ({ data: [] }))
      ]);
      setUsers(usersRes.data || []);
      
      // If no roles exist, create default roles
      let fetchedRoles = rolesRes.data || [];
      if (fetchedRoles.length === 0) {
        await createDefaultRoles();
        const newRolesRes = await axios.get(`${API}/roles`, { headers: getAuthHeaders() });
        fetchedRoles = newRolesRes.data || [];
      }
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultRoles = async () => {
    for (const role of DEFAULT_ROLES) {
      try {
        await axios.post(`${API}/roles`, role, { headers: getAuthHeaders() });
      } catch (error) {
        console.error('Failed to create default role:', error);
      }
    }
  };

  // User handlers
  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.username) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (!editUser && !userForm.password) {
      toast.error('Password is required for new users');
      return;
    }
    
    if (!/^[a-z0-9_-]+$/.test(userForm.username)) {
      toast.error('Username can only contain lowercase letters, numbers, hyphens and underscores');
      return;
    }
    
    try {
      // Get permissions from role if selected
      let permissions = userForm.permissions;
      if (userForm.role_id) {
        const selectedRole = roles.find(r => r.id === userForm.role_id);
        if (selectedRole) {
          permissions = selectedRole.permissions;
        }
      }
      
      const userData = {
        ...userForm,
        permissions
      };
      
      if (editUser) {
        // Don't send password if empty (not changing)
        if (!userData.password) delete userData.password;
        await axios.patch(`${API}/team-users/${editUser.id}`, userData, { headers: getAuthHeaders() });
        toast.success('User updated successfully');
      } else {
        await axios.post(`${API}/team-users`, userData, { headers: getAuthHeaders() });
        toast.success('User created successfully');
      }
      
      setShowAddUserModal(false);
      setEditUser(null);
      resetUserForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await axios.delete(`${API}/team-users/${id}`, { headers: getAuthHeaders() });
      toast.success('User deleted');
      setShowDeleteConfirm(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      await axios.patch(`${API}/team-users/${user.id}`, {
        is_active: !user.is_active
      }, { headers: getAuthHeaders() });
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const resetUserForm = () => {
    setUserForm({
      name: '',
      email: '',
      phone: '',
      username: '',
      password: '',
      role_id: '',
      city: '',
      reports_to: '',
      permissions: [],
      is_active: true
    });
  };

  // Role handlers
  const handleSaveRole = async () => {
    if (!roleForm.name) {
      toast.error('Please enter a role name');
      return;
    }
    
    if (roleForm.permissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }
    
    try {
      if (editRole) {
        await axios.patch(`${API}/roles/${editRole.id}`, roleForm, { headers: getAuthHeaders() });
        toast.success('Role updated successfully');
      } else {
        await axios.post(`${API}/roles`, roleForm, { headers: getAuthHeaders() });
        toast.success('Role created successfully');
      }
      
      setShowAddRoleModal(false);
      setEditRole(null);
      resetRoleForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (id) => {
    try {
      await axios.delete(`${API}/roles/${id}`, { headers: getAuthHeaders() });
      toast.success('Role deleted');
      setShowDeleteRoleConfirm(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete role');
    }
  };

  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      description: '',
      permissions: [],
      kpis: [],
      is_active: true,
      grants_full_access: false,
    });
  };

  const toggleRoleKpi = (kpiId) => {
    const current = roleForm.kpis || [];
    if (current.includes(kpiId)) {
      setRoleForm({ ...roleForm, kpis: current.filter(k => k !== kpiId) });
    } else {
      setRoleForm({ ...roleForm, kpis: [...current, kpiId] });
    }
  };

  const toggleRolePermission = (permission) => {
    const current = roleForm.permissions;
    if (current.includes(permission)) {
      setRoleForm({ ...roleForm, permissions: current.filter(p => p !== permission) });
    } else {
      setRoleForm({ ...roleForm, permissions: [...current, permission] });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCity = !cityFilter || u.city?.toLowerCase() === cityFilter.toLowerCase();
    const matchesRole = !roleFilter || u.role_id === roleFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active);
    
    return matchesSearch && matchesCity && matchesRole && matchesStatus;
  });

  // Get unique cities from users
  const uniqueCities = [...new Set(users.map(u => u.city).filter(Boolean))];

  const filteredRoles = roles.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'Custom';
  };

  return (
    <AdminLayout title="Users & Roles">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'users' 
                ? 'bg-[#1E3A5F] text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Users
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'users' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {users.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'roles' 
                ? 'bg-[#1E3A5F] text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Roles
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'roles' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {roles.length}
            </span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="pl-10"
            />
          </div>
          
          {/* Filters for Users tab */}
          {activeTab === 'users' && (
            <>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-10 px-4 border border-slate-200 rounded-lg bg-white text-sm"
              >
                <option value="">All Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 px-4 border border-slate-200 rounded-lg bg-white text-sm"
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-4 border border-slate-200 rounded-lg bg-white text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </>
          )}
          
          <Button
            onClick={() => {
              if (activeTab === 'users') {
                setEditUser(null);
                resetUserForm();
                setShowAddUserModal(true);
              } else {
                setEditRole(null);
                resetRoleForm();
                setShowAddRoleModal(true);
              }
            }}
            className="bg-[#D63031] hover:bg-[#c0392b]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'users' ? 'User' : 'Role'}
          </Button>
          {activeTab === 'users' && (
            <>
              <Button
                onClick={() => setShowSalaryImportModal(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                data-testid="import-salaries-btn"
                title="Import team salary Excel/CSV"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Import Salaries
              </Button>
              <Button
                onClick={() => {
                const recipients = filteredUsers
                  .filter(u => selectedUserIds.has(u.id) && u.email)
                  .map(u => ({ email: u.email, name: u.name || '' }));
                if (recipients.length === 0) {
                  // If nothing selected, offer to email ALL filtered active users
                  const allRecipients = filteredUsers
                    .filter(u => u.email && u.is_active !== false)
                    .map(u => ({ email: u.email, name: u.name || '' }));
                  if (allRecipients.length === 0) {
                    toast.error('No users with email in the current view');
                    return;
                  }
                  if (!window.confirm(`No users selected. Send to all ${allRecipients.length} active user(s) in the current view?`)) return;
                  setSelectedUserIds(new Set(filteredUsers.filter(u => u.email && u.is_active !== false).map(u => u.id)));
                }
                setShowBulkEmailModal(true);
              }}
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
              data-testid="bulk-email-team-btn"
            >
              <Mail className="w-4 h-4 mr-2" />
              Bulk Email {selectedUserIds.size > 0 && `(${selectedUserIds.size})`}
            </Button>
            </>
          )}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left w-8">
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds(new Set([...selectedUserIds, ...filteredUsers.filter(u => u.email).map(u => u.id)]));
                        } else {
                          const next = new Set(selectedUserIds);
                          filteredUsers.forEach(u => next.delete(u.id));
                          setSelectedUserIds(next);
                        }
                      }}
                      className="w-4 h-4 accent-[#1E3A5F] cursor-pointer"
                      data-testid="select-all-users-checkbox"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">City</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        disabled={!user.email}
                        onChange={(e) => {
                          const next = new Set(selectedUserIds);
                          if (e.target.checked) next.add(user.id); else next.delete(user.id);
                          setSelectedUserIds(next);
                        }}
                        className="w-4 h-4 accent-[#1E3A5F] cursor-pointer disabled:opacity-40"
                        data-testid={`select-user-${user.id}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white font-medium">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{user.name}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                          {user.phone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded">{user.username}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {getRoleName(user.role_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{user.city || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`p-1.5 rounded-lg mr-1 ${
                          user.is_active !== false ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                        }`}
                        title={user.is_active !== false ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => navigate(`/admin/users/${user.id}/performance`)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                        title="View performance"
                        data-testid={`user-performance-btn-${user.id}`}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditUser(user);
                          setUserForm({
                            name: user.name,
                            email: user.email,
                            phone: user.phone || '',
                            username: user.username,
                            password: '',
                            role_id: user.role_id || '',
                            city: user.city || '',
                            reports_to: user.reports_to || '',
                            permissions: user.permissions || [],
                            is_active: user.is_active !== false
                          });
                          setShowAddUserModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(user)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No users found. Click &quot;Add User&quot; to create a new team member.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="grid gap-4">
            {filteredRoles.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-slate-500">
                <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No roles found. Click &quot;Add Role&quot; to create your first role.</p>
              </div>
            ) : (
              filteredRoles.map(role => (
                <div key={role.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  role.is_system ? 'border-blue-500' : 'border-green-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#1E3A5F] text-lg">{role.name}</h3>
                        {role.is_system && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            System
                          </span>
                        )}
                        {role.grants_full_access && (
                          <span
                            className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium inline-flex items-center gap-1"
                            title="Users with this role get full admin access across every CRM, task, and performance dashboard."
                            data-testid={`role-full-access-badge-${role.id}`}
                          >
                            <Shield className="w-3 h-3" />
                            Full Access
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm mt-1">{role.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {role.permissions?.map((perm, i) => {
                          const section = ALL_SECTIONS.find(s => s.value === perm);
                          return (
                            <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              {section?.label || perm}
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {users.filter(u => u.role_id === role.id).length} users assigned
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditRole(role);
                          setRoleForm({
                            name: role.name,
                            description: role.description || '',
                            permissions: role.permissions || [],
                            kpis: role.kpis || [],
                            is_active: role.is_active !== false,
                            grants_full_access: !!role.grants_full_access,
                          });
                          setShowAddRoleModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => setShowDeleteRoleConfirm(role)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Add Team User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            
            {/* Phone Number - Required for WhatsApp notifications */}
            <div>
              <label className="block text-sm font-medium mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number (for WhatsApp notifications)
              </label>
              <Input
                type="tel"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value.replace(/\D/g, '') })}
                placeholder="10-digit mobile number (e.g., 9876543210)"
                maxLength={10}
              />
              <p className="text-xs text-slate-500 mt-1">Required for receiving WhatsApp notifications (tickets, meeting reminders, etc.)</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <Input
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase() })}
                  placeholder="username"
                />
                <p className="text-xs text-slate-500 mt-1">Lowercase letters, numbers, hyphens only</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Password {editUser ? '(leave blank to keep)' : '*'}
                </label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editUser ? '••••••••' : 'Password'}
                />
              </div>
            </div>
            
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  value={userForm.role_id}
                  onChange={(e) => {
                    const roleId = e.target.value;
                    const selectedRole = roles.find(r => r.id === roleId);
                    setUserForm({ 
                      ...userForm, 
                      role_id: roleId,
                      permissions: selectedRole?.permissions || []
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select a role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} {role.is_system ? '(System)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <CitySearch
                  value={userForm.city}
                  onChange={(city) => setUserForm({ ...userForm, city })}
                  placeholder="Search city..."
                />
                <p className="text-xs text-slate-500 mt-1">Used for location-based assignment</p>
              </div>
            </div>

            {/* Reports To (Manager) */}
            <div>
              <label className="block text-sm font-medium mb-1">Reports To (Manager)</label>
              <select
                value={userForm.reports_to}
                onChange={(e) => setUserForm({ ...userForm, reports_to: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                data-testid="reports-to-select"
              >
                <option value="">— None —</option>
                {users
                  .filter(u => !editUser || u.id !== editUser.id)
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Select the team member this user reports to</p>
            </div>

            {/* Show permissions for selected role */}
            {userForm.role_id && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Permissions for this role:</p>
                <div className="flex flex-wrap gap-2">
                  {roles.find(r => r.id === userForm.role_id)?.permissions?.map((perm, i) => {
                    const section = ALL_SECTIONS.find(s => s.value === perm);
                    return (
                      <span key={i} className="text-xs bg-white border px-2 py-1 rounded-full">
                        {section?.label || perm}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="user-active"
                checked={userForm.is_active}
                onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="user-active" className="text-sm">Active user</label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddUserModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveUser} className="flex-1 bg-[#1E3A5F]">
                <Save className="w-4 h-4 mr-2" />
                {editUser ? 'Update' : 'Create'} User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Role Modal */}
      <Dialog open={showAddRoleModal} onOpenChange={setShowAddRoleModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRole ? 'Edit Role' : 'Add Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Role Name *</label>
              <Input
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="e.g., Sales Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Brief description of this role"
              />
            </div>
            
            {/* Permissions Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Sections & Permissions *</label>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                {ALL_SECTIONS.map(section => {
                  const isChecked = roleForm.permissions.includes(section.value);
                  const parentChecked = section.parent && roleForm.permissions.includes(section.parent);
                  const dimmed = parentChecked && !isChecked;
                  return (
                    <div
                      key={section.value}
                      onClick={() => { if (!parentChecked || isChecked) toggleRolePermission(section.value); }}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        section.parent ? 'ml-6' : ''
                      } ${dimmed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
                        isChecked
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-white border border-slate-200 hover:border-slate-300'
                      }`}
                      title={parentChecked && !isChecked ? `Already granted via "${section.parent}" (full access)` : ''}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        isChecked ? 'bg-green-500 text-white' : 'bg-slate-200'
                      }`}>
                        {isChecked && <CheckCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${section.parent ? 'text-slate-700' : ''}`}>{section.label}</p>
                        <p className="text-xs text-slate-500">{section.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Selected: {roleForm.permissions.length} / {ALL_SECTIONS.length}
              </p>
            </div>

            {/* KPI Selection (for performance tracking) */}
            <div>
              <label className="block text-sm font-medium mb-2">Performance KPIs</label>
              <p className="text-xs text-slate-500 mb-2">Select the KPIs to track for users under this role. Visible on each user&apos;s Performance page.</p>
              <div className="space-y-3 max-h-72 overflow-y-auto border rounded-lg p-3" data-testid="role-kpi-selector">
                {Object.keys(kpiCatalog.grouped || {}).length === 0 && (
                  <p className="text-xs text-slate-500 italic">Loading KPI catalog…</p>
                )}
                {Object.entries(kpiCatalog.grouped || {}).map(([category, kpis]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">{category}</p>
                    <div className="space-y-1.5">
                      {kpis.map(kpi => (
                        <label
                          key={kpi.id}
                          className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer text-sm transition-all ${
                            (roleForm.kpis || []).includes(kpi.id)
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-white border border-slate-200 hover:border-slate-300'
                          }`}
                          data-testid={`role-kpi-option-${kpi.id}`}
                        >
                          <input
                            type="checkbox"
                            checked={(roleForm.kpis || []).includes(kpi.id)}
                            onChange={() => toggleRoleKpi(kpi.id)}
                            className="w-4 h-4"
                          />
                          <span className="flex-1">{kpi.label}</span>
                          <span className="text-xs text-slate-400">{kpi.unit}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Selected: {(roleForm.kpis || []).length}</p>
            </div>

            {/* Full admin access toggle */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                roleForm.grants_full_access
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
              data-testid="role-grants-full-access-toggle"
            >
              <input
                type="checkbox"
                checked={!!roleForm.grants_full_access}
                onChange={(e) => setRoleForm({ ...roleForm, grants_full_access: e.target.checked })}
                className="mt-0.5 accent-amber-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-slate-800">Grants full admin access</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Anyone assigned this role can see every CRM (students, schools, educators, growth partners), every support query, every team member&apos;s tasks &amp; performance, and every finance/compensation record — same as the platform owner. Use sparingly.
                </p>
              </div>
            </label>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddRoleModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveRole} className="flex-1 bg-[#1E3A5F]">
                <Save className="w-4 h-4 mr-2" />
                {editRole ? 'Update' : 'Create'} Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            Are you sure you want to delete <strong>{showDeleteConfirm?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => handleDeleteUser(showDeleteConfirm?.id)} 
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <Dialog open={!!showDeleteRoleConfirm} onOpenChange={() => setShowDeleteRoleConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            Are you sure you want to delete the role <strong>{showDeleteRoleConfirm?.name}</strong>? 
            Users with this role will need to be reassigned.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteRoleConfirm(null)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => handleDeleteRole(showDeleteRoleConfirm?.id)} 
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Modal */}
      <BulkEmailModal
        open={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
        recipients={users.filter(u => selectedUserIds.has(u.id) && u.email).map(u => ({ email: u.email, name: u.name || '' }))}
        mode="bulk"
        onSent={() => {
          toast.success('Bulk email sent to team members');
          setSelectedUserIds(new Set());
        }}
      />

      {/* Salary Import Modal */}
      <ImportSalariesModal
        open={showSalaryImportModal}
        onClose={() => setShowSalaryImportModal(false)}
        onImported={() => { /* stay open so admin can see the summary */ }}
      />
    </AdminLayout>
  );
};

export default AdminUsers;
