import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, User, Mail, Key, Shield, CheckCircle, XCircle, Edit, Trash2, Copy, ExternalLink } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PERMISSIONS = [
  { value: 'students', label: 'Student CRM' },
  { value: 'schools', label: 'School CRM' },
  { value: 'educators', label: 'Educators' },
  { value: 'growth_partners', label: 'Growth Partners' },
];

const AdminUsers = () => {
  const { getAuthHeaders } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    permissions: [],
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/team-users`, {
        headers: getAuthHeaders()
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !formData.username || !formData.password) {
      toast.error('Please fill all required fields');
      return;
    }
    
    // Validate username format
    if (!/^[a-z0-9_-]+$/.test(formData.username)) {
      toast.error('Username can only contain lowercase letters, numbers, hyphens and underscores');
      return;
    }
    
    try {
      await axios.post(`${API}/team-users`, formData, {
        headers: getAuthHeaders()
      });
      toast.success('User created successfully');
      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    try {
      await axios.patch(`${API}/team-users/${editUser.id}`, {
        name: formData.name,
        email: formData.email,
        permissions: formData.permissions,
      }, {
        headers: getAuthHeaders()
      });
      toast.success('User updated successfully');
      setEditUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await axios.patch(`${API}/team-users/${user.id}`, {
        is_active: !user.is_active,
      }, {
        headers: getAuthHeaders()
      });
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await axios.delete(`${API}/team-users/${showDeleteConfirm.id}`, {
        headers: getAuthHeaders()
      });
      toast.success('User deleted');
      setShowDeleteConfirm(null);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      permissions: [],
    });
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      password: '',
      permissions: user.permissions || [],
    });
  };

  const copyAddLink = (username) => {
    const link = `${window.location.origin}/add/${username}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query)
    );
  });

  return (
    <AdminLayout title="Team Users">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by name, email, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-users"
          />
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center gap-2"
          data-testid="add-user-btn"
        >
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No team users found</p>
          <p className="text-sm text-slate-400 mt-1">Create a user to give them access to add leads</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-600">User</th>
                  <th className="text-left p-4 font-medium text-slate-600">Username</th>
                  <th className="text-left p-4 font-medium text-slate-600">Permissions</th>
                  <th className="text-left p-4 font-medium text-slate-600">Status</th>
                  <th className="text-left p-4 font-medium text-slate-600">Add Link</th>
                  <th className="text-left p-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50" data-testid={`user-row-${user.id}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-[#1E3A5F]" />
                        </div>
                        <div>
                          <div className="font-medium text-[#1E3A5F]">{user.name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm">{user.username}</code>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {user.permissions?.length > 0 ? (
                          user.permissions.map(p => (
                            <span key={p} className="badge-status bg-blue-100 text-blue-700 text-xs">
                              {PERMISSIONS.find(perm => perm.value === p)?.label || p}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-sm">No permissions</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`badge-status flex items-center gap-1 ${
                          user.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}
                        data-testid={`toggle-${user.id}`}
                      >
                        {user.is_active ? (
                          <><CheckCircle className="w-3 h-3" /> Active</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyAddLink(user.username)}
                          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                          title="Copy add form link"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                        <a
                          href={`/add/${user.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                          title="Open add form"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(user)}
                          data-testid={`edit-${user.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setShowDeleteConfirm(user)}
                          data-testid={`delete-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                data-testid="add-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                data-testid="add-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username * <span className="text-slate-400 font-normal">(for /add/username)</span>
              </label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                placeholder="e.g., john-doe"
                data-testid="add-username"
              />
              {formData.username && (
                <p className="text-xs text-slate-500 mt-1">
                  Add form URL: /add/{formData.username}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Set a password"
                data-testid="add-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CRM Permissions</label>
              <div className="space-y-2">
                {PERMISSIONS.map((perm) => (
                  <label key={perm.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.permissions.includes(perm.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, permissions: [...formData.permissions, perm.value] });
                        } else {
                          setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== perm.value) });
                        }
                      }}
                    />
                    <span className="text-sm">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddUser} className="flex-1 bg-[#D63031] hover:bg-[#b52828]" data-testid="submit-add">
                Create User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <Input
                value={formData.username}
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CRM Permissions</label>
              <div className="space-y-2">
                {PERMISSIONS.map((perm) => (
                  <label key={perm.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.permissions.includes(perm.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, permissions: [...formData.permissions, perm.value] });
                        } else {
                          setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== perm.value) });
                        }
                      }}
                    />
                    <span className="text-sm">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditUser(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} className="flex-1 bg-[#D63031] hover:bg-[#b52828]">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to delete <strong>{showDeleteConfirm?.name}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleDeleteUser} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
