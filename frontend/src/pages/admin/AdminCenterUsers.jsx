import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Building2, Plus, Trash2, User, Mail, MapPin, Eye, EyeOff } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminCenterUsers = () => {
  const { getAuthHeaders } = useAuth();
  const [centerUsers, setCenterUsers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({
    center_id: '',
    center_name: '',
    email: '',
    password: '',
    name: ''
  });

  useEffect(() => {
    fetchCenterUsers();
    fetchCenters();
  }, []);

  const fetchCenterUsers = async () => {
    try {
      const response = await axios.get(`${API}/center-users`, {
        headers: getAuthHeaders()
      });
      setCenterUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch center users');
    } finally {
      setLoading(false);
    }
  };

  const fetchCenters = async () => {
    try {
      const response = await axios.get(`${API}/centers`);
      setCenters(response.data);
    } catch (error) {
      console.error('Failed to fetch centers');
    }
  };

  const handleSelectCenter = (centerId) => {
    const center = centers.find(c => c.id === centerId);
    if (center) {
      setNewUser({
        ...newUser,
        center_id: center.id,
        center_name: `${center.name} - ${center.area || center.city}`
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.center_id || !newUser.email || !newUser.password || !newUser.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/center-users`, newUser, {
        headers: getAuthHeaders()
      });
      toast.success('Center user created successfully');
      setShowAddModal(false);
      setNewUser({ center_id: '', center_name: '', email: '', password: '', name: '' });
      fetchCenterUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this center user?')) return;
    
    try {
      await axios.delete(`${API}/center-users/${userId}`, {
        headers: getAuthHeaders()
      });
      toast.success('User deleted');
      fetchCenterUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <AdminLayout title="Center Users">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-500">Manage login credentials for center staff</p>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#1E3A5F] hover:bg-[#152c4a] gap-2"
          data-testid="add-center-user-btn"
        >
          <Plus className="w-4 h-4" />
          Add Center User
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
        </div>
      ) : centerUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 mb-2">No Center Users Yet</h3>
          <p className="text-slate-500 text-sm mb-4">Create login credentials for your center staff</p>
          <Button onClick={() => setShowAddModal(true)} className="bg-[#1E3A5F] hover:bg-[#152c4a]">
            <Plus className="w-4 h-4 mr-2" />
            Add First Center User
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Center</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Name</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Email</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {centerUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-[#1E3A5F]" />
                      </div>
                      <span className="font-medium text-[#1E3A5F]">{user.center_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      {user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      data-testid={`delete-${user.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Center User Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1E3A5F]" />
              Add Center User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Center *</label>
              <Select value={newUser.center_id} onValueChange={handleSelectCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a center" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map(center => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name} - {center.area || center.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User Name *</label>
              <Input
                placeholder="Staff member name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                data-testid="center-user-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <Input
                type="email"
                placeholder="Login email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                data-testid="center-user-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Login password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  data-testid="center-user-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser}
                disabled={submitting}
                className="flex-1 bg-[#1E3A5F] hover:bg-[#152c4a]"
                data-testid="submit-center-user"
              >
                {submitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCenterUsers;
